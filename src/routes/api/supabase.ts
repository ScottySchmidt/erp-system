import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context }) => {
        try {
          const env = context.cloudflare?.env

          if (!env?.SUPABASE_URL || !env?.SUPABASE_KEY) {
            return new Response(
              JSON.stringify({
                message: 'Missing Supabase environment variables',
                missing: {
                  SUPABASE_URL: !env?.SUPABASE_URL,
                  SUPABASE_KEY: !env?.SUPABASE_KEY,
                },
              }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)

          // Lightweight connectivity check; avoids returning full rows
          const { error, count } = await supabase
            .from('invoices')
            .select('*', { head: true, count: 'exact' })

          if (error) {
            return new Response(
              JSON.stringify({
                message: 'Supabase query failed',
                details: error.message,
                hint: error.hint,
                code: error.code,
              }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            )
          }

          return new Response(
            JSON.stringify({
              message: 'Supabase connected',
              invoices_count: count ?? 0,
            }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        } catch (err) {
          console.error('Supabase debug route crashed:', err)
          return new Response(
            JSON.stringify({
              message: 'Worker crashed',
              error: err instanceof Error ? err.message : String(err),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
