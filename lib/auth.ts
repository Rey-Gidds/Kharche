import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { sendEmail } from "./email";
import { redis } from "./redis";
import dns from "dns";

// Force Node.js to use Google's public DNS servers.
// This fixes querySrv ECONNREFUSED errors on Windows where the local/ISP DNS
// resolver refuses SRV record queries used by mongodb+srv:// connection strings.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Better Auth uses raw mongodb driver. We ensure only one connection is made.
const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
}

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
        _mongoClient?: MongoClient;
    };

    if (!globalWithMongo._mongoClient) {
        globalWithMongo._mongoClient = new MongoClient(MONGODB_URI, {
            family: 4, // Force IPv4 to avoid Node.js SRV/IPv6 resolution issues on Windows
        });
    }
    client = globalWithMongo._mongoClient;
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(MONGODB_URI, {
        family: 4, // Force IPv4
    });
}

export const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db, {
        transaction: true,
    }),
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, token }) => {
            const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
            
            if (process.env.NODE_ENV === "development") {
                console.log(`\n\n🔑 PASSWORD RESET LINK: ${url}\n\n`);
            }

            await sendEmail({
                to: user.email,
                subject: "Reset your password",
                html: `<p>Click <a href="${url}">here</a> to reset your password. The link will expire in 1 hour.</p><p>If the link doesn't work, copy and paste this direct URL: ${url}</p>`,
            });
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, token }) => {
            const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
            
            if (process.env.NODE_ENV === "development") {
                console.log(`\n\n📧 EMAIL VERIFICATION LINK: ${url}\n\n`);
            }

            await sendEmail({
                to: user.email,
                subject: "Verify your email",
                html: `<p>Click <a href="${url}">here</a> to verify your email address. The link will expire in 24 hours.</p><p>If the link doesn't work, copy and paste this direct URL: ${url}</p>`,
            });
        },
    },

    user: {
        additionalFields: {
            currency: {
                type: "string",
                defaultValue: "INR",
            },
        },
    },
    // ── Session Cache ─────────────────────────────────────────────────────────
    // cookieCache MUST be enabled to activate the secondaryStorage path for
    // get-session. Without it Better Auth never reads from Redis and every
    // /api/auth/get-session call hits MongoDB directly.
    //
    // TTL strategy: 60 seconds
    //   • Reads are frequent (every route render) but writes are rare (login,
    //     profile update). 60 s is a safe window: stale data is at most 1 min
    //     old, Redis memory stays bounded, and Upstash free-tier limits are
    //     never approached.
    //   • On sign-out, Better Auth calls secondaryStorage.delete(), so the key
    //     is evicted immediately — no stale "logged-in" cache after logout.
    //   • On user profile writes (e.g. currency change) the cache key is deleted
    //     too, so the next get-session re-hydrates from MongoDB and re-caches.
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60, // seconds — drives the TTL passed to secondaryStorage.set
        },
        // ── CRITICAL: database fallback on Redis cache miss ───────────────────
        // Without this flag Better Auth's findSession() hits the early-return
        // branch when secondaryStorage.get() returns null (i.e. Redis key has
        // expired) and never falls back to MongoDB — forcing the user to sign in
        // every 60 seconds. With storeSessionInDatabase: true the adapter checks
        // MongoDB whenever Redis returns null, re-warming the Redis cache on the
        // next write, giving the user a seamless session for the full session TTL.
        storeSessionInDatabase: true,
    },

    // ── Redis Secondary Storage ───────────────────────────────────────────────
    // Stores the session cache server-side in Upstash Redis so no session data
    // ever touches the browser cookie (avoids the 4 KB cookie size limit).
    // Upstash auto-expires keys via the `ex` option — no manual cleanup needed.
    // ── In-Flight Request Deduplication Map ─────────────────────────────────────
    // Deduplicates simultaneous/concurrent read requests for the exact same cache key.
    // If multiple requests arrive concurrently before the first Redis fetch resolves,
    // they share the same pending Promise instead of issuing multiple Redis calls.
    secondaryStorage: (() => {
        const inFlightGets = new Map<string, Promise<string | null>>();

        return {
            get: async (key: string) => {
                if (inFlightGets.has(key)) {
                    return inFlightGets.get(key)!;
                }

                const promise = (async () => {
                    try {
                        const value = await redis.get<string>(key);
                        return value ?? null;
                    } finally {
                        inFlightGets.delete(key);
                    }
                })();

                inFlightGets.set(key, promise);
                return promise;
            },
            set: async (key: string, value: string, ttl?: number) => {
                // Use the TTL Better Auth passes in (= full session expiry duration,
                // e.g. 7 days). Previously this was capped at 60 s which matched the
                // cookieCache maxAge, making Redis expire at the same time as the
                // cookie — so the MongoDB fallback (storeSessionInDatabase) never
                // had a live Redis key to warm from either. Now we keep the key alive
                // for the full session lifetime (max 7 days for Upstash free-tier safety).
                const SEVEN_DAYS = 7 * 24 * 60 * 60;
                const effectiveTtl = ttl ? Math.min(ttl, SEVEN_DAYS) : SEVEN_DAYS;
                await redis.set(key, value, { ex: effectiveTtl });
            },
            delete: async (key: string) => {
                inFlightGets.delete(key);
                await redis.del(key);
            },
        };
    })(),
});
