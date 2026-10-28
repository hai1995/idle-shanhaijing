// ===== ui/rank.js — 群英榜（网游化的第一步，v1.31.139） =====
// 数值早已齐备（修为 / 轮回次数 / 单轮最快 / 三签 / 最高强化 / 著录），只缺「怎么收、怎么比」。
// 本页提供：战绩投递入口 + 全服榜单展示。服务端自管（server/leaderboard.js，零依赖），
// 地址存于 Prefs.leaderboardUrl——留空则只显示本机战绩卡，不参与排行（不直连任何第三方）。
//
// 依赖（全局，调用时存在即可）：UI、Prefs、Game、GAME_META、CODEX、rebirthCount、
// recordedCount、bestEnhance、esc、fmt、shareText、saveGame、$。

// 战绩字段：与将来的排行榜一致，先在这里一次凑齐（复用 shareText 的口径）。
UI.scorePayload = function(){
  const hist = (Game.rebirth && Game.rebirth.history) || [];
  const fastest = hist.length ? hist.reduce((a, b) => (b.sec < a.sec ? b : a), hist[0]) : null;
  const be = (typeof bestEnhance === 'function') ? bestEnhance() : { lv: 0 };
  const name = (Game.nickname && String(Game.nickname).trim()) || '著录客';
  return {
    name: name.slice(0, 16),
    totalXp: Math.floor((Game.stats && Game.stats.totalXp) || 0),
    rebirthCount: (typeof rebirthCount === 'function') ? rebirthCount() : 0,
    recorded: (typeof recordedCount === 'function') ? recordedCount() : 0,
    codexTotal: Object.keys((typeof CODEX !== 'undefined' && CODEX) || {}).length,
    bestSec: fastest ? Math.floor(fastest.sec) : 0,
    bounties: Array.isArray(Game.bounties) ? Game.bounties.length : 0,
    bestEnhance: be.lv || 0,
    v: (typeof GAME_META !== 'undefined' && GAME_META.version) || '',
  };
};

// 榜单服务基址（去尾斜杠）
function lbBase(){
  const u = (typeof Prefs !== 'undefined' && Prefs.leaderboardUrl) ? String(Prefs.leaderboardUrl).trim() : '';
  return u.replace(/\/+$/, '');
}

// 带超时与降级的 fetch：网络不通 / 服务端未起，都不能让页面卡死或报错冒泡。
async function lbFetch(url, opts){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try { return await fetch(url, Object.assign({ signal: ctrl.signal }, opts)); }
  finally { clearTimeout(t); }
}

// ---------- 渲染 ----------
UI.renderRank = function(){
  const c = $('content');
  if (!c) return;
  const url = lbBase();
  const metric = this._rankMetric || 'totalXp';
  const METRICS = { totalXp:'修为', recorded:'著录', rebirthCount:'轮回' };
  const metricBtns = Object.keys(METRICS).map(m =>
    `<button class="btn ${metric === m ? 'on' : ''}" onclick="UI._rankMetric='${m}';UI.renderRank()">${METRICS[m]}</button>`).join('');

  const head = `
  <div class="panel rank-panel">
    <h3 data-tip data-tip-title="群英榜" data-wiki="mechanic:rank">群英榜<span class="tip-body hidden">以修为、著录、轮回等综合指标排名；修为口径为累计经验——打坐等一切修行都计入，勤修者自然居前。</span></h3>
    <p class="hint">网游化的第一步：把你的修为、著录、轮回战绩投到一张榜上，与各路著录客一较高下。数值只取各人历史最好，重复投递不会刷低自己。</p>
    <div class="rank-cfg">
      <div class="form-row"><span>榜单服务</span>
        <input type="text" id="lbUrl" value="${esc(url)}" placeholder="如 http://你的服务器:8788" maxlength="200">
        <button class="btn" type="button" onclick="UI.saveLbUrl()">保存</button></div>
      <div class="hint set-hint">地址由你自管（见 server/leaderboard.js，零依赖，自己起一个即可）。留空则只显示本机战绩卡，不参与排行。不上传任何账号信息，仅投昵称与战绩数字。</div>
    </div>`;

  // 无榜单服务时也把「本机战绩卡」正式画出来（v1.31.172）：此前只有一个复制按钮悬在半空，
  // 整页九成空白。数值口径与 shareCard 完全一致（scorePayload）。
  const p = this.scorePayload();
  const localCard = `
    <h3>本机战绩</h3>
    <div class="rank-local-grid">
      <div class="stat-rows">
        <span>昵称<b>${esc(p.name)}</b></span>
        <span>总修为<b>${fmt(p.totalXp)}</b></span>
        <span>著录<b>${p.recorded}</b></span>
        <span>轮回次数<b>${p.rebirthCount}</b></span>
      </div>
      <div class="stat-rows">
        <span>单轮最快<b>${p.bestSec ? fmt(p.bestSec) + ' 秒' : '—'}</b></span>
        <span>最高强化<b>${p.bestEnhance ? '+' + p.bestEnhance : '—'}</b></span>
        <span>图鉴收录<b>${p.codexTotal}</b></span>
        <span>悬赏在身<b>${p.bounties}</b></span>
      </div>
    </div>`;

  const body = url ? `
    <div class="rank-actions">
      <button class="btn primary" type="button" onclick="UI.submitScore()">投我战绩</button>
      <span class="btn-group">${metricBtns}</span>
    </div>
    <div id="rankBody"><div class="hint">榜单加载中…</div></div>` : `
    <div class="rank-local">
      ${localCard}
      <div class="rank-actions" style="margin-top:10px;"><button class="btn" type="button" onclick="UI.shareCard()">复制本机战绩卡</button></div>
      <p class="hint" style="margin-top:8px;">以上即「本机战绩卡」，可复制分享到群。配置「榜单服务」地址后，即可投递战绩并查看全服排行。</p>
    </div>`;

  c.innerHTML = head + body + `</div>`;
  if (url) this.fetchRank();
};

