import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { redirectIfSignedIn } from "#/lib/auth";
import { AuthProvider, DatabaseProvider } from "#/lib/provider";

export const Route = createFileRoute("/auth/password/reset")({
  component: ResetPasswordPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedIn(context);
  },
});

const ResetPasswordSchema = v.pipe(
  v.object({
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
  .middleware([DatabaseProvider, AuthProvider])
  .inputValidator(ResetPasswordSchema)
  .handler(async ({ context, data }) => {
    // context.auth.admin.updateUserById
    console.log("Resetting password with data:", data);
  });

function ResetPasswordPage() {
  const resetPasswordMut = useMutation({
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
      await resetPasswordMut.mutateAsync({ data: value });
    },
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-widest text-slate-300">
            ERP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your new password.</p>

          <form
            className="mt-6 flex flex-col gap-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="password"
              children={(field) => (
                <div className="flex flex-col gap-2 text-sm text-slate-200">
                  <label htmlFor={field.name} className="text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 transition outline-none focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                  />

                  {field.state.meta.isDirty && !field.state.meta.isValid && (
                    <span className="text-sm text-red-400">
                      {field.state.meta.errors[0]?.message}
                    </span>
                  )}
                </div>
              )}
            />

            <form.Field
              name="confirm"
              children={(field) => (
                <div className="flex flex-col gap-2 text-sm text-slate-200">
                  <label htmlFor={field.name} className="text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 transition outline-none focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15"
                  />

                  {field.state.meta.isDirty && !field.state.meta.isValid && (
                    <span className="text-sm text-red-400">
                      {field.state.meta.errors[0]?.message}
                    </span>
                  )}
                </div>
              )}
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-linear-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              )}
            />
          </form>

          <div className="mt-4 text-sm text-slate-400">
            Remembered your password?{" "}
            <Link to="/auth/login" className="text-link">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
