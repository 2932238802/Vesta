# 04 — 任务与追溯

> 注：v2.08 起 `docs/` 已移出工作区；本文件历史条目中的 `docs/reference` 链接仅作历史，备份在 `_vesta-backups/docs-20261126-2010`。

> 维护者：Doc 建任务；Dev 只更新状态与追溯矩阵 ｜ 状态：CR-007 G2 开发完成（待评审） ｜ 最近更新：2026-11-28
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

## CR-004 任务

> 返工记录：2026-11-26 第 1 轮（G2 返工）。按两校真实页面修正：跳过「共 N 个专业（总计）」等汇总行；长春师范大学从专业名「（二年制）/（三年制）」提取学制并去掉后缀，同名专业按学制拆成两个 program；fixture 与断言改用官方真实值。见 `reports/dev-2026-11-26-CR-004-吉林校级线试点-返工.md`。
> 返工记录：2026-11-26 第 2 轮（G3 有条件通过，P2-1/P2-2）。fixture 按官方页原样（ccsfu「计算机科学与技术（二年制）」、ccit 汇总行「总计 / 共 2 个专业」）；校级源 seed 冲突时无条件保留库内 `verified`，补 seed→verified=false→再 seed 用例；顺手修孤儿 program 预校验与专业线卡片「录取最低分」文案。见 `reports/dev-2026-11-26-CR-004-吉林校级线试点-返工2.md`。
> 返工记录：2026-11-27 第 3 轮（G3 复审 P2）。ccit 汇总行补成官方 7 列（含最低分 240.5），新增「仅汇总行 + 一行真实专业」用例，证明汇总行是显式跳过而非读不到分数；业务逻辑未改。见 `reports/dev-2026-11-27-CR-004-吉林校级线试点-返工3.md`。

### T-011 `school-admit@1` 解析器与 fixture（状态：DONE）

