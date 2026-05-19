/**
 * ComponentCache — lightweight client-side cache with stale-while-revalidate semantics.
 *
 * Designed to survive component remounts (Form.io wizard navigation, tab switches).
 * Module-level singleton instances live for the page session.
 *
 * Features:
 * - get/set by string key
 * - stale-while-revalidate: returns stale data immediately, refreshes in background
 * - in-flight request deduplication
 * - configurable staleTime and cacheTime (TTL)
 * - cache invalidation by key, prefix, or full clear
 * - no external dependencies
 */

export interface CacheOptions {
  /** Time in ms before cached data is considered stale (default: 30 000 = 30s) */
  staleTime?: number
  /** Time in ms before cached data is evicted entirely (default: 300 000 = 5min) */
  cacheTime?: number
}

export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  /** When the eviction timer fires */
  evictTimer?: ReturnType<typeof setTimeout>
}

const DEFAULT_STALE_TIME = 30_000
const DEFAULT_CACHE_TIME = 300_000

export class ComponentCache {
  private cache = new Map<string, CacheEntry>()
  private inflight = new Map<string, Promise<unknown>>()
  private staleTime: number
  private cacheTime: number

  constructor(options?: CacheOptions) {
    this.staleTime = options?.staleTime ?? DEFAULT_STALE_TIME
    this.cacheTime = options?.cacheTime ?? DEFAULT_CACHE_TIME
  }

  /** Get cached data. Returns undefined if nothing is cached for the key. */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    return entry.data as T
  }

  /** Returns true if cached data exists and is still fresh (not stale). */
  isFresh(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    return Date.now() - entry.timestamp < this.staleTime
  }

  /** Returns true if any cached data exists for the key (fresh or stale). */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /** Store data in cache. Resets eviction timer. */
  set<T = unknown>(key: string, data: T): void {
    const existing = this.cache.get(key)
    if (existing?.evictTimer) clearTimeout(existing.evictTimer)

    const evictTimer = setTimeout(() => {
      this.cache.delete(key)
    }, this.cacheTime)

    this.cache.set(key, { data, timestamp: Date.now(), evictTimer })
  }

  /**
   * Fetch with stale-while-revalidate semantics.
   *
   * - If data is cached and fresh → returns cached data, no fetch.
   * - If data is cached but stale → returns cached data immediately,
   *   triggers background refresh, updates cache when done.
   * - If no cached data → awaits the fetch and returns fresh data.
   *
   * Deduplicates concurrent in-flight requests for the same key.
   */
  async fetch<T = unknown>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(key)

    if (cached !== undefined && this.isFresh(key)) {
      return cached
    }

    // Stale data exists — return it and refresh in background
    if (cached !== undefined) {
      this.revalidate(key, fetcher)
      return cached
    }

    // No cached data — wait for fetch (with dedup)
    return this.revalidate(key, fetcher)
  }

  /**
   * Triggers a fetch for the key, deduplicating concurrent calls.
   * Updates cache on success.
   */
  private async revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key)
    if (existing) return existing as Promise<T>

    const promise = fetcher()
      .then((data) => {
        this.set(key, data)
        return data
      })
      .finally(() => {
        this.inflight.delete(key)
      })

    this.inflight.set(key, promise)
    return promise
  }

  /** Invalidate a single key. */
  invalidate(key: string): void {
    const entry = this.cache.get(key)
    if (entry?.evictTimer) clearTimeout(entry.evictTimer)
    this.cache.delete(key)
    this.inflight.delete(key)
  }

  /** Invalidate all keys matching a prefix. */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.invalidate(key)
      }
    }
  }

  /** Clear the entire cache. */
  clear(): void {
    for (const entry of this.cache.values()) {
      if (entry.evictTimer) clearTimeout(entry.evictTimer)
    }
    this.cache.clear()
    this.inflight.clear()
  }
}
