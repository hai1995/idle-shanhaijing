// ===== 通用渲染片段（从 core.js 拆出，v1.31.140）=====
// 等级条 / 战力拆解弹窗 / 下一步提示 / 顶栏状态行 等跨页复用的渲染片段。
// 纯全局函数与 UI 方法，无闭包依赖；加载顺序排在 core.js 之后（见 index.html）。
// 拆文件纪律：逐字搬运、搬完 dump-diff 对照、判据跟着搬家、搬了必须删。

// ---------- 通用渲染片段 ----------
// 提示条标记：按提示类型取意象，原先各用不同 emoji，此处统一到标记族
const HINT_MARKS = { yudi:'compass', yushi:'lamp', queue:'bolt' };
function hintMark(h){
  if (!h) return 'lamp';
  return HINT_MARKS[h.tab] || 'lamp';
}
// 页面 → 主技能：每页顶部固定一条「等级 · 当前经验 / 升级所需」，
// 免得玩家在祠祀、营造、墟市里不知道自己在什么火候。
const PAGE_SKILL = {
  yudi:    ['yudi',    '舆地'],
  taofa:   ['taofa',   '讨伐'],
  yushi:   ['yushi',   '御使'],
  codex:   ['zhulu',   '著录'],
  jisi:    ['jisi',    '祭祀'],
  shichan: ['shanglv', '商旅'],
  ying:    ['yingyi',  '营邑'],
};
// 行装页顶栏：不显示技能等级（此处等级意义不大），改为当前一套战斗数值
// 一行数值背后的来源：基础 / 技能 / 装备 / 淬炼 / 词条 / 成就 / 御使 / 药。
// 「点开能看懂自己为什么是这个数」比数值本身更能促成养成决策。
function combatStatBreakdown(key){
  const af = (typeof affixTotals === 'function') ? affixTotals() : affixZero();
  const db = (typeof deployedBonuses === 'function') ? deployedBonuses() : { hp:0, def:0, dmg:0, heal:0, build:0 };
  const style = combatMode();
  const styleName = { attack:'近战', ranged:'射术', zhu:'祝术' }[style] || '近战';
  const statLv = style === 'ranged' ? levelOf('she') : style === 'zhu' ? levelOf('zhu') : levelOf('bing');
  const ming = levelOf('ming');
  const w = Game.gear.weapon, a = Game.gear.armor, q = Game.gear.quiver, ch = Game.gear.charm;
  const beast = Game.combat ? Monsters[Game.combat.monsterId] : null;

  if (key === 'hp'){
    const rows = [
      { label:'根柢', value:'20', note:'凡人本元' },
      { label:`明 · ${ming} 级`, value:'+' + (ming * 4), note:'每级 +4' },
    ];
    if (db.hp > 0) rows.push({ label:'御使 · 体魄', value:`×${(1 + db.hp).toFixed(2)}`, note:`+${Math.round(db.hp * 100)}%（鯥 / 犀 / 象 / 驭兽）` });
    return { title:'气血 · 构成', total: fmt(playerMaxHp()), rows,
      foot:'气血只决定能站多久，不增一分输出——但恶战里先倒下的那方什么都拿不到。' };
  }

  if (key === 'atk'){
    const wBase = w ? enhanceScaled(w.dmg || 0, enhanceLevel(w)) : 0;
    const qDmg = (style === 'ranged' && q) ? (q.dmg || 0) : 0;
    const skillDmg = statLv * 1.2;
    const rows = [];
    rows.push({ label: w ? `兵器 · ${w.name}` : '徒手',
      value: w ? fmt(Math.round(wBase)) : '0',
      note: w ? (enhanceLevel(w) ? `含淬炼 +${enhanceLevel(w)}（${w.dmg} 基础）` : `未淬炼（${w.dmg} 基础）`) : '无兵器' });
    if (qDmg) rows.push({ label:`副手 · ${q.name}`, value:'+' + Math.round(qDmg), note:'射术另计' });
    rows.push({ label:`${styleName} · ${statLv} 级`, value:'+' + skillDmg.toFixed(0), note:'每级 +1.2' });
    const tacA = currentTactic();
    if (tacA.dmg !== 1) rows.push({ label:`战法 · ${tacA.name}`, value:`×${tacA.dmg.toFixed(2)}`, note:tacA.desc });
    if (af.dmgPct) rows.push({ label:'词条 · 锋', value:`+${af.dmgPct}%`, note:'伤害乘区' });
    const mm = dmgMult();
    if (Math.abs(mm - 1) > 0.001) rows.push({ label:'成就 · 御使 · 药', value:`×${mm.toFixed(2)}`, note:'合计伤害增幅' });
    if (beast){
      const fEl = (typeof foeElement === 'function') ? foeElement(beast, Game.combat) : beast.el;
      const m = wuxingMult(playerElement(), fEl);
      if (Math.abs(m - 1) > 0.001){
        const boost = af.elBoost ? `（含「引」+${af.elBoost}%）` : '';
        const verb = m > 1 ? '克' : '见克于';
        rows.push({ label:`五行 · ${playerElement()} ${verb} ${fEl}`, value:`×${(1 + (m - 1) * (1 + af.elBoost / 100)).toFixed(2)}`, note:m > 1 ? '克制' + boost : '被克' + boost });
      }
      if (style === 'zhu' && wuxingSheng(playerElement(), fEl)) rows.push({ label:'祝术 · 相生', value:`×${TUNING.WUXING.SHENG}`, note:'相生目标额外加成' });
    }
    const r = playerDamageRange();
    return { title:'攻击 · 构成', total:`${r.lo}–${r.hi}`, rows,
      foot:'区间为「均值 ×0.6 ~ ×1.4」的浮动。暴击、连击加成在战斗中另计，不体现在此处。' };
  }

  if (key === 'def'){
    const aBase = a ? enhanceScaled(a.def || 0, enhanceLevel(a)) : 0;
    const rows = [];
    rows.push({ label: a ? `甲胄 · ${a.name}` : '无甲', value: a ? Math.round(aBase).toString() : '0',
      note: a ? (enhanceLevel(a) ? `含淬炼 +${enhanceLevel(a)}` : `未淬炼（${a.def} 基础）`) : '赤身应战' });
    rows.push({ label:`明 · ${ming} 级`, value:'+' + (ming * 0.2).toFixed(1), note:'每级 +0.2' });
    const buffDef = (Game.buff && Game.buff.def && (Game.buff.def.def || 0)) || 0;
    const gearDef = db.def + ((ch && ch.defBonus) || 0) + buffDef;
    if (gearDef) rows.push({ label:'御使 · 玉符 · 药', value:'+' + gearDef.toFixed(1), note:'定值防御' });
    if (af.def) rows.push({ label:'词条 · 固', value:'+' + af.def, note:'定值防御' });
    const tacD = currentTactic();
    if (tacD.def !== 1) rows.push({ label:`战法 · ${tacD.name}`, value:`防御 ×${tacD.def.toFixed(2)}`, note:tacD.desc });
    if (af.dmgTaken) rows.push({ label:'词条 · 韧', value:`减伤 ${af.dmgTaken}%`, note:'受击时按比例削减' });
    if (af.thorns) rows.push({ label:'词条 · 棘', value:`反伤 ${af.thorns}%`, note:'把承受伤害的一部分还给对手' });
    return { title:'防御 · 构成', total: fmt(Math.round(totalDefence() * 10) / 10), rows,
      foot:'防御按「减攻 ×0.3」折入伤害计算；「减伤」「反伤」是独立乘区，与防御叠加。' };
  }

  if (key === 'eva'){
    const rows = [
      { label:'甲胄在身', value: a ? '4%' : '0%', note: a ? '着甲即得' : '无甲则无' },
      { label:`兵 · ${levelOf('bing')} 级`, value:'+' + (levelOf('bing') * 0.15).toFixed(1) + '%', note:'每级 +0.15%' },
      { label:`明 · ${ming} 级`, value:'+' + (ming * 0.1).toFixed(1) + '%', note:'每级 +0.1%' },
    ];
    return { title:'闪避 · 构成', total: Math.round(playerEvasion() * 100) + '%', rows,
      foot:`上限 50%。怪物另有一次固定 5% 的落空，与此处叠加。` };
  }

  if (key === 'el'){
    const src = style === 'zhu'
      ? `祝术主五行（可在竞技场切换）`
      : (w && w.el ? `兵器「${w.name}」所禀` : (style === 'ranged' && q && q.el ? `箭矢所禀` : '默认金属'));
    const rows = [
      { label:'流派', value: styleName, note: '决定用哪一路本事' },
      { label:'属性来源', value: playerElement(), note: src },
    ];
    const els = TUNING.ELEMENTS;
    const rel = els.filter(e => e !== playerElement()).map(e => {
      const m = wuxingMult(playerElement(), e);
      return `${playerElement()}→${e} ×${m.toFixed(2)}`;
    }).join('　');
    return { title:'五行 · 构成', total: playerElement(), rows,
      foot:'克制 ×' + TUNING.WUXING.KE + ' · 被克 ×' + TUNING.WUXING.BEIKE + ' · 同属 ×1.00。' + rel };
  }

  if (key === 'dps'){
    const r = playerDamageRange();
    const avg = (r.lo + r.hi) / 2;
    const iv = playerAttackInterval();
    const baseIv = (style === 'ranged' ? 2.4 : style === 'zhu' ? 3.2 : 2.8) - statLv * 0.008;
    const rows = [
      { label:'攻击均值', value: ((r.lo + r.hi) / 2).toFixed(1), note:`区间 ${r.lo}–${r.hi}` },
      { label:'基础间隔', value: baseIv.toFixed(2) + 's', note: styleName + '基础 − 等级×0.008' },
    ];
    if (af.atkSpeed) rows.push({ label:'词条 · 疾', value:`÷${(1 + af.atkSpeed / 100).toFixed(2)}`, note:`攻势 +${af.atkSpeed}%` });
    const tacI = currentTactic();
    if (tacI.spd !== 1) rows.push({ label:`战法 · ${tacI.name}`, value:`÷${tacI.spd.toFixed(2)}`, note:tacI.desc });
    rows.push({ label:'实际间隔', value: iv.toFixed(2) + 's', note:'不低于 1.2s' });
    return { title:'DPS · 构成', total: (avg / Math.max(0.5, iv)).toFixed(1), rows,
      foot:'DPS 只算普攻期望，不含暴击、连击与绝技——实战输出会高于此值。' };
  }
  return null;
}

