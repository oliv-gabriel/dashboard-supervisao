import express from 'express';
import cors from 'cors';
import oracledb from 'oracledb';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json({ limit: '20kb' }));

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING,
  poolMin: 1,
  poolMax: 8,
  poolIncrement: 1,
  stmtCacheSize: 40,
};

const SQL_DIR = path.join(__dirname, 'SQL');
const SQL = Object.fromEntries(
  await Promise.all(
    ['DASHBOARD_VENDEDORES.SQL', 'DASHBOARD_VENDAS.SQL', 'DASHBOARD_METAS.SQL']
      .map(async (file) => [file, await fs.readFile(path.join(SQL_DIR, file), 'utf8')])
  )
);

async function executeQuery(connection, sql, binds = {}) {
  const result = await connection.execute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    fetchArraySize: 500,
  });
  return result.rows;
}

async function withConnection(work) {
  let connection;
  try {
    connection = await oracledb.getConnection();
    return await work(connection);
  } finally {
    if (connection) await connection.close();
  }
}

function query(sql, binds) {
  return withConnection((connection) => executeQuery(connection, sql, binds));
}

function makeFilialBinds(filiais) {
  const validFiliais = [...new Set(filiais.map(String))]
    .filter((filial) => /^\d{1,6}$/.test(filial))
    .slice(0, 30);
  if (!validFiliais.length) throw new Error('Selecione ao menos uma filial válida.');

  return {
    binds: Object.fromEntries(validFiliais.map((filial, index) => [`FILIAL${index}`, filial])),
    clause: validFiliais.map((_, index) => `:FILIAL${index}`).join(', '),
  };
}

function withFiliais(template, clause) {
  return template.replaceAll('/* FILIAIS */', clause);
}

function withPermissions(template, codFunc) {
  const codFuncFilter = codFunc === '9999' ? '' : 'AND l.CODFUNC = :CODFUNC';
  const supervisorPermission = 'AND EXISTS (SELECT 1 FROM PCLIB l WHERE l.CODTABELA = 7 ' + codFuncFilter + ' AND l.CODIGON = ';
  if (template.includes('FROM PCUSUARI u')) {
    return template.replace('/* PERMISSOES */', supervisorPermission + 'u.CODSUPERVISOR)');
  }
  const supplierPermission = 'AND EXISTS (SELECT 1 FROM PCLIB l WHERE l.CODTABELA = 3 ' + codFuncFilter + ' AND l.CODIGON = p.CODFORNEC)';
  return template.replace('/* PERMISSOES */', supervisorPermission + 'c.CODSUPERVISOR)\n   ' + supplierPermission);
}
function parseRequestDate(value, endOfDay = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Datas inválidas.');
  }
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  if (Number.isNaN(date.valueOf())) throw new Error('Datas inválidas.');
  return date;
}

const LIST_CACHE_MS = 10 * 60 * 1000;
const DASHBOARD_CACHE_MS = 30 * 1000;
const listCache = new Map();
const dashboardCache = new Map();
const pendingCacheRequests = new Map();

async function cached(cache, key, ttl, load) {
  const cachedValue = cache.get(key);
  if (cachedValue && cachedValue.expiresAt > Date.now()) return cachedValue.data;
  if (pendingCacheRequests.has(key)) return pendingCacheRequests.get(key);
  const request = load().then((data) => {
    cache.set(key, { data, expiresAt: Date.now() + ttl });
    return data;
  }).finally(() => pendingCacheRequests.delete(key));
  pendingCacheRequests.set(key, request);
  return request;
}

async function cachedList(key, sql) {
  return cached(listCache, key, LIST_CACHE_MS, () => query(sql));
}

app.get('/api/supervisores', async (_req, res) => {
  try {
    const data = await cachedList(
      'supervisores',
      "SELECT CODSUPERVISOR, NOME FROM PCSUPERV WHERE CODSUPERVISOR NOT IN ('9999', '999999') AND POSICAO = 'A' ORDER BY NOME"
    );
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar supervisores:', err);
    res.status(500).json({ error: 'Erro ao buscar supervisores' });
  }
});

app.get('/api/filiais', async (_req, res) => {
  try {
    const data = await cachedList(
      'filiais',
      "SELECT CODIGO, FANTASIA FROM PCFILIAL WHERE CODIGO <> '99' ORDER BY TO_NUMBER(CODIGO)"
    );
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar filiais:', err);
    res.status(500).json({ error: 'Erro ao buscar filiais' });
  }
});

