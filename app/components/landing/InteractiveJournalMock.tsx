"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/formatCurrency";
import { convertCurrency } from "@/utils/currencyConverter";

interface MockExpense {
  _id: string;
  category: "Food" | "Transport" | "Rent" | "Entertainment" | "Utilities" | "Others";
  amount: number;
  currency: string;
  date: string;
  note: string;
}

const INITIAL_EXPENSES: MockExpense[] = [
  {
    _id: "exp_1",
    category: "Food",
    amount: 1450,
    currency: "INR",
    date: "2026-09-02",
    note: "Artisan coffee roastery & brunch",
  },
  {
    _id: "exp_2",
    category: "Transport",
    amount: 42.5,
    currency: "EUR",
    date: "2026-09-01",
    note: "High-speed rail ticket to Kyoto",
  },
  {
    _id: "exp_3",
    category: "Utilities",
    amount: 28.0,
    currency: "USD",
    date: "2026-08-30",
    note: "Database cluster & edge compute",
  },
  {
    _id: "exp_4",
    category: "Entertainment",
    amount: 3800,
    currency: "JPY",
    date: "2026-08-28",
    note: "Modern art museum pass (pair)",
  },
  {
    _id: "exp_5",
    category: "Rent",
    amount: 450,
    currency: "GBP",
    date: "2026-08-25",
    note: "Studio workspace co-share fee",
  },
];

interface InteractiveJournalMockProps {
  baseCurrency: string;
}

export default function InteractiveJournalMock({
  baseCurrency,
}: InteractiveJournalMockProps) {
  const [selectedExpense, setSelectedExpense] = useState<MockExpense | null>(
    INITIAL_EXPENSES[0]
  );
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const categories = ["All", "Food", "Transport", "Utilities", "Entertainment", "Rent"];

  const filteredExpenses =
    filterCategory === "All"
      ? INITIAL_EXPENSES
      : INITIAL_EXPENSES.filter((e) => e.category === filterCategory);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-playfair font-bold text-base sm:text-lg text-[var(--foreground)]">
              Daily Ledger Journal
            </h3>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
              Live Mock
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">
            Real multi-currency records automatically converted into{" "}
            <span className="font-semibold text-[var(--foreground)]">{baseCurrency}</span>
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterCategory === cat
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] bg-[var(--background)] border border-[var(--border)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Table / List Area */}
        <div className="lg:col-span-7 space-y-2">
          {filteredExpenses.map((expense) => {
            const converted =
              convertCurrency(expense.amount, expense.currency, baseCurrency) ??
              expense.amount;
            const isSelected = selectedExpense?._id === expense._id;

            return (
              <div
                key={expense._id}
                onClick={() => setSelectedExpense(expense)}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-[var(--background)] border-[var(--accent)] shadow-sm"
                    : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--muted)]"
                }`}
              >
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[8px] sm:text-[9px] font-bold text-[var(--foreground)] bg-[var(--border)]/70 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {expense.category}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[var(--muted)] font-mono">
                      {expense.date}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[var(--foreground)] font-medium truncate">
                    {expense.note}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-playfair font-bold text-sm sm:text-base text-[var(--foreground)]">
                    {formatCurrency(converted, baseCurrency)}
                  </p>
                  {expense.currency !== baseCurrency && (
                    <p className="text-[8px] sm:text-[9px] text-[var(--muted)] font-mono">
                      orig. {formatCurrency(expense.amount, expense.currency)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* In-App Inspector / Details Drawer Card */}
        <div className="lg:col-span-5 bg-[var(--background)] border border-[var(--border)] rounded-xl p-3.5 sm:p-5 flex flex-col justify-between">
          {selectedExpense ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted)]">
                  Expense Details
                </span>
                <span className="text-[9px] font-mono text-[var(--muted)]">
                  {selectedExpense._id}
                </span>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-widest text-[var(--muted)] font-bold">
                  Converted Amount
                </span>
                <p className="text-3xl font-playfair font-bold text-[var(--foreground)] mt-1">
                  {formatCurrency(
                    convertCurrency(
                      selectedExpense.amount,
                      selectedExpense.currency,
                      baseCurrency
                    ) ?? selectedExpense.amount,
                    baseCurrency
                  )}
                </p>
                {selectedExpense.currency !== baseCurrency && (
                  <p className="text-xs text-[var(--muted)] mt-1 font-mono">
                    Entered as {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </p>
                )}
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[var(--border)]">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Category</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {selectedExpense.category}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Date</span>
                  <span className="font-mono text-[var(--foreground)]">
                    {selectedExpense.date}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Note</span>
                  <span className="text-[var(--foreground)] max-w-[180px] text-right truncate">
                    {selectedExpense.note}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Privacy</span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Private & Encrypted
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted)] text-center my-auto">
              Select an entry on the left to inspect details.
            </p>
          )}

          <div className="mt-6 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>Select any row to view details</span>
            <span className="text-emerald-500 font-medium">End-to-End Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
