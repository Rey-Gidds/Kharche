/**
 * Server-side exchange rate cache — shared across all users for 24 hours.
 *
 * Import this module directly from any server-side code (API routes, Server
 * Actions, etc.) instead of calling fetch("/api/exchange-rates"), which would
 * fail on the server because relative URLs are not valid in Node.js fetch.
 */

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Module-level variables live for the lifetime of the Node.js process,
// giving us a true server-wide shared cache.
let cachedRates: Record<string, number> | null = null;
let lastFetched = 0;
// Tracks an in-flight promise so concurrent requests share a single upstream fetch.
let inflightFetch: Promise<Record<string, number>> | null = null;

/**
 * Returns cached exchange rates, fetching from Frankfurter only when the
 * cache is stale (older than 24 h). Concurrent callers share a single fetch.
 */
export async function getServerExchangeRates(): Promise<Record<string, number>> {
  // Return cached rates if still fresh.
  if (cachedRates && Date.now() - lastFetched < CACHE_TTL) {
    return cachedRates;
  }

  // If a fetch is already in-flight, share it to avoid hammering the API.
  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = (async () => {
    try {
      const response = await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=INR,CNY,EUR,GBP,JPY",
        // Tell Next.js not to cache this fetch itself — we manage our own TTL.
        { next: { revalidate: 0 } }
      );
      if (!response.ok) {
        throw new Error(`Frankfurter API returned ${response.status}`);
      }
      const data = await response.json();
      cachedRates = { USD: 1, ...data.rates };
      lastFetched = Date.now();
      return cachedRates!;
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

/** Returns the timestamp (ms) of the last successful cache fill, or 0. */
export function getRatesCachedAt(): number {
  return lastFetched;
}
