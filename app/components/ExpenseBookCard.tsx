"use client";

interface ExpenseBookCardProps {
  title: string;
  description?: string;
  currency: string;
  createdAt: string;
  isProcessing?: boolean;
  onClick: () => void;
  onOptionsClick: (e: React.MouseEvent) => void;
}

export default function ExpenseBookCard({ title, description, currency, createdAt, isProcessing, onClick, onOptionsClick }: ExpenseBookCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
  
  const formattedTime = new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-6 h-[160px] md:h-[220px] flex flex-col justify-between cursor-pointer hover:border-[var(--accent)] transition-all overflow-hidden ${isProcessing ? 'processing-ticket' : ''}`}
    >
      {/* 3-dots options button */}
      <button
        onClick={onOptionsClick}
        className="absolute top-3 right-3 p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-full transition-colors z-10 opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>

      <div className="space-y-2 md:space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm md:text-lg font-playfair font-bold text-[var(--foreground)] pr-6 line-clamp-1 md:line-clamp-2">
            {title}
          </h3>
        </div>
        
        {description && (
          <p className="text-[10px] md:text-[11px] text-[var(--muted)] line-clamp-2 md:line-clamp-3 leading-relaxed uppercase tracking-wider font-medium">
            {description}
          </p>
        )}
      </div>

    
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold text-[var(--muted)] opacity-60 uppercase tracking-[0.2em]">
          {formattedDate} <span className="hidden md:inline">{formattedTime}</span>
        </p>
        {currency && (
          <span className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--border)]/50 text-[8px] md:text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider mt-1">
            {currency}
          </span>
        )}
      </div> 
      
          
      
      {/* Decorative pulse on hover */}
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-[var(--accent)] transition-all duration-300 group-hover:w-full" />
    </div>
  );
}
