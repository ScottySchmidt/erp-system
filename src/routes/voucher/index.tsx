import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import * as v from "valibot";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { syncInvoicePaidStatusByPaymentDate } from "#/lib/server/database/invoice-payment-status";
import { formatDate } from "#/lib/utils";

type VoucherPreviewRow = {
  payment_id: number;
  voucher_number: string;
  payment_date: string;
  pay_type: string;
  total_amount: string;
  invoice_count: number;
  description: string | null;
};
const BUSINESS_TIME_ZONE = "America/Chicago";
const REJECTED_NOTE_PREFIX = "[REJECTED]";

function normalizeDateKey(value: unknown): string | null {
  if (value instanceof Date) {
    return formatDate(value);
  }

  if (value === null || value === undefined) {
    return null;
  }

  const rawText =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : null;

  if (!rawText) {
    return null;
  }

  const datePrefixMatch = /^(\d{4}-\d{2}-\d{2})/.exec(rawText);
  if (datePrefixMatch?.[1]) {
    return datePrefixMatch[1];
  }

  const parsed = new Date(rawText);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDate(parsed);
}

const listVouchersPreviewFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    await syncInvoicePaidStatusByPaymentDate(context.db, context.auth.profile.user_id);

    const [vouchers, voucherInvoices] = await Promise.all([
      context.db
        .select({
          payment_id: t.payment.payment_id,
          voucher_number: t.payment.voucher_number,
          payment_date: t.payment.payment_date,
          pay_type: t.payment.pay_type,
          total_amount: t.payment.total_amount,
          description: t.payment.description,
        })
        .from(t.payment)
        .where(eq(t.payment.user_id, context.auth.profile.user_id))
        .orderBy(desc(t.payment.payment_id)),
      context.db
        .select({
          payment_id: t.payment_invoice.payment_id,
          invoice_id: t.payment_invoice.invoice_id,
        })
        .from(t.payment_invoice)
        .innerJoin(t.payment, eq(t.payment_invoice.payment_id, t.payment.payment_id))
        .where(eq(t.payment.user_id, context.auth.profile.user_id)),
    ]);

    const invoiceCountByPaymentId = new Map<number, number>();
    voucherInvoices.forEach((row) => {
      const paymentId = Number(row.payment_id);
      invoiceCountByPaymentId.set(paymentId, (invoiceCountByPaymentId.get(paymentId) ?? 0) + 1);
    });

    return vouchers.map(
      (voucher): VoucherPreviewRow => ({
        payment_id: Number(voucher.payment_id),
        voucher_number: voucher.voucher_number,
        payment_date: voucher.payment_date,
        pay_type: voucher.pay_type,
        total_amount: String(voucher.total_amount),
        invoice_count: invoiceCountByPaymentId.get(Number(voucher.payment_id)) ?? 0,
        description: voucher.description ?? null,
      }),
    );
  });

const RejectPendingVoucherSchema = v.object({
  paymentId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const rejectPendingVoucherFn = createServerFn({ method: "POST" })
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(RejectPendingVoucherSchema)
  .handler(async ({ context, data }) => {
    await context.db.transaction(async (tx: any) => {
      const pendingPayment = await tx
        .select({
          payment_id: t.payment.payment_id,
          description: t.payment.description,
        })
        .from(t.payment)
        .where(
          and(
            eq(t.payment.user_id, context.auth.profile.user_id),
            eq(t.payment.payment_id, data.paymentId),
            sql`${t.payment.payment_date} > (now() at time zone ${BUSINESS_TIME_ZONE})::date`,
            sql`coalesce(${t.payment.description}, '') not like ${`${REJECTED_NOTE_PREFIX}%`}`,
          ),
        )
        .limit(1);

      if (!pendingPayment.length) {
        throw new Error("Only pending vouchers can be rejected.");
      }

      await tx.delete(t.payment_invoice).where(eq(t.payment_invoice.payment_id, data.paymentId));
      const nowText = new Date().toISOString();
      const previousDescription = pendingPayment[0]?.description?.trim() ?? "";
      const rejectionDescription = previousDescription
        ? `${REJECTED_NOTE_PREFIX} Payment was rejected at ${nowText}. Previous note: ${previousDescription}`
        : `${REJECTED_NOTE_PREFIX} Payment was rejected at ${nowText}.`;

      await tx
        .update(t.payment)
        .set({ description: rejectionDescription })
        .where(
          and(
            eq(t.payment.user_id, context.auth.profile.user_id),
            eq(t.payment.payment_id, data.paymentId),
          ),
        );

      await syncInvoicePaidStatusByPaymentDate(tx, context.auth.profile.user_id);
    });

    return { success: true };
  });

export const Route = createFileRoute("/voucher/")({
  component: VoucherPreviewPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => listVouchersPreviewFn(),
});

function VoucherPreviewPage() {
  const router = useRouter();
  const vouchers = Route.useLoaderData();
  const rejectMutation = useMutation({
    mutationFn: rejectPendingVoucherFn,
    onSuccess: async () => {
      await router.invalidate();
    },
  });
  const todayKey = formatDate(new Date());

  return (
    <DashboardLayout title="Voucher Preview">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">
            Preview all vouchers before creating or searching new payment records.
          </p>
          <Link
            to="/voucher/new"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
          >
            + New Voucher
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Voucher #
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Payment Date
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Pay Type
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Invoices
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Status
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Action
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                    No vouchers yet. Click New Voucher to create one.
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => {
                  const payTypeText = String(voucher.pay_type ?? "")
                    .split("_")
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(" ");
                  const paymentDateKey = normalizeDateKey(voucher.payment_date);
                  const isRejected = String(voucher.description ?? "")
                    .trim()
                    .startsWith(REJECTED_NOTE_PREFIX);
                  const isPending = Boolean(paymentDateKey && paymentDateKey > todayKey);

                  return (
                    <tr key={voucher.payment_id} className="hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2 font-semibold">
                        {voucher.voucher_number}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        {normalizeDateKey(voucher.payment_date) ?? "—"}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">{payTypeText || "—"}</td>
                      <td className="border-b border-white/5 px-3 py-2">{voucher.invoice_count}</td>
                      <td className="border-b border-white/5 px-3 py-2">
                        {isRejected ? (
                          <span className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-rose-50">
                            Rejected
                          </span>
                        ) : isPending ? (
                          <span className="rounded bg-amber-700 px-2 py-1 text-xs font-semibold text-amber-50">
                            Pending
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-emerald-50">
                            Processed
                          </span>
                        )}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        {isPending && !isRejected ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm("Reject this pending voucher?")) {
                                return;
                              }
                              rejectMutation.mutate({
                                data: { paymentId: voucher.payment_id },
                              });
                            }}
                            disabled={rejectMutation.isPending}
                            className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-rose-50 hover:bg-rose-600 disabled:opacity-60"
                          >
                            {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        ${Number(voucher.total_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
