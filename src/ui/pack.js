// ===== ui/pack.js — 行动（巡历队列）与行装（装备 / 行囊 / 物品详情） =====
// 由 src/ui.js 拆分而来（v1.31.8）。加载顺序见 index.html：core 必须最先（UI 对象在这里定义），
// 其余按页顺序；跨文件调用的函数与常量都在全局词法环境里，运行时才求值，先后不影响调用。

// ================= 行动（巡历队列） =================
UI.renderQueue = function(){
  const box = $('content');
  if (!box) return;
  const kindDef = ActionKinds[this.queueKind];
  const targets = actionTargets(this.queueKind);
  const fb = Game.fallback;
  let html = `<div class="queue-wrap">
    <div class="panel queue-list">
      <h3>巡历队列（${Game.queue.length}/${QUEUE_MAX}）${Game.queue.length?` · 预计一轮 ≈ ${fmtTime(estimateQueueSeconds())}`:''}</h3>
      ${Game.queue.map((e,i)=>{
        const st = entryCanRun(e);
        // 条目前的小像：讨伐取目标异兽像，采集 / 制作取该行动的技艺像，一眼认得出在做什么
        const qiIc = (e.kind === 'taofa' && typeof beastIcon === 'function')
          ? `<span class="qi-ic">${beastIcon({ id:e.target })}</span>`
          : (typeof skillIcon === 'function' && entryDef(e) && entryDef(e).skill
            ? `<span class="qi-ic">${skillIcon(entryDef(e).skill, 18)}</span>` : '');
        return `<div class="queue-item ${Game.queueIdx===i&&Game.queueRunning?'cur':''} ${st.ok?'':'blocked'}">
          <span class="qi-idx">${i+1}</span>
          <span class="qi-name">${qiIc}${esc(entryLabel(e))}</span>
          <span class="qi-meta">
            <span class="qi-prog">${esc(entryProgressText(e))}</span>
            <span class="qi-eta">约 ${fmtTime(estimateEntrySeconds(e))}</span>
            ${!st.ok?`<span class="qi-reason">${esc(st.reason)}</span>`:''}
          </span>
          <span class="qi-btns">
            <button class="btn tiny" onclick="moveQueueEntry('${e.id}',-1);UI.renderQueue()">↑</button>
            <button class="btn tiny" onclick="moveQueueEntry('${e.id}',1);UI.renderQueue()">↓</button>
            <button class="btn tiny" onclick="removeQueueEntry('${e.id}');UI.renderQueue()">✕</button>
          </span>
        </div>`;
      }).join('') || `<div class="hint">队列为空。不知从何开始？点「快速挂机」按当前可达成目标自动排好巡历队列。</div>`}
      <div class="queue-ctrl">
        <button class="btn ${Game.queueRunning?'':'primary'}" onclick="toggleQueue();UI.renderQueue()">${Game.queueRunning?'暂停':'启动'}</button>
        <button class="btn" onclick="quickIdlePreset()" title="按当前可达成目标自动排好巡历队列并启动">${typeof markIcon==='function'?markIcon('bolt',15):'⚡'} 快速挂机</button>
        <label><input type="checkbox" ${Game.queueLoop?'checked':''} onchange="Game.queueLoop=this.checked;saveGame()"> 循环</label>
        <button class="btn" onclick="clearQueue();UI.renderQueue()">清空</button>
        <span class="hint">已完成 ${Game.queueRound} 轮</span>
      </div>
      <div class="fallback-box">
        <h4>兜底动作</h4>
        <div class="filter-row">
          ${Object.entries(ActionKinds).map(([k,d])=>
            `<button class="chip-btn ${fb&&fb.kind===k?'on':''}" onclick="setFallback('${k}',(actionTargets('${k}')[0]||{}).id||'',1);UI.renderQueue()">${typeof skillIcon==='function'?skillIcon(d.skill,15):d.icon} ${d.label}</button>`).join('')}
          <button class="chip-btn ${fb&&fb.kind==='idle'?'on':''}" onclick="setFallback('idle','',1);UI.renderQueue()">空闲</button>
        </div>
        ${fb&&fb.kind!=='idle'?`<div class="hint">当前兜底：${esc(entryLabel({kind:fb.kind,target:fb.target}))} ×${fb.qty}</div>`:''}
      </div>
      <div class="offline-line">${typeof markIcon==='function'?markIcon('moon',13):'🌙'} 离线：上限 <b>${offlineCapHours()}h</b> · 效率 <b>×${offlineEff().toFixed(2)}</b>${Game.queue.length?` · 当前队列将计入离线结算`:''}${(function(){ const p = estimateOfflineGains(); if (!p || p.xp<=0) return ''; const ks = Object.keys(p.items); const it = ks.length?`、+${fmt(p.items[ks[0]])} ${esc((Items[ks[0]]||{}).name||ks[0])}`:''; return ` · 挂满约 +${fmt(p.xp)} 经验${it}`; })()}</div>
    </div>
    <div class="panel queue-add">
      <h3>添加任务</h3>
      <div class="form-row"><span>行动</span>
        <select onchange="UI.queueKind=this.value;UI.renderQueue()">
          ${Object.entries(ActionKinds).map(([k,d])=>`<option value="${k}" ${this.queueKind===k?'selected':''}>${d.label}</option>`).join('')}
        </select></div>
      <div class="form-row"><span>目标</span>
        <select id="queueTarget">
          ${targets.map(t=>`<option value="${t.id}">${esc(t.name)}（${t.lvl}）</option>`).join('')}
        </select></div>
      <div class="form-row"><span>数量</span><input id="queueQty" type="number" value="10" min="1"></div>
      <button class="btn primary" onclick="addQueueTask()">加入队列</button>
      <div class="hint">采集类按产出个数计数，制作类按次数计数，讨伐按次数计数。</div>
    </div>
  </div>`;
  box.innerHTML = html;
};
// 巡历队列就地补绘：进度计数 / 当前标记 / 阻塞原因 / 完成轮数。
// 队列在跑时每秒（以及每次动作完成时）调用，只改文本与 class，
// 不重建 DOM——保滚动位置、保「添加任务」表单的填写状态。
UI.patchQueueProgress = function(){
  if (this.currentTab !== 'queue') return;
  const box = $('content');
  if (!box) return;
  const items = box.querySelectorAll('.queue-item');
  Game.queue.forEach((e, i)=>{
    const el = items[i];
    if (!el) return;
    const st = entryCanRun(e);
    const prog = el.querySelector('.qi-prog');
    const txt = entryProgressText(e);
    if (prog && prog.textContent !== txt) prog.textContent = txt;
    el.classList.toggle('cur', Game.queueIdx === i && Game.queueRunning);
    el.classList.toggle('blocked', !st.ok);
    let reason = el.querySelector('.qi-reason');
    const meta = el.querySelector('.qi-meta') || el;
    if (!st.ok){
      if (!reason){
        reason = document.createElement('span');
        reason.className = 'qi-reason';
        meta.appendChild(reason);
      }
      if (reason.textContent !== st.reason) reason.textContent = st.reason;
    } else if (reason){
      reason.remove();
    }
  });
  const hint = box.querySelector('.queue-ctrl .hint');
  if (hint){
    const t = `已完成 ${Game.queueRound} 轮`;
    if (hint.textContent !== t) hint.textContent = t;
  }
};
function addQueueTask(){
  const target = $('queueTarget') ? $('queueTarget').value : '';
  const qty = $('queueQty') ? parseInt($('queueQty').value)||10 : 10;
  if (!target){ UI.toast('请选择目标'); return; }
  addQueueEntry(UI.queueKind, target, qty);
  UI.renderQueue();
}
window.addQueueTask = addQueueTask;

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
  return rows.map(({ id, enh, qty }) => {
    const it = Items[id] || {};
    const enhTag = (enh != null && enh > 0) ? `<span class="ic-enh" title="淬炼 +${enh}">+${enh}</span>` : '';
    const enhArg = (enh != null) ? `,'',${enh}` : '';
    return `<div class="inv-card ${rarityClass(it)}${(enh|0) > 0 ? ' enhanced' : ''}" onclick="showItemDetail('${id}'${enhArg})">
      <span class="ic-icon">${typeof itemIc==='function'?itemIc(id,20):(it.icon||'⬜')}</span>
      <span class="ic-name">${nameTag(it.name || id, it.py)}${enhTag}${it.equip?gradeBadge(it):''}</span>
      <span class="ic-qty">×${qty}</span>
      <span class="ic-val">${(it.value||0)*qty} 贝</span>
    </div>`;
  }).join('');
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
      <h3>装备<button class="btn small gear-best" type="button" onclick="UI.autoEquipBest()">一键最优装</button></h3>
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
    </div>
    <div class="panel inv-panel">
      <h3>行囊</h3>
      <div class="filter-row">
        <button class="chip-btn ${this.invSort==='default'?'on':''}" onclick="UI.invSort='default';UI.renderPack()">默认</button>
        <button class="chip-btn ${this.invSort==='value'?'on':''}" onclick="UI.invSort='value';UI.renderPack()">价值↓</button>
        <button class="chip-btn ${this.invSort==='qty'?'on':''}" onclick="UI.invSort='qty';UI.renderPack()">数量↓</button>
        <label class="search-box" title="按名称 / 注音检索行囊">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
          <input id="packQ" type="search" placeholder="检索名 / 注音" value="${esc(this.packQuery||'')}"
            oninput="UI.packQuery=this.value;UI.patchPackList()"
            onkeydown="if(event.key==='Escape'){this.value='';UI.packQuery='';UI.patchPackList()}">
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
// 「这东西有什么用」——671 件物品里有 514 件不参与任何配方，玩家点开只见出处，
// 采完之后不知道该留着还是卖掉。这里把用途一次说清：哪些配方拿它当料、
// 是否祠礼祭品、能否作种，若一无所用则直说「暂无合用之方」并给出回收价。
const RECIPE_KIND = { burn:'燔燎', cook:'调鼎', smith:'锻冶', fletch:'制箭', craft:'制作', jade:'琢玉', herb:'合药', rite:'祠礼' };
function itemUses(id){
  const out = [];
  const seen = {};
  for (const r of Recipes){
    if (!Array.isArray(r.cost)) continue;
    if (!r.cost.some(c => c && c[0] === id)) continue;
    const kind = RECIPE_KIND[r.type] || '制作';
    const name = (Items[r.out] || {}).name || r.out;
    const key = kind + '/' + name;
    if (seen[key]) continue;
    seen[key] = 1;
    out.push({ kind, name, rite: r.type === 'rite' });
  }
  return out;
}

