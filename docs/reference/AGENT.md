---
doc_id: AGENT
title: 执行型 Agent 契约层
order: 99
status: active
audience: [agent]
locale: zh-CN
generated_at: 2026-11-16
commit: 884ef39
source_of_truth:
  - package.json#scripts
  - server/src/env.ts#config
  - server/src/routes/admin/index.ts#adminRouter
  - server/src/ai/report-queue.ts#startReportQueue
  - server/src/score-lines/parsers/index.ts#resolveParserId
  - shared/src/doc.ts#docPriority
related: [IDX, OVR, ENV, ARC, FUN, API, DAT, OPS, TST]
---

> 维护者：Doc Agent ｜ 最近更新：2026-11-18 ｜ 状态：草稿（定点勘误，待用户复核）

# 执行型 Agent 契约层

本文件是给执行型 AI 的**最短可信路径**：先看命令与符号，再看不变量与失败表。不要从这里跳去读整个仓库；需要细节时按 `路径#符号` 定点阅读。

## 1. 命令速查

所有命令默认 **cwd = `/home/losangelous/LosAngelous/Vesta`**。

| 目的 | 命令 | 预期可 grep 的输出 | 退出码 | 失败先看 |
| --- | --- | --- | --- | --- |
| 安装依赖 | `npm install` | `added` 或 `up to date` | 0 | npm registry / `EBADENGINE` |
| 开发 | `npm run dev` | Vite `Local:` 含 `5173`；后端 `8788` | 长驻；Ctrl-C 为 130 | 端口占用、缺 `.env` |
| 类型检查 | `npm run typecheck` | 无错误输出 | 0 | `文件:行:列` |
| 构建前端 | `npm run build` | `built in` | 0 | Rollup 第一条错误 |
| 全量门槛 | `npm run verify` | 最后 `built in` | 0 | 第一个失败的 `check:*` |
| 生产启动 | `npm start` | `server.started` | 长驻 | `server.start_failed` |
| 健康检查 | `curl -fsS http://127.0.0.1:<PORT>/api/health` | `"ok":true`、`"db":true` | 0 | 进程/端口/数据库 |
| 文档守卫 | `npm run check:docs` | `文档一致性检查通过。` | 0 | 缺题号/题干/小节 |
| 版本守卫 | `npm run check:version` | `✓ 版本一致` | 0 | 根版本与 README |
| 依赖守卫 | `npm run check:deps` | `✓ 依赖不变量通过` | 0 | `@types/node` 未安装/major 不一致 |
| 文件规模 | `npm run check:size` | `文件规模检查通过` | 0 | 超基线/新增文件超 400 行 |
| 领域用例 | `npm run check:dates` | 无 `AssertionError` | 0 | 具体 case 名 |
| 分数线用例 | `npm run check:score` | 无 `AssertionError` | 0 | 导入/解析 case |
| AI 审计用例 | `npm run check:audit` | 无 `AssertionError` | 0 | 审计规则 |
| 搜索用例 | `npm run check:search` | 无 `AssertionError` | 0 | 查询计划/岗位判断 |
| 部署更新 | `bash update.sh` | `更新完成：运行的代码已校验为 origin/main 的` | 0 | 输出里的 L1–L5 阶段名 |
| 备份数据库 | `node deploy/backup.mjs data/<DB_NAME> data/backups/vesta.db` | 无输出 | 0 | `SQLITE_CANTOPEN` / `SQLITE_FULL` |
| 写分数线来源种子 | `npx tsx scripts/seed-sources.ts` | `已写入 / 更新` | 0 | 数据库权限 |

**不要执行**：`git commit`、`git push`、`git checkout`、`git reset --hard`、全局安装、数据库迁移脚本、部署、删除 `DATA_DIR`。除非用户明确授权并确认影响。

## 2. 符号地图

