// ===== 玩家交互：选择活动、装备、商旅贸易 =====

// ---------- 开始/切换活动 ----------
function startActivity(kind, arg, opts){
  if (kind === 'combat'){ startCombat(arg); return; }
  if (kind === 'observe'){ return startObserve(arg); }
  if (kind === 'audience'){ return startAudience(arg); }
  if (kind === 'grow'){ return startGrow(arg); }
  Game.combat = null;
  autoAttack = false;
  if (kind === 'gather'){
    const it = Items[arg];
    if (!it || !it.skill){ return false; }
    if (levelOf(it.skill) < it.lvl){
      log(`🔒 ${it.name} 需${Skills[it.skill].name} ${it.lvl} 级`, 'bad');
      UI && UI.toast(`🔒 需${Skills[it.skill].name} ${it.lvl} 级`);
      return false;
    }
    if (it.node !== Game.node){
      if (!travelTo(it.node)) return false;
    }
    activityProgress = 0;
    Game.activity = { kind:'gather', skill:it.skill, itemId:arg, src:'manual' };
  } else if (kind === 'craft'){
    const [type, out] = String(arg).split('::');
    const rec = Recipes.find(r=>r.type===type && r.out===out);
    if (!rec) return false;
    if (levelOf(mapRecipeSkill(type)) < rec.lvl){
      UI && UI.toast(`🔒 需${Skills[mapRecipeSkill(type)].name} ${rec.lvl} 级`);
      return false;
    }
    if (!canAfford(rec.cost)){
      UI && UI.toast('原料不足');
      return false;
    }
    activityProgress = 0;
    // times: 制作几件后自动停（单件武器/装备用 1，材料类不传则一直做）
    const times = (opts && opts.times > 0) ? Math.floor(opts.times) : null;
    Game.activity = { kind:'craft', recipe:rec, src:'manual', remain:times };
  } else {
    return false;
  }
  if (typeof pauseQueue === 'function') pauseQueue('手动选择行动');
  saveGame();
  UI && UI.refreshActivity();
  return true;
}
function currentActivityLabel(){
  const a = Game.activity;
  if (!a) return '空闲';
  if (a.kind === 'gather') return `${Skills[a.skill].name}：${Items[a.itemId].name}`;
  if (a.kind === 'craft') return `${Skills[mapRecipeSkill(a.recipe.type)].name}：${Items[a.recipe.out].name}`;
  if (a.kind === 'observe') return `观象：${(OBSERVE_SITES[a.siteId]||{}).name||''}`;
  if (a.kind === 'audience') return `谒见：${(AUDIENCE_SITES[a.nodeId]||{}).name||''}`;
  if (a.kind === 'grow') return `灌木：${(GROW_SITES[a.siteId]||{}).name||''}`;
  return '工作中';
}
function currentActivityNodeLabel(){
  const a = Game.activity;
  const nodeId = a ? (a.itemId ? (Items[a.itemId]||{}).node : a.kind==='craft' ? Game.node : a.nodeId) : Game.node;
  const n = nodeOf(nodeId || Game.node);
  return n ? n.name : '';
}
window.startActivity = startActivity;
window.currentActivityLabel = currentActivityLabel;
window.currentActivityNodeLabel = currentActivityNodeLabel;

