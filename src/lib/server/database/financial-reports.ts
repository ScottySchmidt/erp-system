import { and, eq, gte, lte } from "drizzle-orm";

import { t, type DrizzleClient } from "#/lib/server/database";
import { syncInvoicePaidStatusByPaymentDate } from "#/lib/server/database/invoice-payment-status";
import { BUSINESS_TIME_ZONE, getTodayDateKey, getVoucherStatus } from "#/lib/voucher";

type InvoiceReportFilters = {
  accountId?: number;
  vendorId?: number;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
};

export async function generateFinancialReport(
  db: DrizzleClient,
  userId: number,
  filters: InvoiceReportFilters = {},
) {
  await syncInvoicePaidStatusByPaymentDate(db, userId);

  const invoiceWhere = and(
    eq(t.invoices.user_id, userId),
    filters.accountId === undefined ? undefined : eq(t.invoices.account_id, filters.accountId),
    filters.vendorId === undefined ? undefined : eq(t.invoices.vendor_id, filters.vendorId),
    filters.invoiceDateFrom === undefined
      ? undefined
      : gte(t.invoices.invoice_date, filters.invoiceDateFrom),
    filters.invoiceDateTo === undefined
      ? undefined
      : lte(t.invoices.invoice_date, filters.invoiceDateTo),
  );

  const [invoiceRows, paymentRows] = await Promise.all([
    db
      .select({
        invoice_id: t.invoices.invoice_id,
        invoice_date: t.invoices.invoice_date,
        amount: t.invoices.amount,
        is_paid: t.invoices.is_paid,
        account_id: t.invoices.account_id,
        account_name: t.gl_accounts.account_name,
        vendor_id: t.invoices.vendor_id,
        vendor_name: t.vendor.vendor_name,
      })
      .from(t.invoices)
      .leftJoin(t.gl_accounts, eq(t.invoices.account_id, t.gl_accounts.account_id))
      .leftJoin(t.vendor, eq(t.invoices.vendor_id, t.vendor.vendor_id))
      .where(invoiceWhere),
    db
      .select({
        payment_id: t.payment.payment_id,
        voucher_number: t.payment.voucher_number,
        payment_date: t.payment.payment_date,
        pay_type: t.payment.pay_type,
        total_amount: t.payment.total_amount,
        description: t.payment.description,
      })
      .from(t.payment)
      .where(eq(t.payment.user_id, userId)),
  ]);

  const invoices = invoiceRows.map((row) => ({
    ...row,
    amount: Number(row.amount ?? 0),
  }));
  const todayKey = getTodayDateKey({ timeZone: BUSINESS_TIME_ZONE });
  const payments = paymentRows.map((row) => {
    const paymentStatus = getVoucherStatus({
      paymentDate: row.payment_date,
      description: row.description,
      todayKey,
      timeZone: BUSINESS_TIME_ZONE,
    });

    return {
      ...row,
      total_amount: Number(row.total_amount ?? 0),
      payment_status: paymentStatus,
    };
  });

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((invoice) => Boolean(invoice.is_paid)).length;
  const unpaidInvoices = totalInvoices - paidInvoices;
  const processedPayments = payments.filter((payment) => payment.payment_status === "processed").length;
  const pendingPayments = payments.filter((payment) => payment.payment_status === "pending").length;
  const rejectedPayments = payments.filter((payment) => payment.payment_status === "rejected").length;
  const invoiceAmountTotal = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paymentAmountTotal = payments.reduce((sum, payment) => sum + payment.total_amount, 0);
  const totalVendors = new Set(invoices.map((invoice) => invoice.vendor_id).filter(Boolean)).size;
  const totalAccounts = new Set(invoices.map((invoice) => invoice.account_id).filter(Boolean)).size;

  return {
    generated_at: new Date().toISOString(),
    filters: {
      accountId: filters.accountId ?? null,
      vendorId: filters.vendorId ?? null,
      invoiceDateFrom: filters.invoiceDateFrom ?? null,
      invoiceDateTo: filters.invoiceDateTo ?? null,
    },
    summary: {
      total_invoices: totalInvoices,
      paid_invoices: paidInvoices,
      unpaid_invoices: unpaidInvoices,
      total_invoice_amount: invoiceAmountTotal,
      total_payment_amount: paymentAmountTotal,
      processed_payments: processedPayments,
      pending_payments: pendingPayments,
      rejected_payments: rejectedPayments,
      total_vendors: totalVendors,
      total_accounts: totalAccounts,
    },
    invoices,
    payments,
  };
}
