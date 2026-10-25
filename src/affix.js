// ============================================================================
// 装备词条（Affix）——装备的第三层养成
// ----------------------------------------------------------------------------
// 淬炼（+9）只改「基础值」，词条改的是「战斗乘区」：同一柄金剑，可以养成
// 「暴击流」或「吸血续航流」，这是两条不同的投入方向，而非同一个数字叠高。
//
// 词条按「物品 id + 重铸次数」确定性派生：同 id 同次数必得同组，读档即复原、
// 跨端一致，也不必把每条词条写进存档（只存一个整数 salt），存档不膨胀。
// 重铸 = salt + 1，耗炭与贝币，把「随机」变成可重复投入的动作。
// ============================================================================

const AFFIX_MAX = 3;

// slots 决定该词条能落在哪些槽位；range 是取值区间（整数）
const AFFIX_POOL = [
  { id:'feng', name:'锋', slots:['weapon','quiver'],         stat:'dmgPct',    range:[4,11],  fmt:v=>`伤害 +${v}%` },
  { id:'rui',  name:'锐', slots:['weapon','quiver'],         stat:'critRate',  range:[3,9],   fmt:v=>`暴击率 +${v}%` },
  { id:'lie',  name:'烈', slots:['weapon','quiver','charm'], stat:'critDmg',   range:[12,36], fmt:v=>`暴击伤害 +${v}%` },
  { id:'zhun', name:'准', slots:['weapon','quiver'],         stat:'hit',       range:[2,7],   fmt:v=>`命中 +${v}%` },
  { id:'ji',   name:'疾', slots:['weapon','quiver','armor'], stat:'atkSpeed',  range:[4,10],  fmt:v=>`攻势 +${v}%` },
  { id:'gu',   name:'固', slots:['armor'],                   stat:'def',       range:[2,9],   fmt:v=>`防御 +${v}` },
  { id:'ren',  name:'韧', slots:['armor','charm'],           stat:'dmgTaken',  range:[2,7],   fmt:v=>`减伤 ${v}%` },
  { id:'yin',  name:'饮', slots:['weapon','armor'],          stat:'lifesteal', range:[2,6],   fmt:v=>`吸血 ${v}%` },
  { id:'ji2',  name:'棘', slots:['armor','charm'],           stat:'thorns',    range:[6,18],  fmt:v=>`反伤 ${v}%` },
  { id:'yin2', name:'引', slots:['weapon','quiver','charm'], stat:'elBoost',   range:[5,14],  fmt:v=>`克制增幅 +${v}%` },
];

// 词条汇总的默认值：所有乘区从「不改变」起步
function affixZero(){
  return { dmgPct:0, critRate:0, critDmg:0, hit:0, atkSpeed:0, def:0,
           dmgTaken:0, lifesteal:0, thorns:0, elBoost:0 };
}

function affixSlotOf(item){
  if (!item || !item.equip) return null;
  if (item.slot) return item.slot;
  if (item.weapon) return 'weapon';
  return null;
}
// 条数随装备等次走：1–9 级一条、10–29 两条、30 级起三条
function affixCountFor(item){
  const lv = (item && item.lvl) || 1;
  if (lv >= 30) return 3;
  if (lv >= 10) return 2;
  return 1;
}

// FNV-1a：给字符串一个稳定种子（同输入必同输出，不依赖平台）
function affixSeed(str){
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
// 线性同余推进一步，取高位做 [0,1) 随机数
function affixNext(seed){
  const s = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: s, v: (s >>> 8) / 16777216 };
}

function affixSaltOf(itemId){
  const m = (typeof Game !== 'undefined' && Game.affixSalt) ? Game.affixSalt : null;
  return (m && (m[itemId] | 0)) || 0;
}

