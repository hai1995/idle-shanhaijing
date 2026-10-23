// ===== 巡历队列：多任务顺序执行 + 兜底动作 =====
// 玩家可把若干「采集 / 制作 / 讨伐」任务排入队列，角色按顺序自动执行，
// 需要的节点不在脚下时自动转往（履险式巡游）；队列为空或被阻塞时转入兜底动作。

// ---------- 行动类型 ----------
// mode: gather = 采集类（按产出数量计数）| recipe = 制作类（按次数计数）| taofa = 讨伐（按次数计数）
const ActionKinds = {
  qiaocai: { skill:'qiaocai', label:'樵采', icon:'🪓', mode:'gather' },
  caiyu:   { skill:'caiyu',   label:'采玉', icon:'⛏️', mode:'gather' },
  yu:      { skill:'yu',      label:'渔',   icon:'🎣', mode:'gather' },
  caiyao:  { skill:'caiyao',  label:'采药', icon:'🌿', mode:'gather' },
  burn:     { skill:'fanliao', label:'燔燎', icon:'🔥', mode:'recipe' },
  cook:     { skill:'diaoding',label:'调鼎', icon:'🍳', mode:'recipe' },
  smith:    { skill:'yezhu',   label:'冶铸', icon:'⚒️', mode:'recipe' },
  fletch:   { skill:'xiaoyu',  label:'削羽', icon:'🏹', mode:'recipe' },
  craft:    { skill:'zhiqi',   label:'制器', icon:'🧵', mode:'recipe' },
  jade:     { skill:'zhuoyu',  label:'琢玉', icon:'💠', mode:'recipe' },
  herb:     { skill:'lianyao', label:'炼药', icon:'🧪', mode:'recipe' },
  rite:     { skill:'jisi',    label:'祠祀', icon:'🕯️', mode:'recipe' },
  taofa:    { skill:'taofa',   label:'讨伐', icon:'🗡️', mode:'taofa' },
  audience: { skill:'jisi',    label:'谒见', icon:'🕯️', mode:'special' },
  grow:     { skill:'puyi',    label:'灌木', icon:'🌱', mode:'special' },
};
const QUEUE_MAX = 10;

// ---------- 目标列表 ----------
function actionTargets(kind){
  const def = ActionKinds[kind];
  if (!def) return [];
  if (def.mode === 'gather'){
    return (GATHER_POOLS[def.skill]||[]).map(id=>{
      const it = Items[id];
      if (!it) return null;
      return { id, name:it.name, icon:it.icon, lvl:it.lvl||1, node:it.node };
    }).filter(Boolean);
  }
  if (def.mode === 'recipe'){
    return Recipes.filter(r=>r.type===kind).map(r=>{
      const it = Items[r.out];
      return { id:r.out, name:(it?it.name:r.out), icon:(it?it.icon:'📦'), lvl:r.lvl||1, per:r.qty||1 };
    }).filter(Boolean);
  }
  if (def.mode === 'special'){
    if (kind === 'audience'){
      return Object.values(AUDIENCE_SITES).map(s=>({
        id:s.nodeId, name:'谒见 '+s.name, icon:'🕯️', lvl:(nodeOf(s.nodeId)||{}).unlockLevel||1, node:s.nodeId,
      }));
    }
    if (kind === 'grow'){
      return Object.values(GROW_SITES).map(s=>({
        id:Object.keys(GROW_SITES).find(k=>GROW_SITES[k].nodeId===s.nodeId), name:'灌木 '+s.name, icon:'🌱',
        lvl:(nodeOf(s.nodeId)||{}).unlockLevel||1, node:s.nodeId,
      }));
    }
    return [];
  }
  // taofa
  return Object.values(Monsters).filter(m=>!m.pacifist).map(m=>({
    id:m.id, name:m.name, icon:m.boss?'🦹':'⚔️', lvl:m.needLvl||1, node:m.nodeId, boss:!!m.boss,
  })).filter(Boolean);
}

