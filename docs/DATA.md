# 数据

## 一、三层结构

```
nanshanjing_nodes.json ─┐
xishanjing_nodes.json   │  scripts/gen-world-data.js
beishanjing_nodes.json  ├─▶ src/nanshanData.js … zhongshanData.js（生成的 JS 常量）
dongshanjing_nodes.json │        │
zhongshanjing_nodes.json┘        ▼
                          src/gameData.js：合并成 WORLD，再派生出
                          Items / Monsters / Recipes / CODEX / RITES / OMENS /
                          BUILDINGS / Milestones / BOUNTIES / ShopStock
```

- **只改两头**：原始 JSON（原文派生数据）与 `gameData.js`（派生逻辑与手写条目）。
- `src/*Data.js` 顶部写着「由 JSON 派生，请勿手改」——改完 JSON 跑 `node scripts/gen-world-data.js`。
- `gameData.js` 里大量条目用构造器生成（`I()` 物品、`XW()` 采集物、`R()` 配方、`addMonster()` 异兽），公式化的字段走 `autoLvl` / `autoVal` / `autoXp`，**允许手改覆盖**。

## 二、表与字段

### WORLD.regions[] / .nodes[]

| 字段 | 说明 |
|---|---|
| `regionId` / `regionName` / `regionAlias` / `order` | 例 `xishan-3` / 西次三经 / 崇吾之山系 / 3 |
| `unlockLevel` | 山系解锁所需**舆地**等级 |
| `summary` / `deity` | 原文末句总述；山神形象与祠礼原文 |
| `nodes[]` | 该系诸山 |
| `nodes[].id` | `xishan-3-05` —— **前缀即山系**（大量代码靠 `indexOf(regionId)===0` 归属） |
| `nodes[].name` / `chapter` / `unlockLevel` / `terrain` | 山名、章节（南山经·南山首经）、进入所需舆地等级、形胜 |
| `nodes[].yields` | `{ wood, mineral, herb, water, beast, woodSpecial, unknown, special }`，字符串数组或 `{name,form,effect}` |
| `nodes[].fauna[]` | 原文所载异兽：`{ name, form, sound, effect, omen, category?, duty? }` |
| `nodes[].omen` / `hazard` / `myth` / `observation` / `source` | 征兆、地气（流沙/百仞/旱河）、神话块、观象方位、原文 |

> 节点 `unlockLevel` 由 `gen-world-data.js` 按「山系门槛 + 序位」派生，可手改；`dataUnlockLevel` 记录原始值备查。

### Items（682）

| 字段 | 说明 |
|---|---|
| `id` / `name` / `type` / `icon` | `type ∈ wood mineral fish herb seed crop beast material rite charm fruit food bird tool weapon armor bow arrow potion` |
| `skill` / `lvl` | 可采集物的技艺与门槛（有 `skill` 即「能采」，进图鉴） |
| `node` / `nodes[]` | 产地：单节点或**多节点**（309 件用 `nodes[]`，两者都读） |
| `value` / `xp` / `note` / `py` / `form` / `effect` | 售价、采集经验、注解、注音、形态、效用 |
| `equip` / `slot` / `grade` / `reqRecord` | 装备：`slot ∈ weapon armor charm axe pick net quiver`（**武器无 slot 字段**）；`grade ∈ common fine rare precious divine`；`reqRecord = {id,tier}` 表示「须先识得某物」 |
| `heal` / `crop` / `grow` | 食物回血；种子对应的作物 id；生长秒数 |

### Recipes（104）

`{ type, out, qty, xp, lvl, cost:[[itemId, n]], time? }`，`type ∈ burn cook smith fletch craft jade herb rite`（映射见 `RECIPE_SKILL`）。

- `type: 'rite'` 的 `out` 是祠礼 id（`rite_ns1` 等），与 `RITES` 一一对应。
- 配方材料可达性由审计把关：材料最早获得等级 ≤ 配方等级 + 8（`rite` / `crop` 豁免）。

### Monsters（316）

`{ id, name, boss, el, needLvl, hp, atk, def, xp, coins, drop, divine, threat, form, special, desc }`

- **野怪有 `nodeId` / `regionId`；BOSS 没有**（它们不进单座山的异兽栏，而是征伐页的「六凶」「凶神」分组）。
- `drop` 专属必掉、`divine` 神兵（6%）、`special` 特殊技（`every` 回合数 + 类型）、`threat` 危险度。
- 属性由 `beastStat(L, kind)` 生成：血 `L^1.26`、攻 `L^1.02`、经验 `L^1.36`；人形凶兽 `hp ×1.15, atk ×1.3`。

### FAUNA_META

以**原文名**为键，给异兽补五行、掉落、神祇标记、征兆、形制。`{ id, el, drop, deity?, pacifist?, boss?, man?, gift?, unkillable?, py?, note?, extra? }`。

### CODEX（1122）

由 `Items`（有 `skill` 的）、`Monsters`（非 boss）、每座山、每系山神、祠礼神、谒见神祇 `put()` 而成。`reveals` 是五阶揭示文案，与 `TUNING.MASTERY.NAMES`（初见/识名/明性/通形/得御）对应。

