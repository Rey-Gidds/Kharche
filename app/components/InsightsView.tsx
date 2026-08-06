"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import MinimalBarChart from "./MinimalBarChart";
import { useWallet } from "@/context/WalletContext";
import { formatCurrency } from "@/utils/formatCurrency";
import Modal from "./Modal";
import { aggregateExpenses } from "@/utils/aggregateExpenses";
import { decryptExpenseBookPayload } from "@/crypto/services/payloadEncryption.service";
import { getMasterKey } from "@/crypto/indexeddb/cacheManager";

type TimeFrame = "Daily" | "Weekly" | "Monthly";
type DataSource = "overall" | "book";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InsightsView() {
  const now = new Date();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Monthly");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("overall");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const { walletCurrency } = useWallet();

  // Fetch books once via SWR (cached across tab switches)
  const { data: booksRaw } = useSWR("/api/expense-books?limit=100", fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const [books, setBooks] = useState<{ _id: string; title: string }[]>([]);

  useEffect(() => {
    if (!booksRaw) return;
    const list = booksRaw.data ?? (Array.isArray(booksRaw) ? booksRaw : []);
    (async () => {
      const mk = getMasterKey();
      const decrypted = await Promise.all(
        list.map(async (book: any) => {
          if (!mk || !book.encryptedTitle) {
            return { _id: book._id, title: book.title || "Untitled" };
          }
          try {
            const d = await decryptExpenseBookPayload(book, mk);
            return { _id: book._id, title: d.title };
          } catch {
            return { _id: book._id, title: book.title || "Locked Collection" };
          }
        })
      );
      setBooks(decrypted);
      if (decrypted.length > 0 && !selectedBookId) {
        setSelectedBookId(decrypted[0]._id);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booksRaw]);

  // Build SWR key for expenses — changes when filters change
  const expensesKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("category", "All");
    params.set("sort", "desc");
    params.set("sortBy", "date");
    params.set("limit", "500");
    if (dataSource === "book" && selectedBookId) {
      params.set("bookId", selectedBookId);
    }
    if (timeFrame === "Monthly") {
      params.set("dateFilterType", "year");
      params.set("dateFilterValue", String(selectedYear));
    } else {
      params.set("dateFilterType", "month");
      params.set("dateFilterValue", `${selectedYear}-${selectedMonth + 1}`);
    }
    return `/api/expenses?${params.toString()}`;
  }, [dataSource, selectedBookId, timeFrame, selectedYear, selectedMonth]);

  const { data: expensesRes, isValidating } = useSWR(expensesKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const expenses = useMemo(() => {
    if (!expensesRes) return [];
    return Array.isArray(expensesRes) ? expensesRes : (expensesRes?.data ?? []);
  }, [expensesRes]);

  const loading = !expensesRes && isValidating;

  const handleUpdateGraph = () => {
    setIsDrawerOpen(false);
  };

  const years = useMemo(() => {
    const expenseYears = (expenses || []).map((e: any) => new Date(e.date).getFullYear());
    const startYear = expenseYears.length > 0 ? Math.min(...expenseYears, now.getFullYear()) : now.getFullYear();
    const yearList = [];
    for (let y = startYear; y <= now.getFullYear(); y++) {
      yearList.push(y);
    }
    return yearList.sort((a, b) => b - a);
  }, [expenses]);

  const aggregatedData = useMemo(() => {
    if (loading || expenses.length === 0) return [];
    return aggregateExpenses(expenses, timeFrame, selectedYear, selectedMonth, walletCurrency);
  }, [expenses, timeFrame, walletCurrency, selectedYear, selectedMonth, loading]);

  const stats = useMemo(() => {
    const total = aggregatedData.reduce((acc, d) => acc + d.total, 0);
    const avg = total / (aggregatedData.length || 1);

    const catTotals: Record<string, number> = {};
    aggregatedData.forEach(d => {
      d.breakdown.forEach((b: any) => {
        catTotals[b.category] = (catTotals[b.category] || 0) + b.amount;
      });
    });

    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    return { total, avg, topCat };
  }, [aggregatedData]);

  const handleExport = () => {
    const filtered = expenses.filter((e: any) => {
      const d = new Date(e.date);
      if (timeFrame === "Monthly") return d.getFullYear() === selectedYear;
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    const csvRows = [
      ["Date", "Category", "Amount", "Currency", "Description"],
      ...filtered.map((e: any) => [
        new Date(e.date).toLocaleDateString(),
        e.category,
        e.amount,
        e.currency ?? "",
        e.description ?? ""
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_${timeFrame}_${selectedYear}_${selectedMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dataSourceLabel = dataSource === "overall" ? "Overall" : "Expense Book";

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--border)] pb-6">
        <div>
          <h2 className="text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight">Financial Insights</h2>
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mt-1">
             {dataSourceLabel} · {timeFrame === "Monthly" ? selectedYear : `${MONTHS[selectedMonth]} ${selectedYear}`} · {timeFrame} patterns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleUpdateGraph()}
            className="hidden md:flex items-center justify-center p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer group shadow-sm active:scale-95"
            title="Refresh Insights"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              className={`${isValidating ? "animate-spin text-[var(--accent)]" : "group-hover:rotate-180"} transition-all duration-500`}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
          </button>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer group shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-y-0.5 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          
          <button 
             onClick={() => setIsDrawerOpen(true)}
             className="hidden md:flex items-center gap-2 px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--foreground)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm group"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:rotate-12 transition-transform"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14V8"/><path d="M12 18h.01"/><path d="M16 12 12 8 8 12"/></svg>
             Configure View
           </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-col md:flex-row md:grid md:grid-cols-3 overflow-y-scroll snap-y snap-mandatory gap-3 md:gap-6 pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
        <div className="min-w-[70vw] md:min-w-0 snap-center bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] mb-2">Aggregate Spend</p>
          <p className="text-2xl font-playfair font-bold text-[var(--foreground)]">
            {formatCurrency(stats.total, walletCurrency)}
          </p>
        </div>
        <div className="min-w-[70vw] md:min-w-0 snap-center bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] mb-2">Top Sector</p>
          <p className="text-2xl font-playfair font-bold text-[var(--foreground)]">
            {stats.topCat ? stats.topCat[0] : "N/A"}
          </p>
          {stats.topCat && (
            <p className="text-[10px] text-[var(--muted)] font-bold uppercase mt-1">
              {formatCurrency(stats.topCat[1], walletCurrency)} total
            </p>
          )}
        </div>
        <div className="min-w-[70vw] md:min-w-0 snap-center bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl shadow-sm transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] mb-2">Period Average</p>
          <p className="text-2xl font-playfair font-bold text-[var(--foreground)]">
            {formatCurrency(stats.avg, walletCurrency)}
          </p>
        </div>
      </div>

      {/* Graph Area */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-4 md:p-8 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3 mb-6 md:mb-12">
            <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
            <h3 className="text-lg font-playfair font-bold">Expenditure Distribution</h3>
        </div>
        <MinimalBarChart data={aggregatedData} height={220} />
      </div>

      {/* Mobile Floating Action Button for Configure + Refresh */}
      <div className="fixed bottom-20 left-0 w-full px-4 md:hidden z-30 flex justify-center gap-2">
        <button 
           onClick={() => setIsDrawerOpen(true)}
           className="flex items-center gap-2 px-6 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] uppercase tracking-widest text-[var(--foreground)] active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14V8"/><path d="M12 18h.01"/><path d="M16 12 12 8 8 12"/></svg>
          Configure View
        </button>
        <button 
            onClick={() => handleUpdateGraph()}
            className="flex items-center justify-center w-11 h-11 bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-[var(--muted)] active:scale-95 transition-all"
            title="Refresh Insights"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              className={`${isValidating ? "animate-spin text-[var(--accent)]" : ""} transition-all duration-500`}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
          </button>
      </div>

      {/* Configuration Drawer */}
      <Modal 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title="Analysis Configuration"
        sheet
      >
        <div className="space-y-8 py-2">
          {/* Data Source */}
          <div className="space-y-3">
             <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Data Source</label>
              <div className="grid grid-cols-2 gap-2">
                 {(["overall", "book"] as DataSource[]).map((ds) => (
                  <button
                    key={ds}
                    onClick={() => setDataSource(ds)}
                    className={`py-3 px-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                      dataSource === ds 
                      ? "bg-[var(--accent)] text-[var(--background)] border-[var(--accent)]" 
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                    }`}
                  >
                    {ds === "overall" ? "Overall" : "Book"}
                  </button>
                ))}
             </div>
          </div>

          {/* Book selector */}
           {dataSource === "book" && (
             <div className="space-y-3">
               <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Expense Book</label>
               <select 
                 value={selectedBookId}
                 onChange={(e) => setSelectedBookId(e.target.value)}
                 className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
               >
                 {books.map(b => <option key={b._id} value={b._id} className="bg-[var(--surface)]">{b.title}</option>)}
               </select>
             </div>
           )}

          {/* Timeframe */}
          <div className="space-y-3">
             <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Timeframe Type</label>
             <div className="grid grid-cols-3 gap-2">
                 {(["Daily", "Weekly", "Monthly"] as TimeFrame[]).map((tf) => (
                   <button
                     key={tf}
                     onClick={() => setTimeFrame(tf)}
                     className={`w-full py-3 px-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                       timeFrame === tf 
                       ? "bg-[var(--accent)] text-[var(--background)] border-[var(--accent)]" 
                       : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                     }`}
                   >
                     {tf}
                   </button>
                 ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-3">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Selected Year</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                >
                  {years.map(y => <option key={y} value={y} className="bg-[var(--surface)]">{y}</option>)}
                </select>
             </div>
             {(timeFrame === "Daily" || timeFrame === "Weekly") && (
               <div className="space-y-3">
                  <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Selected Month</label>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  >
                    {MONTHS.map((m, idx) => <option key={m} value={idx} className="bg-[var(--surface)]">{m}</option>)}
                  </select>
               </div>
             )}
          </div>

          <button 
             onClick={handleUpdateGraph}
             className="w-full py-4 bg-[var(--accent)] text-[var(--background)] rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:opacity-90 shadow-lg mt-4"
          >
             Update Graph
          </button>
        </div>
      </Modal>
    </div>
  );
}
