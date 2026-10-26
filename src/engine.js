// ===== 游戏核心引擎：状态、存档、经验曲线、著录度 =====

const Game = {
  shells: 50,            // 贝币（商旅之用）
  nickname: '',          // 玩家自定义昵称（顶栏展示，最多 12 字）
  banking: {},           // 仓廪 { itemId: qty }
  inventory: {},         // 行囊 { itemId: qty }
  skills: {},            // { skillId: { level, xp } }
  gear: { weapon:null, armor:null, charm:null, axe:null, pick:null, net:null, quiver:null },
  records: {},           // 著录 { objId: { count, tier } }
  map: {},               // 已解锁/到访节点 { nodeId: true }
  observed: {},          // 已完成观象 { siteId: true }
  buildings: {},         // 已营造 { buildingId: true }
  deployed: {},          // 御使槽位 { slotIdx: beastId }
  omens: [],             // 生效中的征兆 [{ id, until }]
  rites: {},             // 区域祠礼增益 { regionId: untilGameTime }
  riteOf: {},            // 该山系此刻生效的是哪套礼 { regionId: riteId }（同区多礼时定归属）
  riteAuto: {},          // 续祭开关 { riteId: true }：到期前自动重备祭品
  riteStall: {},         // 续祭待料 { riteId: true }：开关仍开，只等祭品凑齐
  omensPending: [],      // 烽烟：凶兆预告 [{ id, at, soft }]，烽火台建成时才有
  recentLoot: [],        // 最近战利品 [{ itemId, qty }]
  omenImmune: {},        // 征兆免疫 { omenId: true }（鵕鸟/大鹗所赐，或御使駮）
  danmu: { stage:0, done:0 },  // 峚山丹木养成进度
  grow: {},               // 各养成点进度 { siteId: { stage, done } }（峚山别名 danmu）
  buff: null,            // 饮药之益 { itemId, def, remaining, dur }
  farms: {},             // 圃艺田地 { 'p0'..: { seedId, remain, grow } }
  mobStreak: {},         // 同目标连续讨伐计数 { monsterId: n }（经验递减用，换目标即重置）
  enhance: {},           // 装备淬炼等级 { itemId: 0..30 }（按物品 id 记，同 id 共享）
  enhanceHeat: {},       // 淬炼火候 { itemId: 0..10 }：失败累积、成功清空
  orders: [],            // 方国求购订单 [{ id, itemId, regionId, qty, premium, total, xp }]
  ordersAt: 0,           // 当前一批订单的生成时间戳（ms，30 分钟轮换）
  node: 'nanshan-1-01',  // 当前所在节点
  activity: null,        // { kind:'gather'|'craft'|'observe'|'taofa', ... }
  combat: null,
  queue: [], queueIdx: 0, queueRound: 0, queueRunning: false, queueLoop: true, fallback: null,
  stats: {
    kills:0, deaths:0, actions:0, totalXp:0, time:0, bossKills:{}, totalEarned:0,
    harvests:0, purchases:0, sales:0, spent:0, sold:0, gathers:{}, crafts:0,
    damageDealt:0, damageTaken:0, hits:0, omens:{}, rites:0, observes:0, divines:0,
    seenMilestones:{}, winStreak:0, deathStreak:0, deathStreakOf:null, bounties:0, seenDeployHint:false, seenFallbackHint:false, _unlockedRegions:[],
  },
  // 三签：常挂三条短目标 [{ id, base, target }]，base 是抽签那一刻的计数
  bounties: [],
  // 轮回：count 转生次数（轮回印 = count × TUNING.REBIRTH.XP）、at 上次转生时刻、
  // best 历史最高总等级、startedAt 本轮起点、history 每轮成绩（最近 10 条）
  rebirth: { count: 0, at: 0, best: 0, startedAt: 0, history: [] },
  startedAt: Date.now(),
  version: 2,
};
// 存档键与结构版本统一由 src/save.js 定义（SAVE_KEY / SAVE_VERSION），此处不再重复声明。

