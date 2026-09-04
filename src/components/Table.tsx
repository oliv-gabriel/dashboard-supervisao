import { Fragment, memo, useMemo, useState } from "react";
import { BRANDS, Brand, Vendedor, fmtBRL, fmtNum } from "../data";

const pctColor = (p: number) => {
  if (p >= 0.35) return "bg-emerald-100 text-emerald-700";
  if (p >= 0.25) return "bg-lime-100 text-lime-700";
  if (p >= 0.15) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
};

type SortKey = "nome" | "meta" | "vendido" | "pct" | "qtClientes";

type Totals = {
  qt: number;
  meta: number;
  vend: number;
  marcas: Record<Brand, { qt: number; valor: number; meta: number }>;
};

function calculateTotal(list: Vendedor[]): Totals {
  const marcas = Object.fromEntries(BRANDS.map((brand) => [brand, { qt: 0, valor: 0, meta: 0 }])) as Totals["marcas"];
  let qt = 0;
  let meta = 0;
  let vend = 0;
  for (const vendedor of list) {
    qt += vendedor.qtClientes;
    meta += vendedor.meta;
    vend += vendedor.vendido;
    for (const brand of BRANDS) {
      const cell = vendedor.marcas[brand];
      if (!cell) continue;
      marcas[brand].qt += cell.qt;
      marcas[brand].valor += cell.valor;
      marcas[brand].meta += cell.meta || 0;
    }
  }
  return { qt, meta, vend, marcas };
}
function Table({
  rows,
  visibleBrands,
  diasUteisMes,
  diasUteisSelecionados,
  qtClientesGeral,
}: {
  rows: Vendedor[];
  visibleBrands: readonly Brand[];
  diasUteisMes: number;
  diasUteisSelecionados: number;
  qtClientesGeral?: number;
}) {
  const [sort, setSort] = useState<SortKey>("vendido");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const val = (r: Vendedor) => {
      const metaProporcional = r.meta ? (r.meta / diasUteisMes) * diasUteisSelecionados : 0;
      return sort === "nome" ? r.nome : sort === "pct" ? (metaProporcional ? r.vendido / metaProporcional : 0) : (r[sort] as number);
    };
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
      return dir === "asc" ? c : -c;
    });
  }, [rows, sort, dir]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Vendedor[]>();
    for (const vendedor of sorted) {
      const group = grouped.get(vendedor.pasta);
      if (group) group.push(vendedor);
      else grouped.set(vendedor.pasta, [vendedor]);
    }
    return [...grouped.entries()].map(([pasta, list]) => ({ pasta, list, total: calculateTotal(list) }));
  }, [sorted]);

  const grandTotal = useMemo(() => {
    const t = calculateTotal(rows);
    if (qtClientesGeral && qtClientesGeral > 0) {
      t.qt = qtClientesGeral;
    }
    return t;
  }, [rows, qtClientesGeral]);
  const toggle = (k: SortKey) => {
    if (sort === k) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(k);
      setDir(k === "nome" ? "asc" : "desc");
    }
  };

  const arrow = (k: SortKey) => (sort === k ? (dir === "asc" ? " ▲" : " ▼") : "");



  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-900 text-white">
            <th className="px-2 py-2 text-left font-semibold">Cod</th>
            <th
              className="cursor-pointer px-2 py-2 text-left font-semibold hover:bg-slate-800"
              onClick={() => toggle("nome")}
            >
              Nome{arrow("nome")}
            </th>
            <th
              className="cursor-pointer px-2 py-2 text-right font-semibold hover:bg-slate-800"
              onClick={() => toggle("qtClientes")}
            >
              Qt.Cli.Pos.{arrow("qtClientes")}
            </th>
            <th
              className="cursor-pointer px-2 py-2 text-right font-semibold hover:bg-slate-800"
              onClick={() => toggle("meta")}
            >
              Meta{arrow("meta")}
            </th>
            <th
              className="cursor-pointer px-2 py-2 text-right font-semibold hover:bg-slate-800"
              onClick={() => toggle("vendido")}
            >
              Vl.Vendido{arrow("vendido")}
            </th>
            <th
              className="cursor-pointer px-2 py-2 text-center font-semibold hover:bg-slate-800"
              onClick={() => toggle("pct")}
            >
              %{arrow("pct")}
            </th>
            {visibleBrands.map((b) => (
              <th key={b} colSpan={3} className="border-l border-slate-700 px-2 py-2 text-center font-semibold">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(({ pasta, list, total: t }) => {
            return (
              <Fragment key={pasta}>
                {list.map((r) => {
                  const metaProporcional = r.meta ? (r.meta / diasUteisMes) * diasUteisSelecionados : 0;
                  const pct = metaProporcional ? r.vendido / metaProporcional : 0;
                  return (
                    <tr key={r.cod} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50">
                      <td className="px-2 py-1.5 font-mono text-slate-500">{r.cod}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-800">{r.nome}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.qtClientes}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{fmtBRL(metaProporcional)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{fmtBRL(r.vendido)}</td>
                      <td className="px-1 py-1.5 text-center">
                        <span className={`inline-block min-w-[42px] rounded px-1.5 py-0.5 font-semibold ${pctColor(pct)}`}>
                          {(pct * 100).toFixed(0)}%
                        </span>
                      </td>
                      {visibleBrands.map((b) => {
                        const c = r.marcas[b];
                        const semMeta = !c || !c.meta || c.meta === 0;
                        const metaProporcionalMarca = c && c.meta ? (c.meta / diasUteisMes) * diasUteisSelecionados : 0;
                        return (
                          <Fragment key={b}>
                            <td
                              className={`border-l border-slate-200 px-2 py-1.5 text-right tabular-nums ${
                                semMeta ? "bg-rose-50 text-rose-400" : "text-slate-500"
                              }`}
                              title="Quantidade"
                            >
                              {c && c.qt > 0 ? fmtNum(c.qt) : ""}
                            </td>
                            <td
                              className={`px-2 py-1.5 text-right tabular-nums ${
                                semMeta ? "bg-rose-50 text-rose-400" : "text-slate-500"
                              }`}
                              title="Meta"
                            >
                              {metaProporcionalMarca > 0 ? fmtBRL(metaProporcionalMarca) : ""}
                            </td>
                            <td
                              className={`px-2 py-1.5 text-right font-semibold tabular-nums ${
                                semMeta ? "bg-rose-50 text-rose-400" : "text-black"
                              }`}
                              title="Vendido"
                            >
                              {c && c.valor > 0 ? fmtBRL(c.valor) : ""}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr key={pasta} className="border-y-2 border-orange-300 bg-orange-100 font-bold text-slate-900">
                  <td className="px-2 py-2">{list.length}</td>
                  <td className="whitespace-nowrap px-2 py-2 uppercase">{pasta}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{t.qt}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtBRL((t.meta / diasUteisMes) * diasUteisSelecionados)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{fmtBRL(t.vend)}</td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {t.meta ? ((t.vend / ((t.meta / diasUteisMes) * diasUteisSelecionados)) * 100).toFixed(0) : 0}%
                  </td>
                  {visibleBrands.map((b) => {
                    const metaProporcionalT = t.marcas[b] && t.marcas[b].meta ? (t.marcas[b].meta / diasUteisMes) * diasUteisSelecionados : 0;
                    return (
                      <Fragment key={b}>
                        <td className="border-l border-orange-300 px-2 py-2 text-right tabular-nums">
                          {fmtNum(t.marcas[b].qt)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-orange-900/70">
                          {metaProporcionalT > 0 ? fmtBRL(metaProporcionalT) : ""}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtBRL(t.marcas[b].valor)}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}
          
          {/* GERAL */}
          {rows.length > 0 && (() => {
            const gt = grandTotal;
            return (
              <tr className="border-y-4 border-slate-900 bg-slate-800 font-bold text-white">
                <td className="px-2 py-3">{rows.length}</td>
                <td className="whitespace-nowrap px-2 py-3">GERAL</td>
                <td className="px-2 py-3 text-right tabular-nums">{gt.qt}</td>
                <td className="px-2 py-3 text-right tabular-nums">{fmtBRL((gt.meta / diasUteisMes) * diasUteisSelecionados)}</td>
                <td className="px-2 py-3 text-right tabular-nums">{fmtBRL(gt.vend)}</td>
                <td className="px-2 py-3 text-center tabular-nums">
                  {gt.meta ? ((gt.vend / ((gt.meta / diasUteisMes) * diasUteisSelecionados)) * 100).toFixed(0) : 0}%
                </td>
                {visibleBrands.map((b) => {
                  const metaProporcionalGT = gt.marcas[b] && gt.marcas[b].meta ? (gt.marcas[b].meta / diasUteisMes) * diasUteisSelecionados : 0;
                  return (
                    <Fragment key={`gt-${b}`}>
                      <td className="border-l border-slate-700 px-2 py-3 text-right tabular-nums">
                        {fmtNum(gt.marcas[b].qt)}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-slate-400">
                        {metaProporcionalGT > 0 ? fmtBRL(metaProporcionalGT) : ""}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums">{fmtBRL(gt.marcas[b].valor)}</td>
                    </Fragment>
                  );
                })}
              </tr>
            );
          })()}

        </tbody>
      </table>
    </div>
  );
}
export default memo(Table);
