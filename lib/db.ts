import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI;

declare global {
  var mongoose: any;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
    if (!MONGODB_URI) {
        throw new Error("Please add your Mongo URI to .env.local");
    }
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI!, { 
          family: 4,
          maxPoolSize: 5, // Optimized pool size for Vercel/serverless instances
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
          maxIdleTimeMS: 10000,
        }).then((mongooseInstance) => mongooseInstance);
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null; // Clear cached promise on error to allow retries
        throw e;
    }
    return cached.conn;
}

export default connectDB;


