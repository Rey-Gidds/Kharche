import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import User from "@/models/User";
import { getServerExchangeRates } from "@/lib/exchangeRateCache";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { recordCategoryUsage } from "@/utils/normalizeCategory";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession(await headers());

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const rates = await getServerExchangeRates();
        const convert = (amount: number, from: string, to: string): number | null => {
            if (from === to) return amount;
            if (!rates[from] || !rates[to]) return null;
            return (amount / rates[from]) * rates[to];
        };
        await connectDB();
        const mongoSession = await mongoose.startSession();
        mongoSession.startTransaction();

        try {
            // 1. Find user and expense
            const expense = await Expense.findOne({ _id: id, userId: session.user.id }).session(mongoSession);
            if (!expense) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "Expense not found" }, { status: 404 });
            }

            const user = await User.findById(session.user.id).session(mongoSession);
            if (!user) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "User not found" }, { status: 401 });
            }

            // 2. Refund to wallet
            const walletCurrency = user.currency || "INR";
            const refundAmountInWalletCurrency = convert(expense.amount, expense.currency, walletCurrency);
            if (refundAmountInWalletCurrency === null) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "Currency conversion unavailable" }, { status: 503 });
            }
            user.walletBalance = (user.walletBalance || 0) + refundAmountInWalletCurrency;
            await user.save({ session: mongoSession });

            // 3. Delete expense
            await Expense.findOneAndDelete({ _id: id, userId: session.user.id }, { session: mongoSession });

            await mongoSession.commitTransaction();
            mongoSession.endSession();
            return NextResponse.json({ message: "Expense deleted and balance refunded" });
        } catch (txnError) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            throw txnError;
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession(await headers());

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { amount, currency, category, description, date, encryptedDescription, encryptionVersion } = await req.json();
        const rates = await getServerExchangeRates();
        const convert = (amount: number, from: string, to: string): number | null => {
            if (from === to) return amount;
            if (!rates[from] || !rates[to]) return null;
            return (amount / rates[from]) * rates[to];
        };
        await connectDB();
        const mongoSession = await mongoose.startSession();
        mongoSession.startTransaction();

        try {
            // 1. Find the existing expense and user
            const existingExpense = await Expense.findOne({ _id: id, userId: session.user.id }).session(mongoSession);
            if (!existingExpense) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "Expense not found" }, { status: 404 });
            }

            const user = await User.findById(session.user.id).session(mongoSession);
            if (!user) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "User not found" }, { status: 401 });
            }

            const walletCurrency = user.currency || "INR";

            // 2. Calculate balance impact
            // Refund the old amount first (conceptually)
            const oldAmountInWalletCurrency = convert(existingExpense.amount, existingExpense.currency, walletCurrency);
            if (oldAmountInWalletCurrency === null) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "Currency conversion unavailable" }, { status: 503 });
            }
            
            // New amount (if provided, else keep old)
            const newAmount = amount !== undefined ? Number(amount) : existingExpense.amount;
            const newCurrency = currency || existingExpense.currency;
            const newAmountInWalletCurrency = convert(newAmount, newCurrency, walletCurrency);
            if (newAmountInWalletCurrency === null) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "Currency conversion unavailable" }, { status: 503 });
            }

            const balanceWithoutOldExpense = (user.walletBalance || 0) + oldAmountInWalletCurrency;
            const finalBalance = balanceWithoutOldExpense - newAmountInWalletCurrency;

            // 3. Ensure balance doesn't go negative after update
            if (finalBalance < 0) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ 
                    error: `Insufficient wallet balance. This update would leave you at ${finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${walletCurrency}.` 
                }, { status: 400 });
            }

            // 4. Update Expense — build update object dynamically
            const updateFields: Record<string, any> = {
                amount: newAmount,
                currency: newCurrency,
                category: category || existingExpense.category,
            };
            if (date) updateFields.date = new Date(date);
            updateFields.encryptedDescription = encryptedDescription;
            updateFields.encryptionVersion = encryptionVersion ?? 1;

            const updatedExpense = await Expense.findOneAndUpdate(
                { _id: id, userId: session.user.id },
                { $set: updateFields },
                { new: true, session: mongoSession }
            );

            // 5. Update User Balance
            user.walletBalance = finalBalance;
            await user.save({ session: mongoSession });

            await mongoSession.commitTransaction();
            mongoSession.endSession();

            // Record category usage atomically (non-blocking)
            if (category) {
                recordCategoryUsage(session.user.id, category);
            }

            return NextResponse.json(updatedExpense);
        } catch (txnError) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            throw txnError;
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
