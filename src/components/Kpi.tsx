interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}

export default function Kpi({ label, value, sub, accent = "from-indigo-500 to-violet-600" }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
