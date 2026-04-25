"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ExpenseBookCard from "./ExpenseBookCard";
import { ActionMenuDrawer } from "./ExpenseDrawer";

interface ExpenseBook {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
}

interface ExpenseBookListProps {
  onSelectBook: (bookId: string, bookTitle: string) => void;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/expense-books/${book._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to update"); setLoading(false); return; }
      onSuccess(data);
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md cursor-pointer" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[var(--surface)] shadow-2xl p-6 sm:p-8 flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-200">
        <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-6 sm:hidden" />

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-playfair font-bold text-[var(--foreground)]">Edit Collection</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer bg-[var(--background)] sm:bg-transparent rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

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
          <div className="flex gap-3 pt-2">
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
      </div>
    </div>
  );
}

export default function ExpenseBookList({ onSelectBook, refreshTrigger }: ExpenseBookListProps) {
  const [books, setBooks] = useState<ExpenseBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editBook, setEditBook] = useState<ExpenseBook | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch("/api/expense-books");
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error("Failed to fetch books", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [refreshTrigger]);

  const handleDelete = async (bookId: string) => {
    if (!confirm("Delete this collection? All its tickets will also be removed.")) return;
    try {
      const res = await fetch(`/api/expense-books/${bookId}`, { method: "DELETE" });
      if (res.ok) {
        setBooks((prev) => prev.filter((b) => b._id !== bookId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Something went wrong.");
    }
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
      <div className="text-center py-20 border-2 border-dashed border-[var(--border)] rounded-2xl">
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
            createdAt={book.createdAt}
            onClick={() => onSelectBook(book._id, book.title)}
            onOptionsClick={(e) => {
              e.stopPropagation();
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
            onSelectBook(activeBook._id, activeBook.title);
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
            setBooks((prev) => prev.map((b) => b._id === updated._id ? updated : b));
            setEditBook(null);
          }}
        />,
        document.body
      )}
    </>
  );
}
