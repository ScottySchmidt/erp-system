import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ Required for TanStack Router
export const Route = createFileRoute("/erp/insert-test")({
  component: InsertTestPage,
});

// ✅ Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

function InsertTestPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleInsert = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("test") // 👈 make sure this table exists
        .insert([
          {
            id: Math.floor(Math.random() * 100000), // simple test value
          },
        ])
        .select();

      if (error) {
        console.error(error);
        setMessage(`❌ Error: ${error.message}`);
      } else {
        console.log(data);
        setMessage("✅ Insert successful!");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Unexpected error");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1>Insert Test</h1>

      <button
        onClick={handleInsert}
        disabled={loading}
        style={{
          padding: "10px 16px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        {loading ? "Inserting..." : "Run Insert"}
      </button>

      {message && (
        <p style={{ marginTop: "16px", fontWeight: "bold" }}>
          {message}
        </p>
      )}
    </div>
  );
}
