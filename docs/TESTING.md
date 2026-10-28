# 测试与审计

## 一、怎么跑

```bash
npm run check                   # 一键：版本一致 + 测试 + 审计 + 构建（约 2.5 秒）
node test/engine.test.js        # 只跑测试：约 2 秒，末行打印「N 通过 / M 失败」
node scripts/audit-data.js      # 数据跨表审计，零悬空才算过（有问题退出码 1）

# 真浏览器巡检（改过 UI 才需要）：先起静态服务，再跑
python3 -m http.server 8899 &
python3 scripts/patrol.py       # 15 页签 × 3 视口 × 3 状态 + 夜间主题，约 2 分钟
PATROL_BROWSER=chromium python3 scripts/patrol.py   # 只装了 chromium 的机器（默认 webkit）
npm run check -- --patrol       # 或挂进自检一起跑（缺 python/playwright 时自动跳过）
```

三者分工：**测试**管行为与口径（跑真引擎），**审计**管数据（不跑引擎，只看表），**巡检**管真浏览器里的排版与运行时报错（`vm` 里没有真排版，破版只有它能看见）。改动涉及数据时前两个都要跑；动了 UI 再加巡检。

> 这里**故意不写断言条数**。早先写过具体数字，加了两百条后就没人再更新它——读的人看到过期的数字，反而会觉得整篇文档都不用看了。条数以脚本末行打印的为准。


## 二、测试怎么组织

`test/engine.test.js` 用 `vm` 起一个假浏览器上下文，按 `index.html` 的顺序加载全部脚本，然后一节一节断言：

```js
loadJS('nanshanData.js'); … UI_FILES.forEach(loadJS);   // ui/ 下 9 个文件，顺序同 index.html
section('问神');
{
  G.resetToDefault();
  assert(cond, '这一条在验什么，实测值是多少');
}
```

- `G` 是上下文（`window`），`ST` 是给它起的别名；`renderTargets` 是 `document.getElementById` 的替身，渲染断言读它的 `innerHTML`。
- `section()` 打印节名，`assert()` 失败只记一条并继续，末尾汇总「N 通过 / M 失败」。
- **消息要自带数字**：`'两小时打了 ' + fights + ' 场土蝼'`，而不是「场次正确」。失败时不用再去加打印。

## 三、三类断言

| 类型 | 用途 | 例子 |
|---|---|---|
| **行为** | 真跑引擎，验状态变化 | 逐 tick 跑完一场 BOSS，断言「胜、耗时 < 120 秒、吃食 ≤ 8 份」 |
| **静态源码** | 防「改回去了」 | `assert(!uiSrc.includes("length + '/7'"), '统计页不再写死 /7')` |
| **构建产物** | 防两份清单走岔 | 跑一次 `build()`，断言产物含每个脚本的横幅 |

静态断言不是偷懒：语义（「数值必须有人读」）没法用行为断言表达时，读源码是唯一可行的门禁。

## 四、两条通用静态断言（新增字段时必备）

1. **征兆**：`OMENS` 每个数值字段都必须有 `omenMod('<key>')` 出口——否则「有兵」这类兆只是文案。
2. **成就**：`Milestones` 每个数值字段都必须在 `game.js` 里被读；每条必须有 `prog()`，`check` 由它派生。

新加一个字段时，把这两条扩展成「字段清单 ⊆ 出口清单」即可，不必逐条手写。

## 五、空转陷阱（最重要的一条）

写检查时最容易犯的错是**遍历了空集合**：

```js
for (const [mat] of (r.cost || [])) { ... }   // RITES 里根本没有 cost
```

它不报错、不失败，只是「什么也没查」，却能让整份报告显示零问题。**凡是遍历数据，都要配一条自检**：

```js
let riteChecked = 0;
for (...) riteChecked++;
assert(riteChecked >= 27, '确实逐套查过 ' + riteChecked + ' 套礼的配方（不是空转）');
```

