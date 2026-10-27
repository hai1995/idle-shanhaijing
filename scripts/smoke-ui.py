#!/usr/bin/env python3
"""真实浏览器里的界面体检（可选，非 check.js 的一环）。

静态测试（test/engine.test.js）只能证明「渲染函数不抛、产出的 HTML 里有什么」，
证明不了：真实 Chromium 里样式是否生效、昼夜 token 是否真的换了、窄屏有没有横向溢出。
这个脚本补的就是这一层。

用法：
    python3 scripts/smoke-ui.py                 # 跑默认体检（桌面 + 窄屏 + 昼夜）
    python3 scripts/smoke-ui.py --out /tmp/shot  # 顺带把截图存到指定目录
    python3 scripts/smoke-ui.py --file idle-shanhaijing-standalone.html

依赖 playwright（`pip3 install playwright && playwright install chromium`）。
没装就直接退出（返回 0），不挡日常开发——它不是 CI 的必过项。
"""
import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABS = ['yudi', 'skills', 'taofa', 'codex', 'pack', 'stats',
        'queue', 'settings', 'about', 'jisi', 'yushi', 'ying', 'shichan']

# file:// 下拿不到 version.json（版本自检那条 fetch 必然失败），属于协议限制，不是缺陷
IGNORE = ('version.json', 'URL scheme "file" is not supported')

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print('未安装 playwright，跳过界面体检（pip3 install playwright && playwright install chromium）')
    sys.exit(0)


def probe(pg):
    """抓一批「能证明改动生效」的计算样式"""
    return pg.evaluate("""() => {
      const cs = (el) => el ? getComputedStyle(el) : null;
      const root = getComputedStyle(document.documentElement);
      const g = (n) => root.getPropertyValue(n).trim();
      const q = (s) => document.querySelector(s);
      const stat = q('#topbar .stat'), prog = q('#actionProg'), tab = q('#tabs .tab');
      return {
        theme: document.documentElement.dataset.theme || 'day',
        paper: g('--paper'), r: g('--r'), zhuLine: g('--zhu-line'),
        sky: g('--sc-sky'),
        bodyImage: cs(document.body).backgroundImage.slice(0, 32),
        statRadius: stat ? cs(stat).borderRadius : null,
        progHeight: prog ? cs(prog).height : null,
        tabRadius: tab ? cs(tab).borderRadius : null,
      };
    }""")


def overflow(pg):
    """整页横向溢出量（>1px 视为出问题）"""
    return pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")


# 文字被盒子切掉：只看叶子节点、只量文字本身（Range 不含伪元素）。
# 判据必须是「量文字」而不是 scrollWidth > clientWidth——后者会把带「扩大命中区」
# 伪元素的小钮（手机上指尖点得准，靠 ::after 外扩）全部误报成截断（v1.31.159 踩过）。
JS_CLIP = """() => {
  const out = [];
  document.querySelectorAll('#app *').forEach(el => {
    if (el.children.length) return;
    const cs = getComputedStyle(el);
    if (cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis') return;   // 有省略号是有意为之
    if (!el.firstChild || el.firstChild.nodeType !== 3) return;
    const r = document.createRange(); r.selectNodeContents(el);
    const tw = r.getBoundingClientRect().width;
    if (el.clientWidth > 0 && tw > el.clientWidth + 1) {
      const t = (el.textContent || '').trim().slice(0, 20);
      out.push((el.className ? '.' + String(el.className).split(' ')[0] : el.tagName) + '「' + t + '」');
    }
  });
  return [...new Set(out)].slice(0, 5);
}"""


