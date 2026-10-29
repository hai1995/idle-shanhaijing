#!/usr/bin/env node
// 一键自检：版本一致 → 引擎测试 → 数据审计 → 单文件版构建
// 用法：node scripts/check.js   （npm run check）
//
// 为什么要有这个：发布流程散在文档里，靠人记「先跑测试、再跑审计、再构建」，
// 总有一次漏掉某步。这里把四件事串成一条命令，任何一步失败即中止并给出退出码。
// 全程零依赖，只用 node 自带的 child_process。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

let failed = 0;
const t0 = Date.now();
const step = (label, fn) => {
  const t = Date.now();
  let ok = false, msg = '';
  try {
    const r = fn();
    if (typeof r === 'string'){ ok = true; msg = r; }   // 返回一句话也算通过（如版本号）
    else ok = r !== false;
  }
  catch (e) { ok = false; msg = e.message; }
  const cost = ((Date.now() - t) / 1000).toFixed(1);
  console.log(`${ok ? '✓' : '✗'} ${label}　${cost}s${msg ? '　' + msg : ''}`);
  if (!ok) failed++;
  return ok;
};
const run = (file, args) => {
  const r = spawnSync(process.execPath, [file, ...(args || [])], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0){
    const out = (r.stdout || '') + (r.stderr || '');
    throw new Error(out.split('\n').filter(l => /FAIL|❌|Error|问题/.test(l)).slice(0, 6).join(' | ') || ('退出码 ' + r.status));
  }
  return true;
};

// 1. 版本号只有两处：package.json 与 GAME_META。两处漂移时，页面底部显示的
//    「版本」与 npm 包版本会对不上，排查线上问题时最容易误导人。
step('版本一致（package.json = GAME_META）', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'gameData.js'), 'utf8');
  const m = /version:\s*'([0-9.]+)'/.exec(src);
  if (!m) throw new Error('gameData.js 里找不到 version');
  if (m[1] !== pkg.version) throw new Error(`package.json ${pkg.version} ≠ GAME_META ${m[1]}`);
  return 'v' + m[1];
});

// 1.5 资源版本号：index.html 的 ?v= 与 version.json 都要跟 package.json 一致。
//     前者决定「今天改的东西用户能不能拿到」，后者决定「旧的 index.html 会不会提示刷新」。
step('资源版本号（version.json）', () => {
  const v = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).version;
  if (v !== pkg.version) throw new Error(`version.json ${v} ≠ package.json ${pkg.version}`);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const bad = [...html.matchAll(/\?v=([0-9.]+)/g)].map(m => m[1]).filter(v2 => v2 !== pkg.version);
  if (bad.length) throw new Error(`index.html 里有 ${bad.length} 处 ?v= 与版本不符（如 ${bad[0]}）`);
  return 'v' + v;
});

