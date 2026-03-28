import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";

import { DashboardLayout } from "#/components/layout/dashboard";
import { useAuthInfoQuery } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";

export const Route = createFileRoute("/test")({
  component: TestPage,
});

export const fetchVersionFn = createServerFn()
  .middleware([DatabaseProvider])
  .handler(async ({ context }) => {
    return await context.db
      .execute<{ version: string }>(sql`select version()`)
      .then((rows) => rows[0].version);
  });

function TestPage() {
  const dbVersion = useQuery({
    queryKey: ["#!/debug/db-version"],
    queryFn: fetchVersionFn,
  });

  const authInfo = useAuthInfoQuery();

  return (
    <DashboardLayout title="App State Test">
      <section className="flex flex-col gap-5">
        <div className="flex gap-3">
          <button
            onClick={() => {
              void dbVersion.refetch();
              void authInfo.refetch();
            }}
            className="cursor-pointer rounded-lg border border-cyan-700/30 bg-cyan-950 px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-gray-700 p-4">
          <h2 className="text-xl font-semibold">Database</h2>
          <p className="mt-2">{dbVersion.error?.message}</p>

          <pre className="mt-4 overflow-auto rounded bg-gray-800 p-3 text-sm whitespace-pre-wrap">
            {dbVersion.isFetching ? "Loading..." : dbVersion.data}
          </pre>
        </div>

        <div className="rounded-xl border border-gray-700 p-4">
          <h2 className="text-xl font-semibold">Auth</h2>
          <p className="mt-2">{authInfo.error?.message}</p>

          <pre className="mt-4 overflow-auto rounded bg-gray-800 p-3 text-sm whitespace-pre-wrap">
            {authInfo.isFetching ? "Loading..." : JSON.stringify(authInfo.data, null, 2)}
          </pre>
        </div>
      </section>
    </DashboardLayout>
  );
}
