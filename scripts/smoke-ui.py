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

        # 5) 窄屏：逐页查横向溢出（简洁化改动最容易在这里翻车）
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.evaluate("() => { try { setTheme('day'); } catch(e) {} }")
        pg.wait_for_timeout(300)
        for t in TABS:
            pg.evaluate("t => UI.switchTab(t)", t)
            pg.wait_for_timeout(120)
            ov = overflow(pg)
            if ov > 1:
                fails.append(f'窄屏「{t}」页横向溢出 {ov}px')
        print(f'· 窄屏（390px）{len(TABS)} 页横向溢出检查完毕')
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
