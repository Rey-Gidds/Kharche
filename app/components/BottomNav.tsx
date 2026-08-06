"use client";

import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { useNavigation, TabKey } from "@/context/NavigationContext";
import { useRouter } from "next/navigation";

interface BottomNavProps {
  navItems: { key: TabKey; label: string; icon: React.ReactNode; href?: string }[];
}

export default function BottomNav({ navItems }: BottomNavProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { activeTab, tabStacks, selectTab } = useNavigation();
  const router = useRouter();

  if (!isMobile) return null;

  const currentPage = tabStacks[activeTab]?.[tabStacks[activeTab].length - 1];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[var(--surface)] border-t border-[var(--border)] z-40 pb-safe">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.key ||
            (item.key === "books" && currentPage?.type === "single-book");
          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                } else {
                  selectTab(item.key);
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
