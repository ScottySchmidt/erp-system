import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { BUSINESS_TIME_ZONE, getTodayDateKey } from "#/lib/voucher";
import { getDatabaseErrorReason } from "#/lib/server/database/invoices";
import { t, type DrizzleClient } from "#/lib/server/database";
import { syncInvoicePaidStatusByPaymentDate } from "#/lib/server/database/invoice-payment-status";

export type PaymentInvoiceRow = {
  invoice_id: number;
  amount: number;
  account_id: number;
};

export type VoucherPayType = "cash" | "check" | "credit_card";

export type CreatePaymentInput = {
  userId: number;
  accountId: number;
  voucherNumber: string;
  paymentDate: string;
  payType: VoucherPayType;
  totalAmount: number;
  description: string | null;
};

export type CreatedPayment = {
  payment_id: number;
  voucher_number: string;
};

export type GlAccountOption = {
  account_id: number;
  account_name: string;
  account_type: string;
};

export interface PaymentTransactionRepository {
  syncInvoicePaidStatus(userId: number): Promise<void>;
  loadUnpaidInvoices(userId: number, invoiceIds: number[]): Promise<PaymentInvoiceRow[]>;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  linkPaymentInvoices(paymentId: number, invoices: PaymentInvoiceRow[]): Promise<void>;
  markInvoicesPaid(userId: number, invoiceIds: number[]): Promise<void>;
}

export interface PaymentRepository {
  listUnpaidInvoices(userId: number): Promise<Array<PaymentInvoiceRow & { invoice_date: string; vendor_name: string | null }>>;
  listGlAccounts(): Promise<GlAccountOption[]>;
  withTransaction<T>(runner: (tx: PaymentTransactionRepository) => Promise<T>): Promise<T>;
}

class DrizzlePaymentTransactionRepository implements PaymentTransactionRepository {
  constructor(private readonly tx: DrizzleClient) {}

  async syncInvoicePaidStatus(userId: number): Promise<void> {
    await syncInvoicePaidStatusByPaymentDate(this.tx, userId);
  }

  async loadUnpaidInvoices(userId: number, invoiceIds: number[]): Promise<PaymentInvoiceRow[]> {
    const rows = await this.tx
      .select({
        invoice_id: t.invoices.invoice_id,
        amount: t.invoices.amount,
        account_id: t.invoices.account_id,
      })
      .from(t.invoices)
      .where(
        and(
          eq(t.invoices.user_id, userId),
          eq(t.invoices.is_paid, false),
          inArray(t.invoices.invoice_id, invoiceIds),
        ),
      );

    return rows.map((row) => ({
      invoice_id: row.invoice_id,
      amount: Number(row.amount),
      account_id: row.account_id,
    }));
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    let inserted: CreatedPayment | undefined;

    try {
      const rows = await this.tx
        .insert(t.payment)
        .values({
          user_id: input.userId,
          account_id: input.accountId,
          voucher_number: input.voucherNumber,
          payment_date: input.paymentDate,
          pay_type: input.payType,
          total_amount: input.totalAmount.toFixed(2),
          description: input.description,
        })
        .returning({
          payment_id: t.payment.payment_id,
          voucher_number: t.payment.voucher_number,
        });
      inserted = rows[0];
    } catch (error) {
      const reason = getDatabaseErrorReason(error);
      throw new Error(
        `Payment insert failed (account_id=${input.accountId}, pay_type=${input.payType}, payment_date=${input.paymentDate}). ${reason}`,
      );
    }

    if (!inserted) {
      throw new Error("Failed to create payment record.");
    }

    return inserted;
  }

  async linkPaymentInvoices(paymentId: number, invoices: PaymentInvoiceRow[]): Promise<void> {
    await this.tx.insert(t.payment_invoice).values(
      invoices.map((invoice) => ({
        payment_id: paymentId,
        invoice_id: invoice.invoice_id,
        amount_paid: Number(invoice.amount).toFixed(2),
      })),
    );
  }

  async markInvoicesPaid(userId: number, invoiceIds: number[]): Promise<void> {
    if (!invoiceIds.length) {
      return;
    }

    await this.tx
      .update(t.invoices)
      .set({ is_paid: true })
      .where(
        and(
          eq(t.invoices.user_id, userId),
          inArray(t.invoices.invoice_id, invoiceIds),
        ),
      );
  }
}

export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(private readonly db: DrizzleClient) {}

  async listUnpaidInvoices(userId: number): Promise<Array<PaymentInvoiceRow & { invoice_date: string; vendor_name: string | null }>> {
    await syncInvoicePaidStatusByPaymentDate(this.db, userId);

    const rows = await this.db
      .select({
        invoice_id: t.invoices.invoice_id,
        invoice_date: t.invoices.invoice_date,
        amount: t.invoices.amount,
        account_id: t.invoices.account_id,
        vendor_name: t.vendor.vendor_name,
      })
      .from(t.invoices)
      .leftJoin(t.vendor, eq(t.invoices.vendor_id, t.vendor.vendor_id))
      .where(
        and(
          eq(t.invoices.user_id, userId),
          eq(t.invoices.is_paid, false),
        ),
      )
      .orderBy(desc(t.invoices.invoice_id));

    return rows.map((row) => ({
      invoice_id: row.invoice_id,
      invoice_date: row.invoice_date,
      amount: Number(row.amount),
      account_id: row.account_id,
      vendor_name: row.vendor_name,
    }));
  }

  async listGlAccounts(): Promise<GlAccountOption[]> {
    return await this.db
      .select({
        account_id: t.gl_accounts.account_id,
        account_name: t.gl_accounts.account_name,
        account_type: t.gl_accounts.account_type,
      })
      .from(t.gl_accounts)
      .orderBy(asc(t.gl_accounts.account_id));
  }

  async withTransaction<T>(runner: (tx: PaymentTransactionRepository) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (tx) => {
      const txRepository = new DrizzlePaymentTransactionRepository(tx);
      return await runner(txRepository);
    });
  }
}

export function shouldMarkInvoicesPaidNow(paymentDate: string): boolean {
  const today = getTodayDateKey({ timeZone: BUSINESS_TIME_ZONE });
  return paymentDate <= today;
}
