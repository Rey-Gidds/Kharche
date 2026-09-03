"use client";

import { useState } from "react";
import MinimalBarChart from "@/app/components/MinimalBarChart";
import { formatCurrency } from "@/utils/formatCurrency";
import { convertCurrency } from "@/utils/currencyConverter";

interface InteractiveInsightsMockProps {
  baseCurrency: string;
}

export default function InteractiveInsightsMock({
  baseCurrency,
}: InteractiveInsightsMockProps) {
  const [timeframe, setTimeframe] = useState<"Weekly" | "Monthly">("Weekly");

  // Raw amounts in USD base
  const weeklyRawData = [
    {
      label: "Mon",
      usdTotal: 45,
      breakdown: [
        { category: "Food", usdAmount: 30 },
        { category: "Transport", usdAmount: 15 },
      ],
    },
    {
      label: "Tue",
      usdTotal: 95,
      breakdown: [
        { category: "Utilities", usdAmount: 70 },
        { category: "Food", usdAmount: 25 },
      ],
    },
    {
      label: "Wed",
      usdTotal: 30,
      breakdown: [{ category: "Food", usdAmount: 30 }],
    },
    {
      label: "Thu",
      usdTotal: 120,
      breakdown: [
        { category: "Entertainment", usdAmount: 85 },
        { category: "Food", usdAmount: 35 },
      ],
    },
    {
      label: "Fri",
      usdTotal: 160,
      breakdown: [
        { category: "Rent", usdAmount: 110 },
        { category: "Others", usdAmount: 50 },
      ],
    },
    {
      label: "Sat",
      usdTotal: 80,
      breakdown: [
        { category: "Food", usdAmount: 50 },
        { category: "Entertainment", usdAmount: 30 },
      ],
    },
    {
      label: "Sun",
      usdTotal: 55,
      breakdown: [
        { category: "Food", usdAmount: 35 },
        { category: "Transport", usdAmount: 20 },
      ],
    },
  ];

  const monthlyRawData = [
    {
      label: "May",
      usdTotal: 620,
      breakdown: [
        { category: "Rent", usdAmount: 400 },
        { category: "Food", usdAmount: 150 },
        { category: "Utilities", usdAmount: 70 },
      ],
    },
    {
      label: "Jun",
      usdTotal: 840,
      breakdown: [
        { category: "Rent", usdAmount: 400 },
        { category: "Food", usdAmount: 220 },
        { category: "Entertainment", usdAmount: 140 },
        { category: "Utilities", usdAmount: 80 },
      ],
    },
    {
      label: "Jul",
      usdTotal: 710,
      breakdown: [
        { category: "Rent", usdAmount: 400 },
        { category: "Food", usdAmount: 190 },
        { category: "Transport", usdAmount: 120 },
      ],
    },
    {
      label: "Aug",
      usdTotal: 960,
      breakdown: [
        { category: "Rent", usdAmount: 400 },
        { category: "Food", usdAmount: 260 },
        { category: "Entertainment", usdAmount: 190 },
        { category: "Utilities", usdAmount: 110 },
      ],
    },
    {
      label: "Sep",
      usdTotal: 585,
      breakdown: [
        { category: "Rent", usdAmount: 400 },
        { category: "Food", usdAmount: 185 },
      ],
    },
  ];

  const activeRaw = timeframe === "Weekly" ? weeklyRawData : monthlyRawData;

  const chartData = activeRaw.map((d) => {
    const total = convertCurrency(d.usdTotal, "USD", baseCurrency) ?? d.usdTotal;
    const breakdown = d.breakdown.map((b) => ({
      category: b.category,
      amount: convertCurrency(b.usdAmount, "USD", baseCurrency) ?? b.usdAmount,
    }));
    return {
      label: d.label,
      total,
      breakdown,
    };
  });

  const aggregateTotal = chartData.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-playfair font-bold text-base sm:text-lg text-[var(--foreground)]">
              Category Breakdown
            </h3>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
              Chart
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">
            Hover or tap any bar to view category distributions
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-[var(--background)] border border-[var(--border)] p-1 rounded-xl self-start sm:self-auto">
          {(["Weekly", "Monthly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframe === t
                  ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary metric */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
        <span className="text-2xl sm:text-4xl font-playfair font-bold text-[var(--foreground)]">
          {formatCurrency(aggregateTotal, baseCurrency)}
        </span>
        <span className="text-[10px] sm:text-xs text-[var(--muted)] uppercase font-semibold tracking-wider">
          Total {timeframe.toLowerCase()} outlay in {baseCurrency}
        </span>
      </div>

      {/* Embedded App Chart */}
      <div className="pt-2 pb-2">
        <MinimalBarChart data={chartData} height={220} />
      </div>
    </div>
  );
}
