# 开发历史与需求记录

本文档记录已经确认或完成的需求，帮助后续 Agent 理解“为什么这样做”。代码与文档冲突时，以 `docs/` 文档为准修正代码，并同步更新本文档（见 `agent-rules.md` 的「文档优先」）。

## 本轮（2026-11-13）

### 学员名单按期次自动分组（2026-11-13，产品版本 v1.74）

- 依据：`docs/archive/20261113/12-学员名单按期次自动分组-开发文档.md` v1.0。在野一周一期带学员，「管理分组 + 勾选 + 移到分组」和「可涂色日期筛选」两套语义重叠的交互太重；本期把自定义分组与日期筛选整块移除。
- 口径：一期 = 周三 00:00 → 下周二 23:59:59（固定 Asia/Shanghai）；归期只看 `invites.created_at`，学员晚几天提交不跳期；期次 chip 只写日期区间（`11/11–11/17`），不引入「第 N 期」。
- 算法：新增 `shared/src/cycle.ts`（`cycleStartKey` / `cycleRange` / `cycleLabel` / `currentCycleKey`）与 `shared/src/cycle.cases.ts`（15 组边界 + 区间 / 文案 / 无效输入）；`npm run check:dates` 现在同时跑时间距离与期次用例。
- 接口：`GET /api/admin/roster` 只认 `q` / `category` / `week`（`YYYY-MM-DD` 或 `all`），返回 `roster` / `counts` / `weeks` / `currentWeek`，每行带 `week`；`weeks` 按 q 过滤后的全部记录聚合、倒序、本期永远在列。删除 7 个分组 / 日期写接口（`groups`、`assign`、`dates`），保留 `batch-delete`。CSV 导出支持 `week` + `category`。
- 前端：新增 `RosterCycleBar.vue`（全部 + 期次 chip，本期/上期前缀，横向滚动并自动把本期滚进可视区）；`Submissions.vue` 删掉 `RosterGroupBar` / `RosterGroupPanel` / `RosterDateFilter`；工具栏选中后只留「取消选择 / 批量删除」；表格删掉分组标签、日期底色和日期圆点；空状态改期次口径，本期搜不到时给「在全部期次里搜」。390px 下表格改为横向滚动（`min-width: 720px`），不挤竖排文字。
- 数据：`roster_groups` / `roster_hidden_dates` / `invites.group_id` 原样保留、不再读写；无数据库变更、无迁移、无需备份改库。旧链接 `?group=` / `?dates=` 直接忽略、清出 URL，并回到「全部期次」。
- 验证：`npm run verify` 全绿。临时 `DATA_DIR` + 8819 端口造 4 条邀请（10/29、11/10、11/11、11/12）+ 1 份答卷，API 实测：本期 2 人、上期 1 人、10/28 期 1 人，`weeks` 倒序且本期标记正确，CSV 只导出当前期次。Playwright 走查：默认选中「本期」、chip 文案「全部 4 / 本期 11/11–11/17 2 / 上期 11/04–11/10 1 / 10/28–11/03 1」；切上期表格与 tab 计数同步；本期搜上期学员出现「在全部期次里搜」，点击后命中；勾选后无「移到分组」；旧链接不报错且按全部期次显示、URL 被清理；390px 无页面横向溢出、期次条可横向滚动、表格可横向滚动；控制台仅有生产环境登录页请求 `/api/admin/dev-login` 的既有 404。
- 未做 / 已知：`GET /roster` 仍一次取 1000 行再内存过滤，超量老期次可能缺记录；周二提前建下一期链接会算进上一期（按口径实现，二期再说）；旧自定义分组数据不可见但可回滚。

### events 保留与漏斗事实汇总（2026-11-13，产品版本 v1.73）

- 依据：`docs/archive/20261113/11-events表保留与清理-开发文档.md` v1.0。`events` 只增不删，后台概览每次全表读 `group_complete` / `quiz_exit`；但漏斗数字依赖历史事件，不能直接删。
- 汇总表：新增 `event_facts`（`invite_id, kind, key, at` 主键 + 内部 `seq`），永久保留；`start` 只记首次、`group` 按 groupId 去重、`exit` 每题留最后一次。`seq` 存原始事件 id，用于同一毫秒内多条 exit 的先后判定（旧逻辑按 id 取最后一条）。
- 写入：`recordEvent()` 返回 `boolean`，原始事件与事实在同一处写入；`POST /api/events` 也走它。原始事件失败记 `events.insert_failed`，事实失败记 `events.fact_failed`，不再静默吞掉事实错误。
- 回填：`backfillEventFacts()` 随启动迁移执行，SQL `json_extract` 为主、JS 逐行为兜底，`settings.events_facts_backfilled` 标记保证可重复执行。
- 概览：`overview.ts` 的开始人数 / 每组完成 / 每题流失改读 `event_facts`，输出 JSON 不变，全表 `ORDER BY id` 消失。
- 清理：业务埋点默认 180 天（`EVENT_RETENTION_DAYS`），`ai_report_*` / `submission_deleted` 默认 365 天（`EVENT_OPERATIONAL_RETENTION_DAYS`）；启动清理一次 + 每 24 小时一次，每批 5000 行，不 VACUUM。
- 新增 `scripts/check-events.mjs`：只读比较保留窗口内的原始事件与事实（start / group / 最后流失题），不一致退出码 1；不接入 `verify`（需要真实数据库）。
- 验证：临时 `DATA_DIR` 构造数据，回填前后漏斗完全一致（开始 3 / p1 2 / p2 1 / dropoff a2=1、a3=1）；重复回填行数不变；清理删旧留新（200 天业务、400 天运维删除；300 天运维、100 天业务保留），第二次清理 0 行，事实与漏斗不变；`GET /api/admin/overview` 返回 `started=3 / p1=2 / p2=1`；`check-events` 正反例通过。`npm run verify` 全绿。
- 未做：真实生产库回填（部署时随启动自动执行）；10 万条合成事件的响应时间基准未单独记录。

### 文本响应 gzip 压缩（2026-11-13，产品版本 v1.72）

- 依据：`docs/archive/20261113/10-gzip压缩-开发文档.md` v1.0。线上 Vesta 在 `:8082` 由 Node 直连（`47.111.175.191:80` 的 Nginx 只管门户页），所以压缩必须做在 Node 层；此前 HTML / JS / CSS / JSON 全是明文。
- 应用层：`server/src/index.ts` 在安全响应头之后、`express.json()` 与所有路由之前挂 `compression`，`threshold: 1024`、`level: 6`；自定义 `filter` 排除 `image|audio|video/*`、`zip|gzip|br|docx|pdf|octet-stream` 和 `text/event-stream`，其余交给 `compression.filter`。`Vary: Accept-Encoding` 由中间件自动添加。
- 依赖：`server/package.json` 加 `compression: ~1.7.4`、`@types/compression`。固定 1.7.x 是因为 1.8 会自动协商 Brotli（实测浏览器拿到 `Content-Encoding: br`），与文档「不做 Brotli」的边界冲突；`~` 防止以后 `npm install` 悄悄升到 1.8。
- 开关：`server/src/env.ts` 增加 `compress: COMPRESS !== 'off'`，写入 `.env.example`；只有前面已有网关压缩时才关。
- Nginx：`deploy/nginx.conf` 补 `gzip on / gzip_vary / gzip_comp_level 5 / gzip_min_length 1024 / gzip_proxied any / gzip_types`，并把 `client_max_body_size` 从 `1m` 调到 `25m`（简历上传允许 20MB，上反代后 1m 必然 413）。Node 与 Nginx 同开安全，上游已带 `Content-Encoding` 时 Nginx 会跳过。
- 文档：`docs/README.md` 生产部署补 gzip 说明、环境变量表加 `COMPRESS`、已发布版本与「版本记录」更新；第 10 篇补实施记录。
- 验证：`npm run typecheck` / `npm run build` / `npm run verify` 全绿。临时 `DATA_DIR` + 8816 端口起生产服务实测：`vendor-vue` JS 107,534 → 41,861 字节（−61%），`index-*.css` 10,633 → 3,276 字节（−69%），响应头 `Content-Encoding: gzip` + `Vary: Accept-Encoding`；`/api/health` 97 字节未压缩；`COMPRESS=off` 时同一资源返回 107,534 字节且无 `Content-Encoding`。Playwright 打开 `/admin/login`：所有 JS/CSS 均以 gzip 下发，页面正常渲染、无脚本报错（仅有的 404 是登录页请求 `/api/admin/dev-login`，生产环境本就不注册该路由，与本次改动无关）。未生成真实报告，报告页「保存图片 / PDF」未走查，留待上线后抽验。
- 边界：不做 Brotli / 构建期预压缩；不压已压缩格式；不改缓存头、ETag、静态资源路径；不动 `update.sh` 五层校验。

### 版本号同步与工程元数据规范（2026-11-13，产品版本 v1.70）

- 依据：`docs/archive/20261113/9-版本号同步与工程元数据规范-开发文档.md` v1.0。用户要求 `package.json` 等文件的版本及时更新，并固化成日后开发规范。
- 唯一事实源：根 `package.json` 的 `version`，格式 `1.<minor>.0`（`major` 恒 1、`patch` 恒 0），产品 `v1.<minor>` ↔ `1.<minor>.0`；`server` / `web` 是 workspace 成员，保持 `private` 不带 `version`。本轮实施时文档最高版本已是 v1.71（文件规模约束先落地），故 `package.json` 写 `1.71.0`，本次补齐的是 v1.70 的工程能力。
- 校验：新增 `scripts/check-version.mjs`——`package.json` 必须匹配 semver 且 `major=1 / patch=0`；`docs/README.md`「已完成」行最大 `v1.<n>` 与 package minor 相等（package 领先 1 个版本给提示，落后或差 2 以上失败）；`development-history.md` 本轮小节最大版本不得大于 README。失败信息点名两处数字。`npm run check:version` 已接入 `npm run verify`。
- 元数据：根 `package.json` 增加 `engines.node: ">=24.0.0"`；新增 `.node-version`（`24`）；`package-lock.json` 根版本同步为 `1.71.0`；`docs/README.md` 技术栈写明 Node 24+，新增「版本记录」表并回填 v1.60–v1.71。
- 部署强校验：`update.sh` 在重启前覆盖写 `data/deploy-info.json`（`commit` / `deployedAt` / `productVersion`，路径跟随 `DATA_DIR`）；`/api/health` 的 `commit` / `appVersion` 由 `server/src/deploy-info.ts` 读取该文件。L5 从此能拿 `commit` 与 `git rev-parse --short=12 HEAD` 强比对；文件缺失时仍退回「200 + 时间戳 + 前端指纹」降级校验。`appVersion` 故意不叫 `version`，否则 L5 会把 semver 当 commit 比对。
- 规范：`AGENTS.md`「交付」新增六步版本动作清单；`docs/agent-rules.md`「文档维护」新增版本号三处同步与 `check:version` 约束。
- 验证：`npm run verify` 全绿（含新增 `check:version`）；正反例实测（`1.99.0` + 旧 README 必须失败并点名数字，改回通过）；临时 `DATA_DIR` 起服务验证 health 字段与文件缺失时的降级路径。未在真机执行 `bash update.sh`。
- 边界：不引入 semantic-release / changesets，不自动发版；不给 `server` / `web` 加版本号；不改 `update.sh` 的 L1–L4 逻辑；前端页面不展示版本号。

### 文件规模约束与首批拆分（2026-11-13，产品版本 v1.71）

- 依据：`docs/archive/20261113/8-巨型文件拆分与约束-开发文档.md` v1.1。v1.62 拆过一轮但没有留下可执行约束，随后又出现 18 个 >600 行文件（日志改造后 `public.ts` 也到 613 行），最大 `Submissions.vue` 1591 行。
- 约束：新增 `scripts/check-size.mjs` + `scripts/file-size-baseline.json`。整文件 600 软线 / 800 硬线；新增文件 400 硬线（用 git 判定未跟踪 / staged-added）；`.vue` 的 template / script / style 块 400 软线 / 600 硬线；基线内只减不增。`npm run check:size` 已接入 `npm run verify`。
- 拆分 `web/src/api.ts`（959）→ `web/src/api/`：`request.ts`（token / ApiError / request / blob / upload）、`types.ts`（共享类型与后台接口类型）、`admin.ts`、`consult.ts`、`public.ts`；`api.ts` 保留 `{ ...adminApi, ...consultApi, ...publicApi }` 汇总与 re-export，所有 `import { api } from '@/api'` 不变。拆分前后 76 个方法名逐一核对一致。
- 拆分 `web/src/views/admin/Submissions.vue`（1591 → 176）：`useRoster.ts`（取数 / 筛选 / 日期涂色 / 选择）、`useRosterActions.ts`（分组 CRUD / 行操作 / 批量 / CSV）、`rosterMeta.ts`（阶段与日期标签）、`RosterCategoryTabs.vue`、`RosterGroupBar.vue`、`RosterGroupPanel.vue`、`RosterDateFilter.vue`、`RosterToolbar.vue`、`RosterTable.vue`；样式收进 `submissions/shared.css`，用 `.submissions-page` 根类限定作用域、只在父组件引入一次，避免每个子组件重复打包。
- 公共类型：`RowMenuItem` 从 `RowMenu.vue` 的 `<script setup>` 抽到 `web/src/components/row-menu.ts`，供 `.ts` composable 引用。
- 文档：`docs/README.md` 更新已发布版本、`scripts/` 说明和验证命令；`AGENTS.md` / `docs/agent-rules.md` 新增文件规模约束；第 8 篇补实施记录与拆分前后行数表；归档索引第 8 项同步。
- 验证：`npm run verify` 全绿。临时 `DATA_DIR` + 8801/8802 端口起独立服务，造 4 条邀请（不同日期）+ 1 份答卷，用 Playwright 走查 `/admin/submissions`：4 行、7 个分类、4 个日期块；未填写 3 行；选 1 个日期 1 行、取消恢复 4 行；日期管理面板展开 3 条、收起正常，全选/清空日期正常；新建分组并批量归类成功、行上显示分组标签；搜索「张三」1 行；CSV 下载成功；控制台错误 0；截图样式与拆分前一致。
- 未做：P0 的 `ResumeCollection.vue`（1482）、`ReportView.vue`（1213）、`shared/src/doc.ts`（1404），以及 P1 / P2 文件；基线保留 18 条，后续继续只减不增。