// 「这东西从哪来」——与 itemUses 正好相反的一问。行祭、制作、淬炼时常缺某样材料，
// 只说「缺 牛 0/1」等于把找料的活儿丢回给玩家；这里把产地、掉落、墟市价一次报清。
function itemSources(id){
  const it = Items[id] || {};
  const out = [];
  const nodes = it.nodes || (it.node ? [it.node] : []);
  if (it.skill && nodes.length){
    const names = nodes.map(n => (nodeOf(n) || {}).name).filter(Boolean);
    out.push({ kind:(Skills[it.skill] || {}).name || '采集', lvl: it.lvl || 1,
      where: names.slice(0, 2).join('、') + (names.length > 2 ? ` 等 ${names.length} 山` : '') });
  }
  for (const r of Recipes){
    if (r.out !== id || !Array.isArray(r.cost)) continue;
    const mats = r.cost.map(([iid, q]) => `${(Items[iid] || {}).name || iid}×${q}`).join('、');
    out.push({ kind: RECIPE_KIND[r.type] || '制作', lvl: r.lvl || 1,
      where:`需 ${r.lvl || 1} 级 · ${mats}` });
    break;
  }
  // 同名异兽散在各山（㸲牛一类的写法在原文里遍地都是），按名去重再计数
  const drops = [];
  const seenDrop = {};
  let dropLvl = Infinity;      // 界面会拼「讨伐 Lv${lvl}」，不填就是 Lvundefined
  for (const m of Object.values(typeof Monsters !== 'undefined' ? Monsters : {})){
    // BOSS 走单值 drop，小妖走 loot 表；两者都要看（m.loot 可能是空数组，别被真值骗了）
    const loot = (Array.isArray(m.loot) && m.loot.length) ? m.loot : [];
    const l = loot.length ? loot : (m.drop ? [[m.drop, 1, 1]] : []);
    if (!Array.isArray(l) || !l.some(x => Array.isArray(x) && x[0] === id)) continue;
    if (!m.name || seenDrop[m.name]) continue;
    seenDrop[m.name] = 1;
    drops.push(m.name);
    if (m.needLvl) dropLvl = Math.min(dropLvl, m.needLvl);
  }
  if (drops.length) out.push({ kind:'讨伐', lvl: dropLvl === Infinity ? 1 : dropLvl,
    where: drops.slice(0, 3).join('、') + (drops.length > 3 ? ` 等 ${drops.length} 种` : '') });
  // 神兵：只在 BOSS 的 divine 字段上，普通掉落表里没有
  for (const mb of Object.values(typeof Monsters !== 'undefined' ? Monsters : {})){
    if (mb.divine !== id) continue;
    const pct = Math.round((typeof DIVINE_DROP === 'number' ? DIVINE_DROP : 0.06) * 100);
    out.push({ kind:'神兵', where:`讨伐 ${mb.name}（${pct}% 掉落）` });
    break;
  }
  for (const s of (typeof ShopStock !== 'undefined' ? ShopStock : [])){
    if (s.itemId !== id) continue;
    out.push({ kind:'墟市', lvl: s.lvl || 1, where:`${s.cost} 贝 / ${s.qty} 件（需 ${s.lvl || 1} 级）` });
    break;
  }
  // 观瑞：丹穴初见得凤皇羽一类，来源写在 OBSERVE_SITES.reward 上
  for (const o of Object.values(typeof OBSERVE_SITES !== 'undefined' ? OBSERVE_SITES : {})){
    if (o.reward !== id) continue;
    out.push({ kind:'观瑞', where:`${o.name}（初见得一）` });
    break;
  }
  // 谒见：神祇不讨伐，其「遗物」唯谒见可得（如刚山神的神𩲜之足）
  for (const site of Object.values(typeof AUDIENCE_SITES !== 'undefined' ? AUDIENCE_SITES : {})){
    // v1.31.23：一神可赐多物，按 gifts 找（旧档/旧数据只有 gift 的也认）
    const d = (site.deities || []).find(x => (Array.isArray(x.gifts) && x.gifts.indexOf(id) >= 0) || x.gift === id);
    if (!d) continue;
    out.push({ kind:'谒见', where:`${d.name}（初谒得赐）` });
    break;
  }
  // 养成点：丹木、器酸一类三五年一熟的奇产，既非采集也非掉落
  for (const g of Object.values(typeof GROW_SITES !== 'undefined' ? GROW_SITES : {})){
    if (!g.reward || !g.reward[id]) continue;
    const hrs = Math.round((g.sec || 3600) * (g.stages || 1) / 3600 * 10) / 10;
    out.push({ kind:'养成', where:`${g.name}（${hrs} 小时一成）` });
    break;
  }
  // 作物：没有产地也没有配方，但种得出来——不反查种子就只剩「回收 4 贝」一条
  const seed = Object.values(Items).find(x => x.crop === id);
  if (seed) out.push({ kind:'圃艺', where:`植 ${seed.name}（${seed.grow || 10} 秒熟）` });
  if (it.crop) out.push({ kind:'圃艺', where:`作种可得 ${(Items[it.crop] || {}).name || ''}`.trim() });
  if (it.value) out.push({ kind:'回收', where:`${sellValue(id, 1)} 贝 / 件` });
  return out;
}

