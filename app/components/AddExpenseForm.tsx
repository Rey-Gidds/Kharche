"use client";

import { useState } from "react";
import { useExpenses } from "@/context/ExpenseContext";
import { useNotification } from "@/context/NotificationContext";
import { supportedCurrencies, convertCurrency, THRESHOLD_INR } from "@/utils/currencyConverter";
import { useSession } from "@/lib/auth-client";
import { useWallet } from "@/context/WalletContext";
import ErrorMessage from "./ErrorMessage";
import { useRouter } from "next/navigation";

const CATEGORY_LIMIT = 20;
const DESCRIPTION_LIMIT = 100;
const AMOUNT_LIMIT = 1000000;

interface AddExpenseFormProps {
  bookId?: string;
  onSuccess?: () => void;
}

export default function AddExpenseForm({ bookId, onSuccess }: AddExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("Food");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { expenses, setExpenses, fetchExpenses } = useExpenses();
  const { showNotification } = useNotification();
  const { data: session } = useSession();
  const { walletBalance, walletCurrency, refetchWallet } = useWallet();
  const router = useRouter();
  console.log("Wallet Currency:", walletCurrency);

  const costInWalletCurrency = amount ? convertCurrency(Number(amount), currency, walletCurrency) : 0;
  const projectedBalance = walletBalance - costInWalletCurrency;
  
  // Threshold logic
  const thresholdInWalletCurrency = convertCurrency(THRESHOLD_INR, "INR", walletCurrency);
  const isBelowThreshold = projectedBalance < thresholdInWalletCurrency && !!amount;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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

    const previousExpenses = [...expenses];
    const optimisticExpense = {
      _id: `temp-${Date.now()}`,
      amount: finalAmount,
      currency,
      category: finalCategory,
      description,
      date,
      bookId,
      createdAt: new Date().toISOString(),
    };

    // Optimistic add
    setExpenses([optimisticExpense, ...expenses]);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: finalAmount, 
          currency, 
          category: finalCategory, 
          description, 
          date,
          bookId
        }),
      });

      if (response.ok) {
        setAmount("");
        setCurrency("USD");
        setCategory("Food");
        setCustomCategory("");
        setDescription("");
        showNotification("Expense added successfully", "success");
        
        // Refetch wallet balance after adding expense
        refetchWallet(session?.user);
        
        // Re-fetch to get real ID and sync
        fetchExpenses(); 

        if (onSuccess) onSuccess();
      } else {
        // Rollback
        setExpenses(previousExpenses);
        const data = await response.json();
        const errorMsg = data.error || "Failed to add expense";
        setError(errorMsg);
        showNotification(errorMsg, "error");
      }
    } catch (error) {
      // Rollback
      setExpenses(previousExpenses);
      setError("An error occurred. Please try again.");
      showNotification("An error occurred. Please try again.", "error");
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
                  {supportedCurrencies.map(curr => <option key={curr} value={curr} className="bg-[var(--surface)]">{curr}</option>)}
                </select>
              </div>
              {amount && (
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
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Shopping"
                className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)]"
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
                    className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)]"
                />
              </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] mt-auto shrink-0 bg-[var(--surface)]">
          {isBelowThreshold ? (
            <button
              type="button"
              onClick={() => router.push('/me?tab=wallet')}
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
