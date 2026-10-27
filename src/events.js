// ===== src/events.js — 行旅见闻（奇遇） =====
// 采集途中低概率触发的小事件。目的只有一个：**盯屏幕的时候偶尔发生点别的**，
// 而不是永远「采到 X ×1、采到 X ×1」。
//
// 四条设计约束（都是踩过的坑）：
//   1. 只做正向与中性，不做惩罚。放置游戏里罚一次，玩家只会觉得「挂机有风险」，
//      从此不挂机——那是把核心玩法劝退。
//   2. 有全局冷却（EVENT_GAP）。没有冷却就会连出三次，那时它不再是「奇遇」，是噪声。
//   3. 效果只用引擎已有的原语（gainXp / giveItem / recordObject / 贝币）。
//      **不引入「临时增益」这类需要额外结算与存档的状态**——那等于新开一套系统，
//      而见闻只该是「一句话 + 一点东西」。
//   4. 冷却与次数随存档走。刷新页面能把冷却洗掉，就等于刷新能刷事件。

const EVENT_GAP = 90;         // 全局冷却（游戏秒）
const EVENT_CHANCE = 0.05;    // 每次采集的触发概率

// 一件事件的形状：{ id, weight, when?, run(ctx) → { log, toast } }
// ctx: { kind, itemId, skillId, nodeId }
const TRAVEL_EVENTS = [
  {
    id: 'canjian', name: '拾得残简', weight: 3,
    run(ctx){
      const lv = (typeof levelOf === 'function') ? levelOf('zhulu') : 1;
      const xp = 8 + Math.round(lv * 0.6);
      const shells = 10 + lv * 2;
      if (typeof gainXp === 'function') gainXp('zhulu', xp);
      Game.shells = (Game.shells || 0) + shells;
      Game.stats.totalEarned = (Game.stats.totalEarned || 0) + shells;
      return { log: `📜 拾得残简半卷，读之有所得（著录 +${xp} · 贝 +${shells}）`,
               toast: `📜 拾得残简\n著录 +${xp} · 贝 +${shells}` };
    },
  },
  {
    id: 'yuhou', name: '雨后菌出', weight: 3,
    when(ctx){ return !!(ctx && ctx.itemId && Items[ctx.itemId]); },
    run(ctx){
      const it = Items[ctx.itemId];
      const n = 1 + (Math.random() < 0.25 ? 1 : 0);
      if (typeof giveItem === 'function') giveItem(ctx.itemId, n, false);
      return { log: `🌧️ 一阵山雨过后，土松菌出，又得 ${it.name} ×${n}`,
               toast: `🌧️ 雨后\n${it.name} ×${n}` };
    },
  },
  {
    id: 'zongji', name: '见兽踪迹', weight: 2,
    when(ctx){ return !ctx || !ctx.kind || ctx.kind === 'gather'; },
    run(ctx){
      const lv = (typeof levelOf === 'function') ? levelOf('taofa') : 1;
      const xp = 10 + Math.round(lv * 0.5);
      if (typeof gainXp === 'function') gainXp('taofa', xp);
      const where = (typeof nodeOf === 'function' && ctx && ctx.nodeId) ? (nodeOf(ctx.nodeId) || {}).name : '';
      return { log: `🐾 ${where ? where + '之侧' : '林间'}有蹄爪印，辨其形迹（讨伐 +${xp}）`,
               toast: `🐾 见异兽踪迹\n讨伐 +${xp}` };
    },
  },
  {
    id: 'laomu', name: '老木可辨', weight: 2,
    // 专属采药：文案写的就是「采药 +xp」，串到樵采头上会前后不搭。
    // 通用采集（残简/古玉/雨后/兽踪）仍覆盖所有技艺，见闻不会因此变稀。
    when(ctx){ return !ctx || !ctx.kind || (ctx.kind === 'gather' && (!ctx.skillId || ctx.skillId === 'caiyao')); },
    run(){
      const lv = (typeof levelOf === 'function') ? levelOf('caiyao') : 1;
      const xp = 9 + Math.round(lv * 0.5);
      if (typeof gainXp === 'function') gainXp('caiyao', xp);
      return { log: `🌳 道旁一株老木，皮纹如篆（采药 +${xp}）`,
               toast: `🌳 老木可辨\n采药 +${xp}` };
    },
  },
  {
    id: 'yunqi', name: '云气可观', weight: 2,
    when(ctx){ return !ctx || !ctx.kind || ctx.kind === 'gather'; },
    run(){
      const lv = (typeof levelOf === 'function') ? levelOf('guanxiang') : 1;
      const xp = 9 + Math.round(lv * 0.5);
      if (typeof gainXp === 'function') gainXp('guanxiang', xp);
      return { log: `☁️ 云气自西来，其色如赭（观象 +${xp}）`,
               toast: `☁️ 云气可观\n观象 +${xp}` };
    },
  },
  {
    id: 'cangyu', name: '拾得残骨', weight: 3,
    when(ctx){ return ctx && ctx.kind === 'fight'; },
    run(){
      // 战后的「残迹」：不给战利品（那由掉落表管），只给一点「读得懂」的东西
      const lv = (typeof levelOf === 'function') ? levelOf('taofa') : 1;
      const xp = 12 + Math.round(lv * 0.5);
      const shells = 14 + lv * 3;
      if (typeof gainXp === 'function') gainXp('taofa', xp);
      Game.shells = (Game.shells || 0) + shells;
      Game.stats.totalEarned = (Game.stats.totalEarned || 0) + shells;
      return { log: `🦴 战后拾其残骨一片，纹如符篆（讨伐 +${xp} · 贝 +${shells}）`,
               toast: `🦴 拾得残骨\n讨伐 +${xp} · 贝 +${shells}` };
    },
  },
  {
    id: 'qiaoshou', name: '巧手偶得', weight: 3,
    when(ctx){ return ctx && ctx.kind === 'craft' && ctx.itemId && Items[ctx.itemId]; },
    run(ctx){
      // 巧手偶得：多做出一件。制作本来就付过料，这里等于「省了一份料」
      const it = Items[ctx.itemId];
      if (typeof giveItem === 'function') giveItem(ctx.itemId, 1, false);
      return { log: `🪶 手熟，收尾时又成 ${it.name} ×1`, toast: `🪶 巧手偶得\n${it.name} ×1` };
    },
  },
  // ── v1.31.86 新增：把「只在采集里出现」的见闻，按技艺与外景铺开 ──
  // 理由：见闻此前只认得「采药 / 观象 / 讨伐 / 著录」四条技艺，
  // 樵采、采玉、渔、炉料这些玩家同样在挂的技艺，一辈子见不到一句自己的话。
  // 每条只给「本技艺的经验 + 一点贝」，量级对齐 canjian（8 + 0.6×lv）。
  {
    id: 'qiaoge', name: '樵歌相应', weight: 3,
    when(ctx){ return !!ctx && ctx.kind === 'gather' && ctx.skillId === 'qiaocai'; },
    run(){
      const lv = (typeof levelOf === 'function') ? levelOf('qiaocai') : 1;
      const xp = 9 + Math.round(lv * 0.55);
      if (typeof gainXp === 'function') gainXp('qiaocai', xp);
      return { log: `🪵 山深处有人应和，斧声与歌声相和（樵采 +${xp}）`,
               toast: `🪵 樵歌相应\n樵采 +${xp}` };
    },
  },
  {
    id: 'shiyu', name: '石中蕴玉', weight: 2,
    when(ctx){ return !!ctx && ctx.kind === 'gather' && ctx.skillId === 'caiyu'; },
    run(){
      const lv = (typeof levelOf === 'function') ? levelOf('caiyu') : 1;
      const xp = 9 + Math.round(lv * 0.55);
      const shells = 12 + lv * 2;
      if (typeof gainXp === 'function') gainXp('caiyu', xp);
      Game.shells = (Game.shells || 0) + shells;
      Game.stats.totalEarned = (Game.stats.totalEarned || 0) + shells;
      return { log: `💠 敲开顽石，内里一缕青气（采玉 +${xp} · 贝 +${shells}）`,
               toast: `💠 石中蕴玉\n采玉 +${xp} · 贝 +${shells}` };
    },
  },
  {
    id: 'yuyin', name: '网得旧贝', weight: 2,
    when(ctx){ return !!ctx && ctx.kind === 'gather' && ctx.skillId === 'yu'; },
    run(){
      const lv = (typeof levelOf === 'function') ? levelOf('yu') : 1;
      const xp = 9 + Math.round(lv * 0.55);
      const shells = 16 + lv * 3;
      if (typeof gainXp === 'function') gainXp('yu', xp);
      Game.shells = (Game.shells || 0) + shells;
      Game.stats.totalEarned = (Game.stats.totalEarned || 0) + shells;
      return { log: `🐟 收网时带起一串旧贝，纹已磨平（渔 +${xp} · 贝 +${shells}）`,
               toast: `🐟 网得旧贝\n渔 +${xp} · 贝 +${shells}` };
    },
  },
  {
    id: 'lianhuo', name: '火候正好', weight: 2,
    when(ctx){ return !!ctx && ctx.kind === 'craft'; },
    run(ctx){
      // 制作见闻的第二条：qiaoshou 给「多一件成品」，这条给「手上更稳」——
      // 同一场景两种奖励形态，比堆两条同质的「多一件」更有区分度。
      const type = (ctx && ctx.recipeType) || '';
      const sk = (typeof RECIPE_SKILL !== 'undefined' && RECIPE_SKILL[type]) ? RECIPE_SKILL[type] : 'fanliao';
      const lv = (typeof levelOf === 'function') ? levelOf(sk) : 1;
      const xp = 12 + Math.round(lv * 0.6);
      if (typeof gainXp === 'function') gainXp(sk, xp);
      const nm = (Skills && Skills[sk]) ? Skills[sk].name : '制作';
      return { log: `🔥 火候不差毫厘，一炉俱成（${nm} +${xp}）`,
               toast: `🔥 火候正好\n${nm} +${xp}` };
    },
  },
  {
    id: 'yese', name: '夜色如墨', weight: 2,
    // 只在夜间主题下出现：同一趟山，白天与夜里读到的句子不该一样。
    when(){ return (typeof sceneNight === 'function') && sceneNight(); },
    run(){
      const lv = (typeof levelOf === 'function') ? levelOf('guanxiang') : 1;
      const xp = 10 + Math.round(lv * 0.5);
      if (typeof gainXp === 'function') gainXp('guanxiang', xp);
      return { log: `🌙 夜色浓得化不开，仰头却见星次分明（观象 +${xp}）`,
               toast: `🌙 夜色如墨\n观象 +${xp}` };
    },
  },
  {
    id: 'gubei', name: '古碑可读', weight: 1, rare: true,
    // 珍稀：三条技艺一起给，量不大但「一份顶三份」，稀有度靠 weight=1 与文案体现。
    run(){
      const g = (id) => ((typeof levelOf === 'function') ? levelOf(id) : 1);
      const xpZ = 14 + Math.round(g('zhulu') * 0.7);
      const xpT = 12 + Math.round(g('taofa') * 0.6);
      const xpB = 12 + Math.round(g('bushi') * 0.6);
      if (typeof gainXp === 'function'){ gainXp('zhulu', xpZ); gainXp('taofa', xpT); gainXp('bushi', xpB); }
      return { log: `🗿 断碑半埋土中，拂去苔痕，其文尚可辨（著录 +${xpZ} · 讨伐 +${xpT} · 卜筮 +${xpB}）`,
               toast: `🗿 珍稀 · 古碑可读\n著录 +${xpZ} · 讨伐 +${xpT} · 卜筮 +${xpB}` };
    },
  },
  {
    id: 'guyu', name: '拾得古玉', weight: 1,
    run(){
      // 古玉：有「育沛」就给实物，没有就折贝（数据改动时不至于静默无奖励）
      const shells = 40 + ((typeof levelOf === 'function' ? levelOf('yudi') : 1) * 6);
      if (Items && Items.yupei && typeof giveItem === 'function'){
        giveItem('yupei', 1, false);
        return { log: '🪙 溪底露出一枚育沛，佩之无瘕疾', toast: '🪙 拾得育沛' };
      }
      Game.shells = (Game.shells || 0) + shells;
      Game.stats.totalEarned = (Game.stats.totalEarned || 0) + shells;
      return { log: `🪙 拾得旧贝一串（贝 +${shells}）`, toast: `🪙 贝 +${shells}` };
    },
  },
];

