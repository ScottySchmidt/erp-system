import { useMutation } from "@tanstack/react-query";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { useState } from "react";
import * as v from "valibot";

import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import {
  getInvoiceWithItemsForUser,
  updateInvoiceWithItemsForUser,
} from "#/lib/server/database/invoice-service";
import {
  SESSION_TIMEOUT_RULES,
  useSessionTimeoutTracker,
} from "#/lib/session-timeout";
import { formatDate } from "#/lib/utils";
import { IntStrSchema } from "#/lib/validation";

import { DataSchema, InvoiceForm } from "./-form";

type InvoiceLineItemRow = {
  description: string;
  quantity: number | string;
  price: number | string;
  tax_rate: number | string;
};

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
  component: EditInvoicePage,
  params: valibotValidator(RoutePathSchema),
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: ({ params }) => fetchInvoiceFn({ data: params }),
});

const fetchInvoiceFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(FetchInvoiceSchema)
  .handler(async ({ data, context }) => {
    const invoiceWithItems = await getInvoiceWithItemsForUser(
      context.db,
      context.auth.profile.user_id,
      data.id,
    );
    if (!invoiceWithItems) {
      throw notFound();
    }
    return invoiceWithItems;
  });

const updateInvoiceFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(UpdateInvoiceSchema)
  .handler(async ({ data, context }) => {
    const { line_items, ...invoiceValues } = data.value;
    await updateInvoiceWithItemsForUser(
      context.db,
      context.auth.profile.user_id,
      data.id,
      invoiceValues,
      line_items,
    );
  });

function EditInvoicePage() {
  const router = useRouter();
  const { invoice, line_items } = Route.useLoaderData();
  const [successMessage, setSuccessMessage] = useState("");
  const { remainingLabel } = useSessionTimeoutTracker({
    rule: SESSION_TIMEOUT_RULES.editInvoice,
  });

  const mutation = useMutation({
    mutationFn: updateInvoiceFn,
    onSuccess: async () => {
      setSuccessMessage("Invoice updated successfully!");
      await router.invalidate();

      setTimeout(() => {
        setSuccessMessage("");
      }, 1500);
    },
  });

  return (
    <div className="mx-auto my-8 max-w-5xl rounded-lg border border-gray-300 p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Edit Invoice</h2>
        <div className="flex items-center gap-2">
          <span className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Session timeout: {remainingLabel}
          </span>
          <button
            onClick={() => router.navigate({ to: "/invoice" })}
            className="rounded bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
          >
            Back to Invoices
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <InvoiceForm
        submitText={mutation.isPending ? "Updating..." : "Update Invoice"}
        errorText={mutation.error?.message}
        onSubmit={async (data) => {
          const id = invoice.invoice_id;
          await mutation.mutateAsync({
            data: { id, value: data },
          });
        }}
        defaultValues={{
          account_id: String(invoice.account_id),
          vendor_id: invoice.vendor_id === null ? "" : String(invoice.vendor_id),
          invoice_date: formatDate(new Date(invoice.invoice_date)),
          amount: String(invoice.amount),
        }}
        initialLineItems={line_items.map((item: InvoiceLineItemRow) => ({
          description: item.description,
          quantity: Number(item.quantity),
          price: Number(item.price),
          tax_rate: Number(item.tax_rate),
        }))}
      />
    </div>
  );
}
