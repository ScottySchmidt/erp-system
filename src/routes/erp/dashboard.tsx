import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { desc, eq } from "drizzle-orm";

import { ExpensesChart, type BarChartPoint } from "#/components/charts/expenses-chart";
import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut, useAuthInfoQuery } from "#/lib/auth";
import { DatabaseProvider, SupabaseProvider } from "#/lib/provider";
import { openFinancialReportPdf } from "#/lib/report-pdf";
import { t } from "#/lib/server/database";
import { generateFinancialReport } from "#/lib/server/database/financial-reports";
import { syncInvoicePaidStatusByPaymentDate } from "#/lib/server/database/invoice-payment-status";
import { formatDate } from "#/lib/utils";

const REJECTED_NOTE_PREFIX = "[REJECTED]";
const VOUCHERS_PER_PAGE = 5;

const getDashboardData = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    await syncInvoicePaidStatusByPaymentDate(context.db, context.auth.profile.user_id);

    const [invoices, vouchers, voucherInvoices] = await Promise.all([
      context.db
        .select()
        .from(t.invoices)
        .where(eq(t.invoices.user_id, context.auth.profile.user_id))
        .orderBy(desc(t.invoices.invoice_id)),
      context.db
        .select({
          payment_id: t.payment.payment_id,
          voucher_number: t.payment.voucher_number,
          payment_date: t.payment.payment_date,
          pay_type: t.payment.pay_type,
          total_amount: t.payment.total_amount,
          description: t.payment.description,
        })
        .from(t.payment)
        .where(eq(t.payment.user_id, context.auth.profile.user_id))
        .orderBy(desc(t.payment.payment_id)),
      context.db
        .select({
          payment_id: t.payment_invoice.payment_id,
          invoice_id: t.payment_invoice.invoice_id,
        })
        .from(t.payment_invoice)
        .innerJoin(t.payment, eq(t.payment_invoice.payment_id, t.payment.payment_id))
        .where(eq(t.payment.user_id, context.auth.profile.user_id)),
    ]);

    return { invoices, vouchers, voucherInvoices };
  });

const logoutFn = createServerFn()
  .middleware([SupabaseProvider])
  .handler(async ({ context }) => {
    await context.supabase.auth.signOut();
  });

const exportFinancialReportFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    return await generateFinancialReport(context.db, context.auth.profile.user_id);
  });

export const Route = createFileRoute("/erp/dashboard")({
  component: Dashboard,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getDashboardData(),
});

type Invoice = Record<string, any>;
type Voucher = Record<string, any>;
type VoucherInvoice = Record<string, any>;

