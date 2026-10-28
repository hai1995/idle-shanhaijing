// ===== 《山海经·放置挂机》核心数据定义 =====
// 世界观：玩家为「著录者」，受命巡行南山，采集、制作、讨伐、御使、祭祀，
// 把山川万物逐一条录于竹简——游戏进度即一部正在写成的《山海经》。
// 内容边界：所有名称、形态、效果、祠礼均取自《山海经》原文（公有领域）；
// 等级、数值、倍率、机制均为本项目自研调参（见 TUNING），不沿用任何既有产品。
// 依赖：本文件在 nanshanData.js（window.NANSHAN）之后加载。

// ---------- 数值常量表（所有可调参数集中于此） ----------
const TUNING = {
  // 每技能 81 级，取「九九八十一」之数——这是**本卷（五臧山经）的上限**，不是全局硬顶。
  // 全书 447 山、315 异兽、68 件装备的等级都排在这 1–81 里，等级再往上就没有内容可接，
  // 所以「等级」不设成无限：那只会让数字涨而山不动，反而把「练满」这个终局目标抹掉。
  // 真正该无上限的是**修为**（Game.stats.totalXp，累计经验），它从第一分钟起就在涨，
  // 满级后继续累积，是将来排行榜的主数值。续卷二经时，把此值抬高、
  // 新山系的 unlockLevel 从 82 起排即可，其余逻辑不必改。
  MAX_LEVEL: 81,
  // 轮回（转生）：本卷修至九九，可「再著一卷」——技艺等级归 1，换一枚终身累积的「轮回印」。
  // 三者各管一层，互不覆盖：
  //   · 等级　　→ 本轮练到哪（解锁山/怪/配方），转生清零
  //   · 修为　　→ stats.totalXp，终身累计，**永不清零**，排行榜排这个
  //   · 轮回印　→ 转生次数换的永久乘区，**永不清零**，越转越快
  // ⚠️ 修为只能读 stats.totalXp，绝不能从 skills.xp 推导——转生一重置，那个数就归零了。
  REBIRTH: {
    MIN_LEVEL: 81,      // 任一技艺至九九方可轮回（相当于本卷通关的凭据）
    START_PER: 8,       // 第 N 转起手 N×8 级
    START_CAP: 56,      // 起手等级封顶 56（八成进度），其余照旧自己练
    // 这两个数直接决定「转生值不值」：经验曲线是 L^2.15，前期占比极小，
    // 起手等级只省 0.5% 的总需求，真正提速靠乘区。按 1→81 纯打怪 33.7 小时测：
    //   +8%  → 31.1 小时（只省 8%，转了跟没转一样）
    //   +30% → 25.6 小时（省 24%），配合起手 8 级约 26%
    // 每转 +30% 线性叠加，五转约 ×2.5，是「越转越快」的滚雪球，不是安慰奖。
    XP: 0.30,           // 每转：修为 +30%
    YIELD: 0.10,        // 每转：采获 +10%（折算产量约合 +5%）
  },
  // 季节（v1.31.129）：六小时一候，旱 / 雨轮转。原先三个消费点各写一遍 ±30%——
  // 顶栏 title、山志节点标签、采集结算，任何一处改数都会立刻分叉。
  // 收进 TUNING 之后只有这一个数，三处都读它。
  SEASON: {
    SEC: 6 * 3600,     // 一候六小时
    RIVER: 0.30,       // 教山「冬干而夏流」：雨季渔获 +30%、旱季 −30%
  },
  // 二周目难度带（卷二，v1.31.17）：玩家战力上限就在九九（81 级满装）——轮回印只加修为与采获，
  // 遗物只加防御气血，所以卷二**不能**按「再来 81 级」排（162 级的怪对满装玩家无解）。
  // 改为固定一条 82–90 的带：原 Lv1–9 → 82、Lv10–18 → 83 … Lv73–81 → 90，
  // 山的先后照旧，带内的差距由各兽自身倍率与五行拉开。
  CYCLE: {
    BASE: 82,         // 带底等级
    TIER: 9,          // 带内每 9 级原始等级升一格（与 TIER_SIZE 一致）
    XP: 1.8,          // 卷二经验倍率
    LOOT: 1.3,        // 卷二掉落权重倍率
    RAMP: 0.05,       // 带内坡：每升一格（9 级原始等级）再加 5% 三维，带底到带顶约 +40%
                      // 9 级带的等级本身只值 12% 气血，不加坡的话 305 只怪一样厚，走遍全书没差别
    SOFT: 0.08,       // 三周目起每轮三维与奖励再 +8%（软叠，五轮上下到顶）
    PILGRIM_XP: 1.10, // 旧地重游：已巡礼（诸山皆涉）的山系，卷二经验再 +10%
  },
  TIER_SIZE: 9,             // 每阶 9 级：一九…九九
  TIER_NAMES: ['一九','二九','三九','四九','五九','六九','七九','八九','九九'],
  // 经验曲线：XP(L→L+1) = round( A·L^B + C·R^L )，前段幂项主导、后段指数项主导
  XP: { A: 20, B: 2.15, C: 10, R: 1.048 },
  // 著录度：阈值次数 → 五阶；阶位产出加成
  MASTERY: {
    THRESHOLDS: [1, 10, 25, 50, 100],
    NAMES: ['初见','识名','明性','通形','得御'],
    BONUS: [0, 0.08, 0.18, 0.32, 0.50],
  },
  // 掉落权重：weight = base × (1 + LVL_COEF·(等级−需求)) × (1 + MAS_COEF·著录阶/4)
  DROP: { LVL_COEF: 0.02, MAS_COEF: 0.3, MIN: 0.1, MAX: 5 },
  // 离线结算：offlineGain = onlineRate × eff × min(时长, 上限)
  // 离线：2026-10-26 起基线 12h → 24h。挂机游戏的真实节奏是「上班一天回来」，
  // 12h 意味着上一天班只结算一半，这条上限此前一直是玩家最先撞到的墙。
  // 会员（MEMBER）在此之上叠加，见下一节。
  OFFLINE: { EFF_BASE: 0.55, EFF_PER: 0.05, EFF_MAX: 0.85, CAP_H: 24 },
  // 观象（v1.31.21）：24h 基线之后，观象不再是「延长离线」的刚需，
  // 于是给它第二个用处——看得越多，离线结算越实。阶梯取「最大的 n ≤ 已完成数」。
  OBSERVE: { EFF_STEPS: [{ n:6, v:0.02 }, { n:9, v:0.03 }, { n:11, v:0.05 }] },
  // 会员（预留，v1.31.19）：现在没有账号系统，这里只有一张「权益表」——
  // 登录后由账号层把 tier / 到期时刻写进存档的 member 字段，所有加成都走 memberBonus()。
  // ⚠️ 数值是**可调的建议值**，不是已定价的方案；加档位只改这张表，不动业务代码。
  // ⚠️ 会员只加「时长与产出」，不加战力——付费不该买到关卡的通过权。
  MEMBER: {
    DEFAULT: 'none',
    TIERS: {
      none: { name:'未开通', offlineH:0,  xp:0,    yield:0,    drop:0,    offlineEff:0 },
      lite: { name:'山客',   offlineH:12, xp:0.10, yield:0.10, drop:0.05, offlineEff:0.05 },
      zhu:  { name:'著录使', offlineH:24, xp:0.20, yield:0.20, drop:0.10, offlineEff:0.10 },
    },
  },
  // 五行：相克 ×1.35｜被克 ×0.75｜同属 ×1.00｜相生增益 ×1.15
  WUXING: { KE: 1.35, BEIKE: 0.75, TONG: 1.00, SHENG: 1.15 },
  ELEMENTS: ['金','木','水','火','土'],
  SHENG: { 金:'水', 水:'木', 木:'火', 火:'土', 土:'金' },  // 相生：金生水、水生木、木生火、火生土、土生金
  KE_MAP: { 金:'木', 木:'土', 土:'水', 水:'火', 火:'金' },  // 相克：金克木、木克土、土克水、水克火、火克金
  GATHER_DOUBLE: 0.25,     // 采集一次出 2 个的概率
  OBSERVE_SEC: 20,         // 观象/观瑞一次耗时（秒）
  FARM_PLOTS: 6,           // 初始田地数
  FARM_MAX: 9,             // 开垦上限
  FARM_PER: 12,            // 每 12 级圃艺开垦一块（12→7、24→8、36→9）
  // 同目标连续讨伐的经验递减：每连杀一次 -3%，下限 60%（换目标 / 败北即重置）
  MOB_DECAY: { STEP: 0.03, MIN: 0.6 },
  // 方国求购订单：常驻 3 单，30 分钟轮换一批；溢价 1.3~1.8 倍于基准价
  ORDERS: { COUNT: 3, REFRESH_SEC: 1800, PREMIUM_MIN: 1.3, PREMIUM_MAX: 1.8, XP: 12 },
  // 闲置兜底：无行动/战斗/队列持续这么久（秒）后自动执行默认行动，避免放置游戏「死档」
  IDLE_GRACE: 8,
  // 打坐（v1.31.168）：无活可干时的默认修行。每 MEDITATE_SEC 秒一息，凝 MEDITATE_XP 修为。
  // 倍率低于主动采集，但永不停歇——放置游戏「人不在跟前也在涨」的兜底收益。
  MEDITATE_SEC: 5, MEDITATE_XP: 5,
};

// ---------- 稀有度（自研命名，由回收价推导） ----------
const RARITY = {
  COMMON:    { name: '凡品', color: '#8a8577' },
  UNCOMMON:  { name: '良品', color: '#4A7C59' },   // 石绿
  RARE:      { name: '珍品', color: '#2E5C8A' },   // 石青
  LEGENDARY: { name: '瑰宝', color: '#D9A521' },   // 藤黄
  MYTHIC:    { name: '神品', color: '#C3272B' },   // 朱砂
};
const RARITY_TIERS = [ [1000,'MYTHIC'], [300,'LEGENDARY'], [100,'RARE'], [30,'UNCOMMON'], [0,'COMMON'] ];

// ---------- 装备等阶 ----------
// 品阶不是「稀有感」，而是「你从哪儿得来的」——凡品随手可得，良品常造，
// 精品要殊材，珍品多出自凶兽之身，神品唯 BOSS 所遗。
// 每档给出三件事：数值系数、强化上限、以及一句能读懂的话。
// 强化上限分档是这一版的重点：普通装强不满 30，神兵天生天花板更高。
const GEAR_GRADE = {
  common:   { id:'common',   name:'凡', order:0, mult:0.86, tol:0.16, cap:12, color:'#8a8577', desc:'石木之器，聊胜于无' },
  fine:     { id:'fine',     name:'良', order:1, mult:1.00, tol:0.15, cap:18, color:'#4A7C59', desc:'常造之器，堪用' },
  rare:     { id:'rare',     name:'精', order:2, mult:1.16, tol:0.15, cap:22, color:'#2E5C8A', desc:'良工所制，须殊材' },
  precious: { id:'precious', name:'珍', order:3, mult:1.30, tol:0.15, cap:26, color:'#B06A1E', desc:'罕有之器，多出凶兽之身' },
  divine:   { id:'divine',   name:'神', order:4, mult:1.55, tol:0.26, cap:30, color:'#C3272B', desc:'神兵，唯 BOSS 所遗' },
};
// 基准曲线：按「部位 × 等级」给出该等级良品应有多少。
// 系数是拿现有四十件装备反拟合出来的（良品实测落在 0.95–1.10），
// 所以它是**校验基准**而非硬算公式——数值仍可手调，但必须落在所属
// 品阶的容差带内，否则测试报错。这样「合理的数值」才有可验证的定义。
const GEAR_BASE = {
  melee:  lvl => 0.78 * lvl + 6,      // 近战主武器
  bow:    lvl => 0.62 * lvl + 6,      // 弓（另有箭矢补足）
  armor:  lvl => 0.35 * lvl - 1,      // 甲胄
  tool:   lvl => 0.48 * lvl + 3.5,    // 斧 / 镐 / 网
  quiver: lvl => 0.20 * lvl + 2,      // 箭
};
function gearKindOf(it){
  if (!it || !it.equip) return null;
  if (it.slot === 'charm') return null;      // 护符按效果分强弱，不比数值
  if (it.slot === 'armor') return 'armor';
  if (it.axePower || it.pickPower || it.netPower) return 'tool';
  if (it.slot === 'quiver') return 'quiver';
  if (it.ranged) return 'bow';
  return 'melee';
}
function gearNum(it){
  if (!it) return 0;
  return it.dmg || it.def || it.axePower || it.pickPower || it.netPower || 0;
}
function gearBaseValue(it){
  const k = gearKindOf(it);
  if (!k) return 0;
  return GEAR_BASE[k](it.lvl || 1);
}
function gearGrade(it){
  const key = (it && it.grade) || 'fine';
  return GEAR_GRADE[key] || GEAR_GRADE.fine;
}
// 实测比值：这件比同级良品强多少。用于校验，也用于详情里的「超出同级 xx%」。
function gearRatio(it){
  const b = gearBaseValue(it);
  return b > 0 ? gearNum(it) / b : 0;
}

// ---------- 世界（南山经 + 西山经 + 北山经 + 东山经 + 中山经，五章同构接入） ----------
const NANSHAN = (typeof window !== 'undefined' && window.NANSHAN) ? window.NANSHAN : { regions: [] };
const XISHAN  = (typeof window !== 'undefined' && window.XISHAN)  ? window.XISHAN  : { regions: [] };
const BEISHAN = (typeof window !== 'undefined' && window.BEISHAN) ? window.BEISHAN : { regions: [] };
const DONGSHAN = (typeof window !== 'undefined' && window.DONGSHAN) ? window.DONGSHAN : { regions: [] };
const ZHONGSHAN = (typeof window !== 'undefined' && window.ZHONGSHAN) ? window.ZHONGSHAN : { regions: [] };
const WORLD = { regions: [].concat(NANSHAN.regions||[], XISHAN.regions||[], BEISHAN.regions||[], DONGSHAN.regions||[], ZHONGSHAN.regions||[]) };
// 章节（叙事层）：南山经=巡行记录，西山经=神话舞台（神祇密度支撑主线章节），北山经=长篇养成（精卫填海），
// 东山经=荒经水路（水泽大荒），中山经=帝之密都（全书收卷：神祇与氏族记载最密的一部，十二系各有祠礼）
const CHAPTERS = [
  { id:'nanshan', name:'第一章 · 南山经', sub:'巡行记录', regionIds:['nanshan-1','nanshan-2','nanshan-3'] },
  { id:'xishan',  name:'第二章 · 西山经', sub:'神话舞台', regionIds:['xishan-1','xishan-2','xishan-3','xishan-4'] },
  { id:'beishan', name:'第三章 · 北山经', sub:'长篇养成', regionIds:['beishan-1','beishan-2','beishan-3'] },
  { id:'dongshan',name:'第四章 · 东山经', sub:'荒经水路', regionIds:['dongshan-1','dongshan-2','dongshan-3','dongshan-4'] },
  // 第五章全挂十二系——五臧山经 197 山至此全录
  { id:'zhongshan',name:'第五章 · 中山经', sub:'帝之密都', regionIds:['zhongshan-1','zhongshan-2','zhongshan-3','zhongshan-4','zhongshan-5','zhongshan-6','zhongshan-7','zhongshan-8','zhongshan-9','zhongshan-10','zhongshan-11','zhongshan-12'] },
];
function chapterOf(regionId){ return CHAPTERS.find(c=>c.regionIds.includes(regionId)) || null; }

// ---------- 技能（27 技：26 艺 + 修行·打坐，与山海经「无事则修」之意相合） ----------
const Skills = {
  // 采集类
  qiaocai: { id:'qiaocai', name:'樵采', domain:'gathering',  icon:'🪓', desc:'伐取灵木（桂、梓、枏……）' },
  caiyu:   { id:'caiyu',   name:'采玉', domain:'gathering',  icon:'⛏️', desc:'采玉与五金（其阳多玉，其阴多金）' },
  yu:      { id:'yu',      name:'渔',   domain:'gathering',  icon:'🎣', desc:'捕鱼于大泽（鮆鱼、芘蠃、育沛）' },
  caiyao:  { id:'caiyao',  name:'采药', domain:'gathering',  icon:'🌿', desc:'采集灵草（祝余、白䓘）' },
  puyi:    { id:'puyi',    name:'圃艺', domain:'gathering',  icon:'🌾', desc:'种植嘉谷（稌、稻、白菅）' },
  // 制作类
  fanliao: { id:'fanliao', name:'燔燎', domain:'processing', icon:'🔥', desc:'燃薪取火，铸炭以备冶铸' },
  diaoding:{ id:'diaoding',name:'调鼎', domain:'processing', icon:'🍳', desc:'烹饪。「食之X」句式消耗品' },
  yezhu:   { id:'yezhu',   name:'冶铸', domain:'processing', icon:'⚒️', desc:'铸兵、铸器（戈、矛、钺、戚）' },
  xiaoyu:  { id:'xiaoyu',  name:'削羽', domain:'processing', icon:'🏹', desc:'制弓矢' },
  zhiqi:   { id:'zhiqi',   name:'制器', domain:'processing', icon:'🧵', desc:'皮革、编织、白菅为席' },
  zhuoyu:  { id:'zhuoyu',  name:'琢玉', domain:'processing', icon:'💠', desc:'琢玉成符，供祭祀佩戴之用' },
  lianyao: { id:'lianyao', name:'炼药', domain:'processing', icon:'🧪', desc:'捣药合药，「佩之X」之剂' },
  // 武备类
  bing:    { id:'bing',    name:'兵',   domain:'combat',     icon:'⚔️', desc:'近战（戈、矛、钺、戚）' },
  she:     { id:'she',     name:'射',   domain:'combat',     icon:'🏹', desc:'远程（弓矢）' },
  zhu:     { id:'zhu',     name:'祝',   domain:'combat',     icon:'📿', desc:'法术。取「灵山十巫」之祝' },
  ming:    { id:'ming',    name:'命',   domain:'combat',     icon:'❤️', desc:'气血上限' },
  // 征伐类
  taofa:   { id:'taofa',   name:'讨伐', domain:'taofa',      icon:'🗡️', desc:'受命讨伐凶兽（含后羿所诛六凶）' },
  // 方国类
  lvxian:  { id:'lvxian',  name:'履险', domain:'fangguo',   icon:'🧭', desc:'逾山涉水，解锁高危节点' },
  shanglv: { id:'shanglv', name:'商旅', domain:'fangguo',   icon:'⚖️', desc:'与方国贸易，正当朝贡买卖' },
  guanxiang:{ id:'guanxiang',name:'观象',domain:'fangguo',  icon:'🌅', desc:'观日月出入、定方位' },
  yingyi:  { id:'yingyi',  name:'营邑', domain:'fangguo',   icon:'🏘️', desc:'经营聚落，营造土木' },
  bushi:   { id:'bushi',   name:'卜筮', domain:'fangguo',   icon:'🎋', desc:'占卜，预告征兆与凶吉' },
  // 驭使类
  yushi:   { id:'yushi',   name:'御使', domain:'yushi',      icon:'🐾', desc:'使役已著录之异兽，被动增益' },
  jisi:    { id:'jisi',    name:'祭祀', domain:'yushi',      icon:'🕯️', desc:'祠山川之神（毛用、糈用配方）' },
  zhulu:   { id:'zhulu',   name:'著录', domain:'yushi',      icon:'📜', desc:'记录万物于图鉴，累积著录度' },
  // 修行：无活可干时的默认行动——静坐吐纳、凝练修为（v1.31.168）。
  // 不参与任何产地 / 配方 / 战斗，纯粹把时间换成修为，是放置游戏的「兜底修行」。
  dazuo:   { id:'dazuo',  name:'打坐', domain:'xiu',       icon:'🧘', desc:'静坐吐纳，凝练修为（无活可干时的默认修行）' },
  yudi:    { id:'yudi',    name:'舆地', domain:'yushi',      icon:'🗺️', desc:'制图与探索，驱动区域解锁' },
};
const SKILL_GROUPS = {
  gathering:  { label:'采集', ids:['qiaocai','caiyu','yu','caiyao','puyi'] },
  processing: { label:'制作', ids:['fanliao','diaoding','yezhu','xiaoyu','zhiqi','zhuoyu','lianyao'] },
  combat:     { label:'武备', ids:['bing','she','zhu','ming'] },
  taofa:      { label:'征伐', ids:['taofa'] },
  fangguo:    { label:'方国', ids:['lvxian','shanglv','guanxiang','yingyi','bushi'] },
  yushi:      { label:'驭使', ids:['yushi','jisi','zhulu','yudi'] },
  xiu:        { label:'修行', ids:['dazuo'] },
};
const ALL_SKILL_IDS = Object.keys(Skills);

// ---------- 境界（里程碑式，v1.31.169） ----------
// 经典修仙境阶：攒够累计修为（totalXp）后于打坐中突破，获全局修炼效率永久加成。
// need = 进入该阶所需累计修为；bonus = 驻此阶时叠加的全局经验倍率增量（不碰技能上限）。
const REALMS = [
  { id:'lianqi',   name:'炼气', need:0,      bonus:0.00 },
  { id:'zhuji',    name:'筑基', need:6000,   bonus:0.06 },
  { id:'jindan',   name:'金丹', need:30000,  bonus:0.14 },
  { id:'yuanying', name:'元婴', need:100000, bonus:0.24 },
  { id:'huashen',  name:'化神', need:300000, bonus:0.36 },
  { id:'lianxu',   name:'炼虚', need:800000, bonus:0.50 },
  { id:'hedao',    name:'合体', need:2000000, bonus:0.66 },
  { id:'datong',   name:'大乘', need:5000000, bonus:0.85 },
];

// ---------- 物品 ----------
function I(id, name, type, extra) { return Object.assign({ id, name, type, icon:'⬜' }, extra||{}); }
const Items = {};
function addItem(...defs){ defs.forEach(d => Items[d.id] = d); }

// ---- 樵采 · 灵木 ----
addItem(
  I('gui','桂','wood',    { value:2,  xp:10, lvl:1,  icon:'🌿', skill:'qiaocai', node:'nanshan-1-01', note:'多桂' }),
  I('yan','棪木','wood',  { value:4,  xp:14, lvl:2,  icon:'🪵', skill:'qiaocai', node:'nanshan-1-02', note:'多棪木' }),
  I('guaimu','怪木','wood',{ value:8,  xp:20, lvl:4,  icon:'🪹', skill:'qiaocai', node:'nanshan-1-03', note:'多怪木，不可以上' }),
  I('zi','梓','wood',     { value:30, xp:32, lvl:13, icon:'🪵', skill:'qiaocai', node:'nanshan-2-14', note:'其上多梓枏' }),
  I('nan','枏','wood',    { value:30, xp:32, lvl:13, icon:'🪵', skill:'qiaocai', node:'nanshan-2-14', note:'其上多梓枏（楠）' }),
  I('jing','荆','wood',   { value:30, xp:32, lvl:13, icon:'🌿', skill:'qiaocai', node:'nanshan-2-14', note:'其下多荆杞' }),
  I('qi','杞','wood',     { value:30, xp:32, lvl:13, icon:'🌿', skill:'qiaocai', node:'nanshan-2-14', note:'其下多荆杞' }),
  I('mu','木','wood',     { value:42, xp:65, lvl:18, icon:'🌳', skill:'qiaocai', node:'nanshan-3-08', note:'上多木，无草' }),
);

// ---- 采玉 · 金玉五金 ----
addItem(
  I('jin','金','mineral',   { value:6,  xp:12, lvl:1,  icon:'🪙', skill:'caiyu', node:'nanshan-1-01', note:'多金玉' }),
  I('yu','玉','mineral',    { value:8,  xp:14, lvl:1,  icon:'💠', skill:'caiyu', node:'nanshan-1-07', note:'其阳多玉' }),
  I('shuiyu','水玉','mineral',{ value:8, xp:14, lvl:2,  icon:'💧', skill:'caiyu', node:'nanshan-1-02', note:'多水玉' }),
  I('baiyu','白玉','mineral',{ value:10, xp:18, lvl:4,  icon:'⚪', skill:'caiyu', node:'nanshan-1-03', note:'多白玉' }),
  I('huangjin','黄金','mineral',{ value:8,xp:12,lvl:2,  icon:'🟡', skill:'caiyu', node:'nanshan-1-02', note:'多黄金' }),
  I('chijin','赤金','mineral',{ value:16, xp:20, lvl:3,  icon:'🔶', skill:'caiyu', node:'nanshan-1-04', note:'其阳多赤金' }),
  I('baijin','白金','mineral',{ value:18, xp:22, lvl:3,  icon:'⚗️', skill:'caiyu', node:'nanshan-1-04', note:'其阴多白金' }),
  I('qinghuo','青雘','mineral',{ value:11,xp:8, lvl:5, icon:'🟢', skill:'caiyu', node:'nanshan-1-08', note:'其阴多青雘', py:'huò' }),
  I('shashi','沙石','mineral',{ value:13, xp:8, lvl:6, icon:'🪨', skill:'caiyu', node:'nanshan-1-09', note:'多沙石' }),
  I('dansu','丹粟','mineral',{ value:13, xp:8, lvl:6, icon:'🔴', skill:'caiyu', node:'nanshan-2-01', note:'多丹粟', py:'sù' }),
  I('fushi','砆石','mineral',{ value:22, xp:18, lvl:10, icon:'🪨', skill:'caiyu', node:'nanshan-2-09', note:'其下多砆石', py:'fū' }),
  I('jinshi','金石','mineral',{ value:32, xp:38,lvl:14, icon:'🪙', skill:'caiyu', node:'nanshan-2-16', note:'多金石' }),
  I('boshi','博石','mineral',{ value:32, xp:38,lvl:14, icon:'💎', skill:'caiyu', node:'nanshan-2-17', note:'多博石' }),
);

// ---- 渔 · 水族 ----
addItem(
  I('yupei','育沛','fish',  { value:15, xp:16, lvl:1,  icon:'🐚', skill:'yu', node:'nanshan-1-01', water:'丽麂之水', effect:'佩之无瘕疾', py:'pèi', note:'丽麂之水多育沛' }),
  I('jiyu','鮆鱼','fish',   { value:30, xp:70, lvl:8,  icon:'🐟', skill:'yu', node:'nanshan-2-07', water:'苕水', effect:'可食', py:'jì', note:'苕水多鮆鱼' }),
  I('piluo','芘蠃','fish',  { value:32, xp:28, lvl:12, icon:'🐌', skill:'yu', node:'nanshan-2-13', water:'洵水', effect:'可食', py:'pí luǒ', note:'洵水多芘蠃' }),
);

// ---- 采药 · 灵草 ----
addItem(
  I('zhuyu','祝余','herb',  { value:10, xp:12, lvl:1,  icon:'🌱', skill:'caiyao', node:'nanshan-1-01', form:'其状如韭而青华', effect:'食之不饥' }),
  I('baijiu','白䓘','herb', { value:90,xp:90,lvl:21, icon:'🌳', skill:'caiyao', node:'nanshan-3-11', form:'其状如榖而赤理，其汗如漆，其味如饴', effect:'食者不饥，可以释劳；可以血玉', py:'jiāo' }),
);

// ---- 圃艺 · 嘉谷 ----
addItem(
  I('seed_tu','稌籽','seed',  { value:3,  lvl:1, icon:'🌾', grow:10, crop:'tu',  skill:'puyi', py:'tú' }),
  I('seed_dao','稻秧','seed', { value:6,  lvl:3, icon:'🌾', grow:14, crop:'dao', skill:'puyi' }),
  I('seed_jian','菅苗','seed',{ value:10, lvl:5, icon:'🌿', grow:18, crop:'jian',skill:'puyi', py:'jiān' }),
  // 黍：原文仅东次三经祠礼「用一牡羊，米用黍」用到，故种子上架等级压在 70——
  // 此前只有黍米、没有黍籽，也没有任何其它来源，导致该祠礼永远做不出（断链）。
  I('seed_shu','黍籽','seed',{ value:8,  lvl:34, icon:'🌾', grow:16, crop:'shu', skill:'puyi', py:'shǔ' }),
  I('tu','稌米','crop',   { value:4,  xp:14, lvl:1, icon:'🍚', note:'糈用稌米', py:'tú' }),
  I('shu','黍米','crop',  { value:6,  xp:16, lvl:71, icon:'🌾', note:'米用黍——东次三经祠礼糈', py:'shǔ' }),
  I('dao','稻米','crop',  { value:7,  xp:22, lvl:3, icon:'🍚' }),
  I('jian','白菅','crop', { value:12, xp:30, lvl:5, icon:'🌿', note:'白菅为席', py:'jiān' }),
);

// ---- 讨伐 · 异兽素材（形态/效果见异兽数据） ----
addItem(
  I('shougu','兽骨','beast', { value:3, icon:'🦴' }),
  I('shengshengrou','狌狌肉','beast',{ value:14, heal:40, icon:'🥩', effect:'食之善走', food:true, py:'shēng' }),
  I('baiyuanpi','白猿皮','beast',{ value:15, icon:'🐒' }),
  I('lushupi','鹿蜀皮','beast',{ value:25, icon:'🐴', effect:'佩之宜子孙', py:'shǔ' }),
  I('xuanguijia','旋龟甲','beast',{ value:30, icon:'🐢', effect:'佩之不聋，可以为底' }),
  I('lurou','鯥肉','beast',{ value:18, heal:60, icon:'🐟', effect:'食之无肿疾', food:true, py:'lù' }),
  I('leipi','类皮','beast',{ value:20, icon:'🐈', effect:'食者不妒' }),
  I('boyipi','猼訑皮','beast',{ value:28, icon:'🐑', effect:'佩之不畏', py:'bó yí' }),
  I('yuyu','𪁺𪁸羽','beast',{ value:25, icon:'🪶', effect:'食之无卧', rareChar:true, py:'yǔ yǔ' }),
  I('jiuweihuwei','九尾狐尾','beast',{ value:150, icon:'🦊', rarity:'LEGENDARY', effect:'食者不蛊' }),
  I('guanguanyu','灌灌羽','beast',{ value:30, icon:'🕊️', effect:'佩之不惑', py:'guàn' }),
  I('chirurou','赤鱬肉','beast',{ value:22, heal:50, icon:'🐠', effect:'食之不疥', food:true, py:'rú' }),
  I('liliti','狸力蹄','beast',{ value:22, icon:'🐖', effect:'见则其县多土功', py:'lí' }),
  I('zhuyu3','鴸羽','beast',{ value:24, icon:'🦉', effect:'见则其县多放士', py:'zhū' }),
  I('changyoubi','长右臂','beast',{ value:26, icon:'🐒', effect:'见则郡县大水', py:'yòu' }),
  I('huahuaiipi','猾褢皮','beast',{ value:28, icon:'🦝', effect:'见则县有大繇', py:'huái' }),
  I('zhipi','彘皮','beast',{ value:35, icon:'🐯', effect:'是食人', py:'zhì' }),
  I('huanpi','䍺皮','beast',{ value:30, icon:'🐑', effect:'不可杀也', py:'huàn' }),
  I('gudiaoyu','蛊雕羽','beast',{ value:40, icon:'🦅', effect:'是食人', py:'gǔ diāo' }),
  I('quruyu','瞿如羽','beast',{ value:32, icon:'🦩', effect:'其鸣自号也', py:'qú rú' }),
  I('hujiaorou','虎蛟肉','beast',{ value:40, heal:80, icon:'🐉', effect:'食者不肿，可以已痔', food:true, py:'jiāo' }),
  I('fenghuangyu','凤皇羽','beast',{ value:300, icon:'🪽', rarity:'LEGENDARY', effect:'见则天下安宁' }),
  I('tuanyulin','鱄鱼鳞','beast',{ value:36, icon:'🐡', effect:'见则天下大旱', py:'tuán' }),
  I('yongyu','颙羽','beast',{ value:38, icon:'🦉', effect:'见则天下大旱', py:'yóng' }),
  I('yuanchuyu','鹓雏羽','beast',{ value:260, icon:'🪽', rarity:'LEGENDARY', py:'yuān chú' }),
  // 祷过之山 · 可猎之兽
  I('xipi','犀皮','beast',{ value:30, icon:'🐂' }),
  I('xirou','犀肉','beast',{ value:20, heal:120, icon:'🥩', food:true }),
  I('sipi','兕皮','beast',{ value:45, icon:'🐃', py:'sì' }),
  I('sirou','兕肉','beast',{ value:30, heal:160, icon:'🥩', food:true, py:'sì' }),
  I('xiangya','象牙','beast',{ value:60, icon:'🦷' }),
  // 六凶素材（BOSS 序列）
  I('zaochiya','凿齿之牙','beast',{ value:200, icon:'🦷', rarity:'RARE' }),
  I('jiuyingfa','九婴之发','beast',{ value:200, icon:'🧶', rarity:'RARE' }),
  I('dafengyu','大风之羽','beast',{ value:220, icon:'🪶', rarity:'RARE' }),
  I('yayupi','猰貐之皮','beast',{ value:240, icon:'🐕', rarity:'RARE', py:'yà yǔ' }),
  I('xiushedan','修蛇之胆','beast',{ value:240, icon:'🫀', rarity:'RARE' }),
  I('fenghuiya','封豨之牙','beast',{ value:200, icon:'🦷', rarity:'RARE', py:'fēng xī' }),
);

// ---- 原料 ----
addItem(
  I('tan','炭','material',   { value:4,  icon:'⚫' }),
  // 镇物：淬炼的保险。十级往上失败会掉阶，投一枚镇物可护住原阶。
  I('zhenwu','镇物','material',{ value:120, lvl:20, icon:'🪬', note:'淬炼时投入，败亦护住原阶', py:'zhèn' }),
  I('huozhong','火种','material',{ value:6, icon:'✨' }),
  I('shuiping','清水瓶','material',{ value:3, icon:'🧴' }),
  I('sheng','绳','material', { value:5,  icon:'🧵' }),
  I('baijianxi','白菅席','material',{ value:20, icon:'🟩', note:'白菅为席' }),
);

// ---- 祠器与瑞畜 ----
addItem(
  I('zhang','玉璋','rite', { value:60, icon:'📗', note:'毛用一璋玉瘗' }),
  I('bi','玉璧','rite',    { value:90, icon:'📘', note:'毛用一璧瘗' }),
  I('baiquan','白犬','rite',{ value:400, icon:'🐕', note:'用一白狗祈' }),
);

// ---- 玉符（琢玉 · 佩戴类） ----
addItem(
  I('migufu','迷榖符','charm',{ value:50, lvl:5,  icon:'🪸', equip:true, grade:'fine', slot:'charm', effect:'佩之不迷', gatherBonus:0.10, reqRecord:{ id:'migu', tier:3 }, note:'其状如榖而黑理，其华四照' }),
  I('lushufu','鹿蜀符','charm',{ value:70, lvl:10, icon:'🪸', equip:true, grade:'fine', slot:'charm', effect:'佩之宜子孙', farmBonus:0.25, reqRecord:{ id:'lushu', tier:3 } }),
  I('xuanguifu','旋龟符','charm',{ value:75, lvl:10, icon:'🪸', equip:true, grade:'fine', slot:'charm', effect:'佩之不聋，可以为底', divBonus:0.30, reqRecord:{ id:'xuangui', tier:3 } }),
  I('boyifu','猼訑符','charm',{ value:80, lvl:15, icon:'🪸', equip:true, grade:'rare', slot:'charm', effect:'佩之不畏', defBonus:8, reqRecord:{ id:'boyi', tier:3 } }),
  I('guanfu','灌灌符','charm',{ value:90, lvl:15, icon:'🪸', equip:true, grade:'rare', slot:'charm', effect:'佩之不惑', wise:true, reqRecord:{ id:'guanguan', tier:3 } }),
);
addItem( I('migu','迷榖','wood', { value:40, xp:30, lvl:1, icon:'🪸', skill:'qiaocai', node:'nanshan-1-01', form:'其状如榖而黑理，其华四照', effect:'佩之不迷' }) );

// ================= 西山经产出物 =================
// 数值公式（自研调参）：经验 ≈ 0.13·等次^2.15（与 81 级曲线的时间手感对齐），价值 ≈ 2·等次^1.05
function _nodeById(id){
  for (const r of WORLD.regions) for (const n of r.nodes) if (n.id === id) return n;
  return null;
}
function autoLvl(nodeId){
  const n = _nodeById(nodeId);
  return n ? Math.max(1, Math.min(79, Math.round(n.unlockLevel * 0.86))) : 1;
}
function autoXp(lvl){ return Math.max(8, Math.round(0.13 * Math.pow(lvl, 2.15))); }
function autoVal(lvl){ return Math.round(2 * Math.pow(lvl, 1.05)); }
// 西山物品构造器：nodeIds 可为数组（同名产物分布多山）
function XW(id, name, type, nodeIds, extra){
  const nodes = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
  const lvl = autoLvl(nodes[0]);
  return Object.assign({ id, name, type, icon:'⬜', skill:null, node:nodes[0], nodes,
    lvl, value:autoVal(lvl), xp:autoXp(lvl) }, extra||{});
}

