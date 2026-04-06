import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { supabaseBrowser } from "#/lib/supabaseBrowser";
import { DatabaseProvider } from "#/lib/provider";
import { MustAuthenticate } from "#/lib/auth";
import { t } from "#/lib/server/database";

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

type Vendor = { id: string; name: string };

const InvoiceCreateSchema = z.object({
  vendor_id: z.number().int().positive(),
  invoice_date: z.string().min(1),
  amount: z.number(),
  account_id: z.number().int().optional(),
});

const createInvoice = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(InvoiceCreateSchema)
  .handler(async ({ data, context }) => {
    const inserted = await context.db
      .insert(t.invoices)
      .values({
        user_id: context.auth.profile.user_id!,
        account_id: data.account_id ?? 1,
        vendor_id: data.vendor_id,
        invoice_date: data.invoice_date,
        amount: data.amount,
        created_date: today(),
      })
      .returning({ invoice_id: t.invoices.invoice_id })
      .then((rows) => rows[0]);

    if (!inserted) throw new Error("Failed to create invoice");
    return inserted;
  });

function InvoicePage() {
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(inNDays(30));
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
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
    void loadVendors();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("currentLineItems", JSON.stringify(lineItems));
  }, [lineItems]);

  async function loadVendors() {
    try {
      if (supabaseBrowser) {
        const { data, error } = await supabaseBrowser.from("vendor").select("vendor_id, vendor_name");
        if (!error && data) {
          const uniqueByName = Object.values(
            data.reduce<Record<string, Vendor>>((acc, v) => {
              if (!acc[v.vendor_name]) acc[v.vendor_name] = { id: String(v.vendor_id), name: v.vendor_name };
              return acc;
            }, {}),
          );
          setVendors(uniqueByName);
          return;
        }
      }
    } catch {
      // fall back below
    }

    const local = JSON.parse(localStorage.getItem("erp_vendors") ?? "[]");
    setVendors(local.map((c: any) => ({ id: c.id ?? c.name, name: c.name ?? c.vendor_name })));
    setPageLoading(false);
  }

  useEffect(() => {
    if (vendors.length) {
      setPageLoading(false);
    }
  }, [vendors]);

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
    if (!vendorId) {
      setError("Select a vendor.");
      return;
    }
    setError("");
    setSaving(true);

    try {
      await createInvoice({
        data: {
          vendor_id: Number(vendorId),
          invoice_date: invoiceDate,
          amount: totals.total,
          account_id: 1,
        },
      });
      localStorage.removeItem("currentLineItems");
      await navigate({ to: "/erp/dashboard" });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to save invoice.";
      setError(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] px-4 py-10 text-slate-100">
      {pageLoading && <LoadingOverlay label="Loading invoice..." />}
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
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 outline-none"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
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

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-6 py-5 text-sm text-slate-100 shadow-lg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/60 border-t-transparent" />
        <span>{label}</span>
      </div>
    </div>
  );
}
