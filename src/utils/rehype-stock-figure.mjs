/**
 * rehype plugin：把「帶圖庫攝影連結的內文圖」轉成語意 <figure> + 可點 <figcaption>。
 *
 * 觸發條件（刻意嚴格，避免誤傷一般內文圖）：
 *   段落（<p>）只包單一 <img>，且該 img 的 title 是「合法、且網域屬於圖庫」的 http(s) URL。
 *   → title 來自編輯器選圖時 worker /stock 回傳的攝影師頁網址（Unsplash user.links.html /
 *     Pexels photographer_url），是 API 提供的真實連結，非 AI 編造。
 *
 * 安全防線：
 *   - 只有 hostname 屬於 unsplash.com / pexels.com（含子網域）的 URL 才會被當成署名連結；
 *     其餘一律不轉 figure、不產生連結——這就是「確保連結不是幻想、真的可連」的把關點。
 *   - 用 hast 結構化節點輸出（不是 raw HTML 字串），MDX 會正確序列化成自閉 <img />，
 *     不會重蹈「未自閉 <img> 炸掉 build」的覆轍（見 docs/playbooks/editor-images.md）。
 *
 * alt（攝影師名）會成為連結文字；前台 figcaption 顯示「攝影：<a>名字</a>」。
 */

// 允許的圖庫網域（攝影師頁）。只認這些，確保署名連結真實可連。
const STOCK_HOSTS = ['unsplash.com', 'pexels.com'];

function stockCreditHref(title) {
  if (typeof title !== 'string' || !title) return null;
  let u;
  try {
    u = new URL(title);
  } catch {
    return null; // 不是合法 URL → 不當連結
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.toLowerCase();
  const ok = STOCK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  return ok ? u.href : null;
}

function nonBlank(children) {
  return (children || []).filter((c) => !(c.type === 'text' && !String(c.value).trim()));
}

// 若 node 是符合條件的 <p><img></p>，回傳替換用的 <figure> node；否則回 null。
function toFigure(node) {
  if (!node || node.type !== 'element' || node.tagName !== 'p') return null;
  const kids = nonBlank(node.children);
  if (kids.length !== 1) return null;
  const img = kids[0];
  if (!img || img.type !== 'element' || img.tagName !== 'img') return null;

  const props = img.properties || {};
  const href = stockCreditHref(props.title);
  if (!href) return null; // 沒有真實圖庫攝影連結 → 不轉，維持原樣

  const alt = typeof props.alt === 'string' ? props.alt : '';
  const label = alt || '來源';

  // 重建 img：移除 title（已轉成連結）、補 loading=lazy。
  const newProps = { ...props, loading: 'lazy' };
  delete newProps.title;
  const figImg = { type: 'element', tagName: 'img', properties: newProps, children: [] };

  const figcaption = {
    type: 'element',
    tagName: 'figcaption',
    properties: { className: ['et-figure__credit'] },
    children: [
      { type: 'text', value: '攝影：' },
      {
        type: 'element',
        tagName: 'a',
        properties: { href, target: '_blank', rel: ['noopener', 'noreferrer', 'nofollow'] },
        children: [{ type: 'text', value: label }],
      },
    ],
  };

  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: ['et-figure'] },
    children: [figImg, figcaption],
  };
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  for (let i = 0; i < node.children.length; i++) {
    const fig = toFigure(node.children[i]);
    if (fig) {
      node.children[i] = fig;
      continue; // figure 內已是最終結構，不再下探
    }
    walk(node.children[i]);
  }
}

export default function rehypeStockFigure() {
  return (tree) => {
    walk(tree);
    return tree;
  };
}

// 給單元測試用的內部函式
export { stockCreditHref, toFigure };
