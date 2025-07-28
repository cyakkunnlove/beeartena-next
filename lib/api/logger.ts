type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    }

    if (this.isDevelopment) {
      // In development, use console with colors
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m', // Green
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
      }
      const reset = '\x1b[0m'

      console.log(
        `${colors[level]}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`,
        context || '',
      )
    } else {
      // In production, output structured JSON logs
      console.log(JSON.stringify(logEntry))
    }

    // In production, you might want to send logs to a service like CloudWatch, Datadog, etc.
    if (!this.isDevelopment) {
      this.sendToLoggingService(logEntry)
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context)
  }

  // Performance logging
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      this.info(`${label} completed`, { duration })
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.error(`${label} failed`, { duration, error })
      throw error
    }
  }

  // API request logging middleware
  apiRequest(req: Request, res: Response, duration: number): void {
    this.info('API Request', {
      method: req.method,
      url: req.url,
      status: res.status,
      duration,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    })
  }

  private sendToLoggingService(logEntry: any): void {
    // Implement sending to external logging service
    // Example: CloudWatch, Datadog, LogRocket, etc.
  }
}

// Export singleton instance
export const logger = new Logger()
