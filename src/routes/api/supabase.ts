import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context }) => {
        const env = context.cloudflare.env

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY)

        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .limit(10)

        if (error) {
          return new Response(JSON.stringify(error), { status: 500 })
        }

        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" }
        })
      }
    }
  }
})
