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
['nanshanData.js','xishanData.js','beishanData.js','dongshanData.js','gameData.js','engine.js','game.js','queue.js','interact.js','fx.js'].forEach(loadJS);
const G = context;
const ST = context.window;

G.resetToDefault();

let pass = 0, fail = 0;
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
assert(ST.WORLD.regions.length === 14, '世界共 14 山系（南山 3 + 西山 4 + 北山 3 + 东山 4）');
assert(ST.WORLD.regions.reduce((a,r)=>a+r.nodes.length,0) === 250, '世界共 250 山（39+77+88+46）-> ' + ST.WORLD.regions.reduce((a,r)=>a+r.nodes.length,0));
assert(ST.CHAPTERS.length === 4 && ST.CHAPTERS[3].regionIds.length === 4, '四章：南山 / 西山 / 北山 / 东山');
// 东山经接入校验（2026-10）
const dsNodes = [];
ST.DONGSHAN.regions.forEach(r=>r.nodes.forEach(n=>dsNodes.push(n)));
assert(dsNodes.length === 46, '东山经四系共 46 山 -> ' + dsNodes.length);
assert(dsNodes.every(n=>n.unlockLevel>=71 && n.unlockLevel<=81), '东山 46 山等级重排入 71-81（终末章）');
assert(dsNodes.every(n=>n.dataUnlockLevel>0), '东山原始调参值保留在 dataUnlockLevel');
assert(ST.DONGSHAN.regions.filter(r=>r.deity).length === 3, '东山四系中三系载山神与祠礼（东次四经为「无神之域」');
assert(ST.WORLD.regions.find(r=>r.regionId==='dongshan-4').unlockLevel === 80, '东次四经区域门槛 80，太山（81）为全世界最高节点门槛');
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
assert(Object.keys(ST.OMENS).length === 8 + 15 + 4 + 15, '征兆 8 + 15 + 北山 4 + 东山 15 = 42 条 -> ' + Object.keys(ST.OMENS).length);
assert(Object.keys(ST.OBSERVE_SITES).length === 9, '观象/观瑞 5 + 东山 4 = 9 处');
assert(Object.keys(ST.RITES).length === 3 + 6 + 1 + 3 + 3, '祠礼 3 + 6 + 常祭 + 北山 3 + 东山 3 = 16 套 -> ' + Object.keys(ST.RITES).length);
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
assert(xsNodes.every(n=>n.unlockLevel>=33 && n.unlockLevel<=52), '西山 77 山等级重排入 33-52（接南山 32）');
assert(xsNodes.every(n=>n.dataUnlockLevel>0), '原始调参值保留在 dataUnlockLevel');
// ---- 北山经校验 ----
const bsNodes = [];
ST.BEISHAN.regions.forEach(r=>r.nodes.forEach(n=>bsNodes.push(n)));
assert(bsNodes.length === 88, '北山经三系共 88 山 -> ' + bsNodes.length);
assert(bsNodes.every(n=>n.unlockLevel>=53 && n.unlockLevel<=70), '北山 88 山等级重排入 53-70（后启东山 71）');
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

