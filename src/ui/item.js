// ===== ui/item.js — 物品详情（用途 / 出处 / 淬炼面板 / 买卖 / 配方详情） =====
// 由 ui/pack.js 拆分而来（v1.31.118）。点开一件东西的「这有什么用」全在这。
// 「这东西有什么用」——671 件物品里有 514 件不参与任何配方，玩家点开只见出处，
// 采完之后不知道该留着还是卖掉。这里把用途一次说清：哪些配方拿它当料、
// 是否祠礼祭品、能否作种，若一无所用则直说「暂无合用之方」并给出回收价。
const RECIPE_KIND = { burn:'燔燎', cook:'调鼎', smith:'锻冶', fletch:'制箭', craft:'制作', jade:'琢玉', herb:'合药', rite:'祠礼' };
function itemUses(id){
  const out = [];
  const seen = {};
  for (const r of Recipes){
    if (!Array.isArray(r.cost)) continue;
    if (!r.cost.some(c => c && c[0] === id)) continue;
    const kind = RECIPE_KIND[r.type] || '制作';
    const name = (Items[r.out] || {}).name || r.out;
    const key = kind + '/' + name;
    if (seen[key]) continue;
    seen[key] = 1;
    out.push({ kind, name, rite: r.type === 'rite' });
  }
  return out;
}

// 「这东西从哪来」——与 itemUses 正好相反的一问。行祭、制作、淬炼时常缺某样材料，
// 只说「缺 牛 0/1」等于把找料的活儿丢回给玩家；这里把产地、掉落、墟市价一次报清。
function itemSources(id){
  const it = Items[id] || {};
  const out = [];
  const nodes = it.nodes || (it.node ? [it.node] : []);
  if (it.skill && nodes.length){
    const names = nodes.map(n => (nodeOf(n) || {}).name).filter(Boolean);
    // 带上节点本身：「产自鹿吴之山」在详情里只是句话，玩家想去采还得自己去舆地页找。
    // 有了 regionId / nodeId，就能给一个「前往」按钮，把信息直接变成动作。
    const first = nodeOf(nodes[0]) || {};
    out.push({ kind:(Skills[it.skill] || {}).name || '采集', lvl: it.lvl || 1,
      regionId: first.regionId || String(nodes[0]).replace(/-\d+$/, ''),
      nodeId: nodes[0],
      unlocked: (typeof nodeUnlocked === 'function') ? !!nodeUnlocked(first) : true,
      where: names.slice(0, 2).join('、') + (names.length > 2 ? ` 等 ${names.length} 山` : '') });
  }
  for (const r of Recipes){
    if (r.out !== id || !Array.isArray(r.cost)) continue;
    const mats = r.cost.map(([iid, q]) => `${(Items[iid] || {}).name || iid}×${q}`).join('、');
    out.push({ kind: RECIPE_KIND[r.type] || '制作', lvl: r.lvl || 1,
      where:`需 ${r.lvl || 1} 级 · ${mats}` });
    break;
  }
  // 同名异兽散在各山（㸲牛一类的写法在原文里遍地都是），按名去重再计数
  const drops = [];
  const seenDrop = {};
  let dropLvl = Infinity;      // 界面会拼「讨伐 Lv${lvl}」，不填就是 Lvundefined
  for (const m of Object.values(typeof Monsters !== 'undefined' ? Monsters : {})){
    // BOSS 走单值 drop，小妖走 loot 表；两者都要看（m.loot 可能是空数组，别被真值骗了）
    const loot = (Array.isArray(m.loot) && m.loot.length) ? m.loot : [];
    const l = loot.length ? loot : (m.drop ? [[m.drop, 1, 1]] : []);
    if (!Array.isArray(l) || !l.some(x => Array.isArray(x) && x[0] === id)) continue;
    if (!m.name || seenDrop[m.name]) continue;
    seenDrop[m.name] = 1;
    drops.push(m.name);
    if (m.needLvl) dropLvl = Math.min(dropLvl, m.needLvl);
  }
  if (drops.length) out.push({ kind:'讨伐', lvl: dropLvl === Infinity ? 1 : dropLvl,
    where: drops.slice(0, 3).join('、') + (drops.length > 3 ? ` 等 ${drops.length} 种` : '') });
  // 神兵：只在 BOSS 的 divine 字段上，普通掉落表里没有
  for (const mb of Object.values(typeof Monsters !== 'undefined' ? Monsters : {})){
    if (mb.divine !== id) continue;
    const pct = Math.round((typeof DIVINE_DROP === 'number' ? DIVINE_DROP : 0.06) * 100);
    out.push({ kind:'神兵', where:`讨伐 ${mb.name}（${pct}% 掉落）` });
    break;
  }
  for (const s of (typeof ShopStock !== 'undefined' ? ShopStock : [])){
    if (s.itemId !== id) continue;
    out.push({ kind:'墟市', lvl: s.lvl || 1, where:`${s.cost} 贝 / ${s.qty} 件（需 ${s.lvl || 1} 级）` });
    break;
  }
  // 观瑞：丹穴初见得凤皇羽一类，来源写在 OBSERVE_SITES.reward 上
  for (const o of Object.values(typeof OBSERVE_SITES !== 'undefined' ? OBSERVE_SITES : {})){
    if (o.reward !== id) continue;
    out.push({ kind:'观瑞', where:`${o.name}（初见得一）` });
    break;
  }
  // 谒见：神祇不讨伐，其「遗物」唯谒见可得（如刚山神的神𩲜之足）
  for (const site of Object.values(typeof AUDIENCE_SITES !== 'undefined' ? AUDIENCE_SITES : {})){
    // v1.31.23：一神可赐多物，按 gifts 找（旧档/旧数据只有 gift 的也认）
    const d = (site.deities || []).find(x => (Array.isArray(x.gifts) && x.gifts.indexOf(id) >= 0) || x.gift === id);
    if (!d) continue;
    out.push({ kind:'谒见', where:`${d.name}（初谒得赐）` });
    break;
  }
  // 巡礼特产：走遍该系领赏可得 2 件（别处拿不到）
  if (typeof pilgrimGiftIndex === 'function'){
    const r = pilgrimGiftIndex().get(id);
    if (r) out.push({ kind:'巡礼', where:`走遍${r.regionName}（领赏得 2 件）` });
  }
  // 养成点：丹木、器酸一类三五年一熟的奇产，既非采集也非掉落
  for (const g of Object.values(typeof GROW_SITES !== 'undefined' ? GROW_SITES : {})){
    if (!g.reward || !g.reward[id]) continue;
    const hrs = Math.round((g.sec || 3600) * (g.stages || 1) / 3600 * 10) / 10;
    out.push({ kind:'养成', where:`${g.name}（${hrs} 小时一成）` });
    break;
  }
  // 作物：没有产地也没有配方，但种得出来——不反查种子就只剩「回收 4 贝」一条
  const seed = Object.values(Items).find(x => x.crop === id);
  if (seed) out.push({ kind:'圃艺', where:`植 ${seed.name}（${seed.grow || 10} 秒熟）` });
  if (it.crop) out.push({ kind:'圃艺', where:`作种可得 ${(Items[it.crop] || {}).name || ''}`.trim() });
  if (it.value) out.push({ kind:'回收', where:`${sellValue(id, 1)} 贝 / 件` });
  return out;
}

