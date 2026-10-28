// ===== ui/tutorial.js — 新手指引与提示条标记 =====
// 从 core.js 搬出来的第二块（v1.31.85）。搬的原则同第一块：**逐字不动**。
// 验收方式：搬迁前后把教程六屏的 `#modalBox.innerHTML` 与 `hintMark()` 的输出
// 逐字符比对（不是看图）。
//
// 依赖：UI（core.js 定义）、modal/closeModal、TUT 相关只在本文件内。
// 因此必须排在 core.js 之后加载（顺序见 index.html）。

// ---------- 新手指引（首次进入自动播放，可从设置重看） ----------
const TUT_KEY = 'shj_tut_done_v1';
const TUT_STEPS = [
  { tab:'yudi',   icon:'🗺️', title:'受命著录',
    body:`你是一名<b>著录者</b>，奉命巡行山海，把山川万物逐条录于竹简。\n游戏进度，即一部正在写成的《山海经》。\n\n先从「舆地」开始——选择山系、点选某座山，再点其中任一动作（采集 / 观象 / 讨伐 / 祠礼），即动身前往此地。` },
  { tab:'skills', icon:'📜', title:'技艺修行',
    body:`采集、制作、讨伐、御使、修行……共 <b>27 门技艺</b>，行动即长经验（九阶八十一）。\n技能越高，产出越丰，亦能解锁更高「舆地」等级的山川。\n\n无事可干时角色会自行<b>打坐</b>吐纳——不产物资，只把时间凝成修为，是放置游戏无声的兜底修行，亦计入群英榜·修为。\n\n本页还挂着<b>三签</b>——三条短课，做完一条即补一条，赏贝币；做不了可以「换」。` },
  { tab:'taofa',  icon:'⚔️', title:'往讨异兽',
    body:`前往有异兽记载的山，点「往讨」。\n首次著录即触发<b>征兆</b>吉凶；著录至<b>得御</b>阶，便可在「御使」中使役该异兽，化作被动增益与自动作业。` },
  { tab:'pack',   icon:'🎒', title:'行装器物',
    body:`采集与讨伐所得皆入<b>行装</b>。\n装备兵器（五行相克：金克木、木克土……）、佩带饰物、服用丹药。\n点物品可查看它的原文句式——「食之X」「佩之X」「可以X」。` },
  { tab:'queue',  icon:'🧭', title:'巡历挂机',
    body:()=>`这是挂机核心。在「行动」编排<b>巡历队列</b>与<b>兜底任务</b>，离开页面也能自动推进。\n归来时按离线时长结算收益；离线上限随「观象」「营造」提升（现为 ${offlineCapHours()} 小时）。\n\n巡行时看画面顶上的那行状态条：芯片写着<b>「队列 2/5 · 约 19:42 完」</b>——\n第几项、几点跑完，不必来回切页。` },
  { icon:'📊', title:'祠祀与统计',
    body:`你还可祠祀山神（增益区域产出）、营造市廛、卜筮吉凶、观象提升离线上限。\n进度<b>自动存档于本机</b>；在「统计」页可导出 / 导入存档。\n\n技艺修至九九，可在技能页<b>再著一卷</b>（轮回）：等级归零，换一枚终身累积的轮回印，\n而著录、装备、贝币与修为俱在——那是很久以后的事了。\n\n祝著录顺利，山海自有回响。` },
];
// 教程步骤的标记：取该步对应页签的意象，避免各平台 emoji 差异
const TUT_MARKS = { yudi:'compass', skills:'lamp', taofa:'warn', pack:'scale', queue:'bolt' };
function tutMark(s){
  return TUT_MARKS[s && s.tab] || 'lamp';
}
let _tutIdx = 0;
function showTutorial(){
  _tutIdx = 0;
  renderTutStep();
}
function renderTutStep(){
  const s = TUT_STEPS[_tutIdx];
  // body 可以是函数：含「当前上限」这类随进度变化的数字，得在渲染时才算，
  // 数组字面量里求值会把开局的 12 小时永久钉死。
  const body = typeof s.body === 'function' ? s.body() : s.body;
  if (s.tab) UI.switchTab(s.tab);
  const first = _tutIdx === 0;
  const last = _tutIdx === TUT_STEPS.length - 1;
  const dots = TUT_STEPS.map((_,i)=>`<span class="tut-dot ${i===_tutIdx?'on':''} ${i<_tutIdx?'done':''}"></span>`).join('');
  UI.modal(`
    <div class="tut-card">
      <div class="tut-head"><span class="mi-ic">${typeof markIcon==='function'?markIcon(tutMark(s),17):(s.icon||'📜')}</span> <b>${s.title}</b></div>
      <div class="tut-body">${body.replace(/\n/g,'<br>')}</div>
      <div class="tut-dots">${dots}</div>
      <div class="modal-btns tut-btns">
        ${first?'':'<button class="btn" onclick="tutPrev()">上一步</button>'}
        ${last
          ? `<button class="btn on" onclick="tutFinish()">开始著录</button>`
          : `<button class="btn on" onclick="tutNext()">下一步</button>`}
        <button class="btn" onclick="tutSkip()">跳过</button>
      </div>
    </div>`);
}
function tutNext(){ if (_tutIdx < TUT_STEPS.length-1){ _tutIdx++; renderTutStep(); } }
function tutPrev(){ if (_tutIdx > 0){ _tutIdx--; renderTutStep(); } }
function tutSkip(){ tutFinish(); }
function tutFinish(){
  try { localStorage.setItem(TUT_KEY, '1'); } catch(e){}
  UI.closeModal();
  UI.toast('📜 著录之旅，启程！');
}
window.showTutorial = showTutorial; window.tutNext = tutNext; window.tutPrev = tutPrev;
window.tutSkip = tutSkip; window.tutFinish = tutFinish;
