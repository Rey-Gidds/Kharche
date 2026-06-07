"use client";

import { useState } from "react";
import { mutate } from "swr";
import ErrorMessage from "./ErrorMessage";
import { supportedCurrencies } from "@/utils/currencyConverter";
import { useWallet } from "@/context/WalletContext";
import { encryptExpenseBookPayload } from "@/crypto/services/payloadEncryption.service";
import { getMasterKey } from "@/crypto/indexeddb/cacheManager";

interface AddExpenseBookFormProps {
  onSuccess: () => void;
}

export default function AddExpenseBookForm({ onSuccess }: AddExpenseBookFormProps) {
  const { walletCurrency } = useWallet();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState(walletCurrency!);
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
      const masterKey = getMasterKey();
      const { encryptedTitle, encryptedDescription, encryptionVersion } = await encryptExpenseBookPayload(
        { title: title.trim(), description: description.trim() },
        masterKey!,
      );

      const body: Record<string, any> = {
        currency: defaultCurrency,
        encryptedTitle,
        encryptedDescription,
        encryptionVersion,
      };

      const response = await fetch("/api/expense-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setTitle("");
        setDescription("");
        mutate(
          (key) => typeof key === "string" && key.startsWith("/api/expense-books"),
          undefined,
          { revalidate: true },
        );
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
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Default Currency</label>
        <select
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value)}
          className="w-full py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none font-medium text-[var(--foreground)]"
          required
        >
          {
          [...supportedCurrencies].sort((a, b) => {
            if (a === walletCurrency) return -1;
            if (b === walletCurrency) return 1;
            return 0;
          }).map(curr => 
            {
              return walletCurrency === curr ? 
              <option key={curr} value={curr} className="bg-[var(--surface)]">{curr} (Current)</option>
              :
              <option key={curr} value={curr} className="bg-[var(--surface)]">{curr}</option>
            }
          )
        }
        </select>
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
