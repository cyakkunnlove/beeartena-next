import Redis from 'ioredis'
import { compress, decompress } from 'lz-string'

// Check if Redis should be disabled (for testing/CI environments)
const isRedisDisabled = process.env.DISABLE_REDIS === 'true' || process.env.NODE_ENV === 'test'

// Redis client for caching
let redis: Redis | null = null

if (!isRedisDisabled) {
  try {
    // Support both REDIS_URL and individual connection params
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true, // Don't connect immediately
      })
    } else {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_CACHE_DB || '1'), // Different DB for cache
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true, // Don't connect immediately
      })
    }

    // Attempt to connect
    redis.connect().catch((err) => {
      console.warn('Redis connection failed, falling back to memory cache:', err.message)
      redis = null
    })
  } catch (err) {
    console.warn('Redis initialization failed, falling back to memory cache:', err)
    redis = null
  }
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  compress?: boolean // Whether to compress the data
  tags?: string[] // Tags for cache invalidation
}

class Cache {
  private memoryCache = new Map<string, { data: any; expires: number }>()
  private readonly defaultTTL = 300 // 5 minutes
  private readonly maxMemoryCacheSize = 100

  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memCached = this.memoryCache.get(key)
      if (memCached && memCached.expires > Date.now()) {
        return memCached.data
      }

      // Check Redis if available
      if (!redis) return null

      const cached = await redis.get(key)
      if (!cached) return null

      // Parse the cached data
      const parsed = JSON.parse(cached)
      let data = parsed.data

      // Decompress if needed
      if (parsed.compressed) {
        data = JSON.parse(decompress(data))
      }

      // Store in memory cache for faster access
      this.setMemoryCache(key, data, parsed.ttl)

      return data
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(
    key: string,
    data: any,
    ttl: number = this.defaultTTL,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      let serializedData = JSON.stringify(data)
      let compressed = false

      // Compress if data is large or compression is requested
      if (options.compress || serializedData.length > 1024) {
        serializedData = compress(serializedData)
        compressed = true
      }

      const cacheData = {
        data: compressed ? serializedData : data,
        compressed,
        timestamp: Date.now(),
        ttl,
        tags: options.tags || [],
      }

      // Set in Redis with TTL if available
      if (redis) {
        await redis.setex(key, ttl, JSON.stringify(cacheData))
      }

      // Set in memory cache
      this.setMemoryCache(key, data, ttl)

      // Store tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.storeTags(key, options.tags, ttl)
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (redis) {
        await redis.del(key)
      }
      this.memoryCache.delete(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      if (redis) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)

          // Clear from memory cache
          for (const key of keys) {
            this.memoryCache.delete(key)
          }
        }
      } else {
        // Clear memory cache with pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key)
          }
        }
      }
    } catch (error) {
      console.error('Cache invalidate error:', error)
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      if (redis) {
        const keys = await redis.smembers(`tag:${tag}`)
        if (keys.length > 0) {
          await redis.del(...keys)

          // Clear from memory cache
          for (const key of keys) {
            this.memoryCache.delete(key)
          }

          // Remove the tag set
          await redis.del(`tag:${tag}`)
        }
      }
    } catch (error) {
      console.error('Cache invalidate by tag error:', error)
    }
  }

  async clear(): Promise<void> {
    try {
      if (redis) {
        await redis.flushdb()
      }
      this.memoryCache.clear()
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  private setMemoryCache(key: string, data: any, ttl: number): void {
    // Implement LRU-like behavior
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }

    this.memoryCache.set(key, {
      data,
      expires: Date.now() + ttl * 1000,
    })
  }

  private async storeTags(key: string, tags: string[], ttl: number): Promise<void> {
    if (!redis) return

    const multi = redis.multi()

    for (const tag of tags) {
      multi.sadd(`tag:${tag}`, key)
      multi.expire(`tag:${tag}`, ttl)
    }

    await multi.exec()
  }

  // Cache key generators
  static generateKey(prefix: string, ...parts: any[]): string {
    const serialized = parts.map((part) =>
      typeof part === 'object' ? JSON.stringify(part) : String(part),
    )
    // Add app-specific prefix to avoid key collisions
    const appPrefix = process.env.REDIS_KEY_PREFIX || 'beeartena'
    return `${appPrefix}:${prefix}:${serialized.join(':')}`
  }

  // Decorator for caching method results
  static cacheable(options: CacheOptions & { key?: (...args: any[]) => string } = {}) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value

      descriptor.value = async function (...args: any[]) {
        const cacheKey = options.key
          ? options.key(...args)
          : Cache.generateKey(`${target.constructor.name}:${propertyName}`, ...args)

        // Try to get from cache
        const cached = await cache.get(cacheKey)
        if (cached !== null) {
          return cached
        }

        // Execute original method
        const result = await originalMethod.apply(this, args)

        // Cache the result
        await cache.set(cacheKey, result, options.ttl, options)

        return result
      }

      return descriptor
    }
  }
}

// Export singleton instance
export const cache = new Cache()

// Export Cache class for static methods
export { Cache }

// Clean up expired memory cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cache['memoryCache'].entries()) {
    if (value.expires < now) {
      cache['memoryCache'].delete(key)
    }
  }
}, 60000) // Every minute
