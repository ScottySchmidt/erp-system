import type { PropsWithChildren } from "react";

export function AuthLayout(props: PropsWithChildren) {
  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,#0f172a,#0b1224)] px-4 py-10 text-slate-100">
      <div className="max-w-lg flex-1">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="mb-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-widest text-slate-300">
            ERP
          </div>

          {props.children}
        </div>
      </div>
    </div>
  );
}
