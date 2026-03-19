import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { t as schema } from "#/lib/database";

export const DatabaseProvider = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const client = postgres(env.DATABASE_URL);
  const db = drizzle({ client, schema });

  return next({
    context: { db },
  });
});

export const AuthProvider = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { auth } = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: { throwOnError: true },
  });

  return next({
    context: { auth },
  });
});
