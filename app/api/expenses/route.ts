import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import ExpenseBook from "@/models/ExpenseBook";
import User from "@/models/User";
import { convertCurrency, THRESHOLD_INR } from "@/utils/currencyConverter";
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
        const { amount, currency, category, description, date, bookId } = await req.json();

        // Server-side validation
        if (Number(amount) > 1000000) {
            return NextResponse.json({ error: "Amount cannot exceed 1,000,000" }, { status: 400 });
        }
        if (category.length > 20) {
            return NextResponse.json({ error: "Category name too long (max 20 characters)" }, { status: 400 });
        }
        if (description && description.length > 100) {
            return NextResponse.json({ error: "Description too long (max 100 characters)" }, { status: 400 });
        }

        await connectDB();
        const mongoSession = await mongoose.startSession();
        mongoSession.startTransaction();

        try {
            const user = await User.findById(session.user.id).session(mongoSession);
            if (!user) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "User not found" }, { status: 401 });
            }

            const walletCurrency = user.currency || "INR";
            const expenseAmountInWalletCurrency = convertCurrency(Number(amount), currency || "USD", walletCurrency);
            const newBalance = user.walletBalance - expenseAmountInWalletCurrency;

            // Threshold logic
            const thresholdInWalletCurrency = convertCurrency(THRESHOLD_INR, "INR", walletCurrency);

            if (newBalance < thresholdInWalletCurrency) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ 
                    error: `Insufficient wallet balance. Minimum threshold is ${thresholdInWalletCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${walletCurrency}.` 
                }, { status: 400 });
            }

            const [expense] = await Expense.create([{
                userId: session.user.id,
                bookId: bookId || undefined,
                amount: Number(amount),
                currency: currency || "USD",
                category,
                description,
                date: date ? new Date(date) : new Date(),
            }], { session: mongoSession });

            // Update User wallet balance
            user.walletBalance = newBalance;
            await user.save({ session: mongoSession });

            // Add reference to ExpenseBook if it exists
            if (bookId) {
                const book = await ExpenseBook.findByIdAndUpdate(bookId, {
                    $push: { expenses: expense._id }
                }, { session: mongoSession });
                
                if (!book) {
                    await mongoSession.abortTransaction();
                    mongoSession.endSession();
                    return NextResponse.json({ error: "Expense book not found" }, { status: 404 });
                }
            }

            await mongoSession.commitTransaction();
            mongoSession.endSession();
            return NextResponse.json(expense, { status: 201 });
        } catch (txnError) {
            await mongoSession.abortTransaction();
            mongoSession.endSession();
            throw txnError;
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sortOrder = searchParams.get("sort") === "desc" ? -1 : 1;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const category = searchParams.get("category") || "All";
    const bookId = searchParams.get("bookId");

    // Secure pagination — limit is capped server-side at 50 no matter what the client sends
    const MAX_LIMIT = 50;
    const DEFAULT_LIMIT = 20;
    const rawLimit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit), MAX_LIMIT);
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const skip = (page - 1) * limit;

    try {
        await connectDB();
        
        let query: any = { userId: session.user.id };
        
        if (bookId) {
            query.bookId = bookId;
        }

        if (category !== "All") {
            if (category === "others") {
                const predefined = ["Food", "Transport", "Rent", "Entertainment", "Utilities"];
                query.category = { $nin: predefined };
            } else {
                query.category = category;
            }
        }

        const total = await Expense.countDocuments(query);
        const expenses = await Expense.find(query)
            .sort({ [sortBy]: sortOrder as any })
            .skip(skip)
            .limit(limit);

        const hasMore = skip + expenses.length < total;
        return NextResponse.json({ data: expenses, hasMore, page, total });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
