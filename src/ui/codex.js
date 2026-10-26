// ===== ui/codex.js — 图鉴（五阶揭示 / 未录筛选）与祠祀（礼制 / 征兆 / 卜筮） =====
// 由 src/ui.js 拆分而来（v1.31.8）。加载顺序见 index.html：core 必须最先（UI 对象在这里定义），
// 其余按页顺序；跨文件调用的函数与常量都在全局词法环境里，运行时才求值，先后不影响调用。

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
        return `<div class="ach-row st-${st}" role="button" tabindex="0"
          onclick="UI.codexAchDetail('${a.id}')" title="点开看还差哪些">
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

// 「还差哪些」：图鉴成就只写「异兽 著录 262/292」，玩家看不出差的 30 条是什么、在哪。
// 点开就把未著录的列出来，各带一处出没之地；差得太多时只列前 12 条并给出总数。
function codexWhere(id){
  const it = (typeof Items !== 'undefined') ? Items[id] : null;
  if (it && it.node){ const n = nodeOf(it.node); return n ? (n.name || '') : ''; }
  const m = (typeof Monsters !== 'undefined') ? Monsters[id] : null;
  if (m && m.nodeId){ const n = nodeOf(m.nodeId); return n ? (n.name || '') : ''; }
  return '';
}
UI.codexAchDetail = function(id){
  const a = (window.CODEX_ACHIEVEMENTS || []).find(x => x.id === id);
  if (!a) return;
  const st = codexAchState(a);
  const done = codexDoneCount(a.cat);
  const stText = { claimable:'可领', locked:'未达', claimed:'已领' };
  // 未著录的那几条
  const pool = Object.values(CODEX).filter(e => (a.cat ? e.cat === a.cat : true) && !(Game.records || {})[e.id]);
  const seen = new Set();
  const rows = [];
  for (const e of pool){
    if (seen.has(e.name)) continue;      // 同名异兽散在各山，按名去重
    seen.add(e.name);
    rows.push({ name: e.name, where: codexWhere(e.id) });
  }
  const shown = rows.slice(0, 12);
  const p = Math.min(100, Math.round(done / Math.max(1, a.need) * 100));
  const tabOf = { beast:'beast', mountain:'mountain', thing:'thing', deity:'deity' };
  UI.modal(`<h3>${esc(a.name)} <span class="tier">${stText[st]}</span></h3>
    <div class="meta">当前 ${done} 条 · 目标 ${a.need} 条（全 ${a.total} 条）${done < a.need ? ` · 还差 ${a.need - done}` : ' · 已达标'}</div>
    <div class="ach-pro" style="margin:8px 0 12px"><i style="width:${p}%"></i></div>
    ${rows.length ? `<div class="reveal"><b>还差</b><span class="ach-letters">${
      shown.map(r => `<span class="ach-letter">${esc(r.name)}${r.where ? `<i>${esc(r.where)}</i>` : ''}</span>`).join('')
    }${rows.length > shown.length ? `<span class="hint">…另 ${rows.length - shown.length} 条，去图鉴里翻</span>` : ''}</span></div>`
      : '<div class="reveal"><b>还差</b>此类已尽收</div>'}
    <div class="reveal"><b>回馈</b>${esc(codexAchRewardText(a))}</div>
    <div class="modal-btns">
      ${st === 'claimable' ? `<button class="btn primary" onclick="claimCodexAch('${a.id}');UI.closeModal();UI.openAchModal();UI.renderCodex()">领取</button>` : ''}
      ${a.cat ? `<button class="btn" onclick="UI.closeModal();UI.codexTab='${tabOf[a.cat] || 'beast'}';UI.renderCodex()">去图鉴看</button>` : ''}
      <button class="btn" onclick="UI.openAchModal()">返回列表</button>
    </div>`);
};

// 未录条目的产地线索：异兽看它在哪座山，物品看第一处采集点。
// 只给「一處地」，不是攻略——目的是让「仅未录」这张待办清单能直接照着走。
function codexWhereOf(e){
  if (!e) return '';
  const m = (typeof Monsters !== 'undefined') ? Monsters[e.id] : null;
  if (m && m.nodeId){
    const nd = (typeof nodeOf === 'function') ? nodeOf(m.nodeId) : null;
    if (nd) return nd.name;
  }
  if (typeof itemSources === 'function'){
    const src = itemSources(e.id).find(x => x.nodeId);
    if (src){
      const nd = nodeOf(src.nodeId);
      if (nd) return nd.name;
    }
  }
  return '';
}
window.codexWhereOf = codexWhereOf;

// ---------- 检索派生状态 ----------
// 图鉴 1121 条，检索要同时算出：本类条目、命中数、各分类命中数、完成度。
// 整页渲染与「只换列表」的局部刷新必须共用同一份口径，否则两处判断会走散
// （曾经「本类命中 0」与「分类角标 3」对不上，就是这个原因）。
function codexView(){
  const tabs = { beast:'异兽', mountain:'山川', thing:'百物', deity:'祠典 · 神祇' };
  const catMap = { beast:'异兽', mountain:'山川', thing:['灵木','金玉','水族','灵草','嘉谷','百物'], deity:['祠典','神祇'] };
  const entries = Object.values(CODEX).filter(e=>{
    const c = catMap[UI.codexTab];
    return Array.isArray(c) ? c.includes(e.cat) : e.cat === c;
  });
  const total = Object.keys(CODEX).length;
  const done = recordedCount();
  const tabTotal = entries.length;
  const tabDone = entries.filter(e=>(Game.records[e.id]||{}).count>0).length;
  const tabPct = tabTotal ? Math.round(tabDone/tabTotal*100) : 0;
  // 632 条图鉴靠翻页找一条太慢：给一个名/注音检索框
  const q = String(UI.codexQuery||'').trim().toLowerCase();
  // 「仅未录」：收集到后期，满屏已录的卡里找剩下那几条实在费眼
  const onlyMiss = !!UI.codexOnlyMiss;
  const matchQ = e => (e.name||'').toLowerCase().includes(q) || String(e.py||'').toLowerCase().includes(q);
  let shown = q ? entries.filter(matchQ) : entries;
  // 搜索只在本类里过滤，于是「搜蛊雕却停在百物页」时一片空白，玩家以为图鉴里没有。
  // 有检索词时把各分类的命中数挂到分类按钮上，一眼看出该切去哪一页。
  const qHit = {};
  if (q){
    for (const [k, c] of Object.entries(catMap)){
      const list = Object.values(CODEX).filter(e => Array.isArray(c) ? c.includes(e.cat) : e.cat === c);
      qHit[k] = list.filter(matchQ).length;
    }
  }
  if (onlyMiss) shown = shown.filter(e => !(((Game.records||{})[e.id]||{}).count > 0));
  // 收集成就：把奖励闭环挂在收集线自己的入口上，不必另开一页
  const achAll = (window.CODEX_ACHIEVEMENTS || []);
  let achClaim = 0, achDone = 0;
  achAll.forEach(a => { const st = codexAchState(a); if (st === 'claimable') achClaim++; else if (st === 'claimed') achDone++; });
  return { tabs, catMap, entries, total, done, tabTotal, tabDone, tabPct, q, onlyMiss, shown, qHit, achAll, achClaim, achDone };
}

function codexAchBarHtml(v){
  return `<div class="ach-bar">
    <span class="ach-lb">收集成就</span>
    <span class="ach-stat">已领 <b>${v.achDone}</b> / ${v.achAll.length}</span>
    ${v.achClaim ? `<span class="ach-new">可领 ${v.achClaim}</span>` : '<span class="hint">暂无待领</span>'}
    <button class="btn small" onclick="UI.openAchModal()">${v.achClaim ? '领取' : '查看'}</button>
  </div>`;
}
// 分类 chips 与「仅未录」：检索时角标会变，所以单独成块（局部刷新时只换这一块）
function codexTabsInner(v){
  return Object.entries(v.tabs).map(([k, label])=>{
    const hit = v.q ? (v.qHit[k] || 0) : 0;
    const badge = (v.q && hit > 0 && k !== UI.codexTab) ? `<i class="q-hit" title="本类命中 ${hit} 条">${hit}</i>` : '';
    return `<button class="chip-btn ${UI.codexTab===k?'on':''}" onclick="UI.codexTab='${k}';UI.renderCodex()">${label}${badge}</button>`;
  }).join('')
  + `<button class="chip-btn ${v.onlyMiss?'on':''}" title="只列本类尚未著录的条目"
      onclick="UI.codexOnlyMiss=!UI.codexOnlyMiss;UI.renderCodex()">仅未录 ${v.tabTotal-v.tabDone}</button>`;
}
// 检索框。⚠️ 中文输入法：拼音在输入框里是「组合中」的临时文本，
// 每敲一个字母就重建整个页面（旧实现 oninput → 整页 innerHTML）会把 input 连同
// 组合态一起销毁，拼音上不了屏，等于中文输不进去。现在输入只换列表，不动这个节点；
// 组合期间连列表都不换，上屏后再刷。
// 监听器用 addEventListener 绑（见 bindCodexSearch），不写行内 oncompositionstart：
// 行内写法要有 IDL 属性 oncompositionstart 才生效，而它并非所有内核都实现
// （headless Chromium 上 `'oncompositionstart' in window` 就是 false——写了等于没写）。
function codexSearchHtml(){
  return `<label class="search-box" title="按名称或注音检索">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
      <input id="codexSearch" type="search" placeholder="检索名 / 注音" value="${esc(UI.codexQuery||'')}">
    </label>`;
}
// 检索框的三件事：组合开始（拼音在打，别动它）、组合结束（上屏，刷列表）、
// 普通输入（直接刷列表）。整页渲染后绑一次即可——节点此后不再被重建。
function bindCodexSearch(){
  const el = $('codexSearch');
  if (!el || !el.addEventListener) return;
  el.addEventListener('compositionstart', () => { UI._codexComposing = true; });
  el.addEventListener('compositionend', () => {
    UI._codexComposing = false;
    UI.onCodexQuery(el);
  });
  el.addEventListener('input', ev => UI.onCodexQuery(el, ev));
  el.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    el.value = ''; UI.codexQuery = ''; UI.patchCodexList();
  });
}
function codexHintText(v){
  return `本类 ${v.tabDone}/${v.tabTotal}${v.q?` · 命中 ${v.shown.length}`:''}${v.onlyMiss?` · 未录 ${v.shown.length}`:''} · 总录 ${v.done}/${v.total}`;
}
// 完成度总览：1121 条散在四类里，只看当前类的分母不知道「其余三类还剩多少」，
// 每切一次页签才看一眼，等于没有全局概念。四格并排，点哪格进哪类。
function codexOverviewHtml(v){
  const rows = Object.entries(v.catMap).map(([k, c])=>{
    const list = Object.values(CODEX).filter(e => Array.isArray(c) ? c.includes(e.cat) : e.cat === c);
    const dn = list.filter(e => ((Game.records || {})[e.id] || {}).count > 0).length;
    const pc = list.length ? Math.round(dn / list.length * 100) : 0;
    const miss = list.length - dn;
    return `<button class="cx-ov ${UI.codexTab===k?'on':''}${miss===0?' full':''}" type="button"
        onclick="UI.codexTab='${k}';UI.renderCodex()"
        title="${v.tabs[k]}：已录 ${dn} / ${list.length}${miss ? `，还差 ${miss}` : '，已尽收'}">
      <span class="cx-ov-t">${v.tabs[k]}</span>
      <span class="cx-ov-v">${dn}<i>/${list.length}</i></span>
      <span class="cx-ov-b"><i style="width:${pc}%"></i></span>
    </button>`;
  }).join('');
  return `<div class="codex-overview">${rows}
    <span class="cx-ov-sum">总 ${v.done}/${v.total}（${v.total ? Math.round(v.done/v.total*100) : 0}%）</span></div>`;
}
function codexGridInner(v){
  const q = v.q;
  return v.shown.length ? v.shown.map(e=>{
    const rec = Game.records[e.id]||{count:0,tier:0};
    const seen = rec.count > 0;
    // 检索时把命中片段高亮；否则沿用常规 nameTag（含生僻字处理）
    const nmHtml = q
      ? `<span class="nm">${hi(e.name,q)}${e.py?`<rt>${hi(e.py,q)}</rt>`:''}</span>`
      : nameTag(e.name, e.py);
    if (!seen){
      // 未著录：只留名字与虚线框，整片图鉴才读得出「哪些还没见过」。
      // 但筛到「仅未录」时，玩家就是在找这些东西去哪打／去哪采——那时才给一行产地，
      // 平时仍留白（未知本身是收藏的乐趣）。
      const where = v.onlyMiss ? codexWhereOf(e) : '';
      return `<div class="codex-card unseen" onclick="showCodexDetail('${e.id}')" title="${esc(e.name)} · 未见${where ? ' · ' + esc(where) : ''}">
        <div class="cc-name">${nmHtml}</div>
        ${where ? `<div class="cc-where">${esc(where)}</div>` : ''}
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
    // 系产：这件是某山系的特产（走遍该系才拿得到）。图鉴列表里看不出来，
    // 玩家只会在详情页偶然发现——一个小印就够，不必再加一行字。
    const spReg = (typeof pilgrimGiftIndex === 'function') ? pilgrimGiftIndex().get(e.id) : null;
    const spTag = spReg ? `<span class="cc-sp" title="${esc(spReg.regionName)}特产 · 走遍该系可得">系产</span>` : '';
    return `<div class="codex-card" onclick="showCodexDetail('${e.id}')" title="${esc(e.name)} · 已著录 ${rec.count} 次${esc(nextTip)}${spReg ? ' · ' + esc(spReg.regionName) + '特产' : ''}">
      ${icHtml}
      <div class="cc-name">${nmHtml}${spTag}</div>
      <div class="tier-dots" aria-hidden="true">${dots}</div>
      <div class="cc-tier">${TUNING.MASTERY.NAMES[rec.tier]}<span class="cc-count">${countHtml}</span></div>
    </div>`;
  }).join('') : `<div class="empty-note">${v.onlyMiss
    ? (q ? '未录条目里没有匹配的。' : '本类已尽收——没有未著录的条目了。')
    : (()=>{
        // 本类没有、别类有时，直接说清在哪一类——这比让玩家自己看角标更省事
        const other = Object.entries(v.qHit || {}).filter(([k, n]) => k !== UI.codexTab && n > 0)
          .map(([k, n]) => `${v.tabs[k]} ${n} 条`).join('、');
        return other
          ? `${esc(UI.codexQuery||'')} —— 本类无此条目；${esc(other)}，点上面的分类去看。`
          : `${esc(UI.codexQuery||'')} —— 无此条目。换个字或注音试试，例如「鸟」「yú」。`;
      })()}</div>`;
}

