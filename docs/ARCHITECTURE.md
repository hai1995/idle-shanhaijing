# 架构

## 一、运行形态

纯静态站点，没有打包器、没有框架、没有构建步骤（单文件打包是发布用的可选步骤）。

- 入口：`index.html`，按顺序引入 28 个 `<script>`，**顺序即依赖顺序**。
  `src/ui/` 下 8 个文件由原 `ui.js`（4800 行）按页拆出（v1.31.8；`scene.js` 为 v1.31.54 新增）：`core` 必须最先（`UI` 对象在那里定义），其余按页顺序，跨文件的函数与常量都在全局词法环境里、运行时才求值。
- 样式：`style.css` 一份，按「区块注释 + 组件前缀」组织（`.tile` `.codex-*` `.rite-*` `.orc-*` …）。
- 存档：`localStorage`，无后端。同步层（可插拔后端 / 修订号 / 多端合并）留在 `src/save.js`，供将来的**账号系统**在登录后接管；`server/cloud-save-server.js` 仅作该层的参考验证，不作为对外功能。

## 二、脚本清单与依赖顺序

顺序由 `index.html` 决定，构建脚本照抄同一份（见第五节）。

| 顺序 | 文件 | 职责 | 约行数 |
|---|---|---|---|
| 1–5 | `nanshanData.js` `xishanData.js` `beishanData.js` `dongshanData.js` `zhongshanData.js` | 五臧山经的世界数据，各导出一个 `window.XXX`（南山/西山/北山/东山/中山）。**由 `scripts/gen-world-data.js` 从 JSON 生成，勿手改** | 1500–4600 |
| 6 | `gameData.js` | 合并五经为 `WORLD`，再派生 `Items` `Monsters` `Recipes` `CODEX` `RITES` `OMENS` `BUILDINGS` `Milestones` `BOUNTIES` `ShopStock` `FAUNA_META`，以及 `TUNING` / `GAME_META` | 2500 |
| 7 | `affix.js` | 装备词条：池、生成、重铸（依赖 `Items`） | 180 |
| 8 | `save.js` | 序列化 / 反序列化 / 版本迁移（`SAVE_VERSION`） | 515 |
| 9 | `engine.js` | 状态骨架 `Game`/`Prefs`、经验与等级、日志、离线入口、读档装配 | 460 |
| 10 | `game.js` | 全部系统规则：采集、制作、战斗、祠礼、观象、谒见、养木、圃艺、御使、轮回、三签、强化、离线结算 | 2850 |
| 11 | `queue.js` | 巡历队列：多任务顺序执行 + 兜底动作 | 460 |
| 12–17 | `beastIcon.js` `riteIcon.js` `structureIcon.js` `skillIcon.js` `itemIcon.js` `markIcon.js` | 手绘 SVG 图标族 | 140–690 |
| 18 | `interact.js` | 交易 / 出售 / 订单 / 手动动作入口 | 390 |
| 19 | `fx.js` | 弹字、粒子、声效开关 | 180 |
| 20 | `ui/core.js` | **界面骨架**：`UI` 对象定义、DOM 辅助、顶栏与导航、弹窗、日志、键盘可达性、开屏与教程 | 1255 |
| 21 | `ui/settings.js` | **设置页**：渲染、各项开关、数据模拟（`devSim`）、玩法说明（`openHelp`）。v1.31.81 从 `core.js` 整块搬出——搬迁时逐字未改，验收靠 `#content` 的 innerHTML 逐字符比对 | 335 |
| 22 | `ui/scene.js` | **行动现场**：仪表带下方那 74px 的一条（山 / 人 / 锄 / 土 / 收成；六种行动各有其物）。挂在 `index.html` 的静态节点上做增量更新——各页是 `innerHTML` 整块重绘，现场若在重绘范围内，动画每渲一次就归零。动效由 rAF 驱动、CSS 兜底，见第六节 | 680 |
| 23 | `ui/world.js` | 舆地（区域 / 节点 / 异迹索引）与技能页（技能卡 / 配方 / 田地 / 三签） | 1250 |
| 24 | `ui/combat.js` | 征伐（异兽列表 / 竞技场 / 战斗估值）与御使（入槽 / 卸下） | 510 |
| 25 | `ui/codex.js` | 图鉴（五阶揭示 / 未录筛选）与祠祀（礼制 / 征兆 / 卜筮） | 760 |
| 26 | `ui/trade.js` | 墟市（买卖 / 求购订单）与营造（建筑） | 360 |
| 27 | `ui/pack.js` | 行动（巡历队列）与行装（装备 / 行囊 / 物品详情） | 1140 |
| 28 | `ui/misc.js` | 统计、叙录、详情浮层、`init()` 初始化 | 860 |

