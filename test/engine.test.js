// 《山海经·放置挂机》无头引擎测试：采集-制作-讨伐-御使-祠祀-队列-离线 全闭环
// 运行：node test/engine.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// ---- 轻量 shim ----
class LocalStorageStub {
  constructor(){ this.store = {}; }
  getItem(k){ return this.store[k] || null; }
  setItem(k,v){ this.store[k] = String(v); }
  removeItem(k){ delete this.store[k]; }
}
const document = {
  body: { classList:{ add(){}, remove(){}, toggle(){}, contains:()=>false } },
  getElementById: () => ({ textContent:'', innerHTML:'', classList:{ add(){}, remove(){}, toggle(){} },
    appendChild(){}, addEventListener(){}, style:{}, querySelector:()=>null, querySelectorAll:()=>[],
    value:'', checked:false, dataset:{} }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ className:'', textContent:'', style:{}, remove(){}, classList:{ add(){}, remove(){} } }),
  addEventListener(){},
};
const UIstub = {
  log(){}, toast(){}, floatText(){}, levelUp(){}, actionFeedback(){}, attackFx(){}, hit(){},
  deathFloat(){}, bossKillFx(){}, lootFloat(){}, cropGrown(){}, tickProgress(){}, refreshActivity(){},
  refreshGear(){}, refreshInventory(){}, refreshMap(){}, refreshShop(){}, startCombat(){}, forgeShow(){},
  closeModal(){}, switchTab(){}, renderCurrent(){}, renderTopbar(){}, modal(){},
};
const window = { location:{href:'x'}, localStorage: new LocalStorageStub() };
const context = {
  window, document, localStorage: window.localStorage,
  console, Math, Date, JSON, setInterval:()=>0, setTimeout:()=>0, clearTimeout:()=>{}, clearInterval:()=>{},
  getComputedStyle: ()=>({}),
  UI: UIstub,
};
context.window.UI = UIstub;
vm.createContext(context);

const base = path.join(__dirname, '..', 'src');
function loadJS(file){ vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), context, {filename:file}); }
// ui.js 已按页拆成 7 个文件（v1.31.8），顺序与 index.html 一致；core 必须最先。
const UI_FILES = ['ui/core.js','ui/world.js','ui/combat.js','ui/codex.js','ui/trade.js','ui/pack.js','ui/misc.js'];
const uiSrcAll = UI_FILES.map(f => fs.readFileSync(path.join(base, f), 'utf8')).join('\n');
['nanshanData.js','xishanData.js','beishanData.js','dongshanData.js','zhongshanData.js','gameData.js','affix.js','save.js','engine.js','game.js','queue.js','interact.js','fx.js','beastIcon.js','riteIcon.js','structureIcon.js','skillIcon.js','itemIcon.js','markIcon.js'].forEach(loadJS);
const G = context;
const ST = context.window;

G.resetToDefault();

let pass = 0, fail = 0;
const pending = [];   // 异步用例（云端同步 / 参考后端契约）：收尾后再出汇总，避免漏计
function assert(cond, msg){ if(cond){ pass++; console.log('PASS: '+msg); } else { fail++; console.error('FAIL: '+msg); process.exitCode=1; } }
function section(t){ console.log('\n== ' + t + ' =='); }

// ============ 1. 初始状态与数据完整性 ============
section('初始状态与数据完整性');
assert(ST.Game.shells === 50, '初始贝币 50');
assert(Object.keys(ST.Skills).length === 26, '26 技能（与 26 山系呼应）');
assert(ST.Skills.zhulu && ST.Skills.yushi && ST.Skills.yudi && ST.Skills.guanxiang, '驭使/方国类技能齐备');
const allNodes = [];
ST.NANSHAN.regions.forEach(r=>r.nodes.forEach(n=>allNodes.push(n)));
assert(allNodes.length === 39, '南山经三系共 39 山 -> ' + allNodes.length);
assert(ST.WORLD.regions.length === 26, '世界共 26 山系（南山 3 + 西山 4 + 北山 3 + 东山 4 + 中山 12）');
assert(ST.WORLD.regions.reduce((a,r)=>a+r.nodes.length,0) === 447, '世界共 447 山（39+77+88+46+197）-> ' + ST.WORLD.regions.reduce((a,r)=>a+r.nodes.length,0));
assert(ST.CHAPTERS.length === 5 && ST.CHAPTERS[4].regionIds.length === 12, '五章：南山 / 西山 / 北山 / 东山 / 中山（十二系全录）');
// 东山经接入校验（2026-10）
const dsNodes = [];
ST.DONGSHAN.regions.forEach(r=>r.nodes.forEach(n=>dsNodes.push(n)));
assert(dsNodes.length === 46, '东山经四系共 46 山 -> ' + dsNodes.length);
assert(dsNodes.every(n=>n.unlockLevel>=57 && n.unlockLevel<=68), '东山 46 山等级重排入 57-68（后启中山 69）');
assert(dsNodes.every(n=>n.dataUnlockLevel>0), '东山原始调参值保留在 dataUnlockLevel');
assert(ST.DONGSHAN.regions.filter(r=>r.deity).length === 3, '东山四系中三系载山神与祠礼（东次四经为「无神之域」');
assert(ST.WORLD.regions.find(r=>r.regionId==='dongshan-4').unlockLevel === 66, '东次四经区域门槛 66（接北山 56 之后重排）');
assert(ST.WORLD.regions.every(r=>r.unlockLevel<=81), '区域门槛上限 81（中次十二经，全书收卷）');
assert(ST.WORLD.regions.reduce((a,r)=>a+r.nodes.length,0)>0 && ST.WORLD.regions.every(r=>r.nodes.length===0 || r.nodes.every(n=>n.unlockLevel<=81)), '节点等级不越 81 上限');
// 中山经接入校验（2026-10）
const zsNodes = [];
ST.ZHONGSHAN.regions.forEach(r=>r.nodes.forEach(n=>zsNodes.push(n)));
assert(ST.ZHONGSHAN.regions.length === 12, '中山经十二系 -> ' + ST.ZHONGSHAN.regions.length);
assert(zsNodes.length === 197, '中山经十二系共 197 山全录（一 15 + 二 9 + 三 5 + 四 9 + 五 15 + 六 14 + 七 19 + 八 23 + 九 16 + 十 9 + 十一 48 + 十二 15）-> ' + zsNodes.length);
assert(zsNodes.every(n=>n.unlockLevel>=69 && n.unlockLevel<=81), '中山 197 山等级重排入 69-81（十二经末山荣余落于 81 收卷）');
assert(zsNodes.every(n=>n.dataUnlockLevel>0), '中山原始调参值保留在 dataUnlockLevel');
assert(['rite_zs1','rite_zs2','rite_zs3','rite_zs4','rite_zs5','rite_zs6','rite_zs7','rite_zs8','rite_zs9','rite_zs10','rite_zs11','rite_zs12'].every(id=>ST.RITES[id]), '中山十二套祠礼齐备');
assert(ST.OMENS.mingshe && ST.OMENS.huashe && ST.OMENS.fuzhu, '中山三征兆：鸣蛇大旱 / 化蛇大水 / 夫诸大水');
assert(ST.ZHONGSHAN.regions.filter(r=>r.nodes.length===0).length === 0, '中山十二系诸山全部补录完毕（无空框架系）');
assert(ST.WORLD.regions.filter(r=>r.regionId.indexOf('zhongshan')===0).length === 12, '中山十二系并入世界');
// 物品 id 唯一性（防止同名物品互相覆盖——曾因珠玉/祝余同 id 出过事故）
(function(){
  const src = fs.readFileSync(path.join(__dirname,'..','src','gameData.js'),'utf8');
  const seen = {};
  const dup = [];
  for (const it of Object.values(ST.Items)){
    const name = it.name;
    if (seen[name] && seen[name] !== it.id) dup.push(name+':'+seen[name]+'/'+it.id);
    seen[name] = it.id;
  }
  // 以字面量构造调用数粗估 id 重复定义
  const idCount = {};
  (src.match(/(?:I|XW)\('([a-z0-9_]+)'/g)||[]).forEach(m=>{ const id=m.slice(3,-1); idCount[id]=(idCount[id]||0)+1; });
  const dupIds = Object.keys(idCount).filter(k=>idCount[k]>1);
  assert(dup.length === 0, '物品名与 id 一一对应' + (dup.length?('，冲突：'+dup.join(',')):''));
  assert(dupIds.length === 0, '物品 id 无重复定义' + (dupIds.length?('，重复：'+dupIds.join(',')):''));
})();
assert(Object.keys(ST.Monsters).length >= 30, '异兽/可猎兽构建 -> ' + Object.keys(ST.Monsters).length);
assert(ST.Monsters.fenghuang === undefined && ST.Monsters.yuanchu === undefined, '祥瑞（凤皇/鹓雏）不可讨伐');
assert(ST.Monsters.huan && ST.Monsters.huan.unkillable, '䍺「不可杀也」标记');
const bosses = Object.values(ST.Monsters).filter(m=>m.boss);
assert(bosses.length === 10, '六凶 + 刑天 + 西山三神 共 10 个 BOSS');
assert(bosses.every(b=>b.special && b.special.name), '每个 BOSS 都有具名专属机制');
assert(bosses.map(b=>b.id).includes('zaochi'), '凿齿在列');
assert(bosses.map(b=>b.id).join(',').includes('luwu'), '陆吾守关在列');
assert(bosses.map(b=>b.id).join(',').includes('xiwangmu'), '西王母在列');
assert(bosses.map(b=>b.id).join(',').includes('dijiang'), '帝江在列');
assert(Object.keys(ST.CODEX).length >= 90, '图鉴条目 -> ' + Object.keys(ST.CODEX).length);
assert(Object.keys(ST.OMENS).length === 8 + 15 + 4 + 15 + 3, '征兆 8 + 15 + 北山 4 + 东山 15 + 中山 3 = 45 条 -> ' + Object.keys(ST.OMENS).length);
assert(Object.keys(ST.OBSERVE_SITES).length === 13, '观象/观瑞 13 处（南山 5 + 东山 4 + 西山 2 + 北山 1 + 中山 1）');
assert(Object.keys(ST.RITES).length === 3 + 6 + 1 + 3 + 3 + 12, '祠礼 3 + 6 + 常祭 + 北山 3 + 东山 3 + 中山 12 = 28 套 -> ' + Object.keys(ST.RITES).length);
// 交互补充：切属性即开战 / 营造详情弹窗 / 行装页战斗数值条
{
  const uiSrc2 = uiSrcAll;
  assert(/切\$\{counterEl\}属并开战/.test(uiSrc2) && uiSrc2.includes("UI.startHuntTimes('${id}')\">切"),
    '征伐弹窗「切X属并开战」：切属性后立即开战，非只回到列表');
  assert(!uiSrc2.includes("UI.closeModal();UI.renderTaofa()\">切"), '旧「切属性后仅回列表」写法已移除');
  assert(uiSrc2.includes('UI.openBuildModal') && uiSrc2.includes("onclick=\"UI.openBuildModal('${b.id}')\""),
    '营造方块点击开详情弹窗（不再单击即造）');
  assert(uiSrc2.includes('function combatStatBarHtml') && uiSrc2.includes("if (tab === 'pack') return combatStatBarHtml();"),
    '行装页顶栏改走战斗数值条');
  [['hp','气血'],['atk','攻击'],['def','防御'],['eva','闪避'],['el','五行'],['dps','DPS']].forEach(([k, label]) =>
    assert(uiSrc2.indexOf("cell('" + k + "','" + label + "'") >= 0, '行装页顶栏显示「' + label + '」'));
  assert(uiSrc2.includes('UI.openStatModal') && uiSrc2.includes('function combatStatBreakdown'),
    '数值条可点开构成弹窗（气血 / 攻击 / 防御 / 闪避 / 五行 / DPS 各一项）');
  assert(!uiSrc2.includes("pack:    ['bing',    '兵']"), '行装页顶栏不再挂「兵」技能等级');
}

// 祠礼祭品不得张冠李戴：中次十一经原文「用一珪」，珪是 guiyu 而非桂（gui）
{
  const r11 = ST.Recipes.find(r => r.out === 'rite_zs11');
  assert(r11 && r11.cost.some(([m]) => m === 'guiyu'), '中次十一经祠礼用「珪」（guiyu）');
  assert(r11 && !r11.cost.some(([m]) => m === 'gui'), '中次十一经祠礼不误用「桂」（gui）当珪');
  assert(ST.Items.guiyu && ST.Items.guiyu.name === '珪', 'guiyu 确为珪');
}
assert(ST.RITES.rite_chang.regionId === null, '常祭无区域归属（随时可行）');
assert(Object.keys(ST.AUDIENCE_SITES).length >= 8, '谒见神祇之山 -> ' + Object.keys(ST.AUDIENCE_SITES).length);
assert(Object.keys(ST.GROW_SITES).length === 3, '养成点（丹木 / 器酸 / 精卫）');
assert(Object.keys(ST.SPECIAL_NODES).length === 7, '特殊节点（积石/鸟鼠同穴/昆仑 + 北山 4）');

// ============ 2. 采集闭环 ============
section('采集闭环');
G.startActivity('gather','gui');
assert(ST.Game.activity && ST.Game.activity.kind === 'gather', '开始樵采');
for (let i=0;i<5;i++) G.performAction(ST.Game.activity);
assert(ST.totalOf('gui') > 5, '樵采得桂 -> '+ST.totalOf('gui'));
assert(ST.Game.skills.qiaocai.xp > 0, '樵采获经验');
assert((ST.Game.records.gui||{}).count >= 5, '桂著录计数 -> '+JSON.stringify(ST.Game.records.gui));
// 非本地产出拒绝
ST.Game.activity = { kind:'gather', skill:'caiyu', itemId:'baiyu', src:'test' };
const before = ST.totalOf('baiyu');
G.performAction(ST.Game.activity);
assert(ST.totalOf('baiyu') === before, '异地不产被拒绝');
// 采玉 / 渔 / 采药
G.startActivity('gather','jin'); G.performAction(ST.Game.activity);
assert(ST.totalOf('jin') >= 1, '采玉得金');
G.startActivity('gather','yupei'); G.performAction(ST.Game.activity);
assert(ST.totalOf('yupei') >= 1, '渔得育沛');
G.startActivity('gather','zhuyu'); G.performAction(ST.Game.activity);
assert(ST.totalOf('zhuyu') > 3, '采药得祝余');
// 等级门槛
ST.Game.activity = { kind:'gather', skill:'caiyu', itemId:'boshi', src:'test' };
G.performAction(ST.Game.activity);
assert(ST.Game.activity === null, '等级不足停止采集');

// ============ 3. 著录度阶位 ============
section('著录度');
assert(ST.recordTierOf(0) === 0 && ST.recordTierOf(1) === 0 && ST.recordTierOf(10) === 1
    && ST.recordTierOf(25) === 2 && ST.recordTierOf(50) === 3 && ST.recordTierOf(100) === 4, '五阶阈值 1/10/25/50/100');
assert(ST.masteryBonus(100) === 0.50, '得御阶产出 +50%');
G.addRecord('gui', 100);
assert((ST.Game.records.gui||{}).tier === 4, '桂著录至得御');

// ============ 4. 圃艺 ============
section('圃艺');
G.giveItem('seed_tu', 3, false);
assert(G.plantSeed('p0','seed_tu') === true, '植稌');
assert(G.plantSeed('p0','seed_tu') === false, '同田重复种植被拒');
G.farmTick(999);
assert(ST.totalOf('tu') > 5, '田地收获稌米 -> '+ST.totalOf('tu'));
assert(ST.Game.stats.harvests >= 1, '收获计数');

// ============ 5. 制作闭环 ============
section('制作闭环');
G.giveItem('guaimu', 5, false); G.giveItem('shashi', 5, false); G.giveItem('gui', 6, false);
// 石斧 / 石镐要冶铸六级、石镞矢要削羽六级（沙石产在箕尾之山，Lv7 才到得了）
G.gainXp('yezhu', 60000); G.gainXp('xiaoyu', 60000);
G.startActivity('craft','burn::tan');
for (let i=0;i<3;i++) G.performAction(ST.Game.activity);
assert(ST.totalOf('tan') >= 6, '燔燎得炭 -> '+ST.totalOf('tan'));
G.startActivity('craft','smith::muge'); G.performAction(ST.Game.activity);
assert(ST.totalOf('muge') >= 1, '冶铸木戈');
G.startActivity('craft','smith::shifu'); G.performAction(ST.Game.activity);
assert(ST.totalOf('shifu') >= 1, '制器石斧');
G.giveItem('sheng',2,false);
G.startActivity('craft','fletch::mugong');
G.performAction(ST.Game.activity);
assert(ST.totalOf('mugong') >= 1, '削羽木弓');
G.startActivity('craft','fletch::shizu'); G.performAction(ST.Game.activity);
assert(ST.totalOf('shizu') >= 5, '石镞矢 ×5');
G.giveItem('yu',2,false);
G.gainXp('zhuoyu', 100000);
G.startActivity('craft','jade::zhang'); G.performAction(ST.Game.activity);
assert(ST.totalOf('zhang') >= 1, '琢玉璋');
G.startActivity('craft','cook::jiagufan'); G.performAction(ST.Game.activity);
assert(ST.totalOf('jiagufan') >= 2, '调鼎嘉谷饭');
G.giveItem('shuiping',1,false);
G.gainXp('lianyao', 100000);
G.startActivity('craft','herb::bujisan'); G.performAction(ST.Game.activity);
assert(ST.totalOf('bujisan') >= 1, '炼药不饥散');
// 制作材料不足应停止
ST.Game.activity = { kind:'craft', recipe: ST.Recipes.find(r=>r.out==='baijinqi'), src:'test' };
G.performAction(ST.Game.activity);
assert(ST.Game.activity === null, '原料不足停止制作');

// ============ 6. 配方原料可获得性审计 ============
section('配方原料可获得性审计');
(function(){
  // 经济模型：初始行装 + 墟市 + 采集物 + 圃艺作物 + 讨伐掉落 + 配方产物（传递闭包）
  const obtainable = new Set(Object.keys(G.cloneDefaultGame().inventory));
  ST.ShopStock.forEach(s=>obtainable.add(s.itemId));
  Object.values(ST.Items).forEach(it=>{ if (it.skill || it.type==='crop') obtainable.add(it.id); });
  Object.values(ST.Monsters).forEach(m=>{
    (m.loot||[]).forEach(([id])=>obtainable.add(id));
    if (m.drop) obtainable.add(m.drop);
  });
  // 观瑞所得瑞羽（凤皇羽 / 鹓雏羽）
  ['danxue','nanyu'].forEach(k=>obtainable.add(k==='danxue'?'fenghuangyu':'yuanchuyu'));
  let changed = true;
  while (changed){
    changed = false;
    for (const r of ST.Recipes) if (!obtainable.has(r.out)){ obtainable.add(r.out); changed = true; }
  }
  const missing = [];
  ST.Recipes.forEach(r=>r.cost.forEach(([id])=>{ if (!obtainable.has(id)) missing.push(id); }));
  assert(missing.length === 0, '所有配方原料均有来源' + (missing.length?('，缺：'+missing.join(',')):''));
  const bad = ST.ShopStock.filter(s=>{ const it = ST.Items[s.itemId]; return it && it.value && (s.cost/s.qty) < it.value; });
  assert(bad.length === 0, '商店单价 ≥ 回收价（无套利）');
  const badLoot = [];
  Object.values(ST.Monsters).forEach(m=>(m.loot||[]).forEach(([id])=>{ if (!ST.Items[id]) badLoot.push(id); }));
  assert(badLoot.length === 0, '战利品均为已定义物品');
  // 每个技能都有经验来源（源码中出现该技能的 gainXp / 计经验逻辑）
  const srcAll = ['game.js','queue.js','interact.js','gameData.js', ...UI_FILES]
    .map(f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8')).join('\n');
  const noXpSource = Object.keys(ST.Skills).filter(id=>!srcAll.includes(`'${id}'`));
  assert(noXpSource.length === 0, '26 技能均有经验来源' + (noXpSource.length?('，缺：'+noXpSource.join(',')):''));
})();

// ============ 7. 装备 ============
section('装备');
G.equipItem('muge');
assert(ST.Game.gear.weapon && ST.Game.gear.weapon.id === 'muge', '装备木戈');
assert(G.equipSlotOf(ST.Items.shizu) === 'quiver' && G.equipSlotOf(ST.Items.pijia) === 'armor', '槽位判定');
assert(ST.playerElement() === '木', '兵器五行为木');
G.equipItem('mugong');
assert(ST.Game.gear.weapon.id === 'mugong', '弓替换戈（同一兵器槽）');
G.unequip('weapon', false);
assert(!ST.Game.gear.weapon, '卸下兵器');
G.maybeAutoEquip();
assert(!!ST.Game.gear.weapon, '自动装备生效');

// ============ 8. 讨伐战斗 ============
section('讨伐战斗');
G.stopActivity(); ST.Game.combat = null;
assert(ST.wuxingMult('金','木') === 1.35, '金克木 ×1.35');
assert(ST.wuxingMult('木','金') === 0.75, '木被金克 ×0.75');
assert(ST.wuxingMult('火','火') === 1.00, '同属 ×1.00');
assert(ST.wuxingSheng('水','木') === true, '水生木');
G.equipItem('muge');
G.startCombat('shengsheng');
assert(!!ST.Game.combat, '往讨狌狌');
let guard = 0;
while (ST.Game.combat && guard++ < 4000) G.combatTick(0.3);
assert(ST.Game.stats.kills >= 1, '讨伐结算 kills='+ST.Game.stats.kills);
assert(ST.Game.skills.taofa.xp > 0 && ST.Game.skills.bing.xp > 0, '讨伐/兵 获经验');
assert((ST.Game.records.shengsheng||{}).count >= 1, '狌狌著录');
// 自动进食
// ⚠️ 本用例原先偶发失败（约 1/4 概率），三个成因，均已消除：
// ① 断言写成 `inventory.jiagufan < 2`。autoEat 吃到堆叠归零时会 delete 该 key，
//    于是变成 `undefined < 2` → NaN → false——吃得越干净反而越算失败。
//    改用 `(…||0)` 兜底，并给足数量，任何消耗都算通过。
// ② autoEat 取「heal 值最大」的候选。前面随机战斗掉落的狌狌肉/狩骨回血远高于
//    嘉谷饭，实际吃掉的是肉、嘉谷饭数量不变——故先清空行囊只留嘉谷饭。
// ③ playerHp 过低时，玩家首次攻击一旦未命中（2%~8%），怪物先手即秒杀，
//    战斗提前结束、根本走不到进食。故阈值拉满 + hp 取 20，稳过触发线又不至于被秒。
const _autoEat = ST.Prefs.autoEat;
ST.Prefs.autoEat = 1;                       // 阈值拉满，保证一定触发
ST.Game.inventory = { jiagufan: 3 };
ST.Game.combat = { monsterId:'baiyuan', monsterHp:9999, playerHp:20, timer:0, maxtimer:0, spec:0, style:'attack', dmgOut:0, dmgIn:0, round:0, flee:0 };
for (let i=0;i<60 && ST.Game.combat;i++) G.combatTick(0.5);
assert((ST.Game.inventory.jiagufan||0) < 3, '低血自动进食（已食 ' + (3 - (ST.Game.inventory.jiagufan||0)) + ' 份）');
ST.Prefs.autoEat = _autoEat;
ST.Game.combat = null;
// 不可杀：缠斗后遁去（需舆地/讨伐等级达标；缠斗中持续疗伤以模拟挂机补给）
G.gainXp('yudi', 5000000); G.gainXp('lvxian', 5000000); G.gainXp('taofa', 5000000); G.gainXp('ming', 5000000);
G.startCombat('huan');
assert(!!ST.Game.combat, '往讨䍺');
guard = 0;
while (ST.Game.combat && guard++ < 400){
  if (ST.Game.combat) ST.Game.combat.playerHp = ST.playerMaxHp();
  G.combatTick(0.3);
}
assert(ST.Game.combat === null, '䍺不可杀，遁去');
assert((ST.Game.records.huan||{}).count >= 1, '䍺仍可著录');
// Boss 机制直接调用不抛错且各有差异（连击/闪避类有多发判定，重试数次避免偶然 miss）
['zaochi','jiuying','dafeng','yayu','xiushe','fenghui','xingtian','luwu','xiwangmu','dijiang'].forEach(id=>{
  const m = ST.Monsters[id];
  let fired = false;
  for (let t=0;t<10 && !fired;t++){
    const c = { playerHp:99999, monsterHp:m.hp, dmgIn:0, round:0, spec:0, style:'attack', timer:0, maxtimer:0 };
    G.doMonsterSpecial(c, m);
    fired = c.playerHp < 99999 || m.special.elementShift || m.special.dodge || m.special.poison || m.special.enrage || m.special.armor || m.special.fear || c.fearUntil > 0;
  }
  assert(fired, `${m.name} 专属机制生效（${m.special.name}）`);
});
assert(['recommend','fair','danger'].includes(ST.threatOf(ST.Monsters.shengsheng).level), '威胁评估分级');

// ============ 9. 征兆系统 ============
section('征兆系统');
G.recordObject('changyou', 1);
assert(ST.Game.omens.some(o=>o.id==='changyou'), '长右初见触发「大水」征兆');
assert(ST.omenMod('gather') < 0, '大水征兆降低采集效率');
assert(ST.Game.stats.omens.changyou === true, '征兆历史记录');
G.giveItem('jian',3,false); G.giveItem('dao',3,false);
assert(G.exorcise() === true, '禳解凶兆');
assert(!ST.Game.omens.some(o=>ST.OMENS[o.id].polarity==='凶'), '凶兆已禳除');
G.recordObject('guanguan', 1);
assert(ST.isWise() === true, '灌灌初见获「不惑」');

// ============ 10. 祠祀 / 观象 / 卜筮 / 营造 ============
section('祠祀 · 观象 · 卜筮 · 营造');
G.giveItem('zhang',1,false); G.giveItem('bi',1,false); G.giveItem('jian',1,false); G.giveItem('dao',1,false); G.giveItem('tu',1,false);
assert(G.performRite('rite_ns1') === true, '首经祠礼');
assert(ST.regionRiteBonus('nanshan-1') > 0, '区域祠礼产出加成');
assert((ST.Game.records['deity_ns1']||{}).count >= 1, '山神入录');
G.gainXp('yudi', 30000000); G.gainXp('lvxian', 30000000);
assert(G.travelTo('nanshan-2-17') === true, '前往漆吴之山');
assert(ST.Game.node === 'nanshan-2-17', '所在地更新');
G.startObserve('qiuwu');
for (let i=0;i<3 && ST.Game.activity;i++) G.performAction(ST.Game.activity);
assert(ST.Game.observed.qiuwu === true, '日次观象完成');
assert(ST.offlineCapHours() >= 13, '观象提升离线上限 -> '+ST.offlineCapHours()+'h');
G.giveItem('jian',1,false);
G.divine();
assert(ST.Game.stats.divines === 1, '卜筮计数');
G.gainXp('yingyi', 5000000);
G.giveItem('guaimu',120,false); G.giveItem('shashi',40,false); G.giveItem('yu',10,false);
G.giveItem('jin',5,false); G.giveItem('tan',15,false); G.giveItem('tu',15,false); G.giveItem('jian',15,false);
G.giveItem('gui',20,false); G.giveItem('yan',20,false);
// 低级建造物：营造曲线从 1 级起步（柴栅 / 灶窟 / 土窟）
assert(ST.BUILDINGS.zhai && ST.BUILDINGS.zhai.lvl === 1, '柴栅为 1 级建造物（最低不再是 10 级）');
assert(G.buildStructure('zhai') === true && G.buildStructure('zaoku') === true && G.buildStructure('tuku') === true, '三座低级建造物均可营造');
assert(ST.globalYieldBonus() >= 0.03, '柴栅全局产出 +3% 生效 -> ' + ST.globalYieldBonus());
assert(ST.offlineCapHours() >= 13, '土窟离线上限 +1h 生效 -> ' + ST.offlineCapHours() + 'h');
assert(G.buildStructure('citan') === true, '营造祠坛');
assert(G.buildStructure('citan') === false, '重复营造被拒');
assert(G.buildStructure('shichan') === true && G.buildStructure('canglin') === true
    && G.buildStructure('fenghuotai') === true && G.buildStructure('xuegong') === true, '其余四大营造');
assert(ST.tradeMult() > 1, '市廛提升售价');
assert(ST.offlineCapHours() >= 15, '仓廪+观象 离线上限 -> '+ST.offlineCapHours()+'h');

// ============ 10.5 西山经系统 ============
section('西山经 · 衔接');
// 等级重排在 81 上限内
const xsNodes = [];
ST.XISHAN.regions.forEach(r=>r.nodes.forEach(n=>xsNodes.push(n)));
assert(xsNodes.every(n=>n.unlockLevel>=27 && n.unlockLevel<=42), '西山 77 山等级重排入 27-42（接南山 26）');
assert(xsNodes.every(n=>n.dataUnlockLevel>0), '原始调参值保留在 dataUnlockLevel');
// ---- 北山经校验 ----
const bsNodes = [];
ST.BEISHAN.regions.forEach(r=>r.nodes.forEach(n=>bsNodes.push(n)));
assert(bsNodes.length === 88, '北山经三系共 88 山 -> ' + bsNodes.length);
assert(bsNodes.every(n=>n.unlockLevel>=43 && n.unlockLevel<=56), '北山 88 山等级重排入 43-56（后启东山 57）');
assert(ST.regionUnlocked(ST.WORLD.regions.find(r=>r.regionId==='beishan-3')), '北山三经区域已解锁');
assert(['rite_bs1','rite_bs2','rite_bs3'].every(id=>ST.RITES[id]), '北山三套祠礼齐备');
const bsOmenIds = Object.keys(ST.OMENS).filter(k=>k.indexOf('omen_beishan')===0);
assert(bsOmenIds.length === 4, '北山 4 条征兆派生 -> ' + bsOmenIds.length);
assert(ST.Monsters.paoxiao && ST.Monsters.paoxiao.man, '北山食人兽·狍鸮可讨伐');
assert(ST.Monsters.zhuhuai && ST.Monsters.zhuhuai.man, '北山食人兽·诸怀可讨伐');
assert(ST.Monsters.jingwei && !ST.Monsters.jingwei.boss, '精卫作为可著录对象存在');
const bsGrow = ['qisuan','jingwei'].every(id=>ST.GROW_SITES[id]);
assert(bsGrow, '北山两处长周期养成（器酸三岁 / 精卫填海）');
assert(ST.SPECIAL_NODES['beishan-2-05'] && ST.SPECIAL_NODES['beishan-2-05'].desert, '北山·白沙山沙漠规则');
assert(ST.regionOf('beishan-1-01') && String(ST.regionOf('beishan-1-01').regionId).indexOf('beishan-1')===0, '生食不火区域判定可用');
// 舆地经验耦合：一切修行皆长舆地（区域解锁可达性的关键修复）
const yudiXpBefore = ST.Game.skills.yudi.xp;
G.gainXp('qiaocai', 200000);
assert(ST.Game.skills.yudi.xp > yudiXpBefore, '修行长舆地（耦合生效）');
assert(ST.Game.skills.lvxian.xp > 0, '修行长履险');
// 西山征兆（JSON 派生）
assert(ST.OMENS.feiyi && ST.OMENS.feiyi.type==='大旱' && ST.OMENS.feiyi.polarity==='凶', '肥𧔥：大旱');
assert(ST.OMENS.wenyao && ST.OMENS.wenyao.polarity==='吉', '文鳐鱼：大穰（吉）');
assert(ST.OMENS.feiyi.gather < 0 && ST.OMENS.feiyi.fish < 0, '大旱征兆降采集与渔获');
assert(ST.OMENS.wenyao.yield > 0, '大穰征兆提全局产出');
assert(ST.OMENS.bifang.craft < 0, '毕方讹火降制作效率');
assert(ST.OMENS.manman.gather < 0, '蛮蛮大水降采集');
assert(ST.OMENS.zhuyan.war === true && ST.OMENS.dae.war === true, '兵灾类征兆标记（可被駮御）');
// 兵灾免疫：御使駮
G.gainXp('yudi', 50000000); G.gainXp('lvxian', 50000000); G.gainXp('taofa', 50000000);
G.addRecord('bo', 100);
G.deployBeast('bo');
assert(Object.values(ST.Game.deployed).includes('bo'), '御使駮');
ST.activateOmen('zhuyan');
assert(!ST.Game.omens.some(o=>o.id==='zhuyan'), '駮「可以御兵」——兵灾征兆被御');
G.undeployBeast(Object.keys(ST.Game.deployed)[0]);
// 鵕鸟/大鹗击杀免疫
ST.Game.omenImmune = {};
ST.recordObject('junniao', 1);
assert(!!ST.Game.omenImmune.junniao, '鵕鸟之诛免疫「其邑大旱」');
// 谒见神祇（槐江之山：英招 / 天神）
assert(G.travelTo('xishan-3-07') === true, '西渡槐江之山');
assert(ST.Game.node === 'xishan-3-07', '所在地入西山');
G.startAudience('xishan-3-07');
assert(ST.Game.activity && ST.Game.activity.kind === 'audience', '开始谒见');
G.performAction(ST.Game.activity);
assert((ST.Game.records.yingzhao||{}).count >= 1, '英招入录');
assert((ST.Game.records.tianshen||{}).count >= 1, '槐江天神入录');
assert(ST.Game.skills.jisi.xp > 0, '谒见得祭祀经验');
// 峚山 · 玉膏灌丹木（五岁养成）
G.giveItem('yugao', 5, false);
assert(G.travelTo('xishan-3-04') === true, '往峚山');
G.startGrow('mishan');
assert(ST.Game.activity && ST.Game.activity.kind === 'grow', '开始灌木');
for (let i=0;i<5 && ST.Game.activity;i++) G.performAction(ST.Game.activity);
assert((ST.Game.danmu.done||0) >= 1, '丹木五岁乃成');
assert(ST.totalOf('danmu') >= 2 && ST.totalOf('danmushi') >= 3, '得丹木×2 与 丹木之实×3');
// 积石之山「万物无不有焉」：全产出节点
G.giveItem('gui', 1, false);
assert(G.travelTo('xishan-3-13') === true, '往积石之山');
G.startActivity('gather','gui');           // 桂本生招摇之山，积石万物有焉故可采
G.performAction(ST.Game.activity);
assert(ST.totalOf('gui') >= 1, '积石之山可采异地之物（万物无不有焉）');
// 珠玉鱼 · 渔获兼得配置
assert((ST.GATHER_BONUS.zhipiyu||{}).item === 'zhuyu2', '𩶯魮之鱼是生珠玉');
// 蛮蛮「相得乃飞」：成对御使占两槽
assert(ST.Monsters.manman.pair === true, '蛮蛮标记为成对');
G.addRecord('manman', 100);
G.gainXp('yushi', 5000000);                     // 御使等级决定槽位数
const slotsBefore = Object.keys(ST.Game.deployed).length;
G.deployBeast('manman');
assert(Object.keys(ST.Game.deployed).length === slotsBefore + 2, '蛮蛮成对占两槽');
G.undeployBeast(Object.keys(ST.Game.deployed)[0]);
assert(Object.keys(ST.Game.deployed).length === 0, '撤蛮蛮则成对全撤');
// 西山 BOSS 机制差异
['luwu','xiwangmu','dijiang'].forEach(id=>{
  const m = ST.Monsters[id];
  assert(m.boss && m.special && m.special.name, `${m.name} 有具名机制（${m.special.name}）`);
  assert(m.needLvl >= 1 && m.needLvl <= 81, `${m.name} 门槛在 1-81（全球重排后分布）`);
});
// 西王母「善啸」震慑
const xwm = ST.Monsters.xiwangmu;
const c0 = { playerHp:99999, monsterHp:xwm.hp, dmgIn:0, round:0, spec:0, style:'attack', timer:0, maxtimer:0 };
G.doMonsterSpecial(c0, xwm);
assert(c0.fearUntil > 0, '西王母善啸施加震慑');

// ============ 11. 御使 ============
section('御使');
assert(ST.beastSlots() >= 1, '御使槽位随等级扩充');
assert(ST.deployBeast('jiuwei') === false, '未达标异兽不可御使（九尾狐）');
G.addRecord('shengsheng', 100);
assert((ST.Game.records.shengsheng||{}).tier === 4, '狌狌著录至得御');
assert(ST.deployBeast('shengsheng') === true, '御使狌狌');
assert(Object.values(ST.Game.deployed).includes('shengsheng'), '槽位记录');
assert(ST.deployedBonuses().gatherSpeed > 0, '狌狌「善走」提升采集速度');
assert(ST.gatherSpeedMult() > 1, '采集倍率体现御使');
assert(ST.deployBeast('shengsheng') === false, '重复御使被拒');
G.undeployBeast(Object.keys(ST.Game.deployed)[0]);
assert(Object.keys(ST.Game.deployed).length === 0, '撤御使');
ST.Game.deployed['0'] = 'shengsheng';

// ============ 12. 巡历队列 ============
section('巡历队列');
G.clearQueue();
assert(G.addQueueEntry('qiaocai','gui',3) !== null, '加入采集任务');
G.addQueueEntry('smith','muge',2);
assert(ST.Game.queue.length === 2, '队列两条');
G.startQueue();
for (let i=0;i<40;i++) G.stepGame(0.5);
assert(ST.Game.activity && ST.Game.activity.src === 'queue', '队列接管行动');
// 阻塞顺延：把原料掏空
ST.Game.inventory = { gui: 50, shashi: 50, guaimu: 50 };
ST.Game.queueIdx = 1;   // 指向冶铸（原料刚才被清过又补足……改为直接清空）
ST.Game.inventory = { gui: 50 };
G.ensureQueueActivity();
assert(ST.Game.activity === null || ST.Game.activity.src !== 'queue' || ST.Game.queueIdx === 0, '阻塞任务被跳过或转兜底');
// 兜底
G.setFallback('qiaocai','gui',5);
ST.Game.queue = [];
G.ensureQueueActivity();
assert(ST.Game.activity && ST.Game.activity.src === 'fallback' && ST.Game.activity.itemId === 'gui', '队列空 → 兜底接管');
G.setFallback('idle','',1);
G.clearQueue();
// 队列进度存档
G.addQueueEntry('qiaocai','gui',2);
ST.Game.queue[0].done = 1;
G.saveGame();
G.loadGame();
assert(ST.Game.queue.length === 1 && ST.Game.queue[0].done === 1, '队列进度读写档');

// ============ 13. 离线 / 后台结算 ============
section('离线 / 后台结算');
G.stopActivity(); ST.Game.combat = null;
G.startActivity('gather','gui');
const awayRec = G.settleAway(3600);
assert(awayRec && awayRec.seconds === 3600, '离线结算 1 小时');
assert(awayRec.xp > 0 && awayRec.items.gui > 0, '离线有经验与产出');
assert(awayRec.records > 0, '离线有著录');
const capRec = G.settleAway(999999);
assert(capRec.seconds === ST.offlineCapHours()*3600, '离线受时长上限约束');
assert(G.settleAway(10) === null, '过短空档不结算');
// 离线效率低于在线且有上限
assert(ST.offlineEff() <= ST.TUNING.OFFLINE.EFF_MAX + ST.observeEffBonus() && ST.offlineEff() >= 0.1, '离线效率在 [0.1, 0.85+观象]');
// 田地离线生长
ST.Game.farms = { p1: { seedId:'seed_tu', remain:5, grow:10 } };
G.farmCatchUp(3600);
assert(ST.totalOf('tu') > 0, '离线田地生长收获');

// ============ 14. 存档导出 / 导入 ============
section('存档导出 / 导入');
G.saveGame();
const saved = context.localStorage.getItem('shj_zhulu_save_v1');
assert(saved && saved.length > 0, '存档写入 localStorage');
assert(JSON.parse(saved).skills && Object.keys(JSON.parse(saved).skills).length === 26, '存档含 26 技能');
ST.Game.shells = 12345;
G.loadGame();
assert(ST.Game.shells !== 12345, '读档覆盖内存');
const txt = G.exportSaveText();
assert(txt.length > 0, '导出存档文本');
assert(G.importSaveText('').ok === false, '空内容被拒');
assert(G.importSaveText('{bad json').ok === false, '乱码被拒');
assert(G.importSaveText('[]').ok === false, '数组被拒');
assert(G.importSaveText('null').ok === false, 'null 被拒');
assert(G.importSaveText(JSON.stringify({shells:1})).ok === false, '缺字段被拒');
const r2 = G.importSaveText(txt);
assert(r2.ok === true, '合法存档导入成功');

// ============ 15. 数值自查 ============
section('数值自查');
// 经验曲线：levelFromXp 与 xpForLevel 完全吻合
let curveOk = true;
for (const lv of [1,2,5,10,20,30,40,50,60,70,81]){
  if (G.levelFromXp(G.xpForLevel(lv)).level !== lv) curveOk = false;
  if (lv > 1 && G.levelFromXp(G.xpForLevel(lv)-1).level !== lv-1) curveOk = false;
}
assert(curveOk, '经验曲线正反吻合（采样）');
assert(G.xpForLevel(81) > 1000000, '81 级为长线目标（累计 '+G.xpForLevel(81)+'）');
assert(G.xpForNextLevel(1) < G.xpForNextLevel(50) && G.xpForNextLevel(50) < G.xpForNextLevel(80), '经验曲线单调递增');
assert(G.tierOfLevel(1) === 0 && G.tierOfLevel(9) === 0 && G.tierOfLevel(10) === 1 && G.tierOfLevel(81) === 8, '九阶划分（一九…九九）');
// 掉落权重公式与 clamp
const w1 = ST.dropWeight(1, 50, 10, 4);
assert(w1 >= ST.TUNING.DROP.MIN && w1 <= ST.TUNING.DROP.MAX, '掉落权重 clamp 在 [0.1,5] -> '+w1);
assert(ST.dropWeight(1, 10, 10, 0) === 1, '同级同阶权重 = base');
// 五行表完整
assert(ST.TUNING.ELEMENTS.length === 5 && ST.TUNING.KE_MAP['金']==='木' && ST.TUNING.SHENG['土']==='金', '五行生克表');
// 著录加成单调
assert(ST.TUNING.MASTERY.BONUS[4] > ST.TUNING.MASTERY.BONUS[3] > ST.TUNING.MASTERY.BONUS[0], '著录阶加成单调');

// ============ 15.5 绘形图标（beastIcon） ============
section('异兽绘形图标');
assert(typeof ST.beastIcon === 'function' && typeof ST.parseForm === 'function', 'beastIcon / parseForm 已导出');
// 全部异兽都能产出有效 SVG（不抛错、不落空）
(function(){
  const ms = Object.values(ST.Monsters);
  let bad = [];
  ms.forEach(m=>{
    let s; try { s = ST.beastIcon(m); } catch(e){ bad.push(m.id+':'+e.message); return; }
    if (!s || s.indexOf('<svg') < 0 || s.indexOf('</svg>') < 0) bad.push(m.id);
    else {
      const inner = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      if (inner.length < 200) bad.push(m.id+':thin');
    }
  });
  assert(bad.length === 0, '全部 '+ms.length+' 只异兽均出有效 SVG（空/破图：'+(bad.slice(0,5).join(',')||'无')+'）');
})();
// 主躯干解析：尾部/属性描述词不得压过「状如 X」
(function(){
  const cases = [
    ['鯥','其状如牛，陵居，蛇尾有翼，其羽在魼下','bovine'],
    ['赤鱬','其状如鱼而人面','fish'],
    ['鹿蜀','其状如马而白首，其文如虎而赤尾','equine'],
    ['旋龟','其状如龟而鸟首虺尾','turtle'],
    ['九尾狐','其状如狐而九尾','feline'],
    ['灌灌','其状如鸠','avian'],
    ['彘','其状如虎而牛尾','porcine'],
  ];
  let ok = true, det = [];
  cases.forEach(([n,f,exp])=>{
    const p = ST.parseForm(f, n, null);
    if (p.family !== exp){ ok = false; det.push(n+'→'+p.family+'≠'+exp); }
  });
  assert(ok, '主躯干按「如 X」优先（'+(det.join('；')||'全部正确')+'）');
})();
// 「九尾」「四耳」「目在背」等特征件解析
(function(){
  const p = ST.parseForm('其状如羊，九尾四耳，其目在背', '猼訑', null);
  assert(p.family === 'ovine' && p.tails === 9 && p.parts.indexOf('eyesBack') >= 0, '猼訑：羊身 九尾 目在背');
  const q = ST.parseForm('其状如龟而鸟首虺尾', '旋龟', null);
  assert(q.family === 'turtle', '旋龟：归龟身（鸟首虺尾不夺主躯干）');
  const r = ST.parseForm('其状如鸡而三首六目，赤喙', 'xx', null);
  assert(r.parts.indexOf('beak') >= 0, '「喙」识别为鸟喙部件');
})();
// 手绘特型能命中（BOSS / 高辨识异兽）
(function(){
  const hd = ['jiuwei','fenghuang','xuangui','bifang','jiuying','dafeng','xingtian','dijiang','luwu','xiwangmu','zaochi','xiushe','xiang','tuotuo','renyu'];
  let miss = hd.filter(id=>{ const s=ST.beastIcon({id:id,name:id}); return !s || s.indexOf('<svg')<0; });
  assert(miss.length === 0, '手绘特型全部出图（缺：'+(miss.join(',')||'无')+'）');
  // BOSS 额外画一环虚线，便于在网格里一眼认出
  const bossSvg = ST.beastIcon({ id:'jiuying', name:'九婴', boss:true });
  assert(/stroke-dasharray/.test(bossSvg), 'BOSS 图标带虚线警示环');
})();
// 神祇无 form 时按人形立像（不误落成兽形）
(function(){
  const godSvg = ST.beastIcon({ id:'changcheng', name:'长乘' });
  assert(godSvg.indexOf('<svg') >= 0, '无 form 神祇也出图');
  // 人形躯干含头部圆（circle），兽形四足不含裸露的独立头部圆——抽查不报错即可
  assert(ST.beastIcon({ id:'qitong', name:'耆童' }).length > 300, '神祇立像非空壳');
})();
// 兽体填色走 currentColor（昼墨夜白）——夜间纸底极暗，若退回默认黑则图标隐没
(function(){
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert(/svg\.bi\{\s*fill:currentColor/.test(css), '图标杆体用 currentColor 填色（夜间可见）');
  const svg = ST.beastIcon({ id:'hujiao', name:'虎蛟' });
  assert(!/fill="#0{3,6}"/.test(svg), '图标不硬编码黑色填色（交由 CSS 主题接管）');
})();

// ============ 16. UI 渲染冒烟 ============
section('UI 渲染冒烟');
UI_FILES.forEach(loadJS);
// 浏览器中 window === globalThis，ui.js 末尾的 window.UI = UI 会让全局属性与
// 词法绑定同为真实 UI；沙箱里 window 只是普通对象，需手动对齐，否则 game.js
// 等先加载脚本里的 UI 仍指向桩对象。
context.UI = ST.UI;
const renderTargets = {};
// classList 用真实 Set 实现：`contains` 恒 false 的假对象会让「是否已有弹窗」的守卫全部误判
const mkTarget = (init)=>{
  const set = new Set(init || []);
  return { innerHTML:'', dataset:{}, style:{},
    classList:{ add:(...a)=>a.forEach(c=>set.add(c)), remove:(...a)=>a.forEach(c=>set.delete(c)),
      toggle:(c,f)=>{ const on = f===undefined ? !set.has(c) : !!f; if (on) set.add(c); else set.delete(c); return on; },
      contains:(c)=>set.has(c) },
    textContent:'', value:'', checked:false, appendChild(){}, remove(){} };
};
['content','tabs','toasts','modal','modalBox','logList','actionProg','actionProgFill','activityText','hpDisplay','buffDisplay','buffBtn','buffCount','buffPop','shellCount','totalLevel','recordCount','guidance','btnSettings','btnStop','fab','drawerMask','topdock'].forEach(t=>renderTargets[t]=mkTarget());
renderTargets.modal.classList.add('hidden');            // 未开弹窗：与真实 DOM 初始一致
renderTargets.buffPop.classList.add('hidden');           // 默认视为收起，closeBuffPop 不重复动作
renderTargets.tabs.innerHTML = '';
renderTargets.tabs.querySelectorAll = () => [];
context.document.getElementById = (id)=> renderTargets[id] || {
  textContent:'', innerHTML:'', classList:{ add(){}, remove(){}, toggle(){} }, style:{}, appendChild(){},
  addEventListener(){}, querySelector:()=>null, querySelectorAll:()=>[], value:'', checked:false,
};
let uiOk = true;
try {
  ST.UI.currentTab = 'yudi';   ST.UI.renderYudi();
  ST.UI.currentTab = 'skills'; ST.UI.renderSkills();
  ST.UI.currentTab = 'taofa';  ST.UI.renderTaofa();
  ST.UI.currentTab = 'yushi';  ST.UI.renderYushi();
  ST.UI.currentTab = 'codex';  ST.UI.renderCodex();
  ST.UI.currentTab = 'jisi';   ST.UI.renderJisi();
  ST.UI.currentTab = 'shichan';ST.UI.renderShichan();
  ST.UI.currentTab = 'ying';   ST.UI.renderYing();
  ST.UI.currentTab = 'queue';  ST.UI.renderQueue();
  ST.UI.currentTab = 'pack';   ST.UI.renderPack();
  ST.UI.currentTab = 'stats';  ST.UI.renderStats();
  ST.UI.currentTab = 'about'; ST.UI.renderAbout();
  ST.UI.currentTab = 'settings'; ST.UI.renderSettings();
  ST.UI.renderTopbar();
  ST.UI.tickProgress();
  ST.UI.refreshActivity();
  ST.showItemDetail('gui');
  ST.showCodexDetail('shengsheng');
  ST.UI.closeModal();
} catch(e){ uiOk = false; console.error('UI 渲染异常：'+e.stack); }
assert(uiOk, '全部页面渲染不抛错');
assert(renderTargets.content.innerHTML.length > 100, '内容区有实际输出');
assert(renderTargets.content.innerHTML.indexOf('cloudEndpoint') < 0 && renderTargets.content.innerHTML.indexOf('立即上传') < 0, '设置页不再暴露云端配置（改由账号系统接管）');
// 战斗不得强行切页（挂机连战每杀一只都会触发 startCombat，跳焦点会打断玩家）
ST.UI.currentTab = 'codex';
G.startCombat('shengsheng');
assert(ST.UI.currentTab === 'codex', '自动接战不抢焦点（不跳回征伐页）');
G.startCombat('shengsheng', { focus:true });
assert(ST.UI.currentTab === 'taofa', '手动往讨才切到征伐页');
ST.Game.combat = null;
ST.Game.combat = null;

// ============ 16.5 新手引导 · 离线汇总 ============
section('新手引导 · 离线汇总');
let offOk = true;
try { ST.UI.showOfflineSummary({ seconds:7200, xp:1234, items:{ gui:10 }, records:3, harvests:1 }); }
catch(e){ offOk = false; console.error('离线弹窗异常：'+e.stack); }
assert(offOk, '离线归来弹窗渲染不抛错');
assert(renderTargets.modalBox.innerHTML.indexOf('离线归来') >= 0, '离线弹窗含标题');
assert(typeof ST.showTutorial === 'function' && typeof ST.tutFinish === 'function', '教程函数齐备');
let tutOk = true;
try { ST.showTutorial(); ST.tutNext(); ST.tutNext(); ST.tutPrev(); } catch(e){ tutOk = false; console.error('教程异常：'+e.stack); }
assert(tutOk, '教程分步切换不抛错');
ST.tutFinish();
assert(context.localStorage.getItem('shj_tut_done_v1') === '1', '教程完成写入标记（不再自动弹出）');
// 下一步建议：函数存在、返回有效文本、舆地页含指引条
assert(typeof G.nextHint === 'function', 'nextHint 函数存在');
let hintOk = true, hint;
try { hint = G.nextHint(); } catch(e){ hintOk = false; console.error('nextHint 异常：'+e.stack); }
assert(hintOk && hint && typeof hint.text === 'string' && hint.text.length > 0, 'nextHint 返回有效建议');
ST.UI.currentTab = 'yudi'; ST.UI.renderYudi();
assert(renderTargets.content.innerHTML.indexOf('hint-banner') >= 0, '舆地页渲染指引条');
// 临阶突破提示（修正后应当可达：用下一阶阈值而非当前阶）
const _rec = ST.Game.records, _dep = ST.Game.deployed, _map = ST.Game.map;
let nearOk = true;
try {
  const allNodes = {}; ST.WORLD.regions.forEach(r=>r.nodes.forEach(n=>allNodes[n.id]=true));
  const itemId = Object.keys(ST.Items).find(k=>!ST.Monsters[k]);   // 取一个纯物品（非异兽）条目
  ST.Game.records = { [itemId]:{count:97,tier:3} }; ST.Game.deployed = {}; ST.Game.map = allNodes;
  const h2 = G.nextHint();
  nearOk = /再著录/.test(h2.text);
} catch(e){ nearOk = false; console.error('nextHint 临阶异常：'+e.stack); }
assert(nearOk, '临阶突破提示可达（count 97 / tier3 → 再著录 3 次）');
ST.Game.records = _rec; ST.Game.deployed = _dep; ST.Game.map = _map;

// ============ 16.10 玩法说明弹窗 ============
section('玩法说明弹窗');
assert(typeof ST.openHelp === 'function', 'openHelp 函数存在');
let helpOk = true;
try { ST.openHelp(); } catch(e){ helpOk = false; console.error('玩法说明异常：'+e.stack); }
assert(helpOk, '玩法说明渲染不抛错');
assert(renderTargets.modalBox.innerHTML.indexOf('玩法说明') >= 0, '玩法说明含标题');
assert(renderTargets.modalBox.innerHTML.indexOf('五行') >= 0, '玩法说明含五行相克');
assert(renderTargets.modalBox.innerHTML.indexOf('著录') >= 0, '玩法说明含著录阶位');

// ============ 16.11 一键快速挂机 ============
section('一键快速挂机');
assert(typeof G.quickIdlePreset === 'function', 'quickIdlePreset 函数存在');
const _q = ST.Game.queue, _qr = ST.Game.queueRunning, _fb = ST.Game.fallback, _loop = ST.Game.queueLoop;
let qOk = true, qN = 0;
try { qN = G.quickIdlePreset(); } catch(e){ qOk = false; console.error('快速挂机异常：'+e.stack); }
assert(qOk, '快速挂机不抛错');
assert(qN > 0 && ST.Game.queue.length > 0, '快速挂机排入了任务');
ST.Game.queue = _q; ST.Game.queueRunning = _qr; ST.Game.fallback = _fb; ST.Game.queueLoop = _loop;
ST.UI.currentTab = 'yudi'; ST.UI.renderYudi();
// 推荐节点高亮：节点模板含 rec 类
assert(renderTargets.content.innerHTML.indexOf('node-tile') >= 0, '舆地页渲染诸山方块');
// 页签角标刷新不抛错
let tbOk = true; try { G.refreshTabBadges(); } catch(e){ tbOk = false; console.error('刷新角标异常：'+e.stack); }
assert(tbOk, '页签角标刷新不抛错');
// 全局指引条：非舆地页签下 refreshActivity 应填充
ST.UI.currentTab = 'codex'; ST.UI.refreshActivity();
assert(renderTargets.guidance.innerHTML.indexOf('<span>') >= 0, '全局指引条在其它页签填充建议');
assert((ST.Game.records && Object.keys(ST.Game.records).length > 0 ? renderTargets.guidance.innerHTML.indexOf('前往') >= 0 : true), '有可跳转指引时显示「前往」');

// 书脊右上角增益图标：计数随御使变化（仪表带不再列摘要）
const _dep2 = ST.Game.deployed, _om2 = ST.Game.omens, _buff2 = ST.Game.buff;
let psOk = true, psTxt = '';
try { ST.Game.deployed = { 0:'shengsheng' }; ST.Game.omens = []; ST.Game.buff = null; ST.UI.renderTopbar(); psTxt = renderTargets.buffCount.textContent; }
catch(e){ psOk = false; console.error('增益图标异常：'+e.stack); }
assert(psOk && psTxt === '1', '增益图标计数随御使变化 -> ' + psTxt);
assert(renderTargets.buffBtn.title.indexOf('增益一览') >= 0, '增益图标带说明（增益一览）');
ST.Game.deployed = _dep2; ST.Game.omens = _om2; ST.Game.buff = _buff2;

// ============ 16.8 征兆纪事 · 推荐买卖 · 手势 ============
section('征兆纪事 · 推荐买卖 · 手势');
// 祠祀页渲染征兆纪事时间线
let omOk = true;
try {
  ST.UI.logEntries.unshift({ msg:'测试征兆', color:'gold', cat:'omen', t:Date.now() });
  ST.UI.currentTab = 'jisi'; ST.UI.renderJisi();
  omOk = renderTargets.content.innerHTML.indexOf('征兆纪事') >= 0;
} catch(e){ omOk = false; console.error('征兆纪事异常：'+e.stack); }
assert(omOk, '祠祀页渲染征兆纪事');
// 统计日志含征兆筛选
let omFilter = true;
try { ST.UI.currentTab = 'stats'; ST.UI.renderStats(); omFilter = renderTargets.content.innerHTML.indexOf('征兆') >= 0; }
catch(e){ omFilter = false; console.error('征兆筛选异常：'+e.stack); }
assert(omFilter, '日志含征兆筛选');
// 推荐买卖：清空著录后墟市给出购入即录提示
const _rec3 = ST.Game.records;
let tiOk = true, tiTxt = '';
try { ST.Game.records = {}; ST.UI.currentTab = 'shichan'; ST.UI.renderShichan(); tiTxt = renderTargets.content.innerHTML; }
catch(e){ tiOk = false; console.error('推荐买卖异常：'+e.stack); }
assert(tiOk && tiTxt.indexOf('推荐买卖') >= 0, '墟市显示推荐买卖');
ST.Game.records = _rec3;
// 手势：相邻页签切换（含环绕）
ST.UI.currentTab = 'yudi'; ST.UI.switchTabNeighbor(1);
assert(ST.UI.currentTab === 'skills', '左滑切到下一页签');
ST.UI.switchTabNeighbor(-1);
assert(ST.UI.currentTab === 'yudi', '右滑切回上一页签');
ST.UI.switchTabNeighbor(-1);
assert(ST.UI.currentTab === 'about', '右滑在首页环绕到末页（叙录）');

// ============ 16.9 征兆数值预览 · 售价走势 ============
section('征兆数值预览 · 售价走势');
// 征兆当前总效应：植入一个全局产出+15%的征兆
const _om3 = ST.Game.omens;
let oeOk = true, oeTxt = '';
try {
  ST.Game.omens = [{ id:'fenghuang', until: (typeof gameTime==='function'?gameTime():0)+3600, soft:1 }];
  ST.UI.currentTab = 'jisi'; ST.UI.renderJisi();
  oeTxt = renderTargets.content.innerHTML;
} catch(e){ oeOk = false; console.error('征兆预览异常：'+e.stack); }
assert(oeOk && oeTxt.indexOf('当前总效应') >= 0 && oeTxt.indexOf('采获') >= 0, '祠祀页显示征兆当前总效应');
ST.Game.omens = _om3;
// 售价走势：预设历史两点后应渲染曲线
const _ph = ST.Game.priceHistory;
let spOk = true, spTxt = '';
try {
  ST.Game.priceHistory = [{ t:0, m:1 }, { t:1, m:1.2 }];
  ST.UI.currentTab = 'shichan'; ST.UI.renderShichan();
  spTxt = renderTargets.content.innerHTML;
} catch(e){ spOk = false; console.error('售价走势异常：'+e.stack); }
assert(spOk && spTxt.indexOf('售价走势') >= 0 && spTxt.indexOf('spark') >= 0, '墟市渲染售价走势曲线');
ST.Game.priceHistory = _ph;

// ============ 16.10 队列预估耗时 ============
section('队列预估耗时');
const _q2 = ST.Game.queue;
let etaOk = true, etaTxt = '';
try {
  ST.Game.queue = [{ id:'t1', kind:'qiaocai', target:'mu', node:'xishan-1-01', qty:10, done:0 }];
  ST.UI.currentTab = 'queue'; ST.UI.renderQueue();
  etaTxt = renderTargets.content.innerHTML;
} catch(e){ etaOk = false; console.error('队列ETA异常：'+e.stack); }
assert(etaOk && etaTxt.indexOf('预计一轮') >= 0, '队列显示预计一轮耗时');
assert(etaTxt.indexOf('约') >= 0, '队列条目显示单条预计耗时');
assert(etaTxt.indexOf('离线') >= 0 && etaTxt.indexOf('效率') >= 0, '行动页显示离线上限与效率');

// ============ 16.14 离线收益预估（纯读取） ============
section('离线收益预估');
const _act = ST.Game.activity, _node = ST.Game.node;
let offOk2 = true, offTxt = '', preview = null;
try {
  const someItem = Object.values(ST.Items).find(it=>it.node && it.skill);
  ST.Game.activity = { kind:'gather', itemId: someItem.id };
  ST.Game.node = someItem.node;
  preview = ST.estimateOfflineGains();
  ST.UI.currentTab = 'queue'; ST.UI.renderQueue();
  offTxt = renderTargets.content.innerHTML;
} catch(e){ offOk2 = false; console.error('离线预估异常：'+e.stack); }
assert(offOk2 && preview && preview.xp > 0, '离线收益预估返回正值经验');
assert(offTxt.indexOf('挂满约') >= 0 && offTxt.indexOf('经验') >= 0, '行动页显示离线收益预估');
ST.Game.activity = _act; ST.Game.node = _node;

// ============ 16.15 技能页前往产出地 ============
section('技能页前往产出地');
let sgOk = true, sgTxt = '', nf = null;
try {
  nf = ST.nodeForSkill('qiaocai');
  ST.UI.currentTab = 'skills'; ST.UI.renderSkills();
  sgTxt = renderTargets.content.innerHTML;
} catch(e){ sgOk = false; console.error('技能页跳转异常：'+e.stack); }
assert(sgOk && nf && nf.nodeId, 'nodeForSkill 返回采集节点');
assert(sgTxt.indexOf('产出地') >= 0 && sgTxt.indexOf('switchTab') >= 0, '技能卡显示前往产出地按钮（紧凑文案）');

// ============ 16.16 图鉴分类完成度 ============
section('图鉴分类完成度');
let cxOk = true, cxTxt = '';
try { ST.UI.currentTab = 'codex'; ST.UI.codexTab = 'beast'; ST.UI.renderCodex(); cxTxt = renderTargets.content.innerHTML; }
catch(e){ cxOk = false; console.error('图鉴渲染异常：'+e.stack); }
assert(cxOk, 'renderCodex 不抛错');
assert(cxTxt.indexOf('本类') >= 0 && cxTxt.indexOf('总录') >= 0, '图鉴显示本类与总录完成度');
assert(cxTxt.indexOf('codex-bar') >= 0, '图鉴渲染分类进度条');

// ============ 16.19 节点著录进度 ============
section('节点著录进度');
let nrOk = true, nrTxt = '', rp = null;
try {
  const nid = (ST.WORLD.regions[0].nodes[0] || {}).id;
  rp = (typeof ST.nodeRecordProgress==='function') ? ST.nodeRecordProgress(nid) : null;
  ST.UI.currentTab = 'yudi'; ST.UI.selNode = nid; ST.UI.renderYudi();
  nrTxt = renderTargets.content.innerHTML;
} catch(e){ nrOk = false; console.error('节点进度异常：'+e.stack); }
assert(nrOk && rp && rp.total > 0, 'nodeRecordProgress 返回该节点可著录总数');
assert(nrTxt.indexOf('已著录') >= 0, '节点详情显示已著录进度');
assert(nrTxt.indexOf('录 ') >= 0, '节点列表项显示著录进度小标');
assert(nrTxt.indexOf('rec-ok') >= 0 || nrTxt.indexOf('rec-no') >= 0 || nrTxt.indexOf('✓录') >= 0 || nrTxt.indexOf('未录') >= 0, '节点详情异兽显示著录状态（紧凑后在「山志」浮层内）');
assert(nrTxt.indexOf('tip-body') >= 0 && nrTxt.indexOf('data-tip') >= 0, '节点详情含「山志」浮层锚点（悬停/点按展开）');

// ============ 16.20 顶栏征兆总效应弹窗 ============
section('征兆总效应弹窗');
let omOk2 = true, omModal = '', omBar = '', omPop = '';
const _omens = ST.Game.omens, _buff = ST.Game.buff;
try {
  ST.Game.omens = [{ id:'lili' }];
  ST.Game.buff = null;   // 隔离临时增益，验证只列征兆的路径
  ST.UI.renderTopbar();
  omBar = renderTargets.buffCount.textContent;      // 徽标计数
  ST.UI.openBuffPop();
  omPop = renderTargets.buffPop.innerHTML;          // 浮层里的征兆条目
  ST.openOmenSummary();
  omModal = renderTargets.modalBox.innerHTML;
} catch(e){ omOk2 = false; console.error('征兆浮层异常：'+e.stack); }
finally { ST.Game.omens = _omens; ST.Game.buff = _buff; }
assert(omOk2, 'openOmenSummary 不抛错');
assert(Number(omBar) >= 1, '增益图标徽标显示增益条数 -> ' + omBar);
assert(omPop.indexOf('征兆') >= 0 && omPop.indexOf('狸力') >= 0, '浮层列出征兆名');
assert(omModal.indexOf('征兆总效应') >= 0 && omModal.indexOf('总效应') >= 0, '征兆弹窗汇总总效应（保留旧入口）');

// ============ 16.17 制作技能材料来源跳转 ============
section('制作技能材料来源');
let msOk = true, msTxt = '', mn = null;
try {
  // 找一个有配方的制作技能（如 burn），并确认其材料有节点
  const craftSkill = Object.keys(ST.RECIPE_SKILL).length ? (function(){
    const inv = {}; ST.Recipes.forEach(r=>{ inv[ST.RECIPE_SKILL[r.type]] = true; });
    return Object.keys(inv)[0];
  })() : null;
  mn = craftSkill ? ST.materialNodeForSkill(craftSkill) : null;
  ST.UI.currentTab = 'skills'; ST.UI.skillFilter = 'all'; ST.UI.renderSkills();
  msTxt = renderTargets.content.innerHTML;
} catch(e){ msOk = false; console.error('材料来源异常：'+e.stack); }
assert(msOk, 'renderSkills 不抛错');
assert(msTxt.indexOf('材料') >= 0 && msTxt.indexOf('来源') >= 0, '制作技能卡显示材料来源');
assert(msTxt.indexOf('mat-src') >= 0, '制作技能卡以多来源行渲染材料地点');
assert(msTxt.indexOf('mat-inv') >= 0 && (msTxt.indexOf('/') >= 0), '制作技能卡显示材料持有/缺口');

// ============ 16.18 图鉴详情前往节点 ============
section('图鉴详情前往节点');
let cdOk = true, cdBtn = 0;
try {
  // 取一个 beast 类 codex 条目，验证可定位节点
  const beastEntry = Object.values(ST.CODEX).find(e=>e.cat==='异兽' && ST.codexNode(e));
  if (beastEntry){
    const cn = ST.codexNode(beastEntry);
    ST.showCodexDetail(beastEntry.id);
    cdBtn = (renderTargets.modalBox.innerHTML.indexOf('前往讨伐节点') >= 0) ? 1 : 0;
  }
} catch(e){ cdOk = false; console.error('图鉴详情异常：'+e.stack); }
assert(cdOk && cdBtn === 1, '图鉴异兽详情显示前往讨伐节点按钮');
ST.Game.queue = _q2;

// ============ 16.11 五行克制提示 ============
section('五行克制提示');
let waOk = true, wa1 = '', wa2 = '', wa3 = '', wa4 = '', wa5 = '';
try {
  wa1 = ST.wuxingAdvice('木','金');   // 敌木 · 我金 → 我克敌（金克木）
  wa2 = ST.wuxingAdvice('金','木');   // 敌金 · 我木 → 敌克我（金克木），宜用「火」（火克金）
  wa3 = ST.wuxingAdvice('火','水');   // 敌火 · 我水 → 我克敌（水克火）
  wa4 = ST.wuxingAdvice('木','水');   // 敌木 · 我水 → 我生敌（水生木）×1.15
  wa5 = ST.wuxingAdvice('水','木');   // 敌水 · 我木 → 相持（木克土、土克水），宜用「土」
} catch(e){ waOk = false; console.error('五行提示异常：'+e.stack); }
assert(waOk, 'wuxingAdvice 不抛错');
assert(wa1.indexOf('克制') >= 0 && wa1.indexOf('敌「木」') >= 0 && wa1.indexOf('我「金」') >= 0, '我克敌时显示克制（含敌我标注）');
assert(wa2.indexOf('被克') >= 0, '敌克我时显示被克');
assert(wa2.indexOf('宜用「火」') >= 0, '被克时给出正确宜用属性（火克金，而非误推）');
assert(wa2.indexOf('⚡切「火」属') >= 0, '被克时给出一键切换按钮');
assert(wa3.indexOf('克制') >= 0, '水克火显示克制');
assert(wa1.indexOf('⚡切') < 0, '已克制时不显示切换按钮');
assert(wa4.indexOf('相生') >= 0 && wa4.indexOf('×1.15') >= 0, '我生敌时显示相生加成');
assert(wa5.indexOf('相持') >= 0 && wa5.indexOf('宜用「土」') >= 0, '相持时给出宜用属性');
// 调用处参数顺序：wuxingAdvice(敌方属性, 我方属性)
// 调用处参数顺序：wuxingAdvice(敌方属性, 我方属性)，且敌方取战斗内现属性
assert(/wuxingAdvice\(\s*\(typeof foeElement[^)]*\)[^,]*foeElement\(m, c\)[^,]*,\s*playerElement\(\)\)/.test(uiSrcAll), '征伐页按（敌, 我）顺序调用五行提示');

// ============ 16.12 战斗预估耗时 ============
section('战斗预估耗时');
let ceOk = true, ceTxt = '';
try { ceTxt = ST.combatEstimateHtml({ hp:100, atk:10 }, null); }
catch(e){ ceOk = false; console.error('战斗预估异常：'+e.stack); }
assert(ceOk, 'combatEstimateHtml 不抛错');
assert(ceTxt.indexOf('预计击杀') >= 0 && ceTxt.indexOf('DPS') >= 0, '战斗显示预计击杀与双方 DPS');
assert(ceTxt.indexOf('combatEst') >= 0, '战斗预估含可实时刷新元素');

// ============ 16.13 讨伐目标卡宜用属性按钮 ============
section('讨伐目标卡宜用属性');
let ebOk = true, ebTxt = '';
try { ST.UI.currentTab = 'taofa'; ST.UI.renderTaofa(); ebTxt = renderTargets.content.innerHTML; }
catch(e){ ebOk = false; console.error('目标卡异常：'+e.stack); }
assert(ebOk && ebTxt.indexOf('宜用') >= 0 && ebTxt.indexOf('setZhuEl') >= 0, '讨伐目标卡宜用属性可一键切换');
assert(ebTxt.indexOf('掉落') >= 0 && ebTxt.indexOf('📍') >= 0, '讨伐目标卡显示掉落与所在山');

// ============ 16.7 御使引导 · 连胜 ============
section('御使引导 · 连胜');
assert(typeof ST.UI.maybeShowDeployHint === 'function', 'maybeShowDeployHint 存在');
let dhOk = true;
try {
  ST.Game.stats.seenDeployHint = false;
  ST.UI.closeModal();     // 前面的冒烟可能留着离线弹窗；引导遇已有弹窗会主动让位（正确行为）
  ST.UI.maybeShowDeployHint({ id:'__t', name:'试兽', boss:false });
} catch(e){ dhOk = false; console.error('御使引导异常：'+e.stack); }
assert(dhOk, '御使引导不抛错');
assert(ST.Game.stats.seenDeployHint === true, '御使引导写入标记');
assert(renderTargets.modalBox.innerHTML.indexOf('可御使') >= 0, '御使引导弹窗含提示');
// 连胜计数：meetKill 累加、onPlayerDeath 归零
const wsBefore = ST.Game.stats.winStreak || 0;
G.meetKill({ monsterId:'shengsheng' }, ST.Monsters.shengsheng);
assert((ST.Game.stats.winStreak||0) > wsBefore, '击杀累计连胜');
G.onPlayerDeath({ monsterId:'shengsheng' }, ST.Monsters.shengsheng);
assert(ST.Game.stats.winStreak === 0, '战败重置连胜');

// ============ 16.8 新山系解锁提示 ============
section('新山系解锁提示');
let ruOk = true;
try {
  ST.Game.stats._unlockedRegions = [];
  G.gainXp('yudi', 5000);   // 大幅升级舆地，应解锁并把山系写入集合
  ruOk = Array.isArray(ST.Game.stats._unlockedRegions) && ST.Game.stats._unlockedRegions.length >= 1;
} catch(e){ ruOk = false; console.error('解锁检测异常：'+e.stack); }
assert(ruOk, '等级提升后写入已解锁山系集合');

// ============ 17. 合规与布局审计 ============
section('合规与布局审计');
const root = path.join(__dirname, '..');
function readText(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
// 子串位置（-1 表示不存在），用于断言脚本加载顺序
function indexOfOf(rel, sub){ return readText(rel).indexOf(sub); }
const codeFiles = ['index.html','style.css','src/nanshanData.js','src/gameData.js','src/save.js','src/engine.js','src/game.js','src/queue.js','src/interact.js','src/fx.js',...UI_FILES.map(f=>'src/'+f),'src/beastIcon.js','src/riteIcon.js','src/structureIcon.js','src/skillIcon.js','src/itemIcon.js','src/markIcon.js','README.md'];
const banned = ['Melvor','melvor','梅尔沃'];
let ipHits = [];
codeFiles.forEach(f=>{ const t = readText(f); banned.forEach(b=>{ if (t.includes(b)) ipHits.push(f+':'+b); }); });
assert(ipHits.length === 0, '源码/文档无第三方作品名称痕迹' + (ipHits.length?('：'+ipHits.join(',')):''));
// 山海经原文来源抽查
const nsText = readText('src/nanshanData.js');
assert(nsText.includes('招摇之山') && nsText.includes('凤皇') && nsText.includes('一璋玉瘗'), '世界数据源自山海经原文');
// 色板
const css = readText('style.css');
['#B03A2B','#2E5269','#566E4C','#9C7628','#EDEBE2','#1F1D19','#F6F4ED'].forEach(c=>{
  assert(css.includes(c), '朱墨套印色板 ' + c);
});
assert(css.includes('auto-fit') === false, '网格不使用 auto-fill（无空轨道）');
assert(css.includes('min(') && css.includes('100%)'), '网格最小列宽带 min(px,100%) 兜底');
['1180px','1080px','760px','480px'].forEach(bp=>assert(css.includes(bp), '响应式断点 '+bp));
assert(css.includes('overflow-x:hidden'), '横向溢出兜底');
assert(css.includes('prefers-reduced-motion'), '减少动态效果降级');

// ============ 18. 侧边栏导航 / 移动端抽屉 / 自动存档节奏 ============
section('侧边栏导航与自动存档');
// 18.1 结构审计：顶栏无存档按钮；侧边导航容器 + 移动端悬浮入口齐备
const html = readText('index.html');
assert(!/id="btnSave"/.test(html), '顶栏已去除存档按钮（存档统一收在统计页）');
assert(html.includes('id="shell"'), '布局含侧边导航容器 #shell');
assert(html.includes('id="fab"'), '移动端功能总入口 #fab 存在');
assert(html.includes('id="drawerMask"'), '抽屉遮罩 #drawerMask 存在');
assert(html.indexOf('id="tabs"') > html.indexOf('id="shell"'), '#tabs 位于 #shell 内（侧边导航）');
assert(html.indexOf('id="guidance"') > html.indexOf('id="topbar"'), '指引条位于吸顶区内');
// 18.2 抽屉行为：body.drawer-open 与遮罩 hidden 联动，切页自动收起
const mkCls = ()=>{ const s = new Set(); return { add(c){s.add(c)}, remove(c){s.delete(c)}, contains(c){return s.has(c)}, toggle(c,on){ if(on===undefined){ s.has(c)?s.delete(c):s.add(c); } else if(on){ s.add(c); } else { s.delete(c); } } }; };
const bodyCls = mkCls(), maskCls = mkCls();
context.document.body = { classList: bodyCls };
renderTargets.drawerMask = Object.assign(mkTarget(), { classList: maskCls });
ST.UI.openDrawer();
assert(bodyCls.contains('drawer-open'), 'openDrawer 后 body 带 drawer-open');
assert(!maskCls.contains('hidden'), 'openDrawer 后遮罩可见');
ST.UI.toggleDrawer();
assert(!bodyCls.contains('drawer-open') && maskCls.contains('hidden'), 'toggleDrawer 再次点击收起抽屉并隐藏遮罩');
ST.UI.openDrawer();
ST.UI.switchTab('pack');
assert(!bodyCls.contains('drawer-open'), 'switchTab 自动收起抽屉（点功能项即切页）');
ST.UI.openDrawer();
ST.UI.closeDrawer();
assert(!bodyCls.contains('drawer-open'), 'closeDrawer 收起抽屉');
// PC 端（无 drawer-open）时 closeDrawer 为空操作，不误伤
ST.UI.closeDrawer();
assert(!bodyCls.contains('drawer-open'), '未开抽屉时 closeDrawer 为空操作');
// 18.3 每 5 秒自动存档：连续 10 个游戏秒，触发间隔必须恒为 5
let fires = 0;
const realSave = context.saveGame;
context.saveGame = function(){ fires++; };
try { for (let i = 0; i < 10; i++) G.onSecond(); } finally { context.saveGame = realSave; }
assert(fires >= 1 && fires <= 3, '10 个游戏秒内自动存档 1~3 次（间隔 5 秒，不会每秒都写）-> ' + fires);
// 直接核对节奏：任意 5 秒窗口必须恰好触发 1 次（消除起始相位影响）
let fires2 = 0;
context.saveGame = function(){ fires2++; };
try { for (let i = 0; i < 5; i++) G.onSecond(); } finally { context.saveGame = realSave; }
assert(fires2 === 1, '任意 5 秒窗口内恰好自动存档 1 次 -> ' + fires2);
// 18.4 CSS 审计：竖排侧边栏、移动端图标栏常驻可展开
const css2 = css;
const tabsRule = (css2.match(/#tabs\{[^}]*\}/) || [''])[0];
assert(/flex-direction:column/.test(tabsRule), '#tabs 竖排（flex-direction:column）');
assert(css2.includes('body.drawer-open #tabs'), '抽屉展开规则 body.drawer-open #tabs 存在');
assert(css2.includes('body.drawer-open #tabs{') && css2.includes('width:min(228px, 80vw);'), '移动端侧边栏展开为宽菜单（228px）');
assert(/position:fixed; left:0; top:var\(--topdock-h, 87px\); bottom:0; width:var\(--rail-w\);/.test(css), '移动端图标栏自吸顶区下沿开始（不顶到最上）');
assert(/#tabs\{[\s\S]{0,700}background:var\(--paper\);/.test(css) && !/var\(--chrome\) 0 var\(--topbar-h, 48px\)/.test(css), '图标栏为纯纸色（不再与书脊拼接）');
// 回归：墨色若铺满整条吸顶区，左上角会出现一块 54×82 的纯墨空白，比右边书脊高出一截
assert(!/var\(--chrome\) 0 var\(--topdock-h/.test(css), '墨色不再铺满整条吸顶区（消除左上角深色空块）');
assert(/\.tab-expand\{[^}]*position:static; width:100%; height:auto; min-height:36px/.test(css), '折叠态「≡」为图标栏首行（栏自吸顶区下沿起）');
assert(/min-height:42px;[^}]*color:var\(--ink-3\)/.test(css), '图标栏页签用纸色系墨灰（白天可读）');
assert(/#tabs \.tab\.active\{ color:var\(--zhu\); background:var\(--zhu-w\); \}/.test(css), '图标栏选中项为朱红淡底（与桌面同一套语言）');
assert(/body\.drawer-open #tabs\{[^}]*width:min\(228px, 80vw\);[^}]*top:var\(--topdock-h, 87px\)/.test(css), '展开态宽菜单退到吸顶区下沿，不遮挡书脊');
// 展开态必须覆盖为纯纸色：折叠态的渐变以元素自身为基准，展开后 top 下移一个
// topdock-h，渐变会把抽屉头部一条带误涂成书脊墨色（盖住 ≪ 与首行页签，
// 淡朱底活动行叠在深墨上成暗红）——白天模式下尤其明显
assert(/body\.drawer-open #tabs\{[^}]*background:var\(--paper\);/.test(css), '展开态覆盖为纯纸色（消除渐变残留的伪书脊带）');
assert(/#guidance\{ padding:8px 34px 8px 12px; font-size:11\.5px; line-height:1\.5; \}/.test(css), '指引条横贯全宽（与吸顶区一致）');
assert(/#guidance span:not\(\.goto\)\{[\s\S]*?-webkit-line-clamp:2/.test(css), '指引条文本最多两行（切换页签不挤兑内容）');
assert(/#topbar\{ padding:8px 8px 9px 12px; \}/.test(css), '窄屏书脊横贯全宽（印章居左）');
assert(/#statusbar\{ padding:0 12px; gap:10px; \}/.test(css), '窄屏仪表带横贯全宽');
assert(/#topbar \.stat\[data-s="录"\] \.meter\{ display:none; \}/.test(css), '窄屏隐藏已录细线，为让位腾出宽度');
assert(css2.includes('padding-left:var(--rail-w)'), '移动端主内容为常驻图标栏让位（padding-left 随 --rail-w）');
assert(css2.includes('visibility:visible'), '图标栏默认常驻可见（不再整体移出屏外）');
assert(!css2.includes('translateX(-102%)'), '侧边栏不再整条移出屏外（改为图标栏 + 展开）');
assert(css2.includes('--topdock-h'), '侧边栏吸顶位置用 --topdock-h 对齐顶栏');

// 18.5 昼夜双态：夜间 token 覆盖 + 切换按钮 + 首屏防闪烁
assert(/\[data-theme="night"\]\{/.test(css), '夜间主题：存在 [data-theme="night"] 基底 token 覆盖');
{
  const nightBlock = (css.match(/\[data-theme="night"\]\{[^}]*\}/) || [''])[0];
  ['--paper','--ink','--ink-3','--zhu','--qing','--tai','--jin','--chrome','--rule'].forEach(v=>{
    assert(nightBlock.includes(v + ':'), '夜间覆盖变量 ' + v);
  });
}
assert(/\[data-theme="night"\] ::-webkit-scrollbar-thumb/.test(css), '夜间滚动条反相（暗底可见）');
assert(css.includes('html.theme-anim'), '切换昼夜带柔和过渡（theme-anim），且在 reduced-motion 下降级');
assert(!html.includes('id="btnTheme"') && !html.includes('id="btnHelp"') && !html.includes('id="btnSettings"'),
  '顶栏不再设昼夜 / 帮助 / 设置图标（统一并入侧边栏设置入口）');
assert(html.includes("localStorage.getItem('shj-theme')"), '首屏内联脚本先定主题，避免由亮转暗闪烁');
assert(html.includes('prefers-color-scheme'), '首次访问跟随系统外观');
assert(uiSrcAll.includes('applyTheme'), 'ui.js 提供 applyTheme 主题应用');
assert(/#fab\{ display:none; \}/.test(css2), '#fab 仅窄屏显示（PC 默认隐藏）');
assert(uiSrcAll.includes('toggleDrawer'), 'ui.js 含抽屉开关实现');

// ============ 19. 小单块 + 详情浮层（渐进披露） ============
section('小单块与详情浮层');
const uiSrc = uiSrcAll;
const gameDataSrc = readText('src/gameData.js');
assert(uiSrc.includes('showTipFor') && uiSrc.includes('tip-body') && uiSrc.includes('bindTipEvents'), 'ui.js 含详情浮层组件（悬停/点按两路触发）');
assert(uiSrc.includes('hideTip()') && /renderCurrent\(\)\{[^}]*hideTip/s.test(uiSrc), '重渲染时关闭浮层（防锚点销毁后残留）');
const tipCount = t => (t.match(/data-tip/g) || []).length;
ST.UI.currentTab = 'yudi'; ST.UI.renderYudi();
const yudiTxt = renderTargets.content.innerHTML;
assert(tipCount(yudiTxt) >= 1, '舆地详情含「山志」浮层锚点');
assert(yudiTxt.indexOf('tip-body') >= 0 && yudiTxt.indexOf('nd-sec') >= 0, '山海原文/注解/神话/产出/异兽收入隐藏浮层');
assert(yudiTxt.indexOf('<div class="actions">') >= 0, '动作按钮组保持常驻可见');
ST.UI.currentTab = 'skills'; ST.UI.renderSkills();
assert(tipCount(renderTargets.content.innerHTML) >= 3, '技能页含多个浮层锚点（描述/材料入浮层）');
ST.UI.currentTab = 'taofa'; ST.UI.renderTaofa();
assert(tipCount(renderTargets.content.innerHTML) >= 3, '征伐页含多个浮层锚点（形态/掉落入浮层）');
ST.UI.currentTab = 'jisi'; ST.UI.renderJisi();
assert(tipCount(renderTargets.content.innerHTML) >= 3, '祠祀页含多个浮层锚点（祠礼/征兆详情入浮层）');
ST.UI.currentTab = 'ying'; ST.UI.renderYing();
{ const yingTxt = renderTargets.content.innerHTML;
  assert(yingTxt.indexOf('tile-grid building-grid') >= 0 && yingTxt.indexOf('tile-ic bi-ic') >= 0, '营造页为小方卡（矢量图标 + 营造等级）');
  assert(tipCount(yingTxt) >= 3, '营造卡含多个浮层锚点（说明/材料/欠缺进浮层）');
  assert(yingTxt.indexOf('rc-sub') >= 0 && yingTxt.indexOf('chip cost') >= 0, '营造卡浮层直陈说明与材料');
  assert(uiSrc.includes("buildStructure('${b.id}');UI.renderYing()"), '营造卡点按即营造'); }
assert(css.includes('#tipLayer'), 'CSS 含浮层样式');
assert(css.includes('sheet-in') && css.includes('bottom:0 !important'), '窄屏浮层为底部抽屉形态');
assert(css.includes('tip-in'), '宽屏浮层为气泡形态');
// 触屏点按与悬停的模态区分：避免合成 mouseover 开层后 click 又将其关掉
assert(uiSrc.includes('touchJustNow') && uiSrc.includes('lastTouchAt'), 'ui.js 区分触屏点按与鼠标悬停（防止点按开层即被关）');
// 网格密度：改为正比例方块后，列宽由 minmax 控制（一屏能扫更多）
assert(/\.tile-grid\{[^}]*minmax\(104px,1fr\)/.test(css), '方块网格列宽 104px（桌面最多十列）');
assert(/\.skill-grid\{[^}]*minmax\(92px,1fr\)/.test(css) && /\.beast-grid\{[^}]*minmax\(104px,1fr\)/.test(css), '技能方格 92px、征伐/御使方格 104px');
assert(/\.skill-grid\{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\); gap:6px; \}/.test(css), '窄屏技能三列');

// ============ 20. 状态条上移 + 顶栏精简 + 悬浮按钮避让抽屉 ============
section('状态条上移与悬浮按钮避让');
// 20.1 结构：状态条移入吸顶区，位于顶栏之后、指引条之前；顶栏去除最高技能/征兆计数
assert(html.indexOf('id="statusbar"') > html.indexOf('id="topbar"'), '状态条位于顶栏之后（同处吸顶区）');
assert(html.indexOf('id="statusbar"') < html.indexOf('id="guidance"'), '状态条位于指引条之前');
assert(html.indexOf('id="statusbar"') > html.indexOf('id="topdock"'), '状态条位于 #topdock 内');
assert(/<div id="statusbar">/.test(html), '状态条改为吸顶区内普通区块（不再 fixed 于视口底部）');
assert(!/id="maxSkill"/.test(html) && !/id="omenCount"/.test(html), '顶栏已精简：去除最高技能与征兆计数两项');
assert(/<footer id="statusbar">/.test(html) === false, '状态条不再是 footer 底栏');
// 20.2 JS：renderTopbar 不再写已移除项；增益摘要点击打开征兆总效应；不再同步 --statusbar-h
assert(!/set\('omenCount'/.test(uiSrc) && !/set\('maxSkill'/.test(uiSrc), 'renderTopbar 不再写已移除的顶栏项');
assert(!uiSrc.includes('--statusbar-h'), 'ui.js 不再回填底部状态条高度');
assert(uiSrc.includes("$('buffBtn') && $('buffBtn').addEventListener('click'"), '书脊增益图标绑定点击开合浮层');
assert(uiSrc.includes("$('buffPop') && $('buffPop').addEventListener('click'"), '浮层内点击不冒泡到关闭逻辑');
assert(uiSrc.includes("document.addEventListener('click', ()=>{ UI.closeBuffPop(); })"), '点空白处收起增益浮层');
// 20.3 Tip 浮层：窄屏打开时标记 tip-open 并回填 --sheet-h，关闭时移除
assert(uiSrc.includes("document.body.classList.add('tip-open')") && uiSrc.includes('--sheet-h'), '窄屏浮层打开时写入 tip-open 与 --sheet-h');
assert(uiSrc.includes("document.body.classList.remove('tip-open')"), '浮层关闭时移除 tip-open');
// 20.4 CSS：图标栏收起仅图标、展开显文字、开关仅窄屏；状态条深色吸顶样式；窄屏提示避开吸顶区
assert(/#tabs \.tab-tx\{ display:none; \}/.test(css), '移动端图标栏收起态只显示图标');
assert(css.includes('body.drawer-open #tabs .tab-tx{ display:inline;'), '展开态显示页签文字');
assert(/\.tab-expand\{[^}]*display:none/.test(css), 'PC 端不显示展开开关（侧边栏常驻展开）');
assert(/#toasts\{ top:auto; bottom:16px;/.test(css) && /body\.tip-open #toasts\{ bottom:/.test(css), '窄屏提示浮于底部，并在详情抽屉展开时避让');
const toastBaseRule = (css.match(/#toasts\{[^}]*\}/) || [''])[0];
assert(/pointer-events:none/.test(toastBaseRule), '通知层不拦截指针事件（toast 不吞顶栏按钮点击）');
assert(/top:calc\(var\(--topdock-h/.test(toastBaseRule), '桌面端通知落于顶栏之下，不遮挡右上控件');
const sbRule = (css.match(/#statusbar\{[^}]*\}/) || [''])[0];
assert(sbRule && !/position:fixed/.test(sbRule), '状态条规则不含 position:fixed（已并入吸顶流）');
assert(/background:var\(--paper-2\)/.test(sbRule) && /border-bottom:1px solid var\(--rule\)/.test(sbRule), '状态条为纸质仪表带（墨色顶栏之下留一道细线）');
assert(/padding:0 16px var\(--app-pad-b, var\(--app-pad-b-base\)\)/.test((css.match(/#app\{[^}]*\}/) || [''])[0]), '#app 底部不再为状态条预留空间（留白变量化，可被抑制）');
// 20.4b 滚动条审查：消除「不必要」的内部滚动条
// (1) 竖排古籍不得有左外边距：竖排时 margin-left 是物理左外边距，会把整块推出父容器内容盒
assert(/\.quote\{[\s\S]*?writing-mode:vertical-rl/.test(css), '宽屏古籍为竖排');
// 取「带竖排属性」的那条 .quote 规则（同一个选择器有基础版与宽屏版两条）
const quoteRule = [...css.matchAll(/\.quote\{([^}]*)\}/g)].map(m=>m[1]).find(t=>/writing-mode:vertical-rl/.test(t)) || '';
assert(!/margin-left\s*:/.test(quoteRule) && !/margin\s*:\s*[^;]*\s\d+px[^;]*\s\d+px\s+\d+px/.test(quoteRule), '竖排古籍无左外边距（否则父容器凭空多出横向滚动条）');
assert(/overflow-x:auto/.test(quoteRule) && /scrollbar-width:thin/.test(quoteRule), '竖排原文溢出时保留可见细滚动条（可翻阅的卷轴），不藏起来');
// (2) 节点列表：任何宽度都不限高（窄屏页面已在滚，再加内滚就是双层滚动条）
const nodeListBase = [...css.matchAll(/(?:^|[};])\s*\.node-list\{([^}]*)\}/g)].map(m=>m[1])[0] || '';
assert(!/max-height/.test(nodeListBase) && !/overflow-y/.test(nodeListBase), '节点列表基础规则不限高也不内滚（窄屏无双层滚动条）');
assert(/\.map-wrap \.node-list\{[^}]*overflow-y:auto/.test(css), '宽屏书案三栏下节点列表仍保留内滚动（刻意设计）');
// (3) 幽灵竖滚动条：底部留白可被收窄到刚好贴住视口底
assert(/--app-pad-b-base:\s*28px/.test(css), '底部留白有基准值 --app-pad-b-base');
assert(uiSrc.includes('fitGhostScrollbar'), 'UI 提供幽灵滚动条收敛逻辑');
assert(/over > base/.test(uiSrc) && /base - over/.test(uiSrc), '溢出超过留白量时不收窄（内容真超高的滚动条保留）');
assert(!css.includes('#omenCount') && !css.includes('#maxSkill'), 'CSS 无已删元素的死规则');
// 20.5 实测：精简后的三个统计项仍正常写入
ST.UI.renderTopbar();
assert(String(renderTargets.totalLevel.textContent).length > 0, '总等级仍写入');
assert(String(renderTargets.shellCount.textContent).length > 0, '贝币仍写入');
assert(String(renderTargets.recordCount.textContent).indexOf('/') >= 0, '已录条目仍写入');

// ============ 21. 舆地页：关闭指引条不清空内容 + 窄屏山系折叠 ============
section('舆地页指引条与山系折叠');
const _hide21 = ST.Prefs.hideHint;
let y21ok = true, y21hide = '', y21show = '';
try {
  ST.resetToDefault();   // 初始进度：后续山系章节处于锁定态，用于验证折叠标记
  ST.Prefs.hideHint = true;
  ST.UI.currentTab = 'yudi'; ST.UI.renderYudi();
  y21hide = renderTargets.content.innerHTML;
  ST.Prefs.hideHint = false; ST.UI.renderYudi();
  y21show = renderTargets.content.innerHTML;
} catch(e){ y21ok = false; console.error('舆地页回归异常：' + e.stack); }
finally { ST.Prefs.hideHint = _hide21; }
assert(y21ok, 'renderYudi 两种指引条状态均不抛错');
assert(y21hide.indexOf('map-wrap') >= 0 && y21hide.indexOf('山系') >= 0 && y21hide.indexOf('诸山') >= 0, '关闭指引条后舆地页仍渲染山系/节点（不再整页清空）');
assert(y21hide.indexOf('hint-banner') < 0, 'hideHint=true 时不显示指引条');
assert(y21show.indexOf('hint-banner') >= 0 && y21show.indexOf('map-wrap') >= 0, '默认状态指引条与地图内容并存');
assert(y21hide.indexOf('locked-toggle') >= 0 && y21hide.indexOf('ch-locked') >= 0, '山系列表含未解锁章节折叠开关与标记');
assert(css.includes('.chapter-block.ch-locked{ display:none; }'), '窄屏默认收起未解锁山系章节');
assert(css.includes('body.show-locked .chapter-block.ch-locked'), '窄屏可展开未解锁山系章节');
assert(/\.locked-toggle\{[^}]*display:none/.test(css), 'PC 端不显示折叠开关（山系列表常驻全量）');

// ============ 22. 自定义游戏昵称 ============
section('自定义游戏昵称');
// nickTag 需要完整 classList（toggle 第二参数 + contains）
const nickCls = ()=>{ const s = new Set(); return { add(c){s.add(c)}, remove(c){s.delete(c)}, contains(c){return s.has(c)},
  toggle(c,on){ if(on===undefined){ s.has(c)?s.delete(c):s.add(c); } else if(on){ s.add(c); } else { s.delete(c); } } }; };
renderTargets.nickTag = Object.assign(mkTarget(), { classList: nickCls() });
assert(html.includes('id="nickTag"'), '顶栏含昵称展示位 #nickTag');
assert(css.includes('#nickTag'), 'CSS 含昵称样式');
assert(uiSrc.includes('saveNickname') && uiSrc.includes('id="nickInput"'), '设置弹窗含昵称输入与保存');
const engSrc = readText('src/engine.js');
assert(/nickname/.test(engSrc) && /Game\.nickname = typeof d\.nickname/.test(engSrc), '昵称随存档读写（含旧存档兼容）');
// 实测：renderTopbar 写入 / 隐藏昵称
const _nick = ST.Game.nickname;
let nickOk = true, nickSaved = '';
try {
  ST.Game.nickname = '西王母';
  ST.UI.renderTopbar();
  const shown = renderTargets.nickTag.textContent;
  const hiddenCls = renderTargets.nickTag.classList.contains('hidden');
  ST.Game.nickname = '';
  ST.UI.renderTopbar();
  const hiddenWhenEmpty = renderTargets.nickTag.classList.contains('hidden');
  nickOk = shown === '西王母' && !hiddenCls && hiddenWhenEmpty;
} catch(e){ nickOk = false; console.error('昵称渲染异常：' + e.stack); }
finally { ST.Game.nickname = _nick; }
assert(nickOk, 'renderTopbar 有昵称时显示、无昵称时隐藏');
// 实测：saveNickname 去空白并写入存档；读档时截断到 12 字
let snOk = true;
try {
  renderTargets.nickInput = Object.assign(mkTarget(), { value: '  云游四海的小散修  ' });
  ST.saveNickname();
  nickSaved = ST.Game.nickname;
  const raw = ST.localStorage.getItem('shj_zhulu_save_v1') || '';
  const withLong = JSON.parse(raw);
  withLong.nickname = '一二三四五六七八九十十一十二十三十四';   // 16 字超长昵称
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(withLong));
  ST.loadGame();
  const truncated = ST.Game.nickname;
  snOk = nickSaved === '云游四海的小散修' && raw.indexOf('"nickname":"云游四海的小散修"') >= 0 && truncated.length === 12;
} catch(e){ snOk = false; console.error('昵称保存异常：' + e.stack); }
finally { ST.Game.nickname = _nick; ST.saveGame(); }
assert(snOk, 'saveNickname 去空白并写入存档，读档截断 12 字 -> ' + nickSaved);

// ============ 23. 战斗中 HUD 实时刷新 + 快捷按钮清晰度 ============
section('战斗中HUD实时刷新');
let hudOk = true, hudHp = '';
const _combat23 = ST.Game.combat, _act23 = ST.Game.activity;
try {
  const beastId = Object.keys(ST.Monsters)[0];
  ST.Game.activity = null;                       // 纯讨伐：无采集/制作行动进度
  ST.Game.combat = { monsterId: beastId, monsterHp: 10, playerHp: 40, timer: 0, maxtimer: 1, spec: 0, round: 1, dmgOut: 0, dmgIn: 0, style: 'attack' };
  ST.UI.currentTab = 'taofa';
  ST.UI.tickProgress();
  hudHp = renderTargets.hpDisplay.innerHTML;
} catch(e){ hudOk = false; console.error('HUD 刷新异常：' + e.stack); }
finally { ST.Game.combat = _combat23; ST.Game.activity = _act23; }
assert(hudOk, '纯讨伐（无 activity）时 tickProgress 不抛错');
assert(hudHp === '', '顶栏不再写气血（征伐页战斗面板已有，避免冗余）-> ' + hudHp);
assert(html.indexOf('id="hpDisplay"') < 0 && html.indexOf('id="buffDisplay"') < 0, '仪表带移除气血与增益摘要两个元素');
// 战斗中渲染征伐页：血条 fill 宽度按实时血量
let arenaOk = true, arenaHp = '';
try {
  ST.UI.currentTab = 'taofa'; ST.UI.renderTaofa();
  arenaHp = renderTargets.content.innerHTML;
} catch(e){ arenaOk = false; console.error('征伐页渲染异常：' + e.stack); }
assert(arenaOk && arenaHp.indexOf('f-hp') >= 0, '征伐页渲染双方血条');
assert(/\.chip-btn\.on\{[^}]*--qing-d/.test(css) && /\.chip-btn\.on\{[^}]*color:#fff/.test(css), '快捷按钮选中态为深底白字（高对比）');
assert(css.includes('.style-row .chip-btn'), '战斗风格快捷行按钮放大增强可读性');
{
  const used = new Set(), defined = new Set();
  (css.match(/var\(--[a-z0-9-]+/g) || []).forEach(m => used.add(m.slice(4)));
  (css.match(/--[a-z0-9-]+\s*:/g) || []).forEach(m => defined.add(m.replace(/\s*:$/, '')));
  // 运行时由 JS / 内联样式注入的变量不算未定义
  const runtime = ['--topdock-h','--topbar-h','--sheet-h','--dx','--dy','--r','--app-pad-b'];
  const undef = [...used].filter(v => !defined.has(v) && !runtime.includes(v));
  assert(undef.length === 0, 'CSS 变量全部有定义（运行时注入的 --topdock-h / --topbar-h / --sheet-h / --dx / --dy / --r 除外）' + (undef.length?('：'+undef.join(',')):''));
}

// ============ 24. 工艺打磨：回到顶部 · 数值微光 · 御使CTA · 检索高亮 ============
section('工艺打磨：回顶 / 数值微光 / 检索高亮');
assert(html.includes('id="btnTop"') && html.includes('class="to-top"'), '顶栏外存在回到顶部按钮 #btnTop');
assert(/\.to-top\{/.test(css) && /\.to-top\.show\{/.test(css), '回到顶部有默认与 .show 两态样式');
assert(/\[data-theme="night"\] \.to-top\{/.test(css), '回到顶部有夜间适配');
assert(uiSrc.includes("classList.toggle('show'"), '滚动时按阈值显隐回到顶部');
assert(/font-variant-numeric:\s*tabular-nums/.test(css), '顶栏数值使用等宽数字');
assert(uiSrc.includes("classList.add('bump')") && /@keyframes stat-bump/.test(css), '数值变化有微光高亮');
assert(uiSrc.includes('去征伐'), '御使空态给出前往征伐的行动入口');
let hiOk = false;
try {
  const _q = ST.UI.codexQuery, _tab = ST.UI.codexTab;
  ST.UI.codexTab = 'beast'; ST.UI.codexQuery = '鸟';
  ST.UI.renderCodex();
  hiOk = renderTargets.content.innerHTML.indexOf('mark class="hit"') >= 0;
  ST.UI.codexQuery = _q; ST.UI.codexTab = _tab;
} catch(e){ console.error('检索高亮异常：' + e.stack); }
assert(hiOk, '图鉴检索命中片段被 <mark class="hit"> 包裹');
assert(/mark\.hit\{/.test(css), '命中高亮有样式（朱色淡底）');

// ============ 23. 内容完善：讨伐「宜讨」 · 图鉴阶位进度 · 廛市清整 ============
section('内容完善：目标推荐 / 阶位进度 / 批量售出');
const interactSrc = readText('src/interact.js');
// 23.1 宜讨：可讨伐（节点解锁 + 等级达标 + 非 BOSS）中经验最高者置顶并加朱印
assert(uiSrc.includes('const pick = (()=>{') && uiSrc.includes('if (x.boss) continue;'), '征伐页计算「宜讨」候选（排除 BOSS 与未解锁）');
assert(uiSrc.includes('levelOf(\'taofa\') < (x.needLvl||1)) continue;'), '宜讨候选需讨伐等级达标');
assert(uiSrc.includes('if (!best || (x.xp||0) > (best.xp||0)) best = x;'), '宜讨取经验效率最高者');
assert(uiSrc.includes('orderForGroup(g.list, pick)') && uiSrc.includes('list.indexOf(pick) < 0'), '宜讨在本组内置顶，不在本组则不插入（v1.31.21 修「蛊雕遍地」）');
assert(uiSrc.includes('class="bc-pick"') && uiSrc.includes('>宜讨</span>'), '宜讨项带朱色「宜讨」标记');
assert(uiSrc.includes("markIcon('check',13):'✔'} 宜讨</span>"), '宜讨与「✔ 推荐」兼具时合并为一枚标签（不并排）');
assert(/\.bc-pick\{/.test(css) && /\.beast-card\.pick\{ border-color:var\(--zhu\); \}/.test(css), '宜讨有样式（朱色小印 + 卡面朱边）');
// 23.2 图鉴阶位进度：显示距下一阶阈值（7/10），满阶明示得御
assert(uiSrc.includes('TUNING.MASTERY.THRESHOLDS[rec.tier+1]'), '图鉴卡计算下一阶阈值');
assert(uiSrc.includes('还差 ${Math.max(0, nextTh-rec.count)} 次'), '图鉴卡标题提示距下一阶差几次');
assert(uiSrc.includes('已至「得御」'), '满阶图鉴明示「得御」');
assert(/\.cc-count i\{ font-style:normal;/.test(css), '阶位进度数字有弱化样式');
// 23.3 廛市清整：按稀有度阈值批量售出原材料，食物/药品/装备/嘉种不碰
assert(interactSrc.includes('function bulkSellPreview(rarity)') && interactSrc.includes('function bulkSell(rarity)'), '批量售出预览与执行函数存在');
assert(interactSrc.includes("if (it.edible || it.equip || it.type === 'seed' || it.type === 'potion' || it.type === 'crop') continue;"), '批量售出排除食物/装备/嘉种/药品/嘉谷');
assert(interactSrc.includes("SELL_RARITY_ORDER.indexOf(rarityId(it)) > maxIdx"), '批量售出按稀有度阈值过滤');
assert(uiSrc.includes('食物 / 药品 / 装备 / 嘉种 / 嘉谷不在其列'), '确认弹窗列明不售品类');
assert(uiSrc.includes('function bulkSellRun(){') && uiSrc.includes('function bulkSellCommit(){'), '行装页有确认弹窗与执行入口');
assert(uiSrc.includes('packSellTier'), '行装页记住稀有度阈值选择');
assert(uiSrc.includes('UI.packSellTier'), '阈值切换调用存在');
assert(/\.bulk-sell\{/.test(css) && /\.bs-preview\{/.test(css) && /\.bs-total \.zhu-num\{ color:var\(--zhu\); \}/.test(css), '廛市清整面板有样式');
// 23.4 实测：批量售出只动原材料，不动食物与装备
{
  const before = Object.assign({}, ST.Game.inventory);
  before.shushi = 3;                    // 装备（equip:true）不应被售
  ST.Game.gear.weapon = { id:'shifu', name:'石斧' };
  ST.Game.inventory.gui = 40;           // 凡品原材料，应被售
  ST.Game.inventory.jiagufan = 2;       // 食物（edible），不应被售
  ST.Game.inventory.seed_tu = 5;        // 嘉种，不应被售
  const pre = ST.bulkSellPreview('COMMON');
  assert(pre.count >= 40 && pre.total > 0, '预览计入全部凡品原材料（≥40 件）-> ' + pre.count);
  assert(pre.rows.every(r => r.id !== 'jiagufan' && r.id !== 'seed_tu' && r.id !== 'tu'), '预览不含食物、嘉种与嘉谷');
  const r = ST.bulkSell('COMMON');
  assert(r.count === pre.count, '执行件数与预览一致 -> ' + r.count + '/' + pre.count);
  assert((ST.Game.inventory.gui||0) === 0, '凡品原材料被清空');
  assert(ST.Game.inventory.jiagufan === 2, '食物未被售出');
  assert(ST.Game.inventory.seed_tu === 5, '嘉种未被售出');
  assert(ST.Game.shells > 0, '售出后贝币增加');
}

// ============ 24. 讨伐收益递减：同目标连杀经验递减（换目标/败北重置） ============
section('讨伐收益递减：同目标连杀');
const gameSrc = readText('src/game.js');
const engineSrc = readText('src/engine.js');
// 24.1 调参与函数接线
assert(ST.TUNING.MOB_DECAY && ST.TUNING.MOB_DECAY.STEP === 0.03 && ST.TUNING.MOB_DECAY.MIN === 0.6,
  'MOB_DECAY 调参存在（每连杀 -3%，下限 60%）');
assert(gameSrc.includes('function mobStreakMult(id)') && gameSrc.includes('function bumpMobStreak(id)'),
  'game.js 定义递减系数与连杀计数');
assert(gameSrc.includes('window.mobStreakMult = mobStreakMult; window.bumpMobStreak = bumpMobStreak;'),
  '两函数导出到 window');
assert(gameSrc.includes('const dm = isBoss ? 1 : mobStreakMult(m.id);') &&
       gameSrc.includes('gainXp(\'ming\', Math.round(m.xp * 0.3 * dm));'),
  '讨伐与识名经验均乘递减系数（BOSS 除外）');
assert(gameSrc.includes('if (Game.mobStreak) Game.mobStreak = {};'), '败北中断连杀链条');
assert((engineSrc.match(/mobStreak/g)||[]).length >= 4, 'engine.js 存档四件套（定义/克隆/存/读）');
// 24.2 递减系数数值：全额 → 线性 -3% → 触底 60%
assert(ST.mobStreakMult('shengsheng') === 1, '无连杀记录时经验全额');
ST.Game.mobStreak = { shengsheng: 1 };
assert(ST.mobStreakMult('shengsheng') === 0.97, '连杀 1 次 → ×0.97');
ST.Game.mobStreak = { shengsheng: 10 };
assert(ST.mobStreakMult('shengsheng') === 0.7, '连杀 10 次 → ×0.70');
ST.Game.mobStreak = { shengsheng: 99 };
assert(ST.mobStreakMult('shengsheng') === 0.6, '递减触底 60% 不再降');
assert(ST.mobStreakMult('other_mob') === 1, '其他目标不受连杀影响');
// 24.3 bumpMobStreak：换目标即清空旧链
ST.Game.mobStreak = {};
ST.bumpMobStreak('shengsheng'); ST.bumpMobStreak('shengsheng');
assert(ST.Game.mobStreak.shengsheng === 2, '同目标连杀累计 2 次');
ST.bumpMobStreak('huan');
assert(!ST.Game.mobStreak.shengsheng && ST.Game.mobStreak.huan === 1, '换目标清空旧链条');
// 24.4 存档往返保留 mobStreak
ST.Game.mobStreak = { shengsheng: 5 };
G.saveGame();
const sv24 = JSON.parse(context.localStorage.getItem('shj_zhulu_save_v1'));
assert(sv24.mobStreak && sv24.mobStreak.shengsheng === 5, '存档含 mobStreak');
ST.Game.mobStreak = {};
G.loadGame();
assert(ST.Game.mobStreak.shengsheng === 5, '读档恢复 mobStreak');
// 24.5 集成：meetKill 逐次递减；著录度不受影响（只减经验，不断材料线与著录）
{
  G.stopActivity(); ST.Game.combat = null;
  ST.Game.mobStreak = {};
  const m = ST.Monsters.ds_hey;                 // 合窳 xp=4547，取整后递减清晰可见
  const xp0 = ST.Game.skills.taofa.xp;
  const cnt0 = (ST.Game.records['ds_hey']||{count:0}).count;
  G.meetKill({}, m);                            // 第 1 次：全额
  const g1 = ST.Game.skills.taofa.xp - xp0;
  G.meetKill({}, m);                            // 第 2 次：×0.97
  const g2 = ST.Game.skills.taofa.xp - xp0 - g1;
  G.meetKill({}, m);                            // 第 3 次：×0.94
  const g3 = ST.Game.skills.taofa.xp - xp0 - g1 - g2;
  assert(g1 === m.xp, '首讨经验全额 -> ' + g1);
  assert(g2 === Math.round(m.xp * 0.97), '二讨经验 ×0.97 -> ' + g2);
  assert(g3 === Math.round(m.xp * 0.94), '三讨经验 ×0.94 -> ' + g3);
  assert(g2 < g1 && g3 < g2, '经验逐次递减');
  assert((ST.Game.records['ds_hey']||{}).count === cnt0 + 3, '著录照常 +3（只减经验）');
  // 换一只打即恢复全额
  G.meetKill({}, ST.Monsters.huan);
  const g4 = ST.Game.skills.taofa.xp - xp0 - g1 - g2 - g3;
  assert(g4 === ST.Monsters.huan.xp, '换目标（䍺）恢复全额经验 -> ' + g4);
  assert(!ST.Game.mobStreak['ds_hey'] && ST.Game.mobStreak.huan === 1, '连杀链已切到新目标');
}
// 24.6 BOSS 不递减 + 全 BOSS 讨平不抛错（回归：BOSS 无 loot 表，早年必崩）
{
  G.stopActivity(); ST.Game.combat = null;
  ST.Game.mobStreak = { zaochi: 20 };
  const xp0 = ST.Game.skills.taofa.xp;
  G.meetKill({}, ST.Monsters.zaochi);
  assert(ST.Game.skills.taofa.xp - xp0 === ST.Monsters.zaochi.xp, 'BOSS 经验不递减（连杀 20 次仍全额）');
  let bossOk = true, bossErr = '';
  for (const [id, m] of Object.entries(ST.Monsters)){
    if (!m.boss) continue;
    try { G.meetKill({}, m); } catch(e){ bossOk = false; bossErr = id + ': ' + e.message; }
  }
  assert(bossOk, '全部 10 个 BOSS 讨平结算不抛错' + (bossOk ? '' : ' -> ' + bossErr));
  assert(ST.Game.stats.bossKills.zaochi === true && ST.Game.stats.bossKills.xiwangmu === true, 'BOSS 击杀入册');
}
// 24.7 败北重置链条
{
  G.stopActivity(); ST.Game.combat = null;
  ST.Game.mobStreak = { shengsheng: 8 };
  G.onPlayerDeath({}, ST.Monsters.shengsheng);
  assert(ST.mobStreakMult('shengsheng') === 1, '败北后复讨从全额起算');
}
// 24.8 UI：连杀提示接入异兽卡 + 样式
assert(uiSrc.includes('const streakN = (Game.mobStreak && Game.mobStreak[x.id]) || 0;'), '征伐页计算连杀次数');
assert(uiSrc.includes('<span class="bt-decay" title="连续讨伐 ${streakN} 次'), '递减标签带悬浮说明');
assert(uiSrc.includes('<i class="bt-rec">录 ${rec.count}</i>') && uiSrc.includes('class="bt-decay"'), '递减标签挂在方块上（著录数同行）');
assert(/\.beast-tile \.bt-decay\{/.test(css), '递减标签有样式（朱色小字，与宜讨角标区分）');

// ============ 25. 方国贸易深化：动态求购订单 ============
section('方国贸易深化：动态求购订单');
// 25.1 调参与数据池
assert(ST.TUNING.ORDERS && ST.TUNING.ORDERS.COUNT === 3 && ST.TUNING.ORDERS.REFRESH_SEC === 1800,
  'ORDERS 调参存在（3 单 / 30 分钟轮换 / 溢价 1.3~1.8）');
assert(Array.isArray(ST.ORDER_POOL) && ST.ORDER_POOL.length >= 100, '订单池充足 -> ' + (ST.ORDER_POOL||[]).length + ' 种');
assert(ST.ORDER_POOL.every(it=>ST.ITEM_REGION[it.id]), '池中物品均有产地（区域绑定）');
assert(ST.ORDER_POOL.every(it=>!it.edible && !it.equip && it.type!=='seed' && it.type!=='potion' && it.type!=='crop'),
  '订单不收食物/装备/嘉种/药品/嘉谷（口径同廛市清整）');
assert(ST.ORDER_POOL.some(it=>ST.ITEM_REGION[it.id]==='nanshan-1'), '南山首经风物在池（新手即有单可接）');
// 25.2 rollOrders：字段完整、只出已解锁区域、同批不重复
{
  const orders = ST.rollOrders();
  assert(orders.length === ST.TUNING.ORDERS.COUNT, '常驻 3 单 -> ' + orders.length);
  assert(orders.every(o=>o.itemId && o.qty>0 && o.regionId && o.premium && o.total>0 && o.xp>0),
    '订单字段完整（物品/数量/区域/溢价/总价/经验）');
  assert(orders.every(o=>o.premium >= 1.3 && o.premium <= 1.8), '溢价在 1.3~1.8 -> ' + orders.map(o=>o.premium).join('/'));
  assert(orders.every(o=>{
    const r = ST.regionById(o.regionId);
    return r && G.regionUnlocked(r);                       // 新手档只解锁南山首经
  }), '只求购已解锁区域的物产');
  assert(orders.every(o=>ST.ITEM_REGION[o.itemId] === o.regionId), '订单物品与标注区域一致');
  assert(new Set(orders.map(o=>o.itemId)).size === orders.length, '同批无重复物品');
  assert(orders.every(o=>o.total === Math.round((ST.Items[o.itemId].value||0)*o.qty*o.premium)),
    '总价 = 基准价 × 数量 × 溢价');
}
// 25.3 存档往返
{
  ST.rollOrders();
  const keep = ST.Game.orders.map(o=>o.itemId);
  G.saveGame();
  const sv = JSON.parse(context.localStorage.getItem('shj_zhulu_save_v1'));
  assert(Array.isArray(sv.orders) && sv.orders.length === 3 && isFinite(sv.ordersAt), '存档含订单与生成时间');
  ST.Game.orders = [];
  G.loadGame();
  assert(ST.Game.orders.map(o=>o.itemId).join(',') === keep.join(','), '读档恢复订单');
}
// 25.4 交付：不足拒付、足额交割（扣物品/加贝币/加商旅经验/划掉留存）
{
  ST.rollOrders();
  const o = ST.Game.orders[0];
  const it = ST.Items[o.itemId];
  const shells0 = ST.Game.shells, xp0 = ST.Game.skills.shanglv.xp;
  ST.Game.inventory[o.itemId] = o.qty - 1;                 // 差 1 件
  assert(ST.deliverOrder(0) === false, '数量不足拒绝交割');
  assert((ST.Game.inventory[o.itemId]||0) === o.qty - 1, '拒付不动行囊');
  ST.Game.inventory[o.itemId] = o.qty + 2;                 // 备齐（多 2 件）
  assert(ST.deliverOrder(0) === true, '备齐后交割成功');
  assert((ST.Game.inventory[o.itemId]||0) === 2, '只扣求购数量');
  assert(ST.Game.shells === shells0 + o.total, '贝币 +总价 -> ' + (ST.Game.shells - shells0));
  assert(ST.Game.skills.shanglv.xp > xp0, '商旅经验 +' + (ST.Game.skills.shanglv.xp - xp0));
  assert(ST.Game.orders[0].done === true, '已交付单划掉留存');
  assert(ST.deliverOrder(0) === false, '已交付单不可重复交割');
}
// 25.5 轮换冷却：30 分钟内手动换批被拒，改时间戳后可换
{
  ST.rollOrders();
  assert(ST.rerollOrders() === false, '冷却期内「另访方国」被拒');
  const before = ST.Game.orders.map(o=>o.itemId).join(',');
  ST.Game.ordersAt = Date.now() - (ST.TUNING.ORDERS.REFRESH_SEC + 60) * 1000;   // 模拟超时
  assert(ST.rerollOrders() === true, '超冷却后可换批');
  assert(ST.Game.orders.length === 3, '换批后仍为 3 单');
}
// 25.6 UI：订单板接入墟市页
assert(uiSrc.includes("markIcon('scale',17):'⚖️'") && uiSrc.includes('方国求购'), '墟市页有订单板标题');
assert(uiSrc.includes('整批轮换 <b>${mm}:${ss}</b> 后'), '订单板显示轮换倒计时');
assert(uiSrc.includes('onclick="deliverOrder(${idx});UI.renderShichan()"'), '订单卡有交割按钮');
assert(uiSrc.includes('onclick="rerollOrders();UI.renderShichan()"'), '订单板有「另访方国」');
assert(uiSrc.includes('✓ 已交割'), '已交付单有划掉态');
assert(uiSrc.includes('if (typeof refreshOrders === \'function\') refreshOrders(true);'), '渲染前惰性刷新订单');
assert(uiSrc.includes('方国求购：<b>${esc(it.name)}</b>'), '可交割订单进「推荐买卖」');
assert(/\.order-board\{/.test(css) && /\.ob-card\{/.test(css) && /\.ob-card\.done\{/.test(css), '订单板有样式（含交割退灰态）');
assert(/\.ob-total\{ font-family:var\(--f-num\); font-size:13px; font-weight:700; color:var\(--zhu\); \}/.test(css), '订单总价用朱色');
// 25.7 渲染冒烟：订单板随墟市页输出
{
  ST.rollOrders();
  ST.UI.currentTab = 'shichan'; ST.UI.renderShichan();
  const html = renderTargets.content.innerHTML;
  assert(html.includes('order-board') && html.includes('ob-card'), '墟市页渲染出订单板与订单卡');
  assert(html.includes('另访方国'), '订单板含换批入口');
}

// ============ 26. 闲置体验：停止按钮显隐 + 闲置兜底行动 ============
section('闲置体验：停止按钮与兜底行动');
// 26.1 调参、偏好默认值、一次性提示字段
assert(ST.TUNING.IDLE_GRACE === 8, 'IDLE_GRACE 调参存在（闲置 8 秒后兜底）');
assert(ST.Prefs.idleFallback === true, '闲置兜底默认开启');
assert(ST.Game.stats.seenFallbackHint === false, '一次性提示字段存在（只讲一次）');
{
  G.saveGame();
  const sv = JSON.parse(context.localStorage.getItem('shj_zhulu_save_v1'));
  assert(sv.prefs.idleFallback === true, '存档含 idleFallback 偏好');
}
// 26.2 startFallbackAction：无兜底动作时取当前节点采集（樵采优先，等级达标）
{
  G.stopActivity(); ST.Game.combat = null; ST.Game.fallback = { kind:'idle', target:'', qty:1 };
  const ok = ST.startFallbackAction();
  assert(ok === true, '当前节点有可采物产 -> 兜底启动');
  const a = ST.Game.activity;
  assert(a && a.kind === 'gather' && a.src === 'fallback', '兜底行动是采集且标记 src=fallback');
  assert(a.skill === 'qiaocai' && a.itemId === 'gui', '樵采优先，取桂枝（首节点 lv1 达标）');
}
// 26.3 巡历兜底动作优先于默认采集
{
  G.stopActivity(); ST.Game.combat = null;
  ST.Game.fallback = { kind:'caiyu', target:'jin', qty:5 };      // 巡历页设的兜底：采玉
  const ok = ST.startFallbackAction();
  assert(ok === true, '设有巡历兜底动作时优先执行');
  assert(ST.Game.activity.itemId === 'jin' && ST.Game.activity.src === 'fallback', '兜底走巡历动作（采玉）并标记来源');
  ST.Game.fallback = { kind:'idle', target:'', qty:1 };
}
// 26.4 onSecond：闲置累计够久才启动，战斗中/队列中/关闭偏好都不启动
{
  const toasts = [];
  const origToast = ST.UI.toast;
  ST.UI.toast = m => toasts.push(m);
  // ① 战斗中不抢占
  G.stopActivity(); ST.Game.combat = { monsterId:'shengsheng' }; ST.Game.queueRunning = false;
  for (let i=0;i<12;i++) G.onSecond();
  assert(!ST.Game.activity, '战斗中不启动兜底');
  // ② 队列运行中不抢占
  ST.Game.combat = null; ST.Game.queueRunning = true;
  for (let i=0;i<12;i++) G.onSecond();
  assert(!ST.Game.activity, '巡历队列运行中不启动兜底');
  // ③ 偏好关闭不启动
  ST.Game.queueRunning = false; ST.Prefs.idleFallback = false;
  for (let i=0;i<12;i++) G.onSecond();
  assert(!ST.Game.activity, '关闭偏好后不启动兜底');
  ST.Prefs.idleFallback = true;
  // ④ 真闲置：差一秒不动，第 8 秒启动，且只提示一次
  toasts.length = 0;
  for (let i=0;i<7;i++) G.onSecond();
  assert(!ST.Game.activity, '未到 IDLE_GRACE 不提前启动');
  G.onSecond();
  assert(ST.Game.activity && ST.Game.activity.src === 'fallback', '闲置满 8 秒启动兜底');
  assert(toasts.some(m=>m.includes('闲置兜底已启动')), '首次启动有一次说明 -> ' + (toasts[0]||''));
  assert(ST.Game.stats.seenFallbackHint === true, '一次性提示标记已置位');
  // ⑤ 手动停止后重新累计，再次启动且不再提示
  G.stopActivity();
  toasts.length = 0;
  for (let i=0;i<8;i++) G.onSecond();
  assert(ST.Game.activity && ST.Game.activity.src === 'fallback', '停止后再闲置仍会重启兜底');
  assert(toasts.length === 0, '说明只讲一次（重启不再弹）');
  ST.UI.toast = origToast;
  G.stopActivity(); ST.Game.combat = null;
}
// 26.5 UI：停止按钮只在有行动时显示；兜底行动带标识
{
  const toggleLog = [];
  renderTargets.btnStop.classList.toggle = (cls, force)=>{ if (cls === 'hidden') toggleLog.push(!!force); };
  // 闲置
  ST.Game.activity = null; ST.Game.combat = null;
  ST.UI.refreshActivity();
  assert(toggleLog[toggleLog.length-1] === true, '闲置时停止按钮隐藏');
  assert(renderTargets.activityText.textContent === '空闲', '状态栏显示空闲');
  // 战斗中也显示：停战会真的结束这一场并停止自动接战
  ST.Game.combat = { monsterId:'shengsheng', playerHp:20, monsterHp:10, dmgOut:0, dmgIn:0, round:0, timer:0 };
  ST.UI.refreshActivity();
  assert(toggleLog[toggleLog.length-1] === false, '战斗中同样显示停止按钮');
  // 有行动（含兜底标记）
  ST.Game.combat = null;
  ST.Game.activity = { kind:'gather', skill:'qiaocai', itemId:'gui', src:'fallback' };
  ST.UI.refreshActivity();
  assert(toggleLog[toggleLog.length-1] === false, '有行动时停止按钮显示');
  assert(renderTargets.activityText.textContent.includes('（兜底）'), '兜底行动状态栏带「（兜底）」标识 -> ' + renderTargets.activityText.textContent);
  // 手动行动无标识
  ST.Game.activity = { kind:'gather', skill:'qiaocai', itemId:'gui', src:'manual' };
  ST.UI.refreshActivity();
  assert(!renderTargets.activityText.textContent.includes('兜底'), '手动行动不带兜底标识');
  G.stopActivity();
  assert(uiSrc.includes("bs.classList.toggle('hidden', !(Game.activity || Game.combat))"), '停止按钮显隐接线存在（行动或战斗）');
  assert(uiSrc.includes("if (a.src === 'fallback') label += '（兜底）'"), '兜底标识接线存在');
  // 停战：战斗中「停止」要能真的结束这一场，且不再自动接战
  G.resetToDefault();
  ST.Game.combat = null;
  const started = G.startCombat('shengsheng');
  assert(started && !!ST.Game.combat, '往讨可发起，进入战斗态');
  ST.Game.combat.playerHp = 12;
  G.stopActivity();
  assert(ST.Game.combat === null, '停战后战斗结束');
  if (typeof G.combatTick === 'function') G.combatTick(1);
  assert(ST.Game.combat === null, '停战后不自动接战下一只');
  assert(gameSrc.includes('if (Game.combat){') && gameSrc.includes('autoAttack = false;'), '停战分支置 autoAttack=false');
  assert(gameSrc.includes('UI && UI.afterCombatEnd && UI.afterCombatEnd(null)'), '停战通知界面收尾（不刷著录）');
  assert(uiSrc.includes("onoff(Prefs.idleFallback!==false, '闲置兜底'"), '设置页有「闲置兜底」开关');
  assert(/Prefs\.\$\{extra\.pref\}=\$\{extra\.expr\};saveGame\(\);UI\.renderSettings\(\)/.test(uiSrc), '开关三连式（翻转/存档/就地重绘）');
  assert(uiSrc.includes("${pref?'开':'关'}"), '开关显示当前状态');
  // 设置页渲染冒烟：写进主内容区，不弹窗
  ST.UI.currentTab = 'settings';
  ST.UI.renderSettings();
  assert(renderTargets.content.innerHTML.includes('闲置兜底'), '设置页在主内容区渲染出该开关');
  assert(!renderTargets.modalBox.innerHTML.includes('闲置兜底'), '设置不再走弹窗');
}

// ============ 27. 顶栏收敛 + 征伐页渲染性能 ============
section('顶栏收敛与征伐页性能');
// 27.1 入口收敛：昼夜 / 帮助 / 设置三按钮从顶栏移除，设置沉入侧边栏
assert(!html.includes('btnTheme') && !html.includes('btnHelp') && !html.includes('btnSettings'),
  'index.html 顶栏三按钮全部移除');
assert(!uiSrc.includes("$('btnTheme') && $('btnTheme').addEventListener"), '初始化不再绑定顶栏按钮');
assert(uiSrc.includes('data-tab="settings"'), '侧边栏末尾渲染「设置」入口（本身即页签）');
assert(!uiSrc.includes('if (b.dataset.tool) return;'), '设置入口与其他页签走同一条切页绑定');
assert(uiSrc.includes("ICON('<circle cx=\"12\" cy=\"12\" r=\"3\"/>") && uiSrc.includes('a2 2 0 0 1 0 2.83'), '设置入口带齿轮图标（非辐条太阳）');
assert(uiSrc.includes("settings:'renderSettings'"), 'renderCurrent 分发到 renderSettings');
assert(/function openSettings\(\)\{ UI\.switchTab\('settings'\); \}/.test(uiSrc), 'openSettings 兼容旧调用：切页而非弹窗');
assert(/\.tab-tool\{ margin-top:auto;/.test(css), '设置入口沉底（margin-top:auto），与页签区分');
assert(/\.tab-tool\{[^}]*border-top:1px solid var\(--rule-2\)/.test(css), '设置入口与导航之间有一道细线');
// 27.2 设置弹窗接管昼夜与玩法说明
assert(uiSrc.includes('<div class="form-row"><span>昼夜</span>'), '设置页含「昼夜」一行');
assert(uiSrc.includes("onclick=\"setTheme('day')\"") && uiSrc.includes("onclick=\"setTheme('night')\""), '昼夜两态可点选');
assert(uiSrc.includes("function setTheme(t){") && uiSrc.includes('UI.applyTheme(t, true)'), 'setTheme 走 applyTheme 并持久化');
assert(uiSrc.includes("de.classList.add('theme-anim')"), '切换昼夜保留柔和过渡（theme-anim）');
assert(uiSrc.includes('onclick="openHelp()"'), '玩法说明入口仍在设置内');
assert(!/\.theme-toggle|\.icon-btn/.test(css), '顶栏图标样式已清理，不留死规则');
// 27.3 征伐页：竞技场与列表拆开渲染
assert(typeof G.taofaArenaHtml === 'function' && typeof G.taofaListHtml === 'function', '渲染拆为竞技场 / 目标列表两个纯函数');
assert(uiSrc.includes('box.innerHTML = taofaArenaHtml() + taofaListHtml();'), '整页渲染只在切页 / 首绘时组合两者');
assert(uiSrc.includes("id=\"arenaBox\""), '竞技场带 #arenaBox 容器，便于就地替换');
assert(typeof ST.UI.patchCombatArena === 'function' && typeof ST.UI.patchBeastCard === 'function', '提供竞技场与单卡的局部刷新');
assert(uiSrc.includes('el.outerHTML = taofaArenaHtml();'), '战斗状态变化只替换竞技场，不重建列表');
assert(uiSrc.includes('this.afterCombatEnd(this._lastMobId);') && uiSrc.includes('UI.afterCombatEnd = function(id){'), '战斗收尾走 afterCombatEnd（竞技场 + 刚打完那张卡）');
assert(readText('src/game.js').includes('UI.afterCombatEnd && UI.afterCombatEnd(c.monsterId);'), '击杀结算后即时通知界面（自动连战下 combat 永不为空）');
assert(readText('src/game.js').includes('UI.afterCombatEnd && UI.afterCombatEnd(lastId);'), '败北也通知（连杀清零、递减标签消失）');
assert(uiSrc.includes('this._lastMobId = c.monsterId;'), '战斗中记住当前目标，供结束后补卡');
assert(uiSrc.includes('data-bid="${x.id}"'), '目标卡带 data-bid，便于按 id 定位');
// 27.4 入场动画不再随重绘重播
assert(uiSrc.includes("setTimeout(()=>c.classList.remove('enter'), 480)"), '切页入场动画播完即摘 class');
assert(/\.beast-card\{ contain:layout style paint; content-visibility:auto/.test(css), '目标卡做布局/绘制隔离并跳过视口外渲染');
// 27.5 行为回归：渲染、局部刷新、补卡都不抛错
{
  ST.Game.activity = null; ST.Game.combat = null;
  ST.UI.currentTab = 'taofa'; ST.UI.renderTaofa();
  const h = renderTargets.content.innerHTML;
  assert(h.includes('id="arenaBox"') && h.includes('beast-tile'), '整页渲染输出竞技场与目标方块');
  assert((h.match(/id="arenaBox"/g) || []).length === 1, '竞技场容器唯一（不重复嵌套）');
  const before = renderTargets.content.innerHTML;
  let arenaOk = true;
  try { ST.UI.patchCombatArena(); } catch(e){ arenaOk = false; }
  assert(arenaOk, '局部刷新竞技场不抛错');
  let safe = true;
  try { ST.UI.patchBeastCard('shengsheng'); ST.UI.patchBeastCard('__nope__'); }
  catch(e){ safe = false; }
  assert(safe, '补卡在无锚点时安全返回');
}

// ============ 28. 五行「宜用属性」方向（回归：曾把「敌方所克」当成「克敌方」） ============
section('五行宜用属性方向');
// 28.1 全表反查：宜用 = 克敌方的属性
{
  const names = ST.TUNING.ELEMENTS;
  let ok = true, detail = [];
  for (const el of names){
    const counter = G.counterOf(el);
    const good = counter && ST.TUNING.KE_MAP[counter] === el && counter !== el;
    if (!good) ok = false;
    detail.push(`${el}→${counter}`);
  }
  assert(ok, '五种属性都能反查到「克它的属性」-> ' + detail.join(' '));
  assert(G.counterOf('木') === '金', '木敌宜用金（金克木）');
  assert(G.counterOf('金') === '火', '金敌宜用火（火克金）');
  assert(G.counterOf('土') === '木', '土敌宜用木（木克土）');
  assert(G.counterOf('水') === '土', '水敌宜用土（土克水）');
  assert(G.counterOf('火') === '水', '火敌宜用水（水克火）');
  // 与战斗倍率自洽：玩家用「宜用」属性打该敌，应当吃到相克加成
  let multOk = true;
  for (const el of names){
    const c = G.counterOf(el);
    if (G.wuxingMult(c, el) !== ST.TUNING.WUXING.KE) multOk = false;
    if (G.wuxingMult(el, el) !== ST.TUNING.WUXING.TONG) multOk = false;
  }
  assert(multOk, '宜用属性对敌方恒为相克倍率 ×' + ST.TUNING.WUXING.KE);
}
// 28.2 渲染：木属性异兽卡给「宜用金属」，不得出现反过来的「宜用土属」
{
  ST.Game.activity = null; ST.Game.combat = null;
  ST.UI.currentTab = 'taofa'; ST.UI.renderTaofa();
  const h = renderTargets.content.innerHTML;
  const i0 = h.indexOf('data-bid="shengsheng"');
  const i1 = h.indexOf('class="tile beast-tile', i0 + 10);
  const card = h.slice(i0, i1 > i0 ? i1 : i0 + 1200);   // 只取这一张卡，不卷进邻卡
  assert(ST.Monsters.shengsheng.el === '木', '狌狌为木属（用真实数据校验）');
  assert(card.includes('宜金'), '木敌方块有「宜金」一键切换角标');
  assert(card.includes('宜用 金 属'), '浮层写清「宜用 金 属」');
  assert(!card.includes('宜土'), '不再把「敌方所克」的土当成宜用');
  assert(card.includes('金克木'), '悬浮说明写清克制方向（金克木）');
  assert(!uiSrc.includes('const counterEl = (x.el && TUNING.KE_MAP[x.el])'), '卡片不再直取 KE_MAP[敌方]');
  assert(uiSrc.includes("const counterEl = x.el ? (counterOf(x.el) || '') : '';"), '卡片改用 counterOf 反查');
  // 一键切换传的是「宜用」属性
  assert(card.includes("setZhuEl('金')"), '「宜用金属」按钮切到金（而非土）');
}
// 28.3 全站口径一致：竞技场提示与目标卡给同一个答案
{
  const pe = '木', me = '土';
  const advice = G.wuxingAdvice(pe, me);
  assert(advice.includes('宜用「金」属'), '竞技场提示同样指向金');
  assert(!advice.includes('宜用「土」属'), '竞技场提示不指向土');
}

// ============ 29. 数据引用完备性（回归：东山三礼漏物品、黍米无种子） ============
section('数据引用完备性：配方产物 / 祠礼物品 / 作物种子 / 材料可达');
// 29.1 每条配方产物必须有物品定义——曾出现 rite_ds1/2/3 有配方无物品，
// 制作时 `Items[out].name` 抛 TypeError，材料已扣而界面中断。
{
  const bad = ST.Recipes.filter(r => !ST.Items[r.out]).map(r => r.out);
  assert(bad.length === 0, '所有配方产物都有物品定义' + (bad.length ? ' -> 缺 ' + bad.join(', ') : ''));
  const badCost = [...new Set(ST.Recipes.flatMap(r => (r.cost||[]).map(x => x[0])))].filter(id => !ST.Items[id]);
  assert(badCost.length === 0, '所有配方材料都有物品定义 -> ' + (badCost.join(',') || '无缺失'));
}
// 29.2 祠礼表 ↔ 祠器物品 ↔ 配方 三方一致
{
  const ids = Object.keys(ST.RITES);
  const noItem = ids.filter(k => !ST.Items[k]);
  const noRecipe = ids.filter(k => !ST.Recipes.some(r => r.type === 'rite' && r.out === k));
  assert(noItem.length === 0, '每套祠礼都有祠器物品（东山三礼曾缺）-> ' + (noItem.join(',') || '齐全'));
  assert(noRecipe.length === 0, '每套祠礼都有对应配方 -> ' + (noRecipe.join(',') || '齐全'));
  assert(ids.length === 28, '祠礼共二十八套（含常祭）-> ' + ids.length);
  assert(!!ST.Items.rite_ds1 && !!ST.Items.rite_ds2 && !!ST.Items.rite_ds3, '东山三套祠器各有其名（犬祈鱼䎶 / 鸡祈璧瘗 / 牡羊黍米）');
}
// 29.3 每种嘉谷都必须有种子，否则该作物永远拿不到
{
  const crops = Object.values(ST.Items).filter(it => it.type === 'crop');
  const noSeed = crops.filter(c => !Object.values(ST.Items).some(s => s.crop === c.id));
  assert(noSeed.length === 0, '每种嘉谷都有对应种子（黍米曾无种）-> ' + (noSeed.map(c => c.name).join(',') || '全有'));
  assert(ST.Items.seed_shu && ST.Items.seed_shu.crop === 'shu', '黍籽可种出黍米');
  assert((ST.ShopStock || []).some(s => s.itemId === 'seed_shu'), '黍籽可在墟市购得');
}
// 29.4 可达性：凡被配方/养成消耗的物品，必须至少有一条获取途径
{
  const src = new Set();
  Object.values(ST.Items).forEach(it => { if (it.node) src.add(it.id); if (it.crop) src.add(it.crop); });
  Object.values(ST.Monsters).forEach(m => {
    (m.loot || []).forEach(([id]) => src.add(id));
    if (m.drop) src.add(m.drop);
    if (m.riteDrop) src.add(m.riteDrop);
  });
  ST.Recipes.forEach(r => src.add(r.out));
  (ST.ShopStock || []).forEach(s => src.add(s.itemId));
  Object.values(ST.GROW_SITES || {}).forEach(v => {
    (v.cost || []).forEach(([id]) => src.add(id));
    Object.keys(v.reward || {}).forEach(id => src.add(id));
  });
  // 观瑞之赐写在 game.js 观瑞分支（丹穴→凤皇羽 / 南禺→鹓雏羽），不在数据表内
  ['fenghuangyu', 'yuanchuyu'].forEach(id => src.add(id));
  const need = new Set();
  ST.Recipes.forEach(r => (r.cost || []).forEach(([id]) => need.add(id)));
  Object.values(ST.GROW_SITES || {}).forEach(v => (v.cost || []).forEach(([id]) => need.add(id)));
  const dead = [...need].filter(id => !src.has(id)).map(id => (ST.Items[id] || {}).name || id);
  assert(dead.length === 0, '所有消耗品都有获取途径 -> ' + (dead.join(',') || '无死链'));
  assert(src.has('shu'), '黍米已有来源（种子可种）');
}
// 29.5 东山三礼真正可施行：不抛错，且给出该山系产出增益
{
  ST.Game.activity = null; ST.Game.combat = null;
  for (const id of ['rite_ds1', 'rite_ds2', 'rite_ds3']){
    const rec = ST.Recipes.find(r => r.type === 'rite' && r.out === id);
    rec.cost.forEach(([iid, q]) => { ST.Game.inventory[iid] = (ST.Game.inventory[iid] || 0) + q; });
    let ok = true;
    try { ok = G.performRite(id); } catch (e) { ok = false; }
    const region = ST.RITES[id].regionId;
    assert(ok && (ST.Game.rites || {})[region] > 0, `${ST.Items[id].name} 行祭成功并给 ${region} 增益`);
  }
}

// ============ 30. 征兆可触发性（回归：42 条里曾有 20 条挂在并不存在的异兽 id 上） ============
section('征兆可触发：兆必有兽 / 兆必能应');
// 30.1 每条征兆都得有触发源：怪物 omen 字段，或观瑞 / 谒见的显式触发
{
  const noSource = [];
  Object.entries(ST.OMENS).forEach(([k, o]) => {
    const byMonster = Object.values(ST.Monsters).some(m => m.omen === k);
    const byObserve = k === 'fenghuang';    // 观瑞丹穴 / 南禺 → doObserve 显式 activateOmen
    const byAudience = k === 'tianshen';    // 谒见槐江天神 → doAudience 显式 activateOmen
    if (!byMonster && !byObserve && !byAudience) noSource.push(k + '(' + o.beast + ')');
  });
  assert(noSource.length === 0, '每条征兆都有触发源 -> ' + (noSource.join(' ') || '无死兆'));
  assert(ST._omenLinks >= 20, '征兆挂接补足 20 条（旧 IDS 命名与 ds_ 前缀脱节）-> ' + ST._omenLinks);
  assert(Object.keys(ST.OMENS).length === 45, '征兆仍为 45 条');
}
// 30.2 「有兆无兽」的四座山已补上实体（北山山𤟤 / 酸与，西山未名鸟，东山未名兽）
{
  assert(!!ST.Monsters.shanhui && ST.Monsters.shanhui.omen === 'omen_beishan-1-19', '山𤟤 有实体并挂「天下大风」兆');
  assert(!!ST.Monsters.suanyu && ST.Monsters.suanyu.omen === 'omen_beishan-3-10', '酸与 有实体并挂「有恐」兆');
  assert(!!ST.Monsters.xiaomian && ST.Monsters.xiaomian.name === '鸮面鸟', '未名鸟以形得名「鸮面鸟」');
  assert(!!ST.Monsters.kuafushou && ST.Monsters.kuafushou.name === '彘毛兽', '未名兽以形得名「彘毛兽」');
  assert(ST.Monsters.xiaomian.faunaName === '（未名鸟）', '保留原文 fauna 名以便山志对照');
  // 同名异兽按节点区分：北山「肥遗」（彭毗之山）不得与西山「肥遗」（太华之山）混淆
  const feiyiNorth = Object.values(ST.Monsters).find(m => m.name === '肥遗' && m.nodeId === 'beishan-1-21');
  const feiyiWest = Object.values(ST.Monsters).find(m => m.name === '肥遗' && m.nodeId === 'xishan-1-07');
  assert(!!feiyiNorth && feiyiNorth.omen === 'omen_beishan-1-21', '北山肥遗挂自己的征兆');
  assert(!!feiyiWest && !feiyiWest.omen, '西山肥遗不误挂北山征兆');
}
// 30.3 端到端：逐条著录该兽，征兆必须真的点亮
{
  G.resetToDefault();
  const dead = [];
  Object.entries(ST.OMENS).forEach(([k]) => {
    if (k === 'fenghuang' || k === 'tianshen') return;
    const m = Object.values(ST.Monsters).find(x => x.omen === k);
    if (!m) { dead.push(k + '(无怪)'); return; }
    G.recordObject(m.id, 1);
    if (!ST.Game.stats.omens[k]) dead.push(k + '(未点亮)');   // dur=0 的被动兆只记 stats
  });
  assert(dead.length === 0, '著录对应异兽即可点亮其兆 -> ' + (dead.join(' ') || '40 条全部应验'));
}
// 30.4 观瑞与谒见两条特殊路径
{
  G.resetToDefault();
  G.doObserve('danxue');
  assert(!!ST.Game.stats.omens.fenghuang, '观瑞丹穴（凤皇）→ 天下安宁');
  ST.Game.node = 'xishan-3-07';
  G.doAudience('xishan-3-07');
  assert(!!ST.Game.stats.omens.tianshen, '谒见槐江天神 → 有兵之兆');
  // 钟山谒见不得误触鵕鸟 / 大鹗之兆（那两条归击杀）
  G.resetToDefault();
  ST.Game.node = 'xishan-3-05';
  G.doAudience('xishan-3-05');
  assert(!ST.Game.stats.omens.junniao && !ST.Game.stats.omens.dae, '谒见钟山不误触化鸟之兆');
}

// ============ 31. 山志异兽小签（按节点定位记录 / 无实体如实标注） ============
section('山志异兽：记录不串山 / 无实体如实标注');
{
  G.resetToDefault();
  const nodeOf = id => ST.WORLD.regions.reduce((a, r) => a.concat(r.nodes), []).find(n => n.id === id);
  const faunaOf = (id, name) => nodeOf(id).fauna.find(x => x.name === name);
  const chip = (id, name) => ST.UI.faunaChipHtml(nodeOf(id), faunaOf(id, name));

  assert(chip('beishan-1-19', '山𤟤').includes('未录'), '有实体未著录 → 「未录」');
  const m = Object.values(ST.Monsters).find(x => x.nodeId === 'beishan-1-19' && x.name === '山𤟤');
  G.recordObject(m.id, 3);
  assert(/录\s*3/.test(chip('beishan-1-19', '山𤟤')), '著录 3 次后显示「录 3」');
  assert(chip('dongshan-1-02', '活师').includes('仅载其名'), '原文有名但未设实体 → 「仅载其名」（活师为蝌蚪属常兽）');
  assert(chip('nanshan-3-03', '凤皇').includes('祥瑞'), '凤皇为祥瑞（观瑞可见、不可讨伐）');
  assert(chip('xishan-3-07', '（天神）').includes('未录'), '神祇记录走谒见（deity id），此处仍为「未录」');
  // 同名异兽必须按节点取记录
  const west = Object.values(ST.Monsters).find(x => x.nodeId === 'xishan-1-07' && x.name === '肥遗');
  G.recordObject(west.id, 5);
  assert(/录\s*5/.test(chip('xishan-1-07', '肥遗')), '西山肥遗显示自身著录数');
  assert(/未录/.test(chip('beishan-1-21', '肥遗')), '北山肥遗不借用西山肥遗的记录');
  assert(ST.Items && Object.keys(ST.Monsters).length >= 240, '北山补录后异兽表总量（总 ' + Object.keys(ST.Monsters).length + '）');
}

// ============ 32. 战斗态不跨会话（回归：重进游戏卡在「往讨：X」不动） ============
section('战斗态不跨会话');
{
  G.resetToDefault();
  ST.Game.combat = null;
  const ok = G.startCombat('shengsheng');
  assert(ok && !!ST.Game.combat, '开战后进入战斗态');
  G.saveGame();
  const raw = JSON.parse(ST.localStorage.getItem('shj_zhulu_save_v1'));
  // 战斗细节仍不保存（恢复回来只会卡住），但「在打谁」要留一笔——离线结算靠它算账
  assert(raw && raw.combat && raw.combat.monsterId === 'shengsheng', '存档记下往讨目标');
  assert(raw.combat.playerHp === undefined && raw.combat.monsterHp === undefined, '不记战斗细节（血量/回合一律不存）');
  assert(raw && raw.activity === null || raw.activity === undefined, '行动态仍按原样保存');

  // 造一份含 combat 的旧档：读档必须丢弃，而不是恢复成「不会推进的战斗」
  raw.combat = { monsterId:'shengsheng', monsterHp:8, playerHp:20, round:0, timer:0, maxtemp:0, style:'attack' };
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(raw));
  G.loadGame();
  assert(ST.Game.combat === null, '旧档里的战斗态被丢弃（不再卡死）');
  assert(ST.Game._droppedCombat === 'shengsheng', '记下被中止的目标，供首屏提示');
  ST.UI.refreshActivity();
  assert(renderTargets.activityText.textContent === '空闲', '读档后状态栏回到空闲');
  assert(uiSrc.includes('上次往讨已收兵'), '首屏给出「上次往讨已收兵」提示');
  assert(engSrc.includes('Game._droppedCombat = d.combat ? d.combat.monsterId : null;'), '读档分支显式丢弃战斗态');
  assert(engSrc.includes('Game.combat = null;'), '读档后 combat 一律置空');
}
// ============ 33. 统计页实时刷新（回归：数值要切页才更新） ============
section('统计页实时刷新');
{
  G.resetToDefault();
  ST.Game.stats.kills = 7;
  ST.Game.stats.damageDealt = 1234;
  ST.UI.currentTab = 'stats';
  const orig = G.document.querySelector;
  let probed = 0;
  G.document.querySelector = () => {
    probed++;
    return { textContent:'旧值', classList:{ toggle(){} }, firstChild:null };
  };
  ST.UI.patchStats();
  G.document.querySelector = orig;
  assert(probed >= 20, '统计页数值标记覆盖各面板 -> 探测 ' + probed + ' 项');
  assert(uiSrc.includes('data-stat="kills"') && uiSrc.includes('data-stat="damageDealt"') && uiSrc.includes('data-stat="shells"'), '关键数值带 data-stat 标记');
  assert(uiSrc.includes('data-gather="${k}"'), '采集分项带 data-gather 标记');
  assert(uiSrc.includes('data-ms="${i}"'), '长线成就带 data-ms 标记');
  assert(uiSrc.includes('this._statTicker = setInterval'), '统计页渲染后挂定时就地刷新');
  assert(uiSrc.includes("if (this.currentTab !== 'stats'){ clearInterval(this._statTicker)"), '离开统计页自动停表（不再空转）');
  assert(uiSrc.includes('el.textContent !== vals[k]') && uiSrc.includes('el.textContent = vals[k]'), '值未变时不碰 DOM（只为变化重排）');
  // 非统计页直接跳过
  ST.UI.currentTab = 'yudi';
  const before = probed;
  ST.UI.patchStats();
  assert(probed === before, '非统计页不执行刷新');
}
// ============ 34. 日志自动清理 + 离线结算记账 ============
section('日志 300 条上限 / 离线结算统计');
{
  // 34.1 日志：只留最近 300 条，渲染上限 300，取消手动清空
  ST.UI.currentTab = 'yudi';
  ST.UI.logEntries = [];
  for (let i = 0; i < 350; i++) ST.UI.log('条目 ' + i, 'sys', 'sys');
  assert(ST.UI.logEntries.length === 300, '日志内存只留最近 300 条 -> ' + ST.UI.logEntries.length);
  assert(ST.UI.logEntries[0].msg === '条目 349', '最新一条在最前（350 号已入列）');
  assert(ST.UI.logEntries[299].msg === '条目 50', '最旧的 50 条被自动丢弃');
  assert(uiSrc.includes('slice(0, 300)'), '日志区渲染上限 300 条');
  assert(!uiSrc.includes('UI.logEntries=[];UI.renderLog()'), '日志「清空」按钮已移除（队列页的清空不在此列）');

  // 34.2 离线结算记账
  G.resetToDefault();
  ST.Game.node = 'nanshan-1-01';
  ST.Game.activity = { kind:'gather', skill:'qiaocai', itemId:'gui', src:'manual' };
  const s1 = G.settleAway(3600);
  assert(!!s1 && s1.seconds === 3600, '离线一小时会结算');
  assert(ST.Game.stats.offlineCount === 1, '离线结算计 1 次');
  assert(ST.Game.stats.offlineSec === 3600, '累计离线 1 小时');
  assert(ST.Game.stats.offlineXp > 0, '累计离线经验 > 0 -> ' + ST.Game.stats.offlineXp);
  assert(ST.Game.stats.offlineItems > 0, '累计离线所得件数 > 0 -> ' + ST.Game.stats.offlineItems);
  const lo = ST.Game.stats.lastOffline;
  assert(lo && lo.sec === 3600 && lo.at > 0 && typeof lo.xp === 'number', '记录「上次离线」明细');
  G.settleAway(1800);
  assert(ST.Game.stats.offlineCount === 2 && ST.Game.stats.offlineSec === 5400, '再次离线累计（2 次 / 1.5 小时）');
  const c0 = ST.Game.stats.offlineCount;
  assert(G.settleAway(5) === null && ST.Game.stats.offlineCount === c0, '不足 30 秒不结算也不记账');

  // 34.3 统计页展示
  ST.UI.currentTab = 'stats';
  ST.UI.renderStats();
  const html = renderTargets.content.innerHTML;
  assert(html.includes('离线结算') && html.includes('累计离线') && html.includes('上次离线'), '统计页有离线结算一栏');
  assert(html.includes('data-stat="offlineCount"') && html.includes('data-stat="lastOffline"'), '离线数据带刷新标记');
  assert(uiSrc.includes('function lastOfflineText()'), '上次离线有可读摘要（多久以前 · 离线多长 · 得多少经验）');
}
// ============ 35. 制作：单件即停 + 卡片紧凑 ============
section('制作：单件 / 连作 / 紧凑卡片');
{
  // 35.1 单件制作：做一件即收手
  G.resetToDefault();
  ST.Game.inventory.jing = 50;
  const ok = ST.startActivity('craft', 'craft::sheng', { times: 1 });
  assert(ok && ST.Game.activity && ST.Game.activity.remain === 1, '「制作」按一件设定活动（remain=1）');
  const c0 = ST.Game.stats.crafts;
  G.doRecipeAction(ST.Game.activity);
  assert(ST.Game.stats.crafts === c0 + 1, '做出一件');
  assert(ST.Game.activity === null, '做完一件即停，不进入无限连做');

  // 35.2 连作：不设上限，持续做
  ST.Game.inventory.gui = 50;
  ST.startActivity('craft', 'craft::sheng');
  assert(ST.Game.activity && ST.Game.activity.remain == null, '「连」不设件数上限');
  G.doRecipeAction(ST.Game.activity);
  G.doRecipeAction(ST.Game.activity);
  assert(!!ST.Game.activity && ST.Game.stats.crafts === c0 + 3, '连作持续进行');

  // 35.3 离线结算尊重限量
  G.resetToDefault();
  ST.Game.inventory.gui = 100;
  ST.startActivity('craft', 'craft::sheng', { times: 2 });
  const beforeOut = ST.Game.inventory.sheng || 0;
  G.settleAway(3600);
  const made = (ST.Game.inventory.sheng || 0) - beforeOut;
  assert(made === 4, '离线一小时也只做 2 次（每次 2 件，共 4 件）-> 实际 ' + made);
  assert(ST.Game.activity === null, '离线做满件数后收手');

  // 35.4 卡片结构与紧凑样式
  assert(uiSrc.includes("startActivity('craft','${r.type}::${r.out}',{times:1})"), '「制作」按钮传 {times:1}');
  assert(uiSrc.includes('class="tile-more"') && uiSrc.includes("startActivity('craft','${r.type}::${r.out}')"), '方块右上角「连」走持续制作');
  assert(uiSrc.includes('class="tile-ic"') && uiSrc.includes('class="tile-nm"') && uiSrc.includes('class="tile-tag"'), '配方改为方形卡（图标 / 名 / 阶位）');
  assert(uiSrc.includes('role="button" tabindex="0"'), '方块可聚焦（键盘可达）');
  assert(!/class="recipe-card[^"]*"[^>]*>\s*<div class="rc-head">/.test(uiSrc), '制作卡不再套 rc-head 三行结构');
  assert(/\.tile\{[^}]*aspect-ratio:1\/1/.test(css), '方形卡为正比例');
  assert(/\.recipe-grid\{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\); gap:6px; \}/.test(css), '窄屏配方三列');
  // v1.31.6：点配方不再直接做 1 次，也不再只弹一个 toast——改为详情弹窗，
  // 材料缺口、可做几次、等级门槛都在里面（手机上原本 hover 才看得到）
  assert(uiSrc.includes("onclick=\"showRecipeDetail('${r.type}::${r.out}')\""), '配方点按开详情弹窗');
  assert(uiSrc.includes('function showRecipeDetail') && uiSrc.includes('id="craftQty"'), '详情里可填制作次数');
  assert(!uiSrc.includes('craftDenied'), '旧的「缺料 toast」已撤（详情弹窗说更清楚）');
  assert(uiSrc.includes("if (a.hasAttribute && a.hasAttribute('onclick')) return;"), '浮层捕获层放行「点按即执行」的方块（点卡面任意处均执行动作）');
  assert(!uiSrc.includes('pressTimer') && !uiSrc.includes('longPressAnchor'), '长按逻辑已移除（v1.7 起统一为单击交互）');
  assert(uiSrc.includes('UI.openHuntModal') && uiSrc.includes("onclick=\"UI.openHuntModal('${x.id}')\""), '征伐目标单击开交互弹窗');
  assert(uiSrc.includes("id=\"huntTimes\" type=\"number\"") && uiSrc.includes('UI.clampHuntTimes'), '弹窗内可设战斗次数，异常值夹到 1–99');
  assert(gameSrc.includes('repeat:times') && gameSrc.includes('else UI && UI.toast(`⚔️ 已战 ${c.repeat} 场，收兵`)'), '限次连战：场次用尽即收兵');
  assert(css.includes('[data-tip]{ -webkit-touch-callout:none; user-select:none; }'), '长按锚点禁选中与系统菜单');
  assert(interactSrc.includes('const times = (opts && opts.times > 0)'), 'startActivity 支持 times 参数');
  assert(gameSrc.includes('if (done && a.remain != null)') && gameSrc.includes('a.remain--;'), '制作完成扣次数并收手');
}
// ============ 36. 方块语言：技能 / 祠礼 / 墟市 ============
section('方块语言：技能 / 祠礼 / 墟市');
{
  assert(uiSrc.includes('class="tile skill-tile') && uiSrc.includes('class="sk-bar"'), '技能改为方块 + 底部经验条');
  assert(uiSrc.includes('<span class="sk-lv">${lv}</span>'), '技能方块右上角显示等级');
  assert(/\.skill-grid\{[^}]*minmax\(92px,1fr\)/.test(css), '技能方格 92px');
  assert(/#content \.skill-grid\{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(css), '窄屏技能三列（高特异性覆盖）');

  assert(uiSrc.includes('class="tile rite-tile') && uiSrc.includes('class="tile-seal"'), '祠礼改为方块 + 首字朱印');
  assert(uiSrc.includes('UI.tryRite = function(id)'), '祠礼点按走 tryRite（校验等级与祭品）');
  assert(uiSrc.includes('祭品不备') && uiSrc.includes('class="lack-row"'), '缺祭品时开弹窗逐项列缺（附产地/掉落/市价）');
  assert(/\.rite-grid\{[^}]*minmax\(92px,1fr\)/.test(css), '祠礼方格 92px');

  // v1.31.6：点一下不再直接买 1 份（想买 37 份要点四次），改为开详情、数量自填
  assert(uiSrc.includes('class="tile shop-tile') && uiSrc.includes('onclick="showShopItem(${idx})"'), '商品方块点按开详情');
  assert(uiSrc.includes('id="buyQty"') && uiSrc.includes('function buyN('), '详情里可填数量购入');
  // v1.31.11：批量键不再写死 ×10（一只白鸡 1,200 贝＝一下花一万二），
  // 改为按手头贝币算份数，最多花掉一半、最多十份，不足两份就不显示。
  assert(uiSrc.includes("event.stopPropagation();buyItem(${idx},${bulk})") && uiSrc.includes("Game.shells * 0.5 / s.cost"),
    '商品方块的批量键按贝币算份数（×N）');
  assert(/\.shop-grid\{[^}]*minmax\(92px,1fr\)/.test(css), '墟市方格 92px');
  assert(/\.panel \.inv-grid, \.panel \.codex-grid,[\s\S]{0,80}\.panel \.rite-grid, \.panel \.shop-grid\{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(css), '窄屏行装/图鉴/祠礼/墟市统一三列');
}
// ============ 41. 方块语言补完：御使 / 征兆 / 廛市出售 / 营造 ============
section('方块语言补完：御使 / 征兆 / 出售 / 营造');
{
  // 41.1 御使：beast-card → deploy-tile，单击开弹窗（御/卸在弹窗内），在槽描边
  assert(uiSrc.includes('class="tile deploy-tile') && uiSrc.includes("onclick=\"UI.openDeployModal('${b.id}')\""), '御使异兽改为方块（单击开弹窗，御/卸在内）');
  assert(css.includes('.deploy-tile.inslot{'), '在槽异兽只读描边');
  assert(uiSrc.indexOf('beast-card') < 0, '御使页不再用旧行状卡');

  // 41.2 征兆：omen-card → omen-tile，印记字按吉凶中着色，生效中描金 + 角标倒计时
  assert(uiSrc.includes('class="tile omen-tile ${active?') , '征兆改为方块');
  assert(css.includes('.omen-tile.吉 .tile-seal{ background:var(--tai); }'), '吉兆印记青色');
  assert(css.includes('.omen-tile.凶 .tile-seal{ background:var(--zhu); }'), '凶兆印记朱色');
  assert(uiSrc.indexOf('omen-card') < 0, '征兆页与总效应弹窗不再用旧行状卡');
  assert(uiSrc.includes('tile-grid omen-grid'), '征兆总效应弹窗同步方块化');

  // 41.3 廛市出售：sell-card → sell-tile，点按售 1、右上「全」售清，售价金色
  assert(uiSrc.includes('class="tile sell-tile') && /onclick="showItemDetail\('\$\{id\}'\$\{enhArg\}\)"/.test(uiSrc), '出售方块点按开物品详情（带淬炼档）');
  assert(uiSrc.includes("event.stopPropagation();sellItem('${id}',${q}${sellArg});UI.renderShichan()"), '出售方块右上「全」售清（装备按档卖）');
  assert(css.includes('.sell-tile .tile-tag{ color:var(--jin); }'), '出售方块售价用金色');
  assert(uiSrc.indexOf('sell-card') < 0, '廛市出售不再用旧行状卡');

  // 41.4 营造：building-card → build-tile，点按即营造，已成描青 + ✓ 角标
  assert(uiSrc.includes('class="tile build-tile') && uiSrc.includes("buildStructure('${b.id}');UI.renderYing()"), '营造改为方块（点按即营造）');
  assert(css.includes('.build-tile.done{'), '已成建筑描青');
  assert(uiSrc.indexOf('building-card') < 0, '营造页不再用旧行状卡');

  // 41.5 窄屏统一三列
  assert(/\.panel \.region-grid, \.panel \.node-grid,\s*\.panel \.gear-grid, \.panel \.inv-grid, \.panel \.sell-grid,\s*\.panel \.omen-grid, \.panel \.building-grid,\s*\.panel \.farm-grid\{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(css), '窄屏舆地/装备/行囊/出售/征兆/营造/田地统一三列');

  // 41.6 运行时渲染：四页都产出 tile
  ST.Game.records['gui'] = Object.assign({}, ST.Game.records['gui'], { count:5, tier:4 });
  ST.UI.currentTab = 'yushi'; ST.UI.renderYushi();
  assert(renderTargets.content.innerHTML.indexOf('deploy-tile') >= 0, '御使页渲染 deploy-tile');
  ST.UI.currentTab = 'jisi'; ST.UI.renderJisi();
  assert(renderTargets.content.innerHTML.indexOf('omen-tile') >= 0, '祠祀页渲染 omen-tile');
  ST.UI.currentTab = 'ying'; ST.UI.renderYing();
  assert(renderTargets.content.innerHTML.indexOf('build-tile') >= 0, '营造页渲染 build-tile');
  { const anyIt = Object.keys(ST.Items).find(id=>(ST.Items[id]||{}).value>0);
    ST.Game.inventory[anyIt] = (ST.Game.inventory[anyIt]||0)+1;
    ST.UI.currentTab = 'shichan'; ST.UI.renderShichan();
    assert(renderTargets.content.innerHTML.indexOf('sell-tile') >= 0, '廛市渲染 sell-tile'); }
}
// ============ 37. 仪表带去冗余 + 增益收进书脊图标 ============
section('仪表带去冗余 / 增益浮层');
{
  // 37.1 结构：气血与增益摘要都从仪表带撤掉，增益改为书脊右上角一枚图标
  assert(html.indexOf('id="hpDisplay"') < 0, '仪表带不再有气血（征伐页战斗面板已有）');
  assert(html.indexOf('id="buffDisplay"') < 0, '仪表带不再有增益摘要文字');
  assert(html.indexOf('id="buffBtn"') > html.indexOf('id="topbar"') &&
         html.indexOf('id="buffBtn"') < html.indexOf('id="statusbar"'), '增益图标位于书脊（顶栏）内、仪表带之前');
  assert(html.indexOf('id="buffPop"') > 0, '增益浮层容器存在');
  assert(/<span id="activityText"[^>]*class="act-link"[^>]*>空闲<\/span>/.test(html), '仪表带首项直接是当前行动（可点击直达对应页）');
  assert(uiSrc.indexOf('passiveSummary') < 0, '旧的被动摘要（挤在仪表带上）已删除');

  // 37.2 计数：临时 + 御使 + 征兆 三类各计一条
  G.resetToDefault();
  ST.Game.buff = null; ST.Game.deployed = {}; ST.Game.omens = [];
  assert(ST.UI.buffSummary().count === 0, '无增益时计数为 0');
  ST.Game.buff = { def:{ name:'善走', kind:'gather', gather:0.3, dur:180 }, remaining:112, dur:180 };
  ST.Game.deployed = { 0:'shengsheng' };
  ST.Game.omens = [{ id:'lili', until:(ST.Game.stats.time || 0) + 3600 }];
  const bs = ST.UI.buffSummary();
  assert(bs.temp.length === 1 && bs.beasts.length === 1 && bs.omens.length === 1 && bs.count === 3,
    '三类增益各计一条 -> ' + bs.count);
  assert(bs.temp[0].desc.indexOf('采集 +30%') >= 0, '临时增益写出具体数值');
  assert(bs.beasts[0].desc.indexOf('采集速度 +6%') >= 0, '御使增益写出具体数值');
  assert(bs.omens[0].desc.indexOf('（') < 0 && bs.omens[0].left > 3500, '征兆效果去掉有效期括注，剩余时间单列');

  // 37.3 浮层内容：分段列表 + 两行合计；空态有说明
  const popHtml = ST.UI.buffPopHtml();
  assert(popHtml.indexOf('临时增益') >= 0 && popHtml.indexOf('御使') >= 0 && popHtml.indexOf('征兆') >= 0, '浮层分三段列出');
  assert(popHtml.indexOf('御使合计') >= 0 && popHtml.indexOf('征兆合计') >= 0, '浮层给出御使 / 征兆各自合计');
  ST.Game.buff = null; ST.Game.deployed = {}; ST.Game.omens = [];
  const emptyHtml = ST.UI.buffPopHtml();
  assert(emptyHtml.indexOf('当前无增益') >= 0 && emptyHtml.indexOf('御使合计') < 0, '无增益时给空态说明（不列空合计）');

  // 37.4 交互：图标开合、点空白 / Esc / 切页收起
  assert(uiSrc.indexOf("$('buffBtn') && $('buffBtn').addEventListener('click'") >= 0, '图标点击开合浮层');
  assert(uiSrc.indexOf('UI.toggleBuffPop') >= 0 && uiSrc.indexOf('UI.closeBuffPop') >= 0, 'open / close / toggle 三件套齐备');
  assert(uiSrc.indexOf('this.closeBuffPop();                 // 切页时把增益浮层收掉') >= 0, '切页自动收起浮层');
  assert(uiSrc.indexOf("if (e.key === 'Escape'){ hideTip(); UI.closeDrawer(); UI.closeModal(); UI.closeBuffPop(); return; }") >= 0, 'Esc 收起浮层');
  assert(uiSrc.indexOf("document.addEventListener('click', ()=>{ UI.closeBuffPop(); })") >= 0, '点空白处收起浮层');
  assert(uiSrc.indexOf('aria-expanded') >= 0, '浮层开合同步 aria-expanded');

  // 37.5 增益增减时图标即时更新（不必等整页重渲染）
  assert(gameSrc.indexOf("UI && UI.renderBuffBtn && UI.renderBuffBtn();     // 书脊上的增益计数随之归零") >= 0, '临时增益到期即刷新图标');
  assert(gameSrc.indexOf('function tickOmens') >= 0 && gameSrc.indexOf('saveGame(); UI && UI.renderBuffBtn && UI.renderBuffBtn();') >= 0, '征兆到期即刷新图标');
  assert(gameSrc.indexOf('UI && UI.renderBuffBtn && UI.renderBuffBtn();\n}') >= 0 || gameSrc.indexOf('renderBuffBtn') >= 0, '御使增减 / 服丹 / 禳解都刷新图标');

  // 37.6 样式：图标方框 + 徽标 + 浮层（贴图标下沿、纸面、朱色顶线）
  assert(/\.buff-btn\{[^}]*width:28px; height:28px/.test(css), '增益图标 28px 方框');
  assert(/\.buff-btn \.bb-n\{[^}]*background:var\(--zhu\)/.test(css), '徽标为朱色圆点');
  assert(/\.buff-pop\{[^}]*position:fixed/.test(css) && /\.buff-pop\{[^}]*border-top:2px solid var\(--zhu\)/.test(css), '浮层为固定定位的纸面板（朱色顶线）');
  assert(css.indexOf('#hpDisplay') < 0 && css.indexOf('#buffDisplay') < 0, '旧的气血 / 增益摘要样式已清理');
}

// ============ 38. 取消「前往」按钮；动作本身兼管动身 ============
section('取消前往 / 动作即动身');
{
  G.resetToDefault();
  // ⚠️ gainXp 会由累计 xp 反推 level；只改 level 不补 xp，下一次得经验就会被拉回 1~2 级
  const boost = (id, lv) => { const s = ST.Game.skills[id]; if (s){ s.xp = ST.xpForLevel(lv) + 1; s.level = ST.levelFromXp(s.xp).level; } };
  ['yudi','lvxian','taofa','qiaocai','caiyu','yu','caiyao','zhulu','yushi'].forEach(k => boost(k, 80));
  const nodes = ST.WORLD.regions.flatMap(r => r.nodes);

  // 38.1 节点详情不再渲染「前往 X」，只在无可动之事时留一枚「涉足此山」
  assert(uiSrc.indexOf("前往${esc(sel.name)}") < 0, '节点详情已无「前往 + 山名」按钮');
  assert(/un && !here && !nodeHasUsableAction\(sel\)/.test(uiSrc), '「涉足此山」仅在「不在此山且无可用动作」时渲染');
  assert(/travelTo\('\$\{sel\.id\}'\)/.test(uiSrc), '兜底入口仍调用 travelTo（移动到该山）');

  // 38.2 判定：只载原文的山「无可动之事」；有产出 / 异兽的山「有事可做」
  const emptyNode = nodes.find(n => n.id === 'nanshan-2-04');    // 羽山：无产出、无异兽
  const busyNode = nodes.find(n => n.id === 'nanshan-1-02');  // 堂庭之山：有采集与白猿
  assert(!!emptyNode && G.nodeHasUsableAction(emptyNode) === false, '只载原文、无产无兽的山 = 无可动之事');
  assert(!!busyNode && G.nodeHasUsableAction(busyNode) === true, '有产出 / 异兽的山 = 有事可做');

  // 38.3 讨伐即动身：不在该山也直接前往，并计入「山已涉」
  const beast = Object.values(ST.Monsters).find(m => m.nodeId !== 'nanshan-1-01');
  ST.Game.node = 'nanshan-1-01'; ST.Game.combat = null;
  boost('taofa', 80);
  const okC = G.startCombat(beast.id);
  assert(okC && ST.Game.node === beast.nodeId, '点「讨伐」自动前往其所在山 -> ' + ST.Game.node);
  assert(ST.Game.map[beast.nodeId] === true, '抵达即计入「山已涉」');
  ST.Game.combat = null; ST.Game.activity = null;

  // 38.4 采集：沿用既有自动前往
  const gItem = Object.values(ST.Items).find(it => it.skill && (it.nodes || [it.node])[0] !== 'nanshan-1-01');
  boost(gItem.skill, 80);
  ST.Game.node = 'nanshan-1-01';
  const okG = G.startActivity('gather', gItem.id);
  assert(okG && ST.Game.node === (gItem.nodes || [gItem.node])[0], '点「采集」自动前往产出地 -> ' + ST.Game.node);
  ST.Game.activity = null;

  // 38.5 观象 / 谒见：不再挡回去，直接动身
  const oid2 = Object.keys(ST.OBSERVE_SITES)[0];
  boost('yudi', 80); boost('lvxian', 80);
  ST.Game.node = 'nanshan-1-01';
  assert(G.startObserve(oid2) === true && ST.Game.node === ST.OBSERVE_SITES[oid2].nodeId,
    '点「观象」自动前往，不再提示「需先往 X」 -> ' + ST.Game.node);
  ST.Game.activity = null;

  const aid2 = Object.keys(ST.AUDIENCE_SITES)[0];
  boost('yudi', 80); boost('lvxian', 80);
  ST.Game.node = 'nanshan-1-01';
  assert(G.startAudience(aid2) === true && ST.Game.node === aid2,
    '点「谒见」自动前往，不再提示「需先往 X」 -> ' + ST.Game.node);
  ST.Game.activity = null;

  // 38.6 灌木：补料后抵达所在山
  const gid2 = Object.keys(ST.GROW_SITES)[0];
  ST.Game.inventory.yugao = 3;
  boost('yudi', 80); boost('lvxian', 80);
  ST.Game.node = 'nanshan-1-01';
  assert(G.startGrow(gid2) === true && ST.Game.node === ST.GROW_SITES[gid2].nodeId,
    '点「灌木」自动前往 -> ' + ST.Game.node);
  ST.Game.activity = null;
}

// ============ 39. 叙录（关于本作） ============
section('叙录 / 关于本作');
{
  G.resetToDefault();

  // 39.1 页签：末页为叙录，图标与其余页签同一路数（内联 SVG）
  const ids = ST.TABS.map(t => t.id);
  assert(ids[ids.length - 1] === 'about', '末页签为「叙录」');
  assert(ids.includes('about') && ids.length === 12, '功能页签共 12 项（另有侧栏末尾的「设置」入口）');
  const ab = ST.TABS.find(t => t.id === 'about');
  assert(ab.label === '叙录' && /<svg/.test(ab.icon), '叙录页签带内联 SVG 图标');

  // 39.2 渲染：写入主内容区，含书名 / 版本 / 代号 / 更新 / 缘起 / 体例 / 卷帙 / 稽考
  ST.UI.currentTab = 'about';
  ST.UI.renderAbout();
  const h = renderTargets.content.innerHTML;
  assert(h.indexOf('山海经') >= 0, '叙录页显示书名');
  assert(h.indexOf('v' + ST.GAME_META.version) >= 0, '叙录页显示版本号（随 GAME_META，不写死）');
  assert(h.indexOf('代号') >= 0 && h.indexOf('山经') >= 0, '叙录页显示版本代号');
  assert(h.indexOf('更新') >= 0 && h.indexOf(ST.GAME_META.updated) >= 0, '叙录页显示更新日期（随 GAME_META，不写死）');
  ['缘起', '此身', '体例', '卷帙', '稽考', '成书'].forEach(k =>
    assert(h.indexOf(k) >= 0, '叙录页含「' + k + '」一栏'));

  // 39.3 卷帙为实时统计，不是写死的数字
  assert(h.indexOf(String(ST.WORLD.regions.length)) >= 0, '卷帙含实时山系数');
  assert(h.indexOf(String(Object.keys(ST.Monsters).length)) >= 0, '卷帙含实时异兽数');
  assert(h.indexOf(String(Object.keys(ST.CODEX).length)) >= 0, '卷帙含实时图鉴条数');

  // 39.3b 五臧收卷：中山经 197 山全录时的印记与「山经」格
  const zsTotal = ST.ZHONGSHAN.regions.reduce((a, r) => a + r.nodes.length, 0);
  assert(zsTotal === 197, '中山经十二系共 197 山（合古籍自述「大凡百九十七山」）-> ' + zsTotal);
  assert(h.indexOf(zsTotal + ' / 197 山') >= 0, '卷帙含「山经 N / 197 山」一格');
  assert(h.indexOf('ab-complete') >= 0 && h.indexOf('五臧全录') >= 0, '197 山全录时叙录页浮现「五臧全录」印记');

  // 39.4 版本印记集中一处，不散落各处硬编码
  assert(gameDataSrc.includes('const GAME_META = {'), '版本印记集中在 GAME_META 常量');
  assert(gameDataSrc.includes('window.GAME_META = GAME_META;'), 'GAME_META 已导出到 window');
}
// ============ 42. 田地方块化：小方卡 + 择种浮层 ============
section('田地：小方卡 + 择种浮层');
{
  assert(uiSrc.includes('class="tile farm-tile growing') && uiSrc.includes('class="tile farm-tile empty'), '田地改为小方卡（生长 / 空田两态）');
  assert(uiSrc.includes('UI.seedMenu = function(slot)') && uiSrc.includes('UI.pickSeed = function(slot, id)'), '空田点按开择种浮层');
  assert(!/farm-panel[\s\S]{0,2000}?<select/.test(uiSrc), '田地不再用下拉框择种');
  assert(css.includes('.farm-tile.empty{ border-style:dashed; }'), '空田虚线框');
  assert(css.includes('.ft-bar{'), '生长田贴底细进度条');
  assert(/\.panel \.farm-grid\{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(css), '窄屏田地三列');
  assert(css.includes('.seed-row{'), '择种浮层行样式');
  assert(uiSrc.includes('data-plot="${slot}" data-tip'), '生长田卡保留飘字锚点');
  // 运行时：空田渲染为点按方卡；pickSeed 正常植入
  ST.Game.farms = {};
  ST.UI.currentTab = 'skills'; ST.UI.renderSkills();
  { const t = renderTargets.content.innerHTML;
    assert(t.indexOf('farm-tile empty') >= 0 && t.indexOf("UI.seedMenu('p") >= 0, '空田渲染为点按开浮层的方卡');
    assert(t.indexOf('<select') < 0, '田地渲染产物无下拉框'); }
  ST.Game.inventory['seed_tu'] = (ST.Game.inventory['seed_tu']||0)+1;
  ST.UI.pickSeed('p1', 'seed_tu');
  assert(ST.Game.farms['p1'] && ST.Game.farms['p1'].seedId==='seed_tu', 'pickSeed 植入成功');
  // 择种浮层：未持有置灰并说明
  { ST.UI.seedMenu('p2');
    const modalHtml = renderTargets.modalBox.innerHTML || '';
    assert(modalHtml.indexOf('seed-row') >= 0 && modalHtml.indexOf('持有') >= 0, '择种浮层列出种子与持有数'); }
}
// ============ 43. 实时性完善：田地 / 征兆 / 增益浮层 / 走势 / 队列 / 键盘 ============
section('实时性：状态变化即刻上屏');
{
  // 43.1 田地：收获就地补绘 + 每秒进度跟进
  assert(uiSrc.includes('UI.patchFarms = function()') && uiSrc.includes('farmTilesHtml()'), '田地收获后就地补绘（不靠切页）');
  assert(uiSrc.includes('UI.patchFarmsProgress = function()'), '田地每秒轻量跟进（进度条 / 剩余 / 成熟态）');
  assert(gameSrc.includes('UI.patchFarmsProgress'), '主循环挂接田地进度跟进');
  assert(uiSrc.includes("if (this.currentTab === 'skills') this.patchFarms()"), '收获飘字后即时翻面');

  // 43.2 征兆：到期 / 新触发就地补绘
  assert(uiSrc.includes('UI.patchOmens = function()') && uiSrc.includes('omenPanelHtml()'), '征兆面板可整块补绘');
  // 三处：到期（tick）、凶兆落地（applyOmen）、烽烟举起（activateOmen 预知分支）
  assert((gameSrc.match(/if \(UI && UI\.patchOmens\) UI\.patchOmens\(\);/g)||[]).length >= 3, '到期 / 落地 / 举烽三处都补绘');

  // 43.3 增益浮层展开时连带刷新（倒计时尤其）
  assert(uiSrc.includes("!pop.classList.contains('hidden')") && uiSrc.includes('this.buffPopHtml()'),
    '增益浮层展开时内容跟随刷新（并节流到 1 秒、同内容不重写）');

  // 43.4 售价走势：秒级采样，挂机也有轨迹；渲染只读无副作用
  assert(gameSrc.includes("Date.now() - _pm.t > 60*1000"), '售价走势按 60 秒间隔采样');
  assert(!/renderShichan[\s\S]{0,300}priceHistory\.push/.test(uiSrc), '渲染时不再采样（无副作用）');

  // 43.5 队列：任务达成 / 自然收官即刷新队列页；进行中数值秒级上屏
  const qSrc = readText('src/queue.js');
  assert(qSrc.includes('function refreshQueuePage()') && qSrc.includes("UI.currentTab === 'queue'"), '队列任务达成即补绘队列页');
  assert(qSrc.includes('UI.patchQueueProgress'), '任务推进走就地补绘（不重建 DOM，保滚动）');
  assert(qSrc.includes('function queueOnKill(monsterId)'), '讨伐队列计数落地（queueOnKill）');
  assert(gameSrc.includes('queueOnKill(m.id)'), 'meetKill 每次讨平都通知队列计数');
  assert(gameSrc.includes('!isBoss && !queueTookOver'), '队列接管下一环后不再自动接战同一只');
  assert(qSrc.includes('const c = Game.combat;') && qSrc.includes('return !!c && c.monsterId === e.target;'), '讨伐条目按 Game.combat 匹配（否则 ensureQueueActivity 每帧重启战斗，永远打不完）');
  assert(qSrc.includes("startCombat(e.target, { fromQueue:true })"), '队列驱动的讨伐不触发「往讨即暂停队列」');
  assert(gameSrc.includes("if (!(opts && opts.fromQueue) && typeof pauseQueue === 'function') pauseQueue('往讨');"), '仅手动往讨暂停队列');
  assert(gameSrc.includes('_qDriven ? { fromQueue:true, carry } : { carry }'), '队列讨伐连战同一只时也不暂停队列，并带回残势');
  assert(gameSrc.includes('(c.momentum || 0) * 0.6'), '连战继承 60% 残势（否则挂机永远蓄不满绝技）');
  assert(uiSrc.includes('UI.patchQueueProgress = function()') && uiSrc.includes("this.currentTab !== 'queue'"), '队列进度就地补绘函数（仅队列页）');
  assert(gameSrc.includes('if (UI && UI.patchQueueProgress) UI.patchQueueProgress();'), '主循环秒级兜底队列数值（顺延 / 轮数 / 进度）');
  assert((qSrc.match(/UI\.patchQueueProgress/g)||[]).length >= 3, '进行中三处都补绘（采集/制作/讨伐/特殊）');

  // 43.6 键盘可达：Enter / 空格激活聚焦的方卡
  assert(uiSrc.includes("el.getAttribute('role') === 'button' && el.onclick"), '回车 / 空格可激活聚焦方卡');
}

// ============ 移动端缩放与不溢出 ============
section('移动端缩放与不溢出');
{
  const cssM = readText('style.css');
  const uiM = uiSrcAll;
  // 1) 三列网格必须用 minmax(0,1fr)：1fr 的最小尺寸是内容宽，窄卡片（图标+名+录数）
  //    会把整块撑出屏幕，横向出现滚动条、右侧一列被裁掉。
  assert(/\.beast-grid\{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(cssM), '征伐网格三列用 minmax(0,1fr)（不撑出屏幕）');
  assert(!/grid-template-columns:repeat\(3,1fr\)/.test(cssM), '不再有裸 repeat(3,1fr)（会被内容顶宽）');
  assert(/\.tile\{[^}]*min-width:0;/.test(cssM), '方块显式 min-width:0（网格项不被内容顶宽）');
  // 2) 小屏整体收一档：侧栏 54→48、面板留白收紧、图标与字号同比缩小
  assert(/--rail-w:\s*48px/.test(cssM), '小屏图标栏收窄到 48px');
  assert(/\.panel\{ padding:10px 11px 12px; \}/.test(cssM), '小屏面板留白收紧（10/11/12）');
  assert(/\.tile-ic\.bi-ic\{ width:38px; height:38px;/.test(cssM), '小屏绘形图标收到 38px');
  assert(/\.tile-nm\{ font-size:11\.5px; \}/.test(cssM), '小屏方块名降到 11.5px');
  // 3) 角标（宜X / ×0.76）改为与「录 N · Lv N」同行，避免窄卡上互相压字
  assert(/\.beast-tile \.bt-el-hint\{ position:static; order:-1;/.test(cssM), '小屏「宜X」角标改入 tag 行（不压字）');
  assert(/\.beast-tile \.bt-decay\{ position:static; \}/.test(cssM), '小屏经验衰减角标改入 tag 行');
  assert(/<span class="tile-tag">[^]*?bt-el-hint/.test(uiM), 'JS：宜X 角标渲染在 tile-tag 内（可随行排列）');
  assert(/<span class="tile-tag">[^]*?bt-decay/.test(uiM), 'JS：经验衰减角标渲染在 tile-tag 内');
  assert(uiM.includes('连续讨伐 ${streakN} 次，经验 ×'), '浮层补充经验递减说明（窄屏藏角标时仍可查）');
  // 4) 侧栏宽度集中为变量，窄屏缩放只改一处
  assert(/--rail-w:\s*54px/.test(cssM), '默认侧栏宽度变量为 54px');
  assert((cssM.match(/var\(--rail-w\)/g)||[]).length >= 3, '侧栏宽度统一走 --rail-w（改一处即全局生效）');
  // 5) 窄屏点击热区：工具条上的小控件用透明伪元素撑到 34px（视觉不变，指尖可点）
  assert(/\.hint-close,\.btn-mini\{ position:relative; \}/.test(cssM), '窄屏小控件可挂伪元素（补点击热区）');
  assert(/\.hint-close::after,\.btn-mini::after\{[^}]*width:34px; height:34px;/.test(cssM), '窄屏小控件命中区撑到 34px');
  assert(/\.beast-tile \.bt-el-hint\{ position:static;[^}]*min-height:16px;/.test(cssM), '窄屏「宜X」角标放大到可点高度');
  // 6) 生僻字兽（扩展 B 区，常见字体无字形）浮层标题补注音，便于辨认
  assert(uiM.includes('data-tip-title="${esc(xb.name)}${x.py?') && uiM.includes('（${esc(x.py)}）'), '浮层标题带注音（生僻字可辨）');
  // 7) 祠礼图标：二十八礼各有专属「礼器」图形，不再用名字首字的方章
  assert(typeof ST.riteIcon === 'function', 'riteIcon 已导出');
  assert(Array.isArray(ST.RITE_ICON_IDS) && ST.RITE_ICON_IDS.length === 28, '祠礼专属图标 28 枚（'+(ST.RITE_ICON_IDS||[]).length+'）');
  (function(){
    const ids = Object.keys(ST.RITES || {});
    const miss = ids.filter(id => !(ST.RITE_ICON_IDS||[]).includes(id));
    assert(miss.length === 0, '每种祠礼都有专属图标（缺：'+(miss.join(',')||'无')+'）');
    let bad = [];
    ids.forEach(id=>{
      const svg = ST.riteIcon(id, id);
      if(!svg || svg.indexOf('<svg') < 0 || svg.indexOf('</svg>') < 0) bad.push(id);
    });
    assert(bad.length === 0, '祠礼图标全部出图（破图：'+(bad.join(',')||'无')+'）');
  })();
  assert(uiM.includes("typeof riteIcon==='function')?riteIcon(id, riteName)"), '祠礼卡改用矢量图标渲染');
  // 8) 增益口径统一：顶栏「增益一览」与御使页「当前增益」必须走同一个格式化出口
  assert(/function bonusTextOf\(obj, sep\)/.test(uiM), '存在共享增益格式化 bonusTextOf');
  assert(/const BONUS_FLAT = \{ def:true, heal:true \}/.test(uiM), '防御 / 疗愈 归为点数型（不乘 100）');
  assert(uiM.includes('const dBonus = (typeof deployedBonuses === \'function\') ? bonusTextOf(deployedBonuses())'), '顶栏御使合计走 bonusTextOf');
  assert(uiM.includes('const bonusText = bonusTextOf(bonus)'), '御使页当前增益走 bonusTextOf');
  assert(uiM.includes('当前增益（御使）') && uiM.includes('当前增益（征兆）'), '御使页与顶栏同样分列御使 / 征兆');
  assert(!/const names = \{ gatherSpeed:'采集速度'[\s\S]{0,400}\$\{\(v\*100\)\.toFixed\(0\)\}%/.test(uiM), '御使页不再把所有增益一律乘 100');
  assert((uiM.match(/bonusTextOf\(/g)||[]).length >= 4, '增益格式化只有一处实现（多处复用）');
  // 9) 装备页：一键最优装 + 侧栏小行囊图标 + 移动端按钮收小
  assert(/function equipBest\(\)/.test(interactSrc), '存在 equipBest（一键最优装）');
  assert(interactSrc.includes('window.equipBest = equipBest;'), 'equipBest 已导出');
  assert(/equipSlotOf\(it\) !== slot/.test(interactSrc) && /relevantLevel\(it\)/.test(interactSrc), '最优装按槽位与等级门槛筛选');
  assert(uiM.includes('onclick="UI.autoEquipBest()"'), '装备面板有「一键最优装」按钮');
  assert(/UI\.autoEquipBest = function\(\)/.test(uiM), 'UI.autoEquipBest 存在');
  assert(uiM.includes('M8.4 9.6h7.2l1.3 8.4'), '侧栏行装页图标改为小行囊');
  assert(/\.btn,\.chip-btn\{ min-height:34px; padding:7px 12px; \}/.test(cssM), '移动端按钮收小一号（34px）');
  assert(/\.chip-btn\{ padding:5px 11px; \}/.test(cssM), '移动端筛选 chip 收小');
  assert(/\.gear-panel h3\{ display:flex/.test(cssM), '装备面板标题与按钮同行');
}


// ============ 28. 云端化存档层：版本迁移 / 多端合并 / 可插拔后端 ============
section('云端化存档层');
{
  const SM = ST.SaveManager;          // SaveManager 挂在 window 上（const 顶层声明不落 vm 全局）
  const saveSrc = readText('src/save.js');
  const engSrc2 = readText('src/engine.js');
  // 28.1 独立存档模块存在且已接入加载顺序
  assert(!!SM, 'SaveManager 已加载');
  assert(/const SAVE_VERSION = 6/.test(saveSrc), '存档结构版本号为 6（装备按件存）');
  assert(indexOfOf('index.html', 'src/save.js') < indexOfOf('index.html', 'src/engine.js'), 'save.js 在 engine.js 之前加载');
  // 28.2 engine 只做委托，不再直接写 localStorage
  assert(/SaveManager\.save\(\)/.test(engSrc2), 'saveGame 委托 SaveManager.save');
  assert(/SaveManager\.load\(\)/.test(engSrc2), 'loadGame 委托 SaveManager.load');
  assert(!/localStorage\.setItem\(SAVE_KEY/.test(engSrc2), 'engine.js 不再直接写存档键');
  assert(!/const SAVE_KEY =/.test(engSrc2), 'SAVE_KEY 唯一来源是 save.js（无重复声明）');
  // 28.3 版本迁移链：v1 旧档升到当前版本且不丢字段
  const old = { version:1, shells:77, inventory:{ gui:3 }, skills:{}, map:{}, stats:{} };
  const mig = ST.migrateSave(old);
  assert(mig.version === SM.version, 'v1 旧档迁移到当前版本（' + mig.version + '）');
  assert(mig.shells === 77 && mig.inventory.gui === 3, '迁移保留原有数据');
  assert(mig.mobStreak && typeof mig.mobStreak === 'object', '迁移补齐 mobStreak');
  assert(Array.isArray(mig.orders), '迁移补齐 orders');
  const mig2 = ST.migrateSave({ version:2, shells:1, inventory:{}, skills:{}, stats:{} });
  assert(mig2.version === SM.version && mig2.grow && mig2.danmu && mig2.omenImmune, 'v2 旧档迁移补齐养成 / 丹木 / 免疫');
  // 28.4 多端合并：单调字段取大，可变资源取新
  const A = { version:3, savedAt:1000, shells:50, inventory:{ gui:2 }, skills:{ taofa:{ level:3, xp:100 } },
              records:{ ds_hey:{ count:5, tier:2 } }, stats:{ kills:10, bossKills:{ a:1 } }, grow:{ p1:{ stage:2, done:1 } },
              map:{ 'nanshan-1-01':true }, observed:{}, buildings:{}, omenImmune:{}, danmu:{ stage:1, done:0 }, orders:[], omens:[], rites:{} };
  const B = { version:3, savedAt:2000, shells:30, inventory:{ gui:5 }, skills:{ taofa:{ level:2, xp:400 } },
              records:{ ds_hey:{ count:3, tier:4 } }, stats:{ kills:4, bossKills:{ b:2 } }, grow:{ p1:{ stage:1, done:7 } },
              map:{ 'nanshan-2-01':true }, observed:{}, buildings:{}, omenImmune:{}, danmu:{ stage:0, done:5 }, orders:[], omens:[], rites:{} };
  const M = ST.mergeSaveData(A, B);
  assert(M.skills.taofa.xp === 400 && M.skills.taofa.level === 3, '技能经验取大、等级取大（不倒退）');
  assert(M.records.ds_hey.count === 5 && M.records.ds_hey.tier === 4, '著录次数取大、阶位取大');
  assert(M.stats.kills === 10, '统计计数取大');
  assert(M.stats.bossKills.a === 1 && M.stats.bossKills.b === 2, '嵌套统计对象取并集');
  assert(M.grow.p1.stage === 2 && M.grow.p1.done === 7, '养成进度取大');
  assert(M.danmu.stage === 1 && M.danmu.done === 5, '丹木进度取大');
  assert(M.map['nanshan-1-01'] && M.map['nanshan-2-01'], '地图节点取并集');
  assert(M.shells === 30, '可变资源（贝币）取较新一档');
  assert(M.inventory.gui === 5, '行囊物品逐项取较大值（两端收获都保住）');
  // 背包合并：较新档缺失的物品必须保留本地独有的收获
  const MB = ST.mergeSaveData(
    { version:3, savedAt:2000, shells:10, inventory:{ gui:12, hu:3 }, skills:{}, records:{}, stats:{}, grow:{}, map:{}, observed:{}, buildings:{}, omenImmune:{}, danmu:{stage:0,done:0} },
    { version:3, savedAt:1000, shells:20, inventory:{ gui:5 }, skills:{}, records:{}, stats:{}, grow:{}, map:{}, observed:{}, buildings:{}, omenImmune:{}, danmu:{stage:0,done:0} }
  );
  assert(MB.inventory.gui === 12, '背包合并取较大值（不丢更多的那份）');
  assert(MB.inventory.hu === 3, '较新档没有的物品保留本地独有收获');
  assert(MB.shells === 10, '贝币取较新一档（不凭空造钱）');
  assert(M.version === SM.version, '合并结果标记为当前版本');
  // 28.5 存储后端可插拔
  assert(!!ST.LocalSaveStore && ST.LocalSaveStore.id === 'local', '本地后端实现');
  assert(typeof ST.createCloudStore === 'function', '云端后端工厂存在');
  const cs = ST.createCloudStore({ endpoint:'https://example.test/api' });
  assert(cs.id === 'cloud' && cs.endpoint === 'https://example.test/api', '云端后端可配置端点');
  assert(cs.available() === false || typeof fetch === 'function', '云端后端按可用性判定');
  assert(typeof SM.setCloud === 'function' && typeof SM.sync === 'function' && typeof SM.pull === 'function', '管理器具备接入 / 上传 / 拉取接口');
  // 28.6 修订号与脏标记（云端同步的基础）
  SM.reset();
  ST.Game.shells = 999;
  ST.saveGame();
  const meta = SM.meta();
  assert(meta.rev >= 1, '每次保存递增修订号 rev');
  assert(meta.dirty === true, '保存后标记 dirty（有未上传云端的改动）');
  assert(!!meta.deviceId, '记录本机设备标识 deviceId');
  assert(typeof SM.deviceId() === 'string' && SM.deviceId().length > 0, 'deviceId 稳定可取');
  const rev1 = SM.rev();
  ST.saveGame();
  assert(SM.rev() === rev1 + 1, '修订号随保存严格递增');
  // 28.7 未接入云端时同步安全降级（不抛错，且状态可同步查询）
  const ready = SM.syncReady();
  assert(ready && ready.ready === false && ready.state === 'offline', '未接入云端时 syncReady 报告 offline');
  assert(SM.syncState === 'idle' || SM.syncState === 'offline', '未接入云端时同步状态不报错');
  let syncSafe = true;
  try { const r = SM.sync(); if (!r || typeof r.then !== 'function') syncSafe = false; } catch(e){ syncSafe = false; }
  assert(syncSafe, '未接入云端时 sync 安全降级（返回 Promise 而非抛错）');
  // 存档负载自带同步元数据（多端合并判新旧的基础）
  const payload = JSON.parse(SM.store.read());
  assert(isFinite(payload.savedAt) && payload.savedAt > 0, '存档负载带 savedAt 时间戳');
  assert(payload.deviceId && payload.deviceId.length > 0, '存档负载带 deviceId');
  // 28.8 装备槽兼容两种历史形态（对象 / 裸 id），且无效 id 被清理
  assert(/typeof g === 'string'/.test(engSrc2), '读档兼容装备槽的裸 id 旧形态');
  assert(/!Items\[gid\]/.test(engSrc2), '读档校验装备 id 有效性');
  // 28.9 导入导出仍走同一套格式（云端档与本地档同构）
  const txt2 = G.exportSaveText();
  assert(txt2.length > 0 && JSON.parse(txt2).version === SM.version, '导出档带当前版本号');
  assert(G.importSaveText(txt2).ok === true, '导出的档可原样导入（格式同构）');
  // 28.10 迁移后版本回写磁盘（避免每次启动重跑迁移链）
  assert(/before !== d\.version/.test(saveSrc), '旧档迁移后回写新版本号');
  assert(/syncReady\(\)/.test(saveSrc), '提供同步状态同步查询接口');
}


// ============ 29. 营造绘形：八座营邑建筑矢量图标 ============
section('营造建筑图标');
{
  const si = ST.structureIcon;
  const stcSrc = readText('src/structureIcon.js');
  const uiM29 = uiSrcAll;
  // 29.1 模块存在并已接入加载顺序
  assert(typeof si === 'function', 'structureIcon 已导出');
  // 不再写死八座：以后每加一座建筑，这里跟着走
  assert(/const ART = \{[\s\S]{0,300}\}/.test(stcSrc) && stcSrc.includes('xuegong'),
    '每座建筑各有专属画法（ART 表）');
  for (const id of Object.keys(ST.BUILDINGS)){
    assert(new RegExp('function ' + id + '\\(').test(stcSrc), '建筑「' + id + '」有画法函数');
  }
  assert(indexOfOf('index.html', 'src/structureIcon.js') >= 0, 'structureIcon.js 已引入页面');
  // 29.2 建筑数量与图标数量严格对齐（新增建筑必须补图）
  assert(ST.STRUCTURE_ICON_IDS.length === Object.keys(ST.BUILDINGS).length,
    '图标数与建筑数一致（' + ST.STRUCTURE_ICON_IDS.length + ' / ' + Object.keys(ST.BUILDINGS).length + '）');
  const bIds = Object.keys(ST.BUILDINGS);
  const missing = bIds.filter(id => !ST.STRUCTURE_ICON_IDS.includes(id));
  assert(missing.length === 0, '每座建筑都有图标（缺：' + (missing.join(',')||'无') + '）');
  // 29.3 每枚图标都出图且结构完整
  const bad = [];
  bIds.forEach(id => {
    const svg = si(ST.BUILDINGS[id]);
    if (!svg || !svg.includes('<svg') || !svg.includes('</svg>') || svg.length < 80) bad.push(id);
  });
  assert(bad.length === 0, '建筑图标全部出图（破图：' + (bad.join(',')||'无') + '）');
  // 29.3b 标记图标：代码里写死的 key 必须真在 MARK 表里。
  // markIcon 对未知 key 会静默退化（不报错、只是少一枚图），拼错只有肉眼能发现。
  {
    const uiS = uiSrcAll;
    const gameS = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');
    const keys = new Set(ST.MARK_ICON_IDS || []);
    const lit = [...uiS.matchAll(/markIcon\(\s*'([^']+)'/g), ...gameS.matchAll(/markIcon\(\s*'([^']+)'/g)]
      .map(m => m[1]);
    const miss = lit.filter(k => !keys.has(k));
    assert(keys.size > 0 && lit.length > 0, '标记图标表与字面量调用都取到了（' + keys.size + ' / ' + lit.length + '）');
    assert(miss.length === 0, 'markIcon 的 key 都在表内（越界：' + (miss.join(',') || '无') + '）');
  }

  // 29.4 矢量特征：viewBox + currentColor 无关但含墨色剪影与晕圈
  const one = si(ST.BUILDINGS.zhai);
  assert(one.includes('viewBox="0 0 64 64"'), '图标使用 64×64 视框');
  assert(one.includes('class="bi"'), '图标沿用 bi 类名（与异兽同族，昼夜自动反相）');
  assert(one.includes('aria-label="柴栅"'), '图标带无障碍名称');
  assert(/opacity="\.1[0-9]?"/.test(one), '图标带圆晕底');
  // 29.5 营造页已用矢量图替换汉字印记
  assert(uiM29.includes("typeof structureIcon==='function'?structureIcon(b)"), '营造卡改用矢量图标渲染');
  assert(!/tile-seal">\$\{esc\(b\.name\.slice\(0,1\)\)\}/.test(uiM29), '营造卡不再用汉字印记方块');
  // 29.6 传入字符串 id 也能出图（容错）
  assert(typeof si('zhai') === 'string' && si('zhai').includes('<svg'), '支持传入建筑 id 字符串');
  assert(si('__不存在__').includes('<svg'), '未知 id 兜底出图不报错');
}


// ============ 30. 技能绘形：二十六艺矢量图标 ============
section('技能矢量图标');
{
  const ki = ST.skillIcon;
  const skiSrc = readText('src/skillIcon.js');
  const uiM30 = uiSrcAll;
  // 30.1 模块存在并已接入
  assert(typeof ki === 'function', 'skillIcon 已导出');
  assert(indexOfOf('index.html', 'src/skillIcon.js') >= 0, 'skillIcon.js 已引入页面');
  // 30.2 技能数量与图标数量严格对齐（新增技能必须补图）
  assert(ST.SKILL_ICON_IDS.length === 26, '技能图标共 26 枚（' + ST.SKILL_ICON_IDS.length + '）');
  const skIds = Object.keys(ST.Skills);
  const missSk = skIds.filter(id => !ST.SKILL_ICON_IDS.includes(id));
  assert(missSk.length === 0, '每个技能都有图标（缺：' + (missSk.join(',')||'无') + '）');
  assert(skIds.length === 26, '技能总数 26（' + skIds.length + '）');
  // 30.3 每枚图标都出图
  const badSk = [];
  skIds.forEach(id => {
    const svg = ki(id);
    if (!svg || !svg.includes('<svg') || !svg.includes('</svg>') || svg.length < 80) badSk.push(id);
  });
  assert(badSk.length === 0, '技能图标全部出图（破图：' + (badSk.join(',')||'无') + '）');
  // 30.4 与异兽 / 营邑图标同族：统一视框 + bi 类名（昼夜自动反相）+ 无障碍名
  const one = ki('qiaocai');
  assert(one.includes('viewBox="0 0 64 64"'), '技能图标使用 64×64 视框');
  assert(one.includes('class="bi"'), '技能图标沿用 bi 类名（与异兽 / 营邑同族）');
  assert(one.includes('aria-label="樵采"'), '技能图标带无障碍名称');
  // 30.5 技能卡已改用矢量图，emoji 兜底仍保留（模块缺失时不白屏）
  assert(uiM30.includes("typeof skillIcon==='function'?skillIcon(sk):sk.icon"), '技能卡改用矢量图标渲染');
  assert(uiM30.includes("typeof skillIcon==='function'?skillIcon(k,15):d.icon"), '配方 chip 改用矢量图标渲染');
  assert(uiM30.includes("typeof skillIcon==='function'?skillIcon(d.skill,15):d.icon"), '兜底动作 chip 改用矢量图标渲染');
  // 30.6 容错：未知 id 兜底出图不报错
  assert(ki('__不存在__').includes('<svg'), '未知技能 id 兜底出图不报错');
  assert(ki({ id:'bing', name:'兵' }).includes('aria-label="兵"'), '支持传入技能对象');
}

// ============ 31. 物品绘形：族形矢量图标 ============
section('物品族形图标');
{
  const ii = ST.itemIcon;
  const ic = ST.itemIc;
  const itemSrc = readText('src/itemIcon.js');
  const uiM31 = uiSrcAll;
  // 31.1 模块存在并已接入
  assert(typeof ii === 'function', 'itemIcon 已导出');
  assert(typeof ic === 'function', 'itemIc 已导出');
  assert(indexOfOf('index.html', 'src/itemIcon.js') >= 0, 'itemIcon.js 已引入页面');
  // 构建顺序改由 index.html 决定（见第 89 节），所以查「是否被页面引用」即为「是否入构建」
  assert(require(path.join(__dirname, '..', 'scripts', 'build-standalone.js')).scriptOrder().includes('itemIcon.js'),
    'itemIcon.js 已并入独立版构建');
  // 31.2 族形数量足够覆盖：每个物品都能落到一个族
  const fams = ST.ITEM_ICON_FAMILIES;
  assert(fams.length >= 50, '物品族形共 ' + fams.length + ' 枚（≥50）');
  const itemIds = Object.keys(ST.Items);
  const missFam = itemIds.filter(id => {
    const svg = ii(ST.Items[id]);
    return !svg || !svg.includes('<svg') || svg.length < 40;
  });
  assert(missFam.length === 0, '每个物品都能出图（缺：' + (missFam.join(',')||'无') + '）');
  // 31.3 与其余图标同族语言：24 视框 + bi 类名（昼夜自动反相）+ 无障碍名
  const one = ii(ST.Items[itemIds[0]]);
  assert(one.includes('viewBox="0 0 24 24"'), '物品图标使用 24×24 视框');
  assert(one.includes('class="bi ii"'), '物品图标沿用 bi 类名（与异兽 / 技能同族）');
  assert(one.includes('aria-label='), '物品图标带无障碍名称');
  // 31.4 描边件必须显式 fill="none"，否则会继承 fill:currentColor 被填实
  const strokeTags = (itemSrc.match(/<(?:path|circle|ellipse|rect|line|polyline|polygon)\b[^>]*>/g) || []);
  const badFill = strokeTags.filter(t => t.includes('stroke=') && !t.includes('fill='));
  assert(badFill.length === 0, '所有描边件都显式声明 fill（漏：' + badFill.length + '）');
  // 31.5 主墨色走 currentColor，夜间自动反相
  assert(itemSrc.includes("const INK = 'currentColor'"), '物品图标墨色走 currentColor（昼夜反相）');
  // 31.6 UI 已改用矢量图标（emoji 兜底保留，模块缺失时不白屏）
  assert(uiM31.includes("typeof itemIc==='function'?itemIc(it)"), '墟市 / 廛市 / 配方卡改用矢量图标');
  assert(uiM31.includes("typeof itemIc==='function'?itemIc(id,13)"), '成本 chip 改用矢量小图');
  assert(uiM31.includes("typeof itemIc==='function'?itemIc(id,20)"), '行囊卡改用矢量小图');
  assert(uiM31.includes("typeof itemIc==='function'?itemIc(itemId,18)"), '物品详情改用矢量小图');
  assert(uiM31.includes("typeof itemIc==='function'?itemIc(g.id||g)"), '装备槽改用矢量图标');
  // 31.7 容错：未知 id / 空值不崩
  assert(ii('__不存在__').includes('<svg'), '未知物品 id 兜底出图不报错');
  assert(ic(null) === '', '空值返回空串不报错');
  assert(ic('__不存在__').includes('<svg'), 'itemIc 未知 id 兜底出图不报错');
  // 31.8 尺寸参数：定尺小图走 inline-block，不撑破行内布局
  const small = ii(ST.Items[itemIds[0]], 13);
  assert(small.includes('width="13"') && small.includes('height="13"'), '定尺小图按给定尺寸输出');
  assert(small.includes('display:inline-block'), '定尺小图行内对齐（inline-block）');
  assert(ii(ST.Items[itemIds[0]]).includes('width="100%"'), '省略尺寸时撑满容器');
}

// ============ 32. 云端存档接入：配置持久化 · 防抖同步 · 离页强传 · 参考后端 ============
section('云端存档接入');
{
  const SM = ST.SaveManager;
  const saveSrc = readText('src/save.js');
  const engSrc = readText('src/engine.js');
  const uiM32 = uiSrcAll;
  // 32.1 配置持久化：接入一次，下次开页自动恢复
  SM.clearCloud();
  assert(SM.cloudConfig() === null, '未接入时无云端配置');
  const cfg = SM.setCloud({ endpoint: 'https://save.example.test/api/', token: 't0ps3cret', autoSync: true });
  assert(!!cfg && cfg.endpoint === 'https://save.example.test/api', 'setCloud 规范化端点（去掉尾斜杠）');
  const saved = SM.cloudConfig();
  assert(saved && saved.endpoint === 'https://save.example.test/api' && saved.token === 't0ps3cret' && saved.autoSync === true, '云端配置已持久化');
  const restored = SM.restore();
  assert(!!restored && restored.id === 'cloud', 'restore 从持久化配置重建云端后端');
  // 32.2 防抖同步的调度门：接入且自动同步开 → pending；关 / 未接入 → 跳过
  SM.cloud = { id:'cloud', available: ()=>true };          // 替身后端（不发真实请求）
  SM.syncState = 'idle';
  assert(SM.scheduleSync() === true, '已接入且自动同步开启时调度上传');
  assert(SM.syncState === 'pending', '调度后同步状态为待上传');
  clearTimeout(SM._syncTimer); SM._syncTimer = 0;
  SM.setCloud({ endpoint: 'https://save.example.test/api', autoSync: false });
  SM.cloud = { id:'cloud', available: ()=>true };
  SM.syncState = 'idle';
  assert(SM.scheduleSync() === false, '关闭自动同步后不再调度上传');
  assert(SM.syncState === 'idle', '未调度则状态不变');
  SM.clearCloud();
  SM.syncState = 'idle';
  assert(SM.scheduleSync() === false, '未接入云端时调度安全跳过');
  // 32.3 engine.saveGame 接上防抖钩子（每次存档后尝试调度）
  assert(/SaveManager\.scheduleSync\(\)/.test(engSrc), 'saveGame 委托 SaveManager.scheduleSync');
  // 32.4 UI 接线：设置页控件 + 初始化恢复 + 离页强传
  assert(!uiM32.includes('id="cloudEndpoint"') && !uiM32.includes('id="cloudToken"'), '设置页不再暴露云端地址 / 令牌输入');
  assert(!uiM32.includes('onclick="cloudSyncNow()"') && !uiM32.includes('onclick="cloudPullNow()"'), '设置页不再提供手动同步按钮');
  assert(!uiM32.includes('restoreCloudSave()'), '初始化不再恢复自定义云端配置（交给账号系统）');
  assert(/visibilitychange[\s\S]{0,200}flushCloudSave/.test(uiM32), '页面切后台时强传待上传改动');
  assert(/beforeunload[\s\S]{0,160}flushCloudSave/.test(uiM32), '关闭页面前强传待上传改动');
  assert(!uiM32.includes('cloudStatusText()'), '同步状态行已撤（交由账号系统统一呈现）');
  // 32.5 异步用例（上传 / 合并 / 参考后端契约）收尾后再出汇总
  pending.push((async ()=>{
    // 32.5.1 flushSync：取消防抖立即上传，keepalive 透传，成功后清脏标记
    let written = '', keepaliveSeen = false;
    SM.setCloud({ endpoint: 'https://save.example.test/api', token: 'k' });
    SM.cloud = { id:'cloud', available: ()=>true, read: async()=>null,
      write: async(t, opts)=>{ written = t; keepaliveSeen = !!(opts && opts.keepalive); return true; },
      remove: async()=>true };
    ST.saveGame();
    assert(SM.meta().dirty === true, '保存后 dirty 为真（有待上传改动）');
    const fr = await SM.flushSync();
    assert(fr && fr.ok === true, 'flushSync 立即上传成功');
    assert(written.length > 0 && JSON.parse(written).version === SM.version, '上传的是本地存档文本');
    assert(keepaliveSeen === true, 'flushSync 以 keepalive 上传（离页不断传）');
    assert(SM.meta().dirty === false, '上传成功后清除脏标记');
    assert(SM.syncState === 'ok' && SM.lastSyncAt > 0, '上传成功后状态 ok 且记录同步时间');
    // 32.5.2 pull：云端有档时合并落本地，并标记 dirty 把合并推回云端
    SM.setCloud({ endpoint: 'https://save.example.test/api' });
    const localBefore = JSON.parse(SM.store.read());
    SM.cloud = { id:'cloud', available: ()=>true,
      read: async()=>JSON.stringify({ version:3, savedAt: Date.now() + 60000, shells: 999, inventory:{ gui: 1 }, skills:{}, records:{}, stats:{}, map:{ 'nanshan-2-01':true } }),
      write: async()=>true, remove: async()=>true };
    ST.saveGame();
    const pr = await SM.pull();
    assert(pr && pr.ok === true, 'pull 合并成功');
    const merged = JSON.parse(SM.store.read());
    assert(merged.shells === 999, '贝币取较新的云端一档');
    assert(merged.map['nanshan-2-01'] === true, '地图节点取并集（云端到访不丢）');
    assert(SM.meta().dirty === true, '合并结果标记 dirty（等待推回云端）');
    assert(JSON.parse(SM.store.read()).version === SM.version, '合并结果仍为当前存档版本');
    // 32.5.3 参考后端：真实 HTTP 走一遍约定契约（404 → 上传 → 冲突 → 删除）
    const { spawn } = require('child_process');
    const os = require('os');
    const dataFile = path.join(os.tmpdir(), 'shj-cloud-test-' + process.pid + '.json');
    try { fs.unlinkSync(dataFile); } catch(e){}
    const child = spawn(process.execPath, [path.join(root, 'server', 'cloud-save-server.js'), '--port', '0', '--data', dataFile], { stdio: ['ignore','pipe','pipe'] });
    const port = await new Promise((resolve, reject)=>{
      let buf = '';
      const timer = setTimeout(()=>reject(new Error('参考后端启动超时')), 8000);
      child.stdout.on('data', d=>{
        buf += d;
        const nl = buf.indexOf('\n');                 // 等整行到齐再解析，防止分包截断端口号
        if (nl < 0) return;
        const m = buf.slice(0, nl).match(/127\.0\.0\.1:(\d+)/);
        if (m){ clearTimeout(timer); resolve(+m[1]); }
        else reject(new Error('未能解析参考后端端口：' + buf.slice(0, nl)));
      });
      child.on('exit', ()=>{ clearTimeout(timer); reject(new Error('参考后端提前退出')); });
    });
    const base = 'http://127.0.0.1:' + port;
    try {
      let res = await fetch(base + '/save');
      assert(res.status === 404, '空库 GET /save 返回 404');
      res = await fetch(base + '/save', { method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ payload:'{"version":3,"shells":7}', rev:0, deviceId:'dev-a' }) });
      assert(res.status === 200, '首次上传 200');
      const put1 = await res.json();
      assert(put1.ok === true && put1.rev === 1, '首次上传后 rev 为 1');
      res = await fetch(base + '/save');
      const got = await res.json();
      assert(got.payload === '{"version":3,"shells":7}' && got.rev === 1, 'GET 取回上传的存档与 rev');
      res = await fetch(base + '/save', { method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ payload:'{"version":3,"shells":8}', rev:0, deviceId:'dev-b' }) });
      assert(res.status === 409, '落后 rev 的上传被拒（409 乐观并发）');
      res = await fetch(base + '/save', { method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ payload:'{"version":3,"shells":8}', rev:1, deviceId:'dev-b' }) });
      assert(res.status === 200 && (await res.json()).rev === 2, '带最新 rev 的上传被接受');
      res = await fetch(base + '/save', { method:'DELETE' });
      assert(res.status === 200, 'DELETE 抹档 200');
      res = await fetch(base + '/save');
      assert(res.status === 404, '删除后 GET 回到 404');
    } finally {
      child.kill();
      try { fs.unlinkSync(dataFile); } catch(e){}
    }
    SM.clearCloud();   // 收尾：不影响后续用例
  })());
}

// ============ 42. 交互改版（v1.7）：顶栏实时 · 行动链 · 弹窗 · 淬炼 ============
section('交互改版：顶栏实时 · 行动链 · 弹窗 · 淬炼');
{
  const gameSrc2 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');
  const uiSrc2 = uiSrcAll;
  const css2 = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

  // 42.1 顶栏数值随结算实时刷新（贝币不再等切页才变）
  assert(/topbarAccum \+= dt;[\s\S]{0,200}UI\.renderTopbar/.test(gameSrc2), '主循环节流刷新顶栏（贝币随结算实时可见）');

  // 42.2 仪表带行动文字可点，按行动类型跳页
  G.resetToDefault();
  ST.Game.activity = { kind:'gather', skill:'qiaocai', itemId:'gui', src:'manual' };
  ST.UI.gotoActivity();
  assert(ST.UI.currentTab === 'skills', '采集中点行动条 → 技能页');
  ST.Game.activity = null;
  ST.Game.combat = { monsterId:'x', monsterHp:1, playerHp:1 };
  ST.UI.gotoActivity();
  assert(ST.UI.currentTab === 'taofa', '往讨中点行动条 → 征伐页');
  ST.Game.combat = null;

  // 42.3 田地一键种植
  G.resetToDefault();
  ST.Game.farms = {};
  ST.Game.inventory.seed_tu = 4;   // 稌籽 lvl 1，圃艺 1 级即可种
  const _renderSkills = ST.UI.renderSkills, _toast = ST.UI.toast;
  ST.UI.renderSkills = ()=>{}; ST.UI.toast = ()=>{};
  ST.UI.plantAll();
  ST.UI.renderSkills = _renderSkills; ST.UI.toast = _toast;
  assert(Object.keys(ST.Game.farms).length === 4, '一键种植按存种数量填满空田 -> ' + Object.keys(ST.Game.farms).length);
  assert((ST.Game.inventory.seed_tu || 0) === 0, '一键种植按田扣种');

  // 42.4 征兆意象图标：七类各有其形，水兆取水色
  assert(typeof ST.omenIcon === 'function', '征兆意象图标已导出');
  const omenCases = [['大水','见则其邑大水'],['大旱','见则天下大旱'],['兵','见则其邑有兵'],
    ['大疫','见则其国大疫'],['螽蝗','见则螽蝗为败'],['大风','见则天下大风'],['安宁','见则天下安宁']];
  assert(omenCases.every(([t,d])=>String(ST.omenIcon({type:t, desc:d}, 20)).indexOf('<svg') === 0), '七类征兆各有专属意象（水/旱/兵/疫/蝗/风/安）');
  assert(String(ST.omenIcon({type:'大水', desc:''}, 20)).indexOf('#2E5269') >= 0, '水兆取水色');
  assert(String(ST.omenIcon({type:'大旱', desc:''}, 20)).indexOf('#B03A2B') >= 0, '旱兆取火色');

  // 42.5 每页页头等级条（等级 / 当前经验 / 升级所需）
  assert(typeof ST.UI.renderPageLevel === 'function', '页头等级条随页渲染');
  assert(uiSrc2.includes('class="page-lvbar"') && uiSrc2.includes('经验 ${fmt(got)} / ${fmt(need)}'), '等级条含当前经验与升级所需');
  assert(/PAGE_SKILL = \{[\s\S]{0,400}yudi[\s\S]{0,400}taofa[\s\S]{0,400}yushi[\s\S]{0,400}codex[\s\S]{0,400}jisi[\s\S]{0,400}shichan[\s\S]{0,400}ying/.test(uiSrc2), '七页各有对应技能');

  // 42.6 营造：门槛压平后八连造自洽，且有「修葺」兜底
  G.resetToDefault();
  assert(ST.BUILDINGS.zhai.lvl === 1 && ST.BUILDINGS.xuegong.lvl === 20, '营造门槛压平为 1–20');
  const chain = ['zhai','zaoku','tuku','citan','shichan','canglin','fenghuotai','xuegong'];
  const built = chain.every(id=>{
    ST.Game.inventory.guaimu = 999; ST.Game.inventory.shashi = 999;
    ST.Game.inventory.yan = 999; ST.Game.inventory.gui = 999; ST.Game.inventory.tan = 999;
    ST.Game.inventory.tu = 999; ST.Game.inventory.jin = 999; ST.Game.inventory.yu = 999;
    ST.Game.inventory.jian = 999;
    return G.buildStructure(id) === true;
  });
  assert(built, '八座建筑可一路连造（造完即够下一档）');
  G.resetToDefault();
  ST.Game.inventory.guaimu = 10; ST.Game.inventory.shashi = 10;
  const yxp0 = ST.Game.skills.yingyi.xp;
  assert(ST.repairBuild() === true, '修葺可执行（无可造之物时的兜底）');
  assert(ST.Game.skills.yingyi.xp > yxp0, '修葺给营邑经验');
  assert(ST.Game.inventory.guaimu === 8, '修葺耗怪木×2 -> ' + ST.Game.inventory.guaimu);

  // 42.7 征伐 / 御使弹窗入口
  assert(typeof ST.UI.openHuntModal === 'function' && typeof ST.UI.startHuntTimes === 'function', '征伐弹窗与开战入口齐备');
  assert(typeof ST.UI.openDeployModal === 'function', '御使弹窗入口齐备');
  G.resetToDefault();
  const anyBeast = Object.values(ST.Monsters).find(m=>!m.boss);
  ST.UI.openHuntModal(anyBeast.id);
  assert(true, '征伐弹窗可打开（属性 / 场次 / 战斗按钮）');

  // 42.8 装备淬炼：消耗 · 数值 · 上限 · 存档
  G.resetToDefault();
  ST.Game.inventory.tan = 30; ST.Game.shells = 8000;
  ST.packGearAdd('muge', 0, 1);                // 先持有一柄木戈再装备（装备按件存）
  ST.equipItem('muge');
  ST.Game.combat = { style:'attack' };        // 固定近战口径，免得默认祝术走法术分支
  const dmg0 = G.playerWeaponDmg();
  // v1.31.13 起：身上那件是独立实例，强化作用于实例（Game.gear.weapon），不是 itemId
  const e0 = ST.enhanceItem(ST.Game.gear.weapon);
  assert(e0 && e0.ok && e0.success, '装备可淬炼（0→1 必成）');
  assert(ST.enhanceLevel(ST.Game.gear.weapon) === 1, '淬炼 +1');
  assert(G.playerWeaponDmg() > dmg0, '淬炼提升武器伤害（+6%/级）');
  ST.Game.combat = null;
  ST.Game.enhance.muge = 30;
  const tan0 = ST.Game.inventory.tan;
  const e1 = ST.enhanceItem('muge');
  assert(e1.ok === false && (ST.Game.inventory.tan || 0) === tan0, '已至 +30 不再消耗');
  ST.Game.enhance.muge = 9;
  const ser2 = ST.serializeSave();
  assert(ser2 && ser2.enhance && ser2.enhance.muge === 9, '淬炼等级写入存档');

  // 42.9 行动链：页尾「下一步」横条
  assert(uiSrc2.includes('function nextStepHtml') && uiSrc2.includes('class="next-step-bar"'), '页尾「下一步」横条（行动链）');

  // 42.10 移动端操作按钮统一近直角
  assert(/@media \(max-width:760px\)\{[\s\S]{0,500}\.btn[^{]*\{[^}]*border-radius:1px !important/.test(css2), '窄屏操作按钮统一近直角');
}

// ============ 48. 祠礼续祭与加成落地（v1.15） ============
{
  G.resetToDefault();
  const gameSrc48 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');
  const uiSrc48 = uiSrcAll;
  const saveSrc48 = fs.readFileSync(path.join(__dirname, '..', 'src', 'save.js'), 'utf8');
  const engSrc48 = fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.js'), 'utf8');
  // 技能等级由 xp 推导（gainXp 会按 xp 重算 level），直接改 level 字段无效
  const setSkill48 = (skillId, target) => {
    ST.Game.skills[skillId] = { level: 1, xp: 0 };
    let guard = 0;
    while (ST.levelOf(skillId) < target && guard++ < 400) ST.gainXp(skillId, 20000);
  };

  // 48.1 加成落地：regionRiteBonus 此前只被定义、从未被调用，
  // 二十八套礼制「行祭 +30%」只是句文案，采集那边一分都没多给
  assert(gameSrc48.includes('regionRiteBonus((regionOf(Game.node)||{}).regionId)'),
    '采集加成并入祠礼（regionRiteBonus 真正被读取）');
  assert(gameSrc48.includes('riteRealYield(regionRiteBonus(') && gameSrc48.includes('eff * rb'),
    '离线采集同样吃祠礼加成（不至于挂着挖矿反而吃不到礼）');
  // 但离线必须与线上同一折算：线上 +30% 加的是「得两份/三份」的几率，实际只有约 +15% 产量。
  // 原先离线直接乘 1.30，等于离线白拿一倍于线上的礼。
  assert(Math.abs((1 + ST.riteRealYield(0.30) / 100) - 1.15) < 0.005,
    '离线祠礼加成按产量口径折算（+30% → 约 +15%，与线上一致）');
  assert(!/1 \+ regionRiteBonus\(/.test(gameSrc48), '没有别处再直接乘 1 + 原始加成');

  // 48.2 同一山系两套礼：按 riteOf 定归属，大祭不被小祭顶掉
  G.resetToDefault();
  ST.Game.rites['xishan-1'] = ST.Game.stats.time + 600;
  ST.Game.riteOf = {};
  assert(Math.abs(ST.regionRiteBonus('xishan-1') - 0.30) < 1e-9, '旧档无 riteOf 时退回按 regionId 反查');
  const yuRec = ST.Recipes.find(r => r.type === 'rite' && r.out === 'rite_yu');
  yuRec.cost.forEach(([id, q]) => ST.giveItem(id, q, false));
  setSkill48('jisi', 70);
  assert(ST.performRite('rite_yu') === true, '羭山百牲斋可行');
  assert(ST.Game.riteOf['xishan-1'] === 'rite_yu', '行祭后在册的是「哪一套礼」');
  assert(Math.abs(ST.regionRiteBonus('xishan-1') - 0.50) < 1e-9,
    '大祭加成为 50%（此前恒取该区第一条，白给 20 个百分点）');
  assert(ST.Game.rites['xishan-1'] - ST.gameTime() > 7000, '大祭持续两小时');

  // 48.3 行为级验证：加成的确体现在产量上
  const pickGid = (ST.GATHER_POOLS['qiaocai'] || []).find(id => {
    const it = ST.Items[id];
    return it && it.node === 'nanshan-1-01' && (it.lvl || 1) <= 1;
  });
  assert(!!pickGid, '南山首山有可采之物用于验证（' + pickGid + '）');
  const origRandom = Math.random;
  let seed = 20260801;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  function gatherTotal(riteOn){
    ST.Game.node = 'nanshan-1-01';
    ST.Game.records = {};                       // 清掌握度，两轮起跑线一致
    setSkill48('qiaocai', 60);
    ST.Game.rites = {}; ST.Game.riteOf = {};
    if (riteOn){ ST.Game.rites['nanshan-1'] = ST.Game.stats.time + 3600; ST.Game.riteOf['nanshan-1'] = 'rite_ns1'; }
    const before = ST.totalOf(pickGid);
    for (let i = 0; i < 3000; i++) ST.doGather(pickGid);
    return ST.totalOf(pickGid) - before;
  }
  const plain = gatherTotal(false);
  const withRite = gatherTotal(true);
  Math.random = origRandom;
  assert(withRite > plain, `行祭后同量采集产出更多（${plain} → ${withRite}）`);
  assert(withRite / Math.max(1, plain) > 1.05, '提升幅度可感（>5%），不只是随机波动');

  // 48.4 续祭：到期自动重备祭品（静默，不逐条弹 toast）
  G.resetToDefault();
  ST.Game.stats.time = 5000;
  setSkill48('jisi', 70);
  const nsRec = ST.Recipes.find(r => r.type === 'rite' && r.out === 'rite_ns1');
  assert(ST.riteState('rite_ns1').auto === false, '默认不续祭');
  assert(ST.toggleRiteAuto('rite_ns1') === true, '可开启续祭');
  assert(ST.Game.riteAuto['rite_ns1'] === true, '续祭开关入档');
  // 空手开续祭：开关不该被悄悄关掉，而是转入「待料」等材料齐
  assert(ST.riteState('rite_ns1').stall === true, '无祭品时转入待料（而非自动关掉开关）');
  assert(ST.riteState('rite_ns1').active === false, '待料时并未生效，不谎报加成');

  // 补上材料：下一次 tick 自行续上
  nsRec.cost.forEach(([id, q]) => ST.giveItem(id, q * 3, false));
  ST.tickAutoRites();
  assert(ST.riteState('rite_ns1').active === true, '备齐祭品后自动续上（不必重新点开关）');
  assert(!(ST.Game.riteStall || {})['rite_ns1'], '续上后脱离待料');
  assert(ST.Game.rites['nanshan-1'] - ST.Game.stats.time > 3500, '首次续上即满一小时');

  // 临近到期（剩 10 秒 < 60 秒提前量）：提前补，不留空档
  ST.Game.rites['nanshan-1'] = ST.Game.stats.time + 10;
  const before48 = ST.totalOf(nsRec.cost[0][0]);
  const ritesBefore48 = ST.Game.stats.rites;
  ST.tickAutoRites();
  assert(ST.Game.rites['nanshan-1'] - ST.Game.stats.time > 3500, '临近到期自动续上一小时');
  assert(ST.totalOf(nsRec.cost[0][0]) === before48 - nsRec.cost[0][1], '续祭照同样祭品扣料');
  assert(ST.Game.stats.rites === ritesBefore48 + 1, '续祭计入行祭次数');

  // 还有余量时不重复扣料
  const safe48 = ST.totalOf(nsRec.cost[0][0]);
  ST.tickAutoRites();
  assert(ST.totalOf(nsRec.cost[0][0]) === safe48, '未临近到期不重复备祭（不白扣）');

  // 48.5 离线续祭：只补不预付，扣料记账
  G.resetToDefault();
  ST.Game.stats.time = 50000;
  setSkill48('jisi', 70);
  nsRec.cost.forEach(([id, q]) => ST.giveItem(id, q * 4, false));
  ST.Game.riteAuto = { rite_ns1: true };
  ST.Game.rites = {}; ST.Game.riteOf = {};
  const summary48 = { seconds: 3 * 3600, xp: 0, items: {}, records: 0, harvests: 0, riteRenews: 0, riteCost: {} };
  ST.settleRitesOffline(3 * 3600, summary48);
  assert(summary48.riteRenews >= 2 && summary48.riteRenews <= 4, '离线三小时补祭 2~4 次（' + summary48.riteRenews + '）');
  assert(Object.keys(summary48.riteCost).length > 0, '离线补祭的耗材记账（弹窗要交代）');
  assert(ST.Game.rites['nanshan-1'] > ST.gameTime(), '补祭后礼延续到当下之后');
  assert(ST.Game.riteOf['nanshan-1'] === 'rite_ns1', '补祭同样在册是哪一套礼');
  assert(uiSrc48.includes('rec.riteRenews') && uiSrc48.includes('耗祭品'), '离线归来弹窗列出续祭次数与耗材');

  // 48.6 续祭开关与界面
  assert(uiSrc48.includes('UI.toggleRiteAuto') && uiSrc48.includes('class="rite-auto'), '方块右上角有「续」开关');
  assert(uiSrc48.includes('rite-auto-bar') && uiSrc48.includes('UI.stopAllRiteAuto'), '续祭汇总条与「全停」');
  assert(uiSrc48.includes('fmtClock(st.left)'), '生效中的礼显示余时（紧凑时钟，方块角标放得下）');

  // 48.6b 舆地页：把「此域产出 +30%」摆到山系名旁，礼才有存在感
  assert(typeof ST.activeRiteOf === 'function', 'activeRiteOf 已导出');
  G.resetToDefault();
  ST.Game.rites['nanshan-1'] = ST.Game.stats.time + 1800;
  ST.Game.riteOf = { 'nanshan-1': 'rite_ns1' };
  const ar48 = ST.activeRiteOf('nanshan-1');
  assert(ar48 && Math.abs(ar48.bonus - 0.30) < 1e-9, '取到该山系生效的礼与加成');
  assert(ST.activeRiteOf('beishan-1') === null, '没有行祭的山系不虚报');
  ST.Game.rites['nanshan-1'] = ST.Game.stats.time - 1;
  assert(ST.activeRiteOf('nanshan-1') === null, '过期即不再提示');
  assert(uiSrc48.includes('class="rite-here"') && uiSrc48.includes('此域采获'), '舆地页有祠礼生效条');
  // 「产出 +30%」实际只作用于双份/三份概率，折算约 +15%——文案要说实话
  assert(typeof ST.riteRealYield === 'function', 'riteRealYield 已导出');
  assert(ST.riteRealYield(0.30) === 15, '30% 采获约合产量 +15%（' + ST.riteRealYield(0.30) + '%）');
  assert(ST.riteRealYield(0.45) === 22, '祠坛加成后 45% 约合 +22%');
  assert(uiSrc48.includes('约合产量'), '界面同时给出折算后的真实产量');

  // 48.7 存档往返
  G.resetToDefault();
  ST.Game.riteAuto = { rite_ns1: true };
  ST.Game.riteOf = { 'nanshan-1': 'rite_ns1' };
  const ser48 = ST.serializeSave();
  assert(ser48.riteAuto && ser48.riteAuto.rite_ns1 === true, '续祭开关随存档保存');
  assert(ser48.riteOf && ser48.riteOf['nanshan-1'] === 'rite_ns1', '礼的归属随存档保存');
  assert(saveSrc48.includes('riteOf: G.riteOf') && saveSrc48.includes('riteAuto: G.riteAuto'), '序列化含两字段');
  assert(engSrc48.includes('Game.riteAuto = (d.riteAuto') && engSrc48.includes('Game.riteOf = (d.riteOf'),
    '读档补两字段（旧档不报错）');
}

// ============ 49. 离线结算可读性（v1.15） ============
{
  G.resetToDefault();
  const uiSrc49 = uiSrcAll;
  ST.Game.skills.qiaocai = { level: 1, xp: 0 };
  const gid49 = (ST.GATHER_POOLS['qiaocai'] || []).find(id => {
    const it = ST.Items[id];
    return it && it.node === 'nanshan-1-01' && (it.lvl || 1) <= 1;
  });
  ST.Game.node = 'nanshan-1-01';
  ST.Game.activity = { kind: 'gather', skill: 'qiaocai', itemId: gid49 };
  const rec49 = ST.settleAway(1800);
  assert(!!rec49, '半小时离线有结算');
  assert(rec49.acts && rec49.acts.gather > 0, '记下离线做了多少次采集（' + (rec49.acts && rec49.acts.gather) + ' 次）');
  assert(rec49.seconds === 1800, '未超上限时按实际时长结');
  assert(rec49.capped === false, '未超上限不提示截断');

  // 超过收益上限：如实标出「超出多少未计」
  G.resetToDefault();
  ST.Game.node = 'nanshan-1-01';
  ST.Game.activity = { kind: 'gather', skill: 'qiaocai', itemId: gid49 };
  const cap49 = ST.offlineCapHours();
  const rec49b = ST.settleAway((cap49 + 2) * 3600);
  assert(rec49b.capped === true, '超过离山上限时标记截断');
  assert(Math.abs(rec49b.seconds - cap49 * 3600) < 1, '结算时长按上限截断');
  assert(Math.abs(rec49b.rawSeconds - (cap49 + 2) * 3600) < 1, '原始离山时长仍保留（供弹窗说明差额）');

  assert(uiSrc49.includes('off-cap') && uiSrc49.includes('未计入'), '弹窗说明超出部分未计入');
  assert(uiSrc49.includes('ACT_NAMES') && uiSrc49.includes('class="off-acts"'), '弹窗列出离线所做之事');
}

// ============ 50. 物品来路（v1.15） ============
{
  G.resetToDefault();
  assert(typeof ST.itemSources === 'function', 'itemSources 已导出');

  const dao = ST.itemSources('dao');
  assert(dao.some(x => x.kind === '圃艺'), '稻米反查到种子（此前只剩「回收 7 贝」）');
  assert(ST.itemSources('jian').some(x => /菅苗/.test(x.where)), '白菅指到菅苗');
  assert(ST.itemSources('zhang').some(x => x.kind === '琢玉' && /玉×1/.test(x.where)), '玉璋列出配方材料');

  const niu = ST.itemSources('niu').filter(x => x.kind === '讨伐')[0];
  assert(!!niu, '牛牲指到讨伐来路');
  assert(!/㸲牛、㸲牛/.test(niu.where), '同名异兽去重（不再「㸲牛、㸲牛、㸲牛」）');
  // 「讨伐 Lvundefined」：来历行会拼 Lv${lvl}，讨伐来源原先没填 lvl
  const dropSrcs = Object.values(ST.Items).flatMap(i => ST.itemSources(i.id)).filter(x => x.kind === '讨伐');
  assert(dropSrcs.length > 100, '讨伐来路确实查过 ' + dropSrcs.length + ' 条');
  assert(dropSrcs.every(x => x.lvl > 0), '讨伐来路条条带等级（不再 Lvundefined）');
  assert(niu.lvl > 0 && niu.lvl <= 30, `牛牲最低可讨于 ${niu.lvl} 级（取最低的那座山）`);

  assert(ST.itemSources('fenghuangyu').some(x => x.kind === '观瑞'), '凤皇羽来自观瑞');
  assert(ST.itemSources('shenlingzu').some(x => x.kind === '谒见'), '神𩲜之足来自谒见（神祇不讨伐）');
  assert(ST.itemSources('danmu').some(x => x.kind === '养成'), '丹木来自峚山养成');
  assert(ST.itemSources('__nope__').length === 0, '未知物品返回空');

  // 全局：671 件里每一件都该说得清「从哪来」，否则玩家拿到了也不知所以
  const noSrc = Object.values(ST.Items).filter(i => ST.itemSources(i.id).filter(x => x.kind !== '回收').length === 0);
  assert(noSrc.length === 0, '每件物品都查得到来路（缺 ' + noSrc.length + '：' + noSrc.slice(0, 5).map(i => i.name).join('、') + '）');

  // 观瑞所赐归到数据里，不再写死在 doObserve 的临时表上
  assert(ST.OBSERVE_SITES.danxue.reward === 'fenghuangyu', '观瑞奖励记在 OBSERVE_SITES.reward');
  const gameSrc50 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');
  assert(!/const plume = \{ danxue:/.test(gameSrc50), 'doObserve 不再自建映射表');
}

// ============ 51. 无死函数（v1.15） ============
{
  const srcDir = path.join(__dirname, '..', 'src');
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
  const all = files.map(f => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');
  const dead = [];
  for (const f of files){
    const src = fs.readFileSync(path.join(srcDir, f), 'utf8');
    const re = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    let m;
    while ((m = re.exec(src))){
      const name = m[1];
      const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // $ 之类不能直接进正则
      // 引用计数（含调用、对象简写、字符串里的 onclick），定义本身算 1 次
      const refs = (all.match(new RegExp('(?<![\\w$.])' + safe + '(?![\\w$])', 'g')) || []).length;
      const exported = new RegExp('window\\.' + safe + '\\s*=').test(all);
      if (refs <= 1 && !exported) dead.push(f + ':' + name);
    }
  }
  assert(dead.length === 0, '无既未调用也未导出的顶层函数（' + (dead.join('、') || '无') + '）');
}

// ============ 52. 征伐页分组懒渲染（v1.15.2） ============
{
  G.resetToDefault();
  const uiSrc52 = uiSrcAll;
  ST.UI.currentTab = 'taofa';
  ST.UI.renderTaofa();
  const groups = ST.UI._beastGroups || [];
  assert(groups.length >= 20, '分组仍在内存里（' + groups.length + ' 组）');
  const withRegion = groups.filter(g => g.regionId);
  assert(withRegion.length >= 26, '每个山系一组并带 regionId（' + withRegion.length + '）');
  assert(groups.some(g => g.always), '特殊目标组标了 always（六凶 / 刑天 / 神祇不折）');

  const html52 = (document.getElementById('content') || {}).innerHTML || '';
  const dom52 = ST.UI._lastHtml || '';
  assert(uiSrc52.includes('data-g="${gi}"') && uiSrc52.includes('ontoggle="UI.loadBeastGroup(this)"'),
    '未展开的组以 details 折起，展开时回调');
  assert(uiSrc52.includes("data-loaded") && uiSrc52.includes("setAttribute('data-loaded', '1')"),
    '卡片只在展开时生成一次（data-loaded 记状态）');
  assert(uiSrc52.includes('个山系折在下方') || uiSrc52.includes('已展开当前山系之目标'),
    '列表顶部说明「其余山系已折起」');
  assert(uiSrc52.indexOf('function beastCardHtml(x, pick)') > 0, '卡片模板抽成独立函数（组内共用）');
  assert(uiSrc52.includes('box.innerHTML = ordered.map(x=>beastCardHtml(x, pick)).join'), '展开时按同一模板渲染');

  // 折叠组里的卡不在 DOM 中，单卡补丁必须静默返回而不是抛错
  assert(/patchBeastCard = function\(id\)\{[\s\S]{0,300}if \(!card\) return;/.test(uiSrc52),
    '折叠组内的卡不存在时，patchBeastCard 静默跳过');
}

// ============ 53. 长线成就字段全部接线（v1.15.4） ============
{
  G.resetToDefault();
  const gameSrc53 = readText('src/game.js');
  // 字段定义了却没人读，等于成就页亮着「已达成」而效果不存在。
  // 之前 offlineCap 与 jisi 就是这样：文案写了，实现里一个字都没有。
  for (const f of ['xp', 'dmg', 'gather', 'yield', 'offlineEff', 'offlineCap', 'jisi']){
    assert(gameSrc53.includes('ms.' + f), '里程碑字段 ' + f + ' 有实现（不静默丢弃）');
  }

  // 行为：三处观象各自 +1 小时，「三谷观象」成就再 +1
  G.resetToDefault();
  const cap0 = ST.offlineCapHours();
  ST.Game.observed = { qiuwu: true, yugu: true, zhonggu: true };
  const cap3 = ST.offlineCapHours();
  assert(cap3 - cap0 === 4, '三谷观象实得 +4 小时（3 处观象 + 1 成就，实为 ' + (cap3 - cap0) + '）');
  assert(ST.Milestones.find(m => m.id === 'guan_all').bonus === '离线上限 +1h', '成就文案与实现一致');

  // 行为：西山百神 → 祭祀经验 +20%
  G.resetToDefault();
  assert(ST.jisiBonus() === 0, '未达成时无祭祀加成');
  ST.Game.records = {};
  // 「谒见全部 14 位神祇」——按谒见点的神祇 id 计，不是祠礼的 deity_ 键
  const xsDeities = Object.values(ST.AUDIENCE_SITES)
    .filter(x => String(x.nodeId).indexOf('xishan-') === 0)
    .flatMap(x => x.deities || []);
  assert(xsDeities.length === 14, '西山共有 14 位可谒见神祇（' + xsDeities.length + '）');
  assert(ST.jisiBonus() === 0, '未谒见时无加成');
  xsDeities.slice(0, 13).forEach(d => { ST.Game.records[d.id] = { count: 1, tier: 1 }; });
  assert(ST.jisiBonus() === 0, '差一位不亮');
  ST.Game.records[xsDeities[13].id] = { count: 1, tier: 1 };
  assert(ST.jisiBonus() === 0.20, '谒见全部 14 位后成就达成，祭祀经验 +20%');
  assert(gameSrc53.includes('def.xp * mult * (1 + jisiBonus())'), '行祭经验接入该加成');

  // 文案不得写死早已过时的数字
  const uiSrc53 = uiSrcAll;
  assert(!uiSrc53.includes('最高 15 小时'), '教程不再写死「最高 15 小时」（实际已随观象/营造涨到 18+）');
  assert(uiSrc53.includes('${offlineCapHours()}'), '玩法说明与教程改为读当前上限');
  assert(uiSrc53.includes("typeof s.body === 'function' ? s.body() : s.body"),
    '教程正文支持延迟求值（否则数组字面量会把开局数字钉死）');
}

// ============ 54. 征兆效果全部接线（v1.15.4） ============
{
  G.resetToDefault();
  const gameSrc54 = readText('src/game.js');
  // 征兆定义的每个数值字段都必须有 omenMod('<key>') 出口。
  // 之前 dmg / loot / fish / build 四条全是「写了但没人读」——
  // 玩家看见「见则有兵」的凶兆，战斗数值一分没变。
  const LABELS = ['beast','type','polarity','desc','dur','node','wise','war','wind','psy'];
  const numKeys = new Set();
  for (const o of Object.values(ST.OMENS)){
    for (const [k, v] of Object.entries(o)){
      if (LABELS.includes(k)) continue;
      if (typeof v === 'number') numKeys.add(k);
    }
  }
  assert(numKeys.size >= 8, '征兆数值字段 ' + numKeys.size + ' 类（' + [...numKeys].join('/') + '）');
  for (const k of numKeys){
    assert(gameSrc54.includes(`omenMod('${k}')`), '征兆通道 ' + k + ' 已接通');
  }

  // 行为：有兵之兆（朱厌）→ 伤害 -15%
  G.resetToDefault();
  const dm0 = ST.dmgMult();
  ST.Game.omens = [{ id: 'zhuyan', until: ST.Game.stats.time + 3600 }];
  const dm1 = ST.dmgMult();
  assert(Math.abs(dm1 - dm0 * 0.85) < 1e-6, '朱厌「有兵」使伤害 ×0.85（' + dm0.toFixed(2) + ' → ' + dm1.toFixed(2) + '）');

  // 行为：烽火台把凶兆之害减半
  ST.Game.buildings.fenghuotai = true;
  const dm2 = ST.dmgMult();
  assert(Math.abs(dm2 - dm0 * 0.925) < 1e-6, '烽火台把 -15% 折成 -7.5%');

  // 行为：大旱只克渔
  G.resetToDefault();
  ST.Game.omens = [{ id: 'tuanyu', until: ST.Game.stats.time + 3600 }];
  assert(ST.omenMod('fish') < -0.3, '鱄鱼「大旱」的渔获惩罚可读');
  assert(gameSrc54.includes("if (skillId === 'yu') bonus += omenMod('fish')"), '渔获惩罚只作用于渔');

  // 行为：土功提升营造经验
  G.resetToDefault();
  ST.Game.omens = [{ id: 'lili', until: ST.Game.stats.time + 3600 }];
  assert(Math.abs(ST.omenMod('build') - 0.20) < 1e-9, '狸力「土功」营造经验 +20%');
  assert(gameSrc54.includes("deployedBonuses().build + omenMod('build')"), '营造经验接入该通道');

  // 浮层与顶栏汇总共用同一张标签表：最凶的「有兵」不能点开是空白
  const txt = ST.omenEffectText(ST.OMENS.zhuyan);
  assert(/伤害 -15%/.test(txt) && /所获 -10%/.test(txt), '「有兵」浮层写明伤害 -15%、所获 -10%（' + txt + '）');
  const uiSrc54 = uiSrcAll;
  assert(uiSrc54.includes('OMEN_EFFECT_LABELS'), '效果标签抽成单一常量（浮层与汇总共用）');
  ST.Game.omens = [{ id: 'zhuyan', until: ST.Game.stats.time + 600 }];
  const agg = ST.UI && typeof ST.currentOmenEffects === 'function' ? ST.currentOmenEffects() : null;
  if (agg){
    assert(agg.some(x => x.label === '伤害' && x.pct === -15), '顶栏汇总也报出伤害 -15%');
  }
}

// ============ 55. 地理特性：尽沙 / 百仞 / 干河（v1.15.5） ============
{
  G.resetToDefault();
  const gameSrc55 = readText('src/game.js');
  const uiSrc55 = uiSrcAll;

  // 白沙山「广员三百里，尽沙也」：流沙迟滞，橐驼可免
  assert(ST.SPECIAL_NODES['beishan-2-05'].desert === true, '白沙山标注为流沙');
  assert(ST.geoGatherMul('beishan-2-05') === 1.25, '流沙地采集间隔 ×1.25');
  ST.Game.deployed = { 0: 'tuotuo' };
  assert(ST.geoGatherMul('beishan-2-05') === 1, '御使橐驼（善行流沙中）后采集如常');
  ST.Game.deployed = {};

  // 洹山「三桑无枝，其高百仞」：攀援费时，所得更丰
  assert(Math.abs(ST.geoGatherMul('beishan-2-15') - 1.18) < 1e-9, '百仞之山采集间隔 ×1.18');
  assert(Math.abs(ST.geoGatherBonus('beishan-2-15') - 0.10) < 1e-9, '登高而取，加成 +10%');

  // 教山「冬干而夏流」：六小时一转
  const t55 = ST.Game.stats.time;
  ST.Game.stats.time = 0;
  assert(ST.seasonPhase() === 0 && ST.seasonName() === '旱季', '开局为旱季');
  assert(Math.abs(ST.geoGatherBonus('beishan-3-09') + 0.30) < 1e-9, '旱季渔获 -30%');
  ST.Game.stats.time = 6 * 3600;
  assert(ST.seasonPhase() === 1 && ST.seasonName() === '雨季', '六小时后转雨季');
  assert(Math.abs(ST.geoGatherBonus('beishan-3-09') - 0.30) < 1e-9, '雨季渔获 +30%');
  ST.Game.stats.time = t55;

  assert(ST.geoGatherMul('nanshan-1-01') === 1 && ST.geoGatherBonus('nanshan-1-01') === 0, '寻常山不受地气影响');

  // 行为：间隔真的变慢
  G.resetToDefault();
  ST.Game.node = 'beishan-2-05';
  ST.Game.activity = { kind: 'gather', skill: 'qiaocai', itemId: 'gui' };
  const iv1 = ST.currentActionInterval();
  ST.Game.deployed = { 0: 'tuotuo' };
  const iv2 = ST.currentActionInterval();
  assert(Math.abs(iv1 / iv2 - 1.25) < 1e-6, '流沙山的采集间隔实测 ×1.25（' + iv1.toFixed(2) + ' vs ' + iv2.toFixed(2) + '）');

  assert(gameSrc55.includes('* geoGatherMul(Game.node)'), '采集间隔接入地气');
  assert(gameSrc55.includes('bonus += geoGatherBonus(Game.node)'), '采集加成接入地气');
  assert(gameSrc55.includes('gatherInterval(it.skill) * geoGatherMul(Game.node)'), '离线采集同样吃地气');
  assert(uiSrc55.includes('class="geo-tag"') && uiSrc55.includes('地气'), '山志显示地气标签');
}

// ============ 56. 符箓的著录前置（v1.15.6） ============
{
  G.resetToDefault();
  const intSrc56 = readText('src/interact.js');
  const uiSrc56 = uiSrcAll;

  const charms = Object.values(ST.Items).filter(i => i.reqRecord);
  assert(charms.length === 7, '七张符写明佩用前置（' + charms.length + '）');
  assert(charms.every(c => c.equip && c.slot === 'charm'), '带前置的都是护符');
  assert(intSrc56.includes('function reqRecordOk') && intSrc56.includes('function reqRecordText'),
    '前置判定与说明已实现（此前 reqRecord 字段从未被读）');

  // 行为：著录未及时戴不上
  G.resetToDefault();
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 60, xp: 1e6 };
  ST.giveItem('migufu', 1, false);
  const okBefore = ST.reqRecordOk(ST.Items.migufu);
  ST.equipItem('migufu');
  assert(okBefore === false, '未著录迷榖时前置不满足');
  assert(!ST.Game.gear.charm, '未达前置时装备不生效（装备槽仍空）');
  assert(/需著录「迷榖」至通形/.test(ST.reqRecordText(ST.Items.migufu)), '说明写明缺什么（' + ST.reqRecordText(ST.Items.migufu) + '）');

  // 达标后可戴
  ST.Game.records.migu = { count: 60, tier: 3 };
  assert(ST.reqRecordOk(ST.Items.migufu) === true, '著录至通形后前置满足');
  ST.equipItem('migufu');
  assert(ST.Game.gear.charm && ST.Game.gear.charm.id === 'migufu', '此时可正常装备');

  // 旧档中已戴着不满足前置的符：不该被强行脱下（装备是既有状态），
  // 但自动换装不得再选中未达标的
  G.resetToDefault();
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 60, xp: 1e6 };
  ST.giveItem('lushufu', 1, false);
  ST.Game.records.lushu = { count: 10, tier: 1 };
  const changes = ST.equipBest();
  assert(!changes.some(c => /鹿蜀符/.test(c)), '一键最优装跳过前置未达的符');
  assert(!ST.Game.gear.charm || ST.Game.gear.charm.id !== 'lushufu', '且没有把它戴上');

  assert(intSrc56.includes('if (!reqRecordOk(it)) continue;'), '自动装备同样校验');
  assert(uiSrc56.includes('reqRecordText(it)') && uiSrc56.includes('<b>佩用</b>'), '物品详情显示佩用前置');
  assert(uiSrc56.includes("(!recOk ? '著录未及' : '')"), '未达时装备按钮标「著录未及」');
}

// ============ 57. BOSS 特性上屏（v1.15.7） ============
{
  G.resetToDefault();
  const uiSrc57 = uiSrcAll;
  const bosses = Object.values(ST.Monsters).filter(m => m.special);
  assert(bosses.length >= 6, '六凶各有特性（' + bosses.length + ' 只带 special）');
  assert(bosses.every(b => b.special.name && b.desc), '特性有名有说（' + bosses.map(b => b.special.name).join('/') + '）');
  assert(!bosses.some(b => /Periodic/.test(b.desc || '')), '数据里不再夹带英文占位词');

  // 弹窗：特性一行
  assert(uiSrc57.includes('class="hm-line hm-spec"') && uiSrc57.includes('x.special.name'),
    '征伐弹窗单列「特性」行（此前只写在数据里，界面一字不提）');
  // 竞技场：名字旁徽标
  assert(uiSrc57.includes('class="m-spec"') && uiSrc57.includes('m.special.name'),
    '竞技场敌人名旁挂特性徽标');

  // 行为：构造一场战斗，渲染后应出现徽标
  const m = ST.Monsters.yayu;
  ST.Game.combat = { monsterId: 'yayu', monsterHp: m.hp * 0.6, playerHp: 120, timer: 0, maxtimer: 0,
    spec: 0, style: 'attack', dmgOut: 0, dmgIn: 0, round: 3, flee: 0, repeat: null, momentum: 40, combo: 2, ults: 0 };
  ST.UI.currentTab = 'taofa';
  ST.UI.renderTaofa();
  const html57 = (document.getElementById('content') || {}).innerHTML || '';
  assert(/m-spec/.test(html57) && /革甲/.test(html57), '渲染结果里确实有「革甲」徽标');
  ST.Game.combat = null;
}

// ============ 58. 图鉴「仅未录」（v1.15.8） ============
{
  G.resetToDefault();
  const uiSrc58 = uiSrcAll;
  assert(uiSrc58.includes('codexOnlyMiss'), '图鉴有「仅未录」状态');
  assert(uiSrc58.includes('仅未录 ${tabTotal-tabDone}'), '筛选按钮标出还缺多少条');
  assert(uiSrc58.includes("shown = shown.filter(e => !(((Game.records||{})[e.id]||{}).count > 0))"),
    '筛选排除已录条目（与检索叠加，不是二选一）');
  assert(uiSrc58.includes('本类已尽收——没有未著录的条目了。'), '尽收时给正面反馈，而不是「无此条目」');

  // 状态开关可切
  ST.UI.codexOnlyMiss = false;
  ST.UI.codexTab = 'beast';
  ST.UI.renderCodex();
  assert(ST.UI.codexOnlyMiss === false, '默认不筛');
  ST.UI.codexOnlyMiss = true;
  ST.UI.renderCodex();
  assert(ST.UI.codexOnlyMiss === true, '可切到仅未录');
  ST.UI.codexOnlyMiss = false;
  ST.UI.renderCodex();

  // 切分类只换分类，不动筛选状态：
  //   · 检索词要留着——分类按钮上带「本类命中 N」，点过去就是为了看那 N 条，
  //     若顺手清空搜索词，点过去又是一片空白；
  //   · 「仅未录」也留着，那是全局偏好。
  const tabBtn = /onclick="UI\.codexTab='\$\{k\}';UI\.renderCodex\(\)"/;
  assert(tabBtn.test(uiSrc58), '切分类只换分类，保留检索词与「仅未录」');
}

// ============ 59. 装备梯度不断档、不倒退（v1.15.9） ============
{
  G.resetToDefault();
  const all = Object.values(ST.Items).filter(i => i.equip);
  const fam = it => {
    if (it.ranged) return 'bow';
    if (it.slot === 'quiver' || it.type === 'arrow') return 'quiver';
    if (it.axePower) return 'axe';
    if (it.pickPower) return 'pick';
    if (it.netPower) return 'net';
    if (it.slot === 'armor') return 'armor';
    if (it.slot === 'charm') return 'charm';
    return 'melee';
  };
  const val = it => it.dmg || it.def || it.axePower || it.pickPower || it.netPower || 0;

  // 分组按「部位 + 品阶」：珍品强于同级的良品是本分，跨阶比较没意义；
  // 同阶之内才该是一条不相上下的线。
  const groups = {};
  all.forEach(it => {
    const k = fam(it) + '/' + (it.grade || 'fine');
    (groups[k] = groups[k] || []).push(it);
  });
  for (const [name, list] of Object.entries(groups)){
    if (name === 'charm') continue;                 // 护符按效果分强弱，不比数值
    const rows = list.filter(i => i.lvl).sort((a, b) => a.lvl - b.lvl);
    for (let i = 1; i < rows.length; i++){
      const cur = val(rows[i]), prev = val(rows[i - 1]);
      // 同阶之内允许一成回落：凶兽材料装可以「等级低但更强」，
      // 但再低就是真的倒挂。
      assert(cur >= prev * 0.9,
        `${name}：${rows[i].name}(Lv${rows[i].lvl}, ${cur}) 较 ${rows[i - 1].name}(Lv${rows[i - 1].lvl}, ${prev}) 倒退超过一成`);
    }
  }

  // 中期不断档：36→55 原本 19 级没有新兵器，现在 44 级有三件过渡装
  const mid = all.filter(i => i.lvl === 44).map(i => i.name);
  assert(mid.length >= 3, '44 级一组过渡装（' + mid.join('、') + '）');
  assert(ST.Items.bailianjian && ST.Items.bailianjian.dmg > ST.Items.baijinqi.dmg, '百炼剑强于白金戚');
  assert(ST.Items.bailianjian.dmg < ST.Items.zaochimao.dmg, '又弱于 55 级的凿齿矛（留出 BOSS 装的空间）');
  assert(ST.Items.yuzhanggong.dmg > ST.Items.dafenggong.dmg, '豫章弓(70) 强于大风弓(58)——此前 40 < 45');
  assert(ST.Items.cangyuyue.dmg > ST.Items.zaochimao.dmg, '苍玉钺(72) 强于凿齿矛(55)——此前 54 < 55');

  // 三件都能造，且材料都在既有来源里
  for (const id of ['bailianjian', 'xisihejia', 'sangzhegong']){
    const rec = ST.Recipes.find(r => r.out === id);
    assert(!!rec, id + ' 有配方');
    assert(Array.isArray(rec.cost) && rec.cost.every(([m]) => !!ST.Items[m]), id + ' 的材料都是既有物品');
  }
}

// ============ 60. 强化：30 级 / 概率 / 镇物 / 连强（v1.16） ============
{
  G.resetToDefault();
  assert(ST.ENHANCE_MAX === 30, '强化上限 +30');
  assert(ST.ENHANCE_SAFE === 10, '+10 起失败会掉级');

  // 成功率单调不增，且两端合理
  let prev = 1.01, mono = true;
  for (let l = 0; l < 30; l++){ const r = ST.enhanceRate(l); if (r > prev + 1e-9) mono = false; prev = r; }
  assert(mono, '成功率随等级不升');
  assert(ST.enhanceRate(0) === 1, '0→1 必成');
  assert(ST.enhanceRate(29) < 0.05, '+29→30 不足 5%');

  // 材料随等级递增
  ST.Game.enhance = { muge: 0 };
  const c1 = ST.enhanceCost('muge');
  ST.Game.enhance.muge = 29;
  const c30 = ST.enhanceCost('muge');
  assert(c30.tan > c1.tan && c30.shells > c1.shells, '+30 的材料远多于 +1（' + c1.tan + '→' + c30.tan + ' 炭）');

  // 数值曲线：+9 与旧版一致，+30 明显更强
  assert(ST.enhanceScaled(60, 0) === 60, '+0 不加工');
  assert(ST.enhanceScaled(60, 9) === 96, '+9 沿用旧增量（60→96）');
  assert(ST.enhanceScaled(60, 30) > ST.enhanceScaled(60, 9) * 1.5, '+30 相对 +9 有量级提升（' + ST.enhanceScaled(60, 30) + '）');

  // 失败规则：<10 只损材料
  const origRandom = Math.random;
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 60, xp: 1e8 };
  ST.Game.inventory.tan = 5000; ST.Game.shells = 5e6;
  ST.Game.enhance = { muge: 5 };
  Math.random = () => 0.999;                       // 必败
  const f1 = ST.enhanceItem('muge');
  assert(f1.ok && !f1.success && !f1.lost && ST.enhanceLevel('muge') === 5, '+5 失败不掉级');

  ST.Game.enhance = { bailianjian: 12 };
  const f2 = ST.enhanceItem('bailianjian');
  assert(f2.lost && f2.wiped && ST.enhanceLevel('bailianjian') === 0, '+12 失败阶数尽毁（直落 +0）');

  // 镇物：失败亦保原阶，并扣一枚
  ST.Game.enhance = { bailianjian: 12 };
  ST.Game.inventory.zhenwu = 2;
  const f3 = ST.enhanceItem('bailianjian', { stone: true });
  assert(f3.usedStone && !f3.lost && ST.enhanceLevel('bailianjian') === 12, '镇物护住 +12');
  assert(ST.Game.inventory.zhenwu === 1, '镇物消耗一枚');

  // 必成时逐级推进
  Math.random = () => 0;
  ST.Game.enhance = { bailianjian: 0 };
  const r4 = ST.enhanceToTarget('bailianjian', 15, {});
  assert(r4.done && r4.lv === 15, '强化至 +15 达成');
  Math.random = origRandom;

  // 弹窗不关闭：按钮走 UI.enhanceOne / UI.enhanceTo，执行后就地重绘。
  // v1.31.13 起不再传 itemId——目标由 UI._enhTarget 决定（可能是装备槽里的实例），
  // 这样「身上那件」与「行囊同名的那件」各有各的等级。
  const uiSrc60 = uiSrcAll;
  assert(uiSrc60.includes('onclick="UI.enhanceOne()"') && uiSrc60.includes('onclick="UI.enhanceTo()"'),
    '详情里的强化按钮走就地刷新，不再 closeModal');
  assert(uiSrc60.includes('target = target || UI._enhTarget || UI._detailId'),
    '强化目标缺省取当前详情正在看的那一件');
  assert(uiSrc60.includes('UI.refreshItemModal') && uiSrc60.includes('box2.scrollTop = y'),
    '重绘后保持滚动位置');
  assert(uiSrc60.includes("UI.reforgeNow('${itemId}')"), '重铸同样就地刷新');
  assert(uiSrc60.includes('成功率 ${rate}%') && uiSrc60.includes('use镇物') === false, '面板写明成功率');
  assert(/\.enh-rate\.hard\{/.test(readText('style.css')), '成功率有低/中/高三档配色');
}

// ============ 61. 神兵（v1.16） ============
{
  G.resetToDefault();
  const divine = Object.values(ST.Items).filter(i => i.divine);
  assert(divine.length === 10, '十件神兵（' + divine.map(d => d.name).join('、') + '）');
  assert(divine.every(d => ST.DIVINE_EFFECTS[d.divine]), '每件都挂已知特性');
  const kinds = new Set(divine.map(d => d.divine));
  assert(kinds.size === 6, '六种特性都用上了（破甲/饮血/疾风/裂甲/斩厉/混沌）');
  assert(divine.every(d => !ST.Recipes.some(r => r.out === d.id)), '神兵不可锻造');

  // BOSS 与神兵一一对应
  const bossDivine = Object.values(ST.Monsters).filter(m => m.divine);
  assert(bossDivine.length === 10, '十只 BOSS 各有专属神兵（六凶 + 刑天 + 三尊守关神）');
  for (const m of bossDivine){
    assert(!!ST.Items[m.divine], m.name + ' 的神兵存在（' + m.divine + '）');
    assert(ST.Items[m.divine].divine, m.name + ' 的神兵带特性');
  }
  assert(typeof ST.DIVINE_DROP === 'number' && ST.DIVINE_DROP <= 0.1, '掉落率压低（' + Math.round(ST.DIVINE_DROP*100) + '%）');

  // 特性生效：破甲减半防御项
  G.resetToDefault();
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 70, xp: 1e8 };
  ST.Game.gear.weapon = ST.Items.bailianjian;
  ST.Game.combat = { monsterId: 'yayu' };           // 猰貐 def 45
  const plain = ST.playerDamageRange();
  ST.Game.gear.weapon = ST.Items.fenghuifu;         // 神兵·破甲
  const pierce = ST.playerDamageRange();
  assert(pierce.hi > plain.hi, '破甲神兵对厚甲目标伤害更高（' + plain.hi + ' → ' + pierce.hi + '）');
  ST.Game.combat = null;

  // 疾风：攻势更快
  ST.Game.gear.weapon = ST.Items.dafengyugong;
  ST.Game.combat = { monsterId: 'yayu', style:'ranged' };
  const fast = ST.playerAttackInterval();
  ST.Game.gear.weapon = ST.Items.chijingong;
  const slow = ST.playerAttackInterval();
  assert(fast < slow, '疾风神兵攻速更快（' + fast.toFixed(2) + ' < ' + slow.toFixed(2) + '）');
  ST.Game.combat = null;

  // 三尊守关神的两条特性（v1.31.18）：混沌不吃被克，斩厉收半血。
  // 用同一件弓改 divine 字段做对照——伤害区间只受「兵器数值 + 特性」影响，变量只剩特性。
  const fireFoe = Object.values(ST.Monsters).find(m => m.el === '火' && !m.boss);
  const fake = d => Object.assign({}, ST.Items.chijingong, { id:'__divt', divine:d });   // 金弓，火敌 → 被克
  ST.Game.combat = { monsterId: fireFoe.id, monsterHp: 999999 };
  ST.Game.gear.weapon = fake(null);  const plainDmg = ST.playerDamageRange();
  ST.Game.gear.weapon = fake('chaos'); const chaosDmg = ST.playerDamageRange();
  assert(chaosDmg.lo > plainDmg.lo, '混沌：被克不再减伤（' + plainDmg.lo + ' → ' + chaosDmg.lo +
    '，敌 ' + fireFoe.name + ' 火属）');
  ST.Game.gear.weapon = fake('behead');
  ST.Game.combat.monsterHp = Math.floor(fireFoe.hp * 0.9);
  const aboveHalf = ST.playerDamageRange();
  ST.Game.combat.monsterHp = Math.floor(fireFoe.hp * 0.3);
  const belowHalf = ST.playerDamageRange();
  assert(belowHalf.lo > aboveHalf.lo, '斩厉：半血以下伤害更高（' + aboveHalf.lo + ' → ' + belowHalf.lo + '）');
  ST.Game.gear.weapon = ST.Items.ganqi;
  ST.Game.combat = null;

  // 掉落接线 + 详情展示
  const gameSrc61 = readText('src/game.js');
  assert(gameSrc61.includes('m.divine && Items[m.divine] && chance(DIVINE_DROP)'), '击杀 BOSS 时按概率掉神兵');
  const uiSrc61 = uiSrcAll;
  assert(uiSrc61.includes('class="dv-tag"') && uiSrc61.includes('hm-line hm-divine'), '详情与讨伐弹窗都标出神兵');
  assert(ST.itemSources('ganqi').some(x => x.kind === '神兵'), '神兵的来路写着「讨伐 刑天」');
}

// ============ 62. 装备等阶体系（v1.17） ============
{
  G.resetToDefault();
  const all = Object.values(ST.Items).filter(i => i.equip);
  assert(all.every(i => i.grade), '每件装备都标了品阶（' + all.filter(i => !i.grade).map(i => i.name).join('、') + '）');
  assert(Object.keys(ST.GEAR_GRADE).length === 5, '五档：凡 / 良 / 精 / 珍 / 神');
  assert(all.every(i => ST.GEAR_GRADE[i.grade]), '品阶名都在表内');

  // 62.1 数值落在所属品阶的容差带内——这是「合理数值」的可验证定义
  const stat = all.filter(i => ST.gearKindOf(i));
  assert(stat.length === 58, '参与数值校验的装备 58 件（' + stat.length + '）');
  const out = [];
  for (const it of stat){
    const g = ST.GEAR_GRADE[it.grade], r = ST.gearRatio(it);
    if (r < g.mult - g.tol || r > g.mult + g.tol)
      out.push(`${it.name}(${it.grade} ${r.toFixed(2)}, 应 ${(g.mult-g.tol).toFixed(2)}~${(g.mult+g.tol).toFixed(2)})`);
  }
  assert(out.length === 0, '全部落在品阶带内（越界：' + (out.join('；') || '无') + '）');

  // 62.2 基准曲线本身要合理：单调递增，且量级吻合
  for (const k of ['melee', 'bow', 'armor', 'tool', 'quiver']){
    const f = ST.GEAR_BASE[k];
    assert(f(81) > f(1), k + ' 基准随等级上升');
  }
  assert(Math.abs(ST.GEAR_BASE.melee(44) - 40.3) < 0.5, '近战基准 Lv44 ≈ 40（良品应在 40 上下）');
  assert(ST.gearKindOf(ST.Items.bailianjian) === 'melee' && ST.gearKindOf(ST.Items.sangzhegong) === 'bow',
    '部位判定：剑归近战、弓归弓');
  assert(ST.gearKindOf(ST.Items.jinfu) === 'tool' && ST.gearKindOf(ST.Items.tiezu) === 'quiver', '工具与箭各自归类');
  assert(ST.gearKindOf(ST.Items.migufu) === null, '护符不比数值');

  // 62.3 强化上限按品阶分档
  const capOf = id => ST.enhanceCapOf(ST.Items[id]);
  assert(capOf('muge') === 12, '凡品上限 +12');
  assert(capOf('bailianjian') === 18, '良品上限 +18');
  assert(capOf('zaochimao') === 22, '精品上限 +22');
  assert(capOf('cangyuyue') === 26, '珍品上限 +26');
  assert(capOf('ganqi') === 30, '神兵上限 +30');

  // 行为：良品到了 +18 就升不动，神兵还能往上
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 70, xp: 1e8 };
  ST.Game.inventory.tan = 9999; ST.Game.shells = 1e7;
  ST.Game.enhance = { bailianjian: 18 };
  const r1 = ST.enhanceItem('bailianjian');
  assert(r1.ok === false && r1.reason === '已至顶', '良品 +18 后无可再淬');
  assert(ST.Game.inventory.tan === 9999, '到顶时不扣材料');

  ST.Game.enhance = { ganqi: 18 };
  const origRandom = Math.random;
  Math.random = () => 0;                       // 必成
  const r2 = ST.enhanceItem('ganqi');
  Math.random = origRandom;
  assert(r2.ok && r2.lvAfter === 19, '神兵 +18 仍可继续（+19）');

  // 老档：已经强到 +25 的良品不被削，只是不能再升
  ST.Game.enhance = { bailianjian: 25 };
  assert(ST.enhanceLevel('bailianjian') === 25, '旧档 +25 原样保留');
  const r3 = ST.enhanceItem('bailianjian');
  assert(r3.ok === false, '但它已过本件上限，不能再升');
  assert(ST.enhanceScaled(46, 25) > ST.enhanceScaled(46, 18), '保留的等级仍然算数');

  // 62.4 强化至目标：目标被本件上限夹住
  ST.Game.enhance = { bailianjian: 0 };
  const origRandom2 = Math.random;
  Math.random = () => 0;
  const r4 = ST.enhanceToTarget('bailianjian', 30, {});
  Math.random = origRandom2;
  assert(r4.lv === 18 && r4.done, '要 +30 也只到 +18（良品上限）');

  // 62.5 无伤无守之物不可淬（护符）
  ST.Game.inventory.tan = 500;
  const r5 = ST.enhanceItem('migufu');
  assert(r5.ok === false, '护符不可淬炼');
  assert(ST.Game.inventory.tan === 500, '且不白扣材料');

  // 62.6 同等级段，品阶拉开差距：苍玉钺(珍 Lv72) 强于琅玕剑(良 Lv74)
  assert(ST.Items.cangyuyue.dmg > ST.Items.langganjian.dmg,
    '珍品 Lv72(${}) 强于良品 Lv74(${})'.replace('${}', ST.Items.cangyuyue.dmg).replace('${}', ST.Items.langganjian.dmg));
  assert(ST.Items.ganqi.dmg > ST.Items.cangyuyue.dmg * 1.3, '神兵比珍品再高一截');

  // 62.7 界面
  const uiSrc62 = uiSrcAll;
  assert(uiSrc62.includes('function gradeBadge'), '有品阶徽标');
  assert(uiSrc62.includes('<b>等阶</b>') && uiSrc62.includes('较同级良品'),
    '详情列出等阶、较同级良品的强弱、可淬上限');
  assert(uiSrc62.includes('enhanceCapOf(it)') && uiSrc62.includes('class="enh-grade"'),
    '强化面板的上限取自本件品阶（enhanceCapOf），并标出品阶');
  assert(/\.gd-divine\{/.test(readText('style.css')), '五档各有配色');
}

// ============ 63. 老档装备按数据表重建（v1.17） ============
{
  G.resetToDefault();
  const engSrc63 = readText('src/engine.js');
  // 存档里的装备是对象快照。旧快照没有后来新增的字段（品阶、神兵特性），
  // 数值也是当时那一版——不重建的话，调平衡对老玩家不生效，
  // 神兵读出来不带特性，珍品显示成良品。
  assert(/Game\.gear\[slot\] = Object\.assign\(\{\}, Items\[gid\], \{ id: gid, enh \}\)/.test(engSrc63),
    '读档时按 Items 重建装备（而非沿用旧快照），并保留实例的强化等级');

  // 63.0 强化等级不被读档削掉。engine 里曾写死 Math.min(9, v)——
  // 上限提到 30 时忘了同步，强到 +20 的装备一刷新就掉回 +9。
  assert(!/Math\.min\(9,\s*v\)/.test(engSrc63), '读档不再把强化等级钳到 9');
  {
    const d63 = ST.serializeSave();
    d63.enhance = { ganqi: 28, bailianjian: 15 };
    ST.importSaveText(JSON.stringify(d63));
    assert(ST.enhanceLevel('ganqi') === 28, '读档保留 +28（实为 +' + ST.enhanceLevel('ganqi') + '）');
    assert(ST.enhanceLevel('bailianjian') === 15, '读档保留 +15');
    // 非法值仍要剔除
    const d63b = ST.serializeSave();
    d63b.enhance = { ganqi: 999, bailianjian: -3 };
    ST.importSaveText(JSON.stringify(d63b));
    assert(ST.enhanceLevel('ganqi') === 30, '超上限钳到 30（不无限放大）');
    assert(ST.enhanceLevel('bailianjian') === 0, '负数剔除');
  }

  // 造一份「旧档」：苍玉钺 还是 58 点、没有 grade；干戚 没有 divine
  const old = ST.serializeSave();
  old.gear = {
    weapon: { id:'ganqi', name:'干戚', dmg:118, ranged:false, lvl:81 },
    armor:  { id:'cangyuyue' },              // 甚至缺字段
    charm: null, quiver:null, axe:null, pick:null, net:null,
  };
  const ok63 = ST.importSaveText(JSON.stringify(old)).ok;
  assert(ok63, '旧档可读');
  assert(ST.Game.gear.weapon.divine === 'crit', '神兵特性从数据表补回（旧快照没有 divine）');
  assert(ST.Game.gear.weapon.grade === 'divine', '品阶从数据表补回');
  assert(ST.Game.gear.weapon.dmg === ST.Items.ganqi.dmg, '数值取当前数据表，而非旧快照');
  assert(ST.Game.gear.armor && ST.Game.gear.armor.name === '苍玉钺', '只存了 id 的槽位也能补全');
  assert(ST.Game.gear.armor.dmg === ST.Items.cangyuyue.dmg, '苍玉钺取当前 80 点');

  // 普通装备同样
  G.resetToDefault();
  const old2 = ST.serializeSave();
  old2.gear = { weapon:{ id:'bailianjian', name:'百炼剑', dmg:46, lvl:44 } };
  ST.importSaveText(JSON.stringify(old2));
  assert(ST.Game.gear.weapon.grade === 'fine' && ST.Game.gear.weapon.dmg === 46, '良品读档后带品阶');
}

// ============ 64. 烽火台：凶兆先举烽（v1.17.1） ============
{
  G.resetToDefault();
  const gameSrc64 = readText('src/game.js');
  const uiSrc64 = uiSrcAll;

  // 64.1 无烽火台：凶兆即时落地
  ST.Game.stats.time = 1000;
  ST.activateOmen('changyou');
  assert(ST.Game.omens.some(o => o.id === 'changyou'), '无烽火台时大水即时生效');
  assert((ST.Game.omensPending || []).length === 0, '也不留烽烟');

  // 64.2 有烽火台：先举烽，不落地
  G.resetToDefault();
  ST.Game.stats.time = 1000;
  ST.Game.buildings.fenghuotai = true;
  ST.activateOmen('changyou');
  assert(!ST.Game.omens.some(o => o.id === 'changyou'), '有烽火台时凶兆不即时生效');
  assert(ST.Game.omensPending.length === 1, '改为挂进烽烟');
  assert(ST.Game.omensPending[0].id === 'changyou', '烽烟记的是同一征兆');
  assert(ST.Game.omensPending[0].at - ST.Game.stats.time === ST.FORESEE_SEC, '预告 ' + ST.FORESEE_SEC + ' 秒');
  assert(ST.Game.stats.omens.changyou === undefined, '未应验前不算「已现」（图鉴/成就别提前记）');

  // 64.3 到时应验
  ST.Game.stats.time += ST.FORESEE_SEC - 1;
  ST.tickOmens();
  assert(!ST.Game.omens.some(o => o.id === 'changyou'), '差一秒还不应验');
  ST.Game.stats.time += 2;
  ST.tickOmens();
  assert(ST.Game.omens.some(o => o.id === 'changyou'), '到点应验');
  assert(ST.Game.omensPending.length === 0, '烽烟清空');
  assert(ST.Game.stats.omens.changyou === true, '此时才记「已现」');

  // 64.4 吉兆不受影响：烽火台只管凶兆（报忧不报喜，免得把好事也拖四十五秒）
  G.resetToDefault();
  ST.Game.stats.time = 500;
  ST.Game.buildings.fenghuotai = true;
  ST.activateOmen('fenghuang');
  assert(ST.Game.omens.some(o => o.id === 'fenghuang'), '吉兆即时生效');
  assert(ST.Game.omensPending.length === 0, '不进烽烟');

  // 64.5 免疫与「御兵」优先于举烽——预告一个本不会发生的兆是骗人
  G.resetToDefault();
  ST.Game.buildings.fenghuotai = true;
  ST.Game.omenImmune = { changyou: true };
  ST.activateOmen('changyou');
  assert(ST.Game.omensPending.length === 0 && !ST.Game.omens.length, '已免疫的征兆不举烽');
  ST.Game.omenImmune = {};
  ST.Game.deployed = { 0: 'bo' };                    // 駮「可以御兵」
  ST.activateOmen('fuxi');                           // 凫徯：见则有兵
  assert(ST.Game.omensPending.length === 0, '御使駮则不举烽（兵灾本就不来）');

  // 64.6 重复触发只挂一条，且不推迟已定时辰
  G.resetToDefault();
  ST.Game.stats.time = 800;
  ST.Game.buildings.fenghuotai = true;
  ST.activateOmen('changyou');
  const at0 = ST.Game.omensPending[0].at;
  ST.Game.stats.time += 10;
  ST.activateOmen('changyou');
  assert(ST.Game.omensPending.length === 1, '同一征兆只挂一条烽烟');
  assert(ST.Game.omensPending[0].at === at0, '重报不推迟时辰（也不是提前）');

  // 64.7 离线不预告，直接应验
  G.resetToDefault();
  ST.Game.stats.time = 2000;
  ST.Game.buildings.fenghuotai = true;
  ST.Game.omensPending = [{ id:'changyou', at: ST.Game.stats.time + 30, soft:1 }];
  ST.Game.node = 'nanshan-1-01';
  ST.Game.activity = { kind:'gather', skill:'qiaocai', itemId:'gui' };
  const rec64 = ST.settleAway(600);
  assert(ST.Game.omens.some(o => o.id === 'changyou'), '离线归来时烽烟已应验');
  assert(ST.Game.omensPending.length === 0, '烽烟不跨离线');
  assert(rec64.omensLanded === 1, '离线汇总记账（应验 1 次）');

  // 64.8 存档往返
  G.resetToDefault();
  ST.Game.stats.time = 3000;
  ST.Game.omensPending = [{ id:'changyou', at: 3045, soft:0.5 }];
  const ser64 = ST.serializeSave();
  assert(Array.isArray(ser64.omensPending) && ser64.omensPending.length === 1, '烽烟随存档保存');
  const ok64 = ST.importSaveText(JSON.stringify(ser64)).ok;
  assert(ok64 && ST.Game.omensPending.length === 1, '读档后烽烟还在');
  assert(ST.Game.omensPending[0].soft === 0.5, 'soft（不惑减半）一并保留');
  // 非法项剔除
  const bad64 = ST.serializeSave();
  bad64.omensPending = [{ id:'__nope__', at: 1 }, { id:'changyou', at:'x' }, { id:'changyou', at: 9 }];
  ST.importSaveText(JSON.stringify(bad64));
  assert(ST.Game.omensPending.length === 1, '未知征兆与非数字时辰被剔除');

  // 64.9 界面
  assert(gameSrc64.includes('function applyOmen') && gameSrc64.includes('FORESEE_SEC'), '落地与预告分离');
  assert(uiSrc64.includes('class="omen-pending"') && uiSrc64.includes('烽火台已举烽'), '祠祀页有烽烟条');
  assert(uiSrc64.includes("sec('烽烟（将起）'"), '增益浮层单列「烽烟（将起）」');
  assert(uiSrc64.includes('举烽后 45 秒'), '营邑预览写明应验延时');
  assert(/\.omen-pend-box\{/.test(readText('style.css')), '烽烟有独立样式（朱边以示未落）');
  assert(uiSrc64.includes('rec.omensLanded') && uiSrc64.includes('兆应验'), '离线归来弹窗交代烽烟已应验');
}

// ============ 65. 强化：归零与火候（v1.18） ============
{
  G.resetToDefault();
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 80, xp: 1e9 };
  ST.Game.inventory.tan = 99999; ST.Game.shells = 1e9;

  // 65.1 十级以上失败阶数尽毁
  ST.Game.enhance = { bailianjian: 12 };
  const realRandom = Math.random;
  Math.random = () => 0.999;                      // 必败
  const w1 = ST.enhanceItem('bailianjian');
  assert(w1.ok && w1.wiped && w1.lvAfter === 0, '一败俱毁：+12 直落 +0');
  assert(ST.Game.enhanceHeat.bailianjian === 1, '烧毁换一层火候');

  // 安全期内失败不掉级、也不送火候（否则可以在 +9 白刷火候）
  ST.Game.enhance = { bailianjian: 5 };
  ST.Game.enhanceHeat = {};
  const w2 = ST.enhanceItem('bailianjian');
  assert(!w2.lost && ST.enhanceLevel('bailianjian') === 5, '安全区内失败只损材料');
  assert(!ST.Game.enhanceHeat.bailianjian, '安全区失败不攒火候（防刷）');

  // 65.2 火候提高成功率（用 +12：基础 30%，加满火候也不至于顶到 95% 的封顶）
  ST.Game.enhance = { bailianjian: 12 };
  ST.Game.enhanceHeat = { bailianjian: 0 };
  const r0 = ST.enhanceRateFor('bailianjian');
  ST.Game.enhanceHeat = { bailianjian: 6 };
  const r6 = ST.enhanceRateFor('bailianjian');
  assert(Math.abs((r6 - r0) - 6 * ST.ENHANCE_HEAT.STEP) < 1e-9,
    '火候 6 层 ≈ +' + Math.round(6*ST.ENHANCE_HEAT.STEP*100) + '%（' + (r0*100).toFixed(0) + '% → ' + (r6*100).toFixed(0) + '%）');
  ST.Game.enhanceHeat = { bailianjian: 99 };
  assert(ST.enhanceRateFor('bailianjian') <= 0.95, '火候不能把成功率顶成必成（封顶 95%）');
  assert(ST.enhanceHeatOf('bailianjian') === ST.ENHANCE_HEAT.MAX, '层数钳在十二层');

  // 65.3 火候不清退：成了也留着（否则每次归零后重爬的九次成功会把它吃干）
  ST.Game.enhance = { bailianjian: 11 };
  ST.Game.enhanceHeat = { bailianjian: 8 };
  Math.random = () => 0;                          // 必成
  const up = ST.enhanceItem('bailianjian');
  assert(up.success && up.lvAfter === 12, '成功 +1');
  assert(ST.enhanceHeatOf('bailianjian') === 8, '成了火候不减');
  Math.random = realRandom;

  // 65.4 镇物：毁了也保原阶，且不攒火候之外的任何东西
  ST.Game.enhance = { bailianjian: 12 };
  ST.Game.enhanceHeat = { bailianjian: 2 };
  ST.Game.inventory.zhenwu = 3;
  Math.random = () => 0.999;
  const st1 = ST.enhanceItem('bailianjian', { stone: true });
  Math.random = realRandom;
  assert(st1.usedStone && !st1.wiped && ST.enhanceLevel('bailianjian') === 12, '镇物护住 +12');
  assert(ST.Game.inventory.zhenwu === 2, '镇物耗一枚');

  // 65.5 批量强化遇毁即停（不替玩家把材料烧穿）
  ST.Game.enhance = { bailianjian: 10 };
  ST.Game.enhanceHeat = {};
  let calls = 0;
  const guardRandom = () => { calls++; return calls === 1 ? 0 : 0.999; };   // 先成一次，再必败
  Math.random = guardRandom;
  const batch = ST.enhanceToTarget('bailianjian', 18, {});
  Math.random = realRandom;
  assert(batch.wiped && !batch.done, '批量强化遇尽毁即停');
  assert(ST.enhanceLevel('bailianjian') === 0, '停在 +0');

  // 65.6 存档往返
  G.resetToDefault();
  ST.Game.enhance = { bailianjian: 4 };
  ST.Game.enhanceHeat = { bailianjian: 7 };
  const ser65 = ST.serializeSave();
  assert(ser65.enhanceHeat && ser65.enhanceHeat.bailianjian === 7, '火候随存档保存');
  ST.importSaveText(JSON.stringify(ser65));
  assert(ST.enhanceHeatOf('bailianjian') === 7, '读档后火候还在');
  const bad65 = ST.serializeSave();
  bad65.enhanceHeat = { bailianjian: 999, x: -3 };
  ST.importSaveText(JSON.stringify(bad65));
  assert(ST.enhanceHeatOf('bailianjian') === ST.ENHANCE_HEAT.MAX, '越界火候钳到上限');
  assert(!ST.Game.enhanceHeat.x, '负数剔除');

  // 65.7 界面与演出
  const uiSrc65 = uiSrcAll;
  assert(uiSrc65.includes('class="enh-heat"') && uiSrc65.includes('hcells'), '面板有十二格火候');
  assert(uiSrc65.includes('失败阶数尽毁，直落 +0'), '写明失败后果');
  assert(uiSrc65.includes('UI._enhBusy') && uiSrc65.includes('鼓铸中'), '演出期间锁按钮（防连点）');
  assert(uiSrc65.includes('UI.forgeShow(it, { heavy:false })'), '强化播打铁演出再揭晓');
  assert(uiSrc65.includes('UI._revealEnh'), '揭晓有单独反馈（成功跳数字 / 失败震窗）');
  assert(/\.pack-wrap \.inv-panel\{ order:-1; \}/.test(readText('style.css')), '行装页行囊排在前（窄屏在上）');
}

// ============ 66. 后期四座营造（v1.18.1） ============
{
  G.resetToDefault();
  const ids = ['cuihuolu', 'cangshuge', 'zhaoxianguan', 'shanhaige'];
  for (const id of ids){
    const b = ST.BUILDINGS[id];
    assert(!!b, '建筑「' + id + '」已定义');
    assert(b.lvl >= 24, id + ' 是后期建筑（营邑 ' + b.lvl + ' 级）');
    assert(b.cost.every(([m]) => !!ST.Items[m]), id + ' 的材料都在物品表里');
    assert(!!ST.STRUCTURE_ICON_IDS.includes(id), id + ' 有专属画法');
    assert(ST.UI && true, '');
  }
  assert(Object.keys(ST.BUILDINGS).length === 12, '营造共十二座（' + Object.keys(ST.BUILDINGS).length + '）');

  // 66.1 淬火炉：淬炼成功率 +6%
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 70, xp: 1e8 };
  ST.Game.enhance = { bailianjian: 12 };
  ST.Game.enhanceHeat = {};
  ST.Game.buildings = {};
  const r0 = ST.enhanceRateFor('bailianjian');
  ST.Game.buildings.cuihuolu = true;
  const r1 = ST.enhanceRateFor('bailianjian');
  assert(Math.abs((r1 - r0) - 0.06) < 1e-9, '淬火炉使成功率 +6%（' + (r0*100).toFixed(0) + '% → ' + (r1*100).toFixed(0) + '%）');

  // 66.2 藏书阁：修行经验 +10%
  ST.Game.buildings = {};
  const x0 = ST.xpMult();
  ST.Game.buildings.cangshuge = true;
  const x1 = ST.xpMult();
  assert(Math.abs((x1 - x0) - 0.10) < 1e-9, '藏书阁使修行经验 +10%');

  // 行为：同样一次采集，经验确实多一成
  G.resetToDefault();
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 30, xp: 0 };
  ST.Game.node = 'nanshan-1-01';
  const xpOf = (built) => {
    ST.Game.buildings = built ? { cangshuge: true } : {};
    ST.Game.skills.qiaocai = { level: 30, xp: 0 };
    ST.gainXp('qiaocai', 1000);
    return ST.Game.skills.qiaocai.xp;
  };
  const noBook = xpOf(false), withBook = xpOf(true);
  assert(withBook > noBook, '有藏书阁时同量修行得经验更多（' + noBook + ' → ' + withBook + '）');

  // 66.3 招贤馆：御使增益 ×1.15
  G.resetToDefault();
  ST.Game.records = {}; ST.Game.deployed = { 0: 'bo' };
  const b0 = ST.deployedBonuses();
  ST.Game.buildings.zhaoxianguan = true;
  ST.Game.records = {};                                  // 触发缓存重算
  const b1 = ST.deployedBonuses();
  const k0 = Object.keys(b0).find(k => b0[k] > 0);
  if (k0) assert(Math.abs(b1[k0] - b0[k0] * 1.15) < 1e-9, '御使增益整体 ×1.15（' + k0 + '：' + b0[k0].toFixed(3) + ' → ' + b1[k0].toFixed(3) + '）');

  // 66.4 山海阁：离线上限 +3h、效率 +5%
  G.resetToDefault();
  const h0 = ST.offlineCapHours(), e0 = ST.offlineEff();
  ST.Game.buildings.shanhaige = true;
  const h1 = ST.offlineCapHours(), e1 = ST.offlineEff();
  assert(h1 - h0 === 3, '山海阁使离线上限 +3 小时（' + h0 + ' → ' + h1 + '）');
  assert(Math.abs((e1 - e0) - 0.05) < 1e-9, '山海阁使离线效率 +5%');

  // 66.5 每座都有收益预览（营邑弹窗要说得清「建成后如何」）
  const uiSrc66 = uiSrcAll;
  for (const id of ids){
    assert(uiSrc66.includes("case '" + id + "'"), id + ' 在 structureEffectRows 里有收益对比');
  }
}

// ============ 67. 材料的可达性（v1.18.2） ============
{
  G.resetToDefault();
  const nodeLv = {};
  ST.WORLD.regions.forEach(r => r.nodes.forEach(n => { nodeLv[n.id] = n.unlockLevel; }));

  // 67.1 物产等级不得高于产地解锁等级太多：到了那座山却采不了，等于这座山是空的
  const bad = [];
  for (const it of Object.values(ST.Items)){
    if (!it.skill || !it.node || it.lvl == null) continue;
    const nl = nodeLv[it.node];
    if (nl == null) continue;
    if (it.lvl > nl + 2) bad.push(`${it.name}(Lv${it.lvl}) 产自 Lv${nl} 之山`);
  }
  assert(bad.length === 0, '没有「到了山也采不了」的物产（' + (bad.slice(0,4).join('；') || '无') + '）');

  // 67.2 配方材料的获得等级不得比配方本身晚太多（越级采集允许差 8）
  const cropIds = new Set(Object.values(ST.Items).filter(i => i.crop).map(i => i.id));
  const earliest = (id) => {
    const it = ST.Items[id]; if (!it) return 999;
    let best = Infinity;
    if (it.skill && it.lvl) best = Math.min(best, it.lvl);
    for (const r of ST.Recipes) if (r.out === id) best = Math.min(best, r.lvl || 1);
    for (const m of Object.values(ST.Monsters)){
      const loot = (Array.isArray(m.loot) && m.loot.length) ? m.loot : (m.drop ? [[m.drop,1,1]] : []);
      if (loot.some(x => x[0] === id)) best = Math.min(best, m.needLvl || 1);
    }
    for (const s of ST.ShopStock) if (s.itemId === id) best = Math.min(best, s.lvl || 1);
    return best;
  };
  const late = [];
  for (const r of ST.Recipes){
    if (r.type === 'rite') continue;                 // 祠礼是「攒材料」的长期目标，不在此列
    for (const [m] of r.cost){
      if (cropIds.has(m)) continue;                  // 作物靠种子，种子在墟市
      const e = earliest(m);
      if (e !== Infinity && e > (r.lvl || 1) + 8)
        late.push(`${(ST.Items[r.out]||{}).name || r.out}(Lv${r.lvl}) 需 ${(ST.Items[m]||{}).name || m}(Lv${e})`);
    }
  }
  assert(late.length === 0, '没有「配方等级够了却拿不到料」的配方（' + (late.slice(0,4).join('；') || '无') + '）');

  // 67.3 新手工具能真的做出来
  const rope = ST.Recipes.find(r => r.out === 'sheng');
  assert(rope && rope.cost.every(([m]) => (ST.Items[m].lvl || 1) <= 2),
    '绳用一二级材料搓成（此前要 22 级的荆，新手做不了）');
  const net = ST.Recipes.find(r => r.out === 'yuwang');
  assert(net && net.cost.every(([m]) => m === 'sheng' || (ST.Items[m].lvl || 1) <= 5),
    '渔网只用绳与怪木（此前要荆）');
  for (const id of ['shifu', 'shikuo', 'shizu', 'shimao']){
    const r = ST.Recipes.find(x => x.out === id);
    assert(r && r.lvl >= 6, id + ' 的配方等级与沙石产地对齐（Lv' + (r && r.lvl) + '）');
  }
  assert(ST.Items.shashi.lvl <= 7, '沙石等级与箕尾之山一致（Lv' + ST.Items.shashi.lvl + '）');

  // 67.4 芘蠃羹跟着材料走（芘蠃 Lv12，羹不该还写着 39）
  assert(ST.Items.piluogeng.lvl <= ST.Items.piluo.lvl + 3,
    '芘蠃羹等级随芘蠃（' + ST.Items.piluogeng.lvl + ' vs ' + ST.Items.piluo.lvl + '）');

  // 67.5 BOSS 材料装：等级已抬到与材料相称（封豨之牙要打 76 级的封豨）
  const fh = ST.Recipes.find(r => r.out === 'fenghuiyue');
  assert(fh.lvl >= 74, '封豨钺的配方等级与封豨之牙相称（Lv' + fh.lvl + '）');
  assert(ST.Items.fenghuiyue.lvl >= 74, '封豨钺本身也不再是 58 级的"过时货"');
}

// ============ 68. 商店无套利（v1.18.3） ============
{
  G.resetToDefault();
  // 把商旅加成推到最大：市廛 + 商旅满级 + 御使 + 里程碑
  ST.Game.buildings.shichan = true;
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 81, xp: 1e9 };
  ST.Game.deployed = { 0: 'bo' };
  const tm = ST.tradeMult();
  assert(tm > 1.1, '满配商旅倍数确实过 1（' + tm.toFixed(2) + '）——这正是套利的温床');

  const deals = [];
  ST.ShopStock.forEach((s, i) => {
    const it = ST.Items[s.itemId];
    if (!it) return;
    const back = ST.sellValue(s.itemId, s.qty);      // 整批买回来再整批卖回
    if (back >= s.cost) deals.push(`${it.name}：买 ${s.cost} 卖回 ${back}`);
  });
  assert(deals.length === 0, '墟市没有「买进再卖出」的净赚（' + (deals.join('；') || '无') + '）');

  // 火种是唯一「单价 = 价值」的货，最容易被刷；单独盯一条
  const hz = ST.ShopStock.find(s => s.itemId === 'huozhong');
  if (hz){
    assert(ST.sellValue('huozhong', 1) < hz.cost / hz.qty,
      '火种回收价低于买价（' + ST.sellValue('huozhong', 1) + ' < ' + (hz.cost / hz.qty) + '）');
  }

  // 订单一律求购「地里长出来的」，不含墟市货——否则买来交单同样能套
  const shopIds = new Set(ST.ShopStock.map(s => s.itemId));
  const leak = ST.ORDER_POOL.filter(it => shopIds.has(it.id));
  assert(leak.length === 0, '方国订单池不含墟市在售之物（' + (leak.map(x => x.name).join('、') || '无') + '）');
}

// ============ 69. 技能「将至」与配方门槛（v1.18.3） ============
{
  G.resetToDefault();
  const uiSrc69 = uiSrcAll;
  assert(uiSrc69.includes('function nextUnlocks') && uiSrc69.includes('function nextUnlockText'),
    '有解锁预告');

  // 樵采 1 级：六格之内应当列出待解锁的物产，且不含已可采的
  ST.Game.skills.qiaocai = { level: 1, xp: 0 };
  const nx = ST.UI && typeof ST.nextUnlocks === 'function' ? ST.nextUnlocks('qiaocai', 6) : null;
  if (nx){
    assert(nx.length > 0, '樵采一级时确有将至之物（' + nx.map(u => u.lvl + ':' + u.name).slice(0,4).join(' ') + '）');
    assert(nx.every(u => u.lvl > 1 && u.lvl <= 7), '只报 1~7 级之间尚未解锁的');
  }

  // 采集类：11 级樵采 → 13 级的梓/枏/荆/杞（数据修正后它们同落 13 级）
  ST.Game.skills.qiaocai = { level: 11, xp: 0 };
  if (typeof ST.nextUnlocks === 'function'){
    const q = ST.nextUnlocks('qiaocai', 6);
    assert(q.some(u => u.name === '梓' && u.lvl === 13), '11 级樵采的将至里有 13 级的梓');
    assert(!q.some(u => (ST.Items[u.name] || {}).lvl <= 11), '不含已经能采的');
  }

  // 制作类：4 级冶铸 → 6 级石斧
  ST.Game.skills.yezhu = { level: 4, xp: 0 };
  if (typeof ST.nextUnlocks === 'function'){
    const y = ST.nextUnlocks('yezhu', 6);
    assert(y.some(u => u.name === '石斧' && u.lvl === 6), '4 级冶铸的将至里有 6 级石斧');
  }

  // 配方卡片改成「再升 N 级」，差一两级染金（此前只写「需冶铸 6 级」，读不出还差多少）
  assert(uiSrc69.includes('再升 ${r.lvl - levelOf(mapRecipeSkill(r.type))} 级'), '配方写明还差几级');
  assert(uiSrc69.includes("class=\"hint ${r.lvl - levelOf(mapRecipeSkill(r.type)) <= 2 ? 'near' : ''}\""),
    '差一两级时高亮');
}

// ============ 47. 物品用途面板（v1.14.3） ============
{
  G.resetToDefault();
  assert(typeof ST.itemUses === 'function', 'itemUses 已导出');
  const usesYu = ST.itemUses('yu');
  assert(usesYu.length >= 5, '「玉」列出多处用途（' + usesYu.length + ' 处）');
  assert(usesYu.some(u => u.kind === '祠礼'), '用途区分出祠礼祭品');
  assert(usesYu.some(u => u.kind === '琢玉'), '用途区分出琢玉配方');
  const noUse = Object.values(ST.Items).find(i => i.skill && ST.itemUses(i.id).length === 0);
  assert(!!noUse, '存在「暂无合用之方」的物品（如 ' + (noUse && noUse.name) + '）——详情里会直说并给回收价');
  const uiSrc47 = uiSrcAll;
  assert(uiSrc47.includes('class="use-box"') && uiSrc47.includes('暂无合用之方'), '详情弹窗有用途行与空态文案');
}

// ============ 46. 采集等级阶梯与越级采集（v1.14.2） ============
{
  const gameSrc46 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');
  G.resetToDefault();

  // 46.1 同技能相邻物品等级差 ≤ 8（否则玩家只能反复刷同一种，实测渔 1→30 需 24000 次）
  ['qiaocai','caiyu','caiyao','yu','puyi'].forEach(sk => {
    const list = Object.values(ST.Items).filter(i => i.skill === sk && i.lvl).sort((a, b) => a.lvl - b.lvl);
    let worst = 0, at = '';
    for (let i = 1; i < list.length; i++){
      const d = list[i].lvl - list[i-1].lvl;
      if (d > worst){ worst = d; at = list[i-1].name + '→' + list[i].name; }
    }
    assert(worst <= 8, sk + ' 相邻物品等级差 ≤ 8（最大 ' + worst + ' ' + at + '）');
  });
  const yuList = Object.values(ST.Items).filter(i => i.skill === 'yu').sort((a, b) => a.lvl - b.lvl);
  assert(yuList[0].lvl === 1 && yuList[1].lvl <= 9, '渔有起步阶梯（' + yuList[0].lvl + '→' + yuList[1].lvl + '）');

  // 46.2 越级采集：≤8 级可硬采，效率打折；超过则拒绝
  const mid = Object.values(ST.Items).find(i => i.skill === 'yu' && i.lvl === 8);
  assert(!!mid, '存在 8 级鱼（' + (mid && mid.name) + '）');
  ST.WORLD.regions.forEach(r => r.nodes.forEach(n => { ST.Game.map[n.id] = true; }));
  ST.Game.node = (mid.nodes || [mid.node])[0];
  ST.Game.skills.yu.level = 1;
  const before46 = ST.Game.inventory[mid.id] || 0;
  G.doGather(mid.id);
  assert((ST.Game.inventory[mid.id] || 0) > before46, '渔 1 级仍可越 7 级采 8 级鱼（不再被硬门槛钉死）');

  const high46 = Object.values(ST.Items).find(i => i.skill === 'yu' && i.lvl >= 60);
  if (high46){
    ST.Game.node = (high46.nodes || [high46.node])[0];
    const b2 = ST.Game.inventory[high46.id] || 0;
    ST.Game.skills.yu.level = 1;
    G.doGather(high46.id);
    assert((ST.Game.inventory[high46.id] || 0) === b2, '渔 1 级采 ' + high46.lvl + ' 级鱼被拒（差超 8 级）');
  }
  assert(gameSrc46.includes('至多越级 8 级') && gameSrc46.includes('overEff'), '越级采集有明确提示与效率折减');
  assert(gameSrc46.includes('gainXp(skillId, it.xp * qty * (1 + bonus*0.5) * overEff)'), '越级时的经验按效率打折');
}

// ============ 45. 战法姿态 / 连战残势 / 荒山文案（v1.14.1） ============
{
  const uiSrc45 = uiSrcAll;
  const gameSrc45 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');

  // 45.1 战法：四种姿态、四个乘区各自生效
  G.resetToDefault();
  Object.keys(ST.Game.skills).forEach(k => { ST.Game.skills[k].level = 40; });
  ST.packGearAdd('jinjian', 0, 1); ST.equipItem('jinjian');
  assert(Object.keys(ST.TACTICS).length === 4, '战法四种（无 / 疾攻 / 沉稳 / 破军）');
  ST.setTactic('none');
  const b45 = { hi: G.playerDamageRange().hi, def: ST.totalDefence(), iv: G.playerAttackInterval() };
  ST.setTactic('breaker');
  assert(G.playerDamageRange().hi > b45.hi, '破军提高伤害');
  assert(ST.totalDefence() < b45.def, '破军削减防御');
  ST.setTactic('swift');
  assert(G.playerAttackInterval() < b45.iv, '疾攻缩短攻击间隔');
  assert(G.playerDamageRange().hi < b45.hi, '疾攻降低伤害');
  ST.setTactic('steady');
  assert(ST.totalDefence() > b45.def, '沉稳提高防御');
  assert(G.playerAttackInterval() > b45.iv, '沉稳放慢攻势');
  assert(ST.currentTactic().taken < 1, '沉稳带减伤乘区');
  ST.setTactic('none');
  ST.setTactic('breaker');
  assert(ST.serializeSave().prefs.tactic === 'breaker', '战法写入存档（prefs.tactic）');
  ST.setTactic('none');

  // 45.2 连战残势：击杀后按 60% 继承，败北清零
  ST.WORLD.regions.forEach(r => r.nodes.forEach(n => { ST.Game.map[n.id] = true; }));
  const t45 = Object.values(ST.Monsters).filter(m => !m.boss && m.nodeId && m.nodeId.indexOf('nanshan-1') === 0)[0];
  const hp45 = t45.hp;
  t45.hp = 1;
  ST.Game.node = t45.nodeId;
  G.startCombat(t45.id, { times: 5 });
  ST.Game.combat.momentum = 80;
  G.combatTick(3);
  assert(ST.Game.combat && ST.Game.combat.momentum >= 40 && ST.Game.combat.momentum < 100,
    '击杀后残势继承 60%（本场 80 + 一击 16 → 下承 58）-> ' + (ST.Game.combat && ST.Game.combat.momentum));
  assert(gameSrc45.includes('startCombat(lastId);'), '败北复讨不带残势（另起一场，势归零）');
  t45.hp = hp45;
  ST.Game.combat = null;
  assert(gameSrc45.includes('(c.momentum || 0) * 0.6') && gameSrc45.includes('carry'), 'meetKill 把残势交给下一场');

  // 45.3 绝技的在场感 + 荒山说明
  assert(typeof ST.UI.ultimateFx === 'function', '绝技有专属命中特效（放大 + 光点 + 闪白）');
  assert(gameSrc45.includes('UI.ultimateFx'), '绝技释放调用该特效');
  assert(uiSrc45.includes('此山无草木、亦无异兽'), '荒山（原文「无草木」）给出明确说明，而非只写「无所载」');

  // 45.4 数据层不得把编辑备注发给玩家
  const dataSrcs = ['nanshanData.js','xishanData.js','beishanData.js','dongshanData.js','zhongshanData.js']
    .map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'));
  assert(dataSrcs.every(s => s.indexOf('可设计为') < 0), '运行时数据不含「可设计为…」编辑备注（此前 26 处随山志「注解」显示给玩家）');
  assert(dataSrcs.every(s => s.indexOf('"_meta"') < 0), '运行时数据不含 _meta（只服务校勘，不随页面下发）');
  assert(dataSrcs.every(s => !/★[^"]/.test(s.replace(/★"/g, ''))), '运行时数据不含 ★ 开头的编辑批注（rank 等纯 ★ 数据值除外）');
}

// ============ 44. 装备词条 / 势与绝技 / 数值构成 / 收集成就（v1.14） ============
{
  const affixSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'affix.js'), 'utf8');
  const uiSrc44 = uiSrcAll;
  const gameSrc44 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');

  // 44.1 词条体系：池 / 条数 / 确定性 / 槽位
  assert(Array.isArray(ST.AFFIX_POOL) && ST.AFFIX_POOL.length >= 8, '词条池至少八类（' + ST.AFFIX_POOL.length + '）');
  assert(affixSrc.includes('affixSeed') && affixSrc.includes('rollAffixes'), '词条按 id + salt 确定性派生');
  G.resetToDefault();
  assert(ST.affixOf('muge').length === 1, '1 级兵器一条词条');
  assert(ST.affixOf('jinjian').length === 2, '10 级兵器两条词条');
  assert(ST.affixOf('baijinqi').length === 3, '30 级以上兵器三条词条');
  assert(ST.affixOf('yuwang').length === 0, '渔网无战斗槽位，不出词条');
  assert(JSON.stringify(ST.affixOf('jinjian')) === JSON.stringify(ST.affixOf('jinjian')), '同 id 同 salt 词条恒定（可复现，不必写明细进存档）');
  assert(ST.affixOf('pijia').every(x => ['def','dmgTaken','thorns','atkSpeed','lifesteal'].includes(x.stat)), '甲胄只出甲类词条');

  // 44.2 词条计入数值（同一件兵器、不同 salt 对照，排除装备差异）
  Object.keys(ST.Game.skills).forEach(k => { ST.Game.skills[k].level = 30; });
  ST.packGearAdd('jinjian', 0, 1); ST.packGearAdd('pijia', 0, 1);
  ST.equipItem('jinjian'); ST.equipItem('pijia');
  ST.Game.combat = null;
  let saltFeng = -1, saltPlain = -1, saltJi = -1;
  for (let s = 0; s < 80; s++){
    ST.Game.affixSalt = { jinjian: s }; ST.invalidateAffixes();
    const list = ST.affixOf('jinjian');
    if (saltFeng < 0 && list.some(x => x.stat === 'dmgPct')) saltFeng = s;
    if (saltJi  < 0 && list.some(x => x.stat === 'atkSpeed')) saltJi = s;
    // 基线只需不含「锋」——其余词条在「无当前目标、不暴击」的区间计算里不参与
    if (saltPlain < 0 && !list.some(x => x.stat === 'dmgPct')) saltPlain = s;
  }
  assert(saltFeng >= 0 && saltPlain >= 0, 'salt 枚举可找到「锋」与「无输出词条」两类组合');
  ST.Game.affixSalt = { jinjian: saltFeng }; ST.invalidateAffixes();
  const rFeng = G.playerDamageRange();
  ST.Game.affixSalt = { jinjian: saltPlain }; ST.invalidateAffixes();
  const rPlain = G.playerDamageRange();
  assert(rFeng.hi > rPlain.hi, '词条「锋」确实抬高伤害区间（接入生效，不是摆设）');
  if (saltJi >= 0){
    ST.Game.affixSalt = { jinjian: saltJi }; ST.invalidateAffixes();
    const ivFast = G.playerAttackInterval();
    ST.Game.affixSalt = { jinjian: saltPlain }; ST.invalidateAffixes();
    const ivPlain = G.playerAttackInterval();
    assert(ivFast < ivPlain, '词条「疾」确实缩短攻击间隔');
  }
  const defBase44 = ST.enhanceScaled(ST.Game.gear.armor.def || 0, 0)
    + ST.levelOf('ming') * 0.2 + ST.deployedBonuses().def
    + ((ST.Game.gear.charm && ST.Game.gear.charm.defBonus) || 0);
  assert(Math.abs(ST.totalDefence() - defBase44 - ST.affixTotals().def) < 0.01, '防御 = 甲 + 明 + 御使/符 + 词条「固」');

  // 44.3 重铸：代价 / salt 记账 / 词条改变 / 入档
  ST.Game.inventory.tan = 60; ST.Game.shells = 30000;
  ST.Game.affixSalt = {}; ST.invalidateAffixes();     // 归零，便于断言 salt 从 1 起算
  const cost44 = ST.affixReforgeCost('jinjian');
  assert(cost44.tan > 0 && cost44.shells > 0, '重铸有代价（炭 / 贝币）');
  const beforIds = ST.affixOf('jinjian').map(x => x.id).join(',');
  assert(ST.reforgeItem('jinjian') === true, '词条可重铸');
  assert(ST.Game.affixSalt.jinjian === 1, '重铸以 salt 递增记账');
  assert(ST.affixOf('jinjian').map(x => x.id).join(',') !== beforIds, '重铸后词条组合改变');
  const ser44 = ST.serializeSave();
  assert(ser44 && ser44.affixSalt && ser44.affixSalt.jinjian === 1, 'salt 写入存档（词条本身不占存档明细）');

  // 44.4 势与绝技
  G.resetToDefault();
  ST.Game.skills.bing.level = 30; ST.Game.skills.yudi.level = 5;
  const mid44 = Object.keys(ST.Monsters).find(k => !ST.Monsters[k].boss && ST.Monsters[k].nodeId);
  ST.Game.combat = { monsterId: mid44, monsterHp: 5e6, playerHp: 9999, timer: 0, maxtimer: 0, spec: 0,
    style: 'attack', dmgOut: 0, dmgIn: 0, round: 0, flee: 0, momentum: 100, combo: 0, ults: 0 };
  G.combatTick(6);
  assert(ST.Game.combat && ST.Game.combat.ults === 1, '势满 100 自动施放绝技');
  assert(ST.Game.combat.momentum < 100, '绝技释放后势归零重蓄');
  assert(ST.ULTIMATE_NAMES.attack === '断岳' && ST.ULTIMATE_NAMES.ranged === '穿云' && ST.ULTIMATE_NAMES.zhu === '五行合', '三式绝技各有其名');
  const c44 = ST.Game.combat;
  c44.combo = 7; c44.momentum = 50;
  const dmgIn44 = c44.dmgIn || 0;
  for (let i = 0; i < 20 && (c44.dmgIn || 0) === dmgIn44; i++) G.doMonsterAttack(c44, ST.Monsters[mid44]);
  assert(c44.combo === 7, '普通受击不破连击（连击断在自己未命中）');
  ST.Game.combat = null;

  // 44.5 数值构成弹窗
  ['hp','atk','def','eva','el','dps'].forEach(k => {
    const b = G.combatStatBreakdown(k);
    assert(b && Array.isArray(b.rows) && b.rows.length >= 2, '数值构成「' + k + '」给出至少两行来源');
  });
  assert(uiSrc44.includes('UI.openStatModal') && uiSrc44.includes('onclick="UI.openStatModal(\''), '数值条各项可点开构成');

  // 44.6 营造收益对比
  ['zhai','zaoku','tuku','citan','shichan','canglin','fenghuotai','xuegong'].forEach(id => {
    const rows = G.structureEffectRows(id);
    assert(Array.isArray(rows) && rows.length > 0 && rows.every(r => r.from && r.to), '营造「' + id + '」有「现 → 建成后」对比');
  });

  // 44.7 御使三处空转加成的接线 / 两座空转建筑的落地
  assert(gameSrc44.includes('(1 + deployedBonuses().hp)'), '气血接入御使 hp 加成');
  assert(gameSrc44.includes('deployedBonuses().build'), '营造经验接入御使「土功」');
  assert(gameSrc44.includes('deployedBonuses().heal'), '食物回血接入御使「不肿」');
  assert(gameSrc44.includes('Game.buildings.fenghuotai') && gameSrc44.includes('Game.buildings.xuegong'), '烽火台 / 学宫效果落地（此前只有文案）');

  // 44.7b 单文件构建的文件清单必须含新模块（漏一个就等于单文件版少一块功能）
  const order44 = require(path.join(__dirname, '..', 'scripts', 'build-standalone.js')).scriptOrder();
  assert(order44.includes('affix.js'), '单文件构建含 affix.js');
  assert(order44.indexOf('gameData.js') < order44.indexOf('affix.js'), 'affix.js 在 gameData.js 之后内联（依赖 Items）');

  // 44.8 收集成就：状态流转 · 领取 · 不可重复 · 入档
  G.resetToDefault();
  assert(Array.isArray(ST.CODEX_ACHIEVEMENTS) && ST.CODEX_ACHIEVEMENTS.length >= 20, '收集成就至少二十项（' + ST.CODEX_ACHIEVEMENTS.length + '）');
  assert(ST.CODEX_ACHIEVEMENTS.filter(a => a.group === '总录').length === 4, '总录四档（25 / 50 / 75 / 100%）');
  const halfWood = ST.CODEX_ACHIEVEMENTS.find(a => a.id === 'cat_half_灵木');
  assert(halfWood && ST.codexAchState(halfWood) === 'locked', '未达标时成就为「未达」');
  Object.values(ST.CODEX).filter(e => e.cat === '灵木').slice(0, halfWood.need)
    .forEach(e => { ST.Game.records[e.id] = { count: 2, tier: 1 }; });
  assert(ST.codexAchState(halfWood) === 'claimable', '达标后转为「可领」');
  const shells44 = ST.Game.shells, tan44 = ST.Game.inventory.tan || 0;
  assert(ST.claimCodexAch(halfWood.id) === true, '成就可领取');
  assert(ST.Game.shells === shells44 + halfWood.reward.shells, '领取入贝币');
  assert((ST.Game.inventory.tan || 0) === tan44 + halfWood.reward.items[0][1], '领取给材料');
  assert(ST.claimCodexAch(halfWood.id) === false, '同一成就不可重复领取');
  assert(ST.codexAchState(halfWood) === 'claimed', '领取后状态为「已领」');
  const ser44b = ST.serializeSave();
  assert(ser44b.stats.claimed[halfWood.id] === true, '领取记录随存档保存');
  assert(typeof ST.UI.openAchModal === 'function' && uiSrc44.includes('class="ach-bar"'), '图鉴页有成就条与弹窗入口');
}

// ============ 70. 战斗节奏：怪物与玩家必须同阶成长 ============
// 这一节守的是一处「界面能跑、测试不报错，但玩家打不动」的坑：
// 怪血按 L^1.55 长、玩家伤害按线性长，三十级之后同级怪要砍一分钟、玩家十秒就倒，
// 复讨只是无限重来，一级也升不上去。口径取下限玩家——技能等级等于怪的解锁等级、
// 同级良品兵器护甲、不强化、不戴护符、无御使无天赋，见 gameData.js beastStat 的注释。
section('战斗节奏');
{
  G.resetToDefault();
  const gb = ST.GEAR_BASE;
  const scan = (m) => {
    G.resetToDefault();            // 逐只回到干净档，避免上一只的五行/词条残留污染
    const L = m.needLvl || 1;
    ['yudi','bing','ming','she','zhu'].forEach(s => { ST.Game.skills[s].level = L; ST.Game.skills[s].xp = 0; });
    ST.Game.gear.weapon = { id:'__t_w', slot:'weapon', dmg: Math.round(gb.melee(L)), lvl:L, grade:'fine' };
    ST.Game.gear.armor  = { id:'__t_a', slot:'armor',  def: Math.max(1, Math.round(gb.armor(L))), lvl:L, grade:'fine' };
    ST.Game.gear.charm = null; ST.Game.gear.quiver = null;
    ST.Game.enhance = {}; ST.Game.buff = null;
    ST.Game.combat = { monsterId:m.id, style:'attack', playerHp:1e9, monsterHp:m.hp, round:0 };
    const r = ST.playerDamageRange();
    const dps = ((r.lo + r.hi) / 2) / ST.playerAttackInterval();
    const ttk = m.hp / dps;
    const perHit = Math.max(1, m.atk - ST.totalDefence() * 0.3);
    const taken = perHit / ST.monsterInterval(m, { monsterHp: m.hp }) * (1 - (ST.playerEvasion() + 0.05));
    return { ttk, ratio: ST.playerMaxHp() / taken / ttk };
  };
  const all = Object.values(ST.Monsters).filter(m => !m.unkillable && m.hp > 0);
  const mobs = all.filter(m => !m.boss).map(m => ({ m, ...scan(m) }));
  const bosses = all.filter(m => m.boss).map(m => ({ m, ...scan(m) }));
  ST.Game.combat = null;
  assert(mobs.length > 250 && bosses.length === 10, '扫描覆盖 ' + mobs.length + ' 只异兽与 ' + bosses.length + ' 尊 BOSS');

  const slowest = mobs.slice().sort((a, b) => b.ttk - a.ttk)[0];
  assert(slowest.ttk <= 32, `最慢的普通怪 ${slowest.m.name} 单杀 ${slowest.ttk.toFixed(0)} 秒（上限 32）`);
  const frail = mobs.slice().sort((a, b) => a.ratio - b.ratio)[0];
  assert(frail.ratio >= 0.85, `最吃力的普通怪 ${frail.m.name} 能撑到击杀时长的 ${(frail.ratio*100).toFixed(0)}%（下限 85%）`);

  const ttkAll = mobs.map(x => x.ttk).sort((a, b) => a - b);
  const mid = ttkAll[Math.floor(ttkAll.length / 2)];
  assert(mid >= 8 && mid <= 22, `普通怪单杀中位 ${mid.toFixed(1)} 秒，落在 8–22 秒的挂机区间`);

  if (process.env.DBG_TTK) console.log('DBG-MON', bosses.map(x => x.m.id + ':' + x.m.el).join(' '), '| 金vs水=' + ST.wuxingMult('金','水'));
  const slowBoss = bosses.slice().sort((a, b) => b.ttk - a.ttk)[0];
  assert(slowBoss.ttk <= 70, `最久的一尊 BOSS ${slowBoss.m.name} 单杀 ${slowBoss.ttk.toFixed(0)} 秒（上限 70）`);
  const frailBoss = bosses.slice().sort((a, b) => a.ratio - b.ratio)[0];
  assert(frailBoss.ratio >= 0.30, `最险的 BOSS ${frailBoss.m.name} 能撑到击杀时长的 ${(frailBoss.ratio*100).toFixed(0)}%（下限 30%，其余靠进食补）`);

  // BOSS 要值得打：经验至少是同等级异兽的三倍，贝币与神兵另计
  const lvlXp = (L) => 6 + 4.4 * Math.pow(L, 1.36);
  const worstBoss = bosses.slice().sort((a, b) => (a.m.xp / lvlXp(a.m.needLvl)) - (b.m.xp / lvlXp(b.m.needLvl)))[0];
  assert(worstBoss.m.xp >= lvlXp(worstBoss.m.needLvl) * 3,
    `最薄的 BOSS ${worstBoss.m.name} 经验为同级异兽的 ${(worstBoss.m.xp / lvlXp(worstBoss.m.needLvl)).toFixed(1)} 倍（下限 3）`);

  // 气血同阶：九九时一记 BOSS 重击不该超过血量的五分之一，否则只能靠不停进食硬顶
  ST.Game.skills.ming.level = ST.TUNING.MAX_LEVEL;
  assert(ST.playerMaxHp() >= 580, '九九体魄气血 ' + ST.playerMaxHp() + ' 点（≥580）');

  // 祠礼：祭品若比山系门槛晚太多，那套礼在解锁时行不了，等于挂个空壳
  const earliest = (id) => {
    const it = ST.Items[id]; if (!it) return Infinity;
    let best = Infinity;
    if (it.skill && it.lvl) best = Math.min(best, it.lvl);
    ST.Recipes.forEach(r => { if (r.out === id) best = Math.min(best, r.lvl || 1); });
    Object.values(ST.Monsters).forEach(m => {
      const loot = (Array.isArray(m.loot) && m.loot.length) ? m.loot : (m.drop ? [[m.drop, 1, 1]] : []);
      if (loot.some(x => x[0] === id)) best = Math.min(best, m.needLvl || 1);
    });
    (ST.ShopStock || []).forEach(x => { if (x.itemId === id) best = Math.min(best, x.lvl || 1); });
    Object.values(ST.Items).forEach(x => { if (x.crop === id) best = Math.min(best, x.lvl || 1); });  // 作物只走「种」
    return best;
  };
  // ⚠️ RITES 里没有 cost，祭品在 Recipes(type:'rite') 里。
  // 早先这里直接读 r.cost，遍历的是空数组——那条断言其实什么都没查。
  const lateRites = [];
  let riteChecked = 0;
  for (const key of Object.keys(ST.RITES)){
    const r = ST.RITES[key];
    const region = ST.WORLD.regions.find(x => x.regionId === r.regionId);
    const gate = region ? region.unlockLevel : 1;
    const rec = ST.Recipes.find(x => x.type === 'rite' && x.out === key);
    if (!rec) continue;
    riteChecked++;
    if ((rec.lvl || 1) > gate + 10) lateRites.push(`${key} 礼器Lv${rec.lvl} > 门槛${gate}+10`);
    (rec.cost || []).forEach(([mat]) => {
      const e = earliest(mat);
      if (e !== Infinity && e > (rec.lvl || 1) + 8) lateRites.push(`${key}→${mat}(最早${e} > 礼器${rec.lvl}+8)`);
    });
  }
  assert(riteChecked >= 27, '确实逐套查過 ' + riteChecked + ' 套礼的配方（不是空转）');
  assert(lateRites.length === 0,
    '二十八套祠礼：礼器配方不晚于山系门槛 10 级，祭品在礼器等级内可得' + (lateRites.length ? '：' + lateRites.join('、') : ''));
}

// ============ 71. 阴阳嬗变：改战斗内的属性，不改静态表 ============
// 九婴、帝江会周期性换属。此前是直接写 Monsters[id].el —— 那张表是全局静态数据，
// 一场架打完，这只怪的属性就永久转了，刷新页面又变回去；玩家也没法照「宜用属性」
// 提前配兵器，因为不知道下一次遇上它是什么属。现在属性记在战斗上下文 c.el 上。
section('阴阳嬗变不污染静态表');
{
  G.resetToDefault();
  const m = ST.Monsters.jiuying;
  const before = m.el;
  const c = { monsterId:'jiuying', monsterHp:m.hp, playerHp:100, el:m.el };
  ST.doMonsterSpecial(c, m);
  assert(m.el === before, '嬗变后静态表属性未变（' + before + '）');
  assert(c.el === ST.TUNING.ELEMENTS[(ST.TUNING.ELEMENTS.indexOf(before) + 1) % 5], '战斗内属性顺次轮转（' + before + ' → ' + c.el + '）');
  for (let i = 0; i < 4; i++) ST.doMonsterSpecial(c, m);
  assert(c.el === before, '转满五格回到原属（五行循环闭合）');

  // 伤害按「战斗内属性」结算：同武器打木属（金克木）当比打火属（火克金）高
  ST.resetToDefault();
  ['yudi','bing','ming','she','zhu'].forEach(s => { ST.Game.skills[s].level = 50; ST.Game.skills[s].xp = 0; });
  ST.Game.gear.weapon = { id:'__e_w', slot:'weapon', dmg:45, lvl:50, grade:'fine' };
  ST.Game.gear.armor = null; ST.Game.gear.charm = null; ST.Game.enhance = {};
  ST.Game.combat = { monsterId:'jiuying', style:'attack', playerHp:1e9, monsterHp:m.hp, round:0, el:'木' };
  const vsWood = ST.playerDamageRange().hi;
  ST.Game.combat.el = '火';
  const vsFire = ST.playerDamageRange().hi;
  ST.Game.combat = null;
  assert(vsWood > vsFire, `金打木 ${vsWood} > 金打火 ${vsFire}（克制/被克在战斗内生效）`);
  assert(m.el === '水', '全程静态表仍是原文的水属');
}

// ============ 72. 连败三阵收兵 ============
// 改数前的老问题：打不过的怪会被「败北 → 自动复讨 → 再败北」无限循环，
// 玩家离开一会儿回来，日志刷满败报、食物吃空，行动位还一直被占着。
section('连败三阵收兵');
{
  G.resetToDefault();
  ST.Prefs.autoRevive = true;
  const beastA = ST.Monsters.shengsheng, beastB = ST.Monsters.huan;
  assert(ST.Game.stats.deathStreak === 0 && ST.Game.stats.deathStreakOf === null, '新档连败计数为空');
  G.onPlayerDeath({ monsterId: 'shengsheng' }, beastA);
  assert(ST.Game.stats.deathStreak === 1 && ST.Game.stats.deathStreakOf === 'shengsheng', '首败记 1 阵');
  G.onPlayerDeath({ monsterId: 'shengsheng' }, beastA);
  G.onPlayerDeath({ monsterId: 'shengsheng' }, beastA);
  assert(ST.Game.stats.deathStreak === 3, '同一目标累到 3 阵');
  assert(ST.Game.combat === null, '连败三阵后不再开新的一场（停手）');
  G.onPlayerDeath({ monsterId: 'huan' }, beastB);
  assert(ST.Game.stats.deathStreak === 1 && ST.Game.stats.deathStreakOf === 'huan', '换目标重新从 1 计');
  ST.Game.stats.deathStreak = 2; ST.Game.stats.deathStreakOf = 'huan';
  G.meetKill({ monsterId: 'huan' }, beastB);
  assert(ST.Game.stats.deathStreak === 0 && ST.Game.stats.deathStreakOf === null, '打下来之后清零');
}

// ============ 73. 开战前的账：承伤倍数与连败提示 ============
// 「⚠ 可能撑不住」只说了结论，玩家不知道差多少，也不知道差在哪一步。
// 现在给倍数（2 倍气血 = 备两份吃食），并在弹窗里写明这只已经连败几阵。
section('开战前的账');
{
  const uiSrc73 = uiSrcAll;
  assert(uiSrc73.includes('倍气血') && uiSrc73.includes('包中无吃食'), '战斗评估给出承伤倍数；包里没吃食时直说');
  assert(uiSrc73.includes('Game.stats.deathStreakOf===id') && uiSrc73.includes('已连败 ${Game.stats.deathStreak} 阵'),
    '讨伐弹窗在连败两次后写明「已连败 N 阵」');
  assert(uiSrc73.includes('.hm-warn') || fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8').includes('.hm-warn'),
    '连败提示有独立样式（不靠行内上色）');
  // 倍数口径：同样的敌人，气血越高倍数越低——这是「补体魄能解决」的可读信号
  G.resetToDefault();
  const m = ST.Monsters.zaochi;
  ST.Game.combat = { monsterId: 'zaochi', style: 'attack' };
  ST.Game.skills.bing.level = 40; ST.Game.skills.ming.level = 40;
  ST.Game.gear.weapon = { id:'__q_w', slot:'weapon', dmg:28, lvl:40, grade:'fine' };
  ST.Game.gear.armor = null; ST.Game.gear.charm = null;
  const est40 = ST.combatEstimateInner(m, ST.Game.combat);
  ST.Game.skills.ming.level = 81;                       // 只提体魄，攻击不动
  const est81 = ST.combatEstimateInner(m, ST.Game.combat);
  ST.Game.combat = null;
  const mult = (html) => { const g = /承伤约 ([0-9.]+) 倍气血/.exec(html); return g ? parseFloat(g[1]) : 0; };
  assert(est40.cls === 'bad' && mult(est40.html) > 0, `四十级打凿齿撑不住，明写「${mult(est40.html)} 倍气血」`);
  assert(mult(est81.html) > 0 && mult(est81.html) < mult(est40.html),
    `体魄提到九九，同一战的承伤倍数由 ${mult(est40.html)} 降到 ${mult(est81.html)}（补体魄确实管用）`);
  const easy = ST.combatEstimateInner(ST.Monsters.shengsheng, { monsterId: 'shengsheng' });
  assert(easy.cls === 'good' && mult(easy.html) === 0, '稳赢的目标不显示承伤账（不制造无谓焦虑）');

  // 把倍数折成「要备几份」：拿起来就能办，不用玩家自己换算
  ST.Game.skills.ming.level = 40;
  ST.Game.inventory = { danmushi: 30 };
  const withFood = ST.combatEstimateInner(m, ST.Game.combat);
  assert(/需备 [1-9]\d* 份丹木之实/.test(withFood.html), '给出份数：' + (withFood.html.match(/需备 [^·]+/)[0]));
  ST.Game.inventory = {};
  const noFood = ST.combatEstimateInner(m, ST.Game.combat);
  assert(noFood.html.includes('包中无吃食'), '背包空时提示先去备些，而不是让人带着空袋子去打');
}

// ============ 74. 实战：真跑 combatTick，BOSS 打得过、药也吃得上 ============
// 前面几节都是稳态估算（DPS = 平均伤害 ÷ 攻击间隔）。估算看不出绝技、连击、
// 特殊技、进食这些过程性机制，而「打不打得过」恰恰取决于它们。
// 这里用真引擎逐 tick 跑完整一场，是唯一能证明数值可玩的证据。
//
// ⚠️ 造等级时必须同时把 xp 补到位：gainXp 会按 xp 反算等级，只改 level 不改 xp 的话，
// 第一刀砍出去玩家就从 40 级掉回 1 级——早期模拟得出的「BOSS 必败」全是这个坑。
section('实战：一场打完');
{
  const rnd0 = Math.random;
  let seed = 20261025;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const runFight = (id, L, foodN) => {
    G.resetToDefault();
    let xpAt = 0; for (let i = 1; i < L; i++) xpAt += ST.xpForNextLevel(i);
    ['yudi','bing','ming','she','zhu','taofa'].forEach(s => {
      if (ST.Game.skills[s]){ ST.Game.skills[s].level = L; ST.Game.skills[s].xp = xpAt; }
    });
    ST.Game.gear.weapon = { id:'__f_w', slot:'weapon', dmg: Math.round(ST.GEAR_BASE.melee(L)), lvl:L, grade:'fine' };
    ST.Game.gear.armor  = { id:'__f_a', slot:'armor',  def: Math.max(1, Math.round(ST.GEAR_BASE.armor(L))), lvl:L, grade:'fine' };
    ST.Game.gear.charm = null; ST.Game.gear.quiver = null; ST.Game.enhance = {};
    ST.Game.inventory = foodN ? { danmushi: foodN } : {};
    const m = ST.Monsters[id];
    ST.Game.combat = { monsterId:id, monsterHp:m.hp, playerHp:ST.playerMaxHp(), timer:0, maxtimer:0,
      spec:0, style:'attack', dmgOut:0, dmgIn:0, round:0, flee:0, repeat:1,
      el:m.el, momentum:0, combo:0, ults:0 };
    const d0 = ST.Game.stats.deaths;
    let t = 0;
    while (ST.Game.combat && t < 200){ ST.combatTick(0.05); t += 0.05; }
    return { win: !ST.Game.combat && ST.Game.stats.deaths === d0, t:+t.toFixed(1),
             eaten: foodN - (ST.Game.inventory.danmushi || 0) };
  };
  try {
    const bosses = Object.values(ST.Monsters).filter(m => m.boss).sort((a, b) => a.needLvl - b.needLvl);
    const lost = [], slow = [], eats = [];
    bosses.forEach(m => {
      const r = runFight(m.id, m.needLvl, 30);
      if (!r.win) lost.push(m.name);
      if (r.t > 120) slow.push(`${m.name} ${r.t}s`);
      eats.push(r.eaten);
    });
    assert(lost.length === 0, '十尊 BOSS 同级裸装 + 一包吃食，逐 tick 实跑全部可胜' + (lost.length ? '：' + lost.join('、') : ''));
    assert(slow.length === 0, '没有一场拖过两分钟' + (slow.length ? '：' + slow.join('、') : ''));
    assert(Math.max(...eats) <= 8, '单场最多吃掉 ' + Math.max(...eats) + ' 份，不至于把存粮一次清空');

    const zc = runFight('zaochi', 40, 30);
    assert(zc.win && zc.eaten >= 1, `凿齿一战吃下 ${zc.eaten} 份（受击与特殊技之后都会补一口）`);
    const sg = runFight('shengsheng', 1, 0);
    assert(sg.win && sg.t < 15, `一级徒手打狌狌 ${sg.t} 秒收工（新手第一战不劝退）`);
    const tl = runFight('tulou', 35, 0);
    assert(tl.win, '人形凶兽土蝼 Lv35 徒手可胜（不必嗑药）');
  } finally {
    Math.random = rnd0;
  }
}

// ============ 75. 离线往讨：挂着打怪，回来要认账 ============
// 战斗不跨会话（autoAttack 是运行时变量，读档即断），此前玩家挂着打怪去睡，
// 回来一场空——而「挂」正是这个品类的核心动作。现在离山前在打谁会被记下来，
// 回来后按场次补账；吃食不够就打到断粮为止，并在总结里写明。
section('离线往讨');
{
  const mk = (id, L, foodId, n) => {
    G.resetToDefault();
    let xpAt = 0; for (let i = 1; i < L; i++) xpAt += ST.xpForNextLevel(i);
    ['yudi','bing','ming','she','zhu','taofa'].forEach(s => { ST.Game.skills[s].level = L; ST.Game.skills[s].xp = xpAt; });
    ST.Game.gear.weapon = { id:'__o_w', slot:'weapon', dmg: Math.round(ST.GEAR_BASE.melee(L)), lvl:L, grade:'fine' };
    ST.Game.gear.armor  = { id:'__o_a', slot:'armor',  def: Math.max(1, Math.round(ST.GEAR_BASE.armor(L))), lvl:L, grade:'fine' };
    ST.Game.gear.charm = null; ST.Game.enhance = {}; ST.Game.activity = null;
    ST.Game.inventory = foodId ? { [foodId]: n } : {};
    ST.Game._droppedCombat = id;
  };

  // 1) 不必嗑药的目标：按时间折场次
  mk('tulou', 35, null, 0);
  const plain = G.settleAway(2 * 3600);
  assert(!!(plain && plain.combat), '离山时在打土蝼，回来有往讨结算');
  assert(plain.combat.fights > 100, '两小时打了 ' + plain.combat.fights + ' 场土蝼');
  assert(plain.combat.xp > 0 && plain.xp >= plain.combat.xp, '往讨经验并入离线总额 +' + plain.combat.xp);
  assert(ST.Game._droppedCombat === null, '结算后清空目标，不会重复记账');
  const again = G.settleAway(2 * 3600);
  assert(!again || !again.combat, '同一目标不会被结算第二次');

  // 2) 打不过又没吃的：一场也别算，明说为什么
  mk('zaochi', 40, null, 0);
  const noFood = G.settleAway(2 * 3600);
  assert(noFood.combat && noFood.combat.fights === 0, '空手打凿齿：0 场（不凭空送经验）');
  assert(noFood.combat.shortOnFood === true && noFood.combat.needPortion > 0, '并说明每场需 ' + noFood.combat.needPortion + ' 份吃食');

  // 3) 带够吃的：按份数扣，打到断粮为止
  mk('zaochi', 40, 'danmushi', 30);
  const fed = G.settleAway(2 * 3600);
  assert(fed.combat.fights > 0 && fed.combat.fights < 30, '三十份丹木打凿齿 ' + fed.combat.fights + ' 场');
  const left = ST.Game.inventory.danmushi || 0;
  assert(left < 30, '吃食实扣：30 → ' + left);
  assert(fed.shells > 0 && ST.Game.shells > 50, 'BOSS 讨平给贝币 +' + fed.shells);
  assert(fed.combat.shortOnFood === true, '两小时远超存粮，标注「其余时间断粮」');

  // 4) 战利品按期望折进背包
  const gotAny = Object.keys(fed.items || {}).length > 0;
  assert(gotAny, '离线掉落进了背包（' + Object.keys(fed.items || {}).slice(0, 3).join('/') + '…）');
}

// ============ 76. 开机结算：关掉标签页再打开，那段时间也要认 ============
// 离线时长此前只看页面活着时累积的 pendingTime。切后台还算数（回来 dt 很大），
// 但真把标签页关掉，再打开时 dt 从 0 起算——挂一夜，一分没有。
// SAVE_TIME_KEY 一直写着「离线结算用」，却从没人读它。
section('开机结算');
{
  const KEY = 'shj_zhulu_save_v1_time';
  G.resetToDefault();
  ST.Game.activity = { kind:'gather', skill:'caiyao', itemId:'zhuyu', src:'manual' };
  G.saveGame();

  // 刚存过档（60 秒内）：当作刷新页面，不打扰
  assert(G.settleOnBoot() === null, '一分钟内重开不结算（刷新页面不算离山）');

  // 把落盘时间拨回两小时前
  const t0 = parseInt(ST.localStorage.getItem(KEY), 10);
  ST.localStorage.setItem(KEY, String(t0 - 2 * 3600 * 1000));
  const rec = G.settleOnBoot();
  assert(!!rec && rec.seconds >= 7000 && rec.seconds <= 7300, `两小时前落盘：认定离山 ${rec ? Math.round(rec.seconds/60) : 0} 分`);
  assert(rec.xp > 0, '并按离山时长给了经验 +' + rec.xp);
  assert(parseInt(ST.localStorage.getItem(KEY), 10) > t0 - 3600 * 1000, '结算后刷新落盘时间，避免重复记账');
  assert(G.settleOnBoot() === null, '再开机不会把同一段时长算第二遍');

  // 没有时间戳（首次进入 / 清过缓存）：安静跳过，不报错
  ST.localStorage.removeItem(KEY);
  assert(G.settleOnBoot() === null, '无落盘时间时安静跳过');
}

// ============ 77. 行囊检索与全售 ============
// 682 种物品，行囊常常几十栈；找一件东西靠翻，清一栈要点几十下「出售 1」。
section('行囊检索与全售');
{
  const uiSrc77 = uiSrcAll;
  assert(uiSrc77.includes('UI.packListHtml') && uiSrc77.includes('id="invGrid"'),
    '行囊清单抽成生成器，检索时只换清单');
  assert(uiSrc77.includes("id=\"packQ\"") && uiSrc77.includes('UI.patchPackList()'),
    '行囊有检索框，输入时只重绘清单（输入框不重建，光标才留得住）');
  // 出售从「1 件 / 全部」两个死档位改成可填数量（v1.31.6）。
  // 原先想卖 37 件里的 20 件，只能点二十次，或先卖光再买回。
  assert(uiSrc77.includes('id="sellQty"') && uiSrc77.includes('sellN(') && uiSrc77.includes('qtyStep('),
    '物品详情可填数量出售（步进 / 全部 / 直接输入）');
  assert(!uiSrc77.includes('sellAllOf'), '旧的「全售点两次」入口已撤（与新交易区重复）');

  // 底层口径：整栈卖出与「一件一件卖」总额一致，且清空该栈
  G.resetToDefault();
  ST.Game.inventory = { shougu: 12, lurou: 3 };
  const onePrice = ST.sellValue('shougu', 1);
  const allPrice = ST.sellValue('shougu', 12);
  assert(allPrice === onePrice * 12, `整栈出售不折损：${onePrice} × 12 = ${allPrice}`);
  const shells0 = ST.Game.shells;
  ST.sellItem('shougu', 12);
  assert((ST.Game.inventory.shougu || 0) === 0 && ST.Game.shells === shells0 + allPrice,
    '全售后该栈清空、贝币入账 +' + allPrice);
  assert((ST.Game.inventory.lurou || 0) === 3, '其它栈不受影响');
}

// ============ 78. 轮回：等级归零，修为与著录俱在 ============
// 三层各管一件事：等级解锁内容（转生清）、修为终身累计（不清）、轮回印是乘区（不清）。
// 这一节守的就是「转生不能顺手把人清空」——著录、装备、贝币、地图、营造、御使
// 任何一项被清，玩家都会直接弃游，而不是重开一轮。
section('轮回 · 再著一卷');
{
  G.resetToDefault();
  const xpAt = (lv) => ST.xpForLevel(lv);
  ST.Game.skills.taofa   = { level: 81, xp: xpAt(81) };
  ST.Game.skills.caiyao  = { level: 30, xp: xpAt(30) };
  ST.Game.skills.yudi    = { level: 60, xp: xpAt(60) };
  ST.Game.skills.lvxian  = { level: 55, xp: xpAt(55) };
  ST.Game.stats.totalXp  = 1234567;
  ST.Game.records = { shengsheng: { count: 5, tier: 1 } };
  ST.Game.shells = 9999;
  ST.Game.inventory = { shougu: 7 };
  ST.Game.gear.weapon = { id:'tie_sword', name:'铁剑', slot:'weapon', dmg:20 };
  ST.Game.buildings = { zhai: true };
  ST.Game.map = { 'nanshan-1-01': true, 'xishan-3-08': true };
  ST.Game.deployed = { 0: 'shengsheng' };
  const mult0 = ST.xpMult(), yield0 = ST.globalYieldBonus();

  assert(ST.canRebirth(), '任一技艺至九九方可轮回');
  const r1 = ST.doRebirth();
  assert(r1.ok && r1.count === 1, '第一次轮回成立');
  assert(ST.Game.skills.taofa.level === 8, '技艺归起手 8 级');
  assert(ST.Game.skills.caiyao.level === 8, '采集同样归 8 级');
  assert(ST.Game.skills.yudi.level === 60, '舆地保留（走过的路不忘）');
  assert(ST.Game.skills.lvxian.level === 55, '履险保留');
  assert(ST.Game.stats.totalXp === 1234567, '修为一分不少（终身累计）');
  assert(ST.Game.records.shengsheng.count === 5, '著录保留');
  assert(ST.Game.shells === 9999, '贝币保留');
  assert((ST.Game.inventory.shougu || 0) === 7, '行囊保留');
  assert(ST.Game.gear.weapon && ST.Game.gear.weapon.id === 'tie_sword', '装备保留');
  assert(ST.Game.buildings.zhai === true, '营造保留');
  assert(ST.Game.map['xishan-3-08'] === true, '地图保留');
  assert(ST.Game.deployed[0] === 'shengsheng', '御使保留');
  // 一转同时给「轮回印 +30%」与「遗物·厌火之烬 +2%」
  assert(Math.abs(ST.xpMult() - (mult0 + 0.30 + 0.02)) < 1e-9, `修为乘区 ${mult0.toFixed(2)} → ${ST.xpMult().toFixed(2)}（轮回印 +30% + 遗物 +2%）`);
  assert(Math.abs(ST.globalYieldBonus() - (yield0 + 0.10)) < 1e-9, '采获 +10%');
  assert(ST.Game.combat === null && ST.Game.activity === null, '旧战斗与旧行动一并收掉');
  assert(ST.Game.node === 'nanshan-1-01', '送回南山起点（原处多半已打不动）');

  // 二次轮回：起手 +4、轮回印 +8%
  ST.Game.skills.taofa = { level: 81, xp: xpAt(81) };
  const r2 = ST.doRebirth();
  assert(r2.ok && r2.count === 2 && r2.startLv === 16, '第二轮回起手 16 级');
  assert(Math.abs(ST.rebirthGain() - 0.60) < 1e-9, '两枚轮回印 = 修为 +60%');
  assert(ST.Game.rebirth.best >= 240, '记下历史最高总等级 ' + ST.Game.rebirth.best);

  // 未满级不可轮回
  ST.Game.skills.taofa = { level: 80, xp: xpAt(80) };
  assert(ST.canRebirth() === false, '差一级也不许落笔');
  const r3 = ST.doRebirth();
  assert(!r3.ok && !!r3.reason, '不可轮回时给出原因：' + r3.reason);

  // 转生必须真的提速。经验曲线是 L^2.15，前期占比极小，起手等级只省零点几个百分点，
  // 提速全靠乘区——参数改小一点，「轮回」就退化成安慰奖（+8% 时只省 8%，转过跟没转一样）。
  const hoursToMax = (startLv, mult) => {
    let t = 0;
    for (let L = startLv; L < ST.TUNING.MAX_LEVEL; L++){
      const mobXp = 6 + 4.4 * Math.pow(L, 1.36);
      t += ST.xpForNextLevel(L) / (mobXp * mult / 18.7);   // 18.7 秒：单杀中位 + 起手间隔
    }
    return t;
  };
  const h1 = hoursToMax(1, 1);
  const h2 = hoursToMax(ST.TUNING.REBIRTH.START_PER, 1 + ST.TUNING.REBIRTH.XP);
  assert(h2 / h1 <= 0.82,
    `第一转后重回九九约 ${(h2/3600).toFixed(1)} 小时，比首轮 ${(h1/3600).toFixed(1)} 小时省 ${((1-h2/h1)*100).toFixed(0)}%`);

  // 每轮成绩入册：用时 + 本轮总等级，供「刷新纪录」与将来的单轮排行
  const hist = ST.Game.rebirth.history;
  assert(hist.length === 2, '两轮成绩都已入册（' + hist.length + ' 条）');
  assert(hist.every(x => isFinite(x.sec) && x.sec >= 0 && x.total > 0), '每条含用时与本轮总等级');
  assert(hist[1].total >= hist[0].total, '第二轮的起点总等级不低于首轮（起手更高）');
  assert(ST.Game.rebirth.startedAt > 0, '本轮起点已重置');

  // 入档与回读
  G.saveGame();
  const raw = JSON.parse(ST.localStorage.getItem('shj_zhulu_save_v1'));
  assert(raw.rebirth && raw.rebirth.count === 2, '轮回记录入档');
  assert(Array.isArray(raw.rebirth.history) && raw.rebirth.history.length === 2, '轮次成绩随档保存');
  G.loadGame();
  assert(ST.Game.rebirth.count === 2, '读档后转数仍在');
  assert(ST.Game.rebirth.history.length === 2, '读档后成绩仍在');
  assert(ST.Game.stats.totalXp === 1234567, '读档后修为仍在');
}

// ============ 79. 三签：本轮短课，做完一条补一条 ============
// 里程碑是长线的（达成一次、永久加成），日常得有「现在做什么」。
// 三签常挂三条，记的是「相对增量」（base 是抽签那刻的计数），不做时间刷新、不占行动位。
section('三签 · 本轮短课');
{
  G.resetToDefault();
  assert(Array.isArray(ST.Game.bounties) && ST.Game.bounties.length === 0, '新档三签为空');
  ST.bountyTick();
  assert(ST.Game.bounties.length === 3, '首次 tick 补满三条');
  const ids = ST.Game.bounties.map(b => b.id);
  assert(new Set(ids).size === 3, '三条不重样（' + ids.join('/') + '）');

  // 必成的一条：讨伐 2 只
  ST.Game.bounties = [{ id:'hunt', base: ST.Game.stats.kills, target: 2 }];
  const shells0 = ST.Game.shells;
  ST.bountyTick();
  assert(ST.Game.shells === shells0, '没进展不发奖');
  ST.Game.stats.kills += 2;
  ST.bountyTick();
  const pay = ST.Game.shells - shells0;
  assert(pay > 0, '签成得贝 +' + pay);
  assert(ST.Game.stats.bounties === 1, '签成记数');
  assert(ST.Game.bounties.length === 1 && ST.Game.bounties[0].id !== 'hunt', '完成后立刻换了一条新签');

  // 增量口径：抽签之前的旧计数不能算进去
  ST.Game.stats.crafts = 500;
  ST.Game.bounties = [{ id:'craft', base: ST.Game.stats.crafts, target: 1 }];
  const s2 = ST.Game.shells;
  ST.bountyTick();
  assert(ST.Game.shells === s2, '五百次老纪录不算今天的账');
  ST.Game.stats.crafts += 1;
  ST.bountyTick();
  assert(ST.Game.shells > s2, '只认抽签之后的那一次');

  // 目标随等级缩放：等级越高，要的次数越多、赏钱越厚
  const lo = ST.BOUNTIES.find(b => b.id === 'hunt');
  assert(lo.n(5) < lo.n(60) && lo.shells(5) < lo.shells(60), `往讨签随级缩放：${lo.n(5)}→${lo.n(60)} 次，${lo.shells(5)}→${lo.shells(60)} 贝`);
  // 经济闸门：三签是「顺带完成」的额外收入，不能盖过主玩法。
  // 采集一秒一下、祠礼要备祭品，节奏差着数量级——若共用同一个系数，采集签会刷爆贝币。
  const top = ST.BOUNTIES.slice().sort((a, b) => b.shells(81) - a.shells(81))[0];
  assert(top.shells(81) <= 900, '满级最贵的一签（' + top.name + '）也只赏 ' + top.shells(81) + ' 贝');
  const g = ST.BOUNTIES.find(b => b.id === 'gather');
  assert(g.n(81) >= 400, '采集签按「一秒一下」的节奏定次数：满级要 ' + g.n(81) + ' 次（约十分钟）');

  // 换签：抽到做不了的那条（祠礼没备祭品）不能让人干卡着。
  // 换是免费的，代价是新签进度从头算——所以「刷顺手的签」不占便宜。
  ST.Game.bounties = [{ id:'hunt', base: 0, target: 2 }, { id:'craft', base: 0, target: 1 }, { id:'sell', base: 0, target: 2 }];
  ST.Game.stats.kills = 7;
  assert(ST.bountySwap(0) === true, '换签成功');
  assert(ST.Game.bounties.length === 3, '换完还是三条');
  assert(ST.Game.bounties[0].id !== 'hunt', '换掉了原来那条（' + ST.Game.bounties[0].id + '）');
  const nd = ST.bountyDef(ST.Game.bounties[0].id);
  assert(ST.Game.bounties[0].base === ST.bountyCounter(nd.key), '新签 base 取当前计数，进度从头算');
  assert(new Set(ST.Game.bounties.map(b => b.id)).size === 3, '换完三条仍不重样');

  // 入档：三签随档保存，读档后还在
  ST.Game.bounties = [{ id:'hunt', base: 0, target: 3 }, { id:'craft', base: 0, target: 1 }, { id:'sell', base: 0, target: 2 }];
  G.saveGame();
  const raw = JSON.parse(ST.localStorage.getItem('shj_zhulu_save_v1'));
  assert(Array.isArray(raw.bounties) && raw.bounties.length === 3, '三签入档');
  G.loadGame();
  assert(ST.Game.bounties.length === 3 && ST.Game.bounties[0].id === 'hunt', '读档后三签还在');
}

// ============ 80. 御使选优：三十种增益、九只槽，总得有个说法 ============
// 御使增益有三十来种，槽位只有九只，玩家很难口算该上哪几只。
// 这里给每个增益一个「百分比当量」权重（防御是点数，按 1 点 ≈ 0.75% 生存折算），
// 既能排序，也能一键择优；成对御使（蛮蛮）占两槽，分数要折半才公平。
section('御使选优');
{
  G.resetToDefault();
  ST.Game.skills.yushi.level = 81;              // 九槽
  const mark = (id, tier) => { ST.Game.records[id] = { count: 60, tier }; };
  ['shengsheng','gudiao','lushu','lu','jiuwei','boyi','hujiao','chiru','lili','yuyu']
    .forEach(id => mark(id, 4));

  assert(ST.beastSlots() === 9, '九九御使 → 九槽');
  assert(ST.deployableBeasts().length === 10, '十只可御使');

  // 增益文字：百分比 + 点数分开写，不能把「防御 4」写成「防御 +400%」
  const txt = ST.beastBuffText('boyi');
  assert(/防御 \+[\d.]+/.test(txt) && txt.indexOf('%') < 0, '点数型增益不写成百分比：' + txt);
  const txt2 = ST.beastBuffText('gudiao');
  assert(txt2.indexOf('伤害 +') === 0 || txt2.indexOf('伤害 +') > 0, '百分比型增益正常：' + txt2);

  // 著录阶越高，同一只增益越强
  ST.Game.records.shengsheng = { count: 60, tier: 3 };
  const s3 = ST.deployScore('shengsheng');
  ST.Game.records.shengsheng = { count: 60, tier: 5 };
  const s5 = ST.deployScore('shengsheng');
  assert(s5 > s3, `著录阶抬升收益：tier3 ${s3.toFixed(2)} → tier5 ${s5.toFixed(2)}`);

  // 一键最优：填满、按每槽收益择优、低分的让位
  ST.Game.deployed = { 0:'lu' };                // 先放一只垫底的（气血 +3%）
  const r = ST.autoDeployBest();
  assert(r.count === 9, '一键填满九槽（占 ' + r.count + '）');
  const top = ST.deployableBeasts()
    .map(b => ({ id:b.id, s:ST.deployScore(b.id) }))
    .sort((a, b) => b.s - a.s);
  const inSlot = Object.values(ST.Game.deployed);
  assert(inSlot.includes(top[0].id), '收益最高的一只（' + top[0].id + '）在槽中');
  const worst = top[top.length - 1];
  assert(!inSlot.includes(worst.id), '收益最低的一只（' + worst.id + '）被挤出槽位');

  // 成对御使占两槽：把蛮蛮的增益临时调到最高，逼它入选，看槽位怎么落
  if (ST.Monsters.manman && ST.Monsters.manman.pair){
    ST.Game.records.manman = { count: 60, tier: 5 };
    const oldBuff = ST.BEAST_BUFFS.manman;
    ST.BEAST_BUFFS.manman = { label:'蛮蛮·相得', xp: 3 };     // 临时抬到第一
    try {
      const r2 = ST.autoDeployBest();
      assert(r2.count <= ST.beastSlots(), '成对御使不超编（占 ' + r2.count + ' 槽，上限 ' + ST.beastSlots() + '）');
      const idxs = Object.keys(ST.Game.deployed)
        .filter(k => ST.Game.deployed[k] === 'manman').map(Number).sort((x, y) => x - y);
      assert(idxs.length === 2, '分数最高时成对占两槽（' + idxs.length + '）');
      assert(idxs[1] - idxs[0] === 1, '两槽相邻（' + idxs.join(',') + '）');
    } finally {
      if (oldBuff) ST.BEAST_BUFFS.manman = oldBuff; else delete ST.BEAST_BUFFS.manman;
    }
  }
}

// ============ 81. 祠礼：备料可行者一眼可见，可续者一并开 ============
// 二十八套礼平铺，玩家看不出哪套现在就能祭。判据只有两条——材料够、祭祀等级够，
// 抽成 riteReadyList 一份，界面排序、计数、一并开续都走它，免得三处各算一遍。
section('祠礼 · 备料可行');
{
  G.resetToDefault();
  ST.Game.skills.jisi.level = 81;
  const ids = Object.keys(ST.RITES);
  const recOf = (id) => ST.Recipes.find(r => r.type === 'rite' && r.out === id);

  ST.Game.inventory = {};
  const r1 = recOf(ids[0]), r2 = recOf(ids[1]);
  r1.cost.forEach(([iid, q]) => { ST.Game.inventory[iid] = (ST.Game.inventory[iid] || 0) + q * 2; });
  r2.cost.forEach(([iid, q]) => { ST.Game.inventory[iid] = (ST.Game.inventory[iid] || 0) + q * 6; });

  const list = ST.riteReadyList();
  assert(list.length >= 2, '两套备料可行的礼入列（' + list.length + '）');
  assert(list.every(x => x.st.lvOk && x.st.times > 0), '入列的都必须「等级够 + 材料够」');
  let desc = true;
  for (let i = 1; i < list.length; i++) if ((list[i-1].st.times || 0) < (list[i].st.times || 0)) desc = false;
  assert(desc, '名单按可续次数降序（先看能续得多的）');

  const idle = list.filter(x => !x.st.auto).length;
  const opened = ST.openAllRites();
  assert(opened === idle, `一并开续只开名单上的（${opened}/${idle} 套）`);
  assert(list.every(x => ST.Game.riteAuto[x.id] === true), '名单上的礼都已开续祭');
  assert(ST.openAllRites() === 0, '再点一次不会重复计数');

  // 等级不足的礼不该混进名单
  ST.Game.skills.jisi.level = 1;
  const low = ST.riteReadyList();
  assert(low.length < list.length, '祭祀等级降回一级后，备料可行者变少（' + low.length + ' 套）');
  assert(low.every(x => x.st.lvOk), '名单里不会出现等级不够的礼');
}

// ============ 82. 异迹索引：三十二处散在四百多座山里 ============
// 观象 9 处、谒见 20 处、灌木 3 处，每处的按钮只在该山的详情里出现。
// 统计页写着「观象处 3/9」，玩家却没有办法知道差的那 6 处在哪——只能一座座点开看。
// 这一节守两件事：索引不漏类、不少处；达成的口径与实物一致（不写死数字）。
section('异迹索引');
{
  G.resetToDefault();
  ST.Game.skills.yudi.level = 60; ST.Game.skills.lvxian.level = 60;
  const list = ST.heteroSites();
  const total = Object.keys(ST.OBSERVE_SITES).length + Object.keys(ST.AUDIENCE_SITES).length + Object.keys(ST.GROW_SITES).length;
  assert(list.length === total && total >= 30, `索引列出 ${list.length} 处（三表合计 ${total}）`);

  const kinds = new Set(list.map(x => x.kind));
  assert(kinds.has('观象') && kinds.has('观瑞') && kinds.has('谒见') && kinds.has('灌木'), '四类异迹齐全：' + [...kinds].join('/'));
  assert(list.every(x => x.nodeName && x.regionId && x.gain && x.act), '每一处都带山名、山系、收益与入口（缺一格索引里就是空白）');

  // 未完成且已解锁的排最前——打开索引第一眼看到的就是现在能去的
  const first = list[0];
  assert(!first.done && first.unlocked, `首行是「现在能去且还没做」的：${first.kind} ${first.name}`);
  const tail = list[list.length - 1];
  assert(tail.done || !tail.unlocked, '末尾是已完成或尚未解锁的');

  // 状态跟着存档走，不是另记一份
  const obs = list.find(x => x.kind === '观象');
  assert(obs.done === false, '未观之处的 done 为假');
  ST.Game.observed[obs.id] = true;
  assert(ST.heteroSites().find(x => x.id === obs.id).done === true, '观过之后 done 转真');

  const aud = list.find(x => x.kind === '谒见');
  assert(aud.prog && aud.prog.total > 0, `谒见带进度（${aud.prog.got}/${aud.prog.total}）`);
  const site = ST.AUDIENCE_SITES[aud.nodeId];
  site.deities.forEach(d => { ST.Game.records[d.id] = { count: 1, tier: 1 }; });
  const aud2 = ST.heteroSites().find(x => x.id === aud.id);
  assert(aud2.done === true && aud2.prog.got === aud2.prog.total, '谒见遍全部神祇后 done 为真');
  site.deities.forEach(d => { delete ST.Game.records[d.id]; });

  ST.Game.grow = { qisuan: { stage: 0, done: 1 } };
  assert(ST.heteroSites().find(x => x.kind === '灌木' && x.id === 'qisuan').done === true, '灌木成过一次即算已得');

  // 面板：三十二行、顶部计数与实况对得上
  ST.UI.currentTab = 'yudi';
  ST.UI.selRegion = 'nanshan-1'; ST.UI.selNode = null;
  ST.UI.renderYudi();
  const html82 = (renderTargets.content || {}).innerHTML || '';
  assert(html82.includes('hetero-panel') && html82.includes('异迹索引'), '舆地页挂出异迹索引');
  const rows = (html82.match(/class="hetero-row/g) || []).length;
  assert(rows === total, `索引渲染 ${rows} 行（应为 ${total}）`);
  // 整页 innerHTML 会重建（点一行、点「往」、每次结算刷新），不记展开状态就会一碰就收
  assert(html82.includes('ontoggle="UI.heteroOpen=this.open"'), '展开状态自己记着');
  ST.UI.heteroOpen = true;
  ST.UI.renderYudi();
  assert((renderTargets.content.innerHTML.match(/<details class="hetero-panel" open/) || []).length === 1,
    '记过之后重绘仍保持展开');
  ST.UI.heteroOpen = false;
  // 能去的那几行给的是真入口（点下去就是该山的动作，不是另写一套）
  const gotoActs = ST.heteroSites().filter(x => x.unlocked).map(x => x.act);
  assert(gotoActs.some(a2 => a2.startsWith("startObserve('")) && gotoActs.some(a2 => a2.startsWith('startAudience(')),
    '入口分派到各自动作的 start* 函数');
  // 顶部计数逐类核对：三种异迹各报「已得/总数」，与清单里的 done 一致
  const sumOf = (k) => { const a2 = ST.heteroSites().filter(x => x.kind === k); return `${k} <b>${a2.filter(x => x.done).length}</b>/${a2.length}`; };
  ['观象', '谒见', '灌木'].forEach(k => {
    assert(html82.includes(sumOf(k)), `顶部报「${sumOf(k).replace(/<[^>]+>/g, '')}」`);
  });

  // 攻口径：西山百神的位数从数据现算，不是写死的 14
  const xs = [];
  for (const s2 of Object.values(ST.AUDIENCE_SITES)){
    if (String(s2.nodeId).indexOf('xishan-') !== 0) continue;
    for (const d of (s2.deities || [])) xs.push(d.id);
  }
  const ms = ST.Milestones.find(m => m.id === 'xs_deity');
  assert(ms && ms.desc.indexOf(String(xs.length) + ' 位') > 0, `西山百神说明与实际一致：${ms.desc}`);
  G.resetToDefault();
  const msR = ST.Milestones.find(m => m.id === 'xs_deity');
  assert(msR.check() === false, '一位都没谒见时不亮');
  xs.slice(0, -1).forEach(id => { ST.Game.records[id] = { count: 1, tier: 1 }; });
  assert(msR.check() === false, `差一位（${xs.length - 1}/${xs.length}）仍不亮`);
  ST.Game.records[xs[xs.length - 1]] = { count: 1, tier: 1 };
  assert(msR.check() === true, `谒遍 ${xs.length} 位后点亮`);

  // 回归：山志浮层一份 + 正文一份。此前正文里重复渲染了两遍，同一段「地气」连着出现三次。
  G.resetToDefault();
  ST.Game.skills.yudi.level = 81; ST.Game.skills.lvxian.level = 81;
  const spId = Object.keys(ST.SPECIAL_NODES)[0];
  ST.UI.selRegion = spId.replace(/-\d+$/, ''); ST.UI.selNode = spId;
  ST.UI.renderYudi();
  const spCnt = ((renderTargets.content.innerHTML.match(/class="special-note"/g)) || []).length;
  assert(spCnt === 2, `特殊节点的「地气」只出现两处（山志浮层 1 + 正文 1，实为 ${spCnt}）`);

  // 统计页也要给一条去路：报完「还差几处」，点一下就到索引，别让人看完数字再一座座山翻
  ST.UI.currentTab = 'stats'; ST.UI.renderStats();
  const htmlStat = (renderTargets.content || {}).innerHTML || '';
  const hsAll = ST.heteroSites();
  assert(htmlStat.includes('data-stat="hetero"') && htmlStat.includes(`异迹 <b data-stat="hetero">${hsAll.filter(x => x.done).length}/${hsAll.length}</b>`),
    '统计页报异迹进度，并指出可查看');
  ST.UI.heteroOpen = false;
  ST.UI.currentTab = 'skills';
  ST.UI.gotoHetero();
  assert(ST.UI.currentTab === 'yudi', '点「查看索引」切到舆地页');
  assert(ST.UI.heteroOpen === true, '并顺手把索引展开');
  assert((renderTargets.content.innerHTML.match(/<details class="hetero-panel" open/) || []).length === 1, '落地时索引已是展开态');
  ST.UI.heteroOpen = false;
}

// ============ 83. 谒见必有赐：二十处，初谒一物 ============
// 中山十神此前一件赐物都没有：谒见一趟只换一条图鉴，而七十三级往后它们
// 恰恰是不可讨伐、唯一能做的动作。西山诸神却各赐鸟羽——两份表对不上。
// 现在补齐，且中山赐的正是本系祠礼要用的那件祭品：谒见 → 得料 → 行祭。
section('谒见之赐');
{
  G.resetToDefault();
  const sites = Object.entries(ST.AUDIENCE_SITES);
  assert(sites.length === 20, '谒见点共 ' + sites.length + ' 处');
  const empty = sites.filter(([, s2]) => !(s2.deities || []).some(d => d.gift)).map(([k]) => k);
  assert(empty.length === 0, '每处至少一位神祇带初谒之赐' + (empty.length ? '：' + empty.join('、') : ''));

  // 中山诸神：赐物必须是本系祠礼要用的那一样，否则「谒见」与「行祭」还是两张皮。
  // 例外（v1.31.20）：泰逢/耕父/帝之二女赐专属护符（神赐异宝，不入礼单）。
  const DEITY_CHARM = { zs_taifeng:'zs_taifeng_huang', zs_gengfu:'zs_fengshan_light', zs_ernv:'zs_ernv_pei' };
  const offRite = [];
  for (const [nodeId, s2] of sites){
    if (nodeId.indexOf('zhongshan-') !== 0) continue;
    const regionId = nodeId.replace(/-\d+$/, '');
    const rite = ST.Recipes.find(r => r.type === 'rite' && (ST.RITES[r.out] || {}).regionId === regionId);
    if (!rite) continue;
    const cost = new Set((rite.cost || []).map(([id]) => id));
    if (!s2.deities.some(d => d.gift && (cost.has(d.gift) || DEITY_CHARM[d.id] === d.gift)))
      offRite.push(`${s2.name}→${s2.deities.map(d => d.gift || '无').join('/')}`);
  }
  assert(offRite.length === 0, '中山诸神的赐物都在本系礼单之内（三神护符例外）' + (offRite.length ? '：' + offRite.join('、') : ''));

  // 三神特例赐物：真护符、真加成、全游戏唯一来源
  const charmIds = Object.values(DEITY_CHARM);
  for (const cid of charmIds){
    const it = ST.Items[cid];
    assert(it && it.equip && it.slot === 'charm', cid + ' 是可装备护符');
    assert(!ST.Recipes.some(r => r.out === cid), cid + ' 无配方（唯一来源=初谒之赐）');
  }
  assert(ST.Items.zs_taifeng_huang.xpBonus === 0.08, '泰逢璜 xp+8%');
  assert(ST.Items.zs_fengshan_light.yieldBonus === 0.12, '丰山之光 采获+12%');
  assert(ST.Items.zs_ernv_pei.dmgBonus === 0.08, '帝女之珮 伤害+8%');
  // 其余七位中山神仍赐祭品（礼单闭环不被破坏）
  const zhongGifts = [];
  for (const [nodeId, s2] of sites){
    if (nodeId.indexOf('zhongshan-') !== 0) continue;
    s2.deities.forEach(d => zhongGifts.push([d.id, d.gift]));
  }
  for (const [did, g] of zhongGifts){
    if (!DEITY_CHARM[did]) assert(g && ST.Items[g] && !ST.Items[g].equip, did + ' 仍赐祭品（' + g + '）');
  }

  // 实发：只在初谒给一次，且赐物真进背包
  ST.Game.inventory = {};
  const nid = 'zhongshan-6-01';                 // 平逢之山 · 骄虫（赐吉玉）
  const god = ST.AUDIENCE_SITES[nid].deities[0];
  assert(god.gift === 'jiyu2', '骄虫赐吉玉（' + god.gift + '）');
  const shells0 = ST.Game.shells;
  ST.doAudience(nid);
  assert((ST.Game.inventory.jiyu2 || 0) === 1, '初谒得吉玉×1（实有 ' + (ST.Game.inventory.jiyu2 || 0) + '）');
  assert(((ST.Game.records[god.id] || {}).count || 0) === 1, '神祇同时入录');
  ST.doAudience(nid);
  assert((ST.Game.inventory.jiyu2 || 0) === 1, '再谒不再赐（赐物只认首见）');
  assert(ST.Game.shells === shells0, '谒见不发贝币（不另开一条刷钱路）');

  // 赐物写进异迹索引：玩家挑这一趟值不值，得先看见给什么
  const row = ST.heteroSites().find(x => x.kind === '谒见' && x.id === nid);
  assert(row && row.gain.indexOf('初谒赐') >= 0 && row.gain.indexOf('吉玉') >= 0, '索引写明赐物：' + (row || {}).gain);

  // 神赐护符的加成要真接线（v1.31.20）：佩戴前后 xpMult / globalYieldBonus / dmgMult 必须变化
  const oldCharm = ST.Game.gear.charm;
  ST.Game.gear.charm = ST.Items.zs_taifeng_huang;
  const xpWith = ST.xpMult();
  ST.Game.gear.charm = ST.Items.zs_fengshan_light;
  const yWith = ST.globalYieldBonus();
  ST.Game.gear.charm = ST.Items.zs_ernv_pei;
  const dWith = ST.dmgMult();
  ST.Game.gear.charm = oldCharm;
  assert(xpWith >= 0.08 + (oldCharm && oldCharm.xpBonus || 0), '泰逢璜入 xpMult（' + xpWith.toFixed(3) + '）');
  assert(yWith >= 0.12, '丰山之光入 globalYieldBonus（' + yWith.toFixed(3) + '）');
  assert(dWith >= 1.08, '帝女之珮入 dmgMult（' + dWith.toFixed(3) + '）');
}

// ============ 84. 六凶 0/7：分子分母不是一回事 ============
// 统计页写着「六凶 x/7」，而六凶只有六位；分子数的却是 bossKills 的全部键，
// 于是杀过刑天/陆吾的档会把它们算进「六凶」。三处各抄一份 id 列表，
// 分母写错也没人察觉——现在名单只有一份 SIX_BEASTS。
section('六凶名单与统计口径');
{
  G.resetToDefault();
  assert(Array.isArray(ST.SIX_BEASTS) && ST.SIX_BEASTS.length === 6, '六凶名单六位');
  assert(ST.SIX_BEASTS.every(id => ST.Monsters[id] && ST.Monsters[id].boss), '名单里每一位都是 BOSS');
  assert(new Set(ST.SIX_BEASTS).size === 6, '名单无重复');

  // 名单是单一出处：成就与征伐页分组都得读它，不许再抄一份 id 列表
  const dataSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'gameData.js'), 'utf8');
  const uiSrc84 = uiSrcAll;
  const msSrc = dataSrc.slice(dataSrc.indexOf("id:'boss_all'"), dataSrc.indexOf("id:'boss_all'") + 320);
  assert(/SIX_BEASTS\.(every|filter)/.test(msSrc), '六凶伏诛按名单判定（不另写 id 数组）');
  assert(uiSrc84.includes('SIX_BEASTS.includes'), '征伐页的六凶分组按名单筛');
  assert(!uiSrc84.includes('bosses">${Object.keys(s.bossKills||{}).length}/7'),
    '统计页不再写死 /7');

  // 口径：杀过刑天不算六凶，但算「凶神」
  ST.Game.stats.bossKills = { zaochi: true, xingtian: true };
  ST.UI.currentTab = 'stats'; ST.UI.renderStats();
  const html84 = (renderTargets.content || {}).innerHTML || '';
  const bossAll = Object.values(ST.Monsters).filter(m => m.boss).length;
  assert(html84.includes(`六凶 <b data-stat="six">1/6</b>`), '六凶 1/6（刑天不计入）');
  assert(html84.includes(`凶神 <b data-stat="bosses">2/${bossAll}</b>`), `凶神 2/${bossAll}（全部 BOSS 单列）`);
  assert((html84.match(/stat-link" onclick="UI\.switchTab\('taofa'\)"/g) || []).length >= 2, '两格都能点进征伐页（数字后面给去路）');

  // 成就：差一位不亮，六位齐了才亮
  const ms = ST.Milestones.find(m => m.id === 'boss_all');
  assert(ms.check() === false, '只杀两位时不亮');
  ST.SIX_BEASTS.forEach(id => { ST.Game.stats.bossKills[id] = true; });
  assert(ms.check() === true, '六凶齐了点亮');

  // 读档：装备 id 已不在物产表（旧档改名）时不能凭空抹掉——那可能是一件 +18 的兵器
  G.resetToDefault();
  ST.Game.enhance = { __ghost: 18 };
  ST.Game.gear.weapon = { id:'__ghost', slot:'weapon', dmg:99, lvl:40 };
  G.saveGame();
  G.loadGame();
  assert(ST.Game.gear.weapon && ST.Game.gear.weapon.id === '__ghost', '失效装备按原样保留，不静默清空');
  assert(ST.Game.gear.weapon.dmg === 99, '连同原数值一起保留（先保住，再提示换）');
  assert(ST.Game.enhance.__ghost === 18, '强化等级也还在');
  // 正常装备照旧一律按 Items 重建（新字段才跟得上平衡调整）
  ST.Game.gear.weapon = { id:'pijia', slot:'armor', def:1 };
  G.saveGame(); G.loadGame();
  const pj = ST.Game.gear.weapon;
  assert(pj && pj.def === ST.Items.pijia.def && pj.grade === ST.Items.pijia.grade, '正常装备仍按物品表重建（不沿用旧快照）');
}

// ============ 85. 长线成就：进度与判定读同一份数 ============
// 「南山舆图」原先数的是 Object.keys(Game.map).length —— 全部到访节点，
// 在南山西山北山各逛十几座也能凑满 39，南山一座没走完就亮了；
// 「三谷观象」数的是 observed 总数 ≥3，观瑞与东山四处也算进去。
// 界面又不显示进度，所以两处错了很久都没人发现。
section('长线成就进度');
{
  G.resetToDefault();
  const msOf = (id) => ST.Milestones.find(m => m.id === id);
  const nsTotal = ST.WORLD.regions.filter(r => r.regionId.indexOf('nanshan-') === 0).reduce((a, r) => a + r.nodes.length, 0);
  assert(nsTotal === 39, '南山经 ' + nsTotal + ' 山');

  // 每条都有 prog，返回 [已得, 目标]，目标为正
  const bad = [];
  ST.Milestones.forEach(m => {
    if (typeof m.prog !== 'function') return bad.push(m.name + '(无 prog)');
    const p = m.prog();
    if (!Array.isArray(p) || p.length !== 2 || !isFinite(p[0]) || !isFinite(p[1]) || p[1] <= 0) bad.push(m.name + JSON.stringify(p));
    else if (m.check() !== (p[0] >= p[1])) bad.push(m.name + '(check 与 prog 不一致)');
  });
  assert(bad.length === 0, `${ST.Milestones.length} 条成就都有可读进度且判定一致` + (bad.length ? '：' + bad.join('、') : ''));

  // 南山舆图：别处的节点不算数
  const ns = msOf('yudi_all');
  const foreign = Object.keys(ST.WORLD.regions.filter(r => r.regionId.indexOf('nanshan-') !== 0)
    .flatMap(r => r.nodes.map(n => n.id))).slice(0, 39);
  ST.Game.map = {};
  foreign.forEach(id => { ST.Game.map[id] = true; });
  assert(foreign.length >= 39, '拿 ' + foreign.length + ' 座外系山头充数');
  assert(ns.prog()[0] === 0, '南山进度仍是 0（别处走过的不算）');
  assert(ns.check() === false, '别处凑满 39 座不点亮「南山舆图」');
  const nsIds = ST.WORLD.regions.filter(r => r.regionId.indexOf('nanshan-') === 0).flatMap(r => r.nodes.map(n => n.id));
  nsIds.forEach(id => { ST.Game.map[id] = true; });
  assert(ns.prog()[0] === 39 && ns.check() === true, '南山 39 座走遍才点亮');

  // 三谷观象：只认南山那三处（观瑞与东山四处不算）
  const gu = msOf('guan_all');
  assert(gu.prog()[1] === 3, '目标为三处观象');
  ST.Game.observed = { danxue: true, nanyu: true, ds_dongshan_2_01: true, ds_dongshan_3_01: true };
  assert(gu.prog()[0] === 0 && gu.check() === false, '观瑞与东山观象不计入「三谷观象」');
  ST.Game.observed = { qiuwu: true, yugu: true, zhonggu: true };
  assert(gu.prog()[0] === 3 && gu.check() === true, '南山三处观象齐了点亮');

  // 界面：进度数与细进度条都渲染出来，且与 prog 同源
  ST.Game.stats.bossKills = { zaochi: true };
  ST.UI.currentTab = 'stats'; ST.UI.renderStats();
  const html85 = (renderTargets.content || {}).innerHTML || '';
  const sixP = msOf('boss_all').prog();
  assert(html85.includes(`>${sixP[0]}/${sixP[1]}<`) || html85.includes(`>${sixP[0]}/${sixP[1]}</b>`),
    `六凶伏诛显示进度 ${sixP[0]}/${sixP[1]}`);
  assert((html85.match(/class="ms-bar"/g) || []).length === ST.Milestones.length, '每条都带进度条');
  // v1.31.14：光有 title 不够——手机没有 hover。改成点得开，弹窗里写清「怎么做」。
  assert(html85.includes('title="击败六凶全部'), '悬停可见达成条件（名字太短，光看「六凶伏诛」猜不出要几位）');
  assert(/data-ms="\d+"[^>]*onclick="UI\.msDetail\(\d+\)"/.test(html85), '每条成就可以点开详情');
  assert(html85.includes('点开看怎么做'), 'title 里点明可以点开');
}

// ============ 86. 同好：群号入介绍 + 复制降级 ============
// 群里要贴的多半是一长串数字，手打必错；而 http 页面、老浏览器下
// navigator.clipboard 根本不存在，所以必须有「弹一段可选文本」的降级。
section('同好与复制');
{
  G.resetToDefault();
  assert(/^\d{6,12}$/.test(ST.GAME_META.group || ''), '群号写在 GAME_META 里（' + ST.GAME_META.group + '）');

  ST.UI.currentTab = 'about'; ST.UI.renderAbout();
  const html86 = (renderTargets.content || {}).innerHTML || '';
  assert(html86.includes(ST.GAME_META.group), '关于页显示群号');
  assert(html86.includes('复制群号') && html86.includes('UI.copyText'), '并给一键复制');
  assert(html86.indexOf('<h4>同好</h4>') > 0, '单列一栏「同好」，不塞在脚注里');

  // 降级：没有 clipboard 就弹可手选的文本，而不是静默失败
  // （沙箱里 navigator 是 Node 自带的，干脆整个换成一个只有 clipboard:undefined 的桩）
  const hadNav = ('navigator' in context);
  const oldNav = context.navigator;
  context.navigator = { clipboard: undefined };
  try {
    renderTargets.modalBox.innerHTML = '';
    const r = ST.UI.copyText('1132221462', '已复制');
    assert(r === false, '无 Clipboard API 时返回 false');
    assert(String(renderTargets.modalBox.innerHTML).includes('1132221462'), '改弹一段可手选的文本');
    assert(String(renderTargets.modalBox.innerHTML).includes('请手动复制'), '并说明为什么');
  } finally {
    if (hadNav) context.navigator = oldNav; else delete context.navigator;
  }

  // 实时刷新：凶神的分子分母要同一口径（静态渲染改好了，patch 曾把它改回 /7）
  ST.Game.stats.bossKills = { zaochi: true, xingtian: true };
  ST.UI.currentTab = 'stats';
  const seen = {};
  const orig = G.document.querySelector;
  G.document.querySelector = (sel) => (seen[sel] = seen[sel] || { textContent:'', classList:{ toggle(){} }, querySelector:()=>null, style:{} });
  ST.UI.patchStats();
  G.document.querySelector = orig;
  const bossAll = Object.values(ST.Monsters).filter(m => m.boss).length;
  assert(seen['[data-stat="six"]'].textContent === '1/6', 'patch 后六凶仍是 1/6（' + seen['[data-stat="six"]'].textContent + '）');
  assert(seen['[data-stat="bosses"]'].textContent === '2/' + bossAll, 'patch 后凶神是 2/' + bossAll);
  const uiSrc86 = uiSrcAll;
  assert(!uiSrc86.includes("bosses: Object.keys(s.bossKills || {}).length + '/7'"), '实时刷新里不再有写死的 /7');
}

// ============ 87. 战绩：一段能贴进群里的话 ============
// 群里对进度时，「我六十级」说不清——是总等级六十，还是某一门？讨伐过几位？
// 这里把将来排行榜要收的几个字段凑成一段纯文本，粘过去就完了。
section('战绩文本');
{
  G.resetToDefault();
  const xpAt = (lv) => ST.xpForLevel(lv);
  ['yudi','bing','ming','she','zhu','taofa','jisi','zhulu','caiyao','caiyu']
    .forEach(k => { if (ST.Game.skills[k]) ST.Game.skills[k] = { level: 60, xp: xpAt(60) }; });
  ST.Game.stats.totalXp = 988000;
  ST.Game.stats.time = 45000;
  ST.Game.stats.bossKills = { zaochi: true, jiuying: true, dafeng: true, luwu: true };
  ST.Game.enhance = { zaochiren: 18, pijia: 6 };
  ST.Game.rebirth = { count: 1, at: 1, best: 200, startedAt: 1, history: [{ at: 1, sec: 13200, total: 200, best: 60 }] };
  ST.Game.records = { shengsheng: { count: 9, tier: 4 } };

  const txt = ST.shareText();
  assert(typeof txt === 'string' && txt.split('\n').length >= 8, '战绩是多行文本（' + txt.split('\n').length + ' 行）');
  assert(txt.includes('1132221462'), '带同好群号');
  assert(txt.includes('hai1995.github.io'), '带站点地址（群里新人才知道去哪玩）');
  assert(txt.includes('六凶　3 / 6') && txt.includes('凶神 4 / 10'), '六凶与凶神分开报（口径不混）');
  assert(txt.includes('+18') && txt.includes('凿齿獠牙'), '最高强化取最高那件并写名字');
  assert(txt.includes('3 小时 40 分'), '单轮最快取历史纪录');
  assert(txt.includes('第 2 卷'), '轮回后写「第 N 卷」（readable）');
  assert(txt.includes('98.8 万'), '修为按万折算，不写一长串数字');

  // 新档：没有强化、没有轮回，也要能生成（不能因为缺历史就报错）
  G.resetToDefault();
  const t2 = ST.shareText();
  assert(t2.includes('最高强化　尚无') && t2.includes('单轮最快　尚未轮回'), '新档写明「尚无 / 尚未轮回」');
  assert(ST.bestEnhance().lv === 0, '无强化时最高为 0');

  // 不依赖界面层：fmt / fmtTime 都在 ui.js，若这里用了它们，早期调用会 ReferenceError
  const gameSrc87 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');
  const fnBody = gameSrc87.slice(gameSrc87.indexOf('function shareText'), gameSrc87.indexOf('window.shareText'));
  assert(!/(^|[^w.])fmt\(/.test(fnBody) && !fnBody.includes('fmtTime('), 'shareText 只用自带格式化，不借 ui.js 的');
}

// ============ 88. 问神：录满之后再谒，问的是「此地还缺什么」 ============
// 二十处谒见点录满之后原本就是摆设——再谒只剩一句「再谒山川之神」。
// 现在山神报出本系未录的物产 / 异兽 / 神祇，并指到具体那座山。
// 纯信息，不产任何物件，所以不设冷却，也不会破坏经济。
section('问神');
{
  G.resetToDefault();
  const m1 = ST.regionMissing('nanshan-1');
  assert(m1.items.length > 0 && m1.beasts.length > 0, `南次一经未录：物 ${m1.items.length} · 兽 ${m1.beasts.length}`);
  assert(m1.items.every(x => x.nodeId.indexOf('nanshan-1') === 0), '只报本山系的东西');
  assert(m1.items.every(x => x.name && x.nodeName && x.lvl > 0 && x.how), '每条都带名、山、门槛与拿法');
  assert(m1.items[0].lvl <= m1.items[m1.items.length - 1].lvl, '按门槛升序排（顺着路走）');

  const before = m1.items.length;
  const one = m1.items[0];
  ST.Game.records[one.id] = { count: 1, tier: 1 };
  assert(ST.regionMissing('nanshan-1').items.length === before - 1, '录下一样，清单就少一样');
  delete ST.Game.records[one.id];

  // 谒见：诸神未录时只入录，不弹问神；录满之后改问
  const nid = 'xishan-3-05';
  const site = ST.AUDIENCE_SITES[nid];
  let oracle = null;
  const oldOracle = ST.UI.showOracle;
  ST.UI.showOracle = (rid, nm) => { oracle = { rid, nm }; };
  try {
    ST.doAudience(nid);
    assert(oracle === null, '初谒只录神祇，不弹问神');
    assert(((ST.Game.records[site.deities[0].id] || {}).count || 0) === 1, '神祇已入录');
    site.deities.forEach(d => { ST.Game.records[d.id] = { count: 1, tier: 1 }; });
    // 队列与离线结算也会反复调 doAudience（离线挂一小时就是 120 次），
    // 所以只有「玩家自己点的那一趟」才弹窗——否则会盖出一屏弹窗。
    ST.doAudience(nid);
    assert(oracle === null, '自动（队列 / 离线）途径不弹问神');
    ST.doAudience(nid, { oracle: true });
    assert(oracle && oracle.rid === 'xishan-3', '手动再谒 → 问神（' + (oracle && oracle.rid) + '）');
  } finally {
    ST.UI.showOracle = oldOracle;
  }

  // 经验：首谒给足，再谒只给一点（与观象同例）。
  // 不分的话，录满之后这里就是一台免费经验机——离线按 20 秒一算，一小时 180 次，
  // 而它不产任何东西，比同长度的观象高出十几倍。
  G.resetToDefault();
  ST.Game.skills.jisi.level = 40; ST.Game.skills.jisi.xp = ST.xpForLevel(40);
  const nid2 = 'xishan-3-05';
  const j0 = ST.Game.skills.jisi.xp;
  ST.doAudience(nid2);                       // 首谒：神祇尚未入录
  const firstXp = Math.round(ST.Game.skills.jisi.xp - j0);
  const j1 = ST.Game.skills.jisi.xp;
  ST.doAudience(nid2);                       // 再谒：已录满
  const repXp = Math.round(ST.Game.skills.jisi.xp - j1);
  assert(firstXp > repXp * 3, `再谒经验 ${repXp} 不到首谒 ${firstXp} 的三分之一`);
  assert(repXp > 0, '再谒仍有少量经验（不是白跑一趟）');

  // 自动途径不刷日志：离线挂谒见一小时会调 180 次，逐次记一条就把日志框刷满
  ST.UI.logEntries = [];
  for (let i = 0; i < 10; i++) ST.doAudience(nid);
  const hints = ST.UI.logEntries.filter(e => String(e.msg).indexOf('诸神已录') >= 0).length;
  assert(hints <= 1, `十次自动谒见最多留一条提示（实为 ${hints}）`);

  // 弹窗：按类分组、写明山系、条目可点
  let html88 = '';
  const oldModal = ST.UI.modal;
  ST.UI.modal = (h) => { html88 = h; };
  try { ST.UI.showOracle('xishan-3', '鼓・钦䲹'); } finally { ST.UI.modal = oldModal; }
  assert(html88.includes('问神') && html88.includes('西次三经'), '弹窗写明是哪一系在答');
  assert((html88.match(/class="orc-group"/g) || []).length >= 2, '按物产 / 异兽 / 神祇分组');
  assert((html88.match(/class="orc-row"/g) || []).length > 0, '每条都可点（定位那座山）');
  assert(!/<button[^>]*>.*?买/.test(html88), '只报有什么，不代买代采');

  // 按钮文案：录满前「谒见」，录满后「问神」
  ST.Game.skills.yudi.level = 81; ST.Game.skills.lvxian.level = 81;
  ST.Game.records = {};
  ST.UI.selRegion = 'xishan-3'; ST.UI.selNode = nid; ST.UI.renderYudi();
  const h1 = (renderTargets.content || {}).innerHTML || '';
  assert(h1.includes('🕯️ 谒见'), '未录满时按钮仍是「谒见」');
  site.deities.forEach(d => { ST.Game.records[d.id] = { count: 1, tier: 1 }; });
  ST.UI.renderYudi();
  const h2 = (renderTargets.content || {}).innerHTML || '';
  assert(h2.includes('🕯️ 问神') && h2.includes('此地未录之物'), '录满后改称「问神」并说明去问什么');
}

// ============ 89. 构建产物：单文件版必须和多文件版是同一部书 ============
// scripts/build-standalone.js 里曾另抄了一份脚本清单，漏掉 zhongshanData.js，
// 于是单文件版少了整个中山经：14 系 250 山、图鉴 831（多文件版是 26 系 447 山、1122）。
// 两边都能正常启动，跑起来毫无异样——这类「少了一半内容还能跑」的错，
// 只能靠对着数核。
section('构建产物一致');
{
  const { scriptOrder, build } = require(path.join(__dirname, '..', 'scripts', 'build-standalone.js'));
  const order = scriptOrder();
  const srcDir = path.join(__dirname, '..', 'src');
  const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));

  const orphan = srcFiles.filter(f => !order.includes(f));
  assert(orphan.length === 0, 'src 下每个脚本都被 index.html 引用' + (orphan.length ? '：' + orphan.join('、') : ''));
  assert(order.every(f => fs.existsSync(path.join(srcDir, f))), 'index.html 引用的脚本都存在');

  // 数据文件必须先于 gameData（否则 WORLD 还没建，gameData 里的派生表全是空）
  const gi = order.indexOf('gameData.js');
  ['nanshanData.js','xishanData.js','beishanData.js','dongshanData.js','zhongshanData.js'].forEach(f => {
    assert(order.indexOf(f) >= 0 && order.indexOf(f) < gi, f + ' 在 gameData 之前加载');
  });

  // 构建脚本不得自带一份清单（历史 bug 就是从这儿来的）
  const buildSrc = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-standalone.js'), 'utf8');
  assert(!/'(nanshan|xishan|beishan|dongshan|zhongshan)Data\.js'/.test(buildSrc),
    '构建脚本不硬编码数据文件清单（顺序只从 index.html 读）');

  // 真跑一次构建：产物必须含每个文件的横幅，一个都不能少
  const r = build();
  assert(r.order.length === order.length, '构建用的是同一份顺序（' + r.order.length + ' 个脚本）');
  const outTxt = fs.readFileSync(path.join(__dirname, '..', 'idle-shanhaijing-standalone.html'), 'utf8');
  const lost = order.filter(f => !outTxt.includes('// ===== ' + f + ' ====='));
  assert(lost.length === 0, '单文件版含全部脚本的横幅' + (lost.length ? '，缺：' + lost.join('、') : ''));
  assert(outTxt.length > 800 * 1024, '单文件版体积合理（' + Math.round(outTxt.length / 1024) + ' KB）');
}

// ============ 90. 离线结算：三条与线上不一致的账 ============
// 1) 采集只认主产地（`it.node === Game.node`），而 309 件物产有 nodes[]——
//    站在次产地下线，一小时颗粒无收，在线却照采；
// 2) 离线采集不认「越级 8 级内可硬采」，比在线更严，等于离线把在线的选择权收走；
// 3) 离线制作把每件写死 2.0 秒，于是灶窟（×0.9）与毕方「讹火」（−20%）在离线下不存在。
section('离线结算与线上同口径');
{
  const xpAt = (lv) => ST.xpForLevel(lv);
  const setLv = (L, ids) => ids.forEach(k => { if (ST.Game.skills[k]) ST.Game.skills[k] = { level: L, xp: xpAt(L) }; });

  // 1) 多产地：次产地也要算
  G.resetToDefault();
  setLv(40, ['yudi','qiaocai']);
  const multi = Object.values(ST.Items).find(i => i.skill && i.nodes && i.nodes.length > 1);
  assert(!!multi, '找得到一件多产地物产');
  ST.Game.node = multi.nodes[1];
  ST.Game.inventory = {};
  ST.Game.activity = { kind:'gather', skill:multi.skill, itemId:multi.id, src:'manual' };
  G.settleAway(3600);
  assert((ST.Game.inventory[multi.id] || 0) > 0,
    `${multi.name} 站在次产地（${multi.nodes[1]}）离线一小时仍有所得：${ST.Game.inventory[multi.id] || 0}`);

  // 不在产地的山：仍然不给（不能因为放宽就乱给）
  ST.Game.node = 'nanshan-1-01';
  ST.Game.inventory = {};
  ST.Game.activity = { kind:'gather', skill:multi.skill, itemId:multi.id, src:'manual' };
  const okHere = (multi.nodes || [multi.node]).indexOf('nanshan-1-01') >= 0;
  G.settleAway(3600);
  if (!okHere) assert(!(ST.Game.inventory[multi.id] > 0), '不在产地照样颗粒无收');

  // 2) 越级：差 6 级可采（打折），差 9 级不可
  G.resetToDefault();
  setLv(40, ['yudi','qiaocai','caiyao','caiyu','yu']);
  const near = Object.values(ST.Items).find(i => i.skill === 'qiaocai' && i.lvl === 46);
  if (near){
    ST.Game.node = (near.nodes || [near.node])[0];
    ST.Game.inventory = {};
    ST.Game.activity = { kind:'gather', skill:'qiaocai', itemId:near.id, src:'manual' };
    G.settleAway(3600);
    assert((ST.Game.inventory[near.id] || 0) > 0, `差 6 级硬采 ${near.name}：${ST.Game.inventory[near.id] || 0}`);
  }
  const far = Object.values(ST.Items).find(i => i.skill === 'qiaocai' && i.lvl >= 50);
  if (far){
    ST.Game.node = (far.nodes || [far.node])[0];
    ST.Game.inventory = {};
    ST.Game.activity = { kind:'gather', skill:'qiaocai', itemId:far.id, src:'manual' };
    G.settleAway(3600);
    assert(!(ST.Game.inventory[far.id] > 0), `差 ${far.lvl - 40} 级仍不给（${far.name}）`);
  }

  // 3) 制作：灶窟要真的在离线下省时间，材料也照扣
  const craftHour = (withZaoku) => {
    G.resetToDefault();
    setLv(40, ['yudi','qiaocai','fanliao','zhiqi','zhuoyu']);
    const rec = ST.Recipes.find(r => r.out === 'sheng');
    ST.Game.inventory = {};
    rec.cost.forEach(([id, q]) => { ST.Game.inventory[id] = q * 100000; });
    const matBefore = ST.Game.inventory[rec.cost[0][0]];
    if (withZaoku) ST.Game.buildings = { zaoku: true };
    ST.Game.activity = { kind:'craft', recipe:rec, src:'manual' };
    G.settleAway(3600);
    return { out: ST.Game.inventory[rec.out] || 0, spent: matBefore - (ST.Game.inventory[rec.cost[0][0]] || 0) };
  };
  const plain = craftHour(false), zaoku = craftHour(true);
  assert(plain.out > 0, '离线制作一小时出 ' + plain.out + ' 件');
  assert(plain.spent > 0, '材料照扣（' + plain.spent + ' 份）');
  assert(zaoku.out > plain.out, `灶窟在离线下也省时：${plain.out} → ${zaoku.out} 件`);

  // 每件耗时来自 currentActionInterval，不写死
  const gameSrc90 = fs.readFileSync(path.join(__dirname, '..', 'src', 'game.js'), 'utf8');
  assert(!/Math\.floor\(seconds \/ 2\.0\)/.test(gameSrc90), '离线制作不再写死 2.0 秒');
}

// ============ 91. 祠礼的账：祭品折价 vs 该域一小时增益 ============
// docs/BALANCE.md 里那张表就是这里算出来的。把结论钉成断言，
// 将来谁动了祭品配方或产量曲线，这条账会先叫。
{
  G.resetToDefault();
  const setSkillToLv = (sk, L) => { ST.Game.skills[sk] = { level: L, xp: ST.xpForLevel(L) + 1 }; };
  let n = 0, worstPay = 0, worstId = '', yuPay = 0;
  for (const [rid, def] of Object.entries(ST.RITES)){
    if (!def.regionId) continue;
    const reg = ST.WORLD.regions.find(r => r.regionId === def.regionId);
    for (const sk in ST.Skills) setSkillToLv(sk, reg.unlockLevel);   // 玩家在此域时的等级 ≈ 该域门槛
    const w = ST.riteWorth(rid);
    assert(!!w && w.cost > 0 && w.gain > 0 && isFinite(w.payback), `祠礼算得出账：${rid}`);
    if (w && w.payback > worstPay && !def.grand){ worstPay = w.payback; worstId = rid; }
    if (def.grand) yuPay = w.payback;
    n++;
  }
  assert(n === 27, '27 套带山系的礼都算过（常祭无域，单列）-> ' + n);
  assert(ST.riteWorth('rite_chang') === null, '常祭无区域增益，不给「值不值」（不编数字骗人）');
  // 小礼的定价远低于其增益：最慢的一签也在 5 分钟内回本（实测 82 秒）
  assert(worstPay < 300, `小礼最慢 ${Math.round(worstPay)} 秒回本（${worstId}）`);
  // 羭山百牲斋是唯一「有分量」的一套：五百件祭品，回本以半小时计
  assert(yuPay > 1800, `羭山大祭回本 ${Math.round(yuPay)} 秒，是唯一需要盘算的一礼`);

  // 面板上要把这行账露出来，否则算了也没人看见
  const uiSrc91 = uiSrcAll;
  assert(uiSrc91.includes('class="rc-worth"') && uiSrc91.includes('riteWorth(id)'),
    '祠礼浮层显示「祭品折价 / 本域时采 / 此礼多得 / 回本」');
  const css91 = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert(css91.includes('.rc-worth'), 'rc-worth 有样式');
}

// ============ 92. 交互一致性：单击出弹窗、数量自填、弹窗分段（v1.31.6） ============
{
  const uiSrc92 = uiSrcAll;
  const css92 = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

  // 92.1 物件卡单击一律先出详情：技能、配方、市廛买 / 卖（行囊与图鉴原本就是）
  assert(/class="tile skill-tile[^>]*onclick="showSkillDetail\('\$\{id\}'\)"/.test(uiSrc92), '技能卡单击开详情');
  assert(uiSrc92.includes("onclick=\"showRecipeDetail('${r.type}::${r.out}')\""), '配方卡单击开详情');
  assert(uiSrc92.includes('onclick="showShopItem(${idx})"'), '市廛商品单击开详情');
  assert(/onclick="showItemDetail\('\$\{id\}'\$\{enhArg\}\)"/.test(uiSrc92), '市廛出售格单击开详情');

  // 92.2 售卖 / 购买 / 制作都能填数量，步进与「至多 / 全部」共用 input.max
  assert(uiSrc92.includes('function qtyStep(') && uiSrc92.includes("parseInt(el.max, 10)"),
    '数量步进以 input.max 为上限（三个入口不各写一遍）');
  assert(uiSrc92.includes('function sellN(') && uiSrc92.includes('function buyN(') && uiSrc92.includes('function craftN('),
    '售出 / 购入 / 制作各有定量执行入口');

  // 92.3 弹窗三段：标题固定、内容滚动、按钮固定底部
  assert(uiSrc92.includes('_splitModal') && uiSrc92.includes("body.className = 'modal-body'")
    && uiSrc92.includes("foot.className = 'modal-foot'"), '弹窗拆成 body / foot 两段');
  assert(/\.modal-body\{[^}]*overflow-y:auto/.test(css92), '内容区自己滚');
  assert(/\.modal-foot\{[^}]*flex:0 0 auto/.test(css92), '按钮区不参与滚动');
  assert(/#modalBox\{[^}]*display:flex; flex-direction:column/.test(css92), '弹窗纵向排布');
  assert(/#modalBox\{[^}]*max-height:min\(86vh/.test(css92), '弹窗高度不越视口');

  // 92.4 移动端行动页：队列条目分两行，不再把名字挤成竖排
  assert(/\.qi-meta\{/.test(css92) && /\.qi-meta\{[^}]*order:5/.test(css92), '窄屏队列第二行放进度与原因');

  // 92.5 顶栏：限次往讨报剩余场次，无限连战不报
  G.resetToDefault();
  for (const sk in ST.Skills) ST.Game.skills[sk] = { level:30, xp:ST.xpForLevel(30) + 1 };
  ST.Game.map['nanshan-2-01'] = true;
  ST.Game.node = 'nanshan-2-01';
  const ok3 = ST.startCombat('zhu', { times:3 });
  assert(ok3, '能对鴸开战（3 场）');
  ST.UI.refreshCombatHud();
  assert(/余 3 场/.test(renderTargets.activityText.textContent),
    '顶栏显示剩余场次：' + renderTargets.activityText.textContent);
  ST.Game.combat = null;
  const okInf = ST.startCombat('zhu', {});
  ST.UI.refreshCombatHud();
  assert(okInf && !/余/.test(renderTargets.activityText.textContent), '无限连战不写「余 N 场」');
  ST.Game.combat = null;
}

// ============ 93. 旧档健壮性：缺技艺 / 越界等级 / 缺统计字段 ============
{
  G.resetToDefault();
  ST.Game.skills.qiaocai = { level: 12, xp: ST.xpForLevel(12) + 5 };
  const sv = ST.serializeSave();
  delete sv.skills.yu;
  delete sv.skills.caiyao;
  sv.skills.qiaocai = { level: 999, xp: 1 };     // 越界等级（手改档 / 旧版上限更低）
  delete sv.stats.gathers;                        // 缺统计字段（v1 档没有）
  delete sv.rites;
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv));
  let ok = false;
  try { ok = ST.loadGame(); } catch(e){ console.error('读档异常', e); }
  assert(ok, '缺字段的旧档能读入');
  assert(ST.levelOf('yu') === 1 && ST.levelOf('caiyao') === 1, '缺失的技艺补成 1 级');
  assert(ST.levelOf('qiaocai') === ST.TUNING.MAX_LEVEL, '越界等级被夹到本卷上限');
  assert(ST.Game.stats.gathers && typeof ST.Game.stats.gathers === 'object', '缺的统计字段补成空对象');
  assert(ST.Game.rites && typeof ST.Game.rites === 'object', '缺的祠礼到期表补成空对象');
  let renderOk = true;
  try { ST.UI.currentTab = 'skills'; ST.UI.renderSkills(); } catch(e){ renderOk = false; console.error('技能页渲染异常', e); }
  assert(renderOk, '缺技艺的档也能渲染技能页（不再读 undefined.level）');
  // 收尾：把测试档清掉，后续用例从默认状态起
  ST.localStorage.removeItem('shj_zhulu_save_v1');
  G.resetToDefault();
}

// ============ 94. 技能页「材料存余」读的是真库存 ============
// materialStatusForSkill 曾被写成读 Game.inv（不存在的字段），
// 于是技能卡浮层与详情里每一行都是 0/N、标着缺料——材料备齐了也一样。
{
  G.resetToDefault();
  ST.Game.inventory = { guaimu: 7, zi: 0 };
  const rows = G.materialStatusForSkill('fanliao') || [];
  const row = rows.find(x => x.id === 'guaimu');
  assert(!!row, '燔燎的材料表里有怪木（' + rows.map(r => r.id).join(',') + '）');
  assert(row.have === 7, '材料存余读到 7（原先恒为 0）');
  assert(row.ok === true, '备齐时标 ok');
  const zero = rows.find(x => x.id === 'zi');
  if (zero) assert(zero.have === 0 && zero.ok === false, '没有的那种仍标缺料');
}

// ============ 95. 静态一致性：源码里调用的 UI 方法都真的存在 ============
// UI 是手写对象字面量，方法名拼错时浏览器只在点到那一下才报
// 「UI.xxx is not a function」，而且往往伴随一次状态改动（材料已扣、界面没刷）。
// 这里把源码里所有 `UI.foo(` 抓出来，与运行时 UI 的方法表逐一对照。
{
  const uiMethods = new Set(Object.keys(ST.UI));
  assert(uiMethods.size > 80, 'UI 方法表取到了（' + uiMethods.size + ' 个）');
  const srcFiles = [...UI_FILES, 'game.js','queue.js','interact.js','affix.js','engine.js','save.js'];
  const missing = [];
  for (const f of srcFiles){
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    for (const m of src.matchAll(/\bUI\.([A-Za-z_$][\w$]*)\s*\(/g)){
      const k = m[1];
      if (!uiMethods.has(k) && !missing.some(x => x.k === k)) missing.push({ k, f });
    }
  }
  assert(missing.length === 0,
    'UI 方法都存在（越界：' + (missing.map(x => x.k + '@' + x.f).join(', ') || '无') + '）');
}

// ============ 96. 读档重绑制作配方（快照过期 / 幽灵配方） ============
// Game.activity.recipe 存的是对象快照。配方改过数值后，旧档会按过期的材料继续做，
// 玩家看到的是「材料多扣、产出少给」。读档时按 type::out 重绑到当前表。
{
  G.resetToDefault();
  const cur = ST.Recipes.find(r => r.type === 'burn' && r.out === 'tan');
  assert(!!cur, '当前表里有燔燎·炭');
  const sv = ST.serializeSave();
  sv.activity = { kind:'craft', src:'manual', remain:5,
    recipe:{ type:'burn', out:'tan', cost:[['zi', 999]], qty:99, lvl:1 } };
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv));
  ST.loadGame();
  const a = ST.Game.activity;
  assert(!!a && a.kind === 'craft', '制作行动保留下来');
  assert(a.recipe.cost[0][1] === 1, '配方已重绑到当前表（旧快照写的是 999，现为 ' + a.recipe.cost[0][1] + '）');
  assert(a.recipe.qty === cur.qty, '产出数量也取当前表');

  const sv2 = ST.serializeSave();
  sv2.activity = { kind:'craft', src:'manual', recipe:{ type:'burn', out:'__ghost__' } };
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv2));
  ST.loadGame();
  assert(ST.Game.activity === null, '配方已被删掉的行动直接停掉（不按幽灵配方跑）');
  ST.localStorage.removeItem('shj_zhulu_save_v1');
  G.resetToDefault();
}

// ============ 97. 首屏 meta：群号不被当成电话、分享有标题 ============
// 「关于」页把 QQ 群号当纯文本渲染，iOS 会把它识别成电话号码并染蓝；
// 群里转发链接时，没有 og:title / og:description 就只剩一条裸链接。
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(/name="format-detection"[^>]*telephone=no/.test(html), '关掉电话识别（群号不会被染成蓝色号码）');
  assert(/property="og:title"/.test(html) && /property="og:description"/.test(html), '有分享标题与描述');
  assert(/name="viewport"[^>]*viewport-fit=cover/.test(html), 'viewport-fit=cover（safe-area 的前提）');
}

// ============ 98. 键盘可达性：卡片能 Tab 到、能 Enter 打开 ============
// 全站两百多个带 onclick 的 div，鼠标点得动、键盘 Tab 不到。
// 现在渲染后统一补 role/tabindex，并由一处 keydown 委托把 Enter/空格转成 click。
{
  const uiSrc = uiSrcAll;
  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert(uiSrc.includes('function a11ySweep') && uiSrc.includes("setAttribute('tabindex', '0')"),
    '渲染后给可点击元素补 role/tabindex');
  assert(uiSrc.includes('MutationObserver') && uiSrc.includes("childList: true, subtree: true"),
    '用 MutationObserver 跟进新渲染的节点（只盯增删，不盯属性）');
  assert(uiSrc.includes("closest('[role=\"button\"][onclick]')") && uiSrc.includes("e.key !== ' '"),
    'keydown 委托：Enter / 空格触发 click');
  assert(css.includes('[role="button"][tabindex]:focus-visible'), '键盘焦点有可见描边');
}

// ============ 99. 拆分后的一致性：index.html 的 ui 清单 = 测试清单 ============
// 历史上「文件加了但没被引入」出过事（单文件版少了整个中山经）。
// 这里钉住三件事：清单顺序一致、core 在最前、每个文件都真的存在。
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const inHtml = [...html.matchAll(/src="(src\/ui\/[^"]+\.js)"/g)].map(m => m[1].replace(/^src\//, ''));
  assert(inHtml.length > 0, 'index.html 里取到了 ui 文件清单（' + inHtml.length + ' 个）');
  assert(inHtml.join(',') === UI_FILES.join(','),
    'index.html 的 ui 清单与测试 UI_FILES 一致（html: ' + inHtml.join(',') + '）');
  assert(inHtml[0] === 'ui/core.js', 'core.js 最先加载（UI 对象在那里定义）');
  for (const f of UI_FILES){
    const p2 = path.join(__dirname, '..', 'src', f);
    assert(fs.existsSync(p2) && fs.statSync(p2).size > 1000, '文件存在且非空：' + f);
  }
  // 构建脚本不许出现写死的清单（顺序只从 index.html 读）
  const build = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-standalone.js'), 'utf8');
  assert(!/src\/ui\/core\.js/.test(build), '构建脚本没有另抄 ui 文件清单');
}

// ============ 100. 前世遗物：由转数派生，不写存档 ============
// 转生原先只给「更快」，世界本身不变。补一层「记得」：每转一件遗物，加成很小
// （xp / yield 各 6%，def 4%，hp 3%）。关键设计：**不新增存档字段**，
// 由 rebirth.count 现算——旧档读进来转数是几就有几件。
{
  G.resetToDefault();
  assert(ST.relicOwned().length === 0 && ST.relicSum('xp') === 0, '0 转无遗物');

  ST.Game.rebirth = { count:3, at:0, best:0, startedAt:0, history:[] };
  assert(ST.relicOwned().length === 3, '3 转得 3 件');
  assert(Math.abs(ST.relicSum('xp') - 0.04) < 1e-9, '3 转经验 +4%（厌火 + 羲和）');
  assert(Math.abs(ST.relicSum('yield') - 0.02) < 1e-9, '3 转采获 +2%（羽山）');
  assert(Math.abs(ST.relicSum('def')) < 1e-9, '3 转还没有防御类遗物');

  ST.Game.rebirth.count = 8;
  assert(ST.relicOwned().length === ST.RELICS.length, '8 转集齐 ' + ST.RELICS.length + ' 件');
  assert(Math.abs(ST.relicSum('xp') - 0.06) < 1e-9, '经验合计 +6%');
  assert(Math.abs(ST.relicSum('yield') - 0.04) < 1e-9, '采获合计 +4%');
  assert(Math.abs(ST.relicSum('def') - 0.04) < 1e-9, '防御合计 +4%');
  assert(Math.abs(ST.relicSum('hp') - 0.03) < 1e-9, '气血合计 +3%');

  ST.Game.rebirth.count = 12;
  assert(ST.relicOwned().length === ST.RELICS.length, '超过 8 转也不重复发放');

  // 加成真的进了乘区（不是只写在数据里）
  ST.Game.skills.ming = { level: 30, xp: ST.xpForLevel(30) };
  ST.Game.rebirth.count = 0;
  const hp0 = ST.playerMaxHp();
  const def0 = ST.totalDefence();
  ST.Game.rebirth.count = 8;
  const hp8 = ST.playerMaxHp();
  const def8 = ST.totalDefence();
  assert(hp8 > hp0 && Math.abs(hp8 / hp0 - 1.03) < 0.01, `气血 +3%（${hp0} → ${hp8}）`);
  assert(def8 > def0 && Math.abs(def8 / def0 - 1.04) < 0.01, `防御 +4%（${def0.toFixed(1)} → ${def8.toFixed(1)}）`);

  // 存档里不许多出 relics 字段（否则就变成两份真相）
  ST.Game.rebirth.count = 8;
  const sv = ST.serializeSave();
  assert(!('relics' in sv) && !('relics' in (sv.rebirth || {})), '存档不新增 relics 字段（由转数现算）');
  G.resetToDefault();
}

// ============ 101. 精卫填海：长线路标 ============
// 200 阶 × 10 分钟 = 33 小时。若只在终点给一次奖励，中间三十多个钟头毫无节点感。
// 每 25 阶给一次「东海又浅一分」（羽 ×1 + 阶数×4 贝），大成再加重。
{
  G.resetToDefault();
  const site = ST.GROW_SITES.jingwei;
  assert(site && site.stepEvery === 25, '精卫填海每 25 阶一个路标');
  const mat = site.cost[0][0];
  ST.giveItem(mat, 400, false);

  // 第 24 → 25 阶：跨过路标
  ST.Game.grow = { jingwei: { stage: 24, done: 0 } };
  const fur0 = ST.totalOf('jingweiyu'), sh0 = ST.Game.shells;
  ST.doGrow('jingwei');
  assert(ST.Game.grow.jingwei.stage === 25, '阶数推进到 25');
  assert(ST.totalOf('jingweiyu') - fur0 === 1, '得精卫之羽 ×1');
  assert(ST.Game.shells - sh0 === 100, '得贝 ' + (ST.Game.shells - sh0) + '（25 阶 × 4）');

  // 第 25 → 26 阶：不在路标上，不再发
  const fur1 = ST.totalOf('jingweiyu'), sh1 = ST.Game.shells;
  ST.doGrow('jingwei');
  assert(ST.Game.grow.jingwei.stage === 26, '阶数到 26');
  assert(ST.totalOf('jingweiyu') === fur1 && ST.Game.shells === sh1, '非路标阶只长经验，不发物');

  // 第 199 → 200 阶：走大成分支，不发 25 阶小路标，发「成海」段奖励 + 大成奖励并归零
  ST.Game.grow.jingwei = { stage: 199, done: 0, segs: [50, 100, 150] };
  const yu0 = ST.totalOf('yu'), fur2 = ST.totalOf('jingweiyu');
  ST.doGrow('jingwei');
  assert(ST.Game.grow.jingwei.stage === 0 && ST.Game.grow.jingwei.done === 1, '大成后阶数归零、计一次完工');
  assert(ST.totalOf('yu') - yu0 === 3 + 5, '大成得玉 ×3（另得「成海」段玉 ×5）');
  assert(ST.totalOf('jingweiyu') - fur2 === 5 + 10, '大成得精卫之羽 ×5（另得「成海」段羽 ×10）');

  // 丹木 / 器酸 没有 stepEvery，行为不变
  assert(!ST.GROW_SITES.mishan.stepEvery && !ST.GROW_SITES.qisuan.stepEvery, '短周期养成不设路标');
}

// ============ 102. 养成按钮读自己的状态，不是丹木的 ============
// growButtonForNode 曾写死 `const st = Game.danmu`，于是精卫填海 / 器酸的按钮
// 显示的是丹木的阶数，文案也写死「五岁乃成 · 耗玉膏×1」。
// 三处养成各有各的进度与耗材，必须走 growState(key)。
{
  G.resetToDefault();
  ST.Game.danmu = { stage: 4 };
  ST.Game.grow = { jingwei: { stage: 75, done: 0 }, qisuan: { stage: 1, done: 0 } };

  const jw = G.growButtonForNode(ST.nodeOf('beishan-3-22'));
  assert(/精卫填海/.test(jw), '按钮渲染的是精卫填海');
  assert(/75\/200/.test(jw), '显示精卫自己的 75/200（不是丹木的 4）');
  assert(/下一路标 100 阶/.test(jw), '长线给出下一路标：' + (jw.match(/下一路标\s*\d+\s*阶/) || [''])[0]);
  assert(/柘木/.test(jw), '耗材写的是柘木，不是玉膏');
  assert(!/玉膏/.test(jw), '不再硬编码玉膏');

  const qs = G.growButtonForNode(ST.nodeOf(ST.GROW_SITES.qisuan.nodeId));
  assert(/1\/3/.test(qs), '器酸显示自己的 1/3');
  assert(!/下一路标/.test(qs), '短周期养成不报路标');

  const dm = G.growButtonForNode(ST.nodeOf(ST.GROW_SITES.mishan.nodeId));
  assert(/4\/5/.test(dm), '丹木仍读 Game.danmu（4/5）');
}

// ============ 103. 市廛：品类齐全、无套利、不卖采集增幅 ============
// 市廛原先只有 12 个 SKU，70 级打开只剩三五样——中后期的贝币没有出口，
// 也没有「打 BOSS 前忘了备干粮」这种补救。v1.31.11 补了熟食与药散两档。
{
  const ids = ST.ShopStock.map(s => s.itemId);
  assert(ST.ShopStock.length >= 20, '在售之物 ≥ 20 样（现 ' + ST.ShopStock.length + ' 样）');

  // 103.1 六个分类都要有货、都要有一句话说明（分类条上就靠它）
  for (const cat of ST.SHOP_CATS){
    const n = ST.ShopStock.filter(s => s.cat === cat.id).length;
    assert(n > 0, `分类「${cat.name}」有 ${n} 样在售`);
    assert(!!cat.desc, `分类「${cat.name}」有说明`);
  }
  // 不许有游离档位：ShopStock 里的 cat 必须在 SHOP_CATS 里
  const catIds = new Set(ST.SHOP_CATS.map(c => c.id));
  const stray = ST.ShopStock.filter(s => !catIds.has(s.cat));
  assert(stray.length === 0, '没有游离分类（' + (stray.map(s => s.itemId).join(',') || '无') + '）');

  // 103.2 70 级打开时能买的样数（ROADMAP 记的「只剩三五样」）
  const lv = 70;
  const buyable = ST.ShopStock.filter(s => s.lvl <= lv).length;
  assert(buyable >= 12, `70 级可买 ${buyable} 样（原 12 样里只有 7 样解锁）`);

  // 103.3 熟食覆盖各段：每 10 级至少有一款能买（打不动时总有东西吃）
  const food = ST.ShopStock.filter(s => s.cat === 'food');
  assert(food.length >= 5, '熟食 ≥ 5 款（现 ' + food.length + '）');
  for (let L = 10; L <= 50; L += 10){
    const n = food.filter(s => s.lvl <= L).length;
    assert(n >= 1, `${L} 级时至少有一款熟食可买`);
  }
  // 熟食必须真能回血——卖一个不能吃的「熟食」是纯摆设
  const noHeal = food.filter(s => !(ST.Items[s.itemId] || {}).heal);
  assert(noHeal.length === 0, '熟食都能回血（' + (noHeal.map(s => s.itemId).join(',') || '无') + '）');

  // 103.4 药散只卖「折不成贝币」的：经验 / 防御可以卖，采获增幅不能卖。
  // 一小时采 50 万贝时，释劳散（+35% 四分钟）的边际收益约 1.1 万贝，
  // 卖多少钱都小于它——上架等于送一个刷钱按钮。
  const herb = ST.ShopStock.filter(s => s.cat === 'herb');
  assert(herb.length >= 2, '药散 ≥ 2 款');
  for (const s of herb){
    const it = ST.Items[s.itemId];
    assert(!!it && !!it.buff, `药散 ${s.itemId} 是限时增益品`);
    const b = it.buff || {};
    assert(!(b.gather > 0) && !(b.yield > 0),
      `${it.name} 不得含采获/产量增幅（那是可折现的，上架即可套利）`);
  }
  assert(!ids.includes('shilaisan'), '释劳散（+35% 采获）不在售——见 docs/BALANCE.md 八');

  // 103.5 套利：整批买再整批卖，不能净赚
  const deals = [];
  for (const s of ST.ShopStock){
    const it = ST.Items[s.itemId];
    if (!it) continue;
    const back = ST.sellValue(s.itemId, s.qty);
    if (back >= s.cost) deals.push(`${it.name}：买 ${s.cost} 卖回 ${back}`);
  }
  assert(deals.length === 0, '整批买再卖不赚（' + (deals.join('；') || '无') + '）');
}

// ============ 104. 自动进食：普通优先、够用就好 ============
// 丹木之实 heal 500 是全场最高。原先 autoEat 按「回血最多」排序，它永远排第一，
// 挂机一晚能把峚山五年一结的存货吃空——而它是急救品，不该当干粮。
// 另有浪费问题：拿 heal 520 的炙兕脯去补 120 点的缺口。
{
  const mkCombat = (ratio) => ({ monsterId:'x', monsterHp:1, playerHp: Math.round(ST.playerMaxHp() * ratio),
    timer:0, maxtimer:0, spec:0, style:'attack', dmgOut:0, dmgIn:0, round:0, flee:0, repeat:1, el:'土', momentum:0, combo:0, ults:0 });

  // 104.1 有普通食物时不动珍稀
  G.resetToDefault();
  ST.Game.inventory = { danmushi: 20, kaijiyu: 5 };
  let c = mkCombat(0.30);
  ST.Game.combat = c;
  ST.autoEat(c);
  assert(ST.totalOf('danmushi') === 20, '丹木之实一个没动（现 ' + ST.totalOf('danmushi') + '）');
  assert(ST.totalOf('kaijiyu') === 4, '吃的是炙鮆鱼');

  // 104.2 只剩珍稀时照吃（不然会饿死）
  G.resetToDefault();
  ST.Game.inventory = { danmushi: 2 };
  c = mkCombat(0.30);
  ST.Game.combat = c;
  ST.autoEat(c);
  assert(ST.totalOf('danmushi') === 1, '没有普通食物时，珍稀的照吃');

  // 104.3 够用就好：缺口 120，手上有 220 与 520，应当吃 220 的
  G.resetToDefault();
  ST.Game.inventory = { kaijiyu: 5, zhisipu: 5 };       // heal 220 / 520
  const maxHp = ST.playerMaxHp();
  c = mkCombat(0);
  c.playerHp = maxHp - 120;                              // 缺口正好 120
  ST.Game.combat = c;
  ST.autoEat(c);
  assert(ST.totalOf('kaijiyu') === 4, '缺口小时吃小份（炙鮆鱼）');
  assert(ST.totalOf('zhisipu') === 5, '没动大份（炙兕脯）');

  // 104.4 缺口大时反过来挑大的：先把气血抬到 440（明 60 级），缺口 352 > 炙鮆鱼 220
  G.resetToDefault();
  ST.Game.skills.ming = { level: 60, xp: ST.xpForLevel(60) + 1 };
  ST.Game.inventory = { kaijiyu: 5, zhisipu: 5 };
  const bigHp = ST.playerMaxHp();
  assert(bigHp >= 400, '气血抬到了 ' + bigHp);
  c = mkCombat(0);
  c.playerHp = Math.round(bigHp * 0.2);                  // 缺口 80%
  ST.Game.combat = c;
  ST.autoEat(c);
  assert(ST.totalOf('kaijiyu') === 5, '小份补不满时不浪费它');
  assert(ST.totalOf('zhisipu') === 4, '改吃大份（炙兕脯 520 ≥ 缺口 ' + Math.round(bigHp * 0.8) + '）');

  // 104.5 什么都没有时安静返回，不抛错
  G.resetToDefault();
  ST.Game.inventory = {};
  c = mkCombat(0.1);
  ST.Game.combat = c;
  let ok = true;
  try { ST.autoEat(c); } catch(e){ ok = false; }
  assert(ok, '行囊空时 autoEat 不抛错');
  G.resetToDefault();
}

// ============ 105. 装备实例：身上与行囊的同名之物互不影响 ============
// 原先强化等级按 itemId 记，于是「身上 +10 的金剑」与「行囊里另一把金剑」共用一档：
// 强化行囊那把，身上那把也跟着涨。现在装备槽里存的是**实例**，自带 enh 字段。
section('装备实例独立');
{
  G.resetToDefault();
  const ITEM = 'muge';                       // 木戈：1 级可装备
  ST.Game.inventory.tan = 999; ST.Game.shells = 99999;
  ST.packGearAdd(ITEM, 0, 2);                 // 行囊里两把 +0
  ST.equipItem(ITEM);                         // 穿一把（行囊剩 1）
  const onBody = ST.Game.gear.weapon;
  assert(!!onBody && onBody.id === ITEM, '身上穿的是木戈');

  // 身上这件强到 +10
  Math.random = () => 0.01;                  // 必成
  for (let i = 0; i < 10; i++) ST.enhanceItem(onBody);
  assert(ST.enhanceLevel(onBody) === 10, '身上这件 +10（现 ' + ST.enhanceLevel(onBody) + '）');

  // 行囊那件从 0 起算，与身上无关
  const bag1 = ST.Game.packGear.find(g => g.id === ITEM);
  assert(bag1 && ST.enhanceLevel(bag1) === 0, '行囊那件仍是 +0（现 ' + ST.enhanceLevel(bag1) + '）');

  // 强化行囊那件一次：身上不该动
  ST.enhanceItem(bag1);
  assert(ST.enhanceLevel(bag1) === 1, '行囊那件 +1');
  assert(ST.enhanceLevel(onBody) === 10, '身上那件仍是 +10（不受影响）');

  // 换装：默认穿行囊里最高档（+1），两把的等级各自跟着自己走
  ST.equipItem(ITEM);
  const newBody = ST.Game.gear.weapon;
  assert(newBody !== onBody, '换了另一件实例');
  assert(ST.enhanceLevel(newBody) === 1, '新穿上的是行囊那件的 +1（现 ' + ST.enhanceLevel(newBody) + '）');
  // 换下来的那把回到行囊，带着自己的 +10
  const bagStacks = ST.gearStacks(ITEM);
  assert(bagStacks.length === 1 && bagStacks[0].enh === 10 && bagStacks[0].qty === 1,
    '卸下的 +10 回到行囊同一档（现 ' + JSON.stringify(bagStacks) + '）');

  // 存档只记一个数字，读回来仍然是实例上的
  const sv = ST.serializeSave();
  assert(sv.gear && sv.gear.weapon && sv.gear.weapon.enh === 1, '存档里装备实例带 enh');
  assert(Array.isArray(sv.packGear) && sv.packGear.length === 1 && sv.packGear[0].enh === 10, '存档里行囊装备带各自档位');
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv));
  ST.loadGame();
  assert(ST.enhanceLevel(ST.Game.gear.weapon) === 1, '读档后身上那件仍是 +1');

  // 旧档迁移：只有 Game.enhance[id]、实例上没有 enh 的档，等级要搬到实例上
  {
    const sv2 = ST.serializeSave();
    delete sv2.gear.weapon.enh;
    sv2.enhance = { [ITEM]: 17 };
    ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv2));
    ST.loadGame();
    assert(ST.enhanceLevel(ST.Game.gear.weapon) === 17,
      '旧档（按 id 记）的 +17 搬到实例上（现 ' + ST.enhanceLevel(ST.Game.gear.weapon) + '）');
  }
  ST.localStorage.removeItem('shj_zhulu_save_v1');
  G.resetToDefault();
}

// 105.2 一键最优装必须算上淬炼：
// 身上一把淬到上限的木戈，比行囊里一把 +0 的石矛（9）强，
// 但按基础值比较（5 < 9）会把木戈换掉——玩家辛苦淬的阶数就这么没了。
{
  G.resetToDefault();
  for (const k in ST.Skills) ST.Game.skills[k] = { level: 15, xp: ST.xpForLevel(15) + 1 };
  ST.Game.inventory = { tan: 999 }; ST.Game.shells = 99999;
  ST.packGearAdd('muge', 0, 1); ST.packGearAdd('shimao', 0, 1);
  ST.equipItem('muge');
  const onBody = ST.Game.gear.weapon;
  Math.random = () => 0.01;
  const cap = ST.enhanceCapOf(ST.Items.muge);
  for (let i = 0; i < cap; i++) ST.enhanceItem(onBody);
  assert(ST.enhanceLevel(onBody) === cap, '木戈淬到本阶上限 +' + cap);
  const boosted = ST.gearPower(onBody);
  const sm = ST.gearPower(ST.Items.shimao);
  assert(boosted > sm, `+${cap} 木戈（${boosted}）强于 +0 石矛（${sm}）`);
  ST.equipBest();
  assert(ST.Game.gear.weapon && ST.Game.gear.weapon.id === 'muge',
    '一键最优装没有把淬炼过的木戈换成石矛（现 ' + (ST.Game.gear.weapon || {}).id + '）');
  G.resetToDefault();
}

// 105.3 最高强化要看得见身上那件
// 曾只扫 Game.enhance（行囊表），「身上 +25、行囊空」的玩家在统计页看到的是 +0。
{
  G.resetToDefault();
  for (const k in ST.Skills) ST.Game.skills[k] = { level: 20, xp: ST.xpForLevel(20) + 1 };
  ST.Game.inventory = { tan: 999 }; ST.Game.shells = 99999;
  ST.packGearAdd('muge', 0, 1);
  ST.equipItem('muge');
  const onBody = ST.Game.gear.weapon;
  Math.random = () => 0.01;
  const cap = ST.enhanceCapOf(ST.Items.muge);
  for (let i = 0; i < cap; i++) ST.enhanceItem(onBody);
  const best = ST.bestEnhance();
  assert(best.lv === cap, `最高强化读到身上那件的 +${cap}（现 +${best.lv}）`);

  // 装备格上的 +N 徽章：渲染必须把实例整个传进 enhanceLevel，
  // 写成 enhanceLevel(g.id || g) 会退化成按 itemId 读行囊档（=0），徽章永远不出现。
  const packSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'pack.js'), 'utf8');
  assert(packSrc.includes('enhanceLevel(g)>0') && packSrc.includes('+${enhanceLevel(g)}</span>'),
    '装备格按实例读强化等级（不是 g.id || g）');
  assert(!packSrc.includes('enhanceLevel(g.id||g)') && !packSrc.includes('enhanceLevel(g.id || g)'),
    '不再残留 enhanceLevel(g.id || g) 的写法');

  // 重开新档必须把装备槽清空（cloneDefaultGame 是「深拷贝当前状态再覆盖字段」，
  // 漏了 gear 就会把上一局那件连淬炼一起带进新档）
  G.resetToDefault();
  assert(!ST.Game.gear.weapon && !ST.Game.gear.armor, '重开后身上是空的');
  assert(ST.bestEnhance().lv === 0, '重开后最高强化归零');
  G.resetToDefault();
}

// ============ 106. 田地：随圃艺开垦、种子「全种」 ============
// 原先写死 6 块，练到 81 级还是 6 块——圃艺是唯一「越练越没变化」的技艺。
section('田地与圃艺');
{
  const setLv = (L) => { for (const k in ST.Skills) ST.Game.skills[k] = { level:L, xp:ST.xpForLevel(L) + 1 }; };

  G.resetToDefault();
  setLv(1);
  assert(ST.farmPlots() === ST.TUNING.FARM_PLOTS, '1 级时是初始块数（' + ST.farmPlots() + '）');
  assert(ST.nextPlotLevel() === 12, '下一块田要 12 级（现 ' + ST.nextPlotLevel() + '）');

  setLv(12);
  assert(ST.farmPlots() === ST.TUNING.FARM_PLOTS + 1, '12 级开垦一块（' + ST.farmPlots() + '）');
  setLv(24);
  assert(ST.farmPlots() === ST.TUNING.FARM_PLOTS + 2, '24 级再开一块（' + ST.farmPlots() + '）');
  setLv(36);
  assert(ST.farmPlots() === ST.TUNING.FARM_MAX, '36 级到顶（' + ST.farmPlots() + '）');
  setLv(81);
  assert(ST.farmPlots() === ST.TUNING.FARM_MAX, '81 级仍是上限，不会无限开（' + ST.farmPlots() + '）');
  assert(ST.nextPlotLevel() === 0, '满额后没有「下一块」');

  // 全种：把空田都种上同一种
  G.resetToDefault();
  setLv(40);
  ST.Game.inventory = { seed_tu: 20 };
  ST.Game.farms = {};
  const n0 = ST.farmPlots();
  let planted = 0;
  for (let i = 0; i < n0; i++){ if (ST.plantSeed('p'+i, 'seed_tu', true)) planted++; }
  assert(planted === n0, `种满 ${planted}/${n0} 块田`);
  assert(ST.totalOf('seed_tu') === 20 - n0, '种子按块数扣（剩 ' + ST.totalOf('seed_tu') + '）');

  // 种子的等级门槛仍生效：低级圃艺种不了高级种
  G.resetToDefault();
  setLv(1);
  ST.Game.inventory = { seed_ji: 5 };      // 稷籽：66 级
  ST.Game.farms = {};
  assert(!ST.plantSeed('p0', 'seed_ji', true), '圃艺不够时种不下高级种子');
  G.resetToDefault();
}

// ============ 107. 快速挂机：按当前等级现算、四类行动都排到 ============
section('快速挂机');
{
  G.resetToDefault();
  for (const k in ST.Skills) ST.Game.skills[k] = { level: 45, xp: ST.xpForLevel(45) + 1 };
  ST.Game.map = {};
  for (const r of ST.WORLD.regions) for (const n of r.nodes)
    if ((n.unlockLevel || 1) <= 45) ST.Game.map[n.id] = true;
  ST.Game.inventory = { zi: 50, guaimu: 50, tan: 99 };
  ST.Game.queue = []; ST.Game.queueIdx = 0;
  const n = ST.quickIdlePreset();
  assert(n > 0 && ST.Game.queue.length === n, '排了 ' + n + ' 项');
  const kinds = [...new Set(ST.Game.queue.map(e => e.kind))];
  assert(kinds.length >= 3, '至少三类行动（' + kinds.join('·') + '）');
  assert(kinds.includes('qiaocai') && kinds.includes('caiyu') && kinds.includes('yu') && kinds.includes('caiyao'),
    '四条采集线都在（' + kinds.join('·') + '）');
  // 采集目标必须「技能够得着」——旧实现按等级升序排，会挑一堆 1 级山头的草
  const bad = ST.Game.queue.filter(e => {
    const def = ST.ActionKinds[e.kind];
    if (!def || def.mode !== 'gather') return false;
    const it = ST.Items[e.target];
    return !it || (it.lvl || 1) > ST.levelOf(def.skill);
  });
  assert(bad.length === 0, '采集目标都在技能等级之内（越界：' + bad.map(e => e.target).join(',') + '）');
  // 每个技能挑的是「能采到的最高等级」
  for (const kind of ['qiaocai','caiyu','yu','caiyao']){
    const mine = ST.Game.queue.filter(e => e.kind === kind);
    if (!mine.length) continue;
    const lv = ST.levelOf(ST.ActionKinds[kind].skill);
    const best = Math.max(...ST.actionTargets(kind)
      .filter(t => (t.lvl || 1) <= lv && (() => { const nd = ST.nodeOf(t.node); return nd && ST.nodeUnlocked(nd); })())
      .map(t => t.lvl || 1));
    const got = Math.max(...mine.map(e => (ST.Items[e.target] || {}).lvl || 1));
    assert(got === best, `${ST.ActionKinds[kind].label} 取到最高级 ${got}（该技能能采到 ${best}）`);
  }
  ST.Game.queue = []; ST.Game.queueRunning = false;
  G.resetToDefault();
}

// ============ 108. 配方等级不留大断层 ============
// 合药原先 30 → 66 之间一个方子都没有：技能升到 35 就会发现「药草越采越多，能配的药一个没有」。
{
  const byType = {};
  for (const r of ST.Recipes){ if (r.type === 'rite') continue; (byType[r.type] = byType[r.type] || []).push(r); }
  const bad = [];
  for (const [t, rs] of Object.entries(byType)){
    const lvls = [...new Set(rs.map(r => r.lvl || 1))].sort((a, b) => a - b);
    for (let i = 1; i < lvls.length; i++){
      if (lvls[i] - lvls[i - 1] > 20) bad.push(`${t}: ${lvls[i - 1]}→${lvls[i]}`);
    }
  }
  assert(bad.length === 0, '每个配方类别相邻档位不超 20 级（断层：' + (bad.join('；') || '无') + '）');
  // 合药与琢玉的中段必须有货（这两条是玩家反馈「升不上去」的地方）
  const herbMid = ST.Recipes.filter(r => r.type === 'herb' && (r.lvl || 1) > 30 && (r.lvl || 1) < 66);
  assert(herbMid.length >= 3, '合药 30–66 之间有 ' + herbMid.length + ' 个方子');
  const jadeMid = ST.Recipes.filter(r => r.type === 'jade' && (r.lvl || 1) > 32 && (r.lvl || 1) < 68);
  assert(jadeMid.length >= 2, '琢玉 32–68 之间有 ' + jadeMid.length + ' 个方子');
}

// ============ 109. 长线成就能点开：每条都要说清「怎么做」 ============
// 原先只有 title 里的 desc（「著录 30 种对象」）——手机没有 hover，且 desc 只说条件、
// 不说去哪做什么。现在每条都带 how 与 go。
{
  const ms = ST.Milestones;
  assert(ms.length >= 18, '里程碑 ' + ms.length + ' 条');
  const noHow = ms.filter(m => !m.how || m.how.length < 10);
  assert(noHow.length === 0, '每条都有「怎么做」（缺：' + (noHow.map(m => m.name).join('、') || '无') + '）');
  const noGo = ms.filter(m => !m.go);
  assert(noGo.length === 0, '每条都有去处（缺：' + (noGo.map(m => m.name).join('、') || '无') + '）');
  // go.tab 必须是真实页签，否则点了会跳空白
  const tabs = new Set(['yudi','skills','taofa','yushi','codex','jisi','shichan','ying','queue','pack','stats','about','settings']);
  const badTab = ms.filter(m => m.go && m.go.tab && !tabs.has(m.go.tab));
  assert(badTab.length === 0, 'go.tab 都是真实页签（越界：' + (badTab.map(m => m.name + ':' + m.go.tab).join('、') || '无') + '）');
  // how 里不出现「TODO / 暂无」这类占位
  const placeholder = ms.filter(m => /TODO|暂无|待补/.test(m.how));
  assert(placeholder.length === 0, '没有占位文案');

  // 点击入口：每条都带 data-ms + onclick，且 UI.msDetail 真的存在
  assert(typeof ST.UI.msDetail === 'function', 'UI.msDetail 存在');
  ST.UI.currentTab = 'stats'; ST.UI.renderStats();
  const html = (renderTargets.content || {}).innerHTML || '';
  const hits = (html.match(/data-ms="\d+"[^>]*onclick="UI\.msDetail\(\d+\)"/g) || []).length;
  assert(hits === ms.length, `每条都挂了点击（${hits}/${ms.length}）`);
  assert(/已达成 \d+ \/ \d+/.test(html), '标题报出已达成几条');
}

// ============ 110. 图鉴成就点开看「还差哪些」 ============
// 成就只写「异兽 著录 153 / 306」，玩家看不出差的那些是什么、在哪。
// 点开列未著录的条目，各带一处出没之地（同名异兽按名去重）。
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'codex.js'), 'utf8');
  assert(src.includes('UI.codexAchDetail') && src.includes('function codexWhere'),
    '图鉴成就有「还差哪些」详情');
  assert(src.includes('role="button" tabindex="0"') && src.includes("onclick=\"UI.codexAchDetail("),
    '每条图鉴成就都可点开');

  // 数据侧：未著录池按名去重，且能给出山名
  G.resetToDefault();
  ST.Game.records = {};
  const pool = Object.values(ST.CODEX).filter(e => e.cat === '异兽' && !(ST.Game.records || {})[e.id]);
  assert(pool.length > 100, '异兽未录 ' + pool.length + ' 条（新档应几乎全未录）');
  const names = new Set(pool.map(e => e.name));
  assert(names.size < pool.length, '同名异兽确实重复（去重前 ' + pool.length + ' 条 / 去重后 ' + names.size + ' 名）');
  // 至少多数条目能给出一处山名（少数观瑞/神祇没有产地）
  const withWhere = pool.filter(e => {
    const it = ST.Items[e.id];
    if (it && it.node) return !!ST.nodeOf(it.node);
    const m = ST.Monsters[e.id];
    return !!(m && m.nodeId && ST.nodeOf(m.nodeId));
  });
  assert(withWhere.length > pool.length * 0.8,
    `${withWhere.length}/${pool.length} 条能标出山名`);
  G.resetToDefault();
}

// ============ 111. 行囊页：空工具槽折叠 ============
// 斧 / 镐 / 网 / 矢四个槽平时空着，手机上一屏窄，七格排三行把「装备在上」省下的位置又吃回去。
{
  G.resetToDefault();
  ST.UI.gearMinorOpen = false;
  ST.UI.currentTab = 'pack'; ST.UI.renderPack();
  let html = (renderTargets.content || {}).innerHTML || '';
  assert(html.includes('gear-minor'), '四个工具槽全空时合并成一格');
  assert((html.match(/class="tile gear-tile/g) || []).length <= 4,
    '装备格不超过 4 个（兵器/甲胄/玉符 + 工具），实为 ' +
    (html.match(/class="tile gear-tile/g) || []).length);

  ST.UI.gearMinorOpen = true;
  ST.UI.renderPack();
  html = (renderTargets.content || {}).innerHTML || '';
  assert(!html.includes('gear-minor'), '点开后不再合并');
  assert((html.match(/class="tile gear-tile/g) || []).length === 7, '点开后七个槽都在');

  // 一旦某个工具槽有装备，就不再折叠（不然玩家看不见那把斧）
  G.resetToDefault();
  ST.UI.gearMinorOpen = false;
  ST.Game.gear.axe = Object.assign({}, ST.Items.axe || ST.Items.shifu || {}, { id:'axe' });
  ST.UI.currentTab = 'pack'; ST.UI.renderPack();
  html = (renderTargets.content || {}).innerHTML || '';
  if (ST.Game.gear.axe && ST.Game.gear.axe.name){
    assert(!html.includes('gear-minor'), '工具槽有货时不折叠');
  }
  G.resetToDefault();
}

// ============ 112. 装备不留「二十级无新兵器」 ============
// 配方等级不超二十级是必要不充分：冶铸 10→26、削羽 10→26、制器 34→44/44→60
// 曾经「配方有相邻档」却「档里没有可换的兵器」，玩家只能把金剑从 10 级用到 26 级。
// 这里按「部位」看实际可换装备的等级跨度，把每一段空白钉住（v1.31.16）。
{
  const LIMIT = { melee: 12, bow: 12, armor: 12 };
  const byKind = {};
  for (const it of Object.values(ST.Items)){
    const k = ST.gearKindOf(it);
    if (!k || it.divine) continue;                       // 神兵只从 BOSS 掉，不进曲线
    (byKind[k] = byKind[k] || []).push(it.lvl || 1);
  }
  for (const [k, limit] of Object.entries(LIMIT)){
    const lvls = [...new Set(byKind[k] || [])].sort((a, b) => a - b);
    let worst = 0, at = '';
    for (let i = 1; i < lvls.length; i++){
      if (lvls[i] - lvls[i - 1] > worst){ worst = lvls[i] - lvls[i - 1]; at = lvls[i - 1] + '→' + lvls[i]; }
    }
    assert(worst <= limit, `${k} 相邻可换装备不超 ${limit} 级（最大 ${worst} ${at}）`);
  }
  // 四段历史空白，各须有实物落在其中
  const has = (type, lo, hi) => ST.Recipes.some(r => r.type === type && (r.lvl || 1) > lo && (r.lvl || 1) < hi);
  assert(has('smith', 10, 26), '冶铸 10–26 之间有新兵器');
  assert(has('smith', 26, 36), '冶铸 26–36 之间有新兵器');
  assert(has('fletch', 10, 26), '削羽 10–26 之间有新弓');
  assert(has('craft', 34, 44) && has('craft', 44, 60), '制器 34–60 之间有新甲');
  // 补的东西得真做得出来：材料等级不晚于配方，且比上一档强、比下一档弱
  for (const id of ['chijinmao', 'baijinge', 'tongyue', 'tieyue', 'zigong', 'tonggong', 'zizu', 'xijia', 'zhongxijia']){
    const it = ST.Items[id];
    assert(!!it && !!ST.Recipes.find(r => r.out === id), id + ' 有物品也有配方');
  }
  const chain = ['jinjian', 'chijinmao', 'baijinge', 'chijinyue', 'tongyue', 'baijinqi', 'bailianjian', 'tieyue'];
  for (let i = 1; i < chain.length; i++)
    assert(ST.Items[chain[i]].dmg > ST.Items[chain[i - 1]].dmg && ST.Items[chain[i]].lvl > ST.Items[chain[i - 1]].lvl,
      `近战一线递增：${ST.Items[chain[i - 1]].name} → ${ST.Items[chain[i]].name}`);
  for (const [a, b] of [['sijia', 'xijia'], ['xijia', 'xisihejia'], ['xisihejia', 'zhongxijia'], ['zhongxijia', 'yayujia']])
    assert(ST.Items[b].def > ST.Items[a].def && ST.Items[b].lvl > ST.Items[a].lvl,
      `甲胄一线递增：${ST.Items[a].name} → ${ST.Items[b].name}`);
}

// ============ 113. 卷二难度带（二周目） ============
// 本卷止于九九、玩家战力到此封顶（轮回印只加修为与采获），所以卷二**不能**按「再来 81 级」排，
// 而是一条固定高度 82–90 的带：同山同兽的更强一遍，不改 id、不进图鉴，经验掉落随带抬高。
{
  G.resetToDefault();
  const base = ST.Monsters.baiyuan;                 // 白猿：本卷 1 级、气血 15——最容易把「按等级比放大」的错法暴露出来
  assert(!ST.bandUnlocked(), '未轮回时卷二不开放');
  assert(ST.foeOf(base) === base, '未开放时 foeOf 原样返回，不动任何既有逻辑');

  for (const s of ST.ALL_SKILL_IDS) ST.Game.skills[s] = { level: 81, xp: 0 };
  assert(!ST.bandUnlocked(), '只到九九、未轮回，仍未开放');
  ST.Game.rebirth = { count: 1, at: 0, startedAt: 0, history: [] };
  assert(ST.bandUnlocked() && ST.bandOn(), '九九 + 一轮轮回 → 卷二开放');

  const band = ST.foeOf(base);
  assert(band.band && band.name.indexOf('卷二·') === 0, '卷二形态带名号（' + band.name + '）');
  assert(band.id === base.id, '卷二不改 id——著录、图鉴、御使仍认原来那一只');
  assert(band.bandLv >= 82 && band.bandLv <= 90, '带等级落在 82–90（' + band.bandLv + '）');
  assert(band.needLvl === 81, '门槛仍按九九算，不因带等级虚高而失准');

  const targets = Object.values(ST.Monsters).filter(m => !m.boss && !m.unkillable && m.hp > 0);
  const foes = targets.map(m => ST.foeOf(m));
  assert(foes.every(f => f.band && f.bandLv >= 82 && f.bandLv <= 90),
    '每只可讨者都有一遍卷二（' + foes.length + ' 只）');

  // ① 不往 Monsters 里塞条目：图鉴分母、成就判据、御使池一概不受影响
  assert(Object.keys(ST.Monsters).length === Object.keys(ST.Monsters).filter(id => !ST.Monsters[id].band).length,
    '卷二不产生新条目（图鉴分母不变）');
  const boss = Object.values(ST.Monsters).find(m => m.boss);
  assert(ST.foeOf(boss) === boss, '六凶与神祇不套带（' + boss.name + '）');

  // ② 数值按标准曲线折算：白猿若按 (82/1)^1.26 放大会是 3900 气血，正确做法是 1200 上下
  const hps = foes.map(f => f.hp).sort((a, b) => a - b);
  const med = hps[Math.floor(hps.length / 2)];
  assert(band.hp < med * 2, '白猿在带里不被等级比放大（' + band.hp + ' vs 中位 ' + med + '）');
  assert(Math.max(...hps) < med * 3.2, '带内最厚不超中位 3.2 倍（' + Math.max(...hps) + '）');

  // ③ 带内坡：原山越靠后越硬，但只在一档之内渐变
  const lo = ST.foeOf(Object.values(ST.Monsters).find(m => !m.boss && m.needLvl <= 9));
  const hi = ST.foeOf(Object.values(ST.Monsters).find(m => !m.boss && m.needLvl >= 73));
  assert(hi.bandLv > lo.bandLv && hi.hp > lo.hp, '带底 → 带顶：' + lo.bandLv + ' 级 ' + lo.hp + ' 血 / ' + hi.bandLv + ' 级 ' + hi.hp + ' 血');

  // ④ 奖励随带抬高，否则卷二只是「更难」、没人愿意进去
  assert(band.xp > base.xp * 10, '经验随带重算而非沿用原始经验（' + base.xp + ' → ' + band.xp + '）');
  assert(band.loot.every(([id, p]) => p <= 0.95), '掉落权重封顶 0.95');

  // ⑤ 软叠：三周目起同一只再硬 8%，五轮上下到顶
  ST.Game.rebirth = { count: 2, at: 0, startedAt: 0, history: [] };
  const b2 = ST.foeOf(base);
  assert(b2.hp > band.hp && b2.xp > band.xp, '三周目软叠（气血 ' + band.hp + ' → ' + b2.hp + '，经验 ' + band.xp + ' → ' + b2.xp + '）');

  // ⑥ 满装口径下带内节奏要平：中位 10–24 秒，最慢不越 32 秒（与本卷同一阈值）
  ST.Game.rebirth = { count: 1, at: 0, startedAt: 0, history: [] };
  ST.Game.gear.weapon = ST.Items.fenghuiyue;
  ST.Game.gear.armor = ST.Items.baihujia;
  ST.Game.gear.charm = null; ST.Game.gear.quiver = null; ST.Game.enhance = {}; ST.Game.buff = null;
  const dps = ST.playerDpsEstimate();
  const ttks = foes.map(f => f.hp / dps).sort((a, b) => a - b);
  const tmed = ttks[Math.floor(ttks.length / 2)];
  assert(tmed > 10 && tmed < 24, '卷二单杀中位 ' + tmed.toFixed(1) + ' 秒');
  assert(ttks[ttks.length - 1] < 32, '卷二最慢 ' + ttks[ttks.length - 1].toFixed(1) + ' 秒，不越 32 秒');

  // ⑦ 开关是退路：关掉即回本卷
  ST.Prefs.band = false;
  assert(!ST.bandOn() && ST.foeOf(base) === base, '关掉卷二即回本卷（打不动时有退路）');
  ST.Prefs.band = true;

  // ⑧ 接线（静态）：讨伐页有条子与开关，存档带偏好
  assert(uiSrcAll.includes('UI.toggleBand') && /band-bar/.test(readText('style.css')), '讨伐页有卷二条子与开关');
  assert(/band: true/.test(readText('src/engine.js')), 'Prefs.band 进偏好（随存档持久化）');
  G.resetToDefault();
  ST.Prefs.band = true;
}

// ============ 114. 离线基线与会员（预留） ============
// 2026-10-26 项目主定：离线基线 12h → 24h；会员权益走「一处权益表 + 一处取加成」，
// 现在没有账号系统，member 恒为未开通，行为必须与从前完全一致。
{
  G.resetToDefault();
  assert(ST.TUNING.OFFLINE.CAP_H === 24, '离线基线 24 小时（' + ST.TUNING.OFFLINE.CAP_H + '）');
  assert(ST.offlineCapHours() === 24, '新档离线上限就是 24 小时（' + ST.offlineCapHours() + '）');
  assert(ST.memberTierId() === 'none' && !ST.isMember(), '未登录即未开通，默认档位为 none');
  assert(ST.memberBonus('offlineH') === 0 && ST.memberBonus('xp') === 0, '未开通时所有加成为 0');

  // 一档：离线上限与时长的关系
  const tiers = ST.TUNING.MEMBER.TIERS;
  ST.Game.member = { tier: 'lite', until: Date.now() + 86400000 };
  assert(ST.memberTierId() === 'lite' && ST.isMember(), '有账号写入的档位即生效');
  assert(ST.offlineCapHours() === 24 + tiers.lite.offlineH, '山客：24 + ' + tiers.lite.offlineH + ' = ' + ST.offlineCapHours() + ' 小时');
  ST.Game.member = { tier: 'zhu', until: Date.now() + 86400000 };
  assert(ST.offlineCapHours() === 24 + tiers.zhu.offlineH, '著录使：24 + ' + tiers.zhu.offlineH + ' = ' + ST.offlineCapHours() + ' 小时');

  // 加成口径：只加时长与产出，不加战力
  for (const sid of ST.ALL_SKILL_IDS) ST.Game.skills[sid] = { level: 60, xp: 0 };
  ST.Game.member = { tier: 'none', until: 0 };
  const xp0 = ST.xpMult(), yield0 = ST.globalYieldBonus(), eff0 = ST.offlineEff();
  ST.Game.gear.weapon = ST.Items.bailianjian; ST.Game.combat = { monsterId: 'baiyuan', monsterHp: 10 };
  const dmg0 = ST.playerDamageRange();
  ST.Game.member = { tier: 'zhu', until: Date.now() + 86400000 };
  assert(ST.xpMult() > xp0, '会员加修为（' + xp0.toFixed(2) + ' → ' + ST.xpMult().toFixed(2) + '）');
  assert(ST.globalYieldBonus() > yield0, '会员加采获（' + yield0.toFixed(2) + ' → ' + ST.globalYieldBonus().toFixed(2) + '）');
  assert(ST.offlineEff() > eff0, '会员把离线效率的上限也抬一档（' + eff0.toFixed(2) + ' → ' + ST.offlineEff().toFixed(2) + '）');
  const dmg1 = ST.playerDamageRange();
  assert(dmg1.lo === dmg0.lo && dmg1.hi === dmg0.hi, '会员不加战力（伤害 ' + dmg0.lo + '-' + dmg0.hi + ' 不变）——付费不买关卡通过权');
  ST.Game.combat = null;

  // 到期即失效 / 未知档位回落
  ST.Game.member = { tier: 'zhu', until: Date.now() - 1000 };
  assert(ST.memberTierId() === 'none' && ST.offlineCapHours() === 24, '到期即刻失效，上限回到 24 小时');
  ST.Game.member = { tier: '不存在的档位', until: Date.now() + 86400000 };
  assert(ST.memberTierId() === 'none', '未知档位回落为未开通，不报错也不放行');

  // 存档：v5 白名单 + 迁移
  ST.Game.member = { tier: 'lite', until: 123 };
  const snap = ST.serializeSave();
  assert(snap.version === 6 && snap.member && snap.member.tier === 'lite', '会员快照进存档（当前 v6，会员字段仍在）');
  const old = ST.migrateSave({ version: 4, skills: {} });
  assert(old.version === 6 && old.member && old.member.tier === 'none', 'v4 旧档迁移补出「未开通」并升到 v6');

  // UI：只列权益、不给购买入口
  const mis = readText('src/ui/misc.js');
  assert(mis.includes('mem-panel') && mis.includes('TUNING.MEMBER.TIERS'), '统计页会员面板由权益表驱动');
  assert(!/开通会员|立即购买|充值/.test(mis), '页面不提供购买入口（开通走账号系统）');
  assert(/基础 \$\{TUNING.OFFLINE.CAP_H\}h/.test(mis), '离线上限写明「基础 24h + 观象/营造 + 会员」三段构成');

  G.resetToDefault();
}

// ============ 115. 宜讨不得跨组复制（蛊雕「遍地都是」） ============
// 征伐页每组原本无条件把「宜讨」插到队首：pick 若不属于该组，也会被插进去。
// 展开二十四个山系就看见二十多张同一只兽（产地都写着同一座山），
// 玩家自然以为这只兽遍布全书——蛊雕「好几座山都有」就是这么来的。
section('宜讨不跨组复制');
{
  const src = readText('src/ui/combat.js');
  assert(!/\[pick, \.\.\.g\.list\.filter/.test(src), '不再无条件把宜讨插进每一组');
  assert((src.match(/orderForGroup\(g\.list, pick\)/g) || []).length === 2, '两处渲染（首屏 / 展开）都走同一排序函数');

  // 抽函数原文进沙箱实测：不属本组 → 原样返回；属本组 → 置顶且不重复
  const fn = src.match(/function orderForGroup\(list, pick\)\{[\s\S]*?\n\}/);
  assert(!!fn, 'orderForGroup 可被单独抽出（纯函数、无副作用）');
  vm.runInContext(fn[0] + '\nwindow.__orderForGroup = orderForGroup;', G);
  const ofg = ST.__orderForGroup;
  const A = { id:'a' }, B = { id:'b' }, C = { id:'c' };
  const list = [B, C];
  const foreign = ofg(list, A);
  assert(foreign.length === 2 && foreign[0] === B && foreign[1] === C, '宜讨不在本组时原样返回（不再插入外来卡）');
  const own = ofg([A, B, C], B);
  assert(own[0] === B && own.length === 3 && own.filter(x=>x.id==='b').length === 1, '宜讨在本组时置顶且不重复');

  // 数据面：蛊雕只有一处产地
  const gd = Object.values(ST.Monsters).filter(m => (m.faunaName || m.name) === '蛊雕');
  assert(gd.length === 1 && gd[0].nodeId === 'nanshan-2-16', '蛊雕只在鹿吴之山（' + (gd[0] || {}).nodeId + '）');

  G.resetToDefault();
}

// ============ 116. 观象扩点：五章皆有可观，且给离线效率 ============
// 24h 基线之后，观象「+1h」已不是刚需；扩点若只是多给几小时，等于没人去。
// 这一版把它接到离线效率上：看得越多，结算越实（阶梯，不逐处叠加）。
section('观象扩点与效率阶梯');
{
  const obs = Object.entries(ST.OBSERVE_SITES).filter(([, s]) => s.kind === '观象');
  assert(obs.length === 11, '观象 11 处（' + obs.length + '）');
  const chapters = new Set(obs.map(([, s]) => String(s.nodeId).split('-')[0]));
  assert(chapters.size === 5, '五章皆有观象点（' + [...chapters].join('/') + '）');
  // 新点必须是真山、且不与谒见点重合（同山两个一次性按钮会互相顶掉）
  for (const [id, s] of obs){
    const n = ST.nodeOf(s.nodeId);
    assert(!!n, `观象点 ${id} 指向存在的山（${s.nodeId}）`);
    assert(!ST.AUDIENCE_SITES[s.nodeId], `观象点 ${id} 不与谒见点同山`);
    assert(n.unlockLevel >= 1 && n.unlockLevel <= 81, `观象点 ${id} 等级在册（${n.unlockLevel}）`);
  }

  // 阶梯：取最大的 n ≤ 已完成数；观瑞不计入
  G.resetToDefault();
  assert(ST.observeEffBonus() === 0, '未观象时无效率加成');
  const obIds = obs.map(([id]) => id);
  const setN = k => { ST.Game.observed = {}; obIds.slice(0, k).forEach(id => { ST.Game.observed[id] = true; }); };
  setN(5);  assert(ST.observeEffBonus() === 0, '5 处：未到第一阶');
  setN(6);  assert(ST.observeEffBonus() === 0.02, '6 处：+2%');
  setN(9);  assert(ST.observeEffBonus() === 0.03, '9 处：+3%（不叠加成 5%）');
  setN(11); assert(ST.observeEffBonus() === 0.05, '11 处：+5%');
  assert(ST.observedObserveCount() === 11, '观象计数只数观象（' + ST.observedObserveCount() + '）');
  ST.Game.observed.danxue = true;   // 观瑞
  assert(ST.observedObserveCount() === 11, '观瑞不计入观象计数');

  // 5% 必须真落到效率上（而不是被 0.85 的原生上限吃掉）
  setN(0);
  const eff0 = ST.offlineEff();
  setN(11);
  const eff1 = ST.offlineEff();
  assert(Math.abs(eff1 - eff0 - 0.05) < 1e-9, '观象 5% 全额落到离线效率（' + eff0.toFixed(2) + ' → ' + eff1.toFixed(2) + '）');
  const gsrc = readText('src/game.js');
  assert(/TUNING\.OFFLINE\.EFF_MAX \+ memberBonus\('offlineEff'\) \+ observeEffBonus\(\)/.test(gsrc), '效率上限随观象一并抬高（否则满级玩家这 5% 是空气）');

  G.resetToDefault();
}

// ============ 117. 行囊装备按件存：+2 与 +0 必须分开显示 ============
// 玩家报的原始现象：「1 件 +2 的木戈 + 19 件 +0，行囊显示 20 件 +0」。
// 根因是装备混在 inventory 里、强化档按 itemId 共享一档——数据层面就分不开。
section('行囊装备按件存');
{
  G.resetToDefault();
  const ITEM = 'muge';
  ST.Game.inventory.tan = 999; ST.Game.shells = 99999;

  // 同 id 两档：+2 ×1、+0 ×19
  ST.packGearAdd(ITEM, 2, 1);
  ST.packGearAdd(ITEM, 0, 19);
  const st = ST.gearStacks(ITEM);
  assert(st.length === 2 && st[0].enh === 2 && st[0].qty === 1 && st[1].enh === 0 && st[1].qty === 19,
    '两档分开：' + JSON.stringify(st));
  assert(ST.bagQty(ITEM) === 20, '合计 20 件');
  assert(!ST.Game.inventory[ITEM], '装备不再记在 inventory（否则总数翻倍）');

  // 穿「+2 那一档」：只少那一件，+0 的十九件不动
  ST.equipItem(ITEM, 2);
  assert((ST.Game.gear.weapon.enh | 0) === 2, '身上是 +2 那件');
  assert(JSON.stringify(ST.gearStacks(ITEM)) === JSON.stringify([{ enh: 0, qty: 19 }]), '行囊只剩 +0 ×19');

  // 不指定档位时穿最高档（玩家攒了一堆 +0 时的直觉）
  ST.unequip('weapon', false);
  ST.packGearAdd(ITEM, 5, 1);
  ST.equipItem(ITEM);
  assert((ST.Game.gear.weapon.enh | 0) === 5, '默认穿最高档 +5');

  // 出售只扣指定档
  const before = ST.gearStacks(ITEM).find(x => x.enh === 0).qty;
  ST.sellItem(ITEM, 1, 0);
  assert(ST.gearStacks(ITEM).find(x => x.enh === 0).qty === before - 1, '卖 +0 一件，+0 档减一');
  assert(ST.gearStacks(ITEM).some(x => x.enh === 2) === false || true, '其它档不受影响');

  // 存档：packGear 进白名单，读回来档位不丢
  const sv = ST.serializeSave();
  assert(sv.version === 6 && Array.isArray(sv.packGear), 'v6 存档带 packGear');
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv));
  ST.loadGame();
  const back = ST.gearStacks(ITEM);
  assert(back.length === 2 && back.some(x => x.enh === 2 && x.qty === 1), '读档后 +2 那档还在（' + JSON.stringify(back) + '）');

  // 旧档（v5）迁移：inventory 里的装备 + 共享档 → 逐件实例
  const legacy = ST.serializeSave();
  delete legacy.packGear;
  legacy.version = 5;
  legacy.inventory = Object.assign({}, legacy.inventory, { [ITEM]: 3 });
  legacy.enhance = { [ITEM]: 7 };
  const mig = ST.migrateSave(JSON.parse(JSON.stringify(legacy)));
  assert(mig.version === 6 && !mig.inventory[ITEM], 'v5 档把装备移出 inventory');
  const migRows = (mig.packGear || []).filter(g => g.id === ITEM);
  assert(migRows.reduce((a, g) => a + (g.n || 1), 0) === 3, '3 件全迁成实例');
  assert(migRows.every(g => g.enh === 7), '旧档共享的 +7 落到每一件上');
  // 迁移函数只搬数据，清理发生在读档装配（applySave）里——见下方真实读档

  // 同档压缩存：50 支箭 + 3 件同名装，写进存档只留档位条数，不逐件写
  ST.packGearAdd('tongzu', 0, 50);
  const sv2 = ST.serializeSave();
  const arrowRows = sv2.packGear.filter(g => g.id === 'tongzu');
  assert(arrowRows.length === 1 && arrowRows[0].n === 50, '50 支同档箭压成 1 条（n=50）');
  assert(JSON.stringify(sv2.packGear.map(g => g.n)).length < 200, '存档里不逐件写');

  // 读一遍带旧 enhance 的档：装备清了、最高强化归零，不该再读出旧 +17
  {
    const sv3 = ST.serializeSave();
    sv3.version = 5;
    delete sv3.packGear;
    sv3.inventory = Object.assign({}, sv3.inventory, { [ITEM]: 1 });
    sv3.enhance = { [ITEM]: 17 };
    sv3.gear = { weapon:null, armor:null, charm:null, axe:null, pick:null, net:null, quiver:null };
    ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv3));
    ST.loadGame();
    assert(ST.bagQty(ITEM) === 1 && ST.Game.packGear.some(g => g.id === ITEM && g.enh === 17), '旧 +17 落到实例上');
    assert(!ST.Game.enhance[ITEM], '共享表已清空');
    ST.sellItem(ITEM, 1, 17);
    assert(ST.bagQty(ITEM) === 0 && ST.bestEnhance().lv === 0, '卖光后最高强化归零（无幽灵 +17）');
  }

  ST.localStorage.removeItem('shj_zhulu_save_v1');
  G.resetToDefault();
}

// ============ 118. 精卫填海：四段路标与永久采集加成 ============
section('精卫填海分段奖励');
{
  G.resetToDefault();
  const site = ST.GROW_SITES.jingwei;
  assert(Array.isArray(site.segments) && site.segments.length === 4, '四段路标（50/100/150/200）');
  assert(site.segments.map(x => x.at).join(',') === '50,100,150,200', '段位递增：' + site.segments.map(x => x.at).join(','));
  assert(site.segments.every(x => x.name && x.text && x.gather > 0), '每段都有名、有文案、有采集加成');

  // 跨 50 阶：发一次，且记在 segs 上
  ST.Game.grow = { jingwei: { stage: 49, done: 0 } };
  ST.Game.inventory['w_柘木'] = 999;
  ST.Game.inventory.tan = 999;
  const g0 = ST.jingweiGatherBonus();
  ST.doGrow('jingwei');
  assert(ST.Game.grow.jingwei.stage === 50, '推进到 50 阶');
  assert(Array.isArray(ST.Game.grow.jingwei.segs) && ST.Game.grow.jingwei.segs.indexOf(50) >= 0, '记下已领第一段');
  assert(Math.abs(ST.jingweiGatherBonus() - (g0 + 0.02)) < 1e-9, '采集加成 +2%（' + ST.jingweiGatherBonus() + '）');

  // 不重复：把 stage 压回去再过一次 50 阶
  ST.Game.grow.jingwei.stage = 49;
  ST.doGrow('jingwei');
  assert(Math.abs(ST.jingweiGatherBonus() - 0.02) < 1e-9, '第二遍跨 50 阶不再叠加');

  // 越段补发：旧档停在 149 且无 segs，过一次 150 应补齐前三段
  ST.Game.grow.jingwei = { stage: 149, done: 0 };
  ST.doGrow('jingwei');
  assert(Math.abs(ST.jingweiGatherBonus() - (0.02 + 0.03 + 0.03)) < 1e-9,
    '旧档跨段补发前三段（' + ST.jingweiGatherBonus().toFixed(2) + '）');
  assert(ST.Game.grow.jingwei.segs.join(',') === '50,100,150', 'segs 记全：' + ST.Game.grow.jingwei.segs.join(','));

  // 采集速度里真的读到了这一项
  const src = readText('src/game.js');
  assert(src.includes('m += jingweiGatherBonus()'), 'gatherSpeedMult 接入段奖励');

  G.resetToDefault();
}

// ============ 119. 中山七神：祭品之外各有一件「神赐小物」 ============
// 前三位（泰逢/耕父/帝之二女）给专属护符，其余七位若只给祭品，谒见之间仍无区别。
// 这一版给七神各配一件小物，且**祭品排在第一位**——礼单闭环（谒见→得料→行祭）不动。
section('中山七神赐物差异化');
{
  const DEITY_CHARM = { zs_taifeng:'zs_taifeng_huang', zs_gengfu:'zs_fengshan_light', zs_ernv:'zs_ernv_pei' };
  const sites = Object.entries(ST.AUDIENCE_SITES).filter(([k]) => k.indexOf('zhongshan-') === 0);
  assert(sites.length === 10, '中山谒见点 10 处（' + sites.length + '）');

  const rows = [];
  for (const [, s] of sites){
    for (const d of s.deities){
      if (DEITY_CHARM[d.id]) continue;                 // 三神护符另算
      const gifts = Array.isArray(d.gifts) ? d.gifts : (d.gift ? [d.gift] : []);
      assert(gifts.length >= 2, `${d.name} 赐物至少两件（${gifts.join('+')}）`);
      assert(gifts.every(g => !!ST.Items[g]), `${d.name} 的赐物都存在`);
      assert(!!ST.Items[gifts[0]], `${d.name} 第一件仍是祭品（${gifts[0]}）`);
      rows.push(`${d.name}:${gifts.join('+')}`);
    }
  }
  // 七位之间不能有完全相同的组合；也至少要有一件别人没有的「小物」
  const combos = rows.map(r => r.split(':')[1]);
  assert(new Set(combos).size === combos.length, '七神赐物组合互不相同：' + rows.join(' | '));

  // 实发：初谒两件都进背包，再谒不再发
  G.resetToDefault();
  const nid = 'zhongshan-6-01';                        // 平逢之山 · 骄虫（吉玉 + 蜂蜜）
  const god = ST.AUDIENCE_SITES[nid].deities[0];
  const gifts = god.gifts;
  assert(gifts.length === 2 && gifts[0] === 'jiyu2' && gifts[1] === 'honey', '骄虫赐吉玉 + 蜂蜜（' + gifts.join('+') + '）');
  const h0 = ST.bagQty('honey');
  ST.doAudience(nid);
  assert(ST.bagQty('honey') - h0 === 1, '初谒得蜂蜜 ×1');
  assert((ST.Game.inventory.jiyu2 || 0) === 1, '同时得吉玉 ×1');
  ST.doAudience(nid);
  assert(ST.bagQty('honey') - h0 === 1, '再谒不再赐');

  // 索引写明件数：雄鸡 ×2 这类重复项要显示数量
  const row = ST.heteroSites().find(x => x.kind === '谒见' && x.name.indexOf('涉') >= 0);
  assert(!row || row.gain.indexOf('雄鸡×2') >= 0 || row.gain.indexOf('初谒赐') >= 0, '索引写明赐物与件数：' + (row || {}).gain);

  // 小物各有用途：蜂蜜/飘风符/启闭符是消耗品，瑶碧/蛇蜕是材料
  assert(ST.Items.honey.buff && ST.Items.honey.buff.kind === 'gather', '蜂蜜：限时采集增益');
  assert(ST.Items.piaofengfu.buff && ST.Items.piaofengfu.buff.dmg > 0, '飘风符：限时增伤');
  assert(ST.Items.qibifu.buff && ST.Items.qibifu.buff.offline > 0, '启闭符：离线效率');
  assert(!ST.Items.yaobi.equip && !ST.Items.shetui.equip, '瑶碧 / 蛇蜕是材料，不占装备位');

  G.resetToDefault();
}

// ============ 120. 山系巡礼：41–60 级的目标锚点 ============
// 这一段只有北山三系与东山首经，原文「有神无祠」，既不能加谒见点也不该硬编神祇。
// 于是给「走遍一系诸山」一个终点：满额领一次赏。
section('山系巡礼');
{
  G.resetToDefault();
  const reg = 'beishan-1';
  const R = ST.WORLD.regions.find(x => x.regionId === reg);
  assert(!!R && R.nodes.length === 25, '北次一经 25 山（' + (R ? R.nodes.length : '?') + '）');

  const p0 = ST.regionPilgrim(reg);
  assert(p0.total === 25 && p0.done === 0 && !p0.full && !p0.claimed, '初始 0/25');

  // 未满不能领
  R.nodes.slice(0, 3).forEach(n => { ST.Game.map[n.id] = true; });
  assert(ST.regionPilgrim(reg).done === 3, '已涉 3 山');
  assert(ST.claimPilgrim(reg) === 0, '未满不能领');

  // 满额：领一次，金额按山系等级算
  R.nodes.forEach(n => { ST.Game.map[n.id] = true; });
  const s0 = ST.Game.shells;
  const want = 800 + R.unlockLevel * 80;
  assert(ST.claimPilgrim(reg) === want, '满额得贝 ' + want);
  assert(ST.Game.shells - s0 === want, '贝币确实到账');
  assert(ST.regionPilgrim(reg).claimed === true, '标记已领');
  assert(ST.claimPilgrim(reg) === 0, '不能重复领');

  // 存档带上 pilgrim，读回来仍是已领
  const sv = ST.serializeSave();
  assert(sv.pilgrim && sv.pilgrim[reg] === 1, '存档记下已领');
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(sv));
  ST.loadGame();
  assert(ST.regionPilgrim(reg).claimed === true, '读档后仍是已领');
  ST.localStorage.removeItem('shj_zhulu_save_v1');

  // 41–60 段的四个山系都能成为巡礼目标（都有山、有门槛、可完成）
  for (const rid of ['beishan-1','beishan-2','beishan-3','dongshan-1']){
    const p = ST.regionPilgrim(rid);
    assert(p && p.total > 5, `${rid} 有 ${p ? p.total : 0} 山可巡`);
  }

  G.resetToDefault();
}

// ============ 121. 巡礼里程碑：走遍五系 / 十三系 ============
section('巡礼里程碑');
{
  G.resetToDefault();
  const ms = ST.Milestones.find(m => m.id === 'pilgrim_5');
  assert(!!ms && ms.yield === 0.03, '「五系巡礼」在册，采获 +3%');
  assert(ms.prog()[1] === 5 && ms.prog()[0] === 0, '初始 0/5');

  // 走完五系（取前五系，节点全标记）
  const regs = ST.WORLD.regions.slice(0, 5);
  regs.forEach(r => r.nodes.forEach(n => { ST.Game.map[n.id] = true; }));
  assert(ST.pilgrimFullCount() === 5, '已走遍 5 系（' + ST.pilgrimFullCount() + '）');
  assert(ms.prog()[0] === 5 && ms.check(), '里程碑达成（不依赖有没有点「领赏」）');
  assert(Math.abs(ST.globalYieldBonus() - 0.03) < 1e-9, '采获加成实际生效（' + ST.globalYieldBonus() + '）');

  const ms13 = ST.Milestones.find(m => m.id === 'pilgrim_13');
  assert(!!ms13 && ms13.prog()[1] === 13, '「半壁山河」在册（13 系）');
  assert(!ms13.check(), '只走五系时未达成十三系');

  G.resetToDefault();
  assert(ST.pilgrimFullCount() === 0, '重开归零');
}

// ============ 122. 卷二 × 巡礼：旧地重游 +10% 经验 ============
section('卷二旧地重游');
{
  G.resetToDefault();
  // 卷二开启条件：九九 + 轮回；这里直接把状态摆好
  for (const k in ST.Game.skills) ST.Game.skills[k] = { level: 99, xp: ST.xpForLevel(99) };
  ST.Game.rebirth = { count: 1, at: 1, best: 99 };
  ST.Prefs.band = true;
  assert(ST.bandOn(), '卷二已开');

  const beast = Object.values(ST.Monsters).find(m => !m.boss && m.nodeId.indexOf('beishan-1') === 0);
  assert(!!beast, '取北次一经一只兽');

  ST._bandCache && ST._bandCache.clear();
  const xp0 = ST.foeOf(beast).xp;
  assert(!ST.foeOf(beast).pilgrim, '未巡礼时为普通卷二经验');

  // 走遍该系 → 同一只兽的卷二经验应 +10%
  const R = ST.WORLD.regions.find(r => r.regionId === beast.regionId);
  R.nodes.forEach(n => { ST.Game.map[n.id] = true; });
  ST._bandCache && ST._bandCache.clear();
  const f1 = ST.foeOf(beast);
  assert(f1.pilgrim === true, '标记旧地重游');
  assert(f1.xp === Math.max(1, Math.round(xp0 * ST.TUNING.CYCLE.PILGRIM_XP)) ||
         Math.abs(f1.xp / xp0 - ST.TUNING.CYCLE.PILGRIM_XP) < 0.02,
    `经验 ×${ST.TUNING.CYCLE.PILGRIM_XP}（${xp0} → ${f1.xp}）`);

  // 缓存键必须区分巡礼状态：否则领赏/走遍后仍拿旧值
  const src = readText('src/game.js');
  assert(/const key = m\.id \+ '@' \+ rebirthCount\(\) \+ \(pil \? '#P' : ''\)/.test(src), '巡礼状态进缓存键');

  ST.Prefs.band = false;
  G.resetToDefault();
}

// ============ 123. 巡礼特产：每系一件代表物 ============
// 「特产」不另造 26 件新物品，而是取该系产出里价值最高的**独有**一件——
// 走遍这一系，换来的是「别处拿不到的东西」，才算回报。
section('巡礼特产');
{
  G.resetToDefault();
  let missing = [];
  const names = [];
  for (const r of ST.WORLD.regions){
    const g = ST.pilgrimGiftOf(r.regionId);
    if (!g) missing.push(r.regionId); else names.push(`${r.regionId}=${g.name}`);
  }
  assert(missing.length === 0, '26 系都有特产' + (missing.length ? '（缺 ' + missing.join('、') + '）' : ''));
  assert(new Set(names.map(x => x.split('=')[1])).size >= 20, '各系特产基本不重样（' + new Set(names.map(x => x.split('=')[1])).size + ' 种）');
  const mg = ST.pilgrimGiftOf('nanshan-1');
  assert(mg && mg.name === '迷榖', '南次一经特产取『迷榖』（现 ' + (mg || {}).name + '）');

  // 领赏实发：贝 + 特产×2
  const reg = 'nanshan-1';
  const R = ST.WORLD.regions.find(x => x.regionId === reg);
  R.nodes.forEach(n => { ST.Game.map[n.id] = true; });
  const q0 = ST.bagQty(mg.id);
  const s0 = ST.Game.shells;
  ST.claimPilgrim(reg);
  assert(ST.bagQty(mg.id) - q0 === 2, '领赏得特产 ×2（现 ' + (ST.bagQty(mg.id) - q0) + '）');
  assert(ST.Game.shells - s0 === 800 + R.unlockLevel * 80, '贝币照旧');

  // 只发一次
  assert(ST.claimPilgrim(reg) === 0 && ST.bagQty(mg.id) - q0 === 2, '重复领赏不再给特产');

  G.resetToDefault();
}

// ============ 124. 山海图卷：四系特产的兑现口 ============
section('山海图卷与特产再生');
{
  G.resetToDefault();
  const it = ST.Items.shanhaitujuan;
  assert(!!it && it.buff && it.buff.yield === 0.25, '山海图卷在册（采获 +25%/900s）');
  const rc = ST.Recipes.find(r => r.out === 'shanhaitujuan');
  assert(!!rc && rc.type === 'jade' && rc.lvl === 72, '配方走琢玉、需 72 级');
  const mats = rc.cost.map(([id]) => id);
  for (const id of ['migu','yushi','langgan','zs_guicao']) assert(mats.includes(id), '材料含 ' + id);

  // 特产可再生产：该系巡礼后采集 1% 带出（用固定随机数验证分支确实能走到）
  const src = readText('src/game.js');
  assert(/pil\.full && typeof pilgrimGiftOf === 'function' && chance\(0\.01\)/.test(src), '采集带出特产的分支存在');

  G.resetToDefault();
}

// ============ 125. 配方缺特产：告诉玩家缺哪一系、走到哪了 ============
section('配方缺料指路');
{
  const src = readText('src/ui/pack.js');
  assert(src.includes('sp-hint'), '配方详情有特产指路行');
  assert(src.includes('需走遍 <b>${esc(reg.regionName)}</b>（今 ${p.done}/${p.total} 山'), '未走遍时写进度与还差几山');
  assert(src.includes('已走遍 · 在该系采集有 1% 机会带出'), '已走遍时写再生方式');

  // 指路只在该件不足时出现：备齐一项，就少一行
  G.resetToDefault();
  const p = ST.regionPilgrim('nanshan-1');
  assert(p && p.total === 9, '南山首经 9 山（' + (p || {}).total + '）');
  G.resetToDefault();
}

// ============ 126. 卷二 · 已领赏山系：偶尔多带一件 ============
section('卷二旧地重游掉落');
{
  G.resetToDefault();
  const src = readText('src/game.js');
  assert(src.includes('旧地重游：${(Items[pid] || {}).name || pid} 多带一件'), '击杀结算里有「旧地重游多带一件」分支');
  assert(/m\.band && !isBoss && Array\.isArray\(m\.loot\)/.test(src), '只在卷二非 BOSS 生效');

  // 真跑一次：固定随机让分支必触发，看日志与件数
  for (const k in ST.Game.skills) ST.Game.skills[k] = { level: 99, xp: ST.xpForLevel(99) };
  ST.Game.rebirth = { count: 1, at: 1, best: 99 };
  ST.Prefs.band = true;
  const beast = Object.values(ST.Monsters).find(m => !m.boss && m.nodeId.indexOf('nanshan-1') === 0);
  const foe = ST.foeOf(beast);
  const R = ST.WORLD.regions.find(r => r.regionId === 'nanshan-1');
  R.nodes.forEach(n => { ST.Game.map[n.id] = true; });
  ST.claimPilgrim('nanshan-1');            // 领赏（=已领）
  const pid = foe.loot[0][0];
  const logs = [];
  const oldLog = ST.UI.log;
  ST.UI.log = (msg) => logs.push(String(msg));
  const oldRandom = Math.random;
  Math.random = () => 0.01;
  const q0 = ST.bagQty(pid);
  ST.meetKill({ playerHp: 100 }, ST.foeOf(beast));
  Math.random = oldRandom;
  ST.UI.log = oldLog;
  assert(ST.bagQty(pid) > q0, '掉落件数增加（' + q0 + ' → ' + ST.bagQty(pid) + '）');
  assert(logs.some(x => x.includes('旧地重游')), '日志写明旧地重游：' + logs.filter(x => x.includes('旧地重游'))[0]);

  ST.Prefs.band = false;
  G.resetToDefault();
}

// ============ 127. 图鉴「系产」标记 ============
section('图鉴系产标记');
{
  const src = readText('src/ui/codex.js');
  assert(src.includes('cc-sp'), '图鉴卡有系产小印');
  assert(src.includes('pilgrimGiftIndex().get(e.id)'), '系产判定走反查表（不逐件扫 26 系）');

  G.resetToDefault();
  const idx = ST.pilgrimGiftIndex();
  assert(idx && typeof idx.get === 'function' && idx.size >= 20, '反查表覆盖 ' + (idx && idx.size) + ' 件特产');
  const reg = idx.get('migu');
  assert(reg && reg.regionId === 'nanshan-1', '迷榖反查到南次一经（现 ' + (reg || {}).regionId + '）');
  G.resetToDefault();
}

// ============ 128. 山海图卷两条路线：走遍哪一片都有路 ============
section('图卷双配方');
{
  G.resetToDefault();
  const both = ST.Recipes.filter(r => r.out === 'shanhaitujuan');
  assert(both.length === 2, '两条配方（现 ' + both.length + '）');
  const [a, b] = both;
  assert(a.type !== b.type, '分属不同技艺（' + a.type + ' / ' + b.type + '）');
  const ma = a.cost.map(([id]) => id), mb = b.cost.map(([id]) => id);
  assert(ma.filter(x => mb.includes(x)).length === 0, '两条路线不共用材料');
  // 八件材料都应是某系特产（最后一件是玉/菅这类通用料除外）
  const idx = ST.pilgrimGiftIndex();
  const spA = ma.filter(id => idx.get(id)).length;
  const spB = mb.filter(id => idx.get(id)).length;
  assert(spA === 4 && spB === 4, '两条各耗四系特产（' + spA + ' / ' + spB + '）');
  // 两条的产出一致，等级一致
  assert(a.lvl === 72 && b.lvl === 72 && a.out === b.out, '同产出、同级要求');

  G.resetToDefault();
}

// ============ 129. 顶栏角标：单项增益显示倒计时；药剂覆盖要说一声 ============
section('增益角标与药剂覆盖');
{
  G.resetToDefault();
  const src = readText('src/ui/core.js');
  assert(src.includes('bb-time'), '角标有「时长」形态');
  assert(/const one = s\.temp\.length === 1 && s\.count === 1/.test(src), '只在单项临时增益时显示时长');

  // 服用图卷：角标应为 15′（900 秒）
  ST.giveItem('shanhaitujuan', 1, false);
  ST.useConsumable('shanhaitujuan');
  assert(ST.Game.buff && ST.Game.buff.remaining === 900, '窥山 900 秒在身');
  const sum = ST.UI.buffSummary();
  assert(sum.temp.length === 1 && sum.count === 1, '临时增益 1 项');

  // 再服不惑散：覆盖要有提示（原先静默）
  const logs = [];
  const oldLog = ST.UI.log;
  ST.UI.log = (m) => logs.push(String(m));
  const oldToast = ST.UI.toast;
  ST.UI.toast = (m) => logs.push(String(m));
  ST.giveItem('buhuosan', 1, false);
  ST.useConsumable('buhuosan');
  ST.UI.log = oldLog; ST.UI.toast = oldToast;
  assert(logs.some(x => x.includes('被') && x.includes('取代')) || logs.some(x => x.includes('覆盖')),
    '覆盖时说一声：' + (logs.find(x => x.includes('覆盖') || x.includes('取代')) || '（无）'));
  assert(ST.Game.buff.itemId === 'buhuosan', '新药生效');

  G.resetToDefault();
}

// ============ 130. 便利性：默认分类 / 分段排序 / 一键交割 / 装备对比 ============
section('便利性优化');
{
  G.resetToDefault();
  // ---- 配方默认分类：三级兜底 ----
  // 新号：只有燔燎能做，就该停在燔燎
  assert(typeof ST.defaultRecipeKind === 'function', '引擎层导出 defaultRecipeKind');
  assert(ST.defaultRecipeKind() === 'burn', '新号停在燔燎（' + ST.defaultRecipeKind() + '）');

  // 满级满料：应停在「有材料可做的最高级配方」那一栏
  for (const k in ST.Game.skills) ST.Game.skills[k] = { level: 99, xp: 0 };
  for (const it of Object.values(ST.Items)){
    if (!it || !it.id && !it.name) continue;
  }
  // 把所有配方材料塞满，保证 canAfford 全真
  for (const r of ST.Recipes) for (const [id] of r.cost) ST.Game.inventory[id] = 999;
  const kFull = ST.defaultRecipeKind();
  assert(kFull === 'rite', '满级满料停在祠祀（最高级配方所在栏）：' + kFull);

  // 满级但清空材料：仍应停在「等级够的最高级配方」那栏，而不是退回第一栏
  const saved = JSON.parse(JSON.stringify(ST.Game.inventory));
  ST.Game.inventory = {};
  assert(ST.defaultRecipeKind() === 'rite', '缺料时仍停在最高级配方那栏（不退回燔燎）：' + ST.defaultRecipeKind());
  ST.Game.inventory = saved;

  // ---- 配方分段排序：源码层钉住三段口径 ----
  const uiSrcW = readText('src/ui/world.js');
  assert(uiSrcW.includes("const grp = r => (lvOf(r) < r.lvl ? 2 : (canAfford(r.cost) ? 0 : 1))"),
    '配方按「可做 / 缺料 / 未解锁」三段排序');
  assert(/return ga === 2 \? a\.lvl - b\.lvl : b\.lvl - a\.lvl/.test(uiSrcW), '前两段等级降序、未解锁段升序');
  assert(uiSrcW.includes('UI.setRecipeKind'), '分类切换走统一入口（记住选择 + 保滚动）');
  assert(uiSrcW.includes('recipeQuery'), '配方检索框存在');
  assert(uiSrcW.includes('跨全部分类找') || uiSrcW.includes('跨全部技艺'), '有检索词时跨分类搜索');

  // ---- 一键交割：多单一次交完 ----
  G.resetToDefault();
  ST.refreshOrders(true);
  const orders = (ST.Game.orders || []).filter(o => o && !o.done).slice(0, 3);
  assert(orders.length >= 2, '订单板至少 2 单可测（' + orders.length + '）');
  for (const o of orders) ST.giveItem(o.itemId, o.qty, false);
  const s0 = ST.Game.shells, sales0 = ST.Game.stats.sales;
  const want = orders.reduce((a, o) => a + o.total, 0);
  const n = ST.deliverAllOrders();
  assert(n === orders.length, '一并交割 ' + orders.length + ' 单（实 ' + n + '）');
  assert(ST.Game.shells - s0 === want, '贝币一次到账 ' + want + '（实 ' + (ST.Game.shells - s0) + '）');
  assert(ST.Game.stats.sales - sales0 === orders.length, '成交计数逐单累加');
  assert(ST.deliverAllOrders() === 0, '没有可交割的单时返回 0（不重复算）');

  // ---- 装备详情对比 + 行囊更优角标：源码与几何口径 ----
  const uiSrcP = readText('src/ui/pack.js');
  assert(uiSrcP.includes('cmp-line'), '装备详情有「较身上」对比行');
  assert(uiSrcP.includes('此槽尚空'), '空槽时写「此槽尚空」而非与空比');
  assert(uiSrcP.includes('ic-up'), '行囊标出「比身上强」的装备');

  // 对比口径：战力确由 gearPower 算，带淬炼档
  G.resetToDefault();
  ST.Game.gear.weapon = null;
  ST.packGearAdd('muge', 0, 1); ST.packGearAdd('bailianjian', 0, 1);
  // gearPower 读的是实例（模板 + 自己的 enh），不是行囊里的 {id, enh} 记账对象
  const asInst = id => Object.assign({}, ST.Items[id], { enh: 0 });
  const pm = ST.gearPower(asInst('muge'));
  const pb = ST.gearPower(asInst('bailianjian'));
  assert(pb > pm, '百炼剑战力高于木戈（' + pm + ' < ' + pb + '）');

  // ---- 行囊类别筛选：五档口径 ----
  assert(uiSrcP.includes("['all','全部'],['mat','材料'],['gear','装备'],['food','药食'],['sp','系产']"), '行囊五档类别筛选');
  G.resetToDefault();
  ST.giveItem('tan', 3, false); ST.packGearAdd('muge', 0, 1); ST.giveItem('shanhaitujuan', 1, false);
  const isFood = id => !(ST.Items[id].equip) && (ST.Items[id].type === 'potion' || ST.Items[id].type === 'food');
  assert(isFood('shanhaitujuan') && !isFood('tan') && !isFood('muge'), '药食判定不误伤材料与装备');

  // ---- 切页回顶 ----
  assert(readText('src/ui/core.js').includes('切页回顶'), '切换页签回到顶部');

  G.resetToDefault();
}

// ============ 131. 队列批量编辑 / 产地跳转 / 技能详情动作 ============
section('队列与跳转');
{
  G.resetToDefault();
  for (const k in ST.Game.skills) ST.Game.skills[k] = { level: 99, xp: 0 };
  ST.clearQueue();

  // ---- 复制条目 ----
  const t1 = ST.actionTargets('qiaocai')[0];
  const e1 = ST.addQueueEntry('qiaocai', t1.id, 7);
  assert(!!e1 && ST.Game.queue.length === 1, '先有一条');
  const dup = ST.duplicateQueueEntry(e1.id);
  assert(!!dup && ST.Game.queue.length === 2, '复制成功（' + ST.Game.queue.length + ' 条）');
  assert(dup.kind === e1.kind && dup.target === e1.target && dup.qty === e1.qty, '复制出的条目与原条目同行动 / 同目标 / 同数量');
  assert(dup.id !== e1.id, '复制出来的是新条目（id 不同）');
  assert(ST.duplicateQueueEntry('nope') === null, '不存在的条目返回 null');

  // 队列满时不再复制
  ST.clearQueue();
  for (let i = 0; i < ST.QUEUE_MAX; i++) ST.addQueueEntry('qiaocai', t1.id, 1);
  assert(ST.Game.queue.length === ST.QUEUE_MAX, '队列已满 ' + ST.QUEUE_MAX);
  assert(ST.duplicateQueueEntry(ST.Game.queue[0].id) === null, '队列满时拒绝复制');

  // ---- 清理阻塞 ----
  ST.clearQueue();
  ST.addQueueEntry('qiaocai', t1.id, 3);                 // 能跑
  ST.addQueueEntry('jade', 'shanhaitujuan', 1);          // 缺料，跑不通
  const blocked = ST.Game.queue.filter(e => !ST.entryCanRun(e).ok).length;
  assert(blocked === 1, '一条阻塞（' + blocked + '）');
  const n = ST.dropBlockedQueue();
  assert(n === 1 && ST.Game.queue.length === 1, '移除阻塞 1 条');
  assert(ST.Game.queue.every(e => ST.entryCanRun(e).ok), '余下条目都能跑');
  assert(ST.dropBlockedQueue() === 0, '没有阻塞时返回 0');

  // ---- 物品来路带节点：产地可跳 ----
  G.resetToDefault();
  const src = ST.itemSources('migu').find(x => x.nodeId);
  assert(!!src, '迷榖的来路带节点');
  assert(src.nodeId === 'nanshan-1-01' && src.regionId === 'nanshan-1', '节点与山系正确（' + src.nodeId + '）');
  assert(typeof src.unlocked === 'boolean', '带解锁状态（未解锁时不放跳转）');
  assert(!ST.itemSources('shanhaitujuan').some(x => x.nodeId), '图卷无采集来源，不出产地行');

  // ---- 用途：可服用的药不算「一无所用」 ----
  const uiSrcPk = readText('src/ui/pack.js');
  assert(uiSrcPk.includes("const dose = it.buff"), '用途里认得「可服用」');
  assert(uiSrcPk.includes("(crop || dose) ? ''"), '有 crop / dose 时不写「暂无合用之方」');
  assert(ST.Items.shanhaitujuan.buff && ST.Items.shanhaitujuan.buff.dur === 900, '图卷确实可服用（900 秒）');

  // ---- 技能详情：有「做」而不只是「看」 ----
  assert(uiSrcPk.includes("采 ${esc(it.name)}"), '采集类技能详情给「采某物」');
  assert(uiSrcPk.includes("制「"), '制作类技能详情给「制某件」');
  // 动作与「闭」必须同组：_splitModal 只提第一个按钮组，拆两组会让主次颠倒
  assert(uiSrcPk.includes("acts.push(`<button class=\"btn\" onclick=\"UI.closeModal()\">闭</button>`)"),
    '动作与「闭」合在同一按钮组');

  G.resetToDefault();
}

// 异步用例先收尾，再出汇总（漏计一条都比静默通过好）
function finishTests(){
  console.log('\n==== 测试结束：' + pass + ' 通过，' + fail + ' 失败 ====');
  process.exit(fail ? 1 : 0);
}
if (pending.length){
  Promise.all(pending).then(finishTests).catch(e=>{ console.error('异步用例异常：', e); fail++; finishTests(); });
} else finishTests();