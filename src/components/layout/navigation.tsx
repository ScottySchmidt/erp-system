import { Link, useRouterState } from "@tanstack/react-router";
import clsx from "clsx";
import * as Icon from "lucide-react";
import { type ComponentType } from "react";

import { useAuthInfoQuery } from "#/lib/auth";
import { type FileRouteTypes } from "#/routeTree.gen";

type NavigationItem = {
  title: string;
  to: FileRouteTypes["to"];
  icon: ComponentType<{ className?: string }>;
};

const userNav: NavigationItem[] = [
  {
    title: "Overview",
    to: "/erp/dashboard",
    icon: Icon.LayoutDashboard,
  },
  {
    title: "Invoices",
    to: "/invoice",
    icon: Icon.FileText,
  },
  {
    title: "Accounts",
    to: "/erp/accounts",
    icon: Icon.Wallet,
  },
  {
    title: "Analytics",
    to: "/erp/analytics" as FileRouteTypes["to"],
    icon: Icon.BarChart3,
  },
  {
    title: "Vouchers",
    to: "/voucher",
    icon: Icon.Receipt,
  },
  {
    title: "Vendors",
    to: "/vendor",
    icon: Icon.Building2,
  },
];

const adminNav: NavigationItem[] = [
  {
    title: "Test",
    to: "/test",
    icon: Icon.Activity,
  },
  {
    title: "Users",
    to: "/erp/users" as FileRouteTypes["to"],
    icon: Icon.Users,
  },
];

interface NavigationProps {
  className?: string;
}

export function Navigation(props: NavigationProps) {
  const auth = useAuthInfoQuery();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAdmin = auth.data?.profile?.role_id === 1;

  return (
    <div className={clsx("flex flex-col px-4 py-5", props.className)}>
      <nav className="space-y-1" aria-label="Primary Navigation">
        {userNav.map((item) => (
          <NavLink key={item.to} pathname={pathname} {...item} />
        ))}
      </nav>

      {isAdmin && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="mb-2 px-2 text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Administration
          </div>
          <nav className="space-y-1" aria-label="Administration">
            {adminNav.map((item) => (
              <NavLink key={item.to} pathname={pathname} {...item} />
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

interface NavLinkProps extends NavigationItem {
  pathname: string;
}

function NavLink(props: NavLinkProps) {
  const active = props.pathname === props.to || props.pathname.startsWith(`${props.to}/`);

  return (
    <Link
      to={props.to}
      className={clsx(
        "group flex items-center gap-2.5 rounded-lg p-1.5 transition",
        active
          ? "bg-cyan-400/12 text-white ring-1 ring-cyan-400/20 ring-inset"
          : "text-slate-300 hover:bg-white/6 hover:text-white",
      )}
    >
      <span
        className={clsx(
          "flex size-7.5 flex-none items-center justify-center rounded transition",
          active
            ? "bg-cyan-300/18 text-cyan-100"
            : "bg-slate-800/80 text-slate-400 group-hover:bg-slate-700/70 group-hover:text-slate-100",
        )}
      >
        <props.icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium tracking-tight">{props.title}</span>
      </span>
    </Link>
  );
}