// ---- 西山灵木（樵采）----
addItem(
  XW('song','松','wood',['xishan-1-04','xishan-1-16'],{ icon:'🌲', skill:'qiaocai' }),
  XW('bai','柏','wood',['xishan-1-16'],{ icon:'🌲', skill:'qiaocai' }),
  XW('tanmu','檀','wood',['xishan-1-11','xishan-2-01'],{ icon:'🪵', skill:'qiaocai' }),
  XW('zuo','柞','wood',['xishan-1-11'],{ icon:'🪵', skill:'qiaocai', py:'zuò' }),
  XW('li','栎','wood',['xishan-1-11','xishan-1-16'],{ icon:'🪵', skill:'qiaocai', py:'lì' }),
  XW('gu','榖','wood',['xishan-1-11'],{ icon:'🌳', skill:'qiaocai', py:'gǔ' }),
  XW('sang','桑','wood',['xishan-1-11'],{ icon:'🌳', skill:'qiaocai' }),
  XW('guimu','桂木','wood',['xishan-2-02'],{ icon:'🌿', skill:'qiaocai' }),
  XW('yuzhang','豫章','wood',['xishan-2-01'],{ icon:'🪵', skill:'qiaocai' }),
  XW('taozhi','桃枝','wood',['xishan-2-01'],{ icon:'🌿', skill:'qiaocai' }),
  XW('gouduan','钩端','wood',['xishan-2-01'],{ icon:'🪵', skill:'qiaocai' }),
  XW('qishu','漆','wood',['xishan-2-13'],{ icon:'🪤', skill:'qiaocai', note:'多漆——其汁可漆物' }),
  XW('niumu','杻','wood',['xishan-1-04'],{ icon:'🪵', skill:'qiaocai', py:'niǔ' }),
  XW('jiang','橿','wood',['xishan-1-04'],{ icon:'🪵', skill:'qiaocai', py:'jiāng' }),
  XW('zhu','竹','wood',['xishan-2-04'],{ icon:'🎍', skill:'qiaocai' }),
  XW('zong','棕','wood',['xishan-1-04','xishan-2-15'],{ icon:'🌴', skill:'qiaocai', py:'zōng' }),
  XW('zhen','榛','wood',['xishan-4-06'],{ icon:'🌰', skill:'qiaocai', py:'zhēn' }),
  XW('ku','楛','wood',['xishan-4-06'],{ icon:'🪵', skill:'qiaocai', py:'kǔ' }),
  XW('panmu','盼木','wood',['xishan-2-05'],{ icon:'🪵', skill:'qiaocai', note:'其状如荆而白华' }),
  XW('qimu','柒木','wood',['xishan-2-13'],{ icon:'🪵', skill:'qiaocai', py:'qī' }),
  XW('qishumu','漆木','wood',['xishan-2-16'],{ icon:'🪵', skill:'qiaocai' }),
  XW('qiaomu','乔木','wood',['xishan-2-04'],{ icon:'🌳', skill:'qiaocai' }),
  XW('yu4','棫','wood',['xishan-2-04'],{ icon:'🪵', skill:'qiaocai', py:'yù' }),
  // 木实（woodSpecial）——樵采高阶目标
  XW('wenjing','文茎','wood',['xishan-2-06'],{ icon:'🪸', skill:'qiaocai', note:'文茎之实如枣——服之不忘' }),
  XW('shatang','沙棠','wood',['xishan-3-08'],{ icon:'🍑', skill:'qiaocai', form:'其状如棠，黄华赤实，其味如李而无核', effect:'可以御水，食之使人不溺' }),
  XW('huaimu','櫰木','wood',['xishan-4-16'],{ icon:'🍈', skill:'qiaocai', form:'其状如棠，而员叶赤实，实大如木瓜', effect:'食之多力', py:'huái' }),
  XW('jiaguo','嘉果','fruit',['xishan-4-01'],{ icon:'🍎', skill:'qiaocai', note:'不周之山多嘉果——其实如桃，其叶如枣，食之不饥' }),
);

// ---- 西山金玉（采玉）----
addItem(
  XW('tong','铜','mineral',['xishan-1-02','xishan-1-09'],{ icon:'🟠', skill:'caiyu' }),
  XW('tie','铁','mineral',['xishan-1-09'],{ icon:'⚙️', skill:'caiyu' }),
  XW('yin','银','mineral',['xishan-1-12','xishan-2-17'],{ icon:'⚪', skill:'caiyu' }),
  XW('chitong','赤铜','mineral',['xishan-1-02','xishan-2-17'],{ icon:'🔶', skill:'caiyu' }),
  XW('cangyu','苍玉','mineral',['xishan-1-12'],{ icon:'💠', skill:'caiyu', py:'cāng' }),
  XW('langgan','琅玕','mineral',['xishan-3-21'],{ icon:'💎', skill:'caiyu', note:'琅玕之玉——昆仑所产美玉', py:'láng gān' }),
  XW('yao','瑶','mineral',['xishan-3-19'],{ icon:'💠', skill:'caiyu', py:'yáo' }),
  XW('biyu','碧','mineral',['xishan-3-16','xishan-4-09'],{ icon:'🟢', skill:'caiyu' }),
  XW('ziyu','茈','mineral',['xishan-3-16'],{ icon:'🟣', skill:'caiyu', py:'zǐ' }),
  XW('luoshi','硌石','mineral',['xishan-4-06'],{ icon:'🪨', skill:'caiyu', py:'luò' }),
  XW('ganshi','汵石','mineral',['xishan-4-11'],{ icon:'🪨', skill:'caiyu', py:'gàn' }),
  XW('dili','砥砺','mineral',['xishan-4-17'],{ icon:'⚒️', skill:'caiyu', note:'磨刀之石——冶铸增效' }),
  XW('wenbei','文贝','mineral',['xishan-4-15'],{ icon:'🐚', skill:'caiyu' }),
  XW('huangbei','黄贝','mineral',['xishan-4-19'],{ icon:'🐚', skill:'caiyu' }),
  XW('baizhu','白珠','mineral',['xishan-2-11','xishan-4-09'],{ icon:'⚪', skill:'caiyu' }),
  XW('xionghuang','雄黄','mineral',['xishan-4-16'],{ icon:'🟡', skill:'caiyu', note:'雄黄——入药可驱虫' }),
  XW('qingxionghuang','青雄黄','mineral',['xishan-4-17','xishan-4-19'],{ icon:'🟢', skill:'caiyu' }),
  XW('yushi','礜石','mineral',['xishan-1-13'],{ icon:'🪨', skill:'caiyu', py:'yù' }),
  XW('xishi','洗石','mineral',['xishan-1-02'],{ icon:'🧼', skill:'caiyu', note:'洗石——浣衣去垢之石' }),
  XW('caishi','采石','mineral',['xishan-2-10'],{ icon:'🪨', skill:'caiyu' }),
  XW('e','垩','mineral',['xishan-2-10'],{ icon:'⚪', skill:'caiyu', py:'è' }),
  XW('liuzhe','流赭','mineral',['xishan-1-13'],{ icon:'🔴', skill:'caiyu', note:'流赭——以涂牛马无病' }),
  XW('qingshi','磬石','mineral',['xishan-1-09','xishan-4-06'],{ icon:'🎵', skill:'caiyu' }),
  XW('meiyu','美玉','mineral',['xishan-3-14'],{ icon:'💠', skill:'caiyu' }),
  XW('zaoyu','藻玉','mineral',['xishan-2-10'],{ icon:'💠', skill:'caiyu', py:'zǎo' }),
  XW('wenyushi','文玉石','mineral',['xishan-3-21'],{ icon:'💠', skill:'caiyu' }),
  XW('jinyu','金玉','mineral',['xishan-1-01'],{ icon:'🪙', skill:'caiyu', note:'多金玉' }),
  XW('xuanyu','玄玉','mineral',['xishan-3-04'],{ icon:'🖤', skill:'caiyu', note:'玉膏所生玄玉' }),
  XW('yugao','玉膏','mineral',['xishan-3-04'],{ icon:'🫙', skill:'caiyu', note:'其原沸沸汤汤，黄帝是食是飨——灌丹木之资', rarity:'RARE' }),
  XW('yurong','玉荣','mineral',['xishan-3-04'],{ icon:'✨', skill:'caiyu', note:'峚山之玉荣——五色发作，以和柔刚', rarity:'RARE' }),
  XW('zhuyu2','珠玉','mineral',['xishan-4-18'],{ icon:'🔮', skill:'yu', note:'𩶯魮之鱼所生——唯一产珠玉之鱼', rarity:'LEGENDARY' }),
);

// ---- 西山灵草（采药）----
addItem(
  XW('bili','萆荔','herb',['xishan-1-02'],{ icon:'🌿', skill:'caiyao', lvl:8, value:30, xp:70, note:'食之已心痛', py:'bì lì' }),
  XW('xuncao','薰草','herb',['xishan-1-10'],{ icon:'🌿', skill:'caiyao', lvl:12, value:44, xp:92, note:'佩之可以已疠——麻台之山' }),
  XW('gurong','蓇蓉','herb',['xishan-4-01'],{ icon:'🌺', skill:'caiyao', note:'食之使人无子——高效而有代价', py:'gū róng' }),
  XW('pingcao','薲草','herb',['xishan-3-08'],{ icon:'🌿', skill:'caiyao', note:'其状如葵，其味如葱——食之已劳', py:'píng' }),
  XW('mao','茆','herb',['xishan-4-01'],{ icon:'🌿', skill:'caiyao', py:'mǎo' }),
  XW('xiongqiong','芎藭','herb',['xishan-4-19'],{ icon:'🌿', skill:'caiyao', note:'芎藭之草——入药', py:'xiōng qióng' }),
  XW('hui','蕙','herb',['xishan-4-01'],{ icon:'🌷', skill:'caiyao', py:'huì' }),
  XW('duheng','杜衡','herb',['xishan-4-01'],{ icon:'🌿', skill:'caiyao', py:'dù héng' }),
  XW('zicao','茈草','herb',['xishan-3-07'],{ icon:'🟣', skill:'caiyao', py:'zǐ' }),
  XW('huangguan','黄雚','herb',['xishan-1-10'],{ icon:'🌿', skill:'caiyao', lvl:14, value:52, xp:100, py:'huáng guàn' }),
  XW('xiao','虈','herb',['xishan-4-19'],{ icon:'🌿', skill:'caiyao', py:'xiāo' }),
);

// ---- 嘉谷 · 稷（圃艺）----
addItem(
  XW('seed_ji','稷籽','seed',[],{ icon:'🌾', skill:'puyi', lvl:12, value:30, xp:70, grow:14, crop:'ji', py:'jì' }),
  XW('ji','稷米','crop',[],{ icon:'🍚', skill:'puyi', lvl:14, value:38, xp:80, note:'糈用稷米——西次三经祠礼' }),
);

// ---- 水族渔获 ----
addItem(
  XW('zhipiyu','𩶯魮之鱼','fish',['xishan-4-18'],{ icon:'🐟', skill:'yu', note:'状如覆铫，鸟首而鱼翼鱼尾，音如磬石之声——是生珠玉', py:'zhì pí' }),
);

// ---- 通用素材（讨伐掉落兜底）----
addItem(
  I('shoupi','兽皮','beast', { value:12, icon:'🐕' }),
  I('niaoyu','鸟羽','beast', { value:10, icon:'🪶' }),
  I('yulin','鱼鳞','beast', { value:8,  icon:'🐡' }),
);

// ---- 异兽特产（西山）----
addItem(
  I('qianyanggao','羬羊之豪','beast',{ value:22, icon:'🐏', effect:'其羊尾毛如牦牛尾', py:'qián' }),
  I('zuoniujiao','㸲牛之角','beast',{ value:26, icon:'🐂', py:'zuó' }),
  I('chibieyu','赤鷩羽','beast',{ value:24, icon:'🪶', effect:'赤鷩可以御火', py:'bì' }),
  I('conglonger','葱聋之耳','beast',{ value:24, icon:'👂', note:'葱聋——其羊尾毛如牦牛尾，赤足' }),
  I('feiyishen','肥𧔥之身','beast',{ value:30, icon:'🐍', effect:'六足四翼——见则天下大旱', py:'féi wèi' }),
  I('feiyiyu','肥遗羽','beast',{ value:28, icon:'🪶', effect:'食之已疠——与肥𧔥字形相近而物不同', py:'féi yí' }),
  I('haozhiyao','豪彘之牙','beast',{ value:30, icon:'🦷', py:'zhì' }),
  I('tuofeiyu','橐𩇯羽','beast',{ value:26, icon:'🪶', note:'橐𩇯——人足鸟翼', py:'tuó féi' }),
  I('mengbaopi','猛豹之皮','beast',{ value:34, icon:'🐆' }),
  I('xibianpi','溪边之皮','beast',{ value:32, icon:'🐕', effect:'席其皮者不蛊' }),
  I('jueruzhi','玃如之臂','beast',{ value:30, icon:'🐒', note:'玃如——状如禺而善投', py:'jué' }),
  I('maoniupi','牦牛之皮','beast',{ value:32, icon:'🐃', py:'máo' }),
  I('shepi','麝之皮','beast',{ value:26, icon:'🐿️', py:'shè' }),
  I('baishepi','白蛇之皮','beast',{ value:30, icon:'🐍' }),
  I('hupi','虎皮','beast',{ value:38, icon:'🐯' }),
  I('baopi','豹皮','beast',{ value:36, icon:'🐆' }),
  I('luanniaoyu','鸾鸟羽','beast',{ value:60, icon:'🪽', effect:'见则天下安宁', rarity:'LEGENDARY' }),
  I('baihaoshou','白豪之毛','beast',{ value:34, icon:'⚪' }),
  I('fuxiyu','凫徯羽','beast',{ value:36, icon:'🪶', effect:'见则有兵', py:'fú xī' }),
  I('zhuyanmao','朱厌之毛','beast',{ value:40, icon:'🔴', effect:'见则大兵', py:'zhū yàn' }),
  I('jufuzhi','举父之臂','beast',{ value:34, icon:'🐒', note:'举父——状如禺而文臂，豹尾善投' }),
  I('manmanyi','蛮蛮之翼','beast',{ value:42, icon:'🪽', effect:'一翼一目，相得乃飞', rarity:'RARE' }),
  I('wenyaoyi','文鳐之翼','beast',{ value:66, icon:'🪽', effect:'见则天下大穰', rarity:'LEGENDARY', py:'wén yáo' }),
  I('tuloujiao','土蝼之角','beast',{ value:38, icon:'🐏' }),
  I('qinyuanci','钦原之刺','beast',{ value:44, icon:'📍', effect:'蠚鸟兽则死，蠚木则枯', rarity:'RARE' }),
  I('xiwangmusheng','西王母之胜','beast',{ value:260, icon:'👑', effect:'蓬发戴胜——司天之厉及五残', rarity:'LEGENDARY', py:'xī wáng mǔ' }),
  I('jiaojiao','狡之角','beast',{ value:40, icon:'🦌', effect:'其状如犬而豹文，其角如牛' }),
  I('shengyuyu','胜遇羽','beast',{ value:44, icon:'🪶', effect:'其状如翟而赤，是食鱼', py:'shèng yù' }),
  I('zhengwei','狰之尾','beast',{ value:46, icon:'🔴', effect:'五尾一角，其音如击石', py:'zhēng' }),
  I('bifangyu','毕方羽','beast',{ value:48, icon:'🪶', effect:'一足，赤文青质而白喙——见则讹火', py:'bì fāng' }),
  I('tiangoupi','天狗之皮','beast',{ value:36, icon:'🐕' }),
  I('aoyihao','傲𢓭之豪','beast',{ value:42, icon:'⚪', effect:'其豪如披蓑', py:'ào yì' }),
  I('huanmu','讙之目','beast',{ value:40, icon:'👁️', effect:'一目而三尾，其音如百声', py:'huān' }),
  I('qituyu','鵸鵌羽','beast',{ value:44, icon:'🪶', effect:'三首六尾而善笑', py:'qí tú' }),
  I('bailangpi','白狼之皮','beast',{ value:34, icon:'🐺' }),
  I('baihupi','白虎之皮','beast',{ value:52, icon:'🐯', rarity:'RARE' }),
  I('shenlingzu','神𩲜之足','beast',{ value:46, icon:'🦶', effect:'人面兽身，一足一手' }),
  I('ranyizhimu','冉遗之目','beast',{ value:42, icon:'👁️', effect:'鱼身蛇首六足，其目如马耳', py:'rǎn yí' }),
  I('bojiao','駮之角','beast',{ value:80, icon:'🦌', effect:'可以御兵——克兵灾征兆', rarity:'RARE', py:'bó' }),
  I('qiongqimao','穷奇之毛','beast',{ value:56, icon:'🦔', effect:'其状如牛，猬毛', rarity:'RARE' }),
  I('luoyuyi','蠃鱼之翼','beast',{ value:44, icon:'🪽', effect:'鱼身而鸟翼，其音如鸳鸯', py:'luǒ' }),
  I('guike','龟之壳','beast',{ value:30, icon:'🐢' }),
  I('shuhuwei','孰湖之尾','beast',{ value:48, icon:'🐍', effect:'马身鸟翼，人面蛇尾，是好举人', py:'shú hú' }),
  I('junniaoyu','鵕鸟羽','beast',{ value:56, icon:'🪶', effect:'赤足直喙，黄文白首——见则其邑大旱', rarity:'RARE', py:'jùn' }),
  I('daenyao','大鹗之爪','beast',{ value:60, icon:'🦅', effect:'黑文白首，赤喙虎爪——见则有大兵', rarity:'RARE', py:'è' }),
  I('luwuuwei','陆吾之尾','beast',{ value:280, icon:'🦊', effect:'虎身九尾，人面虎爪——司天之九部', rarity:'LEGENDARY' }),
  I('dijiangnang','帝江之囊','beast',{ value:300, icon:'🎈', effect:'状如黄囊，赤如丹火，六足四翼，浑敦无面目', rarity:'LEGENDARY', py:'dì jiāng' }),
  I('danghuran','当扈之髯','beast',{ value:50, icon:'🪶', effect:'以其髯飞——食之不眴目', rarity:'RARE', py:'dāng hù' }),
  I('renyuyu','人鱼之羽','beast',{ value:26, icon:'🪶', effect:'人鱼——状如鮫而有四足' }),
  I('xiaozhu','嚣之臂','beast',{ value:30, icon:'🐒', effect:'嚣——状如禺而长臂，善投', py:'xiāo' }),
  I('lupi','鹿皮','beast',{ value:22, icon:'🦌' }),
  I('mipi','麋皮','beast',{ value:24, icon:'🦌', py:'mí' }),
  I('luoluopi','罗罗皮','beast',{ value:22, icon:'🐗' }),
);

// ---- 祠牲供品（西山四套祠礼）----
addItem(
  I('niu','牛牲','rite', { value:40, icon:'🐂', note:'太牢之牛' }),
  I('yang','羊牲','rite',{ value:36, icon:'🐏', note:'太牢/少牢之羊' }),
  I('shi','豕牲','rite', { value:36, icon:'🐖', note:'太牢/少牢之豕', py:'shǐ' }),
  I('xi','牺','rite',    { value:30, icon:'🐄', note:'羭山祠礼「斋百日以百牺」', py:'xī' }),
  I('jiu','酒','rite',    { value:24, icon:'🍶', note:'「汤其酒百樽」', py:'jiǔ' }),
  I('jiyu2','吉玉','rite', { value:120,icon:'💠', note:'西次三经祠礼「用一吉玉瘗」' }),
  I('guiyu','珪','rite',  { value:90, icon:'📗', note:'「婴以百珪百璧」', py:'guī' }),
  I('yu2','瑜','rite',    { value:80, icon:'📘', note:'「瘗用百瑜」——美玉', py:'yú' }),
  I('xiongji','雄鸡','rite',{ value:40, icon:'🐓', note:'西次二经十辈神「毛一雄鸡，钤而不糈」' }),
  I('baiji','白鸡','rite', { value:120,icon:'🐔', note:'西次四经「用一白鸡祈」' }),
);

// ---- 峚山养成产物 ----
addItem(
  I('danmu','丹木','wood', { value:200, icon:'🌳', note:'员叶而赤茎，黄华赤实，其味如饴——食之不饥', rarity:'RARE' }),
  I('danmushi','丹木之实','food', { value:150, heal:500, icon:'🍒', edible:true, effect:'食之不饥', rarity:'RARE' }),
);

// 中山经首录三系独有产出（帝之密都：草木主治线收官 + 双征兆水族；2026-10-24）
addItem(
  // —— 中次一经 · 草木（樵采/采药）——
  XW('zs_limu','櫔木','wood',['zhongshan-1-02'],{ icon:'🌳', skill:'qiaocai', py:'lǜ', note:'方茎而员叶，黄华而毛，其实如拣——服之不忘' }),
  XW('zs_zhizhu','植楮','herb',['zhongshan-1-06'],{ icon:'🌿', skill:'caiyao', note:'其状如葵叶而赤华，荚实如棕椶荚——可以已癙，食之不眯' }),
  XW('zs_tianying','天婴','herb',['zhongshan-1-07'],{ icon:'🌿', skill:'caiyao', note:'其状如龙骨——可以已痤' }),
  XW('zs_guicao','鬼草','herb',['zhongshan-1-11'],{ icon:'🌿', skill:'caiyao', note:'其叶如葵而赤茎，其秀如禾——服之不忧' }),
  XW('zs_diaotang','雕棠','wood',['zhongshan-1-14'],{ icon:'🪵', skill:'qiaocai', note:'其叶如榆叶而方，其实如赤菽——食之已聋' }),
  XW('zs_zhanji','薝棘','wood',['zhongshan-1-13'],{ icon:'🌳', skill:'qiaocai' }),
  XW('zs_rongcao','荣草','herb',['zhongshan-1-15','zhongshan-12-12'],{ icon:'🌿', skill:'caiyao', note:'其叶如柳，其本如鸡卵——食之已风' }),
  // —— 中次二经 · 毒草（芒草可以毒鱼——采集需谨慎）——
  XW('zs_mangcao','芒草','herb',['zhongshan-2-07'],{ icon:'☠️', skill:'caiyao', note:'其状如棠而赤叶——可以毒鱼', hazard:true }),
  // —— 中次三经 · 帝之密都（青要之山）——
  XW('zs_xuncao','荀草','herb',['zhongshan-3-02'],{ icon:'🌸', skill:'caiyao', note:'其状如葌而方茎、黄华、赤实，其本如稿本——服之美人色' }),
  XW('zs_manju','蔓居之木','wood',['zhongshan-3-04'],{ icon:'🪵', skill:'qiaocai' }),
  // —— 水族（渔）——豪鱼（中次一经）与飞鱼（中次一经/中次三经同名异地）——
  XW('zs_haoyu','豪鱼','fish',['zhongshan-1-03'],{ icon:'🐟', skill:'yu', effect:'可以已白癣', note:'状如鲔，而赤喙赤尾赤羽' }),
  XW('zs_feiyu','飞鱼','fish',['zhongshan-1-11','zhongshan-3-03'],{ icon:'🐟', skill:'yu', effect:'服之不畏雷，可以御兵', note:'牛首之山飞鱼其状如鲋鱼（食之已痔衕）；騩山飞鱼其状如豚而赤文——同名异地，效果以騩山为准' }),
  // —— 中次四经 · 毒木毒草（厘山：柄山之茇、熊耳之葶苎，皆「可以毒鱼」）——
  XW('zs_ba','茇','wood',['zhongshan-4-05'],{ icon:'🪵', skill:'qiaocai', hazard:true, note:'其状如樗，其叶如桐而荚实——可以毒鱼', py:'bá' }),
  XW('zs_tingzhu','葶苎','herb',['zhongshan-4-07'],{ icon:'☠️', skill:'caiyao', hazard:true, note:'其状如苏而赤华——可以毒鱼', py:'tíng zhù' }),
  // —— 中次五经 · 薄山草木金玉（苟床怪石、首山槐与𦬸芫、葱聋玤石、条谷虋冬、成侯櫄木芃、朝歌美垩、槐山锡、升山棘寇脱璇玉）——
  XW('zs_guaishi','怪石','mineral',['zhongshan-5-01'],{ icon:'🪨', skill:'caiyu', note:'无草木，多怪石——苟床之山', py:'guài' }),
  XW('zs_huai','槐','wood',['zhongshan-5-02'],{ icon:'🌳', skill:'qiaocai', py:'huái' }),
  XW('zs_zhu','𦬸','herb',['zhongshan-5-02'],{ icon:'🌿', skill:'caiyao', note:'即山蓟（苍术/白术）——首山之草', py:'zhú' }),
  XW('zs_yuan','芫','herb',['zhongshan-5-02'],{ icon:'🌼', skill:'caiyao', note:'芫花——落叶灌木，花蕾可入药', py:'yuán' }),
  XW('zs_bang','玤石','mineral',['zhongshan-5-04'],{ icon:'🟤', skill:'caiyu', note:'石次玉者——次于玉的美石', py:'bàng' }),
  XW('zs_mendong','虋冬','herb',['zhongshan-5-05'],{ icon:'🌿', skill:'caiyao', note:'即麦门冬/天门冬——条谷山之草', py:'mén dōng' }),
  XW('zs_chunmu','櫄木','wood',['zhongshan-5-07'],{ icon:'🪵', skill:'qiaocai', note:'即椿木——成侯之山', py:'chūn' }),
  XW('zs_peng','芃','herb',['zhongshan-5-07'],{ icon:'🌿', skill:'caiyao', note:'芃草——成侯之山', py:'péng' }),
  XW('zs_meie','美垩','mineral',['zhongshan-5-08'],{ icon:'⚪', skill:'caiyu', note:'优质垩土——朝歌之山谷', py:'měi è' }),
  XW('zs_xi','锡','mineral',['zhongshan-5-09'],{ icon:'⚪', skill:'caiyu', note:'槐山之谷多金、锡', py:'xī' }),
  XW('zs_ji','棘','wood',['zhongshan-5-14'],{ icon:'🌿', skill:'qiaocai', note:'酸枣之属——升山之木', py:'jí' }),
  XW('zs_koutuo','寇脱','herb',['zhongshan-5-14'],{ icon:'🌿', skill:'caiyao', note:'即通脱木——升山草属', py:'kòu tuō' }),
  XW('zs_xuanyu','璇玉','mineral',['zhongshan-5-14'],{ icon:'💠', skill:'caiyu', note:'黄酸之水其中多璇玉——美玉', py:'xuán' }),
  XW('zs_tong','桐','wood',['zhongshan-5-05'],{ icon:'🌳', skill:'qiaocai', py:'tóng' }),
  // ---- 中次六经（缟羝山十四山；raw 793–806 → L75–76）----
  XW('zs_liu','柳','wood',['zhongshan-6-03'],{ icon:'🌿', skill:'qiaocai', note:'雚谷其木多柳', py:'liǔ' }),
  XW('zs_chu2','楮','wood',['zhongshan-6-03'],{ icon:'🌳', skill:'qiaocai', note:'雚谷其木多楮——即构树', py:'chǔ' }),
  XW('zs_mishi','麋石','mineral',['zhongshan-6-06'],{ icon:'🪨', skill:'caiyu', note:'涧水之中多麋石——即画眉石', py:'mí' }),
  XW('zs_ludan','栌丹','mineral',['zhongshan-6-06'],{ icon:'🔴', skill:'caiyu', note:'涧水之中多栌丹', py:'lú dān' }),
  XW('zs_bilv','碧绿','mineral',['zhongshan-6-07'],{ icon:'🟢', skill:'caiyu', note:'爽水之中多碧绿——碧玉之属', py:'bì lǜ' }),
  XW('zs_mingshi','鸣石','mineral',['zhongshan-6-09'],{ icon:'🔔', skill:'caiyu', note:'共水之中多鸣石——可为磬，击之有声', py:'míng' }),
  XW('zs_yanyu','珚玉','mineral',['zhongshan-6-10','zhongshan-6-13'],{ icon:'💠', skill:'caiyu', note:'榖水、湖水之中多珚玉', py:'yān' }),
  XW('zs_chu','樗','wood',['zhongshan-6-11'],{ icon:'🌳', skill:'qiaocai', note:'其木多樗——臭椿', py:'chū' }),
  XW('zs_beimu','𣖾木','wood',['zhongshan-6-11'],{ icon:'🪵', skill:'qiaocai', note:'其木多𣖾木', py:'bèi' }),
  XW('zs_xiao','萧','herb',['zhongshan-6-11'],{ icon:'🌿', skill:'caiyao', note:'多萧——艾蒿之属', py:'xiāo' }),
  XW('zs_zhujian','竹箭','wood',['zhongshan-6-13','zhongshan-12-08'],{ icon:'🎋', skill:'qiaocai', note:'多竹箭——小竹，可为矢', py:'zhú jiàn' }),
  XW('zs_kuxin','苦辛','herb',['zhongshan-6-14'],{ icon:'🌿', skill:'caiyao', note:'其状如橚，其实如瓜，其味酸甘——食之已疟', py:'kǔ xīn' }),
  XW('zs_xuansu','玄䃤','mineral',['zhongshan-6-14'],{ icon:'⚫', skill:'caiyu', note:'门水之中多玄䃤——黑石，可为砥砺', py:'xuán sù' }),
  // ---- 中次七经（苦山十九山；raw 807–825 → L76–77）----
  XW('zs_ditaiqi','帝台之棋','mineral',['zhongshan-7-01'],{ icon:'🎲', skill:'caiyu', note:'五色而文，其状如鹑卵——帝台之石，所以祷百神者也，服之不蛊', py:'dì tái' }),
  XW('zs_sutiao','夙条','herb',['zhongshan-7-01'],{ icon:'🌾', skill:'caiyao', note:'其状如蓍，赤叶而本丛生——可以为簳（箭杆）', py:'sù tiáo' }),
  XW('zs_yansuan','焉酸','herb',['zhongshan-7-02'],{ icon:'🌼', skill:'caiyao', note:'方茎而黄华，员叶而三成——可以为毒（疗毒）', py:'yān suān' }),
  XW('zs_yaocao','䔄草','herb',['zhongshan-7-03','zhongshan-7-10'],{ icon:'🌿', skill:'caiyao', note:'帝女女尸所化——服之媚于人；泰室之䔄草服之不昧', py:'yáo' }),
  XW('zs_huangji','黄棘','wood',['zhongshan-7-04'],{ icon:'🌳', skill:'qiaocai', note:'黄华而员叶，其实如兰——服之不字', py:'huáng jí' }),
  XW('zs_wutiao','无条','herb',['zhongshan-7-04'],{ icon:'🌿', skill:'caiyao', note:'员叶而无茎，赤华而不实——服之不瘿', py:'wú tiáo' }),
  XW('zs_tianpian','天楄','wood',['zhongshan-7-05'],{ icon:'🪵', skill:'qiaocai', note:'方茎而葵状——服者不㖶（不噎）', py:'tiān pián' }),
  XW('zs_mengmu','蒙木','wood',['zhongshan-7-06'],{ icon:'🌳', skill:'qiaocai', note:'其叶如槐，黄华而不实——服之不惑', py:'méng' }),
  XW('zs_niushang','牛伤','herb',['zhongshan-7-07'],{ icon:'🌿', skill:'caiyao', note:'叶如榆，方茎而苍伤，其根苍文——服者不厥，可以御兵', py:'niú shāng' }),
  XW('zs_jiarong','嘉荣','herb',['zhongshan-7-08'],{ icon:'🌺', skill:'caiyao', note:'生而秀，高丈余，赤叶赤华——服之者不霆', py:'jiā róng' }),
  XW('zs_dixiu','帝休','wood',['zhongshan-7-09'],{ icon:'🌳', skill:'qiaocai', note:'叶如杨，其枝五衢，黄华黑实——服者不怒', py:'dì xiū' }),
  XW('zs_youmu','栯木','wood',['zhongshan-7-10'],{ icon:'🌳', skill:'qiaocai', note:'叶状如梨而赤理——服者不妒', py:'yǒu' }),
  XW('zs_diwu','帝屋','wood',['zhongshan-7-11'],{ icon:'🪵', skill:'qiaocai', note:'叶状如椒，反伤，赤实——可以御凶', py:'dì wū' }),
  XW('zs_kangmu','亢木','wood',['zhongshan-7-13'],{ icon:'🌳', skill:'qiaocai', note:'叶状如樗而赤实——食之不蛊', py:'kàng' }),
  XW('zs_gangcao','𦬣草','herb',['zhongshan-7-14'],{ icon:'🌿', skill:'caiyao', note:'叶状如葵而赤茎白华，实如蘡薁——食之不愚', py:'gāng' }),
  XW('zs_licao','梨草','herb',['zhongshan-7-15'],{ icon:'🌸', skill:'caiyao', note:'其叶状如荻而赤华——可以已疽（与果木之梨别）', py:'lí' }),
  XW('zs_jibai','葪柏','wood',['zhongshan-7-18'],{ icon:'🌲', skill:'qiaocai', note:'其状如荆，白华而赤实——服者不寒', py:'jì bǎi' }),
  XW('zs_langcao','𦳌草','herb',['zhongshan-7-19'],{ icon:'🌿', skill:'caiyao', note:'其状如蓍而毛，青华而白实——服之不夭，可以为腹病', py:'láng' }),
  XW('zs_miyu','麋玉','mineral',['zhongshan-7-07'],{ icon:'💠', skill:'caiyu', note:'大𩇵之山多麋玉', py:'mí' }),
  XW('zs_zhe','柘','wood',['zhongshan-7-11'],{ icon:'🌳', skill:'qiaocai', note:'讲山多柘——柘木，叶可饲蚕', py:'zhè' }),
  XW('zs_xixin','细辛','herb',['zhongshan-7-13'],{ icon:'🌿', skill:'caiyao', note:'蛇谷之上多少辛——细辛，香草入药', py:'xì xīn' }),
  XW('zs_meishi','美石','mineral',['zhongshan-7-10'],{ icon:'🪨', skill:'caiyu', note:'泰室之山上多美石', py:'měi shí' }),
  // ---- 中次八经（荆山二十三山；raw 826–848 → L77）----
  XW('zs_shu','杼','wood',['zhongshan-8-01'],{ icon:'🪵', skill:'qiaocai', note:'其木多杼、檀——杼即柞栎之属', py:'zhù' }),
  XW('zs_wenyu','文鱼','fish',['zhongshan-8-01'],{ icon:'🐟', skill:'yu', note:'雎水多文鱼——有斑文之鱼', py:'wén' }),
  XW('zs_jiaoyu','鲛鱼','fish',['zhongshan-8-02'],{ icon:'🦈', skill:'yu', note:'漳水多鲛鱼——鲨属，皮可为甲', py:'jiāo' }),
  XW('zs_ju','橘','fruit',['zhongshan-8-02','zhongshan-8-06','zhongshan-8-10'],{ icon:'🍊', skill:'qiaocai', py:'jú' }),
  XW('zs_you','櫾','fruit',['zhongshan-8-02','zhongshan-8-06','zhongshan-8-10'],{ icon:'🍈', skill:'qiaocai', note:'似橘而大，即柚', py:'yòu' }),
  XW('zs_baijiao','白鷮','bird',['zhongshan-8-04'],{ icon:'🕊️', skill:'lie', note:'雉类而白，尾长——其羽可为饰', py:'jiāo' }),
  XW('zs_di','翟','bird',['zhongshan-8-04'],{ icon:'🦚', skill:'lie', note:'长尾野鸡，羽色斑斓', py:'dí' }),
  XW('zs_zhen','鸩','bird',['zhongshan-8-04','zhongshan-8-23'],{ icon:'🐦', skill:'lie', note:'毒鸟——以羽画酒，饮之立死', py:'zhèn' }),
  XW('zs_ji2','麂','beast',['zhongshan-8-04'],{ icon:'🦌', skill:'lie', note:'小型鹿，皮软可为履', py:'jǐ' }),
  XW('zs_zha','柤','fruit',['zhongshan-8-06','zhongshan-8-10'],{ icon:'🍎', skill:'qiaocai', note:'即山楂', py:'zhā' }),
  XW('zs_li2','栗','fruit',['zhongshan-8-06','zhongshan-8-10'],{ icon:'🌰', skill:'qiaocai', py:'lì' }),
  XW('zs_zhu3','麈','beast',['zhongshan-8-06','zhongshan-8-11'],{ icon:'🦌', skill:'lie', note:'鹿属，尾可为拂尘', py:'zhǔ' }),
  XW('zs_ling','羚','beast',['zhongshan-8-06','zhongshan-8-12'],{ icon:'🐐', skill:'lie', note:'羚羊，角入药', py:'líng' }),
  XW('zs_chuo','㚟','beast',['zhongshan-8-06','zhongshan-8-12'],{ icon:'🐇', skill:'lie', note:'似兔而鹿足，青色', py:'chuò' }),
  XW('zs_baimin','白珉','mineral',['zhongshan-8-09','zhongshan-8-23'],{ icon:'⚪', skill:'caiyu', note:'似玉之白石', py:'mín' }),
  XW('zs_ji3','机','wood',['zhongshan-8-12'],{ icon:'🪵', skill:'qiaocai', note:'机木，似榆——可烧以粪田', py:'jī' }),
  XW('zs_mei','梅','fruit',['zhongshan-8-13'],{ icon:'🌸', skill:'qiaocai', py:'méi' }),
  XW('zs_xing','杏','fruit',['zhongshan-8-13'],{ icon:'🍑', skill:'qiaocai', py:'xìng' }),
  XW('zs_yumu','寓木','wood',['zhongshan-8-14','zhongshan-8-15','zhongshan-8-16','zhongshan-8-17'],{ icon:'🌿', skill:'qiaocai', note:'寄生他树而生之木', py:'yù' }),
  XW('zs_chixi','赤锡','mineral',['zhongshan-8-14'],{ icon:'🔴', skill:'caiyu', py:'xī' }),
  XW('zs_huange','黄垩','mineral',['zhongshan-8-15'],{ icon:'🟡', skill:'caiyu', note:'黄色涂料土', py:'è' }),
  XW('zs_baie','白垩','mineral',['zhongshan-8-15'],{ icon:'⚪', skill:'caiyu', note:'白色涂料土', py:'è' }),
  XW('zs_guishi','邽石','mineral',['zhongshan-8-17','zhongshan-8-20'],{ icon:'🪨', skill:'caiyu', note:'邽地之石，可为砺', py:'guī' }),
  XW('zs_baixi','白锡','mineral',['zhongshan-8-20'],{ icon:'⬜', skill:'caiyu', py:'xī' }),
  XW('zs_baixi2','白犀','beast',['zhongshan-8-23'],{ icon:'🦏', skill:'lie', note:'犀而色白，一角——其角通灵，可解毒', py:'xī' }),
  XW('zs_jiao','椒','wood',['zhongshan-8-23'],{ icon:'🌿', skill:'qiaocai', note:'椒树，实辛香', py:'jiāo' }),
  XW('zs_shi','豕','beast',['zhongshan-8-11','zhongshan-8-23'],{ icon:'🐖', skill:'lie', note:'豕即猪——三牲之一', py:'shǐ' }),
  XW('zs_zaogui','藻圭','mineral',['zhongshan-8-01'],{ icon:'💠', skill:'caiyu', note:'带彩色花纹之圭——荆山诸神祠礼所婴', py:'zǎo guī' }),
  // ---- 中次九经（岷山十六山；raw 849–864 → L77–78）----
  XW('zs_shinie','石涅','mineral',['zhongshan-9-01','zhongshan-9-11'],{ icon:'⬛', skill:'caiyu', note:'即石墨——可染可书', py:'shí niè' }),
  XW('zs_ju2','菊','herb',['zhongshan-9-01'],{ icon:'🌼', skill:'caiyao', note:'其草多菊——菊华入药', py:'jú' }),
  XW('zs_zhu4','术','herb',['zhongshan-9-01'],{ icon:'🌿', skill:'caiyao', note:'即山蓟（苍术/白术）——与中次五经「𦬸」同物', py:'zhú' }),
  XW('zs_lianggui','良龟','fish',['zhongshan-9-02'],{ icon:'🐢', skill:'yu', note:'江水多良龟——甲可卜', py:'liáng guī' }),
  XW('zs_tuo','鼍','fish',['zhongshan-9-02'],{ icon:'🐊', skill:'yu', note:'即扬子鳄——皮可为鼓', py:'tuó' }),
  XW('zs_tang','棠','wood',['zhongshan-9-02'],{ icon:'🌳', skill:'qiaocai', note:'棠梨——其木多梅、棠', py:'táng' }),
  XW('zs_kuiniu','夔牛','beast',['zhongshan-9-02','zhongshan-9-04'],{ icon:'🐂', skill:'lie', note:'牛形无角，苍身——其声如雷，皮可为鼓', py:'kuí' }),
  XW('zs_han','翰','bird',['zhongshan-9-02'],{ icon:'🕊️', skill:'lie', note:'白翰——雉类而色白，羽可为饰', py:'hàn' }),
  XW('zs_bie','鷩','bird',['zhongshan-9-02'],{ icon:'🦚', skill:'lie', note:'锦鸡——似雉而五色', py:'biē' }),
  XW('zs_xie2','薤','herb',['zhongshan-9-03'],{ icon:'🧄', skill:'caiyao', note:'薤白——韭类而白，可食可药', py:'xiè' }),
  XW('zs_yao2','药','herb',['zhongshan-9-03'],{ icon:'🌿', skill:'caiyao', note:'其草多药——草木之可疗者', py:'yào' }),
  XW('zs_kongduo','空夺','herb',['zhongshan-9-03'],{ icon:'🌿', skill:'caiyao', note:'即通脱木——与寇脱同类', py:'kōng duó' }),
  XW('zs_zhiyu','䲀鱼','fish',['zhongshan-9-04'],{ icon:'🐟', skill:'yu', note:'江水多䲀鱼——鱼而多刺', py:'zhì' }),
  XW('zs_you2','楢','wood',['zhongshan-9-04','zhongshan-9-09','zhongshan-9-12','zhongshan-9-15'],{ icon:'🌳', skill:'qiaocai', note:'楢木——柔韧可为车辕', py:'yóu' }),
  XW('zs_qiezhi','窃脂','bird',['zhongshan-9-04'],{ icon:'🦉', skill:'lie', note:'状如鸮而赤身白首——可以御火', py:'qiè zhī' }),
  XW('zs_zou','棷','wood',['zhongshan-9-11'],{ icon:'🪵', skill:'qiaocai', note:'棷木——细枝可编', py:'zōu' }),
  XW('zs_zhan','椫','wood',['zhongshan-9-11'],{ icon:'🪵', skill:'qiaocai', note:'椫木——白理，可为器', py:'zhān' }),
  XW('zs_yang','杨','wood',['zhongshan-9-11'],{ icon:'🌳', skill:'qiaocai', py:'yáng' }),
  XW('zs_pi','罴','beast',['zhongshan-9-07'],{ icon:'🐻', skill:'lie', note:'熊之大者，黄白文——力能拔木', py:'pí' }),
  XW('zs_yuan2','猿','beast',['zhongshan-9-07'],{ icon:'🐒', skill:'lie', note:'猿——臂长善攀', py:'yuán' }),
  XW('zs_wei','蜼','beast',['zhongshan-9-07'],{ icon:'🐒', skill:'lie', note:'蜼——似猿而鼻露，尾长', py:'wèi' }),
  XW('zs_qi','芑','wood',['zhongshan-9-14','zhongshan-11-42'],{ icon:'🌾', skill:'qiaocai', note:'芑——似苦菜而白茎，原文列于「其木多」，属木类（有本作「芭」）', py:'qǐ' }),
  XW('zs_jianshi','瑊石','mineral',['zhongshan-9-15'],{ icon:'🪨', skill:'caiyu', note:'瑊石——似玉之石而次之', py:'jiān' }),
  XW('zs_longxiu','龙修','herb',['zhongshan-9-16'],{ icon:'🌾', skill:'caiyao', note:'即龙须草——可为席', py:'lóng xiū' }),
  XW('zs_meizhe','美赭','mineral',['zhongshan-9-16'],{ icon:'🟤', skill:'caiyu', note:'优质赭土——可染赤', py:'měi zhě' }),
  XW('zs_yilang','𤜣狼','beast',['zhongshan-9-06'],{ icon:'🦊', skill:'lie', note:'状如狐而白尾长耳——见则国内有兵', py:'yǐ láng' }),
  // ---- 中次十经（首阳九山；raw 865–873 → L78）----
  XW('zs_fengshi','封石','mineral',['zhongshan-10-02'],{ icon:'🪨', skill:'caiyu', note:'封石——可琢为器（与中次十一经封石互见）', py:'fēng shí' }),
  XW('zs_zhigou','枝勾','herb',['zhongshan-10-03'],{ icon:'🌿', skill:'caiyao', note:'枝勾——蔓生之草，枝屈如勾', py:'zhī gōu' }),
  XW('zs_qizhong','跂踵','bird',['zhongshan-10-05'],{ icon:'🦉', skill:'lie', note:'状如鸮而一足、彘尾——见则其国大疫', py:'qí zhǒng' }),
  XW('zs_qiyu','鸜鹆','bird',['zhongshan-10-07'],{ icon:'🐦', skill:'lie', note:'即八哥——黑羽白点，能效人言', py:'qú yù' }),
  XW('zs_shenniu','弞杻','wood',['zhongshan-10-09'],{ icon:'🪵', skill:'qiaocai', note:'弞杻——杻之一种，木理细（弞音 shěn）', py:'shěn niǔ' }),
  // ---- 中次十一经（荆山四十八山，全书最长系；raw 874–921 → L78–80）----
  XW('zs_jiao2','蛟','fish',['zhongshan-11-01','zhongshan-11-20','zhongshan-11-22','zhongshan-11-31'],{ icon:'🐉', skill:'yu', note:'水中蛟龙——似蛇而四足，能兴云雨', py:'jiāo' }),
  XW('zs_renyu','人鱼','fish',['zhongshan-11-02','zhongshan-11-22'],{ icon:'🧜', skill:'yu', note:'即娃娃鱼（大鲵）——啼声如儿', py:'rén yú' }),
  XW('zs_qianyang','羬羊','beast',['zhongshan-11-10'],{ icon:'🐐', skill:'lie', note:'羬羊——羊而马尾，其脂可已腊', py:'qián' }),
  XW('zs_xie3','颉','fish',['zhongshan-11-22'],{ icon:'🐟', skill:'yu', note:'㵗水多颉——鱼名，一说即鲒', py:'xié' }),
  XW('zs_mangcao2','莽草','herb',['zhongshan-11-02'],{ icon:'🌿', skill:'caiyao', note:'可以毒鱼——渔者捣汁投水', py:'mǎng cǎo' }),
  XW('zs_jigu','鸡榖','herb',['zhongshan-11-07','zhongshan-11-34'],{ icon:'🌾', skill:'caiyao', note:'其本如鸡卵，其味酸甘——食者利于人', py:'jī gǔ' }),
  XW('zs_zhu5','槠','wood',['zhongshan-11-05'],{ icon:'🌳', skill:'qiaocai', note:'槠木——结实如橡，可为粉', py:'zhū' }),
  XW('zs_shu2','薯','wood',['zhongshan-11-07','zhongshan-12-10'],{ icon:'🍠', skill:'qiaocai', note:'薯——山药之属，根可食', py:'shǔ' }),
  XW('zs_huan','桓','wood',['zhongshan-11-11'],{ icon:'🌳', skill:'qiaocai', note:'桓木——即无患子，实可浣垢', py:'huán' }),
  XW('zs_danhuo','丹雘','mineral',['zhongshan-11-12'],{ icon:'🔴', skill:'caiyu', note:'红色颜料——丹砂与雘土之属', py:'dān huò' }),
  XW('zs_ju3','苴','wood',['zhongshan-11-13','zhongshan-11-24','zhongshan-11-27','zhongshan-11-30','zhongshan-11-35','zhongshan-11-38','zhongshan-11-43','zhongshan-11-46'],{ icon:'🍎', skill:'qiaocai', note:'苴——即山楂，实酸可食', py:'jū' }),
  XW('zs_chou','椆','wood',['zhongshan-11-24','zhongshan-11-44'],{ icon:'🌳', skill:'qiaocai', note:'椆木——坚韧可为车', py:'chóu' }),
  XW('zs_lei','累','herb',['zhongshan-11-27'],{ icon:'🌿', skill:'caiyao', note:'累——即紫藤，蔓生花紫', py:'léi' }),
  XW('zs_yangtao','羊桃','wood',['zhongshan-11-33'],{ icon:'🥝', skill:'qiaocai', note:'状如桃而方茎——可以为皮张（消肿）', py:'yáng táo' }),
  XW('zs_cuishi','脆石','mineral',['zhongshan-11-36'],{ icon:'🪨', skill:'caiyu', note:'皋水多脆石——石之易碎者', py:'cuì shí' }),
  XW('zs_wei2','䉋','herb',['zhongshan-11-43'],{ icon:'🎋', skill:'caiyao', note:'䉋——竹之一种，可为箭', py:'mèi' }),
  XW('zs_xiangcao','香草','herb',['zhongshan-11-48'],{ icon:'🌸', skill:'caiyao', note:'凡山多香草——可佩可浴', py:'xiāng cǎo' }),
  XW('zs_xuanbao','玄豹','beast',['zhongshan-11-14'],{ icon:'🐆', skill:'lie', note:'黑豹——豹之玄者，皮可为裘', py:'xuán bào' }),
  XW('zs_dinv','帝女之桑','wood',['zhongshan-11-31'],{ icon:'🌳', skill:'qiaocai', note:'大五十尺，枝四衢，叶大尺余，赤理黄华青柎——宣山之神木', py:'dì nǚ zhī sāng' }),
  // ---- 中次十二经（洞庭十五山，全书收卷之系；raw 922–950 → L80–81）----
  XW('zs_guizhu','桂竹','herb',['zhongshan-12-02'],{ icon:'🎋', skill:'caiyao', note:'甚毒——伤人必死', py:'guì zhú' }),
  XW('zs_fuzhu2','扶竹','herb',['zhongshan-12-03'],{ icon:'🎋', skill:'caiyao', note:'扶竹——节长而疏，可为杖', py:'fú zhú' }),
  XW('zs_jinzhu','筀竹','herb',['zhongshan-12-04'],{ icon:'🎋', skill:'caiyao', note:'筀竹——大者可为舟', py:'guì zhú' }),
  XW('zs_junzhu','箘','herb',['zhongshan-12-08'],{ icon:'🎋', skill:'caiyao', note:'箘竹——细而坚，可为箭', py:'jùn' }),
  XW('zs_yanmu','檿','wood',['zhongshan-12-13'],{ icon:'🌳', skill:'qiaocai', note:'檿——即山桑，材韧可为弓（「厌木」合体）', py:'yǎn' }),
  XW('zs_lingshi','泠石','mineral',['zhongshan-12-14'],{ icon:'💧', skill:'caiyu', note:'泠石——石之清凉者', py:'líng shí' }),
  XW('zs_shiqing','石青','mineral',['zhongshan-12-03','zhongshan-12-06'],{ icon:'🔵', skill:'caiyu', note:'即青——石青颜料', py:'shí qīng' }),
  XW('zs_suanshi','痠石','mineral',['zhongshan-12-05'],{ icon:'🪨', skill:'caiyu', note:'痠石——味酸之石（一作「酸石」）', py:'suān shí' }),
  XW('zs_jigu2','鸡鼓','herb',['zhongshan-12-06'],{ icon:'🌾', skill:'caiyao', note:'鸡鼓——草名，实如鸡之嗉囊（与十一经「鸡榖」别）', py:'jī gǔ' }),
  XW('zs_jiancao','葌','herb',['zhongshan-12-07'],{ icon:'🌿', skill:'caiyao', note:'葌——即兰，香草', py:'jiān' }),
  XW('zs_miwu','蘪芜','herb',['zhongshan-12-07'],{ icon:'🌿', skill:'caiyao', note:'蘪芜——芎䓖之苗，香草', py:'mí wú' }),
  XW('zs_xiongqiong','芎䓖','herb',['zhongshan-12-07'],{ icon:'🌿', skill:'caiyao', note:'芎䓖——即川芎，根入药', py:'xiōng qióng' }),
  XW('zs_li2x','梨','fruit',['zhongshan-12-07'],{ icon:'🍐', skill:'qiaocai', note:'洞庭之山多梨——与「梨草」别', py:'lí' }),
);

