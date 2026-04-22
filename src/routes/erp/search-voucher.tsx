import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { useState, type FormEvent } from "react";
import * as v from "valibot";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

export const Route = createFileRoute('/erp/search-voucher')({
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  component: SearchVoucherPage,
})

const SearchVoucherSchema = v.object({
  invoiceId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

type Invoice = {
  invoice_id: number;
  vendor_id: number | null;
  amount: number;
  status: "paid" | "unpaid";
};

const searchVoucher = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(SearchVoucherSchema)
  .handler(async ({ data, context }) => {
    const invoices = await context.db
      .select({
        invoice_id: t.invoices.invoice_id,
        vendor_id: t.invoices.vendor_id,
        amount: t.invoices.amount,
        is_paid: t.invoices.is_paid,
      })
      .from(t.invoices)
      .where(
        and(
          eq(t.invoices.user_id, context.auth.profile.user_id),
          eq(t.invoices.invoice_id, data.invoiceId),
        ),
      )
      .limit(1);

    return invoices.map((invoice) => ({
      invoice_id: invoice.invoice_id,
      vendor_id: invoice.vendor_id,
      amount: Number(invoice.amount),
      status: invoice.is_paid ? "paid" : "unpaid",
    }));
  });

function SearchVoucherPage() {
  const [invoiceId, setInvoiceId] = useState("");
  const [results, setResults] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResults([]);

    const parsedInvoiceId = Number(invoiceId);
    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
      setError("Please enter a valid invoice ID.");
      return;
    }

    setLoading(true);

    try {
      const invoices = await searchVoucher({
        data: { invoiceId: parsedInvoiceId },
      });
      setResults(invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Search Voucher">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Search Voucher</h1>

        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            placeholder="Enter invoice ID"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          />

          <button
            type="submit"
            disabled={loading || !invoiceId}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="text-red-400">{error}</p>}

        {!loading && results.length === 0 && invoiceId && !error && (
          <p>No invoice found for that invoice ID.</p>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="text-slate-300">
                <tr>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Invoice ID</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Vendor ID</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Amount</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((invoice) => (
                  <tr key={invoice.invoice_id} className="hover:bg-white/5">
                    <td className="border-b border-white/5 px-3 py-2">{invoice.invoice_id}</td>
                    <td className="border-b border-white/5 px-3 py-2">
                      {invoice.vendor_id ?? "—"}
                    </td>
                    <td className="border-b border-white/5 px-3 py-2">
                      ${invoice.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="border-b border-white/5 px-3 py-2 capitalize">
                      {invoice.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
