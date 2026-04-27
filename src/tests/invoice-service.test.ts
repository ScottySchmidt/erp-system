import { describe, expect, it } from "vitest";

import {
  type InvoiceRepository,
} from "#/lib/invoice/invoice-repository";
import { InvoiceApplicationService } from "#/lib/invoice/invoice-app-service";
import { InvoiceService } from "#/lib/invoice/invoice-service";
import {
  type InvoiceCreateValues,
  type InvoiceLineItemInput,
} from "#/lib/invoice/invoice-types";

class FakeInvoiceRepository implements InvoiceRepository {
  lastCreateInput:
    | {
        userId: number;
        values: InvoiceCreateValues;
        lineItems: InvoiceLineItemInput[];
        createdDate: string;
      }
    | undefined;

  async listFormOptions() {
    return {
      accounts: [],
      vendors: [],
    };
  }

  async createForUser(input: {
    userId: number;
    values: InvoiceCreateValues;
    lineItems: InvoiceLineItemInput[];
    createdDate: string;
  }) {
    this.lastCreateInput = input;
    return { invoice_id: 901 };
  }
}

describe("InvoiceService", () => {
  it("calculates subtotal, tax, and total from line items", () => {
    const service = new InvoiceService();

    const totals = service.calculateTotals([
      { description: "Paper", quantity: 2, price: 10, tax_rate: 5 },
      { description: "Ink", quantity: 1, price: 3.25, tax_rate: 10 },
    ]);

    expect(totals.subtotal).toBe(23.25);
    expect(totals.tax).toBe(1.32);
    expect(totals.total).toBe(24.57);
  });

  it("validates invalid line item details", () => {
    const service = new InvoiceService();

    const errors = service.validateLineItems([
      { description: "", quantity: 0, price: -1, tax_rate: 150 },
    ]);

    expect(errors).toEqual([
      "Line item 1: Description is required.",
      "Line item 1: Quantity must be greater than 0.",
      "Line item 1: Price cannot be negative.",
      "Line item 1: Tax rate must be between 0 and 100.",
    ]);
  });

  it("creates invoice with computed total amount", async () => {
    const repository = new FakeInvoiceRepository();
    const service = new InvoiceApplicationService(repository);

    const result = await service.createInvoiceForUser({
      userId: 42,
      values: {
        account_id: 2001,
        vendor_id: 88,
        invoice_date: "2026-04-27",
      },
      lineItems: [
        { description: "Widget", quantity: 2, price: 12.5, tax_rate: 8 },
      ],
      createdDate: "2026-04-27",
    });

    expect(result.invoice_id).toBe(901);
    expect(repository.lastCreateInput?.values.amount).toBe("27.00");
  });
});
