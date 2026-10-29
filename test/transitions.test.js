// 《山海经·放置挂机》最危险状态跃迁 确定性语义测试
// 运行：node test/transitions.test.js
//
// 为什么单独一份：转生（doRebirth，全局重置）/ 装备淬炼（enhanceItem，成败俱毁）/
// 词条重铸（reforgeItem）/ 廛市买卖（buyItem / bulkSell）这几条都是「一次性改动大片状态、
// 且直接动贝币与背包账目」的高危路径。随机压测只能证明它们不崩，证不了「淬炼确实扣了炭与贝币
// 且等级 +1」「转生后全状态仍有限非负（不蹦 NaN）」「买卖账目借贷平衡」。这份测试用精确断言
// 钉死这些不变量，改 game.js / affix.js / interact.js 的相关逻辑时立刻卡住。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// ---- 轻量 shim（与 engine.test.js 同源）----
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
require(path.join(__dirname, '..', 'scripts', 'build-standalone.js')).scriptOrder()
  .filter(f => !f.startsWith('ui/')).forEach(loadJS);
require(path.join(__dirname, '..', 'scripts', 'build-standalone.js')).deferredOrder().forEach(loadJS);
const S = context.window;

let pass = 0, fail = 0;
function assert(cond, msg){ if(cond){ pass++; console.log('PASS: '+msg); } else { fail++; console.error('FAIL: '+msg); process.exitCode=1; } }
function section(t){ console.log('\n== ' + t + ' =='); }

// 全状态不变量：核心数值字段必须有限、非负、且为整数（背包/技艺经验/贝币）。
// 转生改的是全状态，一条 NaN 或负数漏进存档就是脏档；fuzz 只查「动作后」的瞬时不变量，
// 这里额外卡「转生这个重置动作本身产出的状态」也曾干净。
function stateInvariants(label){
  const G = S.Game;
  let bad = [];
  if (!isFinite(G.shells) || G.shells < 0) bad.push('shells=' + G.shells);
  for (const [k,v] of Object.entries(G.inventory || {})){
    if (!isFinite(v) || v < 0 || !Number.isInteger(v)) bad.push('inv.' + k + '=' + v);
  }
  for (const [k,v] of Object.entries(G.skills || {})){
    if (!v || !isFinite(v.level) || v.level < 0 || !Number.isInteger(v.level)) bad.push('skills.' + k + '.level');
    if (!v || !isFinite(v.xp) || v.xp < 0 || !Number.isInteger(v.xp)) bad.push('skills.' + k + '.xp');
  }
  for (const [k,v] of Object.entries(G.stats || {})){
    if (typeof v === 'object'){ /* 嵌套（bossKills 等）跳过逐值检查 */ }
    else if (!isFinite(v)) bad.push('stats.' + k);
  }
  assert(bad.length === 0, label + '：核心数值全有限/非负/整数' + (bad.length ? ('，异常：' + bad.slice(0,4).join(',')) : ''));
}

section('转生（doRebirth）：全局重置后状态仍合法，无 NaN / 负数 / 非整数');
{
  S.resetToDefault();
  const sk = Object.keys(S.Skills)[0];
  S.Game.skills[sk] = { level:99, xp:1 };   // 拉满一艺以满足转生门槛
  const beforeCount = (S.Game.rebirth && S.Game.rebirth.count) || 0;
  const rb = S.doRebirth();
  assert(rb && rb.ok === true, 'doRebirth 返回 {ok:true}');
  assert((S.Game.rebirth.count || 0) === beforeCount + 1, 'rebirth.count 自增 1（' + beforeCount + '→' + S.Game.rebirth.count + '）');
  stateInvariants('转生后');
  // 重置后还能正常继续游戏动作：给物、开战、存读档均不应抛错或产出脏态
  S.giveItem('gui', 3, false);
  assert(S.Game.inventory.gui >= 3, '转生后 giveItem 仍正常（累加 3）');
  S.saveGame();
  const t = S.exportSaveText();
  S.resetToDefault();
  const r = S.importSaveText(t);
  assert(r && r.ok === true, '转生后的存档仍可正常导出/导入');
  stateInvariants('转生且存读档后');
}

section('装备淬炼（enhanceItem）：消耗炭与贝币、等级 +1、无 NaN');
{
  S.resetToDefault();
  const wid = Object.keys(S.Items).find(id => { const it = S.Items[id]; return it && it.equip && (it.dmg || it.def); });
  S.giveItem(wid, 1, false);
  S.Game.inventory.tan = 999;
  S.Game.shells = 1e9;
  const tanBefore = S.Game.inventory.tan;
  const shellsBefore = S.Game.shells;
  const lvBefore = S.enhanceLevel(wid);
  const e = S.enhanceItem(wid, { silent:true });
  assert(e && e.ok === true && e.success === true, 'enhanceItem 成功返回 {ok:true,success:true}');
  assert(S.enhanceLevel(wid) === lvBefore + 1, '淬炼后等级 +1（' + lvBefore + '→' + S.enhanceLevel(wid) + '）');
  assert(S.Game.inventory.tan < tanBefore, '淬炼消耗了炭（' + tanBefore + '→' + S.Game.inventory.tan + '）');
  assert(S.Game.shells < shellsBefore, '淬炼消耗了贝币（' + shellsBefore + '→' + S.Game.shells + '）');
  assert(isFinite(S.Game.shells) && isFinite(S.Game.inventory.tan), '淬炼后账目仍为有限数（无 NaN）');
}

section('词条重铸（reforgeItem）：返回 true 且词条发生变化');
{
  S.resetToDefault();
  const fid = 'migufu';
  S.giveItem(fid, 1, false);
  S.Game.inventory.tan = 999;
  S.Game.shells = 1e9;
  const before = JSON.stringify(S.affixOf(fid));
  const rf = S.reforgeItem(fid);
  assert(rf === true, 'reforgeItem 返回 true');
  assert(JSON.stringify(S.affixOf(fid)) !== before, '重铸后词条发生变化');
}

section('廛市买卖（buyItem / bulkSell）：账目借贷平衡');
{
  S.resetToDefault();
  S.Game.shells = 1e9;
  S.Game.shanglv = 99;
  const shellsBeforeBuy = S.Game.shells;
  const bought = S.buyItem(0, 1);
  assert(bought === true, 'buyItem(0,1) 购入成功');
  assert(S.Game.shells < shellsBeforeBuy, '购入后贝币减少（' + shellsBeforeBuy + '→' + S.Game.shells + '）');
  // 备足可售原料后整批售出，应得贝币
  S.Game.shells = 1e9;
  const shellsBeforeSell = S.Game.shells;
  const bs = S.bulkSell('COMMON');
  assert(bs && bs.gain > 0 && bs.count > 0, 'bulkSell 售出 ' + (bs && bs.count) + ' 件、得 ' + (bs && bs.gain) + ' 贝币');
  assert(S.Game.shells === shellsBeforeSell + (bs ? bs.gain : 0), '售出所得恰好入账（借贷平衡，无凭空造钱/漏钱）');
}

console.log(`\n状态跃迁语义测试：${pass} 通过 / ${fail} 失败`);
if (fail) process.exitCode = 1;
