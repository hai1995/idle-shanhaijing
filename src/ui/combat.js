// ===== ui/combat.js — 征伐（异兽列表 / 竞技场 / 战斗估值）与御使（入槽 / 卸下） =====
// 由 src/ui.js 拆分而来（v1.31.8）。加载顺序见 index.html：core 必须最先（UI 对象在这里定义），
// 其余按页顺序；跨文件调用的函数与常量都在全局词法环境里，运行时才求值，先后不影响调用。

// ================= 征伐 =================
// 征伐页拆两块：竞技场（随战斗状态变）与目标列表（只随著录 / 等级变）。
// 战斗开始、结束、切风格只重绘竞技场 + 补一张卡，不重建 194 张卡片——
// 全量重建会让整页重排、滚动抖动、hover 状态丢失，连战时观感就是「卡」。
// 势条：攒满 100 自动放绝技。连击数是「不被打断」的可视凭据，
// 势满时整条转金，让玩家知道下一击会变成什么。
function momentumRowHtml(c){
  const mo = Math.max(0, Math.min(100, c.momentum || 0));
  const style = (typeof combatMode === 'function') ? combatMode() : 'attack';
  const ult = (window.ULTIMATE_NAMES || {})[style] || '绝技';
  const full = mo >= 100;
  return `<div class="momentum-row ${full?'full':''}" title="命中积势，受击折势；满 100 自动施放「${ult}」">
    <span class="mo-lb">势</span>
    <div class="mo-bar"><i style="width:${mo}%"></i></div>
    <span class="mo-val">${Math.floor(mo)}</span>
    ${c.combo>1?`<span class="mo-combo">${c.combo} 连</span>`:''}
    <span class="mo-ult">${full?'▶ ':''}绝技 · ${esc(ult)}</span>
  </div>`;
}

function taofaArenaHtml(){
  const c = Game.combat;
  const m = c ? foeOf(Monsters[c.monsterId]) : null;
  const style = combatMode();
  const dps = playerDpsEstimate();

  return `<div class="panel arena" id="arenaBox">
    <div class="style-row">
      ${['auto','attack','ranged','zhu'].map(s=>
        `<button class="chip-btn ${Prefs.stylePref===s?'on':''}" onclick="setCombatStyle('${s}')">${styleLabel(s)}</button>`).join('')}
    </div>
    <div class="style-row tactic-row">
      <span class="tr-lb" title="战法决定「怎么打」：四项乘区各自独立，与五行、词条、绝技叠加">战法</span>
      ${Object.values(TACTICS).map(t=>
        `<button class="chip-btn ${(Prefs.tactic||'none')===t.id?'on':''}" onclick="setTactic('${t.id}')" title="${esc(t.desc)}">${t.name}</button>`).join('')}
      <span class="hint">${esc(currentTactic().desc)}</span>
    </div>
    ${style==='zhu'||Prefs.stylePref==='zhu'?`<div class="zhu-row">祝术主五行：
      ${TUNING.ELEMENTS.map(e=>`<button class="chip-btn ${Prefs.zhuEl===e?'on':''}" onclick="setZhuEl('${e}')">${e}</button>`).join('')}
      <span class="hint">相生目标额外 ×1.15</span></div>`:''}
    <div class="fighter-row">
      <div class="fighter" id="playerFighter">
        <div class="f-name">著录者</div>
        <div class="f-hp"><div class="fill" style="width:${c?Math.max(0,Game.combat.playerHp/playerMaxHp()*100):100}%"></div></div>
        <div class="f-sub">${styleLabel(style)} · ${playerElement()}属 · DPS≈${dps.toFixed(1)}</div>
        <div class="f-attr">
          <span>气血 <b>${playerMaxHp()}</b></span>
          <span>防御 <b>${totalDefence().toFixed(1)}</b></span>
          <span>伤害 <b>${playerDamageRange().lo}-${playerDamageRange().hi}</b></span>
          <span>兵器 <b>${Game.gear.weapon?esc(Game.gear.weapon.name):'无'}</b></span>
          <span>甲胄 <b>${Game.gear.armor?esc(Game.gear.armor.name):'无'}</b></span>
        </div>
      </div>
      <div class="vs">对</div>
      <div class="fighter enemy" id="monsterFighter">
        ${m?`<div class="f-portrait">${(typeof beastIcon==='function')?beastIcon(m):''}</div>
        <div class="f-name">${esc(m.name)} ${elBadge((typeof foeElement === 'function') ? foeElement(m, c) : m.el)}${m.special?`<span class="m-spec" title="${esc(m.special.name)}${m.desc?`：${esc(m.desc)}`:''}">${esc(m.special.name)}</span>`:''}</div>
        <div class="f-hp"><div class="fill enemy" style="width:${Math.max(0,c.monsterHp/m.hp*100)}%"></div></div>
        <div class="f-sub">${fmt(Math.max(0,c.monsterHp))} / ${fmt(m.hp)}</div>`:`<div class="f-name">待机</div>
        <div class="f-hp"><div class="fill enemy" style="width:0%"></div></div>
        <div class="f-empty">点下方「讨伐目标」中的任一方块即可开战</div>`}
      </div>
    </div>
    ${c?momentumRowHtml(c):''}
    ${c&&m?wuxingAdvice((typeof foeElement === 'function') ? foeElement(m, c) : m.el, playerElement()):''}
    ${c&&m?combatEstimateHtml(m, c):''}
    ${c?`<div class="combat-stats" id="combatStats">回合 ${c.round||0} · 造成 ${c.dmgOut||0} · 承伤 ${c.dmgIn||0}${Game.stats.winStreak>1?` · 连胜 ${Game.stats.winStreak}`:''}${c.ults?` · 绝技 <b>${c.ults}</b> 次`:''}${c.repeat!=null?` · 本轮余 <b>${c.repeat}</b> 场`:''}</div>`:''}
    ${(!c && Prefs.lastHuntId && Monsters[Prefs.lastHuntId]) ? `<div class="rematch-bar">
      <button class="btn primary" type="button" onclick="UI.rematch()">⚔️ 再战 ${esc(Monsters[Prefs.lastHuntId].name)}${Prefs.lastHuntTimes ? ` · ${Prefs.lastHuntTimes} 场` : ' · ♾'}</button>
      <span class="hint">沿用上次的场次；要改次数就在下方目标格里点那只异兽</span>
    </div>` : ''}
    <div class="prefs-row">
      <label><input type="checkbox" ${Prefs.autoRevive?'checked':''} onchange="Prefs.autoRevive=this.checked;saveGame()"> 败后自动复讨</label>
    </div>
  </div>`;
}
// 再战：战斗结束后不必「回列表 → 点卡片 → 选场次 → 开战」走四步，
// 上次打谁、打几场都记着，一键接上。目标不可达时交给 startCombat 自己说明原因。
UI.rematch = function(){
  const id = Prefs.lastHuntId;
  if (!id || !Monsters[id]){ this.toast('上次的目标已不可寻'); return false; }
  const times = Prefs.lastHuntTimes || null;
  const ok = startCombat(id, times ? { times } : undefined);
  if (ok){ this.patchCombatArena(); this.toast(`⚔️ 再战 ${Monsters[id].name}`); }
  return ok;
};

