import { Field, Input, Label } from "@headlessui/react";
import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import * as v from "valibot";

import { FieldError } from "#/components/form";
import { IntStrSchema, MoneySchema } from "#/lib/validation";

const PositiveMoneySchema = v.pipe(
  MoneySchema,
  v.transform((input) => Number(input)),
  v.minValue(0.01, "Amount must be greater than 0."),
  v.transform((input) => input.toFixed(2)),
);

export const DataSchema = v.object({
  account_id: v.pipe(v.number(), v.integer()),
  vendor_id: v.nullable(v.pipe(v.number(), v.integer())),
  invoice_date: v.string(),
  amount: PositiveMoneySchema,
  line_items: v.pipe(
    v.array(
      v.object({
        description: v.pipe(v.string(), v.nonEmpty("Description is required.")),
        quantity: v.pipe(v.number(), v.minValue(0.000001)),
        price: v.pipe(v.number(), v.minValue(0)),
        tax_rate: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
      }),
    ),
    v.minLength(1, "At least one line item is required."),
  ),
});

export const FormSchema = v.object({
  account_id: v.pipe(IntStrSchema, DataSchema.entries.account_id),
  vendor_id: v.pipe(
    v.union([v.literal(""), IntStrSchema]),
    v.transform((input) => (input === "" ? null : input)),
    DataSchema.entries.vendor_id,
  ),
  invoice_date: DataSchema.entries.invoice_date,
  amount: MoneySchema,
});

export interface InvoiceFormProps {
  submitText: string;
  errorText?: string;
  onSubmit: (data: v.InferInput<typeof DataSchema>) => Promise<void>;
  defaultValues: v.InferInput<typeof FormSchema>;
  initialLineItems?: Array<{
    description: string;
    quantity: number;
    price: number;
    tax_rate: number;
  }>;
  accounts?: { id: string; name: string }[];
  vendors?: { id: string; name: string }[];
}

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
  tax_rate: number;
};

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    price: 0,
    tax_rate: 0,
  };
}

function toCents(value: string | number | null | undefined): number | null {
  const sanitizedValue =
    typeof value === "string" ? value.replaceAll(",", "").replace("$", "").trim() : value;

  if (sanitizedValue === "" || sanitizedValue === "." || sanitizedValue === null) {
    return null;
  }

  const numericValue = typeof sanitizedValue === "number" ? sanitizedValue : Number(sanitizedValue);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.round(numericValue * 100);
}

function sanitizeMoneyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = cleaned.split(".");
  const decimal = decimalParts.join("").slice(0, 2);

  if (!decimalParts.length) {
    return whole;
  }

  return `${whole}.${decimal}`;
}

function formatMoneyInput(value: string): string {
  const cents = toCents(value);
  if (cents === null) {
    return value;
  }

  return (cents / 100).toFixed(2);
}

function getLineItemErrors(item: LineItem): string[] {
  const errors: string[] = [];

  if (!item.description.trim()) {
    errors.push("Description is required.");
  }

  if (item.quantity <= 0) {
    errors.push("Quantity must be greater than 0.");
  }

  if (item.price < 0) {
    errors.push("Price cannot be negative.");
  }

  if (item.tax_rate < 0 || item.tax_rate > 100) {
    errors.push("Tax rate must be between 0 and 100.");
  }

  return errors;
}

