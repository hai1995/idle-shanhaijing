// ===== ui/misc.js — 统计、叙录、详情浮层、初始化（init） =====
// 由 src/ui.js 拆分而来（v1.31.8）。加载顺序见 index.html：core 必须最先（UI 对象在这里定义），
// 其余按页顺序；跨文件调用的函数与常量都在全局词法环境里，运行时才求值，先后不影响调用。

// ================= 统计 =================
// 进度数字用原样整数（不足一万不缩写）：10000 次写成「10.0K」反而不如「10000」直观
const prNum = (v) => (v > 10000 ? fmt(v) : String(v));

// 一条成就的渲染。抽成函数是因为它现在要用两次（未达成一段、已达成折条里一段），
// 两处各写一遍必然走岔——进度条与判定都读同一份 ms.prog，不会出现「显示 38/39 却已点亮」。
function msRowHtml(ms, i){
  const done = ms.check();
  const pr = (typeof ms.prog === 'function') ? ms.prog() : null;
  const pct = pr ? Math.min(100, pr[0] / Math.max(1, pr[1]) * 100) : (done ? 100 : 0);
  return `<span data-ms="${i}" class="${done?'done':''}" role="button" tabindex="0"
    onclick="UI.msDetail(${i})" title="${esc(ms.desc)}　（点开看怎么做）">
    <span class="ms-mark">${done?(typeof markIcon==='function'?markIcon('check',13):'✔'):'<span class="ms-open"></span>'}</span>
    <span class="ms-name">${esc(ms.name)}</span>
    ${pr?`<b class="ms-prog">${prNum(pr[0])}/${prNum(pr[1])}</b>`:''}
    <i>${esc(ms.bonus)}</i>
    ${pr?`<span class="ms-bar"><i style="width:${pct.toFixed(1)}%"></i></span>`:''}
  </span>`;
}

