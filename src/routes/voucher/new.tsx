import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import * as v from "valibot";

import { DashboardLayout } from "../../components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "../../lib/auth";
import { DatabaseProvider } from "../../lib/provider";
import {
  SESSION_TIMEOUT_RULES,
  useSessionTimeoutTracker,
} from "../../lib/session-timeout";

type Account = {
  account_id: number;
  account_name: string;
  account_type: string;
};

const PAY_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
] as const;

const getVoucherFormOptions = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const { DrizzlePaymentRepository } = await import("../../lib/payment/payment-repository");
    const { PaymentService } = await import("../../lib/payment/payment-service");
    const repository = new DrizzlePaymentRepository(context.db);
    const service = new PaymentService(repository);
    return await service.getVoucherFormOptions(context.auth.profile.user_id);
  });

const saveVoucherPayment = createServerFn({ method: "POST" })
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(
    v.object({
      invoiceIds: v.array(v.number()),
      voucherNumber: v.string(),
      accountId: v.number(),
      paymentDate: v.string(),
      payType: v.string(),
      description: v.optional(v.string(), ""),
    }),
  )
  .handler(async ({ context, data }) => {
    const { DrizzlePaymentRepository } = await import("../../lib/payment/payment-repository");
    const { PaymentService } = await import("../../lib/payment/payment-service");
    const repository = new DrizzlePaymentRepository(context.db);
    const service = new PaymentService(repository);

    return await service.createVoucherPayment({
      userId: context.auth.profile.user_id,
      invoiceIds: data.invoiceIds,
      voucherNumber: data.voucherNumber,
      accountId: data.accountId,
      paymentDate: data.paymentDate,
      payType: data.payType,
      description: data.description,
    });
  });



export const Route = createFileRoute("/voucher/new")({
  component: NewVoucherPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getVoucherFormOptions(),
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
  const { invoices, accounts } = Route.useLoaderData();
  const router = useRouter();
  const { remainingLabel } = useSessionTimeoutTracker({
    rule: SESSION_TIMEOUT_RULES.createVoucher,
  });

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

  const selectedInvoiceIds = useMemo(
    () =>
      Array.from(
        new Set(formData.selectedInvoices.filter((id) => id > 0))
      ),
    [formData.selectedInvoices]
  );

  const selectedInvoices = useMemo(
    () =>
      invoices.filter((inv) =>
        selectedInvoiceIds.includes(inv.invoice_id)
      ),
    [selectedInvoiceIds, invoices]
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
      const nextId = invoiceId > 0 ? invoiceId : 0;

      // Keep dropdown rows stable while preventing duplicate invoice selection.
      if (nextId > 0) {
        const duplicateIndex = newSelectedInvoices.findIndex(
          (id, i) => i !== index && id === nextId
        );

        if (duplicateIndex >= 0) {
          newSelectedInvoices[duplicateIndex] = 0;
        }
      }

      newSelectedInvoices[index] = nextId;

      const selectedCount = newSelectedInvoices.filter((id) => id > 0).length;

      return {
        ...prev,
        selectedInvoices: newSelectedInvoices,
        voucherNumber: selectedCount > 0 && prev.voucherNumber === ""
          ? `VCH-${Date.now()}`
          : prev.voucherNumber,
        description: selectedCount > 0 && prev.description === ""
          ? `Payment for ${selectedCount} invoice${selectedCount > 1 ? "s" : ""}`
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
          <div className="flex items-center gap-2">
            <span className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Session timeout: {remainingLabel}
            </span>
            <button
              type="button"
              onClick={() => router.navigate({ to: "/voucher" })}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30"
            >
              Back to Vouchers
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Selection */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Invoices to Pay</h3>
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
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Voucher Number *
              </label>
              <input
                name="voucherNumber"
                value={formData.voucherNumber}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="Auto-generated"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account *
              </label>
              <select
                name="accountId"
                value={formData.accountId || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Account</option>
                {accounts.map((acc: Account) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_id} - {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Date *
              </label>
              <input
                name="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pay Type *
              </label>
              <select
                name="payType"
                value={formData.payType}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Pay Type</option>
                {PAY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>


            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
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
