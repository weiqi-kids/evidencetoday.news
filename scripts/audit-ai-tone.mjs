import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/content');
const phrasePatterns = [
  ['不是…而是', /不是.+?而是/g],
  ['不只是…更是', /不只是.+?更是/g],
  ['換句話說', /換句話說/g],
  ['這件事值得說清楚', /這件事值得說清楚/g],
  ['真正的問題是', /真正的問題是/g],
  ['我一直覺得', /我一直覺得/g],
  ['老實講', /老實講/g],
  ['有人說', /有人說/g],
];
const vaguePatterns = [
  '有研究指出','某研究指出','專家認為','有文獻表示','文獻回顧','研究者觀點','摘自臨床生化教學文獻'
];

function walk(dir){
  const out=[];
  for(const name of readdirSync(dir)){
    const p=path.join(dir,name);
    const st=statSync(p);
    if(st.isDirectory()) out.push(...walk(p));
    else if(p.endsWith('.mdx')) out.push(p);
  }
  return out;
}

for(const file of walk(root)){
  const txt=readFileSync(file,'utf8');
  const phraseHits=[];
  for(const [label,re] of phrasePatterns){
    const count=(txt.match(re)||[]).length;
    if(count) phraseHits.push(`${label} x${count}`);
  }
  const vagueHits=vaguePatterns.filter((s)=>txt.includes(s));
  const rawRisk = /\bobservational\s+observational\b/.test(txt) ? '高（含重複 raw enum）' : (/\b(meta-analysis|rct|observational|animal|in-vitro)\b/.test(txt) ? '中（含 enum 字串）' : '低');
  if(phraseHits.length || vagueHits.length || rawRisk !== '低'){
    console.log(`\n# ${path.relative(process.cwd(), file)}`);
    if(phraseHits.length) console.log(`問題句型: ${phraseHits.join('；')}`);
    if(vagueHits.length) console.log(`模糊引用: ${vagueHits.join('、')}`);
    console.log(`raw enum 外露風險: ${rawRisk}`);
    console.log('建議修正方向: 減少反轉句、補上可查來源，無來源則改為編輯白話判讀。');
  }
}