// 见闻的「可视化」：glyph 浮在现场画面上，wash 给现场罩一层短暂的气候/光线。
// 单列一张表而不是塞回每条事件里——这是纯表现，和「给什么奖励」正交，
// 改配色时不该碰奖励逻辑（反之亦然）。
// wash 只有三种：rain（雨）/ glow（光）/ star（星）。多了就不是「一层薄雾」，是换皮肤。
const EVENT_VIS = {
  canjian:  { glyph:'📜', wash:'glow' },
  yuhou:    { glyph:'🌧️', wash:'rain' },
  zongji:   { glyph:'🐾', wash:'' },
  laomu:    { glyph:'🌳', wash:'' },
  yunqi:    { glyph:'☁️', wash:'star' },
  cangyu:   { glyph:'🦴', wash:'' },
  qiaoshou: { glyph:'🪶', wash:'glow' },
  guyu:     { glyph:'🪙', wash:'glow' },
  qiaoge:   { glyph:'🪵', wash:'' },
  shiyu:    { glyph:'💠', wash:'glow' },
  yuyin:    { glyph:'🐟', wash:'' },
  lianhuo:  { glyph:'🔥', wash:'glow' },
  yese:     { glyph:'🌙', wash:'star' },
  gubei:    { glyph:'🗿', wash:'star' },
};
const EV_WASH_MS = 2600;   // 与 CSS 的动画时长对齐（见 style.css 的 .sc-ev-*）

