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

// 3. Define basic schemas
const UserSchema = new mongoose.Schema({
  encryptionEnabled: { type: Boolean, default: false },
  encryptionVersion: { type: Number, default: 0 },
});

const UserEncryptionSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.models.User || mongoose.model("User", UserSchema, "user");
const UserEncryption = mongoose.models.UserEncryption || mongoose.model("UserEncryption", UserEncryptionSchema, "userencryptions");

async function runReset() {
  try {
    console.log("Updating all users to disable encryption...");
    const userResult = await User.updateMany({}, {
      $set: {
        encryptionEnabled: false,
        encryptionVersion: 0
      }
    });
    console.log(`✅ Updated ${userResult.modifiedCount} users (disabled encryption).`);

    console.log("Deleting all existing UserEncryption records...");
    const deleteResult = await UserEncryption.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} UserEncryption records.`);

    console.log("🎉 Reset complete. All users now have encryption disabled and must re-enter/configure a passphrase on next enable.");
  } catch (error) {
    console.error("❌ Reset failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runReset();
