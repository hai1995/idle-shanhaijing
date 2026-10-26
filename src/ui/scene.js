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

// 场景里的小人：一个躬身劳作的水墨剪影，面朝右侧的挖掘点。
// ⚠️ 这里**不能**用细线条画——52×60 的框实际只显示 40 来像素高，
// 线条在这个尺寸下必然变成「火柴人」。所以躯干用填充的袍身（有宽度），
// 四肢用粗线（stroke-width 4，显示约 3.4px，接近真人比例），
// 头保持小（真人的头约占身高 1/7.5）。
function sceneWorker(kind){
  return `<svg class="sc-worker" viewBox="0 0 60 70" aria-hidden="true">
    <g class="sc-figure">
      <!-- 袍身：四边都带弧的手绘轮廓。
           直边梯形会像一只「砖头」——真人的侧面有后脑的弧、肩背的外凸、臀的起伏。
           这几笔弧线就是「像人」与「像柱子」的全部差别。 -->
      <path d="M17.4 20
               Q15.2 26 15.2 34
               Q15.4 41 15.6 47.4
               L25.6 46.4
               Q26.4 38 26.4 30
               Q26.2 22.6 25.4 20
               Q21.4 18 17.4 20 Z"
        fill="currentColor" opacity=".93"/>
      <!-- 腰带：一道朱色，点题 -->
      <path d="M15.4 34.4 L26.4 33.8" stroke="#B03A2B" stroke-width="1.6" opacity=".5" stroke-linecap="round"/>
      <!-- 头：前伸。真人的头约占身高 1/7.5，大了就变卡通 -->
      <circle cx="24" cy="15.4" r="3.3" fill="currentColor"/>
      <circle cx="23.2" cy="11.4" r="1.4" fill="currentColor" opacity=".8"/>
      <!-- 腿：两条粗腿，下半截被地面坡挡住 -->
      <path d="M17.4 46.8 L14.4 60" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M24 46.6 L26.2 59.4" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>
      <!-- 手臂：从肩到握点 -->
      <path d="M25 23.6 Q28 27 31 30" stroke="currentColor" stroke-width="4.2"
        stroke-linecap="round" fill="none"/>
      ${sceneTool(kind)}
    </g>
  </svg>`;
}