// ---------- 装备 ----------
const GearSlotLabels = {
  weapon:'兵器', armor:'甲胄', charm:'玉符', axe:'斧', pick:'镐', net:'网', quiver:'矢',
};
function relevantLevel(it){
  if (it.weapon && it.ranged) return levelOf('she');
  if (it.weapon) return levelOf('bing');
  if (it.axePower) return levelOf('qiaocai');
  if (it.pickPower) return levelOf('caiyu');
  if (it.netPower) return levelOf('yu');
  if (it.slot === 'armor') return levelOf('ming');
  if (it.slot === 'charm') return levelOf('zhu');
  if (it.slot === 'quiver') return levelOf('she');
  return levelOf('bing');
}
function requiredSkillName(it){
  if (it.weapon && it.ranged) return '射';
  if (it.weapon) return '兵';
  if (it.axePower) return '樵采';
  if (it.pickPower) return '采玉';
  if (it.netPower) return '渔';
  if (it.slot === 'armor') return '命';
  if (it.slot === 'charm') return '祝';
  if (it.slot === 'quiver') return '射';
  return '兵';
}
function equipSlotOf(it){
  if (it.slot) return it.slot;
  if (it.pickPower) return 'pick';
  if (it.axePower) return 'axe';
  if (it.netPower) return 'net';
  if (it.weapon) return 'weapon';
  if (it.type === 'arrow') return 'quiver';
  return 'weapon';
}
function equipItem(itemId){
  const it = Items[itemId];
  if (!it || !it.equip){ log('该物品无法装备', 'bad'); return; }
  if ((it.lvl||1) > relevantLevel(it)){
    log(`🔒 需${requiredSkillName(it)} ${it.lvl} 级`, 'bad');
    UI && UI.toast(`🔒 需${requiredSkillName(it)} ${it.lvl} 级`);
    return;
  }
  if ((Game.inventory[itemId]||0) <= 0){ log('行囊中没有该物品', 'bad'); return; }
  const slot = equipSlotOf(it);
  const old = Game.gear[slot];
  if (old) giveItem(old.id || old, 1, false);
  Game.inventory[itemId]--;
  if (Game.inventory[itemId]<=0) delete Game.inventory[itemId];
  Game.gear[slot] = it;
  saveGame();
  UI && UI.refreshGear();
  UI && UI.refreshInventory();
  log(`✅ 已装备 ${it.name}`, 'good', 'trade');
}
function unequip(slot, toBank){
  const cur = Game.gear[slot];
  if (!cur) return;
  const id = cur.id || cur;
  giveItem(id, 1, toBank);
  Game.gear[slot] = null;
  UI && UI.refreshGear();
  UI && UI.refreshInventory();
  saveGame();
}
// 装备强度（同槽位比较用）
function gearPower(it){
  if (!it) return 0;
  if (it.dmg) return it.dmg;
  if (it.def) return it.def;
  if (it.axePower) return it.axePower;
  if (it.pickPower) return it.pickPower;
  if (it.netPower) return it.netPower;
  if (it.slot === 'charm') return 1 + (it.defBonus||0) + (it.gatherBonus||0) + (it.divBonus||0) + (it.farmBonus||0) + (it.wise?2:0);
  return 0;
}
// 自动装备：每个槽位换上行囊中更强且可用等级达标的装备
function maybeAutoEquip(){
  if (!Prefs.autoEquip) return;
  for (const slot in Game.gear){
    const cur = Game.gear[slot];
    let best = cur, bestPower = gearPower(cur);
    for (const id in Game.inventory){
      const it = Items[id];
      if (!it || !it.equip || equipSlotOf(it) !== slot) continue;
      if ((it.lvl||1) > relevantLevel(it)) continue;
      const p = gearPower(it);
      if (p > bestPower){ best = it; bestPower = p; }
    }
    if (best && best !== cur) equipItem(best.id);
  }
}
window.GearSlotLabels = GearSlotLabels;
window.equipItem = equipItem; window.unequip = unequip;
window.equipSlotOf = equipSlotOf; window.relevantLevel = relevantLevel;
window.requiredSkillName = requiredSkillName; window.gearPower = gearPower;
window.maybeAutoEquip = maybeAutoEquip;