同理：`regionMissing()` 这类「按前缀筛」的函数，测试要拿一份**别处**的数据喂进去，断言它没被算进来。

### 5.1 空转的第二种形态：注入静默失效

「遍历了空集合」是**数据**空转；还有一种是**动作**空转——注入状态的代码根本没跑成，但它的写法让它看起来跑成了：

```js
UI.renderAll && UI.renderAll();     // 实际方法叫 refreshAll，undefined && ... 直接短路
```

不抛错、不警告，页面也照常渲染（ticker 一刷就正常了），于是那一轮巡检「什么都没验」却打勾。**凡是注入状态，注入之后立刻验一遍状态真的变了**，并且断言要落在**用户能看见的地方**（顶栏文字、`classList`），而不是内部变量——内部变量对、界面没跟上，恰恰是要抓的 bug：

```python
st = await pg.evaluate("() => ({ phase: seasonPhase(), tag: seasonTag.textContent, wet: seasonTag.classList.contains('wet') })")
if st["tag"] != ("雨季" if st["phase"] == 1 else "旱季"): bad.append("状态未生效")
```

验收这类前置断言也要做反向验证：**故意把注入改回错的写法，确认巡检真的会报坏**。否则你只是把「静默失效」从脚本挪到了断言里。

## 六、造状态的注意事项

- **造等级必须同时给 `xp`**：`Game.skills.x = { level: 40, xp: xpForLevel(40) }`。只改 `level` 的话，`gainXp` 会按 `xp` 反算等级——第一刀砍出去就掉回 1 级，之前所有「BOSS 必败」的结论都是这么来的。
- **`vm` 上下文里 `window` 只是普通对象**：脚本末尾的 `window.UI = UI` 不会让 `context.UI` 自动指向真 UI，需手动对齐（测试第 19 节做了）。
  这条还有个更隐蔽的后代（v1.31.131 踩的）：**文件内部的裸引用也取不到**。
  ```js
  window.seasonRiverBonus = function(){ return TUNING.SEASON.RIVER || 0.30; };
  // 同一文件里后面写：
  const rb = (typeof seasonRiverBonus === 'function') ? seasonRiverBonus() : 0.30;
  ```
  浏览器里没问题（`window` 就是全局对象，`window.x =` 等于 `var x =`）；
  但 vm 里 `window` 只是普通对象，裸写的 `seasonRiverBonus` 查不到 → `typeof` 得 `'undefined'`
  → 静默走进 `else` 分支用**硬编码的 0.30**。后果是改 `TUNING` 后文案纹丝不动，
  而全局变量看着一切正常（`ST.seasonRiverBonus()` 调得到、返回也对）。
  **修法：要跨文件共享的函数，先写成函数声明再挂 window**（`function f(){}; window.f = f;`），
  文件内与文件外都能拿到，没有第二份硬编码兜底。
  验收靠传导性测试：改 `TUNING.SEASON.RIVER = 0.45`，断言文案同步变 `−45`。
- **`navigator` 是 Node 自带的**：测「剪贴板不可用」时要把 `context.navigator` 整个换掉，不能只改 `navigator.clipboard`（只读）。
- **固定随机种子**：涉及伤害浮动的用例用 `Math.random` 替换成 LCG，避免「时过时不过」。
- **跑真引擎优于算期望**：稳态估算（DPS = 平均伤害 ÷ 间隔）看不出绝技、连击、特殊技、进食；「打不打得过」只有逐 tick 跑完一场能证明。

## 七、加一节的流程

1. 先想清楚「改坏了会怎样」，把这条写成断言（此时应该是红的）。
2. 改代码到全绿。
3. 若这条错误可能被再次引入，补一条静态断言（查源码里不该出现的东西）。
4. 若涉及数据，同步在 `scripts/audit-data.js` 加一条规则——审计比测试更适合报「N 处越线」的清单。

