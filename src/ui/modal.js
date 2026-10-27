// ===== src/ui/modal.js — 弹窗与离线上屏 =====
// 从 ui/core.js 搬来（v1.31.91，拆分第四步）。搬的是「一次性的屏」：
//   modal / _splitModal / closeModal   三段式弹窗骨架（标题 / 可滚内容 / 固定按钮）
//   showOfflineSummary                 离线归来那份账单（全项目最长的一段 HTML）
//   maybeShowDeployHint / showDeployHint  御使首次入槽的提示
//
// 为什么是这块：它与「常驻界面」正好相反——一次只出现一个、出现时整屏只有它，
// 生命周期极短。放在 core.js 里和导航/键盘可达性混在一起，改一处要读两套心智模型。
//
// ⚠️ 加载顺序：排在 ui/core.js 之后（依赖 esc / fmt / fmtTime / $），
//    排在 ui/misc.js 之前——misc.js 的 init() 会在启动时清理一次弹窗状态。
//
// 搬家的验收：在浏览器里用五组 rec 调 showOfflineSummary，抓 #modalBox.innerHTML
// 逐字符比对（正常 / 超上限 / 有战斗断粮 / 有续祭祭品不足 / 带离线见闻）。


// ---------- 弹窗 ----------
// 三段式：标题 / 内容（可滚） / 按钮（固定底部）。
// 原先整个盒子一起滚，物品详情、离线归来这类长内容一往下翻，按钮就跟着滑走了；
// 手机上想点「售出」还得先滚回底部。现在按钮永远在下方，内容只在中间滚。
UI.modal = function(html){
  const m = $('modal'), box = $('modalBox');
  if (!m || !box) return;
  box.innerHTML = html;
  // 无头环境（测试 stub）没有 querySelector：跳过分段，别把渲染整条路拖垮
  if (typeof box.querySelector === 'function' && !box.querySelector(':scope > .modal-body')) this._splitModal(box);
  m.classList.remove('hidden');
  if (document.body) document.body.classList.add('no-scroll');   // 弹窗开着时，背景不跟着滚
};
UI._splitModal = function(box){
  const head = box.querySelector(':scope > h3');
  const btns = box.querySelector('.modal-btns');
  const body = document.createElement('div');
  body.className = 'modal-body';
  [...box.children].forEach(ch => { if (ch !== head && ch !== btns) body.appendChild(ch); });
  box.appendChild(body);
  if (btns){
    const foot = document.createElement('div');
    foot.className = 'modal-foot';
    foot.appendChild(btns);          // appendChild 会把它从原位置摘走
    box.appendChild(foot);
  }
};
UI.closeModal = function(){
  // 关窗时把「砧上」的定时器一并收掉：弹窗没了还在跑的 interval 会一直碰空 DOM，
  // 而且强化结果已落库（料已扣、成败已定），清的是 UI，不是结果。
  if (typeof UI._clearEnhWait === 'function') UI._clearEnhWait();
  UI._enhBusy = false;
  const m = $('modal');
  if (m) m.classList.add('hidden');
  if (document.body) document.body.classList.remove('no-scroll');
};

