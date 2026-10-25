// ===== ui/world.js — 舆地（区域 / 节点 / 异迹索引）与技能页（技能卡 / 配方 / 田地 / 三签） =====
// 由 src/ui.js 拆分而来（v1.31.8）。加载顺序见 index.html：core 必须最先（UI 对象在这里定义），
// 其余按页顺序；跨文件调用的函数与常量都在全局词法环境里，运行时才求值，先后不影响调用。

// ================= 舆地 =================
// 节点著录进度：统计该节点可著录的物产/异兽中已著录数量
function nodeRecordProgress(nodeId){
  let total = 0, done = 0;
  for (const it of Object.values(Items)) if (it.node === nodeId){ total++; if ((Game.records[it.id]||{}).count > 0) done++; }
  for (const m of Object.values(Monsters)) if (m.nodeId === nodeId){ total++; if ((Game.records[m.id]||{}).count > 0) done++; }
  return { done, total };
}
// 持续指引：根据当前进度给出最贴心的下一步建议
function nextHint(){
  const recCount = Object.keys(Game.records).length;
  if (recCount === 0)
    return { icon:'🧭', tab:'yudi', text:'先从「舆地」选山，点其中一项采集或讨伐即动身前往，开启著录。' };
  // 已可御使却尚未入槽的异兽
  const ready = (typeof deployableBeasts === 'function' ? deployableBeasts() : [])
    .find(m=>!Object.values(Game.deployed).includes(m.id));
  if (ready)
    return { icon:'🐾', tab:'yushi', text:`「${ready.name}」已著录至「通形」，可往「御使」入槽，得被动增益与自动作业。` };
  // 新解锁却尚未涉足的山系
  const fresh = (WORLD && WORLD.regions || []).find(r=>regionUnlocked(r) && r.nodes.length > 0 && r.nodes.every(n=>!Game.map[n.id]));
  if (fresh)
    return { icon:'🗺️', tab:'yudi', text:`新山系「${fresh.regionName}」已解锁，前往探索可得新物产与异兽。` };
  // 接近阶位突破（任一著录距下一阶不足 5 次）
  let nearTier = null, remain = 0;
  for (const id in Game.records){
    const t = Game.records[id];
    const thr = [1,10,25,50,100];
    const next = thr[t.tier+1];
    if (next && t.count > 0 && next - t.count > 0 && next - t.count <= 5){ nearTier = id; remain = next - t.count; break; }
  }
  if (nearTier && Items[nearTier]){
    return { icon:'✒️', tab:'queue', text:`再著录 ${remain} 次，「${Items[nearTier].name}」即可突破至下一阶（产出加成提升）。` };
  }
  return { icon:'✒️', tab:'queue', text:'编排「行动」巡历队列与兜底任务，离线亦自动推进；归来可见「离线归来」汇总。' };
}

// 推荐前往的节点：可御使异兽所在（御）/ 已解锁未涉足（荐）
function recommendedNodes(){
  const map = {};
  (typeof deployableBeasts === 'function' ? deployableBeasts() : [])
    .filter(m=>!Object.values(Game.deployed).includes(m.id) && m.nodeId)
    .forEach(m=>{ map[m.nodeId] = 'tame'; });
  (WORLD && WORLD.regions || []).forEach(r=>{
    if (!regionUnlocked(r)) return;
    r.nodes.forEach(n=>{ if (!Game.map[n.id] && !map[n.id]) map[n.id] = 'explore'; });
  });
  return map;
}

// 山志异兽小签。记录对象必须按「同节点」定位：同名异兽分处两经（北山肥遗 ≠ 西山
// 肥遗），只按名字找会把别处的著录数借过来。神祇的记录走谒见（deity id）。
// 三者皆无时按性质标注：祥瑞（观瑞可见、不可讨伐）/ 渔获 / 仅载其名（原文有名而本作未设实体）。
UI.faunaChipHtml = function(sel, f){
  const m = Object.values(Monsters).find(x=>x.nodeId===sel.id && (x.faunaName||x.name)===f.name);
  let rid = m && m.id;
  if (!rid){
    const site = (typeof AUDIENCE_SITES!=='undefined') && AUDIENCE_SITES[sel.id];
    const d = site && (site.deities||[]).find(x=>x.name===f.name || '（'+x.name+'）'===f.name);
    if (d) rid = d.id;
  }
  if (!rid){
    const any = Object.values(Monsters).find(x=>x.name===f.name);   // 祥瑞等跨节点同名
    if (any) rid = any.id;
  }
  const rec = rid ? (Game.records[rid]||{count:0}) : null;
  let tag;
  if (rec){
    tag = `<i class="${rec.count>0?'rec-ok':'rec-no'}">${rec.count>0?'录 '+rec.count:'未录'}</i>`;
  } else {
    const fm = (typeof FAUNA_META !== 'undefined') && FAUNA_META[f.name];
    const hint = fm && fm.pacifist ? '祥瑞' : fm && fm.fishOnly ? '渔获' : '仅载其名';
    tag = `<i class="rec-none">${hint}</i>`;
  }
  // 异兽小签头：绘形图标（手绘特型 → form 解析 → 分类兜底），与讨伐页同一套语言
  const ic = (typeof beastIcon === 'function')
    ? beastIcon({ id: rid || '', name: f.name, el: (rid && Monsters[rid] && Monsters[rid].el) || ((typeof FAUNA_META!=='undefined' && FAUNA_META[f.name])||{}).el })
    : (CAT_EMOJI[f.category]||'🐾');
  return `<span class="fauna-chip ${rec && rec.count>0 ? 'seen':''}"${f.effect?` title="${esc(f.effect)}"`:''}><span class="fc-ic">${ic}</span>${esc(f.name)}${tag}</span>`;
};

// 统计页「异迹」那一格点进来：展开索引并滚到它跟前。
// 光给数字不给去路，玩家看完还是得一座座山翻。
UI.gotoHetero = function(){
  this.heteroOpen = true;
  if (this.currentTab !== 'yudi') this.switchTab('yudi');
  else this.renderYudi();
  const el = document.querySelector('details.hetero-panel');
  if (el && el.scrollIntoView) el.scrollIntoView({ block:'center', behavior:'smooth' });
};

