import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

type SupabaseEnv = {
  SUPABASE_URL?: string
  SUPABASE_KEY?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context }) => {
        try {
          const env = context.cloudflare?.env as SupabaseEnv | undefined
          const supabaseUrl = env?.SUPABASE_URL
          const supabaseKey =
            env?.SUPABASE_KEY ??
            env?.SUPABASE_ANON_KEY ??
            env?.SUPABASE_SERVICE_ROLE_KEY

          if (!supabaseUrl || !supabaseKey) {
            return jsonResponse(
              {
                error:
                  'Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_ANON_KEY).',
              },
              500,
            )
          }

          const supabase = createClient(supabaseUrl, supabaseKey)
          const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .limit(10)

          if (error) {
            return jsonResponse(
              {
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
              },
              500,
            )
          }

          return jsonResponse(data ?? [])
        } catch (error) {
          return jsonResponse(
            {
              error: 'Failed to call Supabase from /api/supabase',
              message: error instanceof Error ? error.message : String(error),
            },
            500,
          )
        }
      },
    },
  },
})
