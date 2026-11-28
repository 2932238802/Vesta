# 01 — 需求与验收标准

> 注：v2.08 起 `docs/` 已移出工作区；本文件历史条目中的 `docs/reference` 链接仅作历史，备份在 `_vesta-backups/docs-20261126-2010`。

> 维护者：Doc Agent ｜ 状态：CR-006 G3 不通过，Dev 返工完成待复审（CR-005 G4 已通过） ｜ 最近更新：2026-11-28
> 需求变更只升版（`R-xxx v2`），旧版内容保留在「变更历史」，不覆盖。

### R-001 仓库不再携带真实咨询稿（优先级 P0，版本 v1）

- 来源：CR-001
- 背景：`zxg/` 126 份真实学员咨询稿被 Git 跟踪，违反仓库隐私约定。
- 描述：删除工作区中的 `zxg/` 并取消 Git 追踪；`.gitignore` 拦截该目录；删除前在仓库外完成可校验备份；产品版本与相关文档同步到 v2.05。
- 成功指标：仓库索引与工作区均无 `zxg/`；备份 126 文件且 SHA256 清单存在；`npm run verify` EXIT=0。
- 验收标准：
  - AC-001-1 `git ls-files zxg` 输出为空，`find zxg -type f` 无结果。
  - AC-001-2 `.gitignore` 含 `/zxg/`；放回本地 DOCX 不会出现在 `git status`。
  - AC-001-3 仓库外备份目录含 126 个文件（6.7 MB）与逐文件 SHA256 清单。
  - AC-001-4 根 `package.json`、`package-lock.json`、`docs/reference/README.md` 版本一致为 `2.5.0` / `v2.05`。
  - AC-001-5 `npm run verify` EXIT=0；`docs/reference/00-文档索引.md` 与 `01-项目概述.md` 的版本快照与 `zxg` 状态已订正。
- NFR 影响：隐私（必须）；安全（不新增暴露面）；兼容（导入脚本不变，源文件由用户本地持有）；成本（无）。
- 影响面：`zxg/`、`.gitignore`、`package.json`、`package-lock.json`、`docs/reference/{README,00-文档索引,01-项目概述,development-history}.md`、`LosAngelousDocs/`。
- 不在范围内：Git 历史重写；数据库咨询树 / 运行记录；业务代码。
- 变更历史：v1 2026-11-26 初始

### R-002 分数线按置信度自动收录，移除人工复核与人工导入（优先级 P0，版本 v1）

- 来源：CR-002
- 背景：抓取默认 pending + 人工复核是当前主要瓶颈；每次抓取还会把 approved 打回 pending。用户要求高置信度直接入库、不再人工。
- 描述：抓取写入按 confidence ≥0.70 自动 approved、<0.70 自动 rejected；checksum 未变时保留既有审核状态；移除后台复核与人工导入的 UI / HTTP 接口；启动时迁移存量 pending；修复招生计划唯一键与考研国家线 region 校验。
- 成功指标：高置信度数据抓完即可查询；后台无复核 / 人工导入入口；重抓不降级 approved；迁移后覆盖看板与查询一致。
- 验收标准：
  - AC-002-1 新唯一键批次 `confidence >= 0.70` → 写入 `approved`，`GET /score-lines/query` 立即可见，复核队列不再出现。
  - AC-002-2 新唯一键批次 `confidence < 0.70` → 写入 `rejected`，查询不可见、覆盖不计 pending；记录、来源、失败原因保留供排查。
  - AC-002-3 同一唯一键重抓且 checksum 相同：既有 `approved` 保持 `approved`，既有 `rejected` 保持 `rejected`，既有 `pending` 按阈值迁移；不因重抓改变状态。
  - AC-002-4 同一唯一键重抓且 checksum 变化：高置信度 → `approved`；低置信度且此前为 `approved` → **不覆盖旧 approved**，保留旧值并写结构化日志（防止数据消失）；低置信度且无旧 approved → `rejected`。
  - AC-002-5 后台不再出现「复核」「人工导入」按钮 / 弹窗 / 计数；对应前端组件与 API 调用移除。
  - AC-002-6 `POST /api/admin/score-lines/import`、`GET /api/admin/score-lines/review`、`GET /api/admin/score-lines/review/count`、`POST /api/admin/score-lines/review` 返回 404（路由已移除）。
  - AC-002-7 启动迁移：现有 `pending` 批次按 confidence ≥0.70 → approved、<0.70 → rejected；现有 `pending` 招生计划按 trusted → approved；迁移标记幂等（重启不重复处理）；受影响学校的 `school_coverage` 重新计算，不再残留 pending。
  - AC-002-8 `school_programs` 唯一键补 `major_name`；空 `major_code`、不同专业名可同时存在；`upsertProgram` 与 `scripts/scoreline-apply.ts` 使用新键；迁移可重复执行且不丢存量。
  - AC-002-9 `validateImportPayload` 对 `scope=national + exam=postgrad` 要求 `region` 为 A区 / B区；解析器已按 A/B 写入不受影响；正反用例更新。
  - AC-002-10 `docs/reference/` 的抓取 / 导入 / 复核 / 数据模型 / 接口契约 / 测试步骤同步到新口径；`npm run verify` EXIT=0；关键页面手工走查。
