import { Field, Input, Label } from "@headlessui/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { FieldError } from "#/components/form";
import { AuthLayout } from "#/components/layout/auth";
import { redirectIfSignedIn, useAuthInfoQuery } from "#/lib/auth";
import { SupabaseProvider, DatabaseProvider } from "#/lib/provider";

import { styles } from "./-styles";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedIn(context);
  },
});

const LoginSchema = v.object({
  email: v.pipe(v.string(), v.email()),
  password: v.pipe(v.string(), v.nonEmpty()),
});

const loginFn = createServerFn()
  .middleware([DatabaseProvider, SupabaseProvider])
  .inputValidator(LoginSchema)
  .handler(async ({ data, context }) => {
    await context.supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
  });

function LoginPage() {
  const auth = useAuthInfoQuery();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: loginFn,
    onSuccess: async () => {
      await auth.refetch();
      await router.invalidate();
      await router.navigate({ to: "/erp/dashboard" });
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onMount: LoginSchema,
      onChange: LoginSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ data: value });
    },
  });

  return (
    <AuthLayout>
      <h2 className={styles.title}>Login to your workspace</h2>
      <p className={styles.description}>Access the finance dashboard and invoice tools.</p>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
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
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={styles.input}
              />
              <FieldError meta={field.state.meta} className={styles.error} />
            </Field>
          )}
        />

        {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <button type="submit" disabled={!canSubmit || isSubmitting} className={styles.submit}>
              {isSubmitting ? "Loading..." : "Login"}
            </button>
          )}
        />
      </form>

      <p className="mt-4 flex justify-between">
        <Link className={styles.link} to="/auth/register">
          Register
        </Link>
        <Link className={styles.link} to="/auth/password/forgot">
          Forgot your password?
        </Link>
      </p>
    </AuthLayout>
  );
}
