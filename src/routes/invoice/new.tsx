import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { t } from "#/lib/database";
import { DatabaseProvider } from "#/lib/middleware";
import { formatDate } from "#/lib/utils";

import { DataSchema, InvoiceForm } from "./-form";

export const Route = createFileRoute("/invoice/new")({
  component: NewInvoice,
});

const createInvoice = createServerFn()
  .middleware([DatabaseProvider])
  .inputValidator(DataSchema)
  .handler(async ({ data, context }) => {
    await context.db.insert(t.invoices).values({
      ...data,
      created_date: formatDate(new Date()),
    });
  });

function NewInvoice() {
  return (
    <div className="mx-auto my-8 max-w-lg rounded-lg border border-gray-300 p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Invoice</h2>
      <InvoiceForm
        submitText="Create Invoice"
        onSubmit={async (data) => {
          await createInvoice({ data });
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
