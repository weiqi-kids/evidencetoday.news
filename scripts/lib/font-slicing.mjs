// 字型 unicode-range 切塊的純邏輯（無 fs / 無 subset-font，便於測試）。

// 把文字的唯一碼位排序後，依碼位連續切成「每段約 targetPerSlice 字」的區段。
// 回傳每段 { chars, min, max }：chars 給 subset-font 子集用，min/max 給 unicode-range。
export function partitionCodepoints(text, targetPerSlice = 200) {
  if (targetPerSlice <= 0) throw new RangeError(`targetPerSlice must be > 0, got ${targetPerSlice}`);
  const cps = [...new Set([...text].map((ch) => ch.codePointAt(0)))].sort((a, b) => a - b);
  const slices = [];
  for (let i = 0; i < cps.length; i += targetPerSlice) {
    const group = cps.slice(i, i + targetPerSlice);
    slices.push({
      chars: group.map((c) => String.fromCodePoint(c)).join(''),
      min: group[0],
      max: group[group.length - 1],
    });
  }
  return slices;
}

// 碼位 min/max → CSS unicode-range 字串（min==max 時為單點）。
export function unicodeRange(min, max) {
  const hex = (n) => 'U+' + n.toString(16);
  return min === max ? hex(min) : `${hex(min)}-${max.toString(16)}`;
}

// 產一條切片 @font-face（真實 family、font-display:optional、單一 woff2 src、帶 unicode-range）。
export function faceCss({ family, weight, url, range }) {
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:optional;src:url(${url}) format('woff2');unicode-range:${range}}`;
}

// 注意：以 [^}]* 比對 block 內容，假設 @font-face 的值不含巢狀 '}'（字型 CSS 不會）。
// 容忍 @font-face 與 '{' 間的空白，但仍針對壓縮後的單層 block。
// 移除 CSS 中內容參照到 baseName 的所有 @font-face，於尾端插入 newRules。回傳 { css, changed }。
export function replaceFontFaces(css, baseName, newRules) {
  let changed = false;
  const out = css.replace(/@font-face\s*\{[^}]*\}/g, (block) => {
    if (block.includes(baseName)) {
      changed = true;
      return '';
    }
    return block;
  });
  if (!changed) return { css, changed: false };
  return { css: out + newRules.join(''), changed: true };
}
