// ===== 《山海经·放置挂机》核心数据定义 =====
// 世界观：玩家为「著录者」，受命巡行南山，采集、制作、讨伐、御使、祭祀，
// 把山川万物逐一条录于竹简——游戏进度即一部正在写成的《山海经》。
// 内容边界：所有名称、形态、效果、祠礼均取自《山海经》原文（公有领域）；
// 等级、数值、倍率、机制均为本项目自研调参（见 TUNING），不沿用任何既有产品。
// 依赖：本文件在 nanshanData.js（window.NANSHAN）之后加载。

// ---------- 数值常量表（所有可调参数集中于此） ----------
const TUNING = {
  MAX_LEVEL: 81,            // 每技能 81 级，取「九九八十一」之数
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
  OFFLINE: { EFF_BASE: 0.55, EFF_PER: 0.05, EFF_MAX: 0.85, CAP_H: 12 },
  // 五行：相克 ×1.35｜被克 ×0.75｜同属 ×1.00｜相生增益 ×1.15
  WUXING: { KE: 1.35, BEIKE: 0.75, TONG: 1.00, SHENG: 1.15 },
  ELEMENTS: ['金','木','水','火','土'],
  SHENG: { 金:'水', 水:'木', 木:'火', 火:'土', 土:'金' },  // 相生：金生水、水生木、木生火、火生土、土生金
  KE_MAP: { 金:'木', 木:'土', 土:'水', 水:'火', 火:'金' },  // 相克：金克木、木克土、土克水、水克火、火克金
  GATHER_DOUBLE: 0.25,     // 采集一次出 2 个的概率
  OBSERVE_SEC: 20,         // 观象/观瑞一次耗时（秒）
  FARM_PLOTS: 6,           // 圃艺田地数
  // 同目标连续讨伐的经验递减：每连杀一次 -3%，下限 60%（换目标 / 败北即重置）
  MOB_DECAY: { STEP: 0.03, MIN: 0.6 },
  // 方国求购订单：常驻 3 单，30 分钟轮换一批；溢价 1.3~1.8 倍于基准价
  ORDERS: { COUNT: 3, REFRESH_SEC: 1800, PREMIUM_MIN: 1.3, PREMIUM_MAX: 1.8, XP: 12 },
  // 闲置兜底：无行动/战斗/队列持续这么久（秒）后自动执行默认行动，避免放置游戏「死档」
  IDLE_GRACE: 8,
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

// ---------- 世界（南山经 + 西山经 + 北山经，三章同构接入） ----------
const NANSHAN = (typeof window !== 'undefined' && window.NANSHAN) ? window.NANSHAN : { regions: [] };
const XISHAN  = (typeof window !== 'undefined' && window.XISHAN)  ? window.XISHAN  : { regions: [] };
const BEISHAN = (typeof window !== 'undefined' && window.BEISHAN) ? window.BEISHAN : { regions: [] };
const DONGSHAN = (typeof window !== 'undefined' && window.DONGSHAN) ? window.DONGSHAN : { regions: [] };
const WORLD = { regions: [].concat(NANSHAN.regions||[], XISHAN.regions||[], BEISHAN.regions||[], DONGSHAN.regions||[]) };
// 章节（叙事层）：南山经=巡行记录，西山经=神话舞台（神祇密度支撑主线章节），北山经=长篇养成（精卫填海），
// 东山经=荒经水路（终末章：近半之山「无草木」，唯一全水行山系，产玉与渔）
const CHAPTERS = [
  { id:'nanshan', name:'第一章 · 南山经', sub:'巡行记录', regionIds:['nanshan-1','nanshan-2','nanshan-3'] },
  { id:'xishan',  name:'第二章 · 西山经', sub:'神话舞台', regionIds:['xishan-1','xishan-2','xishan-3','xishan-4'] },
  { id:'beishan', name:'第三章 · 北山经', sub:'长篇养成', regionIds:['beishan-1','beishan-2','beishan-3'] },
  { id:'dongshan',name:'第四章 · 东山经', sub:'荒经水路', regionIds:['dongshan-1','dongshan-2','dongshan-3','dongshan-4'] },
];
function chapterOf(regionId){ return CHAPTERS.find(c=>c.regionIds.includes(regionId)) || null; }

// ---------- 技能（26 技，与 26 山系呼应） ----------
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
  yudi:    { id:'yudi',    name:'舆地', domain:'yushi',      icon:'🗺️', desc:'制图与探索，驱动区域解锁' },
};
const SKILL_GROUPS = {
  gathering:  { label:'采集', ids:['qiaocai','caiyu','yu','caiyao','puyi'] },
  processing: { label:'制作', ids:['fanliao','diaoding','yezhu','xiaoyu','zhiqi','zhuoyu','lianyao'] },
  combat:     { label:'武备', ids:['bing','she','zhu','ming'] },
  taofa:      { label:'征伐', ids:['taofa'] },
  fangguo:    { label:'方国', ids:['lvxian','shanglv','guanxiang','yingyi','bushi'] },
  yushi:      { label:'驭使', ids:['yushi','jisi','zhulu','yudi'] },
};
const ALL_SKILL_IDS = Object.keys(Skills);

// ---------- 物品 ----------
function I(id, name, type, extra) { return Object.assign({ id, name, type, icon:'⬜' }, extra||{}); }
const Items = {};
function addItem(...defs){ defs.forEach(d => Items[d.id] = d); }

