"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("That password didn't match. Check with your rides coordinator.");
      return;
    }
    router.push(params.get("callbackUrl") ?? "/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Church Rides</p>
        <h1 className="mt-2 text-2xl font-bold">Admin sign in</h1>
        <p className="mt-1 text-sm text-navy-muted">Enter the shared admin password to continue.</p>
        <div className="mt-6 space-y-3">
          <input
            type="password"
            className="input"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full justify-center" onClick={submit} disabled={busy || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
