import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
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
  loader: () => listFormOptions(),
});

const createInvoice = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(DataSchema)
  .handler(async ({ data, context }) => {
    const profileUserId = context.auth.profile.user_id;
    const [userExists, accountExists] = await Promise.all([
      context.db
        .select({ user_id: t.users.user_id })
        .from(t.users)
        .where(eq(t.users.user_id, profileUserId))
        .limit(1)
        .then((rows) => rows[0]),
      context.db
        .select({ account_id: t.gl_accounts.account_id })
        .from(t.gl_accounts)
        .where(eq(t.gl_accounts.account_id, data.account_id))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    const vendorExists =
      data.vendor_id === null
        ? null
        : await context.db
            .select({ vendor_id: t.vendor.vendor_id })
            .from(t.vendor)
            .where(eq(t.vendor.vendor_id, data.vendor_id))
            .limit(1)
            .then((rows) => rows[0]);

    if (!userExists) {
      throw new Error(
        `Invoice debug: authenticated user_id ${profileUserId} does not exist in users table.`,
      );
    }

    if (!accountExists) {
      throw new Error(
        `Invoice debug: account_id ${data.account_id} was not found in gl_accounts.`,
      );
    }

    if (data.vendor_id !== null && !vendorExists) {
      throw new Error(
        `Invoice debug: vendor_id ${data.vendor_id} was not found in vendor table.`,
      );
    }

    let invoice;
    try {
      invoice = await context.db
        .insert(t.invoices)
        .values({
          ...data,
          user_id: profileUserId,
          created_date: formatDate(new Date()),
        })
        .returning()
        .then((rows) => rows[0]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Invoice insert failed (user_id=${profileUserId}, account_id=${data.account_id}, vendor_id=${data.vendor_id ?? "null"}, amount=${data.amount}, invoice_date=${data.invoice_date}). ${reason}`,
      );
    }

    if (!invoice) {
      throw new Error(
        "Invoice insert failed: no invoice row was returned after insert.",
      );
    }

    return {
      invoice_id: invoice.invoice_id,
    };
  });

const listFormOptions = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const [accounts, vendors] = await Promise.all([
      context.db
        .select({
          account_id: t.gl_accounts.account_id,
          account_name: t.gl_accounts.account_name,
        })
        .from(t.gl_accounts),
      context.db
        .select({
          vendor_id: t.vendor.vendor_id,
          vendor_name: t.vendor.vendor_name,
        })
        .from(t.vendor),
    ]);

    return { accounts, vendors };
  });

function NewInvoicePage() {
  const router = useRouter();
  const { accounts, vendors } = Route.useLoaderData();
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
        }))}
        vendors={vendors?.map((vendor) => ({
          id: String(vendor.vendor_id),
          name: vendor.vendor_name,
        }))}
      />
    </div>
  );
}
