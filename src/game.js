// ===== 活动逻辑：采集 / 制作 / 祠祀 / 观象 / 卜筮 / 五行战斗 / 御使 / 主循环 =====

// ---------- 基础辅助 ----------
function roll(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function chance(p){ return Math.random() < p; }
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function gameTime(){ return Game.stats.time; }

// ---------- 地图 / 区域 ----------
// 索引优化：WORLD 构建后不再变动，把「线性扫 14 区域 × 250 节点」的查找
// 降为 O(1) 查表（nodeOf/regionOf 在采集/移动/讨伐等热路径上频繁调用）。
let _nodeIndex = null, _regionIndex = null;
function ensureWorldIndex(){
  if (_nodeIndex) return;
  _nodeIndex = new Map(); _regionIndex = new Map();
  for (const r of WORLD.regions){
    for (const n of r.nodes){ _nodeIndex.set(n.id, n); _regionIndex.set(n.id, r); }
  }
}
function regionOf(nodeId){
  ensureWorldIndex();
  return _regionIndex.get(nodeId) || null;
}
function nodeOf(nodeId){
  ensureWorldIndex();
  return _nodeIndex.get(nodeId) || null;
}
function regionUnlocked(r){ return levelOf('yudi') >= r.unlockLevel; }
function nodeUnlocked(n){
  if (levelOf('yudi') < n.unlockLevel) return false;
  if (n.hazard && (n.hazard.type === '不可以上') && levelOf('lvxian') < n.unlockLevel) return false;
  return true;
}
function nodeLockReason(n){
  if (levelOf('yudi') < n.unlockLevel) return `需舆地 ${n.unlockLevel} 级`;
  if (n.hazard && n.hazard.type === '不可以上' && levelOf('lvxian') < n.unlockLevel) return `「不可以上」需履险 ${n.unlockLevel} 级`;
  return '';
}
// 前往节点（首次到访给舆地/履险经验）
function travelTo(nodeId){
  const n = nodeOf(nodeId);
  if (!n) return false;
  if (!nodeUnlocked(n)){ UI && UI.toast('🔒 ' + nodeLockReason(n)); return false; }
  const first = !Game.map[nodeId];
  Game.node = nodeId;
  Game.map[nodeId] = true;
  if (first){
    gainXp('yudi', 20 + n.unlockLevel);
    gainXp('lvxian', 15 + n.unlockLevel);
    addRecord(nodeId, 1);
    log(`🗺️ 初至${n.name}（${n.chapter}）`, 'yudi', 'skill');
    UI && UI.toast(`🗺️ 初至 ${n.name}`);
  }
  saveGame();
  if (UI && UI.refreshMap) UI.refreshMap();
  return true;
}
window.travelTo = travelTo; window.nodeOf = nodeOf; window.regionOf = regionOf;
window.regionUnlocked = regionUnlocked; window.nodeUnlocked = nodeUnlocked; window.nodeLockReason = nodeLockReason;

// ---------- 全局修正 ----------
// 里程碑解锁态缓存：xpMult/dmgMult/gatherSpeedMult/globalYieldBonus 与每秒的
// checkMilestoneToast 都会全量执行 17 个 check（含数次 Object.keys+filter 分配）。
// 缓存键取「游戏秒 + 脏标记」：onSecond 每秒推进使缓存自然失效，
// 读档 / 离线结算等跳变状态显式脏化，保证不错过新成就（最多延迟 1 游戏秒）。
let _msDirty = 0, _msCache = { key:'', out:null };
function invalidateMilestones(){ _msCache.key = ''; _msDirty++; }
function milestonesUnlocked(){
  const key = gameTime() + '|' + _msDirty;
  if (_msCache.out && _msCache.key === key) return _msCache.out;
  const out = {};
  (window.Milestones||[]).forEach(ms=>{ out[ms.id] = ms.check(); });
  _msCache.key = key; _msCache.out = out;
  return out;
}
function milestoneCount(){ const u = milestonesUnlocked(); let n=0; for(const k in u) if(u[k]) n++; return n; }
// ---------- 三签（本轮短目标） ----------
// 里程碑是长线的（一行达成、永久加成），日常还是得有「现在做什么」。
// 三签常挂三条，做完一条立刻补一条，赏贝币——不开新系统、不占行动位，
// 只是把「你这一会儿干了什么」折算成一点点回报。
function bountyLevel(){
  const n = Object.keys(Game.skills || {}).length || 26;
  return Math.max(1, Math.round(totalSkillLevel() / n));
}
function bountyCounter(key){
  const s = Game.stats || {};
  if (key === 'recorded') return recordedCount();
  if (key === 'gathered') return Object.values(s.gathers || {}).reduce((a, b) => a + (b || 0), 0);
  if (key === 'bosses') return Object.keys(s.bossKills || {}).length;
  return s[key] || 0;
}
function bountyDef(id){ return (window.BOUNTIES || []).find(b => b.id === id) || null; }
// 抽一条「不在手上」的签；base 记下此刻计数，目标按综合等级缩放。
// extraExclude 用于换签：那条已经先从列表里摘掉了，得单独再排一次，
// 否则有几率原样抽回来（表现为「点换签没反应」）。
function bountyPull(extraExclude){
  const ex = (extraExclude || []).concat((Game.bounties || []).map(x => x.id));
  const pool = (window.BOUNTIES || []).filter(b => ex.indexOf(b.id) < 0);
  if (!pool.length) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const lv = bountyLevel();
  return { id: pick.id, base: bountyCounter(pick.key), target: Math.max(1, Math.round(pick.n(lv))) };
}
function bountyInit(){
  if (!Array.isArray(Game.bounties)) Game.bounties = [];
  let guard = 0;
  while (Game.bounties.length < 3 && guard++ < 12){
    const b = bountyPull();
    if (!b) break;
    Game.bounties.push(b);
  }
}
function bountyProgress(b){
  const def = bountyDef(b && b.id);
  if (!def) return 0;
  return Math.max(0, bountyCounter(def.key) - (b.base || 0));
}
function bountyTick(){
  if (!Array.isArray(Game.bounties)) Game.bounties = [];
  if (!Game.bounties.length){ bountyInit(); return; }
  for (let i = 0; i < Game.bounties.length; i++){
    const b = Game.bounties[i];
    const def = bountyDef(b.id);
    if (!def){ Game.bounties.splice(i--, 1); continue; }
    if (bountyProgress(b) < b.target) continue;
    // 成了：赏贝、记数、换一条新签（抽不到就先把这条留着，别把槽位丢了）
    const pay = Math.max(1, Math.round(def.shells(bountyLevel())));
    Game.shells += pay;
    Game.stats.totalEarned += pay;
    Game.stats.bounties = (Game.stats.bounties || 0) + 1;
    log(`🎋 三签「${def.name}」已了，得贝 ${pay}`, 'gold', 'sys');
    UI && UI.toast(`🎋 签成：${def.name} · +${pay} 贝`);
    const nb = bountyPull();
    if (nb) Game.bounties[i] = nb;
    else Game.bounties[i] = { id:b.id, base:bountyCounter(def.key), target:b.target };
  }
}
// 换签：抽到做不了的那条（比如祠礼没备祭品）不能让人干卡着。
// 换是免费的，但进度从头算——这本身就是代价，不必再收钱；
// 否则刷「讨伐」这种顺手的签反而成了最优解。
function bountySwap(idx){
  if (!Array.isArray(Game.bounties) || !Game.bounties[idx]) return false;
  const old = Game.bounties[idx];
  const oldDef = bountyDef(old.id);
  const oldId = old.id;
  Game.bounties.splice(idx, 1);
  const nb = bountyPull([oldId]);
  if (nb) Game.bounties.splice(idx, 0, nb);
  else { Game.bounties.splice(idx, 0, old); return false; }
  const newDef = bountyDef(nb.id);
  log(`🎋 换签：${oldDef ? oldDef.name : '旧签'} → ${newDef ? newDef.name : '新签'}（进度从头算）`, 'sys', 'sys');
  UI && UI.toast(`🎋 换签：${newDef ? newDef.name : ''}`);
  UI && UI.renderSkills && UI.currentTab === 'skills' && UI.renderSkills();
  return true;
}
window.bountyLevel = bountyLevel; window.bountyCounter = bountyCounter;
window.bountySwap = bountySwap;
window.bountyInit = bountyInit; window.bountyTick = bountyTick;
window.bountyProgress = bountyProgress; window.bountyDef = bountyDef;

function checkMilestoneToast(){
  const unlocked = milestonesUnlocked();
  if (!Game.stats.seenMilestones || typeof Game.stats.seenMilestones !== 'object') Game.stats.seenMilestones = {};
  const seen = Game.stats.seenMilestones;
  let newly = 0;
  (window.Milestones||[]).forEach(ms=>{
    if (unlocked[ms.id] && !seen[ms.id]){
      seen[ms.id] = true; newly++;
      log(`🏅 长线成就：${ms.name} —— ${ms.bonus}`, 'gold', 'sys');
      UI && UI.toast(`🏅 ${ms.name}\n${ms.bonus}`);
      if (typeof FX !== 'undefined' && FX.burst) FX.burst((window.innerWidth||300)/2, (window.innerHeight||500)/3, '🏅', 14);
    }
  });
  if (newly) saveGame();
  return newly;
}
window.milestonesUnlocked = milestonesUnlocked; window.milestoneCount = milestoneCount;
window.checkMilestoneToast = checkMilestoneToast;

// 御使槽内异兽的被动加成汇总
// 缓存优化：一次行动内会被 xpMult/gatherSpeedMult/globalYieldBonus 等调用 4-6 次；
// 以「槽位序 + 异兽 id + 著录阶」为签名缓存，签名不变直接复用（调用方均为只读）。
let _dbCache = { sig:'', out:null };
function deployedBonuses(){
  const keys = Object.keys(Game.deployed);
  let sig = '';
  for (const k of keys){
    const id = Game.deployed[k];
    sig += k + id + ((Game.records[id]||{}).tier||0) + ';';
  }
  // 招贤馆会整体放大，必须进缓存键——否则造好之后仍拿旧值（建了等于没建）
  if (Game.buildings && Game.buildings.zhaoxianguan) sig += 'Z';
  if (_dbCache.out && _dbCache.sig === sig) return _dbCache.out;
  const b = { gatherSpeed:0, xp:0, farmSpeed:0, div:0, hp:0, def:0, offline:0, trade:0, dmg:0, loot:0, cookQty:0, build:0, yield:0, heal:0 };
  for (const k in Game.deployed){
    const beast = Monsters[Game.deployed[k]];
    if (!beast) continue;
    const def = BEAST_BUFFS[beast.id] || genericBeastBuff(beast);
    const scale = 0.6 + 0.1 * ((Game.records[beast.id]||{}).tier||0);
    for (const key in def) if (key !== 'label' && typeof def[key] === 'number') b[key] += def[key] * scale;
  }
  // 招贤馆：御使增益整体 +15%。它放大的是「所有」御使条目，
  // 所以放在汇总之后统一乘，而不是逐条改 BEAST_BUFFS。
  if (Game.buildings && Game.buildings.zhaoxianguan){
    for (const k in b) if (typeof b[k] === 'number') b[k] *= 1.15;
  }
  _dbCache.sig = sig;
  _dbCache.out = b;
  return b;
}
// 未单独设计的异兽：按类目给一份基础增益（西山异兽众多，各有其用）
function genericBeastBuff(beast){
  if (beast.category === '鸟') return { label:'驭鸟', xp:0.02 };
  if (beast.category === '水族') return { label:'驭水族', def:1 };
  return { label:'驭兽', hp:0.02 };
}
// ---------- 轮回（转生） ----------
// 三层各管一件事，互不覆盖：
//   · 等级　　→ 本轮练到哪（解锁山/怪/配方），转生归 1
//   · 修为　　→ stats.totalXp，终身累计，永不清零，将来排行榜排这个
//   · 轮回印　→ 转生次数换的永久乘区，永不清零，越转越快
// 转生只重置「技艺等级与经验」。著录、图鉴、成就、装备、贝币、地图、建筑、御使一概不动——
// 清掉那些不是让玩家重来一遍，是让他直接弃游。舆地与履险也保留：走过的路不会忘。
const REBIRTH_KEEP = { yudi: true, lvxian: true };
function rebirthCount(){ return (Game.rebirth && Game.rebirth.count) || 0; }
function rebirthGain(){ return rebirthCount() * TUNING.REBIRTH.XP; }      // 修为乘区
function rebirthYield(){ return rebirthCount() * TUNING.REBIRTH.YIELD; } // 采获加成
function rebirthStartLevel(){
  return Math.min(TUNING.REBIRTH.START_CAP, rebirthCount() * TUNING.REBIRTH.START_PER);
}
// ---------- 二周目难度带（卷二） ----------
// 三条硬约束决定了它长这样：
//   1. 玩家技艺止于九九，战力自此封顶——所以带是固定高度（82–90），不随轮次往上加级；
//   2. 同一只异兽的更强一遍，**不改 id、不进图鉴**——著录、六凶、御使仍认原来那一只，
//      否则 316 只异兽的分母与「著录 n 种」的成就全要重算；
//   3. 轮回印只加修为与采获，不给伤害——所以奖励也要跟着带一起抬（经验 ×1.8、掉落 ×1.3），
//      否则卷二只是「更难」，玩家没有理由踏进去。
function bandUnlocked(){ return rebirthCount() >= 1 && levelOf('taofa') >= TUNING.MAX_LEVEL; }
function bandOn(){ return bandUnlocked() && Prefs.band !== false; }
function bandLevelOf(m){
  const t = Math.floor(((m.needLvl || 1) - 1) / TUNING.CYCLE.TIER);
  return TUNING.CYCLE.BASE + Math.max(0, Math.min(TUNING.CYCLE.TIER - 1, t));
}
function bandSoft(){ return 1 + TUNING.CYCLE.SOFT * Math.max(0, rebirthCount() - 1); }
// 卷二形态：由原兽派生，缓存键里带轮次，转生后自然重算，不必手动失效。
const _bandCache = new Map();
function foeOf(m){
  if (!m || !bandOn() || m.boss) return m;      // 六凶与神祇不套带：它们本是手调的关卡
  // 旧地重游（v1.31.29）：已巡礼的山系在卷二里再给 10% 经验——
  // 走遍一系本来只是「完成度」，现在也是卷二里值得回头打的理由。
  // ⚠️ 巡礼状态必须进缓存键：否则走遍该系的同一帧里，卡片还挂着旧倍率。
  const pil = (typeof regionPilgrim === 'function') && m.regionId
    ? !!(regionPilgrim(m.regionId) || {}).full : false;
  const key = m.id + '@' + rebirthCount() + (pil ? '#P' : '');
  const hit = _bandCache.get(key);
  if (hit) return hit;
  const lv0 = Math.max(1, m.needLvl || 1), bl = bandLevelOf(m), soft = bandSoft();
  // 三维与经验一律「先除回标准曲线、再乘回标准曲线」——保留这只兽自身的倍率，换掉它的等级。
  // 不这么做就会出事：白猿原在 1 级、气血 15，若按 (82/1)^1.26 放大，到了带里是 3900 气血，
  // 比 81 级的山还厚三倍；按标准曲线折算则为 1250，与带里其它兽齐平，该兽「皮厚」的部分仍保留。
  const std = L => (typeof beastStat === 'function')
    ? beastStat(L, 'normal')
    : { hp: 10 + 4.6 * Math.pow(L, 1.26), atk: 2 + 0.62 * Math.pow(L, 1.02),
        def: 0.5 + 0.4 * Math.pow(L, 1.1), xp: 6 + 4.4 * Math.pow(L, 1.36) };
  const s0 = std(lv0), s1 = std(bl);
  const keep = key => (m[key] || 1) / Math.max(1, s0[key]);
  // 带内坡：原山越靠后，卷二里越硬——9 级带的等级差只值一成气血，不加坡就成了「走遍全书一个手感」
  const ramp = 1 + TUNING.CYCLE.RAMP * Math.floor(((m.needLvl || 1) - 1) / TUNING.CYCLE.TIER);
  const f = Object.assign({}, m, {
    name: '卷二·' + m.name,
    bandLv: bl,
    needLvl: TUNING.MAX_LEVEL,     // 门槛与掉落公式仍按九九算，不因带等级虚高而失准
    hp: Math.round(s1.hp * keep('hp') * soft * ramp),
    atk: Math.round(s1.atk * keep('atk') * soft * ramp),
    def: Math.round(s1.def * keep('def') * soft * ramp),
    xp: Math.max(1, Math.round(s1.xp * keep('xp') * TUNING.CYCLE.XP * soft * (pil ? (TUNING.CYCLE.PILGRIM_XP || 1) : 1))),
    loot: (m.loot || []).map(([id, p, q]) => [id, Math.min(0.95, p * TUNING.CYCLE.LOOT), q]),
    band: true,
    pilgrim: pil,
  });
  _bandCache.set(key, f);
  return f;
}
// ---------- 会员（预留，v1.31.19） ----------
// 现在没有账号系统，所以这里只有「读一份权益快照 + 一处取加成」两件事：
//   · 快照在 Game.member（由账号层登录后写入，本地存档只读）；
//   · 所有加成都走 memberBonus(key)，将来加档位只改 TUNING.MEMBER.TIERS 一处。
// 两条自制：会员只加时长与产出、**不加战力**（付费不该买到关卡的通过权）；
// 到期即失效（按 until 现算），不依赖任何在线校验。
const MEMBER_TIERS = TUNING.MEMBER.TIERS;
function memberTierId(){
  const m = Game.member || {};
  const id = MEMBER_TIERS[m.tier] ? m.tier : TUNING.MEMBER.DEFAULT;
  if (id === 'none') return 'none';
  if (m.until && Date.now() > m.until) return 'none';     // 到期即刻失效
  return id;
}
function memberTier(){ return MEMBER_TIERS[memberTierId()] || MEMBER_TIERS.none; }
function isMember(){ return memberTierId() !== 'none'; }
function memberBonus(key){
  const t = memberTier();
  return (t && isFinite(t[key])) ? t[key] : 0;
}
// ---------- 前世遗物 ----------
// 每转一件，由 rebirth.count 派生——**不新增存档字段**，旧档读进来转数是几就有几件。
// 加成都很小（xp / yield 各 6%，def 4%，hp 3%），是「这一卷留下了什么」的凭证，不是数值台阶。
function relicOwned(){
  const n = rebirthCount();
  return (window.RELICS || []).filter(r => n >= r.at);
}
function relicSum(key){
  let s = 0;
  for (const r of relicOwned()) if (r.bonus && r.bonus[key]) s += r.bonus[key];
  return s;
}
function bestSkillLevel(){
  let best = 0, id0 = '';
  for (const id in Game.skills){
    const lv = (Game.skills[id] || {}).level || 1;
    if (lv > best){ best = lv; id0 = id; }
  }
  return { level: best, id: id0, name: (Skills[id0] || {}).name || id0 };
}
// 轮回的凭据：任一技艺至九九。不是「总等级达标」——那会让玩家为了凑数去练用不上的技艺。
//
// ⚠️ 必须排除 REBIRTH_KEEP（舆地 / 履险）。这两门轮回时**不重置**（走过的路不忘），
// 于是它们一旦到 81，就成了永久凭据：轮回一次 → 舆地还是 81 → 立刻又能轮回，
// 每次白拿一枚轮回印（+修为 + 采获），可以无限刷。这不是理论问题，
// 一键全开之后点一次轮回就能复现（2026-10-27 报障）。
function canRebirth(){
  const need = TUNING.REBIRTH.MIN_LEVEL;
  for (const id in Game.skills){
    if (REBIRTH_KEEP[id]) continue;          // 不重置的技艺不能当凭据，否则就是无限轮回
    if (((Game.skills[id] || {}).level || 1) >= need) return true;
  }
  return false;
}
// 「最高技艺」若把舆地算进去，界面上会出现「舆地 81/81 · 差 0 级」却轮回不了的怪状；
// 这一项只算会被重置的技艺。
function bestRebirthSkill(){
  let best = 0, id0 = '';
  for (const id in Game.skills){
    if (REBIRTH_KEEP[id]) continue;
    const lv = (Game.skills[id] || {}).level || 1;
    if (lv > best){ best = lv; id0 = id; }
  }
  return { level: best, id: id0, name: (Skills[id0] || {}).name || id0 };
}
// 御使槽位由「御使」等级决定（每 10 级 +1），而轮回会把等级打回起手——
// 已入槽的异兽却留了下来。不处理的话：界面写「御使槽位（6/1）」，
// 而 `deployedBonuses()` 又把六只全算进去（看不见却生效）。
// 规则：按原顺序保留放得下的，多出来的请回著录（资格还在，随时可再入槽）。
// 田块数随「圃艺」等级长（每 12 级一块，6→9），而轮回会把等级打回起手。
// 多出来的那几块田不会自己消失：`farmTick` 遍历的是 `Game.farms` 的全部键，
// 界面只画 `farmPlots()` 块——于是 p6..p8 成了看不见却照常出产的田。
// 与御使槽位是同一类错（状态缩了，依赖它的容器没缩），所以修法也一样。
function trimFarmsToPlots(){
  const n = (typeof farmPlots === 'function') ? farmPlots() : (TUNING.FARM_MAX || 9);
  let dropped = 0;
  for (const k of Object.keys(Game.farms || {})){
    const idx = parseInt(String(k).replace(/^p/, ''), 10);
    if (!(idx >= 0) || idx >= n){ delete Game.farms[k]; dropped++; }
  }
  return dropped;
}
window.trimFarmsToPlots = trimFarmsToPlots;

function trimDeployedToSlots(){
  const slots = (typeof beastSlots === 'function') ? beastSlots() : 9;
  const ids = [];
  for (const k of Object.keys(Game.deployed || {}).sort((a, b) => Number(a) - Number(b))){
    const id = Game.deployed[k];
    if (id && !ids.includes(id)) ids.push(id);      // 成对的两槽是同一只，算一次
  }
  const next = {};
  let used = 0, dropped = 0;
  for (const id of ids){
    const need = (typeof deploySlotsNeed === 'function') ? deploySlotsNeed(id) : 1;
    if (used + need > slots){ dropped++; continue; }
    for (let i = 0; i < need; i++) next[used++] = id;
  }
  Game.deployed = next;
  return dropped;
}
window.trimDeployedToSlots = trimDeployedToSlots;

function doRebirth(){
  if (!canRebirth()) {
    return { ok:false, reason:`需任一技艺至 ${TUNING.REBIRTH.MIN_LEVEL} 级（九九圆满）` };
  }
  const totalBefore = totalSkillLevel();
  const bestBefore = bestSkillLevel();
  const count = rebirthCount() + 1;
  const now = Date.now();
  // 本轮成绩：从上次落笔（或建档）到此刻。记下来是为了让玩家能「刷新纪录」，
  // 也给将来的排行榜一个可比的「单轮耗时」维度。
  const roundStart = (Game.rebirth && Game.rebirth.startedAt) || Game.startedAt || now;
  const roundSec = Math.max(0, Math.round((now - roundStart) / 1000));
  const history = ((Game.rebirth && Game.rebirth.history) || []).slice(-9);
  history.push({ at: now, sec: roundSec, total: totalBefore, best: bestBefore.level });
  Game.rebirth = {
    count,
    at: now,
    best: Math.max((Game.rebirth && Game.rebirth.best) || 0, totalBefore),
    startedAt: now,
    history,
  };
  const startLv = Math.min(TUNING.REBIRTH.START_CAP, count * TUNING.REBIRTH.START_PER);
  const xpAt = (typeof xpForLevel === 'function') ? xpForLevel(startLv) : 0;
  for (const id in Game.skills){
    if (REBIRTH_KEEP[id]) continue;                 // 舆地 / 履险：走过的路不忘
    Game.skills[id] = { level: Math.max(1, startLv), xp: xpAt };
  }
  // 旧战斗与旧行动一并收掉：转生后打不动原来的怪，留着只会「往讨：X」空转
  Game.combat = null;
  Game.activity = null;
  Game.mobStreak = {};
  Prefs.lastHuntId = null; Prefs.lastHuntTimes = null;
  // 「再采」记的物也一并清掉：轮回后技艺归零，原来那件物多半采不动了
  Prefs.lastGatherId = null;
  autoAttack = false;
  // 御使槽位跟着等级缩了，多出来的请回著录（否则界面写「6/1」而加成照算）
  const dropped = trimDeployedToSlots();
  if (dropped) log(`🐾 御使槽位不足，${dropped} 只异兽请回著录（资格仍在，可再入槽）`, 'dim', 'sys');
  // 田块同理：圃艺回落后多出来的田不会自己消失，会变成看不见却照常出产的田
  const fallow = trimFarmsToPlots();
  if (fallow) log(`🌱 圃艺回落，${fallow} 块田已撂荒（再练上去仍可开垦）`, 'dim', 'sys');
  // 送回南山起点：当前那座山多半已打不动
  Game.node = 'nanshan-1-01';
  log(`♻️ 第 ${count} 次轮回：技艺归 ${startLv} 级，修为与著录俱在`, 'gold', 'sys');
  UI && UI.toast(`♻️ 第 ${count} 次轮回 · 起手 ${startLv} 级 · 轮回印 +${Math.round(rebirthGain()*100)}%`);
  if (typeof invalidateMilestones === 'function') invalidateMilestones();
  saveGame();
  return { ok:true, count, startLv, gain: rebirthGain(),
           totalBefore, best: bestBefore.level, bestName: bestBefore.name, roundSec };
}
// ---------- 战绩（可粘贴的一段话） ----------
// 群里对进度、报 bug 时，口述「我多少级」说不清；这里把该被比较的几个数
// 一次列全：修为（终身累计）、轮回、著录、六凶、最高强化、单轮最快。
// 也是将来排行榜要收的那几个字段——先把它们凑到一处，接口才好定。
// 自带的两个小格式化：战绩文本不该依赖界面层（fmt / fmtTime 都定义在 ui.js，
// 在 ui.js 加载之前调用就会抛 ReferenceError）。
// 显示用的数值归一（v1.31.137）：把 NaN / Infinity 变成 0。
// 为什么需要：`String(NaN)` 就是 "NaN"，会原样出现在统计页上——玩家看到 11 个 NaN
// 只会以为游戏坏了。`fmtDur(Infinity)` 更离谱，会写出「Infinity 天」。
// 为什么放在显示层而不是写入处：数值来自几十处计算结果，逐个加守卫既啰嗦又必然漏；
// 显示是最后一道关口，在这里统一归一最省事，也不会掩盖存档里的真实值。
// 注意用 Number.isFinite 而不是 `Number(v) || 0`：后者对 Infinity 返回 Infinity（真值），漏网。
function safeNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
// 统计对象整份归一：一层数值 + 一层嵌套对象（gathers / bossKills 这类计数表）。
// 只读不改：返回浅拷贝，Game.stats 本体不动。
function sanitizeStats(src){
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const k in src){
    const v = src[k];
    if (typeof v === 'number') out[k] = safeNum(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)){
      const o = {};
      for (const k2 in v) o[k2] = (typeof v[k2] === 'number') ? safeNum(v[k2]) : v[k2];
      out[k] = o;
    } else out[k] = v;
  }
  return out;
}
// 数字的唯一写法：万 / 亿。
// 曾经有两套——界面层 fmt() 用的是 K/M/B，战绩与分享文本用这里——同一笔贝币
// 在两个地方写着「12.3K」和「1.2 万」。中文游戏只该有一套，判据收在这里。
// 边界也要收：9999.96 万不该写成「10000 万」，那是 1 亿。
function fmtNum(v){
  // 用 safeNum 而不是 `Number(v) || 0`：后者对 Infinity 返回 Infinity（真值），
  // 会一路算到「Infinity 亿」印在界面上。
  v = Math.round(safeNum(v));
  const neg = v < 0;
  v = Math.abs(v);
  const trim = (str) => str.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  let out;
  if (v >= 1e8) out = trim((v / 1e8).toFixed(2)) + ' 亿';
  else if (v >= 1e4){
    const w = v / 1e4;
    out = (w >= 9999.95) ? (trim((v / 1e8).toFixed(2)) + ' 亿') : (trim(w.toFixed(1)) + ' 万');
  } else out = String(v);
  return (neg ? '-' : '') + out;
}
// 时长只有这一种写法（界面与战绩共用；ui 层的 fmtTime 转交到这里）。
// 取「两个最大单位」，整点不写零头：3600 → 「1 小时」，3660 → 「1 小时 1 分」，
// 90000 → 「1 天 1 小时」。曾经界面层没有「天」这一档，30 小时会写成「30 小时」，
// 而分享文本写「1 天 6 小时」——同一段时长两个说法。
function fmtDur(sec){
  sec = Math.max(0, Math.round(safeNum(sec)));   // 同上：`sec || 0` 挡不住 Infinity
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600);
  const m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (d) return h ? `${d} 天 ${h} 小时` : `${d} 天`;
  if (h) return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  if (m) return s ? `${m} 分 ${s} 秒` : `${m} 分`;
  return `${s} 秒`;
}

