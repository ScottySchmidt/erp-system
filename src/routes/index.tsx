import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthInfoQuery } from "#/lib/auth";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const teamMembers = [
  "Scott Schmidt",
  "DaShawn Pfeifer",
  "SeEun Chung",
  "Suphanat Rojsiristith",
  "Walter Zou",
];

const featureCards = [
  {
    title: "Authentication",
    description:
      "Secure login and registration for users before accessing protected ERP pages.",
  },
  {
    title: "Dashboard",
    description:
      "A control center for viewing key financial information and quick actions.",
  },
  {
    title: "Invoice Management",
    description:
      "Create, manage, and track invoice records for business operations.",
  },
  {
    title: "Vendor Management",
    description:
      "View vendors, add new vendors, and keep vendor information organized.",
  },
  {
    title: "Voucher Processing",
    description:
      "Create new vouchers and search voucher records for payment workflows.",
  },
  {
    title: "Accounts, Users, and Analytics",
    description:
      "Manage accounts and users while supporting graphs and reporting pages.",
  },
];

function HomePage() {
  const auth = useAuthInfoQuery();
  const isSignedIn = Boolean(auth.data?.identity);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-300">
                ERP Accounting System
              </div>

              <h1 className="mb-6 text-5xl font-black tracking-tight md:text-6xl">
                <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Enterprise Resource Planning
                </span>
              </h1>

              <p className="mb-4 text-lg leading-8 text-slate-300">
                ERP stands for <span className="font-semibold text-white">Enterprise Resource Planning</span>.
                This project is a web-based ERP Accounting System designed to help businesses
                manage users, invoices, bills, and financial information in one place.
              </p>

              <p className="mb-8 text-base leading-7 text-slate-400">
                Instead of using multiple spreadsheets or disconnected tools, this system brings
                accounting workflows together through one organized interface with secure access,
                financial tracking, and business management pages.
              </p>

              <div className="flex flex-wrap gap-4">
                {isSignedIn ? (
                  <Link
                    to="/erp/dashboard"
                    className="rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth/login"
                      className="rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
                    >
                      Login
                    </Link>

                    <Link
                      to="/auth/register"
                      className="rounded-xl border border-slate-700 bg-slate-900 px-8 py-3 font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
              <h2 className="mb-4 text-2xl font-bold text-white">About This Project</h2>

              <div className="space-y-4 text-slate-300">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <h3 className="mb-2 font-semibold text-cyan-300">Purpose</h3>
                  <p>
                    Build an ERP accounting website that supports common business operations
                    such as invoices, bills, users, vendors, and summaries.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <h3 className="mb-2 font-semibold text-cyan-300">What It Helps With</h3>
                  <p>
                    Organizing records, tracking financial activity, handling vendor and invoice
                    data, and improving workflow through a single web application.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <h3 className="mb-2 font-semibold text-cyan-300">System Style</h3>
                  <p>
                    A modern browser-based system with protected pages, management screens,
                    and accounting-related workflows.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Main ERP Features</h2>
          
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition hover:border-cyan-400/40 hover:bg-slate-900/90"
            >
              <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-7 text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="mb-5 text-2xl font-bold">Core Business Functions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-cyan-300">Users & Roles</p>
                <p className="mt-2 text-sm text-slate-400">
                  Support user access, account control, and protected system navigation.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-cyan-300">Invoices & Bills</p>
                <p className="mt-2 text-sm text-slate-400">
                  Create and track accounting records for financial operations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-cyan-300">Vendors & Accounts</p>
                <p className="mt-2 text-sm text-slate-400">
                  Store vendor information and connect records to business accounts.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-cyan-300">Summaries & Analytics</p>
                <p className="mt-2 text-sm text-slate-400">
                  Show dashboard information, graphs, and reporting support.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="mb-5 text-2xl font-bold">Project Team</h2>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-200"
                >
                  {member}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
