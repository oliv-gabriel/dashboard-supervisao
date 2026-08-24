import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtBRL } from '../data';

type BrandDatum = { name: string; valor: number; fill: string };
type SellerDatum = { name: string; vendido: number; meta: number };

export default function DashboardCharts({
  brandData,
}: {
  brandData: BrandDatum[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Desempenho por Marca — Meta x Vendido</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={brandData} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: unknown) => fmtBRL(Number(value))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="meta" name="Meta" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="valor" name="Vendido" fill="#1D2681" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Participação por marca</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={brandData} dataKey="valor" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {brandData.map((datum) => <Cell key={datum.name} fill={datum.fill} />)}
            </Pie>
            <Tooltip formatter={(value: unknown) => fmtBRL(Number(value))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}