UI.openStatModal = function(key){
  const b = combatStatBreakdown(key);
  if (!b) return;
  const afs = [];
  for (const slot of ['weapon','armor','charm','quiver']){
    const g = Game.gear[slot];
    if (!g || !g.id) continue;
    const list = (typeof affixOf === 'function') ? affixOf(g.id) : [];
    if (!list.length) continue;
    afs.push(`<div class="sb-af"><button class="sb-af-nm" onclick="UI.closeModal();showItemDetail('${g.id}')">${esc(g.name)}</button>
      <span>${list.map(x => `<i>${esc(x.name)}</i> ${esc(x.text)}`).join('　')}</span></div>`);
  }
  UI.modal(`<h3>${esc(b.title)}</h3>
    <div class="sb-total">${b.total}</div>
    <div class="sb-rows">
      ${b.rows.map(r => `<div class="sb-row"><span>${r.label}</span><b>${r.value}</b>${r.note ? `<em>${esc(r.note)}</em>` : ''}</div>`).join('')}
    </div>
    ${afs.length ? `<div class="sb-afs"><div class="sb-afs-lb">一词一性（点装备名可查看 / 重铸）</div>${afs.join('')}</div>` : ''}
    ${b.foot ? `<div class="hm-line">${esc(b.foot)}</div>` : ''}
    <div class="modal-btns"><button class="btn" onclick="UI.closeModal()">闭</button></div>`);
};

