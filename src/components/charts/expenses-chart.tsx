type ExpensePoint = {
  date: string;
  total: number;
};

interface ExpensesChartProps {
  points: ExpensePoint[];
}

export function ExpensesChart(props: ExpensesChartProps) {
  if (props.points.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <h3 className="text-lg font-semibold">Expenses by Date</h3>
        <p className="mt-2 text-sm text-slate-400">
          Add vouchers with payment dates to visualize expenses.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...props.points.map((point) => point.total), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <h3 className="text-lg font-semibold">Expenses by Date</h3>
      <p className="mt-1 text-sm text-slate-400">Grouped by voucher payment date.</p>

      <div className="mt-4 space-y-3">
        {props.points.map((point) => {
          const widthPercent = Math.max((point.total / maxTotal) * 100, 2);
          return (
            <div key={point.date} className="grid grid-cols-[100px_1fr_auto] items-center gap-3">
              <span className="text-xs text-slate-300">{point.date}</span>
              <div className="h-3 rounded-full bg-slate-800/90">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-200">
                ${point.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
