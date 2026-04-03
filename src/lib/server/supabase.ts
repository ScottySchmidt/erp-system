import { createServerClient } from "@supabase/ssr";
import { env as workerEnv } from "cloudflare:workers";
import { getAppSession } from "#/lib/server/session";

function getSupabaseServerConfig() {
  const processEnv = typeof process !== "undefined" ? process.env : undefined;

  const supabaseUrl =
    workerEnv?.SUPABASE_URL ?? processEnv?.SUPABASE_URL ?? processEnv?.VITE_SUPABASE_URL;
  const supabaseKey =
    workerEnv?.SUPABASE_KEY ?? processEnv?.SUPABASE_KEY ?? processEnv?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase server config is missing. Set SUPABASE_URL and SUPABASE_KEY in Cloudflare bindings or local env.",
    );
  }

  return { supabaseUrl, supabaseKey };
}

export async function getSupabaseServerClient() {
  const session = await getAppSession();
  const { supabaseUrl, supabaseKey } = getSupabaseServerConfig();

  return createServerClient(supabaseUrl, supabaseKey, {
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