- NFR 影响：兼容（存量库迁移）、可观测（自动通过 / 拒绝 / 跳过覆盖 / 迁移计数日志）、性能（只处理 pending + 受影响覆盖）、隐私与安全不新增外泄。
- 影响面：`server/src/score-lines/*`、`server/src/routes/admin/score-lines*`、`server/src/db/migrations*`、`shared/src/score-line*`、`web/src/views/admin/ScoreLines.vue`、`web/src/views/admin/score-lines/*`、`web/src/api/*`、`docs/reference/*`、`scripts/scoreline-apply.ts`。
- 不在范围内：抓取 running 残留自愈、快照定时清理、种子覆盖 URL、重定向 SSRF、facets / minimums / 前端竞态。
- 变更历史：v1 2026-11-26 初始（G0 已确认）

### R-004 吉林校级线试点：接收本科院校的专升本专业最低分（优先级 P1，版本 v1）

- 来源：CR-004
- 背景：当前只有省控线 / 国家线源，没有校级源；专科院校没有自己的专升本院校线，缺的是接收本科院校的专业投档最低分。
- 描述：新增 `school-admit@1` 解析器与两条带 `school_id` 的吉林校级源，抓取长春工程学院、长春师范大学官方招生页的「专业 / 人数 / 最高分 / 最低分」表；写入 `school_programs` 与 `scope='program'` 批次；查询页按学校 + 专业看到最低投档分，最高分/人数写备注；专科院校查询时给出说明。
- 成功指标：两校官方页面可重复解析；每个专业生成一条 program 批次（最低分）与对应 `school_programs`；查询可见；不产生假校线；`npm run verify` EXIT=0。
- 验收标准：
  - AC-004-1 `school-admit@1` 能解析两校官方表格：长春工程学院 2 个专业（工程管理 / 计算机科学与技术，含专业代号、学制、计划数、录取数、最高/最低分）；长春师范大学 10 个专业（含录取数、最高/最低分）；fixture 用例通过。
  - AC-004-2 抓取写入 `school_programs`：majorName、majorCode（有则写）、degreeType（两年制/三年制）、planCount（计划数；无计划列时留空），按新唯一键幂等 upsert；重复抓取不重复插行。
  - AC-004-3 每个专业写入 `scoreline_batches`：`scope='program'`、`exam='upgrade'`、`province='吉林'`、`schoolId`、`programId`、`category=学制`；指标 `total` + `is_minimum=1` + `minimum_type='admit'` 取最低分；最高分/录取数/计划数写 note；官方页面 confidence 0.9 → 自动 approved（CR-002 规则）。
  - AC-004-4 `GET /score-lines/query` 选长春工程学院 + 计算机科学与技术（2026）能看到专业线；选长春师范大学 + 汉语言文学能看到对应最低分；数值与官方页面一致。
  - AC-004-5 选中专科院校（如吉林电子信息职业技术学院）时，查询页显示「该校为专科院校，不设专升本院校线；请选择接收本科院校」，不展示误导性的“未收录”空白。
  - AC-004-6 两校 seed 源带 `school_id`；若 `schools` 未找到对应学校，启动时跳过并 warning，不写错校。
  - AC-004-7 无法识别的表头返回 `unsupported_table`，不写伪数据；重复抓取 approved 不降级（沿用 CR-002）。
  - AC-004-8 `npm run verify` EXIT=0；新增 fixture / 用例接入 `check:score` 或 `check:scoreline`；文档与版本 v2.07 同步。
