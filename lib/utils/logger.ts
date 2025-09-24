type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogMeta = Record<string, unknown>

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const DEFAULT_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

function resolveLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase() as LogLevel
  if (envLevel && envLevel in LEVELS) {
    return envLevel
  }
  return DEFAULT_LEVEL
}

const ACTIVE_LEVEL = resolveLevel()

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[ACTIVE_LEVEL]
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[truncated]'
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(process.env.NODE_ENV !== 'production' && value.stack ? { stack: value.stack } : {}),
    }
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitize(item, depth + 1))
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 25)
      .map(([key, val]) => [key, sanitize(val, depth + 1)])
    return Object.fromEntries(entries)
  }

  return value
}

function output(level: LogLevel, message: string, meta?: LogMeta): void {
  if (!shouldLog(level)) {
    return
  }

  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (meta && Object.keys(meta).length > 0) {
    payload.context = sanitize(meta)
  }

  const serialized = JSON.stringify(payload)

  if (level === 'error') {
    console.error(serialized)
  } else if (level === 'warn') {
    console.warn(serialized)
  } else {
    console.log(serialized)
  }
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    output('debug', message, meta)
  },
  info(message: string, meta?: LogMeta): void {
    output('info', message, meta)
  },
  warn(message: string, meta?: LogMeta): void {
    output('warn', message, meta)
  },
  error(message: string, meta?: LogMeta): void {
    output('error', message, meta)
  },
}
