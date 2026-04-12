import { Field, Input, Label } from "@headlessui/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as Icon from "lucide-react";
import * as v from "valibot";

import { FieldError } from "#/components/form";
import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut, useAuthInfoQuery } from "#/lib/auth";
import { DatabaseProvider, SupabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { PasswordSchema } from "#/lib/validation";

import { styles } from "./-styles";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => listSessionFn(),
});

const listSessionFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    return await context.db
      .select()
      .from(t.auth_sessions)
      .where(eq(t.auth_sessions.user_id, context.auth.identity.id));
  });

export const ChangePasswordSchema = v.pipe(
  v.object({
    current: v.pipe(v.string(), v.nonEmpty()),
    password: PasswordSchema,
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

const changePasswordFn = createServerFn()
  .middleware([SupabaseProvider, MustAuthenticate])
  .inputValidator(ChangePasswordSchema)
  .handler(async ({ context, data }) => {
    await context.supabase.auth.updateUser({
      password: data.password,
    });
  });

function SettingsPage() {
  const auth = useAuthInfoQuery();
  const router = useRouter();

  const sessions = Route.useLoaderData();

  const changePasswordMutation = useMutation({
    mutationFn: changePasswordFn,
    onSuccess: async () => {
      await auth.refetch();
      await router.invalidate();
    },
  });

  const changePasswordForm = useForm({
    defaultValues: {
      current: "",
      password: "",
      confirm: "",
    },
    validators: {
      onMount: ChangePasswordSchema,
      onChange: ChangePasswordSchema,
    },
    onSubmit: async ({ value }) => {
      await changePasswordMutation.mutateAsync({ data: value });
    },
  });

  return (
    <DashboardLayout title="Settings">
      <section className="flex flex-col gap-5">
        <div className="rounded-xl border border-gray-700 p-4">
          <h2 className="mb-4 text-xl font-semibold">Change Password</h2>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void changePasswordForm.handleSubmit();
            }}
          >
            <changePasswordForm.Field
              name="current"
              children={(field) => (
                <Field className={styles.field}>
                  <Label className={styles.label}>Current Password</Label>
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

            <changePasswordForm.Field
              name="password"
              children={(field) => (
                <Field className={styles.field}>
                  <Label className={styles.label}>New Password</Label>
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

            <changePasswordForm.Field
              name="confirm"
              children={(field) => (
                <Field className={styles.field}>
                  <Label className={styles.label}>Confirm New Password</Label>
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

            <changePasswordForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className={styles.submit}
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              )}
            />
          </form>
        </div>

        <div className="rounded-xl border border-gray-700 p-4">
          <h2 className="mb-4 text-xl font-semibold">Sessions</h2>

          <div className="space-y-2">
            {sessions.map((session) => (
              <div className="flex items-center" key={session.id}>
                <span className="mr-2 flex size-10 flex-none items-center justify-center rounded bg-slate-800/80 text-slate-400 transition group-hover:bg-slate-700/70 group-hover:text-slate-100">
                  <Icon.KeyRound className="size-5" />
                </span>
                <div className="flex-1 text-sm">
                  <p className="font-bold">{session.ip}</p>
                  <p className="truncate text-slate-400">{session.updated_at}</p>
                </div>
                <button className="ml-2 cursor-pointer text-red-800 hover:text-red-600">
                  <Icon.CircleX />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
