import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import ExpenseBook from "@/models/ExpenseBook";
import User from "@/models/User";
import { MINIMUM_BALANCE_USD } from "@/utils/currencyConverter";
import { getServerExchangeRates } from "@/lib/exchangeRateCache";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { recordCategoryUsage } from "@/utils/normalizeCategory";

export async function POST(req: Request) {
    await connectDB();
    const session = await getSession(await headers());

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Load exchange rates from the server-side 24h cache.
        // Using getServerExchangeRates() directly avoids a relative fetch()
        // which would fail in Node.js (no base URL for relative paths).
        const rates = await getServerExchangeRates();

        // Inline converter using the fetched rates (avoids relying on the
        // client-side module-level cachedRates in currencyConverter.ts).
        const convert = (amount: number, from: string, to: string): number | null => {
            if (from === to) return amount;
            if (!rates[from] || !rates[to]) return null;
            return (amount / rates[from]) * rates[to];
        };

        const { amount, currency, category, description, date, bookId, encryptedDescription, encryptionVersion } = await req.json();

        // Server-side validation
        if (Number(amount) > 1000000) {
            return NextResponse.json({ error: "Amount cannot exceed 1,000,000" }, { status: 400 });
        }
        if (!category || category.length > 20) {
            return NextResponse.json({ error: "Category is required (max 20 characters)" }, { status: 400 });
        }
        if (!encryptedDescription) {
            return NextResponse.json({ error: "Encrypted description is required" }, { status: 400 });
        }
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
            const expenseAmountInWalletCurrency = convert(Number(amount), currency || "USD", walletCurrency);
            if (expenseAmountInWalletCurrency === null) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "Currency conversion unavailable" }, { status: 503 });
            }
            const newBalance = user.walletBalance - expenseAmountInWalletCurrency;

            // Threshold logic — minimum $1 equivalent in wallet currency
            const thresholdInWalletCurrency = convert(MINIMUM_BALANCE_USD, "USD", walletCurrency);
            if (thresholdInWalletCurrency === null) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ error: "Currency conversion unavailable" }, { status: 503 });
            }

            if (newBalance < thresholdInWalletCurrency) {
                await mongoSession.abortTransaction();
                mongoSession.endSession();
                return NextResponse.json({ 
                    error: `Insufficient wallet balance. Minimum threshold is ${thresholdInWalletCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${walletCurrency}.` 
                }, { status: 400 });
            }

            const expenseDoc: Record<string, any> = {
                userId: session.user.id,
                bookId: bookId || undefined,
                amount: Number(amount),
                currency: currency || "USD",
                category,
                date: date ? new Date(date) : new Date(),
            };
            expenseDoc.encryptedDescription = encryptedDescription;
            expenseDoc.encryptionVersion = encryptionVersion ?? 1;

            const [expense] = await Expense.create([expenseDoc], { session: mongoSession });

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

            // Record category usage atomically (non-blocking)
            recordCategoryUsage(session.user.id, category);

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
    await connectDB();
    const session = await getSession(await headers());

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sortOrder = searchParams.get("sort") === "desc" ? -1 : 1;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const category = searchParams.get("category") || "All";
    const bookId = searchParams.get("bookId");

    const dateFilterType = searchParams.get("dateFilterType") || "all";
    const dateFilterValue = searchParams.get("dateFilterValue") || "";
    const tzOffsetParam = searchParams.get("timezoneOffset");
    const timezoneOffset = tzOffsetParam !== null ? parseInt(tzOffsetParam, 10) : 0;

    // Secure pagination — allow larger limits for date-filtered aggregation queries
    const hasDateFilter = dateFilterType !== "all" && dateFilterValue !== "";
    const MAX_LIMIT = hasDateFilter ? 500 : 50;
    const DEFAULT_LIMIT = hasDateFilter ? 500 : 20;
    const rawLimit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit), MAX_LIMIT);
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const skip = (page - 1) * limit;

    try {
        
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

        // Advanced custom Date / Month / Year range filtering (timezone-aware)
        if (dateFilterType !== "all" && dateFilterValue) {
            const tzOffset = !isNaN(timezoneOffset) ? timezoneOffset : 0;
            if (dateFilterType === "date") {
                const [year, month, day] = dateFilterValue.split("-").map(Number);
                const startLocalMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
                const endLocalMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
                const start = new Date(startLocalMs + tzOffset * 60 * 1000);
                const end = new Date(endLocalMs + tzOffset * 60 * 1000);
                query.date = { $gte: start, $lte: end };
            } else if (dateFilterType === "month") {
                const [year, month] = dateFilterValue.split("-").map(Number);
                const startLocalMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
                const endLocalMs = Date.UTC(year, month, 0, 23, 59, 59, 999);
                const start = new Date(startLocalMs + tzOffset * 60 * 1000);
                const end = new Date(endLocalMs + tzOffset * 60 * 1000);
                query.date = { $gte: start, $lte: end };
            } else if (dateFilterType === "year") {
                const year = Number(dateFilterValue);
                const startLocalMs = Date.UTC(year, 0, 1, 0, 0, 0, 0);
                const endLocalMs = Date.UTC(year, 11, 31, 23, 59, 59, 999);
                const start = new Date(startLocalMs + tzOffset * 60 * 1000);
                const end = new Date(endLocalMs + tzOffset * 60 * 1000);
                query.date = { $gte: start, $lte: end };
            }
        }

        let sortQuery: any = {};
        if (sortBy === "date") {
            sortQuery = { date: sortOrder, createdAt: sortOrder };
        } else if (sortBy === "amount") {
            sortQuery = { amount: sortOrder, createdAt: sortOrder };
        } else {
            sortQuery = { [sortBy]: sortOrder, _id: sortOrder };
        }

        const total = await Expense.countDocuments(query);
        const expenses = await Expense.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);

        const hasMore = skip + expenses.length < total;
        return NextResponse.json({ data: expenses, hasMore, page, total });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