// ---------- 商旅贸易 ----------
function sellValue(itemId, qty){
  const it = Items[itemId];
  if (!it || !it.value) return 0;
  return Math.round(it.value * qty * tradeMult());
}
function sellItem(itemId, qty){
  qty = Math.floor(qty||1);
  const have = Game.inventory[itemId]||0;
  if (have <= 0 || qty <= 0) return 0;
  qty = Math.min(qty, have);
  const gain = sellValue(itemId, qty);
  if (gain <= 0){ UI && UI.toast('此物无所值'); return 0; }
  takeItem(itemId, qty, false);
  Game.shells += gain;
  Game.stats.sold += gain;
  Game.stats.totalEarned += gain;
  Game.stats.sales++;
  gainXp('shanglv', 5);
  log(`⚖️ 售出 ${Items[itemId].name} ×${qty}，得贝 ${gain}`, 'gold', 'trade');
  saveGame();
  UI && UI.refreshShop && UI.refreshShop();
  UI && UI.refreshInventory && UI.refreshInventory();
  return gain;
}
function buyItem(idx, qty){
  const stock = ShopStock[idx];
  if (!stock) return false;
  const it = Items[stock.itemId];
  if (!it) return false;
  if (levelOf('shanglv') < stock.lvl){ UI && UI.toast(`🔒 需商旅 ${stock.lvl} 级`); return false; }
  qty = Math.max(1, Math.floor(qty||1));
  const cost = stock.cost * qty;
  if (Game.shells < cost){ UI && UI.toast('贝币不足'); return false; }
  Game.shells -= cost;
  giveItem(stock.itemId, stock.qty*qty, false);
  Game.stats.spent += cost;
  Game.stats.purchases++;
  gainXp('shanglv', 5);
  log(`⚖️ 购入 ${it.name} ×${stock.qty*qty}，费贝 ${cost}`, 'gold', 'trade');
  saveGame();
  UI && UI.refreshShop && UI.refreshShop();
  UI && UI.refreshInventory && UI.refreshInventory();
  return true;
}
// ---------- 批量售出（廛市清整） ----------
// 只清点行囊中的原材料：食物 / 药品 / 装备 / 嘉种 / 嘉谷（crop 是烹饪与糈用的基底）一律不碰，
// 稀有度阈值由玩家选（凡品 → 瑰宝），避免误售培养中的资产。
const SELL_RARITY_ORDER = ['COMMON','UNCOMMON','RARE','LEGENDARY','MYTHIC'];
function sellableRows(rarity){
  const maxIdx = SELL_RARITY_ORDER.indexOf(rarity);
  if (maxIdx < 0) return [];
  const rows = [];
  for (const [id, qty] of Object.entries(Game.inventory)){
    const it = Items[id];
    if (!it || !(qty > 0) || !(it.value > 0)) continue;
    if (it.edible || it.equip || it.type === 'seed' || it.type === 'potion' || it.type === 'crop') continue;
    if (SELL_RARITY_ORDER.indexOf(rarityId(it)) > maxIdx) continue;
    rows.push({ id, name:it.name, icon:it.icon||'', qty, gain:sellValue(id, qty) });
  }
  rows.sort((a,b)=>b.gain - a.gain);
  return rows;
}
function bulkSellPreview(rarity){
  const rows = sellableRows(rarity);
  return { rows, total: rows.reduce((s,r)=>s+r.gain, 0), count: rows.reduce((s,r)=>s+r.qty, 0) };
}
function bulkSell(rarity){
  const p = bulkSellPreview(rarity);
  for (const r of p.rows) sellItem(r.id, r.qty);
  return { count: p.count, gain: p.total };
}
window.bulkSellPreview = bulkSellPreview; window.bulkSell = bulkSell;
window.sellItem = sellItem; window.buyItem = buyItem; window.sellValue = sellValue;

