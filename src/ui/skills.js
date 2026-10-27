// ===== ui/skills.js — 技能页（技能卡 / 配方 / 田地 / 三签 / 轮回） =====
// 由 ui/world.js 拆分而来（v1.31.104）。

// 以下三组自 ui/world.js 拆分而来（v1.31.104）：技能材料的产地定位、配方式样记忆与滚动保持，
// 都只服务于技能页（图鉴 / 行囊的浮层也复用 nodeForSkill 系）。
function nodeForSkill(skillId){
  const nodeId = (typeof skillReachableNode === 'function') ? skillReachableNode(skillId) : null;
  if (!nodeId) return null;
  for (const r of (WORLD.regions||[])){
    const n = (r.nodes||[]).find(nn=>nn.id===nodeId);
    if (n) return { nodeId:n.id, regionId:r.regionId };
  }
  return null;
}
// 制作技能 → 所需材料来源节点（取首个有产地的材料）
function materialNodeForSkill(skillId){
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes){
    for (const c of (r.cost||[])){
      const it = Items[c[0]];
      if (!it) continue;
      // 走引擎的 materialReachableNode：候选集含 nodes[] 全集，且优先给已解锁的那处
      const nid = (typeof materialReachableNode === 'function') ? materialReachableNode(c[0]) : it.node;
      if (!nid) continue;
      for (const reg of (WORLD.regions||[])){
        const n = (reg.nodes||[]).find(nn=>nn.id===nid);
        if (n) return { nodeId:n.id, regionId:reg.regionId, itemName:it.name };
      }
    }
  }
  return null;
}
// 制作技能 → 所有材料来源节点（去重，按节点）
// ⚠️ v1.31.50：此前每种材料只认 it.node（主产地），于是 18 处「材料来源」按钮
// 指向锁着的山，而同一材料在别的山早就能采。改为走引擎候选集
// （materialSourceNodes），并把**已解锁的产地排在前面**——
// 材料来源是玩家照着采的清单，指着去不了的山等于没有指路。
function materialNodesForSkill(skillId){
  const out = [];
  const seen = {};
  const recipes = (typeof Recipes!=='undefined' && Recipes || []).filter(r=>(typeof RECIPE_SKILL!=='undefined' && RECIPE_SKILL[r.type])===skillId);
  for (const r of recipes){
    for (const c of (r.cost||[])){
      const it = Items[c[0]];
      if (!it) continue;
      // 该材料的候选产地：nodes[] 全集 + 主产地
      const cands = (typeof materialSourceNodes === 'function') ? materialSourceNodes(c[0]) : (it.node ? [it.node] : []);
      if (!cands.length) continue;
      // 已解锁的排前面；同解锁状态按门槛由低到高
      const ordered = cands.slice().sort((a, b)=>{
        const na = nodeOf(a), nb = nodeOf(b);
        const oa = na && nodeUnlocked(na) ? 0 : 1, ob = nb && nodeUnlocked(nb) ? 0 : 1;
        if (oa !== ob) return oa - ob;
        const la = na && typeof na.unlockLevel === 'number' ? na.unlockLevel : 99;
        const lb = nb && typeof nb.unlockLevel === 'number' ? nb.unlockLevel : 99;
        return la - lb;
      });
      for (const nid of ordered){
        const key = it.id + '|' + nid;
        if (seen[key]) continue;
        seen[key] = true;
        for (const reg of (WORLD.regions||[])){
          const n = (reg.nodes||[]).find(nn=>nn.id===nid);
          if (n){ out.push({ nodeId:n.id, regionId:reg.regionId, itemName:it.name, nodeName:n.name, ok:nodeUnlocked(n) }); break; }
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
// ⚠️ 山川类的条目 id **就是** nodeId（buildCodex 里 put({ id: node.id, cat:'山川' })），
// 原先只按「异兽取 monster.nodeId、其余取 Items[id].node」找节点——山川这一类
// Items 里根本没有同名物品，于是 447 条山川永远查不到节点，详情页也就没有「前往」，
// 图鉴里的山川类（占全图鉴四成）成了唯一指不了路的分类。
//
// ⚠️ v1.31.49：百物类此前只认 Items[id].node（主产地），而采集那边（v1.31.48）
// 已经改成认 nodes[] 全集 —— 同一件事两个口径。46 件物的主产地锁着、别的山已开着，
// 图鉴却指着主产地说「需 41 级」，玩家以为要练到 41 级。
// 现在产地候选集统一由引擎的 codexSourceNodes 给，这里只负责挑一处并补上 regionId。

function pickRecipeKind(){
  // 判定在引擎层（game.js 的 defaultRecipeKind）：只有一处定义，测试也能直接跑
  if (typeof defaultRecipeKind === 'function') return defaultRecipeKind();
  return 'burn';
}

// 整块重绘会丢滚动位置：配方面板在技能页下半部，点一次分类就弹回顶部，
// 得重新往下翻——这是最典型的「每用一次烦一次」。重绘前后把纵向位置搬回去。
function keepScroll(fn){
  const c = (typeof document !== 'undefined') ? document.getElementById('content') : null;
  const w = (typeof window !== 'undefined' && window.pageYOffset) ? window.pageYOffset : 0;
  const cy = c ? c.scrollTop : 0;
  try { fn(); } finally {
    const c2 = (typeof document !== 'undefined') ? document.getElementById('content') : null;
    if (c2) c2.scrollTop = cy;
    if (w && typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, w);
  }
}

UI.setRecipeKind = function(k){
  if (!ActionKinds[k] || ActionKinds[k].mode !== 'recipe') return;
  this.recipeSkill = k;
  if (typeof Prefs !== 'undefined' && Prefs) Prefs.recipeSkill = k;   // 记住这次选择
  keepScroll(() => this.renderSkills());
};

// 只重建配方面板会丢输入焦点：每敲一个字就 renderSkills() 会把输入框整个换掉。
// 重绘后把焦点与光标位置搬回去，滚动位置也一并保持。
UI.patchRecipeList = function(){
  const el = (typeof document !== 'undefined') ? document.activeElement : null;
  const typed = el && el.id === 'recipeQ';
  const pos = typed && el.selectionStart != null ? el.selectionStart : null;
  keepScroll(() => this.renderSkills());
  if (typed){
    const n = (typeof document !== 'undefined') ? document.getElementById('recipeQ') : null;
    if (n && n.focus){
      n.focus();
      if (pos != null && n.setSelectionRange) { try { n.setSelectionRange(pos, pos); } catch (e) {} }
    }
  }
};

// 技能卡浮层的内容（v1.31.90 从 renderSkills 的内联模板里抽出来）。
// 抽出来的唯一理由：它此前是 26 份隐藏 DOM，占技能页 HTML 的六成、切页 197ms。
// 现在由 Tip 层在「点开那一刻」调用一次，每次只生成一份。
// ⚠️ 这里允许读 Game 的即时状态（材料持有、下一阶解锁），因为它是**打开时才求值**的——
//    比内联版本还准一点：内联那份是整页渲染那一刻的快照。
function skillTipHtml(id){
  const sk = (typeof Skills !== 'undefined' && Skills[id]) ? Skills[id] : { id, name:id, desc:'' };
  const nf = (typeof nodeForSkill === 'function') ? nodeForSkill(id) : null;
  const mns = nf ? null : ((typeof materialNodesForSkill === 'function') ? materialNodesForSkill(id) : null);
  const mst = nf ? null : ((typeof materialStatusForSkill === 'function') ? materialStatusForSkill(id) : null);
  // 材料来源：每项材料列出产地，已解锁的排前面；锁着的写明门槛（v1.31.50）
  const matBtns = (mns && mns.length) ? `<div class="mat-src">材料来源：${mns.slice(0,3).map(m=>`<button class="btn-mini skill-go ${m.ok?'':'lock'}" title="${esc(m.itemName)}·${esc(m.nodeName||'')}${m.ok?'':'（尚未开通）'}"
    onclick="UI.selRegion='${m.regionId}';UI.selNode='${m.nodeId}';UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} ${esc(m.itemName)}·${esc(m.nodeName||'')}</button>`).join('')}${mns.length>3?`<span class="hint">等 ${mns.length} 处</span>`:''}</div>` : '';
  const matInv = (mst && mst.length) ? `<div class="mat-inv">${mst.map(m=>`<span class="${m.ok?'ok':'gap'}">${typeof itemIc==='function'?itemIc(m.id,13):''}${esc(m.name)} ${m.have}/${m.need}${m.ok?(typeof markIcon==='function'?markIcon('check',12):'✓'):(typeof markIcon==='function'?markIcon('warn',12):'✗')}</span>`).join(' · ')}</div>` : '';
  const srcNodes = (typeof skillSourceNodes === 'function') ? skillSourceNodes(id) : [];
  const outBtn = nf
    ? `<button class="btn-mini skill-go" title="${esc((nodeOf(nf.nodeId)||{}).name||'')}${srcNodes.length>1?` 等 ${srcNodes.length} 山`:''}" onclick="UI.selRegion='${nf.regionId}';UI.selNode='${nf.nodeId}';UI.switchTab('yudi')">${typeof markIcon==='function'?markIcon('pin',13):'📍'} 产出地</button>${srcNodes.length>1?`<span class="hint">${esc((nodeOf(nf.nodeId)||{}).name||'')} 等 ${srcNodes.length} 山</span>`:''}`
    : '';
  const nx = (typeof nextUnlocks === 'function') ? nextUnlocks(id, 6) : [];
  const nextBlock = nx.length
    ? `<div class="sc-next" title="再练几级便能采到 / 做到"><b>将至</b>${esc(nextUnlockText(nx))}</div>` : '';
  return `<div class="sc-desc">${esc(sk.desc||'')}</div>${outBtn}${matBtns}${matInv}${nextBlock}`;
}
if (typeof window !== 'undefined') window.skillTipHtml = skillTipHtml;

UI.renderSkills = function(){
  const box = $('content');
  if (!box) return;
  const groups = { all:'全部', gathering:'采集', processing:'制作', combat:'武备', taofa:'征伐', fangguo:'方国', yushi:'驭使' };
  const filter = this.skillFilter;
  let ids = [];
  for (const g in SKILL_GROUPS){
    if (filter === 'all' || filter === g) ids = ids.concat(SKILL_GROUPS[g].ids);
  }
  // 分类：手动选过就留住，没选过按「能做的最高级配方」自动定
  if (!this.recipeSkill || !ActionKinds[this.recipeSkill] || ActionKinds[this.recipeSkill].mode !== 'recipe'){
    this.recipeSkill = (Prefs && Prefs.recipeSkill && ActionKinds[Prefs.recipeSkill]) ? Prefs.recipeSkill : pickRecipeKind();
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
      // 方块：图标 + 名 + 阶位，右上角等级，底部一条经验进度。
      // ⚠️ 浮层内容**不再内联**（v1.31.90）：26 张卡每张都塞一份隐藏的
      // 「描述 + 产出地 + 材料来源 + 持有缺口 + 将至」，那是 153KB HTML 里的六成，
      // 技能页切页因此要 197ms（全站最慢）。改成点开时再生成（见 skillTipHtml）。
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
        <span class="tip-body hidden" data-tip-lazy="skill:${id}"></span>
      </div>`;
    }).join('')}
  </div>

  <div class="panel recipe-panel">
    <h3>制作配方</h3>
    <div class="filter-row">
      ${Object.entries(ActionKinds).filter(([k,d])=>d.mode==='recipe').map(([k,d])=>
        `<button class="chip-btn ${this.recipeSkill===k?'on':''}" onclick="UI.setRecipeKind('${k}')">${typeof skillIcon==='function'?skillIcon(k,15):d.icon} ${d.label}</button>`).join('')}
      <label class="search-box" title="按产物名 / 注音检索 · 跨全部技艺">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
        <input id="recipeQ" type="search" placeholder="检索配方" value="${esc(this.recipeQuery||'')}"
          oninput="UI.recipeQuery=this.value;UI.patchRecipeList()"
          onkeydown="if(event.key==='Escape'){this.value='';UI.recipeQuery='';UI.patchRecipeList()}">
      </label>
    </div>
    <div class="tile-grid recipe-grid">
    ${(()=>{
      // 有检索词时跨全部分类找：玩家常记得「山海图卷」却忘了它在琢玉还是炼药。
      // 无检索词时仍只听分类——分类是主浏览方式，不该被搜索框的存在感稀释。
      const q = String(this.recipeQuery || '').trim().toLowerCase();
      let list;
      if (q){
        list = Recipes.filter(r=>{
          const it = Items[r.out] || {};
          return String(it.name || r.out).toLowerCase().includes(q)
            || String(it.py || '').toLowerCase().includes(q)
            || String(r.out).toLowerCase().includes(q);
        });
      } else {
        list = Recipes.filter(r=>r.type===this.recipeSkill);
      }
      // 排序分两段：先「已解锁」按等级降序（现在能做的高级货在前），再「未解锁」按升序
      // （离解锁最近的在未解锁段顶部）。原先一律升序，玩家每次想做高阶配方都要滚到底。
      // 排序分三段，按「玩家此刻的处境」排，而不是按等级一刀切：
      //   0 级够料够 → 点开就能做，等级降序（手头最高级的先在手边）
      //   1 级够料缺 → 正是要去凑料的那件，仍排前段（等级降序）
      //   2 级不够   → 等级升序，离解锁最近的在前
      // 原先一律升序，做高阶配方每次都要滚到底；一刀切两段又会把「缺料的 1 级木戈」
      // 顶到第一行，挡住真正要做的 26 级赤金钺。
      const lvOf = r => levelOf(mapRecipeSkill(r.type));
      const grp = r => (lvOf(r) < r.lvl ? 2 : (canAfford(r.cost) ? 0 : 1));
      list.sort((a, b) => {
        const ga = grp(a), gb = grp(b);
        if (ga !== gb) return ga - gb;
        return ga === 2 ? a.lvl - b.lvl : b.lvl - a.lvl;
      });
      return list.map(r=>{
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
        <span class="tip-body hidden"><div class="rc-cost">${costChips(r.cost)}</div>${specialCostLine(r.cost)}<div class="rc-xp">经验 ${r.xp}</div>${!lvOk?`<div class="hint ${r.lvl - levelOf(mapRecipeSkill(r.type)) <= 2 ? 'near' : ''}">再升 ${r.lvl - levelOf(mapRecipeSkill(r.type))} 级（${sk.name} ${r.lvl}）</div>`:''}</span>
      </div>`;
        }).join('') || `<div class="hint">${q ? '没有对上的配方' : '此栏暂无配方'}</div>`;
    })()}
  </div>
    </div>
  </div>

  <div class="panel farm-panel">
    <h3><span class="fp-title">圃艺 · 田地</span><span class="farm-lv" id="farmPuyiLv">${farmLevelText()}</span><button class="btn small gear-best" type="button" onclick="UI.plantAll()">一键种植</button></h3>
    <div class="tile-grid farm-grid">
    ${farmTilesHtml()}
    </div>
  </div>

  ${(typeof rebirthCount === 'function') ? (() => {
    const cnt = rebirthCount();
    const gain = Math.round(rebirthGain() * 100);
    const yl = Math.round(rebirthYield() * 100);
    const start = rebirthStartLevel();
    // 这一行要跟 canRebirth 同源：算的是「会被重置的技艺」里的最高者，
    // 否则会出现「舆地 81/81」却轮回不了的怪状。
    const best = (typeof bestRebirthSkill === 'function') ? bestRebirthSkill() : bestSkillLevel();
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
        const all = window.RELICS || [];
        if (!all.length) return '';
        const owned = (typeof relicOwned === 'function') ? relicOwned() : [];
        const ownedIds = new Set(owned.map(r => r.id));
        const next = all.find(r => r.at > cnt);
        return `<details class="relic-box">
          <summary>前世遗物 <b>${owned.length}</b> / ${all.length}${next ? ` · 下一件「${esc(next.name)}」在第 ${next.at} 转` : ' · 皆已归于掌中'}</summary>
          <div class="relic-list">
            ${all.map(r => ownedIds.has(r.id)
              ? `<span class="relic on" title="${esc(r.note || '')}"><b>${esc(r.name)}</b><i>${esc(relicText(r))}</i></span>`
              : `<span class="relic off"><b>？？？</b><i>第 ${r.at} 转</i></span>`).join('')}
          </div>
        </details>`;
      })()}
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
        <ul><li>第 ${cnt} 枚轮回印</li><li>修为 +${gain}%（终身）</li><li>采获 +${yl}%</li><li>起手 ${start} 级</li><li>九九之后可入<b>卷二</b>（难度带 Lv${TUNING.CYCLE.BASE}–${TUNING.CYCLE.BASE + TUNING.CYCLE.TIER - 1}，经验 ×${TUNING.CYCLE.XP}）</li><li>本轮 ${fmtTime(Math.max(0, Math.round((Date.now() - ((Game.rebirth && Game.rebirth.startedAt) || Game.startedAt || Date.now())) / 1000)))} 入册</li></ul></div>
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

// 圃艺等级与经验：就写在田地标题旁——玩家站在田边最想知道的不是「我几级」，
// 而是「还差多少升下一级、下一块田几级开」。两者都放进这一行。
function farmLevelText(){
  const sk = (Game.skills && Game.skills.puyi) || { level:1, xp:0 };
  const lv = sk.level || 1;
  const xc = (typeof xpForLevel === 'function') ? xpForLevel(lv) : 0;
  const xn = (typeof xpForLevel === 'function') ? xpForLevel(lv + 1) : 0;
  const cur = Math.max(0, (sk.xp || 0) - xc);
  const need = Math.max(0, xn - xc);
  // 只写「等级 + 分子/分母」：手机上标题行很窄，写全整句会挤成三行竖排，
  // 反而看不出还差多少（百分比与「下一块田」在 skill tile / 开垦提示里已有）。
  return `Lv ${lv} · ${fmt(cur)}/${fmt(need)}`;
}

// 配方里含「系产」时，卡片悬停点一句：这几件不是随处可采，走遍该系才有。
// 详情页会写完整指路（还差几山），这里只给一行——卡片浮层塞不下更多。
function specialCostLine(cost){
  if (typeof pilgrimGiftIndex !== 'function') return '';
  const idx = pilgrimGiftIndex();
  const bits = [];
  for (const [id] of (cost || [])){
    const reg = idx.get(id);
    if (reg) bits.push(`${(Items[id] || {}).name || id}（${reg.regionName}）`);
  }
  if (!bits.length) return '';
  return `<div class="rc-sub sp-cost">★ 系产：${bits.join('、')} · 走遍该系可得</div>`;
}

// 田地方块 HTML（整页渲染与就地补绘共用）
function farmTilesHtml(){
  const plots = (typeof farmPlots === 'function') ? farmPlots() : (TUNING.FARM_PLOTS || 6);
  const maxPlots = TUNING.FARM_MAX || plots;
  const nextLv = (typeof nextPlotLevel === 'function') ? nextPlotLevel() : 0;
  const locked = Array.from({ length: Math.max(0, maxPlots - plots) }, (_, i) => {
    // 待垦：只露一块，写清「几级可垦」，免得玩家以为田就这么多
    if (i > 0) return '';
    return `<div class="tile farm-tile locked" title="圃艺 ${nextLv} 级可开垦">
      <span class="tile-ic">🔒</span>
      <span class="tile-nm">待垦</span>
      <span class="tile-tag">${nextLv} 级</span>
    </div>`;
  }).join('');
  return Array.from({length:plots}, (_,i)=>{
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
  }).join('') + locked;
}

// 择种浮层：方卡点按后列出行囊可用嘉种；未持有 / 未达等级的置灰并说明原因
UI.seedMenu = function(slot){
  const lv = levelOf('puyi');
  const seeds = Object.values(Items).filter(s=>s.crop).sort((a,b)=>(a.lvl||1)-(b.lvl||1));
  if (!seeds.length){ this.toast('此地无嘉种可植'); return; }
  const emptyN = (typeof farmPlots === 'function' ? farmPlots() : (TUNING.FARM_PLOTS||6))
    - Object.keys(Game.farms).length;
  const rows = seeds.map(s=>{
    const have = Game.inventory[s.id]||0;
    const lvOk = lv >= (s.lvl||1);
    const ok = have > 0 && lvOk;
    // 「全种」：把所有空田都种上这一种。原来只能一格格点择种，
    // 手里四十枚稌籽要种六块田，得开关六次弹窗。
    const bulkN = Math.min(have, Math.max(0, emptyN));
    return `<div class="seed-row-wrap">
      <button type="button" class="seed-row ${ok?'':'lock'}" ${ok?`onclick="UI.pickSeed('${slot}','${s.id}')"`:'disabled'}>
        <span class="sr-ic">${typeof itemIc==='function'?itemIc(s.id,16):(s.icon||'🌱')}</span>
        <span class="sr-nm">${esc(s.name)}</span>
        <span class="sr-meta">${lvOk?`持有 <b>${have}</b>`:`需圃艺 ${s.lvl} 级`}</span>
      </button>
      ${ok && bulkN >= 2 ? `<button type="button" class="btn tiny seed-all" title="把 ${bulkN} 块空田都种上${esc(s.name)}"
        onclick="UI.plantAllOf('${s.id}')">全种</button>` : ''}
    </div>`;
  }).join('');
  this.modal(`<h3>择种 · 田 ${parseInt(slot.slice(1))+1}</h3>
    <p class="hint">点选即植入此田，消耗一枚种子；右侧「全种」把所有空田（${Math.max(0, emptyN)} 块）都种上它。</p>
    <div class="seed-list">${rows}</div>
    <div class="modal-btns"><button class="btn ghost" onclick="UI.closeModal()">再想想</button></div>`);
};
// 全种：所有空田依次种同一种种子，直到种子告罄或田满
UI.plantAllOf = function(seedId){
  const seed = Items[seedId];
  if (!seed || !seed.crop) return;
  if (levelOf('puyi') < (seed.lvl||1)){ this.toast(`需圃艺 ${seed.lvl} 级`); return; }
  const plots = (typeof farmPlots === 'function') ? farmPlots() : (TUNING.FARM_PLOTS || 6);
  let n = 0;
  for (let i = 0; i < plots; i++){
    if ((Game.inventory[seedId]||0) <= 0) break;
    if (Game.farms['p'+i]) continue;
    if (plantSeed('p'+i, seedId, true)) n++;
  }
  this.closeModal();
  if (this.currentTab === 'skills') this.renderSkills();   // 别在别的页上重绘技能页
  this.toast(n ? `🌱 ${seed.name} 种下 ${n} 田` : '没有空田，或种子已用尽');
};
UI.pickSeed = function(slot, id){
  if (plantSeed(slot, id)){ this.closeModal(); this.renderSkills(); }
};
// 一键种植：按「价值优先、圃艺达标、确有存种」把空田依次种满，种到没有可用种子为止。
// 单田仍可点按择种（换种、指定某田）；这里只负责「懒得一格格点」的日常。
UI.plantAll = function(){
  const empty = [];
  const _plots = (typeof farmPlots === 'function') ? farmPlots() : (TUNING.FARM_PLOTS || 6);
  for (let i = 0; i < _plots; i++) if (!Game.farms['p'+i]) empty.push('p'+i);
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
// 圃艺升级后新田开垦：只在「块数真的变了」时提示一次
UI.checkFarmUnlock = function(){
  if (typeof farmPlots !== 'function') return;
  const now = farmPlots();
  const seen = Game.stats.farmPlotsSeen;
  if (seen === undefined || seen === null){
    Game.stats.farmPlotsSeen = now;      // 首次不提示，避免读档就弹
    return;
  }
  if (now > seen){
    Game.stats.farmPlotsSeen = now;
    this.toast(`🌾 圃艺精进，新开垦 ${now - seen} 块田（共 ${now} 块）`);
    if (typeof log === 'function') log(`🌾 圃艺精进，新垦 ${now - seen} 块田`, 'gold', 'skill');
    if (this.currentTab === 'skills') this.patchFarms();
  }
};

// 田地就地补绘：收获 / 植入后卡片还显示着旧状态，切页才变是不合理的
UI.patchFarms = function(){
  if (this.currentTab !== 'skills') return;
  const grid = document.querySelector('#content .farm-grid');
  if (grid) grid.innerHTML = farmTilesHtml();
};
// 每秒轻量跟进：只改进度条宽度、剩余时间与成熟态，不重建 DOM（不打断悬停浮层）
// ⚠️ 收获后若 DOM 里还留着那块田（Game.farms 已无此格），早先的 `return` 会让它
// 永远停在「0 秒 / 100%」——玩家看到的「最后一块田卡住」就是它。这里发现残留就整块重绘。
UI.patchFarmsProgress = function(){
  if (this.currentTab !== 'skills') return;
  let stale = false;
  document.querySelectorAll('#content .farm-tile.growing').forEach(el=>{
    const f = Game.farms[el.dataset.plot];
    if (!f){ stale = true; return; }
    const pct = Math.max(0, Math.min(100, (1 - f.remain/f.grow)*100));
    const ripe = pct >= 100;
    el.classList.toggle('ripe', ripe);
    const ic = el.querySelector('.tile-ic');
    if (ic) ic.textContent = ripe ? '🌾' : pct > 50 ? '🌿' : '🌱';
    const bar = el.querySelector('.ft-bar i');
    if (bar) bar.style.width = pct.toFixed(0) + '%';
    const tag = el.querySelector('.tile-tag');
    if (tag) tag.textContent = fmtTime(Math.max(0, f.remain)/Math.max(0.1,farmSpeedMult()));
  });
  if (stale) this.patchFarms();
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
    // v1.31.48：产地与等级判据与引擎同源（多产地、越级都认），
    // 否则这一行给出的离线预估会与真实结算对不上。
    if (it && gatherAllowedAt(it, Game.node) && gatherAllowed(it).ok){
      const gate = gatherAllowed(it);
      const times = Math.floor(sec / 1);               // 采集基础间隔 ≈1s
      xp += Math.round(it.xp * times * eff * gate.eff);
      const q = Math.floor(times * 1.4 * eff * gate.eff);
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

