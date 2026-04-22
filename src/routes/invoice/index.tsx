import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { type FormEvent, useEffect, useState } from "react";
import * as v from "valibot";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { openFinancialReportPdf } from "#/lib/report-pdf";
import { t } from "#/lib/server/database";
import { generateFinancialReport } from "#/lib/server/database/financial-reports";
import { IntStrSchema } from "#/lib/validation";

type CsvInvoiceRow = {
  invoice_id: number;
  account_name: string;
  vendor_name: string;
  invoice_date: string;
  amount: string;
};

type DateRangePreset = "today" | "last7days" | "thisMonth" | "custom";

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
  const header = ["Invoice ID", "Account", "Vendor", "Date", "Amount"];
  const rows = invoices.map((invoice) => [
    escapeCsvValue(invoice.invoice_id),
    escapeCsvValue(invoice.account_name),
    escapeCsvValue(invoice.vendor_name),
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
  URL.revokeObjectURL(url);
}

function toLocalDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset: Exclude<DateRangePreset, "custom">): {
  from: string;
  to: string;
} {
  const today = new Date();
  const todayString = toLocalDateInputValue(today);

  if (preset === "today") {
    return { from: todayString, to: todayString };
  }

  if (preset === "last7days") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toLocalDateInputValue(from), to: todayString };
  }

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toLocalDateInputValue(startOfMonth), to: todayString };
}

function detectPreset(from: string, to: string): DateRangePreset {
  if (!from || !to) {
    return "custom";
  }

  const today = getPresetRange("today");
  if (from === today.from && to === today.to) {
    return "today";
  }

  const last7days = getPresetRange("last7days");
  if (from === last7days.from && to === last7days.to) {
    return "last7days";
  }

  const thisMonth = getPresetRange("thisMonth");
  if (from === thisMonth.from && to === thisMonth.to) {
    return "thisMonth";
  }

  return "custom";
}

const RouteSearchSchema = v.object({
  page: v.pipe(v.optional(IntStrSchema, "1"), v.integer()),
  pageSize: v.pipe(v.optional(IntStrSchema, "20"), v.integer()),
  sortOrder: v.optional(v.picklist(["desc", "asc"])),
  accountId: v.optional(IntStrSchema),
  vendorId: v.optional(IntStrSchema),
  invoiceDateFrom: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
  invoiceDateTo: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
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
  sortOrder: v.optional(v.picklist(["desc", "asc"])),
  accountId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  vendorId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  invoiceDateFrom: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
  invoiceDateTo: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
});

const InvoiceReportFilterSchema = v.object({
  accountId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  vendorId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  invoiceDateFrom: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
  invoiceDateTo: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
});

const listInvoiceFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(ListInvoiceSchema)
  .handler(async ({ data, context }) => {
    const sortOrder = data.sortOrder === "asc" ? "asc" : "desc";
    const filters = and(
      eq(t.invoices.user_id, context.auth.profile.user_id),
      data.accountId === undefined
        ? undefined
        : eq(t.invoices.account_id, data.accountId),
      data.vendorId === undefined
        ? undefined
        : eq(t.invoices.vendor_id, data.vendorId),
      data.invoiceDateFrom === undefined
        ? undefined
        : gte(t.invoices.invoice_date, data.invoiceDateFrom),
      data.invoiceDateTo === undefined
        ? undefined
        : lte(t.invoices.invoice_date, data.invoiceDateTo),
    );

    const [invoices, totals, accounts, vendors] = await Promise.all([
      context.db
        .select({
          invoice_id: t.invoices.invoice_id,
          account_id: t.invoices.account_id,
          account_name: t.gl_accounts.account_name,
          vendor_id: t.invoices.vendor_id,
          vendor_name: t.vendor.vendor_name,
          invoice_date: t.invoices.invoice_date,
          amount: t.invoices.amount,
          is_paid: t.invoices.is_paid,
        })
        .from(t.invoices)
        .leftJoin(t.gl_accounts, eq(t.invoices.account_id, t.gl_accounts.account_id))
        .leftJoin(t.vendor, eq(t.invoices.vendor_id, t.vendor.vendor_id))
        .where(filters)
        .orderBy(sortOrder === "asc" ? asc(t.invoices.invoice_id) : desc(t.invoices.invoice_id))
        .limit(data.pageSize)
        .offset((data.page - 1) * data.pageSize),
      context.db
        .select({
          totalCount: sql<number>`count(*)`,
          totalAmount: sql<string>`coalesce(sum(${t.invoices.amount}), 0)`,
        })
        .from(t.invoices)
        .where(filters)
        .then((rows) => rows[0]),
      context.db
        .select({
          account_id: t.gl_accounts.account_id,
          account_name: t.gl_accounts.account_name,
        })
        .from(t.gl_accounts)
        .orderBy(asc(t.gl_accounts.account_id)),
      context.db
        .select({
          vendor_id: t.vendor.vendor_id,
          vendor_name: t.vendor.vendor_name,
        })
        .from(t.vendor)
        .orderBy(asc(t.vendor.vendor_id)),
    ]);

    return {
      invoices,
      totalCount: Number(totals.totalCount),
      totalAmount: Number(totals.totalAmount),
      accounts,
      vendors,
      filters: {
        sortOrder,
        accountId: data.accountId ?? null,
        vendorId: data.vendorId ?? null,
        invoiceDateFrom: data.invoiceDateFrom ?? null,
        invoiceDateTo: data.invoiceDateTo ?? null,
      },
    };
  });

const exportFinancialReportFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(InvoiceReportFilterSchema)
  .handler(async ({ data, context }) => {
    return await generateFinancialReport(context.db, context.auth.profile.user_id, {
      accountId: data.accountId,
      vendorId: data.vendorId,
      invoiceDateFrom: data.invoiceDateFrom,
      invoiceDateTo: data.invoiceDateTo,
    });
  });

function ListInvoicePage() {
  const navigate = useNavigate();
  const { invoices, totalCount, totalAmount, accounts, vendors, filters } =
    Route.useLoaderData();
  const [invoiceDateFrom, setInvoiceDateFrom] = useState(filters.invoiceDateFrom ?? "");
  const [invoiceDateTo, setInvoiceDateTo] = useState(filters.invoiceDateTo ?? "");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">(filters.sortOrder ?? "desc");
  const [datePreset, setDatePreset] = useState<DateRangePreset>(
    detectPreset(filters.invoiceDateFrom ?? "", filters.invoiceDateTo ?? ""),
  );
  const exportReportMut = useMutation({
    mutationFn: exportFinancialReportFn,
    onSuccess(report) {
      openFinancialReportPdf(report, "Invoice Financial Report");
    },
  });

  useEffect(() => {
    const nextFrom = filters.invoiceDateFrom ?? "";
    const nextTo = filters.invoiceDateTo ?? "";
    setInvoiceDateFrom(nextFrom);
    setInvoiceDateTo(nextTo);
    setSortOrder(filters.sortOrder ?? "desc");
    setDatePreset(detectPreset(nextFrom, nextTo));
  }, [filters.invoiceDateFrom, filters.invoiceDateTo, filters.sortOrder]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const accountId = String(formData.get("accountId") ?? "").trim();
    const vendorId = String(formData.get("vendorId") ?? "").trim();
    const nextInvoiceDateFrom = String(formData.get("invoiceDateFrom") ?? "").trim();
    const nextInvoiceDateTo = String(formData.get("invoiceDateTo") ?? "").trim();

    void navigate({
      to: "/invoice",
      search: () => ({
        page: "1",
        sortOrder,
        accountId: accountId || undefined,
        vendorId: vendorId || undefined,
        invoiceDateFrom: nextInvoiceDateFrom || undefined,
        invoiceDateTo: nextInvoiceDateTo || undefined,
      }),
    });
  }

  function toggleSortOrder() {
    const nextSortOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(nextSortOrder);

    void navigate({
      to: "/invoice",
      search: () => ({
        page: "1",
        sortOrder: nextSortOrder,
        accountId: filters.accountId === null ? undefined : String(filters.accountId),
        vendorId: filters.vendorId === null ? undefined : String(filters.vendorId),
        invoiceDateFrom: invoiceDateFrom || undefined,
        invoiceDateTo: invoiceDateTo || undefined,
      }),
    });
  }

  function clearFilters() {
    setSortOrder("desc");
    setDatePreset("custom");
    setInvoiceDateFrom("");
    setInvoiceDateTo("");

    void navigate({
      to: "/invoice",
      search: () => ({
        page: "1",
        sortOrder: "desc",
        accountId: undefined,
        vendorId: undefined,
        invoiceDateFrom: undefined,
        invoiceDateTo: undefined,
      }),
    });
  }

  return (
    <DashboardLayout title="Invoices">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
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
                    account_name: invoice.account_name ?? `Account #${invoice.account_id}`,
                    vendor_name:
                      invoice.vendor_name ?? (invoice.vendor_id ? `Vendor #${invoice.vendor_id}` : "Unassigned"),
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
            <button
              type="button"
              onClick={() =>
                exportReportMut.mutate({
                  data: {
                    accountId: filters.accountId ?? undefined,
                    vendorId: filters.vendorId ?? undefined,
                    invoiceDateFrom: filters.invoiceDateFrom ?? undefined,
                    invoiceDateTo: filters.invoiceDateTo ?? undefined,
                  },
                })
              }
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              Financial Report
            </button>
            <Link
              to="/invoice/new"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              + New Invoice
            </Link>
          </div>
        </div>
        <form
          onSubmit={applyFilters}
          className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 bg-white/5 p-4 md:grid-cols-7"
        >
          <select
            name="accountId"
            defaultValue={filters.accountId === null ? "" : String(filters.accountId)}
            className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name}
              </option>
            ))}
          </select>
          <select
            name="vendorId"
            defaultValue={filters.vendorId === null ? "" : String(filters.vendorId)}
            className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.vendor_id} value={vendor.vendor_id}>
                {vendor.vendor_name}
              </option>
            ))}
          </select>
          <select
            value={datePreset}
            onChange={(event) => {
              const nextPreset = event.target.value as DateRangePreset;
              setDatePreset(nextPreset);

              if (nextPreset === "custom") {
                return;
              }

              const range = getPresetRange(nextPreset);
              setInvoiceDateFrom(range.from);
              setInvoiceDateTo(range.to);
            }}
            className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="custom">Custom</option>
          </select>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="date"
              name="invoiceDateFrom"
              value={invoiceDateFrom}
              onChange={(event) => {
                setDatePreset("custom");
                const nextFrom = event.target.value;
                setInvoiceDateFrom(nextFrom);

                if (invoiceDateTo && nextFrom && invoiceDateTo < nextFrom) {
                  setInvoiceDateTo(nextFrom);
                }
              }}
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <span className="text-sm text-slate-300">to</span>
            <input
              type="date"
              name="invoiceDateTo"
              min={invoiceDateFrom || undefined}
              value={invoiceDateTo}
              onChange={(event) => {
                setDatePreset("custom");
                setInvoiceDateTo(event.target.value);
              }}
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={toggleSortOrder}
            aria-label={sortOrder === "desc" ? "Sort descending" : "Sort ascending"}
            title={sortOrder === "desc" ? "Descending" : "Ascending"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-slate-950 text-base text-slate-100"
          >
            {sortOrder === "desc" ? "↓" : "↑"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              Clear
            </button>
          </div>
        </form>
        <table className="table w-full">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Account</th>
              <th>Vendor</th>
              <th>Date</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.invoice_id}>
                <td>{invoice.invoice_id}</td>
                <td>{invoice.account_name ?? `Account #${invoice.account_id}`}</td>
                <td>{invoice.vendor_name ?? (invoice.vendor_id ? `Vendor #${invoice.vendor_id}` : "Unassigned")}</td>
                <td>{invoice.invoice_date}</td>
                <td>${invoice.amount}</td>
                <td className="px-2">
                  {invoice.is_paid ? (
                    <span className="rounded bg-emerald-700 px-2 py-1 text-sm font-semibold text-emerald-50">
                      Paid
                    </span>
                  ) : (
                    <Link
                      to="/invoice/$id"
                      params={{ id: invoice.invoice_id }}
                      className="rounded bg-gray-700 px-2 py-1 text-sm text-gray-200 transition-colors hover:bg-gray-600"
                    >
                      Edit
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}