// ---- 长尾产出自动派生 ----
// 世界数据里凡未手工定义的产出名称，按公式自动补成物品，保证每座山的
// 原文产出都真实可采（id 以 w_ 前缀区分于手工条目）。
(function deriveWorldItems(){
  const SKILL_BY_KEY = { wood:'qiaocai', mineral:'caiyu', water:'yu', herb:'caiyao', woodSpecial:'qiaocai', fruit:'qiaocai' };
  const TYPE_BY_KEY  = { wood:'wood', mineral:'mineral', water:'fish', herb:'herb', woodSpecial:'wood', fruit:'fruit' };
  const ICON_BY_KEY  = { wood:'🪵', mineral:'🪨', water:'🐟', herb:'🌿', woodSpecial:'🪸', fruit:'🍎' };
  const byName = {};
  for (const it of Object.values(Items)) byName[it.name] = it;
  for (const region of WORLD.regions){
    for (const node of region.nodes){
      for (const key in (node.yields||{})){
        const list = node.yields[key] || [];
        const entries = Array.isArray(list) ? list : [list];
        for (const e of entries){
          const raw = typeof e === 'string' ? e : (e && e.name);
          if (!raw || raw.indexOf('（') >= 0) continue;      // 带注文（如「玉（阳）」）取主名另匹配
          const base = raw.replace(/（.*?）/g,'').trim();
          if (!base || base === '万物无不有焉') continue;
          const skill = SKILL_BY_KEY[key];
          if (!skill) continue;
          let it = byName[base];
          if (it && it.skill === skill && it.nodes && !it.nodes.includes(node.id)){
            it.nodes.push(node.id);
            continue;
          }
          if (it) continue;                                   // 已存在（非同技能则跳过，避免污染）
          const lvl = autoLvl(node.id);
          it = { id:'w_'+base, name:base, type:TYPE_BY_KEY[key], icon:ICON_BY_KEY[key],
                 skill, node:node.id, nodes:[node.id], lvl, value:autoVal(lvl), xp:autoXp(lvl), auto:true };
          Items[it.id] = it; byName[base] = it;
        }
      }
    }
  }
})();

// ---- 工具 ----
addItem(
  I('shifu','石斧','tool', { equip:true, grade:'common', slot:'axe', axePower:4,  lvl:1,  value:20, icon:'🪓' }),
  I('jinfu','金斧','tool', { equip:true, grade:'fine', slot:'axe', axePower:9,  lvl:10, value:90, icon:'🪓' }),
  I('chijinfu','赤金斧','tool',{ equip:true, grade:'fine', slot:'axe', axePower:16, lvl:26, value:260, icon:'🪓' }),
  I('shikuo','石镐','tool',{ equip:true, grade:'common', slot:'pick', pickPower:4, lvl:1,  value:20, icon:'⛏️' }),
  I('jinkuo','金镐','tool',{ equip:true, grade:'fine', slot:'pick', pickPower:9, lvl:10, value:90, icon:'⛏️' }),
  I('chijinkuo','赤金镐','tool',{ equip:true, grade:'fine', slot:'pick', pickPower:16, lvl:26, value:260, icon:'⛏️' }),
  I('yuwang','渔网','tool',{ equip:true, grade:'common', slot:'net', netPower:4, lvl:1,  value:20, icon:'🕸️' }),
  I('siwang','丝网','tool',{ equip:true, grade:'fine', slot:'net', netPower:9, lvl:10, value:90, icon:'🕸️' }),
  I('luowang','罗罔','tool',{ equip:true, grade:'fine', slot:'net', netPower:16, lvl:26, value:260, icon:'🕸️', py:'luó wǎng' }),
);

// ---- 兵器（冶铸） ----
addItem(
  I('muge','木戈','weapon', { equip:true, grade:'common', weapon:true, dmg:5,  lvl:1,  value:30,  icon:'🔱', el:'木' }),
  I('shimao','石矛','weapon',{ equip:true, grade:'fine', weapon:true, dmg:9,  lvl:4,  value:70,  icon:'🔺', el:'土' }),
  I('jinjian','金剑','weapon',{ equip:true, grade:'fine', weapon:true, dmg:15, lvl:10, value:160, icon:'🗡️', el:'金' }),
  // 10 → 26 之间原本十六级只有一把金剑可换（v1.31.16 补）：赤金加梓木做矛，白金加梓木做戈。
  I('chijinmao','赤金矛','weapon',{ equip:true, grade:'fine', weapon:true, dmg:18, lvl:16, value:280, icon:'🔱', el:'金' }),
  I('baijinge','白金戈','weapon',{ equip:true, grade:'fine', weapon:true, dmg:22, lvl:21, value:360, icon:'⚔️', el:'金' }),
  I('chijinyue','赤金钺','weapon',{ equip:true, grade:'fine', weapon:true, dmg:26, lvl:26, value:400, icon:'🪓', el:'金' }),
  // 26 → 36 之间补一把铜钺：铜在西山首经（Lv23）即可采，26 级后正接得上。
  I('tongyue','铜钺','weapon',{ equip:true, grade:'fine', weapon:true, dmg:30, lvl:31, value:560, icon:'🪓', el:'金' }),
  I('baijinqi','白金戚','weapon',{ equip:true, grade:'fine', weapon:true, dmg:38, lvl:36, value:700, icon:'⚔️', el:'金' }),
  // 36 级到 55 级之间原本没有任何新兵器（下一把是凿齿矛，要 BOSS 之牙），
  // 甲胄 34→60、弓 26→58 同样断档近三十级。补一组 44 级过渡装，走寻常材料。
  I('bailianjian','百炼剑','weapon',{ equip:true, grade:'fine', weapon:true, dmg:46, lvl:44, value:760, icon:'⚔️', el:'金' }),
  I('xisihejia','犀兕合甲','armor',{ equip:true, grade:'fine', slot:'armor', def:15, lvl:44, value:640, icon:'🥋' }),
  I('sangzhegong','桑柘弓','bow',{ equip:true, grade:'fine', weapon:true, ranged:true, dmg:34, lvl:44, value:560, icon:'🏹', el:'木' }),
  // 31 → 58 之间原本二十四级只有一张弓（v1.31.18 补两档）：竹胎角弭、梓胎漆固，都是寻常材料
  I('jiaogong','角弓','bow', { equip:true, grade:'fine', weapon:true, ranged:true, dmg:29, lvl:37, value:460, icon:'🏹', el:'木' }),
  I('qigong','漆弓','bow',  { equip:true, grade:'fine', weapon:true, ranged:true, dmg:41, lvl:50, value:700, icon:'🏹', el:'木' }),
  I('zaochimao','凿齿矛','weapon',{ equip:true, grade:'rare', weapon:true, dmg:55, lvl:55, value:1600, icon:'🔱', el:'金', rarity:'RARE' }),
  // 55 → 72 之间十七级只有神兵（要打 BOSS）可换（v1.31.16 补）：铁为刃、炭为薪的寻常重器。
  I('tieyue','铁钺','weapon',{ equip:true, grade:'fine', weapon:true, dmg:58, lvl:62, value:1050, icon:'🪓', el:'金' }),
  I('fenghuiyue','封豨钺','weapon',{ equip:true, grade:'precious', weapon:true, dmg:85, lvl:76, value:3200, icon:'🪓', el:'水', rarity:'RARE', py:'fēng xī' }),
);
// ---- 弓矢（削羽） ----
addItem(
  I('mugong','木弓','bow',  { equip:true, grade:'common', weapon:true, ranged:true, dmg:6,  lvl:1,  value:40,  icon:'🏹', el:'木' }),
  I('sanggong','桑弓','bow',{ equip:true, grade:'fine', weapon:true, ranged:true, dmg:12, lvl:10, value:150, icon:'🏹', el:'木' }),
  // 削羽 10 → 26 也空着十六级（v1.31.16 补）：梓木（Lv13）做胎、绳为弦；铜弓接在赤金弓之前。
  I('zigong','梓弓','bow',  { equip:true, grade:'fine', weapon:true, ranged:true, dmg:16, lvl:16, value:260, icon:'🏹', el:'木' }),
  I('chijingong','赤金弓','bow',{ equip:true, grade:'fine', weapon:true, ranged:true, dmg:22, lvl:26, value:420, icon:'🏹', el:'金' }),
  I('tonggong','铜弓','bow',   { equip:true, grade:'fine', weapon:true, ranged:true, dmg:25, lvl:31, value:520, icon:'🏹', el:'金' }),
  I('dafenggong','大风弓','bow',{ equip:true, grade:'rare', weapon:true, ranged:true, dmg:45, lvl:58, value:1700, icon:'🏹', el:'木', rarity:'RARE' }),
  I('shizu','石镞矢','arrow',{ equip:true, grade:'common', slot:'quiver', dmg:2,  lvl:1,  value:6,  icon:'➶', el:'土' }),
  I('jinzu','金镞矢','arrow',{ equip:true, grade:'fine', slot:'quiver', dmg:4,  lvl:10, value:18, icon:'➶', el:'金' }),
  I('zizu','梓镞矢','arrow',{ equip:true, grade:'fine', slot:'quiver', dmg:5,  lvl:16, value:22, icon:'➶', el:'木' }),
  I('chijinzu','赤金镞矢','arrow',{ equip:true, grade:'fine', slot:'quiver', dmg:7, lvl:26, value:40, icon:'➶', el:'金' }),
  I('baijinzu','白金镞矢','arrow',{ equip:true, grade:'fine', slot:'quiver', dmg:10, lvl:36, value:80, icon:'➶', el:'金' }),
);
// ---- 甲胄（制器） ----
addItem(
  I('pijia','皮甲','armor', { equip:true, grade:'common', slot:'armor', def:6,  lvl:20, value:120, icon:'🥋' }),
  I('sijia','兕甲','armor', { equip:true, grade:'fine', slot:'armor', def:11, lvl:34, value:260, icon:'🥋', py:'sì' }),
  // 皮甲 20 → 兕甲 34 之间十四级（v1.31.18 补）：韦（熟皮）为甲，犀皮一张即可
  I('weijia','韦甲','armor', { equip:true, grade:'fine', slot:'armor', def:9, lvl:26, value:180, icon:'🥋' }),
  // 34 → 44 与 44 → 60 两段空白（v1.31.16 补）：犀皮、兕皮都是打猎常得，一路叠到重犀甲。
  I('xijia','犀甲','armor', { equip:true, grade:'fine', slot:'armor', def:13, lvl:39, value:420, icon:'🥋' }),
  I('zhongxijia','重犀甲','armor', { equip:true, grade:'fine', slot:'armor', def:17, lvl:52, value:760, icon:'🥋' }),
  I('yayujia','猰貐甲','armor',{ equip:true, grade:'rare', slot:'armor', def:22, lvl:60, value:900, icon:'🥋', rarity:'RARE', py:'yà yǔ' }),
);

// ---- 食物（调鼎 · 「食之X」句式） ----
addItem(
  I('jiagufan','嘉谷饭','food', { value:14, heal:70,  lvl:1,  icon:'🍚', edible:true }),
  I('zhishengrou','炙狌肉','food',{ value:26, heal:110, lvl:3, icon:'🍖', edible:true, buff:{ name:'善走', kind:'gather', gather:0.20, dur:120 }, effect:'食之善走', py:'shēng' }),
  I('daofan','稻米饭','food', { value:30, heal:130, lvl:5,  icon:'🍚', edible:true }),
  I('kaijiyu','炙鮆鱼','food',{ value:70, heal:220, lvl:30, icon:'🍣', edible:true, py:'jì' }),
  I('piluogeng','芘蠃羹','food',{ value:52, heal:120, lvl:13, icon:'🍲', edible:true, py:'pí luǒ' }),
  I('zhixipu','炙犀脯','food',{ value:150,heal:400, lvl:52, icon:'🍖', edible:true }),
  I('zhisipu','炙兕脯','food',{ value:200,heal:520, lvl:52, icon:'🍖', edible:true, py:'sì' }),
);

// ---- 药剂（炼药 · 「佩之X」句式） ----
addItem(
  I('bujisan','不饥散','potion',{ value:40, lvl:5,  icon:'🧪', buff:{ name:'不饥', kind:'gather', gather:0.25, dur:180 }, effect:'食之不饥' }),
  I('shanzousan','善走散','potion',{ value:60, lvl:10, icon:'🧪', buff:{ name:'善走', kind:'gather', gather:0.30, dur:180 }, effect:'食之善走' }),
  I('buhuosan','不惑散','potion',{ value:80, lvl:15, icon:'🧪', buff:{ name:'不惑', kind:'wise', dur:300 }, effect:'佩之不惑' }),
  I('buweisan','不畏散','potion',{ value:100,lvl:20, icon:'🧪', buff:{ name:'不畏', kind:'def', def:15, dur:240 }, effect:'佩之不畏' }),
  I('bulongsan','不聋散','potion',{ value:130,lvl:25, icon:'🧪', buff:{ name:'不聋', kind:'div', div:0.50, dur:240 }, effect:'佩之不聋' }),
  I('wozhousan','无卧散','potion',{ value:170,lvl:30, icon:'🧪', buff:{ name:'无卧', kind:'offline', offline:0.15, dur:300 }, effect:'食之无卧' }),
  I('xiushedangao','修蛇胆膏','potion',{ value:600,lvl:68, icon:'🫙', rarity:'RARE', buff:{ name:'蛇膏', kind:'all', dmg:0.30, def:20, dur:300 }, effect:'可以已痔' }),
  I('fenghuanggao','凤皇膏','potion',{ value:900,lvl:68, icon:'🫙', rarity:'LEGENDARY', buff:{ name:'凤膏', kind:'all', yield:0.25, dur:600 }, effect:'见则天下安宁' }),
  // 中山七神赐物（v1.31.23）：前三位给了专属护符，其余七位若只给祭品，
  // 谒见之间还是没有区别。这里给每神配一件「神赐小物」——都不改战力上限，
  // 只把「这一位神管什么」写成能用的东西。
  I('yaobi','瑶碧','mineral',{ value:130, lvl:70, icon:'💎', note:'瑶碧之玉，佩之蠲忿——青要之山其阳多玉', py:'yáo bì' }),
  I('honey','蜂蜜','potion',{ value:90, lvl:70, icon:'🍯', rarity:'RARE',
    buff:{ name:'蜜甘', kind:'gather', gather:0.20, dur:240 }, effect:'平逢之山实惟蜂蜜之庐' }),
  I('piaofengfu','飘风符','potion',{ value:220, lvl:71, icon:'🌬️', rarity:'RARE',
    buff:{ name:'飘风', kind:'all', dmg:0.15, dur:300 }, effect:'计蒙出入必有飘风暴雨' }),
  I('qibifu','启闭符','potion',{ value:240, lvl:73, icon:'🚪', rarity:'RARE',
    buff:{ name:'启闭', kind:'all', def:12, offline:0.10, dur:300 }, effect:'熊山之穴夏启而冬闭，冬启乃必有兵' }),
  I('shetui','蛇蜕','material',{ value:75, lvl:72, icon:'🐍', note:'夫夫之山神操两蛇——蜕可入药', py:'shé tuì' }),
  // 山海图卷（v1.31.32）：四系特产合刻一图。特产只在「走遍该系」后才有稳定来源，
  // 所以这张图是巡礼的兑现口——不是又一件可有可无的药。
  I('shanhaitujuan','山海图卷','potion',{ value:1500, lvl:72, icon:'📜', rarity:'LEGENDARY',
    buff:{ name:'窥山', kind:'all', yield:0.25, def:8, dur:900 }, effect:'览图知天下，所获皆丰', py:'shān hǎi tú juàn' }),
);

