# Vesta — 项目大脑

> 所有 Agent 开工第 0 步读本文件；只读与任务相关的模块卡，不要通读全仓库。
> 状态：L2（2026-11-26 初始化；2026-11-28 v2.10 `npm run verify` EXIT=0）
> 维护：稳定事实由 Doc 更新；增量由 Steward 在 G2.5 合并；代码级细节不写进来。

## 1. 一分钟地图

- 一句话：邀请制的「大学现状自评」系统——学员填 28 题问卷、AI 生成个性化报告；咨询师在后台看名单、写咨询稿、查分数线与知识库。
- 入口：`server/src/index.ts`（单 Node 进程同时服务 `/api`、`/api/admin` 和 `web/dist`）。
- 运行方式：`npm install` → `npm run dev`（后端 `8788` + Vite `5173`）；生产 `bash update.sh`。
- 产品文档根目录：已移出工作区（v2.08）；原 `docs/` 备份在 `D:/PROJECT/_vesta-backups/docs-20261126-2010`，历史可从 Git 查看。
- 工作流文档根目录：`D:/PROJECT/Vesta/LosAngelousDocs`
- 文档树契约：`LosAngelousDocs/DOCS_CONTRACT.md`
- LosSKILL 路径（`$LOSSKILL_HOME`）：`D:/PROJECT/LosSKILL`（所有脚本用 `$LOSSKILL_HOME/scripts/...`）
- 技术栈：Node 24 + Express + SQLite（`node:sqlite`，WAL）+ TypeScript/tsx；Vue 3 + Vue Router + Vite。

## 2. 架构与边界

| 模块 | 路径 | 职责 | 不负责 |
|---|---|---|---|
| 进程装配 | `server/src/index.ts` | 中间件、路由挂载、静态站点、启动任务 | 业务规则 |
| 公开 API | `server/src/routes/public.ts` | health、邀请、提交、报告轮询/重试/领取、events | 后台鉴权 |
| 管理 API | `server/src/routes/admin/*` | 登录、概览、邀请、名单、答卷、设置、分数线、知识库 | 报告正文生成 |
| 咨询 API | `server/src/routes/consult/*` | 咨询工作台、目的树、咨询树、收藏、金句、故事、提问、话题、生成运行与导出 | 问卷评分 |
| AI 报告 | `server/src/ai/*` | 队列、模型调用、博查检索、数字/重复/一致性审计、清洗 | 产品文案口径 |
| 分数线 | `server/src/score-lines/*` | 来源种子、抓取调度、解析器、归一化、覆盖度、查询 | 人工判定分数 |
| 领域共享 | `shared/src/*` | 问卷、跳题、评分、报告结构、日期/周期、分数线维度（纯函数） | 读写数据库 / 环境变量 |
| 前端 | `web/src/*` | 公开页、后台页、API 客户端、组件与 composable | 复制后端评分规则 |
| 运维脚本 | `scripts/`、`deploy/`、`update.sh` | 守卫、导入、部署五层校验 | 业务逻辑 |

数据流：

```text
邀请链接 /i/:token → POST /api/invite/:token/submit
  → shared 校验与计分 → 写 submissions → enqueueReport（进程内队列，并发 2）
  → generateDocContent（AI + 博查）→ 审计/清洗 → 落库
  → /r/:slug 轮询 → 重试 / 领取联系方式（加密）

管理后台 /admin → requireAdmin()（令牌 + 数据库会话）→ 各子路由 → SQLite
分数线调度器（串行，一次一省）→ 抓取 → 解析器（省控线 / 国家线 / 校级录取表）→ 按 confidence 自动 approved / rejected（≥0.70 可查，<0.70 隐藏）→ 覆盖刷新
```

## 3. 不变量（改之前先确认）

