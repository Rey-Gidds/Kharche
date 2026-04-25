import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/dateHelpers";
import { supportedCurrencies } from "@/utils/currencyConverter";
import { useDraggableSheet } from "@/app/hooks/useDraggableSheet";
import { useRouter } from "next/navigation";

interface ExpenseDrawerProps {
  drawerData: { id: string; mode: "view" | "edit" } | null;
  setDrawerData: (data: any) => void;
  editForm: any;
  handleInlineChange: (field: string, value: any) => void;
  handleUpdateSubmit: () => void;
  estimatedBalance: number;
  isBelow: boolean;
  threshold: number;
  walletCurrency: string;
  originalExpense: any;
}

interface ActionMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEditDelete: boolean;
  title?: string;
  subtitle?: string;
  amount?: string;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
}

export function ActionMenuDrawer({
  isOpen,
  onClose,
  onView,
  onEdit,
  onDelete,
  canEditDelete,
  title,
  subtitle,
  amount,
  viewLabel = "View Details",
  editLabel = "Edit",
  deleteLabel = "Delete"
}: ActionMenuDrawerProps) {
  const { sheetRef, style, handlers } = useDraggableSheet({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" 
        onClick={onClose}
      />
      <div 
        ref={sheetRef}
        style={style}
        className="relative w-full sm:max-w-sm flex flex-col items-center justify-end sm:justify-center animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-200"
      >
        
        {/* Ticket Summary Card positioned above the drawer options */}
        {(title || amount) && (
          <div className="w-[calc(100%-2rem)] sm:w-full bg-[var(--surface)] shadow-xl p-4 rounded-2xl border border-[var(--border)] mb-4 shrink-0 mx-auto">
            <div className="flex justify-between items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-[var(--foreground)] truncate">{title}</p>
                {subtitle && <p className="text-[11px] text-[var(--muted)] mt-1 truncate">{subtitle}</p>}
              </div>
              {amount && (
                <div className="shrink-0 text-right">
                  <p className="font-playfair font-bold text-[var(--foreground)] text-lg">{amount}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Menu */}
        <div className="w-full bg-[var(--surface)] shadow-2xl p-6 flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] shrink-0">
          <div 
            className="w-full -mt-2 mb-4 pt-2 pb-2 drag-handle-area touch-none cursor-grab active:cursor-grabbing sm:hidden"
            {...handlers}
          >
            <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto pointer-events-none" />
          </div>
          
          <div className="space-y-2">
          <button 
            onClick={() => { onView(); onClose(); }}
            className="w-full text-left px-4 py-3 rounded-lg font-bold text-[var(--foreground)] hover:bg-[var(--background)] transition-colors flex items-center gap-3 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            {viewLabel}
          </button>
          
          {canEditDelete && (
            <>
              <button 
                onClick={() => { onEdit(); onClose(); }}
                className="w-full text-left px-4 py-3 rounded-lg font-bold text-[var(--foreground)] hover:bg-[var(--background)] transition-colors flex items-center gap-3 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                {editLabel}
              </button>
              
              <button 
                onClick={() => { onDelete(); onClose(); }}
                className="w-full text-left px-4 py-3 rounded-lg font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-3 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                {deleteLabel}
              </button>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseDrawer({
  drawerData,
  setDrawerData,
  editForm,
  handleInlineChange,
  handleUpdateSubmit,
  estimatedBalance,
  isBelow,
  threshold,
  walletCurrency,
  originalExpense
}: ExpenseDrawerProps) {
  const router = useRouter();
  const { sheetRef, style, handlers } = useDraggableSheet({ 
    isOpen: !!drawerData, 
    onClose: () => setDrawerData(null) 
  });

  if (!drawerData) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center sm:p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer transition-opacity" 
        onClick={() => setDrawerData(null)}
      />
      <div 
        ref={sheetRef}
        style={style}
        className="relative w-full sm:max-w-lg bg-[var(--surface)] shadow-2xl p-6 sm:p-8 flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-[var(--border)] overflow-y-auto max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-200"
      >
        
        {/* Mobile Pull Handle */}
        <div 
          className="w-full -mt-2 mb-4 pt-2 pb-2 drag-handle-area touch-none cursor-grab active:cursor-grabbing sm:hidden shrink-0"
          {...handlers}
        >
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto pointer-events-none" />
        </div>

        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h3 className="text-xl font-playfair font-bold text-[var(--foreground)] leading-tight">
            {drawerData.mode === "view" ? "Transaction Details" : "Update Transaction"}
          </h3>
          <button onClick={() => setDrawerData(null)} className="p-2 -mr-2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer bg-[var(--background)] sm:bg-transparent rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {drawerData.mode === "view" ? (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Amount</p>
              <p className="text-2xl font-playfair font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
                {formatCurrency(editForm?.amount, editForm?.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Date & Category</p>
              <p className="text-[var(--foreground)] font-medium">{formatDate(editForm?.date)} • {editForm?.category}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Description</p>
              <p className="text-[var(--foreground)] opacity-70 italic leading-relaxed bg-[var(--background)] p-4 rounded-lg">
                {editForm?.description || "No notes provided."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 flex-grow">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Amount</label>
                <input 
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={editForm?.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const decimalParts = val.split('.');
                    if (decimalParts.length > 1 && decimalParts[1].length > 3) return;
                    handleInlineChange("amount", Number(val));
                  }}
                  className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 font-bold text-lg text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Currency</label>
                <select 
                  value={editForm?.currency}
                  onChange={(e) => handleInlineChange("currency", e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 font-bold text-[var(--foreground)] cursor-pointer"
                >
                  {supportedCurrencies.map(curr => <option key={curr} value={curr} className="bg-[var(--surface)]">{curr}</option>)}
                </select>
              </div>
            </div>

            {/* Sleek Est Balance Lookup */}
            {drawerData.mode === "edit" && editForm && originalExpense && (
              <div className={`text-[10px] font-bold uppercase tracking-tight mt-[-16px] transition-colors ${isBelow ? 'text-rose-500' : 'text-emerald-500'}`}>
                Est. Balance after: {Math.max(0, estimatedBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} {walletCurrency}
                {isBelow && ` (Below ${threshold.toLocaleString(undefined, { maximumFractionDigits: 2 })} threshold)`}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Category</label>
              <input 
                type="text"
                value={editForm?.category}
                onChange={(e) => handleInlineChange("category", e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 text-[var(--foreground)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Date</label>
              <input 
                type="date"
                value={editForm?.date?.split('T')[0]}
                onChange={(e) => handleInlineChange("date", e.target.value)}
                className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none py-2 text-[var(--foreground)] cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--muted)] uppercase">Description</label>
              <textarea 
                value={editForm?.description}
                onChange={(e) => handleInlineChange("description", e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm min-h-[100px] outline-none focus:border-[var(--accent)] text-[var(--foreground)]"
              />
            </div>
            <div className="pt-4 flex gap-3">
              {isBelow ? (
                <button 
                  onClick={() => router.push('/me?tab=wallet')}
                  className="flex-1 bg-rose-500 text-white rounded py-3 font-bold text-sm cursor-pointer hover:opacity-90 shadow-sm"
                >
                  Add Money to Wallet
                </button>
              ) : (
                <button 
                  onClick={handleUpdateSubmit} 
                  className="flex-1 bg-[var(--accent)] text-[var(--background)] rounded py-3 font-bold text-sm cursor-pointer hover:opacity-90"
                >
                  Save Changes
                </button>
              )}
              <button onClick={() => setDrawerData(null)} className="px-6 border border-[var(--border)] rounded text-sm text-[var(--muted)] cursor-pointer hover:bg-[var(--background)]">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
