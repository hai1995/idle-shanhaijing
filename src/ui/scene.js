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

// 五系各一色。日间是深墨，夜间必须换一套浅的——同一块 #1F3D5C 放在 #17140F 上，
// 对比度只有 1.6:1，等于没有画面。夜间版按「同一色相提亮到 4.5:1 以上」取。
const SCENE_INK = {
  nanshan:  '#2E5269',
  xishan:   '#6B6659',
  beishan:  '#1F3D5C',
  dongshan: '#566E4C',
  zhongshan:'#B03A2B',
};
const SCENE_INK_NIGHT = {
  nanshan:  '#8FB4CB',
  xishan:   '#B6AB92',
  beishan:  '#7FA3C6',
  dongshan: '#A2C48E',
  zhongshan:'#DE6650',
};

// 当前主题。读 documentElement 的 data-theme，与 CSS 用同一个判据（setTheme 写的就是它）。
function sceneNight(){
  if (typeof document === 'undefined' || !document.documentElement) return false;
  return document.documentElement.getAttribute('data-theme') === 'night';
}
// night 参数只为测试留的：不传就跟当前主题走（判据仍是 sceneNight 一处）。
function sceneInkOf(ser, night){
  const n = (night === undefined) ? sceneNight() : !!night;
  const pal = n ? SCENE_INK_NIGHT : SCENE_INK;
  return pal[ser] || (n ? '#B6AB92' : '#6B6659');
}

// 当前行动 → 现场要画的东西。
// v1.31.61 起，征伐也算一种「行动」：此前这里对战斗直接返回 null，
// 于是挂机打怪时整条现场消失，玩家反而看不见「在打」。
function sceneState(){
  const a = (typeof Game !== 'undefined') ? Game.activity : null;
  const node = (typeof nodeOf === 'function' && typeof Game.node === 'string') ? nodeOf(Game.node) : null;
  const reg  = (typeof regionOf === 'function' && typeof Game.node === 'string') ? regionOf(Game.node) : null;
  const ser  = reg ? String(reg.regionId).split('-')[0] : '';
  const ink  = sceneInkOf(ser);
  const place = node ? node.name : '';
  const iv   = (typeof currentActionInterval === 'function') ? currentActionInterval() : 3;

  // 征伐：战斗是另一套状态（Game.combat），不在 Game.activity 里
  const cb = (typeof Game !== 'undefined') ? Game.combat : null;
  if (cb && typeof foeOf === 'function' && typeof Monsters !== 'undefined' && Monsters[cb.monsterId]){
    const m = foeOf(Monsters[cb.monsterId]);
    // 节拍取「几秒一击」，与采集的「几秒一采」是同一个概念：
    // 动画周期必须等于产出周期，否则「一击一伤」的因果会错位。
    const atk = (typeof playerAttackInterval === 'function') ? Math.max(0.2, playerAttackInterval()) : 1;
    return {
      kind:'fight', ink, place, iv: atk,
      key: `fight:${cb.monsterId}`,
      verb:'战', name: m.name,
      note: `每 ${atk.toFixed(1)} 秒一击`,
      foe: { name: m.name, hp: Math.max(0, Math.round(cb.monsterHp || 0)), max: Math.round(m.hp || 0) },
    };
  }

  if (!a) return null;

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
  if (a.kind === 'meditate'){
    return { kind:'meditate', ink, place, iv, key:'meditate', verb:'坐', name:'打坐', note:'神思内守' };
  }
  return { kind:'other', ink, place, iv, key:`other:${a.kind}`, verb:'为', name:(typeof currentActivityLabel==='function'?currentActivityLabel():'行动'), note:'' };
}