export function InvoiceForm(props: InvoiceFormProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>(() =>
    props.initialLineItems?.length
      ? props.initialLineItems.map((item) => ({
          id: crypto.randomUUID(),
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          tax_rate: item.tax_rate,
        }))
      : [createEmptyLineItem()],
  );
  const [submitDebugMessage, setSubmitDebugMessage] = useState<string | null>(null);
  const [priceInputsById, setPriceInputsById] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    const tax = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.price * (item.tax_rate / 100),
      0,
    );

    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [lineItems]);

  const calculatedTotalCents = useMemo(() => toCents(totals.total) ?? 0, [totals.total]);
  const calculatedTotalText = useMemo(
    () => (calculatedTotalCents / 100).toFixed(2),
    [calculatedTotalCents],
  );
  const lineItemErrorsById = useMemo(() => {
    const errors = new Map<string, string[]>();
    lineItems.forEach((item) => {
      errors.set(item.id, getLineItemErrors(item));
    });
    return errors;
  }, [lineItems]);
  const lineItemErrorSummaries = useMemo(
    () =>
      lineItems.flatMap((item, index) =>
        (lineItemErrorsById.get(item.id) ?? []).map(
          (message) => `Line item ${index + 1}: ${message}`,
        ),
      ),
    [lineItems, lineItemErrorsById],
  );

  const form = useForm({
    defaultValues: {
      ...props.defaultValues,
      amount:
        props.defaultValues.amount && Number(props.defaultValues.amount) > 0
          ? props.defaultValues.amount
          : "0.00",
    },
    validators: {
      onMount: FormSchema,
      onChange: FormSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitDebugMessage(null);

      if (lineItemErrorSummaries.length) {
        setSubmitDebugMessage(
          `Cannot submit invoice yet. ${lineItemErrorSummaries[0]} Fix the line-item issues and try again.`,
        );
        return;
      }

      if (calculatedTotalCents <= 0) {
        setSubmitDebugMessage("Cannot submit invoice yet. Amount must be greater than 0.");
        return;
      }

      const parsedForm = v.parse(FormSchema, {
        ...value,
        // Always submit the computed total from line items.
        amount: calculatedTotalText,
      });

      const data = v.parse(DataSchema, {
        ...parsedForm,
        line_items: lineItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          price: item.price,
          tax_rate: item.tax_rate,
        })),
      });

      await props.onSubmit(data);
    },
  });

  function addRow() {
    setSubmitDebugMessage(null);
    const nextItem = createEmptyLineItem();
    setLineItems((prev) => [...prev, nextItem]);
    setPriceInputsById((prev) => ({
      ...prev,
      [nextItem.id]: "0.00",
    }));
  }

  function deleteRow(id: string) {
    setSubmitDebugMessage(null);
    setLineItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.length ? filtered : [createEmptyLineItem()];
    });
    setPriceInputsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateRow(id: string, field: keyof LineItem, value: string) {
    setSubmitDebugMessage(null);
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "description"
                  ? value
                  : Math.max(0, Number(value) || 0),
            }
          : item,
      ),
    );
  }

  function updatePriceRow(id: string, value: string) {
    setSubmitDebugMessage(null);
    const sanitizedValue = sanitizeMoneyInput(value);
    const cents = toCents(sanitizedValue);

    setPriceInputsById((prev) => ({
      ...prev,
      [id]: sanitizedValue,
    }));

    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              price: cents === null ? 0 : cents / 100,
            }
          : item,
      ),
    );
  }

  function blurPriceRow(id: string) {
    setSubmitDebugMessage(null);
    const rawValue = priceInputsById[id] ?? "0";
    const formattedValue = formatMoneyInput(rawValue === "" ? "0" : rawValue);
    const cents = toCents(formattedValue) ?? 0;

    setPriceInputsById((prev) => ({
      ...prev,
      [id]: formattedValue,
    }));

    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              price: cents / 100,
            }
          : item,
      ),
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field
          name="account_id"
          children={(field) => (
            <Field className="flex flex-col gap-1">
              <Label>Account</Label>
              {props.accounts && props.accounts.length ? (
                <select
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    setSubmitDebugMessage(null);
                    field.handleChange(e.target.value);
                  }}
                  required
                  className="rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="" disabled>
                    Select an account
                  </option>
                  {props.accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    setSubmitDebugMessage(null);
                    field.handleChange(e.target.value);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
              )}
              <FieldError meta={field.state.meta} />
            </Field>
          )}
        />

        <form.Field
          name="vendor_id"
          children={(field) => (
            <Field className="flex flex-col gap-1">
              <Label>Vendor ID</Label>
              {props.vendors && props.vendors.length ? (
                <select
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    setSubmitDebugMessage(null);
                    field.handleChange(e.target.value);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">No vendor (optional)</option>
                  {props.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    setSubmitDebugMessage(null);
                    field.handleChange(e.target.value);
                  }}
                  placeholder="Optional vendor ID"
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
              )}
              <p className="text-xs text-gray-500">
                Optional. If set, it must match an existing vendor.
              </p>
              <FieldError meta={field.state.meta} />
            </Field>
          )}
        />

        <form.Field
          name="invoice_date"
          children={(field) => (
            <Field className="flex flex-col gap-1">
              <Label>Invoice Date</Label>
              <Input
                name={field.name}
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  setSubmitDebugMessage(null);
                  field.handleChange(e.target.value);
                }}
                required
                className="rounded-md border border-gray-300 px-3 py-2"
              />
              <FieldError meta={field.state.meta} />
            </Field>
          )}
        />

        <form.Field
          name="amount"
          children={(field) => {
            return (
              <Field className="flex flex-col gap-1">
                <Label>Total Amount</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    name={field.name}
                    type="text"
                    inputMode="decimal"
                    value={calculatedTotalText}
                    readOnly
                    required
                    className="rounded-md border border-gray-300 bg-gray-50 py-2 pr-3 pl-7 text-gray-700"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Auto-calculated from the line items below.
                </p>
                <FieldError meta={field.state.meta} />
              </Field>
            );
          }}
        />
      </div>

      <div className="rounded-lg border border-gray-300 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            + Add line item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Qty</th>
                <th className="px-3 py-2 text-left">Price</th>
                <th className="px-3 py-2 text-left">Tax %</th>
                <th className="px-3 py-2 text-left">Total</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b align-top">
                  <td className="px-3 py-2">
                    <input
                      value={item.description}
                      onChange={(e) =>
                        updateRow(item.id, "description", e.target.value)
                      }
                      placeholder="Item description"
                      className="w-full rounded-md border border-gray-300 px-2 py-2"
                    />
                    {(lineItemErrorsById.get(item.id) ?? []).length > 0 && (
                      <ul className="mt-1 space-y-1 text-xs text-red-600">
                        {(lineItemErrorsById.get(item.id) ?? []).map((message, index) => (
                          <li key={`${item.id}-error-${index}`}>{message}</li>
                        ))}
                      </ul>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) =>
                        updateRow(item.id, "quantity", e.target.value)
                      }
                      className="w-full rounded-md border border-gray-300 px-2 py-2"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          priceInputsById[item.id] ??
                          formatMoneyInput(String(item.price))
                        }
                        onBlur={() => blurPriceRow(item.id)}
                        onChange={(e) => updatePriceRow(item.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-md border border-gray-300 py-2 pr-2 pl-7"
                      />
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={item.tax_rate}
                      onChange={(e) =>
                        updateRow(item.id, "tax_rate", e.target.value)
                      }
                      className="w-full rounded-md border border-gray-300 px-2 py-2"
                    />
                  </td>

                  <td className="px-3 py-2 font-medium">
                    $
                    {(
                      item.quantity *
                      item.price *
                      (1 + item.tax_rate / 100)
                    ).toFixed(2)}
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteRow(item.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>${totals.total.toFixed(2)}</span>
          </div>
        </div>

        {lineItemErrorSummaries.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Line-item validation details</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {lineItemErrorSummaries.slice(0, 5).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            {lineItemErrorSummaries.length > 5 && (
              <p className="mt-1">
                ...and {lineItemErrorSummaries.length - 5} more issue(s).
              </p>
            )}
          </div>
        )}
      </div>

      {submitDebugMessage && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {submitDebugMessage}
        </div>
      )}

      {props.errorText && <div className="text-sm text-red-600">{props.errorText}</div>}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        children={([canSubmit, isSubmitting]) => (
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : props.submitText}
          </button>
        )}
      />
    </form>
  );
}