// 淬炼面板：等级、成功率、材料、失败代价、一键强化。
// 独立成块是为了「就地刷新」——强一次关一次窗，连点三下要开三次，太笨。
// target 可以是行囊里的 itemId，也可以是装备槽里的实例（v1.31.13）——
// 两件同名装备各有各的淬炼等级，详情页展示与操作的都是「你正在看的这一件」。
function enhancePanelHtml(target, it){
  const base = it.dmg || it.def || 0;
  if (!it.equip || !base) return '';
  const itemId = (typeof enhTargetId === 'function') ? enhTargetId(target) : target;
  const lv = enhanceLevel(target);
  const max = (typeof enhanceCapOf === 'function' && typeof gearGrade === 'function')
    ? enhanceCapOf(it) : ENHANCE_MAX;
  const cur = Math.floor(enhanceScaled(base, lv));
  const label = it.dmg ? '伤害' : '防御';
  const heat = (typeof enhanceHeatOf === 'function') ? enhanceHeatOf(itemId) : 0;   // 火候按「这一炉」记，同 id 共享
  const heatMax = (typeof ENHANCE_HEAT !== 'undefined') ? ENHANCE_HEAT.MAX : 12;
  const heatStep = (typeof ENHANCE_HEAT !== 'undefined') ? ENHANCE_HEAT.STEP : 0.08;
  if (lv >= max){
    return `<div class="reveal"><b>淬炼</b><span class="enh-max">已至 +${max}（上限）· ${label} ${cur}</span></div>`;
  }
  const cost = enhanceCost(target);
  const baseRate = enhanceRate(lv);
  const rate = Math.round((typeof enhanceRateFor === 'function' ? enhanceRateFor(target) : baseRate) * 100);
  const nxt = Math.floor(enhanceScaled(base, lv + 1));
  const safe = lv < ENHANCE_SAFE;
  const stones = Game.inventory.zhenwu || 0;
  const last = (UI._enhLast && UI._enhLast.id === itemId) ? UI._enhLast : null;
  const cls = rate >= 50 ? 'ok' : rate >= 20 ? 'mid' : 'hard';
  // 火候：十二格炉温。毁一次添一格，成了也不熄——这是「一败俱毁」的补偿，
  // 不写明的话玩家只会觉得这系统在坑他。
  const cells = Array.from({ length: heatMax }, (_, i) =>
    `<i class="${i < heat ? 'on' : ''}"></i>`).join('');
  const heatTip = heat
    ? `火候 +${Math.round(heat * heatStep * 100)}%（基础 ${Math.round(baseRate*100)}% → 实成 ${rate}%）`
    : `火候未起：每毁一次添一格，每格 +${Math.round(heatStep*100)}%`;
  return `<div class="reveal enh-box">
    <b>淬炼</b>
    <div class="enh-hd">
      <span class="enh-lv">+${lv}<i> / ${max}</i></span>
      <span class="enh-rate ${cls}">成功率 ${rate}%</span>
      <span class="enh-grade" title="${esc(gearGrade(it).desc)} · 上限 +${max}">${gearGrade(it).name}品</span>
      ${last ? `<span class="enh-log ${last.cls}">${esc(last.text)}</span>` : ''}
    </div>
    <div class="enh-val">${label} <b>${cur}</b> → <b>${nxt}</b>
      <span class="hint ${safe ? '' : 'danger'}">${safe ? `未至 +${ENHANCE_SAFE}，失败只损材料` : '失败阶数尽毁，直落 +0（镇物可护）'}</span></div>
    <div class="enh-heat" title="${esc(heatTip)}">
      <span class="hlabel">火候</span><span class="hcells">${cells}</span>
      <span class="htxt">${heat ? `+${Math.round(heat*heatStep*100)}%` : '—'}</span>
    </div>
    <div class="enh-cost">炭 ×${cost.tan} · ${fmt(cost.shells)} 贝${safe ? '' : `　·　镇物 ×1（有 ${stones}）`}</div>
    <div class="enh-btns">
      <button class="btn small primary" onclick="UI.enhanceOne()">强化 +1</button>
      <span class="enh-to">
        <input id="enhTarget" type="number" min="${lv + 1}" max="${max}" placeholder="目标等级" inputmode="numeric">
        <button class="btn small" onclick="UI.enhanceTo()">强化至</button>
      </span>
      ${safe ? '' : `<label class="enh-stone"><input type="checkbox" id="enhStone" ${stones ? 'checked' : 'disabled'}> 用镇物</label>`}
    </div>
  </div>`;
}

