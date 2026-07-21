// 證據／來源類型 enum → 繁體中文標籤（單一真相來源）
//
// 為什麼獨立成這支：referenceSchema.type 的英文 enum（meta-analysis / rct …）若直接輸出到前台，
// 對繁中 YMYL 讀者是生硬英文，也是 `pnpm content:audit` 會抓的 raw enum 外露。集中在此讓
// ReferenceList 等元件共用，避免各頁各寫一份、用詞漂移。用詞對齊 myths 單篇頁的 sourceTypeLabels。

export const referenceTypeLabels: Record<string, string> = {
  // referenceSchema.type 的 14 個值
  'meta-analysis': '統合分析',
  'systematic-review': '系統性回顧',
  'cochrane-review': 'Cochrane 回顧',
  rct: '隨機對照試驗',
  cohort: '世代研究',
  'case-control': '病例對照研究',
  'cross-sectional': '橫斷面研究',
  observational: '觀察性研究',
  review: '文獻回顧',
  guideline: '臨床指引',
  'official-agency': '官方機構',
  'expert-review': '專家評述',
  'safety-database': '安全性資料庫',
  other: '其他來源',
  // 亦涵蓋 sourceType / 成分 evidenceLevel 會出現的額外值
  animal: '動物研究',
  'in-vitro': '體外研究',
  'case-report': '個案報告',
};

/** 取得證據／來源類型的中文標籤；未知值原樣回傳（不吞資料）。 */
export function referenceTypeLabel(type: string): string {
  return referenceTypeLabels[type] ?? type;
}