// 目标列表：316 只异兽分组平铺，只在切页或数据真变时重建
// 单张异兽卡（组内共用）：宜讨标记、连杀衰减、宜用属性都在这里算一遍
function beastCardHtml(x, pick){
    // 卷二开着时，卡片要显示「带里的那一遍」：名号、带等级、气血攻防经验全换，
    // 但 id、宜用属性、著录次数仍是原来那只——打死了也还是著录同一只。
    const xb = (typeof foeOf === 'function') ? foeOf(x) : x;
    const node = nodeOf(x.nodeId);
    const un = node ? nodeUnlocked(node) : false;
    const lvOk = levelOf('taofa') >= (x.needLvl||1);
    const th = threatOf(xb);
    const rec = Game.records[x.id]||{count:0,tier:0};
    // 宜用属性 = 克敌方的属性。⚠️ 必须走 counterOf 反查：KE_MAP[敌方] 得到的是
    // 「敌方所克之物」——木敌会给出土，而克木的是金，正好反了。
    const counterEl = x.el ? (counterOf(x.el) || '') : '';
    const dropList = (xb.loot && xb.loot.length) ? xb.loot : (xb.drop ? [[xb.drop,1,1]] : []);
    const drops = dropList.map(([iid])=> (Items[iid]||{}).name || iid).slice(0,3).join('、');
    // 连杀递减提示：本目标已连杀 n 次时，明示当前经验系数（换一只打即恢复）
    const streakN = (Game.mobStreak && Game.mobStreak[x.id]) || 0;
    const decayTag = (!x.boss && streakN > 0 && mobStreakMult(x.id) < 1)
      ? `<span class="bc-decay" title="连续讨伐 ${streakN} 次，经验递减；换一只异兽即恢复全额">经验 ×${mobStreakMult(x.id).toFixed(2)}</span>`
      : '';
    // 威胁评估（✔ 推荐 / 可讨 / ⚠ 危险）与「宜讨」（经验效率最高）合并显示：
    // 两者兼具时只留一枚「✔ 宜讨」，不在卡头并排两个标签
    const thTag = (x===pick && th.level==='recommend')
      ? `<span class="bc-pick" title="当前可讨伐中经验效率最高，且胜算充足">${typeof markIcon==='function'?markIcon('check',13):'✔'} 宜讨</span>`
      : `${x===pick?'<span class="bc-pick" title="当前可讨伐中经验效率最高">宜讨</span>':''}<span class="th ${th.level}">${th.mark&&typeof markIcon==='function'?markIcon(th.mark,13):''}${th.label}</span>`;
    // 方块：图标 + 名 + 「录 n · Lv n」，五行与宜讨做角标，威胁改边框色；
    // 气血/攻防/经验/掉落/产地/形态全进浮层——一屏能扫过整片山系
    return `<div class="tile beast-tile ${th.level}${x===pick?' pick':''}${(!un||!lvOk)?' lock':''}"
      data-bid="${x.id}" data-tip data-tip-title="${esc(xb.name)}${x.py?`（${esc(x.py)}）`:''}"
      role="button" tabindex="0" onclick="UI.openHuntModal('${x.id}')">
      ${x.el?`<span class="bt-el el-${x.el}">${x.el}</span>`:''}
      <span class="tile-ic bi-ic">${(typeof beastIcon==='function')?beastIcon(x):(CAT_EMOJI[x.category]||'🐾')}</span>
      <span class="tile-nm">${esc(xb.name)}</span>
      <span class="tile-tag"><i class="bt-rec">录 ${rec.count}</i> · Lv ${xb.bandLv || x.needLvl || 1}${counterEl?`<button class="bt-el-hint" type="button" title="一键切到${counterEl}属（${counterEl}克${x.el}，伤害 ×${TUNING.WUXING.KE}）"
        onclick="event.stopPropagation();setCombatStyle('zhu');setZhuEl('${counterEl}');UI.renderTaofa()">宜${counterEl}</button>`:''}${decayTag?`<span class="bt-decay" title="连续讨伐 ${streakN} 次，经验递减；换一只异兽即恢复全额">×${mobStreakMult(x.id).toFixed(2)}</span>`:''}</span>
      ${x===pick?'<span class="bt-pick">宜讨</span>':''}
      <span class="tip-body hidden">
        ${x.form?`<div class="bc-sub">${esc(x.form)}</div>`:''}
        ${xb.band ? `<div class="bc-sub band-line">卷二 · 难度带 Lv${xb.bandLv}（本卷 Lv${x.needLvl || 1}）：经验 ×${TUNING.CYCLE.XP}、掉落 ×${TUNING.CYCLE.LOOT}</div>` : ''}
        <div class="bc-sub">气血 ${fmt(xb.hp)} · 攻 ${fmt(xb.atk)} · 防 ${fmt(xb.def)} · 经验 ${fmt(xb.xp)}</div>
        <div class="bc-sub drop-line">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${esc(node?node.name:'')}${drops?` · 掉落 ${esc(drops)}`:''}</div>
        ${counterEl?`<div class="bc-sub">宜用 ${counterEl} 属（${counterEl}克${x.el}，伤害 ×${TUNING.WUXING.KE}）</div>`:''}
        ${decayTag?`<div class="bc-sub">连续讨伐 ${streakN} 次，经验 ×${mobStreakMult(x.id).toFixed(2)}；换一只异兽即恢复全额</div>`:''}
        <div class="bc-sub">${th.mark&&typeof markIcon==='function'?markIcon(th.mark,13):''}${th.label}${(!un||!lvOk)?' · 尚不可讨':''}</div>
      </span>
    </div>`;
}
function taofaListHtml(){
  const groups = [];
  for (const r of WORLD.regions){
    const list = Object.values(Monsters).filter(x=>!x.boss && x.regionId===r.regionId);
    if (list.length) groups.push({ title: r.regionName + ' · 异兽', list, locked: !regionUnlocked(r), regionId: r.regionId });
  }
  // 特殊目标组只有几只，直接展开（always），否则玩家看不到「六凶」还藏着一个折叠条
  groups.push({ title:'祷过之山 · 可猎', list:Object.values(Monsters).filter(x=>x.hunt), always:true });
  groups.push({ title:'六凶（后羿所诛）', list:Object.values(Monsters).filter(x=>x.boss&&SIX_BEASTS.includes(x.id)), always:true });
  groups.push({ title:'刑天', list:Object.values(Monsters).filter(x=>x.id==='xingtian'), always:true });
  groups.push({ title:'西山神祇（守关）', list:Object.values(Monsters).filter(x=>x.boss&&['luwu','xiwangmu','dijiang'].includes(x.id)), always:true });
  // 「宜讨」：当前节点已解锁、讨伐等级达标、非 BOSS 中经验最高的一只——
  // 316 只异兽平铺时，玩家（与挂机队列）最需要的答案就是「现在打哪只」
  const pick = (()=>{
    let best = null;
    for (const g of groups){
      if (g.locked) continue;
      for (const x of g.list){
        if (x.boss) continue;
        const node = nodeOf(x.nodeId);
        if (!node || !nodeUnlocked(node)) continue;
        if (levelOf('taofa') < (x.needLvl||1)) continue;
        if (!best || (x.xp||0) > (best.xp||0)) best = x;
      }
    }
    return best;
  })();
  // 316 只异兽一次铺开，DOM 近 900KB——切页、滚动、手机上的一次重绘都要卡。
  // 现在只展开「当前所在山系」与「宜讨所在组」，其余折起；点开时才渲染卡（见 loadBeastGroup）。
  const curRegion = ((typeof regionOf === 'function' && regionOf(Game.node)) || {}).regionId;
  const isOpen = g => !!(g.always || (g.regionId && g.regionId === curRegion) || (pick && g.list.indexOf(pick) >= 0));
  const foldedN = groups.filter(g => g.list.length && !isOpen(g)).length;
  const band = (typeof bandUnlocked === 'function') && bandUnlocked();
  const bandBar = band ? `<div class="band-bar${(typeof bandOn === 'function' && bandOn()) ? ' on' : ''}">
      <span class="bb-tx">卷二 · 难度带 <b>Lv${TUNING.CYCLE.BASE}–${TUNING.CYCLE.BASE + TUNING.CYCLE.TIER - 1}</b>
        <i>经验 ×${TUNING.CYCLE.XP} · 掉落 ×${TUNING.CYCLE.LOOT} · 三维随山势渐强</i></span>
      <button class="chip-btn ${(typeof bandOn === 'function' && bandOn()) ? 'on' : ''}" type="button" onclick="UI.toggleBand()">${(typeof bandOn === 'function' && bandOn()) ? '已入卷二' : '回到本卷'}</button>
    </div>` : '';
  let list = `<div class="panel beast-panel"><h3>讨伐目标</h3>
    ${bandBar}
    <div class="loot-recent">最近所获：${(Game.recentLoot||[]).map(l=>`${typeof itemIc==='function'?itemIc(l.itemId,13):((Items[l.itemId]||{}).icon||'')}${esc((Items[l.itemId]||{}).name||l.itemId)}×${l.qty}`).join('　')||'无'}</div>
    ${foldedN ? `<div class="hint">已展开当前山系之目标；另 ${foldedN} 个山系折在下方，点开可见。</div>` : ''}`;
  for (let gi = 0; gi < groups.length; gi++){
    const g = groups[gi];
    if (!g.list.length) continue;
    const open = isOpen(g);
    if (open){
      list += g.locked
        ? `<details class="fold grp" open><summary>${esc(g.title)} · ${g.list.length} 种（山系未解锁）</summary>`
        : `<h4>${g.title}</h4>`;
      const ordered = pick ? [pick, ...g.list.filter(x=>x!==pick)] : g.list;
      list += `<div class="beast-grid">${ordered.map(x=>beastCardHtml(x, pick)).join('')}</div>`;
      if (g.locked) list += `</details>`;
    } else {
      list += `<details class="fold grp" data-g="${gi}" ontoggle="UI.loadBeastGroup(this)">
        <summary>${esc(g.title)} · ${g.list.length} 种${g.locked?'（山系未解锁）':''}</summary>
        <div class="beast-grid" data-loaded="0"></div>
      </details>`;
    }
  }
  // 存到 UI 上而不是 this：taofaListHtml 是普通函数，调用处没有绑定接收者
  UI._beastGroups = groups;
  UI._beastPick = pick;
  return list + `</div>`;
}

