// Server-side exchange rate cache — shared across all users for 24 hours.
// A single fetch is made to Frankfurter when the cache is stale; all
// subsequent requests within the TTL window hit the in-memory cache.

import { NextResponse } from "next/server";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// Module-level variables live for the lifetime of the Node.js process,
// giving us a true server-wide shared cache.
let cachedRates: Record<string, number> | null = null;
let lastFetched = 0;
// Tracks an in-flight promise so concurrent requests share a single fetch.
let inflightFetch: Promise<Record<string, number>> | null = null;

async function getExchangeRates(): Promise<Record<string, number>> {
  // Return cached rates if still fresh.
  if (cachedRates && Date.now() - lastFetched < CACHE_TTL) {
    return cachedRates;
  }

  // If a fetch is already in-flight, return the same promise so we don't
  // hammer the upstream API with parallel requests.
  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = (async () => {
    try {
      const response = await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=INR,CNY,EUR,GBP,JPY",
        // next: { revalidate: 0 } tells Next.js not to cache this fetch itself —
        // we manage our own TTL above.
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

export async function GET() {
  try {
    const rates = await getExchangeRates();
    return NextResponse.json({ rates, cachedAt: lastFetched });
  } catch (err: any) {
    console.error("[exchange-rates] fetch failed:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 502 }
    );
  }
}
