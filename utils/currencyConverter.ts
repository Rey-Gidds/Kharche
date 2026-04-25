// Simplified exchange rate utility. 
// In a real app, these would be fetched from an API daily.
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5, // 1 USD = 83.5 INR (Mock)
  CNY: 7.2,  // 1 USD = 7.2 CNY (Mock)
  EUR: 0.92, // 1 USD = 0.92 EUR (Mock)
  GBP: 0.79, // 1 USD = 0.79 GBP (Mock)
  JPY: 156.0, // 1 USD = 156 JPY (Mock)
};

/**
 * Converts an amount from one currency to another using a USD base.
 * It first converts the source currency to USD, then from USD to the target currency.
 */
export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  if (!EXCHANGE_RATES[from] || !EXCHANGE_RATES[to]) {
    throw new Error("Invalid currency");
  }

  // Convert from input currency to USD first (base)
  const amountInUSD = amount / EXCHANGE_RATES[from];

  // Convert from USD to target currency
  return amountInUSD * EXCHANGE_RATES[to];
}

export const supportedCurrencies = Object.keys(EXCHANGE_RATES);
export const THRESHOLD_INR = 83;
