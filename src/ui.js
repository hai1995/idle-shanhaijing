// ===== 界面渲染与交互（竹简 / 绢帛 / 水墨 视觉） =====

// ---------- 页签 ----------
// 图标为内联 SVG（1.6 线宽、24 网格、取 currentColor），与墨色栏、朱色选中态统一，
// 不依赖系统 emoji 字体——避免不同平台图标风格不一致或缺失。
const ICON = (d)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const TABS = [
  { id:'yudi',    label:'舆地', icon:ICON('<path d="M3 6.6 9 4l6 2.6L21 4v13.4L15 20l-6-2.6L3 20V6.6Z"/><path d="M9 4v13.4M15 6.6V20"/>') },
  { id:'skills',  label:'技能', icon:ICON('<rect x="5" y="3" width="14" height="18" rx="1.6"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>') },
  { id:'taofa',   label:'征伐', icon:ICON('<path d="M18.4 3.6 21 3.2l-.4 2.6-9.2 9.2-2.2-2.2 9.2-9.2Z"/><path d="M7.8 14.6 4.2 18.2M8.6 19.4 5 15.8M9.4 14.6l-2.2-2.2"/>') },
  { id:'yushi',   label:'御使', icon:ICON('<circle cx="7" cy="9" r="1.5"/><circle cx="12" cy="6.8" r="1.5"/><circle cx="17" cy="9" r="1.5"/><path d="M12 11.4c2.9 0 5 2.1 5 4.4 0 1.7-1.2 2.9-2.9 2.9-1 0-1.4-.5-2.1-.5s-1.1.5-2.1.5C8.2 18.7 7 17.5 7 15.8c0-2.3 2.1-4.4 5-4.4Z"/>') },
  { id:'codex',   label:'图鉴', icon:ICON('<path d="M12 6.6C10 5 7.6 4.6 4.2 4.8v12.8c3.4-.2 5.8.3 7.8 1.8 2-1.5 4.4-2 7.8-1.8V4.8c-3.4-.2-5.8.2-7.8 1.8Z"/><path d="M12 6.6v12.8"/>') },
  { id:'jisi',    label:'祠祀', icon:ICON('<path d="M6.2 7.4h11.6v3.4a5.8 5.8 0 0 1-11.6 0V7.4Z"/><path d="M9.2 16.2 8.4 20M14.8 16.2 15.6 20M12 17v3M4 10H2.4M22 10h-1.6M9.4 7.4V4.8M14.6 7.4V4.8"/>') },
  { id:'shichan', label:'墟市', icon:ICON('<path d="M12 4.4V20M8 20h8M4.6 8.4h14.8"/><path d="M4.6 8.4 2.6 12.6h4L4.6 8.4ZM19.4 8.4l-2 4.2h4l-2-4.2Z"/>') },
  { id:'ying',    label:'营造', icon:ICON('<path d="M3.6 11.2 12 4l8.4 7.2"/><path d="M6 10v9.6h12V10"/><path d="M10 19.6v-5.2h4v5.2"/>') },
  { id:'queue',   label:'行动', icon:ICON('<circle cx="12" cy="12" r="8.6"/><path d="M15.2 8.8 13 13l-4.2 2.2L11 11l4.2-2.2Z"/>') },
  { id:'pack',    label:'行装', icon:ICON('<path d="M8.4 9.6h7.2l1.3 8.4a1.5 1.5 0 0 1-1.5 1.7H8.6a1.5 1.5 0 0 1-1.5-1.7L8.4 9.6Z"/><path d="M9.4 9.6c0-2.7 1.1-4.4 2.6-4.4s2.6 1.7 2.6 4.4"/><path d="M12 5.2v2.3"/>') },
  { id:'stats',   label:'统计', icon:ICON('<path d="M4 19.6h16"/><path d="M7.4 19.6v-6.2M12 19.6V7.6M16.6 19.6v-9.2"/>') },
  { id:'about',   label:'叙录', icon:ICON('<rect x="4.6" y="3.4" width="14.8" height="17.2" rx="1.4"/><path d="M8.2 8.2h7.6M8.2 11.6h7.6M8.2 15h4.6"/>') },
];
// 页签 → 页面渲染函数（renderCurrent 与页头包装层共用）
const TAB_RENDER = { yudi:'renderYudi', skills:'renderSkills', taofa:'renderTaofa', yushi:'renderYushi',
  codex:'renderCodex', jisi:'renderJisi', shichan:'renderShichan', ying:'renderYing',
  queue:'renderQueue', pack:'renderPack', stats:'renderStats', settings:'renderSettings',
  about:'renderAbout' };
const CAT_EMOJI = { 兽:'🐾', 鸟:'🪶', 水族:'🐟', 蛇:'🐍' };
const LOG_COLORS = { good:'#4A7C59', bad:'#C3272B', gold:'#D9A521', sys:'#8C5A3C' };

// ---------- DOM 辅助 ----------
function $(id){ return document.getElementById(id); }

// 前缀符号矢量化：toast / 日志等纯文本通道只能塞字符串，
// 但开头那个 emoji 若原样留下，与界面里其余矢量图标不搭。
// 这里把开头的标记 emoji 换成对应矢量小图，其余文字仍走转义。
const MARK_EMOJI_MAP = {
  '📍':'pin', '🔒':'lock', '☀':'sun', '☾':'moon', '🧭':'compass',
  '⚖️':'scale', '⚖':'scale', '💡':'lamp', '⚡':'bolt', '✔':'check',
  '✓':'check', '⚠':'warn', '🌙':'moon', '⚔️':'bolt', '⚔':'bolt',
  '🦹':'warn', '🗺️':'compass', '📜':'lamp', '🎒':'scale', '📊':'check',
};
function markHtml(text, size){
  const raw = String(text==null?'':text);
  // 已经内联好的 SVG（物品小图等）原样透传，不再转义
  if (raw.charCodeAt(0) === 60 /* '<' */ && raw.indexOf('<svg') === 0) return raw;
  const m = raw.match(/^(\s*)([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]+)\s*/u);
  if (!m) return esc(raw);
  const fam = MARK_EMOJI_MAP[m[2]] || MARK_EMOJI_MAP[m[2].replace(/\u{FE0F}/g,'')];
  if (!fam || typeof markIcon !== 'function') return esc(raw);
  return m[1] + markIcon(fam, size||15) + ' ' + esc(raw.slice(m[0].length));
}
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fmt(n){
  n = Number(n)||0;
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e4) return (n/1e3).toFixed(1)+'K';
  return String(Math.floor(n));
}
// 上次离线结算的一句话摘要：多久以前 · 离线多长 · 得多少经验
function lastOfflineText(){
  const lo = (typeof Game !== 'undefined' && Game.stats) ? Game.stats.lastOffline : null;
  if (!lo) return '尚未结算';
  const ago = Math.max(0, (Date.now() - lo.at) / 1000);
  return `${fmtTime(ago)}前 · 离线 ${fmtTime(lo.sec)} · +${fmt(lo.xp)} 经验`;
}
function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec||0));
  const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60;
  if (h > 0) return `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分 ${s} 秒`;
  return `${s} 秒`;
}
// ---------- 增益口径（顶栏「增益一览」与御使页「当前增益」共用） ----------
// 御使增益分两类：一类是「点数」（防御 +1、回血 +3），一类是「倍率」（采集速度 +10%）。
// 早期两处各写一套格式化，御使页把点数也乘了 100，防御 +1 被显示成 +100%，
// 同一增益在两页对不上。现在只有这一个出口。
const BONUS_LABEL = {
  gatherSpeed:'采集速度', xp:'经验', farmSpeed:'田事', div:'卜筮观象', hp:'气血', def:'防御',
  offline:'离线收益', trade:'贸易', dmg:'伤害', loot:'所获', cookQty:'烹饪并出',
  build:'营造', yield:'全局产出', heal:'疗愈',
};
const BONUS_FLAT = { def:true, heal:true };   // 点数型（不乘 100）
function bonusTextOf(obj, sep){
  const parts = Object.entries(obj||{}).filter(([k,v])=>v>0).map(([k,v])=>{
    const val = BONUS_FLAT[k] ? (Math.round(v*100)/100) : (Math.round(v*1000)/10) + '%';
    return `${BONUS_LABEL[k]||k} +${val}`;
  });
  return parts.length ? parts.join(sep || ' · ') : '—';
}
// 征兆合计（征兆是百分比修正，与御使增益分列）
function omenBonusText(){
  if (typeof currentOmenEffects !== 'function') return '—';
  const list = currentOmenEffects();
  return (list.map(e=>`${e.label} ${e.pct>0?'+':''}${Math.round(e.pct*100)/100}%`).join(' · ')) || '—';
}
// 生僻字：显示拼音注音 + 保留原字
function nameTag(name, py){
  // 生僻字（CJK 扩展 B 及以上）检测：码点转义 + u flag
  const rare = /[\u{20000}-\u{3FFFF}]/u.test(name||'');
  if (py) return `<span class="nm" title="${esc(py)}">${esc(name)}<rt>${esc(py)}</rt></span>`;
  if (rare) return `<span class="nm rare" title="生僻字">${esc(name)}</span>`;
  return `<span class="nm">${esc(name)}</span>`;
}
// 检索命中高亮：把 query 命中的片段包成 <mark class="hit">，所有片段先转义再拼接
function hi(s, q){
  s = String(s==null ? '' : s);
  if (!q) return esc(s);
  const low = s.toLowerCase();
  let i = low.indexOf(q), out = '', from = 0;
  if (i < 0) return esc(s);
  while (i >= 0){
    out += esc(s.slice(from, i)) + '<mark class="hit">' + esc(s.slice(i, i + q.length)) + '</mark>';
    from = i + q.length;
    i = low.indexOf(q, from);
  }
  return out + esc(s.slice(from));
}
function costChips(cost){
  return (cost||[]).map(([id,q])=>{
    const it = Items[id];
    const has = totalOf(id);
    const cls = has >= q ? 'ok' : 'lack';
    return `<span class="chip cost ${cls}">${typeof itemIc==='function'?itemIc(id,13):(it?it.icon:'❓')}${esc(it?it.name:id)}×${q}<i>有${has}</i></span>`;
  }).join('');
}
function elBadge(el){
  if (!el) return '';
  return `<span class="el el-${({金:'jin',木:'mu',水:'shui',火:'huo',土:'tu'})[el]}">${el}</span>`;
}

// ---------- UI 主体 ----------
const UI = {
  currentTab: 'yudi',
  logEntries: [],
  logFilter: 'all',
  selRegion: 'nanshan-1',
  selNode: 'nanshan-1-01',
  codexTab: 'beast',
  codexQuery: '',
  skillFilter: 'all',
  recipeSkill: 'burn',
  queueKind: 'qiaocai',
  invSort: 'default',
  packSellTier: 'COMMON',   // 廛市清整的稀有度阈值（凡品 → 瑰宝）
  omenFilter: 'all',
  lastDivine: null,

  // ---------- 基础 ----------
  log(msg, color, cat){
    this.logEntries.unshift({ msg, color, cat: cat||'sys', t: Date.now() });
    // 只留最近 300 条：日志是回溯用的，留太多既费内存又拖慢重绘
    if (this.logEntries.length > 300) this.logEntries.length = 300;
    if (this.currentTab === 'stats') this.renderLog();
  },
  toast(text){
    const box = $('toasts');
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = markHtml(text, 15);
    box.appendChild(d);
    setTimeout(()=>d.remove(), 2600);
  },
  floatText(el, text, color, big){
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    // 浮字走 markHtml：开头的标记 emoji 换成矢量小图，其余文字仍转义
    FX.floatAtEl(el, markHtml(text, 15), color, big, true);
  },
  hit(el, text, color){
    if (!el) return;
    this.floatText(el, text, color);
    FX.flash(el);
  },
  attackFx(who){
    const el = who === 'player' ? $('playerFighter') : $('monsterFighter');
    if (!el) return;
    FX.pop(el);
  },
  levelUp(skillId, old, lv, gain){
    const el = document.querySelector(`[data-skill="${skillId}"]`);
    if (el){ FX.pop(el); FX.burstAtEl(el, '✨', 6); }
    const sk = Skills[skillId];
    this.toast(`🎉 ${sk.name} 升至 ${lv} 级（${TUNING.TIER_NAMES[tierOfLevel(lv)]}）`);
    this.log(`🎉 ${sk.name} ${old} → ${lv} 级`, 'gold', 'skill');
  },
  // 产物浮字：传入物品 id（而非 emoji），此处取族形小图
  actionFeedback(skillId, itemId, qty){
    const el = document.querySelector(`[data-skill="${skillId}"]`);
    if (el){
      FX.pop(el);
      const ic = (typeof itemIc === 'function') ? itemIc(itemId, 15) : '';
      this.floatText(el, `${ic}×${qty}`, '#D9A521');
    }
  },
  lootFloat(itemId, qty){
    const el = $('monsterFighter');
    const it = Items[itemId];
    const ic = (typeof itemIc === 'function') ? itemIc(itemId, 15) : '';
    this.floatText(el, `${ic} ${it?it.name:''}×${qty}`, '#D9A521');
  },
  deathFloat(){
    const el = $('playerFighter');
    if (el) FX.burstAtEl(el, '💀', 10);
    this.toast('💀 败北……');
  },
  bossKillFx(m){
    const el = $('monsterFighter');
    if (el) FX.burstAtEl(el, '🏆', 16);
    this.toast(`🏆 讨平 ${m.name}！`);
  },
  cropGrown(slot, crop){
    const el = document.querySelector(`[data-plot="${slot}"]`);
    this.floatText(el, `🌾 ${crop.name}`, '#4A7C59');
    if (this.currentTab === 'skills') this.patchFarms();   // 收获后卡片即刻翻面
  },
  forgeShow(item, opts){
    if (Prefs.fxLevel === 'off') return false;
    if (Prefs.fxLevel === 'light') return false;
    return FX.forge(item, opts);
  },
  // 战斗状态变化。注意：不主动切页——挂机连战/战败复讨会反复触发，
  // 强行跳转会打断玩家正在别的页面做的事。仅玩家手动点击「往讨」时
  // 由调用方传 { focus:true } 才切到征伐页。
  startCombat(m, opts){
    if (opts && opts.focus && this.currentTab !== 'taofa') this.switchTab('taofa');
    // 只换竞技场：开战时列表 316 张卡不需要重建（重建会让滚动抖一下）
    if (this.currentTab === 'taofa') this.patchCombatArena();
    this.refreshActivity();
  },
  tickProgress(){
    const fill = $('actionProgFill');
    const wrap = $('actionProg');
    if (!fill || !wrap) return;
    const a = Game.activity;
    if (!a){ wrap.classList.add('hidden'); this.refreshCombatHud(); return; }   // 纯讨伐无行动进度，但战斗 HUD 仍需每帧刷新
    wrap.classList.remove('hidden');
    const interval = currentActionInterval();
    const pct = Math.min(100, activityProgress / interval * 100);
    fill.style.width = pct.toFixed(1) + '%';
    this.refreshCombatHud();
  },
  // 战斗中每帧就地刷新竞技场血量条/数值（不重渲染整个面板，避免滚动复位）
  // ⚠️ 顶栏不再显示气血（征伐页的战斗面板里已有，重复一遍纯属冗余）。
  refreshCombatHud(){
    const c = Game.combat;
    if (!c){
      if (this._combatActive){
        this._combatActive = false;
        this.afterCombatEnd(this._lastMobId);
      }
      return;
    }
    this._combatActive = true;
    this._lastMobId = c.monsterId;
    if (this.currentTab !== 'taofa') return;
    const m = Monsters[c.monsterId];
    if (!m) return;
    const pf = playerEl() && playerEl().querySelector('.f-hp .fill');
    if (pf) pf.style.width = Math.max(0, c.playerHp / playerMaxHp() * 100) + '%';
    const mf = monsterEl() && monsterEl().querySelector('.f-hp .fill');
    if (mf) mf.style.width = Math.max(0, c.monsterHp / m.hp * 100) + '%';
    const ms = monsterEl() && monsterEl().querySelector('.f-sub');
    if (ms) ms.textContent = fmt(Math.max(0, c.monsterHp)) + ' / ' + fmt(m.hp);
    const cs = $('combatStats');
    if (cs) cs.textContent = `回合 ${c.round||0} · 造成 ${c.dmgOut||0} · 承伤 ${c.dmgIn||0}${Game.stats.winStreak>1?` · 连胜 ${Game.stats.winStreak}`:''}`;
    const est = $('combatEst');
    if (est){ const r = combatEstimateInner(m, c, c.monsterHp); if (r){ est.className = 'combat-est ' + r.cls; est.innerHTML = r.html; } }
  },
  // 全局「下一步建议」：除舆地页（自带条）外，其余页签顶栏常驻显示
  updateGuidance(){
    const el = $('guidance');
    if (!el) return;
    if (Prefs.hideHint || UI.currentTab === 'yudi'){ el.classList.add('hidden'); el.onclick = null; return; }
    const h = (typeof nextHint === 'function') ? nextHint() : null;
    if (!h){ el.classList.add('hidden'); el.onclick = null; return; }
    el.classList.remove('hidden');
    el.innerHTML = `<span class="mi-ic">${typeof markIcon==='function'?markIcon(hintMark(h),15):h.icon}</span> <span>${esc(h.text)}</span>${h.tab?' <span class="goto">前往 ›</span>':''}<button class="hint-close" title="关闭指引条（设置中可重开）" onclick="event.stopPropagation();UI.dismissHint()">✕</button>`;
    el.onclick = h.tab ? ()=>UI.switchTab(h.tab) : null;
    el.style.cursor = h.tab ? 'pointer' : 'default';
  },
  // 关闭常驻指引条：记住偏好并重渲染当前页（舆地页的条随页面渲染，需重渲才消失）
  dismissHint(){
    Prefs.hideHint = true;
    saveGame();
    this.updateGuidance();
    if (this.currentTab === 'yudi' && this.renderYudi) this.renderYudi();
    this.toast('🔕 已关闭指引条，可在「设置」中重新开启');
  },
  refreshActivity(){
    const t = $('activityText');
    if (t){
      const a = Game.activity;
      let label = '空闲';
      if (a){
        label = currentActivityLabel();
        const node = currentActivityNodeLabel();
        if (node) label += `（${node}）`;
        if (a.src === 'fallback') label += '（兜底）';   // 闲置兜底自动接上的行动，标出来
      } else if (Game.combat){
        label = `往讨：${(Monsters[Game.combat.monsterId]||{}).name||''}`;
      }
      t.textContent = label;
    }
    // 停止按钮：有「可停的行动」就出现——采集/制作等行动如此，往讨亦然
    // （停战结束当前这一场且不再自动接战，见 game.js stopActivity）
    const bs = $('btnStop');
    if (bs) bs.classList.toggle('hidden', !(Game.activity || Game.combat));
    // 仪表带上的活动指示点：忙碌时转朱色，空闲时保持墨灰
    const sb = $('statusbar');
    if (sb) sb.classList.toggle('running', !!(Game.activity || Game.combat));
    this.tickProgress();
    refreshTabBadges();
    this.updateGuidance();
    if (this.currentTab === 'skills') this.renderSkills();
  },
  // 仪表带的行动文字可点：直达该行动所在页（采集/制作→技能，观象/谒见/灌木→舆地，往讨→征伐）
  gotoActivity(){
    if (Game.combat){ this.switchTab('taofa'); return; }
    const a = Game.activity;
    if (!a){ this.switchTab('skills'); return; }          // 空闲时回最常用的技能页
    if (a.src === 'queue'){ this.switchTab('queue'); return; }
    const tab = (a.kind === 'observe' || a.kind === 'audience' || a.kind === 'grow') ? 'yudi'
      : a.kind === 'jisi' ? 'jisi' : 'skills';
    this.switchTab(tab);
  },
  refreshGear(){ if (this.currentTab === 'pack') this.renderPack(); },
  refreshInventory(){
    if (this.currentTab === 'pack') this.renderPack();
    if (this.currentTab === 'shichan') this.renderShichan();
  },
  refreshMap(){ if (this.currentTab === 'yudi') this.renderYudi(); },
  refreshShop(){ if (this.currentTab === 'shichan') this.renderShichan(); },
  refreshAll(){
    this.renderTopbar();
    this.renderCurrent();
  },

  // ---------- 弹窗 ----------
  modal(html){
    const m = $('modal'), box = $('modalBox');
    if (!m || !box) return;
    box.innerHTML = html;
    m.classList.remove('hidden');
  },
  closeModal(){
    const m = $('modal');
    if (m) m.classList.add('hidden');
  },

  // ---------- 离线归来汇总 ----------
  showOfflineSummary(rec){
    if (!rec) return;
    const items = Object.entries(rec.items||{}).map(([id,q])=>{
      const it = Items[id];
      return `<span class="chip">${typeof itemIc==='function'?itemIc(id,13):(it?(it.icon||'⬜'):'❓')}${it?esc(it.name):esc(id)}×${q}</span>`;
    }).join('');
    const harvest = (rec.harvests||0) > 0 ? `<div class="form-row"><span>圃艺收成</span><b>🌾 ${rec.harvests} 次</b></div>` : '';
    const recLine = (rec.records||0) > 0 ? `<div class="form-row"><span>新著录</span><b>${rec.records} 条</b></div>` : '';
    UI.modal(`
      <h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('moon',18):'🌙'}</span> 离线归来</h3>
      <p class="hint">离山 ${fmtTime(rec.seconds)}（离线效率 ${Math.round(offlineEff()*100)}%），竹简不曾停笔。</p>
      <div class="form-row"><span>修得经验</span><b style="color:var(--gamboge)">+${fmt(rec.xp)}</b></div>
      ${recLine}${harvest}
      ${items ? `<div class="panel" style="margin-top:8px"><div class="yield-row"><b>所得</b>${items}</div></div>` : ''}
      <div class="modal-btns"><button class="btn on" onclick="UI.closeModal()">收下</button></div>
    `);
    FX && FX.burst && FX.burst(window.innerWidth/2, window.innerHeight*0.3, '🌙', 10);
  },

  // ---------- 御使入槽引导 ----------
  maybeShowDeployHint(beast){
    if (!beast || beast.boss) return;
    if (Game.stats.seenDeployHint) return;
    if (Object.values(Game.deployed).includes(beast.id)) return;
    const m = $('modal');
    if (m && m.classList && typeof m.classList.contains === 'function' && !m.classList.contains('hidden')) return;   // 已有弹窗（如离线归来）时不抢占
    Game.stats.seenDeployHint = true;
    this.showDeployHint(beast);
  },
  showDeployHint(beast){
    UI.modal(`
      <h3>🐾 可御使！</h3>
      <p class="hint">「${esc(beast.name)}」已著录至「通形」，可前往「御使」入槽，化作被动增益与自动作业。</p>
      <div class="modal-btns">
        <button class="btn on" onclick="UI.closeModal();UI.switchTab('yushi')">前往御使</button>
        <button class="btn" onclick="UI.closeModal()">稍后</button>
      </div>`);
    FX && FX.burst && FX.burst((window.innerWidth||300)/2, (window.innerHeight||500)/3, '🐾', 12);
  },

  // ---------- 页签切换 ----------
  switchTab(tab){
    const changed = this.currentTab !== tab;
    // 离开统计页立刻停掉就地刷新（不等下一次 tick）
    if (tab !== 'stats' && this._statTicker){ clearInterval(this._statTicker); this._statTicker = null; }
    this.closeBuffPop();                 // 切页时把增益浮层收掉，免得悬在新页面上
    this.currentTab = tab;
    document.querySelectorAll('.tab').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    this.renderCurrent();
    // 切页入场：整块内容一次性归位，取代逐元素延迟造成的拖沓
    const c = $('content');
    if (c && changed && c.classList){
      c.classList.remove('enter');
      void c.offsetWidth;          // 重排以重启动画
      c.classList.add('enter');
      // ⚠️ 动画播完必须摘掉 class：`#content.enter > *` 是「任何直接子元素」，
      // 留着它，之后每次局部重绘（战斗结束重建目标列表等）新节点都会重新匹配、
      // 再播一遍淡入 + 位移——连战时整页每几秒闪一下，正是「征伐页卡顿」的观感来源
      clearTimeout(this._enterTimer);
      this._enterTimer = setTimeout(()=>c.classList.remove('enter'), 480);
    }
    scrollActiveTabIntoView();
    this.closeDrawer();
  },
  // ---------- 移动端抽屉导航（PC 端为常驻侧边栏，以下为空操作） ----------
  openDrawer(){
    if (!document.body || !document.body.classList) return;
    document.body.classList.add('drawer-open');
    const m = $('drawerMask'); if (m) m.classList.remove('hidden');
  },
  closeDrawer(){
    if (!document.body || !document.body.classList || !document.body.classList.contains('drawer-open')) return;
    document.body.classList.remove('drawer-open');
    const m = $('drawerMask'); if (m) m.classList.add('hidden');
  },
  toggleDrawer(){
    if (document.body && document.body.classList && document.body.classList.contains('drawer-open')) this.closeDrawer();
    else this.openDrawer();
  },
  // ---------- 昼夜模式 ----------
  theme: 'day',
  applyTheme(t, persist){
    t = (t === 'night') ? 'night' : 'day';
    this.theme = t;
    const de = document.documentElement;
    de.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'night' ? '#0E0B07' : '#1E1C18');
    if (persist){ try { localStorage.setItem('shj-theme', t); } catch(e){} }
  },
  toggleTheme(){
    const de = document.documentElement;
    de.classList.add('theme-anim');
    this.applyTheme(this.theme === 'night' ? 'day' : 'night', true);
    setTimeout(() => de.classList.remove('theme-anim'), 340);
  },
  renderCurrent(){
    if (typeof hideTip === 'function') hideTip();   // 重渲染后锚点已销毁，浮层随之关闭
    const fn = TAB_RENDER[this.currentTab];
    if (fn && this[fn]) this[fn]();                  // 包装层已负责补页头条
    this.renderTopbar();
    this.refreshActivity();
    this.fitGhostScrollbar();
  },
  // 页头等级条 + 页尾下一步：各页渲染完后就地插入（不侵入各页 HTML 模板）
  renderPageLevel(){
    const c = $('content');
    if (!c || typeof c.insertAdjacentHTML !== 'function') return;
    const old = (c.querySelector && c.querySelector('.page-lvbar'));
    if (old && old.remove) old.remove();
    const html = pageLevelBar(this.currentTab);
    if (html) c.insertAdjacentHTML('afterbegin', html);
    const oldBar = (c.querySelector && c.querySelector('.next-step-bar'));
    if (oldBar && oldBar.remove) oldBar.remove();
    const bar = nextStepHtml(this.currentTab);
    if (bar) c.insertAdjacentHTML('beforeend', bar);
  },
  // 幽灵竖滚动条：内容几乎正好填满视口时，#app 的底部留白会把页面顶出几像素，
  // 浏览器于是画出一条「几乎滑不动」的竖滚动条。这里量一次真实溢出：
  //   溢出 ≤ 留白量 → 说明多出来的正是留白，收窄留白即可让页面正好贴住视口底；
  //   溢出 > 留白量 → 内容本身就超高，滚动条是必要的，留白保持不动。
  fitGhostScrollbar(){
    const de = document.documentElement;
    const app = document.getElementById('app');
    if (!de || !app) return;
    const base = parseFloat(getComputedStyle(de).getPropertyValue('--app-pad-b-base')) || 28;
    const apply = (v)=>{ de.style.setProperty('--app-pad-b', Math.max(0, v) + 'px'); };
    apply(base);                                   // 先回到基准，避免沿用上一次的收窄值
    const over = de.scrollHeight - de.clientHeight;
    if (over <= 0) return;                         // 本来就不溢出，留白照旧
    if (over > base) return;                       // 内容自身超高，滚动条必要，不动
    apply(base - over);                            // 溢出全在留白里：收窄到刚好贴住底
    const over2 = de.scrollHeight - de.clientHeight;
    if (over2 > 0) apply(Math.max(0, base - over - over2));
  },
  // 相邻页签切换（移动端左右滑）
  switchTabNeighbor(dir){
    const i = TABS.findIndex(t=>t.id === this.currentTab);
    if (i < 0) return;
    const next = TABS[(i + (dir||1) + TABS.length) % TABS.length];
    if (next) this.switchTab(next.id);
  },

  // 增益归拢：临时增益 / 御使异兽 / 生效征兆。原先挤在仪表带上（「🐾 御使 2 · ⚡ 征兆 3」），
  // 既占地方又读不全；现在收进书脊右上角一枚图标，点开浮层逐条列清。
  buffSummary(){
    const temp = [];
    if (Game.buff && Game.buff.def){
      temp.push({
        name: Game.buff.def.name || '临时增益',
        desc: buffDefText(Game.buff.def),
        left: Math.max(0, Game.buff.remaining || 0),
      });
    }
    const beasts = [];
    Object.values(Game.deployed).filter((v,i,a)=>a.indexOf(v)===i).forEach(id=>{
      const b = Monsters[id]; if (!b) return;
      const def = (typeof BEAST_BUFFS!=='undefined' && BEAST_BUFFS[id]) ||
                  (typeof genericBeastBuff==='function' ? genericBeastBuff(b) : null);
      beasts.push({ name: b.name, desc: def ? buffDefText(def) : '', label: def && def.label || '' });
    });
    const omens = [];
    (Game.omens || []).forEach(o=>{
      const d = (typeof OMENS!=='undefined') && OMENS[o.id];
      if (!d) return;
      omens.push({
        name: d.beast || d.type || '征兆',
        pol: d.polarity === '凶' ? '凶' : d.polarity === '吉' ? '吉' : '中',
        // 去掉 omenEffectText 自带的有效期括注（右侧已单列剩余时间）
        desc: (typeof omenEffectText === 'function') ? omenEffectText(d).replace(/（[^）]*）/g, '') : (d.desc || ''),
        left: o.until ? Math.max(0, o.until - gameTime()) : 0,
      });
    });
    return { temp, beasts, omens, count: temp.length + beasts.length + omens.length };
  },
  // 书脊上的增益图标：有增益时亮起并带计数，没有时只是暗淡的常驻入口
  renderBuffBtn(){
    const btn = $('buffBtn'), n = $('buffCount');
    if (!btn) return;
    const s = this.buffSummary();
    if (n){
      n.textContent = s.count > 99 ? '99+' : String(s.count);
      n.classList.toggle('hidden', s.count === 0);
    }
    btn.classList.toggle('on', s.count > 0);
    btn.title = s.count ? `增益一览（${s.count} 项）` : '增益一览（当前无）';
    // 浮层开着就连带刷新：增益 / 征兆到期时展开层的内容要跟上（倒计时尤其）
    const pop = $('buffPop');
    if (pop && !pop.classList.contains('hidden')) pop.innerHTML = this.buffPopHtml();
  },
  // 浮层内容：分三段列清，末尾给两行合计（御使 / 征兆各自的总加成）
  buffPopHtml(){
    const s = this.buffSummary();
    const item = (title, desc, extra) => `<div class="bp-item"><div class="bp-l1"><b>${esc(title)}</b>${extra || ''}</div>${desc?`<div class="bp-desc">${esc(desc)}</div>`:''}</div>`;
    const sec = (name, n, body) => n ? `<div class="bp-sec"><h4>${name}<i>${n}</i></h4>${body}</div>` : '';

    let html = `<div class="bp-head"><h3>增益一览</h3><button class="bp-x" type="button" title="关闭" onclick="UI.closeBuffPop()">✕</button></div>`;
    if (!s.count){
      html += '<div class="hint bp-empty">当前无增益。<br>御使异兽（著录至「通形」）或著录触发征兆后，加成会汇总在这里。</div>';
    } else {
      html += sec('临时增益', s.temp.length, s.temp.map(t=>
        item(t.name, t.desc, t.left ? `<span class="bp-time">${fmtTime(t.left)}</span>` : '')).join(''));
      html += sec('御使', s.beasts.length, s.beasts.map(b=>
        item(b.name, b.desc || b.label)).join(''));
      html += sec('征兆', s.omens.length, s.omens.map(o=>
        item(o.name, o.desc, `<span class="bp-pol ${o.pol}">${o.pol}</span>${o.left?`<span class="bp-time">${fmtTime(o.left)}</span>`:''}`)).join(''));
      const dBonus = (typeof deployedBonuses === 'function') ? bonusTextOf(deployedBonuses()) : '—';
      const oBonus = omenBonusText();
      html += `<div class="bp-agg"><div><span>御使合计</span><b>${esc(dBonus)}</b></div><div><span>征兆合计</span><b>${esc(oBonus)}</b></div></div>`;
    }
    return html;
  },
  openBuffPop(){
    const btn = $('buffBtn'), pop = $('buffPop');
    if (!btn || !pop) return;
    pop.innerHTML = this.buffPopHtml();
    pop.classList.remove('hidden');
    // 贴着图标下沿、右对齐；宽度与高度都按视口收一下，窄屏不至于顶到边
    const r = (btn.getBoundingClientRect ? btn.getBoundingClientRect() : { bottom:0, right:0 });
    const vw = window.innerWidth || 360, vh = window.innerHeight || 640;
    pop.style.width = Math.min(300, Math.max(240, vw - 20)) + 'px';
    pop.style.right = Math.max(10, vw - r.right) + 'px';
    pop.style.top = Math.round(r.bottom + 8) + 'px';
    pop.style.maxHeight = Math.max(160, vh - r.bottom - 24) + 'px';
    btn.classList.add('on');
    if (btn.setAttribute) btn.setAttribute('aria-expanded', 'true');
  },
  closeBuffPop(){
    const btn = $('buffBtn'), pop = $('buffPop');
    if (pop) pop.classList.add('hidden');
    if (btn){ if (btn.setAttribute) btn.setAttribute('aria-expanded', 'false'); btn.classList.toggle('on', this.buffSummary().count > 0); }
  },
  toggleBuffPop(){
    const pop = $('buffPop');
    if (pop && !pop.classList.contains('hidden')) this.closeBuffPop();
    else this.openBuffPop();
  },

  // ---------- 顶栏 / 状态栏 ----------
  renderTopbar(){
    const set = (id, v)=>{
      const e = $(id); if (!e) return;
      const s = String(v);
      if (e.textContent === s) return;      // 未变则不打扰
      e.textContent = s;
      if (e.classList){
        e.classList.remove('bump');
        void e.offsetWidth;                 // 重排以重启高亮
        e.classList.add('bump');
        if (typeof clearTimeout === 'function') clearTimeout(e._bumpT);
        if (typeof setTimeout === 'function') e._bumpT = setTimeout(()=>e.classList.remove('bump'), 520);
      }
    };
    set('shellCount', fmt(Game.shells));
    set('totalLevel', totalSkillLevel());
    const recTotal = Object.keys(CODEX).length, recDone = recordedCount();
    set('recordCount', `${recDone} / ${recTotal}`);
    // 「已录」下的细进度线：让 0/632 这种数字有一个可感知的比例
    const meter = $('recordMeter');
    if (meter) meter.style.width = (recTotal ? Math.min(100, recDone / recTotal * 100) : 0).toFixed(1) + '%';
    // 自定义昵称（未设置时隐藏，不占顶栏空间）
    const nt = $('nickTag');
    if (nt){
      const nn = (Game.nickname || '').trim();
      nt.textContent = nn;
      nt.classList.toggle('hidden', !nn);
    }
    // 增益图标处于书脊最右：这里只更新计数与明暗，内容在点开浮层时才生成。
    this.renderBuffBtn();
  },
};

