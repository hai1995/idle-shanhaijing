#!/usr/bin/env node
// 把多文件版（index.html + style.css + src/*.js）内联为单文件 standalone.html
// 用法：node scripts/build-standalone.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const order = ['nanshanData.js','xishanData.js','beishanData.js','dongshanData.js',
  'gameData.js','save.js','engine.js','game.js','queue.js','beastIcon.js','riteIcon.js','interact.js','fx.js','ui.js'];
const scripts = order.map(f => '// ===== ' + f + ' =====\n' +
  fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');

let out = html
  .replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
  .replace(/\s*<script src="src\/[^"]+"><\/script>/g, '');
out = out.replace('</body>', '<script>\n' + scripts + '\n</script>\n</body>');
fs.writeFileSync(path.join(root, 'idle-shanhaijing-standalone.html'), out);
console.log('standalone rebuilt: ' + (fs.statSync(path.join(root, 'idle-shanhaijing-standalone.html')).size/1024).toFixed(1) + ' KB');
