import { auth } from "./auth";

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Returns the current session by validating the request headers.
 * BetterAuth's cookie cache handles short-term reuse (5min TTL)
 * so this avoids repeated DB hits on serverless.
 */
export async function getSession(headers: Headers): Promise<Session | null> {
  return auth.api.getSession({ headers });
}