// 异迹索引：观象 9 处、谒见 20 处、灌木 3 处散在 447 座山里，
// 每处的按钮只在该山的详情里出现。统计页写着「观象处 3/9」，玩家却没有办法
// 知道差的那 6 处在哪——只能一座一座山点开看。这里一张表列全：
// 点一行即选中那座山（看它周围有什么），右侧「往」直接动身。
function heteroPanelHtml(){
  if (typeof heteroSites !== 'function') return '';
  const list = heteroSites();
  if (!list.length) return '';
  const kinds = ['观象', '观瑞', '谒见', '灌木'];
  const summary = kinds
    .filter(k => list.some(x => x.kind === k))
    .map(k => { const a = list.filter(x => x.kind === k); return `${k} <b>${a.filter(x => x.done).length}</b>/${a.length}`; })
    .join(' · ');
  const left = list.filter(x => !x.done && x.unlocked).length;
  const yl = levelOf('yudi');
  // 展开状态要自己记着：整页 innerHTML 重建（点一行、点「往」、每次结算后刷新）会把
  // <details> 的 open 属性一起抹掉，不记的话点一下就自动收起，等于用不了。
  return `<details class="hetero-panel" ${UI.heteroOpen ? 'open' : ''} ontoggle="UI.heteroOpen=this.open">
    <summary>异迹索引 <i class="hp-tally">${summary}</i><em class="hp-left">${left ? `可往 ${left} 处` : '暂无可往'}</em></summary>
    <div class="hetero-list">
    ${list.map(x => {
      const gap = Math.max(0, x.level - yl);
      const prog = x.prog ? ` · ${Math.min(x.prog.got, x.prog.total)}/${x.prog.total}` : '';
      return `<div class="hetero-row ${x.done ? 'done' : ''} ${x.unlocked ? '' : 'lock'}"
          title="${esc(x.gain)}${prog}"
          onclick="UI.selRegion='${esc(x.regionId)}';UI.selNode='${esc(x.nodeId)}';UI.renderYudi()">
        <span class="hr-kind k-${x.kind}">${x.kind}</span>
        <span class="hr-name">${esc(x.name)}${x.done ? '<i class="hr-ok">已得</i>' : ''}</span>
        <span class="hr-where">${esc(x.nodeName)}${x.regionName ? ` · ${esc(x.regionName)}` : ''}</span>
        <span class="hr-gain">${esc(x.gain)}${prog}</span>
        ${x.unlocked
          ? `<button class="btn small hr-go" type="button" onclick="event.stopPropagation();${x.act}">往</button>`
          : `<span class="hr-lock">需 ${x.level} 级${gap > 0 ? `（差 ${gap}）` : ''}</span>`}
      </div>`;
    }).join('')}
    </div>
  </details>`;
}

