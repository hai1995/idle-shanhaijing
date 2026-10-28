// ===== ui/settings.js — 设置页（含「数据模拟」与「玩法说明」） =====
// 从 core.js 搬出来的第一块（2026-10-27）。搬的原则：**逐字不动**，
// 只把「属于这一页的东西」集中到一处——渲染、开关、模拟按钮、玩法说明。
// 验收方式不是看图：搬迁前后把 `#content` 的 innerHTML 逐字符比对（日间 / 夜间 / 改过开关三种状态）。
//
// 依赖（都在全局作用域，调用时存在即可）：UI、Prefs、Game、TUNING、Items、$、esc、fmt、
// saveGame、serializeSave、settleAway、showOfflineSummary、autoDeployBest、equipBest、
// giveItem、recordTierOf、relicOwned、WORLD、offlineCapHours。**本文件不定义 UI 本身**，
// 所以必须排在 core.js 之后加载（顺序见 index.html）。

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
          <div class="form-row"><span>行动现场画面</span>
            <button class="btn ${Prefs.sceneOn===false?'':'on'}" onclick="Prefs.sceneOn=(Prefs.sceneOn===false);saveGame();UI.renderSettings();UI.refreshActivity()">${Prefs.sceneOn===false?'关':'开'}</button></div>
          <div class="hint set-hint">仪表带下方那块小画面，关掉可省一截屏高</div>
          <div class="form-row"><span>现场诊断</span>
            <button class="btn ${Prefs.sceneProbe?'on':''}" onclick="Prefs.sceneProbe=!Prefs.sceneProbe;saveGame();UI._sceneSig=null;UI.renderSettings();UI.refreshActivity()">${Prefs.sceneProbe?'开':'关'}</button></div>
          <div class="hint set-hint">在现场左下角显示「帧数 / 相位 / 心跳 / 谁在驱动」。加到主屏幕后没有地址栏，<code>?probe=1</code> 用不了，只能从这里开</div>
        </section>
        <section class="set-sec">
          <h4>偏好</h4>
          <div class="form-row"><span>游戏昵称</span>
            <input type="text" id="nickInput" maxlength="12" value="${esc(Game.nickname||'')}" placeholder="留空即用默认名号（最多 12 字）">
            <button class="btn" onclick="saveNickname()">保存</button></div>
          <div class="form-row"><span>自动进食</span>
            <input type="range" min="10" max="80" value="${Math.round(Prefs.autoEat*100)}" oninput="Prefs.autoEat=this.value/100" onchange="saveGame()">
            <b>${Math.round(Prefs.autoEat*100)}%</b></div>
          ${onoff(Prefs.autoRevive, '战败自动复讨', {pref:'autoRevive', expr:'!Prefs.autoRevive'})}
          ${onoff(Prefs.autoEquip, '自动装备更优', {pref:'autoEquip', expr:'!Prefs.autoEquip'})}
          ${onoff(Prefs.idleFallback!==false, '闲置兜底', {pref:'idleFallback', expr:'Prefs.idleFallback===false'})}
        </section>
        <section class="set-sec">
          <h4>指引</h4>
          <div class="form-row"><span>新手指引</span>
            <button class="btn" onclick="showTutorial()">重看指引</button>
            <span class="hint">六步：舆地 → 技能 → 征伐 → 行装 → 行动 → 统计</span></div>
          <div class="form-row"><span>玩法说明</span>
            <button class="btn" onclick="openHelp()">查看说明</button>
            <span class="hint">著录阶位 / 御使 / 五行 / 征兆 / 祠祀 / 离线</span></div>
        </section>
      </div>
      <div>
        <section class="set-sec">
          <h4>存档</h4>
          <div class="form-row"><span>自动存档</span><b>每 5 秒</b><span class="hint">写入浏览器本地</span></div>
          <div class="form-row"><span>存档格式</span><b>v${typeof SaveManager!=='undefined'?SaveManager.version:3}</b>
            <span class="hint">旧档自动升级，无需手动处理</span></div>
          <div class="form-row"><span>存档体积</span><b>${saveSizeKb()} KB</b>
            <span class="hint">${Object.keys(Game.records||{}).length} 条著录 · ${Object.keys(Game.map||{}).length} 座山已访</span></div>
          <div class="form-row"><span>版本</span><b>v${esc((typeof GAME_META!=='undefined'&&GAME_META.version)||'—')}</b>
            <span class="hint">${esc((typeof GAME_META!=='undefined'&&GAME_META.updated)||'')}</span></div>
          <div class="form-row"><span>强制刷新</span>
            <button class="btn" type="button" onclick="forceReload()">重载最新版</button></div>
          <div class="hint set-hint">清掉离线缓存与 Service Worker，再带时间戳重载整页。更新后看不到变化、或主屏幕里一直显示旧版时点这里。存档不受影响。</div>
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
        <details class="set-sec set-fold">
          <summary>数据模拟<em>测试用 · 点开</em></summary>
          <p class="hint">点一下直接改当前存档并落盘。正式游玩不必理会。</p>
          <div class="sim-row">
            <button class="btn on" type="button" onclick="devSim('all')">一键全开</button>
            <button class="btn" type="button" onclick="devSim('lv81')">技艺全 81</button>
            <button class="btn" type="button" onclick="devSim('shell')">贝币 +10 万</button>
            <button class="btn" type="button" onclick="devSim('mat')">材料各 +50</button>
            <button class="btn" type="button" onclick="devSim('codex')">著录全开</button>
            <button class="btn" type="button" onclick="devSim('map')">走遍全图</button>
            <button class="btn" type="button" onclick="devSim('gear')">装备最优</button>
            <button class="btn" type="button" onclick="devSim('deploy')">御使择优</button>
            <button class="btn" type="button" onclick="devSim('lv+10')">技艺 +10</button>
            <button class="btn" type="button" onclick="devSim('away1h')">离山 1 小时</button>
            <button class="btn" type="button" onclick="devSim('clear')">停掉行动</button>
            <button class="btn" type="button" onclick="devSim('rebirth+1')">轮回 +1 转</button>
            <button class="btn" type="button" onclick="devSim('event')">触发见闻</button>
          </div>
          <div class="form-row"><span>重置本档</span>
            <button class="btn" type="button" onclick="devSim('wipe')">清空并重开</button>
            <span class="hint">抹掉本机存档，不可撤销</span></div>
        </details>
      </div>
    </div>
  </div>`;
};

// 把「等级」写进存档时必须连 xp 一起写。
// 原因：gainXp 里有 `sk.level = levelFromXp(sk.xp)`——只改 level 不改 xp 的假档，
// 下一次涨经验就被打回真实等级（1 级），看起来像「一键全开没生效」。
function simSetLevel(level){
  const xp = (typeof xpForLevel === 'function') ? xpForLevel(level) : 0;
  for (const k in Game.skills){ Game.skills[k].level = level; Game.skills[k].xp = xp; }
}

// ---------- 数据模拟的四个动作（拆出来是因为「一键全开」要复用） ----------
function simMaterials(){
  let n = 0;
  for (const id in Items){
    const it = Items[id];
    if (!it || it.equip) continue;            // 装备走「按件」那套，不在这里灌
    Game.inventory[id] = (Game.inventory[id] || 0) + 50;
    n++;
  }
  return n;
}
function simCodex(){
  const top = 120;                            // 阈值表最高一档是 100，120 一定满阶
  const tier = (typeof recordTierOf === 'function') ? recordTierOf(top) : 4;
  let n = 0;
  for (const id in Items){ Game.records[id] = { count: top, tier }; n++; }
  for (const id in Monsters){ Game.records[id] = { count: top, tier }; n++; }
  return n;
}
function simMap(){
  let n = 0;
  const world = (typeof WORLD !== 'undefined' && WORLD) ? WORLD : null;
  if (!world) return 0;
  for (const r of world.regions){
    for (const nd of (r.nodes || [])){
      if (!Game.map[nd.id]) n++;
      Game.map[nd.id] = true;
    }
  }
  return n;
}
// 每个槽位灌一件「当前等级能穿的最高档」，再交给 equipBest 自己挑。
// 不直接写 Game.gear：那会绕开淬炼与回囊逻辑，测出来的配装页面是假的。
function simGear(){
  if (typeof equipSlotOf !== 'function' || typeof giveItem !== 'function') return 0;
  const best = {};
  for (const id in Items){
    const it = Items[id];
    if (!it || !it.equip) continue;
    if ((it.lvl || 1) > 81) continue;
    const slot = equipSlotOf(it);
    const score = (it.value || 0) * 1000 + (it.lvl || 1);
    if (!best[slot] || score > best[slot].score) best[slot] = { id, score };
  }
  for (const slot in best) giveItem(best[slot].id, 1, false);
  const changes = (typeof equipBest === 'function') ? equipBest() : [];
  return (changes || []).length;
}
function simGearFilled(){
  const g = (typeof Game !== 'undefined' && Game.gear) ? Game.gear : {};
  return Object.keys(g).filter(k => g[k]).length;
}

// 数据模拟：给「测试各项功能是否正常」用的一排按钮。
// 原则：只改存档字段，不绕过任何业务流程——点完之后各页面走的是和平时一样的渲染与判定，
// 这样测出来的才是真行为。每个动作都立即 saveGame()，刷新也在。
function devSim(what){
  if (typeof Game === 'undefined' || !Game) return;
  let msg = '';
  try {
    if (what === 'lv+10'){
      const cur = (Game.skills.qiaocai && Game.skills.qiaocai.level) || 1;
      simSetLevel(Math.min(81, cur + 10));
      msg = '各门技艺 +10 级';
    } else if (what === 'lv81'){
      simSetLevel(81);
      msg = '各门技艺 81 级（山川全解锁）';
    } else if (what === 'shell'){
      Game.shells = (Game.shells || 0) + 100000;
      msg = '贝币 +10 万';
    } else if (what === 'mat'){
      msg = `材料各 +50（${simMaterials()} 种）`;
    } else if (what === 'codex'){
      // 著录直接写表：走 addRecord 会触发「首次著录的征兆」「阶位提升的日志」，
      // 一键刷几百条会把日志刷满，也把征兆状态搅乱——测试数据要的是「已有」，不是「刚获得」。
      const n = simCodex();
      msg = `著录全开（${n} 项，均已五阶）`;
    } else if (what === 'map'){
      const n = simMap();
      msg = `走遍全图（${n} 处到访）`;
    } else if (what === 'gear'){
      const n = simGear();
      // 三种结果要分开说：换了几件 / 本来就最优 / 根本无装备可换。
      // 混成一句「没有可装的装备」，在「已经配好」时是误报。
      const filled = simGearFilled();
      msg = n ? `已配齐 ${n} 件兵器甲胄`
            : (filled ? `装备已是当前最优（${filled} 槽）` : '没有可装的装备（先点「技艺全 81」）');
    } else if (what === 'deploy'){
      if (typeof autoDeployBest !== 'function'){ UI.toast('🧪 御使未开'); return; }
      const r = autoDeployBest();
      msg = r && r.count ? `已择优御使 ${r.kinds} 只（占 ${r.count} 槽）` : '暂无可御使的异兽（先点「著录全开」）';
    } else if (what === 'all'){
      simMaterials(); simCodex(); simMap();
      simSetLevel(81);
      Game.shells = (Game.shells || 0) + 100000;
      // 配装与御使放在最后：它们依赖等级与著录
      const g = simGear();
      if (typeof autoDeployBest === 'function') autoDeployBest();
      msg = `全开：技艺 81 / 著录满 / 全图到访 / 贝币 +10 万 / 装备 ${g} 件`;
    } else if (what === 'event'){
      // 强制触发一条见闻（跳过概率与冷却），用来验文案与奖励是否正常
      if (typeof maybeEvent !== 'function'){ UI.toast('🧪 见闻系统未加载'); return; }
      const out = maybeEvent({ kind:'gather', itemId:'migu', skillId:'qiaocai', nodeId: Game.node }, true);
      msg = out ? `见闻：${out.id}` : '无可用见闻';
    } else if (what === 'rebirth+1'){
      // 只加转数与起手等级，**不**做真正的重置：这个按钮是用来「看高转数的界面」的
      // （轮回印、遗物、下一转起点），不是用来模拟一次完整轮回——那种用「一键全开 + 轮回」。
      const rb = Game.rebirth || (Game.rebirth = { count: 0 });
      rb.count = (rb.count | 0) + 1;
      const start = Math.min(TUNING.REBIRTH.START_CAP, rb.count * TUNING.REBIRTH.START_PER);
      simSetLevel(start);
      const relics = (typeof relicOwned === 'function') ? relicOwned().length : 0;
      msg = `已至第 ${rb.count} 转（起手 ${start} 级 · 修为 +${Math.round(rebirthGain()*100)}% · 遗物 ${relics} 件）`;
    } else if (what === 'away1h'){
      const sum = (typeof settleAway === 'function') ? settleAway(3600) : null;
      if (!sum){ UI.toast('🧪 离山不足 30 秒，未结算'); return; }
      msg = `模拟离山 1 小时：修为 +${Math.round(sum.xp)}`;
      if (UI.showOfflineSummary) UI.showOfflineSummary(sum);
    } else if (what === 'clear'){
      if (typeof stopActivity === 'function') stopActivity();
      msg = '已停掉当前行动与战斗';
    } else if (what === 'wipe'){
      if (!window.confirm('清空本机存档并重开？这一步不可撤销。')) return;
      try { localStorage.clear(); } catch(e){}
      location.reload();
      return;
    }
  } catch(e){
    UI.toast('🧪 模拟失败：' + (e && e.message));
    return;
  }
  saveGame();
  UI.renderTopbar();
  UI.refreshActivity();
  UI.renderCurrent();
  UI.toast('🧪 ' + msg);
}
window.devSim = devSim;

// 强制刷新：把「浏览器可能还在用旧文件」这件事一次清干净。
// 三步：Cache API → Service Worker → 带时间戳重载。
// **不动 localStorage**：那是存档，清缓存不该把玩家的进度一起清掉。
async function forceReload(){
  if (UI && UI.toast) UI.toast('🧹 清缓存中…');
  let n = 0;
  try {
    if (typeof caches !== 'undefined' && caches.keys){
      const ks = await caches.keys();
      await Promise.all(ks.map(k => caches.delete(k)));
      n = ks.length;
    }
  } catch(e){}
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map(r => r.unregister()));
      n += rs.length;
    }
  } catch(e){}
  // 先把当前进度落盘——重载会丢掉内存里尚未写盘的那几秒
  try { if (typeof saveGame === 'function') saveGame(); } catch(e){}
  const u = new URL(location.href);
  u.searchParams.set('_r', Date.now());     // 新 URL，绕开 index.html 自己的缓存
  setTimeout(()=>location.replace(u.toString()), 120);
}
window.forceReload = forceReload;

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
window.fmtTime = fmtTime;   // 导出供测试与外部文案复用（整点不写零头的口径只有这一处）

// ---------- 游戏昵称 ----------
function saveNickname(){
  const el = $('nickInput');
  const v = el ? String(el.value || '').trim().slice(0, 12) : '';
  Game.nickname = v;
  saveGame();
  UI.renderTopbar();
  UI.toast(v ? `✍️ 昵称已设为「${v}」` : `✍️ 已恢复默认名号「${(typeof playerName==='function')?playerName():'著录客'}」`);
  openSettings();
}
window.saveNickname = saveNickname;

// ---------- 玩法说明 ----------
function openHelp(){
  UI.modal(`
    <h3><span class="mi-ic">${typeof skillIcon==='function'?skillIcon('zhulu',16):''}</span> 玩法说明</h3>
    <div class="help-body">
      <div class="help-sec"><b>著录与阶位</b><p class="hint">采集、讨伐、渔、采药等行动会积累「著录」。每种物产分五阶：初见 → 识名 → 明性 → 通形 → 得御。著录越深，产出越丰，亦解锁更高「舆地」等级的山川。</p>${UI.wikiFooter?UI.wikiFooter('mechanic','mastery'):''}</div>
      <div class="help-sec"><b>御使异兽</b><p class="hint">异兽著录至「通形」即可在「御使」入槽，化作被动增益与自动作业（如自动樵采、渔猎）；著录至「得御」为最高阶。</p>${UI.wikiFooter?UI.wikiFooter('mechanic','mastery'):''}</div>
      <div class="help-sec"><b>五行相克</b><p class="hint">兵器与异兽分属金木水火土。相克 ×1.35、被克 ×0.75、同属 ×1.00、相生 ×1.15。相克：金克木、木克土、土克水、水克火、火克金；相生：金生水、水生木、木生火、火生土、土生金。装备相克属性的兵器可压制目标。</p>${UI.wikiFooter?UI.wikiFooter('mechanic','wuxing'):''}</div>
      <div class="help-sec"><b>征兆</b><p class="hint">首次著录异兽可能触发吉凶之兆（如「其邑大水」「有大兵」），影响区域产出或全局采获。部分物品可免疫对应征兆（如「佩之不惑」之符、「御兵」之兽）。</p>${UI.wikiFooter?UI.wikiFooter('mechanic','omen'):''}</div>
      <div class="help-sec"><b>祠祀 · 卜筮</b><p class="hint">谒见山神献祭以增益区域产出；卜筮可问吉凶、抉择事件走向。</p>${UI.wikiFooter?UI.wikiFooter('mechanic','jisi'):''}</div>
      <div class="help-sec"><b>商旅 · 观象 · 圃艺</b><p class="hint">以贝币买卖物品、低买高卖；观象提升离线上限（基础 ${TUNING.OFFLINE.CAP_H} 小时，每处观象 +1、仓廪 +2、土窟 +1，另会长线成就与会员加成；现为 ${offlineCapHours()} 小时）与离线效率；圃艺种植收成。</p>
        <p class="hint">观象、谒见、灌木这三类「一次性地点」散在各山，<b>舆地页末的「异迹索引」</b>一并列出：谁已得、谁还没去、差几级，点一行即定位到那座山，右侧「往」直接动身。</p>${UI.wikiFooter?UI.wikiFooter('mechanic','shanglv'):''}</div>
      <div class="help-sec"><b>离线收益</b><p class="hint">离开页面仍按离线时长结算（效率随「观象」等提升，封顶约 0.85）。离山较久归来会弹出「离线归来」汇总。</p>${UI.wikiFooter?UI.wikiFooter('mechanic','offline'):''}</div>
      <div class="help-sec"><b>存档</b><p class="hint">游戏每 5 秒自动存档在本机浏览器；「统计」页可导出 / 导入 / 重置存档。想在多设备间续玩，可在「设置 → 存档」填入云端存档服务器地址：停止操作约 3 秒自动上传，离开页面时强传一次；拉取时与本地进度按规则合并（经验 / 著录取大，地图 / 背包并集，贝币取较新），不丢进度。</p></div>
      <div class="help-sec"><b>快捷键</b><p class="hint">1–9 切页 · S 存档 · Q 停止当前行动 · Esc 关闭弹窗。</p></div>
    </div>
    <div class="modal-btns"><button class="btn on" onclick="UI.closeModal()">知道了</button></div>
  `);
}
window.openHelp = openHelp;
