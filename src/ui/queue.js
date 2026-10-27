// ===== ui/queue.js — 行动（巡历队列：编排 / 兜底 / 进度） =====
// 由 ui/pack.js 拆分而来（v1.31.118）：队列归队列，行装归 pack，物品详情归 item。
// 加载顺序见 index.html：core 必须最先（UI 对象在这里定义）；跨文件调用的函数与
// 常量都在全局词法环境里，运行时才求值，先后不影响调用。
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
      <h3>巡历队列（${Game.queue.length}/${QUEUE_MAX}）${Game.queue.length?`<span class="h3-more"> · 预计一轮 ≈ ${fmtTime(estimateQueueSeconds())}</span>`:''}</h3>
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
            <input class="qi-qty" type="number" min="1" step="1" value="${e.qty}"
              title="改这一条的数量（改完回车或点别处即生效）"
              onchange="setQueueQty('${e.id}', this.value)">
            <span class="qi-eta">约 ${fmtTime(estimateEntrySeconds(e))}</span>
            ${!st.ok?`<span class="qi-reason">${esc(st.reason)}</span>`:''}
          </span>
          <span class="qi-btns">
            <button class="btn tiny" title="在末尾复制一份" onclick="queueDupWithToast('${e.id}');UI.renderQueue()">⧉</button>
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
        ${(function(){
          // 阻塞项会让队列卡住并转入兜底动作；跑一轮之后这些条目多半已经没意义
          const n = Game.queue.filter(e=>!entryCanRun(e).ok).length;
          return n ? `<button class="btn" title="移除当前跑不通的条目（缺料 / 等级不足 / 目标未解锁）" onclick="queueDropWithToast();UI.renderQueue()">清理阻塞 ${n}</button>` : '';
        })()}
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
        <select id="queueTarget" onchange="UI.queueTarget=this.value">
          ${(()=>{
            // 保持上次选的目标：连加几个任务时，每加一次都从第一个目标重新选，是最烦的那种重复
            const cur = this.queueTarget;
            const has = targets.some(t => t.id === cur);
            return targets.map(t=>`<option value="${t.id}" ${(has ? t.id === cur : t === targets[0]) ? 'selected' : ''}>${esc(t.name)}（${t.lvl}）</option>`).join('');
          })()}
        </select></div>
      <div class="form-row"><span>数量</span><input id="queueQty" type="number" min="1"
        value="${this.queueQty || 10}" oninput="UI.queueQty=Math.max(1,parseInt(this.value)||1)"></div>
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
  this.patchQueueChip && this.patchQueueChip();   // 状态条队列指示：每秒 / 每完成兜底同步，跨页也生效
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
// 状态条里的巡历队列指示：第几项 / 共几项 + 预计剩余（v1.31.146）。
// 与现场融为一体的状态条上，玩家挂机巡历时一眼能看见「现在跑到第几个、这轮还差多久」。
// 放在 patchQueueProgress 顶部随每秒 / 每完成兜底刷新，跨页也生效；tab 限制只管下方队列页补绘。
UI.patchQueueChip = function(){
  const el = $('queueChip');
  if (!el || !el.classList) return;
  const show = Game.queueRunning && Game.queue.length > 0;
  if (!show){ el.classList.add('hidden'); return; }   // add 幂等，真实 DOM 与测试桩都安全
  el.classList.remove('hidden');
  // 受阻优先：这一项跑不动（等级不够 / 材料不足 / 地点不可达）时，
  // 再报「还差多久」是自欺——先说卡住了，原因放 title（芯片上放不下整句）。
  const cur = Game.queue[Game.queueIdx];
  const st = (cur && typeof entryCanRun === 'function') ? entryCanRun(cur) : { ok:true };
  if (!st.ok){
    el.classList.add('warn');
    const w = '队列受阻';
    if (el.textContent !== w) el.textContent = w;
    if (el.title !== (st.reason || '')) el.title = st.reason || '';
    return;
  }
  el.classList.remove('warn');
  const pos = `${Game.queueIdx + 1}/${Game.queue.length}`;
  const rem = (typeof queueRemainSeconds === 'function') ? queueRemainSeconds() : 0;
  // 循环模式标出「第几轮」：否则挂一整夜回来，只看见「队列 3/5」，不知道已经跑完两圈
  const loop = Game.queueLoop ? ` · 第 ${(Game.queueRound|0) + 1} 轮` : '';
  const t = `队列 ${pos}${loop}` + (rem >= 1 ? ` · 约 ${fmtTime(rem)}` : '');
  if (el.textContent !== t) el.textContent = t;
  // 芯片可点（v1.31.156）：title 兼作「点了去哪」的说明；受阻时会被上面的原因文案顶掉，正合用
  const tip = '前往巡历队列';
  if (el.title !== tip) el.title = tip;
};
function addQueueTask(){
  const target = $('queueTarget') ? $('queueTarget').value : (UI.queueTarget || '');
  const qty = $('queueQty') ? (parseInt($('queueQty').value) || 10) : (UI.queueQty || 10);
  if (!target){ UI.toast('请选择目标'); return; }
  UI.queueTarget = target; UI.queueQty = qty;
  addQueueEntry(UI.queueKind, target, qty);
  UI.renderQueue();
}
// 队列的复制 / 清理在引擎层（queue.js）实现，这里只负责提示文案：
// 数据操作不该埋在 UI 里，否则测试只能对着源码做正则。
function queueDuplicateWithToast(id){
  const e = Game.queue.find(x => x.id === id);
  if (!e) return false;
  if (Game.queue.length >= QUEUE_MAX){ UI.toast(`队列最多 ${QUEUE_MAX} 个任务`); return false; }
  const added = duplicateQueueEntry(id);
  if (added) UI.toast(`已复制：${entryLabel(e)} ×${e.qty}`);
  return !!added;
}
function queueDropBlockedWithToast(){
  const n = dropBlockedQueue();
  if (n) UI.toast(`移除 ${n} 条阻塞任务`);
  return n;
}
// 注意不要覆盖引擎导出的同名函数：测试会执行 UI 文件，
// 一旦这里再赋一次 window.duplicateQueueEntry，被测的就是这个带 toast 的包装，
// 引擎语义（返回新条目 / null）全被吃掉。
window.queueDupWithToast = queueDuplicateWithToast;
window.queueDropWithToast = queueDropBlockedWithToast;
window.addQueueTask = addQueueTask;
