import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";
import { useState } from "react";

import { DashboardLayout } from "#/components/layout/dashboard";
import { redirectIfNotAdmin, useAuthInfoQuery } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";

export const Route = createFileRoute("/test")({
  component: TestPage,
  beforeLoad: async ({ context }) => {
    await redirectIfNotAdmin(context);
  },
});

export const fetchVersionFn = createServerFn()
  .middleware([DatabaseProvider])
  .handler(async ({ context }) => {
    return await context.db
      .execute<{ version: string }>(sql`select version()`)
      .then((rows) => rows[0].version);
  });

const UNIT_TEST_FILES = [
  {
    file: "src/tests/invoice-service.test.ts",
    scope: "Invoice service business rules",
    checks: [
      "Calculates subtotal, tax, and total correctly",
      "Validates invalid line-item input",
      "Creates invoice with computed amount",
    ],
    sample: "2 items, mixed tax rates",
    expected: "Total and tax are rounded and persisted correctly",
  },
  {
    file: "src/tests/payment-service.test.ts",
    scope: "Payment/voucher service flow",
    checks: [
      "Creates voucher payment for selected invoices",
      "Marks invoices paid when applicable",
      "Rejects empty/missing/already-paid invoice selections",
    ],
    sample: "Invoice IDs [11,12], pay type cash",
    expected: "1 payment created, 2 invoice links, invoices marked paid",
  },
  {
    file: "src/tests/vendor-service.test.ts",
    scope: "Vendor service validation and create/list behavior",
    checks: [
      "Builds normalized vendor address",
      "Returns existing vendor on duplicate name",
      "Rejects blank vendor name",
    ],
    sample: "Acme Corp + complete address fields",
    expected: "Vendor is created or reused with validated data",
  },
] as const;

type TestingTab = "connection" | "unit";

function TestPage() {
  const dbVersion = useQuery({
    queryKey: ["#!/debug/db-version"],
    queryFn: fetchVersionFn,
  });

  const authInfo = useAuthInfoQuery();
  const [activeTab, setActiveTab] = useState<TestingTab>("connection");

  return (
    <DashboardLayout title="Testing">
      <section className="flex flex-col gap-5">
        <div className="rounded-xl border border-gray-700 p-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("connection")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "connection"
                  ? "bg-cyan-600 text-white"
                  : "border border-gray-600 bg-gray-900 text-slate-200 hover:border-gray-500"
              }`}
            >
              Connection Test
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unit")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "unit"
                  ? "bg-cyan-600 text-white"
                  : "border border-gray-600 bg-gray-900 text-slate-200 hover:border-gray-500"
              }`}
            >
              Unit Test Files
            </button>
          </div>
        </div>

        {activeTab === "connection" ? (
          <>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  void dbVersion.refetch();
                  void authInfo.refetch();
                }}
                className="cursor-pointer rounded-lg border border-cyan-700/30 bg-cyan-950 px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                Refresh Connection Test
              </button>
            </div>

            <div className="rounded-xl border border-gray-700 p-4">
              <h2 className="text-xl font-semibold">Connection Test: Database</h2>
              <p className="mt-2">{dbVersion.error?.message}</p>

              <pre className="mt-4 overflow-auto rounded bg-gray-800 p-3 text-sm whitespace-pre-wrap">
                {dbVersion.isFetching ? "Loading..." : dbVersion.data}
              </pre>
            </div>

            <div className="rounded-xl border border-gray-700 p-4">
              <h2 className="text-xl font-semibold">Connection Test: Auth</h2>
              <p className="mt-2">{authInfo.error?.message}</p>

              <pre className="mt-4 overflow-auto rounded bg-gray-800 p-3 text-sm whitespace-pre-wrap">
                {authInfo.isFetching ? "Loading..." : JSON.stringify(authInfo.data, null, 2)}
              </pre>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-gray-700 p-4">
            <h2 className="text-xl font-semibold">Unit Test Files</h2>
            <p className="mt-2 text-sm text-slate-300">
              Service-level tests available in this project, with what each one verifies:
            </p>
            <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {UNIT_TEST_FILES.map((item) => (
                <li
                  key={item.file}
                  className="rounded-xl border border-gray-700 bg-gray-900/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-cyan-200">{item.file}</p>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                      Unit
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{item.scope}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Checks
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-300">
                    {item.checks.map((check) => (
                      <li key={check}>{check}</li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-lg border border-gray-700 bg-gray-950/70 p-2 text-xs">
                    <p className="text-slate-400">Sample</p>
                    <p className="text-slate-200">{item.sample}</p>
                    <p className="mt-2 text-slate-400">Expected</p>
                    <p className="text-slate-200">{item.expected}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Run locally with <code>npm test</code>.
            </p>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
