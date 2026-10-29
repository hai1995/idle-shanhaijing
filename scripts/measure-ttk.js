#!/usr/bin/env node
// TTK 分布测量：不只问「最难打的那只多久」，而是问「整条等级线上是否平坦」。
// 用法：node scripts/measure-ttk.js [--detail]
//
// 审计脚本只报「超过阈值的那几只」，挡不住另一种坏法：绝大多数怪都贴着上限，
// 表面没越线，实际整条线都在 30 秒上下——挂机节奏一样难受。
// 这里按等级分段给出中位数 / p90 / 最大值，并列出离群点。
//
// 口径与 audit-data.js 的战斗节奏一节完全一致：技能等级 = 怪的门槛、
// 同级良品兵器护甲、不强化、无御使无天赋（下限玩家）。
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
// 单一来源：从 index.html 解析脚本清单，取数据/引擎层（不含 ui）。
const { scriptOrder, deferredOrder } = require('./build-standalone');
// 延后的四章与派生表一并载入：只带南山的话二至五章的物产等级会塌成 1 级，TTK 全是假的
for (const f of scriptOrder().filter(f => !f.startsWith('ui/')).concat(deferredOrder())){
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const W = ctx.window;

W.resetToDefault();
const gb = W.GEAR_BASE;
const setLv = (s, v) => { if (W.Game.skills[s]) { W.Game.skills[s].level = v; W.Game.skills[s].xp = 0; } };

const rows = [];
for (const m of Object.values(W.Monsters)){
  if (m.unkillable || !(m.hp > 0)) continue;
  const L = m.needLvl || 1;
  ['yudi','bing','ming','she','zhu'].forEach(s => setLv(s, L));
  W.Game.gear.weapon = { id:'__m_t', slot:'weapon', dmg: Math.round(gb.melee(L)), lvl:L, grade:'fine' };
  W.Game.gear.armor  = { id:'__m_a', slot:'armor',  def: Math.max(1, Math.round(gb.armor(L))), lvl:L, grade:'fine' };
  W.Game.gear.charm = null; W.Game.gear.quiver = null;
  W.Game.enhance = {}; W.Game.buff = null;
  W.Game.combat = { monsterId:m.id, style:'attack', playerHp:1e9, monsterHp:m.hp, round:0 };
  const r = W.playerDamageRange();
  const dps = ((r.lo + r.hi) / 2) / W.playerAttackInterval();
  const ttk = m.hp / dps;
  const perHit = Math.max(1, m.atk - W.totalDefence() * 0.3);
  const takenDps = perHit / W.monsterInterval(m, { monsterHp: m.hp }) * (1 - (W.playerEvasion() + 0.05));
  rows.push({ name:m.name, boss:!!m.boss, L, ttk, survive: W.playerMaxHp() / takenDps });
}
W.Game.combat = null;

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const bands = [[1,20],[21,40],[41,60],[61,81]];
console.log('等级段   只数  BOSS  TTK中位  TTK-p90  TTK-max  存活/击杀 中位');
for (const [a, b] of bands){
  const seg = rows.filter(r => r.L >= a && r.L <= b);
  const norm = seg.filter(r => !r.boss).map(r => r.ttk);
  const ratio = seg.filter(r => !r.boss).map(r => r.survive / r.ttk);
  console.log(
    `${String(a).padStart(2)}-${String(b).padStart(2)}  ${String(seg.length).padStart(4)}  ` +
    `${String(seg.filter(r => r.boss).length).padStart(4)}  ` +
    `${pct(norm, 0.5).toFixed(1).padStart(7)}  ${pct(norm, 0.9).toFixed(1).padStart(7)}  ` +
    `${Math.max(...norm, 0).toFixed(1).padStart(7)}  ${pct(ratio, 0.5).toFixed(2).padStart(9)}`
  );
}

const slow = rows.filter(r => !r.boss && r.ttk > 32).sort((x, y) => y.ttk - x.ttk);
console.log(`\n小怪中 TTK > 32 秒的有 ${slow.length} 只（审计同一阈值）`);
if (process.argv.includes('--detail')){
  slow.slice(0, 15).forEach(r => console.log(`  ${r.name}（Lv${r.L}）${r.ttk.toFixed(1)} 秒`));
}
const weak = rows.filter(r => !r.boss && r.survive / r.ttk < 0.9).sort((x, y) => (x.survive / x.ttk) - (y.survive / y.ttk));
console.log(`小怪中「撑不到击杀」的有 ${weak.length} 只`);
if (process.argv.includes('--detail')){
  weak.slice(0, 10).forEach(r => console.log(`  ${r.name}（Lv${r.L}）撑到 ${(r.survive / r.ttk * 100).toFixed(0)}%`));
}