// 锄头的几何：握点固定，柄末端绕握点转，刃垂直于柄。
// **不用 transform 也不改属性旋转，直接算坐标写 path 的 d。**
// 这是最底层的一条路：`d` 是 SVG 1.1 的核心属性，任何内核都没有理由不支持。
const SCENE_GRIP = [31, 30];
const SCENE_STICK = [10, 29];         // 静止时从握点到柄末端的向量
const SCENE_BLADE = 7.4;             // 刃的半长（锄刃宽，短了像锤子）

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
      <path class="sc-shaft" d="M31 30 L41 59" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
      <path class="sc-blade" d="M33.4 62.4 L48.4 56.4" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>
      <path class="sc-mark"  d="M35 61.7 L46.8 57.1" stroke="#B03A2B" stroke-width="1.8" stroke-linecap="round" opacity=".88"/>
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
  // 拉伸或压缩都在一成上下。
  // 除了轮廓线，另加一层极淡的**填充**山影——只有线条时像「心电图」，
  // 有了淡淡的面才像山。
  return `<svg class="sc-hills" viewBox="0 0 700 64" preserveAspectRatio="none" aria-hidden="true">
    <path d="M-6 62 C 40 62, 58 30, 104 24 C 140 19, 152 40, 176 48
             C 200 56, 224 46, 248 34 C 276 20, 300 20, 330 30
             C 366 42, 386 54, 420 56 C 470 58, 520 50, 560 52 C 620 55, 660 58, 706 56
             L706 64 L-6 64 Z"
      fill="currentColor" fill-opacity=".055"/>
    <path d="M-6 62 C 40 62, 58 30, 104 24 C 140 19, 152 40, 176 48
             C 200 56, 224 46, 248 34 C 276 20, 300 20, 330 30
             C 366 42, 386 54, 420 56 C 470 58, 520 50, 560 52 C 620 55, 660 58, 706 56"
      fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="1.3" vector-effect="non-scaling-stroke"/>
    <g stroke="currentColor" stroke-opacity=".22" stroke-width="1" fill="none" stroke-linecap="round">
      <path d="M352 18 q5 -4 10.4 0 M367 14 q4.2 -3.6 8.6 0"/>
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
    <div class="sc-stage">
      <div class="sc-rig">${sceneWorker(s.kind, s.kind)}</div>
      <div class="sc-pit"><i></i><i></i><i></i></div>
      <svg class="sc-mound" viewBox="0 0 18 7" aria-hidden="true">
        <path d="M1 6 Q9 0 17 6 Z" fill="currentColor" fill-opacity=".2"/>
      </svg>
    </div>
    <!-- 地面放在人物之后：前坡把小腿挡住，「站在坡后」比「站在一块板上」自然 -->
    <svg class="sc-ground" viewBox="0 0 700 32" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 6 Q 150 1 300 5 T 700 3 L700 32 L0 32 Z" fill="currentColor" fill-opacity=".075"/>
      <path d="M0 15 Q 110 10 250 14 T 700 12 L700 32 L0 32 Z" fill="currentColor" fill-opacity=".08"/>
      <path d="M0 15 Q 110 10 250 14 T 700 12" fill="none" stroke="currentColor" stroke-opacity=".2"
        stroke-width="1" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="sc-drops"></div>
    <div class="sc-hud">
      ${counted
        ? `<b><i class="sc-n${t && t.n ? '' : ' zero'}">${t && t.n ? t.n : 0}</i> 件</b>`
        : `<b class="sc-label">${esc(s.name)}</b>`}
      <span>${esc(s.note)}</span>
    </div>
    ${UI.sceneProbeOn() ? '<div class="sc-probe"></div>' : ''}
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
  if (UI.startSceneWatch) UI.startSceneWatch();         // 心跳监护只开一个，重复调用无副作用
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
// 一锄一周期。v1.31.55 曾在一个周期里塞两锄，看上去像抽搐——
// 3 秒的周期里挥两次，等于每 1.5 秒砸一下，比真人的动作快一倍。
// 现在：抬 0.65s、停 0.26s、落 0.5s，其余时间静止（呼吸与飞鸟仍在动）。
// 举起时要「竖起来」。柄的静止角是 69°（指向右下），
// 只转到 −106° 时柄角还有 −37°，等于把锄头横着端在胸前——看着像举枪。
// 转到 −138°，柄角 −69°，锄头几乎竖直，才像「抡起来要砸下去」。
const SCENE_SWING = [
  [0, 6], [7, 3], [26, -132], [35, -138], [56, 9], [62, 3], [72, 6], [100, 6],
];
const SCENE_RIG = [
  [0, 0], [7, .6], [26, -3.4], [35, -3.6], [56, 4], [62, 1.4], [72, .3], [100, 0],
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
// 两个入口：URL 上的 ?probe=1（电脑上方便），以及设置页的「现场诊断」开关。
// 后者是为「添加到主屏幕」准备的——独立模式没有地址栏，改不了 URL，
// 但设置里那一下点得动。诊断不出来就只能继续猜，这个开关值一条命。
UI._sceneProbeUrl = (typeof location !== 'undefined' && /[?&]probe=1/.test(location.search));
UI.sceneProbeOn = function(){
  return !!UI._sceneProbeUrl || (typeof Prefs !== 'undefined' && !!Prefs.sceneProbe);
};
UI.paintProbe = function(){
  if (!UI.sceneProbeOn()) return;
  const el = (typeof document !== 'undefined') ? document.querySelector('.sc-probe') : null;
  if (!el) return;
  const iv = (typeof currentActionInterval === 'function') ? currentActionInterval() : 0;
  // 除了帧数/相位，还要写「距上一帧多久」与「谁在驱动」——
  // 前者一眼看出链是不是断了，后者说明此刻是 JS 还是 CSS 在画。
  const gap = UI._sceneCss ? '停' : (UI._sceneLast ? Math.round(sceneNow() - UI._sceneLast) + 'ms' : '—');
  const drv = UI._sceneCss ? 'CSS（JS 停摆）' : 'JS';
  const t = '帧 ' + (UI._sceneFrames || 0) + ' · 相位 ' + (UI._scenePhase || 0).toFixed(2)
          + ' · 间隔 ' + iv.toFixed(2) + 's · 迟 ' + gap + ' · ' + drv;
  if (el.textContent !== t) el.textContent = t;
};

function sceneNow(){
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

UI._sceneLast = 0;      // 上一帧的时间戳：心跳停了没有，就看这个
UI._sceneMiss = 0;      // 连续几次「心跳停了」
UI._sceneCss  = false;  // 是否已降级给 CSS 关键帧

UI.stopSceneMotion = function(){
  if (UI._sceneRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(UI._sceneRaf);
  UI._sceneRaf = 0;
};

// 降级开关：把锄头交给 CSS 关键帧（见 style.css 的 scFallback）。
// 只有当 JS 这条链被证明救不回来时才用——它的相位只按墙钟走，
// 与产出不同步，但「在动」比「对得准却没动」重要。
UI.sceneCssFallback = function(on){
  const bar = (typeof document !== 'undefined') ? document.getElementById('sceneBar') : null;
  if (!bar || !bar.classList) return;
  if (on) bar.classList.add('fx-css'); else bar.classList.remove('fx-css');
  UI._sceneCss = !!on;
  UI.paintProbe();       // 降级之后 JS 不再出帧，诊断行得在这里改一次口
};

UI.startSceneMotion = function(){
  if (typeof requestAnimationFrame !== 'function' || typeof document === 'undefined') return;
  // 动效关掉时保留静帧：画面还在（知道在做什么），只是不动
  if (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') return;
  // 已在跑且心跳新鲜 → 不叠加；心跳过期（id 还在、链其实断了）→ 重启。
  // v1.31.59 之前这里是 `if (UI._sceneRaf) return;`：只要 id 没清掉就永远不再启动，
  // 一旦某一帧被丢掉，这个现场就永久定住——iOS「添加到主屏幕」正是这么定住的。
  if (UI._sceneRaf && sceneNow() - UI._sceneLast < 1200) return;
  UI.stopSceneMotion();
  const step = ()=>{
    try {
      UI.paintSceneFrame();
    } finally {
      // 切后台时主动收链。iOS 独立模式挂起页面时，已排队的回调会被丢掉；
      // 若自调度写在函数开头，丢掉一次就再也接不上。
      // 现在改成「画完再排」，并且后台不排——回来由 visibilitychange 重开。
      if (typeof document !== 'undefined' && !document.hidden) UI._sceneRaf = requestAnimationFrame(step);
      else UI._sceneRaf = 0;
    }
  };
  UI._sceneRaf = requestAnimationFrame(step);
};

// 单帧绘制。抽出来是为了让 watchdog 与启动路径共用一份（判据单一来源）。
UI.paintSceneFrame = function(){
  const bar = (typeof document !== 'undefined') ? document.getElementById('sceneBar') : null;
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
    const now = sceneNow();
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
  UI._sceneLast = sceneNow();
  UI._sceneMiss = 0;
  if (UI._sceneCss) UI.sceneCssFallback(false);     // JS 活过来了，收回降级
  if (UI.sceneProbeOn()) UI.paintProbe();
};

// 心跳监护：rAF 这条链在任何环境下都有可能被掐断（切后台、省电模式、
// 独立 WebView 挂起）。断了不能就让它断着——每秒看一眼，停了就重启；
// 连试三次都起不来，说明这个环境压根不给 rAF，降级给 CSS。
UI.startSceneWatch = function(){
  if (typeof setInterval !== 'function' || UI._sceneWatchId) return;
  UI._sceneWatchId = setInterval(function(){
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!UI._sceneSig || UI._sceneSig === 'none') return;
    if (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') return;
    if (sceneNow() - (UI._sceneLast || 0) < 1800){ UI._sceneMiss = 0; return; }
    UI._sceneMiss = (UI._sceneMiss || 0) + 1;
    if (UI._sceneMiss >= 3){
      if (!UI._sceneCss) UI.sceneCssFallback(true);
      return;                                        // 别每分钟再撞一次墙
    }
    UI._sceneRaf = 0;
    UI.startSceneMotion();
  }, 1000);
};

// 回到前台：清掉陈旧的心跳记录，重新开链。
// pageshow 管「从 bfcache 里被翻出来」，focus 管「切 App 回来但没触发 visibility」。
if (typeof document !== 'undefined' && document.addEventListener){
  const resume = ()=>{
    if (typeof document !== 'undefined' && document.hidden) return;
    UI._sceneLast = 0; UI._sceneMiss = 0; UI._sceneRaf = 0;
    if (UI._sceneCss) UI.sceneCssFallback(false);
    if (UI._sceneSig && UI._sceneSig !== 'none') UI.startSceneMotion();
  };
  document.addEventListener('visibilitychange', resume);
  if (typeof window !== 'undefined' && window.addEventListener){
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', resume);
  }
}

if (typeof window !== 'undefined'){
  window.sceneAngleAt = sceneAngleAt;
  window.sceneToolPath = sceneToolPath;
  window.SCENE_SWING = SCENE_SWING;
  window.SCENE_RIG = SCENE_RIG;
  window.sceneState = sceneState;
  window.sceneHtml = sceneHtml;
  window.sceneSig = sceneSig;
}
