// ===== src/ui/hud.js — 顶栏与增益一览 =====
// 从 ui/core.js 搬来（v1.31.88，拆分第三步）。搬的是一整块「自成一体」的东西：
//   书脊上的数字（贝币 / 技艺总和 / 著录进度 + 进度线 + 名号）
//   书脊右上角的增益图标与它的浮层（临时增益 / 御使 / 征兆 / 烽烟）
//
// 为什么是这块：它是全项目**刷新最频繁**的一段——`renderTopbar` 每 500ms 被调一次，
// 挂机一晚就是 5.7 万次。它也是最讲究「同值不写」的一段（每次写 textContent 都会触发
// 一次属性变更与样式重算）。放在 core.js 里，想单独审这段的人得先翻过 700 行别的。
//
// ⚠️ 加载顺序：必须排在 ui/core.js 之后（$ / esc / fmt / fmtTime / fmtClock / shortLeft
//    这些工具函数都还住在 core.js 里），且要在任何会调 UI.renderTopbar 的代码之前。
//    顺序由 index.html 决定，与下面的注释一起作为唯一依据。
//
// 搬家的验收方式：把 buffSummary / buffPopHtml 在四组状态下的返回值 dump 出来逐字符比对
// （空档 / 有临时增益 / 御使+征兆+烽烟 / 满档），不是看截图。