// ---------- 任务对象 ----------
let queueSeq = 1;
function makeQueueEntry(kind, target, qty){
  return {
    id: 'q' + Date.now().toString(36) + '_' + (queueSeq++),
    kind, target,
    qty: Math.max(1, Math.floor(qty)||1),
    done: 0,
    completed: 0,
  };
}
function entryDef(e){ return e ? ActionKinds[e.kind] : null; }
function entryLabel(e){
  const def = entryDef(e);
  const it = Items[e.target];
  const beast = Monsters[e.target];
  const name = it ? it.name : beast ? beast.name : e.target;
  return `${def?def.icon:'❓'}${def?def.label:'行动'}·${name}`;
}
function entryUnit(e){
  const def = entryDef(e);
  return (def && def.mode==='gather') ? '个' : '次';
}
function entryProgressText(e){
  return `${e.done||0}/${e.qty} ${entryUnit(e)}`;
}
// 队列一轮预估耗时（秒）：各条目数量 × 基础间隔（不含转场，作约估）
function estimateQueueSeconds(){
  let s = 0;
  for (const e of Game.queue){
    const def = entryDef(e);
    if (!def) continue;
    const ak = def.mode==='recipe' ? 'craft' : (e.kind==='taofa' ? 'taofa' : 'gather');
    s += e.qty * (ak==='craft' ? 2 : 1);   // 制作≈2s/次，采集/讨伐≈1s/次（约估，不含转场）
  }
  return s;
}
// 单条目预估耗时（秒）
function estimateEntrySeconds(e){
  const def = entryDef(e);
  if (!def) return 0;
  const ak = def.mode==='recipe' ? 'craft' : (e.kind==='taofa' ? 'taofa' : 'gather');
  return e.qty * (ak==='craft' ? 2 : 1);
}

// ---------- 可执行性 ----------
function entryCanRun(e){
  if (!e) return { ok:false, reason:'空任务' };
  const def = entryDef(e);
  if (!def) return { ok:false, reason:'未知行动' };
  if (def.mode === 'gather'){
    const it = Items[e.target];
    if (!it) return { ok:false, reason:'目标不存在' };
    if (levelOf(def.skill) < (it.lvl||1)) return { ok:false, reason:`${def.label} ${it.lvl} 级` };
    const node = nodeOf(it.node);
    if (node && !nodeUnlocked(node)) return { ok:false, reason: nodeLockReason(node) };
    return { ok:true, reason:'' };
  }
  if (def.mode === 'recipe'){
    const rec = Recipes.find(r=>r.type===e.kind && r.out===e.target);
    if (!rec) return { ok:false, reason:'配方不存在' };
    if (levelOf(def.skill) < (rec.lvl||1)) return { ok:false, reason:`${def.label} ${rec.lvl} 级` };
    if (!canAfford(rec.cost)) return { ok:false, reason:'原料不足' };
    return { ok:true, reason:'' };
  }
  if (def.mode === 'special'){
    if (e.kind === 'audience'){
      if (!AUDIENCE_SITES[e.target]) return { ok:false, reason:'无此神祇之山' };
      const node = nodeOf(e.target);
      if (node && !nodeUnlocked(node)) return { ok:false, reason: nodeLockReason(node) };
      return { ok:true, reason:'' };
    }
    if (e.kind === 'grow'){
      if (!GROW_SITES[e.target]) return { ok:false, reason:'无此养成之地' };
      const node = nodeOf(GROW_SITES[e.target].nodeId);
      if (node && !nodeUnlocked(node)) return { ok:false, reason: nodeLockReason(node) };
      return { ok:true, reason:'' };
    }
    return { ok:false, reason:'未知行动' };
  }
  // taofa
  const m = Monsters[e.target];
  if (!m) return { ok:false, reason:'目标不存在' };
  if ((m.needLvl||1) > levelOf('taofa')) return { ok:false, reason:`讨伐 ${m.needLvl} 级` };
  const node = nodeOf(m.nodeId);
  if (node && !nodeUnlocked(node)) return { ok:false, reason: nodeLockReason(node) };
  return { ok:true, reason:'' };
}

// ---------- 与当前活动的同步 ----------
function entryMatchesActivity(e){
  const a = Game.activity;
  if (!a || !e) return false;
  const def = entryDef(e);
  if (!def) return false;
  if (def.mode === 'gather') return a.kind === 'gather' && a.itemId === e.target;
  if (def.mode === 'recipe') return a.kind === 'craft' && !!(a.recipe) && a.recipe.out === e.target;
  if (def.mode === 'special') return a.kind === e.kind && (a.nodeId === e.target || a.siteId === e.target);
  return a.kind === 'taofa' && a.target === e.target;
}
function startEntryActivity(e, src){
  const def = entryDef(e);
  if (!def) return false;
  if (def.mode === 'gather'){
    const it = Items[e.target];
    if (!it) return false;
    if (it.node !== Game.node){ if (!travelTo(it.node)) return false; }
    activityProgress = 0;
    Game.activity = { kind:'gather', skill:def.skill, itemId:e.target, src: src||'queue' };
  } else if (def.mode === 'recipe'){
    const rec = Recipes.find(r=>r.type===e.kind && r.out===e.target);
    if (!rec) return false;
    activityProgress = 0;
    Game.activity = { kind:'craft', recipe:rec, src: src||'queue' };
  } else if (def.mode === 'special'){
    if (e.target !== Game.node){ if (!travelTo(e.target)) return false; }
    activityProgress = 0;
    Game.activity = e.kind === 'audience'
      ? { kind:'audience', nodeId:e.target, src: src||'queue' }
      : { kind:'grow', siteId:e.target, nodeId:(GROW_SITES[e.target]||{}).nodeId, src: src||'queue' };
  } else {
    const m = Monsters[e.target];
    if (!m) return false;
    if (m.nodeId !== Game.node){ if (!travelTo(m.nodeId)) return false; }
    startCombat(e.target);
  }
  return true;
}

