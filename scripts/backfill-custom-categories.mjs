import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// 1. Read MONGODB_URI from environment files (.env.local or .env)
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

let mongodbUri = "";

const parseEnvFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, "utf8");
    const match = envContent.match(/MONGODB_URI\s*=\s*(.+)/);
    if (match) {
      return match[1].trim().replace(/['"]/g, "");
    }
  }
  return "";
};

mongodbUri = parseEnvFile(envLocalPath) || parseEnvFile(envPath);

if (!mongodbUri) {
  console.error("❌ Error: MONGODB_URI not found in .env.local or .env file.");
  process.exit(1);
}

// 2. Connect to MongoDB
console.log("Connecting to MongoDB...");
try {
  await mongoose.connect(mongodbUri);
  console.log("✅ Connected to MongoDB database.");
} catch (err) {
  console.error("❌ Mongoose connection error:", err);
  process.exit(1);
}

// 3. Define schemas inline for script robustness
const ExpenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const CustomCategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  displayName: { type: String, required: true },
  normalizedName: { type: String, required: true },
  usageCount: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now },
}, { 
  timestamps: { createdAt: true, updatedAt: false } 
});

CustomCategorySchema.index({ userId: 1, normalizedName: 1 }, { unique: true });

const Expense = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
const CustomCategory = mongoose.models.CustomCategory || mongoose.model("CustomCategory", CustomCategorySchema);

const PREDEFINED_NORMALIZED = ["food", "transport", "rent", "entertainment", "utilities"];

function normalizeCategoryName(input) {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function runBackfill() {
  try {
    // 4. Fetch all expenses
    console.log("Fetching all expenses from database...");
    const expenses = await Expense.find({}).lean();
    console.log(`Found ${expenses.length} total expenses.`);

    // 5. Group by userId and normalized category
    const categoryMap = new Map(); // key: userId_normalizedName -> { userId, displayName, normalizedName, count, lastUsedAt }

    for (const exp of expenses) {
      if (!exp.category) continue;
      const normalized = normalizeCategoryName(exp.category);
      if (!normalized) continue;
      
      // Skip if category is predefined
      if (PREDEFINED_NORMALIZED.includes(normalized)) {
        continue;
      }
      
      const userIdStr = exp.userId.toString();
      const key = `${userIdStr}_${normalized}`;
      const expDate = exp.date ? new Date(exp.date) : new Date();
      
      if (categoryMap.has(key)) {
        const existing = categoryMap.get(key);
        existing.count += 1;
        if (expDate > existing.lastUsedAt) {
          existing.lastUsedAt = expDate;
          existing.displayName = exp.category.trim(); // Keep the casing of the latest used category instance
        }
      } else {
        categoryMap.set(key, {
          userId: exp.userId,
          displayName: exp.category.trim(),
          normalizedName: normalized,
          count: 1,
          lastUsedAt: expDate,
        });
      }
    }

    console.log(`Aggregated ${categoryMap.size} unique custom categories across all users.`);

    if (categoryMap.size === 0) {
      console.log("No custom categories to backfill.");
      return;
    }

    // 6. Write custom categories to the database (upsert)
    console.log("Upserting CustomCategory records...");
    let upsertCount = 0;
    for (const [key, data] of categoryMap.entries()) {
      await CustomCategory.updateOne(
        { userId: data.userId, normalizedName: data.normalizedName },
        {
          $set: {
            displayName: data.displayName,
            lastUsedAt: data.lastUsedAt,
            usageCount: data.count,
          },
          $setOnInsert: {
            createdAt: new Date(),
          }
        },
        { upsert: true }
      );
      upsertCount++;
      if (upsertCount % 50 === 0 || upsertCount === categoryMap.size) {
        console.log(`Progress: ${upsertCount}/${categoryMap.size} categories processed.`);
      }
    }

    console.log(`🎉 Successfully backfilled ${upsertCount} CustomCategory records.`);
  } catch (error) {
    console.error("❌ An error occurred during backfill execution:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runBackfill();