// ============ 16. UI 渲染冒烟 ============
section('UI 渲染冒烟');
loadJS('ui.js');
// 浏览器中 window === globalThis，ui.js 末尾的 window.UI = UI 会让全局属性与
// 词法绑定同为真实 UI；沙箱里 window 只是普通对象，需手动对齐，否则 game.js
// 等先加载脚本里的 UI 仍指向桩对象。
context.UI = ST.UI;
const renderTargets = {};
const mkTarget = ()=>({ innerHTML:'', dataset:{}, style:{}, classList:{ add(){}, remove(){}, toggle(){} }, textContent:'', value:'', checked:false, appendChild(){}, remove(){} });
['content','tabs','toasts','modal','modalBox','logList','actionProg','actionProgFill','activityText','hpDisplay','buffDisplay','shellCount','totalLevel','recordCount','guidance','btnSettings','btnStop','fab','drawerMask','topdock'].forEach(t=>renderTargets[t]=mkTarget());
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
  ST.UI.renderTopbar();
  ST.UI.tickProgress();
  ST.UI.refreshActivity();
  ST.showItemDetail('gui');
  ST.showCodexDetail('shengsheng');
  ST.UI.closeModal();
} catch(e){ uiOk = false; console.error('UI 渲染异常：'+e.stack); }
assert(uiOk, '全部页面渲染不抛错');
assert(renderTargets.content.innerHTML.length > 100, '内容区有实际输出');
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
assert(renderTargets.content.innerHTML.indexOf('node-item') >= 0, '舆地页渲染节点');
// 页签角标刷新不抛错
let tbOk = true; try { G.refreshTabBadges(); } catch(e){ tbOk = false; console.error('刷新角标异常：'+e.stack); }
assert(tbOk, '页签角标刷新不抛错');
// 全局指引条：非舆地页签下 refreshActivity 应填充
ST.UI.currentTab = 'codex'; ST.UI.refreshActivity();
assert(renderTargets.guidance.innerHTML.indexOf('<span>') >= 0, '全局指引条在其它页签填充建议');
assert((ST.Game.records && Object.keys(ST.Game.records).length > 0 ? renderTargets.guidance.innerHTML.indexOf('前往') >= 0 : true), '有可跳转指引时显示「前往」');

