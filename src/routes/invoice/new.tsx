import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
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

function NewInvoicePage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState("");

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: async (data) => {
      setSuccessMessage("Invoice created successfully!");

      setTimeout(async () => {
        await router.invalidate();
        await router.navigate({
          to: "/invoice/$id",
          params: { id: data.invoice_id },
        });
      }, 1000);
    },
  });

  return (
    <div className="mx-auto my-8 max-w-5xl rounded-lg border border-gray-300 p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Invoice</h2>

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
          account_id: "",
          vendor_id: "",
          invoice_date: formatDate(new Date()),
          amount: "",
        }}
      />
    </div>
  );
}
