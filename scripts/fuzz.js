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
    // 次级玩家动作合集：此前 fuzz 从未走过的高危入口（御使 / 词缀重铸 / 方国订单 / 征兆 / 打坐 / 境界突破 / 用物 / 巡游 / 领取成就）。
    // 各动作独立 guard；用二次随机挑一个，避免挤占主行动的概率。setup 已备好可部署异兽、装备、增益药、已解锁山。
    const a = rnd();
    if (a < 0.11){
      guard('travelTo', () => { const id = pick(nanshanNodes); if (id) S.travelTo(id); });
    } else if (a < 0.22){
      guard('orders', () => { S.refreshOrders(true); for (const o of (S.Game.orders || [])) S.giveItem(o.itemId, o.qty, false); S.deliverAllOrders(); });
    } else if (a < 0.33){
      guard('activateOmen', () => S.activateOmen(pick(omens)));
    } else if (a < 0.44){
      guard('doMeditate', () => S.doMeditate());
    } else if (a < 0.55){
      guard('useConsumable', () => { if (buffItem){ S.giveItem(buffItem, 3, false); S.useConsumable(buffItem); } });
    } else if (a < 0.66){
      // 境界突破：把累计修为抬到顶，让突破链从头走到尾（每层 need 都远小于 1e9）。
      guard('doBreakthrough', () => { S.Game.stats.totalXp = 1e9; S.doBreakthrough(); });
    } else if (a < 0.77){
      // 御使：把一只异兽著录至通形，部署 → 撤下 → 一键最优，验证槽位状态机。
      guard('deploy', () => { if (aBeast){ S.Game.records[aBeast] = { tier: 3 }; S.deployBeast(aBeast); S.undeployBeast(0); S.autoDeployBest(); } });
    } else if (a < 0.88){
      // 词缀重铸：给足炭与贝，rollAffixes（纯派生）+ reforgeItem（salt+1 改写存档）。
      guard('affix', () => { if (equipId){ S.giveItem('tan', 20, false); S.rollAffixes(equipId); S.reforgeItem(equipId); } });
    } else {
      guard('claimCodexAch', () => S.claimAllCodexAch());
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
}

console.log(`随机动作 ${acts} 次（种子 ${process.argv[3] || '20261026'}），异常 ${errors.length} 条`);
errors.forEach(e => console.log('\n  ✗ ' + e));
process.exit(errors.length ? 1 : 0);
