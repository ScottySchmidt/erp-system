import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { DashboardLayout } from "../../components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "../../lib/auth";
import { DatabaseProvider } from "../../lib/provider";
import { t } from "../../lib/server/database";

type Account = {
  account_id: number;
  account_description: string;
};

const ACCOUNTS: Account[] = [
  { account_id: 1000, account_description: "Cash" },
  { account_id: 1100, account_description: "Accounts Receivable" },
  { account_id: 2000, account_description: "Accounts Payable" },
  { account_id: 4000, account_description: "Revenue" },
  { account_id: 5000, account_description: "Office Supplies" },
  { account_id: 5100, account_description: "Professional Services" },
  { account_id: 5200, account_description: "Utilities" },
  { account_id: 5300, account_description: "Travel & Entertainment" },
  { account_id: 6000, account_description: "Depreciation" },
];

const PAY_TYPES = [
  "Cash",
  "Bank Transfer",
  "Check",
  "Credit Card",
  "Debit Card",
] as const;

const getUnpaidInvoices = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const invoices = await context.db
      .select({
        invoice_id: t.invoices.invoice_id,
        invoice_date: t.invoices.invoice_date,
        amount: t.invoices.amount,
        vendor_name: t.vendor.vendor_name,
      })
      .from(t.invoices)
      .leftJoin(t.vendor, eq(t.invoices.vendor_id, t.vendor.vendor_id))
      .where(
        and(
          eq(t.invoices.user_id, context.auth.profile.user_id),
          eq(t.invoices.is_paid, false),
        )
      )
      .orderBy(desc(t.invoices.invoice_id));

    return invoices;
  });

const saveVoucherPayment = createServerFn({ method: "POST" })
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async (ctx: any) => {
    const context = ctx.context as any;
    const data = (ctx.data as any) ?? {};

    const invoiceIds: number[] = data.invoiceIds ?? [];
    const voucherNumber: string = data.voucherNumber ?? "";
    const accountId: number | null = data.accountId ?? null;
    const paymentDate: string = data.paymentDate ?? "";
    const payType: string = data.payType ?? "";
    const description: string = data.description ?? "";

    if (!invoiceIds.length) {
      throw new Error("No invoices selected.");
    }

    if (!accountId || !paymentDate || !payType) {
      throw new Error("Missing required payment data.");
    }

    return await context.db.transaction(async (tx: any) => {
      const invoiceRows = await tx
        .select({
          invoice_id: t.invoices.invoice_id,
          amount: t.invoices.amount,
        })
        .from(t.invoices)
        .where(
          and(
            eq(t.invoices.user_id, context.auth.profile.user_id),
            eq(t.invoices.is_paid, false),
            inArray(t.invoices.invoice_id, invoiceIds),
          )
        );

      if (!invoiceRows.length) {
        throw new Error("No valid unpaid invoices found.");
      }

      const totalAmount = invoiceRows.reduce(
        (sum: number, inv: any) => sum + Number(inv.amount),
        0,
      );

      const insertedPayment = await tx
        .insert(t.payment)
        .values({
          user_id: context.auth.profile.user_id,
          account_id: accountId,
          voucher_number: voucherNumber || `VCH-${Date.now()}`,
          payment_date: paymentDate,
          pay_type: payType,
          total_amount: totalAmount,
          description: description || null,
        })
        .returning({
          payment_id: t.payment.payment_id,
          voucher_number: t.payment.voucher_number,
        });

      const paymentId = insertedPayment[0]?.payment_id;
      const savedVoucherNumber = insertedPayment[0]?.voucher_number;

      if (!paymentId) {
        throw new Error("Failed to create payment record.");
      }

      await tx.insert(t.payment_invoice).values(
        invoiceRows.map((inv: any) => ({
          payment_id: paymentId,
          invoice_id: inv.invoice_id,
          amount_paid: Number(inv.amount),
        }))
      );

      await tx
        .update(t.invoices)
        .set({
          is_paid: true,
        })
        .where(
          and(
            eq(t.invoices.user_id, context.auth.profile.user_id),
            inArray(
              t.invoices.invoice_id,
              invoiceRows.map((inv: any) => inv.invoice_id),
            ),
          )
        );

      return {
        success: true,
        paymentId,
        voucherNumber: savedVoucherNumber,
        updatedCount: invoiceRows.length,
        totalAmount,
      };
    });
  });



export const Route = createFileRoute("/erp/new-voucher")({
  component: NewVoucherPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getUnpaidInvoices(),
});

type VoucherFormData = {
  selectedInvoices: number[];
  voucherNumber: string;
  accountId: number | null;
  paymentDate: string;
  payType: string;
  description: string;
};

