import { createServerClient } from "@supabase/ssr";
import { getAppSession } from "#/lib/server/session";

export async function getSupabaseServerClient(env: {
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
}) {
  // 🔥 Validate env FIRST
  if (!env) {
    throw new Error("❌ ENV is undefined (did you forget context.env?)");
  }

  if (!env.SUPABASE_URL) {
    throw new Error("❌ Missing SUPABASE_URL");
  }

  if (!env.SUPABASE_KEY) {
    throw new Error("❌ Missing SUPABASE_KEY");
  }

  const session = await getAppSession();

  const client = createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    auth: { throwOnError: true },
    cookies: {
      getAll: () => session.data.auth ?? [],
      setAll: (cookies) => {
        void session.update((prev) => ({
          ...prev,
          auth: cookies.map(({ name, value }) => ({ name, value })),
        }));
      },
    },
  });

  return client;
}