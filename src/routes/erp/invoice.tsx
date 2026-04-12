import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabaseBrowser } from "#/lib/supabaseBrowser";

export const Route = createFileRoute("/erp/invoice")({
  component: InvoicePage,
});

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
  tax_rate: number;
};

type Customer = { id: string; name: string };
type VendorApiResponse =
  | {
      ok: true;
      vendors: Array<{ vendor_id: number; vendor_name: string }>;
    }
  | {
      ok: false;
      error?: string;
    };

function InvoicePage() {
  const navigate = useNavigate();
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(inNDays(30));
  const [customer, setCustomer] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (!user) {
      void navigate({ to: "/auth/login" });
      return;
    }

    const stored = JSON.parse(localStorage.getItem("currentLineItems") ?? "[]");
    if (stored.length) {
      setLineItems(stored);
    } else {
      addRow();
    }
    void loadCustomers();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("currentLineItems", JSON.stringify(lineItems));
  }, [lineItems]);

  async function loadCustomers() {
    try {
      const response = await fetch("/api/display-vendors");
      if (response.ok) {
        const payload = (await response.json()) as VendorApiResponse;
        if (payload.ok) {
          setCustomers(
            payload.vendors.map((vendor) => ({
              id: String(vendor.vendor_id),
              name: vendor.vendor_name,
            })),
          );
          return;
        }
      }

      if (supabaseBrowser) {
        const { data, error } = await supabaseBrowser
          .from("vendor")
          .select("vendor_id, vendor_name");
        if (!error && data) {
          setCustomers(data.map((v) => ({ id: String(v.vendor_id), name: v.vendor_name })));
          return;
        }
      }
    } catch {
      // fall back below
    }

    const local = JSON.parse(localStorage.getItem("erp_customers") ?? "[]");
    setCustomers(local.map((c: any) => ({ id: c.id ?? c.name, name: c.name ?? c.vendor_name })));
  }

  function addRow() {
    setLineItems((rows) => [
      ...rows,
      { id: crypto.randomUUID(), description: "", quantity: 1, price: 0, tax_rate: 0 },
    ]);
  }

  function updateRow(id: string, field: keyof LineItem, value: string) {
    setLineItems((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === "description" ? value : Math.max(0, Number(value) || 0),
            }
          : row,
      ),
    );
  }

  function deleteRow(id: string) {
    setLineItems((rows) => rows.filter((r) => r.id !== id));
  }

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.price * (item.tax_rate / 100),
      0,
    );
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [lineItems]);

  async function handleSave() {
    if (!lineItems.length) {
      setError("Add at least one line item.");
      return;
    }
    if (!customer) {
      setError("Please select a vendor.");
      return;
    }
    setError("");
    setSaving(true);
    const selectedVendor = customers.find((vendor) => vendor.id === customer);

    const invoiceData = {
      invoice_number: `INV-${Date.now()}`,
      date: invoiceDate,
      due_date: dueDate,
      customer: selectedVendor?.name ?? customer,
      vendor_id: Number(customer),
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      line_items: lineItems,
      status: "sent",
    };

    try {
      if (supabaseBrowser) {
        await supabaseBrowser.from("invoices").insert([invoiceData]);
      }
    } catch {
      // ignore and fall back to local storage
    }

    const local = JSON.parse(localStorage.getItem("erp_invoices") ?? "[]");
    local.unshift(invoiceData);
    localStorage.setItem("erp_invoices", JSON.stringify(local));
    localStorage.removeItem("currentLineItems");

    await navigate({ to: "/erp/dashboard" });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">New Invoice</h1>
          <button
            onClick={() => navigate({ to: "/erp/dashboard" })}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:border-white/25"
          >
            Back to dashboard
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Invoice Number">
              <input
                readOnly
                value="Auto-generated"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none"
              />
            </Field>
            <Field label="Vendor">
              <select
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none"
              >
                <option value="">Select vendor</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Invoice Date">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none"
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none"
              />
            </Field>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="text-slate-300">
                <tr>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Description</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Qty</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Price</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Tax %</th>
                  <th className="border-b border-white/10 px-3 py-2 text-left">Total</th>
                  <th className="border-b border-white/10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="border-b border-white/5 px-3 py-2">
                      <input
                        value={item.description}
                        onChange={(e) => updateRow(item.id, "description", e.target.value)}
                        placeholder="Item description"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-slate-100 outline-none"
                      />
                    </td>
                    <td className="border-b border-white/5 px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => updateRow(item.id, "quantity", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-slate-100 outline-none"
                      />
                    </td>
                    <td className="border-b border-white/5 px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateRow(item.id, "price", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-slate-100 outline-none"
                      />
                    </td>
                    <td className="border-b border-white/5 px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={item.tax_rate}
                        onChange={(e) => updateRow(item.id, "tax_rate", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-slate-100 outline-none"
                      />
                    </td>
                    <td className="border-b border-white/5 px-3 py-2 font-semibold text-cyan-200">
                      ${(item.quantity * item.price * (1 + item.tax_rate / 100)).toFixed(2)}
                    </td>
                    <td className="border-b border-white/5 px-3 py-2 text-right">
                      <button
                        className="text-sm text-slate-300 hover:text-red-300"
                        onClick={() => deleteRow(item.id)}
                        aria-label="Delete row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={addRow}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
            >
              + Add line item
            </button>

            <div className="flex flex-col gap-1 text-sm text-slate-200">
              <div className="flex justify-between gap-6">
                <span>Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span>Tax</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-6 text-base font-semibold">
                <span>Total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span className="text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function inNDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
