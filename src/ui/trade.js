// ===== ui/trade.js — 墟市（买卖 / 求购订单）与营造（建筑） =====
// 由 src/ui.js 拆分而来（v1.31.8）。加载顺序见 index.html：core 必须最先（UI 对象在这里定义），
// 其余按页顺序；跨文件调用的函数与常量都在全局词法环境里，运行时才求值，先后不影响调用。

// ================= 墟市 =================
UI.renderShichan = function(){
  const box = $('content');
  if (!box) return;
  const sellMult = tradeMult();   // 售价走势由 onSecond 采样，此处只读（渲染无副作用）
  let buy = '';
  for (const cat of SHOP_CATS){
    const items = ShopStock.filter(s=>s.cat===cat.id);
    if (!items.length) continue;
    buy += `<h4><span class="cat-ic">${typeof itemIc==='function'?itemIc({ icon:cat.icon, name:cat.name, type:'material' },16):cat.icon}</span> ${cat.name}</h4><div class="shop-grid">`;
    buy += items.map((s,i)=>{
      const it = Items[s.itemId];
      const idx = ShopStock.indexOf(s);
      const lvOk = levelOf('shanglv') >= s.lvl;
      const afford = Game.shells >= s.cost;
      const can = lvOk && afford;
      // 方块：点按开详情（数量自填），右上「×10」仍作快捷；详情里再做等级与贝币校验
      return `<div class="tile shop-tile ${can?'':'lock'}" data-tip data-tip-title="${esc(it?it.name:s.itemId)}"
        role="button" tabindex="0" onclick="showShopItem(${idx})">
        <span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(it):(it?it.icon:'📦')}</span>
        <span class="tile-nm">${esc(it?it.name:s.itemId)}</span>
        <span class="tile-tag">${s.cost} 贝</span>
        ${can?`<button class="tile-more" type="button" title="买十份（${s.cost*10} 贝）"
          onclick="event.stopPropagation();buyItem(${idx},10)">×10</button>`:''}
        <span class="tip-body hidden">
          <div class="bc-sub">${s.qty} 件 / 份 · 单价 ${s.cost} 贝</div>
          ${!lvOk?`<div class="hint">需商旅 ${s.lvl} 级</div>`:''}
          ${s.note?`<div class="hint">${esc(s.note)}</div>`:''}
          ${it&&it.note?`<div class="rc-sub">${esc(it.note)}</div>`:''}
        </span>
      </div>`;
    }).join('');
    buy += `</div>`;
  }
  // 出售
  const inv = Object.entries(Game.inventory).filter(([id,q])=>q>0 && (Items[id]||{}).value);
  inv.sort((a,b)=>{
    if (this.invSort==='value') return (Items[b[0]].value||0)-(Items[a[0]].value||0);
    if (this.invSort==='qty') return b[1]-a[1];
    return 0;
  });
  let sell = `<div class="tile-grid sell-grid">`;
  sell += inv.map(([id,q])=>{
    const it = Items[id];
    const v = sellValue(id, q);
    const unit = sellValue(id, 1);
    // 方块：图标 + 名 + 整摞售价，点按开物品详情（数量自填），右上角「全」售清
    return `<div class="tile sell-tile" data-tip data-tip-title="${esc(it.name)}"
      role="button" tabindex="0" onclick="showItemDetail('${id}')">
      <span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(it):it.icon}</span>
      <span class="tile-nm">${esc(it.name)}</span>
      <span class="tile-tag">${fmt(v)} 贝</span>
      <button class="tile-more" type="button" title="全售 ${q} 件，得 ${fmt(v)} 贝"
        onclick="event.stopPropagation();sellItem('${id}',${q});UI.renderShichan()">全</button>
      <span class="tip-body hidden">
        <div class="bc-sub">持有 ×${q} · 单价 ${fmt(unit)} 贝</div>
        <div class="bc-sub">售 1 得 ${fmt(unit)} 贝 · 全售得 ${fmt(v)} 贝</div>
      </span>
    </div>`;
  }).join('') || '<div class="hint">行囊空空</div>';
  sell += `</div>`;
  const plainValue = inv.filter(([id])=>(Items[id].value||0)<30).reduce((s,[id,q])=>s+sellValue(id,q),0);
  // 推荐买卖：低买高卖 / 购入即录 / 清仓凡品
  const tips = [];
  (typeof ShopStock!=='undefined'?ShopStock:[]).forEach(s=>{
    const it = Items[s.itemId]; if (!it) return;
    const profit = sellValue(s.itemId, s.qty) - s.cost;
    if (profit > 0 && Game.shells >= s.cost)
      tips.push(`低买高卖：<b>${esc(it.name)}</b>（转售约 +${fmt(profit)} 贝）`);
    else if (!Game.records[s.itemId])
      tips.push(`购入即录：<b>${esc(it.name)}</b>（增进著录度）`);
  });
  if (plainValue > 0) tips.push(`行囊有凡/良品，可一键售出得 <b>${fmt(plainValue)}</b> 贝`);
  // 方国求购：可交付的单进入推荐（贝币的第二出口）
  (Game.orders||[]).forEach(o=>{
    if (o.done) return;
    const it = Items[o.itemId];
    if (it && (Game.inventory[o.itemId]||0) >= o.qty)
      tips.push(`方国求购：<b>${esc(it.name)}</b> ×${o.qty} 已备齐，可交割得 <b>${fmt(o.total)}</b> 贝`);
  });

  // 方国求购订单板（惰性刷新：无单或超 30 分钟未轮换时补一批）
  if (typeof refreshOrders === 'function') refreshOrders(true);
  const T = TUNING.ORDERS;
  const leftSec = Math.max(0, T.REFRESH_SEC - (Date.now() - (Game.ordersAt||0))/1000);
  const mm = String(Math.floor(leftSec/60)).padStart(2,'0');
  const ss = String(Math.floor(leftSec%60)).padStart(2,'0');
  let board = '';
  if ((Game.orders||[]).length){
    board = (Game.orders||[]).map((o, idx)=>{
      const it = Items[o.itemId] || { name:o.itemId, icon:'📦' };
      const region = regionById(o.regionId);
      const have = Game.inventory[o.itemId]||0;
      const ok = !o.done && have >= o.qty;
      return `<div class="ob-card ${o.done?'done':''}" data-tip data-tip-title="${esc(it.name)}">
        <div class="ob-top"><span class="rc-icon">${typeof itemIc==='function'?itemIc(o.itemId,16):(it.icon||'📦')}</span><b>${esc(it.name)}</b>
          ${region?`<span class="ob-region" title="此物产自${esc(region.regionName)}，方国${esc(region.regionAlias)}来求">${esc(region.regionAlias)}来求</span>`:''}</div>
        <div class="ob-meta">求 <b>${o.qty}</b> 件 · 溢价 <b>×${o.premium.toFixed(2)}</b> · 商旅经验 +${o.xp}</div>
        <div class="ob-foot">
          <span class="ob-total">${fmt(o.total)} 贝</span>
          <span class="ob-have ${ok?'ok':''}">持有 ${have}/${o.qty}</span>
          ${o.done
            ? '<span class="ob-done">✓ 已交割</span>'
            : `<button class="btn small ${ok?'primary':''}" ${ok?'':'disabled'} onclick="deliverOrder(${idx});UI.renderShichan()">交割</button>`}
        </div>
      </div>`;
    }).join('');
  } else {
    board = '<div class="hint">方国使者未至——稍后再来，或「另访方国」主动求单</div>';
  }
  const orderBoard = `<div class="panel order-board">
      <div class="ob-head"><h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('scale',17):'⚖️'}</span> 方国求购</h3>
        <span class="ob-refresh">整批轮换 <b>${mm}:${ss}</b> 后
          <button class="btn small" onclick="rerollOrders();UI.renderShichan()">另访方国</button></span></div>
      <div class="ob-grid">${board}</div>
      <div class="hint">只求购已解锁山川出产的原材料；整批 30 分钟轮换，交割一单少一单</div>
    </div>`;

  box.innerHTML = `<div class="panel shop-head">
      <span>贝币 <b data-stat="shells">${fmt(Game.shells)}</b></span>
      <span>商旅等级 <b>${levelOf('shanglv')}</b></span>
      <span>售价加成 <b>×${sellMult.toFixed(2)}</b></span>
      <span class="price-trend">售价走势 ${sparkline((Game.priceHistory||[]).map(p=>p.m), 90, 22)}</span>
      <span class="filter-row">
        <button class="chip-btn ${this.invSort==='default'?'on':''}" onclick="UI.invSort='default';UI.renderShichan()">默认</button>
        <button class="chip-btn ${this.invSort==='value'?'on':''}" onclick="UI.invSort='value';UI.renderShichan()">价值↓</button>
        <button class="chip-btn ${this.invSort==='qty'?'on':''}" onclick="UI.invSort='qty';UI.renderShichan()">数量↓</button>
      </span>
    </div>
    ${tips.length?`<div class="panel trade-tip"><h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('lamp',17):'💡'}</span> 推荐买卖</h3><ul>${tips.slice(0,3).map(t=>`<li>${t}</li>`).join('')}</ul></div>`:''}
    ${orderBoard}
    <div class="panel">${buy}</div>
    <div class="panel"><h3>出售</h3>
      <div class="sell-toolbar"><button class="btn small" onclick="sellAllPlain()">出售全部凡/良品（${plainValue} 贝）</button></div>
      ${sell}</div>`;
};
function sellAllPlain(){
  for (const id of Object.keys(Game.inventory)){
    const it = Items[id];
    if (!it || !it.value || it.value >= 30) continue;
    sellItem(id, Game.inventory[id]);
  }
  UI.renderShichan();
}
window.sellAllPlain = sellAllPlain;

