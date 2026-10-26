// ===== 现场：把「此刻在做什么」画出来 =====
// 采集是这个游戏最核心的动作——玩家九成时间在采——但此前的全部视觉反馈，
// 只有仪表带上一根细进度条，采到什么靠一行飘字闪一下。
// 这一层在仪表带下方给一块七十余像素高的现场：山、人、锄、土、收成。
//
// 三条约束（与前置讨论一致）：
//   ① 全部手写 SVG / CSS，不引入任何图片资源（assets/ 至今只有一个字体文件）；
//   ② 挂在 index.html 的静态节点上、只做增量更新——各页是 innerHTML 整块重绘，
//      若现场也在重绘范围内，动画每渲染一次就归零，等于没有动画；
//   ③ 不改变任何产出与节奏，纯视觉层（平衡零风险）。

const SCENE_INK = {
  nanshan:  '#2E5269',
  xishan:   '#6B6659',
  beishan:  '#1F3D5C',
  dongshan: '#566E4C',
  zhongshan:'#B03A2B',
};

// 当前行动 → 现场要画的东西。无行动 / 纯征伐时返回 null（征伐页自有战斗画面，
// 在仪表带上再画一遍战场是重复）。
function sceneState(){
  const a = (typeof Game !== 'undefined') ? Game.activity : null;
  if (!a) return null;
  const node = (typeof nodeOf === 'function' && typeof Game.node === 'string') ? nodeOf(Game.node) : null;
  const reg  = (typeof regionOf === 'function' && typeof Game.node === 'string') ? regionOf(Game.node) : null;
  const ser  = reg ? String(reg.regionId).split('-')[0] : '';
  const ink  = SCENE_INK[ser] || '#6B6659';
  const iv   = (typeof currentActionInterval === 'function') ? currentActionInterval() : 3;
  const place = node ? node.name : '';

  if (a.kind === 'gather'){
    const it = (typeof Items !== 'undefined') ? Items[a.itemId] : null;
    return {
      kind:'gather', ink, place, iv,
      key: `gather:${a.itemId}:${Game.node||''}`,
      verb:'采', name: (it && it.name) || '采集',
      note: `每 ${iv.toFixed(1)} 秒一采`,
    };
  }
  if (a.kind === 'craft'){
    const out = (typeof Items !== 'undefined') ? Items[a.recipe && a.recipe.out] : null;
    return {
      kind:'craft', ink, place, iv,
      key: `craft:${(a.recipe && a.recipe.out) || ''}`,
      verb:'制', name: (out && out.name) || '制作',
      note: `每 ${iv.toFixed(1)} 秒一成`,
    };
  }
  if (a.kind === 'grow'){
    return { kind:'grow', ink, place, iv, key:`grow:${a.siteId||''}`, verb:'莳', name:'莳植', note:'候其成熟' };
  }
  if (a.kind === 'observe'){
    return { kind:'observe', ink, place, iv, key:'observe', verb:'观', name:'观象', note:'仰观天象' };
  }
  if (a.kind === 'audience'){
    return { kind:'audience', ink, place, iv, key:'audience', verb:'谒', name:'谒见', note:'谨候阶下' };
  }
  return { kind:'other', ink, place, iv, key:`other:${a.kind}`, verb:'为', name:(typeof currentActivityLabel==='function'?currentActivityLabel():'行动'), note:'' };
}

// 场景里的小人：一具躬身劳作的水墨人形，面朝右侧的挖掘点。
// 工具**不在**这个 SVG 里——理由见 sceneTool()。
function sceneWorker(kind){
  return `<svg class="sc-worker" viewBox="0 0 60 70" aria-hidden="true">
    <g class="sc-figure">
      <path d="M16 20 Q24 25 26 41 L17 44 Q13 31 16 20 Z" fill="currentColor" opacity=".5"/>
      <path d="M15 13.5 m-5.4 0 a5.4 5.4 0 1 0 10.8 0 a5.4 5.4 0 1 0 -10.8 0" fill="currentColor" opacity=".92"/>
      <path d="M21 42 L18 56 L17 67" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M23 42 L27 56 L29 67" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <path d="M18 25 Q24 32 30 38" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>
      ${sceneTool(kind)}
    </g>
  </svg>`;
}

