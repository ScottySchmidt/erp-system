import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq, sql } from "drizzle-orm";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfNotAdmin } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

type UserRow = {
  user_id: number;
  full_name: string;
  last_login_at: string | null;
  created_at: string;
};

const getUsers = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const users = await context.db
      .select({
        user_id: t.users.user_id,
        full_name: t.users.full_name,
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
  const users = Route.useLoaderData() as UserRow[];

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
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="mt-1 text-sm text-slate-400">
          Showing users with latest login from <code>auth.sessions</code>.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">User ID</th>
                <th className="px-3 py-2 text-left">Full Name</th>
                <th className="px-3 py-2 text-left">Last Login</th>
                <th className="px-3 py-2 text-left">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="border-t border-white/10 text-slate-100">
                    <td className="px-3 py-2">{user.user_id}</td>
                    <td className="px-3 py-2">{user.full_name}</td>
                    <td className="px-3 py-2 text-slate-300">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString()
                        : `Never (created ${new Date(user.created_at).toLocaleString()})`}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{formatLastSeen(user.last_login_at)}</td>
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
