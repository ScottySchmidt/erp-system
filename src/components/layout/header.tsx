import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import clsx from "clsx";
import * as Icon from "lucide-react";

import { useAuthInfoQuery } from "#/lib/auth";
import { DatabaseProvider, SupabaseProvider } from "#/lib/provider";

export default function Header() {
  return (
    <header className="relative flex items-center justify-between bg-gray-800 p-4 text-white shadow-lg">
      <h1 className="text-xl font-semibold">
        <Link to="/">
          <img src="/tanstack-word-logo-white.svg" alt="TanStack Logo" className="h-10" />
        </Link>
      </h1>

      <UserMenu />
    </header>
  );
}

const logoutFn = createServerFn()
  .middleware([DatabaseProvider, SupabaseProvider])
  .handler(async ({ context }) => {
    await context.supabase.auth.signOut();
  });

function UserMenu() {
  const auth = useAuthInfoQuery();
  const router = useRouter();

  const logoutMut = useMutation({
    mutationFn: logoutFn,
    onSuccess() {
      void auth.refetch();
      void router.invalidate();
      void router.navigate({ to: "/", replace: true });
    },
  });

  if (!auth.data?.identity) {
    return (
      <Link
        to="/auth/login"
        className="inline-flex rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 transition-colors hover:bg-gray-700"
      >
        Login
      </Link>
    );
  }

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <MenuButton
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 transition-colors hover:bg-gray-700 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white"
            aria-label="Open user menu"
          >
            <Icon.CircleUserRound size={22} />
            <Icon.ChevronDown
              size={18}
              className={clsx("transition-transform", open && "rotate-180")}
            />
          </MenuButton>

          <MenuItems
            anchor="bottom end"
            transition
            className="z-50 mt-2 w-52 origin-top-right rounded-lg border border-gray-700 bg-gray-900 p-1 text-white shadow-2xl transition duration-150 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
          >
            <MenuItem>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors hover:bg-gray-800 data-focus:bg-white/10"
              >
                <Icon.User size={16} />
                <span>Profile</span>
              </Link>
            </MenuItem>

            <MenuItem>
              <Link
                to="/settings"
                className="flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors hover:bg-gray-800 data-focus:bg-white/10"
              >
                <Icon.Settings size={16} />
                <span>Settings</span>
              </Link>
            </MenuItem>

            <MenuItem>
              <a
                onClick={() => logoutMut.mutate({})}
                className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-600/40 data-focus:bg-white/10"
              >
                <Icon.LogOut size={16} />
                <span>Logout</span>
              </a>
            </MenuItem>
          </MenuItems>
        </>
      )}
    </Menu>
  );
}