// ---------- 离线归来汇总 ----------
UI.showOfflineSummary = function(rec){
  if (!rec) return;
  const items = Object.entries(rec.items||{}).map(([id,q])=>{
    const it = Items[id];
    return `<span class="chip">${typeof itemIc==='function'?itemIc(id,13):(it?(it.icon||'⬜'):'❓')}${it?esc(it.name):esc(id)}×${q}</span>`;
  }).join('');
  // 离线都做了些什么：只报经验总额太抽象，玩家想知道「这一夜在做什么」
  const ACT_NAMES = { gather:'采集', craft:'制作', observe:'观象', audience:'朝觐', grow:'养成', combat:'往讨' };
  const acts = Object.entries(rec.acts||{}).filter(([,n])=>n>0)
    .map(([k,n])=>`${ACT_NAMES[k]||k} ${n} 次`).join(' · ');
  // 离线上限这件事，玩家最想知道的是「晚上睡八小时会不会浪费」。
  // 所以除了「超了多少」，未溢满时也明说「还能攒多久到顶」。
  const capH = offlineCapHours();
  const capSec = capH * 3600;
  const capLine = rec.capped
    ? `<p class="hint off-cap">离山 ${fmtTime(rec.rawSeconds || rec.seconds)}，其中 ${fmtTime((rec.rawSeconds||0)-(rec.seconds||0))} 超出 ${capH} 小时上限，未计入。想多攒些，可去观象、修仓廪与土窟。</p>`
    : `<p class="hint off-cap">离线上限 ${capH} 小时，本次只用了 ${Math.round((rec.seconds||0)/capSec*100)}% · 再离山 ${fmtTime(Math.max(0, capSec - (rec.seconds||0)))} 到顶。</p>`;
  const harvest = (rec.harvests||0) > 0 ? `<div class="form-row"><span>圃艺收成</span><b>🌾 ${rec.harvests} 次</b></div>` : '';
  const recLine = (rec.records||0) > 0 ? `<div class="form-row"><span>新著录</span><b>${rec.records} 条</b></div>` : '';
  // 续祭：离山期间门人代你续了几次、耗去什么，都要交代清楚（材料是实扣的）
  let riteLine = '';
  if ((rec.riteRenews||0) > 0){
    const costChips = Object.entries(rec.riteCost||{}).map(([id,q])=>{
      const it = Items[id];
      return `<span class="chip">${typeof itemIc==='function'?itemIc(id,13):(it?(it.icon||'⬜'):'❓')}${it?esc(it.name):esc(id)}×${q}</span>`;
    }).join('');
    riteLine = `<div class="form-row"><span>续祭</span><b>🕯️ ${rec.riteRenews} 次</b></div>
      ${costChips ? `<div class="yield-row"><b>耗祭品</b>${costChips}</div>` : ''}`;
  }
  // 烽烟不跨离线：离山时挂着的凶兆，回来时已经落地——得告诉玩家它落过
  const omenLine = (rec.omensLanded||0) > 0
    ? `<div class="form-row"><span>烽烟</span><b class="off-omen">🔥 ${rec.omensLanded} 兆应验</b></div>` : '';
  // 往讨：战斗不跨会话，但离山前在打什么得有交代——打了几场、为什么停下
  let combatLine = '';
  if (rec.combat){
    combatLine = rec.combat.fights > 0
      ? `<div class="form-row"><span>往讨</span><b>⚔️ ${esc(rec.combat.name)} ${rec.combat.fights} 场</b></div>`
      : `<div class="form-row"><span>往讨</span><b class="off-omen">⚔️ ${esc(rec.combat.name)} 未能成行</b></div>`;
  }
  const combatHint = (rec.combat && rec.combat.shortOnFood)
    ? `<p class="hint off-cap">背包吃食每场需 ${rec.combat.needPortion} 份，只够支撑 ${rec.combat.fights} 场，其余时间已断粮。</p>`
    : (rec.combat && rec.combat.fights === 0
      ? `<p class="hint off-cap">这一战每场要吃 ${rec.combat.needPortion} 份，包中不足，故未开打。</p>` : '');
  // 你不在时山里有事发生：一行就够，别抢了上面那些数字的注意力
  const awayLine = rec.away
    ? `<div class="form-row"><span>不在时</span><b class="off-away">${rec.away.rare ? '珍稀 · ' : ''}${esc(rec.away.name)}</b></div>
       ${rec.away.text ? `<p class="hint off-cap">${esc(rec.away.text)}</p>` : ''}`
    : '';
  const shellLine = (rec.shells||0) > 0
    ? `<div class="form-row"><span>讨平所获</span><b>🪙 ${fmt(rec.shells)} 贝</b></div>` : '';
  UI.modal(`
    <h3><span class="mi-ic">${typeof markIcon==='function'?markIcon('moon',18):'🌙'}</span> 离线归来</h3>
    <p class="hint">离山 ${fmtTime(rec.seconds)}（离线效率 ${Math.round(offlineEff()*100)}%），竹简不曾停笔。</p>
    ${capLine}
    ${acts?`<div class="form-row"><span>所做</span><b class="off-acts">${acts}</b></div>`:''}
    <div class="form-row"><span>修得经验</span><b style="color:var(--gamboge)">+${fmt(rec.xp)}</b></div>
    ${recLine}${combatLine}${shellLine}${harvest}${riteLine}${omenLine}${awayLine}
    ${combatHint}
    ${items ? `<div class="panel" style="margin-top:8px"><div class="yield-row"><b>所得</b>${items}</div></div>` : ''}
    <div class="modal-btns"><button class="btn on" onclick="UI.closeModal()">收下</button></div>
  `);
  FX && FX.burst && FX.burst(window.innerWidth/2, window.innerHeight*0.3, '🌙', 10);
};

// ---------- 御使入槽引导 ----------
UI.maybeShowDeployHint = function(beast){
  if (!beast || beast.boss) return;
  if (Game.stats.seenDeployHint) return;
  if (Object.values(Game.deployed).includes(beast.id)) return;
  const m = $('modal');
  if (m && m.classList && typeof m.classList.contains === 'function' && !m.classList.contains('hidden')) return;   // 已有弹窗（如离线归来）时不抢占
  Game.stats.seenDeployHint = true;
  this.showDeployHint(beast);
};
UI.showDeployHint = function(beast){
  UI.modal(`
    <h3>🐾 可御使！</h3>
    <p class="hint">「${esc(beast.name)}」已著录至「通形」，可前往「御使」入槽，化作被动增益与自动作业。</p>
    <div class="modal-btns">
      <button class="btn on" onclick="UI.closeModal();UI.switchTab('yushi')">前往御使</button>
      <button class="btn" onclick="UI.closeModal()">稍后</button>
    </div>`);
  FX && FX.burst && FX.burst((window.innerWidth||300)/2, (window.innerHeight||500)/3, '🐾', 12);
};