// 锄头的几何：握点固定，柄末端绕握点转，刃垂直于柄。
// **不用 transform 也不改属性旋转，直接算坐标写 path 的 d。**
// 这是最底层的一条路：`d` 是 SVG 1.1 的核心属性，任何内核都没有理由不支持。
const SCENE_GRIP = [30, 38];
const SCENE_STICK = [11, 28];        // 静止时从握点到柄末端的向量
const SCENE_BLADE = 5.4;             // 刃的半长

function sceneToolPath(a){
  const rad = (isFinite(a) ? a : 0) * Math.PI / 180;
  const c = Math.cos(rad), sn = Math.sin(rad);
  const vx = SCENE_STICK[0]*c - SCENE_STICK[1]*sn;
  const vy = SCENE_STICK[0]*sn + SCENE_STICK[1]*c;
  const L  = Math.hypot(SCENE_STICK[0], SCENE_STICK[1]);
  const px = -vy / L, py = vx / L;                 // 垂直于柄
  const ex = SCENE_GRIP[0] + vx, ey = SCENE_GRIP[1] + vy;
  const b1 = [ex - px*SCENE_BLADE, ey - py*SCENE_BLADE];
  const b2 = [ex + px*SCENE_BLADE, ey + py*SCENE_BLADE];
  const shrink = (q, k) => [ex + (q[0]-ex)*k, ey + (q[1]-ey)*k];
  const c1 = shrink(b1, .84), c2 = shrink(b2, .84);
  const f = n => n.toFixed(1);
  return {
    shaft: `M${SCENE_GRIP[0]} ${SCENE_GRIP[1]} L${f(ex)} ${f(ey)}`,
    blade: `M${f(b1[0])} ${f(b1[1])} L${f(b2[0])} ${f(b2[1])}`,
    mark:  `M${f(c1[0])} ${f(c1[1])} L${f(c2[0])} ${f(c2[1])}`,
  };
}

// 工具：人物 SVG 内部的一个 <g>，**每帧改 SVG 原生 transform 属性**。
// 三次失败的经验：
//   v1.31.54 `<g>` + CSS transform  → Safari 不动
//   v1.31.56 独立 `<svg>` + JS 写 style.transform → Safari 仍不动
// 结论：Safari 对 SVG 元素的 **CSS** transform 支持不可靠；而 `transform`
// 属性和 `rotate(角度 cx cy)` 是 SVG 1.1 就有的东西，二十年来没有内核不支持。
// 所以这里既不写 style.transform，也不用 transform-origin——
// 旋转中心直接写进属性里：rotate(a 30 38)，坐标就是人物 viewBox 的坐标系。
function sceneTool(kind){
  if (kind === 'gather'){
    return `<g class="sc-tool">
      <path class="sc-shaft" d="M30 38 L41 66" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
      <path class="sc-blade" d="M36.4 67.6 L46.2 63.7" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>
      <path class="sc-mark"  d="M37.2 67.3 L45.4 64" stroke="#B03A2B" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
    </g>`;
  }
  if (kind === 'craft'){
    return `<g class="sc-tool">
      <path d="M30 38 L38 48" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
      <rect x="34" y="44" width="10" height="7" rx="1.2" fill="currentColor" opacity=".9"/>
    </g>`;
  }
  return '';
}

