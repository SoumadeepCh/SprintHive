/**
 * lib/cache.ts — Simple client-side in-memory cache with TTL
 *
 * Uses a module-level Map which persists across client-side navigations
 * (the JS module stays loaded as long as the user is on the app).
 *
 * Pattern: stale-while-revalidate
 *   1. Return cached data immediately (zero-latency render)
 *   2. Caller triggers a background fetch to update the cache
 *   3. UI swaps to fresh data silently — no loading spinner
 *
 * Usage:
 *   const cached = cache.get<Org[]>("orgs");
 *   cache.set("orgs", data, 60_000);   // 60s TTL
 *   cache.del("orgs");                 // after mutation
 *   cache.invalidate("org:");          // prefix-based invalidation
 */

type Entry<T> = { data: T; expiresAt: number };

// Module-level store — survives Next.js client-side navigation
const store = new Map<string, Entry<unknown>>();

export const cache = {
    /** Return cached value if still fresh, null if missing/expired. O(1). */
    get<T>(key: string): T | null {
        const e = store.get(key);
        if (!e) return null;
        if (Date.now() > e.expiresAt) { store.delete(key); return null; }
        return e.data as T;
    },

    /** Store a value with a TTL (default 60s). O(1). */
    set<T>(key: string, data: T, ttlMs = 60_000): void {
        store.set(key, { data, expiresAt: Date.now() + ttlMs });
    },

    /** Delete a specific key (call after mutations). */
    del(key: string): void { store.delete(key); },

    /** Delete all keys that start with a given prefix. */
    invalidate(prefix: string): void {
        for (const k of store.keys()) {
            if (k.startsWith(prefix)) store.delete(k);
        }
    },

    /** Expose store size — useful for the /logs debug page. */
    size(): number { return store.size; },
};
