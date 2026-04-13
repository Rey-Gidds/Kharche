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
