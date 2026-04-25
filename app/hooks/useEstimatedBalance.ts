// Encapsulates estimated balance calculation
import { convertCurrency, THRESHOLD_INR } from "@/utils/currencyConverter";

export function useEstimatedBalance(
  originalExpense: any,
  editForm: any,
  drawerDataMode: string | undefined,
  walletBalance: number,
  walletCurrency: string
) {
  if (!originalExpense || !editForm || drawerDataMode !== "edit") {
    return { estimatedBalance: 0, isBelow: false, threshold: 0 };
  }
  const originalInWallet = convertCurrency(originalExpense.amount, originalExpense.currency, walletCurrency);
  const newInWallet = convertCurrency(Number(editForm.amount), editForm.currency, walletCurrency);
  const estimatedBalance = (walletBalance || 0) + originalInWallet - newInWallet;
  const threshold = convertCurrency(THRESHOLD_INR, "INR", walletCurrency);
  const isBelow = estimatedBalance < threshold;
  return { estimatedBalance, isBelow, threshold };
}