// ---------- 设置（独立页签，不弹窗） ----------
// 早先是 modal；设置项一多，弹窗滚动局促，且每改一项都要「关掉再开」刷新选中态。
// 现在做成与其余功能并列的一页：改任何开关就地重绘本页，顶栏/侧栏状态照常。
UI.renderSettings = function(){
  const c = $('content');
  if (!c) return;
  const opts = ['full','light','off'].map(v=>
    `<button class="btn ${Prefs.fxLevel===v?'on':''}" onclick="setFx('${v}')">${{full:'完整',light:'精简',off:'关闭'}[v]}</button>`).join('');
  const onoff = (pref, label, extra) =>
    `<div class="form-row"><span>${label}</span>
      <button class="btn ${pref?'on':''}" onclick="Prefs.${extra.pref}=${extra.expr};saveGame();UI.renderSettings()${extra.after||''}">${pref?'开':'关'}</button></div>`;
  c.innerHTML = `
  <div class="panel settings-panel">
    <h3>设置</h3>
    <p class="hint">改动作即存（每 5 秒自动写入本地存档）；存档的导出 / 导入 / 重置在「统计」页。</p>
    <div class="set-grid">
      <div>
        <section class="set-sec">
          <h4>外观</h4>
          <div class="form-row"><span>昼夜</span><span class="btn-group">
            <button class="btn ${this.theme!=='night'?'on':''}" onclick="setTheme('day')">${typeof markIcon==='function'?markIcon('sun',15):'☀'} 白昼</button>
            <button class="btn ${this.theme==='night'?'on':''}" onclick="setTheme('night')">${typeof markIcon==='function'?markIcon('moon',15):'☾'} 黑夜</button>
          </span></div>
          <div class="form-row"><span>动效强度</span><span class="btn-group">${opts}</span></div>
          <div class="form-row"><span>常驻指引条</span>
            <button class="btn ${Prefs.hideHint?'':'on'}" onclick="Prefs.hideHint=!Prefs.hideHint;saveGame();UI.renderSettings();UI.refreshActivity()">${Prefs.hideHint?'关':'开'}</button></div>
        </section>
        <section class="set-sec">
          <h4>偏好</h4>
          <div class="form-row"><span>游戏昵称</span>
            <input type="text" id="nickInput" maxlength="12" value="${esc(Game.nickname||'')}" placeholder="未设置（最多 12 字）">
            <button class="btn" onclick="saveNickname()">保存</button></div>
          <div class="form-row"><span>自动进食</span>
            <input type="range" min="10" max="80" value="${Math.round(Prefs.autoEat*100)}" oninput="Prefs.autoEat=this.value/100" onchange="saveGame()">
            <b>${Math.round(Prefs.autoEat*100)}%</b></div>
          ${onoff(Prefs.autoRevive, '战败自动复讨', {pref:'autoRevive', expr:'!Prefs.autoRevive'})}
          ${onoff(Prefs.autoEquip, '自动装备更优', {pref:'autoEquip', expr:'!Prefs.autoEquip'})}
          ${onoff(Prefs.idleFallback!==false, '闲置兜底', {pref:'idleFallback', expr:'Prefs.idleFallback===false'})}
        </section>
      </div>
      <div>
        <section class="set-sec">
          <h4>指引</h4>
          <div class="form-row"><span>新手指引</span>
            <button class="btn" onclick="showTutorial()">重看指引</button>
            <span class="hint">六步：舆地 → 技能 → 征伐 → 行装 → 行动 → 统计</span></div>
          <div class="form-row"><span>玩法说明</span>
            <button class="btn" onclick="openHelp()">查看说明</button>
            <span class="hint">著录阶位 / 御使 / 五行 / 征兆 / 祠祀 / 离线</span></div>
        </section>
        <section class="set-sec">
          <h4>存档</h4>
          <div class="form-row"><span>自动存档</span><b>每 5 秒</b><span class="hint">写入浏览器本地</span></div>
          <div class="form-row"><span>存档格式</span><b>v${typeof SaveManager!=='undefined'?SaveManager.version:3}</b>
            <span class="hint">旧档自动升级，无需手动处理</span></div>
          <div class="form-row"><span>导出 / 导入 / 重置</span>
            <span class="hint">在「统计」页</span></div>
          <p class="hint">进度仅存本机。多设备同步将由账号系统统一提供——存档结构（版本号 / 修订号 / 时间戳）与合并规则已为此预留，届时登录即可续玩，无需另填服务器。</p>
        </section>
        <section class="set-sec">
          <h4>快捷键</h4>
          <div class="form-row"><span>切页</span><b>1–9</b><span class="hint">按侧栏顺序</span></div>
          <div class="form-row"><span>立即存档</span><b>S</b></div>
          <div class="form-row"><span>停止行动</span><b>Q</b></div>
          <div class="form-row"><span>关闭弹层</span><b>Esc</b></div>
        </section>
      </div>
    </div>
  </div>`;
};

function openSettings(){ UI.switchTab('settings'); }
function setFx(v){ Prefs.fxLevel = v; saveGame(); openSettings(); }
// 昼夜切换（设置内两态按钮）：带一次柔和过渡，与旧顶栏按钮同一套动画
function setTheme(t){
  const de = document.documentElement;
  de.classList.add('theme-anim');
  UI.applyTheme(t, true);
  setTimeout(()=>de.classList.remove('theme-anim'), 340);
  openSettings();                     // 重开弹窗，刷新按钮选中态
}
window.setFx = setFx; window.openSettings = openSettings; window.setTheme = setTheme;

// ---------- 游戏昵称 ----------
function saveNickname(){
  const el = $('nickInput');
  const v = el ? String(el.value || '').trim().slice(0, 12) : '';
  Game.nickname = v;
  saveGame();
  UI.renderTopbar();
  UI.toast(v ? `✍️ 昵称已设为「${v}」` : '昵称已清除');
  openSettings();
}
window.saveNickname = saveNickname;

// ---------- 玩法说明 ----------
function openHelp(){
  UI.modal(`
    <h3>📜 玩法说明</h3>
    <div class="help-body">
      <div class="help-sec"><b>著录与阶位</b><p class="hint">采集、讨伐、渔、采药等行动会积累「著录」。每种物产分五阶：初见 → 识名 → 明性 → 通形 → 得御。著录越深，产出越丰，亦解锁更高「舆地」等级的山川。</p></div>
      <div class="help-sec"><b>御使异兽</b><p class="hint">异兽著录至「通形」即可在「御使」入槽，化作被动增益与自动作业（如自动樵采、渔猎）；著录至「得御」为最高阶。</p></div>
      <div class="help-sec"><b>五行相克</b><p class="hint">兵器与异兽分属金木水火土。相克 ×1.35、被克 ×0.75、同属 ×1.00、相生 ×1.15。相克：金克木、木克土、土克水、水克火、火克金；相生：金生水、水生木、木生火、火生土、土生金。装备相克属性的兵器可压制目标。</p></div>
      <div class="help-sec"><b>征兆</b><p class="hint">首次著录异兽可能触发吉凶之兆（如「其邑大水」「有大兵」），影响区域或全局产出。部分物品可免疫对应征兆（如「佩之不惑」之符、「御兵」之兽）。</p></div>
      <div class="help-sec"><b>祠祀 · 卜筮</b><p class="hint">谒见山神献祭以增益区域产出；卜筮可问吉凶、抉择事件走向。</p></div>
      <div class="help-sec"><b>商旅 · 观象 · 圃艺</b><p class="hint">以贝币买卖物品、低买高卖；观象提升离线上限（基础 12 小时，每处观象 +1 小时、仓廪 +2 小时）与离线效率；圃艺种植收成。</p></div>
      <div class="help-sec"><b>离线收益</b><p class="hint">离开页面仍按离线时长结算（效率随「观象」等提升，封顶约 0.85）。离山较久归来会弹出「离线归来」汇总。</p></div>
      <div class="help-sec"><b>存档</b><p class="hint">游戏每 5 秒自动存档在本机浏览器；「统计」页可导出 / 导入 / 重置存档。想在多设备间续玩，可在「设置 → 存档」填入云端存档服务器地址：停止操作约 3 秒自动上传，离开页面时强传一次；拉取时与本地进度按规则合并（经验 / 著录取大，地图 / 背包并集，贝币取较新），不丢进度。</p></div>
      <div class="help-sec"><b>快捷键</b><p class="hint">1–9 切页 · S 存档 · Q 停止当前行动 · Esc 关闭弹窗。</p></div>
    </div>
    <div class="modal-btns"><button class="btn on" onclick="UI.closeModal()">知道了</button></div>
  `);
}
window.openHelp = openHelp;

// ---------- 新手指引（首次进入自动播放，可从设置重看） ----------
const TUT_KEY = 'shj_tut_done_v1';
const TUT_STEPS = [
  { tab:'yudi',   icon:'🗺️', title:'受命著录',
    body:`你是一名<b>著录者</b>，奉命巡行山海，把山川万物逐条录于竹简。\n游戏进度，即一部正在写成的《山海经》。\n\n先从「舆地」开始——选择山系、点选某座山，再点其中任一动作（采集 / 观象 / 讨伐 / 祠礼），即动身前往此地。` },
  { tab:'skills', icon:'📜', title:'技艺修行',
    body:`采集、制作、讨伐、御使……共 <b>26 门技艺</b>，行动即长经验（九阶八十一）。\n技能越高，产出越丰，亦能解锁更高「舆地」等级的山川。\n切到「技能」可查看每一门技艺的进度。` },
  { tab:'taofa',  icon:'⚔️', title:'往讨异兽',
    body:`前往有异兽记载的山，点「往讨」。\n首次著录即触发<b>征兆</b>吉凶；著录至<b>得御</b>阶，便可在「御使」中使役该异兽，化作被动增益与自动作业。` },
  { tab:'pack',   icon:'🎒', title:'行装器物',
    body:`采集与讨伐所得皆入<b>行装</b>。\n装备兵器（五行相克：金克木、木克土……）、佩带饰物、服用丹药。\n点物品可查看它的原文句式——「食之X」「佩之X」「可以X」。` },
  { tab:'queue',  icon:'🧭', title:'巡历挂机',
    body:`这是挂机核心。在「行动」编排<b>巡历队列</b>与<b>兜底任务</b>，离开页面也能自动推进。\n归来时按离线时长结算收益；离线上限随「观象」「仓廪」提升（最高 15 小时）。` },
  { icon:'📊', title:'祠祀与统计',
    body:`你还可祠祀山神（增益区域产出）、营造市廛、卜筮吉凶、观象提升离线上限。\n进度<b>自动存档于本机</b>；在「统计」页可导出 / 导入存档。\n\n祝著录顺利，山海自有回响。` },
];
// 教程步骤的标记：取该步对应页签的意象，避免各平台 emoji 差异
const TUT_MARKS = { yudi:'compass', skills:'lamp', taofa:'warn', pack:'scale', queue:'bolt' };
function tutMark(s){
  return TUT_MARKS[s && s.tab] || 'lamp';
}
let _tutIdx = 0;
function showTutorial(){
  _tutIdx = 0;
  renderTutStep();
}
function renderTutStep(){
  const s = TUT_STEPS[_tutIdx];
  if (s.tab) UI.switchTab(s.tab);
  const first = _tutIdx === 0;
  const last = _tutIdx === TUT_STEPS.length - 1;
  const dots = TUT_STEPS.map((_,i)=>`<span class="tut-dot ${i===_tutIdx?'on':''} ${i<_tutIdx?'done':''}"></span>`).join('');
  UI.modal(`
    <div class="tut-card">
      <div class="tut-head"><span class="mi-ic">${typeof markIcon==='function'?markIcon(tutMark(s),17):(s.icon||'📜')}</span> <b>${s.title}</b></div>
      <div class="tut-body">${s.body.replace(/\n/g,'<br>')}</div>
      <div class="tut-dots">${dots}</div>
      <div class="modal-btns tut-btns">
        ${first?'':'<button class="btn" onclick="tutPrev()">上一步</button>'}
        ${last
          ? `<button class="btn on" onclick="tutFinish()">开始著录</button>`
          : `<button class="btn on" onclick="tutNext()">下一步</button>`}
        <button class="btn" onclick="tutSkip()">跳过</button>
      </div>
    </div>`);
}
function tutNext(){ if (_tutIdx < TUT_STEPS.length-1){ _tutIdx++; renderTutStep(); } }
function tutPrev(){ if (_tutIdx > 0){ _tutIdx--; renderTutStep(); } }
function tutSkip(){ tutFinish(); }
function tutFinish(){
  try { localStorage.setItem(TUT_KEY, '1'); } catch(e){}
  UI.closeModal();
  UI.toast('📜 著录之旅，启程！');
}
window.showTutorial = showTutorial; window.tutNext = tutNext; window.tutPrev = tutPrev;
window.tutSkip = tutSkip; window.tutFinish = tutFinish;