> ⚠️ 数据文件必须早于 `gameData.js`：`WORLD` 建不起来时，派生表会静默变成空表。测试第 89 节盯着这一条。

## 三、运行时全局对象

| 名字 | 归属 | 说明 |
|---|---|---|
| `TUNING` | gameData | 全部调参常量（第二层数值都从这里取） |
| `GAME_META` | gameData | 版本、代号、更新日期、群号、站点地址（关于页直读，不散落硬编码） |
| `WORLD` | gameData | `{ regions: [{ regionId, regionName, unlockLevel, summary, deity, nodes: [...] }] }` |
| `Items` / `Recipes` / `Monsters` / `CODEX` / `RITES` / `OMENS` / `BUILDINGS` / `Milestones` / `BOUNTIES` / `ShopStock` | gameData | 见 [DATA.md](DATA.md) |
| `Game` | engine | 玩家状态（技能、背包、地图、记录、装备、轮回…） |
| `Prefs` | engine | 偏好（自动复讨、自动进食阈值、上次讨伐目标…） |
| `UI` | ui | 渲染与交互门面；`UI.currentTab` 决定当前页 |
| `Enhance` 系（`enhanceItem` `enhanceToTarget`…） | game | 强化 |
| `SIX_BEASTS` | gameData | 六凶名单的**单一定义处**（统计页分母、成就、征伐分组都读它） |

**导出约定**：顶层 `const` / `function` 在浏览器里不会自动挂到 `window`（只在脚本作用域内）。要给 UI 或测试用，必须在文件末尾显式 `window.X = X`。这一条踩过很多次坑（测试里 `vm` 上下文同理）。

## 四、主循环与时间

```
setInterval(gameLoop, 250)         // ui/misc.js 的 init() 里挂上
  └─ 每帧：按真实 dt 推进活动、战斗、田地、征兆、续祭、三签、状态条
onSecond(1)                         // 每秒：计数、统计、日志节流、patchStats
```

- **活动（activity）**：`Game.activity = { kind, ... }`，`kind ∈ gather | craft | observe | audience | grow | combat`。`activitySeconds(a)` 给单次耗时；完成后由 `game.js:onActivityComplete` 分发。
- **战斗**：`Game.combat` 是**运行时状态，不跨会话**。存档只记 `combat: { monsterId }`，用于离线结算算账（`_droppedCombat`）。
- **离线**：两条入口
  - `settleAway(seconds)` — 页面活着时累积的时间（切后台回来 dt 很大）
  - `settleOnBoot()` — 关闭标签页后重开：读 `…_time` 与此刻的差，结算完立刻刷新时间戳
- **设计约束**：同一套系统要能被「手动一次」「队列连做」「离线按时间批量」三种方式调用。批量路径下有副作用的 UI（弹窗、提示）必须显式关门——见 `doAudience(nodeId, {oracle})` 的例子。

## 五、构建（单文件版）

`scripts/build-standalone.js`：

1. 从 `index.html` **读出** `<script src="src/…">` 的顺序（不另存清单）；
2. 内联 CSS 与全部脚本；
3. 自检每个文件都留下 `// ===== xxx.js =====` 横幅，缺一个就退出码 1。

> 历史事故：这里曾硬编码 19 个文件名，漏了 `zhongshanData.js`，单文件版因此少了整个中山经（14 系 250 山、图鉴 831，而多文件版是 26 系 447 山、1122）。两边都能正常启动，跑起来毫无异样。现在顺序只有一份，且构建后自检。

