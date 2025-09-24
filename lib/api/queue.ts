import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'

import { logger } from '@/lib/utils/logger'

import { QueueKeys } from './queue-keys'

const isRedisDisabled = process.env.DISABLE_REDIS === 'true' || process.env.NODE_ENV === 'test'

let redis: Redis | null = null

if (!isRedisDisabled) {
  try {
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
      })
    } else {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_QUEUE_DB || '2', 10),
        lazyConnect: true,
      })
    }

    redis
      .connect()
      .catch((err) => {
        logger.warn('Redis connection failed for queue, disabling queue persistence', {
          error: err?.message,
        })
        redis = null
      })

    redis?.on('error', (err: any) => {
      if (err?.code === 'ENOTFOUND') {
        logger.warn('Redis host not found for queue, using memory fallback')
        redis = null
      }
    })
  } catch (error) {
    logger.warn('Redis initialisation failed for queue, using memory fallback', { error })
    redis = null
  }
}

export interface Job {
  id: string
  type: string
  data: unknown
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  maxAttempts: number
  createdAt: Date
  processedAt?: Date
  completedAt?: Date
  failedAt?: Date
  error?: string
  result?: unknown
}

export interface JobOptions {
  delay?: number
  priority?: number
  maxAttempts?: number
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
}

export type JobHandler = (job: Job) => Promise<unknown>

