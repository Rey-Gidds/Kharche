// Manages drawer state, form state, and interaction handlers for expenses
import { useState } from "react";
import { useProcessing } from "@/context/ProcessingContext";
import { encryptExpensePayload } from "@/crypto/services/payloadEncryption.service";
import { getMasterKey } from "@/crypto/indexeddb/cacheManager";

import { useExpenses } from "@/context/ExpenseContext";

export function useExpenseDrawer(
  expenses: any[],
  mutate: any,
  updateExpense: (id: string, updates: any) => Promise<any>,
  refetchWallet: () => void,
) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<{ id: string; mode: "view" | "edit" } | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const { processingIds, withProcessing } = useProcessing();
  const { decryptExpenses } = useExpenses();

  const deleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    if (drawerData?.id === id) setDrawerData(null);
    setActiveMenu(null);

    await withProcessing(id, async () => {
      try {
        const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to delete expense");
        }

        // Only update cache after server confirms success
        await mutate(
          (currentPages: any[] | undefined) => {
            if (!currentPages) return [];
            return currentPages.map((page) => ({
              ...page,
              data: page.data.filter((item: any) => item._id !== id),
            }));
          },
          {
            revalidate: true,
            populateCache: false,
          }
        );
        refetchWallet();
      } catch (error: any) {
        console.error("Failed to delete expense:", error);
        throw error;
      }
    });
  };

  const handleUpdateSubmit = async () => {
    if (!drawerData?.id || !editForm) return;
    
    const id = drawerData.id;
    setActiveMenu(null);
    setDrawerData(null);
    
    await withProcessing(id, async () => {
      try {
        const masterKey = getMasterKey();
        if (!masterKey) throw new Error("Encryption key not available");

        const { encryptedDescription, encryptionVersion } = await encryptExpensePayload(
          { description: editForm.description ?? "" },
          masterKey,
        );

        let updates: Record<string, any> = {
          amount: editForm.amount,
          currency: editForm.currency,
          category: editForm.category,
          date: editForm.date,
          encryptedDescription,
          encryptionVersion,
        };

        // 1. Do the fetch FIRST
        const rawServerExpense = await updateExpense(id, updates);
        const decryptedList = await decryptExpenses([rawServerExpense]);
        const persistedItem = decryptedList[0];

        // 2. THEN update cache with server-confirmed data
        await mutate(
          (currentData: any) => {
            if (!currentData) return currentData;
            if (Array.isArray(currentData)) {
              return currentData;
            }
            return {
              ...currentData,
              data: currentData.data.map((item: any) => (item._id === id ? persistedItem : item)),
            };
          },
          {
            revalidate: true,
            populateCache: false,
          }
        );
        refetchWallet();
      } catch (error: any) {
        console.error("Failed to update expense:", error);
        throw error;
      }
    });
  };

  const handleInlineChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const openDrawer = (id: string, mode: "view" | "edit") => {
    const expense = expenses.find(e => e._id === id);
    if (expense) {
      setDrawerData({ id, mode });
      setEditForm({ ...expense });
      setActiveMenu(null);
    }
  };

  return {
    activeMenu,
    setActiveMenu,
    drawerData,
    setDrawerData,
    editForm,
    deleteExpense,
    handleUpdateSubmit,
    handleInlineChange,
    openDrawer,
    processingIds
  };
}