// ---- 樵采 · 灵木 ----
addItem(
  I('gui','桂','wood',    { value:2,  xp:10, lvl:1,  icon:'🌿', skill:'qiaocai', node:'nanshan-1-01', note:'多桂' }),
  I('yan','棪木','wood',  { value:4,  xp:14, lvl:2,  icon:'🪵', skill:'qiaocai', node:'nanshan-1-02', note:'多棪木' }),
  I('guaimu','怪木','wood',{ value:8,  xp:20, lvl:4,  icon:'🪹', skill:'qiaocai', node:'nanshan-1-03', note:'多怪木，不可以上' }),
  I('zi','梓','wood',     { value:30, xp:60, lvl:20, icon:'🪵', skill:'qiaocai', node:'nanshan-2-14', note:'其上多梓枏' }),
  I('nan','枏','wood',    { value:30, xp:60, lvl:20, icon:'🪵', skill:'qiaocai', node:'nanshan-2-14', note:'其上多梓枏（楠）' }),
  I('jing','荆','wood',   { value:26, xp:52, lvl:22, icon:'🌿', skill:'qiaocai', node:'nanshan-2-14', note:'其下多荆杞' }),
  I('qi','杞','wood',     { value:26, xp:52, lvl:22, icon:'🌿', skill:'qiaocai', node:'nanshan-2-14', note:'其下多荆杞' }),
  I('mu','木','wood',     { value:50, xp:90, lvl:30, icon:'🌳', skill:'qiaocai', node:'nanshan-3-08', note:'上多木，无草' }),
);

// ---- 采玉 · 金玉五金 ----
addItem(
  I('jin','金','mineral',   { value:6,  xp:12, lvl:1,  icon:'🪙', skill:'caiyu', node:'nanshan-1-01', note:'多金玉' }),
  I('yu','玉','mineral',    { value:8,  xp:14, lvl:1,  icon:'💠', skill:'caiyu', node:'nanshan-1-07', note:'其阳多玉' }),
  I('shuiyu','水玉','mineral',{ value:8, xp:14, lvl:2,  icon:'💧', skill:'caiyu', node:'nanshan-1-02', note:'多水玉' }),
  I('baiyu','白玉','mineral',{ value:10, xp:18, lvl:4,  icon:'⚪', skill:'caiyu', node:'nanshan-1-03', note:'多白玉' }),
  I('huangjin','黄金','mineral',{ value:20,xp:28,lvl:8,  icon:'🟡', skill:'caiyu', node:'nanshan-1-02', note:'多黄金' }),
  I('chijin','赤金','mineral',{ value:16, xp:24, lvl:6,  icon:'🔶', skill:'caiyu', node:'nanshan-1-04', note:'其阳多赤金' }),
  I('baijin','白金','mineral',{ value:18, xp:26, lvl:6,  icon:'⚗️', skill:'caiyu', node:'nanshan-1-04', note:'其阴多白金' }),
  I('qinghuo','青雘','mineral',{ value:35,xp:58, lvl:15, icon:'🟢', skill:'caiyu', node:'nanshan-1-08', note:'其阴多青雘', py:'huò' }),
  I('shashi','沙石','mineral',{ value:12, xp:40, lvl:18, icon:'🪨', skill:'caiyu', node:'nanshan-1-09', note:'多沙石' }),
  I('dansu','丹粟','mineral',{ value:40, xp:70, lvl:20, icon:'🔴', skill:'caiyu', node:'nanshan-2-01', note:'多丹粟', py:'sù' }),
  I('fushi','砆石','mineral',{ value:45, xp:85, lvl:34, icon:'🪨', skill:'caiyu', node:'nanshan-2-09', note:'其下多砆石', py:'fū' }),
  I('jinshi','金石','mineral',{ value:60, xp:100,lvl:44, icon:'🪙', skill:'caiyu', node:'nanshan-2-16', note:'多金石' }),
  I('boshi','博石','mineral',{ value:80, xp:120,lvl:46, icon:'💎', skill:'caiyu', node:'nanshan-2-17', note:'多博石' }),
);

// ---- 渔 · 水族 ----
addItem(
  I('yupei','育沛','fish',  { value:15, xp:16, lvl:1,  icon:'🐚', skill:'yu', node:'nanshan-1-01', water:'丽麂之水', effect:'佩之无瘕疾', py:'pèi', note:'丽麂之水多育沛' }),
  I('jiyu','鮆鱼','fish',   { value:30, xp:70, lvl:30, icon:'🐟', skill:'yu', node:'nanshan-2-07', water:'苕水', effect:'可食', py:'jì', note:'苕水多鮆鱼' }),
  I('piluo','芘蠃','fish',  { value:35, xp:80, lvl:39, icon:'🐌', skill:'yu', node:'nanshan-2-13', water:'洵水', effect:'可食', py:'pí luǒ', note:'洵水多芘蠃' }),
);

// ---- 采药 · 灵草 ----
addItem(
  I('zhuyu','祝余','herb',  { value:10, xp:12, lvl:1,  icon:'🌱', skill:'caiyao', node:'nanshan-1-01', form:'其状如韭而青华', effect:'食之不饥' }),
  I('baijiu','白䓘','herb', { value:120,xp:200,lvl:68, icon:'🌳', skill:'caiyao', node:'nanshan-3-11', form:'其状如榖而赤理，其汗如漆，其味如饴', effect:'食者不饥，可以释劳；可以血玉', py:'jiāo' }),
);