### RITES（28）/ OBSERVE_SITES（9）/ AUDIENCE_SITES（20）/ GROW_SITES（3）

| 表 | 关键字段 |
|---|---|
| `RITES` | `{ regionId, yieldBonus, dur, xp, deity, grand? }` —— **注意：祭品不在 RITES 里**，在 `Recipes(type:'rite').cost` |
| `OBSERVE_SITES` | `{ nodeId, kind:'观象'|'观瑞', name, desc, gain, reward? }`，东山四座由 `node.observation` 自动派生 |
| `AUDIENCE_SITES` | 以**节点 id 为键**：`{ nodeId, kind, name, desc, deities:[{ name, id, form, duty, note, gift }] }`，由 `node.fauna` 中 `deity:true` 者自动建 |
| `GROW_SITES` | `{ nodeId, name, stages, cost, reward, sec, desc }` |

### 其他

| 表 | 说明 |
|---|---|
| `BUILDINGS`（12） | `{ id, name, lvl, cost, desc, ...效果字段 }`，效果必须有人读（审计盯） |
| `Milestones`（18） | **必须写 `prog()` 返回 `[已得, 目标]`**，`check` 由它派生；`desc` 里的数字要与实物一致 |
| `BOUNTIES`（8） | 三签：`{ id, name, key, n(lv), shells(lv) }`，`n` 按各自动作节奏分别定 |
| `ShopStock`（12） | `{ itemId, qty, cost, lvl, cat, note }`，`cat ∈ kindling seed rite beast` |
| `TUNING` | 全部调参（见 [SYSTEMS.md](SYSTEMS.md) 末表） |
| `GEAR_GRADE` / `GEAR_BASE` | 装备五档与基准曲线（见 SYSTEMS「装备」） |

## 三、审计规则（`scripts/audit-data.js`，14 类）

| 类别 | 查什么 |
|---|---|
| 配方 | 产物/材料有定义、类型有技能映射、祠礼三表一致 |
| 圃艺 | 每个作物都有种子 |
| 死链 | 被配方消耗的东西必须有获取途径（产地/掉落/制作/商店/作物） |
| 征兆 | 45 条兆都必须有触发源 |
| 异兽 | 所在节点存在、山系与节点一致、掉落有定义 |
| 地点 | 观象/养成/谒见三类点的节点存在、耗材与奖励有定义 |
| 六凶 | 名单六项、无重复、每位都是真 BOSS |
| 成就 | 必有 `prog`、目标为正、`check` 与 `prog` 一致；「西山百神」位数与实物一致 |
| 异迹 | 索引覆盖三表全部；谒见神祇在图鉴可查；每处带收益与山系 |
| 谒见 | 每处至少一位带赐物；中山诸神赐物在本系祠礼之内 |
| 祠礼 | 礼器配方不晚于山系门槛 10 级；祭品在礼器等级 +8 内可得 |
| 营造 | 建筑材料不晚于营邑门槛 6 级 |
| 物产 | 物产等级 ≤ 产地解锁 +2；装备落在品阶容差带内 |
| 节奏 | 逐只建模：单杀时长、存活/击杀比越线即报 |

## 四、加内容的步骤

**加一座山**：改对应 `*jing_nodes.json` → `node scripts/gen-world-data.js` → 审计（会自动发现新节点的物产/异兽缺口）→ 测试。

**加一件物产**：`gameData.js` 里 `XW(id, name, type, nodes, {...})`。等级遵循 `autoLvl = round(产地门槛 × 0.86)`，可手改但要满足「≤ 产地 +2」。

**加一个配方**：`R(type, out, qty, time, lvl, [[材料, 数量]])`。材料必须已有获取途径，且最好在 `lvl + 8` 内可得。

**加一位神祇**：`nodes[].fauna` 里加条目 → `FAUNA_META['名']` 写 `{ id, el, deity:true, gift, note }`。`gift` 会自动成为「初谒之赐」；若在中山经，赐物须在本系祠礼材料之内。

**加一条成就**：`Milestones` 里写 `prog()`（不要写 `check`，数组下面统一派生）。

## 五、踩过的坑（数据侧）

1. **字段写了没人读**：`regionRiteBonus`、`OMENS.dmg/loot`、`reqRecord`、`Milestones.offlineCap` 都曾长期只有数据、没有出口。现在审计要求「每个数值字段都必须有人读」。
2. **同一份名单抄三处**：六凶 id 抄在成就、征伐分组、统计页分母里，分母写成 7（实为 6），分子还数了全部 BOSS。现在只有 `SIX_BEASTS` 一处。
3. **空转的检查**：祠礼祭品检查写的是 `for (const [mat] of (r.cost || []))`，而 `RITES` 根本没有 `cost`——遍历空数组，一直报「零问题」。凡遍历数据的地方，都要配一条「确实查过 N 条」的自检断言。
4. **派生的先后**：`gameData.js` 依赖 `WORLD`。数据文件缺席时不会报错，只会让派生表变空——单文件版曾因此少了整个中山经。
