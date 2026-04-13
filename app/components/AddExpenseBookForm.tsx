"use client";

import { useState } from "react";
import ErrorMessage from "./ErrorMessage";

interface AddExpenseBookFormProps {
  onSuccess: () => void;
}

export default function AddExpenseBookForm({ onSuccess }: AddExpenseBookFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/expense-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (response.ok) {
        setTitle("");
        setDescription("");
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create expense book");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <ErrorMessage 
          title="Creation Error"
          message={error}
          variant="error"
          compact
        />
      )}

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Book Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Vacation 2024"
          className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-medium text-[var(--foreground)]"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Description (Optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes about this collection..."
          className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--foreground)] min-h-[80px] resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-[var(--accent)] text-[var(--background)] font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-50 mt-4"
      >
        {loading ? "Creating..." : "Create collection"}
      </button>
    </form>
  );
}