### 日志系统完善（2026-11-13，产品版本 v1.69）

- 依据：`docs/archive/20261113/7-日志系统完善-开发文档.md` v1.1。目标：任何一个用户可见的故障，都能用学生姓名 / 答卷 id / 请求 id / 时间在 1 分钟内定位到原因。该文档原计划 v1.68，已被英语块校验 Review 占用，本轮按版本约定顺延为 v1.69。
- 统一日志：新增 `server/src/log.ts`，`debug / info / warn / error` 四级；生产输出单行 JSON，开发输出人类可读单行；`Error` 归一化为 `err.name / err.message / err.stack`，生产堆栈只留前 3 行。`server/src/env.ts` 新增 `LOG_LEVEL`（默认生产 `info`、开发 `debug`）。
- 请求日志：`server/src/index.ts` 在 `express.json()` 之前挂中间件，生成 `reqId`、回写 `X-Request-Id`，响应完成时记录 `method / path / status / ms / ip / ua / queryKeys`；排除 `/assets/*`、成功 `/api/health` 和 304，慢请求（>3s）提为 `warn`。路径用 `req.originalUrl` 固定（Express 子路由会改写 `req.path`，实测健康检查一度记成 `/health` 没被排除）；邀请 token / 报告 slug 替换为 `:token` / `:slug`，`wechat / phone / token / password` 等敏感 query key 不记录。
- 业务日志：submit 成功/校验失败；`ai.start / ai.ready / ai.retry / ai.failed / ai.unavailable / ai.queue / ai.unhandled`；doc 报告 `doc.initial / doc.rework_N / doc.audit_failed / doc.audit_passed`；检索 `search.start / search.done / search.query_failed`；博查缓存命中/单飞/外呼；咨询稿 `consult.start / consult.plan / consult.section.* / consult.end`；问卷升级改 `log.info`。
- AI 调用：`server/src/ai/deepseek.ts` 记录模型、耗时、返回字符数、`finish_reason`；调用方通过 `context` 带 `submissionId` / `stage`，不记录 prompt 或正文。
- 健康检查与兜底：`/api/health` 返回 `db / uptimeSec / commit / appVersion`；`commit` / `appVersion` 从 `data/deploy-info.json` 读取，文件不存在时为空串（写入属于第 9 篇，L5 仍走降级校验）。新增 `uncaughtException` / `unhandledRejection` 日志后退出。`env.ts` 的 3 条启动前配置提醒保留 `console.warn`（发生在 `config` 构造之前，改走 `log.ts` 会形成循环依赖），运行期日志已全部统一。
- 文档：`docs/README.md` 新增「运行与排障」，同步 health 字段、`LOG_LEVEL` 和已发布版本；`docs/agent-rules.md` 新增结构化日志约束；第 7 篇补实施记录，归档索引第 7 项同步为已修复。
- 验证：`npm run typecheck` + `npm run verify` 全绿。临时 `DATA_DIR` + 8791–8800 端口实测（不写仓库 `data/`、不调 AI）：开发/生产日志格式与级别过滤正确；health 返回 `db:true`，写假 `deploy-info.json` 后 `commit/appVersion` 正确；成功 health 不再产生 http 日志；`X-Request-Id` 与日志 `reqId` 一致；邀请 token、query 值、`wechat/phone` 均不出现在日志（grep 零命中）；后台建邀请后空答卷提交打 `submit.invalid`，完整答卷提交打 `submit.stored` 并串起 `ai.queue` → `ai.unavailable`；`env -u AI_API_KEY` 调用 `askDeepSeek()` 直接打 `ai.not_configured missing=AI_API_KEY`。
- 未做：真实 AI 端到端生成（避免费用）；`update.sh` 写 `data/deploy-info.json`（第 9 篇）；日志落文件（按方案默认不做）。

### 英语块校验误伤与漏拦订正（2026-11-13，产品版本 v1.68）

- 依据：`docs/archive/20261113/6-英语块校验-review报告.md`。复核 v1.67 校验层发现 3 处残留：考研 + 听力按同段共现误伤、口语 / 英语时长正则覆盖不全或偏严、第 5 篇分析稿题号过期。
- 考研 × 听力（`server/src/ai/doc-audit.ts` `crossModuleIssues`）：触发条件从「考研 + 听力共现」收紧为「确实写了考试语义（初试 / 复试 / 考试 / 科目 / 要考 / 加试 / 计入 / 占 N 分）且听力被写成要考 / 计入 / 占分」；保留复试 / 雅思托福 / 不考等白名单。`考研和听力是两件要一起抓的事`、`如果走考研，听力要早点练` 不再误拦；`考研初试考听力`、`听力计入总分` 仍拦。第 5 篇原问题句 `听力这一层……英语又是考研里绕不开的一门` 没有断言考试考听力，按收紧后的规则放行（review 复现表的旧期望与新规则冲突，以 review 第五节最终样例「考研 + 听力但没提考试 → 放行」为准）。
- 口语表述（`doc-audit.ts` `findTextIssues`）：新增 `hasLoweredSpeakingTarget()`，覆盖反向语序（`不追求口语流利`）、换词（`放一放 / 缓一缓 / 靠后 / 以后再说`）和跨行写法（匹配前把换行压成空格）；带否定的正确表述（`口语不能往后放` / `不能把口语往后放`）通过前置否定词放行。同步补 `shared/src/doc-skill.ts` 与 `outputContract()` 的提示文案。
- 英语块时长（`doc-audit.ts` `repetitionIssues`）：从「出现每周 / 小时即判重复」改为只拦复述问卷的每周投入 / 总时长（`每周 X 小时`、`总共 / 合计 X 小时`、问卷 `weeklyHours` 的档位值）；`每周末做一套真题`、`每天 1 小时听力` 这类练习节奏放行。`RepetitionContext` 增加 `englishWeeklyHours`，由 `doc-generate.ts` 从 `scores.english.weeklyHours` 传入。
- 文档：`docs/规划自测问卷-设计文档.md` 升 v1.5，§6.2 同步收紧后的考研 × 听力口径、口语反向语序 / 跨行覆盖和英语时长的「只拦复述」口径；`docs/archive/20261113/5-英语块表述核对与生成约束.md` 的题号按重排后的 Q1–Q28 全面订正（review 只点到 `weeklyHours` 的 Q25 → Q26，核对时发现全文仍是重排前编号，一并改为 Q20 / Q22 / Q23 / Q24 / Q25 / Q26 / Q27）。
- 回归用例：新增 `server/src/ai/doc-audit.cases.ts`（考研 × 听力 10 组、口语 12 组、英语时长 8 组、模块 / 数字边界 2 组），新增 `npm run check:audit` 并接入 `npm run verify`；`docs/README.md` 的验证说明与已发布版本同步到 v1.68。
- 验证：`npm run check:audit` 通过；`npm run verify` 全绿（check:docs / check:dates / check:audit / typecheck / build）。未调用 AI、未重新生成旧报告。
- 边界：不改问卷、不改数据模型、不改渲染层；旧报告不回填、不重新生成。

### 英语块表述约束与生成校验（2026-11-13，产品版本 v1.67）

- 依据：`docs/archive/20261113/5-英语块表述核对与生成约束.md`。2026-11-12 生成的英语师范报告在英语块写了「先听力，再口语」「口语不追求流利」，答卷里没有依据；「你写的原因是没人教方法」把多选原因压成单因。核对确认：这些表述能通过当时的 `findTextIssues`，英语块也没有专属写作规则。
- Skill：`shared/src/doc-skill.ts` 的 `english` 规则扩写——听说并列都要补、不得替学生降低口语目标、顺序只在材料支持时写、原因按 Q24 多选逐条写、验证方法只能作为建议、可点一句大学课堂的一般局限、英语块不写每周投入和总时长。
- 校验：`server/src/ai/doc-audit.ts` 的 `findTextIssues` 新增「英语不重要」「口语不追求 / 不用管 / 不重要 / 往后放」「先听力再口语」拦截；`repetitionIssues` 对 `english` 模块出现「每周 / 小时」判重复；`crossModuleIssues` 对同段「考研 + 听力……考」要求写明复试或雅思/托福（初试不考听力）。
- 数据：`server/src/ai/doc-prompts.ts` 的英语 spec 增加 `needNote / speakingNote / listeningWeak / reasonNote / skippedDetailNote`，消费此前只算不用的 `skippedDetail`；英语 spec 增加 `titleHint`。
- 渲染：`section` 块新增可选 `key`（`shared/src/types.ts`），`englishSection()` 写 `key: 'english'`，`applySystemModules()` 按 key 取模块，不再硬编码 `english`；`buildModuleSpecs()` 也用 `block.key ?? 'english'`。
- 文档：`docs/规划自测问卷-设计文档.md` 升 v1.4，§6.2 补英语写作约束、跨模块考研听力检查和英语块「每周 / 小时」去重硬校验；`docs/archive/20261113/README.md` 第 5 项状态同步为已修复。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。另用 `tsx` 直接调用审计函数做了回归样例（不调用 AI、不花费用）：坏表述原句被拦、改写稿能通过；未跑真实 AI 端到端生成。
- 边界：不改问卷、不改数据模型、不重新生成旧报告；P2 的脱敏答卷 fixture 回放（需 AI 调用）未做，留作后续。

### 问卷题目独立与题号重排（2026-11-13，产品版本 v1.66）

- 依据：`docs/archive/20261113/4-问卷题目独立与题号重排-开发文档.md` v1.1。用户要求 Q5a「想做什么行业、什么岗位」不再跟随 Q5 显示，独立成第 6 题，题号连续重排为 Q1–Q28；仍可跳过。
- 问卷：`shared/src/survey.ts` 删除 `q5a.showIf`；28 个 `code` 按当前数组顺序重排为 Q1–Q28（`id` 不动，答卷按 `id` 存，历史数据零迁移）。
- 迁移：`server/src/db/migrations.ts` 新增 `patchQ5aIndependent()`，customized 问卷只自动去掉显示条件、不强行重排编号（运营可能已用旧编号沟通）；非定制问卷启动时由 `surveyShape()` 差异整份对齐新默认结构。该迁移对定制问卷不可逆，上线前先 `VACUUM INTO` 备份。
- 文案：`shared/src/docScore.ts`、`shared/src/doc.ts` 的分数来源、`server/src/ai/doc-prompts.ts` 与 `doc-audit.ts` 的提示文案同步改到新编号。
- 埋点：`web/src/views/Quiz.vue` 的 `quiz_exit.total` 由写死 27 改为 `visible.value.length`。
- 文档：`docs/规划自测问卷-设计文档.md` 升 v1.3，题目、分组、跳题、报告规则与验收清单同步。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。未做完整浏览器走查。

### 后台 doc 模式不再展示映射分数（2026-11-13，产品版本 v1.65）

- 依据：`docs/archive/20261113/2-后台分数在doc模式是映射值-修复方案.md` v1.1。doc 模式没有数字总分，提交时却把优先级 A/B/C 映射成 82/60/25 写进 `submissions.total`，后台名单、答卷详情和 CSV 当成「分数」展示，和报告页对不上。
- 写入：`server/src/routes/public.ts` doc 模式 `total` 固定写 `0`，`tier` 仍写 `docPriority()` 的 A/B/C；legacy 继续 `computeScores()`。
- 读接口：`server/src/routes/admin/shared.ts` 新增 `surveyReportModes()` / `reportModeOf()`；`roster.ts`、`submissions.ts` 列表与详情每条带 `reportMode`。
- 展示：`Submissions.vue` doc 行只显示 `tier`，列名按实际模式显示「优先级」或「优先级 / 分数」；`SubmissionDetail.vue` doc 模式隐藏「总分 / 100」，标题改「优先级」；CSV doc 行「总分」留空（表头保留，避免混排错列）。
- 边界：不改表结构；历史 doc 答卷的 `total` 不自动回填（独立数据操作，需备份并单独确认，不影响界面）。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。

### 仪表盘「每组完成」恒为 0 修复（2026-11-13，产品版本 v1.64）

- 依据：`docs/archive/20261113/1-仪表盘每组完成恒为0-修复方案.md` v1.1。后台概览按 `events` 表里 `type = 'group_complete'` 的记录聚合每组完成人数（`server/src/routes/admin/overview.ts:30-39`），服务端事件白名单也允许该类型（`server/src/routes/public.ts:546`），但 `web/src` 从未上报过，导致漏斗里「完成第 X 组」恒为 0。
- 修复（方案 A）：`web/src/views/Quiz.vue` 新增 `reportedGroups`（会话内每组只报一次）和 `markGroupsCompleted()`；在 `advance()`（最后一题提交前也会执行）、`jumpToQuestion()`、`answers` 深度 watch、草稿恢复完成后各调用一次，上报 `track(token, 'group_complete', { groupId })`。
- 完成口径：组内所有**可见、非置灰、必答**的题都有答案才算完成，与 `canAdvance()` 和提交校验（`shared/src/validate.ts:130-138`）一致。方案 v1.0 原写「所有可见题」，但 `q5a`、`q18` 是 `required: false` 的可跳过题，若计入会让含这些题的组永远无法完成，实施时改为只算必答题。
- 草稿恢复：恢复完成后主动扫一遍并上报，避免用户分几次填写、最后直接提交时漏记前面已完成的组；同一 invite 由服务端按 `invite_id` 去重，重复上报不重复计数。
- 边界：不改漏斗 UI、指标口径和服务端逻辑；历史答卷没有组完成记录，不补算，上线后从新答卷开始计。方案 B（提交时服务端补记）与事件表索引优化未做。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。本地走查：答完第一组后 Network 出现 `POST /api/events`，请求体含 `{"type":"group_complete","payload":{"groupId":"p1"}}`；回退再前进不重复上报 `p1`；后台概览「完成第 1 组」计数与百分比不再为 0。