// 偏好设置（不进 Game 主体，避免与存档字段冲突）
const Prefs = {
  fxLevel: 'full',       // 动效强度：full | light | off
  stylePref: 'auto',     // 战斗风格偏好：auto | attack | ranged | zhu
  autoEat: 0.35,         // 自动进食阈值
  autoRevive: false,     // 战败后自动重新讨伐同一异兽
  autoEquip: true,       // 自动装备更优
  idleFallback: true,    // 闲置兜底：无行动时自动执行默认行动（当前节点采集 / 巡历兜底动作）
  zhuEl: '火',           // 祝术主五行
  tactic: 'none',        // 战法姿态：none | swift | steady | breaker
  hideHint: false,       // 关闭常驻「下一步建议」指引条（可在设置中重新开启）
  band: true,            // 卷二难度带：九九 + 轮回之后自动生效，可关掉回头打本卷
  recipeSkill: null,     // 制作配方停留的分类；null = 自动（按「能做的最高级配方」定）
  lastGatherTimes: null, // 上次手动设定的采集次数（null = 一直采）；下次弹出预填
  lastGatherId: null,    // 上次采的物（id）；舆地页「再采」据此一键接上
  sceneOn: true,         // 仪表带下方的「现场」画面（v1.31.54）：关掉省一截屏高
};

function cloneDefaultGame(){
  const g = JSON.parse(JSON.stringify(Game));
  g.startedAt = Date.now();
  g.shells = 50;
  g.nickname = '';
  // 受命之初的行装：樵采石器、些许材料与粮种
  g.inventory = { gui:5, shashi:5, guaimu:3, jing:3, zhuyu:3, tu:5, jiagufan:2, shuiping:2 };
  g.banking = {}; g.farms = {}; g.records = {}; g.map = { 'nanshan-1-01': true };
  g.observed = {}; g.buildings = {}; g.deployed = {}; g.omens = []; g.rites = {}; g.recentLoot = [];
  g.riteOf = {}; g.riteAuto = {}; g.riteStall = {}; g.omensPending = [];
  g.omenImmune = {}; g.danmu = { stage:0, done:0 }; g.grow = {}; g.buff = null;
  g.node = 'nanshan-1-01'; g.activity = null; g.combat = null;
  g.queue = []; g.queueIdx = 0; g.queueRound = 0; g.queueRunning = false; g.queueLoop = true; g.fallback = null;
  g.mobStreak = {};
  g.enhance = {}; g.enhanceHeat = {};
  g.packGear = [];   // 行囊里的装备实例（每件自带淬炼等级；v1.31.22 起）
  g.pilgrim = {};    // 山系巡礼：走遍一系诸山后的领赏记录（v1.31.24）
  // 装备槽必须显式清空：cloneDefaultGame 是「深拷贝当前状态再覆盖字段」，
  // 漏了这一项的话，重开新档时身上还穿着上一局那件（连淬炼阶数一起）——
  // 装备改成按件存实例之后，这个漏洞才看得出来。
  g.gear = { weapon:null, armor:null, charm:null, axe:null, pick:null, net:null, quiver:null };
  g.orders = []; g.ordersAt = 0;
  g.rebirth = { count:0, at:0, best:0 };      // 转生：新档即零转
  g.member = { tier:'none', until:0 };         // 会员权益：未登录即未开通（账号系统登录后由账号层写入）
  g.bounties = [];                            // 三签：抽签在首次 tick 时惰性补满
  g.skills = {};
  for (const id of ALL_SKILL_IDS) g.skills[id] = { level:1, xp:0 };
  g.stats = { kills:0, deaths:0, actions:0, totalXp:0, time:0, bossKills:{}, totalEarned:0,
              harvests:0, purchases:0, sales:0, spent:0, sold:0, gathers:{}, crafts:0,
              damageDealt:0, damageTaken:0, hits:0, omens:{}, rites:0, observes:0, divines:0,
              seenMilestones:{}, claimed:{}, winStreak:0, deathStreak:0, deathStreakOf:null, bounties:0, seenDeployHint:false, seenFallbackHint:false, _unlockedRegions:[],
              // 离线结算累计（统计页展示）：次数 / 时长 / 经验 / 物品件数 / 最近一次
              offlineCount:0, offlineSec:0, offlineXp:0, offlineItems:0, lastOffline:null };
  return g;
}

// ---------- 存档 ----------
// 存档统一走 SaveManager（src/save.js）：存储后端可插拔（本地 / 将来的云端）、
// 版本迁移与多端合并都在那一层完成。此处只负责「内存 ↔ 存档对象」的装配与校正。
function saveGame(){
  Game.skills = Game.skills || {};
  const ok = SaveManager.save();
  if (!ok) console.error('保存失败', new Error('SaveManager.save 返回 false'));
  // 云端自动同步：已接入且开启自动同步时，停止改动约 3 秒自动上传；未接入时零开销跳过
  if (SaveManager.scheduleSync) SaveManager.scheduleSync();
}

