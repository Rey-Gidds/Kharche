import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { User } from "@/models/User"; 
import connectDB from "@/lib/db";

export async function PUT(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await connectDB();

        const updatedUser = await User.findOneAndUpdate(
            { email: session.user.email },
            { name: name.trim() },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Profile updated successfully", name: updatedUser.name });
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