// 最高强化：既要看行囊里那一档，也要看**身上穿着的实例**。
// 曾只扫 Game.enhance（行囊表），于是「身上一把 +25、行囊空」的玩家在统计页
// 与战绩卡上看到的是「最高强化 +0」——装备按件强化之后这里必须跟着改。
function bestEnhance(){
  let best = { id:null, lv:0 };
  const consider = (id, lv) => { if (lv > best.lv) best = { id, lv }; };
  for (const id in (Game.enhance || {})) consider(id, Game.enhance[id] || 0);
  for (const g of (Game.packGear || [])) if ((g.enh | 0) > 0) consider(g.id, g.enh | 0);
  for (const slot in (Game.gear || {})){
    const g = Game.gear[slot];
    if (g && (g.enh | 0) > 0) consider(g.id || slot, g.enh | 0);
  }
  return best;
}
function shareText(){
  const M = (typeof GAME_META !== 'undefined') ? GAME_META : { name:'山海经 · 著录', version:'—' };
  const rec = recordedCount(), total = Object.keys(CODEX || {}).length;
  const six = (typeof SIX_BEASTS !== 'undefined' ? SIX_BEASTS : []).filter(id => (Game.stats.bossKills || {})[id]).length;
  const bossAll = Object.values(Monsters).filter(m => m.boss).length;
  const bossDone = Object.values(Monsters).filter(m => m.boss && (Game.stats.bossKills || {})[m.id]).length;
  const hist = (Game.rebirth && Game.rebirth.history) || [];
  const fastest = hist.length ? hist.reduce((a, b) => (b.sec < a.sec ? b : a), hist[0]) : null;
  const be = bestEnhance();
  const who = be.id ? (Items[be.id] || {}).name || be.id : '';
  const line = (k, v) => `${k}　${v}`;
  return [
    `《${M.name}》 v${M.version}`,
    '————————————',
    line('修为', fmtNum(Game.stats.totalXp || 0) + (rebirthCount() ? `　第 ${rebirthCount() + 1} 卷` : '')),
    line('技艺', `总 ${totalSkillLevel()} 级`),
    line('著录', `${rec} / ${total} 条`),
    line('六凶', `${six} / 6　·　凶神 ${bossDone} / ${bossAll}`),
    be.lv ? line('最高强化', `+${be.lv}　${who}`) : line('最高强化', '尚无'),
    fastest ? line('单轮最快', fmtDur(fastest.sec)) : line('单轮最快', '尚未轮回'),
    line('在册', fmtDur(Game.stats.time || 0)),
    '————————————',
    [M.group ? `同好群 ${M.group}` : '', M.site || ''].filter(Boolean).join('　·　'),
  ].join('\n');
}
window.shareText = shareText; window.bestEnhance = bestEnhance;

window.rebirthCount = rebirthCount; window.rebirthGain = rebirthGain;
window.rebirthYield = rebirthYield;
window.relicSum = relicSum; window.relicOwned = relicOwned;
window.rebirthStartLevel = rebirthStartLevel; window.canRebirth = canRebirth;
window.doRebirth = doRebirth; window.bestSkillLevel = bestSkillLevel;
window.bestRebirthSkill = bestRebirthSkill;

function xpMult(){
  let m = 1;
  (window.Milestones||[]).forEach(ms=>{ if (ms.xp && ms.check()) m += ms.xp; });
  m += deployedBonuses().xp;
  if (Game.buildings.cangshuge) m += 0.10;          // 藏书阁：修行经验 +10%
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'xp') m += Game.buff.def.xpBonus || 0;
  m += rebirthGain();                               // 轮回印：越转越快，不封顶
  m += relicSum('xp');                              // 前世遗物：每卷一缕旧学
  m += memberBonus('xp');                           // 会员：修行经验
  if (Game.gear.charm && Game.gear.charm.xpBonus) m += Game.gear.charm.xpBonus;     // 泰逢璜 / 当扈符：佩之修学
  return m;
}
function dmgMult(){
  let m = 1;
  (window.Milestones||[]).forEach(ms=>{ if (ms.dmg && ms.check()) m += ms.dmg; });
  m += deployedBonuses().dmg;
  m += omenMod('dmg');               // 有兵之兆（凫徯 / 朱厌 / 大鹗…）：伤害 -15%
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'all' && Game.buff.def.dmg) m += Game.buff.def.dmg;
  if (Game.gear.charm && Game.gear.charm.dmgBonus) m += Game.gear.charm.dmgBonus;   // 帝女之珮：风雨之势
  return m;
}
function defBonus(){
  let b = deployedBonuses().def;
  if (Game.gear.charm && Game.gear.charm.defBonus) b += Game.gear.charm.defBonus;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'def') b += Game.buff.def.def;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'all' && Game.buff.def.def) b += Game.buff.def.def;
  return b;
}
// 精卫填海的段奖励：永久抬高采集（「东海渐浅一分」不只是文案）。
// 只算已领的段，读档后照样生效——段记录在 Game.grow.jingwei.segs。
function jingweiGatherBonus(){
  const site = (typeof GROW_SITES !== 'undefined') ? GROW_SITES.jingwei : null;
  if (!site || !Array.isArray(site.segments)) return 0;
  const st = (Game.grow && Game.grow.jingwei) || null;
  if (!st || !Array.isArray(st.segs)) return 0;
  let b = 0;
  for (const seg of site.segments) if (st.segs.indexOf(seg.at) >= 0) b += (seg.gather || 0);
  return b;
}
function gatherSpeedMult(){
  let m = 1 + deployedBonuses().gatherSpeed;
  m += jingweiGatherBonus();
  (window.Milestones||[]).forEach(ms=>{ if (ms.gather && ms.check()) m *= (1 + ms.gather); });
  if (Game.gear.charm && Game.gear.charm.gatherBonus) m += Game.gear.charm.gatherBonus;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'gather') m += Game.buff.def.gather;
  m += omenMod('gather');            // 长右「大水」：采集效率 -20%
  return Math.max(0.3, m);
}
function farmSpeedMult(){
  let m = 1 + deployedBonuses().farmSpeed;
  if (Game.gear.charm && Game.gear.charm.farmBonus) m += Game.gear.charm.farmBonus;
  return m;
}
function divMult(){
  let m = 1 + deployedBonuses().div;
  if (Game.gear.charm && Game.gear.charm.divBonus) m += Game.gear.charm.divBonus;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'div') m += Game.buff.def.div;
  m += omenMod('divine');           // 酸与「有恐」：卜筮失准 -30%
  return Math.max(0.4, m);
}
function tradeMult(){
  let m = 1 + deployedBonuses().trade + Math.min(0.20, levelOf('shanglv')*0.005);
  if (Game.buildings.shichan) m += 0.05;
  m += omenMod('trade');             // 鴸「放士」：商旅收益 -10%
  return Math.max(0.5, m);
}
function globalYieldBonus(){
  let b = 0;
  (window.Milestones||[]).forEach(ms=>{ if (ms.yield && ms.check()) b += ms.yield; });
  b += deployedBonuses().yield;
  if (Game.buildings.zhai) b += 0.03;   // 柴栅：结木为栅，以固所获
  b += omenMod('yield');             // 凤皇「天下安宁」：采获 +15%
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'all' && Game.buff.def.yield) b += Game.buff.def.yield;
  b += rebirthYield();               // 轮回印：采获随转数递增
  b += relicSum('yield');            // 前世遗物
  b += memberBonus('yield');         // 会员：采获
  if (Game.gear.charm && Game.gear.charm.yieldBonus) b += Game.gear.charm.yieldBonus; // 丰山之光 / 文鳐符：佩之所获必丰
  return b;
}
function isWise(){                       // 灌灌「佩之不惑」
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'wise') return true;
  if (Game.gear.charm && Game.gear.charm.wise) return true;
  return !!Game.stats.omens.guanguan;
}
function offlineEff(){
  let e = TUNING.OFFLINE.EFF_BASE + TUNING.OFFLINE.EFF_PER * Math.min(6, Math.floor(maxSkillLevel()/10));
  (window.Milestones||[]).forEach(ms=>{ if (ms.offlineEff && ms.check()) e += ms.offlineEff; });
  if (Game.buildings.canglin) e += 0.05;
  if (Game.buildings.shanhaige) e += 0.05;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'offline') e += Game.buff.def.offline;
  e += deployedBonuses().offline;
  e += omenMod('offline');              // 猾褢「大繇」：离线收益 -25%
  e += observeEffBonus();               // 观象：看得越多，离线结算越实
  e += memberBonus('offlineEff');       // 会员：离线效率
  // 会员与观象同时把效率上限抬一档：满级玩家的效率本就贴着 0.85，
  // 只加数值等于卖了/送了个空气。
  return clamp(e, 0.1, TUNING.OFFLINE.EFF_MAX + memberBonus('offlineEff') + observeEffBonus());
}
// 观象完成数（观瑞另算——瑞羽给的是吉兆，不该算进"看了多少处山川"）
function observedObserveCount(){
  const obs = Game.observed || {};
  return Object.keys(obs).filter(k => obs[k] && OBSERVE_SITES[k] && OBSERVE_SITES[k].kind === '观象').length;
}
// 观象的第二个用处：24h 基线之后，它不再负责"延长离线"，改负责"离线结算得多实"。
// 阶梯取「最大的 n ≤ 已完成数」，所以只是加一档、不是逐处叠加。
function observeEffBonus(){
  const n = observedObserveCount();
  let v = 0;
  for (const s of (TUNING.OBSERVE ? TUNING.OBSERVE.EFF_STEPS : [])) if (n >= s.n) v = s.v;
  return v;
}
function offlineCapHours(){
  let h = TUNING.OFFLINE.CAP_H;
  if (Game.buildings.canglin) h += 2;
  if (Game.buildings.tuku) h += 1;      // 土窟：因势窟土，以庇风雨
  if (Game.buildings.shanhaige) h += 3;  // 山海阁：藏山海之图
  h += Object.values(Game.observed||{}).filter(Boolean).length;   // 每处观象 +1h
  h += memberBonus('offlineH');         // 会员：时长（基线 24h + 档位）
  // 长线成就里的「离线上限 +1h」原先只有文案、没人读——三谷观象做完，
  // 里程碑亮着「已达成」，上限却没动。这里补上。
  (window.Milestones||[]).forEach(ms=>{ if (ms.offlineCap && ms.check()) h += ms.offlineCap / 3600; });
  return h;
}
// 祭祀经验加成（西山百神「祭祀效率 +20%」）——同为里程碑字段，此前同样只写在文案里
function jisiBonus(){
  let b = 0;
  (window.Milestones||[]).forEach(ms=>{ if (ms.jisi && ms.check()) b += ms.jisi; });
  return b;
}
function maxSkillLevel(){
  let m = 1;
  for (const id in Game.skills) if (Game.skills[id].level > m) m = Game.skills[id].level;
  return m;
}
window.xpMult = xpMult; window.dmgMult = dmgMult; window.defBonus = defBonus;
window.jisiBonus = jisiBonus;
window.gatherSpeedMult = gatherSpeedMult; window.farmSpeedMult = farmSpeedMult;
window.divMult = divMult; window.tradeMult = tradeMult; window.globalYieldBonus = globalYieldBonus;
window.isWise = isWise; window.offlineEff = offlineEff; window.offlineCapHours = offlineCapHours;
window.observeEffBonus = observeEffBonus; window.observedObserveCount = observedObserveCount;
window.jingweiGatherBonus = jingweiGatherBonus;
window.maxSkillLevel = maxSkillLevel; window.deployedBonuses = deployedBonuses;

// ---------- 征兆系统 ----------
// 征兆落地：真正写进 omens 表。与「预知」分开，是因为烽火台会让凶兆先在
// 烽烟里挂一会儿——预知归预知，生效归生效。
function applyOmen(id, soft, silent){
  const def = OMENS[id];
  if (!def) return false;
  if (def.dur > 0){
    const existing = Game.omens.find(o=>o.id===id);
    if (existing){ existing.until = Math.max(existing.until, gameTime()+def.dur); }
    else Game.omens.push({ id, until: gameTime()+def.dur, soft });
  }
  Game.stats.omens[id] = true;
  const mark = def.polarity === '凶' ? '🔴' : def.polarity === '吉' ? '🟢' : '🟡';
  if (!silent){
    log(`${mark} 征兆·${def.type}：${def.desc}（${def.beast}）`, def.polarity==='凶'?'bad':'gold', 'omen');
    UI && UI.toast(`${mark} 征兆·${def.type}\n${def.desc}`);
  }
  UI && UI.renderBuffBtn && UI.renderBuffBtn();
  if (UI && UI.patchOmens) UI.patchOmens();     // 正在祠祀页时，新征兆即刻上格
  saveGame();
  return true;
}

// 烽火台的「烽烟」时长：凶兆先示警，再应验。
const FORESEE_SEC = 45;
function activateOmen(id){
  const def = OMENS[id];
  if (!def) return;
  // 征兆免疫：鵕鸟/大鹗之诛所赐；御使駮「可以御兵」御兵灾
  if (Game.omenImmune[id]) return;
  if (def.war && Object.values(Game.deployed||{}).includes('bo')) return;
  const soft = isWise() ? 0.5 : 1;                     // 灌灌「不惑」：凶兆减半

  // 烽火台：凶兆不即时落地，先举烽。四十五秒够收手、换目标，或先备禳解之料。
  // 此前这座建筑的文案写着「征兆可提前预知」，实现里只有「之害减半」——
  // 说的和做的是两件事，这里把「预知」补上。
  if (Game.buildings && Game.buildings.fenghuotai && def.polarity === '凶' && def.dur > 0){
    Game.omensPending = Game.omensPending || [];
    const at = gameTime() + FORESEE_SEC;
    const p = Game.omensPending.find(o => o.id === id);
    if (p) p.at = Math.min(p.at, at);
    else Game.omensPending.push({ id, at, soft });
    log(`🔥 烽烟：${def.type}之兆将至（${FORESEE_SEC} 秒后应验，${def.beast}）`, 'dim', 'omen');
    UI && UI.toast(`🔥 烽烟起\n${def.type}之兆将于 ${FORESEE_SEC} 秒后应验`);
    UI && UI.renderBuffBtn && UI.renderBuffBtn();
    if (UI && UI.patchOmens) UI.patchOmens();
    saveGame();
    return;
  }
  applyOmen(id, soft);
}
function omenMod(key){
  let m = 0;
  for (const o of Game.omens){
    const def = OMENS[o.id];
    if (!def || def[key] === undefined) continue;
    m += def[key] * (o.soft || 1);
  }
  // 烽火台「征兆可提前预知」：既已望见烽烟，凶兆之害减半（吉兆不受影响）。
  // 此前这座建筑只有文案、没有任何数值出口。
  if (m < 0 && Game.buildings && Game.buildings.fenghuotai) m *= 0.5;
  return m;
}
function tickOmens(){
  const t = gameTime();
  let changed = false;
  // 烽烟到时：该应验的应验
  if (Game.omensPending && Game.omensPending.length){
    for (let i=Game.omensPending.length-1; i>=0; i--){
      const p = Game.omensPending[i];
      if (p.at > t) continue;
      Game.omensPending.splice(i,1);
      applyOmen(p.id, p.soft);
      changed = true;
    }
  }
  for (let i=Game.omens.length-1; i>=0; i--){
    if (Game.omens[i].until <= t){ Game.omens.splice(i,1); changed = true; }
  }
  if (changed){ saveGame(); UI && UI.renderBuffBtn && UI.renderBuffBtn(); if (UI && UI.patchOmens) UI.patchOmens(); }
}
// 禳解：消耗白菅与稻米，提前禳除凶兆
function exorcise(){
  const xiong = Game.omens.filter(o=>OMENS[o.id] && OMENS[o.id].polarity === '凶');
  if (!xiong.length){ UI && UI.toast('当前无凶兆可禳'); return false; }
  const cost = [['jian',3],['dao',3]];
  if (!canAfford(cost)){ UI && UI.toast('禳解需 白菅×3、稻米×3'); return false; }
  payCost(cost);
  const removed = xiong.map(o=>OMENS[o.id].type);
  Game.omens = Game.omens.filter(o=>!(OMENS[o.id] && OMENS[o.id].polarity === '凶'));
  gainXp('jisi', 60);
  log(`🕯️ 禳解凶兆：${removed.join('、')}`, 'good', 'sys');
  UI && UI.toast(`🕯️ 已禳除：${removed.join('、')}`);
  UI && UI.renderBuffBtn && UI.renderBuffBtn();
  saveGame();
  return true;
}
window.activateOmen = activateOmen; window.applyOmen = applyOmen; window.omenMod = omenMod;
window.tickOmens = tickOmens; window.exorcise = exorcise; window.FORESEE_SEC = FORESEE_SEC;

// ---------- 药饵 / 进食 ----------
function tickBuffs(dt){
  if (!Game.buff) return;
  Game.buff.remaining -= dt;
  if (Game.buff.remaining <= 0){
    log(`⌛ ${Game.buff.def.name} 之效已过`, 'gold', 'sys');
    Game.buff = null;
    UI && UI.renderBuffBtn && UI.renderBuffBtn();     // 书脊上的增益计数随之归零
  }
}
function useConsumable(itemId){
  const it = Items[itemId];
  if (!it) return false;
  const invQty = Game.inventory[itemId]||0;
  if (invQty <= 0){ UI && UI.toast('行囊中没有此物'); return false; }
  if (it.heal){ // 食物：即时回血
    // 气血只存在于战斗态（Game.combat.playerHp），非战时没有可回的血。
    // 原先照样扣物品、照样弹「回血 40」——玩家白丢一块肉，界面还说回了。
    // 这里不扣物，直说留待战时用（战斗结束后气血本就回满，无需常驻血量）。
    if (!Game.combat){
      UI && UI.toast(`🍖 未在战中，气血自复；${it.name}留待战时再用`);
      return false;
    }
    Game.inventory[itemId]--;
    if (Game.inventory[itemId]<=0) delete Game.inventory[itemId];
    {
      const heal = healAmount(it);
      Game.combat.playerHp = Math.min(playerMaxHp(), Game.combat.playerHp + heal);
      UI && UI.floatText(playerEl(), `+${heal} ❤️`, '#58b368');
    }
    log(`🍖 食${it.name}${it.effect?`，${it.effect}`:''}`, 'good', 'sys');
    UI && UI.toast(`🍖 ${it.name}${it.heal?` 回血 ${it.heal}`:''}`);
    saveGame();
    return true;
  }
  if (it.buff){ // 药剂：限时增益
    Game.inventory[itemId]--;
    if (Game.inventory[itemId]<=0) delete Game.inventory[itemId];
    // 药剂只有一格：新药直接盖掉旧药。原先静默覆盖，玩家吃了图卷再随手吃一瓶，
    // 图卷就白费了还看不出来——这里至少先说一声。
    const prev = Game.buff && Game.buff.def && (Game.buff.remaining || 0) > 0 ? Game.buff : null;
    if (prev && prev.itemId !== itemId){
      const pn = (Items[prev.itemId] || prev.def || {}).name || '前一种药';
      log(`⚠ ${pn} 的效果被 ${it.name} 取代`, 'sys', 'sys');
      UI && UI.toast(`⚠ 覆盖了「${pn}」剩余 ${Math.round(prev.remaining/60)} 分`);
    }
    Game.buff = { itemId, def: it.buff, remaining: it.buff.dur, dur: it.buff.dur };
    log(`🧪 服${it.name}：${it.effect||''}`, 'good', 'sys');
    UI && UI.toast(`🧪 ${it.name} 生效（${it.buff.dur}s）`);
    UI && UI.renderBuffBtn && UI.renderBuffBtn();
    saveGame();
    return true;
  }
  UI && UI.toast('此物不可服用');
  return false;
}
window.useConsumable = useConsumable;

// ---------- 地理特性 ----------
// 三处山在数据里写了设定（白沙山「尽沙」、洹山「三桑百仞」、教山「冬干而夏流」），
// 此前只有 note 文案、没有机制。此处各给一个轻量效果，山志上也会标出来。
// 一候六小时（数值在 TUNING.SEASON，别在这里再写一份）
const SEASON_SEC = (typeof TUNING !== 'undefined' && TUNING.SEASON && TUNING.SEASON.SEC) || 6 * 3600;
// 「雨季 · 还有 2 时 13 分转旱季」。三处显示（顶栏 title / 山志节点标签 / 统计页季候行）
// 都调这一个函数：季节相关的文案只有一个来源，改一次三处同时跟上，不会有「顶栏说 2 时、山志说 3 时」。
function seasonLineText(){
  const wet = seasonPhase() === 1;
  const rb = Math.round(((typeof seasonRiverBonus === 'function') ? seasonRiverBonus() : 0.30) * 100);
  return (wet ? '雨季' : '旱季') + ' · 教山渔获 ' + (wet ? '+' : '−') + rb
    + '% · 还有 ' + seasonRemainText() + '转' + (wet ? '旱季' : '雨季');
}

// 季节（v1.31.124 修）：原来直接 `Math.floor(t/SEC) % 2`，而 JS 的 % 对负数返回负值——
// 读档把 time 归零之前（或旧档里 time 极小、被扣成负数时）会得到 **-1**。
// 旧消费方写的是 `seasonPhase() ? A : B`，-1 是真值 → 错判成雨季；新消费方写
// `=== 0` / `=== 1`，-1 两头都不算 → 季节见闻整季消失。两种错都很隐蔽。
// 归一到 0/1 是 helper 的责任，不该让每个消费方各写一遍防负。
function seasonPhase(){ const n = Math.floor(gameTime() / SEASON_SEC); return ((n % 2) + 2) % 2; }   // 0 旱 1 雨
function seasonName(){ return seasonPhase() ? '雨季' : '旱季'; }
// 距下次换季还有多久（秒）。界面上只说「六小时一转」是不够的——
// 玩家要去教山收渔获，正需要判断「现在出发算不算雨季」「要不要等两小时」。
// 只说周期、不说进度，这个周期信息就没法用来做计划。
// 归一到 [0, SEC]：time 可能为负（旧档 / 读档归零前），负偏移会让剩余时间超过一候。
function seasonRemainSec(){
  // time 若被污染成 NaN / Infinity（存档损坏、或某处计算溢出），取模会得到 NaN，
  // 一路传到界面上就是「NaN 分」甚至「Infinity 天」。这里直接回到「还有一整候」。
  const t = (typeof safeNum === 'function') ? safeNum(gameTime()) : gameTime();
  const off = ((t % SEASON_SEC) + SEASON_SEC) % SEASON_SEC;   // 候内已过的秒数
  return SEASON_SEC - off;
}
// 「2 时 13 分」/「47 分」/「不足 1 分」。分钟向下取整：说「还有 2 小时」时绝不能夸大，
// 宁可少说几秒，也不要让玩家按这个数去卡点却迟到。
function seasonRemainText(){
  const s = seasonRemainSec();
  if (s < 60) return '不足 1 分';
  const m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h > 0) return h + ' 时' + (m % 60 ? ' ' + (m % 60) + ' 分' : '');
  return m + ' 分';
}
function geoOf(nodeId){ return (window.SPECIAL_NODES || {})[nodeId] || null; }
function hasBeast(id){ return Object.values(Game.deployed || {}).indexOf(id) >= 0; }
function geoGatherMul(nodeId){
  const sp = geoOf(nodeId);
  if (!sp) return 1;
  let m = 1;
  if (sp.desert && !hasBeast('tuotuo')) m *= 1.25;   // 流沙滞步；橐驼「善行流沙中，知水泉所在」可代步
  if (sp.climb) m *= 1.18;                           // 三桑无枝，其高百仞——攀援费时
  return m;
}
function geoGatherBonus(nodeId){
  const sp = geoOf(nodeId);
  if (!sp) return 0;
  let b = 0;
  if (sp.climb) b += 0.10;                             // 登高而取，所得更丰
  // 冬干而夏流：雨季 +、旱季 −。数值只有 TUNING.SEASON.RIVER 一份。
  if (sp.seasonalRiver){
    const r = (typeof TUNING !== 'undefined' && TUNING.SEASON && TUNING.SEASON.RIVER) || 0.30;
    b += seasonPhase() ? r : -r;
  }
  return b;
}
// 河川季节加成。写成**函数声明**而不是 `window.seasonRiverBonus = function(){}`：
// 后者在浏览器里没问题（window 就是全局对象），但在 vm 测试上下文里 window 只是普通对象，
// 于是 game.js 内部的裸引用 `seasonRiverBonus()` 取不到，守卫 `typeof ... === 'function'`
// 静默落到硬编码的 0.30 —— 改 TUNING 后文案不变，还查不出为什么。函数声明则在文件内必然可见。
function seasonRiverBonus(){
  return (typeof TUNING !== 'undefined' && TUNING.SEASON && TUNING.SEASON.RIVER) || 0.30;
}
window.seasonPhase = seasonPhase; window.seasonName = seasonName;
window.seasonRemainSec = seasonRemainSec; window.seasonRemainText = seasonRemainText;
window.seasonLineText = seasonLineText;
// 显示层归一（sanitizeStats / safeNum）：界面与测试都要用，挂出去。
window.sanitizeStats = sanitizeStats; window.safeNum = safeNum;
// checkSeasonFlip 定义在文件后段（onSecond 旁边）。函数声明会提升，这里能直接挂。
window.checkSeasonFlip = checkSeasonFlip;
window.seasonRiverBonus = seasonRiverBonus;
window.geoGatherMul = geoGatherMul; window.geoGatherBonus = geoGatherBonus; window.hasBeast = hasBeast;

// ---------- 采集 ----------
const GATHER_TOOL = { qiaocai:'axePower', caiyu:'pickPower', yu:'netPower' };
function gatherInterval(skillId){
  const attr = GATHER_TOOL[skillId];
  const slot = attr === 'axePower' ? 'axe' : attr === 'pickPower' ? 'pick' : 'net';
  const power = (attr && Game.gear[slot]) ? (Game.gear[slot][attr]||0) : 0;
  const lvl = levelOf(skillId);
  let base;
  if (skillId === 'yu')         base = 4.5 - power*0.15 - lvl*0.02;
  else if (skillId === 'caiyao') base = 3.4 - lvl*0.025;
  else                          base = 3.6 - power*0.12 - lvl*0.025;
  base = base / Math.max(0.3, gatherSpeedMult());
  return Math.max(1.05, base);
}
// ---------- 采集判据：唯一口径（v1.31.48） ----------
// 此前「这件东西能不能在这儿采」这件事在五处各写了一遍：
//   doGather（引擎实际采）· startActivity（手动开始）· startEntryActivity（队列）
//   · gatherButtonsForNode（舆地列按钮）· settleAway（离线结算）
// 各写一遍的后果不是「多写了几行」，而是**口径走散**，实测出三个玩家能撞上的矛盾：
//   ① 越级采集：doGather 允许差 8 级内硬采（效率打折），startActivity 却硬门槛拒绝
//      —— 舆地上明明白白标着「越级 84%」可采，点下去被弹回来。
//   ② 多产地：150 件物产于多座山（玉 38 处、金 42 处），startActivity 只认 it.node
//      —— 站在另一座合法产地，点采集却会被传送回「主产地」。
//   ③ 万物山：积石之山「万物无不有焉」，引擎放行任何物，UI 却按 nodes[] 过滤，
//      —— 玩家看到的是一座「什么也采不到」的山。
// 现在统一到这两个函数：判据写一处，五个调用点全部引用。
// 判据本身沿用引擎的老口径（越级 8 级内可采、多产地皆可、万物山通吃），不改玩法，只修不一致。