// 把存档对象装配回内存状态（读档 + 校验 + 补缺）
function applySave(d){
  try {
  const dflt = cloneDefaultGame();
  Game.banking = d.banking || {};
  Game.inventory = d.inventory || {};
    // 技艺补全：新版本添了技艺、或存档来自更早的版本时，缺的那几门补成 1 级。
    // 少了这一层，renderSkills 会读 undefined.level 直接抛错（技能页白屏），
    // 玩家只会看到「读档后技能页打不开」，且每次刷新都一样。
    {
      const saved = (d.skills && typeof d.skills === 'object') ? d.skills : {};
      for (const sid in Skills){
        const sk = saved[sid];
        if (!sk || typeof sk !== 'object' || !isFinite(sk.level)){
          saved[sid] = { level: 1, xp: 0 };
        } else {
          sk.level = Math.max(1, Math.min(TUNING.MAX_LEVEL, Math.floor(sk.level)));
          sk.xp = isFinite(sk.xp) && sk.xp >= 0 ? sk.xp : xpForLevel(sk.level);
        }
      }
      Game.skills = saved;
    }
    Game.gear = Object.assign({}, dflt.gear, d.gear || {});
    // 旧档（v5 及更早）装备槽里只有 id、没有 enh，等级记在共享表 Game.enhance 上。
    // 那时「装备槽也按 id 取档」，读回来要把它搬到实例上——必须在下面的清理之前做。
    // ⚠️ 顺序要紧：共享表在 packGear 装配后会被清空（见下），晚一步就取不到了。
    if (d.enhance && typeof d.enhance === 'object'){
      for (const slot in Game.gear){
        const g = Game.gear[slot];
        if (!g || typeof g !== 'object') continue;
        if (g.enh == null){
          const id = g.id || '';
          const v = parseInt(d.enhance[id], 10);
          g.enh = isFinite(v) && v > 0 ? Math.min((typeof window !== 'undefined' && window.ENHANCE_MAX) || 30, v) : 0;
        }
      }
    }
    Game.records = d.records || {};
    Game.map = d.map || { 'nanshan-1-01': true };
    Game.observed = d.observed || {};
    Game.buildings = d.buildings || {};
    Game.deployed = d.deployed || {};
    Game.omens = Array.isArray(d.omens) ? d.omens : [];
    // 烽烟（烽火台建后才有）：旧档没有此字段，补空；非法项剔除
    Game.omensPending = Array.isArray(d.omensPending)
      ? d.omensPending.filter(p => p && OMENS[p.id] && isFinite(p.at))
      : [];
    Game.rites = d.rites || {};
    // 旧档没有 riteOf/riteAuto：补空对象即可（riteOf 缺失时 regionRiteBonus 退回按 regionId 反查）
    Game.riteOf = (d.riteOf && typeof d.riteOf === 'object') ? d.riteOf : {};
    Game.riteAuto = (d.riteAuto && typeof d.riteAuto === 'object') ? d.riteAuto : {};
    Game.riteStall = (d.riteStall && typeof d.riteStall === 'object') ? d.riteStall : {};
    Game.recentLoot = Array.isArray(d.recentLoot) ? d.recentLoot : [];
    Game.omenImmune = d.omenImmune || {};
    Game.danmu = d.danmu || { stage:0, done:0 };
    Game.grow = d.grow || {};
    Game.buff = d.buff || null;
    Game.farms = d.farms || {};
    Game.node = d.node || 'nanshan-1-01';
    Game.shells = isFinite(d.shells) ? d.shells : 50;
    Game.nickname = typeof d.nickname === 'string' ? d.nickname.slice(0, 12) : '';
    Game.stats = Object.assign({}, dflt.stats, d.stats || {});
    Game.activity = d.activity || null;
    // 制作活动里的 recipe 是**快照**。配方改过之后，旧档会按过期的材料与产出继续做——
    // 材料多扣、产出少给，玩家只会觉得「这配方怎么不对」。读档时按 type::out 重绑到当前表；
    // 配方已被删掉的，直接把这个行动停掉（比让它按幽灵配方跑下去安全）。
    if (Game.activity && Game.activity.kind === 'craft'){
      const a = Game.activity;
      const key = a.recipe ? (a.recipe.type + '::' + a.recipe.out) : '';
      const cur = key ? Recipes.find(r => (r.type + '::' + r.out) === key) : null;
      if (cur) a.recipe = cur;
      else Game.activity = null;
    }
    // ⚠️ 战斗不跨会话恢复：驱动战斗的 autoAttack 是运行时变量，读档后必为 false，
    // 恢复 combat 只会让状态栏停在「往讨：X」而战斗循环永不推进（表现为卡战斗页、
    // 无动画、统计不涨）。战斗是瞬时行为，离线收益另走采集/队列结算。
    Game._droppedCombat = d.combat ? d.combat.monsterId : null;
    Game.combat = null;
    // 会员权益（旧档无此字段：补未开通，行为与从前完全一致）
    {
      const m = (d.member && typeof d.member === 'object') ? d.member : {};
      Game.member = { tier: typeof m.tier === 'string' ? m.tier : 'none', until: isFinite(m.until) ? m.until : 0 };
    }
    // 轮回记录（旧档无此字段：补零转，不影响任何既有数值）
    {
      const r = (d.rebirth && typeof d.rebirth === 'object') ? d.rebirth : {};
      const c = parseInt(r.count, 10);
      Game.rebirth = {
        count: isFinite(c) && c > 0 ? Math.min(999, c) : 0,
        at: isFinite(r.at) ? r.at : 0,
        best: isFinite(r.best) && r.best > 0 ? r.best : 0,
        startedAt: isFinite(r.startedAt) ? r.startedAt : 0,
        // 每轮成绩：{ at, sec, total, best }。非法项剔除，最多留十条——
        // 这是给「刷新纪录」用的，不是流水账。
        history: Array.isArray(r.history)
          ? r.history.filter(x => x && isFinite(x.sec) && x.sec >= 0)
              .map(x => ({ at:+x.at || 0, sec:Math.round(x.sec), total:+x.total || 0, best:+x.best || 0 }))
              .slice(-10)
          : [],
      };
    }
    // 三签：只保留仍在对表里的签，base 必须是非负数（旧档无此字段则留空，稍后惰性补满）
    Game.bounties = Array.isArray(d.bounties)
      ? d.bounties.filter(b => b && b.id && isFinite(b.base) && isFinite(b.target))
          .map(b => ({ id:String(b.id), base:Math.max(0, Math.round(b.base)), target:Math.max(1, Math.round(b.target)) }))
          .slice(0, 3)
      : [];
    Game.startedAt = d.startedAt || Date.now();
    if (d.prefs) Object.assign(Prefs, d.prefs);
    // 行动队列
    Game.queue = Array.isArray(d.queue) ? d.queue.filter(e=>e&&e.kind&&e.target) : [];
    Game.queueIdx = d.queueIdx||0;
    Game.queueRound = d.queueRound||0;
    Game.queueRunning = !!d.queueRunning;
    Game.queueLoop = d.queueLoop !== false;
    Game.fallback = (d.fallback && d.fallback.kind && d.fallback.target) ? d.fallback : null;
    // 同目标连续讨伐计数（旧档无此字段，缺省为空）
    Game.mobStreak = (d.mobStreak && typeof d.mobStreak === 'object') ? d.mobStreak : {};
    Game.pilgrim = (d.pilgrim && typeof d.pilgrim === 'object') ? d.pilgrim : {};
    // 装备淬炼等级（旧档无此字段，缺省为空；非法值剔除）
    // 上限取当前 ENHANCE_MAX——这里曾写死 9，强化上限提到 30 时忘了同步，
    // 结果强到 +20 的装备一刷新就掉回 +9。凡是「另一处定义的常量」，
    // 都不要在这里抄一份字面量。
    Game.enhance = {};
    {
      const cap = (typeof window !== 'undefined' && window.ENHANCE_MAX) || 30;
      if (d.enhance && typeof d.enhance === 'object'){
        for (const k in d.enhance){
          const v = parseInt(d.enhance[k], 10);
          if (isFinite(v) && v > 0) Game.enhance[k] = Math.min(cap, v);
        }
      }
    }
    // 火候（旧档无此字段）：0..HEAT_MAX，非数字丢弃
    Game.enhanceHeat = {};
    {
      const hm = (typeof window !== 'undefined' && window.ENHANCE_HEAT && window.ENHANCE_HEAT.MAX) || 10;
      if (d.enhanceHeat && typeof d.enhanceHeat === 'object'){
        for (const k in d.enhanceHeat){
          const v = parseInt(d.enhanceHeat[k], 10);
          if (isFinite(v) && v > 0) Game.enhanceHeat[k] = Math.min(hm, v);
        }
      }
    }
    // 行囊装备改为「按件」存（v1.31.22）：每件自带淬炼等级，+2 与 +0 不再并成一堆。
    // 旧档把装备混在 inventory 里、按 itemId 记一档强化，这里统一迁成实例：
    // 同 id 的 n 件都取 d.enhance[id] 那一档（旧档本来就是共享一档，语义不变）。
    Game.packGear = [];
    {
      const capG = (typeof window !== 'undefined' && window.ENHANCE_MAX) || 30;
      const push = (id, enh) => {
        const it = Items[id];
        if (!it || !it.equip) return;
        const v = parseInt(enh, 10);
        Game.packGear.push({ id, enh: isFinite(v) ? Math.max(0, Math.min(capG, v)) : 0 });
      };
      if (Array.isArray(d.packGear)){
        // n 是「同档几件」（v1.31.25 起的压缩写法）；旧档是一条一件，n 缺省即 1
        for (const g of d.packGear){
          if (!g || typeof g.id !== 'string') continue;
          const n = Math.max(1, Math.min(9999, parseInt(g.n, 10) || 1));
          for (let i = 0; i < n; i++) push(g.id, g.enh);
        }
      }
      const legacy = {};
      if (d.enhance && typeof d.enhance === 'object'){
        for (const k in d.enhance){
          const v = parseInt(d.enhance[k], 10);
          if (isFinite(v) && v > 0) legacy[k] = Math.min(capG, v);
        }
      }
      for (const id of Object.keys(Game.inventory)){
        if (!(Items[id] && Items[id].equip)) continue;
        const n = Math.max(0, Math.floor(Game.inventory[id] || 0));
        for (let i = 0; i < n; i++) push(id, legacy[id] || 0);
        delete Game.inventory[id];       // 装备不再记在 inventory（否则总数会翻倍）
      }
      // 旧档那一档已落到实例上，共享表里的值必须清掉：
      // 否则「最高强化」与旧接口还会读出这些幽灵等级（装备卖光了仍显示 +17）。
      // 注意要按 packGear 里的 id 清，而不是只清「刚从 inventory 迁出」的那几个——
      // 迁移链 5→6 已经把装备搬进 packGear 时，inventory 里是空的。
      if (Game.enhance){
        for (const g of Game.packGear) delete Game.enhance[g.id];
      }
    }
    // 装备词条重铸次数（旧档无此字段：salt=0 即「初次派生」的词条，与新版一致）
    Game.affixSalt = {};
    if (d.affixSalt && typeof d.affixSalt === 'object'){
      for (const k in d.affixSalt){
        const v = parseInt(d.affixSalt[k], 10);
        if (isFinite(v) && v > 0) Game.affixSalt[k] = Math.min(9999, v);
      }
    }
    if (typeof invalidateAffixes === 'function') invalidateAffixes();
    // 方国求购订单（旧档无此字段，读档后由 refreshOrders 补生成）
    Game.orders = Array.isArray(d.orders) ? d.orders.filter(o=>o && o.itemId && o.qty>0) : [];
    Game.ordersAt = isFinite(d.ordersAt) ? d.ordersAt : 0;
    // 首次读档：静默记录已达成里程碑
    if (!Game.stats.seenMilestones || typeof Game.stats.seenMilestones !== 'object'){
      Game.stats.seenMilestones = {};
      (window.Milestones||[]).forEach(ms=>{ if (ms.check && ms.check()) Game.stats.seenMilestones[ms.id] = true; });
    }
    // 校正技能完整
    for (const k in dflt.skills) if (typeof Game.skills[k] !== 'object') Game.skills[k] = { level:1, xp:0 };
    sanitizeBag(Game.inventory); sanitizeBag(Game.banking);
    // 校正田地
    for (const slot in Game.farms){
      const f = Game.farms[slot];
      if (!f || !f.seedId || !Items[f.seedId]){ delete Game.farms[slot]; continue; }
      if (!isFinite(f.remain) || f.remain < 0) f.remain = 0;
      if (!isFinite(f.grow) || f.grow <= 0) f.grow = Items[f.seedId].grow || 10;
    }
    // 校正装备引用（装备槽存的是物品对象，其 id 必须仍存在）
    // 兼容两种历史形态：{id, ...} 对象（当前）与裸 id 字符串（早期档）。
    const lostGear = [];
    for (const slot in Game.gear){
      const g = Game.gear[slot];
      if (!g) continue;
      const gid = (typeof g === 'string') ? g : g.id;
      if (!gid){ Game.gear[slot] = null; continue; }
      if (!Items[gid]){
        // 物品表里找不到这件（旧档里有、后来改名或并入别处）。不能直接抹成 null：
        // 玩家身上可能是一件淬到 +18 的兵器，凭空消失比数值过时严重得多。
        // 保留原样，并在日志里点明，让他知道该换一件了。
        Game.gear[slot] = (typeof g === 'object') ? Object.assign({}, g, { id: gid }) : null;
        lostGear.push(gid);
        continue;
      }
      // 一律按 Items 重建。存档只该记住「戴着哪一件」，不该记住它当时值多少——
      // 否则每次调平衡，老档里的那件还是旧数字；更糟的是后来新增的字段
      // （品阶 grade、神兵特性 divine）在旧快照里根本没有，读出来是 undefined：
      // 神兵不带特性、珍品显示成良品、强化上限也对不上。
      // 保留实例上的强化等级。旧档（v<5）把等级记在 Game.enhance[gid] 里、由所有同名共享，
      // 读档时搬到实例上并从那张表里删掉——这样「身上那把」带着自己的等级，行囊另起一档。
      let enh = Math.max(0, (typeof g === 'object' && g.enh) | 0);
      if (!enh && Game.enhance && Game.enhance[gid]){
        enh = Math.max(0, Game.enhance[gid] | 0);
        delete Game.enhance[gid];
      }
      Game.gear[slot] = Object.assign({}, Items[gid], { id: gid, enh });
    }
    if (lostGear.length && typeof log === 'function')
      log(`⚠️ 存档中的装备已不在物产表（${lostGear.join('、')}），暂按原数值保留——请另换一件`, 'bad', 'sys');
    // 校正御使槽位
    for (const k in Game.deployed){ if (!Monsters[Game.deployed[k]]) delete Game.deployed[k]; }
  } catch(e){
    console.error('存档装配失败', e);
    throw e;
  }
  if (typeof invalidateMilestones === 'function') invalidateMilestones();   // 状态跳变：刷新成就缓存
  return true;
}

