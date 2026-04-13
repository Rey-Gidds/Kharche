"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/dateHelpers";
import { convertCurrency, supportedCurrencies } from "@/utils/currencyConverter";
import { useExpenses } from "@/context/ExpenseContext";
import { createPortal } from "react-dom";
import { useWallet } from "@/context/WalletContext";
import { useSession } from "@/lib/auth-client";
import ErrorMessage from "./ErrorMessage";

interface ExpenseListProps {
  bookId?: string;
  bookTitle?: string;
  onBack?: () => void;
  refreshTrigger?: number;
}

export default function ExpenseList({ bookId, bookTitle, onBack, refreshTrigger }: ExpenseListProps) {
  const { expenses, fetchExpenses, updateExpense, loading, error, setError } = useExpenses();
  const { refetchWallet, walletBalance, walletCurrency } = useWallet();
  const { data: session } = useSession();
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<{ id: string; mode: "view" | "edit" } | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const deleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchExpenses(sortBy, sortOrder, categoryFilter, bookId);
        refetchWallet(session?.user);
        if (drawerData?.id === id) setDrawerData(null);
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!drawerData?.id || !editForm) return;
    const success = await updateExpense(drawerData.id, editForm);
    if (success) {
      refetchWallet(session?.user);
      setActiveMenu(null);
      setDrawerData(null);
    }
  };

  const handleInlineChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const openDrawer = (id: string, mode: "view" | "edit") => {
    const expense = expenses.find(e => e._id === id);
    if (expense) {
      setDrawerData({ id, mode });
      setEditForm({ ...expense });
      setActiveMenu(null);
    }
  };

  useEffect(() => {
    fetchExpenses(sortBy, sortOrder, categoryFilter, bookId);
  }, [sortBy, sortOrder, categoryFilter, bookId, fetchExpenses, refreshTrigger]);

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

  // Calculate estimated balance for editing
  const originalExpense = drawerData ? expenses.find(e => e._id === drawerData.id) : null;
  const getEstimatedBalance = () => {
    if (!originalExpense || !editForm || drawerData?.mode !== "edit") return { estimatedBalance: 0, isBelow: false, threshold: 0 };
    const originalInWallet = convertCurrency(originalExpense.amount, originalExpense.currency, walletCurrency);
    const newInWallet = convertCurrency(Number(editForm.amount), editForm.currency, walletCurrency);
    const estimatedBalance = (walletBalance || 0) + originalInWallet - newInWallet;
    const threshold = convertCurrency(1000, "INR", walletCurrency);
    const isBelow = estimatedBalance < threshold;
    return { estimatedBalance, isBelow, threshold };
  };

  const { estimatedBalance, isBelow, threshold } = getEstimatedBalance();

  const drawerContent = drawerData && (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md cursor-pointer" 
        onClick={() => setDrawerData(null)}
      />
      <div className="relative w-full max-w-lg bg-[var(--surface)] shadow-2xl p-8 flex flex-col rounded-2xl border border-[var(--border)] overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-playfair font-bold text-[var(--foreground)] leading-tight">
            {drawerData.mode === "view" ? "Transaction Details" : "Update Transaction"}
          </h3>
          <button onClick={() => setDrawerData(null)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {drawerData.mode === "view" ? (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Amount</p>
              <p className="text-2xl font-playfair font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
                {formatCurrency(editForm?.amount, editForm?.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Date & Category</p>
              <p className="text-[var(--foreground)] font-medium">{formatDate(editForm?.date)} • {editForm?.category}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Description</p>
              <p className="text-[var(--foreground)] opacity-70 italic leading-relaxed bg-[var(--background)] p-4 rounded-lg">
                {editForm?.description || "No notes provided."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 flex-grow">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Amount</label>
                <input 
                  type="number"
                  value={editForm?.amount}
                  onChange={(e) => handleInlineChange("amount", Number(e.target.value))}
                  className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 font-bold text-lg text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Currency</label>
                <select 
                  value={editForm?.currency}
                  onChange={(e) => handleInlineChange("currency", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 font-bold text-[var(--foreground)] cursor-pointer"
                >
                  {supportedCurrencies.map(curr => <option key={curr} value={curr} className="bg-[var(--surface)]">{curr}</option>)}
                </select>
              </div>
            </div>

            {/* Sleek Est Balance Lookup */}
            {drawerData.mode === "edit" && editForm && originalExpense && (
              <div className={`text-[10px] font-bold uppercase tracking-tight mt-[-16px] transition-colors ${isBelow ? 'text-rose-500' : 'text-emerald-500'}`}>
                Est. Balance after: {Math.max(0, estimatedBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} {walletCurrency}
                {isBelow && ` (Below ${threshold.toLocaleString(undefined, { maximumFractionDigits: 2 })} threshold)`}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Category</label>
              <input 
                type="text"
                value={editForm?.category}
                onChange={(e) => handleInlineChange("category", e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 text-[var(--foreground)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Date</label>
              <input 
                type="date"
                value={editForm?.date?.split('T')[0]}
                onChange={(e) => handleInlineChange("date", e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 text-[var(--foreground)] cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Description</label>
              <textarea 
                value={editForm?.description}
                onChange={(e) => handleInlineChange("description", e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm min-h-[100px] outline-none focus:border-[var(--accent)] text-[var(--foreground)]"
              />
            </div>
            <div className="pt-4 flex gap-3">
              <button 
                onClick={handleUpdateSubmit} 
                disabled={isBelow}
                className="flex-1 bg-[var(--accent)] text-[var(--background)] rounded py-3 font-bold text-sm cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBelow ? "Insufficient Funds" : "Save Changes"}
              </button>
              <button onClick={() => setDrawerData(null)} className="px-6 border border-[var(--border)] rounded text-sm text-[var(--muted)] cursor-pointer hover:bg-[var(--background)]">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border)] pb-4 gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-[var(--border)] rounded-full text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Back to Collections"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <h2 className="text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
            {bookTitle || "Ledger Entries"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 font-inter">
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
      </div>

      <div className="relative">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-4 text-left text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">Date</th>
              <th className="py-4 text-left text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">Category</th>
              <th className="py-4 text-right text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">Amount ({displayCurrency})</th>
              <th className="py-4 text-right text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest px-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]/30">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[var(--muted)] text-sm italic font-inter">No entries recorded.</td>
              </tr>
            ) : (
              expenses.map((expense: any, index: number) => {
                const isSelected = drawerData?.id === expense._id;
                const convertedAmount = convertCurrency(expense.amount, expense.currency || "USD", displayCurrency);
                return (
                  <tr key={expense._id} className={`${isSelected ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface)]/50'} font-inter transition-colors duration-200`}>
                    <td className="py-5 text-sm text-[var(--foreground)] opacity-80">{formatDate(expense.date)}</td>
                    <td className="py-5">
                      <span className="text-[11px] font-bold text-[var(--foreground)] bg-[var(--border)]/50 px-2.5 py-1 rounded-full tracking-wide">{expense.category}</span>
                    </td>
                    <td className="py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-playfair font-bold text-[var(--foreground)] text-lg">
                          {formatCurrency(convertedAmount, displayCurrency)}
                        </span>
                        {expense.currency !== displayCurrency && (
                          <span className="text-[10px] font-medium text-[var(--muted)]">
                             orig. {formatCurrency(expense.amount, expense.currency)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-5 text-right relative px-2">
                       <button 
                        onClick={() => setActiveMenu(activeMenu === expense._id ? null : expense._id)}
                        className={`p-1.5 rounded cursor-pointer ${activeMenu === expense._id ? 'text-[var(--foreground)] bg-[var(--border)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                       >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>

                      {activeMenu === expense._id && (
                        <div 
                          ref={menuRef} 
                          className={`absolute right-0 ${index >= expenses.length - 1 && expenses.length >= 2 ? 'bottom-16 origin-bottom-right' : 'top-16 origin-top-right'} w-48 bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-lg z-[999] text-left animate-in fade-in zoom-in-95 duration-200 transition-all`}
                        >
                          <button onClick={() => openDrawer(expense._id, "view")} className="w-full px-4 py-2 text-xs font-bold text-[var(--foreground)] opacity-80 hover:bg-[var(--border)] flex items-center gap-2 cursor-pointer">
                            <span>View Details</span>
                          </button>
                          <button onClick={() => openDrawer(expense._id, "edit")} className="w-full px-4 py-2 text-xs font-bold text-[var(--foreground)] opacity-80 hover:bg-[var(--border)] flex items-center gap-2 cursor-pointer">
                            <span>Edit Transaction</span>
                          </button>
                          <div className="h-px bg-[var(--border)] my-1"></div>
                          <button onClick={() => deleteExpense(expense._id)} className="w-full px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer">
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {mounted && drawerContent && createPortal(drawerContent, document.body)}
    </div>
  );
}
