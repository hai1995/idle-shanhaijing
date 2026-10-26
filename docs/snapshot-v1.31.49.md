# 山海经放置 · v1.31.49 快照

> 日期：2026-10-30
> 提交：`f8a0719cb7db2bb525ed58bb14181f8807c09fdc`
> Pages：`build completed success` / `deploy completed success`
> 线上版本：`GAME_META.version = 1.31.49`

## 本轮一句话

把「图鉴这一层的产地口径」也收成单一来源；顺带认定一个功能问题——一张全是锁着的清单，等于没有清单。

## 发现的真 bug

图鉴层仍只认主产地（`it.node`），与 v1.31.48 刚统一的采集判据**脱节**。

扫描全部 81 个等级段确认：**46 件物**属于「主产地锁着、别的山已解锁」。

典型样本「雄黄」：

| | 值 |
|---|---|
| 主产地 `it.node` | `xishan-4-16`（需舆地 **41** 级） |
| 实际可采 | `nanshan-1-05`（**3** 级） |
| 图鉴此前的显示 | 「需 41 级」 |

也就是说：玩家在舆地 3 级就能采到雄黄，图鉴却永远劝退。

## 三个新判据（引擎层，与采集同源）

| 函数 | 职责 | 口径 |
|---|---|---|
| `codexSourceNodes(e)` | 这个条目**有哪些**产地 | 异兽→`nodeId`；山川→自身；采集物→`gatherSources`（多产地全集）；其余→`it.node` |
| `codexReachableNode(e)` | 现在**去哪** | 候选集里已解锁的优先，其次解锁级最低的 |
| `codexReachInfo(e)` | 门槛信息 | 命中已解锁 → `{unlocked:true,gap:0}`；全锁 → 报**最低**门槛（不再报主产地的虚高数） |

**关键设计**：全锁时报的是「所有产地里门槛最低的那一处」，不是主产地。
主产地只是数据的默认排序，不该当成唯一真相。

## 顺带解决的功能问题

上一轮观察到：445 枚「需 N 级」虚线签满屏刷屏。v1.31.48 只做了去边框（视觉降噪），
本轮认定**这是功能问题而非视觉问题**——「一张全是锁的清单回答不了『我现在该做什么』」。

因此新增 **「可往 N」筛选 chip**，与「仅未录」可叠加：

- 开局「仅未录 + 可往」→ **2 张卡**（从 447 张收敛）
- 舆地 3 级「仅未录 + 可往」→ **4 张卡**（招摇之山 / 堂庭之山 / 杻阳之山 / 柢山）

## 改动文件

- `src/game.js`：新增 `codexSourceNodes` / `codexReachableNode` / `codexReachInfo` 并 `window` 导出
- `src/ui/world.js`：`codexNode` 改用 `codexReachableNode(e)`（不再只认主产地）
- `src/ui/codex.js`：
  - `codexWhereOf` 认多产地，已解锁排最前，多产地给「招摇之山 等 42 山」
  - `codexGoBtn` 改用 `codexReachInfo`，报**最低**门槛
  - `codexView` 新增 `reachOnly` 过滤
  - `codexTabsInner` 新增「可往 N」chip
  - `codexHintText` 区分「未录」与「可往」计数
  - 新增 `codexSourceListHtml` —— 详情页产地清单（已解锁排前可点击、锁着写明门槛、最多 12 处 + 总数）
  - 卡片渲染改由 `wantAction = v.onlyMiss || v.reachOnly` 决定是否给产地线索与前往按钮
- `src/ui/core.js`：UI 状态新增 `codexReachOnly`
- `style.css`：门槛签去边框（`border-style:none`）+ 新增 `.cx-srcs` 系列样式
- `src/gameData.js`、`package.json`：版本 1.31.49
- `test/engine.test.js`：新增第 142 节「图鉴产地口径」（29 条），更新两处旧断言
- `docs/CHANGELOG.md`、`docs/ROADMAP.md`：新增「二之四、判据统一要收干净」

## 三条规律（写进 ROADMAP）

1. **判据统一要连上下游一起收**——只改自己那层，上下游会立刻脱节。
2. **清单里全是不可执行的条目就等于没有清单**——筛选的默认视图应当是「现在能做的」。
3. **降噪与增信是一回事**——满屏灰签不是审美问题，是功能没做完。

## 测试与验证

- 引擎测试：**2549 通过 / 0 失败**
- `node scripts/check.js`：版本一致 ✓ 引擎测试 ✓ 数据审计 ✓ 单文件版构建 ✓
- 线上 Playwright：
  - 版本读到 `1.31.49`，三个判据均为 `function`
  - 雄黄在舆地 3 级正确指向 `nanshan-1-05`（home 是 `xishan-4-16` / 41 级），`where = '柢山 等 5 山'`
  - chips 为 `['异兽','山川','百物','祠典 · 神祇','仅未录 447','可往 4']`
  - 「仅未录 + 可往」得 4 张卡，各带「前往」按钮
  - `cc-lock` 的 `border-style` 为 `none`
  - 「金」产地清单 12 条 + 「产地 42 处」
  - **控制台错误 0**