// ---- 圃艺 · 嘉谷 ----
addItem(
  I('seed_tu','稌籽','seed',  { value:3,  lvl:1, icon:'🌾', grow:10, crop:'tu',  skill:'puyi', py:'tú' }),
  I('seed_dao','稻秧','seed', { value:6,  lvl:3, icon:'🌾', grow:14, crop:'dao', skill:'puyi' }),
  I('seed_jian','菅苗','seed',{ value:10, lvl:5, icon:'🌿', grow:18, crop:'jian',skill:'puyi', py:'jiān' }),
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
  I('yuyu','𪁺𪁸羽','beast',{ value:25, icon:'🪶', effect:'食之无卧', rareChar:true }),
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
  I('migufu','迷榖符','charm',{ value:50, lvl:5,  icon:'🪸', equip:true, slot:'charm', effect:'佩之不迷', gatherBonus:0.10, reqRecord:{ id:'migu', tier:3 }, note:'其状如榖而黑理，其华四照' }),
  I('lushufu','鹿蜀符','charm',{ value:70, lvl:10, icon:'🪸', equip:true, slot:'charm', effect:'佩之宜子孙', farmBonus:0.25, reqRecord:{ id:'lushu', tier:3 } }),
  I('xuanguifu','旋龟符','charm',{ value:75, lvl:10, icon:'🪸', equip:true, slot:'charm', effect:'佩之不聋，可以为底', divBonus:0.30, reqRecord:{ id:'xuangui', tier:3 } }),
  I('boyifu','猼訑符','charm',{ value:80, lvl:15, icon:'🪸', equip:true, slot:'charm', effect:'佩之不畏', defBonus:8, reqRecord:{ id:'boyi', tier:3 } }),
  I('guanfu','灌灌符','charm',{ value:90, lvl:15, icon:'🪸', equip:true, slot:'charm', effect:'佩之不惑', wise:true, reqRecord:{ id:'guanguan', tier:3 } }),
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
  XW('bili','萆荔','herb',['xishan-1-02'],{ icon:'🌿', skill:'caiyao', note:'食之已心痛', py:'bì lì' }),
  XW('xuncao','薰草','herb',['xishan-1-10'],{ icon:'🌿', skill:'caiyao', note:'佩之可以已疠——麻台之山' }),
  XW('gurong','蓇蓉','herb',['xishan-4-01'],{ icon:'🌺', skill:'caiyao', note:'食之使人无子——高效而有代价', py:'gū róng' }),
  XW('pingcao','薲草','herb',['xishan-3-08'],{ icon:'🌿', skill:'caiyao', note:'其状如葵，其味如葱——食之已劳', py:'píng' }),
  XW('mao','茆','herb',['xishan-4-01'],{ icon:'🌿', skill:'caiyao', py:'mǎo' }),
  XW('xiongqiong','芎藭','herb',['xishan-4-19'],{ icon:'🌿', skill:'caiyao', note:'芎藭之草——入药', py:'xiōng qióng' }),
  XW('hui','蕙','herb',['xishan-4-01'],{ icon:'🌷', skill:'caiyao', py:'huì' }),
  XW('duheng','杜衡','herb',['xishan-4-01'],{ icon:'🌿', skill:'caiyao', py:'dù héng' }),
  XW('zicao','茈草','herb',['xishan-3-07'],{ icon:'🟣', skill:'caiyao', py:'zǐ' }),
  XW('huangguan','黄雚','herb',['xishan-1-10'],{ icon:'🌿', skill:'caiyao', py:'huáng guàn' }),
  XW('xiao','虈','herb',['xishan-4-19'],{ icon:'🌿', skill:'caiyao', py:'xiāo' }),
);

// ---- 嘉谷 · 稷（圃艺）----
addItem(
  XW('seed_ji','稷籽','seed',[],{ icon:'🌾', skill:'puyi', lvl:autoLvl('xishan-3-04'), grow:14, crop:'ji', py:'jì' }),
  XW('ji','稷米','crop',[],{ icon:'🍚', skill:'puyi', lvl:autoLvl('xishan-3-04'), note:'糈用稷米——西次三经祠礼' }),
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
  I('shifu','石斧','tool', { equip:true, slot:'axe', axePower:4,  lvl:1,  value:20, icon:'🪓' }),
  I('jinfu','金斧','tool', { equip:true, slot:'axe', axePower:9,  lvl:10, value:90, icon:'🪓' }),
  I('chijinfu','赤金斧','tool',{ equip:true, slot:'axe', axePower:16, lvl:26, value:260, icon:'🪓' }),
  I('shikuo','石镐','tool',{ equip:true, slot:'pick', pickPower:4, lvl:1,  value:20, icon:'⛏️' }),
  I('jinkuo','金镐','tool',{ equip:true, slot:'pick', pickPower:9, lvl:10, value:90, icon:'⛏️' }),
  I('chijinkuo','赤金镐','tool',{ equip:true, slot:'pick', pickPower:16, lvl:26, value:260, icon:'⛏️' }),
  I('yuwang','渔网','tool',{ equip:true, slot:'net', netPower:4, lvl:1,  value:20, icon:'🕸️' }),
  I('siwang','丝网','tool',{ equip:true, slot:'net', netPower:9, lvl:10, value:90, icon:'🕸️' }),
  I('luowang','罗罔','tool',{ equip:true, slot:'net', netPower:16, lvl:26, value:260, icon:'🕸️', py:'luó wǎng' }),
);

// ---- 兵器（冶铸） ----
addItem(
  I('muge','木戈','weapon', { equip:true, weapon:true, dmg:5,  lvl:1,  value:30,  icon:'🔱', el:'木' }),
  I('shimao','石矛','weapon',{ equip:true, weapon:true, dmg:9,  lvl:4,  value:70,  icon:'🔺', el:'土' }),
  I('jinjian','金剑','weapon',{ equip:true, weapon:true, dmg:15, lvl:10, value:160, icon:'🗡️', el:'金' }),
  I('chijinyue','赤金钺','weapon',{ equip:true, weapon:true, dmg:26, lvl:26, value:400, icon:'🪓', el:'金' }),
  I('baijinqi','白金戚','weapon',{ equip:true, weapon:true, dmg:38, lvl:36, value:700, icon:'⚔️', el:'金' }),
  I('zaochimao','凿齿矛','weapon',{ equip:true, weapon:true, dmg:55, lvl:55, value:1600, icon:'🔱', el:'金', rarity:'RARE' }),
  I('fenghuiyue','封豨钺','weapon',{ equip:true, weapon:true, dmg:62, lvl:58, value:1900, icon:'🪓', el:'水', rarity:'RARE', py:'fēng xī' }),
);
// ---- 弓矢（削羽） ----
addItem(
  I('mugong','木弓','bow',  { equip:true, weapon:true, ranged:true, dmg:6,  lvl:1,  value:40,  icon:'🏹', el:'木' }),
  I('sanggong','桑弓','bow',{ equip:true, weapon:true, ranged:true, dmg:12, lvl:10, value:150, icon:'🏹', el:'木' }),
  I('chijingong','赤金弓','bow',{ equip:true, weapon:true, ranged:true, dmg:22, lvl:26, value:420, icon:'🏹', el:'金' }),
  I('dafenggong','大风弓','bow',{ equip:true, weapon:true, ranged:true, dmg:45, lvl:58, value:1700, icon:'🏹', el:'木', rarity:'RARE' }),
  I('shizu','石镞矢','arrow',{ equip:true, slot:'quiver', dmg:2,  lvl:1,  value:6,  icon:'➶', el:'土' }),
  I('jinzu','金镞矢','arrow',{ equip:true, slot:'quiver', dmg:4,  lvl:10, value:18, icon:'➶', el:'金' }),
  I('chijinzu','赤金镞矢','arrow',{ equip:true, slot:'quiver', dmg:7, lvl:26, value:40, icon:'➶', el:'金' }),
  I('baijinzu','白金镞矢','arrow',{ equip:true, slot:'quiver', dmg:10, lvl:36, value:80, icon:'➶', el:'金' }),
);
// ---- 甲胄（制器） ----
addItem(
  I('pijia','皮甲','armor', { equip:true, slot:'armor', def:6,  lvl:20, value:120, icon:'🥋' }),
  I('sijia','兕甲','armor', { equip:true, slot:'armor', def:11, lvl:34, value:260, icon:'🥋', py:'sì' }),
  I('yayujia','猰貐甲','armor',{ equip:true, slot:'armor', def:20, lvl:60, value:900, icon:'🥋', rarity:'RARE', py:'yà yǔ' }),
);

