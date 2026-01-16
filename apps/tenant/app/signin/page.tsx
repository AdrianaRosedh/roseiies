"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    document.cookie = `rs_session=dev; path=/; SameSite=Lax`;
    router.push("/app");
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Team Sign In</h1>
      <p className="mt-2 text-sm opacity-70">Temporary dev sign-in.</p>

      <button
        onClick={signIn}
        disabled={loading}
        className="mt-8 w-full rounded-xl bg-(--accent) px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </main>
  );
}