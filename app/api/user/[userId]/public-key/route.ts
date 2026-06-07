import { getCachedSession } from "@/lib/cachedSession";
import { connectDB } from "@/lib/db";
import UserEncryption from "@/models/UserEncryption";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/user/[userId]/public-key
 * Returns a user's RSA public key for room key distribution.
 * Authenticated endpoint.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getCachedSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId } = await params;
    await connectDB();

    const encryption = await UserEncryption.findOne({ userId }).lean();
    if (!encryption || !encryption.setupCompleted) {
      return NextResponse.json({ error: "Encryption not set up" }, { status: 404 });
    }

    return NextResponse.json({ publicKey: encryption.publicKey, encryptionVersion: encryption.encryptionVersion });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