function combatStatBarHtml(){
  const hp = playerMaxHp();
  const r = playerDamageRange();
  const d = totalDefence();
  const defStr = (Math.round(d * 10) % 10 === 0) ? String(Math.round(d)) : d.toFixed(1);
  const dps = playerDpsEstimate();
  const eva = Math.round(playerEvasion() * 100);
  const style = (typeof combatMode === 'function') ? combatMode() : 'attack';
  const styleName = { attack:'近战', ranged:'射术', zhu:'祝术' }[style] || '近战';
  const el = (typeof playerElement === 'function') ? playerElement() : '—';
  const cell = (k, label, val) =>
    `<button type="button" class="cs-item" onclick="UI.openStatModal('${k}')" title="查看${label}构成"><i>${label}</i><b>${val}</b></button>`;
  return `<div class="page-lvbar combat-bar" data-plv="pack">
    <span class="pl-name" role="button" tabindex="0" onclick="UI.switchTab('taofa')" title="前往竞技场切换流派">${styleName}</span>
    ${cell('hp','气血', fmt(hp))}
    ${cell('atk','攻击', `${r.lo}–${r.hi}`)}
    ${cell('def','防御', defStr)}
    ${cell('eva','闪避', eva + '%')}
    ${cell('el','五行', esc(el))}
    ${cell('dps','DPS', dps.toFixed(1))}
  </div>`;
}