// 读档：存储与迁移交给 SaveManager，本函数只做状态装配与合法性校正。
function loadGame(){
  let d = null;
  try { d = SaveManager.load(); } catch(e){ console.error('读档失败，恢复默认', e); d = null; }
  if (!d){ resetToDefault(); return false; }
  try {
    applySave(d);
  } catch(e){
    console.error('读档失败，恢复默认', e);
    resetToDefault();
    return false;
  }
  return true;
}

function sanitizeBag(bag){
  for (const k in bag){
    const v = bag[k];
    if (!isFinite(v) || v <= 0) delete bag[k];
    else bag[k] = Math.floor(v);
  }
}

// ---------- 存档导出 / 导入 ----------
// 导出 / 导入同样走 SaveManager，保证云端档与本地档是同一套格式，
// 玩家手动导出的文本将来可以直接作为「云端存档迁移」的载体。
function exportSaveText(){
  try { return SaveManager.exportText(); } catch(e){ return ''; }
}
function importSaveText(raw){
  const r = SaveManager.importText(raw);
  if (!r.ok) return r;
  loadGame();
  return r;
}

function resetToDefault(){
  const g = cloneDefaultGame();
  Object.assign(Game, g);
  if (typeof invalidateMilestones === 'function') invalidateMilestones();   // 状态整体重置：刷新成就缓存
  try { SaveManager.reset(); } catch(e){}
}
window.exportSaveText = exportSaveText;
window.importSaveText = importSaveText;