// ---------- 通用渲染片段 ----------
function skillLevelTag(skillId){
  const lv = levelOf(skillId);
  return `<span class="tier">${TUNING.TIER_NAMES[tierOfLevel(lv)]}</span> <b>${lv}</b>`;
}
// 提示条标记：按提示类型取意象，原先各用不同 emoji，此处统一到标记族
const HINT_MARKS = { yudi:'compass', yushi:'lamp', queue:'bolt' };
function hintMark(h){
  if (!h) return 'lamp';
  return HINT_MARKS[h.tab] || 'lamp';
}
function xpBar(skillId){
  const sk = Game.skills[skillId];
  const cur = xpForLevel(sk.level);
  const next = xpForLevel(sk.level + 1);
  const pct = next > cur ? Math.min(100, (sk.xp - cur) / (next - cur) * 100) : 100;
  return `<div class="xpbar"><div class="fill" style="width:${pct.toFixed(1)}%"></div></div>
    <div class="xpnum">${fmt(sk.xp - cur)} / ${fmt(next - cur)}</div>`;
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
    const wBase = w ? enhanceScaled(w.dmg || 0, enhanceLevel(w.id || w)) : 0;
    const qDmg = (style === 'ranged' && q) ? (q.dmg || 0) : 0;
    const skillDmg = statLv * 1.2;
    const rows = [];
    rows.push({ label: w ? `兵器 · ${w.name}` : '徒手',
      value: w ? fmt(Math.round(wBase)) : '0',
      note: w ? (enhanceLevel(w.id || w) ? `含淬炼 +${enhanceLevel(w.id || w)}（${w.dmg} 基础）` : `未淬炼（${w.dmg} 基础）`) : '无兵器' });
    if (qDmg) rows.push({ label:`副手 · ${q.name}`, value:'+' + Math.round(qDmg), note:'射术另计' });
    rows.push({ label:`${styleName} · ${statLv} 级`, value:'+' + skillDmg.toFixed(0), note:'每级 +1.2' });
    if (af.dmgPct) rows.push({ label:'词条 · 锋', value:`+${af.dmgPct}%`, note:'伤害乘区' });
    const mm = dmgMult();
    if (Math.abs(mm - 1) > 0.001) rows.push({ label:'成就 · 御使 · 药', value:`×${mm.toFixed(2)}`, note:'合计伤害增幅' });
    if (beast){
      const m = wuxingMult(playerElement(), beast.el);
      if (Math.abs(m - 1) > 0.001){
        const boost = af.elBoost ? `（含「引」+${af.elBoost}%）` : '';
        rows.push({ label:`五行 · ${playerElement()} 克 ${beast.el}`, value:`×${(1 + (m - 1) * (1 + af.elBoost / 100)).toFixed(2)}`, note:m > 1 ? '克制' + boost : '被克' + boost });
      }
      if (style === 'zhu' && wuxingSheng(playerElement(), beast.el)) rows.push({ label:'祝术 · 相生', value:`×${TUNING.WUXING.SHENG}`, note:'相生目标额外加成' });
    }
    const r = playerDamageRange();
    return { title:'攻击 · 构成', total:`${r.lo}–${r.hi}`, rows,
      foot:'区间为「均值 ×0.6 ~ ×1.4」的浮动。暴击、连击加成在战斗中另计，不体现在此处。' };
  }

  if (key === 'def'){
    const aBase = a ? enhanceScaled(a.def || 0, enhanceLevel(a.id || a)) : 0;
    const rows = [];
    rows.push({ label: a ? `甲胄 · ${a.name}` : '无甲', value: a ? Math.round(aBase).toString() : '0',
      note: a ? (enhanceLevel(a.id || a) ? `含淬炼 +${enhanceLevel(a.id || a)}` : `未淬炼（${a.def} 基础）`) : '赤身应战' });
    rows.push({ label:`明 · ${ming} 级`, value:'+' + (ming * 0.2).toFixed(1), note:'每级 +0.2' });
    const buffDef = (Game.buff && Game.buff.def && (Game.buff.def.def || 0)) || 0;
    const gearDef = db.def + ((ch && ch.defBonus) || 0) + buffDef;
    if (gearDef) rows.push({ label:'御使 · 玉符 · 药', value:'+' + gearDef.toFixed(1), note:'定值防御' });
    if (af.def) rows.push({ label:'词条 · 固', value:'+' + af.def, note:'定值防御' });
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
      <span class="pl-xp">二十六技合计 · 满级 ${max}</span>
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
    for (let i = 0; i < TUNING.FARM_PLOTS; i++) if (!Game.farms['p'+i]) empty.push(i);
    if (empty.length){
      const lv = levelOf('puyi');
      const hasSeed = Object.values(Items).some(s=>s.crop && (s.lvl||1)<=lv && (Game.inventory[s.id]||0)>0);
      if (hasSeed) out.push({ label:`一键种满 ${empty.length} 块空田`, act:'UI.plantAll()' });
    }
    const r = Recipes.find(x=>canAfford(x.cost) && levelOf(mapRecipeSkill(x.type)) >= x.lvl);
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
    if (rite) out.push({ label:`行祭「${(Items[rite[0]]||{}).name||'祠礼'}」（产出 +30% 一时）`, act:`UI.tryRite('${rite[0]}')` });
    const xiong = Game.omens.some(o=>OMENS[o.id] && OMENS[o.id].polarity === '凶');
    if (xiong) out.push({ label:'禳解当前凶兆', tab:'jisi' });
  }
  if (tab === 'pack'){
    const p = (typeof bulkSellPreview === 'function') ? bulkSellPreview(UI.packSellTier || 'COMMON') : null;
    if (p && p.count > 0) out.push({ label:`清整售出 ${p.count} 件（约 ${fmt(p.total)} 贝）`, act:'bulkSellRun()' });
    const better = Object.values(Items).some(it=>it.equip && (Game.inventory[it.id]||0) > 0 && (it.lvl||1) <= relevantLevel(it));
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
    <span class="pl-xp">${maxed ? '已至九九' : `经验 ${fmt(got)} / ${fmt(need)}`}</span>
  </div>`;
}

// ================= 舆地 =================
// 节点著录进度：统计该节点可著录的物产/异兽中已著录数量
function nodeRecordProgress(nodeId){
  let total = 0, done = 0;
  for (const it of Object.values(Items)) if (it.node === nodeId){ total++; if ((Game.records[it.id]||{}).count > 0) done++; }
  for (const m of Object.values(Monsters)) if (m.nodeId === nodeId){ total++; if ((Game.records[m.id]||{}).count > 0) done++; }
  return { done, total };
}
// 持续指引：根据当前进度给出最贴心的下一步建议
function nextHint(){
  const recCount = Object.keys(Game.records).length;
  if (recCount === 0)
    return { icon:'🧭', tab:'yudi', text:'先从「舆地」选山，点其中一项采集或讨伐即动身前往，开启著录。' };
  // 已可御使却尚未入槽的异兽
  const ready = (typeof deployableBeasts === 'function' ? deployableBeasts() : [])
    .find(m=>!Object.values(Game.deployed).includes(m.id));
  if (ready)
    return { icon:'🐾', tab:'yushi', text:`「${ready.name}」已著录至「通形」，可往「御使」入槽，得被动增益与自动作业。` };
  // 新解锁却尚未涉足的山系
  const fresh = (WORLD && WORLD.regions || []).find(r=>regionUnlocked(r) && r.nodes.length > 0 && r.nodes.every(n=>!Game.map[n.id]));
  if (fresh)
    return { icon:'🗺️', tab:'yudi', text:`新山系「${fresh.regionName}」已解锁，前往探索可得新物产与异兽。` };
  // 接近阶位突破（任一著录距下一阶不足 5 次）
  let nearTier = null, remain = 0;
  for (const id in Game.records){
    const t = Game.records[id];
    const thr = [1,10,25,50,100];
    const next = thr[t.tier+1];
    if (next && t.count > 0 && next - t.count > 0 && next - t.count <= 5){ nearTier = id; remain = next - t.count; break; }
  }
  if (nearTier && Items[nearTier]){
    return { icon:'✒️', tab:'queue', text:`再著录 ${remain} 次，「${Items[nearTier].name}」即可突破至下一阶（产出加成提升）。` };
  }
  return { icon:'✒️', tab:'queue', text:'编排「行动」巡历队列与兜底任务，离线亦自动推进；归来可见「离线归来」汇总。' };
}

// 推荐前往的节点：可御使异兽所在（御）/ 已解锁未涉足（荐）
function recommendedNodes(){
  const map = {};
  (typeof deployableBeasts === 'function' ? deployableBeasts() : [])
    .filter(m=>!Object.values(Game.deployed).includes(m.id) && m.nodeId)
    .forEach(m=>{ map[m.nodeId] = 'tame'; });
  (WORLD && WORLD.regions || []).forEach(r=>{
    if (!regionUnlocked(r)) return;
    r.nodes.forEach(n=>{ if (!Game.map[n.id] && !map[n.id]) map[n.id] = 'explore'; });
  });
  return map;
}

// 山志异兽小签。记录对象必须按「同节点」定位：同名异兽分处两经（北山肥遗 ≠ 西山
// 肥遗），只按名字找会把别处的著录数借过来。神祇的记录走谒见（deity id）。
// 三者皆无时按性质标注：祥瑞（观瑞可见、不可讨伐）/ 渔获 / 仅载其名（原文有名而本作未设实体）。
UI.faunaChipHtml = function(sel, f){
  const m = Object.values(Monsters).find(x=>x.nodeId===sel.id && (x.faunaName||x.name)===f.name);
  let rid = m && m.id;
  if (!rid){
    const site = (typeof AUDIENCE_SITES!=='undefined') && AUDIENCE_SITES[sel.id];
    const d = site && (site.deities||[]).find(x=>x.name===f.name || '（'+x.name+'）'===f.name);
    if (d) rid = d.id;
  }
  if (!rid){
    const any = Object.values(Monsters).find(x=>x.name===f.name);   // 祥瑞等跨节点同名
    if (any) rid = any.id;
  }
  const rec = rid ? (Game.records[rid]||{count:0}) : null;
  let tag;
  if (rec){
    tag = `<i class="${rec.count>0?'rec-ok':'rec-no'}">${rec.count>0?'录 '+rec.count:'未录'}</i>`;
  } else {
    const fm = (typeof FAUNA_META !== 'undefined') && FAUNA_META[f.name];
    const hint = fm && fm.pacifist ? '祥瑞' : fm && fm.fishOnly ? '渔获' : '仅载其名';
    tag = `<i class="rec-none">${hint}</i>`;
  }
  // 异兽小签头：绘形图标（手绘特型 → form 解析 → 分类兜底），与讨伐页同一套语言
  const ic = (typeof beastIcon === 'function')
    ? beastIcon({ id: rid || '', name: f.name, el: (rid && Monsters[rid] && Monsters[rid].el) || ((typeof FAUNA_META!=='undefined' && FAUNA_META[f.name])||{}).el })
    : (CAT_EMOJI[f.category]||'🐾');
  return `<span class="fauna-chip ${rec && rec.count>0 ? 'seen':''}"${f.effect?` title="${esc(f.effect)}"`:''}><span class="fc-ic">${ic}</span>${esc(f.name)}${tag}</span>`;
};

UI.renderYudi = function(){
  const box = $('content');
  if (!box) return;
  const regions = WORLD.regions;
  const region = regions.find(r=>r.regionId === this.selRegion) || regions[0];
  const unlocked = regionUnlocked(region);
  const nodes = region.nodes;
  const sel = this.selNode && nodes.find(n=>n.id === this.selNode) ? nodes.find(n=>n.id === this.selNode) : nodes[0];
  const here = Game.node === (sel && sel.id);
  const h = nextHint();
  const recNodes = recommendedNodes();

  // 指引条只控制自身显隐，地图/山系/节点/详情必须始终渲染（曾因三元表达式包住整页导致关闭指引条后界面全空）
  let html = ((typeof Prefs !== 'undefined' && Prefs.hideHint) ? '' :
    `<div class="hint-banner"><span class="mi-ic">${typeof markIcon==='function'?markIcon(hintMark(h),15):h.icon}</span> <span>${esc(h.text)}</span><button class="hint-close" title="关闭指引条（设置中可重开）" onclick="UI.dismissHint()">✕</button></div>`)
    + `<div class="map-wrap">
    <div class="panel regions">
      <h3>山系</h3>
      <button type="button" class="locked-toggle" title="展开/收起尚未解锁的山系" onclick="document.body.classList.toggle('show-locked');this.classList.toggle('on')">${typeof markIcon==='function'?markIcon('lock',14):'🔒'} 未解锁山系 ${CHAPTERS.filter(ch=>!regions.filter(r=>ch.regionIds.includes(r.regionId)).some(r=>regionUnlocked(r))).length} 章</button>
      <div class="region-scroll">
      ${CHAPTERS.map(ch=>{
        const chRegions = regions.filter(r=>ch.regionIds.includes(r.regionId));
        const chUnlocked = chRegions.some(r=>regionUnlocked(r));
        return `<div class="chapter-block ${chUnlocked?'':'ch-locked'}">
          <div class="chapter-head ${chUnlocked?'':'lock'}"><b>${esc(ch.name)}</b><span>${esc(ch.sub)}</span></div>
          <div class="tile-grid region-grid">
          ${chRegions.map(r=>{
            const un = regionUnlocked(r);
            const done = r.nodes.filter(n=>Game.map[n.id]).length;
            const full = r.nodes.length > 0 && done >= r.nodes.length;
            // 中山经十二系已于 v1.13 全录，此分支现仅在数据缺失时兜底（空山系不按进度渲染）
            const todo = r.nodes.length > 0;
            // 方块：山系名 + 涉山进度；未解锁只留一把锁与所需等级
            return `<div class="tile region-tile ${r.regionId===this.selRegion?'on':''} ${un?'':'lock'} ${full?'full':''}"
                title="${esc(r.regionName)}${un ? (todo ? ` · 已涉 ${done}/${r.nodes.length} 山` : ' · 原文已备，诸山待补录') : ` · 需舆地 ${r.unlockLevel} 级`}"
                onclick="UI.selRegion='${r.regionId}';UI.selNode=null;UI.renderYudi()">
              <span class="rg-name">${esc(r.regionName)}</span>
              <span class="rg-sub">${un ? (todo ? `${done}/${r.nodes.length} 山` : '待补录') : `${typeof markIcon==='function'?markIcon('lock',13):'🔒'} ${r.unlockLevel} 级`}</span>
              ${un && todo && done > 0 ? `<span class="rg-bar"><i style="width:${(done/r.nodes.length*100).toFixed(0)}%"></i></span>` : ''}
            </div>`;
          }).join('')}
          </div>
        </div>`;
      }).join('')}
      </div>
      <div class="region-summary">${unlocked ? esc(region.summary||'') : `${typeof markIcon==='function'?markIcon('lock',13):'🔒'} 尚未解锁此山系`}</div>
    </div>
    <div class="panel nodes">
      <h3>${esc(region.regionName)} · 诸山</h3>
      <div class="node-list">
      <div class="tile-grid node-grid">
      ${nodes.length ? '' : '<div class="empty-tip">此山系原文已备（祠礼与山神已入祠典），诸山名录待逐系补录。</div>'}
      ${nodes.map(n=>{
        const un = nodeUnlocked(n);
        const visited = !!Game.map[n.id];
        const cur = Game.node === n.id;
        const reason = recNodes[n.id];
        const rp = nodeRecordProgress(n.id);
        const done = rp.total > 0 && rp.done === rp.total;
        // 方块：山名 + 著录进度；角上挂「在 / 御 / 荐 / ⚠」
        return `<div class="tile node-tile ${this.selNode===n.id?'on':''} ${un?'':'lock'} ${cur?'here':''} ${reason?'rec '+reason:''}"
             title="${esc(n.name)}${rp.total?` · 已著录 ${rp.done}/${rp.total} 种`:''}${!un?' · '+esc(nodeLockReason(n)):''}"
             onclick="UI.selNode='${n.id}';UI.renderYudi()">
          ${n.hazard?`<span class="nt-haz" title="${esc(n.hazard.detail||n.hazard.type)}">${typeof markIcon==='function'?markIcon('warn',15):'⚠'}</span>`:''}
          ${cur?'<span class="nt-mark here">在</span>'
            : reason==='tame'?'<span class="nt-mark tame" title="可御使的异兽在此">御</span>'
            : reason==='explore'?'<span class="nt-mark" title="尚未涉足，可前往探索">荐</span>':''}
          <span class="nt-name">${visited?'<i>✓</i>':''}${esc(n.name)}</span>
          <span class="nt-tag ${done?'done':''}">${rp.total>0?`录 ${rp.done}/${rp.total}`:(un?`Lv ${n.unlockLevel}`:`需 ${n.unlockLevel}`)}</span>
        </div>`;
      }).join('')}
      </div>
      </div>
    </div>
    <div class="panel node-detail">
    ${sel ? (()=>{
    const un = nodeUnlocked(sel);
    const rp = nodeRecordProgress(sel.id);
    // 产出：原文「其木多 X / 其阳多玉」，按类换行，标签左对齐
    const yieldRows = (function(){
      const rows = [];
      Object.entries(sel.yields||{}).forEach(([k,v])=>{
        if (k === 'unknown' || k === 'special') return;
        const list = Array.isArray(v) ? v : [];
        if (!list.length) return;
        const chips = list.map(x=> typeof x === 'string' ? esc(x) : esc(x.name)+(x.effect?`<i>${esc(x.effect)}</i>`:'')).join('、');
        const label = { wood:'其木', mineral:'金玉', herb:'灵草', water:'水族', beast:'兽', woodSpecial:'灵木' }[k]||k;
        rows.push(`<div><b>${label}</b>${chips}</div>`);
      });
      if (sel.yields && sel.yields.special) rows.push(`<div><b>异</b>${sel.yields.special.map(x=>esc(x)).join('、')}</div>`);
      if (sel.yields && sel.yields.unknown) rows.push(`<div><b>怪</b>${sel.yields.unknown.map(x=>esc(x)).join('、')}</div>`);
      return rows.length ? `<div class="yield-rows">${rows.join('')}</div>` : '<span class="hint">无所载</span>';
    })();
    // 异兽：带著录状态的小签，已录的转朱色，未录的留白
    // ⚠️ 取记录必须按「同节点」定位：同名异兽分处两经（北山肥遗 ≠ 西山肥遗），
    // 只按名字找会把别处的著录数借过来。神祇的记录走谒见（deity id），
    // 二者都没有的（原文有名、本作未设实体）标「仅载其名」，免得玩家以为漏了内容。
    const faunaRows = (sel.fauna||[]).length
      ? `<div class="fauna">${sel.fauna.map(f=>UI.faunaChipHtml(sel, f)).join('')}</div>`
      : '<span class="hint">此地无异兽记载</span>';
    // 山志全文：悬停 / 点按「山志」展开，含山川、注解、神话等长文
    const shanZhi = `<div class="nd-sec"><b>山川</b>${esc(sel.chapter||'')} · 需舆地 ${sel.unlockLevel}${sel.hazard?` · <span class="haz-text">${esc(sel.hazard.detail||sel.hazard.type)}</span>`:''}${sel.terrain?`<br>${esc(sel.terrain)}`:''}</div>
      <div class="nd-sec"><b>产出</b>${yieldRows}</div>
      <div class="nd-sec"><b>异兽</b>${faunaRows}</div>
      ${specialNodeNote(sel)||''}
      ${sel.source?`<div class="nd-sec"><b>原文</b>${esc(sel.source)}</div>`:''}
      ${sel.note?`<div class="nd-sec"><b>注解</b>※ ${esc(sel.note)}</div>`:''}
      ${nodeMythBlock(sel)||''}`;
    return `<div class="nd-head">
        <h3>${esc(sel.name)} ${here?'<span class="here-tag">在此</span>':''}</h3>
        <button class="btn-mini nd-info" type="button" data-tip data-tip-title="${esc(sel.name)} · 山志">山志全篇<span class="tip-body hidden">${shanZhi}</span></button>
      </div>
      <div class="meta">${esc(sel.chapter||'')} · 需舆地 ${sel.unlockLevel}${sel.hazard?` · <span class="haz-text">${esc(sel.hazard.detail||sel.hazard.type)}</span>`:''}</div>
      ${!un?`<div class="lock-note">${typeof markIcon==='function'?markIcon('lock',13):'🔒'} ${esc(nodeLockReason(sel))}</div>`:''}
      ${rp.total>0?`<div class="node-prog">已著录 <b>${rp.done}</b>/${rp.total} 种<span class="prog-line"><i style="width:${(rp.total?rp.done/rp.total*100:0).toFixed(0)}%"></i></span>${rp.done===rp.total?'<em>此山录毕</em>':''}</div>`:''}
      <div class="actions">
        ${un ? gatherButtonsForNode(sel) : ''}
        ${observeButtonForNode(sel)}
        ${audienceButtonForNode(sel)}
        ${growButtonForNode(sel)}
        ${combatButtonsForNode(sel)}
        ${un && !here && !nodeHasUsableAction(sel) ? `<button class="btn" onclick="travelTo('${sel.id}')">涉足此山</button>` : ''}
      </div>
      <div class="nd-body">
        ${sel.terrain?`<p class="nd-terrain">${esc(sel.terrain)}</p>`:''}
        <div class="nd-sec"><b>产出</b>${yieldRows}</div>
        <div class="nd-sec"><b>异兽</b>${faunaRows}</div>
        ${sel.source?`<blockquote class="quote">${esc(sel.source)}<cite>${esc(sel.chapter||'山海经')}</cite></blockquote>`:''}
        ${sel.note?`<div class="nd-sec note-line"><b>注解</b>${esc(sel.note)}</div>`:''}
        ${specialNodeNote(sel)||''}
        ${nodeMythBlock(sel)||''}
      </div>`;
    })() : ''}
    </div></div>`;
  box.innerHTML = html;
};
// 此山是否有「现在就能点的动作」。
// 前往按钮取消后，动作按钮本身兼管「走一趟」（采集/观象/谒见/灌木/讨伐都会先 travelTo），
// 所以只有当一样都点不了时，才补一枚「涉足此山」——否则那 58 座只载原文的山永远涉不了。
function nodeHasUsableAction(node){
  for (const it of Object.values(Items)){
    if (!it.skill) continue;
    const nodes = it.nodes || (it.node ? [it.node] : []);
    if (nodes.includes(node.id) && levelOf(it.skill) >= it.lvl) return true;
  }
  if (Object.values(OBSERVE_SITES).some(s=>s.nodeId === node.id)) return true;
  if (typeof AUDIENCE_SITES !== 'undefined' && AUDIENCE_SITES[node.id]) return true;
  if (Object.values(GROW_SITES).some(s=>s.nodeId === node.id && canAfford(s.cost))) return true;
  if (Object.values(Monsters).some(m=>m.nodeId === node.id && levelOf('taofa') >= (m.needLvl||1))) return true;
  return false;
}
function gatherButtonsForNode(node){
  const out = [];
  for (const it of Object.values(Items)){
    if (!it.skill) continue;
    const nodes = it.nodes || (it.node ? [it.node] : []);
    if (!nodes.includes(node.id)) continue;
    const lvOk = levelOf(it.skill) >= it.lvl;
    out.push(`<button class="btn ${lvOk?'':'lock'}" ${lvOk?'':'disabled'}
      onclick="startActivity('gather','${it.id}')" title="${esc(it.note||'')}">
      ${typeof skillIcon==='function'?skillIcon(it.skill,17):Skills[it.skill].icon} ${esc(it.name)}<i>${Skills[it.skill].name} ${it.lvl}</i></button>`);
  }
  return out.join('');
}
function observeButtonForNode(node){
  const site = Object.values(OBSERVE_SITES).find(s=>s.nodeId === node.id);
  if (!site) return '';
  const done = !!Game.observed[Object.keys(OBSERVE_SITES).find(k=>OBSERVE_SITES[k].nodeId===node.id)];
  return `<button class="btn ${done?'':'primary'}" onclick="startObserve('${Object.keys(OBSERVE_SITES).find(k=>OBSERVE_SITES[k].nodeId===node.id)}')">
    🌅 ${site.kind}·${esc(site.name)}${done?'（再观）':''}</button>`;
}
function combatButtonsForNode(node){
  const beasts = Object.values(Monsters).filter(m=>m.nodeId === node.id);
  if (!beasts.length) return '';
  return beasts.map(m=>{
    const lvOk = levelOf('taofa') >= (m.needLvl||1);
    return `<button class="btn ${lvOk?'':'lock'}" ${lvOk?'':'disabled'} onclick="startCombat('${m.id}', {focus:true})">
      ${m.boss?(typeof beastIcon==='function'?beastIcon({id:m.id}):'🦹'):(typeof markIcon==='function'?markIcon('bolt',14):'⚔️')} ${esc(m.name)}<i>讨伐 ${m.needLvl||1}</i></button>`;
  }).join('');
}
// 谒见神祇
function audienceButtonForNode(node){
  const site = AUDIENCE_SITES[node.id];
  if (!site) return '';
  const un = nodeUnlocked(node);
  return `<button class="btn ${un?'primary':''}" ${un?'':'disabled'} onclick="startAudience('${node.id}')"
    title="神祇不可讨伐，以谒见入录">🕯️ 谒见 ${esc(site.name)}<i>${site.deities.length} 位神祇</i></button>`;
}
// 峚山 · 玉膏灌丹木
function growButtonForNode(node){
  const site = Object.values(GROW_SITES).find(s=>s.nodeId === node.id);
  if (!site) return '';
  const un = nodeUnlocked(node);
  const st = Game.danmu || { stage:0 };
  const done = (st.stage||0) >= site.stages;
  return `<button class="btn ${un && !done?'primary':''}" ${un && !done?'':'disabled'} onclick="startGrow('${Object.keys(GROW_SITES).find(k=>GROW_SITES[k].nodeId===node.id)}')"
    title="${esc(site.desc)}">🌱 灌木 ${esc(site.name)}<i>${done?'五岁乃成，先取其实':`${st.stage||0}/${site.stages} 岁 · 耗玉膏×1`}</i></button>`;
}
function specialNodeNote(node){
  const sp = SPECIAL_NODES[node.id];
  if (!sp) return '';
  return `<div class="special-note">★ ${esc(sp.note||'')}</div>`;
}
function nodeMythBlock(node){
  if (!node.myth) return '';
  return `<div class="myth-block"><b>神话</b>${esc(node.myth.figure?node.myth.figure+'：':'')}${esc(node.myth.content||'')}</div>`;
}
// 采集技能 → 产出节点（用于技能页一键前往）
function nodeForSkill(skillId){
  const pool = (typeof GATHER_POOLS!=='undefined' && GATHER_POOLS[skillId]) || [];
  for (const iid of pool){
    const it = Items[iid];
    if (it && it.node){
      for (const r of (WORLD.regions||[])){
        const n = (r.nodes||[]).find(nn=>nn.id===it.node);
        if (n) return { nodeId:n.id, regionId:r.regionId };
      }
    }
  }
  return null;
}
// 制作技能 → 所需材料来源节点（取首个有产地的材料）
function materialNodeForSkill(skillId){
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes){
    for (const c of (r.cost||[])){
      const it = Items[c[0]];
      if (it && it.node){
        for (const reg of (WORLD.regions||[])){
          const n = (reg.nodes||[]).find(nn=>nn.id===it.node);
          if (n) return { nodeId:n.id, regionId:reg.regionId, itemName:it.name };
        }
      }
    }
  }
  return null;
}
// 制作技能 → 所有材料来源节点（去重，按节点）
function materialNodesForSkill(skillId){
  const out = [];
  const seen = {};
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes){
    for (const c of (r.cost||[])){
      const it = Items[c[0]];
      if (it && it.node && !seen[it.node]){
        for (const reg of (WORLD.regions||[])){
          const n = (reg.nodes||[]).find(nn=>nn.id===it.node);
          if (n){ seen[it.node] = true; out.push({ nodeId:n.id, regionId:reg.regionId, itemName:it.name, nodeName:n.name }); break; }
        }
      }
    }
  }
  return out;
}
// 制作技能 → 各材料「已持有 / 需求」状态（按最大需求量计）
function materialStatusForSkill(skillId){
  const map = {};
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes) for (const c of (r.cost||[])){
    const need = c[1]||1;
    if (!map[c[0]] || need > map[c[0]].need) map[c[0]] = { id:c[0], name:(Items[c[0]]||{}).name||c[0], need };
  }
  return Object.values(map).map(m=>{ const have = (Game.inv && Game.inv[m.id])||0; return { ...m, have, ok: have>=m.need }; });
}
// 图鉴条目 → 其产出/讨伐节点
function codexNode(e){
  if (!e) return null;
  let nodeId = null;
  if (e.cat === '异兽'){ const m = Monsters[e.id]; if (m) nodeId = m.nodeId; }
  else { const it = Items[e.id]; if (it) nodeId = it.node; }
  if (!nodeId) return null;
  for (const r of (WORLD.regions||[])){
    const n = (r.nodes||[]).find(nn=>nn.id===nodeId);
    if (n) return { nodeId:n.id, regionId:r.regionId };
  }
  return null;
}
// ================= 技能 =================
UI.renderSkills = function(){
  const box = $('content');
  if (!box) return;
  const groups = { all:'全部', gathering:'采集', processing:'制作', combat:'武备', taofa:'征伐', fangguo:'方国', yushi:'驭使' };
  const filter = this.skillFilter;
  let ids = [];
  for (const g in SKILL_GROUPS){
    if (filter === 'all' || filter === g) ids = ids.concat(SKILL_GROUPS[g].ids);
  }
  const cur = Game.activity;
  let html = `<div class="panel stats-bar">
    <span>总等级 <b>${totalSkillLevel()}</b></span>
    <span>最高 <b>${(function(){ let b='',l=0; for(const id in Game.skills) if(Game.skills[id].level>l){l=Game.skills[id].level;b=Skills[id].name;} return b?b+' '+l:'—'; })()}</b></span>
    <span>经验倍率 <b>×${xpMult().toFixed(2)}</b></span>
    <span>采集速度 <b>×${gatherSpeedMult().toFixed(2)}</b></span>
    <span>全局产出 <b>+${Math.round(globalYieldBonus()*100)}%</b></span>
    <span>御使槽 <b>${Object.keys(Game.deployed).length}/${beastSlots()}</b></span>
  </div>
  <div class="filter-row">
    ${Object.entries(groups).map(([k,v])=>`<button class="chip-btn ${filter===k?'on':''}" onclick="UI.skillFilter='${k}';UI.renderSkills()">${v}</button>`).join('')}
  </div>
  <div class="skill-grid">
    ${    ids.map(id=>{
      const sk = Skills[id];
      const active = cur && ((cur.kind==='gather' && cur.skill===id) || (cur.kind==='craft' && mapRecipeSkill(cur.recipe.type)===id));
      const nf = nodeForSkill(id);
      const mns = nf ? null : materialNodesForSkill(id);
      const mst = nf ? null : materialStatusForSkill(id);
      const matBtns = (mns && mns.length) ? `<div class="mat-src">材料来源：${mns.slice(0,3).map(m=>`<button class="btn-mini skill-go" onclick="UI.selRegion='${m.regionId}';UI.selNode='${m.nodeId}';UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${esc(m.nodeName||'')}</button>`).join('')}${mns.length>3?`<span class="hint">等 ${mns.length} 处</span>`:''}</div>` : '';
      const matInv = (mst && mst.length) ? `<div class="mat-inv">${mst.map(m=>`<span class="${m.ok?'ok':'gap'}">${typeof itemIc==='function'?itemIc(m.id,13):''}${esc(m.name)} ${m.have}/${m.need}${m.ok?(typeof markIcon==='function'?markIcon('check',12):'✓'):(typeof markIcon==='function'?markIcon('warn',12):'✗')}</span>`).join(' · ')}</div>` : '';
      // 方块：图标 + 名 + 阶位，右上角等级，底部一条经验进度；
      // 描述 / 产出地 / 材料来源与持有缺口全在浮层（点按即开）
      const lv = levelOf(id);
      const raw = Game.skills[id];
      const xc = xpForLevel(raw.level), xn = xpForLevel(raw.level + 1);
      const pct = xn > xc ? Math.min(100, (raw.xp - xc) / (xn - xc) * 100) : 100;
      return `<div class="tile skill-tile ${active?'active':''}" data-skill="${id}" data-tip data-tip-title="${esc(sk.name)}">
        <span class="sk-lv">${lv}</span>
        <span class="tile-ic bi-ic">${typeof skillIcon==='function'?skillIcon(sk):sk.icon}</span>
        <span class="tile-nm">${esc(sk.name)}</span>
        <span class="tile-tag">${TUNING.TIER_NAMES[tierOfLevel(lv)]}</span>
        <span class="sk-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
        <span class="tip-body hidden">
          <div class="sc-desc">${esc(sk.desc||'')}</div>
          ${nf?`<button class="btn-mini skill-go" onclick="UI.selRegion='${nf.regionId}';UI.selNode='${nf.nodeId}';UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} 产出地</button>`:''}
          ${matBtns}${matInv}
        </span>
      </div>`;
    }).join('')}
  </div>

  <div class="panel recipe-panel">
    <h3>制作配方</h3>
    <div class="filter-row">
      ${Object.entries(ActionKinds).filter(([k,d])=>d.mode==='recipe').map(([k,d])=>
        `<button class="chip-btn ${this.recipeSkill===k?'on':''}" onclick="UI.recipeSkill='${k}';UI.renderSkills()">${typeof skillIcon==='function'?skillIcon(k,15):d.icon} ${d.label}</button>`).join('')}
    </div>
    <div class="tile-grid recipe-grid">
    ${Recipes.filter(r=>r.type===this.recipeSkill).sort((a,b)=>a.lvl-b.lvl).map(r=>{
      const it = Items[r.out];
      const sk = Skills[mapRecipeSkill(r.type)];
      const lvOk = levelOf(mapRecipeSkill(r.type)) >= r.lvl;
      const afford = canAfford(r.cost);
      const can = lvOk && afford;
      return `<div class="tile ${can?'':'lock'}" data-tip data-tip-title="${esc(it?it.name:r.out)}"
        role="button" tabindex="0"
        onclick="${can?`startActivity('craft','${r.type}::${r.out}',{times:1})`:`UI.craftDenied('${r.type}::${r.out}')`}">
        <span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(it):(it?it.icon:'📦')}</span>
        <span class="tile-nm">${esc(it?it.name:r.out)}</span>
        <span class="tile-tag">${sk.name} ${r.lvl}</span>
        ${can?`<button class="tile-more" type="button" title="连作：做到材料用尽"
          onclick="event.stopPropagation();startActivity('craft','${r.type}::${r.out}')">连</button>`:''}
        <span class="tip-body hidden"><div class="rc-cost">${costChips(r.cost)}</div><div class="rc-xp">经验 ${r.xp}</div>${!lvOk?`<div class="hint">需${sk.name} ${r.lvl} 级</div>`:''}</span>
      </div>`;
    }).join('')}
    </div>
  </div>

  <div class="panel farm-panel">
    <h3>圃艺 · 田地<button class="btn small gear-best" type="button" onclick="UI.plantAll()">一键种植</button></h3>
    <div class="tile-grid farm-grid">
    ${farmTilesHtml()}
    </div>
  </div>`;
  box.innerHTML = html;
};

// 田地方块 HTML（整页渲染与就地补绘共用）
function farmTilesHtml(){
  return Array.from({length:TUNING.FARM_PLOTS}, (_,i)=>{
    const slot = 'p'+i;
    const f = Game.farms[slot];
    if (f){
      const seed = Items[f.seedId] || { name:'嘉种', icon:'🌱' };
      const pct = Math.max(0, Math.min(100, (1 - f.remain/f.grow)*100));
      const left = fmtTime(f.remain/Math.max(0.1,farmSpeedMult()));
      // 方块：作物图标 + 名 + 贴底细进度条 + 剩余时间；成熟自动收获
      return `<div class="tile farm-tile growing ${pct>=100?'ripe':''}" data-plot="${slot}" data-tip data-tip-title="${esc(seed.name)}">
        <span class="tile-ic">${pct>=100?'🌾':pct>50?'🌿':'🌱'}</span>
        <span class="tile-nm">${esc(seed.name)}</span>
        <span class="ft-bar"><i style="width:${pct.toFixed(0)}%"></i></span>
        <span class="tile-tag">${left}</span>
        <span class="tip-body hidden">
          <div class="rc-sub">${esc(seed.name)} · 田 ${i+1}</div>
          <div class="rc-sub">${pct>=100?'即将成熟，自动收获':'成长 '+pct.toFixed(0)+'% · 余 '+left}</div>
          <div class="hint">成熟即收，无需看管；偶尔回赠种子</div>
        </span>
      </div>`;
    }
    // 空田：方卡点按开择种浮层（下拉框在方块里既丑又难点）
    return `<div class="tile farm-tile empty" data-plot="${slot}" role="button" tabindex="0" onclick="UI.seedMenu('${slot}')">
      <span class="tile-ic">➕</span>
      <span class="tile-nm">择种</span>
      <span class="tile-tag">田 ${i+1}</span>
    </div>`;
  }).join('');
}

// 择种浮层：方卡点按后列出行囊可用嘉种；未持有 / 未达等级的置灰并说明原因
UI.seedMenu = function(slot){
  const lv = levelOf('puyi');
  const seeds = Object.values(Items).filter(s=>s.crop).sort((a,b)=>(a.lvl||1)-(b.lvl||1));
  if (!seeds.length){ this.toast('此地无嘉种可植'); return; }
  const rows = seeds.map(s=>{
    const have = Game.inventory[s.id]||0;
    const lvOk = lv >= (s.lvl||1);
    const ok = have > 0 && lvOk;
    return `<button type="button" class="seed-row ${ok?'':'lock'}" ${ok?`onclick="UI.pickSeed('${slot}','${s.id}')"`:'disabled'}>
      <span class="sr-ic">${typeof itemIc==='function'?itemIc(s.id,16):(s.icon||'🌱')}</span>
      <span class="sr-nm">${esc(s.name)}</span>
      <span class="sr-meta">${lvOk?`持有 <b>${have}</b>`:`需圃艺 ${s.lvl} 级`}</span>
    </button>`;
  }).join('');
  this.modal(`<h3>择种 · 田 ${parseInt(slot.slice(1))+1}</h3>
    <p class="hint">点选即植入此田，消耗一枚种子；成熟自动收获，偶尔回赠种子。</p>
    <div class="seed-list">${rows}</div>
    <div class="modal-btns"><button class="btn ghost" onclick="UI.closeModal()">再想想</button></div>`);
};
UI.pickSeed = function(slot, id){
  if (plantSeed(slot, id)){ this.closeModal(); this.renderSkills(); }
};
// 一键种植：按「价值优先、圃艺达标、确有存种」把空田依次种满，种到没有可用种子为止。
// 单田仍可点按择种（换种、指定某田）；这里只负责「懒得一格格点」的日常。
UI.plantAll = function(){
  const empty = [];
  for (let i = 0; i < TUNING.FARM_PLOTS; i++) if (!Game.farms['p'+i]) empty.push('p'+i);
  if (!empty.length){ this.toast('田已种满'); return; }
  const lv = levelOf('puyi');
  const pool = Object.values(Items)
    .filter(s=>s.crop && (s.lvl||1) <= lv && (Game.inventory[s.id]||0) > 0)
    .sort((a,b)=>(b.value||0)-(a.value||0));
  if (!pool.length){ this.toast('无可用嘉种：需持有种子且圃艺达标'); return; }
  let n = 0;
  for (const slot of empty){
    const s = pool.find(x=>(Game.inventory[x.id]||0) > 0);
    if (!s) break;
    if (plantSeed(slot, s.id, true)) n++;
  }
  this.renderSkills();
  let soon = Infinity;
  for (const k in Game.farms) soon = Math.min(soon, (Game.farms[k].grow || 0));
  const eta = isFinite(soon) ? `（最早约 ${fmtTime(soon / Math.max(0.1, farmSpeedMult()))} 后熟）` : '';
  this.toast(n ? `🌱 一键植 ${n} 田${eta}` : '未能植入');
};
// 田地就地补绘：收获 / 植入后卡片还显示着旧状态，切页才变是不合理的
UI.patchFarms = function(){
  if (this.currentTab !== 'skills') return;
  const grid = document.querySelector('#content .farm-grid');
  if (grid) grid.innerHTML = farmTilesHtml();
};
// 每秒轻量跟进：只改进度条宽度、剩余时间与成熟态，不重建 DOM（不打断悬停浮层）
UI.patchFarmsProgress = function(){
  if (this.currentTab !== 'skills') return;
  document.querySelectorAll('#content .farm-tile.growing').forEach(el=>{
    const f = Game.farms[el.dataset.plot];
    if (!f) return;                                   // 刚收获的交给 patchFarms 整块重绘
    const pct = Math.max(0, Math.min(100, (1 - f.remain/f.grow)*100));
    const ripe = pct >= 100;
    el.classList.toggle('ripe', ripe);
    const ic = el.querySelector('.tile-ic');
    if (ic) ic.textContent = ripe ? '🌾' : pct > 50 ? '🌿' : '🌱';
    const bar = el.querySelector('.ft-bar i');
    if (bar) bar.style.width = pct.toFixed(0) + '%';
    const tag = el.querySelector('.tile-tag');
    if (tag) tag.textContent = fmtTime(f.remain/Math.max(0.1,farmSpeedMult()));
  });
};
// 征兆就地补绘：有征兆到期 / 新触发时，祠祀页的 active 态、总效应、禳解行要立刻跟上
UI.patchOmens = function(){
  if (this.currentTab !== 'jisi') return;
  const panel = document.querySelector('#content .omen-panel');
  if (!panel) return;
  const keepY = window.scrollY || 0;
  panel.innerHTML = omenPanelHtml();
  if (keepY > 0 && window.scrollTo) window.scrollTo(0, keepY);
};

// 五行克制提示：pe=敌方属性，me=我方属性；被克/相持时给出宜用属性（克敌方的属性）与一键切换
function counterOf(el){
  if (!TUNING.KE_MAP) return null;
  for (const k in TUNING.KE_MAP) if (TUNING.KE_MAP[k] === el) return k;
  return null;
}
function wuxingAdvice(pe, me){
  if (!pe || !me || !TUNING.KE_MAP) return '';
  const counter = counterOf(pe);          // 克敌方的属性（宜用属性）
  let rel, cls, arrow;
  if (TUNING.KE_MAP[me] === pe){ rel = '克制'; cls = 'good'; arrow = '➤'; }            // 我克敌
  else if (TUNING.KE_MAP[pe] === me){ rel = '被克'; cls = 'bad'; arrow = '↩'; }        // 敌克我
  else if (typeof wuxingSheng === 'function' && wuxingSheng(me, pe)){ rel = '相生'; cls = 'good'; arrow = '↻'; }  // 我生敌：伤害 ×1.15
  else { rel = '相持'; cls = ''; arrow = '↔'; }
  const shengTip = rel === '相生' ? ' · 伤害 ×1.15' : '';
  const advise = (rel === '被克' || rel === '相持') && counter && counter !== me;
  const btn = advise ? `<button class="btn-mini wux-btn" onclick="setCombatStyle('zhu');setZhuEl('${counter}');UI.renderTaofa()">${typeof markIcon==='function'?markIcon('bolt',13):'⚡'}切「${counter}」属</button>` : '';
  return `<div class="wuxing-tip ${cls}">五行：敌「${pe}」${arrow} ${rel} · 我「${me}」${shengTip}${advise?`（宜用「${counter}」属）`:''}${btn}</div>`;
}
// 战斗预估：预计击杀耗时、双方 DPS、能否撑住（hpNow 传入则为实时剩余血量）
function combatEstimateInner(m, c, hpNow){
  if (!m) return null;
  const dps = playerDpsEstimate();
  if (!dps) return null;
  const hp = (hpNow==null ? m.hp : hpNow);
  const kill = Math.max(1, hp) / dps;
  const mdps = Math.max(1, m.atk - totalDefence()*0.3) * 0.6 / Math.max(1, monsterInterval(m, c));
  const survive = kill * mdps <= playerMaxHp();
  return { cls: survive ? 'good' : 'bad',
    html: `预计击杀 ≈ ${fmtTime(Math.ceil(kill))} · 你 DPS≈${dps.toFixed(1)} · 敌 DPS≈${mdps.toFixed(1)}${survive?'':' · ⚠ 可能撑不住'}` };
}
function combatEstimateHtml(m, c, hpNow){
  const r = combatEstimateInner(m, c, hpNow);
  return r ? `<div class="combat-est ${r.cls}" id="combatEst">${r.html}</div>` : '';
}
// 离线收益预估（纯读取，不改动任何状态）：仅依据当前活动/御使按真实公式估算
function estimateOfflineGains(hours){
  const cap = offlineCapHours();
  const sec = Math.max(0, Math.min(hours==null ? cap : hours, cap)) * 3600;
  if (sec < 1) return null;
  const eff = offlineEff();
  const a = Game.activity;
  let xp = 0; const items = {};
  if (a && a.kind === 'gather'){
    const it = Items[a.itemId];
    if (it && it.node === Game.node && levelOf(it.skill) >= it.lvl){
      const times = Math.floor(sec / 1);               // 采集基础间隔 ≈1s
      xp += Math.round(it.xp * times * eff);
      const q = Math.floor(times * 1.4 * eff);
      if (q > 0) items[a.itemId] = q;
    }
  } else if (a && a.kind === 'craft'){
    const times = Math.floor(sec / 2);                 // 制作基础间隔 ≈2s
    let t = 0; while (t < times && canAfford(a.recipe.cost)) t++;
    if (t > 0){ items[a.recipe.out] = (a.recipe.qty||1) * t; xp += Math.round((a.recipe.xp||0) * t * eff); }
  }
  xp += Math.round(0.5 * Object.keys(Game.deployed).length * sec * 0.5 * eff);
  return { seconds:sec, xp, items };
}

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
  const m = c ? Monsters[c.monsterId] : null;
  const style = combatMode();
  const dps = playerDpsEstimate();

  return `<div class="panel arena" id="arenaBox">
    <div class="style-row">
      ${['auto','attack','ranged','zhu'].map(s=>
        `<button class="chip-btn ${Prefs.stylePref===s?'on':''}" onclick="setCombatStyle('${s}')">${styleLabel(s)}</button>`).join('')}
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
        <div class="f-name">${esc(m.name)} ${elBadge(m.el)}</div>
        <div class="f-hp"><div class="fill enemy" style="width:${Math.max(0,c.monsterHp/m.hp*100)}%"></div></div>
        <div class="f-sub">${fmt(Math.max(0,c.monsterHp))} / ${fmt(m.hp)}</div>`:`<div class="f-name">待机</div>
        <div class="f-hp"><div class="fill enemy" style="width:0%"></div></div>
        <div class="f-empty">点下方「讨伐目标」中的任一方块即可开战</div>`}
      </div>
    </div>
    ${c?momentumRowHtml(c):''}
    ${c&&m?wuxingAdvice(m.el, playerElement()):''}
    ${c&&m?combatEstimateHtml(m, c):''}
    ${c?`<div class="combat-stats" id="combatStats">回合 ${c.round||0} · 造成 ${c.dmgOut||0} · 承伤 ${c.dmgIn||0}${Game.stats.winStreak>1?` · 连胜 ${Game.stats.winStreak}`:''}${c.ults?` · 绝技 <b>${c.ults}</b> 次`:''}${c.repeat!=null?` · 本轮余 <b>${c.repeat}</b> 场`:''}</div>`:''}
    <div class="prefs-row">
      <label><input type="checkbox" ${Prefs.autoRevive?'checked':''} onchange="Prefs.autoRevive=this.checked;saveGame()"> 败后自动复讨</label>
    </div>
  </div>`;
}

// 目标列表：316 只异兽分组平铺，只在切页或数据真变时重建
function taofaListHtml(){
  const groups = [];
  for (const r of WORLD.regions){
    const list = Object.values(Monsters).filter(x=>!x.boss && x.regionId===r.regionId);
    if (list.length) groups.push({ title: r.regionName + ' · 异兽', list, locked: !regionUnlocked(r) });
  }
  groups.push({ title:'祷过之山 · 可猎', list:Object.values(Monsters).filter(x=>x.hunt) });
  groups.push({ title:'六凶（后羿所诛）', list:Object.values(Monsters).filter(x=>x.boss&&['zaochi','jiuying','dafeng','yayu','xiushe','fenghui'].includes(x.id)) });
  groups.push({ title:'刑天', list:Object.values(Monsters).filter(x=>x.id==='xingtian') });
  groups.push({ title:'西山神祇（守关）', list:Object.values(Monsters).filter(x=>x.boss&&['luwu','xiwangmu','dijiang'].includes(x.id)) });
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
  let list = `<div class="panel beast-panel"><h3>讨伐目标</h3>
    <div class="loot-recent">最近所获：${(Game.recentLoot||[]).map(l=>`${typeof itemIc==='function'?itemIc(l.itemId,13):((Items[l.itemId]||{}).icon||'')}${esc((Items[l.itemId]||{}).name||l.itemId)}×${l.qty}`).join('　')||'无'}</div>`;
  for (const g of groups){
    if (!g.list.length) continue;
    list += g.locked
      ? `<details class="fold grp"><summary>${esc(g.title)} · ${g.list.length} 种（山系未解锁）</summary>`
      : `<h4>${g.title}</h4>`;
    list += `<div class="beast-grid">`;
    const ordered = pick ? [...g.list].sort((a,b)=> (b===pick?1:0) - (a===pick?1:0)) : g.list;
    list += ordered.map(x=>{
      const node = nodeOf(x.nodeId);
      const un = node ? nodeUnlocked(node) : false;
      const lvOk = levelOf('taofa') >= (x.needLvl||1);
      const th = threatOf(x);
      const rec = Game.records[x.id]||{count:0,tier:0};
      // 宜用属性 = 克敌方的属性。⚠️ 必须走 counterOf 反查：KE_MAP[敌方] 得到的是
      // 「敌方所克之物」——木敌会给出土，而克木的是金，正好反了。
      const counterEl = x.el ? (counterOf(x.el) || '') : '';
      const dropList = (x.loot && x.loot.length) ? x.loot : (x.drop ? [[x.drop,1,1]] : []);
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
        data-bid="${x.id}" data-tip data-tip-title="${esc(x.name)}${x.py?`（${esc(x.py)}）`:''}"
        role="button" tabindex="0" onclick="UI.openHuntModal('${x.id}')">
        ${x.el?`<span class="bt-el el-${x.el}">${x.el}</span>`:''}
        <span class="tile-ic bi-ic">${(typeof beastIcon==='function')?beastIcon(x):(CAT_EMOJI[x.category]||'🐾')}</span>
        <span class="tile-nm">${esc(x.name)}</span>
        <span class="tile-tag"><i class="bt-rec">录 ${rec.count}</i> · Lv ${x.needLvl||1}${counterEl?`<button class="bt-el-hint" type="button" title="一键切到${counterEl}属（${counterEl}克${x.el}，伤害 ×${TUNING.WUXING.KE}）"
          onclick="event.stopPropagation();setCombatStyle('zhu');setZhuEl('${counterEl}');UI.renderTaofa()">宜${counterEl}</button>`:''}${decayTag?`<span class="bt-decay" title="连续讨伐 ${streakN} 次，经验递减；换一只异兽即恢复全额">×${mobStreakMult(x.id).toFixed(2)}</span>`:''}</span>
        ${x===pick?'<span class="bt-pick">宜讨</span>':''}
        <span class="tip-body hidden">
          ${x.form?`<div class="bc-sub">${esc(x.form)}</div>`:''}
          <div class="bc-sub">气血 ${fmt(x.hp)} · 攻 ${fmt(x.atk)} · 防 ${fmt(x.def)} · 经验 ${fmt(x.xp)}</div>
          <div class="bc-sub drop-line">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${esc(node?node.name:'')}${drops?` · 掉落 ${esc(drops)}`:''}</div>
          ${counterEl?`<div class="bc-sub">宜用 ${counterEl} 属（${counterEl}克${x.el}，伤害 ×${TUNING.WUXING.KE}）</div>`:''}
          ${decayTag?`<div class="bc-sub">连续讨伐 ${streakN} 次，经验 ×${mobStreakMult(x.id).toFixed(2)}；换一只异兽即恢复全额</div>`:''}
          <div class="bc-sub">${th.mark&&typeof markIcon==='function'?markIcon(th.mark,13):''}${th.label}${(!un||!lvOk)?' · 尚不可讨':''}</div>
        </span>
      </div>`;
    }).join('');
    list += `</div>`;
    if (g.locked) list += `</details>`;
  }
  return list + `</div>`;
}

