import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { IntStrSchema } from "#/lib/validation";

const RouteSearchSchema = v.object({
  page: v.pipe(v.optional(IntStrSchema, "1"), v.integer()),
  pageSize: v.pipe(v.optional(IntStrSchema, "20"), v.integer()),
});

export const Route = createFileRoute("/invoice/")({
  component: ListInvoicePage,
  loaderDeps: ({ search }) => v.parse(RouteSearchSchema, search),
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: ({ deps }) => listInvoiceFn({ data: deps }),
});

const ListInvoiceSchema = v.object({
  page: v.pipe(v.number(), v.integer(), v.minValue(1)),
  pageSize: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
});

const listInvoiceFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(ListInvoiceSchema)
  .handler(async ({ data, context }) => {
    const invoice = await context.db
      .select()
      .from(t.invoices)
      .where(eq(t.invoices.user_id, context.auth.profile.user_id))
      .limit(data.pageSize)
      .offset((data.page - 1) * data.pageSize);

    return invoice;
  });

function ListInvoicePage() {
  const invoices = Route.useLoaderData();

  return (
    <DashboardLayout title="Invoices">
      <section className="flex flex-col gap-5">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Account ID</th>
              <th>Vendor ID</th>
              <th>Date</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.invoice_id}>
                <td>{invoice.invoice_id}</td>
                <td>{invoice.account_id}</td>
                <td>{invoice.vendor_id}</td>
                <td>{invoice.invoice_date}</td>
                <td>${invoice.amount}</td>
                <td className="px-2">
                  <Link
                    to="/invoice/$id"
                    params={{ id: invoice.invoice_id }}
                    className="rounded bg-gray-700 px-2 py-1 text-sm text-gray-200 transition-colors hover:bg-gray-600"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
}
