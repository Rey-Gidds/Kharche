"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import useSWRInfinite from "swr/infinite";
import ExpenseBookCard from "./ExpenseBookCard";
import { ActionMenuDrawer } from "./ExpenseDrawer";
import { supportedCurrencies } from "@/utils/currencyConverter";
import BottomSheet from "./BottomSheet";
import { useProcessing } from "@/context/ProcessingContext";
import { SkeletonCard } from "./Skeletons";
import { encryptExpenseBookPayload, decryptExpenseBookPayload } from "@/crypto/services/payloadEncryption.service";
import { getMasterKey, onMasterKeyReady } from "@/crypto/indexeddb/cacheManager";

interface ExpenseBook {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
  currency: string;
}

interface ExpenseBookListProps {
  onSelectBook: (bookId: string, bookTitle: string, bookCurrency: string) => void;
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
        const masterKey = getMasterKey();
        let body: Record<string, any> = {};

        if (masterKey) {
          const { encryptedTitle, encryptedDescription, encryptionVersion } = await encryptExpenseBookPayload(
            { title: title.trim(), description: description.trim() },
            masterKey,
          );
          body.encryptedTitle = encryptedTitle;
          body.encryptedDescription = encryptedDescription;
          body.encryptionVersion = encryptionVersion;
        } else {
          body.title = title.trim();
          body.description = description.trim();
        }
        body.currency = currency.trim();

        const res = await fetch(`/api/expense-books/${book._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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

const PAGE_SIZE = 20;

export default function ExpenseBookList({ onSelectBook }: ExpenseBookListProps) {
  const [mounted, setMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editBook, setEditBook] = useState<ExpenseBook | null>(null);
  const { processingIds, withProcessing } = useProcessing();

  useEffect(() => { setMounted(true); }, []);

  const decryptBooks = useCallback(async (rawBooks: any[]): Promise<any[]> => {
    const mk = getMasterKey();
    if (!mk) {
      return rawBooks.map((book: any) => ({
        ...book,
        title: book.title || (book.encryptedTitle ? "Locked Collection" : "Untitled Collection"),
        description: book.description || "",
      }));
    }
    return Promise.all(
      rawBooks.map(async (book) => {
        if (!book.encryptedTitle) return book;
        try {
          const decrypted = await decryptExpenseBookPayload(book, mk);
          return { ...book, title: decrypted.title, description: decrypted.description };
        } catch {
          return { ...book, title: book.title || "Locked Collection", description: book.description || "" };
        }
      }),
    );
  }, []);

  // SWR infinite key based on page index
  const getKey = useCallback((pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    return `/api/expense-books?page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
  }, []);

  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to load books");
    const rawData: ExpenseBook[] = Array.isArray(result) ? result : (result.data ?? []);
    const more: boolean = Array.isArray(result) ? false : (result.hasMore ?? false);
    const returnedPage: number = Array.isArray(result) ? 1 : (result.page ?? 1);
    const decrypted = await decryptBooks(rawData);
    return { data: decrypted, hasMore: more, page: returnedPage };
  }, [decryptBooks]);

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    { revalidateOnFocus: false }
  );

  // When encryption unlocks, re-fetch so decryptBooks can use the new master key
  useEffect(() => {
    const unsub = onMasterKeyReady(() => {
      mutate();
    });
    return unsub;
  }, [mutate]);

  // Flatten paginated data
  const books = data ? data.flatMap(page => page.data) : [];
  const loading = isLoading && books.length === 0;
  const loadingMore = isValidating && books.length > 0;
  const hasMore = data ? data[data.length - 1]?.hasMore ?? false : false;

  const handleDelete = async (bookId: string) => {
    if (!confirm("Delete this collection? All its tickets will also be removed.")) return;
    setActiveMenu(null);
    await withProcessing(bookId, async () => {
      try {
        const res = await fetch(`/api/expense-books/${bookId}`, { method: "DELETE" });
        if (res.ok) {
          mutate();
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
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 skeleton-stagger">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
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
        {books.map((book, i) => (
          <div key={book._id} className="card-animate" style={{ animationDelay: `${i * 0.05}s` }}>
            <ExpenseBookCard 
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
          </div>
        ))}
      </div>

      {loadingMore && (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-3 md:mt-6 skeleton-stagger">
          <SkeletonCard />
          <SkeletonCard />
          <div className="hidden lg:block">
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* Load More */}
      {hasMore && !loadingMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setSize(size + 1)}
            className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer px-5 py-2 rounded-lg hover:bg-[var(--border)]/50"
          >
            Load more
          </button>
        </div>
      )}

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
            mutate();
            setEditBook(null);
          }}
        />,
        document.body
      )}
    </>
  );
}
