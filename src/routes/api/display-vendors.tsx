import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServerClient } from "#/lib/server/supabase";

export const Route = createFileRoute("/api/display-vendors")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const supabase = getSupabaseServerClient();

          const { data, error } = await supabase
            .from("vendor")
            .select("vendor_id, vendor_name, vendor_address")
            .order("vendor_id", { ascending: false });

          if (error) {
            return Response.json({ ok: false, error: error.message }, { status: 500 });
          }

          return Response.json({ ok: true, vendors: data ?? [] }, { status: 200 });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : "Unknown server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});