// ── 离线见闻：你不在的时候，山里也发生了一点事 ──
// 与采集见闻分开一张表，理由有三：
//   1. 触发时机完全不同（离线归来 vs 一次采集完成），塞进同一张表就得靠 ctx 分流；
//   2. 奖励口径不同：离线见闻的量级要按「离山多久」缩放，且必须远小于离线本体的产出；
//   3. 见闻录要能分栏——「路上遇见的」与「不在时错过的」是两种心情。
// 但它们共用 Game.events.seen 计数：玩家看到的仍是「一共见过多少种」。
const AWAY_MIN_SEC = 300;     // 少于五分钟不编故事（太短，玩家会觉得是硬凑）
const AWAY_GAP = 1800;        // 两次离线见闻至少隔半小时（游戏秒）——挂机党别每次都撞上

const AWAY_EVENTS = [
  {
    id: 'away_laike', name: '山客来访', weight: 3,
    run(sec, sum){
      // 按离山时长缩放，但封顶：挂 12 小时不该比挂 1 小时多出十倍彩头
      const h = Math.min(3, sec / 3600);
      const shells = Math.round(60 * h) + 20;
      Game.shells = (Game.shells || 0) + shells;
      Game.stats.totalEarned = (Game.stats.totalEarned || 0) + shells;
      return { log: `🍵 离山时曾有客来访，留下一囊贝（贝 +${shells}）`,
               text: `有客来访，留贝 ${shells}`, shell: shells };
    },
  },
  {
    id: 'away_yexing', name: '夜有兽行', weight: 2,
    run(sec){
      const lv = (typeof levelOf === 'function') ? levelOf('taofa') : 1;
      const xp = Math.round((10 + lv * 0.6) * Math.min(3, sec / 3600) + 6);
      if (typeof gainXp === 'function') gainXp('taofa', xp);
      return { log: `🐾 夜里兽群自檐下过，晨起见蹄印（讨伐 +${xp}）`,
               text: `夜里兽群经过，讨伐 +${xp}`, xp };
    },
  },
  {
    id: 'away_lengyu', name: '冷雨敲窗', weight: 2,
    run(sec){
      const lv = (typeof levelOf === 'function') ? levelOf('caiyao') : 1;
      const xp = Math.round((9 + lv * 0.55) * Math.min(3, sec / 3600) + 5);
      if (typeof gainXp === 'function') gainXp('caiyao', xp);
      return { log: `🌧️ 夜来冷雨敲窗，晨起阶下菌生（采药 +${xp}）`,
               text: `一夜冷雨，采药 +${xp}`, xp };
    },
  },
  {
    id: 'away_mengzhao', name: '梦中有兆', weight: 1, rare: true,
    run(sec){
      // 珍稀：不直接给东西，给「看得懂」的两条技艺——与采集见闻的「古碑可读」同一路数
      const g = (id) => ((typeof levelOf === 'function') ? levelOf(id) : 1);
      const a = 12 + Math.round(g('guanxiang') * 0.7);
      const b = 12 + Math.round(g('bushi') * 0.7);
      if (typeof gainXp === 'function'){ gainXp('guanxiang', a); gainXp('bushi', b); }
      return { log: `🌌 夜里梦见星次移位，醒来仍记得方位（观象 +${a} · 卜筮 +${b}）`,
               text: `珍稀 · 梦中有兆，观象 +${a} · 卜筮 +${b}`, xp: a + b };
    },
  },
];

