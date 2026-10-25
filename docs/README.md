# 开发资料库

这份目录是给「下一轮开发」用的手册。仓库根的 `README.md` 是给玩家的作品说明兼开发手记（叙事、取舍、踩过的坑）；这里放**结构索引**：要改哪一块、看哪一份、有哪些隐含约定。

| 文档 | 什么时候读 |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 第一次接手；要动加载顺序、存档格式、渲染方式、构建流程 |
| [DATA.md](DATA.md) | 加一座山、一件物产、一位神祇、一个配方、一座建筑 |
| [SYSTEMS.md](SYSTEMS.md) | 改数值，或改某个系统的规则（采集 / 战斗 / 祠礼 / 轮回 / 离线 / 强化…） |
| [TESTING.md](TESTING.md) | 改完怎么验；怎么加一条断言；两类静态断言的写法 |
| [CHANGELOG.md](CHANGELOG.md) | 想知道某个机制为什么长这样 |
| [BALANCE.md](BALANCE.md) | 想知道「这个数为什么是这个数」；改数值前后做对照 |
| [ROADMAP.md](ROADMAP.md) | 挑下一件事做 |

---

## 一页速览（v1.31.8）

| 项 | 值 |
|---|---|
| 形态 | 纯静态站点，原生 JS，零依赖；GitHub Pages 直出 |
| 入口 | `index.html`（26 个 `<script>`，顺序即依赖顺序） |
| 单文件版 | `node scripts/build-standalone.js` → `idle-shanhaijing-standalone.html`（不入库） |
| 源码 | `src/` 共 26 个文件、约 2.81 万行；`src/ui/` 按页拆成 7 个（最大 `core.js` 1300 行） |
| 数据 | 山系 26 / 山川 447 / 物品 682 / 异兽 316 / 配方 104 / 图鉴 1122 / 祠礼 28 / 征兆 45 / 建造 12 / 成就 18 |
| 存档 | `localStorage`，键 `shj_zhulu_save_v1`（`SAVE_VERSION = 4`），另记落盘时间 `…_time` |
| 测试 | `node test/engine.test.js` —— 1893 条断言，99 节，单进程约 1.5 秒 |
| 数据审计 | `node scripts/audit-data.js` —— 14 类跨表检查，零悬空才算过 |

## 心智模型（三句话）

1. **数据三层**：`*jing_nodes.json`（原文派生）→ `src/*Data.js`（生成的 JS 常量）→ `src/gameData.js`（由 `WORLD` 派生出 Items / Monsters / Recipes / CODEX…）。手工只改 JSON 与 `gameData.js`，中间的 `*Data.js` 由脚本生成。
2. **逻辑分三块**：`engine.js`（状态、经验、存档骨架）→ `game.js`（各系统规则与数值）→ `ui.js`（纯渲染 + 交互入口）。`ui.js` 不写规则，`game.js` 不碰 DOM。
3. **一条铁律**：数值与文案不能各说各话。凡是界面上写出的数字，都必须由代码里同一个函数算出来；凡是数据里写的字段，都必须有人读。这一条在本项目里被违反过很多次，所以审计与测试各有一批专门盯它的检查。

## 维护约定

- **改机制**：同步 [SYSTEMS.md](SYSTEMS.md) 对应小节；在 [CHANGELOG.md](CHANGELOG.md) 顶部加一条。
- **加数据**：跑 `node scripts/audit-data.js`，断链会直接报出来，不要用「先跳过」的方式绕过。
- **发布流程**（顺序不能变）：

  ```
  npm run check                      # 版本一致 + 测试 + 审计 + 单文件版，任一步失败即中止
  # 需要单跑某一步时：
  npm test / npm run audit / npm run build
  # 浏览器实测：首页、舆地、征伐、行装、统计、叙录
  ```

  `check` 还会核对 **package.json 的 version 与 `GAME_META.version` 是否一致**——两处漂移时，页面底部显示的版本与 npm 包版本会对不上，排查线上问题最容易误导人。

- **提交信息**：`类型(模块): 一句话结论` + 正文写「原来错在哪、怎么发现的、怎么防复发」。这个仓库的历史信息是后来判断「某段代码为什么这样写」的主要线索。
