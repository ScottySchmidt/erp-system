import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "#/components/layout/DashboardLayout";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <DashboardLayout>
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