// 采集技艺白名单：只有这四门是「采集」，与 GATHER_POOLS 的构建口径一致。
// ⚠️ 21 件物带 skill:'lie'（猎），但 Skills 表里没有这一门、GATHER_POOLS 也不含它
// —— 它们是异兽而非产物。万物山放开「任何物」时若不把这一关，舆地上会冒出
// 「白鷮 / 鸩 / 羚」这种没法采的按钮，点下去连技艺名都拼不出来。
const GATHER_SKILLS = ['qiaocai','caiyu','yu','caiyao'];
function isGatherSkill(skillId){
  return GATHER_SKILLS.indexOf(skillId) >= 0;
}

// 这件物的产地清单：物本身可能只写 node（主产地），也可能写 nodes[]（多产地）。
function gatherSources(it){
  if (!it) return [];
  if (Array.isArray(it.nodes) && it.nodes.length) return it.nodes;
  if (it.node) return [it.node];
  return [];
}
// 主产地（传送目的地）：多产地时取 node，其次取清单第一处。
function gatherHomeNode(it){
  if (!it) return null;
  if (it.node) return it.node;
  const s = gatherSources(it);
  return s.length ? s[0] : null;
}
// 可前往的产地：多产地时挑一处**已解锁**的山。
// 主产地未必是最近的那座——「金」的主产地是招摇之山，可它在 42 处产地里，
// 玩家此刻可能正站在一座已解锁的中山。若一律奔主产地，要么传送绕远，
// 要么主产地还锁着时直接失败（travelTo 拒绝进入未解锁的山）。
function gatherReachableNode(it){
  if (!it) return null;
  for (const n of gatherSources(it)){
    const nd = nodeOf(n);
    if (nd && nodeUnlocked(nd)) return n;
  }
  return gatherHomeNode(it);
}
// 在 nodeId 这座山能不能采这件物？
// 三条：① 产地在清单里；② 万物山（allYield）通吃；③ 主产地总在清单里（items 里 node 常常不在 nodes[] 中，
//    但主产地按定义就是产它的山，不该被判成「此地不产」）。
// ⚠️ 这里**不查山是否解锁**：解锁是「能不能前往」的事，属另一层判据。
// doGather（引擎每帧调用）与离线结算都只认「此地产不产」，把解锁塞进来会让
// 「已解锁的产出地」与「解锁条件」两件事互相干扰（测试 46.2 即栽在这）。
// 未解锁山的防护放在 startActivity：不在已解锁的产地时，传到一处走得通的产地。
function gatherAllowedAt(it, nodeId){
  if (!it || !nodeId) return false;
  const sp = (window.SPECIAL_NODES || {})[nodeId];
  if (sp && sp.allYield) return true;
  if (gatherSources(it).indexOf(nodeId) >= 0) return true;
  if (it.node === nodeId) return true;
  return false;
}
// 能不能采这件物（不论在哪座山）：等级差 8 级内即可，效率按差距衰减。
// 返回 { ok, gap, eff, why }，eff=1 表示不越级。
function gatherAllowed(it){
  if (!it || !it.skill) return { ok:false, gap:99, eff:0, why:'不是可采之物' };
  if (!isGatherSkill(it.skill)) return { ok:false, gap:99, eff:0, why:'不是可采之物' };
  const need = it.lvl || 1;
  const cur = levelOf(it.skill);
  const gap = need - cur;
  if (gap <= 0) return { ok:true, gap:0, eff:1, why:'' };
  if (gap > 8) return { ok:false, gap, eff:0, why:`需${Skills[it.skill].name} ${need} 级（至多越级 8 级）` };
  return { ok:true, gap, eff:Math.max(0.35, 1 - gap * 0.08), why:'' };
}
window.isGatherSkill = isGatherSkill; window.GATHER_SKILLS = GATHER_SKILLS;
window.gatherSources = gatherSources; window.gatherHomeNode = gatherHomeNode;
window.gatherReachableNode = gatherReachableNode;
window.gatherAllowedAt = gatherAllowedAt; window.gatherAllowed = gatherAllowed;

// ---------- 图鉴条目的产地（判据与采集同源，v1.31.49） ----------
// 图鉴「这条没录的东西去哪拿」此前只认 Items[id].node（主产地），于是 46 件物
// 明明在别的山上已经能采，图鉴却指着主产地说「需 41 级」——主产地锁着、次产地开着。
// 采集那边已经改成认 nodes[] 全集（v1.31.48），图鉴这边还停在旧口径，
// 于是同一件事在两个页面上给出两个答案。此处把口径接上：**候选产地集**。
//
// 三类条目各自的产地来源不同：
//   异兽  → 它的出没之山（Monsters[id].nodeId）
//   山川  → 条目 id 本身就是 nodeId
//   百物  → 采集物的 nodes[] 全集；非采集物（异兽素材等）退回 node
function codexSourceNodes(e){
  if (!e) return [];
  if (e.cat === '异兽'){
    const m = Monsters[e.id];
    return (m && m.nodeId) ? [m.nodeId] : [];
  }
  if (e.cat === '山川'){
    return nodeOf(e.id) ? [e.id] : [];
  }
  const it = Items[e.id];
  if (!it) return [];
  if (isGatherSkill(it.skill)) return gatherSources(it);
  return it.node ? [it.node] : [];
}
// 在候选产地里挑一处「现在能去的」：已解锁的优先，其次解锁级最低的。
// 找不到就返回 null（此物暂时无处可去）。
// v1.31.50：实现改为复用 pickReachableNode（图鉴 / 技能卡 / 材料来源共用同一挑法）。
function codexReachableNode(e){
  return pickReachableNode(codexSourceNodes(e));
}
// 图鉴里这条未录物「差几级才能去」：
//   unlocked —— 现在就能去
//   gap      —— 还差几级（取所有候选产地里最省的那个）
//   why      —— 人话理由（需舆地 N 级 / 不可上需履险 N 级）
// 面板要靠它写「需 N 级」——只报最低门槛，不报主产地那个虚高的数。
function codexReachInfo(e){
  const cands = codexSourceNodes(e);
  if (!cands.length) return { unlocked:false, gap:null, why:'暂无去处' };
  for (const id of cands){
    const nd = nodeOf(id);
    if (nd && nodeUnlocked(nd)) return { unlocked:true, gap:0, why:'' };
  }
  // 全锁：报所有候选产地里门槛最低的那一处，不报主产地那个虚高的数。
  let best = null, bestNd = null;
  for (const id of cands){
    const nd = nodeOf(id);
    if (!nd) continue;
    const lv = (typeof nd.unlockLevel === 'number') ? nd.unlockLevel : 99;
    if (best === null || lv < best){ best = lv; bestNd = nd; }
  }
  if (best === null) return { unlocked:false, gap:null, why:'暂无去处' };
  return { unlocked:false, gap:best, why:(typeof nodeLockReason === 'function') ? nodeLockReason(bestNd) : `需 ${best} 级` };
}
window.codexSourceNodes = codexSourceNodes;
window.codexReachableNode = codexReachableNode;
window.codexReachInfo = codexReachInfo;

// ---------- 舆地层的产地判据（v1.31.50） ----------
// 前面两轮把「采集」（v1.31.48）与「图鉴」（v1.31.49）的产地口径都收干净了，
// 但舆地这一层还停在旧口径上——它有两处只认 it.node（主产地），于是：
//   ① 「已著录 x/y」的分母按主产地算：238 座山的分母偏小（其中 136 座原为 0），
//      玩家在柢山采到雄黄，柢山的进度条仍是 0/0（进度条压根不出现）。
//      「金」产于 42 座山，采到一处却只给主产地那一处记数。
//   ② 「材料来源」按钮按主产地给：18 处指向锁着的山，而同一材料在别的山早就能采。
// 舆地是玩家待得最久的一页，这一层不收，前两轮的收白做。
//
// 本轮把「产地候选集」抽成一个通用判据 nodeSourceItems(itemId)：
// 采集物认 nodes[] 全集 + 主产地（nodes[] 里常常不含 node，故两个都要）；
// 非采集物（异兽素材等）退回主产地。舆地两处都改引用它。

// 一件物的产地候选集：采集物认 nodes[] 全集并补上主产地；其余退回 node。
function nodeSourceItems(itemId){
  const it = Items[itemId];
  if (!it) return [];
  if (isGatherSkill(it.skill)) {
    const s = gatherSources(it).slice();
    if (it.node && s.indexOf(it.node) < 0) s.push(it.node);
    return s;
  }
  return it.node ? [it.node] : [];
}

// 这座山可著录之物（物品侧）：主产地或 nodes[] 任一命中即算。
// 异兽不在这里——异兽按 nodeId 归属，UI 层单独加。
function nodeHasItem(nodeId){
  let total = 0, done = 0;
  for (const it of Object.values(Items)){
    if (!it) continue;
    const srcs = nodeSourceItems(it.id);
    if (srcs.indexOf(nodeId) < 0) continue;
    total++;
    if ((Game.records[it.id]||{}).count > 0) done++;
  }
  return { done, total };
}

// 某项技艺的产地候选集：把该技艺池里所有物的产地合并去重。
// 用于技能卡的「产出地」——此前只给第一件物的主产地，「金」明明产于 42 座山，
// 卡片却只写「招摇之山」。
function skillSourceNodes(skillId){
  const out = [], seen = {};
  const pool = (typeof GATHER_POOLS !== 'undefined' && GATHER_POOLS[skillId]) || [];
  for (const iid of pool){
    for (const nid of nodeSourceItems(iid)){
      if (seen[nid]) continue;
      seen[nid] = 1; out.push(nid);
    }
  }
  return out;
}

// 某件材料的产地候选集（制作类）：与 nodeSourceItems 同一口径。
function materialSourceNodes(itemId){
  return nodeSourceItems(itemId);
}

// 从候选产地里挑一处「现在能去的」：已解锁的优先，其次解锁级最低的。
// 抽出来是为了让图鉴（codexReachableNode）、技能卡（skillReachableNode）、
// 材料来源（materialReachableNode）共用同一套挑法——此前三处各写一遍，
// 又是一次「同一件事多处定义」的隐患。
function pickReachableNode(cands){
  if (!cands || !cands.length) return null;
  let best = null, bestLv = Infinity;
  for (const id of cands){
    const nd = nodeOf(id);
    if (!nd) continue;
    if (nodeUnlocked(nd)) return id;
    const lv = (typeof nd.unlockLevel === 'number') ? nd.unlockLevel : 99;
    if (lv < bestLv){ bestLv = lv; best = id; }
  }
  return best;
}
// 某项技艺「现在能去的」产地。
function skillReachableNode(skillId){
  return pickReachableNode(skillSourceNodes(skillId));
}
// 某件材料「现在能去的」产地。
function materialReachableNode(itemId){
  return pickReachableNode(materialSourceNodes(itemId));
}

window.nodeSourceItems = nodeSourceItems;
window.nodeHasItem = nodeHasItem;
window.skillSourceNodes = skillSourceNodes;
window.materialSourceNodes = materialSourceNodes;
window.pickReachableNode = pickReachableNode;
window.skillReachableNode = skillReachableNode;
window.materialReachableNode = materialReachableNode;

// ---------- 道里（里程）判据：舆地图的数据来源（v1.31.51） ----------
// 每座山系的数据里都躺着《山海经》原文的里程（`legs`，即「又东三百里，曰…」），
// 但从来没有一行代码读过它——447 座山、75,589 里，纯睡在数据里。
//
// ⚠️ 两种格式，必须先统一，否则「同一件事两处定义」的老毛病立刻复发：
//   ① 南/西/北/东四系：{ 自述里程, 分段之和, 差额, 备注, 路线:[{ id, name, direction, distance, mode, total }] }
//   ② 中山经十二经：  [{ from:'甘枣之山', to:'历儿之山', direction:'东行', distance:20, mode:'陆行', total:20 }]
// 前者用 **id** 定位山，后者用 **山名**（from/to）定位。这里一次性抹平，
// 上层（舆地图、将来的行进系统）只认一个 `regionRoad`，不再各写一遍判断。
function regionLegs(region){
  if (!region || !region.legs) return [];
  const L = region.legs;
  if (Array.isArray(L)) return L;                       // 格式②
  if (Array.isArray(L['路线'])) return L['路线'];        // 格式①
  return [];
}

// 一条经的行程表：每座山的累计里程（里）。
// 返回 [{ id, name, dist, lv, hasLegs }]，按原文顺序（即 nodes 顺序）。
// dist 为「自本经首山起累计里程」；原文未载里程时 dist 为 null（由调用方决定怎么排）。
function regionRoad(regionId){
  const region = (WORLD.regions||[]).find(r => r.regionId === regionId);
  if (!region) return [];
  const nodes = region.nodes || [];
  const legs  = regionLegs(region);
  if (!legs.length){
    return nodes.map(n => ({ id:n.id, name:n.name, dist:null, lv:n.unlockLevel||1, hasLegs:false }));
  }
  // leg 可能带 id（格式①），也可能只带 to 山名（格式②）——两种都认。
  // 累计口径：distance 是「从上一座山到这一座」的里数，逐段累加。
  let acc = 0;
  const byId = {}, byName = {};
  for (const leg of legs){
    acc += (typeof leg.distance === 'number' ? leg.distance : 0);
    const key = leg.id || null;
    if (key) byId[key] = acc;
    if (leg.to) byName[leg.to] = acc;
    // 格式①的末山常只出现在「路线」数组末尾（带 id+name），也已由 byId 覆盖
    if (!leg.id && leg.name && !leg.to) byName[leg.name] = acc;
  }
  return nodes.map(n => {
    let d = byId[n.id];
    if (d === undefined) d = byName[n.name];
    return { id:n.id, name:n.name, dist:(d === undefined ? null : d), lv:n.unlockLevel||1, hasLegs:true };
  }).map((r, i, arr) => {
    // 首山兜底：数组式（中山经）只记 from→to，首山不被任何一段指向，
    // 于是第一座山恒为 null——但「自首山起累计」的定义就是 0，不是缺数据。
    if (i === 0 && r.dist === null) r.dist = 0;
    return r;
  });
}

// 一条经的里程合计（里）；原文未载则 0。
function regionRoadLength(regionId){
  const road = regionRoad(regionId);
  let max = 0;
  for (const r of road) if (typeof r.dist === 'number' && r.dist > max) max = r.dist;
  return max;
}

// 两座山之间的路程（里）：同经可比，跨经/跨系返回 null。
// ⚠️ 五座山系各自从首山起算，原文**不载**彼此相通的里程——所以跨系不能瞎猜，
// 只能如实返回 null，由调用方（将来的行进系统）另定规则。
function roadBetween(fromId, toId){
  const a = regionOf(fromId), b = regionOf(toId);
  if (!a || !b || a.regionId !== b.regionId) return null;
  const road = regionRoad(a.regionId);
  const pa = road.find(x => x.id === fromId);
  const pb = road.find(x => x.id === toId);
  if (!pa || !pb) return null;
  if (typeof pa.dist !== 'number' || typeof pb.dist !== 'number') return null;
  return Math.abs(pb.dist - pa.dist);
}

window.regionLegs = regionLegs;
window.regionRoad = regionRoad;
window.regionRoadLength = regionRoadLength;
window.roadBetween = roadBetween;

function doGather(itemId){
  const it = Items[itemId];
  if (!it || !it.skill) return;
  if (!isGatherSkill(it.skill)) return;    // 非采集之物（异兽带 skill:'lie' 等），不可采
  const skillId = it.skill;
  // 越级采集：技能差 8 级以内仍可动手，效率按差距衰减（越 8 级 ≈ 36%）——
  // 某些技能（渔 / 药 / 圃艺）在早期山系没有低阶产物，硬门槛会把玩家钉死在
  // 「只能刷同一种」的死循环里；允许硬采，但收益明显打折，探索仍有价值。
  // 判据与 startActivity / 舆地按钮 / 离线结算共用 gatherAllowed（v1.31.48）。
  const gate = gatherAllowed(it);
  if (!gate.ok){
    Game.activity = null;
    UI && UI.toast(`🔒 ${gate.why}`);
    return;
  }
  const overEff = gate.eff;
  const special = (window.SPECIAL_NODES||{})[Game.node];
  // 产地校验（同名产物可分布多山）；积石之山「万物无不有焉」不受产地限制
  // —— 判据同样走 gatherAllowedAt（v1.31.48），多产地不再被当成「此地不产」。
  if (!gatherAllowedAt(it, Game.node)){
    const srcs = gatherSources(it);
    UI && UI.toast(`此地不产${it.name}，需往${(nodeOf(srcs[0])||{}).name||'其所'}`);
    return;
  }
  const rec = Game.records[itemId] || { count:0, tier:0 };
  // 祠礼：行祭所得是「该山系产出 +X%」。此前只管记到期时间、没人读，
  // 二十八套礼制等于花钱买一段祭祀经验 —— 这里并进采集加成，礼才有着落。
  const riteBonus = regionRiteBonus((regionOf(Game.node)||{}).regionId);
  let bonus = masteryBonus(rec.count) + globalYieldBonus() + riteBonus;
  // 大旱之兆（鱄鱼 / 颙 / 肥𧔥…）专克渔获，十三条征兆都写着 fish:-0.4，此前无人读
  if (skillId === 'yu') bonus += omenMod('fish');
  if (special && special.rareBonus) bonus += special.rareBonus;   // 积石之山：万物无不有焉
  bonus += geoGatherBonus(Game.node);                             // 地理特性：百仞之树 / 干河雨季
  bonus = Math.max(-0.4, bonus);
  let qty = 1;
  if (chance(TUNING.GATHER_DOUBLE + bonus*0.5)) qty = 2;
  if (chance(bonus*0.12)) qty += 1;
  if (overEff < 1 && qty > 1) qty = Math.max(1, Math.round(qty * overEff));   // 越级：多产概率折半
  giveItem(itemId, qty, false);
  Game.stats.gathers[skillId] = (Game.stats.gathers[skillId]||0) + 1;
  gainXp(skillId, it.xp * qty * (1 + bonus*0.5) * overEff);
  // 著录结果要往下传：现场画面里「初见」的反馈比普通收成重一档（v1.31.54）
  const recRes = recordObject(itemId, qty);
  // 山系特产：该系已巡礼时，采集有小概率带出特产（1%）。
  // 巡礼领赏给 2 件是「一次性见面礼」，这里才是持续来源——
  // 否则特产只能当收藏，配方一旦消耗就绝版。
  {
    const rid = (regionOf(Game.node) || {}).regionId;
    const pil = rid && (typeof regionPilgrim === 'function') ? regionPilgrim(rid) : null;
    if (pil && pil.full && typeof pilgrimGiftOf === 'function' && chance(0.01)){
      const sp = pilgrimGiftOf(rid);
      if (sp && sp.id !== itemId){
        giveItem(sp.id, 1, false);
        log(`🎋 此系风物：兼得 ${sp.name}`, 'gold', 'skill');
      }
    }
  }
  // 渔获兼得：𩶯魮之鱼「是生珠玉」
  const gb = (window.GATHER_BONUS||{})[itemId];
  if (gb && chance(gb.chance) && Items[gb.item]){
    giveItem(gb.item, 1, false);
    log(`✨ ${it.name}${gb.note?`——${gb.note}`:''}，兼得 ${Items[gb.item].name}`, 'gold', 'skill');
  }
  // 共生采集：鸟鼠同穴之山——渔获兼得山玉
  if (special && special.symbiosis && skillId === 'yu' && chance(special.symbiosis.chance)){
    giveItem(special.symbiosis.item, 1, false);
    log(`🐦🐀 鸟鼠同穴，渔获兼得 ${Items[special.symbiosis.item].name}`, 'gold', 'skill');
  }
  // 钦原「蠚木则枯」：昆仑之丘田地威胁事件
  if (special && special.gardenThreat && Object.keys(Game.farms).length && chance(special.gardenThreat.chance)){
    const slots = Object.keys(Game.farms);
    const victim = slots[roll(0, slots.length-1)];
    const crop = Items[Game.farms[victim].seedId];
    delete Game.farms[victim];
    log(`🐝 ${special.gardenThreat.beast}蠚木，田地${slotIdNum(victim)}之${crop?crop.name:'苗'}枯死`, 'bad', 'sys');
    UI && UI.toast(`🐝 ${special.gardenThreat.beast}蠚木则枯——一田焦枯`);
  }
  UI && UI.log(`${Skills[skillId].icon} 采得 ${it.name} ×${qty}${overEff < 1 ? `（越级 · 效 ${Math.round(overEff*100)}%）` : ''}`, skillId, 'skill');
  UI && UI.actionFeedback(skillId, it.id, qty, { first: !!(recRes && recRes.first), tierUp: !!(recRes && recRes.tierUp) });
  // 行旅见闻：低概率的小插曲（见 src/events.js）。挂在这里而不是主循环里——
  // 「刚采完一次」才是自然的叙事位置，也天然有节拍。
  if (typeof maybeEvent === 'function') maybeEvent({ kind:'gather', itemId, skillId, nodeId: Game.node });
}
// 打坐：无活可干时的默认修行（v1.31.168）。不产物资、不耗原料，只把时间凝成修为。
// 经验走 gainXp('dazuo') —— 与所有主动行动同一套记账，自然汇入 stats.totalXp（群英榜·修为）。
// 不放进 doGather 的「越级 / 产地 / 见闻」判据：打坐没有目标物，这些判据对它毫无意义。
function doMeditate(){
  if (!Game.skills.dazuo) return;          // 技能未初始化时宁可不记，也别抛
  gainXp('dazuo', TUNING.MEDITATE_XP);
}
// 境界（里程碑式）：攒够累计修为后于打坐中突破，获全局修炼效率永久加成。
function currentRealm(){
  const R = (typeof REALMS !== 'undefined') ? REALMS : [];
  return R.find(x => x.id === (Game.realm || 'lianqi')) || R[0] || { id:'lianqi', name:'炼气', need:0, bonus:0 };
}
function nextRealm(){
  const R = (typeof REALMS !== 'undefined') ? REALMS : [];
  const i = R.findIndex(x => x.id === (Game.realm || 'lianqi'));
  return R[i + 1] || null;
}
function canBreakthrough(){
  const nx = nextRealm();
  if (!nx) return false;
  return (Game.stats.totalXp || 0) >= nx.need;
}
function doBreakthrough(){
  const nx = nextRealm();
  if (!nx || (Game.stats.totalXp || 0) < nx.need) return null;
  Game.realm = nx.id;
  Game.stats.realmBreaks = (Game.stats.realmBreaks || 0) + 1;
  return nx;
}
// 著录一个对象（含阶位提升、异兽征兆触发、关联著录）
function recordObject(objId, n){
  // 学宫「著录度获取 +25%」：记录以整数计，故折算为 1/4 概率多记一次（期望 +25%），
  // 不引入小数计数。此前这座建筑同样只有文案。
  if (Game.buildings && Game.buildings.xuegong && n > 0 && typeof chance === 'function' && chance(0.25)) n += 1;
  const r = addRecord(objId, n);
  const beast = Monsters[objId];   // Monsters 以 id 为键，直接查表（原为 Object.values 全量遍历）
  if (r.first){
    gainXp('zhulu', 10);
    // 首次著录带征兆的异兽 → 触发全局事件（「见则X」）
    if (beast && beast.omen) activateOmen(beast.omen);
    // 关联著录：见鵕鸟/大鹗而知鼓与钦䲹之事
    if (beast && beast.alsoRecord) beast.alsoRecord.forEach(id=>addRecord(id, 1));
    // 鵕鸟/大鹗：击杀（著录）后免疫对应征兆
    if (objId === 'junniao'){ Game.omenImmune.junniao = true; log('🛡️ 已免疫「其邑大旱」之兆', 'gold', 'sys'); UI && UI.toast('🛡️ 免疫：其邑大旱'); }
    if (objId === 'dae'){ Game.omenImmune.dae = true; log('🛡️ 已免疫「有大兵」之兆', 'gold', 'sys'); UI && UI.toast('🛡️ 免疫：有大兵'); }
  }
  if (r.tierUp){
    const name = (CODEX[objId]||{}).name || objId;
    gainXp('zhulu', 30*(r.tier+1));
    log(`📜 著录进阶：${name} —— ${TUNING.MASTERY.NAMES[r.tier]}`, 'gold', 'skill');
    UI && UI.toast(`📜 ${name} 著录至「${TUNING.MASTERY.NAMES[r.tier]}」`);
  }
  // 首次可御使（著录至通形）的入槽引导
  if (r.tierUp && beast && !beast.boss && r.tier >= 3 && !Object.values(Game.deployed).includes(objId)){
    if (UI && UI.maybeShowDeployHint) UI.maybeShowDeployHint(beast);
  }
  return r;
}
// ---------- 收集成就：领取 ----------
// 与 Milestones 的区别就在这一步「领」：那边达成即生效，这边要玩家到图鉴页领一次。
// 领完记在 stats.claimed，随存档走；旧档没有此字段，缺省为空。
function codexAchState(a){
  if (!a) return 'locked';
  if (Game.stats.claimed && Game.stats.claimed[a.id]) return 'claimed';
  return codexDoneCount(a.cat) >= a.need ? 'claimable' : 'locked';
}
function codexAchRewardText(a){
  const r = (a && a.reward) || {};
  const parts = [];
  if (r.shells) parts.push(`${r.shells} 贝`);
  (r.items || []).forEach(([i, q]) => parts.push(`${(Items[i] || {}).name || i}×${q}`));
  return parts.join(' · ');
}
function claimCodexAch(id, quiet){
  const a = (window.CODEX_ACHIEVEMENTS || []).find(x => x.id === id);
  if (!a) return false;
  if (codexAchState(a) !== 'claimable') return false;
  Game.stats.claimed = Game.stats.claimed || {};
  Game.stats.claimed[a.id] = true;
  const r = a.reward || {};
  if (r.shells){ Game.shells += r.shells; Game.stats.totalEarned += r.shells; }
  (r.items || []).forEach(([i, q]) => { if (Items[i]) giveItem(i, q, false); });
  if (!quiet){
    log(`🏅 收集成就「${a.name}」：${codexAchRewardText(a)}`, 'gold', 'sys');
    UI && UI.toast(`🏅 ${a.name} —— ${codexAchRewardText(a)}`);
  }
  saveGame();
  return true;
}
function claimAllCodexAch(){
  let n = 0;
  (window.CODEX_ACHIEVEMENTS || []).forEach(a => { if (codexAchState(a) === 'claimable' && claimCodexAch(a.id, true)) n++; });
  if (n){
    log(`🏅 一并领取 ${n} 项收集成就`, 'gold', 'sys');
    UI && UI.toast(`🏅 已领 ${n} 项成就`);
  }
  return n;
}

window.doGather = doGather; window.recordObject = recordObject;
window.gameTime = gameTime;
window.codexAchState = codexAchState; window.codexAchRewardText = codexAchRewardText;
window.claimCodexAch = claimCodexAch; window.claimAllCodexAch = claimAllCodexAch;

// ---------- 圃艺 ----------
// 田地块数：随圃艺等级长。原先写死 6 块，练到 81 级还是 6 块——
// 圃艺是唯一「越练越没用」的技艺，练满了也只能同时种六样。
function farmPlots(){
  const base = TUNING.FARM_PLOTS || 6;
  const max = TUNING.FARM_MAX || base;
  const per = TUNING.FARM_PER || 12;
  return Math.min(max, base + Math.floor(levelOf('puyi') / per));
}
// 下一块田要多少级；已满则 0
function nextPlotLevel(){
  const n = farmPlots();
  const max = TUNING.FARM_MAX || TUNING.FARM_PLOTS || 6;
  if (n >= max) return 0;
  return (n - (TUNING.FARM_PLOTS || 6) + 1) * (TUNING.FARM_PER || 12);
}
window.farmPlots = farmPlots; window.nextPlotLevel = nextPlotLevel;
// farmTick 也导出：测试要验「撂荒之后不再出产」，只能从这条入口推进
window.farmTick = farmTick; window.trimFarmsToPlots = trimFarmsToPlots;

