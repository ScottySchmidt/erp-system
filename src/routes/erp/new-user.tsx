import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

import { database, t } from "#/lib/database";
import { supabaseBrowser } from "#/lib/supabaseBrowser";

export const Route = createFileRoute("/erp/new-user")({
  component: Register,
});

type Status = "idle" | "loading" | "success" | "error";

const createUserRecord = createServerFn({ method: "POST" })
  .middleware([database])
  .handler(async ({ data, context }) => {
    const payload = data as { role_id: number | null; dept_id: number | null };

    await context.db.insert(t.users).values({
      role_id: payload.role_id,
      dept_id: payload.dept_id,
    });
  });

function Register() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "",
    dept_id: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      if (!supabaseBrowser) {
        throw new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      }

      const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            name: form.name.trim(),
          },
        },
      });

      if (authError) {
        throw authError;
      }

      await createUserRecord({
        data: {
          role_id: form.role_id ? Number(form.role_id) : null,
          dept_id: form.dept_id ? Number(form.dept_id) : null,
        },
      });

      setStatus("success");
      setMessage(
        authData.session
          ? "User registered successfully. You can now sign in."
          : "User registered. Check your email to confirm your account, then sign in.",
      );
      setForm({ name: "", email: "", password: "", role_id: "", dept_id: "" });
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Something went wrong");
    } finally {
      setStatus((prev) => (prev === "success" ? prev : "idle"));
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.1em] text-slate-300">
            ERP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="mt-2 text-sm text-slate-400">Set up your access to the finance workspace.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Field label="Full name">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
              />
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role">
                <select
                  name="role_id"
                  value={form.role_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                >
                  <option value="">Select role</option>
                  <option value="1">Admin</option>
                  <option value="2">Accounting</option>
                  <option value="3">Manager</option>
                  <option value="4">Employee</option>
                  <option value="5">Read Only</option>
                </select>
              </Field>
              <Field label="Department">
                <select
                  name="dept_id"
                  value={form.dept_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                >
                  <option value="">Select department</option>
                  <option value="1">Accounting</option>
                  <option value="2">Finance</option>
                  <option value="3">Human Resources</option>
                  <option value="4">Information Technology</option>
                  <option value="5">Procurement</option>
                  <option value="6">Operations</option>
                </select>
              </Field>
            </div>

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
              {status === "loading" ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-400">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate({ to: "/erp/login" })}
              className="font-semibold text-cyan-200 hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span className="text-slate-300">{label}</span>
      {children}
    </label>
  );
}