// 增益归拢：临时增益 / 御使异兽 / 生效征兆。原先挤在仪表带上（「🐾 御使 2 · ⚡ 征兆 3」），
// 既占地方又读不全；现在收进书脊右上角一枚图标，点开浮层逐条列清。
UI.buffSummary = function(){
  const temp = [];
  if (Game.buff && Game.buff.def){
    temp.push({
      name: Game.buff.def.name || '临时增益',
      desc: buffDefText(Game.buff.def),
      left: Math.max(0, Game.buff.remaining || 0),
    });
  }
  const beasts = [];
  Object.values(Game.deployed).filter((v,i,a)=>a.indexOf(v)===i).forEach(id=>{
    const b = Monsters[id]; if (!b) return;
    const def = (typeof BEAST_BUFFS!=='undefined' && BEAST_BUFFS[id]) ||
                (typeof genericBeastBuff==='function' ? genericBeastBuff(b) : null);
    beasts.push({ name: b.name, desc: def ? buffDefText(def) : '', label: def && def.label || '' });
  });
  const omens = [];
  (Game.omens || []).forEach(o=>{
    const d = (typeof OMENS!=='undefined') && OMENS[o.id];
    if (!d) return;
    omens.push({
      name: d.beast || d.type || '征兆',
      pol: d.polarity === '凶' ? '凶' : d.polarity === '吉' ? '吉' : '中',
      // 去掉 omenEffectText 自带的有效期括注（右侧已单列剩余时间）
      desc: (typeof omenEffectText === 'function') ? omenEffectText(d).replace(/（[^）]*）/g, '') : (d.desc || ''),
      left: o.until ? Math.max(0, o.until - gameTime()) : 0,
    });
  });
  // 烽烟：已举烽、尚未应验的凶兆（烽火台建成后才有）。单列一段，
  // 与「已生效」分开——玩家要知道的是「还有多久落下」，不是「已经中了」。
  const pending = [];
  (Game.omensPending || []).forEach(p => {
    const d = (typeof OMENS !== 'undefined') && OMENS[p.id];
    if (!d) return;
    pending.push({
      name: d.beast || d.type || '凶兆',
      pol: '凶',
      desc: (typeof omenEffectText === 'function' ? omenEffectText(d).replace(/（[^）]*）/g, '') : (d.desc || '')),
      left: Math.max(0, p.at - gameTime()),
    });
  });
  return { temp, beasts, omens, pending,
           count: temp.length + beasts.length + omens.length + pending.length };
};
// 书脊上的增益图标：有增益时亮起并带计数，没有时只是暗淡的常驻入口
UI.renderBuffBtn = function(){
  const btn = $('buffBtn'), n = $('buffCount');
  if (!btn) return;
  const s = this.buffSummary();
  // 这里每 500ms 被调一次（顶栏刷新）。同值写 textContent / title / classList
  // 都会触发一次属性变更与样式重算，挂机一晚毫无意义——先比后写。
  if (n){
    // 只有一项临时增益时，角标直接报剩余时间——否则玩家得点开浮层才知道「窥山」还剩多久，
    // 900 秒的增益等于白吃。多于一项目才退回计数（时间塞不下）。
    const one = s.temp.length === 1 && s.count === 1 && s.temp[0].left > 0;
    const txt = one ? shortLeft(s.temp[0].left) : (s.count > 99 ? '99+' : String(s.count));
    if (n.textContent !== txt) n.textContent = txt;
    const wide = n.classList.contains('bb-time') !== one;
    if (wide) n.classList.toggle('bb-time', one);
    const hide = s.count === 0;
    if (n.classList.contains('hidden') !== hide) n.classList.toggle('hidden', hide);
  }
  const on = s.count > 0;
  if (btn.classList.contains('on') !== on) btn.classList.toggle('on', on);
  const title = on ? `增益一览（${s.count} 项）` : '增益一览（当前无）';
  if (btn.title !== title) btn.title = title;
  // 浮层开着就连带刷新：增益 / 征兆到期时展开层的内容要跟上（倒计时尤其）。
  // 浮层里的倒计时按秒变，500ms 重建纯属浪费，节流到 1 秒。
  const pop = $('buffPop');
  if (pop && !pop.classList.contains('hidden')){
    const now = Date.now();
    if (!this._buffPopAt || now - this._buffPopAt >= 1000){
      this._buffPopAt = now;
      const html = this.buffPopHtml();
      if (pop._buffSig !== html){ pop._buffSig = html; pop.innerHTML = html; }
    }
  }
};
// 浮层内容：分三段列清，末尾给两行合计（御使 / 征兆各自的总加成）
UI.buffPopHtml = function(){
  const s = this.buffSummary();
  const item = (title, desc, extra) => `<div class="bp-item"><div class="bp-l1"><b>${esc(title)}</b>${extra || ''}</div>${desc?`<div class="bp-desc">${esc(desc)}</div>`:''}</div>`;
  const sec = (name, n, body) => n ? `<div class="bp-sec"><h4>${name}<i>${n}</i></h4>${body}</div>` : '';

  let html = `<div class="bp-head"><h3>增益一览</h3><button class="bp-x" type="button" title="关闭" onclick="UI.closeBuffPop()">✕</button></div>`;
  if (!s.count){
    html += '<div class="hint bp-empty">当前无增益。<br>御使异兽（著录至「通形」）或著录触发征兆后，加成会汇总在这里。</div>';
  } else {
    html += sec('临时增益', s.temp.length, s.temp.map(t=>
      item(t.name, t.desc, t.left ? `<span class="bp-time">${fmtTime(t.left)}</span>` : '')).join(''));
    html += sec('御使', s.beasts.length, s.beasts.map(b=>
      item(b.name, b.desc || b.label)).join(''));
    html += sec('烽烟（将起）', s.pending.length, s.pending.map(o=>
      item(o.name, o.desc, `<span class="bp-pol 凶">凶</span><span class="bp-time warn">${fmtClock(o.left)} 后</span>`)).join(''));
    html += sec('征兆', s.omens.length, s.omens.map(o=>
      item(o.name, o.desc, `<span class="bp-pol ${o.pol}">${o.pol}</span>${o.left?`<span class="bp-time">${fmtTime(o.left)}</span>`:''}`)).join(''));
    const dBonus = (typeof deployedBonuses === 'function') ? bonusTextOf(deployedBonuses()) : '—';
    const oBonus = omenBonusText();
    html += `<div class="bp-agg"><div><span>御使合计</span><b>${esc(dBonus)}</b></div><div><span>征兆合计</span><b>${esc(oBonus)}</b></div></div>`;
  }
  return html;
};
UI.openBuffPop = function(){
  const btn = $('buffBtn'), pop = $('buffPop');
  if (!btn || !pop) return;
  pop.innerHTML = this.buffPopHtml();
  pop.classList.remove('hidden');
  // 贴着图标下沿、右对齐；宽度与高度都按视口收一下，窄屏不至于顶到边
  const r = (btn.getBoundingClientRect ? btn.getBoundingClientRect() : { bottom:0, right:0 });
  const vw = window.innerWidth || 360, vh = window.innerHeight || 640;
  pop.style.width = Math.min(300, Math.max(240, vw - 20)) + 'px';
  pop.style.right = Math.max(10, vw - r.right) + 'px';
  pop.style.top = Math.round(r.bottom + 8) + 'px';
  pop.style.maxHeight = Math.max(160, vh - r.bottom - 24) + 'px';
  btn.classList.add('on');
  if (btn.setAttribute) btn.setAttribute('aria-expanded', 'true');
};
UI.closeBuffPop = function(){
  const btn = $('buffBtn'), pop = $('buffPop');
  if (pop) pop.classList.add('hidden');
  if (btn){ if (btn.setAttribute) btn.setAttribute('aria-expanded', 'false'); btn.classList.toggle('on', this.buffSummary().count > 0); }
};
UI.toggleBuffPop = function(){
  const pop = $('buffPop');
  if (pop && !pop.classList.contains('hidden')) this.closeBuffPop();
  else this.openBuffPop();
};

