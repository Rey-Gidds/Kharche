"use client";

import { useSession } from "@/lib/auth-client";
import { useState } from "react";
import { useNotification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, User as UserIcon, Plus, Globe, Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { supportedCurrencies, convertCurrency } from "@/utils/currencyConverter";
import { useRef } from "react";

export default function MePage() {
    const { data: session, isPending, error: sessionError } = useSession();
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const router = useRouter();
    const { walletBalance, walletCurrency, refetchWallet, setWalletDefaultCurrency } = useWallet();
    const thresholdInWalletCurrency = convertCurrency(1000, "INR", walletCurrency);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-light)]"></div>
                    <div className="h-4 w-32 bg-[var(--surface-light)] rounded"></div>
                </div>
            </div>
        );
    }

    if (sessionError || !session) {
        router.push("/sign-in");
        return null;
    }

    const { user } = session;

    const handleAddMoney = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            showNotification("Please enter a valid amount", "error");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/user/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: Number(amount) }),
            });

            if (response.ok) {
                showNotification("Pocket money added successfully!", "success");
                setAmount("");
                // Refetch wallet state to update UI balance instantaneously
                refetchWallet(); 
            } else {
                const data = await response.json();
                showNotification(data.error || "Failed to add money", "error");
            }
        } catch (err) {
            showNotification("An error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1MB Limit
        if (file.size > 1024 * 1024) {
            showNotification("Image must be less than 1MB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadstart = () => setUploading(true);
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const res = await fetch("/api/user/profile-picture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: base64 }),
                });

                if (res.ok) {
                    showNotification("Profile picture updated!", "success");
                    // Force refresh to update session data across components
                    window.location.reload();
                } else {
                    const data = await res.json();
                    showNotification(data.error || "Upload failed", "error");
                }
            } catch (err) {
                showNotification("An error occurred during upload", "error");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
            <header className="px-6 pt-12 pb-8 max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6 group text-sm font-medium">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Journal
                </Link>
                <h1 className="text-4xl font-serif font-bold text-[var(--foreground)]">My Account</h1>
                <p className="text-[var(--muted)] mt-2">Manage your profile and wallet settings.</p>
            </header>

            <main className="px-6 max-w-4xl mx-auto flex flex-col md:grid md:grid-cols-2 gap-8">
                {/* Profile Card */}
                <section className="bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] border-2 border-[var(--border)] overflow-hidden shadow-inner">
                                {user.image ? (
                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-10 h-10" />
                                )}
                                
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                type="button"
                                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{user.name}</h2>
                            <p className="text-[var(--muted)] text-sm">{user.email}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                            <span className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Account ID</span>
                            <code className="text-xs break-all">{user.id}</code>
                        </div>
                        <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                            <span className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Member Since</span>
                            <span className="text-sm">{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </section>

                {/* Wallet Card */}
                <section className="bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between">
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
                                                setLoading(true);
                                                await setWalletDefaultCurrency(newCurr);
                                                await refetchWallet();
                                                setLoading(false);
                                                showNotification(`Wallet currency changed to ${newCurr}`, "success");
                                            }}
                                            className="bg-transparent text-xs md:text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer appearance-none flex-grow"
                                        >
                                            {supportedCurrencies.map(curr => <option key={curr} value={curr} className="bg-[var(--surface)]">{curr}</option>)}
                                        </select>
                                   </div>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--muted)] mt-4 md:mt-2 italic">* Minimum threshold of {thresholdInWalletCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })} {walletCurrency} ({ (1000).toLocaleString() } INR equivalent) required for expenses.</p>
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
                                    disabled={loading}
                                    className="w-full md:w-auto px-6 py-4 md:py-2 bg-[var(--foreground)] text-[var(--background)] rounded-xl md:rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-sm"
                                >
                                    {loading ? "..." : <><Plus className="w-3 h-3" /> Add</>}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}