// 离线归来时调用。返回 { id, name, text } 或 null。
// ⚠️ 只读 summary 做点缀，不改 summary 里的既有数字——离线产出是另一套账，
//    见闻若去动它，两条结算链就纠缠在一起了。
function maybeAwayEvent(seconds, summary){
  if (typeof Game === 'undefined' || !Game) return null;
  if (typeof window !== 'undefined' && window.__eventsMuted) return null;
  const sec = Math.max(0, seconds || 0);
  if (sec < AWAY_MIN_SEC) return null;
  const st = eventsState();
  const now = (typeof gameTime === 'function') ? gameTime() : 0;
  const last = st.awayAt || 0;
  if (last && now - last < AWAY_GAP) return null;
  // 概率随时长涨，但一小时也就三成多：回来时「多半什么也没有」才让它像个消息
  const p = Math.min(0.55, (sec / 3600) * 0.35);
  if (typeof chance !== 'function' || !chance(p)) return null;

  const total = AWAY_EVENTS.reduce((a, e) => a + e.weight, 0);
  let r = Math.random() * total, pick = AWAY_EVENTS[AWAY_EVENTS.length - 1];
  for (const e of AWAY_EVENTS){ r -= e.weight; if (r <= 0){ pick = e; break; } }

  let out = {};
  try { out = pick.run(sec, summary || {}) || {}; }
  catch(e){ out = { text: '' }; }

  // now 可能是 0（新档的第一秒），而 0 在冷却判据里是「从未触发」的哨兵——
  // 与路上见闻的 at 是同一个坑。抬到 1，语义不变，哨兵不被占用。
  st.awayAt = now || 1;
  st.seen = (st.seen && typeof st.seen === 'object') ? st.seen : {};
  st.seen[pick.id] = (st.seen[pick.id] || 0) + 1;
  // 「最近一次」也认离线见闻：玩家回来看到的那一条，就是最近的一条
  st.lastId = pick.id;
  st.lastAt = now || 1;
  if (out.log && typeof log === 'function') log(out.log, 'gold', 'event');
  return { id: pick.id, name: pick.name, text: out.text || '', rare: !!pick.rare };
}