// 远山：三层折线，最远最淡。宽度随容器拉伸（preserveAspectRatio=none），
// 只作气氛，不表地形——本项目的地形数据是「里程 + 方位」，画不出等高线。
function sceneHills(){
  // viewBox 取 700×64（比例约 10.9）：手机 430×42 与宽屏 1080×52 都在附近，
  // 拉伸或压缩都在一成上下。此前用 400×64（比例 6.25），宽屏要横向拉 2.7 倍，
  // 山形被压成一条几乎笔直的波纹。
  return `<svg class="sc-hills" viewBox="0 0 700 64" preserveAspectRatio="none" aria-hidden="true">
    <path d="M-6 54 C 60 54, 84 14, 152 14 C 214 14, 236 46, 300 46
             C 352 46, 380 24, 434 28 C 486 32, 520 50, 572 48 C 618 46, 648 52, 706 50"
      fill="none" stroke="currentColor" stroke-opacity=".22" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <path d="M-6 62 C 74 62, 104 38, 168 38 C 226 38, 254 58, 316 58
             C 370 58, 400 44, 452 46 C 504 48, 540 60, 590 58 C 634 56, 664 60, 706 58"
      fill="none" stroke="currentColor" stroke-opacity=".13" stroke-width="1.1" vector-effect="non-scaling-stroke"/>
    <g stroke="currentColor" stroke-opacity=".24" stroke-width="1" fill="none" stroke-linecap="round">
      <path d="M344 20 q5 -4 10.4 0 M359 16 q4.2 -3.6 8.6 0"/>
    </g>
  </svg>`;
}