| 符号 | 路径 | 用途 | 改动时注意 |
| --- | --- | --- | --- |
| 进程入口 | `server/src/index.ts` | 中间件、路由挂载、静态站点、启动任务 | 管理路由必须挂在 `requireAdmin()` 之后 |
| `config` | `server/src/env.ts#config` | 全部环境变量与默认值 | 生产硬校验：管理员账号、`AUTH_SECRET` |
| `requireAdmin` | `server/src/auth.ts#requireAdmin` | Token + `admin_sessions` 双重校验 | 新增管理接口不要绕过 |
| `initSchema` | `server/src/db/schema.ts#initSchema` | 31 张表、42 条索引 | 改表必须同时写幂等迁移 |
| `runMigrations` | `server/src/db/migrations.ts#runMigrations` | 启动时补列/回填/种子 | 不要写一次性迁移脚本 |
| `publicRouter` | `server/src/routes/public.ts#publicRouter` | 健康、邀请、提交、报告、领取、事件 | `doc` 模式失败不得伪造报告 |
| `adminRouter` | `server/src/routes/admin/index.ts#adminRouter` | 登录后全部管理接口 | 子路由挂载顺序影响匹配 |
| `consultRouter` | `server/src/routes/consult/index.ts#consultRouter` | 咨询树/目的/收藏/运行 | 生成任务在内存，重启需重试 |
| `enqueueReport` | `server/src/ai/report-queue.ts#enqueueReport` | 报告入队、延迟重试 | 并发 2、FIFO、进程内 |
| `startReportQueue` | `server/src/ai/report-queue.ts#startReportQueue` | 注册 runner | 启动后才允许花钱跑 AI |
| `generateSubmission` | `server/src/ai/generate.ts#generateSubmission` | 单份报告生成与失败落库 | 最多 4 次；重试判定在 `isRetryableError` |
| `generateDocContent` | `server/src/ai/doc-generate.ts#generateDocContent` | 文档版报告主流程 | 搜索 → 组装 → 审计 → 返工 → 清洗 |
| `sanitizeDocContent` | `server/src/ai/doc-sanitize.ts#sanitizeDocContent` | 落库前清洗 | 不能删掉事实性数字 |
| `auditNumbers` | `server/src/ai/doc-audit.ts#auditNumbers` | 数字一致性审计 | 误杀会硬失败，改规则要加用例 |
| `resolveParserId` | `server/src/score-lines/parsers/index.ts#resolveParserId` | 按 Content-Type 分派解析器 | 新类型要同时改 registry 与 fixture |
| `startScorelineScheduler` | `server/src/score-lines/crawl-scheduler.ts#startScorelineScheduler` | 定时抓取 | 一次只跑一个省 |
| `enqueueCrawl` | `server/src/score-lines/crawl.ts#enqueueCrawl` | 抓取入队 | `NO_SOURCE` 表示该省无来源 |
| `refreshCoverage` | `server/src/score-lines/coverage.ts#refreshCoverage` | 重算某校覆盖 | 复核通过/导入后触发 |
| `defaultSurvey` | `shared/src/survey.ts#defaultSurvey` | 28 题问卷与 `reportMode` | 改题必须同步设计文档，否则 `check:docs` 失败 |
| `computeScores` | `shared/src/scoring.ts#computeScores` | `score` 模式分数 | 纯函数，不读库/环境 |
| `computeDocScores` | `shared/src/docScore.ts#computeDocScores` | `doc` 模式维度分 | 不产出假总分 |
| `docPriority` | `shared/src/doc.ts#docPriority` | A/B/C 优先级 | 提交时写入 `scores.tier` |
| `buildReport` | `shared/src/report.ts#buildReport` | 旧版结构化报告 | 与 `buildDocReportWithAi` 并存 |
| `buildDocReportWithAi` | `shared/src/doc.ts#buildDocReportWithAi` | 文档版报告渲染 | 公开页/后台预览共用 |
| `validateAnswers` | `shared/src/validate.ts#validateAnswers` | 提交校验 | 返回 `ok/errors/missing` |
| `describeDistance` | `shared/src/date.ts#describeDistance` | 时间距离文案 | 用例在 `date.cases.ts` |
| `currentCycleKey` | `shared/src/cycle.ts#currentCycleKey` | 期次键 | 用例在 `cycle.cases.ts` |
| `validateImportPayload` | `shared/src/score-line.ts#validateImportPayload` | 分数线导入校验 | 200 批次/100 指标上限 |
| `router` | `web/src/router.ts#router` | 页面路由与守卫 | 懒加载；管理页 `meta.admin` |
| `request` | `web/src/api/request.ts#request` | 统一请求与 Token | 401 处理在此 |
| `adminApi` | `web/src/api/admin.ts#adminApi` | 管理接口客户端 | 与服务端契约同步 |
| `consultApi` | `web/src/api/consult.ts#consultApi` | 咨询接口客户端 | 运行状态轮询 |

