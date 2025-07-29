import Redis from 'ioredis'
import { NextRequest } from 'next/server'

// Check if Redis should be disabled (for testing/CI environments)
const isRedisDisabled = process.env.DISABLE_REDIS === 'true' || process.env.NODE_ENV === 'test'

// Redis client for rate limiting
let redis: Redis | null = null

if (!isRedisDisabled) {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      lazyConnect: true, // Don't connect immediately
    })

    // Attempt to connect
    redis.connect().catch((err) => {
      console.warn('Redis connection failed for rate limiting, using memory fallback:', err.message)
      redis = null
    })
  } catch (err) {
    console.warn('Redis initialization failed for rate limiting, using memory fallback:', err)
    redis = null
  }
}

export interface RateLimitOptions {
  limit: number
  window: number // in seconds
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number
}

class RateLimiter {
  private fallbackStore = new Map<string, { count: number; reset: number }>()

  async check(req: NextRequest, options: RateLimitOptions): Promise<boolean> {
    const identifier = this.getIdentifier(req)
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const window = options.window * 1000 // Convert to milliseconds
    const reset = now + window

    try {
      // Try Redis first if available
      if (redis) {
        const result = await this.checkRedis(key, options, now, reset)
        return !result.allowed
      } else {
        // Use in-memory store if Redis is not available
        return this.checkFallback(key, options, now)
      }
    } catch (error) {
      // Fallback to in-memory store if Redis fails
      console.error('Redis rate limit error:', error)
      return this.checkFallback(key, options, now)
    }
  }

  async getRateLimitInfo(req: NextRequest, options: RateLimitOptions): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(req)
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const window = options.window * 1000
    const reset = now + window

    try {
      if (redis) {
        return await this.checkRedis(key, options, now, reset)
      } else {
        // Use fallback for rate limit info
        const record = this.fallbackStore.get(key)
        const count = record && now <= record.reset ? record.count : 0
        return {
          allowed: count < options.limit,
          limit: options.limit,
          remaining: Math.max(0, options.limit - count),
          reset: Math.floor((record?.reset || reset) / 1000),
        }
      }
    } catch (error) {
      console.error('Redis rate limit error:', error)
      // Return a default response on error
      return {
        allowed: true,
        limit: options.limit,
        remaining: options.limit,
        reset: Math.floor(reset / 1000),
      }
    }
  }

  private async checkRedis(
    key: string,
    options: RateLimitOptions,
    now: number,
    reset: number,
  ): Promise<RateLimitResult> {
    if (!redis) {
      throw new Error('Redis not available')
    }

    const multi = redis.multi()

    // Increment counter
    multi.incr(key)
    // Set expiry if key is new
    multi.expire(key, options.window)
    // Get current count
    multi.get(key)
    // Get TTL
    multi.ttl(key)

    const results = await multi.exec()

    if (!results) {
      throw new Error('Redis transaction failed')
    }

    const count = parseInt(results[2][1] as string) || 0
    const ttl = results[3][1] as number
    const resetTime = ttl > 0 ? Math.floor((now + ttl * 1000) / 1000) : Math.floor(reset / 1000)

    return {
      allowed: count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - count),
      reset: resetTime,
    }
  }

  private checkFallback(key: string, options: RateLimitOptions, now: number): boolean {
    const record = this.fallbackStore.get(key)

    if (!record || now > record.reset) {
      this.fallbackStore.set(key, {
        count: 1,
        reset: now + options.window * 1000,
      })
      return false
    }

    record.count++
    return record.count > options.limit
  }

  private getIdentifier(req: NextRequest): string {
    // Try to get user ID from auth token first
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      // Extract user ID from token (simplified - in real implementation, verify token)
      const token = authHeader.replace('Bearer ', '')
      const userId = this.extractUserIdFromToken(token)
      if (userId) {
        return `user:${userId}`
      }
    }

    // Fall back to IP address
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || 'unknown'

    return `ip:${ip}`
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      // Decode JWT without verification (for rate limiting purposes only)
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      return payload.userId || null
    } catch {
      return null
    }
  }

  // Utility method to reset rate limit for a specific identifier
  async reset(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`
    try {
      if (redis) {
        await redis.del(key)
      }
    } catch (error) {
      console.error('Failed to reset rate limit:', error)
    }
    this.fallbackStore.delete(key)
  }

  // Clean up old entries from fallback store
  cleanupFallbackStore(): void {
    const now = Date.now()
    for (const [key, record] of this.fallbackStore.entries()) {
      if (now > record.reset) {
        this.fallbackStore.delete(key)
      }
    }
  }
}

// Export singleton instance
export const rateLimit = new RateLimiter()

// Clean up fallback store periodically
setInterval(() => {
  rateLimit.cleanupFallbackStore()
}, 60000) // Every minute
