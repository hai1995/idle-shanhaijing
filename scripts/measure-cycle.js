#!/usr/bin/env node
// 卷二（二周目难度带）TTK 测量：把「九九满装」放进带里，看四段带内是否仍然平坦。
// 用法：node scripts/measure-cycle.js [--cycle N]
//
// 口径：技能全 81、兵器护甲取 81 级可用的最强一件（不强化、无御使、无词条），
// 这正是「本卷练满、刚进卷二」的玩家下限；每多一轮按 TUNING.CYCLE.SOFT 叠三维。
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');

class LS { constructor(){ this.s = {}; } getItem(k){ return this.s[k] || null; } setItem(k,v){ this.s[k] = String(v); } removeItem(k){ delete this.s[k]; } }
const el = () => ({ textContent:'', innerHTML:'', value:'', checked:false, dataset:{}, style:{},
  classList:{ add(){}, remove(){}, toggle(){}, contains:()=>false }, appendChild(){}, addEventListener(){},
  querySelector:()=>null, querySelectorAll:()=>[] });
const document = { getElementById: el, querySelector:()=>null, querySelectorAll:()=>[],
  createElement:()=>({ className:'', textContent:'', style:{}, remove(){}, classList:{ add(){}, remove(){} } }),
  addEventListener(){}, body:{ classList:{ add(){}, remove(){}, contains:()=>false } } };
const UIstub = new Proxy({}, { get: () => () => {} });
const window = { location:{ href:'x' }, localStorage:new LS() };
const ctx = { window, document, localStorage:window.localStorage, console, Math, Date, JSON,
  setInterval:()=>0, setTimeout:()=>0, clearTimeout:()=>{}, clearInterval:()=>{}, getComputedStyle:()=>({}), UI:UIstub };
ctx.window.UI = UIstub; vm.createContext(ctx);
// 清单从 index.html 派生（同步 + 延后两份），不另抄：抄一份就漏一份。
// 延后的四章与派生表在这里必须一并载入——测的是「数据齐备之后」的平衡，
// 少了它们，二至五章的物产等级会塌成 1 级，TTK 全是假的。
const BS = require('./build-standalone.js');
const ENGINE_FILES = BS.scriptOrder().filter(f => f.indexOf('ui/') !== 0);
for (const f of ENGINE_FILES.concat(BS.deferredOrder()))
  vm.runInContext(fs.readFileSync(path.join(root,'src',f),'utf8'), ctx, { filename:f });
const W = ctx.window;
const argCycle = (() => { const i = process.argv.indexOf('--cycle'); return i>0 ? +process.argv[i+1] : 0; })();

W.resetToDefault();
for (const s of W.ALL_SKILL_IDS) W.Game.skills[s] = { level: 81, xp: 0 };
// 九九能拿到的最强一件（不含神兵：神兵要打 BOSS，不保证人人都有）
const pick = (kind) => {
  let best = null;
  for (const it of Object.values(W.Items)){
    if (!it.equip || it.divine) continue;
    if (W.gearKindOf(it) !== kind) continue;
    if ((it.lvl||1) > 81) continue;
    if (!best || W.gearNum(it) > W.gearNum(best)) best = it;
  }
  return best;
};
const wpn = pick('melee'), arm = pick('armor');
const cycles = argCycle ? [argCycle] : [2,3,4,5];
const mDpsOf = (m) => Math.max(1, m.atk - W.totalDefence()*0.3) * 0.6 / Math.max(1, W.monsterInterval(m, null));

console.log(`满装口径：${wpn.name}(dmg ${wpn.dmg}) · ${arm.name}(def ${arm.def}) · 不强化无御使`);
console.log('卷次  只数  TTK中位  p90    max   存活/击杀  经验中位  样本');
for (const cyc of cycles){
  W.Game.rebirth = { count: cyc - 1, at: 0, startedAt: 0, history: [] };
  W.Game.gear.weapon = wpn; W.Game.gear.armor = arm; W.Game.gear.charm = null; W.Game.gear.quiver = null;
  W.Game.enhance = {}; W.Game.buff = null;
  const dps = W.playerDpsEstimate(), hp = W.playerMaxHp();
  const rows = [];
  for (const base of Object.values(W.Monsters)){
    if (base.boss || base.unkillable || !(base.hp > 0)) continue;
    const m = W.foeOf(base);
    if (!m.band) continue;
    const ttk = m.hp / dps;
    const survive = hp / Math.max(1, mDpsOf(m));
    rows.push({ ttk, survive: survive / ttk, xp: m.xp, name: m.name, bandLv: m.bandLv });
  }
  rows.sort((a,b)=>a.ttk-b.ttk);
  if (process.argv.includes('--detail')){
    const top = rows.slice(-5).reverse();
    console.log('  最慢五只（' + cyc + '周目）：' + top.map(r => `${r.name} Lv${r.bandLv} ${r.ttk.toFixed(1)}s`).join(' · '));
  }
  const q = p => rows[Math.min(rows.length-1, Math.floor(rows.length*p))].ttk;
  const med = a => { const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
  console.log(`${cyc}周目 ${String(rows.length).padStart(5)}  ${q(.5).toFixed(1).padStart(6)}  ${q(.9).toFixed(1).padStart(5)}  ${rows[rows.length-1].ttk.toFixed(1).padStart(5)}   ${med(rows.map(r=>r.survive)).toFixed(2).padStart(6)}     ${Math.round(med(rows.map(r=>r.xp)))}`);
}