- NFR 影响：来源可追溯、幂等、低置信度不覆盖、无新依赖；性能为单页 2 所学校，可忽略。
- 影响面：`server/src/score-lines/parsers/*`、`crawl.ts`、`sources.ts`、`program-store.ts`、`shared/src/score-line*`（如需要类型）、`web/src/views/admin/ScoreLines.vue`、`docs/reference/*`、fixtures。
- 不在范围内：吉林全部本科院校；聚合站数据；专科升学喜报；docx 招生计划；人工导入；其他省。
- 变更历史：v1 2026-11-26 初始（G0 已确认：2 所 / 最低分 + 人数最高分备注）

### R-003 删除 `docs/` 并把文档/版本守卫迁到 LosAngelousDocs（优先级 P1，版本 v1）

- 来源：CR-003
- 背景：用户要求删除 `docs/`；当前 `check:docs` / `check:version`、AGENTS/CLAUDE 均硬依赖 docs/reference，必须同步改。
- 描述：删除 docs/（备份已在仓库外）；重写 check-docs 为工作流文档守卫；重写 check-version 以 STATUS 为版本源；更新所有当前文档指针；版本 v2.08；不改变业务代码行为。
- 成功指标：docs/ 不在工作区；`npm run check:docs` / `check:version` 通过；`npm run verify` EXIT=0；CI 通过。
- 验收标准：
  - AC-003-1 `git ls-files docs` 为 0、工作区无 `docs/`；备份 `_vesta-backups/docs-20261126-2010` 含 158 文件与 SHA256 清单。
  - AC-003-2 `scripts/check-docs.mjs` 不再读 `docs/reference`；校验 `AGENTS.md` / `CLAUDE.md` / `PROJECT_BRAIN.md` / `LosAngelousDocs/{DOCS_CONTRACT,STATUS,00-requirements-intake,01-requirements,04-tasks}.md` 存在且关键指针存在；`npm run check:docs` EXIT=0。
  - AC-003-3 `scripts/check-version.mjs` 以 `LosAngelousDocs/STATUS.md`「当前产品版本：vX.Y」为源；`package.json=2.8.0` 与 `v2.08` 相等；不再读 docs/reference。
  - AC-003-4 `AGENTS.md` / `CLAUDE.md` / `PROJECT_BRAIN.md` / `DOCS_CONTRACT.md` / `00-overview.md` / `03-design.md` 不再把 docs/ 作为当前唯一口径；历史报告中的 docs/ 链接按历史保留。
  - AC-003-5 `npm run verify` EXIT=0；CI `Build web dist` success。
  - AC-003-6 不改业务代码行为、不新增依赖、不删除 Git 历史、不触碰 `data/`/`.env`/`zxg`。
- 不在范围内：重写 Git 历史；把 docs 内容迁入 LosAngelousDocs；恢复问卷设计覆盖守卫（已随 docs 删除）。
- 变更历史：v1 2026-11-27 初始（用户此前已确认直接删除）

### R-005 前端只保留查询，移除人工抓取入口与说明副标题；吉林两校服务器导入（优先级 P1，版本 v1）