- 来源：CR-004 / R-004（v1）
- 关联需求：R-004 / AC-004-1、AC-004-7
- 目标：新增解析器，识别两校表头（专业代号/专业名称/学制/计划数/录取数/最高分/最低分；录取专业/录取人数/投档最高/最低），输出可写库的专业行；无法识别返回 `unsupported_table`。
- 涉及文件/模块：`server/src/score-lines/parsers/{types,index,school-admit.ts}`、`__fixtures__/`
- 前置依赖：无
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run check:score` fixture 用例
- 回归范围：现有解析器不受影响
- 风险：表头别名/合并单元格
- 规模：M

### T-012 校级源 seed 与 program 写入（状态：DONE）

- 来源：CR-004 / R-004（v1）
- 关联需求：R-004 / AC-004-2、AC-004-3、AC-004-6
- 目标：seed 两条带 `school_id` 的吉林校级源（按校名查 `schools`，找不到跳过 + warning）；抓取时 upsert `school_programs` 并写 `scope='program'` 批次（最低分指标 + note）；confidence 0.9 自动 approved。
- 涉及文件/模块：`server/src/score-lines/sources.ts`、`crawl.ts`、`program-store.ts`、`parsers/types.ts`
- 前置依赖：T-011
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：临时 `DATA_DIR` + seed + 抓取 fixture；查询断言
- 回归范围：省级抓取、program 唯一键、覆盖率
- 风险：学校名匹配/专业重名
- 规模：M

### T-013 查询与专科院校提示（状态：DONE）

- 来源：CR-004 / R-004（v1）
- 关联需求：R-004 / AC-004-4、AC-004-5
- 目标：确认学校 + 专业查询能显示 programLine；选中 `level='专科'` 学校时显示说明，不展示误导性空白。
- 涉及文件/模块：`web/src/views/admin/ScoreLines.vue`、`web/src/views/admin/score-lines/*`
- 前置依赖：T-012
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：Playwright / 真实服务查询
- 回归范围：分数线查询页
- 风险：专科判定依赖 schools.level 数据
- 规模：S

### T-014 测试与文档（状态：DONE）

- 来源：CR-004 / R-004（v1）
- 关联需求：R-004 / AC-004-8
- 目标：fixture/集成用例接入 `check:score` 或 `check:scoreline`；同步 `docs/reference/README` 分数线节、03/04/05/06/09、development-history；版本 v2.07。
- 涉及文件/模块：`docs/reference/*`、`package.json`、`LosAngelousDocs/*`
- 前置依赖：T-011 ~ T-013
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run verify` + 页面走查
- 回归范围：文档/版本/构建
- 风险：双轨文档同步
- 规模：S

## CR-004 AC ↔ 验证追溯矩阵

| AC | 验证方式（自动化测试 / 手工步骤） | 对应任务 | 状态 |
|---|---|---|---|
| AC-004-1 | `school-admit.cases.ts` 解析两校 fixture，行数 / 字段数值断言 | T-011 | 已验证 |
| AC-004-2 | 隔离 `DATA_DIR` 真实抓取后 `school_programs` 行数与字段；重复抓取行数不变 | T-012 | 已验证 |
| AC-004-3 | 批次 `scope='program'` / `approved`，指标 `total + admit`，note 含计划 / 录取 / 最高 | T-012 | 已验证 |
| AC-004-4 | `queryScoreLines` 两校 + 专业返回 `programLine` 与 `minimums` 数值 | T-012 / T-013 | 已验证 |
| AC-004-5 | 专科院校 `school.level='专科'` 返回；Playwright 走查：提示文案、无空卡、390px 无横向溢出、控制台 0 error（`reports/doc-2026-11-27-CR-004-页面走查.md`） | T-013 | 已验证 |
| AC-004-6 | 学校未导入时 seed 不写校级源；导入后写带 `school_id` 的源 | T-012 | 已验证 |
| AC-004-7 | 无表头 fixture 返回 `unsupported_table`；重抓 approved 不降级 | T-011 | 已验证 |
| AC-004-8 | `npm run verify` EXIT=0；`check:scoreline` 新增用例；文档与 v2.07 同步 | T-014 | 已验证 |

## CR-003 任务

### T-015 删除 docs/ 并核验备份（状态：DONE）

- 来源：CR-003 / R-003（v1）
- 关联需求：R-003 / AC-003-1
- 目标：确认仓库外备份 158 文件 + SHA256；`git rm -r docs`；复核工作区与索引均为 0。
- 前置依赖：用户授权（已有）。
- 验证方式：`find docs -type f`=0；`git ls-files docs`=0；备份计数 158。
- 规模：S

### T-016 重写 check-docs / check-version 与引用（状态：DONE）

- 来源：CR-003 / R-003（v1）
- 关联需求：R-003 / AC-003-2~4
- 目标：重写两个脚本为 LosAngelousDocs 版本；更新 AGENTS/CLAUDE/PROJECT_BRAIN/DOCS_CONTRACT/00-overview/03-design 等当前文档；`grep` 确认当前文档无 docs/ 硬指针（历史报告除外）。
- 前置依赖：T-015
- 验证方式：`npm run check:docs` / `check:version`；grep。
- 规模：M

### T-017 版本、验证与 CI（状态：DONE）

- 来源：CR-003 / R-003（v1）
- 关联需求：R-003 / AC-003-5、AC-003-6
- 目标：版本 v2.08；CHANGELOG/STATUS 同步；`npm run verify`；等待 CI success；不提交（由主会话提交）。
- 前置依赖：T-015、T-016
- 验证方式：`npm run verify`；CI API。
- 规模：S

## CR-003 AC ↔ 验证追溯矩阵

| AC | 验证方式 | 对应任务 | 状态 |
|---|---|---|---|
| AC-003-1 | `git ls-files docs`=0；备份 158 + SHA256 158 OK | T-015 | 已验证 |
| AC-003-2 | `check:docs` EXIT=0；脚本不读 docs | T-016 | 已验证 |
| AC-003-3 | `check:version` 2.8.0↔v2.08 | T-016/T-017 | 已验证 |
| AC-003-4 | grep 当前文档无必须存在的 docs/ 指针 | T-016 | 已验证 |
| AC-003-5 | `npm run verify` EXIT=0；CI 由主会话推送后触发 | T-017 | 已验证（本地；CI 待触发） |
| AC-003-6 | diff 无业务行为变化 | T-015~T-017 | 已验证 |

## CR-005 任务

### T-018 前端删副标题、三按钮与相关 UI（状态：DONE）

- 来源：CR-005 / R-005（v1）
- 关联需求：R-005 / AC-005-1、AC-005-2、AC-005-4
- 目标：ScoreLines 顶部只留标题；删三个按钮、CoverageView/队列 modal、crawl/queue/coverage 状态与轮询；清理 API 方法与类型。
- 验证：build/typecheck；Playwright 页面无按钮/副标题、查询可用。
- 规模：M

### T-019 后端删除手动 crawl/sources/coverage 接口（状态：DONE）

- 来源：CR-005 / R-005（v1）
- 关联需求：R-005 / AC-005-3
- 目标：删除 `score-lines-crawl.ts` 挂载/文件与 `/score-lines/coverage` 路由；保留调度器/内部模块；旧接口 404。
- 验证：临时服务 404 断言；调度器代码路径不变；verify。
- 规模：M

### T-020 吉林两校服务器导入脚本（状态：DONE）

- 来源：CR-005 / R-005（v1）
- 关联需求：R-005 / AC-005-5、AC-005-6
- 目标：新增 `scripts/import-jilin-school-lines.ts`；dry-run/`--write`；两校官方页；upsert program/批次；VACUUM 备份；幂等；失败不写。
- 验证：隔离 DATA_DIR + 官方页/fixture；dry-run 不写；write 后查询 244/240.51445096；重复写幂等。
- 规模：M

### T-021 文档、版本与验证（状态：DONE）

- 来源：CR-005 / R-005（v1）
- 关联需求：R-005 / AC-005-7
- 目标：v2.09；STATUS/CHANGELOG/项目大脑；`npm run verify`；CI。
- 规模：S

## CR-005 AC ↔ 验证追溯矩阵

| AC | 验证方式 | 对应任务 | 状态 |
|---|---|---|---|
| AC-005-1 | Playwright 无副标题；查询正常 | T-018 | 已验证（代码走查：`AdminPageHeader` 仅 title/eyebrow；查询 200） |
| AC-005-2 | 页面无三按钮；grep 无组件引用；build | T-018 | 已验证（grep 0 引用；`CoverageView.vue` 已删；typecheck/build 通过） |
| AC-005-3 | 临时服务旧接口全 404；调度器保留 | T-019 | 已验证（7 个旧接口全 404；query/facets 200；调度器与 `crawl.ts` 未改） |
| AC-005-4 | typecheck/check:size | T-018 | 已验证（typecheck 通过；check:size 通过） |
| AC-005-5 | 脚本 dry-run/write/备份/幂等 | T-020 | 已验证（dry-run 不建库；write 备份 12 条；二次 0 写 12 跳过且不新增备份；DB 不存在/院校缺失/403 均非 0 且不建库；失败路径无 vesta.db/-wal/-shm） |
| AC-005-6 | 隔离 DATA_DIR 两校 2+10 行、查询可见 | T-020 | 已验证（`check:import-jilin` 2+10；240.5 / 240.51445096） |
| AC-005-7 | verify + CI | T-021 | 已验证（本地 `npm run verify` EXIT=0；CI 由主会话推送后触发） |

## CR-006 任务

### T-022 启动自愈与 queued 续跑（状态：DONE）

- 来源：CR-006 / R-006（v1）
- 关联需求：R-006 / AC-006-1
- 目标：新增 recover 模块；启动时 running→failed（stale），queued 自动 runNext；scheduler 顺序调整。
- 涉及文件/模块：`server/src/score-lines/crawl-recovery.ts`、`server/src/index.ts`
- 验证：临时库构造 running/queued，启动恢复断言；调度器可继续排队（`check:crawl`）。
- 结果：running→failed 且 message 以 `stale:` 开头；queued 续跑 success/saved=1；恢复后无 queued/running 残留。
- 规模：M

### T-023 单源预算、deadline 与重试（状态：DONE）

- 来源：CR-006 / R-006（v1）
- 关联需求：R-006 / AC-006-2、AC-006-3
- 目标：单源 10 页上限；deadline 每页检查；fetch 网络/429/5xx 退避重试，403/404 不重试，Retry-After 上限。
- 涉及文件/模块：`server/src/score-lines/crawl.ts`、`server/src/score-lines/crawl-fetch.ts`
- 验证：本地 HTTP 夹具延迟/500/429；页数/时限断言（`check:crawl`）。
- 结果：入口 + 9 链接停在 10 页并写单源 detail；注入 500ms deadline 时入口取完即停、写 `budget:` detail，单页超时受剩余时间约束；多源预算用尽后第 4 个来源保持未尝试（不写 failed / 不刷新 `last_run_at`）；500→200、429 Retry-After（秒/HTTP 日期/无头默认/60s 上限）、网络错误各重试；403/404 与 `assertSafeUrl` 失败不重试。
- 规模：M

### T-024 快照每日清理与状态 CLI（状态：DONE）

- 来源：CR-006 / R-006（v1）
- 关联需求：R-006 / AC-006-4、AC-006-5
- 目标：24h prune；新增只读 `scripts/scoreline-crawl-status.ts`。
- 涉及文件/模块：`server/src/index.ts`、`server/src/score-lines/crawl-scheduler.ts`、`scripts/scoreline-crawl-status.ts`
- 验证：prune 行为用例 + CLI 输出断言（只读）（`check:crawl`）。
- 结果：启动 prune + 24h `setInterval(...).unref()`；`pruneCrawlDocuments` 改分批「删文件 → 删对应行」；用例覆盖 1005 个旧文件 + 空路径 + 不可删目录（共 1007 行）全删、新行/新文件保留、结构化批次数不变；CLI 输出 running/queued/stale、来源状态与下次到期、最近 run；主库 hash/mtime 不变；缺库非 0 且提示清晰。
- 规模：S

### T-025 测试、文档与版本（状态：DONE）

- 来源：CR-006 / R-006（v1）
- 关联需求：R-006 / AC-006-6、AC-006-7
- 目标：用例接入 check；v2.10；STATUS/CHANGELOG/大脑。
- 涉及文件/模块：`server/src/score-lines/crawl-reliability.cases.ts`、`package.json`、`LosAngelousDocs/*`、`PROJECT_BRAIN.md`
- 验证：`npm run check:crawl`；`npm run verify`；CI。
- 结果：新增 `check:crawl` 并接入 `verify`；7 节用例（自愈、单源预算、多源预算、deadline、重试边界、prune、CLI）；版本 2.10.0 / v2.10；文档与大脑同步；本地 verify EXIT=0（CI 待推送后触发）。
- 规模：S

## CR-006 AC ↔ 验证追溯矩阵

| AC | 验证方式 | 对应任务 | 状态 |
|---|---|---|---|
| AC-006-1 | 临时库 running/queued 启动恢复（`check:crawl` 第 1 节） | T-022 | 已验证 |
| AC-006-2 | 本地 HTTP 多页/延迟：10 页上限、多源 30 页后第 4 源未尝试、deadline 每页检查（`check:crawl` 第 2/3/4 节） | T-023 | 已验证 |
| AC-006-3 | 500→200、429 Retry-After（秒/HTTP 日期/无头默认/60s 上限/非法值）、网络错误重试 2 次、403/404 与 assertSafeUrl 不重试（`check:crawl` 第 5 节） | T-023 | 已验证 |
| AC-006-4 | 启动 prune + 24h 定时器；1005 旧文件 + 空路径 + 不可删目录共 1007 行分批清理，新行/文件保留，结构化批次不变（`check:crawl` 第 6 节） | T-024 | 已验证 |
| AC-006-5 | CLI 只读输出关键字段、主库 hash/mtime 不变、缺库提示（`check:crawl` 第 7 节） | T-024 | 已验证 |
| AC-006-6 | 用例覆盖自愈/续跑/单源/多源预算/deadline/重试边界/prune/CLI，接入 `check:crawl` 并纳入 `verify` | T-025 | 已验证 |
| AC-006-7 | `npm run verify` EXIT=0；CI 46103081417 success；版本 v2.10 | T-025 | 已验证 |

## CR-007 任务

> 返工记录：2026-11-28 第 1 轮（G3 有条件通过，P2-1 / P2-2 + P3）。补齐内网判定编码变体（IPv4-mapped / `0.0.0.0` / `::` / NAT64）；多表重复 issue 写入 `crawl_documents.note` + `scoreline.parse_issue` 日志；补非法/缺失 Location、HTTPS→HTTP 拒绝、引导页第二跳 403 用例；document 记最终 URL 与真实 401/403。见 `reports/dev-2026-11-28-CR-007-抓取安全与解析去重-返工.md`。

### T-026 逐跳重定向与下载限流（状态：DONE）

- 来源：CR-007 / R-007（v1）
- 关联需求：R-007 / AC-007-1、AC-007-2
- 目标：fetchResource 手动 redirect ≤5，每跳 assertSafeUrl；Content-Length 预检 + 流式 10MB 中止；循环/非法 Location 明确失败。
- 验证：本地 HTTP 重定向/私网/超大流夹具；请求次数断言。
- 结果：`redirect:'manual'` + 最多 5 跳；每跳先 `assertSafeUrl`（抽出纯函数 `isPrivateHostname`，覆盖 IPv4 回环 / RFC1918 / CGNAT / `0.0.0.0`，IPv6 `::` / `::1` / `fc00::/7` / `fe80::/10` / 组播、IPv4-mapped / IPv4-compatible / NAT64）；私网 Location 在第二次请求前拒绝（`/ssrf/internal` 命中 0 次，含 `[::ffff:127.0.0.1]` 变体）；循环 / 超 5 跳 / 缺失或非法 Location / 生产 HTTPS→HTTP 降级均明确失败；相对 Location 解析与正常 301/302 跳转可用；`Content-Length > 10MB` 直接拒绝，无长度时流式累计 >10MB 中止（`/size/stream` 不等待整包）。返回新增 `finalUrl`，`crawl_documents.url` 记实际最终地址，不破坏现有调用方。
- 规模：M

### T-027 403 失败码与提示（状态：DONE）

- 来源：CR-007 / R-007（v1）
- 关联需求：R-007 / AC-007-3
- 目标：401/403 → `blocked`，不重试；共享 hints 与 source/run 错误一致。
- 验证：本地 403 夹具；失败码/hints 断言。
- 结果：`CrawlFailureCode` / `CRAWL_FAILURE_HINTS` / `crawlFailureHint` 增加 `blocked`；`blockedStatusOf()` 把 401/403 映射 `blocked`（含引导页第二跳），不重试；`crawl_documents.error`、run message、来源 `last_error` 均以 `blocked:` 开头，提示换官方 JSON / 本地 HTML / 人工核验入口；`crawl_documents.http_status` 记真实 401/403。
- 规模：S

### T-028 多表指标去重（状态：DONE）

- 来源：CR-007 / R-007（v1）
- 关联需求：R-007 / AC-007-4
- 目标：html 解析跨表按唯一键去重，保留第一条并记 issue；不抛唯一键错误。
- 验证：多表重复/不同值 fixture；批次写入断言。
- 结果：`dedupeTableMetrics()` 按 `subjectCode|isMinimum|minimumType` 跨表去重，保留第一条并追加 `duplicate_table_metric` issue（含两条值）；成功抓取时 issues 合并进 `crawl_documents.note`（截断）并写 `scoreline.parse_issue` 结构化日志；真实抓取重复总分行写入成功、指标仅 1 条、`parse_status=parsed`、note 含 duplicate issue 且无 network / 唯一键误报。
- 规模：M

### T-029 测试、文档与版本（状态：DONE）

- 来源：CR-007 / R-007（v1）
- 关联需求：R-007 / AC-007-5~7
- 目标：用例接入；v2.11；STATUS/CHANGELOG/大脑。
- 验证：`npm run verify`；CI。
- 结果：`check:score` 新增多表去重用例；`check:crawl` 新增重定向 / 限流 / blocked / 多表写入 4 节用例；`npm run verify` EXIT=0；版本 2.11.0 / v2.11；CHANGELOG、STATUS、00-overview、03-design、05-decisions、PROJECT_BRAIN 已同步。
- 规模：S

## CR-007 AC ↔ 验证追溯矩阵

| AC | 验证方式 | 对应任务 | 状态 |
|---|---|---|---|
| AC-007-1 | 私网重定向 / IPv4-mapped / 循环 / 超 5 跳 / 非法 Location，0 内网请求（`check:crawl` 5b） | T-026 | 已验证 |
| AC-007-2 | Content-Length / 流式 >10MB 中止（`check:crawl` 5c） | T-026 | 已验证 |
| AC-007-3 | 403 → blocked，不重试，hints；含引导页第二跳 403（`check:crawl` 5d） | T-027 | 已验证 |
| AC-007-4 | 多表重复去重 + issue 写入 note / 日志，无库错误（`check:score` + `check:crawl` 5e） | T-028 | 已验证 |
| AC-007-5 | 正常跳转 / 分派 / 预算回归（`check:score` / `check:crawl` / `check:scoreline`） | T-026~T-028 | 已验证 |
| AC-007-6 | 用例接入 `check:score` / `check:crawl` | T-029 | 已验证 |
| AC-007-7 | `npm run verify` EXIT=0；版本 v2.11；CI 待推送后触发 | T-029 | 已验证（本地；CI 待触发） |
