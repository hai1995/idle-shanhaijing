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
  return Math.max(69, Math.min(81, Math.round(69 + (lv - 691) * 12 / 159)));               // 中山
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
  const out = header + '\nwindow.' + opts.global + ' = ' + JSON.stringify(j, null, 2) + ';\n';
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
  title: '中山经世界数据（十二系，首录三系 29 山）',
  global: 'ZHONGSHAN',
  mapLevel: bandMap,
  note: '中山经是神祇与氏族记载最密的一部：十二系各有祠礼，多系末明言「冢也」（宗主山）与「帝也」（帝冢）。本轮 nodes 仅录中次一经 15 山、中次二经 9 山、中次三经 5 山；中次四经至中次十二经 nodes 为空、region 元数据俱全，待逐系补录。',
});
