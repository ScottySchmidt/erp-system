import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { ExpensesChart } from "#/components/charts/expenses-chart";

type ChartPoint = {
  label: string;
  total: number;
};

type AnalyticsData = {
  vendorPoints: ChartPoint[];
  accountPoints: ChartPoint[];
  totalSpend: number;
  voucherCount: number;
};

const getAnalyticsData = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const payments = await context.db
      .select({
        payment_id: t.payment.payment_id,
        payment_date: t.payment.payment_date,
        total_amount: t.payment.total_amount,
        account_id: t.payment.account_id,
      })
      .from(t.payment)
      .where(eq(t.payment.user_id, context.auth.profile.user_id))
      .orderBy(desc(t.payment.payment_date));

    const paymentInvoices = await context.db
      .select({
        payment_id: t.payment_invoice.payment_id,
        invoice_id: t.payment_invoice.invoice_id,
        amount_paid: t.payment_invoice.amount_paid,
      })
      .from(t.payment_invoice)
      .innerJoin(t.payment, eq(t.payment_invoice.payment_id, t.payment.payment_id))
      .where(eq(t.payment.user_id, context.auth.profile.user_id));

    const invoices = await context.db
      .select({
        invoice_id: t.invoices.invoice_id,
        vendor_name: t.vendor.vendor_name,
      })
      .from(t.invoices)
      .leftJoin(t.vendor, eq(t.invoices.vendor_id, t.vendor.vendor_id))
      .where(eq(t.invoices.user_id, context.auth.profile.user_id));

    const invoiceVendorMap = new Map(
      invoices.map((invoice) => [Number(invoice.invoice_id), invoice.vendor_name ?? "Unassigned vendor"]),
    );

    const accountTotals = new Map<string, number>();
    payments.forEach((payment) => {
      const label = `Account ${payment.account_id}`;
      accountTotals.set(label, (accountTotals.get(label) ?? 0) + Number(payment.total_amount));
    });

    const vendorTotals = new Map<string, number>();
    paymentInvoices.forEach((row) => {
      const vendorName = invoiceVendorMap.get(Number(row.invoice_id)) ?? "Unassigned vendor";
      vendorTotals.set(vendorName, (vendorTotals.get(vendorName) ?? 0) + Number(row.amount_paid));
    });

    const toSortedPoints = (totals: Map<string, number>) =>
      Array.from(totals.entries())
        .map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total);

    return {
      vendorPoints: toSortedPoints(vendorTotals),
      accountPoints: toSortedPoints(accountTotals),
      totalSpend: payments.reduce((sum, payment) => sum + Number(payment.total_amount), 0),
      voucherCount: payments.length,
    } satisfies AnalyticsData;
  });

export const Route = createFileRoute("/erp/analytics")({
  component: AnalyticsPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getAnalyticsData(),
});

function AnalyticsPage() {
  const data = Route.useLoaderData() as AnalyticsData;

  return (
    <DashboardLayout title="Analytics">
      <section className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.1em] text-slate-300">
                ERP ANALYTICS
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Voucher spend visualized</h2>
              <p className="mt-1 text-sm text-slate-400">
                Compare payment volume by vendor and accounting code without crowding the main dashboard.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Total spend" value={`$${data.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              <MetricCard label="Voucher count" value={data.voucherCount.toLocaleString()} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ExpensesChart
            title="Spend by Vendor"
            description="Voucher allocations rolled up to the vendor tied to each invoice."
            emptyMessage="Create vouchers tied to invoices with vendors to populate this view."
            points={data.vendorPoints}
          />
          <ExpensesChart
            title="Spend by Account Code"
            description="Voucher totals grouped by the payment account used when the voucher was created."
            emptyMessage="Create vouchers with account codes to populate this view."
            points={data.accountPoints}
          />
        </div>
      </section>
    </DashboardLayout>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard(props: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-100">{props.value}</div>
    </div>
  );
}