## 3. 不变量（改代码前先确认没有破坏）

1. **AI 只写文案**：分数、优先级、截止时间、岗位卡由 `shared/src` 计算；AI 失败不得用模板冒充成功。
2. **`doc` 模式没有数字总分**：`total=0`，`tier` 是 A/B/C；不要映射成 82/60/25。
3. **`report_mode` 在提交时固化**：读取路径不再解析问卷 JSON；改问卷不影响存量答卷。
4. **提交幂等**：`submissions.invite_id` 唯一；重复提交返回 `409` 并带 `reportSlug`。
5. **时长截断**：`timing` 单题最大 15 分钟；非法值丢弃。
6. **报告队列**：并发 2、最多 4 次、延迟 5s/15s/30s；进程重启会丢未开始的排队任务。
7. **失败分类**：配置缺失、规则为空、DeepSeek 400/401/402/403/404/422 不重试；其余可重试。
8. **分数线复核门禁**：查询只读 `approved`；抓取默认 `pending`；导入默认 `approved`。
9. **批次唯一键**：9 个维度归一化后重复会互相覆盖，导入必须报错而不是后写覆盖。
10. **抓取串行**：同一时间只允许一个 `queued|running`；一次一个省。
11. **保留期**：事件 180/365 天，抓取快照 90 天；`event_facts` 永久。
12. **管理鉴权顺序**：`adminRouter.use(requireAdmin())` 之后才挂业务子路由。
13. **联系方式加密**：`wechat_enc` 依赖 `CONTACT_KEY`；换 key 旧密文不可解。
14. **文档优先**：改产品规则先改 `docs/`，再改代码；发版同步根版本、README、开发历史。
15. **文件规模**：新文件 ≤400 行；既有大文件只能降基线。
16. **不泄密**：日志脱敏 token/slug；文档与代码不写真实密钥、域名、IP、学员资料。
17. **批量删除是物理删除**：`POST /roster/batch-delete` 先删答卷再删邀请，单次≤200，没有“已提交保护”；执行前必须确认。

## 4. 失败表

