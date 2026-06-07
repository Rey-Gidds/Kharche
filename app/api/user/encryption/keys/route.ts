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

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const encRecord = await UserEncryption.findOne({ userId: user._id }).select(
      "publicKey encryptedPrivateKey encryptedMasterKey salt recoveryKeyEnvelope encryptedPassphrase encryptionVersion",
    );

    if (!encRecord) {
      return NextResponse.json({ error: "Encryption keys not found" }, { status: 404 });
    }

    return NextResponse.json({
      publicKey: encRecord.publicKey,
      encryptedPrivateKey: encRecord.encryptedPrivateKey,
      encryptedMasterKey: encRecord.encryptedMasterKey,
      salt: encRecord.salt,
      recoveryKeyEnvelope: encRecord.recoveryKeyEnvelope,
      encryptedPassphrase: encRecord.encryptedPassphrase,
      encryptionVersion: encRecord.encryptionVersion,
    });
  } catch (error) {
    console.error("Encryption keys fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
