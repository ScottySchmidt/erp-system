import { createServerClient } from "@supabase/ssr";
import { env } from "cloudflare:workers";

import { getAppSession } from "#/lib/server/session";

export async function getSupabaseServerClient() {
  const session = await getAppSession();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
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
}