class Queue {
  private handlers = new Map<string, JobHandler>()
  private processing = false
  private concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '5', 10)
  private activeJobs = new Set<string>()
  private memoryQueue: Job[] = []

  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler)
  }

  async add(type: string, data: unknown, options: JobOptions = {}): Promise<Job> {
    const job: Job = {
      id: uuidv4(),
      type,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
    }

    if (redis) {
      const jobKey = QueueKeys.job(job.id)
      const score = this.calculateScore(options)

      await redis.set(jobKey, JSON.stringify(job), 'EX', 86400)

      if (options.delay) {
        await redis.zadd(QueueKeys.delayed, score, job.id)
      } else {
        await redis.zadd(QueueKeys.pending, score, job.id)
      }
    } else {
      this.memoryQueue.push(job)
      if (options.priority) {
        this.memoryQueue.sort((a, b) => {
          const aPriority = (a as unknown as { priority?: number }).priority || 0
          const bPriority = (b as unknown as { priority?: number }).priority || 0
          return bPriority - aPriority
        })
      }
    }

    this.startProcessing()

    return job
  }

  async getJob(jobId: string): Promise<Job | null> {
    if (redis) {
      const data = await redis.get(QueueKeys.job(jobId))
      return data ? (JSON.parse(data) as Job) : null
    }

    return this.memoryQueue.find((job) => job.id === jobId) || null
  }

  async getStatus(jobId: string): Promise<Job['status'] | null> {
    const job = await this.getJob(jobId)
    return job ? job.status : null
  }

  async getStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    delayed: number
  }> {
    if (redis) {
      const [pending, processing, completed, failed, delayed] = await Promise.all([
        redis.zcard(QueueKeys.pending),
        redis.scard(QueueKeys.processing),
        redis.zcard(QueueKeys.completed),
        redis.zcard(QueueKeys.failed),
        redis.zcard(QueueKeys.delayed),
      ])

      return { pending, processing, completed, failed, delayed }
    }

    return {
      pending: this.memoryQueue.filter((j) => j.status === 'pending').length,
      processing: this.activeJobs.size,
      completed: this.memoryQueue.filter((j) => j.status === 'completed').length,
      failed: this.memoryQueue.filter((j) => j.status === 'failed').length,
      delayed: 0,
    }
  }

  private startProcessing(): void {
    if (this.processing) return
    this.processing = true
    this.processJobs().catch((error) => {
      logger.error('Queue processing loop terminated unexpectedly', { error })
      this.processing = false
    })
  }

  private async processJobs(): Promise<void> {
    while (this.processing) {
      try {
        await this.moveDelayedJobs()

        while (this.activeJobs.size < this.concurrency) {
          const jobId = await this.getNextJob()
          if (!jobId) break

          this.activeJobs.add(jobId)
          this.processJob(jobId).finally(() => {
            this.activeJobs.delete(jobId)
          })
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        logger.error('Queue processing error', { error })
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  private async getNextJob(): Promise<string | null> {
    if (redis) {
      const result = await redis.zpopmin(QueueKeys.pending)
      return result.length > 0 ? result[0] : null
    }

    const job = this.memoryQueue.find((j) => j.status === 'pending')
    return job ? job.id : null
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId)
    if (!job) return

    const handler = this.handlers.get(job.type)
    if (!handler) {
      logger.warn('No handler registered for job type', { type: job.type })
      await this.failJob(job, 'No handler registered')
      return
    }

    try {
      job.status = 'processing'
      job.processedAt = new Date()
      job.attempts += 1
      await this.updateJob(job)

      if (redis) {
        await redis.sadd(QueueKeys.processing, jobId)
      }

      const result = await handler(job)

      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result
      await this.updateJob(job)

      if (redis) {
        await redis.srem(QueueKeys.processing, jobId)
        await redis.zadd(QueueKeys.completed, Date.now(), jobId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      if (job.attempts >= job.maxAttempts) {
        await this.failJob(job, message)
      } else {
        await this.retryJob(job, message)
      }
    }
  }

  private async updateJob(job: Job): Promise<void> {
    if (redis) {
      await redis.set(QueueKeys.job(job.id), JSON.stringify(job), 'EX', 86400)
      return
    }

    const index = this.memoryQueue.findIndex((j) => j.id === job.id)
    if (index !== -1) {
      this.memoryQueue[index] = job
    }
  }

  private async failJob(job: Job, error: string): Promise<void> {
    job.status = 'failed'
    job.failedAt = new Date()
    job.error = error
    await this.updateJob(job)

    if (redis) {
      await redis.srem(QueueKeys.processing, job.id)
      await redis.zadd(QueueKeys.failed, Date.now(), job.id)
    }

    logger.warn('Queue job failed', { jobId: job.id, type: job.type, error })
  }

  private async retryJob(job: Job, error: string): Promise<void> {
    job.status = 'pending'
    job.error = error
    await this.updateJob(job)

    if (redis) {
      await redis.srem(QueueKeys.processing, job.id)

      const delay = this.calculateBackoff(job)
      const score = Date.now() + delay

      if (delay > 0) {
        await redis.zadd(QueueKeys.delayed, score, job.id)
      } else {
        await redis.zadd(QueueKeys.pending, score, job.id)
      }
    }
  }

  private async moveDelayedJobs(): Promise<void> {
    if (!redis) return

    const now = Date.now()
    const jobIds = await redis.zrangebyscore(QueueKeys.delayed, 0, now)

    for (const jobId of jobIds) {
      await redis.zrem(QueueKeys.delayed, jobId)
      await redis.zadd(QueueKeys.pending, now, jobId)
    }
  }

  private calculateScore(options: JobOptions): number {
    const now = Date.now()
    const delay = options.delay || 0
    const priority = options.priority || 0
    return now + delay - priority * 1000
  }

  private calculateBackoff(job: Job): number {
    const baseDelay = 1000
    return baseDelay * Math.pow(2, job.attempts - 1)
  }

  stop(): void {
    this.processing = false
  }
}

export const queue = new Queue()

export const JobTypes = {
  SEND_EMAIL: 'send_email',
  PROCESS_WEBHOOK: 'process_webhook',
  GENERATE_REPORT: 'generate_report',
  SYNC_POINTS: 'sync_points',
  CLEANUP_OLD_DATA: 'cleanup_old_data',
  SEND_REMINDER: 'send_reminder',
  PROCESS_BIRTHDAY_POINTS: 'process_birthday_points',
} as const