// ---------- 配方 ----------
const Recipes = [];
function R(type, out, qty, xp, lvl, cost){ Recipes.push({ type, out, qty, xp, lvl, cost }); }
// 燔燎：薪 → 炭 / 火种
R('burn','tan',2,10,1,[['guaimu',1]]);
R('burn','tan',2,16,4,[['yan',1]]);
R('burn','tan',2,40,20,[['zi',1]]);
R('burn','huozhong',1,24,8,[['tan',3],['zhuyu',1]]);
// 调鼎
R('cook','jiagufan',1,14,1,[['tu',2]]);
R('cook','zhishengrou',1,22,3,[['shengshengrou',1]]);
R('cook','daofan',1,30,5,[['dao',3]]);
// 5 → 28 之间空了二十三级（v1.31.13 补）：这段时间打怪掉的生肉只能生吃，
// 而熟食的回血是生肉的两倍多——「有肉不能做」比「没肉」更让人难受。
R('cook','zhichiru',1,36,12,[['chirurou',1]]);       // 赤鱬：食之不疥
R('cook','zhihujiao',1,60,20,[['hujiaorou',1]]);     // 虎蛟：食者不肿
R('cook','kaijiyu',1,90,30,[['jiyu',1]]);
R('cook','piluogeng',1,120,39,[['piluo',2],['tu',1]]);
R('cook','zhixipu',1,200,52,[['xirou',2]]);
R('cook','zhisipu',1,240,52,[['sirou',2]]);
// 冶铸
R('smith','muge',1,20,1,[['gui',1],['tan',1]]);
R('smith','shifu',1,16,6,[['shashi',2],['guaimu',1]]);
R('smith','shimao',1,40,7,[['shashi',2],['guaimu',1]]);
R('smith','shikuo',1,16,6,[['shashi',2],['guaimu',1]]);
R('smith','jinjian',1,90,10,[['jin',2],['tan',1]]);
R('smith','jinfu',1,80,10,[['jin',2],['tan',1]]);
R('smith','jinkuo',1,80,10,[['jin',2],['tan',1]]);
// 10 → 26 的十六级空白（v1.31.16 补）：赤金矛（16）、白金戈（21）
R('smith','chijinmao',1,120,16,[['chijin',2],['zi',1]]);
R('smith','baijinge',1,180,21,[['baijin',2],['zi',1]]);
R('smith','chijinyue',1,220,26,[['chijin',2],['tan',2]]);
R('smith','chijinfu',1,200,26,[['chijin',2],['tan',2]]);
R('smith','chijinkuo',1,200,26,[['chijin',2],['tan',2]]);
// 26 → 36 之间补铜钺（31）：铜在西山首经 Lv23 可采，不早于料、也不晚于需
R('smith','tongyue',1,300,31,[['tong',2],['tan',2]]);
R('smith','baijinqi',1,380,36,[['baijin',2],['tan',3]]);
R('smith','bailianjian',1,460,44,[['baijin',2],['tan',3]]);
R('craft','xisihejia',1,300,44,[['sipi',3],['jin',2]]);
R('fletch','sangzhegong',1,320,44,[['zi',2],['sheng',3]]);
R('smith','zaochimao',1,900,55,[['zaochiya',1],['baijin',2],['tan',3]]);
R('smith','tieyue',1,620,62,[['tie',2],['tan',3]]);
R('smith','fenghuiyue',1,2400,76,[['fenghuiya',1],['chijin',3],['tan',4]]);
// 削羽
R('fletch','mugong',1,20,1,[['guaimu',1],['sheng',1]]);
R('fletch','shizu',5,10,6,[['guaimu',1],['shashi',1]]);
R('fletch','sanggong',1,80,10,[['zi',1],['sheng',2]]);
R('fletch','jinzu',5,50,10,[['zi',1],['jin',1]]);
// 10 → 26 的空白（v1.31.16 补）：梓弓（16）、梓镞矢（16）
R('fletch','zigong',1,110,16,[['zi',2],['sheng',2]]);
R('fletch','zizu',5,60,16,[['zi',1],['chijin',1]]);
R('fletch','chijingong',1,240,26,[['chijin',2],['sheng',2]]);
R('fletch','chijinzu',5,160,26,[['chijin',1],['zi',1]]);
R('fletch','tonggong',1,290,31,[['tong',2],['zi',2]]);
R('fletch','jiaogong',1,330,37,[['zhu',2],['sheng',3]]);
R('fletch','qigong',1,360,50,[['zi',2],['zhu',1],['sheng',2]]);
R('fletch','baijinzu',5,260,36,[['baijin',1],['zi',1]]);
R('fletch','dafenggong',1,1200,58,[['dafengyu',1],['baijin',2],['sheng',3]]);
// 制器
R('craft','sheng',2,8,1,[['gui',2]]);
R('craft','yuwang',1,16,1,[['sheng',2],['guaimu',1]]);
R('craft','baijianxi',1,20,5,[['jian',2]]);
R('craft','pijia',1,120,20,[['xipi',1],['sheng',1]]);
R('craft','sijia',1,240,34,[['sipi',2],['sheng',2]]);
// 34 → 44 → 60 两段空白（v1.31.16 补）：犀甲（39）、重犀甲（52）
R('craft','xijia',1,280,39,[['xipi',2],['sheng',2]]);
R('craft','weijia',1,180,26,[['xipi',1],['sheng',2]]);
R('craft','zhongxijia',1,360,52,[['xipi',3],['sheng',2]]);
R('craft','yayujia',1,900,60,[['yayupi',3],['sheng',2],['xiangya',1]]);
R('craft','siwang',1,80,10,[['sheng',3],['jin',2]]);
R('craft','luowang',1,200,26,[['sheng',4],['nan',2]]);
// 琢玉
R('jade','zhang',1,40,5,[['yu',1]]);
R('jade','bi',1,80,6,[['yu',2]]);
R('jade','zhenwu',1,60,20,[['yu',2],['tan',3]]);   // 镇物：玉为体、炭为用
R('jade','migufu',1,90,5,[['migu',2],['yu',1]]);
R('jade','lushufu',1,140,10,[['lushupi',1],['yu',1]]);
R('jade','xuanguifu',1,150,10,[['xuanguijia',1],['yu',1]]);
R('jade','boyifu',1,180,15,[['boyipi',1],['yu',1]]);
R('jade','guanfu',1,200,15,[['guanguanyu',1],['yu',1]]);
// 炼药
R('herb','bujisan',1,40,5,[['zhuyu',1],['tu',1],['shuiping',1]]);
R('herb','shanzousan',1,70,10,[['shengshengrou',1],['zhuyu',1],['shuiping',1]]);
R('herb','buhuosan',1,110,15,[['guanguanyu',1],['zhuyu',1],['shuiping',1]]);
R('herb','buweisan',1,150,20,[['boyipi',1],['zhuyu',1],['shuiping',1]]);
R('herb','bulongsan',1,200,25,[['xuanguijia',1],['zhuyu',1],['shuiping',1]]);
R('herb','wozhousan',1,260,30,[['yuyu',1],['zhuyu',1],['shuiping',1]]);
R('herb','xiushedangao',1,1100,68,[['xiushedan',1],['zhuyu',2],['shuiping',1]]);
R('herb','fenghuanggao',1,1300,68,[['fenghuangyu',1],['baijiu',1],['zhuyu',2]]);
// 祭祀（祠礼配方）
R('rite','rite_ns1',1,400,5,[['zhang',1],['tu',1],['bi',1],['dao',1],['jian',1]]);
R('rite','rite_ns2',1,500,10,[['bi',1],['tu',1]]);
R('rite','rite_ns3',1,700,21,[['baiquan',1],['tu',1]]);
R('rite','rite_chang',1,120,1,[['tu',1]]);   // 常祭：随时可行的薄祭，祭祀经验的稳定来源
// 西山四套祠礼（南山三系 + 西山四系 = 七套，祭法各异）
R('rite','rite_xs1',1,600,30,[['niu',1],['yang',1],['shi',1]]);                          // 西山首经·华山：太牢
R('rite','rite_yu',1,3000,30,[['xi',100],['yu2',100],['jiu',100],['guiyu',100],['bi',100]]); // 羭山神：斋百日，百牺百瑜百樽百珪百璧
R('rite','rite_xs2a',1,500,33,[['yang',1],['shi',1]]);                                    // 西次二经·飞兽之神：少牢，白菅为席
R('rite','rite_xs2b',1,300,33,[['xiongji',1]]);                                           // 西次二经·十辈神：毛一雄鸡，钤而不糈
R('rite','rite_xs3',1,700,37,[['jiyu2',1],['ji',1]]);                                      // 西次三经：一吉玉瘗，糈用稷米
R('rite','rite_xs4',1,800,42,[['baiji',1],['dao',1],['jian',1]]);                         // 西次四经：一白鸡祈，糈以稻米，白菅为席
// 北山三套祠礼（南山三系 + 西山四系 + 北山三系 = 十套 + 常祭，祭法各异）
// 北次一经：瘗（雄鸡+玉+稌）；北次二经：投（雄鸡+璧+玉）；北次三经：三种各异（玉瘗 / 玉不瘗 / 璧瘗）
R('rite','rite_bs1',1,800,46,[['xiongji',1],['yu',1],['tu',1]]);                            // 北次一经：人面蛇身，瘗而不糈
R('rite','rite_bs2',1,820,50,[['xiongji',1],['bi',1],['yu',1]]);                            // 北次二经：蛇身人面，投而不糈
R('rite','rite_bs3',1,850,53,[['yu',1],['bi',1],['tu',1]]);                                   // 北次三经：神祇各异（廿神藻茝瘗／十四神玉不瘗／十神璧瘗），综合以玉+璧+糈
// 东山三套祠礼（终末章·荒经水路；东次四经无神无礼）
R('rite','rite_ds1',1,850,60,[['baiquan',1],['yupei',1]]);   // 东山首经·人身龙首之神：毛用一犬祈，䎶用鱼（鱼牲以水族育沛当之）
R('rite','rite_ds2',1,870,63,[['xiongji',1],['bi',1]]);      // 东次二经·兽身人面载觡之神：毛用一鸡祈，婴用一璧瘗
R('rite','rite_ds3',1,900,67,[['yang',1],['shu',1]]);        // 东次三经·人身羊角之神：用一牡羊，米用黍
// 中山三套祠礼（帝之密都·全书收卷；2026-10-24 首录三系）
// 中次一经：历儿为冢用太牢之具、县婴以吉玉，其余十三山一羊+藻珪瘗而不糈——综合以羊+玉
R('rite','rite_zs1',1,920,69,[['yang',1],['yu',1]]);
// 中次二经：其神皆人面而鸟身——祠用毛，用一吉玉，投而不糈
R('rite','rite_zs2',1,940,71,[['yu',1]]);
// 中次三经：帝之密都群神——太逢/熏池/武罗皆一牡羊，副婴用吉玉；其二神用一雄鸡，瘗之，糈用稌
R('rite','rite_zs3',1,960,73,[['yang',1],['yu',1],['tu',1]]);
R('rite','rite_zs4',1,980,75,[['baiji',1],['caiyi',1]]);                              // 中次四经：人面兽身之神，毛用一白鸡，祈而不糈，以彩衣之
// 中次五经：升山冢也，其祠礼太牢，婴用吉玉；首山䰠祭以稌黑牺璧，尸水合天祭肥牲献血——综合以太牢+吉玉
R('rite','rite_zs5',1,1000,75,[['niu',1],['yang',1],['shi',1],['jiyu2',1]]);
// 中次六经：平逢之山骄虫「用一雄鸡，禳而勿杀」；岳在其中，以六月祭之，如诸岳之祠法——鸡禳而全生，玉以礼岳
R('rite','rite_zs6',1,1020,75,[['xiongji',1],['jiyu2',1]]);
// 中次七经：十六神皆豕身人面——毛牷用一羊羞，婴用一藻玉瘗；苦山/少室/太室为冢，太牢之具、婴以吉玉
R('rite','rite_zs7',1,1040,76,[['yang',1],['zaoyu',1]]);
// 中次八经：山神皆鸟身人面——其祠用一雄鸡祈瘗，用一藻圭，糈用稌；骄山冢也，用羞酒少牢祈瘗，婴毛一璧
R('jade','zs_zaogui',1,320,74,[['zaoyu',1],['yu',1]]);   // 藻玉 + 玉 → 藻圭（荆山诸神祠礼所婴）
R('rite','rite_zs8',1,1060,77,[['xiongji',1],['zs_zaogui',1],['tu',2]]);
// 中次九经：山神皆马身龙首——其祠毛用一雄鸡瘗，糈用稌；文山/勾檷/风雨/騩为冢，羞酒少牢具，婴毛一吉玉；熊山席也，太牢一璧
R('rite','rite_zs9',1,1080,78,[['xiongji',1],['jiyu2',1],['tu',1]]);
// 中次十经：山神皆龙身人面——其祠毛用一雄鸡瘗，糈用五种之糈（稌黍稻稷粱五种米）
R('rite','rite_zs10',1,1100,78,[['xiongji',1],['tu',1],['shu',1],['dao',1]]);
// 中次十一经：山神皆彘身人首——其祠毛用一雄鸡祈瘗，用一珪，糈用五种之精
R('rite','rite_zs11',1,1120,79,[['xiongji',1],['guiyu',1],['tu',1],['shu',1]]);   // 「用一珪」——珪（guiyu），非「桂」（gui）
// 中次十二经：山神皆鸟身而龙首——其祠毛用一雄鸡、一牝豚刏，糈用稌；夫夫/即公/尧/阳帝为冢，洞庭/荣余为神
R('rite','rite_zs12',1,1140,80,[['xiongji',1],['zs_mutun',1],['tu',1]]);

// ---- 西山制作链 ----
// 琢玉：祠器与玉符
R('jade','jiyu2',1,200,32,[['yu',2]]);
R('jade','guiyu',1,160,28,[['yu',1]]);
R('jade','yu2',1,240,28,[['meiyu',2]]);
R('jade','wenyaofu',1,320,68,[['wenyaoyi',1],['yu',2]]);      // 佩之天下大穰
R('jade','danghufu',1,300,68,[['danghuran',1],['yu',2]]);     // 食之不眴目
// 中段护符（v1.31.13）：护符一共七枚，全挤在 5–15 与 68 两段，中间五十级没有一件可佩。
// 玉石倒是一直在采（琅玕 33、㻬琈 35、水碧 52），采上来只能卖——这三枚把两头接上。
R('jade','yaobifu',1,260,34,[['yao',1],['yu',2]]);          // 瑶碧符：佩之益学
// 山海图卷：四系特产各一 + 玉二。特产的稳定来源是「该系巡礼后采集 1%」，
// 所以这配方天然要求玩家先走遍几系，而不是有贝就能买。
R('jade','shanhaitujuan',1,1200,72,[['migu',1],['yushi',1],['langgan',1],['zs_guicao',1],['yu',2]]);
// 第二条路线（炼药）：另四系的特产。两条配方产出同一件图卷、各自消耗不同四系——
// 玩家不必为了做一张图被迫走遍特定四系，走遍哪一片都有路。
R('herb','shanhaitujuan',1,1200,72,[['w_三桑',1],['w_茈羸',1],['zs_xuncao',1],['zs_guaishi',1],['jian',2]]);
R('jade','xuanjifu',1,340,45,[['w_㻬琈之玉',1],['yu',2]]);    // 璇玑符：佩之善采
R('jade','shuibifu',1,420,57,[['w_水碧',1],['yu',2]]);        // 水碧符：佩之御患
// 冶铸：西山兵刃
R('smith','cangyuyue',1,420,72,[['cangyu',2],['tan',3]]);
R('smith','langganjian',1,480,74,[['jin',2],['langgan',1],['tan',3]]);
// 削羽：西山弓矢
R('fletch','yuzhanggong',1,300,70,[['yuzhang',2],['sheng',3]]);
R('fletch','tongzu',5,180,66,[['zhu',1],['tong',1]]);
R('fletch','tiezu',5,260,72,[['zhu',1],['tie',1]]);
// 制器：西山甲胄
R('craft','baihujia',1,420,72,[['baihupi',2],['sheng',2]]);
// 调鼎：西山食物与酒
R('cook','shatangshi',1,150,66,[['shatang',1]]);
R('cook','jiu',1,60,28,[['ji',3]]);
// 炼药：西山药剂
R('herb','shilaisan',1,220,66,[['pingcao',1],['zhuyu',1],['shuiping',1]]);
R('herb','yinaosan',1,260,68,[['xiongqiong',1],['zhuyu',2],['shuiping',1]]);
R('herb','yushuisan',1,300,70,[['shatang',1],['shuiping',1]]);
// 中段四味 + 一味（v1.31.13）：把 30 → 66 的空白填成 8 级一档
R('herb','xingshensan',1,320,33,[['mao',2],['zhuyu',2],['shuiping',1]]);
R('herb','qingshensan',1,400,41,[['hui',2],['bili',2],['shuiping',1]]);
R('herb','gubensan',1,480,49,[['duheng',2],['xiongqiong',1],['shuiping',1]]);
R('herb','jiushisan',1,560,57,[['pingcao',2],['zicao',2],['shuiping',1]]);
R('herb','wangyousan',1,620,62,[['zs_guicao',1],['zs_rongcao',1],['shuiping',1]]);

// 祠礼产物（虚拟物品：执行后给区域增益）
addItem(
  I('rite_ns1','首经祠礼','rite', { value:0, icon:'🕯️', note:'鸟身龙首之神：毛用一璋玉瘗，糈用稌米，一璧，稻米、白菅为席' }),
  I('rite_chang','常祭','rite', { value:0, icon:'🕯️', note:'以稌米薄祭山川——随时可行的常礼' }),
  I('rite_ns2','二经祠礼','rite', { value:0, icon:'🕯️', note:'龙身鸟首之神：毛用一璧瘗，糈用稌' }),
  I('rite_ns3','三经祠礼','rite', { value:0, icon:'🕯️', note:'龙身人面之神：用一白狗祈，糈用稌' }),
  I('rite_xs1','华山太牢','rite', { value:0, icon:'🕯️', note:'华山，冢也，其祠之礼：太牢（牛羊豕）' }),
  I('rite_yu','羭山百牲斋','rite', { value:0, icon:'🕯️', note:'羭山，神也，祠之用烛，斋百日以百牺，瘗用百瑜，汤其酒百樽，婴以百珪百璧' }),
  I('rite_xs2a','飞兽少牢','rite', { value:0, icon:'🕯️', note:'西次二经飞兽之神：毛用少牢，白菅为席' }),
  I('rite_xs2b','十辈雄鸡','rite', { value:0, icon:'🕯️', note:'西次二经十辈神：毛一雄鸡，钤而不糈' }),
  I('rite_xs3','吉玉稷米','rite', { value:0, icon:'🕯️', note:'西次三经羊身人面之神：用一吉玉瘗，糈用稷米' }),
  I('rite_xs4','白鸡祈','rite', { value:0, icon:'🕯️', note:'西次四经：用一白鸡祈，糈以稻米，白菅为席' }),
  // 北山三套祠礼（祠器虚拟物）
  I('rite_bs1','北次一·瘗礼','rite', { value:0, icon:'🕯️', note:'人面蛇身之神：毛用一雄鸡、彘瘗，吉玉用一珪，瘗而不糈' }),
  I('rite_bs2','北次二·投礼','rite', { value:0, icon:'🕯️', note:'蛇身人面之神：毛用一雄鸡、彘瘗，一璧一珪，投而不糈' }),
  I('rite_bs3','北次三·神祇礼','rite',{ value:0, icon:'🕯️', note:'北次三经神祇各异：廿神一藻茝瘗／十四神皆玉不瘗／十神皆用一璧瘗' }),
  // 东山三套祠礼（终末章；东次四经「无神之域」故不入）
  // ⚠️ 这三条物品曾漏定义：配方与 RITES 都在，唯独 Items 无对应项，
  // 结果制作/行祭时 `Items[out].name` 抛 TypeError——材料已扣、界面中断。
  I('rite_ds1','犬祈鱼䎶','rite',{ value:0, icon:'🕯️', note:'东山首经·人身龙首之神：毛用一犬祈，䎶用鱼（以鱼血涂祭器）' }),
  I('rite_ds2','鸡祈璧瘗','rite',{ value:0, icon:'🕯️', note:'东次二经·兽身人面载觡之神：毛用一鸡祈，婴用一璧瘗' }),
  I('rite_ds3','牡羊黍米','rite',{ value:0, icon:'🕯️', note:'东次三经·人身羊角之神：用一牡羊，米用黍——是神见则风雨水为败' }),
  I('rite_zs1','太牢吉玉','rite',{ value:0, icon:'🕯️', note:'中次一经·薄山十五山神：历儿为冢，毛用太牢之具，县婴以吉玉；其余十三者，毛用一羊，县婴用藻珪，瘗而不糈' }),
  I('rite_zs2','吉玉投水','rite',{ value:0, icon:'🕯️', note:'中次二经·人面鸟身之神：祠用毛，用一吉玉，投而不糈' }),
  I('rite_zs3','牡羊雄鸡','rite',{ value:0, icon:'🕯️', note:'中次三经·帝之密都群神：太逢、熏池、武罗皆一牡羊，副婴用吉玉；其二神用一雄鸡，瘞之，糈用稌' }),
  I('rite_zs4','白鸡彩衣','rite',{ value:0, icon:'🕯️', note:'中次四经·厘山九山神（人面兽身）：毛用一白鸡，祈而不糈，以彩衣之' }),
  I('rite_zs5','肥牲吉玉','rite',{ value:0, icon:'🕯️', note:'中次五经·薄山山神：升山冢也，其祠礼太牢，婴用吉玉；首山䰠也，其祠用稌、黑牺、太牢之具、蘗酿，干舞，置鼓，婴用一璧；尸水合天也，肥牲祠之，用一黑犬于上，用一雌鸡于下，刉一牝羊，献血，婴用吉玉，采之，飨之' }),
  I('rite_zs6','雄鸡禳祭','rite',{ value:0, icon:'🕯️', note:'中次六经·缟羝山十四山神：平逢之山有神焉，其状如人而二首，名曰骄虫，是为螫虫，实惟蜂蜜之庐——其祠之：用一雄鸡，禳而勿杀；岳在其中，以六月祭之，如诸岳之祠法，则天下安宁' }),
  I('rite_zs7','羊羞藻玉','rite',{ value:0, icon:'🕯️', note:'中次七经·苦山十九山神：其十六神者皆豕身而人面，其祠毛牷用一羊羞，婴用一藻玉瘗；苦山、少室、太室皆冢也，其祠之太牢之具，婴以吉玉——其神状皆人面而三首，其余属皆豕身人面' }),
  I('rite_zs8','雄鸡藻圭','rite',{ value:0, icon:'🕯️', note:'中次八经·荆山二十三山神：其神状皆鸟身而人面，其祠用一雄鸡祈瘗，用一藻圭，糈用稌；骄山冢也，其祠用羞酒少牢祈瘗，婴毛一璧' }),
  I('rite_zs9','雄鸡吉玉','rite',{ value:0, icon:'🕯️', note:'中次九经·岷山十六山神：其神状皆马身而龙首，其祠毛用一雄鸡瘗，糈用稌；文山、勾檷、风雨、騩之山皆冢也，其祠羞酒少牢具，婴毛一吉玉；熊山席也，其祠羞酒太牢具，婴毛一璧，干舞用兵以禳，祈璆冕舞' }),
  I('rite_zs10','雄鸡五种','rite',{ value:0, icon:'🕯️', note:'中次十经·首阳九山神：其神状皆龙身而人面，其祠毛用一雄鸡瘗，糈用五种之糈（黍稻稷麦粱）。末句另有「堵山冢也，少牢具，羞酒祠，婴毛一璧瘗；騩山帝也，羞酒太牢具，合巫祝二人舞，婴一璧」——二山不在本经正文，存疑照录' }),
  I('zs_mutun','牝豚','rite',{ value:70, icon:'🐖', note:'牝豚——母猪，中次十二经祠礼「一雄鸡、一牝豚刏」（取血祭）' }),
  I('rite_zs11','雄鸡珪糈','rite',{ value:0, icon:'🕯️', note:'中次十一经·荆山四十八山神：其神状皆彘身人首，其祠毛用一雄鸡祈瘗，用一珪，糈用五种之精。末句另有「禾山帝也，太牢之具，羞瘗倒毛，用一璧，牛无常；堵山、玉山冢也，皆倒祠，羞毛少牢，婴毛吉玉」——三山不在本经正文，存疑照录' }),
  I('rite_zs12','雄鸡牝豚','rite',{ value:0, icon:'🕯️', note:'中次十二经·洞庭十五山神：其神状皆鸟身而龙首，其祠毛用一雄鸡、一牝豚刏，糈用稌。夫夫、即公、尧、阳帝四山皆冢也，皆肆瘗，祈用酒，毛用少牢，婴用一吉玉；洞庭、荣余山神也，皆肆瘗，祈酒太牢祠，婴用圭璧十五，五彩惠之' }),
  I('caiyi','彩衣','rite',{ value:60, icon:'🎀', note:'中次四经祠礼「以彩衣之」——彩衣供奉' }),
);
// ---- 西山新制成品 ----
addItem(
  I('shatangshi','沙棠实','food', { value:90, heal:300, lvl:66, icon:'🍑', edible:true, effect:'可以御水，食之不溺' }),
  I('cangyuyue','苍玉钺','weapon',{ equip:true, grade:'precious', weapon:true, dmg:80, lvl:72, value:1400, icon:'🪓', el:'金', rarity:'RARE' }),
  I('langganjian','琅玕剑','weapon',{ equip:true, grade:'fine', weapon:true, dmg:70, lvl:74, value:1700, icon:'🗡️', el:'水', rarity:'RARE', py:'láng gān' }),
  I('yuzhanggong','豫章弓','bow',{ equip:true, grade:'rare', weapon:true, ranged:true, dmg:52, lvl:70, value:1200, icon:'🏹', el:'木', rarity:'RARE' }),
  // ---- 神兵 ----
  // 六凶与刑天各遗一件。不可锻造，只有 6% 的掉落——它是「打得过那位」的凭证。
  // 每件带一条普通装备没有的特性（破甲 / 饮血 / 疾风 / 裂甲）。
  I('zaochiren','凿齿獠牙','weapon',{ equip:true, grade:'divine', weapon:true, dmg:62, lvl:40, value:2600, icon:'🗡️', el:'金',
    rarity:'LEGENDARY', divine:'pierce', note:'凿齿之牙磨成，长三尺，破坚如朽' }),
  I('jiuyingren','九婴血刃','weapon',{ equip:true, grade:'divine', weapon:true, dmg:72, lvl:50, value:3400, icon:'🗡️', el:'水',
    rarity:'LEGENDARY', divine:'drink', note:'九首之血淬刃，斫人自饮其血' }),
  I('dafengyugong','大风羽弓','bow',{ equip:true, grade:'divine', weapon:true, ranged:true, dmg:60, lvl:58, value:3600, icon:'🏹', el:'木',
    rarity:'LEGENDARY', divine:'swift', note:'以大风之羽为弦，发则风随' }),
  I('yayuzhua','猰貐魔爪','weapon',{ equip:true, grade:'divine', weapon:true, dmg:82, lvl:64, value:4600, icon:'🗡️', el:'土',
    rarity:'LEGENDARY', divine:'crit', note:'猰貐爪所铸，触之裂甲' }),
  I('xiushebian','修蛇脊鞭','weapon',{ equip:true, grade:'divine', weapon:true, dmg:90, lvl:70, value:5600, icon:'🗡️', el:'水',
    rarity:'LEGENDARY', divine:'drink', note:'修蛇之脊，一节一饮' }),
  I('fenghuifu','封豨重斧','weapon',{ equip:true, grade:'divine', weapon:true, dmg:100, lvl:76, value:6800, icon:'🪓', el:'水',
    rarity:'LEGENDARY', divine:'pierce', note:'封豨之牙为刃，重而能断' }),
  I('ganqi','干戚','weapon',{ equip:true, grade:'divine', weapon:true, dmg:118, lvl:81, value:12000, icon:'🪓', el:'金',
    rarity:'LEGENDARY', divine:'crit', note:'刑天操干戚以舞——以乳为目，以脐为口，战而不屈' }),
  // 三尊守关神（v1.31.18 补）：此前六凶与刑天各有遗物，唯独西次三经的三位守关者没有。
  // 它们不是「六凶」，却是全书最后一段路的三道门——打得过它们，该有凭证。
  I('jiubuhuyue','九部虎钺','weapon',{ equip:true, grade:'divine', weapon:true, dmg:80, lvl:56, value:3800, icon:'🪓', el:'金',
    rarity:'LEGENDARY', divine:'swift', note:'陆吾司天之九部，钺成九尾之形——持之者疾' }),
  I('yusheng','玉胜','weapon',{ equip:true, grade:'divine', weapon:true, dmg:85, lvl:59, value:4200, icon:'🗡️', el:'金',
    rarity:'LEGENDARY', divine:'behead', note:'西王母蓬发戴胜，胜以玉为骨——司天之厉及五残' }),
  I('hundunyu','浑敦羽弓','bow',{ equip:true, grade:'divine', weapon:true, ranged:true, dmg:72, lvl:61, value:4500, icon:'🏹', el:'土',
    rarity:'LEGENDARY', divine:'chaos', note:'帝江六足四翼，浑敦无面目——其羽为弦，不落五行' }),
  I('tongzu','铜镞矢','arrow',{ equip:true, grade:'rare', slot:'quiver', dmg:16, lvl:66, value:60, icon:'➶', el:'金' }),
  I('tiezu','铁镞矢','arrow',{ equip:true, grade:'rare', slot:'quiver', dmg:17, lvl:72, value:110, icon:'➶', el:'金' }),
  I('baihujia','白虎甲','armor',{ equip:true, grade:'precious', slot:'armor', def:29, lvl:72, value:1500, icon:'🥋', rarity:'RARE' }),
  I('wenyaofu','文鳐符','charm',{ value:260, lvl:68, icon:'🪸', equip:true, grade:'precious', slot:'charm', effect:'佩之天下大穰', yieldBonus:0.15, reqRecord:{ id:'wenyaoyu', tier:3 } }),
  I('danghufu','当扈符','charm',{ value:240, lvl:68, icon:'🪸', equip:true, grade:'precious', slot:'charm', effect:'食之不眴目', xpBonus:0.10, reqRecord:{ id:'danghu', tier:3 }, py:'dāng hù' }),
  I('yaobifu','瑶碧符','charm',{ value:200, lvl:34, icon:'🪸', equip:true, grade:'fine', slot:'charm', effect:'瑶碧为佩，学而不厌', xpBonus:0.08, py:'yáo bì fú' }),
  I('xuanjifu','璇玑符','charm',{ value:260, lvl:45, icon:'🪸', equip:true, grade:'fine', slot:'charm', effect:'璇玑之玉，所在必获', gatherBonus:0.10, py:'xuán jī fú' }),
  I('shuibifu','水碧符','charm',{ value:340, lvl:57, icon:'🪸', equip:true, grade:'rare', slot:'charm', effect:'水碧为佩，可以御患', defBonus:6, py:'shuǐ bì fú' }),
  // 中山三神赐（v1.31.20）：初谒专属异宝，全游戏唯一来源、无配方不可合成。
  // 泰逢——中次三经和山之神，虎尾出入有光：佩之修学不辍（xp）
  I('zs_taifeng_huang','泰逢璜','charm',{ value:320, lvl:70, icon:'🟡', equip:true, grade:'precious', slot:'charm',
    effect:'出入有光，佩之修学不辍', xpBonus:0.08, py:'tài féng huáng',
    note:'和山之神泰逢初谒所赐——其状如人而虎尾，好居于萯山之阳，出入有光' }),
  // 耕父——中次八经丰山之神，常游清泠之渊：佩之所获必丰（yield）
  I('zs_fengshan_light','丰山之光','charm',{ value:360, lvl:71, icon:'🔆', equip:true, grade:'precious', slot:'charm',
    effect:'出入有光，佩之所获必丰', yieldBonus:0.12, py:'fēng shān zhī guāng',
    note:'丰山神耕父初谒所赐——常游清泠之渊，出入有光；其神见则其国为败，佩其光者反得其丰' }),
  // 帝之二女——中次十二经洞庭之神，出入必以飘风暴雨：佩之得风雨之势（dmg）
  I('zs_ernv_pei','帝女之珮','charm',{ value:400, lvl:73, icon:'🌀', equip:true, grade:'precious', slot:'charm',
    effect:'出入必以飘风暴雨，佩之得风雨之势', dmgBonus:0.08, py:'dì nǚ zhī pèi',
    note:'洞庭之山帝之二女初谒所赐——常游于江渊，出入必以飘风暴雨' }),
  I('zhichiru','炙赤鱬','food',{ value:45, heal:90, icon:'🐟', edible:true, effect:'食之不疥', py:'zhì chì rú' }),
  I('zhihujiao','炙虎蛟','food',{ value:70, heal:150, icon:'🐟', edible:true, effect:'食者不肿，可以已痔', py:'zhì hǔ jiāo' }),
  I('shilaisan','释劳散','potion',{ value:200, lvl:66, icon:'🧪', buff:{ name:'释劳', kind:'gather', gather:0.35, dur:240 }, effect:'食之已劳' }),
  I('yinaosan','益脑散','potion',{ value:240, lvl:68, icon:'🧪', buff:{ name:'益脑', kind:'xp', xpBonus:0.20, dur:300 }, effect:'芎藭之草' }),
  I('yushuisan','御水散','potion',{ value:280, lvl:70, icon:'🧪', buff:{ name:'御水', kind:'def', def:25, dur:300 }, effect:'可以御水' }),
  // 中段补的四味（v1.31.13）：原先合药从 30 级直接跳到 66，中间三十多级没有新方子，
  // 技能升到 35 就会发现「能采的药草越来越多，能配的药一个没有」。
  I('xingshensan','醒神散','potion',{ value:200, lvl:33, icon:'🧪', buff:{ name:'醒神', kind:'xp', xpBonus:0.15, dur:300 }, effect:'茆与祝余，食之不眯' }),
  I('qingshensan','轻身散','potion',{ value:240, lvl:41, icon:'🧪', buff:{ name:'轻身', kind:'div', div:0.4, dur:240 }, effect:'蕙草之属，服之身轻' }),
  I('gubensan','固本散','potion',{ value:270, lvl:49, icon:'🧪', buff:{ name:'固本', kind:'def', def:18, dur:300 }, effect:'杜衡与芎藭，可以为固' }),
  I('jiushisan','久视散','potion',{ value:300, lvl:57, icon:'🧪', buff:{ name:'久视', kind:'gather', gather:0.32, dur:300 }, effect:'薲草茈草，服之不忘' }),
  I('wangyousan','忘忧散','potion',{ value:320, lvl:62, icon:'🧪', buff:{ name:'忘忧', kind:'offline', offline:0.18, dur:300 }, effect:'鬼草，服之不忧' }),
);

// ================= 北山经产出物 =================
// 世界数据已并入 WORLD（bandMap 重排后北山节点等次 63–81）。
// 北山与南山/西山大量共享同名材料（松、柏、玉、铜、韭、桃…）。
// 共享材料不新建 id（避免同名双 id），而是把北山产地并入既有物品的 nodes（见下方 MERGE）；
// 此处只新增北山「独有」产出（异兽伴生水族、北山特有灵木等）。
addItem(
  // —— 北山独有灵木（樵采）——
  XW('bs_ju','椐','wood',['beishan-1-06'],{ icon:'🪵', skill:'qiaocai', py:'jū' }),
  // —— 北山独有水族（渔）——
  XW('bs_huayu','滑鱼','fish',['beishan-1-02'],{ icon:'🐟', skill:'yu', effect:'食之已疣', py:'huá' }),
  XW('bs_shuima','水马','fish',['beishan-1-02'],{ icon:'🐎', skill:'yu', note:'文臂牛尾' }),
  XW('bs_xiyu','鳛鳛之鱼','fish',['beishan-1-05'],{ icon:'🐟', skill:'yu', effect:'可以御火，食之不瘅', note:'十翼，鳞皆在羽端' }),
  XW('bs_heluoyu','何罗鱼','fish',['beishan-1-04'],{ icon:'🐟', skill:'yu', effect:'食之已痈', note:'一首而十身' }),
  XW('bs_zaoyu','䲃鱼','fish',['beishan-1-19'],{ icon:'🐟', skill:'yu', effect:'食之已疣', py:'zǎo' }),
  XW('bs_puyuyu','蒲夷之鱼','fish',['beishan-3-44'],{ icon:'🐟', skill:'yu', py:'pú yí' }),
  XW('bs_shiyu','师鱼','fish',['beishan-3-41'],{ icon:'🐟', skill:'yu', effect:'食之杀人', hazard:true, note:'食之杀人——风险收益' }),
);
// 跨章共享材料：把北山产地并入既有物品（避免同名双 id，也使北山可采共享物）
(function mergeBeishanNodes(){
  const SHARED = {
    '机木':['beishan-1-01'], '柘木':['beishan-1-13','beishan-3-22'], '松':['beishan-1-05','beishan-2-08'],
    '柏':['beishan-1-05','beishan-2-08'], '漆':['beishan-1-06'], '棕':['beishan-1-17','beishan-3-37'],
    '桐':['beishan-1-06'], '栒':['beishan-3-27'], '三桑':['beishan-2-15'],
    '文石':['beishan-1-01','beishan-3-35'], '铜':['beishan-1-02','beishan-2-03'], '铁':['beishan-1-06','beishan-3-30','beishan-3-32','beishan-3-34'],
    '青碧':['beishan-1-04','beishan-2-04'], '碧':['beishan-2-11','beishan-3-31'], '瑶':['beishan-2-15','beishan-3-41'],
    '美玉':['beishan-2-07','beishan-3-25'], '白玉':['beishan-2-05','zhongshan-8-05','zhongshan-9-07','zhongshan-9-13'], '青雄黄':['beishan-1-04'],
    '砥':['beishan-1-13','beishan-3-24'], '磁石':['beishan-1-13'], '丹雘':['beishan-1-08'],
    '华草':['beishan-1-01'], '韭':['beishan-1-10','beishan-1-22'], '薤':['beishan-1-08'], '葱':['beishan-1-10','beishan-1-22'],
    '茈草':['beishan-1-17','beishan-3-04'], '芍药':['beishan-3-27'], '芎藭':['beishan-3-27'], '秦椒':['beishan-3-10'], '藷藇':['beishan-3-10'],
    '桃':['beishan-1-10'], '李':['beishan-1-10'], '鮆鱼':['beishan-2-03'], '赤鲑':['beishan-1-17'],
  };
  for (const [name, nodes] of Object.entries(SHARED)){
    const it = Object.values(Items).find(i=>i.name===name);
    if (!it) continue;
    it.nodes = it.nodes || (it.node ? [it.node] : []);
    nodes.forEach(n=>{ if (!it.nodes.includes(n)) it.nodes.push(n); });
    it.node = it.nodes[0];
  }
})();


// 跨章共享材料：中山经首录三系产地并入既有物品（避免同名双 id）
(function mergeZhongshanNodes(){
  const SHARED = {
    '杻木':['zhongshan-1-01'], '橿':['zhongshan-1-02'], '竹':['zhongshan-1-03','zhongshan-2-09','zhongshan-8-02','zhongshan-8-12','zhongshan-8-22','zhongshan-11-18','zhongshan-12-06'],
    '赤铜':['zhongshan-1-05','zhongshan-1-09','zhongshan-1-15','zhongshan-2-06'],
    '铁':['zhongshan-1-05','zhongshan-1-08'], '砺石':['zhongshan-1-14'], '文石':['zhongshan-1-14'],
    '金':['zhongshan-2-02','zhongshan-2-03','zhongshan-2-04','zhongshan-2-07','zhongshan-2-09','zhongshan-3-04'],
    '玉':['zhongshan-2-02','zhongshan-2-03','zhongshan-2-04','zhongshan-2-07','zhongshan-2-09','zhongshan-3-04'],
    '砥砺':['zhongshan-2-02'], '桑':['zhongshan-2-01'], '美枣':['zhongshan-3-03'],
    '赭':['zhongshan-3-01'], '黄金':['zhongshan-3-01','zhongshan-8-02','zhongshan-8-04','zhongshan-9-03','zhongshan-9-06','zhongshan-9-10','zhongshan-10-05','zhongshan-11-42','zhongshan-12-01','zhongshan-12-02','zhongshan-12-03','zhongshan-12-04','zhongshan-12-06','zhongshan-12-07','zhongshan-12-08','zhongshan-12-09','zhongshan-12-10','zhongshan-12-12'], '㻬琈之玉':['zhongshan-3-01','zhongshan-3-03','zhongshan-4-04','zhongshan-5-02'],
    '铜':['zhongshan-4-05'], '漆':['zhongshan-4-07'], '棕':['zhongshan-4-07'],
    '榖':['xishan-1-11','zhongshan-5-02','zhongshan-5-12','zhongshan-5-14'],
    '柞':['xishan-1-11','zhongshan-5-02','zhongshan-5-12','zhongshan-5-14'],
    '文石':['zhongshan-1-14','zhongshan-5-03'],
    '槐':['zhongshan-5-02','zhongshan-5-05','zhongshan-5-10'],
    '桐':['zhongshan-5-05'],
    '芍药':['beishan-3-27','zhongshan-5-05'],
    '苍玉':['xishan-1-12','zhongshan-5-06','zhongshan-5-11'],
    '金':['zhongshan-2-02','zhongshan-2-03','zhongshan-2-04','zhongshan-2-07','zhongshan-2-09','zhongshan-3-04','zhongshan-5-09','zhongshan-5-15','zhongshan-6-02','zhongshan-6-05','zhongshan-6-09','zhongshan-6-11','zhongshan-6-14','zhongshan-8-01','zhongshan-8-02','zhongshan-8-05','zhongshan-8-09','zhongshan-8-10','zhongshan-8-11','zhongshan-8-13','zhongshan-8-16','zhongshan-8-19','zhongshan-9-02','zhongshan-9-07','zhongshan-9-08','zhongshan-10-01','zhongshan-11-04','zhongshan-11-05','zhongshan-11-06','zhongshan-11-12','zhongshan-11-16','zhongshan-11-23','zhongshan-11-28','zhongshan-11-29','zhongshan-11-34','zhongshan-11-35','zhongshan-11-36','zhongshan-11-37','zhongshan-11-43','zhongshan-11-47','zhongshan-12-05'],
    '玉':['zhongshan-2-02','zhongshan-2-03','zhongshan-2-04','zhongshan-2-07','zhongshan-2-09','zhongshan-3-04','zhongshan-5-02','zhongshan-5-10','zhongshan-6-02','zhongshan-6-05','zhongshan-6-08','zhongshan-6-09','zhongshan-6-11','zhongshan-6-13','zhongshan-6-14','zhongshan-7-09','zhongshan-7-11','zhongshan-8-01','zhongshan-8-03','zhongshan-8-04','zhongshan-8-05','zhongshan-8-09','zhongshan-8-13','zhongshan-8-19','zhongshan-9-02','zhongshan-9-08','zhongshan-9-10','zhongshan-10-01','zhongshan-11-04','zhongshan-11-17','zhongshan-11-23','zhongshan-11-28','zhongshan-11-39','zhongshan-11-47','zhongshan-12-05','zhongshan-12-08','zhongshan-12-12'],
    '美玉':['zhongshan-5-11'],
    '砺石':['zhongshan-1-14','zhongshan-5-13'],
    '赤铜':['zhongshan-1-05','zhongshan-1-09','zhongshan-1-15','zhongshan-2-06','zhongshan-5-13'],
    '藷藇':['beishan-3-10','zhongshan-5-14'],
    '蕙':['xishan-4-01','zhongshan-5-14'],
    // 中次六经补录（其余同名产出已由世界派生自动挂号，此三味需手工补产地）
    '沙石':['nanshan-1-09','zhongshan-6-01'],
    '水玉':['nanshan-1-02','zhongshan-6-06','zhongshan-11-20'],
    '枏':['nanshan-2-14','zhongshan-6-13','zhongshan-8-06','zhongshan-11-02','zhongshan-11-09','zhongshan-12-08'],
    '赤金':['nanshan-1-04','zhongshan-7-16','zhongshan-8-02','zhongshan-8-09','zhongshan-8-21','zhongshan-9-12','zhongshan-9-14','zhongshan-9-15','zhongshan-10-02','zhongshan-11-01','zhongshan-11-30','zhongshan-11-40'],
    '白金':['nanshan-1-04','zhongshan-7-17','zhongshan-9-09','zhongshan-9-11','zhongshan-9-13','zhongshan-10-04','zhongshan-11-09'],
    // 中次八经补录（荆山二十三山；上述同名产出多由派生自动挂号，此五味需手工补产地）
    '丹粟':['nanshan-2-01','zhongshan-8-01','zhongshan-9-08'],
    '青雘':['nanshan-1-08','zhongshan-8-03','zhongshan-8-05','zhongshan-8-09','zhongshan-8-11','zhongshan-8-13','zhongshan-8-16','zhongshan-8-22','zhongshan-9-08','zhongshan-10-07','zhongshan-11-09','zhongshan-11-14','zhongshan-11-23','zhongshan-11-29','zhongshan-11-32'],
    '梓':['zhongshan-2-06','zhongshan-8-06','zhongshan-8-12','zhongshan-9-04','zhongshan-9-08','zhongshan-9-09','zhongshan-10-09','zhongshan-11-01','zhongshan-11-02','zhongshan-11-09','zhongshan-11-12','zhongshan-11-15','zhongshan-11-19','zhongshan-11-27'],
    '桃枝':['xishan-2-01','zhongshan-8-14'],
    '钩端':['xishan-2-01','zhongshan-8-14'],
    // 中次九经补录（岷山十六山）
    '茈':['xishan-3-16','zhongshan-9-08'],
    '荆':['nanshan-2-14','zhongshan-9-14','zhongshan-11-42','zhongshan-12-08','zhongshan-12-10'],
    '芑':['zhongshan-9-14','zhongshan-11-42'],
    '雄黄':['nanshan-1-05','zhongshan-9-01'],
    '少辛':['zhongshan-7-13','zhongshan-9-06'],
  };
  for (const [name, nodes] of Object.entries(SHARED)){
    const it = Object.values(Items).find(i=>i.name===name);
    if (!it) continue;
    it.nodes = it.nodes || (it.node ? [it.node] : []);
    nodes.forEach(n=>{ if (!it.nodes.includes(n)) it.nodes.push(n); });
    it.node = it.nodes[0];
  }
})();

