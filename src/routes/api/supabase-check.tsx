import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/supabase-check")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_KEY;

          if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing SUPABASE_URL or SUPABASE_KEY");
          }

          const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Supabase responded ${response.status} ${response.statusText}`);
          }

          return Response.json({ status: "connected" });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});