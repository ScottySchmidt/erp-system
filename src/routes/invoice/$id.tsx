import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { database, t } from "#/lib/database";
import { formatDate } from "#/lib/utils";
import { IntStrSchema } from "#/lib/validation";

import { DataSchema, InvoiceForm } from "./_form";

const RoutePathSchema = v.object({
  id: v.pipe(IntStrSchema, v.integer()),
});

const FetchInvoiceSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
});

const UpdateInvoiceSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  value: DataSchema,
});

export const Route = createFileRoute("/invoice/$id")({
  loader: ({ params }) => fetchInvoice({ data: params }),
  component: ShowInvoice,
  params: valibotValidator(RoutePathSchema),
});

const fetchInvoice = createServerFn()
  .inputValidator(FetchInvoiceSchema)
  .handler(async ({ data }) => {
    const db = database();

    const invoice = await db
      .select()
      .from(t.invoices)
      .where(eq(t.invoices.invoice_id, data.id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!invoice) {
      throw notFound();
    }

    return invoice;
  });

const updateInvoice = createServerFn()
  .inputValidator(UpdateInvoiceSchema)
  .handler(async ({ data }) => {
    const db = database();

    await db.update(t.invoices).set(data.value).where(eq(t.invoices.invoice_id, data.id));
  });

function ShowInvoice() {
  const invoice = Route.useLoaderData();

  return (
    <div className="mx-auto my-8 max-w-lg rounded-lg border border-gray-300 p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Invoice</h2>
      <InvoiceForm
        submitText="Update Invoice"
        onSubmit={async (data) => {
          const id = invoice.invoice_id;
          await updateInvoice({
            data: { id, value: data },
          });
        }}
        defaultValues={{
          user_id: String(invoice.user_id),
          account_id: String(invoice.account_id),
          vendor_id: String(invoice.vendor_id),
          invoice_date: formatDate(new Date(invoice.invoice_date)),
          amount: String(invoice.amount),
        }}
      />
    </div>
  );
}