function pageLevelBar(tab){
  if (tab === 'pack') return combatStatBarHtml();
  if (tab === 'skills'){
    // 技能页：按当前筛选显示那一门；「全部」时给 26 技总览（合计等级 / 满级线）
    const f = UI.skillFilter;
    if (f && f !== 'all' && Game.skills[f]){
      const name = (Skills[f] && Skills[f].name) || f;
      return skillLevelBarHtml(f, name);
    }
    const sum = totalSkillLevel(), max = Object.keys(Game.skills).length * TUNING.MAX_LEVEL;
    const pct = max ? Math.min(100, sum / max * 100) : 0;
    return `<div class="page-lvbar" data-plv="all">
      <span class="pl-name">技能总览</span>
      <b class="pl-lv">${sum} 级</b>
      <span class="pl-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
      <span class="pl-xp">二十七技合计 · 满级 ${max} · 修为 ${fmt(Game.stats.totalXp || 0)}</span>
    </div>`;
  }
  const pair = PAGE_SKILL[tab];
  if (!pair) return '';
  return skillLevelBarHtml(pair[0], pair[1]);
}
// 行动链：关键页尾部给「下一步」的明确出口——采集→制作→祠祀→征伐 本是一条闭环，
// 玩家不该自己猜「材料齐了该干什么」。只给 1–2 个当下确实可做、且能一键完成的事。
function nextStepHtml(tab){
  const out = [];
  if (tab === 'skills'){
    const empty = [];
    const _plots = (typeof farmPlots === 'function') ? farmPlots() : (TUNING.FARM_PLOTS || 6);
    for (let i = 0; i < _plots; i++) if (!Game.farms['p'+i]) empty.push(i);
    if (empty.length){
      const lv = levelOf('puyi');
      const hasSeed = Object.values(Items).some(s=>s.crop && (s.lvl||1)<=lv && (Game.inventory[s.id]||0)>0);
      if (hasSeed) out.push({ label:`一键种满 ${empty.length} 块空田`, act:'UI.plantAll()' });
    }
    // 材料已齐的配方里挑**最高级**那件：原先取 Recipes 数组里第一个能做的，
    // 常常是最底层的燧石刀——「下一步」若建议玩家去做早就看不上的东西，比不给更差。
    const r = Recipes.filter(x=>canAfford(x.cost) && levelOf(mapRecipeSkill(x.type)) >= x.lvl)
      .sort((a,b)=>b.lvl-a.lvl)[0];
    if (r){ const it = Items[r.out]; out.push({ label:`材料已齐 · 制「${it?it.name:r.out}」`, act:`startActivity('craft','${r.type}::${r.out}',{times:1})` }); }
    if (!out.length) out.push({ label:'去征伐攒著录', tab:'taofa' });
  }
  if (tab === 'taofa'){
    const best = Object.values(Monsters)
      .filter(m=>!m.boss && m.nodeId && nodeUnlocked(nodeOf(m.nodeId)) && levelOf('taofa') >= (m.needLvl||1))
      .sort((a,b)=>(b.xp||0)-(a.xp||0))[0];
    if (best) out.push({ label:`宜讨「${best.name}」`, act:`UI.openHuntModal('${best.id}')` });
  }
  if (tab === 'jisi'){
    const rite = Object.entries(RITES).find(([id])=>{
      const rec = Recipes.find(x=>x.out===id);
      return rec && canAfford(rec.cost) && levelOf('jisi') >= rec.lvl;
    });
    if (rite) out.push({ label:`行祭「${(Items[rite[0]]||{}).name||'祠礼'}」（此域采获 +30% 一时）`, act:`UI.tryRite('${rite[0]}')` });
    const xiong = Game.omens.some(o=>OMENS[o.id] && OMENS[o.id].polarity === '凶');
    if (xiong) out.push({ label:'禳解当前凶兆', tab:'jisi' });
  }
  if (tab === 'pack'){
    const p = (typeof bulkSellPreview === 'function') ? bulkSellPreview(UI.packSellTier || 'COMMON') : null;
    if (p && p.count > 0) out.push({ label:`清整售出 ${p.count} 件（约 ${fmt(p.total)} 贝）`, act:'bulkSellRun()' });
    // 「有更强的在包里」才建议换装。原判定只查「行囊里有等级够的装备」，
    // 于是包里全是打不过身上的旧货时也催玩家点「一键最优装」，点了什么都不会变。
    const better = (function(){
      if (typeof gearPower !== 'function' || typeof equipSlotOf !== 'function') return false;
      for (const g of (Game.packGear || [])){
        const it = Items[g.id];
        if (!it || !it.equip) continue;
        if ((it.lvl||1) > relevantLevel(it)) continue;
        if (typeof reqRecordOk === 'function' && !reqRecordOk(it)) continue;
        const slot = equipSlotOf(it);
        if (!slot) continue;
        const inst = Object.assign({}, it, { enh: (g.enh | 0) });
        const cur = Game.gear[slot];
        if (!cur || gearPower(inst) > gearPower(cur)) return true;
      }
      return false;
    })();
    if (better) out.push({ label:'一键最优装', act:'UI.autoEquipBest()' });
  }
  if (tab === 'yushi'){
    if (!out.length) out.push({ label:'去征伐攒著录（至通形可御使）', tab:'taofa' });
  }
  if (tab === 'ying'){
    const b = Object.values(BUILDINGS).find(x=>!Game.buildings[x.id] && levelOf('yingyi') >= x.lvl && canAfford(x.cost));
    if (b) out.push({ label:`营造「${b.name}」`, act:`buildStructure('${b.id}');UI.renderYing()` });
    else if (!out.length) out.push({ label:'去采集营造材料（怪木 / 沙石）', tab:'skills' });
  }
  if (!out.length) return '';
  return `<div class="next-step-bar"><span class="ns-lb">下一步</span>${
    out.slice(0,2).map(o=>`<button class="btn small" onclick="${o.act || `UI.switchTab('${o.tab}')`}">${esc(o.label)}</button>`).join('')
  }</div>`;
}

