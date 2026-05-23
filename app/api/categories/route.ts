import { getCachedSession } from "@/lib/cachedSession";
import { connectDB } from "@/lib/db";
import CustomCategory from "@/models/CustomCategory";
import { normalizeCategoryName } from "@/utils/normalizeCategory";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getCachedSession(await headers());

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const all = searchParams.get("all") === "true";

  try {
    await connectDB();

    const userId = session.user.id;
    const PREDEFINED_NORMALIZED = ["food", "transport", "rent", "entertainment", "utilities"];
    const baseQuery = {
      userId,
      normalizedName: { $nin: PREDEFINED_NORMALIZED }
    };

    // 1. If 'all' is true, return all categories historically created by this user (excluding predefined)
    if (all) {
      const categories = await CustomCategory.find(baseQuery)
        .sort({ usageCount: -1, lastUsedAt: -1 })
        .select("displayName normalizedName usageCount lastUsedAt")
        .lean();

      return NextResponse.json(categories);
    }

    // 2. If 'q' is provided and has length >= 2, perform an index-friendly prefix search (excluding predefined)
    if (query.trim().length >= 2) {
      const normalizedQuery = normalizeCategoryName(query);
      if (!normalizedQuery) {
        return NextResponse.json([]);
      }

      // Escape regex special characters to prevent regex injection attacks
      const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Prefix regex search is index-friendly on { userId: 1, normalizedName: 1 }
      const matchingCategories = await CustomCategory.find({
        ...baseQuery,
        normalizedName: { 
          $regex: new RegExp(`^${escapedQuery}`, "i"),
          $nin: PREDEFINED_NORMALIZED
        }
      })
        .sort({ usageCount: -1, lastUsedAt: -1 })
        .limit(10)
        .select("displayName normalizedName usageCount lastUsedAt")
        .lean();

      return NextResponse.json(matchingCategories);
    }

    // 3. Default: return top 10 most frequently used categories (excluding predefined)
    const topCategories = await CustomCategory.find(baseQuery)
      .sort({ usageCount: -1, lastUsedAt: -1 })
      .limit(10)
      .select("displayName normalizedName usageCount lastUsedAt")
      .lean();

    return NextResponse.json(topCategories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