// 淬炼面板：等级、成功率、材料、失败代价、一键强化。
// 独立成块是为了「就地刷新」——强一次关一次窗，连点三下要开三次，太笨。
// target 可以是行囊里的 itemId，也可以是装备槽里的实例（v1.31.13）——
// 两件同名装备各有各的淬炼等级，详情页展示与操作的都是「你正在看的这一件」。
function enhancePanelHtml(target, it){
  const base = it.dmg || it.def || 0;
  if (!it.equip || !base) return '';
  const itemId = (typeof enhTargetId === 'function') ? enhTargetId(target) : target;
  const lv = enhanceLevel(target);
  const max = (typeof enhanceCapOf === 'function' && typeof gearGrade === 'function')
    ? enhanceCapOf(it) : ENHANCE_MAX;
  const cur = Math.floor(enhanceScaled(base, lv));
  const label = it.dmg ? '伤害' : '防御';
  const heat = (typeof enhanceHeatOf === 'function') ? enhanceHeatOf(itemId) : 0;   // 火候按「这一炉」记，同 id 共享
  const heatMax = (typeof ENHANCE_HEAT !== 'undefined') ? ENHANCE_HEAT.MAX : 12;
  const heatStep = (typeof ENHANCE_HEAT !== 'undefined') ? ENHANCE_HEAT.STEP : 0.08;
  if (lv >= max){
    return `<div class="reveal"><b>淬炼</b><span class="enh-max">已至 +${max}（上限）· ${label} ${cur}</span></div>`;
  }
  const cost = enhanceCost(target);
  const baseRate = enhanceRate(lv);
  const rate = Math.round((typeof enhanceRateFor === 'function' ? enhanceRateFor(target) : baseRate) * 100);
  const nxt = Math.floor(enhanceScaled(base, lv + 1));
  const safe = lv < ENHANCE_SAFE;
  const stones = Game.inventory.zhenwu || 0;
  const last = (UI._enhLast && UI._enhLast.id === itemId) ? UI._enhLast : null;
  const cls = rate >= 50 ? 'ok' : rate >= 20 ? 'mid' : 'hard';
  // 火候：十二格炉温。毁一次添一格，成了也不熄——这是「一败俱毁」的补偿，
  // 不写明的话玩家只会觉得这系统在坑他。
  const cells = Array.from({ length: heatMax }, (_, i) =>
    `<i class="${i < heat ? 'on' : ''}"></i>`).join('');
  const heatTip = heat
    ? `火候 +${Math.round(heat * heatStep * 100)}%（基础 ${Math.round(baseRate*100)}% → 实成 ${rate}%）`
    : `火候未起：每毁一次添一格，每格 +${Math.round(heatStep*100)}%`;
  return `<div class="reveal enh-box">
    <b>淬炼</b>
    <div class="enh-hd">
      <span class="enh-lv">+${lv}<i> / ${max}</i></span>
      <span class="enh-rate ${cls}">成功率 ${rate}%</span>
      <span class="enh-grade" title="${esc(gearGrade(it).desc)} · 上限 +${max}">${gearGrade(it).name}品</span>
      ${last ? `<span class="enh-log ${last.cls}">${esc(last.text)}</span>` : ''}
    </div>
    <div class="enh-val">${label} <b>${cur}</b> → <b>${nxt}</b>
      <span class="hint ${safe ? '' : 'danger'}">${safe ? `未至 +${ENHANCE_SAFE}，失败只损材料` : '失败阶数尽毁，直落 +0（镇物可护）'}</span></div>
    <div class="enh-heat" title="${esc(heatTip)}">
      <span class="hlabel">火候</span><span class="hcells">${cells}</span>
      <span class="htxt">${heat ? `+${Math.round(heat*heatStep*100)}%` : '—'}</span>
    </div>
    <div class="enh-cost">炭 ×${cost.tan} · ${fmt(cost.shells)} 贝${safe ? '' : `　·　镇物 ×1（有 ${stones}）`}</div>
    <div class="enh-btns">
      <button class="btn small primary" onclick="UI.enhanceOne()">强化 +1</button>
      <span class="enh-to">
        <input id="enhTarget" type="number" min="${lv + 1}" max="${max}" placeholder="目标等级" inputmode="numeric"
          oninput="UI.patchEnhEstimate()">
        <button class="btn small" onclick="UI.enhanceTo()">强化至</button>
      </span>
      ${safe ? '' : `<label class="enh-stone"><input type="checkbox" id="enhStone" ${stones ? 'checked' : 'disabled'}> 用镇物</label>`}
    </div>
    <div class="enh-est" id="enhEst"></div>
  </div>`;
}

