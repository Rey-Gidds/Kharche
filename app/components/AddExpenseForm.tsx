"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { useNotification } from "@/context/NotificationContext";
import { supportedCurrencies, convertCurrency, MINIMUM_BALANCE_USD } from "@/utils/currencyConverter";
import { useSession } from "@/lib/auth-client";
import { useWallet } from "@/context/WalletContext";
import { useExpenses } from "@/context/ExpenseContext";
import ErrorMessage from "./ErrorMessage";
import { useRouter } from "next/navigation";
import SmartCategoryInput from "./SmartCategoryInput";
import { encryptExpensePayload } from "@/crypto/services/payloadEncryption.service";
import { getMasterKey } from "@/crypto/indexeddb/cacheManager";

const CATEGORY_LIMIT = 20;
const DESCRIPTION_LIMIT = 100;
const AMOUNT_LIMIT = 1000000;

interface AddExpenseFormProps {
  bookId?: string;
  bookCurrency?: string;
  onSuccess?: () => void;
}

export default function AddExpenseForm({ bookId, bookCurrency, onSuccess }: AddExpenseFormProps) {
  const { walletBalance, walletCurrency, refetchWallet, ratesStatus } = useWallet();
  const { decryptExpenses } = useExpenses();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(bookCurrency || walletCurrency);
  const [category, setCategory] = useState("Food");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { mutate } = useSWRConfig();
  const { showNotification } = useNotification();
  const { data: session } = useSession();
  const router = useRouter();

  const rawConversion = amount && currency !== walletCurrency
    ? convertCurrency(Number(amount), currency, walletCurrency)
    : Number(amount);
  const rawThreshold = ratesStatus === "loaded" ? convertCurrency(MINIMUM_BALANCE_USD, "USD", walletCurrency) : null;
  const ratesUnavailable = ratesStatus !== "loaded";

  const costInWalletCurrency = rawConversion === null ? 0 : rawConversion;
  const projectedBalance = walletBalance - costInWalletCurrency;
  const thresholdInWalletCurrency = rawThreshold === null ? 0 : rawThreshold;
  const isBelowThreshold = !ratesUnavailable && projectedBalance < thresholdInWalletCurrency && !!amount;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (ratesUnavailable) {
      showNotification("Exchange rates unavailable. Please try again.", "error");
      setLoading(false);
      return;
    }

    if (isBelowThreshold) {
      const msg = `Insufficient balance. Minimum threshold is ${thresholdInWalletCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${walletCurrency}.`;
      setError(msg);
      showNotification(msg, "error");
      setLoading(false);
      return;
    }

    const finalAmount = Number(amount);
    if (finalAmount <= 0) {
      setError("Amount must be greater than 0");
      showNotification("Amount must be greater than 0", "error");
      setLoading(false);
      return;
    }

    const decimalRegex = /^\d+(\.\d{1,3})?$/;
    if (!decimalRegex.test(amount)) {
      setError("Amount can only have up to 3 decimal places");
      showNotification("Amount can only have up to 3 decimal places", "error");
      setLoading(false);
      return;
    }

    if (finalAmount > AMOUNT_LIMIT) {
      setError(`Amount cannot exceed ${AMOUNT_LIMIT.toLocaleString()}`);
      showNotification(`Amount cannot exceed ${AMOUNT_LIMIT.toLocaleString()}`, "error");
      setLoading(false);
      return;
    }

    const finalCategory = category === "Other" ? customCategory : category;
    if (!finalCategory || finalCategory.trim().length === 0) {
      setError("Category is required");
      setLoading(false);
      return;
    }

    try {
      const masterKey = getMasterKey();
      if (!masterKey) throw new Error("Encryption key not available");
      let body: Record<string, any> = {
        amount: finalAmount,
        currency,
        category: finalCategory,
        date,
        bookId,
      };

      const { encryptedDescription, encryptionVersion } = await encryptExpensePayload(
        { description },
        masterKey,
      );
      body.encryptedDescription = encryptedDescription;
      body.encryptionVersion = encryptionVersion;

      // 1. Do the fetch FIRST — no optimistic update, just persist to server
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add expense");
      }

      const serverExpense = await response.json();
      // Decrypt the response so we can place it into the cache
      const decryptedList = await decryptExpenses([serverExpense]);
      const persistedItem = decryptedList[0];

      // 2. THEN update the cache with the server-confirmed data
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/expenses"),
        (currentPages: any) => {
          // Guard: only update useSWRInfinite caches (arrays of page objects).
          // Plain useSWR caches like InsightsView's /api/expenses?... are not arrays — skip them.
          if (!Array.isArray(currentPages)) return currentPages;
          return currentPages.map((page, idx) => {
            if (idx === 0) {
              return {
                ...page,
                data: [persistedItem, ...page.data],
              };
            }
            return page;
          });
        },
        {
          revalidate: true,
          populateCache: true,
        }
      );

      // Reset form on success
      setAmount("");
      setCurrency(bookCurrency || walletCurrency);
      setCategory("Food");
      setCustomCategory("");
      setDescription("");

      showNotification("Expense added successfully", "success");
      refetchWallet();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      showNotification(err.message || "An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-inter">
      {error && (
        <div className="mb-6">
          <ErrorMessage 
            title="Form Error"
            message={error}
            variant="error"
            compact
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Amount</label>
              <div className="flex w-full justify-between gap-3 border-b border-[var(--border)] focus-within:border-[var(--accent)]">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const decimalParts = val.split('.');
                    if (decimalParts.length > 1 && decimalParts[1].length > 3) return;
                    setAmount(val);
                  }}
                  placeholder="0.00"
                  className="flex-grow py-2 bg-transparent outline-none font-bold text-lg text-[var(--foreground)] min-w-0"
                  required
                  max={AMOUNT_LIMIT}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="py-2 bg-transparent outline-none text-xs font-bold text-[var(--muted)] cursor-pointer shrink-0"
                >
                  {
                    [...supportedCurrencies].sort((a, b) => {
                      const primary = bookCurrency || walletCurrency;
                      if (a === primary) return -1;
                      if (b === primary) return 1;
                      return 0;
                    }).map(curr => 
                      {
                        return (
                        <option key={curr} value={curr} className="bg-[var(--surface)]">
                          {curr} {curr === (bookCurrency || walletCurrency) ? "(Default)" : ""}
                        </option>
                        );
                      }
                    )
                  }
                </select>
              </div>
              {amount && ratesUnavailable && (
                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-tight mt-1">
                  Exchange rates loading — balance estimate unavailable
                </div>
              )}
              {amount && !ratesUnavailable && (
                <div className={`text-[10px] font-bold uppercase tracking-tight mt-1 transition-colors ${isBelowThreshold ? 'text-rose-500' : 'text-emerald-500'}`}>
                  Est. Balance after: {Math.max(0, projectedBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} {walletCurrency}
                  {isBelowThreshold && ` (Below ${thresholdInWalletCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })} threshold)`}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-medium text-[var(--foreground)] cursor-pointer"
              >
                <option value="Food" className="bg-[var(--surface)]">Food & Dining</option>
                <option value="Transport" className="bg-[var(--surface)]">Travel & Transport</option>
                <option value="Rent" className="bg-[var(--surface)]">Rent & Housing</option>
                <option value="Entertainment" className="bg-[var(--surface)]">Entertainment</option>
                <option value="Utilities" className="bg-[var(--surface)]">Utilities</option>
                <option value="Other" className="bg-[var(--surface)]">Other (Custom)</option>
              </select>
            </div>
          </div>

          {category === "Other" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Custom Category</label>
              <SmartCategoryInput
                value={customCategory}
                onChange={setCustomCategory}
                placeholder="e.g. Shopping"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-6 md:grid md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Notes</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details..."
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm outline-none focus:border-[var(--accent)] text-[var(--foreground)] resize-none"
                />
              </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] mt-auto shrink-0 bg-[var(--surface)]">
          {ratesUnavailable ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 bg-gray-400 text-white font-bold text-xs uppercase tracking-widest rounded-lg cursor-not-allowed shadow-sm"
            >
              Exchange rates loading...
            </button>
          ) : isBelowThreshold ? (
            <button
              type="button"
              onClick={() => router.push('/me/wallet')}
              className="w-full py-3.5 bg-rose-500 text-white font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer hover:opacity-90 shadow-sm"
            >
              Add Money to Wallet
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              {loading ? "Registering..." : "Submit Entry"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
