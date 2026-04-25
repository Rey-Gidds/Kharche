"use client";

import { useState, useEffect } from "react";
import ExpenseBookList from "./ExpenseBookList";
import ExpenseList from "./ExpenseList";
import ActionFab from "./ActionFab";
import Modal from "./Modal";
import AddExpenseForm from "./AddExpenseForm";
import AddExpenseBookForm from "./AddExpenseBookForm";
import InsightsView from "./InsightsView";
import BottomNav from "./BottomNav";
import { useSession } from "@/lib/auth-client";
import RoomList from "./rooms/RoomList";

type ViewMode = "books" | "all-tickets" | "single-book" | "insights" | "rooms";

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
);

const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
);

const RoomsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("books");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string>("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { data: session } = useSession();

  const handleSelectBook = (bookId: string, bookTitle: string) => {
    setSelectedBookTitle(bookTitle);
    setSelectedBookId(bookId);
    setViewMode("single-book");
  };

  const navItems = [
    { key: "books", label: "Collections", icon: <BookIcon /> },
    { key: "all-tickets", label: "Journal", icon: <ListIcon /> },
    { key: "insights", label: "Insights", icon: <ChartIcon /> },
    { key: "rooms", label: "Rooms", icon: <RoomsIcon /> },
  ];

  return (
    <div className="max-w-4xl mx-auto mt-0 md:mt-8 space-y-8 md:space-y-12">
      {/* Navigation / Secondary Header (Desktop Only) */}
      <div className="hidden md:flex items-center gap-6 border-b border-[var(--border)] pb-4 overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setViewMode(item.key as ViewMode);
              setSelectedBookId(null);
            }}
            className={`pb-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap cursor-pointer ${
              viewMode === item.key
                ? "text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
            {viewMode === item.key && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <section className="min-h-[400px]">
        {viewMode === "books" && (
          <div className="space-y-6 md:space-y-8">
            <h2 className="hidden md:block text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight">Workspaces</h2>
            <ExpenseBookList
              onSelectBook={handleSelectBook}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {viewMode === "all-tickets" && (
          <ExpenseList refreshTrigger={refreshTrigger} />
        )}

        {viewMode === "insights" && <InsightsView />}

        {viewMode === "single-book" && selectedBookId && (
          <ExpenseList
            bookId={selectedBookId}
            bookTitle={selectedBookTitle}
            onBack={() => setViewMode("books")}
            refreshTrigger={refreshTrigger}
          />
        )}

        {viewMode === "rooms" && (
          session ? (
            <RoomList currentUserId={session.user.id} />
          ) : (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full" />
            </div>
          )
        )}
      </section>

      {/* FAB + Modals — only for non-rooms views */}
      {viewMode !== "rooms" && (
        <>
          <Modal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            title="Record Transaction"
            sheet
          >
            <AddExpenseForm
              bookId={selectedBookId || undefined}
              onSuccess={() => {
                setIsExpenseModalOpen(false);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </Modal>

          <Modal
            isOpen={isBookModalOpen}
            onClose={() => setIsBookModalOpen(false)}
            title="New Collection"
            sheet
          >
            <AddExpenseBookForm
              onSuccess={() => {
                setIsBookModalOpen(false);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </Modal>

          <ActionFab
            onAddExpense={() => setIsExpenseModalOpen(true)}
            onAddBook={() => setIsBookModalOpen(true)}
            isInsideBook={viewMode === "single-book"}
          />
        </>
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav 
        viewMode={viewMode}
        setViewMode={setViewMode}
        setSelectedBookId={setSelectedBookId}
        navItems={navItems}
      />
    </div>
  );
}
