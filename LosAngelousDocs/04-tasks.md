# 04 — 任务与追溯

> 维护者：Doc 建任务；Dev 只更新状态与追溯矩阵 ｜ 状态：CR-001 任务完成 ｜ 最近更新：2026-11-26
> 任务状态只用：TODO / DOING / DONE / BLOCKED / DROPPED

### T-001 备份并移除 zxg 追踪（状态：DONE）

- 来源：CR-001 / R-001（v1）
- 关联需求：R-001 / AC-001-1、AC-001-2、AC-001-3
- 目标：备份 126 个文件到仓库外，`git rm -r zxg`，`.gitignore` 增加 `/zxg/`。
- 涉及文件/模块：`zxg/`、`.gitignore`
- 前置依赖：用户确认删除（2026-11-26）。
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`git ls-files zxg` = 0；`find zxg -type f` = 0；备份 `find | wc -l` = 126 + SHA256 清单。
- 回归范围：无业务代码；导入脚本仍可运行（源文件由用户放回）。
- 发布/回滚：回滚 = 从备份拷回 + 删除 `.gitignore` 规则 + `git add zxg`。
- 风险：Git 历史仍含旧副本；备份需妥善保管。
- 规模：S

### T-002 版本与产品文档同步（状态：DONE）

- 来源：CR-001 / R-001（v1）
- 关联需求：R-001 / AC-001-4、AC-001-5
- 目标：`2.4.0 → 2.5.0`；同步 `package-lock.json`、`docs/reference/README.md`、`00-文档索引.md`、`01-项目概述.md`、`development-history.md`。
- 涉及文件/模块：版本文件与 `docs/reference/`
- 前置依赖：T-001
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run check:version`；`npm run verify`。
- 回归范围：文档守卫、构建。
- 发布/回滚：随本次 commit；回滚 `git revert`。
- 风险：历史文档中的旧版本号按原样保留，不回写。
- 规模：S

### T-003 工作流记录与基线复验（状态：DONE）

- 来源：CR-001 / R-001（v1）
- 关联需求：R-001 / AC-001-5
- 目标：回填 `LosAngelousDocs/` 的 CR / STATUS / CHANGELOG / 决策 / 报告 / WORKLOG，并复跑 `verify`。
- 涉及文件/模块：`LosAngelousDocs/`、`PROJECT_BRAIN.md`
- 前置依赖：T-001、T-002
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run verify` EXIT=0；`$LOSSKILL_HOME/scripts/check-docs.sh LosAngelousDocs`。
- 回归范围：文档一致性。
- 发布/回滚：无。
- 风险：双轨文档需保持同步。
- 规模：S

## AC ↔ 验证追溯矩阵

| AC | 验证方式（自动化测试 / 手工步骤） | 对应任务 | 状态 |
|---|---|---|---|
| AC-001-1 | `git ls-files zxg`；`find zxg -type f` | T-001 | 已验证 |
| AC-001-2 | `grep -n '^/zxg/$' .gitignore`；放回文件后 `git status` | T-001 | 已验证 |
| AC-001-3 | 备份目录 `find | wc -l` = 126；SHA256 清单存在 | T-001 | 已验证 |
| AC-001-4 | `npm run check:version` | T-002 | 已验证 |
| AC-001-5 | `npm run verify`；文档 diff 复核 | T-002 / T-003 | 已验证 |

## CR-002 任务

> 返工记录：2026-11-26 第 1 轮（G3 不通过）。已修 P1-1（全 skip 重抓误判 failed）、P1-2（迁移覆盖刷新失败后不补刷）、P2-1~P2-4；新增真实 `enqueueCrawl`/`runNext` 编排用例与迁移故障注入用例，见 `reports/dev-2026-11-26-CR-002-分数线自动收录-返工.md`。

### T-004 共享自动收录判定与用例（状态：DONE）

