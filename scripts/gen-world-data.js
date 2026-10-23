// 世界数据生成脚本：把 nanshanjing_nodes.json / xishanjing_nodes.json / beishanjing_nodes.json
// 派生为 src/nanshanData.js / src/xishanData.js / src/beishanData.js（浏览器全局挂载）。
//
// 等级重排说明（重要）：
//   技能等级上限为 81（九九八十一）。四章的全球调参等级统一重排进 1–81：
//     南山 raw[1,75]      → [1,32]   （巡行记录，早期章，节奏舒缓）
//     西山 raw[78,275]    → [33,52]  （神话舞台，中章）
//     北山 raw[280,529]   → [53,70]  （长篇养成，精卫填海）
//     东山 raw[535,690]   → [71,81]  （荒经·水路，终末章）
//   古籍中并无等级，unlockLevel 全部是自研调参值（见各 JSON 的 _meta）。
//   原始调参值保留在每节点 / 每区域的 dataUnlockLevel 字段，便于日后重新调参。
//
//   ⚠️ 2026-10 接入东山经时由三章改四章，各章带宽相应收窄（南山 40→32、
//   西山 41-62→33-52、北山 63-81→53-70）。81 封顶不变——上限是「九九八十一」的
//   文化锚点，也是御使槽位（每 10 级 +1，至 9 槽）与全部节点门槛的容器。
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// 四章统一重排到 1–81（九九封顶）
function bandMap(lv){
  if (lv <= 75)  return Math.max(1,  Math.min(32, Math.round(1 + (lv - 1) * 31 / 74)));    // 南山
  if (lv <= 275) return Math.max(33, Math.min(52, Math.round(33 + (lv - 78) * 19 / 197))); // 西山
  if (lv <= 529) return Math.max(53, Math.min(70, Math.round(53 + (lv - 280) * 17 / 249)));// 北山
  return Math.max(71, Math.min(81, Math.round(71 + (lv - 535) * 10 / 155)));               // 东山
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

// 东山：raw 535–690 → 71–81（终末章。全经 46 山中 22 座「无草木」，
// 物产以水泽与矿玉为主，樵采/采药在此近乎空转——见 dongshanjing_nodes.json 的 _meta.技能适配）
derive('dongshanjing_nodes.json', 'dongshanData.js', {
  title: '东山经世界数据（四系 46 山）',
  global: 'DONGSHAN',
  mapLevel: bandMap,
  note: '东次三经九山之间全为「水行」，是《五藏山经》26 条山脉中唯一无陆路的一系（学者多以为是岛屿链）；另全经有 4 段「流沙」。',
});
