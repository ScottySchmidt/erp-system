import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/erp/api/supabase-check")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, route: "/api/supabase-check" }),
    },
  },
});