### 检索届别改用当前年份（2026-11-13，产品版本 v1.63）

- 依据：`docs/archive/20261113/3-检索届别改用当前年份-修复方案.md` v1.0。用户明确：检索词里的「届别 / 时效」直接用检索当年的年份（2026 年就搜「2026 届」），不再按 Q3 年级推算毕业年份——问卷信息不足，产品也不需要推算。
- 代码：删除 `shared/src/doc.ts` 的 `cohortYear()`；`server/src/ai/doc-search.ts` 改用 `new Date().getFullYear()` 拼全部检索词（主检索 / 方向补位 / 岗位补位 / 校园招聘兜底），拼法仍是「<城市> <关键词> <年份> 届 招聘」，只改年份取值。
- 元数据：`ReportSearchMeta.cohortYear` 改名 `searchYear`（检索词里拼的年份）；`normalizeSearchMeta()` 读取旧报告时兼容旧字段名 `cohortYear`，旧报告的检索记录与届别说明保持原样，不伪造历史。
- 文档同步：`docs/README.md`「检索可追溯」改为按检索当年年份拼「YYYY 届」，版本约定推进到 v1.63。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）；补做检索链路与旧报告兼容核对（stub 掉 fetch，不实际外呼）：同一专业按 Q3「大一」「大四」分别调用 `searchJobs()`，四类检索词都拼成 `2026 届`、`searchYear = 2026`；把旧报告存储 meta 改成 `cohortYear: 2028` 后，新代码渲染的「检索记录」仍显示「检索词按 2028 届拼写」，无 `undefined`。未跑完整 AI 报告端到端生成（避免 AI 费用）。
- 边界：不改检索时间窗、补位策略、`fallback` 与 18 个月过期判断；旧报告不重新生成。

### 文档状态同步与 `_scratch` 清理（2026-11-13）

- 提交状态：v1.63 / v1.64 在 `8207668`，v1.65 / v1.66 在 `dfd14a8`，均已推送到 `origin/main`；`docs/archive/20261113/README.md` 的状态表、上线说明与收尾建议同步为实际提交状态，删除过期的「全部未提交 / 索引 untracked」表述。
- 文档订正：`docs/规划自测问卷-设计文档.md` §6.2 的 `assets` 题号由旧编号 Q10 / Q11 / Q16 改为新编号 Q12 / Q13 / Q18；第 2 号方案里「CSV 仍保留 doc 总分」的过期描述改为「CSV 已按模式留空，接口仍返回历史 `total`」。
- 仓库卫生：`8207668` 误带入的 `_scratch/mem-patch.py` 已从工作区 / 索引删除，`.gitignore` 增加 `_scratch/`，一次性脚本不再入库；旧提交历史不改写。

## 本轮（2026-11-12）

### 前端拆包与巨型文件拆分（2026-11-12，产品版本 v1.62）

- 依据：`docs/archive/20261112/13-前端拆包与巨型文件拆分-开发方案.md` v1.2（v1.1 第一批 / v1.2 第二批），并已按同目录 [`15-13号前端拆包方案-Review.md`](./archive/20261112/15-13号前端拆包方案-Review.md) 补齐事实与验证记录；只调整「代码怎么放、按需加载什么」，不改任何接口、路由路径和业务逻辑。产品版本按 `docs/README.md`「版本约定」递增（并行的 14 号方案为 v1.61）。
- 前端拆包：`web/src/router.ts` 除 `Root` / `NotFound` 外全部改成路由级 `() => import(...)`；`web/vite.config.ts` 把 `vue` / `vue-router` 拆成 `vendor-vue` chunk。构建后入口 `index-*.js` 从约 383KB 降到 24.0KB，入口 + vendor 合计约 131KB（gzip 约 50KB）；管理端各页（ConsultWorkspace 35.5KB、ReportEditor 26.0KB、Submissions 25.4KB、ReportBlocks 25.6KB…）各自成 chunk，公开页不再下载管理后台代码。
- admin 拆分：`server/src/routes/admin.ts`（1473 行）拆成 `admin/index.ts` + `shared.ts` + `resumes/overview/invites/roster/submissions/settings`；`server/src/index.ts` 的 import 改为 `./routes/admin/index`。注册顺序与「`/login`、`/dev-login` 在 `requireAdmin()` 之前」的边界不变。拆分后 38 条路由：`GET /appointments` 是并行的 `14-管理员界面交互优化` 方案按「已无消费方」删除的（前端页面同时改为重定向到学员名单），不是本次拆分丢失。
- consult 拆分：`server/src/routes/consult.ts`（2378 行）拆成 `consult/index.ts` + `forest.ts` + `shared.ts` + `purposes.ts` + `collections.ts` + `trees.ts` + `runs.ts`；根路由 `GET /` 与 `/trees*` 一起放在 `trees.ts` 并最先挂载，`/collections/bundle` 仍在 `/collections/:id` 之前。目录比原文件深一层，读取 `shared/src/consult-purpose-data.json` 与 `consult-forest-seed.json` 的相对路径同步改成 `../../../../`，已确认种子树仍能并入森林。`runs.ts` 仍有 1228 行，留作后续单独处理。
- 拆分纪律：路由注册顺序、请求/响应、错误文案、鉴权边界都不变；共享辅助函数只留一份，不复制。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。用脚本对比拆分前后「方法 + 路径」清单：consult 33/33 完全一致；admin 38 条，与 HEAD 的唯一差异是上面那条已被 doc-14 删除的 `/appointments`。另用临时 `DATA_DIR` + 8799 端口起服务探测：`/api/health` 200；dev-login 后 `/api/admin/{me,invites,submissions,overview,survey,template,skill,roster,resumes}` 与 `/api/admin/consult/{purposes,collections,runs}` 全部 200；未带 token 的 `/api/admin/submissions`、`/api/admin/consult/trees` 均 401；`/api/invite/nope` 404。浏览器走查 `/`、`/admin`、`/admin/consult`、`/admin/consult/purposes`、`/admin/survey`、`/admin/submissions`、`/admin/resumes`，懒加载路由均正常渲染且无控制台报错。
- 第二批（组件与巨型模块拆分，同日完成）：`ReportBlocks.vue` 2283 → 217 行，按 `block.type` 拆出 `report-blocks/` 下 17 个块组件与 `jobMeta.ts`，共用样式收进 `report-blocks/shared/`（8 个 CSS，`<style scoped src>` 引用）；`ConsultPurposes.vue` 2080 → 273 行、`ConsultWorkspace.vue` 1883 → 193 行，画布 / 详情侧栏 / 运行编辑 / 导入分别拆到 `components/consult/`，状态与请求收进 `useMindmapViewport`、`useConsultRuns`、`useConsultImport`；`doc-generate.ts` 1630 → 321 行，检索 / 提示词 / 审计拆到 `doc-search.ts`、`doc-prompts.ts`、`doc-audit.ts`，原导出名与 re-export 保留；`db.ts` 963 → 27 行入口，拆到 `db/` 下 connection / core / schema / migrations / sessions / surveys / templates / skill，迁移顺序与导出名不变（不建 `db/index.ts`，避免与 `db.ts` 解析歧义）。
- 第二批验证：`npm run verify` 全绿。17 种 block 全部覆盖——9 种用真实报告页，6 种用 `/admin/report/preview`，`consistency` / `note` 无现成数据，用同构 payload 注入预览页。拆分前后同一份数据在 1440 / 375 的截图、计算样式、可见文本哈希逐字节一致，控制台无报错；期间发现并修正样式合并顺序导致的移动端 `LI.job` padding 偏差（`JobMapBlock.vue` 补回 720px 媒体查询的 `16px 16px`）。咨询工作台与用途页同样逐字节一致。
- `db/` 启动验证：用含 WAL 的现有库副本（`vesta.db` + `-wal` + `-shm`）以临时 `DATA_DIR` 连续启动两次，两次 `/api/health` 均 200，`PRAGMA integrity_check` 为 `ok`；`invites` / `submissions` 补列齐全，`surveys` 1 条、`consult_forest` 为同一份已应用种子的森林，第二次启动没有重复 seed。
- 剩余：`server/src/routes/consult/runs.ts`（1228 行），以及 `Submissions.vue`、`ResumeCollection.vue`、`shared/src/doc.ts`、`ReportView.vue` 等仍偏大的文件，拆分方向见方案第七节，留作后续单独处理。
- 边界：纯文件移动 + 懒加载，回滚即 revert；未改数据、未改接口、未提交 `data/` 和 `web/dist/`。截至 2026-11-12 评审时，第一批、第二批改动仍在工作区、尚未提交；提交后把 commit hash 补进方案第六节和本文件。

### 管理员界面交互优化（2026-11-12，产品版本 v1.61）

- 依据：`docs/archive/20261112/14-管理员界面交互优化-设计方案.md` v1.0。产品版本约定从 v1.60 起算，本轮为 v1.61（见 `docs/README.md`「版本约定」）。
- 删除咨询预约：移除后台 `Appointments.vue`、`/admin/appointments` 路由、`api.appointments()` 与 `AdminAppointment` 类型、侧栏入口；旧路径保留重定向到学员名单，避免旧书签 404。后端删除无消费方的 `GET /api/admin/appointments`。**保留**报告页领取/预约表单、`POST /api/report/:slug/claim`、`submissions` 的 `wechat_enc / slots / claimed_at / contact_status / admin_notes`，微信号和时间段继续在学员名单 / 答卷详情查看。
- 导航调整：「答卷与名单」改名「学员名单」；侧栏拆出「设置」组（问卷设置 / 报告设置 / AI 分析规则），三个页面路由不变，顶部共享胶囊式设置切换条；`navGroups` 新增 `settings` 键，旧 localStorage 用默认展开兼容。
- 交互统一：
  - 共享 `AdminPageHeader`，补齐邀请链接、学员名单、答卷详情的页头；页头/空状态样式提升到全局。
  - 共享 `SaveBar`：设置三页与答卷详情用底部保存条替代页头保存按钮；`useUnsavedChanges` 改为异步确认框守卫。
  - 共享 `ConfirmHost` + `confirmAction` / `promptAction`，替换各页 `window.confirm` / `window.prompt`；`Modal` 增加焦点陷阱、焦点还原、弹窗栈与滚动锁计数。
  - 学员名单：工具条/表头吸顶，行点击或 Enter 进详情，操作收进 `RowMenu`，选中行出现批量操作条，`/` 聚焦搜索，`Ctrl/Cmd+S` 保存。
  - `ConsultWorkspace` 接入未保存提醒，`SaveBar` 逐模块保存并保留已完成部分；收藏栏卡片改为单击 / Enter 打开，不再依赖双击。
- 范围外：不改问卷与报告业务口径，不重新生成旧报告，不做数据迁移。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。Playwright 走查：侧栏无「咨询预约」，`/admin/appointments` 重定向学员名单；设置切换条与分组状态正常；学员名单 `/` 搜索、工具条吸顶、表头吸顶、行点击 / Enter 进详情、批量选择条、更多菜单 Escape 关闭均正常；设置页 SaveBar 出现 / 放弃回滚 / 离开守卫正常；答卷详情页头与保存条正常；390px 无横向溢出；报告页领取表单仍在（只读检查，未提交）；控制台无报错。旧答卷 `scores.dimensions` 为空属历史数据口径，未修改。

### 报告检索遗留与文案细节修复（2026-11-12）

- 依据：`docs/archive/20261112/12-报告检索遗留与文案细节-修复方案.md` v1.0。剩余问题集中在「检索词届别、网络失败重试、错误文案、几处 UI 文案」。
- 检索届别：`shared/src/doc.ts` 新增 `cohortYear()`，按 Q3 年级和当前学年（9 月为新学年）推算四年制毕业年份；`server/src/ai/doc-generate.ts` 删除 `queryYear()`，`buildSearchSpecs()` 和补位/校园招聘兜底检索词统一用 `<YYYY> 届`，不再出现与学生届别不符的当前年份。`ReportSearchMeta` 新增可选 `cohortYear`，报告底部「检索记录」注明「检索词按 XXXX 届拼写」；旧报告没有该字段时不显示。
- 网络重试与错误文案：`searchOne()` 区分「可重试」（429 / 限流、`fetch failed`、超时、连接重置等瞬时网络错误）与「不重试」（无权限、参数错误）。瞬时网络错误只补一次（1.2s 退避），429 保持原来的最多三次退避。`shared/src/doc.ts` 新增并导出 `friendlySearchError()`，把底层错误转成「网络请求失败，可以重新检索」「检索服务繁忙（触发限流），稍后可重试」「检索服务鉴权失败，请检查 BOCHA 配置」等中文；未知错误原样保留，不吞掉真实原因。`runSearches()` 记录转换后的文案，`sourcesBlock()` 读取旧报告时也做同样转换，旧报告底部不再出现裸的 `fetch failed`。
- 薪资占位符：生成侧在文档 9 已删除 `'薪资以原文为准'` 兜底（`salaryOf()` 抓不到就留空），本轮核对确认无需再改；按产品规定旧报告永不重新生成，也不在渲染层硬改薪资文案。
- 文案与 UI：`ReportBlocks.vue` 的 hero 行加 `v-if="block.tierLine"`，`tierLine` 为空时不再渲染空白 `<p>`；doc 报告里 `tierLabel` / `total` 都为空时 `.hero-foot` 整块不渲染，避免残留 28px 空白。`outputContract()` 补两条约束——分数落在经验值区间端点时写「达到上限 / 下限」，不写「在……之上 / 以下」；`assets` 模块标题写「你现在能借到的力」，不叫「资源」「能力盘点」。`assetsBlock()` 默认标题同步改为「你现在能借到的力」。
- 核对用文案：`usedForJob()` / `sourcesBlock()` 的 `usedForOf()` 统一成「用于核对：学历 / 经验 / 薪资」的分号格式（只列原文真实出现的字段），`ReportBlocks.vue` 的岗位说明改为「用于核对：学历 / 经验 / 薪资（有才写）」，方向外原文说明也统一为「用于核对」。
- 委婉口径：`docScore.ts` 的 `potential.level` 仍只作内部分级，对外只显示 `label`（「可提升空间 · 大」），注释写明不要 UI 暴露 `level`；`doc-generate.ts` 把它传给 AI 仅作事实输入，不直接展示。
- 文档同步：`docs/README.md`「检索可追溯」补届别检索词、瞬时错误重试与错误文案规则。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）；未跑完整 AI 报告端到端生成（避免额外 AI 费用），旧报告按产品规定不重新生成。

