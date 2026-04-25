"use client";

import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { useRouter } from "next/navigation";

interface BottomNavProps {
  viewMode: string;
  setViewMode: (mode: any) => void;
  setSelectedBookId: (id: string | null) => void;
  navItems: { key: string; label: string; icon: React.ReactNode }[];
}

export default function BottomNav({ viewMode, setViewMode, setSelectedBookId, navItems }: BottomNavProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[var(--surface)] border-t border-[var(--border)] z-40 pb-safe">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive = viewMode === item.key || (viewMode === "single-book" && item.key === "books");
          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === "wallet") {
                  router.push("/me?tab=wallet");
                } else {
                  setViewMode(item.key as any);
                  setSelectedBookId(null);
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${
                isActive ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
