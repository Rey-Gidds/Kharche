// Currency multipliers: how many smallest units in 1 standard unit
export const CURRENCY_MULTIPLIERS: Record<string, number> = {
  USD: 100,  // 1 USD = 100 cents
  INR: 100,  // 1 INR = 100 paise
  EUR: 100,  // 1 EUR = 100 euro cents
  GBP: 100,  // 1 GBP = 100 pence
  JPY: 1,    // JPY has no subunit
  CNY: 100,  // 1 CNY = 100 fen
};

export const SUPPORTED_ROOM_CURRENCIES = Object.keys(CURRENCY_MULTIPLIERS);

/** Convert a user-facing display amount to the integer smallest unit */
export function toSmallestUnit(amount: number, currency: string): number {
  const mult = CURRENCY_MULTIPLIERS[currency] ?? 100;
  return Math.round(amount * mult);
}

/** Convert an integer smallest unit back to a display amount */
export function fromSmallestUnit(amount: number, currency: string): number {
  const mult = CURRENCY_MULTIPLIERS[currency] ?? 100;
  return amount / mult;
}

/** Format an amount stored in smallest unit as a human-readable currency string */
export function formatRoomCurrency(amountInSmallest: number, currency: string): string {
  const amount = fromSmallestUnit(Math.abs(amountInSmallest), currency);
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: CURRENCY_MULTIPLIERS[currency] === 1 ? 0 : 2,
    maximumFractionDigits: CURRENCY_MULTIPLIERS[currency] === 1 ? 0 : 2,
  }).format(amount);
  return amountInSmallest < 0 ? `-${formatted}` : formatted;
}

/** Get currency symbol */
export function getCurrencySymbol(currency: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 })
    .format(0)
    .replace(/[\d,.\s]/g, "")
    .trim();
}