### 报告重复冗余修复（2026-11-12）

- 依据：`docs/archive/20261112/11-报告重复冗余-修复方案.md` v1.0。基线报告 `/r/gDJT5DqM9-X9IVfxtrYs2vr6N3M`（答卷「312」）：内容不算错，但「离秋招还有约三年」出现 6 次、英语总时长 2 次、目标城市整串 5+ 次、「缺一段经历」3 次、过期提示逐卡刷。原则是去重放在生成/校验阶段，不在渲染层正则删段落，也不为省字数删检索记录。
- 时间距离收口（`shared/src/doc.ts`）：`roadmapBlock()` 的标题从「X 怎么走」改为「节点怎么走」，不再复述距离；只保留 `gap` 的「关键时间窗」和 `roadmap` 副标题两处距离表达。
- 英语时长收口（`shared/src/doc.ts` + `server/src/ai/doc-generate.ts`）：`gapLines()` 删除「按你现在的英语投入」整行（连同只服务它的 `weeklyHours()` / `WEEKLY_HOURS`）；`buildModuleSpecs()` 的 roadmap 数据不再把 `hoursLine` 喂给 AI，roadmap 副标题保留唯一一次总时长，AI 重复写会被数字审计拦下。
- 城市收口（`shared/src/doc.ts`）：`gapLines()` 的「目标城市」改用 `resolveTargetCity()` 落到的具体城市，落不到时写「本次未限定城市」，不再回抄 Q8 档位串；`buildModuleSpecs()` 把 `targetCity` 放进 gap / jobmap 的 `data`，让 AI 有具体城市可写。
- 过期提示收口（`shared/src/doc.ts`）：删除 `jobMatch()` 给每条过期卡塞的 `missing`「时效：这是某年的公告」；改由 `jobMapBlock()` / `gapBlock()` 的块副标题统一提示一次「有过期原文，只作要求结构参考」，卡片只保留前端已有的「信息较早」标签。
- 「缺一段经历」句（`shared/src/doc.ts`）：删除 `jobMatch()` 在所有具体缺口都对上时补的通用句（原「相关实习：简历上还缺一段和目标方向对得上的经历」）；岗位卡只保留由招聘原文真实要求推出的「你还缺」项，没有具体缺口就不写，整句最多留在 scorecard 或 gap 一处。
- 生成约束与校验（`server/src/ai/doc-generate.ts`）：`outputContract()` 补时间距离、目标城市、英语时长、缺经历整句、过期提示五条约束；`deadline` / `roadmap` 的 spec 数据删掉 `distance` / `text` / `hoursLine`，避免 AI 直接抄；新增 `repetitionIssues()`，扫描 AI 正文里的 `还有约 X` / `距离 X`、Q8 选项原文、模块标题里的时间距离和「缺一段经历」整句，先反馈重写一次，仍在则整份报告失败（`AI 报告重复：…`）；总时长不再下发给 AI，重复写会被原有数字审计拦下。
- 文档同步：`docs/规划自测问卷-设计文档.md` 6.2 新增「全报告去重」、6.3 补展示位置；`docs/README.md`「报告生成」补校验范围。
- 边界：旧报告按既定产品规定不重新生成、不 retry；本轮只保证新生成的报告不重复。未跑完整 AI 报告端到端生成（避免额外 AI 费用），验证到类型检查和构建；上线后建议用新答卷走查一次。

### 报告模块间矛盾修复（2026-11-12）

- 依据：`docs/archive/20261112/10-报告模块间矛盾-修复方案.md` v1.0。基线报告 `/r/gDJT5DqM9-X9IVfxtrYs2vr6N3M`（答卷「312」）：事实层（分数、时间、检索记录）可信，问题是同一件事被不同模块按不同数据源各说一遍。
- 简历盘点为空要写出来（`shared/src/doc.ts` 的 `gapLines()`）：以前 `resumeNow()` 为空时整行省略，AI 只看到「目标岗位」空着，就写成「还空着的只有一项」；现在「现在能写进简历的」这一行始终输出，空时明确写「还没有」。
- 方向卡专业冲突（`directionFacts()`）：同一方向内有人原文写专业范围、学生专业不在范围内，另一条原文没写专业限制或写「不限专业」时，`facts` 补一条「这几条原文对专业的写法不一致，以具体岗位为准」；`majorFits()` 抽出专业是否对口的判断，和 `jobMatch()` 共用同一组关键词。
- 方向外原文标注（`jobMapBlock()`）：`relatedJobs` 的 `usedFor` 前缀「这条原文写的是另一类岗位」，避免和方向卡结论混在一起。
- 生成约束与校验（`server/src/ai/doc-generate.ts`）：`outputContract()` 补三条机器约束（gap 不能下「只有一项」整体结论、有 stale 原文参与时 `entry` 必须带「仅看要求结构，不能当投递入口」、`facts` 提示专业写法不一致时 `fit` 必须写明）；新增 `crossModuleIssues()`，在原有模块完整性 / 文本 / 数字审计之外做跨模块检查，问题先反馈给 AI 重写一次，仍在则整份报告失败（`AI 报告前后矛盾：…`），不把矛盾文本写进报告。前端不做文字游戏。
- 文档同步：`docs/规划自测问卷-设计文档.md` 6.2 补 jobmap / gap 口径和跨模块一致性一条；`docs/README.md`「报告生成」补校验范围。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。
- 审计（2026-11-12）：代码与跨模块校验已核对到位。**报告是一次性快照，生成后作为后续咨询的依据，旧报告永不重新生成**；因此旧报告里的矛盾不追溯。结果侧不硬卡：方向卡可选字段（`what` / `entry` / `salary` / `fit`）缺失时照常出报告，跨模块校验只在字段存在且与事实矛盾时要求重写。

### 博查检索时效与岗位块修复（2026-11-12）

- 依据：`docs/archive/20261112/9-博查检索时效与岗位块-问题与修复方案.md` v1.0。现象来自本地报告 `/r/gDJT5DqM9-X9IVfxtrYs2vr6N3M`（答卷「312」）：检索词全部不带城市、返回 2018—2024 年高校就业网老公告、过期原文仍参与「入场线」统计、AI 照抄「薪资以原文为准」占位符、「原文门槛」与 `entry` 重复渲染。
- 检索时间窗：`server/src/ai/doc-generate.ts` 的 `searchOne()` 与 `server/src/ai/generate.ts` 的旧版报告检索统一传 `freshness: 'oneYear'`；`searchWeb()` 的默认值仍是 `noLimit`，但所有调用点显式给值，缓存 key 已含 freshness，不受旧缓存影响。
- 补位检索：主检索（oneYear）可用原文不足 3 条时，再用同一检索词跑一次 `oneMonth`，结果标记 `fallback: true`；`fallback` 原文会随 `JobCard` 传给报告（`jobSpec` / `readDocContent`），但 `directionFacts()` 只统计 `!stale && !fallback` 的原文，补位结果只作要求结构参考。完全没有结果时的校园招聘兜底也标 `fallback: true`。
- 过期不进统计：`shared/src/doc.ts` 的 `directionFacts()` 先过滤 `stale`，剩余不足 2 条直接返回空；统计口径改为与卡片展示的原文（最靠前的 2 条非过期原文）一致，不再出现「展示 2 条、按 3 条算」。
- 时效双证据：`isOldJob(date, title)` 同时看 `datePublished` 和标题里的 4 位年份，冲突时按更早年份从年初算（宁严勿松）；`jobScore`、`usableOf`、`readDocContent` 都走同一判断。
- 城市落地：`shared/src/doc.ts` 新增并导出 `MAJOR_CITIES` / `cityInText()` / `resolveTargetCity()`；Q8 选「新一线」时优先用 Q4 学校所在地（排除北上广深），否则从档位括号文案抓第一个城市；「家乡省会 / 回家」用 Q4 家乡城市；「北上广深」只在 Q4 学校所在地属于该档位时使用。抓不到城市时检索词不加城市，并在报告「你能去的几个方向」副标题里写明「本次未限定城市」；`checklist` 的检索词改用落地后的具体城市。
- 薪资兜底：`server/src/ai/doc-generate.ts` 删除 `'薪资以原文为准'` 占位符，`salaryOf()` 抓不到就留空，前端 `v-if="direction.salary"` 自动隐藏；报告底部来源文案改为按原文实际字段生成（有薪资才写「薪资」）。
- 重复渲染：删除 `web/src/components/ReportBlocks.vue` 中方向卡下方重复的 `direction.facts` 脚注（事实仍进 `moduleSpecs` 供 AI 写 `entry`），同步删除 `.direction-mix` 样式。
- 正则假阳性：`directionFacts()` 的「接受应届/经验不限」改为原文命中 `经验不限|在校|应届` 且不含 `\d+-\d+年` / `\d+年以上`，避免标题带「应届毕业生求职」但要求 2—3 年经验的原文被算成接受应届。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。另用临时脚本（`DATA_DIR` 指向 `/tmp`，不写仓库、不提交）以「计算机科学与技术、Q8 新一线、Q4 学校在杭州」调用真实 `searchJobs()`：城市落为杭州（`basis: school`），实际检索词为「杭州 Java开发 / 前端开发 / 软件测试 / 数据分析 2026 应届 招聘」；返回岗位日期集中在 2025-12 至 2026-05，多条带 13-26K、20-40K 等薪资，本次未触发 fallback。另用本地构造的 `JobCard` 验证：过期原文和 fallback 原文都不进 `facts`，「应届毕业生求职」但要求 2-3 年经验的原文不再被算成接受应届。未跑完整 AI 报告生成，避免额外 AI 费用；上线后建议用**新提交**的答卷做一次最终走查（旧报告不重新生成，见下条审计结论）。

### 文档 9 审计结论（2026-11-12）

- 审计对象：`docs/archive/20261112/9-博查检索时效与岗位块-问题与修复方案.md`，对照提交 `3b4423d` / `0cc5be5` 与本地库 `data/vesta.db`。
- 代码链路已全部修完：P0（一年时间窗、`oneMonth` 补位 + `fallback` 标记、删除薪资占位符、过期/补位不进统计）、P1（城市落地、应届正则修正、日期双证据）、P2（删除重复 facts 脚注、来源文案按字段生成）均已落地；`docs/README.md` 与上一小节已同步。
- 旧报告 `gDJT5DqM9-X9IVfxtrYs2vr6N3M`（答卷 312）不会变好：`ai_status = 'ready'`，`POST /api/report/:slug/retry` 返回 409；库内 `jobs[].salary` 与方向卡 AI `salary` 仍是「薪资以原文为准」，`entry` 仍是 2018—2024 原文的统计；渲染层 `cleanStoredSalary()` / `applySystemModules()` 不过滤占位符，也不标注全过期方向。
- **产品规定：旧报告永不重新生成**（不 retry、不用新答卷回填旧报告）。后续 Agent 不要建议 retry 或重生成旧报告；要处理旧报告只能改展示层。
- 本轮按用户决定「先只记录结论」，不改展示层。后续若要修旧报告，推荐（仅渲染层、不改库、不重生成）：`cleanStoredSalary()` 过滤「薪资以原文为准」；jobmap 方向展示的原文全部 `stale` 时给 `entry` 加「原文均较早，仅作要求结构参考」前缀。
- 本轮未做真机端到端验收（完整 AI 报告生成）；上一小节的验收只到 `searchJobs()` + 手工构造 JobCard。

### 问卷分组：Q27 拆出独立「未来画面」（2026-11-12）

- 起因：最后一题 Q27 挂在第四部分「英语这块」下面，问卷页大标题跟着分组显示「英语这块」，与「五年后，你希望自己是什么样」不符；`docs/archive/20261112/6-问卷连续性-优化建议.md` 也提过「最后连着 8 道英语 + 1 道未来画面」。
- 改动：`shared/src/survey.ts` 的 `groups` 新增 `{ id: 'p5', code: '五', title: '未来画面' }`，Q27 的 `groupId` 由 `p4` 改为 `p5`；题目顺序、题号、选项、跳转、计分、报告规则都不变。
- 生效范围：没在后台「问卷设置」发布过的问卷，启动迁移会按默认结构对齐（`server/src/db.ts` 的 `migrateSurvey`）；后台改过分组/文案的自定义问卷不会自动改，需要在后台手动调整。
- 文档：`docs/规划自测问卷-设计文档.md` 升到 v1.2，分组表拆成四（Q19–Q26）/五（Q27），闸门说明同步。
- 验证：`npm run verify`（check:docs / check:dates / typecheck / build）。

### 博查检索成本优化：检索缓存 + 渐进式检索（2026-11-12）