function eventsState(){
  if (!Game.events || typeof Game.events !== 'object') Game.events = { at: 0, count: 0, lastId: '', seen: {}, awayAt: 0, lastAt: 0 };
  return Game.events;
}

// 主入口：在「一次采集完成之后」调用。返回被触发的事件（没触发则为 null）。
// force = true 时跳过概率与冷却（数据模拟用）。
function maybeEvent(ctx, force){
  if (typeof Game === 'undefined' || !Game) return null;
  // 测试开关：断言精确数值的用例（经验递减、掉落表）不该被「随机插曲」搅乱。
  // 与 `?probe=1` 同类：一行开关，省掉给每条用例都摆阵的麻烦。
  if (typeof window !== 'undefined' && window.__eventsMuted) return null;
  const st = eventsState();
  const now = (typeof gameTime === 'function') ? gameTime() : 0;
  if (!force){
    // at === 0 表示「还没触发过」——不能拿它当时间戳用，否则开局前 90 秒永远没有见闻。
    const last = st.at || 0;
    if (last && now - last < EVENT_GAP) return null;
    if (typeof chance !== 'function' || !chance(EVENT_CHANCE)) return null;
  }
  const pool = TRAVEL_EVENTS.filter(e => !e.when || e.when(ctx || {}));
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + e.weight, 0);
  let r = Math.random() * total, pick = pool[pool.length - 1];
  for (const e of pool){ r -= e.weight; if (r <= 0){ pick = e; break; } }

  let out = {};
  try { out = pick.run(ctx || {}) || {}; }
  catch(e){ out = { log: '见闻记录失败：' + (e && e.message) }; }

  st.at = now;
  st.count = (st.count || 0) + 1;
  st.lastId = pick.id;
  st.lastAt = now;      // 与 at 同值，但语义是「最近一次的见闻时刻」（离线见闻也写这里）
  // 逐条计数：见闻录要能说「这一条见过几次」，只记总数不够
  st.seen = (st.seen && typeof st.seen === 'object') ? st.seen : {};
  st.seen[pick.id] = (st.seen[pick.id] || 0) + 1;
  Game.stats = Game.stats || {};
  Game.stats.seenEvents = (Game.stats.seenEvents || 0) + 1;

  // 分类单列 'event'：见闻原先记在 'sys' 里，和「技能升级」「已存档」混作一堆，
  // 想回看「这一夜遇见了什么」得在系统消息里翻。
  if (out.log && typeof log === 'function') log(out.log, 'gold', 'event');
  if (out.toast && typeof UI !== 'undefined' && UI && UI.toast) UI.toast(out.toast);
  flashEvent(pick.id);
  return { id: pick.id, ...out };
}

