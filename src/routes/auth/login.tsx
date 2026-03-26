import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import { Input } from "#/components/form/Input";
import { Label } from "#/components/form/Label";
import { redirectIfSignedIn } from "#/lib/auth";
import { AuthProvider, DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

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
  .middleware([DatabaseProvider, AuthProvider])
  .inputValidator(LoginSchema)
  .handler(async ({ data, context }) => {
    const result = await context.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (!result.data.user) {
      throw new Error(result.error?.message ?? "Login failed");
    }

    const user = await context.db
      .select()
      .from(t.users)
      .where(eq(t.users.auth_id, result.data.user.id))
      .limit(1)
      .then((rows) => rows[0]);

    await context.db.insert(t.sessions).values({ user_id: user.user_id });

    return {
      email: user.email,
      full_name: user.full_name,
    };
  });

function LoginPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: loginFn,
    onSuccess: async (user) => {
      await router.invalidate();
      await router.navigate({ to: "/" });
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
    <div className="mx-auto my-8 max-w-lg rounded-lg border border-gray-300 p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Login</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Field
          name="email"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Email</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isDirty && !field.state.meta.isValid && (
                <span className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</span>
              )}
            </div>
          )}
        />

        <form.Field
          name="password"
          children={(field) => (
            <div>
              <Label htmlFor={field.name}>Password</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isDirty && !field.state.meta.isValid && (
                <span className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</span>
              )}
            </div>
          )}
        />

        {mutation.error && <div className="text-sm text-red-600">{mutation.error.message}</div>}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Loading..." : "Login"}
            </button>
          )}
        />

        <p>
          <Link className="text-link" to="/auth/password/forgot">
            Forgot your password?
          </Link>
        </p>
      </form>
    </div>
  );
}