step('引擎测试', () => run(path.join('test', 'engine.test.js')));
// 1.4 存档 / 多端合并语义（确定性）：随机压测（fuzz）只能证明「不崩 / 不 NaN」，
// 证不了「合并取大还是取并集 / 贝币取较新一档还是求和」这类精确方向规则。
// 这份测试用精确断言钉死 serialize→import→serialize 往返幂等 + mergeSaveData 各字段的
// 取大 / 并集 / 较新档规则，改 save.js 合并逻辑时立刻卡住。纯断言、零依赖、开销 < 0.5s。
step('存档/合并语义（确定性）', () => run(path.join('test', 'save-merge.test.js')));
// 1.4b 最危险状态跃迁（确定性）：转生(doRebirth·全局重置)/装备淬炼(enhanceItem·成败俱毁)/
// 词条重铸(reforgeItem)/廛市买卖(buyItem·bulkSell) 这几条一次性改动大片状态且直接动贝币背包账目。
// 随机压测证不了「淬炼确实扣炭+贝币且等级+1」「转生后全状态仍有限非负（不蹦 NaN）」
// 「买卖账目借贷平衡」。这份测试用精确断言钉死，改对应逻辑时立刻卡住。纯断言、零依赖。
step('状态跃迁语义（确定性）', () => run(path.join('test', 'transitions.test.js')));
// 1.6 随机动作压测（基线）：项目自述把「fuzz 零异常」当发布底线，但此前只在 --full 才跑，
// 默认闸门反而漏了——等于「发布底线」从没被提交前自动卡。这里在默认闸门也跑一轮
// 确定性压测：固定种子、可复现，不会随机红。引擎测试只走「想得到的路径」，fuzz 撞的是
// 真实玩家的随机组合；二者互补。开销约 2 秒（3 个固定种子各 1000 轮）。
const fuzzFile = path.join('scripts', 'fuzz.js');
const fuzzSeeds = (rounds, seeds) => { for (const s of seeds) run(fuzzFile, [String(rounds), String(s)]); return `${seeds.length} 种子 ×${rounds}`; };
step('随机动作压测（基线·确定性）', () => fuzzSeeds(1000, [20261026, 20261027, 20261028]));
// --full：多种子广覆盖（每个种子是不同但可复现的随机组合），改过引擎 / 拆分过文件时值得跑。
if (process.argv.includes('--full')){
  step('随机动作压测（广覆盖·多种子）', () => fuzzSeeds(2000, [20261026, 20261027, 20261028, 20261029, 20261030, 20261031]));
}
step('数据审计', () => run(path.join('scripts', 'audit-data.js')));
step('单文件版构建', () => run(path.join('scripts', 'build-standalone.js')));

// 1.8 单文件产物版本：.gitignore 写着「构建产物不入库」，但线上仓库里确实躺着
//     一份历史遗留的 idle-shanhaijing-standalone.html（有人收藏了直链）。产物一旦
//     落后，从那个链接打开的人拿到的是旧版，页面上还没有任何提示。
//     这里在每次构建后比对产物内的 GAME_META 版本，落后就报出来。
step('单文件产物版本（与 GAME_META 一致）', () => {
  const p = path.join(root, 'idle-shanhaijing-standalone.html');
  if (!fs.existsSync(p)) throw new Error('单文件产物不存在（先跑构建）');
  const out = fs.readFileSync(p, 'utf8');
  const m = /version:\s*'([0-9.]+)'/.exec(out);
  if (!m) throw new Error('单文件产物里找不到 version');
  if (m[1] !== pkg.version) throw new Error(`产物 v${m[1]} ≠ package.json ${pkg.version}（重新构建）`);
  // 抽查一个当期特征串：只有版本号对、内容却没跟上时（比如手工改过产物）也能发现
  if (!out.includes('seasonTag')) throw new Error('产物缺少当期标记 seasonTag，内容不是最新源码');
  return 'v' + m[1] + ' ' + (fs.statSync(p).size / 1024).toFixed(0) + ' KB';
});

// 2. 页面巡检（真浏览器）。默认**不跑**：它要 python + playwright + 一个本地端口，
//    克隆仓库的人未必有；缺环境时跳过而不是报错，免得一上来就红。
//    加 --patrol 才跑，且要求本地已在 8899 端口起了静态服务。
if (process.argv.includes('--patrol')){
  step('页面巡检（页签 × 视口 × 状态）', () => {
    const py = spawnSync('python3', [path.join('scripts', 'patrol.py')], { cwd: root, encoding: 'utf8' });
    if (py.error) return true;                     // 没有 python3：跳过
    const out = (py.stdout || '') + (py.stderr || '');
    if (/ModuleNotFoundError/.test(out)) return true;   // 没装 playwright：跳过
    if (py.status !== 0){
      throw new Error(out.split('\n').filter(l => l.trim().startsWith('[')).slice(0, 4).join(' | ') || '退出码 ' + py.status);
    }
    return out.split('\n').find(l => l.includes('巡检')) || 'ok';
  });
}

const total = ((Date.now() - t0) / 1000).toFixed(1);
if (failed){
  console.log(`\n✗ ${failed} 步未通过（${total}s）`);
  process.exit(1);
}
console.log(`\n✓ 全部通过（${total}s）`);