// 派生的 w_ 条目先于手工条目前生成：若同名两者并存，把 w_ 的产地并入手工条目并删除 w_，
// 保证「一名一 id」（测试的 id 唯一性审计即守此不变量）。此前手工条目全部早于派生执行，
// 直到中次十经出现首个「XW 定义的木名（椐）同时出现在节点 yields」的情形才暴露。
(function mergeAutoIntoManual(){
  const byName = {};
  for (const it of Object.values(Items)) if (!it.auto) byName[it.name] = it;
  for (const it of Object.values(Items)){
    if (!it.auto) continue;
    const m = byName[it.name];
    if (!m) continue;
    m.nodes = m.nodes || (m.node ? [m.node] : []);
    (it.nodes || (it.node ? [it.node] : [])).forEach(n=>{ if (!m.nodes.includes(n)) m.nodes.push(n); });
    m.node = m.nodes[0];
    delete Items[it.id];
  }
})();

// 北山异兽掉落物（与既有西山掉落物同待遇：定义为物品，供战利品系统使用）
addItem(
  I('paoxiaorou','狍鸮之肉','food',{ value:120, lvl:50, icon:'🍖', note:'羊身人面，目在腋下——食人' }),
  I('zhuhuairou','诸怀之肉','food',{ value:130, lvl:50, icon:'🍖', note:'状如牛，四角人目彘耳——食人' }),
  I('xiyuyu','鳛鳛之肉','food',{ value:90, lvl:48, icon:'🐟', note:'十翼鳞皆在羽端，可以御火' }),
  I('quanshuzhi','䑏疏之脂','material',{ value:80, lvl:48, icon:'🟤', note:'一角有错，可以辟火' }),
  I('menghuaimu','孟槐之木','material',{ value:70, lvl:46, icon:'🪵', note:'赤毫，可以御凶' }),
  I('yuzhiyu','寓之羽','material',{ value:75, lvl:52, icon:'🪶', note:'兔首麋身，可以御兵' }),
  I('ershurou','耳鼠之肉','food',{ value:85, lvl:62, icon:'🍖', note:'以其尾飞，可以御百毒' }),
  I('tuotuofeng','橐驼之峰','food',{ value:140, lvl:53, icon:'🐫', note:'善行流沙中，知水泉所在' }),
  I('jingweiyu','精卫之羽','material',{ value:60, lvl:45, icon:'🪶', note:'文首白喙赤足，常衔木石以堙东海' }),
);

const RECIPE_SKILL = { burn:'fanliao', cook:'diaoding', smith:'yezhu', fletch:'xiaoyu', craft:'zhiqi', jade:'zhuoyu', herb:'lianyao', rite:'jisi' };

// ---------- 祠礼效果 ----------
const RITES = {
  rite_chang:{ regionId:null, yieldBonus:0, dur:0, xp:120, deity:null },
  rite_ns1: { regionId:'nanshan-1', yieldBonus:0.30, dur:3600, xp:400, deity:'deity_ns1' },
  rite_ns2: { regionId:'nanshan-2', yieldBonus:0.30, dur:3600, xp:500, deity:'deity_ns2' },
  rite_ns3: { regionId:'nanshan-3', yieldBonus:0.30, dur:3600, xp:700, deity:'deity_ns3' },
  rite_xs1: { regionId:'xishan-1', yieldBonus:0.30, dur:3600, xp:600, deity:'deity_xs1' },
  rite_yu:  { regionId:'xishan-1', yieldBonus:0.50, dur:7200, xp:3000, deity:'deity_yu', grand:true },
  rite_xs2a:{ regionId:'xishan-2', yieldBonus:0.30, dur:3600, xp:500, deity:'deity_xs2' },
  rite_xs2b:{ regionId:'xishan-2', yieldBonus:0.30, dur:3600, xp:300, deity:'deity_xs2b' },
  rite_xs3: { regionId:'xishan-3', yieldBonus:0.35, dur:3600, xp:700, deity:'deity_xs3' },
  rite_xs4: { regionId:'xishan-4', yieldBonus:0.35, dur:3600, xp:800, deity:'deity_xs4' },
  // 北山三套祠礼
  rite_bs1: { regionId:'beishan-1', yieldBonus:0.30, dur:3600, xp:800, deity:'deity_bs1' },
  rite_bs2: { regionId:'beishan-2', yieldBonus:0.30, dur:3600, xp:820, deity:'deity_bs2' },
  rite_bs3: { regionId:'beishan-3', yieldBonus:0.12, dur:3600, xp:850, deity:'deity_bs3' },
  // 东山三套祠礼（荒经水路·终末章；东次四经无神无礼，故不入）
  rite_ds1: { regionId:'dongshan-1', yieldBonus:0.30, dur:3600, xp:850, deity:'deity_dongshan-1' },
  rite_ds2: { regionId:'dongshan-2', yieldBonus:0.30, dur:3600, xp:870, deity:'deity_dongshan-2' },
  rite_ds3: { regionId:'dongshan-3', yieldBonus:0.30, dur:3600, xp:900, deity:'deity_dongshan-3' },
  // 中山十二套祠礼（帝之密都·五臧山经收卷；2026-10-25 全录）
  rite_zs1: { regionId:'zhongshan-1', yieldBonus:0.30, dur:3600, xp:920, deity:'deity_zhongshan-1' },
  rite_zs2: { regionId:'zhongshan-2', yieldBonus:0.30, dur:3600, xp:940, deity:'deity_zhongshan-2' },
  rite_zs3: { regionId:'zhongshan-3', yieldBonus:0.35, dur:3600, xp:960, deity:'deity_zhongshan-3' },
  rite_zs4: { regionId:'zhongshan-4', yieldBonus:0.30, dur:3600, xp:980, deity:'deity_zhongshan-4' },
  rite_zs5: { regionId:'zhongshan-5', yieldBonus:0.30, dur:3600, xp:1000, deity:'deity_zhongshan-5' },
  rite_zs6: { regionId:'zhongshan-6', yieldBonus:0.30, dur:3600, xp:1020, deity:'deity_zhongshan-6' },
  rite_zs7: { regionId:'zhongshan-7', yieldBonus:0.30, dur:3600, xp:1040, deity:'deity_zhongshan-7' },
  rite_zs8: { regionId:'zhongshan-8', yieldBonus:0.30, dur:3600, xp:1060, deity:'deity_zhongshan-8' },
  rite_zs9: { regionId:'zhongshan-9', yieldBonus:0.30, dur:3600, xp:1080, deity:'deity_zhongshan-9' },
  rite_zs10: { regionId:'zhongshan-10', yieldBonus:0.30, dur:3600, xp:1100, deity:'deity_zhongshan-10' },
  rite_zs11: { regionId:'zhongshan-11', yieldBonus:0.32, dur:3600, xp:1120, deity:'deity_zhongshan-11' },
  rite_zs12: { regionId:'zhongshan-12', yieldBonus:0.35, dur:3600, xp:1140, deity:'deity_zhongshan-12' },
};

// ---------- 征兆系统（原文「见则X」，首次著录触发） ----------
const OMENS = {
  fenghuang: { beast:'凤皇', type:'天下安宁', polarity:'吉', desc:'见则天下安宁', yield:0.15,  dur:24*3600, node:'nanshan-3-03' },
  guanguan:  { beast:'灌灌', type:'不惑',     polarity:'吉', desc:'佩之不惑',     wise:true,    dur:0,       node:'nanshan-1-08' },
  lili:      { beast:'狸力', type:'土功',     polarity:'中', desc:'见则其县多土功', build:0.20,  dur:12*3600, node:'nanshan-2-01' },
  zhu:       { beast:'鴸',   type:'放士',     polarity:'凶', desc:'见则其县多放士', trade:-0.10, dur:12*3600, node:'nanshan-2-01' },
  changyou:  { beast:'长右', type:'大水',     polarity:'凶', desc:'见则郡县大水',   gather:-0.20,dur:12*3600, node:'nanshan-2-02' },
  huahuai:   { beast:'猾褢', type:'大繇',     polarity:'凶', desc:'见则县有大繇',   offline:-0.25,dur:12*3600,node:'nanshan-2-03' },
  tuanyu:    { beast:'鱄鱼', type:'大旱',     polarity:'凶', desc:'见则天下大旱',   fish:-0.40,  dur:24*3600, node:'nanshan-3-09' },
  yong:      { beast:'颙',   type:'大旱',     polarity:'凶', desc:'见则天下大旱',   fish:-0.40,  dur:24*3600, node:'nanshan-3-10' },
};

// ---------- 西山 / 北山 征兆（据 JSON 的 node.omen 数组派生，效果为自研调参） ----------
// 西山 15 组里仅 3 组为吉；北山 4 组（肥遗大旱 / 山𤟤大风 / 酸与有恐 / 大蛇大旱）全凶。
// 兵灾类（有兵/大兵）可被駮「可以御兵」御之（见 activateOmen）；
// 大风（移动效率 -20%）与有恐（卜筮 -30%）只走数值，没有「御风」这类对位御使——
// 此前注释写成「可被御风御使削弱」，是从未实现的承诺，已更正。
(function buildRegionOmens(){
  const IDS = {
    '肥𧔥':'feiyi', '鸾鸟':'luanniao', '凫徯':'fuxi', '朱厌':'zhuyan', '蛮蛮':'manman',
    '文鳐鱼':'wenyao', '天神（槐江）':'tianshen', '狡':'jiao', '胜遇':'shengyu',
    '鵕鸟（鼓所化）':'junniao', '大鹗（钦䲹所化）':'dae', '毕方':'bifang',
    '蠃鱼':'luoyu', '鳋鱼':'saoyu', '（鸮面人面鸟）':'xiaomian',
    // 东山经（15 组；「夸父状彘毛之兽」未命名，走默认 id）
    '䖪鼠':'zhi', '䖺䗤':'taohuang', '軨軨':'lingling', '犰狳':'qiuyu', '朱獳':'zhunu',
    '鵹鹕':'lihu', '獙獙':'bibi', '峳峳':'youyou', '絜钩':'xiegou', '薄鱼':'boyu',
    '当康':'dangkang', '䱻鱼':'dshuayu', '合窳':'hey', '蜚':'fei',
    // 中山经首录三系（3 组）
    '鸣蛇':'mingshe', '化蛇':'huashe', '夫诸':'fuzhu',
  };
  // 征兆类型 → 全局修正（自研；类型字符串以 JSON 的 node.omen 为准）
  const EFFECT = {
    '大旱':     { gather:-0.15, fish:-0.30 },
    '大水':     { gather:-0.20 },
    '有兵':     { dmg:-0.15, loot:-0.10 },
    '大兵':     { dmg:-0.15, loot:-0.10 },
    '天下安宁': { yield: 0.15 },
    '大穰':     { yield: 0.15 },
    '讹火':     { craft:-0.20 },
    '大风':     { gather:-0.15, move:-0.20, wind:true },
    '有恐':     { divine:-0.30, psy:true },
    // —— 以下为东山经新增类型 ——
    '螽蝗为败': { gather:-0.18, craft:-0.12 },          // 蝗灾毁稼
    '多土功':   { build:0.20 },                          // 与南山狸力同型，已备
    '多狡客':   { trade:-0.15, loot:-0.10 },             // 狡猾之徒横行
    '多疫':     { yield:-0.12, offline:-0.20 },          // 瘟疫
    '大疫':     { yield:-0.20, offline:-0.30 },          // 大瘟疫（蜚所致）
  };
  for (const src of [XISHAN, BEISHAN, DONGSHAN, ZHONGSHAN]){
    for (const region of src.regions){
      for (const node of region.nodes){
        for (const om of (node.omen||[])){
          const id = IDS[om.trigger] || ('omen_' + node.id);
          const eff = EFFECT[om.type] || {};
          const dur = om.polarity === '吉' ? 24*3600 : 12*3600;
          OMENS[id] = {
            beast: om.trigger, type: om.type, polarity: om.polarity, desc: om.desc,
            node: node.id, dur, ...eff,
            // 兵灾类：可御（駮「可以御兵」）
            war: (om.type === '有兵' || om.type === '大兵') ? true : undefined,
          };
        }
      }
    }
  }
})();

// ---------- 观象 / 观瑞 节点 ----------
const OBSERVE_SITES = {
  qiuwu:    { nodeId:'nanshan-2-17', kind:'观象', name:'日次',   desc:'处于东海，望丘山，其光载出载入，是惟日次', gain:'离线上限 +1 小时' },
  yugu:     { nodeId:'nanshan-3-05', kind:'观象', name:'凯风',   desc:'其南有谷，曰育遗，多怪鸟，凯风自是出',     gain:'离线上限 +1 小时' },
  zhonggu:  { nodeId:'nanshan-3-10', kind:'观象', name:'条风',   desc:'其南有谷焉，曰中谷，条风自是出',           gain:'离线上限 +1 小时' },
  // 西山两处（v1.31.21）：原文方位的密度不比东山低，此前一处未接。
  chongwu:  { nodeId:'xishan-3-01', kind:'观象', name:'崇吾四望', desc:'西望帝之搏兽之丘，北望冢遂，南望䍃之泽，东望𧕯渊——一经之中四向俱全者仅此山', gain:'离线上限 +1 小时' },
  buzhou:   { nodeId:'xishan-3-03', kind:'观象', name:'不周河源', desc:'北望诸𣲗之山，临彼岳崇之山，东望泑泽，河水所潜也，其原浑浑泡泡', gain:'离线上限 +1 小时' },
  // 北山、中山各一处：五章皆有可观，观象不再是南山/东山的地方性玩法。
  jingshan: { nodeId:'beishan-3-10', kind:'观象', name:'盐贩之泽', desc:'景山：南望盐贩之泽，北望少泽，其上多草藷藇', gain:'离线上限 +1 小时' },
  aoan:     { nodeId:'zhongshan-3-01', kind:'观象', name:'河林',    desc:'敖岸之山：北望河林，其状如蒨如举', gain:'离线上限 +1 小时' },
  // reward：初见得瑞羽一件。此前写死在 doObserve 里的一张临时表上，
  // 物品「凤皇羽」的出处因此查不出来，现在归到数据里。
  danxue:   { nodeId:'nanshan-3-03', kind:'观瑞', name:'凤皇',   desc:'丹穴之山有鸟焉，五采而文，见则天下安宁',   gain:'触发「天下安宁」吉兆', reward:'fenghuangyu' },
  nanyu:    { nodeId:'nanshan-3-13', kind:'观瑞', name:'鹓雏',   desc:'南禺之山有凤皇、鹓雏',                     gain:'触发「天下安宁」吉兆', reward:'yuanchuyu' },
};

// 东山经观象点：据 node.observation 数据驱动接入（全经 4 座「X望Y」方位山，非手填）
(function buildDongshanObserve(){
  if (typeof DONGSHAN === 'undefined') return;
  const fmtDir = o => {
    const parts = [];
    if (o.临 && o.临.length) parts.push(o.临.join('，'));
    if (o.望 && o.望.length) parts.push(o.望.join('，'));
    return parts.join('，');
  };
  for (const region of DONGSHAN.regions) {
    for (const node of region.nodes) {
      const obs = node.observation;
      if (!obs || obs.type !== '观象点') continue;
      const key = 'ds_' + node.id.replace(/[^a-zA-Z0-9]/g, '_');
      OBSERVE_SITES[key] = {
        nodeId: node.id,
        kind: '观象',
        name: node.name,
        desc: `${node.name}：${fmtDir(obs)}（${obs.rank || ''}）——${obs.note || ''}`,
        gain: '离线上限 +1 小时',
      };
    }
  }
})();

// ---------- 养成（长周期） ----------
// 原文自带的两处长周期：峚山丹木五岁、北山器酸三岁；外加发鸠山精卫填海（行为类无限长线）。
const GROW_SITES = {
  mishan: {
    nodeId:'xishan-3-04', kind:'养成', name:'玉膏灌丹木', stages:5, sec:3600,   // 一岁一时辰
    cost:[['yugao',1]],
    desc:'玉膏所出，以灌丹木，丹木五岁，五色乃清，五味乃馨',
    reward:{ danmu:2, danmushi:3, yurong:1 },
  },
  // 北山·咸山：条菅之水多器酸，三岁一成——器物酸蚀之奇产
  qisuan: {
    nodeId:'beishan-3-04', kind:'养成', name:'器酸三岁', stages:3, sec:3*3600,
    cost:[],
    desc:'咸山条菅之水其中多器酸，三岁一成',
    reward:{ bs_qisuan:1 },
  },
  // 北山·发鸠之山：精卫填海——女娃溺于东海，化为精卫，常衔木石以堙东海。
  // 发鸠多柘木即其衔取之材；该养成点对应「樵采累计」长线里程碑，可无限累积。
  jingwei: {
    nodeId:'beishan-3-22', kind:'养成', name:'精卫填海', stages:200, sec:600,    // 每时辰投一木石，东海渐浅
    cost:[['w_柘木',1]],
    desc:'炎帝之少女女娃，溺于东海，故为精卫，常衔西山之木石以堙于东海——发鸠之山多柘木',
    // 200 阶 × 10 分钟 = 33 小时。若只在终点给一次，中间三十多个钟头毫无节点感；
    // 每 25 阶给一次「东海又浅一分」的小路标（羽 ×1 + 阶数×4 贝），大成再加重。
    stepEvery:25, stepReward:{ item:'jingweiyu', qty:1, shellPerStage:4 },
    // 四段大路标（v1.31.22）：每 50 阶一段，给的东西各不相同，且永久抬高采集——
    // 「堆量」之所以枯燥，是因为每到 50 阶与 49 阶毫无区别。段奖励只领一次（记在 st.segs）。
    segments: [
      { at:50,  name:'一篑', reward:{ jingweiyu:3, yu:2 }, gather:0.02, text:'一篑之土，东海始浅（采集 +2%）' },
      { at:100, name:'半程', reward:{ jingweiyu:5, gui:5 }, gather:0.03, text:'海波已退半里（采集 +3%）' },
      { at:150, name:'三篑', reward:{ jingweiyu:8, zhenwu:1 }, gather:0.03, text:'渊面见底，蜃气渐收（采集 +3%，另得镇物）' },
      { at:200, name:'成海', reward:{ jingweiyu:10, yu:5 }, gather:0.05, text:'东海可涉，木石成洲（采集 +5%）' },
    ],
    reward:{ yu:3, jingweiyu:5 },
    infiniteNote:'无限累积，对应「樵采累计」长线里程碑；东海渐浅 200 阶后封顶',
  },
};
// 养成产物（非采集，由养成点产出）
addItem( I('bs_qisuan','器酸','mineral',{ value:300, lvl:65, icon:'🧪', note:'三岁一成', py:'qì suān' }) );

// ---------- 特殊节点机制 ----------
const SPECIAL_NODES = {
  // 积石之山「万物无不有焉」：全产出节点——该山可采一切已达等次的采集物，并小额稀有加成
  'xishan-3-13': { allYield:true, rareBonus:0.15, note:'万物无不有焉' },
  // 鸟鼠同穴之山：共生现象——渔获兼得山玉
  'xishan-4-18': { symbiosis:{ item:'baiyu', chance:0.25 }, note:'鸟鼠同穴——共生采集' },
  // 昆仑之丘：钦原「蠚木则枯」——田地威胁事件
  'xishan-3-08': { gardenThreat:{ beast:'钦原', chance:0.03 }, note:'蠚鸟兽则死，蠚木则枯' },
  // 北山·白沙山：广员三百里尽沙——沙漠区（与虢山橐驼「善行流沙中」配套：沙漠寻水使役）
  'beishan-2-05': { desert:true, note:'广员三百里，尽沙也' },
  // 北山·洹山：三桑无枝，其高百仞——需高阶樵采方可采至其顶
  'beishan-2-15': { climb:true, note:'三桑无枝，其高百仞，需高阶樵采' },
  // 北山·教山：冬干而夏流，实惟干河——季节性河流（第二个季节机制）
  'beishan-3-09': { seasonalRiver:true, note:'冬干而夏流，实惟干河' },
  // 北山·空桑：冬夏有雪——常年积雪，季节性封闭（与申首之山同型）
  'beishan-3-33': { snow:true, note:'冬夏有雪' },
};
// 渔获兼得（𩶯魮之鱼「是生珠玉」）
const GATHER_BONUS = {
  zhipiyu: { item:'zhuyu2', chance:0.5, note:'是生珠玉' },
};
// ---------- 营造（营邑） ----------
// 营邑等级门槛已压平（1/2/4/6/9/12/16/20），经验按「造完即够下一档」给足——
// 旧的 1/3/5/10/15/20/30/40 门槛配 50–900 经验，造到第三座就永远卡住（升级需数万经验）。
// 另设「修葺」（game.js repairBuild）作为材料换经验的兜底，任何时候都不会无路可走。
const BUILDINGS = {
  zhai:    { id:'zhai',    name:'柴栅',   lvl:1,  xp:40,    cost:[['gui',5],['yan',3]],               desc:'结木为栅，以固所获 · 采获 +3%（约合产量 +1.5%）' },
  zaoku:   { id:'zaoku',   name:'灶窟',   lvl:2,  xp:340,   cost:[['yan',15],['guaimu',5]],           desc:'甃灶炊爨，工不暇息 · 制作耗时 -10%' },
  tuku:    { id:'tuku',    name:'土窟',   lvl:4,  xp:1080,  cost:[['guaimu',20],['tan',5]],           desc:'因势窟土，以庇风雨 · 离线上限 +1 小时' },
  citan:   { id:'citan',   name:'祠坛',   lvl:6,  xp:4100,  cost:[['guaimu',10],['shashi',10],['yu',1]], desc:'祭祀效果 ×1.5' },
  shichan: { id:'shichan', name:'市廛',   lvl:9,  xp:8700,  cost:[['guaimu',15],['jin',2]],             desc:'商旅售价 +5%' },
  canglin: { id:'canglin', name:'仓廪',   lvl:12, xp:22000, cost:[['guaimu',20],['tu',10]],             desc:'离线上限 +2 小时 · 离线效率 +5%' },
  fenghuotai:{ id:'fenghuotai',name:'烽火台',lvl:16, xp:38200, cost:[['shashi',20],['tan',10]],         desc:'凶兆先举烽，延时四十五秒方应验 · 其害减半' },
  xuegong: { id:'xuegong', name:'学宫',   lvl:20, xp:20000, cost:[['guaimu',30],['yu',5],['jian',10]],  desc:'著录度获取 +25%' },
  // 后期四座：此前二十级封顶，建完学宫营邑就无事可做。这四座各接一条已有通道，
  // 让「营邑」在四十级、五十级仍有下一座可盼。
  cuihuolu:  { id:'cuihuolu',  name:'淬火炉', lvl:24, xp:56000,  cost:[['tan',40],['chijin',12],['guaimu',25]], desc:'炉火纯青 · 淬炼成功率 +6%' },
  cangshuge: { id:'cangshuge', name:'藏书阁', lvl:30, xp:92000,  cost:[['guaimu',40],['yu',10],['jin',15]],     desc:'竹简盈室，日诵不辍 · 修行经验 +10%' },
  zhaoxianguan:{ id:'zhaoxianguan', name:'招贤馆', lvl:40, xp:175000, cost:[['jin',20],['yu',15],['tan',20]],  desc:'广纳异兽，各尽其能 · 御使增益 +15%' },
  shanhaige: { id:'shanhaige', name:'山海阁', lvl:52, xp:330000, cost:[['yu',25],['chijin',20],['tan',40]],    desc:'藏山海之图于阁上 · 离线上限 +3 小时、离线效率 +5%' },
};

// ---------- 墟市（商旅） ----------
const SHOP_CATS = [
  { id:'kindling', icon:'🔥', name:'火种',   desc:'冶铸炊爨之用' },
  { id:'seed',      icon:'🌾', name:'嘉种',   desc:'圃艺之种' },
  { id:'food',      icon:'🍖', name:'熟食',   desc:'行路干粮，即刻回血' },
  { id:'beast',     icon:'🐕', name:'方国',   desc:'远方贸易之畜' },
  { id:'rite',      icon:'🕯️', name:'祭具',   desc:'祠礼之衣物与礼器' },
  { id:'herb',      icon:'🧪', name:'药散',   desc:'一时之效，力竭时可济' },
];
const ShopStock = [
  { itemId:'huozhong', qty:10, cost:60,  lvl:1,  cat:'kindling' },
  { itemId:'shuiping', qty:10, cost:45,  lvl:1,  cat:'kindling' },
  { itemId:'seed_tu',   qty:5, cost:20,  lvl:1,  cat:'seed' },
  { itemId:'seed_dao',  qty:5, cost:45,  lvl:3,  cat:'seed' },
  { itemId:'seed_jian', qty:5, cost:80,  lvl:5,  cat:'seed' },
  { itemId:'seed_ji',   qty:5, cost:260, lvl:66, cat:'seed', note:'稷——西次三经祠礼「糈用稷米」' },
  { itemId:'zs_mutun', qty:2, cost:220, lvl:78, cat:'rite', note:'牝豚——中次十二经祠礼所用（母猪）' },
  { itemId:'seed_shu',  qty:5, cost:300, lvl:70, cat:'seed', note:'黍——东次三经祠礼「米用黍」' },
  { itemId:'baiquan',   qty:1, cost:600, lvl:20, cat:'beast', note:'三经祠礼「用一白狗祈」所需' },
  { itemId:'xiongji',   qty:1, cost:400, lvl:32, cat:'beast', note:'西次二经十辈神「毛一雄鸡」' },
  { itemId:'baiji',     qty:1, cost:1200,lvl:41, cat:'beast', note:'西次四经「用一白鸡祈」所需' },
  { itemId:'caiyi',     qty:1, cost:900, lvl:74, cat:'rite',  note:'中次四经祠礼「以彩衣之」所需' },

  // ---------- 熟食（v1.31.11） ----------
  // 40 级以后「70 级打开市廛只剩三五样」——补一档战斗补给。
  // 定价 = 材料市价 × 2.5：买来吃很顺手，但拿去转卖是亏的（卖价只有市价的 ~1/3），
  // 所以不构成「买了再卖」的循环。实测 60 级挂机一小时只吃 2 份，
  // 它是「打 BOSS 前忘了备干粮」的补救，不是主力补给。
  // 定价 = 价值 × 件数 × 1.15。**必须 ≥ 价值**：回收价是「价值 × 售价系数(≤1.25) × 0.7」，
  // 只要单价低于价值，「买三份再卖回」就白赚几贝——第一版按 2.5 倍「原料价」定，正好落进这个坑。
  { itemId:'jiagufan',   qty:3, cost:50,  lvl:1,  cat:'food' },
  { itemId:'zhishengrou',qty:3, cost:90,  lvl:3,  cat:'food' },
  { itemId:'daofan',     qty:3, cost:105, lvl:5,  cat:'food' },
  { itemId:'piluogeng',  qty:2, cost:120, lvl:13, cat:'food' },
  { itemId:'kaijiyu',    qty:2, cost:165, lvl:30, cat:'food' },
  { itemId:'zhixipu',    qty:1, cost:175, lvl:52, cat:'food' },
  { itemId:'zhisipu',    qty:1, cost:230, lvl:52, cat:'food' },

  // ---------- 药散（v1.31.11） ----------
  // 只卖**不能折算成贝币**的那两种：
  //   益脑散 +20% 经验、御水散 +25 防御——它们换的是「时间」与「稳」，无法套利。
  // 释劳散（+35% 采获 4 分钟）刻意不卖：一小时采 50 万贝时，4 分钟的边际收益是 1.1 万贝，
  // 卖多少钱都小于它，等于白送一个刷钱按钮。见 docs/BALANCE.md 八。
  { itemId:'yinaosan',   qty:1, cost:1800, lvl:68, cat:'herb', note:'益脑：经验 +20%，五分钟' },
  { itemId:'yushuisan',  qty:1, cost:2100, lvl:70, cat:'herb', note:'御水：防御 +25，五分钟' },
];

// ---------- 采集目标池（按技能；仅限标注了产地的可采物，种子不进池） ----------
const GATHER_POOLS = {};
for (const id of ['qiaocai','caiyu','yu','caiyao']){
  GATHER_POOLS[id] = Object.values(Items).filter(it=>it.skill===id && it.node).map(it=>it.id);
}

// ---------- 异兽（据 WORLD 各区域 fauna 字段构建） ----------
// 五行属性与素材掉落为本项目自研设计（原文只记形态/声音/效果/征兆四要素）；
// 数值由节点等次按统一公式推导，全部自研调参。
// ⚠️ 合规红线：西王母只用原文四要素（人形、豹尾、虎齿、善啸、蓬发、戴胜）；
// 帝江「浑敦无面目」——不可画面部。提示词与文案均不得引用任何当代作品形象。

