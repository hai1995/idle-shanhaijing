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
// 单一来源：从 index.html 解析脚本清单（与单文件构建、测试共用同一解析器），
// 按规则派生本脚本需要的子集——审计只看数据/引擎层，不含 ui。
// 「抄一份就漏一份」的漂移在源头被消灭：新增文件只需改 index.html。
const { scriptOrder } = require('./build-standalone');
for (const f of scriptOrder().filter(f => !f.startsWith('ui/'))){
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

// ---------- 5.0 前世遗物：at 必须从 1 起连续，加成键必须在乘区里 ----------
// 遗物由 rebirth.count 现算（不写存档）。at 若跳号或重复，要么某转白转、要么一转发两件；
// bonus 的键若拼错（如 xps），加成永远不生效，而界面上还写着「经验 +2%」。
{
  const relics = W.RELICS || [];
  if (!relics.length) bad('遗物', 'RELICS 为空——轮回面板那条会整个消失');
  const KNOWN = new Set(['xp', 'yield', 'def', 'hp']);
  let n = 0;
  relics.forEach((r, i) => {
    n++;
    if (r.at !== i + 1) bad('遗物', `${r.name} 的 at=${r.at}，应为 ${i + 1}（须从 1 起连续）`);
    if (!r.name || !r.id) bad('遗物', `第 ${i + 1} 件缺 name / id`);
    for (const k of Object.keys(r.bonus || {})){
      if (!KNOWN.has(k)) bad('遗物', `${r.name} 的加成键「${k}」没有并入任何乘区（只会显示，不生效）`);
      else if (!(r.bonus[k] > 0)) bad('遗物', `${r.name} 的 ${k} 加成非正`);
    }
  });
  if (!n) bad('遗物', '一件遗物都没查到——检查本身失效');
}

// ---------- 5.1 三签：key 必须真的能计数 ----------
// bountyCounter 对 recorded / gathered / bosses 有专门映射，其余直接读 stats[key]。
// key 写错（如 casts 之于 crafts）不会报错，只是那条签永远停在 0——玩家会以为卡住了。
{
  const known = new Set(['recorded', 'gathered', 'bosses', ...Object.keys(W.Game.stats || {})]);
  let n = 0;
  for (const b of (W.BOUNTIES || [])){
    n++;
    if (!b.key) bad('三签', `${b.name} 没写 key，永远不计数`);
    else if (!known.has(b.key)) bad('三签', `${b.name} 的 key「${b.key}」不在 stats 里，签永远做不完`);
    let nn = 0, sh = 0;
    try { nn = b.n(1); sh = b.shells(1); } catch(e){ bad('三签', `${b.name} 的 n/shells 抛错：${e.message}`); continue; }
    if (!(nn > 0)) bad('三签', `${b.name} 一级的目标为 ${nn}，永远做不完`);
    if (!(sh > 0)) bad('三签', `${b.name} 一级的赏钱为 ${sh}，白做`);
  }
  if (n === 0) bad('三签', '一条签都没查到——检查本身失效');
}

// ---------- 5.2 物产产地：nodes[] 里每座山都要存在 ----------
// it.node 只记主产地，另有多产地写在 nodes[]。抄错一个 id 不会报错，
// 只是那座山永远采不出这件东西（采集提示「此地不产」）。
{
  let n = 0;
  for (const it of Object.values(I)){
    const ns = it.nodes || [];
    n += ns.length;
    for (const id of ns) if (!nodeIds.has(id)) bad('物产', `${it.name} 的产地 ${id} 不存在`);
    if (it.node && !nodeIds.has(it.node)) bad('物产', `${it.name} 的主产地 ${it.node} 不存在`);
  }
  if (!n) bad('物产', '一条 nodes[] 都没查到——检查本身失效');
}

// ---------- 5.3 配方溢价：产物价值 / 材料价值 ----------
// 加工增值是设计（鼓励制造），但溢价过大会变成刷钱循环：采料 → 制作 → 卖，
// 比直接卖料赚一个数量级，配合采集速度就能把经济冲垮。
// 目前最高是琅玕剑 16.5 倍（料 103 / 值 1700），阈值设在 25 留出余地。
{
  let n = 0;
  for (const r of W.Recipes){
    if (r.type === 'rite') continue;
    const out = I[r.out];
    if (!out || !out.value) continue;
    let cost = 0;
    for (const [id, q] of (r.cost || [])) cost += ((I[id] || {}).value || 0) * q;
    if (!cost) continue;
    n++;
    const ratio = out.value * (r.qty || 1) / cost;
    if (ratio > 25) bad('经济', `${out.name} 溢价 ${ratio.toFixed(1)} 倍（料 ${cost} / 值 ${out.value * (r.qty || 1)}）——可能成为刷钱循环`);
  }
  if (n < 50) bad('经济', `只查了 ${n} 条配方溢价——检查本身失效`);
}

// ---------- 5.4 墟市：在售之物必须存在、分类必须落地、单价不得低于价值 ----------
// 单价低于价值 = 「买一份再卖回」白赚，而且能循环。测试里也钉了一条，
// 但那段用的是运行时 sellValue；这里只用静态 value，改数据时能立刻发现。
{
  const catIds = new Set((W.SHOP_CATS || []).map(c => c.id));
  let n = 0;
  for (const s of (W.ShopStock || [])){
    n++;
    const it = I[s.itemId];
    if (!it) { bad('墟市', `在售 ${s.itemId} 不存在`); continue; }
    if (!(s.cost > 0) || !(s.qty > 0)) bad('墟市', `${it.name} 的价或量非正`);
    if (!catIds.has(s.cat)) bad('墟市', `${it.name} 的分类「${s.cat}」不在 SHOP_CATS 里（分类条上会整档消失）`);
    if (it.value && s.cost / s.qty < it.value)
      bad('墟市', `${it.name} 单价 ${(s.cost / s.qty).toFixed(1)} 低于价值 ${it.value}——买回再卖可白赚`);
    if (s.cat === 'herb' && it.buff && (it.buff.gather > 0 || it.buff.yield > 0))
      bad('墟市', `${it.name} 是采获/产量增幅品，不得上架（可折现 → 无限套利）`);
  }
  // 每个分类都要有货，否则分类条上会出现一个永远 0/N 的死档
  for (const c of (W.SHOP_CATS || [])){
    if (!(W.ShopStock || []).some(s => s.cat === c.id)) bad('墟市', `分类「${c.name}」一件在售都没有`);
    if (!c.desc) bad('墟市', `分类「${c.name}」没有说明文字`);
  }
  if (n < 20) bad('墟市', `在售之物只有 ${n} 样——检查本身可能失效`);
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
    // v1.31.23：一神可赐多物，逐件查（原先只查 gift 的第一件）
    const allGifts = (s.deities || []).flatMap(d => Array.isArray(d.gifts) ? d.gifts : (d.gift ? [d.gift] : []));
    allGifts.forEach(g => { if (!I[g]) bad('谒见', `${s.name} 的赐物不存在 ${g}`); });
  }
  // 中山诸神赐的是「本系祠礼要用的那件祭品」：谒见 → 得料 → 行祭，一条闭环。
  // 改礼单时若忘了同步赐物，这条会报——免得又变成两份互不相干的表。
  // 例外（v1.31.20）：泰逢/耕父/帝之二女赐专属护符（神赐异宝，不入礼单）。
  const DEITY_CHARM = { zs_taifeng:'zs_taifeng_huang', zs_gengfu:'zs_fengshan_light', zs_ernv:'zs_ernv_pei' };
  for (const [nodeId, s] of Object.entries(W.AUDIENCE_SITES || {})){
    if (String(nodeId).indexOf('zhongshan-') !== 0) continue;
    const regionId = nodeId.replace(/-\d+$/, '');
    const rite = W.Recipes.find(r => r.type === 'rite'
      && (W.RITES[r.out] || {}).regionId === regionId);
    if (!rite) continue;
    const cost = new Set((rite.cost || []).map(([id]) => id));
    const hit = (s.deities || []).some(d => d.gift && (cost.has(d.gift) || DEITY_CHARM[d.id] === d.gift));
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

// ---------- 6.3 里程碑：进度与判定必须是同一份数 ----------
// 每条成就都要有 prog()（返回 [已得, 目标]），check 由它派生。
// 缺了 prog 的，界面就无从显示「还差多少」；而 check 各写各的时候，
// 「南山舆图」曾把全部到访节点当成南山进度，逛别处也能点亮。
{
  const ms = W.Milestones || [];
  const noProg = ms.filter(m => typeof m.prog !== 'function').map(m => m.name);
  if (noProg.length) bad('成就', `没有 prog 的成就：${noProg.join('、')}——界面显示不了进度`);
  ms.forEach(m => {
    if (typeof m.prog !== 'function') return;
    let p;
    try { p = m.prog(); } catch(e){ bad('成就', `${m.name} 的 prog 抛错：${e.message}`); return; }
    if (!Array.isArray(p) || p.length !== 2 || !isFinite(p[0]) || !isFinite(p[1])){
      bad('成就', `${m.name} 的 prog 应返回 [已得, 目标]，实为 ${JSON.stringify(p)}`);
      return;
    }
    if (p[1] <= 0) bad('成就', `${m.name} 的目标为 0，永远点不亮`);
    if (typeof m.check !== 'function' || m.check() !== (p[0] >= p[1]))
      bad('成就', `${m.name} 的 check 与 prog 不一致（进度 ${p[0]}/${p[1]}）`);
  });
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
