// ===== ui/core.js — 界面核心：UI 对象、工具函数、顶栏与导航、弹窗、日志、键盘可达性 =====
// 由 src/ui.js 拆分而来（v1.31.8）。加载顺序见 index.html：core 必须最先（UI 对象在这里定义），
// 其余按页顺序；跨文件调用的函数与常量都在全局词法环境里，运行时才求值，先后不影响调用。

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
    // 同一句话连着弹（解锁多个山系、连战收兵）只留最上面一条：
    // 挂机回来时能一次叠出七八条，把整个屏幕下半截盖住。
    const last = box.lastElementChild;
    if (last && last._toastText === text) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d._toastText = text;
    d.innerHTML = markHtml(text, 15);
    box.appendChild(d);
    // 至多四条同屏：更早的立刻收掉（它们本来也快到期了）
    if (box.children) while (box.children.length > 4) box.removeChild(box.firstElementChild);
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
    // 顶栏状态条：限次往讨要报「还剩几场」。无限连战（repeat == null）不报，
    // 那种打法本来就没有「还剩」这回事，写个 ∞ 反而添乱。
    if (c && c.repeat != null){
      const t = $('activityText');
      if (t){
        const nm = (Monsters[c.monsterId] || {}).name || '';
        const txt = `往讨：${nm}（余 ${c.repeat} 场）`;
        if (t.textContent !== txt) t.textContent = txt;
      }
    }
    if (!c){
      if (this._combatActive){
        this._combatActive = false;
        this.afterCombatEnd(this._lastMobId);
        if (this.refreshActivity) this.refreshActivity();   // 收兵：顶栏从「余 N 场」回到实际状态
      }
      return;
    }
    this._combatActive = true;
    this._lastMobId = c.monsterId;
    if (this.currentTab !== 'taofa') return;
    const m = Monsters[c.monsterId];
    if (!m) return;
    // 这段每 250ms 跑一次。值没变就别写 DOM：
    // - innerHTML 每次都会重新解析并重建节点（估值块的选中态、复制中的文字都会被打断）；
    // - textContent 同值赋给也会触发一次样式重算，挂机一晚上是几万次白工。
    const write = (el, key, val, prop) => {
      if (!el) return;
      if (el['_hud' + key] === val) return;
      el['_hud' + key] = val;
      if (prop === 'html') el.innerHTML = val;
      else if (prop === 'cls') el.className = val;
      else if (prop === 'width') el.style.width = val;
      else el.textContent = val;
    };
    const pf = playerEl() && playerEl().querySelector('.f-hp .fill');
    write(pf, 'pw', Math.max(0, c.playerHp / playerMaxHp() * 100).toFixed(1) + '%', 'width');
    const mf = monsterEl() && monsterEl().querySelector('.f-hp .fill');
    write(mf, 'mw', Math.max(0, c.monsterHp / m.hp * 100).toFixed(1) + '%', 'width');
    const ms = monsterEl() && monsterEl().querySelector('.f-sub');
    write(ms, 'hp', fmt(Math.max(0, c.monsterHp)) + ' / ' + fmt(m.hp));
    const cs = $('combatStats');
    write(cs, 'stats', `回合 ${c.round||0} · 造成 ${c.dmgOut||0} · 承伤 ${c.dmgIn||0}${Game.stats.winStreak>1?` · 连胜 ${Game.stats.winStreak}`:''}`);
    const est = $('combatEst');
    if (est){
      const r = combatEstimateInner(m, c, c.monsterHp);
      if (r){
        const sig = r.cls + '|' + r.html;
        if (est._hudEst !== sig){
          est._hudEst = sig;
          est.className = 'combat-est ' + r.cls;
          est.innerHTML = r.html;
        }
      }
    }
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
    // 不整页重建技能页：在技能页点一个配方开始制作，原先会把 26 技能卡 + 全部配方
    // 重绘一遍，滚动位置直接跳回顶部。现在只改「哪张卡是高亮」这一件事。
    this.patchSkillActive();
  },
  // 技能页的经验条每秒跟进：挂机时等级与进度原本只在切页 / 重建时更新，
  // 玩家盯着看会以为「没在涨」。只改数字与宽度，不动节点。
  patchSkillBars(){
    if (this.currentTab !== 'skills' || typeof document === 'undefined') return;
    const tiles = document.querySelectorAll('.skill-tile');
    if (!tiles || !tiles.length) return;
    for (const el of tiles){
      const id = el.dataset && el.dataset.skill;
      const raw = id && Game.skills[id];
      if (!raw) continue;
      const lv = raw.level || 1;
      const xc = xpForLevel(lv), xn = xpForLevel(lv + 1);
      const pct = xn > xc ? Math.min(100, Math.max(0, ((raw.xp || 0) - xc) / (xn - xc) * 100)) : 100;
      const lvEl = el.querySelector('.sk-lv');
      if (lvEl && lvEl.textContent !== String(lv)) lvEl.textContent = String(lv);
      const bar = el.querySelector('.sk-bar i');
      if (bar){
        const w = pct.toFixed(1) + '%';
        if (bar.style.width !== w) bar.style.width = w;
      }
    }
    // 田地标题上的圃艺等级/经验也跟着秒级走（经验每收获一次就变）
    const flv = document.getElementById('farmPuyiLv');
    if (flv && typeof farmLevelText === 'function'){
      const t = farmLevelText();
      if (flv.textContent !== t) flv.textContent = t;
    }
  },
  // 技能页当前的行动高亮：只切 class，不重建节点
  patchSkillActive(){
    if (this.currentTab !== 'skills' || typeof document === 'undefined') return;
    const a = Game.activity;
    const tiles = document.querySelectorAll('.skill-tile');
    if (!tiles || !tiles.length) return;
    for (const el of tiles){
      const id = el.dataset && el.dataset.skill;
      if (!id) continue;
      const on = !!(a && ((a.kind === 'gather' && a.skill === id)
        || (a.kind === 'craft' && a.recipe && mapRecipeSkill(a.recipe.type) === id)));
      if (el.classList.contains('active') !== on) el.classList.toggle('active', on);
    }
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
  // 三段式：标题 / 内容（可滚） / 按钮（固定底部）。
  // 原先整个盒子一起滚，物品详情、离线归来这类长内容一往下翻，按钮就跟着滑走了；
  // 手机上想点「售出」还得先滚回底部。现在按钮永远在下方，内容只在中间滚。
  modal(html){
    const m = $('modal'), box = $('modalBox');
    if (!m || !box) return;
    box.innerHTML = html;
    // 无头环境（测试 stub）没有 querySelector：跳过分段，别把渲染整条路拖垮
    if (typeof box.querySelector === 'function' && !box.querySelector(':scope > .modal-body')) this._splitModal(box);
    m.classList.remove('hidden');
    if (document.body) document.body.classList.add('no-scroll');   // 弹窗开着时，背景不跟着滚
  },
  _splitModal(box){
    const head = box.querySelector(':scope > h3');
    const btns = box.querySelector('.modal-btns');
    const body = document.createElement('div');
    body.className = 'modal-body';
    [...box.children].forEach(ch => { if (ch !== head && ch !== btns) body.appendChild(ch); });
    box.appendChild(body);
    if (btns){
      const foot = document.createElement('div');
      foot.className = 'modal-foot';
      foot.appendChild(btns);          // appendChild 会把它从原位置摘走
      box.appendChild(foot);
    }
  },
  closeModal(){
    const m = $('modal');
    if (m) m.classList.add('hidden');
    if (document.body) document.body.classList.remove('no-scroll');
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
    // 这里每 500ms 被调一次（顶栏刷新）。同值写 textContent / title / classList
    // 都会触发一次属性变更与样式重算，挂机一晚毫无意义——先比后写。
    if (n){
      const txt = s.count > 99 ? '99+' : String(s.count);
      if (n.textContent !== txt) n.textContent = txt;
      const hide = s.count === 0;
      if (n.classList.contains('hidden') !== hide) n.classList.toggle('hidden', hide);
    }
    const on = s.count > 0;
    if (btn.classList.contains('on') !== on) btn.classList.toggle('on', on);
    const title = on ? `增益一览（${s.count} 项）` : '增益一览（当前无）';
    if (btn.title !== title) btn.title = title;
    // 浮层开着就连带刷新：增益 / 征兆到期时展开层的内容要跟上（倒计时尤其）。
    // 浮层里的倒计时按秒变，500ms 重建纯属浪费，节流到 1 秒。
    const pop = $('buffPop');
    if (pop && !pop.classList.contains('hidden')){
      const now = Date.now();
      if (!this._buffPopAt || now - this._buffPopAt >= 1000){
        this._buffPopAt = now;
        const html = this.buffPopHtml();
        if (pop._buffSig !== html){ pop._buffSig = html; pop.innerHTML = html; }
      }
    }
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

// 存档体积：玩家反馈「卡 / 存不上」时，第一件事是问存档多大。
// 这里直接序列化一次算字节数（约 4KB，毫秒级），不读 localStorage。
function saveSizeKb(){
  try {
    const txt = JSON.stringify(serializeSave());
    return Math.max(1, Math.round(txt.length / 1024));
  } catch(e){ return '—'; }
}

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
          <div class="form-row"><span>存档体积</span><b>${saveSizeKb()} KB</b>
            <span class="hint">${Object.keys(Game.records||{}).length} 条著录 · ${Object.keys(Game.map||{}).length} 座山已访</span></div>
          <div class="form-row"><span>版本</span><b>v${esc((typeof GAME_META!=='undefined'&&GAME_META.version)||'—')}</b>
            <span class="hint">${esc((typeof GAME_META!=='undefined'&&GAME_META.updated)||'')}</span></div>
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
      <div class="help-sec"><b>商旅 · 观象 · 圃艺</b><p class="hint">以贝币买卖物品、低买高卖；观象提升离线上限（基础 ${TUNING.OFFLINE.CAP_H} 小时，每处观象 +1、仓廪 +2、土窟 +1，另会长线成就与会员加成；现为 ${offlineCapHours()} 小时）与离线效率；圃艺种植收成。</p>
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
    const _plots = (typeof farmPlots === 'function') ? farmPlots() : (TUNING.FARM_PLOTS || 6);
    for (let i = 0; i < _plots; i++) if (!Game.farms['p'+i]) empty.push(i);
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
    const better = Object.values(Items).some(it=>it.equip && (typeof bagQty==='function'?bagQty(it.id):(Game.inventory[it.id]||0)) > 0 && (it.lvl||1) <= relevantLevel(it));
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