// 物品详情的内容独立出来：强化 / 重铸执行后就地重绘，不关窗
UI.itemDetailHtml = function(itemId){
  const it = Items[itemId];
  if (!it) return '';
  // 从装备槽点进来时，UI._detailGear 记着是哪个槽——那时「强化」作用于身上这一件，
  // 而不是行囊里同名的另一件。
  const gearInst = (UI._detailGear && Game.gear[UI._detailGear]
    && (Game.gear[UI._detailGear].id || Game.gear[UI._detailGear]) === itemId) ? Game.gear[UI._detailGear] : null;
  // 行囊装备按档看：_detailEnh 指定哪一档，未指定取最高档。qty 是「这一档几件」，
  // bagAll 是「同名共几件」——两者分开，玩家才知道自己卖的是哪一档。
  const stacks = (it.equip && !gearInst && typeof gearStacks === 'function') ? gearStacks(itemId) : [];
  const bagAll = (typeof bagQty === 'function') ? bagQty(itemId) : (Game.inventory[itemId] || 0);
  const enhLv = (it.equip && !gearInst)
    ? (UI._detailEnh != null ? UI._detailEnh : (stacks[0] ? stacks[0].enh : 0))
    : 0;
  const qty = (it.equip && !gearInst)
    ? ((stacks.find(s => s.enh === enhLv) || {}).qty || 0)
    : bagAll;
  // 强化目标：身上那件实例 / 行囊里这一档的第一件实例
  const bagInst = (it.equip && !gearInst)
    ? ((Game.packGear || []).find(g => g.id === itemId && (g.enh | 0) === enhLv) || null)
    : null;
  UI._enhTarget = gearInst || bagInst || (it.equip ? null : itemId);
  const enhShow = gearInst ? (gearInst.enh | 0) : enhLv;
  const rec = Game.records[itemId];
  const actions = [];
  if (it.equip && gearInst){
    actions.push(`<button class="btn" onclick="unequip('${UI._detailGear}',false);UI.closeModal();UI.renderPack()">卸下</button>`);
  } else if (it.equip){
    const lvOk = (it.lvl||1) <= relevantLevel(it);
    const recOk = (typeof reqRecordOk !== 'function') || reqRecordOk(it);
    const ok = lvOk && recOk;
    const why = !lvOk ? `需${requiredSkillName(it)} ${it.lvl}` : (!recOk ? '著录未及' : '');
    actions.push(`<button class="btn ${ok?'primary':''}" ${ok?'':'disabled'} onclick="equipItem('${itemId}',${enhLv});UI.closeModal()">装备${enhLv ? ' +' + enhLv : ''}${ok?'':'（'+why+'）'}</button>`);
  }
  if (it.heal || it.buff) actions.push(`<button class="btn primary" onclick="useConsumable('${itemId}');UI.closeModal()">${it.heal?'食用':'服用'}</button>`);
  // 出售改成「数量可填」的交易区（见下方 tradeBlock），不再放死档位按钮

  const hasAffix = it.equip && typeof affixSlotOf === 'function' && affixSlotOf(it);
  const afList = hasAffix ? affixOf(itemId) : [];
  const afCost = hasAffix ? affixReforgeCost(itemId) : null;
  const afOk = afCost ? ((Game.inventory.tan || 0) >= afCost.tan && Game.shells >= afCost.shells) : false;

  return `<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(itemId,18):it.icon}</span> ${esc(it.name)}${enhShow ? ` <span class="hd-enh">+${enhShow}</span>` : ''} ${it.equip?gradeBadge(it):`<span class="tier">${rarityName(it)}</span>`}</h3>
    <div class="meta">${it.equip
      ? `行囊 ${bagAll} 件${qty ? ` · 本档 ${enhShow ? '+' + enhShow : '+0'} ×${qty}` : ''}`
      : `行囊 ${qty} 件`}${rec?` · 著录 ${rec.count} 次（${TUNING.MASTERY.NAMES[rec.tier]}）`:''}</div>
    ${(it.equip && !gearInst && stacks.length > 1) ? `<div class="reveal"><b>分档</b><span class="use-box">${stacks.map(s =>
      `<button class="btn tiny ${s.enh === enhLv ? 'on' : ''}" type="button" onclick="showItemDetail('${itemId}','',${s.enh})">+${s.enh} ×${s.qty}</button>`).join('')}</span></div>` : ''}
    ${it.form?`<div class="reveal"><b>形态</b>${esc(it.form)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
    ${it.note?`<div class="reveal"><b>出处</b>${esc(it.note)}</div>`:''}
    ${it.equip && typeof gearKindOf === 'function' && gearKindOf(it)
      ? (() => {
          const g = gearGrade(it), r = gearRatio(it);
          const rel = Math.round((r - 1) * 100);
          const cap = (typeof enhanceCapOf === 'function') ? enhanceCapOf(it) : 0;
          return `<div class="reveal"><b>等阶</b>${gradeBadge(it)}
            <span class="gd-desc">${esc(g.desc)}</span>
            <span class="gd-rel ${rel >= 0 ? 'up' : 'down'}">较同级良品 ${rel >= 0 ? '+' : '−'}${Math.abs(rel)}%</span>
            ${cap ? `<span class="gd-cap">可淬 +${cap}</span>` : ''}</div>`;
        })()
      : ''}
    ${it.reqRecord?`<div class="reveal"><b>佩用</b><span class="${(typeof reqRecordOk==='function'&&reqRecordOk(it))?'':'lack-n'}">${esc(typeof reqRecordText==='function'?reqRecordText(it):'')}</span></div>`:''}
    ${(() => {
      const uses = itemUses(itemId);
      const crop = it.crop ? `<span class="use-chip">可作嘉种（收 ${esc((Items[it.crop]||{}).name || it.crop)}）</span>` : '';
      const body = uses.length
        ? uses.slice(0, 10).map(u => `<span class="use-chip ${u.rite ? 'rite' : ''}">${u.kind}·${esc(u.name)}</span>`).join('') + (uses.length > 10 ? `<span class="hint">等 ${uses.length} 处</span>` : '')
        : (crop ? '' : '<span class="hint">暂无合用之方——可售或留作图鉴</span>');
      const price = (typeof sellValue === 'function' && it.value) ? `<span class="hint">回收 ${sellValue(itemId, 1)} 贝 / 件</span>` : '';
      return (body || crop) ? `<div class="reveal"><b>用途</b><span class="use-box">${crop}${body}${price}</span></div>` : '';
    })()}
    ${it.divine && typeof DIVINE_EFFECTS !== 'undefined' && DIVINE_EFFECTS[it.divine]
      ? `<div class="reveal"><b>神兵</b><span class="dv-tag">${esc(DIVINE_EFFECTS[it.divine].label)}</span><span class="dv-text">${esc(DIVINE_EFFECTS[it.divine].text)}</span></div>` : ''}
    ${(UI._enhTarget || !it.equip) ? enhancePanelHtml(UI._enhTarget || itemId, it) : ''}
    ${afList.length?`<div class="reveal"><b>词条</b>${afList.map(x=>`<span class="af-txt"><i>${esc(x.name)}</i>${esc(x.text)}</span>`).join('')}</div>`:''}
    ${afCost?`<div class="reveal"><b>重铸</b><span class="af-recost">换一组词条（炭×${afCost.tan} · ${afCost.shells} 贝）</span>
      <button class="btn small ${afOk?'primary':''}" ${afOk?'':'disabled'} onclick="UI.reforgeNow('${itemId}')">重铸</button></div>`:''}
    ${it.buff?`<div class="reveal"><b>服用</b>${esc(it.buff.name)}（${it.buff.dur}s）</div>`:''}
    ${it.heal?`<div class="reveal"><b>食用</b>回血 ${it.heal}</div>`:''}
    ${(it.value && qty > 0) ? `<div class="reveal trade-block">
      <b>售出${it.equip ? `（行囊 ${enhShow ? '+' + enhShow : '+0'} 这一档）` : ''}</b>
      <div class="qty-line">
        <button class="btn tiny" type="button" title="减一件" onclick="qtyStep('sellQty',-1)">−</button>
        <input id="sellQty" class="qty-input" type="number" inputmode="numeric" min="1" max="${qty}" value="1"
          oninput="syncSell('${itemId}',${it.equip ? enhLv : 'null'})">
        <button class="btn tiny" type="button" title="加一件" onclick="qtyStep('sellQty',1)">＋</button>
        <button class="btn tiny" type="button" onclick="qtySet('sellQty',${qty})">全部</button>
        <button class="btn primary" onclick="sellN('${itemId}',${it.equip ? enhLv : 'null'})">售出</button>
      </div>
      <div class="hint">可得 <b class="qty-gain" id="sellGain">${fmt(sellValue(itemId, 1))} 贝</b> · 单价 ${fmt(sellValue(itemId,1))} 贝 · 持有 ×${qty}</div>
      ${(it.equip && enhShow > 0) ? `<div class="hint danger">⚠ 这一档已淬炼到 +${enhShow}，售出后阶数与投入一并失去</div>` : ''}
      ${gearInst ? '<div class="hint">身上的那一件不受影响</div>' : ''}
    </div>` : ''}
    <div class="modal-btns">${actions.join('')}<button class="btn" onclick="UI.closeModal()">闭</button></div>`;
};

// enh：行囊里点的是哪一档（+2 的那堆 / +0 的那堆）。不传则默认最高档。
function showItemDetail(itemId, gearSlot, enh){
  if (!Items[itemId]) return;
  const enhv = (enh == null) ? null : (enh | 0);
  if (UI._detailId !== itemId || UI._detailGear !== (gearSlot || null) || UI._detailEnh !== enhv) UI._enhLast = null;
  UI._detailId = itemId;
  UI._detailGear = gearSlot || null;
  UI._detailEnh = enhv;
  UI.modal(UI.itemDetailHtml(itemId));
}

// ---------- 数量操作（售卖 / 购入共用） ----------
// 上限写在 input 的 max 上，步进与「全部」都读它——三个入口各写一遍迟早对不上。
function qtyStep(id, d){
  const el = $(id);
  if (!el) return;
  const max = Math.max(1, parseInt(el.max, 10) || 1);
  el.value = Math.max(1, Math.min(max, (parseInt(el.value, 10) || 1) + d));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function qtySet(id, v){
  const el = $(id);
  if (!el) return;
  const max = Math.max(1, parseInt(el.max, 10) || 1);
  el.value = Math.max(1, Math.min(max, v));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function syncSell(itemId, enh){
  const el = $('sellQty'), g = $('sellGain');
  if (!el || !g) return;
  const have = Math.max(1, sellableQty(itemId, enh));
  const n = Math.max(1, Math.min(have, parseInt(el.value, 10) || 1));
  g.textContent = fmt(sellValue(itemId, n)) + ' 贝';
}
// 这一档可卖几件（装备按档，材料按总量）
function sellableQty(itemId, enh){
  if (enh != null && typeof isEquipId === 'function' && isEquipId(itemId)){
    const st = (typeof gearStacks === 'function' ? gearStacks(itemId) : []).find(x => x.enh === (enh|0));
    return st ? st.qty : 0;
  }
  return (typeof bagQty === 'function') ? bagQty(itemId) : (Game.inventory[itemId] || 0);
}
function sellN(itemId, enh){
  const el = $('sellQty');
  const have = sellableQty(itemId, enh);
  if (have <= 0){ UI.closeModal(); return; }
  const n = Math.max(1, Math.min(have, parseInt(el && el.value, 10) || 1));
  const gain = sellItem(itemId, n, enh == null ? undefined : enh);
  if (gain > 0) UI.toast(`⚖️ 售出 ${(Items[itemId]||{}).name||''} ×${n}，得贝 ${fmt(gain)}`);
  if (sellableQty(itemId, enh) > 0) UI.refreshItemModal(itemId);
  else if (sellableQty(itemId, null) > 0) showItemDetail(itemId, '', null);   // 这一档卖空了，退回看别的档
  else UI.closeModal();
}
window.qtyStep = qtyStep; window.qtySet = qtySet;
window.syncSell = syncSell; window.sellN = sellN; window.sellableQty = sellableQty;

// ---------- 市廛：商品详情与批量购入 ----------
// 原先点一下直接买 1 份、右上「×10」买十份——想买 37 份得点四次。
// 现在单击先看详情，数量自填；「×10」仍留作快捷。
function showShopItem(idx){
  const s = ShopStock[idx];
  const it = s && Items[s.itemId];
  if (!it) return;
  const lvOk = levelOf('shanglv') >= s.lvl;
  const afford = Math.floor(Game.shells / Math.max(1, s.cost));
  const max = lvOk ? Math.max(0, Math.min(99, afford)) : 0;
  const uses = (typeof itemUses === 'function') ? itemUses(s.itemId) : [];
  UI.modal(`<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(s.itemId,18):(it.icon||'📦')}</span> ${esc(it.name)} <span class="tier">${rarityName(it)}</span></h3>
    <div class="meta">${s.qty} 件 / 份 · 单价 ${s.cost} 贝 · 需商旅 ${s.lvl} 级</div>
    ${it.note?`<div class="reveal"><b>出处</b>${esc(it.note)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
    ${uses.length?`<div class="reveal"><b>用途</b><span class="use-box">${uses.slice(0,8).map(u=>`<span class="use-chip ${u.rite?'rite':''}">${u.kind}·${esc(u.name)}</span>`).join('')}</span></div>`:''}
    <div class="reveal trade-block">
      <b>购入</b>
      <div class="qty-line">
        <button class="btn tiny" type="button" title="减一份" onclick="qtyStep('buyQty',-1)" ${max?'':'disabled'}>−</button>
        <input id="buyQty" class="qty-input" type="number" inputmode="numeric" min="1" max="${Math.max(1,max)}" value="1"
          oninput="syncBuy(${idx})" ${max?'':'disabled'}>
        <button class="btn tiny" type="button" title="加一份" onclick="qtyStep('buyQty',1)" ${max?'':'disabled'}>＋</button>
        <button class="btn tiny" type="button" onclick="qtySet('buyQty',${Math.max(1,max)})" ${max?'':'disabled'}>至多</button>
      </div>
      <div class="hint">共计 <b class="qty-gain" id="buyCost">${fmt(s.cost)} 贝</b> · 持有 ×${typeof bagQty==='function'?bagQty(s.itemId):(Game.inventory[s.itemId]||0)} · 贝币 ${fmt(Game.shells)} · ${lvOk?`至多可买 ${max} 份`:`需商旅 ${s.lvl} 级（现 ${levelOf('shanglv')}）`}</div>
    </div>
    <div class="modal-btns">
      <button class="btn primary" id="buyGo" onclick="buyN(${idx})" ${max?'':'disabled'}>购入 1 份（${fmt(s.cost)} 贝）</button>
      <button class="btn" onclick="UI.closeModal()">闭</button>
    </div>`);
}
function syncBuy(idx){
  const s = ShopStock[idx], el = $('buyQty'), g = $('buyCost'), go = $('buyGo');
  if (!s || !el || !g) return;
  const max = Math.max(1, parseInt(el.max, 10) || 1);
  const n = Math.max(1, Math.min(max, parseInt(el.value, 10) || 1));
  const cost = fmt(s.cost * n) + ' 贝';
  g.textContent = cost;
  if (go) go.textContent = `购入 ${n} 份（${cost}）`;   // 底部按钮跟着数量走
}
function buyN(idx){
  const s = ShopStock[idx], el = $('buyQty');
  if (!s) return;
  const max = Math.max(1, parseInt(el && el.max, 10) || 1);
  const n = Math.max(1, Math.min(max, parseInt(el && el.value, 10) || 1));
  if (buyItem(idx, n)) UI.toast(`⚖️ 购入 ${(Items[s.itemId]||{}).name||''} ×${s.qty*n}`);
  if (UI.currentTab === 'shichan') UI.renderShichan();
  showShopItem(idx);           // 重开一层，数量与「持有 / 贝币」跟着变
}
window.showShopItem = showShopItem; window.syncBuy = syncBuy; window.buyN = buyN;

