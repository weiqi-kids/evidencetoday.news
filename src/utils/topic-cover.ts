// 健康專題代表縮圖：從該主題「自動歸入」的內容中挑一張封面圖當專題卡片縮圖。
// 專題本身沒有獨立圖庫（也不想手工維護逐主題圖），改用資料驅動：掃已比對到的
// 文章／成分解析，取最新一篇有合法封面的當代表圖，缺圖時退回品牌佔位（與各 Card 一致）。
//
// 用 process.cwd() 而非 import.meta.url：production build 打包後 import.meta.url 指向
// bundle chunk 位置，`../../public` 這類相對推算會失準、本地圖全判為不存在（見 ArticleCard 註記）。

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { matchesTopic, type Topic } from '@/data/topics';

/** 封面圖是否可用：外連 http(s) 直接採用；本地 `/…` 須確認 public 下存在。 */
function isUsableCover(src?: string): src is string {
  return (
    typeof src === 'string' &&
    (src.startsWith('http://') ||
      src.startsWith('https://') ||
      (src.startsWith('/') && existsSync(join(process.cwd(), 'public', src))))
  );
}

/** 缺圖時的品牌佔位（沿用各 collection OG 壓縮縮圖的視覺語彙）。 */
const FALLBACK_COVER = '/og-thumb/home.webp';

interface CoverEntry {
  data: { title?: string; tags?: string[]; coverImage?: string; coverAlt?: string };
}

/**
 * 為單一主題挑代表縮圖。`pools` 依優先序傳入（例如 [articles, ingredients]），
 * 各池請先照發佈日新到舊排序，取第一個「有比對到本主題且封面合法」的項目。
 * 全數落空時回傳品牌佔位圖（alt 空字串，視為裝飾）。
 */
export function resolveTopicCover(
  topic: Topic,
  pools: CoverEntry[][],
): { src: string; alt: string } {
  for (const pool of pools) {
    const match = pool.find(
      (entry) => matchesTopic(topic, entry.data) && isUsableCover(entry.data.coverImage),
    );
    if (match) {
      return {
        src: match.data.coverImage as string,
        alt: match.data.coverAlt || `${topic.name}主題示意圖`,
      };
    }
  }
  return { src: FALLBACK_COVER, alt: '' };
}