# 夜间模式的「漏网亮块」：凡是夜间还在用固定浅色的大块元素，都会被这一条逮住
# （v1.31.163 抓到 input[type=range] 的 Chromium 默认白底）。
# .chip-btn 的青色是「选中态」，有意的高亮，进白名单。
BRIGHT_OK = ('.chip-btn',)
JS_BRIGHT = r"""() => {
  const lum = (c) => {
    const m = c.match(/[\d.]+/g); if (!m) return null;
    const [r,g,b,a] = m.map(Number);
    if (a !== undefined && a < 0.15) return null;
    return (0.299*r + 0.587*g + 0.114*b) / 255;
  };
  const out = [];
  document.querySelectorAll('#app *, #topbar *, #tabs *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.width * r.height < 400) return;
    const bg = lum(cs.backgroundColor);
    if (bg === null || bg <= 0.72) return;
    let sel = el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '');
    if (%s.some(k => sel.indexOf(k) >= 0)) return;
    out.push(sel + ' ' + cs.backgroundColor + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  return [...new Set(out)].slice(0, 6);
}""" % (list(BRIGHT_OK),)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', default='idle-shanhaijing-standalone.html', help='要体检的页面（相对仓库根）')
    ap.add_argument('--out', default=None, help='截图输出目录；不填则不存图')
    args = ap.parse_args()

    url = 'file://' + os.path.join(ROOT, args.file)
    fails, errs = [], []

    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        pg = b.new_page(viewport={'width': 1280, 'height': 900})
        pg.on('console', lambda m: errs.append('CONSOLE: ' + m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: ' + str(e)))
        pg.goto(url)
        pg.wait_for_timeout(1200)

        # 1) 逐页切换：任一页渲染抛错都会落进 errs
        for t in TABS:
            pg.evaluate("t => UI.switchTab(t)", t)
            pg.wait_for_timeout(70)
        print(f'· 切页 {len(TABS)} 个，无中断')

        # 2) 起一个行动，验证状态条 / 现场 / 停止钮同时在
        pg.evaluate("""() => {
          try { UI.switchTab('yudi'); } catch(e) {}
          try { startActivity('gather', 'gui', { times: 5 }); } catch(e) {}
          UI.refreshActivity && UI.refreshActivity();
        }""")
        pg.wait_for_timeout(500)
        act = pg.inner_text('#activityText')
        kids = pg.evaluate("document.getElementById('sceneBar').children.length")
        print(f'· 起行动后：状态条=「{act}」 现场子节点={kids}')
        if '空闲' in act:
            fails.append('起了采集，状态条仍显示空闲')
        if kids < 2:
            fails.append(f'现场容器内应同时有状态条与画面，实得 {kids} 个子节点')

        # 3) 队列芯片：循环轮次
        chip = pg.evaluate("""() => {
          try {
            Game.queue = [{ id:'t1', kind:'qiaocai', target:'gui', qty:5, done:0 }];
            Game.queueIdx = 0; Game.queueRunning = true; Game.queueLoop = true; Game.queueRound = 1;
            UI.patchQueueChip();
            return document.getElementById('queueChip').textContent;
          } catch(e) { return 'ERR: ' + e; }
        }""")
        print(f'· 队列芯片：「{chip}」')
        if '第 2 轮' not in chip:
            fails.append('循环模式下芯片未标出轮次：' + chip)

        day = probe(pg)
        if args.out:
            os.makedirs(args.out, exist_ok=True)
            pg.screenshot(path=os.path.join(args.out, 'day.png'))

        # 4) 夜间：token 与星空是否真的换了
        pg.evaluate("() => { try { setTheme('night'); } catch(e) { applyTheme && applyTheme('night'); } }")
        pg.wait_for_timeout(400)
        night = probe(pg)
        print(f'· 日间 {day}')
        print(f'· 夜间 {night}')
        if night['theme'] != 'night' or night['paper'].upper() != '#12151C':
            fails.append('夜间基底未切到深蓝黑：' + str(night['paper']))
        if 'radial-gradient' not in night['bodyImage']:
            fails.append('夜间星空未铺上：' + str(night['bodyImage']))
        if day['r'] != '8px' or night['r'] != '8px':
            fails.append('全局圆角 --r 不是 8px：' + str(day['r']))
        if day['zhuLine'] == night['zhuLine']:
            fails.append('朱色描边 token 没随主题变化')
        if args.out:
            pg.screenshot(path=os.path.join(args.out, 'night.png'))

        # 4.5) 夜间漏网亮块：逐页扫一遍（只在夜间主题下有意义，故放在切回日间之前）
        bright = []
        for t in TABS:
            pg.evaluate("t => UI.switchTab(t)", t)
            pg.wait_for_timeout(80)
            for hit in pg.evaluate(JS_BRIGHT):
                bright.append(f'{t}: {hit}')
        print('· 夜间漏网亮块扫描完毕' + ('：' + ' | '.join(bright[:4]) if bright else '（无）'))
        if bright:
            fails.append('夜间仍有固定浅色块：' + ' | '.join(bright[:4]))

        # 5) 窄屏：逐页查横向溢出（简洁化改动最容易在这里翻车）
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.evaluate("() => { try { setTheme('day'); } catch(e) {} }")
        pg.wait_for_timeout(300)
        clipped = []
        for t in TABS:
            pg.evaluate("t => UI.switchTab(t)", t)
            pg.wait_for_timeout(120)
            ov = overflow(pg)
            if ov > 1:
                fails.append(f'窄屏「{t}」页横向溢出 {ov}px')
            for c in pg.evaluate(JS_CLIP):
                clipped.append(f'{t}: {c}')
        print(f'· 窄屏（390px）{len(TABS)} 页横向溢出检查完毕')
        if clipped:
            fails.append('文字被盒子切掉：' + ' | '.join(clipped[:5]))
        else:
            print('· 窄屏无文字截断（按文字实宽判定，排除命中区伪元素）')

        # 6) 窄屏弧度：曾有一条 !important 把所有控件压成近直角（v1.31.158 修掉）
        #    静态测试看不见它，手机上却是「简洁化完全没生效」的元凶。
        pg.evaluate("() => UI.switchTab('pack')")
        pg.wait_for_timeout(200)
        rad = pg.evaluate("""() => {
          const r = (s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).borderRadius : null; };
          return { btn: r('.btn'), tile: r('.tile'), tab: r('#tabs .tab'), chip: r('.chip-btn') };
        }""")
        print(f'· 窄屏弧度：{rad}')
        for k, v in rad.items():
            if v and v not in ('6px', None):
                fails.append(f'窄屏 {k} 弧度应为 6px，实为 {v}')
        if args.out:
            pg.screenshot(path=os.path.join(args.out, 'narrow.png'))
        b.close()

    real = [e for e in errs if not any(k in e for k in IGNORE)]
    if real:
        fails.append('控制台 / 页面错误：' + ' | '.join(real[:3]))

    print()
    if fails:
        print('体检未通过：')
        for f in fails:
            print('  ✗ ' + f)
        sys.exit(1)
    print('✓ 界面体检全部通过（无脚本错误、主题生效、窄屏无溢出）')
    if errs:
        print('  （已忽略 file:// 协议导致的 ' + str(len(errs) - len(real)) + ' 条版本自检告警）')


if __name__ == '__main__':
    main()
