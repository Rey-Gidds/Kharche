// Renders a single expense table row with its action menu
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/dateHelpers";
import { ActionMenuDrawer } from "./ExpenseDrawer";
import { createPortal } from "react-dom";

interface ExpenseTableRowProps {
  expense: any;
  index: number;
  totalExpenses: number;
  displayCurrency: string;
  convertedAmount: number;
  isSelected: boolean;
  isProcessing?: boolean;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  openDrawer: (id: string, mode: "view" | "edit") => void;
  deleteExpense: (id: string) => void;
}

export default function ExpenseTableRow({
  expense,
  index,
  totalExpenses,
  displayCurrency,
  convertedAmount,
  isSelected,
  isProcessing,
  activeMenu,
  setActiveMenu,
  openDrawer,
  deleteExpense
}: ExpenseTableRowProps) {


  return (
    <div 
      onClick={() => {
        if (isProcessing) return;
        if(activeMenu == null){
          openDrawer(expense._id, "view");
        }
        else{
          setActiveMenu(null);
        }
      }}
      className={`relative flex flex-col md:grid md:grid-cols-[1fr_1fr_1fr_auto] md:gap-4 md:px-5 md:py-5 md:items-center ${isSelected ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface)]/50'} ${isProcessing ? 'processing-ticket' : ''} font-inter transition-all duration-200 cursor-pointer border-b border-[var(--border)] md:border-none p-4`}
    >
      {/* Mobile Card Layout (visible only <768px) */}
      <div className="flex flex-col gap-2 md:hidden">
        {/* Top row: Category + Amount */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--foreground)] bg-[var(--border)]/50 px-2.5 py-1 rounded-full tracking-wide">
            {expense.category}
          </span>
          <span className="font-playfair font-bold text-[var(--foreground)] text-lg">
            {formatCurrency(convertedAmount, displayCurrency)}
          </span>
        </div>
        {/* Bottom row: Date + Original Currency Note + 3-dots */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">
            {formatDate(expense.date)}
          </span>
          <div className="flex items-center gap-2">
            {expense.currency !== displayCurrency && (
              <span className="text-[10px] font-medium text-[var(--muted)]">
                 orig. {formatCurrency(expense.amount, expense.currency)}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === expense._id ? null : expense._id); }}
              className={`p-1.5 rounded cursor-pointer ${activeMenu === expense._id ? 'text-[var(--foreground)] bg-[var(--border)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout (visible only >=768px) */}
      <div className="hidden md:block text-sm text-[var(--foreground)]">
        {formatDate(expense.date)}
      </div>
      
      <div className="hidden md:block">
        <span className="text-[11px] font-bold text-[var(--foreground)] bg-[var(--border)]/50 px-2.5 py-1 rounded-full tracking-wide">
          {expense.category}
        </span>
      </div>

      <div className="hidden md:flex flex-col items-end text-right">
        <span className="font-playfair font-bold text-[var(--foreground)] text-lg">
          {formatCurrency(convertedAmount, displayCurrency)}
        </span>
        {expense.currency !== displayCurrency && (
          <span className="text-[10px] font-medium text-[var(--muted)]">
             orig. {formatCurrency(expense.amount, expense.currency)}
          </span>
        )}
      </div>

      <div className="hidden md:flex justify-end relative px-2 w-16">
        <button 
          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === expense._id ? null : expense._id); }}
          className={`p-1.5 rounded cursor-pointer ${activeMenu === expense._id ? 'text-[var(--foreground)] bg-[var(--border)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
         >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>

      {/* Action Menu Drawer – renders on both mobile and desktop */}
      {activeMenu === expense._id && typeof document !== 'undefined' && createPortal(
        <ActionMenuDrawer
          isOpen={true}
          onClose={() => setActiveMenu(null)}
          onView={() => openDrawer(expense._id, "view")}
          onEdit={() => openDrawer(expense._id, "edit")}
          onDelete={() => deleteExpense(expense._id)}
          canEditDelete={true}
          title={expense.category}
          subtitle={formatDate(expense.date)}
          amount={formatCurrency(convertedAmount, displayCurrency)}
          viewLabel="View Transaction"
          editLabel="Edit Transaction"
          deleteLabel="Delete Transaction"
        />,
        document.body
      )}
    </div>
  );
}
