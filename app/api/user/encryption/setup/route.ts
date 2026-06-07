import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/cachedSession";
import { headers } from "next/headers";
import { UserEncryption } from "@/models/UserEncryption";
import { User } from "@/models/User";
import connectDB from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getCachedSession(await headers());
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { publicKey, encryptedPrivateKey, encryptedMasterKey, salt, recoveryKeyEnvelope, encryptedPassphrase } = body;

    if (!publicKey || !encryptedPrivateKey || !encryptedMasterKey || !salt || !recoveryKeyEnvelope || !encryptedPassphrase) {
      return NextResponse.json({ error: "Missing required encryption fields" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Idempotent upsert: create or update
    await UserEncryption.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        publicKey,
        encryptedPrivateKey,
        encryptedMasterKey,
        salt,
        recoveryKeyEnvelope,
        encryptedPassphrase,
        encryptionVersion: 1,
        setupCompleted: true,
      },
      { upsert: true, new: true }
    );

    // Mark user as encryption-enabled
    await User.findByIdAndUpdate(user._id, {
      encryptionVersion: 1,
    });

    return NextResponse.json({
      message: "Encryption setup complete",
    }, { status: 201 });
  } catch (error) {
    console.error("Encryption setup error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