const FAUNA_META = {
  '狌狌':  { id:'shengsheng', el:'木', drop:'shengshengrou' },
  '白猿':  { id:'baiyuan',    el:'木', drop:'baiyuanpi' },
  '鹿蜀':  { id:'lushu',      el:'木', drop:'lushupi' },
  '旋龟':  { id:'xuangui',    el:'水', drop:'xuanguijia' },
  '鯥':    { id:'lu',         el:'水', drop:'lurou' },
  '类':    { id:'lei',        el:'木', drop:'leipi' },
  '猼訑':  { id:'boyi',       el:'土', drop:'boyipi' },
  '𪁺𪁸':  { id:'yuyu',       el:'火', drop:'yuyu', py:'yǔ yǔ' },
  '九尾狐':{ id:'jiuwei',     el:'火', drop:'jiuweihuwei', man:true },
  '灌灌':  { id:'guanguan',   el:'木', drop:'guanguanyu', omen:'guanguan' },
  '赤鱬':  { id:'chiru',      el:'水', drop:'chirurou' },
  '狸力':  { id:'lili',       el:'土', drop:'liliti', omen:'lili' },
  '鴸':    { id:'zhu',        el:'火', drop:'zhuyu3', omen:'zhu' },
  '长右':  { id:'changyou',   el:'水', drop:'changyoubi', omen:'changyou' },
  '猾褢':  { id:'huahuai',    el:'土', drop:'huahuaiipi', omen:'huahuai' },
  '彘':    { id:'zhi',        el:'金', drop:'zhipi', man:true },
  '䍺':    { id:'huan',       el:'土', drop:'huanpi', unkillable:true },
  '蛊雕':  { id:'gudiao',     el:'水', drop:'gudiaoyu', man:true },
  '瞿如':  { id:'quru',       el:'火', drop:'quruyu' },
  '虎蛟':  { id:'hujiao',     el:'水', drop:'hujiaorou' },
  '凤皇':  { id:'fenghuang',  el:'火', drop:'fenghuangyu', pacifist:true, omen:'fenghuang' },
  '鱄鱼':  { id:'tuanyu',     el:'水', drop:'tuanyulin', omen:'tuanyu' },
  '颙':    { id:'yong',       el:'火', drop:'yongyu', omen:'yong' },
  '鹓雏':  { id:'yuanchu',    el:'火', drop:'yuanchuyu', pacifist:true },
  '怪鸟':  { id:'guainiao',   el:'火', drop:'quruyu' },   // 原文未详述形态：原创设计
  '怪兽':  { id:'guaishou',   el:'木', drop:'shougu' },   // 原文未详述形态：原创设计
  '大蛇':  { id:'dashe',      el:'水', drop:'shougu' },   // 原文未详述形态：原创设计
  // 南山可猎（祷过之山「多犀、兕，多象」）
  '犀':    { id:'xi',    el:'土', drop:'xipi',    hunt:true },
  '兕':    { id:'si',    el:'土', drop:'sipi',    hunt:true },
  '象':    { id:'xiang', el:'土', drop:'xiangya', hunt:true },

  // ===== 西山经（四系 77 山）=====
  // —— 西山首经 ——
  '羬羊':   { id:'qianyang', el:'土', drop:'qianyanggao', riteDrop:'yang', py:'qián' },
  '䳋渠':   { id:'tongqu',   el:'水', drop:'niaoyu' },
  '肥𧔥':   { id:'feiyi',    el:'火', drop:'feiyishen', omen:'feiyi', man:true, py:'féi wèi' },
  '㸲牛':   { id:'zuoniu',   el:'土', drop:'zuoniujiao', hunt:true, riteDrop:'niu', py:'zuó' },
  '赤鷩':   { id:'chibie',   el:'火', drop:'chibieyu', py:'bì' },
  '葱聋':   { id:'conglong',el:'金', drop:'conglonger' },
  '鴖':     { id:'min',      el:'火', drop:'niaoyu', py:'mín' },
  '𩽵鱼':   { id:'zhengyu',  el:'水', drop:'yulin' },
  '肥遗':   { id:'feiyi2',   el:'木', drop:'feiyiyu', note:'与太华之山「肥𧔥」字形相近而物不同：一鸟一蛇，一治病一致旱——原文彩蛋', py:'féi yí' },
  '豪彘':   { id:'haozhi',   el:'金', drop:'haozhiyao', hunt:true, riteDrop:'shi', py:'zhì' },
  '人鱼':   { id:'renyu',    el:'水', drop:'renyuyu' },
  '嚣':     { id:'xiao',     el:'金', drop:'xiaozhu', man:true, py:'xiāo' },
  '橐𩇯':   { id:'tuofei',   el:'火', drop:'tuofeiyu', py:'tuó féi' },
  '猛豹':   { id:'mengbao',  el:'金', drop:'mengbaopi', man:true },
  '尸鸠':   { id:'shijiu',   el:'木', drop:'niaoyu' },
  '白翰':   { id:'baihan',   el:'木', drop:'niaoyu' },
  '溪边':   { id:'xibian',   el:'木', drop:'xibianpi', note:'席其皮者不蛊——兽皮为席路线' },
  '栎':     { id:'yue',      el:'木', drop:'shougu', py:'lì' },
  '玃如':   { id:'jueru',    el:'木', drop:'jueruzhi', py:'jué' },
  '数斯':   { id:'shusi',    el:'火', drop:'niaoyu' },
  '𤛎':     { id:'huo',      el:'土', drop:'shougu', py:'huǒ' },
  '鹦鹉':   { id:'yingwu',   el:'火', drop:'niaoyu' },
  '牦牛':   { id:'maoniu',   el:'土', drop:'maoniupi', hunt:true, py:'máo' },
  '麢':     { id:'ling',     el:'木', drop:'shougu', py:'líng' },
  '麝':     { id:'she',      el:'木', drop:'shepi', py:'shè', extra:[['zs_she_r',0.45,1]], note:'似鹿而小，脐有香——麝香（中次十二经阳帝之山亦多麝）' },
  // 中山经神祇（帝之密都诸神与山神）：deity 走「谒见」入录，不讨伐、不掉落。
  // gift 是「初谒之赐」——这里十位原本一件都不给，谒见只换一条图鉴，等于
  // 七十三级往后唯一的动作毫无回报；西山诸神却各赐鸟羽。现在补齐，
  // 且赐的正是**本系祠礼要用的那件祭品**（雄鸡 / 吉玉 / 珪 / 藻圭 / 牝豚 / 稌米 / 玉 / 羊牲）：
  // 「谒见本系山神 → 得行祭之料」于是成了一条闭环，而不是两份互不相干的表。
  '武罗':     { id:'zs_wuluo',   el:'木', deity:true, py:'wǔ luó',  gift:['yu','yaobi'], note:'青要之山神——人面豹文，小要而白齿，穿耳以鐻，其鸣如鸣玉。其山「其阳多玉」' },
  // 特例三神：赐物不是祭品，而是一件专属护符（唯一来源 = 初谒，不可合成）——
  // 十位全给祭品虽然闭环，但谒见之间毫无差异；这三位各留一件「神赐异宝」。
  '泰逢':     { id:'zs_taifeng', el:'火', deity:true, py:'tài féng',gift:'zs_taifeng_huang', note:'和山之神——其状如人而虎尾，好居于萯山之阳，出入有光。祠用一牡羊' },
  '骄虫':     { id:'zs_jiaochong', el:'火', deity:true, py:'jiāo chóng', gift:['jiyu2','honey'], note:'平逢之山神——其状如人而二首，是为螫虫，实惟蜂蜜之庐。其祠用吉玉' },
  '𬠷围':     { id:'zs_weiu',    el:'木', deity:true, py:'tuó wéi', gift:['zs_zaogui','zs_zaogui'], note:'骄山神——其状如人面，羊角虎爪，恒游于雎漳之渊，出入有光。其祠用藻圭' },
  '计蒙':     { id:'zs_jimeng',  el:'水', deity:true, py:'jì méng', gift:['tu','piaofengfu'], note:'光山神——其状人身而龙首，恒游于漳渊，出入必有飘风暴雨。其祠糈用稌' },
  '涉𬠷':     { id:'zs_shetuo',  el:'土', deity:true, py:'shè tuó', gift:['xiongji','xiongji'], note:'岐山神——其状人身而方面，三足。其祠用一雄鸡' },
  '神人':     { id:'zs_shenren', el:'金', deity:true, py:'shén rén',gift:['jiyu2','qibifu'], note:'熊山之穴——恒出入神人，夏启而冬闭，冬启乃必有兵。其祠用吉玉' },
  '耕父':     { id:'zs_gengfu',  el:'水', deity:true, py:'gēng fù', gift:'zs_fengshan_light', note:'丰山神——常游清泠之渊，出入有光，见则其国为败。其祠用珪' },
  '于儿':     { id:'zs_yuer',    el:'水', deity:true, py:'yú ér',   gift:['zs_mutun','shetui'], note:'夫夫之山神——其状人身而身操两蛇，常游于江渊，出入有光。其祠用牝豚' },
  '帝之二女': { id:'zs_ernv',    el:'水', deity:true, py:'dì zhī èr nǚ', gift:'zs_ernv_pei',     note:'洞庭之山——帝之二女居之，常游于江渊，出入必以飘风暴雨。其祠糈用稌' },
  '鸓':     { id:'lei',      el:'木', drop:'niaoyu', py:'lěi' },
  '白蛇':   { id:'baishe',   el:'水', drop:'baishepi', extra:[['zs_baishe_r',0.4,1]], note:'蛇而色白——其胆入药（中次十二经柴桑之山多白蛇）' },
  '虎':     { id:'hu',       el:'金', drop:'hupi', man:true },
  '豹':     { id:'bao',      el:'金', drop:'baopi', man:true },
  // —— 西次二经 ——
  '鸾鸟':   { id:'luanniao', el:'火', drop:'luanniaoyu', omen:'luanniao', note:'天下安宁之吉鸟' },
  '白豪':   { id:'baihao',   el:'金', drop:'baihaoshou', man:true, note:'其豪如彘豪——白毛刚劲' },
  '凫徯':   { id:'fuxi',     el:'金', drop:'fuxiyu', omen:'fuxi', py:'fú xī' },
  '朱厌':   { id:'zhuyan',   el:'金', drop:'zhuyanmao', omen:'zhuyan', man:true, py:'zhū yàn' },
  '麢羊':   { id:'lingyang', el:'木', drop:'shougu' },
  '犳':     { id:'zhuo',     el:'木', drop:'shougu', py:'zhuó' },
  '麋':     { id:'mi',       el:'木', drop:'mipi', py:'mí' },
  '鹿':     { id:'lu',       el:'木', drop:'lupi' },
  '罗罗':   { id:'luoluo',   el:'木', drop:'luoluopi' },
  // —— 西次三经（神祇密度最高的一系）——
  '举父':   { id:'jufu',     el:'木', drop:'jufuzhi', note:'状如禺而文臂，豹尾善投' },
  '蛮蛮':   { id:'manman',   el:'水', drop:'manmanyi', omen:'manman', pair:true, note:'一翼一目，相得乃飞——御使需成对（占两槽）' },
  '文鳐鱼': { id:'wenyaoyu', el:'水', drop:'wenyaoyi', omen:'wenyao', note:'鱼身鸟翼，苍文白首赤喙，夜飞——天下大穰之吉兆', py:'wén yáo' },
  '英招':   { id:'yingzhao', el:'土', drop:'niaoyu', deity:true, note:'马身而人面，虎文而鸟翼——司槐江之山' },
  '（天神）':{ id:'tianshen',el:'土', drop:'shougu', deity:true, omen:'tianshen', note:'槐江之山天神，其状如牛而八足二首马尾——其邑有兵' },
  '陆吾':   { id:'luwu',     el:'金', drop:'luwuuwei', deity:true, boss:true, note:'虎身而九尾，人面而虎爪，司天之九部及帝之囿时——西次三经守关者' },
  '土蝼':   { id:'tulou',    el:'土', drop:'tuloujiao', man:true, note:'其状如羊而四角，是食人' },
  '钦原':   { id:'qinyuan',  el:'火', drop:'qinyuanci', note:'其状如蜂，大如鸳鸯——蠚鸟兽则死，蠚木则枯' },
  '鹑鸟':   { id:'chunniao', el:'火', drop:'niaoyu', deity:true, note:'司帝之百服' },
  '䱻鱼':   { id:'huayu',    el:'水', drop:'yulin', py:'huá' },
  '长乘':   { id:'changcheng',el:'土',drop:'niaoyu', deity:true, note:'状如人而犳尾——蠃母之山神' },
  '西王母': { id:'xiwangmu', el:'金', drop:'xiwangmusheng', deity:true, boss:true, note:'其状如人，豹尾虎齿而善啸，蓬发戴胜，是司天之厉及五残', py:'xī wáng mǔ' },
  '狡':     { id:'jiao',     el:'木', drop:'jiaojiao', omen:'jiao', note:'其状如犬而豹文，其角如牛——其国大穰' },
  '胜遇':   { id:'shengyu',  el:'火', drop:'shengyuyu', omen:'shengyu', note:'其状如翟而赤，是食鱼——其国大水', py:'shèng yù' },
  '白帝少昊':{ id:'baihaodi',el:'金', drop:'niaoyu', deity:true, note:'白帝，居长留之山' },
  '员神磈氏':{ id:'yuanshenkuishi', el:'土', drop:'niaoyu', deity:true, note:'员神磈氏主司反景（日光返照）', py:'kuǐ' },
  '狰':     { id:'zheng',    el:'金', drop:'zhengwei', man:true, note:'其状如赤豹，五尾一角，其音如击石', py:'zhēng' },
  '毕方':   { id:'bifang',   el:'火', drop:'bifangyu', omen:'bifang', note:'其状如鹤，一足，赤文青质而白喙——其邑有讹火', py:'bì fāng' },
  '天狗':   { id:'tiangou',  el:'金', drop:'tiangoupi', man:true },
  '江疑':   { id:'jiangyi',  el:'水', drop:'niaoyu', deity:true, note:'司怪雨风云——符愓之山神' },
  '三青鸟': { id:'sanqingniao', el:'火', drop:'niaoyu', deity:true, note:'为西王母取食之青鸟' },
  '傲𢓭':   { id:'aoyi',     el:'金', drop:'aoyihao', man:true, note:'其状如牛，白身四角，其豪如披蓑', py:'ào yì' },
  '鸱':     { id:'chi',      el:'火', drop:'niaoyu', note:'一首而三身，状如𪇱', py:'chǐ' },
  '耆童':   { id:'qitong',   el:'土', drop:'niaoyu', deity:true, note:'其音常如钟磬——騩山神' },
  '帝江':   { id:'dijiang',  el:'土', drop:'dijiangnang', deity:true, boss:true, note:'状如黄囊，赤如丹火，六足四翼，浑敦无面目——不可画面部', py:'dì jiāng' },
  '蓐收':   { id:'rushou',   el:'金', drop:'niaoyu', deity:true, note:'金神，人面虎爪白尾执钺——泑山神', py:'rù shōu' },
  '红光':   { id:'hongguang',el:'火', drop:'niaoyu', deity:true, note:'三危之山神' },
  '讙':     { id:'huan',     el:'木', drop:'huanmu', note:'其状如狸，一目而三尾——其音如百声', py:'huān' },
  '鵸鵌':   { id:'qitu',     el:'火', drop:'qituyu', note:'其状如乌，三首六尾而善笑', py:'qí tú' },
  '白鹿':   { id:'bailu',    el:'木', drop:'lupi' },
  '当扈':   { id:'danghu',   el:'火', drop:'danghuran', note:'其状如雉，以其髯飞——食之不眴目', py:'dāng hù' },
  '白狼':   { id:'bailang',  el:'金', drop:'bailangpi' },
  '白虎':   { id:'baihu',    el:'金', drop:'baihupi', man:true },
  '白雉':   { id:'baizhi',   el:'火', drop:'niaoyu', py:'zhì' },
  '白翟':   { id:'baizhai',  el:'火', drop:'niaoyu', py:'zhái' },
  '鸮':     { id:'xiao2',    el:'火', drop:'niaoyu', py:'xiāo' },
  '神𩲜':   { id:'shenling', el:'土', drop:'shenlingzu', deity:true, note:'人面兽身，一足一手——刚山神' },
  '冉遗之鱼':{ id:'ranyizhiyu', el:'水', drop:'ranyizhimu', py:'rǎn yí' },
  '駮':     { id:'bo',       el:'金', drop:'bojiao', note:'其状如马而白身黑尾，一角，虎牙爪，是食虎豹——可以御兵（克制兵灾征兆）', py:'bó' },
  '穷奇':   { id:'qiongqi',  el:'水', drop:'qiongqimao', man:true, note:'其状如牛，猬毛——本经形态；「状如虎有翼」出自《海内北经》，跨文献需注明' },
  '蠃鱼':   { id:'luoyu',    el:'水', drop:'luoyuyi', omen:'luoyu', note:'鱼身而鸟翼——其音如鸳鸯，其邑大水', py:'luǒ' },
  '鳋鱼':   { id:'saoyu',    el:'水', drop:'yulin', omen:'saoyu', note:'其状如鳣鱼，动则其邑有大兵', py:'sāo' },
  '𩶯魮之鱼':{ id:'zhipiyu', el:'水', drop:'zhuyu', fishOnly:true, note:'其状如覆铫，鸟首而鱼翼鱼尾，音如磬石之声——是生珠玉（唯一产珠玉之鱼）', py:'zhì pí' },
  '龟':     { id:'gui',      el:'水', drop:'guike' },
  '孰湖':   { id:'shuhu',    el:'土', drop:'shuhuwei', note:'马身鸟翼，人面蛇尾，是好举人——少见的亲人性情', py:'shú hú' },
  '（未名鸟）':{ id:'weimingniao', el:'火', drop:'niaoyu', note:'原文未名，未详述形态' },
  // 钟山：鼓 / 钦䲹 处死后化为二鸟（原文罕见的完整叙事段）
  '鼓':     { id:'gu',       el:'土', drop:'niaoyu', deity:true, note:'人面而龙身，与钦䲹杀葆江于昆仑之阳，帝戮之钟山之东曰𡺯崖——鼓亦化为鵕鸟' },
  '钦䲹':   { id:'qinfu',    el:'土', drop:'niaoyu', deity:true, note:'化为大鹗：状如雕而黑文白首，赤喙而虎爪，音如晨鹗——见则有大兵', py:'qīn fú' },
  // ===== 北山经（三系 88 山）=====
  // 食人凶兽（可讨伐，man）
  '狍鸮':   { id:'paoxiao',  el:'土', drop:'paoxiaorou', man:true, note:'羊身人面，目在腋下，虎齿人爪——是食人（钩吾之山）', py:'páo xiāo' },
  '诸怀':   { id:'zhuhuai',  el:'土', drop:'zhuhuairou', man:true, note:'兽状如牛，四角，人目彘耳——是食人（北岳之山）', py:'zhū huái' },
  // 窫窳（少咸之山）即六凶之猰貐——已在 BOSS 表，此处不重复生成
  // 御 X 御使（被动护身，生前抵御类，与南山「食之 X」治疗类互补）
  '鳛鳛之鱼':{ id:'xiyu',   el:'水', drop:'xiyuyu',  note:'状如鹊而十翼、鳞皆在羽端，音如鹊——可以御火（食之不瘅）', py:'xí' },
  '䑏疏':   { id:'quanshu', el:'金', drop:'quanshuzhi', note:'状如马，一角，有错——可以辟火', py:'quán' },
  '孟槐':   { id:'menghuai',el:'金', drop:'menghuaimu', note:'状如貆而赤毫，其音如榴榴——可以御凶', py:'huái' },
  '寓':     { id:'yu_bs',  el:'金', drop:'yuzhiyu', note:'状如鼠而兔首麋身，其音如獆犬——可以御兵（克制兵灾征兆）', py:'yù' },
  '耳鼠':   { id:'ershu',  el:'土', drop:'ershurou', note:'状如鼠而菟首麋耳，以其尾飞——可以御百毒', py:'ěr' },
  // 沙漠使役（白沙山寻水配套）
  '橐驼':   { id:'tuotuo',  el:'土', drop:'tuotuofeng', note:'其状如橐而善行流沙中，知水泉之所——沙漠寻水使役', py:'tuó' },
  // 精卫（发鸠之山）：炎帝少女所化，行为类无限长线
  '精卫':   { id:'jingwei', el:'火', drop:'jingweiyu', note:'炎帝之少女女娃所化，文首白喙赤足，常衔木石以堙东海', py:'jīng wèi' },

  // —— 北山具名异兽补录（2026-10-24）——
  // 世界数据 78 条 fauna 中，以下 49 种有原文形态/效果而 meta 缺席——「有兽无实体」：
  // 不讨伐、无掉落、不进图鉴。循东山 ds_ 先例以 bs_ 前缀补录；常兽（马/兕/熊/罴/
  // 鳣/鲔/活师）与泛称（多鸟兽）不在此列，维持「具名异兽方入册」的口径。
  // 注：滑鱼/水马/何罗鱼/师鱼四种亦在北山水族渔表（XW）有同名渔获——渔表 id 属
  // 已上线内容不可改，故异兽实体 id 追加数字后缀（同敦薨之山 bs_maoniu2 先例），
  // 图鉴中「水族渔获」与「异兽」两层身份并存（䲃鱼/蒲夷之鱼亦循此制）。
  '滑鱼':   { id:'bs_huayu2', el:'水', drop:'bs_huayu_r', py:'huá yú',
              note:'其状如鱓，赤背，其音如梧——食之已疣' },
  '水马':   { id:'bs_shuima2', el:'水', drop:'bs_shuima_r', py:'shuǐ mǎ',
              note:'其状如马，文臂牛尾，其音如呼' },
  '鯈鱼':   { id:'bs_tiaoyu', el:'水', drop:'bs_tiaoyu_r', py:'tiáo',
              note:'其状如鸡而赤毛，三尾、六足、四首，其音如鹊——食之可以已忧' },
  '何罗鱼':   { id:'bs_heluoyu2', el:'水', drop:'bs_heluoyu_r', py:'hé luó',
              note:'一首而十身，其音如吠犬——食之已痈' },
  '蕃':   { id:'bs_fan', el:'火', drop:'bs_fan_r', py:'fán',
              note:'原文未详述形态' },
  '孟极':   { id:'bs_mengji', el:'金', drop:'bs_mengji_r', py:'mèng jí',
              note:'其状如豹，而文题白身，其鸣自呼，是善伏' },
  '幽鴳':   { id:'bs_youyan', el:'木', drop:'bs_youyan_r', py:'yōu yàn',
              note:'其状如禺而文身，其鸣自呼，善笑，见人则卧' },
  '足訾':   { id:'bs_zuzi', el:'木', drop:'bs_zuzi_r', py:'zú zī',
              note:'其状如禺而有鬣，牛尾、文臂、马蹄，其鸣自呼，见人则呼' },
  '䴔':   { id:'bs_jiao', el:'火', drop:'bs_jiao_r', py:'jiāo',
              note:'群居而朋飞，其毛如雌雉，其鸣自呼——食之已风' },
  '诸犍':   { id:'bs_zhujian', el:'金', drop:'bs_zhujian_r', py:'zhū jiān',
              note:'其状如豹而长尾，人首而牛耳，一目，善吒，行则衔其尾，居则蟠其尾' },
  '白鵺':   { id:'bs_baiye', el:'火', drop:'bs_baiye_r', py:'bái yè',
              note:'其状如雉，而文首、白翼、黄足——食之已嗌痛，可以已痸' },
  '那父':   { id:'bs_nafu', el:'土', drop:'bs_nafu_r',
              note:'其状如牛而白尾，其音如訆' },
  '竦斯':   { id:'bs_songsi', el:'火', drop:'bs_songsi_r', py:'sǒng sī',
              note:'其状如雌雉而人面，其鸣自呼，见人则跃' },
  '旄牛':   { id:'bs_maoniu', el:'土', drop:'bs_maoniu_r', py:'máo niú',
              note:'其状如牛，而四节生毛' },
  '长蛇':   { id:'bs_changshe', el:'水', drop:'bs_changshe_r', py:'cháng shé',
              note:'其毛如彘豪，其音如鼓柝' },
  '鸤鸠':   { id:'bs_shijiu', el:'木', drop:'bs_shijiu_r', py:'shī jiū',
              note:'原文未详述形态' },
  '䰽䰽之鱼':   { id:'bs_peiyu', el:'水', drop:'bs_peiyu_r',
              note:'原文未详述形态——食之杀人' },
  '䲃鱼':   { id:'bs_jizuyu', el:'水', drop:'bs_jizuyu_r',
              note:'其状如鲤而鸡足——食之已疣' },
  '鮨鱼':   { id:'bs_qiyu', el:'水', drop:'bs_qiyu_r', py:'yì',
              note:'鱼身而犬首，其音如婴儿——食之已狂' },
  '狕':   { id:'bs_yao', el:'金', drop:'bs_yao_r', py:'yǎo',
              note:'其状如豹而文首' },
  '龙龟':   { id:'bs_longgui', el:'水', drop:'bs_longgui_r', py:'lóng guī',
              note:'原文未详述形态' },
  '白䳑':   { id:'bs_baiyou', el:'火', drop:'bs_baiyou_r',
              note:'原文未详述形态' },
  '鮆鱼':   { id:'bs_jiyu', el:'水', drop:'bs_jiyu_r', py:'jì',
              note:'其状如鯈而赤鳞，其音如叱——食之不骄' },
  '𩣡马':   { id:'bs_yijiaoma', el:'金', drop:'bs_yijiaoma_r',
              note:'牛尾而白身，一角，其音如呼' },
  '独𤞞':   { id:'bs_duyi', el:'金', drop:'bs_duyi_r', py:'dú yì',
              note:'其状如虎，而白身犬首，马尾彘鬣' },
  '𪄀𪃑':   { id:'bs_renmian', el:'火', drop:'bs_renmian_r',
              note:'其状如乌，人面，宵飞而昼伏——食之已暍（中暑）' },
  '居暨':   { id:'bs_juji', el:'土', drop:'bs_juji_r', py:'jū jì',
              note:'其状如汇（猬）而赤毛，其音如豚' },
  '䱇':   { id:'bs_dan', el:'水', drop:'bs_dan_r',
              note:'原文未详述形态' },
  '怪蛇':   { id:'bs_guaishe', el:'水', drop:'bs_guaishe_r', py:'guài shé',
              note:'原文未详述形态' },
  '闾':   { id:'bs_lv', el:'木', drop:'bs_lv_r', py:'lǘ',
              note:'原文未详述形态' },
  '䴼':   { id:'bs_shanhuan', el:'土', drop:'bs_shanhuan_r',
              note:'其状如麢羊而四角，马尾而有距，其鸣自訆，善还' },
  '䴅':   { id:'bs_liuzu', el:'火', drop:'bs_liuzu_r',
              note:'其状如鹊，白身、赤尾、六足，其鸣自詨，是善惊' },
  '天马':   { id:'bs_tianma', el:'金', drop:'bs_tianma_r', py:'tiān mǎ',
              note:'其状如白犬而黑头，其鸣自訆，见人则飞' },
  '鶌鶋':   { id:'bs_quju', el:'火', drop:'bs_quju_r', py:'qú jū',
              note:'其状如乌，首白而身青、足黄，其鸣自詨——食之不饥，可以已寓（健忘）' },
  '飞鼠':   { id:'bs_feishu', el:'土', drop:'bs_feishu_r', py:'fēi shǔ',
              note:'其状如兔而鼠首，以其背飞' },
  '领胡':   { id:'bs_linghu', el:'土', drop:'bs_linghu_r', py:'lǐng hú',
              note:'其状如牛而赤尾，其颈肾，其状如句瞿，其鸣自詨——食之已狂' },
  '象蛇':   { id:'bs_xiangshe', el:'火', drop:'bs_xiangshe_r', py:'xiàng shé',
              note:'其状如雌雉，而五采以文，其鸣自詨，是自为牝牡' },
  '䱤父之鱼':   { id:'bs_zhishen', el:'水', drop:'bs_zhishen_r',
              note:'其状如鲋鱼，鱼首而彘身——食之已呕' },
  '肥遗之蛇':   { id:'bs_feiyishe', el:'水', drop:'bs_feiyishe_r', py:'féi yí zhī shé',
              note:'北山第四处「肥遗」记载——同名异物（西山肥𧔥一鸟、浑夕肥遗一蛇，各不同物）' },
  '鸪䳡':   { id:'bs_guxiu', el:'火', drop:'bs_guxiu_r', py:'gū xiū',
              note:'其状如乌而白文——食之不灂（目昏）' },
  '黄鸟':   { id:'bs_huangniao', el:'火', drop:'bs_huangniao_r', py:'huáng niǎo',
              note:'其状如枭而白首，其鸣自詨——食之不妒' },
  '飞虫':   { id:'bs_feichong', el:'木', drop:'bs_feichong_r', py:'fēi chóng',
              note:'原文未详述形态' },
  '鳠':   { id:'bs_hu', el:'水', drop:'bs_hu_r', py:'hù',
              note:'原文未详述形态' },
  '黾':   { id:'bs_meng', el:'水', drop:'bs_meng_r', py:'měng',
              note:'原文未详述形态' },
  '䍶䍶':   { id:'bs_yimu', el:'土', drop:'bs_yimu_r',
              note:'其状如羊，一角一目，目在耳后，其鸣自訆' },
  '鹠':   { id:'bs_liu', el:'火', drop:'bs_liu_r', py:'liú',
              note:'原文未详述形态' },
  '师鱼':   { id:'bs_shiyu2', el:'水', drop:'bs_shiyu_r', py:'shī yú',
              note:'原文未详述形态——食之杀人' },
  '獂':   { id:'bs_huan', el:'土', drop:'bs_huan_r', py:'huán',
              note:'其状如牛而三足，其鸣自詨' },
  '蒲夷之鱼':   { id:'bs_puyi', el:'水', drop:'bs_puyi_r', py:'pú yí zhī yú',
              note:'原文未详述形态' },
  // ===== 中山经首录三系（中次一经/中次二经/中次三经，29 山）=====
  // 循北山 bs_ 先例以 zs_ 前缀补录；豪鱼渔表 zs_haoyu 与异兽实体 zs_haoyu2 双层并存
  // （同北山滑鱼类先例）；飞鱼同名异地（牛首之山/騩山）且两山效果不同，仅入渔表单层。
  // 武罗/泰逢为神祇（category 神祇、无 meta）——不讨伐，走 region.deity 与图鉴祠典。
  '㔮':     { id:'zs_nao',     el:'土', drop:'zs_nao_r',    py:'náo',      note:'其状如𤠢鼠而文题——食之已瘿' },
  '豪鱼':   { id:'zs_haoyu2',  el:'水', drop:'zs_haoyu_r',  py:'háo',      note:'状如鲔，而赤喙赤尾赤羽——可以已白癣' },
  '朏朏':   { id:'zs_feifei',  el:'金', drop:'zs_feifei_r', py:'fěi',      note:'其状如狸，而白尾有鬛——养之可以已忧' },
  '鸣蛇':   { id:'zs_mingshe', el:'水', drop:'zs_mingshe_r',py:'míng shé', note:'其状如蛇而四翼，其音如磬——见则其邑大旱' },
  '化蛇':   { id:'zs_huashe',  el:'水', drop:'zs_huashe_r', py:'huà shé',  note:'其状如人面而豺身，鸟翼而蛇行，其音如叱呼——见则其邑大水' },
  '蠪蚳':   { id:'zs_longchi', el:'土', drop:'zs_longchi_r',py:'lóng chì', note:'其状如彘而有角，其音如号——食之不眯' },
  '马腹':   { id:'zs_mafu',    el:'金', drop:'zs_mafu_r',   py:'mǎ fù',  man:true, note:'其状如人面虎身，其音如婴儿——是食人' },
  '夫诸':   { id:'zs_fuzhu',   el:'土', drop:'zs_fuzhu_r',  py:'fū zhū',   note:'其状如白鹿而四角——见则其邑大水' },
  '鴢':     { id:'zs_yao',     el:'火', drop:'zs_yao_r',    py:'yǎo',      note:'其状如凫，青身而朱目赤尾——食之宜子' },
  // ===== 中次四经（厘山九山）=====  —— 羬羊/人鱼/㸲牛/赤鷩已在他经存在，复用其 meta
  '䴦':     { id:'zs_yin',     el:'土', drop:'zs_yin_r',    py:'yín',      note:'其状如貉而人目' },
  '犀渠':   { id:'zs_xiqu',    el:'土', drop:'zs_xiqu_r',   py:'xī qú',  man:true, note:'其状如牛，苍身，其音如婴儿——是食人' },
  '𤢺':     { id:'zs_xie',     el:'水', drop:'zs_xie_r',    py:'xié',      note:'其状如獳犬而有鳞，其毛如彘鬣' },
  // 中次五经：机谷䲦鸟（三目怪鸟，音如鹿鸣）与尸山麖（水鹿）
  '䲦鸟':   { id:'zs_dainiao', el:'火', drop:'niaoyu',      py:'dài',      note:'其状如枭而三目，有耳，其音如录——食之已垫' },
  '麖':     { id:'zs_jing',    el:'木', drop:'zs_jing_r',   py:'jīng',      note:'其兽多麖——水鹿（马鹿类），尸山所产' },
  // 中次六经：廆山鸰䳩（赤如丹火）、橐水修辟之鱼、夸父桃林之马
  '鸰䳩':   { id:'zs_lingyao', el:'火', drop:'zs_lingyao_r', py:'líng yāo',  note:'状如山鸡而长尾，赤如丹火而青喙，其鸣自呼——服之不眯' },
  '修辟之鱼':{ id:'zs_xiupiyu',el:'水', drop:'zs_xiupiyu_r', py:'xiū pì',    note:'状如黾而白喙，其音如鸱——食之已白癣' },
  '马':     { id:'zs_ma',      el:'土', drop:'zs_ma_r',      hunt:true,      note:'夸父之山北有桃林，广员三百里，其中多马' },
  // 中次七经：苦山山膏（赤若丹火，善詈）、放皋文文、大𩇵三足龟、半石鯩鱼鰧鱼、少室䱱鱼
  '山膏':   { id:'zs_shangao',   el:'火', drop:'zs_shangao_r',   py:'shān gāo',  note:'其状如逐（豕），赤若丹火——善詈' },
  '文文':   { id:'zs_wenwen',    el:'木', drop:'zs_wenwen_r',    py:'wén wén',   note:'其状如蜂，枝尾而反舌——善呼' },
  '三足龟': { id:'zs_sanzuigui', el:'水', drop:'zs_sanzuigui_r', py:'sān zú guī',note:'食者无大疾，可以已肿' },
  '鯩鱼':   { id:'zs_lunyu',     el:'水', drop:'zs_lunyu_r',     py:'lún',       note:'黑文，其状如鲋——食者不睡' },
  '鰧鱼':   { id:'zs_tengyu',    el:'水', drop:'zs_tengyu_r',    py:'téng',      note:'状如鳜，居逵，苍文赤尾——食者不痈，可以为瘘' },
  '䱱鱼':   { id:'zs_tiyu',      el:'水', drop:'zs_tiyu_r',      py:'tí',        note:'状如盩蜼而长距，足白而对——食者无蛊疾，可以御兵' },
  // 中次八经：荆山文鱼鲛鱼、女几白鷮鸩鸟、琴鼓白犀
  '文鱼':   { id:'zs_wenyu',   el:'水', drop:'zs_wenyu_r',   py:'wén',   note:'雎水之中多文鱼——有斑文之鱼' },
  '鲛鱼':   { id:'zs_jiaoyu',  el:'水', drop:'zs_jiaoyu_r',  py:'jiāo',  note:'漳水之中多鲛鱼——鲨属，皮可为甲' },
  '白鷮':   { id:'zs_baijiao', el:'金', drop:'zs_baijiao_r', py:'jiāo',  note:'雉类而白，尾长——其羽可为饰' },
  '鸩':     { id:'zs_zhen',    el:'火', drop:'zs_zhen_r',    py:'zhèn',  note:'毒鸟——以羽画酒，饮之立死' },
  '白犀':   { id:'zs_baixi2',  el:'土', drop:'zs_baixi2_r',  py:'xī',    note:'犀而色白，一角——其角通灵，可解毒' },
  // 中次九经：崌山窃脂（御火）、蛇山𤜣狼（见则国内有兵）、岷山鼍与夔牛、崌山䲀鱼
  '窃脂':   { id:'zs_qiezhi',  el:'火', drop:'zs_qiezhi_r',  py:'qiè zhī', note:'状如鸮而赤身白首，可以御火' },
  '𤜣狼':   { id:'zs_yilang',  el:'金', drop:'zs_yilang_r',  py:'yǐ láng', note:'状如狐而白尾长耳，见则国内有兵' },
  '鼍':     { id:'zs_tuo',     el:'水', drop:'zs_tuo_r',     py:'tuó',     note:'似蜥蜴而大，长丈余——即扬子鳄，皮可为鼓' },
  '夔牛':   { id:'zs_kuiniu',  el:'土', drop:'zs_kuiniu_r',  py:'kuí',     note:'牛形无角，苍身——其声如雷，皮可为鼓' },
  '䲀鱼':   { id:'zs_zhiyu',   el:'水', drop:'zs_zhiyu_r',   py:'zhì',     note:'江水多䲀鱼——鱼而多刺，骨可疗' },
  // 中次十经：复州跂踵（见则大疫）、又原鸜鹆（八哥）
  '跂踵':   { id:'zs_qizhong', el:'火', drop:'zs_qizhong_r', py:'qí zhǒng', note:'状如鸮而一足、彘尾，见则其国大疫' },
  '鸜鹆':   { id:'zs_qiyu',    el:'木', drop:'zs_qiyu_r',    py:'qú yù',    note:'即八哥——黑羽白点，能效人言' },
  // 中次十一经：雍和/青耕/獜/𤜢/狙如/𤝻即/梁渠/䳅鵌/闻𧲂/三足鳖/婴勺
  '雍和':   { id:'zs_yonghe',  el:'土', drop:'zs_yonghe_r',  py:'yōng hé', note:'其状如猿，赤目、赤喙、黄身，见则国有大恐' },
  '青耕':   { id:'zs_qinggeng',el:'木', drop:'zs_qinggeng_r',py:'qīng gēng',note:'其状如鹊，青身白喙，白目白尾，可以御疫' },
  '獜':     { id:'zs_lin',     el:'金', drop:'zs_lin_r',     py:'lín',     note:'其状如犬，虎爪有甲，善駚𤘝，食者不风' },
  '𤜢':     { id:'zs_li',      el:'火', drop:'zs_li_r',      py:'lì',      note:'其状如汇（猬），赤如丹火，见则其国大疫' },
  '狙如':   { id:'zs_juru',    el:'金', drop:'zs_juru_r',    py:'jū rú',   note:'其状如鼣鼠，白耳白喙，见则其国有大兵' },
  '𤝻即':   { id:'zs_yiji',    el:'火', drop:'zs_yiji_r',    py:'yí jí',   note:'其状如膜大，赤喙、赤目、白尾，见则其邑有火' },
  '梁渠':   { id:'zs_liangqu', el:'金', drop:'zs_liangqu_r', py:'liáng qú',note:'其状如狸而白首虎爪，见则其国有大兵' },
  '䳅鵌':   { id:'zs_zhetu',   el:'火', drop:'zs_zhetu_r',   py:'zhǐ tú',  note:'其状如乌而赤足，可以御火' },
  '闻𧲂':   { id:'zs_wenlin',  el:'木', drop:'zs_wenlin_r',  py:'wén lín', note:'其状如彘，黄身、白头、白尾，见则天下大风' },
  '三足鳖': { id:'zs_sanzubie',el:'水', drop:'zs_sanzubie_r',py:'sān zú biē',note:'三足而枝尾，食之无蛊疫' },
  '婴勺':   { id:'zs_yingshao',el:'水', drop:'zs_yingshao_r',py:'yīng sháo',note:'其状如鹊，赤目、赤喙、白身，其尾若勺，其鸣自呼' },
  // 中次十二经：即公之山蛫（御火）、暴山就（鹫）、柴桑白蛇飞蛇、阳帝麝
  '蛫':     { id:'zs_gui2',    el:'水', drop:'zs_gui2_r',    py:'guǐ',    note:'其状如龟而白身赤首，可以御火' },
  '就':     { id:'zs_jiu',     el:'金', drop:'zs_jiu_r',     py:'jiù',    note:'即鹫——黑色猛禽，其羽可为箭翎' },
  '飞蛇':   { id:'zs_feishe',  el:'木', drop:'zs_feishe_r',  py:'fēi shé',note:'蛇而有翼，能飞，乘雾而行' },
  // ===== 东山经（四系 46 山）=====  —— 常兽虎/麋/鹿/大蛇/䱻鱼已在他经存在，复用其 meta
  '鳙鳙之鱼':{ id:'ds_yongyu',  el:'水', drop:'ds_yongyu_r' },
  '从从':    { id:'ds_congcong',el:'土', drop:'ds_congcong_r' },
  '䖪鼠':    { id:'ds_zhishu',  el:'土', drop:'ds_zhishu_r' },
  '箴鱼':    { id:'ds_zhenyu',  el:'水', drop:'ds_zhenyu_r' },
  '鳡鱼':    { id:'ds_ganyu',   el:'水', drop:'ds_ganyu_r' },
  '堪㐨之鱼':{ id:'ds_kanxuyu', el:'水', drop:'ds_kanxuyu_r' },
  '䖺䗤':    { id:'ds_taohuang',el:'木', drop:'ds_taohuang_r' },
  '狪狪':    { id:'ds_tangtang',el:'土', drop:'ds_tangtang_r' },
  '軨軨':    { id:'ds_lingling',el:'木', drop:'ds_lingling_r' },
  '蜃珧':    { id:'ds_shenrao', el:'水', drop:'ds_shenrao_r' },
  '珠蟞鱼':  { id:'ds_zhubieyu',el:'水', drop:'ds_zhubieyu_r' },
  '犰狳':    { id:'ds_qiuyu',   el:'土', drop:'ds_qiuyu_r' },
  '朱獳':    { id:'ds_zhunu',   el:'火', drop:'ds_zhunu_r' },
  '鵹鹕':    { id:'ds_lihu',    el:'水', drop:'ds_lihu_r' },
  '獙獙':    { id:'ds_bibi',    el:'火', drop:'ds_bibi_r' },
  '蠪姪':    { id:'ds_longzhi', el:'火', drop:'ds_longzhi_r', man:true },
  '峳峳':    { id:'ds_youyou',  el:'水', drop:'ds_youyou_r' },
  '絜钩':    { id:'ds_xiegou',  el:'木', drop:'ds_xiegou_r' },
  '妴胡':    { id:'ds_yuanhu',  el:'水', drop:'ds_yuanhu_r' },
  '寐鱼':    { id:'ds_meiyu',   el:'水', drop:'ds_meiyu_r' },
  '蠵龟':    { id:'ds_xigui',   el:'水', drop:'ds_xigui_r' },
  '鮯鮯之鱼':{ id:'ds_jiajiayu',el:'水', drop:'ds_jiajiayu_r' },
  '精精':    { id:'ds_jingjing',el:'木', drop:'ds_jingjing_r' },
  '猲狙':    { id:'ds_heju',    el:'火', drop:'ds_heju_r', man:true },
  '鬿雀':    { id:'ds_qique',   el:'火', drop:'ds_qique_r', man:true },
  '鱃鱼':    { id:'ds_xiuyu',   el:'水', drop:'ds_xiuyu_r' },
  '茈鱼':    { id:'ds_ziyu',    el:'火', drop:'ds_ziyu_r' },
  '薄鱼':    { id:'ds_boyu',    el:'水', drop:'ds_boyu_r' },
  '当康':    { id:'ds_dangkang',el:'金', drop:'ds_dangkang_r' },
  '合窳':    { id:'ds_hey',     el:'土', drop:'ds_hey_r', man:true },
  '蜚':      { id:'ds_fei',     el:'木', drop:'ds_fei_r' },

  // ===== 补：四只「有兆无兽」的异兽 =====
  // 这四座山的原文都写明「见则 X」，征兆表（OMENS）早已生成，但异兽本身没有实体，
  // 而征兆靠「首次著录该兽」触发（recordObject → Monsters[id].omen），
  // 于是这 4 条征兆永远收集不到（42 条里死 4 条）。这里补上实体，征兆随之复活。
  '山𤟤':  { id:'shanhui',  el:'土', drop:'shoupi',  py:'shān huī',
              note:'其状如犬而人面，见则天下大风——北山「大风」之兆由此兽而起' },
  '酸与':  { id:'suanyu',   el:'火', drop:'niaoyu',  py:'suān yǔ',
              note:'其状如蛇而四翼、六目、三足，见则其邑有恐' },
  '（未名鸟）': { id:'xiaomian', el:'火', drop:'niaoyu', display:'鸮面鸟',
              note:'其状如鸮而人面，蜼身犬尾，见则其邑大旱（原文未载其名，姑以形称之）' },
  '（未名兽）': { id:'kuafushou', el:'木', drop:'shoupi', display:'彘毛兽',
              note:'其状如夸父而彘毛，见则天下大水（原文未载其名）' },
};

