import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { DashboardLayout } from "#/components/layout/dashboard";
import { redirectIfSignedOut } from "#/lib/auth";

export const Route = createFileRoute('/erp/search-voucher')({
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  component: SearchVoucherPage,
})

function SearchVoucherPage() {
  const [invoiceId, setInvoiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFound(false);
    setHasSearched(false);

    const parsedInvoiceId = Number(invoiceId);
    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
      setError("Please enter a valid invoice ID.");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Temporary placeholder until the backend search is wired up.
      await Promise.resolve();
      setFound(true);
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

        {!loading && hasSearched && !error && found && (
          <p className="text-green-400">Found</p>
        )}
      </div>
    </DashboardLayout>
  );
}