app.post('/api/dashboard', async (req, res) => {
  try {
    const { dataI, dataF, codFunc = '9999', filiais = ['1', '2'] } = req.body ?? {};
    const dateI = parseRequestDate(dataI);
    const dateF = parseRequestDate(dataF, true);
    if (dateI > dateF) throw new Error('A data inicial não pode ser posterior à data final.');
    if (!Array.isArray(filiais)) throw new Error('Filiais inválidas.');
    if (!/^\d{1,10}$/.test(String(codFunc))) throw new Error('Supervisor inválido.');

    const { binds: filialBinds, clause } = makeFilialBinds(filiais);
    const commonBinds = { ...filialBinds, DATAI: dateI, DATAF: dateF };

    const normalizedCodFunc = String(codFunc);
    // Oracle rejects binds that are absent from the final dynamic SQL.
    const permissionBinds = normalizedCodFunc === '9999'
      ? commonBinds
      : { ...commonBinds, CODFUNC: normalizedCodFunc };
    const vendedoresBinds = normalizedCodFunc === '9999'
      ? {}
      : { CODFUNC: normalizedCodFunc };
    const cacheKey = [dataI, dataF, normalizedCodFunc, ...Object.values(filialBinds)].join('|');
    const [vendedores, vendas, metas, diasUteisRes, diasUteisSelRes] = await Promise.all([
      cached(dashboardCache, 'vendedores:' + normalizedCodFunc, DASHBOARD_CACHE_MS,
        () => query(withPermissions(SQL['DASHBOARD_VENDEDORES.SQL'], normalizedCodFunc), vendedoresBinds)),
      cached(dashboardCache, 'vendas:' + cacheKey, DASHBOARD_CACHE_MS,
        () => query(withPermissions(withFiliais(SQL['DASHBOARD_VENDAS.SQL'], clause), normalizedCodFunc), permissionBinds)),
      cached(dashboardCache, 'metas:' + cacheKey, DASHBOARD_CACHE_MS,
        () => query(withFiliais(SQL['DASHBOARD_METAS.SQL'], clause), commonBinds)),
      cached(dashboardCache, 'diasUteis:' + dateI.getTime() + '|' + dateF.getTime(), DASHBOARD_CACHE_MS,
        () => query(`SELECT COUNT(*) AS QTD FROM PCDATAS WHERE DATA BETWEEN TRUNC(:DATAI, 'MM') AND LAST_DAY(:DATAF) AND DIAUTIL = 'S'`, { DATAI: dateI, DATAF: dateF })),
      cached(dashboardCache, 'diasUteisSel:' + dateI.getTime() + '|' + dateF.getTime(), DASHBOARD_CACHE_MS,
        () => query(`SELECT COUNT(*) AS QTD FROM PCDATAS WHERE DATA BETWEEN :DATAI AND :DATAF AND DIAUTIL = 'S'`, { DATAI: dateI, DATAF: dateF })),
    ]);

    const marcasMapping = {
      589: 'SELMI', 543: 'BOMBRIL', 1031: 'BIMBO', 1: 'ARCOR',
      960: 'GALLO', 25: 'BAGLEY', 704: 'BETTANIN', 1562: 'NUTRY',
    };
    const vendasPorVendedor = new Map();
    const marcasPorVendedor = new Map();
    for (const row of vendas) {
      const codUsur = String(row.CODUSUR);
      if (row.CODFORNEC === null) {
        vendasPorVendedor.set(codUsur, row);
        continue;
      }
      const marca = marcasMapping[row.CODFORNEC];
      if (!marca) continue;
      
      if (!marcasPorVendedor.has(codUsur)) marcasPorVendedor.set(codUsur, {});
      if (!marcasPorVendedor.get(codUsur)[marca]) {
        marcasPorVendedor.get(codUsur)[marca] = { qt: 0, valor: 0, meta: 0 };
      }
      marcasPorVendedor.get(codUsur)[marca].qt += Number(row.QTCLIPOS) || 0;
      marcasPorVendedor.get(codUsur)[marca].valor += Number(row.PVENDA) || 0;
    }

    const metasGlobaisPorVendedor = new Map();
    for (const row of metas) {
      const codUsur = String(row.CODUSUR);
      
      if (!metasGlobaisPorVendedor.has(codUsur)) metasGlobaisPorVendedor.set(codUsur, 0);
      metasGlobaisPorVendedor.set(codUsur, metasGlobaisPorVendedor.get(codUsur) + (Number(row.VLMETA) || 0));

      const marca = marcasMapping[row.CODFORNEC];
      if (!marca) continue;
      
      if (!marcasPorVendedor.has(codUsur)) marcasPorVendedor.set(codUsur, {});
      if (!marcasPorVendedor.get(codUsur)[marca]) {
        marcasPorVendedor.get(codUsur)[marca] = { qt: 0, valor: 0, meta: 0 };
      }
      marcasPorVendedor.get(codUsur)[marca].meta += Number(row.VLMETA) || 0;
    }

    const dashboardData = vendedores.map((vendedor) => {
      const cod = String(vendedor.CODUSUR);
      const venda = vendasPorVendedor.get(cod);
      const meta = metasGlobaisPorVendedor.get(cod) || 0;
      return {
        cod,
        nome: vendedor.NOME,
        codSupervisor: vendedor.CODSUPERVISOR?.toString() || '0',
        qtClientes: Number(venda?.QTCLIPOS) || 0,
        meta: meta,
        vendido: Number(venda?.PVENDA) || 0,
        marcas: marcasPorVendedor.get(cod) || {},
      };
    });
    const diasUteisMes = diasUteisRes[0]?.QTD || 1;
    const diasUteisSelecionados = diasUteisSelRes[0]?.QTD || 1;
    res.set('Cache-Control', 'private, max-age=30');
    res.json({ diasUteisMes, diasUteisSelecionados, data: dashboardData });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar dados do banco.';
    const isValidationError = /inválid|Selecione|posterior/i.test(message);
    if (!isValidationError) console.error('Erro no dashboard:', err);
    res.status(isValidationError ? 400 : 500).json({ error: message });
  }
});

async function start() {
  try {
    try {
      oracledb.initOracleClient();
    } catch (err) {
      console.warn('Oracle Client não inicializado em Thick mode; usando o modo disponível.', err.message);
    }
    await oracledb.createPool(dbConfig);
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => console.log(`Servidor backend rodando na porta ${port}`));
  } catch (err) {
    console.error('Não foi possível iniciar o pool Oracle:', err);
    process.exitCode = 1;
  }
}

start();