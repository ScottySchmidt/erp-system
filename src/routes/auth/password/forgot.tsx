import { Button, Field, Input, Label } from "@headlessui/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { FieldError } from "#/components/form";
import { AuthLayout } from "#/components/layout/auth";
import { redirectIfSignedIn } from "#/lib/auth";
import { SupabaseProvider, DatabaseProvider } from "#/lib/provider";
import { createPasswordResetToken } from "#/lib/server/auth";
import { t } from "#/lib/server/database";

import { styles } from "../-styles";

export const Route = createFileRoute("/auth/password/forgot")({
  component: ForgotPasswordPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedIn(context);
  },
});

const ForgotPasswordSchema = v.object({
  email: v.pipe(v.string(), v.email()),
});

const forgotPasswordFn = createServerFn()
  .middleware([DatabaseProvider, SupabaseProvider])
  .inputValidator(ForgotPasswordSchema)
  .handler(async ({ context, data }) => {
    const user = await context.db
      .select()
      .from(t.users)
      .where(eq(t.users.email, data.email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      return;
    }

    const token = await createPasswordResetToken(user.auth_id);
    console.log("Password reset token:", token);

    // TODO: send email with token link
    // await context.supabase.auth.resetPasswordForEmail(data.email, {
    //   redirectTo: "",
    // });
  });

function ForgotPasswordPage() {
  const mutation = useMutation({
    mutationFn: forgotPasswordFn,
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onMount: ForgotPasswordSchema,
      onChange: ForgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ data: value });
    },
  });

  return (
    <AuthLayout>
      <h1 className={styles.title}>Reset Password</h1>
      <p className={styles.description}>Enter your email to get a password reset link.</p>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="email"
          children={(field) => (
            <Field className={styles.field}>
              <Label className={styles.label}>Email</Label>
              <Input
                type="email"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={styles.input}
                placeholder="you@company.com"
              />
              <FieldError meta={field.state.meta} className={styles.error} />
            </Field>
          )}
        />

        {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

        {mutation.isSuccess && (
          <p className={styles.success}>
            A password reset link has been sent if an account with this email exists.
          </p>
        )}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting} className={styles.submit}>
              {isSubmitting ? "Sending..." : "Send Password Reset Link"}
            </Button>
          )}
        />
      </form>

      <p className="mt-4">
        <Link to="/auth/login" className={styles.link}>
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