// ================= 营造 =================
UI.renderYing = function(){
  const box = $('content');
  if (!box) return;
  box.innerHTML = `<div class="panel">
    <h3>营造（营邑）</h3>
    ${(() => {
      const ready = Object.values(BUILDINGS).filter(b => !Game.buildings[b.id] && levelOf('yingyi') >= b.lvl && canAfford(b.cost)).length;
      const next = Object.values(BUILDINGS).filter(b => !Game.buildings[b.id]).sort((x, y) => x.lvl - y.lvl)[0];
      return `<div class="build-bar"><span class="hint">${ready ? `眼下可造 <b>${ready}</b> 座` : `尚无可造之筑${next ? `——下一座「${esc(next.name)}」需营邑 ${next.lvl} 级` : ''}`}</span></div>`;
    })()}
    <div class="tile-grid building-grid">
    ${(() => {
      // 与祠礼同一套思路：等级够、材料够的排前面，已成的沉底，段内按门槛从低到高
      const rows = Object.values(BUILDINGS).map(b => ({
        b, done: !!Game.buildings[b.id],
        lvOk: levelOf('yingyi') >= b.lvl,
        afford: canAfford(b.cost),
      }));
      rows.sort((x, y) => {
        if (x.done !== y.done) return x.done ? 1 : -1;
        if (x.lvOk !== y.lvOk) return x.lvOk ? -1 : 1;
        if (x.afford !== y.afford) return x.afford ? -1 : 1;
        return x.b.lvl - y.b.lvl;
      });
      return rows.map(({ b, done, lvOk, afford }) => {
      const can = !done && lvOk && afford;
      // 方块：印记字 + 建筑名 + 营造等级，点按即营造；材料与效用进浮层
      return `<div class="tile build-tile ${done?'done':''} ${can?'':'lock'}" data-tip data-tip-title="${esc(b.name)}"
        role="button" tabindex="0" onclick="UI.openBuildModal('${b.id}')">
        <span class="tile-ic bi-ic">${typeof structureIcon==='function'?structureIcon(b):esc(b.name.slice(0,1))}</span>
        <span class="tile-nm">${esc(b.name)}</span>
        <span class="tile-tag">${done?'已成':'营邑 '+b.lvl}</span>
        ${done?'<span class="tile-more bm-done" title="已经营造完毕">✓</span>':''}
        <span class="tip-body hidden">
          ${b.desc?`<div class="rc-sub">${esc(b.desc)}</div>`:''}
          <div class="rc-cost">${costChips(b.cost)}</div>
          ${done?'<div class="hint">已经营造完毕</div>':`${lvOk?'':'<div class="hint">需营邑 '+b.lvl+' 级（当前 '+levelOf('yingyi')+'）</div>'}${afford?'':'<div class="hint">材料不足</div>'}`}
          ${(done || afford) ? '' : (() => {
            // 缺什么、缺几件、去哪儿找——后期四座卡在料上最难受
            const lacks = b.cost.filter(([iid, q]) => totalOf(iid) < q);
            if (!lacks.length) return '';
            return `<div class="rc-lack">缺 ${lacks.map(([iid, q]) => `${esc((Items[iid]||{}).name || iid)}×${q - totalOf(iid)}`).join('、')}</div>` +
              lacks.slice(0, 2).map(([iid]) => {
                const src = (typeof itemSources === 'function') ? itemSources(iid)[0] : null;
                return src ? `<div class="rc-sub rc-src">${esc((Items[iid]||{}).name || iid)}：${esc(src.kind)}${src.lvl ? ' Lv' + src.lvl : ''}</div>` : '';
              }).join('');
          })()}
        </span>
      </div>`;
      }).join('');
    })()}
    </div>
    <div class="hint">营邑等级随营造提升；造完一座所得经验足以开启下一座。学宫可加快著录度获取。</div>
    <div class="ying-repair">
      <button class="btn" onclick="repairBuild();UI.renderYing()">修葺旧筑（怪木×2 · 沙石×1）</button>
      <span class="hint">无可造之物而等级差一点时，以此补足营邑经验（约本级所需四分之一）</span>
    </div>
  </div>`;
};