function NewVoucherPage() {
  const invoices = Route.useLoaderData();
  const router = useRouter();

  const [formData, setFormData] = useState<VoucherFormData>({
    selectedInvoices: [],
    voucherNumber: "",
    accountId: null,
    paymentDate: "",
    payType: "",
    description: "",
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedInvoices = useMemo(
    () =>
      invoices.filter((inv) =>
        formData.selectedInvoices.includes(inv.invoice_id)
      ),
    [formData.selectedInvoices, invoices]
  );

  const totalAmount = useMemo(
    () =>
      selectedInvoices.reduce(
        (sum, inv) => sum + Number(inv.amount),
        0
      ),
    [selectedInvoices]
  );

  const handleInvoiceSelect = (index: number, invoiceId: number) => {
    setFormData((prev) => {
      const newSelectedInvoices = [...prev.selectedInvoices];
      newSelectedInvoices[index] = invoiceId;

      // Remove duplicates
      const uniqueInvoices = [...new Set(newSelectedInvoices.filter(id => id > 0))];

      return {
        ...prev,
        selectedInvoices: uniqueInvoices,
        voucherNumber: uniqueInvoices.length > 0 && prev.voucherNumber === ""
          ? `VCH-${Date.now()}`
          : prev.voucherNumber,
        description: uniqueInvoices.length > 0 && prev.description === ""
          ? `Payment for ${uniqueInvoices.length} invoice${uniqueInvoices.length > 1 ? 's' : ''}`
          : prev.description,
      };
    });
  };

  const addInvoiceDropdown = () => {
    setFormData((prev) => ({
      ...prev,
      selectedInvoices: [...prev.selectedInvoices, 0], // Add placeholder
    }));
  };

  const removeInvoiceDropdown = (index: number) => {
    setFormData((prev) => {
      const newSelectedInvoices = prev.selectedInvoices.filter((_, i) => i !== index);
      return {
        ...prev,
        selectedInvoices: newSelectedInvoices,
      };
    });
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedInvoices.length === 0) {
      alert("Please select at least one invoice.");
      return;
    }

    if (!formData.accountId || !formData.paymentDate || !formData.payType) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);

      const invoiceIds = selectedInvoices.map((inv) => inv.invoice_id);

      const result = await saveVoucherPayment({
        data: {
          voucherNumber: formData.voucherNumber,
          invoiceIds,
          accountId: formData.accountId,
          paymentDate: formData.paymentDate,
          payType: formData.payType,
          description: formData.description,
        },
      });

      setSuccessMessage(
        `Voucher ${result.voucherNumber} created for ${result.updatedCount} invoice${
          result.updatedCount > 1 ? "s" : ""
        } totaling $${Number(result.totalAmount).toFixed(2)}.`
      );

      setFormData({
        selectedInvoices: [],
        voucherNumber: "",
        accountId: null,
        paymentDate: "",
        payType: "",
        description: "",
      });

      await router.invalidate();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to create voucher payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Create New Voucher">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Create Payment Voucher</h1>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Selection */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Invoices to Pay</h3>
              <button
                type="button"
                onClick={addInvoiceDropdown}
                className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              >
                + Add Invoice
              </button>
            </div>

            <div className="space-y-3">
              {formData.selectedInvoices.map((selectedId, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice {index + 1}
                    </label>
                    <select
                      value={selectedId || ""}
                      onChange={(e) => handleInvoiceSelect(index, Number(e.target.value))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select an invoice</option>
                      {invoices
                        .filter(inv => !formData.selectedInvoices.includes(inv.invoice_id) || inv.invoice_id === selectedId)
                        .map((invoice) => (
                        <option key={invoice.invoice_id} value={invoice.invoice_id}>
                          Invoice #{invoice.invoice_id} - {invoice.vendor_name || 'Unknown Vendor'} - ${Number(invoice.amount).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.selectedInvoices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInvoiceDropdown(index)}
                      className="mt-6 rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {formData.selectedInvoices.length === 0 && (
                <button
                  type="button"
                  onClick={addInvoiceDropdown}
                  className="w-full rounded-md border-2 border-dashed border-gray-300 py-8 text-gray-500 hover:border-gray-400 hover:text-gray-600"
                >
                  + Click to add first invoice
                </button>
              )}
            </div>

            {selectedInvoices.length > 0 && (
              <div className="mt-4 rounded bg-blue-50 p-3">
                <div className="text-sm text-blue-800">
                  <strong>{selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected</strong>
                  <span className="ml-2">Total: ${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Voucher Details */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voucher Number *
              </label>
              <input
                name="voucherNumber"
                value={formData.voucherNumber}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Auto-generated"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account *
              </label>
              <select
                name="accountId"
                value={formData.accountId || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Account</option>
                {ACCOUNTS.map((acc) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_description} ({acc.account_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                name="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Type *
              </label>
              <select
                name="payType"
                value={formData.payType}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Pay Type</option>
                {PAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>


            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Payment description..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="submit"
              disabled={selectedInvoices.length === 0 || isSubmitting}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Create Voucher"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default NewVoucherPage;