- 依据：`docs/archive/20261112/7-博查检索成本优化-设计方案.md` v1.0（已批准并实施；按用户 2026-11-12 的约定，开发文档统一放 `docs/archive/`）。用户反馈博查按次计费、单份报告要外呼 4—8 次，确认按方案 A（缓存）+ B（渐进式检索）做，P5（计费口径）、P6（日预算熔断）不在本轮。
- 起因：计算机 / 国贸专业一份求职报告要搜 4 个方向（`doc-generate.ts` 的 `primarySpecs`），不足 3 条再补位最多 3 次，完全没有结果再兜底 1 次；`generate.ts` 的 `MAX_AI_ATTEMPTS = 4` 自动重试每次都重跑 `searchJobs`，上一轮检索结果直接丢弃；全站无检索缓存，同城同专业学生的检索词一模一样却各付一次。
- 缓存（`server/src/db.ts`、`server/src/ai/bocha.ts`）：新增 `search_cache(key PRIMARY KEY, results TEXT, created_at TEXT)` 与 `idx_search_cache_created`，`CREATE TABLE IF NOT EXISTS` 放在同一段 schema 内，旧库启动自动补表、可重复执行。key = 空白折叠 + 转小写的检索词 + `c{count}` + `f{freshness}`（不改词序、不删词，避免把语义不同的词合并）。TTL 7 天；读时过期或 JSON 解析失败就删行当未命中；写时 `ON CONFLICT(key) DO UPDATE` 并顺手 `DELETE` 过期行，不新增定时任务。`now()` 统一取 ISO 时间。
- 并发去重：模块级 `inflight: Map<string, Promise<SearchResult[]>>`，同一 key 并发只外呼一次，`finally` 必删，失败请求不会永久挂住后续调用；错误不缓存，429 重试和 AI 重试行为不变。只对单进程有效（当前 systemd 单实例）。
- 缓存边界：`searchWeb()` 仍是唯一外呼入口，`generate.ts` 的老版问卷报告（`Promise.allSettled` 并行 1—3 个检索词）也自动受益。缓存命中照样记本次「实际检索词/来源/结果数」到 `ReportSearchMeta`，报告底部展示口径不变，也没有给 `shared/src/types.ts` 加 `cached` 字段（P4 默认值）。
- 渐进式检索（`server/src/ai/doc-generate.ts` 的 `searchJobs()`）：`buildSearchSpecs()` 不动，仍返回全部方向；调用顺序改为先跑第 1 个方向，若可用原文（非旧、像招聘、过方向相关性）≥3 条就停，不足才补跑其余方向，之后才计算 `missingDirections` 并走原有补位/兜底。命中时 4 方向专业只花 1 次，不命中时退回现有行为，不会比改动前更差。
- 代价（已写进方案 4.3）：停得早时报告「岗位方向」只显示实际搜到结果的那一个方向，覆盖变窄但不编造数据。若要恢复多方向覆盖，把阈值 3 调高或改成「先搜 2 条方向」；回滚只要删掉 `searchJobs()` 里的渐进式 `if` 分支。
- 风险与默认值：缓存可能把 7 天内的岗位原文喂进报告，但 `isOldJob()`（18 个月）仍会过滤；空结果默认也缓存 7 天（P2），补位/兜底用的是不同检索词，不受影响；表体积远小于 `events`，写入即清理。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。另用临时桩脚本（`fetch` 打桩，不进仓库，`DATA_DIR` 指向临时目录）验证：规范化 key 命中缓存、`count` 进 key、并发 single-flight 只外呼一次、空结果也缓存、8 天前的行按过期重取并覆盖、错误不缓存、损坏行当未命中并删除、写入时清理过期行；渐进式检索验证了「首个方向够 3 条只搜 1 次」「首个方向 0 条时补搜全部方向 + 补位」「同答案第二次检索 0 次外呼且检索记录照常」。未在真机跑博查（会产生费用），因此没有「连提两份真实报告」的走查；上线后按方案第七节第 3 步用 `SELECT count(*), max(created_at) FROM search_cache` 观察一周命中情况，再决定是否做预算熔断。
- 复核修复（2026-11-12，见 `docs/archive/20261112/8-博查检索成本优化-实施Review.md`）：首个方向与其余方向之间补 500ms 限流间隔（`doc-generate.ts`）；`readCache` 按 `fetchSearch` 同一规则归一化缓存字段，原数组非空但过滤后为空时删行当未命中（`bocha.ts`）；README 修正「待实施稿」「检索记录」两处旧口径；恢复被本次归档整理误删的 `docs/archive/项目计划书-2026-11-10.md`（归档记录只保留、不删除，`development-history.md:100` 的引用因此仍有效）。

### 问卷页面 UI 优化（邀请页 / 问卷页）

- 依据：`docs/archive/20261112/1-问卷页面UI优化-开发设计方案.md` v1.1，按第 10 节全部默认值（P1=A 只显示分组名 + 百分比 + 细条；P2=A 末题点选仍自动提交；P3=A 自动前进 250ms；P4=A 单题单屏；P5=A 不改结果页；P6=A playwright 不写入仓库；P7=A 真机未验证要如实记录）实施。
- 视觉：新增问卷作用域令牌 `--q-*`（冷灰绿纸 `#EFF1EC`、松墨 `#1B231E`、深绿 `#2F5C48`），只在 `.invite` / `.quiz` 子树和这两个页面存在时的 `body` 背景生效；`/admin` 继续用原变量。邀请页、问卷页标题改用无衬线，衬线只留在结果页正文；取消 uppercase eyebrow、等宽题号与返回箭头。
- 进度：只显示分组名、百分比和细条（1px 点线轨道 + 2px 已完成段），不显示题数或完成数量；`role="progressbar"` + `aria-label="问卷进度"` + `aria-valuetext`，符合设计文档第 67 行「不显示已答 X / N」。
- 交互：单选改为 `radiogroup` + `radio` + roving tabindex，方向键只移焦点、Space/Enter 选中、键盘不自动跳题；指针点选仍 250ms 自动前进，键盘选中后停留。错误就地红框 + 题下 `role="alert"` + 滚动并聚焦首个控件；`window.confirm` 改为题内二次确认。
- 微信与键盘：`100svh` / `100dvh` 回退；聚焦输入时底栏先「让位」进文档流，`visualViewport` 检测到键盘后抬升到 `--kb-offset`，键盘占屏超过 45% 时隐藏底栏；`pagehide` / `visibilitychange` 兜底保存草稿。粗指针设备不用 `backdrop-filter`。
- 一处实现偏差（记录以免回退）：原页面在 `Quiz.vue` 的 `h1` 和 `QuestionField.vue` 的 `.q-title` 各渲染一次题干，同屏出现两遍同一句话（历史截图可证）。本轮把题干收敛到 `Quiz.vue` 的 `h1` 一处，`QuestionField` 只保留多选/选填标签，`hint` 也只由 `Quiz.vue` 渲染；题目文案本身未改。
- 范围：只改 `web/src/views/Invite.vue`、`web/src/views/Quiz.vue`、`web/src/components/QuestionField.vue`、`web/src/styles.css`；未改 `shared/src/survey.ts`、接口、提交 payload、计分、埋点事件名，未改 `ReportView.vue`。

#### 统一按设计文档校正（同日复审后）

- 标题层级（用户裁断：分组 H1 + 题干 18/20）：分组名渲染为 `h1.group-title`（24px / 桌面 28px），题干渲染为 `h2#question-stem`（18px / 桌面 20px，weight 500，`tabindex="-1"`），`hint` 为其后的 `.sub`。键盘切题时焦点落到题干，读屏顺序与视觉层级一致。
- 可访问名称：`QuestionField` 新增 `labelledby` prop，rating `.scale` 与 single/choiceText `.options` 的 `radiogroup` 使用 `aria-labelledby="question-stem"`，不再重复 `aria-label` 题目文案。
- 进度条：轨道改为 1px 点线（`repeating-linear-gradient`），已完成段 2px 叠在轨道上，补齐 `aria-hidden` 与 `aria-label`。
- 尺寸与间距：问卷页移动端左右内边距 18px → 20px；「上一题」桌面 46×96、移动 44×88；草稿恢复按钮高度统一 44px；滚动余量改为默认 180px、键盘模式 `.kb-focus` 24px（由 `styles.css` 的 `.quiz` 作用域控制，删掉 `QuestionField` 里的固定 90px）。
- 邀请页草稿提示（用户裁断：去掉「已填 X 题」）：只显示「上次填到第 N 组」。草稿里的 `step` 是可见题序号，现用 `visibleQuestions()` + `groupId → groups.findIndex` 换算成真实分组序号，不再直接把题号当组号显示；有草稿时内容淡入从 350ms 全局动画改为 120ms 局部 opacity。
- 顺带修复：提交校验失败时 `suppressAnnounce` 只在确实跳题时置位（`jumpToQuestion()` 返回 boolean），避免当前题缺失时标记泄漏、吞掉下一次正常切题播报。
- 验证：`npm run typecheck`、`npm run verify` 均通过；用 Playwright（缓存 Chromium，未写入仓库）在 375 / 1440 宽度复核：进度条 1px 轨道 + 2px 完成段、分组 24/28px、题干 18/20px、选项高 51px、roving tabindex `[0,-1,…]`、方向键只移焦点不改答案、Space 选中后停留、Enter 前进并聚焦 `#question-stem`、错误态红框 + `role="alert"` + 聚焦首个控件、指针点选 250ms 自动前进、文本题滚动余量 180 / 24px、邀请页草稿显示「上次填到第 2 组」、无横向滚动、无页面报错。真机（微信内置浏览器 / 暗色模式）仍未验证，如实记录。

### 问卷移除顶部进度条（2026-11-12）

- 依据：`docs/archive/20261112/5-问卷进度条移除-开发文档.md`（方案 A，整块删除）。推翻本轮早先「分组名 + 百分比 + 细条」的进度口径（见上一条第 11、21 行）。
- 原因：进度按「当前可见题数」当分母计算（`(step + 1) / visibleQuestions().length`）。Q19 英语重要性是 0—10 滑块，拖到 6 分及以上会让后面 5 道英语题变为可见，分母从 22 跳到 27，百分比和细条在用户停在同一题、什么都没提交的情况下往下掉；拖回 5 分又跳回去。这是分母随答案变化，不是样式抖动；其他会改变后续题可见性的题也有同样隐患。
- 改动：`web/src/views/Quiz.vue` 删除 `.progress-wrap` 整块（含 `role="progressbar"` 与 `aria-*`）、`progressPct` / `progressAriaText` 两个 computed，以及 `.progress-wrap` / `.progress-meta` / `.progress-group` / `.progress-pct` / `.progress-track` / `.progress-done` 样式和 720px、560px 响应式里对 `.progress-wrap` 的覆盖（`.foot` 的半透明背景保留）。
- 保留：`groupTitle`——它同时是页面标题 `h1.group-title` 和切题读屏播报（「下一题：分组名」）的来源，开发文档里「只被进度块使用」的判断已过时；`statusText` 的 `sr-only aria-live` 播报、上一题按钮、底部草稿提示、吸顶与键盘逻辑均不动。
- 文档同步：设计文档第 67 行、第七节「交互与视觉」改为「不显示答题进度 / 进度条和题数」；不改 `shared/src/survey.ts`、`shared/src/doc.ts`、接口、提交 payload、计分、埋点事件名。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。Playwright（npx 缓存里的 Chromium，脚本与截图不进仓库）在 375×812 走查：Q19（`q24`）滑块 5 → 6 → 5 拖动时，题干、分组名、`.sheet` 顶部、页面高度和滚动位置全部不变；页面已无 `[role="progressbar"]`、无 `aria-valuenow`/`aria-valuetext`、无百分比文本；下一题 / 上一题正常，切题仍播报一次 `aria-live`（「下一题：英语这块」）；缺答案时仍显示「这一题还没完成」+ `role="alert"` 并聚焦首个控件；末题按钮仍是「提交并生成报告」；1440×900 复核布局正常、无横向滚动、控制台无报错。为走查临时建了一个邀请，结束后已删除；未真正提交答卷（不触发 AI 生成报告），真机（微信内置浏览器 / 暗色模式）未验证。

### 报告模块重做：去硬编码、全量 AI 分析、数字与时间可追溯