| 症状 | 最可能原因 | 直接动作 | 深入 |
| --- | --- | --- | --- |
| 启动退出，`EADDRINUSE` | 端口被占 | 停旧进程或换 `PORT` | 08 §2 |
| 启动退出，缺管理员账号 | 生产未配 `ADMIN_USER/PASSWORD` | 补 `.env` | 02 §3.1 |
| 启动退出，缺 `AUTH_SECRET` | 生产未配 | 生成 ≥32 位随机串 | 02 §3.1 |
| 管理接口 401 | Token 过期/会话被删/未带 Bearer | 重新登录 | 05 §1.2 |
| 公开邀请 404 | token 不存在/轮换/连错库 | 后台重发 | 05 §2.2 |
| 公开邀请 410 | 已过期 | 新建邀请 | 05 §2.2 |
| 提交 409 | 已提交 | 用 `reportSlug` 跳转 | 04 §3.1 |
| 提交 400 | 必答题/选项非法 | 看 `errors/missing` | 04 §3.1 |
| 提交 429 | 8 次/分钟 | 等待；检查 `TRUST_PROXY` | 05 §1.1 |
| 报告长期 `pending` | 队列满/进程重启丢任务 | 后台重新生成 | 08 §5 |
| 报告 `failed` + 未配置 key | 缺 `AI_API_KEY`/`AI_BASE_URL` | 补配置并重启 | 08 §5.2 |
| 报告 `failed` + HTTP 401/402/403 | key 无效/欠费/无权限 | 换 key/充值 | 08 §5.2 |
| 报告 `failed` + JSON 非法 | 模型输出漂移 | 自动重试；调 Skill | 08 §5.2 |
| `doc.audit_failed` | 事实矛盾/缺块/空话 | 看审计问题；加用例再改规则 | 08 §5.2 |
| 咨询创建 503 | AI 未配置 | 配 key | 08 §6 |
| `GET /purposes` 500 | 目的树 JSON 未生成 | 运行生成脚本 | 08 §6 |
| 咨询运行卡 `queued` | 进程重启丢内存任务 | `POST /runs/:id/retry` | 08 §6 |
| 分数线查询为空 | 数据仍 `pending` | 后台复核 | 08 §7 |
| 抓取 `NO_SOURCE` | 该省无启用来源 | 补来源/启用 | 05 §3.5 |
| 抓取失败码 `no_text_layer` | PDF 是扫描件 | 换源/人工导入 | 08 §7.1 |
| 自动抓取不再触发 | 有 `running` 残留 | 备份后人工处理（需确认） | 08 §7.3 |
| `check:docs` 失败 | 新题未写设计文档 | 补题号+题干 | 09 §2.1 |
| `check:size` 失败 | 新文件 >400 或超基线 | 拆分/下调基线 | 09 §2.2 |
| `check:version` 失败 | 版本与 README 不同步 | 升版本 + 写 README/历史 | 09 §2.3 |
| `check:deps` 失败 | 未安装或 major 不一致 | `npm install`；成对升类型包 | 09 §2.4 |
| `typecheck` 失败 | 类型错误 | 按 `文件:行:列` 修 | — |
| `build` 失败 | Rollup/依赖/内存 | 看第一条错误 | — |
| `update.sh` L1 失败 | 脏工作区/非 main/分叉 | `git stash` / `git switch main` / 手工 rebase | 07 §3 |
| `update.sh` L5 失败 | 新进程未起/版本不符/端口错 | 查 `deploy-info.json`、`PORT`、日志 | 07 §3、08 §9 |

## 5. 未知与待确认（含验证命令）

按优先级排序。**第 1 项是安全问题，先处理或先上报，不要复制内容。**