// 某门技艺「接下来会解锁什么」：未来数级内新可采的物产、新可做的配方。
// 练级时最想知道的其实是这个——否则升级只是数字变大，玩家不知道在等什么。
function nextUnlocks(skillId, within){
  const cur = levelOf(skillId);
  const lim = Math.min(TUNING.MAX_LEVEL, cur + (within || 6));
  const out = [];
  for (const it of Object.values(Items)){
    if (it.skill !== skillId) continue;
    const l = it.lvl || 1;
    if (l <= cur || l > lim) continue;
    out.push({ lvl:l, name:it.name, kind:'采' });
  }
  for (const r of Recipes){
    if (typeof mapRecipeSkill === 'function' && mapRecipeSkill(r.type) !== skillId) continue;
    const l = r.lvl || 1;
    if (l <= cur || l > lim) continue;
    out.push({ lvl:l, name:(Items[r.out]||{}).name || r.out, kind:'制' });
  }
  out.sort((a, b) => a.lvl - b.lvl);
  return out;
}
// 压成一行：「Lv13 梓、荆、杞　Lv15 青雘」——同级的并在一起
function nextUnlockText(list){
  const by = {};
  list.forEach(u => { (by[u.lvl] = by[u.lvl] || []).push(u.name); });
  return Object.entries(by).map(([lv, names]) => `Lv${lv} ${names.join('、')}`).join('　');
}

