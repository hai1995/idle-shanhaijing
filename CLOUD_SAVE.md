# 云端存档接入指南

> 本文面向「后期接云端」这一目标，说明当前存档层的设计与接入步骤。
> 现阶段**未接入任何云端服务**，全部逻辑走本地后端；接入时业务层无需改动。

## 一、为什么要提前做

原先存档逻辑写在 `src/engine.js` 里（手写字段列表 + 直接 `localStorage` 读写），
接云端会立刻撞上三个硬伤：

| 硬伤 | 原状 | 现在的解法 |
|---|---|---|
| 无版本迁移 | `version:2` 硬编码，改字段就炸老档 | `SAVE_MIGRATIONS` 迁移链 + 迁移后版本回写 |
| 无并发冲突 | 后写直接覆盖先写 | `mergeSaveData()` 分字段合并规则 |
| 存储与业务耦合 | 业务代码直接摸 `localStorage` | `SaveManager` 门面 + 可插拔后端 |

## 二、架构

```
业务层（game.js / ui.js / queue.js / interact.js）
    │  只调用 saveGame() / loadGame()，不关心存哪
    ▼
src/engine.js  ── 装配与校正（内存 ↔ 存档对象）
    │  saveGame() → SaveManager.save()
    │  loadGame() → SaveManager.load() → applySave(d)
    ▼
src/save.js  ── SaveManager 门面
    │  · 版本迁移（migrateSave）
    │  · 多端合并（mergeSaveData）
    │  · 修订号 / 脏标记 / 设备标识
    ▼
存储后端（可插拔）
    · LocalSaveStore  —— localStorage（默认）
    · createCloudStore —— HTTP（未接入）
```

## 三、接入步骤（未来）

### 1. 开启云端后端

```js
SaveManager.setCloud({
  endpoint: 'https://api.example.com/v1',
  token: () => getAccessToken(),   // 可传字符串或取 token 的函数
});
```

### 2. 服务端接口约定

| 方法 | 路径 | 请求 | 响应 |
|---|---|---|---|
| GET | `{endpoint}/save` | — | `{ payload: "<存档JSON字符串>", rev: 12 }`；无档返回 404 |
| PUT | `{endpoint}/save` | `{ payload, rev, deviceId }` | `{ ok: true, rev }` |
| DELETE | `{endpoint}/save` | — | `{ ok: true }` |

`payload` 是**完整的存档 JSON 字符串**（与本地 `localStorage` 里那份同构），
所以服务端无需理解游戏内部结构，只需按字符串存取 + 按 `rev` 做乐观并发。

### 3. 同步时机

```js
await SaveManager.sync();   // 上传本地改动（dirty 为真才动作）
await SaveManager.pull();   // 拉取云端档并与本地合并
SaveManager.syncReady();    // 同步查询状态，供 UI 展示（不返回 Promise）
```

典型接线：
- 进入游戏时 `pull()`（把另一台设备的进度合进来）
- 每次 `saveGame()` 后标记 `dirty`，由防抖定时器批量 `sync()`
- 页面 `visibilitychange` / `beforeunload` 时强制 `sync()` 一次

### 4. 冲突处理

`mergeSaveData(local, remote)` 的合并规则（**已由测试固化**）：

| 字段 | 规则 | 理由 |
|---|---|---|
| 技能等级 / 经验 | 取大 | 进度绝不倒退 |
| 著录次数 / 阶位 | 取大 | 同上 |
| 统计计数 | 取大；嵌套对象取并集 | 同上 |
| 养成进度 / 丹木 | 取大 | 同上 |
| 地图节点 / 已观象 / 已营造 / 免疫 | 并集 | 不丢已达成 |
| 行囊 / 仓廪 | 逐项取大 | 采集是累加，取大保住两端收获 |
| 贝币 | 取**较新**一档 | 可花可赚，取大会凭空造钱 |
| 昵称 / 偏好 / 当前节点等 | 取较新一档 | 属于「状态」而非「进度」 |

> 判定「较新」靠存档负载里的 `savedAt` 时间戳。旧档没有该字段时视为最旧，
> 因此旧档拉取后会被新档覆盖（合理：旧档本来就更旧）。

## 四、新增字段的正确姿势

1. 在 `serializeSave()` 的白名单里加字段；
2. **同时**在 `SAVE_MIGRATIONS` 里登记一条迁移补丁（把旧档补上该字段）；
3. `SAVE_VERSION` 加一；
4. 补一条断言到 `test/engine.test.js` 的「28. 云端化存档层」小节。

**不要**直接改已有版本的语义——线上老档会读崩。

## 五、当前状态

- 存档结构版本：**v3**（v1 / v2 老档可自动升级并回写新版本）
- 本地后端：启用（键 `shj_zhulu_save_v1`，与旧版一致，旧档不丢）
- 云端后端：接口齐备，**未接入**（`SaveManager.cloud === null`）
- 元数据：`shj_zhulu_meta_v1`（`rev` 修订号 / `dirty` 脏标记 / `savedAt` / `deviceId`）
- 设备标识：`shj_device_id`（首次访问随机生成，用于多端区分与审计）

## 六、已验证项（`test/engine.test.js` 第 28 节，911 项全通过）

- 存档往返、版本迁移链、迁移后版本回写
- 多端合并各字段规则（经验/著录/统计/地图/背包/贝币）
- 存储后端可插拔、云端后端工厂
- 修订号自增、脏标记、设备标识
- 未接入云端时安全降级（不抛错）
- 导入导出与云端档同构
- 装备槽兼容「对象」与「裸 id」两种历史形态，无效 id 自动清理
