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
| 校级线解析 / 抓取（CR-004 2026-11-26） | 测试 fixture 与官方页不完全一致（专业名截断、汇总行结构不同）；seed 重启覆盖管理员 `verified=false`；页面类 AC 只有构建/源码证据 | `server/src/score-lines/parsers/__fixtures__/*`、`server/src/score-lines/sources.ts` 的 `ON CONFLICT` 分支、`LosAngelousDocs/04-tasks.md` 矩阵 | 下次先 curl 官方页逐行核对 fixture；重点看 seed `verified/entry_url` 条件、`programLine` 最低分、AC 矩阵是否与运行时证据一致 |
| 专业线查询（CR-004 2026-11-26） | 暂无功能缺陷；`programLine` 纳入最低分、`buildSeries` 跳过最低分、专业线不套主线 category/track | `server/src/score-lines/query.ts` 的 `buildLine` / `buildSeries` / `programBatches` | 复审跑 `check:scoreline` 的 school-admit 组，并手工查询两校专业线是否只出现一行「录取最低分」 |
| 复审记录（CR-004 P2 返工2 2026-11-27） | P2-2 seed verified、P3-3 孤儿 program 预校验、P3-4 LineCard 文案已修并验证；P2-1 只修一半——ccit 汇总行 fixture 缺官方数值列，汇总行跳过用例成假绿；UAT 补 AC-004-5 | `server/src/score-lines/parsers/__fixtures__/ccit.html:12`、`school-admit.cases.ts:66`、`sources.ts:234` | 复审先核对官方汇总行 7 列与 fixture；补最低分 240.5 或断言 `issues` 为空；UAT 截图补提示卡区域 |
| 最终确认（CR-004 P2 返工3 2026-11-27） | P2-1 已关闭：ccit 汇总行为官方 7 列（含 240.5），新增 `issues.length===0` 与「表头+汇总行+一行专业→1 批」强断言；全绿 | `server/src/score-lines/parsers/__fixtures__/ccit.html:12`、`school-admit.cases.ts:72-88` | 后续同类 fixture 必须保留可读最低分，避免「读不到分数」掩盖汇总行识别失效 |
| 文档守卫 / 版本源迁移（CR-003 2026-11-27） | 入口文档 `verify` 枚举不一致；架构文档解析器计数滞后；历史 R/T 仍留 docs/reference 指针 | `AGENTS.md:47`、`PROJECT_BRAIN.md:73`、`LosAngelousDocs/02-architecture.md:47`、`01-requirements.md`/`04-tasks.md` 历史 CR 段 | 下次先对齐 `package.json:29` 的 verify 全串；用 `parsers/index.ts` 核准解析器数量；历史段加「docs 已于 v2.08 移出」提示；复核 `check-version` 的 STATUS 读取容错 |