- [ ] **文档优先**：题目 / 选项 / 跳题 / 报告规则 / 接口 / 数据模型 / 部署流程变更，先改 `LosAngelousDocs/`（01-requirements / 03-design），再改代码；代码与文档冲突按文档修代码。
- [ ] **AI 失败不伪装**：不得用模板 / 规则版冒充 AI 成功；失败要给可操作提示并允许重试，保留已完成部分。
- [ ] **数字由程序算**：分数、比例、时间、排序、岗位门槛由 `shared/src` 计算；AI 只写标题、判断和正文。
- [ ] **咨询数据不可重置**：不重置 / 清空 `consult_tree`、`consult_runs` 与用户导入的咨询树；导入前预览 + 备份（SQLite WAL 用 `VACUUM INTO`）。
- [ ] **鉴权不可绕过**：生产必须 `ADMIN_USER` / `ADMIN_PASSWORD` / `AUTH_SECRET`；不改 `requireAdmin()`；免密登录只绑显式 `NODE_ENV=development`。
- [ ] **不提交敏感物**：`.env`、`data/`、`web/dist/`、`zxg/` 不入库；不在代码 / 文档 / 日志写真实密码、key、联系方式、完整答卷、完整 AI 正文。
- [ ] **结构化日志**：业务链路用 `server/src/log.ts`，带 `reqId` / `submissionId` / `runId`；禁止 `console.log` 绕过。
- [ ] **文件规模**：单 `.ts` / `.vue` 600 行软线、800 行硬线；新文件 ≤400 行；基线只能下调。
- [ ] **版本两处同步**：根 `package.json`（唯一事实源）↔ `LosAngelousDocs/STATUS.md`「当前产品版本」；`LosAngelousDocs/CHANGELOG.md` 记用户可见变化；`npm run check:version` 把关。
- [ ] **单实例假设**：报告队列、咨询生成任务、抓取队列、限流计数都在进程内存；重启清空，数据库是唯一持久真相。
- [ ] **分数线自动收录**：抓取按 `confidence >= 0.70` 自动 approved、`<0.70` rejected；同一 checksum 重抓不改变状态；低置信度新内容不覆盖已有 approved；后台不再有人工复核 / 人工导入入口，自 v2.09 起也不再有人工抓取入口（只有内部调度器与服务器脚本）。
- [ ] **部署只走 update.sh**：服务器上不直接改代码；L1–L5 必须全过，前端产物默认来自 GitHub Release `dist`。

## 4. 契约

- 接口分组：`/api/health`、`/api/invite/*`、`/api/report/*`、`/api/events`（公开）；`/api/admin/*`（登录后统一鉴权）；`/api/admin/consult/*`（咨询）。分数线后台只保留院校 / 专业 / 查询 / facets；手动 crawl、sources、coverage 接口自 v2.09 下线（404），抓取由内部调度器与 `scripts/import-jilin-school-lines.ts` 承担。
- 数据模型：单文件 SQLite，`server/src/db/schema.ts` 为建表事实源；启动迁移必须可重复执行、兼容存量库。明细见 `LosAngelousDocs/03-design.md` 与 `server/src/db/schema.ts`（原 `docs/` 说明已移出，备份可查）。
- 报告模式：`submissions.report_mode` 在提交时固化（`score` 旧版 / `doc` 全文 AI）；列表与导出不再解析问卷 JSON。
- AI 队列：`server/src/ai/report-queue.ts`，`REPORT_CONCURRENCY = 2`，最多 4 次尝试，启动扫描 `pending/running` 续跑。
- 检索口径：博查结果按规范化检索词缓存 7 天；单份报告最多 4 次外呼；时效窗口「今天往前 12 个完整月」。
- 配置：`.env.example` 为准；本地 AI 走 `deepseek-v4-flash`（网关无 `deepseek-chat`）；端口本地 8788/5173、生产 8787、本机线上实例 8082。
- 前端产物：`.github/workflows/build.yml` push main 产出 `web-dist-<sha>.tar.gz` + `.sha256` 到 Release `dist`；`update.sh` 校验 SHA256 与 `dist-info.commit` 后原子替换。

