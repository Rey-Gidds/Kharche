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
        cached.promise = mongoose.connect(MONGODB_URI!, { family: 4 }); // Force IPv4 to avoid SRV/IPv6 issues on Windows
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export default connectDB;

