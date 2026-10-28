// ===== ui/pack.js — 行装（装备 / 行囊清单 / 清整） =====
// v1.31.118：队列拆去 ui/queue.js，物品详情拆去 ui/item.js——本文件只留「背包本体」。

// ================= 行装 =================
// 一键最优装：换上行囊中同槽位最强的一件（按装备评分比较，等级不足者不换）
UI.autoEquipBest = function(){
  if (typeof equipBest !== 'function'){ this.toast('装备功能未就绪'); return; }
  let changes = [];
  try { changes = equipBest() || []; } catch(e){ this.toast('一键最优装失败：' + e.message); return; }
  this.toast(changes.length ? ('已换上最优装：' + changes.join('；')) : '行囊中暂无更优的装备');
  this.renderPack();
};
// 行囊清单：搜索与排序共用这一个生成器。整页渲染和「边打字边筛」都走它，
// 两处各写一遍迟早会长歪（一边认别名一边不认）。
const PACK_PAGE = 60;
// 展开更多：只重画清单本身（顶部的筛选、检索框、清整区都不动）
UI.packMore = function(){
  UI.packLimit = (UI.packLimit | 0) + 120;
  this.patchPackList();
};

UI.packListHtml = function(){
  const q = String(this.packQuery || '').trim().toLowerCase();
  // 装备按「件」存（每件自带淬炼档），材料按 id 计数——所以先摊成统一的 row 再排、再渲染。
  // 这样「+2 的木戈 ×1」与「木戈 ×19」是两行，不会再被并成「×20、+0」。
  let rows = Object.entries(Game.inventory)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, enh: null, qty: n }));
  for (const id of [...new Set((Game.packGear || []).map(g => g.id))]){
    for (const st of (typeof gearStacks === 'function' ? gearStacks(id) : [])) rows.push({ id, enh: st.enh, qty: st.qty });
  }
  // 类别筛选：材料 / 装备 / 药食 / 系产。行囊常年两三百格，
  // 找一株药要往下翻很久——按类别一收，通常只剩十来个。
  const pf = this.packFilter || 'all';
  if (pf !== 'all'){
    rows = rows.filter(({ id }) => {
      const it = Items[id] || {};
      if (pf === 'gear') return !!it.equip;
      if (pf === 'food') return it.equip ? false : (it.type === 'potion' || it.type === 'food');
      if (pf === 'sp'){
        const idx = (typeof pilgrimGiftIndex === 'function') ? pilgrimGiftIndex() : null;
        return !!(idx && idx.get(id));
      }
      // 材料：既不是装备也不是药食
      return !it.equip && it.type !== 'potion' && it.type !== 'food';
    });
  }
  if (q){
    rows = rows.filter(({ id }) => {
      const it = Items[id] || {};
      return String(it.name || id).toLowerCase().includes(q)
        || String(it.py || '').toLowerCase().includes(q)
        || String(id).toLowerCase().includes(q);
    });
  }
  rows.sort((a, b) => {
    if (this.invSort === 'value') return (Items[b.id].value || 0) - (Items[a.id].value || 0);
    if (this.invSort === 'qty') return b.qty - a.qty;
    return 0;
  });
  if (!rows.length) return q ? '<div class="hint">行囊里没有对上的物件</div>' : '<div class="hint">行囊空空</div>';
  // 一屏画多少格：全量（六百多件）在手机上要 260ms 才切得过来，而真正在看的
  // 永远是最上面那几行。先给 60 格，底下放一颗「还有 N 件」——与图鉴同一套做法。
  const total = rows.length;
  const lim = Math.max(PACK_PAGE, this.packLimit | 0);
  const shownRows = rows.slice(0, lim);
  const more = total > shownRows.length
    ? `<button class="btn pack-more" type="button" onclick="UI.packMore()">还有 ${total - shownRows.length} 件 · 展开</button>`
    : '';
  return shownRows.map(({ id, enh, qty }) => {
    const it = Items[id] || {};
    const enhTag = (enh != null && enh > 0) ? `<span class="ic-enh" title="淬炼 +${enh}">+${enh}</span>` : '';
    // 「比身上强」角标：不标的话，玩家得逐件点开看详情里的对比才知道该换哪件。
    // 只在确实更强时出现（持平或更差都不标），否则满屏都是箭头反而没信息。
    let upTag = '';
    if (it.equip && typeof gearPower === 'function' && typeof equipSlotOf === 'function'){
      const slot = equipSlotOf(it);
      const cur = slot ? Game.gear[slot] : null;
      const inst = Object.assign({}, it, { enh: (enh | 0) });
      if (!cur || gearPower(inst) > gearPower(cur)){
        upTag = `<span class="ic-up" title="优于身上的${cur ? '「' + esc(cur.name || '') + '」' : '空槽'}">▲</span>`;
      }
    }
    const enhArg = (enh != null) ? `,'',${enh}` : '';
    return `<div class="inv-card ${rarityClass(it)}${(enh|0) > 0 ? ' enhanced' : ''}" onclick="showItemDetail('${id}'${enhArg})">
      <span class="ic-icon">${typeof itemIc==='function'?itemIc(id,20):(it.icon||'⬜')}</span>
      <span class="ic-name">${nameTag(it.name || id, it.py)}${enhTag}${upTag}${it.equip?gradeBadge(it):''}</span>
      <span class="ic-qty">×${qty}</span>
      <span class="ic-val">${(it.value||0)*qty} 贝</span>
    </div>`;
  }).join('') + more;
};
// 只换清单本身：输入框不重建，光标和焦点才留得住
UI.patchPackList = function(){
  const g = $('invGrid');
  if (!g){ this.renderPack(); return; }
  g.innerHTML = this.packListHtml();
};

