// GET /api/exchange-rates — public endpoint that exposes the server-side cache.
// The actual caching logic lives in @/lib/exchangeRateCache so other server
// code (e.g. /api/expenses) can import it directly without HTTP round-trips.

import { getServerExchangeRates, getRatesCachedAt } from "@/lib/exchangeRateCache";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rates = await getServerExchangeRates();
    return NextResponse.json({ rates, cachedAt: getRatesCachedAt() });
  } catch (err: any) {
    console.error("[exchange-rates] fetch failed:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 502 }
    );
  }
}
