// ===== 物品绘形：统一水墨物品图标 =====
// 物品有三百余种，逐个手绘不现实；但原用 emoji 在各系统渲染不一，
// 与整体水墨界面也不协调。故按「类型 + 语义」归为若干族，每族一枚
// 水墨小图标，既统一观感，又保留辨识度。
//
// 归族原则：
//   · 同一族共用一个基本形（如「木族」皆为枝干，「玉族」皆为璧璜）；
//   · 同族内按 emoji 或名再细分（如矿物中的金 / 玉 / 石 / 水）；
//   · 无法归类者按类型兜底，绝不留空（空图标会被误读为「无此物」）。
(function(){
'use strict';

const INK = 'currentColor';
const WOOD = '#8A6242';
const FIRE = '#B03A2B';
const GOLD = '#B08A34';
const WATER = '#2E5269';
const JADE  = '#4F6E45';
const BLOOD = '#7A3B3B';

// ---------- 族形（皆为 24×24 视框的小图标，与技能 / 异兽 64 视框风格一致） ----------
const SHAPES = {
  // 枝干（木 / 薪 / 苇）
  branch: `<path d="M12 22 V6" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 10 Q6 9 4 4 Q10 4 12 10 Z" fill="${JADE}"/>
    <path d="M12 14 Q18 13 20 8 Q14 8 12 14 Z" fill="${JADE}" opacity=".85"/>`,
  // 圆木（薪柴）
  log: `<rect x="4" y="8" width="16" height="9" rx="4.5" fill="${WOOD}"/>
    <ellipse cx="7" cy="12.5" rx="2.6" ry="4" fill="#E8DFC8" opacity=".8"/>
    <path d="M10 10.5 Q14 12.5 10 14.5" stroke="#4A3222" stroke-width="1.2" fill="none" opacity=".55"/>`,
  // 圆石
  stone: `<path d="M5 17 Q3 10 9 7 Q16 4 20 10 Q22 17 16 19 L8 19 Z" fill="${INK}"/>
    <path d="M8 10 Q12 8 14 11" stroke="#8C877C" stroke-width="1.4" fill="none" opacity=".7"/>`,
  // 金锭 / 钱
  gold: `<ellipse cx="12" cy="15" rx="7.5" ry="4.6" fill="${GOLD}"/>
    <ellipse cx="12" cy="13" rx="7.5" ry="4.6" fill="#D4B05A"/>
    <rect x="10" y="11.4" width="4" height="4" fill="${INK}" opacity=".7"/>`,
  // 玉璜 / 璧
  jade: `<circle cx="12" cy="12" r="7.6" fill="${JADE}"/>
    <circle cx="12" cy="12" r="2.8" fill="#E8DFC8"/>`,
  // 礼器：双耳三足鼎（祠祀所用）
  rite: `<path d="M6.4 8.4 H17.6 Q16.8 17.6 12 17.6 Q7.2 17.6 6.4 8.4 Z" fill="${INK}"/>
    <path d="M4.6 7 H19.4" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    <path d="M6.4 8.4 Q3.6 8.4 4 12 M17.6 8.4 Q20.4 8.4 20 12" stroke="${INK}" stroke-width="1.5" fill="none"/>
    <path d="M8 17.6 L7 21 M12 17.6 L12 21 M16 17.6 L17 21" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M9.6 11.6 H14.4" stroke="${GOLD}" stroke-width="1.5" fill="none"/>`,
  // 铜钱
  coin: `<circle cx="12" cy="12" r="8" fill="${GOLD}"/>
    <rect x="9" y="9" width="6" height="6" fill="#3A3226"/>`,
  // 鼎 / 器
  vessel: `<path d="M6 9 H18 Q17 19 12 19 Q7 19 6 9 Z" fill="${INK}"/>
    <path d="M4.5 8 H19.5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M8 19 L7 22 M16 19 L17 22" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  // 药瓶
  flask: `<path d="M9 4 H15 V9 L18 18 Q18.6 21 15 21 H9 Q5.4 21 6 18 L9 9 Z" fill="${INK}" opacity=".92"/>
    <path d="M7.6 16 H16.4" fill="none" stroke="${JADE}" stroke-width="1.8" opacity=".85"/>
    <path d="M10 4 H14" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round"/>`,
  // 水滴
  drop: `<path d="M12 3 Q18 11 18 14.5 A6 6 0 0 1 6 14.5 Q6 11 12 3 Z" fill="${WATER}"/>
    <path d="M9.5 14 Q9.5 17 12 17.6" stroke="#8FB4C9" stroke-width="1.4" fill="none" opacity=".8"/>`,
  // 谷穗
  grain: `<path d="M12 22 V9" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12 12 Q6 11 5 6 Q11 6 12 12 Z" fill="${GOLD}"/>
    <path d="M12 16 Q18 15 19 10 Q13 10 12 16 Z" fill="${GOLD}" opacity=".8"/>
    <path d="M12 8 Q9 5 12 2 Q15 5 12 8 Z" fill="${GOLD}" opacity=".9"/>`,
  // 稻 / 米
  rice: `<ellipse cx="12" cy="13" rx="7" ry="8" fill="#E8DFC8" stroke="${INK}" stroke-width="1.4"/>
    <path d="M12 6 V20 M8 9 Q12 12 8 15 M16 9 Q12 12 16 15" stroke="${INK}" stroke-width="1.1" fill="none" opacity=".55"/>`,
  // 鱼
  fish: `<path d="M19 12 Q13 6 5 12 Q13 18 19 12 Z" fill="${WATER}"/>
    <path d="M19 12 L22 8.5 V15.5 Z" fill="${WATER}" opacity=".8"/>
    <circle cx="8" cy="11" r="1.3" fill="#E8DFC8"/>`,
  // 贝壳
  shell: `<path d="M12 20 Q3 18 4 9 Q6 3 12 4 Q18 3 20 9 Q21 18 12 20 Z" fill="${INK}" opacity=".9"/>
    <path d="M12 4 V19 M7.5 6 Q9 12 9 19 M16.5 6 Q15 12 15 19" stroke="#E8DFC8" stroke-width="1.1" fill="none" opacity=".55"/>`,
  // 骨
  bone: `<path d="M6 18 Q4 15 7 13 L15 5 Q13 2 16 2 Q19 2 18 5 L10 13 Q13 16 10 18 Q7 20 6 18 Z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`,
  // 肉
  meat: `<path d="M5 15 Q5 8 12 7 Q19 6 19 13 Q19 19 12 19 Q6 19 5 15 Z" fill="${BLOOD}"/>
    <path d="M8 11 Q13 9 16 12" stroke="#E8DFC8" stroke-width="1.5" fill="none" opacity=".7"/>`,
  // 羽
  feather: `<path d="M6 20 Q7 9 18 4 Q16 15 6 20 Z" fill="${WATER}" opacity=".85"/>
    <path d="M6 20 L17 5" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`,
  // 爪 / 蹄
  paw: `<ellipse cx="12" cy="16" rx="6" ry="5" fill="${INK}"/>
    <circle cx="7" cy="9.5" r="2.5" fill="${INK}"/><circle cx="12" cy="7.5" r="2.6" fill="${INK}"/>
    <circle cx="17" cy="9.5" r="2.5" fill="${INK}"/>`,
  // 角
  horn: `<path d="M7 20 Q5 12 12 4 Q19 8 17 14 Q16 19 12 20 Z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.5"/>
    <path d="M9 18 Q9 12 13 7" stroke="${INK}" stroke-width="1.2" fill="none" opacity=".5"/>`,
  // 皮 / 毛
  hide: `<path d="M6 5 Q12 3 18 5 L17 17 Q12 21 7 17 Z" fill="${WOOD}"/>
    <path d="M8 8 L8 15 M12 7 L12 17 M16 8 L16 15" fill="none" stroke="#4A3222" stroke-width="1.1" opacity=".55"/>`,
  // 心 / 血
  heart: `<path d="M12 20 Q4 14.5 4 9.5 A4.4 4.4 0 0 1 12 7 A4.4 4.4 0 0 1 20 9.5 Q20 14.5 12 20 Z" fill="${BLOOD}"/>`,
  // 眼
  eye: `<path d="M3 12 Q12 4 21 12 Q12 20 3 12 Z" fill="none" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="12" cy="12" r="4" fill="${INK}"/><circle cx="13.4" cy="10.8" r="1.4" fill="#E8DFC8"/>`,
  // 头 / 首
  head: `<path d="M7 21 Q4 11 12 4 Q20 11 17 21 Z" fill="${INK}" opacity=".92"/>
    <circle cx="9.4" cy="12" r="1.5" fill="#E8DFC8"/><circle cx="14.6" cy="12" r="1.5" fill="#E8DFC8"/>`,
  // 尾 / 毛
  tail: `<path d="M13 21 Q19 15 15 8 Q22 12 18 19 Q15 22 13 21 Z" fill="${INK}"/>
    <path d="M6 21 Q10 16 8 11" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // 冠 / 玉冕
  crown: `<path d="M5 18 L5 9 L9 13 L12 6 L15 13 L19 9 L19 18 Z" fill="${GOLD}"/>
    <path d="M5 19 H19" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  // 斧
  axe: `<path d="M15 3 L19 7 L15 11 L11 7 Z" fill="${GOLD}"/>
    <path d="M15 9 L7 21" fill="none" stroke="${WOOD}" stroke-width="2.4" stroke-linecap="round"/>`,
  // 镐 / 凿
  pick: `<path d="M4 8 Q10 4 17 9" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M10 8 L14 21" fill="none" stroke="${WOOD}" stroke-width="2.4" stroke-linecap="round"/>`,
  // 网
  net: `<path d="M4 6 Q12 2 20 6 V18 Q12 22 4 18 Z" fill="none" stroke="${INK}" stroke-width="1.8"/>
    <path d="M4 12 H20 M12 4 V20 M8 5 V19 M16 5 V19" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>`,
  // 弓
  bow: `<path d="M8 3 Q17 12 8 21" stroke="${WOOD}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M8 3 V21" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".6"/>`,
  // 箭
  arrow: `<path d="M3 21 L19 5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M19 5 L13 6 L18 10 Z" fill="${GOLD}"/>
    <path d="M3 21 L6 15 L9 19 Z" fill="${FIRE}"/>`,
  // 剑 / 刀
  blade: `<path d="M6 20 L17 6 Q20 3 21 6 Q21 8 18 10 L8 21 Z" fill="${INK}"/>
    <path d="M4 21 L8 17" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>`,
  // 戟 / 枪
  spear: `<path d="M6 21 L18 7" fill="none" stroke="${WOOD}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M18 7 Q22 3 21 1 Q17 2 16 6 Z" fill="${INK}"/>
    <path d="M15 9 Q19 8 20 11" stroke="${INK}" stroke-width="1.6" fill="none"/>`,
  // 盾 / 甲
  armor: `<path d="M12 3 Q19 6 19 12 Q19 18 12 21 Q5 18 5 12 Q5 6 12 3 Z" fill="${INK}"/>
    <path d="M12 6 V18 M7 9 H17" fill="none" stroke="${GOLD}" stroke-width="1.6" opacity=".75"/>`,
  // 帛 / 书
  silk: `<path d="M7 4 Q12 2 17 4 V16 Q12 18 7 16 Z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.5"/>
    <path d="M12 3 V17" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".55"/>
    <path d="M8.5 8 H11 M13 8 H15.5 M8.5 12 H11 M13 12 H15.5" fill="none" stroke="${INK}" stroke-width="1" opacity=".5"/>`,
  // 酒器
  goblet: `<path d="M7 4 H17 L15 11 Q12 14 9 11 Z" fill="${INK}"/>
    <path d="M12 13 V19 M8 20 H16" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M8.5 6 H15.5" fill="none" stroke="${GOLD}" stroke-width="1.4" opacity=".8"/>`,
  // 灯 / 烛
  lamp: `<path d="M9 20 H15 L16 12 H8 Z" fill="${INK}"/>
    <path d="M12 12 Q9 8 12 4 Q15 8 12 12 Z" fill="${FIRE}"/>
    <path d="M7 21 H17" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  // 食 / 餐
  bowl: `<path d="M4 12 H20 Q19 19 12 19 Q5 19 4 12 Z" fill="${INK}"/>
    <path d="M2.5 11 H21.5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10 8 Q12 5 14 8" stroke="#E8DFC8" stroke-width="1.3" fill="none" opacity=".7"/>`,
  // 果
  fruit: `<circle cx="12" cy="14" r="6.6" fill="${BLOOD}"/>
    <path d="M12 7.4 Q12 3 15 2" stroke="${JADE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M12 8 Q16 6 17 8 Q14 11 12 8 Z" fill="${JADE}"/>`,
  // 珠 / 宝
  pearl: `<circle cx="12" cy="13" r="6" fill="#E4DCC8" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="9.8" cy="10.8" r="1.8" fill="#FFFFFF" opacity=".85"/>
    <path d="M8 5 Q12 2 16 5" stroke="${GOLD}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  // 布 / 巾
  cloth: `<path d="M5 6 Q12 3 19 6 L17 20 Q12 22 7 20 Z" fill="${FIRE}" opacity=".85"/>
    <path d="M8 8 L9 18 M13 8 L13 19" fill="none" stroke="#E8DFC8" stroke-width="1.1" opacity=".6"/>`,
  // 杖 / 木棒
  staff: `<path d="M6 21 L17 4" fill="none" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M15 4 Q19 2 19 6" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  // 镜 / 鉴
  mirror: `<circle cx="12" cy="11" r="7" fill="none" stroke="${INK}" stroke-width="2"/>
    <path d="M12 18 V22 M8 22 H16" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  // 珠串
  beads: `<circle cx="12" cy="6" r="2.4" fill="${GOLD}"/><circle cx="8" cy="10" r="2.4" fill="${GOLD}" opacity=".9"/>
    <circle cx="16" cy="10" r="2.4" fill="${GOLD}" opacity=".9"/><circle cx="10" cy="15" r="2.4" fill="${GOLD}" opacity=".85"/>
    <circle cx="14" cy="15" r="2.4" fill="${GOLD}" opacity=".85"/><circle cx="12" cy="20" r="2.6" fill="${GOLD}"/>`,
  // 符 / 籙
  talisman: `<path d="M9 2 H15 V12 L12 15 L9 12 Z" fill="${FIRE}" opacity=".9"/>
    <path d="M12 15 V22" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M10.4 6 H13.6 M10.4 9 H13.6" fill="none" stroke="#E8DFC8" stroke-width="1.2"/>`,
  // 爻 / 卜
  yarrow: `<path d="M6 21 L9 5 M12 21 L12 3 M18 21 L15 5" fill="none" stroke="${WOOD}" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 3 L9 1 M12 3 L15 1" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`,
  // 尸 / 骨殖
  corpse: `<circle cx="12" cy="6" r="3.4" fill="#E4DCC8" stroke="${INK}" stroke-width="1.3"/>
    <path d="M9 11 H15 L16 21 H8 Z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.3"/>
    <path d="M10 15 H14 M10 18 H14" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>`,
  // 通用兜底
  box: `<path d="M4 9 H20 V20 H4 Z" fill="${WOOD}"/>
    <path d="M4 9 L6 5 H18 L20 9 Z" fill="${INK}"/>
    <path d="M10 9 H14 V20 H10 Z" fill="${GOLD}" opacity=".8"/>`,
  // 星 / 宝光
  spark: `<path d="M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z" fill="${GOLD}"/>`,
  // 毒 / 瘴
  toxin: `<circle cx="12" cy="13" r="7" fill="${JADE}" opacity=".75"/>
    <circle cx="9.6" cy="11" r="1.4" fill="#E8DFC8"/><circle cx="14" cy="14" r="1.4" fill="#E8DFC8"/>
    <path d="M9 18 Q12 21 15 18" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
};

// ---------- 归族映射 ----------
// 1) emoji → 族：按物品原有 emoji 细分（同一 emoji 必属同一族）
const BY_EMOJI = {
  '🌿':'branch','🌱':'branch','🌳':'branch','🪹':'branch','🪵':'log','🪸':'shell','🪶':'feather','🪨':'stone',
  '🪙':'coin','💠':'jade','💧':'drop','💎':'jade','⚪':'stone','⚫':'stone','🟡':'gold','🔶':'gold','🟢':'jade',
  '⚗️':'flask','🧪':'flask','🔮':'spark','✨':'spark','🔴':'coral','🟩':'jade','🟤':'log',
  '🐚':'shell','🐟':'fish','🐌':'snail','🍚':'rice','🌾':'grain','🍶':'goblet','🍖':'meat','🍣':'fish','🍲':'bowl','🍒':'fruit','🍑':'fruit',
  '🦴':'bone','🥩':'meat','🧶':'cloth','🫀':'heart','👂':'ear','👁️':'eye','📍':'beastmark','👑':'crown',
  '🦷':'tusk','🦠':'toxin','☣':'toxin','🔥':'flame','🧴':'flask','🧵':'cloth','🐾':'paw','🐍':'snake','🐢':'turtle',
  '🐎':'horse','🐗':'boar','🐆':'leopard','🐅':'tiger','🐉':'dragon','🦅':'eagle','🦩':'flamebird','🦊':'fox','🦉':'owl',
  '🦝':'raccoon','🦌':'deer','🦔':'hedgehog','🐿️':'squirrel','🦥':'sloth','🦦':'otter','🦘':'kangaroo','🦡':'badger',
  '🦚':'peacock','🦜':'parrot','🐓':'rooster','🐔':'hen','🐕':'dog','🐖':'pig','🐄':'cow','🐂':'ox','🐏':'ram','🐐':'goat',
  '🐑':'sheep','🐐':'goat','🐒':'monkey','🐴':'horse','🐈':'cat','🐇':'rabbit','🦙':'llama','🦒':'giraffe','🐪':'camel',
  '🐘':'elephant','🦏':'rhino','🐄':'cow','🦌':'deer','🐟':'fish','🐠':'fish','🐡':'puffer','🦈':'shark','🐙':'octopus','🦑':'squid',
  '🦀':'crab','🦞':'lobster','🦐':'shrimp','🪸':'shell','⚔️':'blade','🗡️':'blade','🔱':'spear','🔺':'spear','🏹':'bow','➶':'arrow',
  '🪓':'axe','⛏️':'pick','🕸️':'net','🧪':'flask','🫙':'jar','🕯️':'lamp','📗':'silk','📘':'silk','🐾':'paw',
  '🎈':'spark','⚱️':'talisman','🩸':'heart','🥋':'armor','🎋':'yarrow','📿':'beads','🗺️':'map','🕯️':'lamp','🪶':'feather',
};
// 2) 类型 → 族：无法按 emoji 细分时的兜底
const BY_TYPE = {
  wood:'branch', mineral:'stone', fish:'fish', herb:'branch', seed:'grain', crop:'rice',
  beast:'paw', material:'branch', rite:'rite', charm:'jade', food:'bowl',
  tool:'axe', weapon:'blade', bow:'bow', arrow:'arrow', armor:'armor', potion:'flask',
};
// 3) 名 → 族：同名补判（emoji 缺失或不准时以名兜底）
const BY_NAME = [
  ['jade',['玉','璧','璜','璋','圭','琮','瑄','琳','琅','璆','璇','瑜','珂','珊','琥']],
  ['gold',['金','铜','钱','银','铁','锡','铅','镕','冶','锻','铸','镢','斧','斤','锐','锋','错','锥','凿','刀','剑','戟','矛','矢','箭','铳','针','镖','锤','钺','贝']],
  // 容器器皿优先于内容物：「清水瓶」是瓶，不是水滴
  ['jar',['瓶','瓮','壶','罐','樽','罍','尊','卮','盏']],
  ['drop',['水','泉','津','河','江','海','湖','露','霜','雪','冰','雨','沫','浴']],
  ['flame',['火','炎','烬','燧','炉','灶','薪','炬','烛','燔','燎','丹','砂','炬','融','熔']],
  ['grain',['禾','稻','稌','稷','黍','麦','菽','粟','麻','稷','谷','梁','稙']],
  ['herb',['草','芝','菌','苔','藜','芑','葱','韭','蒿','兰','芷','薇','蘼','苓','蓉','芸']],
  ['bone',['骨','牙','角','齿','骸','胫','脊','髓']],
  ['meat',['肉','脯','脂','膏','血','髓','脏','肝','肺','肠']],
  ['feather',['羽','毛','翎','翮','燕','鷩','翠','鹤','凫','鸨','鹄','翟','雉','鸮','鹑','鹦','鹊','鹰','隼','雕','鹏','鸾','凤','鸳','鸯','凫','鹅','鸿','雁','燕','雕','鹘','鵕','鹗','鸱','鹫','枭','鹙','鵙','鹇','鹚','鹢','鹞','鹑']],
  ['flask',['药','丹','散','丸','膏','醴','醪','汤','露','剂','膏','丸','散','汤']],
  // 弓弩优先于「章」：「豫章弓」是弓，不是符
  ['bow',['弓','弩','矢']],
  ['talisman',['章','印','符','券','牌','简','册','书']],
  ['silk',['帛','布','纨','纩','葛','罗','锦','纶','组','绶','幡','帜','徽','纛']],
  ['beastmark',['皮','毛','革','角','髓','血','心','眼','耳','尾','爪','牙','首','脏']],
  ['pearl',['珠','贝','珂','玳','瑁','蚌','螺','玶']],
  ['spine',['骨','刺','鲠','鳞','甲','壳','介','螯']],
];

// 补充族形（上面的 BY_EMOJI 里引用了一些，这里补齐）
SHAPES.snail = `<path d="M4 18 Q4 12 10 12 Q16 12 16 17 Q16 20 12 20 Z" fill="${INK}" opacity=".9"/>
  <circle cx="12" cy="13" r="3.4" fill="#E8DFC8" opacity=".8"/>
  <path d="M8 12 Q9 9 11 11" stroke="${INK}" stroke-width="1.2" fill="none"/>`;
SHAPES.coral = `<path d="M12 21 V12" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 13 Q8 12 7 7 M12 12 Q16 11 17 6" stroke="${FIRE}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M12 9 Q9 8 8 4 M12 9 Q15 8 16 4" stroke="${FIRE}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`;
SHAPES.flame = `<path d="M12 21 Q5 15 9 8 Q10 12 12 10 Q13 5 11 2 Q18 8 16 15 Q15 20 12 21 Z" fill="${FIRE}"/>`;
SHAPES.beastmark = `<circle cx="12" cy="12" r="5" fill="none" stroke="${INK}" stroke-width="2"/>
  <path d="M12 7 V3 M12 21 V17 M7 12 H3 M21 12 H17" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
SHAPES.tusk = `<path d="M5 20 Q4 8 13 3 Q16 9 13 16 Q11 19 9 20 Z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.5"/>`;
SHAPES.ear = `<path d="M9 4 Q16 3 17 10 Q18 17 12 20 Q8 21 8 17 Q8 14 11 13 Q13 12 12 9 Q10 6 9 4 Z" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
SHAPES.snake = `<path d="M6 21 Q4 16 9 14 Q14 12 10 9 Q6 6 11 3" stroke="${JADE}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
SHAPES.turtle = `<ellipse cx="12" cy="13" rx="8" ry="6.4" fill="${JADE}"/>
  <circle cx="12" cy="13" r="3.4" fill="none" stroke="${INK}" stroke-width="1.3"/>
  <path d="M4 13 H1 M20 13 H23 M12 6.6 V4 M12 19.4 V21" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
SHAPES.horse = `<path d="M6 20 Q4 12 9 9 Q13 7 15 4 Q17 6 16 9 L19 8 Q21 12 17 15 Q13 18 11 20 Z" fill="${INK}" opacity=".92"/>`;
SHAPES.boar = `<path d="M5 19 Q4 12 10 10 Q16 8 19 13 Q20 17 15 19 Z" fill="${INK}" opacity=".92"/>
  <path d="M16 14 L21 15 M16 17 L21 18" fill="none" stroke="#E4DCC8" stroke-width="1.6" stroke-linecap="round"/>`;
SHAPES.leopard = `<path d="M6 19 Q4 11 11 9 Q18 7 20 13 Q20 18 15 19 Z" fill="${GOLD}"/>
  <circle cx="9" cy="13" r="1.3" fill="${INK}"/><circle cx="14" cy="11.6" r="1.3" fill="${INK}"/>
  <circle cx="17" cy="15" r="1.2" fill="${INK}"/>`;
SHAPES.tiger = `<path d="M6 19 Q4 11 11 9 Q18 7 20 13 Q20 18 15 19 Z" fill="${FIRE}"/>
  <path d="M8 11 L9 15 M12 10 L12.6 14.6 M16 10.6 L16 14.4" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
SHAPES.dragon = `<path d="M3 18 Q7 16 8 12 Q9 8 14 7 Q19 6 21 9 Q22 12 19 12 Q17 12 17 9 Q13 10 12 13 Q13 17 17 16 Q20 15 21 18 Q22 21 18 21 Q10 21 8 19 Q5 20 3 18 Z" fill="${JADE}"/>`;
SHAPES.eagle = `<path d="M12 4 Q15 8 15 12 L20 9 Q19 16 12 20 Q5 16 4 9 L9 12 Q9 8 12 4 Z" fill="${INK}" opacity=".92"/>`;
SHAPES.flamebird = `<path d="M12 5 Q15 9 15 13 L21 10 Q20 17 12 21 Q4 17 3 10 L9 13 Q9 9 12 5 Z" fill="${FIRE}"/>`;
SHAPES.fox = `<path d="M6 19 Q4 12 10 10 Q16 8 19 12 Q20 16 16 19 Z" fill="${FIRE}"/>
  <path d="M7 11 L6 6 L11 9 M17 9 L18 6 L20 11" fill="${FIRE}"/>
  <circle cx="9.5" cy="13.5" r="1.2" fill="${INK}"/>`;
SHAPES.owl = `<path d="M6 20 Q5 9 12 8 Q19 9 18 20 Z" fill="${WOOD}"/>
  <circle cx="9.5" cy="13" r="2.6" fill="#E8DFC8"/><circle cx="14.5" cy="13" r="2.6" fill="#E8DFC8"/>
  <circle cx="9.5" cy="13" r="1.2" fill="${INK}"/><circle cx="14.5" cy="13" r="1.2" fill="${INK}"/>`;
SHAPES.raccoon = `<circle cx="12" cy="13" r="7.4" fill="${WOOD}"/>
  <circle cx="9.4" cy="12" r="1.5" fill="${INK}"/><circle cx="14.6" cy="12" r="1.5" fill="${INK}"/>
  <path d="M8 16 Q12 18 16 16" stroke="${INK}" stroke-width="1.2" fill="none" opacity=".6"/>`;
SHAPES.deer = `<path d="M8 20 Q6 13 11 10 Q16 7 18 11 Q19 15 15 20 Z" fill="${WOOD}"/>
  <path d="M9 10 Q7 5 4 4 M12 9 Q13 4 16 3" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
SHAPES.hedgehog = `<path d="M5 19 Q4 11 11 9 Q17 7 19 12 Q20 16 15 19 Z" fill="${WOOD}"/>
  <path d="M7 13 L6 8 M10 10 L10 5 M13.5 9.4 L14.5 5 M16.6 11 L18 7" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
SHAPES.squirrel = `<path d="M9 20 Q8 13 13 11 Q17 9 18 13 Q19 17 15 19" fill="none" stroke="${WOOD}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="11" cy="10" r="4" fill="${WOOD}"/>`;
SHAPES.sloth = `<ellipse cx="12" cy="14" rx="7" ry="6" fill="${WOOD}"/>
  <circle cx="11" cy="8" r="4" fill="${WOOD}"/>
  <path d="M7 12 Q12 10 17 12" stroke="${INK}" stroke-width="1.2" fill="none" opacity=".55"/>`;
SHAPES.otter = `<ellipse cx="12" cy="14" rx="8" ry="5.4" fill="${WOOD}"/>
  <circle cx="7" cy="10" r="3.4" fill="${WOOD}"/><circle cx="16" cy="10" r="3" fill="${WOOD}"/>`;
SHAPES.kangaroo = `<path d="M8 20 Q6 12 11 9 Q15 6 17 10 L18 6 L21 8 L19 13 Q19 18 15 20 Z" fill="${WOOD}"/>`;
SHAPES.badger = `<ellipse cx="12" cy="15" rx="8" ry="5" fill="${INK}" opacity=".9"/>
  <path d="M8 10 Q12 8 16 10" fill="none" stroke="#E8DFC8" stroke-width="1.8"/>`;
SHAPES.peacock = `<path d="M12 20 Q9 13 12 8 Q15 13 12 20 Z" fill="${JADE}"/>
  <circle cx="12" cy="7" r="2.6" fill="${WATER}"/>
  <path d="M12 13 Q6 12 5 8 M12 13 Q18 12 19 8" stroke="${JADE}" stroke-width="1.4" fill="none" opacity=".8"/>`;
SHAPES.parrot = `<path d="M8 20 Q6 12 11 9 Q16 7 18 11 Q19 16 14 20 Z" fill="${FIRE}"/>
  <path d="M17 11 L21 12 L17 14 Z" fill="${GOLD}"/>`;
SHAPES.rooster = `<path d="M9 20 Q7 13 12 10 Q16 8 18 12 Q19 16 15 20 Z" fill="${FIRE}"/>
  <path d="M15 8 Q16 5 19 6 M17 6 Q19 4 20 6" stroke="${FIRE}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
SHAPES.hen = `<path d="M9 20 Q7 14 12 11 Q16 9 18 13 Q19 16 15 20 Z" fill="${WOOD}"/>
  <path d="M15 9 Q16 6 19 7" stroke="${WOOD}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
SHAPES.dog = `<path d="M8 20 Q6 13 11 10 Q16 8 18 12 Q19 16 15 20 Z" fill="${WOOD}"/>
  <path d="M8 11 Q5 8 6 5 M17 10 Q20 8 19 5" stroke="${WOOD}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
SHAPES.pig = `<ellipse cx="12" cy="14" rx="8" ry="6" fill="${FIRE}" opacity=".9"/>
  <circle cx="15" cy="14" r="2.4" fill="${INK}"/><circle cx="14.2" cy="13.4" r=".8" fill="#E8DFC8"/>`;
SHAPES.cow = `<ellipse cx="12" cy="14" rx="8" ry="6" fill="#E4DCC8" stroke="${INK}" stroke-width="1.2"/>
  <circle cx="8" cy="12" r="1.4" fill="${INK}"/><circle cx="16" cy="12" r="1.4" fill="${INK}"/>`;
SHAPES.ox = `<ellipse cx="12" cy="14" rx="8" ry="6" fill="${WOOD}"/>
  <path d="M5 9 Q3 5 7 5 M19 9 Q21 5 17 5" stroke="#E4DCC8" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
SHAPES.ram = `<ellipse cx="12" cy="15" rx="6.6" ry="5.4" fill="#E4DCC8" stroke="${INK}" stroke-width="1.2"/>
  <path d="M6 10 Q3 6 7 5 M18 10 Q21 6 17 5" stroke="${GOLD}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
SHAPES.goat = `<ellipse cx="12" cy="15" rx="6" ry="5" fill="${WOOD}"/>
  <path d="M9 10 Q6 6 9 4 M15 10 Q18 6 15 4" stroke="#E4DCC8" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
SHAPES.sheep = `<ellipse cx="12" cy="14" rx="7.4" ry="6.4" fill="#E4DCC8" stroke="${INK}" stroke-width="1.2"/>
  <circle cx="9" cy="12" r="1.3" fill="${INK}"/><circle cx="15" cy="12" r="1.3" fill="${INK}"/>`;
SHAPES.monkey = `<circle cx="12" cy="11" r="6.4" fill="${WOOD}"/>
  <circle cx="9" cy="10" r="1.3" fill="${INK}"/><circle cx="15" cy="10" r="1.3" fill="${INK}"/>
  <circle cx="6" cy="7" r="2.2" fill="${WOOD}"/><circle cx="18" cy="7" r="2.2" fill="${WOOD}"/>`;
SHAPES.horse2 = SHAPES.horse;
SHAPES.cat = `<path d="M8 20 Q6 13 11 10 Q16 8 18 12 Q19 16 15 20 Z" fill="${INK}" opacity=".92"/>
  <path d="M7 11 L6 6 L11 9 M17 9 L18 6 L20 11" fill="${INK}"/>`;
SHAPES.rabbit = `<ellipse cx="12" cy="16" rx="6" ry="4.6" fill="#E4DCC8" stroke="${INK}" stroke-width="1.2"/>
  <path d="M9 11 Q8 4 11 4 Q13 5 11 11 M13 11 Q14 4 16 5 Q17 7 14 12" fill="#E4DCC8" stroke="${INK}" stroke-width="1.2"/>`;
SHAPES.llama = `<path d="M9 20 Q7 12 11 9 L12 4 L14 9 Q18 12 15 20 Z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.3"/>`;
SHAPES.giraffe = `<path d="M9 20 Q7 12 11 8 L11 3 L13 8 Q17 11 15 20 Z" fill="${GOLD}"/>
  <path d="M9 13 H16 M9 16 H16" fill="none" stroke="${INK}" stroke-width="1" opacity=".5"/>`;
SHAPES.camel = `<ellipse cx="12" cy="15" rx="7.4" ry="5" fill="${WOOD}"/>
  <path d="M8 10 Q9 6 12 7 Q15 8 15 11" fill="none" stroke="${WOOD}" stroke-width="2.4"/>`;
SHAPES.elephant = `<ellipse cx="12" cy="14" rx="7.4" ry="6" fill="${INK}" opacity=".92"/>
  <path d="M17 16 Q19 20 16 21" stroke="#E4DCC8" stroke-width="2" fill="none" stroke-linecap="round"/>`;
SHAPES.rhino = `<ellipse cx="12" cy="14" rx="7.4" ry="5.6" fill="${WOOD}"/>
  <path d="M18 12 L22 10" fill="none" stroke="#E4DCC8" stroke-width="2" stroke-linecap="round"/>`;
SHAPES.shark = `<path d="M3 13 Q11 6 20 13 Q11 20 3 13 Z" fill="${WATER}"/>
  <path d="M12 7 L15 2 L16 8" fill="${WATER}"/>
  <path d="M5 13 L2 9 L2 15 Z" fill="${WATER}" opacity=".85"/>`;
SHAPES.puffer = `<circle cx="12" cy="13" r="8" fill="${GOLD}"/>
  <path d="M12 5 V3 M6 8 L4 6 M18 8 L20 6 M4 13 H2 M20 13 H22 M6 18 L4 20 M18 18 L20 20" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`;
SHAPES.octopus = `<circle cx="12" cy="10" r="5.4" fill="${FIRE}"/>
  <path d="M7 13 Q5 18 7 21 M10 14 Q9 19 10 22 M14 14 Q15 19 14 22 M17 13 Q19 18 17 21" stroke="${FIRE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
SHAPES.squid = `<path d="M12 4 Q16 9 14 14 H10 Q8 9 12 4 Z" fill="${WATER}"/>
  <path d="M10 14 Q8 19 10 21 M14 14 Q16 19 14 21" stroke="${WATER}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
SHAPES.crab = `<ellipse cx="12" cy="13" rx="7.4" ry="5" fill="${FIRE}"/>
  <path d="M5 11 Q2 9 3 6 M19 11 Q22 9 21 6" stroke="${FIRE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <circle cx="9.5" cy="12" r="1.2" fill="#E8DFC8"/><circle cx="14.5" cy="12" r="1.2" fill="#E8DFC8"/>`;
SHAPES.lobster = `<ellipse cx="12" cy="12" rx="4.4" ry="6" fill="${FIRE}"/>
  <path d="M8 9 Q4 7 5 4 M16 9 Q20 7 19 4 M9 17 Q7 20 9 21 M15 17 Q17 20 15 21" stroke="${FIRE}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
SHAPES.shrimp = `<path d="M16 6 Q20 12 14 18 Q9 21 6 18" fill="none" stroke="${FIRE}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M16 6 L20 5 M16 6 L18 3" fill="none" stroke="${FIRE}" stroke-width="1.5" stroke-linecap="round"/>`;
SHAPES.jar = `<path d="M8 6 H16 L18 19 Q18 21 15 21 H9 Q6 21 6 19 Z" fill="${INK}" opacity=".9"/>
  <path d="M7 6 H17" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
  <path d="M9 12 H15" fill="none" stroke="${JADE}" stroke-width="1.6" opacity=".8"/>`;
SHAPES.map = `<path d="M4 6 L10 4 L16 7 L22 5 V19 L16 21 L10 18 L4 20 Z" fill="#E4DCC8" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M10 4 V18 M16 7 V21" fill="none" stroke="${INK}" stroke-width="1.1" opacity=".55"/>`;
SHAPES.spine = SHAPES.bone;
SHAPES.ear2 = SHAPES.ear;

// ---------- 归族判定 ----------
// 归族名（供调试与测试核对，勿删）
function familyName(item){ return familyOf(item); }

function familyOf(item){
  if (!item) return 'box';
  const nm = item.name || '';
  const em = (item.icon || '').trim();
  // 名称优先：名字比 emoji 更具体（「火种」名里有「火」，emoji 却是 ✨）。
  // 但名称判定只在 emoji 与名称冲突时生效，故先查名称专有词（不含通用字的族），
  // 再回落到 emoji，最后才按类型兜底。
  for (const [fam, words] of BY_NAME){
    if (words.some(w => nm.indexOf(w) >= 0)) return fam;
  }
  if (em && BY_EMOJI[em]) return BY_EMOJI[em];
  return BY_TYPE[item.type] || 'box';
}

function escAttr(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// itemIcon(物品 id 或对象, 尺寸px) → 内联 SVG 字符串
// 尺寸省略时按容器填满（用于方形卡）；给数值则输出定尺小图（用于 chip / 行内文字）。
function itemIcon(it, size){
  let x = it;
  if (typeof x === 'string'){
    const I2 = (typeof Items !== 'undefined') ? Items : ((typeof window !== 'undefined' && window.Items) || {});
    x = I2[x] || { id:x, name:x };
  }
  if (!x) x = { id:'?', name:'?' };
  const fam = familyOf(x);
  const shape = SHAPES[fam] || SHAPES.box;
  const dim = size
    ? ` width="${size}" height="${size}" style="display:inline-block;vertical-align:-${Math.round(size*0.16)}px"`
    : ` width="100%" height="100%" style="display:block"`;
  return `<svg class="bi ii" viewBox="0 0 24 24"${dim} role="img" aria-label="${escAttr(x.name||'')}">${shape}</svg>`;
}

// itemIc(物品 id 或对象, 尺寸px) → 统一入口
// 传 id 会回表 Items 取标准条目；传快照对象（如装备槽里的）先按 id 回表，取不到才按对象本身判定族。
// 模块缺失或数据异常时返回空串，调用方自行决定兜底，避免整页崩。
function itemIc(it, size){
  if (it==null) return '';
  const tbl = (typeof Items !== 'undefined') ? Items : ((typeof window !== 'undefined' && window.Items) || {});
  // 查不到条目时也要出图（用 id 自身占位），否则会出现「空图标」被误读为「无此物」
  const src = (typeof it === 'string') ? (tbl[it] || it) : (tbl[it.id] || it);
  if (!src) return '';
  return itemIcon(src, size);
}

window.itemIcon = itemIcon;
window.itemIc = itemIc;
window.itemFamily = familyName;
window.ITEM_ICON_FAMILIES = Object.keys(SHAPES);
})();
