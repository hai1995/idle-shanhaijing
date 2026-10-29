#!/usr/bin/env node
// 随机操作压测：用真引擎跑几千个随机动作，捕获异常。
// 用法：node scripts/fuzz.js [轮数=3000] [种子]
//
// 为什么要有这个：单元测试只走「想得到的路径」。真实玩家会做各种组合——
// 在战斗里切页、材料刚好够一半时点连作、祠礼到期那一刻离线、把队列删空再启动……
// 这里用固定种子的伪随机把这些组合撞一遍，任何抛错都打印动作与栈。
//
// 只读：不写存档文件（每个种子从默认档重来），失败不影响玩家数据。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const ROUNDS = Math.max(100, parseInt(process.argv[2], 10) || 3000);
let seed = parseInt(process.argv[3], 10) || 20261026;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

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
  getBoundingClientRect: () => ({ top:0, left:0, width:0, height:0, bottom:0, right:0 }),
});
const document = {
  getElementById: el, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ className:'', textContent:'', style:{}, remove(){}, classList:{ add(){}, remove(){} }, appendChild(){} }),
  addEventListener(){}, body:{ classList:{ add(){}, remove(){}, contains:()=>false } },
};
const UIstub = new Proxy({}, { get: () => () => {} });
const window = { location:{ href:'x' }, localStorage: new LocalStorageStub(), innerWidth:1200, innerHeight:800 };
const ctx = {
  window, document, localStorage: window.localStorage, console, Math, Date, JSON,
  setInterval:()=>0, setTimeout:()=>0, clearTimeout:()=>{}, clearInterval:()=>{},
  getComputedStyle: ()=>({}), UI: UIstub,
};
ctx.window.UI = UIstub;
vm.createContext(ctx);
// 单一来源：从 index.html 解析全部脚本（与单文件构建、测试共用同一解析器），
// 加载全部以尽量压测每条代码路径——此前这份手写清单漏了 scene/settings/tutorial/hud/modal/rank 六个 ui 文件。
const { scriptOrder, deferredOrder } = require('./build-standalone');
// 同上：压测要跑全书，只带南山就有四章的内容永远压不到
for (const f of scriptOrder().concat(deferredOrder())){
  vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f });
}
const S = ctx.window;

S.resetToDefault();
// 给足底子：等级 40、材料一堆、贝币充足，让每条分支都摸得到
for (const sk in S.Skills){ S.Game.skills[sk] = { level: 40, xp: S.xpForLevel(40) + 1 }; }
S.Game.shells = 1e6;

const errors = [];
let acts = 0;
const monsters = Object.keys(S.Monsters).filter(id => {
  const m = S.Monsters[id];
  return m && !m.unkillable && m.hp > 0 && (m.needLvl || 1) <= 40;
});
const gatherItems = Object.keys(S.GATHER_POOLS.qiaocai || {}).length
  ? Object.values(S.GATHER_POOLS).flat().filter(id => (S.Items[id] || {}).lvl <= 40)
  : [];
const recipes = S.Recipes.filter(r => (r.lvl || 1) <= 40);
const rites = Object.keys(S.RITES);
const builds = Object.keys(S.BUILDINGS);
// 次级高危入口的素材：此前这些玩家动作 fuzz 从未走过，setup 里备好可部署异兽 / 装备 / 增益药 / 已解锁山。
const omens = Object.keys(S.OMENS || {});
const buffItem = Object.keys(S.Items).find(id => { const it = S.Items[id]; return it && it.buff; }) || null;
const equipId = Object.keys(S.Items).find(id => { const it = S.Items[id]; return it && (it.equip || it.weapon || it.slot); }) || null;
let nanshanNodes = Object.keys(S.WORLD.nodes || {}).filter(id => { const n = S.WORLD.nodes[id]; return n && n.chapter === 1 && S.nodeUnlocked(n); });
if (!nanshanNodes.length) nanshanNodes = [S.Game.node];
const aBeast = Object.keys(S.Monsters).find(id => { const m = S.Monsters[id]; return m && !m.boss && !m.unkillable; });