UI.renderCodex = function(){
  const box = $('content');
  if (!box) return;
  const v = codexView();
  box.innerHTML = codexAchBarHtml(v)
    + `<div class="filter-row"><span class="codex-tabs" id="codexTabs">${codexTabsInner(v)}</span>`
    + codexSearchHtml()
    + `<span class="hint" id="codexHint">${esc(codexHintText(v))}</span></div>`
    + `<div class="codex-bar" title="本类已著录 ${v.tabPct}%"><div class="fill" style="width:${v.tabPct}%"></div></div>`
    + codexOverviewHtml(v)
    + `<div class="codex-grid" id="codexGrid">${codexGridInner(v)}</div>`;
  bindCodexSearch();
};
// 输入检索词：只换「分类角标 / 列表 / 计数」，检索框本身原地不动（中文输入法才不会断）
UI.onCodexQuery = function(el, ev){
  if (!el) return;
  UI.codexQuery = el.value;
  if (UI._codexComposing) return;                      // 组合中（拼音未上屏）
  if (ev && ev.isComposing) return;
  UI.patchCodexList();
};
UI.patchCodexList = function(){
  const v = codexView();
  const g = $('codexGrid');
  if (g) g.innerHTML = codexGridInner(v);
  const tb = $('codexTabs');
  if (tb) tb.innerHTML = codexTabsInner(v);
  const hint = $('codexHint');
  if (hint){
    const t = codexHintText(v);
    if (hint.textContent !== t) hint.textContent = t;
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
          ${(() => {
            // 这一礼值不值：把祭品折成贝币，与「该域挂一小时的增益」摆在一起。
            // 原先只有「+15%」这种看不见的量，玩家没法判断该不该祭。
            const w = (typeof riteWorth === 'function') ? riteWorth(id) : null;
            if (!w) return '';
            // 技艺差太远时该域一件也采不动，增益无从折算——别装作算得出来，
            // 也不能让这一行凭空消失（玩家会以为礼没用）。
            if (!(w.gain > 0))
              return `<div class="rc-worth">祭品折价约 ${fmt(w.cost)} 贝 · 以现有技艺此域尚无可采之物，增益无从折算</div>`;
            const pay = w.payback < 60 ? '不到一分钟即回本' : `${fmtTime(w.payback)}回本`;
            return `<div class="rc-worth">祭品折价约 ${fmt(w.cost)} 贝 · 本域挂一小时约采 ${fmt(w.vpsHour)} 贝 → 此礼多得约 ${fmt(w.gain)} 贝，${pay}</div>`;
          })()}
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
                return `<div class="rc-sub rc-src">${esc((Items[iid]||{}).name || iid)}：${esc(src.kind)}${src.lvl ? ' Lv' + src.lvl : ''}${src.where ? ' · ' + esc(src.where) : ''}</div>`;
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
// 兆上的「标记位」：不是数值，但玩家该知道它意味着什么。
// wind / psy 原先只在数据里躺着，界面上谁也看不见；war 有真机制（駮可御兵）却从没写出来——
// 注释里曾写「大风可被御风御使削弱」，那是从未实现的承诺，已随本次更正删去。
const OMEN_TAGS = {
  war:  '兵戈之兆 · 御使駮可御之',
  wind: '行旅迟滞，舟车难行',
  psy:  '人心惶惶，卜筮失准',
};
function omenEffectText(def){
  const parts = [];
  for (const [k, label] of OMEN_EFFECT_LABELS){
    if (def[k] === undefined) continue;
    parts.push(`${label} ${def[k] > 0 ? '+' : ''}${Math.round(def[k]*100)}%${def.dur ? `（${fmtTime(def.dur)}）` : ''}`);
  }
  if (def.wise) parts.push('抉择类事件必出最优解');
  for (const [k, t] of Object.entries(OMEN_TAGS)) if (def[k]) parts.push(t);
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
// （原 sparkline 微型折线随墟市「售价走势」一并撤除，v1.31.46；
//   等专门的经济系统做起来再重写，那时的图要画的是供需与价差，不只是倍率曲线。）