// 见闻的现场反馈：优先落在「现场画面」上（玩家正看的地方），
// 没有现场（关掉了 / 不在采集页）才退回屏幕中上方的一小簇粒子。
// 之前一律 `burst(innerWidth/2, innerHeight/3)`：不管在山里还是在市廛，
// 都从同一个位置炸同一簇 ✦，看了两次就变成噪声。
function flashEvent(id){
  const vis = EVENT_VIS[id] || {};
  const glyph = vis.glyph || '✦';
  // 减动效 / 关了特效：一点都不画。见闻本身仍会进日志与 toast，信息不丢。
  if (typeof sceneReduceMotion === 'function' && sceneReduceMotion()) return;
  if (typeof Prefs !== 'undefined' && Prefs && Prefs.fxLevel === 'off') return;
  const doc = (typeof document !== 'undefined') ? document : null;
  const wrap = (doc && doc.querySelector) ? doc.querySelector('.sc-wrap') : null;
  const live = wrap && wrap.classList && !wrap.classList.contains('hidden')
    && typeof wrap.getBoundingClientRect === 'function' && wrap.getBoundingClientRect().height > 0;

  if (live){
    if (typeof FX !== 'undefined' && FX){
      if (FX.floatAtEl) FX.floatAtEl(wrap, glyph, null, true);
      if (FX.burstAtEl) FX.burstAtEl(wrap, glyph, 5);
    }
    if (vis.wash){
      const cls = 'sc-ev-' + vis.wash;
      try {
        wrap.classList.add(cls);
        setTimeout(()=>{ try { wrap.classList.remove(cls); } catch(e){} }, EV_WASH_MS);
      } catch(e){}
    }
    return;
  }
  // 兜底：没有现场时保持克制，只给一小簇，别在整页中央炸开
  if (typeof FX !== 'undefined' && FX && FX.burst && typeof window !== 'undefined'){
    try { FX.burst(window.innerWidth / 2, window.innerHeight * 0.32, glyph, 4); } catch(e){}
  }
}

// 见闻累计（统计页/自检用）
function eventCount(){ return (eventsState().count || 0); }

// 见过几种 / 一共几种：成就「见闻初录」「山海谈丛」的判据。
// 两张表合起来算——玩家心里没有「路上」与「不在时」的分别，只有「还差几条」。
function eventKindsTotal(){
  return ((typeof TRAVEL_EVENTS !== 'undefined' ? TRAVEL_EVENTS.length : 0) +
          (typeof AWAY_EVENTS !== 'undefined' ? AWAY_EVENTS.length : 0));
}
function eventKindsSeen(){
  const seen = (Game && Game.events && Game.events.seen) || {};
  const all = (typeof TRAVEL_EVENTS !== 'undefined' ? TRAVEL_EVENTS : [])
    .concat(typeof AWAY_EVENTS !== 'undefined' ? AWAY_EVENTS : []);
  let n = 0;
  all.forEach(e => { if (seen[e.id]) n++; });
  return n;
}

if (typeof window !== 'undefined'){
  window.TRAVEL_EVENTS = TRAVEL_EVENTS;
  window.AWAY_EVENTS = AWAY_EVENTS;
  window.maybeAwayEvent = maybeAwayEvent;
  window.EVENT_VIS = EVENT_VIS;
  window.EV_WASH_MS = EV_WASH_MS;
  window.maybeEvent = maybeEvent;
  window.flashEvent = flashEvent;
  window.eventCount = eventCount;
  window.eventKindsSeen = eventKindsSeen;
  window.eventKindsTotal = eventKindsTotal;
  window.eventsState = eventsState;
}
