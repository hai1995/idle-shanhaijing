# 页面巡检：页签 × 视口 × 状态 的组合体检
#
# 用途：改完 UI 之后，把每个页签在两种视口下都过一遍，抓四类问题——
#   JS 错误 / 页签容器没渲染 / 内容为空 / 元素横向溢出视口。
#   `node test/engine.test.js` 跑的是引擎逻辑（vm 里没有真排版），
#   破版和运行时错误只有真浏览器能看见，两者分工不同。
#
# 用法：
#   python3 -m http.server 8899 &          # 在仓库根目录
#   python3 scripts/patrol.py              # 约 40 秒
#   需要：pip install playwright && playwright install webkit
#
# 输出：末行「巡检 N 组，坏 M 组」，坏的那组逐条列出；退出码 1 表示有坏组。
import asyncio
import os
import sys

from playwright.async_api import async_playwright

BASE = os.environ.get("PATROL_BASE", "http://localhost:8899/index.html")
TABS = ["yudi", "skills", "taofa", "yushi", "codex", "jisi", "pack", "queue", "stats"]
VIEWPORTS = [("390x844", 390, 844), ("320x568", 320, 568)]

PROBE = """(tab) => {
  const c = document.getElementById('content');
  const r = { tab, found: !!c };
  if (!c) return r;
  r.text = (c.innerText || '').trim().length;
  r.active = document.querySelectorAll('.tab.active').length;
  const w = document.documentElement.clientWidth;
  let wide = 0;
  c.querySelectorAll('*').forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.width > 0 && (b.right > w + 1 || b.left < -1)) wide++;
  });
  r.wide = wide;
  return r;
}"""

# 状态注入。每段都在页面里跑，跑完由下面的 STATE_PROBE 断言「真的生效了」。
# 「晚期」跑全部 9 个页签；另两种状态各抽查 3 个最容易受影响的页。
STATES = {
    "晚期": """Game.biyu = 8888; Game.xp = 90000;
      for (const k in Game.skills) Game.skills[k].level = Math.max(Game.skills[k].level||1, 30);
      try { saveGame(); } catch(e){}
      UI.refreshAll && UI.refreshAll();""",
    "夜间": """Game.stats.time = 3600 * 13;
      try { saveGame(); } catch(e){}
      UI.refreshAll && UI.refreshAll();""",
    "雨季": """(() => { const SEC = 6*3600;
        Game.stats.time = Math.floor(Game.stats.time / SEC) * SEC + SEC;
        if (typeof seasonPhase === 'function' && seasonPhase() !== 1) Game.stats.time += SEC;
      })();
      try { saveGame(); } catch(e){}
      UI.refreshAll && UI.refreshAll();""",
}
TABS_BY_STATE = {"晚期": TABS, "夜间": ["yudi", "stats", "codex"], "雨季": ["yudi", "stats", "codex"]}

# 断言「状态真的生效」。见 docs/TESTING.md 5.1：注入静默失效时，
# `UI.xxx && UI.xxx()` 这类写法会短路，页面不报错、巡检却什么都验到。
STATE_PROBE = """() => ({
  phase: (typeof seasonPhase === 'function') ? seasonPhase() : null,
  tag: (document.getElementById('seasonTag') || {}).textContent || '',
  wet: (() => { const e = document.getElementById('seasonTag'); return !!(e && e.classList.contains('wet')); })(),
  t: Game.stats.time | 0,
})"""


