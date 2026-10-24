// ===== 营造绘形：八座营邑建筑的矢量图标 =====
// 设计语言与异兽图标同族（墨影 + 点睛色 + 圆晕），但建筑不用五行色，
// 改用「土木金」三色系：主体墨色剪影 + 一处点睛色 + 底部地平晕。
//   · 柴栅  zhai     木栅立桩
//   · 灶窟  zaoku    窟口炊烟
//   · 土窟  tuku     覆土穴居
//   · 祠坛  citan    三层祭坛
//   · 市廛  shichan  布幡市肆
//   · 仓廪  canglin  廪囤圆囤
//   · 烽火台 fenghuotai  高台烽燧
//   · 学宫  xuegong  讲堂书阁
(function(){
'use strict';

const INK = '#4C473E';          // 主体墨色
const WOOD = '#8A6242';         // 木作点睛（棕土）
const FIRE = '#B03A2B';         // 火（灶 / 烽火）
const GOLD = '#B08A34';         // 金玉（玉璧 / 书简）

// 底部地平：一条淡墨弧线 + 一层薄晕，让建筑「坐」在地上
function ground(c){
  return `<ellipse cx="32" cy="57" rx="21" ry="3.2" fill="${c}" opacity=".14"/>
    <path d="M12 56.5 Q32 60 52 56.5" fill="none" stroke="${c}" stroke-width="1.3" opacity=".34"/>`;
}
function halo(c){
  return `<circle cx="32" cy="32" r="30" fill="${c}" opacity=".10"/>
    <circle cx="32" cy="32" r="29" fill="none" stroke="${c}" stroke-width="1.3" opacity=".32"/>`;
}

// 竖向木栅：三根立桩 + 两道横梁，柴栅之形
function zhai(){
  let g = '';
  for (let i=0;i<4;i++){
    const x = 15 + i*11.3;
    g += `<path d="M${x} 55 L${x} 22" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
    g += `<path d="M${x-1.6} 22 L${x} 17.5 L${x+1.6} 22 Z" fill="${WOOD}"/>`;
  }
  g += `<path d="M12.5 33 H51.5" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
  g += `<path d="M12.5 43 H51.5" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
  return g;
}

// 灶窟：半圆形窟口 + 灶口火光 + 一缕炊烟
function zaoku(){
  return `<path d="M11 55 L11 40 A21 15 0 0 1 53 40 L53 55 Z" fill="${INK}"/>
    <path d="M22 55 L22 42 A10 9 0 0 1 42 42 L42 55 Z" fill="#1F1C18"/>
    <path d="M27 55 Q27 47 32 47 Q37 47 37 55 Z" fill="${FIRE}"/>
    <path d="M32 44 Q28 39 32 34 Q36 29 32 23" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".55"/>`;
}

// 土窟：覆土穹顶 + 门洞
function tuku(){
  return `<path d="M8 56 Q8 26 32 26 Q56 26 56 56 Z" fill="${INK}"/>
    <path d="M24 56 L24 44 A8 9 0 0 1 40 44 L40 56 Z" fill="#1F1C18"/>
    <path d="M14 42 Q32 34 50 42" fill="none" stroke="${WOOD}" stroke-width="2" opacity=".7" stroke-linecap="round"/>`;
}

// 祠坛：三层方台 + 顶上一枚玉璧
function citan(){
  return `<path d="M10 55 H54 L49 48 H15 Z" fill="${INK}"/>
    <path d="M15 48 H49 L45 41 H19 Z" fill="${INK}" opacity=".82"/>
    <path d="M19 41 H45 L41 34 H23 Z" fill="${INK}" opacity=".66"/>
    <circle cx="32" cy="24" r="7.5" fill="none" stroke="${GOLD}" stroke-width="3"/>
    <circle cx="32" cy="24" r="2.6" fill="${GOLD}"/>`;
}

// 市廛：铺面 + 招幌布幡（幡面斜挂，有布的垂坠感）
function shichan(){
  return `<path d="M12 55 V33 H52 V55 Z" fill="${INK}"/>
    <path d="M9 33 L32 22 L55 33 Z" fill="${INK}"/>
    <path d="M22 55 V43 H32 V55 Z" fill="#1F1C18"/>
    <path d="M38 38 H48 V49 H38 Z" fill="${GOLD}" opacity=".55"/>
    <path d="M32 22 V11" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M33 12 L47 14.5 L45.5 21 L32.5 18.5 Z" fill="${WOOD}"/>
    <path d="M45 15.2 L45.8 20.4" stroke="${INK}" stroke-width="1.4" opacity=".45"/>`;
}

// 仓廪：圆囤（谷囤）+ 顶部束口 + 束带
function canglin(){
  return `<path d="M14 55 Q13 30 32 30 Q51 30 50 55 Z" fill="${INK}"/>
    <path d="M25 30 Q32 24 39 30" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M15.4 40 Q32 43.5 48.6 40" fill="none" stroke="${WOOD}" stroke-width="2.4" opacity=".85"/>
    <path d="M16.6 47 Q32 50 47.4 47" fill="none" stroke="${WOOD}" stroke-width="1.8" opacity=".55"/>
    <path d="M23 54 Q24 40 32 40 Q40 40 41 54 Z" fill="${GOLD}" opacity=".62"/>`;
}

// 烽火台：高台 + 台上烽燧 + 火光
function fenghuotai(){
  return `<path d="M20 55 L24 34 H40 L44 55 Z" fill="${INK}"/>
    <path d="M22 45 H42" stroke="${WOOD}" stroke-width="2" opacity=".6"/>
    <path d="M26 34 H38 V28 H26 Z" fill="${INK}"/>
    <path d="M32 28 Q27 23 32 18 Q36 14 32 10" fill="none" stroke="${FIRE}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M27 28 Q32 23 37 28 L35 32 H29 Z" fill="${FIRE}"/>`;
}

// 学宫：讲堂双阶 + 檐上书简
function xuegong(){
  return `<path d="M9 55 V32 H55 V55 Z" fill="${INK}"/>
    <path d="M6 32 L32 20 L58 32 Z" fill="${INK}"/>
    <path d="M27 55 V42 H37 V55 Z" fill="#1F1C18"/>
    <path d="M20 40 V33 M26 40 V33 M38 40 V33 M44 40 V33" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
    <path d="M32 20 V11" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M25 11 H39 L37 16 H27 Z" fill="${WOOD}"/>`;
}

const ART = { zhai, zaoku, tuku, citan, shichan, canglin, fenghuotai, xuegong };
// 每个建筑的主色（用于圆晕与地平）
const TINT = { zhai:WOOD, zaoku:FIRE, tuku:WOOD, citan:GOLD, shichan:WOOD, canglin:GOLD, fenghuotai:FIRE, xuegong:GOLD };

function escAttr(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// structureIcon(建筑 id 或对象) → 内联 SVG 字符串
function structureIcon(b, size){
  let x = b;
  if (typeof x === 'string'){
    const B = (typeof BUILDINGS !== 'undefined') ? BUILDINGS : ((typeof window !== 'undefined' && window.BUILDINGS) || {});
    x = B[x] || { id:x, name:x };
  }
  if (!x) x = { id:'?', name:'?' };
  const fn = ART[x.id] || ART.zhai;
  const c = TINT[x.id] || WOOD;
  const dim = size
    ? ` width="${size}" height="${size}" style="display:inline-block;vertical-align:-${Math.round(size*0.16)}px"`
    : ` width="100%" height="100%" style="display:block"`;
  return `<svg class="bi" viewBox="0 0 64 64"${dim} role="img" aria-label="${escAttr(x.name||'')}">${halo(c)}${ground(c)}${fn()}</svg>`;
}

window.structureIcon = structureIcon;
window.STRUCTURE_ICON_IDS = Object.keys(ART);
})();