// 状态栏常驻增益摘要（御使 / 征兆）
const _dep2 = ST.Game.deployed, _om2 = ST.Game.omens, _buff2 = ST.Game.buff;
let psOk = true, psTxt = '';
try { ST.Game.deployed = { 0:'shengsheng' }; ST.Game.buff = null; ST.UI.renderTopbar(); psTxt = renderTargets.buffDisplay.textContent; }
catch(e){ psOk = false; console.error('增益摘要异常：'+e.stack); }
assert(psOk && psTxt.indexOf('御使') >= 0, '状态栏显示御使增益摘要');
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
assert(ST.UI.currentTab === 'stats', '右滑在首页环绕到末页');

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
let omOk2 = true, omModal = '', omBar = '';
const _omens = ST.Game.omens, _buff = ST.Game.buff;
try {
  ST.Game.omens = [{ id:'lili' }];
  ST.Game.buff = null;   // 隔离临时增益，验证无 buff 时的被动摘要路径
  ST.UI.renderTopbar();
  omBar = renderTargets.buffDisplay.textContent;   // 顶栏精简后，⚡ 征兆计数并入状态条增益摘要
  ST.openOmenSummary();
  omModal = renderTargets.modalBox.innerHTML;
} catch(e){ omOk2 = false; console.error('征兆弹窗异常：'+e.stack); }
finally { ST.Game.omens = _omens; ST.Game.buff = _buff; }
assert(omOk2, 'openOmenSummary 不抛错');
assert(omBar.indexOf('⚡') >= 0, '状态条增益摘要带 ⚡ 征兆图标（顶栏精简后入口）');
assert(renderTargets.buffDisplay.style.cursor === 'pointer', '增益摘要可点击（cursor:pointer）');
assert(omModal.indexOf('征兆总效应') >= 0 && omModal.indexOf('总效应') >= 0, '征兆弹窗汇总总效应');

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
const codeFiles = ['index.html','style.css','src/nanshanData.js','src/gameData.js','src/engine.js','src/game.js','src/queue.js','src/interact.js','src/fx.js','src/ui.js','README.md'];
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
assert(/position:fixed; left:0; top:0; bottom:0; width:54px;/.test(css), '移动端图标栏铺满全高（上接书脊，左侧无断带空白）');
assert(/linear-gradient\(to bottom,\s*var\(--chrome\) 0 var\(--topdock-h, 87px\),\s*var\(--paper\) var\(--topdock-h, 87px\)\)/.test(css), '图标栏上段与书脊同色、下段转纸色（白天非整块深墨）');
assert(/min-height:42px;[^}]*color:var\(--ink-3\)/.test(css), '图标栏页签用纸色系墨灰（白天可读）');
assert(/#tabs \.tab\.active\{ color:var\(--zhu\); background:var\(--zhu-w\); \}/.test(css), '图标栏选中项为朱红淡底（与桌面同一套语言）');
assert(/body\.drawer-open #tabs\{[^}]*width:min\(228px, 80vw\);[^}]*top:var\(--topdock-h, 87px\)/.test(css), '展开态宽菜单退到吸顶区下沿，不遮挡书脊');
// 展开态必须覆盖为纯纸色：折叠态的渐变以元素自身为基准，展开后 top 下移一个
// topdock-h，渐变会把抽屉头部一条带误涂成书脊墨色（盖住 ≪ 与首行页签，
// 淡朱底活动行叠在深墨上成暗红）——白天模式下尤其明显
assert(/body\.drawer-open #tabs\{[^}]*background:var\(--paper\);/.test(css), '展开态覆盖为纯纸色（消除渐变残留的伪书脊带）');
assert(/#guidance\{ padding:8px 34px 8px 66px; font-size:11\.5px; line-height:1\.5; \}/.test(css), '指引条让出侧栏宽度（padding-left:66px）');
assert(/#guidance span:not\(\.goto\)\{[\s\S]*?-webkit-line-clamp:2/.test(css), '指引条文本最多两行（切换页签不挤兑内容）');
assert(/#topbar\{ padding:8px 8px 9px 66px; \}/.test(css), '窄屏书脊让出侧栏宽度');
assert(/#statusbar\{ padding:0 8px 0 66px; gap:10px; \}/.test(css), '窄屏仪表带让出侧栏宽度');
assert(/#topbar \.stat\[data-s="录"\] \.meter\{ display:none; \}/.test(css), '窄屏隐藏已录细线，为让位腾出宽度');
assert(css2.includes('padding-left:54px'), '移动端主内容为常驻图标栏让位（padding-left:54px）');
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
  assert(yingTxt.indexOf('building-grid') >= 0 && yingTxt.indexOf('rc-sub') >= 0 && yingTxt.indexOf('chip cost') >= 0, '营造卡直陈说明与材料（不再藏于浮层）');
  assert(yingTxt.indexOf('data-tip') < 0, '营造卡不再需要浮层锚点'); }
assert(css.includes('#tipLayer'), 'CSS 含浮层样式');
assert(css.includes('sheet-in') && css.includes('bottom:0 !important'), '窄屏浮层为底部抽屉形态');
assert(css.includes('tip-in'), '宽屏浮层为气泡形态');
// 触屏点按与悬停的模态区分：避免合成 mouseover 开层后 click 又将其关掉
assert(uiSrc.includes('touchJustNow') && uiSrc.includes('lastTouchAt'), 'ui.js 区分触屏点按与鼠标悬停（防止点按开层即被关）');
// 网格密度：最小列宽下调（一屏展示更多条目）
['minmax(178px,1fr)','minmax(196px,1fr)','minmax(184px,1fr)'].forEach(g=>assert(css.includes(g), '网格密度上调 ' + g));

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
assert(uiSrc.includes("$('buffDisplay') && $('buffDisplay').addEventListener('click', openOmenSummary)"), '增益摘要点击打开征兆总效应（补偿顶栏征兆入口）');
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
assert(/padding:0 16px 28px/.test((css.match(/#app\{[^}]*\}/) || [''])[0]), '#app 底部不再为状态条预留空间');
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
assert(hudHp.indexOf('40') >= 0, '无行动进度时战斗 HUD 仍刷新顶栏气血 -> ' + hudHp);
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
  const runtime = ['--topdock-h','--sheet-h','--dx','--dy','--r'];
  const undef = [...used].filter(v => !defined.has(v) && !runtime.includes(v));
  assert(undef.length === 0, 'CSS 变量全部有定义（运行时注入的 --topdock-h / --sheet-h / --dx / --dy / --r 除外）' + (undef.length?('：'+undef.join(',')):''));
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
assert(uiSrc.includes('>✔ 宜讨</span>'), '宜讨与「✔ 推荐」兼具时合并为一枚标签（不并排）');
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
assert(uiSrc.includes('<span class="bc-decay" title="连续讨伐 ${streakN} 次'), '递减标签带悬浮说明');
assert(uiSrc.includes('<span class="rec">著录 ${rec.count}</span>${decayTag}'), '递减标签插入异兽卡页脚');
assert(/\.bc-decay\{/.test(css), '递减标签有样式（灰墨细框，与朱色宜讨区分）');

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
assert(uiSrc.includes('⚖️ 方国求购'), '墟市页有订单板标题');
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
  // 战斗中同样不显示（stopActivity 不停战斗，按钮无意义）
  ST.Game.combat = { monsterId:'shengsheng' };
  ST.UI.refreshActivity();
  assert(toggleLog[toggleLog.length-1] === true, '战斗中也不显示停止按钮');
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
  assert(uiSrc.includes("bs.classList.toggle('hidden', !Game.activity)"), '停止按钮显隐接线存在');
  assert(uiSrc.includes("if (a.src === 'fallback') label += '（兜底）'"), '兜底标识接线存在');
  assert(uiSrc.includes('<div class="form-row"><span>闲置兜底</span>'), '设置页有「闲置兜底」开关');
  assert(uiSrc.includes('Prefs.idleFallback=Prefs.idleFallback===false;saveGame();openSettings()'), '开关三连式（翻转/存档/重绘）');
  assert(uiSrc.includes('${Prefs.idleFallback!==false?\'开\':\'关\'}'), '开关显示当前状态');
  // 设置页渲染冒烟
  ST.openSettings();
  assert(renderTargets.modalBox.innerHTML.includes('闲置兜底'), '设置弹窗渲染出该开关');
}

// ============ 27. 顶栏收敛 + 征伐页渲染性能 ============
section('顶栏收敛与征伐页性能');
// 27.1 入口收敛：昼夜 / 帮助 / 设置三按钮从顶栏移除，设置沉入侧边栏
assert(!html.includes('btnTheme') && !html.includes('btnHelp') && !html.includes('btnSettings'),
  'index.html 顶栏三按钮全部移除');
assert(!uiSrc.includes("$('btnTheme') && $('btnTheme').addEventListener"), '初始化不再绑定顶栏按钮');
assert(uiSrc.includes('data-tool="settings"'), '侧边栏末尾渲染「设置」入口');
assert(uiSrc.includes('if (b.dataset.tool) return;'), '设置入口不参与切页绑定（避免 switchTab(undefined)）');
assert(uiSrc.includes('onclick="openSettings()"') && uiSrc.includes("ICON('<circle cx=\"12\" cy=\"12\" r=\"3.1\"/>"), '设置入口带齿轮图标并直达弹窗');
assert(/\.tab-tool\{ margin-top:auto;/.test(css), '设置入口沉底（margin-top:auto），与页签区分');
assert(/\.tab-tool\{[^}]*border-top:1px solid var\(--rule-2\)/.test(css), '设置入口与导航之间有一道细线');
// 27.2 设置弹窗接管昼夜与玩法说明
assert(uiSrc.includes('<div class="form-row"><span>昼夜</span>'), '设置弹窗含「昼夜」一行');
assert(uiSrc.includes("onclick=\"setTheme('day')\"") && uiSrc.includes("onclick=\"setTheme('night')\""), '昼夜两态可点选');
assert(uiSrc.includes("function setTheme(t){") && uiSrc.includes('UI.applyTheme(t, true)'), 'setTheme 走 applyTheme 并持久化');
assert(uiSrc.includes("de.classList.add('theme-anim')"), '切换昼夜保留柔和过渡（theme-anim）');
assert(uiSrc.includes('onclick="UI.closeModal();openHelp()"'), '玩法说明入口仍在设置内');
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
  assert(h.includes('id="arenaBox"') && h.includes('beast-card'), '整页渲染输出竞技场与目标卡');
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
  const i1 = h.indexOf('class="beast-card', i0 + 10);
  const card = h.slice(i0, i1 > i0 ? i1 : i0 + 1200);   // 只取这一张卡，不卷进邻卡
  assert(ST.Monsters.shengsheng.el === '木', '狌狌为木属（用真实数据校验）');
  assert(card.includes('宜用金属'), '木敌卡片标注「宜用金属」');
  assert(!card.includes('宜用土属'), '不再把「敌方所克」的土当成宜用');
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
  assert(ids.length === 16, '祠礼共十六套（含常祭）-> ' + ids.length);
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

console.log('\n==== 测试结束：' + pass + ' 通过，' + fail + ' 失败 ====');
process.exit(fail ? 1 : 0);