// 折叠组展开时才生成卡片：316 只异兽全量渲染要 800 多 KB DOM，
// 折起的组只留一个空容器，点开再填——切页与滚动的卡顿基本消失。
UI.loadBeastGroup = function(det){
  if (!det || !det.open) return;
  const box = det.querySelector && det.querySelector('.beast-grid');
  if (!box || box.getAttribute('data-loaded') === '1') return;
  const g = (this._beastGroups || [])[+det.getAttribute('data-g')];
  if (!g) return;
  const pick = this._beastPick;
  const ordered = pick ? [pick, ...g.list.filter(x=>x!==pick)] : g.list;
  box.innerHTML = ordered.map(x=>beastCardHtml(x, pick)).join('');
  box.setAttribute('data-loaded', '1');
};

// 卷二开关：九九 + 轮回之后才出现。关掉即回本卷——带里打不过时还有退路。
UI.toggleBand = function(){
  Prefs.band = !bandOn();
  this.toast(Prefs.band ? '⚔️ 已入卷二：山中另有一重' : '⏎ 已回本卷');
  this.renderTaofa();
  if (typeof saveGame === 'function') saveGame();
};

UI.renderTaofa = function(){
  const box = $('content');
  if (!box) return;
  const keepY = window.scrollY || window.pageYOffset || 0;
  box.innerHTML = taofaArenaHtml() + taofaListHtml();
  // 同页重绘（切属性等）保住滚动位置，别把正看到的那只怪弹回顶部
  if (keepY > 0 && window.scrollTo) window.scrollTo(0, keepY);
};