function normalizeDateKey(value: unknown): string | null {
  if (value instanceof Date) {
    return formatDate(value);
  }

  if (value === null || value === undefined) {
    return null;
  }

  const rawText =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : null;

  if (!rawText) {
    return null;
  }

  const datePrefixMatch = /^(\d{4}-\d{2}-\d{2})/.exec(rawText);
  if (datePrefixMatch?.[1]) {
    return datePrefixMatch[1];
  }

  const parsed = new Date(rawText);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDate(parsed);
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuthInfoQuery();
  const loaderData = Route.useLoaderData() as {
    invoices: Invoice[];
    vouchers: Voucher[];
    voucherInvoices: VoucherInvoice[];
  };
  const invoices = loaderData.invoices;
  const vouchers = loaderData.vouchers;
  const voucherInvoices = loaderData.voucherInvoices;
  const loading = false;
  const logoutMut = useMutation({
    mutationFn: logoutFn,
    onSuccess() {
      void (async () => {
        sessionStorage.clear();
        await auth.refetch();
        await queryClient.invalidateQueries({ queryKey: ["#!/auth"] });
        await navigate({ to: "/", replace: true });
      })();
    },
  });
  const exportReportMut = useMutation({
    mutationFn: exportFinancialReportFn,
    onSuccess(report) {
      openFinancialReportPdf(report, "Financial Report");
    },
  });

  const pendingInvoiceIds = useMemo(() => {
    const paymentDateById = new Map<number, string>();
    vouchers.forEach((voucher) => {
      const paymentId = Number(voucher.payment_id);
      const paymentDate = normalizeDateKey(voucher.payment_date);
      if (paymentId > 0 && paymentDate) {
        paymentDateById.set(paymentId, paymentDate);
      }
    });

    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const pendingIds = new Set<number>();
    voucherInvoices.forEach((row) => {
      const paymentId = Number(row.payment_id);
      const invoiceId = Number(row.invoice_id);
      const paymentDate = paymentDateById.get(paymentId);
      if (!paymentDate || invoiceId <= 0) return;

      if (paymentDate > todayKey) {
        pendingIds.add(invoiceId);
      }
    });

    return pendingIds;
  }, [vouchers, voucherInvoices]);

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? inv.amount ?? inv.total_amount ?? 0),
      0,
    );
    const paidInvoices = invoices.filter((inv) => Boolean(inv.is_paid)).length;
    const pendingInvoices = invoices.filter(
      (inv) => !inv.is_paid && pendingInvoiceIds.has(Number(inv.invoice_id)),
    ).length;
    const unpaidInvoices = invoices.filter(
      (inv) => !inv.is_paid && !pendingInvoiceIds.has(Number(inv.invoice_id)),
    ).length;
    const conversionRate = totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0;
    const totalCustomers = new Set(invoices.map((inv) => inv.vendor_id).filter(Boolean)).size;
    return {
      totalInvoices,
      totalRevenue,
      paidInvoices,
      pendingInvoices,
      unpaidInvoices,
      conversionRate,
      totalCustomers,
    };
  }, [invoices, pendingInvoiceIds]);

  function handleLogout() {
    logoutMut.mutate({});
  }

  const invoiceCountByPaymentId = useMemo(() => {
    const countMap = new Map<number, number>();
    voucherInvoices.forEach((row) => {
      const paymentId = Number(row.payment_id);
      countMap.set(paymentId, (countMap.get(paymentId) ?? 0) + 1);
    });
    return countMap;
  }, [voucherInvoices]);

  const [voucherPage, setVoucherPage] = useState(0);
  const maxVoucherPage = Math.max(0, Math.ceil(vouchers.length / VOUCHERS_PER_PAGE) - 1);
  const currentVoucherPage = Math.min(voucherPage, maxVoucherPage);
  const displayedVouchers = useMemo(() => {
    const start = currentVoucherPage * VOUCHERS_PER_PAGE;
    const end = start + VOUCHERS_PER_PAGE;
    return vouchers.slice(start, end);
  }, [currentVoucherPage, vouchers]);
  const shownVoucherStart = vouchers.length === 0 ? 0 : currentVoucherPage * VOUCHERS_PER_PAGE + 1;
  const shownVoucherEnd = Math.min((currentVoucherPage + 1) * VOUCHERS_PER_PAGE, vouchers.length);
  const todayKey = formatDate(new Date());
  const expensePoints = useMemo(() => {
    const dailyTotals = new Map<string, number>();
    const currentMonthKey = formatDate(new Date()).slice(0, 7);

    vouchers.forEach((voucher) => {
      const key = normalizeDateKey(voucher.payment_date);
      if (!key) return;
      if (!key.startsWith(currentMonthKey)) return;
      const amount = Number(voucher.total_amount ?? 0);
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + amount);
    });

    const points: BarChartPoint[] = [];
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Current month only: from day 1 through today.
    for (let date = new Date(startOfMonth); date <= today; date.setDate(date.getDate() + 1)) {
      const current = new Date(date);
      current.setHours(0, 0, 0, 0);
      const key = formatDate(current);

      points.push({
        label: current.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        value: dailyTotals.get(key) ?? 0,
      });
    }

    return points;
  }, [vouchers]);

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
              onClick={() => navigate({ to: "/vendor/new" })}
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

        <ExpensesChart
          points={expensePoints}
          description="Current month daily totals (through today)."
        />

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold">Status Overview</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>Paid</span>
                <span className="font-semibold">
                  {stats.paidInvoices}
                </span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>Pending</span>
                <span className="font-semibold">
                  {stats.pendingInvoices}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Unpaid</span>
                <span className="font-semibold">
                  {stats.unpaidInvoices}
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
                onClick={() => navigate({ to: "/erp/search-voucher" })}
              >
                Search Voucher
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={() => navigate({ to: "/vendor/new" })}
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
                onClick={() => navigate({ to: "/voucher/new" })}
              >
                New Voucher
              </button>
              <button
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-100 transition hover:border-white/25"
                onClick={() => exportReportMut.mutate({})}
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
            <h3 className="text-lg font-semibold">Previous Vouchers</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                Showing {shownVoucherStart}-{shownVoucherEnd} of {vouchers.length}
              </span>
              <button
                type="button"
                aria-label="Show newer vouchers"
                className="rounded-lg border border-white/15 px-3 py-1 text-sm text-slate-100 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setVoucherPage((prev) => Math.max(0, prev - 1))}
                disabled={currentVoucherPage === 0}
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Show older vouchers"
                className="rounded-lg border border-white/15 px-3 py-1 text-sm text-slate-100 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setVoucherPage((prev) => Math.min(maxVoucherPage, prev + 1))}
                disabled={currentVoucherPage >= maxVoucherPage}
              >
                →
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Voucher #
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Payment Date
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Pay Type
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Invoices
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Status
                  </th>
                  <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      Loading vouchers...
                    </td>
                  </tr>
                ) : displayedVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      No vouchers yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  displayedVouchers.map((voucher, idx) => {
                    const paymentId = Number(voucher.payment_id);
                    const invoiceCount = invoiceCountByPaymentId.get(paymentId) ?? 0;
                    const paymentDateKey = normalizeDateKey(voucher.payment_date);
                    const isRejected = String(voucher.description ?? "")
                      .trim()
                      .startsWith(REJECTED_NOTE_PREFIX);
                    const isPending = Boolean(paymentDateKey && paymentDateKey > todayKey);
                    const payTypeText = String(voucher.pay_type ?? "")
                      .split("_")
                      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                      .join(" ");

                    return (
                    <tr key={paymentId > 0 ? paymentId : idx} className="hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2 font-semibold">
                        {voucher.voucher_number ?? "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                        {normalizeDateKey(voucher.payment_date) ?? "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                        {payTypeText || "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        {invoiceCount}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        {isRejected ? (
                          <span className="inline-flex rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-200">
                            Rejected
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-200">
                            Processed
                          </span>
                        )}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        ${Number(voucher.total_amount ?? 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
