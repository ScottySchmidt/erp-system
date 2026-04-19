import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { desc, eq } from "drizzle-orm";

import { supabaseBrowser } from "#/lib/supabaseBrowser";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

const getDashboardData = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const invoices = await context.db
      .select()
      .from(t.invoices)
      .where(eq(t.invoices.user_id, context.auth.profile.user_id))
      .orderBy(desc(t.invoices.invoice_id));

    const vendors = await context.db
      .select()
      .from(t.vendor)
      .orderBy(desc(t.vendor.vendor_id));

    return { invoices, vendors };
  });

export const Route = createFileRoute("/erp/dashboard")({
  component: Dashboard,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getDashboardData(),
});

type Invoice = Record<string, any>;
type Vendor = Record<string, any>;

function Dashboard() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData() as {
    invoices: Invoice[];
    vendors: Vendor[];
  };
  const [invoices, _setInvoices] = useState<Invoice[]>(loaderData.invoices);
  const [vendors, _setVendors] = useState<Vendor[]>(loaderData.vendors);
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | number | null>(null);
  const loading = false;

  const vendorMap = useMemo(() => {
    const map = new Map<number, string>();
    vendors.forEach((v) => map.set(v.vendor_id, v.vendor_name));
    return map;
  }, [vendors]);

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? inv.amount ?? inv.total_amount ?? 0),
      0,
    );
    const paidInvoices = invoices.filter((inv) => (inv.status ?? "draft") === "paid").length;
    const conversionRate = totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0;
    const totalCustomers = new Set(invoices.map((inv) => inv.vendor_id).filter(Boolean)).size;
    return { totalInvoices, totalRevenue, paidInvoices, conversionRate, totalCustomers };
  }, [invoices]);

  async function updateInvoiceStatus(invoice: Invoice, newStatus: string) {
    const invoiceId = invoice.id ?? invoice.invoice_id ?? invoice.invoice_number;
    if (!invoiceId) return;

    setUpdatingInvoiceId(invoiceId);
    try {
      if (supabaseBrowser && invoice.id) {
        const { error } = await supabaseBrowser
          .from("invoices")
          .update({ status: newStatus })
          .eq("id", invoice.id);
        if (error) throw error;
      } else {
        const stored: Invoice[] = JSON.parse(localStorage.getItem("erp_invoices") ?? "[]");
        const updated = stored.map((inv) => {
          const curr = inv.id ?? inv.invoice_id ?? inv.invoice_number;
          return curr === invoiceId ? { ...inv, status: newStatus } : inv;
        });
        localStorage.setItem("erp_invoices", JSON.stringify(updated));
      }

      _setInvoices((prev) =>
        prev.map((inv) => {
          const curr = inv.id ?? inv.invoice_id ?? inv.invoice_number;
          return curr === invoiceId ? { ...inv, status: newStatus } : inv;
        }),
      );
    } catch (err) {
      console.error("Failed to update invoice status", err);
      alert("Failed to update invoice status.");
    } finally {
      setUpdatingInvoiceId(null);
    }
  }

  function handleLogout() {
    sessionStorage.clear();
    void navigate({ to: "/auth/login" });
  }

  function exportData() {
    const report = {
      export_date: new Date().toISOString(),
      summary: {
        total_invoices: invoices.length,
        total_customers: stats.totalCustomers,
        total_revenue: stats.totalRevenue,
        paid_invoices: stats.paidInvoices,
        conversion_rate: `${stats.conversionRate}%`,
      },
      invoices,
    };

    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  }

  const recentInvoices = invoices.slice(0, 5);
  const displayedInvoices = showAllInvoices ? invoices : recentInvoices;

  return (
    <DashboardLayout title="Finance Control Center">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
            <div>
              <div className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.1em] text-slate-300">
                ERP
              </div>
              <h1 className="mt-2 text-xl font-semibold">Finance Control Center</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
              onClick={() => navigate({ to: "/invoice/new" })}
            >
              + New Invoice
            </button>
            <button
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
              onClick={() => navigate({ to: "/erp/vendor/new" })}
            >
              + New Vendor
            </button>
            <button
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-400">
            Track revenue, monitor invoice health, and generate invoices from this unified hub.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Invoices" value={stats.totalInvoices.toString()} />
          <StatCard
            label="Revenue"
            value={`$${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
          <StatCard label="Customers" value={stats.totalCustomers.toString()} />
          <StatCard label="Conversion" value={`${stats.conversionRate}%`} />
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold">Status Overview</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>Paid</span>
                <span className="font-semibold">
                  {invoices.filter((i) => i.status === "paid").length}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Draft</span>
                <span className="font-semibold">
                  {invoices.filter((i) => i.status === "draft" || !i.status).length}
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={() => navigate({ to: "/erp/invoice" })}
              >
                New Invoice
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={() => navigate({ to: "/erp/vendor/new" })}
              >
                New Vendor
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={() => navigate({ to: "/erp/accounts" })}
              >
                Accounts
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={() => navigate({ to: "/erp/new-voucher" })}
              >
                New Voucher
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={exportData}
              >
                Export Data
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Previous Vouchers / Bills</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                Showing {displayedInvoices.length} of {invoices.length}
              </span>
              {invoices.length > 5 && (
                <button
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                  onClick={() => setShowAllInvoices((prev) => !prev)}
                >
                  {showAllInvoices ? "Show Recent Only" : "View All Previous Bills"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Invoice #
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Customer
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Date
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Amount
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      Loading invoices...
                    </td>
                  </tr>
                ) : displayedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      No invoices yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  displayedInvoices.map((invoice, idx) => {
                    const invoiceId = invoice.id ?? invoice.invoice_id ?? invoice.invoice_number;
                    const currentStatus = invoice.status ?? "draft";

                    return (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2 font-semibold">
                        {invoice.invoice_number ?? invoice.invoice_id ?? "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        {vendorMap.get(invoice.vendor_id) ?? "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                        {invoice.date
                          ? new Date(invoice.date).toLocaleDateString()
                          : invoice.created_at
                            ? new Date(invoice.created_at).toLocaleDateString()
                            : "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        ${Number(invoice.total ?? invoice.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        <select
                          value={currentStatus}
                          disabled={updatingInvoiceId === invoiceId}
                          onChange={(e) => void updateInvoiceStatus(invoice, e.target.value)}
                          className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold capitalize text-slate-100 outline-none"
                        >
                          <option value="draft" className="text-black">
                            Draft
                          </option>
                          <option value="sent" className="text-black">
                            Sent
                          </option>
                          <option value="paid" className="text-black">
                            Paid
                          </option>
                        </select>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
