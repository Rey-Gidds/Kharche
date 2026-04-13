import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { convertCurrency } from "@/utils/currencyConverter";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { currency } = await req.json();

        if (!currency) {
            return NextResponse.json({ error: "Currency is required" }, { status: 400 });
        }

        const allowedCurrencies = ["USD", "INR", "CNY", "EUR", "GBP", "JPY"];
        if (!allowedCurrencies.includes(currency)) {
            return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
        }

        await connectDB();
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
                const newBalance = convertCurrency(currentBalance, oldCurrency, currency);
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
