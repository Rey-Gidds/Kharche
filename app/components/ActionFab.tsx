"use client";

import { useState, useEffect, useRef } from "react";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import BottomSheet from "./BottomSheet";
import { createPortal } from "react-dom";

interface ActionFabProps {
  onAddExpense: () => void;
  onAddBook: () => void;
  isInsideBook?: boolean;
  isInsideRoom?: boolean;
}

export default function ActionFab({ onAddExpense, onAddBook, isInsideBook, isInsideRoom }: ActionFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFabClick = () => {
    if (isInsideBook || isInsideRoom) {
      onAddExpense();
    } else {
      if (isMobile) {
        setIsSheetOpen(true);
      } else {
        setIsOpen(!isOpen);
      }
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div 
        className="fixed md:bottom-4 right-4 md:right-8 z-40 flex flex-col items-end gap-4" 
        style={{ bottom: "max(80px, calc(80px + env(safe-area-inset-bottom)))" }}
        ref={menuRef}
      >
        {/* Desktop Upward Menu */}
        {!isInsideBook && !isInsideRoom && !isMobile && (
          <div 
            className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${
              isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
            }`}
          >
            <button
              onClick={() => {
                onAddBook();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--foreground)] px-4 py-2.5 rounded-full shadow-lg border border-[var(--border)] transition-colors group"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider">New Expense Book</span>
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--foreground)] text-[var(--background)] rounded-full group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => {
                onAddExpense();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--foreground)] px-4 py-2.5 rounded-full shadow-lg border border-[var(--border)] transition-colors group"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider">New Expense Ticket</span>
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--accent)] text-[var(--background)] rounded-full group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* Main button */}
        <button
          onClick={handleFabClick}
          className={`w-14 h-14 flex items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
            (isOpen || isSheetOpen) && !isInsideBook && !isInsideRoom ? "bg-[var(--foreground)] text-[var(--background)] rotate-45" : "bg-[var(--accent)] text-[var(--background)]"
          }`}
          title={isInsideBook || isInsideRoom ? "Create Ticket" : "Actions"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* Mobile Bottom Sheet Menu */}
      {isSheetOpen && (
        <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} title="Create New">
          <div className="space-y-4">
            <button
              onClick={() => {
                onAddBook();
                setIsSheetOpen(false);
              }}
              className="w-full flex items-center gap-4 bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--foreground)] px-6 py-4 rounded-2xl shadow-sm border border-[var(--border)] transition-colors"
            >
              <div className="w-12 h-12 flex shrink-0 items-center justify-center bg-[var(--foreground)] text-[var(--background)] rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-playfair font-bold">New Expense Book</span>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-bold">Create a new collection</span>
              </div>
            </button>

            <button
              onClick={() => {
                onAddExpense();
                setIsSheetOpen(false);
              }}
              className="w-full flex items-center gap-4 bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--foreground)] px-6 py-4 rounded-2xl shadow-sm border border-[var(--border)] transition-colors"
            >
              <div className="w-12 h-12 flex shrink-0 items-center justify-center bg-[var(--accent)] text-[var(--background)] rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-playfair font-bold">New Expense Ticket</span>
                <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-bold">Record a new transaction</span>
              </div>
            </button>
          </div>
        </BottomSheet>
      )}
    </>,
    document.body
  );
}