# 「改数据 → patchStats → 值必须变」。
# 为什么不满足于「静态渲染与 patch 两处一致」：如果 patch 里某个字段名写错，
# 它找不到元素就静默跳过，元素保留了静态渲染的值 —— 两者照样相等，
# 但玩家看到的数字永远不会更新。只有「真的改一次数据，看它动不动」才能抓到。
LIVE_PROBE = """() => {
  UI.currentTab = 'stats'; UI.renderStats();
  const snap = () => { const o = {}; document.querySelectorAll('[data-stat]').forEach(e => { o[e.dataset.stat] = e.textContent; }); return o; };
  const before = snap();
  Game.stats.kills += 7; Game.stats.deaths += 3; Game.stats.actions += 11;
  Game.stats.harvests += 5; Game.stats.crafts += 2; Game.stats.rites += 1;
  Game.stats.observes += 1; Game.stats.divines += 2; Game.stats.purchases += 4;
  Game.stats.sales += 3; Game.stats.damageDealt += 1000; Game.stats.damageTaken += 500;
  Game.stats.totalEarned += 2000; Game.shells += 333;
  Game.stats.offlineCount += 1; Game.stats.offlineSec += 600;
  Game.stats.offlineXp += 1234; Game.stats.offlineItems += 9;
  Game.stats.time += 100;
  UI.patchStats();
  const after = snap();
  // session / season 依赖真实时钟或「秒」边界，1 秒内本来就不该变，不列入
  const keys = ['kills','deaths','actions','harvests','crafts','rites','observes','divines',
                'purchases','sales','damageDealt','damageTaken','totalEarned','shells',
                'offlineCount','offlineSec','offlineXp','offlineItems','time'];
  const stuck = keys.filter(k => before[k] !== undefined && before[k] === after[k]);
  return { checked: keys.filter(k => before[k] !== undefined).length, stuck, total: Object.keys(before).length };
}"""


async def main():
    results, bad_state = [], []
    async with async_playwright() as p:
        b = await p.webkit.launch()
        for vname, w, h in VIEWPORTS:
            pg = await b.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
            await pg.goto(BASE)
            await pg.wait_for_timeout(1200)
            await pg.evaluate("try{ if (typeof tutSkip==='function') tutSkip(); }catch(e){}")

            for state, expr in STATES.items():
                if state != "晚期":
                    # 每种状态从干净基线起，免得上一种状态的改动掺进来
                    await pg.reload()
                    await pg.wait_for_timeout(1100)
                    await pg.evaluate("try{ if (typeof tutSkip==='function') tutSkip(); }catch(e){}")
                    await pg.evaluate("Game.biyu = 8888; Game.xp = 90000;" +
                                      "for (const k in Game.skills) Game.skills[k].level = Math.max(Game.skills[k].level||1, 30);")
                await pg.evaluate("() => {" + expr + "}")
                await pg.wait_for_timeout(320)

                st = await pg.evaluate(STATE_PROBE)
                if st["phase"] is not None:
                    want = "雨季" if st["phase"] == 1 else "旱季"
                    if st["tag"] != want or st["wet"] != (st["phase"] == 1):
                        bad_state.append(f"[{vname}/{state}] 状态未生效：phase={st['phase']} "
                                         f"顶栏='{st['tag']}' wet={st['wet']}（应为 {want}）")

                for t in TABS_BY_STATE[state]:
                    await pg.evaluate(f"UI.switchTab('{t}')")
                    await pg.wait_for_timeout(230)
                    r = await pg.evaluate(PROBE, t)
                    r["vp"], r["state"] = vname, state
                    results.append(r)

            # 数据联动（每个视口跑一次）：统计页的数字真的跟着数据走吗
            live = await pg.evaluate(LIVE_PROBE)
            results.append({"vp": vname, "live": live})
            results.append({"vp": vname, "errors": list(errs)})
            await pg.close()
        await b.close()

    bad = list(bad_state)
    n = 0
    for r in results:
        if "live" in r:
            lv = r["live"]
            n += 1
            if lv["checked"] < 15:
                bad.append(f"[{r['vp']}] 数据联动只验了 {lv['checked']} 个字段（字段缺失，不是空转）")
            if lv["stuck"]:
                bad.append(f"[{r['vp']}] 统计页有 {len(lv['stuck'])} 个字段改数据后不更新："
                           + "、".join(lv["stuck"][:5]))
            continue
        if "errors" in r:
            if r["errors"]:
                bad.append(f"[{r['vp']}] JS 错误 {len(r['errors'])}: {r['errors'][:2]}")
            continue
        n += 1
        tag = f"[{r['vp']}/{r['state']}] {r['tab']}"
        if not r["found"]:
            bad.append(tag + " 容器没找到")
        elif r["text"] < 20:
            bad.append(tag + f" 内容过少（{r['text']} 字）")
        elif r["wide"] > 0:
            bad.append(tag + f" 有 {r['wide']} 个元素溢出视口")
        elif r.get("active") != 1:
            bad.append(tag + f" 高亮页签数 = {r.get('active')}（应恰好 1）")

    print(f"巡检 {n} 组，坏 {len(bad)} 组")
    for x in bad:
        print("  " + x)
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