// ---- 食物（调鼎 · 「食之X」句式） ----
addItem(
  I('jiagufan','嘉谷饭','food', { value:14, heal:70,  lvl:1,  icon:'🍚', edible:true }),
  I('zhishengrou','炙狌肉','food',{ value:26, heal:110, lvl:3, icon:'🍖', edible:true, buff:{ name:'善走', kind:'gather', gather:0.20, dur:120 }, effect:'食之善走', py:'shēng' }),
  I('daofan','稻米饭','food', { value:30, heal:130, lvl:5,  icon:'🍚', edible:true }),
  I('kaijiyu','炙鮆鱼','food',{ value:70, heal:220, lvl:30, icon:'🍣', edible:true, py:'jì' }),
  I('piluogeng','芘蠃羹','food',{ value:90, heal:260, lvl:39, icon:'🍲', edible:true, py:'pí luǒ' }),
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
  I('xiushedangao','修蛇胆膏','potion',{ value:600,lvl:60, icon:'🫙', rarity:'RARE', buff:{ name:'蛇膏', kind:'all', dmg:0.30, def:20, dur:300 }, effect:'可以已痔' }),
  I('fenghuanggao','凤皇膏','potion',{ value:900,lvl:68, icon:'🫙', rarity:'LEGENDARY', buff:{ name:'凤膏', kind:'all', yield:0.25, dur:600 }, effect:'见则天下安宁' }),
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
R('cook','kaijiyu',1,90,30,[['jiyu',1]]);
R('cook','piluogeng',1,120,39,[['piluo',2],['tu',1]]);
R('cook','zhixipu',1,200,52,[['xirou',2]]);
R('cook','zhisipu',1,240,52,[['sirou',2]]);
// 冶铸
R('smith','muge',1,20,1,[['gui',1],['tan',1]]);
R('smith','shifu',1,16,1,[['shashi',2],['guaimu',1]]);
R('smith','shimao',1,40,4,[['shashi',2],['guaimu',1]]);
R('smith','shikuo',1,16,1,[['shashi',2],['guaimu',1]]);
R('smith','jinjian',1,90,10,[['jin',2],['tan',1]]);
R('smith','jinfu',1,80,10,[['jin',2],['tan',1]]);
R('smith','jinkuo',1,80,10,[['jin',2],['tan',1]]);
R('smith','chijinyue',1,220,26,[['chijin',2],['tan',2]]);
R('smith','chijinfu',1,200,26,[['chijin',2],['tan',2]]);
R('smith','chijinkuo',1,200,26,[['chijin',2],['tan',2]]);
R('smith','baijinqi',1,380,36,[['baijin',2],['tan',3]]);
R('smith','zaochimao',1,900,55,[['zaochiya',1],['baijin',2],['tan',3]]);
R('smith','fenghuiyue',1,1000,58,[['fenghuiya',1],['chijin',3],['tan',4]]);
// 削羽
R('fletch','mugong',1,20,1,[['guaimu',1],['sheng',1]]);
R('fletch','shizu',5,10,1,[['guaimu',1],['shashi',1]]);
R('fletch','sanggong',1,80,10,[['zi',1],['sheng',2]]);
R('fletch','jinzu',5,50,10,[['zi',1],['jin',1]]);
R('fletch','chijingong',1,240,26,[['chijin',2],['sheng',2]]);
R('fletch','chijinzu',5,160,26,[['chijin',1],['zi',1]]);
R('fletch','baijinzu',5,260,36,[['baijin',1],['zi',1]]);
R('fletch','dafenggong',1,1200,58,[['dafengyu',1],['baijin',2],['sheng',3]]);
// 制器
R('craft','sheng',2,8,1,[['jing',1]]);
R('craft','yuwang',1,16,1,[['jing',2],['sheng',1]]);
R('craft','baijianxi',1,20,5,[['jian',2]]);
R('craft','pijia',1,120,20,[['xipi',1],['sheng',1]]);
R('craft','sijia',1,240,34,[['sipi',2],['sheng',2]]);
R('craft','yayujia',1,900,60,[['yayupi',3],['sheng',2],['xiangya',1]]);
R('craft','siwang',1,80,10,[['sheng',3],['qi',2]]);
R('craft','luowang',1,200,26,[['sheng',4],['nan',2]]);
// 琢玉
R('jade','zhang',1,40,5,[['yu',1]]);
R('jade','bi',1,80,10,[['yu',2]]);
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
R('herb','xiushedangao',1,900,60,[['xiushedan',1],['zhuyu',2],['shuiping',1]]);
R('herb','fenghuanggao',1,1300,68,[['fenghuangyu',1],['baijiu',1],['zhuyu',2]]);
// 祭祀（祠礼配方）
R('rite','rite_ns1',1,400,5,[['zhang',1],['tu',1],['bi',1],['dao',1],['jian',1]]);
R('rite','rite_ns2',1,500,20,[['bi',1],['tu',1]]);
R('rite','rite_ns3',1,700,50,[['baiquan',1],['tu',1]]);
R('rite','rite_chang',1,120,1,[['tu',1]]);   // 常祭：随时可行的薄祭，祭祀经验的稳定来源
// 西山四套祠礼（南山三系 + 西山四系 = 七套，祭法各异）
R('rite','rite_xs1',1,600,66,[['niu',1],['yang',1],['shi',1]]);                          // 西山首经·华山：太牢
R('rite','rite_yu',1,3000,66,[['xi',100],['yu2',100],['jiu',100],['guiyu',100],['bi',100]]); // 羭山神：斋百日，百牺百瑜百樽百珪百璧
R('rite','rite_xs2a',1,500,67,[['yang',1],['shi',1]]);                                    // 西次二经·飞兽之神：少牢，白菅为席
R('rite','rite_xs2b',1,300,67,[['xiongji',1]]);                                           // 西次二经·十辈神：毛一雄鸡，钤而不糈
R('rite','rite_xs3',1,700,68,[['jiyu2',1],['ji',1]]);                                      // 西次三经：一吉玉瘗，糈用稷米
R('rite','rite_xs4',1,800,69,[['baiji',1],['dao',1],['jian',1]]);                         // 西次四经：一白鸡祈，糈以稻米，白菅为席
// 北山三套祠礼（南山三系 + 西山四系 + 北山三系 = 十套 + 常祭，祭法各异）
// 北次一经：瘗（雄鸡+玉+稌）；北次二经：投（雄鸡+璧+玉）；北次三经：三种各异（玉瘗 / 玉不瘗 / 璧瘗）
R('rite','rite_bs1',1,800,63,[['xiongji',1],['yu',1],['tu',1]]);                            // 北次一经：人面蛇身，瘗而不糈
R('rite','rite_bs2',1,820,64,[['xiongji',1],['bi',1],['yu',1]]);                            // 北次二经：蛇身人面，投而不糈
R('rite','rite_bs3',1,850,65,[['yu',1],['bi',1],['tu',1]]);                                   // 北次三经：神祇各异（廿神藻茝瘗／十四神玉不瘗／十神璧瘗），综合以玉+璧+糈
// 东山三套祠礼（终末章·荒经水路；东次四经无神无礼）
R('rite','rite_ds1',1,850,71,[['baiquan',1],['yupei',1]]);   // 东山首经·人身龙首之神：毛用一犬祈，䎶用鱼
R('rite','rite_ds2',1,870,73,[['xiongji',1],['bi',1]]);      // 东次二经·兽身人面载觡之神：毛用一鸡祈，婴用一璧瘗
R('rite','rite_ds3',1,900,77,[['yang',1],['shu',1]]);        // 东次三经·人身羊角之神：用一牡羊，米用黍

// ---- 西山制作链 ----
// 琢玉：祠器与玉符
R('jade','jiyu2',1,200,66,[['yu',2]]);
R('jade','guiyu',1,160,66,[['yu',1]]);
R('jade','yu2',1,240,66,[['meiyu',2]]);
R('jade','wenyaofu',1,320,68,[['wenyaoyi',1],['yu',2]]);      // 佩之天下大穰
R('jade','danghufu',1,300,68,[['danghuran',1],['yu',2]]);     // 食之不眴目
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
R('cook','jiu',1,60,66,[['ji',3]]);
// 炼药：西山药剂
R('herb','shilaisan',1,220,66,[['pingcao',1],['zhuyu',1],['shuiping',1]]);
R('herb','yinaosan',1,260,68,[['xiongqiong',1],['zhuyu',2],['shuiping',1]]);
R('herb','yushuisan',1,300,70,[['shatang',1],['shuiping',1]]);

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
);
// ---- 西山新制成品 ----
addItem(
  I('shatangshi','沙棠实','food', { value:90, heal:300, lvl:66, icon:'🍑', edible:true, effect:'可以御水，食之不溺' }),
  I('cangyuyue','苍玉钺','weapon',{ equip:true, weapon:true, dmg:54, lvl:72, value:1400, icon:'🪓', el:'金', rarity:'RARE' }),
  I('langganjian','琅玕剑','weapon',{ equip:true, weapon:true, dmg:60, lvl:74, value:1700, icon:'🗡️', el:'水', rarity:'RARE', py:'láng gān' }),
  I('yuzhanggong','豫章弓','bow',{ equip:true, weapon:true, ranged:true, dmg:40, lvl:70, value:1200, icon:'🏹', el:'木', rarity:'RARE' }),
  I('tongzu','铜镞矢','arrow',{ equip:true, slot:'quiver', dmg:12, lvl:66, value:60, icon:'➶', el:'金' }),
  I('tiezu','铁镞矢','arrow',{ equip:true, slot:'quiver', dmg:16, lvl:72, value:110, icon:'➶', el:'金' }),
  I('baihujia','白虎甲','armor',{ equip:true, slot:'armor', def:26, lvl:72, value:1500, icon:'🥋', rarity:'RARE' }),
  I('wenyaofu','文鳐符','charm',{ value:260, lvl:68, icon:'🪸', equip:true, slot:'charm', effect:'佩之天下大穰', yieldBonus:0.15, reqRecord:{ id:'wenyaoyu', tier:3 } }),
  I('danghufu','当扈符','charm',{ value:240, lvl:68, icon:'🪸', equip:true, slot:'charm', effect:'食之不眴目', xpBonus:0.10, reqRecord:{ id:'danghu', tier:3 }, py:'dāng hù' }),
  I('shilaisan','释劳散','potion',{ value:200, lvl:66, icon:'🧪', buff:{ name:'释劳', kind:'gather', gather:0.35, dur:240 }, effect:'食之已劳' }),
  I('yinaosan','益脑散','potion',{ value:240, lvl:68, icon:'🧪', buff:{ name:'益脑', kind:'xp', xpBonus:0.20, dur:300 }, effect:'芎藭之草' }),
  I('yushuisan','御水散','potion',{ value:280, lvl:70, icon:'🧪', buff:{ name:'御水', kind:'def', def:25, dur:300 }, effect:'可以御水' }),
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
    '美玉':['beishan-2-07','beishan-3-25'], '白玉':['beishan-2-05'], '青雄黄':['beishan-1-04'],
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
// 兵灾类（有兵/大兵）可被駮「可以御兵」御之；大风（移动效率）可被御风御使削弱；有恐（卜筮失准）扰决策。
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
  for (const src of [XISHAN, BEISHAN, DONGSHAN]){
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
  danxue:   { nodeId:'nanshan-3-03', kind:'观瑞', name:'凤皇',   desc:'丹穴之山有鸟焉，五采而文，见则天下安宁',   gain:'触发「天下安宁」吉兆' },
  nanyu:    { nodeId:'nanshan-3-13', kind:'观瑞', name:'鹓雏',   desc:'南禺之山有凤皇、鹓雏',                     gain:'触发「天下安宁」吉兆' },
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
    reward:{ yu:1 },
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
const BUILDINGS = {
  citan:   { id:'citan',   name:'祠坛',   lvl:10, xp:200, cost:[['guaimu',10],['shashi',10],['yu',1]], desc:'祭祀效果 ×1.5' },
  shichan: { id:'shichan', name:'市廛',   lvl:15, xp:300, cost:[['guaimu',15],['jin',2]],             desc:'商旅售价 +5%' },
  canglin: { id:'canglin', name:'仓廪',   lvl:20, xp:400, cost:[['guaimu',20],['tu',10]],             desc:'离线上限 +2 小时' },
  fenghuotai:{ id:'fenghuotai',name:'烽火台',lvl:30, xp:600, cost:[['shashi',20],['tan',10]],         desc:'征兆可提前预知' },
  xuegong: { id:'xuegong', name:'学宫',   lvl:40, xp:900, cost:[['guaimu',30],['yu',5],['jian',10]],  desc:'著录度获取 +25%' },
};

// ---------- 墟市（商旅） ----------
const SHOP_CATS = [
  { id:'kindling', icon:'🔥', name:'火种',   desc:'冶铸炊爨之用' },
  { id:'seed',      icon:'🌾', name:'嘉种',   desc:'圃艺之种' },
  { id:'beast',     icon:'🐕', name:'方国',   desc:'远方贸易之畜' },
];
const ShopStock = [
  { itemId:'huozhong', qty:10, cost:60,  lvl:1,  cat:'kindling' },
  { itemId:'shuiping', qty:10, cost:45,  lvl:1,  cat:'kindling' },
  { itemId:'seed_tu',   qty:5, cost:20,  lvl:1,  cat:'seed' },
  { itemId:'seed_dao',  qty:5, cost:45,  lvl:3,  cat:'seed' },
  { itemId:'seed_jian', qty:5, cost:80,  lvl:5,  cat:'seed' },
  { itemId:'seed_ji',   qty:5, cost:260, lvl:66, cat:'seed', note:'稷——西次三经祠礼「糈用稷米」' },
  { itemId:'baiquan',   qty:1, cost:600, lvl:25, cat:'beast', note:'三经祠礼「用一白狗祈」所需' },
  { itemId:'xiongji',   qty:1, cost:400, lvl:67, cat:'beast', note:'西次二经十辈神「毛一雄鸡」' },
  { itemId:'baiji',     qty:1, cost:1200,lvl:69, cat:'beast', note:'西次四经「用一白鸡祈」所需' },
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
  '𪁺𪁸':  { id:'yuyu',       el:'火', drop:'yuyu' },
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
  '麝':     { id:'she',      el:'木', drop:'shepi', py:'shè' },
  '鸓':     { id:'lei',      el:'木', drop:'niaoyu', py:'lěi' },
  '白蛇':   { id:'baishe',   el:'水', drop:'baishepi' },
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

// 祷过之山「多犀、兕、多象」——可猎之兽（非异兽）
const HUNT_META = {
  '犀': { id:'xi',    el:'土', drop:'xipi',    extra:'xirou' },
  '兕': { id:'si',    el:'土', drop:'sipi',    extra:'sirou' },
  '象': { id:'xiang', el:'土', drop:'xiangya', extra:'shougu' },
};

function beastStat(L, kind){
  let hp = 8 + 4*Math.pow(L, 1.55);
  let atk = 2 + 0.75*Math.pow(L, 1.15);
  let def = 0.5 + 0.4*Math.pow(L, 1.1);
  let xp  = 6 + 5*Math.pow(L, 1.55);
  if (kind === 'man')  { hp *= 1.3; atk *= 1.6; }
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
        if (meta.riteDrop) loot.push([meta.riteDrop, 0.6, 1]);       // 祠牲（牛羊豕）
        if (meta.hunt) loot.push(['xi', 0.25, 1]);                   // 可猎之兽兼得祭「牺」
        addMonster({
          id, name: f.name, py: (Items[meta.drop]||{}).py || meta.py || '',
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

// ---------- 六凶 BOSS（后羿所诛六凶 + 刑天） ----------
// 出处：《淮南子·本经训》「尧乃使羿诛凿齿于畴华之野，杀九婴于凶水之上，
// 缴大风于青邱之泽……断修蛇于洞庭，擒封豨于桑林」（公有领域）。
// 机制各自不同：连啮 / 五行变换 / 疾风 / 皮甲 / 蛇毒 / 狂暴 / 无首。
addMonster({ id:'zaochi', name:'凿齿', boss:true, el:'金', needLvl:40, hp:6000, atk:60, def:18, xp:8000,
  coins:2000, drop:'zaochiya', threat:5,
  form:'人形兽，齿长三尺，其状如凿（传闻形态，原文未详述）',
  special:{ name:'连啮', every:8, dmg:1.1, pierce:0.2, hits:3 }, desc:'周期性三连快齿' });
addMonster({ id:'jiuying', name:'九婴', boss:true, el:'水', needLvl:50, hp:9000, atk:75, def:22, xp:14000,
  coins:3200, drop:'jiuyingfa', threat:5,
  form:'九头怪，能喷水吐火（传闻形态，原文未详述）',
  special:{ name:'阴阳嬗变', every:14, dmg:1.2, pierce:0.3, elementShift:true }, desc:'周期性变换五行，克制关系随之改变' });
addMonster({ id:'dafeng', name:'大风', boss:true, el:'木', needLvl:58, hp:8000, atk:85, def:15, xp:18000,
  coins:4000, drop:'dafengyu', threat:5,
  form:'巨鸟，其翼遮天，飞则大风起（传闻形态，原文未详述）',
  special:{ name:'飘风', every:12, dmg:1.3, pierce:0.4, dodge:0.5 }, desc:' Periodic 大幅闪避' });
addMonster({ id:'yayu', name:'猰貐', boss:true, el:'土', needLvl:64, hp:14000, atk:70, def:45, xp:24000,
  coins:5200, drop:'yayupi', threat:5, py:'yà yǔ',
  form:'其状如牛，赤身、人面、马足，其音如婴儿，是食人（《北次二经》）',
  special:{ name:'革甲', every:0, dmg:0, armor:0.5 }, desc:'常驻厚甲减伤，受击叠层破甲' });
addMonster({ id:'xiushe', name:'修蛇', boss:true, el:'水', needLvl:70, hp:12000, atk:90, def:25, xp:30000,
  coins:6500, drop:'xiushedan', threat:5,
  form:'长蛇，能吞象（传闻形态，原文未详述）',
  special:{ name:'蛇毒', every:6, dmg:0.6, poison:{ dur:8, dmg:12 } }, desc:'攻击附带持续中毒' });
addMonster({ id:'fenghui', name:'封豨', boss:true, el:'水', needLvl:76, hp:16000, atk:110, def:30, xp:40000,
  coins:8000, drop:'fenghuiya', threat:5, py:'fēng xī',
  form:'大野猪，皮硬如铁，性悍（传闻形态，原文未详述）',
  special:{ name:'狂暴', every:0, dmg:0, enrage:0.5 }, desc:'半血以下攻击速度翻倍' });
addMonster({ id:'xingtian', name:'刑天', boss:true, el:'金', needLvl:81, hp:30000, atk:150, def:50, xp:80000,
  coins:16000, drop:'zaochiya', threat:5,
  form:'与帝争神，帝断其首，葬之常羊之山，乃以乳为目、以脐为口，操干戚以舞（《海外西经》）',
  special:{ name:'舞干戚', every:7, dmg:1.5, pierce:0.35 }, desc:'无首狂舞，重击且穿透' });

// ---------- 西山经神级 BOSS（西次三经 = 神话舞台主线） ----------
// 出处均为《西山经》原文（公有领域）。⚠️ 提示词/文案纪律：只用原文形态要素，
// 西王母不引用任何当代形象；帝江「浑敦无面目」——不可画面部。
addMonster({ id:'luwu', name:'陆吾', boss:true, el:'金', needLvl:56, hp:9000, atk:88, def:40, xp:26000,
  coins:6000, drop:'luwuuwei', threat:5, nodeId:'xishan-3-08',
  form:'虎身而九尾，人面而虎爪；是神也，司天之九部及帝之囿时（昆仑之丘守关者）',
  special:{ name:'九部之讨', every:9, dmg:1.0, pierce:0.25, hits:9 }, desc:'九尾九段连击' });
addMonster({ id:'xiwangmu', name:'西王母', boss:true, el:'金', needLvl:59, hp:13000, atk:105, def:36, xp:36000,
  coins:9000, drop:'xiwangmusheng', threat:5, nodeId:'xishan-3-11',
  form:'其状如人，豹尾虎齿而善啸，蓬发戴胜，是司天之厉及五残（玉山）',
  special:{ name:'善啸', every:10, dmg:1.2, pierce:0.45, fear:true }, desc:'啸声震慑：短时间内玩家命中降低' });
addMonster({ id:'dijiang', name:'帝江', boss:true, el:'土', needLvl:61, hp:20000, atk:120, def:30, xp:52000,
  coins:14000, drop:'dijiangnang', threat:5, nodeId:'xishan-3-18',
  form:'状如黄囊，赤如丹火，六足四翼，浑敦无面目（天山）',
  special:{ name:'混沌嬗变', every:12, dmg:1.1, pierce:0.3, elementShift:true }, desc:'无面目而五行不定，周期性变换属性' });

// ---------- 谒见（神祇节点 · 西次三经为核心） ----------
// 西山经主角是神：西次三经 13 位有名有形的神祇。不可讨伐的神祇以「谒见」接入：
// 前往其山，行谒见之礼（耗时 20s），入图鉴并得祝祐。BOSS 级神祇（陆吾/西王母/帝江）走讨伐。
const AUDIENCE_SITES = {};
(function buildAudienceSites(){
  for (const region of XISHAN.regions){
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
        deities: deities.map(d=>({ name:d.name, id:FAUNA_META[d.name].id, form:d.form||null, duty:d.duty||null, note:FAUNA_META[d.name].note||null })),
      };
    }
  }
})();

// ---------- 长线成就（里程碑） ----------
const Milestones = [
  { id:'rec_5',    name:'初识山川',   desc:'著录 5 种对象',     check:()=>recordedCount()>=5,     bonus:'经验 +2%',   xp:0.02 },
  { id:'rec_30',   name:'簿录渐成',   desc:'著录 30 种对象',    check:()=>recordedCount()>=30,    bonus:'经验 +3%',   xp:0.03 },
  { id:'yudi_all', name:'南山舆图',   desc:'南山经 39 山全部解锁', check:()=>Object.keys(Game.map||{}).length>=39, bonus:'采集 +5%', gather:0.05 },
  { id:'boss_all', name:'六凶伏诛',   desc:'击败六凶全部',      check:()=>['zaochi','jiuying','dafeng','yayu','xiushe','fenghui'].every(id=>Game.stats.bossKills && Game.stats.bossKills[id]), bonus:'伤害 +10%', dmg:0.10 },
  { id:'feng_omen',name:'凤皇来仪',   desc:'触发「天下安宁」吉兆', check:()=>!!Game.stats.omens?.fenghuang, bonus:'全局产出 +5%', yield:0.05 },
  { id:'guan_all', name:'三谷观象',   desc:'三处观象全部完成',  check:()=>Object.values(Game.observed||{}).filter(Boolean).length>=3, bonus:'离线上限 +1h', offlineCap:3600 },
  { id:'jingwei',  name:'精卫填海',   desc:'樵采累计 10000 次', check:()=>(Game.stats.gathers?.qiaocai||0)>=10000, bonus:'樵采产出 +8%', gather:0.08 },
  { id:'dayu',     name:'大禹治水',   desc:'全部营造完成',      check:()=>Object.keys(BUILDINGS).every(id=>Game.buildings?.[id]), bonus:'离线效率 +5%', offlineEff:0.05 },
  { id:'yushi_9',  name:'百兽率舞',   desc:'御使槽位全部启用',  check:()=>beastSlots()>=9 && Object.values(Game.deployed||{}).filter(Boolean).length>=9, bonus:'全技能经验 +3%', xp:0.03 },
  // ---- 西山经长线成就 ----
  { id:'xs_yudi',  name:'西山舆图',   desc:'西山经 77 山全部解锁', check:()=>Object.keys(Game.map||{}).filter(id=>id.indexOf('xishan-')===0).length>=77, bonus:'全局产出 +8%', yield:0.08 },
  { id:'xs_luwu',  name:'昆吾守关',   desc:'击败陆吾',          check:()=>!!(Game.stats.bossKills&&Game.stats.bossKills.luwu), bonus:'采集 +5%', gather:0.05 },
  { id:'xs_xiwm',  name:'玉山谒母',   desc:'击败西王母',        check:()=>!!(Game.stats.bossKills&&Game.stats.bossKills.xiwangmu), bonus:'伤害 +10%', dmg:0.10 },
  { id:'xs_dijiang',name:'天山混沌',  desc:'击败帝江',          check:()=>!!(Game.stats.bossKills&&Game.stats.bossKills.dijiang), bonus:'全局产出 +10%', yield:0.10 },
  { id:'xs_danmu', name:'丹木五岁',   desc:'峚山养成完成一次',  check:()=>(Game.danmu||{}).done>=1, bonus:'圃艺产出 +15%', gather:0.15 },
  { id:'xs_deity', name:'西山百神',   desc:'谒见全部 11 位神祇', check:()=>Object.keys(Game.records||{}).filter(id=>id.indexOf('deity_')===0 && Game.records[id].count>0).length>=14, bonus:'祭祀效率 +20%', jisi:0.20 },
  // ---- 北山经长线成就 ----
  { id:'bs_yudi',  name:'北山舆图',   desc:'北山经 88 山全部解锁', check:()=>Object.keys(Game.map||{}).filter(id=>id.indexOf('beishan-')===0).length>=88, bonus:'全局产出 +10%', yield:0.10 },
  { id:'bs_qisuan',name:'器酸三岁',   desc:'咸山器酸养成完成',    check:()=>!!(Game.grow&&Game.grow.qisuan&&Game.grow.qisuan.done), bonus:'圃艺产出 +10%', gather:0.10 },
  { id:'bs_jingwei',name:'东海渐浅',  desc:'发鸠山精卫填海养成完成', check:()=>!!(Game.grow&&Game.grow.jingwei&&Game.grow.jingwei.done), bonus:'樵采产出 +10%', gather:0.10 },
];

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

// ---------- 浏览器全局导出 ----------
if (typeof window !== 'undefined'){
  window.TUNING = TUNING; window.RARITY = RARITY; window.RARITY_TIERS = RARITY_TIERS;
  window.Skills = Skills; window.SKILL_GROUPS = SKILL_GROUPS; window.ALL_SKILL_IDS = ALL_SKILL_IDS;
  window.Items = Items; window.Recipes = Recipes; window.RECIPE_SKILL = RECIPE_SKILL;
  window.Monsters = Monsters; window.ShopStock = ShopStock; window.SHOP_CATS = SHOP_CATS;
  window.OMENS = OMENS; window.OBSERVE_SITES = OBSERVE_SITES; window.RITES = RITES;
  window.BUILDINGS = BUILDINGS; window.Milestones = Milestones; window.CODEX = CODEX;
  window.GATHER_POOLS = GATHER_POOLS; window.NANSHAN = NANSHAN;
  window.WORLD = WORLD; window.XISHAN = XISHAN; window.CHAPTERS = CHAPTERS; window.chapterOf = chapterOf;
  window.AUDIENCE_SITES = AUDIENCE_SITES; window.GROW_SITES = GROW_SITES;
  window.SPECIAL_NODES = SPECIAL_NODES; window.GATHER_BONUS = GATHER_BONUS;
  window.rarityId = rarityId; window.rarityMeta = rarityMeta; window.rarityName = rarityName;
  window.rarityColor = rarityColor; window.rarityClass = rarityClass;
  window.tierOfLevel = tierOfLevel; window.recordTierOf = recordTierOf;
  window.masteryBonus = masteryBonus; window.dropWeight = dropWeight;
  window.wuxingMult = wuxingMult; window.wuxingSheng = wuxingSheng;
  window.recordedCount = recordedCount; window.beastSlots = beastSlots;
  window.ITEM_REGION = ITEM_REGION; window.ORDER_POOL = ORDER_POOL;
  window.regionById = regionById; window.orderQtyFor = orderQtyFor;
}
