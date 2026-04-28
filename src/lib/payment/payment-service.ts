import {
  type GlAccountOption,
  shouldMarkInvoicesPaidNow,
  type PaymentInvoiceRow,
  type PaymentRepository,
  type VoucherPayType,
} from "#/lib/payment/payment-repository";

const ALLOWED_PAY_TYPES: ReadonlySet<VoucherPayType> = new Set([
  "cash",
  "check",
  "credit_card",
]);

export type CreateVoucherPaymentInput = {
  userId: number;
  invoiceIds: number[];
  voucherNumber?: string;
  accountId: number;
  paymentDate: string;
  payType: string;
  description?: string;
};

export type CreateVoucherPaymentResult = {
  success: true;
  paymentId: number;
  voucherNumber: string;
  updatedCount: number;
  totalAmount: number;
};

export type VoucherFormOptions = {
  invoices: Array<PaymentInvoiceRow & { invoice_date: string; vendor_name: string | null }>;
  accounts: GlAccountOption[];
};

type PaymentServiceOptions = {
  generateVoucherNumber?: () => string;
};

export class PaymentService {
  private readonly generateVoucherNumber: () => string;

  constructor(
    private readonly repository: PaymentRepository,
    options: PaymentServiceOptions = {},
  ) {
    this.generateVoucherNumber = options.generateVoucherNumber ?? (() => `VCH-${Date.now()}`);
  }

  async getVoucherFormOptions(userId: number): Promise<VoucherFormOptions> {
    const invoices = await this.repository.listUnpaidInvoices(userId);
    const accounts = await this.repository.listGlAccounts();
    return {
      invoices,
      accounts,
    };
  }

  async createVoucherPayment(input: CreateVoucherPaymentInput): Promise<CreateVoucherPaymentResult> {
    const invoiceIds = this.normalizeInvoiceIds(input.invoiceIds);
    const payType = this.normalizePayType(input.payType);
    const voucherNumber = input.voucherNumber?.trim() || this.generateVoucherNumber();
    const description = input.description?.trim() || null;

    if (!invoiceIds.length) {
      throw new Error("No invoices selected.");
    }

    if (!input.accountId || !input.paymentDate || !payType) {
      throw new Error("Missing required payment data.");
    }

    if (!ALLOWED_PAY_TYPES.has(payType)) {
      throw new Error("Invalid payment type.");
    }

    return await this.repository.withTransaction(async (tx) => {
      await tx.syncInvoicePaidStatus(input.userId);

      const invoiceRows = await tx.loadUnpaidInvoices(input.userId, invoiceIds);
      if (!invoiceRows.length) {
        throw new Error("No valid unpaid invoices found.");
      }

      const loadedIds = new Set(invoiceRows.map((row) => row.invoice_id));
      const missingOrPaidIds = invoiceIds.filter((id) => !loadedIds.has(id));

      if (missingOrPaidIds.length) {
        throw new Error(
          `Selected invoice(s) are missing or already paid: ${missingOrPaidIds.join(", ")}.`,
        );
      }

      const accountMismatch = invoiceRows.some(
        (invoice) => Number(invoice.account_id) !== Number(input.accountId),
      );
      if (accountMismatch) {
        throw new Error("Selected account does not match selected unpaid invoices.");
      }

      const totalAmount = this.calculateTotalAmount(invoiceRows);
      const created = await tx.createPayment({
        userId: input.userId,
        accountId: input.accountId,
        voucherNumber,
        paymentDate: input.paymentDate,
        payType,
        totalAmount,
        description,
      });

      await tx.linkPaymentInvoices(created.payment_id, invoiceRows);

      if (shouldMarkInvoicesPaidNow(input.paymentDate)) {
        await tx.markInvoicesPaid(
          input.userId,
          invoiceRows.map((invoice) => invoice.invoice_id),
        );
      } else {
        await tx.syncInvoicePaidStatus(input.userId);
      }

      return {
        success: true,
        paymentId: created.payment_id,
        voucherNumber: created.voucher_number,
        updatedCount: invoiceRows.length,
        totalAmount,
      };
    });
  }

  private normalizePayType(value: string): VoucherPayType {
    return value.toLowerCase().replaceAll(" ", "_") as VoucherPayType;
  }

  private normalizeInvoiceIds(invoiceIds: number[]): number[] {
    return Array.from(
      new Set(invoiceIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
    );
  }

  private calculateTotalAmount(invoiceRows: PaymentInvoiceRow[]): number {
    return Number(
      invoiceRows
        .reduce((sum, invoice) => sum + Number(invoice.amount), 0)
        .toFixed(2),
    );
  }
}
