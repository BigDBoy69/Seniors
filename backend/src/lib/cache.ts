interface CacheEntry {
  value: any;
  expiresAt: number;
}

class InMemoryCache {
  private store: Map<string, CacheEntry> = new Map();
  private maxSize: number = 1000;

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clearPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  getStats() {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
    };
  }
}

export const cache = new InMemoryCache();

export function buildCacheKey(prefix: string, params: Record<string, any>): string {
  const normalized = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${String(v).toLowerCase().trim()}`)
    .join(":");
  return normalized ? `${prefix}:${normalized}` : prefix;
}