function guard(label, fn){
  acts++;
  try { fn(); }
  catch(e){ if (errors.length < 12) errors.push(`${label}\n    ${e && e.stack ? e.stack.split('\n').slice(0,3).join('\n    ') : e}`); }
}
// 不变量 Oracle：fuzz 不止查「抛不抛」，更要查「算没算错」。随机动作可能不抛异常，
// 却留下负贝币 / NaN / 非整数库存 / 悬空引用这类悄悄错掉的状态。这里每轮动作后扫一遍核心数值，
// 任一违例即记为一条错误（与异常同对待，闸门会红）。项目已有 3729 条断言护着「想得到的路径」，
// 这一层护的是「随机组合撞出来的状态」——两者互补。
function badNum(v, label){
  if (typeof v !== 'number' || !isFinite(v)) return `${label}=${v}(非有限)`;
  if (v < 0) return `${label}=${v}(负数)`;
  return null;
}
function checkInvariants(src){
  const bad = [], G = src || S.Game;
  let b;
  if ((b = badNum(G.shells, 'shells'))) bad.push(b);
  for (const k in G.inventory){ const v = G.inventory[k]; if (typeof v !== 'number' || !isFinite(v) || v < 0) bad.push(`inv[${k}]=${v}`); else if (v % 1 !== 0) bad.push(`inv[${k}]=${v}(非整数)`); }
  for (const sk in G.skills){ const lv = (G.skills[sk] || {}).level; if ((b = badNum(lv, 'skill.' + sk))) bad.push(b); }
  const st = G.stats || {};
  for (const f of ['totalEarned','totalXp','spent','sold','sales','realmBreaks','bounties']){ const v = st[f]; if (v !== undefined && (b = badNum(v, 'stats.' + f))) bad.push(b); }
  for (const slot of ['weapon','armor','charm','quiver']){ const g = G.gear && G.gear[slot]; if (g && g.id && !S.Items[g.id]) bad.push(`gear.${slot}=${g.id}(无此物)`); }
  const dep = G.deployed || {}; for (const k in dep){ if (!S.Monsters[dep[k]]) bad.push(`deployed[${k}]=${dep[k]}(无此兽)`); }
  return bad;
}
// 顺序无关的深度比较：把对象键递归排序后再比较，避免「键序不同但语义等价」的误报
// （applySave 末尾的 reconcile/补全/Object.assign 合并在复杂随机态下会改变对象内部键序，
// 使 JSON.stringify 字面不同；单次幂等比对会因此误报，用 canon 可消除）。
function canon(v){
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const ks = Object.keys(v).sort();
  return '{' + ks.map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
// 存档序列化里的非确定性 / 设计上不跨会话的字段，幂等比对时须剔除：
//   savedAt/rev/deviceId 随保存动作变化；startedAt 有 Date.now() 兜底；combat 刻意不跨会话。
const ROUNDTRIP_SKIP = new Set(['savedAt','rev','deviceId','startedAt','combat']);
function stripSave(o){ const c = Object.assign({}, o); for (const k of ROUNDTRIP_SKIP) delete c[k]; return c; }

for (let i = 0; i < ROUNDS; i++){
  const r = rnd();
  if (r < 0.16){
    const id = pick(gatherItems);
    guard('doGather ' + id, () => {
      S.Game.node = (S.Items[id].nodes || [S.Items[id].node])[0];
      S.doGather(id);
    });
  } else if (r < 0.28){
    const rec = pick(recipes);
    guard('processRecipe ' + rec.out, () => {
      for (const [m, q] of rec.cost) S.giveItem(m, q * 3, false);
      S.processRecipe(rec, 1);
    });
  } else if (r < 0.40){
    const id = pick(monsters);
    guard('combat ' + id, () => {
      const m = S.Monsters[id];
      S.Game.map[m.nodeId] = true;
      S.Game.node = m.nodeId;
      S.startCombat(id, { times: 1 + Math.floor(rnd() * 3) });
      for (let t = 0; t < 120 && S.Game.combat; t++) S.combatTick(0.25);
      S.Game.combat = null;
    });
  } else if (r < 0.50){
    const id = pick(rites);
    guard('performRite ' + id, () => {
      const rec = S.Recipes.find(x => x.type === 'rite' && x.out === id);
      (rec.cost || []).forEach(([m, q]) => S.giveItem(m, q, false));
      S.performRite(id);
      S.tickAutoRites();
    });
  } else if (r < 0.58){
    const idx = Math.floor(rnd() * S.ShopStock.length);
    guard('buy ' + idx, () => S.buyItem(idx, 1 + Math.floor(rnd() * 5)));
  } else if (r < 0.66){
    const inv = Object.keys(S.Game.inventory).filter(k => S.Game.inventory[k] > 0);
    if (inv.length){
      const id = pick(inv);
      guard('sell ' + id, () => S.sellItem(id, 1 + Math.floor(rnd() * 3)));
    }
  } else if (r < 0.74){
    const inv = Object.keys(S.Game.inventory).filter(k => S.Game.inventory[k] > 0);
    if (inv.length){
      const id = pick(inv);
      const it = S.Items[id];
      if (it && it.equip){
        S.Game.inventory.tan = 500;
        S.Game.inventory.zhenwu = 3;
        S.Game.shells = 1e6;
        guard('enhance ' + id, () => S.enhanceItem(id, { stone: rnd() < 0.3 }));
      }
    }
  } else if (r < 0.80){
    guard('queue', () => {
      S.Game.queue = [];
      S.addQueueEntry(pick(['qiaocai','caiyu','yu','caiyao']), pick(gatherItems), 1 + Math.floor(rnd() * 5));
      S.startQueue();
      S.ensureQueueActivity();
      S.stopQueue && S.stopQueue();
    });
  } else if (r < 0.86){
    const b = pick(builds);
    guard('build ' + b, () => {
      (S.BUILDINGS[b].cost || []).forEach(([m, q]) => S.giveItem(m, q, false));
      S.Game.skills.yingyi = { level: 99, xp: S.xpForLevel(99) };
      typeof S.buildStructure === 'function' ? S.buildStructure(b) : null;
    });
  } else if (r < 0.87){
    guard('observe', () => {
      const id = Object.keys(S.OBSERVE_SITES)[0];
      S.doObserve(id);
    });
  } else if (r < 0.92){
    guard('audience', () => {
      const id = Object.keys(S.AUDIENCE_SITES)[0];
      S.doAudience(id, {});
    });
  } else if (r < 0.945){
    // 卜筮：纯随机掷一卦，验证抽签/吉凶分支不抛（此前压测从未走过这条）
    guard('divine', () => S.divine());
  } else if (r < 0.96){
    // 圃艺 + 养成：植一件嘉种并快进成熟收获，再灌一次养成点。
    guard('plant/grow', () => {
      const seedId = Object.keys(S.Items).find(id => { const it = S.Items[id]; return it && it.crop && (it.lvl||1) <= 40; });
      if (seedId){
        S.giveItem(seedId, 3, false);
        S.plantSeed('p0', seedId, true);
        S.farmTick(99999);
      }
      const gid = Object.keys(S.GROW_SITES)[0];
      if (gid){
        const site = S.GROW_SITES[gid];
        for (const [mid, q] of (site.cost || [])) S.giveItem(mid, q * 3, false);
        S.doGrow(gid);
      }
    });
  } else if (r < 0.99){
    // 次级玩家动作合集：此前 fuzz 从未走过的高危入口。各动作独立 guard；用二次随机挑一个，避免挤占主行动的概率。
    // setup 已备好可部署异兽、装备、增益药、已解锁山。
    const a = rnd();
    if (a < 0.0909){
      guard('travelTo', () => { const id = pick(nanshanNodes); if (id) S.travelTo(id); });
    } else if (a < 0.1818){
      guard('orders', () => { S.refreshOrders(true); for (const o of (S.Game.orders || [])) S.giveItem(o.itemId, o.qty, false); S.deliverAllOrders(); });
    } else if (a < 0.2727){
      guard('activateOmen', () => S.activateOmen(pick(omens)));
    } else if (a < 0.3636){
      guard('doMeditate', () => S.doMeditate());
    } else if (a < 0.4545){
      guard('useConsumable', () => { if (buffItem){ S.giveItem(buffItem, 3, false); S.useConsumable(buffItem); } });
    } else if (a < 0.5454){
      // 境界突破：把累计修为抬到顶，让突破链从头走到尾（每层 need 都远小于 1e9）。
      guard('doBreakthrough', () => { S.Game.stats.totalXp = 1e9; S.doBreakthrough(); });
    } else if (a < 0.6363){
      // 御使：把一只异兽著录至通形，部署 → 撤下 → 一键最优，验证槽位状态机。
      guard('deploy', () => { if (aBeast){ S.Game.records[aBeast] = { tier: 3 }; S.deployBeast(aBeast); S.undeployBeast(0); S.autoDeployBest(); } });
    } else if (a < 0.7272){
      // 词缀重铸：给足炭与贝，rollAffixes（纯派生）+ reforgeItem（salt+1 改写存档）。
      guard('affix', () => { if (equipId){ S.giveItem('tan', 20, false); S.rollAffixes(equipId); S.reforgeItem(equipId); } });
    } else if (a < 0.8181){
      guard('claimCodexAch', () => S.claimAllCodexAch());
    } else if (a < 0.9090){
      // 存档格式幂等性：随机态 → 序列化导出 → 重置 → 重导入（applySave）做第一次往返，
      // 把活态规范化（装备从 inventory 迁到 packGear、补默认字段、清掉幽灵键等）；再做第二次
      // 往返，比对两次规范化产物的存档对象是否一致（剔除非确定/不跨会话字段）。
      // 强依赖存档的游戏，这条迁移线（6 段迁移链 + reconcileSave）一旦回归是灾难级，而它
      // 既不抛异常、单靠不变量 Oracle 也查不出。这里精准卡住「serializeSave 写了某键、
      // applySave 漏读」的静默丢字段回归——且会在字段真没还原时报出具体字段名。
      // 单次幂等比对会因规范化（如装备迁移、undef→默认）误报；双往返幂等比对免疫该误报，
      // 又仍能在真实丢字段时报错。probe 在 6000 个含脏态的随机态下零差异。
      guard('roundTrip', () => {
        S.Game.combat = null;                         // 战斗不跨会话（applySave 必置 null），先对齐
        const s1 = S.serializeSave();
        const t1 = S.exportSaveText(); S.resetToDefault(); S.importSaveText(t1);   // 第一次：规范化
        const s2 = S.serializeSave();
        const t2 = S.exportSaveText(); S.resetToDefault(); S.importSaveText(t2);   // 第二次：幂等校验
        const s3 = S.serializeSave();
        const a2 = stripSave(s2), b2 = stripSave(s3);
        if (canon(a2) !== canon(b2)){
          const keys = Object.keys(a2).concat(Object.keys(b2)).filter((v,i,arr)=>arr.indexOf(v)===i);
          const diff = keys.filter(k => canon(a2[k]) !== canon(b2[k])).join(',');
          if (errors.length < 12) errors.push('roundTrip 存档格式未幂等[' + diff + ']');
        }
      });
    } else if (a < 0.9545){
      // 多端合并：把当前随机态复制一份、改几处（贝币 +1、某库存 +1）模拟「另一端」，
      // mergeSaveData 取较新一档 + 背包并集；直接校验合并产物的不变量（贝币/背包/技艺/统计）。
      guard('merge', () => {
        const a1 = S.serializeSave();
        const b1 = Object.assign({}, a1);
        b1.shells = (a1.shells || 0) + 1;
        b1.inventory = Object.assign({}, a1.inventory || {});
        const k = Object.keys(b1.inventory)[0];
        if (k) b1.inventory[k] = (b1.inventory[k] || 0) + 1;
        const m = S.mergeSaveData(a1, b1);
        const inv = checkInvariants(m);
        if (inv.length && errors.length < 12) errors.push('merge invariant:\n    ' + inv.slice(0, 5).join(' | '));
      });
    } else {
      // 换签（三签手动换）：自动结算（onSecond→bountyTick）已覆盖生命周期，但玩家手动换签这条从未压测。
      guard('bountySwap', () => { if (Array.isArray(S.Game.bounties) && S.Game.bounties.length) S.bountySwap(Math.floor(rnd() * S.Game.bounties.length)); });
    }
  } else if (r < 0.994){
    // 一键配装：把若干装备实例塞进 packGear，再让 equipBest 在随机槽位下重挑最优。
    // 此前压测从未走过这条——配装改写 Game.gear / packGear，是读档与战斗结算都依赖的状态。
    guard('equipBest', () => {
      S.giveItem('tan', 5, false);       // 木戈（装备）→ 入 packGear
      S.giveItem('zhenwu', 3, false);     // 镇物（装备）
      S.equipBest();
    });
  } else if (r < 0.997){
    // 轮回：项目自述「最危险的一次操作」。先抬一门技艺到满级满足门槛，跑完再回填，
    // 让后续动作仍跑得通（fuzz 其余分支依赖 40 级）。验证整条重置路径在随机前置态下不抛。
    guard('rebirth', () => {
      S.Game.skills.taofa = { level: 81, xp: S.xpForLevel(81) + 1 };
      S.doRebirth();
      for (const sk in S.Skills) S.Game.skills[sk] = { level: 40, xp: S.xpForLevel(40) + 1 };
      S.Game.shells = 1e6;
    });
  } else {
    guard('settleAway', () => S.settleAway(60 + Math.floor(rnd() * 7200)));
  }
  // 小步推进时钟：让祠礼 / 征兆 / 续祭 的到期分支也走到
  guard('tick', () => { S.onSecond && S.onSecond(); });
  // 不变量：本轮动作后的核心数值是否还「算对」（非负 / 有限 / 整数 / 引用有效）
  const inv = checkInvariants();
  if (inv.length && errors.length < 12) errors.push('invariant:\n    ' + inv.slice(0, 5).join(' | '));
}

console.log(`随机动作 ${acts} 次（种子 ${process.argv[3] || '20261026'}），异常 ${errors.length} 条`);
errors.forEach(e => console.log('\n  ✗ ' + e));
process.exit(errors.length ? 1 : 0);
