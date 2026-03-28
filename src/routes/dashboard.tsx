import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "#/components/layout/dashboard";
import { redirectIfSignedOut } from "#/lib/auth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
});

function DashboardPage() {
  return (
    <DashboardLayout title="Overview">
      {Array.from({ length: 20 }).map((_, i) => (
        <p key={i}>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas voluptate, doloremque,
          cumque, nemo deleniti corporis dolorem consequatur asperiores ipsam? Voluptas voluptate,
          doloremque, cumque, nemo deleniti corporis dolorem consequatur asperiores ipsam?
        </p>
      ))}
    </DashboardLayout>
  );
}
