import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/add-invoice')({
  server: {
    handlers: {
      POST: async ({ request, context }) => {

        const env = context.cloudflare.env

        const supabase = createClient(
          env.SUPABASE_URL,
          env.SUPABASE_KEY
        )

        const body = await request.json()

        const { data, error } = await supabase
          .from('invoices')
          .insert([
            {
              customer: body.customer,
              amount: body.amount,
              status: body.status
            }
          ])

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