# Review 评审记忆

> 维护者：Review Agent ｜ 只追加，不写长篇。
> 用途：按模块记录历史缺陷类型与高发位置，决定下次先看哪里；不作为结论证据。

| 模块 | 历史缺陷类型 | 高发位置 | 建议检查 |
|---|---|---|---|
| 分数线抓取（state/status） | 运行状态漏算 skip；成功/失败语义被覆盖看板放大 | `server/src/score-lines/crawl.ts` 的 `statusOf()`、`processParsedBatches()` skip 分支 | 全 skip 重抓、rejected-only、skip+index 混合时 run/source/coverage 状态 |
| 启动迁移 | 多语句非原子；失败重跑变空操作，后续副作用不补做 | `server/src/db/migrations/*.ts`（覆盖刷新 + marker） | 注入刷新/写入失败后二次启动；marker 与数据一致性 |
| 共享归一化 | 校验做了大小写归一但落库未归一，写入后查不到 | `shared/src/score-line.ts` 的 `validateBatch` / `normalizeImportBatch` / `normalizeRegion` | 校验通过的输入是否原样落库；用例是否只测校验未测查询 |
| 自动收录判定 | 调用方把安全降级值压到阈值边界 | `server/src/score-lines/normalize.ts` confidence 截断、`decideAutoReview` 阈值 | 0.699/0.7 边界、issue 批次是否被自动 approved |
| 分数线测试 | 集成用例复刻生产路径，抓取编排无回归 | `server/src/score-lines/auto-review.cases.ts` 的 `crawlWrite()` | 用例是否调用真实 `runNext`/`processParsedBatches` |
| 产品文档（reference） | 不变量/版本快照滞后 | `docs/reference/AGENT.md`、`00-文档索引.md`、`01-项目概述.md` | 旧口径关键词（pending/复核/2.5.0）全量 grep |
| 复审记录（CR-002 返工 2026-11-26） | P1-1/P1-2 已用真实 `runNext` 与迁移失败注入用例关闭；余 P3 | `server/src/score-lines/crawl-orchestration.cases.ts`、`server/src/db/migrations/scoreline-auto-review.cases.ts` | 复审先跑 `check:scoreline` 三组；重点看全 skip、部分失败、迁移回滚/重跑、大小写 region |
