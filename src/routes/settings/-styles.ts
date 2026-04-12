import clsx from "clsx";

export const styles = {
  field: clsx("flex flex-col gap-2 text-sm text-slate-200"),
  label: clsx("text-slate-300"),
  input: clsx(
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100 transition outline-none focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-400/15",
  ),

  error: clsx("text-sm text-red-400"),
  success: clsx("text-sm text-green-500"),

  submit: clsx(
    "inline-flex w-full items-center justify-center rounded-lg bg-linear-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
  ),
};