// 场景里的小人：一个躬身劳作的像素剪影，面朝右侧的挖掘点。
// 改用方块像素（shape-rendering: crispEdges），与「现场不引入图片资源」的约束一致，
// 也比此前的水墨曲线更贴「像素风」。用一组 <rect> 拼轮廓，沿用 currentColor 与朱色腰带。
// 工具仍由 sceneTool(kind) 注入，挥落动画（坐标旋转）原样保留——见 paintSceneFrame。
function sceneWorker(kind){
  // 打坐：盘坐吐纳。宽厚的裙摆底座 + 垂臂搭膝，与站立劳作剪影同一套像素语汇。
  // 不引入工具：打坐是「什么都不做」的修行，画面也该静。呼吸由 .sc-figure 的 scBreath 承担。
  if (kind === 'meditate'){
    return `<svg class="sc-worker" viewBox="0 0 60 70" aria-hidden="true" shape-rendering="crispEdges">
    <g class="sc-figure">
      <!-- 发髻 -->
      <rect x="23" y="9" width="8" height="3" fill="currentColor" opacity=".8"/>
      <!-- 头 -->
      <rect x="23" y="12" width="8" height="8" fill="currentColor"/>
      <!-- 肩 -->
      <rect x="18" y="21" width="14" height="4" fill="currentColor"/>
      <!-- 上身（袍） -->
      <rect x="17" y="25" width="16" height="14" fill="currentColor" opacity=".95"/>
      <!-- 朱色腰带：与劳作剪影同一处暖色点题 -->
      <rect x="16" y="37" width="18" height="3" fill="#B03A2B" opacity=".55"/>
      <!-- 双臂垂落，手搭膝上 -->
      <rect x="15" y="28" width="5" height="15" fill="currentColor"/>
      <rect x="30" y="28" width="5" height="15" fill="currentColor"/>
      <rect x="10" y="41" width="8" height="6" fill="currentColor" opacity=".92"/>
      <rect x="32" y="41" width="8" height="6" fill="currentColor" opacity=".92"/>
      <!-- 盘坐：宽厚裙摆底座（底沿与站姿脚底同在 y60，坐实地面上） -->
      <rect x="9" y="44" width="34" height="16" fill="currentColor" opacity=".9"/>
      <rect x="9" y="44" width="34" height="3" fill="currentColor"/>
      <!-- 交叠中缝：盘腿的暗示 -->
      <rect x="27" y="44" width="6" height="16" fill="currentColor" opacity=".18"/>
    </g>
  </svg>`;
  }
  return `<svg class="sc-worker" viewBox="0 0 60 70" aria-hidden="true" shape-rendering="crispEdges">
    <g class="sc-figure">
      <!-- 发髻 -->
      <rect x="22" y="6" width="9" height="3" fill="currentColor" opacity=".8"/>
      <!-- 头：方块（真人头约占身高 1/7.5，方块化后略收） -->
      <rect x="22" y="9" width="9" height="9" fill="currentColor"/>
      <!-- 肩 -->
      <rect x="17" y="18" width="13" height="4" fill="currentColor"/>
      <!-- 上身（袍） -->
      <rect x="16" y="22" width="14" height="11" fill="currentColor" opacity=".95"/>
      <!-- 下摆（袍外扩） -->
      <rect x="14" y="33" width="18" height="13" fill="currentColor" opacity=".92"/>
      <!-- 朱色腰带：点题，画面里唯一一处暖色 -->
      <rect x="15" y="32" width="16" height="3" fill="#B03A2B" opacity=".6"/>
      <!-- 手臂：从肩伸向握点（31,30） -->
      <rect x="26" y="22" width="7" height="8" fill="currentColor"/>
      <!-- 双腿 -->
      <rect x="16" y="46" width="6" height="14" fill="currentColor" opacity=".95"/>
      <rect x="24" y="46" width="6" height="14" fill="currentColor" opacity=".95"/>
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

// 每种工具一套「柄向量 + 刃半宽」。锄长、锤短，但举落是同一套帧表——
// 动作的节奏属于「人」，不属于工具，所以只换尺寸，不换时间轴。
const SCENE_KIT = {
  gather: { stick: SCENE_STICK, blade: SCENE_BLADE },
  craft:  { stick: [4, 17],     blade: 6.2 },
};

function sceneToolPath(a, kind){
  const kit = SCENE_KIT[kind] || SCENE_KIT.gather;
  const stick = kit.stick, half = kit.blade;
  const rad = (isFinite(a) ? a : 0) * Math.PI / 180;
  const c = Math.cos(rad), sn = Math.sin(rad);
  const vx = stick[0]*c - stick[1]*sn;
  const vy = stick[0]*sn + stick[1]*c;
  const L  = Math.hypot(stick[0], stick[1]);
  const px = -vy / L, py = vx / L;                 // 垂直于柄
  const ex = SCENE_GRIP[0] + vx, ey = SCENE_GRIP[1] + vy;
  const b1 = [ex - px*half, ey - py*half];
  const b2 = [ex + px*half, ey + py*half];
  const shrink = (q, k) => [ex + (q[0]-ex)*k, ey + (q[1]-ey)*k];
  const c1 = shrink(b1, .84), c2 = shrink(b2, .84);
  const f = n => n.toFixed(1);
  return {
    shaft: `M${SCENE_GRIP[0]} ${SCENE_GRIP[1]} L${f(ex)} ${f(ey)}`,
    blade: `M${f(b1[0])} ${f(b1[1])} L${f(b2[0])} ${f(b2[1])}`,
    mark:  `M${f(c1[0])} ${f(c1[1])} L${f(c2[0])} ${f(c2[1])}`,
  };
}

// ---------- 行动 → 现场 ----------
// 六种行动此前是四条各自独立的 if 链（工具 / 物 / 天象 / 每帧驱动），
// 加第七种要改四处，且容易只改一处。收成一张表：加行动只加一行。
//   tool   手里的工具（art 名，空 = 空手）
//   prop   地上的物（art 名，空 = 只有地面）
//   sky    天象（art 名，空 = 不画）
//   driver 谁在动：swing 举落 / lunge 前冲 / idle 交给 CSS
const SCENE_KINDS = {
  gather:   { tool:'hoe',    prop:'mound', driver:'swing' },
  craft:    { tool:'hammer', prop:'anvil', driver:'swing' },
  grow:     { tool:'',       prop:'shrub', driver:'idle'  },
  observe:  { tool:'',       prop:'',      sky:'stars', driver:'idle' },
  audience: { tool:'',       prop:'steps', driver:'idle'  },
  meditate: { tool:'',       prop:'',      driver:'idle'  },   // 打坐：盘坐吐纳，无工具无道具
  fight:    { tool:'sword',  prop:'',      driver:'lunge' },   // 兽单独画，见 sceneHtml
  other:    { tool:'',       prop:'',      driver:'idle'  },
};
function sceneRecipe(kind){ return SCENE_KINDS[kind] || SCENE_KINDS.other; }

// 工具：人物 SVG 内部的一个 <g>，**每帧改 SVG 原生 transform 属性**。
// 三次失败的经验：
//   v1.31.54 `<g>` + CSS transform  → Safari 不动
//   v1.31.56 独立 `<svg>` + JS 写 style.transform → Safari 仍不动
// 结论：Safari 对 SVG 元素的 **CSS** transform 支持不可靠；而 `transform`
// 属性和 `rotate(角度 cx cy)` 是 SVG 1.1 就有的东西，二十年来没有内核不支持。
// 所以这里既不写 style.transform，也不用 transform-origin——
// 旋转中心直接写进属性里：rotate(a 30 38)，坐标就是人物 viewBox 的坐标系。
// 三个薄包装：对外仍按「行动名」调用（sceneProps('gather')），
// 内部经注册表换成 art 名。这样测试与外部导出都不用改。
function sceneTool(kind){ return sceneToolArt(sceneRecipe(kind).tool); }

function sceneToolArt(name){
  if (name === 'hoe'){
    return `<g class="sc-tool">
      <path class="sc-shaft" d="M31 30 L41 59" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
      <path class="sc-blade" d="M33.4 62.4 L48.4 56.4" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>
      <path class="sc-mark"  d="M35 61.7 L46.8 57.1" stroke="#B03A2B" stroke-width="1.8" stroke-linecap="round" opacity=".88"/>
    </g>`;
  }
  // 锤：与锄同一套几何（柄 + 头），只是柄短、头方。这样「举—落」的节奏不用另写一份。
  if (name === 'hammer'){
    return `<g class="sc-tool">
      <path class="sc-shaft" d="M31 30 L35 47" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
      <path class="sc-blade" d="M31.6 48 L38.6 44.4" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path class="sc-mark"  d="M32.6 47.5 L36.6 45.4" stroke="#B03A2B" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    </g>`;
  }
  // 剑：贴着手的短柄 + 长刃 + 红缨。剑不挥，靠整个人前冲（见 paintFight）。
  if (name === 'sword'){
    return `<g class="sc-tool">
      <path d="M31 30 L54 39" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M42 34.4 L55 39.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
      <path d="M33.4 35.2 L38.8 28.8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M29.6 28.6 L26.4 26.2" stroke="#B03A2B" stroke-width="2" stroke-linecap="round" opacity=".85"/>
    </g>`;
  }
  return '';
}

// 敌方：一头伏低的兽，方块像素（crispEdges），与玩家小人同一套像素语汇。
// 面向左（朝我方）：头在左、尾在右；四足、双角、朱色眼点。
// 只改几何，不碰 .sc-foe 类与命中动画（paintFight 仍 toggle .hit）。
function sceneFoe(){
  return `<svg class="sc-foe" viewBox="0 0 46 34" aria-hidden="true" shape-rendering="crispEdges">
    <!-- 躯干 -->
    <rect x="13" y="14" width="24" height="10" fill="currentColor" opacity=".85"/>
    <!-- 头（朝左） -->
    <rect x="5" y="12" width="10" height="9" fill="currentColor" opacity=".9"/>
    <!-- 双角 -->
    <rect x="6" y="5" width="2" height="6" fill="currentColor" opacity=".85"/>
    <rect x="11" y="3" width="2" height="7" fill="currentColor" opacity=".7"/>
    <!-- 尾（朝右） -->
    <rect x="37" y="13" width="6" height="3" fill="currentColor" opacity=".8"/>
    <rect x="41" y="10" width="4" height="2" fill="currentColor" opacity=".7"/>
    <!-- 四足 -->
    <rect x="14" y="24" width="3" height="8" fill="currentColor" opacity=".9"/>
    <rect x="20" y="24" width="3" height="8" fill="currentColor" opacity=".9"/>
    <rect x="27" y="24" width="3" height="8" fill="currentColor" opacity=".9"/>
    <rect x="33" y="24" width="3" height="8" fill="currentColor" opacity=".9"/>
    <!-- 眼：画面里唯一暖色点 -->
    <rect x="7" y="14" width="2" height="2" fill="#B03A2B"/>
  </svg>`;
}

// 地面上的「物」：每种行动一件，和锄头一样只用线条与淡墨块。
function sceneProps(kind){ return scenePropArt(sceneRecipe(kind).prop); }

function scenePropArt(name){
  if (name === 'mound'){
    return `<div class="sc-pit"><i></i><i></i><i></i></div>
      <svg class="sc-mound" viewBox="0 0 18 8" aria-hidden="true" shape-rendering="crispEdges">
        <!-- 像素土堆：阶梯状小 pyramid -->
        <rect x="8" y="1" width="2" height="2" fill="currentColor" fill-opacity=".3"/>
        <rect x="6" y="3" width="6" height="2" fill="currentColor" fill-opacity=".25"/>
        <rect x="3" y="5" width="12" height="3" fill="currentColor" fill-opacity=".2"/>
      </svg>`;
  }
  // 砧：一块上宽下窄的石（像素：三层叠块）
  if (name === 'anvil'){
    return `<svg class="sc-anvil" viewBox="0 0 24 14" aria-hidden="true" shape-rendering="crispEdges">
      <rect x="2" y="3" width="20" height="3" fill="currentColor" fill-opacity=".3"/>
      <rect x="4" y="6" width="16" height="3" fill="currentColor" fill-opacity=".26"/>
      <rect x="6" y="9" width="12" height="5" fill="currentColor" fill-opacity=".22"/>
    </svg>`;
  }
  // 灌木：一丛墨块（像素：几块方块 + 茎），风一来轻轻摆（CSS 驱动，不占 JS 帧）
  if (name === 'shrub'){
    return `<svg class="sc-sprout" viewBox="0 0 30 26" aria-hidden="true" shape-rendering="crispEdges">
      <rect x="14" y="18" width="2" height="7" fill="currentColor" opacity=".7"/>
      <rect x="6" y="9" width="7" height="6" fill="currentColor" opacity=".42"/>
      <rect x="13" y="5" width="9" height="8" fill="currentColor" opacity=".46"/>
      <rect x="20" y="10" width="6" height="5" fill="currentColor" opacity=".4"/>
      <rect x="10" y="13" width="8" height="5" fill="currentColor" opacity=".38"/>
    </svg>`;
  }
  // 谒见：三级台阶（「谨候阶下」字面就是台阶）
  if (name === 'steps'){
    return `<svg class="sc-gate" viewBox="0 0 34 30" aria-hidden="true">
      <!-- 三级台阶，自下而上收窄。30px 的宽里，台阶比门阙好认得多 -->
      <g fill="currentColor" opacity=".3">
        <rect x="0" y="22" width="34" height="6"/>
        <rect x="4" y="16" width="26" height="6"/>
        <rect x="8.6" y="10" width="16.8" height="6"/>
      </g>
      <g stroke="currentColor" stroke-opacity=".4" stroke-width="1.1">
        <path d="M0 22 L34 22"/><path d="M4 16 L30 16"/><path d="M8.6 10 L25.4 10"/>
      </g>
      <path d="M0 28 L34 28" stroke="currentColor" stroke-opacity=".26" stroke-width="1"/>
    </svg>`;
  }
  return '';
}

// 天象：观象时抬头看的东西，铺满整条现场（不放在 stage 里）
function sceneSky(kind){ const k = sceneRecipe(kind).sky; return k ? sceneSkyArt(k) : ''; }

function sceneSkyArt(name){
  if (name !== 'stars') return '';
  return `<svg class="sc-stars" viewBox="0 0 405 60" preserveAspectRatio="none" aria-hidden="true" shape-rendering="crispEdges">
    <path d="M0 0 L405 0 L405 22 Q330 30 250 24 Q160 17 90 26 Q40 31 0 25 Z"
      fill="currentColor" fill-opacity=".05"/>
    <g fill="currentColor" opacity=".55">
      <rect x="119" y="13" width="2.6" height="2.6"/>
      <rect x="195" y="8" width="2.4" height="2.4"/>
      <rect x="267" y="15" width="2.2" height="2.2"/>
      <rect x="329" y="10" width="2.6" height="2.6"/>
    </g>
    <rect x="230" y="4" width="13" height="13" fill="currentColor" opacity=".35"/>
  </svg>`;
}

// 现场中央：一击命中的火花（CSS 驱动，只在 .hit 那一刻显形）
function sceneSpark(){
  return `<div class="sc-spark"><i></i><i></i><i></i><i></i></div>`;
}

// 远山：阶梯状像素剪影，最远最淡。宽度随容器拉伸（preserveAspectRatio=none），
// 只作气氛，不表地形——本项目的地形数据是「里程 + 方位」，画不出等高线。
function sceneHills(){
  // viewBox 取 700×64：手机 430×42 与宽屏 1080×52 都在附近，拉伸压缩都在一成上下。
  // 像素山用「水平 + 垂直」阶梯拼出，而非曲线——crispEdges 下是块面，不是心电图。
  return `<svg class="sc-hills" viewBox="0 0 700 64" preserveAspectRatio="none" aria-hidden="true" shape-rendering="crispEdges">
    <path d="M-6 62 L-6 46 L70 46 L70 34 L150 34 L150 44 L230 44 L230 28 L320 28
             L320 40 L410 40 L410 30 L500 30 L500 42 L590 42 L590 36 L670 36 L670 50 L706 50
             L706 64 L-6 64 Z"
      fill="currentColor" fill-opacity=".055"/>
    <path d="M-6 46 L70 46 L70 34 L150 34 L150 44 L230 44 L230 28 L320 28
             L320 40 L410 40 L410 30 L500 30 L500 42 L590 42 L590 36 L670 36 L670 50 L706 50"
      fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="1.3" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

// 整块现场。只在与上一次的签名不同时才重建（见 UI.renderScene）。
function sceneHtml(s){
  const anim = (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') ? ' no-anim' : '';
  const t = (UI._tally && UI._tally.key === s.key) ? UI._tally : null;
  // 只有采集与制作会「一件一件出东西」；观象、谒见、莳植没有计数可言，
  // 硬摆一个永远是 0 的大数字，比不摆更让人困惑。
  const counted = (s.kind === 'gather' || s.kind === 'craft');
  const rec = sceneRecipe(s.kind);
  const fight = (rec.driver === 'lunge');
  const hud = fight
    ? `<b class="sc-label">${esc(s.foe.name)}</b><span>气血 ${s.foe.hp} / ${s.foe.max}</span>`
    : (counted
        ? `<b><i class="sc-n${t && t.n ? '' : ' zero'}">${t && t.n ? t.n : 0}</i> 件</b>`
        : `<b class="sc-label">${esc(s.name)}</b>`);
  return `<div class="sc-wrap${anim}" data-kind="${s.kind}" style="--ai:${s.iv.toFixed(2)}s;color:${s.ink}">
    <div class="sc-sky"></div>
    ${sceneHills()}
    ${sceneSky(s.kind)}
    <div class="sc-stage${fight ? ' sc-duel' : ''}">
      <div class="sc-rig">${sceneWorker(s.kind, s.kind)}</div>
      ${fight ? '<div class="sc-foe-rig">' + sceneFoe() + '</div>' + sceneSpark() : sceneProps(s.kind)}
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
      ${hud}
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
  // #statusbar 是 #sceneBar 的常驻兄弟节点（v1.31.145）：叠在现场顶部、融入动画画面。
  // 这里只重建 .sc-wrap，绝不动 #statusbar——否则动作条会被清掉，动画也随之归零。
  const sb = (typeof document !== 'undefined') ? document.getElementById('statusbar') : null;
  const on = !(typeof Prefs !== 'undefined' && Prefs.sceneOn === false);
  const s = on ? sceneState() : null;
  // 现场显示时，仪表带那根细进度条要收起来（v1.31.55）：
  // 同一件事（挖到几分）在屏幕上下各画一根，是纯冗余。进度改由现场底部那根承担。
  if (sb && sb.classList) sb.classList.toggle('scene-on', !!s);
  if (!s){
    // 没有现场：去掉 .sc-wrap（状态条仍在，作为独立带状显示当前行动）；容器始终可见。
    const wrap = bar.querySelector('.sc-wrap');
    if (wrap) wrap.remove();
    bar.classList.remove('hidden');
    UI._sceneSig = 'none';
    if (UI.stopSceneMotion) UI.stopSceneMotion();
    return;
  }
  bar.classList.remove('hidden');
  const sig = sceneSig(s);
  if (sig !== UI._sceneSig){
    UI._sceneSig = sig;
    UI._sceneKind = s.kind;
    UI._sceneIv = s.iv;
    // 只换 .sc-wrap：旧的有就删、没有就建，状态条（兄弟节点）原样保留。
    let wrap = bar.querySelector('.sc-wrap');
    if (!wrap){ wrap = document.createElement('div'); bar.appendChild(wrap); }
    wrap.outerHTML = sceneHtml(s);          // 整体替换外壳，内部 id / 动画节点随之刷新
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
// 征伐不用「举落」，用「前冲」：先缩半步蓄力，再突进 9px，命中回弹。
// 单位是 px（translateX），与上面的角度帧表共用 sceneAngleAt 的插值。
const SCENE_LUNGE = [
  [0, 0], [10, -1.2], [45, -3], [62, -3.4], [88, 9], [94, 2.4], [100, 0],
];
// 敌方受击后退：与小人前冲同相位——小人在 p≈0.9 突进到 +9 时，兽被「击退」一小格
// （向右、远离小人），跨段定格（见 sceneAngleAt）得到像素风卡帧的撞击反馈。
const SCENE_FOE_RECOIL = [
  [0, 0], [72, 0], [86, 1], [90, 5], [95, 3], [100, 0],
];

// 离散帧（定格）动画：不在关键帧之间插值，而是「取所在段起点那帧」直接定格——
// 一段内姿态不变，跨段才跳一格，得到像素风特有的「卡帧」节奏（见 ROADMAP 夜间项 #1）。
// 相位 p 仍由引擎进度连续提供（命中判定、诊断行照常工作），只把「画」量化成帧。
function sceneAngleAt(frames, p){
  const x = Math.max(0, Math.min(100, p * 100));
  for (let i = 1; i < frames.length; i++){
    if (x <= frames[i][0]) return frames[i-1][1];
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
  const drv = sceneReduceMotion() ? '停（系统减动效）' : (UI._sceneCss ? 'CSS（JS 停摆）' : 'JS');
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

UI._sceneGen = 0;      // 代次：停一次 +1，在途的那一帧据此作废

UI.stopSceneMotion = function(){
  // 只 cancel 是不够的：如果这一帧正在执行，cancel 拦不住它，
  // 而它末尾又会排下一帧——链照旧活着，只是 `_sceneRaf` 已经清零、
  // 谁也管不着它了（关掉现场后仍在后台每帧跑，是实测到的）。
  // 所以停的时候把代次 +1：在途的帧看到代次变了就自行退出。
  UI._sceneGen++;
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
  // 动效关掉、或系统开了「减弱动态效果」时保留静帧：
  // 画面还在（知道在做什么），只是不动。
  if (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') return;
  if (sceneReduceMotion()) return;
  // 已在跑且心跳新鲜 → 不叠加；心跳过期（id 还在、链其实断了）→ 重启。
  // v1.31.59 之前这里是 `if (UI._sceneRaf) return;`：只要 id 没清掉就永远不再启动，
  // 一旦某一帧被丢掉，这个现场就永久定住——iOS「添加到主屏幕」正是这么定住的。
  if (UI._sceneRaf && sceneNow() - UI._sceneLast < 1200) return;
  UI.stopSceneMotion();
  const gen = UI._sceneGen;
  const step = ()=>{
    if (gen !== UI._sceneGen) return;                 // 已被停掉 / 换了一代
    try {
      UI.paintSceneFrame();
    } finally {
      if (gen !== UI._sceneGen) return;               // 画的过程中被停掉，不再续链
      // 切后台时主动收链。iOS 独立模式挂起页面时，已排队的回调会被丢掉；
      // 若自调度写在函数开头，丢掉一次就再也接不上。
      // 现在改成「画完再排」，并且后台不排——回来由 visibilitychange 重开。
      if (typeof document !== 'undefined' && !document.hidden) UI._sceneRaf = requestAnimationFrame(step);
      else UI._sceneRaf = 0;
    }
  };
  UI._sceneRaf = requestAnimationFrame(step);
};

// 征伐的单帧：相位取战斗自己的 timer（不是采集的 activityProgress）。
// 命中判定用「相位绕回」——timer 被减掉一个间隔的瞬间，就是这一击落下的时候。
function paintFight(bar, rig){
  const iv = UI._sceneIv > 0 ? UI._sceneIv : 1;
  const c = (typeof Game !== 'undefined') ? Game.combat : null;
  let p;
  if (c && typeof c.timer === 'number'){
    p = Math.max(0, Math.min(1, c.timer / iv));
  } else {
    const T = iv * 1000;
    p = (sceneNow() % T) / T;
  }
  const dx = sceneAngleAt(SCENE_LUNGE, p);
  if (rig && isFinite(dx)) rig.style.transform = 'translateX(' + dx.toFixed(1) + 'px)';
  // 敌方受击后退：与小人前冲同相位（p≈0.9 突进到 +9 时兽被击退一小格），跨段定格。
  const fr = sceneAngleAt(SCENE_FOE_RECOIL, p);
  const foRig = bar.querySelector('.sc-foe-rig');
  if (foRig && isFinite(fr)) foRig.style.transform = 'translateX(' + fr.toFixed(1) + 'px)';
  const last = UI._scenePhase;
  if (last !== undefined && p < last - 0.35){
    const fo = bar.querySelector('.sc-foe');
    const sp = bar.querySelector('.sc-spark');
    if (fo){ fo.classList.remove('hit'); void fo.getBoundingClientRect(); fo.classList.add('hit'); }
    if (sp){ sp.classList.remove('on'); void sp.offsetWidth; sp.classList.add('on'); }
  }
  UI._scenePhase = p;
  UI._sceneFrames = (UI._sceneFrames || 0) + 1;
  UI._sceneLast = sceneNow();
  UI._sceneMiss = 0;
  if (UI._sceneCss) UI.sceneCssFallback(false);
  if (UI.sceneProbeOn()) UI.paintProbe();
}

// 单帧绘制。抽出来是为了让 watchdog 与启动路径共用一份（判据单一来源）。
UI.paintSceneFrame = function(){
  const bar = (typeof document !== 'undefined') ? document.getElementById('sceneBar') : null;
  if (!bar) return;
  const rig = bar.querySelector('.sc-rig');
  // 征伐走另一套：不挥工具，整个人前冲；命中一刻迸火。
  if (sceneRecipe(UI._sceneKind).driver === 'lunge'){ paintFight(bar, rig); return; }
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
  const g = sceneToolPath(ta, UI._sceneKind);
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
// 系统级「减弱动态效果」。CSS 那边已经有一条 `@media (prefers-reduced-motion: reduce)`
// 把所有 animation 收到 0.01s，可这把锄头是 JS 每帧算坐标写 d 的，CSS 管不到——
// 于是开着「减弱动态效果」的机器上，静态装饰全停了，只有锄头还在挥（还费电）。
// 判据收在这里一处：启动、watchdog、渲染三处都问它。
function sceneReduceMotion(){
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try { return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; }
}

UI.startSceneWatch = function(){
  if (typeof setInterval !== 'function' || UI._sceneWatchId) return;
  UI._sceneWatchId = setInterval(function(){
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!UI._sceneSig || UI._sceneSig === 'none') return;
    if (typeof Prefs !== 'undefined' && Prefs.fxLevel === 'off') return;
    if (sceneReduceMotion()) return;      // 系统级停摆：不再拉起（否则每秒白跑一次 watchdog）
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
    if (UI._sceneSig && UI._sceneSig !== 'none' && !sceneReduceMotion()) UI.startSceneMotion();
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
  window.SCENE_LUNGE = SCENE_LUNGE;
  window.SCENE_KIT = SCENE_KIT;
  window.sceneInkOf = sceneInkOf;
  window.sceneNight = sceneNight;
  window.sceneReduceMotion = sceneReduceMotion;
  window.sceneProps = sceneProps;
  window.SCENE_KINDS = SCENE_KINDS;
  window.sceneRecipe = sceneRecipe;
  window.sceneFoe = sceneFoe;
  window.sceneSky = sceneSky;
  window.SCENE_SWING = SCENE_SWING;
  window.SCENE_RIG = SCENE_RIG;
  window.sceneState = sceneState;
  window.sceneHtml = sceneHtml;
  window.sceneSig = sceneSig;
}
