"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useNotification } from "./NotificationContext";

interface WalletContextType {
    walletBalance: number;
    walletCurrency: string;
    loading: boolean;
    error: string | null;
    refetchWallet: (user?: any, silent?: boolean) => Promise<void>;
    setWalletDefaultCurrency: (currency: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const currencyAllowed = ["USD", "INR", "CNY", "EUR", "GBP", "JPY"];

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [walletCurrency, setWalletCurrency] = useState("INR");
    const { showNotification } = useNotification();
    const session = useSession();

    const fetchWallet = async (userParam?: any, silent = false) => {
        const user = userParam || session.data?.user;
        
        if (!user?.id) {
            setLoading(false);
            return;
        }

        if (!silent) setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/get-session");
            if (!res.ok) throw new Error("Failed to fetch wallet balance");

            const data = await res.json();
            setWalletBalance(data.user?.walletBalance || 0);
            setWalletCurrency(data.user?.currency || "INR");
        } catch (err: any) {
            setError(err.message);
            showNotification(err.message, "error");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const setWalletDefaultCurrency = async (currency: string) => {
        try {
            if (!currencyAllowed.includes(currency)) throw new Error("Invalid currency");
            const res = await fetch("/api/auth/set-wallet-default-currency", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currency }),
            });
            if (!res.ok) throw new Error("Failed to set wallet default currency");
            setWalletCurrency(currency);
        } catch (err: any) {
            setError(err.message);
            showNotification(err.message, "error");
        }
    };

    useEffect(() => {
        if (session.data?.user) {
            fetchWallet(session.data?.user);
        } else if (!session.isPending) {
            setLoading(false);
        }
    }, [session?.data?.user?.id, session?.isPending]);

    return (
        <WalletContext.Provider value={{ 
            walletBalance, 
            walletCurrency,
            loading: loading && walletBalance === 0, // Only show loading if we don't have a balance yet
            error, 
            refetchWallet: (user?: any) => fetchWallet(user, true), // Default to silent for manual refetches
            setWalletDefaultCurrency: (currency: string) => setWalletDefaultCurrency(currency)
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWallet must be used within WalletProvider");
    }
    return context;
}


