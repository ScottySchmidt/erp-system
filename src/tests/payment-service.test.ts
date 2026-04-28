import { describe, expect, it } from "vitest";

import {
  type CreatedPayment,
  type CreatePaymentInput,
  type GlAccountOption,
  type PaymentInvoiceRow,
  type PaymentRepository,
  type PaymentTransactionRepository,
} from "#/lib/payment/payment-repository";
import { PaymentService } from "#/lib/payment/payment-service";

class FakePaymentRepository implements PaymentRepository {
  private nextPaymentId = 500;
  private readonly invoiceById = new Map<
    number,
    PaymentInvoiceRow & { is_paid: boolean; user_id: number }
  >();
  private readonly payments: Array<CreatePaymentInput & { payment_id: number }> = [];
  private links: Array<{ payment_id: number; invoice_id: number; amount_paid: number }> = [];

  constructor(seedInvoices: Array<PaymentInvoiceRow & { is_paid: boolean; user_id: number }>) {
    seedInvoices.forEach((invoice) => {
      this.invoiceById.set(invoice.invoice_id, invoice);
    });
  }

  async listUnpaidInvoices(userId: number) {
    return Array.from(this.invoiceById.values())
      .filter((invoice) => invoice.user_id === userId && !invoice.is_paid)
      .map((invoice) => ({
        invoice_id: invoice.invoice_id,
        invoice_date: "2026-04-27",
        amount: invoice.amount,
        account_id: invoice.account_id,
        vendor_name: null,
      }));
  }

  async listGlAccounts(): Promise<GlAccountOption[]> {
    return [
      { account_id: 1000, account_name: "Cash", account_type: "asset" },
      { account_id: 2001, account_name: "Accounts Payable", account_type: "liability" },
    ];
  }

  async withTransaction<T>(runner: (tx: PaymentTransactionRepository) => Promise<T>): Promise<T> {
    const tx: PaymentTransactionRepository = {
      syncInvoicePaidStatus: async () => {},
      loadUnpaidInvoices: async (userId, invoiceIds) => {
        const rows: PaymentInvoiceRow[] = [];
        invoiceIds.forEach((invoiceId) => {
          const invoice = this.invoiceById.get(invoiceId);
          if (!invoice || invoice.user_id !== userId || invoice.is_paid) {
            return;
          }

          rows.push({
            invoice_id: invoice.invoice_id,
            amount: invoice.amount,
            account_id: invoice.account_id,
          });
        });

        return rows;
      },
      createPayment: async (input) => {
        const payment: CreatePaymentInput & { payment_id: number } = {
          ...input,
          payment_id: this.nextPaymentId++,
        };
        this.payments.push(payment);

        const created: CreatedPayment = {
          payment_id: payment.payment_id,
          voucher_number: payment.voucherNumber,
        };
        return created;
      },
      linkPaymentInvoices: async (paymentId, invoices) => {
        this.links = [
          ...this.links,
          ...invoices.map((invoice) => ({
            payment_id: paymentId,
            invoice_id: invoice.invoice_id,
            amount_paid: invoice.amount,
          })),
        ];
      },
      markInvoicesPaid: async (_userId, invoiceIds) => {
        invoiceIds.forEach((invoiceId) => {
          const existing = this.invoiceById.get(invoiceId);
          if (existing) {
            existing.is_paid = true;
            this.invoiceById.set(invoiceId, existing);
          }
        });
      },
    };

    return await runner(tx);
  }

  getPaymentCount(): number {
    return this.payments.length;
  }

  getLinkCount(): number {
    return this.links.length;
  }

  isInvoicePaid(invoiceId: number): boolean {
    return this.invoiceById.get(invoiceId)?.is_paid ?? false;
  }
}

describe("PaymentService", () => {
  it("loads voucher form options with gl account data", async () => {
    const repository = new FakePaymentRepository([
      { invoice_id: 11, amount: 120.5, account_id: 2001, is_paid: false, user_id: 7 },
    ]);
    const service = new PaymentService(repository);

    const result = await service.getVoucherFormOptions(7);

    expect(result.invoices).toHaveLength(1);
    expect(result.accounts).toEqual([
      { account_id: 1000, account_name: "Cash", account_type: "asset" },
      { account_id: 2001, account_name: "Accounts Payable", account_type: "liability" },
    ]);
  });

  it("creates voucher payment and marks selected invoices paid", async () => {
    const repository = new FakePaymentRepository([
      { invoice_id: 11, amount: 120.5, account_id: 2001, is_paid: false, user_id: 7 },
      { invoice_id: 12, amount: 30, account_id: 2001, is_paid: false, user_id: 7 },
    ]);

    const service = new PaymentService(repository, {
      generateVoucherNumber: () => "VCH-UNIT-1",
    });

    const result = await service.createVoucherPayment({
      userId: 7,
      invoiceIds: [11, 12],
      voucherNumber: "",
      accountId: 2001,
      paymentDate: "2026-04-27",
      payType: "cash",
      description: "Pay invoices",
    });

    expect(result.success).toBe(true);
    expect(result.voucherNumber).toBe("VCH-UNIT-1");
    expect(result.updatedCount).toBe(2);
    expect(result.totalAmount).toBe(150.5);
    expect(repository.getPaymentCount()).toBe(1);
    expect(repository.getLinkCount()).toBe(2);
    expect(repository.isInvoicePaid(11)).toBe(true);
    expect(repository.isInvoicePaid(12)).toBe(true);
  });

  it("throws when no invoices are selected", async () => {
    const repository = new FakePaymentRepository([]);
    const service = new PaymentService(repository);

    await expect(
      service.createVoucherPayment({
        userId: 7,
        invoiceIds: [],
        accountId: 2001,
        paymentDate: "2026-04-27",
        payType: "cash",
      }),
    ).rejects.toThrow("No invoices selected.");
  });

  it("throws when invoice is missing or already paid", async () => {
    const repository = new FakePaymentRepository([
      { invoice_id: 21, amount: 100, account_id: 3000, is_paid: false, user_id: 7 },
      { invoice_id: 22, amount: 50, account_id: 3000, is_paid: true, user_id: 7 },
    ]);
    const service = new PaymentService(repository);

    await expect(
      service.createVoucherPayment({
        userId: 7,
        invoiceIds: [21, 22, 99],
        accountId: 3000,
        paymentDate: "2026-04-27",
        payType: "check",
      }),
    ).rejects.toThrow("Selected invoice(s) are missing or already paid: 22, 99.");
  });
});
