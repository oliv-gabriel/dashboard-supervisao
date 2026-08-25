import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { BRANDS, Vendedor, fmtBRL, BrandData, Brand } from "./data";
import Kpi from "./components/Kpi";
import Table from "./components/Table";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const DashboardCharts = lazy(() => import("./components/DashboardCharts"));

const COLORS = [
  "#6366f1",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
];

// Helper to get today's date in YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split("T")[0];

export default function App() {
  const [dataI, setDataI] = useState(getTodayStr());
  const [dataF, setDataF] = useState(getTodayStr());
  const [codFunc, setCodFunc] = useState("9999"); // Padrão "Todos"
  const [isLoading, setIsLoading] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [qtClientesGeral, setQtClientesGeral] = useState(0);
  const [diasUteisMes, setDiasUteisMes] = useState(1);
  const [diasUteisSelecionados, setDiasUteisSelecionados] = useState(1);
  const [supervisores, setSupervisores] = useState<{CODSUPERVISOR: string, NOME: string}[]>([]);
  const [listaFiliais, setListaFiliais] = useState<{CODIGO: string, FANTASIA: string}[]>([]);
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<string[]>(["1", "2"]);


  const supervisorNames = useMemo(
    () => new Map(supervisores.map((supervisor) => [String(supervisor.CODSUPERVISOR), supervisor.NOME])),
    [supervisores]
  );

  const fetchDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataI, dataF, codFunc, filiais: filiaisSelecionadas }),
      });
      if (!res.ok) throw new Error("Dashboard request failed");

      const json = await res.json();
      if (!json.data || !Array.isArray(json.data)) throw new Error("Invalid dashboard response");
      setDiasUteisMes(json.diasUteisMes || 1);
      setDiasUteisSelecionados(json.diasUteisSelecionados || 1);
      setQtClientesGeral(json.qtClientesGeral || 0);
      setVendedores(json.data.map((v: any) => ({
        ...v,
        pasta: supervisorNames.get(String(v.codSupervisor)) || "Sup. " + (v.codSupervisor || "?"),
        marcas: v.marcas || {},
      })));
    } catch (err) {
      console.error(err);
      alert("Falha ao consultar o dashboard. Verifique o servidor e a configuracao do banco.");
    } finally {
      setIsLoading(false);
    }
  }, [codFunc, dataF, dataI, filiaisSelecionadas, supervisorNames]);
  // Buscar automaticamente ao carregar
  useEffect(() => {
    // Buscar lista de supervisores
    fetch(`/api/supervisores`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSupervisores(data);
          // O state codFunc já inicializa como "9999", não precisamos forçar para o primeiro
        }
      })
      .catch(err => console.error("Erro ao buscar supervisores:", err));

    // Buscar lista de filiais
    fetch(`/api/filiais`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setListaFiliais(data);
        }
      })
      .catch(err => console.error("Erro ao buscar filiais:", err));

    // Descomente a linha abaixo se quiser buscar os dados da tabela logo ao abrir a tela
    // fetchDados();
  }, []); // Executa uma vez no início

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchDados();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [fetchDados]);

  const rows = vendedores;
  const visibleBrands = BRANDS;

  const grandTotal = useMemo(() => {
    const gt = { qt: 0, meta: 0, vend: 0, marcas: {} as Record<Brand, BrandData> };
    visibleBrands.forEach((b) => (gt.marcas[b] = { qt: 0, valor: 0, meta: 0 }));
    for (const row of rows) {
      gt.qt += row.qtClientes;
      gt.meta += row.meta;
      gt.vend += row.vendido;
      for (const b of visibleBrands) {
        if (row.marcas[b]) {
          gt.marcas[b].qt += row.marcas[b].qt;
          gt.marcas[b].valor += row.marcas[b].valor;
          gt.marcas[b].meta += row.marcas[b].meta || 0;
        }
      }
    }
    if (qtClientesGeral > 0) {
      gt.qt = qtClientesGeral;
    }
    return gt;
  }, [rows, qtClientesGeral]);

  const { totMeta, totVend, totCli, atg, semVenda, brandData } = useMemo(() => {
    let vendedoresSemVenda = 0;
    for (const vendedor of vendedores) {
      if (vendedor.vendido === 0) vendedoresSemVenda += 1;
    }

    const bData = visibleBrands.map((b, index) => {
      const metaBruta = grandTotal.marcas[b]?.meta || 0;
      const metaProporcional = (metaBruta / diasUteisMes) * diasUteisSelecionados;
      return {
        name: b,
        valor: grandTotal.marcas[b]?.valor || 0,
        meta: metaProporcional,
        fill: COLORS[index % COLORS.length] || "#000",
      };
    }).filter((b) => b.valor > 0 || b.meta > 0);

    return {
      totMeta: grandTotal.meta,
      totVend: grandTotal.vend,
      totCli: grandTotal.qt,
      atg: grandTotal.meta ? grandTotal.vend / grandTotal.meta : 0,
      semVenda: vendedoresSemVenda,
      brandData: bData,
    };
  }, [vendedores, grandTotal, diasUteisMes, diasUteisSelecionados]);

  const exportToExcel = useCallback(async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Dashboard");

    const columns: Partial<ExcelJS.Column>[] = [
      { key: "cod", width: 8 },
      { key: "nome", width: 25 },
      { key: "qtClientes", width: 12 },
      { key: "metaDia", width: 15 },
      { key: "vendido", width: 15 },
      { key: "pct", width: 8 },
    ];
    visibleBrands.forEach((b) => {
      columns.push({ key: `${b}_qt`, width: 10 });
      columns.push({ key: `${b}_meta`, width: 15 });
      columns.push({ key: `${b}_vendido`, width: 15 });
    });
    sheet.columns = columns;

    const headerData = ["Cód", "Vendedor", "Qt.Cli.Pos.", "Meta", "Vl.Vendido", "%"];
    visibleBrands.forEach(b => {
      headerData.push(b);
      headerData.push(""); // mesclagem
    });
    
    sheet.insertRow(1, headerData);
    const headerRow = sheet.getRow(1);
    
    let colIndex = 7;
    visibleBrands.forEach(() => {
      sheet.mergeCells(1, colIndex, 1, colIndex + 2);
      colIndex += 3;
    });

    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; // bg-slate-900 like site
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // text-white
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "thin" } };
    });

    const grouped = new Map<string, Vendedor[]>();
    for (const vendedor of [...rows].sort((a,b) => b.vendido - a.vendido)) {
      const group = grouped.get(vendedor.pasta);
      if (group) group.push(vendedor);
      else grouped.set(vendedor.pasta, [vendedor]);
    }

    for (const [pasta, list] of grouped.entries()) {
      let tQt = 0, tMeta = 0, tVend = 0;
      const tMarcas: Record<string, {qt: number, valor: number, meta: number}> = {};
      visibleBrands.forEach(b => tMarcas[b] = {qt: 0, valor: 0, meta: 0});

      list.forEach((r) => {
        tQt += r.qtClientes;
        tMeta += r.meta;
        tVend += r.vendido;
        
        const metaProporcional = r.meta ? (r.meta / diasUteisMes) * diasUteisSelecionados : 0;
        const pct = metaProporcional ? (r.vendido / metaProporcional) : 0;
        const rowData: any = {
          cod: r.cod,
          nome: r.nome,
          qtClientes: r.qtClientes,
          metaDia: metaProporcional,
          vendido: r.vendido,
          pct: pct
        };
        visibleBrands.forEach((b) => {
          const m = r.marcas[b];
          if (m) {
            tMarcas[b].qt += m.qt;
            tMarcas[b].valor += m.valor;
            tMarcas[b].meta += m.meta || 0;
          }
          const metaProporcionalMarca = m && m.meta ? (m.meta / diasUteisMes) * diasUteisSelecionados : 0;
          rowData[`${b}_qt`] = m ? m.qt : 0;
          rowData[`${b}_meta`] = metaProporcionalMarca;
          rowData[`${b}_vendido`] = m ? m.valor : 0;
        });
        const excelRow = sheet.addRow(rowData);
        excelRow.getCell("metaDia").numFmt = '"R$ "#,##0.00';
        excelRow.getCell("vendido").numFmt = '"R$ "#,##0.00';
        
        const pctCell = excelRow.getCell("pct");
        pctCell.numFmt = "0%";
        if (pct >= 0.35) {
          pctCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }; // bg-emerald-100
          pctCell.font = { color: { argb: "FF047857" }, bold: true }; // text-emerald-700
        } else if (pct >= 0.25) {
          pctCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFCCB" } }; // bg-lime-100
          pctCell.font = { color: { argb: "FF4D7C0F" }, bold: true }; // text-lime-700
        } else if (pct >= 0.15) {
          pctCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // bg-amber-100
          pctCell.font = { color: { argb: "FFB45309" }, bold: true }; // text-amber-700
        } else {
          pctCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } }; // bg-rose-100
          pctCell.font = { color: { argb: "FFBE123C" }, bold: true }; // text-rose-700
        }

        visibleBrands.forEach(b => {
          const m = r.marcas[b];
          const mCell = excelRow.getCell(`${b}_meta`);
          const vCell = excelRow.getCell(`${b}_vendido`);
          const qCell = excelRow.getCell(`${b}_qt`);
          mCell.numFmt = '"R$ "#,##0.00';
          vCell.numFmt = '"R$ "#,##0.00';
          
          if (!m || m.valor === 0) {
            vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } }; // bg-rose-50
            vCell.font = { color: { argb: "FFFB7185" } }; // text-rose-400
            qCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
            qCell.font = { color: { argb: "FFFB7185" } };
          } else {
            qCell.font = { color: { argb: "FF64748B" } }; // text-slate-500
          }
        });
      });

      const metaProporcionalT = (tMeta / diasUteisMes) * diasUteisSelecionados;
      const pctT = metaProporcionalT ? (tVend / metaProporcionalT) : 0;
      const totalRowData: any = {
        cod: "",
        nome: `>> TOTAL ${pasta.toUpperCase()} <<`,
        qtClientes: tQt,
        metaDia: metaProporcionalT,
        vendido: tVend,
        pct: pctT
      };
      visibleBrands.forEach((b) => {
        const m = tMarcas[b];
        const metaProporcionalT = m && m.meta ? (m.meta / diasUteisMes) * diasUteisSelecionados : 0;
        totalRowData[`${b}_qt`] = m ? m.qt : 0;
        totalRowData[`${b}_meta`] = metaProporcionalT;
        totalRowData[`${b}_vendido`] = m ? m.valor : 0;
      });
      const totalRow = sheet.addRow(totalRowData);
      totalRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } }; // bg-orange-100
        cell.font = { bold: true };
      });
      totalRow.getCell("metaDia").numFmt = '"R$ "#,##0.00';
      totalRow.getCell("vendido").numFmt = '"R$ "#,##0.00';
      totalRow.getCell("pct").numFmt = "0%";
      visibleBrands.forEach(b => {
        totalRow.getCell(`${b}_meta`).numFmt = '"R$ "#,##0.00';
        totalRow.getCell(`${b}_vendido`).numFmt = '"R$ "#,##0.00';
      });
    }

    const gt = grandTotal;
    const metaProporcionalGT = (gt.meta / diasUteisMes) * diasUteisSelecionados;
    const pctGT = metaProporcionalGT ? (gt.vend / metaProporcionalGT) : 0;
    const gRowData: any = {
      cod: "",
      nome: ">> TOTAL GERAL <<",
      qtClientes: gt.qt,
      metaDia: metaProporcionalGT,
      vendido: gt.vend,
      pct: pctGT
    };
    visibleBrands.forEach((b) => {
      const m = gt.marcas[b];
      const metaProporcionalGT = m && m.meta ? (m.meta / diasUteisMes) * diasUteisSelecionados : 0;
      gRowData[`${b}_qt`] = m ? m.qt : 0;
      gRowData[`${b}_meta`] = metaProporcionalGT;
      gRowData[`${b}_vendido`] = m ? m.valor : 0;
    });
    
    const gtRow = sheet.addRow(gRowData);
    gtRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // bg-slate-100
      cell.font = { bold: true };
    });
    gtRow.getCell("metaDia").numFmt = '"R$ "#,##0.00';
    gtRow.getCell("vendido").numFmt = '"R$ "#,##0.00';
    gtRow.getCell("pct").numFmt = "0%";
    visibleBrands.forEach(b => {
      gtRow.getCell(`${b}_meta`).numFmt = '"R$ "#,##0.00';
      gtRow.getCell(`${b}_vendido`).numFmt = '"R$ "#,##0.00';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "dashboard_vendedores.xlsx");
  }, [rows, visibleBrands, diasUteisMes, diasUteisSelecionados, grandTotal]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">


      <main className="mx-auto w-full flex-1 space-y-5 p-5">
        
        {/* Controles de Busca no Banco */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Data Inicial</label>
            <input
              type="date"
              value={dataI}
              onChange={(e) => setDataI(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Data Final</label>
            <input
              type="date"
              value={dataF}
              onChange={(e) => setDataF(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Supervisor</label>
            <select
              value={codFunc}
              onChange={(e) => setCodFunc(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="9999">Todos</option>
              {supervisores.length === 0 && <option value="1">Carregando...</option>}
              {supervisores.map((sup) => (
                <option key={sup.CODSUPERVISOR} value={sup.CODSUPERVISOR}>
                  {sup.CODSUPERVISOR} - {sup.NOME}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Filiais</label>
            <div className="flex flex-wrap gap-2">
              {listaFiliais.length === 0 && <span className="text-sm text-slate-500 py-1.5">Carregando...</span>}
              {listaFiliais.map(f => {
                const isSelected = filiaisSelecionadas.includes(f.CODIGO);
                return (
                  <button
                    key={f.CODIGO}
                    onClick={() => {
                      if (isSelected) {
                         if (filiaisSelecionadas.length > 1) {
                           setFiliaisSelecionadas(prev => prev.filter(p => p !== f.CODIGO));
                         }
                      } else {
                         setFiliaisSelecionadas(prev => [...prev, f.CODIGO]);
                      }
                    }}
                    title={f.FANTASIA}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${isSelected ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {f.CODIGO}
                  </button>
                )
              })}
            </div>
          </div>
          <button
            onClick={fetchDados}
            disabled={isLoading}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? "Consultando..." : "Consultar"}
          </button>
        </div>



        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Kpi
            label="Meta do Período"
            value={fmtBRL((totMeta / diasUteisMes) * diasUteisSelecionados)}
            sub={`Meta Diária: ${fmtBRL(totMeta / diasUteisMes)}`}
            accent="from-slate-600 to-slate-800"
            icon={<span className="text-lg">🎯</span>}
          />
          <Kpi
            label="Valor vendido"
            value={fmtBRL(totVend)}
            sub={`Falta ${fmtBRL(Math.max(0, totMeta - totVend))}`}
            accent="from-emerald-500 to-teal-600"
            icon={<span className="text-lg">💰</span>}
          />
          <Kpi
            label="Atingimento"
            value={`${(atg * 100).toFixed(1)}%`}
            sub="Meta x Realizado"
            accent="from-indigo-500 to-violet-600"
            icon={<span className="text-lg">📈</span>}
          />
          <Kpi
            label="Clientes positivados"
            value={String(totCli)}
            sub={`Ticket médio ${fmtBRL(totCli ? totVend / totCli : 0)}`}
            accent="from-sky-500 to-blue-600"
            icon={<span className="text-lg">🧾</span>}
          />
          <Kpi
            label="Sem venda"
            value={String(semVenda)}
            sub="Vendedores zerados"
            accent="from-rose-500 to-red-600"
            icon={<span className="text-lg">⚠️</span>}
          />
        </div>

        {/* Barra de progresso geral */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600">
            <span>Progresso da meta</span>
            <span>
              {fmtBRL(totVend)} / {fmtBRL(totMeta)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full transition-all bg-[#1D2681]"
              style={{ width: `${Math.min(100, atg * 100)}%` }}
            />
          </div>
        </div>

                {/* Gráficos */}
        {vendedores.length > 0 && (
          <Suspense fallback={<div className="h-[332px] rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">Carregando gráficos...</div>}>
            <DashboardCharts brandData={brandData} />
          </Suspense>
        )}


        {/* Tabela */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Detalhamento por vendedor <span className="font-normal text-slate-500">({rows.length} registros)</span>
            </h2>
            <button
              onClick={exportToExcel}
              className="rounded bg-[#1D2681] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1D2681]/90"
            >
              Exportar Excel
            </button>
          </div>
          <Table rows={rows} visibleBrands={visibleBrands} diasUteisMes={diasUteisMes} diasUteisSelecionados={diasUteisSelecionados} qtClientesGeral={qtClientesGeral} />
        </div>
      </main>

      {vendedores.length > 0 && (
        <footer className="py-6 text-center text-sm text-slate-500">
          Desenvolvido por <a href="https://github.com/oliv-gabriel" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Gabriel Oliveira</a>
        </footer>
      )}
    </div>
  );
}
