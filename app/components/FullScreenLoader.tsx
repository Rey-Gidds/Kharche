"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function FullScreenLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("loading-active");
    return () => {
      document.body.classList.remove("loading-active");
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000000] bg-[var(--background)]/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">Loading</p>
      </div>
    </div>,
    document.body
  );
}
