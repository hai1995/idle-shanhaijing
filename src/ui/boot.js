// ===== ui/boot.js — 详情浮层（Tip）与应用启动（init / 无障碍清扫） =====
// 由 ui/misc.js 拆分而来（v1.31.122）。加载顺序必须在最后：init 会触碰所有页面的渲染器。
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
// 延迟生成的浮层（v1.31.90）：正文为空、锚点带 data-tip-lazy 时才现做。
// 技能页 26 张卡原先各带一份隐藏浮层，占该页 HTML 六成、切页 197ms；
// 现在只有被点开的那一张会生成。约定：`domain:id`，域名为函数名前缀（skill → skillTipHtml）。
function fillLazyTip(anchor, body){
  if (!body) return;
  if (body.innerHTML && body.innerHTML.trim()) return;      // 已经填过就不重复做
  // 属性挂在 .tip-body 自己身上（不是锚点）：一个锚点只有一个正文，不必穿透查找
  const key = body.getAttribute && body.getAttribute('data-tip-lazy');
  if (!key) return;
  const i = String(key).indexOf(':');
  const domain = i > 0 ? key.slice(0, i) : key;
  const id = i > 0 ? key.slice(i + 1) : '';
  const fn = (domain === 'skill' && typeof skillTipHtml === 'function') ? skillTipHtml : null;
  if (!fn) return;
  const html = fn(id);
  body.innerHTML = html || '';
}
function showTipFor(anchor){
  const body = tipBodyOf(anchor);
  if (!body) return;
  fillLazyTip(anchor, body);
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
  // 点遮罩关弹窗（点内容区不关）：手机上右下角「闭」有时够不着，遮罩是最顺手的出口
  $('modal') && $('modal').addEventListener('click', e => { if (e.target && e.target.id === 'modal') UI.closeModal(); });
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
  // 后台停表：页面不可见时把主循环停掉。
  // iOS 本来就会节流，安卓与桌面不会——挂机游戏每 250ms 跑一次的循环，
  // 后台挂一晚是实打实的耗电，而这段时间的收益本来就该由离线结算来给。
  // 安全性：回来时第一帧的 dt 很大，gameLoop 里已有「pendingTime ≥ 60s → settleAway」
  // 的兜底，与「关掉页面再打开」走同一条路（那条路早就在跑）。
  let loopId = setInterval(gameLoop, 250);
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'hidden'){
      if (loopId){ clearInterval(loopId); loopId = 0; }
    } else if (!loopId){
      gameLoop();                        // 先结一次，把离开这段补上，再重新起表
      loopId = setInterval(gameLoop, 250);
    }
  });
  initA11y();
}

// ---------- 键盘可达性 ----------
// 全站两百多个带 onclick 的 div（区域卡、节点条、图鉴卡、配方格……）鼠标点得动，
// 键盘却 Tab 不到。逐个改模板不现实（新增一处就可能漏一处），改成两件事：
//   1. 渲染后统一给这类元素补 role="button" + tabindex="0"（MutationObserver，只盯新节点）；
//   2. 一处全局 keydown 委托，把 Enter / 空格转成 click。
// 这样以后新写的卡片也自动获得键盘能力，不需要谁记得加属性。
const A11Y_SKIP = { BUTTON:1, A:1, INPUT:1, SELECT:1, TEXTAREA:1, LABEL:1, SUMMARY:1 };
function a11ySweep(root){
  const scope = root || document;
  if (!scope || !scope.querySelectorAll) return 0;
  let n = 0;
  scope.querySelectorAll('[onclick]').forEach(el => {
    if (A11Y_SKIP[el.tagName]) return;
    if (el.getAttribute('role') !== 'button') el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    n++;
  });
  return n;
}
function initA11y(){
  a11ySweep(document);
  // Enter / 空格 → click。只认「自己有 onclick 且 role=button」的目标，
  // 免得把输入框里的空格也吃掉。
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const t = e.target;
    if (!t || !t.tagName) return;
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return;
    const el = t.closest ? t.closest('[role="button"][onclick]') : null;
    if (!el) return;
    e.preventDefault();
    el.click();
  });
  if (typeof MutationObserver !== 'function') return;
  let queued = false;
  const flush = () => {
    queued = false;
    a11ySweep($('content'));
    a11ySweep($('modalBox'));
  };
  const obs = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    if (window.requestAnimationFrame) window.requestAnimationFrame(flush);
    else setTimeout(flush, 16);
  });
  ['content', 'modalBox'].forEach(id => {
    const el = $(id);
    if (el) obs.observe(el, { childList: true, subtree: true });   // 只盯增删，不盯属性（否则自己改属性会自激）
  });
}
window.a11ySweep = a11ySweep;
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

