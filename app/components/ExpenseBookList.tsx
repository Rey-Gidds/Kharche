"use client";

import { useEffect, useState } from "react";
import ExpenseBookCard from "./ExpenseBookCard";

interface ExpenseBook {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
}

interface ExpenseBookListProps {
  onSelectBook: (bookId: string) => void;
  refreshTrigger?: number;
}

export default function ExpenseBookList({ onSelectBook, refreshTrigger }: ExpenseBookListProps) {
  const [books, setBooks] = useState<ExpenseBook[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--surface)] h-[220px] rounded-xl" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map((book) => (
        <ExpenseBookCard 
          key={book._id}
          title={book.title}
          description={book.description}
          createdAt={book.createdAt}
          onClick={() => onSelectBook(book._id)}
        />
      ))}
    </div>
  );
}
