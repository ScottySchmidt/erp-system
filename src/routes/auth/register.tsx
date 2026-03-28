import { Field, Input, Label, Select } from "@headlessui/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { FieldError } from "#/components/form";
import { AuthLayout } from "#/components/layout/auth";
import { redirectIfSignedIn, useAuthInfoQuery } from "#/lib/auth";
import { DatabaseProvider, SupabaseProvider } from "#/lib/provider";
import { IntStrSchema } from "#/lib/validation";

import { styles } from "./-styles";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,

  beforeLoad: async ({ context }) => {
    await redirectIfSignedIn(context);
  },
});

const RegisterSchema = v.object({
  full_name: v.pipe(v.string(), v.nonEmpty()),
  email: v.pipe(v.string(), v.email()),
  password: v.pipe(v.string(), v.nonEmpty()),
  role_id: v.pipe(IntStrSchema, v.integer()),
  dept_id: v.pipe(IntStrSchema, v.integer()),
});

const registerFn = createServerFn()
  .middleware([DatabaseProvider, SupabaseProvider])
  .inputValidator(RegisterSchema)
  .handler(async ({ data, context }) => {
    await context.supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
  });

function RegisterPage() {
  const auth = useAuthInfoQuery();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: registerFn,
    onSuccess: async () => {
      await auth.refetch();
      await router.invalidate();
      await router.navigate({ to: "/auth/login" });
    },
  });

  const form = useForm({
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role_id: "",
      dept_id: "",
    },
    validators: {
      onMount: RegisterSchema,
      onChange: RegisterSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ data: value });
    },
  });

  return (
    <AuthLayout>
      <h1 className={styles.title}>Create an account</h1>
      <p className={styles.description}>Set up your access to the finance workspace.</p>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="full_name"
          children={(field) => (
            <Field className={styles.field}>
              <Label className={styles.label}>Full Name</Label>
              <Input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={styles.input}
              />
              <FieldError meta={field.state.meta} className={styles.error} />
            </Field>
          )}
        />

        <form.Field
          name="email"
          children={(field) => (
            <Field className={styles.field}>
              <Label className={styles.label}>Email</Label>
              <Input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={styles.input}
              />
              <FieldError meta={field.state.meta} className={styles.error} />
            </Field>
          )}
        />

        <form.Field
          name="password"
          children={(field) => (
            <Field className={styles.field}>
              <Label className={styles.label}>Password</Label>
              <Input
                type="password"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={styles.input}
              />
              <FieldError meta={field.state.meta} className={styles.error} />
            </Field>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <form.Field
            name="role_id"
            children={(field) => (
              <Field className={styles.field}>
                <Label className={styles.label}>Role</Label>
                <Select
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={styles.input}
                >
                  <option value="">Select Role</option>
                  <option value="1">Admin</option>
                  <option value="2">Accounting</option>
                  <option value="3">Manager</option>
                  <option value="4">Employee</option>
                  <option value="5">Read Only</option>
                </Select>
                <FieldError meta={field.state.meta} className={styles.error} />
              </Field>
            )}
          />

          <form.Field
            name="dept_id"
            children={(field) => (
              <Field className={styles.field}>
                <Label className={styles.label}>Department</Label>
                <Select
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={styles.input}
                >
                  <option value="">Select Department</option>
                  <option value="1">Accounting</option>
                  <option value="2">Finance</option>
                  <option value="3">Human Resources</option>
                  <option value="4">Information Technology</option>
                  <option value="5">Procurement</option>
                  <option value="6">Operations</option>
                </Select>
                <FieldError meta={field.state.meta} className={styles.error} />
              </Field>
            )}
          />
        </div>

        {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <button type="submit" disabled={!canSubmit || isSubmitting} className={styles.submit}>
              {isSubmitting ? "Loading..." : "Create Account"}
            </button>
          )}
        />
      </form>

      <p className="mt-4">
        <Link className={styles.link} to="/auth/login">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
