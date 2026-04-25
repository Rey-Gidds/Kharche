// Manages drawer state, form state, and interaction handlers for expenses
import { useState } from "react";

export function useExpenseDrawer(
  expenses: any[],
  fetchExpenses: (sortBy: string, sortOrder: string, categoryFilter: string, bookId?: string) => Promise<void>,
  updateExpense: (id: string, updates: any) => Promise<boolean>,
  refetchWallet: (user?: any, silent?: boolean) => Promise<void>,
  session: any,
  sortBy: string,
  sortOrder: string,
  categoryFilter: string,
  bookId?: string
) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<{ id: string; mode: "view" | "edit" } | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const deleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchExpenses(sortBy, sortOrder, categoryFilter, bookId);
        refetchWallet(session?.user);
        if (drawerData?.id === id) setDrawerData(null);
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!drawerData?.id || !editForm) return;
    const success = await updateExpense(drawerData.id, editForm);
    if (success) {
      refetchWallet(session?.user);
      setActiveMenu(null);
      setDrawerData(null);
    }
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
    openDrawer
  };
}
