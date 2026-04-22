import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { asc, desc, eq } from "drizzle-orm";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

type Account = {
  account_id: number;
  account_description: string;
};

type Invoice = {
  invoice_id: number;
  account_id: number;
  vendor_id: number | null;
  invoice_date: string;
  amount: string;
  vendor_name: string | null;
};

const getAccountsPageData = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    try {
      if (!context.auth.profile?.user_id) {
        console.error("Profile or user_id is missing:", context.auth.profile);
        return { invoices: [], accounts: [] };
      }

      const [invoices, accounts] = await Promise.all([
        context.db
          .select({
            invoice_id: t.invoices.invoice_id,
            account_id: t.invoices.account_id,
            vendor_id: t.invoices.vendor_id,
            invoice_date: t.invoices.invoice_date,
            amount: t.invoices.amount,
            vendor_name: t.vendor.vendor_name,
          })
          .from(t.invoices)
          .leftJoin(t.vendor, eq(t.invoices.vendor_id, t.vendor.vendor_id))
          .where(eq(t.invoices.user_id, context.auth.profile.user_id))
          .orderBy(desc(t.invoices.invoice_id)),
        context.db
          .select({
            account_id: t.gl_accounts.account_id,
            account_description: t.gl_accounts.account_name,
          })
          .from(t.gl_accounts)
          .orderBy(asc(t.gl_accounts.account_id)),
      ]);

      return {
        invoices: invoices ?? [],
        accounts: accounts ?? [],
      };
    } catch (error) {
      console.error("Error loading accounts page data:", error);
      return { invoices: [], accounts: [] };
    }
  });

export const Route = createFileRoute("/erp/accounts")({
  component: AccountsPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getAccountsPageData(),
});

function AccountsPage() {
  const loaderData = Route.useLoaderData() as {
    invoices: Invoice[];
    accounts: Account[];
  };
  const invoices = loaderData.invoices ?? [];
  const accounts = loaderData.accounts ?? [];
  const [search, setSearch] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        account.account_description.toLowerCase().includes(search.toLowerCase()),
      ),
    [accounts, search],
  );

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.account_id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const visibleInvoices = useMemo(
    () =>
      selectedAccountId === null
        ? invoices
        : invoices.filter((invoice) => invoice.account_id === selectedAccountId),
    [invoices, selectedAccountId],
  );

  const totalAmount = useMemo(
    () => visibleInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
    [visibleInvoices],
  );

  return (
    <DashboardLayout title="Accounts">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-400">
              Search accounts and view invoices connected to the selected account.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Search accounts</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search account name..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected account</div>
              <div className="mt-3 text-lg font-semibold text-white">
                {selectedAccount ? selectedAccount.account_description : "All accounts"}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {visibleInvoices.length} invoice{visibleInvoices.length !== 1 ? "s" : ""} • ${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              {selectedAccount && (
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(null)}
                  className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => (
                <button
                  key={account.account_id}
                  type="button"
                  onClick={() => setSelectedAccountId(account.account_id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    selectedAccountId === account.account_id
                      ? "border-cyan-400 bg-cyan-500/10 text-white"
                      : "border-slate-700 bg-slate-950/50 text-slate-200 hover:border-slate-500 hover:bg-slate-900"
                  }`}
                >
                  <div className="text-sm font-semibold">{account.account_description}</div>
                  <div className="mt-2 text-xs text-slate-400">Account ID: {account.account_id}</div>
                </button>
              ))
            ) : (
              <div className="text-slate-400">No accounts match your search.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Invoices for {selectedAccount ? selectedAccount.account_description : "all accounts"}</h3>
              <p className="text-sm text-slate-400">
                {visibleInvoices.length} invoice{visibleInvoices.length !== 1 ? "s" : ""} found.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead className="bg-slate-950/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-[0.08em]">Invoice ID</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-[0.08em]">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-[0.08em]">Account ID</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-[0.08em]">Date</th>
                  <th className="px-4 py-3 text-right font-medium uppercase tracking-[0.08em]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {visibleInvoices.map((invoice) => (
                  <tr key={invoice.invoice_id} className="bg-slate-950/40 hover:bg-slate-900">
                    <td className="px-4 py-3 text-slate-100">{invoice.invoice_id}</td>
                    <td className="px-4 py-3 text-slate-300">{invoice.vendor_name ?? "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-300">{invoice.account_id}</td>
                    <td className="px-4 py-3 text-slate-300">{invoice.invoice_date}</td>
                    <td className="px-4 py-3 text-right text-slate-100">${Number(invoice.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visibleInvoices.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-slate-400">
              No invoices found for the selected account.
            </div>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}
