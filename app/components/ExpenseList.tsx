// Orchestrates the display of the expenses table and associated drawer controls
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import useSWR from "swr";
import { convertCurrency, supportedCurrencies } from "@/utils/currencyConverter";
import { useExpenses } from "@/context/ExpenseContext";
import { createPortal } from "react-dom";
import { useWallet } from "@/context/WalletContext";
import { useSession } from "@/lib/auth-client";
import ErrorMessage from "./ErrorMessage";
import ExpenseDrawer from "./ExpenseDrawer";
import ExpenseTableRow from "./ExpenseTableRow";
import { useExpenseDrawer } from "@/app/hooks/useExpenseDrawer";
import { useEstimatedBalance } from "@/app/hooks/useEstimatedBalance";
import { useNotification } from "@/context/NotificationContext";
import BottomSheet from "./BottomSheet";
import { SkeletonExpenseRow, SkeletonExpenseRowMobile } from "./Skeletons";

const PAGE_SIZE = 20;
const timezoneOffset = new Date().getTimezoneOffset();

const jsonFetcher = (url: string) => fetch(url).then((r) => r.json());

// Human-readable label for active date filter badge
function dateFilterLabel(type: string, value: string): string {
  if (type === "date") return value;
  if (type === "month") {
    const [y, m] = value.split("-");
    return `${new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "short" })} ${y}`;
  }
  if (type === "year") return value;
  return "";
}

interface ExpenseListProps {
  bookId?: string;
  bookTitle?: string;
  bookCurrency?: string;
  onBack?: () => void;
}

