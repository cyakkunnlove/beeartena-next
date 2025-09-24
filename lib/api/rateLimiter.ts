import Redis from 'ioredis'
import { NextRequest } from 'next/server'

import { verifyJWT } from '@/lib/api/jwt'
import { logger } from '@/lib/utils/logger'

const isRedisDisabled = process.env.DISABLE_REDIS === 'true' || process.env.NODE_ENV === 'test'
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'beeartena'

let redis: Redis | null = null

if (!isRedisDisabled) {
  try {
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => Math.min(times * 50, 2000),
        lazyConnect: true,
      })
    } else {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        retryStrategy: (times) => Math.min(times * 50, 2000),
        lazyConnect: true,
      })
    }

    redis
      .connect()
      .catch((err) => {
        logger.warn('Redis connection failed for rate limiter, falling back to memory store', {
          error: err?.message,
        })
        redis = null
      })

    redis?.on('error', (err: any) => {
      if (err?.code === 'ENOTFOUND') {
        logger.warn('Redis host not found for rate limiter, falling back to memory store')
        redis = null
      }
    })
  } catch (error) {
    logger.warn('Redis initialisation failed for rate limiter, using memory fallback', { error })
    redis = null
  }
}

export interface RateLimitOptions {
  limit: number
  window: number
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
    const identifier = await this.getIdentifier(req)
    const key = this.buildKey(identifier)
    const now = Date.now()
    const reset = now + options.window * 1000

    try {
      if (redis) {
        const result = await this.checkRedis(key, options, now, reset)
        return !result.allowed
      }
      return this.checkFallback(key, options, now)
    } catch (error) {
      logger.warn('Redis rate limit check failed, using fallback', { error })
      return this.checkFallback(key, options, now)
    }
  }

  async getRateLimitInfo(req: NextRequest, options: RateLimitOptions): Promise<RateLimitResult> {
    const identifier = await this.getIdentifier(req)
    const key = this.buildKey(identifier)
    const now = Date.now()
    const reset = now + options.window * 1000

    try {
      if (redis) {
        return await this.checkRedis(key, options, now, reset)
      }

      const record = this.fallbackStore.get(key)
      const count = record && now <= record.reset ? record.count : 0
      return {
        allowed: count < options.limit,
        limit: options.limit,
        remaining: Math.max(0, options.limit - count),
        reset: Math.floor((record?.reset || reset) / 1000),
      }
    } catch (error) {
      logger.warn('Redis rate limit info failed, returning safe defaults', { error })
      return {
        allowed: true,
        limit: options.limit,
        remaining: options.limit,
        reset: Math.floor(reset / 1000),
      }
    }
  }

  private buildKey(identifier: string): string {
    return `${KEY_PREFIX}:rate_limit:${identifier}`
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
    multi.incr(key)
    multi.expire(key, options.window)
    multi.get(key)
    multi.ttl(key)

    const results = await multi.exec()

    if (!results) {
      throw new Error('Redis transaction failed')
    }

    const countRaw = results[2]?.[1]
    const ttlRaw = results[3]?.[1]

    const count = typeof countRaw === 'string' ? parseInt(countRaw, 10) || 0 : 0
    const ttl = typeof ttlRaw === 'number' ? ttlRaw : -1
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

    record.count += 1
    return record.count > options.limit
  }

  private async getIdentifier(req: NextRequest): Promise<string> {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      if (token) {
        try {
          const payload = await verifyJWT(token)
          if (payload.userId) {
            return `user:${payload.userId}`
          }
        } catch (error) {
          logger.debug('Failed to extract user from JWT for rate limiter', { error })
        }
      }
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

    return `ip:${ip}`
  }

  async reset(identifier: string): Promise<void> {
    const key = this.buildKey(identifier)
    try {
      if (redis) {
        await redis.del(key)
      }
    } catch (error) {
      logger.warn('Failed to reset Redis rate limit key', { key, error })
    }
    this.fallbackStore.delete(key)
  }

  cleanupFallbackStore(): void {
    const now = Date.now()
    for (const [key, record] of this.fallbackStore.entries()) {
      if (now > record.reset) {
        this.fallbackStore.delete(key)
      }
    }
  }
}

export const rateLimit = new RateLimiter()

setInterval(() => {
  rateLimit.cleanupFallbackStore()
}, 60000)
