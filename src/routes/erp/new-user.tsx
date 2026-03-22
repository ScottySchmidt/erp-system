import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { database, t } from "#/lib/database";
import { supabaseBrowser } from "#/lib/supabaseBrowser";

export const Route = createFileRoute("/erp/new-user")({
  component: Register,
});

type Status = "idle" | "loading" | "success" | "error";

const ROLE_OPTIONS = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Accounting" },
  { id: 3, label: "Manager" },
  { id: 4, label: "Employee" },
  { id: 5, label: "Read Only" },
] as const;

const DEPT_OPTIONS = [
  { id: 1, label: "Accounting" },
  { id: 2, label: "Finance" },
  { id: 3, label: "Human Resources" },
  { id: 4, label: "Information Technology" },
  { id: 5, label: "Procurement" },
  { id: 6, label: "Operations" },
] as const;

const parseRequiredInt = (value: string, fieldLabel: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Please select a valid ${fieldLabel}.`);
  }
  return parsed;
};

const createUserRecord = createServerFn({ method: "POST" })
  .middleware([database])
  .handler(async ({ data, context }) => {
    const payload = data as {
      full_name: string;
      role_id: number;
      dept_id: number;
    };

    await context.db.insert(t.users).values({
      user_id: payload.user_id,
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      if (!supabaseBrowser) {
        throw new Error("Supabase is not configured. Check environment variables.");
      }

      const roleId = parseRequiredInt(form.role_id, "role");
      const deptId = parseRequiredInt(form.dept_id, "department");

      const { data: authData, error: authError } = await supabaseBrowser.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { name: form.name.trim() },
        },
      });

      if (authError) {
        throw authError;
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("Signup succeeded but no auth user id was returned.");
      }

      await createUserRecord({
        data: {
          role_id: roleId,
          dept_id: deptId,
          full_name: "Scott Schmidt"
        },
      });

      setStatus("success");
      setMessage(
        authData.session
          ? "User registered successfully. You can now sign in."
          : "User registered. Check your email to confirm your account, then sign in.",
      );
      setForm({ name: "", email: "", password: "", role_id: "", dept_id: "" });
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] px-4 py-10 text-slate-100">
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
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                >
                  <option value="">Select role</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.id} value={String(role.id)}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Department">
                <select
                  name="dept_id"
                  value={form.dept_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                >
                  <option value="">Select department</option>
                  {DEPT_OPTIONS.map((dept) => (
                    <option key={dept.id} value={String(dept.id)}>
                      {dept.label}
                    </option>
                  ))}
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
              {status === "loading" ? "Creating account..." : "Create account"}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span className="text-slate-300">{label}</span>
      {children}
    </label>
  );
}
