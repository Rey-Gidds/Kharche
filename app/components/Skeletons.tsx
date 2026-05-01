"use client";

import React from "react";

/* ─── tiny helper ─── */
const Bone = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton-box ${className}`} />
);

/* ════════════════════════════════════════════
   Room ticket row  (matches RoomTickets.tsx)
   ════════════════════════════════════════════ */
export function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-transparent">
      {/* circle icon */}
      <Bone className="w-10 h-10 rounded-full shrink-0" />

      {/* text block */}
      <div className="flex-1 space-y-2 pt-0.5">
        <Bone className="h-2 w-20 rounded-full" />
        <Bone className="h-3.5 w-44 rounded-full" />
      </div>

      {/* amount column */}
      <div className="text-right shrink-0 space-y-1.5 pt-0.5">
        <Bone className="h-4 w-20 rounded-full ml-auto" />
        <Bone className="h-3 w-14 rounded-full ml-auto opacity-60" />
      </div>

      {/* 3-dot button */}
      <Bone className="w-7 h-7 rounded-md shrink-0 opacity-40" />
    </div>
  );
}

/* ════════════════════════════════════════════
   Expense book card  (matches ExpenseBookCard)
   160px mobile / 220px desktop
   ════════════════════════════════════════════ */
export function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-6 h-[160px] md:h-[220px] flex flex-col justify-between">
      {/* top: title + description */}
      <div className="space-y-2 md:space-y-3">
        <Bone className="h-4 w-3/4 rounded-full" />
        <Bone className="h-3 w-full rounded-full opacity-60" />
      </div>

      {/* bottom: date + currency badge */}
      <div className="flex items-center justify-between">
        <Bone className="h-2.5 w-20 rounded-full opacity-50" />
        <Bone className="h-4 w-10 rounded-md" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Journal expense row – desktop table
   (matches ExpenseTableRow desktop layout)
   ════════════════════════════════════════════ */
export function SkeletonExpenseRow() {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 py-4 px-6 border-b border-[var(--border)]/50 items-center">
      {/* Date */}
      <Bone className="h-3.5 w-24 rounded-full" />
      {/* Category pill */}
      <div>
        <Bone className="h-6 w-20 rounded-full" />
      </div>
      {/* Amount */}
      <div className="flex flex-col items-end gap-1">
        <Bone className="h-5 w-24 rounded-full" />
        <Bone className="h-2.5 w-16 rounded-full opacity-50" />
      </div>
      {/* 3-dot */}
      <Bone className="h-7 w-7 rounded-md opacity-40 ml-auto" />
    </div>
  );
}

/* ════════════════════════════════════════════
   Journal expense row – mobile card
   (matches ExpenseTableRow mobile layout)
   ════════════════════════════════════════════ */
export function SkeletonExpenseRowMobile() {
  return (
    <div className="flex flex-col gap-2.5 p-4 border-b border-[var(--border)]/50">
      {/* top: category + amount */}
      <div className="flex items-center justify-between">
        <Bone className="h-6 w-20 rounded-full" />
        <Bone className="h-5 w-24 rounded-full" />
      </div>
      {/* bottom: date + 3-dot */}
      <div className="flex items-center justify-between">
        <Bone className="h-3 w-20 rounded-full opacity-60" />
        <Bone className="h-6 w-6 rounded-md opacity-30" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Room card skeleton  (matches RoomCard)
   ════════════════════════════════════════════ */
export function SkeletonRoomCard() {
  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
      {/* top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Bone className="h-4 w-36 rounded-full" />
          </div>
        </div>
        {/* balance side */}
        <div className="space-y-1.5 text-right">
          <Bone className="h-4 w-20 rounded-full ml-auto" />
        </div>
      </div>

      {/* avatar row */}
      <div className="mt-4 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="w-6 h-6 rounded-full" />
        ))}
      </div>
    </div>
  );
}