function farmTick(elapsed){
  const grew = [];
  const speed = farmSpeedMult();
  // 边遍历边删：先取键快照，免得漏掉排在后面的那块田（「最后一块田卡住」的成因之一）
  for (const slot of Object.keys(Game.farms)){
    const f = Game.farms[slot];
    if (!f || !f.seedId) continue;
    const seed = Items[f.seedId];
    if (!seed || !seed.crop){ delete Game.farms[slot]; continue; }
    // 存档里若留下坏值（NaN/字符串），这块田会永远「不大于 0」，既不熟也不长
    if (typeof f.remain !== 'number' || !isFinite(f.remain)) f.remain = 0;
    if (!(typeof elapsed === 'number') || !isFinite(elapsed)) elapsed = 0;
    f.remain -= elapsed * speed;
    if (f.remain <= 0){
      const crop = Items[seed.crop];
      giveItem(seed.crop, 1, false);
      Game.stats.harvests++;
      gainXp('puyi', crop.xp || 10);
      recordObject(seed.crop, 1);
      if (chance(0.25)) giveItem(f.seedId, 1, false);
      log(`🌾 田地${slotIdNum(slot)} 收获 ${crop.name}`, 'puyi', 'skill');
      UI && UI.cropGrown(slot, crop);
      delete Game.farms[slot];
      grew.push(slot);
    }
  }
  return grew;
}
function farmCatchUp(seconds){
  if (seconds > 0 && Object.keys(Game.farms).length) farmTick(seconds);
}
// 田块 key 是 p0…p8（不是 farm0），旧写法 parseInt('p8') 得 NaN，日志就写成「田地NaN 收获」
function slotIdNum(slot){ const n = parseInt(String(slot).replace(/^p/, ''), 10); return (isFinite(n) ? n : 0) + 1; }
function plantSeed(plotId, seedId, silent){
  const seed = Items[seedId];
  if (!seed || !seed.crop){ UI && UI.toast('此非嘉种'); return false; }
  if (levelOf('puyi') < (seed.lvl||1)){ UI && UI.toast(`🔒 需圃艺 ${seed.lvl} 级`); return false; }
  if ((Game.inventory[seedId]||0) <= 0){ UI && UI.toast('行囊中没有此种'); return false; }
  if (Game.farms[plotId]){ UI && UI.toast('此田已有作物'); return false; }
  Game.inventory[seedId]--;
  if (Game.inventory[seedId]<=0) delete Game.inventory[seedId];
  Game.farms[plotId] = { seedId, remain: seed.grow||10, grow: seed.grow||10 };
  saveGame();
  if (!silent) UI && UI.toast(`🌱 已植 ${seed.name}`);
  return true;
}
window.plantSeed = plantSeed; window.farmCatchUp = farmCatchUp;

// ---------- 制作 ----------
function mapRecipeSkill(type){ return RECIPE_SKILL[type] || 'zhiqi'; }
function scaleCost(cost, mult){ return cost.map(([id,q])=>[id, q*mult]); }
function processRecipe(recipe, count){
  count = Math.max(1, count||1);
  // 北次一经「生食不火」：该地不用火，燔燎(fanliao)与调鼎(diaoding)不可为
  if ((recipe.type === 'burn' || recipe.type === 'cook')){
    const rg = regionOf(Game.node);
    if (rg && String(rg.regionId).indexOf('beishan-1') === 0){
      UI && UI.toast('🔥 北次一经生食不火——此地不用火，燔燎／调鼎不可为');
      return false;
    }
  }
  if (!canAfford(scaleCost(recipe.cost, count))){ UI && UI.toast('原料不足'); return false; }
  payCost(scaleCost(recipe.cost, count));
  const skillId = mapRecipeSkill(recipe.type);
  let outQty = recipe.qty * count;
  if (recipe.type === 'cook'){ // 赤鱬「不疥」：烹饪并出
    const extra = deployedBonuses().cookQty;
    if (extra > 0 && chance(extra)) outQty += 1;
  }
  giveItem(recipe.out, outQty, false);
  Game.stats.crafts += count;
  gainXp(skillId, recipe.xp * count);
  recordObject(recipe.out, count);
  log(`✓ 制 ${Items[recipe.out].name} ×${outQty}`, 'good', 'skill');
  UI && UI.actionFeedback(skillId, recipe.out, outQty);
  if ((recipe.type === 'smith' || (recipe.type === 'fletch' && Items[recipe.out].equip)) && UI && UI.forgeShow){
    UI.forgeShow(Items[recipe.out], { heavy: !!Items[recipe.out].equip, emoji: recipe.type==='smith' ? '⚒️' : '🪶' });
  }
  return true;
}
window.processRecipe = processRecipe;

// ---------- 祠祀 ----------
// opts.silent：自动续祭用，不弹 toast（整点轮着弹一遍太吵），仍照常记 log
function performRite(riteId, opts){
  const silent = !!(opts && opts.silent);
  const rec = Recipes.find(r=>r.type==='rite' && r.out===riteId);
  const def = RITES[riteId];
  if (!rec || !def) return false;
  if (!canAfford(rec.cost)){ if (!silent) UI && UI.toast('祠礼材料不备'); return false; }
  payCost(rec.cost);
  const mult = Game.buildings.citan ? 1.5 : 1;
  gainXp('jisi', def.xp * mult * (1 + jisiBonus()));
  Game.stats.rites++;
  if (def.regionId){
    Game.rites = Game.rites || {};
    Game.rites[def.regionId] = gameTime() + def.dur;
    // 同一山系可有多套礼制（如西次一经的「婴」与「太牢·玉」大祭），
    // 光记到期时间会让 regionRiteBonus 永远取到别名第一条，大祭的加成白给。
    Game.riteOf = Game.riteOf || {};
    Game.riteOf[def.regionId] = riteId;
  }
  if (def.deity) recordObject(def.deity, 1);
  const r = def.regionId ? regionOf(def.regionId) : null;
  if (r){
    log(`🕯️ 行${Items[riteId].name}：${r.regionName}之神，此域采获 +${Math.round(def.yieldBonus*mult*100)}%（约合产量 +${riteRealYield(def.yieldBonus*mult)}%，${Math.round(def.dur/3600)} 小时）`, 'gold', 'sys');
    if (!silent) UI && UI.toast(`🕯️ ${Items[riteId].name} 已成\n${r.regionName}采获 +${Math.round(def.yieldBonus*mult*100)}%（产量约 +${riteRealYield(def.yieldBonus*mult)}%）`);
  } else {
    log(`🕯️ ${Items[riteId].name}：${(Items[riteId]||{}).note||''}`, 'gold', 'sys');
    if (!silent) UI && UI.toast(`🕯️ ${Items[riteId].name}`);
  }
  saveGame();
  return true;
}
function regionRiteBonus(regionId){
  const until = (Game.rites||{})[regionId];
  if (!until || until <= gameTime()) return 0;
  // 优先用「此刻生效的那套礼」；旧档没有 riteOf，退回按 regionId 反查
  const activeId = (Game.riteOf||{})[regionId];
  const def = (activeId && RITES[activeId]) || Object.values(RITES).find(d=>d.regionId===regionId);
  return def ? def.yieldBonus * (Game.buildings.citan ? 1.5 : 1) : 0;
}

// ---------- 续祭 ----------
// 二十八套礼制各有一小时（大祭两小时）时效，到期就断。原先只能守着时间手点，
// 挂机一晚回来增益早没了。开「续祭」后，到期前 60 秒自动再备一份同样的祭品续上。
const RITE_RENEW_LEAD = 60;      // 提前量（秒）：留出材料结算的余量，避免出现空档
function riteAutoOn(riteId){ return !!((Game.riteAuto||{})[riteId]); }
function riteState(riteId){
  const rec = Recipes.find(r=>r.type==='rite' && r.out===riteId);
  const def = RITES[riteId];
  if (!rec || !def) return null;
  const until = def.regionId ? (Game.rites||{})[def.regionId] : 0;
  const now = gameTime();
  const left = until ? Math.max(0, until - now) : 0;
  const active = !!(until && until > now) && (!Game.riteOf || !Game.riteOf[def.regionId] || Game.riteOf[def.regionId] === riteId);
  // 材料够续几次（不含「等级」这类软条件）
  let times = Infinity;
  for (const [iid, q] of rec.cost){
    const have = totalOf(iid);
    times = Math.min(times, Math.floor(have / Math.max(1, q)));
  }
  return { rec, def, left, active, times: isFinite(times) ? times : 0,
           lvOk: levelOf('jisi') >= rec.lvl, auto: riteAutoOn(riteId),
           stall: !!((Game.riteStall||{})[riteId]) };
}
// 「备料可行」的礼：能续（材料够）且祭祀等级够。列表按可续次数降序，
// 界面据此排序与计数，一并开续也走这份名单——同一套判据只写一次。
function riteReadyList(){
  const out = [];
  for (const id in RITES){
    const st = riteState(id);
    if (st && st.times > 0 && st.lvOk) out.push({ id, st });
  }
  out.sort((a, b) => (b.st.times || 0) - (a.st.times || 0));
  return out;
}
// 一并开续：只挑备料够、等级够、还没开的那几套。
// 有门槛才敢批量——一把全挂上，材料立刻见底，门人集体待料。
function openAllRites(){
  const list = riteReadyList().filter(x => !x.st.auto);
  if (!list.length) return 0;
  Game.riteAuto = Game.riteAuto || {};
  for (const x of list) Game.riteAuto[x.id] = true;
  saveGame();
  return list.length;
}
window.riteReadyList = riteReadyList; window.openAllRites = openAllRites;

function toggleRiteAuto(riteId){
  const st = riteState(riteId);
  if (!st) return false;
  Game.riteAuto = Game.riteAuto || {};
  if (st.auto){
    delete Game.riteAuto[riteId];
    if (Game.riteStall) delete Game.riteStall[riteId];
    log(`🕯️ 已停${(Items[riteId]||{}).name||riteId}之续祭`, 'dim', 'sys');
    UI && UI.toast('已停续祭');
  } else {
    if (!st.lvOk){ UI && UI.toast(`🔒 需祭祀 ${st.rec.lvl} 级`); return false; }
    Game.riteAuto[riteId] = true;
    log(`🕯️ ${(Items[riteId]||{}).name||riteId}列入续祭：到期前自动重备祭品`, 'gold', 'sys');
    UI && UI.toast('🕯️ 已开续祭\n到期前自动续上（耗同样祭品）');
    tickAutoRites();          // 若此刻已过期/未行祭，立刻补上一次
  }
  saveGame();
  return true;
}
function tickAutoRites(){
  const auto = Game.riteAuto;
  if (!auto) return;
  const ids = Object.keys(auto);
  if (!ids.length) return;
  const now = gameTime();
  for (const id of ids){
    const def = RITES[id];
    if (!def || !def.regionId){ delete auto[id]; continue; }
    const until = (Game.rites||{})[def.regionId];
    // 还有得烧，且那套礼确实是自己（同山系换了别的礼就不抢）
    if (until && until > now + RITE_RENEW_LEAD) continue;
    const rec = Recipes.find(r=>r.type==='rite' && r.out===id);
    if (!rec){ delete auto[id]; continue; }
    if (levelOf('jisi') < rec.lvl){
      delete auto[id];
      log(`🕯️ 祭祀等级不足 ${rec.lvl}，${(Items[id]||{}).name||id}续祭已停`, 'dim', 'sys');
      continue;
    }
    // 祭品不继：不关开关，转入「待料」——玩家补上材料自会续上，
    // 关掉反而要玩家重新想起去点一次。只在转入那一刻记一笔，免得每秒刷屏。
    if (!canAfford(rec.cost)){
      Game.riteStall = Game.riteStall || {};
      if (!Game.riteStall[id]){
        Game.riteStall[id] = true;
        log(`🕯️ 祭品不继，${(Items[id]||{}).name||id}续祭待料——备齐后自会续上`, 'dim', 'sys');
        if (!Game.stats.seenRiteAutoStall){
          Game.stats.seenRiteAutoStall = true;
          UI && UI.toast(`🕯️ ${(Items[id]||{}).name||id} 祭品不继\n续祭转入待料，备齐自续`);
        }
      }
      continue;
    }
    if (Game.riteStall) delete Game.riteStall[id];
    performRite(id, { silent:true });
  }
}
function riteAutoCount(){ return Object.keys(Game.riteAuto||{}).length; }
// 「产出 +30%」落在什么地方：它加的是「一次得两份 / 三份」的概率，不是直接乘件数。
// 基础期望 1 + 0.25 = 1.25 件/次，+30% 加的是 0.15 的双份概率与 0.036 的三份概率，
// 折算下来真实产量约 +15%。文案原先只说 30%，玩家行完祭发现没那么猛，只会觉得是 bug。
function riteRealYield(bonus){
  if (!(bonus > 0)) return 0;
  return Math.round((bonus * 0.5 + bonus * 0.12) / 1.25 * 100);
}
// ---------- 祠礼的账 ----------
// 「行这一趟祭到底值不值」：祭品按市价折贝币，收益按该域一小时的实采价值折。
// 面板上那行小字、docs/BALANCE.md 里那张表，都从这里出——同一套口径只写一次。
const REGION_ITEM_INDEX = {};
function regionGatherItems(regionId){
  if (REGION_ITEM_INDEX[regionId]) return REGION_ITEM_INDEX[regionId];
  const reg = (typeof WORLD !== 'undefined' ? WORLD.regions : []).find(r => r.regionId === regionId);
  const out = [];
  if (reg){
    const ids = new Set(reg.nodes.map(n => n.id));
    for (const iid in Items){
      const it = Items[iid];
      if (!it.skill || !it.value) continue;
      const ns = it.nodes || (it.node ? [it.node] : []);
      if (ns.some(n => ids.has(n))) out.push(iid);
    }
  }
  return (REGION_ITEM_INDEX[regionId] = out);
}
// 该域「一小时能采出多少贝」：取最值钱的那件可采物，按基础期望 1.25 件/次算
// （不叠精通、征兆、地力——那几项各行其是，混进来就说不清这行数字是谁的功劳）。
function regionGatherVps(regionId){
  let best = 0, bestId = null;
  for (const iid of regionGatherItems(regionId)){
    const it = Items[iid];
    if (levelOf(it.skill) + 8 < (it.lvl || 1)) continue;   // 越级 8 级以上采不动
    const v = 1.25 / gatherInterval(it.skill) * it.value;
    if (v > best){ best = v; bestId = iid; }
  }
  return { vps: best, itemId: bestId };
}
function riteWorth(riteId){
  const def = RITES[riteId];
  if (!def || !def.regionId || !def.dur) return null;
  const rec = Recipes.find(r => r.type === 'rite' && r.out === riteId);
  if (!rec) return null;
  let cost = 0;
  for (const [iid, q] of rec.cost) cost += ((Items[iid] || {}).value || 0) * q;
  const real = riteRealYield(def.yieldBonus * (Game.buildings.citan ? 1.5 : 1)) / 100;
  const { vps, itemId } = regionGatherVps(def.regionId);
  const vpsHour = vps * 3600;
  const gain = vps * def.dur * real;
  return { cost, gain, vpsHour, net: gain - cost, itemId, realPct: Math.round(real * 100),
           durH: def.dur / 3600, payback: (vps > 0 && real > 0) ? cost / (vps * real) : Infinity };
}

// 某山系此刻在供的是哪一礼（舆地页据此提示「此域产出 +X% · 余 42:10」）
// 行祭给的是看不见的百分比，玩家不翻祠礼页就不知道它还在不在供——
// 把它摆到山系名旁边，礼才有存在感。
function activeRiteOf(regionId){
  const until = (Game.rites||{})[regionId];
  if (!until || until <= gameTime()) return null;
  const id = (Game.riteOf||{})[regionId];
  const def = id && RITES[id];
  if (!def) return null;
  return { id, name: (Items[id]||{}).name || '祠礼',
           bonus: def.yieldBonus * (Game.buildings.citan ? 1.5 : 1),
           left: until - gameTime() };
}
window.performRite = performRite; window.regionRiteBonus = regionRiteBonus;
window.riteState = riteState; window.toggleRiteAuto = toggleRiteAuto;
window.tickAutoRites = tickAutoRites; window.riteAutoOn = riteAutoOn;
window.riteAutoCount = riteAutoCount; window.activeRiteOf = activeRiteOf;
window.riteRealYield = riteRealYield;
window.riteWorth = riteWorth; window.regionGatherVps = regionGatherVps;

// ---------- 制作配方的默认分类（v1.31.40） ----------
// 原先 UI 里写死停在「燔燎」：练到 70 级，每次进技能页都得先点三四下才找到要做的配方。
// 口径：能做的最高级配方在哪一栏就停在哪栏。判定放在引擎层，便于测试，
// 也让「默认」只有一处定义（UI 只负责记住玩家手动选过的分类）。
function defaultRecipeKind(){
  const kinds = Object.entries(ActionKinds).filter(([, d]) => d.mode === 'recipe');
  let byLvl = kinds.length ? kinds[0][0] : 'burn', byLvlLv = -1;
  let craftable = null, craftableLv = -1;   // 等级够 + 材料够
  let unlocked = null, unlockedLv = -1;     // 只要求等级够
  for (const [k, d] of kinds){
    const lv = levelOf(d.skill);
    if (lv > byLvlLv){ byLvlLv = lv; byLvl = k; }
    for (const r of Recipes){
      if (r.type !== k || r.lvl > lv) continue;
      if (r.lvl > unlockedLv){ unlockedLv = r.lvl; unlocked = k; }
      if (r.lvl > craftableLv && canAfford(r.cost)){ craftableLv = r.lvl; craftable = k; }
    }
  }
  // 三级兜底，顺序有讲究：
  //   1) 材料也够的最高级配方——点进去就能做，最省事；
  //   2) 等级够但材料不够——正是玩家「要去做的那件」，停在这儿才对
  //      （满级玩家背包常年缺一两味料，若因此退回第一栏，等于这个功能没做）；
  //   3) 一件都不解锁，取技艺等级最高的一栏。
  return craftable || unlocked || byLvl;
}
window.defaultRecipeKind = defaultRecipeKind;

// ---------- 山系巡礼（v1.31.24） ----------
// 41–60 级这一段只有北山三系与东山首经，既没有谒见点（原文里这几系「有神无祠」），
// 观象也稀——玩家走完新山之后没有可对齐的目标。这里给「走遍一系诸山」一个明确终点：
// 满额可领一次赏（贝 + 舆地/著录经验），既是目标也是回头补图的理由。
// 不冒充原文神祇，只记「你把这一系走完了」这件事。
function regionPilgrim(regionId){
  const r = (typeof WORLD !== 'undefined' ? WORLD.regions : []).find(x => x.regionId === regionId);
  if (!r) return null;
  const total = (r.nodes || []).length;
  const done = (r.nodes || []).filter(n => (Game.map || {})[n.id]).length;
  return { regionId, total, done, full: total > 0 && done >= total,
           claimed: !!(Game.pilgrim && Game.pilgrim[regionId]) };
}
// 山系特产：该系产出里价值最高的一件非装备物（26 系天然各不相同）。
// 不另造 26 件新物品——「特产」的意义是「这一系的代表」，而不是再加一层库存。
function pilgrimGiftOf(regionId){
  const prefix = regionId + '-';
  let unique = null, anyIn = null;
  for (const it of Object.values(Items)){
    if (!it || it.equip || !(it.value > 0)) continue;
    const nodes = it.nodes || (it.node ? [it.node] : []);
    if (!nodes.length || !nodes.some(n => String(n).indexOf(prefix) === 0)) continue;
    if (!anyIn || (it.value || 0) > (anyIn.value || 0)) anyIn = it;
    // 「特产」优先取只产在这一系的：金玉、竹箭这类遍地都有的泛称
    // 写在领赏 toast 里只会让人以为给错了东西。
    const onlyHere = nodes.every(n => String(n).indexOf(prefix) === 0);
    if (onlyHere && (!unique || (it.value || 0) > (unique.value || 0))) unique = it;
  }
  return unique || anyIn;
}
// 反查表：物品 → 它是哪个山系的特产（26×700 只算一次；详情页与统计页会反复问）
let _pilgrimGiftRev = null;
function pilgrimGiftIndex(){
  if (_pilgrimGiftRev) return _pilgrimGiftRev;
  _pilgrimGiftRev = new Map();
  for (const r of (typeof WORLD !== 'undefined' ? WORLD.regions : [])){
    const g = pilgrimGiftOf(r.regionId);
    if (g) _pilgrimGiftRev.set(g.id, r);
  }
  return _pilgrimGiftRev;
}
window.pilgrimGiftOf = pilgrimGiftOf; window.pilgrimGiftIndex = pilgrimGiftIndex;

function claimPilgrim(regionId){
  const p = regionPilgrim(regionId);
  if (!p || !p.total){ return 0; }
  if (!p.full){ UI && UI.toast(`尚有 ${p.total - p.done} 山未涉`); return 0; }
  if (p.claimed){ UI && UI.toast('此系已领过'); return 0; }
  const r = WORLD.regions.find(x => x.regionId === regionId);
  const lvl = r.unlockLevel || 1;
  const shells = 800 + lvl * 80;
  Game.pilgrim = Game.pilgrim || {};
  Game.pilgrim[regionId] = 1;
  Game.shells += shells;
  Game.stats.totalEarned += shells;
  gainXp('yudi', 300 + lvl * 30);
  gainXp('zhulu', 120 + lvl * 10);
  // 特产：该系价值最高的一件产出 ×2（不可合成、只能靠走遍这一系换来）
  const gift = pilgrimGiftOf(regionId);
  if (gift) giveItem(gift.id, 2, false);
  const giftTx = gift ? ` · 另得 ${gift.name}×2` : '';
  log(`🗺️ 山系巡礼·${r.regionName}：${p.total} 山皆涉，得贝 ${shells}${giftTx}`, 'gold', 'sys');
  UI && UI.toast(`🗺️ ${r.regionName} 巡礼已成\n${p.total} 山皆涉 · 得贝 ${shells}${giftTx}`);
  saveGame();
  return shells;
}
window.regionPilgrim = regionPilgrim; window.claimPilgrim = claimPilgrim;

// ---------- 观象 / 观瑞 ----------
function startObserve(siteId){
  const site = OBSERVE_SITES[siteId];
  if (!site) return false;
  const n = nodeOf(site.nodeId);
  if (!n || !nodeUnlocked(n)){ UI && UI.toast('🔒 ' + (n ? nodeLockReason(n) : '此地不明')); return false; }
  if (Game.node !== site.nodeId && !travelTo(site.nodeId)) return false;   // 动作即动身
  Game.activity = { kind:'observe', siteId, nodeId:site.nodeId, src:'manual' };
  if (typeof pauseQueue === 'function') pauseQueue('观象');
  activityProgress = 0;
  saveGame();
  UI && UI.refreshActivity();
  return true;
}
function doObserve(siteId){
  const site = OBSERVE_SITES[siteId];
  if (!site) return;
  const n = nodeOf(site.nodeId);
  const first = !Game.observed[siteId];
  Game.observed[siteId] = true;
  const divB = 1 + (divMult()-1)*0.5;
  gainXp('guanxiang', (first ? 250 + (n?n.unlockLevel:0)*4 : 25) * divB);
  Game.stats.observes++;
  recordObject(site.nodeId, 1);
  if (first){
    log(`🌅 ${site.kind}·${site.name}：${site.gain}`, 'gold', 'skill');
    UI && UI.toast(`🌅 ${site.kind}·${site.name}\n${site.gain}`);
  } else {
    UI && UI.log(`🌅 又观${site.name}`, 'guanxiang', 'skill');
  }
  // 观瑞：初见得瑞羽（凤皇羽 / 鹓雏羽）。所赐之物记在 OBSERVE_SITES.reward 上，
  // 不再用一张写死的临时表——否则物品详情查不到「从哪来」。
  if (site.kind === '观瑞'){
    const plume = site.reward;
    if (plume && Items[plume] && first){ giveItem(plume, 1, false); log(`🪽 得 ${Items[plume].name}`, 'gold', 'skill'); }
    activateOmen('fenghuang');   // 见凤皇/鹓雏 → 天下安宁
  }
  saveGame();
}
window.startObserve = startObserve; window.doObserve = doObserve;

// ---------- 谒见（神祇） ----------
function startAudience(nodeId){
  const site = AUDIENCE_SITES[nodeId];
  if (!site) return false;
  const n = nodeOf(nodeId);
  if (!n || !nodeUnlocked(n)){ UI && UI.toast('🔒 ' + (n ? nodeLockReason(n) : '此地不明')); return false; }
  if (Game.node !== nodeId && !travelTo(nodeId)) return false;              // 动作即动身
  Game.activity = { kind:'audience', nodeId, src:'manual' };
  if (typeof pauseQueue === 'function') pauseQueue('谒见');
  activityProgress = 0;
  saveGame();
  UI && UI.refreshActivity();
  return true;
}
// opts.oracle：只有「玩家自己点的那一趟」才弹问神。
// 队列与离线结算也会反复调这个函数（离线挂谒见一小时就是 120 次），
// 若不加这个开关，每次都会盖一层弹窗——一屏弹窗关不完。
let _oracleHintAt = 0;
function doAudience(nodeId, opts){
  const site = AUDIENCE_SITES[nodeId];
  if (!site) return;
  const n = nodeOf(nodeId);
  let recorded = 0;
  for (const d of site.deities){
    const r = addRecord(d.id, 1);
    if (r.first){
      recorded++;
      gainXp('zhulu', 60);
      log(`🕯️ 谒见${d.name}：${d.form || d.note || '神祇入录'}`, 'gold', 'skill');
      UI && UI.toast(`🕯️ 谒见 ${d.name}`);
      // 神祇之兆：「天神（槐江）见则其邑有兵」——初见神祇即应兆。
      // 比对前先去掉括注（神祇名为「（天神）」、兆名为「天神（槐江）」），
      // 且只认「兆名以该神名开头」的条目，免得钟山谒见误触鼓/钦䲹的化鸟之兆
      // （那两条由击杀鵕鸟 / 大鹗触发）。
      const clean = s => String(s || '').replace(/[（）()]/g, '');
      const me = clean(d.name);
      const hit = Object.keys(OMENS).find(k => OMENS[k].node === nodeId && clean(OMENS[k].beast).indexOf(me) === 0);
      if (hit) activateOmen(hit);
      // 神赐：首次谒见得其遗物（如刚山神「神𩲜之足」——神祇不讨伐，唯谒见可得）。
      // v1.31.23：一件神可赐多物（祭品 + 神赐小物），同 id 出现两次即两件。
      {
        const list = Array.isArray(d.gifts) ? d.gifts.slice() : (d.gift ? [d.gift] : []);
        const tally = new Map();
        for (const id of list){ if (Items[id]) tally.set(id, (tally.get(id) || 0) + 1); }
        for (const [id, qty] of tally){
          giveItem(id, qty, false);
          pushRecentLoot(id, qty);
          UI && UI.lootFloat(id, qty);
        }
        if (tally.size){
          const txt = [...tally].map(([id, q]) => `${Items[id].name}×${q}`).join('、');
          log(`🎁 得 ${txt} —— ${d.name}所赐`, 'gold', 'skill');
        }
      }
    }
  }
  // 首谒与再谒分开算经验：与观象同例（首次给足，再观只给一点）。
  // 不分的话，录满之后这里就成了一台免费经验机——离线按 20 秒一算，
  // 一小时 180 次 × 340 祭祀经验，比采集还快，而它不产任何东西。
  const ret = recorded === 0;      // 本次没有新入录，即「再谒」
  gainXp('jisi', ret ? 40 : 200 + (n ? n.unlockLevel*4 : 0));
  gainXp('zhulu', ret ? 5 : 20);
  if (!recorded){
    // 诸神已录：这一趟不再只是「再谒」，改问「此地还有何物未录」
    const regionId = String(nodeId).replace(/-\d+$/, '');
    const manual = !!(opts && opts.oracle);
    if (manual && UI && UI.showOracle) UI.showOracle(regionId, site.name);
    else if (Date.now() - _oracleHintAt > 60000){
      // 自动途径（队列 / 离线）不弹窗，但要留一句提示——只是别留一百八十句。
      // 离线挂谒见一小时会调这个函数 180 次，逐次记日志等于把日志框刷满。
      _oracleHintAt = Date.now();
      if (typeof log === 'function') log('🕯️ 诸神已录——可往舆地页「问神」，查此系未录之物', 'sys', 'skill');
    }
  }
  saveGame();
}
// ---------- 问神：此山系还缺什么 ----------
// 二十处谒见点在录满之后原本就成了摆设：再谒只剩一句「再谒山川之神」。
// 现在让山神干点正事——报出本系尚未著录的物产、异兽与神祇，并指到具体那座山。
// 纯信息，不产任何物件，所以不必设冷却，随便问。
function regionMissing(regionId){
  const items = [], beasts = [], deities = [];
  for (const it of Object.values(Items)){
    const nodes = it.nodes || (it.node ? [it.node] : []);
    const hit = nodes.find(nid => String(nid).indexOf(regionId) === 0);
    if (!hit) continue;
    if (((Game.records || {})[it.id] || {}).count > 0) continue;
    const n = nodeOf(hit);
    items.push({ id: it.id, name: it.name, cat: '物产', how: (Skills[it.skill] || {}).name || '采集',
      nodeId: hit, nodeName: n ? n.name : hit, lvl: n ? (n.unlockLevel || 1) : 1 });
  }
  for (const m of Object.values(Monsters)){
    if (!m.nodeId || String(m.nodeId).indexOf(regionId) !== 0) continue;
    if (((Game.records || {})[m.id] || {}).count > 0) continue;
    const n = nodeOf(m.nodeId);
    beasts.push({ id: m.id, name: m.name, cat: '异兽', how: m.boss ? '讨伐（凶神）' : '讨伐',
      nodeId: m.nodeId, nodeName: n ? n.name : m.nodeId, lvl: m.needLvl || 1 });
  }
  for (const [nodeId, site] of Object.entries(AUDIENCE_SITES || {})){
    if (String(nodeId).indexOf(regionId) !== 0) continue;
    for (const d of (site.deities || [])){
      if (((Game.records || {})[d.id] || {}).count > 0) continue;
      const n = nodeOf(nodeId);
      deities.push({ id: d.id, name: d.name, cat: '神祇', how: '谒见',
        nodeId, nodeName: n ? n.name : nodeId, lvl: n ? (n.unlockLevel || 1) : 1 });
    }
  }
  const byLvl = (a, b) => a.lvl - b.lvl || String(a.name).localeCompare(String(b.name));
  return { items: items.sort(byLvl), beasts: beasts.sort(byLvl), deities: deities.sort(byLvl) };
}
window.regionMissing = regionMissing;

