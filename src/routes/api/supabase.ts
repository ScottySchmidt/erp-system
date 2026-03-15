import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context }) => {

        const env = context.cloudflare.env

        // check variables exist
        if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
          return new Response(
            JSON.stringify({
              status: "error",
              message: "Missing Supabase environment variables",
              url_exists: !!env.SUPABASE_URL,
              key_exists: !!env.SUPABASE_KEY
            }),
            { headers: { "Content-Type": "application/json" } }
          )
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)

        // simplest Supabase request possible
        const { data, error } = await supabase.auth.getSession()

        return new Response(
          JSON.stringify({
            status: "connected",
            data,
            error
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      }
    }
  }
})