## 六、渲染约定

- **整页重建**：`renderXxx()` 直接把 `content.innerHTML` 换掉。简单、不易错，但会丢失 DOM 状态（输入框焦点、`<details>` 展开态、滚动位置）。需要保留时把状态存在 `UI` 上（如 `UI.heteroOpen`、`UI.packQuery`），重绘时补回。
- **增量刷新**：`patchStats()` / `patchCombatArena()` / `patchFarmsProgress()` 只改有变化的节点，用于每秒级更新。**同一个数字若在两处渲染，两处的口径必须一起改**——「凶神 N/7」就是这么错的：静态渲染改好了，patch 又把它改回去。
- **交互入口**：一律内联 `onclick="UI.xxx()"` 或全局函数，不绑事件委托；行内元素用 `role="button" tabindex="0"` 补键盘可达性。
- **静态节点上的动效层**：`#sceneBar` 是 `index.html` 里写死的一个节点，不进任何页面的 `innerHTML`；`UI.renderScene()` 只在「换了一种行动」时重建它的内容（靠签名比对），其余时刻每帧只改几个属性。**凡是每帧要动的东西，都必须挂在重绘范围之外**——放进去的话，任何一次页面渲染都会把它打回第一帧。
- **动画的驱动顺序**：CSS 关键帧（装饰）→ JS `requestAnimationFrame`（与节奏对齐的动作）→ CSS 兜底（rAF 被环境掐死时）。判据 `UI.sceneCssFallback` 一处，见 `ui/scene.js` 顶部注释。
- **弹窗**：`UI.modal(html)` + `UI.closeModal()`。`modal()` 会自动把 `<h3>` 留在顶部、把 `.modal-btns` 挪到底部固定条，其余包进唯一可滚的 `.modal-body`——所以长内容不用自己加滚动容器，按钮也不能塞进 `.modal-btns`。不可逆操作要做二次确认（「全售」现在是数量框 + 「全部」两步，不再叠第二层弹窗）。

## 七、存档

- 键：`shj_zhulu_save_v1`（数据）、`shj_zhulu_save_v1_time`（落盘毫秒时间戳）。
- `SAVE_VERSION = 6`；`save.js` 里有 `SAVE_MIGRATIONS`，逐版补齐字段（新增字段一律登记在迁移链里，不改老版本语义）。
- 读档原则：**能重建的一律重建**（装备按 `Items` 重算，不吃旧快照里的数值），**不能重建的保留原样**（物品表里已不存在的装备 id：保原值 + 日志提示，不静默清空）。
- 存档体积：完整档约 60–120 KB，主要为 `records`（1122 条）与 `map`（447 座）。

## 八、性能

- 征伐页 316 只异兽一次性铺开会生成 85 万字符 DOM —— 改成按组懒渲染（8.6 万字符）。
- 图表/滚动类组件用 CSS 完成，不用 JS 计算布局。
- `innerHTML` 重建是主要成本，四秒一次可以接受，一秒一次必须走 patch。

## 九、开发工具

| 命令 | 做什么 | 什么时候用 |
|---|---|---|
| `npm test` | `test/engine.test.js`：2027 条断言 / 111 节 / 约 1.5 秒 | 每次改完 |
| `npm run audit` | 跨表引用、死链、三签 key、物产产地、配方溢价、战斗节奏 | 改数据后 |
| `npm run build` | 由 `index.html` 的顺序出单文件版，自检 20 个脚本横幅 | 发布前 |
| `npm run check` | 上三步 + 版本一致性，一条命令 1.6 秒 | **提交前默认跑这个** |
| `npm run ttk` | 按等级段给 TTK 中位 / p90 / 最大（`--detail` 列离群） | 调怪数值后 |
| `npm run rebirth` | 轮回曲线：每转所需经验、乘区、单位时间修为 | 调 `TUNING.REBIRTH` 后 |
| `npm run serve` | 起自托管云端存档参考后端（默认 8787） | 试多端合并 |

> 三个 `measure-*` 脚本都是**只读**：加载同一套数据、算完打印，不改存档、不写文件。
