import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { Resend } from "resend";

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
        globalWithMongo._mongoClient = new MongoClient(MONGODB_URI);
    }
    client = globalWithMongo._mongoClient;
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(MONGODB_URI);
}

const db = client.db();
const resend = new Resend(process.env.RESEND_API_KEY!);

export const auth = betterAuth({
    database: mongodbAdapter(db, {
        transaction: false, // Recommended for local/standard MongoDB setups to prevent hangs
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

            await resend.emails.send({
                from: "TrackBook <onboarding@resend.dev>",
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

            await resend.emails.send({
                from: "TrackBook <onboarding@resend.dev>",
                to: user.email,
                subject: "Verify your email",
                html: `<p>Click <a href="${url}">here</a> to verify your email address. The link will expire in 24 hours.</p><p>If the link doesn't work, copy and paste this direct URL: ${url}</p>`,
            });
        },
    },

    user: {
        additionalFields: {
            walletBalance: {
                type: "number",
                defaultValue: 0,
            },
            currency: {
                type: "string",
                defaultValue: "INR",
            },
        },
    },
});
