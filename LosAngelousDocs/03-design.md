# 03 — 设计

> 维护者：Doc Agent；实现期变更由 Dev 提议 ｜ 状态：L2（2026-11-26 初始化，稳定契约） ｜ 最近更新：2026-11-28
> 需求级设计（新接口 / 新表 / 新流程）在对应 CR 的 G1 后追加到本文件；本文件只放当前稳定契约。

## 接口契约

| 路径 | 方法 | 入参 | 出参 | 错误码 | 幂等性 |
|---|---|---|---|---|---|
| `/api/health` | GET | — | `{ ok, time, db, uptimeSec, commit, appVersion }` | 200 / 503 | 只读 |
| `/api/invite/:token` | GET | path token | 姓名、备注、问卷、是否已提交 | 404 | 只读 |
| `/api/invite/:token/submit` | POST | 答卷 JSON | 提交结果 / 报告 slug | 400 / 404 / 409 | 提交幂等由 token 状态约束 |
| `/api/report/:slug` | GET | `?poll=1` | 报告或状态 | 404 | 只读 |
| `/api/report/:slug/retry` | POST | — | 重试结果 | 409 / 503 | 受尝试次数约束 |
| `/api/report/:slug/claim` | POST | 微信号 / 时间 | 领取结果 | 400 | 联系方式加密存储 |
| `/api/events` | POST | 埋点 | — | 400 | 追加写 |
| `/api/admin/login` | POST | 账号密码 | 会话令牌 | 401 | 每次登录新会话 |
| `/api/admin/*` | GET/POST/PATCH/DELETE | 各子域 | JSON | 401 / 403 / 400 / 409 | 由具体路由决定 |

管理路由统一在 `adminRouter.use(requireAdmin())` 之后挂载；新增管理接口只要挂在其后即自动鉴权。完整清单以本文件与 `server/src/routes/` 为准（原 `docs/reference/05-对外契约.md` 已移出，备份可查）。

## 数据模型

| 字段 / 表 | 类型 | 可空 | 约束 | 索引 |
|---|---|---|---|---|
| `submissions.report_mode` | TEXT | 否 | `score` / `doc`，提交时固化 | 有 |
| `submissions.ai_status` | TEXT | 否 | `pending` / `running` / `ready` / `failed` | 有 |
| `invites` | 表 | — | 一次性 token；`consulted` / `consult_result` / `priority` | token 唯一 |
| `settings.consult_forest` | JSON | 是 | 咨询森林唯一落点；旧 `consult_tree` 仅兼容 | — |
| `consult_quotes` / `consult_stories` / `consult_questions` / `consult_topics` | 表 | — | 各自分类 + 内容 + 置顶/排序 | 按分类、置顶 |
| `scoreline_*` / `schools` / `crawl_*` | 表 | — | 批次 / 指标 / 来源 / 覆盖；启动自动建表 | 见 schema |
| `search_cache` | 表 | — | 检索词 → 结果 JSON，7 天有效 | 规范化 key |

完整表结构以 `server/src/db/schema.ts` 为准；本文件为稳定契约摘要（原 `docs/reference/06-数据模型.md` 已移出，备份可查）。迁移必须兼容存量库、可重复执行。

## 关键流程

- **提交事务**：校验答案 → 计分 → 事务写 `submissions` + 邀请置 `submitted` → 出队。失败回滚，不留下半份答卷。
- **AI 队列**：FIFO、并发 2、最多 4 次；启动扫描 `pending/running` 续跑；失败页只给学生可操作提示，内部 key 只进 `ai_error` 与日志。
- **AI 审计**：数字 / 重复 / 跨模块矛盾 → 先反馈重写一次 → 仍不通过则清洗 + 放行并记 `ai_meta.audit.issues`；不阻断落库，不伪装模板。
- **分数线自动收录**：抓取结果按 `confidence` 自动写入，`>= 0.70 → approved`、`< 0.70 → rejected`；同一内容重抓保留原状态，低置信度不覆盖旧 `approved`；不再人工复核 / 人工导入。v2.07 校级录取表（`school-admit@1`）先把专业 upsert 进 `school_programs`，再写 `scope='program'` 批次（最低分 `minimum_type='admit'`）。失败记 `failed` + 失败码。
- **前端发布**：CI 构建 → Release 资产 → `update.sh` 校验 SHA256 与 `dist-info.commit` → 临时目录解压 → 原子替换 `web/dist` → 重启 → L4/L5 验证。

## 配置项

| 名称 | 默认值 | 影响 | 必填 |
|---|---|---|---|
| `PORT` | `8787` | 服务端口 | 否 |
| `DATA_DIR` | `./data` | SQLite 与备份位置 | 否 |
| `ADMIN_USER` / `ADMIN_PASSWORD` | — | 管理员账号 | 生产必填 |
| `AUTH_SECRET` | — | 登录令牌签名 | 生产必填 |
| `CONTACT_KEY` | — | 联系方式加密（更换后旧数据不可解） | 生产必填 |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | — | AI 报告与咨询稿 | AI 功能必填 |
| `BOCHA_API_KEY` / `BOCHA_BASE_URL` | — | 联网检索 | 检索功能必填 |
| `AI_TIMEOUT_MS` | `240000` | 单次 AI 请求超时 | 否 |
| `EVENT_RETENTION_DAYS` | `180` | 业务埋点保留 | 否 |
| `EVENT_OPERATIONAL_RETENTION_DAYS` | `365` | 运维事件保留 | 否 |
| `SCORELINE_CRAWL` | 开启 | 分数线定时抓取开关 | 否 |
| `COMPRESS` | 开启 | Node 层 gzip | 否 |
| `DEV_GUEST_LOGIN` | 开发开启 | 本地免密登录，生产无效 | 否 |

