import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { supabaseBrowser } from "#/lib/supabaseBrowser";

export const Route = createFileRoute("/erp/dashboard")({
  component: Dashboard,
});

type Invoice = Record<string, any>;
type Customer = Record<string, any>;

function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (!user) {
      navigate({ to: "/erp/login" });
      return;
    }
    void loadData();
  }, [navigate]);

  async function loadData() {
    setLoading(true);
    try {
      if (supabaseBrowser) {
        const [invoiceRes, customerRes] = await Promise.all([
          supabaseBrowser
            .from("invoices")
            .select("*")
            .order("created_at", { ascending: false }),
          supabaseBrowser.from("customers").select("*"),
        ]);

        setInvoices(invoiceRes.data ?? []);
        setCustomers(customerRes.data ?? []);
      } else {
        const localInvoices = JSON.parse(localStorage.getItem("erp_invoices") ?? "[]");
        const localCustomers = JSON.parse(localStorage.getItem("erp_customers") ?? "[]");
        setInvoices(localInvoices);
        setCustomers(localCustomers);
      }
    } catch {
      const localInvoices = JSON.parse(localStorage.getItem("erp_invoices") ?? "[]");
      const localCustomers = JSON.parse(localStorage.getItem("erp_customers") ?? "[]");
      setInvoices(localInvoices);
      setCustomers(localCustomers);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? inv.amount ?? inv.total_amount ?? 0),
      0,
    );
    const paidInvoices = invoices.filter((inv) => inv.status === "paid").length;
    const conversionRate = totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0;
    return { totalInvoices, totalRevenue, paidInvoices, conversionRate };
  }, [invoices]);

  function handleLogout() {
    sessionStorage.clear();
    navigate({ to: "/erp/login" });
  }

  function exportData() {
    const dataStr = JSON.stringify({ invoices, customers }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `erp-data-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  }

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
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
              onClick={() => navigate({ to: "/erp/invoice" })}
            >
              + New Invoice
            </button>
            <button
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

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
          <StatCard label="Customers" value={customers.length.toString()} />
          <StatCard label="Conversion" value={`${stats.conversionRate}%`} />
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold">Status Overview</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>Paid</span>
                <span className="font-semibold">{invoices.filter((i) => i.status === "paid").length}</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>Sent</span>
                <span className="font-semibold">{invoices.filter((i) => i.status === "sent").length}</span>
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
                onClick={exportData}
              >
                Export Data
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={loadData}
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Invoices</h3>
            <span className="text-sm text-slate-400">
              Showing {recentInvoices.length} of {invoices.length}
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">Invoice #</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">Customer</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">Date</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">Amount</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      Loading invoices…
                    </td>
                  </tr>
                ) : recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      No invoices yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((invoice, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2 font-semibold">
                        {invoice.invoice_number ?? invoice.invoice_id ?? "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        {invoice.customer ?? invoice.vendor_id ?? "—"}
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
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize">
                          {invoice.status ?? "draft"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
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