UI.renderTaofa = function(){
  const box = $('content');
  if (!box) return;
  const keepY = window.scrollY || window.pageYOffset || 0;
  box.innerHTML = taofaArenaHtml() + taofaListHtml();
  // 同页重绘（切属性等）保住滚动位置，别把正看到的那只怪弹回顶部
  if (keepY > 0 && window.scrollTo) window.scrollTo(0, keepY);
};

// 只换竞技场：战斗开始 / 结束 / 切战斗风格走这里，目标列表原样留下
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
  const node = nodeOf(x.nodeId);
  const un = node ? nodeUnlocked(node) : false;
  const need = x.needLvl || 1;
  const taofa = levelOf('taofa');
  const lvOk = taofa >= need;
  const rec = Game.records[id] || { count:0, tier:0 };
  const th = threatOf(x);
  const counterEl = x.el ? (counterOf(x.el) || '') : '';
  const dropList2 = (x.loot && x.loot.length) ? x.loot : (x.drop ? [[x.drop,1,1]] : []);
  const drops = dropList2.map(([iid]) => (Items[iid]||{}).name || iid).join('、');
  const streakN = (Game.mobStreak && Game.mobStreak[id]) || 0;
  const decay = (!x.boss && streakN > 0) ? mobStreakMult(id) : 1;
  const can = un && lvOk;
  const lockMsg = !un
    ? `山系未解锁：${node ? nodeLockReason(node) : '此地不明'}`
    : !lvOk ? `需讨伐 ${need} 级（当前 ${taofa} 级）` : '';
  const rows = [
    x.form ? `<div class="hm-form">${esc(x.form)}</div>` : '',
    `<div class="hm-stats">
       <span>气血 <b>${fmt(x.hp)}</b></span>
       <span>攻击 <b>${fmt(x.atk)}</b></span>
       <span>防御 <b>${fmt(x.def)}</b></span>
       <span>经验 <b>${fmt(x.xp)}</b></span>
     </div>`,
    `<div class="hm-line">${esc(node ? node.name : '')}${drops ? ' · 掉落 ' + esc(drops) : ''}</div>`,
    `<div class="hm-line">五行 ${x.el || '—'}${counterEl ? ` · <b>宜用 ${counterEl} 属</b>（伤害 ×${TUNING.WUXING.KE}）` : ''}</div>`,
    `<div class="hm-line">${th.label}${x.boss ? ' · BOSS' : ''}${x.pair ? ' · 成对（占两槽）' : ''}</div>`,
    `<div class="hm-line">已录 <b>${rec.count}</b> 次（${TUNING.MASTERY.NAMES[rec.tier] || ''}）${decay < 1 ? ` · 连杀递减 ×${decay.toFixed(2)}` : ''}</div>`,
  ].filter(Boolean).join('');
  this.modal(`<h3><span class="mi-ic">${typeof beastIcon==='function'?beastIcon(x):'🐾'}</span> ${esc(x.name)}${x.py?`<span class="hm-py">（${esc(x.py)}）</span>`:''}</h3>
    ${rows}
    ${can ? `
    <div class="hm-times">
      <label for="huntTimes">战斗次数</label>
      <input id="huntTimes" type="number" min="1" max="99" step="1" value="1" inputmode="numeric"
        oninput="UI.onHuntTimesInput(this)" onchange="UI.clampHuntTimes(this)">
      <span class="hm-chips">
        ${[1,5,10,99].map(n=>`<button type="button" class="chip-btn" onclick="UI.setHuntTimes(${n})">${n}</button>`).join('')}
      </span>
    </div>
    <div class="hint">一场胜后自动接战，直至场次用尽或败北；换一只异兽即重置连杀递减。</div>
    <div class="modal-btns">
      <button class="btn primary" onclick="UI.startHuntTimes('${id}')">战斗</button>
      ${counterEl?`<button class="btn" onclick="setCombatStyle('zhu');setZhuEl('${counterEl}');UI.startHuntTimes('${id}')">切${counterEl}属并开战</button>`:''}
      <button class="btn" onclick="UI.closeModal()">取消</button>
    </div>` : `
    <div class="hm-lock">${esc(lockMsg)}</div>
    <div class="modal-btns"><button class="btn" onclick="UI.closeModal()">闭</button></div>`}`);
};
// 次数校验：空 / 0 / 负数 / 小数 / 超 99，一律夹到 1–99 的整数
UI.clampHuntTimes = function(el){
  if (!el) return 1;
  let n = parseInt(el.value, 10);
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
  if (el) el.value = Math.max(1, Math.min(99, n|0));
};
UI.startHuntTimes = function(id){
  const el = document.getElementById('huntTimes');
  const n = this.clampHuntTimes(el);
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
  <div class="panel deploy-panel"><h3>可御使之异兽（著录至「通形」）</h3>
    <div class="tile-grid beast-grid">
    ${deployableBeasts().map(b=>{
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
          <div class="bc-sub">${esc(def.label||'')}（按著录阶 ×${scale.toFixed(1)}）</div>
          <div class="bc-sub">著录 ${rec.count} 次${Monsters[b.id]&&Monsters[b.id].pair?' · 成对，占两槽':''}</div>
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

// ================= 图鉴 =================
// 单击异兽 → 弹窗：形态、增益明细、著录与成对规则一次说清，再决定御或卸。
// （旧版可御使的直接入槽、在槽的不可点；看不到「为什么不可御」也看不到具体增益。）
UI.openDeployModal = function(id){
  const b = Monsters[id];
  if (!b) return;
  const rec = Game.records[id] || { count:0, tier:0 };
  const def = (typeof BEAST_BUFFS !== 'undefined' && BEAST_BUFFS[id])
    || (typeof genericBeastBuff === 'function' ? genericBeastBuff(b) : null);
  const scale = 0.6 + 0.1 * rec.tier;
  const slotIdx = Object.keys(Game.deployed).find(k => Game.deployed[k] === id);
  const inSlot = slotIdx != null;
  const node = nodeOf(b.nodeId);
  const eff = def ? (buffDefText(def) || '') : '';
  const tierOk = rec.tier >= 3;
  this.modal(`<h3><span class="mi-ic">${typeof beastIcon==='function'?beastIcon(b):'🐾'}</span> ${esc(b.name)}${b.py?`<span class="hm-py">（${esc(b.py)}）</span>`:''}</h3>
    ${b.form?`<div class="hm-form">${esc(b.form)}</div>`:''}
    <div class="hm-line">${esc(node?node.name:'')} · 著录 <b>${rec.count}</b> 次（${TUNING.MASTERY.NAMES[rec.tier]||''}）</div>
    <div class="hm-buff">
      <div class="hm-line">增益 <b>${esc(def?def.label:'—')}</b>${eff?` <span class="hm-eff">${esc(eff)}</span>`:''}</div>
      <div class="hint">增益按著录阶放大（当前 ×${scale.toFixed(1)}）${b.pair?'；此兽「相得乃飞」，成对御使占两槽':''}。</div>
    </div>
    <div class="modal-btns">
      ${inSlot
        ? `<button class="btn" onclick="undeployBeast(${Number(slotIdx)});UI.closeModal();UI.renderYushi()">卸下</button>`
        : (tierOk
            ? `<button class="btn primary" onclick="deployBeast('${id}');UI.closeModal();UI.renderYushi()">御使</button>`
            : `<button class="btn" disabled>需著录至通形（${TUNING.MASTERY.THRESHOLDS[3]} 次）</button>`)}
      <button class="btn" onclick="UI.closeModal()">取消</button>
    </div>`);
};
// 收集成就弹窗：可领置顶，其次未达（按进度排），已领沉底
UI.openAchModal = function(){
  const all = window.CODEX_ACHIEVEMENTS || [];
  const rows = all.map(a => ({ a, st: codexAchState(a), done: codexDoneCount(a.cat) }));
  const rank = { claimable:0, locked:1, claimed:2 };
  rows.sort((x, y) => rank[x.st] - rank[y.st] || (y.done / Math.max(1, y.a.need)) - (x.done / Math.max(1, x.a.need)));
  const claimable = rows.filter(r => r.st === 'claimable').length;
  const claimedN = rows.filter(r => r.st === 'claimed').length;
  const stText = { claimable:'可领', locked:'未达', claimed:'已领' };
  UI.modal(`<h3>收集成就 <span class="tier">已领 ${claimedN} / ${all.length}</span></h3>
    <div class="hm-line">著录即是进益：每一类收满半数、收尽，皆有回馈；总录另有四档。达成后到此「领取」一次，奖励方入行囊。</div>
    <div class="ach-list">
      ${rows.map(({ a, st, done }) => {
        const p = Math.min(100, Math.round(done / Math.max(1, a.need) * 100));
        return `<div class="ach-row st-${st}">
          <div class="ach-main">
            <div class="ach-nm">${esc(a.name)}<span class="ach-tag">${stText[st]}</span></div>
            <div class="ach-desc">${esc(a.desc)} · 当前 ${done}</div>
            <div class="ach-pro"><i style="width:${p}%"></i></div>
          </div>
          <div class="ach-re">${esc(codexAchRewardText(a))}</div>
          ${st === 'claimable'
            ? `<button class="btn small primary" onclick="claimCodexAch('${a.id}');UI.openAchModal();UI.renderCodex()">领取</button>`
            : st === 'claimed' ? '<span class="ach-ok">已领</span>' : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="modal-btns">
      ${claimable ? `<button class="btn primary" onclick="claimAllCodexAch();UI.closeModal();UI.renderCodex()">一并领取（${claimable}）</button>` : ''}
      <button class="btn" onclick="UI.closeModal()">闭</button>
    </div>`);
};

UI.renderCodex = function(keepFocus){
  const box = $('content');
  if (!box) return;
  const tabs = { beast:'异兽', mountain:'山川', thing:'百物', deity:'祠典 · 神祇' };
  const catMap = { beast:'异兽', mountain:'山川', thing:['灵木','金玉','水族','灵草','嘉谷','百物'], deity:['祠典','神祇'] };
  const entries = Object.values(CODEX).filter(e=>{
    const c = catMap[this.codexTab];
    return Array.isArray(c) ? c.includes(e.cat) : e.cat === c;
  });
  const total = Object.keys(CODEX).length;
  const done = recordedCount();
  const tabTotal = entries.length;
  const tabDone = entries.filter(e=>(Game.records[e.id]||{}).count>0).length;
  const tabPct = tabTotal ? Math.round(tabDone/tabTotal*100) : 0;
  // 632 条图鉴靠翻页找一条太慢：给一个名/注音检索框
  const q = String(this.codexQuery||'').trim().toLowerCase();
  const shown = q
    ? entries.filter(e=> (e.name||'').toLowerCase().includes(q) || String(e.py||'').toLowerCase().includes(q))
    : entries;
  // 收集成就：把奖励闭环挂在收集线自己的入口上，不必另开一页
  const achAll = (window.CODEX_ACHIEVEMENTS || []);
  let achClaim = 0, achDone = 0;
  achAll.forEach(a => { const st = codexAchState(a); if (st === 'claimable') achClaim++; else if (st === 'claimed') achDone++; });
  let html = `<div class="ach-bar">
    <span class="ach-lb">收集成就</span>
    <span class="ach-stat">已领 <b>${achDone}</b> / ${achAll.length}</span>
    ${achClaim ? `<span class="ach-new">可领 ${achClaim}</span>` : '<span class="hint">暂无待领</span>'}
    <button class="btn small" onclick="UI.openAchModal()">${achClaim ? '领取' : '查看'}</button>
  </div>
  <div class="filter-row">
    ${Object.entries(tabs).map(([k,v])=>`<button class="chip-btn ${this.codexTab===k?'on':''}" onclick="UI.codexTab='${k}';UI.codexQuery='';UI.renderCodex()">${v}</button>`).join('')}
    <label class="search-box" title="按名称或注音检索">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
      <input id="codexSearch" type="search" placeholder="检索名 / 注音" value="${esc(this.codexQuery||'')}"
        oninput="UI.codexQuery=this.value;UI.renderCodex(true)">
    </label>
    <span class="hint">本类 ${tabDone}/${tabTotal}${q?` · 命中 ${shown.length}`:''} · 总录 ${done}/${total}</span>
  </div>
  <div class="codex-bar" title="本类已著录 ${tabPct}%"><div class="fill" style="width:${tabPct}%"></div></div>
  <div class="codex-grid">
    ${shown.length ? shown.map(e=>{
      const rec = Game.records[e.id]||{count:0,tier:0};
      const seen = rec.count > 0;
      // 检索时把命中片段高亮；否则沿用常规 nameTag（含生僻字处理）
      const nmHtml = q
        ? `<span class="nm">${hi(e.name,q)}${e.py?`<rt>${hi(e.py,q)}</rt>`:''}</span>`
        : nameTag(e.name, e.py);
      if (!seen){
        // 未著录：只留名字与虚线框，整片图鉴才读得出「哪些还没见过」
        return `<div class="codex-card unseen" onclick="showCodexDetail('${e.id}')" title="${esc(e.name)} · 未见">
          <div class="cc-name">${nmHtml}</div>
        </div>`;
      }
      // 阶位用五个方点表示深浅，避免满屏重复的「未见」二字
      const dots = [0,1,2,3,4].map(i=>`<i class="${i<=rec.tier ? (i<rec.tier?'full':'on') : ''}"></i>`).join('');
      // 距下一阶的进度：满阶则明示「得御」，让收集线的前路看得见
      const nextTh = rec.tier < TUNING.MASTERY.THRESHOLDS.length-1 ? TUNING.MASTERY.THRESHOLDS[rec.tier+1] : 0;
      const nextTip = nextTh
        ? ` · 距「${TUNING.MASTERY.NAMES[rec.tier+1]}」还差 ${Math.max(0, nextTh-rec.count)} 次`
        : ' · 已至「得御」';
      const countHtml = nextTh
        ? `${rec.count}<i>/${nextTh}</i>`
        : `${rec.count}`;
      // 异兽 / 神祇卡：绘形小像置顶，与讨伐页同一套图标语言
      const icHtml = (typeof beastIcon === 'function' && (e.cat === '异兽' || e.cat === '神祇'))
        ? `<div class="cc-ic">${beastIcon(e.id)}</div>` : '';
      return `<div class="codex-card" onclick="showCodexDetail('${e.id}')" title="${esc(e.name)} · 已著录 ${rec.count} 次${esc(nextTip)}">
        ${icHtml}
        <div class="cc-name">${nmHtml}</div>
        <div class="tier-dots" aria-hidden="true">${dots}</div>
        <div class="cc-tier">${TUNING.MASTERY.NAMES[rec.tier]}<span class="cc-count">${countHtml}</span></div>
      </div>`;
    }).join('') : `<div class="empty-note">${esc(this.codexQuery||'')} —— 无此条目。换个字或注音试试，例如「鸟」「yú」。</div>`}
  </div>`;
  box.innerHTML = html;
  // 输入时重渲染会丢焦点：把光标放回检索框末尾，保持连续输入
  if (keepFocus){
    const el = $('codexSearch');
    if (el && el.focus){ el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch(e){} }
  }
};
function showCodexDetail(id){
  const e = CODEX[id];
  if (!e) return;
  const rec = Game.records[id]||{count:0,tier:0};
  const rows = e.reveals.map((txt,i)=>{
    const locked = i > rec.tier;
    return `<div class="reveal ${locked?'locked':''}"><b>${TUNING.MASTERY.NAMES[i]}</b>${locked?'<span class="lock-tag">未揭示</span>':esc(txt||'（无）')}</div>`;
  }).join('');
  const cn = codexNode(e);
  const cnLabel = e.cat === '异兽' ? '前往讨伐节点' : '前往产出节点';
  const cnBtn = cn ? `<button class="btn on" onclick="UI.selRegion='${cn.regionId}';UI.selNode='${cn.nodeId}';UI.switchTab('yudi');UI.closeModal()">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${cnLabel}</button>` : '';
  // 异兽 / 神祇详情：绘形大像置顶（未著录也画——详情本就是「书中先有其名」）
  const icHtml = (typeof beastIcon === 'function' && (e.cat === '异兽' || e.cat === '神祇'))
    ? `<div class="cd-ic">${beastIcon(e.id)}</div>` : '';
  UI.modal(`<h3>${esc(e.name)} <span class="tier">${e.cat}</span></h3>
    ${icHtml}
    <div class="meta">著录 ${rec.count} 次 · ${rec.count>0?TUNING.MASTERY.NAMES[rec.tier]:'未见'}</div>
    ${rows}
    ${e.source?`<div class="source">${esc(e.source)}</div>`:''}
    <div class="modal-btns">${cnBtn}<button class="btn" onclick="UI.closeModal()">闭</button></div>`);
}
window.showCodexDetail = showCodexDetail;

// ================= 祠祀 =================
// 征兆面板 HTML（整页渲染与就地补绘共用）：总效应 / 分档 chips / 方块网格 / 禳解行
function omenPanelHtml(){
  const xiong = Game.omens.filter(o=>OMENS[o.id]&&OMENS[o.id].polarity==='凶');
  const omenFilter = UI.omenFilter || 'all';
  // 42 条征兆一次铺开会淹没重点：按吉凶分档，并单列「已现」
  const count = { all:0, 吉:0, 凶:0, 中:0, seen:0 };
  Object.values(OMENS).forEach(d=>{ count.all++; if (count[d.polarity] != null) count[d.polarity]++; });
  count.seen = Game.omens.length;
  const label = { all:'全部', 吉:'吉兆', 凶:'凶兆', 中:'中兆', seen:'已现' };
  const chips = ['all','吉','凶','中','seen'].map(k=>{
    const n = k==='all' ? count.all : count[k];
    return `<button class="chip-btn ${omenFilter===k?'on':''}" onclick="UI.omenFilter='${k}';UI.renderJisi()">${label[k]} ${n}</button>`;
  }).join('');
  const omenList = Object.entries(OMENS).filter(([id,def])=>{
    if (omenFilter === 'all') return true;
    if (omenFilter === 'seen') return Game.omens.some(o=>o.id === id);
    return def.polarity === omenFilter;
  });
  return `${Game.omens.length?`<div class="omen-summary">当前总效应：${currentOmenEffects().map(e=>`${e.label} ${e.pct>0?'+':''}${e.pct}%`).join(' · ')}</div>`:''}
    <div class="filter-row">${chips}</div>
    <div class="tile-grid omen-grid">
    ${omenList.map(([id,def])=>{
      const active = Game.omens.find(o=>o.id===id);
      const ever = !!Game.stats.omens[id];
      const mark = def.polarity==='凶'?'凶':def.polarity==='吉'?'吉':'中';
      // 方块：印记字（吉/凶/中）+ 异兽名 + 征兆类型；生效中高亮并在角标显示剩余
      return `<div class="tile omen-tile ${active?'active':''} ${def.polarity}" data-tip data-tip-title="${esc(def.beast)}">
        <span class="tile-ic bi-ic omen-ic">${typeof omenIcon==='function'?omenIcon(def,30):mark}</span>
        <span class="tile-seal ot-pol" title="${mark}兆">${mark}</span>
        <span class="tile-nm">${esc(def.beast)}</span>
        <span class="tile-tag">${esc(def.type)}</span>
        ${active?`<span class="tile-more ot-left" title="生效中，余 ${fmtTime(active.until-gameTime())}">${fmtTime(active.until-gameTime())}</span>`:''}
        <span class="tip-body hidden">
          <div class="oc-effect">${omenEffectText(def)}</div>
          <div class="oc-desc">${esc(def.desc)}</div>
          ${ever?'<div class="hint">已曾出现</div>':'<div class="hint">尚未出现</div>'}
        </span>
      </div>`;
    }).join('')}
    ${omenList.length ? '' : `<div class="empty-note">${omenFilter==='seen'
      ? '尚无生效征兆。首次著录异兽时，可能触发原文所记的「见则 …」吉凶之兆。'
      : '此档暂无征兆。'}</div>`}
    </div>
    <div class="exo-row">
      <span class="hint">禳解（白菅×3 + 稻米×3）可提前禳除当前凶兆：</span>
      <button class="btn ${xiong.length?'primary':''}" ${xiong.length?'':'disabled'} onclick="exorcise();UI.renderJisi()">
        禳解 ${xiong.length?`（${xiong.map(o=>OMENS[o.id].type).join('、')}）`:''}</button>
    </div>`;
}
UI.renderJisi = function(){
  const box = $('content');
  if (!box) return;
  let html = `<div class="panel rite-panel"><h3>祠礼（据原文祠礼格式）</h3>
    <div class="rite-grid">
    ${Object.entries(RITES).map(([id,def])=>{
      const rec = Recipes.find(r=>r.out===id);
      const region = WORLD.regions.find(r=>r.regionId===def.regionId);
      const afford = canAfford(rec.cost);
      const lvOk = levelOf('jisi') >= rec.lvl;
      const riteName = (Items[id]||{}).name || (region?region.regionName+'祠礼':id);
      const can = afford && lvOk;
      // 方块：点按即行祭（材料/等级不足给说明）；山系与祭品明细在浮层
      return `<div class="tile rite-tile ${can?'':'lock'}" data-rite="${id}" data-tip data-tip-title="${esc(riteName)}"
        role="button" tabindex="0" onclick="UI.tryRite('${id}')">
        <span class="tile-ic bi-ic">${(typeof riteIcon==='function')?riteIcon(id, riteName):`<span class="tile-seal">${esc((String(riteName).split('·')[1] || String(riteName)).trim().slice(0,1))}</span>`}</span>
        <span class="tile-nm">${esc(riteName)}</span>
        <span class="tile-tag">祭祀 ${rec.lvl}</span>
        <span class="tip-body hidden">
          <div class="rc-sub">${esc(region?region.regionName:'常祭')}</div>
          ${(region&&region.deity)?`<div class="rc-sub">${esc(region.deity.form||'')}</div>`:''}
          <div class="rc-cost">${costChips(rec.cost)}</div>
          ${(Items[id]||{}).note?`<div class="hint">${esc((Items[id]||{}).note)}</div>`:''}
          ${!lvOk?`<div class="hint">需祭祀 ${rec.lvl} 级</div>`:''}
        </span>
      </div>`;
    }).join('')}
    </div>
    <div class="hint">行祭后该山系采集产出 +30%（祠坛 ×1.5），持续 1 小时。</div>
  </div>

  <div class="panel omen-panel"><h3>征兆（原文「见则X」）</h3>
    ${omenPanelHtml()}
  </div>

  <div class="panel div-panel"><h3>卜筮</h3>
    <div class="div-row">
      <span class="hint">以白菅为筮（×1），卜问吉凶；佩灌灌符或不惑散则必吉。</span>
      <button class="btn primary" onclick="divine();UI.renderJisi()">卜筮</button>
      ${this.lastDivine?`<span class="hint">上次：${this.lastDivine.lucky?'吉':'不吉'}</span>`:''}
    </div>
  </div>
  <div class="panel omen-log-panel"><h3>征兆纪事</h3>
    ${this.logEntries.filter(e=>e.cat==='omen').slice(0,8).map(e=>`<div class="omen-log-line" style="color:${LOG_COLORS[e.color]||'#555'}">· ${esc(e.msg)}</div>`).join('') || '<div class="hint">尚无征兆记录；异兽初录时或触发吉凶之兆。</div>'}
  </div>`;
  box.innerHTML = html;
};
// 增益数值的人话版：御使与临时增益共用一张键名表；防御是固定值，其余按百分比
const BUFF_KEY_NAMES = { gatherSpeed:'采集速度', gather:'采集', xp:'经验', xpBonus:'经验', farmSpeed:'田事',
  div:'卜筮观象', hp:'气血', def:'防御', offline:'离线收益', trade:'贸易', dmg:'伤害', loot:'所获',
  cookQty:'烹饪并出', build:'营造', yield:'全局产出', heal:'疗愈' };
function buffDefText(def){
  if (!def) return '';
  const parts = [];
  for (const k of Object.keys(BUFF_KEY_NAMES)){
    const v = def[k];
    if (!v) continue;
    parts.push(`${BUFF_KEY_NAMES[k]} +${k === 'def' ? v : Math.round(v * 100) + '%'}`);
  }
  if (def.kind === 'wise') parts.push('抉择类事件必出最优解');
  return parts.join(' · ');
}
function omenEffectText(def){
  const map = { yield:'全局产出', gather:'采集效率', offline:'离线收益', trade:'商旅收益', fish:'渔获', build:'营造速度', wise:'抉择类事件必吉' };
  const parts = [];
  for (const k in def){
    if (map[k]) parts.push(`${map[k]} ${def[k]>0?'+':''}${Math.round(def[k]*100)}%${def.dur?`（${fmtTime(def.dur)}）`:''}`);
  }
  if (def.wise) parts.push('抉择类事件必出最优解');
  return parts.join('；');
}
window.omenEffectText = omenEffectText;
// 征兆总效应弹窗：汇总所有生效征兆的具体方向与范围（顶栏 ⚡ 计数可点击）
function openOmenSummary(){
  const omens = Game.omens || [];
  let body;
  if (!omens.length){
    body = '<div class="hint">当前无生效征兆。首次著录异兽可能触发吉凶之兆（如「其邑大水」「有大兵」）。</div>';
  } else {
    const agg = (typeof currentOmenEffects==='function') ? currentOmenEffects() : [];
    body = `<div class="omen-summary">总效应：${agg.length?agg.map(e=>`${e.label} ${e.pct>0?'+':''}${e.pct}%`).join(' · '):'—'}</div>`
      + '<div class="tile-grid omen-grid">'
      + omens.map(o=>{
          const d = OMENS[o.id]; if (!d) return '';
          const left = o.until ? fmtTime(o.until - gameTime()) : '常驻';
          const mark = d.polarity==='凶'?'凶':d.polarity==='吉'?'吉':'中';
          return `<div class="tile omen-tile active ${d.polarity}" data-tip data-tip-title="${esc(d.beast||d.type)}">
            <span class="tile-seal">${mark}</span>
            <span class="tile-nm">${esc(d.beast||d.type)}</span>
            <span class="tile-tag">${esc(d.type||'')}</span>
            <span class="tile-more ot-left" title="余 ${left}">${left}</span>
            <span class="tip-body hidden">
              <div class="oc-desc">${esc(d.desc||'')}</div>
              <div class="oc-effect">${omenEffectText(d)}</div>
            </span>
          </div>`;
        }).join('')
      + '</div>';
  }
  UI.modal(`<h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('bolt',17):'⚡'}</span> 征兆总效应</h3>${body}<div class="modal-btns"><button class="btn" onclick="UI.closeModal()">闭</button></div>`);
}
window.openOmenSummary = openOmenSummary; window.TABS = TABS;
window.wuxingAdvice = wuxingAdvice; window.counterOf = counterOf;
window.combatEstimateHtml = combatEstimateHtml;
window.estimateOfflineGains = estimateOfflineGains;
window.nodeForSkill = nodeForSkill;
window.materialNodeForSkill = materialNodeForSkill;
window.materialNodesForSkill = materialNodesForSkill;
window.materialStatusForSkill = materialStatusForSkill;
window.codexNode = codexNode;
window.nodeRecordProgress = nodeRecordProgress;
// 当前所有生效征兆的聚合数值预览（供「当前总效应」展示）
function currentOmenEffects(){
  const keys = [['yield','全局产出'],['gather','采集效率'],['offline','离线收益'],['trade','商旅收益'],
    ['fish','渔获'],['build','营造速度'],['divine','卜筮'],['craft','制作效率'],['move','巡历效率']];
  const out = [];
  keys.forEach(([k,label])=>{ const v = omenMod(k); if (v) out.push({ label, pct: Math.round(v*100) }); });
  return out;
}
// 微型走势曲线（SVG 折线）
function sparkline(vals, w, h){
  if (!vals || vals.length < 2) return '<span class="hint">（持续游戏以记录走势）</span>';
  const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  const span = (max - min) || 1, step = w / (vals.length - 1);
  const pts = vals.map((v,i)=>`${(i*step).toFixed(1)},${(h - (v-min)/span*h).toFixed(1)}`).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(--azurite)" stroke-width="2"/></svg>`;
}

// ================= 墟市 =================
UI.renderShichan = function(){
  const box = $('content');
  if (!box) return;
  const sellMult = tradeMult();   // 售价走势由 onSecond 采样，此处只读（渲染无副作用）
  let buy = '';
  for (const cat of SHOP_CATS){
    const items = ShopStock.filter(s=>s.cat===cat.id);
    if (!items.length) continue;
    buy += `<h4><span class="cat-ic">${typeof itemIc==='function'?itemIc({ icon:cat.icon, name:cat.name, type:'material' },16):cat.icon}</span> ${cat.name}</h4><div class="shop-grid">`;
    buy += items.map((s,i)=>{
      const it = Items[s.itemId];
      const idx = ShopStock.indexOf(s);
      const lvOk = levelOf('shanglv') >= s.lvl;
      const afford = Game.shells >= s.cost;
      const can = lvOk && afford;
      // 方块：点按买一份（buyItem 自带等级与贝币校验），右上「×10」买十份
      return `<div class="tile shop-tile ${can?'':'lock'}" data-tip data-tip-title="${esc(it?it.name:s.itemId)}"
        role="button" tabindex="0" onclick="buyItem(${idx},1)">
        <span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(it):(it?it.icon:'📦')}</span>
        <span class="tile-nm">${esc(it?it.name:s.itemId)}</span>
        <span class="tile-tag">${s.cost} 贝</span>
        ${can?`<button class="tile-more" type="button" title="买十份（${s.cost*10} 贝）"
          onclick="event.stopPropagation();buyItem(${idx},10)">×10</button>`:''}
        <span class="tip-body hidden">
          <div class="bc-sub">${s.qty} 件 / 份 · 单价 ${s.cost} 贝</div>
          ${!lvOk?`<div class="hint">需商旅 ${s.lvl} 级</div>`:''}
          ${s.note?`<div class="hint">${esc(s.note)}</div>`:''}
          ${it&&it.note?`<div class="rc-sub">${esc(it.note)}</div>`:''}
        </span>
      </div>`;
    }).join('');
    buy += `</div>`;
  }
  // 出售
  const inv = Object.entries(Game.inventory).filter(([id,q])=>q>0 && (Items[id]||{}).value);
  inv.sort((a,b)=>{
    if (this.invSort==='value') return (Items[b[0]].value||0)-(Items[a[0]].value||0);
    if (this.invSort==='qty') return b[1]-a[1];
    return 0;
  });
  let sell = `<div class="tile-grid sell-grid">`;
  sell += inv.map(([id,q])=>{
    const it = Items[id];
    const v = sellValue(id, q);
    const unit = sellValue(id, 1);
    // 方块：图标 + 名 + 整摞售价，点按售 1，右上角「全」售清；
    // 单价 / 持有明细进浮层
    return `<div class="tile sell-tile" data-tip data-tip-title="${esc(it.name)}"
      role="button" tabindex="0" onclick="sellItem('${id}',1);UI.renderShichan()">
      <span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(it):it.icon}</span>
      <span class="tile-nm">${esc(it.name)}</span>
      <span class="tile-tag">${fmt(v)} 贝</span>
      <button class="tile-more" type="button" title="全售 ${q} 件，得 ${fmt(v)} 贝"
        onclick="event.stopPropagation();sellItem('${id}',${q});UI.renderShichan()">全</button>
      <span class="tip-body hidden">
        <div class="bc-sub">持有 ×${q} · 单价 ${fmt(unit)} 贝</div>
        <div class="bc-sub">售 1 得 ${fmt(unit)} 贝 · 全售得 ${fmt(v)} 贝</div>
      </span>
    </div>`;
  }).join('') || '<div class="hint">行囊空空</div>';
  sell += `</div>`;
  const plainValue = inv.filter(([id])=>(Items[id].value||0)<30).reduce((s,[id,q])=>s+sellValue(id,q),0);
  // 推荐买卖：低买高卖 / 购入即录 / 清仓凡品
  const tips = [];
  (typeof ShopStock!=='undefined'?ShopStock:[]).forEach(s=>{
    const it = Items[s.itemId]; if (!it) return;
    const profit = sellValue(s.itemId, s.qty) - s.cost;
    if (profit > 0 && Game.shells >= s.cost)
      tips.push(`低买高卖：<b>${esc(it.name)}</b>（转售约 +${fmt(profit)} 贝）`);
    else if (!Game.records[s.itemId])
      tips.push(`购入即录：<b>${esc(it.name)}</b>（增进著录度）`);
  });
  if (plainValue > 0) tips.push(`行囊有凡/良品，可一键售出得 <b>${fmt(plainValue)}</b> 贝`);
  // 方国求购：可交付的单进入推荐（贝币的第二出口）
  (Game.orders||[]).forEach(o=>{
    if (o.done) return;
    const it = Items[o.itemId];
    if (it && (Game.inventory[o.itemId]||0) >= o.qty)
      tips.push(`方国求购：<b>${esc(it.name)}</b> ×${o.qty} 已备齐，可交割得 <b>${fmt(o.total)}</b> 贝`);
  });

  // 方国求购订单板（惰性刷新：无单或超 30 分钟未轮换时补一批）
  if (typeof refreshOrders === 'function') refreshOrders(true);
  const T = TUNING.ORDERS;
  const leftSec = Math.max(0, T.REFRESH_SEC - (Date.now() - (Game.ordersAt||0))/1000);
  const mm = String(Math.floor(leftSec/60)).padStart(2,'0');
  const ss = String(Math.floor(leftSec%60)).padStart(2,'0');
  let board = '';
  if ((Game.orders||[]).length){
    board = (Game.orders||[]).map((o, idx)=>{
      const it = Items[o.itemId] || { name:o.itemId, icon:'📦' };
      const region = regionById(o.regionId);
      const have = Game.inventory[o.itemId]||0;
      const ok = !o.done && have >= o.qty;
      return `<div class="ob-card ${o.done?'done':''}" data-tip data-tip-title="${esc(it.name)}">
        <div class="ob-top"><span class="rc-icon">${typeof itemIc==='function'?itemIc(o.itemId,16):(it.icon||'📦')}</span><b>${esc(it.name)}</b>
          ${region?`<span class="ob-region" title="此物产自${esc(region.regionName)}，方国${esc(region.regionAlias)}来求">${esc(region.regionAlias)}来求</span>`:''}</div>
        <div class="ob-meta">求 <b>${o.qty}</b> 件 · 溢价 <b>×${o.premium.toFixed(2)}</b> · 商旅经验 +${o.xp}</div>
        <div class="ob-foot">
          <span class="ob-total">${fmt(o.total)} 贝</span>
          <span class="ob-have ${ok?'ok':''}">持有 ${have}/${o.qty}</span>
          ${o.done
            ? '<span class="ob-done">✓ 已交割</span>'
            : `<button class="btn small ${ok?'primary':''}" ${ok?'':'disabled'} onclick="deliverOrder(${idx});UI.renderShichan()">交割</button>`}
        </div>
      </div>`;
    }).join('');
  } else {
    board = '<div class="hint">方国使者未至——稍后再来，或「另访方国」主动求单</div>';
  }
  const orderBoard = `<div class="panel order-board">
      <div class="ob-head"><h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('scale',17):'⚖️'}</span> 方国求购</h3>
        <span class="ob-refresh">整批轮换 <b>${mm}:${ss}</b> 后
          <button class="btn small" onclick="rerollOrders();UI.renderShichan()">另访方国</button></span></div>
      <div class="ob-grid">${board}</div>
      <div class="hint">只求购已解锁山川出产的原材料；整批 30 分钟轮换，交割一单少一单</div>
    </div>`;

  box.innerHTML = `<div class="panel shop-head">
      <span>贝币 <b data-stat="shells">${fmt(Game.shells)}</b></span>
      <span>商旅等级 <b>${levelOf('shanglv')}</b></span>
      <span>售价加成 <b>×${sellMult.toFixed(2)}</b></span>
      <span class="price-trend">售价走势 ${sparkline(Game.priceHistory.map(p=>p.m), 90, 22)}</span>
      <span class="filter-row">
        <button class="chip-btn ${this.invSort==='default'?'on':''}" onclick="UI.invSort='default';UI.renderShichan()">默认</button>
        <button class="chip-btn ${this.invSort==='value'?'on':''}" onclick="UI.invSort='value';UI.renderShichan()">价值↓</button>
        <button class="chip-btn ${this.invSort==='qty'?'on':''}" onclick="UI.invSort='qty';UI.renderShichan()">数量↓</button>
      </span>
    </div>
    ${tips.length?`<div class="panel trade-tip"><h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('lamp',17):'💡'}</span> 推荐买卖</h3><ul>${tips.slice(0,3).map(t=>`<li>${t}</li>`).join('')}</ul></div>`:''}
    ${orderBoard}
    <div class="panel">${buy}</div>
    <div class="panel"><h3>出售</h3>
      <div class="sell-toolbar"><button class="btn small" onclick="sellAllPlain()">出售全部凡/良品（${plainValue} 贝）</button></div>
      ${sell}</div>`;
};
function sellAllPlain(){
  for (const id of Object.keys(Game.inventory)){
    const it = Items[id];
    if (!it || !it.value || it.value >= 30) continue;
    sellItem(id, Game.inventory[id]);
  }
  UI.renderShichan();
}
window.sellAllPlain = sellAllPlain;

// ================= 营造 =================
UI.renderYing = function(){
  const box = $('content');
  if (!box) return;
  box.innerHTML = `<div class="panel">
    <h3>营造（营邑）</h3>
    <div class="tile-grid building-grid">
    ${Object.values(BUILDINGS).map(b=>{
      const done = !!Game.buildings[b.id];
      const lvOk = levelOf('yingyi') >= b.lvl;
      const afford = canAfford(b.cost);
      const can = !done && lvOk && afford;
      // 方块：印记字 + 建筑名 + 营造等级，点按即营造；材料与效用进浮层
      return `<div class="tile build-tile ${done?'done':''} ${can?'':'lock'}" data-tip data-tip-title="${esc(b.name)}"
        role="button" tabindex="0" onclick="UI.openBuildModal('${b.id}')">
        <span class="tile-ic bi-ic">${typeof structureIcon==='function'?structureIcon(b):esc(b.name.slice(0,1))}</span>
        <span class="tile-nm">${esc(b.name)}</span>
        <span class="tile-tag">${done?'已成':'营邑 '+b.lvl}</span>
        ${done?'<span class="tile-more bm-done" title="已经营造完毕">✓</span>':''}
        <span class="tip-body hidden">
          ${b.desc?`<div class="rc-sub">${esc(b.desc)}</div>`:''}
          <div class="rc-cost">${costChips(b.cost)}</div>
          ${done?'<div class="hint">已经营造完毕</div>':`${lvOk?'':'<div class="hint">需营邑 '+b.lvl+' 级（当前 '+levelOf('yingyi')+'）</div>'}${afford?'':'<div class="hint">材料不足</div>'}`}
        </span>
      </div>`;
    }).join('')}
    </div>
    <div class="hint">营邑等级随营造提升；造完一座所得经验足以开启下一座。学宫可加快著录度获取。</div>
    <div class="ying-repair">
      <button class="btn" onclick="repairBuild();UI.renderYing()">修葺旧筑（怪木×2 · 沙石×1）</button>
      <span class="hint">无可造之物而等级差一点时，以此补足营邑经验（约本级所需四分之一）</span>
    </div>
  </div>`;
};

// 营造详情：材料 / 门槛 / 效用一屏说清，按钮依状态切换（营造 / 去采料 / 已营造）
// 营造收益对比：读「现在」与「建成后」两端的真实数值并列，
// 而不是只给一句文案——文案与实现脱节过一次（烽火台 / 学宫只有描述没有出口），
// 让数值自己说话，接不上就会立刻显形。
function structureEffectRows(id){
  const built = !!Game.buildings[id];
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  const row = (label, from, to) => ({ label, from, to: built ? '已生效' : to });
  switch (id){
    case 'zhai': {
      const y = globalYieldBonus();
      return [row('全局产出', pct(y), pct(y + 0.03))];
    }
    case 'zaoku':
      return [{ label:'制作耗时', from: built ? '×0.90' : '×1.00', to: built ? '已生效' : '×0.90' }];
    case 'tuku': {
      const h = offlineCapHours();
      return [row('离线上限', h + ' 小时', (h + 1) + ' 小时')];
    }
    case 'canglin': {
      const h = offlineCapHours();
      return [row('离线上限', h + ' 小时', (h + 2) + ' 小时'),
              row('离线效率', pct(offlineEff()), pct(offlineEff() + 0.05))];
    }
    case 'citan':
      return [{ label:'祭祀产出增益', from: built ? '×1.50' : '×1.00', to: built ? '已生效' : '×1.50' }];
    case 'shichan':
      return [{ label:'商旅售价', from: '×' + tradeMult().toFixed(2), to: built ? '已生效' : '×' + (tradeMult() + 0.05).toFixed(2) }];
    case 'fenghuotai':
      return [{ label:'凶兆之害', from: built ? '×0.50' : '×1.00', to: built ? '已生效' : '×0.50' }];
    case 'xuegong':
      return [{ label:'著录度获取', from: built ? '+25%' : '—', to: built ? '已生效' : '+25%' }];
    default:
      return [];
  }
}

UI.openBuildModal = function(id){
  const b = BUILDINGS[id];
  if (!b) return;
  const done = !!Game.buildings[b.id];
  const lv = levelOf('yingyi');
  const lvOk = lv >= b.lvl;
  const afford = canAfford(b.cost);
  const lack = (b.cost || []).filter(([mid, need]) => totalOf(mid) < need);
  const actions = done
    ? `<button class="btn" onclick="repairBuild();UI.closeModal();UI.renderYing()">修葺旧筑</button>`
    : (lvOk && afford)
      ? `<button class="btn primary" onclick="buildStructure('${b.id}');UI.closeModal();UI.renderYing()">营造</button>`
      : `<button class="btn" onclick="UI.closeModal();UI.switchTab('skills')">去采料</button>`;
  UI.modal(`<h3><span class="mi-ic">${typeof structureIcon === 'function' ? structureIcon(b) : '🏠'}</span> ${esc(b.name)}
      <span class="tier">${done ? '已成' : '营邑 ' + b.lvl}</span></h3>
    <div class="reveal"><b>效用</b>${esc(b.desc || '未载其用')}</div>
    <div class="hm-stats">
      <span>营邑门槛 <b>${b.lvl}</b>（当前 <b>${lv}</b>）</span>
      <span>营造经验 <b>${fmt(b.xp || 0)}</b></span>
    </div>
    ${(() => { const rows = structureEffectRows(b.id); return rows.length ? `<div class="bm-eff"><div class="bm-lb">建成后</div>
      ${rows.map(r => `<div class="bm-eff-row"><span>${r.label}</span><em>${esc(r.from)}</em><i>→</i><b>${esc(r.to)}</b></div>`).join('')}
    </div>` : ''; })()}
    <div class="bm-costs"><div class="bm-lb">所需材料</div>${costChips(b.cost)}</div>
    ${done
      ? '<div class="hm-line">已经营造完毕。若营邑等级差一点，可用「修葺旧筑」补经验（约本级四分之一）。</div>'
      : (!lvOk
        ? `<div class="hm-lock">营邑需 ${b.lvl} 级，当前 ${lv} 级——先造前面几座或修葺旧筑。</div>`
        : (!afford
          ? `<div class="hm-lock">材料不足：${lack.map(([m, q]) => esc((Items[m] || {}).name || m) + ' 差 ' + (q - totalOf(m))).join('、')}</div>`
          : '<div class="hm-line">材料已齐，可即营造。</div>'))}
    <div class="modal-btns">${actions}<button class="btn" onclick="UI.closeModal()">取消</button></div>`);
};

// ================= 行动（巡历队列） =================
UI.renderQueue = function(){
  const box = $('content');
  if (!box) return;
  const kindDef = ActionKinds[this.queueKind];
  const targets = actionTargets(this.queueKind);
  const fb = Game.fallback;
  let html = `<div class="queue-wrap">
    <div class="panel queue-list">
      <h3>巡历队列（${Game.queue.length}/${QUEUE_MAX}）${Game.queue.length?` · 预计一轮 ≈ ${fmtTime(estimateQueueSeconds())}`:''}</h3>
      ${Game.queue.map((e,i)=>{
        const st = entryCanRun(e);
        // 条目前的小像：讨伐取目标异兽像，采集 / 制作取该行动的技艺像，一眼认得出在做什么
        const qiIc = (e.kind === 'taofa' && typeof beastIcon === 'function')
          ? `<span class="qi-ic">${beastIcon({ id:e.target })}</span>`
          : (typeof skillIcon === 'function' && entryDef(e) && entryDef(e).skill
            ? `<span class="qi-ic">${skillIcon(entryDef(e).skill, 18)}</span>` : '');
        return `<div class="queue-item ${Game.queueIdx===i&&Game.queueRunning?'cur':''} ${st.ok?'':'blocked'}">
          <span class="qi-idx">${i+1}</span>
          <span class="qi-name">${qiIc}${esc(entryLabel(e))}</span>
          <span class="qi-prog">${esc(entryProgressText(e))}</span>
          <span class="qi-eta">约 ${fmtTime(estimateEntrySeconds(e))}</span>
          ${!st.ok?`<span class="qi-reason">${esc(st.reason)}</span>`:''}
          <span class="qi-btns">
            <button class="btn tiny" onclick="moveQueueEntry('${e.id}',-1);UI.renderQueue()">↑</button>
            <button class="btn tiny" onclick="moveQueueEntry('${e.id}',1);UI.renderQueue()">↓</button>
            <button class="btn tiny" onclick="removeQueueEntry('${e.id}');UI.renderQueue()">✕</button>
          </span>
        </div>`;
      }).join('') || `<div class="hint">队列为空。不知从何开始？点「快速挂机」按当前可达成目标自动排好巡历队列。</div>`}
      <div class="queue-ctrl">
        <button class="btn ${Game.queueRunning?'':'primary'}" onclick="toggleQueue();UI.renderQueue()">${Game.queueRunning?'暂停':'启动'}</button>
        <button class="btn" onclick="quickIdlePreset()" title="按当前可达成目标自动排好巡历队列并启动">${typeof markIcon==='function'?markIcon('bolt',15):'⚡'} 快速挂机</button>
        <label><input type="checkbox" ${Game.queueLoop?'checked':''} onchange="Game.queueLoop=this.checked;saveGame()"> 循环</label>
        <button class="btn" onclick="clearQueue();UI.renderQueue()">清空</button>
        <span class="hint">已完成 ${Game.queueRound} 轮</span>
      </div>
      <div class="fallback-box">
        <h4>兜底动作</h4>
        <div class="filter-row">
          ${Object.entries(ActionKinds).map(([k,d])=>
            `<button class="chip-btn ${fb&&fb.kind===k?'on':''}" onclick="setFallback('${k}',(actionTargets('${k}')[0]||{}).id||'',1);UI.renderQueue()">${typeof skillIcon==='function'?skillIcon(d.skill,15):d.icon} ${d.label}</button>`).join('')}
          <button class="chip-btn ${fb&&fb.kind==='idle'?'on':''}" onclick="setFallback('idle','',1);UI.renderQueue()">空闲</button>
        </div>
        ${fb&&fb.kind!=='idle'?`<div class="hint">当前兜底：${esc(entryLabel({kind:fb.kind,target:fb.target}))} ×${fb.qty}</div>`:''}
      </div>
      <div class="offline-line">${typeof markIcon==='function'?markIcon('moon',13):'🌙'} 离线：上限 <b>${offlineCapHours()}h</b> · 效率 <b>×${offlineEff().toFixed(2)}</b>${Game.queue.length?` · 当前队列将计入离线结算`:''}${(function(){ const p = estimateOfflineGains(); if (!p || p.xp<=0) return ''; const ks = Object.keys(p.items); const it = ks.length?`、+${fmt(p.items[ks[0]])} ${esc((Items[ks[0]]||{}).name||ks[0])}`:''; return ` · 挂满约 +${fmt(p.xp)} 经验${it}`; })()}</div>
    </div>
    <div class="panel queue-add">
      <h3>添加任务</h3>
      <div class="form-row"><span>行动</span>
        <select onchange="UI.queueKind=this.value;UI.renderQueue()">
          ${Object.entries(ActionKinds).map(([k,d])=>`<option value="${k}" ${this.queueKind===k?'selected':''}>${d.label}</option>`).join('')}
        </select></div>
      <div class="form-row"><span>目标</span>
        <select id="queueTarget">
          ${targets.map(t=>`<option value="${t.id}">${esc(t.name)}（${t.lvl}）</option>`).join('')}
        </select></div>
      <div class="form-row"><span>数量</span><input id="queueQty" type="number" value="10" min="1"></div>
      <button class="btn primary" onclick="addQueueTask()">加入队列</button>
      <div class="hint">采集类按产出个数计数，制作类按次数计数，讨伐按次数计数。</div>
    </div>
  </div>`;
  box.innerHTML = html;
};
// 巡历队列就地补绘：进度计数 / 当前标记 / 阻塞原因 / 完成轮数。
// 队列在跑时每秒（以及每次动作完成时）调用，只改文本与 class，
// 不重建 DOM——保滚动位置、保「添加任务」表单的填写状态。
UI.patchQueueProgress = function(){
  if (this.currentTab !== 'queue') return;
  const box = $('content');
  if (!box) return;
  const items = box.querySelectorAll('.queue-item');
  Game.queue.forEach((e, i)=>{
    const el = items[i];
    if (!el) return;
    const st = entryCanRun(e);
    const prog = el.querySelector('.qi-prog');
    const txt = entryProgressText(e);
    if (prog && prog.textContent !== txt) prog.textContent = txt;
    el.classList.toggle('cur', Game.queueIdx === i && Game.queueRunning);
    el.classList.toggle('blocked', !st.ok);
    let reason = el.querySelector('.qi-reason');
    if (!st.ok){
      if (!reason){
        reason = document.createElement('span');
        reason.className = 'qi-reason';
        el.appendChild(reason);
      }
      if (reason.textContent !== st.reason) reason.textContent = st.reason;
    } else if (reason){
      reason.remove();
    }
  });
  const hint = box.querySelector('.queue-ctrl .hint');
  if (hint){
    const t = `已完成 ${Game.queueRound} 轮`;
    if (hint.textContent !== t) hint.textContent = t;
  }
};
function addQueueTask(){
  const target = $('queueTarget') ? $('queueTarget').value : '';
  const qty = $('queueQty') ? parseInt($('queueQty').value)||10 : 10;
  if (!target){ UI.toast('请选择目标'); return; }
  addQueueEntry(UI.queueKind, target, qty);
  UI.renderQueue();
}
window.addQueueTask = addQueueTask;

// ================= 行装 =================
// 一键最优装：换上行囊中同槽位最强的一件（按装备评分比较，等级不足者不换）
UI.autoEquipBest = function(){
  if (typeof equipBest !== 'function'){ this.toast('装备功能未就绪'); return; }
  let changes = [];
  try { changes = equipBest() || []; } catch(e){ this.toast('一键最优装失败：' + e.message); return; }
  this.toast(changes.length ? ('已换上最优装：' + changes.join('；')) : '行囊中暂无更优的装备');
  this.renderPack();
};
UI.renderPack = function(){
  const box = $('content');
  if (!box) return;
  const slots = Object.keys(GearSlotLabels);
  const inv = Object.entries(Game.inventory).filter(([id,q])=>q>0);
  inv.sort((a,b)=>{
    if (this.invSort==='value') return (Items[b[0]].value||0)-(Items[a[0]].value||0);
    if (this.invSort==='qty') return b[1]-a[1];
    return 0;
  });
  let html = `<div class="pack-wrap">
    <div class="panel gear-panel">
      <h3>装备<button class="btn small gear-best" type="button" onclick="UI.autoEquipBest()">一键最优装</button></h3>
      <div class="tile-grid gear-grid">
      ${slots.map(slot=>{
        const g = Game.gear[slot];
        return `<div class="tile gear-tile ${g?'':'empty'} ${g?rarityClass(g):''}"
             ${g?`title="${esc(g.name)} · ${esc(gearSubText(g))}" onclick="showItemDetail('${g.id}')"`:`title="${GearSlotLabels[slot]}·空"`}>
          <span class="gt-label">${GearSlotLabels[slot]}</span>
          ${g?`<span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(g.id||g):g.icon}</span>
               <span class="tile-nm">${esc(g.name)}</span>
               ${(typeof enhanceLevel==='function'&&enhanceLevel(g.id||g)>0)?`<span class="gt-enh">+${enhanceLevel(g.id||g)}</span>`:''}
               <button class="tile-more" type="button" title="卸下" onclick="event.stopPropagation();unequip('${slot}',false);UI.renderPack()">脱</button>`
             :`<span class="gt-empty">空</span>`}
        </div>`;
      }).join('')}
      </div>
    </div>
    <div class="panel inv-panel">
      <h3>行囊</h3>
      <div class="filter-row">
        <button class="chip-btn ${this.invSort==='default'?'on':''}" onclick="UI.invSort='default';UI.renderPack()">默认</button>
        <button class="chip-btn ${this.invSort==='value'?'on':''}" onclick="UI.invSort='value';UI.renderPack()">价值↓</button>
        <button class="chip-btn ${this.invSort==='qty'?'on':''}" onclick="UI.invSort='qty';UI.renderPack()">数量↓</button>
        <span class="hint">仓廪暂无，材料尽在行囊</span>
      </div>
      <div class="bulk-sell">
        <div class="bs-head">
          <span class="bs-title">廛市清整</span>
          <span class="hint">售出<b>档位及以下</b>的原材料；食物 / 药品 / 装备 / 嘉种 / 嘉谷不碰</span>
        </div>
        <div class="filter-row">
          ${SELL_RARITY_ORDER.slice(0,4).map(r=>`<button class="chip-btn ${this.packSellTier===r?'on':''}" onclick="UI.packSellTier='${r}';UI.renderPack()">${rarityName({rarity:r})}</button>`).join('')}
        </div>
        ${(()=>{
          const p = bulkSellPreview(this.packSellTier||'COMMON');
          if (!p.rows.length) return '<div class="hint">当前档位下没有可清的原材料</div>';
          const top = p.rows.slice(0,4).map(r=>`${typeof itemIc==='function'?itemIc(r.id,13):r.icon}${esc(r.name)}×${r.qty}`).join('　');
          const more = p.rows.length>4 ? `　等 ${p.rows.length} 种` : '';
          return `<div class="bs-preview">${top}${more}</div>
            <div class="bs-act">
              <span class="bs-total">共 <b>${p.count}</b> 件 · 约得 <b class="zhu-num">${fmt(p.total)}</b> 贝</span>
              <button class="btn primary" onclick="bulkSellRun()">清整售出</button>
            </div>`;
        })()}
      </div>
      <div class="inv-grid">
      ${inv.map(([id,q])=>{
        const it = Items[id];
        return `<div class="inv-card ${rarityClass(it)}" onclick="showItemDetail('${id}')">
          <span class="ic-icon">${typeof itemIc==='function'?itemIc(id,20):it.icon}</span>
          <span class="ic-name">${nameTag(it.name, it.py)}</span>
          <span class="ic-qty">×${q}</span>
          <span class="ic-val">${(it.value||0)*q} 贝</span>
        </div>`;
      }).join('') || '<div class="hint">行囊空空</div>'}
      </div>
    </div>
  </div>`;
  box.innerHTML = html;
};
// 廛市清整：确认后按当前阈值批量售出（modal 二次确认，防误触）
function bulkSellRun(){
  const tier = UI.packSellTier || 'COMMON';
  const p = bulkSellPreview(tier);
  if (!p.rows.length){ UI.toast('没有可清的原材料'); return; }
  const top = p.rows.slice(0,5).map(r=>`${typeof itemIc==='function'?itemIc(r.id,13):r.icon}${esc(r.name)}×${r.qty}`).join('　');
  const more = p.rows.length>5 ? `　等 ${p.rows.length} 种` : '';
  UI.modal(`
    <h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('scale',17):'⚖️'}</span> 廛市清整</h3>
    <p class="hint">将以「${rarityName({rarity:tier})}」及以下的价格，售出行囊中的原材料。食物 / 药品 / 装备 / 嘉种 / 嘉谷不在其列。</p>
    <div class="panel" style="margin:10px 0"><div class="yield-row"><b>所售</b>${top}${more}</div></div>
    <div class="form-row"><span>件数</span><b>${p.count}</b></div>
    <div class="form-row"><span>约得贝币</span><b style="color:var(--gamboge)">+${fmt(p.total)}</b></div>
    <div class="modal-btns">
      <button class="btn" onclick="UI.closeModal()">再想想</button>
      <button class="btn primary" onclick="UI.closeModal();bulkSellCommit()">确认售出</button>
    </div>
  `);
}
function bulkSellCommit(){
  const r = bulkSell(UI.packSellTier || 'COMMON');
  if (r.gain > 0){
    UI.toast(`⚖️ 清整 ${r.count} 件，得贝 ${fmt(r.gain)}`);
    log(`⚖️ 廛市清整 ${r.count} 件，得贝 ${fmt(r.gain)}`, 'gold', 'trade');
  }
  UI.renderPack();
}
function gearSubText(g){
  const parts = [];
  const lv = (typeof enhanceLevel === 'function') ? enhanceLevel(g.id || g) : 0;
  const sc = v => Math.floor((typeof enhanceScaled === 'function') ? enhanceScaled(v, lv) : v);
  if (g.dmg) parts.push(`伤害 ${sc(g.dmg)}${lv?`（+${lv}）`:''}`);
  if (g.def) parts.push(`防御 ${sc(g.def)}${lv?`（+${lv}）`:''}`);
  if (g.axePower) parts.push(`斧力 ${g.axePower}`);
  if (g.pickPower) parts.push(`镐力 ${g.pickPower}`);
  if (g.netPower) parts.push(`网力 ${g.netPower}`);
  if (g.el) parts.push(g.el+'属');
  if (g.effect) parts.push(g.effect);
  return parts.join(' · ');
}
function showItemDetail(itemId){
  const it = Items[itemId];
  if (!it) return;
  const qty = Game.inventory[itemId]||0;
  const rec = Game.records[itemId];
  const actions = [];
  if (it.equip){
    const ok = (it.lvl||1) <= relevantLevel(it);
    actions.push(`<button class="btn ${ok?'primary':''}" ${ok?'':'disabled'} onclick="equipItem('${itemId}');UI.closeModal()">装备${ok?'':'（需'+requiredSkillName(it)+' '+it.lvl+'）'}</button>`);
  }
  if (it.heal || it.buff) actions.push(`<button class="btn primary" onclick="useConsumable('${itemId}');UI.closeModal()">${it.heal?'食用':'服用'}</button>`);
  // 淬炼：装备专属长线投入（+9 上限，每级 +6% 基础伤害 / 防御）
  const enhLv = (typeof enhanceLevel === 'function') ? enhanceLevel(itemId) : 0;
  const enhCost = (typeof enhanceCost === 'function') ? enhanceCost(itemId) : null;
  if (it.equip && (it.dmg || it.def) && enhCost){
    const base = it.dmg || it.def;
    const now = Math.floor(enhanceScaled(base, enhLv));
    const nx = Math.floor(enhanceScaled(base, enhLv + 1));
    const enough = (Game.inventory.tan||0) >= enhCost.tan && Game.shells >= enhCost.shells;
    actions.push(enhLv < 9
      ? `<button class="btn ${enough?'primary':''}" ${enough?'':'disabled'} onclick="enhanceItem('${itemId}');UI.closeModal();UI.renderPack()">淬炼 +${enhLv+1}（炭×${enhCost.tan} · ${enhCost.shells} 贝）</button>`
      : `<button class="btn" disabled>已至 +9</button>`);
  }
  // 词条：与淬炼并行的第二条养成线——淬炼抬基础值，词条换战斗乘区
  const hasAffix = it.equip && typeof affixSlotOf === 'function' && affixSlotOf(it);
  const afList = hasAffix ? affixOf(itemId) : [];
  const afCost = hasAffix ? affixReforgeCost(itemId) : null;
  if (hasAffix && afCost){
    const afOk = (Game.inventory.tan || 0) >= afCost.tan && Game.shells >= afCost.shells;
    actions.push(`<button class="btn ${afOk ? 'primary' : ''}" ${afOk ? '' : 'disabled'} onclick="reforgeItem('${itemId}');UI.closeModal();UI.renderPack()">重铸词条（炭×${afCost.tan} · ${afCost.shells} 贝）</button>`);
  }
  if (it.value) actions.push(`<button class="btn" onclick="sellItem('${itemId}',1);UI.closeModal()">出售 1（${sellValue(itemId,1)} 贝）</button>`);
  UI.modal(`<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(itemId,18):it.icon}</span> ${esc(it.name)} <span class="tier">${rarityName(it)}</span></h3>
    <div class="meta">行囊 ${qty} 件${rec?` · 著录 ${rec.count} 次（${TUNING.MASTERY.NAMES[rec.tier]}）`:''}</div>
    ${it.form?`<div class="reveal"><b>形态</b>${esc(it.form)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
    ${it.note?`<div class="reveal"><b>出处</b>${esc(it.note)}</div>`:''}
    ${it.equip&&(it.dmg||it.def)?`<div class="reveal"><b>淬炼</b>+${enhLv} · ${it.dmg?'伤害':'防御'} ${Math.floor(enhanceScaled(it.dmg||it.def, enhLv))} → 下一级 ${Math.floor(enhanceScaled(it.dmg||it.def, enhLv+1))}（炭×${enhCost.tan} · ${enhCost.shells} 贝）</div>`:''}
    ${afList.length?`<div class="reveal"><b>词条</b>${afList.map(x=>`<span class="af-txt"><i>${esc(x.name)}</i>${esc(x.text)}</span>`).join('')}</div>`:''}
    ${it.buff?`<div class="reveal"><b>服用</b>${esc(it.buff.name)}（${it.buff.dur}s）</div>`:''}
    ${it.heal?`<div class="reveal"><b>食用</b>回血 ${it.heal}</div>`:''}
    <div class="modal-btns">${actions.join('')}<button class="btn" onclick="UI.closeModal()">闭</button></div>`);
}
window.showItemDetail = showItemDetail;

// ================= 统计 =================
UI.renderStats = function(){
  const box = $('content');
  if (!box) return;
  const s = Game.stats;
  const gatherRows = Object.entries(s.gathers||{}).map(([k,v])=>`<span>${Skills[k]?Skills[k].name:k} <b data-gather="${k}">${v}</b></span>`).join('') || '<span class="hint">未采</span>';
  box.innerHTML = `<div class="stat-grid">
    <div class="panel stat-panel"><h3>讨伐</h3>
      <div class="stat-rows">
        <span>击杀 <b data-stat="kills">${s.kills}</b></span>
        <span>败北 <b data-stat="deaths">${s.deaths}</b></span>
        <span>六凶 <b data-stat="bosses">${Object.keys(s.bossKills||{}).length}/7</b></span>
        <span>造成伤害 <b data-stat="damageDealt">${fmt(s.damageDealt)}</b></span>
        <span>承受伤害 <b data-stat="damageTaken">${fmt(s.damageTaken)}</b></span>
      </div></div>
    <div class="panel stat-panel"><h3>采集 / 制作</h3>
      <div class="stat-rows">
        <span>动作总数 <b data-stat="actions">${s.actions}</b></span>
        <span>收获 <b data-stat="harvests">${s.harvests}</b></span>
        <span>制作次数 <b data-stat="crafts">${s.crafts}</b></span>
        <span>行祭 <b data-stat="rites">${s.rites}</b></span>
        <span>观象 <b data-stat="observes">${s.observes}</b></span>
        <span>卜筮 <b data-stat="divines">${s.divines}</b></span>
      </div>
      <div class="stat-rows gather-rows">${gatherRows}</div></div>
    <div class="panel stat-panel"><h3>商旅</h3>
      <div class="stat-rows">
        <span>贝币 <b data-stat="shells">${fmt(Game.shells)}</b></span>
        <span>累计收入 <b data-stat="totalEarned">${fmt(s.totalEarned)}</b></span>
        <span>买入 <b data-stat="purchases">${s.purchases}</b> 次</span>
        <span>卖出 <b data-stat="sales">${s.sales}</b> 次</span>
      </div></div>
    <div class="panel stat-panel"><h3>著录</h3>
      <div class="stat-rows">
        <span>已录 <b data-stat="recorded">${recordedCount()}/${Object.keys(CODEX).length}</b></span>
        <span>山已涉 <b data-stat="nodes">${Object.keys(Game.map).length}/${WORLD.regions.reduce((s,r)=>s+r.nodes.length,0)}</b></span>
        <span>观象处 <b data-stat="observed">${Object.values(Game.observed).filter(Boolean).length}/${Object.keys(OBSERVE_SITES).length}</b></span>
        <span>营造 <b data-stat="buildings">${Object.keys(Game.buildings).length}/${Object.keys(BUILDINGS).length}</b></span>
      </div></div>
    <div class="panel stat-panel"><h3>长线成就</h3>
      <div class="stat-rows ms-rows">
        ${(window.Milestones||[]).map((ms,i)=>`<span data-ms="${i}" class="${ms.check()?'done':''}"><span class="ms-mark">${ms.check()?(typeof markIcon==='function'?markIcon('check',13):'✔'):'<span class="ms-open"></span>'}</span> ${esc(ms.name)}<i>${esc(ms.bonus)}</i></span>`).join('')}
      </div></div>
    <div class="panel stat-panel"><h3>时间 / 离线</h3>
      <div class="stat-rows">
        <span>在册时长 <b data-stat="time">${fmtTime(s.time)}</b></span>
        <span>本次会话 <b data-stat="session">${fmtTime((Date.now()-Game.startedAt)/1000)}</b></span>
        <span>离线上限 <b>${offlineCapHours()} 小时</b></span>
        <span>离线效率 <b>${Math.round(offlineEff()*100)}%</b></span>
      </div>
      <div class="stat-rows off-rows">
        <span>离线结算 <b data-stat="offlineCount">${s.offlineCount || 0}</b> 次</span>
        <span>累计离线 <b data-stat="offlineSec">${fmtTime(s.offlineSec || 0)}</b></span>
        <span>离线经验 <b data-stat="offlineXp">${fmt(s.offlineXp || 0)}</b></span>
        <span>离线所得 <b data-stat="offlineItems">${fmt(s.offlineItems || 0)}</b> 件</span>
        <span class="off-last">上次离线 <b data-stat="lastOffline">${lastOfflineText()}</b></span>
      </div></div>
    <div class="panel stat-panel save-panel"><h3>存档</h3>
      <div class="stat-rows">
        <button class="btn" onclick="saveGame();UI.toast('已存档')">手动存档（S）</button>
        <button class="btn" onclick="exportSave()">导出存档</button>
        <button class="btn" onclick="importSave()">导入存档</button>
        <button class="btn danger" onclick="resetGame()">重置进度</button>
      </div>
      <div class="hint">导出为一段 JSON 文本，可收藏；导入会校验字段。</div>
    </div>
    <div class="panel log-panel"><h3>日志</h3>
      <div class="filter-row">
        ${[['all','全部'],['skill','技能'],['combat','讨伐'],['trade','商旅'],['omen','征兆'],['sys','系统']].map(([k,v])=>
          `<button class="chip-btn ${this.logFilter===k?'on':''}" onclick="UI.logFilter='${k}';UI.renderLog()">${v}</button>`).join('')}
      </div>
      <div class="log-list" id="logList"></div>
    </div>
  </div>`;
  this.renderLog();
  // 统计页数值就地刷新：每 0.8 秒重写带标记的节点，不重建整页
  // （重建会打断滚动、让日志闪一下，按钮焦点也会丢）。离开本页即自行停表。
  if (this._statTicker) clearInterval(this._statTicker);
  this._statTicker = setInterval(() => {
    if (this.currentTab !== 'stats'){ clearInterval(this._statTicker); this._statTicker = null; return; }
    UI.patchStats();
  }, 800);
};
// 点按不可制作的方块：说清差在哪（缺哪几样材料，差多少）
UI.craftDenied = function(key){
  const [type, out] = String(key || '').split('::');
  const rec = Recipes.find(r => r.type === type && r.out === out);
  if (!rec) return;
  const sk = mapRecipeSkill(type);
  if (levelOf(sk) < rec.lvl){ UI.toast(`🔒 需${Skills[sk].name} ${rec.lvl} 级`); return; }
  const lacks = rec.cost.filter(([id, q]) => totalOf(id) < q)
    .map(([id, q]) => `${(Items[id] || {}).name || id} ${totalOf(id)}/${q}`);
  UI.toast(lacks.length ? `原料不足：缺 ${lacks.join('、')}` : '原料不足');
};
// ================= 叙录（关于本作） =================
// 「叙录」者，古者校书，每一书毕，条其篇目、撮其指意而奏之。
// 此页答三问：此为何书、书中所志何物、此刻是何版本。
UI.renderAbout = function(){
  const box = $('content');
  if (!box) return;
  const M = (typeof GAME_META !== 'undefined') ? GAME_META
        : { name:'山海经 · 著录', version:'—', codename:'—', updated:'—', form:'—', license:'—' };
  const s = Game.stats;
  const monsterIds = Object.keys(Monsters);
  const bossCount = monsterIds.filter(id => Monsters[id].boss).length;
  const nodeCount = WORLD.regions.reduce((a, r) => a + r.nodes.length, 0);
  const codexDone = recordedCount(), codexTotal = Object.keys(CODEX).length;
  const qLen = (Game.queue && Game.queue.length) || 0;

  // 成书一栏：左名右值，行间细虚线（古书目录的「某卷·某篇」做派）
  const rows = (list) => list.map(([k, v]) =>
    `<div class="ab-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  // 卷帙一栏：方格计数，一望便知这部书有多大
  const cells = (list) => list.map(([k, v]) =>
    `<span><i>${esc(k)}</i><b>${esc(v)}</b></span>`).join('');

  const facts = rows([
    ['版本', 'v' + M.version],
    ['代号', M.codename],
    ['更新', M.updated],
    ['形态', M.form],
    ['存档', 'localStorage · 可导出导入'],
    ['在册', fmtTime(s.time)],
  ]);

  // 中山经 197 山是否全录（全书收卷的判据：五臧山经最后一系补完）
  const zsTotal = (typeof ZHONGSHAN !== 'undefined')
    ? ZHONGSHAN.regions.reduce((a, r) => a + r.nodes.length, 0) : 0;
  const volumes = cells([
    ['山系', WORLD.regions.length + ' 系'],
    ['山川', nodeCount + ' 山'],
    ['山经', zsTotal + ' / 197 山'],
    ['异兽', monsterIds.length + ' 只'],
    ['六凶', bossCount + ' 首'],
    ['图鉴', codexDone + ' / ' + codexTotal + ' 条'],
    ['技艺', Object.keys(Skills).length + ' 门'],
    ['征兆', Object.keys(OMENS).length + ' 兆'],
    ['祠礼', Object.keys(RITES).length + ' 套'],
    ['观象处', Object.keys(OBSERVE_SITES).length + ' 处'],
    ['营造', Object.keys(BUILDINGS).length + ' 栋'],
  ]);

  const flow = ['舆地','采集','著录','制作','御使','祠祀']
    .map(t => `<span>${t}</span>`).join('<i>→</i>');

  box.innerHTML = `
  <div class="about-wrap"><div class="panel about-panel">
    <div class="ab-head">
      <span class="ab-seal" aria-hidden="true"><i>叙</i><i>录</i></span>
      <div class="ab-title">
        <h3>${esc(M.name)}</h3>
        <p class="hint">v${esc(M.version)} · ${esc(M.codename)} · ${esc(M.updated)}</p>
      </div>
      ${zsTotal >= 197 ? `<span class="ab-complete" title="五臧山经一百九十七山全录">五臧全录</span>` : ''}
    </div>

    <section class="ab-sec">
      <h4>缘起</h4>
      <p class="ab-p">昔者洪水滔天，禹疏九河、随山刊木，所至命人记其山川：某山之首，其上多玉，其下多铜；有兽焉，其状如禺而白耳，食之善走。伯益受而次之，是为《五藏山经》。</p>
      <p class="ab-p">其书不记人事，唯志山海——草木之形、金石之藏、鸟兽之状、神灵之礼，与其吉凶之兆。文极简而物极繁，四万余言之间，载山四百四十有七、异兽三百余、物产六百余，皆先民耳目所及，非尽虚妄。</p>
      <p class="ab-p">后人重其辞而疑其物，遂以志怪目之。然所谓「怪」者，不过未识之名、未至之地耳。</p>
    </section>

    <section class="ab-sec">
      <h4>此身</h4>
      <p class="ab-p">君今受命为<b>著录者</b>，负简执笔，自南山发轫。循五方之经，涉大川、登危峰，录其物产，志其异兽，礼其山神。</p>
      <p class="ab-p">录之愈广，简帙愈厚；简帙既盈，此卷遂成——<b>游之终，即经之成</b>。</p>
    </section>

    <section class="ab-sec">
      <h4>体例</h4>
      <div class="ab-flow">${flow}</div>
      <div class="ab-list">
        <div><b>舆地</b>择山而行。每山之志，载其形胜、物产、异兽与神话，一目了然。</div>
        <div><b>采集</b>樵采 / 采玉 / 渔 / 采药。点一处即动身前往，随即开工，所得入行囊。</div>
        <div><b>著录</b>把所得记成条目。历始见 · 略识 · 通形 · 得御 · 穷理五阶，阶阶累加其效。</div>
        <div><b>制作</b>制器 / 烹饪 / 炼药 / 营建。材料不足会直说缺哪样、差多少。</div>
        <div><b>征伐</b>五行相克 ×1.35、被克 ×0.75、相生 ×1.15。同兽连杀经验递减，六凶为终战。</div>
        <div><b>御使</b>著录至「通形」的异兽可入槽，化作被动增益与自动作业。</div>
        <div><b>祠祀</b>二十八套礼制，行祭得山系增益；吉凶之兆随之而动，可禳可解。</div>
        <div><b>离线</b>离山亦不停笔，归来按效率一并结算，不令一日虚度。</div>
      </div>
    </section>

    <section class="ab-sec">
      <h4>卷帙</h4>
      <div class="ab-stats">${volumes}</div>
    </section>

    <section class="ab-sec">
      <h4>稽考</h4>
      <p class="ab-p">底本：中华书局点校本《山海经校注》（袁珂），参校维基文库、中国哲学书电子化计划（ctext）等多本；原著属公有领域，异文随条标注，异体字从通行写法。</p>
      <p class="ab-p">自研：全部数值、机制、条目命名与界面排版均为本项目自行设计调参，未沿用任何既有产品；玩法骨架取放置类通用设计。</p>
      <p class="ab-p">免责：本作与任何商业产品无关联，内容仅供学习与娱乐，非学术考据定本。</p>
    </section>

    <section class="ab-sec">
      <h4>成书</h4>
        <div class="ab-kv">${facts}</div>
        <p class="hint ab-note">纯前端、无账号、无后端，进度只存于此设备的浏览器。清缓存或换设备前，记得在「统计」页导出存档。</p>
      </section>
    </div></div>`;
};

// 逐项改写统计数值；只在值真的变了才碰 DOM，避免无谓重排
UI.patchStats = function(){
  if (this.currentTab !== 'stats') return;
  const s = Game.stats;
  const totalNodes = WORLD.regions.reduce((a, r) => a + r.nodes.length, 0);
  const vals = {
    kills: String(s.kills), deaths: String(s.deaths),
    bosses: Object.keys(s.bossKills || {}).length + '/7',
    damageDealt: fmt(s.damageDealt), damageTaken: fmt(s.damageTaken),
    actions: String(s.actions), harvests: String(s.harvests), crafts: String(s.crafts),
    rites: String(s.rites), observes: String(s.observes), divines: String(s.divines),
    shells: fmt(Game.shells), totalEarned: fmt(s.totalEarned),
    purchases: String(s.purchases), sales: String(s.sales),
    recorded: recordedCount() + '/' + Object.keys(CODEX).length,
    nodes: Object.keys(Game.map).length + '/' + totalNodes,
    observed: Object.values(Game.observed).filter(Boolean).length + '/' + Object.keys(OBSERVE_SITES).length,
    buildings: Object.keys(Game.buildings).length + '/' + Object.keys(BUILDINGS).length,
    time: fmtTime(s.time),
    session: fmtTime((Date.now() - Game.startedAt) / 1000),
    offlineCount: String(s.offlineCount || 0),
    offlineSec: fmtTime(s.offlineSec || 0),
    offlineXp: fmt(s.offlineXp || 0),
    offlineItems: fmt(s.offlineItems || 0),
    lastOffline: lastOfflineText(),
  };
  for (const k of Object.keys(vals)){
    const el = document.querySelector(`[data-stat="${k}"]`);
    if (el && el.textContent !== vals[k]) el.textContent = vals[k];
  }
  for (const [k, v] of Object.entries(s.gathers || {})){
    const el = document.querySelector(`[data-gather="${k}"]`);
    if (el && el.textContent !== String(v)) el.textContent = String(v);
  }
  (window.Milestones || []).forEach((ms, i) => {
    const el = document.querySelector(`[data-ms="${i}"]`);
    if (!el) return;
    const ok = !!ms.check();
    el.classList.toggle('done', ok);
    // 首个子节点是达成标记（矢量小图或未达成的空心圈），状态变化时重绘它
    const mark = el.firstElementChild;
    if (mark && mark.classList && mark.classList.contains('ms-mark')){
      mark.innerHTML = ok
        ? (typeof markIcon === 'function' ? markIcon('check',13) : '✔')
        : '<span class="ms-open"></span>';
    }
  });
};
// 方块的「行祭」：先校验等级与祭品，缺什么说清楚
UI.tryRite = function(id){
  const rec = Recipes.find(r => r.type === 'rite' && r.out === id);
  if (!rec) return;
  if (levelOf('jisi') < rec.lvl){ UI.toast(`🔒 需祭祀 ${rec.lvl} 级`); return; }
  if (!canAfford(rec.cost)){
    const lacks = rec.cost.filter(([iid, q]) => totalOf(iid) < q)
      .map(([iid, q]) => `${(Items[iid] || {}).name || iid} ${totalOf(iid)}/${q}`);
    UI.toast(lacks.length ? `祭品不足：缺 ${lacks.join('、')}` : '祠礼材料不备');
    return;
  }
  performRite(id);
  UI.renderJisi();
};
UI.renderLog = function(){
  const box = $('logList');
  if (!box) return;
  const rows = this.logEntries.filter(e=>this.logFilter==='all'||e.cat===this.logFilter).slice(0, 300);
  box.innerHTML = rows.map(e=>`<div class="log-row" style="color:${LOG_COLORS[e.color]||'inherit'}">${markHtml(e.msg,14)}</div>`).join('')
    || '<div class="hint">暂无记录</div>';
};
function exportSave(){
  const txt = exportSaveText();
  UI.modal(`<h3>导出存档</h3><textarea readonly onclick="this.select()">${esc(txt)}</textarea>
    <div class="modal-btns"><button class="btn" onclick="UI.closeModal()">闭</button></div>`);
}
function importSave(){
  UI.modal(`<h3>导入存档</h3>
    <textarea id="importBox" placeholder="粘贴存档 JSON……"></textarea>
    <div class="modal-btns"><button class="btn primary" onclick="doImport()">导入</button>
    <button class="btn" onclick="UI.closeModal()">取消</button></div>`);
}
function doImport(){
  const box = $('importBox');
  const r = importSaveText(box ? box.value : '');
  if (r.ok){ UI.closeModal(); UI.toast('导入成功'); UI.refreshAll(); }
  else UI.toast('导入失败：' + r.reason);
}
function resetGame(){
  UI.modal(`<h3>重置进度</h3><p>此举将清除本地存档，重新受命。确定？</p>
    <div class="modal-btns"><button class="btn danger" onclick="resetToDefault();UI.closeModal();UI.refreshAll();UI.toast('已重置')">确定重置</button>
    <button class="btn" onclick="UI.closeModal()">取消</button></div>`);
}
window.exportSave = exportSave; window.importSave = importSave;
window.doImport = doImport; window.resetGame = resetGame;

// ---------- 渲染当前页 ----------
function renderCurrent(){ UI.renderCurrent(); }
window.renderCurrent = renderCurrent;

// 移动端左右滑切换页签
function bindSwipeGestures(){
  const el = $('content') || $('app');
  if (!el || typeof el.addEventListener !== 'function') return;
  let sx = 0, sy = 0;
  el.addEventListener('touchstart', e=>{ const t = e.changedTouches && e.changedTouches[0]; if (t){ sx = t.clientX; sy = t.clientY; } }, { passive:true });
  el.addEventListener('touchend', e=>{
    const t = e.changedTouches && e.changedTouches[0]; if (!t) return;
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) UI.switchTabNeighbor(dx < 0 ? 1 : -1);
  }, { passive:true });
}

// ================= 详情浮层（PC 悬停 / 移动端底部抽屉） =================
// 用法：<button class="..." data-tip>摘要<span class="tip-body hidden">详情HTML</span></button>
// PC：悬停锚点即出浮层；移动端 / 触屏：点按锚点切换。窄屏下浮层贴底变为
// 底部抽屉（bottom sheet），宽屏为跟随锚点的浮层（边界自动翻转）。
const Tip = { el:null, anchor:null };
function tipBodyOf(anchor){
  if (!anchor || !anchor.children) return null;
  for (const c of anchor.children) if (c.classList && c.classList.contains('tip-body')) return c;
  return null;
}
function ensureTipEl(){
  if (Tip.el) return Tip.el;
  const el = document.createElement('div');
  el.id = 'tipLayer';
  el.className = 'hidden';
  el.innerHTML = '<div class="tip-head"><span class="tip-title"></span>'
    + '<button class="tip-close" type="button" title="关闭">✕</button></div>'
    + '<div class="tip-content"></div>';
  (document.body || document.documentElement).appendChild(el);
  Tip.el = el;
  return el;
}
function tipNarrow(){ return window.matchMedia && window.matchMedia('(max-width:720px)').matches; }
function showTipFor(anchor){
  const body = tipBodyOf(anchor);
  if (!body) return;
  const el = ensureTipEl();
  el.querySelector('.tip-content').innerHTML = body.innerHTML;
  const title = anchor.getAttribute && anchor.getAttribute('data-tip-title');
  const head = el.querySelector('.tip-head');
  el.querySelector('.tip-title').textContent = title || '';
  head.classList.toggle('no-title', !title);
  el.classList.remove('hidden');
  Tip.anchor = anchor;
  positionTip();
  // 窄屏底部抽屉：实测高度回填 --sheet-h，悬浮按钮据此上移避让
  if (tipNarrow()){
    if (document.body) document.body.classList.add('tip-open');
    document.documentElement.style.setProperty('--sheet-h', el.offsetHeight + 'px');
  }
}
function positionTip(){
  const el = Tip.el, a = Tip.anchor;
  if (!el || !a || tipNarrow()) return;   // 窄屏由 CSS 贴底，JS 不定位
  const r = a.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
  let top = r.bottom + 8;
  if (top + h > vh - 8) top = Math.max(8, r.top - h - 8);   // 下方不够 → 翻到上方
  el.style.left = Math.round(left) + 'px';
  el.style.top = Math.round(top) + 'px';
}
function hideTip(){
  if (Tip.el) Tip.el.classList.add('hidden');
  if (document.body) document.body.classList.remove('tip-open');
  Tip.anchor = null;
}
// 事件委托：动态渲染的内容无需重新绑定
// 触屏点按会先合成 mouseover 再触发 click，若不区分模态，
// 会出现「浮层刚被 mouseover 打开、随即被 click 当成二次点按而关掉」；
// 以 touchstart 时间戳短路悬停逻辑，点按的开合统一交由 click 处理（PC 悬停不受影响）
let lastTouchAt = 0;
const touchJustNow = ()=>Date.now() - lastTouchAt < 700;
document.addEventListener('touchstart', ()=>{ lastTouchAt = Date.now(); }, { passive:true });
// 触屏交互（v1.7 起）：取消 500ms 长按，统一为「单击」——
// 带 onclick 的方块（征伐目标 / 御使异兽）单击即开交互弹窗，弹窗里陈明属性与操作；
// 不带 onclick 的纯展示块单击直接开详情浮层（见下方 click 分支）。
function bindTipEvents(){
  document.addEventListener('mouseover', e=>{
    if (touchJustNow()) return;
    const a = e.target && e.target.closest && e.target.closest('[data-tip]');
    if (!a || Tip.anchor === a) return;
    showTipFor(a);
  });
  document.addEventListener('mouseout', e=>{
    if (touchJustNow()) return;
    const a = e.target && e.target.closest && e.target.closest('[data-tip]');
    if (!a) return;
    // 移入浮层本身不关闭（浮层可短暂停留查看）
    if (e.relatedTarget && Tip.el && Tip.el.contains(e.relatedTarget)) return;
    hideTip();
  });
  document.addEventListener('click', e=>{
    if (e.target && e.target.closest && e.target.closest('.tip-close')){ hideTip(); return; }
    const a = e.target && e.target.closest && e.target.closest('[data-tip]');
    if (a){
      // 锚点内的按钮 / 表单元素自行处理，不触发浮层开关
      if (e.target.closest('button:not(.tip-close), a, select, input, textarea, label')) return;
      // 自带 onclick 的方块：单击交给它（开交互弹窗 / 执行动作），浮层只在悬停时出现
      if (a.hasAttribute && a.hasAttribute('onclick')) return;
      if (Tip.anchor === a){ hideTip(); return; }
      showTipFor(a);
      e.stopPropagation();
      return;
    }
    // 点在浮层外 → 关闭
    if (Tip.anchor && Tip.el && !Tip.el.contains(e.target)) hideTip();
  }, true);
  // 滚动 / 缩放后锚点位置失效，直接关闭
  const onScroll = ()=>hideTip();
  window.addEventListener('scroll', onScroll, { passive:true });
  const ct = $('content');
  if (ct && ct.addEventListener) ct.addEventListener('scroll', onScroll, { passive:true, capture:true });
  window.addEventListener('resize', onScroll);
}
window.showTipFor = showTipFor; window.hideTip = hideTip;

// ---------- 初始化 ----------
function init(){
  loadGame();
  // 同步交给将来的账号系统：启动时不再读取任何自定义云地址 / 令牌。
  // SaveManager 的多端合并与可插拔后端仍保留在 save.js，登录层只需 setCloud 即可接管。
  // 预置已解锁山系，避免开局重复播报起始山系
  Game.stats._unlockedRegions = (WORLD.regions||[]).filter(r=>regionUnlocked(r)).map(r=>r.regionId);
  // 顶栏与导航
  const tabs = $('tabs');
  if (tabs){
    // 移动端：图标栏常驻左侧，「≡ / «」在收起（仅图标）与展开（图标+文字）间切换；PC 端该按钮隐藏
    // 末尾常驻「设置」入口（昼夜 / 玩法说明 / 偏好都在其中），顶栏不再单设图标
    tabs.innerHTML = `<button id="tabExpand" class="tab-expand" type="button" title="展开 / 收起功能菜单" onclick="UI.toggleDrawer()"><span class="ex-open">≡</span><span class="ex-close">«</span></button>`
      + TABS.map((t,i)=>
      `<button class="tab ${t.id===UI.currentTab?'active':''}" data-tab="${t.id}" title="${t.label}${i<10?'（快捷键 '+((i+1)%10)+'）':''}"><span class="tab-ic">${t.icon}</span><span class="tab-tx">${t.label}</span><span class="tab-badge" data-badge="${t.id}"></span></button>`).join('')
      + `<button class="tab tab-tool" type="button" data-tab="settings" title="设置：昼夜 / 玩法说明 / 偏好"><span class="tab-ic">${ICON('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>')}</span><span class="tab-tx">设置</span></button>`;
    // 设置与其他功能同为页签，走同一条切页路径（不再单独绑 onclick）
    tabs.querySelectorAll('.tab').forEach(b=>{
      b.addEventListener('click', ()=>UI.switchTab(b.dataset.tab));
    });
    scrollActiveTabIntoView();
    refreshTabBadges();
  }
  // 吸顶区（顶栏 + 指引条）高度变化时重算侧边栏吸顶位置，回填 --topdock-h
  const td = $('topdock');
  if (td){
    const syncTopDockSpace = ()=>{
      document.documentElement.style.setProperty('--topdock-h', td.offsetHeight + 'px');
      // 书脊高度单独给侧边栏用：折叠态「≡」要正好落进栏顶的墨色格里，
      // 墨色也只铺到书脊下沿，否则左上角会出现一块比书脊高一截的纯墨空白。
      const tb = $('topbar');
      if (tb) document.documentElement.style.setProperty('--topbar-h', tb.offsetHeight + 'px');
    };
    syncTopDockSpace();
    if (window.ResizeObserver) new ResizeObserver(syncTopDockSpace).observe(td);
    else window.addEventListener('resize', syncTopDockSpace);
  }
  // 视口宽度变化后重算激活项位置；回到桌面宽度时收起移动端抽屉
  window.addEventListener('resize', ()=>{
    scrollActiveTabIntoView();
    if (window.innerWidth > 720) UI.closeDrawer();
    // 视口高度变了，幽灵滚动条的收窄量要重算
    clearTimeout(window.__fitGhostTimer);
    window.__fitGhostTimer = setTimeout(()=>UI.fitGhostScrollbar(), 120);
  });
  // 移动端：在内容上左右滑动切换页签
  bindSwipeGestures();
  // 详情浮层：PC 悬停 / 移动端点按（事件委托，动态内容无需重绑）
  bindTipEvents();
  // 设置入口已并入侧边栏末尾（顶栏不再单设图标），帮助与昼夜也收进设置弹窗
  // 昼夜：本地偏好优先，否则跟随系统
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('shj-theme'); } catch(e){}
  if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) savedTheme = 'night';
  UI.applyTheme(savedTheme === 'night' ? 'night' : 'day', false);
  // 未手动选择过时，跟随系统外观的实时变化
  if (window.matchMedia){
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = (e)=>{
      let saved = null; try { saved = localStorage.getItem('shj-theme'); } catch(err){}
      if (!saved) UI.applyTheme(e.matches ? 'night' : 'day', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }
  // 书脊右上角：增益图标 → 浮层（点图标开合，点空白处或 Esc 收起）
  $('buffBtn') && $('buffBtn').addEventListener('click', (e)=>{ e.stopPropagation(); UI.toggleBuffPop(); });
  $('buffPop') && $('buffPop').addEventListener('click', (e)=>e.stopPropagation());
  document.addEventListener('click', ()=>{ UI.closeBuffPop(); });
  // 移动端功能总入口：悬浮按钮开合抽屉，点遮罩关闭
  $('fab') && $('fab').addEventListener('click', ()=>UI.toggleDrawer());
  $('drawerMask') && $('drawerMask').addEventListener('click', ()=>UI.closeDrawer());
  // 长页「回到顶部」：滚过一屏才浮现，点击平滑回顶（reduced-motion 下直跳）
  (function(){
    const bt = $('btnTop');
    if (!bt) return;
    const onScroll = ()=>bt.classList.toggle('show', window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive:true });
    bt.addEventListener('click', ()=>{
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top:0, left:0, behavior: reduce ? 'auto' : 'smooth' });
    });
    onScroll();
  })();
  $('btnStop') && $('btnStop').addEventListener('click', ()=>{ stopActivity(); if (typeof pauseQueue==='function') pauseQueue('手动停止'); UI.refreshActivity(); });
  $('modal') && $('modal').addEventListener('click', (e)=>{ if (e.target === $('modal')) UI.closeModal(); });
  document.addEventListener('keydown', (e)=>{
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape'){ hideTip(); UI.closeDrawer(); UI.closeModal(); UI.closeBuffPop(); return; }
    // 键盘可达：方卡都带 role=button，聚焦后回车 / 空格即等于点按
    if (e.key === 'Enter' || e.key === ' '){
      const el = document.activeElement;
      if (el && el.getAttribute && el.getAttribute('role') === 'button' && el.onclick){
        e.preventDefault();
        el.click();
        return;
      }
    }
    if (e.key === 's' || e.key === 'S'){ saveGame(); UI.toast('已存档'); return; }
    if (e.key === 'q' || e.key === 'Q'){ stopActivity(); if (typeof pauseQueue==='function') pauseQueue('手动停止'); UI.refreshActivity(); UI.toast('已停止'); return; }
    const idx = '1234567890'.indexOf(e.key);
    if (idx >= 0 && TABS[idx]) UI.switchTab(TABS[idx].id);
  });
  UI.renderCurrent();
  // 上次在战斗中关掉页面：战斗态不再跨会话恢复（否则会卡在「往讨：X」）。
  // 这里补一句说明，免得玩家以为「还在打」却看不到动画。
  if (Game._droppedCombat){
    const mm = (typeof Monsters !== 'undefined') && Monsters[Game._droppedCombat];
    UI.toast(`⏹ 上次往讨已中止${mm ? '：' + mm.name : ''}\n可前往征伐页重新开战`);
    log('⏹ 上次往讨已中止（战斗不跨会话保留）', 'sys', 'combat');
    delete Game._droppedCombat;
  }
  try { if (!localStorage.getItem(TUT_KEY) && Object.keys(Game.records).length === 0) showTutorial(); } catch(e){}
  // 离开页面（切后台 / 关页）时把待上传的改动尽力推去云端
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'hidden' && typeof flushCloudSave === 'function') flushCloudSave();
  });
  window.addEventListener('pagehide', ()=>{ if (typeof flushCloudSave === 'function') flushCloudSave(); });
  window.addEventListener('beforeunload', ()=>{ if (typeof flushCloudSave === 'function') flushCloudSave(); });
  setInterval(gameLoop, 250);
}
// 各页渲染统一包一层：任何一次就地重绘（装备 / 淬炼 / 行祭 / 营造 / 买卖 / 切属性…）
// 之后都补回页头等级条与页尾「下一步」。此前只有 renderCurrent 负责插入，
// 页面内一次局部重绘（box.innerHTML = …）就把它冲掉了。
Object.keys(TAB_RENDER).forEach(tab=>{
  const name = TAB_RENDER[tab];
  const fn = UI[name];
  if (typeof fn !== 'function') return;
  UI[name] = function(){
    const r = fn.apply(this, arguments);
    if (this.currentTab === tab) this.renderPageLevel();
    return r;
  };
});

window.init = init;
window.UI = UI;
