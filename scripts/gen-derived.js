#!/usr/bin/env node
// 构建期预计算 + 等价性校验（数据按需加载 v1.31.200）
// 1) 跑「全 5 章 + gameData」得基准派生表 → 写出 src/derivedData.js（运行期后台加载）
// 2) 校验：全图现算 == 仅南山 + 覆盖；且 仅南山(无覆盖) != 全图（证明覆盖必要且完整）
// 本脚本仅用于构建 / CI，不在运行期执行。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const src = (p) => path.join(root, 'src', p);

// ---- 最小 shim：gameData.js 加载期只定义常量、跑若干 IIFE、挂 window.*，不触碰 DOM/UI ----
function makeCtx(loadDerived){
  const document = {
    body: { classList: { add(){}, remove(){}, toggle(){}, contains: () => false } },
    getElementById: () => ({ textContent:'', innerHTML:'', classList:{add(){},remove(){},toggle(){}}, appendChild(){}, addEventListener(){}, style:{}, querySelector:()=>null, querySelectorAll:()=>[], value:'', checked:false, dataset:{} }),
    querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ className:'', textContent:'', style:{}, remove(){}, classList:{add(){},remove(){}} }),
    addEventListener(){},
  };
  const window = {
    Math, JSON, Date, console, document, location: { href: 'x' },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  };
  window.window = window;
  const context = {
    window, document, localStorage: window.localStorage, console, Math, JSON, Date,
    setInterval: () => 0, setTimeout: () => 0, clearInterval: () => {}, clearTimeout: () => {},
    getComputedStyle: () => ({}), Game: {},
  };
  const ctx = vm.createContext(context);
  return { ctx, window };
}

// 加载指定章（模拟同步加载；章文件若是 SHJ_LOAD_CHAPTER 条件形式则走 fallback window.X = {...}）
function loadChapters(ctxObj, names){
  for (const n of names){
    const f = { nanshan:'nanshanData.js', xishan:'xishanData.js', beishan:'beishanData.js', dongshan:'dongshanData.js', zhongshan:'zhongshanData.js' }[n];
    vm.runInContext(fs.readFileSync(src(f), 'utf8'), ctxObj.ctx, { filename: f });
  }
}
function loadGame(ctxObj){
  vm.runInContext(fs.readFileSync(src('gameData.js'), 'utf8'), ctxObj.ctx, { filename: 'gameData.js' });
}

// _omenLinks：征兆挂接计数（linkOmens 在加载期按「当时可见的 Monsters」统计，章不全时会偏小）
// ——它本身不是表，但跟着 Monsters 走，必须一并下发，否则诊断数在章抵达后仍是南山口径。
// 只发「现算算不出来」的那几张：CODEX / CODEX_ACHIEVEMENTS / ITEM_REGION / ORDER_POOL
// 是世界补齐后调用一次就有的（gameData 的 rebuildDerived），随包发一份纯属重复传输。
const DERIVED_KEYS = ['Items','Monsters','OMENS','OBSERVE_SITES','AUDIENCE_SITES','GATHER_POOLS','Milestones','_omenLinks'];
function extract(win){
  const out = {};
  for (const k of DERIVED_KEYS){
    let v = win[k];
    if (k === 'Milestones'){
      v = v.map((m) => { const c = {}; for (const kk of Object.keys(m)) if (typeof m[kk] !== 'function') c[kk] = m[kk]; return c; });
    }
    out[k] = v;
  }
  return out;
}
const sig = (o) => JSON.stringify(o);

// ---- 全量快照：不止上面 11 张表，凡是挂在 window 上的非函数值都纳入比对 ----
// 特许差异：WORLD 与章节原始全局（那正是被延后加载的东西，抵达后由 boot 补齐）。
const ALLOW_DIFF = new Set(['WORLD','NANSHAN','XISHAN','BEISHAN','DONGSHAN','ZHONGSHAN','__SHJ_DERIVED__']);
function snapshot(win){
  const out = {};
  for (const k of Object.keys(win)){
    if (k === 'window' || k === 'Math' || k === 'JSON' || k === 'Date' || k === 'console') continue;
    if (k === 'document' || k === 'localStorage' || k === 'location') continue;
    let v = win[k];
    if (typeof v === 'function' || typeof v === 'undefined') continue;
    if (k === 'Milestones' && Array.isArray(v))
      v = v.map((m) => { const c = {}; for (const kk of Object.keys(m)) if (typeof m[kk] !== 'function') c[kk] = m[kk]; return c; });
    out[k] = v;
  }
  return out;
}
// 返回 [差异键列表]
function diffKeys(a, b){
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const bad = [];
  for (const k of keys){
    if (sig(a[k]) !== sig(b[k])) bad.push(k);
  }
  return bad;
}

