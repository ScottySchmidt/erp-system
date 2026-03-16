import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { twc } from "react-twc";
import * as v from "valibot";

import { supabase } from "#/lib/supabase";

export const Route = createFileRoute("/invoice/new")({
  component: NewInvoice,
});

const InvoiceSchema = v.object({
  user_id: v.pipe(v.number(), v.integer()),
  account_id: v.pipe(v.number(), v.integer()),
  vendor_id: v.pipe(v.number(), v.integer()),
  invoice_date: v.string(),
  amount: v.pipe(v.number(), v.minValue(0)),
});

const InvoiceFormSchema = v.object({
  user_id: v.pipe(v.string(), v.transform(parseInt), InvoiceSchema.entries.user_id),
  account_id: v.pipe(v.string(), v.transform(parseInt), InvoiceSchema.entries.account_id),
  vendor_id: v.pipe(v.string(), v.transform(parseInt), InvoiceSchema.entries.vendor_id),
  invoice_date: v.string(),
  amount: v.pipe(v.string(), v.transform(parseFloat), InvoiceSchema.entries.amount),
});

const createInvoice = createServerFn()
  .inputValidator(InvoiceSchema)
  .handler(async ({ data }) => {
    await supabase.from("invoices").insert([data]).throwOnError();
  });

function NewInvoice() {
  const [error, setError] = useState("");
  const form = useForm({
    defaultValues: {
      user_id: "",
      account_id: "",
      invoice_date: formatDate(new Date()),
      amount: "",
      vendor_id: "",
    },
    validators: {
      onMount: InvoiceFormSchema,
      onChange: InvoiceFormSchema,
    },
    onSubmit: async ({ value }) => {
      setError("");

      try {
        const data = v.parse(InvoiceFormSchema, value);
        await createInvoice({ data });
      } catch (error: any) {
        setError(error.message ?? String(error));
      }
    },
  });

  return (
    <div className="mx-auto my-8 max-w-lg rounded-lg border border-gray-300 p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Invoice</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Field
          name="user_id"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>User ID</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {!field.state.meta.isValid && (
                <span className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</span>
              )}
            </div>
          )}
        />

        <form.Field
          name="account_id"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Account ID</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {!field.state.meta.isValid && (
                <span className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</span>
              )}
            </div>
          )}
        />

        <form.Field
          name="invoice_date"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Invoice Date</Label>
              <Input
                id={field.name}
                name={field.name}
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {!field.state.meta.isValid && (
                <span className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</span>
              )}
            </div>
          )}
        />

        <form.Field
          name="amount"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Amount</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                step="0.01"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {!field.state.meta.isValid && (
                <span className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</span>
              )}
            </div>
          )}
        />

        <form.Field
          name="vendor_id"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Vendor ID</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                required
              />
              {!field.state.meta.isValid && (
                <span className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</span>
              )}
            </div>
          )}
        />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Create Invoice"}
            </button>
          )}
        />
      </form>
    </div>
  );
}

const Label = twc.label`
  block mb-2
  font-medium text-sm
  text-gray-900
`;

const Input = twc.input`
  block w-full rounded-md bg-white
  px-3 py-1.5
  text-base text-gray-900
  outline-1 -outline-offset-1 outline-gray-300
  placeholder:text-gray-400
  focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600
  sm:text-sm/6
`;

function formatDate(date: Date) {
  // local date in YYYY-MM-DD format
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
