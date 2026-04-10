import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
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
    matcher: ["/"],
};
