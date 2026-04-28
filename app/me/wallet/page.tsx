"use client";

import { useSession } from "@/lib/auth-client";
import { useState } from "react";
import { useNotification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, Plus, Globe } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { supportedCurrencies, convertCurrency } from "@/utils/currencyConverter";
import FullScreenLoader from "@/app/components/FullScreenLoader";

export default function WalletPage() {
    const { data: session, isPending, error: sessionError } = useSession();
    const [amount, setAmount] = useState("");
    const { showNotification } = useNotification();
	const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();

    const { walletBalance, walletCurrency, refetchWallet, setWalletDefaultCurrency } = useWallet();
    const thresholdInWalletCurrency = convertCurrency(1000, "INR", walletCurrency);

    if (isPending) {
        return <FullScreenLoader />;
    }

    if (sessionError || !session) {
        router.push("/sign-in");
        return null;
    }

    const handleAddMoney = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsAdding(true);
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            showNotification("Please enter a valid amount", "error");
            setIsAdding(false);
            return;
        }
        try {
            const response = await fetch("/api/user/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: Number(amount) }),
            });

            if (response.ok) {
                showNotification("Pocket money added successfully!", "success");
                setAmount("");
                refetchWallet(); 
            } else {
                const data = await response.json();
                showNotification(data.error || "Failed to add money", "error");
            }
        } catch (err) {
            showNotification("An error occurred", "error");
        }
        finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="min-h-screen md:min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] pb-10 md:pb-20">
            <header className="px-6 pt-6 md:pt-12 pb-6 md:pb-8 max-w-4xl mx-auto">
                <Link 
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6 group text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Home
                </Link>
                <h1 className="text-4xl font-serif font-bold text-[var(--foreground)]">My Wallet</h1>
                <p className="text-[var(--muted)] mt-2">Manage your funds and currency settings.</p>
            </header>

            <main className="px-6 max-w-4xl mx-auto">
                <section className="bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold">Wallet</h2>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded uppercase tracking-widest">Active</span>
                        </div>

                        <div className="mb-8">
                            <span className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Current Balance</span>
                            <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 md:gap-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-serif font-bold">
                                        {walletBalance?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0"}
                                    </span>
                                    <span className="text-lg font-medium text-[var(--muted)]">{walletCurrency}</span>
                                </div>
                                <div className="relative group/curr w-full md:w-auto mt-2 md:mt-0">
                                    <div className="flex items-center gap-2 px-4 py-3 md:px-2 md:py-1 bg-[var(--surface-light)] rounded-xl md:rounded-md border border-[var(--border)] hover:border-[var(--accent)] transition-all cursor-pointer">
                                        <Globe className="w-4 h-4 md:w-3 md:h-3 text-[var(--muted)]" />
                                        <select 
                                            value={walletCurrency}
                                            onChange={async (e) => {
                                                const newCurr = e.target.value;
                                                if (newCurr === walletCurrency) return;
                                                await setWalletDefaultCurrency(newCurr);
                                                await refetchWallet();
                                                showNotification(`Wallet currency changed to ${newCurr}`, "success");
                                            }}
                                            className="bg-transparent text-xs md:text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer appearance-none flex-grow"
                                        >
                                            {supportedCurrencies.map(curr => <option key={curr} value={curr} className="bg-[var(--surface)]">{curr}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--muted)] mt-4 md:mt-2 italic">* Minimum threshold of {thresholdInWalletCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })} {walletCurrency} ({ (83).toLocaleString() } INR equivalent) required for expenses.</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddMoney} className="space-y-4 pt-6 border-t border-[var(--border)]">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Add Pocket Money</label>
                            <div className="flex flex-col md:flex-row gap-3 md:gap-2">
                                <div className="flex-grow flex items-center border border-[var(--border)] md:border-0 md:border-b rounded-xl md:rounded-none px-4 py-2 md:px-0 focus-within:border-[var(--accent)] transition-colors">
                                    <span className="text-[var(--muted)] mr-2 font-medium">{walletCurrency}</span>
                                    <input 
                                        type="number" 
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="w-full py-2 bg-transparent outline-none font-medium"
                                        min="1"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full md:w-auto px-6 py-4 md:py-2 bg-[var(--foreground)] text-[var(--background)] rounded-xl md:rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-sm"
                                >
                                    {isAdding ? "Adding...": <><Plus className="w-3 h-3" /> Add</>}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
                
                {/* Optional: Add a link back to the account page */}
                <div className="mt-8">
                    <Link href="/me/account" className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition-all group shadow-sm">
                        <div className="flex items-center gap-3">
                            <div>
                                <h3 className="font-bold text-sm">Account Settings</h3>
                                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Manage your profile and security</p>
                            </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--muted)] group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
