"use client";

import { createContext, useContext } from "react";
import { useSession } from "@/lib/auth-client";
import { useNotification } from "./NotificationContext";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch wallet balance");
  return res.json();
};

interface WalletContextType {
    walletBalance: number;
    walletCurrency: string;
    loading: boolean;
    error: string | null;
    refetchWallet: () => void;
    setWalletDefaultCurrency: (currency: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const currencyAllowed = ["USD", "INR", "CNY", "EUR", "GBP", "JPY"];

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { showNotification } = useNotification();
    const session = useSession();
    const userId = session.data?.user?.id;

    const { data, error, isLoading, mutate } = useSWR(
        userId ? "/api/user/wallet" : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            onError: (err) => showNotification(err.message, "error"),
        }
    );

    const walletBalance = data?.walletBalance ?? 0;
    const walletCurrency = (session.data?.user as any)?.currency || "INR";
    const loading = isLoading && !data;

    const setWalletDefaultCurrency = async (currency: string) => {
        try {
            if (!currencyAllowed.includes(currency)) throw new Error("Invalid currency");
            const res = await fetch("/api/auth/set-wallet-default-currency", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currency }),
            });
            if (!res.ok) throw new Error("Failed to set wallet default currency");
            await mutate(); // Re-fetch wallet data after currency change
        } catch (err: any) {
            showNotification(err.message, "error");
        }
    };

    return (
        <WalletContext.Provider value={{ 
            walletBalance, 
            walletCurrency,
            loading,
            error: error?.message ?? null,
            refetchWallet: () => mutate(),
            setWalletDefaultCurrency,
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
