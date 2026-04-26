import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

// Simple in-memory rate limiter for Edge Runtime
const requestCounts = new Map<string, { count: number, resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

async function handleRateLimit(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    if (Math.random() < 0.1) {
        const now = Date.now();
        for (const [key, value] of requestCounts.entries()) {
            if (value.resetTime < now) requestCounts.delete(key);
        }
    }

    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || entry.resetTime < now) {
        requestCounts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
        return null;
    }

    if (entry.count >= MAX_REQUESTS) {
        return new NextResponse(
            JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded.' }), 
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
    }

    entry.count += 1;
    requestCounts.set(ip, entry);
    return null;
}


export default async function proxy(request: NextRequest) {
    const rateLimitResponse = await handleRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const publicPaths = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/verify-email', '/api/auth', '/logo.png', '/icon.png', '/manifest.webmanifest'];
    const isPublicRoute = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

    // If it's a public route, don't try to fetch session to avoid infinite loop
    if (isPublicRoute) {
        return NextResponse.next();
    }

    const { data: session } = await betterFetch<any>(
        "/api/auth/get-session",
        {
            baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            headers: {
                cookie: request.headers.get("cookie") || "",
            },
        },
    );

    if (!session) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.next();
}


export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
