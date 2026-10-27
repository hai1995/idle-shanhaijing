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
// 界面上的数字一律走 fmtNum（万 / 亿）。这里只保留一个转交，
// 免得「K/M/B」和「万/亿」两套写法又各长各的（2026-10-26 夜间统一）。
function fmt(n){
  if (typeof fmtNum === 'function') return fmtNum(n);
  return String(Math.floor(Number(n) || 0));   // 极端情况：game.js 未加载
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
// 时长只有一种写法，实现在 game.js 的 fmtDur（界面与战绩共用一份）。
// 这里保留 fmtTime 这个名字：30 处调用都在界面层，改名只能制造噪音。
// 与 fmtClock 的区别要留住：fmtClock 是「钟面上的读数」（H:MM，不写单位、
// 不跨天），给方块角标用；fmtTime 是「话里的时长」（1 天 2 小时）。
function fmtTime(sec){
  if (typeof fmtDur === 'function') return fmtDur(sec);
  return Math.max(0, Math.floor(sec || 0)) + ' 秒';
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
// 角标用的极短时长：15′ / 3h / 40s。完整倒计时仍在浮层里。
// 必须定义在 UI 对象之外——UI 是对象字面量，里面只能放方法，不能 function 声明。
function shortLeft(sec){
  sec = Math.max(0, Math.round(sec || 0));
  if (sec >= 3600) return Math.round(sec / 3600) + 'h';
  if (sec >= 60) return Math.ceil(sec / 60) + '′';
  return sec + 's';
}
const UI = {
  currentTab: 'yudi',
  logEntries: [],
  logFilter: 'all',
  selRegion: 'nanshan-1',
  selNode: 'nanshan-1-01',
  codexTab: 'beast',
  codexQuery: '',
  codexOnlyMiss: false,   // 只列未著录的条目
  codexReachOnly: false,  // 只列此刻能前往的条目（与仅未录可叠加，v1.31.49）
  skillFilter: 'all',
  recipeSkill: 'burn',
  queueKind: 'qiaocai',
  invSort: 'default',
  packFilter: 'all',        // 行囊类别筛选：all | mat | gear | food | sp
  packQuery: '',            // 行囊检索词（原先只在 pack.js 里隐式用 this.packQuery）
  recipeQuery: '',          // 配方检索词；有词时跨全部技艺搜索
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
  actionFeedback(skillId, itemId, qty, opts){
    const el = document.querySelector(`[data-skill="${skillId}"]`);
    if (el){
      FX.pop(el);
      const ic = (typeof itemIc === 'function') ? itemIc(itemId, 15) : '';
      this.floatText(el, `${ic}×${qty}`, '#D9A521');
    }
    // 现场里同步「落地」（v1.31.54）：物品从土里蹦出来。
    // 技能卡上的飘字只有玩家正看着那张卡时才有意义，挂机时多半在别的页面；
    // 现场条挂在仪表带下方，哪一页都看得见。
    if (this.sceneBeat) this.sceneBeat(itemId, qty, opts);
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
    // 现场底部那根细线：看画面时眼睛在现场，进度也该在那儿。
    const sp = $('sceneProg');
    if (sp) sp.style.width = pct.toFixed(1) + '%';
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
    if (t) t.textContent = activityLabelText();
    // 停止按钮：有「可停的行动」就出现——采集/制作等行动如此，往讨亦然
    // （停战结束当前这一场且不再自动接战，见 game.js stopActivity）
    const bs = $('btnStop');
    if (bs) bs.classList.toggle('hidden', !(Game.activity || Game.combat));
    // 仪表带上的活动指示点：忙碌时转朱色，空闲时保持墨灰
    const sb = $('statusbar');
    if (sb) sb.classList.toggle('running', !!(Game.activity || Game.combat));
    this.tickProgress();
    if (this.renderScene) this.renderScene();
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
  // 弹窗（modal / _splitModal / closeModal）、离线归来（showOfflineSummary）
  // 与御使入槽提示已搬到 ui/modal.js（v1.31.91）。core.js 只留导航与键盘可达性。
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
    // 切页回顶：整块内容重建后浏览器会沿用旧的滚动位置，切到较短的页面就会停在半空，
    // 得自己往上拖——换页本就该从头读。同一页内的局部重绘不走这里（那边另有保滚动）。
    if (changed){
      try { window.scrollTo(0, 0); } catch (e) {}
      const cc = $('content');
      if (cc) cc.scrollTop = 0;
    }
    // 切页入场：整块内容一次性归位，取代逐元素延迟造成的拖沓
    const c = $('content');
    if (c && changed && c.classList){
      // v1.31.126：原先用 `void c.offsetWidth` 强制重排来重启动画——而这里刚做完
      // `content.innerHTML = ...`，那次重排要排版整页，webkit 实测 151ms，全花在
      // 「点了页签→页面出现」之间，就是切页卡的元凶。同一个效果不必同步强排：
      // 先把 class 摘掉，到下一帧再挂上，浏览器自然会在两帧之间重算，动画照样从头播。
      c.classList.remove('enter');
      clearTimeout(this._enterTimer);
      const addEnter = ()=>{
        // 期间又切了别的页：这次入场就算了，免得两页的动画互相打断
        if (this.currentTab !== tab) return;
        c.classList.add('enter');
        this._enterTimer = setTimeout(()=>c.classList.remove('enter'), 480);
      };
      const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : null;
      if (raf) raf(addEnter);
      else if (typeof setTimeout === 'function') setTimeout(addEnter, 16);
      // ⚠️ 动画播完必须摘掉 class：`#content.enter > *` 是「任何直接子元素」，
      // 留着它，之后每次局部重绘（战斗结束重建目标列表等）新节点都会重新匹配、
      // 再播一遍淡入 + 位移——连战时整页每几秒闪一下，正是「征伐页卡顿」的观感来源
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
    // 现场的画面颜色不是 CSS 变量给的，是渲染时按主题挑的墨色写进内联样式（见 sceneInkOf）。
    // 不在这里重画一次，切到夜间后那条现场会留着一身「日间的深墨」——整条看不见。
    if (this.renderScene) this.renderScene();
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
    // 幽灵滚动条的测量延到下一帧（v1.31.126）：它要读 scrollHeight，而刚改完 DOM 的
    // 第一次读会强制整页布局——webkit 实测 131ms，正好夹在「点了页签」和「页面出现」
    // 之间，体感就是切页卡。它只是为了收掉一条几乎滑不动的滚动条，晚一帧完全够。
    this.fitGhostScrollbarSoon();
  },
  // 每帧只排一次：连续切页时不必排队多次测量
  fitGhostScrollbarSoon(){
    if (this._ghostRAF) return;
    const run = ()=>{ this._ghostRAF = 0; try { this.fitGhostScrollbar(); } catch (e) {} };
    const raf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : null;
    if (raf) this._ghostRAF = raf(run) || 1;
    else if (typeof setTimeout === 'function') this._ghostRAF = setTimeout(run, 16) || 1;
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
  //
  // v1.31.126 性能修正：原实现每次都先 `apply(base)` 写回基准、再读 scrollHeight，
  // 是 4 次**强制同步布局**串成一条依赖链（写→读→写→读）。webkit 上实测 130ms，
  // 而技能页真正的渲染只要 8ms——「切页卡」几乎全花在这里。
  // 现在：只在「结果与当前值不同」时写一次；值没变就直接返回，一次重排都不触发。
  fitGhostScrollbar(){
    const de = document.documentElement;
    const app = document.getElementById('app');
    if (!de || !app) return;
    const base = parseFloat(getComputedStyle(de).getPropertyValue('--app-pad-b-base')) || 28;
    // 上次已经定过的值：同一页反复刷（挂机时的定时重绘）不该再量一遍
    const curRaw = de.style.getPropertyValue('--app-pad-b');
    const cur = curRaw ? parseFloat(curRaw) : NaN;
    const apply = (v)=>{
      const s = Math.max(0, v) + 'px';
      if (de.style.getPropertyValue('--app-pad-b') !== s) de.style.setProperty('--app-pad-b', s);
    };
    // 回到基准只是为了量得准。若当前已经在基准上，这次写可以省掉。
    if (!(cur >= base - 0.5)) apply(base);
    const over = de.scrollHeight - de.clientHeight;
    if (over <= 0) return;                         // 本来就不溢出，留白照旧
    if (over > base) return;                       // 内容自身超高，滚动条必要，不动
    const want = Math.max(0, base - over);
    apply(want);                                   // 溢出全在留白里：收窄到刚好贴住底
    const over2 = de.scrollHeight - de.clientHeight;
    if (over2 > 0) apply(Math.max(0, want - over2));
  },
  // 相邻页签切换（移动端左右滑）
  switchTabNeighbor(dir){
    const i = TABS.findIndex(t=>t.id === this.currentTab);
    if (i < 0) return;
    const next = TABS[(i + (dir||1) + TABS.length) % TABS.length];
    if (next) this.switchTab(next.id);
  },

  // 顶栏与增益一览（renderTopbar / buffSummary / buffPopHtml / openBuffPop…）
  // 已搬到 ui/hud.js（v1.31.88）。core.js 只剩「骨架」：导航、弹窗、键盘可达性。
};
// 设置页（渲染 / 开关 / 数据模拟 / 玩法说明）已搬到 ui/settings.js（v1.31.81）。
// 这里只留一行指路：core.js 只负责「界面骨架」——顶栏、导航、弹窗、日志、键盘可达性。

// 新手指引（TUT_*）与提示条标记（hintMark）已搬到 ui/tutorial.js（v1.31.85）。

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
UI.patchActivityCount = function(){
  const t = $('activityText');
  if (!t) return;
  const txt = activityLabelText();
  if (t.textContent !== txt) t.textContent = txt;
};