## 全局约定

- **命名**：产品版本 `v<major>.<minor>` ↔ `package.json` `<major>.<minor>.0`；CR / R / AC / T / D 编号在工作流文档中连续。
- **错误处理**：`asyncRoute` 包装异步处理器；统一错误中间件；管理接口 `noStore(res)`。
- **日志**：`server/src/log.ts` 单行结构化；带 `reqId` / `submissionId` / `runId`；不记录密码、密钥、联系方式、完整答卷、完整 AI 正文。
- **时间**：所有时间距离走 `shared/src/date.ts`，按日历差输出粗粒度中文；期次按周三起算。
- **金额 / 精度**：当前无金额计算；分数与比例由 shared 纯函数计算。

## 抓取调度可靠性（CR-006，v2.10）

- **启动自愈**：服务启动后、调度器开始前，`recoverCrawlRuns()` 把所有遗留 `running` 标 `failed`，message 以 `stale:` 开头并写 `finished_at`；若存在 `queued` 且 `SCORELINE_CRAWL` 开启，立即 `runNext()` 续跑。单实例假设，不处理多实例租约；恢复后调度器不会被残留状态永久阻塞。数据库异常只记 `scoreline.crawl_recover_failed`，不阻断服务启动；`SCORELINE_CRAWL=off` 时只清理残留、不续跑。
- **预算**：整轮 `MAX_PAGES_PER_RUN=30` 不变；新增单源 `MAX_PAGES_PER_SOURCE=10`；`SCORELINE_CRAWL_PROVINCE_MINUTES` 为整轮 deadline，逐页检查，超时只停当前源并记以 `budget:` 开头的 detail，其他源按剩余时间继续尝试。整轮预算用尽后，未开始的来源不写 `last_status` / 不刷新 `last_run_at`（避免被误标 failed 并饿死）。
- **重试**：`fetchResource` 对网络错误 / 429 / 5xx 退避重试 2 次（1s / 3s，最多 3 次尝试）；429 尊重 `Retry-After`（秒或 HTTP 日期，上限 60s）；403/404 与其他确定性 4xx 不重试；每次尝试独立超时，且单次尝试与退避都不越过整轮 deadline（页内也检查）；重试写 `scoreline.fetch_retry` 日志（只记站点路径与状态，不记 query / 密钥）。
- **快照清理**：启动执行一次 + 每 24h 执行 `pruneCrawlDocuments(90)`；按批「取行 → 删文件 → 删对应行」，行与文件一一对应；只删 `data/crawl` 与 `crawl_documents` 行，不删结构化分数线。
- **状态 CLI**：`scripts/scoreline-crawl-status.ts` 只读打开 `DATA_DIR/vesta.db`，输出 running/queued/疑似卡住（running 超过整轮时限，默认 30 分钟）、各源 last_status/last_error/last_run_at/interval/下次到期、最近 10 条 run；消息中的 URL 去掉 query/hash；不迁移、不写库、不打印正文/密钥；数据库不存在时非 0 退出并提示。
- **测试入口**：`npm run check:crawl`（`server/src/score-lines/crawl-reliability.cases.ts`，本地 HTTP 夹具 + 隔离 `DATA_DIR`），已纳入 `npm run verify`。

## 抓取安全与解析去重（CR-007，v2.11）

- **重定向**：`fetchResource` 改手动逐跳（≤5），每一跳先 `assertSafeUrl`；处理相对 `Location`、循环、超跳；HTTPS→HTTP 仅测试环境允许；`SCORELINE_CRAWL_ALLOW_PRIVATE=1` 只用于本地 fixture。内网判定统一走 `isPrivateHostname()`：IPv4 回环 / RFC1918 / 链路本地 / CGNAT / `0.0.0.0` / 组播，IPv6 `::` / `::1` / `fc00::/7` / `fe80::/10` / `ff00::/8`、IPv4-mapped（`::ffff:0:0/96`）、IPv4-compatible（`::/96`）与 NAT64（`64:ff9b::/96`、`64:ff9b:1::/48`）均按内网处理。
- **大小**：先看 `Content-Length`，>10MB 直接拒绝；无长度时流式读取，累计 >10MB 中止；不把整包读进内存。
- **403**：HTTP 401/403 映射 `blocked` 失败码，不重试；`CRAWL_FAILURE_HINTS` 提示换官方 JSON / 本地 HTML / 人工核验入口；`crawl_documents.http_status` 记真实 401/403（含引导页第二跳）。
- **多表去重**：`html-table@1` 跨表按 `subjectCode|isMinimum|minimumType` 去重；重复保留第一条并记 `duplicate_table_metric`，避免指标唯一键异常；不同值不静默覆盖。成功抓取时 issues 合并进 `crawl_documents.note`（截断 500 字符）并写 `scoreline.parse_issue` 结构化日志（runId / sourceId / url / issue），不改变 run 成功 / 失败判定。
- **返回字段**：`fetchResource` 在 `content` / `contentType` / `httpStatus` 之外新增 `finalUrl`（最后一跳实际地址）；`crawl_documents.url` 记实际拿到正文的最终地址，失败路径仍记入口 URL。
- **残留（本轮不做）**：DNS rebinding（域名首次解析后才指向内网）未处理；测试放行模式下仍允许 HTTPS→HTTP。压缩响应的 `Content-Length` 语义依服务端而定，流式上限以实际收到字节为准。
