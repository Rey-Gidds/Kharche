import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ExpenseBook from "@/models/ExpenseBook";
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
        const { title, description, currency } = await req.json();

        if (!title || title.trim() === "") {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        await connectDB();

        let finalCurrency = currency;
        if (!finalCurrency) {
            const User = (await import("@/models/User")).default;
            const user = await User.findById(session.user.id);
            finalCurrency = user?.currency || "INR";
        }

        const expenseBook = await ExpenseBook.create({
            userId: session.user.id,
            title,
            description,
            currency: finalCurrency,
        });

        return NextResponse.json(expenseBook, { status: 201 });
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

    // Secure pagination — limit capped server-side at 50
    const MAX_LIMIT = 50;
    const DEFAULT_LIMIT = 20;
    const rawLimit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit), MAX_LIMIT);
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const skip = (page - 1) * limit;

    try {
        await connectDB();
        const total = await ExpenseBook.countDocuments({ userId: session.user.id });
        const expenseBooks = await ExpenseBook.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const hasMore = skip + expenseBooks.length < total;
        return NextResponse.json({ data: expenseBooks, hasMore, page, total });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
