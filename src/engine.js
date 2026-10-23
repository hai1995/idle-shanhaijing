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
  recentLoot: [],        // 最近战利品 [{ itemId, qty }]
  omenImmune: {},        // 征兆免疫 { omenId: true }（鵕鸟/大鹗所赐，或御使駮）
  danmu: { stage:0, done:0 },  // 峚山丹木养成进度
  grow: {},               // 各养成点进度 { siteId: { stage, done } }（峚山别名 danmu）
  buff: null,            // 饮药之益 { itemId, def, remaining, dur }
  farms: {},             // 圃艺田地 { 'p0'..: { seedId, remain, grow } }
  mobStreak: {},         // 同目标连续讨伐计数 { monsterId: n }（经验递减用，换目标即重置）
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
    seenMilestones:{}, winStreak:0, seenDeployHint:false, seenFallbackHint:false, _unlockedRegions:[],
  },
  startedAt: Date.now(),
  version: 2,
};
const SAVE_KEY = 'shj_zhulu_save_v1';

// 偏好设置（不进 Game 主体，避免与存档字段冲突）
const Prefs = {
  fxLevel: 'full',       // 动效强度：full | light | off
  stylePref: 'auto',     // 战斗风格偏好：auto | attack | ranged | zhu
  autoEat: 0.35,         // 自动进食阈值
  autoRevive: false,     // 战败后自动重新讨伐同一异兽
  autoEquip: true,       // 自动装备更优
  idleFallback: true,    // 闲置兜底：无行动时自动执行默认行动（当前节点采集 / 巡历兜底动作）
  zhuEl: '火',           // 祝术主五行
  hideHint: false,       // 关闭常驻「下一步建议」指引条（可在设置中重新开启）
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
  g.omenImmune = {}; g.danmu = { stage:0, done:0 }; g.grow = {}; g.buff = null;
  g.node = 'nanshan-1-01'; g.activity = null; g.combat = null;
  g.queue = []; g.queueIdx = 0; g.queueRound = 0; g.queueRunning = false; g.queueLoop = true; g.fallback = null;
  g.mobStreak = {};
  g.orders = []; g.ordersAt = 0;
  g.skills = {};
  for (const id of ALL_SKILL_IDS) g.skills[id] = { level:1, xp:0 };
  g.stats = { kills:0, deaths:0, actions:0, totalXp:0, time:0, bossKills:{}, totalEarned:0,
              harvests:0, purchases:0, sales:0, spent:0, sold:0, gathers:{}, crafts:0,
              damageDealt:0, damageTaken:0, hits:0, omens:{}, rites:0, observes:0, divines:0,
              seenMilestones:{}, winStreak:0, seenDeployHint:false, seenFallbackHint:false, _unlockedRegions:[] };
  return g;
}

// ---------- 存档 ----------
function saveGame(){
  Game.skills = Game.skills || {};
  const data = { version:2, shells:Game.shells, nickname:Game.nickname||'', banking:Game.banking, inventory:Game.inventory,
    skills:Game.skills, gear:Game.gear, records:Game.records, map:Game.map, observed:Game.observed,
    buildings:Game.buildings, deployed:Game.deployed, omens:Game.omens, rites:Game.rites, recentLoot:Game.recentLoot||[],
    omenImmune:Game.omenImmune||{}, danmu:Game.danmu||{stage:0,done:0}, grow:Game.grow||{}, buff:Game.buff,
    farms:Game.farms, node:Game.node, activity:Game.activity||null, combat:Game.combat||null,
    stats:Game.stats, startedAt:Game.startedAt, prefs:Prefs,
    queue:Game.queue||[], queueIdx:Game.queueIdx||0, queueRound:Game.queueRound||0,
    queueRunning:!!Game.queueRunning, queueLoop:Game.queueLoop!==false, fallback:Game.fallback||null,
    mobStreak:Game.mobStreak||{}, orders:Game.orders||[], ordersAt:Game.ordersAt||0 };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch(e){ console.error('保存失败', e); }
  try { localStorage.setItem(SAVE_KEY+'_time', String(Date.now())); } catch(e){}
}

function loadGame(){
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch(e){ raw = null; }
  if (!raw){ resetToDefault(); return; }
  try {
    const d = JSON.parse(raw);
    const dflt = cloneDefaultGame();
    Game.banking = d.banking || {};
    Game.inventory = d.inventory || {};
    Game.skills = d.skills || dflt.skills;
    Game.gear = Object.assign({}, dflt.gear, d.gear || {});
    Game.records = d.records || {};
    Game.map = d.map || { 'nanshan-1-01': true };
    Game.observed = d.observed || {};
    Game.buildings = d.buildings || {};
    Game.deployed = d.deployed || {};
    Game.omens = Array.isArray(d.omens) ? d.omens : [];
    Game.rites = d.rites || {};
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
    Game.combat = d.combat || null;
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
    // 校正装备引用（物品 id 必须仍存在）
    for (const slot in Game.gear){
      const g = Game.gear[slot];
      if (g && !Items[g.id]) Game.gear[slot] = null;
    }
    // 校正御使槽位
    for (const k in Game.deployed){ if (!Monsters[Game.deployed[k]]) delete Game.deployed[k]; }
  } catch(e){
    console.error('读档失败，恢复默认', e);
    resetToDefault();
  }
  if (typeof invalidateMilestones === 'function') invalidateMilestones();   // 状态跳变：刷新成就缓存
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
function exportSaveText(){
  try { return localStorage.getItem(SAVE_KEY) || ''; } catch(e){ return ''; }
}
function importSaveText(raw){
  if (!raw || typeof raw !== 'string') return { ok:false, reason:'内容为空' };
  let d;
  try { d = JSON.parse(raw); } catch(e){ return { ok:false, reason:'不是合法的 JSON' }; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok:false, reason:'格式不是存档对象' };
  if (!isFinite(d.shells) || typeof d.inventory !== 'object' || typeof d.skills !== 'object'){
    return { ok:false, reason:'缺少存档字段（shells / inventory / skills）' };
  }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); }
  catch(e){ return { ok:false, reason:'写入本地存储失败' }; }
  loadGame();
  return { ok:true, reason:'导入成功' };
}

function resetToDefault(){
  const g = cloneDefaultGame();
  Object.assign(Game, g);
  if (typeof invalidateMilestones === 'function') invalidateMilestones();   // 状态整体重置：刷新成就缓存
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY+'_time');
  } catch(e){}
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
function totalOf(itemId){ return (Game.banking[itemId]||0) + (Game.inventory[itemId]||0); }
function giveItem(itemId, qty, toBank){
  qty = Math.floor(qty);
  if (!(qty > 0)) return;
  const target = (toBank ? Game.banking : Game.inventory);
  target[itemId] = (target[itemId]||0) + qty;
  Game.stats.actions++;
}
function takeItem(itemId, qty, preferBank){
  qty = Math.floor(qty);
  if (!(qty > 0)) return;
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
  window.canAfford = canAfford; window.payCost = payCost;
  window.resetToDefault = resetToDefault; window.saveGame = saveGame; window.loadGame = loadGame;
  window.sanitizeBag = sanitizeBag; window.log = log;
}
