#!/usr/bin/env node
// 把多文件版（index.html + style.css + src/*.js）内联为单文件 standalone.html
// 用法：node scripts/build-standalone.js
//
// ⚠️ 脚本顺序只从 index.html 读，不在这里另抄一份清单。
// 这里原本硬编码了一个 order 数组，漏掉了 zhongshanData.js——于是单文件版
// 少了整个中山经（14 系 250 山、图鉴 831，而多文件版是 26 系 447 山、图鉴 1122），
// 而两边都能正常启动，谁也没发现。两份清单迟早走岔，索性只留一份。
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function scriptOrder(){
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="src\/([^"]+)"><\/script>/g)].map(m => m[1]);
}

function build(){
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const order = scriptOrder();
  if (!order.length) throw new Error('index.html 里没有引用任何 src/*.js');

  const scripts = order.map(f => '// ===== ' + f + ' =====\n' +
    fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');

  let out = html
    .replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
    .replace(/\s*<script src="src\/[^"]+"><\/script>/g, '');
  out = out.replace('</body>', '<script>\n' + scripts + '\n</script>\n</body>');

  // 构建后自检：每个文件都得留下自己的横幅。少一个当场失败，
  // 不留「能跑但缺内容」的产物。
  const missing = order.filter(f => !out.includes('// ===== ' + f + ' ====='));
  if (missing.length) throw new Error('单文件版缺少：' + missing.join('、'));

  const outPath = path.join(root, 'idle-shanhaijing-standalone.html');
  fs.writeFileSync(outPath, out);
  return { order, size: fs.statSync(outPath).size };
}

if (require.main === module){
  try {
    const { order, size } = build();
    console.log('standalone rebuilt: ' + (size / 1024).toFixed(1) + ' KB（' + order.length + ' 个脚本）');
  } catch (e){
    console.error('构建失败：' + e.message);
    process.exit(1);
  }
}

module.exports = { scriptOrder, build };
