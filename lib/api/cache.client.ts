export interface CacheOptions {
  ttl?: number
  compress?: boolean
  tags?: string[]
}

class NoopCache {
  async get<T = unknown>(_key: string): Promise<T | null> {
    return null
  }

  async set(_key: string, _data: unknown, _ttl?: number, _options?: CacheOptions): Promise<void> {}

  async delete(_key: string): Promise<void> {}

  async invalidate(_pattern: string): Promise<void> {}

  async invalidateByTag(_tag: string): Promise<void> {}

  async clear(): Promise<void> {}

  pruneExpiredMemoryEntries(): void {}

  static generateKey(prefix: string, ...parts: unknown[]): string {
    const serialized = parts.map((part) =>
      typeof part === 'object' ? JSON.stringify(part) : String(part),
    )
    return `${prefix}:${serialized.join(':')}`
  }

  static cacheable() {
    return function <This, Args extends unknown[], Result>(
      _target: This,
      _propertyName: string,
      descriptor: TypedPropertyDescriptor<(...args: Args) => Promise<Result> | Result>,
    ): TypedPropertyDescriptor<(...args: Args) => Promise<Result>> {
      return descriptor as TypedPropertyDescriptor<(...args: Args) => Promise<Result>>
    }
  }
}

export const cache = new NoopCache()

export const Cache = NoopCache