UI.renderPack = function(){
  const box = $('content');
  if (!box) return;
  this.packLimit = 0;          // 换页/换筛选/换排序都从第一屏开始
  const allSlots = Object.keys(GearSlotLabels);
  // 次要槽（斧 / 镐 / 网 / 矢）平时用不上，全空时收成一格。
  // 手机上一屏本就窄，七格空槽排三行，把「装备在上」省下的位置又吃回去了。
  const MINOR = ['axe','pick','net','quiver'];
  const minorFilled = MINOR.filter(s => Game.gear[s]);
  const minorEmpty = MINOR.filter(s => !Game.gear[s]);
  const showMinor = UI.gearMinorOpen || minorFilled.length > 0 || minorEmpty.length === 0;
  const slots = allSlots.filter(s => MINOR.indexOf(s) < 0 || showMinor);
  let html = `<div class="pack-wrap">
    <div class="panel gear-panel">
      <h3 data-tip data-tip-title="装备 · 行装" data-wiki="mechanic:pack">装备<button class="btn small gear-best" type="button" onclick="event.stopPropagation();UI.autoEquipBest()">一键最优装</button>
        <span class="tip-body hidden">装备分兵器、护甲、玉符诸槽，斧镐网矢等工具槽平时收拢一格；两件同名装备各有各的淬炼档；「一键最优装」按装备评分换上同槽最强。</span></h3>
      <div class="tile-grid gear-grid">
      ${slots.map(slot=>{
        const g = Game.gear[slot];
        return `<div class="tile gear-tile ${g?'':'empty'} ${g?rarityClass(g):''}"
             ${g?`title="${esc(g.name)} · ${esc(gearSubText(g))}" onclick="showItemDetail('${g.id}','${slot}')"`:`title="${GearSlotLabels[slot]}·空"`}>
          <span class="gt-label">${GearSlotLabels[slot]}</span>
          ${g?`<span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(g.id||g):g.icon}</span>
               <span class="tile-nm">${esc(g.name)}</span>
               ${gradeBadge(g)}${(typeof enhanceLevel==='function'&&enhanceLevel(g)>0)?`<span class="gt-enh">+${enhanceLevel(g)}</span>`:''}
               <button class="tile-more" type="button" title="卸下" onclick="event.stopPropagation();unequip('${slot}',false);UI.renderPack()">脱</button>`
             :`<span class="gt-empty">空</span>`}
        </div>`;
      }).join('')}
      ${(!showMinor && minorEmpty.length) ? `<div class="tile gear-tile empty gear-minor" role="button" tabindex="0"
         title="斧 / 镐 / 网 / 矢：采伐与射猎之用"
         onclick="UI.gearMinorOpen=true;UI.renderPack()">
        <span class="gt-label">工具</span>
        <span class="tile-nm">斧镐网矢</span>
        <span class="gt-empty">皆空 · 点开</span>
      </div>` : ''}
      </div>
      ${(() => {
        // 装备概况：右栏槽位下方常空，把「身上这套」的合计摊出来——
        // 伤害/防御按淬炼档折算（与详情页同一口径），淬炼合计一眼看得出养没养装备。
        const worn = allSlots.map(s => Game.gear[s]).filter(Boolean);
        if (!worn.length) return '';
        const lvOf = g => (typeof enhanceLevel === 'function') ? (enhanceLevel(g) || 0) : 0;
        const dmgSum = worn.reduce((a, g) => a + (g.dmg ? Math.floor((typeof enhanceScaled === 'function' ? enhanceScaled(g.dmg, lvOf(g)) : g.dmg)) : 0), 0);
        const defSum = worn.reduce((a, g) => a + (g.def ? Math.floor((typeof enhanceScaled === 'function' ? enhanceScaled(g.def, lvOf(g)) : g.def)) : 0), 0);
        const enhSum = worn.reduce((a, g) => a + lvOf(g), 0);
        const grN = {};
        worn.forEach(g => { const n = (typeof gearGrade === 'function') ? gearGrade(g).name : '?'; grN[n] = (grN[n] || 0) + 1; });
        const gradeTxt = Object.keys(grN).map(n => n + '×' + grN[n]).join(' · ');
        return `<div class="gear-brief">
          <div class="gb-row"><span>已装</span><b>${worn.length}/${allSlots.length} 槽</b></div>
          <div class="gb-row"><span>伤害合计</span><b>${dmgSum}</b></div>
          <div class="gb-row"><span>防御合计</span><b>${defSum}</b></div>
          <div class="gb-row"><span>淬炼合计</span><b>+${enhSum}</b></div>
          ${gradeTxt ? `<div class="gb-row"><span>品阶</span><b>${gradeTxt}</b></div>` : ''}
        </div>`;
      })()}
    </div>
    <div class="panel inv-panel">
      <h3>行囊</h3>
      <div class="filter-row">
        ${[['all','全部'],['mat','材料'],['gear','装备'],['food','药食'],['sp','系产']].map(([k,lab])=>
          `<button class="chip-btn ${(this.packFilter||'all')===k?'on':''}" onclick="UI.packFilter='${k}';UI.patchPackList()">${lab}</button>`).join('')}
      </div>
      <div class="filter-row">
        <button class="chip-btn ${this.invSort==='default'?'on':''}" onclick="UI.invSort='default';UI.renderPack()">默认</button>
        <button class="chip-btn ${this.invSort==='value'?'on':''}" onclick="UI.invSort='value';UI.renderPack()">价值↓</button>
        <button class="chip-btn ${this.invSort==='qty'?'on':''}" onclick="UI.invSort='qty';UI.renderPack()">数量↓</button>
        <label class="search-box" title="按名称 / 注音检索行囊">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
          <input id="packQ" type="search" placeholder="检索名 / 注音" value="${esc(this.packQuery||'')}"
            oninput="UI.packQuery=this.value;UI.packLimit=0;UI.patchPackList()"
            onkeydown="if(event.key==='Escape'){this.value='';UI.packQuery='';UI.packLimit=0;UI.patchPackList()}">
        </label>
      </div>
      <details class="bulk-sell">
        <summary class="bs-sum">廛市清整<i>批量售出原材料</i></summary>
        <div class="bs-head">
          <span class="hint">售出<b>档位及以下</b>的原材料；食物 / 药品 / 装备 / 嘉种 / 嘉谷不碰</span>
        </div>
        <div class="filter-row">
          ${SELL_RARITY_ORDER.slice(0,4).map(r=>`<button class="chip-btn ${this.packSellTier===r?'on':''}" onclick="UI.packSellTier='${r}';UI.renderPack()">${rarityName({rarity:r})}</button>`).join('')}
        </div>
        ${(()=>{
          const p = bulkSellPreview(this.packSellTier||'COMMON');
          if (!p.rows.length) return '<div class="hint">当前档位下没有可清的原材料</div>';
          const top = p.rows.slice(0,4).map(r=>`${typeof itemIc==='function'?itemIc(r.id,13):r.icon}${esc(r.name)}×${r.qty}`).join('　');
          const more = p.rows.length>4 ? `　等 ${p.rows.length} 种` : '';
          return `<div class="bs-preview">${top}${more}</div>
            <div class="bs-act">
              <span class="bs-total">共 <b>${p.count}</b> 件 · 约得 <b class="zhu-num">${fmt(p.total)}</b> 贝</span>
              <button class="btn primary" onclick="bulkSellRun()">清整售出</button>
            </div>`;
        })()}
      </details>
      <div class="inv-grid" id="invGrid">${this.packListHtml()}</div>
    </div>
  </div>`;
  box.innerHTML = html;
};
// 廛市清整：确认后按当前阈值批量售出（modal 二次确认，防误触）
function bulkSellRun(){
  const tier = UI.packSellTier || 'COMMON';
  const p = bulkSellPreview(tier);
  if (!p.rows.length){ UI.toast('没有可清的原材料'); return; }
  const top = p.rows.slice(0,5).map(r=>`${typeof itemIc==='function'?itemIc(r.id,13):r.icon}${esc(r.name)}×${r.qty}`).join('　');
  const more = p.rows.length>5 ? `　等 ${p.rows.length} 种` : '';
  UI.modal(`
    <h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('scale',17):'⚖️'}</span> 廛市清整</h3>
    <p class="hint">将以「${rarityName({rarity:tier})}」及以下的价格，售出行囊中的原材料。食物 / 药品 / 装备 / 嘉种 / 嘉谷不在其列。</p>
    <div class="panel" style="margin:10px 0"><div class="yield-row"><b>所售</b>${top}${more}</div></div>
    <div class="form-row"><span>件数</span><b>${p.count}</b></div>
    <div class="form-row"><span>约得贝币</span><b style="color:var(--gamboge)">+${fmt(p.total)}</b></div>
    <div class="modal-btns">
      <button class="btn" onclick="UI.closeModal()">再想想</button>
      <button class="btn primary" onclick="UI.closeModal();bulkSellCommit()">确认售出</button>
    </div>
  `);
}
function bulkSellCommit(){
  const r = bulkSell(UI.packSellTier || 'COMMON');
  if (r.gain > 0){
    UI.toast(`⚖️ 清整 ${r.count} 件，得贝 ${fmt(r.gain)}`);
    log(`⚖️ 廛市清整 ${r.count} 件，得贝 ${fmt(r.gain)}`, 'gold', 'trade');
  }
  UI.renderPack();
}
function gearSubText(g){
  const parts = [];
  if (g.equip && typeof gearGrade === 'function'){
    const gr = gearGrade(g);
    const cap = (typeof enhanceCapOf === 'function') ? enhanceCapOf(g) : 0;
    parts.push(`${gr.name}品${cap ? ` · 上限 +${cap}` : ''}`);
  }
  const lv = (typeof enhanceLevel === 'function') ? enhanceLevel(g) : 0;
  const sc = v => Math.floor((typeof enhanceScaled === 'function') ? enhanceScaled(v, lv) : v);
  if (g.dmg) parts.push(`伤害 ${sc(g.dmg)}${lv?`（+${lv}）`:''}`);
  if (g.def) parts.push(`防御 ${sc(g.def)}${lv?`（+${lv}）`:''}`);
  if (g.axePower) parts.push(`斧力 ${g.axePower}`);
  if (g.pickPower) parts.push(`镐力 ${g.pickPower}`);
  if (g.netPower) parts.push(`网力 ${g.netPower}`);
  if (g.el) parts.push(g.el+'属');
  if (g.effect) parts.push(g.effect);
  return parts.join(' · ');
}