// 整块现场。只在与上一次的签名不同时才重建（见 UI.renderScene）。
function sceneHtml(s){
  const anim = (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') ? ' no-anim' : '';
  const t = (UI._tally && UI._tally.key === s.key) ? UI._tally : null;
  // 只有采集与制作会「一件一件出东西」；观象、谒见、莳植没有计数可言，
  // 硬摆一个永远是 0 的大数字，比不摆更让人困惑。
  const counted = (s.kind === 'gather' || s.kind === 'craft');
  return `<div class="sc-wrap${anim}" data-kind="${s.kind}" style="--ai:${s.iv.toFixed(2)}s;color:${s.ink}">
    <div class="sc-sky"></div>
    ${sceneHills()}
    <svg class="sc-ground" viewBox="0 0 700 26" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 9 Q 150 4 300 8 T 700 6 L700 26 L0 26 Z" fill="currentColor" fill-opacity=".11"/>
      <path d="M0 9 Q 150 4 300 8 T 700 6" fill="none" stroke="currentColor" stroke-opacity=".3"
        stroke-width="1" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="sc-stage">
      <div class="sc-rig">${sceneWorker(s.kind, s.kind)}</div>
      <div class="sc-pit"><i></i><i></i><i></i></div>
      <svg class="sc-mound" viewBox="0 0 18 7" aria-hidden="true">
        <path d="M1 6 Q9 0 17 6 Z" fill="currentColor" fill-opacity=".2"/>
      </svg>
    </div>
    <div class="sc-drops"></div>
    <div class="sc-hud">
      ${counted
        ? `<b><i class="sc-n${t && t.n ? '' : ' zero'}">${t && t.n ? t.n : 0}</i> 件</b>`
        : `<b class="sc-label">${esc(s.name)}</b>`}
      <span>${esc(s.note)}</span>
    </div>
    ${UI._sceneProbe ? '<div class="sc-probe"></div>' : ''}
    <div class="sc-flash"></div>
    <div class="sc-prog"><i id="sceneProg"></i></div>
  </div>`;
}

// 重建判定用的签名：只含「换一个场景就该重画」的字段。
// 数字（已采几件）不进签名——那由 sceneBeat 就地改文字，重建会把动画打断。
function sceneSig(s){
  if (!s) return 'none';
  return [s.kind, s.key, s.ink, s.iv.toFixed(2), s.name, s.place].join('|');
}

UI.renderScene = function(){
  const bar = (typeof document !== 'undefined') ? document.getElementById('sceneBar') : null;
  if (!bar) return;
  const on = !(typeof Prefs !== 'undefined' && Prefs.sceneOn === false);
  const s = on ? sceneState() : null;
  // 现场显示时，仪表带那根细进度条要收起来（v1.31.55）：
  // 同一件事（挖到几分）在屏幕上下各画一根，是纯冗余。进度改由现场底部那根承担。
  const sb = (typeof document !== 'undefined') ? document.getElementById('statusbar') : null;
  if (sb && sb.classList) sb.classList.toggle('scene-on', !!s);
  if (!s){
    bar.classList.add('hidden'); bar.innerHTML = ''; UI._sceneSig = 'none';
    if (UI.stopSceneMotion) UI.stopSceneMotion();
    return;
  }
  bar.classList.remove('hidden');
  const sig = sceneSig(s);
  if (sig !== UI._sceneSig){
    UI._sceneSig = sig;
    bar.innerHTML = sceneHtml(s);
    if (UI.startSceneMotion) UI.startSceneMotion();     // 重建后重新接管
  }
};

// 采集 / 制作完成一次时的「落地」：物品从土里蹦出来、锄头复位、土粒迸开。
// 与 UI.actionFeedback 同一触发点——采到的一刻正好是锄头落下的一刻，因果对齐。
UI.sceneBeat = function(itemId, qty, opts){
  const bar = (typeof document !== 'undefined') ? document.getElementById('sceneBar') : null;
  // 是否显示不用 classList 判断（无头环境的 DOM stub 只实现了 add/remove）：
  // 签名是 'none' 就说明此刻没有现场可画。
  if (!bar || !UI._sceneSig || UI._sceneSig === 'none') return;
  const o = opts || {};
  // 记账：本回已采几件（换物 / 换山 / 换行动即归零）
  const s = sceneState();
  if (s){
    if (!UI._tally || UI._tally.key !== s.key) UI._tally = { key: s.key, n: 0 };
    UI._tally.n += qty || 1;
    const nEl = bar.querySelector('.sc-n');
    if (nEl){
      nEl.textContent = String(UI._tally.n);
      nEl.classList.remove('zero');
      // 数字是唯一在「涨」的东西，跳一下比不动更容易被看见
      nEl.classList.remove('bump');
      void nEl.offsetWidth;
      nEl.classList.add('bump');
    }
  }
  if (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') return;
  // 产出时整条现场闪一下：这一层用 opacity，不依赖 SVG 动画。
  // 万一某个内核对 <g> 的 CSS transform 支持不全，出货这件事仍然看得见。
  const flash = bar.querySelector('.sc-flash');
  if (flash){
    flash.classList.remove('on');
    void flash.offsetWidth;
    flash.classList.add('on');
  }
  // 土粒不用在这里驱动：它靠 CSS 与 --ai 同步（见 scDust 帧），
  // 若在这里再触发一次，两套时序会打架。
  // 收成浮起
  const drops = bar.querySelector('.sc-drops');
  if (drops && itemId && typeof itemIc === 'function'){
    const d = document.createElement('div');
    d.className = 'sc-drop' + (o.first ? ' first' : '') + (o.tierUp ? ' up' : '');
    d.innerHTML = `${itemIc(itemId, 17)}<em>×${qty || 1}</em>${o.first ? '<s>初见</s>' : ''}`;
    drops.appendChild(d);
    setTimeout(()=>d.remove(), 1300);
  }
};

// ---------- 动作驱动：每帧按「引擎自己的进度」算角度 ----------
// 为什么不用 CSS 关键帧：v1.31.54/55 两版都写了 CSS 动画，桌面正常，
// 但手机端反馈「完全不动」——`<g>` 上的 CSS transform、以及 animation 简写里的
// var(--ai)，在部分移动端内核里都不保证生效。与其逐个猜，不如换成最土的办法：
// **一个 HTML 元素 + 一条内联 transform，每帧由 JS 写**。这条路没有内核会不支持。
//
// 附带好处：相位不另建时间基准，直接取引擎的 activityProgress / interval，
// 于是暂停、变速、换物、离线补算之后，锄头永远落在正确的相位上。
const SCENE_SWING = [
  [0, 6], [15, -98], [29, 4], [34, 6], [56, -114], [68, -108], [92, 4], [100, 6],
];
const SCENE_RIG = [
  [0, 0], [15, -2.2], [29, 3.2], [40, .4], [56, -2.6], [68, -2.2], [92, 3.6], [100, 0],
];

// 分段插值。纯线性的挥动像机械臂，故每段中间加一点缓动。
function sceneAngleAt(frames, p){
  const x = Math.max(0, Math.min(100, p * 100));
  for (let i = 1; i < frames.length; i++){
    if (x <= frames[i][0]){
      const a = frames[i-1], b = frames[i];
      const span = (b[0] - a[0]) || 1;
      const k = (x - a[0]) / span;
      const e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2;
      return a[1] + (b[1] - a[1]) * e;
    }
  }
  return frames[frames.length-1][1];
}

// ---------- 自查入口：?probe=1 ----------
// 三次「手机上不动」的教训：隔着屏幕猜哪一环断了，代价太高。
// 打开 index.html?probe=1，现场条左下角会显示帧数、相位、间隔——
//   帧数不涨 → JS 没跑（或页面是旧版）
//   帧数在涨但相位不动 → 引擎没在推进
//   都正常却看不见动 → 才是渲染/视觉问题
UI._sceneProbe = (typeof location !== 'undefined' && /[?&]probe=1/.test(location.search));
UI.paintProbe = function(){
  if (!UI._sceneProbe) return;
  if ((UI._sceneFrames || 0) % 10) return;          // 每 10 帧写一次，别把 rAF 拖慢
  const el = (typeof document !== 'undefined') ? document.querySelector('.sc-probe') : null;
  if (!el) return;
  const iv = (typeof currentActionInterval === 'function') ? currentActionInterval() : 0;
  const t = '帧 ' + (UI._sceneFrames || 0) + ' · 相位 ' + (UI._scenePhase || 0).toFixed(2) + ' · 间隔 ' + iv.toFixed(2) + 's';
  if (el.textContent !== t) el.textContent = t;
};

UI.stopSceneMotion = function(){
  if (UI._sceneRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(UI._sceneRaf);
  UI._sceneRaf = 0;
};

UI.startSceneMotion = function(){
  if (typeof requestAnimationFrame !== 'function' || typeof document === 'undefined') return;
  if (UI._sceneRaf) return;                    // 已在跑，不叠加
  // 动效关掉时保留静帧：画面还在（知道在做什么），只是不动
  if (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') return;
  const step = ()=>{
    UI._sceneRaf = requestAnimationFrame(step);
    const bar = document.getElementById('sceneBar');
    if (!bar) return;
    const rig = bar.querySelector('.sc-rig');
    if (!bar.querySelector('.sc-shaft') && !rig) return;
    const iv = (typeof currentActionInterval === 'function') ? currentActionInterval() : 1;
    const T = (iv > 0) ? iv * 1000 : 2600;
    let p;
    if (typeof activityProgress === 'number' && iv > 0){
      p = activityProgress / iv;
    } else {
      // 兜底：万一拿不到引擎的进度变量（跨 script 的顶层 let 在个别环境里读不到），
      // 就按墙钟自走。宁可相位和产出的对齐略有偏差，也不能定住不动。
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      p = (now % T) / T;
    }
    p = Math.max(0, Math.min(1, p));
    // 锄头：算坐标、写 path 的 d。不用 transform，也不用 CSS 动画。
    const ta = sceneAngleAt(SCENE_SWING, p);
    const ra = sceneAngleAt(SCENE_RIG, p);
    if (!isFinite(ta) || !isFinite(ra)) return;      // 非法值宁可不写，也别把上次的姿态留着
    const g = sceneToolPath(ta);
    const shaft = bar.querySelector('.sc-shaft');
    const blade = bar.querySelector('.sc-blade');
    const mark  = bar.querySelector('.sc-mark');
    if (shaft) shaft.setAttribute('d', g.shaft);
    if (blade) blade.setAttribute('d', g.blade);
    if (mark)  mark.setAttribute('d', g.mark);
    // 身体俯仰走 div 的 CSS transform（div 上这条没有任何内核问题）
    if (rig) rig.style.transform = 'rotate(' + ra.toFixed(2) + 'deg)';
    UI._scenePhase = p;
    UI._sceneFrames = (UI._sceneFrames || 0) + 1;
    if (UI._sceneProbe) UI.paintProbe();
  };
  UI._sceneRaf = requestAnimationFrame(step);
};

if (typeof window !== 'undefined'){
  window.sceneAngleAt = sceneAngleAt;
  window.sceneToolPath = sceneToolPath;
  window.SCENE_SWING = SCENE_SWING;
  window.SCENE_RIG = SCENE_RIG;
  window.sceneState = sceneState;
  window.sceneHtml = sceneHtml;
  window.sceneSig = sceneSig;
}
