#!/usr/bin/env node
// 随机操作压测：用真引擎跑几千个随机动作，捕获异常 + 校验不变量 + 校验存档幂等。
// 用法：node scripts/fuzz.js [轮数=3000] [种子]
//
// 为什么要有这个：单元测试只走「想得到的路径」。真实玩家会做各种组合——
// 在战斗里切页、材料刚好够一半时点连作、祠礼到期那一刻离线、把队列删空再启动……
// 这里用固定种子的伪随机把这些组合撞一遍，任何抛错都打印动作与栈。
//
// 它比「只查崩溃」多查两层（这正是把它接入 npm run check 默认闸门的意义）：
//   1) 不变量 Oracle：每轮动作后校验贝币/背包/技艺/统计非负且有限、背包为整数、装备与御使引用有效——
//      随机组合可能不抛异常，却留下负贝币 / NaN / 非整数库存 / 悬空引用这类悄悄算错的状态。
//   2) 存档格式幂等 + 多端合并：随机态 → 序列化 → 重置 → 重导入（applySave）做双往返，
//      比对规范化产物的存档对象是否一致（卡住 serializeSave 写了某键而 applySave 漏读的静默丢字段）；
//      另用 mergeSaveData 取大/取较新/取并集的多种边界双向合并后校验不变量。
//
// 动作面（次级合集用 19 个等距槽位轮转，详见循环内的 a 阶梯）：采集 / 制作 / 战斗 / 祀典 /
// 市集买卖 / 强化 / 队列 / 营造 / 观象 / 受众 / 卜筮 / 圃艺养成 / 巡游 / 方国订单 / 征兆 /
// 打坐 / 用物 / 境界突破 / 御使部署 / 词缀重铸 / 领取成就 / 山系巡礼 / 山志录毕 / 轻量设置
// （战法·战斗风格·主五行）/ 自动续祭 / 禳解凶兆 / 修葺旧筑 / 空闲兜底 / 存档往返 / 多端合并 / 手动换签。
// 战斗分支不止 startCombat + combatTick：它会先强制驱动三个在 combatTick 自然态下不一定触发的
// 战斗态内函数——势满绝技 doPlayerUltimate（势满归零）、Boss 专属技 doMonsterSpecial（五行嬗变 /
// 闪避 / 蛇毒 / 多段 / 破甲 / 震慑逐型覆盖）、自动进食 autoEat（珍稀优先·够用就好），确保这些
// 只悄悄错的结算分支也被提交闸门卡住。
//
// 只读：不写存档文件（每个种子从默认档重来），失败不影响玩家数据。固定种子可复现、不随机红。
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
// 节点数据实际挂在 WORLD.regions[].nodes 上（VM 压测环境里 WORLD.nodes 为空），
// 这里统一从 regions 收集，避免拿到空列表导致 travelTo / claimNodeSeal 分支空跑。
function collectNodeIds(){
  const ids = [], map = {};
  for (const r of (S.WORLD.regions || [])) for (const n of (r.nodes || [])) if (n && n.id){ ids.push(n.id); map[n.id] = n; }
  return { ids, map };
}
const _nodes = collectNodeIds();
let nanshanNodes = _nodes.ids.filter(id => { const n = _nodes.map[id]; return n && n.chapter === 1 && S.nodeUnlocked(n); });
if (!nanshanNodes.length) nanshanNodes = [S.Game.node];
const aBeast = Object.keys(S.Monsters).find(id => { const m = S.Monsters[id]; return m && !m.boss && !m.unkillable; });
// 次级奖励结算分支的前置态：全部节点与山系（claimNodeSeal / claimPilgrim 需要先搭好「录满/走遍」的成就态）。
const allNodeIds = _nodes.ids;
const regionIds = (S.WORLD.regions || []).map(r => r.regionId);
// 可封节点：至少有「经 nodeSourceItems 归属的物产」或「归属异兽」的节点——其余节点 nodeRecordProgress
// 的 total 恒为 0，claimNodeSeal 必空返。只从这里面挑，保证封印分支真的能发赏而非空跑。
const sealableNodes = allNodeIds.filter(nid => {
  for (const it of Object.values(S.Items)){ if (it && (S.nodeSourceItems(it.id) || []).indexOf(nid) >= 0) return true; }
  for (const m of Object.values(S.Monsters)){ if (m && m.nodeId === nid) return true; }
  return false;
});
// 轻量设置类动作的前置素材（此前 fuzz 从未走过）：战法 / 战斗风格 / 主五行 / 自动续祭 / 禳解凶兆。
const tacticIds = Object.keys(S.TACTICS || {});
const combatStyles = ['attack', 'ranged', 'zhu', 'auto'];
const elements = (S.TUNING && S.TUNING.ELEMENTS) || ['金', '木', '水', '火', '土'];
const riteIds = Object.keys(S.RITES || {});
const xiongOmens = Object.keys(S.OMENS || {}).filter(id => S.OMENS[id] && S.OMENS[id].polarity === '凶');
// 战斗态内强制驱动所需的素材：有 heal 的食物（自动进食的择食逻辑依赖 inventory 里的食物，
// 且 RARE_FOOD 表决定「珍稀优先」那条分支），以及带 special 的怪（doMonsterSpecial 的五行嬗变 /
// 闪避 / 蛇毒 / 多段 / 破甲 / 震慑分支需逐一驱动——combatTick 自然触发只走当前怪的一种，其余类型可能永远撞不到）。
const foodItems = Object.keys(S.Items).filter(id => { const it = S.Items[id]; return it && it.heal; });
const specialMonsters = Object.keys(S.Monsters).filter(id => { const m = S.Monsters[id]; return m && m.special; });
// 把一座山的全部物产与异兽著录满，使 nodeRecordProgress 达标（total>0 且 done>=total），供 claimNodeSeal 真正发赏。
// 物产归属必须用 nodeSourceItems 判定（与 nodeHasItem 同口径），而非 it.nodes/it.node——两者覆盖不全等会漏录导致封印空返。
function recordNodeFull(nodeId){
  for (const it of Object.values(S.Items)){
    if (!it) continue;
    if ((S.nodeSourceItems(it.id) || []).indexOf(nodeId) < 0) continue;
    S.Game.records[it.id] = { tier: 3, count: 999 };
  }
  for (const m of Object.values(S.Monsters)){
    if (m && m.nodeId === nodeId) S.Game.records[m.id] = { count: 999 };
  }
}

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
    // 战斗：startCombat 跑通真实开战路径；随后在战斗态内强制驱动此前只被 combatTick 间接触发、
    // 随机态下不一定发生的三个高危函数——势满绝技 doPlayerUltimate、Boss 专属技 doMonsterSpecial、
    // 自动进食 autoEat。combatTick 自然态下「势满→放绝技 / 怪物攒够 spec / 血线掉到阈值」三件事
    // 未必凑齐，而这三者各自的结算（势满归零、五行嬗变/蛇毒/多段/破甲/震慑、珍稀优先·够用就好）
    // 一旦回归只会悄悄错——不抛异常、不变量也查不出。所以先把它们顶出来跑，再自然推进到收尾。
    const id = pick(monsters);
    guard('combat ' + id, () => {
      const m = S.Monsters[id];
      S.Game.map[m.nodeId] = true;
      S.Game.node = m.nodeId;
      S.startCombat(id, { times: 1 + Math.floor(rnd() * 3) });
      // 战斗必在进行中，先强制驱动三个在 combatTick 里可能被跳过的高危函数：
      if (S.Game.combat){
        const c = S.Game.combat;
        const cm = S.foeOf(S.Monsters[c.monsterId]);
        c.momentum = 100; S.doPlayerUltimate(c, cm);                       // 势满绝技：势满即放、放完归零
        for (const f of foodItems.slice(0, 6)) S.giveItem(f, 5, false);    // 塞多种食物
        c.playerHp = Math.max(1, Math.floor(S.playerMaxHp() * 0.1));       // 压低血线
        S.autoEat(c);                                                     // 自动进食：普通优先·够用就好
        for (const sid of specialMonsters){                               // Boss 专属技逐型覆盖
          if (!S.Game.combat) break;
          S.doMonsterSpecial(S.Game.combat, S.foeOf(S.Monsters[sid]));
        }
      }
      for (let t = 0; t < 120 && S.Game.combat; t++) S.combatTick(0.25);   // 再自然推进到击杀/败北收尾
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
      // 两条入队路径都压：手动 addQueueEntry + startQueue（基础装配），
      // 以及一键快速挂机 quickIdlePreset（自动按当前等级挑采集/讨伐/制作各最宜目标排满整队 + 设兜底）。
      // quickIdlePreset 是队列里最复杂的胶水（actionTargets 各模式 + canAfford 过滤 + setFallback + queueLoop），
      // 此前 fuzz 只手动排了一条采集，这条「一键成队」从未压到。
      if (rnd() < 0.5){
        S.Game.queue = [];
        S.addQueueEntry(pick(['qiaocai','caiyu','yu','caiyao']), pick(gatherItems), 1 + Math.floor(rnd() * 5));
        S.startQueue();
        S.ensureQueueActivity();
      } else {
        S.quickIdlePreset();
        S.startQueue();
      }
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
    const aw = 1/19;   // 19 个等距槽位，新增分支只改这里一处，避免魔法数错位
    if (a < aw){
      guard('travelTo', () => { const id = pick(nanshanNodes); if (id) S.travelTo(id); });
    } else if (a < aw*2){
      guard('orders', () => { S.refreshOrders(true); for (const o of (S.Game.orders || [])) S.giveItem(o.itemId, o.qty, false); S.deliverAllOrders(); });
    } else if (a < aw*3){
      guard('activateOmen', () => S.activateOmen(pick(omens)));
    } else if (a < aw*4){
      guard('doMeditate', () => S.doMeditate());
    } else if (a < aw*5){
      guard('useConsumable', () => { if (buffItem){ S.giveItem(buffItem, 3, false); S.useConsumable(buffItem); } });
    } else if (a < aw*6){
      // 境界突破：把累计修为抬到顶，让突破链从头走到尾（每层 need 都远小于 1e9）。
      guard('doBreakthrough', () => { S.Game.stats.totalXp = 1e9; S.doBreakthrough(); });
    } else if (a < aw*7){
      // 御使：把一只异兽著录至通形，部署 → 撤下 → 一键最优，验证槽位状态机。
      guard('deploy', () => { if (aBeast){ S.Game.records[aBeast] = { tier: 3 }; S.deployBeast(aBeast); S.undeployBeast(0); S.autoDeployBest(); } });
    } else if (a < aw*8){
      // 词缀重铸：给足炭与贝，rollAffixes（纯派生）+ reforgeItem（salt+1 改写存档）。
      guard('affix', () => { if (equipId){ S.giveItem('tan', 20, false); S.rollAffixes(equipId); S.reforgeItem(equipId); } });
    } else if (a < aw*9){
      guard('claimCodexAch', () => S.claimAllCodexAch());
    } else if (a < aw*10){
      // 山系巡礼：把该系所有节点标记为「已涉足」（Game.map 置真），让 regionPilgrim 满额，
      // 触发 claimPilgrim 的整系奖励结算（贝币 + 修为 + 山系特产×2）。这条分支的「发赏 + 标记 pilgrim」此前从未压测。
      guard('claimPilgrim', () => {
        const rid = pick(regionIds); if (!rid) return;
        const r = (S.WORLD.regions || []).find(x => x.regionId === rid);
        (r.nodes || []).forEach(n => { S.Game.map[n.id] = true; });
        S.claimPilgrim(rid);
      });
    } else if (a < aw*11){
      // 山志录毕之印：把一座山全部物产/异兽著录满，令 nodeRecordProgress 达标，触发 claimNodeSeal
      // 的封印奖励（贝币 + 舆地修为）。强依赖「录满才发赏」的判定，此前只覆盖采集/制作主路径，封印结算从未压测。
      guard('claimNodeSeal', () => {
        const id = pick(sealableNodes); if (!id) return;
        if (S.Game.seals) delete S.Game.seals[id];   // 清掉旧印，保证本回合能重新触发发放
        recordNodeFull(id);
        S.claimNodeSeal(id);
      });
    } else if (a < aw*12){
      // 轻量设置类：战法 / 战斗风格 / 主五行。三者都只改 Prefs + saveGame，此前 fuzz 从未走过，
      // 回归会让「玩家设置不落盘 / 切换无效」这类静默问题漏网。一个槽位把三个 setter 都压一遍。
      guard('prefs', () => {
        if (tacticIds.length) S.setTactic(pick(tacticIds));
        S.setCombatStyle(pick(combatStyles));
        S.setZhuEl(pick(elements));
      });
    } else if (a < aw*13){
      // 自动续祭开关：挑一个祀典切换其自动续祭状态（riteState 不存在则空返）。此前未压测。
      guard('toggleRiteAuto', () => { if (riteIds.length) S.toggleRiteAuto(pick(riteIds)); });
    } else if (a < aw*14){
      // 禳解凶兆：先塞一只凶兆 + 备齐祭品，触发 exorcise 的扣费 / 移除 / 授修为结算。此前未压测。
      guard('exorcise', () => {
        if (!xiongOmens.length) return;
        S.Game.omens = [{ id: pick(xiongOmens) }];
        S.giveItem('jian', 3, false); S.giveItem('dao', 3, false);
        S.exorcise();
      });
    } else if (a < aw*15){
      // 修葺旧筑：备齐怪木×2、沙石×1 触发 repairBuild 的扣费 + 营邑授修为结算。此前未压测。
      guard('repairBuild', () => {
        S.giveItem('guaimu', 2, false); S.giveItem('shashi', 1, false);
        S.repairBuild();
      });
    } else if (a < aw*16){
      // 空闲兜底动作：队列空、无活动、不在战斗时，游戏主循环会调 startFallbackAction 选一件「不闲着」的事
      // （巡历兜底 / 当前节点采集 / 打坐）挂上——放置游戏最忌「人不在跟前就停摆」，这条「挂机不空转」的
      // 链路此前 fuzz 从未压过（queue 分支会立刻 stopQueue，触发不到兜底）。回归会让玩家挂机时界面真的空转。
      // 这里直接驱动它，并随后清掉它设的活动，避免其 Game.activity 干扰后续动作。
      guard('startFallbackAction', () => {
        S.startFallbackAction();
        S.Game.activity = null;
      });
    } else if (a < aw*17){
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
    } else if (a < aw*18){
      // 多端合并：把当前随机态复制一份、改几处模拟「另一端」，mergeSaveData 取较新一档 + 背包并集；
      // 直接校验合并产物的不变量（贝币/背包/技艺/统计）。额外覆盖三种边界——
      //   ① 背包+贝币更高（取大）；② 远端 savedAt 更晚（判为「较新一档」走 newer 分支）；
      //   ③ 远端某技艺等级更高（mergeSkillMap 取大）。这三条都是合并数学的关键分支，
      //   此前只有「+1 改几处」一种变体，远端更新/技艺更高路径从未单独压到；且每个变体都双向
      //   合并（local×remote 与 remote×local）以压到「较新一档」选择的两条分支。
      guard('merge', () => {
        const base = S.serializeSave();
        const mk = (mut) => { const r = Object.assign({}, base); mut(r); return r; };
        const variants = [
          mk(r => { r.shells = (base.shells || 0) + 1; r.inventory = Object.assign({}, base.inventory || {}); const k = Object.keys(r.inventory)[0]; if (k) r.inventory[k] = (r.inventory[k] || 0) + 1; }),
          mk(r => { r.savedAt = (base.savedAt || 0) + 100000; r.shells = (base.shells || 0) + 5; }),
          mk(r => { r.skills = Object.assign({}, base.skills || {}); const sid = Object.keys(r.skills)[0]; if (sid) r.skills[sid] = { level: (r.skills[sid].level || 1) + 1, xp: 0 }; }),
        ];
        for (const remote of variants){
          for (const [loc, rem] of [[base, remote], [remote, base]]){
            const m = S.mergeSaveData(loc, rem);
            const inv = checkInvariants(m);
            if (inv.length && errors.length < 12) errors.push('merge invariant:\n    ' + inv.slice(0, 5).join(' | '));
          }
        }
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