## 八、发布前清单

```
[ ] node test/engine.test.js            全绿
[ ] node scripts/audit-data.js          零悬空
[ ] node scripts/build-standalone.js    产物含 20 个脚本（会自检）
[ ] 浏览器实测：首页 / 舆地 / 征伐 / 行装 / 统计 / 叙录
[ ] 线上核对：gameData.js 的 version 已是新版本号
```

> 涉及存档结构时，再加一步：**导出旧档 → 导入 → 关键字段仍在**（`SAVE_VERSION` +1，`MIGRATIONS` 补一条）。

## 九、随机内容的验证手法（见闻 / 掉落这类「不一定发生」的东西）

断言「它会发生」很容易写成空转：跑一次 `maybeEvent()` 拿到 null 就跳过，永远绿。
这一轮（v1.31.104–112）踩过的三种正解法，按可靠程度排：

**① 抬权重强中**（最可靠）。验「珍稀首见要额外提示」时，连抽 300 次一次没中——
权重 1 在 21 条里就是 1/30 量级。改成临时把那条的 `weight` 抬到 `1e9`，
跑一次、验 DOM、再把权重写回原值：

```js
const rare = TRAVEL_EVENTS.find(e => e.rare);
const w0 = rare.weight; rare.weight = 1e9;
Game.events.seen = {}; Game.events.at = 0;
const hit = maybeEvent({ kind:'gather' }, true);
rare.weight = w0;                  // 一定要复原，否则这条会污染后面所有用例
```

**② 跑分布看比例**（验「该不该容易遇到」）。单次结果说明不了什么，
在**指定的 ctx** 下连抽 40 次看分布：在观象地抽，异迹见闻占 9/40；
在灌木地抽，7/30。数字对得上「一条 weight 2 在 20 条表里的期望」，才算接对了。

**③ 静态钉源码**（验「这条规则还在」）。`when` 过滤、`hint` 字段、`rare` 判据这类
「写法本身就是规则」的东西，直接正则查 `src/events.js`，比跑一百次更稳。

**反过来，这几件事不要用随机验证**：文案里的数字与账目一致（直接调 `run()` 比对数）；
成就判据（直接塞 `seen` 造状态）；存档结构（直接 `migrateSave` / 读档路径）。

> 还有一条元教训：**断言要落在真正干活的那一层**。我曾把「读档补 awayAt」的断言
> 写在 `migrateSave` 上——但补齐发生在 engine 的读档处，那条断言测的是另一条路，
> 读档路径压根没被覆盖。写之前先问一句：这个字段是谁填的？

## 十、性能基线（2026-10-27 实测，iPhone 尺寸 390×844 / WebKit）

改渲染逻辑前先量一次，改完再量——**但一定要分清「首次」与「稳态」**。
这一轮为此白改了一处：技能页初测 197ms，以为是 26 份隐藏浮层造成的，
改完只降到 177；再测才发现稳态切页本来只有 36ms，197 是首次进页的初始化成本。

在浏览器控制台跑这一段即可复测（不用起服务、不用装依赖）：

```js
(async () => {
  tutSkip?.();
  devSim?.('lv40'); devSim?.('mat'); devSim?.('map'); devSim?.('codex');
  const tabs = TABS.map(t => t.id);
  const out = {};
  for (const t of tabs) {                       // 首次
    const s = performance.now(); UI.switchTab(t); void document.body.offsetHeight;
    out[t] = { first: Math.round(performance.now() - s) };
  }
  for (const t of tabs) {                       // 稳态（预热后再量）
    const runs = [];
    for (let i = 0; i < 3; i++) {
      UI.switchTab('yudi');
      const s = performance.now(); UI.switchTab(t); void document.body.offsetHeight;
      runs.push(performance.now() - s);
    }
    out[t].steady = Math.round(Math.min(...runs.slice(1)));
  }
  console.table(out);
})();
```

