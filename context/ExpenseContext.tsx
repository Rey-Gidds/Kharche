"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { decryptExpensePayload } from "@/crypto/services/payloadEncryption.service";
import { getMasterKey } from "@/crypto/indexeddb/cacheManager";

interface ExpenseContextType {
  updateExpense: (id: string, data: any) => Promise<any>;
  decryptExpenses: (rawExpenses: any[]) => Promise<any[]>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const decryptExpenses = useCallback(async (rawExpenses: any[]): Promise<any[]> => {
    const mk = getMasterKey();
    if (!mk) {
      // No master key available — user is locked. Sanitize encrypted fields.
      return rawExpenses.map((exp) => {
        if (exp.encryptedDescription) {
          return { ...exp, description: "[Encrypted]" };
        }
        return exp;
      });
    }
    return Promise.all(
      rawExpenses.map(async (exp) => {
        if (!exp.encryptedDescription) return exp;
        try {
          const decrypted = await decryptExpensePayload(exp, mk);
          return { ...exp, description: decrypted.description };
        } catch {
          return { ...exp, description: "[Encrypted]" };
        }
      }),
    );
  }, []);

  const updateExpense = useCallback(async (id: string, updatedData: any) => {
    const response = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update expense");
    }
    return response.json();
  }, []);

  return (
    <ExpenseContext.Provider value={{ updateExpense, decryptExpenses }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error("useExpenses must be used within ExpenseProvider");
  }
  return context;
}