## 5. 验证命令

| 改动 | 命令 | 最后验证 |
|---|---|---|
| 默认 / 交付前 | `npm run verify`（docs+size+version+deps+dates+question+score+scoreline+import-jilin+crawl+audit+roster+search+typecheck+build） | 2026-11-27（EXIT=0） |
| 后端 | `npm run typecheck` | 2026-11-26 |
| 前端 | `npm run typecheck && npm run build` | 2026-11-26 |
| 问卷 / 跳题 | `npm run check:question` | 2026-11-26 |
| 日期 / 期次 | `npm run check:dates` | 2026-11-26 |
| 分数线 | `npm run check:score` + `npm run check:scoreline` | 2026-11-26（CR-002 新增） |
| 吉林两校导入 | `npm run check:import-jilin`（隔离 `DATA_DIR` + 本地 fixture） | 2026-11-27（CR-005 新增） |
| 抓取可靠性 | `npm run check:crawl`（隔离 `DATA_DIR` + 本地 HTTP 夹具：自愈 / 页数 / deadline / 重试 / CLI） | 2026-11-27（CR-006 新增） |
| 吉林两校脚本（服务器） | `npx tsx scripts/import-jilin-school-lines.ts` dry-run；`--write` 落库（要求 DB 已初始化且两校存在；写前备份，全量未变不备份，幂等） | 2026-11-27 |
| AI 报告审计 | `npm run check:audit` | 2026-11-26 |
| 部署脚本 | `bash -n update.sh` + `npm run verify`；CI 产物做本地夹具验证（原部署文档已移出，见备份） | 2026-11-26 |
| 页面手工走查 | `npm run dev` + playwright MCP，`http://127.0.0.1:5173` | 每次前端交付 |

## 6. 热点与雷区

| 区域 | 风险 | 触发信号 | 处理 |
|---|---|---|---|
| 问卷跳题 | 分支来源题缺失 / 非单选 / 无映射导致 0 选项死路 | 改动 `shared/src/question.ts`、`Quiz.vue` | 保留 `resolveQuestion()` 通用兜底 + 后台 `validateSurvey()` 保护 |
| AI 报告审计 | 数字 / 重复 / 跨模块矛盾；清洗过度会删正文 | 改动 `server/src/ai/doc-audit.ts`、prompt | 先反馈重写一次，仍不通过记 `ai_meta.audit.issues` 后放行 |
| 咨询树导入 | 覆盖用户已导入路线 | 运行 `scripts/import-consult-docx.mjs --write` | 必须先 `--list` 预览；只替换同名树；先备份 |
| 分数线抓取 | 站点结构差异、误把导航页当数据、维度误标；低置信度覆盖旧 approved；重启残留 `running` 阻塞调度；单源吃满预算；瞬时网络失败；整轮预算用尽误标后续来源；快照清理留孤儿 | 改动 `score-lines/parsers/*`、`crawl.ts`、`crawl-fetch.ts`、`crawl-recovery.ts`、`crawl-scheduler.ts`、自动收录判定 | 用 `check:score` / `check:scoreline` / `check:crawl`；启动自愈 + 单源 10 页 + deadline 每页 + 退避重试；预算用尽不写未尝试来源；prune 分批删文件+行；解析失败标 `failed` + 失败码；低置信度新内容不覆盖旧 approved |
| 大文件 | >600 行加功能风险；>800 行禁止加功能 | `npm run check:size` | 先纯拆分，再加功能；基线只下调 |
| 部署 | 构建中断清空 `web/dist`；本地 reset 被 L1 覆盖 | 改 `update.sh` / workflow | 构建到临时目录再原子替换；回滚用远端 `git revert` 后 `update.sh` |
| 隐私 | `zxg/` 下 126 份真实咨询稿曾随 Git 分发（6.7 MB） | 2026-11-26 v2.05 已取消追踪并删除工作区文件 | 备份在 `_vesta-backups/zxg-20261126-1815`；Git 历史仍含旧副本，彻底清除需重写历史 + force push（需用户单独授权）；`.gitignore` 已拦截 `/zxg/` |
| 文档单轨 | 工作流与产品口径统一在 `LosAngelousDocs/` + 本文件；原 `docs/` 已于 v2.08 移出工作区 | 需求收尾 | 更新 `LosAngelousDocs/05-decisions.md`、`CHANGELOG.md` 与本文件；历史产品文档查备份 |