// ---------- 技能 / XP（自研曲线：81 级 9 阶） ----------
// XP(L→L+1) = round( 20·L^2.15 + 10·1.048^L )
// 查表优化：TUNING.XP 参数运行期不变，等级只有 1..MAX_LEVEL-1 共 80 种取值，
// 首次使用时预计算「每级所需 / 累计所需」两张表，之后热路径（每次授经验
// 都要反算等级）从 80 次 Math.pow 循环退化为 O(1) 查表。
const _xpNeed = [];   // _xpNeed[l] = 从 l 级升到 l+1 所需
const _xpCum  = [];   // _xpCum[l]  = 到达 l 级所需累计
function ensureXpTable(){
  if (_xpCum.length) return;
  const X = TUNING.XP;
  _xpCum[1] = 0;
  for (let l = 1; l < TUNING.MAX_LEVEL; l++){
    _xpNeed[l] = Math.round(X.A * Math.pow(l, X.B) + X.C * Math.pow(X.R, l));
    _xpCum[l+1] = _xpCum[l] + _xpNeed[l];
  }
}
function xpForNextLevel(l){
  ensureXpTable();
  return _xpNeed[l] || 0;
}
// 到达 level 级所需累计经验
function xpForLevel(level){
  ensureXpTable();
  return _xpCum[level] || 0;
}
function levelFromXp(xp){
  ensureXpTable();
  let level = 1;
  while (level < TUNING.MAX_LEVEL && _xpCum[level+1] <= xp) level++;
  return { level, spent: _xpCum[level] };
}
// 经验授予。额外耦合：一切修行皆长「舆地」（制图随行）与「履险」（逾山涉水）——
// 否则仅靠首访给经验，区域解锁等级在真实游玩中永远不可达（116 山的世界必须跑得通）。
// 舆地 = 本次所得的 10%，履险 = 其中一半；用重入守卫避免递归。
let _inGainXp = false;
function gainXp(skillId, amount){
  if (!Game.skills[skillId]) return;
  const gain = Math.round(amount * (typeof xpMult === 'function' ? xpMult() : 1));
  if (gain <= 0) return;
  const sk = Game.skills[skillId];
  sk.xp = (sk.xp||0) + gain;
  const { level } = levelFromXp(sk.xp);
  const old = sk.level||1;
  sk.level = Math.min(TUNING.MAX_LEVEL, level);
  Game.stats.totalXp += gain;
  if (sk.level > old && UI) UI.levelUp(skillId, old, sk.level, gain);
  if (!_inGainXp && skillId !== 'yudi'){
    _inGainXp = true;
    try {
      const yGain = Math.max(1, Math.round(gain * 0.10));
      if (Game.skills.yudi){
        Game.skills.yudi.xp += yGain;
        const yl = Math.min(TUNING.MAX_LEVEL, levelFromXp(Game.skills.yudi.xp).level);
        if (yl > (Game.skills.yudi.level||1)) Game.skills.yudi.level = yl;
      }
      if (Game.skills.lvxian){
        Game.skills.lvxian.xp += Math.max(1, Math.round(yGain * 0.5));
        Game.skills.lvxian.level = Math.min(TUNING.MAX_LEVEL, levelFromXp(Game.skills.lvxian.xp).level);
      }
    } finally { _inGainXp = false; }
  }
  checkRegionUnlocks();
}
// 新山系解锁提示：舆地/履险升级后比对已解锁集合，首次出现者浮条通知
function checkRegionUnlocks(){
  const known = Game.stats._unlockedRegions || (Game.stats._unlockedRegions = []);
  (WORLD.regions||[]).forEach(r=>{
    if (regionUnlocked(r) && !known.includes(r.regionId)){
      known.push(r.regionId);
      if (UI) UI.toast(`🔓 新山系解锁：${r.regionName}`);
      if (typeof log === 'function') log(`🔓 新山系解锁：${r.regionName}`, 'yudi', 'sys');
    }
  });
}
function levelOf(skillId){ return (Game.skills[skillId]||{}).level || 1; }
function totalSkillLevel(){
  let t = 0;
  for (const id in Game.skills) t += (Game.skills[id].level||1);
  return t;
}

