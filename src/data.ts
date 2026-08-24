export const BRANDS = [
  "SELMI",
  "BOMBRIL",
  "BIMBO",
  "ARCOR",
  "GALLO",
  "BAGLEY",
  "BETTANIN",
  "NUTRY",
] as const;

export type Brand = (typeof BRANDS)[number];

export type BrandCell = { qt: number; valor: number };

export interface Vendedor {
  cod: string;
  nome: string;
  pasta: string;
  qtClientes: number;
  meta: number;
  vendido: number;
  marcas: Partial<Record<Brand, BrandCell>>;
}

const v = (
  cod: string,
  nome: string,
  pasta: string,
  qtClientes: number,
  meta: number,
  vendido: number,
  marcas: Partial<Record<Brand, [number, number]>>
): Vendedor => ({
  cod,
  nome,
  pasta,
  qtClientes,
  meta,
  vendido,
  marcas: Object.fromEntries(
    Object.entries(marcas).map(([k, val]) => [k, { qt: val![0], valor: val![1] }])
  ) as Partial<Record<Brand, BrandCell>>,
});

export const VENDEDORES: Vendedor[] = [
  v("942", "(AS) ANA KARINA CAMPOS SILVA DA COSTA", "PASTA A (HORARIO)", 27, 590000, 180676, {
    SELMI: [26, 141479],
    GALLO: [11, 37929],
    NUTRY: [4, 1268],
  }),
  v("998", "(AS) ROSEANE DO AMARAL RODRIGUES", "PASTA A (HORARIO)", 16, 258000, 54749, {
    SELMI: [16, 45487],
    GALLO: [8, 7773],
    NUTRY: [7, 1424],
  }),
  v("1171", "ULYSSES GABRIEL CARDOSO DE SOUZA", "PASTA A (HORARIO)", 20, 251000, 49920, {
    SELMI: [19, 39010],
    GALLO: [3, 1693],
    NUTRY: [8, 9216],
  }),
  v("1177", "THIAGO VALENTE ARCANHJO", "PASTA A (HORARIO)", 35, 104000, 40348, {
    SELMI: [33, 30231],
    GALLO: [14, 2530],
    NUTRY: [10, 1006],
    BETTANIN: [17, 5236],
  }),
  v("1104", "(M OESTE) GUSTAVO LIMA DO NASCIMENTO", "PASTA A (HORARIO)", 16, 124000, 23879, {
    SELMI: [15, 14393],
    GALLO: [6, 4480],
    NUTRY: [5, 772],
    BETTANIN: [8, 3566],
  }),
  v("1094", "(M NORTE) JOSE ARMANDO MESSIAS DE CASTRO", "PASTA A (HORARIO)", 18, 112000, 35746, {
    SELMI: [17, 23937],
    GALLO: [6, 3525],
    NUTRY: [5, 534],
    BETTANIN: [4, 7750],
  }),
  v("1173", "DAILA ALVES DAMASCENO", "PASTA A (HORARIO)", 16, 81000, 22795, {
    SELMI: [16, 21529],
    GALLO: [0, 0],
    NUTRY: [1, 163],
    BETTANIN: [3, 1103],
  }),
  v("1135", "(MV LESTE) ERISON JENERCLEY DOS S.", "PASTA A (HORARIO)", 18, 59000, 13012, {
    SELMI: [17, 9379],
    GALLO: [6, 706],
    NUTRY: [8, 1239],
    BETTANIN: [12, 1689],
  }),
  v("1150", "(MV NORTE) MARCOS THIAGO DOS SANTOS", "PASTA A (HORARIO)", 18, 70000, 19099, {
    SELMI: [18, 13312],
    GALLO: [2, 2149],
    NUTRY: [9, 761],
    BETTANIN: [11, 2551],
  }),
  v("1179", "LUCIANO SOUZA DA SILVA", "PASTA A (HORARIO)", 23, 62000, 22001, {
    SELMI: [23, 16783],
    GALLO: [2, 2436],
    NUTRY: [6, 904],
    BETTANIN: [13, 1877],
  }),
  v("1167", "(MV SUL) RAIMUNDO GARCIA COSTA", "PASTA A (HORARIO)", 25, 70000, 28134, {
    SELMI: [23, 20116],
    GALLO: [3, 3580],
    NUTRY: [3, 385],
    BETTANIN: [8, 4053],
  }),
  v("1157", "(CONV) DANIEL DE SA ARAUJO", "PASTA A (HORARIO)", 24, 52500, 16036, {
    SELMI: [14, 4128],
    GALLO: [5, 731],
    NUTRY: [7, 742],
    BETTANIN: [7, 910],
    ARCOR: [16, 2432],
    BAGLEY: [19, 2307],
    BOMBRIL: [11, 3747],
    BIMBO: [11, 1039],
  }),
  v("1112", "(CONV) ELIEZIO RODRIGUES ARANTES", "PASTA A (HORARIO)", 16, 63500, 14428, {
    SELMI: [8, 2207],
    GALLO: [3, 255],
    NUTRY: [11, 1295],
    BETTANIN: [2, 627],
    ARCOR: [12, 3792],
    BAGLEY: [8, 1419],
    BOMBRIL: [7, 2995],
    BIMBO: [4, 1837],
  }),
  v("605", "(AS AB) ERIKA FERREIRA MATOS", "PASTA B (LANE)", 46, 1717000, 359075, {
    SELMI: [21, 117053],
    GALLO: [6, 95382],
    NUTRY: [0, 0],
    ARCOR: [3, 15237],
    BAGLEY: [1, 4490],
    BIMBO: [44, 126913],
  }),
  v("1055", "(AS AB) RENATO ALBUQUERQUE SARGES", "PASTA B (LANE)", 0, 375000, 0, {
    SELMI: [0, 0],
    GALLO: [0, 0],
    NUTRY: [0, 0],
    ARCOR: [0, 0],
    BAGLEY: [0, 0],
    BOMBRIL: [0, 0],
    BIMBO: [0, 0],
  }),
  v("584", "(AS AB) SILDOMAR ALVES", "PASTA B (LANE)", 1, 593000, 29120, {
    SELMI: [1, 29120],
    GALLO: [0, 0],
    NUTRY: [0, 0],
    BOMBRIL: [0, 0],
    BIMBO: [0, 0],
  }),
  v("996", "(DB) DARLYNE CARVALHO DE FREITAS", "PASTA B (LANE)", 25, 790000, 146307, {
    SELMI: [0, 0],
    GALLO: [0, 0],
    NUTRY: [0, 0],
    ARCOR: [0, 0],
    BAGLEY: [0, 0],
    BIMBO: [25, 146307],
  }),
  v("1049", "(MV SUL) ENDRYO HENRIQUE AYRES", "PASTA B (LANE)", 19, 333000, 16606, {
    SELMI: [0, 0],
    GALLO: [1, 146],
    NUTRY: [0, 0],
    BETTANIN: [0, 0],
    ARCOR: [12, 1705],
    BAGLEY: [13, 4058],
    BOMBRIL: [13, 8535],
    BIMBO: [13, 2109],
  }),
  v("868", "(AS) ANDRE ROCHA DOS SANTOS", "PASTA B (LANE)", 14, 360000, 42303, {
    ARCOR: [5, 10694],
    BAGLEY: [7, 10543],
    BOMBRIL: [11, 20883],
  }),
  v("1038", "(AS) JOSE ADRIANO DA COSTA", "PASTA B (LANE)", 12, 1260000, 61386, {
    ARCOR: [7, 23715],
    BAGLEY: [5, 11833],
    BOMBRIL: [7, 25838],
  }),
  v("973", "(M LESTE B) FABIO ARAUJO", "PASTA B (LANE)", 30, 113000, 36962, {
    ARCOR: [18, 7361],
    BAGLEY: [21, 9445],
    BOMBRIL: [22, 18355],
    BIMBO: [8, 1800],
  }),
  v("1100", "(M NORTE) WILLIAN FELIPE DUARTE AQUINO", "PASTA B (LANE)", 26, 165000, 28031, {
    ARCOR: [17, 8209],
    BAGLEY: [15, 6859],
    BOMBRIL: [15, 8771],
    BIMBO: [6, 4191],
  }),
  v("1017", "(M SUL) PAULO EMILIO MIRANDA REIS", "PASTA B (LANE)", 23, 145000, 26869, {
    ARCOR: [19, 5319],
    BAGLEY: [15, 8728],
    BOMBRIL: [18, 9876],
    BIMBO: [8, 2104],
  }),
  v("1170", "(MV LESTE) LUCAS CARVALHO DE SOUZA", "PASTA B (LANE)", 22, 85000, 19617, {
    ARCOR: [16, 4458],
    BAGLEY: [19, 3138],
    BOMBRIL: [21, 9716],
    BIMBO: [13, 2047],
  }),
  v("1121", "(MV NORTE) DANIELLA BRIGIDA SANTOS", "PASTA B (LANE)", 22, 92000, 33041, {
    ARCOR: [19, 6719],
    BAGLEY: [20, 4974],
    BOMBRIL: [21, 17040],
    BIMBO: [18, 4309],
  }),
  v("1086", "(MV OESTE) ERICLES AFONSO NEGREIROS", "PASTA B (LANE)", 14, 82000, 8794, {
    ARCOR: [13, 1530],
    BAGLEY: [10, 2421],
    BOMBRIL: [10, 3978],
    BIMBO: [5, 865],
  }),
  v("1144", "(MV SUL) FRANCISCO DAS CHAGAS WALLACY", "PASTA B (LANE)", 26, 82000, 30330, {
    ARCOR: [14, 2553],
    BAGLEY: [15, 5595],
    BOMBRIL: [17, 20001],
    BIMBO: [9, 2180],
  }),
];

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtNum = (n: number) => n.toLocaleString("pt-BR");