- 起因：原报告的板块、结论和岗位方向有大量代码写死的兜底内容，同一个 Skill 下不同答卷会看到相似段落；时间距离出现过“还有 547 天”；检索失败时缺少可重试的真实原因。
- 分析规则：doc 模式只读后台 `/admin/skill` 当前启用的模板（默认内置在 `shared/src/doc-skill.ts`）。模板缺失或为空直接抛错，不再回退到 `DOC_SKILL`、审校 Skill 或模板版报告。
- 模块化输出：`server/src/ai/doc-generate.ts` 先由程序生成 `moduleSpecs`（评分卡、现有资源、岗位方向、目标差距、路线图、行动清单、英语和三个章节），每个模块带着允许引用的数据；AI 只写标题、一句话判断、正文和逐项解释。输出结构固定为 `{conclusion, modules[]}`，缺模块、多模块、空字段或占位符都会判失败。
- 去硬编码：删除按域名过滤招聘结果、`site:` 检索词、从 URL 解析岗位字段、固定城市薪资、固定岗位方向兜底、固定“简历里能写什么”等逻辑。岗位方向只保留 `shared/src/job-map.ts` 的专业方向映射，且方向下没有真实检索结果时整块不显示；“你现在能用的东西”只列 Q9/Q10/Q15 里勾选过的内容。顺带删除了 `shared/src/doc.ts` 中已不再使用的 `docFacts`、`oneLine`、`stuckLayer`、`futureText`、`salaryRange` 等规则版函数。
- 数字审计：程序计算分数、比例、月份、阶段和岗位门槛；生成后扫描 AI 文本中的数字，只允许来自问卷回答、`moduleSpecs`、岗位数据和检索记录的数值。出现 `547 天`、`24 个月`、数字年份等表达直接重写一次，仍不通过则整份报告失败，不把错数字写进报告。
- 审校误判修复：答卷 `zYLSmH0iTmVuCywgguQmGrrIrVA`（大一、就业、距秋招 34 个月）的路线图阶段窗是程序算出的「第 10—28 个月」，AI 把它抄进 `label` 后被“≥12 个月必须粗粒度”的规则整份判失败。现在 `findTextIssues()` 接收 `moduleSpecs` 里的阶段窗白名单，只放行真正落在系统时间窗里的月份；「还有 28 个月」仍会拦截。输出约束要求 `roadmap.label` 只写阶段名，不重复时间窗。审校/数字/模块完整性失败改为可自动重试和手动重试，只有配置缺失、规则为空/不存在才不可重试。合并 roadmap 时，AI `label` 若仍带月份数字会被丢弃，时间窗只由系统 `period` 显示一次；`label` 为空时不再渲染空标题。复盘见 `docs/archive/20261112/3-报告生成-路线图月份误判.md`。
- 时间：所有时间距离统一走 `shared/src/date.ts` 的日历差函数，输出两年/三年、一年/一年半、X 个月、不到一个月、已过去 X 等粗粒度说法；`shared/src/date.cases.ts` 覆盖跨年、闰日 2/29、月末 31 日、整年、同日和已过期情况。
- 检索透明：博查缺 `BOCHA_API_KEY` 或 `BOCHA_BASE_URL` 时明确报错，不再静默返回空数组；`ReportSearchMeta` 记录是否配置、检索词、时间、结果数和来源链接，展示在报告底部。失败状态由公开接口返回真实原因，并新增 `POST /api/report/:slug/retry`（每分钟 5 次）供报告页“重新生成”。
- 报告页：桌面端收窄正文宽度、拉开区块间距，去掉靠分割线撑结构的写法；移动端单列、正文不小于 14px、可点区域不小于 44px，长表格改为卡片或横向容器。新增失败与重试状态，不再显示“基础内容”冒充 AI 报告。
- 保存入口：报告页顶部去掉“打印 / 保存”，保留“保存图片”，新增“保存为 PDF”，复制链接不变。PDF 由前端用 `html-to-image` + `jsPDF` 在浏览器里直接生成并下载，不再打开浏览器打印弹窗；按 A4 分页，切页时优先选正文空白行，避免截断文字。截图按约 300dpi 输出，并用边长/像素总量上限兜住手机长图的内存。打印样式保留给用户自己按 Ctrl+P，操作栏、认领区和页脚仍会隐藏。
- 本阶段仅本地开发，未改问卷题目/选项/计分/提交逻辑，未改 `.env` 已有键，未提交 `data/`、`web/dist/` 或任何真实凭据。

### 第一波报告 Review 返工（2026-11-12）

- 依据：`docs/archive/20261112/2-report-wave1-review.md`。复审确认 3 个阻断项与多数重要项属实，本轮按 `B1 → B3 → B2/I3 → I1 → I2 → I4/I5/S1/S3` 顺序修复；I4 中「兼职改写属于 assets」的定位有误，实际在 gap 的简历事实里。
- B1 gap 去硬编码：`gapLines()` 只保留程序能算出的事实（第一选择、关键时间窗、目标城市、目标岗位、专业、简历里已有的项、期望薪资、经济约束、英语现状和每周投入），删除「入场线」「城市判断」「下一步」「门槛对照」等固定建议句；gap 模块改为 `paragraphsRequired`，分析和建议由 AI 写在 summary / paragraphs，`ReportBlocks` 渲染 AI 正文。设计文档 6.2 同步口径。
- B3 数字审计按 item 收紧：`auditNumbers()` 保留全报告白名单，同时对 `scorecard` 每个 item 建立自己的数字集合；item 文本里的数字必须属于该项数据（`N 分` 必须等于该项系统分数），写别的 item 的分数会触发重写，二次仍不通过则整份失败。输出约束同步告知模型。
- B2/I3 日历差：`calendarSpan()` 改为「先用原字段差得到 totalMonths，再用 `addCalendarMonths()` 从起点加完整月、截断月末，最后用 UTC 日差算 `days`」。这样 `2024-01-31→2024-03-01` 返回 1 个月 1 天而不是 -1 天，同时保留现有 `describeDistance()` 的粗粒度结果。`date.cases.ts` 新增日历日粒度用例、修正误标的“未来日期”用例，并把 `check:dates` 接入 `npm run verify`。
- I1 检索重试：报告已 ready 时不再显示必然 409 的「重新检索并生成」按钮，改为提示需要新建报告；`ReportView` 在已有正文时也会显示重试失败原因，不再静默。
- I2 Skill 缺失：`getReportSkillState()` 不再把找不到的 activeId 改写成 default；`getDocReportSkill()` 的「规则不存在」分支现在可达并明确报错。后台仍可在 `/admin/skill` 重新选择模板。
- I4 固定文案：删除 `resumeNow()` 里「兼职 → 可写成沟通、执行、抗压」的固定解释，简历事实改用问卷原标签；设计文档明确模块副标题和结构标签是系统说明，不属于 AI 正文。
- I5 部署兼容：不恢复代码内置服务商地址；启动时若配置了 key 但缺 base URL，打印明确 warning，文档同步说明影响。
- S1/S3/S2：修正归档文档的提交状态；提示词里的“今天”改用本地日历日期；PDF 继续动态加载 `jspdf`，本轮不做替换。

### 复审遗留项 R1–R4（2026-11-12）

- 依据：`docs/archive/20261112/4-report-wave1-review2.md`。复审确认原报告 3 个阻断项已关闭；本轮修掉其列出的 1 项重要残余（R1）和 3 项建议（R2–R4）。
- R1 scorecard summary 审计：`contentTexts()` 给模块 summary 加 `moduleSummary` 标记；`auditNumbers()` 收集该模块所有 item 的合法分数，scorecard 的 summary（页面「可提升空间」正文）里出现的 `N 分` 必须命中其中一项，不再能靠全报告白名单把别的项分数写进去。「0—10 分」「满分 10 分」「10 分制」等量纲说明仍放行。
- R3 item 审计收紧范围：取消「item 文本里的所有数字都必须属于该项数据」的宽泛白名单——它会把模块计数当成分数放行 `得分 8`，又会误伤 `CET-4` 这类合法写法；现在只识别分数表达（`N 分`、`得分 N`、`N/10`）并与该项 score 比对，其余数字继续交给全报告白名单。
- R2 提示文案：报告已 ready 且检索未配置时，第一条提示改为「配置修复后，新建报告即可重新检索」，不再和「报告已经生成」同时出现两句矛盾的话。
- R4 依赖：根 `package.json` 显式声明 `tsx`（`devDependencies`），`check:dates` 不再依赖 server 依赖被 hoist 到根 `node_modules/.bin`。
- 验证：`npm run verify`。未调用真实 AI / 博查，未做浏览器走查。

### update.sh：用五层校验证明“运行的就是远程最新代码”

- 起因：原来的 `update.sh` 不拉代码，日常需要人工 `git pull` 后再运行；脚本也不校验拉取结果、依赖锁、构建产物和进程启动时间，无法证明线上运行的是 `origin/main` 最新提交。
- L1 代码：`git fetch --prune origin main` 后 `git pull --ff-only origin main`；断言 HEAD 与 `origin/main` 完全一致、工作区干净。未提交改动、detached HEAD、非 main 分支、无法快进（分叉）都直接退出，不 reset、不 stash、不覆盖用户文件，并给出手动处理命令。`--no-pull` 只跳过 pull，仍 fetch 并校验 HEAD。
- L2 依赖：拉取前后对比 `package-lock.json` 和 `package.json` 的 SHA256；有变化或 `node_modules` 缺失时执行 `npm ci --include=dev`（不再用 `npm install`），然后用 `npm ls --depth=0` 检查 missing/invalid；检查失败会自动再跑一次 `npm ci` 修复。
- L3 构建：构建前把旧 `web/dist` 移到临时目录并创建构建时间戳；构建后断言 `index.html`、assets 存在且所有产物都晚于时间戳。构建失败或产物异常时恢复上一版 `dist` 并退出，不会带着旧产物重启。`--skip-build` 仅在 `web/dist` 不旧于前端源码时允许。
- L4 进程：重启后分别读取 systemd `ExecMainStartTimestampMonotonic`/`ActiveEnterTimestampMonotonic`、PM2 `pm_uptime`、Docker `State.StartedAt`，断言进程启动时间晚于构建完成和本次重启请求。
- L5 对外：`/api/health` 必须 200、`ok:true`，`time` 晚于本次重启且与当前时间相差不超过 3 分钟；再抓取首页，断言引用了本次构建的 JS 指纹。当前 health 没有版本字段，因此 L5 退化为时间戳 + 前端指纹，服务端源码版本由 L4 启动时间保证；若以后 health 返回 `version`/`commit`/`sha`，脚本会自动与 HEAD 比对。
- 脚本自更新：拉取后比较 `update.sh` 的 git hash；变化时带 `--resumed` 用新脚本重新执行，并通过环境变量把更新前 HEAD 和依赖哈希传给新进程，避免丢失回滚点和依赖变化检测。exec 后沿用父进程的 `flock`，不会自己锁死自己。
- 可用性：新增 `--help`、`--no-pull`、`--skip-build`、`--mode=xxx`、`--resumed`；非 TTY 自动关闭彩色输出；`flock` 防并发；失败时打印失败阶段、日志命令、数据库备份路径、代码/数据库回滚命令；健康检查失败自动输出最近 60 行服务日志。
- 兼容性：保留 `DEPLOY_MODE` 的 docker/systemd/pm2/auto 语义、数据库备份保留 14 份、`/api/health` 端点不变。`DEPLOY_MODE=none` 仍然不自动重启，但因为无法完成 L4/L5，脚本会在构建后明确失败退出，而不是假装更新成功。
- 未改动业务代码、`.env`、`data/`、`web/dist/`；只修改 `update.sh` 与文档。

### 文档口径同步（设计文档 v1.1）与「文档优先」规则

- 起因：`docs/规划自测问卷-设计文档.md` v1.0 自称唯一口径，但问卷 2026-11-10 重做后没有同步——题项数、题号、Q7 选项、跳题逻辑、报告规则里的题号都与 `shared/src/survey.ts` 对不上；后续 Agent 照文档会把已删的 Q23 加回来、把新增的 Q9/Q10 删掉。
- 处理：设计文档升到 **v1.1**，按实际实现重写题目全量、跳题与闸门、报告规则题号、A/B/C 分层条件（与 `docPriority()` 对齐）和序列化字段；新增「零、变更记录」，并把口径改成「文档优先：先改文档再改代码」。
- 归档：根目录 `项目计划书.md`（28 题八维计分旧方案）移到 `docs/archive/项目计划书-2026-11-10.md`，加「已作废」声明，不再作为实现依据。
- 其他文档：`docs/README.md` 补文档分工与设计文档入口、修正线上端口说明（8082）、补 `update.sh` 与本文件的交叉引用；`docs/consult-system.md` 架构图去掉已删除的「旺季 / 淡季模板」。
- 规则：以后需求变更走「文档 → 代码」，见 `docs/agent-rules.md` 新增的「文档优先」一节。

### 把「文档优先」做成可执行的 Agent 机制

- 起因：规则只写在 `docs/agent-rules.md` 里，Agent 经常不读、读了也不执行；需要入口文件、执行清单、自动检查和「不会就查」的补足路径。
- `AGENTS.md`（仓库根）：所有 Agent（Codex / Claude Code / DSH）开工必读——必读顺序、文档优先流程、实现纪律（摘 agent-rules）、交付前验证表、不熟的部分怎么办、禁止事项。
- `CLAUDE.md`（仓库根）：Claude Code 入口，指向 `AGENTS.md` 并重复三条硬性要求。
- `.dsh/skills/vesta-dev/SKILL.md`：项目级 skill，DSH 会话里可直接调用，把「读文档 → 按文档实现 → verify」固化成流程。
- `scripts/check-docs.mjs` + `npm run check:docs`：自动核对 `shared/src/survey.ts` 每道题是否都写进设计文档、`docs/agent-rules.md` 关键小节是否还在；`npm run verify` = `check:docs` + `typecheck` + `build`。
- MCP：`.mcp.json`（Claude Code）与 `.codex/config.toml` 都接入 **context7**（查官方文档）和 **playwright**（真实浏览器走查），补上 `web_search = "disabled"` 之后的资料检索缺口。
- 边界：检查只覆盖「文档有没有写」，不保证「写得对」；口径分歧仍要人评审后先改文档。

## 本轮（2026-11-11）

### 报告招聘卡片：保留原文链接，修正检索与展示

- 起因：一份 doc 模式报告的「和目标之间还差多少」下面，出现了 2018 年校招公告、标题只有「上海」的猎聘城市落地页、薪资统计页；薪资还被抓成「1-3」（实际是年限），摘要截断在「具有良好品质,无」。用户明确要求**保留这些原文链接来支撑报告里的岗位/薪资判断**，不能删掉检索结果。
- 检索词：学生没填 Q5a 时，用「专业 + 相关岗位」而不是把专业名直接当岗位；不再把专业名原样拼进搜索词。
- 结果筛选：优先选近 90 天/一年内、标题像具体招聘的结果；超过约 18 个月的旧公告降权，仍保留链接并在卡片上标注发布日期；剔除城市落地页；薪资统计/就业分析类文章先降权，只在岗位信息不足 3 条时补位。
- 字段解析：薪资区间必须带 k/千/万/元，拒绝把「1-3 年经验」「2018-2019 年」当薪资；摘要尽量截在句号，旧数据补省略号；城市从标题/摘要里识别，不再直接填目标城市；卡片显示「来源 + 城市 + 薪资 + 发布日期」。
- 旧报告兼容：`readDocContent()` 读取时清掉误抓的薪资、补省略号、按发布日期排序、剔除城市落地页；不需要改服务器数据库，重新打开报告页即可生效。
- 差距板块：Q5a 没填时，「目标岗位」显示「还没写清楚」，并单独显示「你的专业」，不再把专业名当成目标岗位。
- 招聘卡片上方新增一句说明：这些原文用于核对岗位门槛和薪资，点标题看原文。

