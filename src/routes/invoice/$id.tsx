import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { valibotValidator } from "@tanstack/valibot-adapter";
import * as v from "valibot";

import { supabase } from "#/lib/supabase";
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
  data: DataSchema,
});

export const Route = createFileRoute("/invoice/$id")({
  loader: ({ params }) => fetchInvoice({ data: params }),
  component: ShowInvoice,
  params: valibotValidator(RoutePathSchema),
});

const fetchInvoice = createServerFn()
  .inputValidator(FetchInvoiceSchema)
  .handler(async ({ data }) => {
    const response = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_id", data.id)
      .limit(1)
      .maybeSingle()
      .throwOnError();

    if (!response.data) {
      throw notFound();
    }

    return response.data;
  });

const updateInvoice = createServerFn()
  .inputValidator(UpdateInvoiceSchema)
  .handler(async ({ data }) => {
    await supabase.from("invoices").update(data.data).eq("invoice_id", data.id).throwOnError();
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
            data: { id, data },
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
