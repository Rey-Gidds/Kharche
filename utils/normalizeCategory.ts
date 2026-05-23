import CustomCategory from "@/models/CustomCategory";

/**
 * Normalizes a category name by trimming it, converting it to lowercase,
 * and collapsing any consecutive spaces into a single space.
 * 
 * Example: "   UPI   Transfer   " -> "upi transfer"
 */
export function normalizeCategoryName(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Atomically increments the category usage count and updates the last used timestamp.
 * If the category does not exist for this user, it creates it.
 * This utilizes atomic operations ($inc, $set) and is fully index-friendly.
 */
export async function recordCategoryUsage(userId: string, displayName: string): Promise<void> {
  if (!userId || !displayName) return;
  
  const trimmedDisplay = displayName.trim();
  if (!trimmedDisplay) return;

  const normalized = normalizeCategoryName(trimmedDisplay);
  if (!normalized) return;

  try {
    // Atomic upsert operation:
    // $inc increments usageCount by 1
    // $set updates lastUsedAt and keeps the latest typed display name
    // $setOnInsert sets the createdAt date on first insert
    await CustomCategory.updateOne(
      { userId, normalizedName: normalized },
      {
        $inc: { usageCount: 1 },
        $set: { 
          lastUsedAt: new Date(), 
          displayName: trimmedDisplay 
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to record custom category usage:", error);
  }
}
