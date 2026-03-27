import { Input, Label } from "@headlessui/react";
import { useForm } from "@tanstack/react-form";
import * as v from "valibot";

import { IntStrSchema, MoneySchema } from "#/lib/validation";

export const DataSchema = v.object({
  account_id: v.pipe(v.number(), v.integer()),
  vendor_id: v.pipe(v.number(), v.integer()),
  invoice_date: v.string(),
  amount: MoneySchema,
});

export const FormSchema = v.object({
  account_id: v.pipe(IntStrSchema, DataSchema.entries.account_id),
  vendor_id: v.pipe(IntStrSchema, DataSchema.entries.vendor_id),
  invoice_date: DataSchema.entries.invoice_date,
  amount: MoneySchema,
});

export interface InvoiceFormProps {
  submitText: string;
  errorText?: string;
  onSubmit: (data: v.InferInput<typeof DataSchema>) => Promise<void>;
  defaultValues: v.InferInput<typeof FormSchema>;
}

export function InvoiceForm(props: InvoiceFormProps) {
  const form = useForm({
    defaultValues: props.defaultValues,
    validators: {
      onMount: FormSchema,
      onChange: FormSchema,
    },
    onSubmit: async ({ value }) => {
      const data = v.parse(FormSchema, value);
      await props.onSubmit(data);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
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

      {props.errorText && <div className="text-sm text-red-600">{props.errorText}</div>}

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
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
