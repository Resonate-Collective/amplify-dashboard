// Tiny single-entry, in-memory TTL cache. There is exactly one dataset (the
// Sheet), so a single slot is enough. The Refresh button passes bypass=true.
const TTL_MS = 5 * 60 * 1000; // ~5 minutes (PRD §9)

export interface Cached<T> {
  value: T;
  cachedAt: string; // ISO timestamp of when this value was loaded
  fromCache: boolean;
}

let entry: { value: unknown; expires: number; cachedAt: string } | null = null;

export async function withCache<T>(
  loader: () => Promise<T>,
  bypass = false
): Promise<Cached<T>> {
  const now = Date.now();
  if (!bypass && entry && entry.expires > now) {
    return { value: entry.value as T, cachedAt: entry.cachedAt, fromCache: true };
  }
  const value = await loader();
  const cachedAt = new Date().toISOString();
  entry = { value, expires: now + TTL_MS, cachedAt };
  return { value, cachedAt, fromCache: false };
}

/** Test/dev helper: drop the cached entry. */
export function clearCache() {
  entry = null;
}
