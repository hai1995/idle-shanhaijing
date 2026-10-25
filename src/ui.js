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
// 紧凑时钟（方块角标用）：H:MM / M:SS，配合等宽数字不跳宽
function fmtClock(sec){
  sec = Math.max(0, Math.floor(sec||0));
  const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s2 = sec%60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}`;
  return `${m}:${String(s2).padStart(2,'0')}`;
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
  build:'营造', yield:'采获', heal:'疗愈',
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
// 品阶徽标：装备用「凡 / 良 / 精 / 珍 / 神」，材料仍用稀有度（凡品/良品/珍品…）。
// 两套词不能混着显示——「珍品」是价格档，「珍」是获取难度，撞在一起没人看得懂。
function gradeBadge(it){
  if (!it || !it.equip || typeof gearGrade !== 'function') return '';
  const g = gearGrade(it);
  const cap = (typeof enhanceCapOf === 'function') ? enhanceCapOf(it) : 0;
  const tip = `${g.name}品 · ${g.desc}${cap ? `（可淬至 +${cap}）` : ''}`;
  return `<span class="gd gd-${g.id}" title="${esc(tip)}">${g.name}</span>`;
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
    // 离线都做了些什么：只报经验总额太抽象，玩家想知道「这一夜在做什么」
    const ACT_NAMES = { gather:'采集', craft:'制作', observe:'观象', audience:'朝觐', grow:'养成', combat:'往讨' };
    const acts = Object.entries(rec.acts||{}).filter(([,n])=>n>0)
      .map(([k,n])=>`${ACT_NAMES[k]||k} ${n} 次`).join(' · ');
    const capLine = rec.capped
      ? `<p class="hint off-cap">离山 ${fmtTime(rec.rawSeconds || rec.seconds)}，其中 ${fmtTime((rec.rawSeconds||0)-(rec.seconds||0))} 超出 ${offlineCapHours()} 小时上限，未计入。</p>`
      : '';
    const harvest = (rec.harvests||0) > 0 ? `<div class="form-row"><span>圃艺收成</span><b>🌾 ${rec.harvests} 次</b></div>` : '';
    const recLine = (rec.records||0) > 0 ? `<div class="form-row"><span>新著录</span><b>${rec.records} 条</b></div>` : '';
    // 续祭：离山期间门人代你续了几次、耗去什么，都要交代清楚（材料是实扣的）
    let riteLine = '';
    if ((rec.riteRenews||0) > 0){
      const costChips = Object.entries(rec.riteCost||{}).map(([id,q])=>{
        const it = Items[id];
        return `<span class="chip">${typeof itemIc==='function'?itemIc(id,13):(it?(it.icon||'⬜'):'❓')}${it?esc(it.name):esc(id)}×${q}</span>`;
      }).join('');
      riteLine = `<div class="form-row"><span>续祭</span><b>🕯️ ${rec.riteRenews} 次</b></div>
        ${costChips ? `<div class="yield-row"><b>耗祭品</b>${costChips}</div>` : ''}`;
    }
    // 烽烟不跨离线：离山时挂着的凶兆，回来时已经落地——得告诉玩家它落过
    const omenLine = (rec.omensLanded||0) > 0
      ? `<div class="form-row"><span>烽烟</span><b class="off-omen">🔥 ${rec.omensLanded} 兆应验</b></div>` : '';
    // 往讨：战斗不跨会话，但离山前在打什么得有交代——打了几场、为什么停下
    let combatLine = '';
    if (rec.combat){
      combatLine = rec.combat.fights > 0
        ? `<div class="form-row"><span>往讨</span><b>⚔️ ${esc(rec.combat.name)} ${rec.combat.fights} 场</b></div>`
        : `<div class="form-row"><span>往讨</span><b class="off-omen">⚔️ ${esc(rec.combat.name)} 未能成行</b></div>`;
    }
    const combatHint = (rec.combat && rec.combat.shortOnFood)
      ? `<p class="hint off-cap">背包吃食每场需 ${rec.combat.needPortion} 份，只够支撑 ${rec.combat.fights} 场，其余时间已断粮。</p>`
      : (rec.combat && rec.combat.fights === 0
        ? `<p class="hint off-cap">这一战每场要吃 ${rec.combat.needPortion} 份，包中不足，故未开打。</p>` : '');
    const shellLine = (rec.shells||0) > 0
      ? `<div class="form-row"><span>讨平所获</span><b>🪙 ${fmt(rec.shells)} 贝</b></div>` : '';
    UI.modal(`
      <h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('moon',18):'🌙'}</span> 离线归来</h3>
      <p class="hint">离山 ${fmtTime(rec.seconds)}（离线效率 ${Math.round(offlineEff()*100)}%），竹简不曾停笔。</p>
      ${capLine}
      ${acts?`<div class="form-row"><span>所做</span><b class="off-acts">${acts}</b></div>`:''}
      <div class="form-row"><span>修得经验</span><b style="color:var(--gamboge)">+${fmt(rec.xp)}</b></div>
      ${recLine}${combatLine}${shellLine}${harvest}${riteLine}${omenLine}
      ${combatHint}
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
    // 烽烟：已举烽、尚未应验的凶兆（烽火台建成后才有）。单列一段，
    // 与「已生效」分开——玩家要知道的是「还有多久落下」，不是「已经中了」。
    const pending = [];
    (Game.omensPending || []).forEach(p => {
      const d = (typeof OMENS !== 'undefined') && OMENS[p.id];
      if (!d) return;
      pending.push({
        name: d.beast || d.type || '凶兆',
        pol: '凶',
        desc: (typeof omenEffectText === 'function' ? omenEffectText(d).replace(/（[^）]*）/g, '') : (d.desc || '')),
        left: Math.max(0, p.at - gameTime()),
      });
    });
    return { temp, beasts, omens, pending,
             count: temp.length + beasts.length + omens.length + pending.length };
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
      html += sec('烽烟（将起）', s.pending.length, s.pending.map(o=>
        item(o.name, o.desc, `<span class="bp-pol 凶">凶</span><span class="bp-time warn">${fmtClock(o.left)} 后</span>`)).join(''));
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
      <div class="help-sec"><b>征兆</b><p class="hint">首次著录异兽可能触发吉凶之兆（如「其邑大水」「有大兵」），影响区域产出或全局采获。部分物品可免疫对应征兆（如「佩之不惑」之符、「御兵」之兽）。</p></div>
      <div class="help-sec"><b>祠祀 · 卜筮</b><p class="hint">谒见山神献祭以增益区域产出；卜筮可问吉凶、抉择事件走向。</p></div>
      <div class="help-sec"><b>商旅 · 观象 · 圃艺</b><p class="hint">以贝币买卖物品、低买高卖；观象提升离线上限（基础 ${TUNING.OFFLINE.CAP_H} 小时，每处观象 +1、仓廪 +2、土窟 +1，另有长线成就加成；现为 ${offlineCapHours()} 小时）与离线效率；圃艺种植收成。</p>
        <p class="hint">观象、谒见、灌木这三类「一次性地点」散在各山，<b>舆地页末的「异迹索引」</b>一并列出：谁已得、谁还没去、差几级，点一行即定位到那座山，右侧「往」直接动身。</p></div>
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
    body:`采集、制作、讨伐、御使……共 <b>26 门技艺</b>，行动即长经验（九阶八十一）。\n技能越高，产出越丰，亦能解锁更高「舆地」等级的山川。\n\n本页还挂着<b>三签</b>——三条短课，做完一条即补一条，赏贝币；做不了可以「换」。` },
  { tab:'taofa',  icon:'⚔️', title:'往讨异兽',
    body:`前往有异兽记载的山，点「往讨」。\n首次著录即触发<b>征兆</b>吉凶；著录至<b>得御</b>阶，便可在「御使」中使役该异兽，化作被动增益与自动作业。` },
  { tab:'pack',   icon:'🎒', title:'行装器物',
    body:`采集与讨伐所得皆入<b>行装</b>。\n装备兵器（五行相克：金克木、木克土……）、佩带饰物、服用丹药。\n点物品可查看它的原文句式——「食之X」「佩之X」「可以X」。` },
  { tab:'queue',  icon:'🧭', title:'巡历挂机',
    body:()=>`这是挂机核心。在「行动」编排<b>巡历队列</b>与<b>兜底任务</b>，离开页面也能自动推进。\n归来时按离线时长结算收益；离线上限随「观象」「营造」提升（现为 ${offlineCapHours()} 小时）。` },
  { icon:'📊', title:'祠祀与统计',
    body:`你还可祠祀山神（增益区域产出）、营造市廛、卜筮吉凶、观象提升离线上限。\n进度<b>自动存档于本机</b>；在「统计」页可导出 / 导入存档。\n\n技艺修至九九，可在技能页<b>再著一卷</b>（轮回）：等级归零，换一枚终身累积的轮回印，\n而著录、装备、贝币与修为俱在——那是很久以后的事了。\n\n祝著录顺利，山海自有回响。` },
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
  // body 可以是函数：含「当前上限」这类随进度变化的数字，得在渲染时才算，
  // 数组字面量里求值会把开局的 12 小时永久钉死。
  const body = typeof s.body === 'function' ? s.body() : s.body;
  if (s.tab) UI.switchTab(s.tab);
  const first = _tutIdx === 0;
  const last = _tutIdx === TUT_STEPS.length - 1;
  const dots = TUT_STEPS.map((_,i)=>`<span class="tut-dot ${i===_tutIdx?'on':''} ${i<_tutIdx?'done':''}"></span>`).join('');
  UI.modal(`
    <div class="tut-card">
      <div class="tut-head"><span class="mi-ic">${typeof markIcon==='function'?markIcon(tutMark(s),17):(s.icon||'📜')}</span> <b>${s.title}</b></div>
      <div class="tut-body">${body.replace(/\n/g,'<br>')}</div>
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
    const wBase = w ? enhanceScaled(w.dmg || 0, enhanceLevel(w.id || w)) : 0;
    const qDmg = (style === 'ranged' && q) ? (q.dmg || 0) : 0;
    const skillDmg = statLv * 1.2;
    const rows = [];
    rows.push({ label: w ? `兵器 · ${w.name}` : '徒手',
      value: w ? fmt(Math.round(wBase)) : '0',
      note: w ? (enhanceLevel(w.id || w) ? `含淬炼 +${enhanceLevel(w.id || w)}（${w.dmg} 基础）` : `未淬炼（${w.dmg} 基础）`) : '无兵器' });
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
    const aBase = a ? enhanceScaled(a.def || 0, enhanceLevel(a.id || a)) : 0;
    const rows = [];
    rows.push({ label: a ? `甲胄 · ${a.name}` : '无甲', value: a ? Math.round(aBase).toString() : '0',
      note: a ? (enhanceLevel(a.id || a) ? `含淬炼 +${enhanceLevel(a.id || a)}` : `未淬炼（${a.def} 基础）`) : '赤身应战' });
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
      <span class="pl-xp">二十六技合计 · 满级 ${max} · 修为 ${fmt(Game.stats.totalXp || 0)}</span>
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
    if (rite) out.push({ label:`行祭「${(Items[rite[0]]||{}).name||'祠礼'}」（此域采获 +30% 一时）`, act:`UI.tryRite('${rite[0]}')` });
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

// 统计页「异迹」那一格点进来：展开索引并滚到它跟前。
// 光给数字不给去路，玩家看完还是得一座座山翻。
UI.gotoHetero = function(){
  this.heteroOpen = true;
  if (this.currentTab !== 'yudi') this.switchTab('yudi');
  else this.renderYudi();
  const el = document.querySelector('details.hetero-panel');
  if (el && el.scrollIntoView) el.scrollIntoView({ block:'center', behavior:'smooth' });
};

// 异迹索引：观象 9 处、谒见 20 处、灌木 3 处散在 447 座山里，
// 每处的按钮只在该山的详情里出现。统计页写着「观象处 3/9」，玩家却没有办法
// 知道差的那 6 处在哪——只能一座一座山点开看。这里一张表列全：
// 点一行即选中那座山（看它周围有什么），右侧「往」直接动身。
function heteroPanelHtml(){
  if (typeof heteroSites !== 'function') return '';
  const list = heteroSites();
  if (!list.length) return '';
  const kinds = ['观象', '观瑞', '谒见', '灌木'];
  const summary = kinds
    .filter(k => list.some(x => x.kind === k))
    .map(k => { const a = list.filter(x => x.kind === k); return `${k} <b>${a.filter(x => x.done).length}</b>/${a.length}`; })
    .join(' · ');
  const left = list.filter(x => !x.done && x.unlocked).length;
  const yl = levelOf('yudi');
  // 展开状态要自己记着：整页 innerHTML 重建（点一行、点「往」、每次结算后刷新）会把
  // <details> 的 open 属性一起抹掉，不记的话点一下就自动收起，等于用不了。
  return `<details class="hetero-panel" ${UI.heteroOpen ? 'open' : ''} ontoggle="UI.heteroOpen=this.open">
    <summary>异迹索引 <i class="hp-tally">${summary}</i><em class="hp-left">${left ? `可往 ${left} 处` : '暂无可往'}</em></summary>
    <div class="hetero-list">
    ${list.map(x => {
      const gap = Math.max(0, x.level - yl);
      const prog = x.prog ? ` · ${Math.min(x.prog.got, x.prog.total)}/${x.prog.total}` : '';
      return `<div class="hetero-row ${x.done ? 'done' : ''} ${x.unlocked ? '' : 'lock'}"
          title="${esc(x.gain)}${prog}"
          onclick="UI.selRegion='${esc(x.regionId)}';UI.selNode='${esc(x.nodeId)}';UI.renderYudi()">
        <span class="hr-kind k-${x.kind}">${x.kind}</span>
        <span class="hr-name">${esc(x.name)}${x.done ? '<i class="hr-ok">已得</i>' : ''}</span>
        <span class="hr-where">${esc(x.nodeName)}${x.regionName ? ` · ${esc(x.regionName)}` : ''}</span>
        <span class="hr-gain">${esc(x.gain)}${prog}</span>
        ${x.unlocked
          ? `<button class="btn small hr-go" type="button" onclick="event.stopPropagation();${x.act}">往</button>`
          : `<span class="hr-lock">需 ${x.level} 级${gap > 0 ? `（差 ${gap}）` : ''}</span>`}
      </div>`;
    }).join('')}
    </div>
  </details>`;
}

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
      ${(()=>{
        const r = (typeof activeRiteOf === 'function') ? activeRiteOf(region.regionId) : null;
        return r ? `<div class="rite-here" title="${esc(r.name)}：此域采获 +${Math.round(r.bonus*100)}%（约合产量 +${typeof riteRealYield==='function'?riteRealYield(r.bonus):Math.round(r.bonus*50)}%），余 ${fmtTime(r.left)}">
          <span class="mi-ic">${typeof markIcon==='function'?markIcon('lamp',13):'🕯️'}</span>
          <span class="rh-name">${esc(r.name)}</span>
          <span class="rh-bonus">采获 +${Math.round(r.bonus*100)}%</span>
          <b class="rh-left">${fmtClock(r.left)}</b>
        </div>` : '';
      })()}
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
      if (rows.length) return `<div class="yield-rows">${rows.join('')}</div>`;
      // 原文写「无草木」的荒山（全书 18 座）不该只回一句「无所载」——
      // 那读起来像数据缺失。这里明说「此地本无」，并点出唯一可做之事。
      const hasFauna = (sel.fauna || []).some(f => f.category !== '神祇');
      return hasFauna
        ? '<span class="hint">本山不载草木金玉，唯见异兽</span>'
        : '<span class="hint">此山无草木、亦无异兽——原文如此。涉足可录舆图一格，得舆地经验。</span>';
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
        ${specialNodeNote(sel)||''}
        <div class="nd-sec"><b>产出</b>${yieldRows}</div>
        <div class="nd-sec"><b>异兽</b>${faunaRows}</div>
        ${sel.source?`<blockquote class="quote">${esc(sel.source)}<cite>${esc(sel.chapter||'山海经')}</cite></blockquote>`:''}
        ${sel.note?`<div class="nd-sec note-line"><b>注解</b>${esc(sel.note)}</div>`:''}
        ${nodeMythBlock(sel)||''}
      </div>`;
    })() : ''}
    </div></div>`
    + heteroPanelHtml();
  box.innerHTML = html;
};
// 此山是否有「现在就能点的动作」。
// 前往按钮取消后，动作按钮本身兼管「走一趟」（采集/观象/谒见/灌木/讨伐都会先 travelTo），
// 所以只有当一样都点不了时，才补一枚「涉足此山」——否则那 58 座只载原文的山永远涉不了。
function nodeHasUsableAction(node){
  for (const it of Object.values(Items)){
    if (!it.skill) continue;
    const nodes = it.nodes || (it.node ? [it.node] : []);
    if (nodes.includes(node.id) && gatherGate(it).usable) return true;
  }
  if (Object.values(OBSERVE_SITES).some(s=>s.nodeId === node.id)) return true;
  if (typeof AUDIENCE_SITES !== 'undefined' && AUDIENCE_SITES[node.id]) return true;
  if (Object.values(GROW_SITES).some(s=>s.nodeId === node.id && canAfford(s.cost))) return true;
  if (Object.values(Monsters).some(m=>m.nodeId === node.id && levelOf('taofa') >= (m.needLvl||1))) return true;
  return false;
}
// 采集可用性：与 game.js 的 doGather 同口径——差 8 级内可「越级」，效率按差距折减。
// 早期山系并非每个手艺都有低阶产物（渔在南山只有育沛），硬门槛会把路堵死。
function gatherGate(it){
  const need = it.lvl || 1;
  const cur = levelOf(it.skill);
  const gap = need - cur;
  return { need, cur, gap, usable: gap <= 8, eff: gap <= 0 ? 1 : Math.max(0.35, 1 - gap * 0.08) };
}

function gatherButtonsForNode(node){
  const out = [];
  for (const it of Object.values(Items)){
    if (!it.skill) continue;
    const nodes = it.nodes || (it.node ? [it.node] : []);
    if (!nodes.includes(node.id)) continue;
    const g = gatherGate(it);
    const tag = g.gap > 0 ? ` · 越级 ${Math.round(g.eff * 100)}%` : '';
    out.push(`<button class="btn ${g.usable ? (g.gap > 0 ? 'over' : '') : 'lock'}" ${g.usable ? '' : 'disabled'}
      onclick="startActivity('gather','${it.id}')" title="${esc(it.note||'')}${g.gap > 0 ? '（越级采集：效率 ' + Math.round(g.eff*100) + '%）' : ''}">
      ${typeof skillIcon==='function'?skillIcon(it.skill,17):Skills[it.skill].icon} ${esc(it.name)}<i>${Skills[it.skill].name} ${it.lvl}${tag}</i></button>`);
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
// 谒见神祇。诸神都录过之后改称「问神」——这一趟是去问此地还有什么没录，
// 而不是再听一遍已经写下的名姓。
function audienceButtonForNode(node){
  const site = AUDIENCE_SITES[node.id];
  if (!site) return '';
  const un = nodeUnlocked(node);
  const done = (site.deities || []).every(d => ((Game.records || {})[d.id] || {}).count > 0);
  return `<button class="btn ${un && !done ? 'primary' : ''}" ${un?'':'disabled'} onclick="startAudience('${node.id}')"
    title="${done ? '诸神已录：问此地未录之物' : '神祇不可讨伐，以谒见入录'}">🕯️ ${done ? '问神' : '谒见'} ${esc(site.name)}<i>${done ? '此地未录之物' : (site.deities.length + ' 位神祇')}</i></button>`;
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
// 特殊节点的「地气」：原文设定之外，把它实际影响什么写清楚。
// 尽沙 / 百仞 / 干河三处原先只有一句原文，玩家不知道走进去会怎样。
function specialNodeNote(node){
  const sp = SPECIAL_NODES[node.id];
  if (!sp) return '';
  const tags = [];
  if (sp.desert){
    const free = typeof hasBeast === 'function' && hasBeast('tuotuo');
    tags.push(free ? '流沙：有橐驼代步，采集如常' : '流沙：采集迟缓 ×1.25（御使橐驼可免）');
  }
  if (sp.climb) tags.push('百仞：采集迟缓 ×1.18，所得更丰 +10%');
  if (sp.seasonalRiver){
    const wet = typeof seasonPhase === 'function' && seasonPhase();
    tags.push(`${typeof seasonName === 'function' ? seasonName() : '旱季'}：渔获 ${wet ? '+30%' : '−30%'}（六小时一转）`);
  }
  return `<div class="special-note">★ ${esc(sp.note||'')}${tags.length
    ? `<div class="geo-tags">${tags.map(t=>`<span class="geo-tag">${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
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
    <span>修为 <b>${fmt(Game.stats.totalXp || 0)}</b><i class="hint">（累计经验，不设上限）</i></span>
    <span>经验倍率 <b>×${xpMult().toFixed(2)}</b></span>
    <span>采集速度 <b>×${gatherSpeedMult().toFixed(2)}</b></span>
    <span>采获 <b>+${Math.round(globalYieldBonus()*100)}%</b><i class="hint">（约合产量 +${typeof riteRealYield==='function'?riteRealYield(globalYieldBonus()):0}%）</i></span>
    <span>御使槽 <b>${Object.keys(Game.deployed).length}/${beastSlots()}</b></span>
  </div>
  ${(typeof bountyDef === 'function') ? (() => {
    const list = (Game.bounties || []).filter(b => bountyDef(b.id));
    if (!list.length) return '';
    const lv = bountyLevel();
    return `<div class="panel bounty-panel">
      <h3>三签<i class="bn-sub">签成得贝，做完一条即补一条</i></h3>
      <div class="bounty-list">
        ${list.map((b, bi) => {
          const def = bountyDef(b.id);
          const got = bountyProgress(b), need = Math.max(1, b.target);
          const pct = Math.min(100, got / need * 100);
          return `<div class="bounty-item ${got >= need ? 'done' : ''}">
            <span class="bn-name">${esc(def.name)}</span>
            <span class="bn-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
            <span class="bn-num">${Math.min(got, need)}/${need}</span>
            <span class="bn-pay">${Math.max(1, Math.round(def.shells(lv)))} 贝</span>
            <button class="bn-swap" type="button" title="换一条（当前进度作废）" onclick="bountySwap(${bi})">换</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  })() : ''}
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
          ${(() => {
            const nx = nextUnlocks(id, 6);
            return nx.length ? `<div class="sc-next" title="再练几级便能采到 / 做到"><b>将至</b>${esc(nextUnlockText(nx))}</div>` : '';
          })()}
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
        <span class="tip-body hidden"><div class="rc-cost">${costChips(r.cost)}</div><div class="rc-xp">经验 ${r.xp}</div>${!lvOk?`<div class="hint ${r.lvl - levelOf(mapRecipeSkill(r.type)) <= 2 ? 'near' : ''}">再升 ${r.lvl - levelOf(mapRecipeSkill(r.type))} 级（${sk.name} ${r.lvl}）</div>`:''}</span>
      </div>`;
    }).join('')}
    </div>
  </div>

  <div class="panel farm-panel">
    <h3>圃艺 · 田地<button class="btn small gear-best" type="button" onclick="UI.plantAll()">一键种植</button></h3>
    <div class="tile-grid farm-grid">
    ${farmTilesHtml()}
    </div>
  </div>

  ${(typeof rebirthCount === 'function') ? (() => {
    const cnt = rebirthCount();
    const gain = Math.round(rebirthGain() * 100);
    const yl = Math.round(rebirthYield() * 100);
    const start = rebirthStartLevel();
    const best = bestSkillLevel();
    const ok = canRebirth();
    const nextStart = Math.min(TUNING.REBIRTH.START_CAP, (cnt + 1) * TUNING.REBIRTH.START_PER);
    return `<div class="panel rebirth-panel">
      <h3>轮回 · 第 ${cnt + 1} 卷</h3>
      <div class="rb-grid">
        <span>轮回印 <b>${cnt} 枚</b></span>
        <span>修为 <b>+${gain}%</b></span>
        <span>采获 <b>+${yl}%</b></span>
        <span>转后起手 <b>${nextStart} 级</b></span>
        <span>最高技艺 <b>${esc(best.name || '—')} ${best.level}<i class="rb-cap">/${TUNING.REBIRTH.MIN_LEVEL}</i></b></span>
        <span>修为累计 <b>${fmt(Game.stats.totalXp || 0)}</b></span>
      </div>
      ${(() => {
        const hist = (Game.rebirth && Game.rebirth.history) || [];
        if (!hist.length) return '<p class="hint">这一卷尚未落笔，成绩会自动记下。</p>';
        const last = hist[hist.length - 1];
        const fastest = hist.reduce((a, b) => (b.sec < a.sec ? b : a), hist[0]);
        const isBest = fastest.sec === last.sec;
        const dur = (sec) => (sec < 60 ? '不足一分' : fmtTime(sec));
        return `<p class="hint rb-hist">上轮 ${dur(last.sec)} · 总等级 ${last.total}${isBest ? ' · <b>本卷最快</b>' : ` · 最快 ${dur(fastest.sec)}`}</p>`;
      })()}
      <p class="hint">再著一卷，是从头写，不是从头认识：诸技归 ${nextStart} 级，舆地与履险不忘；著录、装备、贝币、营造、御使与修为俱在。</p>
      ${ok
        ? `<button class="btn primary" type="button" onclick="UI.openRebirth()">再著一卷</button>`
        : `<button class="btn" type="button" disabled>未至九九，不可轮回</button>
           <span class="hint">任一技艺至 ${TUNING.REBIRTH.MIN_LEVEL} 级方可落笔</span>`}
    </div>`;
  })() : ''}`;
  box.innerHTML = html;
};

// 轮回确认：把「失去 / 保留 / 得到」三栏摊开再让人点。
// 转生是不可逆的重置，最忌讳的就是点完才发现丢了什么。
UI.openRebirth = function(){
  if (typeof canRebirth !== 'function' || !canRebirth()){
    this.toast(`需任一技艺至 ${TUNING.REBIRTH.MIN_LEVEL} 级`); return;
  }
  const cnt = rebirthCount() + 1;
  const start = Math.min(TUNING.REBIRTH.START_CAP, cnt * TUNING.REBIRTH.START_PER);
  const best = bestSkillLevel();
  const gain = Math.round(cnt * TUNING.REBIRTH.XP * 100);
  const yl = Math.round(cnt * TUNING.REBIRTH.YIELD * 100);
  this.modal(`
    <h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('moon',18):'♻️'}</span> 再著一卷</h3>
    <p class="hint">「${esc(best.name)}」已至九九，本卷可收。落笔之后各门技艺重新从 ${start} 级起，走过的路与写下的字都还在。</p>
    <div class="rb-cols">
      <div class="rb-col lose"><b>将失去</b>
        <ul><li>各门技艺等级（归 ${start} 级）</li><li>进行中的采制与往讨</li><li>连杀递减计数</li></ul></div>
      <div class="rb-col keep"><b>将保留</b>
        <ul><li>修为 ${fmt(Game.stats.totalXp || 0)}（终身累计）</li><li>著录 ${recordedCount()} 条 · 图鉴与成就</li><li>装备、贝币、营造、御使</li><li>舆地与履险（走过的路不忘）</li></ul></div>
      <div class="rb-col gain"><b>将得到</b>
        <ul><li>第 ${cnt} 枚轮回印</li><li>修为 +${gain}%（终身）</li><li>采获 +${yl}%</li><li>起手 ${start} 级</li><li>本轮 ${fmtTime(Math.max(0, Math.round((Date.now() - ((Game.rebirth && Game.rebirth.startedAt) || Game.startedAt || Date.now())) / 1000)))} 入册</li></ul></div>
    </div>
    <div class="modal-btns">
      <button class="btn" onclick="UI.closeModal()">再想想</button>
      <button class="btn primary" onclick="UI.confirmRebirth()">落笔</button>
    </div>`);
};
UI.confirmRebirth = function(){
  const r = (typeof doRebirth === 'function') ? doRebirth() : { ok:false, reason:'轮回未开' };
  this.closeModal();
  if (!r.ok){ this.toast(r.reason || '未能轮回'); return; }
  if (this.refreshActivity) this.refreshActivity();
  this.switchTab('skills');
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
  // 只看「撑不住」三个字，玩家不知道差多少。换成倍数：2 倍气血 = 得吃两份，
  // 5 倍 = 别硬来，先去补器甲。BOSS 战本来就长，这条提示是开战前唯一的账。
  const ceil = Math.max(1, playerMaxHp());
  const ratio = kill * mdps / ceil;
  const survive = ratio <= 1;
  // 再把倍数折成「要备几份」——倍数要玩家自己换算，份数是拿起来就能办的。
  // 按背包里回血最多的那份算；一份都没有时直说，免得他带着空袋子去打。
  let food = null;
  for (const id in Game.inventory){
    const it = Items[id];
    if (!it || !it.heal || Game.inventory[id] <= 0) continue;
    const h = healAmount(it);
    if (!food || h > food.heal) food = { id, name:it.name, heal:h };
  }
  let advice = '';
  if (!survive){
    const need = kill * mdps - ceil;
    // 一份食物能吃回多少，取决于它在多低的血线上被吃：自动进食在 Prefs.autoEat
    // 处触发，此时最多补到满血，所以有效回血是 min(食物回血, 气血 × (1 − 阈值))。
    // 按食物标称回血算会严重低估份数——丹木之实写着 500，但 300 气血的人实际只吃到 195。
    const eff = food ? Math.max(1, Math.min(food.heal, Math.round(ceil * (1 - (Prefs.autoEat || 0.35))))) : 0;
    advice = food
      ? `，需备 ${Math.max(1, Math.ceil(need / eff))} 份${food.name}`
      : '，包中无吃食——先去备些';
  }
  const tail = survive ? '' : ` · ⚠ 承伤约 ${ratio.toFixed(1)} 倍气血${ratio >= 1.5 ? advice : '，留意气血'}`;
  return { cls: survive ? 'good' : 'bad',
    html: `预计击杀 ≈ ${fmtTime(Math.ceil(kill))} · 你 DPS≈${dps.toFixed(1)} · 敌 DPS≈${mdps.toFixed(1)}${tail}` };
}
function combatEstimateHtml(m, c, hpNow){
  const r = combatEstimateInner(m, c, hpNow);
  return r ? `<div class="combat-est ${r.cls}" id="combatEst">${r.html}</div>` : '';
}
// 供测试与调试：开战前那条「预计击杀 / 承伤倍数」的账
window.combatEstimateInner = combatEstimateInner;
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
  let list = `<div class="panel beast-panel"><h3>讨伐目标</h3>
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
    x.special ? `<div class="hm-line hm-spec"><b>${esc(x.special.name)}</b>${x.desc ? ' · ' + esc(x.desc) : ''}</div>` : '',
    (x.divine && Items[x.divine]) ? `<div class="hm-line hm-divine">遗神兵 <b>${esc(Items[x.divine].name)}</b>（${Math.round((typeof DIVINE_DROP==='number'?DIVINE_DROP:0.06)*100)}% 掉落 · ${esc((DIVINE_EFFECTS[Items[x.divine].divine]||{}).label||'')}）</div>` : '',
    `<div class="hm-line">${th.label}${x.boss ? ' · BOSS' : ''}${x.pair ? ' · 成对（占两槽）' : ''}${(Game.stats.deathStreakOf===id && (Game.stats.deathStreak||0)>=2) ? ` · <span class="hm-warn">已连败 ${Game.stats.deathStreak} 阵</span>` : ''}</div>`,
    `<div class="hm-line">已录 <b>${rec.count}</b> 次（${TUNING.MASTERY.NAMES[rec.tier] || ''}）${decay < 1 ? ` · 连杀递减 ×${decay.toFixed(2)}` : ''}</div>`,
  ].filter(Boolean).join('');
  this.modal(`<h3><span class="mi-ic">${typeof beastIcon==='function'?beastIcon(x):'🐾'}</span> ${esc(x.name)}${x.py?`<span class="hm-py">（${esc(x.py)}）</span>`:''}</h3>
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
  // 「仅未录」：收集到后期，满屏已录的卡里找剩下那几条实在费眼
  const onlyMiss = !!this.codexOnlyMiss;
  let shown = q
    ? entries.filter(e=> (e.name||'').toLowerCase().includes(q) || String(e.py||'').toLowerCase().includes(q))
    : entries;
  if (onlyMiss) shown = shown.filter(e => !(((Game.records||{})[e.id]||{}).count > 0));
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
    <button class="chip-btn ${onlyMiss?'on':''}" title="只列本类尚未著录的条目"
      onclick="UI.codexOnlyMiss=!UI.codexOnlyMiss;UI.renderCodex()">仅未录 ${tabTotal-tabDone}</button>
    <label class="search-box" title="按名称或注音检索">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
      <input id="codexSearch" type="search" placeholder="检索名 / 注音" value="${esc(this.codexQuery||'')}"
        oninput="UI.codexQuery=this.value;UI.renderCodex(true)">
    </label>
    <span class="hint">本类 ${tabDone}/${tabTotal}${q?` · 命中 ${shown.length}`:''}${onlyMiss?` · 未录 ${shown.length}`:''} · 总录 ${done}/${total}</span>
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
    }).join('') : `<div class="empty-note">${onlyMiss
      ? (q ? '未录条目里没有匹配的。' : '本类已尽收——没有未著录的条目了。')
      : `${esc(this.codexQuery||'')} —— 无此条目。换个字或注音试试，例如「鸟」「yú」。`}</div>`}
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
  // 烽烟：烽火台已望见、尚在倒计时的凶兆
  const pend = (Game.omensPending || []).filter(p => OMENS[p.id]).map(p => {
    const d = OMENS[p.id];
    return `<div class="omen-pending">
      <span class="op-ic">🔥</span>
      <span class="op-txt">${esc(d.beast)}「${esc(d.type)}」将至</span>
      <b class="op-left">${fmtClock(Math.max(0, p.at - gameTime()))}</b>
    </div>`;
  }).join('');
  return `${pend?`<div class="omen-pend-box">${pend}<div class="hint">烽火台已举烽——趁这段时辰收手、换目标，或备齐白菅与稻米行禳解。</div></div>`:''}
    ${Game.omens.length?`<div class="omen-summary">当前总效应：${currentOmenEffects().map(e=>`${e.label} ${e.pct>0?'+':''}${e.pct}%`).join(' · ')}</div>`:''}
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
// 一并开续：只挑「备料够、等级够、还没开」的那几套。
// 有门槛的东西才敢批量——不然一把把所有礼都挂上，材料立刻见底、门人集体待料。
UI.autoRiteAll = function(){
  const n = (typeof openAllRites === 'function') ? openAllRites() : 0;
  if (!n){ this.toast('暂无可续之礼（备料或祭祀等级不足）'); return 0; }
  saveGame();
  this.renderJisi();
  this.toast(`🕯️ 已为 ${n} 套礼开续祭`);
  return n;
};

// 问神：山神报出本系未录之物。纯信息（不产物件，故无冷却），
// 点一行即定位那座山——省得在图鉴 1122 条里翻。
UI.showOracle = function(regionId, siteName){
  const miss = (typeof regionMissing === 'function') ? regionMissing(regionId)
    : { items: [], beasts: [], deities: [] };
  const region = (WORLD.regions || []).find(r => r.regionId === regionId);
  const rn = region ? region.regionName : regionId;
  const total = miss.items.length + miss.beasts.length + miss.deities.length;
  const group = (title, list, cap) => {
    if (!list.length) return '';
    const shown = list.slice(0, cap);
    return `<div class="orc-group"><b>${title}<span class="orc-n">${list.length}</span></b>
      ${shown.map(x => `<div class="orc-row" role="button" tabindex="0"
          onclick="UI.selRegion='${esc(x.nodeId).replace(/-\d+$/, '')}';UI.selNode='${esc(x.nodeId)}';UI.switchTab('yudi');UI.closeModal()">
        <span class="orc-name">${esc(x.name)}</span>
        <span class="orc-where">${esc(x.nodeName)}</span>
        <span class="orc-how">${esc(x.how)} · ${x.lvl} 级</span>
      </div>`).join('')}
      ${list.length > shown.length ? `<div class="hint orc-more">另有 ${list.length - shown.length} 条，可在「图鉴 · 仅未录」里看全</div>` : ''}
    </div>`;
  };
  this.modal(`<h3><span class="mi-ic">${typeof markIcon === 'function' ? markIcon('lamp', 16) : '🕯️'}</span> ${esc(siteName)} · 问神</h3>
    <p class="hint">${esc(rn)} 尚有 ${total} 条未录。点一行即定位到那座山——神只说有什么，怎么拿还得自己走一趟。</p>
    ${total ? group('物产', miss.items, 8) + group('异兽', miss.beasts, 8) + group('神祇', miss.deities, 4)
      : '<p class="ab-p">此系已录尽——山中所有物类皆在简上。</p>'}
    <div class="modal-btns">
      <button class="btn" onclick="UI.codexTab='thing';UI.codexOnlyMiss=true;UI.switchTab('codex');UI.closeModal()">去图鉴看未录</button>
      <button class="btn primary" onclick="UI.closeModal()">领命</button>
    </div>`);
};

UI.renderJisi = function(){
  const box = $('content');
  if (!box) return;
  const autoIds = Object.keys(Game.riteAuto || {}).filter(id => Game.riteAuto[id]);
  const stallIds = autoIds.filter(id => (Game.riteStall||{})[id]);
  // 二十八套礼平铺，材料够的那几套要一眼看见——按「能不能祭」分两段、段内按可续次数排。
  // 先算一遍再排序，模板里不再重复调 riteState（每调一次都要翻一遍配方表）。
  const rows = Object.entries(RITES).map(([id, def]) => ({ id, def, st: riteState(id) }))
    .filter(r => r.st);
  rows.sort((a, b) => {
    const ra = (a.st.times > 0 && a.st.lvOk) ? 0 : 1;
    const rb = (b.st.times > 0 && b.st.lvOk) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (b.st.times || 0) - (a.st.times || 0);
  });
  const readyN = rows.filter(r => r.st.times > 0 && r.st.lvOk).length;
  const readyIdleN = rows.filter(r => r.st.times > 0 && r.st.lvOk && !r.st.auto).length;
  let html = `<div class="panel rite-panel"><h3>祠礼（据原文祠礼格式）</h3>
    ${autoIds.length ? `<div class="rite-auto-bar">
      <span class="hint">续祭中 <b>${autoIds.length}</b> 套：到期前 60 秒自动重备同样祭品${stallIds.length?`　·　<b class="stall">${stallIds.length}</b> 套待料`:'，备齐自续'}。</span>
      <button class="btn" onclick="UI.stopAllRiteAuto()">全停</button>
    </div>` : `<div class="hint">点方块右上「续」可交由门人代祭——到期自动续上，不必守着时辰。</div>`}
    <div class="rite-bar">
      <span class="hint">备料可行者 <b>${readyN}</b> 套${readyIdleN ? `（其中 <b>${readyIdleN}</b> 套尚未续祭）` : ''}</span>
      <button class="btn small" type="button" onclick="UI.autoRiteAll()">可续者一并开续</button>
    </div>
    <div class="rite-grid">
    ${(() => {
      return rows.map(({ id, def, st }) => {
      const rec = st.rec;
      const region = WORLD.regions.find(r=>r.regionId===def.regionId);
      const lvOk = st.lvOk;
      const can = st.times > 0 && lvOk;
      const riteName = (Items[id]||{}).name || (region?region.regionName+'祠礼':id);
      const auto = st.auto;
      // 方块：点按即行祭（材料/等级不足给说明）；山系与祭品明细在浮层
      return `<div class="tile rite-tile ${can?'':'lock'} ${st.active?'on':''}" data-rite="${id}" data-tip data-tip-title="${esc(riteName)}"
        role="button" tabindex="0" onclick="UI.tryRite('${id}')">
        <span class="rite-auto ${auto?'on':''} ${st.stall?'stall':''}" role="button" tabindex="0"
          title="${auto?(st.stall?'待料中（祭品不继）':'停续祭'):'开续祭'}"
          onclick="event.stopPropagation();UI.toggleRiteAuto('${id}')">续</span>
        ${st.active?`<span class="rite-left" title="余 ${fmtTime(st.left)}">${fmtClock(st.left)}</span>`:''}
        <span class="tile-ic bi-ic">${(typeof riteIcon==='function')?riteIcon(id, riteName):`<span class="tile-seal">${esc((String(riteName).split('·')[1] || String(riteName)).trim().slice(0,1))}</span>`}</span>
        <span class="tile-nm">${esc(riteName)}</span>
        <span class="tile-tag">祭祀 ${rec.lvl}</span>
        <span class="tip-body hidden">
          <div class="rc-sub">${esc(region?region.regionName:'常祭')}</div>
          ${(region&&region.deity)?`<div class="rc-sub">${esc(region.deity.form||'')}</div>`:''}
          <div class="rc-cost">${costChips(rec.cost)}</div>
          <div class="hint">${def.regionId?`此域采获 +${Math.round(def.yieldBonus*(Game.buildings.citan?1.5:1)*100)}%（约合产量 +${typeof riteRealYield==='function'?riteRealYield(def.yieldBonus*(Game.buildings.citan?1.5:1)):'—'}%），持续 ${Math.round(def.dur/3600)} 小时`:'常祭，无区域增益'}</div>
          ${st.active?`<div class="hint">生效中，余 ${fmtTime(st.left)}</div>`:''}
          <div class="hint">现备材料可续 ${st.times} 次${auto?(st.stall?'　·　续祭待料':'　·　已开续祭'):''}</div>
          ${(Items[id]||{}).note?`<div class="hint">${esc((Items[id]||{}).note)}</div>`:''}
          ${!lvOk?`<div class="hint">需祭祀 ${rec.lvl} 级（现 ${levelOf('jisi')} 级）</div>`:''}
          ${(() => {
            // 缺料去哪儿找：只给前两种，多了反而看不清
            const lacks = rec.cost.filter(([iid, q]) => totalOf(iid) < q);
            if (!lacks.length) return '';
            return `<div class="rc-lack">缺 ${lacks.map(([iid, q]) => `${esc((Items[iid]||{}).name || iid)}×${q - totalOf(iid)}`).join('、')}</div>` +
              lacks.slice(0, 2).map(([iid]) => {
                const src = (typeof itemSources === 'function') ? itemSources(iid)[0] : null;
                if (!src) return '';
                return `<div class="rc-sub rc-src">${esc((Items[iid]||{}).name || iid)}：${esc(src.kind)} Lv${src.lvl}${src.where ? ' · ' + esc(src.where) : ''}</div>`;
              }).join('');
          })()}
        </span>
      </div>`;
      }).join('');
    })()}
    </div>
    <div class="hint">行祭后该山系采获 +${Math.round(30*(Game.buildings.citan?1.5:1))}%（祠坛 ×1.5），持续 1 小时。采获加成提高的是「一次得两份／三份」的几率，折算约合产量 +${typeof riteRealYield==='function'?riteRealYield(0.30*(Game.buildings.citan?1.5:1)):'—'}%。</div>
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
  cookQty:'烹饪并出', build:'营造', yield:'采获', heal:'疗愈' };
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
// 征兆效果的唯一口径：卡片浮层与顶栏汇总共用一张表。
// 原先浮层那张 map 漏了 dmg / loot / craft / move / divine，
// 「见则有兵」这类最凶的兆点开是空白——只说「有兵」，不说兵在哪儿。
const OMEN_EFFECT_LABELS = [
  ['yield','采获'], ['gather','采集速度'], ['dmg','伤害'], ['loot','所获'],
  ['offline','离线收益'], ['trade','商旅收益'], ['fish','渔获'], ['build','营造经验'],
  ['craft','制作速度'], ['move','行动速度'], ['divine','卜筮'],
];
function omenEffectText(def){
  const parts = [];
  for (const [k, label] of OMEN_EFFECT_LABELS){
    if (def[k] === undefined) continue;
    parts.push(`${label} ${def[k] > 0 ? '+' : ''}${Math.round(def[k]*100)}%${def.dur ? `（${fmtTime(def.dur)}）` : ''}`);
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
  const out = [];
  OMEN_EFFECT_LABELS.forEach(([k, label]) => { const v = omenMod(k); if (v) out.push({ label, pct: Math.round(v * 100) }); });
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
      <span class="price-trend">售价走势 ${sparkline((Game.priceHistory||[]).map(p=>p.m), 90, 22)}</span>
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
    ${(() => {
      const ready = Object.values(BUILDINGS).filter(b => !Game.buildings[b.id] && levelOf('yingyi') >= b.lvl && canAfford(b.cost)).length;
      const next = Object.values(BUILDINGS).filter(b => !Game.buildings[b.id]).sort((x, y) => x.lvl - y.lvl)[0];
      return `<div class="build-bar"><span class="hint">${ready ? `眼下可造 <b>${ready}</b> 座` : `尚无可造之筑${next ? `——下一座「${esc(next.name)}」需营邑 ${next.lvl} 级` : ''}`}</span></div>`;
    })()}
    <div class="tile-grid building-grid">
    ${(() => {
      // 与祠礼同一套思路：等级够、材料够的排前面，已成的沉底，段内按门槛从低到高
      const rows = Object.values(BUILDINGS).map(b => ({
        b, done: !!Game.buildings[b.id],
        lvOk: levelOf('yingyi') >= b.lvl,
        afford: canAfford(b.cost),
      }));
      rows.sort((x, y) => {
        if (x.done !== y.done) return x.done ? 1 : -1;
        if (x.lvOk !== y.lvOk) return x.lvOk ? -1 : 1;
        if (x.afford !== y.afford) return x.afford ? -1 : 1;
        return x.b.lvl - y.b.lvl;
      });
      return rows.map(({ b, done, lvOk, afford }) => {
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
          ${(done || afford) ? '' : (() => {
            // 缺什么、缺几件、去哪儿找——后期四座卡在料上最难受
            const lacks = b.cost.filter(([iid, q]) => totalOf(iid) < q);
            if (!lacks.length) return '';
            return `<div class="rc-lack">缺 ${lacks.map(([iid, q]) => `${esc((Items[iid]||{}).name || iid)}×${q - totalOf(iid)}`).join('、')}</div>` +
              lacks.slice(0, 2).map(([iid]) => {
                const src = (typeof itemSources === 'function') ? itemSources(iid)[0] : null;
                return src ? `<div class="rc-sub rc-src">${esc((Items[iid]||{}).name || iid)}：${esc(src.kind)} Lv${src.lvl}</div>` : '';
              }).join('');
          })()}
        </span>
      </div>`;
      }).join('');
    })()}
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
      return [row('采获', pct(y), pct(y + 0.03))];
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
      return [{ label:'凶兆之害', from: built ? '×0.50' : '×1.00', to: built ? '已生效' : '×0.50' },
              { label:'凶兆应验', from: built ? '举烽后 45 秒' : '即时', to: built ? '已生效' : '延时 45 秒' }];
    case 'xuegong':
      return [{ label:'著录度获取', from: built ? '+25%' : '—', to: built ? '已生效' : '+25%' }];
    // ---- 后期四座 ----
    case 'cuihuolu':
      return [{ label:'淬炼成功率', from: built ? '已含 +6%' : '按等级表', to: built ? '已生效' : '各级 +6%' }];
    case 'cangshuge':
      return [{ label:'修行经验', from: '×' + xpMult().toFixed(2), to: built ? '已生效' : '×' + (xpMult() + 0.10).toFixed(2) }];
    case 'zhaoxianguan':
      return [{ label:'御使增益', from: '×' + (built ? '1.15' : '1.00'), to: built ? '已生效' : '×1.15' }];
    case 'shanhaige': {
      const h = offlineCapHours(), e = offlineEff();
      return [row('离线上限', h + ' 小时', (h + 3) + ' 小时'),
              row('离线效率', pct(e), pct(e + 0.05))];
    }
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
// 行囊清单：搜索与排序共用这一个生成器。整页渲染和「边打字边筛」都走它，
// 两处各写一遍迟早会长歪（一边认别名一边不认）。
UI.packListHtml = function(){
  const q = String(this.packQuery || '').trim().toLowerCase();
  let inv = Object.entries(Game.inventory).filter(([id, n]) => n > 0);
  if (q){
    inv = inv.filter(([id]) => {
      const it = Items[id] || {};
      return String(it.name || id).toLowerCase().includes(q)
        || String(it.py || '').toLowerCase().includes(q)
        || String(id).toLowerCase().includes(q);
    });
  }
  inv.sort((a, b) => {
    if (this.invSort === 'value') return (Items[b[0]].value || 0) - (Items[a[0]].value || 0);
    if (this.invSort === 'qty') return b[1] - a[1];
    return 0;
  });
  if (!inv.length) return q ? '<div class="hint">行囊里没有对上的物件</div>' : '<div class="hint">行囊空空</div>';
  return inv.map(([id, qty]) => {
    const it = Items[id] || {};
    return `<div class="inv-card ${rarityClass(it)}" onclick="showItemDetail('${id}')">
      <span class="ic-icon">${typeof itemIc==='function'?itemIc(id,20):(it.icon||'⬜')}</span>
      <span class="ic-name">${nameTag(it.name || id, it.py)}${it.equip?gradeBadge(it):''}</span>
      <span class="ic-qty">×${qty}</span>
      <span class="ic-val">${(it.value||0)*qty} 贝</span>
    </div>`;
  }).join('');
};
// 只换清单本身：输入框不重建，光标和焦点才留得住
UI.patchPackList = function(){
  const g = $('invGrid');
  if (!g){ this.renderPack(); return; }
  g.innerHTML = this.packListHtml();
};

UI.renderPack = function(){
  const box = $('content');
  if (!box) return;
  const slots = Object.keys(GearSlotLabels);
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
               ${gradeBadge(g)}${(typeof enhanceLevel==='function'&&enhanceLevel(g.id||g)>0)?`<span class="gt-enh">+${enhanceLevel(g.id||g)}</span>`:''}
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
        <label class="search-box" title="按名称 / 注音检索行囊">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
          <input id="packQ" type="search" placeholder="检索名 / 注音" value="${esc(this.packQuery||'')}"
            oninput="UI.packQuery=this.value;UI.patchPackList()"
            onkeydown="if(event.key==='Escape'){this.value='';UI.packQuery='';UI.patchPackList()}">
        </label>
      </div>
      <details class="bulk-sell">
        <summary class="bs-sum">廛市清整<i>批量售出原材料</i></summary>
        <div class="bs-head">
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
      </details>
      <div class="inv-grid" id="invGrid">${this.packListHtml()}</div>
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
  if (g.equip && typeof gearGrade === 'function'){
    const gr = gearGrade(g);
    const cap = (typeof enhanceCapOf === 'function') ? enhanceCapOf(g) : 0;
    parts.push(`${gr.name}品${cap ? ` · 上限 +${cap}` : ''}`);
  }
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
    out.push({ kind:(Skills[it.skill] || {}).name || '采集', lvl: it.lvl || 1,
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
  for (const m of Object.values(typeof Monsters !== 'undefined' ? Monsters : {})){
    // BOSS 走单值 drop，小妖走 loot 表；两者都要看（m.loot 可能是空数组，别被真值骗了）
    const loot = (Array.isArray(m.loot) && m.loot.length) ? m.loot : [];
    const l = loot.length ? loot : (m.drop ? [[m.drop, 1, 1]] : []);
    if (!Array.isArray(l) || !l.some(x => Array.isArray(x) && x[0] === id)) continue;
    if (!m.name || seenDrop[m.name]) continue;
    seenDrop[m.name] = 1;
    drops.push(m.name);
  }
  if (drops.length) out.push({ kind:'讨伐', where: drops.slice(0, 3).join('、') + (drops.length > 3 ? ` 等 ${drops.length} 种` : '') });
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
    const d = (site.deities || []).find(x => x.gift === id);
    if (!d) continue;
    out.push({ kind:'谒见', where:`${d.name}（初谒得赐）` });
    break;
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
function enhancePanelHtml(itemId, it){
  const base = it.dmg || it.def || 0;
  if (!it.equip || !base) return '';
  const lv = enhanceLevel(itemId);
  const max = (typeof enhanceCapOf === 'function' && typeof gearGrade === 'function')
    ? enhanceCapOf(it) : ENHANCE_MAX;
  const cur = Math.floor(enhanceScaled(base, lv));
  const label = it.dmg ? '伤害' : '防御';
  const heat = (typeof enhanceHeatOf === 'function') ? enhanceHeatOf(itemId) : 0;
  const heatMax = (typeof ENHANCE_HEAT !== 'undefined') ? ENHANCE_HEAT.MAX : 12;
  const heatStep = (typeof ENHANCE_HEAT !== 'undefined') ? ENHANCE_HEAT.STEP : 0.08;
  if (lv >= max){
    return `<div class="reveal"><b>淬炼</b><span class="enh-max">已至 +${max}（上限）· ${label} ${cur}</span></div>`;
  }
  const cost = enhanceCost(itemId);
  const baseRate = enhanceRate(lv);
  const rate = Math.round((typeof enhanceRateFor === 'function' ? enhanceRateFor(itemId) : baseRate) * 100);
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
      <button class="btn small primary" onclick="UI.enhanceOne('${itemId}')">强化 +1</button>
      <span class="enh-to">
        <input id="enhTarget" type="number" min="${lv + 1}" max="${max}" placeholder="目标等级" inputmode="numeric">
        <button class="btn small" onclick="UI.enhanceTo('${itemId}')">强化至</button>
      </span>
      ${safe ? '' : `<label class="enh-stone"><input type="checkbox" id="enhStone" ${stones ? 'checked' : 'disabled'}> 用镇物</label>`}
    </div>
  </div>`;
}

// 物品详情的内容独立出来：强化 / 重铸执行后就地重绘，不关窗
UI.itemDetailHtml = function(itemId){
  const it = Items[itemId];
  if (!it) return '';
  const qty = Game.inventory[itemId] || 0;
  const rec = Game.records[itemId];
  const actions = [];
  if (it.equip){
    const lvOk = (it.lvl||1) <= relevantLevel(it);
    const recOk = (typeof reqRecordOk !== 'function') || reqRecordOk(it);
    const ok = lvOk && recOk;
    const why = !lvOk ? `需${requiredSkillName(it)} ${it.lvl}` : (!recOk ? '著录未及' : '');
    actions.push(`<button class="btn ${ok?'primary':''}" ${ok?'':'disabled'} onclick="equipItem('${itemId}');UI.closeModal()">装备${ok?'':'（'+why+'）'}</button>`);
  }
  if (it.heal || it.buff) actions.push(`<button class="btn primary" onclick="useConsumable('${itemId}');UI.closeModal()">${it.heal?'食用':'服用'}</button>`);
  if (it.value){
    actions.push(`<button class="btn" onclick="sellItem('${itemId}',1);UI.closeModal()">出售 1（${sellValue(itemId,1)} 贝）</button>`);
    if (qty > 1){
      // 全售走「点两次」：第一下改成确认态、四秒后自动复原。
      // 卖光一栈是不可逆的，弹一层新 modal 又会盖掉当前详情，二次点击最省事。
      const armed = this._sellAllArm && this._sellAllArm.id === itemId && (Date.now() - this._sellAllArm.at < 4000);
      actions.push(`<button class="btn ${armed?'primary':''}" onclick="UI.sellAllOf('${itemId}')">${armed ? `确认售出全部 ${qty} 件？` : `全售 ${qty}（${sellValue(itemId,qty)} 贝）`}</button>`);
    }
  }

  const hasAffix = it.equip && typeof affixSlotOf === 'function' && affixSlotOf(it);
  const afList = hasAffix ? affixOf(itemId) : [];
  const afCost = hasAffix ? affixReforgeCost(itemId) : null;
  const afOk = afCost ? ((Game.inventory.tan || 0) >= afCost.tan && Game.shells >= afCost.shells) : false;

  return `<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(itemId,18):it.icon}</span> ${esc(it.name)} ${it.equip?gradeBadge(it):`<span class="tier">${rarityName(it)}</span>`}</h3>
    <div class="meta">行囊 ${qty} 件${rec?` · 著录 ${rec.count} 次（${TUNING.MASTERY.NAMES[rec.tier]}）`:''}</div>
    ${it.form?`<div class="reveal"><b>形态</b>${esc(it.form)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
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
      const body = uses.length
        ? uses.slice(0, 10).map(u => `<span class="use-chip ${u.rite ? 'rite' : ''}">${u.kind}·${esc(u.name)}</span>`).join('') + (uses.length > 10 ? `<span class="hint">等 ${uses.length} 处</span>` : '')
        : (crop ? '' : '<span class="hint">暂无合用之方——可售或留作图鉴</span>');
      const price = (typeof sellValue === 'function' && it.value) ? `<span class="hint">回收 ${sellValue(itemId, 1)} 贝 / 件</span>` : '';
      return (body || crop) ? `<div class="reveal"><b>用途</b><span class="use-box">${crop}${body}${price}</span></div>` : '';
    })()}
    ${it.divine && typeof DIVINE_EFFECTS !== 'undefined' && DIVINE_EFFECTS[it.divine]
      ? `<div class="reveal"><b>神兵</b><span class="dv-tag">${esc(DIVINE_EFFECTS[it.divine].label)}</span><span class="dv-text">${esc(DIVINE_EFFECTS[it.divine].text)}</span></div>` : ''}
    ${enhancePanelHtml(itemId, it)}
    ${afList.length?`<div class="reveal"><b>词条</b>${afList.map(x=>`<span class="af-txt"><i>${esc(x.name)}</i>${esc(x.text)}</span>`).join('')}</div>`:''}
    ${afCost?`<div class="reveal"><b>重铸</b><span class="af-recost">换一组词条（炭×${afCost.tan} · ${afCost.shells} 贝）</span>
      <button class="btn small ${afOk?'primary':''}" ${afOk?'':'disabled'} onclick="UI.reforgeNow('${itemId}')">重铸</button></div>`:''}
    ${it.buff?`<div class="reveal"><b>服用</b>${esc(it.buff.name)}（${it.buff.dur}s）</div>`:''}
    ${it.heal?`<div class="reveal"><b>食用</b>回血 ${it.heal}</div>`:''}
    <div class="modal-btns">${actions.join('')}<button class="btn" onclick="UI.closeModal()">闭</button></div>`;
};

function showItemDetail(itemId){
  if (!Items[itemId]) return;
  if (UI._detailId !== itemId) UI._enhLast = null;   // 换了一件，上一件的成败记录不该跟着跑
  UI._detailId = itemId;
  UI.modal(UI.itemDetailHtml(itemId));
}

// 就地重绘：保持滚动位置，免得强化一下就被弹回顶部
UI.refreshItemModal = function(itemId){
  const box = $('modalBox');
  const y = box ? box.scrollTop : 0;
  UI.modal(UI.itemDetailHtml(itemId));
  const box2 = $('modalBox');
  if (box2) box2.scrollTop = y;
};

// 锁定面板上的强化按钮：演出期间不接受第二次点击
UI._lockEnhPanel = function(){
  const box = $('modalBox');
  if (!box) return;
  const one = box.querySelector('.enh-btns .btn.primary');
  if (one){ one.disabled = true; one.textContent = '鼓铸中…'; }
  const to = box.querySelector('.enh-to .btn');
  if (to) to.disabled = true;
};

// 揭晓：等级数字跳一下；失败震一下弹窗，掉零再补一句「尽毁」
UI._revealEnh = function(itemId, r){
  const box = $('modalBox');
  if (!box) return;
  const lvEl = box.querySelector('.enh-lv');
  if (typeof FX === 'undefined') return;
  if (r.success && lvEl){
    FX.pop(lvEl);
    FX.floatAtEl(box.querySelector('.enh-val') || lvEl, `淬成 +${r.lvAfter}`, '#D9A521', true);
  } else if (r.wiped){
    FX.shakeHard(box);
    FX.floatAtEl(box.querySelector('.enh-val') || lvEl, '阶数尽毁', '#B03A2B', true);
  } else if (r.lost){
    FX.shakeHard(box);
  }
};

UI.enhanceOne = function(itemId){
  if (UI._enhBusy) return;
  const stoneEl = $('enhStone');
  const stone = !!(stoneEl && stoneEl.checked);
  const it = Items[itemId];
  // 先落库：料照扣、成败已定，但先扣着不揭晓——那一秒半的锤声就是悬念。
  const r = enhanceItem(itemId, { stone });
  if (!r.ok){
    UI._enhLast = { id:itemId, text: r.reason || '未能强化', cls:'bad' };
    UI.refreshItemModal(itemId);
    return;
  }
  if (r.success) UI._enhLast = { id:itemId, text:`成：+${r.lvBefore} → +${r.lvAfter}`, cls:'good' };
  else if (r.wiped) UI._enhLast = { id:itemId, text:`毁：+${r.lvBefore} → +0`, cls:'bad' };
  else if (r.lost) UI._enhLast = { id:itemId, text:`败：跌至 +${r.lvAfter}`, cls:'bad' };
  else UI._enhLast = { id:itemId, text:`败：${r.usedStone ? '镇物护住原阶' : '仅损材料'}`, cls:'sys' };

  const played = (typeof UI.forgeShow === 'function') && UI.forgeShow(it, { heavy:false });
  if (!played){ UI.refreshItemModal(itemId); UI._revealEnh(itemId, r); return; }

  UI._enhBusy = true;
  UI._lockEnhPanel();
  setTimeout(()=>{
    UI._enhBusy = false;
    UI.refreshItemModal(itemId);
    UI._revealEnh(itemId, r);
  }, 1250);
};

UI.enhanceTo = function(itemId){
  if (UI._enhBusy) return;
  const el = $('enhTarget');
  const t = parseInt(el && el.value, 10);
  if (!isFinite(t)){ UI.toast('先填目标等级'); return; }
  const stoneEl = $('enhStone');
  const stone = !!(stoneEl && stoneEl.checked);
  const it = Items[itemId];
  const played = (typeof UI.forgeShow === 'function') && UI.forgeShow(it, { heavy:true });
  if (played){ UI._enhBusy = true; UI._lockEnhPanel(); }
  const run = ()=>{
    const r = enhanceToTarget(itemId, t, { stone, noToast: true });
    UI._enhLast = { id:itemId, cls: r.done ? 'good' : (r.wiped ? 'bad' : 'sys'),
      text: `${r.done ? '已至' : (r.wiped ? '尽毁于' : '止于')} +${r.lv}（${r.tries} 次 · 成 ${r.ups} 败 ${r.downs}${r.stones ? ` · 镇物 ${r.stones}` : ''}）` };
    UI.toast(r.done ? `🔨 已至 +${r.lv}` : (r.wiped ? `💥 阶数尽毁，止于 +${r.lv}` : `… 止于 +${r.lv}`));
    UI._enhBusy = false;
    UI.refreshItemModal(itemId);
    const box = $('modalBox');
    if (box && typeof FX !== 'undefined'){
      if (r.done){ FX.floatAtEl(box.querySelector('.enh-lv') || box, `已至 +${r.lv}`, '#D9A521', true); }
      else if (r.wiped){ FX.shakeHard(box); }
    }
  };
  if (played) setTimeout(run, 1450);
  else run();
};

// 全售：第一下只是上膛，第二下才真卖（四秒内有效）。卖光一栈不可逆，
// 而详情本身已经是个 modal，再弹一层确认会把当前上下文顶掉。
UI.sellAllOf = function(itemId){
  const have = Game.inventory[itemId] || 0;
  if (have <= 0){ this.toast('行囊里没有这件'); return 0; }
  const arm = this._sellAllArm;
  if (!arm || arm.id !== itemId || Date.now() - arm.at > 4000){
    this._sellAllArm = { id:itemId, at:Date.now() };
    this.refreshItemModal(itemId);
    this.toast(`再点一次「确认」，售出全部 ${have} 件`);
    return 0;
  }
  this._sellAllArm = null;
  const gain = sellItem(itemId, have);
  if (gain > 0){
    this.toast(`⚖️ 售出 ${have} 件，得贝 ${gain}`);
    if (this.currentTab === 'pack') this.renderPack();
    else this.refreshItemModal(itemId);
  }
  return gain;
};

UI.reforgeNow = function(itemId){
  const ok = reforgeItem(itemId);
  UI._enhLast = { id:itemId, text: ok ? '词条已重铸' : '重铸未成', cls: ok ? 'good' : 'bad' };
  UI.refreshItemModal(itemId);
};

window.showItemDetail = showItemDetail;

// ================= 统计 =================
// 进度数字用原样整数（不足一万不缩写）：10000 次写成「10.0K」反而不如「10000」直观
const prNum = (v) => (v > 10000 ? fmt(v) : String(v));

UI.renderStats = function(){
  const box = $('content');
  if (!box) return;
  const s = Game.stats;
  const gatherRows = Object.entries(s.gathers||{}).map(([k,v])=>`<span>${Skills[k]?Skills[k].name:k} <b data-gather="${k}">${v}</b></span>`).join('') || '<span class="hint">未采</span>';
  // 六凶与全部凶神分开算：分子分母必须同一口径，否则「杀过刑天」会被算进六凶
  const bossList = Object.values(Monsters).filter(m => m.boss);
  const bossDone = bossList.filter(m => (s.bossKills || {})[m.id]).length;
  const sixDone = (typeof SIX_BEASTS !== 'undefined' ? SIX_BEASTS : []).filter(id => (s.bossKills || {})[id]).length;
  const bossAll = bossList.length;
  box.innerHTML = `<div class="stat-grid">
    <div class="panel stat-panel"><h3>讨伐</h3>
      <div class="stat-rows">
        <span>击杀 <b data-stat="kills">${s.kills}</b></span>
        <span>败北 <b data-stat="deaths">${s.deaths}</b></span>
        <span class="stat-link" onclick="UI.switchTab('taofa')" title="前往征伐页">六凶 <b data-stat="six">${sixDone}/${SIX_BEASTS.length}</b></span>
        <span class="stat-link" onclick="UI.switchTab('taofa')" title="前往征伐页">凶神 <b data-stat="bosses">${bossDone}/${bossAll}</b></span>
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
        ${(() => {
          // 统计报「还差几处」，得给一条去路——否则玩家看完数字还是得一座座山翻
          const hs = (typeof heteroSites === 'function') ? heteroSites() : [];
          if (!hs.length) return '';
          const done = hs.filter(x => x.done).length;
          return `<span class="stat-link" onclick="UI.gotoHetero()" title="观象 / 谒见 / 灌木三类一次性地点">异迹 <b data-stat="hetero">${done}/${hs.length}</b><i class="stat-go">查看索引</i></span>`;
        })()}
        <span>营造 <b data-stat="buildings">${Object.keys(Game.buildings).length}/${Object.keys(BUILDINGS).length}</b></span>
      </div></div>
    <div class="panel stat-panel ms-panel"><h3>长线成就<span class="hint ms-note">进度与达成同源</span></h3>
      <div class="stat-rows ms-rows">
        ${(window.Milestones||[]).map((ms,i)=>{
          // 进度条与判定读同一份数（ms.prog），不会出现「显示 38/39 却已点亮」
          const done = ms.check();
          const pr = (typeof ms.prog === 'function') ? ms.prog() : null;
          const pct = pr ? Math.min(100, pr[0] / Math.max(1, pr[1]) * 100) : (done ? 100 : 0);
          return `<span data-ms="${i}" class="${done?'done':''}" title="${esc(ms.desc)}">
            <span class="ms-mark">${done?(typeof markIcon==='function'?markIcon('check',13):'✔'):'<span class="ms-open"></span>'}</span>
            <span class="ms-name">${esc(ms.name)}</span>
            ${pr?`<b class="ms-prog">${prNum(pr[0])}/${prNum(pr[1])}</b>`:''}
            <i>${esc(ms.bonus)}</i>
            ${pr?`<span class="ms-bar"><i style="width:${pct.toFixed(1)}%"></i></span>`:''}
          </span>`;
        }).join('')}
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
        <button class="btn" onclick="UI.shareCard()">复制战绩</button>
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
// 复制文本：优先 Clipboard API，失败（http 页面、老浏览器、无权限）就弹一段可手选的文本。
// 群里要贴的东西多半是长串数字，手打必错，所以这条降级不能省。
UI.copyText = function(text, okMsg){
  const done = () => UI.toast(okMsg || '已复制');
  const fallback = () => UI.modal(`<h3>请手动复制</h3>
    <p class="hint">此环境不允许自动复制，选中下面这行按 Ctrl/⌘ + C 即可。</p>
    <textarea class="copy-box" rows="4" readonly onclick="this.select()">${esc(text)}</textarea>
    <div class="modal-btns"><button class="btn primary" onclick="UI.closeModal()">好</button></div>`);
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, fallback);
    return true;
  }
  fallback();
  return false;
};

// 战绩：一段可粘贴的纯文本。字段与将来的排行榜一致，先把它们凑到一处。
UI.shareCard = function(){
  const t = (typeof shareText === 'function') ? shareText() : '';
  if (!t){ this.toast('暂无可录之绩'); return; }
  this.copyText(t, '📜 战绩已复制，粘到群里即可');
};

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
      <h4>同好</h4>
      <p class="ab-p">山海之大，一人录不完。有疑问、有错漏、想催更，或只是想说说哪座山的异兽最难缠——都请来群里坐坐。</p>
      <div class="ab-group">
        <span class="abg-lab">QQ 群</span>
        <b class="abg-no">${esc(GAME_META.group || '')}</b>
        <button class="btn small" type="button" onclick="UI.copyText('${esc(GAME_META.group || '')}','QQ 群号已复制')">复制群号</button>
      </div>
      <div class="ab-share">
        <button class="btn small" type="button" onclick="UI.shareCard()">录一卷 · 复制战绩</button>
        <span class="hint">修为、著录、六凶、最高强化一并列出，粘到群里即可（也可用来报进度 / 报错）</span>
      </div>
      <p class="hint ab-note">群号只此一处，本作不放任何外链；群里也不发安装包，进群只为说话。</p>
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
  // ⚠️ 这一处曾把「凶神」写成 `keys(bossKills).length + '/7'`：静态渲染修好之后，
  // 统计页开着每秒一次的 patch 又把它改回错的那个数。两处的口径必须一起改。
  const bossAll = Object.values(Monsters).filter(m => m.boss).length;
  const bossDone = Object.values(Monsters).filter(m => m.boss && (s.bossKills || {})[m.id]).length;
  const sixAll = (typeof SIX_BEASTS !== 'undefined' ? SIX_BEASTS : []);
  const sixDone = sixAll.filter(id => (s.bossKills || {})[id]).length;
  const vals = {
    kills: String(s.kills), deaths: String(s.deaths),
    bosses: bossDone + '/' + bossAll,
    six: sixDone + '/' + sixAll.length,
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
    // 进度数与进度条也要跟着走：统计页开着的时候，著录、讨伐都在变
    if (typeof ms.prog === 'function'){
      const p = ms.prog();
      const prog = el.querySelector ? el.querySelector('.ms-prog') : null;
      if (prog){
        const txt = prNum(p[0]) + '/' + prNum(p[1]);
        if (prog.textContent !== txt) prog.textContent = txt;
      }
      const bar = el.querySelector ? el.querySelector('.ms-bar > i') : null;
      if (bar && bar.style) bar.style.width = Math.min(100, p[0] / Math.max(1, p[1]) * 100).toFixed(1) + '%';
    }
  });
};
// 方块的「行祭」：先校验等级与祭品，缺什么说清楚
UI.tryRite = function(id){
  const rec = Recipes.find(r => r.type === 'rite' && r.out === id);
  if (!rec) return;
  if (levelOf('jisi') < rec.lvl){ UI.toast(`🔒 需祭祀 ${rec.lvl} 级`); return; }
  if (!canAfford(rec.cost)){
    // 缺料不该只用一句 toast 打发：玩家站在原地不知道「牛」去哪儿找。
    // 逐项列出缺多少，并附上产地 / 掉落 / 墟市价。
    const rows = rec.cost.filter(([iid, q]) => totalOf(iid) < q).map(([iid, q]) => {
      const it = Items[iid] || {};
      const src = itemSources(iid).filter(s => s.kind !== '回收');
      const where = src.length
        ? src.map(s => `<span class="use-chip">${s.kind}·${esc(s.where)}</span>`).join('')
        : '<span class="hint">来源未明</span>';
      return `<div class="lack-row">
        <b>${esc(it.name || iid)}</b>
        <span class="lack-n">缺 ${q - totalOf(iid)}</span><span class="lack-have">现 ${totalOf(iid)} / ${q}</span>
        <span class="use-box">${where}</span>
      </div>`;
    }).join('');
    UI.modal(`<h3>祭品不备</h3>
      <p class="hint">「${esc((Items[id] || {}).name || id)}」所需祭品尚缺：</p>
      ${rows}
      <div class="hint">备齐后再点方块行祭；若已开续祭，备齐后自会续上。</div>
      <div class="modal-btns"><button class="btn on" onclick="UI.closeModal()">知道了</button></div>`);
    return;
  }
  performRite(id);
  UI.renderJisi();
};
// 方块右上「续」：把这一礼交给门人代办（到期前自动重备祭品）
UI.toggleRiteAuto = function(id){
  if (typeof toggleRiteAuto !== 'function') return;
  toggleRiteAuto(id);
  UI.renderJisi();
};
UI.stopAllRiteAuto = function(){
  const ids = Object.keys(Game.riteAuto || {}).filter(id => Game.riteAuto[id]);
  if (!ids.length) return;
  for (const id of ids) delete Game.riteAuto[id];
  if (Game.riteStall) for (const id of ids) delete Game.riteStall[id];
  log('🕯️ 续祭全停', 'dim', 'sys');
  UI.toast('已停全部续祭');
  if (typeof saveGame === 'function') saveGame();
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
    UI.toast(`⏹ 上次往讨已收兵${mm ? '：' + mm.name : ''}\n离山期间按场次结算，可前往征伐页再战`);
    log('⏹ 上次往讨已收兵（战斗不跨会话，收益已按离山时长结算）', 'sys', 'combat');
    delete Game._droppedCombat;
  }
  try { if (!localStorage.getItem(TUT_KEY) && Object.keys(Game.records).length === 0) showTutorial(); } catch(e){}
  // 离开页面（切后台 / 关页）时把待上传的改动尽力推去云端
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'hidden' && typeof flushCloudSave === 'function') flushCloudSave();
  });
  window.addEventListener('pagehide', ()=>{ if (typeof flushCloudSave === 'function') flushCloudSave(); });
  window.addEventListener('beforeunload', ()=>{ if (typeof flushCloudSave === 'function') flushCloudSave(); });
  // 开机结算：关页再开的那段时长交给离线结算（此前只认页面活着时累积的时间）
  try { if (typeof settleOnBoot === 'function') settleOnBoot(); } catch(e){ console.error('离线结算失败', e); }
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

// 纯函数式的小工具挂到 window：浏览器里 window === globalThis 本无差别，
// 但测试在 vm 里跑，顶层 function 声明只落 context、不落 window，显式导出才可断言。
window.itemUses = itemUses; window.itemSources = itemSources;
window.gatherGate = gatherGate;
window.combatStatBreakdown = combatStatBreakdown;
window.structureEffectRows = structureEffectRows;

window.init = init;
window.UI = UI;
