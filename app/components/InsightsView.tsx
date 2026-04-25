"use client";

import { useState, useEffect, useMemo } from "react";
import MinimalBarChart from "./MinimalBarChart";
import { useWallet } from "@/context/WalletContext";
import { convertCurrency } from "@/utils/currencyConverter";
import { formatCurrency } from "@/utils/formatCurrency";
import Modal from "./Modal";
import { aggregateExpenses } from "@/utils/aggregateExpenses";

type TimeFrame = "Daily" | "Weekly" | "Monthly";

const PREDEFINED_CATEGORIES = ["Food", "Transport", "Rent", "Entertainment", "Utilities"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function InsightsView() {
  const now = new Date();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Monthly");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { walletCurrency } = useWallet();
  
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const res = await fetch("/api/expenses?category=All&sort=desc&sortBy=date");
        if (res.ok) {
          const data = await res.json();
          setExpenses(data);
        }
      } catch (err) {
        console.error("Failed to fetch expenses for insights", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const years = useMemo(() => {
    // Collect unique years from expenses and current year
    const expenseYears = expenses.map(e => new Date(e.date).getFullYear());
    const startYear = Math.min(...expenseYears, now.getFullYear());
    const yearList = [];
    for (let y = startYear; y <= now.getFullYear(); y++) {
      yearList.push(y);
    }
    return yearList.sort((a, b) => b - a);
  }, [expenses]);

  const aggregatedData = useMemo(() => {
    if (loading) return [];
    return aggregateExpenses(expenses, timeFrame, selectedYear, selectedMonth, walletCurrency);
  }, [expenses, timeFrame, walletCurrency, selectedYear, selectedMonth, loading]);

  const stats = useMemo(() => {
    const total = aggregatedData.reduce((acc, d) => acc + d.total, 0);
    const avg = total / (aggregatedData.length || 1);
    
    // Top category for the filtered data only
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
    // Filter expenses to match the current view
    const filtered = expenses.filter(e => {
        const d = new Date(e.date);
        if (timeFrame === "Monthly") return d.getFullYear() === selectedYear;
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    const csvRows = [
      ["Date", "Category", "Amount", "Currency", "Description"],
      ...filtered.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.category,
        e.amount,
        e.currency,
        e.description || ""
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
            Analyzing {timeFrame} patterns for {timeFrame === "Monthly" ? selectedYear : `${MONTHS[selectedMonth]} ${selectedYear}`}
          </p>
        </div>

        <button 
           onClick={() => setIsDrawerOpen(true)}
           className="hidden md:flex items-center gap-2 px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--foreground)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:rotate-12 transition-transform"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14V8"/><path d="M12 18h.01"/><path d="M16 12 12 8 8 12"/></svg>
          Configure View
        </button>
      </div>

      {/* Summary Cards — horizontal scroll on mobile, 3-col grid on desktop */}
      <div className="flex md:grid md:grid-cols-3 overflow-x-auto snap-x snap-mandatory gap-3 md:gap-6 pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
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
        {/* Pass responsive height directly — no wrapper div that fights the chart's own height style */}
        <MinimalBarChart data={aggregatedData} height={220} />
      </div>

      {/* Utilities */}
      <div className="flex justify-end pt-4 pb-16 md:pb-0">
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-y-0.5 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export entries as CSV
        </button>
      </div>

      {/* Mobile Floating Action Button for Configure */}
      <div className="fixed bottom-20 left-0 w-full px-4 md:hidden z-30 flex justify-center">
        <button 
           onClick={() => setIsDrawerOpen(true)}
           className="flex items-center gap-2 px-6 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] uppercase tracking-widest text-[var(--foreground)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14V8"/><path d="M12 18h.01"/><path d="M16 12 12 8 8 12"/></svg>
          Configure View
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
          <div className="space-y-3">
             <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Timeframe Type</label>
             <div className="grid grid-cols-3 gap-2">
                {(["Daily", "Weekly", "Monthly"] as TimeFrame[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeFrame(tf)}
                    className={`py-3 px-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
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
             onClick={() => setIsDrawerOpen(false)}
             className="w-full py-4 bg-[var(--accent)] text-[var(--background)] rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:opacity-90 shadow-lg mt-4"
          >
             Update Graph
          </button>
        </div>
      </Modal>
    </div>
  );
}
