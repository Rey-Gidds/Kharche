// Orchestrates the display of the expenses table and associated drawer controls
"use client";

import { useEffect, useState } from "react";
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
import BottomSheet from "./BottomSheet";

interface ExpenseListProps {
  bookId?: string;
  bookTitle?: string;
  onBack?: () => void;
  refreshTrigger?: number;
}

export default function ExpenseList({ bookId, bookTitle, onBack, refreshTrigger }: ExpenseListProps) {
  const { expenses, setExpenses, fetchExpenses, updateExpense, loading, error, setError } = useExpenses();
  const { refetchWallet, walletBalance, walletCurrency } = useWallet();
  const { data: session } = useSession();
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [mounted, setMounted] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
 
  const {
    activeMenu,
    setActiveMenu,
    drawerData,
    setDrawerData,
    editForm,
    deleteExpense,
    handleUpdateSubmit,
    handleInlineChange,
    openDrawer
  } = useExpenseDrawer(
    expenses,
    setExpenses,
    fetchExpenses,
    updateExpense,
    refetchWallet,
    session,
    sortBy,
    sortOrder,
    categoryFilter,
    bookId
  );

  useEffect(() => {
    fetchExpenses(sortBy, sortOrder, categoryFilter, bookId);
  }, [sortBy, sortOrder, categoryFilter, bookId, fetchExpenses, refreshTrigger]);

  // --- All hooks must be declared before any early returns ---
  const originalExpense = drawerData ? expenses.find((e: any) => e._id === drawerData.id) : null;
  const { estimatedBalance, isBelow, threshold } = useEstimatedBalance(
    originalExpense,
    editForm,
    drawerData?.mode,
    walletBalance,
    walletCurrency
  );

  const activeFiltersCount = (categoryFilter !== "All" ? 1 : 0) + (displayCurrency !== "USD" ? 1 : 0) + (sortBy !== "createdAt" ? 1 : 0);

  // Early returns AFTER all hooks
  if (loading && expenses.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-0">
        <ErrorMessage 
          title="Data Retrieval Error"
          message={error}
          variant="error"
          fullHeight
          action={{
            label: "Try Again",
            onClick: () => {
              setError(null);
              fetchExpenses(sortBy, sortOrder, categoryFilter, bookId);
            }
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
      walletCurrency={walletCurrency}
      originalExpense={originalExpense}
    />
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
              {supportedCurrencies.map(curr => <option key={curr} value={curr} className="bg-[var(--surface)]">{curr}</option>)}
            </select>
          </div>
          
          <div className="h-4 w-px bg-[var(--border)]"></div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Cat:</span>
             <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm font-bold text-[var(--foreground)] bg-transparent border-none outline-none cursor-pointer hover:underline"
             >
                <option value="All" className="bg-[var(--surface)]">All</option>
                <option value="Food" className="bg-[var(--surface)]">Food</option>
                <option value="Transport" className="bg-[var(--surface)]">Transport</option>
                <option value="Rent" className="bg-[var(--surface)]">Rent</option>
                <option value="Entertainment" className="bg-[var(--surface)]">Entertainment</option>
                <option value="Utilities" className="bg-[var(--surface)]">Utilities</option>
                <option value="others" className="bg-[var(--surface)]">Others</option>
             </select>
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
              const convertedAmount = convertCurrency(expense.amount, expense.currency || "USD", displayCurrency);
              return (
                <ExpenseTableRow
                  key={expense._id}
                  expense={expense}
                  index={index}
                  totalExpenses={expenses.length}
                  displayCurrency={displayCurrency}
                  convertedAmount={convertedAmount}
                  isSelected={isSelected}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  openDrawer={openDrawer}
                  deleteExpense={deleteExpense}
                />
              );
            })
          )}
        </div>
      </div>
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
                {supportedCurrencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Category</label>
               <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--foreground)] outline-none"
               >
                  <option value="All">All</option>
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Rent">Rent</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="others">Others</option>
               </select>
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
                  setDisplayCurrency("USD");
                  setSortBy("createdAt");
                  setSortOrder("desc");
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
