"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
    setLoading(false);
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-[10px] font-bold text-red-500 uppercase tracking-widest cursor-pointer hover:opacity-80 mt-0.5 disabled:opacity-50 border-none bg-transparent"
    >
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
