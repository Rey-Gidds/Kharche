import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        const session = await getSession(await headers());

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { image } = await req.json(); 

        if (!image) {
            return NextResponse.json({ error: "Image is required" }, { status: 400 });
        }

        // Validate base64 size (approximate)
        // Base64 is about 1.33x the size of the original file. 
        // 1MB = 1048576 bytes. 1.33 * 1MB = ~1.4MB in base64.
        const base64Size = (image.length * 3) / 4;
        if (base64Size > 1048576) {
            return NextResponse.json({ error: "Image size exceeds 1MB limit" }, { status: 400 });
        }

        await User.findByIdAndUpdate(session.user.id, { image });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Profile picture upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
