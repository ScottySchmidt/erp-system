import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { useEffect, useState } from "react";
import * as v from "valibot";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfNotAdmin } from "#/lib/auth";

const ADMIN_ACCESS_STORAGE_KEY = "erp_admin_access_unlocked";

const AdministrationAccessSchema = v.object({
  password: v.pipe(v.string(), v.nonEmpty("Administration password is required.")),
});

const verifyAdministrationAccessFn = createServerFn({ method: "POST" })
  .middleware([MustAuthenticate])
  .inputValidator(AdministrationAccessSchema)
  .handler(({ data, context }) => {
    if (context.auth.profile.role_id !== 1) {
      throw new Error("Administration access is only available to approved admins.");
    }

    const configuredPassword =
      env?.ADMIN_ACCESS_PASSWORD ??
      process.env.ADMIN_ACCESS_PASSWORD ??
      env?.ADMIN_CREATE_SECRET ??
      process.env.ADMIN_CREATE_SECRET ??
      "";

    if (!configuredPassword.trim()) {
      throw new Error(
        "Administration access is not configured. Set ADMIN_ACCESS_PASSWORD on the server.",
      );
    }

    if (data.password.trim() !== configuredPassword.trim()) {
      throw new Error("Incorrect administration password.");
    }

    return { ok: true };
  });

export const Route = createFileRoute("/erp/admin")({
  component: AdministrationPage,
  beforeLoad: async ({ context }) => {
    await redirectIfNotAdmin(context);
  },
});

function AdministrationPage() {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    setIsUnlocked(window.sessionStorage.getItem(ADMIN_ACCESS_STORAGE_KEY) === "true");
  }, []);

  const accessMutation = useMutation({
    mutationFn: verifyAdministrationAccessFn,
    onSuccess() {
      window.sessionStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, "true");
      setIsUnlocked(true);
      setPassword("");
    },
  });

  return (
    <DashboardLayout title="Administration">
      <section className="space-y-5">
        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/12 via-slate-950/55 to-slate-900/80 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="inline-flex rounded-full border border-amber-300/30 px-3 py-1 text-xs tracking-[0.14em] text-amber-100">
            RESTRICTED ACCESS
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Administration</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Advanced operational controls for trusted administrators. This area is protected by
            both account role and an additional password.
          </p>
        </div>

        {!isUnlocked ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold">Unlock administration tools</h3>
            <p className="mt-1 text-sm text-slate-400">
              Enter the administration password to open protected controls.
            </p>

            <form
              className="mt-5 flex flex-col gap-4 sm:max-w-md"
              onSubmit={(event) => {
                event.preventDefault();
                void accessMutation.mutateAsync({ data: { password } });
              }}
            >
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-200">Administration password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-100 outline-none transition focus:border-amber-300/40"
                  placeholder="Enter protected access password"
                />
              </label>

              {accessMutation.error ? (
                <p className="text-sm text-red-300">{accessMutation.error.message}</p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={accessMutation.isPending}
                  className="rounded-xl border border-amber-300/30 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200/50 hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {accessMutation.isPending ? "Checking..." : "Unlock administration"}
                </button>
                <Link
                  to="/erp/dashboard"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  Back to dashboard
                </Link>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <AdminCard
              title="User Directory"
              description="Review active users and recent sign-in activity."
              to="/erp/users"
              actionLabel="Open users"
            />
            <AdminCard
              title="Settings"
              description="Manage sessions and account-level security controls."
              to="/settings"
              actionLabel="Open settings"
            />
            <AdminCard
              title="Diagnostics"
              description="Open internal test and troubleshooting tools for deeper checks."
              to="/test"
              actionLabel="Open diagnostics"
            />
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

interface AdminCardProps {
  title: string;
  description: string;
  to: "/erp/users" | "/settings" | "/test";
  actionLabel: string;
}

function AdminCard(props: AdminCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <h3 className="text-lg font-semibold">{props.title}</h3>
      <p className="mt-2 text-sm text-slate-400">{props.description}</p>
      <Link
        to={props.to}
        className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:text-white"
      >
        {props.actionLabel}
      </Link>
    </div>
  );
}
