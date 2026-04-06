import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { desc, eq } from "drizzle-orm";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

export const Route = createFileRoute("/erp/vendor/")({
  component: VendorListPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: async () => getVendors({}),
});

type Vendor = {
  vendor_id: number;
  vendor_name: string;
  vendor_address: string | null;
};

const getVendors = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const data = await context.db
      .select({
        vendor_id: t.vendor.vendor_id,
        vendor_name: t.vendor.vendor_name,
        vendor_address: t.vendor.vendor_address,
      })
      .from(t.vendor)
      .orderBy(desc(t.vendor.vendor_id));

    return data;
  });

function VendorListPage() {
  const navigate = useNavigate();
  const vendors = Route.useLoaderData() as Vendor[];
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  return (
    <DashboardLayout title="Vendors">
      {loading && <LoadingOverlay label="Loading vendors..." />}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Vendor Directory</h2>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
              onClick={() => navigate({ to: "/erp/vendor/new" })}
            >
              + New Vendor
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
         <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
            <span>Showing {vendors.length} vendors</span>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="text-slate-300">
                <tr>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Vendor #</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Name</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Address</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                      No vendors yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.vendor_id} className="hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2 font-semibold">
                        {vendor.vendor_id}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">{vendor.vendor_name}</td>
                      <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                        {vendor.vendor_address || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-6 py-5 text-sm text-slate-100 shadow-lg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/60 border-t-transparent" />
        <span>{label}</span>
      </div>
    </div>
  );
}