// 东山经异兽掉落物（自研；形态/效果以原文为准，数值与节点等次挂钩）
addItem(
  I('ds_yongyu_r','鳙鳙之鱼肉','food',{value:24,xp:60,lvl:71,icon:'🐟',py:'yōng'}),
  I('ds_congcong_r','从从皮','material',{value:20,xp:52,lvl:71,icon:'🐾'}),
  I('ds_zhishu_r','䖪鼠羽','material',{value:18,xp:48,lvl:71,icon:'🪶'}),
  I('ds_zhenyu_r','箴鱼','food',{value:22,xp:56,lvl:72,icon:'🐟'}),
  I('ds_ganyu_r','鳡鱼','food',{value:22,xp:56,lvl:72,icon:'🐟'}),
  I('ds_kanxuyu_r','堪㐨之鱼','food',{value:26,xp:64,lvl:72,icon:'🐟'}),
  I('ds_taohuang_r','䖺䗤','material',{value:24,xp:60,lvl:71,icon:'🐍'}),
  I('ds_tangtang_r','狪狪珠','material',{value:30,xp:74,lvl:73,icon:'🔮'}),
  I('ds_lingling_r','軨軨纹皮','material',{value:28,xp:70,lvl:73,icon:'🐂'}),
  I('ds_shenrao_r','蜃珧珠','material',{value:34,xp:84,lvl:74,icon:'🦪'}),
  I('ds_zhubieyu_r','珠蟞鱼珠','material',{value:36,xp:88,lvl:74,icon:'🐚'}),
  I('ds_qiuyu_r','犰狳毛','material',{value:22,xp:56,lvl:73,icon:'🪶'}),
  I('ds_zhunu_r','朱獳翼','material',{value:24,xp:60,lvl:74,icon:'🪽'}),
  I('ds_lihu_r','鵹鹕足','material',{value:24,xp:60,lvl:74,icon:'🦆'}),
  I('ds_bibi_r','獙獙尾','material',{value:26,xp:64,lvl:74,icon:'🦊'}),
  I('ds_longzhi_r','蠪姪首','material',{value:40,xp:96,lvl:78,icon:'🔥'}),
  I('ds_youyou_r','峳峳目','material',{value:26,xp:64,lvl:75,icon:'👁'}),
  I('ds_xiegou_r','絜钩尾','material',{value:24,xp:60,lvl:75,icon:'🪶'}),
  I('ds_yuanhu_r','妴胡目','material',{value:26,xp:64,lvl:76,icon:'👁'}),
  I('ds_meiyu_r','寐鱼','food',{value:28,xp:70,lvl:76,icon:'🐟'}),
  I('ds_xigui_r','蠵龟甲','material',{value:38,xp:92,lvl:77,icon:'🐢'}),
  I('ds_jiajiayu_r','鮯鮯之鱼','food',{value:30,xp:76,lvl:77,icon:'🐟'}),
  I('ds_jingjing_r','精精尾','material',{value:26,xp:64,lvl:78,icon:'🐎'}),
  I('ds_heju_r','猲狙首','material',{value:40,xp:96,lvl:80,icon:'🔥'}),
  I('ds_qique_r','鬿雀羽','material',{value:42,xp:100,lvl:80,icon:'🪶'}),
  I('ds_xiuyu_r','鱃鱼','food',{value:32,xp:80,lvl:81,icon:'🐟'}),
  I('ds_ziyu_r','茈鱼','food',{value:30,xp:76,lvl:79,icon:'🐟'}),
  I('ds_boyu_r','薄鱼','food',{value:30,xp:76,lvl:79,icon:'🐟'}),
  I('ds_dangkang_r','当康牙','material',{value:34,xp:84,lvl:80,icon:'🐗'}),
  I('ds_hey_r','合窳牙','material',{value:42,xp:100,lvl:81,icon:'🐗'}),
  I('ds_fei_r','蜚毒腺','material',{value:48,xp:112,lvl:81,icon:'☣'})
);

// 北山经具名异兽掉落物（自研；形态/效果以原文为准，数值与节点等次挂钩）
addItem(
  I('bs_huayu_r','滑鱼肉','food',{value:16,xp:40,lvl:53,icon:'🐟',heal:40,effect:'食之已疣',py:'huá yú'}),
  I('bs_shuima_r','水马皮','material',{value:16,xp:40,lvl:53,icon:'🐾',py:'shuǐ mǎ'}),
  I('bs_tiaoyu_r','鯈鱼肉','food',{value:16,xp:40,lvl:53,icon:'🐟',heal:40,effect:'食之可以已忧',py:'tiáo'}),
  I('bs_heluoyu_r','何罗鱼肉','food',{value:18,xp:46,lvl:54,icon:'🐟',heal:50,effect:'食之已痈',py:'hé luó'}),
  I('bs_fan_r','蕃羽','material',{value:18,xp:46,lvl:54,icon:'🪶',py:'fán'}),
  I('bs_mengji_r','孟极皮','material',{value:20,xp:50,lvl:55,icon:'🐆',py:'mèng jí'}),
  I('bs_youyan_r','幽鴳皮','material',{value:20,xp:50,lvl:55,icon:'🐒',py:'yōu yàn'}),
  I('bs_zuzi_r','足訾蹄','material',{value:20,xp:50,lvl:55,icon:'🐾',py:'zú zī'}),
  I('bs_jiao_r','䴔羽','material',{value:20,xp:50,lvl:55,icon:'🪶',effect:'食之已风',py:'jiāo'}),
  I('bs_zhujian_r','诸犍皮','material',{value:20,xp:50,lvl:55,icon:'🐆',py:'zhū jiān'}),
  I('bs_baiye_r','白鵺羽','material',{value:20,xp:50,lvl:55,icon:'🪶',effect:'食之已嗌痛，可以已痸',py:'bái yè'}),
  I('bs_nafu_r','那父角','material',{value:20,xp:50,lvl:55,icon:'🐂'}),
  I('bs_songsi_r','竦斯羽','material',{value:20,xp:50,lvl:55,icon:'🪶',py:'sǒng sī'}),
  I('bs_maoniu_r','旄牛毛','material',{value:20,xp:50,lvl:55,icon:'🧶',py:'máo niú'}),
  I('bs_changshe_r','长蛇皮','material',{value:22,xp:56,lvl:56,icon:'🐍',py:'cháng shé'}),
  I('bs_shijiu_r','鸤鸠羽','material',{value:22,xp:56,lvl:56,icon:'🪶',py:'shī jiū'}),
  I('bs_peiyu_r','䰽䰽鱼肉','food',{value:22,xp:56,lvl:56,icon:'🐟',effect:'食之杀人'}),
  I('bs_jizuyu_r','䲃鱼肉','food',{value:24,xp:60,lvl:57,icon:'🐟',heal:60,effect:'食之已疣'}),
  I('bs_qiyu_r','鮨鱼肉','food',{value:24,xp:60,lvl:57,icon:'🐟',heal:60,effect:'食之已狂',py:'yì'}),
  I('bs_yao_r','狕皮','material',{value:26,xp:64,lvl:58,icon:'🐆',py:'yǎo'}),
  I('bs_longgui_r','龙龟甲','material',{value:26,xp:64,lvl:58,icon:'🐢',py:'lóng guī'}),
  I('bs_baiyou_r','白䳑羽','material',{value:26,xp:64,lvl:58,icon:'🪶'}),
  I('bs_jiyu_r','鮆鱼肉','food',{value:26,xp:64,lvl:58,icon:'🐟',heal:70,effect:'食之不骄',py:'jì'}),
  I('bs_yijiaoma_r','𩣡马皮','material',{value:28,xp:70,lvl:59,icon:'🐴'}),
  I('bs_duyi_r','独𤞞皮','material',{value:30,xp:74,lvl:60,icon:'🐯',py:'dú yì'}),
  I('bs_renmian_r','𪄀𪃑羽','material',{value:30,xp:74,lvl:60,icon:'🪶',effect:'食之已暍（中暑）'}),
  I('bs_juji_r','居暨皮','material',{value:30,xp:74,lvl:60,icon:'🦔',py:'jū jì'}),
  I('bs_dan_r','䱇鳞','material',{value:32,xp:80,lvl:61,icon:'🐟'}),
  I('bs_guaishe_r','怪蛇皮','material',{value:32,xp:80,lvl:61,icon:'🐍',py:'guài shé'}),
  I('bs_lv_r','闾皮','material',{value:26,xp:64,lvl:58,icon:'🦌',py:'lǘ'}),
  I('bs_shanhuan_r','䴼角','material',{value:34,xp:84,lvl:62,icon:'🐐'}),
  I('bs_liuzu_r','䴅羽','material',{value:34,xp:84,lvl:62,icon:'🪶'}),
  I('bs_tianma_r','天马皮','material',{value:34,xp:84,lvl:62,icon:'🐕',py:'tiān mǎ'}),
  I('bs_quju_r','鶌鶋羽','material',{value:34,xp:84,lvl:62,icon:'🪶',effect:'食之不饥，可以已寓（健忘）',py:'qú jū'}),
  I('bs_feishu_r','飞鼠皮','material',{value:34,xp:84,lvl:62,icon:'🐇',py:'fēi shǔ'}),
  I('bs_linghu_r','领胡肉','food',{value:36,xp:88,lvl:63,icon:'🥩',heal:90,effect:'食之已狂',py:'lǐng hú'}),
  I('bs_xiangshe_r','象蛇羽','material',{value:36,xp:88,lvl:63,icon:'🪶',py:'xiàng shé'}),
  I('bs_zhishen_r','䱤父之鱼肉','food',{value:36,xp:88,lvl:63,icon:'🐟',heal:90,effect:'食之已呕'}),
  I('bs_feiyishe_r','肥遗之蛇皮','material',{value:38,xp:92,lvl:64,icon:'🐍',py:'féi yí zhī shé'}),
  I('bs_guxiu_r','鸪䳡羽','material',{value:40,xp:100,lvl:65,icon:'🪶',effect:'食之不灂（目昏）',py:'gū xiū'}),
  I('bs_huangniao_r','黄鸟羽','material',{value:40,xp:100,lvl:65,icon:'🪶',effect:'食之不妒',py:'huáng niǎo'}),
  I('bs_feichong_r','飞虫翅','material',{value:40,xp:100,lvl:65,icon:'🐛',py:'fēi chóng'}),
  I('bs_hu_r','鳠鳞','material',{value:44,xp:108,lvl:67,icon:'🐟',py:'hù'}),
  I('bs_meng_r','黾皮','material',{value:44,xp:108,lvl:67,icon:'🐸',py:'měng'}),
  I('bs_yimu_r','䍶䍶皮','material',{value:46,xp:112,lvl:68,icon:'🐐'}),
  I('bs_liu_r','鹠羽','material',{value:48,xp:116,lvl:69,icon:'🪶',py:'liú'}),
  I('bs_shiyu_r','师鱼肉','food',{value:48,xp:116,lvl:69,icon:'🐟',effect:'食之杀人',py:'shī yú'}),
  I('bs_huan_r','獂皮','material',{value:48,xp:116,lvl:69,icon:'🐂',py:'huán'}),
  I('bs_puyi_r','蒲夷之鱼鳞','material',{value:48,xp:116,lvl:69,icon:'🐟',py:'pú yí zhī yú'}),
);

// 中山经十二系具名异兽掉落物（五臧山经全录）（自研；形态/效果以原文为准，数值与节点等次挂钩）
// 帝之密都十二系 L69–81：主治草木线收官区，数值较北山同阶上浮约三成
addItem(
  I('zs_nao_r','㔮肉','food',{value:22,xp:52,lvl:69,icon:'🍖',heal:55,effect:'食之已瘿',py:'náo'}),
  I('zs_haoyu_r','豪鱼肉','food',{value:22,xp:52,lvl:69,icon:'🐟',heal:55,effect:'可以已白癣',py:'háo'}),
  I('zs_feifei_r','朏朏之尾','material',{value:26,xp:62,lvl:71,icon:'🪶',py:'fěi',note:'养之可以已忧——白尾有鬛'}),
  I('zs_mingshe_r','鸣蛇之翼','material',{value:28,xp:66,lvl:72,icon:'🪽',py:'míng shé',note:'四翼，其音如磬'}),
  I('zs_huashe_r','化蛇之皮','material',{value:28,xp:66,lvl:72,icon:'🐍',py:'huà shé',note:'人面豺身，鸟翼而蛇行'}),
  I('zs_longchi_r','蠪蚳之角','material',{value:28,xp:66,lvl:72,icon:'🦬',py:'lóng chì',note:'其状如彘而有角'}),
  I('zs_mafu_r','马腹之皮','material',{value:30,xp:72,lvl:73,icon:'🐆',py:'mǎ fù',note:'人面虎身，音如婴儿——是食人'}),
  I('zs_fuzhu_r','夫诸之角','material',{value:30,xp:72,lvl:73,icon:'🦌',py:'fū zhū',note:'其状如白鹿而四角'}),
  I('zs_yao_r','鴢肉','food',{value:30,xp:72,lvl:73,icon:'🍗',heal:75,effect:'食之宜子',py:'yǎo'}),
  // 中次四经：厘山三兽（䴦/犀渠/𤢺——犀渠食人，做 material 无 heal）
  I('zs_yin_r','䴦之皮','material',{value:24,xp:58,lvl:74,icon:'🦫',py:'yín',note:'其状如貉而人目'}),
  I('zs_xiqu_r','犀渠之皮','material',{value:26,xp:62,lvl:75,icon:'🐃',py:'xī qú',note:'其状如牛，苍身，音如婴儿——是食人'}),
  I('zs_xie_r','𤢺之鳞','material',{value:26,xp:62,lvl:75,icon:'🐕',py:'xié',note:'其状如獳犬而有鳞，其毛如彘鬣'}),
  // 中次五经：尸山麖（水鹿）
  I('zs_jing_r','麖之皮','material',{value:26,xp:62,lvl:75,icon:'🦌',py:'jīng',note:'其兽多麖——水鹿（马鹿类）'}),
  // 中次六经：廆山鸰䳩、橐水修辟之鱼、桃林之马
  I('zs_lingyao_r','鸰䳩羽','material',{value:28,xp:66,lvl:76,icon:'🪶',py:'líng yāo',note:'赤如丹火而青喙——服之不眯'}),
  I('zs_xiupiyu_r','修辟之鱼肉','food',{value:28,xp:66,lvl:76,icon:'🐟',heal:70,effect:'食之已白癣',py:'xiū pì'}),
  I('zs_ma_r','马之皮','material',{value:30,xp:70,lvl:76,icon:'🐎',note:'桃林之中多马——夸父之山'}),
  // 中次七经：山膏、文文、三足龟、鯩鱼、鰧鱼、䱱鱼
  I('zs_shangao_r','山膏之脂','material',{value:30,xp:70,lvl:77,icon:'🐗',py:'shān gāo',note:'其状如逐，赤若丹火——善詈'}),
  I('zs_wenwen_r','文文之翼','material',{value:26,xp:64,lvl:76,icon:'🐝',py:'wén wén',note:'状如蜂，枝尾而反舌'}),
  I('zs_sanzuigui_r','三足龟甲','material',{value:32,xp:74,lvl:77,icon:'🐢',py:'sān zú guī',note:'食者无大疾，可以已肿'}),
  I('zs_lunyu_r','鯩鱼肉','food',{value:28,xp:66,lvl:76,icon:'🐟',heal:70,effect:'食者不睡',py:'lún'}),
  I('zs_tengyu_r','鰧鱼肉','food',{value:30,xp:70,lvl:76,icon:'🐟',heal:75,effect:'食者不痈，可以为瘘',py:'téng'}),
  I('zs_tiyu_r','䱱鱼肉','food',{value:32,xp:74,lvl:77,icon:'🐟',heal:80,effect:'食者无蛊疾，可以御兵',py:'tí'}),
  // 中次八经：文鱼、鲛鱼、白鷮、鸩、白犀
  I('zs_wenyu_r','文鱼之鳞','material',{value:34,xp:76,lvl:77,icon:'🐟',py:'wén',note:'雎水多文鱼——鳞有斑文'}),
  I('zs_jiaoyu_r','鲛鱼之皮','material',{value:38,xp:82,lvl:77,icon:'🦈',py:'jiāo',note:'鲛皮可为甲，坚利' }),
  I('zs_baijiao_r','白鷮之羽','material',{value:30,xp:70,lvl:77,icon:'🪶',py:'jiāo',note:'其羽可为饰——女几之山多白鷮'}),
  I('zs_zhen_r','鸩羽','material',{value:44,xp:90,lvl:78,icon:'☠️',py:'zhèn',note:'羽有剧毒——以羽画酒，饮之立死'}),
  I('zs_baixi2_r','白犀之角','material',{value:52,xp:100,lvl:78,icon:'🦏',py:'xī',note:'犀而色白，一角——通灵解毒'}),
  // 中次九经：窃脂、𤜣狼、鼍、夔牛、䲀鱼
  I('zs_qiezhi_r','窃脂之羽','material',{value:40,xp:86,lvl:78,icon:'🪶',py:'qiè zhī',note:'状如鸮而赤身白首——可以御火'}),
  I('zs_yilang_r','𤜣狼之尾','material',{value:42,xp:88,lvl:78,icon:'🦊',py:'yǐ láng',note:'状如狐而白尾长耳——见则国内有兵'}),
  I('zs_tuo_r','鼍皮','material',{value:46,xp:94,lvl:78,icon:'🐊',py:'tuó',note:'鼍皮可为鼓，声闻数里'}),
  I('zs_kuiniu_r','夔牛之革','material',{value:50,xp:98,lvl:78,icon:'🐂',py:'kuí',note:'夔牛皮可为鼓，其声如雷'}),
  I('zs_zhiyu_r','䲀鱼之骨','material',{value:34,xp:76,lvl:78,icon:'🐟',py:'zhì',note:'鱼而多刺——其骨可疗'}),
  // 中次十经：跂踵、鸜鹆
  I('zs_qizhong_r','跂踵之羽','material',{value:44,xp:90,lvl:78,icon:'🪶',py:'qí zhǒng',note:'状如鸮而一足、彘尾——见则其国大疫'}),
  I('zs_qiyu_r','鸜鹆之舌','material',{value:36,xp:78,lvl:78,icon:'🐦',py:'qú yù',note:'八哥舌——剪而捻之，能效人言'}),
  // 中次十一经：雍和、青耕、獜、𤜢、狙如、𤝻即、梁渠、䳅鵌、闻𧲂、三足鳖、婴勺
  I('zs_yonghe_r','雍和之皮','material',{value:56,xp:106,lvl:79,icon:'🐒',py:'yōng hé',note:'赤目赤喙黄身——见则国有大恐'}),
  I('zs_qinggeng_r','青耕之羽','material',{value:50,xp:98,lvl:79,icon:'🪶',py:'qīng gēng',note:'青身白喙——可以御疫'}),
  I('zs_lin_r','獜之甲','material',{value:58,xp:110,lvl:79,icon:'🛡️',py:'lín',note:'虎爪有甲——食者不风'}),
  I('zs_li_r','𤜢之毛','material',{value:54,xp:102,lvl:79,icon:'🦔',py:'lì',note:'赤如丹火——见则其国大疫'}),
  I('zs_juru_r','狙如之耳','material',{value:52,xp:100,lvl:79,icon:'🐭',py:'jū rú',note:'白耳白喙——见则其国有大兵'}),
  I('zs_yiji_r','𤝻即之尾','material',{value:52,xp:100,lvl:80,icon:'🦊',py:'yí jí',note:'赤喙赤目白尾——见则其邑有火'}),
  I('zs_liangqu_r','梁渠之爪','material',{value:56,xp:106,lvl:80,icon:'🐆',py:'liáng qú',note:'白首虎爪——见则其国有大兵'}),
  I('zs_zhetu_r','䳅鵌之羽','material',{value:48,xp:94,lvl:80,icon:'🐦',py:'zhǐ tú',note:'状如乌而赤足——可以御火'}),
  I('zs_wenlin_r','闻𧲂之革','material',{value:60,xp:114,lvl:80,icon:'🐖',py:'wén lín',note:'黄身白头白尾——见则天下大风'}),
  I('zs_sanzubie_r','三足鳖甲','food',{value:46,xp:92,lvl:79,icon:'🐢',heal:90,effect:'食之无蛊疫',py:'sān zú biē',note:'三足而枝尾'}),
  I('zs_yingshao_r','婴勺之尾','material',{value:44,xp:88,lvl:79,icon:'🐦',py:'yīng sháo',note:'其尾若勺——其鸣自呼'}),
  // 中次十二经：蛫、就、白蛇、飞蛇、麝
  I('zs_gui2_r','蛫之甲','material',{value:62,xp:116,lvl:80,icon:'🐢',py:'guǐ',note:'白身赤首——可以御火'}),
  I('zs_jiu_r','就之羽','material',{value:54,xp:102,lvl:80,icon:'🦅',py:'jiù',note:'即鹫——其羽可为箭翎'}),
  I('zs_baishe_r','白蛇之胆','material',{value:58,xp:108,lvl:81,icon:'🐍',py:'bái shé',note:'蛇而色白——其胆入药'}),
  I('zs_feishe_r','飞蛇之翼','material',{value:60,xp:112,lvl:81,icon:'🪽',py:'fēi shé',note:'蛇而有翼，乘雾而行'}),
  I('zs_she_r','麝香','material',{value:66,xp:120,lvl:81,icon:'🦌',py:'shè xiāng',note:'脐有香——即麝香，通窍开郁'}),
);

// 祷过之山「多犀、兕、多象」——可猎之兽（非异兽）
const HUNT_META = {
  '犀': { id:'xi',    el:'土', drop:'xipi',    extra:'xirou' },
  '兕': { id:'si',    el:'土', drop:'sipi',    extra:'sirou' },
  '象': { id:'xiang', el:'土', drop:'xiangya', extra:'shougu' },
};

// 血量 / 攻击 / 经验的成长指数必须与玩家的成长曲线同阶，否则中后期会出现「硬墙」：
// 玩家伤害只按「兵器 + 技能×1.2」线性走、气血按「20 + 体魄×4」线性走，
// 而怪血曾是 L^1.55、怪攻是 L^1.15 —— 两条线在 30 级之后彻底岔开，
// 同级怪要砍 50 秒、玩家 9 秒就被打倒，复讨只是无限重来，一级也升不上去。
// 现改为：怪血 L^1.26（同级单杀 10–20 秒）、怪攻 L^1.02（同级能挨十数下）、
// 经验同步降到 L^1.36，使「杀几只升一级」的节奏与原曲线基本持平。
// 校验见 test/engine.test.js「战斗节奏」一节与 scripts/audit-data.js 的 TTK 扫描。
function beastStat(L, kind){
  let hp = 10 + 4.6*Math.pow(L, 1.26);
  let atk = 2 + 0.62*Math.pow(L, 1.02);
  let def = 0.5 + 0.4*Math.pow(L, 1.1);
  let xp  = 6 + 4.4*Math.pow(L, 1.36);
  if (kind === 'man')  { hp *= 1.15; atk *= 1.3; }   // 人形凶兽：厚一成半、凶三成——压得住场面，但不至于必败
  if (kind === 'hunt') { hp *= 0.8; atk *= 0.9; def *= 0.8; xp *= 0.9; }
  return { hp:Math.round(hp), atk:Math.round(atk), def:Math.round(def), xp:Math.round(xp) };
}

const Monsters = {};
function addMonster(m){ Monsters[m.id] = m; }

(function buildBeasts(){
  const usedIds = new Set();
  for (const region of WORLD.regions){
    for (const node of region.nodes){
      for (const f of (node.fauna||[])){
        const meta = FAUNA_META[f.name];
        if (!meta || meta.pacifist) continue;          // 祥瑞（凤皇/鹓雏）不可讨伐，走「观瑞」
        if (meta.boss) continue;                       // 神级 BOSS 单独定义（见下）
        if (meta.deity) continue;                      // 神祇走「谒见」，不讨伐
        if (meta.fishOnly) continue;                   // 仅可渔获（𩶯魮之鱼），不进讨伐列表
        // 同名异兽分布于多座山（白猿、怪鸟、蛮蛮）：id 追加序号避免互相覆盖
        let id = meta.id;
        if (usedIds.has(id)){ let n = 2; while (usedIds.has(id + n)) n++; id = id + n; }
        usedIds.add(id);
        const st = beastStat(node.unlockLevel, meta.man ? 'man' : 'normal');
        const loot = [[meta.drop, 1.0, 1], ['shougu', 0.8, 1]];
        for (const ex of (meta.extra || [])) loot.push(ex);          // 附加掉落（同名异兽合并后仍保各章专属物）
        if (meta.riteDrop) loot.push([meta.riteDrop, 0.6, 1]);       // 祠牲（牛羊豕）
        if (meta.hunt) loot.push(['xi', 0.25, 1]);                   // 可猎之兽兼得祭「牺」
        addMonster({
          id, name: meta.display || f.name, faunaName: f.name, py: (Items[meta.drop]||{}).py || meta.py || '',
          el: meta.el, nodeId: node.id, regionId: region.regionId,
          needLvl: node.unlockLevel, hazardNode: !!node.hazard,
          hp: st.hp, atk: st.atk, def: st.def, xp: st.xp,
          loot, threat: meta.man ? 4 : 2, man: !!meta.man, unkillable: !!meta.unkillable,
          pair: !!meta.pair,
          omen: meta.omen || null,
          form: f.form || f.afterForm || null, sound: f.sound || null, effect: f.effect || null,
          omenText: f.omen || null, category: f.category || '兽',
          source: node.source, note: meta.note || null,
        });
      }
    }
  }
  // 钟山 · 鼓与钦䲹处死化为二鸟（原文完整叙事段）——以鸟的形态继续存在并被著录
  const zhongshan = WORLD.regions.find(r=>r.regionId==='xishan-3')?.nodes?.find(n=>n.name==='钟山');
  if (zhongshan){
    const st = beastStat(zhongshan.unlockLevel, 'normal');
    addMonster({
      id:'junniao', name:'鵕鸟', py:'jùn', el:'火', nodeId:zhongshan.id, regionId:'xishan-3',
      needLvl:zhongshan.unlockLevel, hazardNode:false,
      hp:st.hp, atk:Math.round(st.atk*1.1), def:st.def, xp:st.xp,
      loot:[['junniaoyu',1.0,1],['niaoyu',0.8,2]], threat:3, omen:'junniao',
      form:'其状如鸱，赤足而直喙，黄文而白首，其音如鹄（鼓所化）',
      omenText:'见则其邑大旱', category:'化鸟', source:zhongshan.source,
      note:'鼓亦化为鵕鸟——击杀后免疫「其邑大旱」征兆', alsoRecord:['gu'],
    });
    addMonster({
      id:'dae', name:'大鹗', py:'è', el:'金', nodeId:zhongshan.id, regionId:'xishan-3',
      needLvl:zhongshan.unlockLevel, hazardNode:false,
      hp:st.hp, atk:Math.round(st.atk*1.2), def:st.def, xp:st.xp,
      loot:[['daenyao',1.0,1],['niaoyu',0.8,2]], threat:4, man:true, omen:'dae',
      form:'其状如雕而黑文白首，赤喙而虎爪，其音如晨鹄（钦䲹所化）',
      omenText:'见则有大兵', category:'化鸟', source:zhongshan.source,
      note:'钦䲹化为大鹗——击杀后免疫「有大兵」征兆', alsoRecord:['qinfu'],
    });
  }
  // 祷过之山 · 可猎之兽（南山）
  const daoguo = (NANSHAN.regions[2]||{}).nodes?.find(n=>n.id==='nanshan-3-02');
  if (daoguo){
    for (const [name, meta] of Object.entries(HUNT_META)){
      const st = beastStat(daoguo.unlockLevel, 'hunt');
      const loot = [[meta.drop, 1.0, 1], [meta.extra, 0.8, 1], ['shougu', 0.5, 1]];
      addMonster({
        id: meta.id, name, el: meta.el, nodeId: daoguo.id, regionId: 'nanshan-3',
        needLvl: daoguo.unlockLevel, hazardNode: false,
        hp: st.hp, atk: st.atk, def: st.def, xp: st.xp,
        loot, threat: 1, hunt: true,
        form: '祷过之山「其下多犀、兕，多象」', category: '兽',
        source: daoguo.source,
      });
    }
  }
  // 西山 · 可猎之兽（hunt 标记的异兽：㸲牛、豪彘、牦牛）
  for (const region of XISHAN.regions){
    for (const node of region.nodes){
      for (const f of (node.fauna||[])){
        const meta = FAUNA_META[f.name];
        if (!meta || !meta.hunt) continue;
        if (Monsters[meta.id]) continue;
        const st = beastStat(node.unlockLevel, 'hunt');
        addMonster({
          id: meta.id, name: f.name, py: meta.py||'', el: meta.el, nodeId: node.id, regionId: region.regionId,
          needLvl: node.unlockLevel, hazardNode: !!node.hazard,
          hp: st.hp, atk: st.atk, def: st.def, xp: st.xp,
          loot: [[meta.drop, 1.0, 1], ['shougu', 0.6, 1], ['shoupi', 0.5, 1]], threat: 1, hunt: true,
          form: f.form || null, category: f.category || '兽', source: node.source,
        });
      }
    }
  }
})();

// ---------- 征兆挂接：让「见则 X」的征兆真正挂到异兽身上 ----------
// 征兆触发链路是 recordObject(怪id) → Monsters[id].omen → activateOmen(key)。
// 但 OMENS 的 key 早期由手写 IDS 表给出（'zhi' / 'taohuang' / 'fei' …），后来
// 东山、北山异兽 id 统一加了 ds_ 前缀或按同名加了序号，两套命名脱节——42 条征兆里
// 有 20 条挂在一个并不存在的 id 上，玩家永远收集不到。
// 修法不猜 key：以「同节点 + 同异兽名」反查实体（同名异兽分处两经，「北山肥遗」
// 与「西山肥遗」只能靠节点区分）。已有正确 omen 的（文鳐鱼、鵕鸟、大鹗）不覆盖。
// ⚠️ 观瑞（凤皇 / 鹓雏）与谒见神祇不走此路，由各自流程显式触发。
(function linkOmens(){
  const norm = s => String(s || '').replace(/（[^）]*）/g, '').trim();
  const ALIAS = {
    '（鸮面人面鸟）': '（未名鸟）', '（夸父状彘毛之兽）': '（未名兽）',
    '鵕鸟（鼓所化）': '鵕鸟', '大鹗（钦䲹所化）': '大鹗',
  };
  const byNodeName = {};
  Object.values(Monsters).forEach(m => { byNodeName[m.nodeId + '|' + (m.faunaName || m.name)] = m; });
  let linked = 0;
  for (const [key, o] of Object.entries(OMENS)){
    if (!o.node || !o.beast) continue;
    const want = ALIAS[o.beast] || o.beast;
    const m = byNodeName[o.node + '|' + want] || byNodeName[o.node + '|' + norm(want)];
    if (m && !m.omen){ m.omen = key; linked++; }
  }
  if (typeof window !== 'undefined') window._omenLinks = linked;
})();

// ---------- 六凶 BOSS（后羿所诛六凶 + 刑天） ----------
// 出处：《淮南子·本经训》「尧乃使羿诛凿齿于畴华之野，杀九婴于凶水之上，
// 缴大风于青邱之泽……断修蛇于洞庭，擒封豨于桑林」（公有领域）。
// 机制各自不同：连啮 / 五行变换 / 疾风 / 皮甲 / 蛇毒 / 狂暴 / 无首。
addMonster({ id:'zaochi', name:'凿齿', boss:true, el:'金', needLvl:40, hp:1800, atk:43, def:18, xp:3600,
  coins:2000, drop:'zaochiya', divine:'zaochiren', threat:5,
  form:'人形兽，齿长三尺，其状如凿（传闻形态，原文未详述）',
  special:{ name:'连啮', every:8, dmg:1.1, pierce:0.2, hits:3 }, desc:'周期性三连快齿' });
addMonster({ id:'jiuying', name:'九婴', boss:true, el:'水', needLvl:50, hp:2250, atk:52, def:22, xp:4500,
  coins:3200, drop:'jiuyingfa', divine:'jiuyingren', threat:5,
  form:'九头怪，能喷水吐火（传闻形态，原文未详述）',
  special:{ name:'阴阳嬗变', every:14, dmg:1.2, pierce:0.3, elementShift:true }, desc:'周期性变换五行，克制关系随之改变' });
addMonster({ id:'dafeng', name:'大风', boss:true, el:'木', needLvl:58, hp:2600, atk:60, def:15, xp:5200,
  coins:4000, drop:'dafengyu', divine:'dafengyugong', threat:5,
  form:'巨鸟，其翼遮天，飞则大风起（传闻形态，原文未详述）',
  special:{ name:'飘风', every:12, dmg:1.3, pierce:0.4, dodge:0.5 }, desc:'周期性大幅闪避，半空难击' });
addMonster({ id:'yayu', name:'猰貐', boss:true, el:'土', needLvl:64, hp:2800, atk:66, def:45, xp:5600,
  coins:5200, drop:'yayupi', divine:'yayuzhua', threat:5, py:'yà yǔ',
  form:'其状如牛，赤身、人面、马足，其音如婴儿，是食人（《北次二经》）',
  special:{ name:'革甲', every:0, dmg:0, armor:0.5 }, desc:'常驻厚甲减伤，受击叠层破甲' });
addMonster({ id:'xiushe', name:'修蛇', boss:true, el:'水', needLvl:70, hp:3000, atk:72, def:25, xp:6000,
  coins:6500, drop:'xiushedan', divine:'xiushebian', threat:5,
  form:'长蛇，能吞象（传闻形态，原文未详述）',
  special:{ name:'蛇毒', every:6, dmg:0.6, poison:{ dur:8, dmg:12 } }, desc:'攻击附带持续中毒' });
addMonster({ id:'fenghui', name:'封豨', boss:true, el:'水', needLvl:76, hp:3300, atk:77, def:30, xp:6600,
  coins:8000, drop:'fenghuiya', divine:'fenghuifu', threat:5, py:'fēng xī',
  form:'大野猪，皮硬如铁，性悍（传闻形态，原文未详述）',
  special:{ name:'狂暴', every:0, dmg:0, enrage:0.5 }, desc:'半血以下攻击速度翻倍' });
addMonster({ id:'xingtian', name:'刑天', boss:true, el:'金', needLvl:81, hp:3800, atk:83, def:50, xp:7600,
  coins:16000, drop:'zaochiya', divine:'ganqi', threat:5,
  form:'与帝争神，帝断其首，葬之常羊之山，乃以乳为目、以脐为口，操干戚以舞（《海外西经》）',
  special:{ name:'舞干戚', every:7, dmg:1.5, pierce:0.35 }, desc:'无首狂舞，重击且穿透' });

