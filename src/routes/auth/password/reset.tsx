import { Field, Input, Label } from "@headlessui/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { FieldError } from "#/components/form";
import { AuthLayout } from "#/components/layout/auth";
import { redirectIfSignedIn } from "#/lib/auth";
import { SupabaseProvider, DatabaseProvider } from "#/lib/provider";
import { decodePasswordResetToken } from "#/lib/server/auth";

import { styles } from "../-styles";

const RouteSearchSchema = v.object({
  token: v.string(),
});

export const Route = createFileRoute("/auth/password/reset")({
  component: ResetPasswordPage,
  validateSearch: RouteSearchSchema,
  beforeLoad: async ({ context, search }) => {
    if (!search.token) {
      throw redirect({ to: "/auth/password/forgot" });
    }

    await redirectIfSignedIn(context);
  },
});

const ResetPasswordSchema = v.pipe(
  v.object({
    token: v.string(),
    password: v.pipe(
      v.string(),
      v.minLength(8, "Your password is too short (minimum 8 characters)."),
      v.maxLength(30, "Your password is too long (maximum 30 characters)."),
      v.regex(/[a-z]/, "Your password must contain a lowercase letter."),
      v.regex(/[A-Z]/, "Your password must contain a uppercase letter."),
      v.regex(/[0-9]/, "Your password must contain a number."),
    ),
    confirm: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [["password"], ["confirm"]],
      (input) => input.password === input.confirm,
      "The two passwords do not match.",
    ),
    ["confirm"],
  ),
);

const resetPasswordFn = createServerFn()
  .middleware([DatabaseProvider, SupabaseProvider])
  .inputValidator(ResetPasswordSchema)
  .handler(async ({ context, data }) => {
    const authId = await decodePasswordResetToken(data.token);

    await context.supabase.auth.admin.updateUserById(authId, {
      password: data.password,
    });
  });

function ResetPasswordPage() {
  const search = Route.useSearch();

  const mutation = useMutation({
    mutationFn: resetPasswordFn,
  });

  const form = useForm({
    defaultValues: {
      password: "",
      confirm: "",
    },
    validators: {
      onMount: ResetPasswordSchema,
      onChange: ResetPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        data: {
          token: search.token,
          ...value,
        },
      });
    },
  });

  return (
    <AuthLayout>
      <h2 className={styles.title}>Reset Password</h2>
      <p className={styles.description}>Enter your new password.</p>

      <form
        className="mt-6 flex flex-col gap-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
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

        <form.Field
          name="confirm"
          children={(field) => (
            <Field className={styles.field}>
              <Label className={styles.label}>Confirm Password</Label>
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

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <button type="submit" disabled={!canSubmit || isSubmitting} className={styles.submit}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
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
