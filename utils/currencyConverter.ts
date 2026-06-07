// Exchange rate utility backed by Frankfurter API (https://www.frankfurter.dev)
// Rates are cached in-memory for 5 minutes. No fallback — if the API is unreachable,
// convertCurrency returns null and callers display an unavailable state.

let cachedRates: Record<string, number> | null = null;
let lastFetched = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches latest exchange rates from Frankfurter API (relative to USD).
 * Caches them in-memory for CACHE_TTL. Throws on failure.
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - lastFetched < CACHE_TTL) {
    return cachedRates!;
  }
  const response = await fetch("https://api.frankfurter.dev/latest?from=USD");
  if (!response.ok) throw new Error(`Exchange rate API returned ${response.status}`);
  const data = await response.json();
  cachedRates = { USD: 1, ...data.rates };
  lastFetched = Date.now();
  return cachedRates!;
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
