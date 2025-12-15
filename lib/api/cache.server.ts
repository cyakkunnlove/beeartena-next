import Redis from 'ioredis'
import { compress, decompress } from 'lz-string'

import { getErrorMessage } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

// Check if Redis should be disabled (for testing/CI environments)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
const isRedisDisabled =
  process.env.DISABLE_REDIS === 'true' || process.env.NODE_ENV === 'test' || isBuildPhase

// Redis client for caching
let redis: Redis | null = null
let redisDisabledByError = false

type RedisError = Error & { code?: string }

const isRedisError = (error: unknown): error is RedisError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof (error as { code?: unknown }).code === 'string'

interface MemoryCacheEntry {
  data: unknown
  expires: number
}

interface SerializedCacheRecord {
  data: unknown
  compressed: boolean
  timestamp: number
  ttl: number
  tags: string[]
}

type CacheKeyGenerator = (...args: unknown[]) => string

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

    // Handle connection errors
    redis.on('error', (error: unknown) => {
      if (redisDisabledByError) return
      redisDisabledByError = true

      const message = getErrorMessage(error)
      if (isRedisError(error) && error.code === 'ENOTFOUND') {
        logger.warn('Redis host not found, falling back to memory cache')
      } else {
        logger.warn('Redis error encountered, falling back to memory cache', { error: message })
      }

      redis = null
    })
  } catch (error: unknown) {
    logger.warn('Redis initialization failed, falling back to memory cache', {
      error: getErrorMessage(error),
    })
    redis = null
  }
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  compress?: boolean // Whether to compress the data
  tags?: string[] // Tags for cache invalidation
}

class Cache {
  private readonly memoryCache: Map<string, MemoryCacheEntry> = new Map()
  private readonly defaultTTL = 300 // 5 minutes
  private readonly maxMemoryCacheSize = 100

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memCached = this.memoryCache.get(key)
      if (memCached && memCached.expires > Date.now()) {
        return memCached.data as T
      }

      // Check Redis if available
      if (!redis) return null

      const cached = await redis.get(key)
      if (!cached) return null

      const parsed = JSON.parse(cached) as SerializedCacheRecord
      let data: unknown = parsed.data

      if (parsed.compressed) {
        if (typeof parsed.data !== 'string') {
          logger.error('Cache get error: compressed entry is not a string', { key })
          return null
        }

        const decompressed = decompress(parsed.data)
        if (typeof decompressed !== 'string') {
          logger.error('Cache get error: failed to decompress entry', { key })
          return null
        }

        data = JSON.parse(decompressed) as unknown
      }

      const ttl = typeof parsed.ttl === 'number' ? parsed.ttl : this.defaultTTL

      this.setMemoryCache(key, data, ttl)

      return data as T
    } catch (error: unknown) {
      logger.error('Cache get error', { key, error: getErrorMessage(error) })
      return null
    }
  }

  async set(
    key: string,
    data: unknown,
    ttl: number = this.defaultTTL,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      let serializedData = JSON.stringify(data)
      let compressed = false

      if (options.compress || serializedData.length > 1024) {
        const compressedData = compress(serializedData)
        if (typeof compressedData === 'string' && compressedData.length > 0) {
          serializedData = compressedData
          compressed = true
        }
      }

      const cacheData: SerializedCacheRecord = {
        data: compressed ? serializedData : data,
        compressed,
        timestamp: Date.now(),
        ttl,
        tags: options.tags ?? [],
      }

      if (redis) {
        await redis.setex(key, ttl, JSON.stringify(cacheData))
      }

      this.setMemoryCache(key, data, ttl)

      if (options.tags && options.tags.length > 0) {
        await this.storeTags(key, options.tags, ttl)
      }
    } catch (error: unknown) {
      logger.error('Cache set error', { key, error: getErrorMessage(error) })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (redis) {
        await redis.del(key)
      }
      this.memoryCache.delete(key)
    } catch (error: unknown) {
      logger.error('Cache delete error', { key, error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      logger.error('Cache invalidate error', {
        pattern,
        error: getErrorMessage(error),
      })
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
    } catch (error: unknown) {
      logger.error('Cache invalidate by tag error', {
        tag,
        error: getErrorMessage(error),
      })
    }
  }

  async clear(): Promise<void> {
    try {
      if (redis) {
        await redis.flushdb()
      }
      this.memoryCache.clear()
    } catch (error: unknown) {
      logger.error('Cache clear error', { error: getErrorMessage(error) })
    }
  }

  private setMemoryCache(key: string, data: unknown, ttl: number): void {
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

  pruneExpiredMemoryEntries(now: number = Date.now()): void {
    for (const [cacheKey, entry] of this.memoryCache.entries()) {
      if (entry.expires < now) {
        this.memoryCache.delete(cacheKey)
      }
    }
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
  static generateKey(prefix: string, ...parts: unknown[]): string {
    const serialized = parts.map((part) =>
      typeof part === 'object' ? JSON.stringify(part) : String(part),
    )
    const appPrefix = process.env.REDIS_KEY_PREFIX || 'beeartena'
    return `${appPrefix}:${prefix}:${serialized.join(':')}`
  }

  // Decorator for caching method results
  static cacheable(options: CacheOptions & { key?: CacheKeyGenerator } = {}) {
    return function <
      This,
      Args extends unknown[],
      Result,
    >(
      target: This,
      propertyName: string,
      descriptor: TypedPropertyDescriptor<(...args: Args) => Promise<Result> | Result>,
    ): TypedPropertyDescriptor<(...args: Args) => Promise<Result>> {
      const originalMethod = descriptor.value

      if (!originalMethod) {
        return descriptor as TypedPropertyDescriptor<(...args: Args) => Promise<Result>>
      }

      descriptor.value = async function (this: This, ...args: Args) {
        const ownerName = (target as { constructor?: { name?: string } }).constructor?.name ?? 'Anonymous'
        const cacheKey = options.key
          ? options.key(...args)
          : Cache.generateKey(`${ownerName}:${propertyName}`, ...args)

        const cached = await cache.get<Result>(cacheKey)
        if (cached !== null) {
          return cached
        }

        const result = await Promise.resolve(originalMethod.apply(this, args))

        await cache.set(cacheKey, result, options.ttl, options)

        return result
      }

      return descriptor as TypedPropertyDescriptor<(...args: Args) => Promise<Result>>
    }
  }
}

// Export singleton instance
export const cache = new Cache()

// Export Cache class for static methods
export { Cache }

// Clean up expired memory cache entries periodically
if (typeof global !== 'undefined') {
  setInterval(() => {
    cache.pruneExpiredMemoryEntries()
  }, 60000) // Every minute
}
