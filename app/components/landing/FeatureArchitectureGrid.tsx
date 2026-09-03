"use client";

export default function FeatureArchitectureGrid() {
  const features = [
    {
      index: "01",
      title: "Universal Multi-Currency",
      description:
        "Input transactions in USD, EUR, GBP, JPY, or INR. Automatic conversion uses server-cached Frankfurter market rates with zero rate thrashing.",
    },
    {
      index: "02",
      title: "End-to-End Cryptography",
      description:
        "Client-side AES-256-GCM encryption with PBKDF2 salt derivation. Your expenses, categories, and ledger titles remain completely opaque to cloud databases.",
    },
    {
      index: "03",
      title: "Cooperative Shared Rooms",
      description:
        "Split collective meals, trips, or household bills with peers. An integrated debt-simplification matrix eliminates circular balances.",
    },
    {
      index: "04",
      title: "Isolated Workspaces",
      description:
        "Categorize expenses into dedicated collections. Keep business consulting, travel vacations, and personal overhead completely partitioned.",
    },
    {
      index: "05",
      title: "Offline-First PWA",
      description:
        "Engineered as an installable Progressive Web App with background service worker synchronization and mobile-optimized bottom sheet workflows.",
    },
    {
      index: "06",
      title: "Tactile Financial Insights",
      description:
        "Ultra-crisp category proportions, weekly outlays, and monthly aggregations without heavy external charting bloat.",
    },
  ];

  return (
    <section className="py-20 md:py-28 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="max-w-2xl space-y-3">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[var(--muted)]">
            Architectural Foundations
          </span>
          <h2 className="text-3xl sm:text-4xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
            Crafted for restraint, accuracy, and absolute privacy.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat) => (
            <div
              key={feat.index}
              className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--muted)] transition-colors flex flex-col justify-between space-y-4"
            >
              <span className="font-mono text-xs font-bold text-[var(--muted)] tracking-widest">
                {feat.index}
              </span>
              <div className="space-y-2">
                <h3 className="font-playfair font-bold text-lg text-[var(--foreground)]">
                  {feat.title}
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