// 物品详情的内容独立出来：强化 / 重铸执行后就地重绘，不关窗
// 「强化至 +N」的预估：填了目标才出现，说明要锤几次、耗多少炭与贝。
// 这块信息原先完全没有——+20 之后一次就要几十万贝，玩家是点下去才知道贵。
UI.patchEnhEstimate = function(){
  const box = (typeof document !== 'undefined') ? document.getElementById('enhEst') : null;
  if (!box) return;
  const inp = $('enhTarget');
  const goal = parseInt(inp && inp.value, 10);
  const target = UI._enhTarget;
  if (!target || !isFinite(goal) || typeof estimateEnhanceTo !== 'function'){
    box.textContent = '';
    box.className = 'enh-est';
    return;
  }
  const e = estimateEnhanceTo(target, goal);
  if (!e || !e.tries){ box.textContent = ''; box.className = 'enh-est'; return; }
  const itemId = (typeof enhTargetId === 'function') ? enhTargetId(target) : target;
  const shortTan = (Game.inventory.tan || 0) < e.tan;
  const shortShells = Game.shells < e.shells;
  const warn = (shortTan || shortShells)
    ? `<b class="est-warn">${shortTan ? '炭不足' : ''}${shortTan && shortShells ? ' · ' : ''}${shortShells ? '贝不足' : ''}</b>` : '';
  box.innerHTML = `约 <b>${e.tries}</b> 锤 · 炭 <b class="${shortTan ? 'est-warn' : ''}">${fmt(e.tan)}</b>`
    + ` · 贝 <b class="${shortShells ? 'est-warn' : ''}">${fmt(e.shells)}</b>`
    + `${e.cap < goal ? `（止于上限 +${e.cap}）` : ''}${warn ? '　' + warn : ''}`;
  box.className = 'enh-est on' + (warn ? ' short' : '');
};

