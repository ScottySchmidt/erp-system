import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { formatDate } from "#/lib/utils";

import { DataSchema, InvoiceForm } from "./-form";

export const Route = createFileRoute("/invoice/new")({
  component: NewInvoicePage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => listAccounts(),
});

const createInvoice = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(DataSchema)
  .handler(async ({ data, context }) => {
    const invoice = await context.db
      .insert(t.invoices)
      .values({
        ...data,
        user_id: context.auth.profile.user_id,
        created_date: formatDate(new Date()),
      })
      .returning()
      .then((rows) => rows[0]);

    return {
      invoice_id: invoice.invoice_id,
    };
  });

const listAccounts = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const accounts = await context.db
      .select({
        account_id: t.gl_accounts.account_id,
        account_name: t.gl_accounts.account_name,
      })
      .from(t.gl_accounts);

    return accounts;
  });

function NewInvoicePage() {
  const router = useRouter();
  const accounts = Route.useLoaderData();
  const [successMessage, setSuccessMessage] = useState("");

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: async () => {
      setSuccessMessage("Invoice created successfully! Redirecting to invoices…");

      await router.invalidate();
      await router.navigate({
        to: "/invoice",
      });
    },
  });

  return (
    <div className="mx-auto my-8 max-w-5xl rounded-lg border border-gray-300 p-6 shadow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
        <Link
          to="/invoice"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
        >
          ← Back to invoices
        </Link>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <InvoiceForm
        submitText={mutation.isPending ? "Creating..." : "Create Invoice"}
        errorText={mutation.error?.message}
        onSubmit={async (data) => {
          await mutation.mutateAsync({ data });
        }}
        defaultValues={{
          account_id: accounts?.[0]?.account_id ? String(accounts[0].account_id) : "",
          vendor_id: "",
          invoice_date: formatDate(new Date()),
          amount: "",
        }}
        accounts={accounts?.map((acct) => ({
          id: String(acct.account_id),
          name: acct.account_name,
        }))} // provide dropdown options
      />
    </div>
  );
}
