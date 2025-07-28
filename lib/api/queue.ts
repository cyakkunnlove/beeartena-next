import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Redis client for queue
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_QUEUE_DB || '2'), // Different DB for queue
});

export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
}

export interface JobOptions {
  delay?: number; // Delay in milliseconds
  priority?: number; // Higher number = higher priority
  maxAttempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export type JobHandler<T = any> = (job: Job<T>) => Promise<any>;

class Queue {
  private handlers = new Map<string, JobHandler>();
  private processing = false;
  private concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '5');
  private activeJobs = new Set<string>();

  // Register a job handler
  register<T = any>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
  }

  // Add a job to the queue
  async add<T = any>(
    type: string,
    data: T,
    options: JobOptions = {}
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id: uuidv4(),
      type,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
    };

    const key = `job:${job.id}`;
    const score = this.calculateScore(options);

    // Store job data
    await redis.set(key, JSON.stringify(job), 'EX', 86400); // 24 hour expiry

    // Add to queue with score (for priority and delay)
    if (options.delay) {
      await redis.zadd('queue:delayed', score, job.id);
    } else {
      await redis.zadd('queue:pending', score, job.id);
    }

    // Start processing if not already running
    this.startProcessing();

    return job;
  }

  // Get job by ID
  async getJob<T = any>(jobId: string): Promise<Job<T> | null> {
    const data = await redis.get(`job:${jobId}`);
    return data ? JSON.parse(data) : null;
  }

  // Get job status
  async getStatus(jobId: string): Promise<Job['status'] | null> {
    const job = await this.getJob(jobId);
    return job ? job.status : null;
  }

  // Get queue statistics
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [pending, processing, completed, failed, delayed] = await Promise.all([
      redis.zcard('queue:pending'),
      redis.scard('queue:processing'),
      redis.zcard('queue:completed'),
      redis.zcard('queue:failed'),
      redis.zcard('queue:delayed'),
    ]);

    return { pending, processing, completed, failed, delayed };
  }

  // Start processing jobs
  private startProcessing(): void {
    if (this.processing) return;
    this.processing = true;
    this.processJobs();
  }

  // Process jobs continuously
  private async processJobs(): Promise<void> {
    while (this.processing) {
      try {
        // Move delayed jobs to pending queue if ready
        await this.moveDelayedJobs();

        // Process jobs up to concurrency limit
        while (this.activeJobs.size < this.concurrency) {
          const jobId = await this.getNextJob();
          if (!jobId) break;

          this.activeJobs.add(jobId);
          this.processJob(jobId).finally(() => {
            this.activeJobs.delete(jobId);
          });
        }

        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Queue processing error:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Get next job from queue
  private async getNextJob(): Promise<string | null> {
    const result = await redis.zpopmin('queue:pending');
    return result.length > 0 ? result[0] : null;
  }

  // Process a single job
  private async processJob(jobId: string): Promise<void> {
    let job = await this.getJob(jobId);
    if (!job) return;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.error(`No handler registered for job type: ${job.type}`);
      await this.failJob(job, 'No handler registered');
      return;
    }

    try {
      // Update job status
      job.status = 'processing';
      job.processedAt = new Date();
      job.attempts++;
      await this.updateJob(job);

      // Move to processing set
      await redis.sadd('queue:processing', jobId);

      // Execute handler
      const result = await handler(job);

      // Mark as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      await this.updateJob(job);

      // Move to completed queue
      await redis.srem('queue:processing', jobId);
      await redis.zadd('queue:completed', Date.now(), jobId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (job.attempts >= job.maxAttempts) {
        await this.failJob(job, errorMessage);
      } else {
        await this.retryJob(job, errorMessage);
      }
    }
  }

  // Update job in storage
  private async updateJob(job: Job): Promise<void> {
    await redis.set(`job:${job.id}`, JSON.stringify(job), 'EX', 86400);
  }

  // Fail a job
  private async failJob(job: Job, error: string): Promise<void> {
    job.status = 'failed';
    job.failedAt = new Date();
    job.error = error;
    await this.updateJob(job);

    await redis.srem('queue:processing', job.id);
    await redis.zadd('queue:failed', Date.now(), job.id);
  }

  // Retry a job
  private async retryJob(job: Job, error: string): Promise<void> {
    job.status = 'pending';
    job.error = error;
    await this.updateJob(job);

    await redis.srem('queue:processing', job.id);

    // Calculate backoff delay
    const delay = this.calculateBackoff(job);
    const score = Date.now() + delay;

    if (delay > 0) {
      await redis.zadd('queue:delayed', score, job.id);
    } else {
      await redis.zadd('queue:pending', score, job.id);
    }
  }

  // Move delayed jobs to pending queue
  private async moveDelayedJobs(): Promise<void> {
    const now = Date.now();
    const jobIds = await redis.zrangebyscore('queue:delayed', 0, now);

    for (const jobId of jobIds) {
      await redis.zrem('queue:delayed', jobId);
      await redis.zadd('queue:pending', now, jobId);
    }
  }

  // Calculate job score for priority queue
  private calculateScore(options: JobOptions): number {
    const now = Date.now();
    const delay = options.delay || 0;
    const priority = options.priority || 0;

    // Lower score = higher priority
    // Subtract priority from timestamp to prioritize higher priority jobs
    return now + delay - (priority * 1000);
  }

  // Calculate backoff delay
  private calculateBackoff(job: Job): number {
    // Default exponential backoff
    const baseDelay = 1000; // 1 second
    return baseDelay * Math.pow(2, job.attempts - 1);
  }

  // Stop processing
  stop(): void {
    this.processing = false;
  }
}

// Export singleton instance
export const queue = new Queue();

// Common job types
export const JobTypes = {
  SEND_EMAIL: 'send_email',
  PROCESS_WEBHOOK: 'process_webhook',
  GENERATE_REPORT: 'generate_report',
  SYNC_POINTS: 'sync_points',
  CLEANUP_OLD_DATA: 'cleanup_old_data',
  SEND_REMINDER: 'send_reminder',
  PROCESS_BIRTHDAY_POINTS: 'process_birthday_points',
} as const;