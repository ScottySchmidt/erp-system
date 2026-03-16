import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { database, t } from "#/lib/database";
import { formatDate } from "#/lib/utils";

import { DataSchema, InvoiceForm } from "./_form";

export const Route = createFileRoute("/invoice/new")({
  component: NewInvoice,
});

const createInvoice = createServerFn()
  .inputValidator(DataSchema)
  .handler(async ({ data }) => {
    const db = database();

    await db.insert(t.invoices).values(data);
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