export default function ExpenseList({ bookId, bookTitle, bookCurrency, onBack }: ExpenseListProps) {
  const { updateExpense, decryptExpenses } = useExpenses();
  const { refetchWallet, walletBalance, walletCurrency, ratesStatus } = useWallet();
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const ratesNotifiedRef = useRef(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [displayCurrency, setDisplayCurrency] = useState(bookCurrency || walletCurrency);
  const [mounted, setMounted] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // --- Date filter state ---
  const [dateFilterType, setDateFilterType] = useState<"all" | "date" | "month" | "year">("all");
  const [dateFilterValue, setDateFilterValue] = useState("");

  useEffect(() => {
    setMounted(true);
    if (bookCurrency) {
      setDisplayCurrency(bookCurrency);
    } else {
      setDisplayCurrency(walletCurrency);
    }
  }, [walletCurrency, bookCurrency]);

  // Fetch all custom categories for the datalist (lightweight — only displayName needed)
  const { data: allCategories } = useSWR<{ displayName: string; normalizedName: string }[]>(
    "/api/categories?all=true",
    jsonFetcher,
    { revalidateOnFocus: false }
  );

  // Build SWR key for paginated expenses
  const getKey = useCallback((pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    const page = pageIndex + 1;
    const params = new URLSearchParams({
      sortBy,
      sort: sortOrder,
      category: categoryFilter,
      page: String(page),
      limit: String(PAGE_SIZE),
      timezoneOffset: String(timezoneOffset),
    });
    if (bookId) params.set("bookId", bookId);
    if (dateFilterType !== "all" && dateFilterValue) {
      params.set("dateFilterType", dateFilterType);
      params.set("dateFilterValue", dateFilterValue);
    }
    return `/api/expenses?${params.toString()}`;
  }, [sortBy, sortOrder, categoryFilter, bookId, dateFilterType, dateFilterValue]);

  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch expenses: ${res.statusText}`);
    const result = await res.json();
    const rawData: any[] = Array.isArray(result) ? result : (result.data ?? []);
    const more: boolean = Array.isArray(result) ? false : (result.hasMore ?? false);
    const returnedPage: number = Array.isArray(result) ? 1 : (result.page ?? 1);
    const decrypted = await decryptExpenses(rawData);
    return { data: decrypted, hasMore: more, page: returnedPage };
  }, [decryptExpenses]);

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    { revalidateFirstPage: true }
  );

  // Flatten paginated data
  const expenses = useMemo(() => data ? data.flatMap(page => page.data) : [], [data]);
  const loading = isLoading && expenses.length === 0;
  const loadingMore = isValidating && expenses.length > 0;
  const hasMore = data ? data[data.length - 1]?.hasMore ?? false : false;

  // Notify once when exchange rates are unavailable for display conversion
  useEffect(() => {
    const needsConversion = expenses.some(e => e.currency !== displayCurrency);
    if (!needsConversion) return;
    if (ratesStatus === "loading") return;
    const ratesFailed = ratesStatus === "error" || expenses.some(e =>
      e.currency !== displayCurrency &&
      convertCurrency(e.amount, e.currency || "USD", displayCurrency) === null
    );
    if (ratesFailed && !ratesNotifiedRef.current) {
      showNotification("Exchange rates unavailable — some amounts shown in original currency.", "warning");
      ratesNotifiedRef.current = true;
    }
    if (!ratesFailed) ratesNotifiedRef.current = false;
  }, [displayCurrency, expenses, showNotification, ratesStatus]);

  const {
    activeMenu,
    setActiveMenu,
    drawerData,
    setDrawerData,
    editForm,
    deleteExpense,
    handleUpdateSubmit,
    handleInlineChange,
    openDrawer,
    processingIds
  } = useExpenseDrawer(
    expenses,
    mutate,
    updateExpense,
    refetchWallet,
  );

  // --- All hooks must be declared before any early returns ---
  const originalExpense = drawerData ? expenses.find((e: any) => e._id === drawerData.id) : null;
  const { estimatedBalance, isBelow, threshold, ratesUnavailable } = useEstimatedBalance(
    originalExpense,
    editForm,
    drawerData?.mode,
    walletBalance,
    walletCurrency,
    ratesStatus
  );

  const activeFiltersCount =
    (categoryFilter !== "All" ? 1 : 0) +
    (displayCurrency !== walletCurrency ? 1 : 0) +
    (sortBy !== "createdAt" ? 1 : 0) +
    (dateFilterType !== "all" ? 1 : 0);

  // Early returns AFTER all hooks
  if (loading && expenses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-10 w-48 skeleton-box rounded-lg mb-6" />
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background)]">
            <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 border-b border-[var(--border)] bg-[var(--surface)] py-4 px-6">
                <div className="h-3 w-12 skeleton-box rounded opacity-50" />
                <div className="h-3 w-12 skeleton-box rounded opacity-50" />
                <div className="h-3 w-12 skeleton-box rounded opacity-50 ml-auto" />
                <div className="h-3 w-12 skeleton-box rounded opacity-50 ml-auto" />
            </div>
            <div className="skeleton-stagger">
              {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i}>
                      <div className="hidden md:block">
                          <SkeletonExpenseRow />
                      </div>
                      <div className="md:hidden">
                          <SkeletonExpenseRowMobile />
                      </div>
                  </div>
              ))}
            </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-0">
        <ErrorMessage 
          title="Data Retrieval Error"
          message={error.message || "An unexpected error occurred while fetching your data."}
          variant="error"
          fullHeight
          action={{
            label: "Try Again",
            onClick: () => mutate(),
          }}
        />
      </div>
    );
  }

  const drawerContent = drawerData && (
    <ExpenseDrawer
      drawerData={drawerData}
      setDrawerData={setDrawerData}
      editForm={editForm}
      handleInlineChange={handleInlineChange}
      handleUpdateSubmit={handleUpdateSubmit}
      estimatedBalance={estimatedBalance}
      isBelow={isBelow}
      threshold={threshold}
      ratesUnavailable={ratesUnavailable}
      walletCurrency={walletCurrency}
      originalExpense={originalExpense}
    />
  );

  // Predefined categories always shown in filter selects / datalist
  const PREDEFINED = ["Food", "Transport", "Rent", "Entertainment", "Utilities"];

  // Custom categories not already in predefined list
  const customCats = (allCategories ?? []).filter(
    (c) => !PREDEFINED.map((p) => p.toLowerCase()).includes(c.normalizedName)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

      <div className="flex flex-row items-center justify-between border-b border-[var(--border)] pb-4 gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer -ml-2"
              title="Back to Collections"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <h2 className="text-xl md:text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
            {bookTitle || "Ledger Entries"}
          </h2>
        </div>
        
        {/* Desktop Filters */}
        <div className="hidden md:flex flex-wrap items-center gap-4 font-inter">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Show in:</span>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="text-sm font-bold text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer hover:underline"
            >
              {[...supportedCurrencies].sort((a, b) => {
                const primary = bookCurrency || walletCurrency;
                if (a === primary) return -1;
                if (b === primary) return 1;
                return 0;
              }).map(curr => (
                <option key={curr} value={curr} className="bg-[var(--surface)]">
                  {curr} {curr === (bookCurrency || walletCurrency) ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>
          
          <div className="h-4 w-px bg-[var(--border)]"></div>
          
          {/* Category filter — dropdown select */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Cat:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm font-bold text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer hover:underline w-28 min-w-0"
            >
              <option value="All" className="bg-[var(--surface)]">All</option>
              {PREDEFINED.map((cat) => (
                <option key={cat} value={cat} className="bg-[var(--surface)]">{cat}</option>
              ))}
              <option value="others" className="bg-[var(--surface)]">Others</option>
              {customCats.map((c) => (
                <option key={c.normalizedName} value={c.displayName} className="bg-[var(--surface)]">{c.displayName}</option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-[var(--border)]"></div>

          {/* Date filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Date:</span>
            <select
              value={dateFilterType}
              onChange={(e) => {
                setDateFilterType(e.target.value as any);
                setDateFilterValue("");
              }}
              className="text-sm text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="all" className="bg-[var(--surface)]">All Time</option>
              <option value="date" className="bg-[var(--surface)]">Day</option>
              <option value="month" className="bg-[var(--surface)]">Month</option>
              <option value="year" className="bg-[var(--surface)]">Year</option>
            </select>
            {dateFilterType === "date" && (
              <input
                type="date"
                value={dateFilterValue}
                onChange={(e) => setDateFilterValue(e.target.value)}
                className="text-xs text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer"
              />
            )}
            {dateFilterType === "month" && (
              <input
                type="month"
                value={dateFilterValue}
                onChange={(e) => setDateFilterValue(e.target.value)}
                className="text-xs text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer"
              />
            )}
            {dateFilterType === "year" && (
              <input
                type="number"
                value={dateFilterValue}
                onChange={(e) => setDateFilterValue(e.target.value)}
                placeholder={String(new Date().getFullYear())}
                min="2000"
                max="2100"
                className="text-xs text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer w-16"
              />
            )}
          </div>

          <div className="h-4 w-px bg-[var(--border)]"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="createdAt" className="bg-[var(--surface)]">Date Added</option>
              <option value="amount" className="bg-[var(--surface)]">Amount</option>
              <option value="date" className="bg-[var(--surface)]">Expense Date</option>
            </select>
            <button 
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-1 hover:bg-[var(--border)] rounded text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Filter Button */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsFilterSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-bold text-[var(--foreground)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1 bg-[var(--accent)] text-[var(--background)] w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="relative border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background)]">
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 border-b border-[var(--border)] bg-[var(--surface)] py-4 text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest px-6">
          <div>Date</div>
          <div>Category</div>
          <div className="text-right">Amount ({displayCurrency})</div>
          <div className="text-right px-2 w-16">Actions</div>
        </div>
        <div className="divide-y divide-[var(--border)]/50">
          {expenses.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)] text-sm italic font-inter">No entries recorded.</div>
          ) : (
            expenses.map((expense: any, index: number) => {
              const isSelected = drawerData?.id === expense._id;
              let expenseAmount = expense.amount;
              if (expense.currency !== displayCurrency) {
                expenseAmount = convertCurrency(expense.amount, expense.currency || "USD", displayCurrency) ?? expense.amount;
              }
              return (
                <div key={expense._id} className="list-item-animate" style={{ animationDelay: `${index * 0.04}s` }}>
                  <ExpenseTableRow
                    expense={expense}
                    index={index}
                    totalExpenses={expenses.length}
                    displayCurrency={displayCurrency}
                    convertedAmount={expenseAmount}
                    isSelected={isSelected}
                    isProcessing={!!processingIds[expense._id]}
                    isOptimistic={typeof expense._id === 'string' && expense._id.startsWith('temp-')}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    openDrawer={openDrawer}
                    deleteExpense={deleteExpense}
                  />
                </div>
              );
            })
          )}
          {loadingMore && (
            <div className="skeleton-stagger">
              <div className="hidden md:block">
                <SkeletonExpenseRow />
                <SkeletonExpenseRow />
              </div>
              <div className="md:hidden">
                <SkeletonExpenseRowMobile />
                <SkeletonExpenseRowMobile />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Load More */}
      {hasMore && !loadingMore && (
        <div className="flex justify-center pt-1 pb-4">
          <button
            onClick={() => setSize(size + 1)}
            className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer px-5 py-2 rounded-lg hover:bg-[var(--border)]/50"
          >
            Load more
          </button>
        </div>
      )}

      {mounted && drawerContent && createPortal(drawerContent, document.body)}
      {mounted && createPortal(
        <BottomSheet isOpen={isFilterSheetOpen} onClose={() => setIsFilterSheetOpen(false)} title="Filters">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Display Currency</label>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none"
              >
                {
                  [...supportedCurrencies].sort((a, b) => {
                    const primary = bookCurrency || walletCurrency;
                    if (a === primary) return -1;
                    if (b === primary) return 1;
                    return 0;
                  }).map(curr => (
                    <option key={curr} value={curr} className="bg-[var(--surface)]">
                      {curr} {curr === (bookCurrency || walletCurrency) ? "(Default)" : ""}
                    </option>
                  ))
                }
              </select>
            </div>
            
            {/* Category — dropdown select */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none cursor-pointer"
              >
                <option value="All" className="bg-[var(--surface)]">All</option>
                {PREDEFINED.map((cat) => (
                  <option key={cat} value={cat} className="bg-[var(--surface)]">{cat}</option>
                ))}
                <option value="others" className="bg-[var(--surface)]">Others (Custom)</option>
                {customCats.map((c) => (
                  <option key={c.normalizedName} value={c.displayName} className="bg-[var(--surface)]">{c.displayName}</option>
                ))}
              </select>
            </div>

            {/* Date filter */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Date Range</label>
              <select
                value={dateFilterType}
                onChange={(e) => {
                  setDateFilterType(e.target.value as any);
                  setDateFilterValue("");
                }}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none"
              >
                <option value="all">All Time</option>
                <option value="date">Specific Day</option>
                <option value="month">Specific Month</option>
                <option value="year">Specific Year</option>
              </select>
              {dateFilterType === "date" && (
                <input
                  type="date"
                  value={dateFilterValue}
                  onChange={(e) => setDateFilterValue(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none"
                />
              )}
              {dateFilterType === "month" && (
                <input
                  type="month"
                  value={dateFilterValue}
                  onChange={(e) => setDateFilterValue(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none"
                />
              )}
              {dateFilterType === "year" && (
                <input
                  type="number"
                  value={dateFilterValue}
                  onChange={(e) => setDateFilterValue(e.target.value)}
                  placeholder={String(new Date().getFullYear())}
                  min="2000"
                  max="2100"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none"
                >
                  <option value="createdAt">Date Added</option>
                  <option value="amount">Amount</option>
                  <option value="date">Expense Date</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] flex items-center justify-center"
                >
                  {sortOrder === "asc" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  setCategoryFilter("All");
                  setDisplayCurrency(walletCurrency);
                  setSortBy("createdAt");
                  setSortOrder("desc");
                  setDateFilterType("all");
                  setDateFilterValue("");
                }}
                className="flex-1 py-3 font-bold text-sm text-[var(--foreground)] hover:bg-[var(--border)] rounded-xl transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-3 font-bold text-sm bg-[var(--accent)] text-[var(--background)] rounded-xl transition-colors hover:opacity-90"
              >
                Apply
              </button>
            </div>
          </div>
        </BottomSheet>,
        document.body
      )}
    </div>
  );
}
