// ===== ui/codex.js — 图鉴（五阶揭示 / 未录筛选）。祠祀已拆至 shrine.js（v1.31.123） =====
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

// 未录条目的产地线索：异兽看它在哪座山，物品看采集点。
// 只给「一處地」，不是攻略——目的是让「仅未录」这张待办清单能直接照着走。
// ⚠️ v1.31.49：物品类此前取 itemSources 的第一处（往往是主产地），
// 于是「金」只写「招摇之山」——可它有 42 处产地，另有 41 处已开通的山。
// 现在多产地时给一句「招摇之山 等 42 山」，并让**已解锁的那处排在最前**。
function codexWhereOf(e){
  if (!e) return '';
  const m = (typeof Monsters !== 'undefined') ? Monsters[e.id] : null;
  if (m && m.nodeId){
    const nd = (typeof nodeOf === 'function') ? nodeOf(m.nodeId) : null;
    if (nd) return nd.name;
  }
  // 采集物：认 nodes[] 全集（引擎的产地判据），已解锁的优先
  if (typeof codexSourceNodes === 'function' && typeof isGatherSkill === 'function'){
    const it = (typeof Items !== 'undefined') ? Items[e.id] : null;
    if (it && isGatherSkill(it.skill)){
      const ids = codexSourceNodes(e) || [];
      const names = [];
      for (const id of ids){
        const nd = nodeOf(id);
        if (!nd || !nd.name) continue;
        const ok = (typeof nodeUnlocked === 'function') ? nodeUnlocked(nd) : true;
        names.push({ name: nd.name, ok });
      }
      if (names.length){
        // 已解锁的排前面：清单要照着走，先说走得通的那处
        names.sort((a,b)=> (b.ok?1:0) - (a.ok?1:0));
        return names.length > 1 ? `${names[0].name} 等 ${names.length} 山` : names[0].name;
      }
    }
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
  // 「可往」（v1.31.49）：只列**现在就能前往**的条目。
  // 「仅未录」是一张待办清单，但清单里 445 条山川全都锁着时，它就只是一张锁的清单。
  // 玩家真正要的是「此刻能去的地方里，还有哪些没录」——那才是下一步能做的事。
  // 判据取自引擎的 codexReachInfo（与采集的产地判据同源，v1.31.48）。
  const reachOnly = !!UI.codexReachOnly;
  if (reachOnly) shown = shown.filter(e => {
    const info = (typeof codexReachInfo === 'function') ? codexReachInfo(e) : null;
    return !!(info && info.unlocked);
  });
  // 收集成就：把奖励闭环挂在收集线自己的入口上，不必另开一页
  const achAll = (window.CODEX_ACHIEVEMENTS || []);
  let achClaim = 0, achDone = 0;
  achAll.forEach(a => { const st = codexAchState(a); if (st === 'claimable') achClaim++; else if (st === 'claimed') achDone++; });
  return { tabs, catMap, entries, total, done, tabTotal, tabDone, tabPct, q, onlyMiss, reachOnly, shown, qHit, achAll, achClaim, achDone };
}

function codexAchBarHtml(v){
  // 进度线：已领占比一眼可读——成就数字之外给一个「比例」的形
  const pct = v.achAll.length ? Math.round(v.achDone / v.achAll.length * 100) : 0;
  return `<div class="ach-bar">
    <span class="ach-lb" data-tip data-tip-title="图鉴" data-wiki="mechanic:codex" role="button" tabindex="0">收集成就<span class="tip-body hidden">图鉴录走过的山川、著录的物产异兽与所得遗物；收集成就把奖励闭环挂在收集线自己的入口上，达成即可领取。</span></span>
    <span class="ach-stat">已领 <b>${v.achDone}</b> / ${v.achAll.length}</span>
    <span class="ach-meter" aria-hidden="true"><i style="width:${pct}%"></i></span>
    ${v.achClaim ? `<span class="ach-new">可领 ${v.achClaim}</span>` : '<span class="hint">暂无待领</span>'}
    <button class="btn small" onclick="UI.openAchModal()">${v.achClaim ? '领取' : '查看'}</button>
  </div>`;
}
// 筛选钮（v1.31.191）：这里原先还有一排「异兽 / 山川 / 百物 / 祠典」，与上方四格
// 完成度总览点的是同一件事——同一屏两套分类选择器，一处带数字、一处只有名字。
// 现在分类只由四格决定，这一行只留「只看什么」，不再是第二个切类入口。
function codexTabsInner(v){
  return `<button class="chip-btn ${v.onlyMiss?'on':''}" title="只列本类尚未著录的条目"
      onclick="UI.codexOnlyMiss=!UI.codexOnlyMiss;UI.renderCodex()">仅未录 ${v.tabTotal-v.tabDone}</button>`
  // 「可往」：只列此刻就能前往的条目（与「仅未录」可叠加，成为「此刻能去且还没录」的待办）
  + (()=>{
      const n = v.entries.filter(e => {
        const info = (typeof codexReachInfo === 'function') ? codexReachInfo(e) : null;
        return !!(info && info.unlocked);
      }).length;
      return `<button class="chip-btn ${v.reachOnly?'on':''}" title="只列此刻就能前往的条目（与「仅未录」可叠加）"
        onclick="UI.codexReachOnly=!UI.codexReachOnly;UI.renderCodex()">可往 ${n}</button>`;
    })();
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
// 筛选行右侧那句话（v1.31.191）：原先开口就是「本类 12/34」，可在上面第一格
// 「异兽 12/34」里写着同一个数字，两处相邻并列等于说了两遍。现在没有筛选时
// 只说这一页有多少条；一旦开了检索 / 仅未录 / 可往，才逐条报各条件筛出多少。
function codexHintText(v){
  const parts = [];
  if (v.q) parts.push(`命中 ${v.shown.length}`);
  if (v.onlyMiss) parts.push(`未录 ${v.shown.length}`);
  // 「可往」与「仅未录」叠加时，「未录 N」说的是筛选后的数，会误导——分开说清
  if (v.reachOnly) parts.push(`可往 ${v.shown.length}`);
  if (!parts.length) return `共 ${v.tabTotal} 条`;
  return parts.join(' · ');
}
// 完成度总览：1121 条散在四类里，只看当前类的分母不知道「其余三类还剩多少」，
// 每切一次页签才看一眼，等于没有全局概念。四格并排，点哪格进哪类。
function codexOverviewHtml(v){
  const rows = Object.entries(v.catMap).map(([k, c])=>{
    const list = Object.values(CODEX).filter(e => Array.isArray(c) ? c.includes(e.cat) : e.cat === c);
    const dn = list.filter(e => ((Game.records || {})[e.id] || {}).count > 0).length;
    const pc = list.length ? Math.round(dn / list.length * 100) : 0;
    const miss = list.length - dn;
    // 检索命中角标（v1.31.191）：原先挂在分类 chips 上，chips 合并进四格后跟着搬过来，
    // 免得「搜蛊雕停在百物页」时看不出该切去哪一格。
    const hit = v.q ? (v.qHit[k] || 0) : 0;
    const badge = (v.q && hit > 0 && UI.codexTab !== k)
      ? `<i class="q-hit" title="本类命中 ${hit} 条">${hit}</i>` : '';
    return `<button class="cx-ov ${UI.codexTab===k?'on':''}${miss===0?' full':''}" type="button"
        onclick="UI.codexTab='${k}';UI.renderCodex()"
        title="${v.tabs[k]}：已录 ${dn} / ${list.length}${miss ? `，还差 ${miss}` : '，已尽收'}">
      <span class="cx-ov-t">${v.tabs[k]}${badge}</span>
      <span class="cx-ov-v">${dn}<i>/${list.length}</i></span>
      <span class="cx-ov-b"><i style="width:${pc}%"></i></span>
    </button>`;
  }).join('');
  return `<div class="codex-overview">${rows}
    <span class="cx-ov-sum">总 ${v.done}/${v.total}（${v.total ? Math.round(v.done/v.total*100) : 0}%）</span></div>`;
}
// 未录条目的「前往」：能定位到节点就给一枚按钮，节点还锁着就写明要多少级。
// ⚠️ v1.31.49：门槛取「所有候选产地里最省的那个」（codexReachInfo），不是主产地那一个。
// 「雄黄」主产地是西山十六（需 41 级），可它在南山五号山就采得到 —— 报 41 级会把人吓回去。
// ⚠️ 样式：锁着的签改成**无边框的淡字**。此前 445 枚虚线框签在「仅未录」下铺满整屏，
// 真正想找的是「现在能去的那几条」，一堆边框签反而把重点埋了。信息不减，只降噪。
function codexGoBtn(e){
  const cn = (typeof codexNode === 'function') ? codexNode(e) : null;
  if (!cn) return '';
  const n = (typeof nodeOf === 'function') ? nodeOf(cn.nodeId) : null;
  const info = (typeof codexReachInfo === 'function') ? codexReachInfo(e) : null;
  if (info && !info.unlocked){
    const why = info.why || '未解锁';
    const gapTxt = (info.gap !== null && info.gap !== undefined) ? `需 ${info.gap} 级` : '暂不可往';
    return `<span class="cc-lock" title="${esc(why)}">${esc(gapTxt)}</span>`;
  }
  return `<button class="cc-go" type="button" title="前往 ${esc(n ? n.name : '')}"
    onclick="event.stopPropagation();UI.gotoCodexNode('${cn.nodeId}','${cn.regionId}')">前往</button>`;
}
UI.gotoCodexNode = function(nodeId, regionId){
  UI.selRegion = regionId;
  UI.selNode = nodeId;
  UI.switchTab('yudi');
  UI.closeModal();
};

// 图鉴一页画多少张。全量一次铺出来在手机上要 370ms（实测 WebKit：433KB HTML、
// 6600 个 DOM 节点），而几百张里玩家一眼能扫到的不到二十张——先给一屏多，
// 底下放一颗「还有 N 条」。点它再放 120 张，已经画好的那些不重排。
const CODEX_PAGE = 48;
function codexGridInner(v){
  const q = v.q;
  const total = v.shown ? v.shown.length : 0;
  const lim = Math.max(CODEX_PAGE, UI.codexLimit | 0);
  const list = (v.shown || []).slice(0, lim);
  const more = total > list.length
    ? `<button class="btn codex-more" type="button" onclick="UI.codexMore()">还有 ${total - list.length} 条 · 展开</button>`
    : '';
  return list.length ? list.map(e=>{
    // 归一化（v1.31.191）：导入的旧档、手改过的存档可能只带 count 没有 tier，
    // 直接取字段会把「距「undefined」还差 NaN 次」印到卡片底下（截图上就是那个 undefined）。
    const raw = Game.records[e.id] || null;
    const rec = { count: Math.max(0, Number(raw && raw.count) || 0),
                  tier: Math.max(0, Math.min(TUNING.MASTERY.NAMES.length - 1, Number(raw && raw.tier) || 0)) };
    const seen = rec.count > 0;
    // 检索时把命中片段高亮；否则沿用常规 nameTag（含生僻字处理）
    const nmHtml = q
      ? `<span class="nm">${hi(e.name,q)}${e.py?`<rt>${hi(e.py,q)}</rt>`:''}</span>`
      : nameTag(e.name, e.py);
    if (!seen){
      // 未著录：只留名字与虚线框，整片图鉴才读得出「哪些还没见过」。
      // 但筛到「仅未录」或「可往」时，玩家就是在找这些东西去哪打／去哪采——那时才给一行产地，
      // 平时仍留白（未知本身是收藏的乐趣）。
      const wantAction = v.onlyMiss || v.reachOnly;
      const where = wantAction ? codexWhereOf(e) : '';
      // 前往：山川类（447 条，占全图鉴四成）此前既无产地也无入口——它的条目 id 就是
      // nodeId，codexNode 现已认得。未录的山就在那儿，给一枚「前往」比让人自己翻舆地强。
      // 「可往」筛选下同样要给：这轮筛出来的正是「此刻能去的那几条」，入口是这轮的重点。
      const goBtn = wantAction ? codexGoBtn(e) : '';
      return `<div class="codex-card unseen" onclick="showCodexDetail('${e.id}')" title="${esc(e.name)} · 未见${where ? ' · ' + esc(where) : ''}">
        <div class="cc-name">${nmHtml}</div>
        ${where ? `<div class="cc-where">${esc(where)}</div>` : ''}
        ${goBtn}
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
  }).join('') + more : `<div class="empty-note">${v.onlyMiss
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
  UI.codexLimit = 0;                 // 换页/换分类从第一屏重新开始
  const v = codexView();
  // 页序（v1.31.191）：成就条 → 四格（唯一的分类选择器）→ 筛选行 → 列表。
  // 整宽的 .codex-bar 删了：四格每格底下已有一条本类进度，再横贯一条说的是同一件事。
  box.innerHTML = codexAchBarHtml(v)
    + `<div id="codexOverview">${codexOverviewHtml(v)}</div>`
    + `<div class="filter-row"><span class="codex-tabs" id="codexTabs">${codexTabsInner(v)}</span>`
    + codexSearchHtml()
    + `<span class="hint" id="codexHint">${esc(codexHintText(v))}</span></div>`
    + `<div class="codex-grid" id="codexGrid">${codexGridInner(v)}</div>`;
  bindCodexSearch();
};
// 输入检索词：只换「分类角标 / 列表 / 计数」，检索框本身原地不动（中文输入法才不会断）
UI.onCodexQuery = function(el, ev){
  if (!el) return;
  UI.codexQuery = el.value;
  UI.codexLimit = 0;                                   // 换了检索词，回到第一屏
  if (UI._codexComposing) return;                      // 组合中（拼音未上屏）
  if (ev && ev.isComposing) return;
  UI.patchCodexList();
};
// 展开更多：只把列表重画一遍（顶部分类栏、概览、进度条都不动）。
// 用 patchCodexList 而不是 renderCodex——后者会把检索框重建成新节点，
// 中文输入法正在输入时焦点会丢。
UI.codexMore = function(){
  UI.codexLimit = (UI.codexLimit | 0) + 120;
  UI.patchCodexList();
};

UI.patchCodexList = function(){
  const v = codexView();
  const g = $('codexGrid');
  if (g) g.innerHTML = codexGridInner(v);
  const ov = $('codexOverview');
  if (ov) ov.innerHTML = codexOverviewHtml(v);   // 检索命中角标与完成度都在这块里
  const tb = $('codexTabs');
  if (tb) tb.innerHTML = codexTabsInner(v);
  const hint = $('codexHint');
  if (hint){
    const t = codexHintText(v);
    if (hint.textContent !== t) hint.textContent = t;
  }
};
// 图鉴详情页的「产地清单」（v1.31.49）
// 此前进这页只给一枚「前往产出节点」——点进去才知道是哪座山。
// 而多产地的物有几十处产地（金 42 处），玩家真正要问的是「哪几处我现在能去」。
// 产地候选集取自引擎的 codexSourceNodes（与采集判据同源），已解锁的排在前面。
function codexSourceListHtml(e){
  const ids = (typeof codexSourceNodes === 'function') ? codexSourceNodes(e) : [];
  if (!ids.length) return '';
  // 已解锁的排前面：清单是照着走的清单，走得通的那几处要先看见
  const ordered = ids.slice().sort((a, b) => {
    const na = nodeOf(a), nb = nodeOf(b);
    const oa = (na && (typeof nodeUnlocked === 'function')) ? (nodeUnlocked(na) ? 0 : 1) : 1;
    const ob = (nb && (typeof nodeUnlocked === 'function')) ? (nodeUnlocked(nb) ? 0 : 1) : 1;
    if (oa !== ob) return oa - ob;
    const la = (na && typeof na.unlockLevel === 'number') ? na.unlockLevel : 99;
    const lb = (nb && typeof nb.unlockLevel === 'number') ? nb.unlockLevel : 99;
    return la - lb;
  });
  const rows = ordered.map(id => {
    const nd = nodeOf(id);
    if (!nd) return '';
    const ok = (typeof nodeUnlocked === 'function') ? nodeUnlocked(nd) : true;
    const rg = regionOf(id);
    const why = ok ? '' : ((typeof nodeLockReason === 'function') ? nodeLockReason(nd) : '未解锁');
    return `<div class="cx-src ${ok?'ok':''}"${ok ? ` onclick="UI.selRegion='${rg?rg.regionId:''}';UI.selNode='${id}';UI.switchTab('yudi');UI.closeModal()"` : ` title="${esc(why)}"`}>
      <span class="cx-src-n">${esc(nd.name)}</span>
      <span class="cx-src-t">${ok ? '可往' : esc(why)}</span>
    </div>`;
  }).filter(Boolean);
  if (!rows.length) return '';
  // 产地太多时只列前 12 处，其余给个总数——「金」有 42 处，铺开就没法看了
  const SHOWN = 12;
  const shown = rows.slice(0, SHOWN);
  const more = rows.length - shown.length;
  return `<div class="cx-srcs">
    <b>产地 ${rows.length} 处</b>
    ${shown.join('')}
    ${more > 0 ? `<div class="hint">…另有 ${more} 处</div>` : ''}
  </div>`;
}
function showCodexDetail(id){
  const e = CODEX[id];
  if (!e) return;
  const rec = Game.records[id]||{count:0,tier:0};
  const rows = e.reveals.map((txt,i)=>{
    const locked = i > rec.tier;
    return `<div class="reveal ${locked?'locked':''}"><b>${TUNING.MASTERY.NAMES[i]}</b>${locked?'<span class="lock-tag">未揭示</span>':esc(txt||'（无）')}</div>`;
  }).join('');
  const cn = codexNode(e);
  const cnLabel = e.cat === '异兽' ? '前往讨伐节点' : (e.cat === '山川' ? '前往此山' : '前往产出节点');
  const cnBtn = cn ? `<button class="btn on" onclick="UI.selRegion='${cn.regionId}';UI.selNode='${cn.nodeId}';UI.switchTab('yudi');UI.closeModal()">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${cnLabel}</button>` : '';
  // 异兽 / 神祇详情：绘形大像置顶（未著录也画——详情本就是「书中先有其名」）
  const icHtml = (typeof beastIcon === 'function' && (e.cat === '异兽' || e.cat === '神祇'))
    ? `<div class="cd-ic">${beastIcon(e.id)}</div>` : '';
  UI.modal(`<h3>${esc(e.name)} <span class="tier">${esc(e.cat)}</span></h3>
    ${icHtml}
    <div class="meta">著录 ${rec.count} 次 · ${rec.count>0?TUNING.MASTERY.NAMES[rec.tier]:'未见'}</div>
    ${rows}
    ${codexSourceListHtml(e)}
    ${e.source?`<div class="source">${esc(e.source)}</div>`:''}
    <div class="modal-btns">${cnBtn}<button class="btn" onclick="UI.closeModal()">闭</button></div>`);
}
window.showCodexDetail = showCodexDetail;

