import { createFileRoute, redirect } from "@tanstack/react-router";

import { redirectIfSignedOut } from "#/lib/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
    throw redirect({ to: "/erp/dashboard" });
  },
  component: () => null,
});
