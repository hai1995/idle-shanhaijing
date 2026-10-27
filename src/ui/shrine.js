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
