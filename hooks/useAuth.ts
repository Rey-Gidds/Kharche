"use client";

import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const { data: session, isPending: loading, error } = authClient.useSession();

  return {
    session,
    user: session?.user,
    loading,
    error,
    authenticated: !!session,
  };
}
