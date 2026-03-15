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

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    }
  }

  return {
    name: 'UnknownError',
    message: String(error),
    stack: null,
  }
}

export const Route = createFileRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context, request }) => {
        const startedAt = Date.now()

        try {
          const env = context.cloudflare?.env as SupabaseEnv | undefined
          const supabaseUrl = env?.SUPABASE_URL
          const supabaseKey =
            env?.SUPABASE_KEY ??
            env?.SUPABASE_ANON_KEY ??
            env?.SUPABASE_SERVICE_ROLE_KEY

          console.log('[api/supabase] request started', {
            path: new URL(request.url).pathname,
            method: request.method,
            hasSupabaseUrl: Boolean(supabaseUrl),
            hasSupabaseKey: Boolean(supabaseKey),
            supabaseHost: supabaseUrl ? new URL(supabaseUrl).host : null,
          })

          if (!supabaseUrl || !supabaseKey) {
            console.error('[api/supabase] missing required env vars', {
              hasSupabaseUrl: Boolean(supabaseUrl),
              hasSupabaseKey: Boolean(supabaseKey),
            })

            return jsonResponse(
              {
                error:
                  'Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_ANON_KEY).',
                debug: {
                  hasSupabaseUrl: Boolean(supabaseUrl),
                  hasSupabaseKey: Boolean(supabaseKey),
                },
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
            console.error('[api/supabase] supabase query returned error', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              durationMs: Date.now() - startedAt,
            })

            return jsonResponse(
              {
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                debug: {
                  durationMs: Date.now() - startedAt,
                },
              },
              500,
            )
          }

          console.log('[api/supabase] request succeeded', {
            rowCount: Array.isArray(data) ? data.length : null,
            durationMs: Date.now() - startedAt,
          })

          return jsonResponse(data ?? [])
        } catch (error) {
          const normalized = normalizeError(error)
          console.error('[api/supabase] unhandled exception', {
            ...normalized,
            durationMs: Date.now() - startedAt,
          })

          return jsonResponse(
            {
              error: 'Failed to call Supabase from /api/supabase',
              message: normalized.message,
              name: normalized.name,
              debug: {
                durationMs: Date.now() - startedAt,
              },
            },
            500,
          )
        }
      },
    },
  },
})
