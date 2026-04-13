"use client";

import React from "react";

interface BarData {
  label: string;
  total: number;
  breakdown: { category: string; amount: number }[];
}

interface MinimalBarChartProps {
  data: BarData[];
  height?: number;
}

export const categoryColors: Record<string, string> = {
  "Food": "#ef4444", // Soft Red
  "Transport": "#f97316", // Orange
  "Rent": "#eab308", // Yellow
  "Entertainment": "#3b82f6", // Blue
  "Utilities": "#22c55e", // Green
  "Others": "#a855f7", // Purple
};

const getCategoryColor = (cat: string) => {
  if (categoryColors[cat]) return categoryColors[cat];
  return categoryColors["Others"];
};

export default function MinimalBarChart({ data, height = 200 }: MinimalBarChartProps) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="w-full space-y-4 font-inter relative">
      {!hasData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--background)]/20 backdrop-blur-[1px] rounded-xl border border-dashed border-[var(--border)]">
          <div className="text-center group">
            <div className="bg-[var(--surface)] border border-[var(--border)] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)]"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/></svg>
            </div>
            <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-widest">No entries found for this selection</p>
            <p className="text-[9px] text-[var(--muted)] opacity-60 mt-1 uppercase">Try selecting a different period or adding expenses</p>
          </div>
        </div>
      )}

      <div 
        className="relative flex items-end gap-1 px-2 overflow-x-auto no-scrollbar" 
        style={{ height: `${height}px` }}
      >
        {/* Y-Axis Grid Lines */}
        <div className="absolute inset-x-0 top-0 h-full flex flex-col justify-between pointer-events-none opacity-5">
          <div className="border-t border-[var(--foreground)] w-full" />
          <div className="border-t border-[var(--foreground)] w-full" />
          <div className="border-t border-[var(--foreground)] w-full" />
          <div className="border-t border-[var(--foreground)] w-full" />
        </div>

        {data.map((item, idx) => (
          <div key={idx} className="h-full flex flex-col items-center justify-end group relative cursor-pointer" style={{ width: `${100 / data.length}%`, minWidth: '8px', maxWidth: '32px' }}>
            {/* Tooltip - Adjusted position for densly packed bars */}
            <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col bg-[var(--surface)] border border-[var(--border)] p-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] whitespace-nowrap text-[10px] animate-in fade-in zoom-in-95 duration-200">
              <p className="font-bold border-b border-[var(--border)] mb-2 pb-2 text-[var(--foreground)] tracking-wide">{item.label}</p>
              {item.breakdown.length > 0 ? (
                <div className="space-y-1.5">
                  {item.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-8">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(b.category) }} />
                        <span className="text-[var(--muted)] font-bold uppercase tracking-tighter">{b.category}</span>
                      </div>
                      <span className="font-bold text-[var(--foreground)]">{b.amount.toFixed(2)}</span>
                    </div>
                  )) }
                </div>
              ) : (
                <span className="text-[var(--muted)] italic">No entries</span>
              )}
              <div className="mt-2 pt-2 border-t border-[var(--border)] font-black flex justify-between text-[var(--foreground)]">
                <span>TOTAL</span>
                <span>{item.total.toFixed(2)}</span>
              </div>
            </div>

            {/* The Bar */}
            <div 
              className={`w-full relative rounded-t-[2px] overflow-hidden flex flex-col-reverse transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${item.total > 0 ? 'bg-[var(--border)]/20 shadow-sm' : 'bg-transparent'}`} 
              style={{ 
                height: item.total > 0 ? `${Math.max((item.total / maxTotal) * 100, 3)}%` : '0px' 
              }}
            >
              {item.breakdown.map((b, i) => (
                <div 
                  key={i} 
                  className="w-full transition-all duration-300 hover:brightness-150" 
                  style={{ 
                    height: `${(b.amount / item.total) * 100}%`,
                    backgroundColor: getCategoryColor(b.category)
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* X-Axis labels */}
      <div className="flex justify-between px-2 text-[8px] font-black text-[var(--muted)] uppercase tracking-[0.2em] border-t border-[var(--border)]/30 pt-4">
        <span>{data[0]?.label}</span>
        {data.length > 10 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 px-2">
        {Object.entries(categoryColors).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
