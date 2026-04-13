"use client";

import { useState, useEffect } from "react";
import ExpenseBookList from "./ExpenseBookList";
import ExpenseList from "./ExpenseList";
import ActionFab from "./ActionFab";
import Modal from "./Modal";
import AddExpenseForm from "./AddExpenseForm";
import AddExpenseBookForm from "./AddExpenseBookForm";
import InsightsView from "./InsightsView";

type ViewMode = "books" | "all-tickets" | "single-book" | "insights";

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("books");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string>("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectBook = async (bookId: string) => {
    try {
      const resp = await fetch(`/api/expense-books/${bookId}`);
      if (resp.ok) {
        const book = await resp.json();
        setSelectedBookTitle(book.title);
        setSelectedBookId(bookId);
        setViewMode("single-book");
      }
    } catch (err) {
      console.error("Error fetching book details", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-12 pb-24">
      {/* Navigation / Secondary Header */}
      <div className="flex items-center gap-6 border-b border-[var(--border)] pb-4 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => {
            setViewMode("books");
            setSelectedBookId(null);
          }}
          className={`pb-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative ${
            viewMode === "books" ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Collections
          {viewMode === "books" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)]" />}
        </button>
        <button 
          onClick={() => {
            setViewMode("all-tickets");
            setSelectedBookId(null);
          }}
          className={`pb-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative ${
            viewMode === "all-tickets" ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Journal
          {viewMode === "all-tickets" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)]" />}
        </button>
        <button 
          onClick={() => {
            setViewMode("insights");
            setSelectedBookId(null);
          }}
          className={`pb-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative ${
            viewMode === "insights" ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Insights
          {viewMode === "insights" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)]" />}
        </button>
      </div>

      {/* Main Content Area */}
      <section className="min-h-[400px]">
        {viewMode === "books" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-playfair font-bold text-[var(--foreground)] tracking-tight">Workspaces</h2>
            <ExpenseBookList 
              onSelectBook={handleSelectBook} 
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {viewMode === "all-tickets" && (
          <ExpenseList refreshTrigger={refreshTrigger} />
        )}

        {viewMode === "insights" && (
          <InsightsView />
        )}

        {viewMode === "single-book" && selectedBookId && (
          <ExpenseList 
            bookId={selectedBookId} 
            bookTitle={selectedBookTitle}
            onBack={() => setViewMode("books")}
            refreshTrigger={refreshTrigger}
          />
        )}
      </section>

      {/* Forms Modals */}
      <Modal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        title="Record Transaction"
      >
        <AddExpenseForm 
          bookId={selectedBookId || undefined} 
          onSuccess={() => {
            setIsExpenseModalOpen(false);
            setRefreshTrigger(prev => prev + 1);
          }} 
        />
      </Modal>

      <Modal 
        isOpen={isBookModalOpen} 
        onClose={() => setIsBookModalOpen(false)} 
        title="New Collection"
      >
        <AddExpenseBookForm 
          onSuccess={() => {
            setIsBookModalOpen(false);
            setRefreshTrigger(prev => prev + 1);
          }} 
        />
      </Modal>

      {/* Floating Action Button */}
      <ActionFab 
        onAddExpense={() => setIsExpenseModalOpen(true)}
        onAddBook={() => setIsBookModalOpen(true)}
        isInsideBook={viewMode === "single-book"}
      />
    </div>
  );
}
