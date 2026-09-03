"use client";

import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="py-12 md:py-16 bg-[var(--background)] border-t border-[var(--border)] font-inter">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Kharche Logo" className="w-6 h-6 object-contain" />
            <span className="font-playfair font-bold text-lg text-[var(--foreground)]">
              Kharche
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] max-w-sm">
            An elegant, multi-currency ledger designed with zero-knowledge cryptography and tactile financial discipline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--muted)]">
          <Link href="/sign-in" className="hover:text-[var(--foreground)] transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up" className="hover:text-[var(--foreground)] transition-colors">
            Create Account
          </Link>
          <Link href="/download" className="hover:text-[var(--foreground)] transition-colors">
            Install PWA
          </Link>
          <a
            href="https://frankfurter.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            Frankfurter Rates
          </a>
        </div>

        <div className="text-xs text-[var(--muted)] font-mono">
          © {new Date().getFullYear()} Kharche. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
