import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import type { ComponentType, PropsWithChildren } from "react";

import type { FileRouteTypes } from "#/routeTree.gen";

type NavigationItem = {
  title: string;
  to: FileRouteTypes["to"];
  icon: ComponentType<{ className?: string }>;
};

const userNav: NavigationItem[] = [
  {
    title: "Overview",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Invoices",
    to: "/invoice/new",
    icon: FileText,
  },
  {
    title: "Vendors",
    to: "/", // TODO
    icon: Users,
  },
];

const adminNav: NavigationItem[] = [
  {
    title: "Test",
    to: "/test",
    icon: ShieldCheck,
  },
  {
    title: "Users",
    to: "/", // TODO
    icon: Users,
  },
];

interface SidebarLinkProps extends NavigationItem {
  pathname: string;
}

function SidebarLink(props: SidebarLinkProps) {
  const isActive = props.pathname === props.to || props.pathname.startsWith(`${props.to}/`);
  const Icon = props.icon;

  return (
    <Link
      to={props.to}
      className={[
        "group flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition",
        isActive
          ? "bg-cyan-400/12 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.2)]"
          : "text-slate-300 hover:bg-white/6 hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 flex-none items-center justify-center rounded-lg transition",
          isActive
            ? "bg-cyan-300/18 text-cyan-100"
            : "bg-slate-900/80 text-slate-400 group-hover:bg-slate-900 group-hover:text-slate-100",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium tracking-tight">{props.title}</span>
      </span>
    </Link>
  );
}

export function DashboardLayout(props: PropsWithChildren) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] flex-row items-stretch bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_28%),linear-gradient(135deg,#020617,#0f172a_55%,#111827)] text-slate-100">
      <aside className="relative w-60 flex-none border-r border-white/10 bg-slate-950/45">
        <div className="sticky top-0 flex flex-col px-3 py-4 lg:px-4 lg:py-5">
          <nav className="space-y-1" aria-label="Primary Navigation">
            {userNav.map((item) => (
              <SidebarLink key={item.to} pathname={pathname} {...item} />
            ))}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="mb-2 px-2 text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
              Administration
            </div>
            <nav className="space-y-1" aria-label="Administration">
              {adminNav.map((item) => (
                <SidebarLink key={item.to} pathname={pathname} {...item} />
              ))}
            </nav>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-8">
        <div className="min-h-full">{props.children}</div>
      </main>
    </div>
  );
}