// ---------- 顶栏 / 状态栏 ----------
UI.renderTopbar = function(){
  const set = (id, v)=>{
    const e = $(id); if (!e) return;
    const s = String(v);
    if (e.textContent === s) return;      // 未变则不打扰
    e.textContent = s;
    if (e.classList){
      e.classList.remove('bump');
      void e.offsetWidth;                 // 重排以重启高亮
      e.classList.add('bump');
      if (typeof clearTimeout === 'function') clearTimeout(e._bumpT);
      if (typeof setTimeout === 'function') e._bumpT = setTimeout(()=>e.classList.remove('bump'), 520);
    }
  };
  set('shellCount', fmt(Game.shells));
  set('totalLevel', totalSkillLevel());
  const recTotal = Object.keys(CODEX).length, recDone = recordedCount();
  set('recordCount', `${recDone} / ${recTotal}`);
  // 「已录」下的细进度线：让 0/632 这种数字有一个可感知的比例
  const meter = $('recordMeter');
  if (meter) meter.style.width = (recTotal ? Math.min(100, recDone / recTotal * 100) : 0).toFixed(1) + '%';
  // 境界胶囊（v1.31.170）：当前境界名常驻书脊；攒够修为时染朱提示「可突破」，
  // 点击跳百科（onclick 在 index.html 上）。读不到境界函数时静默跳过（测试桩兜底）。
  if (typeof currentRealm === 'function'){
    const rc = $('realmName'), rs = $('realmStat');
    if (rc && rs){
      const cur = currentRealm();
      const ready = (typeof canBreakthrough === 'function') && canBreakthrough();
      set('realmName', (cur ? cur.name : '—') + (ready ? ' ·可突破' : ''));
      rs.classList.toggle('ready', !!ready);
      // 胶囊悬停正文（v1.31.171）：随进度刷新，让 hover 就能看到「还差多少修为」
      const tb = document.getElementById ? document.getElementById('realmTipBody') : null;
      if (tb && typeof Game !== 'undefined'){
        const nx = (typeof nextRealm === 'function') ? nextRealm() : null;
        const xp = (Game.stats && Game.stats.totalXp) || 0;
        const rows = [`当前 <b>${cur ? cur.name : '—'}</b> · 修炼效率 <b>+${Math.round((cur ? cur.bonus : 0) * 100)}%</b>`];
        if (nx){
          rows.push(`下一阶 <b>${nx.name}</b> · 还差 <b>${fmt(Math.max(0, nx.need - xp))}</b> 修为`);
          rows.push(ready ? '<b class="rt-ready">已可突破——去「技能 · 修行」打坐</b>' : '攒够后于打坐中突破。');
        } else {
          rows.push('已是已知最高境界。');
        }
        const html = rows.map(r=>`<div>${r}</div>`).join('');
        if (tb.innerHTML !== html) tb.innerHTML = html;
      }
    }
  }
  // 名号：没设昵称时也显示默认名号（顶栏空一块比「默认名」更像 bug）。
  // 超长截断交给 CSS，title 里放全名——手机上还能长按看。
  const nt = $('nickTag');
  if (nt){
    const nn = (typeof playerName === 'function') ? playerName() : ((Game.nickname || '').trim() || '著录客');
    if (nt.textContent !== nn) nt.textContent = nn;
    nt.title = nn;
    nt.classList.remove('hidden');
  }
  // 季节（v1.31.124）：原先书脊上写死「南山经」四个字，永远不变、也不指任何东西。
  // 换成旱 / 雨轮转的季名：它真影响玩法（教山渔获 ±30%、两条季节见闻），
  // 而玩家此前只有在山志里点开节点才看得到——一条影响收益的状态不该藏那么深。
  const sn = $('seasonTag');
  if (sn){
    const wet = (typeof seasonPhase === 'function') && seasonPhase() === 1;
    const name = (typeof seasonName === 'function') ? seasonName() : (wet ? '雨季' : '旱季');
    if (sn.textContent !== name) sn.textContent = name;
    sn.classList.toggle('wet', !!wet);
    // 百分比与「还有多久换季」都来自 seasonLineText()，它内部读 TUNING.SEASON.RIVER。
    // 原先这里写死「+30%」，改数值时顶栏会说谎；v1.31.131 起连措辞也统一了，
    // 顶栏 / 山志 / 统计页三处说的是同一句话，不会「一处说还有 2 时、一处说六小时一转」。
    sn.title = (typeof seasonLineText === 'function')
      ? seasonLineText()
      : (wet ? '雨季' : '旱季') + '（六小时一转）';
  }
  // 增益图标处于书脊最右：这里只更新计数与明暗，内容在点开浮层时才生成。
  this.renderBuffBtn();
};