| # | 事项 | 现状 / 影响 | 验证命令（只读） |
| --- | --- | --- | --- |
| 1 | `zxg/` 下 126 个 DOCX 被 Git 跟踪，内容疑似真实学员咨询记录 | 隐私/合规风险；与“不要提交 zxg”的约定冲突 | `git ls-files zxg \| wc -l`；`git log --oneline -- zxg \| head` |
| 2 | `.env.example` 未列 `SCORELINE_*` | 部署者不知道抓取开关与预算 | `grep -n "SCORELINE" .env.example`（应无输出） |
| 3 | `AI_TIMEOUT_MS` 示例 `120000` vs 代码默认 `240000` | 行为与文档不一致 | `grep -n "AI_TIMEOUT_MS" .env.example server/src/env.ts` |
| 4 | 抓取 `running` 残留会永久阻塞自动调度 | 需人工改库；是否应启动自愈未定 | `grep -n "status IN ('queued', 'running')\|status = 'running'" server/src/score-lines/*.ts` |
| 5 | `docs/archive/20261116/` 不存在 | 当天方案没有按日归档，追溯需靠提交历史与 `261116` 快照 | `ls docs/archive` |
| 6 | 设计文档提到“复制完整结果”，页面未实现 | 验收口径不一致 | `grep -n "复制" docs/reference/规划自测问卷-设计文档.md web/src/views/ReportView.vue` |
| 7 | 旧版 AI 报告回退路径仍存在 | 两套渲染逻辑并存 | `grep -n "buildFallback" server/src/routes/public.ts` |
| 8 | `not_offered` 是否有后台入口未确认 | 影响覆盖维护 | `grep -rn "not_offered" server/src web/src` |
| 9 | `resume_images` / legacy 分数线表是否可清理 | 占空间；注释要求先确认 | `grep -rn "resume_images\|score_line_sets" server/src` |
| 10 | 联系方式无重加密工具 | 换 `CONTACT_KEY` 会丢旧数据 | `grep -rn "CONTACT_KEY" server/src` |
| 11 | 线上 `8082` 端口只在文档记载 | 未读取生产 unit | 生产执行 `systemctl cat vesta` |
| 12 | `deploy/nginx.conf` 注释仍提“简历上传 20MB” | 注释过期，实际上限 25MB | `grep -n "简历" deploy/nginx.conf` |
| 13 | systemd `ReadWritePaths` 未配 `ProtectSystem` | 可能不构成写限制 | `grep -n "ProtectSystem\|ReadWritePaths" deploy/vesta.service`；`systemd-analyze security vesta` |
| 14 | 依赖大版本升级待办 | Express 5 / Vite 8 / TS 7 / vue-router 5 / xlsx | `grep -n "Express 5\|Vite 8\|TypeScript 7\|xlsx" docs/reference/development-history.md` |
| 15 | 本次未跑 `verify` / `typecheck` / `build` | 文档任务只做只读检查；build 会写 `web/dist` | `npm run verify`（交付前必须补跑） |
| 16 | AI / Bocha 真实连通性未验证 | 需要凭据与外部网络 | 配好后 `curl` 一个最小请求；或后台看 `ai.configured` |

处理第 1 项时：**不要打印 DOCX 内容、姓名、文件名列表**。只报告数量与路径，交由仓库所有者决定取消跟踪与历史清理方案。

## 6. 新鲜度

| 项 | 值 |
| --- | --- |
| 生成日期 | `2026-11-16` |
| 代码 commit | `884ef39` |
| 产品版本 | `1.85.0` |
| 定点勘误 | `2026-11-18`（HEAD `70d8225` / `1.89.0`） |
| 勘误范围 | 00 / 01 / 04 / 05 / 06 / 09 / AGENT 与 `manifest.json` 哈希 |
| 输出目录 | `docs/reference/` |
| 模式 | `full` + `patch` |

**何时失效**：HEAD 不再是 `70d8225`、根版本变化、或 `shared/src/survey.ts` / 数据库 Schema / 路由表发生变化。此时：

1. 先 `git rev-parse --short HEAD` 确认新 commit。
2. 检查 `source_of_truth` 路径是否仍存在（下条命令）。
3. 只重写受影响文档；`manifest.json` 记录了每篇的 `sha256` 与覆盖路径，可用于增量判断。

`source_of_truth` 路径存在性检查（cwd = 仓库根；预期无输出，退出码 0）：

```bash
node -e "const fs=require('fs');const dir='docs/reference';let bad=0;for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.md'))){const t=fs.readFileSync(dir+'/'+f,'utf8');for(const m of t.matchAll(/^\s*-\s+([^\s#]+)#/gm)){if(!fs.existsSync(m[1])){console.log('MISSING',f,m[1]);bad++}}}process.exit(bad?1:0)"
```

manifest 与磁盘一致性检查（预期输出 `OK`，退出码 0）：

```bash
node -e "const fs=require('fs'),c=require('crypto');const m=JSON.parse(fs.readFileSync('docs/reference/manifest.json','utf8'));let bad=0;for(const d of m.docs){const p='docs/reference/'+d.file;if(!fs.existsSync(p)){console.log('MISSING',d.file);bad++;continue}const h=c.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(h!==d.sha256){console.log('CHANGED',d.file);bad++}}console.log(bad?'FAIL':'OK');process.exit(bad?1:0)"
```

如果只是文档被人工编辑，`CHANGED` 是正常的；更新 manifest 或重跑增量即可。若是代码变了而文档没变，按 [00-文档索引.md](./00-文档索引.md) §5 处理。