### 报告内容扩充与系统口径修正

- 用户要求：**AI 规则内容不动，其它修复都做**。因此没有改 `DOC_SKILL`、`defaultReportSkill`、审校 Skill 或后台模板内容，只改系统块、数据结构和报告渲染。
- 新增三种报告块：
  - `assets`「你的底牌」：从 Q7/Q9/Q10/Q11/Q15/Q16/Q26/Q28 里找已经存在的资源，最多 3 条；分数不够时用“还有时间/还有选择空间”兜底，不硬凑优点。
  - `jobmap`「你能去的几个方向」：按专业给方向、做什么、入场线、经验值薪资和匹配点；每个方向下面挂招聘原文，另设 `relatedJobs` 放没有归到具体方向的原文。国际经济与贸易先覆盖外贸业务/跟单、跨境电商运营、单证/报关、银行国际业务/国企外贸；其它专业给一个“专业相关岗位”方向。
  - `roadmap`「N 个月怎么走」：按系统给的关键节点、剩余月份和每周投入拆成 3—4 个阶段，每阶段只写一个主目标和可验证产出，并带“每周日 10 分钟复盘”的执行规则。
- `gap` 块新增「现在能写进简历的」「还缺的」「城市判断」「经济约束」四类行；「按现在的投入」继续显示“每周约 10.5 小时，到秋招约 1000 小时”。
- 英语块修正：去掉系统侧“你最卡的是词汇层”的绝对断语（避免和 AI 第一段“不止词汇”直接冲突）；`preparing` 分支补“具体以目标单位最新公告为准”；30 天计划按词汇/听力/开口/时间/方法分别给具体动作。
- 招聘检索按方向分组：`searchJobs()` 对已知专业按方向各搜一次，再补一条专业总览；`JobCard` 新增 `directionKey` 和 `usedFor`，旧报告没有方向字段时按标题/摘要关键词补。卡片上显示“用来核对……”而不是只放一个链接。
- 招聘卡片不再只挂链接：每条原文新增「你符合 / 你还缺」两行，把岗位原文里的学历、专业、英语（四级/六级）、实习、证书、薪资逐项对上填卷人的 Q1/Q2/Q9/Q10/Q17/Q27。只做条件对照，不写“能不能录用”；原文没写的项不乱猜。原文点名的 Excel/数据、店铺运营、单证流程、校招笔试会单独列成技能/流程缺口。
- 薪资统计/就业分析页不按岗位门槛对照，只标“薪资参考，不是具体岗位”，避免把统计文章当成可投岗位。
- 口径修正（审阅后）：「按现在的投入」和路线图副标题改成“只算英语”，不再把每周英语时长说成补短板总时长；英语块会引用招聘方向里的英语要求，不再与招聘卡“岗位要四级”冲突；路线图不再写死“3 个方向”；潜力说明直接点名实习实践、个人技能、方法与习惯、执行力四项。
- 招聘卡片去重：已有「你能去的几个方向」时，「和目标之间还差多少」不再重复挂同一批卡片，链接仍保留在方向地图里。
- 「你现在能用的东西」只列答卷里已有的资源，不再用“你愿意把问题摊开看 / 你还有时间”这类安慰句凑满三条；一条都没有时整块不显示。
- 旧报告打开时仍走 `readDocContent()`：清掉城市落地页、误抓薪资，补省略号；新增的 `assets/jobmap/roadmap` 是读取时按答卷和系统分数生成的，不需要改数据库，也不会自动重写旧 AI 正文。
- 没有改后台「AI 分析规则」：doc 模式报告实际使用 `DOC_SKILL`，后台默认展示的是九维 `defaultReportSkill`；自定义模板如果启用，会作为“顾问补充规则（优先遵循）”追加，写九维/优势/缺口等旧结构会和固定 5 段冲突。这一点仍需要在运营侧注意。

### 招聘原文结构化：回答“为什么不像 Boss 直聘那样记录”

- 用户反馈：招聘信息还是“只有链接”，搜索引擎返回的结果不满意，问为什么不能像 Boss 直聘那样一条条记录岗位。结论：Boss 直聘没有公开 API，DeepSeek 本身不能联网搜索，Bocha 是网页搜索而不是岗位库。可行做法是**系统先定岗位方向，再用站内搜索验证门槛，把网页里的岗位字段解析成结构化记录，链接只作为证据**，不承诺做成实时岗位库。
- 岗位方向：`shared/src/job-map.ts` 新增 `COMPUTER` 方向组（后端 / 前端 / 测试 / 数据），按专业关键词（计算机、软件工程、人工智能、数据科学、信息安全、网络工程、物联网）路由；国际经济与贸易仍走外贸/电商/单证/银行四方向。通用兜底方向直接用专业名检索。
- 检索来源：优先 `site:yingjiesheng.com`（应届生求职网，校园招聘记录最全，URL 的 `property` 参数带月薪和公司名），不足时补 `site:liepin.com`，再不足才用智联/前程无忧。Bocha 有 429 限流，改为串行检索、间隔 500ms、失败重试 3 次（1.2s/2.4s 退避）。
- 结构化解析：从标题/摘要/URL 解析岗位名、公司、城市、薪资、学历、经验、任职要求；应届生 URL 的 `property` JSON 直接取 `monthSalary`、`companyName`。薪资统一成 `8-16K` / `年薪25-30万` / `4500-9000 元`，识别“年薪/年包/万每年”避免把 25-30 万读成 250-300K；排除“1-3 年经验”“2018-2019 年”这类假薪资。
- 结果过滤：识别并剔除城市落地页、门户/培训/招生页（offcn、huatu、zhaokao、无企业关键词的 `.edu.cn`）；标题清洗掉「X招聘_公司」「【X】」等模板词；按 jobdetail/jobid 去重；`directionRelevant()` 再按方向关键词过滤，避免“财务管理岗”“税务客服”混进外贸方向。
- 报告对照：每张卡继续对填卷人答卷给出「你符合 / 你还缺」。新增 985/211、双一流院校门槛和硕士/研究生学历门槛识别（含「学历：硕士」「应届硕士生」写法），对不上时写“投递前确认公告是否放宽/是否接受本科”，不下“不能投”的结论；发布日期超过约 18 个月的标 `stale`，label 从「你符合」改为「按原文对照」。
- 方向汇总：`directionFacts()` 从该方向全部招聘原文里汇总学历分布、是否接受应届、写明年限的条数、高频技能（Java/Spring、SQL、Vue/React、测试用例、Excel、英语四级），最多 3 条，显示在方向卡片下方「原文门槛」；样本少于 2 条不汇总，避免拿一条记录代表整个方向。
- 数据不足时保持诚实：某些方向（如数据分析）搜索引擎索引里没有 2026 届新岗，宁可显示空，也不拿旧文章或无关岗位填满。

## 本轮（2026-11-10）

### 问卷整体重做（按《规划自测问卷-设计文档》）

- 原问卷（45 题、九维打分、AI 报告）整体替换为 27 题的四段式问卷，唯一口径见 `docs/规划自测问卷-设计文档.md`。
- 关键变化：
  - 单屏一题，选项点选后 250ms 自动进入下一题；多选/填空/数字用「下一步」；顶部进度条「已答 X / 27」。
  - 三条跳题：Q5→Q5a（不想/没想清楚时）、Q6→Q16（按 Q6 分支换整道题面）、Q17→Q18（四级 0 次时隐藏）。
  - Q17 拆成「次数 + 分数」两题；0 次时分数题置灰。
  - 学校档位改为 C9 / 985 / 211 / 双一流 / 普通一本 / 普通二本 / 民办本科 / 公办专科 / 民办专科。
  - 报告改为规则化（`shared/src/doc.ts`）：一句话结论、卡在哪一层、什么时候要命、五年后的画面；分层 A/B/C 只用于后台（写入 total/tier）。
  - 数据模型新增 `showIf` / `disableIf` / `branches` / `range`，以及 `survey.reportMode = 'doc'`。
- 旧问卷的存量答卷仍走原 AI / 基础报告路径（按 `answers` 是否含 `q1` 区分）。
- 报告接回 AI：提交后异步调 DeepSeek 生成整份报告（一句话结论 + 固定 5 个小标题，800—1200 字），提示词在 `server/src/ai/doc-generate.ts`；生成中先展示规则版，完成后自动替换；失败时显示原因并保留规则版，后台可重新生成。
- 已知简化：Q4 城市下拉暂做成两个「省 - 市」文本输入（缺省/市联动数据源）；「复制完整结果 JSON」按钮待做。

### 问卷进度与报告加载（2026-11-10 晚）

- 问卷页去掉「已答 X / 27」和「第 N 题」这类计数，只保留顶部进度条，避免学生看到还剩多少题就放弃；分组标题保留。
- 报告不再给「基础版」：AI 没生成出来时，报告页只显示动态加载画面（三个跳动圆点 + 分阶段文案），后台会继续重试，好了自动替换。
- AI 生成改成两遍：第一遍写报告，第二遍审校（检查空标签、未替换占位符、重复标点、语病、与系统数字冲突、禁用词），审校结果保留原 5 个小标题；审校失败不影响主报告，但占位符/空段落/禁用词会直接判失败重试。
- 报告生成会叠加后台「AI 分析规则」里的自定义规则（与默认规则一致时不叠加）。
- 修 `docScore.ts` 潜力值取错分组的问题：实习、技能在「起点」组里，此前只查个人四维导致标签为空，出现「卡住你的是、，」。
- `normalizeDocAiContent` 统一清理重复标点、空标签残留，读旧报告时也会自动修正显示。

### 按《Vesta 报告页 Review》补齐（2026-11-10 深夜）

- 五因素每项加「入场线（经验值区间）」和「这个分从哪几道题来」，个人四维也标了来源题号。
- 目标差距新增：应届薪资区间（按城市档位给经验值）、门槛对照（英语现状 vs 这条路的要求）、投入总量（剩余月数 × 每周小时）。
- 英语板块补两处：低分者（Q24 < 6）明确标注「后面 5 道细节题按规则跳过」，不是没答；`need` 判定补上「Q5 想从事本专业」。
- 接回博查检索：按 Q8 城市 + Q5a 岗位抓 3 条真实招聘信息，做成可点开卡片（公司/岗位/薪资/摘要/原文链接），检索失败只少卡片、不影响报告。
- 修 `docScore.ts` 单选取值的 bug：`optionLabels` 只能读多选，导致英语现状/分数段/听说全是空字符串；新增 `singleLabel` 后正常。
- 与文档的已知差异：没有把 0—10 分写进题目选项的 `score` 字段，而是用 `docScore.ts` 按文档 5.2 的加成/封顶规则直接算。这样能表达「对口 +0.5」「技能叠加封顶」这类规则，`scoring.ts` 的选项平均分做不到；每项都带来源题号，可复核。
- 仍未做：顾问端独立「完整版」（分层 A/B/C 与检索来源目前只在后台详情页的 tier 和报告卡片里体现，没有单独的顾问视图）。

### 问卷自定义保护与 Q7 选项（2026-11-10 深夜）

- 后台发布过的问卷会打上 `customized: true`，服务启动的自动迁移遇到它直接跳过，不再覆盖运营自己调的选项；只有从未在后台保存过的默认问卷才走迁移。
- 修了一处每次重启都会把问卷版本 +1 的迁移逻辑（B 组不存在时也会标记 changed）。
- Q7「现在在准备什么」换成运营给的 9 个选项：绩点 / 四六级 / 竞赛科研 / 实习 / 计算机二级、普通话、教资、初会之类的证书 / 专升本考试 / 琢磨怎么实现经济独立 / 期末考 / 期中考；「其他（填空）」子题随之删除。
- 依赖 Q7 文字的判断改成包含匹配：英语需求看「四六级/四级/六级」，倒计时节点支持「教资」「专升本考试」出现在长选项里。
- 迁移只对旧默认 Q7 生效（含四级、六级、还没开始），自定义问卷不动。

### 答卷与名单：自定义分组（2026-11-10 深夜）

- 新增 `roster_groups` 表（软删除）和 `invites.group_id`：每条记录只能属于一个分组，未分组单独显示。
- 列表顶部新增分组筛选条：全部 / 未分组 / 各自定义分组，带头部「管理分组」面板（新建、改名、删除、恢复）。
- 勾选记录后工具栏出现「移到分组…」，可批量归到某个分组或移出分组。
- 删除分组只删分组本身：成员的 `group_id` 保留，列表里显示为未分组；在「已删除的分组」里恢复后自动回到原分组。
- 日期分类支持删除与恢复：`roster_hidden_dates` 记录被隐藏的日期，只影响日期筛选的显示，不删任何答卷；日期面板里可以删除某个日期分类，也能在「已删除的日期」里恢复。
- 日期筛选、状态标签逻辑保持不变，与分组筛选叠加生效。

## 本轮（2026-11-05）

### 管理员多设备登录

- 登录从单会话改为每次生成独立 `sid`，写入 `admin_sessions`。
- 多台设备可同时登录；退出只删除当前设备会话。
- 登录有效期默认 30 天。

### 服务器更新流程

- 已确认日常更新为 `bash update.sh`（2026-11-12 起脚本自己拉取并校验；旧脚本仍需先手动 `git pull` 一次）。
- `update.sh` 负责备份数据库、安装依赖、构建前端、重启服务、健康检查。
- 前提是服务器 `.env` 已配置、首次安装已完成。

### 报告预览

- 后台增加 `/admin/report/preview`，可直接查看当前报告模板的完整渲染效果。
- 预览不会写入真实答卷。

### AI 分析失败处理

- 已确认产品方向：AI 失败时必须显示失败原因并可重试，不要用低质量兜底模板伪装成 AI 成功结果。
- 当前公开报告仍保留“基础内容”失败展示路径，后续如继续改造，应优先移除或明确区分为“基础内容”，不能让用户误以为是 AI 分析。
- AI 请求有超时、重试与明确状态；管理端可以重新生成报告。

