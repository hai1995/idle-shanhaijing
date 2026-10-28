// ===== ui/yudi.js — 舆地（区域 / 节点 / 异迹索引 / 采集模态） =====
// 由 ui/world.js 拆分而来（v1.31.104）：舆地归舆地，技能页归 ui/skills.js。
// 加载顺序见 index.html：core 必须最先（UI 对象在这里定义）；跨文件调用的函数与
// 常量都在全局词法环境里，运行时才求值，先后不影响调用。

// ================= 舆地 =================
// 节点著录进度：统计该节点可著录的物产/异兽中已著录数量
// ⚠️ v1.31.50：此前只认 it.node（主产地），分母按主产地算 —— 于是 238 座山的
// 「已著录 x/y」偏小（136 座原为 0，进度条压根不出现），玩家在柢山采到雄黄、
// 在别的山采到「金」，那些山都不计数。分母改从引擎的 nodeHasItem 取
// （nodes[] 全集 + 主产地），与采集、图鉴两层的产地口径同源。
function nodeRecordProgress(nodeId){
  const r = (typeof nodeHasItem === 'function')
    ? nodeHasItem(nodeId)
    : (()=>{ let t=0,d=0; for (const it of Object.values(Items)) if (it.node === nodeId){ t++; if ((Game.records[it.id]||{}).count > 0) d++; } return { done:d, total:t }; })();
  let total = r.total, done = r.done;
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
// 跳到异迹索引里的**某一处**并选中它（v1.31.107）：
// 「异迹专属见闻」说了「在观象之地才遇」，玩家下一步自然是「那哪儿有观象地」。
// 与 gotoHetero 的分别只在最后一步——这里把那一行高亮出来，别让人在 36 行里找。
UI.gotoHeteroNode = function(nodeId){
  this.heteroOpen = true;
  this.heteroFocus = nodeId || '';
  if (this.currentTab !== 'yudi') this.switchTab('yudi');
  else this.renderYudi();
  const el = document.querySelector('details.hetero-panel');
  if (el && el.scrollIntoView) el.scrollIntoView({ block:'center', behavior:'smooth' });
  const row = (nodeId && document.querySelector(`.hetero-row.focus`)) || null;
  if (row && row.scrollIntoView) setTimeout(() => { try { row.scrollIntoView({ block:'center', behavior:'smooth' }); } catch(e){} }, 260);
};

UI.gotoHetero = function(){
  this.heteroOpen = true;
  if (this.currentTab !== 'yudi') this.switchTab('yudi');
  else this.renderYudi();
  const el = document.querySelector('details.hetero-panel');
  if (el && el.scrollIntoView) el.scrollIntoView({ block:'center', behavior:'smooth' });
};

// 异迹索引：观象 13 处、谒见 20 处、灌木 3 处散在 447 座山里，
// 每处的按钮只在该山的详情里出现。统计页写着「观象处 3/9」，玩家却没有办法
// 知道差的那 6 处在哪——只能一座一座山点开看。这里一张表列全：
// 点一行即选中那座山（看它周围有什么），右侧「往」直接动身。
// 见闻 id → 名字（索引里挂「此处可遇某条见闻」用；表找不到就回落成 id，不抛）
function evNameOf(id){
  const all = (typeof TRAVEL_EVENTS !== 'undefined' ? TRAVEL_EVENTS : [])
    .concat(typeof AWAY_EVENTS !== 'undefined' ? AWAY_EVENTS : []);
  const e = all.find(x => x.id === id);
  return e ? (e.name || id) : id;
}

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
      // 这一处关联的见闻（v1.31.108）：观象 / 观瑞地关联「此地有灵」，谒见地关联「祠前老祝」。
      // 索引与见闻录自此互为两面：在这边看得见「还差哪条见闻」，在见闻录那边点线索又能回来。
      const evId = HETERO_EVENT[x.kind] || '';
      const evSeen = evId && Game.events && Game.events.seen ? (Game.events.seen[evId] || 0) : 0;
      const evTag = !evId ? ''
        : (evSeen ? `<i class="hr-ev on" title="此处可遇见闻「${esc(evNameOf(evId))}」，已遇 ${evSeen} 次">✦</i>`
                  : `<i class="hr-ev" title="在此做事有机会遇到见闻「${esc(evNameOf(evId))}」">✦</i>`);
      return `<div class="hetero-row ${x.done ? 'done' : ''} ${x.unlocked ? '' : 'lock'} ${UI.heteroFocus === x.nodeId ? 'focus' : ''}"
          title="${esc(x.gain)}${prog}"
          onclick="UI.selRegion='${esc(x.regionId)}';UI.selNode='${esc(x.nodeId)}';UI.renderYudi()">
        <span class="hr-kind k-${x.kind}">${x.kind}</span>
        <span class="hr-name">${esc(x.name)}${evTag}${x.done ? '<i class="hr-ok">已得</i>' : ''}</span>
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
    + gatherAgainBar()
    + `<div class="map-wrap">
    <div class="panel regions">
      <h3 data-tip data-tip-title="舆地 · 山川" data-wiki="mechanic:yudi">山系<span class="tip-body hidden">五经山系之下诸山可点：每座山列出物产、异兽与山志原文；选「采集 / 讨伐」即动身前往。著录阶位愈高，可往的山川愈远。</span></h3>
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
            // 巡礼印记：满额未领 → 朱色「赏」；已领 → 淡墨「巡」。
            // 25/25 只写在选中山系的标题行，切走就看不见了，方块上得留痕。
            const pg = (typeof regionPilgrim === 'function') ? regionPilgrim(r.regionId) : null;
            const seal = (pg && pg.full) ? (pg.claimed ? '巡' : '赏') : '';
            // 中山经十二系已于 v1.13 全录，此分支现仅在数据缺失时兜底（空山系不按进度渲染）
            const todo = r.nodes.length > 0;
            // 方块：山系名 + 涉山进度；未解锁只留一把锁与所需等级
            return `<div class="tile region-tile ${r.regionId===this.selRegion?'on':''} ${un?'':'lock'} ${full?'full':''}"
                title="${esc(r.regionName)}${un ? (todo ? ` · 已涉 ${done}/${r.nodes.length} 山` : ' · 原文已备，诸山待补录') : ` · 需舆地 ${r.unlockLevel} 级`}"
                onclick="UI.selRegion='${r.regionId}';UI.selNode=null;UI.renderYudi()">
              <span class="rg-name">${esc(r.regionName)}</span>
              <span class="rg-sub">${un ? (todo ? `${done}/${r.nodes.length} 山` : '待补录') : `${typeof markIcon==='function'?markIcon('lock',13):'🔒'} ${r.unlockLevel} 级`}</span>
              ${un && todo && done > 0 ? `<span class="rg-bar"><i style="width:${(done/r.nodes.length*100).toFixed(0)}%"></i></span>` : ''}
              ${seal ? (pg.claimed
                ? `<span class="rg-seal done" title="此系巡礼已成">巡</span>`
                : `<button class="rg-seal ready" type="button" title="诸山皆涉 · 点此领赏"
                     onclick="event.stopPropagation();claimPilgrim('${r.regionId}');UI.renderYudi()">赏</button>`) : ''}
            </div>`;
          }).join('')}
          </div>
        </div>`;
      }).join('')}
      </div>
      <div class="region-summary">${unlocked ? esc(region.summary||'') : `${typeof markIcon==='function'?markIcon('lock',13):'🔒'} 尚未解锁此山系`}</div>
    </div>
    <div class="panel nodes">
      ${(()=>{
        // 巡礼：走遍本系诸山后在此领赏。放在「诸山」标题行，是因为它衡量的正是这一列山。
        const pg = (typeof regionPilgrim === 'function') ? regionPilgrim(region.regionId) : null;
        const tag = !pg || !pg.total ? ''
          : `<span class="pilgrim ${pg.full?'full':''}">巡礼 ${pg.done}/${pg.total}${pg.claimed?' ✓':''}</span>`;
        const btn = (pg && pg.full && !pg.claimed)
          ? `<button class="btn small" type="button" onclick="claimPilgrim('${region.regionId}');UI.renderYudi()">领赏</button>` : '';
        return `<h3 data-tip data-tip-title="舆地 · 山川" data-wiki="mechanic:yudi">${esc(region.regionName)} · 诸山${tag}${btn}<span class="tip-body hidden">五经山系之下诸山可点：每座山列出物产、异兽与山志原文；选「采集 / 讨伐」即动身前往。著录阶位愈高，可往的山川愈远。</span></h3>`;
      })()}
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
        <h3 data-tip data-tip-title="舆地 · 山川" data-wiki="mechanic:yudi">${esc(sel.name)} ${here?'<span class="here-tag">在此</span>':''}<span class="tip-body hidden">此山物产、异兽与山志俱列于此。选「采集 / 讨伐」即动身前往，纳入巡历队列。著录阶位愈高，可往的山川愈远。</span></h3>
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
      ${nodeEventNote(sel)}
      ${nodeOmenNote(sel)}
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
    if (!isGatherSkill(it.skill)) continue;
    if (gatherAllowedAt(it, node.id) && gatherGate(it).usable) return true;
  }
  if (Object.values(OBSERVE_SITES).some(s=>s.nodeId === node.id)) return true;
  if (typeof AUDIENCE_SITES !== 'undefined' && AUDIENCE_SITES[node.id]) return true;
  if (Object.values(GROW_SITES).some(s=>s.nodeId === node.id && canAfford(s.cost))) return true;
  if (Object.values(Monsters).some(m=>m.nodeId === node.id && levelOf('taofa') >= (m.needLvl||1))) return true;
  return false;
}
// 采集可用性：与 game.js 的 doGather 同口径——差 8 级内可「越级」，效率按差距折减。
// 早期山系并非每个手艺都有低阶产物（渔在南山只有育沛），硬门槛会把路堵死。
// v1.31.48：判据改从 game.js 的 gatherAllowed 取，本地只留一层壳——
// 此前这里自己重算了一遍 gap/eff，与引擎各算各的，早晚会走散。
function gatherGate(it){
  const g = (typeof gatherAllowed === 'function') ? gatherAllowed(it) : null;
  if (!g) return { need: it.lvl||1, cur: levelOf(it.skill), gap:0, usable:true, eff:1 };
  return { need: it.lvl||1, cur: levelOf(it.skill), gap: g.gap, usable: g.ok, eff: g.eff };
}

function gatherButtonsForNode(node){
  const out = [];
  // 万物山（积石之山「万物无不有焉」）：引擎放行任何物，UI 也该列得出来。
  // 此前按 nodes[] 过滤，结果这座山在舆地上「什么也采不到」——原文的例外被 UI 抹平了。
  const allYield = !!(window.SPECIAL_NODES && (window.SPECIAL_NODES[node.id]||{}).allYield);
  for (const it of Object.values(Items)){
    if (!it.skill) continue;
    if (!isGatherSkill(it.skill)) continue;   // 异兽等带 skill 但并非采集之物
    if (!gatherAllowedAt(it, node.id)) continue;
    const g = gatherGate(it);
    const tag = g.gap > 0 ? ` · 越级 ${Math.round(g.eff * 100)}%` : '';
    // 采集不再是「一点就一直采」：先问次数（v1.31.46）。讨伐早就有 ∞/1/5/10/50，
    // 采集是同一类动作——「采 20 次就去巡历」以前只能靠盯着一遍遍手动停。
    out.push(`<button class="btn ${g.usable ? (g.gap > 0 ? 'over' : '') : 'lock'}" ${g.usable ? '' : 'disabled'}
      onclick="UI.openGatherModal('${it.id}')" title="${esc(it.note||'')}${g.gap > 0 ? '（越级采集：效率 ' + Math.round(g.eff*100) + '%）' : ''}${allYield ? '（此山万物无不有焉）' : ''}">
      ${typeof skillIcon==='function'?skillIcon(it.skill,17):Skills[it.skill].icon} ${esc(it.name)}<i>${Skills[it.skill].name} ${it.lvl}${tag}</i></button>`);
  }
  return out.join('');
}
// ---------- 动作次数的统一校验 ----------
// 讨伐与采集共用：留空 / 0 表示无限（返回 null），其余夹到 1–99 的整数。
// 一处定义，两处入口——上次「同一个机制写两遍」的教训（生产/离线口径走散）。
function clampTimesInput(el){
  if (!el) return null;
  const raw = String(el.value == null ? '' : el.value).trim();
  if (raw === '' || raw === '0' || raw === '∞'){ el.value = ''; return null; }
  let n = parseInt(raw, 10);
  if (!isFinite(n) || n < 1) n = 1;
  if (n > 99) n = 99;
  el.value = n;
  return n;
}
function onTimesInput(el){
  if (!el) return;
  const n = parseInt(el.value, 10);
  if (isFinite(n) && n > 99) el.value = 99;    // 输入过程中只挡上限，不打断两位数
}
// 快选 chips 的高亮跟着输入框走：手填 10 之后「∞」不该还是亮的（原先两处都亮着）。
function syncTimesChips(boxId, n){
  const box = (typeof document !== 'undefined') ? document.getElementById(boxId) : null;
  if (!box || !box.querySelectorAll) return;
  const cur = (isFinite(n) && n > 0) ? Math.min(99, n | 0) : 0;
  box.querySelectorAll('.chip-btn').forEach(b => {
    const k = Number(b.dataset && b.dataset.n) || 0;
    const on = k === cur;
    if (b.classList.contains('on') !== on) b.classList.toggle('on', on);
  });
}
// 单次采集耗时：口径照抄 currentActionInterval 的采集分支（间隔 × 地理系数）。
// 不走 estimate，是因为这里要「此刻、这座山、这件物」的实数，给玩家一个决定次数的依据。
// 地理系数按「当前所在的山」算（v1.31.48）：多产地的物就地采时，用主产地的系数就是错的。
function gatherPerAction(it){
  if (!it || !it.skill) return 1;
  const node = Game.node;
  return Math.max(0.2, gatherInterval(it.skill) * geoGatherMul(node));
}
// 采集次数弹窗：与讨伐弹窗同一套（输入框 + ∞/1/5/10/50 chips + 换算说明）
UI.openGatherModal = function(itemId){
  const it = Items[itemId];
  if (!it || !it.skill) return false;
  const g = gatherGate(it);
  if (!g.usable){
    this.toast(`🔒 需${Skills[it.skill].name} ${it.lvl} 级（至多越级 8 级）`);
    return false;
  }
  this._gatherPer = gatherPerAction(it);
  // 产地显示「当前所在的山」而非物的主产地：多产地的物（玉 38 处）站在哪座山就在哪采，
  // 弹窗却写主产地名，玩家会以为自己要去别处。
  const node = nodeOf(Game.node) || nodeOf(gatherHomeNode(it));
  const last = (Prefs.lastGatherTimes != null && Prefs.lastGatherTimes > 0) ? Prefs.lastGatherTimes : '';
  const per = this._gatherPer;
  // 多产地时补一句「此处亦产」，让玩家知道就地采是常态
  const multi = gatherSources(it).length > 1;
  this.modal(`<h3><span class="mi-ic">${typeof itemIc==='function'?itemIc(itemId,18):(it.icon||'🪓')}</span> ${esc(it.name)} <span class="tier">${esc(Skills[it.skill].name)} ${it.lvl}</span></h3>
    <div class="hm-line">${esc(node?node.name:'')}${it.note?' · '+esc(it.note):''}${multi ? ' · <span class="hm-warn">此地亦产</span>' : ''}</div>
    <div class="hm-line">单次约 ${per < 1 ? per.toFixed(1) : Math.round(per)} 秒${g.gap > 0 ? ` · <b class="hm-warn">越级采集，效率 ${Math.round(g.eff*100)}%</b>` : ''}</div>
    <div class="hm-times">
      <label for="gatherTimes">采集次数</label>
      <input id="gatherTimes" type="number" min="0" max="99" step="1" value="${last}" placeholder="∞" inputmode="numeric"
        oninput="UI.onGatherTimesInput(this)" onchange="UI.clampGatherTimes(this)">
      <span class="hm-chips" id="gatherChips">
        <button type="button" class="chip-btn ${last?'':'on'}" data-n="0" onclick="UI.setGatherTimes(0)">∞</button>
        ${[1,5,10,50].map(n=>`<button type="button" class="chip-btn ${last===n?'on':''}" data-n="${n}" onclick="UI.setGatherTimes(${n})">${n}</button>`).join('')}
      </span>
    </div>
    <div class="hint" id="gatherEta"></div>
    <div class="modal-btns">
      <button class="btn primary" onclick="UI.startGatherTimes('${itemId}')">采集</button>
      <button class="btn" onclick="UI.closeModal()">取消</button>
    </div>`);
  this.patchGatherEta();
  return true;
};
UI.clampGatherTimes = function(el){ const n = clampTimesInput(el); syncTimesChips('gatherChips', n); return n; };
UI.onGatherTimesInput = function(el){ onTimesInput(el); this.patchGatherEta(); };
UI.setGatherTimes = function(n){
  const el = (typeof document !== 'undefined') ? document.getElementById('gatherTimes') : null;
  if (!el) return;
  el.value = (!n || n <= 0) ? '' : Math.max(1, Math.min(99, n|0));
  this.patchGatherEta();
};
// 换算说明：填了次数就把「要花多久」算出来——次数这个东西，玩家真正要判断的是时间。
UI.patchGatherEta = function(){
  const el = (typeof document !== 'undefined') ? document.getElementById('gatherEta') : null;
  if (!el) return;
  const inp = document.getElementById('gatherTimes');
  const n = inp ? parseInt(inp.value, 10) : NaN;
  const per = this._gatherPer || 1;
  syncTimesChips('gatherChips', n);
  el.innerHTML = (isFinite(n) && n > 0)
    ? `采 <b>${n}</b> 次 · 约 ${fmtTime(Math.max(1, Math.round(per*n)))}后收手`
    : '留空为一直采（♾），直到手动收手或换行动。填数字则采满即止——要去做别的事时，填个次数就不必盯着。';
};
UI.startGatherTimes = function(itemId){
  const el = (typeof document !== 'undefined') ? document.getElementById('gatherTimes') : null;
  const n = this.clampGatherTimes(el);   // null = 一直采
  this.closeModal();
  startActivity('gather', itemId, { times:n });
};
// 「再采」条：与征伐页的「再战」对称。
// 采一遍是「选山 → 找物 → 定次数 → 开始」四步；做完一轮往往还要再来一轮
// （换目标前先把手上的料补足），这四步不该每次重走。
// 采的就是当前活动时不显示——此时顶栏已经写着「采 X · 余 N 次」。
function gatherAgainBar(){
  const id = Prefs.lastGatherId;
  if (!id || !Items[id]) return '';
  const a = Game.activity;
  if (a && a.kind === 'gather' && a.itemId === id) return '';
  const it = Items[id];
  const times = Prefs.lastGatherTimes;
  const n = (times && times > 0) ? ` · ${times} 次` : ' · ♾';
  return `<div class="rematch-bar gather-bar">
    <button class="btn primary" type="button" onclick="UI.regather()">🪓 再采 ${esc(it.name)}${n}</button>
    <span class="hint">沿用上次的物${times && times > 0 ? '与次数' : ''}；要改次数点下方那件物</span>
  </div>`;
}
UI.regather = function(){
  const id = Prefs.lastGatherId;
  if (!id || !Items[id]){ this.toast('上次的采集目标已不可采'); return false; }
  const times = (Prefs.lastGatherTimes && Prefs.lastGatherTimes > 0) ? Prefs.lastGatherTimes : null;
  const ok = startActivity('gather', id, times ? { times } : undefined);
  if (ok) this.toast(`🪓 再采 ${Items[id].name}`);
  return ok;
};

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
// 养成点（峚山丹木 / 器酸 / 精卫填海）
// ⚠️ 这里原先写死 `Game.danmu`：于是精卫填海与器酸的按钮显示的永远是丹木的阶数，
// 而且文案也写死「五岁乃成 · 耗玉膏×1」。三处养成各有自己的进度与耗材，必须走 growState。
function growButtonForNode(node){
  const key = Object.keys(GROW_SITES).find(k => GROW_SITES[k].nodeId === node.id);
  if (!key) return '';
  const site = GROW_SITES[key];
  const un = nodeUnlocked(node);
  const st = (typeof growState === 'function') ? growState(key) : { stage:0, done:0 };
  const stage = st.stage || 0;
  const done = stage >= site.stages;
  const cost = (site.cost || []).map(([id, q]) => `${(Items[id] || {}).name || id}×${q}`).join('、');
  // 长线（stepEvery）额外报「下一路标」：200 阶的养成若只写 37/200，看不出还有多远
  let stepTip = '';
  if (site.stepEvery && !done){
    const next = Math.min(site.stages, (Math.floor(stage / site.stepEvery) + 1) * site.stepEvery);
    stepTip = ` · 下一路标 ${next} 阶`;
  }
  // 段奖励（精卫填海）：写明下一段是第几阶、叫什么、给什么——不然「50 阶」只是个数字
  if (Array.isArray(site.segments) && site.segments.length && !done){
    const got = Array.isArray(st.segs) ? st.segs : [];
    const seg = site.segments.find(s2 => got.indexOf(s2.at) < 0);
    if (seg) stepTip += ` · 下一段 ${seg.at} 阶「${seg.name}」`;
  }
  const stepTxt = site.sec >= 3600
    ? `${Math.round(site.sec / 3600)} 小时一阶`
    : `${Math.round(site.sec / 60)} 分一阶`;
  const sub = done
    ? `${site.stages}/${site.stages} 已成 · 可再投`
    : `${stage}/${site.stages}${stepTip} · ${stepTxt}${cost ? ' · 耗 ' + cost : ''}`;
  // 段奖励逐条列在 title 里：玩家点之前就该知道「熬到 100 阶有什么」
  const segTips = Array.isArray(site.segments) ? site.segments.map(s2 => `${s2.at} 阶·${s2.name}：${s2.text}`).join('\n') : '';
  const tip = esc(site.desc) + (segTips ? `\n\n${esc(segTips)}` : '');
  return `<button class="btn ${un && !done?'primary':''}" ${un && !done?'':'disabled'} onclick="startGrow('${key}')"
    title="${tip}">🌱 灌木 ${esc(site.name)}<i>${sub}</i></button>`;
}
// 特殊节点的「地气」：原文设定之外，把它实际影响什么写清楚。
// 尽沙 / 百仞 / 干河三处原先只有一句原文，玩家不知道走进去会怎样。
// 异迹类别 → 该地可遇的见闻 id。**唯一来源**（v1.31.115）：
// 索引的 ✦ 与节点详情的提示都查这张表。此前两处各写一份三元嵌套，
// 加灌木那一条时差点只改了一处——两份口径一旦分叉，玩家会看到「索引说有、详情说没有」。
const HETERO_EVENT = { '观象':'yiji_ling', '观瑞':'yiji_ling', '谒见':'yiji_zhu', '灌木':'yiji_miao' };
if (typeof window !== 'undefined') window.HETERO_EVENT = HETERO_EVENT;

// 此山可遇的见闻（v1.31.114）：站在观象 / 祠 / 灌木之地时，把「在这里接着做事还能撞见什么」
// 写在行动按钮下面。索引那一头已经能在上帝视角看全，这里补的是**脚下这一座山**的视角——
// 「我人都到这儿了，还能得点什么」是玩家此刻最想知道的。
function nodeEventNote(node){
  const kind = (typeof heteroKindAt === 'function') ? heteroKindAt(node && node.id) : '';
  if (!kind) return '';
  const id = HETERO_EVENT[kind];
  if (!id || typeof evNameOf !== 'function') return '';
  const n = (Game.events && Game.events.seen) ? (Game.events.seen[id] || 0) : 0;
  return `<div class="nd-ev-note${n ? ' got' : ''}" title="见闻：${esc(evNameOf(id))}">
    <i>✦</i> 在此处做事${n ? '，已遇见过闻「' : '，有机会遇见闻「'}${esc(evNameOf(id))}${n ? `」（${n} 次）` : '」'}
  </div>`;
}

// 此山此刻的征兆（v1.31.120）：压着活跃征兆时，详情里写明类型、吉凶与还剩多久。
// 顶栏 buff 图标是「全站视角」，这里是「脚下视角」——玩家正看着这座山时，
// 不该要他想起来去点右上角。过往的（已过期）不显示，避免详情页堆尸体。
function nodeOmenNote(node){
  if (typeof activeOmenAt !== 'function') return '';
  const d = activeOmenAt(node && node.id);
  if (!d) return '';
  const ago = Math.max(0, (d.until || 0) - (typeof gameTime === 'function' ? gameTime() : 0));
  const mark = d.polarity === '凶' ? '🔴' : d.polarity === '吉' ? '🟢' : '🟡';
  const rem = (typeof fmtDur === 'function') ? fmtDur(ago) : Math.round(ago / 60) + ' 分';
  return `<div class="nd-omen-note ${d.polarity === '凶' ? 'bad' : 'good'}">${mark} 征兆·${esc(d.type)}（${esc(d.beast)}）压着此山 · ${rem} 后应验期满</div>`;
}

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
    // 「六小时一转」只说周期不说进度，玩家到了教山才发现正赶上旱季就晚了。
    // 文案统一由 seasonLineText 生成（顶栏 / 山志 / 统计页共用一份）。
    tags.push((typeof seasonLineText === 'function') ? seasonLineText() : '渔获随旱雨涨落（六小时一转）');
  }
  return `<div class="special-note">★ ${esc(sp.note||'')}${tags.length
    ? `<div class="geo-tags">${tags.map(t=>`<span class="geo-tag">${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
}
function nodeMythBlock(node){
  if (!node.myth) return '';
  return `<div class="myth-block"><b>神话</b>${esc(node.myth.figure?node.myth.figure+'：':'')}${esc(node.myth.content||'')}</div>`;
}
// 采集技能 → 产出节点（用于技能页一键前往）
// ⚠️ v1.31.50：此前只给池里第一件物的**主产地**——「金」明明产于 42 座山，
// 技能卡却只写「招摇之山」。现在走引擎的 skillSourceNodes（候选集）
// 与 pickReachableNode（挑一处现在能去的），与采集、图鉴两层同源。
function codexNode(e){
  if (!e) return null;
  const nodeId = (typeof codexReachableNode === 'function') ? codexReachableNode(e) : null;
  if (!nodeId) return null;
  for (const r of (WORLD.regions||[])){
    const n = (r.nodes||[]).find(nn=>nn.id===nodeId);
    if (n) return { nodeId:n.id, regionId:r.regionId };
  }
  return null;
}
// 遗物加成的人话版：{ xp:0.02 } → 「经验 +2%」
function relicText(r){
  const NAME = { xp:'经验', yield:'采获', def:'防御', hp:'气血' };
  return Object.entries(r.bonus || {}).map(([k, v]) => `${NAME[k] || k} +${Math.round(v * 100)}%`).join(' · ');
}

// 见闻名字查询给测试与浮层用（同文件内的索引渲染直接调）
if (typeof window !== 'undefined') window.evNameOf = evNameOf;
