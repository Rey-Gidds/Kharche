"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ExpenseContextType {
  expenses: any[];
  setExpenses: (expenses: any[]) => void;
  fetchExpenses: (sortBy?: string, sortOrder?: string, category?: string, bookId?: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  updateExpense: (id: string, data: any) => Promise<boolean>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (sortBy: string = "createdAt", sortOrder: string = "asc", category: string = "All", bookId: string = "") => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/expenses?sortBy=${sortBy}&sort=${sortOrder}&category=${category}`;
      if (bookId) url += `&bookId=${bookId}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.statusText}`);
      }
      const data = await response.json();
      setExpenses(data);
    } catch (err: any) {
      console.error("Failed to fetch expenses:", err);
      setError(err.message || "An unexpected error occurred while fetching your data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateExpense = async (id: string, updatedData: any) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (response.ok) {
        setExpenses((prev) =>
          prev.map((exp) => (exp._id === id ? { ...exp, ...updatedData } : exp))
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update expense:", error);
      return false;
    }
  };

  return (
    <ExpenseContext.Provider value={{ expenses, setExpenses, fetchExpenses, loading, error, setError, updateExpense }}>
      {children}
    </ExpenseContext.Provider>
  );
}

// wrapper hook to use the context
export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error("useExpenses must be used within an ExpenseProvider");
  }
  return context;
}