window.startAudience = startAudience; window.doAudience = doAudience;

// ---------- 养成（峚山丹木五岁 / 北山器酸三岁 / 北山精卫填海） ----------
function growState(siteId){
  if (siteId === 'mishan') return Game.danmu;
  if (!Game.grow) Game.grow = {};
  if (!Game.grow[siteId] || typeof Game.grow[siteId].stage !== 'number') Game.grow[siteId] = { stage:0, done:0 };
  return Game.grow[siteId];
}
function startGrow(siteId){
  const site = GROW_SITES[siteId];
  if (!site) return false;
  const n = nodeOf(site.nodeId);
  if (!n || !nodeUnlocked(n)){ UI && UI.toast('🔒 ' + (n ? nodeLockReason(n) : '此地不明')); return false; }
  if (Game.node !== site.nodeId && !travelTo(site.nodeId)) return false;   // 动作即动身
  const st = growState(siteId);
  if ((st.stage||0) >= site.stages){ UI && UI.toast(site.name + '已成，先取其实'); return false; }
  if (!canAfford(site.cost)){ UI && UI.toast(siteId==='mishan' ? '需玉膏以灌' : '资材不足，需先备料'); return false; }
  Game.activity = { kind:'grow', siteId, nodeId:site.nodeId, src:'manual' };
  if (typeof pauseQueue === 'function') pauseQueue('灌木');
  activityProgress = 0;
  saveGame();
  UI && UI.refreshActivity();
  return true;
}
function doGrow(siteId){
  const site = GROW_SITES[siteId];
  if (!site) return;
  const st = growState(siteId);
  if ((st.stage||0) >= site.stages) return;
  if (!canAfford(site.cost)){ UI && UI.toast('资材不足，停灌'); Game.activity = null; return; }
  payCost(site.cost);
  st.stage++;
  gainXp('puyi', 400 + st.stage*120);
  gainXp('zhulu', 40);
  // 段奖励（精卫填海）：每 50 阶一段，只领一次——记在 st.segs（已领的 at 列表）
  if (Array.isArray(site.segments) && site.segments.length){
    st.segs = Array.isArray(st.segs) ? st.segs : [];
    for (const seg of site.segments){
      if (st.stage < seg.at || st.segs.indexOf(seg.at) >= 0) continue;
      st.segs.push(seg.at);
      const got = Object.entries(seg.reward || {}).map(([id, q]) => `${(Items[id] || {}).name || id}×${q}`).join('、');
      for (const [id, q] of Object.entries(seg.reward || {})) giveItem(id, q, false);
      log(`🌊 ${site.name}·${seg.name}：${seg.text}${got ? '（得 ' + got + '）' : ''}`, 'gold', 'skill');
      UI && UI.toast(`🌊 ${site.name}·${seg.name}\n${seg.text}${got ? '\n得 ' + got : ''}`);
    }
  }
  if (st.stage >= site.stages){
    for (const [id, qty] of Object.entries(site.reward)) giveItem(id, qty, false);
    st.stage = 0;
    st.done = (st.done||0) + 1;
    recordObject(site.nodeId, 1);
    const got = Object.keys(site.reward).map(id => (Items[id] ? Items[id].name : id)).join('·') || '养成物';
    log(`🌳 ${site.name}乃成：得 ${got}`, 'gold', 'skill');
    UI && UI.toast(`🌳 ${site.name}乃成！\n得 ${got}`);
  } else if (site.stepEvery && st.stage % site.stepEvery === 0){
    // 长线路标：200 阶每阶 10 分钟，中间三十多小时若只有逐阶 toast，
    // 玩家感觉不到「在推进」。每 25 阶给一次实物 + 一点贝，数值刻意小。
    const sw = site.stepReward || {};
    if (sw.item && sw.qty) giveItem(sw.item, sw.qty, false);
    const shell = Math.round((sw.shellPerStage || 0) * st.stage);
    if (shell > 0){ Game.shells += shell; Game.stats.totalEarned += shell; }
    const got = [sw.item && sw.qty ? `${(Items[sw.item]||{}).name || sw.item} ×${sw.qty}` : '', shell > 0 ? `${shell} 贝` : '']
      .filter(Boolean).join(' · ');
    log(`🌊 ${site.name} ${st.stage}/${site.stages} 阶：东海又浅一分${got ? '（得 ' + got + '）' : ''}`, 'gold', 'skill');
    UI && UI.toast(`🌊 ${site.name} ${st.stage} 阶\n东海又浅一分${got ? ' · ' + got : ''}`);
  } else {
    log(`🌱 灌${site.name}一阶（${st.stage}/${site.stages}）`, 'puyi', 'skill');
    UI && UI.toast(`🌱 ${site.name} ${st.stage}/${site.stages}`);
  }
  saveGame();
}
window.startGrow = startGrow; window.doGrow = doGrow;

// ---------- 异迹总览（观象 / 谒见 / 灌木） ----------
// 这三类「一次性地点」散落在 447 座山里：观象 13 处、谒见 20 处、灌木 3 处，
// 每处的按钮只在该山的详情里出现。统计页写着「观象处 3/9」，玩家却没有任何办法
// 知道自己差的那 6 处在哪——只能一座一座山点开看。这里给一份统一的清单：
// 三类合成一张表，标出「已得 / 未得 / 未解锁（差几级）」，舆地页据此出索引。
function heteroSites(){
  const out = [];
  const put = (o) => {
    const n = nodeOf(o.nodeId);
    const r = regionOf(o.nodeId);
    out.push(Object.assign({
      nodeName: n ? n.name : o.nodeId,
      regionId: r ? r.regionId : '',
      regionName: r ? r.regionName : '',
      level: n ? (n.unlockLevel || 1) : 0,
      unlocked: n ? nodeUnlocked(n) : false,
      done: false, prog: null,
    }, o));
  };
  for (const [id, s] of Object.entries(OBSERVE_SITES || {})){
    put({ kind: s.kind === '观瑞' ? '观瑞' : '观象', id, name: s.name, nodeId: s.nodeId,
      done: !!Game.observed[id], gain: s.gain || '', act: `startObserve('${id}')` });
  }
  for (const [nodeId, s] of Object.entries(AUDIENCE_SITES || {})){
    const total = (s.deities || []).length;
    let got = 0;
    for (const d of (s.deities || [])) if (((Game.records || {})[d.id] || {}).count > 0) got++;
    // 赐物写进索引：「初谒赐 吉玉」比「初谒得赐」有用——玩家能判断这一趟值不值。
    // v1.31.23：一件神可赐多物，索引按「名×数量」合并（重复项计件）。
    const gTally = new Map();
    for (const d of (s.deities || [])){
      const list = Array.isArray(d.gifts) ? d.gifts : (d.gift ? [d.gift] : []);
      for (const g of list) if (g) gTally.set(g, (gTally.get(g) || 0) + 1);
    }
    const gifts = [...gTally].map(([g, n]) => ((Items[g] || {}).name || g) + (n > 1 ? '×' + n : ''));
    const allDone = total > 0 && got >= total;
    put({ kind: '谒见', id: nodeId, name: s.name, nodeId,
      done: allDone, prog: { got, total },
      // 录满之后这处不再是「去录神」，而是「去问此地还缺什么」——索引里说清楚
      gain: (allDone ? '已录 · 可问缺录' : '神祇入录') + (gifts.length ? ` · 初谒赐 ${gifts.join('/')}` : ''),
      act: `startAudience('${nodeId}')` });
  }
  for (const [id, s] of Object.entries(GROW_SITES || {})){
    const st = growState(id);
    put({ kind: '灌木', id, name: s.name, nodeId: s.nodeId,
      done: (st.done || 0) > 0, prog: { got: st.stage || 0, total: s.stages || 1 },
      gain: Object.keys(s.reward || {}).map(k => (Items[k] || {}).name || k).join('·') || '养成物',
      act: `startGrow('${id}')` });
  }
  // 能去的排前面，其中「还没做完」的更前；同段内按门槛升序（顺着路走过去）
  out.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return a.level - b.level;
  });
  return out;
}
window.heteroSites = heteroSites;

// ---------- 卜筮 ----------
function divine(){
  if ((Game.inventory.jian||0) < 1){ UI && UI.toast('卜筮需 白菅×1'); return null; }
  Game.inventory.jian--;
  if (Game.inventory.jian<=0) delete Game.inventory.jian;
  const wise = isWise();
  const lucky = wise ? true : chance(0.6);
  const divB = divMult();
  gainXp('bushi', 60 * divB);
  Game.stats.divines++;
  let result;
  if (lucky){
    const kind = chance(0.5) ? 'xp' : 'gather';
    result = { lucky:true, kind, value:0.10, dur:600 };
    Game.buff = { itemId:'__divine', def:{ name: wise?'不惑之吉':'卜吉', kind, dur:600, [kind==='xp'?'xpBonus':'g']:0.10 }, remaining:600, dur:600 };
    if (kind === 'gather') Game.buff.def.gather = 0.10;
    if (kind === 'xp') Game.buff.def.xpBonus = 0.10;
    if (typeof UI !== 'undefined') UI.lastDivine = result;
    log(`🎋 卜之吉：${kind==='xp'?'诸技经验 +10%':'采集速度 +10%'}（600s）`, 'gold', 'sys');
    UI && UI.toast(`🎋 卜之吉\n${kind==='xp'?'经验 +10%':'采集 +10%'} 600s`);
  } else {
    result = { lucky:false };
    log('🎋 卜之不吉，宜静候时机', 'gold', 'sys');
    UI && UI.toast('🎋 卜之不吉');
  }
  saveGame();
  return result;
}
window.divine = divine;

// ---------- 营造 ----------
function buildStructure(id){
  const b = BUILDINGS[id];
  if (!b) return false;
  if (Game.buildings[id]){ UI && UI.toast('早已营造完毕'); return false; }
  if (levelOf('yingyi') < b.lvl){ UI && UI.toast(`🔒 需营邑 ${b.lvl} 级`); return false; }
  if (!canAfford(b.cost)){ UI && UI.toast('材用不足'); return false; }
  payCost(b.cost);
  Game.buildings[id] = true;
  // 狸力 / 鵹鹕「见则其县多土功」：营造经验 +20%——此前注释写着，实现里没有
  const buildBonus = 1 + deployedBonuses().build + omenMod('build');
  const gain = Math.round(b.xp * buildBonus);
  gainXp('yingyi', gain);
  log(`🏘️ 营造${b.name}：${b.desc}`, 'gold', 'sys');
  UI && UI.toast(`🏘️ ${b.name} 已成\n${b.desc}`);
  saveGame();
  return true;
}
window.buildStructure = buildStructure;

// 修葺旧筑：材料换营邑经验的常备出口。
// 营造是一次性里程碑（八座造完即止），若等级差一点又无可造之物，旧版会彻底卡死；
// 修葺让「木×2 + 石×1」随时可换「本级升级所需 25%」经验（至少 20 点）。
const REPAIR_COST = [['guaimu', 2], ['shashi', 1]];
function repairBuild(){
  const lv = levelOf('yingyi');
  if (lv >= TUNING.MAX_LEVEL){ UI && UI.toast('营邑已至九九，无需再葺'); return false; }
  if (!canAfford(REPAIR_COST)){ UI && UI.toast('材用不足（怪木×2、沙石×1）'); return false; }
  payCost(REPAIR_COST);
  const need = Math.max(1, xpForLevel(lv + 1) - xpForLevel(lv));
  const gain = Math.max(20, Math.round(need * 0.25));
  gainXp('yingyi', gain);
  log(`🔨 修葺旧筑：营邑经验 +${gain}`, 'gold', 'sys');
  UI && UI.toast(`🔨 修葺完成：营邑经验 +${gain}`);
  saveGame();
  return true;
}
window.repairBuild = repairBuild;

// ===== 战斗（讨伐 · 五行相克） =====
function playerEl(){ return document.getElementById('playerFighter'); }
function monsterEl(){ return document.getElementById('monsterFighter'); }

function combatMode(){
  if (Game.combat) return Game.combat.style;
  return preferredStyle();
}
function styleAvailable(s){
  if (s === 'zhu') return true;                                   // 祝术不藉兵器
  if (s === 'ranged') return !!(Game.gear.weapon && Game.gear.weapon.ranged);
  if (s === 'attack') return !!(Game.gear.weapon && !Game.gear.weapon.ranged);
  return false;
}
const STYLE_NAMES = { auto:'自动', attack:'近战', ranged:'远程', zhu:'祝术' };
// ---------- 战法（姿态）----------
// 流派决定「用什么打」，战法决定「怎么打」：同一套祝术，疾攻是快而薄，
// 破军是重而险。四项乘区各自独立，与五行克制、词条、绝技互不覆盖。
const TACTICS = {
  none:    { id:'none',    name:'无',   desc:'不偏不倚，照常应战',           dmg:1.00, spd:1.00, def:1.00, taken:1.00 },
  swift:   { id:'swift',   name:'疾攻', desc:'攻势 +15%，伤害 −10%',         dmg:0.90, spd:1.15, def:1.00, taken:1.00 },
  steady:  { id:'steady',  name:'沉稳', desc:'防御 +25%、减伤 10%，攻势 −10%', dmg:0.95, spd:0.90, def:1.25, taken:0.90 },
  breaker: { id:'breaker', name:'破军', desc:'伤害 +18%，防御 −25%',          dmg:1.18, spd:1.00, def:0.75, taken:1.00 },
};
function currentTactic(){ return TACTICS[(typeof Prefs !== 'undefined' && Prefs.tactic) || 'none'] || TACTICS.none; }
function setTactic(id){
  Prefs.tactic = TACTICS[id] ? id : 'none';
  saveGame();
  log(`🎴 战法：${currentTactic().name}（${currentTactic().desc}）`, 'gold', 'sys');
  UI && UI.toast(`战法：${currentTactic().name}`);
  if (UI && UI.currentTab === 'taofa' && UI.patchCombatArena) UI.patchCombatArena();
  return Prefs.tactic;
}
function styleLabel(v){ return STYLE_NAMES[v] || STYLE_NAMES.auto; }
function preferredStyle(){
  const pref = Prefs.stylePref || 'auto';
  if (pref !== 'auto' && styleAvailable(pref)) return pref;
  if (styleAvailable('ranged')) return 'ranged';
  if (styleAvailable('attack')) return 'attack';
  return 'zhu';
}
function setCombatStyle(v){
  Prefs.stylePref = (v==='attack'||v==='ranged'||v==='zhu') ? v : 'auto';
  saveGame();
  log(`🔀 战斗风格：${styleLabel(Prefs.stylePref)}（下一场生效）`, 'gold', 'sys');
  UI && UI.toast(`战斗风格：${styleLabel(Prefs.stylePref)}`);
  // 立即刷新征伐页竞技场（祝术五行选择行随风格切换显隐）；目标列表不必重建
  if (UI && UI.currentTab === 'taofa' && UI.patchCombatArena) UI.patchCombatArena();
  return Prefs.stylePref;
}
function setZhuEl(el){
  if (!TUNING.ELEMENTS.includes(el)) return;
  Prefs.zhuEl = el;
  saveGame();
  log(`📿 祝术主五行改为「${el}」`, 'gold', 'sys');
  UI && UI.toast(`祝术主五行：${el}`);
  // 立即刷新征伐页竞技场（五行提示条与 DPS 预估随新属性更新）；目标列表不必重建
  if (UI && UI.currentTab === 'taofa' && UI.patchCombatArena) UI.patchCombatArena();
}
window.combatMode = combatMode; window.styleAvailable = styleAvailable; window.styleLabel = styleLabel;
window.preferredStyle = preferredStyle; window.setCombatStyle = setCombatStyle; window.setZhuEl = setZhuEl;
window.TACTICS = TACTICS; window.currentTactic = currentTactic; window.setTactic = setTactic;

function playerElement(){
  const style = combatMode();
  if (style === 'zhu') return Prefs.zhuEl;
  const w = Game.gear.weapon;
  if (w && w.el) return w.el;
  if (style === 'ranged' && Game.gear.quiver) return Game.gear.quiver.el || '金';
  return '金';
}
// 敌方「此刻」的属性。九婴（阴阳嬗变）与帝江（混沌嬗变）会在战斗中途换属性，
// 从前是直接改 Monsters[id].el —— 那张表是静态数据，一改就永久污染：
// 打完一场，这只怪的元素就一直转下去了，刷新页面又变回原文属性，
// 两次进战斗的克制关系还不一样，玩家也没法照着「宜用属性」提前配兵器。
// 现在属性存在战斗上下文的 c.el 上，每场从 m.el 起算，离场即散。
function foeElement(m, c){
  if (c && c.el) return c.el;
  return (m && m.el) || null;
}
window.foeElement = foeElement;
// ---------- 装备淬炼（强化） ----------
// 装备槽里存的是「那一件」，淬炼等级按物品 id 记（同 id 共享），0–+30。
// 1–9 级沿用旧增量（基础 6%，至少 +1），10 级起改为每级 3%——这样老存档的
// +9 装备数值一分不变，30 级封顶时约为基础值的 190%（低阶兵器更高）。
const ENHANCE_MAX = 30, ENHANCE_STEP = 0.06, ENHANCE_STEP2 = 0.03;   // STEP2：10 级后每级按 +9 值再涨 3%
// ---------- 强化目标的两种形态（v1.31.13） ----------
// 参数可以是 itemId 字符串（行囊里那一类），也可以是装备槽里的**实例对象**。
// 原先一律按 itemId 记，于是「身上 +10 的金剑」和「行囊里另一把金剑」共用同一档——
// 强化行囊那把，身上那把也跟着涨。现在实例自带 enh 字段，两者互不影响。
function enhTargetId(t){ return (t && typeof t === 'object') ? (t.id || '') : t; }
function enhanceLevel(t){
  if (t && typeof t === 'object') return Math.max(0, Math.min(ENHANCE_MAX, t.enh | 0));
  const v = (Game.enhance && Game.enhance[t]) || 0;
  return Math.max(0, Math.min(ENHANCE_MAX, v | 0));
}
function setEnhanceLevel(t, v){
  v = Math.max(0, Math.min(ENHANCE_MAX, v | 0));
  if (t && typeof t === 'object'){ t.enh = v; return; }
  if (!Game.enhance) Game.enhance = {};
  Game.enhance[t] = v;
}
function enhanceScaled(base, lv){
  if (!base) return 0;
  const inc = Math.max(1, Math.round(base * ENHANCE_STEP));
  if (lv <= 9) return base + inc * lv;          // 1–9 沿用旧增量，老档数值不变
  // 10 级起按「+9 时的数值」等比续增：每级 +3%，30 级约 +63%（合计 +160%）。
  // 若按基础值定增量，46 点的兵器到 +30 只涨到 94，每级 +1，强化手感全无。
  const atNine = base + inc * 9;
  return Math.round(atNine * (1 + ENHANCE_STEP2 * (lv - 9)));
}
// 成功率：1–5 级近乎必成，之后逐段下滑，25 级以上进入「磨」的阶段。
// 数组下标是「当前等级」，值是从该级升到下一级的成功率。
const ENHANCE_RATE = [
  1.00, 0.95, 0.90, 0.85, 0.80,          // 0–4
  0.72, 0.65, 0.58, 0.50, 0.43,          // 5–9
  0.38, 0.34, 0.30, 0.26, 0.23,          // 10–14
  0.20, 0.17, 0.15, 0.13, 0.11,          // 15–19
  0.095, 0.085, 0.075, 0.065, 0.055,     // 20–24
  0.048, 0.042, 0.036, 0.031, 0.026,     // 25–29
];
const ENHANCE_SAFE = 10;              // 此级以下失败只损材料，不掉级
// 火候：一次「尽毁」烧出一层，每层让下次成功率高 8%，最多十二层，成了不减。
// 「十级以上失败归零」很重，光靠硬碰会劝退——火候把白烧的材料变成进度，
// 才谈得上「持续去强」：毁得越多，下一炉越准，直到把这座炉子烧透。
const ENHANCE_HEAT = { STEP: 0.08, MAX: 12 };
function enhanceHeatOf(itemId){
  const v = (Game.enhanceHeat && Game.enhanceHeat[itemId]) || 0;
  return Math.max(0, Math.min(ENHANCE_HEAT.MAX, v | 0));
}
// 实际成功率 = 该级基础 + 火候。封顶 95%，不做到「必成」——必成就不叫赌了。
function enhanceRateFor(target){
  const base = enhanceRate(enhanceLevel(target));
  if (base >= 1) return 1;                    // 0→1 本就必成，别被 95% 的封顶拉下来
  const hot = enhanceHeatOf(enhTargetId(target)) * ENHANCE_HEAT.STEP;
  const forge = (Game.buildings && Game.buildings.cuihuolu) ? 0.06 : 0;   // 淬火炉
  return Math.min(0.95, base + hot + forge);
}
// 强化上限按品阶分档：凡 +12、良 +18、精 +22、珍 +26、神 +30。
// 此前众生平等 +30，神兵「更耐淬」这件事无从体现；现在它是品阶带来的
// 第三件实事（另两件是数值系数与获取难度）。
function enhanceCapOf(it){
  const g = (typeof gearGrade === 'function') ? gearGrade(it) : null;
  return Math.min(ENHANCE_MAX, (g && g.cap) || ENHANCE_MAX);
}
function enhanceRate(lv){
  return ENHANCE_RATE[Math.max(0, Math.min(ENHANCE_MAX - 1, lv | 0))];
}
function enhanceCost(target){
  const next = enhanceLevel(target) + 1;
  // 材料随等级明显递增：+1 四炭，+30 六十二炭；贝币按 1.7 次方走
  return { next, tan: 2 + next * 2, shells: Math.round(90 * Math.pow(next, 1.7)) };
}
function enhanceHasStone(){ return (Game.inventory.zhenwu || 0) > 0; }
// 单次强化。opts.silent 供「强化至目标等级」批量调用，不逐条弹 toast。
// 返回 { ok, success, lvBefore, lvAfter, lost, usedStone, reason }
function enhanceItem(target, opts){
  const silent = !!(opts && opts.silent);
  const itemId = enhTargetId(target);
  const it = Items[itemId];
  if (!it || !it.equip) return { ok:false, reason:'不可淬炼' };
  if (!it.dmg && !it.def) return { ok:false, reason:'此物无伤无守，淬之无益' };   // 护符 / 箭袋之外的空槽
  const cap = enhanceCapOf(it);
  const lv = enhanceLevel(target);
  if (lv >= cap){
    if (!silent) UI && UI.toast(`已至 +${cap}（${gearGrade(it).name}品上限），无可再淬`);
    return { ok:false, reason:'已至顶' };
  }
  const cost = enhanceCost(target);
  if ((Game.inventory.tan || 0) < cost.tan){
    if (!silent) UI && UI.toast(`炭不足（需 ${cost.tan}，持有 ${Game.inventory.tan||0}）`);
    return { ok:false, reason:'炭不足' };
  }
  if (Game.shells < cost.shells){
    if (!silent) UI && UI.toast(`贝币不足（需 ${cost.shells}）`);
    return { ok:false, reason:'贝币不足' };
  }
  // 镇物：失败亦保原阶。高强段玩家可自行决定用不用，别替他花。
  const wantStone = !!(opts && opts.stone) && lv >= 1;
  const usedStone = wantStone && enhanceHasStone();
  Game.inventory.tan -= cost.tan;
  if (Game.inventory.tan <= 0) delete Game.inventory.tan;
  Game.shells -= cost.shells;
  Game.stats.spent = (Game.stats.spent || 0) + cost.shells;
  if (!Game.enhance) Game.enhance = {};

  const success = Math.random() < enhanceRateFor(target);
  let lost = false, wiped = false;
  if (success){
    setEnhanceLevel(target, lv + 1);
    // 成了也留着火候：炉子是同一座炉，烧过就是烧过。
    // 若让「成功」消耗火候，则每次归零后重爬 0→9 的九次成功会把它吃干，
    // 火候永远攒不起来——那样「一败俱毁」就成了死局（实测 +15 都摸不到）。
  } else if (lv >= ENHANCE_SAFE && !usedStone){
    // 十级以上一败俱毁：这一炉的阶数全归零。镇物可保，否则从头再来。
    setEnhanceLevel(target, 0);
    lost = true; wiped = true;
  }
  // 火候只在「真烧毁了」时攒——安全区里的失败不掉级，不该白送火候
  if (wiped){
    Game.enhanceHeat = Game.enhanceHeat || {};
    Game.enhanceHeat[itemId] = Math.min(ENHANCE_HEAT.MAX, enhanceHeatOf(itemId) + 1);
  }
  if (usedStone){
    Game.inventory.zhenwu -= 1;
    if (Game.inventory.zhenwu <= 0) delete Game.inventory.zhenwu;
  }
  const after = enhanceLevel(target);
  if (!silent){
    if (success){
      log(`🔨 ${it.name} 淬炼至 +${after}`, 'gold', 'trade');
      UI && UI.toast(`🔨 ${it.name} +${after}`);
    } else if (wiped){
      log(`💥 ${it.name} 淬炼失败，阶数尽毁（+${lv} → +0）`, 'bad', 'trade');
      UI && UI.toast(`💥 淬炼失败\n${it.name} 阶数尽毁（+${lv} → +0）`);
    } else if (lost){
      log(`💥 ${it.name} 淬炼失败，跌落至 +${after}`, 'bad', 'trade');
      UI && UI.toast(`💥 淬炼失败\n${it.name} 跌落至 +${after}`);
    } else {
      log(`… ${it.name} 淬炼未成（材料已耗）`, 'sys', 'trade');
      UI && UI.toast(`… 淬炼未成${usedStone ? '（镇物护住原阶）' : ''}`);
    }
  }
  saveGame();
  UI && UI.refreshGear && UI.refreshGear();
  UI && UI.refreshInventory && UI.refreshInventory();
  return { ok:true, success, lvBefore:lv, lvAfter:after, lost, wiped, usedStone, cost,
           heat: enhanceHeatOf(itemId), rate: enhanceRateFor(target) };
}
// 「强化至 +N」要花多少？——玩家点了才知道，而 +20 之后一次就要几十万贝。
// 蒙特卡洛 160 轮估中位数：失败在 +10 之后「一败俱毁」，期望值不是简单的 1/p 累加，
// 解析式会严重低估（掉回 +0 是整段重爬）。所以直接按真规则模拟。
function estimateEnhanceTo(target, goal, opts){
  const itemId = enhTargetId(target);
  const it = Items[itemId];
  if (!it || !it.equip || !(it.dmg || it.def)) return null;
  const cap = Math.max(1, Math.min(enhanceCapOf(it), Math.max(1, goal | 0)));
  const start = Math.max(0, enhanceLevel(target));
  if (start >= cap) return { tries:0, tan:0, shells:0, reached:start, cap };
  const stone = !!(opts && opts.stone);
  const heat0 = (typeof enhanceHeatOf === 'function' ? enhanceHeatOf(itemId) : 0);
  const forge = (Game.buildings && Game.buildings.cuihuolu) ? 0.06 : 0;
  const RUNS = 160;
  const rows = [];
  for (let r = 0; r < RUNS; r++){
    let lv = start, tries = 0, tan = 0, shells = 0, heat = heat0;
    while (lv < cap && tries < 400){
      const next = lv + 1;
      tan += 2 + next * 2;
      shells += Math.round(90 * Math.pow(next, 1.7));
      tries++;
      const p = Math.min(0.95, enhanceRate(lv) + heat * ENHANCE_HEAT.STEP + forge);
      if (Math.random() < p) lv++;
      else if (lv >= ENHANCE_SAFE && !stone){
        // ⚠️ 必须模拟火候累积：尽毁一次添一格，这是让 +10 之后还能推进的唯一机制。
        // 漏掉它，模拟会算出「400 锤也上不去」——那不是游戏难，是估算写错了。
        lv = 0;
        heat = Math.min(ENHANCE_HEAT.MAX, heat + 1);
      }
    }
    rows.push({ tries, tan, shells, lv });
  }
  rows.sort((a, b) => a.tries - b.tries);
  const m = rows[Math.floor(rows.length / 2)];
  return { tries:m.tries, tan:m.tan, shells:m.shells, reached:m.lv, cap };
}
window.estimateEnhanceTo = estimateEnhanceTo;

