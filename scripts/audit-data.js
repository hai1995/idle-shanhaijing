#!/usr/bin/env node
// 数据引用审计：跨表引用悬空 / 死链 / 征兆不可触发
// 用法：node scripts/audit-data.js        （有问题时退出码 1）
//
// 这些检查中的大部分已经写进 test/engine.test.js（第 29、30 节），此处保留为
// 面向人的报告工具：改完数据想快速看「有没有断链」时跑它，输出比断言更易读。
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
  classList:{ add(){}, remove(){}, toggle(){} },
  appendChild(){}, addEventListener(){}, querySelector:()=>null, querySelectorAll:()=>[],
});
const document = {
  getElementById: el, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ className:'', textContent:'', style:{}, remove(){}, classList:{ add(){}, remove(){} } }),
  addEventListener(){},
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
  'gameData.js','affix.js','engine.js','game.js','queue.js','interact.js','fx.js']){
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const W = ctx.window, I = W.Items;

const problems = [];
const bad = (cat, msg) => problems.push(`[${cat}] ${msg}`);

// ---------- 1. 配方：产物与材料必须存在；祠礼三表一致 ----------
W.Recipes.forEach((r, i) => {
  if (!I[r.out]) bad('配方', `#${i} ${r.type} 产物缺物品定义：${r.out}`);
  for (const [id] of r.cost || []) if (!I[id]) bad('配方', `#${i} 材料缺物品定义：${id}`);
  if (!W.RECIPE_SKILL[r.type]) bad('配方', `#${i} 类型 ${r.type} 未映射技能`);
});
for (const key of Object.keys(W.RITES)){
  if (!I[key]) bad('祠礼', `${key} 无祠器物品（行祭时会读 Items[id].name）`);
  if (!W.Recipes.some(r => r.type === 'rite' && r.out === key)) bad('祠礼', `${key} 无配方`);
  if (W.RITES[key].regionId && !W.WORLD.regions.some(r => r.regionId === W.RITES[key].regionId))
    bad('祠礼', `${key} 指向不存在的山系 ${W.RITES[key].regionId}`);
}

// ---------- 2. 作物必须有种子 ----------
const crops = Object.values(I).filter(it => it.type === 'crop');
for (const c of crops){
  if (!Object.values(I).some(s => s.crop === c.id)) bad('圃艺', `${c.name}(${c.id}) 无种子，永远种不出来`);
}

// ---------- 3. 消耗品可达性 ----------
const source = new Set();
Object.values(I).forEach(it => { if (it.node) source.add(it.id); if (it.crop) source.add(it.crop); });
Object.values(W.Monsters).forEach(m => {
  (m.loot || []).forEach(([id]) => source.add(id));
  if (m.drop) source.add(m.drop);
  if (m.riteDrop) source.add(m.riteDrop);
});
W.Recipes.forEach(r => source.add(r.out));
(W.ShopStock || []).forEach(s => source.add(s.itemId));
// 奖励字段有两种写法：养成点是 { id: 数量 }，观瑞/谒见是单个 id 字符串
const rewardIds = v => (typeof v.reward === 'string' ? [v.reward] : Object.keys(v.reward || {}));
Object.values(W.GROW_SITES || {}).forEach(v => {
  (v.cost || []).forEach(([id]) => source.add(id));
  rewardIds(v).forEach(id => source.add(id));
});
Object.values(W.OBSERVE_SITES || {}).forEach(v => rewardIds(v).forEach(id => source.add(id)));
Object.values(W.AUDIENCE_SITES || {}).forEach(v => {
  (v.deities || []).forEach(d => { if (d.gift) source.add(d.gift); });
});
const needs = new Set();
W.Recipes.forEach(r => (r.cost || []).forEach(([id]) => needs.add(id)));
Object.values(W.GROW_SITES || {}).forEach(v => (v.cost || []).forEach(([id]) => needs.add(id)));
for (const id of needs){
  if (!source.has(id)) bad('死链', `${(I[id] || {}).name || id} 被配方/养成消耗，却无任何获取途径`);
}

// ---------- 4. 征兆：每条都要有触发源 ----------
const omenSource = k => {
  if (Object.values(W.Monsters).some(m => m.omen === k)) return '异兽';
  if (k === 'fenghuang') return '观瑞';
  if (k === 'tianshen') return '谒见';
  return null;
};
for (const [k, o] of Object.entries(W.OMENS)){
  if (!omenSource(k)) bad('征兆', `${o.beast}（${o.type}）无触发源，永远收集不到`);
}

// ---------- 5. 怪物：点位、等级、掉落 ----------
const nodeIds = new Set();
W.WORLD.regions.forEach(r => r.nodes.forEach(n => nodeIds.add(n.id)));
for (const m of Object.values(W.Monsters)){
  if (m.nodeId && !nodeIds.has(m.nodeId)) bad('异兽', `${m.name} 所在节点不存在 ${m.nodeId}`);
  if (m.nodeId && m.regionId && !m.nodeId.startsWith(m.regionId)) bad('异兽', `${m.name} 山系与节点不一致`);
  for (const [id] of m.loot || []) if (!I[id]) bad('异兽', `${m.name} 掉落不存在 ${id}`);
  if (m.drop && !I[m.drop]) bad('异兽', `${m.name} 专属掉落不存在 ${m.drop}`);
}

// ---------- 6. 地点 ----------
for (const [name, map] of [['观象', W.OBSERVE_SITES], ['养成', W.GROW_SITES], ['谒见', W.AUDIENCE_SITES]]){
  for (const [k, v] of Object.entries(map || {})){
    if (v.nodeId && !nodeIds.has(v.nodeId)) bad('地点', `${name}.${k} 节点不存在 ${v.nodeId}`);
    (v.cost || []).forEach(([id]) => { if (!I[id]) bad('地点', `${name}.${k} 耗材不存在 ${id}`); });
    rewardIds(v).forEach(id => { if (!I[id]) bad('地点', `${name}.${k} 奖励不存在 ${id}`); });
    (v.deities || []).forEach(d => { if (d.gift && !I[d.gift]) bad('地点', `${name}.${k} 神赐不存在 ${d.gift}`); });
  }
}

// ---------- 输出 ----------
const stats = {
  山: W.WORLD.regions.reduce((a, r) => a + r.nodes.length, 0),
  山系: W.WORLD.regions.length, 物品: Object.keys(I).length,
  异兽: Object.keys(W.Monsters).length, 配方: W.Recipes.length, 征兆: Object.keys(W.OMENS).length,
  祠礼: Object.keys(W.RITES).length, 图鉴: Object.keys(W.CODEX).length,
};
// 装备品阶：每件都要标，且数值要落在所属品阶的容差带内。
// 系数与带子是 data 里 GEAR_GRADE / GEAR_BASE 的定义，这里只做核对——
// 新增装备忘了标品阶，或手调数值调到带外，都在这一步现形。
{
  const gears = Object.values(I).filter(it => it.equip);
  const grades = W.GEAR_GRADE || {};
  const noGrade = gears.filter(it => !it.grade);
  noGrade.forEach(it => bad('装备', `${it.name}（${it.id}）未标品阶`));
  gears.forEach(it => { if (it.grade && !grades[it.grade]) bad('装备', `${it.name} 的品阶「${it.grade}」不在表内`); });

  const outliers = [];
  gears.filter(it => W.gearKindOf(it)).forEach(it => {
    const g = grades[it.grade]; if (!g) return;
    const r = W.gearRatio(it);
    if (r < g.mult - g.tol || r > g.mult + g.tol)
      outliers.push(`${it.name} Lv${it.lvl} ${W.gearNum(it)}（${it.grade} 实测 ${r.toFixed(2)}，应 ${(g.mult-g.tol).toFixed(2)}~${(g.mult+g.tol).toFixed(2)}）`);
  });
  outliers.forEach(o => bad('装备', '数值越出所属品阶：' + o));

  const byGrade = {};
  gears.forEach(it => { byGrade[it.grade] = (byGrade[it.grade] || 0) + 1; });
  stats.装备 = gears.length;
  stats.品阶 = Object.entries(grades).map(([k, v]) => `${v.name}${byGrade[k] || 0}`).join('/');
}

console.log('数据规模：' + Object.entries(stats).map(([k, v]) => `${k} ${v}`).join(' · '));
if (!problems.length){
  console.log('\n✅ 未发现悬空引用或死链。');
  process.exit(0);
}
const byCat = {};
problems.forEach(p => { const c = p.slice(1, p.indexOf(']')); (byCat[c] = byCat[c] || []).push(p); });
console.log(`\n❌ 发现 ${problems.length} 处问题：`);
for (const [c, arr] of Object.entries(byCat)){
  console.log(`\n${c}（${arr.length}）`);
  arr.forEach(p => console.log('  ' + p));
}
process.exit(1);