// 只换竞技场：战斗开始 / 结束 / 切战斗风格走这里，目标列表原样留下
// 绝技的「在场感」：闪一下、震一下、撒一簇光——否则三倍伤害也只是多一行飘字。
// 只作用于怪物那一格（不整屏闪白），低动效偏好下 FX 自身会降级。
UI.ultimateFx = function(name){
  const el = monsterEl();
  if (!el) return;
  if (el.classList){ el.classList.add('ult-hit'); setTimeout(()=>el.classList.remove('ult-hit'), 460); }
  UI.floatText(el, `绝技 · ${name}`, '#ffd166', true);
  if (typeof FX === 'undefined' || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  if (FX.burst) FX.burst(r.left + r.width / 2, r.top + r.height / 2, '✨', 12);
  if (FX.flash) FX.flash(el);
};

UI.patchCombatArena = function(){
  if (this.currentTab !== 'taofa') return;
  const el = $('arenaBox');
  if (!el){ this.renderTaofa(); return; }
  el.outerHTML = taofaArenaHtml();
};

// 一场战斗收尾（击杀 / 败北 / 逃跑）：只刷竞技场 + 刚打的那一张卡。
// 由 game.js 的结算点直接调用——自动连战下 Game.combat 从不为空，
// 指望 refreshCombatHud 察觉「战斗结束」在挂机场景里永远等不到。
UI.afterCombatEnd = function(id){
  this._combatActive = false;
  if (this.currentTab !== 'taofa') return;
  this.patchCombatArena();
  if (id) this.patchBeastCard(id);
};

// 单张卡补数据：战斗结束只更新刚打的那只（著录数、连杀递减标签），
// 其余 190 张卡的 DOM 一点不动——这是「连战不卡」的关键
// 方块点按 = 往讨；不可讨时说明原因（山系未解锁 / 等级不够）
UI.tryHunt = function(id){
  const x = Monsters[id];
  if (!x) return;
  const node = nodeOf(x.nodeId);
  if (node && !nodeUnlocked(node)){ UI.toast('🔒 ' + nodeLockReason(node)); return; }
  const need = x.needLvl || 1;
  if (levelOf('taofa') < need){ UI.toast(`🔒 需讨伐 ${need} 级方可言 ${x.name}`); return; }
  startCombat(id, { focus: true });
};
// 单击目标卡 → 交互弹窗：属性、掉落、克制、著录一并陈明，再自定场次开战。
// （旧版单击直接开打、长按看详情；手机上常误触，也不方便「连打十场」这类意图。）
UI.openHuntModal = function(id){
  const x = Monsters[id];
  if (!x) return;
  // 卷二开着时，弹窗里展示的是带里的那一遍（名号、气血攻防经验），
  // 但「录 n 次」「宜用属性」「神兵掉落」仍是原来那只的——打的是同一只兽的更强形态。
  const xb = (typeof foeOf === 'function') ? foeOf(x) : x;
  const node = nodeOf(x.nodeId);
  const un = node ? nodeUnlocked(node) : false;
  const need = x.needLvl || 1;
  const taofa = levelOf('taofa');
  const lvOk = taofa >= need;
  const rec = Game.records[id] || { count:0, tier:0 };
  const th = threatOf(xb);
  const counterEl = x.el ? (counterOf(x.el) || '') : '';
  const dropList2 = (xb.loot && xb.loot.length) ? xb.loot : (xb.drop ? [[xb.drop,1,1]] : []);
  const drops = dropList2.map(([iid]) => (Items[iid]||{}).name || iid).join('、');
  const streakN = (Game.mobStreak && Game.mobStreak[id]) || 0;
  const decay = (!x.boss && streakN > 0) ? mobStreakMult(id) : 1;
  const can = un && lvOk;
  const lockMsg = !un
    ? `山系未解锁：${node ? nodeLockReason(node) : '此地不明'}`
    : !lvOk ? `需讨伐 ${need} 级（当前 ${taofa} 级）` : '';
  const rows = [
    x.form ? `<div class="hm-form">${esc(x.form)}</div>` : '',
    xb.band ? `<div class="hm-line band-line">卷二 · 难度带 <b>Lv${xb.bandLv}</b>（本卷 Lv${x.needLvl || 1}）· 经验 ×${TUNING.CYCLE.XP} · 掉落 ×${TUNING.CYCLE.LOOT}</div>` : '',
    `<div class="hm-stats">
       <span>气血 <b>${fmt(xb.hp)}</b></span>
       <span>攻击 <b>${fmt(xb.atk)}</b></span>
       <span>防御 <b>${fmt(xb.def)}</b></span>
       <span>经验 <b>${fmt(xb.xp)}</b></span>
     </div>`,
    `<div class="hm-line">${esc(node ? node.name : '')}${drops ? ' · 掉落 ' + esc(drops) : ''}</div>`,
    `<div class="hm-line">五行 ${x.el || '—'}${counterEl ? ` · <b>宜用 ${counterEl} 属</b>（伤害 ×${TUNING.WUXING.KE}）` : ''}</div>`,
    x.special ? `<div class="hm-line hm-spec"><b>${esc(x.special.name)}</b>${x.desc ? ' · ' + esc(x.desc) : ''}</div>` : '',
    (x.divine && Items[x.divine]) ? `<div class="hm-line hm-divine">遗神兵 <b>${esc(Items[x.divine].name)}</b>（${Math.round((typeof DIVINE_DROP==='number'?DIVINE_DROP:0.06)*100)}% 掉落 · ${esc((DIVINE_EFFECTS[Items[x.divine].divine]||{}).label||'')}）</div>` : '',
    `<div class="hm-line">${th.label}${x.boss ? ' · BOSS' : ''}${x.pair ? ' · 成对（占两槽）' : ''}${(Game.stats.deathStreakOf===id && (Game.stats.deathStreak||0)>=2) ? ` · <span class="hm-warn">已连败 ${Game.stats.deathStreak} 阵</span>` : ''}</div>`,
    `<div class="hm-line">已录 <b>${rec.count}</b> 次（${TUNING.MASTERY.NAMES[rec.tier] || ''}）${decay < 1 ? ` · 连杀递减 ×${decay.toFixed(2)}` : ''}</div>`,
  ].filter(Boolean).join('');
  this.modal(`<h3><span class="mi-ic">${typeof beastIcon==='function'?beastIcon(x):'🐾'}</span> ${esc(xb.name)}${x.py?`<span class="hm-py">（${esc(x.py)}）</span>`:''}</h3>
    ${rows}
    ${can ? `
    <div class="hm-times">
      <label for="huntTimes">战斗次数</label>
      <input id="huntTimes" type="number" min="0" max="99" step="1" value="" placeholder="∞" inputmode="numeric"
        oninput="UI.onHuntTimesInput(this)" onchange="UI.clampHuntTimes(this)">
      <span class="hm-chips">
        <button type="button" class="chip-btn on" onclick="UI.setHuntTimes(0)">∞</button>
        ${[1,5,10,50].map(n=>`<button type="button" class="chip-btn" onclick="UI.setHuntTimes(${n})">${n}</button>`).join('')}
      </span>
    </div>
    <div class="hint">留空为无限连战（♾）；填数字则打满即止。一场胜后自动接战，直至场次用尽或败北；换一只异兽即重置连杀递减。</div>
    <div class="modal-btns">
      <button class="btn primary" onclick="UI.startHuntTimes('${id}')">战斗</button>
      ${counterEl?`<button class="btn" onclick="setCombatStyle('zhu');setZhuEl('${counterEl}');UI.startHuntTimes('${id}')">切${counterEl}属并开战</button>`:''}
      <button class="btn" onclick="UI.closeModal()">取消</button>
    </div>` : `
    <div class="hm-lock">${esc(lockMsg)}</div>
    <div class="modal-btns"><button class="btn" onclick="UI.closeModal()">闭</button></div>`}`);
};
// 次数校验：留空 / 0 表示「无限连战」（返回 null）；其余夹到 1–99 的整数。
// 默认就是无限——挂机游戏里「打一场就停」反而是少数意图，不该让人每次手动改。
UI.clampHuntTimes = function(el){
  if (!el) return null;
  const raw = String(el.value == null ? '' : el.value).trim();
  if (raw === '' || raw === '0' || raw === '∞'){ el.value = ''; return null; }
  let n = parseInt(raw, 10);
  if (!isFinite(n) || n < 1) n = 1;
  if (n > 99) n = 99;
  el.value = n;
  return n;
};
UI.onHuntTimesInput = function(el){
  if (!el) return;
  const n = parseInt(el.value, 10);
  if (isFinite(n) && n > 99) el.value = 99;    // 输入过程中只挡上限，不打断两位数
};
UI.setHuntTimes = function(n){
  const el = document.getElementById('huntTimes');
  if (!el) return;
  el.value = (!n || n <= 0) ? '' : Math.max(1, Math.min(99, n|0));
};
UI.startHuntTimes = function(id){
  const el = document.getElementById('huntTimes');
  const n = this.clampHuntTimes(el);   // null = 无限连战
  this.closeModal();
  startCombat(id, { times:n, focus:true });
};
UI.patchBeastCard = function(id){
  const x = Monsters[id];
  if (!x) return;
  const card = document.querySelector(`.beast-tile[data-bid="${id}"]`);
  if (!card) return;
  const rec = Game.records[id] || { count:0 };
  const recEl = card.querySelector('.bt-rec');
  if (recEl) recEl.textContent = `录 ${rec.count}`;
  const n = (Game.mobStreak && Game.mobStreak[id]) || 0;
  const mult = (typeof mobStreakMult === 'function') ? mobStreakMult(id) : 1;
  let tag = card.querySelector('.bt-decay');
  if (!x.boss && n > 0 && mult < 1){
    if (!tag){
      tag = document.createElement('span');
      tag.className = 'bt-decay';
      card.appendChild(tag);
    }
    tag.textContent = `×${mult.toFixed(2)}`;
    tag.title = `连续讨伐 ${n} 次，经验递减；换一只异兽即恢复全额`;
  } else if (tag){
    tag.remove();
  }
};

// ================= 御使 =================
// 一键最优：整体重排（低分的也换掉），按「每槽收益」择优
UI.autoDeployBest = function(){
  if (typeof autoDeployBest !== 'function'){ this.toast('御使未开'); return; }
  const r = autoDeployBest();
  this.renderYushi();
  if (this.renderTopbar) this.renderTopbar();
  this.toast(r.count ? `🐾 已择优御使 ${r.kinds} 只（占 ${r.count} 槽）` : '暂无可御使的异兽');
};

UI.renderYushi = function(){
  const box = $('content');
  if (!box) return;
  const slots = beastSlots();
  const used = Object.keys(Game.deployed).length;
  const bonus = deployedBonuses();
  // 与顶栏「增益一览」同一出口：点数型（防御）不再被乘成百分比
  const bonusText = bonusTextOf(bonus) === '—' ? '暂无' : bonusTextOf(bonus);
  const omenText = omenBonusText();
  let html = `<div class="two-col"><div class="panel slot-panel">
    <h3>御使槽位（${used}/${slots}）</h3>
    <div class="slot-row">
      ${Array.from({length:slots}, (_,i)=>{
        const bid = Game.deployed[i];
        const b = bid ? Monsters[bid] : null;
        return `<div class="slot ${b?'filled':''}">
          ${b?`<div class="slot-name">${esc(b.name)}</div>
               <div class="slot-buff">${esc((BEAST_BUFFS[b.id]||{}).label||'')}</div>
               <button class="btn small" onclick="undeployBeast(${i});UI.renderYushi()">撤</button>`
             :`<div class="slot-empty">空</div>`}
        </div>`;
      }).join('')}
    </div>
    <div class="hint">槽位随御使等级扩充（每 10 级 +1，至 9 槽）。御使中的异兽持续积累御使经验。</div>
    <div class="bonus-line">当前增益（御使）：${bonusText}</div>
    <div class="bonus-line">当前增益（征兆）：${omenText}</div>
  </div>
  <div class="panel deploy-panel"><h3>可御使之异兽（著录至「通形」）
      <button class="btn small gear-best" type="button" onclick="UI.autoDeployBest()">一键最优</button></h3>
    <div class="tile-grid beast-grid">
    ${deployableBeasts().slice().sort((a,b)=>deployScore(b.id)-deployScore(a.id)).map(b=>{
      const rec = Game.records[b.id];
      const def = BEAST_BUFFS[b.id]||{};
      const scale = 0.6 + 0.1*rec.tier;
      const inSlot = Object.values(Game.deployed).includes(b.id);
      // 方块：图标 + 名 + 著录阶，点按即御使（在槽的只读不点）；
      // 增益幅度与著录次数进浮层
      return `<div class="tile deploy-tile ${inSlot?'inslot':''}" data-tip data-tip-title="${esc(b.name)}"
        role="button" tabindex="0" onclick="UI.openDeployModal('${b.id}')">
        <span class="tile-ic bi-ic">${(typeof beastIcon==='function')?beastIcon(b):(CAT_EMOJI[b.category]||'🐾')}</span>
        <span class="tile-nm">${esc(b.name)}</span>
        <span class="tile-tag">${TUNING.MASTERY.NAMES[rec.tier]} · 录${rec.count}</span>
        ${inSlot?'<span class="tile-more" title="已在御使槽中">✓</span>':''}
        <span class="tip-body hidden">
          <div class="bc-sub">${esc(def.label||'')}${(typeof beastBuffText==='function' && beastBuffText(b.id))?`：<b>${esc(beastBuffText(b.id))}</b>`:''}</div>
          <div class="bc-sub">按著录阶 ×${scale.toFixed(1)}　·　著录 ${rec.count} 次${Monsters[b.id]&&Monsters[b.id].pair?' · 成对，占两槽':''}</div>
        </span>
      </div>`;
    }).join('') || `<div class="hint">尚无达标异兽——往讨异兽并累积著录度<br><button class="btn small" style="margin-top:10px" onclick="UI.switchTab('taofa')">${typeof markIcon==='function'?markIcon('bolt',14):'⚔️'} 去征伐</button></div>`}
    </div>
  </div></div>
  <div class="panel lock-panel"><h3>未达标</h3>
    ${(()=>{
      const next = TUNING.MASTERY.THRESHOLDS[3];
      const all = Object.values(Monsters).filter(m=>!m.boss && ((Game.records[m.id]||{}).tier||0)<3);
      const started = all.filter(m=>((Game.records[m.id]||{}).count||0) > 0);
      const untouched = all.filter(m=>!(((Game.records[m.id]||{}).count||0) > 0));
      const card = m=>`<div class="mini-card"><b>${esc(m.name)}</b><span>${(Game.records[m.id]||{count:0}).count}/${next}</span></div>`;
      // 有进展的排在前面直接可见；一次没讨过的收进折叠区，免得开屏就是一堵 0/50 的墙
      return (started.length
          ? `<div class="mini-grid">${started.map(card).join('')}</div>`
          : '<div class="hint">尚无著录中的异兽。往讨任意异兽，每次交手都会累积它的著录度（至通形 50 次可御使）。</div>')
        + (untouched.length
          ? `<details class="fold"><summary>其余 ${untouched.length} 种尚未著录</summary><div class="mini-grid">${untouched.map(card).join('')}</div></details>`
          : '');
    })()}
  </div>`;
  box.innerHTML = html;
};

// 窄屏下侧边栏为纵向滚动（抽屉）：切换（含数字键快捷切换）后把激活项滚入视野。
// 未溢出的情况直接返回，不产生位移。
function scrollActiveTabIntoView(){
  const tabs = $('tabs');
  // 非浏览器环境（无头测试的桩 DOM）下静默跳过
  if (!tabs || typeof tabs.querySelector !== 'function') return;
  const act = tabs.querySelector('.tab.active');
  if (!act || typeof act.getBoundingClientRect !== 'function') return;
  if (typeof tabs.scrollTo !== 'function') return;
  // 未溢出时不动，避免无谓位移
  if (!(tabs.scrollHeight > tabs.clientHeight + 1)) return;
  const delta = act.getBoundingClientRect().top - tabs.getBoundingClientRect().top;
  const target = tabs.scrollTop + delta - (tabs.clientHeight - act.offsetHeight) / 2;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  tabs.scrollTo({ top: Math.max(0, Math.round(target)), behavior: reduce ? 'auto' : 'smooth' });
}

// 页签角标：提示有可御使的异兽 / 未涉足的山川
function refreshTabBadges(){
  const tabs = $('tabs');
  if (!tabs || typeof tabs.querySelector !== 'function') return;
  const ready = (typeof deployableBeasts === 'function' ? deployableBeasts() : [])
    .filter(m=>!Object.values(Game.deployed).includes(m.id)).length;
  const newNodes = (WORLD && WORLD.regions || []).reduce((a,r)=>
    a + (regionUnlocked(r) ? r.nodes.filter(n=>!Game.map[n.id]).length : 0), 0);
  const set = (id, on, label)=>{
    const b = tabs.querySelector(`[data-badge="${id}"]`);
    if (!b) return;
    b.textContent = on ? label : '';
    b.classList.toggle('on', !!on);
  };
  set('yushi', ready > 0, ready > 9 ? '9+' : String(ready));   // 可御使未入槽
  set('yudi', newNodes > 0, '');                               // 有未涉山川（红点）
}
