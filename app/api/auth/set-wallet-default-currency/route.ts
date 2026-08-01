import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { supportedCurrencies } from "@/utils/currencyConverter";
import { getServerExchangeRates } from "@/lib/exchangeRateCache";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await getSession(await headers());

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { currency } = await req.json();
        await connectDB();

        if (!currency) {
            return NextResponse.json({ error: "Currency is required" }, { status: 400 });
        }

        if (!supportedCurrencies.includes(currency)) {
            return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
        }
        const rates = await getServerExchangeRates();
        const convert = (amount: number, from: string, to: string): number | null => {
            if (from === to) return amount;
            if (!rates[from] || !rates[to]) return null;
            return (amount / rates[from]) * rates[to];
        };
        const mongoSession = await mongoose.startSession();
        mongoSession.startTransaction();

        try {
            const user = await User.findById(session.user.id).session(mongoSession);
            if (!user) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const oldCurrency = user.currency || "INR";
            if (oldCurrency !== currency) {
                // Convert existing balance to new currency
                const currentBalance = user.walletBalance || 0;
                const newBalance = convert(currentBalance, oldCurrency, currency);
                if (newBalance === null) {
                    await mongoSession.abortTransaction();
                    mongoSession.endSession();
                    return NextResponse.json({ error: "Currency conversion unavailable" }, { status: 503 });
                }
                user.walletBalance = newBalance;
                user.currency = currency;
                await user.save({ session: mongoSession });
            }

            await mongoSession.commitTransaction();
            mongoSession.endSession();

            return NextResponse.json({ 
                message: "Wallet default currency updated successfully", 
                currency: user.currency 
            });
        } catch (txnError) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            throw txnError;
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
