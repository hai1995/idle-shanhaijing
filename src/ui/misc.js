// ===== ui/misc.js — 叙录（关于本作）/ 日志 / 存档导入导出 / 划动手势 =====
// v1.31.122：统计拆去 stats.js，详情浮层与 init 拆去 boot.js——本文件只留「杂项本项」。
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
        <div><b>采集</b>樵采 / 采玉 / 渔 / 采药。点一处即动身前往，随即开工，所得入行囊。${UI.wikiFooter?UI.wikiFooter('mechanic','mastery'):''}</div>
        <div><b>著录</b>把所得记成条目。历初见 · 识名 · 明性 · 通形 · 得御五阶，阶阶累加其效。${UI.wikiFooter?UI.wikiFooter('mechanic','mastery'):''}</div>
        <div><b>制作</b>制器 / 烹饪 / 炼药 / 营建。材料不足会直说缺哪样、差多少。</div>
        <div><b>征伐</b>五行相克 ×1.35、被克 ×0.75、相生 ×1.15。同兽连杀经验递减，六凶为终战。${UI.wikiFooter?UI.wikiFooter('mechanic','wuxing'):''}</div>
        <div><b>御使</b>著录至「通形」的异兽可入槽，化作被动增益与自动作业。${UI.wikiFooter?UI.wikiFooter('mechanic','mastery'):''}</div>
        <div><b>祠祀</b>二十八套礼制，行祭得山系增益；吉凶之兆随之而动，可禳可解。${UI.wikiFooter?UI.wikiFooter('mechanic','jisi'):''}</div>
        <div><b>离线</b>离山亦不停笔，归来按效率一并结算，不令一日虚度。${UI.wikiFooter?UI.wikiFooter('mechanic','offline'):''}</div>
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
  // 与静态渲染同一份归一（见 game.js sanitizeStats）：patchStats 里有 `String(s.kills)` 这类
  // 直转，NaN 会原样写成 "NaN"，而 patch 每 800ms 覆盖一次，比静态渲染更容易让人看到。
  const s = (typeof sanitizeStats === 'function') ? sanitizeStats(Game.stats) : Game.stats;
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
    offlineRate: (typeof offlineRateText === 'function') ? offlineRateText() : '—',
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
    || '<div class="empty-note">暂无记录</div>';
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

