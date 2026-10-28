// ===== ui/stats.js — 统计（四栏总账 / 行旅见闻 / 成就 / 近况）与祠礼开关 =====
// 由 ui/misc.js 拆分而来（v1.31.122）：统计归统计，叙录归 misc，浮层与启动归 boot。
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
  // 数值统一归一：NaN / Infinity 会原样印成「NaN」「Infinity 天」，见 game.js 的 sanitizeStats
  const s = (typeof sanitizeStats === 'function') ? sanitizeStats(Game.stats) : Game.stats;
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
      const ck = (typeof activityFinishClock === 'function') ? activityFinishClock() : '';
      if (!r) return `<div class="panel stat-panel"><h3>近况</h3><div class="h3-hint">挂机一会儿才有数据（每 30 秒采一点）</div>
        <div class="stat-rows">${ck ? `<span class="hint">当前行动约 ${ck} 做完。</span>` : ''}<span class="hint">仍在采样，满一分钟即出速率。</span></div></div>`;
      const mins = Math.max(1, Math.round(r.span / 60));
      const perf = (v, unit) => `${fmt(Math.round(v))}<i>${unit}/时</i>`;
      return `<div class="panel stat-panel"><h3>近况</h3><div class="h3-hint">近 ${mins} 分钟的平均，按每小时折算</div>
        <div class="stat-rows rate-rows">
          <span>修为 <b>${perf(r.xpPerH, '')}</b></span>
          <span>贝币 <b>${perf(r.shellPerH, '')}</b></span>
          <span>采获 <b>${perf(r.lootPerH, ' 件')}</b></span>
          <span>动作 <b>${perf(r.actsPerH, ' 次')}</b></span>
        </div>
        ${ck ? `<div class="hint">当前行动约 ${ck} 做完。</div>` : ''}
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
    ${(function(){
      // 「境界」面板（v1.31.171）：境界系统上主页签的可感知入口——统计页一眼看到当前阶、
      // 加成、突破次数与下一阶差距；突破入口仍在打坐（skills 页修行分组）。
      if (typeof currentRealm !== 'function') return '';
      const cur = currentRealm();
      const nx = (typeof nextRealm === 'function') ? nextRealm() : null;
      const xp = Game.stats.totalXp || 0;
      const breaks = (Game.stats.realmBreaks || 0);
      let nextRows = '';
      if (nx){
        const pct = nx.need > 0 ? Math.min(100, xp / nx.need * 100) : 100;
        nextRows = `<span>下一阶 <b>${nx.name}</b></span>
          <span>还差 <b>${fmt(Math.max(0, nx.need - xp))}</b> 修为</span>
          <span class="realm-stat-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
          <span class="hint">攒够后去「技能 · 修行」打坐突破。</span>`;
      } else {
        nextRows = `<span class="hint">已是已知最高境界。</span>`;
      }
      return `<div class="panel stat-panel"><h3>境界 <span class="hint">打坐突破 · 修炼效率永久加成</span></h3>
        <div class="stat-rows">
          <span>当前 <b>${cur ? cur.name : '—'}</b></span>
          <span>效率加成 <b>+${Math.round((cur ? cur.bonus : 0) * 100)}%</b></span>
          <span>已突破 <b data-stat="realmBreaks">${breaks}</b> 次</span>
          ${nextRows}
        </div>${UI.wikiFooter ? UI.wikiFooter('mechanic', 'realm') : ''}</div>`;
    })()}
    ${(function(){
      // 行旅见闻：触发过的按次数列，没见过的也列出来（「还差几条」本身就是目的）
      const onRoad = (window.TRAVEL_EVENTS || []);
      const awayEv = (window.AWAY_EVENTS || []);
      const evs = onRoad.concat(awayEv);
      if (!evs.length) return '';
      const seen = (Game.events && Game.events.seen) || {};
      // 总数用 seen 求和，不用 events.count：两者可能不一致（旧档只记 count，
      // 调试时也可能只重置 count），求和是唯一自洽的口径。
      const total = evs.reduce((a, e) => a + (seen[e.id] || 0), 0);
      const kinds = evs.filter(e => seen[e.id]).length;
      // 未见的条目带上「去哪儿能撞见」的线索（e.hint，v1.31.106）：
      // 「未见」两个字只会让人干瞪眼，线索才让人动身。见过的不再啰嗦。
      // 限定条件的小标记（v1.31.125）：25 条见闻里有一半要挑时间 / 挑地点，
      // 原先只有读完整句线索才知道「这条要蹲雨季」——扫一眼看不出哪条在等什么。
      // 标记只在未见时出现：见过的条目已经是战绩，不需要再提醒怎么弄到。
      const condTag = (e) => {
        const d = (window.EVENT_COND || {})[e.cond];
        return d ? `<i class="ev-cond ev-cond-${esc(e.cond)}" title="${esc(d.title)}">${esc(d.label)}</i>` : '';
      };
      const cell = (e) => {
        const n = seen[e.id] || 0;
        return n ? `<span>${esc(e.name || e.id)} <b>${n}</b></span>`
                 : `<span class="hint ev-unseen">${condTag(e)}${esc(e.name || e.id)} · 未见${e.hint
                     ? `<em class="ev-hint">${e.go === 'hetero'
                         ? `<button class="linklike" type="button" onclick="UI.gotoHetero()">${esc(e.hint)}</button>`
                         : (e.go === 'omen'
                         ? `<button class="linklike" type="button" onclick="UI.switchTab('jisi')">${esc(e.hint)}</button>`
                         : esc(e.hint))}</em>`
                     : ''}</span>`;
      };
      // 分两组：「路上遇见的」与「不在时错过的」是两种心情，
      // 混在一堆里读不出「我离开时山里发生过什么」。
      const rows = onRoad.map(cell).join('');
      const awayRows = awayEv.length
        ? `<div class="stat-sub">不在时</div>` + awayEv.map(cell).join('')
        : '';
      // 最近一次：计数只说「多少」，说不了「上次是什么时候」。
      // 挂机回来想知道「这一夜有没有遇到什么」，看的是这一行，不是总数。
      let lastLine = '';
      const lastId = (Game.events && Game.events.lastId) || '';
      const lastAt = (Game.events && Game.events.lastAt) || 0;
      const lastEv = lastId ? evs.find(e => e.id === lastId) : null;
      if (lastEv && lastAt > 0){
        const ago = Math.max(0, (typeof gameTime === 'function' ? gameTime() : 0) - lastAt);
        lastLine = `<div class="stat-rows"><span class="hint">最近一次：${esc(lastEv.name || lastId)} · ${fmtDur(ago)}前</span></div>`;
      }
      return `<div class="panel stat-panel ev-panel"><h3 data-tip data-tip-title="行旅见闻" data-wiki="mechanic:jianwen">行旅见闻 <span class="hint">${kinds}/${evs.length} 种 · 共 ${total} 条</span><span class="tip-body hidden">巡历途中偶有奇遇：一句话 + 一点东西；离山归来还会听说「不在时」的山中事。见过的种类在此录全，路上遇见的与不在时错过的分栏而记。</span></h3>
        <div class="stat-rows">${rows}${awayRows}</div>${lastLine}</div>`;
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
        <span class="season-row"><i class="stat-k">季候</i> <b data-stat="season">${seasonLineText()}</b></span>
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
        ${(typeof offlineRateText === 'function' && (s.offlineSec || 0) >= 60)
          ? `<span>离线均速 <b data-stat="offlineRate">${offlineRateText()}</b></span>` : ''}
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
        ${[['all','全部'],['skill','技能'],['combat','讨伐'],['trade','商旅'],['omen','征兆'],['event','见闻'],['sys','系统']].map(([k,v])=>
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
    if (typeof document !== 'undefined' && document.hidden) return;   // 后台不白跑 0.8s 一次的 DOM patch
    UI.patchStats();
  }, 800);
};
