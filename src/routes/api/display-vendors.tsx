import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServerClient } from "#/lib/server/supabase";

export const Route = createFileRoute("/api/display-vendors")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const supabase = await getSupabaseServerClient();

          const { data, error } = await supabase
            .from("vendor")
            .select("vendor_id, vendor_name, vendor_address")
            .order("vendor_id", { ascending: false });

          if (error) {
            console.error("SUPABASE ERROR:", error);

            return new Response(
              JSON.stringify({ ok: false, error: error.message }),
              { status: 500 }
            );
          }

          return new Response(
            JSON.stringify({ ok: true, vendors: data ?? [] }),
            { status: 200 }
          );

        } catch (err: any) {
          console.error("SERVER ERROR:", err);

          return new Response(
            JSON.stringify({ ok: false, error: err.message }),
            { status: 500 }
          );
        }
      },
    },
  },
});