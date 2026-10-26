# 测试与审计

## 一、怎么跑

```bash
npm run check                   # 一键：版本一致 + 测试 + 审计 + 构建（约 1.6 秒）
node test/engine.test.js        # 只跑测试：1963 条断言，104 节，约 1.5 秒
node scripts/audit-data.js      # 数据跨表审计，零悬空才算过（有问题退出码 1）
```

两者分工：**测试**管行为与口径（跑真引擎），**审计**管数据（不跑引擎，只看表）。改动涉及数据时两个都要跑。

## 二、测试怎么组织

`test/engine.test.js` 用 `vm` 起一个假浏览器上下文，按 `index.html` 的顺序加载全部脚本，然后一节一节断言：

```js
loadJS('nanshanData.js'); … UI_FILES.forEach(loadJS);   // ui/ 下 7 个文件，顺序同 index.html
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

## 六、造状态的注意事项

- **造等级必须同时给 `xp`**：`Game.skills.x = { level: 40, xp: xpForLevel(40) }`。只改 `level` 的话，`gainXp` 会按 `xp` 反算等级——第一刀砍出去就掉回 1 级，之前所有「BOSS 必败」的结论都是这么来的。
- **`vm` 上下文里 `window` 只是普通对象**：脚本末尾的 `window.UI = UI` 不会让 `context.UI` 自动指向真 UI，需手动对齐（测试第 19 节做了）。
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