// ---------- 兜底动作 ----------
function fallbackEntry(){
  const fb = Game.fallback;
  if (!fb || fb.kind === 'idle') return null;
  return { id:'__fallback', kind:fb.kind, target:fb.target, qty:Math.max(1, fb.qty||1), done:0 };
}
function applyFallback(){
  const fb = fallbackEntry();
  if (!fb){ stopActivity(); return; }
  if (!entryCanRun(fb).ok){ stopActivity(); return; }
  if (!entryMatchesActivity(fb) || (Game.activity && Game.activity.src !== 'fallback')){
    startEntryActivity(fb, 'fallback');
  }
}

// ---------- 队列控制 ----------
function startQueue(){
  if (Game.queueIdx >= Game.queue.length) Game.queueIdx = 0;
  Game.queueRunning = true;
  ensureQueueActivity();
  if (UI && UI.toast){
    UI.toast(Game.queue.length ? '▶ 巡历队列已启动' : '▶ 已启动（无任务，执行兜底动作）');
  }
  log('▶ 巡历队列启动', 'good');
  saveGame();
  return true;
}
function pauseQueue(reason){
  if (!Game.queueRunning) return false;
  Game.queueRunning = false;
  if (UI && UI.toast) UI.toast(`⏸ 巡历队列已暂停${reason?`（${reason}）`:''}`);
  log('⏸ 巡历队列已暂停', 'gold');
  saveGame();
  return true;
}
function toggleQueue(){
  return Game.queueRunning ? (pauseQueue(), false) : startQueue();
}
function addQueueEntry(kind, target, qty){
  if (Game.queue.length >= QUEUE_MAX){
    if (UI && UI.toast) UI.toast(`队列最多 ${QUEUE_MAX} 个任务`);
    return null;
  }
  const e = makeQueueEntry(kind, target, qty);
  Game.queue.push(e);
  saveGame();
  return e;
}
function removeQueueEntry(id){
  const i = Game.queue.findIndex(e=>e.id===id);
  if (i < 0) return false;
  Game.queue.splice(i,1);
  if (Game.queueIdx >= Game.queue.length) Game.queueIdx = Math.max(0, Game.queue.length-1);
  saveGame();
  return true;
}
function moveQueueEntry(id, dir){
  const i = Game.queue.findIndex(e=>e.id===id);
  if (i < 0) return false;
  const j = i + dir;
  if (j < 0 || j >= Game.queue.length) return false;
  const tmp = Game.queue[i];
  Game.queue[i] = Game.queue[j];
  Game.queue[j] = tmp;
  if (Game.queueIdx === i) Game.queueIdx = j;
  else if (Game.queueIdx === j) Game.queueIdx = i;
  saveGame();
  return true;
}
function clearQueue(){
  Game.queue = [];
  Game.queueIdx = 0;
  Game.queueRunning = false;
  saveGame();
}
function setFallback(kind, target, qty){
  if (!kind || kind === 'idle'){
    Game.fallback = { kind:'idle', target:'', qty:1 };
  } else {
    Game.fallback = { kind, target, qty:Math.max(1, qty||1) };
  }
  saveGame();
  return Game.fallback;
}
// 一键快速挂机：按当前可达成（节点已解锁）的采集目标排好巡历队列并启动
function quickIdlePreset(){
  const cands = [];
  ['qiaocai','caiyu','yu','caiyao'].forEach(kind=>{
    actionTargets(kind).forEach(t=>{
      const n = nodeOf(t.node);
      if (n && nodeUnlocked(n)) cands.push({ kind, target:t.id, node:n.id, lvl:t.lvl||1 });
    });
  });
  // 优先当前所在节点，其余按等级升序（贴合进度、不易被锁）
  cands.sort((a,b)=>{
    const ah = a.node===Game.node?0:1, bh = b.node===Game.node?0:1;
    if (ah!==bh) return ah-bh;
    return (a.lvl||1)-(b.lvl||1);
  });
  clearQueue();
  const picked = cands.slice(0, QUEUE_MAX);
  picked.forEach(c=> addQueueEntry(c.kind, c.target, 10));
  const here = picked.find(c=>c.node===Game.node);
  setFallback(here?here.kind:'idle', here?here.target:'', here?10:1);
  Game.queueLoop = true; saveGame();
  if (!Game.queueRunning && typeof toggleQueue==='function') toggleQueue();
  if (typeof UI!=='undefined' && UI.renderQueue) UI.renderQueue();
  if (UI && UI.toast) UI.toast(`🧭 已排 ${picked.length} 项巡历任务，开始挂机`);
  return picked.length;
}

