import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ExpenseBook from "@/models/ExpenseBook";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        await connectDB();
        
        const expenseBook = await ExpenseBook.findOne({
            _id: id,
            userId: session.user.id
        });

        if (!expenseBook) {
            return NextResponse.json({ error: "Expense Book not found" }, { status: 404 });
        }

        return NextResponse.json(expenseBook);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const { title, description } = await req.json();

        if (!title || title.trim() === "") {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        await connectDB();
        const book = await ExpenseBook.findOneAndUpdate(
            { _id: id, userId: session.user.id },
            { title: title.trim(), description: description?.trim() ?? "" },
            { new: true }
        );

        if (!book) return NextResponse.json({ error: "Expense Book not found" }, { status: 404 });
        return NextResponse.json(book);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        await connectDB();

        const book = await ExpenseBook.findOneAndDelete({ _id: id, userId: session.user.id });
        if (!book) return NextResponse.json({ error: "Expense Book not found" }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
