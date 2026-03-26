import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { formatDate } from "#/lib/utils";

import { DataSchema, InvoiceForm } from "./-form";

export const Route = createFileRoute("/invoice/new")({
  component: NewInvoice,
});

const createInvoice = createServerFn()
  .middleware([DatabaseProvider])
  .inputValidator(DataSchema)
  .handler(async ({ data, context }) => {
    const invoice = await context.db
      .insert(t.invoices)
      .values({
        ...data,
        created_date: formatDate(new Date()),
      })
      .returning()
      .then((rows) => rows[0]);

    return {
      invoice_id: invoice.invoice_id,
    };
  });

function NewInvoice() {
  const router = useRouter();

  const createInvoiceMut = useMutation({
    mutationFn: createInvoice,
    onSuccess: async (data) => {
      await router.invalidate();
      await router.navigate({
        to: "/invoice/$id",
        params: { id: data.invoice_id },
      });
    },
  });

  return (
    <div className="mx-auto my-8 max-w-lg rounded-lg border border-gray-300 p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Invoice</h2>
      <InvoiceForm
        submitText="Create Invoice"
        onSubmit={async (data) => {
          await createInvoiceMut.mutateAsync({ data });
        }}
        defaultValues={{
          user_id: "",
          account_id: "",
          vendor_id: "",
          invoice_date: formatDate(new Date()),
          amount: "",
        }}
      />
    </div>
  );
}
