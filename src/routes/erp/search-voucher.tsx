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

const searchVoucherExists = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(SearchVoucherSchema)
  .handler(async ({ data, context }) => {
    const invoices = await context.db
      .select({
        invoice_id: t.invoices.invoice_id,
        account_id: t.invoices.account_id,
        vendor_id: t.invoices.vendor_id,
        amount: t.invoices.amount,
      })
      .from(t.invoices)
      .where(
        and(
          eq(t.invoices.user_id, context.auth.profile.user_id),
          eq(t.invoices.invoice_id, data.invoiceId),
        ),
      )
      .limit(1);

    const invoice = invoices[0];
    if (!invoice) {
      return { found: false as const, invoice: null };
    }

    return {
      found: true as const,
      invoice: {
        invoice_id: invoice.invoice_id,
        account_id: invoice.account_id,
        vendor_id: invoice.vendor_id,
        amount: Number(invoice.amount),
      },
    };
  });

type SearchInvoice = {
  invoice_id: number;
  account_id: number;
  vendor_id: number | null;
  amount: number;
};

function SearchVoucherPage() {
  const [invoiceId, setInvoiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<"idle" | "found" | "not_found">("idle");
  const [invoice, setInvoice] = useState<SearchInvoice | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult("idle");
    setInvoice(null);
    setHasSearched(false);

    const parsedInvoiceId = Number(invoiceId);
    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
      setError("Please enter a valid invoice ID.");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await searchVoucherExists({
        data: { invoiceId: parsedInvoiceId },
      });
      if (response.found) {
        setResult("found");
        setInvoice(response.invoice);
      } else {
        setResult("not_found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Search Voucher">
      <div className="space-y-4">
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

        {!loading && hasSearched && !error && result === "found" && (
          <div className="space-y-2">
            <p className="text-green-400">Found</p>
            {invoice && (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="text-slate-300">
                    <tr>
                      <th className="border-b border-white/10 px-3 py-2 text-left">Invoice ID</th>
                      <th className="border-b border-white/10 px-3 py-2 text-left">Account ID</th>
                      <th className="border-b border-white/10 px-3 py-2 text-left">Vendor ID</th>
                      <th className="border-b border-white/10 px-3 py-2 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2">{invoice.invoice_id}</td>
                      <td className="border-b border-white/5 px-3 py-2">{invoice.account_id}</td>
                      <td className="border-b border-white/5 px-3 py-2">{invoice.vendor_id ?? "—"}</td>
                      <td className="border-b border-white/5 px-3 py-2">
                        ${invoice.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {!loading && hasSearched && !error && result === "not_found" && (
          <p>No found.</p>
        )}
      </div>
    </DashboardLayout>
  );
}