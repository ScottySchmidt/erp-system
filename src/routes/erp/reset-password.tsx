import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/erp/reset-password")({
  component: ResetPassword,
});

const sendResetEmail = createServerFn()
  .validator((data: { email: string; redirectTo?: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email?.trim().toLowerCase();
    if (!email) {
      throw new Error("Email is required");
    }

    const redirectTo = data.redirectTo;

    // Verify the user exists using admin privileges
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    if (userError || !userData?.user) {
      throw new Error("Email not found");
    }

    // Send Supabase-managed reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      throw error;
    }

    return { ok: true };
  });

type Status = "idle" | "loading" | "success" | "error";

function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const redirectTo = `${window.location.origin}/erp/login`;
      await sendResetEmail({ data: { email, redirectTo } });

      setStatus("success");
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Unable to send reset email");
    } finally {
      setStatus((prev) => (prev === "success" ? prev : "idle"));
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.1em] text-slate-300">
            ERP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the email associated with your account and we&apos;ll send a reset link.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              <span className="text-slate-300">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                placeholder="you@company.com"
              />
            </label>

            {message && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  status === "success"
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                    : "border-red-400/40 bg-red-400/10 text-red-100"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-400">
            Remembered your password?{" "}
            <button
              type="button"
              onClick={() => navigate({ to: "/erp/login" })}
              className="font-semibold text-cyan-200 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
