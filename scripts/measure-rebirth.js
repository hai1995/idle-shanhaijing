#!/usr/bin/env node
// 轮回曲线：每一转要练多少经验、修为涨多少、单位时间收益如何变化。
// 用法：node scripts/measure-rebirth.js
//
// 排行榜一旦上线，这张表就是榜单的斜率：修为是终身累计量，转数越多、乘区越大，
// 后来者在一轮里拿到的修为也越多。这里把「线性乘区」与「起手等级缩短轮次」
// 两件事叠在一起算清楚，免得只凭直觉调参。
//
// 口径：只算「一门技艺从起手练到 81」的经验（转生凭据只需一门），
// 不计御使/成就/藏书阁/征兆这些乘区——它们对所有转数一视同仁，不影响曲线形状。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
class LocalStorageStub {
  constructor(){ this.store = {}; }
  getItem(k){ return this.store[k] || null; }
  setItem(k, v){ this.store[k] = String(v); }
  removeItem(k){ delete this.store[k]; }
}
const el = () => ({
  textContent:'', innerHTML:'', value:'', checked:false, dataset:{}, style:{},
  classList:{ add(){}, remove(){}, toggle(){}, contains:()=>false },
  appendChild(){}, addEventListener(){}, querySelector:()=>null, querySelectorAll:()=>[],
});
const document = {
  getElementById: el, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ className:'', textContent:'', style:{}, remove(){}, classList:{ add(){}, remove(){} } }),
  addEventListener(){}, body:{ classList:{ add(){}, remove(){}, contains:()=>false } },
};
const UIstub = new Proxy({}, { get: () => () => {} });
const window = { location:{ href:'x' }, localStorage: new LocalStorageStub() };
const ctx = {
  window, document, localStorage: window.localStorage, console, Math, Date, JSON,
  setInterval:()=>0, setTimeout:()=>0, clearTimeout:()=>{}, clearInterval:()=>{},
  getComputedStyle: ()=>({}), UI: UIstub,
};
ctx.window.UI = UIstub;
vm.createContext(ctx);
for (const f of ['nanshanData.js','xishanData.js','beishanData.js','dongshanData.js','zhongshanData.js',
  'gameData.js','affix.js','engine.js','game.js','queue.js','interact.js','events.js','fx.js']){
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const W = ctx.window;
const R = W.TUNING.REBIRTH;
const top = W.xpForLevel(R.MIN_LEVEL);

console.log(`一门技艺练到 ${R.MIN_LEVEL} 级累计经验：${top.toLocaleString()}`);
console.log(`乘区：每转 +${Math.round(R.XP * 100)}% 经验　起手：每转 +${R.START_PER} 级（封顶 ${R.START_CAP}）\n`);
console.log('转数  起手  本轮所需经验   乘区   相对时长   本轮修为   单位时间修为');
let prev = null;
for (let n = 0; n <= 7; n++){
  const start = Math.min(R.START_CAP, n * R.START_PER);
  const need = Math.max(1, top - W.xpForLevel(Math.max(1, start)));
  const rate = 1 + n * R.XP;
  const hours = need / rate;             // 与「每小时基础经验」成正比，故只做相对值
  const xpGain = need * rate;            // 修为按乘区后的经验累计
  const perHour = xpGain / hours;        // = rate²
  if (!prev) prev = hours;
  console.log(
    `${String(n).padStart(3)}  ${String(start).padStart(4)}  ${String(need).padStart(13)}  ` +
    `×${rate.toFixed(2).padStart(5)}  ${(hours / prev * 100).toFixed(0).padStart(7)}%  ` +
    `${String(Math.round(xpGain)).padStart(10)}  ${String(Math.round(perHour)).padStart(12)}`
  );
}
console.log('\n注：单位时间修为 = 乘区²，随转数二次增长；相对时长以首轮为 100%。');
