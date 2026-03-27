import type { PropsWithChildren } from "react";

import { Navigation } from "./navigation";

export function DashboardLayout(props: PropsWithChildren) {
  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] flex-row items-stretch bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_28%),linear-gradient(135deg,#020617,#0f172a_55%,#111827)] text-slate-100">
      <aside className="relative w-60 flex-none border-r border-white/10 bg-slate-950/45">
        <Navigation className="sticky top-0" />
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-8">
        <div className="min-h-full">{props.children}</div>
      </main>
    </div>
  );
}
