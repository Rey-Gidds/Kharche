import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/cachedSession";
import { headers } from "next/headers";
import { UserEncryption } from "@/models/UserEncryption";
import { User } from "@/models/User";
import connectDB from "@/lib/db";

export async function GET() {
  try {
    const session = await getCachedSession(await headers());
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email }).select("needsBackfill encryptionVersion");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const encRecord = await UserEncryption.findOne({ userId: user._id }).select("setupCompleted");
    const setupCompleted = encRecord?.setupCompleted ?? false;

    return NextResponse.json({
      setupCompleted,
      needsBackfill: user.needsBackfill ?? false,
      encryptionVersion: user.encryptionVersion,
    });
  } catch (error) {
    console.error("Encryption status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
