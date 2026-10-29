// 世界数据生成脚本：把 nanshanjing_nodes.json / xishanjing_nodes.json / beishanjing_nodes.json /
// dongshanjing_nodes.json / zhongshanjing_nodes.json 派生为 src/ 下五份数据文件（浏览器全局挂载）。
//
// 等级重排说明（重要）：
//   技能等级上限为 81（九九八十一）。五章的全球调参等级统一重排进 1–81：
//     南山 raw[1,75]      → [1,26]   （巡行记录，早期章，节奏舒缓）
//     西山 raw[78,275]    → [27,42]  （神话舞台，中章）
//     北山 raw[280,529]   → [43,56]  （长篇养成，精卫填海）
//     东山 raw[535,690]   → [57,68]  （荒经水路，水泽大荒）
//     中山 raw[691,850]   → [69,81]  （帝之密都，全书收卷）
//   古籍中并无等级，unlockLevel 全部是自研调参值（见各 JSON 的 _meta）。
//
//   ⚠️ 2026-10-24 接入中山经时由四章改五章，各章带宽再次收窄（南山 32→26、
//   西山 33-52→27-42、北山 53-70→43-56、东山 71-81→57-68）。81 封顶不变——
//   上限是「九九八十一」的文化锚点，也是御使槽位（每 10 级 +1，至 9 槽）与
//   全部节点门槛的容器。
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// 五章统一重排到 1–81（九九封顶）
function bandMap(lv){
  if (lv <= 75)  return Math.max(1,  Math.min(26, Math.round(1 + (lv - 1) * 25 / 74)));    // 南山
  if (lv <= 275) return Math.max(27, Math.min(42, Math.round(27 + (lv - 78) * 15 / 197))); // 西山
  if (lv <= 529) return Math.max(43, Math.min(56, Math.round(43 + (lv - 280) * 13 / 249)));// 北山
  if (lv <= 690) return Math.max(57, Math.min(68, Math.round(57 + (lv - 535) * 11 / 155)));// 东山
  if (lv <= 749) return Math.max(69, Math.min(81, Math.round(69 + (lv - 691) * 12 / 159)));// 中山前三系（已上线，斜率固定）
  return Math.max(74, Math.min(81, Math.round(74 + (lv - 750) * 7 / 210)));                // 中山后九系 750–960 → 74–81
}

// 剥离编辑备注：源 JSON 里混着给我自己看的批注（「★本轮新增…」「可设计为…」），
// 早先整份打进 data 文件，等于把开发笔记随页面发给了玩家——山志「注解」里
// 曾直接显示「★可设计为特殊事件点」。这里在派生时清洗：
//   · 「可设计为…」整段删除（含其前的括号或 ★）
//   · ★ 之后的内容删除（保留原文释义）
//   · 纯「★」的数据值（如 rank 星级）保留
const EDIT_KEYS = { note:1, trait:1, desc:1, summary:1, requirement:1, effect:1, form:1, terrain:1, '原文':1, '注解':1 };
function cleanText(v){
  if (typeof v !== 'string' || !v) return v;
  if (v.trim() === '★') return v;
  let t = v.replace(/[（(][^（）()]*可设计为[^（）()]*[）)]/g, '');
  if (t.indexOf('★') >= 0) t = t.split('★')[0];
  return t.trim();
}
function cleanNotes(o){
  if (Array.isArray(o)){ o.forEach(cleanNotes); return; }
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)){
    const v = o[k];
    if (typeof v === 'string'){
      if (EDIT_KEYS[k] || v.indexOf('★') >= 0 || v.indexOf('可设计为') >= 0) o[k] = cleanText(v);
    } else cleanNotes(v);
  }
}

