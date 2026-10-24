// ===== 技能绘形：二十六艺的矢量图标 =====
// 设计语言承异兽 / 营邑图标一脉：墨影剪影 + 一处点睛色 + 圆晕。
// 技能分五域，各有基调色：
//   · gathering 樵采渔猎圃艺 → 木 / 水 / 火（山野之息）
//   · processing 燔燎冶铸琢玉 → 火 / 金
//   · combat 兵射祝命讨伐 → 血 / 金
//   · fangguo 履险商旅观象营邑卜筮 → 土 / 木
//   · yushi 御使祭祀著录舆地 → 土 / 金
// 器物皆取古形：斧、凿、纶、耒、釜、鼎、砧、弓、陶轮、璜、炉、戈、箭、筹、
// 简、圭、目、舆图、香、爪痕、灯、册、地图——不用 emoji，保持昼夜两套底下一致。
(function(){
'use strict';

const INK = '#4C473E';
const WOOD = '#8A6242';
const FIRE = '#B03A2B';
const GOLD = '#B08A34';
const WATER = '#2E5269';
const JADE  = '#4F6E45';

function halo(c){ return `<circle cx="32" cy="32" r="30" fill="${c}" opacity=".10"/><circle cx="32" cy="32" r="29" fill="none" stroke="${c}" stroke-width="1.3" opacity=".30"/>`; }
function ground(c){ return `<ellipse cx="32" cy="57" rx="19" ry="2.8" fill="${c}" opacity=".12"/>`; }

// ---------- 采集域 ----------
const qiaocai = () => // 樵采：曲柄斧，斧刃朝下
  `<path d="M40 14 L44 10 L47 13 L43 17 Z" fill="${GOLD}"/>
   <path d="M41 16 L26 44" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
   <path d="M22 47 L31 40 L36 46 L26 54 Z" fill="${WOOD}"/>`;
const caiyu = () => // 采玉：凿与玉璞
  `<path d="M44 12 L47 15 L28 42 L25 39 Z" fill="${INK}"/>
   <path d="M18 50 Q18 42 25 40 Q33 39 36 47 Q38 54 31 56 L21 56 Z" fill="${JADE}" opacity=".8"/>
   <path d="M24 47 Q27 44 30 46" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".5"/>`;
const yu = () => // 渔：纶线与鱼
  `<path d="M45 12 L48 15 L30 42 L27 39 Z" fill="${INK}"/>
   <path d="M27 42 Q16 40 12 47 Q18 54 27 51 Q32 48 27 42 Z" fill="${WATER}"/>
   <path d="M27 42 L34 36 L34 48 Z" fill="${WATER}" opacity=".85"/>
   <circle cx="21" cy="46" r="1.5" fill="#F2EDE0"/>`;
const caiyao = () => // 采药：草药三叶
  `<path d="M32 56 V30" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
   <path d="M32 36 Q20 34 16 22 Q30 22 32 36 Z" fill="${JADE}"/>
   <path d="M32 42 Q44 40 48 28 Q34 28 32 42 Z" fill="${JADE}" opacity=".82"/>
   <path d="M32 28 Q26 22 32 14 Q38 22 32 28 Z" fill="${JADE}" opacity=".9"/>`;
const puyi = () => // 圃艺：耒耜与禾苗
  `<path d="M32 56 V22" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
   <path d="M32 22 Q22 24 18 34 Q30 32 32 22 Z" fill="${GOLD}" opacity=".85"/>
   <path d="M32 30 Q42 32 46 42 Q34 40 32 30 Z" fill="${GOLD}" opacity=".7"/>
   <path d="M22 56 H42" stroke="${WOOD}" stroke-width="3" stroke-linecap="round"/>`;

// ---------- 制作域 ----------
const fanliao = () => // 燔燎：柴上起火
  `<path d="M18 52 L46 52" stroke="${WOOD}" stroke-width="3.4" stroke-linecap="round"/>
   <path d="M22 52 L34 40" stroke="${WOOD}" stroke-width="3" stroke-linecap="round"/>
   <path d="M42 52 L32 42" stroke="${WOOD}" stroke-width="3" stroke-linecap="round"/>
   <path d="M32 44 Q24 36 32 26 Q28 34 36 30 Q42 24 38 18 Q46 26 40 38 Q36 45 32 44 Z" fill="${FIRE}"/>`;
const diaoding = () => // 调鼎：鼎腹双耳三足
  `<path d="M18 26 H46" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
   <path d="M20 26 Q20 46 32 46 Q44 46 44 26 Z" fill="${INK}"/>
   <path d="M20 28 Q32 34 44 28" fill="none" stroke="${GOLD}" stroke-width="1.8" opacity=".7"/>
   <path d="M22 46 L20 55 M32 46 L32 55 M42 46 L44 55" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
   <path d="M20 24 Q14 22 15 16 M44 24 Q50 22 49 16" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const yezhu = () => // 冶铸：砧与锤，火星迸
  `<path d="M14 50 H50 V56 H14 Z" fill="${INK}"/>
   <path d="M44 12 L47 15 L30 34 L27 31 Z" fill="${INK}"/>
   <path d="M26 30 L36 38 L32 42 L22 34 Z" fill="${GOLD}"/>
   <path d="M18 22 L14 18 M22 18 L20 13 M15 30 L10 29" stroke="${FIRE}" stroke-width="2" stroke-linecap="round"/>`;
const xiaoyu = () => // 削羽：弓与箭
  `<path d="M18 14 Q40 32 18 50" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
   <path d="M18 14 L18 50" stroke="${INK}" stroke-width="1.6" opacity=".5"/>
   <path d="M20 32 H48" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
   <path d="M48 32 L41 28 L41 36 Z" fill="${GOLD}"/>
   <path d="M24 30 L26 34 L22 34 Z" fill="${FIRE}"/>`;
const zhiqi = () => // 制器：陶轮
  `<circle cx="26" cy="34" r="14" fill="${INK}"/>
   <circle cx="26" cy="34" r="6" fill="#1F1C18"/>
   <circle cx="26" cy="34" r="2.2" fill="${GOLD}"/>
   <path d="M40 44 L50 54" stroke="${WOOD}" stroke-width="4" stroke-linecap="round"/>`;
const zhuoyu = () => // 琢玉：玉璧与凿
  `<circle cx="30" cy="34" r="14" fill="${JADE}" opacity=".85"/>
   <circle cx="30" cy="34" r="5" fill="#F2EDE0"/>
   <path d="M48 14 L51 17 L36 34 L33 31 Z" fill="${INK}"/>`;
const lianyao = () => // 炼药：坩埚与气
  `<path d="M20 40 H44 L40 54 H24 Z" fill="${INK}"/>
   <path d="M18 40 H46" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/>
   <path d="M30 40 Q26 30 32 22 Q30 30 36 24" fill="none" stroke="${JADE}" stroke-width="2.2" stroke-linecap="round"/>
   <circle cx="32" cy="18" r="2.6" fill="${JADE}" opacity=".8"/>`;
const bing = () => // 兵：戈
  `<path d="M20 56 L44 16" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
   <path d="M44 16 Q52 12 52 6 Q44 8 40 12 Z" fill="${GOLD}"/>
   <path d="M22 44 L30 50" stroke="${FIRE}" stroke-width="2.6" stroke-linecap="round"/>`;
const she = () => // 射：箭在弦
  `<path d="M16 32 H50" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
   <path d="M50 32 L40 27 L40 37 Z" fill="${GOLD}"/>
   <path d="M16 32 Q26 20 30 32 Q26 44 16 32 Z" fill="none" stroke="${INK}" stroke-width="2.4"/>
   <path d="M22 26 L26 20 M22 38 L26 44" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
const zhu = () => // 祝：筹与祝文
  `<path d="M24 14 H40 L38 42 H26 Z" fill="#E8DFC8" opacity=".95"/>
   <path d="M28 20 H36 M28 26 H36 M28 32 H34" stroke="${INK}" stroke-width="1.6" opacity=".6"/>
   <path d="M32 42 V54" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
   <path d="M32 44 L40 48" stroke="${FIRE}" stroke-width="2" stroke-linecap="round"/>`;
const ming = () => // 命：令牌
  `<path d="M32 12 L48 22 V40 L32 50 L16 40 V22 Z" fill="${INK}"/>
   <circle cx="32" cy="31" r="8" fill="#1F1C18"/>
   <circle cx="32" cy="31" r="4.6" fill="${FIRE}"/>
   <path d="M32 50 V57" stroke="${GOLD}" stroke-width="2.4" stroke-linecap="round"/>`;
const taofa = () => // 讨伐：刀
  `<path d="M18 54 L40 20" stroke="${WOOD}" stroke-width="4" stroke-linecap="round"/>
   <path d="M38 22 Q52 14 54 4 Q44 8 34 16 Z" fill="${INK}"/>
   <path d="M16 56 L26 50" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`;
const lvxian = () => // 履险：涉水之履
  `<path d="M14 42 Q26 34 40 40 L50 46 Q52 50 47 52 L22 52 Q16 52 14 47 Z" fill="${INK}"/>
   <path d="M22 56 Q32 50 42 55" stroke="${WATER}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
   <path d="M18 56 Q28 50 38 55" stroke="${WATER}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>`;
const shanglv = () => // 商旅：戥与钱
  `<path d="M32 12 V28" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
   <path d="M32 28 Q44 32 44 42 Q44 52 32 56 Q20 52 20 42 Q20 32 32 28 Z" fill="${INK}"/>
   <path d="M32 34 Q39 37 39 42 Q39 47 32 49 Q25 47 25 42 Q25 37 32 34 Z" fill="${GOLD}" opacity=".8"/>`;
const guanxiang = () => // 观象：目与星
  `<path d="M8 34 Q20 16 32 16 Q44 16 56 34 Q44 52 32 52 Q20 52 8 34 Z" fill="none" stroke="${INK}" stroke-width="3.2"/>
   <circle cx="32" cy="34" r="9.5" fill="${INK}"/>
   <circle cx="35" cy="31" r="3.4" fill="#F2EDE0"/>
   <path d="M12 14 L15.5 17.5 M32 8 L32 11.5 M52 14 L48.5 17.5" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round"/>`;
const yingyi = () => // 营邑：屋舍
  `<path d="M12 32 L32 18 L52 32" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
   <path d="M18 32 V52 H46 V32" fill="${INK}"/>
   <path d="M28 52 V40 H36 V52" fill="#1F1C18"/>
   <path d="M22 52 V44 M42 52 V44" stroke="${WOOD}" stroke-width="2.4" stroke-linecap="round"/>`;
const bushi = () => // 卜筮：蓍草
  `<path d="M20 56 L24 26 M32 56 L32 22 M44 56 L40 26" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
   <path d="M32 22 L28 14 M32 22 L36 14" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
   <circle cx="32" cy="12" r="3.4" fill="${FIRE}"/>`;
const yushi = () => // 御使：爪痕
  `<path d="M20 18 Q16 30 20 40" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>
   <path d="M32 12 Q28 28 32 42" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>
   <path d="M44 18 Q48 30 44 40" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>
   <path d="M16 44 Q32 40 48 44 Q44 54 32 54 Q20 54 16 44 Z" fill="${INK}"/>
   <path d="M24 47 Q32 50 40 47" stroke="${FIRE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
const jisi = () => // 祭祀：香与炉
  `<path d="M18 54 H46" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
   <path d="M24 54 L28 38 H36 L40 54 Z" fill="${INK}"/>
   <path d="M32 38 V26" stroke="${WOOD}" stroke-width="2.2" stroke-linecap="round"/>
   <path d="M32 26 Q27 20 32 13 Q30 19 36 16" fill="none" stroke="${FIRE}" stroke-width="2.2" stroke-linecap="round"/>`;
const zhulu = () => // 著录：竹简
  `<path d="M18 12 H30 V52 H18 Z" fill="#E8DFC8" stroke="${INK}" stroke-width="2"/>
   <path d="M34 12 H46 V52 H34 Z" fill="#E8DFC8" stroke="${INK}" stroke-width="2"/>
   <path d="M22 20 H26 M22 27 H26 M22 34 H26 M22 41 H26" stroke="${INK}" stroke-width="1.6" opacity=".7"/>
   <path d="M38 20 H42 M38 27 H42 M38 34 H42 M38 41 H42" stroke="${INK}" stroke-width="1.6" opacity=".7"/>
   <path d="M14 22 H18 M46 22 H50 M14 40 H18 M46 40 H50" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round"/>`;
const yudi = () => // 舆地：地图卷
  `<path d="M10 18 Q32 12 54 18 V48 Q32 42 10 48 Z" fill="#E8DFC8" stroke="${INK}" stroke-width="2.4"/>
   <path d="M10 18 Q32 24 54 18 M10 48 Q32 42 54 48" stroke="${INK}" stroke-width="2.4" fill="none"/>
   <path d="M20 20 V46 M44 20 V46" stroke="${INK}" stroke-width="1.6" opacity=".5"/>
   <path d="M26 38 Q32 28 38 33" stroke="${FIRE}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
   <circle cx="38" cy="33" r="3.4" fill="${FIRE}"/>
   <path d="M26 24 L30 20 L34 24" stroke="${JADE}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

const ART = { qiaocai, caiyu, yu, caiyao, puyi, fanliao, diaoding, yezhu, xiaoyu, zhiqi,
              zhuoyu, lianyao, bing, she, zhu, ming, taofa, lvxian, shanglv, guanxiang,
              yingyi, bushi, yushi, jisi, zhulu, yudi };
// 各技能的点睛色（晕圈与地平用色）
const TINT = { qiaocai:WOOD, caiyu:JADE, yu:WATER, caiyao:JADE, puyi:GOLD,
               fanliao:FIRE, diaoding:FIRE, yezhu:FIRE, xiaoyu:WOOD, zhiqi:JADE,
               zhuoyu:JADE, lianyao:JADE, bing:FIRE, she:WOOD, zhu:GOLD, ming:FIRE,
               taofa:FIRE, lvxian:WATER, shanglv:GOLD, guanxiang:GOLD, yingyi:WOOD,
               bushi:JADE, yushi:FIRE, jisi:FIRE, zhulu:WOOD, yudi:GOLD };

function escAttr(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// skillIcon(技能 id 或对象) → 内联 SVG 字符串
function skillIcon(sk, size){
  let x = sk;
  if (typeof x === 'string'){
    const S = (typeof Skills !== 'undefined') ? Skills : ((typeof window !== 'undefined' && window.Skills) || {});
    x = S[x] || { id:x, name:x };
  }
  if (!x) x = { id:'?', name:'?' };
  const fn = ART[x.id];
  const c = TINT[x.id] || WOOD;
  const inner = fn ? fn() : `<circle cx="32" cy="32" r="12" fill="none" stroke="${INK}" stroke-width="3"/>`;
  const dim = size
    ? ` width="${size}" height="${size}" style="display:inline-block;vertical-align:-${Math.round(size*0.16)}px"`
    : ` width="100%" height="100%" style="display:block"`;
  return `<svg class="bi" viewBox="0 0 64 64"${dim} role="img" aria-label="${escAttr(x.name||'')}">${halo(c)}${ground(c)}${inner}</svg>`;
}

window.skillIcon = skillIcon;
window.SKILL_ICON_IDS = Object.keys(ART);
})();