// 派生一件装备的词条（纯函数式：不写状态，只看 id 与 salt）
function rollAffixes(itemId){
  const it = Items[itemId];
  const slot = affixSlotOf(it);
  if (!slot) return [];
  const pool = AFFIX_POOL.filter(a => a.slots.includes(slot));
  if (!pool.length) return [];
  const n = Math.min(affixCountFor(it), pool.length);
  const salt = affixSaltOf(itemId);
  let seed = affixSeed(itemId + '#' + salt + '#' + slot);
  const picked = [];
  const taken = {};
  for (let i = 0; i < n; i++){
    seed = affixNext(seed).seed;
    let pick = affixNext(seed);
    seed = pick.seed;
    let idx = (pick.v * pool.length) | 0;
    // 同一件装备不出重复词条（最多试 40 次，池子只有 3–8 条，必然收敛）
    let guard = 0;
    while (taken[pool[idx].id] && guard++ < 40){
      seed = affixNext(seed).seed;
      pick = affixNext(seed);
      seed = pick.seed;
      idx = (pick.v * pool.length) | 0;
    }
    const def = pool[idx];
    taken[def.id] = 1;
    // 值：区间内偏上取值（0.25–1.0 权重），高阶装备更常见高值
    seed = affixNext(seed).seed;
    const t = affixNext(seed).v;
    seed = affixNext(seed).seed;
    const span = def.range[1] - def.range[0];
    const v = Math.round(def.range[0] + span * (0.25 + t * 0.75));
    picked.push({ id:def.id, name:def.name, stat:def.stat, v, text:def.fmt(v) });
  }
  return picked;
}

// 词条缓存：salt 一变即失效（重铸后立刻出新词条）
let _affixCache = { key:'', map:{} };
function affixCacheKey(){
  const s = (typeof Game !== 'undefined' && Game.affixSalt) ? Game.affixSalt : {};
  let k = '';
  for (const key in s) k += key + ':' + s[key] + '|';
  return k;
}
function affixOf(itemId){
  if (!itemId) return [];
  const key = affixCacheKey();
  if (_affixCache.key !== key){ _affixCache = { key, map:{} }; }
  if (!_affixCache.map[itemId]) _affixCache.map[itemId] = rollAffixes(itemId);
  return _affixCache.map[itemId];
}
function invalidateAffixes(){ _affixCache = { key:'', map:{} }; }

// 已装备各件的词条汇总（数值层只读这一个入口）
function affixTotals(){
  const out = affixZero();
  if (typeof Game === 'undefined' || !Game.gear) return out;
  for (const slot of ['weapon','armor','charm','quiver']){
    const g = Game.gear[slot];
    if (!g || !g.id) continue;
    for (const a of affixOf(g.id)){ out[a.stat] += a.v; }
  }
  return out;
}

// ---------- 重铸 ----------
function affixReforgeCost(itemId){
  const it = Items[itemId] || {};
  const lv = it.lvl || 1;
  return { tan: 2 + Math.floor(lv / 15), shells: 160 + lv * 16 };
}
function reforgeItem(itemId){
  const it = Items[itemId];
  if (!it || !affixSlotOf(it)){ UI && UI.toast('此物无词条可铸'); return false; }
  const cost = affixReforgeCost(itemId);
  if ((Game.inventory.tan || 0) < cost.tan){
    UI && UI.toast(`炭不足（需 ${cost.tan}，持有 ${Game.inventory.tan || 0}）`);
    return false;
  }
  if (Game.shells < cost.shells){
    UI && UI.toast(`贝币不足（需 ${cost.shells}）`);
    return false;
  }
  Game.inventory.tan -= cost.tan;
  if (Game.inventory.tan <= 0) delete Game.inventory.tan;
  Game.shells -= cost.shells;
  Game.stats.spent = (Game.stats.spent || 0) + cost.shells;
  if (!Game.affixSalt) Game.affixSalt = {};
  Game.affixSalt[itemId] = (Game.affixSalt[itemId] | 0) + 1;
  invalidateAffixes();
  const now = affixOf(itemId).map(a => a.text).join('、');
  log(`🔮 ${it.name} 重铸词条：${now || '无'}`, 'gold', 'trade');
  UI && UI.toast(`🔮 ${it.name} 词条已重铸`);
  saveGame();
  UI && UI.refreshGear && UI.refreshGear();
  return true;
}

window.AFFIX_POOL = AFFIX_POOL;
window.AFFIX_MAX = AFFIX_MAX;
window.affixZero = affixZero;
window.affixSlotOf = affixSlotOf;
window.affixCountFor = affixCountFor;
window.affixOf = affixOf;
window.affixTotals = affixTotals;
window.invalidateAffixes = invalidateAffixes;
window.rollAffixes = rollAffixes;
window.affixReforgeCost = affixReforgeCost;
window.reforgeItem = reforgeItem;
