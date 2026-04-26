"use client";

import Link from "next/link";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface DownloadLinkProps {
  className?: string;
  variant?: "icon" | "button" | "text";
  title?: string;
}

export default function DownloadLink({ className, variant = "icon", title = "Download App" }: DownloadLinkProps) {
  const { isStandalone } = usePWAInstall();

  if (isStandalone) return null;

  if (variant === "icon") {
    return (
      <Link 
        href="/download" 
        className={className || "w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface)] hover:border-[var(--accent)] transition-all group"}
        title={title}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" x2="12" y1="15" y2="3"/>
        </svg>
      </Link>
    );
  }

  if (variant === "button") {
    return (
      <Link
        href="/download"
        className={className || "w-full py-3.5 flex items-center justify-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl font-bold text-sm text-emerald-500 hover:bg-emerald-500/10 transition-colors"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" x2="12" y1="15" y2="3"/>
        </svg>
        Download App
      </Link>
    );
  }

  return (
    <Link href="/download" className={className}>
      {title}
    </Link>
  );
}
