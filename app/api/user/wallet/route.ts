import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
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
        const { amount } = await req.json();

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
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

            // Only allowed to ADD money
            user.walletBalance = (user.walletBalance || 0) + Number(amount);
            await user.save({ session: mongoSession });

            await mongoSession.commitTransaction();
            mongoSession.endSession();

            return NextResponse.json({ 
                message: "Added money to wallet successfully", 
                walletBalance: user.walletBalance 
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
