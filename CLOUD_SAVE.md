# 云端存档接入指南

> 本文说明存档层的设计与云端接入用法。v1.1.0（山经 · 云驿）起云端存档已可用：
> 填一次端点即接入，业务层零改动；不填则与旧版完全一致（纯本地）。

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

## 三、接入步骤

### 1. 起服务端（参考实现，零依赖）

```bash
node server/cloud-save-server.js --port 8787 --token 你的令牌
# 也可用环境变量：PORT / DATA_FILE / CLOUD_TOKEN
```

- 默认只监听 `127.0.0.1`；要给别人用，请放到反代 / 内网后面，并**务必设置 token**。
- 存档落在单个 JSON 文件（`--data` 指定，原子写入），按 `rev` 做乐观并发。
- 接口契约见下表；客户端（`createCloudStore`）已按此约定实现。

### 2. 开启云端后端（设置页一键完成）

```
设置 → 存档 → 云端地址填 http(s)://… → 连接
```

等价于在控制台执行：

```js
SaveManager.setCloud({
  endpoint: 'https://api.example.com/v1',
  token: () => getAccessToken(),   // 可传字符串或取 token 的函数
});
```

配置（端点 / 令牌 / 自动同步开关）持久化在 `localStorage`（键 `shj_cloud_cfg_v1`），
下次打开页面由 `SaveManager.restore()` 自动恢复接入，无需再填。

### 3. 同步时机（已接线，无需业务层改动）

- 每次 `saveGame()` 后 `SaveManager.scheduleSync()`：停止改动约 3 秒自动上传（防抖）；
- 页面切后台（`visibilitychange`）/ 关闭（`pagehide` / `beforeunload`）时 `flushSync()` 强传一次
  （`fetch keepalive`，页面销毁后请求仍会完成，限 64KB 以内）；
- 设置页另有「立即上传 / 拉取合并 / 断开」手动入口；
- 自动同步可在设置页关闭（只存本地，不删配置）。

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
- 云端后端：**已接入**（v1.1.0）。默认不配置端点 = 纯本地；填入端点即启用，
  配置持久化于 `shj_cloud_cfg_v1`，`SaveManager.restore()` 开页自动恢复
- 元数据：`shj_zhulu_meta_v1`（`rev` 修订号 / `dirty` 脏标记 / `savedAt` / `deviceId`）
- 设备标识：`shj_device_id`（首次访问随机生成，用于多端区分与审计）
- 参考后端：`server/cloud-save-server.js`（零依赖；契约已由测试 32.5.3 真实 HTTP 覆盖）

## 六、已验证项（`test/engine.test.js` 第 28 / 32 节，全通过）

- 存档往返、版本迁移链、迁移后版本回写
- 多端合并各字段规则（经验/著录/统计/地图/背包/贝币）
- 存储后端可插拔、云端后端工厂
- 修订号自增、脏标记、设备标识
- 未接入云端时安全降级（不抛错）
- 导入导出与云端档同构
- 装备槽兼容「对象」与「裸 id」两种历史形态，无效 id 自动清理
- 云端配置持久化与开页自动恢复（setCloud / cloudConfig / restore / clearCloud）
- 防抖自动同步调度门（接入且开启才调度；关闭 / 未接入安全跳过）
- flushSync 离页强传（keepalive 透传、成功后清脏标记）
- pull 合并落本地并标记 dirty（合并结果推回云端，多端不各说各话）
- 参考后端 HTTP 契约（404 → 上传 → rev 冲突 409 → 删除）
