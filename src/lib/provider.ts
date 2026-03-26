import { createServerClient } from "@supabase/ssr";
import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { t as schema } from "#/lib/server/database";

import { getAppSession } from "./server/session";

export const DatabaseProvider = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const client = postgres(env.DATABASE_URL);
  const db = drizzle({ client, schema });

  return next({
    context: { db },
  });
});

export const AuthProvider = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const session = await getAppSession();

  const { auth } = createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: {
      throwOnError: true,
    },
    cookies: {
      getAll: () => {
        return session.data.auth ?? [];
      },
      setAll: (cookies) => {
        session.update((prev) => ({
          ...prev,
          auth: cookies.map(({ name, value }) => ({ name, value })),
        }));
      },
    },
  });

  return next({
    context: { auth },
  });
});
