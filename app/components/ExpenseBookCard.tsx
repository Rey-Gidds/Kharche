"use client";

interface ExpenseBookCardProps {
  title: string;
  description?: string;
  createdAt: string;
  onClick: () => void;
}

export default function ExpenseBookCard({ title, description, createdAt, onClick }: ExpenseBookCardProps) {
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
      className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 h-[220px] flex flex-col justify-between cursor-pointer hover:border-[var(--accent)] transition-all overflow-hidden"
    >
      <div className="absolute top-4 right-4 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-playfair font-bold text-[var(--foreground)] pr-6 line-clamp-2">
          {title}
        </h3>
        {description && (
          <p className="text-[11px] text-[var(--muted)] line-clamp-3 leading-relaxed uppercase tracking-wider font-medium">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end">
        <p className="text-[9px] font-bold text-[var(--muted)] opacity-60 uppercase tracking-[0.2em]">
          {formattedDate} {formattedTime}
        </p>
      </div>
      
      {/* Decorative pulse on hover */}
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-[var(--accent)] transition-all duration-300 group-hover:w-full" />
    </div>
  );
}
