import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { supabase } from "#/lib/supabase";

export const Route = createFileRoute("/supabase-test")({
  component: SupabaseTestPage,
});

export const fetchRows = createServerFn().handler(async () => {
  const response = await supabase.from("invoices").select("*").limit(5);

  if (response.error) {
    throw response.error;
  }

  return response.data;
});

function SupabaseTestPage() {
  const [status, setStatus] = useState("Not tested yet");
  const [details, setDetails] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  const testConnection = async () => {
    setStatus("Testing database...");
    setDetails("");
    setRows([]);

    try {
      const data = await fetchRows();

      setStatus("Supabase database connected");
      setDetails(`Returned ${data?.length ?? 0} row(s)`);
      setRows(data ?? []);
    } catch (err) {
      setStatus("Connection failed");
      setDetails(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <main className="page-wrap px-4 pt-14 pb-8">
      <section className="island-shell rounded-4xl px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Test Page</p>
        <h1 className="mb-5 text-4xl font-bold text-(--sea-ink)">Supabase Database Test</h1>

        <div className="mb-6 flex gap-3">
          <button
            onClick={testConnection}
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
          <p className="mt-2">{status}</p>
          <pre className="mt-4 overflow-auto rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap">
            {details}
          </pre>
          <pre className="mt-4 overflow-auto rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap">
            {JSON.stringify(rows, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
