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
  { id:'rank',    label:'榜', icon:ICON('<path d="M5 20v-7M12 20V4M19 20v-11"/>') },
  { id:'about',   label:'叙录', icon:ICON('<rect x="4.6" y="3.4" width="14.8" height="17.2" rx="1.4"/><path d="M8.2 8.2h7.6M8.2 11.6h7.6M8.2 15h4.6"/>') },
];
// 页签 → 页面渲染函数（renderCurrent 与页头包装层共用）
const TAB_RENDER = { yudi:'renderYudi', skills:'renderSkills', taofa:'renderTaofa', yushi:'renderYushi',
  codex:'renderCodex', jisi:'renderJisi', shichan:'renderShichan', ying:'renderYing',
  queue:'renderQueue', pack:'renderPack', stats:'renderStats', rank:'renderRank', settings:'renderSettings',
  about:'renderAbout' };
const CAT_EMOJI = { 兽:'🐾', 鸟:'🪶', 水族:'🐟', 蛇:'🐍' };
// gold 原为 #D9A521：当浮字用没问题（有描边），但做日志正文色时在纸底上只有 2.04:1，
// 几乎看不清（v1.31.136 对比度扫描抓到的）。压到 #8C6B15（4.51:1）。
// 浮字另用硬编码亮色，不受影响。
const LOG_COLORS = { good:'#4A7C59', bad:'#C3272B', gold:'#8C6B15', sys:'#8C5A3C' };

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
// 离线均速（v1.31.150）：总量只会随「攒得越来越久」变多，看不出这一夜到底值不值。
// 折算成每小时，玩家自己能跟在线采集比一比，也才知道该不该先去观象 / 修仓廪。
// 统计页渲染与 data-stat 就地刷新共用这一份算式，免得两处各算一套、日后走散。
function offlineRateText(){
  const s = (typeof Game !== 'undefined' && Game.stats) ? Game.stats : null;
  if (!s) return '—';
  const sec = s.offlineSec || 0;
  if (sec < 60) return '—';
  const h = sec / 3600;
  return `经验 ${fmt(Math.round((s.offlineXp || 0) / h))}/时 · 所得 ${Math.round((s.offlineItems || 0) / h * 10) / 10} 件/时`;
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
    if (this.patchQueueChip) this.patchQueueChip();   // 巡历队列指示：第几项 / 共几项 + 预计剩余
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

// 新手指引（TUT_*）已搬到 ui/tutorial.js（v1.31.85）；提示条标记（hintMark）等通用渲染片段搬到 ui/meta.js（v1.31.140）。