UI.renderYudi = function(){
  const box = $('content');
  if (!box) return;
  const regions = WORLD.regions;
  const region = regions.find(r=>r.regionId === this.selRegion) || regions[0];
  const unlocked = regionUnlocked(region);
  const nodes = region.nodes;
  const sel = this.selNode && nodes.find(n=>n.id === this.selNode) ? nodes.find(n=>n.id === this.selNode) : nodes[0];
  const here = Game.node === (sel && sel.id);
  const h = nextHint();
  const recNodes = recommendedNodes();

  // 指引条只控制自身显隐，地图/山系/节点/详情必须始终渲染（曾因三元表达式包住整页导致关闭指引条后界面全空）
  let html = ((typeof Prefs !== 'undefined' && Prefs.hideHint) ? '' :
    `<div class="hint-banner"><span class="mi-ic">${typeof markIcon==='function'?markIcon(hintMark(h),15):h.icon}</span> <span>${esc(h.text)}</span><button class="hint-close" title="关闭指引条（设置中可重开）" onclick="UI.dismissHint()">✕</button></div>`)
    + `<div class="map-wrap">
    <div class="panel regions">
      <h3>山系</h3>
      <button type="button" class="locked-toggle" title="展开/收起尚未解锁的山系" onclick="document.body.classList.toggle('show-locked');this.classList.toggle('on')">${typeof markIcon==='function'?markIcon('lock',14):'🔒'} 未解锁山系 ${CHAPTERS.filter(ch=>!regions.filter(r=>ch.regionIds.includes(r.regionId)).some(r=>regionUnlocked(r))).length} 章</button>
      <div class="region-scroll">
      ${CHAPTERS.map(ch=>{
        const chRegions = regions.filter(r=>ch.regionIds.includes(r.regionId));
        const chUnlocked = chRegions.some(r=>regionUnlocked(r));
        return `<div class="chapter-block ${chUnlocked?'':'ch-locked'}">
          <div class="chapter-head ${chUnlocked?'':'lock'}"><b>${esc(ch.name)}</b><span>${esc(ch.sub)}</span></div>
          <div class="tile-grid region-grid">
          ${chRegions.map(r=>{
            const un = regionUnlocked(r);
            const done = r.nodes.filter(n=>Game.map[n.id]).length;
            const full = r.nodes.length > 0 && done >= r.nodes.length;
            // 中山经十二系已于 v1.13 全录，此分支现仅在数据缺失时兜底（空山系不按进度渲染）
            const todo = r.nodes.length > 0;
            // 方块：山系名 + 涉山进度；未解锁只留一把锁与所需等级
            return `<div class="tile region-tile ${r.regionId===this.selRegion?'on':''} ${un?'':'lock'} ${full?'full':''}"
                title="${esc(r.regionName)}${un ? (todo ? ` · 已涉 ${done}/${r.nodes.length} 山` : ' · 原文已备，诸山待补录') : ` · 需舆地 ${r.unlockLevel} 级`}"
                onclick="UI.selRegion='${r.regionId}';UI.selNode=null;UI.renderYudi()">
              <span class="rg-name">${esc(r.regionName)}</span>
              <span class="rg-sub">${un ? (todo ? `${done}/${r.nodes.length} 山` : '待补录') : `${typeof markIcon==='function'?markIcon('lock',13):'🔒'} ${r.unlockLevel} 级`}</span>
              ${un && todo && done > 0 ? `<span class="rg-bar"><i style="width:${(done/r.nodes.length*100).toFixed(0)}%"></i></span>` : ''}
            </div>`;
          }).join('')}
          </div>
        </div>`;
      }).join('')}
      </div>
      <div class="region-summary">${unlocked ? esc(region.summary||'') : `${typeof markIcon==='function'?markIcon('lock',13):'🔒'} 尚未解锁此山系`}</div>
    </div>
    <div class="panel nodes">
      <h3>${esc(region.regionName)} · 诸山</h3>
      ${(()=>{
        const r = (typeof activeRiteOf === 'function') ? activeRiteOf(region.regionId) : null;
        return r ? `<div class="rite-here" title="${esc(r.name)}：此域采获 +${Math.round(r.bonus*100)}%（约合产量 +${typeof riteRealYield==='function'?riteRealYield(r.bonus):Math.round(r.bonus*50)}%），余 ${fmtTime(r.left)}">
          <span class="mi-ic">${typeof markIcon==='function'?markIcon('lamp',13):'🕯️'}</span>
          <span class="rh-name">${esc(r.name)}</span>
          <span class="rh-bonus">采获 +${Math.round(r.bonus*100)}%</span>
          <b class="rh-left">${fmtClock(r.left)}</b>
        </div>` : '';
      })()}
      <div class="node-list">
      <div class="tile-grid node-grid">
      ${nodes.length ? '' : '<div class="empty-tip">此山系原文已备（祠礼与山神已入祠典），诸山名录待逐系补录。</div>'}
      ${nodes.map(n=>{
        const un = nodeUnlocked(n);
        const visited = !!Game.map[n.id];
        const cur = Game.node === n.id;
        const reason = recNodes[n.id];
        const rp = nodeRecordProgress(n.id);
        const done = rp.total > 0 && rp.done === rp.total;
        // 方块：山名 + 著录进度；角上挂「在 / 御 / 荐 / ⚠」
        return `<div class="tile node-tile ${this.selNode===n.id?'on':''} ${un?'':'lock'} ${cur?'here':''} ${reason?'rec '+reason:''}"
             title="${esc(n.name)}${rp.total?` · 已著录 ${rp.done}/${rp.total} 种`:''}${!un?' · '+esc(nodeLockReason(n)):''}"
             onclick="UI.selNode='${n.id}';UI.renderYudi()">
          ${n.hazard?`<span class="nt-haz" title="${esc(n.hazard.detail||n.hazard.type)}">${typeof markIcon==='function'?markIcon('warn',15):'⚠'}</span>`:''}
          ${cur?'<span class="nt-mark here">在</span>'
            : reason==='tame'?'<span class="nt-mark tame" title="可御使的异兽在此">御</span>'
            : reason==='explore'?'<span class="nt-mark" title="尚未涉足，可前往探索">荐</span>':''}
          <span class="nt-name">${visited?'<i>✓</i>':''}${esc(n.name)}</span>
          <span class="nt-tag ${done?'done':''}">${rp.total>0?`录 ${rp.done}/${rp.total}`:(un?`Lv ${n.unlockLevel}`:`需 ${n.unlockLevel}`)}</span>
        </div>`;
      }).join('')}
      </div>
      </div>
    </div>
    <div class="panel node-detail">
    ${sel ? (()=>{
    const un = nodeUnlocked(sel);
    const rp = nodeRecordProgress(sel.id);
    // 产出：原文「其木多 X / 其阳多玉」，按类换行，标签左对齐
    const yieldRows = (function(){
      const rows = [];
      Object.entries(sel.yields||{}).forEach(([k,v])=>{
        if (k === 'unknown' || k === 'special') return;
        const list = Array.isArray(v) ? v : [];
        if (!list.length) return;
        const chips = list.map(x=> typeof x === 'string' ? esc(x) : esc(x.name)+(x.effect?`<i>${esc(x.effect)}</i>`:'')).join('、');
        const label = { wood:'其木', mineral:'金玉', herb:'灵草', water:'水族', beast:'兽', woodSpecial:'灵木' }[k]||k;
        rows.push(`<div><b>${label}</b>${chips}</div>`);
      });
      if (sel.yields && sel.yields.special) rows.push(`<div><b>异</b>${sel.yields.special.map(x=>esc(x)).join('、')}</div>`);
      if (sel.yields && sel.yields.unknown) rows.push(`<div><b>怪</b>${sel.yields.unknown.map(x=>esc(x)).join('、')}</div>`);
      if (rows.length) return `<div class="yield-rows">${rows.join('')}</div>`;
      // 原文写「无草木」的荒山（全书 18 座）不该只回一句「无所载」——
      // 那读起来像数据缺失。这里明说「此地本无」，并点出唯一可做之事。
      const hasFauna = (sel.fauna || []).some(f => f.category !== '神祇');
      return hasFauna
        ? '<span class="hint">本山不载草木金玉，唯见异兽</span>'
        : '<span class="hint">此山无草木、亦无异兽——原文如此。涉足可录舆图一格，得舆地经验。</span>';
    })();
    // 异兽：带著录状态的小签，已录的转朱色，未录的留白
    // ⚠️ 取记录必须按「同节点」定位：同名异兽分处两经（北山肥遗 ≠ 西山肥遗），
    // 只按名字找会把别处的著录数借过来。神祇的记录走谒见（deity id），
    // 二者都没有的（原文有名、本作未设实体）标「仅载其名」，免得玩家以为漏了内容。
    const faunaRows = (sel.fauna||[]).length
      ? `<div class="fauna">${sel.fauna.map(f=>UI.faunaChipHtml(sel, f)).join('')}</div>`
      : '<span class="hint">此地无异兽记载</span>';
    // 山志全文：悬停 / 点按「山志」展开，含山川、注解、神话等长文
    const shanZhi = `<div class="nd-sec"><b>山川</b>${esc(sel.chapter||'')} · 需舆地 ${sel.unlockLevel}${sel.hazard?` · <span class="haz-text">${esc(sel.hazard.detail||sel.hazard.type)}</span>`:''}${sel.terrain?`<br>${esc(sel.terrain)}`:''}</div>
      <div class="nd-sec"><b>产出</b>${yieldRows}</div>
      <div class="nd-sec"><b>异兽</b>${faunaRows}</div>
      ${specialNodeNote(sel)||''}
      ${sel.source?`<div class="nd-sec"><b>原文</b>${esc(sel.source)}</div>`:''}
      ${sel.note?`<div class="nd-sec"><b>注解</b>※ ${esc(sel.note)}</div>`:''}
      ${nodeMythBlock(sel)||''}`;
    return `<div class="nd-head">
        <h3>${esc(sel.name)} ${here?'<span class="here-tag">在此</span>':''}</h3>
        <button class="btn-mini nd-info" type="button" data-tip data-tip-title="${esc(sel.name)} · 山志">山志全篇<span class="tip-body hidden">${shanZhi}</span></button>
      </div>
      <div class="meta">${esc(sel.chapter||'')} · 需舆地 ${sel.unlockLevel}${sel.hazard?` · <span class="haz-text">${esc(sel.hazard.detail||sel.hazard.type)}</span>`:''}</div>
      ${!un?`<div class="lock-note">${typeof markIcon==='function'?markIcon('lock',13):'🔒'} ${esc(nodeLockReason(sel))}</div>`:''}
      ${rp.total>0?`<div class="node-prog">已著录 <b>${rp.done}</b>/${rp.total} 种<span class="prog-line"><i style="width:${(rp.total?rp.done/rp.total*100:0).toFixed(0)}%"></i></span>${rp.done===rp.total?'<em>此山录毕</em>':''}</div>`:''}
      <div class="actions">
        ${un ? gatherButtonsForNode(sel) : ''}
        ${observeButtonForNode(sel)}
        ${audienceButtonForNode(sel)}
        ${growButtonForNode(sel)}
        ${combatButtonsForNode(sel)}
        ${un && !here && !nodeHasUsableAction(sel) ? `<button class="btn" onclick="travelTo('${sel.id}')">涉足此山</button>` : ''}
      </div>
      <div class="nd-body">
        ${sel.terrain?`<p class="nd-terrain">${esc(sel.terrain)}</p>`:''}
        ${specialNodeNote(sel)||''}
        <div class="nd-sec"><b>产出</b>${yieldRows}</div>
        <div class="nd-sec"><b>异兽</b>${faunaRows}</div>
        ${sel.source?`<blockquote class="quote">${esc(sel.source)}<cite>${esc(sel.chapter||'山海经')}</cite></blockquote>`:''}
        ${sel.note?`<div class="nd-sec note-line"><b>注解</b>${esc(sel.note)}</div>`:''}
        ${nodeMythBlock(sel)||''}
      </div>`;
    })() : ''}
    </div></div>`
    + heteroPanelHtml();
  box.innerHTML = html;
};
// 此山是否有「现在就能点的动作」。
// 前往按钮取消后，动作按钮本身兼管「走一趟」（采集/观象/谒见/灌木/讨伐都会先 travelTo），
// 所以只有当一样都点不了时，才补一枚「涉足此山」——否则那 58 座只载原文的山永远涉不了。
function nodeHasUsableAction(node){
  for (const it of Object.values(Items)){
    if (!it.skill) continue;
    const nodes = it.nodes || (it.node ? [it.node] : []);
    if (nodes.includes(node.id) && gatherGate(it).usable) return true;
  }
  if (Object.values(OBSERVE_SITES).some(s=>s.nodeId === node.id)) return true;
  if (typeof AUDIENCE_SITES !== 'undefined' && AUDIENCE_SITES[node.id]) return true;
  if (Object.values(GROW_SITES).some(s=>s.nodeId === node.id && canAfford(s.cost))) return true;
  if (Object.values(Monsters).some(m=>m.nodeId === node.id && levelOf('taofa') >= (m.needLvl||1))) return true;
  return false;
}
// 采集可用性：与 game.js 的 doGather 同口径——差 8 级内可「越级」，效率按差距折减。
// 早期山系并非每个手艺都有低阶产物（渔在南山只有育沛），硬门槛会把路堵死。
function gatherGate(it){
  const need = it.lvl || 1;
  const cur = levelOf(it.skill);
  const gap = need - cur;
  return { need, cur, gap, usable: gap <= 8, eff: gap <= 0 ? 1 : Math.max(0.35, 1 - gap * 0.08) };
}

