// ===== ui/enhance.js — 淬炼（等待演出 / 品阶权重 / 强化一次到顶 / 重铸） =====
// 由 ui/pack.js 拆分而来（v1.31.118）：「落锤→揭晓」的仪式自成一段，与详情渲染正交。
// 锁定面板上的强化按钮：演出期间不接受第二次点击
// ---------- 淬炼的「等待」（v1.31.42） ----------
// 强化原先只在动效为「全」时才有 1.25 秒演出；设为「轻」或「关」（省电、老设备）就退回瞬间出结果——
// 而「落锤→揭晓」的等待是这件装备的仪式，不是装饰，不该跟着画质开关一起关掉。
// 所以时长单独算：等级越高、品阶越好，这一锤越慢；动效关闭只缩短，不归零。
function enhWaitMs(o){
  o = o || {};
  const lv = Math.max(0, o.lv | 0);
  const g = Math.max(0, Math.min(1, o.grade || 0));      // 0..1：品阶越高压得越久
  let ms = 1250 + lv * 45 + g * 600;
  if (typeof Prefs !== 'undefined' && Prefs && Prefs.fxLevel === 'off') ms *= 0.72;
  return Math.max(900, Math.min(3400, Math.round(ms)));
}

// 「砧上」过程条：不透露成败，只报这一锤走到了哪一步。
// 四段文案按进度换，节奏感就在这四句里——一锤到底反而没有悬念。
const ENH_STEPS = ['炭火通红…', '一锤落下', '火星迸起', '淬入水中…'];
// 品阶越高的活越慢：凡品一锤就成型，神兵要反复锻打才见分晓
const ENH_GRADE_W = { '凡':0, '良':0.15, '精':0.35, '珍':0.6, '神':1 };
window.enhWaitMs = enhWaitMs;
function enhGradeWeight(it){
  if (typeof gearGrade !== 'function') return 0;
  const g = gearGrade(it);
  const w = ENH_GRADE_W[(g && g.name) || ''];
  return (w == null) ? 0.2 : w;
}

UI._enhPending = null;
UI._showEnhWait = function(dur, label){
  const box = $('modalBox');
  // 无头环境（测试 stub）没有 querySelector：安静跳过，别把整条渲染路径拖垮
  if (!box || typeof box.querySelector !== 'function') return null;
  const row = box.querySelector('.enh-btns');
  if (!row) return null;
  const old = box.querySelector('.enh-forge');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'enh-forge';
  el.innerHTML = `<span class="ef-anvil">🔨</span>
    <span class="ef-mid"><span class="ef-txt">${esc(ENH_STEPS[0])}</span>
      <span class="ef-bar"><i style="width:0%"></i></span></span>
    <span class="ef-lb">${esc(label || '')}</span>`;
  row.parentNode.insertBefore(el, row);
  row.classList.add('enh-row-busy');
  const bar = el.querySelector('.ef-bar i');
  const txt = el.querySelector('.ef-txt');
  const t0 = Date.now();
  const timer = setInterval(()=>{
    const p = Math.min(1, (Date.now() - t0) / Math.max(1, dur));
    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
    const idx = Math.min(ENH_STEPS.length - 1, Math.floor(p * ENH_STEPS.length));
    if (txt && txt.textContent !== ENH_STEPS[idx]) txt.textContent = ENH_STEPS[idx];
    if (p >= 1) UI._clearEnhWait();
  }, 60);
  UI._enhPending = { timer, t0, dur, el };
  return el;
};
UI._clearEnhWait = function(){
  const p = UI._enhPending;
  if (p && p.timer) clearInterval(p.timer);
  UI._enhPending = null;
  const box = $('modalBox');
  if (box && typeof box.querySelector === 'function'){
    const el = box.querySelector('.enh-forge');
    if (el) el.remove();
    const row = box.querySelector('.enh-btns');
    if (row) row.classList.remove('enh-row-busy');
  }
};

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
  // 失败时把「火候涨了几格」一并写出来：一败俱毁本来就痛，若连补偿都不提，
  // 玩家只会觉得这系统在坑他（火候本身就是为此设计的）。
  const step = (typeof ENHANCE_HEAT !== 'undefined') ? Math.round(ENHANCE_HEAT.STEP * 100) : 8;
  const heatGain = (r.success || r.usedStone) ? '' : `（火候 +${step}%）`;
  if (r.success) UI._enhLast = { id:itemId, text:`成：+${r.lvBefore} → +${r.lvAfter}`, cls:'good' };
  else if (r.wiped) UI._enhLast = { id:itemId, text:`毁：+${r.lvBefore} → +0${heatGain}`, cls:'bad' };
  else if (r.lost) UI._enhLast = { id:itemId, text:`败：跌至 +${r.lvAfter}${heatGain}`, cls:'bad' };
  else UI._enhLast = { id:itemId, text:`败：${r.usedStone ? '镇物护住原阶' : '仅损材料'}${heatGain}`, cls:'sys' };

  // 结果已落库（料已扣、成败已定），但先不揭晓：这一锤要等。
  // ⚠️ 等待不跟动效开关走：设为「轻 / 关」只是少播几下火花，不该变成瞬间出结果。
  UI._enhBusy = true;
  UI._lockEnhPanel();
  const dur = enhWaitMs({ lv: r.lvBefore, grade: enhGradeWeight(it) });
  UI.forgeShow && UI.forgeShow(it, { heavy:false });      // 有这个动效就照播，没有也照等
  UI._showEnhWait(dur, `+${r.lvBefore} → +${r.lvBefore + 1}`);
  setTimeout(()=>{
    UI._clearEnhWait();
    UI._enhBusy = false;
    UI.refreshItemModal(itemId);
    UI._revealEnh(itemId, r);
  }, dur);
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
  // 「强化至 +N」是一串锤：等待时长按预计锤数给（目标越高，锻得越久），封顶四秒出头——
  // 再长就成罚站了。real 次数只有跑完才知道，这里按「至少一级一锤、越往上越费」估。
  const lvNow = enhanceLevel(target);
  const est = Math.max(1, (t - lvNow)) * 1.8;
  const dur = Math.max(1200, Math.min(4600, Math.round(700 + est * 150 + enhGradeWeight(it) * 600)));
  UI._enhBusy = true;
  UI._lockEnhPanel();
  UI.forgeShow && UI.forgeShow(it, { heavy:true });
  UI._showEnhWait(dur, `+${lvNow} → +${t}`);
  const run = ()=>{
    UI._clearEnhWait();
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
  setTimeout(run, dur);
};

UI.reforgeNow = function(itemId){
  const ok = reforgeItem(itemId);
  UI._enhLast = { id:itemId, text: ok ? '词条已重铸' : '重铸未成', cls: ok ? 'good' : 'bad' };
  UI.refreshItemModal(itemId);
};

window.showItemDetail = showItemDetail;