// 营造详情：材料 / 门槛 / 效用一屏说清，按钮依状态切换（营造 / 去采料 / 已营造）
// 营造收益对比：读「现在」与「建成后」两端的真实数值并列，
// 而不是只给一句文案——文案与实现脱节过一次（烽火台 / 学宫只有描述没有出口），
// 让数值自己说话，接不上就会立刻显形。
function structureEffectRows(id){
  const built = !!Game.buildings[id];
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  const row = (label, from, to) => ({ label, from, to: built ? '已生效' : to });
  switch (id){
    case 'zhai': {
      const y = globalYieldBonus();
      return [row('采获', pct(y), pct(y + 0.03))];
    }
    case 'zaoku':
      return [{ label:'制作耗时', from: built ? '×0.90' : '×1.00', to: built ? '已生效' : '×0.90' }];
    case 'tuku': {
      const h = offlineCapHours();
      return [row('离线上限', h + ' 小时', (h + 1) + ' 小时')];
    }
    case 'canglin': {
      const h = offlineCapHours();
      return [row('离线上限', h + ' 小时', (h + 2) + ' 小时'),
              row('离线效率', pct(offlineEff()), pct(offlineEff() + 0.05))];
    }
    case 'citan':
      return [{ label:'祭祀产出增益', from: built ? '×1.50' : '×1.00', to: built ? '已生效' : '×1.50' }];
    case 'shichan':
      return [{ label:'商旅售价', from: '×' + tradeMult().toFixed(2), to: built ? '已生效' : '×' + (tradeMult() + 0.05).toFixed(2) }];
    case 'fenghuotai':
      return [{ label:'凶兆之害', from: built ? '×0.50' : '×1.00', to: built ? '已生效' : '×0.50' },
              { label:'凶兆应验', from: built ? '举烽后 45 秒' : '即时', to: built ? '已生效' : '延时 45 秒' }];
    case 'xuegong':
      return [{ label:'著录度获取', from: built ? '+25%' : '—', to: built ? '已生效' : '+25%' }];
    // ---- 后期四座 ----
    case 'cuihuolu':
      return [{ label:'淬炼成功率', from: built ? '已含 +6%' : '按等级表', to: built ? '已生效' : '各级 +6%' }];
    case 'cangshuge':
      return [{ label:'修行经验', from: '×' + xpMult().toFixed(2), to: built ? '已生效' : '×' + (xpMult() + 0.10).toFixed(2) }];
    case 'zhaoxianguan':
      return [{ label:'御使增益', from: '×' + (built ? '1.15' : '1.00'), to: built ? '已生效' : '×1.15' }];
    case 'shanhaige': {
      const h = offlineCapHours(), e = offlineEff();
      return [row('离线上限', h + ' 小时', (h + 3) + ' 小时'),
              row('离线效率', pct(e), pct(e + 0.05))];
    }
    default:
      return [];
  }
}

