import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { supabaseBrowser } from "#/lib/supabaseBrowser";

export const Route = createFileRoute("/erp/login")({
  component: Login,
});

type Status = "idle" | "loading" | "error";

function Login() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (user) {
      navigate({ to: "/erp/dashboard" });
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      if (supabaseBrowser) {
        const { data, error } = await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          throw error ?? new Error("Login failed");
        }

        storeSession(data.user.email ?? email, data.user.id ?? "unknown");
      } else if (email === "demo@erp.com" && password === "password123") {
        storeSession(email, "demo");
      } else {
        throw new Error("Supabase not configured. Use demo@erp.com / password123");
      }

      navigate({ to: "/erp/dashboard" });
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
      setStatus("error");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.1em] text-slate-300">
            ERP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
          <p className="mt-2 text-sm text-slate-400">
            Access the finance dashboard and invoice tools.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Signing in…" : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function storeSession(email: string, id: string) {
  const userData = {
    email,
    uid: id,
    loggedInAt: new Date().toISOString(),
  };
  sessionStorage.setItem("user", JSON.stringify(userData));
}
