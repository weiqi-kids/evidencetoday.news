/**
 * 跨國保健品法規對照 —— 統一資料層（`/regulations/` 彙整頁的唯一來源）。
 *
 * 資料由 `regulations-a.ts` 與 `regulations-b.ts` 合併而來，兩者都是從**已查證過的文章**
 * 逐格抽取，不另外研究——那些文章的每一筆都經過查證，臨時補查的沒有。
 *
 * 兩個來源檔的形狀刻意不同：A 的三種成分（褪黑激素／NMN／紅麴）落差剛好在台美日歐，
 * B 的兩種不是（南非醉茄的關鍵對照國是丹麥、荷蘭與印度，5-HTP 多了加拿大，日本反而
 * 沒有可引用的材料）。硬套固定四欄會逼出空格或臆測，所以這裡收斂成
 * 「**每種成分自帶欄位定義**」的模型，由資料決定要顯示哪幾個轄區。
 */
import { REGULATIONS_A } from './regulations-a';
import { REGULATIONS_B, CARRY_LIMITS } from './regulations-b';

export interface RegCell {
  text: string;
  /** 官方出處網址；只放文章 references 裡實際存在的 */
  source?: string;
  sourceLabel?: string;
  /** 依據文件的發布或查證日期。法規會變，沒有時間座標的斷言一年後就是錯的 */
  asOf?: string;
  note?: string;
}

export interface RegColumn {
  key: string;
  label: string;
}

export interface RegRow {
  dimension: string;
  cells: Record<string, RegCell>;
}

export interface SubstanceReg {
  articleSlug: string;
  ingredientSlug?: string;
  name: string;
  nameEn?: string;
  /** 表格下方那句「一句話結論」 */
  verdict: string;
  asOf?: string;
  columns: RegColumn[];
  rows: RegRow[];
  /** 本站自己查一手文件得到、既有中文資料查不到現成說法的發現 */
  originalFindings: string[];
}

const A_COLUMNS: RegColumn[] = [
  { key: 'tw', label: '台灣' },
  { key: 'us', label: '美國' },
  { key: 'jp', label: '日本' },
  { key: 'eu', label: '歐盟' },
];

const fromA = (s: (typeof REGULATIONS_A)[number]): SubstanceReg => ({
  articleSlug: s.articleSlug,
  ingredientSlug: s.ingredientSlug,
  name: s.name,
  nameEn: s.nameEn,
  verdict: s.verdict,
  columns: A_COLUMNS,
  rows: s.rows.map((r) => ({
    dimension: r.dimension,
    cells: { tw: r.tw, us: r.us, jp: r.jp, eu: r.eu },
  })),
  originalFindings: s.originalFindings ?? [],
});

const fromB = (s: (typeof REGULATIONS_B)[number]): SubstanceReg => ({
  articleSlug: s.articleSlug,
  ingredientSlug: s.ingredientSlug,
  name: s.name,
  nameEn: s.latinName,
  verdict: s.conclusion,
  asOf: s.asOf,
  columns: [
    ...Object.entries(s.columns).map(([key, label]) => ({ key, label })),
    ...Object.entries(s.extraColumns ?? {}).map(([key, label]) => ({ key, label })),
  ],
  rows: s.dimensions.map((d) => ({
    dimension: d.label,
    cells: { ...d.cells, ...(d.extra ?? {}) },
  })),
  originalFindings: s.originalFindings ?? [],
});

export const REGULATIONS: SubstanceReg[] = [
  ...REGULATIONS_A.map(fromA),
  ...REGULATIONS_B.map(fromB),
];

export { CARRY_LIMITS };
export type { CarryLimit } from './regulations-b';

/** 整份對照的最後查證日：取所有資料裡最新的 asOf，沒有就退回建置日。 */
export const LAST_VERIFIED: string = (() => {
  const dates: string[] = [];
  for (const s of REGULATIONS) {
    if (s.asOf) dates.push(s.asOf);
    for (const r of s.rows) for (const c of Object.values(r.cells)) if (c.asOf) dates.push(c.asOf);
  }
  for (const c of CARRY_LIMITS) if (c.asOf) dates.push(c.asOf);
  // 上限鎖在今天。部分 asOf 取自來源文章的 updatedDate，而排程稿的日期在未來；
  // 不設上限就會對外宣稱「未來查證過」——這是一頁要給人引用的資料表，日期不能是未來。
  const today = new Date().toISOString().slice(0, 10);
  const iso = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today).sort();
  return iso.length ? iso[iso.length - 1] : today;
})();