function skillLevelBarHtml(id, name){
  const sk = Game.skills[id] || { level:1, xp:0 };
  const lv = sk.level || 1;
  const cur = xpForLevel(lv), next = xpForLevel(lv + 1);
  const need = Math.max(1, next - cur);
  const got = Math.max(0, (sk.xp || 0) - cur);
  const maxed = lv >= TUNING.MAX_LEVEL;
  const pct = maxed ? 100 : Math.min(100, got / need * 100);
  return `<div class="page-lvbar" data-plv="${id}">
    <span class="pl-name">${esc(name)}</span>
    <span class="tier">${TUNING.TIER_NAMES[tierOfLevel(lv)] || ''}</span>
    <b class="pl-lv">Lv ${lv}</b>
    <span class="pl-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
    <span class="pl-xp">${maxed ? '九九圆满 · 余力化入修为' : `经验 ${fmt(got)} / ${fmt(need)}`}</span>
  </div>`;
}

// 顶栏状态条那一行字：闲 / 在采什么 / 在打谁 + 还剩几次。
// 单独成函数是因为它有两个写入者——整页刷新（refreshActivity）与
// 限量采集每采一下的就地改写（patchActivityCount），两处口径必须一致。
function activityLabelText(){
  const a = Game.activity;
  if (!a) return Game.combat ? `往讨：${(Monsters[Game.combat.monsterId]||{}).name||''}` : '空闲';
  let label = currentActivityLabel();
  const node = currentActivityNodeLabel();
  if (node) label += `（${node}）`;
  // 限量采集 / 限量制作：把「还剩几下」摆在顶栏——不必回舆地页再点一次才知道
  if (a.remain != null && a.remain > 0) label += ` · 余 ${a.remain} ${a.kind === 'gather' ? '次' : '件'}`;
  if (a.src === 'fallback') label += '（兜底）';   // 闲置兜底自动接上的行动，标出来
  return label;
}

// 当前（限量）行动「几点做完」：余 N 次 × 当前实际间隔（含工具 / 增益加成）。
// 与队列的 queueFinishClock 同一口径——HH:MM，一眼能拿来安排事（v1.31.165）。
function activityFinishClock(){
  const a = Game.activity;
  if (!a || !(a.remain > 0)) return '';
  const iv = (typeof currentActionInterval === 'function') ? currentActionInterval() : 0;
  if (!(iv > 0)) return '';
  const d = new Date(Date.now() + a.remain * iv * 1000);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
UI.patchActivityCount = function(){
  const t = $('activityText');
  if (!t) return;
  const txt = activityLabelText();
  if (t.textContent !== txt) t.textContent = txt;
};
