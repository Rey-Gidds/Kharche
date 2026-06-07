// Encapsulates estimated balance calculation
import { convertCurrency, MINIMUM_BALANCE_USD } from "@/utils/currencyConverter";

export function useEstimatedBalance(
  originalExpense: any,
  editForm: any,
  drawerDataMode: string | undefined,
  walletBalance: number,
  walletCurrency: string,
  ratesStatus: "loading" | "loaded" | "error"
) {
  if (ratesStatus !== "loaded") {
    return { estimatedBalance: 0, isBelow: false, threshold: 0, ratesUnavailable: true };
  }
  if (!originalExpense || !editForm || drawerDataMode !== "edit") {
    return { estimatedBalance: 0, isBelow: false, threshold: 0, ratesUnavailable: false };
  }
  const originalInWallet = convertCurrency(originalExpense.amount, originalExpense.currency, walletCurrency);
  const newInWallet = convertCurrency(Number(editForm.amount), editForm.currency, walletCurrency);
  const threshold = convertCurrency(MINIMUM_BALANCE_USD, "USD", walletCurrency);

  if (originalInWallet === null || newInWallet === null || threshold === null) {
    return { estimatedBalance: 0, isBelow: false, threshold: 0, ratesUnavailable: true };
  }

  const estimatedBalance = (walletBalance || 0) + originalInWallet - newInWallet;
  const isBelow = estimatedBalance < threshold;
  return { estimatedBalance, isBelow, threshold, ratesUnavailable: false };
}