## 7. 测试地图

| 模块 | 测试位置 | 必跑命令 |
|---|---|---|
| 问卷 / 跳题 / 兜底 | `shared/src/question.cases.ts` | `npm run check:question` |
| 日期 / 期次 | `shared/src/date.cases.ts`、`shared/src/cycle.cases.ts` | `npm run check:dates` |
| 分数线输入 / 解析 | `shared/src/score-line.cases.ts`、`server/src/score-lines/parsers/cases.ts`、`server/src/score-lines/school-admit.cases.ts` | `npm run check:score` / `check:scoreline` |
| 吉林两校导入脚本 | `server/src/score-lines/school-import.cases.ts` | `npm run check:import-jilin` |
| 抓取可靠性（自愈 / 页数 / deadline / 重试 / CLI） | `server/src/score-lines/crawl-reliability.cases.ts` | `npm run check:crawl` |
| AI 报告审计 / 清洗 | `server/src/ai/doc-audit.cases.ts` | `npm run check:audit` |
| 博查检索判定 | `server/src/ai/doc-search.cases.ts` | `npm run check:search` |
| 名单分组 | `server/src/routes/admin/roster-group-id.cases.ts` | `npm run check:roster` |
| 文档 / 规模 / 版本 / 依赖 | `scripts/check-*.mjs` | `npm run check:docs` / `check:size` / `check:version` / `check:deps` |
| 页面与接口 | 无自动化测试框架 | playwright MCP 手工走查 + 临时 `DATA_DIR` |

## 8. 决策索引

| ID | 决策 | 影响 | 文档 |
|---|---|---|---|
| D-001 | 工作流文档根用 `LosAngelousDocs/`（v2.08 起产品口径也收敛到此，原 `docs/` 已移出） | 所有 CR / 报告 / 状态落点 | `LosAngelousDocs/05-decisions.md` |
| D-002 | v2.03 分支题未命中用通用题面兜底 + 来源题回跳补答 | 问卷 / 报告 / 后台保护 | `_vesta-backups/docs-20261126-2010/reference/development-history.md` 2026-11-20 |
| D-003 | v2.04 前端改 GitHub Actions 构建，服务器只下载校验原子替换 | 部署 / `update.sh` / CI | `_vesta-backups/docs-20261126-2010/reference/development-history.md` 2026-11-20 |
| D-004 | v2.05 `zxg/` 真实咨询稿取消 Git 追踪并仓库外备份 | 隐私 / 仓库 | `LosAngelousDocs/05-decisions.md` |
| D-005 | v2.06 分数线按 confidence 自动收录，移除人工复核 / 人工导入 | 分数线 / 后台 / 数据口径 | `LosAngelousDocs/05-decisions.md` |
| D-006 | 工作流文档不按日建 archive；原 `docs/` 分工已随 v2.08 移出 | 文档流程 | `LosAngelousDocs/05-decisions.md` |
| D-007 | v2.07 吉林校级线试点：`school-admit@1` + program 最低分，专科院校不设院校线 | 分数线 / 抓取 / 前端 | `LosAngelousDocs/05-decisions.md` |
| D-008 | v2.08 删除 `docs/`，文档入口收敛到 PROJECT_BRAIN + LosAngelousDocs，版本源改为 STATUS | 文档流程 / 版本 / 守卫 | `LosAngelousDocs/05-decisions.md` |
| D-009 | v2.10 抓取可靠性：单实例启动自愈 + 单源 10 页 + deadline 每页 + 有限退避重试 + 每日清理 + 只读 CLI | 分数线 / 运维脚本 | `LosAngelousDocs/05-decisions.md` |

