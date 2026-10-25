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

// ---------- 6.1 异迹：图鉴可查、索引不漏 ----------
// 观象 / 谒见 / 灌木是「一次性地点」，散在四百多座山里。三类并成一张表时
// 漏掉一类，那几处就再也找不到；谒见的神祇若不在图鉴里，录了也看不见。
{
  const codexIds = new Set(Object.keys(W.CODEX || {}));
  for (const [nodeId, s] of Object.entries(W.AUDIENCE_SITES || {})){
    for (const d of s.deities || []){
      if (!codexIds.has(d.id))
        bad('异迹', `${s.name} 的神祇 ${d.name}（${d.id}）不在图鉴——谒见入了录，图鉴里却查不到`);
    }
  }
  const total = Object.keys(W.OBSERVE_SITES || {}).length
    + Object.keys(W.AUDIENCE_SITES || {}).length
    + Object.keys(W.GROW_SITES || {}).length;
  const listed = (typeof W.heteroSites === 'function') ? W.heteroSites().length : -1;
  if (listed !== total)
    bad('异迹', `异迹索引列出 ${listed} 处，三表合计 ${total} 处——有同类没接进索引`);
  // 谒见必须有回报：二十处里若有整处一件赐物都不给，那一趟只剩一条图鉴，
  // 而它偏偏是七十级往后唯一的动作（中山诸神不可讨伐）。
  for (const [nodeId, s] of Object.entries(W.AUDIENCE_SITES || {})){
    const gifts = (s.deities || []).map(d => d.gift).filter(Boolean);
    if (!gifts.length) bad('谒见', `${s.name}（${nodeId}）诸神皆无初谒之赐——谒见一趟只得一条图鉴`);
    gifts.forEach(g => { if (!I[g]) bad('谒见', `${s.name} 的赐物不存在 ${g}`); });
  }
  // 中山诸神赐的是「本系祠礼要用的那件祭品」：谒见 → 得料 → 行祭，一条闭环。
  // 改礼单时若忘了同步赐物，这条会报——免得又变成两份互不相干的表。
  for (const [nodeId, s] of Object.entries(W.AUDIENCE_SITES || {})){
    if (String(nodeId).indexOf('zhongshan-') !== 0) continue;
    const regionId = nodeId.replace(/-\d+$/, '');
    const rite = W.Recipes.find(r => r.type === 'rite'
      && (W.RITES[r.out] || {}).regionId === regionId);
    if (!rite) continue;
    const cost = new Set((rite.cost || []).map(([id]) => id));
    const hit = (s.deities || []).some(d => d.gift && cost.has(d.gift));
    if (!hit)
      bad('谒见', `${s.name} 的赐物（${(s.deities || []).map(d => d.gift || '无').join('/')}）都不在本系祠礼（${rite.out}）之内——谒见与行祭接不上`);
  }
  (typeof W.heteroSites === 'function' ? W.heteroSites() : []).forEach(x => {
    if (!x.gain) bad('异迹', `${x.kind} ${x.name} 没写收益，索引那一格会是空白`);
    if (!x.regionId) bad('异迹', `${x.kind} ${x.name} 找不到所属山系（${x.nodeId}）`);
    if (!x.nodeName) bad('异迹', `${x.kind} ${x.name} 对应的山不存在（${x.nodeId}）`);
  });
}

// ---------- 6.1b 六凶名单 ----------
// 名单是单一出处：统计页分母、成就判定、征伐页分组都读它。
{
  const six = W.SIX_BEASTS || [];
  if (six.length !== 6) bad('六凶', `名单有 ${six.length} 项，应为六`);
  six.forEach(id => {
    const m = W.Monsters[id];
    if (!m) bad('六凶', `名单里的 ${id} 不存在`);
    else if (!m.boss) bad('六凶', `名单里的 ${m.name} 不是 BOSS`);
  });
  if (new Set(six).size !== six.length) bad('六凶', '名单有重复项');
  // 名单之外是否还有 BOSS 不必报——「凶神」一行按 BOSS 总数现算，添多少都跟得上。
  // 这里只守一件事：六凶这六个名字必须是真 BOSS，否则成就会永远点不亮。
}

