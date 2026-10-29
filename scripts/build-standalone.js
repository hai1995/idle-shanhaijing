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
  // 允许 src 带 ?v= 版本串（index.html 用它绕开 GitHub Pages 的静态缓存）
  return [...html.matchAll(/<script src="src\/([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m => m[1]);
}
// 延后加载清单（v1.31.200）：多文件版由 ui/boot.js 在首屏之后注入，
// 单文件版没有「之后」可言——整包都在一个文件里，这些也得内联进来。
// 清单只认 index.html 里那一份，不在这里另抄。
function deferredOrder(){
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const m = html.match(/<script id="shjDeferred" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return [];
  try { const a = JSON.parse(m[1]); return Array.isArray(a) ? a : []; }
  catch(e){ throw new Error('延后清单解析失败：' + e.message); }
}

// CSS 里 url("assets/xxx") 指向的外部资源（罕用字子集字体）：
// 单文件版必须内联，否则换台机器打开就是豆腐块。只处理 assets/ 下的字体，
// 别的一律不动——顺手内联图片会把产物撑到几十兆。
function inlineAssets(css){
  return css.replace(/url\((["']?)(assets\/[^)"']+)\1\)/g, (m, q, rel) => {
    const fp = path.join(root, rel);
    if (!fs.existsSync(fp)) throw new Error('CSS 引用的资源不存在：' + rel);
    const ext = path.extname(rel).toLowerCase();
    const mime = ext === '.woff2' ? 'font/woff2'
      : ext === '.woff' ? 'font/woff'
      : ext === '.ttf' ? 'font/ttf'
      : ext === '.png' ? 'image/png'
      : ext === '.svg' ? 'image/svg+xml'
      : 'application/octet-stream';
    const b64 = fs.readFileSync(fp).toString('base64');
    return `url("data:${mime};base64,${b64}")`;
  });
}

function build(){
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = inlineAssets(fs.readFileSync(path.join(root, 'style.css'), 'utf8'));
  const order = scriptOrder();
  if (!order.length) throw new Error('index.html 里没有引用任何 src/*.js');

  const deferred = deferredOrder();
  const bundle = (list) => list.map(f => '// ===== ' + f + ' =====\n' +
    fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
  const scripts = bundle(order);
  // 延后的那几份另起一个 <script> 块、排在后面：它们按「抵达即登记」的写法编的
  // （window.XISHAN = …; if (SHJ_LOAD_CHAPTER) …），此时 gameData 早已在上方跑完，
  // 与多文件版的后台注入等价。
  const deferredScripts = bundle(deferred);

  let out = html
    // 样式表那条 link 可能带 media / onload（多文件版靠它不阻塞首屏），一律整条换掉
    .replace(/<link rel="stylesheet" href="style\.css(?:\?[^"]*)?"[^>]*>/, '<style>\n' + css + '\n</style>')
    // 单文件版 CSS 已内联，没有「等样式表」这回事：骨架的隐藏态要一并撤掉
    .replace('<html lang="zh-CN" class="css-boot">', '<html lang="zh-CN">')
    .replace(/\s*<script src="src\/[^"]+"><\/script>/g, '')
    // 延后清单一并撤掉：内容已经内联在下面，留着会让 boot.js 再去 fetch 一遍 src/*.js（必然 404）
    .replace(/\s*<script id="shjDeferred" type="application\/json">[\s\S]*?<\/script>/, '');
  out = out.replace('</body>', '<script>\n' + scripts + '\n</script>\n'
    + (deferredScripts ? '<script>\n' + deferredScripts + '\n</script>\n' : '') + '</body>');

  // 构建后自检：每个文件都得留下自己的横幅。少一个当场失败，
  // 不留「能跑但缺内容」的产物。
  const missing = order.concat(deferred).filter(f => !out.includes('// ===== ' + f + ' ====='));
  if (missing.length) throw new Error('单文件版缺少：' + missing.join('、'));
  // 内联自检：还留着 assets/ 引用就说明字体没进产物，换台机器就是豆腐圈
  if (/url\(["']?assets\//.test(out)) throw new Error('单文件版仍有未内联的 assets/ 资源');

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

module.exports = { scriptOrder, deferredOrder, build };
