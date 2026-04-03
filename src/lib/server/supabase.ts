// src/lib/server/supabase.ts

import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient(env: {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase environment variables (SUPABASE_URL / SUPABASE_ANON_KEY)"
    );
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}