import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabaseBrowser } from "#/lib/supabaseBrowser";
import z from "zod";

export const Route = createFileRoute("/erp/reset-password")({
  component: ResetPassword,
});

type Status = "idle" | "loading" | "success" | "error";
type Step = "request" | "password" | "done";

const EmailSchema = z.object({ email: z.string().email() });
const PasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match" });

function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<Step>("request");

  // Detect recovery link (access_token in hash). If present, set session and move to password step.
  useEffect(() => {
    if (!supabaseBrowser) return;
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (type === "recovery" && access_token && refresh_token) {
      supabaseBrowser.auth
        .setSession({ access_token, refresh_token })
        .then(() => setStep("password"))
        .catch((err) => {
          setStatus("error");
          setMessage(err?.message ?? "Could not initialize reset session");
        });
    }
  }, []);

  const canRequest = useMemo(() => EmailSchema.safeParse({ email }).success, [email]);

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabaseBrowser) {
      setMessage("Supabase client not configured.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const parsed = EmailSchema.parse({ email });
      const redirectTo = `${window.location.origin}/erp/reset-password`;
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(parsed.email, {
        redirectTo,
      });
      if (error) throw error;
      setStatus("success");
      setMessage("Reset email sent. Check your inbox and follow the link.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Unable to send reset email");
    } finally {
      setStatus((prev) => (prev === "success" ? "success" : "idle"));
    }
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabaseBrowser) {
      setMessage("Supabase client not configured.");
      setStatus("error");
      return;
    }
    const parsed = PasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setStatus("error");
      setMessage(parsed.error.errors[0]?.message ?? "Invalid password");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const { error } = await supabaseBrowser.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      setStatus("success");
      setStep("done");
      setMessage("Password updated. Redirecting to login...");
      setTimeout(() => navigate({ to: "/erp/login" }), 1500);
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Unable to update password");
    } finally {
      setStatus((prev) => (prev === "success" ? "success" : "idle"));
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
            {step === "request"
              ? "Enter your email to receive a reset link."
              : "Enter your new password."}
          </p>

          {step === "request" && (
            <form className="mt-6 space-y-4" onSubmit={handleRequest}>
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
                disabled={status === "loading" || !canRequest}
                className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form className="mt-6 space-y-4" onSubmit={handlePassword}>
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="text-slate-300">New password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span className="text-slate-300">Confirm password</span>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
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
                {status === "loading" ? "Updating…" : "Update password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="mt-6 space-y-3 text-sm text-slate-200">
              <div className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-emerald-100">
                Password updated. Redirecting to login...
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/erp/login" })}
                className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:opacity-95"
              >
                Go to login now
              </button>
            </div>
          )}

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
