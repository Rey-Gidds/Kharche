import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";
import Dashboard from "@/app/components/Dashboard";
import WalletBalanceDisplay from "@/app/components/WalletBalanceDisplay";
import AccountSheet from "@/app/components/AccountSheet";
import DownloadLink from "@/app/components/DownloadLink";
import { Suspense } from "react";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-0 pt-4 px-4 md:p-6 md:pt-12 md:px-12 font-inter selection:bg-[var(--border)] selection:text-[var(--foreground)] pb-24 md:pb-12">
      <div className="max-w-4xl mx-auto md:space-y-12">
        <div className="flex items-center justify-between md:border-b border-[var(--border)] pb-4 md:pb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kharche Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
            <div>
              <h1 className="text-2xl md:text-3xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
                Kharche
              </h1>
              <p className="hidden md:block text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] mt-1">Your expense tracker.</p>
            </div>
          </div>
          
          {/* Desktop Right Header */}
          <div className="hidden md:flex text-right items-center gap-6">
            <WalletBalanceDisplay 
               initialBalance={(session.user as any).walletBalance} 
               currency={(session.user as any).currency || "INR"}
            />
            <DownloadLink variant="icon" />
            <Link href="/me" className="flex flex-col items-end group">
                <p className="text-[10px] font-bold text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors uppercase tracking-widest leading-loose">{session.user.name}</p>
                <span className="text-[9px] text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">Manage Account</span>
            </Link>
            <SignOutButton />
          </div>

          {/* Mobile Right Header: Avatar button */}
          <div className="md:hidden">
             <AccountSheet session={session} />
          </div>
        </div>
        
        <Suspense fallback={<div className="animate-pulse h-64 bg-[var(--surface-light)] rounded-2xl"></div>}>
          <Dashboard />
        </Suspense>
      </div>
    </main>
  );
}