// 强化至目标等级：连续单次强化，直到达标 / 材料耗尽 / 触顶。
// guard 防止「+30 附近反复失败」时无限循环。
function enhanceToTarget(which, target, opts){
  const itemId = enhTargetId(which);
  const itemCap = enhanceCapOf(Items[itemId]);
  const cap = Math.max(1, Math.min(itemCap, target | 0));
  const stone = !!(opts && opts.stone);
  let tries = 0, ups = 0, downs = 0, stones = 0, tan = 0, shells = 0, wiped = false;
  while (enhanceLevel(which) < cap && tries < 400){
    const before = enhanceLevel(which);
    const r = enhanceItem(which, { silent:true, stone });
    if (!r.ok) break;
    tries++;
    tan += r.cost.tan; shells += r.cost.shells;
    if (r.success) ups++;
    else if (r.lost) downs++;
    if (r.usedStone) stones++;
    // 一败俱毁就别再自动往下烧了：让玩家自己决定是继续还是收手
    if (r.wiped){ wiped = true; break; }
    if (enhanceLevel(which) === before && !r.success && !r.lost) {
      // 失败且未掉级（保护期 / 镇物）——继续下一次
    }
  }
  const lv = enhanceLevel(which);
  const done = lv >= cap;
  const it = Items[itemId] || {};
  const msg = done
    ? `🔨 ${it.name} 已至 +${lv}（${tries} 次，成 ${ups} 败 ${downs}${stones ? ` · 镇物 ${stones}` : ''}）`
    : wiped
      ? `💥 ${it.name} 阶数尽毁，止于 +${lv}（${tries} 次，成 ${ups} 败 ${downs}）`
      : `… ${it.name} 止于 +${lv}（${tries} 次，成 ${ups} 败 ${downs}${stones ? ` · 镇物 ${stones}` : ''}，材料或已告罄）`;
  log(msg, done ? 'gold' : (wiped ? 'bad' : 'sys'), 'trade');
  if (!(opts && opts.noToast)) UI && UI.toast(msg);
  saveGame();
  UI && UI.refreshGear && UI.refreshGear();
  UI && UI.refreshInventory && UI.refreshInventory();
  return { ok:true, done, lv, tries, ups, downs, stones, tan, shells, wiped };
}
// ---------- 神兵 ----------
// BOSS 专属兵器：数值高于同级普通装，带一条普通装备没有的特性，且不可锻造。
// 掉落率压得很低——它是「打得过那个 BOSS」的证明，不是必经之路。
const DIVINE_EFFECTS = {
  pierce:{ label:'破甲', text:'无视目标一半防御' },
  drink: { label:'饮血', text:'命中回复所伤 8%' },
  swift: { label:'疾风', text:'攻势 +20%' },
  crit:  { label:'裂甲', text:'暴击率 +12%' },
  // 三尊守关神的两条（v1.31.18）：不新增面板，只改一条既有的判定
  behead:{ label:'斩厉', text:'目标半血以下，伤害 +25%' },
  chaos: { label:'混沌', text:'不受五行相克所减（被克不再 ×0.75）' },
};
const DIVINE_DROP = 0.06;
function divineOf(){
  const w = Game.gear && Game.gear.weapon;
  return (w && w.divine) || null;
}
function divineHas(k){ return divineOf() === k; }
window.DIVINE_EFFECTS = DIVINE_EFFECTS; window.DIVINE_DROP = DIVINE_DROP;
window.divineOf = divineOf; window.divineHas = divineHas;

window.enhanceItem = enhanceItem; window.enhanceLevel = enhanceLevel; window.enhanceCost = enhanceCost;
window.enhanceScaled = enhanceScaled; window.enhanceRate = enhanceRate;
window.enhanceToTarget = enhanceToTarget; window.enhanceHasStone = enhanceHasStone;
window.enhanceCapOf = enhanceCapOf; window.enhanceRateFor = enhanceRateFor;
window.enhanceHeatOf = enhanceHeatOf; window.ENHANCE_HEAT = ENHANCE_HEAT;
window.ENHANCE_MAX = ENHANCE_MAX; window.ENHANCE_SAFE = ENHANCE_SAFE;

function playerWeaponDmg(){
  const style = combatMode();
  if (style === 'zhu'){
    let d = 4 + levelOf('zhu')*0.9;
    if (Game.gear.charm && Game.gear.charm.divBonus) d += 4;   // 玉符聊作施法之助
    return d;
  }
  let dmg = 0;
  const w = Game.gear.weapon;
  if (w) dmg += (typeof enhanceScaled === 'function') ? enhanceScaled(w.dmg, enhanceLevel(w)) : (w.dmg||0);
  if (style === 'ranged' && Game.gear.quiver) dmg += Game.gear.quiver.dmg||0;
  return dmg;
}
function playerDamageRange(){
  const style = combatMode();
  const stat = style==='ranged' ? levelOf('she') : style==='zhu' ? levelOf('zhu') : levelOf('bing');
  const af = (typeof affixTotals === 'function') ? affixTotals() : affixZero();
  let dmg = playerWeaponDmg() + stat*1.2;
  dmg *= (1 + af.dmgPct/100);                     // 词条「锋」：伤害乘区
  dmg *= currentTactic().dmg;                     // 战法：疾攻薄、破军重
  const beast = Game.combat ? foeOf(Monsters[Game.combat.monsterId]) : null;
  if (beast){
    // 词条「引」只放大「克制关系带来的偏离」，不改基线：同属 ×1.00 仍是 ×1.00
    const fEl = foeElement(beast, Game.combat);
    // 神兵「混沌」：五行不定，被克也不再打折扣（相生与同属照旧）
    const m = divineHas('chaos') ? Math.max(1, wuxingMult(playerElement(), fEl)) : wuxingMult(playerElement(), fEl);
    dmg *= (1 + (m - 1) * (1 + af.elBoost/100));
    if (style === 'zhu' && wuxingSheng(playerElement(), fEl)) dmg *= TUNING.WUXING.SHENG;
  }
  dmg *= dmgMult();
  // 怪物防御：此前 def 只在界面上写着「防御 45」，战斗里一分不减。
  // 现在按 35% 折算、最多削去四成——早期硬怪不至于直接劝退，后期厚甲才有实感。
  if (beast && beast.def){
    const arm = divineHas('pierce') ? 0.5 : 1;      // 神兵「破甲」：无视一半
    dmg = Math.max(dmg * 0.6, dmg - beast.def * 0.35 * arm);
  }
  // 神兵「斩厉」：半血以下补一刀——司天之厉及五残，正是收尾的意思
  if (divineHas('behead') && beast && Game.combat && Game.combat.monsterHp < beast.hp * 0.5) dmg *= 1.25;
  return { lo: Math.max(1, Math.floor(dmg*0.6)), hi: Math.max(1, Math.floor(dmg*1.4)) };
}
function playerAttackInterval(){
  const skill = combatMode();
  let base = skill==='ranged' ? 2.4 : skill==='zhu' ? 3.2 : 2.8;
  const lvl = skill==='ranged' ? levelOf('she') : skill==='zhu' ? levelOf('zhu') : levelOf('bing');
  base -= lvl*0.008;
  const af = (typeof affixTotals === 'function') ? affixTotals() : affixZero();
  base /= (1 + af.atkSpeed/100);                  // 词条「疾」：攻势
  base /= currentTactic().spd;                    // 战法：疾攻更快、沉稳更慢
  if (divineHas('swift')) base /= 1.2;            // 神兵「疾风」
  return Math.max(1.2, base);
}
function playerEvasion(){
  return Math.min(0.5, (Game.gear.armor ? 0.04 : 0) + levelOf('bing')*0.0015 + levelOf('ming')*0.001);
}
function totalDefence(){
  let d = Game.gear.armor
    ? ((typeof enhanceScaled === 'function') ? enhanceScaled(Game.gear.armor.def, enhanceLevel(Game.gear.armor.id || Game.gear.armor)) : (Game.gear.armor.def||0))
    : 0;
  d += levelOf('ming')*0.2;
  d += defBonus();
  const af = (typeof affixTotals === 'function') ? affixTotals() : affixZero();
  d += af.def;                                    // 词条「固」：定值防御
  d *= currentTactic().def;                       // 战法：沉稳厚、破军薄
  d *= (1 + relicSum('def'));                     // 前世遗物：昆仑之丘 / 息壤之土
  return d;
}
function playerMaxHp(){
  // 御使的 hp 类增益（鯥·无肿疾、犀、象、驭兽）此前只写进了 BEAST_BUFFS 却没人读，
  // 等于白占槽位；此处并入气血，才让「体魄型」御使有实际去处。
  // 体魄系数 4 → 7：怪的攻成长改了指数（见 gameData.js beastStat），
  // 气血若仍按每级 4 点线性涨，后期一记就要掉四分之一血，只能靠不停进食硬顶。
  // 现在九九（81 级）约 590 点，同级怪一记三四十，能挨十几下——才谈得上「打一场」。
  return Math.floor((20 + levelOf('ming')*7) * (1 + deployedBonuses().hp) * (1 + relicSum('hp')));
}
// 食物回血：御使「虎蛟·不肿」的 heal 加成同样需要落地
function healAmount(it){
  if (!it || !it.heal) return 0;
  return Math.max(1, Math.round(it.heal * (1 + deployedBonuses().heal)));
}
function monsterInterval(m, c){
  let base = Math.max(2.0, 3.2 - m.hp*0.002);
  if (m.special && m.special.enrage && c && c.monsterHp < m.hp*0.5) base *= (1 - m.special.enrage); // 封豨狂暴
  return Math.max(1.2, base);
}

function combatTick(elapsed){
  if (!Game.combat) return;
  const c = Game.combat;
  const m = foeOf(Monsters[c.monsterId]);
  if (!m){ Game.combat = null; return; }
  // 蛇毒：持续掉血
  if (c.poison && c.poison.until > gameTime()){
    c.poisonAcc = (c.poisonAcc||0) + elapsed;
    while (c.poisonAcc >= 1){
      c.poisonAcc -= 1;
      c.playerHp -= c.poison.dmg;
      Game.stats.damageTaken += c.poison.dmg;
      UI && UI.floatText(playerEl(), `☠️ -${c.poison.dmg}`, '#9b59b6');
    }
    if (c.playerHp <= 0){ onPlayerDeath(c, m); return; }
  } else if (c.poison){ delete c.poison; }
  // 不可杀：缠斗 20 秒后遁去
  if (m.unkillable){
    c.flee = (c.flee||0) + elapsed;
    if (c.flee >= 20){
      recordObject(m.id, 1);
      log(`🐾 ${m.name}「不可杀也」，遁去矣`, 'gold', 'combat');
      UI && UI.toast(`🐾 ${m.name} 不可杀，遁去`);
      Game.combat = null;
      return;
    }
  }
  // 玩家进攻
  const atkSpeed = Math.max(0.2, playerAttackInterval());
  c.timer = (c.timer||0) + elapsed;
  let spin = 0;
  while (c.timer >= atkSpeed && c.monsterHp > 0 && c.playerHp > 0 && spin++ < 64){
    c.timer -= atkSpeed;
    // 势满：这一击改为绝技，不再走普攻（「攒势 → 放绝技」是战斗里唯一的手动节奏）
    if ((c.momentum||0) >= 100) doPlayerUltimate(c, m);
    else doPlayerAttack(c, m);
  }
  if (c.monsterHp <= 0){ meetKill(c, m); return; }
  // 怪物进攻
  const mSpeed = Math.max(0.2, monsterInterval(m, c));
  c.maxtimer = (c.maxtimer||0) + elapsed;
  spin = 0;
  while (c.maxtimer >= mSpeed && c.playerHp > 0 && spin++ < 64){
    c.maxtimer -= mSpeed;
    doMonsterAttack(c, m);
  }
  // Boss 专属技能
  if (m.special && m.special.every > 0 && c.playerHp > 0 && c.monsterHp > 0){
    c.spec = (c.spec||0) + elapsed;
    if (c.spec >= m.special.every){ c.spec = 0; doMonsterSpecial(c, m); }
  }
  // 进食收口：伤害来自普攻、特殊技、蛇毒三条路，各自在末尾检查容易漏一处，
  // 漏掉的表现就是「背包里三十份食物，一口没吃，硬生生被打死」。
  // 这里统一补一次——血量掉到阈值以下就该吃，不问是谁打的。
  if (c.playerHp > 0 && c.playerHp <= playerMaxHp() * Prefs.autoEat) autoEat(c);
  if (c.playerHp <= 0) onPlayerDeath(c, m);
}

// 绝技：按流派取一式，势满（100）自动释放，放完归零。
// 三式的差别不只是倍率——近战最重、射术必中且不耗矢、祝术吃「相生」加成。
const ULTIMATE_NAMES = { attack:'断岳', ranged:'穿云', zhu:'五行合' };
const ULTIMATE_MULT  = { attack:2.8,    ranged:2.4,    zhu:2.2 };
function doPlayerUltimate(c, m){
  const style = combatMode();
  const name = ULTIMATE_NAMES[style] || ULTIMATE_NAMES.attack;
  const range = playerDamageRange();
  const af = (typeof affixTotals === 'function') ? affixTotals() : affixZero();
  let dmg = Math.floor(roll(range.lo, range.hi) * (ULTIMATE_MULT[style] || 2.4));
  if (style === 'zhu' && wuxingSheng(playerElement(), foeElement(m, c))) dmg = Math.floor(dmg * TUNING.WUXING.SHENG);
  let crit = false;
  const critRate = af.critRate + (divineHas('crit') ? 12 : 0);
  if (critRate > 0 && chance(critRate/100)){
    crit = true;
    dmg = Math.floor(dmg * (1.5 + af.critDmg/100));
  }
  c.monsterHp -= dmg;
  c.dmgOut = (c.dmgOut||0) + dmg;
  c.round = (c.round||0) + 1;
  c.combo = (c.combo||0) + 1;
  c.momentum = 0;
  c.ults = (c.ults||0) + 1;
  Game.stats.damageDealt += dmg;
  Game.stats.hits++;
  gainXp(style === 'zhu' ? 'zhu' : style === 'ranged' ? 'she' : 'bing', 8);
  gainXp('taofa', 5);
  UI && UI.attackFx && UI.attackFx('player');
  if (UI && UI.ultimateFx) UI.ultimateFx(name);
  else UI && UI.hit(monsterEl(), `绝技·${name} -${dmg}`, '#ffd166');
  log(`✨ 绝技「${name}」造成 ${dmg} 伤害${crit?'（暴击）':''}`, 'gold', 'combat');
  if (c.playerHp > 0 && c.playerHp <= playerMaxHp() * Prefs.autoEat) autoEat(c);
}

function doPlayerAttack(c, m){
  const style = combatMode();
  if (style === 'ranged'){
    const arrow = Game.gear.quiver;
    // 矢也是装备（equip/slot:quiver），自 v1.31.22 起按件存在 packGear 里
    const arrowQty = arrow ? (typeof bagQty === 'function' ? bagQty(arrow.id) : (Game.inventory[arrow.id]||0)) : 0;
    if (!arrow || arrowQty <= 0){
      if (styleAvailable('attack')){ c.style = 'attack'; log('🏹 矢尽，改用近战', 'bad', 'combat'); }
      else { Game.combat = null; UI && UI.toast('矢尽，无以讨伐'); return; }
    } else {
      takeItem(arrow.id, 1, false);
      if ((typeof bagQty === 'function' ? bagQty(arrow.id) : (Game.inventory[arrow.id]||0)) <= 0) Game.gear.quiver = null;
    }
  }
  // 大风「飘风」：闪避窗口
  if (c.dodgeUntil && c.dodgeUntil > gameTime() && chance(0.5)){
    UI && UI.floatText(monsterEl(), '💨 风影闪避', '#8b96ac');
    return;
  }
  // 猰貐「革甲」：受击叠破甲
  let armorPierce = 0;
  if (m.special && m.special.armor){
    c.armorPierce = Math.min(0.6, (c.armorPierce||0) + 0.05);
    armorPierce = m.special.armor * (1 - c.armorPierce);
  }
  const range = playerDamageRange();
  const af = (typeof affixTotals === 'function') ? affixTotals() : affixZero();
  let dmg = roll(range.lo, range.hi);
  if (armorPierce > 0) dmg = Math.max(1, Math.floor(dmg * (1 - armorPierce)));
  // 连击：连续命中每 5 次 +5% 伤害（上限 +30%）——「不被打断」本身就是一种打法
  const comboBonus = Math.min(0.30, Math.floor((c.combo||0)/5) * 0.05);
  if (comboBonus > 0) dmg = Math.floor(dmg * (1 + comboBonus));
  const fearPenalty = (c.fearUntil && c.fearUntil > gameTime()) ? 0.30 : 0;   // 西王母震慑
  const miss = chance(Math.max(0.01, 0.08 - levelOf('bing')*0.001 - af.hit/100) + fearPenalty);
  if (miss){
    UI && UI.floatText(monsterEl(), '未命中', '#8b96ac');
    c.combo = 0;
    if ((c.momentum||0) < 100) c.momentum = Math.max(0, (c.momentum||0) - 6);
    return;
  }
  // 暴击：基础 ×1.5，词条「烈」再加
  let crit = false;
  if (af.critRate > 0 && chance(af.critRate/100)){
    crit = true;
    dmg = Math.floor(dmg * (1.5 + af.critDmg/100));
  }
  c.monsterHp -= dmg;
  c.dmgOut = (c.dmgOut||0) + dmg;
  c.round = (c.round||0) + 1;
  c.combo = (c.combo||0) + 1;
  // 势：命中即积，连击时更快（每 5 连额外 +4）
  c.momentum = Math.min(100, (c.momentum||0) + 16 + Math.min(12, Math.floor(c.combo/5)*4));
  // 吸血：命中回血（词条「饮」；神兵「饮血」另加 8%）
  const lifesteal = af.lifesteal + (divineHas('drink') ? 8 : 0);
  if (lifesteal > 0){
    const heal = Math.max(1, Math.floor(dmg * lifesteal / 100));
    const before = c.playerHp;
    c.playerHp = Math.min(playerMaxHp(), c.playerHp + heal);
    if (c.playerHp > before) UI && UI.floatText(playerEl(), `+${c.playerHp - before}`, '#5ec97a');
  }
  Game.stats.damageDealt += dmg;
  Game.stats.hits++;
  gainXp(style === 'zhu' ? 'zhu' : style === 'ranged' ? 'she' : 'bing', 4);
  gainXp('taofa', 3);
  UI && UI.attackFx && UI.attackFx('player');
  UI && UI.hit(monsterEl(), crit ? `暴击 -${dmg}` : `-${dmg}`, crit ? '#ffb03a' : '#ff6b6b');
  if (c.playerHp > 0 && c.playerHp <= playerMaxHp() * Prefs.autoEat) autoEat(c);
}

function doMonsterAttack(c, m){
  const maxHp = playerMaxHp();
  const ev = playerEvasion() + 0.05;
  if (chance(ev)){ UI && UI.floatText(playerEl(), '闪避', '#8b96ac'); return; }
  const af = (typeof affixTotals === 'function') ? affixTotals() : affixZero();
  const def = totalDefence();
  let dmg = roll(1, Math.max(1, m.atk - def*0.3));
  if (af.dmgTaken > 0) dmg = Math.max(1, Math.floor(dmg * (1 - af.dmgTaken/100)));   // 词条「韧」
  const tac = currentTactic();
  if (tac.taken !== 1) dmg = Math.max(1, Math.floor(dmg * tac.taken));              // 战法「沉稳」减伤
  c.playerHp -= dmg;
  c.dmgIn = (c.dmgIn||0) + dmg;
  // 受击折势，但不破连击：连击断在「自己没打中」上，而不是「挨了一下」——
  // 否则怪物攻速略快于玩家时，连击永远归零，这套机制等于不存在。
  if ((c.momentum||0) < 100) c.momentum = Math.max(0, (c.momentum||0) - 8);
  Game.stats.damageTaken += dmg;
  gainXp('ming', 3);
  UI && UI.attackFx && UI.attackFx('monster');
  UI && UI.hit(playerEl(), `-${dmg}`, '#ff4444');
  // 反伤（词条「棘」）：甲胄上的刺，打在谁身上就还给谁
  if (af.thorns > 0 && m && m.hp){
    const back = Math.max(1, Math.floor(dmg * af.thorns / 100));
    c.monsterHp -= back;
    c.dmgOut = (c.dmgOut||0) + back;
    Game.stats.damageDealt += back;
    UI && UI.floatText(monsterEl(), `反 ${back}`, '#c39bd3');
  }
  if (c.playerHp > 0 && c.playerHp <= maxHp * Prefs.autoEat) autoEat(c);
}

function doMonsterSpecial(c, m){
  const sp = m.special;
  if (!sp) return;
  if (sp.elementShift){
    const els = TUNING.ELEMENTS;
    const cur = foeElement(m, c) || els[0];
    c.el = els[(els.indexOf(cur)+1) % els.length];
    UI && UI.floatText(monsterEl(), `五行 → ${c.el}`, '#c39bd3');
    log(`☯️ ${m.name} 阴阳嬗变，化为${c.el}属`, 'bad', 'combat');
    return;
  }
  if (sp.dodge){
    c.dodgeUntil = gameTime() + 8;
    UI && UI.floatText(monsterEl(), `🌪️ ${sp.name}`, '#7fb3d5');
    log(`🌪️ ${m.name} 起${sp.name}，身形难测`, 'bad', 'combat');
    return;
  }
  if (sp.poison){
    c.poison = { until: gameTime() + sp.poison.dur, dmg: sp.poison.dmg };
    UI && UI.floatText(playerEl(), `☠️ ${sp.name}`, '#9b59b6');
    log(`☠️ ${m.name} 施${sp.name}，持续掉血`, 'bad', 'combat');
    return;
  }
  const def = totalDefence() * (1 - (sp.pierce||0));
  if (sp.fear){                                     // 西王母「善啸」：震慑——命中降低
    c.fearUntil = gameTime() + 8;
    UI && UI.floatText(playerEl(), `😱 ${sp.name}`, '#c39bd3');
  }
  const hits = sp.hits || 1;
  for (let i=0; i<hits; i++){
    if (chance(playerEvasion())){ UI && UI.floatText(playerEl(), `💨 躲开 ${sp.name}`, '#8b96ac'); continue; }
    const dmg = roll(1, Math.max(1, m.atk*(sp.dmg||1.5) - def*0.3));
    c.playerHp -= dmg;
    c.dmgIn = (c.dmgIn||0) + dmg;
    c.combo = 0;                                     // 特殊技命中：连击断
    if ((c.momentum||0) < 100) c.momentum = Math.max(0, (c.momentum||0) - 20);
    Game.stats.damageTaken += dmg;
    UI && UI.hit(playerEl(), `-${dmg}`, '#ff8800');
  }
  UI && UI.floatText(monsterEl(), `💥 ${sp.name}`, '#ff9f43');
  log(`💥 ${m.name} 使出${sp.name}${hits>1?`（${hits} 连）`:''}`, 'bad', 'combat');
  if (c.playerHp > 0 && c.playerHp <= playerMaxHp() * Prefs.autoEat) autoEat(c);
}

// 自动进食：血量掉到 Prefs.autoEat 以下时吃一份回血最多的食物。
// 导出供测试与调试——它只在攻击/受击之后被调用，一旦条件写错就会静默失效
// （带着一包食物却永远不吃，玩家会以为食物没用）。
// 自动进食的两条规矩（v1.31.12）：
//   1. 普通食物优先。丹木之实 heal 500 是全场最高，若只按「回血最多」排序它永远第一，
//      挂机一晚能把峚山五年一结的存货吃空——它是急救品，不该当干粮。
//   2. 够用就好。同为普通食物时，选「刚好补满」的那个，别拿 heal 520 的炙兕脯
//      去补 120 点的缺口。不够补满时才用最大的。
const RARE_FOOD = { RARE:1, EPIC:1, LEGENDARY:1, MYTH:1 };
function autoEat(c){
  const pool = [[], []];
  for (const id in Game.inventory){
    const it = Items[id];
    if (!it || !it.heal || Game.inventory[id] <= 0) continue;
    pool[RARE_FOOD[it.rarity] ? 1 : 0].push([id, it.heal]);
  }
  const need = Math.max(0, playerMaxHp() - c.playerHp);
  const choose = (list) => {
    if (!list.length) return null;
    const enough = list.filter(x => x[1] >= need).sort((a,b) => a[1] - b[1]);
    if (enough.length) return enough[0];                       // 够补满的里面挑最小的
    return list.slice().sort((a,b) => b[1] - a[1])[0];         // 都补不满就挑最大的
  };
  const pick = choose(pool[0]) || choose(pool[1]);             // 普通吃完才动珍稀
  if (!pick) return;
  const [id] = pick;
  const heal = healAmount(Items[id]);
  Game.inventory[id]--;
  if (Game.inventory[id] <= 0) delete Game.inventory[id];
  c.playerHp = Math.min(playerMaxHp(), c.playerHp + heal);
  UI && UI.floatText(playerEl(), `+${heal} ❤️`, '#58b368');
  UI && UI.toast(`🍖 自动进食 ${Items[id].name} +${heal}`);
}

