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
  if (_dbCache.out && _dbCache.sig === sig) return _dbCache.out;
  const b = { gatherSpeed:0, xp:0, farmSpeed:0, div:0, hp:0, def:0, offline:0, trade:0, dmg:0, loot:0, cookQty:0, build:0, yield:0, heal:0 };
  for (const k in Game.deployed){
    const beast = Monsters[Game.deployed[k]];
    if (!beast) continue;
    const def = BEAST_BUFFS[beast.id] || genericBeastBuff(beast);
    const scale = 0.6 + 0.1 * ((Game.records[beast.id]||{}).tier||0);
    for (const key in def) if (key !== 'label' && typeof def[key] === 'number') b[key] += def[key] * scale;
  }
  _dbCache.sig = sig; _dbCache.out = b;
  return b;
}
// 未单独设计的异兽：按类目给一份基础增益（西山异兽众多，各有其用）
function genericBeastBuff(beast){
  if (beast.category === '鸟') return { label:'驭鸟', xp:0.02 };
  if (beast.category === '水族') return { label:'驭水族', def:1 };
  return { label:'驭兽', hp:0.02 };
}
function xpMult(){
  let m = 1;
  (window.Milestones||[]).forEach(ms=>{ if (ms.xp && ms.check()) m += ms.xp; });
  m += deployedBonuses().xp;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'xp') m += Game.buff.def.xpBonus || 0;
  return m;
}
function dmgMult(){
  let m = 1;
  (window.Milestones||[]).forEach(ms=>{ if (ms.dmg && ms.check()) m += ms.dmg; });
  m += deployedBonuses().dmg;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'all' && Game.buff.def.dmg) m += Game.buff.def.dmg;
  return m;
}
function defBonus(){
  let b = deployedBonuses().def;
  if (Game.gear.charm && Game.gear.charm.defBonus) b += Game.gear.charm.defBonus;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'def') b += Game.buff.def.def;
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'all' && Game.buff.def.def) b += Game.buff.def.def;
  return b;
}
function gatherSpeedMult(){
  let m = 1 + deployedBonuses().gatherSpeed;
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
  b += omenMod('yield');             // 凤皇「天下安宁」：全局产出 +15%
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'all' && Game.buff.def.yield) b += Game.buff.def.yield;
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
  if (Game.buff && Game.buff.def && Game.buff.def.kind === 'offline') e += Game.buff.def.offline;
  e += deployedBonuses().offline;
  e += omenMod('offline');              // 猾褢「大繇」：离线收益 -25%
  return clamp(e, 0.1, TUNING.OFFLINE.EFF_MAX);
}
function offlineCapHours(){
  let h = TUNING.OFFLINE.CAP_H;
  if (Game.buildings.canglin) h += 2;
  if (Game.buildings.tuku) h += 1;      // 土窟：因势窟土，以庇风雨
  h += Object.values(Game.observed||{}).filter(Boolean).length;   // 每处观象 +1h
  return h;
}
function maxSkillLevel(){
  let m = 1;
  for (const id in Game.skills) if (Game.skills[id].level > m) m = Game.skills[id].level;
  return m;
}
window.xpMult = xpMult; window.dmgMult = dmgMult; window.defBonus = defBonus;
window.gatherSpeedMult = gatherSpeedMult; window.farmSpeedMult = farmSpeedMult;
window.divMult = divMult; window.tradeMult = tradeMult; window.globalYieldBonus = globalYieldBonus;
window.isWise = isWise; window.offlineEff = offlineEff; window.offlineCapHours = offlineCapHours;
window.maxSkillLevel = maxSkillLevel; window.deployedBonuses = deployedBonuses;

