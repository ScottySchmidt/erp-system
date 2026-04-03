import { createServerClient } from "@supabase/ssr";
import { env } from "cloudflare:workers";

export function getSupabaseServerClient() {
  const supabaseUrl = env?.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey =
    env?.SUPABASE_KEY ?? process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables");
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}