// 同目标连续讨伐的经验递减：此前已连杀 n 次 → 每次 -3%，下限 60%。
// 只减经验、不减掉落——被惩罚的应是「无脑刷一只低级怪升级」，而非材料线。
function mobStreakMult(id){
  const n = (Game.mobStreak && Game.mobStreak[id]) || 0;
  return Math.max(TUNING.MOB_DECAY.MIN, 1 - TUNING.MOB_DECAY.STEP * n);
}
// 记一次击杀：清空其他目标的连续链（换目标即从全额重新算），本目标 +1
function bumpMobStreak(id){
  if (!Game.mobStreak) Game.mobStreak = {};
  for (const k in Game.mobStreak) if (k !== id) delete Game.mobStreak[k];
  Game.mobStreak[id] = (Game.mobStreak[id] || 0) + 1;
}
window.mobStreakMult = mobStreakMult; window.bumpMobStreak = bumpMobStreak;
window.meetKill = meetKill;   // 导出给回归测试：击杀结算的掉落分支要能被单测直接跑到
function meetKill(c, m){
  const isBoss = !!m.boss;
  Game.stats.kills++;
  // 行旅见闻：战后小插曲（只做正向；掉落表另管，这里只给「读得懂」的一点东西）
  if (typeof maybeEvent === 'function') maybeEvent({ kind:'fight', monsterId: m.id, nodeId: Game.node });
  Game.stats.deathStreak = 0; Game.stats.deathStreakOf = null;   // 打下来了，连败清零
  // 连胜计数与轻量庆祝
  Game.stats.winStreak = (Game.stats.winStreak||0) + 1;
  if (UI && (Game.stats.winStreak === 3 || (Game.stats.winStreak >= 5 && Game.stats.winStreak % 5 === 0))){
    UI.toast(`🔥 连胜 ${Game.stats.winStreak} 场！`);
    if (typeof FX !== 'undefined' && FX.burst) FX.burst((window.innerWidth||300)/2, (window.innerHeight||500)/3, '🔥', 10);
  }
  if (isBoss){
    Game.stats.bossKills[m.id] = true;
    UI && UI.log(`🏆 讨平 ${m.name}！`, 'gold', 'combat');
    UI && UI.bossKillFx(m);
    if (m.coins){ Game.shells += m.coins; Game.stats.totalEarned += m.coins; }
  }
  // 经验：同目标连杀递减（BOSS 不递减）；递减系数同时用于提示
  const dm = isBoss ? 1 : mobStreakMult(m.id);
  gainXp('taofa', Math.round(m.xp * dm));
  bumpMobStreak(m.id);
  gainXp('ming', Math.round(m.xp * 0.3 * dm));
  recordObject(m.id, 1);
  // 战利品（权重公式，见 TUNING.DROP）。⚠️ BOSS 只有单件 drop、无 loot 表，
  // 早年缺 `|| []` 兜底导致讨平 BOSS 必抛 TypeError（战斗循环中断），务必保留。
  const tier = (Game.records[m.id]||{}).tier || 0;
  const yieldB = 1 + globalYieldBonus() + deployedBonuses().loot + omenMod('loot') + memberBonus('drop');   // 有兵 / 多狡客：所获 -10%
  // 卷二 · 已领赏山系：旧地重游不只有经验，偶尔还多带一件（6%）。
  // 与「旧地重游 +10% 经验」配套——一个是效率，一个是手气。
  if (m.band && !isBoss && Array.isArray(m.loot) && m.loot.length && chance(0.06)){
    const claimed = !!(Game.pilgrim && Game.pilgrim[m.regionId]);
    if (claimed){
      const pid = m.loot[0][0];
      giveItem(pid, 1, false);
      if (typeof pushRecentLoot === 'function') pushRecentLoot(pid, 1);
      UI && UI.lootFloat && UI.lootFloat(pid, 1);
      log(`🗺️ 旧地重游：${(Items[pid] || {}).name || pid} 多带一件`, 'gold', 'combat');
    }
  }
  for (const [id, base, qty] of (m.loot || [])){
    let p = base * (1 + TUNING.DROP.LVL_COEF*(levelOf('taofa') - m.needLvl)) * (1 + TUNING.DROP.MAS_COEF*tier/4);
    p = clamp(p * yieldB, 0.05, 0.95);
    if (chance(p)){
      const n = roll(1, Math.max(1, qty));
      giveItem(id, n, false);
      pushRecentLoot(id, n);
      UI && UI.log(`⚔️ 获 ${Items[id].name} ×${n}`, 'gold', 'combat');
      UI && UI.lootFloat(id, n);
    }
  }
  if (isBoss && m.drop){
    giveItem(m.drop, 1, false);
    pushRecentLoot(m.drop, 1);
    UI && UI.log(`🌟 得 ${Items[m.drop].name}`, 'gold', 'combat');
  }
  // 神兵：低概率，打得过才谈得上
  if (isBoss && m.divine && Items[m.divine] && chance(DIVINE_DROP)){
    giveItem(m.divine, 1, false);
    pushRecentLoot(m.divine, 1);
    log(`⚔️ 神兵现世：${Items[m.divine].name}！`, 'gold', 'combat');
    UI && UI.log(`⚔️ 神兵现世：${Items[m.divine].name}！`, 'gold', 'combat');
    UI && UI.toast(`⚔️ ${m.name} 遗下神兵\n${Items[m.divine].name}`);
    if (typeof FX !== 'undefined' && FX.burst) FX.burst((window.innerWidth||300)/2, (window.innerHeight||500)/3, '⚔️', 18);
  }
  Game.combat = null;
  // 结算完就地刷界面：竞技场 + 刚打完那张卡（不重建 191 张目标卡）。
  // ⚠️ 必须在这里通知，不能等 refreshCombatHud 察觉「战斗结束」——自动连战会
  // 立刻接上下一只，Game.combat 从不为空，那条分支在挂机时永远不触发，
  // 结果是著录数、连杀递减标签在页面上一直不更新。
  UI && UI.afterCombatEnd && UI.afterCombatEnd(c.monsterId);
  // 讨伐队列计数：本只达成且队列已接管下一环时，不再自动接战同一只（下一步交给队列）
  const _qDriven = Game.queueRunning && (()=>{ const _e = Game.queue[Game.queueIdx];
    const _d = _e && typeof entryDef === 'function' ? entryDef(_e) : null;
    return _d && _d.mode === 'taofa' && _e.target === m.id; })();
  const queueTookOver = (typeof queueOnKill === 'function') && queueOnKill(m.id);
  // 限次连战：c.repeat 为「本轮还剩几场」（含刚打完这场）。null = 无限连战（旧行为）。
  const left = (c.repeat == null) ? null : c.repeat - 1;
  if (!isBoss && !queueTookOver){
    // 残势：连战间继承 60% 的势——否则清小怪每场都从 0 起蓄，挂机时绝技永远放不出来
    // （一场三五回合就结束，蓄不到 100）。败北则清零，不留残余。
    const carry = Math.min(100, Math.round((c.momentum || 0) * 0.6));
    const q = _qDriven ? { fromQueue:true, carry } : { carry };
    if (left == null) startCombat(c.monsterId, Object.assign({}, q));
    else if (left > 0) startCombat(c.monsterId, Object.assign({ times:left }, q));
    else UI && UI.toast(`⚔️ 已战 ${c.repeat} 场，收兵`);
  }
}
function pushRecentLoot(itemId, qty){
  if (!itemId || !Items[itemId]) return;
  if (!Array.isArray(Game.recentLoot)) Game.recentLoot = [];
  const found = Game.recentLoot.find(l=>l.itemId===itemId);
  if (found) found.qty += qty;
  else Game.recentLoot.unshift({ itemId, qty });
  if (Game.recentLoot.length > 12) Game.recentLoot.length = 12;
}
window.pushRecentLoot = pushRecentLoot;

function onPlayerDeath(c, m){
  Game.stats.deaths++;
  Game.stats.winStreak = 0;
  // 连败计数：同一目标连着倒下几阵，说明眼下确实啃不动它。
  const lastId = c && c.monsterId;
  if (lastId && Game.stats.deathStreakOf === lastId) Game.stats.deathStreak = (Game.stats.deathStreak || 0) + 1;
  else { Game.stats.deathStreak = 1; Game.stats.deathStreakOf = lastId || null; }
  const stuck = Game.stats.deathStreak >= 3;
  // 败北视为链条中断：复讨同一目标时重新从全额经验起算
  if (Game.mobStreak) Game.mobStreak = {};
  log(`💀 汝为 ${m.name} 所败`, 'bad', 'combat');
  UI && UI.deathFloat();
  Game.combat = null;
  UI && UI.afterCombatEnd && UI.afterCombatEnd(lastId);   // 败北：连杀清零，递减标签该消失
  // 连败三阵即收兵：先前只会「倒下—复讨—再倒下」地无限循环，刷屏日志、吃空食物、
  // 还一直占着行动位，玩家回来只看到一屏败报。停在这里，把「换目标还是补强」交回玩家。
  if (stuck){
    log(`⛔ 连败三阵，${m.name} 非此刻可制——且去历练、或添置器甲再来`, 'bad', 'combat');
    if (Prefs.autoRevive){ UI && UI.toast(`⛔ 连败三阵，暂不复讨 ${m.name}`); }
    return;
  }
  // 限次往讨败北即收兵（尊重玩家设定的场次）；无线连战仍按偏好自动复讨
  if (Prefs.autoRevive && lastId && Monsters[lastId] && c.repeat == null){
    setTimeout(()=>{
      if (!Prefs.autoRevive) return;
      startCombat(lastId);
      if (Game.combat) UI && UI.toast(`⚔️ 复讨 ${Monsters[lastId].name}`);
    }, 1500);
  }
}

let autoAttack = false;
function startCombat(monsterId, opts){
  const m = foeOf(Monsters[monsterId]);
  if (!m) return false;
  const node = nodeOf(m.nodeId);
  if (!node || !nodeUnlocked(node)){ UI && UI.toast('🔒 ' + (node ? nodeLockReason(node) : '此地不明')); return false; }
  if (m.needLvl && levelOf('taofa') < m.needLvl){ UI && UI.toast(`🔒 需讨伐 ${m.needLvl} 级方可言 ${m.name}`); return false; }
  // 往讨即动身：舆地页的「前往」按钮已取消，动作本身兼管走一趟（初至记录 / 舆地与巡历经验）
  if (Game.node !== m.nodeId) travelTo(m.nodeId);
  Game.activity = null;
  // 手动往讨才暂停队列；队列自己驱动的讨伐（startEntryActivity 传 fromQueue）
  // 必须放行——否则一启动就被自己暂停，讨伐进度永远不计数。
  if (!(opts && opts.fromQueue) && typeof pauseQueue === 'function') pauseQueue('往讨');
  let style = combatMode();
  if (style === 'ranged' && !styleAvailable('ranged')){
    if (styleAvailable('attack')){ style = 'attack'; UI && UI.toast('无弓，以近战往讨'); }
    else style = 'zhu';
  }
  if (style === 'attack' && !styleAvailable('attack')) style = 'zhu';
  // 次数：仅当显式传入 times 时生效（弹窗「战斗 N 场」）；不传 = 旧行为（击杀后无限连战）
  const times = (opts && opts.times > 0) ? Math.max(1, Math.min(99, Math.floor(opts.times))) : null;
  // 记住这次打谁、打几场：战斗结束后「再战」按钮据此一键接上，
  // 不必回列表重走「点卡片 → 弹窗 → 选场次 → 开战」四步。
  Prefs.lastHuntId = monsterId;
  Prefs.lastHuntTimes = times || null;
  Game.combat = { monsterId, monsterHp:m.hp, playerHp:playerMaxHp(), timer:0, maxtimer:0, spec:0,
    style, dmgOut:0, dmgIn:0, round:0, flee:0, repeat:times,
    el: m.el,                       // 敌方现属性（阴阳嬗变会改这一份，不动静态表）
    momentum: Math.max(0, Math.min(100, Math.round((opts && opts.carry) || 0))),
    combo:0, ults:0 };   // 势可承自上一场（残势），连击与绝技次数每场重记
  autoAttack = true;
  saveGame();
  UI && UI.startCombat(m, opts);
  UI && UI.floatText(monsterEl(), m.boss ? '🦹 六凶之战！' : '⚔️ 往讨', '#ffd166', !!m.boss);
  return true;
}
window.startCombat = startCombat;
window.doMonsterSpecial = doMonsterSpecial;
window.ULTIMATE_NAMES = ULTIMATE_NAMES; window.ULTIMATE_MULT = ULTIMATE_MULT;
window.foeOf = foeOf; window.bandOn = bandOn; window.bandUnlocked = bandUnlocked; window.bandLevelOf = bandLevelOf;
window.memberTier = memberTier; window.memberTierId = memberTierId; window.isMember = isMember; window.memberBonus = memberBonus;
window.doPlayerUltimate = doPlayerUltimate;
window.healAmount = healAmount;
window.autoEat = autoEat;

// 威胁评估：估算 dps 比
function playerDpsEstimate(){
  const range = playerDamageRange();
  const avg = (range.lo + range.hi)/2;
  return avg / Math.max(0.5, playerAttackInterval());
}
function threatOf(m){
  const dps = playerDpsEstimate();
  const hp = playerMaxHp();
  const mDps = Math.max(1, m.atk - totalDefence()*0.3) * 0.6 / Math.max(1, monsterInterval(m, null));
  const ratio = (dps*hp) / Math.max(1, mDps*m.hp);
  // label 只出文字；标记（✔ / ⚠）由渲染层按 mark 字段取矢量小图，
  // 免得纯文本通道里夹着平台形态不一的 emoji。
  if (ratio >= 1.6) return { level:'recommend', label:'推荐', mark:'check' };
  if (ratio >= 0.7) return { level:'fair', label:'可讨', mark:'' };
  return { level:'danger', label:'危险', mark:'warn' };
}
window.playerDpsEstimate = playerDpsEstimate; window.threatOf = threatOf;

// ---------- 御使 ----------
const BEAST_BUFFS = {
  shengsheng: { label:'狌狌·善走', gatherSpeed:0.06 },
  baiyuan:    { label:'白猿', xp:0.02 },
  lushu:      { label:'鹿蜀·宜子孙', farmSpeed:0.20 },
  xuangui:    { label:'旋龟·不聋', div:0.10 },
  lu:         { label:'鯥·无肿疾', hp:0.05 },
  lei:        { label:'类·不妒', trade:0.05 },
  boyi:       { label:'猼訑·不畏', def:4 },
  yuyu:       { label:'𪁺𪁸·无卧', offline:0.05 },
  jiuwei:     { label:'九尾狐·不蛊', loot:0.10 },
  guanguan:   { label:'灌灌·不惑', div:0.06 },
  chiru:      { label:'赤鱬·不疥', cookQty:0.10 },
  lili:       { label:'狸力·土功', build:0.10 },
  zhu:        { label:'鴸', xp:0.02 },
  changyou:   { label:'长右·大水', gatherSpeed:0.04 },
  huahuai:    { label:'猾褢·大繇', build:0.06 },
  zhi:        { label:'彘', dmg:0.05 },
  huan:       { label:'䍺·不可杀', def:2 },
  gudiao:     { label:'蛊雕', dmg:0.08 },
  quru:       { label:'瞿如', xp:0.02 },
  hujiao:     { label:'虎蛟·不肿', heal:0.10 },
  tuanyu:     { label:'鱄鱼', loot:0.04 },
  yong:       { label:'颙', xp:0.03 },
  fenghuang:  { label:'凤皇·安宁', yield:0.05 },
  yuanchu:    { label:'鹓雏', xp:0.03 },
  xi:         { label:'犀', hp:0.03 },
  si:         { label:'兕', def:3 },
  xiang:      { label:'象', hp:0.05 },
  guainiao:   { label:'怪鸟', xp:0.01 },
  guaishou:   { label:'怪兽', dmg:0.02 },
  dashe:      { label:'大蛇', dmg:0.03 },
};
function deployableBeasts(){
  return Object.values(Monsters).filter(m=>!m.boss && ((Game.records[m.id]||{}).tier||0) >= 3);
}
// ---------- 御使选优 ----------
// 三十来种御使增益、九只槽，玩家很难口算该上哪几只。这里给每个增益一个
// 「百分比当量」权重（def 是点数，按 1 点 ≈ 0.75% 生存折算），算出每槽收益，
// 既能排序，也能一键择优。
const BUFF_WEIGHT = {
  xp:100, gatherSpeed:85, yield:85, dmg:90, hp:60, loot:70,
  offline:55, def:0.75, trade:40, div:30, farmSpeed:50,
  heal:35, cookQty:20, build:30,
};
const BUFF_UNIT = {
  gatherSpeed:'采集速度', xp:'经验', yield:'采获', dmg:'伤害', loot:'掉落',
  offline:'离线效率', trade:'售价', div:'卜筮', farmSpeed:'圃艺速度',
  heal:'食疗', cookQty:'炊爨', build:'营造',
};
function beastBuffOf(id){
  if (!Monsters[id]) return null;
  return BEAST_BUFFS[id] || genericBeastBuff(Monsters[id]);
}
// 实际增益（已按著录阶缩放）的文字形式，如「采集速度 +3.6% · 气血 +3%」
function beastBuffText(id){
  const def = beastBuffOf(id);
  if (!def) return '';
  const scale = 0.6 + 0.1 * ((Game.records[id] || {}).tier || 0);
  const parts = [];
  for (const k in def){
    if (k === 'label' || typeof def[k] !== 'number') continue;
    const v = def[k] * scale;
    if (k === 'def') parts.push(`防御 +${Math.round(v * 10) / 10}`);
    else if (BUFF_UNIT[k]) parts.push(`${BUFF_UNIT[k]} +${Math.round(v * 1000) / 10}%`);
  }
  return parts.join(' · ');
}
// 每槽收益：成对御使（蛮蛮）占两槽，分数要折半才公平
function deploySlotsNeed(id){ return (Monsters[id] && Monsters[id].pair) ? 2 : 1; }
function deployScore(id){
  const def = beastBuffOf(id);
  if (!def) return 0;
  const scale = 0.6 + 0.1 * ((Game.records[id] || {}).tier || 0);
  let s = 0;
  for (const k in def){
    if (k === 'label' || typeof def[k] !== 'number') continue;
    s += def[k] * scale * (BUFF_WEIGHT[k] || 0);
  }
  return s / deploySlotsNeed(id);
}
// 一键最优：整体重排（不是只填空槽）——把低分的换掉才算「最优」
function autoDeployBest(){
  const slots = beastSlots();
  const cands = deployableBeasts()
    .map(b => ({ id:b.id, score:deployScore(b.id), need:deploySlotsNeed(b.id) }))
    .sort((a, b) => b.score - a.score);
  const picked = [];
  let used = 0;
  for (const c of cands){
    if (used + c.need > slots) continue;
    picked.push(c);
    used += c.need;
  }
  Game.deployed = {};
  let idx = 0;
  for (const p of picked){
    Game.deployed[idx++] = p.id;
    if (p.need === 2) Game.deployed[idx++] = p.id;   // 成对：相邻两槽放同一只
  }
  saveGame();
  UI && UI.renderBuffBtn && UI.renderBuffBtn();
  return { count: used, kinds: picked.length };
}
window.beastBuffText = beastBuffText; window.deployScore = deployScore;
window.deploySlotsNeed = deploySlotsNeed; window.autoDeployBest = autoDeployBest;
function deployBeast(beastId){
  if (!Monsters[beastId]) return false;
  const tier = (Game.records[beastId]||{}).tier || 0;
  if (tier < 3){ UI && UI.toast('🔒 需著录至「通形」方可御使'); return false; }
  const slots = beastSlots();
  const used = Object.keys(Game.deployed).length;
  const need = Monsters[beastId].pair ? 2 : 1;      // 蛮蛮「相得乃飞」：成对占两槽
  if (used + need > slots){ UI && UI.toast(`御使槽位不足（需 ${need} 槽，余 ${slots-used}）`); return false; }
  if (Object.values(Game.deployed).includes(beastId)){ UI && UI.toast('该异兽已在槽中'); return false; }
  let idx = 0;
  while (Game.deployed[idx]) idx++;
  Game.deployed[idx] = beastId;
  if (need === 2){                                 // 成对：写入相邻槽
    let j = idx + 1;
    while (Game.deployed[j]) j++;
    Game.deployed[j] = beastId;
  }
  const def = BEAST_BUFFS[beastId] || genericBeastBuff(Monsters[beastId]);
  log(`🐾 御使 ${Monsters[beastId].name}：${def?def.label:''}${need===2?'（相得乃飞）':''}`, 'good', 'sys');
  UI && UI.renderBuffBtn && UI.renderBuffBtn();
  UI && UI.toast(`🐾 御使 ${Monsters[beastId].name}${need===2?'（成对）':''}`);
  saveGame();
  return true;
}
function undeployBeast(idx){
  const bid = Game.deployed[idx];
  if (!bid) return false;
  delete Game.deployed[idx];
  // 成对御使（蛮蛮）：撤其一则全撤
  if (Monsters[bid] && Monsters[bid].pair){
    for (const k in Game.deployed) if (Game.deployed[k] === bid) delete Game.deployed[k];
  }
  saveGame();
  UI && UI.renderBuffBtn && UI.renderBuffBtn();
  return true;
}
function tickYushi(dt){
  const n = Object.keys(Game.deployed).length;
  if (n > 0) gainXp('yushi', 0.5 * n * dt);
}
window.BEAST_BUFFS = BEAST_BUFFS; window.deployableBeasts = deployableBeasts;
window.deployBeast = deployBeast; window.undeployBeast = undeployBeast;
window.currentActionInterval = currentActionInterval; window.globalYieldBonus = globalYieldBonus;
window.offlineCapHours = offlineCapHours; window.offlineEff = offlineEff;

// ---------- 主循环（后台补算） ----------
const FRAME_STEP   = 0.6;
const CATCHUP_MAX  = 3;
const CATCHUP_IDLE = 60;
const AWAY_MIN     = 60;
let lastTick = Date.now();
let pendingTime = 0;
let orderCheckAccum = 0;          // 方国订单轮换检查计时（秒）
function gameLoop(){
  const now = Date.now();
  let dt = (now - lastTick)/1000;
  lastTick = now;
  if (!isFinite(dt) || dt < 0) dt = 0;
  // 方国求购：每 20 秒惰性检查一次是否该轮换（到点自动换批并提示）
  orderCheckAccum += dt;
  if (orderCheckAccum >= 20){
    orderCheckAccum = 0;
    if (typeof refreshOrders === 'function') refreshOrders(false);
  }
  pendingTime += dt;
  const cap = Game.combat ? CATCHUP_MAX : CATCHUP_IDLE;
  let budget = Math.min(pendingTime, cap);
  let guard = 0;
  while (budget > 0 && guard++ < 256){
    const step = Math.min(FRAME_STEP, budget);
    stepGame(step);
    pendingTime -= step;
    budget -= step;
  }
  if (pendingTime >= AWAY_MIN){
    const away = pendingTime;
    pendingTime = 0;
    const rec = settleAway(away);
    if (rec && typeof UI !== 'undefined'){
      if (UI.refreshAll) UI.refreshAll();
      if (typeof renderCurrent === 'function') renderCurrent();
      const hasGain = rec.xp > 0 || Object.keys(rec.items||{}).length || (rec.records||0) > 0
        || (rec.harvests||0) > 0 || (rec.combat && rec.combat.fights > 0) || (rec.shells||0) > 0;
      if (hasGain && rec.seconds >= 120 && UI.showOfflineSummary) UI.showOfflineSummary(rec);
      else if (hasGain && UI.toast) UI.toast(`🌙 离山 ${Math.floor(rec.seconds/60)} 分，修得经验 +${Math.round(rec.xp)}`);
    }
  }
  if (UI && UI.tickProgress) UI.tickProgress();
  // 顶栏数值（贝币 / 已录 / 总等级）随结算实时刷新：此前只在切页或整页重绘时更新，
  // 挂机收益要等下一次渲染才看得见。节流到 500ms，set() 内部自带「未变则不打扰」。
  topbarAccum += dt;
  if (topbarAccum >= 0.5){ topbarAccum = 0; if (UI && UI.renderTopbar) UI.renderTopbar(); }
}
let oneSecondAccum = 0, activityProgress = 0, topbarAccum = 0;
function stepGame(dt){
  if (Game.buff) tickBuffs(dt);
  tickYushi(dt);
  oneSecondAccum += dt;
  while (oneSecondAccum >= 1){
    oneSecondAccum -= 1;
    onSecond();
  }
  if (Game.queueRunning && typeof ensureQueueActivity === 'function') ensureQueueActivity();
  if (Game.activity && Game.activity.kind && Game.activity.kind !== 'combat'){
    activityProgress += dt;
    const interval = currentActionInterval();
    let spin = 0;
    while (activityProgress >= interval && spin++ < 512){
      activityProgress -= interval;
      performAction(Game.activity);
      if (!Game.activity) break;
    }
  }
  if (autoAttack && Game.combat) combatTick(dt);
}
let saveTick = 0;
let idleSeconds = 0;            // 持续闲置秒数（兜底行动计时）
// ---------- 效率采样（近 20 分钟） ----------
// 统计页原先只有累计数字（总经验、总贝币），玩家看不出「此刻」收益几何——
// 换了一套配装、换了只兽、开了个兆，效率变好还是变坏，全凭感觉。
// 每 30 游戏秒留一点，保留 40 点；只存内存，不进存档（重开重采即可）。
const RATE_EVERY = 30, RATE_KEEP = 40;
function _lootTotal(){
  const g = Game.stats.gathers || {};
  let n = 0;
  for (const k in g) n += g[k] || 0;
  return n;
}
function sampleRate(){
  const s = { t: Game.stats.time | 0, xp: Game.stats.totalXp || 0, shells: Game.stats.totalEarned || 0,
              acts: Game.stats.actions || 0, loot: _lootTotal() };
  const h = Game.rateHistory = Game.rateHistory || [];
  const last = h[h.length - 1];
  // 回退（离线结算、读档回拨）→ 丢弃旧点：否则首尾相减会得出负数或离谱的大数
  if (last && (s.t < last.t || s.xp < last.xp || s.shells < last.shells)) h.length = 0;
  const tail = h[h.length - 1];
  if (tail && s.t - tail.t < RATE_EVERY) return;
  h.push(s);
  while (h.length > RATE_KEEP) h.shift();
}
// 窗口速率：取窗口内最早一点与最后一点相减。样本不足 1 分钟时返回 null（别显示 0）
function rateSummary(winSec){
  const h = Game.rateHistory || [];
  if (h.length < 2) return null;
  const end = h[h.length - 1];
  const from = end.t - (winSec || 600);
  let start = h[0];
  for (const p of h){ if (p.t >= from){ start = p; break; } }
  const dt = end.t - start.t;
  if (dt < 60) return null;
  const k = 3600 / dt;
  return {
    span: dt,
    xpPerH: Math.max(0, end.xp - start.xp) * k,
    shellPerH: Math.max(0, end.shells - start.shells) * k,
    actsPerH: Math.max(0, end.acts - start.acts) * k,
    lootPerH: Math.max(0, end.loot - start.loot) * k,
  };
}
window.sampleRate = sampleRate; window.rateSummary = rateSummary;
// 卡住了吗：有行动，却在几分钟里一点修为都没涨。
// 挂机最怕「以为在跑，其实早停了」——顶栏一直写着「樵采·桂」，人不在跟前根本发现不了。
// 判据取修为而不是动作数：performAction 先记 actions 再执行，产地不符这类失败也会 +1，
// 拿它当「还在动」的证据会漏报。慢动作（灌木一阶一小时）本来就该闲着，先按间隔排掉。
function rateStall(){
  const a = Game.activity;
  if (!a) return null;
  if (a.kind !== 'gather' && a.kind !== 'craft') return null;
  if (currentActionInterval() * 3 > 120) return null;
  const h = Game.rateHistory || [];
  if (h.length < 8) return null;
  const end = h[h.length - 1], start = h[Math.max(0, h.length - 9)];
  const dt = end.t - start.t;
  if (dt < 240) return null;
  if (end.xp > start.xp) return null;              // 还在动
  return { seconds: dt, kind: a.kind, itemId: a.itemId || null };
}
window.rateStall = rateStall;