function gatherButtonsForNode(node){
  const out = [];
  for (const it of Object.values(Items)){
    if (!it.skill) continue;
    const nodes = it.nodes || (it.node ? [it.node] : []);
    if (!nodes.includes(node.id)) continue;
    const g = gatherGate(it);
    const tag = g.gap > 0 ? ` · 越级 ${Math.round(g.eff * 100)}%` : '';
    out.push(`<button class="btn ${g.usable ? (g.gap > 0 ? 'over' : '') : 'lock'}" ${g.usable ? '' : 'disabled'}
      onclick="startActivity('gather','${it.id}')" title="${esc(it.note||'')}${g.gap > 0 ? '（越级采集：效率 ' + Math.round(g.eff*100) + '%）' : ''}">
      ${typeof skillIcon==='function'?skillIcon(it.skill,17):Skills[it.skill].icon} ${esc(it.name)}<i>${Skills[it.skill].name} ${it.lvl}${tag}</i></button>`);
  }
  return out.join('');
}
function observeButtonForNode(node){
  const site = Object.values(OBSERVE_SITES).find(s=>s.nodeId === node.id);
  if (!site) return '';
  const done = !!Game.observed[Object.keys(OBSERVE_SITES).find(k=>OBSERVE_SITES[k].nodeId===node.id)];
  return `<button class="btn ${done?'':'primary'}" onclick="startObserve('${Object.keys(OBSERVE_SITES).find(k=>OBSERVE_SITES[k].nodeId===node.id)}')">
    🌅 ${site.kind}·${esc(site.name)}${done?'（再观）':''}</button>`;
}
function combatButtonsForNode(node){
  const beasts = Object.values(Monsters).filter(m=>m.nodeId === node.id);
  if (!beasts.length) return '';
  return beasts.map(m=>{
    const lvOk = levelOf('taofa') >= (m.needLvl||1);
    return `<button class="btn ${lvOk?'':'lock'}" ${lvOk?'':'disabled'} onclick="startCombat('${m.id}', {focus:true})">
      ${m.boss?(typeof beastIcon==='function'?beastIcon({id:m.id}):'🦹'):(typeof markIcon==='function'?markIcon('bolt',14):'⚔️')} ${esc(m.name)}<i>讨伐 ${m.needLvl||1}</i></button>`;
  }).join('');
}
// 谒见神祇。诸神都录过之后改称「问神」——这一趟是去问此地还有什么没录，
// 而不是再听一遍已经写下的名姓。
function audienceButtonForNode(node){
  const site = AUDIENCE_SITES[node.id];
  if (!site) return '';
  const un = nodeUnlocked(node);
  const done = (site.deities || []).every(d => ((Game.records || {})[d.id] || {}).count > 0);
  return `<button class="btn ${un && !done ? 'primary' : ''}" ${un?'':'disabled'} onclick="startAudience('${node.id}')"
    title="${done ? '诸神已录：问此地未录之物' : '神祇不可讨伐，以谒见入录'}">🕯️ ${done ? '问神' : '谒见'} ${esc(site.name)}<i>${done ? '此地未录之物' : (site.deities.length + ' 位神祇')}</i></button>`;
}
// 峚山 · 玉膏灌丹木
function growButtonForNode(node){
  const site = Object.values(GROW_SITES).find(s=>s.nodeId === node.id);
  if (!site) return '';
  const un = nodeUnlocked(node);
  const st = Game.danmu || { stage:0 };
  const done = (st.stage||0) >= site.stages;
  return `<button class="btn ${un && !done?'primary':''}" ${un && !done?'':'disabled'} onclick="startGrow('${Object.keys(GROW_SITES).find(k=>GROW_SITES[k].nodeId===node.id)}')"
    title="${esc(site.desc)}">🌱 灌木 ${esc(site.name)}<i>${done?'五岁乃成，先取其实':`${st.stage||0}/${site.stages} 岁 · 耗玉膏×1`}</i></button>`;
}
// 特殊节点的「地气」：原文设定之外，把它实际影响什么写清楚。
// 尽沙 / 百仞 / 干河三处原先只有一句原文，玩家不知道走进去会怎样。
function specialNodeNote(node){
  const sp = SPECIAL_NODES[node.id];
  if (!sp) return '';
  const tags = [];
  if (sp.desert){
    const free = typeof hasBeast === 'function' && hasBeast('tuotuo');
    tags.push(free ? '流沙：有橐驼代步，采集如常' : '流沙：采集迟缓 ×1.25（御使橐驼可免）');
  }
  if (sp.climb) tags.push('百仞：采集迟缓 ×1.18，所得更丰 +10%');
  if (sp.seasonalRiver){
    const wet = typeof seasonPhase === 'function' && seasonPhase();
    tags.push(`${typeof seasonName === 'function' ? seasonName() : '旱季'}：渔获 ${wet ? '+30%' : '−30%'}（六小时一转）`);
  }
  return `<div class="special-note">★ ${esc(sp.note||'')}${tags.length
    ? `<div class="geo-tags">${tags.map(t=>`<span class="geo-tag">${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
}
function nodeMythBlock(node){
  if (!node.myth) return '';
  return `<div class="myth-block"><b>神话</b>${esc(node.myth.figure?node.myth.figure+'：':'')}${esc(node.myth.content||'')}</div>`;
}
// 采集技能 → 产出节点（用于技能页一键前往）
function nodeForSkill(skillId){
  const pool = (typeof GATHER_POOLS!=='undefined' && GATHER_POOLS[skillId]) || [];
  for (const iid of pool){
    const it = Items[iid];
    if (it && it.node){
      for (const r of (WORLD.regions||[])){
        const n = (r.nodes||[]).find(nn=>nn.id===it.node);
        if (n) return { nodeId:n.id, regionId:r.regionId };
      }
    }
  }
  return null;
}
// 制作技能 → 所需材料来源节点（取首个有产地的材料）
function materialNodeForSkill(skillId){
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes){
    for (const c of (r.cost||[])){
      const it = Items[c[0]];
      if (it && it.node){
        for (const reg of (WORLD.regions||[])){
          const n = (reg.nodes||[]).find(nn=>nn.id===it.node);
          if (n) return { nodeId:n.id, regionId:reg.regionId, itemName:it.name };
        }
      }
    }
  }
  return null;
}
// 制作技能 → 所有材料来源节点（去重，按节点）
function materialNodesForSkill(skillId){
  const out = [];
  const seen = {};
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes){
    for (const c of (r.cost||[])){
      const it = Items[c[0]];
      if (it && it.node && !seen[it.node]){
        for (const reg of (WORLD.regions||[])){
          const n = (reg.nodes||[]).find(nn=>nn.id===it.node);
          if (n){ seen[it.node] = true; out.push({ nodeId:n.id, regionId:reg.regionId, itemName:it.name, nodeName:n.name }); break; }
        }
      }
    }
  }
  return out;
}
// 制作技能 → 各材料「已持有 / 需求」状态（按最大需求量计）
function materialStatusForSkill(skillId){
  const map = {};
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes) for (const c of (r.cost||[])){
    const need = c[1]||1;
    if (!map[c[0]] || need > map[c[0]].need) map[c[0]] = { id:c[0], name:(Items[c[0]]||{}).name||c[0], need };
  }
  // ⚠️ 这里原写 Game.inv —— 库存字段叫 Game.inventory。于是「材料存余」永远是 0/N，
  // 技能卡浮层与详情里每一行都标着缺料，玩家备齐了也一样。
  return Object.values(map).map(m=>{ const have = (Game.inventory && Game.inventory[m.id]) || 0; return { ...m, have, ok: have >= m.need }; });
}
// 图鉴条目 → 其产出/讨伐节点
function codexNode(e){
  if (!e) return null;
  let nodeId = null;
  if (e.cat === '异兽'){ const m = Monsters[e.id]; if (m) nodeId = m.nodeId; }
  else { const it = Items[e.id]; if (it) nodeId = it.node; }
  if (!nodeId) return null;
  for (const r of (WORLD.regions||[])){
    const n = (r.nodes||[]).find(nn=>nn.id===nodeId);
    if (n) return { nodeId:n.id, regionId:r.regionId };
  }
  return null;
}
// ================= 技能 =================
UI.renderSkills = function(){
  const box = $('content');
  if (!box) return;
  const groups = { all:'全部', gathering:'采集', processing:'制作', combat:'武备', taofa:'征伐', fangguo:'方国', yushi:'驭使' };
  const filter = this.skillFilter;
  let ids = [];
  for (const g in SKILL_GROUPS){
    if (filter === 'all' || filter === g) ids = ids.concat(SKILL_GROUPS[g].ids);
  }
  const cur = Game.activity;
  let html = `<div class="panel stats-bar">
    <span>总等级 <b>${totalSkillLevel()}</b></span>
    <span>最高 <b>${(function(){ let b='',l=0; for(const id in Game.skills) if(Game.skills[id].level>l){l=Game.skills[id].level;b=Skills[id].name;} return b?b+' '+l:'—'; })()}</b></span>
    <span>修为 <b>${fmt(Game.stats.totalXp || 0)}</b><i class="hint">（累计经验，不设上限）</i></span>
    <span>经验倍率 <b>×${xpMult().toFixed(2)}</b></span>
    <span>采集速度 <b>×${gatherSpeedMult().toFixed(2)}</b></span>
    <span>采获 <b>+${Math.round(globalYieldBonus()*100)}%</b><i class="hint">（约合产量 +${typeof riteRealYield==='function'?riteRealYield(globalYieldBonus()):0}%）</i></span>
    <span>御使槽 <b>${Object.keys(Game.deployed).length}/${beastSlots()}</b></span>
  </div>
  ${(typeof bountyDef === 'function') ? (() => {
    const list = (Game.bounties || []).filter(b => bountyDef(b.id));
    if (!list.length) return '';
    const lv = bountyLevel();
    return `<div class="panel bounty-panel">
      <h3>三签<i class="bn-sub">签成得贝，做完一条即补一条</i></h3>
      <div class="bounty-list">
        ${list.map((b, bi) => {
          const def = bountyDef(b.id);
          const got = bountyProgress(b), need = Math.max(1, b.target);
          const pct = Math.min(100, got / need * 100);
          return `<div class="bounty-item ${got >= need ? 'done' : ''}">
            <span class="bn-name">${esc(def.name)}</span>
            <span class="bn-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
            <span class="bn-num">${Math.min(got, need)}/${need}</span>
            <span class="bn-pay">${Math.max(1, Math.round(def.shells(lv)))} 贝</span>
            <button class="bn-swap" type="button" title="换一条（当前进度作废）" onclick="bountySwap(${bi})">换</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  })() : ''}
  <div class="filter-row">
    ${Object.entries(groups).map(([k,v])=>`<button class="chip-btn ${filter===k?'on':''}" onclick="UI.skillFilter='${k}';UI.renderSkills()">${v}</button>`).join('')}
  </div>
  <div class="skill-grid">
    ${    ids.map(id=>{
      const sk = Skills[id];
      const active = cur && ((cur.kind==='gather' && cur.skill===id) || (cur.kind==='craft' && mapRecipeSkill(cur.recipe.type)===id));
      const nf = nodeForSkill(id);
      const mns = nf ? null : materialNodesForSkill(id);
      const mst = nf ? null : materialStatusForSkill(id);
      const matBtns = (mns && mns.length) ? `<div class="mat-src">材料来源：${mns.slice(0,3).map(m=>`<button class="btn-mini skill-go" onclick="UI.selRegion='${m.regionId}';UI.selNode='${m.nodeId}';UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${esc(m.nodeName||'')}</button>`).join('')}${mns.length>3?`<span class="hint">等 ${mns.length} 处</span>`:''}</div>` : '';
      const matInv = (mst && mst.length) ? `<div class="mat-inv">${mst.map(m=>`<span class="${m.ok?'ok':'gap'}">${typeof itemIc==='function'?itemIc(m.id,13):''}${esc(m.name)} ${m.have}/${m.need}${m.ok?(typeof markIcon==='function'?markIcon('check',12):'✓'):(typeof markIcon==='function'?markIcon('warn',12):'✗')}</span>`).join(' · ')}</div>` : '';
      // 方块：图标 + 名 + 阶位，右上角等级，底部一条经验进度；
      // 描述 / 产出地 / 材料来源与持有缺口全在浮层（点按即开）
      const lv = levelOf(id);
      const raw = Game.skills[id];
      const xc = xpForLevel(raw.level), xn = xpForLevel(raw.level + 1);
      const pct = xn > xc ? Math.min(100, (raw.xp - xc) / (xn - xc) * 100) : 100;
      return `<div class="tile skill-tile ${active?'active':''}" data-skill="${id}" data-tip data-tip-title="${esc(sk.name)}"
        role="button" tabindex="0" onclick="showSkillDetail('${id}')">
        <span class="sk-lv">${lv}</span>
        <span class="tile-ic bi-ic">${typeof skillIcon==='function'?skillIcon(sk):sk.icon}</span>
        <span class="tile-nm">${esc(sk.name)}</span>
        <span class="tile-tag">${TUNING.TIER_NAMES[tierOfLevel(lv)]}</span>
        <span class="sk-bar"><i style="width:${pct.toFixed(1)}%"></i></span>
        <span class="tip-body hidden">
          <div class="sc-desc">${esc(sk.desc||'')}</div>
          ${nf?`<button class="btn-mini skill-go" onclick="UI.selRegion='${nf.regionId}';UI.selNode='${nf.nodeId}';UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} 产出地</button>`:''}
          ${matBtns}${matInv}
          ${(() => {
            const nx = nextUnlocks(id, 6);
            return nx.length ? `<div class="sc-next" title="再练几级便能采到 / 做到"><b>将至</b>${esc(nextUnlockText(nx))}</div>` : '';
          })()}
        </span>
      </div>`;
    }).join('')}
  </div>

  <div class="panel recipe-panel">
    <h3>制作配方</h3>
    <div class="filter-row">
      ${Object.entries(ActionKinds).filter(([k,d])=>d.mode==='recipe').map(([k,d])=>
        `<button class="chip-btn ${this.recipeSkill===k?'on':''}" onclick="UI.recipeSkill='${k}';UI.renderSkills()">${typeof skillIcon==='function'?skillIcon(k,15):d.icon} ${d.label}</button>`).join('')}
    </div>
    <div class="tile-grid recipe-grid">
    ${Recipes.filter(r=>r.type===this.recipeSkill).sort((a,b)=>a.lvl-b.lvl).map(r=>{
      const it = Items[r.out];
      const sk = Skills[mapRecipeSkill(r.type)];
      const lvOk = levelOf(mapRecipeSkill(r.type)) >= r.lvl;
      const afford = canAfford(r.cost);
      const can = lvOk && afford;
      return `<div class="tile ${can?'':'lock'}" data-tip data-tip-title="${esc(it?it.name:r.out)}"
        role="button" tabindex="0"
        onclick="showRecipeDetail('${r.type}::${r.out}')">
        <span class="tile-ic bi-ic">${typeof itemIc==='function'?itemIc(it):(it?it.icon:'📦')}</span>
        <span class="tile-nm">${esc(it?it.name:r.out)}</span>
        <span class="tile-tag">${sk.name} ${r.lvl}</span>
        ${can?`<button class="tile-more" type="button" title="连作：做到材料用尽"
          onclick="event.stopPropagation();startActivity('craft','${r.type}::${r.out}')">连</button>`:''}
        <span class="tip-body hidden"><div class="rc-cost">${costChips(r.cost)}</div><div class="rc-xp">经验 ${r.xp}</div>${!lvOk?`<div class="hint ${r.lvl - levelOf(mapRecipeSkill(r.type)) <= 2 ? 'near' : ''}">再升 ${r.lvl - levelOf(mapRecipeSkill(r.type))} 级（${sk.name} ${r.lvl}）</div>`:''}</span>
      </div>`;
    }).join('')}
    </div>
  </div>

  <div class="panel farm-panel">
    <h3>圃艺 · 田地<button class="btn small gear-best" type="button" onclick="UI.plantAll()">一键种植</button></h3>
    <div class="tile-grid farm-grid">
    ${farmTilesHtml()}
    </div>
  </div>

  ${(typeof rebirthCount === 'function') ? (() => {
    const cnt = rebirthCount();
    const gain = Math.round(rebirthGain() * 100);
    const yl = Math.round(rebirthYield() * 100);
    const start = rebirthStartLevel();
    const best = bestSkillLevel();
    const ok = canRebirth();
    const nextStart = Math.min(TUNING.REBIRTH.START_CAP, (cnt + 1) * TUNING.REBIRTH.START_PER);
    return `<div class="panel rebirth-panel">
      <h3>轮回 · 第 ${cnt + 1} 卷</h3>
      <div class="rb-grid">
        <span>轮回印 <b>${cnt} 枚</b></span>
        <span>修为 <b>+${gain}%</b></span>
        <span>采获 <b>+${yl}%</b></span>
        <span>转后起手 <b>${nextStart} 级</b></span>
        <span>最高技艺 <b>${esc(best.name || '—')} ${best.level}<i class="rb-cap">/${TUNING.REBIRTH.MIN_LEVEL}</i></b></span>
        <span>修为累计 <b>${fmt(Game.stats.totalXp || 0)}</b></span>
      </div>
      ${(() => {
        const hist = (Game.rebirth && Game.rebirth.history) || [];
        if (!hist.length) return '<p class="hint">这一卷尚未落笔，成绩会自动记下。</p>';
        const last = hist[hist.length - 1];
        const fastest = hist.reduce((a, b) => (b.sec < a.sec ? b : a), hist[0]);
        const isBest = fastest.sec === last.sec;
        const dur = (sec) => (sec < 60 ? '不足一分' : fmtTime(sec));
        return `<p class="hint rb-hist">上轮 ${dur(last.sec)} · 总等级 ${last.total}${isBest ? ' · <b>本卷最快</b>' : ` · 最快 ${dur(fastest.sec)}`}</p>`;
      })()}
      <p class="hint">再著一卷，是从头写，不是从头认识：诸技归 ${nextStart} 级，舆地与履险不忘；著录、装备、贝币、营造、御使与修为俱在。</p>
      ${ok
        ? `<button class="btn primary" type="button" onclick="UI.openRebirth()">再著一卷</button>`
        : `<button class="btn" type="button" disabled>未至九九，不可轮回</button>
           <span class="hint">任一技艺至 ${TUNING.REBIRTH.MIN_LEVEL} 级方可落笔</span>`}
    </div>`;
  })() : ''}`;
  box.innerHTML = html;
};

// 轮回确认：把「失去 / 保留 / 得到」三栏摊开再让人点。
// 转生是不可逆的重置，最忌讳的就是点完才发现丢了什么。
UI.openRebirth = function(){
  if (typeof canRebirth !== 'function' || !canRebirth()){
    this.toast(`需任一技艺至 ${TUNING.REBIRTH.MIN_LEVEL} 级`); return;
  }
  const cnt = rebirthCount() + 1;
  const start = Math.min(TUNING.REBIRTH.START_CAP, cnt * TUNING.REBIRTH.START_PER);
  const best = bestSkillLevel();
  const gain = Math.round(cnt * TUNING.REBIRTH.XP * 100);
  const yl = Math.round(cnt * TUNING.REBIRTH.YIELD * 100);
  this.modal(`
    <h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('moon',18):'♻️'}</span> 再著一卷</h3>
    <p class="hint">「${esc(best.name)}」已至九九，本卷可收。落笔之后各门技艺重新从 ${start} 级起，走过的路与写下的字都还在。</p>
    <div class="rb-cols">
      <div class="rb-col lose"><b>将失去</b>
        <ul><li>各门技艺等级（归 ${start} 级）</li><li>进行中的采制与往讨</li><li>连杀递减计数</li></ul></div>
      <div class="rb-col keep"><b>将保留</b>
        <ul><li>修为 ${fmt(Game.stats.totalXp || 0)}（终身累计）</li><li>著录 ${recordedCount()} 条 · 图鉴与成就</li><li>装备、贝币、营造、御使</li><li>舆地与履险（走过的路不忘）</li></ul></div>
      <div class="rb-col gain"><b>将得到</b>
        <ul><li>第 ${cnt} 枚轮回印</li><li>修为 +${gain}%（终身）</li><li>采获 +${yl}%</li><li>起手 ${start} 级</li><li>本轮 ${fmtTime(Math.max(0, Math.round((Date.now() - ((Game.rebirth && Game.rebirth.startedAt) || Game.startedAt || Date.now())) / 1000)))} 入册</li></ul></div>
    </div>
    <div class="modal-btns">
      <button class="btn" onclick="UI.closeModal()">再想想</button>
      <button class="btn primary" onclick="UI.confirmRebirth()">落笔</button>
    </div>`);
};
UI.confirmRebirth = function(){
  const r = (typeof doRebirth === 'function') ? doRebirth() : { ok:false, reason:'轮回未开' };
  this.closeModal();
  if (!r.ok){ this.toast(r.reason || '未能轮回'); return; }
  if (this.refreshActivity) this.refreshActivity();
  this.switchTab('skills');
};

// 田地方块 HTML（整页渲染与就地补绘共用）
function farmTilesHtml(){
  return Array.from({length:TUNING.FARM_PLOTS}, (_,i)=>{
    const slot = 'p'+i;
    const f = Game.farms[slot];
    if (f){
      const seed = Items[f.seedId] || { name:'嘉种', icon:'🌱' };
      const pct = Math.max(0, Math.min(100, (1 - f.remain/f.grow)*100));
      const left = fmtTime(f.remain/Math.max(0.1,farmSpeedMult()));
      // 方块：作物图标 + 名 + 贴底细进度条 + 剩余时间；成熟自动收获
      return `<div class="tile farm-tile growing ${pct>=100?'ripe':''}" data-plot="${slot}" data-tip data-tip-title="${esc(seed.name)}">
        <span class="tile-ic">${pct>=100?'🌾':pct>50?'🌿':'🌱'}</span>
        <span class="tile-nm">${esc(seed.name)}</span>
        <span class="ft-bar"><i style="width:${pct.toFixed(0)}%"></i></span>
        <span class="tile-tag">${left}</span>
        <span class="tip-body hidden">
          <div class="rc-sub">${esc(seed.name)} · 田 ${i+1}</div>
          <div class="rc-sub">${pct>=100?'即将成熟，自动收获':'成长 '+pct.toFixed(0)+'% · 余 '+left}</div>
          <div class="hint">成熟即收，无需看管；偶尔回赠种子</div>
        </span>
      </div>`;
    }
    // 空田：方卡点按开择种浮层（下拉框在方块里既丑又难点）
    return `<div class="tile farm-tile empty" data-plot="${slot}" role="button" tabindex="0" onclick="UI.seedMenu('${slot}')">
      <span class="tile-ic">➕</span>
      <span class="tile-nm">择种</span>
      <span class="tile-tag">田 ${i+1}</span>
    </div>`;
  }).join('');
}

// 择种浮层：方卡点按后列出行囊可用嘉种；未持有 / 未达等级的置灰并说明原因
UI.seedMenu = function(slot){
  const lv = levelOf('puyi');
  const seeds = Object.values(Items).filter(s=>s.crop).sort((a,b)=>(a.lvl||1)-(b.lvl||1));
  if (!seeds.length){ this.toast('此地无嘉种可植'); return; }
  const rows = seeds.map(s=>{
    const have = Game.inventory[s.id]||0;
    const lvOk = lv >= (s.lvl||1);
    const ok = have > 0 && lvOk;
    return `<button type="button" class="seed-row ${ok?'':'lock'}" ${ok?`onclick="UI.pickSeed('${slot}','${s.id}')"`:'disabled'}>
      <span class="sr-ic">${typeof itemIc==='function'?itemIc(s.id,16):(s.icon||'🌱')}</span>
      <span class="sr-nm">${esc(s.name)}</span>
      <span class="sr-meta">${lvOk?`持有 <b>${have}</b>`:`需圃艺 ${s.lvl} 级`}</span>
    </button>`;
  }).join('');
  this.modal(`<h3>择种 · 田 ${parseInt(slot.slice(1))+1}</h3>
    <p class="hint">点选即植入此田，消耗一枚种子；成熟自动收获，偶尔回赠种子。</p>
    <div class="seed-list">${rows}</div>
    <div class="modal-btns"><button class="btn ghost" onclick="UI.closeModal()">再想想</button></div>`);
};
UI.pickSeed = function(slot, id){
  if (plantSeed(slot, id)){ this.closeModal(); this.renderSkills(); }
};
// 一键种植：按「价值优先、圃艺达标、确有存种」把空田依次种满，种到没有可用种子为止。
// 单田仍可点按择种（换种、指定某田）；这里只负责「懒得一格格点」的日常。
UI.plantAll = function(){
  const empty = [];
  for (let i = 0; i < TUNING.FARM_PLOTS; i++) if (!Game.farms['p'+i]) empty.push('p'+i);
  if (!empty.length){ this.toast('田已种满'); return; }
  const lv = levelOf('puyi');
  const pool = Object.values(Items)
    .filter(s=>s.crop && (s.lvl||1) <= lv && (Game.inventory[s.id]||0) > 0)
    .sort((a,b)=>(b.value||0)-(a.value||0));
  if (!pool.length){ this.toast('无可用嘉种：需持有种子且圃艺达标'); return; }
  let n = 0;
  for (const slot of empty){
    const s = pool.find(x=>(Game.inventory[x.id]||0) > 0);
    if (!s) break;
    if (plantSeed(slot, s.id, true)) n++;
  }
  this.renderSkills();
  let soon = Infinity;
  for (const k in Game.farms) soon = Math.min(soon, (Game.farms[k].grow || 0));
  const eta = isFinite(soon) ? `（最早约 ${fmtTime(soon / Math.max(0.1, farmSpeedMult()))} 后熟）` : '';
  this.toast(n ? `🌱 一键植 ${n} 田${eta}` : '未能植入');
};
// 田地就地补绘：收获 / 植入后卡片还显示着旧状态，切页才变是不合理的
UI.patchFarms = function(){
  if (this.currentTab !== 'skills') return;
  const grid = document.querySelector('#content .farm-grid');
  if (grid) grid.innerHTML = farmTilesHtml();
};
// 每秒轻量跟进：只改进度条宽度、剩余时间与成熟态，不重建 DOM（不打断悬停浮层）
UI.patchFarmsProgress = function(){
  if (this.currentTab !== 'skills') return;
  document.querySelectorAll('#content .farm-tile.growing').forEach(el=>{
    const f = Game.farms[el.dataset.plot];
    if (!f) return;                                   // 刚收获的交给 patchFarms 整块重绘
    const pct = Math.max(0, Math.min(100, (1 - f.remain/f.grow)*100));
    const ripe = pct >= 100;
    el.classList.toggle('ripe', ripe);
    const ic = el.querySelector('.tile-ic');
    if (ic) ic.textContent = ripe ? '🌾' : pct > 50 ? '🌿' : '🌱';
    const bar = el.querySelector('.ft-bar i');
    if (bar) bar.style.width = pct.toFixed(0) + '%';
    const tag = el.querySelector('.tile-tag');
    if (tag) tag.textContent = fmtTime(f.remain/Math.max(0.1,farmSpeedMult()));
  });
};
// 征兆就地补绘：有征兆到期 / 新触发时，祠祀页的 active 态、总效应、禳解行要立刻跟上
UI.patchOmens = function(){
  if (this.currentTab !== 'jisi') return;
  const panel = document.querySelector('#content .omen-panel');
  if (!panel) return;
  const keepY = window.scrollY || 0;
  panel.innerHTML = omenPanelHtml();
  if (keepY > 0 && window.scrollTo) window.scrollTo(0, keepY);
};

// 五行克制提示：pe=敌方属性，me=我方属性；被克/相持时给出宜用属性（克敌方的属性）与一键切换
function counterOf(el){
  if (!TUNING.KE_MAP) return null;
  for (const k in TUNING.KE_MAP) if (TUNING.KE_MAP[k] === el) return k;
  return null;
}
function wuxingAdvice(pe, me){
  if (!pe || !me || !TUNING.KE_MAP) return '';
  const counter = counterOf(pe);          // 克敌方的属性（宜用属性）
  let rel, cls, arrow;
  if (TUNING.KE_MAP[me] === pe){ rel = '克制'; cls = 'good'; arrow = '➤'; }            // 我克敌
  else if (TUNING.KE_MAP[pe] === me){ rel = '被克'; cls = 'bad'; arrow = '↩'; }        // 敌克我
  else if (typeof wuxingSheng === 'function' && wuxingSheng(me, pe)){ rel = '相生'; cls = 'good'; arrow = '↻'; }  // 我生敌：伤害 ×1.15
  else { rel = '相持'; cls = ''; arrow = '↔'; }
  const shengTip = rel === '相生' ? ' · 伤害 ×1.15' : '';
  const advise = (rel === '被克' || rel === '相持') && counter && counter !== me;
  const btn = advise ? `<button class="btn-mini wux-btn" onclick="setCombatStyle('zhu');setZhuEl('${counter}');UI.renderTaofa()">${typeof markIcon==='function'?markIcon('bolt',13):'⚡'}切「${counter}」属</button>` : '';
  return `<div class="wuxing-tip ${cls}">五行：敌「${pe}」${arrow} ${rel} · 我「${me}」${shengTip}${advise?`（宜用「${counter}」属）`:''}${btn}</div>`;
}
// 战斗预估：预计击杀耗时、双方 DPS、能否撑住（hpNow 传入则为实时剩余血量）
function combatEstimateInner(m, c, hpNow){
  if (!m) return null;
  const dps = playerDpsEstimate();
  if (!dps) return null;
  const hp = (hpNow==null ? m.hp : hpNow);
  const kill = Math.max(1, hp) / dps;
  const mdps = Math.max(1, m.atk - totalDefence()*0.3) * 0.6 / Math.max(1, monsterInterval(m, c));
  // 只看「撑不住」三个字，玩家不知道差多少。换成倍数：2 倍气血 = 得吃两份，
  // 5 倍 = 别硬来，先去补器甲。BOSS 战本来就长，这条提示是开战前唯一的账。
  const ceil = Math.max(1, playerMaxHp());
  const ratio = kill * mdps / ceil;
  const survive = ratio <= 1;
  // 再把倍数折成「要备几份」——倍数要玩家自己换算，份数是拿起来就能办的。
  // 按背包里回血最多的那份算；一份都没有时直说，免得他带着空袋子去打。
  let food = null;
  for (const id in Game.inventory){
    const it = Items[id];
    if (!it || !it.heal || Game.inventory[id] <= 0) continue;
    const h = healAmount(it);
    if (!food || h > food.heal) food = { id, name:it.name, heal:h };
  }
  let advice = '';
  if (!survive){
    const need = kill * mdps - ceil;
    // 一份食物能吃回多少，取决于它在多低的血线上被吃：自动进食在 Prefs.autoEat
    // 处触发，此时最多补到满血，所以有效回血是 min(食物回血, 气血 × (1 − 阈值))。
    // 按食物标称回血算会严重低估份数——丹木之实写着 500，但 300 气血的人实际只吃到 195。
    const eff = food ? Math.max(1, Math.min(food.heal, Math.round(ceil * (1 - (Prefs.autoEat || 0.35))))) : 0;
    advice = food
      ? `，需备 ${Math.max(1, Math.ceil(need / eff))} 份${food.name}`
      : '，包中无吃食——先去备些';
  }
  const tail = survive ? '' : ` · ⚠ 承伤约 ${ratio.toFixed(1)} 倍气血${ratio >= 1.5 ? advice : '，留意气血'}`;
  return { cls: survive ? 'good' : 'bad',
    html: `预计击杀 ≈ ${fmtTime(Math.ceil(kill))} · 你 DPS≈${dps.toFixed(1)} · 敌 DPS≈${mdps.toFixed(1)}${tail}` };
}
function combatEstimateHtml(m, c, hpNow){
  const r = combatEstimateInner(m, c, hpNow);
  return r ? `<div class="combat-est ${r.cls}" id="combatEst">${r.html}</div>` : '';
}
// 供测试与调试：开战前那条「预计击杀 / 承伤倍数」的账
window.combatEstimateInner = combatEstimateInner;
// 离线收益预估（纯读取，不改动任何状态）：仅依据当前活动/御使按真实公式估算
function estimateOfflineGains(hours){
  const cap = offlineCapHours();
  const sec = Math.max(0, Math.min(hours==null ? cap : hours, cap)) * 3600;
  if (sec < 1) return null;
  const eff = offlineEff();
  const a = Game.activity;
  let xp = 0; const items = {};
  if (a && a.kind === 'gather'){
    const it = Items[a.itemId];
    if (it && it.node === Game.node && levelOf(it.skill) >= it.lvl){
      const times = Math.floor(sec / 1);               // 采集基础间隔 ≈1s
      xp += Math.round(it.xp * times * eff);
      const q = Math.floor(times * 1.4 * eff);
      if (q > 0) items[a.itemId] = q;
    }
  } else if (a && a.kind === 'craft'){
    const times = Math.floor(sec / 2);                 // 制作基础间隔 ≈2s
    let t = 0; while (t < times && canAfford(a.recipe.cost)) t++;
    if (t > 0){ items[a.recipe.out] = (a.recipe.qty||1) * t; xp += Math.round((a.recipe.xp||0) * t * eff); }
  }
  xp += Math.round(0.5 * Object.keys(Game.deployed).length * sec * 0.5 * eff);
  return { seconds:sec, xp, items };
}
