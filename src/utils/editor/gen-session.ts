// 本次編輯階段的「AI 生成記錄」(C 方案)：每張生成圖都先記著，
// 關閉編輯器前問使用者要保留哪些到圖庫，避免付費生成被白白丟掉。
// 模組級單例（一次只開一個編輯器；開啟時 reset）。非響應式——只在事件處理中讀取。

export interface GenItem {
  id: string;
  b64: string;
  mime: string;
  used: boolean; // 是否已「用這張」選用
}

let items: GenItem[] = [];

export function resetGenSession(): void {
  items = [];
}

/** 記一張新生成圖，回傳 id。 */
export function addGenerated(b64: string, mime: string, id: string): string {
  items.push({ id, b64, mime, used: false });
  return id;
}

/** 標記某張（用 b64 比對）已被選用 → 不再提示歸檔。 */
export function markGenUsed(b64: string): void {
  const it = items.find((i) => i.b64 === b64);
  if (it) it.used = true;
}

/** 取尚未選用的生成圖（關閉前要問是否保留的對象）。 */
export function unusedGenerated(): GenItem[] {
  return items.filter((i) => !i.used);
}
