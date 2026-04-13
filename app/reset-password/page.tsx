"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
        setError("Invalid reset link");
        return;
    }

    setLoading(true);
    setError("");

    try {
      await authClient.resetPassword({
        newPassword: password,
        token: token || "", 
      }, {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (ctx) => {
          setError(ctx.error.message || "Failed to reset password.");
        }
      });
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
        <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">Invalid Link</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">The reset link is invalid or has expired.</p>
          <Link href="/forgot-password" title="Forgot Password" className="inline-block text-blue-600 hover:underline">Try again</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">Reset Password</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Enter your new password below
          </p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900/50 text-center">
              Password reset successfully!
            </div>
            <Link
              href="/sign-in"
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 py-2"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none dark:text-zinc-300" htmlFor="password">
                New Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none dark:text-zinc-300" htmlFor="confirm-password">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 py-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-blue-500/20"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
