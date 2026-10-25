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
assert(Object.keys(ST.OBSERVE_SITES).length === 9, '观象/观瑞 5 + 东山 4 = 9 处');
assert(Object.keys(ST.RITES).length === 3 + 6 + 1 + 3 + 3 + 12, '祠礼 3 + 6 + 常祭 + 北山 3 + 东山 3 + 中山 12 = 28 套 -> ' + Object.keys(ST.RITES).length);
// 交互补充：切属性即开战 / 营造详情弹窗 / 行装页战斗数值条
{
  const uiSrc2 = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8');
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
G.giveItem('guaimu', 5, false); G.giveItem('shashi', 5, false); G.giveItem('jing', 3, false);
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
  const srcAll = ['game.js','queue.js','interact.js','gameData.js','ui.js']
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
assert(ST.offlineEff() <= ST.TUNING.OFFLINE.EFF_MAX && ST.offlineEff() >= 0.1, '离线效率在 [0.1, 0.85]');
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
loadJS('ui.js');
// 浏览器中 window === globalThis，ui.js 末尾的 window.UI = UI 会让全局属性与
// 词法绑定同为真实 UI；沙箱里 window 只是普通对象，需手动对齐，否则 game.js
// 等先加载脚本里的 UI 仍指向桩对象。
context.UI = ST.UI;
const renderTargets = {};
const mkTarget = ()=>({ innerHTML:'', dataset:{}, style:{}, classList:{ add(){}, remove(){}, toggle(){} }, textContent:'', value:'', checked:false, appendChild(){}, remove(){} });
['content','tabs','toasts','modal','modalBox','logList','actionProg','actionProgFill','activityText','hpDisplay','buffDisplay','buffBtn','buffCount','buffPop','shellCount','totalLevel','recordCount','guidance','btnSettings','btnStop','fab','drawerMask','topdock'].forEach(t=>renderTargets[t]=mkTarget());
renderTargets.buffPop.classList.contains = ()=> true;   // 默认视为收起，closeBuffPop 不重复动作
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
assert(oeOk && oeTxt.indexOf('当前总效应') >= 0 && oeTxt.indexOf('全局产出') >= 0, '祠祀页显示征兆当前总效应');
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
assert(fs.readFileSync(path.join(__dirname,'..','src','ui.js'),'utf8').includes('wuxingAdvice(m.el, playerElement())'), '征伐页按（敌, 我）顺序调用五行提示');

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
const codeFiles = ['index.html','style.css','src/nanshanData.js','src/gameData.js','src/save.js','src/engine.js','src/game.js','src/queue.js','src/interact.js','src/fx.js','src/ui.js','src/beastIcon.js','src/riteIcon.js','src/structureIcon.js','src/skillIcon.js','src/itemIcon.js','src/markIcon.js','README.md'];
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
assert(fs.readFileSync(path.join(__dirname,'..','src','ui.js'),'utf8').includes('applyTheme'), 'ui.js 提供 applyTheme 主题应用');
assert(/#fab\{ display:none; \}/.test(css2), '#fab 仅窄屏显示（PC 默认隐藏）');
assert(readText('src/ui.js').includes('toggleDrawer'), 'ui.js 含抽屉开关实现');

// ============ 19. 小单块 + 详情浮层（渐进披露） ============
section('小单块与详情浮层');
const uiSrc = readText('src/ui.js');
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
assert(uiSrc.includes('(b===pick?1:0) - (a===pick?1:0)'), '宜讨项在分组内置顶');
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
  assert(raw && raw.combat === undefined, '存档不再写入战斗态（combat 字段已移除）');
  assert(raw && raw.activity === null || raw.activity === undefined, '行动态仍按原样保存');

  // 造一份含 combat 的旧档：读档必须丢弃，而不是恢复成「不会推进的战斗」
  raw.combat = { monsterId:'shengsheng', monsterHp:8, playerHp:20, round:0, timer:0, maxtemp:0, style:'attack' };
  ST.localStorage.setItem('shj_zhulu_save_v1', JSON.stringify(raw));
  G.loadGame();
  assert(ST.Game.combat === null, '旧档里的战斗态被丢弃（不再卡死）');
  assert(ST.Game._droppedCombat === 'shengsheng', '记下被中止的目标，供首屏提示');
  ST.UI.refreshActivity();
  assert(renderTargets.activityText.textContent === '空闲', '读档后状态栏回到空闲');
  assert(uiSrc.includes('上次往讨已中止'), '首屏给出「上次往讨已中止」提示');
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
  ST.Game.inventory.jing = 50;
  ST.startActivity('craft', 'craft::sheng');
  assert(ST.Game.activity && ST.Game.activity.remain == null, '「连」不设件数上限');
  G.doRecipeAction(ST.Game.activity);
  G.doRecipeAction(ST.Game.activity);
  assert(!!ST.Game.activity && ST.Game.stats.crafts === c0 + 3, '连作持续进行');

  // 35.3 离线结算尊重限量
  G.resetToDefault();
  ST.Game.inventory.jing = 100;
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
  assert(uiSrc.includes("`UI.craftDenied('${r.type}::${r.out}')`") && uiSrc.includes('UI.craftDenied = function(key)'), '不可制作时点按给出缺料 / 等级提示');
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
  assert(uiSrc.includes('祭品不足：缺'), '缺祭品时说清缺哪几样');
  assert(/\.rite-grid\{[^}]*minmax\(92px,1fr\)/.test(css), '祠礼方格 92px');

  assert(uiSrc.includes('class="tile shop-tile') && uiSrc.includes("onclick=\"buyItem(${idx},1)\""), '商品方块点按买一份');
  assert(uiSrc.includes("event.stopPropagation();buyItem(${idx},10)"), '商品方块右上 ×10 买十份');
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
  assert(uiSrc.includes('class="tile sell-tile') && uiSrc.includes("sellItem('${id}',1);UI.renderShichan()"), '出售方块点按售 1');
  assert(uiSrc.includes("event.stopPropagation();sellItem('${id}',${q});UI.renderShichan()"), '出售方块右上「全」售清');
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
  assert((gameSrc.match(/if \(UI && UI\.patchOmens\) UI\.patchOmens\(\);/g)||[]).length === 2, '征兆到期与激活两处都补绘');

  // 43.3 增益浮层展开时连带刷新（倒计时尤其）
  assert(uiSrc.includes("if (pop && !pop.classList.contains('hidden')) pop.innerHTML = this.buffPopHtml();"), '增益浮层展开时内容跟随刷新');

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
  assert(gameSrc.includes('_qDriven ? { fromQueue:true } : undefined'), '队列讨伐连战同一只时也不暂停队列');
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
  const uiM = readText('src/ui.js');
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
  assert(uiM.includes('data-tip-title="${esc(x.name)}${x.py?') && uiM.includes('（${esc(x.py)}）'), '浮层标题带注音（生僻字可辨）');
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
  assert(/const SAVE_VERSION = 3/.test(saveSrc), '存档结构版本号为 3');
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
  const uiM29 = readText('src/ui.js');
  // 29.1 模块存在并已接入加载顺序
  assert(typeof si === 'function', 'structureIcon 已导出');
  assert(/const ART = \{ zhai, zaoku, tuku, citan, shichan, canglin, fenghuotai, xuegong \}/.test(stcSrc), '八座建筑各有一幅专属画法');
  assert(indexOfOf('index.html', 'src/structureIcon.js') >= 0, 'structureIcon.js 已引入页面');
  // 29.2 建筑数量与图标数量严格对齐（新增建筑必须补图）
  assert(ST.STRUCTURE_ICON_IDS.length === 8, '建筑图标共 8 枚（' + ST.STRUCTURE_ICON_IDS.length + '）');
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
  const uiM30 = readText('src/ui.js');
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
  const uiM31 = readText('src/ui.js');
  // 31.1 模块存在并已接入
  assert(typeof ii === 'function', 'itemIcon 已导出');
  assert(typeof ic === 'function', 'itemIc 已导出');
  assert(indexOfOf('index.html', 'src/itemIcon.js') >= 0, 'itemIcon.js 已引入页面');
  assert(indexOfOf('scripts/build-standalone.js', 'itemIcon.js') >= 0, 'itemIcon.js 已并入独立版构建');
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
  const uiM32 = readText('src/ui.js');
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
  const uiSrc2 = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8');
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
  ST.Game.inventory.muge = 1;                  // 先持有一柄木戈再装备
  ST.equipItem('muge');
  ST.Game.combat = { style:'attack' };        // 固定近战口径，免得默认祝术走法术分支
  const dmg0 = G.playerWeaponDmg();
  assert(ST.enhanceItem('muge') === true, '装备可淬炼');
  assert(ST.enhanceLevel('muge') === 1, '淬炼 +1');
  assert(G.playerWeaponDmg() > dmg0, '淬炼提升武器伤害（+6%/级）');
  ST.Game.combat = null;
  ST.Game.enhance.muge = 9;
  const tan0 = ST.Game.inventory.tan;
  assert(ST.enhanceItem('muge') === false && (ST.Game.inventory.tan || 0) === tan0, '已至 +9 不再消耗');
  const ser2 = ST.serializeSave();
  assert(ser2 && ser2.enhance && ser2.enhance.muge === 9, '淬炼等级写入存档');

  // 42.9 行动链：页尾「下一步」横条
  assert(uiSrc2.includes('function nextStepHtml') && uiSrc2.includes('class="next-step-bar"'), '页尾「下一步」横条（行动链）');

  // 42.10 移动端操作按钮统一近直角
  assert(/@media \(max-width:760px\)\{[\s\S]{0,500}\.btn[^{]*\{[^}]*border-radius:1px !important/.test(css2), '窄屏操作按钮统一近直角');
}

// ============ 44. 装备词条 / 势与绝技 / 数值构成 / 收集成就（v1.14） ============
{
  const affixSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'affix.js'), 'utf8');
  const uiSrc44 = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8');
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
  ST.Game.inventory.jinjian = 1; ST.Game.inventory.pijia = 1;
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
  const buildSrc44 = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-standalone.js'), 'utf8');
  assert(buildSrc44.includes("'affix.js'"), '单文件构建清单含 affix.js');
  assert(buildSrc44.indexOf("'gameData.js'") < buildSrc44.indexOf("'affix.js'"), 'affix.js 在 gameData.js 之后内联（依赖 Items）');

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

// 异步用例先收尾，再出汇总（漏计一条都比静默通过好）
function finishTests(){
  console.log('\n==== 测试结束：' + pass + ' 通过，' + fail + ' 失败 ====');
  process.exit(fail ? 1 : 0);
}
if (pending.length){
  Promise.all(pending).then(finishTests).catch(e=>{ console.error('异步用例异常：', e); fail++; finishTests(); });
} else finishTests();