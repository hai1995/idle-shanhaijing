// ===== 标记绘形：导航与功能标记的矢量图标 =====
// 收尾一族。此前各处功能标记仍用 emoji（📍🔒☀🌙⚖️💡⚡✔），
// 各平台字形差异大、与水墨底不合，且尺寸随行高漂移。
// 此族把两类标记一并手绘：
//   · 功能标记（markIcon）——地点、锁、昼夜、衡、灯、迅、可、警、戥。
// 导航栏另有自带的线条图标族，不在此列。
// 与异兽 / 营邑 / 技能 / 物品诸族同语言：墨影 + 点睛色 + 圆晕，昼夜自动反相。
(function(){
'use strict';

const INK    = 'currentColor';
const WOOD   = '#8A6242';
const FIRE   = '#B03A2B';
const GOLD   = '#B08A34';
const WATER  = '#2E5269';
const JADE   = '#4F6E45';
const BLOOD  = '#7A3B3B';
const SILVER = '#8C877C';

// ---------- 功能标记（24×24 视框） ----------
const MARK = {
  // 地点：山形之上立一峰标
  pin: `<path d="M12 21 Q7 14 7 9.5 A5 5 0 0 1 17 9.5 Q17 14 12 21 Z" fill="${FIRE}"/>
    <circle cx="12" cy="9.3" r="1.9" fill="#F2EDE0"/>`,
  // 锁： shackle + 锁身
  lock: `<path d="M8 10 V7.5 A4 4 0 0 1 16 7.5 V10" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <rect x="5.5" y="10" width="13" height="10" rx="1.6" fill="${INK}"/>
    <circle cx="12" cy="14.4" r="1.5" fill="#F2EDE0"/>`,
  // 昼：日轮 + 光芒
  sun: `<circle cx="12" cy="12" r="4.6" fill="${GOLD}"/>
    <path d="M12 3.2 V5.6 M12 18.4 V20.8 M3.2 12 H5.6 M18.4 12 H20.8
             M5.8 5.8 L7.5 7.5 M16.5 16.5 L18.2 18.2 M18.2 5.8 L16.5 7.5 M7.5 16.5 L5.8 18.2"
      stroke="${GOLD}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
  // 夜：弯月 + 一星
  moon: `<path d="M15.4 4.2 A8 8 0 1 0 19.4 13 A6.6 6.6 0 0 1 15.4 4.2 Z" fill="${WATER}"/>
    <path d="M17.6 4.6 l.7 1.8 1.9.3 -1.4 1.3.4 1.9 -1.7-.9 -1.6.9 .3-1.9 -1.4-1.3 1.9-.3 Z" fill="${GOLD}"/>`,
  // 罗盘：盘 + 指针（舆地）
  compass: `<circle cx="12" cy="12" r="8.4" fill="none" stroke="${INK}" stroke-width="1.9"/>
    <path d="M12 5.4 L15 12 L12 18.6 L9 12 Z" fill="${FIRE}"/>
    <circle cx="12" cy="12" r="1.5" fill="${GOLD}"/>`,
  // 衡：天平（廛市 / 求购）
  scale: `<path d="M12 4 V20 M6.5 20 H17.5" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    <path d="M4 8 H20" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    <path d="M4 8 L1.8 13.2 A2.6 2.6 0 0 0 6.2 13.2 Z" fill="${GOLD}"/>
    <path d="M20 8 L17.8 13.2 A2.6 2.6 0 0 0 22.2 13.2 Z" fill="${GOLD}"/>
    <circle cx="12" cy="6" r="1.5" fill="${FIRE}"/>`,
  // 灯：盏 + 火（提示）
  lamp: `<path d="M8 20 H16 L14.4 12 H9.6 Z" fill="${GOLD}"/>
    <path d="M12 3.2 Q14.4 6.6 13.2 9.4 H10.8 Q9.6 6.6 12 3.2 Z" fill="${FIRE}"/>
    <path d="M7 20.8 H17" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  // 山志：一束竹简 + 朱印（录毕之印，v1.31.197）
  scroll: `<rect x="5" y="4.6" width="10" height="14.8" rx="1.2" fill="none" stroke="${INK}" stroke-width="1.7"/>
    <path d="M7.4 8 H12.6 M7.4 11 H12.6 M7.4 14 H11" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" fill="none"/>
    <rect x="14.4" y="13.4" width="6" height="6" rx=".8" fill="${FIRE}"/>
    <path d="M15.9 16.4 h2.8 M17.3 15.1 v2.6" stroke="#F2EDE0" stroke-width="1.1" stroke-linecap="round" fill="none"/>`,
  // 迅：折电
  bolt: `<path d="M13.6 2 L5.4 13.4 H11 L9.8 22 L18.4 10 H12.8 Z" fill="${GOLD}"/>
    <path d="M13.6 2 L9.4 13.4" stroke="${FIRE}" stroke-width="1.2" fill="none" opacity=".7"/>`,
  // 可：对勾
  check: `<path d="M4.6 12.6 L9.8 17.8 L19.6 6.6" stroke="${JADE}" stroke-width="2.8"
      stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  // 警：三角 + 叹
  warn: `<path d="M12 3.4 L21.6 19.6 H2.4 Z" fill="${BLOOD}"/>
    <path d="M12 9.4 V13.6" stroke="#F2EDE0" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    <circle cx="12" cy="16.6" r="1.2" fill="#F2EDE0"/>`,
  // 秤：戥（权衡 / 交易）
  steelyard: `<path d="M4 5.4 L18.6 8.6" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    <path d="M7.4 4.4 V18.4" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    <path d="M7.4 18.4 A4.4 4.4 0 0 0 7.4 9.6 Z" fill="${GOLD}"/>
    <circle cx="18.6" cy="8.6" r="1.6" fill="${FIRE}"/>`,

  /* —— 征兆意象（按「见则 X」取形，不与吉凶字印重复） —— */
  // 水：三道波（大水）
  water: `<path d="M2.8 8.8 q3-2.4 6 0 t6 0 t6 0" fill="none" stroke="${WATER}" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M2.8 13.4 q3-2.4 6 0 t6 0 t6 0" fill="none" stroke="${WATER}" stroke-width="2.1" stroke-linecap="round" opacity=".72"/>
    <path d="M2.8 18 q3-2.4 6 0 t6 0 t6 0" fill="none" stroke="${WATER}" stroke-width="2.1" stroke-linecap="round" opacity=".45"/>`,
  // 火/旱：焰心
  fire: `<path d="M12 21.4 C7.6 21.4 4.8 18.2 5.6 14.4 C6.4 10.8 9.6 9 10.8 4.2 C12.8 7.2 16.6 9.2 17.6 13.2 C18.6 17.4 16.2 21.4 12 21.4 Z" fill="${FIRE}"/>
    <path d="M12 19.2 C9.8 19.2 8.4 17.6 9 15.6 C9.6 13.6 11.2 12.8 11.8 10.8 C12.8 12.4 14.8 13.6 15 15.8 C15.2 17.8 13.8 19.2 12 19.2 Z" fill="${GOLD}" opacity=".9"/>`,
  // 兵：戈（兵灾）
  war: `<path d="M5.6 20.4 L17.2 6.6" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M17.2 6.6 L14.6 3.4 L21.2 3.2 L20.8 9.8 L18 6.8 Z" fill="${BLOOD}"/>
    <path d="M9.2 12.4 L5.2 10.4" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  // 疫：螫虫（大疫 / 虫毒）
  plague: `<ellipse cx="12" cy="14.6" rx="4.3" ry="5.6" fill="${BLOOD}"/>
    <circle cx="12" cy="8.2" r="2.7" fill="${BLOOD}"/>
    <path d="M7.8 12.4 L4.2 10.4 M16.2 12.4 L19.8 10.4 M7.8 16.4 L4.2 18.4 M16.2 16.4 L19.8 18.4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  // 败：禾枯（螽蝗为败）
  blight: `<path d="M12 21.4 V7.6" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 12.6 q4.2-3.2 6.8-1.4 q-2.6 4.4-6.8 3.4" fill="${WOOD}" opacity=".85"/>
    <path d="M12 17 q-4.2-3.2-6.8-1.4 q2.6 4.4 6.8 3.4" fill="${WOOD}" opacity=".55"/>
    <path d="M12 7.6 q1.8-3.6 4.6-3.8 q-1 3.6-4.6 4.4" fill="${WOOD}"/>`,
  // 风：回风三道
  wind: `<path d="M3 8.2 h11.6 q3.2 0 3.2 2.7 t-3.2 2.7" fill="none" stroke="${WATER}" stroke-width="2" stroke-linecap="round"/>
    <path d="M3 13.6 h8.2" stroke="${WATER}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <path d="M5.4 18.8 h9.2 q2.8 0 2.8 2.3" fill="none" stroke="${WATER}" stroke-width="2" stroke-linecap="round" opacity=".45"/>`,
  // 安宁：云开见日
  peace: `<circle cx="12" cy="10" r="4.4" fill="${GOLD}"/>
    <path d="M12 2.2 V4.4 M12 15.6 V17.8 M4.4 10 H6.6 M17.4 10 H19.6 M6.6 4.6 L8.2 6.2 M15.8 13.8 L17.4 15.4 M17.4 4.6 L15.8 6.2 M8.2 13.8 L6.6 15.4"
      stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M4.8 20.8 q3.6-2 7.2 0 t7.2 0" fill="none" stroke="${JADE}" stroke-width="1.9" stroke-linecap="round"/>`,
  // 土功/繇役：版筑
  build: `<path d="M3.4 20.4 h17.2" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M5.6 20.4 V11.6 h6 v8.8" fill="none" stroke="${INK}" stroke-width="1.9"/>
    <path d="M13.6 20.4 V8 h4.8 v12.4" fill="none" stroke="${INK}" stroke-width="1.9"/>
    <path d="M6.6 14.4 h4 M14.6 11.4 h2.8 M14.6 15.4 h2.8" stroke="${WOOD}" stroke-width="1.5" stroke-linecap="round"/>`,

  // ---------- 日志 / toast 前缀用（v1.31.190）----------
  // 这些形状原先在文案里以 emoji 出现（🎋 竹签、🏆 成就、💀 阵亡…）。文案走
  // markHtml 把首字符换成矢量，缺的就在这一族里补——补齐后 toast / 日志的
  // 前缀与界面其余图标同源，缺 emoji 字体的设备上也不会落成豆腐块。
  // 光：四芒星（所得 / 达成 / 吉兆都用它）
  star: `<path d="M12 3.2 13.7 9.5 20 11.2 13.7 12.9 12 19.2 10.3 12.9 4 11.2 10.3 9.5Z" fill="${GOLD}"/>
    <circle cx="12" cy="11.2" r="1.5" fill="#F2EDE0"/>`,
  // 成就 / 榜：双耳杯
  trophy: `<path d="M7.6 6.2h8.8v3.6a4.4 4.4 0 0 1-8.8 0V6.2Z" fill="${GOLD}"/>
    <path d="M7.6 7.4H5.2c0 2.4 1.1 3.9 2.9 4.2M16.4 7.4h2.4c0 2.4-1.1 3.9-2.9 4.2" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12 14.2v3.2M9.2 20.4h5.6M10.2 17.4h3.6" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  // 阵亡
  skull: `<path d="M12 3.6c-4 0-6.6 2.7-6.6 6.2 0 2.4 1.2 3.6 1.8 4.6v2.4h9.6v-2.4c.6-1 1.8-2.2 1.8-4.6 0-3.5-2.6-6.2-6.6-6.2Z" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="9.6" cy="10" r="1.5" fill="${INK}"/><circle cx="14.4" cy="10" r="1.5" fill="${INK}"/>
    <path d="M10.4 20.2v-3M13.6 20.2v-3" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  // 解锁：开着的锁（ shackle 偏在一旁）
  unlock: `<rect x="5" y="10.6" width="11.2" height="9.2" rx="1.8" fill="none" stroke="${JADE}" stroke-width="1.9"/>
    <path d="M7.6 10.6V7.8a3.3 3.3 0 0 1 6.4-1.1" fill="none" stroke="${JADE}" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="10.6" cy="15" r="1.3" fill="${JADE}"/>`,
  // 竹签：一枚签条与系绳
  slip: `<path d="M9.4 3.6h5.2v14.2a1.6 1.6 0 0 1-1.6 1.6h-2a1.6 1.6 0 0 1-1.6-1.6V3.6Z" fill="none" stroke="${WOOD}" stroke-width="1.8"/>
    <path d="M10.6 7.4h2.8M10.6 10.6h2.8" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M9.4 20.6h5.2" stroke="${WOOD}" stroke-width="1.6" stroke-linecap="round"/>`,
  // 循环 / 再祭：两段回转的弧
  cycle: `<path d="M5.6 9.4A6.8 6.8 0 0 1 18 8.2" fill="none" stroke="${JADE}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M17.9 4.6v3.8h-3.8" fill="none" stroke="${JADE}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.4 14.6A6.8 6.8 0 0 1 6 15.8" fill="none" stroke="${JADE}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M6.1 19.4v-3.8h3.8" fill="none" stroke="${JADE}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 食物：一块肉与两侧骨
  meat: `<path d="M8.6 8.2c2.6-2.4 7-1.6 8.2 1.6 1.2 3.2-1.4 6.4-4.6 6.2-2.6-.2-4.4-2-4.6-4-.1-1.4.2-2.8 1-3.8Z" fill="${BLOOD}" opacity=".85"/>
    <path d="M8.4 8.4 5.6 5.6M6.2 6.2 4.8 7.6M15.4 15.6l2.8 2.8M18 17.4l1.4-1.4" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`,
  // 飞禽 / 蜂：张翼
  bird: `<path d="M3.4 13.2c3-3.6 6-3.6 8.6 0 2.6-3.6 5.6-3.6 8.6 0" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="11" r="1.7" fill="${WATER}"/>`,
  // 羽毛
  feather: `<path d="M19 4.6c-6 .2-9.8 3.2-10.6 7.6-.3 1.6.2 3 .8 4l8-8" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M4.6 19.6 12 12.2M13.4 8.4l2.6.6M10.6 11.2l2.4.6" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`,
  // 护：盾
  shield: `<path d="M12 3.4 19.4 6v6.2c0 4-3 7-7.4 8.6-4.4-1.6-7.4-4.6-7.4-8.6V6L12 3.4Z" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/>
    <path d="M12 8v7.4" stroke="${GOLD}" stroke-width="1.7" stroke-linecap="round"/>`,
  // 赠礼
  gift: `<rect x="4.4" y="9" width="15.2" height="11.2" rx="1.6" fill="none" stroke="${FIRE}" stroke-width="1.8"/>
    <path d="M3.4 9h17.2v3.4H3.4z" fill="${FIRE}" opacity=".9"/>
    <path d="M12 9v11.2M12 9c-2.4 0-4-1-4-2.4S9.2 4.6 12 9ZM12 9c2.4 0 4-1 4-2.4S14.8 4.6 12 9Z" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  // 木：树冠与干
  tree: `<path d="M12 3.4c3.4 0 6 2.4 6 5.4 0 2.2-1.4 3.4-2 4.4H8c-.6-1-2-2.2-2-4.4 0-3 2.6-5.4 6-5.4Z" fill="${JADE}" opacity=".9"/>
    <path d="M12 13.2v7.4M9.4 20.6h5.2" stroke="${WOOD}" stroke-width="1.9" stroke-linecap="round"/>`,
  // 交换
  swap: `<path d="M4.6 9h12.2M13.6 5.6 17 9l-3.4 3.4" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19.4 15H7.2M10.4 11.6 7 15l3.4 3.4" fill="none" stroke="${WOOD}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 念珠：一串小圆与坠
  beads: `<circle cx="6.6" cy="9" r="1.5" fill="${GOLD}"/><circle cx="9.8" cy="6" r="1.5" fill="${GOLD}"/>
    <circle cx="14.2" cy="6" r="1.5" fill="${GOLD}"/><circle cx="17.4" cy="9" r="1.5" fill="${GOLD}"/>
    <path d="M6.8 9.4c-1 2.4-.4 5 1.6 6.6M17.2 9.4c1 2.4.4 5-1.6 6.6" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M12 16.4v2.2" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="12" cy="19.8" r="1.5" fill="${JADE}"/>`,
  // 静音：铃上斜划一道
  mute: `<path d="M12 4.2a4.6 4.6 0 0 0-4.6 4.6v4.2L6 15.6h12l-1.4-2.6V8.8A4.6 4.6 0 0 0 12 4.2Z" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M10.2 18.2a1.9 1.9 0 0 0 3.6 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M4.4 20 20 3.8" stroke="${FIRE}" stroke-width="2" stroke-linecap="round"/>`,
};

function escAttr(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function svgOf(art, label, size){
  const dim = size
    ? ` width="${size}" height="${size}" style="display:inline-block;vertical-align:-${Math.round(size*0.16)}px"`
    : ` width="100%" height="100%" style="display:block"`;
  return `<svg class="bi mk" viewBox="0 0 24 24"${dim} role="img" aria-label="${escAttr(label||'')}">${art}</svg>`;
}

// markIcon(标记名, 尺寸px) → 内联 SVG 字符串；未知名回落到「灯」形
function markIcon(name, size){
  const art = MARK[name] || MARK.lamp;
  return svgOf(art, name, size);
}

// 征兆意象：按「见则 X」的类型词取形。判断顺序有意为之——
// 「风雨水为败」应先归「败」而非「水」，「大风」先归「风」，「大疫」先归「疫」。
const OMEN_RULES = [
  [/蝗|螽|败|饥/, 'blight'],
  [/疫|疠|病|毒/, 'plague'],
  [/兵|戈|寇|战/, 'war'],
  [/风/, 'wind'],
  [/土功|繇|役/, 'build'],
  [/安宁|太平|穰|丰/, 'peace'],
  [/水|雨|潮|洪/, 'water'],
  [/旱|火|焚/, 'fire'],
];
function omenIcon(def, size){
  const text = ((def && def.type) || '') + ((def && def.desc) || '');
  let key = 'lamp';
  for (const [re, k] of OMEN_RULES){ if (re.test(text)){ key = k; break; } }
  return svgOf(MARK[key], (def && def.type) || key, size);
}
window.omenIcon = omenIcon;

window.markIcon = markIcon;
window.MARK_ICON_IDS = Object.keys(MARK);
})();