// ---------- 方国求购订单（商旅贸易深化） ----------
// 常驻 3 单、30 分钟轮换一批：只求购已解锁区域出产的原材料（口径同廛市清整），
// 溢价 1.3~1.8 倍——给贝币一个「卖材料」之外的第二出口，也让采集有明确目标。
function rollOrders(){
  // 候选区域：已解锁（舆地等级达标）且池中确有物品
  const byRegion = {};
  for (const it of (window.ORDER_POOL||[])){
    const rid = window.ITEM_REGION[it.id];
    if (!rid) continue;
    (byRegion[rid] = byRegion[rid]||[]).push(it);
  }
  const regions = Object.keys(byRegion).filter(rid=>{
    const r = window.regionById(rid);
    return r && regionUnlocked(r);
  });
  const T = window.TUNING.ORDERS;
  const out = [];
  const used = new Set();                    // 同批不出现重复物品
  // 区域不足时允许同区域不同物品；按剩余候选动态补位，保证尽量填满 COUNT 单
  let guard = 0;
  while (out.length < T.COUNT && guard++ < 200 && regions.length){
    const rid = regions[Math.floor(Math.random()*regions.length)];
    const cands = (byRegion[rid]||[]).filter(it=>!used.has(it.id));
    if (!cands.length){ regions.splice(regions.indexOf(rid), 1); continue; }
    const it = cands[Math.floor(Math.random()*cands.length)];
    used.add(it.id);
    const qty = window.orderQtyFor(it.value);
    const prem = +(T.PREMIUM_MIN + Math.random()*(T.PREMIUM_MAX - T.PREMIUM_MIN)).toFixed(2);
    out.push({
      id: 'o' + Date.now().toString(36) + '_' + out.length,
      itemId: it.id, regionId: rid, qty,
      premium: prem,
      total: Math.round(it.value * qty * prem),   // 总价按展示的两位溢价算，保证「价 × 量 = 总」
      xp: T.XP + Math.min(30, qty),
    });
  }
  Game.orders = out;
  Game.ordersAt = Date.now();
  return out;
}
// 惰性刷新：无订单或超 30 分钟未轮换时重roll；silent 控制是否弹提示
function refreshOrders(silent){
  const T = window.TUNING.ORDERS;
  const due = !Game.orders.length || (Date.now() - (Game.ordersAt||0)) > T.REFRESH_SEC*1000;
  if (!due) return false;
  const before = (Game.orders||[]).map(o=>o.itemId).join(',');
  rollOrders();
  if (!silent && before){
    UI && UI.toast('⚖️ 方国换了求购，墟市有新单');
    saveGame();
  }
  return true;
}
// 交付：数量足则扣物品、得贝币与商旅经验；已交付的单保留（划掉）至整批轮换
function deliverOrder(idx){
  const o = Game.orders[idx];
  if (!o) return false;
  const it = Items[o.itemId];
  if (!it){ Game.orders.splice(idx, 1); return false; }
  const have = Game.inventory[o.itemId]||0;
  if (have < o.qty){ UI && UI.toast(`🔒 ${it.name} 还差 ${o.qty - have} 件`); return false; }
  takeItem(o.itemId, o.qty, false);
  Game.shells += o.total;
  Game.stats.sold += o.total;
  Game.stats.totalEarned += o.total;
  Game.stats.sales++;
  gainXp('shanglv', o.xp);
  o.done = true;                             // 划掉留存，整批轮换时清除
  const region = window.regionById(o.regionId);
  log(`⚖️ 应方国之求，售 ${it.name} ×${o.qty} 得贝 ${o.total}`, 'gold', 'trade');
  UI && UI.toast(`⚖️ 成交！${it.name} ×${o.qty} → ${o.total} 贝${region?'（'+region.regionAlias+'）':''}`);
  saveGame();
  UI && UI.refreshShop && UI.refreshShop();
  UI && UI.refreshInventory && UI.refreshInventory();
  return true;
}
// 手动换批（与定时轮换共享冷却，避免反复重roll刷单）
function rerollOrders(){
  const T = window.TUNING.ORDERS;
  const left = T.REFRESH_SEC - (Date.now() - (Game.ordersAt||0))/1000;
  if (left > 0){ UI && UI.toast(`⏳ 方国使者未至，${Math.ceil(left/60)} 分钟后再来`); return false; }
  rollOrders();
  UI && UI.toast('⚖️ 另访方国，求得新单');
  saveGame();
  UI && UI.refreshShop && UI.refreshShop();
  return true;
}
window.rollOrders = rollOrders; window.refreshOrders = refreshOrders;
window.deliverOrder = deliverOrder; window.rerollOrders = rerollOrders;
