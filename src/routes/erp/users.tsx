import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq, sql } from "drizzle-orm";
import { useMemo, useState } from "react";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfNotAdmin } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { deleteUserByAdminFn } from "#/lib/user-admin";

type UserRow = {
  user_id: number;
  auth_id: string;
  role_id: number | null;
  full_name: string;
  email: string;
  last_login_at: string | null;
  created_at: string;
};

const getUsers = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const users = await context.db
      .select({
        user_id: t.users.user_id,
        auth_id: t.users.auth_id,
        role_id: t.users.role_id,
        full_name: t.users.full_name,
        email: t.users.email,
        last_login_at: sql<string | null>`max(${t.auth_sessions.updated_at})`,
        created_at: t.users.created_at,
      })
      .from(t.users)
      .leftJoin(t.auth_sessions, eq(t.auth_sessions.user_id, t.users.auth_id))
      .groupBy(t.users.user_id, t.users.full_name, t.users.created_at)
      .orderBy(asc(t.users.user_id));

    return users ?? [];
  });

export const Route = createFileRoute("/erp/users")({
  component: UsersPage,
  beforeLoad: async ({ context }) => {
    await redirectIfNotAdmin(context);
  },
  loader: () => getUsers(),
});

function UsersPage() {
  const router = useRouter();
  const users = Route.useLoaderData() as UserRow[];
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmationSentence, setConfirmationSentence] = useState("");
  const expectedConfirmation = useMemo(
    () => (selectedUser ? `DELETE USER ${selectedUser.user_id}` : ""),
    [selectedUser],
  );

  const deleteUserMutation = useMutation({
    mutationFn: deleteUserByAdminFn,
    onSuccess: () => {
      setSelectedUser(null);
      setAdminPassword("");
      setConfirmationSentence("");
      void router.invalidate();
    },
  });

  const formatLastSeen = (lastLoginAt: string | null) => {
    if (!lastLoginAt) return "Never";

    const lastLoginTime = new Date(lastLoginAt).getTime();
    if (Number.isNaN(lastLoginTime)) return "Unknown";

    const diffMs = Date.now() - lastLoginTime;
    if (diffMs < 0) return "Just now";

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return "Just now";
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
    return `${Math.floor(diffMs / day)}d ago`;
  };

  return (
    <DashboardLayout title="Users">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        
        

        {selectedUser ? (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4">
            <h3 className="text-sm font-semibold text-red-100">
              Delete User: {selectedUser.full_name}
            </h3>
            <p className="mt-1 text-xs text-red-100/80">
              This action permanently deletes the user account and related records.
            </p>
            <p className="mt-2 text-xs text-red-100/80">
              Type exactly: <code>{expectedConfirmation}</code>
            </p>

            <form
              className="mt-3 grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void deleteUserMutation.mutateAsync({
                  data: {
                    userId: selectedUser.user_id,
                    password: adminPassword,
                    confirmationSentence,
                  },
                });
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-200">Admin password</span>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-red-300/50"
                  placeholder="Enter admin password"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-200">Confirmation sentence</span>
                <input
                  type="text"
                  value={confirmationSentence}
                  onChange={(event) => setConfirmationSentence(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-red-300/50"
                  placeholder={expectedConfirmation}
                />
              </label>

              <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={deleteUserMutation.isPending}
                  className="rounded-lg border border-red-300/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteUserMutation.isPending ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setAdminPassword("");
                    setConfirmationSentence("");
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20"
                >
                  Cancel
                </button>
              </div>

              {deleteUserMutation.error ? (
                <p className="md:col-span-2 text-sm text-red-200">
                  {deleteUserMutation.error.message}
                </p>
              ) : null}
            </form>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">User ID</th>
                <th className="px-3 py-2 text-left">Full Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Last Login</th>
                <th className="px-3 py-2 text-left">Last Seen</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="border-t border-white/10 text-slate-100">
                    <td className="px-3 py-2">{user.user_id}</td>
                    <td className="px-3 py-2">{user.full_name}</td>
                    <td className="px-3 py-2 text-slate-300">{user.email}</td>
                    <td className="px-3 py-2 text-slate-300">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString()
                        : `Never (created ${new Date(user.created_at).toLocaleString()})`}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{formatLastSeen(user.last_login_at)}</td>
                    <td className="px-3 py-2">
                      {Number(user.role_id) === 1 ? (
                        <span className="inline-flex rounded-md border border-slate-400/20 bg-slate-500/10 px-2 py-1 text-xs font-semibold text-slate-300">
                          Admin
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setAdminPassword("");
                            setConfirmationSentence("");
                          }}
                          className="rounded-md border border-red-300/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
