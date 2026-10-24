// ===== 异兽绘形：山海经异兽的矢量图标 =====
// 设计语言「墨影 + 五行晕」：
// · 兽体一律 currentColor 墨色剪影——昼夜两套纸墨下都成画，不挑底色；
// · 角 / 翼 / 尾 / 喙 / 爪等特征件取该兽五行之色（金 #B08A34 木 #4F6E45
//   水 #2E5269 火 #B03A2B 土 #8A6242），与界面五行徽记同色，一眼对得上；
// · 背晕一圈同色薄晕 + 细环，像钤在绢上的一方小印；
// 三级优先：手绘特型（BOSS 与高辨识异兽）→ form 原文解析 + 躯干参数化 → 分类兜底。
(function(){
'use strict';

const EL_COLOR = { 金:'#B08A34', 木:'#4F6E45', 水:'#2E5269', 火:'#B03A2B', 土:'#8A6242' };

// ---------- form / 名 解析 ----------
// 躯体科按优先级匹配：先专名后泛称（"如龟而鸟首"归龟，"如鱼而蛇尾"归鱼——
// 故鱼在蛇前；"如禺"是人形猿属，排最后）。
const BODY_WORDS = [
  ['turtle',      ['龟','鼋','鼍','蠵','鳖','龞']],
  ['fish',        ['鱼','鲛','鱃','鮨','鳡','寐','鲤','鲋','儵','鲦']],
  ['serpentine',  ['蛇','虺','蚓','蛟']],
  ['equine',      ['马','驹','駮','驴','骡']],
  ['bovine',      ['牛','犛','牦','犀','兕']],
  ['ovine',       ['羊','羬','羔','羚']],
  ['cervid',      ['鹿','麋','麈','麢','麝']],
  ['porcine',     ['豚','彘','豕','猪','貆','豨']],
  ['rodent',      ['鼠','鼢','鼫','鼯','兔','菟']],
  ['canine',      ['狼','犬','狈','狗']],
  ['feline',      ['虎','豹','狸','狐','熊','貔','貅','猲','狻','犳']],
  ['avian',       ['鸟','鸡','鸠','雕','鹰','隼','燕','乌','雀','鸮','鸱','鹑','翟','鹄','凫','鸳','鸯','鹖','鵕','鹗','鸩','鸨','鸜','瞿如','鹫','枭','鹊','鹤','雉','翠','䴔','𪇱']],
  ['humanoid',    ['禺','人','仙','神','猿','夸父']],
];
const NAME_WORDS = [
  ['turtle',      ['龟','鼋','鼍','鳖']],
  ['fish',        ['鱼','鳡','鱃','寐','鮨','人鱼','鲤','鲋','儵']],
  ['serpentine',  ['蛇','虺']],
  ['equine',      ['马','驹','駮','驴','骡']],
  ['bovine',      ['牛','犀','兕','犛','牦']],
  ['ovine',       ['羊','羬','羚']],
  ['cervid',      ['鹿','麋','麢','麝']],
  ['porcine',     ['豚','彘','豕','豪']],
  ['rodent',      ['鼠','鼢','兔','菟','猬']],
  ['canine',      ['狼','犬','狗']],
  ['feline',      ['虎','豹','犳','狸','猫']],
  ['avian',       ['鸟','鸠','燕','翟','雉','鸮','豪','翰','鷩','鹦鹉','罗罗','鵕','鹗','鸱','鹑','枭','鹊','鹤','翠','凫','鸿','鹅']],
  ['humanoid',    ['猿','禺','人','夸父']],
];
// 部件词：出现即叠加对应特征件
const PART_WORDS = [
  ['horns',     ['角']],
  ['wings',     ['翼','羽']],
  ['beak',      ['喙']],
  ['claws',     ['爪','距']],
  ['mane',      ['髦','鬣','氄']],
  ['tusks',     ['长齿','齿长','簪']],
  ['eyesBack',  ['目在背','其目在背']],
];
const COLOR_WORDS = [
  ['白','白'],['赤','赤'],['黑','黑'],['黄','黄'],['青','青'],['紫','紫'],['苍','苍'],['丹','赤'],['朱','赤'],['素','白'],['玄','黑'],
];
function countCN(s, w){ return (s.split(w).length - 1); }
// 取文本中「出现位置最靠前」的躯体词所属科——比按数组顺序更准：
// "如牛……蛇尾" 里牛在前 → 归牛，不会因「蛇尾」误判成蛇。
function firstFamily(text){
  let best = null, bestIdx = Infinity;
  for (const [fam, words] of BODY_WORDS){
    for (const w of words){
      const i = text.indexOf(w);
      if (i >= 0 && i < bestIdx){ bestIdx = i; best = fam; }
    }
  }
  return best;
}
function numBefore(s, w){                     // "九尾""三首""四耳" → 9 / 3 / 4
  const m = s.match(new RegExp('([一二三四五六七八九十百零两])\\s*' + w));
  if (!m) return 0;
  return { 一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,百:100,零:0,两:2 }[m[1]] || 0;
}
function parseForm(form, name, category){
  const out = { family:'feline', parts:[], color:null, heads:1, tails:0, horns:0 };
  const f = String(form||''), n = String(name||'');
  const scan = (text) => {
    for (const [part, words] of PART_WORDS){
      if (words.some(w => text.includes(w)) && out.parts.indexOf(part) < 0) out.parts.push(part);
    }
    for (const [w, c] of COLOR_WORDS){ if (text.includes(w)){ out.color = c; break; } }
    const t = numBefore(text, '尾'), h = numBefore(text, '首'), hn = numBefore(text, '头');
    if (t) out.tails = t; if (h) out.heads = h; if (hn) out.heads = hn;
    if (/目在背/.test(text)) out.parts.push('eyesBack');
  };
  // 主躯干：先取「如」字后首个躯体词（"其状如牛…蛇尾" → 牛），
  // 再看「X身」（人面鱼身 → 鱼），最后才全身扫描。
  if (f){
    const clause = f.match(/如([^，、；。]+)/);
    let fam = clause ? firstFamily(clause[1]) : null;
    if (!fam){
      const sm = f.match(/(鱼|鸟|兽|蛇|龟|虎|牛|马|羊|鹿|豕|彘|鼠|狐|犬|狼|豹|犀|兕|蛟|龙)身/);
      if (sm) fam = firstFamily(sm[0]);
    }
    if (!fam) fam = firstFamily(f);
    if (fam) out.family = fam;
    scan(f);
  }
  // form 缺失（白猿/㸲牛/羬羊这类直接以兽名为名的）或解析未命中时，用名字兜底
  if (!f || out.family === 'feline'){
    for (const [fam, words] of NAME_WORDS){
      if (words.some(w => n.includes(w))){ out.family = fam; break; }
    }
  }
  if (!out.color){
    if (n.includes('白')) out.color = '白';
    else if (n.includes('赤') || n.includes('朱')) out.color = '赤';
    else if (n.includes('黑') || n.includes('玄')) out.color = '黑';
    else if (n.includes('黄')) out.color = '黄';
    else if (n.includes('青') || n.includes('苍')) out.color = '青';
    else if (n.includes('紫')) out.color = '紫';
  }
  if (!out.color && category === '蛇') out.color = null;
  return out;
}

// ---------- 躯干库（viewBox 0 0 64 64，面朝左，地线 y≈52） ----------
const eye = (x,y,r) => `<circle cx="${x}" cy="${y}" r="${r||1.5}" fill="var(--paper-3)"/>`;
const legs = (xs, y0, y1, w) => xs.map(x => `<rect x="${x}" y="${y0}" width="${w}" height="${y1-y0}" rx="${w/2.2}"/>`).join('');
const BODIES = {
  feline: a => `
    <path d="M44 27 Q57 23 59 11 Q60 6 56 8 Q52 10 50 17 Q48 23 42 23 Z"/>
    <ellipse cx="34" cy="30" rx="14" ry="9.5"/>
    ${legs([24,32,39,45],37,52,5)}
    <circle cx="18" cy="24" r="8"/>
    <path d="M11 19 L8 8 L20 14 Z"/><path d="M24 17 L27 6 L32 15 Z"/>
    ${eye(15.5,22.5)}`,
  canine: a => `
    <path d="M46 26 Q56 21 55 10 Q54 5 50 9 Q48 12 49 18 Q47 23 42 23 Z"/>
    <ellipse cx="34" cy="30" rx="13.5" ry="9"/>
    ${legs([24,32,39,45],37,52,4.6)}
    <circle cx="19" cy="25" r="7.4"/>
    <path d="M12 27 L3 30 L12 33 Z"/>
    <path d="M14 19 L10 8 L23 15 Z"/><path d="M24 17 L28 7 L31 17 Z"/>
    ${eye(16,23.5)}`,
  cervid: a => `
    <ellipse cx="34" cy="30" rx="13" ry="8"/>
    <path d="M25 26 L17 18 L23 15 L29 22 Z"/>
    <ellipse cx="14" cy="15" rx="5.6" ry="6.6"/>
    <path d="M10 10 L5 4 M14 8 L12 1 M18 10 L22 4" stroke="${a}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="8" cy="14" rx="2.6" ry="3.4" transform="rotate(-24 8 14)"/>
    ${legs([24,32,39,45],36,52,3.6)}
    <circle cx="47" cy="24" r="2.6"/>
    ${eye(12,14)}`,
  equine: a => `
    <path d="M46 24 Q57 22 56 34 Q55 41 50 39 Q54 32 49 27 Z"/>
    <ellipse cx="33" cy="29" rx="14" ry="8.5"/>
    <path d="M24 25 Q18 18 14 12 L22 9 Q29 15 30 22 Z"/>
    <path d="M12 12 L3 16 L5 19 L14 16 Z"/>
    <ellipse cx="13" cy="13" rx="5" ry="6"/>
    <path d="M10 8 L8 2 L14 7 Z"/><path d="M16 7 L19 2 L21 8 Z"/>
    <path d="M22 9 Q27 15 28 23" stroke="${a}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${legs([25,33,40,45],36,52,4)}
    <rect x="25" y="49" width="4" height="3" fill="${a}"/><rect x="33" y="49" width="4" height="3" fill="${a}"/>
    <rect x="40" y="49" width="4" height="3" fill="${a}"/><rect x="45" y="49" width="4" height="3" fill="${a}"/>
    ${eye(11,12)}`,
  bovine: a => `
    <ellipse cx="34" cy="30" rx="15" ry="10.5"/>
    <circle cx="16" cy="27" r="9"/>
    <path d="M9 21 Q3 15 7 8" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M23 21 Q29 15 25 8" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="9" cy="27" rx="2.6" ry="3.4"/><ellipse cx="23" cy="27" rx="2.6" ry="3.4"/>
    <ellipse cx="9.5" cy="32" rx="4.2" ry="3.4" fill="${a}" opacity=".6"/>
    ${legs([22,30,38,45],38,52,6)}
    <path d="M48 24 Q56 22 57 32" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="57.5" cy="33" r="2.6"/>
    ${eye(12,25)}`,
  ovine: a => `
    <circle cx="28" cy="27" r="8"/><circle cx="38" cy="25" r="8.6"/><circle cx="45" cy="30" r="7.6"/><circle cx="33" cy="34" r="8.2"/>
    <ellipse cx="16" cy="27" rx="6.6" ry="7.6"/>
    <ellipse cx="10" cy="34" rx="3.4" ry="2.8" fill="${a}" opacity=".6"/>
    <path d="M11 20 Q3 17 5 8 Q9 12 13 15 Z"/><path d="M21 20 Q29 17 27 8 Q23 12 19 15 Z"/>
    <ellipse cx="9" cy="26" rx="2.4" ry="3"/><ellipse cx="23" cy="26" rx="2.4" ry="3"/>
    ${legs([24,32,40,45],38,52,3.8)}
    <circle cx="50" cy="26" r="2.6"/>
    ${eye(13,25)}`,
  porcine: a => `
    <ellipse cx="32" cy="31" rx="15" ry="11.5"/>
    <circle cx="15" cy="29" r="8.6"/>
    <ellipse cx="7.5" cy="31.5" rx="3.8" ry="3" fill="${a}"/>
    <circle cx="6.6" cy="31" r=".8" fill="var(--paper-3)"/><circle cx="9.4" cy="31" r=".8" fill="var(--paper-3)"/>
    <path d="M12 21 L8 12 L18 18 Z"/><path d="M20 20 L24 12 L27 19 Z"/>
    ${legs([22,30,37,44],40,52,5.6)}
    <path d="M46 26 Q55 25 54 31 Q53 35 49 33" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${eye(13,27)}`,
  rodent: a => `
    <path d="M43 34 Q56 32 58 18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="33" cy="33" rx="10.5" ry="8.6"/>
    <circle cx="18" cy="28" r="6.8"/>
    <circle cx="13" cy="20.5" r="4.4"/><circle cx="23" cy="19.5" r="4.4"/>
    <circle cx="11.5" cy="29.5" r="2.8" fill="${a}"/>
    ${legs([26,33,39,44],40,50,3.6)}
    ${eye(16,27)}`,
  avian: a => `
    <path d="M40 28 L57 21 L54 28 L59 33 L51 34 L53 42 L43 36 Z"/>
    <ellipse cx="29" cy="30" rx="11" ry="8.5" transform="rotate(-8 29 30)"/>
    <path d="M26 26 Q37 24 39 33 Q32 37 26 32 Z" fill="${a}" opacity=".85"/>
    <circle cx="17" cy="22" r="6.6"/>
    <path d="M11 21 L3 23.5 L11 26 Z" fill="${a}"/>
    <path d="M27 38 L26 48 M34 38 L35 48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M23 48 L29 48 M32 48 L38 48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    ${eye(15,21)}
    <path d="M15 15 Q13 8 19 10 Q17 12 19 15 Z" fill="${a}"/>`,
  fish: a => `
    <path d="M50 32 L61 23 L58 32 L61 41 Z"/>
    <path d="M10 32 Q16 20 30 19 Q44 18 50 32 Q44 46 30 45 Q16 44 10 32 Z"/>
    <path d="M24 19 L28 9 L35 19 Z" fill="${a}"/>
    <path d="M24 45 L27 53 L32 45 Z" fill="${a}"/>
    <path d="M50 33 Q56 30 58 33" stroke="${a}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${eye(17,29)}`,
  serpentine: a => `
    <path d="M12 50 Q5 42 12 36 Q22 28 19 20" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    <circle cx="19" cy="15" r="5.6"/>
    <path d="M14 17 L8 15 M14 17 L8 19" stroke="${a}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M9 44 Q13 48 17 44" stroke="${a}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${eye(21,13,1.2)}`,
  turtle: a => `
    <path d="M14 40 A19 15 0 0 1 52 40 Z"/>
    <path d="M20 40 A12 9 0 0 1 46 40" stroke="${a}" stroke-width="1.8" fill="none"/>
    <path d="M33 25 L33 40 M25 27 L29 40 M41 27 L37 40" stroke="${a}" stroke-width="1.6"/>
    <circle cx="10" cy="38" r="5.4"/>
    <path d="M6 36 L2 37 L6 39 Z" fill="${a}"/>
    <rect x="15" y="40" width="7" height="9" rx="3.4"/><rect x="42" y="40" width="7" height="9" rx="3.4"/>
    <path d="M52 40 L58 42 L52 44 Z"/>
    ${eye(8,36,1.2)}`,
  humanoid: a => `
    <circle cx="32" cy="13" r="6.4"/>
    <ellipse cx="32" cy="15" rx="4.2" ry="3.4" fill="var(--paper-3)" opacity=".3"/>
    <path d="M25 20 Q32 18 39 20 L42 36 L22 36 Z"/>
    <path d="M25 22 Q18 28 20 36" stroke="currentColor" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path d="M39 22 Q46 28 44 36" stroke="currentColor" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path d="M27 36 L26 50 M37 36 L38 50" stroke="currentColor" stroke-width="4.8" stroke-linecap="round"/>
    ${eye(29.5,12)}${eye(34.5,12)}`,
};

// ---------- 部件叠加 ----------
const PARTS = {
  horns: a => `<path d="M27 10 Q21 5 23 1 M37 10 Q43 5 41 1" stroke="${a}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  wings: a => `
    <path d="M30 26 Q18 10 4 13 Q13 22 17 28 Q22 33 30 32 Z" fill="${a}" opacity=".9"/>
    <path d="M34 26 Q46 10 60 13 Q51 22 47 28 Q42 33 34 32 Z" fill="${a}" opacity=".9"/>
    <path d="M27 24 L17 14 M31 23 L22 12 M35 23 L30 12 M39 24 L38 14" stroke="var(--paper-3)" stroke-width="1" opacity=".55"/>`,
  beak: a => `<path d="M11 20 L2 23 L11 26 Z" fill="${a}"/>`,
  claws: a => `<path d="M25 52 L23 58 M31 52 L30 58 M39 52 L39 58 M46 52 L47 58" stroke="${a}" stroke-width="1.8" stroke-linecap="round"/>`,
  mane: () => `<path d="M21 16 Q26 22 23 28 M25 14 Q30 21 27 28 M29 14 Q34 20 31 27" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  tusks: a => `<path d="M6 33 L2 38 L8 36 Z M11 33 L10 39 L14 36 Z" fill="${a}"/>`,
  eyesBack: a => `<circle cx="27" cy="27" r="1.7" fill="var(--paper-3)"/><circle cx="33" cy="27" r="1.7" fill="var(--paper-3)"/><circle cx="39" cy="27" r="1.7" fill="var(--paper-3)"/><circle cx="30" cy="32" r="1.7" fill="var(--paper-3)"/><circle cx="36" cy="32" r="1.7" fill="var(--paper-3)"/>`,
};
// 多尾（九尾狐类）：尾数 >1 时从背后扇出
function tailsFan(n, a){
  let s = '';
  const spreads = [[48,24,47,13],[52,26,54,14],[54,30,58,20],[55,33,61,27],[54,36,60,34],[52,38,56,40],[50,39,52,43],[47,37,47,42],[44,35,43,39]];
  for (let i = 0; i < Math.min(n, 9); i++){
    const p = spreads[i] || [44,34,42,38];
    s += `<path d="M40 33 Q${p[0]} ${p[1]} ${p[2]} ${p[3]}" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="${p[2]}" cy="${p[3]}" r="1.8" fill="${a}"/>`;
  }
  return s;
}
// 多头（三首六目类）：沿背上加头
function headsRow(n, a){
  let s = '';
  for (let i = 0; i < Math.min(n, 4); i++){
    const cx = 14 + i * 12, cy = 18 - (i === 1 ? 5 : 0) - (i === 3 ? 3 : 0);
    s += `<circle cx="${cx}" cy="${cy}" r="5.4"/><path d="M${cx-6} ${cy-1} L${cx-12} ${cy+1.5} L${cx-6} ${cy+4} Z" fill="${a}"/>`;
    s += eye(cx - 2, cy - 1, 1.2);
  }
  return s;
}

// ---------- 手绘特型（BOSS 与高辨识异兽） ----------
// 每个特型是一整组 64×64 画面（墨影 + 五行色件），与参数化同一套语言。
const HANDDRAWN = {
  // 九尾狐：狐身 + 九尾扇张
  jiuwei: a => `
    ${tailsFan(9, a)}
    <ellipse cx="29" cy="34" rx="10.5" ry="7.6"/>
    ${legs([21,27,33,38],40,51,4.4)}
    <path d="M38 30 Q46 28 47 20 Q48 15 45 17 Q43 19 43 25 Q42 29 37 29 Z"/>
    <circle cx="17" cy="27" r="7.2"/>
    <path d="M11 21 L8 11 L19 16 Z"/><path d="M22 19 L25 9 L30 16 Z"/>
    <path d="M10 29 L2 32 L10 34 Z"/>
    ${eye(14.5,26)}`,
  // 凤皇：瑞鸟，长尾翎 + 羽冠
  fenghuang: a => `
    <path d="M38 32 Q50 30 58 16 M38 34 Q52 36 60 28 M38 36 Q50 42 55 50" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="58" cy="15" r="2.2" fill="${a}"/><circle cx="60" cy="27" r="2.2" fill="${a}"/><circle cx="55" cy="50" r="2.2" fill="${a}"/>
    <path d="M30 24 Q18 10 6 14 Q14 22 18 28 Q23 32 30 31 Z" fill="${a}" opacity=".85"/>
    <ellipse cx="28" cy="31" rx="10" ry="7.6"/>
    <circle cx="17" cy="22" r="6.2"/>
    <path d="M11 21 L3 23.5 L11 26 Z" fill="${a}"/>
    <path d="M15 15 Q11 7 19 10 Q16 12 18 15 Z" fill="${a}"/>
    <path d="M27 38 L26 48 M34 38 L35 48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    ${eye(15,21)}`,
  // 旋龟：龟身鸟首虺尾
  xuangui: a => `
    <path d="M40 38 Q52 36 56 26 Q58 21 55 23 Q52 25 50 32 Q48 37 42 37 Z"/>
    <path d="M14 40 A19 15 0 0 1 52 40 Z"/>
    <path d="M21 40 A11 8.5 0 0 1 45 40" stroke="${a}" stroke-width="1.8" fill="none"/>
    <path d="M33 25 L33 40 M25 27 L29 40 M41 27 L37 40" stroke="${a}" stroke-width="1.6"/>
    <circle cx="11" cy="35" r="5.6"/>
    <path d="M6 33 L0 35 L6 37 Z" fill="${a}"/>
    <path d="M16 14 Q12 8 18 10 Q16 12 18 15 Z" fill="${a}"/>
    <rect x="15" y="40" width="7" height="9" rx="3.4"/><rect x="42" y="40" width="7" height="9" rx="3.4"/>
    ${eye(9,33,1.2)}`,
  // 鯥：牛身蛇尾，翼在羽下
  lu: a => `
    <path d="M46 30 Q56 28 58 38 Q59 44 55 42 Q52 40 51 34 Q50 31 45 31 Z"/>
    <ellipse cx="34" cy="30" rx="14" ry="10"/>
    <path d="M30 34 Q22 44 26 50 M38 34 Q46 44 42 50" stroke="${a}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="16" cy="27" r="9"/>
    <path d="M9 21 Q3 15 7 8 M23 21 Q29 15 25 8" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="9.5" cy="32" rx="4" ry="3.2" fill="${a}" opacity=".6"/>
    ${legs([22,30,38,45],38,52,5.6)}
    ${eye(12,25)}`,
  // 猼訑：羊身九尾四耳，目在背
  boyi: a => `
    ${tailsFan(9, a)}
    <circle cx="30" cy="27" r="8"/><circle cx="39" cy="25" r="8.4"/><circle cx="46" cy="30" r="7.4"/>
    <ellipse cx="17" cy="27" rx="6.6" ry="7.6"/>
    <path d="M12 20 Q4 17 6 8 Q10 12 14 15 Z"/><path d="M22 20 Q30 17 28 8 Q24 12 20 15 Z"/>
    <ellipse cx="7" cy="20" rx="2.8" ry="3.8"/><ellipse cx="27" cy="20" rx="2.8" ry="3.8"/>
    ${PARTS.eyesBack(a)}
    ${legs([24,32,40,45],38,52,3.8)}
    ${eye(14,25)}`,
  // 𪁺𪁸：三首六目六足三翼
  yuyu: a => `
    <ellipse cx="32" cy="34" rx="12" ry="8.6"/>
    <path d="M40 30 L58 22 L54 30 L59 36 L50 37 L52 46 L42 39 Z"/>
    <circle cx="20" cy="20" r="5.6"/><circle cx="30" cy="13" r="5.6"/><circle cx="40" cy="19" r="5.6"/>
    <path d="M15 19 L8 21 L15 24 Z M25 12 L18 14 L25 17 Z M35 18 L28 20 L35 23 Z" fill="${a}"/>
    <circle cx="18" cy="19" r="1.2" fill="var(--paper-3)"/><circle cx="22" cy="19" r="1.2" fill="var(--paper-3)"/>
    <circle cx="28" cy="12" r="1.2" fill="var(--paper-3)"/><circle cx="32" cy="12" r="1.2" fill="var(--paper-3)"/>
    <circle cx="38" cy="18" r="1.2" fill="var(--paper-3)"/><circle cx="42" cy="18" r="1.2" fill="var(--paper-3)"/>
    ${legs([22,30,38,44],40,52,3.6)}`,
  // 虎蛟：虎首鱼身、蛇尾而虎纹
  hujiao: a => `
    <path d="M42 33 Q52 34 55 27 Q57 21 53 24 Q51 28 48 32 Q45 35 41 34 Z"/>
    <path d="M8 33 Q13 23 25 22 Q36 21 42 33 Q36 45 25 44 Q13 43 8 33 Z"/>
    <path d="M23 22 L26 14 L31 22 Z" fill="${a}"/>
    <path d="M23 44 L26 51 L31 44 Z" fill="${a}"/>
    <circle cx="15" cy="31" r="7.8"/>
    <path d="M10 26 L7 18 L15 23 Z"/><path d="M20 25 L25 18 L27 26 Z"/>
    <path d="M12 24 L12 29 M16 24 L16 29 M10 27 L18 27" stroke="${a}" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M24 25 L25 32 M29 24 L30 32 M34 25 L35 33 M24 40 L25 34 M29 41 L30 34 M34 40 L35 34" stroke="${a}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12" cy="30" r="1.5" fill="var(--paper-3)"/>
    <path d="M9 34 L4 33 L9 36 Z" fill="${a}"/>`,
  // 蛮蛮：一翼一目，比翼而飞（单只侧像）
  manman: a => `
    <path d="M26 28 Q14 14 4 18 Q12 26 16 30 Q21 33 26 32 Z" fill="${a}" opacity=".9"/>
    <ellipse cx="30" cy="32" rx="11" ry="7.6" transform="rotate(-10 30 32)"/>
    <path d="M40 30 L56 24 L53 31 L58 37 L49 38 L51 46 L42 39 Z"/>
    <circle cx="18" cy="25" r="6"/>
    <path d="M12 24 L5 26 L12 29 Z" fill="${a}"/>
    <circle cx="15.5" cy="24" r="1.6" fill="var(--paper-3)"/>
    <path d="M29 39 L28 47 M36 39 L37 47" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  // 蛊雕：雕而有角，音如婴儿
  gudiao: a => `
    <path d="M40 28 L57 21 L54 28 L59 33 L51 34 L53 42 L43 36 Z"/>
    <ellipse cx="29" cy="30" rx="11" ry="8.5"/>
    <path d="M26 26 Q37 24 39 33 Q32 37 26 32 Z" fill="${a}" opacity=".85"/>
    <circle cx="17" cy="22" r="6.6"/>
    <path d="M11 21 L3 23.5 L11 26 Z" fill="${a}"/>
    <path d="M13 16 Q10 9 16 11 Q14 13 16 16 Z M21 16 Q24 9 18 11 Q20 13 18 16 Z" fill="${a}"/>
    <path d="M27 38 L26 48 M34 38 L35 48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    ${eye(15,21)}`,
  // 长右：其状如禺，四耳（两对圆耳分列头侧）
  changyou: a => `
    <ellipse cx="23" cy="9" rx="3.4" ry="4.2"/><ellipse cx="41" cy="9" rx="3.4" ry="4.2"/>
    <ellipse cx="20" cy="18" rx="3.6" ry="4.4"/><ellipse cx="44" cy="18" rx="3.6" ry="4.4"/>
    <ellipse cx="23" cy="9.5" rx="1.4" ry="1.9" fill="${a}" opacity=".8"/>
    <ellipse cx="41" cy="9.5" rx="1.4" ry="1.9" fill="${a}" opacity=".8"/>
    <ellipse cx="20.5" cy="18" rx="1.5" ry="2" fill="${a}" opacity=".8"/>
    <ellipse cx="43.5" cy="18" rx="1.5" ry="2" fill="${a}" opacity=".8"/>
    <circle cx="32" cy="15" r="7.8"/>
    <ellipse cx="32" cy="16.5" rx="5" ry="4.8" fill="var(--paper-3)" opacity=".9"/>
    <circle cx="30" cy="15" r="1.3" fill="currentColor"/><circle cx="34" cy="15" r="1.3" fill="currentColor"/>
    <path d="M30 18.5 Q32 20 34 18.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
    <path d="M26 22 Q32 20 38 22 L41 37 L23 37 Z"/>
    <path d="M26 24 Q19 30 21 37 M38 24 Q45 30 43 37" stroke="currentColor" stroke-width="4.2" fill="none" stroke-linecap="round"/>
    <path d="M27 37 L26 51 M37 37 L38 51" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M26 51 L23 54 M38 51 L41 54" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  // 猾褢：其状如人而长彘毛
  huahuai: a => `
    <circle cx="32" cy="13" r="6.4"/>
    <ellipse cx="32" cy="15" rx="4.2" ry="3.4" fill="var(--paper-3)" opacity=".3"/>
    <path d="M25 20 Q32 18 39 20 L42 36 L22 36 Z"/>
    <path d="M25 22 Q18 28 20 36 M39 22 Q46 28 44 36" stroke="currentColor" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path d="M27 36 L26 50 M37 36 L38 50" stroke="currentColor" stroke-width="4.8" stroke-linecap="round"/>
    <path d="M25 18 L22 8 M29 17 L28 6 M35 17 L36 6 M39 18 L42 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
    ${eye(29.5,12)}${eye(34.5,12)}`,
  // 朱厌：其状如猿，白首赤足
  zhuyan: a => `
    <circle cx="32" cy="13" r="6.8" fill="var(--paper-3)"/>
    <circle cx="32" cy="13" r="6.8" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <path d="M25 20 Q32 18 39 20 L42 36 L22 36 Z"/>
    <path d="M25 22 Q18 28 20 36 M39 22 Q46 28 44 36" stroke="currentColor" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path d="M27 36 L26 52 M37 36 L38 52" stroke="${a}" stroke-width="4.8" stroke-linecap="round"/>
    <path d="M26 52 Q24 55 27 55 M38 52 Q40 55 37 55" stroke="${a}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="29.5" cy="12" r="1.4" fill="currentColor"/><circle cx="34.5" cy="12" r="1.4" fill="currentColor"/>`,
  // 大鹗：雕而黑文白首，赤喙虎爪（钦䲹所化）
  dae: a => `
    <path d="M40 28 L58 20 L54 28 L59 34 L50 35 L52 44 L42 37 Z"/>
    <ellipse cx="29" cy="30" rx="11.5" ry="8.6"/>
    <path d="M26 26 Q37 24 39 33 Q32 37 26 32 Z" fill="${a}" opacity=".9"/>
    <circle cx="17" cy="22" r="6.8" fill="var(--paper-3)"/>
    <path d="M11 21 L2 24 L11 27 Z" fill="${a}"/>
    <path d="M27 38 L25 49 M34 38 L32 49" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M21 49 L29 49 M28 49 L36 49" stroke="${a}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M21 49 L19 53 M25 49 L24 53 M28 49 L27 53 M32 49 L31 53" stroke="${a}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="15" cy="21" r="1.4" fill="currentColor"/>`,
  // 鵕鸟：如鸱赤足直喙，黄文白首（鼓所化）
  junniao: a => `
    <path d="M40 28 L57 21 L54 28 L59 33 L51 34 L53 42 L43 36 Z"/>
    <ellipse cx="29" cy="30" rx="11" ry="8.4"/>
    <path d="M26 26 Q36 25 38 33 Q32 36 26 32 Z" fill="${a}" opacity=".8"/>
    <path d="M28 27 L31 33 M33 26 L36 32" stroke="var(--paper-3)" stroke-width="1.2"/>
    <circle cx="17" cy="22" r="6.6" fill="var(--paper-3)"/>
    <path d="M11 21 L3 23 L11 26 Z" fill="${a}"/>
    <path d="M27 38 L26 48 M34 38 L35 48" stroke="${a}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M23 48 L29 48 M32 48 L38 48" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="15" cy="21" r="1.4" fill="currentColor"/>`,
  // 毕方：其状如鹤，一足，赤文青质而白喙
  bifang: a => `
    <path d="M40 30 L56 24 L53 31 L57 37 L49 38 L51 45 L42 38 Z"/>
    <ellipse cx="29" cy="32" rx="10.5" ry="8"/>
    <path d="M26 28 Q36 26 38 34 Q32 38 26 33 Z" fill="${a}" opacity=".85"/>
    <path d="M22 26 L25 32 M27 25 L30 32 M32 26 L35 33" stroke="${a}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M18 26 Q16 20 22 18 Q20 22 22 26 Z" fill="${a}"/>
    <circle cx="17" cy="24" r="6"/>
    <path d="M11 23 L3 25 L11 28 Z" fill="var(--paper-3)"/>
    <path d="M30 40 L30 52" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M25 52 L35 52" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    ${eye(15,23)}`,
  // 凿齿：人形兽，齿长三尺（两枚獠牙垂下）
  zaochi: a => `
    <circle cx="32" cy="14" r="7.4"/>
    <ellipse cx="32" cy="15" rx="4.6" ry="4.6" fill="var(--paper-3)" opacity=".85"/>
    <circle cx="29.5" cy="12.5" r="1.4" fill="currentColor"/><circle cx="34.5" cy="12.5" r="1.4" fill="currentColor"/>
    <path d="M25 21 Q32 19 39 21 L43 38 L21 38 Z"/>
    <path d="M25 23 Q18 30 20 38 M39 23 Q46 30 44 38" stroke="currentColor" stroke-width="4.6" fill="none" stroke-linecap="round"/>
    <path d="M27 38 L25 52 M37 38 L39 52" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M25 52 L22 55 M39 52 L42 55" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M29 19 L28 27 L31.5 21 Z M35 19 L36 27 L32.5 21 Z" fill="${a}"/>`,
  // 九婴：九头，能喷水吐火
  jiuying: a => `
    <ellipse cx="32" cy="40" rx="15" ry="9"/>
    <path d="M20 34 Q18 26 24 24 M26 32 Q26 22 32 20 M34 32 Q36 22 42 24 M44 34 Q48 28 46 24" stroke="currentColor" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <circle cx="24" cy="22" r="4.4"/><circle cx="32" cy="18" r="4.4"/><circle cx="41" cy="22" r="4.4"/><circle cx="47" cy="26" r="4"/>
    <path d="M18 22 L12 18 M36 18 L36 11 M45 22 L51 18" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    <path d="M20 20 L14 14 M28 18 L26 10 M38 20 L40 12 M44 24 L50 20" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="23" cy="21" r="1.2" fill="var(--paper-3)"/><circle cx="31" cy="17" r="1.2" fill="var(--paper-3)"/>
    <circle cx="40" cy="21" r="1.2" fill="var(--paper-3)"/><circle cx="46" cy="25" r="1.1" fill="var(--paper-3)"/>
    <path d="M24 44 Q32 48 40 44" stroke="${a}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  // 大风：巨鸟，翼则大风起
  dafeng: a => `
    <path d="M30 28 Q12 8 2 16 Q12 26 18 30 Q25 34 30 33 Z" fill="${a}" opacity=".9"/>
    <path d="M34 28 Q52 8 62 16 Q52 26 46 30 Q39 34 34 33 Z" fill="${a}" opacity=".9"/>
    <ellipse cx="32" cy="34" rx="11" ry="8.4"/>
    <circle cx="21" cy="26" r="6.2"/>
    <path d="M15 25 L7 27 L15 30 Z" fill="${a}"/>
    <path d="M30 42 L28 52 M36 42 L38 52" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M24 52 L32 52 M34 52 L42 52" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    ${eye(19,25)}`,
  // 猰貐：如牛赤身，人面马足，音如婴儿
  yayu: a => `
    <ellipse cx="34" cy="30" rx="15" ry="10.5"/>
    <circle cx="16" cy="27" r="9"/>
    <path d="M9 21 Q3 15 7 8 M23 21 Q29 15 25 8" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="16" cy="28" rx="5.4" ry="6" fill="var(--paper-3)"/>
    <circle cx="14" cy="26" r="1.3" fill="currentColor"/><circle cx="18" cy="26" r="1.3" fill="currentColor"/>
    <path d="M14 31 Q16 33 18 31" stroke="currentColor" stroke-width="1.4" fill="none"/>
    ${legs([22,30,38,45],38,52,6)}
    <path d="M22 44 L20 50 M45 44 L47 50" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 24 Q56 22 57 32" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="57.5" cy="33" r="2.6"/>`,
  // 修蛇：长蛇，能吞象
  xiushe: a => `
    <path d="M8 52 Q4 44 10 38 Q20 30 18 22 Q16 14 24 12" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
    <path d="M10 42 Q14 46 19 42 M12 34 Q16 38 21 34" stroke="${a}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="27" cy="11" rx="7" ry="5.6"/>
    <path d="M20 9 Q16 4 22 5 Q19 7 21 9 Z"/>
    <path d="M31 11 L38 9 M31 13 L38 15" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="29" cy="9" r="1.5" fill="var(--paper-3)"/><circle cx="29" cy="13" r="1.5" fill="var(--paper-3)"/>`,
  // 封豨：大野猪，皮硬如悍
  fenghui: a => `
    <ellipse cx="31" cy="31" rx="16" ry="12"/>
    <circle cx="14" cy="29" r="9.4"/>
    <ellipse cx="6" cy="32" rx="4.2" ry="3.4" fill="${a}"/>
    <path d="M10 21 L6 10 L18 17 Z"/><path d="M20 19 L25 10 L28 18 Z"/>
    <path d="M4 34 L-1 40 L6 38 Z M12 35 L11 42 L16 39 Z" fill="var(--paper-3)"/>
    ${legs([21,29,36,43],40,52,6)}
    <path d="M46 26 Q56 25 55 32 Q54 36 50 34" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M22 24 L26 30 M30 22 L34 30 M38 23 L42 31" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    ${eye(11,27)}`,
  // 刑天：以乳为目、以脐为口，操干戚而舞
  xingtian: a => `
    <path d="M22 18 Q32 14 42 18 L46 40 L18 40 Z"/>
    <path d="M18 40 L12 54 M46 40 L52 54" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <path d="M22 20 Q14 30 16 42 M42 20 Q50 30 48 42" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="27" cy="26" r="1.8" fill="var(--paper-3)"/><circle cx="37" cy="26" r="1.8" fill="var(--paper-3)"/>
    <path d="M29 32 Q32 35 35 32" stroke="var(--paper-3)" stroke-width="2" fill="none"/>
    <path d="M32 14 Q32 8 38 8 Q34 12 36 16 Z" fill="${a}"/>
    <circle cx="52" cy="30" r="9" fill="none" stroke="${a}" stroke-width="3"/>
    <path d="M16 42 L8 22 L14 20 L20 38 Z" fill="${a}" opacity=".9"/>
    <path d="M48 40 L58 18 L52 16 L44 36 Z" fill="${a}" opacity=".9"/>`,
  // 陆吾：虎身九尾，人面虎爪
  luwu: a => `
    ${tailsFan(9, a)}
    <ellipse cx="30" cy="31" rx="13" ry="9.4"/>
    <path d="M23 27 L28 30 M29 26 L34 29 M35 26 L40 29 M24 33 L29 36 M33 33 L38 36" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    ${legs([21,29,36,43],38,52,5.4)}
    <path d="M21 52 L18 57 M29 52 L28 57 M36 52 L37 57 M43 52 L45 57" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="17" cy="27" r="8"/>
    <ellipse cx="17" cy="28" rx="5" ry="5.6" fill="var(--paper-3)"/>
    <circle cx="15" cy="26" r="1.3" fill="currentColor"/><circle cx="19" cy="26" r="1.3" fill="currentColor"/>
    <path d="M15 31 Q17 33 19 31" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M10 20 L7 10 L18 16 Z"/><path d="M23 19 L26 9 L31 16 Z"/>`,
  // 西王母：其状如人，豹尾虎齿而善啸，蓬发戴胜
  xiwangmu: a => `
    <circle cx="32" cy="14" r="7"/>
    <path d="M25 10 Q22 2 32 3 Q42 2 39 10 Q36 5 32 6 Q28 5 25 10 Z" fill="${a}"/>
    <path d="M28 8 L26 2 M36 8 L38 2" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    <path d="M25 21 Q32 19 39 21 L42 40 L22 40 Z"/>
    <path d="M25 23 Q18 30 20 40 M39 23 Q46 30 44 40" stroke="currentColor" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path d="M27 40 L26 54 M37 40 L38 54" stroke="currentColor" stroke-width="4.8" stroke-linecap="round"/>
    <path d="M42 22 Q52 24 53 34 Q54 42 49 40 Q52 32 47 26 Z"/>
    <path d="M28 18 L26 22 M36 18 L38 22" fill="var(--paper-3)"/>
    <circle cx="29" cy="13" r="1.5" fill="var(--paper-3)"/><circle cx="35" cy="13" r="1.5" fill="var(--paper-3)"/>
    <path d="M30 18 Q32 20 34 18" stroke="var(--paper-3)" stroke-width="1.6" fill="none"/>`,
  // 帝江：状如黄囊，赤如丹火，六足四翼，浑敦无面目
  dijiang: a => `
    <ellipse cx="32" cy="30" rx="17" ry="15"/>
    <path d="M18 18 Q24 12 32 12 Q40 12 46 18" stroke="${a}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M20 24 Q26 18 32 18 M44 24 Q38 18 32 18 M20 36 Q26 42 32 42 M44 36 Q38 42 32 42" stroke="${a}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M15 24 Q4 18 6 30 Q10 34 16 32 Z M49 24 Q60 18 58 30 Q54 34 48 32 Z" fill="${a}" opacity=".85"/>
    <path d="M18 40 Q10 46 12 52 M26 44 Q22 50 24 55 M38 44 Q42 50 40 55 M46 40 Q54 46 52 52" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  // 象：大兽，长鼻利齿
  xiang: a => `
    <ellipse cx="32" cy="32" rx="16" ry="11.5"/>
    <circle cx="15" cy="28" r="8.6"/>
    <path d="M9 34 Q6 44 12 48 Q16 50 18 46 Q14 44 13 38 Z"/>
    <path d="M6 33 Q2 36 3 40 L8 39 Z" fill="var(--paper-3)"/>
    <ellipse cx="9" cy="20" rx="5" ry="6"/><ellipse cx="21" cy="20" rx="5" ry="6"/>
    ${legs([18,27,36,44],41,54,6.4)}
    <path d="M47 26 Q54 26 54 34 Q54 40 49 39" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${eye(11,26)}`,
  // 橐驼（骆驼）：两峰，负重在沙漠行走
  tuotuo: a => `
    <ellipse cx="30" cy="34" rx="14" ry="8"/>
    <path d="M22 28 Q26 16 34 28 Z M36 28 Q40 16 48 28 Z"/>
    <path d="M18 32 Q12 26 10 18 L18 20 Q22 26 24 30 Z"/>
    <path d="M10 16 Q6 18 6 22 L11 22 Q11 18 13 17 Z"/>
    <ellipse cx="9" cy="20" rx="5" ry="5.6"/>
    <path d="M5 24 Q3 30 7 33 Q10 34 11 31 Z"/>
    ${legs([20,28,36,43],40,54,4.4)}
    <path d="M44 30 Q50 30 50 38" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${eye(7,19)}`,
  // 鼓：其状如人面而龙身（钟山之子）
  gu: a => `
    <path d="M20 22 Q13 30 17 40 Q22 50 34 52 Q47 54 51 43 Q54 34 46 32"
          fill="none" stroke="currentColor" stroke-width="9.5" stroke-linecap="round"/>
    <path d="M15 34 L10 36 M19 44 L14 46 M30 52 L29 57 M42 53 L43 57" stroke="${a}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M20 40 L16 43 M45 53 L44 57" stroke="${a}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="20" cy="14" r="8.6"/>
    <ellipse cx="20" cy="15" rx="5.6" ry="6.2" fill="var(--paper-3)"/>
    <circle cx="18" cy="13" r="1.4" fill="currentColor"/><circle cx="22.5" cy="13" r="1.4" fill="currentColor"/>
    <path d="M18 18 Q20 20 22.5 18" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M14 7 Q10 2 17 4 Q15 6 17 8 Z" fill="${a}"/>`,
  // 钦䲹：化为大鹗前的神禽（雕身人面）
  qinfu: a => `
    <path d="M40 28 L58 20 L54 28 L59 34 L50 35 L52 44 L42 37 Z"/>
    <ellipse cx="29" cy="30" rx="11.5" ry="8.6"/>
    <path d="M26 26 Q37 24 39 33 Q32 37 26 32 Z" fill="${a}" opacity=".85"/>
    <circle cx="17" cy="22" r="6.8"/>
    <ellipse cx="17" cy="23" rx="4.6" ry="5.2" fill="var(--paper-3)"/>
    <circle cx="15" cy="21.5" r="1.3" fill="currentColor"/><circle cx="19.4" cy="21.5" r="1.3" fill="currentColor"/>
    <path d="M14 26 Q17 28 20 26" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M11 20 L3 23 L11 26 Z" fill="${a}"/>
    <path d="M27 38 L26 48 M34 38 L35 48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M23 48 L29 48 M32 48 L38 48" stroke="${a}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M23 48 L21 52 M27 48 L26 52 M34 48 L33 52 M38 48 L37 52" stroke="${a}" stroke-width="1.8" stroke-linecap="round"/>`,
  // 英招：马身人面，虎文而鸟翼（帝之平圃）
  yingzhao: a => `
    <path d="M30 24 Q16 10 4 14 Q13 23 18 28 Q24 32 30 31 Z" fill="${a}" opacity=".9"/>
    <path d="M34 24 Q46 10 58 14 Q49 23 45 28 Q40 32 34 31 Z" fill="${a}" opacity=".9"/>
    <path d="M46 24 Q57 22 56 34 Q55 41 50 39 Q54 32 49 27 Z"/>
    <ellipse cx="33" cy="29" rx="14" ry="8.5"/>
    <path d="M24 25 Q18 18 14 12 L22 9 Q29 15 30 22 Z"/>
    <ellipse cx="13" cy="13" rx="5.4" ry="6.4"/>
    <ellipse cx="13" cy="14.5" rx="3.8" ry="4.4" fill="var(--paper-3)"/>
    <circle cx="11.6" cy="13" r="1.3" fill="currentColor"/><circle cx="14.8" cy="13" r="1.3" fill="currentColor"/>
    <path d="M10 17 Q13 19 16 17" stroke="currentColor" stroke-width="1.4" fill="none"/>
    <path d="M26 26 L29 32 M32 26 L35 32 M38 27 L41 33" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    ${legs([25,33,40,45],36,52,4)}
    <rect x="25" y="49" width="4" height="3" fill="${a}"/><rect x="33" y="49" width="4" height="3" fill="${a}"/>
    <rect x="40" y="49" width="4" height="3" fill="${a}"/><rect x="45" y="49" width="4" height="3" fill="${a}"/>`,
  // 三青鸟：三鸟同行（昆仑信使）
  sanqingniao: a => `
    <circle cx="14" cy="16" r="5.4"/><circle cx="32" cy="10" r="5.4"/><circle cx="50" cy="16" r="5.4"/>
    <path d="M9 15 L2 17 L9 20 Z M27 9 L20 11 L27 14 Z M45 15 L38 17 L45 20 Z" fill="${a}"/>
    <ellipse cx="16" cy="28" rx="9" ry="6.4" transform="rotate(14 16 28)"/>
    <ellipse cx="32" cy="24" rx="9" ry="6.4"/>
    <ellipse cx="48" cy="28" rx="9" ry="6.4" transform="rotate(-14 48 28)"/>
    <path d="M24 30 L36 28 M40 30 L52 28" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 34 L13 42 M32 30 L32 42 M50 34 L51 42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="15" r="1.3" fill="var(--paper-3)"/><circle cx="30" cy="9" r="1.3" fill="var(--paper-3)"/><circle cx="48" cy="15" r="1.3" fill="var(--paper-3)"/>`,
  // 人鱼：其状如鮨鱼，四足，其音如婴儿
  renyu: a => `
    <path d="M44 32 Q54 30 57 40 Q58 45 55 43 Q52 41 51 35 Q50 33 45 33 Z"/>
    <path d="M8 33 Q14 22 26 21 Q38 20 43 33 Q38 46 26 45 Q14 44 8 33 Z"/>
    <path d="M40 33 L58 25 L55 33 L58 41 Z"/>
    <path d="M22 44 L20 52 L26 50 Z M34 44 L36 52 L30 50 Z" fill="currentColor"/>
    <circle cx="20" cy="31" r="5" fill="var(--paper-3)"/>
    <circle cx="18" cy="30" r="1.2" fill="currentColor"/><circle cx="22" cy="30" r="1.2" fill="currentColor"/>
    <path d="M18 34 Q20 36 22 34" stroke="currentColor" stroke-width="1.2" fill="none"/>
    <path d="M26 22 Q24 16 30 17" stroke="${a}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M30 20 Q28 13 35 15" stroke="${a}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
};

// 按名反查手绘特型（祥瑞/神祇经 fauna-chip 进来时只有名，如 凤皇/九尾狐）
const HANDDRAWN_BY_NAME = {
  '九尾狐':'jiuwei', '凤皇':'fenghuang', '鯥':'lu', '猼訑':'boyi', '𪁺𪁸':'yuyu',
  '猾褢':'huahuai', '旋龟':'xuangui', '虎蛟':'hujiao', '蛮蛮':'manman', '蛊雕':'gudiao',
  '长右':'changyou', '朱厌':'zhuyan', '毕方':'bifang', '凿齿':'zaochi', '九婴':'jiuying',
  '大风':'dafeng', '猰貐':'yayu', '修蛇':'xiushe', '封豨':'fenghui', '刑天':'xingtian',
  '陆吾':'luwu', '西王母':'xiwangmu', '帝江':'dijiang', '鼓':'gu', '钦䲹':'qinfu',
  '英招':'yingzhao', '三青鸟':'sanqingniao', '大鹗':'dae', '鵕鸟':'junniao',
};
// ---------- 组装 ----------
function halo(color, boss){
  const c = color || '#4C473E';
  return `<circle cx="32" cy="32" r="30.5" fill="${c}" opacity=".12"/>
    <circle cx="32" cy="32" r="29.5" fill="none" stroke="${c}" stroke-width="1.4" opacity=".38"/>`;
}
// beastIcon(异兽对象或其 id, 尺寸px) → 内联 SVG 字符串
function beastIcon(m, size){
  const MONS = (typeof Monsters !== 'undefined') ? Monsters : (window.Monsters || {});
  const SITES = (typeof AUDIENCE_SITES !== 'undefined') ? AUDIENCE_SITES : (window.AUDIENCE_SITES || {});
  let x = m;
  if (typeof m === 'string'){
    x = MONS[m] || { id:m, name:m };
  }
  if (!x) x = { id:'?', name:'?' };
  const a = EL_COLOR[x.el] || '#4C473E';
  const hd = HANDDRAWN[x.id] || HANDDRAWN[HANDDRAWN_BY_NAME[x.name]] || null;
  const boss = !!x.boss;
  // 神祇判定：传入 deity 标记，或 id 命中祠祀神位——无 form 且名未指明兽形时按人形立像
  const isGod = !!x.deity || Object.values(SITES).some(s =>
    (s.deities||[]).some(d => d.id === x.id));
  let inner = '';
  if (hd){
    inner = hd(a);
  } else {
    const p = parseForm(x.form, x.name, x.category);
    if (isGod && !x.form && p.family === 'feline') p.family = 'humanoid';
    const fam = BODIES[p.family] || BODIES.feline;
    // 部件：form 明确写到的才叠；犀兕凭名补鼻角；翼画在躯干之后（背生）
    const parts = p.parts.slice();
    if (/犀|兕/.test(x.name || '') && parts.indexOf('horns') < 0) parts.push('horns');
    const behind = parts.indexOf('wings') >= 0 ? PARTS.wings(a) : '';
    let body = behind + fam(a);
    if (p.tails > 1) body = tailsFan(p.tails, a) + body;
    if (p.heads > 1) body += headsRow(p.heads, a);
    if (parts.indexOf('eyesBack') >= 0) body += PARTS.eyesBack(a);
    inner = body + parts.filter(k => PARTS[k] && k !== 'eyesBack' && k !== 'wings').map(k => PARTS[k](a)).join('');
    // 犀兕鼻角：画在吻前的一支独角色角
    if (/犀|兕/.test(x.name || '')){
      inner += `<path d="M6 33 Q1 37 4 42 Q8 39 8 35 Z" fill="${a}"/>`;
    }
  }
  const ring = boss ? `<circle cx="32" cy="32" r="27.5" fill="none" stroke="${a}" stroke-width="1.6" opacity=".55" stroke-dasharray="3 2.4"/>` : '';
  return `<svg class="bi" viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="${escAttr(x.name||'')}" style="display:block">${halo(a, boss)}${ring}${inner}</svg>`;
}
function escAttr(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

window.beastIcon = beastIcon;
window.parseForm = parseForm;
})();
