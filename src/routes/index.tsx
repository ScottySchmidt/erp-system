import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900">
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-center gap-6">
            <img
              src="/tanstack-circle-logo.png"
              alt="TanStack Logo"
              className="h-24 w-24 md:h-32 md:w-32"
            />
            <h1 className="text-6xl font-black tracking-[-0.08em] text-white md:text-7xl">
              <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                ERP
              </span>{" "}
              <span className="text-gray-300">Accounting System</span>
            </h1>
          </div>
          <p className="mb-4 text-2xl font-light text-gray-300 md:text-3xl">
            The framework for next generation AI applications
          </p>
          <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-400">
            Full-stack framework powered by TanStack Router for React and Solid. Build modern
            applications with server functions, streaming, and type safety.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link
              to="/dashboard"
              className="rounded-lg bg-cyan-500 px-8 py-3 font-semibold text-white shadow-lg shadow-cyan-500/50 transition-colors hover:bg-cyan-600"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