- 来源：CR-002 / R-002（v1）
- 关联需求：R-002 / AC-002-1 ~ AC-002-4
- 目标：在 `shared/src/score-line.ts` 增加纯函数 `decideAutoReview({ confidence, checksum, previous })`（`previous` 含 `reviewStatus` 与历史 `checksum`），返回 `{ action:'write', reviewStatus } | { action:'skip', reason }`；补 `score-line.cases.ts` 正反例。
- 涉及文件/模块：`shared/src/score-line.ts`、`shared/src/score-line.cases.ts`
- 前置依赖：无
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run check:score`
- 回归范围：抓取、迁移、导入校验
- 发布/回滚：随 CR 提交；回滚 `git revert`
- 风险：阈值常量需单点定义（0.70）
- 规模：S

### T-005 抓取写入自动通过 / 拒绝（状态：DONE）

- 来源：CR-002 / R-002（v1）
- 关联需求：R-002 / AC-002-1 ~ AC-002-4
- 目标：`processParsedBatches()` 用 `decideAutoReview()` 写 approved / rejected；checksum 相同保留状态；低置信度不覆盖旧 approved；写结构化日志（不记录正文）。
- 涉及文件/模块：`server/src/score-lines/crawl.ts`、`server/src/score-lines/batch-store.ts`
- 前置依赖：T-004
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：临时 `DATA_DIR` 抓取夹具 / 直接调用写入；`npm run verify`
- 回归范围：抓取、覆盖刷新、查询
- 发布/回滚：随 CR 提交；回滚 `git revert`
- 风险：低置信度覆盖策略需与 AC-002-4 一致
- 规模：M

### T-006 启动迁移：存量 pending 与覆盖刷新（状态：DONE）

- 来源：CR-002 / R-002（v1）
- 关联需求：R-002 / AC-002-7
- 目标：新增幂等迁移：pending 批次按阈值转 approved / rejected；pending 招生计划转 approved；刷新受影响 `school_coverage`；写迁移计数日志。
- 涉及文件/模块：`server/src/db/migrations/*`、`server/src/score-lines/coverage.ts`
- 前置依赖：T-004
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：临时库构造 pending → 启动两次；查询覆盖与 status；`npm run verify`
- 回归范围：启动迁移、覆盖看板、查询
- 发布/回滚：迁移只改 review_status 与覆盖；回滚代码后数据保留
- 风险：覆盖刷新范围与耗时；迁移失败不能写标记
- 规模：M

### T-007 移除复核与人工导入 UI / 接口（状态：DONE）

- 来源：CR-002 / R-002（v1）
- 关联需求：R-002 / AC-002-5、AC-002-6
- 目标：删除 `ReviewView.vue`、`ImportDialog.vue` 及页面引用；移除 `/import`、`/review*` 路由与前端 API 调用；清理无用类型；页面文案改为自动收录。
- 涉及文件/模块：`web/src/views/admin/ScoreLines.vue`、`web/src/views/admin/score-lines/*`、`web/src/api/*`、`server/src/routes/admin/score-lines*`
- 前置依赖：无
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：接口 404 断言；Playwright 页面无按钮 / 无控制台错误；`npm run verify`
- 回归范围：分数线页面、抓取队列、覆盖看板
- 发布/回滚：随前端构建发布；回滚 `git revert`
- 风险：删除文件需确认无其他引用
- 规模：M

### T-008 招生计划唯一键修复（状态：DONE）

- 来源：CR-002 / R-002（v1）
- 关联需求：R-002 / AC-002-8
- 目标：唯一键补 `major_name`；更新 schema、迁移（幂等 drop/create index）、`upsertProgram` 查找条件、`scripts/scoreline-apply.ts` 查找条件。
- 涉及文件/模块：`server/src/db/schema.ts`、`server/src/db/migrations/*`、`server/src/score-lines/program-store.ts`、`scripts/scoreline-apply.ts`
- 前置依赖：无
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：空 major_code 两条不同名称 → 2 行；旧库迁移幂等；`npm run verify`
- 回归范围：招生计划、覆盖计划数
- 发布/回滚：索引迁移不可逆但数据保留；回滚代码后旧键仍可用（需保留兼容查询？）
- 风险：索引重建；存量同键同名的重复行
- 规模：M

### T-009 国家线 region 校验（状态：DONE）

- 来源：CR-002 / R-002（v1）
- 关联需求：R-002 / AC-002-9
- 目标：`validateBatch` 对 national + postgrad 要求 region ∈ {A区,B区}；更新用例；确认解析器与脚本写入合规。
- 涉及文件/模块：`shared/src/score-line.ts`、`shared/src/score-line.cases.ts`、`scripts/scoreline-apply.ts`
- 前置依赖：无
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run check:score`
- 回归范围：国家线导入 / 抓取
- 发布/回滚：随 CR 提交
- 风险：存量空 region 国家线仍不可见（本次不迁移）
- 规模：S

### T-010 文档、版本与验证（状态：DONE）

- 来源：CR-002 / R-002（v1）
- 关联需求：R-002 / AC-002-10
- 目标：同步 `docs/reference/{README,03,04,05,06,09}.md` 与 `development-history.md`；版本 v2.06；`npm run verify`；关键页面走查。
- 涉及文件/模块：`docs/reference/*`、`package.json`、`package-lock.json`
- 前置依赖：T-005 ~ T-009
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run verify`；Playwright 分数线页 / 覆盖看板 / 抓取队列
- 回归范围：文档守卫、版本、构建
- 发布/回滚：随 CR 提交；部署 `bash update.sh`
- 风险：双轨文档同步
- 规模：S

## CR-002 AC ↔ 验证追溯矩阵

| AC | 验证方式（自动化测试 / 手工步骤） | 对应任务 | 状态 |
|---|---|---|---|
| AC-002-1 | 纯函数用例 + 临时库写入后查询 | T-004 / T-005 | 已验证 |
| AC-002-2 | 纯函数用例 + rejected 查询不可见 | T-004 / T-005 | 已验证 |
| AC-002-3 | 同 checksum 重抓断言状态不变；真实编排两轮（第二轮全 skip 不判 failed、来源/覆盖不污染） | T-005 | 已验证 |
| AC-002-4 | 变更 checksum + 低置信度不覆盖 approved | T-004 / T-005 | 已验证 |
| AC-002-5 | Playwright 无复核/导入按钮；组件删除 | T-007 | 已验证 |
| AC-002-6 | 4 个旧接口 404 | T-007 | 已验证 |
| AC-002-7 | 临时库 pending 迁移两次 + 覆盖状态；覆盖刷新注入失败 → 整体回滚、移除故障重跑补刷 | T-006 | 已验证 |
| AC-002-8 | 空 major_code 两条不同名称 → 2 行 | T-008 | 已验证 |
| AC-002-9 | `check:score` 正反例；小写 `b区` 落库归一为 `B区` 且查询可见 | T-009 | 已验证 |
| AC-002-10 | `npm run verify` + 页面走查 | T-010 | 已验证 |
