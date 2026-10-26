# 山海经 · 著录　v1.31.56 快照

> 日期：2026-10-30
> 提交：`0db9bed631776341045a3cf4e4c571a23fd863bb`
> Pages：`build completed success` / `deploy completed success`
> 线上版本：`GAME_META.version = 1.31.56`

## 本轮一句话

「手机上没动」来了两次。两次我都在桌面 Chromium 里看到矩阵在变，就判定「是幅度问题」。
**验收方式本身错了**——目标设备是手机，我一次都没在手机内核上验过。
这一版把驱动方式整个换掉：不再依赖 CSS 动画。

## 为什么前两版在手机上不动

依赖了两条 CSS 路径，其中任意一条在移动端内核上不成立，锄头就定住：

| 依赖 | 风险 |
|---|---|
| `SVG <g>` 上的 CSS `transform` | 部分移动端内核对 SVG 内部元素的 CSS transform 支持不全 |
| `animation` 简写里带 `var(--ai)` | 简写属性里塞 CSS 变量，解析失败的引擎**直接丢弃整条声明，且不报错** |

## 换成什么

**一个 HTML 元素 + 一条内联 `transform`，每帧由 JS 写。**

| 项 | 之前 | 现在 |
|---|---|---|
| 锄头所在 | 人物 SVG 内部的 `<g class="sc-tool">` | **独立的 `<svg class="sc-tool">`**，绝对定位在握点 |
| 旋转来源 | CSS `@keyframes scSwing` | `UI.startSceneMotion()` 的 `requestAnimationFrame` |
| 时长来源 | `animation-duration: var(--ai)` | 每帧直接算，不经过 CSS |

`<g>` 上的 CSS transform 和 `animation` 简写里的 `var()` 都不再出现——这两条正是最可疑的。

## 相位不再另建时间基准

```
p = activityProgress / currentActionInterval()
```

暂停、变速、换物、离线补算回来之后，锄头都落在正确的相位上。
「第二锄落下 = 产出物品」这条因果，从此不依赖任何定时器对齐。

**再加一层兜底**：读不到 `activityProgress`（跨 script 的顶层 `let` 在个别环境可能读不到），
退化为 `performance.now() % 周期 / 周期`。宁可相位略有偏差，也不能定住。

## 两张帧表（角度）

| 帧位 | 工具 | 身体 |
|---|---|---|
| 0% | +6° | 0° |
| 15% | −98° | −2.2° |
| 29% | +4° | +3.2° |
| 56% | −114° | −2.6° |
| 68% | −108° | −2.2° |
| **92%** | **+4°（产出）** | **+3.6°** |
| 100% | +6° | 0° |

分段插值里加了缓动——纯线性的挥动像机械臂。

## 验证方式也换了

不再看「动画名对不对」，而是**把整页 CSS 动画全部禁掉，再看还动不动**：

```js
// 注入
*, *::before, *::after { animation: none !important; }
```

结果（线上实测）：

| 场景 | 五次采样 | 不同值 |
|---|---|---|
| 正常 | −97.85° / −32.51° / +4.50° / −3.87° / −65.93° | **5** |
| **CSS 动画全禁** | −107.41° / −77.04° / −17.21° / +4.01° / +6.00° | **5** |

**CSS 全禁之后仍在动**——因为驱动它的是 JS 和一条内联 transform，与 CSS 动画无关。

## 数据

- 帧表：工具 8 帧、身体 8 帧
- 一周期两次挥锄，第二锄落在 92%
- 第 145 节：54 条断言
- 引擎测试：**2665 通过 / 0 失败**

## 测试与验证

- `node scripts/check.js`：版本一致 ✓ 引擎测试 ✓ 数据审计 ✓ 单文件版构建 ✓
- 线上 Playwright：
  - 版本 `1.31.56`，`sceneAngleAt` / `UI.startSceneMotion` 均为 `function`
  - `UI._sceneRaf` 在跑
  - 正常 5/5 不同角度；**注入 `animation:none` 后仍 5/5 不同角度**
  - **控制台错误 0**

## 改动文件

- `src/ui/scene.js`：工具拆成独立 SVG（`sceneTool`）；新增 `SCENE_SWING` / `SCENE_RIG` 帧表与 `sceneAngleAt` 插值；`UI.startSceneMotion` / `stopSceneMotion`；相位取引擎进度 + 墙钟兜底
- `style.css`：`.sc-tool` 改绝对定位；删 `@keyframes scSwing` / `scRig`；`.sc-pit i` 改固定时长（不再用 `var(--ai)`）
- `src/gameData.js`、`package.json`：版本 1.31.56
- `test/engine.test.js`：第 145 节改指新实现
- `docs/CHANGELOG.md`、`docs/ROADMAP.md`：新增「规律六：验收要在目标设备上做」

## 一条新规律（写进 ROADMAP）

**验收要在「目标设备」上做，不在「我手边的浏览器」上做。**

三条可复用的判断：

1. 别问「我这儿为什么不动」，问「怎么让它不依赖会失效的那一层」。
2. CSS `animation` 简写里放 `var()` 有风险——解析失败的引擎会丢弃整条声明，且不报错。
3. 动画的相位要取引擎的进度，不要另建时间基准。

## 若手机端仍不动，先查这三处

1. **页面缓存**——硬刷新（下拉刷新 / 清除缓存 / 换无痕窗口）
2. **设置 → 动效强度**——若被设成「关」，现场是**故意的静帧**（`Prefs.fxLevel === 'off'`）
3. **浏览器版本**——`requestAnimationFrame` 自 2011 年起全平台支持，若仍不动，多半是 1 或 2
