"use client";

import { useState, useEffect } from "react";
import LandingHeader from "./LandingHeader";
import HeroSection from "./HeroSection";
import InteractiveJournalMock from "./InteractiveJournalMock";
import InteractiveInsightsMock from "./InteractiveInsightsMock";
import InteractiveBooksMock from "./InteractiveBooksMock";
import InteractiveRoomsMock from "./InteractiveRoomsMock";
import InteractiveEncryptionMock from "./InteractiveEncryptionMock";
import FeatureArchitectureGrid from "./FeatureArchitectureGrid";
import LandingFooter from "./LandingFooter";
import { fetchExchangeRates } from "@/utils/currencyConverter";

export default function LandingView() {
  const [baseCurrency, setBaseCurrency] = useState<string>("INR");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoaded, setRatesLoaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"journal" | "insights" | "collections" | "rooms" | "security">("journal");

  const currencies = ["USD", "INR", "EUR", "GBP", "JPY"];

  useEffect(() => {
    // Fetch rates using client coalescing function (backed by server 24h cache)
    fetchExchangeRates()
      .then((data) => {
        setRates(data);
        setRatesLoaded(true);
      })
      .catch((err) => {
        console.warn("Rates failed to fetch on landing preview:", err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter selection:bg-[var(--foreground)] selection:text-[var(--background)]">
      <LandingHeader />

      <main>
        <HeroSection />

        {/* Interactive In-App Mock Component Showcase */}
        <section id="mock-preview" className="py-12 md:py-20 border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[var(--muted)]">
                Live App Preview
              </span>
              <h2 className="text-2xl sm:text-4xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
                Experience the Kharche interface.
              </h2>
              <p className="text-xs sm:text-sm text-[var(--muted)]">
                Switch components and change currencies live to preview how transactions and settlements feel.
              </p>
            </div>

            {/* Currency Selector Clubbed with Component Tabs */}
            <div className="flex flex-col items-center gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-sm max-w-4xl mx-auto">
              {/* Currency Selector Row */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--muted)]">
                    Display Currency:
                  </span>
                </div>
                <div className="inline-flex p-1 bg-[var(--background)] border border-[var(--border)] rounded-xl gap-1">
                  {currencies.map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setBaseCurrency(curr)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        baseCurrency === curr
                          ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Rates w.r.t US Dollar (Responsive on Mobile & Desktop) */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">
                    Live Market Rates (1 USD =)
                  </span>
                  <span className="text-[9px] text-[var(--muted)]">
                    {ratesLoaded ? "Updated today" : "Connecting..."}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                    <span className="text-[var(--muted)] font-medium">INR (₹)</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {rates?.INR ? `₹${rates.INR.toFixed(2)}` : "₹83.50"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                    <span className="text-[var(--muted)] font-medium">EUR (€)</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {rates?.EUR ? `€${rates.EUR.toFixed(4)}` : "€0.9200"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                    <span className="text-[var(--muted)] font-medium">GBP (£)</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {rates?.GBP ? `£${rates.GBP.toFixed(4)}` : "£0.7850"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between">
                    <span className="text-[var(--muted)] font-medium">JPY (¥)</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {rates?.JPY ? `¥${rates.JPY.toFixed(1)}` : "¥152.0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature View Switcher Tabs (Responsive for mobile screens) */}
              <div className="w-full pt-1">
                <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-1.5 p-1 bg-[var(--background)] border border-[var(--border)] rounded-xl">
                  {[
                    { key: "journal" as const, label: "Journal", id: "journal" },
                    { key: "insights" as const, label: "Insights", id: "insights" },
                    { key: "collections" as const, label: "Ledgers", id: "collections" },
                    { key: "rooms" as const, label: "Rooms", id: "rooms" },
                    { key: "security" as const, label: "Security", id: "security" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold tracking-wide transition-all cursor-pointer text-center truncate ${
                        activeTab === tab.key
                          ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Live Component Viewport */}
            <div className="pt-2">
              {activeTab === "journal" && (
                <div id="journal">
                  <InteractiveJournalMock baseCurrency={baseCurrency} />
                </div>
              )}
              {activeTab === "insights" && (
                <div id="insights">
                  <InteractiveInsightsMock baseCurrency={baseCurrency} />
                </div>
              )}
              {activeTab === "collections" && (
                <div id="collections">
                  <InteractiveBooksMock />
                </div>
              )}
              {activeTab === "rooms" && (
                <div id="rooms">
                  <InteractiveRoomsMock />
                </div>
              )}
              {activeTab === "security" && (
                <div id="security">
                  <InteractiveEncryptionMock />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <FeatureArchitectureGrid />

        {/* Call To Action Banner */}
        <section className="py-20 md:py-28 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
              Take complete mastery over your global currency flow.
            </h2>
            <p className="text-sm sm:text-base text-[var(--muted)] max-w-xl mx-auto">
              No ads, no tracking cookies, and no corporate database reading your financial history.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/sign-up"
                className="px-8 py-3.5 rounded-full bg-[var(--foreground)] text-[var(--background)] font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
              >
                Get Started Free
              </a>
              <a
                href="/sign-in"
                className="px-8 py-3.5 rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-medium text-sm hover:border-[var(--muted)] transition-colors"
              >
                Sign In to Existing Account
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
