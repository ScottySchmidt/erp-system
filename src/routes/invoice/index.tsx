import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import * as v from "valibot";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { IntStrSchema } from "#/lib/validation";

type CsvInvoiceRow = {
  invoice_id: number;
  account_id: number;
  vendor_id: number | null;
  invoice_date: string;
  amount: string;
};

function escapeCsvValue(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function downloadInvoicesCsv(invoices: CsvInvoiceRow[]) {
  const header = ["Invoice ID", "Account ID", "Vendor ID", "Date", "Amount"];
  const rows = invoices.map((invoice) => [
    escapeCsvValue(invoice.invoice_id),
    escapeCsvValue(invoice.account_id),
    escapeCsvValue(invoice.vendor_id),
    escapeCsvValue(invoice.invoice_date),
    escapeCsvValue(invoice.amount),
  ]);

  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  link.remove();
  URL.revokeObjectURL(url);
}

const RouteSearchSchema = v.object({
  page: v.pipe(v.optional(IntStrSchema, "1"), v.integer()),
  pageSize: v.pipe(v.optional(IntStrSchema, "20"), v.integer()),
});

export const Route = createFileRoute("/invoice/")({
  component: ListInvoicePage,
  loaderDeps: ({ search }) => v.parse(RouteSearchSchema, search),
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: ({ deps }) => listInvoiceFn({ data: deps }),
});

const ListInvoiceSchema = v.object({
  page: v.pipe(v.number(), v.integer(), v.minValue(1)),
  pageSize: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
});

const listInvoiceFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(ListInvoiceSchema)
  .handler(async ({ data, context }) => {
    const [invoices, totals] = await Promise.all([
      context.db
        .select()
        .from(t.invoices)
        .where(eq(t.invoices.user_id, context.auth.profile.user_id))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize),
      context.db
        .select({
          totalCount: sql<number>`count(*)`,
          totalAmount: sql<string>`coalesce(sum(${t.invoices.amount}), 0)`,
        })
        .from(t.invoices)
        .where(eq(t.invoices.user_id, context.auth.profile.user_id))
        .then((rows) => rows[0]),
    ]);

    return {
      invoices,
      totalCount: Number(totals.totalCount),
      totalAmount: Number(totals.totalAmount),
    };
  });

function ListInvoicePage() {
  const { invoices, totalCount, totalAmount } = Route.useLoaderData();

  return (
    <DashboardLayout title="Invoices">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Invoices</h2>
            <div className="text-sm text-slate-400">
              Total invoices: <span className="font-semibold">{totalCount}</span>
              <span className="mx-2">•</span>
              Total amount:{" "}
              <span className="font-semibold">
                ${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/erp/accounts"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              Accounts
            </Link>
            <Link
              to="/erp/new-voucher"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              New Voucher
            </Link>
            <button
              type="button"
              onClick={() =>
                downloadInvoicesCsv(
                  invoices.map((invoice) => ({
                    invoice_id: invoice.invoice_id,
                    account_id: invoice.account_id,
                    vendor_id: invoice.vendor_id,
                    invoice_date: invoice.invoice_date,
                    amount: String(invoice.amount),
                  })),
                )
              }
              disabled={invoices.length === 0}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
            <Link
              to="/invoice/new"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              + New Invoice
            </Link>
          </div>
        </div>
        <table className="table w-full">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Account ID</th>
              <th>Vendor ID</th>
              <th>Date</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.invoice_id}>
                <td>{invoice.invoice_id}</td>
                <td>{invoice.account_id}</td>
                <td>{invoice.vendor_id}</td>
                <td>{invoice.invoice_date}</td>
                <td>${invoice.amount}</td>
                <td className="px-2">
                  <Link
                    to="/invoice/$id"
                    params={{ id: invoice.invoice_id }}
                    className="rounded bg-gray-700 px-2 py-1 text-sm text-gray-200 transition-colors hover:bg-gray-600"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}
