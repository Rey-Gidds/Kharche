"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--border)] py-3.5 shadow-sm"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="Kharche Logo"
            className="w-8 h-8 md:w-9 md:h-9 object-contain group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-playfair font-bold text-xl md:text-2xl tracking-tight text-[var(--foreground)]">
              Kharche
            </span>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="px-4 py-2 text-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 text-xs font-semibold rounded-full bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity shadow-sm"
          >
            Start Tracking
          </Link>
        </div>
      </div>
    </header>
  );
}
