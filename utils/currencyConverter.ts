// Exchange rate utility — backed by the /api/exchange-rates server route.
// The server caches rates for 24 hours and shares them across all users.
// On the client we keep a lightweight in-memory copy so convertCurrency()
// can be called synchronously once rates have been loaded.
//
// No fallback — if the API is unreachable, fetchExchangeRates() throws and
// callers surface an error state.

let cachedRates: Record<string, number> | null = null;
let inflightPromise: Promise<Record<string, number>> | null = null;

/**
 * Fetches exchange rates from our server-side cache endpoint.
 * The server deduplicates upstream calls and caches for 24 hours.
 * Uses client-side in-flight request coalescing to prevent redundant network calls.
 * Stores the result in the client-side module cache for synchronous access.
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  if (cachedRates) return cachedRates;
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const response = await fetch("/api/exchange-rates");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Exchange rate API returned ${response.status}`);
      }
      const data = await response.json();
      cachedRates = data.rates as Record<string, number>;
      return cachedRates;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

/**
 * Converts an amount from one currency to another using a USD base.
 * Returns null if exchange rates haven't been loaded yet.
 * Callers must handle the null case.
 */
export function convertCurrency(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  if (!cachedRates) return null;
  if (!cachedRates[from] || !cachedRates[to]) {
    throw new Error(`Invalid currency: ${from} → ${to}`);
  }
  const amountInUSD = amount / cachedRates[from];
  return amountInUSD * cachedRates[to];
}

export const supportedCurrencies = ["USD", "INR", "CNY", "EUR", "GBP", "JPY"];
export const MINIMUM_BALANCE_USD = 1; // $1 minimum balance required to create an expense