UI.openBuildModal = function(id){
  const b = BUILDINGS[id];
  if (!b) return;
  const done = !!Game.buildings[b.id];
  const lv = levelOf('yingyi');
  const lvOk = lv >= b.lvl;
  const afford = canAfford(b.cost);
  const lack = (b.cost || []).filter(([mid, need]) => totalOf(mid) < need);
  const actions = done
    ? `<button class="btn" onclick="repairBuild();UI.closeModal();UI.renderYing()">修葺旧筑</button>`
    : (lvOk && afford)
      ? `<button class="btn primary" onclick="buildStructure('${b.id}');UI.closeModal();UI.renderYing()">营造</button>`
      : `<button class="btn" onclick="UI.closeModal();UI.switchTab('skills')">去采料</button>`;
  UI.modal(`<h3><span class="mi-ic">${typeof structureIcon === 'function' ? structureIcon(b) : '🏠'}</span> ${esc(b.name)}
      <span class="tier">${done ? '已成' : '营邑 ' + b.lvl}</span></h3>
    <div class="reveal"><b>效用</b>${esc(b.desc || '未载其用')}</div>
    <div class="hm-stats">
      <span>营邑门槛 <b>${b.lvl}</b>（当前 <b>${lv}</b>）</span>
      <span>营造经验 <b>${fmt(b.xp || 0)}</b></span>
    </div>
    ${(() => { const rows = structureEffectRows(b.id); return rows.length ? `<div class="bm-eff"><div class="bm-lb">建成后</div>
      ${rows.map(r => `<div class="bm-eff-row"><span>${r.label}</span><em>${esc(r.from)}</em><i>→</i><b>${esc(r.to)}</b></div>`).join('')}
    </div>` : ''; })()}
    <div class="bm-costs"><div class="bm-lb">所需材料</div>${costChips(b.cost)}</div>
    ${done
      ? '<div class="hm-line">已经营造完毕。若营邑等级差一点，可用「修葺旧筑」补经验（约本级四分之一）。</div>'
      : (!lvOk
        ? `<div class="hm-lock">营邑需 ${b.lvl} 级，当前 ${lv} 级——先造前面几座或修葺旧筑。</div>`
        : (!afford
          ? `<div class="hm-lock">材料不足：${lack.map(([m, q]) => esc((Items[m] || {}).name || m) + ' 差 ' + (q - totalOf(m))).join('、')}</div>`
          : '<div class="hm-line">材料已齐，可即营造。</div>'))}
    <div class="modal-btns">${actions}<button class="btn" onclick="UI.closeModal()">取消</button></div>`);
};