## 9. 最近变更（最多 10 条，Steward 维护）

| 日期 | CR/T | 改了什么 | 影响模块 | 报告 |
|---|---|---|---|---|
| 2026-11-27 | CR-006 | 抓取启动自愈（running→failed/stale + queued 续跑）、单源 10 页、多源预算不误标、deadline 每页且约束重试、网络/429/5xx 退避重试、快照分批清理、只读状态 CLI；版本 v2.10 | 分数线 / 运维脚本 | `LosAngelousDocs/reports/dev-2026-11-27-CR-006-抓取调度可靠性-返工.md`（G3 返工完成，待复审） |
| 2026-11-27 | CR-005 | 分数线前端只留查询（删副标题 + 三按钮 / 覆盖看板）；后端手动 crawl/sources/coverage 接口下线（404）；新增吉林两校服务器导入脚本（dry-run / `--write` / 备份 / 幂等），版本 v2.09 | 分数线 / 前端 / 运维脚本 | `LosAngelousDocs/reports/meta-2026-11-27-CR-005-前端去人工抓取.md`（G4 通过，`6ae6f9a`） |
| 2026-11-27 | CR-004 | 吉林校级线试点：`school-admit@1`、两校校级源、program 批次最低分、专科提示 | 分数线 / 抓取 / 前端 | `LosAngelousDocs/reports/meta-2026-11-27-CR-004-吉林校级线试点.md`（G4 通过，`0ee4fe7`） |
| 2026-11-26 | CR-002 | 分数线按 confidence 自动收录；移除复核 / 人工导入；计划唯一键补 major_name；国家线 A/B 区校验 | 分数线 / 后台 / 数据库 | `LosAngelousDocs/reports/meta-2026-11-26-CR-002-分数线自动收录.md`（G4 有条件通过，`fdf0acf`） |
| 2026-11-26 | CR-001 | 移除 `zxg/` 126 份真实咨询稿入库；`.gitignore` 拦截；版本同步 v2.05 | 隐私 / 文档 / 版本 | `LosAngelousDocs/reports/doc-2026-11-26-CR-001-移除咨询稿入库.md` |
| 2026-11-26 | 初始化 | 接入 LosSKILL 工作流：`LosAngelousDocs/`、`PROJECT_BRAIN.md`、`WORKLOG.md`、`AUTHORIZATIONS.md` | 流程 / 文档 | `LosAngelousDocs/reports/doc-2026-11-26-工作流初始化.md` |
| 2026-11-21 | v2.04 | 前端改 GitHub Actions 构建 + Release 产物原子替换 | 部署 / CI | `_vesta-backups/docs-20261126-2010/reports/meta-agent-2026-11-21-GitHubActions构建.md` |
| 2026-11-20 | v2.03 | 问卷分支题回跳补答与通用兜底 | 问卷 / 报告 / 后台 | `_vesta-backups/docs-20261126-2010/reports/meta-agent-2026-11-20-问卷分支题死路.md` |

## 10. 模块卡（大项目按需）

- 暂无 `brain/modules/*.md`；任务涉及某模块时先看第 2 节与 `LosAngelousDocs/03-design.md`（原 `docs/reference/` 已移出，备份可查）。

## 维护规则

- 只写**稳定事实**与**导航**；不复制代码，不写会立刻过期的实现细节。
- 每条结论尽量带 `文件:行号` 或命令证据。
- 超过 90 天未复验的验证命令标「可能过期」。
- 架构/契约/不变量发生变化时，Steward 必须在本文件留下变更记录。
