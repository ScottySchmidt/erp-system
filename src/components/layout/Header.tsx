import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, CircleUserRound, LogOut, Settings, User } from "lucide-react";

export default function Header() {
  return (
    <header className="relative flex items-center justify-between bg-gray-800 p-4 text-white shadow-lg">
      <h1 className="text-xl font-semibold">
        <Link to="/">
          <img src="/tanstack-word-logo-white.svg" alt="TanStack Logo" className="h-10" />
        </Link>
      </h1>

      <Menu as="div" className="relative">
        {({ open }) => (
          <>
            <MenuButton
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 transition-colors hover:bg-gray-700 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white"
              aria-label="Open user menu"
            >
              <CircleUserRound size={22} />
              <ChevronDown
                size={18}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </MenuButton>

            <MenuItems
              anchor="bottom end"
              transition
              className="z-50 mt-2 w-52 origin-top-right rounded-lg border border-gray-700 bg-gray-900 p-1 text-white shadow-2xl transition duration-150 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
            >
              <MenuItem>
                <Link
                  to="/erp/register"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-800 data-focus:bg-white/10"
                >
                  <User size={16} />
                  <span>Profile</span>
                </Link>
              </MenuItem>

              <MenuItem>
                <Link
                  to="/erp/dashboard"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-800 data-focus:bg-white/10"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
              </MenuItem>

              <MenuItem>
                <Link
                  to="/erp/login"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200 data-focus:bg-white/10"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </Link>
              </MenuItem>
            </MenuItems>
          </>
        )}
      </Menu>
    </header>
  );
}
