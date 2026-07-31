import { INotification } from "@/models/Notification";

export interface PushPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data: {
    url: string;
    roomId: string;
    ticketId: string;
  };
  timestamp: number;
}

/**
 * Formats an integer amount (smallest currency unit) into a human-readable string.
 * e.g. 1000 INR → "₹10.00"
 */
function formatCurrency(amount: number, currency: string): string {
  // Amount is stored in smallest unit (paise, cents, etc.)
  // Determine the number of decimal places for the currency
  const zeroCurrencies = ["JPY", "KRW", "VND", "IDR", "CLP", "GNF", "UGX", "RWF", "BIF", "XOF", "XAF", "XPF", "MGA", "PYG", "ISK", "HUF"];
  const isZeroDecimal = zeroCurrencies.includes(currency.toUpperCase());
  const divisor = isZeroDecimal ? 1 : 100;

  const value = amount / divisor;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(value);
  } catch {
    // Fallback for unsupported currency codes
    return `${currency} ${value.toFixed(isZeroDecimal ? 0 : 2)}`;
  }
}

/**
 * Builds a compact push notification payload from a Notification document.
 *
 * For encrypted rooms, `ticketTitle` will already be "Expense" (set by the
 * ticket creation handler), so no extra logic is needed here.
 */
export function buildPayload(n: INotification): PushPayload {
  const roomIdStr = n.roomId.toString();
  const ticketIdStr = n.ticketId.toString();

  return {
    title: `${n.ticketTitle} — ${n.roomName}`,
    body: `Your share: ${formatCurrency(n.recipientShare, n.currency)} of ${formatCurrency(n.amount, n.currency)}`,
    icon: "/logo.png",
    badge: "/logo.png",
    tag: `ticket-${ticketIdStr}`,
    data: {
      url: `/rooms?room=${roomIdStr}`,
      roomId: roomIdStr,
      ticketId: ticketIdStr,
    },
    timestamp: Date.now(),
  };
}