// ---------- 西山经神级 BOSS（西次三经 = 神话舞台主线） ----------
// 出处均为《西山经》原文（公有领域）。⚠️ 提示词/文案纪律：只用原文形态要素，
// 西王母不引用任何当代形象；帝江「浑敦无面目」——不可画面部。
addMonster({ id:'luwu', name:'陆吾', boss:true, el:'金', needLvl:56, hp:2500, atk:58, def:40, xp:5000,
  coins:6000, drop:'luwuuwei', threat:5, nodeId:'xishan-3-08', divine:'jiubuhuyue',
  form:'虎身而九尾，人面而虎爪；是神也，司天之九部及帝之囿时（昆仑之丘守关者）',
  special:{ name:'九部之讨', every:9, dmg:1.0, pierce:0.25, hits:9 }, desc:'九尾九段连击' });
addMonster({ id:'xiwangmu', name:'西王母', boss:true, el:'金', needLvl:59, hp:2650, atk:61, def:36, xp:5300,
  coins:9000, drop:'xiwangmusheng', threat:5, nodeId:'xishan-3-11', divine:'yusheng',
  form:'其状如人，豹尾虎齿而善啸，蓬发戴胜，是司天之厉及五残（玉山）',
  special:{ name:'善啸', every:10, dmg:1.2, pierce:0.45, fear:true }, desc:'啸声震慑：短时间内玩家命中降低' });
addMonster({ id:'dijiang', name:'帝江', boss:true, el:'土', needLvl:61, hp:2750, atk:63, def:30, xp:5500,
  coins:14000, drop:'dijiangnang', threat:5, nodeId:'xishan-3-18', divine:'hundunyu',
  form:'状如黄囊，赤如丹火，六足四翼，浑敦无面目（天山）',
  special:{ name:'混沌嬗变', every:12, dmg:1.1, pierce:0.3, elementShift:true }, desc:'无面目而五行不定，周期性变换属性' });

// ---------- 谒见（神祇节点 · 西次三经为核心） ----------
// 西山经主角是神：西次三经 13 位有名有形的神祇。不可讨伐的神祇以「谒见」接入：
// 前往其山，行谒见之礼（耗时 20s），入图鉴并得祝祐。BOSS 级神祇（陆吾/西王母/帝江）走讨伐。
const AUDIENCE_SITES = {};
(function buildAudienceSites(){
  // v1.13：原只遍历西山经，中山经接入后其十位神祇（武罗/泰逢/骄虫/𬠷围/计蒙/涉𬠷/神人/耕父/于儿/帝之二女）
  // 既不可讨伐、又不在谒见表里，只作纯文本存在。改为遍历全书，凡 deity 型 fauna 皆可谒见。
  for (const region of WORLD.regions){
    for (const node of region.nodes){
      const deities = (node.fauna||[]).filter(f=>{
        const meta = FAUNA_META[f.name];
        return meta && meta.deity && !meta.boss && !meta.pacifist;
      });
      if (!deities.length) continue;
      AUDIENCE_SITES[node.id] = {
        nodeId: node.id, kind:'谒见',
        name: deities.map(d=>d.name).join('・'),
        desc: node.source ? node.source.slice(0, 80) + '…' : '',
        deities: deities.map(d=>{
          // 神赐：首次谒见得其一物（如神𩲜之足）。gift 是本作给的「初谒之赐」，
          // drop 是旧写法（西山诸神借讨伐掉落字段当赐物），两者都认。
          // v1.31.23：gift 可为数组（祭品 + 神赐小物），同 id 写两遍即两件。
          const raw = FAUNA_META[d.name].gift || FAUNA_META[d.name].drop || null;
          const gifts = raw ? (Array.isArray(raw) ? raw.slice() : [raw]) : [];
          return { name:d.name, id:FAUNA_META[d.name].id, form:d.form||null, duty:d.duty||null, note:FAUNA_META[d.name].note||null,
            gift: gifts[0] || null,     // 旧读法只认一件：保留第一件（必是本系祭品）
            gifts };
        }),
      };
    }
  }
})();

// ---------- 三签（本轮短目标） ----------
// 里程碑是长线的：达成一次、永久加成。但挂机游戏最常遇到的是「上线不知道干什么」，
// 所以另设一层短目标——常挂三条，做完一条立刻补一条，赏贝币。
// 目标一律写成「相对增量」（base 记下抽签那一刻的计数），同一条签在 5 级和 60 级都成立；
// 数量与赏钱按综合等级缩放，前期不至于一签顶半天，后期也不至于一签只值一顿饭。
// 目标次数按「约八到十分钟一签」定：采集一秒一下、讨伐十几秒一只、祠礼要备祭品，
// 各自的节奏差着数量级，所以 n() 必须分开写，不能用同一个系数乘。
// 赏钱同理——采集签若按讨伐签给，一小时能刷出上万贝，经济当场崩。
const BOUNTIES = [
  { id:'hunt',    name:'往讨异兽', desc:'讨伐',   key:'kills',    n:l=>4 + Math.round(l*0.5),   shells:l=>12 + l*1.6 },
  { id:'gather',  name:'采集动作', desc:'采获',   key:'gathered', n:l=>60 + Math.round(l*6),    shells:l=>12 + l*1.6 },
  { id:'craft',   name:'制作器物', desc:'制成',   key:'crafts',   n:l=>8 + Math.round(l*0.6),   shells:l=>14 + l*1.8 },
  { id:'sell',    name:'廛市售物', desc:'售出',   key:'sales',    n:l=>5 + Math.round(l*0.4),   shells:l=>14 + l*1.8 },
  { id:'rite',    name:'行祠礼',   desc:'行祭',   key:'rites',    n:l=>1 + Math.floor(l/40),    shells:l=>40 + l*5 },
  { id:'observe', name:'观象',     desc:'观象',   key:'observes', n:l=>1 + Math.floor(l/50),    shells:l=>50 + l*6 },
  { id:'record',  name:'新著录',   desc:'新录',   key:'recorded', n:l=>2 + Math.floor(l/25),    shells:l=>24 + l*3 },
  { id:'harvest', name:'圃艺收成', desc:'收成',   key:'harvests', n:l=>2 + Math.floor(l/30),    shells:l=>20 + l*2.5 },
];
window.BOUNTIES = BOUNTIES;

// ---------- 六凶名单（单一定义处） ----------
// 后羿所诛六凶：统计页的分母、成就判定、征伐页的分组都读这一份。
// 此前三处各抄一份 id 列表，分母还写成 7（实际是 6），于是杀满六凶显示 6/7，
// 而杀过刑天/陆吾的档又会被算进「六凶」——分子算的是全部 BOSS，分母是六凶，两回事。
const SIX_BEASTS = ['zaochi','jiuying','dafeng','yayu','xiushe','fenghui'];
window.SIX_BEASTS = SIX_BEASTS;

// ---------- 前世遗物（轮回配套） ----------
// 转生一直只给「更快」，世界本身不变。这里补一层「记得」：每转一件遗物，
// 加成都很小（各项合计 3–6%），是「这一卷确实留下了什么」的凭证，不是数值台阶。
// 关键：由 rebirth.count 派生，**不写存档字段**——旧档读进来转数是多少，遗物就是几件。
const RELICS = [
  { at:1, id:'relic_yanhuo', name:'厌火之烬', note:'厌火国在其南，兽身黑色，生火出其口中',        bonus:{ xp:0.02 } },
  { at:2, id:'relic_yushan', name:'羽山之璧', note:'羽山，其下多水，其上多雨',                  bonus:{ yield:0.02 } },
  { at:3, id:'relic_xiehe',  name:'羲和之晷', note:'羲和者，帝俊之妻，生十日',                    bonus:{ xp:0.02 } },
  { at:4, id:'relic_kunlun', name:'昆仑之丘', note:'昆仑之丘，是实惟帝之下都',                    bonus:{ def:0.02 } },
  { at:5, id:'relic_jianmu', name:'建木之枝', note:'建木，百仞无枝，上有九欘，下有九枸',            bonus:{ xp:0.02 } },
  { at:6, id:'relic_ganyuan',name:'甘渊之水', note:'羲和浴日于甘渊',                            bonus:{ yield:0.02 } },
  { at:7, id:'relic_busi',   name:'不死之药', note:'开明东有巫彭、巫抵…皆操不死之药',              bonus:{ hp:0.03 } },
  { at:8, id:'relic_xirang', name:'息壤之土', note:'洪水滔天，鲧窃帝之息壤以堙洪水',                bonus:{ def:0.02 } },
];
window.RELICS = RELICS;

// ---------- 长线成就（里程碑） ----------
// 每条都写 prog()：返回 [已得, 目标]。check 由它派生（见数组下面的循环），
// 于是「界面上的进度条」与「判定是否达成」永远读同一份数，不可能走岔。
//
// 反面教材：「南山舆图」原本的 check 数的是 Object.keys(Game.map).length，
// 也就是**全部**到访节点——在南山西山北山各逛十几座也能凑满 39，
// 南山一座没走完就亮了；而界面上根本不显示进度，谁也没发现。
const chapterNodes = (prefix) => WORLD.regions
  .filter(r => r.regionId.indexOf(prefix) === 0)
  .reduce((a, r) => a + r.nodes.length, 0);
const chapterVisited = (prefix) => Object.keys(Game.map || {})
  .filter(id => id.indexOf(prefix) === 0).length;
const bossKilled = (id) => !!((Game.stats.bossKills || {})[id]);
// 「三谷观象」只指南山那三处观象点（日次 / 凯风 / 条风）。
// 原来数的是 observed 的总数 ≥ 3——把观瑞（凤皇 / 鹓雏）和东山的四处也算进去了。
const NS_OBSERVE = Object.keys(OBSERVE_SITES).filter(k => OBSERVE_SITES[k].kind === '观象'
  && String(OBSERVE_SITES[k].nodeId).indexOf('nanshan-') === 0);

// 走遍（诸山皆涉）的山系数：巡礼里程碑与舆地页的印记同口径
function pilgrimFullCount(){
  let n = 0;
  for (const r of (typeof WORLD !== 'undefined' ? WORLD.regions : [])){
    if (!r.nodes || !r.nodes.length) continue;
    if (r.nodes.every(nd => (Game.map || {})[nd.id])) n++;
  }
  return n;
}
window.pilgrimFullCount = pilgrimFullCount;
const Milestones = [
  { id:'rec_5',    name:'初识山川',   desc:'著录 5 种对象',     prog:()=>[recordedCount(), 5],    bonus:'经验 +2%',   xp:0.02,
    how:'在舆地采集、征伐讨伐、观象谒见——凡是第一次接触的对象都会自动著录一条，不必手动记录。前五条最快：把南山首经走一遍。', go:{ tab:'yudi' } },
  { id:'rec_30',   name:'簿录渐成',   desc:'著录 30 种对象',    prog:()=>[recordedCount(), 30],   bonus:'经验 +3%',   xp:0.03,
    how:'著录只增不减，同一种只算一条。想快就多换几座山、多打几种怪——图鉴里能看每类还差多少。', go:{ tab:'codex' } },
  { id:'yudi_all', name:'南山舆图',   desc:`南山经 ${chapterNodes('nanshan-')} 山全部解锁`,
    prog:()=>[chapterVisited('nanshan-'), chapterNodes('nanshan-')], bonus:'采集 +5%', gather:0.05,
    how:'沿舆地一路向前，每座山第一次抵达即计入。门前写着所需等级——不够就先采采打打，舆地与履险会跟着涨。', go:{ tab:'yudi' } },
  { id:'boss_all', name:'六凶伏诛',   desc:'击败六凶全部',
    prog:()=>[SIX_BEASTS.filter(bossKilled).length, SIX_BEASTS.length], bonus:'伤害 +10%', dmg:0.10,
    how:'六凶散在五章关底，图鉴·异兽里标着「凶神」。40 级后再去，带足吃食、穿甲，兵器淬到 +10 以上。', go:{ tab:'taofa' } },
  { id:'feng_omen',name:'凤皇来仪',   desc:'触发「天下安宁」吉兆',
    prog:()=>[(Game.stats.omens && Game.stats.omens.fenghuang) ? 1 : 0, 1], bonus:'采获 +5%', yield:0.05,
    how:'丹穴之山的观瑞点，做完即触发。观瑞有冷却，异迹索引里能看哪些还没做、在哪个山系。', go:{ act:'UI.gotoHetero()', label:'看异迹' } },
  { id:'guan_all', name:'三谷观象',   desc:`南山 ${NS_OBSERVE.length} 处观象全部完成`,
    prog:()=>[NS_OBSERVE.filter(k => Game.observed && Game.observed[k]).length, NS_OBSERVE.length],
    bonus:'离线上限 +1h', offlineCap:3600,
    how:'南山三谷各有一处观象，站到对应山头上点「观象」。异迹索引把三类一次性地点（观象 / 谒见 / 灌木）按山系列全了。', go:{ act:'UI.gotoHetero()', label:'看异迹' } },
  { id:'jingwei',  name:'精卫填海',   desc:'樵采累计 10000 次',
    prog:()=>[Math.min(10000, (Game.stats.gathers && Game.stats.gathers.qiaocai) || 0), 10000], bonus:'采集速度 +8%', gather:0.08,
    how:'纯靠次数，只能挂着。把「樵采」排进巡历队列即可——「快速挂机」会自动选当前技能够得着的最高级木材。', go:{ tab:'queue' } },
  { id:'dayu',     name:'大禹治水',   desc:'全部营造完成',
    prog:()=>[Object.keys(BUILDINGS).filter(id => Game.buildings && Game.buildings[id]).length, Object.keys(BUILDINGS).length],
    bonus:'离线效率 +5%', offlineEff:0.05,
    how:'营造页每座建筑一块，浮层里写着所需材料与效用。缺料时先看「用途」那一行——多数材料自己采比买便宜。', go:{ tab:'ying' } },
  { id:'yushi_9',  name:'百兽率舞',   desc:'御使槽位全部启用',
    prog:()=>[Math.min(beastSlots(), Object.values(Game.deployed || {}).filter(Boolean).length), 9],
    bonus:'全技能经验 +3%', xp:0.03,
    how:'御使槽随著录条数一格格解锁；异兽要著录到「通形」才能派驻。没收到的那只，先去讨伐它几次。', go:{ tab:'yushi' } },
  // ---- 西山经长线成就 ----
  { id:'xs_yudi',  name:'西山舆图',   desc:`西山经 ${chapterNodes('xishan-')} 山全部解锁`,
    prog:()=>[chapterVisited('xishan-'), chapterNodes('xishan-')], bonus:'采获 +8%', yield:0.08,
    how:'与南山舆图同理，只是西山的门槛高一档（30–55 级）。一路走过去就行，不必刻意刷。', go:{ tab:'yudi' } },
  { id:'xs_luwu',  name:'昆吾守关',   desc:'击败陆吾',          prog:()=>[bossKilled('luwu') ? 1 : 0, 1], bonus:'采集 +5%', gather:0.05,
    how:'西次三经的关底，约 40 级。硬拼不过就先淬兵器、备镇物，再吃一份「固本散」提防。', go:{ tab:'taofa' } },
  { id:'xs_xiwm',  name:'玉山谒母',   desc:'击败西王母',        prog:()=>[bossKilled('xiwangmu') ? 1 : 0, 1], bonus:'伤害 +10%', dmg:0.10,
    how:'西次三经偏后，血与伤都比陆吾高一档。开战前看「承伤约 N 倍气血」，备够份数再去。', go:{ tab:'taofa' } },
  { id:'xs_dijiang',name:'天山混沌',  desc:'击败帝江',          prog:()=>[bossKilled('dijiang') ? 1 : 0, 1], bonus:'采获 +10%', yield:0.10,
    how:'西次三经最末一尊，55 级上下再来。身上的护甲至少要良品，兵器淬炼别偷懒。', go:{ tab:'taofa' } },
  { id:'xs_danmu', name:'丹木五岁',   desc:'峚山养成完成一次',  prog:()=>[Math.min(1, (Game.danmu || {}).done || 0), 1], bonus:'采集速度 +15%', gather:0.15,
    how:'峚山的灌木点，五阶，每阶耗玉膏一枚。玉膏在峚山可采，市廛也有卖。', go:{ tab:'yudi' } },
  // 原先数的是 records 里 deity_ 开头的键（那是祠礼的神祇，27 个），与「谒见」无关；
  // 达成口径与 desc 对不上，玩家谒见完全部西山神祇反而不亮。现在按谒见点实计。
  // ⚠️ 位数从 AUDIENCE_SITES 现算，不写死：以后给西山添一位神祇，门槛自动跟着涨。
  (() => {
    const xsDeities = [];
    for (const site of Object.values(AUDIENCE_SITES || {})){
      if (String(site.nodeId).indexOf('xishan-') !== 0) continue;
      for (const d of (site.deities || [])) xsDeities.push(d.id);
    }
    return { id:'xs_deity', name:'西山百神', desc:`谒见西山全部 ${xsDeities.length} 位神祇`,
      prog:()=>[xsDeities.filter(id => ((Game.records || {})[id] || {}).count > 0).length, xsDeities.length],
      bonus:'祭祀经验 +20%', jisi:0.20,
      how:'西山各山有祠，一人可谒多位。走到山头点「谒见」逐位见过去——异迹索引里列着每处有哪几位。',
      go:{ act:'UI.gotoHetero()', label:'看异迹' } };
  })(),
  // ---- 北山经长线成就 ----
  { id:'bs_yudi',  name:'北山舆图',   desc:`北山经 ${chapterNodes('beishan-')} 山全部解锁`,
    prog:()=>[chapterVisited('beishan-'), chapterNodes('beishan-')], bonus:'采获 +10%', yield:0.10,
    how:'北山门槛在 55 级以上，是三章里最长的一段。走到一半会经过发鸠山——那里的精卫填海值得顺手开起来。', go:{ tab:'yudi' } },
  { id:'bs_qisuan',name:'器酸三岁',   desc:'咸山器酸养成完成',
    prog:()=>[(Game.grow && Game.grow.qisuan && Game.grow.qisuan.done) ? 1 : 0, 1], bonus:'采集速度 +10%', gather:0.10,
    how:'咸山的灌木点，三阶，每阶耗盐一份。盐在咸山可采——先备三份再点。', go:{ tab:'yudi' } },
  { id:'bs_jingwei',name:'东海渐浅',  desc:'发鸠山精卫填海养成完成',
    prog:()=>[(Game.grow && Game.grow.jingwei && Game.grow.jingwei.done) ? 1 : 0, 1], bonus:'采集速度 +10%', gather:0.10,
    how:'发鸠山的灌木点，200 阶、每阶十分钟——全作最长的养成。每 25 阶有个路标（精卫之羽 + 贝），慢慢投就是。', go:{ tab:'yudi' } },
  // ---- 巡礼（v1.31.25）：走遍一系诸山 ----
  // 口径按「已走遍」现算，不看有没有领赏——否则玩家走完了却没点「领赏」，成就一直不亮。
  { id:'pilgrim_5', name:'五系巡礼', desc:'走遍五个山系的诸山',
    prog:()=>[pilgrimFullCount(), 5], bonus:'采获 +3%', yield:0.03,
    how:'山系进度在舆地页每个山系方块上，诸山皆涉即满。满额那系右上角会亮一枚「赏」。', go:{ tab:'yudi' } },
  // ---- 见闻（v1.31.103）：把「偶尔撞见的一句话」变成一个可见的收集目标 ----
  // 判据取「见过几种」而非「触发多少次」：见闻的价值在种类，重复同一条没有新信息。
  { id:'event_5', name:'见闻初录', desc:'行旅见闻见过 5 种',
    prog:()=>[eventKindsSeen(), 5], bonus:'经验 +1%', xp:0.01,
    how:'采集、讨伐、制作时偶有见闻；离山归来也可能有一条「不在时」。挂机就会遇到，不必刻意刷。', go:{ tab:'stats' } },
  { id:'event_12', name:'山海谈客', desc:'行旅见闻见过 12 种',
    prog:()=>[eventKindsSeen(), 12], bonus:'经验 +2%', xp:0.02,
    how:'过半即成谈客。异迹之地（观象 / 山祠 / 灌木）、压着征兆的山、以及旱 / 雨两季各有专属见闻——见闻录里未见的那几条前面有小标记（夜 / 旱 / 雨 / 稀 / 离），照着标记挑时间去。', go:{ tab:'stats' } },
  { id:'event_all', name:'山海谈丛', desc:'行旅见闻见全（路上与不在时）',
    prog:()=>[eventKindsSeen(), eventKindsTotal()], bonus:'采获 +2%', yield:0.02,
    how:'统计页「行旅见闻」按两组列出未见的那几条，前面的小标记就是它等的条件。珍稀的两条概率低，季节两条要等六小时一转——急不得，这本书本来就是慢慢翻的。', go:{ tab:'stats' } },
  { id:'pilgrim_13', name:'半壁山河', desc:'走遍十三个山系的诸山',
    prog:()=>[pilgrimFullCount(), 13], bonus:'采集速度 +5%', gather:0.05,
    how:'全书二十六系，走完一半。北山三系与东山四系各有一条长线，正好凑够十三。', go:{ tab:'yudi' } },
];
// 达成判定一律从 prog 派生——只有一份数，界面进度与判定不可能走岔。
Milestones.forEach(ms => {
  if (typeof ms.prog === 'function')
    ms.check = () => { const p = ms.prog(); return p[1] > 0 && p[0] >= p[1]; };
});

// ---------- 采集物的等级阶梯 ----------
// 采集物的 lvl 原本直接来自所在山的门槛（autoLvl ≈ 门槛 × 0.86），于是出现
// 「渔 1 级只能捞育沛，下一条鱼要 30 级」这类断崖：玩家在南山把渔从 1 练到 30，
// 只能反复捞同一种东西（实测 24000 次）。这里把同技能的物品按等级排成阶梯，
// 相邻不得相差 8 级以上——只降不升，且保留原有的 value / xp（那是内容价值，
// 不该因为「更早能采到」而贬值）。
(function ladderizeGather(){
  const STEP = 8;
  const bySkill = {};
  for (const it of Object.values(Items)){
    if (!it.skill || !it.lvl || it.type === 'rite') continue;
    (bySkill[it.skill] = bySkill[it.skill] || []).push(it);
  }
  for (const key of Object.keys(bySkill)){
    const list = bySkill[key].sort((a, b) => a.lvl - b.lvl || a.id.localeCompare(b.id));
    let prev = 0;
    for (const it of list){
      const nv = Math.max(1, Math.min(it.lvl, prev + STEP));
      it.lvl = nv;
      prev = nv;
    }
  }
})();

// ---------- 著录元数据（图鉴） ----------
// 每阶揭示文案：初见 → 识名 → 明性 → 通形 → 得御
function buildCodex(){
  const cx = {};
  const put = (o)=>{ if (o && o.id) cx[o.id] = o; };
  for (const it of Object.values(Items)){
    if (it.skill){ // 可采集物
      const reveals = ['未见其形，待往山中亲见。', it.form || (it.note||''), it.effect || '', it.note || '', ''];
      put({ id: it.id, name: it.name, py: it.py||'', cat: it.type==='wood'?'灵木':it.type==='mineral'?'金玉':it.type==='fish'?'水族':it.type==='herb'?'灵草':it.type==='crop'?'嘉谷':'百物',
            reveals, source: it.note||'' });
    }
  }
  for (const m of Object.values(Monsters)){
    if (m.boss) continue;
    const reveals = [ m.form || '传闻之兽，原文未详述形态。', m.sound ? '其音：'+m.sound : '', m.effect ? m.effect : '', m.omenText ? m.omenText : '', m.source||'' ];
    put({ id: m.id, name: m.name, py: m.py||'', cat:'异兽', reveals, source: m.source||'' });
  }
  for (const region of WORLD.regions){
    for (const node of region.nodes){
      put({ id: node.id, name: node.name, cat:'山川', reveals: [node.terrain||'其势未详', node.terrain||'', node.omen?'有征兆焉':'', node.hazard?('险：'+node.hazard.type):'', node.source||'' ], source: node.source||'' });
    }
    // ⚠️ 东次四经原文未载山神形象与祠礼（region.deity === null）——「无神之域」，须兜底
    put({ id: 'deity_'+region.regionId, name: region.regionName+' 山神', cat:'祠典',
          reveals: [region.deity?region.deity.form:'本系未载山神形象，亦无祠礼——「无神之域」',
                    (region.deity&&region.deity.rite)?region.deity.rite['原文']:'', '', '', region.summary||'' ], source: region.summary||'' });
  }
  // 各套祠礼所祭之神（含西山四系）
  const RITE_DEITY_NAMES = {
    deity_xs1:'西山首经 · 华山冢神', deity_yu:'西山首经 · 羭山神',
    deity_xs2:'西次二经 · 飞兽之神', deity_xs2b:'西次二经 · 十辈神',
    deity_xs3:'西次三经 · 羊身人面之神', deity_xs4:'西次四经 · 山神',
    deity_bs1:'北次一经 · 人面蛇身之神', deity_bs2:'北次二经 · 蛇身人面之神',
    deity_bs3:'北次三经 · 神祇（廿神藻茝瘗／十四神玉不瘗／十神璧瘗）',
    // 中山经（帝之密都；十二系全录）
    deity_zs1:'中次一经 · 薄山十五山神（历儿为冢）',
    deity_zs2:'中次二经 · 人面鸟身之神',
    deity_zs3:'中次三经 · 帝之密都群神（熏池／武罗／泰逢）',
    deity_zs4:'中次四经 · 厘山九山神（人面兽身）',
    deity_zs5:'中次五经 · 薄山山神（升山为冢，首山为䰠，尸水合天）',
    deity_zs6:'中次六经 · 缟羝山十四山神（平逢骄虫，岳在其中）',
    deity_zs7:'中次七经 · 苦山十九山神（十六神豕身人面；苦山/少室/太室为冢）',
    deity_zs8:'中次八经 · 荆山二十三山神（鸟身人面；骄山为冢）',
    deity_zs9:'中次九经 · 岷山十六山神（马身龙首；文山/勾檷/风雨/騩为冢，熊山为席）',
    deity_zs10:'中次十经 · 首阳九山神（龙身人面；末句另称堵山为冢、騩山为帝）',
    deity_zs11:'中次十一经 · 荆山四十八山神（彘身人首；末句另称禾山为帝、堵山玉山为冢）',
    deity_zs12:'中次十二经 · 洞庭十五山神（鸟身龙首；帝之二女与于儿居之）',
  };
  for (const def of Object.values(RITES)){
    if (cx[def.deity] || !RITE_DEITY_NAMES[def.deity]) continue;
    const region = WORLD.regions.find(r=>r.regionId===def.regionId);
    put({ id: def.deity, name: RITE_DEITY_NAMES[def.deity], cat:'祠典',
          reveals: [region&&region.deity?region.deity.form:'', region&&region.deity&&region.deity.rite?region.deity.rite['原文']:'', '', '', region?region.summary:'' ],
          source: region?region.summary:'' });
  }
  // 神祇（谒见入录）
  for (const site of Object.values(AUDIENCE_SITES)){
    for (const d of site.deities){
      put({ id: d.id, name: d.name, cat:'神祇', py: (FAUNA_META[Object.keys(FAUNA_META).find(k=>FAUNA_META[k].id===d.id)]||{}).py || '',
            reveals: [d.form||'神祇之形，原文未详载。', d.duty?'司职：'+d.duty:'', d.note||'', '', site.desc||'' ], source: site.desc||'' });
    }
  }
  return cx;
}
const CODEX = buildCodex();

// ---------- 收集成就（图鉴的奖励闭环） ----------
// 与 Milestones 的分工：Milestones 是「达成即生效」的被动加成；
// 这里是「达到即待领」的收集回馈——要玩家到图鉴页领一次，奖励才落袋。
// 两者都读同一份 Game.records，不增设计数，也不改既有的著录曲线。
const CODEX_CATS = ['灵木','金玉','灵草','水族','嘉谷','百物','异兽','山川','祠典','神祇'];

function buildCodexAch(){
  const out = [];
  const per = {};
  Object.values(CODEX).forEach(e => { per[e.cat] = (per[e.cat] || 0) + 1; });
  for (const cat of CODEX_CATS){
    const total = per[cat] || 0;
    if (!total) continue;
    const half = Math.ceil(total * 0.5);
    out.push({ id:'cat_half_' + cat, group:cat, name:cat + ' · 过半',
      desc:`${cat} 著录 ${half} / ${total}`, cat, need:half, total,
      reward:{ shells: 120 + total * 6, items:[['tan', Math.max(2, Math.round(total / 6))]] } });
    out.push({ id:'cat_all_' + cat, group:cat, name:cat + ' · 尽收',
      desc:`${cat} 著录 ${total} / ${total}`, cat, need:total, total,
      reward:{ shells: 400 + total * 20, items:[['huozhong', 1]] } });
  }
  const totalAll = Object.keys(CODEX).length;
  [
    { p:0.25, name:'初窥门径', shells:600,  items:[['yu', 1]] },
    { p:0.50, name:'半壁山海', shells:1600, items:[['jiyu2', 1]] },
    { p:0.75, name:'胸有丘壑', shells:3200, items:[['guiyu', 1]] },
    { p:1.00, name:'山海尽览', shells:8000, items:[['jin', 3]] },
  ].forEach((t, i) => {
    const need = Math.ceil(totalAll * t.p);
    out.push({ id:'all_' + (i + 1), group:'总录', name:t.name,
      desc:`图鉴总录 ${need} / ${totalAll}`, cat:null, need, total:totalAll,
      reward:{ shells:t.shells, items:t.items } });
  });
  return out;
}

function codexDoneCount(cat){
  let n = 0;
  const rec = (typeof Game !== 'undefined' && Game.records) ? Game.records : {};
  for (const id in rec){
    const r = rec[id];
    if (!r || !(r.count > 0)) continue;
    const e = CODEX[id];
    if (!e) continue;
    if (cat && e.cat !== cat) continue;
    n++;
  }
  return n;
}

const CODEX_ACHIEVEMENTS = buildCodexAch();

// ---------- 工具函数 ----------
function rarityId(it){
  if (it && it.rarity && RARITY[it.rarity]) return it.rarity;
  const v = (it && it.value) || 0;
  for (const [need, id] of RARITY_TIERS) if (v >= need) return id;
  return 'COMMON';
}
function rarityMeta(it){ return RARITY[rarityId(it)] || RARITY.COMMON; }
function rarityName(it){ return rarityMeta(it).name; }
function rarityColor(it){ return rarityMeta(it).color; }
function rarityClass(it){ return 'r-' + rarityId(it).toLowerCase(); }

// 等级 → 阶（0..8，一九…九九）
function tierOfLevel(level){
  const l = Math.max(1, Math.min(TUNING.MAX_LEVEL, level|0));
  return Math.min(8, Math.floor((l-1)/TUNING.TIER_SIZE));
}
// 著录次数 → 阶（0..4）
function recordTierOf(count){
  let t = 0;
  for (let i=0;i<TUNING.MASTERY.THRESHOLDS.length;i++) if (count >= TUNING.MASTERY.THRESHOLDS[i]) t = i;
  return t;
}
function masteryBonus(count){
  return TUNING.MASTERY.BONUS[recordTierOf(count)] || 0;
}
// 掉落权重（Prompt 5 公式，clamp 后）
function dropWeight(base, level, reqLevel, masteryTier){
  let w = base * (1 + TUNING.DROP.LVL_COEF * (level - reqLevel)) * (1 + TUNING.DROP.MAS_COEF * masteryTier/4);
  return Math.max(TUNING.DROP.MIN, Math.min(TUNING.DROP.MAX, w));
}
// 五行倍率：攻击方 el 对 防守方 el
function wuxingMult(atkEl, defEl){
  const W = TUNING.WUXING;
  if (!atkEl || !defEl) return W.TONG;
  if (TUNING.KE_MAP[atkEl] === defEl) return W.KE;      // 相克
  if (TUNING.KE_MAP[defEl] === atkEl) return W.BEIKE;   // 被克
  return W.TONG;
}
// 相生：a 生 b？
function wuxingSheng(a, b){ return TUNING.SHENG[a] === b; }

function recordedCount(){
  return Object.values(Game.records||{}).filter(r=>r && r.count>0).length;
}
function beastSlots(){ return Math.min(9, 1 + Math.floor((Game.skills?.yushi?.level||1)/10)); }

// ---------- 方国求购订单（商旅贸易深化：动态需求，贝币的第二出口） ----------
// ⚠️ 依赖 buildBeasts 已跑完（掉落物品的产地要反查怪物 regionId），故置于其后再算。
// 物品 → 产地（区域）：采集物看 it.node；异兽掉落物反查怪物 regionId。
const ITEM_REGION = (function(){
  const map = {};
  for (const it of Object.values(Items)){
    if (it.node && (it.value||0) > 0) map[it.id] = it.node.split('-').slice(0, 2).join('-');
  }
  for (const m of Object.values(Monsters)){
    if (!m.regionId) continue;
    for (const row of (m.loot||[])){
      const iid = row[0];
      if (Items[iid] && !map[iid]) map[iid] = m.regionId;
    }
  }
  return map;
})();
// 订单池：有产地的原材料。口径同「廛市清整」——食物 / 装备 / 嘉种 / 药品 / 嘉谷
// 是生活线与祠礼资产，不应被求购；只收可再生的原材料。
const ORDER_POOL = Object.values(Items).filter(it=>
  (it.value||0) > 0 && !it.edible && !it.equip && it.type!=='seed' && it.type!=='potion' && it.type!=='crop' && ITEM_REGION[it.id]);
function regionById(rid){ return (WORLD.regions||[]).find(r=>r.regionId===rid) || null; }
// 求购数量按基准价分档：越贵要得越少，总价量级大致相当（一单 ≈ 普通材料几十件的价值）
function orderQtyFor(value){
  if (value >= 800) return 1 + Math.floor(Math.random()*2);   // 1~2
  if (value >= 200) return 2 + Math.floor(Math.random()*4);   // 2~5
  if (value >= 60)  return 4 + Math.floor(Math.random()*6);   // 4~9
  if (value >= 20)  return 8 + Math.floor(Math.random()*9);   // 8~16
  return 12 + Math.floor(Math.random()*16);                   // 12~27
}

// ---------- 卷首印记（「叙录」页与页脚读出） ----------
// 版本代号取「五藏山经」体例：一卷一山系，一章一山。
const GAME_META = {
  name:    '山海经 · 著录',
  version: '1.31.195',
  codename:'字体复位',
  updated: '2026-10-28',
  form:    '纯静态站点 · 原生 JavaScript · 零依赖',
  license: '代码 MIT · 文本取自公有领域古籍',
  // 唯一的对外联系方式：关于页显示、可一键复制。不放外链，也不指向任何下载。
  group:   '1132221462',
  site:    'https://hai1995.github.io/idle-shanhaijing/',
};
window.GAME_META = GAME_META;

// ---------- 浏览器全局导出 ----------
if (typeof window !== 'undefined'){
  window.TUNING = TUNING; window.RARITY = RARITY; window.RARITY_TIERS = RARITY_TIERS;
  window.Skills = Skills; window.SKILL_GROUPS = SKILL_GROUPS; window.ALL_SKILL_IDS = ALL_SKILL_IDS;
  window.REALMS = REALMS;
  window.Items = Items; window.Recipes = Recipes; window.RECIPE_SKILL = RECIPE_SKILL;
  window.Monsters = Monsters; window.ShopStock = ShopStock; window.SHOP_CATS = SHOP_CATS;
  window.OMENS = OMENS; window.OBSERVE_SITES = OBSERVE_SITES; window.RITES = RITES;
  window.BUILDINGS = BUILDINGS; window.Milestones = Milestones; window.CODEX = CODEX;
  window.CODEX_ACHIEVEMENTS = CODEX_ACHIEVEMENTS; window.CODEX_CATS = CODEX_CATS;
  window.codexDoneCount = codexDoneCount;
  window.GATHER_POOLS = GATHER_POOLS; window.NANSHAN = NANSHAN;
  window.WORLD = WORLD; window.XISHAN = XISHAN; window.CHAPTERS = CHAPTERS; window.chapterOf = chapterOf;
  window.AUDIENCE_SITES = AUDIENCE_SITES; window.GROW_SITES = GROW_SITES;
  window.SPECIAL_NODES = SPECIAL_NODES; window.GATHER_BONUS = GATHER_BONUS;
  window.rarityId = rarityId; window.rarityMeta = rarityMeta; window.rarityName = rarityName;
  window.GEAR_GRADE = GEAR_GRADE; window.GEAR_BASE = GEAR_BASE;
  window.gearKindOf = gearKindOf; window.gearNum = gearNum; window.gearBaseValue = gearBaseValue;
  window.gearGrade = gearGrade; window.gearRatio = gearRatio;
  window.rarityColor = rarityColor; window.rarityClass = rarityClass;
  window.tierOfLevel = tierOfLevel; window.recordTierOf = recordTierOf;
  window.masteryBonus = masteryBonus; window.dropWeight = dropWeight;
  window.wuxingMult = wuxingMult; window.wuxingSheng = wuxingSheng;
  window.recordedCount = recordedCount; window.beastSlots = beastSlots;
  window.ITEM_REGION = ITEM_REGION; window.ORDER_POOL = ORDER_POOL;
  window.regionById = regionById; window.orderQtyFor = orderQtyFor;
}