### 答卷与名单

- 邀请链接与答卷名单合并职责：邀请页只负责生成链接；链接状态、打开、提交、领取、联系状态统一在“答卷与名单”查看。
- 名单支持分类：未提交、待打开、已打开、已过期、已提交未领取、新答卷、已联系、已预约、已完成。
- 删除催填逻辑。
- 日期筛选支持多选与“全部日期”；全部日期时表格用颜色区分不同日期的单子。
- 日期采用可涂色方块交互：点击选中、再点取消、可连续拖动涂选，并提供全选。
- 日期很多时横向/换行展示，避免挤出页面。
- “复制”按钮只复制链接，不复制名字；“复制全部链接”已删除。

### 问卷封面

- 封面去除多余说明、题量用时、隐私说明和重复营销文案。
- 保留“你离想去的工作，还差哪几步呢”。
- “开始填写”按钮居中、突出，减少视觉干扰。

### 咨询系统

- 新增咨询树、咨询工作台、路径索引、咨询稿风格页面。
- 树节点表示咨询师要说的话；下一节点由学生特点、历史回答、节点权重、奖励和惩罚共同决定。
- 支持列表与可拖动缩放的思维导图双视图。
- 默认不展开树，避免大树在前端卡顿；支持逐层展开、全屏、工具隐藏、双击节点编辑。
- 长链按深树组织，后端限制为最多 2000 层、10000 节点；长稿按 2 / 3 / 4 万字逐章生成。
- 每条根到叶路径生成稳定索引；成交率使用 Wilson 置信下界，特点与样本全部由历史数据计算，不提供人工填写。
- 支持多棵咨询树；跨树完全相同的句子共用节点身份，便于交叉路径复用。

### 七月逐字稿导入（最新）

- 用户明确：当前咨询路径只以 `zxg/七月咨询稿.docx` 为来源，系统中不再保留任何自拟开场或默认话术。
- 新增 `scripts/import-consult-docx.mjs`，可直接解析 docx、预览并写入数据库。
- 导入规则按用户要求调整：加粗阶段标题是阶段节点，标题下面的话术是同级兄弟节点，不能串成一条长链。
- 本地数据库已替换为唯一一棵“七月咨询稿”树，438 个节点；旧的 `consult_tree` 预置数据已删除。
- 导入前备份：`data/backups/vesta-before-july-tree-*.db`。
- 后续若新增成交稿，应导入为新树或明确合并，不得再生成系统自拟路线。

### 九月逐字稿导入（2026-11-05 续）

- 新增导入 `zxg/9.18+吕新蕊+260301005+热合曼+一开始想用便宜资源学_原文.docx`，作为独立咨询树“9.18 吕新蕊咨询稿”。
- 该文件是带“发言人 / 时间戳”的原始逐字稿；导入脚本会自动识别咨询师发言人（也可用 `--consultant=编号` 指定），把咨询师话术串成路径，并把学生回答挂到上一句咨询师节点。
- `scripts/import-consult-docx.mjs` 改为安全合并：按树名替换同一棵树，其他咨询树保持不变；写入前用 SQLite `VACUUM INTO` 生成一致性备份。原始版本会整片覆盖 `consult_forest`，已废弃该行为。
- 本次导入 462 段咨询师话术、410 条学生回答，共 463 个节点；导入前备份：`data/backups/vesta-before-import-2026-11-05T04-44-54-962Z.db`。
- “七月咨询稿”保持 439 个节点未变；导入后当前共 2 棵树、902 个节点。

### 旺季 / 淡季模板

- 曾加入旺季、淡季推荐与预置咨询路线。
- 用户随后要求删除季节框架和自定义预置路线，以导入的成交咨询稿为主。
- 已移除 `ConsultSeason`、旺季模板、旺季路线和前端推荐提示。
- 数据库已清理 `consult-peak-*` 节点：清理前 119 个节点，清理后 26 个；清理前备份位于 `/tmp/vesta-before-peak-cleanup-2026-11-05T04-32-49-036Z.db`。
- 没有重置整棵树，也没有删除历史回答。

### 咨询目的树（2026-11-05）

- 新增后台只读页面“咨询目的树”（`/admin/consult/purposes`），提供列表与思维导图两种视图，共用右侧目的详情。
- 目的树把逐字稿收敛为“目的动作”：节点概括这一段要达成什么，情绪垫话作为蝴蝶挂在目的上，示例组保留原文和学生回答。
- 七月稿拆出 6 个阶段、74 个目的动作（13 个可选支线、4 个待补充）、18 个蝴蝶、102 组示例；9.18 稿的片段挂在相同目的上，用于验证跨稿共享同一张骨架。（并入 9.18 就业与收尾分支后为 90 个目的、26 个可选支线、119 组示例。）
- 数据由 `prototype/consult-purpose-tree/generate.mjs` 生成到 `shared/src/consult-purpose-data.json`；后端 `GET /api/admin/consult/purposes` 只读该文件。
- 这一步不写数据库、不改现有 `consult_forest`、不改 SKILL，也还没有接入咨询稿生成和决策；目的树目前只用于人工审阅粒度、命名和蝴蝶位置。

### 咨询树统一与模板（2026-11-05）

- 后台只保留一个“咨询树”页面（原“目的骨架”），模板切换、列表、思维导图、节点详情都在同一视图。
- 移除“话术路径”的导航和页面路由；旧地址 `/admin/consult/tree` 重定向到咨询树。
- `consult_forest` 和 `consult_runs` 没有删除：咨询稿生成、路径索引仍在使用这批数据。页面入口去掉不等于数据清理；如要彻底清空需单独确认。
- 咨询树数据改为模板结构：`meta.activeTemplateId` + `templates[]`，每套模板包含 `id / name / season / description / source / stats / tree`。
- 当前七月稿定义“旺季骨架”（`peak`）。9.18 吕新蕊稿同样是旺季稿，不单独建模板；它的片段通过 `prototype/consult-purpose-tree/sources.mjs` 映射进同一套旺季骨架，后续旺季成交稿也按同样方式并入。淡季模板等淡季稿到了再建。
- 9.18 稿目前有 29 组片段映射到旺季树（340 / 462 段咨询师话术）；就业主线补成 `window.job`（以终为始 / 就业错配 / 简历时间线）、`filter.track`（四条就业赛道 / 她的计划）、`filter.competition`（竞赛窗口 / 类型 / 取舍）三组可选支线，承接后补上价格、家长、犹豫、报名、课后跟进五个收尾分支。剩余片段是设备调试、重复确认和暂时没有对应目的的内容，继续补节点和映射时再并入。

### 9.19 三篇逐字稿并入（2026-11-05）

- 新增三篇旺季稿到 `sources.mjs`：`919a` 胡余敏（16 组映射）、`919b` 马术菊（27 组）、`919c` 黄嘉慧（32 组），全部挂到现有旺季目的上，不新建模板。
- 生成后示例从 119 组增至 194 组、话轮从 1052 条增至 1746 条；目的节点仍是 90 个。
- 胡余敏稿的 docx 实际拼接了两段录音，时间戳在 29:36 后回到 00:00，第二段的发言人编号与第一段角色相反。`scripts/import-consult-docx.mjs` 现在按时间戳回退切分录音段落，逐段识别咨询师，避免第二段咨询师话术被当成学生回答。单段录音的文件行为不变。
- 三篇稿子中未被映射的内容主要是：考研动机与院校目标、考研竞争对手分类、考研四科拆解、专业能力提升路径、专业细分岗位、大学生三类人、旧机构沉没成本与报班决策。这些主题现有目的树没有对应节点，先保留为未映射，等确认是否补节点后再回填。

### 咨询路径种子树（2026-11-05）

- 咨询路径（`consult_forest`）存在数据库里，`data/` 不随 git 走；新装或远端空库默认只有一棵空的“未命名咨询树”。
- 新增 `shared/src/consult-forest-seed.json`（随 git 提交），内含“七月咨询稿”和“9.18 吕新蕊咨询稿”两棵树，共 902 个节点；已去掉学生回答历史，不带个人答卷数据。
- 后端第一次读取咨询路径时，如果尚未执行过种子（`consult_forest_seed_applied` 不是 `1`），把种子中缺失的树并入森林：同 id 或同名的现有树不覆盖（避免远端之前单独导入过一份时出现重复树），空白的“未命名咨询树”占位会被清掉，其他树和 `consult_runs` 保持不变。
- 合并后记录 `consult_forest_seed_applied=1`，之后不再自动写入；即使用户之后手动删掉或清空，也不会重新出现。
- 本地数据库已按此逻辑写入两棵树（439 + 463 节点），原有 `consult_runs` 未受影响。

### 目的树接管咨询稿生成（2026-11-05）

- “写咨询稿”不再走逐句决策，改为“学生状态 + 目的树”：非可选目的全部保留，可选支线由 AI 结合学生情况选择并给出依据，AI 不可用时按分支条件关键词兜底。
- 生成前保存本次目的路径到 `consult_runs.purpose_path`；章节规划给每章分配 `purposeKeys`，章节正文只参考本章目的、导演提示和 2 条来源不同的示例。每章覆盖的目的写入 `consult_run_sections.purpose_keys`，重试沿用已保存的规划和已完成章节。
- 反馈按目的累计到新表 `consult_purpose_feedback`（`selected / won / lost / liked`），不再回写逐句森林。
- 后台移除“路径索引”和“咨询稿风格”页面、导航与路由；工作台的路径索引行、断点选择和逐句预览一并删除。路径索引模块与接口不再需要，相关前后端代码已移除。
- `consult_forest`、`consult_tree` 和旧 `consult_runs` 数据没有删除；逐句模式接口保留兼容，但后台不再提供入口。

### 模块化咨询稿与节拍编辑（2026-11-05）

- 目的模式不再由 AI 规划 6—12 个章节，也不再逐章生成 2500—4500 字文章。后端 `server/src/consult-modules.ts` 把目的路径按对话动作切成 10—20 个模块，模块顺序跟随目的路径。
- 每个模块由 `server/src/ai/purpose-module.ts` 生成三种真正不同的推进打法，默认推荐最有学生依据的一种，并写成陈述、提问、学生回应、动作、分支五类节拍。正文由节拍按顺序拼出，篇幅由信息量决定，不按字数硬凑。
- `consult_run_sections` 增量增加 `module_id`、`options_json`、`selected_option_id`、`beats_json`、`notes`、`edited`；旧的 `content` 和 `purpose_keys` 保留。迁移只加列，不删表、不改旧数据。
- `GET /runs/:id` 返回完整模块内容；`GET /runs` 仍只返回轻量列表。旧版没有 `module_id` 的目的模式记录继续走原章节重试逻辑。
- 工作台把生成结果改成模块卡片：可看三种打法的依据/代价/风险，换打法只重写当前模块，逐条增删改节拍，加模块、删模块、保存备注；保存后自动重新拼全文。
- 新增模块接口：`PATCH /runs/:id/sections/:seq`、`POST /runs/:id/sections/:seq/beats`、`POST /runs/:id/sections/:seq/regenerate`、`POST /runs/:id/sections`、`DELETE /runs/:id/sections/:seq`。
- 新增 `scripts/preview-consult-modules.ts`，不调用 AI 即可预览不同学生情况下会切出哪些模块。
- 这一步没有改 SKILL，也没有把收藏栏逐字稿接入生成检索；后面再做案例档案、全文检索和反馈排序。

### 收藏栏（2026-11-05）

- 咨询栏目新增“收藏栏”（`/admin/consult/collections`），用来收金句、完整优秀咨询稿、公众号链接和其他参考资料。
- 数据保存在 SQLite `consult_collections` 表；迁移是 `CREATE TABLE IF NOT EXISTS`，不影响现有表和数据。
- 每条收藏包含类型、标题、正文、链接、出处、备注、标签和置顶；支持搜索、按类型筛选、编辑、删除、复制。
- 公众号链接只接受 http/https；非链接类型必须有正文，避免空收藏。
- 新增只读接口 `GET /api/admin/consult/collections/bundle`，输出按类型整理的纯文本合集，供之后的咨询稿生成器读取，也方便人工导出。
- 新增 `server/src/docx.ts`，只抽取 Word 正文段落；收藏栏右上角“导入 Word”支持一次上传多个 `.docx`，带咨询稿/发言人标记的默认归到“优秀咨询稿”。
- 新增 `scripts/import-collections-docx.ts`，用同一套解析逻辑批量导入；按标题判重，同名只更新正文，写入前 `VACUUM INTO` 备份。`zxg/` 下 5 份咨询稿已导入本地收藏栏，原始文件含学员个人信息，未提交到 Git。
- 这一步没有改 SKILL，也没有把收藏内容接进现有咨询稿生成流程；等生成器需要参考时再接。

### 本地免密登录

- 本地 `npm run dev` 默认免密、免账号进入后台。
- 实现方式：development 环境提供 `/api/admin/dev-login`，仍然生成正常数据库会话。
- 生产环境该接口固定 404；`npm start` 不带 `NODE_ENV=development` 时也不会启用。
- 可用 `DEV_GUEST_LOGIN=false` 关闭。

### 其他界面要求

- 后台栏目分为“问卷”和“咨询”。
- 删除各页面冗余标题、小标题和说明文案。
- 设置简约网站图标。
- 模板保存前必须询问“保存为新副本 / 覆盖当前 / 取消”。
- 默认模板和默认设置只读，自定义模板从默认模板复制后修改。

## 已知后续事项

- 公开报告 AI 失败时的“基础内容”兜底路径仍存在，需要后续按用户偏好进一步改造。
- 旺季 / 淡季的完整话术框架没有再恢复；如需恢复，应作为“导入路线”或独立自定义模板，不得覆盖默认设置。
- 导入更多成交咨询稿后，应继续观察目的树示例覆盖、可选支线选择和目的反馈的样本量。
