import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context }) => {
        const env = context.cloudflare.env

        if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
          return new Response("Supabase env variables missing", { status: 500 })
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)

        return new Response(
          JSON.stringify({
            status: "connected",
            url: env.SUPABASE_URL
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      }
    }
  }
})
