// 《山海经·放置挂机》存档 / 多端合并 确定性语义测试
// 运行：node test/save-merge.test.js
//
// 为什么单独一份：随机压测（scripts/fuzz.js）只能证明「百万次随机动作不崩 / 不出现 NaN」，
// 却断言不了「合并到底取大还是取并集 / 贝币取较新一档还是求和」这类精确规则。这些规则
// 一旦写反（比如贝币被加成求和），fuzz 在绝大多数随机组合下也撞不出可见异常，却是
// 真能凭空造钱的线上事故。这份测试用精确断言把方向规则钉死，改 save.js 合并逻辑时
// 会被立刻卡住。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// ---- 轻量 shim（与 engine.test.js 同源，保证跑的是同一套引擎）----
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
const ST = context.window;

let pass = 0, fail = 0;
function assert(cond, msg){ if(cond){ pass++; console.log('PASS: '+msg); } else { fail++; console.error('FAIL: '+msg); process.exitCode=1; } }
function section(t){ console.log('\n== ' + t + ' =='); }

// 深度键排序比较（消除 JSON 键序 / 默认补全造成的误报），与 fuzz 的 canon 同思路。
function canon(v){
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const ks = Object.keys(v).sort();
  return '{' + ks.map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
// 剔除非确定字段：savedAt/rev/deviceId/startedAt/combat（combat 不跨会话恢复，序列化/读档口径不同）。
const SKIP = new Set(['savedAt','rev','deviceId','startedAt','combat']);
function strip(o){ const c = Object.assign({}, o); for (const k of SKIP) delete c[k]; return c; }

section('存档往返：serialize → reset → import → serialize 双往返幂等');
ST.resetToDefault();
ST.Game.shells = 12345;
ST.Game.skills.qiaocai = { level:20, xp:5 };
ST.Game.inventory.gui = 7;
ST.Game.map['nanshan-1-01'] = true;
ST.saveGame();   // 先把内存状态落到 localStorage（exportText 读的是已落盘的档，不是当前内存）
const t1 = ST.exportSaveText();
ST.resetToDefault();
ST.importSaveText(t1);
const s2 = ST.serializeSave();
const t2 = ST.exportSaveText();
ST.resetToDefault();
ST.importSaveText(t2);
const s3 = ST.serializeSave();
assert(canon(strip(s2)) === canon(strip(s3)), '存档 serialize→import→serialize 双往返幂等（无静默丢字段）');
assert(s2.shells === 12345, 'round-trip 保留贝币');
assert(s2.skills && s2.skills.qiaocai && s2.skills.qiaocai.level === 20, 'round-trip 保留技艺等级');
assert(s2.inventory && s2.inventory.gui === 7, 'round-trip 保留背包数量');
assert(s2.map && s2.map['nanshan-1-01'] === true, 'round-trip 保留已解锁地图节点');

section('合并：单调递增字段（技艺/著录/统计/养成/弹幕）取逐项较大值');
{
  const local  = { savedAt:1000, shells:100,
    skills:{ caiyao:{level:3,xp:5} },
    records:{ gui:{tier:2,count:10} },
    stats:{ bossKills:{ zaochi:2 }, gathers:10 },
    grow:{ a:{stage:1,done:2} },
    danmu:{ stage:1, done:3 } };
  const remote = { savedAt:2000, shells:200,
    skills:{ caiyao:{level:8,xp:2}, qiaocai:{level:2,xp:0} },
    records:{ gui:{tier:3,count:5}, yu:{tier:1,count:3} },
    stats:{ bossKills:{ luwu:1 }, gathers:20, hunts:5 },
    grow:{ a:{stage:3,done:1}, b:{stage:1,done:1} },
    danmu:{ stage:2, done:1 } };
  const m = ST.mergeSaveData(local, remote);
  assert(m.skills.caiyao.level === 8, 'skills.level 取较大值（与哪侧较新无关）');
  assert(m.skills.caiyao.xp === 5, 'skills.xp 取较大值');
  assert(m.skills.qiaocai && m.skills.qiaocai.level === 2, 'skills 并集：对方独有项保留');
  assert(m.records.gui.tier === 3 && m.records.gui.count === 10, 'records 逐项取最大（tier 取大、count 取大）');
  assert(m.records.yu && m.records.yu.count === 3, 'records 并集：对方独有项保留');
  assert(m.stats.bossKills.zaochi === 2 && m.stats.bossKills.luwu === 1, 'stats 嵌套对象（bossKills）取并集');
  assert(m.stats.gathers === 20 && m.stats.hunts === 5, 'stats 标量取较大值 + 并集对方键');
  assert(m.grow.a.stage === 3 && m.grow.a.done === 2, 'grow 逐项取最大');
  assert(m.grow.b && m.grow.b.stage === 1, 'grow 并集：对方独有项保留');
  assert(m.danmu.stage === 2 && m.danmu.done === 3, 'danmu 逐项取最大');
}

section('合并：布尔集合（地图/印/观象/营造/免疫）取并集，不丢已达成');
{
  const local  = { savedAt:1000,
    map:{ 'nanshan-1-01':true }, seals:{'a':1}, observed:{'x':true},
    buildings:{'b':1}, omenImmune:{'o':true} };
  const remote = { savedAt:2000,
    map:{ 'nanshan-1-02':true }, seals:{'c':1}, observed:{'y':true},
    buildings:{'d':1}, omenImmune:{'p':true} };
  const m = ST.mergeSaveData(local, remote);
  assert(m.map['nanshan-1-01'] && m.map['nanshan-1-02'], 'map 取并集（两端各自解锁的山都留下）');
  assert(m.seals.a && m.seals.c, 'seals（录毕之印）取并集');
  assert(m.observed.x && m.observed.y, 'observed（已观象）取并集');
  assert(m.buildings.b && m.buildings.d, 'buildings（已营造）取并集');
  assert(m.omenImmune.o && m.omenImmune.p, 'omenImmune（免疫）取并集');
}

section('合并：物品数量（行囊/仓廪）逐项取较大值');
{
  const local  = { savedAt:1000, inventory:{ gui:5, tan:2 }, banking:{ jin:3 } };
  const remote = { savedAt:2000, inventory:{ gui:9, zhenwu:1 }, banking:{ jin:1, yin:2 } };
  const m = ST.mergeSaveData(local, remote);
  assert(m.inventory.gui === 9, 'inventory 同物取较大值');
  assert(m.inventory.tan === 2 && m.inventory.zhenwu === 1, 'inventory 并集：各自独有项保留');
  assert(m.banking.jin === 3 && m.banking.yin === 2, 'banking 逐项取大 + 并集');
}

section('合并：贝币与顶层标量取「较新一档」（绝不求和，否则凭空造钱）');
{
  let m = ST.mergeSaveData({ savedAt:1000, shells:100, nickname:'甲' }, { savedAt:2000, shells:500, nickname:'乙' });
  assert(m.shells === 500, '贝币取较新一档：远端更新 → 取远端（非求和 600）');
  assert(m.nickname === '乙', '顶层标量（昵称）取较新一档');

  m = ST.mergeSaveData({ savedAt:3000, shells:700, nickname:'丙' }, { savedAt:2000, shells:500, nickname:'丁' });
  assert(m.shells === 700, '贝币取较新一档：本地更新 → 取本地');

  // savedAt 缺失按 0 计；rt >= lt（0>=0）为真，故无时间戳的远端被视作「较新」。
  m = ST.mergeSaveData({ shells:100 }, { shells:50 });
  assert(m.shells === 50, 'savedAt 双缺省（均视为 0）→ 远端判定较新，取远端');

  // 本地有 savedAt、远端无：local 较新（rt=0 < lt）。
  m = ST.mergeSaveData({ savedAt:1000, shells:100 }, { shells:50 });
  assert(m.shells === 100, '本地有 savedAt、远端缺省 → 本地较新，取本地');
}

section('合并：单边为空直接返回另一边（不抛错、不造默认壳）');
{
  const only = { savedAt:1, shells:42, inventory:{ x:1 }, skills:{ caiyao:{level:2,xp:0} } };
  assert(ST.mergeSaveData(null, only) === only, 'local 为空 → 原样返回 remote 引用');
  assert(ST.mergeSaveData(only, null) === only, 'remote 为空 → 原样返回 local 引用');
}

console.log(`\n存档/合并语义测试：${pass} 通过 / ${fail} 失败`);
if (fail) process.exitCode = 1;