// ---------- 主驱动（由 gameLoop 调用） ----------
function ensureQueueActivity(){
  if (!Game.queueRunning) return;
  if (Game.combat) return;              // 战斗中不抢占
  const list = Game.queue;
  if (!list.length){ applyFallback(); return; }
  let guard = 0;
  while (guard++ <= list.length + 1){
    const e = list[Game.queueIdx];
    if (!e){ applyFallback(); return; }
    if (entryCanRun(e).ok){
      if (!entryMatchesActivity(e) || (Game.activity && Game.activity.src !== 'queue')){
        startEntryActivity(e, 'queue');
      }
      return;
    }
    // 当前任务被阻塞 → 顺延到下一个可执行任务
    const next = (Game.queueIdx + 1) % list.length;
    if (next === Game.queueIdx){ applyFallback(); return; }
    if (!Game.queueLoop && next === 0){
      Game.queueIdx = 0;
      Game.queueRound++;
      Game.queueRunning = false;
      applyFallback();
      return;
    }
    Game.queueIdx = next;
    if (next === 0) Game.queueRound++;
  }
  applyFallback();
}

// ---------- 任务进度（由 performAction 调用） ----------
// 特殊行动（谒见/灌木）每完成一回计一次
function queueOnSpecialDone(a){
  if (!Game.queueRunning) return;
  if (!Game.activity || Game.activity.src !== 'queue') return;
  const e = Game.queue[Game.queueIdx];
  if (!e) return;
  const def = entryDef(e);
  if (!def || def.mode !== 'special') return;
  if (a.kind !== e.kind) return;
  if (a.kind === 'audience' && a.nodeId !== e.target) return;
  if (a.kind === 'grow' && a.siteId !== e.target) return;
  e.done = (e.done||0) + 1;
  if (e.done >= e.qty) onQueueEntryDone(e);
}
window.queueOnSpecialDone = queueOnSpecialDone;

function queueOnActionDone(a, gained){
  if (!Game.queueRunning) return;
  if (!Game.activity || Game.activity.src !== 'queue') return;
  const e = Game.queue[Game.queueIdx];
  if (!e) return;
  const def = entryDef(e);
  if (!def) return;
  if (def.mode === 'recipe'){
    if (a.kind !== 'craft' || !a.recipe || a.recipe.out !== e.target) return;
    e.done = (e.done||0) + 1;
  } else if (def.mode === 'gather'){
    if (a.kind !== 'gather' || a.itemId !== e.target) return;
    e.done = (e.done||0) + Math.max(0, gained||0);
  } else {
    // 讨伐按次数计数（由 meetKill 调用）
    return;
  }
  if (e.done >= e.qty) onQueueEntryDone(e);
}

// 任务达成 → 推进到下一项
function onQueueEntryDone(e){
  const list = Game.queue;
  const idx = list.indexOf(e);
  if (idx >= 0) Game.queueIdx = idx;
  e.done = 0;
  e.completed = (e.completed||0) + 1;
  if (UI && UI.toast) UI.toast(`✅ 任务完成：${entryLabel(e)}`);
  log(`✅ 任务完成：${entryLabel(e)}`, 'good');
  const isLast = (Game.queueIdx + 1) >= list.length;
  if (isLast){
    Game.queueRound++;
    Game.queueIdx = 0;
    if (!Game.queueLoop){
      Game.queueRunning = false;
      applyFallback();
      saveGame();
      return;
    }
  } else {
    Game.queueIdx++;
  }
  ensureQueueActivity();
  saveGame();
}

// ---------- 导出 ----------
if (typeof window !== 'undefined'){
  window.ActionKinds = ActionKinds;
  window.QUEUE_MAX = QUEUE_MAX;
  window.actionTargets = actionTargets;
  window.makeQueueEntry = makeQueueEntry;
  window.entryDef = entryDef;
  window.entryLabel = entryLabel;
  window.entryUnit = entryUnit;
  window.entryProgressText = entryProgressText;
  window.estimateQueueSeconds = estimateQueueSeconds;
  window.estimateEntrySeconds = estimateEntrySeconds;
  window.entryCanRun = entryCanRun;
  window.startQueue = startQueue;
  window.pauseQueue = pauseQueue;
  window.toggleQueue = toggleQueue;
  window.addQueueEntry = addQueueEntry;
  window.removeQueueEntry = removeQueueEntry;
  window.moveQueueEntry = moveQueueEntry;
  window.clearQueue = clearQueue;
  window.setFallback = setFallback;
  window.quickIdlePreset = quickIdlePreset;
  window.fallbackEntry = fallbackEntry;
  window.ensureQueueActivity = ensureQueueActivity;
  window.queueOnActionDone = queueOnActionDone;
}