// ---------- 6.2 成就的达成口径要与文字一致 ----------
// 「谒见西山全部 14 位神祇」里的 14 若写死，日后添一位神祇就变成「谒见十一位也算圆满」。
{
  const xs = [];
  for (const site of Object.values(W.AUDIENCE_SITES || {})){
    if (String(site.nodeId).indexOf('xishan-') !== 0) continue;
    for (const d of (site.deities || [])) xs.push(d.id);
  }
  const ms = (W.Milestones || []).find(m => m.id === 'xs_deity');
  if (!ms) bad('成就', '西山百神里程碑不见了');
  else {
    const said = /(\d+)\s*位/.exec(ms.desc || '');
    if (!said) bad('成就', '西山百神的说明里没有写位数');
    else if (parseInt(said[1], 10) !== xs.length)
      bad('成就', `西山百神写「${said[1]} 位」，实有 ${xs.length} 位`);
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

// 物产等级 vs 产地解锁等级：到了那座山却采不了，这座山的产出就是空的。
{
  const nl = {};
  W.WORLD.regions.forEach(r => r.nodes.forEach(n => { nl[n.id] = n.unlockLevel; }));
  Object.values(I).forEach(it => {
    if (!it.skill || !it.node || it.lvl == null) return;
    const l = nl[it.node];
    if (l == null) return;
    if (it.lvl > l + 2) bad('物产', `${it.name} 需 ${it.lvl} 级，产地 ${it.node} 却只 Lv${l}（到了也采不了）`);
  });
}

// 配方材料可达性：配方等级够了，材料却要更晚才拿得到，等于这条配方是摆设。
{
  const cropIds = new Set(Object.values(I).filter(i => i.crop).map(i => i.id));
  const earliest = (id) => {
    const it = I[id]; if (!it) return 999;
    let best = Infinity;
    if (it.skill && it.lvl) best = Math.min(best, it.lvl);
    W.Recipes.forEach(r => { if (r.out === id) best = Math.min(best, r.lvl || 1); });
    Object.values(W.Monsters).forEach(m => {
      const loot = (Array.isArray(m.loot) && m.loot.length) ? m.loot : (m.drop ? [[m.drop,1,1]] : []);
      if (loot.some(x => x[0] === id)) best = Math.min(best, m.needLvl || 1);
    });
    (W.ShopStock || []).forEach(x => { if (x.itemId === id) best = Math.min(best, x.lvl || 1); });
    return best;
  };
  W.Recipes.forEach(r => {
    if (r.type === 'rite') return;
    r.cost.forEach(([m]) => {
      if (cropIds.has(m)) return;
      const e = earliest(m);
      if (e !== Infinity && e > (r.lvl || 1) + 8)
        bad('配方', `${(I[r.out]||{}).name || r.out}（Lv${r.lvl}）需 ${(I[m]||{}).name || m}（Lv${e}）——晚太多`);
    });
  });
}

// ---------- 祠礼：祭品要在山系解锁时就能拿到 ----------
// 祠礼是区域产出的主要加成，礼器配方与祭品若比山系门槛晚太多，
// 那套礼在解锁时根本行不了，等于挂了个空壳。前面「配方材料可达性」一节
// 跳过了 rite 类型（它的门槛不是配方等级而是山系等级），这里单独补上。
{
  const earliest = (id) => {
    const it = I[id]; if (!it) return Infinity;
    let best = Infinity;
    if (it.skill && it.lvl) best = Math.min(best, it.lvl);
    W.Recipes.forEach(r => { if (r.out === id) best = Math.min(best, r.lvl || 1); });
    Object.values(W.Monsters).forEach(m => {
      const loot = (Array.isArray(m.loot) && m.loot.length) ? m.loot : (m.drop ? [[m.drop, 1, 1]] : []);
      if (loot.some(x => x[0] === id)) best = Math.min(best, m.needLvl || 1);
    });
    (W.ShopStock || []).forEach(x => { if (x.itemId === id) best = Math.min(best, x.lvl || 1); });
    // 作物：种子的圃艺等级即它的门槛（稌米、白菅这类只走「种」这一条线）
    Object.values(I).forEach(x => { if (x.crop === id) best = Math.min(best, x.lvl || 1); });
    return best;
  };
  // ⚠️ RITES 里没有 cost —— 祭品在 Recipes（type:'rite'）里。
  // 早先这段直接读 r.cost，遍历的是空数组，整段检查一直在空转。
  // 判据取「礼器配方等级」而不是「山系门槛」：能不能行祭，取决于能不能做出礼器。
  for (const key of Object.keys(W.RITES)){
    const r = W.RITES[key];
    const region = W.WORLD.regions.find(x => x.regionId === r.regionId);
    const gate = region ? region.unlockLevel : 1;
    const rec = W.Recipes.find(x => x.type === 'rite' && x.out === key);
    if (!rec) continue;
    // ① 礼器配方不得比山系门槛晚太多，否则那套礼解锁时纯属摆设
    if ((rec.lvl || 1) > gate + 10)
      bad('祠礼', `${key}（${r.regionId} 门槛 ${gate}）礼器配方 Lv${rec.lvl}——解锁时无礼可祭，差 ${rec.lvl - gate} 级`);
    // ② 祭品必须在能制作该礼器的等级内拿得到
    (rec.cost || []).forEach(([mat]) => {
      const e = earliest(mat);
      if (e !== Infinity && e > (rec.lvl || 1) + 8)
        bad('祠礼', `${key}（礼器 Lv${rec.lvl}）需 ${(I[mat]||{}).name || mat}（最早 ${e} 级才拿得到）`);
    });
  }
  // 营造：材料不得晚于营邑门槛太多，否则那座建筑在解锁时纯属摆设
  Object.values(W.BUILDINGS || {}).forEach(b => {
    (b.cost || []).forEach(([mat]) => {
      const e = earliest(mat);
      if (e !== Infinity && e > b.lvl + 6)
        bad('营造', `${b.name}（营邑 ${b.lvl}）需 ${(I[mat]||{}).name || mat}（最早 ${e} 级才拿得到）`);
    });
  });
}

// ---------- 战斗节奏：怪血 / 怪攻的成长是否与玩家同阶 ----------
// 这是最容易悄悄坏掉的一处：调完怪的数值，界面照样能跑，测试也不报错，
// 但同级怪要砍一分钟、玩家十秒就倒，复讨只是无限重来——玩家会觉得「打不动」。
// 这里取「技能等级 = 解锁等级、同级良品兵器护甲、不强化、无御使无天赋」的下限玩家，
// 逐只估算单杀时长（TTK）与能撑多久（survive），越线的都列出来。
{
  if (typeof W.resetToDefault === 'function') W.resetToDefault();
  const gb = W.GEAR_BASE;
  const setLv = (s, v) => { if (W.Game.skills[s]) { W.Game.skills[s].level = v; W.Game.skills[s].xp = 0; } };
  const rows = [];
  for (const m of Object.values(W.Monsters)){
    if (m.unkillable || !(m.hp > 0)) continue;
    const L = m.needLvl || 1;
    ['yudi','bing','ming','she','zhu'].forEach(s => setLv(s, L));
    W.Game.gear.weapon = { id:'__audit_w', slot:'weapon', dmg: Math.round(gb.melee(L)), lvl:L, grade:'fine' };
    W.Game.gear.armor  = { id:'__audit_a', slot:'armor',  def: Math.max(1, Math.round(gb.armor(L))), lvl:L, grade:'fine' };
    W.Game.gear.charm  = null; W.Game.gear.quiver = null;
    W.Game.enhance = {}; W.Game.buff = null;
    W.Game.combat = { monsterId:m.id, style:'attack', playerHp:1e9, monsterHp:m.hp, round:0 };
    const r = W.playerDamageRange();
    const dps = ((r.lo + r.hi) / 2) / W.playerAttackInterval();
    const ttk = m.hp / dps;
    const perHit = Math.max(1, m.atk - W.totalDefence() * 0.3);
    const takenDps = perHit / W.monsterInterval(m, { monsterHp: m.hp }) * (1 - (W.playerEvasion() + 0.05));
    rows.push({ m, L, ttk, ratio: W.playerMaxHp() / takenDps / ttk });
  }
  W.Game.combat = null;
  for (const r of rows){
    const nm = `${r.m.boss ? 'BOSS ' : ''}${r.m.name}（Lv${r.L}）`;
    if (r.m.boss){
      if (r.ttk > 70) bad('节奏', `${nm}单杀需 ${r.ttk.toFixed(0)} 秒——超过 70 秒，挂机一场太拖`);
      if (r.ratio < 0.30) bad('节奏', `${nm}只能撑到击杀时长的 ${(r.ratio*100).toFixed(0)}%，无食物必败`);
    } else {
      if (r.ttk > 32) bad('节奏', `${nm}单杀需 ${r.ttk.toFixed(0)} 秒——超过 32 秒的挂机节奏`);
      if (r.ratio < 0.90) bad('节奏', `${nm}只能撑到击杀时长的 ${(r.ratio*100).toFixed(0)}%，常常打不完就倒`);
    }
  }
  stats['节奏扫描'] = rows.length;
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
