import { useMutation } from "@tanstack/react-query";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { formatDate } from "#/lib/utils";
import { IntStrSchema } from "#/lib/validation";

import { DataSchema, InvoiceForm } from "./-form";

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
  loader: ({ params }) => fetchInvoiceFn({ data: params }),
  component: ShowInvoice,
  params: valibotValidator(RoutePathSchema),
});

const fetchInvoiceFn = createServerFn()
  .middleware([DatabaseProvider])
  .inputValidator(FetchInvoiceSchema)
  .handler(async ({ data, context }) => {
    const invoice = await context.db
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

const updateInvoiceFn = createServerFn()
  .middleware([DatabaseProvider])
  .inputValidator(UpdateInvoiceSchema)
  .handler(async ({ data, context }) => {
    await context.db.update(t.invoices).set(data.value).where(eq(t.invoices.invoice_id, data.id));
  });

function ShowInvoice() {
  const router = useRouter();
  const invoice = Route.useLoaderData();

  const mutation = useMutation({
    mutationFn: updateInvoiceFn,
    onSuccess: async () => {
      await router.invalidate();
    },
  });

  return (
    <div className="mx-auto my-8 max-w-lg rounded-lg border border-gray-300 p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Invoice</h2>

      <InvoiceForm
        submitText="Update Invoice"
        errorText={mutation.error?.message}
        onSubmit={async (data) => {
          const id = invoice.invoice_id;
          await mutation.mutateAsync({
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