- 来源：CR-005
- 背景：前端仍有三个手动入口和顶部说明；用户要求抓取/导入全部在后台，吉林数据用服务器脚本导入。
- 描述：删除顶部副标题；删除三个按钮及相关弹窗/组件/API；删除后端手动 crawl/sources/coverage 接口；新增两校导入脚本（默认 dry-run，`--write` 落库，写前备份）。
- 成功指标：页面上只剩筛选与查询；手动接口 404；脚本可 dry-run/write、幂等；verify/CI 绿。
- 验收标准：
  - AC-005-1 `ScoreLines.vue` 顶部副标题删除；筛选栏与空状态的必要提示保留；页面标题/查询功能不变。
  - AC-005-2 页面无「抓取队列」「覆盖看板」「立即抓取本省」按钮；`CoverageView.vue` 及相关 modal/状态/轮询/队列函数移除；`web/src` 无残留引用；build/typecheck 通过。
  - AC-005-3 后端 `POST /score-lines/crawl`、`/crawl/queue` GET/DELETE、`/crawl/runs/:id`、`/score-lines/sources` GET/POST、`/score-lines/coverage` 均 404；内部 `startScorelineScheduler` / `enqueueCrawl` / `runNext` 与种子保留，自动调度仍可用。
  - AC-005-4 前端 API 方法与类型清理；无未使用 import；`npm run check:size` / typecheck 通过。
  - AC-005-5 新增 `scripts/import-jilin-school-lines.ts`：默认 dry-run 打印两校解析行数/字段；`--write` 先 `VACUUM INTO` 备份，再 upsert `school_programs` + program 批次、刷新覆盖；重复执行幂等、approved 不降级；学校缺失或页面失败时退出非 0 且不写库。
  - AC-005-6 脚本在隔离 `DATA_DIR` 下用两校官方页面（或本地 HTTP fixture）验证：长春工程学院 2 条、长春师范大学 10 条；写入后查询可见；dry-run 不写库。
  - AC-005-7 `npm run verify` EXIT=0；CI success；版本 v2.09；文档/STATUS/CHANGELOG 同步。
- 不在范围内：后台调度器删除；查询返回的 coverage 摘要；解析器规则；人工导入恢复；其他省。
- 变更历史：v1 2026-11-27 初始（G0 已确认）

### R-006 抓取调度可靠性（优先级 P0，版本 v1）

- 来源：CR-006
- 背景：自动调度是唯一入口；running/queued 残留、单源吃满预算、无重试、快照只在启动清理，都会导致停抓或抓不完。
- 描述：启动自愈 + 按源预算 + 瞬时重试 + 每日快照清理 + 只读状态 CLI；不改变解析/自动收录口径。
- 成功指标：重启后自动续跑；单源不超 10 页；瞬时错误重试；快照每日清理；CLI 可看状态。
- 验收标准：
  - AC-006-1 启动时 `running` 遗留标 `failed`（message 以 `stale:` 开头），`queued` 存在时自动 `runNext()`；scheduler 不再被残留永久阻塞。
  - AC-006-2 单源页数上限 10；整轮仍 30；deadline 在每页检查，超时停止当前源并写 `budget` detail；其他源仍按剩余时间尝试。
  - AC-006-3 `fetchResource` 对网络错误/429/5xx 重试 2 次（1s/3s），429 尊重 `Retry-After` ≤60s；403/404 不重试；重试写结构化日志。
  - AC-006-4 `pruneCrawlDocuments(90)` 启动执行一次，并每 24h 执行；只删快照与文档行，不删结构化分数线。
  - AC-006-5 `scripts/scoreline-crawl-status.ts` 只读输出 running/queued/stale、各源 last_status/last_error/next due、最近 run；不写库、不打印正文/密钥。
  - AC-006-6 新增用例覆盖：启动恢复、queued 续跑、单源页数上限、deadline、重试/不重试、prune；接入 `check:scoreline` 或新 `check:crawl`。
  - AC-006-7 `npm run verify` EXIT=0；版本 v2.10；CI success。
- 不在范围内：按源独立队列、多实例、代理/验证码、校级源扩展、解析器改造、前端覆盖看板。
- 变更历史：v1 2026-11-27 初始（G0 已确认）
