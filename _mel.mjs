import { getToken, gscQuery } from './scripts/lib/insight-fetch.mjs';
if (!(process.env.PATH||'').split(':').includes('/snap/bin')) process.env.PATH=`/snap/bin:${process.env.PATH||''}`;
const token=await getToken();
const pad=d=>d.toISOString().slice(0,10);
const end=new Date(); end.setDate(end.getDate()-3);
const start=new Date(end); start.setDate(start.getDate()-27);
const rows=await gscQuery(token,{dimensions:['page','query'],startDate:pad(start),endDate:pad(end),rowLimit:5000});
// 褪黑激素叢集的所有查詢
const mel=rows.filter(r=>/melatonin/.test(r.page)).sort((a,b)=>b.impressions-a.impressions);
console.log('— 褪黑激素叢集的查詢（看它到底在贏什麼）—');
mel.slice(0,22).forEach(r=>console.log(`  c${String(r.clicks).padStart(3)} i${String(r.impressions).padStart(4)} p${r.position.toFixed(1).padStart(5)}  ${r.query}`));
// 同模子的另一篇
console.log('\n— nmn-taiwan-legal-buy 的查詢 —');
rows.filter(r=>/nmn-taiwan/.test(r.page)).sort((a,b)=>b.impressions-a.impressions).slice(0,10)
  .forEach(r=>console.log(`  c${String(r.clicks).padStart(3)} i${String(r.impressions).padStart(4)} p${r.position.toFixed(1).padStart(5)}  ${r.query}`));
// 全站帶「法規/合法/帶回/代購/處方/食藥署/海關」意圖的查詢
console.log('\n— 全站「台灣法規×具體行為」意圖的查詢（不分頁面）—');
const RE=/合法|違法|法規|帶回|入境|海關|代購|網購|處方|食藥署|可以買|哪裡買|報關|自用/;
const agg=new Map();
for(const r of rows){ if(!RE.test(r.query)) continue;
  const v=agg.get(r.query)||{c:0,i:0,p:0}; v.c+=r.clicks; v.i+=r.impressions; v.p=r.position; agg.set(r.query,v); }
[...agg.entries()].sort((a,b)=>b[1].i-a[1].i).slice(0,25)
  .forEach(([q,v])=>console.log(`  c${String(v.c).padStart(3)} i${String(v.i).padStart(4)} p${v.p.toFixed(1).padStart(5)}  ${q}`));