// ---------- 征兆系统 ----------
function activateOmen(id){
  const def = OMENS[id];
  if (!def) return;
  // 征兆免疫：鵕鸟/大鹗之诛所赐；御使駮「可以御兵」御兵灾
  if (Game.omenImmune[id]) return;
  if (def.war && Object.values(Game.deployed||{}).includes('bo')) return;
  const soft = isWise() ? 0.5 : 1;                     // 灌灌「不惑」：凶兆减半
  if (def.dur > 0){
    const existing = Game.omens.find(o=>o.id===id);
    if (existing){ existing.until = Math.max(existing.until, gameTime()+def.dur); }
    else Game.omens.push({ id, until: gameTime()+def.dur, soft });
  }
  Game.stats.omens[id] = true;
  const mark = def.polarity === '凶' ? '🔴' : def.polarity === '吉' ? '🟢' : '🟡';
  log(`${mark} 征兆·${def.type}：${def.desc}（${def.beast}）`, def.polarity==='凶'?'bad':'gold', 'omen');
  UI && UI.toast(`${mark} 征兆·${def.type}\n${def.desc}`);
  UI && UI.renderBuffBtn && UI.renderBuffBtn();
  if (UI && UI.patchOmens) UI.patchOmens();     // 正在祠祀页时，新征兆即刻上格
  saveGame();
}
function omenMod(key){
  let m = 0;
  for (const o of Game.omens){
    const def = OMENS[o.id];
    if (!def || def[key] === undefined) continue;
    m += def[key] * (o.soft || 1);
  }
  return m;
}
function tickOmens(){
  const t = gameTime();
  let changed = false;
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
window.activateOmen = activateOmen; window.omenMod = omenMod; window.tickOmens = tickOmens; window.exorcise = exorcise;

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
    Game.inventory[itemId]--;
    if (Game.inventory[itemId]<=0) delete Game.inventory[itemId];
    if (Game.combat){
      Game.combat.playerHp = Math.min(playerMaxHp(), Game.combat.playerHp + it.heal);
      UI && UI.floatText(playerEl(), `+${it.heal} ❤️`, '#58b368');
    }
    log(`🍖 食${it.name}${it.effect?`，${it.effect}`:''}`, 'good', 'sys');
    UI && UI.toast(`🍖 ${it.name}${it.heal?` 回血 ${it.heal}`:''}`);
    saveGame();
    return true;
  }
  if (it.buff){ // 药剂：限时增益
    Game.inventory[itemId]--;
    if (Game.inventory[itemId]<=0) delete Game.inventory[itemId];
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
function doGather(itemId){
  const it = Items[itemId];
  if (!it || !it.skill) return;
  const skillId = it.skill;
  if (levelOf(skillId) < it.lvl){ Game.activity = null; UI && UI.toast(`🔒 需${Skills[skillId].name} ${it.lvl} 级`); return; }
  // 产地校验（同名产物可分布多山）；积石之山「万物无不有焉」不受产地限制
  const nodes = it.nodes || (it.node ? [it.node] : []);
  const special = (window.SPECIAL_NODES||{})[Game.node];
  const allYield = !!(special && special.allYield);
  if (!allYield && !nodes.includes(Game.node)){
    UI && UI.toast(`此地不产${it.name}，需往${(nodeOf(nodes[0])||{}).name||'其所'}`);
    return;
  }
  const rec = Game.records[itemId] || { count:0, tier:0 };
  let bonus = masteryBonus(rec.count) + globalYieldBonus();
  if (special && special.rareBonus) bonus += special.rareBonus;   // 积石之山：万物无不有焉
  let qty = 1;
  if (chance(TUNING.GATHER_DOUBLE + bonus*0.5)) qty = 2;
  if (chance(bonus*0.12)) qty += 1;
  giveItem(itemId, qty, false);
  Game.stats.gathers[skillId] = (Game.stats.gathers[skillId]||0) + 1;
  gainXp(skillId, it.xp * qty * (1 + bonus*0.5));
  recordObject(itemId, qty);
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
  UI && UI.log(`${Skills[skillId].icon} 采得 ${it.name} ×${qty}`, skillId, 'skill');
  UI && UI.actionFeedback(skillId, it.id, qty);
}
// 著录一个对象（含阶位提升、异兽征兆触发、关联著录）
function recordObject(objId, n){
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
window.doGather = doGather; window.recordObject = recordObject;

// ---------- 圃艺 ----------
function farmTick(elapsed){
  const grew = [];
  const speed = farmSpeedMult();
  for (const slot in Game.farms){
    const f = Game.farms[slot];
    if (!f || !f.seedId) continue;
    const seed = Items[f.seedId];
    if (!seed || !seed.crop){ delete Game.farms[slot]; continue; }
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
function slotIdNum(slot){ return parseInt(String(slot).replace('farm',''))+1; }
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
function performRite(riteId){
  const rec = Recipes.find(r=>r.type==='rite' && r.out===riteId);
  const def = RITES[riteId];
  if (!rec || !def) return false;
  if (!canAfford(rec.cost)){ UI && UI.toast('祠礼材料不备'); return false; }
  payCost(rec.cost);
  const mult = Game.buildings.citan ? 1.5 : 1;
  gainXp('jisi', def.xp * mult);
  Game.stats.rites++;
  if (def.regionId){
    Game.rites = Game.rites || {};
    Game.rites[def.regionId] = gameTime() + def.dur;
  }
  if (def.deity) recordObject(def.deity, 1);
  const r = def.regionId ? regionOf(def.regionId) : null;
  if (r){
    log(`🕯️ 行${Items[riteId].name}：${r.regionName}之神，其域产出 +${Math.round(def.yieldBonus*mult*100)}%（${Math.round(def.dur/3600)} 小时）`, 'gold', 'sys');
    UI && UI.toast(`🕯️ ${Items[riteId].name} 已成\n${r.regionName}产出 +${Math.round(def.yieldBonus*mult*100)}%`);
  } else {
    log(`🕯️ ${Items[riteId].name}：${(Items[riteId]||{}).note||''}`, 'gold', 'sys');
    UI && UI.toast(`🕯️ ${Items[riteId].name}`);
  }
  saveGame();
  return true;
}
function regionRiteBonus(regionId){
  const until = (Game.rites||{})[regionId];
  if (!until || until <= gameTime()) return 0;
  const def = Object.values(RITES).find(d=>d.regionId===regionId);
  return def ? def.yieldBonus * (Game.buildings.citan ? 1.5 : 1) : 0;
}
window.performRite = performRite; window.regionRiteBonus = regionRiteBonus;

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
  // 观瑞：初见得瑞羽（凤皇羽 / 鹓雏羽）
  const plume = { danxue:'fenghuangyu', nanyu:'yuanchuyu' }[siteId];
  if (site.kind === '观瑞'){
    if (plume && first){ giveItem(plume, 1, false); log(`🪽 得 ${Items[plume].name}`, 'gold', 'skill'); }
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
function doAudience(nodeId){
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
    }
  }
  gainXp('jisi', 200 + (n ? n.unlockLevel*4 : 0));
  gainXp('zhulu', 20);
  if (!recorded) UI && UI.log('🕯️ 再谒山川之神', 'jisi', 'skill');
  saveGame();
}
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
  if (st.stage >= site.stages){
    for (const [id, qty] of Object.entries(site.reward)) giveItem(id, qty, false);
    st.stage = 0;
    st.done = (st.done||0) + 1;
    recordObject(site.nodeId, 1);
    const got = Object.keys(site.reward).map(id => (Items[id] ? Items[id].name : id)).join('·') || '养成物';
    log(`🌳 ${site.name}乃成：得 ${got}`, 'gold', 'skill');
    UI && UI.toast(`🌳 ${site.name}乃成！\n得 ${got}`);
  } else {
    log(`🌱 灌${site.name}一阶（${st.stage}/${site.stages}）`, 'puyi', 'skill');
    UI && UI.toast(`🌱 ${site.name} ${st.stage}/${site.stages}`);
  }
  saveGame();
}
window.startGrow = startGrow; window.doGrow = doGrow;

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
  gainXp('yingyi', b.xp);
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

function playerElement(){
  const style = combatMode();
  if (style === 'zhu') return Prefs.zhuEl;
  const w = Game.gear.weapon;
  if (w && w.el) return w.el;
  if (style === 'ranged' && Game.gear.quiver) return Game.gear.quiver.el || '金';
  return '金';
}
// ---------- 装备淬炼（强化） ----------
// 装备槽里存的是「那一件」，淬炼等级按物品 id 记（同 id 共享），0–+9。
// 每级 +6% 基础伤害 / 防御，消耗炭与贝币，级数越高越贵。
const ENHANCE_MAX = 9, ENHANCE_STEP = 0.06;
function enhanceLevel(itemId){
  const v = (Game.enhance && Game.enhance[itemId]) || 0;
  return Math.max(0, Math.min(ENHANCE_MAX, v | 0));
}
function enhanceScaled(base, lv){
  if (!base) return 0;
  // 每级增量 = 基础的 6%，至少 +1——低阶兵器（伤害 5）也能一级一级看见涨，
  // 高阶（伤害 60）则按比例走，+9 约 +60%。
  const inc = Math.max(1, Math.round(base * ENHANCE_STEP));
  return base + inc * lv;
}
function enhanceCost(itemId){
  const next = enhanceLevel(itemId) + 1;
  return { next, tan: next + 1, shells: 120 * next };
}
function enhanceItem(itemId){
  const it = Items[itemId];
  if (!it || !it.equip) return false;
  const lv = enhanceLevel(itemId);
  if (lv >= ENHANCE_MAX){ UI && UI.toast('已至 +9，无可再淬'); return false; }
  const cost = enhanceCost(itemId);
  if ((Game.inventory.tan || 0) < cost.tan){ UI && UI.toast(`炭不足（需 ${cost.tan}，持有 ${Game.inventory.tan||0}）`); return false; }
  if (Game.shells < cost.shells){ UI && UI.toast(`贝币不足（需 ${cost.shells}）`); return false; }
  Game.inventory.tan -= cost.tan;
  if (Game.inventory.tan <= 0) delete Game.inventory.tan;
  Game.shells -= cost.shells;
  Game.stats.spent = (Game.stats.spent || 0) + cost.shells;
  if (!Game.enhance) Game.enhance = {};
  Game.enhance[itemId] = lv + 1;
  log(`🔨 ${it.name} 淬炼至 +${lv+1}`, 'gold', 'trade');
  UI && UI.toast(`🔨 ${it.name} +${lv+1}`);
  saveGame();
  UI && UI.refreshGear && UI.refreshGear();
  UI && UI.refreshInventory && UI.refreshInventory();
  return true;
}
window.enhanceItem = enhanceItem; window.enhanceLevel = enhanceLevel; window.enhanceCost = enhanceCost;
window.enhanceScaled = enhanceScaled;

function playerWeaponDmg(){
  const style = combatMode();
  if (style === 'zhu'){
    let d = 4 + levelOf('zhu')*0.9;
    if (Game.gear.charm && Game.gear.charm.divBonus) d += 4;   // 玉符聊作施法之助
    return d;
  }
  let dmg = 0;
  const w = Game.gear.weapon;
  if (w) dmg += (typeof enhanceScaled === 'function') ? enhanceScaled(w.dmg, enhanceLevel(w.id || w)) : (w.dmg||0);
  if (style === 'ranged' && Game.gear.quiver) dmg += Game.gear.quiver.dmg||0;
  return dmg;
}
function playerDamageRange(){
  const style = combatMode();
  const stat = style==='ranged' ? levelOf('she') : style==='zhu' ? levelOf('zhu') : levelOf('bing');
  let dmg = playerWeaponDmg() + stat*1.2;
  const beast = Game.combat ? Monsters[Game.combat.monsterId] : null;
  if (beast){
    dmg *= wuxingMult(playerElement(), beast.el);
    if (style === 'zhu' && wuxingSheng(playerElement(), beast.el)) dmg *= TUNING.WUXING.SHENG;
  }
  dmg *= dmgMult();
  return { lo: Math.max(1, Math.floor(dmg*0.6)), hi: Math.max(1, Math.floor(dmg*1.4)) };
}
function playerAttackInterval(){
  const skill = combatMode();
  let base = skill==='ranged' ? 2.4 : skill==='zhu' ? 3.2 : 2.8;
  const lvl = skill==='ranged' ? levelOf('she') : skill==='zhu' ? levelOf('zhu') : levelOf('bing');
  base -= lvl*0.008;
  return Math.max(1.5, base);
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
  return d;
}
function playerMaxHp(){
  return Math.floor(20 + levelOf('ming')*4);
}
function monsterInterval(m, c){
  let base = Math.max(2.0, 3.2 - m.hp*0.002);
  if (m.special && m.special.enrage && c && c.monsterHp < m.hp*0.5) base *= (1 - m.special.enrage); // 封豨狂暴
  return Math.max(1.2, base);
}

function combatTick(elapsed){
  if (!Game.combat) return;
  const c = Game.combat;
  const m = Monsters[c.monsterId];
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
    doPlayerAttack(c, m);
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
  if (c.playerHp <= 0) onPlayerDeath(c, m);
}

function doPlayerAttack(c, m){
  const style = combatMode();
  if (style === 'ranged'){
    const arrow = Game.gear.quiver;
    if (!arrow || (Game.inventory[arrow.id]||0) <= 0){
      if (styleAvailable('attack')){ c.style = 'attack'; log('🏹 矢尽，改用近战', 'bad', 'combat'); }
      else { Game.combat = null; UI && UI.toast('矢尽，无以讨伐'); return; }
    } else {
      Game.inventory[arrow.id]--;
      if (Game.inventory[arrow.id] <= 0){ delete Game.inventory[arrow.id]; Game.gear.quiver = null; }
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
  let dmg = roll(range.lo, range.hi);
  if (armorPierce > 0) dmg = Math.max(1, Math.floor(dmg * (1 - armorPierce)));
  const fearPenalty = (c.fearUntil && c.fearUntil > gameTime()) ? 0.30 : 0;   // 西王母震慑
  const miss = chance(Math.max(0.02, 0.08 - levelOf('bing')*0.001) + fearPenalty);
  if (miss){ UI && UI.floatText(monsterEl(), '未命中', '#8b96ac'); return; }
  c.monsterHp -= dmg;
  c.dmgOut = (c.dmgOut||0) + dmg;
  c.round = (c.round||0) + 1;
  Game.stats.damageDealt += dmg;
  Game.stats.hits++;
  gainXp(style === 'zhu' ? 'zhu' : style === 'ranged' ? 'she' : 'bing', 4);
  gainXp('taofa', 3);
  UI && UI.attackFx && UI.attackFx('player');
  UI && UI.hit(monsterEl(), `-${dmg}`, '#ff6b6b');
  if (c.playerHp > 0 && c.playerHp <= playerMaxHp() * Prefs.autoEat) autoEat(c);
}

function doMonsterAttack(c, m){
  const maxHp = playerMaxHp();
  const ev = playerEvasion() + 0.05;
  if (chance(ev)){ UI && UI.floatText(playerEl(), '闪避', '#8b96ac'); return; }
  const def = totalDefence();
  let dmg = roll(1, Math.max(1, m.atk - def*0.3));
  c.playerHp -= dmg;
  c.dmgIn = (c.dmgIn||0) + dmg;
  Game.stats.damageTaken += dmg;
  gainXp('ming', 3);
  UI && UI.attackFx && UI.attackFx('monster');
  UI && UI.hit(playerEl(), `-${dmg}`, '#ff4444');
  if (c.playerHp > 0 && c.playerHp <= maxHp * Prefs.autoEat) autoEat(c);
}

function doMonsterSpecial(c, m){
  const sp = m.special;
  if (!sp) return;
  if (sp.elementShift){
    const els = TUNING.ELEMENTS;
    m.el = els[(els.indexOf(m.el)+1) % els.length];
    UI && UI.floatText(monsterEl(), `五行 → ${m.el}`, '#c39bd3');
    log(`☯️ ${m.name} 阴阳嬗变，化为${m.el}属`, 'bad', 'combat');
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
    Game.stats.damageTaken += dmg;
    UI && UI.hit(playerEl(), `-${dmg}`, '#ff8800');
  }
  UI && UI.floatText(monsterEl(), `💥 ${sp.name}`, '#ff9f43');
  log(`💥 ${m.name} 使出${sp.name}${hits>1?`（${hits} 连）`:''}`, 'bad', 'combat');
  if (c.playerHp > 0 && c.playerHp <= playerMaxHp() * Prefs.autoEat) autoEat(c);
}

function autoEat(c){
  const candidates = [];
  for (const id in Game.inventory){
    const it = Items[id];
    if (!it || !it.heal || Game.inventory[id] <= 0) continue;
    candidates.push([id, it.heal]);
  }
  if (!candidates.length) return;
  candidates.sort((a,b)=>b[1]-a[1]);
  const [id, heal] = candidates[0];
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
function meetKill(c, m){
  const isBoss = !!m.boss;
  Game.stats.kills++;
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
  const yieldB = 1 + globalYieldBonus() + deployedBonuses().loot;
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
    if (left == null) startCombat(c.monsterId, _qDriven ? { fromQueue:true } : undefined);
    else if (left > 0) startCombat(c.monsterId, _qDriven ? { times:left, fromQueue:true } : { times:left });
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
  // 败北视为链条中断：复讨同一目标时重新从全额经验起算
  if (Game.mobStreak) Game.mobStreak = {};
  log(`💀 汝为 ${m.name} 所败`, 'bad', 'combat');
  UI && UI.deathFloat();
  const lastId = c && c.monsterId;
  Game.combat = null;
  UI && UI.afterCombatEnd && UI.afterCombatEnd(lastId);   // 败北：连杀清零，递减标签该消失
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
  const m = Monsters[monsterId];
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
  Game.combat = { monsterId, monsterHp:m.hp, playerHp:playerMaxHp(), timer:0, maxtimer:0, spec:0,
    style, dmgOut:0, dmgIn:0, round:0, flee:0, repeat:times };
  autoAttack = true;
  saveGame();
  UI && UI.startCombat(m, opts);
  UI && UI.floatText(monsterEl(), m.boss ? '🦹 六凶之战！' : '⚔️ 往讨', '#ffd166', !!m.boss);
  return true;
}
window.startCombat = startCombat;

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
      const hasGain = rec.xp > 0 || Object.keys(rec.items||{}).length || (rec.records||0) > 0 || (rec.harvests||0) > 0;
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
function onSecond(){
  if (Object.keys(Game.farms).length){ farmTick(1); if (UI && UI.patchFarmsProgress) UI.patchFarmsProgress(); }
  if (UI && UI.patchQueueProgress) UI.patchQueueProgress();   // 巡历队列：进度/当前标记/轮数秒级兜底
  // 售价走势采样：倍率随商旅/营造/御使/征兆而变，倍率一变或每满 60 秒留一个点，
  // 挂机时也有轨迹可看（渲染时只读，不再有采样副作用）
  if (!Game.priceHistory) Game.priceHistory = [];
  { const _tm = tradeMult(), _pm = Game.priceHistory[Game.priceHistory.length-1];
    if (!_pm || Math.abs(_pm.m - _tm) > 1e-3 || Date.now() - _pm.t > 60*1000){
      Game.priceHistory.push({ t: Date.now(), m: +_tm.toFixed(3) });
      if (Game.priceHistory.length > 24) Game.priceHistory.shift();
    } }
  Game.stats.time++;
  tickOmens();
  checkMilestoneToast();
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
  if (a.kind === 'gather') return gatherInterval(a.skill);
  if (a.kind === 'observe') return TUNING.OBSERVE_SEC;
  if (a.kind === 'audience') return TUNING.OBSERVE_SEC;
  if (a.kind === 'grow') return (GROW_SITES[a.siteId]||{}).sec || 3600;
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
    case 'gather':  doGather(a.itemId); break;
    case 'craft':   doRecipeAction(a); break;
    case 'observe': doObserve(a.siteId); Game.activity = null; break;
    case 'audience': doAudience(a.nodeId);
      if (typeof queueOnSpecialDone === 'function') queueOnSpecialDone(a); break;
    case 'grow':    doGrow(a.siteId);
      if (typeof queueOnSpecialDone === 'function') queueOnSpecialDone(a); break;
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
function settleAway(seconds){
  seconds = Math.max(0, Math.min(seconds, offlineCapHours()*3600));
  if (seconds < 30) return null;
  const eff = offlineEff();
  const summary = { seconds, xp:0, items:{}, records:0, harvests:0 };
  const addXp = (skill, amount)=>{
    const g = Math.round(amount * eff);
    if (g > 0){ gainXp(skill, g); summary.xp += g; }
  };
  const a = Game.activity;
  if (a && a.kind === 'gather'){
    const it = Items[a.itemId];
    if (it && it.node === Game.node && levelOf(it.skill) >= it.lvl){
      const times = Math.floor(seconds / gatherInterval(it.skill));
      addXp(it.skill, it.xp * times);
      const q = Math.floor(times * 1.4 * eff);
      if (q > 0){ giveItem(a.itemId, q, false); summary.items[a.itemId] = q; }
      const recs = Math.floor(times * eff * 1.2);
      for (let i=0;i<recs;i++) recordObject(a.itemId, 1);
      summary.records += recs;
    }
  } else if (a && a.kind === 'craft'){
    // 限量制作（remain）离线时也只算这么多件，不能借离线做出整仓
    const times = a.remain != null ? Math.min(Math.floor(seconds / 2.0), a.remain) : Math.floor(seconds / 2.0);
    let t = 0;
    while (t < times && canAfford(a.recipe.cost)){ payCost(a.recipe.cost); t++; }
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
    for (let i=0;i<times;i++) doObserve(a.siteId);
  } else if (a && a.kind === 'audience'){
    const times = Math.floor(seconds / TUNING.OBSERVE_SEC);
    for (let i=0;i<times;i++) doAudience(a.nodeId);
  } else if (a && a.kind === 'grow'){
    const site = GROW_SITES[a.siteId];
    if (site){
      const times = Math.floor(seconds / site.sec);
      for (let i=0;i<times && (growState(a.siteId).stage||0) < site.stages;i++) doGrow(a.siteId);
    }
  }
  // 田地照常生长
  const beforeH = Game.stats.harvests;
  farmCatchUp(seconds * farmSpeedMult());
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
  saveGame();
  if (typeof invalidateMilestones === 'function') invalidateMilestones();   // 离线跳变：刷新成就缓存
  return summary;
}
window.settleAway = settleAway;

if (typeof window !== 'undefined'){
  window.totalOf = totalOf; window.giveItem = giveItem; window.takeItem = takeItem;
  window.canAfford = canAfford; window.payCost = payCost; window.gainXp = gainXp;
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
    const m = Monsters[Game.combat.monsterId];
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
  for (const sk of ['qiaocai','caiyu','yu','caiyao']){
    const lv = levelOf(sk);
    const hit = (window.GATHER_POOLS[sk]||[]).find(id=>{
      const it = Items[id];
      return it && it.node === Game.node && (it.lvl||1) <= lv;
    });
    if (hit){
      activityProgress = 0;
      Game.activity = { kind:'gather', skill:sk, itemId:hit, src:'fallback' };
      return true;
    }
  }
  return false;
}
window.startFallbackAction = startFallbackAction;
