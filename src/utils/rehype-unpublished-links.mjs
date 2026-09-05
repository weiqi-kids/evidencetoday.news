/**
 * 把「指向尚未公開頁面」的站內連結降級成純文字。
 *
 * 為什麼需要這個：排程稿之間會互相連結，而它們的 publishDate 有先後。來源先上線、
 * 目標還沒上線時，那條連結在 dist 裡就是死連結，CI 的連結檢查會擋掉**全站**部署——
 * 而且擋的是當天所有人的部署，跟誰推的無關。2026-08 到 09 之間這樣炸了四次
 * （見 docs/pitfalls.md）。
 *
 * 以前的處置是人工把連結拆成純文字，但那有兩個問題：要記得做，而且目標上線之後
 * 連結也回不來。改成建置時判斷之後，**目標一上線，下一次建置就自動變回連結**，
 * 作者可以放心互相連結，不必先算兩篇的先後順序。
 *
 * 判斷邏輯與 `src/utils/visibility.ts` 的 `isPublicEntry` 一致（draft / under-review /
 * publishDate 在未來）。這裡直接讀 src/content 的 frontmatter，不經 Astro 的 collection
 * API——rehype 外掛跑在 MDX 編譯階段，那時候拿不到 collection。
 *
 * 只處理 `/articles|myths|ingredients|news/<slug>/` 這種站內內容連結；
 * 導覽列、外部連結、錨點都不碰。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const COLLECTIONS = ['articles', 'myths', 'ingredients', 'news'];
const LINK_RE = /^\/(articles|myths|ingredients|news)\/([a-z0-9-]+)\/?$/;

let publicSet = null;

function loadPublicSet() {
  const set = new Set();
  const now = Date.now();
  for (const col of COLLECTIONS) {
    const dir = `src/content/${col}`;
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => /\.mdx?$/.test(x))) {
      const raw = readFileSync(`${dir}/${f}`, 'utf8').replace(/\r\n/g, '\n');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      const head = fm[1];
      if (/^draft:\s*true\s*$/m.test(head)) continue;
      if (/^status:\s*["']?under-review["']?\s*$/m.test(head)) continue;
      const d = head.match(/^publishDate:\s*["']?(\d{4}-\d{2}-\d{2})/m);
      // ⚠️ 這裡的時間解析必須跟 src/utils/visibility.ts 的 isPublicEntry 完全一致。
      // Astro content layer 把 `2026-09-05` 解析成 UTC 午夜，isPublicEntry 拿它跟
      // Date.now() 比大小，所以「今天」的稿在 UTC 午夜之後就算已公開。
      // 初版這裡誤用 `T23:59:59+08:00`（當天結束才算公開），會把指向「今天上線」那批
      // 內容的正常連結全部拆掉——渲染端認為已公開、外掛認為還沒，兩邊不一致。
      // 沒有 publishDate 的視為已公開（某些頁型不用這個欄位）。
      if (d && Date.parse(`${d[1]}T00:00:00Z`) > now) continue;
      set.add(`/${col}/${f.replace(/\.mdx?$/, '')}/`);
    }
  }
  return set;
}

/** 自己走訪節點，不引 unist-util-visit——本專案沒裝它，rehype-stock-figure 也是手寫走訪。 */
function walk(node, stats) {
  if (!node || !Array.isArray(node.children)) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child?.type === 'element' && child.tagName === 'a') {
      const href = child.properties?.href;
      const m = typeof href === 'string' ? href.match(LINK_RE) : null;
      if (m && !publicSet.has(`/${m[1]}/${m[2]}/`)) {
        // 目標尚未公開 → 拆掉 <a>，保留裡面的文字，然後從同一位置繼續掃
        node.children.splice(i, 1, ...(child.children || []));
        stats.n++;
        i--;
        continue;
      }
    }
    walk(child, stats);
  }
}

export default function rehypeUnpublishedLinks() {
  return (tree) => {
    if (!publicSet) publicSet = loadPublicSet();
    const stats = { n: 0 };
    walk(tree, stats);
    return tree;
  };
}
