/**
 * Base-aware URL helpers。
 *
 * evidencetoday 目前部署在根網域（BASE_URL='/'），但所有站內資產一律透過
 * asset() 取得，未來若改掛子路徑只要 astro.config 的 base 變了，全站連結
 * 自動跟著走，不需逐檔修改。編輯器的圖片預覽（library / cover）共用此函式。
 */

const BASE = import.meta.env.BASE_URL; // 例如 '/' 或 '/sub/'

/** 取得資產（圖片等）的 base-aware 路徑；絕對網址（外部圖床）原樣回傳。 */
export function asset(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;
  const clean = `/${String(path).replace(/^\/+/, '')}`;
  return (BASE.replace(/\/+$/, '') + clean).replace(/\/{2,}/g, '/');
}