// ---------- 技能 / 配方的详情弹窗 ----------
// 手机没有 hover：技能卡浮层里的「产出地 / 材料来源 / 将至」在触屏上等于不存在。
// 点一下就把同一份信息摆进弹窗，并且能直接跳去产地。
function showSkillDetail(id){
  const sk = Skills[id];
  if (!sk) return;
  const raw = Game.skills[id] || { level:1, xp:0 };
  const lv = levelOf(id);
  const cur = xpForLevel(raw.level), next = xpForLevel(raw.level + 1);
  const need = Math.max(0, next - (raw.xp || 0));
  const nf = nodeForSkill(id);
  const mns = nf ? [] : materialNodesForSkill(id);
  const mst = nf ? [] : materialStatusForSkill(id);
  const nx = nextUnlocks(id, 8);
  UI.modal(`<h3><span class="mi-ic">${typeof skillIcon==='function'?skillIcon(sk,18):(sk.icon||'')}</span> ${esc(sk.name)}
      <span class="tier">${TUNING.TIER_NAMES[tierOfLevel(lv)] || ''}</span></h3>
    <div class="meta">Lv ${lv}${lv < TUNING.MAX_LEVEL ? ` · 距下一级 ${fmt(need)} 经验` : ' · 已至本卷上限'}</div>
    ${sk.desc?`<div class="reveal"><b>所能</b>${esc(sk.desc)}</div>`:''}
    ${nf?`<div class="reveal"><b>产出地</b><button class="btn-mini skill-go"
      onclick="UI.selRegion='${nf.regionId}';UI.selNode='${nf.nodeId}';UI.closeModal();UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${esc((nodeOf(nf.nodeId)||{}).name||'')}</button></div>`:''}
    ${mns.length?`<div class="reveal"><b>材料来源</b><span class="use-box">${mns.slice(0,5).map(m=>`<button class="btn-mini skill-go"
      onclick="UI.selRegion='${m.regionId}';UI.selNode='${m.nodeId}';UI.closeModal();UI.switchTab('yudi')">${esc(m.itemName)}·${esc(m.nodeName||'')}</button>`).join('')}</span></div>`:''}
    ${mst.length?`<div class="reveal"><b>材料存余</b><span class="mat-inv">${mst.map(m=>`<span class="${m.ok?'ok':'gap'}">${esc(m.name)} ${m.have}/${m.need}</span>`).join(' · ')}</span></div>`:''}
    ${nx.length?`<div class="reveal"><b>将至</b>${esc(nextUnlockText(nx))}</div>`:''}
    <div class="modal-btns"><button class="btn" onclick="UI.closeModal()">闭</button></div>`);
}
window.showSkillDetail = showSkillDetail;

// 配方详情：点一下先看「做什么、要什么、够做几次」，再决定做几次。
// 原先点一下直接做 1 次，手机上连材料缺口都看不到（浮层要 hover）。
function showRecipeDetail(key){
  const parts = String(key).split('::');
  const r = Recipes.find(x => x.type === parts[0] && x.out === parts[1]);
  if (!r) return;
  const it = Items[r.out] || { name:r.out, icon:'📦' };
  const skId = mapRecipeSkill(r.type);
  const sk = Skills[skId] || { name:'' };
  const lvOk = levelOf(skId) >= r.lvl;
  let maxN = Infinity;
  for (const [iid, q] of (r.cost || [])){
    maxN = Math.min(maxN, Math.floor((Game.inventory[iid] || 0) / Math.max(1, q)));
  }
  if (!isFinite(maxN)) maxN = 0;
  const capN = Math.min(99, Math.max(0, maxN));
  const per = r.qty || 1;
  const rows = (r.cost || []).map(([iid, q]) => {
    const have = totalOf(iid);
    const ok = have >= q;
    return `<span class="${ok?'ok':'gap'}">${typeof itemIc==='function'?itemIc(iid,13):''}${esc((Items[iid]||{}).name||iid)} ${have}/${q}</span>`;
  }).join(' · ');
  UI.modal(`<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(r.out,18):(it.icon||'📦')}</span> ${esc(it.name)}
      ${it.equip?gradeBadge(it):`<span class="tier">${rarityName(it)}</span>`}</h3>
    <div class="meta">每次出 ${per} 件 · ${esc(sk.name)} ${r.lvl} 级 · 经验 ${r.xp || 0}</div>
    <div class="reveal"><b>材料</b><span class="mat-inv">${rows}</span></div>
    ${it.note?`<div class="reveal"><b>出处</b>${esc(it.note)}</div>`:''}
    ${it.effect?`<div class="reveal"><b>效果</b>${esc(it.effect)}</div>`:''}
    <div class="reveal trade-block">
      <b>制作</b>
      <div class="qty-line">
        <button class="btn tiny" type="button" title="减一次" onclick="qtyStep('craftQty',-1)" ${capN?'':'disabled'}>−</button>
        <input id="craftQty" class="qty-input" type="number" inputmode="numeric" min="1" max="${Math.max(1,capN)}" value="1"
          oninput="syncCraft(${capN},${per})" ${capN?'':'disabled'}>
        <button class="btn tiny" type="button" title="加一次" onclick="qtyStep('craftQty',1)" ${capN?'':'disabled'}>＋</button>
        <button class="btn tiny" type="button" onclick="qtySet('craftQty',${Math.max(1,capN)})" ${capN?'':'disabled'}>至多</button>
      </div>
      <div class="hint">共得 <b class="qty-gain" id="craftGain">${per} 件</b> · ${lvOk ? `材料可做 ${maxN} 次` : `需${esc(sk.name)} ${r.lvl} 级（现 ${levelOf(skId)}）`}</div>
    </div>
    <div class="modal-btns">
      <button class="btn primary" id="craftGo" onclick="craftN('${key}')" ${capN?'':'disabled'}>做 1 次</button>
      ${capN?`<button class="btn" onclick="craftAll('${key}')">连作至料尽</button>`:''}
      <button class="btn" onclick="UI.closeModal()">闭</button>
    </div>`);
}
function syncCraft(capN, per){
  const el = $('craftQty'), g = $('craftGain'), go = $('craftGo');
  if (!el || !g) return;
  const n = Math.max(1, Math.min(Math.max(1, capN), parseInt(el.value, 10) || 1));
  g.textContent = `得 ${n * per} 件`;
  if (go) go.textContent = `做 ${n} 次（${n * per} 件）`;
}
function craftN(key){
  const el = $('craftQty');
  const n = Math.max(1, parseInt(el && el.value, 10) || 1);
  UI.closeModal();
  startActivity('craft', key, { times: n });
}
function craftAll(key){
  UI.closeModal();
  startActivity('craft', key);
}
window.showRecipeDetail = showRecipeDetail; window.syncCraft = syncCraft;
window.craftN = craftN; window.craftAll = craftAll;

// 就地重绘：保持滚动位置，免得强化一下就被弹回顶部
UI.refreshItemModal = function(itemId){
  // 淬炼成功后那一件换档了（+0 堆里的一件 → +1 堆）：详情要跟着跳到新档，
  // 否则会停在一个已经空了的档上，看着像「强化把装备弄没了」。
  const t = UI._enhTarget;
  if (t && typeof t === 'object' && (t.id === itemId) && UI._detailEnh != null) UI._detailEnh = (t.enh | 0);
  const box = $('modalBox');
  const body = box && box.querySelector('.modal-body');
  const y = body ? body.scrollTop : (box ? box.scrollTop : 0);
  UI.modal(UI.itemDetailHtml(itemId));
  const box2 = $('modalBox');
  const body2 = box2 && box2.querySelector('.modal-body');
  if (body2) body2.scrollTop = y;
  else if (box2) box2.scrollTop = y;
};

// 锁定面板上的强化按钮：演出期间不接受第二次点击
UI._lockEnhPanel = function(){
  const box = $('modalBox');
  if (!box) return;
  const one = box.querySelector('.enh-btns .btn.primary');
  if (one){ one.disabled = true; one.textContent = '鼓铸中…'; }
  const to = box.querySelector('.enh-to .btn');
  if (to) to.disabled = true;
};

// 揭晓：等级数字跳一下；失败震一下弹窗，掉零再补一句「尽毁」
UI._revealEnh = function(itemId, r){
  const box = $('modalBox');
  if (!box) return;
  const lvEl = box.querySelector('.enh-lv');
  if (typeof FX === 'undefined') return;
  if (r.success && lvEl){
    FX.pop(lvEl);
    FX.floatAtEl(box.querySelector('.enh-val') || lvEl, `淬成 +${r.lvAfter}`, '#D9A521', true);
  } else if (r.wiped){
    FX.shakeHard(box);
    FX.floatAtEl(box.querySelector('.enh-val') || lvEl, '阶数尽毁', '#B03A2B', true);
  } else if (r.lost){
    FX.shakeHard(box);
  }
};

UI.enhanceOne = function(target){
  if (UI._enhBusy) return;
  // 不传参时用「当前详情正在看的那一件」：装备槽里看就是实例，行囊里看就是 itemId
  target = target || UI._enhTarget || UI._detailId;
  const itemId = (typeof enhTargetId === 'function') ? enhTargetId(target) : target;
  if (!itemId) return;
  const stoneEl = $('enhStone');
  const stone = !!(stoneEl && stoneEl.checked);
  const it = Items[itemId];
  // 先落库：料照扣、成败已定，但先扣着不揭晓——那一秒半的锤声就是悬念。
  const r = enhanceItem(target, { stone });
  if (!r.ok){
    UI._enhLast = { id:itemId, text: r.reason || '未能强化', cls:'bad' };
    UI.refreshItemModal(itemId);
    return;
  }
  if (r.success) UI._enhLast = { id:itemId, text:`成：+${r.lvBefore} → +${r.lvAfter}`, cls:'good' };
  else if (r.wiped) UI._enhLast = { id:itemId, text:`毁：+${r.lvBefore} → +0`, cls:'bad' };
  else if (r.lost) UI._enhLast = { id:itemId, text:`败：跌至 +${r.lvAfter}`, cls:'bad' };
  else UI._enhLast = { id:itemId, text:`败：${r.usedStone ? '镇物护住原阶' : '仅损材料'}`, cls:'sys' };

  const played = (typeof UI.forgeShow === 'function') && UI.forgeShow(it, { heavy:false });
  if (!played){ UI.refreshItemModal(itemId); UI._revealEnh(itemId, r); return; }

  UI._enhBusy = true;
  UI._lockEnhPanel();
  setTimeout(()=>{
    UI._enhBusy = false;
    UI.refreshItemModal(itemId);
    UI._revealEnh(itemId, r);
  }, 1250);
};

UI.enhanceTo = function(target){
  if (UI._enhBusy) return;
  target = target || UI._enhTarget || UI._detailId;
  const itemId = (typeof enhTargetId === 'function') ? enhTargetId(target) : target;
  if (!itemId) return;
  const el = $('enhTarget');
  const t = parseInt(el && el.value, 10);
  if (!isFinite(t)){ UI.toast('先填目标等级'); return; }
  const stoneEl = $('enhStone');
  const stone = !!(stoneEl && stoneEl.checked);
  const it = Items[itemId];
  const played = (typeof UI.forgeShow === 'function') && UI.forgeShow(it, { heavy:true });
  if (played){ UI._enhBusy = true; UI._lockEnhPanel(); }
  const run = ()=>{
    const r = enhanceToTarget(target, t, { stone, noToast: true });
    UI._enhLast = { id:itemId, cls: r.done ? 'good' : (r.wiped ? 'bad' : 'sys'),
      text: `${r.done ? '已至' : (r.wiped ? '尽毁于' : '止于')} +${r.lv}（${r.tries} 次 · 成 ${r.ups} 败 ${r.downs}${r.stones ? ` · 镇物 ${r.stones}` : ''}）` };
    UI.toast(r.done ? `🔨 已至 +${r.lv}` : (r.wiped ? `💥 阶数尽毁，止于 +${r.lv}` : `… 止于 +${r.lv}`));
    UI._enhBusy = false;
    UI.refreshItemModal(itemId);
    const box = $('modalBox');
    if (box && typeof FX !== 'undefined'){
      if (r.done){ FX.floatAtEl(box.querySelector('.enh-lv') || box, `已至 +${r.lv}`, '#D9A521', true); }
      else if (r.wiped){ FX.shakeHard(box); }
    }
  };
  if (played) setTimeout(run, 1450);
  else run();
};

UI.reforgeNow = function(itemId){
  const ok = reforgeItem(itemId);
  UI._enhLast = { id:itemId, text: ok ? '词条已重铸' : '重铸未成', cls: ok ? 'good' : 'bad' };
  UI.refreshItemModal(itemId);
};

window.showItemDetail = showItemDetail;
