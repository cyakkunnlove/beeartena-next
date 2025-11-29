// サーバーサイド専用の簡易キャッシュ実装（Vercelなどの環境で存在しない場合のフォールバック用）
// 実運用で高速化したい場合はここを適切なKVやメモリキャッシュに差し替えてください。

type CacheRecord = {
  value: any
  expireAt?: number
}

class SimpleCache {
  private store = new Map<string, CacheRecord>()

  async get<T = any>(key: string): Promise<T | null> {
    const record = this.store.get(key)
    if (!record) return null
    if (record.expireAt && Date.now() > record.expireAt) {
      this.store.delete(key)
      return null
    }
    return record.value as T
  }

  async set(key: string, data: any, ttlSeconds = 300, _options?: { tags?: string[] }) {
    const expireAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined
    this.store.set(key, { value: data, expireAt })
  }

  async delete(key: string) {
    this.store.delete(key)
  }

  async invalidateByTag(_tag: string) {
    // タグ無効化は簡易実装では未対応
  }

  static generateKey(prefix: string, ...args: unknown[]) {
    return [prefix, ...args].join(':')
  }
}

export const cache = new SimpleCache()
export const Cache = SimpleCache
