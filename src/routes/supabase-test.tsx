import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";

import { DatabaseProvider } from "#/lib/provider";

export const Route = createFileRoute("/supabase-test")({
  component: SupabaseTestPage,
});

export const fetchVersionFn = createServerFn()
  .middleware([DatabaseProvider])
  .handler(async ({ context }) => {
    return await context.db.execute<{ version: string }>(sql`select version()`);
  });

function SupabaseTestPage() {
  const fetchVersionMut = useMutation({
    mutationFn: fetchVersionFn,
  });

  return (
    <main className="page-wrap px-4 pt-14 pb-8">
      <section className="island-shell rounded-4xl px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Test Page</p>
        <h1 className="mb-5 text-4xl font-bold text-(--sea-ink)">Supabase Database Test</h1>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => fetchVersionMut.mutate({})}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-(--lagoon-deep) transition hover:-translate-y-0.5"
          >
            Run Database Test
          </button>

          <Link
            to="/"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-(--sea-ink) no-underline"
          >
            Back Home
          </Link>
        </div>

        <div className="rounded-xl border p-4">
          <h2 className="text-xl font-semibold">Status</h2>
          <p className="mt-2">{fetchVersionMut.error?.message}</p>

          <pre className="mt-4 overflow-auto rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap">
            {fetchVersionMut.isPending ? "Loading..." : fetchVersionMut.data?.[0]?.version}
          </pre>
        </div>
      </section>
    </main>
  );
}
