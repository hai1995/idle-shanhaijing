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

window.markIcon = markIcon;
window.MARK_ICON_IDS = Object.keys(MARK);
})();