// ---------- 著录 ----------
// 累加一次著录；返回 { first, tierUp, tier }
function addRecord(objId, n){
  n = Math.max(1, Math.floor(n||1));
  let rec = Game.records[objId];
  if (!rec){ rec = { count:0, tier:0 }; Game.records[objId] = rec; }
  const first = rec.count === 0;
  rec.count += n;
  const newTier = recordTierOf(rec.count);
  const tierUp = newTier > rec.tier;
  rec.tier = newTier;
  return { first, tierUp, tier: newTier };
}
window.addRecord = addRecord;

// ---------- 物品 ----------
// 装备与材料是两套账（v1.31.22）：
//   · 材料：Game.inventory[itemId] = 件数（同物同类，可堆叠）；
//   · 装备：Game.packGear = [{ id, enh }]，一件一条，各自带自己的淬炼等级。
// 早先装备也混在 inventory 里、强化档按 itemId 共享一档，于是「+2 一件 + 十九件 +0」
// 只能显示成「×20、+0」——这正是玩家报的堆叠问题。现在按件存，天然分得开。
function isEquipId(itemId){ const it = Items[itemId]; return !!(it && it.equip); }
function packGearCount(itemId){
  let n = 0;
  for (const g of (Game.packGear || [])) if (g.id === itemId) n++;
  return n;
}
function packGearAdd(itemId, enh, qty){
  Game.packGear = Game.packGear || [];
  const v = Math.max(0, Math.min(ENHANCE_MAX, parseInt(enh, 10) || 0));
  for (let i = 0; i < (qty || 1); i++) Game.packGear.push({ id: itemId, enh: v });
}
// 取走装备实例：指定 enh 时只从该档取；否则先拿 +0、再拿低档（绝不先吃玩家淬过的那件）
// 返回实际取走的条数。
function packGearTake(itemId, qty, enh){
  qty = Math.floor(qty || 0);
  let left = qty;
  const idxs = (Game.packGear || []).map((g, i) => ({ g, i }))
    .filter(x => x.g.id === itemId && (enh == null || (x.g.enh | 0) === (enh | 0)))
    .sort((a, b) => (a.g.enh | 0) - (b.g.enh | 0));
  const drop = new Set();
  for (const x of idxs){ if (left <= 0) break; drop.add(x.i); left--; }
  if (drop.size) Game.packGear = Game.packGear.filter((_, i) => !drop.has(i));
  return qty - left;
}
// 行囊里某一类（装备）按档汇总：[{ enh, qty }]，档位从高到低
function gearStacks(itemId){
  const m = new Map();
  for (const g of (Game.packGear || [])) if (g.id === itemId) m.set(g.enh | 0, (m.get(g.enh | 0) || 0) + 1);
  return [...m.entries()].map(([enh, qty]) => ({ enh, qty })).sort((a, b) => b.enh - a.enh);
}
// 行囊里能用的件数（装备走实例表，其余走计数表）
function bagQty(itemId){
  return isEquipId(itemId) ? packGearCount(itemId) : (Game.inventory[itemId] || 0);
}
function totalOf(itemId){ return (Game.banking[itemId]||0) + bagQty(itemId); }
function giveItem(itemId, qty, toBank){
  qty = Math.floor(qty);
  if (!(qty > 0)) return;
  if (isEquipId(itemId) && !toBank){
    packGearAdd(itemId, 0, qty);        // 新得的装备一律 +0；强化过的只可能是自己那一件
    Game.stats.actions++;
    return;
  }
  const target = (toBank ? Game.banking : Game.inventory);
  target[itemId] = (target[itemId]||0) + qty;
  Game.stats.actions++;
}
function takeItem(itemId, qty, preferBank){
  qty = Math.floor(qty);
  if (!(qty > 0)) return;
  if (isEquipId(itemId) && !preferBank){
    const got = packGearTake(itemId, qty, null);
    qty -= got;
    if (qty <= 0){ Game.stats.actions++; return; }
  }
  if (preferBank){
    const b = Game.banking[itemId]||0;
    const used = Math.min(b, qty);
    Game.banking[itemId] = b - used;
    qty -= used;
  } else {
    const inv = Game.inventory[itemId]||0;
    const used = Math.min(inv, qty);
    Game.inventory[itemId] = inv - used;
    qty -= used;
  }
  if (qty > 0){
    const side = preferBank ? Game.inventory : Game.banking;
    const n = side[itemId]||0;
    side[itemId] = n - qty;
  }
  sanitizeBag(Game.inventory); sanitizeBag(Game.banking);
}
function canAfford(cost){
  for (const [id,qty] of cost) if (totalOf(id) < qty) return false;
  return true;
}
function payCost(cost){
  for (const [id,qty] of cost) takeItem(id, qty, false);
}

// ---------- 日志 ----------
function log(msg, color, cat){
  if (UI && UI.log) UI.log(msg, color, cat);
}

if (typeof window !== 'undefined'){
  window.Game = Game; window.Prefs = Prefs;
  window.xpForLevel = xpForLevel; window.levelFromXp = levelFromXp; window.xpForNextLevel = xpForNextLevel;
  window.gainXp = gainXp; window.levelOf = levelOf; window.totalSkillLevel = totalSkillLevel;
  window.totalOf = totalOf; window.giveItem = giveItem; window.takeItem = takeItem;
  window.bagQty = bagQty; window.gearStacks = gearStacks; window.packGearAdd = packGearAdd;
  window.packGearTake = packGearTake; window.packGearCount = packGearCount; window.isEquipId = isEquipId;
  window.canAfford = canAfford; window.payCost = payCost;
  window.resetToDefault = resetToDefault; window.saveGame = saveGame; window.loadGame = loadGame;
  window.sanitizeBag = sanitizeBag; window.log = log;
}
