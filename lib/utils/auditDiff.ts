type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type AuditChange = {
  path: string
  before?: JsonValue
  after?: JsonValue
}

type DiffOptions = {
  maxDepth?: number
  maxChanges?: number
  maxArrayPreview?: number
  redactKeys?: RegExp
}

const DEFAULT_OPTIONS: Required<DiffOptions> = {
  maxDepth: 4,
  maxChanges: 80,
  maxArrayPreview: 20,
  redactKeys: /(password|secret|token|private[_-]?key|authorization|cookie)/i,
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toJsonValue = (value: unknown, depth: number, opts: Required<DiffOptions>): JsonValue => {
  if (value === null) return null
  if (value === undefined) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') return value

  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value && 'toDate' in (value as any)) {
    try {
      const maybe = (value as { toDate?: () => Date }).toDate?.()
      return maybe instanceof Date ? maybe.toISOString() : null
    } catch {
      return null
    }
  }

  if (Array.isArray(value)) {
    if (depth <= 0) return []
    return value.slice(0, opts.maxArrayPreview).map((item) => toJsonValue(item, depth - 1, opts))
  }

  if (isPlainObject(value)) {
    if (depth <= 0) return {}
    const result: Record<string, JsonValue> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = toJsonValue(v, depth - 1, opts)
    }
    return result
  }

  return String(value)
}

const normalizeKey = (path: string) => path.split('.').slice(-1)[0] ?? path

const redactIfNeeded = (path: string, value: JsonValue, opts: Required<DiffOptions>): JsonValue => {
  const key = normalizeKey(path)
  if (opts.redactKeys.test(key)) {
    return value ? '***REDACTED***' : value
  }

  if (typeof value === 'string') {
    if (/(email)/i.test(key)) {
      const [name, domain] = value.split('@')
      if (!domain) return '***REDACTED***'
      return `${name?.slice(0, 2) ?? ''}***@${domain}`
    }
    if (/(phone|tel)/i.test(key)) {
      const digits = value.replace(/\D/g, '')
      if (digits.length < 4) return '***REDACTED***'
      return `***${digits.slice(-4)}`
    }
  }

  return value
}

const sameJson = (a: JsonValue, b: JsonValue): boolean => {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

const buildArraySummary = (value: unknown[], opts: Required<DiffOptions>): JsonValue => {
  const preview = value.slice(0, opts.maxArrayPreview).map((item) => toJsonValue(item, 1, opts))
  return {
    length: value.length,
    preview,
  }
}

const diffInternal = (
  before: unknown,
  after: unknown,
  basePath: string,
  depth: number,
  opts: Required<DiffOptions>,
  changes: AuditChange[],
) => {
  if (changes.length >= opts.maxChanges) return

  const beforeJson = toJsonValue(before, depth, opts)
  const afterJson = toJsonValue(after, depth, opts)

  if (sameJson(beforeJson, afterJson)) return

  if (depth <= 0) {
    changes.push({
      path: basePath || '(root)',
      before: redactIfNeeded(basePath, beforeJson, opts),
      after: redactIfNeeded(basePath, afterJson, opts),
    })
    return
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    const beforeArr = Array.isArray(before) ? before : []
    const afterArr = Array.isArray(after) ? after : []
    changes.push({
      path: basePath || '(root)',
      before: redactIfNeeded(basePath, buildArraySummary(beforeArr, opts), opts),
      after: redactIfNeeded(basePath, buildArraySummary(afterArr, opts), opts),
    })
    return
  }

  if (isPlainObject(before) || isPlainObject(after)) {
    const beforeObj = isPlainObject(before) ? before : {}
    const afterObj = isPlainObject(after) ? after : {}
    const keys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])).sort()

    for (const key of keys) {
      if (changes.length >= opts.maxChanges) return
      const nextPath = basePath ? `${basePath}.${key}` : key
      diffInternal(beforeObj[key], afterObj[key], nextPath, depth - 1, opts, changes)
    }
    return
  }

  changes.push({
    path: basePath || '(root)',
    before: redactIfNeeded(basePath, beforeJson, opts),
    after: redactIfNeeded(basePath, afterJson, opts),
  })
}

export const buildAuditDiff = (before: unknown, after: unknown, options: DiffOptions = {}): AuditChange[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const changes: AuditChange[] = []
  diffInternal(before, after, '', opts.maxDepth, opts, changes)
  return changes
}