const CHECK = process.argv.includes('--check');

// ---- 词法层快照：顶层 const 未必挂 window（NS_OBSERVE 就是一个）----
// 只比 window 会漏掉它们；但同一 context 里后续脚本读得到先前的顶层 const，直接求值即可。
function lexicalNames(){
  const s = fs.readFileSync(src('gameData.js'), 'utf8');
  return [...s.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(m => m[1]);
}
function lexicalSnapshot(ctxObj, names){
  const out = {};
  for (const n of names){
    let v;
    try { v = vm.runInContext('(typeof ' + n + ' === "function") ? null : (' + n + ')', ctxObj.ctx); }
    catch(e){ continue; }
    if (v === null || typeof v === 'undefined') continue;
    try { out[n] = JSON.parse(JSON.stringify(v)); } catch(e){ out[n] = String(v); }
  }
  return out;
}

// ---- 1) 基准：全 5 章现算 ----
var FULL_CTX;
{
  const c = makeCtx();
  loadChapters(c, ['nanshan','xishan','beishan','dongshan','zhongshan']);
  loadGame(c);
  var BASELINE = extract(c.window);
  var SNAP_FULL = snapshot(c.window);
  FULL_CTX = c;
}
// ---- 1.5) --check：现存的 src/derivedData.js 必须与「全图现算」逐字节一致 ----
// 这是本方案的生命线：派生逻辑改了却忘了重算，产物就会静默落后——
// 游戏照常跑，只是二至五章的物产等级、图鉴、采集池全是旧数，谁也看不出来。
if (CHECK){
  const p = src('derivedData.js');
  if (!fs.existsSync(p)){
    console.error('FAIL: 缺少 src/derivedData.js（先跑 node scripts/gen-derived.js）');
    process.exit(1);
  }
  const s = fs.readFileSync(p, 'utf8');
  const head = 'window.__SHJ_DERIVED__ = ';
  const i = s.indexOf(head);
  const j = i < 0 ? -1 : s.indexOf(';\n', i + head.length);
  if (j < 0){
    console.error('FAIL: src/derivedData.js 格式不对（认不出 window.__SHJ_DERIVED__ = …;）');
    process.exit(1);
  }
  let cur = null;
  try { cur = JSON.parse(s.slice(i + head.length, j)); }
  catch(e){ console.error('FAIL: src/derivedData.js 不是合法 JSON：' + e.message); process.exit(1); }
  if (sig(cur) !== sig(BASELINE)){
    console.error('FAIL: src/derivedData.js 与当前派生逻辑不一致（改了 gameData 却没重算）');
    console.error('      跑 `node scripts/gen-derived.js` 重新生成');
    process.exit(1);
  }
}
// ---- 2) 仅南山（无覆盖）：必须 != 基准，证明覆盖必要 ----
{
  const c = makeCtx();
  loadChapters(c, ['nanshan']);
  loadGame(c);
  const partial = extract(c.window);
  if (sig(BASELINE) === sig(partial)){
    console.error('FAIL: 仅南山现算竟与全图一致——覆盖并非必要，方案前提错误');
    process.exit(1);
  }
}
// ---- 3) 延后加载的两种到达顺序：都必须收敛到「全图现算」 ----
// 五份延后文件是并行下载的，谁先到不一定：派生表先到（覆盖时世界还只有南山）、
// 或章数据先到（乱序抵达）。两条路都得收敛到同一个结果，否则玩家看到的书取决于网速。
const DERIVED_SRC = 'window.__SHJ_DERIVED__ = ' + JSON.stringify(BASELINE) + ';\n' +
  'if (window.SHJ_LOAD_DERIVED) window.SHJ_LOAD_DERIVED(window.__SHJ_DERIVED__);\n';
function runLazy(order){
  const c = makeCtx();
  loadChapters(c, ['nanshan']);
  loadGame(c);
  for (const item of order){
    if (item === 'derived'){
      vm.runInContext(DERIVED_SRC, c.ctx, { filename: 'derivedData.js' });
    } else {
      loadChapters(c, [item]);
    }
  }
  return c;
}
const LAZY_ORDERS = [
  ['derived','zhongshan','dongshan','beishan','xishan'],   // 派生表先到，章倒序
  ['zhongshan','dongshan','beishan','xishan','derived'],   // 章先到（倒序），派生表压轴
];
const LEX_NAMES = lexicalNames();
const milestoneIds = JSON.parse(vm.runInContext('JSON.stringify(Milestones.map(m => m.id))', FULL_CTX.ctx));
for (const order of LAZY_ORDERS){
  const c = runLazy(order);
  const lazy = extract(c.window);
  if (sig(BASELINE) !== sig(lazy)){
    console.error('FAIL: 到达顺序 [' + order.join(' → ') + '] 的派生表 ≠ 全图现算——覆盖不完整');
    process.exit(1);
  }
  // 世界必须也补齐且卷次不乱：WORLD 这回不再豁免
  const bad = diffKeys(SNAP_FULL, snapshot(c.window)).filter((k) => k !== '__SHJ_DERIVED__');
  if (bad.length){
    console.error('FAIL: 到达顺序 [' + order.join(' → ') + '] 残留差异的全局：' + bad.join(', '));
    console.error('      （意味着派生表之外的某处也依赖全图，需要一并延后或预计算）');
    process.exit(1);
  }
  // 词法层：顶层 const 未必挂 window（NS_OBSERVE 就是一个），漏一个就是一处静默错
  const badLex = diffKeys(lexicalSnapshot(FULL_CTX, LEX_NAMES), lexicalSnapshot(c, LEX_NAMES));
  if (badLex.length){
    console.error('FAIL: 到达顺序 [' + order.join(' → ') + '] 残留差异的顶层常量：' + badLex.join(', '));
    process.exit(1);
  }
  // 里程碑的 prog 是闭包：加载期抓了快照的，覆盖之后也救不回来（xs_deity 就栽在这）。
  // 逐条在两个上下文里各跑一次 prog，结果必须一致。
  const progs = (ctxObj) => {
    const out = {};
    for (const id of milestoneIds){
      let r;
      try { r = JSON.stringify(vm.runInContext('Milestones.find(m => m.id === ' + JSON.stringify(id) + ').prog()', ctxObj.ctx)); }
      catch(e){ r = 'ERR:' + e.name; }
      out[id] = r;
    }
    return out;
  };
  const badProg = diffKeys(progs(FULL_CTX), progs(c));
  if (badProg.length){
    console.error('FAIL: 覆盖后里程碑进度仍不一致：' + badProg.join(', '));
    console.error('      （prog 在加载期抓了快照——改成调用时现算）');
    process.exit(1);
  }
  const wc = c.window.WORLD.regions.length;
  if (wc !== 26){
    console.error('FAIL: 到达顺序 [' + order.join(' → ') + '] 后 WORLD 只有 ' + wc + ' 系（应为 26）');
    process.exit(1);
  }
  if (c.window.__SHJ_DATA_READY__ !== true){
    console.error('FAIL: 到达顺序 [' + order.join(' → ') + '] 后 __SHJ_DATA_READY__ 未置位');
    process.exit(1);
  }
}
console.log('      ' + LEX_NAMES.length + ' 个顶层常量 + ' + milestoneIds.length + ' 条里程碑进度 + WORLD 卷次 + 就绪标志：两种到达顺序均一致');

if (CHECK){
  console.log('PASS: 派生表与当前派生逻辑一致（--check）');
  console.log('PASS: 覆盖完整（全图 == 仅南山+覆盖，且 != 仅南山）');
  process.exit(0);
}

// ---- 写出正式 derivedData.js（与上面同格式，触发后台抵达时覆盖）----
const payload = 'window.__SHJ_DERIVED__ = ' + JSON.stringify(BASELINE) + ';\n' +
  'if (window.SHJ_LOAD_DERIVED) window.SHJ_LOAD_DERIVED(window.__SHJ_DERIVED__);\n';
fs.writeFileSync(src('derivedData.js'), payload);
const raw = Buffer.byteLength(payload);
const gz = require('zlib').gzipSync(Buffer.from(payload)).length;
console.log('PASS: 覆盖完整（全图 == 仅南山+覆盖，且 != 仅南山）');
console.log('written src/derivedData.js  raw=' + raw + '  gz=' + gz + '  bytes');
