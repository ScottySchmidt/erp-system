type ExpensePoint = {
  label: string;
  total: number;
};

interface ExpensesChartProps {
  points: ExpensePoint[];
  title?: string;
  description?: string;
  emptyMessage?: string;
}

export function ExpensesChart(props: ExpensesChartProps) {
  const visiblePoints = props.points.filter((point) => point.total > 0);
  const title = props.title ?? "Expenses";
  const description = props.description ?? "Grouped totals.";
  const emptyMessage = props.emptyMessage ?? "No data available yet.";

  if (visiblePoints.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const maxTotal = Math.max(...visiblePoints.map((point) => point.total), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>

      <div className="mt-4 space-y-3">
        {visiblePoints.map((point) => {
          const widthPercent = Math.max((point.total / maxTotal) * 100, 2);
          return (
            <div key={point.label} className="grid grid-cols-[minmax(120px,1.2fr)_1fr_auto] items-center gap-3">
              <span className="truncate text-xs text-slate-300" title={point.label}>
                {point.label}
              </span>
              <div className="h-3 rounded-full bg-slate-800/90">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className="text-right text-xs font-semibold tabular-nums text-slate-200">
                ${point.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