// 旱雨轮转的「换季提示」。
// 为什么要有：季节直接改收益（教山渔获 ±RIVER），但它每六小时**静默**翻转一次，
// 玩家只会觉得「怎么忽然变慢了」——一个影响收益的状态变了却不吭声，是这个设计最坑的地方。
// 判据用「上次记录的季相」而不是「距上次提示多久」：前者跨存档、跨离线都成立，
// 后者离线八小时回来只会弹一次，且离线期间翻过季就永远漏掉。
function checkSeasonFlip(){
  const now = seasonPhase();
  const last = Game.stats.lastSeason;
  // 第一次记录（老档 / 新档 / 本功能上线前）：只登记不提示，否则每个老玩家读档都会收到一条假提示
  if (last !== 0 && last !== 1){ Game.stats.lastSeason = now; return; }
  if (last === now) return;
  Game.stats.lastSeason = now;
  if (!UI || !UI.toast) return;
  const rb = Math.round(((typeof seasonRiverBonus === 'function') ? seasonRiverBonus() : TUNING.SEASON.RIVER) * 100);
  const wet = now === 1;
  UI.toast((wet ? '🌊 入雨季' : '🏜️ 入旱季') +
    `：教山渔获 ${wet ? '+' : '−'}${rb}%（${(wet ? '雨后新涨' : '旱井见底')}这类见闻也变得可能）`);
}

function onSecond(){
  if (Object.keys(Game.farms).length){ farmTick(1); if (UI && UI.patchFarmsProgress) UI.patchFarmsProgress(); }
  if (UI && UI.patchSkillBars) UI.patchSkillBars();      // 技能页经验条秒级跟进（不重建节点）
  if (UI && UI.checkFarmUnlock) UI.checkFarmUnlock();    // 圃艺升级后新田开垦提示
  if (UI && UI.patchQueueProgress) UI.patchQueueProgress();   // 巡历队列：进度/当前标记/轮数秒级兜底
  Game.stats.time++;
  checkSeasonFlip();        // 旱雨轮转：跨过分界时告诉玩家（收益静默 ±30% 太坑）
  sampleRate();             // 效率采样：近 20 分钟的每小时收益（统计页读）
  tickOmens();
  tickAutoRites();          // 续祭：到期前 60 秒自动重备一份祭品
  checkMilestoneToast();
  // 卡住告警：判据与统计页「近况」同源（rateStall）。只提醒一次，冷却 15 分钟——
  // 这类提示宁少勿多，真卡住了玩家自己会去看；没卡住而每秒弹一次就成了噪音。
  if (!Game._stallAt || (Game.stats.time - Game._stallAt) > 900){
    const st = rateStall();
    if (st && UI && UI.toast){
      Game._stallAt = Game.stats.time;
      UI.toast(`⚠ 几分钟没有进展：${currentActivityLabel()} 可能卡住了（缺料 / 产地不符 / 队列阻塞）`);
    }
  }
  bountyTick();             // 三签：每秒比三条计数，代价可忽略
  // 闲置兜底：真正无事可做（无行动/战斗/队列）且偏好开启时，累计够久就自动接上默认行动
  if (!Game.activity && !Game.combat && !Game.queueRunning && Prefs.idleFallback !== false){
    idleSeconds++;
    if (idleSeconds >= TUNING.IDLE_GRACE && startFallbackAction()){
      if (!Game.stats.seenFallbackHint){           // 一次性说明，之后不再弹
        Game.stats.seenFallbackHint = true;
        UI && UI.toast('🌙 闲置兜底已启动——不喜此道可在「设置 → 闲置兜底」关闭');
      }
      if (UI && UI.refreshActivity) UI.refreshActivity();
      idleSeconds = 0;
    }
  } else {
    idleSeconds = 0;
  }
  saveTick++;
  if (saveTick >= 5){ saveTick = 0; saveGame(); }
}

function currentActionInterval(){
  const a = Game.activity; if (!a) return 1;
  if (a.kind === 'gather') return gatherInterval(a.skill) * geoGatherMul(Game.node);
  if (a.kind === 'observe') return TUNING.OBSERVE_SEC;
  if (a.kind === 'audience') return TUNING.OBSERVE_SEC;
  if (a.kind === 'grow') return (GROW_SITES[a.siteId]||{}).sec || 3600;
  if (a.kind === 'meditate') return TUNING.MEDITATE_SEC;   // 打坐：每息固定秒数（v1.31.168）
  if (a.kind === 'craft'){
    let base = 2.0;
    const craftPenalty = omenMod('craft');        // 毕方「讹火」：制作效率 -20%
    if (craftPenalty < 0) base *= (1 - craftPenalty);
    if (Game.buildings.zaoku) base *= 0.9;        // 灶窟：甃灶炊爨，工不暇息
    return base;
  }
  let interval = 1;
  const mv = omenMod('move');                       // 山𤟤「大风」：移动/巡历效率 -20%
  if (mv < 0) interval *= (1 - mv);
  return interval;
}

function performAction(a){
  Game.stats.actions++;
  const produced = actionOutputId(a);
  const before = produced ? totalOf(produced) : 0;
  switch(a.kind){
    case 'gather':
      doGather(a.itemId);
      // 限量采集：采满即止（与限量制作同一套 remain 语义）。
      // 必须确认 Game.activity 仍是这一个 a —— doGather 遇到越级门槛 / 产地不符会把它清掉。
      if (Game.activity === a && a.remain != null){
        a.remain--;
        if (a.remain <= 0){
          const nm = (Items[a.itemId] || {}).name || '此物';
          Game.activity = null;
          UI && UI.toast(`✓ 已采 ${nm} ${a.total || 0} 次`);
          UI && UI.refreshActivity && UI.refreshActivity();
        } else {
          UI && UI.patchActivityCount && UI.patchActivityCount();   // 顶栏「余 N 次」当场少一
        }
      }
      break;
    case 'craft':   doRecipeAction(a); break;
    case 'observe': doObserve(a.siteId); Game.activity = null; break;
    case 'audience': doAudience(a.nodeId, { oracle: a.src === 'manual' });
      if (typeof queueOnSpecialDone === 'function') queueOnSpecialDone(a); break;
    case 'grow':    doGrow(a.siteId);
      if (typeof queueOnSpecialDone === 'function') queueOnSpecialDone(a); break;
    case 'meditate': doMeditate(); break;   // 打坐：凝修为，不停歇（v1.31.168）
  }
  if (produced){
    const gained = totalOf(produced) - before;
    if (gained > 0 && typeof queueOnActionDone === 'function') queueOnActionDone(a, gained);
  }
}
function actionOutputId(a){
  if (!a) return null;
  if (a.recipe) return a.recipe.out;
  if (a.itemId) return a.itemId;
  return null;
}
function doRecipeAction(a){
  if (!a.recipe) return;
  if (!canAfford(a.recipe.cost)){
    UI && UI.toast('原料不足，停止制作');
    Game.activity = null;
    return;
  }
  const done = processRecipe(a.recipe, 1);
  // recipeType 一并带上：见闻里的「火候正好」要按工序映射回技艺（RECIPE_SKILL）
  if (done && typeof maybeEvent === 'function') maybeEvent({ kind:'craft', itemId: a.recipe.out, recipeType: a.recipe.type });
  // 限量制作（如单件武器）：做够件数就收手，不再无限连做
  if (done && a.remain != null){
    a.remain--;
    if (a.remain <= 0){
      Game.activity = null;
      UI && UI.toast(`✓ 已成 ${Items[a.recipe.out] ? Items[a.recipe.out].name : '此物'}`);
      UI && UI.refreshActivity();
    }
  }
}

// ---------- 离线 / 后台结算 ----------
// 离线续祭：开着续祭却整晚不在，礼一到期就断，回来只有一段空窗。
// 这里按「离线期间本应续上的那几份」补扣祭品（只补不预付），并把到期时间推到当下之后。
function settleRitesOffline(seconds, summary){
  const auto = Game.riteAuto;
  if (!auto) return;
  const ids = Object.keys(auto);
  if (!ids.length) return;
  const now = gameTime();
  const from = now - seconds;
  for (const id of ids){
    const def = RITES[id];
    if (!def || !def.regionId){ delete auto[id]; continue; }
    const rec = Recipes.find(r=>r.type==='rite' && r.out===id);
    if (!rec){ delete auto[id]; continue; }
    if (levelOf('jisi') < rec.lvl) continue;
    const dur = Math.max(60, def.dur || 3600);
    let cursor = (Game.rites||{})[def.regionId] || 0;
    if (cursor > now) continue;                  // 离线全程有效，不必补
    if (cursor < from) cursor = from;            // 离线前就断了：只从离线起点补起
    let paid = 0;
    while (cursor <= now && paid < 240){   // 恰在此刻到期也要续，否则回来就是一段空窗
      if (!canAfford(rec.cost)) break;
      payCost(rec.cost);
      for (const [iid, q] of rec.cost) summary.riteCost[iid] = (summary.riteCost[iid]||0) + q;
      cursor += dur; paid++;
    }
    if (!paid) continue;
    Game.rites = Game.rites || {};
    Game.rites[def.regionId] = cursor;
    Game.riteOf = Game.riteOf || {};
    Game.riteOf[def.regionId] = id;
    Game.stats.rites += paid;
    gainXp('jisi', def.xp * (Game.buildings.citan ? 1.5 : 1) * paid);
    summary.riteRenews += paid;
    (summary.riteList = summary.riteList || []).push({ id, n: paid });
    log(`🕯️ 离山期间续祭 ${(Items[id]||{}).name||id} ×${paid}`, 'gold', 'sys');
  }
}

// 离线往讨的估算。
// 战斗此前完全不跨会话（驱动它的 autoAttack 是运行时变量，读档即为 false，
// Game.combat 也被刻意丢弃），玩家挂着打怪去睡，回来一场空——而「挂」正是
// 这个品类的核心动作。这里按「一场打多久 × 能撑几场」把这段时间补上：
//   场次 = 离山秒数 ÷ (击杀时长 × 1.25 + 2)          ← 1.25 是起手、未命中、收尾的实测余量
//   撑不住的部分靠背包食物补，补不上就打到断粮为止（并在总结里写明）
// 收益按离线效率折算，连杀经验递减照旧生效。
function offlineCombat(id, seconds, eff, summary){
  const m = Monsters[id];
  if (!m) return null;
  const dps = Math.max(1, playerDpsEstimate());
  const killSec = Math.max(1, m.hp / dps);
  const per = killSec * 1.25 + 2;
  const ceilHp = Math.max(1, playerMaxHp());
  const mdps = Math.max(1, m.atk - totalDefence() * 0.3) / Math.max(1, monsterInterval(m, null)) * 0.85;
  const needPer = Math.max(0, killSec * mdps - ceilHp);

  // 背包里回血最高的那份决定「一口能顶多少」，其余按份数凑
  let best = null, portions = 0;
  for (const fid in Game.inventory){
    const it = Items[fid];
    if (!it || !it.heal || Game.inventory[fid] <= 0) continue;
    portions += Game.inventory[fid];
    const h = healAmount(it);
    if (!best || h > best.heal) best = { id:fid, heal:h };
  }
  // 即使包里没吃食也照样算「每场要几份」——否则会出现「空手打 BOSS 一百场」
  // 这种算得通、说不通的账。没食物就是 byFood = 0，一场也打不成。
  const effHeal = best
    ? Math.max(1, Math.min(best.heal, Math.round(ceilHp * (1 - (Prefs.autoEat || 0.35)))))
    : Math.max(1, Math.round(ceilHp * (1 - (Prefs.autoEat || 0.35))));
  const needPortion = needPer > 0 ? Math.max(1, Math.ceil(needPer / effHeal)) : 0;

  let fights = Math.max(0, Math.floor(seconds / per));
  let shortOnFood = false;
  if (needPortion > 0){
    const byFood = Math.floor(portions / needPortion);
    if (byFood < fights){ fights = byFood; shortOnFood = true; }
    // 按份数实扣（回血高的先用，和自动进食的取用顺序一致）
    let left = needPortion * fights;
    const order = Object.keys(Game.inventory)
      .map(fid => ({ fid, heal:(Items[fid]||{}).heal || 0 }))
      .filter(x => x.heal > 0 && Game.inventory[x.fid] > 0)
      .sort((a, b) => b.heal - a.heal);
    for (const o of order){
      if (left <= 0) break;
      const take = Math.min(left, Game.inventory[o.fid]);
      Game.inventory[o.fid] -= take;
      if (Game.inventory[o.fid] <= 0) delete Game.inventory[o.fid];
      left -= take;
    }
  }

  let xpSum = 0;
  const loot = {};
  for (let i = 0; i < fights; i++){
    const decay = Math.max(TUNING.MOB_DECAY.MIN, 1 - TUNING.MOB_DECAY.STEP * i);
    xpSum += m.xp * decay;
    (m.loot || []).forEach(([iid, p, q]) => { if (iid) loot[iid] = (loot[iid] || 0) + (p || 0) * (q || 1); });
  }
  const xp = Math.round(xpSum * eff);
  const got = {};
  for (const iid in loot){
    // 小数部分按概率进位：期望值不能直接抹零，否则稀有一栏永远拿不到
    const q = Math.floor(loot[iid] * eff + Math.random());
    if (q > 0){ giveItem(iid, q, false); got[iid] = q; }
  }
  if (fights > 0){
    const recs = Math.max(1, Math.round(fights * eff));
    for (let i = 0; i < recs; i++) recordObject(m.id, 1);
    summary.records += recs;
    // 与 meetKill 同口径：讨伐得全额，体魄得三成（手动打时体魄是靠「挨打」涨的，
    // 离线没法逐击算，按击杀结算的同一比例补上）
    if (xp > 0){
      gainXp('taofa', xp);
      gainXp('ming', Math.round(xp * 0.3));
      summary.xp += xp;
    }
    // BOSS 的专属材料（m.drop）在 meetKill 里是必给的，不走 loot 概率表，
    // 离线同样照给，否则挂一夜 BOSS 只拿到兽骨。
    if (m.boss && m.drop && Items[m.drop]){
      const q = Math.max(1, Math.round(fights * eff));
      giveItem(m.drop, q, false);
      got[m.drop] = (got[m.drop] || 0) + q;
    }
    if (m.boss && m.coins){
      const coin = Math.round(m.coins * fights * eff);
      if (coin > 0){ Game.shells += coin; Game.stats.totalEarned += coin; summary.shells = (summary.shells || 0) + coin; }
    }
    if (m.boss){
      Game.stats.bossKills[m.id] = true;
      // 神兵：离线也认，但只按一次判定，不随场次刷
      if (m.divine && Items[m.divine] && typeof chance === 'function'
          && chance(1 - Math.pow(1 - DIVINE_DROP, Math.min(fights, 20)))){
        giveItem(m.divine, 1, false);
        got[m.divine] = (got[m.divine] || 0) + 1;
        summary.divine = m.divine;
      }
    }
  }
  for (const k in got) summary.items[k] = (summary.items[k] || 0) + got[k];
  return { id, name:m.name, fights, xp, shortOnFood,
           needPortion, perSec: Math.round(per) };
}

// 开机结算。
// 此前离线时长只看 pendingTime —— 那是页面活着时累加的秒数，
// 关掉标签页再打开，dt 从 0 起算，八小时的收益一分不剩。
// SAVE_TIME_KEY 一直写着「离线结算用」，却没人读它。这里补上：
// 拿上次落盘时间与此刻的差，交给 settleAway。
function settleOnBoot(){
  let t = 0;
  try {
    const key = (typeof SAVE_TIME_KEY !== 'undefined') ? SAVE_TIME_KEY : 'shj_zhulu_save_v1_time';
    t = parseInt(localStorage.getItem(key), 10);
  } catch(e){ return null; }
  if (!isFinite(t) || t <= 0) return null;
  const away = (Date.now() - t) / 1000;
  if (away < 60) return null;                 // 一分钟以内当作刷新页面，不打扰
  const rec = settleAway(away);
  if (rec && typeof UI !== 'undefined'){
    if (UI.refreshAll) UI.refreshAll();
    if (typeof renderCurrent === 'function') renderCurrent();
    const hasGain = rec.xp > 0 || Object.keys(rec.items||{}).length || (rec.records||0) > 0
      || (rec.harvests||0) > 0 || (rec.combat && rec.combat.fights > 0) || (rec.shells||0) > 0;
    if (hasGain && UI.showOfflineSummary) UI.showOfflineSummary(rec);
  }
  return rec;
}
window.settleOnBoot = settleOnBoot;

function settleAway(seconds){
  // 原始离山时长另存：被收益上限截断时要如实告诉玩家「超出那部分没算」，
  // 否则挂了 12 小时只按 8 小时结，看着像丢收益。
  const rawSeconds = Math.max(0, seconds || 0);
  seconds = Math.min(rawSeconds, offlineCapHours()*3600);
  if (seconds < 30) return null;
  const eff = offlineEff();
  const summary = { seconds, rawSeconds, capped: rawSeconds > seconds + 30,
                    xp:0, items:{}, records:0, harvests:0, acts:{}, riteRenews:0, riteCost:{}, omensLanded:0 };
  // 烽烟不跨离线：玩家不在，没什么可「预知」的，直接让它应验。
  if (Game.omensPending && Game.omensPending.length){
    const landed = Game.omensPending.slice();
    Game.omensPending = [];
    landed.forEach(p => { applyOmen(p.id, p.soft, true); summary.omensLanded++; });
  }
  // 续祭先于采集结算：离线那几小时的祠礼若开着续祭，按同样祭品顺延补上，
  // 补完再算产出，加成才算得进去（否则回来一看「礼是续上了，但收益没沾光」）。
  settleRitesOffline(seconds, summary);
  const addXp = (skill, amount)=>{
    const g = Math.round(amount * eff);
    if (g > 0){ gainXp(skill, g); summary.xp += g; }
  };
  // 离线往讨：离开页面时正在打的怪，回来后按场次补账（见 offlineCombat 注释）
  if (Game._droppedCombat && Monsters[Game._droppedCombat]){
    const hid = Game._droppedCombat;
    Game._droppedCombat = null;
    const rec = offlineCombat(hid, seconds, eff, summary);
    if (rec) summary.combat = rec;
  }
  const a = Game.activity;
  if (a && a.kind === 'gather'){
    const it = Items[a.itemId];
    // ⚠️ 这里原写 `it.node === Game.node`：只认主产地。309 件物产有 nodes[] 多产地，
    // 站在次产地下线，离线一小时的收获是 0（而在线是照采的）。
    // 顺带对齐越级规则：在线允许差 8 级内硬采（效率打折），离线原先是直接不给。
    // v1.31.48：判据统一到 gatherAllowed / gatherAllowedAt，与在线、队列、舆地按钮同源。
    const gate = (typeof gatherAllowed === 'function') ? gatherAllowed(it) : { ok:true, eff:1 };
    const overEff = gate.eff;
    if (it && gatherAllowedAt(it, Game.node) && gate.ok){
      // 限量采集离线同样只算这么多下：设了「采 10 次」就去睡觉，回来不该是一整仓。
      const full = Math.floor(seconds / (gatherInterval(it.skill) * geoGatherMul(Game.node)));
      const times = a.remain != null ? Math.min(full, a.remain) : full;
      summary.acts.gather = times;
      addXp(it.skill, it.xp * times);
      // 离线采集也算祠礼加成，否则「挂着挖矿」反而是唯一吃不到礼的玩法。
      // ⚠️ 但必须用与线上同一个换算：线上加成落在「得两份 / 三份」的几率上，
      // +30% 实际只有约 +15% 产量（riteRealYield）。原先这里直接乘 1.30，
      // 等于离线白拿一倍于线上的礼——同一件事又写成了两处口径。
      const rb = 1 + riteRealYield(regionRiteBonus((regionOf(Game.node)||{}).regionId)) / 100;
      const q = Math.floor(times * 1.4 * eff * rb * overEff);
      if (q > 0){ giveItem(a.itemId, q, false); summary.items[a.itemId] = q; }
      const recs = Math.floor(times * eff * 1.2);
      for (let i=0;i<recs;i++) recordObject(a.itemId, 1);
      summary.records += recs;
      // 采满即收手，别留一个「余 0 次」的空活动在顶栏
      if (a.remain != null){
        a.remain -= times;
        if (a.remain <= 0) Game.activity = null;
      }
    }
  } else if (a && a.kind === 'craft'){
    // 每件耗时按 currentActionInterval() 现算：线上制作会吃到毕方「讹火」的 -20%
    // 与灶窟的 ×0.9，离线原先写死 2.0 秒，等于这两样在离线下不存在。
    // 限量制作（remain）离线时也只算这么多件，不能借离线做出整仓。
    const per = Math.max(0.5, currentActionInterval() || 2);
    const times = a.remain != null ? Math.min(Math.floor(seconds / per), a.remain) : Math.floor(seconds / per);
    let t = 0;
    while (t < times && canAfford(a.recipe.cost)){ payCost(a.recipe.cost); t++; }
    summary.acts.craft = t;
    if (t > 0){
      giveItem(a.recipe.out, a.recipe.qty*t, false);
      addXp(mapRecipeSkill(a.recipe.type), a.recipe.xp * t);
      summary.items[a.recipe.out] = a.recipe.qty*t;
      // 限量制作：离线做满件数即结束，不留一个「还剩 0 件」的空活动
      if (a.remain != null){
        a.remain -= t;
        if (a.remain <= 0) Game.activity = null;
      }
    }
  } else if (a && a.kind === 'observe'){
    const times = Math.floor(seconds / TUNING.OBSERVE_SEC);
    summary.acts.observe = times;
    for (let i=0;i<times;i++) doObserve(a.siteId);
  } else if (a && a.kind === 'meditate'){
    // 离线打坐（v1.31.168）：打坐是「默认行动」，夜里挂着它下线是常态——
    // 不结算的话，收益无声蒸发，玩家只会觉得「怎么挂了一夜修为没动」。
    // 按息数折算、吃离线效率（addXp 内乘 eff），与采集/制作同一套口径。
    const times = Math.floor(seconds / TUNING.MEDITATE_SEC);
    summary.acts.meditate = times;
    addXp('dazuo', TUNING.MEDITATE_XP * times);
  } else if (a && a.kind === 'audience'){
    const times = Math.floor(seconds / TUNING.OBSERVE_SEC);
    summary.acts.audience = times;
    for (let i=0;i<times;i++) doAudience(a.nodeId);
  } else if (a && a.kind === 'grow'){
    const site = GROW_SITES[a.siteId];
    if (site){
      const times = Math.floor(seconds / site.sec);
      summary.acts.grow = times;
      for (let i=0;i<times && (growState(a.siteId).stage||0) < site.stages;i++) doGrow(a.siteId);
    }
  }
  // 田地照常生长
  const beforeH = Game.stats.harvests;
  farmCatchUp(seconds);   // 速度只在 farmTick 里乘一次（原先这里与 farmTick 各乘一遍，离线等于平方）
  summary.harvests = Game.stats.harvests - beforeH;
  // 御使经验
  gainXp('yushi', 0.5 * Object.keys(Game.deployed).length * seconds * 0.5);
  // 离线结算记账（统计页展示）：次数 / 累计时长 / 经验 / 物品件数 / 最近一次
  const gotItems = Object.values(summary.items).reduce((a, b) => a + b, 0) + (summary.harvests || 0);
  Game.stats.offlineCount = (Game.stats.offlineCount || 0) + 1;
  Game.stats.offlineSec = (Game.stats.offlineSec || 0) + seconds;
  Game.stats.offlineXp = (Game.stats.offlineXp || 0) + summary.xp;
  Game.stats.offlineItems = (Game.stats.offlineItems || 0) + gotItems;
  Game.stats.lastOffline = { at: Date.now(), sec: seconds, xp: summary.xp, items: gotItems, records: summary.records || 0 };
  // 你不在时山里有事发生（v1.31.89）：离线见闻。放在结算之后、存档之前——
  // 它给的那点经验要进 summary 也要进档，否则刷新一次就没了。
  const away = (typeof maybeAwayEvent === 'function') ? maybeAwayEvent(seconds, summary) : null;
  if (away) summary.away = away;
  saveGame();
  if (typeof invalidateMilestones === 'function') invalidateMilestones();   // 离线跳变：刷新成就缓存
  return summary;
}
window.settleAway = settleAway;
window.settleRitesOffline = settleRitesOffline;

if (typeof window !== 'undefined'){
  window.totalOf = totalOf; window.giveItem = giveItem; window.takeItem = takeItem;
  window.canAfford = canAfford; window.payCost = payCost; window.gainXp = gainXp;
  window.doMeditate = doMeditate; window.doGather = doGather;
  window.canBreakthrough = canBreakthrough; window.doBreakthrough = doBreakthrough;
  window.currentRealm = currentRealm; window.nextRealm = nextRealm;
  window.levelOf = levelOf; window.stopActivity = stopActivity;
  window.processRecipe = processRecipe; window.gameLoop = gameLoop;
  window.farmCatchUp = farmCatchUp; window.actionOutputId = actionOutputId;
  window.playerMaxHp = playerMaxHp; window.combatTick = combatTick;
  window.playerElement = playerElement; window.playerDamageRange = playerDamageRange;
  window.playerAttackInterval = playerAttackInterval; window.totalDefence = totalDefence;
  window.playerEvasion = playerEvasion; window.monsterInterval = monsterInterval;
}
function stopActivity(){
  // 战斗也是一种「行动」：停战即结束当前这场，且不再自动接下一只。
  // （此前停止按钮在战斗中隐藏，理由是「点了也停不下战斗」——现在它真能停。）
  if (Game.combat){
    const m = foeOf(Monsters[Game.combat.monsterId]);
    Game.combat = null;
    autoAttack = false;
    log('⏹ 已停止往讨', 'sys', 'combat');
    UI && UI.toast(`⏹ 已停止往讨${m ? '：' + m.name : ''}`);
    saveGame();
    UI && UI.afterCombatEnd && UI.afterCombatEnd(null);
    UI && UI.refreshActivity();
    return;
  }
  Game.activity = null;
}

// ---------- 闲置兜底 ----------
// 放置游戏不该有「死档」：无行动、无战斗、队列未跑时，持续 IDLE_GRACE 秒后
// 自动接上默认行动。选取顺序：
//   ① 巡历页设过的兜底动作（Game.fallback，队列页设置全局生效）；
//   ② 当前节点上采得了的物产（按 樵采→采玉→渔→采药，取等级达标的第一个）。
// 战斗中 / 队列运行中 / 玩家手动选了行动，都不会被兜底抢占。
function startFallbackAction(){
  // ① 巡历兜底动作（queue.js 的 fallbackEntry/entryCanRun/startEntryActivity）
  if (typeof fallbackEntry === 'function' && typeof entryCanRun === 'function' && typeof startEntryActivity === 'function'){
    const fb = fallbackEntry();
    if (fb && entryCanRun(fb).ok){ return startEntryActivity(fb, 'fallback'); }
  }
  // ② 当前节点采集
  // v1.31.48：此前只认 it.node（主产地），站在多产地的次产地下，兜底会判定「此山无可采之物」
  // 而闲置；越级的物也不认（明明引擎采得动）。改用统一判据。
  for (const sk of ['qiaocai','caiyu','yu','caiyao']){
    const hit = (window.GATHER_POOLS[sk]||[]).find(id=>{
      const it = Items[id];
      if (!it) return false;
      if (!gatherAllowedAt(it, Game.node)) return false;
      return gatherAllowed(it).ok;
    });
    if (hit){
      activityProgress = 0;
      Game.activity = { kind:'gather', skill:sk, itemId:hit, src:'fallback' };
      return true;
    }
  }
  // ③ 打坐（v1.31.168）：以上都无着落时，静坐吐纳凝修为。
  // 至此角色永不在「空闲」——放置游戏最忌「人不在跟前就停摆」，打坐是无声的兜底修行。
  if (Game.skills.dazuo){
    activityProgress = 0;
    Game.activity = { kind:'meditate', src:'fallback' };
    return true;
  }
  return false;
}
window.startFallbackAction = startFallbackAction;