UI.itemDetailHtml = function(itemId){
  const it = Items[itemId];
  if (!it) return '';
  // 从装备槽点进来时，UI._detailGear 记着是哪个槽——那时「强化」作用于身上这一件，
  // 而不是行囊里同名的另一件。
  const gearInst = (UI._detailGear && Game.gear[UI._detailGear]
    && (Game.gear[UI._detailGear].id || Game.gear[UI._detailGear]) === itemId) ? Game.gear[UI._detailGear] : null;
  // 行囊装备按档看：_detailEnh 指定哪一档，未指定取最高档。qty 是「这一档几件」，
  // bagAll 是「同名共几件」——两者分开，玩家才知道自己卖的是哪一档。
  const stacks = (it.equip && !gearInst && typeof gearStacks === 'function') ? gearStacks(itemId) : [];
  const bagAll = (typeof bagQty === 'function') ? bagQty(itemId) : (Game.inventory[itemId] || 0);
  let enhLv = (it.equip && !gearInst)
    ? (UI._detailEnh != null ? UI._detailEnh : (stacks[0] ? stacks[0].enh : 0))
    : 0;
  // 这一档卖空了（最后一支箭售出后）：回落到还有货的最高档，别把弹窗停在一个空档上
  if (it.equip && !gearInst && stacks.length && !stacks.some(s => s.enh === enhLv)) enhLv = stacks[0].enh;
  const qty = (it.equip && !gearInst)
    ? ((stacks.find(s => s.enh === enhLv) || {}).qty || 0)
    : bagAll;
  // 强化目标：身上那件实例 / 行囊里这一档的第一件实例
  const bagInst = (it.equip && !gearInst)
    ? ((Game.packGear || []).find(g => g.id === itemId && (g.enh | 0) === enhLv) || null)
    : null;
  UI._enhTarget = gearInst || bagInst || (it.equip ? null : itemId);
  const enhShow = gearInst ? (gearInst.enh | 0) : enhLv;
  const rec = Game.records[itemId];
  const actions = [];
  if (it.equip && gearInst){
    actions.push(`<button class="btn" onclick="unequip('${UI._detailGear}',false);UI.closeModal();UI.renderPack()">卸下</button>`);
  } else if (it.equip){
    const lvOk = (it.lvl||1) <= relevantLevel(it);
    const recOk = (typeof reqRecordOk !== 'function') || reqRecordOk(it);
    const ok = lvOk && recOk;
    const why = !lvOk ? `需${requiredSkillName(it)} ${it.lvl}` : (!recOk ? '著录未及' : '');
    actions.push(`<button class="btn ${ok?'primary':''}" ${ok?'':'disabled'} onclick="equipItem('${itemId}',${enhLv});UI.closeModal()">装备${enhLv ? ' +' + enhLv : ''}${ok?'':'（'+why+'）'}</button>`);
  }
  // 食物只在战中有意义（气血只存在于战斗态）：非战时按钮降为次要样式、写明「战中」，
  // 点了也不关窗——省得玩家白丢一块肉还以为回了血。
  if (it.heal || it.buff){
    const noFight = !!it.heal && !Game.combat;
    const label = it.heal ? (noFight ? '食用（战中）' : '食用') : '服用';
    actions.push(`<button class="btn ${noFight ? '' : 'primary'}" ${noFight ? 'title="气血只在战中会掉，此物留待战时用"' : ''}
      onclick="useConsumable('${itemId}');${noFight ? '' : 'UI.closeModal()'}">${label}</button>`);
  }
  // 出售改成「数量可填」的交易区（见下方 tradeBlock），不再放死档位按钮

  const hasAffix = it.equip && typeof affixSlotOf === 'function' && affixSlotOf(it);
  const afList = hasAffix ? affixOf(itemId) : [];
  const afCost = hasAffix ? affixReforgeCost(itemId) : null;
  const afOk = afCost ? ((Game.inventory.tan || 0) >= afCost.tan && Game.shells >= afCost.shells) : false;

  // 与身上同槽那件对比：点开一件兵器只见「伤害 15」，玩家不知道比身上的 12 好在哪，
  // 只能退出去看装备栏、再回来——「一键最优」能替他决定，但不能替他判断。
  let cmpLine = '';
  if (it.equip && !gearInst && typeof gearPower === 'function' && typeof equipSlotOf === 'function'){
    const slot = equipSlotOf(it);
    const cur = slot ? Game.gear[slot] : null;
    const inst = Object.assign({}, it, { enh: enhLv });
    const pw = gearPower(inst);
    if (cur && (cur.id !== itemId || (cur.enh | 0) !== enhLv)){
      const cw = gearPower(cur);
      const d = pw - cw;
      const cls = d > 0 ? 'up' : (d < 0 ? 'down' : 'same');
      const cname = (cur.name || '') + ((cur.enh | 0) ? ' +' + (cur.enh | 0) : '');
      const arrow = d > 0 ? `▲ +${Math.round(d)}` : (d < 0 ? `▼ ${Math.round(d)}` : '持平');
      cmpLine = `<div class="cmp-line ${cls}">较身上「${esc(cname)}」：战力 ${Math.round(cw)} → <b>${Math.round(pw)}</b>　${arrow}</div>`;
    } else if (!cur){
      cmpLine = `<div class="cmp-line">此槽尚空 · 战力 ${Math.round(pw)}</div>`;
    }
  }
  return `<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(itemId,18):it.icon}</span> ${esc(it.name)}${enhShow ? ` <span class="hd-enh">+${enhShow}</span>` : ''} ${it.equip?gradeBadge(it):`<span class="tier">${rarityName(it)}</span>`}</h3>
    ${cmpLine}
    <div class="meta">${it.equip
      ? `行囊 ${bagAll} 件${qty ? ` · 本档 ${enhShow ? '+' + enhShow : '+0'} ×${qty}` : ''}`
      : `行囊 ${qty} 件`}${rec?` · 著录 ${rec.count} 次（${TUNING.MASTERY.NAMES[rec.tier]}）`:''}</div>
    ${(it.equip && !gearInst && stacks.length > 1) ? `<div class="reveal"><b>分档</b><span class="use-box">${stacks.map(s =>
      `<button class="btn tiny ${s.enh === enhLv ? 'on' : ''}" type="button" onclick="showItemDetail('${itemId}','',${s.enh})">+${s.enh} ×${s.qty}</button>`).join('')}</span></div>` : ''}
    ${it.form?`<div class="reveal"><b>形态</b>${esc(it.form)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
    ${(function(){
      // 产地：可采之物给「前往」，一键切到舆地页对应节点（未解锁则标灰）。
      // 「产自鹿吴之山」原先只是句话，玩家想采还得自己去舆地页翻——信息与动作之间是断的。
      const src = (typeof itemSources === 'function') ? itemSources(itemId).find(x => x.nodeId) : null;
      if (!src || !src.nodeId) return '';
      const nd = (typeof nodeOf === 'function') ? nodeOf(src.nodeId) : null;
      const nm = (nd && nd.name) || '';
      const go = src.unlocked
        ? `<button class="btn-mini skill-go" onclick="UI.selRegion='${esc(src.regionId)}';UI.selNode='${esc(src.nodeId)}';UI.closeModal();UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} 前往${esc(nm)}</button>`
        : `<span class="hint">${typeof markIcon==='function'?markIcon('lock',13):'🔒'} ${esc(nm)}尚未解锁</span>`;
      return `<div class="reveal"><b>产地</b><span class="use-box">${go}</span></div>`;
    })()}
    ${it.note?`<div class="reveal"><b>出处</b>${esc(it.note)}</div>`:''}
    ${it.equip && typeof gearKindOf === 'function' && gearKindOf(it)
      ? (() => {
          const g = gearGrade(it), r = gearRatio(it);
          const rel = Math.round((r - 1) * 100);
          const cap = (typeof enhanceCapOf === 'function') ? enhanceCapOf(it) : 0;
          return `<div class="reveal"><b>等阶</b>${gradeBadge(it)}
            <span class="gd-desc">${esc(g.desc)}</span>
            <span class="gd-rel ${rel >= 0 ? 'up' : 'down'}">较同级良品 ${rel >= 0 ? '+' : '−'}${Math.abs(rel)}%</span>
            ${cap ? `<span class="gd-cap">可淬 +${cap}</span>` : ''}</div>`;
        })()
      : ''}
    ${it.reqRecord?`<div class="reveal"><b>佩用</b><span class="${(typeof reqRecordOk==='function'&&reqRecordOk(it))?'':'lack-n'}">${esc(typeof reqRecordText==='function'?reqRecordText(it):'')}</span></div>`:''}
    ${(() => {
      const uses = itemUses(itemId);
      const crop = it.crop ? `<span class="use-chip">可作嘉种（收 ${esc((Items[it.crop]||{}).name || it.crop)}）</span>` : '';
      // 可服用的药也算「有用」：原先只看它能不能当配方材料，于是山海图卷这种纯增益药
      // 被判成「暂无合用之方——可售」，和下面「服用：窥山 900s」自相矛盾，等于劝玩家卖掉它。
      const dose = it.buff
        ? `<span class="use-chip">服用·${esc(it.buff.name || '增益')}${it.buff.dur ? `（${Math.round(it.buff.dur/60)} 分）` : ''}</span>`
        : '';
      // 装备的用途就是「穿」：原先这条完全没列，一件兵器点开也写「暂无合用之方——可售」，
      // 等于劝玩家把身上的家伙卖掉。
      const wear = (it.equip && typeof equipSlotOf === 'function' && typeof GearSlotLabels !== 'undefined')
        ? `<span class="use-chip">可装备·${esc(GearSlotLabels[equipSlotOf(it)] || '')}</span>`
        : '';
      const body = uses.length
        ? uses.slice(0, 10).map(u => `<span class="use-chip ${u.rite ? 'rite' : ''}">${u.kind}·${esc(u.name)}</span>`).join('') + (uses.length > 10 ? `<span class="hint">等 ${uses.length} 处</span>` : '')
        : ((crop || dose || wear) ? '' : '<span class="hint">暂无合用之方——可售或留作图鉴</span>');
      const price = (typeof sellValue === 'function' && it.value) ? `<span class="hint">回收 ${sellValue(itemId, 1)} 贝 / 件</span>` : '';
      return (body || crop || dose || wear) ? `<div class="reveal"><b>用途</b><span class="use-box">${wear}${crop}${dose}${body}${price}</span></div>` : '';
    })()}
    ${it.divine && typeof DIVINE_EFFECTS !== 'undefined' && DIVINE_EFFECTS[it.divine]
      ? `<div class="reveal"><b>神兵</b><span class="dv-tag">${esc(DIVINE_EFFECTS[it.divine].label)}</span><span class="dv-text">${esc(DIVINE_EFFECTS[it.divine].text)}</span></div>` : ''}
    ${(UI._enhTarget || !it.equip) ? enhancePanelHtml(UI._enhTarget || itemId, it) : ''}
    ${afList.length?`<div class="reveal"><b>词条</b>${afList.map(x=>`<span class="af-txt"><i>${esc(x.name)}</i>${esc(x.text)}</span>`).join('')}</div>`:''}
    ${afCost?`<div class="reveal"><b>重铸</b><span class="af-recost">换一组词条（炭×${afCost.tan} · ${afCost.shells} 贝）</span>
      <button class="btn small ${afOk?'primary':''}" ${afOk?'':'disabled'} onclick="UI.reforgeNow('${itemId}')">重铸</button></div>`:''}
    ${it.buff?`<div class="reveal"><b>服用</b>${esc(it.buff.name)}（${it.buff.dur}s）</div>`:''}
    ${it.heal?`<div class="reveal"><b>食用</b>回血 ${it.heal}</div>`:''}
    ${(it.value && qty > 0) ? `<div class="reveal trade-block">
      <b>售出${it.equip ? `（行囊 ${enhShow ? '+' + enhShow : '+0'} 这一档）` : ''}</b>
      <div class="qty-line">
        <button class="btn tiny" type="button" title="减一件" onclick="qtyStep('sellQty',-1)">−</button>
        <input id="sellQty" class="qty-input" type="number" inputmode="numeric" min="1" max="${qty}" value="1"
          oninput="syncSell('${itemId}',${it.equip ? enhLv : 'null'})">
        <button class="btn tiny" type="button" title="加一件" onclick="qtyStep('sellQty',1)">＋</button>
        <button class="btn tiny" type="button" onclick="qtySet('sellQty',${qty})">全部</button>
        <button class="btn primary" onclick="sellN('${itemId}',${it.equip ? enhLv : 'null'})">售出</button>
      </div>
      <div class="hint">可得 <b class="qty-gain" id="sellGain">${fmt(sellValue(itemId, 1))} 贝</b> · 单价 ${fmt(sellValue(itemId,1))} 贝 · 持有 ×${qty}</div>
      ${(it.equip && enhShow > 0) ? `<div class="hint danger">⚠ 这一档已淬炼到 +${enhShow}，售出后阶数与投入一并失去</div>` : ''}
      ${gearInst ? '<div class="hint">身上的那一件不受影响</div>' : ''}
    </div>` : ''}
    <div class="modal-btns">${actions.join('')}<button class="btn" onclick="UI.closeModal()">闭</button></div>`;
};

// enh：行囊里点的是哪一档（+2 的那堆 / +0 的那堆）。不传则默认最高档。
function showItemDetail(itemId, gearSlot, enh){
  if (!Items[itemId]) return;
  const enhv = (enh == null) ? null : (enh | 0);
  if (UI._detailId !== itemId || UI._detailGear !== (gearSlot || null) || UI._detailEnh !== enhv) UI._enhLast = null;
  UI._detailId = itemId;
  UI._detailGear = gearSlot || null;
  UI._detailEnh = enhv;
  UI.modal(UI.itemDetailHtml(itemId));
}

// ---------- 数量操作（售卖 / 购入共用） ----------
// 上限写在 input 的 max 上，步进与「全部」都读它——三个入口各写一遍迟早对不上。
function qtyStep(id, d){
  const el = $(id);
  if (!el) return;
  const max = Math.max(1, parseInt(el.max, 10) || 1);
  el.value = Math.max(1, Math.min(max, (parseInt(el.value, 10) || 1) + d));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function qtySet(id, v){
  const el = $(id);
  if (!el) return;
  const max = Math.max(1, parseInt(el.max, 10) || 1);
  el.value = Math.max(1, Math.min(max, v));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function syncSell(itemId, enh){
  const el = $('sellQty'), g = $('sellGain');
  if (!el || !g) return;
  const have = Math.max(1, sellableQty(itemId, enh));
  const n = Math.max(1, Math.min(have, parseInt(el.value, 10) || 1));
  g.textContent = fmt(sellValue(itemId, n)) + ' 贝';
}
// 这一档可卖几件（装备按档，材料按总量）
function sellableQty(itemId, enh){
  if (enh != null && typeof isEquipId === 'function' && isEquipId(itemId)){
    const st = (typeof gearStacks === 'function' ? gearStacks(itemId) : []).find(x => x.enh === (enh|0));
    return st ? st.qty : 0;
  }
  return (typeof bagQty === 'function') ? bagQty(itemId) : (Game.inventory[itemId] || 0);
}
function sellN(itemId, enh){
  const el = $('sellQty');
  const have = sellableQty(itemId, enh);
  if (have <= 0){ UI.closeModal(); return; }
  const n = Math.max(1, Math.min(have, parseInt(el && el.value, 10) || 1));
  const gain = sellItem(itemId, n, enh == null ? undefined : enh);
  if (gain > 0) UI.toast(`⚖️ 售出 ${(Items[itemId]||{}).name||''} ×${n}，得贝 ${fmt(gain)}`);
  if (sellableQty(itemId, enh) > 0) UI.refreshItemModal(itemId);
  else if (sellableQty(itemId, null) > 0) showItemDetail(itemId, '', null);   // 这一档卖空了，退回看别的档
  else UI.closeModal();
}
window.qtyStep = qtyStep; window.qtySet = qtySet;
window.syncSell = syncSell; window.sellN = sellN; window.sellableQty = sellableQty;

// ---------- 市廛：商品详情与批量购入 ----------
// 原先点一下直接买 1 份、右上「×10」买十份——想买 37 份得点四次。
// 现在单击先看详情，数量自填；「×10」仍留作快捷。
function showShopItem(idx){
  const s = ShopStock[idx];
  const it = s && Items[s.itemId];
  if (!it) return;
  const lvOk = levelOf('shanglv') >= s.lvl;
  const afford = Math.floor(Game.shells / Math.max(1, s.cost));
  const max = lvOk ? Math.max(0, Math.min(99, afford)) : 0;
  const uses = (typeof itemUses === 'function') ? itemUses(s.itemId) : [];
  UI.modal(`<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(s.itemId,18):(it.icon||'📦')}</span> ${esc(it.name)} <span class="tier">${rarityName(it)}</span></h3>
    <div class="meta">${s.qty} 件 / 份 · 单价 ${s.cost} 贝 · 需商旅 ${s.lvl} 级</div>
    ${it.note?`<div class="reveal"><b>出处</b>${esc(it.note)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
    ${uses.length?`<div class="reveal"><b>用途</b><span class="use-box">${uses.slice(0,8).map(u=>`<span class="use-chip ${u.rite?'rite':''}">${u.kind}·${esc(u.name)}</span>`).join('')}</span></div>`:''}
    <div class="reveal trade-block">
      <b>购入</b>
      <div class="qty-line">
        <button class="btn tiny" type="button" title="减一份" onclick="qtyStep('buyQty',-1)" ${max?'':'disabled'}>−</button>
        <input id="buyQty" class="qty-input" type="number" inputmode="numeric" min="1" max="${Math.max(1,max)}" value="1"
          oninput="syncBuy(${idx})" ${max?'':'disabled'}>
        <button class="btn tiny" type="button" title="加一份" onclick="qtyStep('buyQty',1)" ${max?'':'disabled'}>＋</button>
        <button class="btn tiny" type="button" onclick="qtySet('buyQty',${Math.max(1,max)})" ${max?'':'disabled'}>至多</button>
      </div>
      <div class="hint">共计 <b class="qty-gain" id="buyCost">${fmt(s.cost)} 贝</b> · 持有 ×${typeof bagQty==='function'?bagQty(s.itemId):(Game.inventory[s.itemId]||0)} · 贝币 ${fmt(Game.shells)} · ${lvOk?`至多可买 ${max} 份`:`需商旅 ${s.lvl} 级（现 ${levelOf('shanglv')}）`}</div>
    </div>
    <div class="modal-btns">
      <button class="btn primary" id="buyGo" onclick="buyN(${idx})" ${max?'':'disabled'}>购入 1 份（${fmt(s.cost)} 贝）</button>
      <button class="btn" onclick="UI.closeModal()">闭</button>
    </div>`);
}
function syncBuy(idx){
  const s = ShopStock[idx], el = $('buyQty'), g = $('buyCost'), go = $('buyGo');
  if (!s || !el || !g) return;
  const max = Math.max(1, parseInt(el.max, 10) || 1);
  const n = Math.max(1, Math.min(max, parseInt(el.value, 10) || 1));
  const cost = fmt(s.cost * n) + ' 贝';
  g.textContent = cost;
  if (go) go.textContent = `购入 ${n} 份（${cost}）`;   // 底部按钮跟着数量走
}
function buyN(idx){
  const s = ShopStock[idx], el = $('buyQty');
  if (!s) return;
  const max = Math.max(1, parseInt(el && el.max, 10) || 1);
  const n = Math.max(1, Math.min(max, parseInt(el && el.value, 10) || 1));
  if (buyItem(idx, n)) UI.toast(`⚖️ 购入 ${(Items[s.itemId]||{}).name||''} ×${s.qty*n}`);
  if (UI.currentTab === 'shichan') UI.renderShichan();
  showShopItem(idx);           // 重开一层，数量与「持有 / 贝币」跟着变
}
window.showShopItem = showShopItem; window.syncBuy = syncBuy; window.buyN = buyN;

