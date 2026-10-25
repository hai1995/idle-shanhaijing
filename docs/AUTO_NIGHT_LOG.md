# 夜间自治优化日志

> 时段：2026-10-26 00:20 → 07:20（GMT+8）
> 规则：小步提交、每次提交前跑 `node test/engine.test.js` + `node scripts/audit-data.js` + `node scripts/build-standalone.js`，失败即回滚上一提交。
> 本次只做低风险项（性能 / 可读性 / 配置 / 测试 / 审计），玩法数值不动。

| 时间 | 模块 | 改动摘要 | 风险 | 已 push |
|---|---|---|---|---|
| 00:21 | 基线 | 起点 `815a06b`（v1.31.6）：测试 1856 全绿、审计零悬空、单文件版 1388.5 KB | — | — |
| 00:27 | 战斗 HUD | 每 250ms 的 `refreshCombatHud` 改为「值未变不写 DOM」；估值块用 cls+html 签名，避免反复重建节点 | 低 | 本批 |
| 00:45 | 死代码清理 | 删 `restoreCloudSave`（云端配置不再启动时套用后已无调用者）与 `itemFamily` 导出；新增「markIcon 字面量必须在 MARK 表内」测试（拼错会静默丢图） | 低 | 本批 |
| 00:36 | 顶栏 / 测试基建 | 增益按钮同值不写 textContent / title / classList，浮层刷新节流 1s；测试 stub 的 classList 改为真实 Set（假 `contains` 会让「已有弹窗」守卫全部误判） | 低 | 本批 |

## 待白天确认项

（夜间遇到但不宜擅自改的架构级问题记在这里，白天人工判断）