// 保存榜单地址（存进 Prefs，随存档落盘）
UI.saveLbUrl = function(){
  const el = $('lbUrl');
  const v = el ? String(el.value || '').trim() : '';
  if (typeof Prefs !== 'undefined') Prefs.leaderboardUrl = v;
  if (typeof saveGame === 'function') saveGame();
  this.renderRank();
  if (v) this.toast('已保存榜单地址');
  else this.toast('已清空榜单地址（不参与排行）');
};

// 投递战绩
UI.submitScore = async function(){
  const base = lbBase();
  if (!base){ this.toast('请先填写榜单服务地址'); return; }
  const payload = this.scorePayload();
  try {
    const res = await lbFetch(base + '/api/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) { this.toast('投递太频繁，请稍候再投'); return; }
    if (!res.ok){ this.toast('投递失败（' + res.status + '）'); return; }
    const j = await res.json().catch(() => ({}));
    this.toast('战绩已投 · 当前总修为排名第 ' + (j.rank || '—') + ' / ' + (j.total || '—'));
    this.fetchRank();
  } catch(e){
    this.toast('榜单服务未响应，请检查地址与服务器');
  }
};

// 拉取并渲染榜单
UI.fetchRank = async function(){
  const box = $('rankBody');
  if (!box) return;
  const base = lbBase();
  if (!base){ box.innerHTML = '<div class="hint">未配置榜单服务</div>'; return; }
  const metric = this._rankMetric || 'totalXp';
  const METRICS = { totalXp:'修为', recorded:'著录', rebirthCount:'轮回' };
  try {
    const res = await lbFetch(base + '/api/leaderboard?metric=' + encodeURIComponent(metric) + '&limit=50');
    if (!res.ok){ box.innerHTML = '<div class="hint">榜单服务返回 ' + res.status + '</div>'; return; }
    const j = await res.json().catch(() => null);
    if (!j || !Array.isArray(j.rows)){ box.innerHTML = '<div class="hint">榜单数据异常</div>'; return; }
    if (!j.rows.length){ box.innerHTML = '<div class="empty-note">榜上还没有人，去投下第一笔战绩吧。</div>'; return; }
    const rows = j.rows.map(r => `<tr>
      <td class="rk">${r.rank}</td>
      <td class="nm">${esc(r.name)}</td>
      <td class="val">${fmt(r.value)}</td>
      <td class="ver">${esc(r.v || '')}</td>
    </tr>`).join('');
    box.innerHTML = `
      <table class="rank-table">
        <thead><tr><th>名次</th><th>著录客</th><th>${METRICS[metric] || '数值'}</th><th>版本</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch(e){
    box.innerHTML = '<div class="hint">榜单服务未响应，请检查地址与服务器</div>';
  }
};
