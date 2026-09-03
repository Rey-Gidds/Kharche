"use client";

import { useState } from "react";
import ExpenseBookCard from "@/app/components/ExpenseBookCard";

export default function InteractiveBooksMock() {
  const [activeBook, setActiveBook] = useState<string>("book_1");

  const books = [
    {
      _id: "book_1",
      title: "Kyoto & Tokyo Journey",
      description: "Travel allocations, transit passes, ryokan bookings, and culinary explorations.",
      currency: "JPY",
      createdAt: "2026-08-15T10:00:00Z",
      ticketCount: 38,
      totalFormatted: "¥482,000",
    },
    {
      _id: "book_2",
      title: "Design Studio & SaaS",
      description: "Hosting infrastructure, typography licenses, design software, and edge domains.",
      currency: "USD",
      createdAt: "2026-07-20T14:30:00Z",
      ticketCount: 14,
      totalFormatted: "$1,840",
    },
    {
      _id: "book_3",
      title: "Apartment 14B Living",
      description: "Monthly maintenance, fiber broadband, groceries, and common space upkeep.",
      currency: "INR",
      createdAt: "2026-06-01T08:00:00Z",
      ticketCount: 52,
      totalFormatted: "₹84,300",
    },
  ];

  const currentBook = books.find((b) => b._id === activeBook) || books[0];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-playfair font-bold text-base sm:text-lg text-[var(--foreground)]">
              Collections & Ledgers
            </h3>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
              Organized
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[var(--muted)] mt-0.5">
            Organize trips, home expenses, and side-projects into separate books.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {books.map((book) => {
          const isSelected = activeBook === book._id;
          return (
            <div
              key={book._id}
              onClick={() => setActiveBook(book._id)}
              className={`transition-all duration-200 transform ${
                isSelected ? "ring-2 ring-[var(--foreground)] scale-[1.02]" : "opacity-85 hover:opacity-100"
              }`}
            >
              <ExpenseBookCard
                title={book.title}
                description={book.description}
                currency={book.currency}
                createdAt={book.createdAt}
                onClick={() => setActiveBook(book._id)}
                onOptionsClick={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Selected Book Insight Bar */}
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Active Workspace Preview
          </span>
          <p className="font-semibold text-[var(--foreground)]">
            {currentBook.title} ({currentBook.currency})
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] block">
              Tickets
            </span>
            <span className="font-mono font-semibold text-[var(--foreground)]">
              {currentBook.ticketCount} items
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] block">
              Ledger Total
            </span>
            <span className="font-playfair font-bold text-[var(--foreground)] text-sm">
              {currentBook.totalFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
