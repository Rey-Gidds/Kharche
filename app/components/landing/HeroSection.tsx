"use client";

import Link from "next/link";

export default function HeroSection() {

  return (
    <section className="relative pt-32 md:pt-44 pb-16 md:pb-24 border-b border-[var(--border)] overflow-hidden">
      {/* Subtle subtle architectural background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 text-center space-y-8">
        {/* Subtle Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Multi-Currency & Client-Encrypted
        </div>

        {/* Serif Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-playfair font-bold text-[var(--foreground)] tracking-tight max-w-4xl mx-auto leading-[1.1]">
          Financial clarity, <br className="hidden sm:inline" />
          <span className="italic font-normal">measured with discipline.</span>
        </h1>

        {/* Refined subtext */}
        <p className="text-base sm:text-lg text-[var(--muted)] max-w-2xl mx-auto font-inter font-normal leading-relaxed">
          Kharche is an understated, multi-currency ledger with peer-to-peer room settlements, zero-knowledge AES-256 encryption, and offline-first speed. No clutter, no noise.
        </p>

        {/* CTAs */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[var(--foreground)] text-[var(--background)] font-medium text-sm hover:opacity-90 transition-all shadow-sm"
          >
            Create Your Account
          </Link>
          <a
            href="#mock-preview"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-medium text-sm hover:border-[var(--muted)] transition-colors"
          >
            Explore Live Demo ↓
          </a>
        </div>
      </div>
    </section>
  );
}
