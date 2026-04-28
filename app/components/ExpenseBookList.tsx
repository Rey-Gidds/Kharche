"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ExpenseBookCard from "./ExpenseBookCard";
import { ActionMenuDrawer } from "./ExpenseDrawer";
import useSWR from "swr";
import { supportedCurrencies } from "@/utils/currencyConverter";
import BottomSheet from "./BottomSheet";
import { useProcessing } from "@/context/ProcessingContext";

interface ExpenseBook {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
  currency: string;
}

interface ExpenseBookListProps {
  onSelectBook: (bookId: string, bookTitle: string, bookCurrency: string) => void;
  refreshTrigger?: number;
}

function EditBookModal({
  book,
  onClose,
  onSuccess,
}: {
  book: ExpenseBook;
  onClose: () => void;
  onSuccess: (updated: ExpenseBook) => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [description, setDescription] = useState(book.description ?? "");
  const [currency, setCurrency] = useState(book.currency!);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { withProcessing } = useProcessing();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    
    await withProcessing(book._id, async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/expense-books/${book._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), description: description.trim(), currency: currency.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to update"); return; }
        onSuccess(data);
      } catch {
        setError("Something went wrong.");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <BottomSheet isOpen={true} onClose={onClose} title="Edit Collection">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
        )}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Collection Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-medium text-[var(--foreground)]"
            required
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] min-h-[80px] resize-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Default Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-medium text-[var(--foreground)]"
            required
          >
            {supportedCurrencies.map(curr => (
              <option key={curr} value={curr} className="bg-[var(--surface)]">
                {curr}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-sm uppercase tracking-widest rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={onClose} className="px-6 border border-[var(--border)] rounded-lg text-sm text-[var(--muted)] cursor-pointer hover:bg-[var(--background)]">
            Cancel
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load books");
  return data;
};

export default function ExpenseBookList({ onSelectBook, refreshTrigger }: ExpenseBookListProps) {
  const { data: books = [], isLoading: loading, mutate: fetchBooks } = useSWR<ExpenseBook[]>("/api/expense-books", fetcher);
  
  const [mounted, setMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editBook, setEditBook] = useState<ExpenseBook | null>(null);
  const { processingIds, setProcessing, withProcessing } = useProcessing();

  useEffect(() => { setMounted(true); }, []);

  // Re-fetch when refreshTrigger changes
  useEffect(() => { fetchBooks(); }, [fetchBooks, refreshTrigger]);

  const handleDelete = async (bookId: string) => {
    if (!confirm("Delete this collection? All its tickets will also be removed.")) return;
    setActiveMenu(null);
    await withProcessing(bookId, async () => {
      try {
        const res = await fetch(`/api/expense-books/${bookId}`, { method: "DELETE" });
        if (res.ok) {
          fetchBooks();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to delete");
        }
      } catch {
        alert("Something went wrong.");
      }
    });
  };

  const activeBook = books.find((b) => b._id === activeMenu);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[var(--border)] h-[160px] md:h-[220px] rounded-xl opacity-50" />
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-12 md:py-20 border-2 border-dashed border-[var(--border)] rounded-2xl">
        <p className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-[0.3em]">No collections found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {books.map((book) => (
          <ExpenseBookCard 
            key={book._id}
            title={book.title}
            description={book.description}
            currency={book.currency!}
            createdAt={book.createdAt}
            isProcessing={!!processingIds[book._id]}
            onClick={() => {
              if (processingIds[book._id]) return;
              onSelectBook(book._id, book.title, book.currency);
            }}
            onOptionsClick={(e) => {
              e.stopPropagation();
              if (processingIds[book._id]) return;
              setActiveMenu(book._id);
            }}
          />
        ))}
      </div>

      {mounted && activeMenu && activeBook && createPortal(
        <ActionMenuDrawer
          isOpen={true}
          onClose={() => setActiveMenu(null)}
          title={activeBook.title}
          subtitle={activeBook.description || "Collection"}
          onView={() => {
            onSelectBook(activeBook._id, activeBook.title, activeBook.currency);
          }}
          onEdit={() => {
            setEditBook(activeBook);
          }}
          onDelete={() => {
            handleDelete(activeBook._id);
          }}
          canEditDelete={true}
          viewLabel="Open Collection"
          editLabel="Edit Details"
          deleteLabel="Delete Collection"
        />,
        document.body
      )}

      {mounted && editBook && createPortal(
        <EditBookModal
          book={editBook}
          onClose={() => setEditBook(null)}
          onSuccess={(updated) => {
            fetchBooks();
            setEditBook(null);
          }}
        />,
        document.body
      )}
    </>
  );
}