本次基线（首次 / 稳态，ms；数据为「玩了一阵」的档：644 件行囊、306 张图鉴、316 只异兽）。
v1.31.109 复测（拆 world.js 之后；稳态取 5 次中位数，首次为同轮第一次）：

| 页面 | 首次 | 稳态 | 备注 |
|---|---|---|---|
| 舆地 yudi | 13 | 11 | 最轻 |
| 技能 skills | 184 | 13 | 首次含田地 / 配方首次构建；稳态比上轮 17 略降 |
| 征伐 taofa | 94 | 17 | 异兽列表 |
| 御使 yushi | 41 | 8 | **原 145 / 132，316 只全铺 → 每页 40** |
| 图鉴 codex | 79 | 7 | 306 张，已分页（首屏 48） |
| 祠祀 jisi | 68 | 25 | |
| 墟市 shichan | 82 | 10 | **原 233 / 155，卖出区 644 件全铺 → 每页 60** |
| 营造 ying | 17 | 7 | |
| 队列 queue | 23 | 5 | |
| 行装 pack | 66 | 6 | 644 件，已分页（首屏 60） |
| 统计 stats | 84 | 15 | 日志 300 条单独重画仅 6ms |
| 叙录 about | 115 | 5 | 典型的一次性初始化成本 |

全站稳态 ≤ 25ms，首次最高 184ms（技能页），都在「切换不觉得卡」的范围内。

上一轮（v1.31.103 前后）的读数，留着对比：

| 页面 | 首次 | 稳态 |
|---|---|---|
| 技能 skills | 152 | 17 |
| 征伐 taofa | 85 | 19 |
| 御使 yushi | 24 | 20 |
| 图鉴 codex | 109 | 26 |
| 墟市 shichan | 93 | 23 |
| 行装 pack | 76 | 18 |
| 统计 stats | 59 | 10 |

要动的只有「稳态」那一列。首次成本主要来自首次布局与 SVG 首次解析，改页面结构收效很小。

**这一轮的教训**：我第一次量只看了「首次」，于是把 197ms 归因到技能页的隐藏浮层——
改完只降到 177。补量稳态才发现真正的两处瓶颈是墟市（155）与御使（132），
它们都是「把整个背包 / 整本图鉴平铺一页」，与首次成本毫无关系。
**先量稳态，再谈优化**；首次那一列只用来判断「第一次打开会不会卡」。

### 第三个容易白改的坑：把「强制同步布局」当成渲染成本（v1.31.126）

技能页首次 184ms，我第一反应是「HTML 太大了」，于是去量 innerHTML 的构建与复解析——
结果构建 8ms、复解析 3ms，对不上。逐行插桩才看到真相：

| 步骤 | 耗时 |
|---|---|
| `renderSkills()`（真的在拼 HTML） | 8ms |
| `void content.offsetWidth`（重启动画） | **151ms** |
| `fitGhostScrollbar()` 里第一次 `scrollHeight` | **131ms** |

两个都是**强制同步布局**：DOM 刚改完，一读几何属性就要把整页排版算完。它们都不是「渲染」，
而是「为了做一件小事把账一起结了」。改法不是优化排版，而是**别在这一刻做**：

- 重启动画：摘 class → 下一帧 `requestAnimationFrame` 再挂上，动画照样从头播；
- 幽灵滚动条：测量延到下一帧（`fitGhostScrollbarSoon`，并加「每帧一次」的闸门防连点排队）。

顺带一个反直觉的读数：**第二次**切同一页只要 13ms。所以量切页一定要像上面那段脚本那样
先预热——否则你会把「webkit 第一次遇到这套样式」的成本，当成「这个页面每次都慢」。

另一条：负向断言（「不许再出现 X」）要先把注释剥掉再判。`void c.offsetWidth` 这句
在修完之后仍留在注释里讲历史，直接扫源码会把注释当成违规代码——守卫生错了对象。