// 长线成就详情：点一条就告诉玩家「这一步具体怎么走」。
// 里程碑原先只有 title 里的 desc——手机没有 hover，等于没写；
// 而且 desc 只说了条件（「著录 30 种对象」），没说去哪、做什么。
UI.msDetail = function(idx){
  const ms = (window.Milestones || [])[idx];
  if (!ms) return;
  const done = ms.check();
  const pr = (typeof ms.prog === 'function') ? ms.prog() : null;
  const pct = pr ? Math.min(100, pr[0] / Math.max(1, pr[1]) * 100) : (done ? 100 : 0);
  const left = pr ? Math.max(0, pr[1] - pr[0]) : 0;
  const go = ms.go || null;
  UI.modal(`<h3><span class="mi-ic">${done ? (typeof markIcon === 'function' ? markIcon('check', 16) : '✔') : '◇'}</span> ${esc(ms.name)}
      <span class="tier">${done ? '已达成' : '进行中'}</span></h3>
    <div class="meta">${esc(ms.desc)}${pr ? ` · 当前 ${Math.round(pr[0])}/${Math.round(pr[1])}${left ? `（还差 ${Math.round(left)}）` : ''}` : ''}</div>
    ${pr ? `<div class="ach-pro" style="margin:8px 0 12px"><i style="width:${pct.toFixed(1)}%"></i></div>` : ''}
    <div class="reveal"><b>怎么做</b>${esc(ms.how || '（暂无说明）')}</div>
    <div class="reveal"><b>回馈</b>${esc(ms.bonus)}　<span class="hint">达成即生效，不必领取</span></div>
    <div class="modal-btns">
      ${go ? (go.act
        ? `<button class="btn primary" onclick="UI.closeModal();${go.act}">${esc(go.label || '去这里')}</button>`
        : `<button class="btn primary" onclick="UI.closeModal();UI.switchTab('${go.tab}')">${esc(go.label || '去这里')}</button>`) : ''}
      <button class="btn" onclick="UI.closeModal()">闭</button>
    </div>`);
};

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
    ${(function(){
      // 「近况」：统计页其余都是累计数字，看不出「此刻」收益几何。
      // 换配装 / 换兽 / 开兆之后效率变好变坏，原先全凭感觉。
      const r = (typeof rateSummary === 'function') ? rateSummary(600) : null;
      if (!r) return `<div class="panel stat-panel"><h3>近况<span class="hint">挂机一会儿才有数据（每 30 秒采一点）</span></h3>
        <div class="stat-rows"><span class="hint">仍在采样，满一分钟即出速率。</span></div></div>`;
      const mins = Math.max(1, Math.round(r.span / 60));
      const perf = (v, unit) => `${fmt(Math.round(v))}<i>${unit}/时</i>`;
      return `<div class="panel stat-panel"><h3>近况<span class="hint">近 ${mins} 分钟的平均，按每小时折算</span></h3>
        <div class="stat-rows rate-rows">
          <span>修为 <b>${perf(r.xpPerH, '')}</b></span>
          <span>贝币 <b>${perf(r.shellPerH, '')}</b></span>
          <span>采获 <b>${perf(r.lootPerH, ' 件')}</b></span>
          <span>动作 <b>${perf(r.actsPerH, ' 次')}</b></span>
        </div>
        ${(()=>{
          // 与「累计均值」对看：近况低于累计，说明最近掉速了（配装变差、被卡住、粮尽）。
          // 光看一个数没有基准，两个数一比才有意义。
          const hrs = (s.time || 0) / 3600;
          if (hrs < 0.1) return '';
          const cumXp = (s.totalXp || 0) / hrs;
          if (!(cumXp > 0)) return '';
          const d = r.xpPerH / cumXp - 1;
          if (Math.abs(d) < 0.08) return `<div class="hint">修为与累计均值持平（${fmt(Math.round(cumXp))}/时）</div>`;
          const word = d > 0 ? '高于' : '低于';
          return `<div class="hint">修为${word}累计均值 ${Math.abs(Math.round(d*100))}%（均值 ${fmt(Math.round(cumXp))}/时）</div>`;
        })()}
        ${Game.activity
          ? `<div class="hint">当前：${esc((typeof currentActivityLabel === 'function' ? currentActivityLabel() : '') || '')}</div>`
          : (Game.combat ? '<div class="hint">当前：往讨中</div>' : '<div class="hint">当前空闲——速率会趋近于零</div>')}
        ${(()=>{
          // 卡住告警：与顶栏那条 toast 同源（rateStall），这里给的是「几分钟、卡的是什么」。
          const st = (typeof rateStall === 'function') ? rateStall() : null;
          if (!st) return '';
          return `<div class="hint stall-warn">⚠ 近 ${Math.max(1, Math.round(st.seconds / 60))} 分钟修为没有增长，但仍在「${esc(currentActivityLabel())}」——多半卡住了：料不足、产地不符，或队列被阻塞。</div>`;
        })()}
        ${(()=>{
          // 离线对照：现在这速率是「盯着屏幕」才有的。下线一晚上能拿多少？
          // 拿离线口径（按当前活动照真实公式折算一小时）与在线速率比，
          // 玩家才知道该守着还是该关掉。差得远就说明离线效率还浅（多半是没盖山海阁）。
          if (typeof estimateOfflineGains !== 'function') return '';
          const p = estimateOfflineGains(1);
          if (!p || !(p.xp > 0)) return '';
          const offXp = Math.round(p.xp);
          const pct = r.xpPerH > 0 ? Math.round(offXp / r.xpPerH * 100) : 0;
          const ks = Object.keys(p.items || {});
          const loot = ks.length ? `、+${fmt(p.items[ks[0]])} ${esc((Items[ks[0]]||{}).name||ks[0])}` : '';
          const word = pct >= 90 ? '离线几乎不掉（关掉也照收）' : pct >= 60 ? '离线约抵在线的七成' : '离线只剩在线的一小半';
          return `<div class="hint">离线一小时约 <b>${fmt(offXp)}</b> 修为${loot}——${word}（在线 ${pct}%）。</div>`;
        })()}
      </div>`;
    })()}
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
        <span>山系巡礼 <b data-stat="pilgrim">${Object.keys(Game.pilgrim||{}).length}/${WORLD.regions.length} 系</b></span>
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
    <div class="panel stat-panel ms-panel"><h3>长线成就<span class="hint ms-note">已达成 ${(window.Milestones||[]).filter(m=>m.check&&m.check()).length} / ${(window.Milestones||[]).length}　·　点一条看怎么做</span></h3>
      <div class="stat-rows ms-rows">
        ${(() => {
          // 已达成的那几条沉底折叠：18 条里后期有十五六条是亮的，
          // 想找「还差什么」得从头翻到尾。未达成的照原位显示，已达成的收进一个折条。
          const all = (window.Milestones || []);
          const open = [], shut = [];
          all.forEach((ms, i) => (ms.check() ? shut : open).push(i));
          return open.map(i => msRowHtml(all[i], i)).join('');
        })()}
      </div>
      ${(() => {
        const all = (window.Milestones || []);
        const shut = [];
        all.forEach((ms, i) => { if (ms.check()) shut.push(i); });
        if (!shut.length) return '';
        return `<details class="ms-done-box"><summary>已达成 <b>${shut.length}</b> 条（点开看详情）</summary>
          <div class="stat-rows ms-rows">${shut.map(i => msRowHtml(all[i], i)).join('')}</div>
        </details>`;
      })()}
    </div>
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
      </div>
      <div class="stat-rows mem-rows">
        <span>离线上限构成 <b>基础 ${TUNING.OFFLINE.CAP_H}h + 观象/营造 ${offlineCapHours() - TUNING.OFFLINE.CAP_H - memberBonus('offlineH')}h + 会员 ${memberBonus('offlineH')}h</b></span>
        <span>观象加成 <b>${observedObserveCount()}/${Object.values(OBSERVE_SITES).filter(s=>s.kind==='观象').length} 处 · 离线效率 +${Math.round(observeEffBonus()*100)}%</b>${(()=>{
          // 下一档还差几处：只写当前值，玩家不知道"再走两座山有什么好处"
          const steps = (TUNING.OBSERVE && TUNING.OBSERVE.EFF_STEPS) || [];
          const n = observedObserveCount();
          const next = steps.find(s => n < s.n);
          return next ? ` <i class="hint">再观 ${next.n - n} 处 → +${Math.round(next.v*100)}%</i>` : '';
        })()}</span>
      </div></div>
    ${(()=>{
      // 会员（预留）：现在没有账号系统，所以这里只列「将来会有什么」，不提供任何购买入口。
      // 权益表来自 TUNING.MEMBER.TIERS，改数值不用动这段 UI。
      const cur = memberTier();
      const rows = Object.values(TUNING.MEMBER.TIERS).filter(t => t.name !== '未开通').map(t => {
        const on = (t === cur);
        const bits = [];
        if (t.offlineH) bits.push(`离线上限 +${t.offlineH}h`);
        if (t.xp) bits.push(`修为 +${Math.round(t.xp*100)}%`);
        if (t.yield) bits.push(`采获 +${Math.round(t.yield*100)}%`);
        if (t.drop) bits.push(`掉落 +${Math.round(t.drop*100)}%`);
        if (t.offlineEff) bits.push(`离线效率 +${Math.round(t.offlineEff*100)}%`);
        return `<div class="mem-row${on?' on':''}"><b>${esc(t.name)}</b><span>${bits.join(' · ')}</span></div>`;
      }).join('');
      return `<div class="panel stat-panel mem-panel"><h3>会员 · ${esc(cur.name)}</h3>
        <div class="mem-list">${rows}</div>
        <p class="hint">会员将由<b>账号系统</b>统一开通与校验（尚未接入，当前恒为未开通）。
        权益只加离线时长与产出，<b>不加战力</b>——付费不该买到关卡的通过权；到期自动失效。</p>
      </div>`;
    })()}
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
  setInterval(gameLoop, 250);
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