function derive(jsonFile, outFile, opts) {
  const j = JSON.parse(fs.readFileSync(path.join(root, jsonFile), 'utf8'));
  const map = opts.mapLevel; // (oldLevel) => newLevel
  for (const r of j.regions) {
    r.dataUnlockLevel = r.unlockLevel;
    r.unlockLevel = map(r.unlockLevel);
    for (const n of r.nodes) {
      n.dataUnlockLevel = n.unlockLevel;
      n.unlockLevel = map(n.unlockLevel);
    }
  }
  const header =
`// ===== ${opts.title} =====
// 本文件由 ${jsonFile} 派生生成，请勿手改；
// 需要调整数据时改 JSON 后重新运行 node scripts/gen-world-data.js
// 底本：中华书局点校本《山海经校注》（袁珂）——古籍原文，公有领域
${opts.note ? '// ' + opts.note + '\n' : ''}`;
  // _meta 只服务编辑与校勘，不进运行时：它夹着「设计备注 / 版本差异说明」，
  // 早先整份打进 data 文件，等于把开发笔记随页面发给了玩家（山志「注解」里
  // 曾出现「★可设计为…」）。这里剔除，源 JSON 仍保留以供查考。
  const payload = JSON.parse(JSON.stringify(j));   // 深拷贝后再清洗，不动源对象
  delete payload._meta;
  cleanNotes(payload);
  // 紧凑输出（无缩进）：这五份是世界数据，纯数据、不手改，缩进只是给人看的。
  // 去掉缩进后原始字节约省 40%，gzip 再省约 12%——直接砍首屏可交互前的传输与解析量
  // （弱网下这一份占整包 gzip 的 13%）。源 JSON 仍保留全部可读性以供查考。
  const out = header + '\nwindow.' + opts.global + ' = ' + JSON.stringify(payload) + ';\n';
  fs.writeFileSync(path.join(root, 'src', outFile), out);
  console.log('written src/' + outFile, out.length, 'bytes');
}

// 南山：raw 1–75 → 1–32
derive('nanshanjing_nodes.json', 'nanshanData.js', {
  title: '南山经世界数据（三系 39 山）',
  global: 'NANSHAN',
  mapLevel: bandMap,
});

// 西山：raw 78–275 → 33–52（前接南山 32，后启北山 53）
derive('xishanjing_nodes.json', 'xishanData.js', {
  title: '西山经世界数据（四系 77 山）',
  global: 'XISHAN',
  mapLevel: bandMap,
});

// 北山：raw 280–529 → 53–70（长篇养成，含精卫填海）
derive('beishanjing_nodes.json', 'beishanData.js', {
  title: '北山经世界数据（三系 88 山）',
  global: 'BEISHAN',
  mapLevel: bandMap,
});

// 东山：raw 535–690 → 57–68（荒经水路。全经 46 山中 22 座「无草木」，
// 物产以水泽与矿玉为主，樵采/采药在此近乎空转——见 dongshanjing_nodes.json 的 _meta.技能适配）
derive('dongshanjing_nodes.json', 'dongshanData.js', {
  title: '东山经世界数据（四系 46 山）',
  global: 'DONGSHAN',
  mapLevel: bandMap,
  note: '东次三经九山之间全为「水行」，是《五藏山经》26 条山脉中唯一无陆路的一系（学者多以为是岛屿链）；另全经有 4 段「流沙」。',
});

// 中山：raw 691–850 → 69–81（全书收卷。五藏山经最后一部，十二系；
// 2026-10-24 首录中次一经/中次二经/中次三经三系共 29 山，余九系 region 框架先立、nodes 待补）
derive('zhongshanjing_nodes.json', 'zhongshanData.js', {
  title: '中山经世界数据（十二系，全录 197 山）',
  global: 'ZHONGSHAN',
  mapLevel: bandMap,
  note: '中山经是神祇与氏族记载最密的一部：十二系各有祠礼，多系末明言「冢也」（宗主山）与「帝也」（帝冢）。本轮 nodes 仅录中次一经 15 山、中次二经 9 山、中次三经 5 山；中次四经至中次十二经 nodes 为空、region 元数据俱全，待逐系补录。',
});
