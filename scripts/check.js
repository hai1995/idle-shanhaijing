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
// --full：额外跑一轮随机动作压测。默认不跑（多 2 秒），但改过引擎 / 拆分过文件时值得跑。
if (process.argv.includes('--full')){
  step('随机动作压测（500 轮）', () => run(path.join('scripts', 'fuzz.js'), ['500']));
}
step('数据审计', () => run(path.join('scripts', 'audit-data.js')));
step('单文件版构建', () => run(path.join('scripts', 'build-standalone.js')));

const total = ((Date.now() - t0) / 1000).toFixed(1);
if (failed){
  console.log(`\n✗ ${failed} 步未通过（${total}s）`);
  process.exit(1);
}
console.log(`\n✓ 全部通过（${total}s）`);
