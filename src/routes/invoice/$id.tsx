import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { valibotValidator } from "@tanstack/valibot-adapter";
import * as v from "valibot";

import { supabase } from "#/lib/supabase";

const FetchInvoiceSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
});

const FetchInvoiceRouteSchema = v.object({
  id: v.pipe(v.string(), v.transform(parseInt), FetchInvoiceSchema.entries.id),
});

export const Route = createFileRoute("/invoice/$id")({
  loader: ({ params }) => fetchInvoice({ data: params }),
  component: ShowInvoice,
  params: valibotValidator(FetchInvoiceRouteSchema),
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

function ShowInvoice() {
  const invoice = Route.useLoaderData();

  return <pre>{JSON.stringify(invoice, null, 2)}</pre>;
}