// ---------- 技能 / 配方的详情弹窗 ----------
// 手机没有 hover：技能卡浮层里的「产出地 / 材料来源 / 将至」在触屏上等于不存在。
// 点一下就把同一份信息摆进弹窗，并且能直接跳去产地。
function showSkillDetail(id){
  const sk = Skills[id];
  if (!sk) return;
  const raw = Game.skills[id] || { level:1, xp:0 };
  const lv = levelOf(id);
  const cur = xpForLevel(raw.level), next = xpForLevel(raw.level + 1);
  const need = Math.max(0, next - (raw.xp || 0));
  const nf = nodeForSkill(id);
  const mns = nf ? [] : materialNodesForSkill(id);
  const mst = nf ? [] : materialStatusForSkill(id);
  const nx = nextUnlocks(id, 8);
  UI.modal(`<h3><span class="mi-ic">${typeof skillIcon==='function'?skillIcon(sk,18):(sk.icon||'')}</span> ${esc(sk.name)}
      <span class="tier">${TUNING.TIER_NAMES[tierOfLevel(lv)] || ''}</span></h3>
    <div class="meta">Lv ${lv}${lv < TUNING.MAX_LEVEL ? ` · 距下一级 ${fmt(need)} 经验` : ' · 已至本卷上限'}</div>
    ${sk.desc?`<div class="reveal"><b>所能</b>${esc(sk.desc)}</div>`:''}
    ${nf?`<div class="reveal"><b>产出地</b><button class="btn-mini skill-go"
      onclick="UI.selRegion='${nf.regionId}';UI.selNode='${nf.nodeId}';UI.closeModal();UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${esc((nodeOf(nf.nodeId)||{}).name||'')}${(typeof skillSourceNodes==='function')&&skillSourceNodes(id).length>1?` 等 ${skillSourceNodes(id).length} 山`:''}</button></div>`:''}
    ${mns.length?`<div class="reveal"><b>材料来源</b><span class="use-box">${mns.slice(0,5).map(m=>`<button class="btn-mini skill-go ${m.ok?'':'lock'}"
      title="${esc(m.itemName)}·${esc(m.nodeName||'')}${m.ok?'':'（尚未开通）'}"
      onclick="UI.selRegion='${m.regionId}';UI.selNode='${m.nodeId}';UI.closeModal();UI.switchTab('yudi')">${esc(m.itemName)}·${esc(m.nodeName||'')}</button>`).join('')}</span></div>`:''}
    ${mst.length?`<div class="reveal"><b>材料存余</b><span class="mat-inv">${mst.map(m=>`<span class="${m.ok?'ok':'gap'}">${esc(m.name)} ${m.have}/${m.need}</span>`).join(' · ')}</span></div>`:''}
    ${nx.length?`<div class="reveal"><b>将至</b>${esc(nextUnlockText(nx))}</div>`:''}
    ${(function(){
      // 技能详情原先只有「看」没有「做」：看完产出地还得关掉弹窗、去舆地页找那座山、
      // 再点采集按钮。这里直接给出口——采集类落「采某物」，制作类落「制某件」。
      const acts = [];
      if (nf){
        const node = nodeOf(nf.nodeId);
        const list = node ? Object.values(Items).filter(it => it.skill === id
          && ((it.nodes || [it.node]).includes(node.id))
          && (typeof gatherGate === 'function') && gatherGate(it).usable) : [];
        list.slice(0, 3).forEach(it => {
          acts.push(`<button class="btn primary" onclick="UI.closeModal();startActivity('gather','${it.id}')">采 ${esc(it.name)}</button>`);
        });
        if (!list.length) acts.push(`<button class="btn" onclick="UI.selRegion='${nf.regionId}';UI.selNode='${nf.nodeId}';UI.closeModal();UI.switchTab('yudi')">前往此地</button>`);
      } else if (typeof mapRecipeSkill === 'function'){
        const r = Recipes.filter(x => mapRecipeSkill(x.type) === id && lv >= x.lvl && canAfford(x.cost))
          .sort((a, b) => b.lvl - a.lvl)[0];
        if (r){
          const it = Items[r.out];
          acts.push(`<button class="btn primary" onclick="UI.closeModal();startActivity('craft','${r.type}::${r.out}',{times:1})">制「${esc(it ? it.name : r.out)}」</button>`);
        }
      }
      // ⚠️ 必须与「闭」同在一组 .modal-btns：UI._splitModal 只把**第一个**按钮组提到页脚，
      // 分成两组的后果是「闭」留在正文、「采」被提到页脚，顺序与主次都反了。
      acts.push(`<button class="btn" onclick="UI.closeModal()">闭</button>`);
      return `<div class="modal-btns">${acts.join('')}</div>`;
    })()}`);
}
window.showSkillDetail = showSkillDetail;

// 配方详情：点一下先看「做什么、要什么、够做几次」，再决定做几次。
// 原先点一下直接做 1 次，手机上连材料缺口都看不到（浮层要 hover）。
function showRecipeDetail(key){
  const parts = String(key).split('::');
  const r = Recipes.find(x => x.type === parts[0] && x.out === parts[1]);
  if (!r) return;
  const it = Items[r.out] || { name:r.out, icon:'📦' };
  const skId = mapRecipeSkill(r.type);
  const sk = Skills[skId] || { name:'' };
  const lvOk = levelOf(skId) >= r.lvl;
  let maxN = Infinity;
  for (const [iid, q] of (r.cost || [])){
    maxN = Math.min(maxN, Math.floor((Game.inventory[iid] || 0) / Math.max(1, q)));
  }
  if (!isFinite(maxN)) maxN = 0;
  const capN = Math.min(99, Math.max(0, maxN));
  const per = r.qty || 1;
  const rows = (r.cost || []).map(([iid, q]) => {
    const have = totalOf(iid);
    const ok = have >= q;
    return `<span class="${ok?'ok':'gap'}">${typeof itemIc==='function'?itemIc(iid,13):''}${esc((Items[iid]||{}).name||iid)} ${have}/${q}</span>`;
  }).join(' · ');
  // 特产缺料提示：只说「缺 1 件」没用——玩家不知道这东西要在哪一系、走到什么程度才有。
  // 把「所属山系 + 巡礼进度 + 怎么再来」一并写出来，配方与巡礼才真正连上。
  const spHints = (r.cost || []).map(([iid, q]) => {
    if (totalOf(iid) >= q) return '';
    if (typeof pilgrimGiftIndex !== 'function') return '';
    const reg = pilgrimGiftIndex().get(iid);
    if (!reg) return '';
    const p = (typeof regionPilgrim === 'function') ? regionPilgrim(reg.regionId) : null;
    const nm = (Items[iid] || {}).name || iid;
    if (!p || !p.total) return '';
    if (p.full){
      return `<div class="hint sp-hint">${esc(nm)}：<b>${esc(reg.regionName)}</b>已走遍 · 在该系采集有 1% 机会带出</div>`;
    }
    return `<div class="hint sp-hint">${esc(nm)}：需走遍 <b>${esc(reg.regionName)}</b>（今 ${p.done}/${p.total} 山，还差 ${p.total - p.done}）· 走遍后领赏得 2 件，此后采集可得</div>`;
  }).filter(Boolean).join('');
  UI.modal(`<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(r.out,18):(it.icon||'📦')}</span> ${esc(it.name)}
      ${it.equip?gradeBadge(it):`<span class="tier">${rarityName(it)}</span>`}</h3>
    <div class="meta">每次出 ${per} 件 · ${esc(sk.name)} ${r.lvl} 级 · 经验 ${r.xp || 0}</div>
    <div class="reveal"><b>材料</b><div class="mat-wrap"><span class="mat-inv">${rows}</span>${spHints}</div></div>
    ${it.note?`<div class="reveal"><b>出处</b>${esc(it.note)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
    <div class="reveal trade-block">
      <b>制作</b>
      <div class="qty-line">
        <button class="btn tiny" type="button" title="减一次" onclick="qtyStep('craftQty',-1)" ${capN?'':'disabled'}>−</button>
        <input id="craftQty" class="qty-input" type="number" inputmode="numeric" min="1" max="${Math.max(1,capN)}" value="1"
          oninput="syncCraft(${capN},${per})" ${capN?'':'disabled'}>
        <button class="btn tiny" type="button" title="加一次" onclick="qtyStep('craftQty',1)" ${capN?'':'disabled'}>＋</button>
        <button class="btn tiny" type="button" onclick="qtySet('craftQty',${Math.max(1,capN)})" ${capN?'':'disabled'}>至多</button>
      </div>
      <div class="hint">共得 <b class="qty-gain" id="craftGain">${per} 件</b> · ${lvOk ? `材料可做 ${maxN} 次` : `需${esc(sk.name)} ${r.lvl} 级（现 ${levelOf(skId)}）`}</div>
    </div>
    <div class="modal-btns">
      <button class="btn primary" id="craftGo" onclick="craftN('${key}')" ${capN?'':'disabled'}>做 1 次</button>
      ${capN?`<button class="btn" onclick="craftAll('${key}')">连作至料尽</button>`:''}
      <button class="btn" onclick="UI.closeModal()">闭</button>
    </div>`);
}
function syncCraft(capN, per){
  const el = $('craftQty'), g = $('craftGain'), go = $('craftGo');
  if (!el || !g) return;
  const n = Math.max(1, Math.min(Math.max(1, capN), parseInt(el.value, 10) || 1));
  g.textContent = `得 ${n * per} 件`;
  if (go) go.textContent = `做 ${n} 次（${n * per} 件）`;
}
function craftN(key){
  const el = $('craftQty');
  const n = Math.max(1, parseInt(el && el.value, 10) || 1);
  UI.closeModal();
  startActivity('craft', key, { times: n });
}
function craftAll(key){
  UI.closeModal();
  startActivity('craft', key);
}
window.showRecipeDetail = showRecipeDetail; window.syncCraft = syncCraft;
window.craftN = craftN; window.craftAll = craftAll;

// 就地重绘：保持滚动位置，免得强化一下就被弹回顶部
UI.refreshItemModal = function(itemId){
  // 淬炼成功后那一件换档了（+0 堆里的一件 → +1 堆）：详情要跟着跳到新档，
  // 否则会停在一个已经空了的档上，看着像「强化把装备弄没了」。
  const t = UI._enhTarget;
  if (t && typeof t === 'object' && (t.id === itemId) && UI._detailEnh != null) UI._detailEnh = (t.enh | 0);
  const box = $('modalBox');
  const body = box && box.querySelector('.modal-body');
  const y = body ? body.scrollTop : (box ? box.scrollTop : 0);
  UI.modal(UI.itemDetailHtml(itemId));
  const box2 = $('modalBox');
  const body2 = box2 && box2.querySelector('.modal-body');
  if (body2) body2.scrollTop = y;
  else if (box2) box2.scrollTop = y;
};

