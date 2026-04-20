import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { asc } from "drizzle-orm";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

type UserRow = {
  user_id: number;
  full_name: string;
};

const getUsers = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const users = await context.db
      .select({
        user_id: t.users.user_id,
        full_name: t.users.full_name,
      })
      .from(t.users)
      .orderBy(asc(t.users.user_id));

    return users ?? [];
  });

export const Route = createFileRoute("/erp/users")({
  component: UsersPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getUsers(),
});

function UsersPage() {
  const users = Route.useLoaderData() as UserRow[];

  return (
    <DashboardLayout title="Users">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="mt-1 text-sm text-slate-400">
          Showing all users from Supabase (<code>user_id</code> and <code>full_name</code>).
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">User ID</th>
                <th className="px-3 py-2 text-left">Full Name</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="border-t border-white/10 text-slate-100">
                    <td className="px-3 py-2">{user.user_id}</td>
                    <td className="px-3 py-2">{user.full_name}</td>
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
