import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";
import Dashboard from "@/app/components/Dashboard";
import WalletBalanceDisplay from "@/app/components/WalletBalanceDisplay";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (

    <main className="min-h-screen bg-[var(--background)] p-6 md:p-12 font-inter selection:bg-[var(--border)] selection:text-[var(--foreground)]">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-8">
          <div>
            <h1 className="text-3xl font-playfair font-bold text-[var(--foreground)] tracking-tight">
              TrackBook
            </h1>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] mt-1">Your expense tracker.</p>
          </div>
            <div className="text-right flex items-center gap-6">
                <WalletBalanceDisplay 
                   initialBalance={(session.user as any).walletBalance} 
                   currency={(session.user as any).currency || "INR"}
                />
                <Link href="/me" className="flex flex-col items-end group">
                    <p className="text-[10px] font-bold text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors uppercase tracking-widest leading-loose">{session.user.name}</p>
                    <span className="text-[9px] text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">Manage Account</span>
                </Link>
                <SignOutButton />
            </div>
          </div>
        </div>
        <Dashboard />
        
        <footer className="pt-12 text-center">
            <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-[0.3em]">System V1.0</p>
        </footer>
      </main>
  );
}
