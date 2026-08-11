import { auth } from "./auth";

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

// Module-level caches for session lookups
const sessionCache = new Map<string, { session: Session; timestamp: number }>();
const inflightCache = new Map<string, Promise<Session | null>>();

const TTL = 60_000; // 1 min session cache (matches BetterAuth's cookieCache maxAge)

function getCacheKey(headers: Headers): string | null {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;

  const sessionCookie = cookieHeader
    .split(";")
    .find((c) => {
      const trimmed = c.trim();
      return (
        trimmed.startsWith("better-auth.session-token=") ||
        trimmed.startsWith("__Secure-better-auth.session-token=")
      );
    })
    ?.trim();

  return sessionCookie || cookieHeader;
}

/**
 * Manually removes a session from the cache (e.g. on logout).
 */
export function evictSession(headers: Headers): void {
  const cacheKey = getCacheKey(headers);
  if (!cacheKey) return;
  sessionCache.delete(cacheKey);
  inflightCache.delete(cacheKey);
}

/**
 * Returns the current session by validating request headers.
 * Uses in-flight Promise deduplication to ensure concurrent API calls
 * with the same session token result in only ONE auth.api.getSession invocation.
 * Leverages BetterAuth signed cookies and short-term memory caching.
 */
export async function getSession(headers: Headers): Promise<Session | null> {
  const cacheKey = getCacheKey(headers);
  if (!cacheKey) return null;

  const now = Date.now();

  // 1. Return from memory cache if fresh
  const cached = sessionCache.get(cacheKey);
  if (cached && now - cached.timestamp < TTL) {
    return cached.session;
  }

  // 2. Return existing in-flight promise if a lookup is already in progress
  const inflight = inflightCache.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  // 3. Initiate lookup and cache the promise to deduplicate concurrent calls
  const promise = (async () => {
    try {
      const session = await auth.api.getSession({ headers });
      if (session) {
        sessionCache.set(cacheKey, { session, timestamp: Date.now() });
      } else {
        sessionCache.delete(cacheKey);
      }
      return session;
    } catch (err) {
      sessionCache.delete(cacheKey);
      throw err;
    } finally {
      inflightCache.delete(cacheKey);
    }
  })();

  inflightCache.set(cacheKey, promise);
  return promise;
}

/**
 * Alias for getSession for backwards compatibility.
 */
export const getCachedSession = getSession;