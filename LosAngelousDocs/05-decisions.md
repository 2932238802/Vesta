# 05 — 决策记录

> 维护者：Doc / Dev ｜ 只追加，不覆盖旧决策 ｜ 状态：L2（2026-11-26 初始化） ｜ 最近更新：2026-11-26

### D-001 工作流文档根独立为 `LosAngelousDocs/`

- 日期：2026-11-26
- 背景：Vesta 已有成熟的 `docs/`（`reference/` + `archive/` + `reports/`），而 LosSKILL 工作流要求标准化文档树与门禁脚本；两者混用会污染既有产品口径索引。
- 选项：
  - A. 新建 `LosAngelousDocs/`：工作流记录独立，`docs/` 继续作为产品唯一口径；代价是需求收尾需双写（`05-decisions.md` + `docs/reference/development-history.md`）。
  - B. 沿用 `docs/`：单一文档树；代价是要在 `docs/` 根目录叠加 00–05 模板并与现有索引并存。
  - C. 只建最小集：不铺文档树；代价是 `check-docs --gate g1` 无法通过。
- 结论：选 A（用户 2026-11-26 确认）。理由：工作流门禁与产品文档职责不同，分开后互不干扰，脚本可按标准模板运行。
- 影响：所有 CR / R / AC / T / STATUS / 评审报告 / 决策落 `LosAngelousDocs/`；产品规则、问卷口径、架构细节仍以 `docs/` 为唯一事实来源。
- 可逆性：容易回滚（删除新目录、恢复工作流配置即可），但已产生的报告需迁移。

### D-002 v2.03 问卷分支题：通用兜底 + 来源题回跳补答

- 日期：2026-11-20（产品版本 v2.03）
- 背景：线上 Q19「信息差」选项完全依赖 Q6 分支，来源答案缺失 / 失效 / 非单选时出现 0 选项死路。
- 选项：修数据 / 前端硬回退 / 共享层单点兜底 + 后台发布保护。
- 结论：`resolveQuestion()` 单点兜底为通用四档题面；来源题可见、必答、单选且答案失效时前端回跳补答一次；后台拒绝发布会断分支的问卷。
- 影响：`shared/src/question.ts`、`web/src/views/Quiz.vue`、`server` 校验与日志；报告 `q16_info` 取实际渲染标签。
- 可逆性：中等（涉及问卷与报告口径，回滚需同步文档与用例）。

### D-003 v2.04 前端改 GitHub Actions 构建

- 日期：2026-11-20（产品版本 v2.04）
- 背景：服务器本地 `vite build` 被中断时清空 `web/dist`，导致全站 500/503。
- 选项：继续服务器构建 + 改到临时目录 / 完全交给 CI + 服务器只下载。
- 结论：push main 由 Actions 构建并上传 Release `dist`；`update.sh` 下载、校验 SHA256 与 `dist-info.commit` 后原子替换；保留 `--dist=local` 应急。
- 影响：`.github/workflows/build.yml`、`update.sh`、部署文档；业务流程无变化。
- 可逆性：容易回滚（`git revert` 后 `update.sh`）。

### D-004 `zxg/` 真实咨询稿取消 Git 追踪

- 日期：2026-11-26
- 背景：`zxg/` 下 126 份真实学员咨询稿（约 6.7 MB）被 Git 跟踪，违反 `AGENTS.md`「不提交 `zxg/`」的隐私约定。
- 选项：
  - A. 备份到仓库外后删除工作区文件并取消追踪，`.gitignore` 拦截（用户选择）。
  - B. 仅 `git rm --cached` 保留工作区文件：仓库干净但本地仍留全量资料，用户明确要求删除。
  - C. 重写 Git 历史彻底清除：需要 force push，属 A3，未在本次执行。
- 结论：选 A。备份 126 文件 + SHA256 后执行 `git rm -r zxg`，`.gitignore` 增加 `/zxg/`。
- 影响：仓库不再携带学员资料；导入脚本仍可用（源文件由用户放回本地 `zxg/`）；数据库中的咨询树 / 运行记录不受影响。
- 可逆性：容易恢复文件（备份目录），但 Git 历史仍含旧副本；彻底清除需单独授权。

### D-005 分数线按置信度自动收录，移除人工复核与人工导入

- 日期：2026-11-26
- 背景：抓取默认 `pending` + 人工复核是主要瓶颈；且每次抓取都以 `pending` 覆盖写，会把已 `approved` 数据打回待复核。用户要求高置信度直接入库、不再人工。
- 选项：
  - A. `confidence >= 0.70` 自动 approved、`<0.70` 自动 rejected；移除复核与人工导入；存量 pending 一次性迁移（用户选择）。
  - B. 仅高置信度自动通过，低置信度保留人工复核（与「不人工」冲突）。
  - C. 保留人工导入兜底（与「去掉所有人工」冲突）。
- 结论：选 A。同一 checksum 重抓保留既有状态；低置信度新内容不覆盖已有 approved；存量 pending 批次按阈值迁移，pending 招生计划按 trusted 转 approved。
- 影响：`scoreline_batches.review_status` 由人工驱动改为自动驱动；复核 / 导入 UI 与 HTTP 接口下线；招生计划唯一键补 `major_name`；考研国家线要求 A/B 区。
- 可逆性：代码可回滚，但已自动 approved / rejected 的数据不会随回滚恢复；需重新抓取或改库。

### D-006 工作流文档不按日建 archive，保持 LosSKILL 现行规范

- 日期：2026-11-26
- 背景：用户询问开发文档是否应放在 `LosAngelousDocs/archive/261126/`。核对已安装技能与 LosSKILL 仓库版本（两者 diff 为空）后确认：现行规范是根目录 `00`–`05` + `reports/`，只有 `reports/archive/` 用于归档已完结报告；没有按日 `archive/` 约定。
- 选项：
  - A. 保持现行规范（用户选择）。
  - B. 改为 `LosAngelousDocs/archive/YYYYMMDD/` 按日归档，需要同步改 `DOCS_CONTRACT` / `check-docs` / `init-docs` 并迁移文档。
  - C. 额外在 `docs/archive/20261126/` 生成 Vesta 旧式副本（双源风险）。
- 结论：选 A。Vesta 旧 `docs/archive/YYYYMMDD/` 仍只承载产品历史文档，不属于工作流文档树；同时确认 `docs/` 整体保持不动（2026-11-26 用户确认），`reports/archive/` 只归档已完结 CR 的角色报告。
- 影响：后续 CR 继续写 `LosAngelousDocs/00`–`05`；报告写 `reports/`；已完结报告归档 `reports/archive/`。若要把 `docs/` 迁入单文档根，需单独立 CR 并改 `check-docs` / `AGENTS` / `CLAUDE` / 所有引用，不能直接删除。
- 可逆性：若以后要改按日归档，需先改文档契约与 `check-docs` 判定，再迁移。

### D-007 校级录取表用「学制」作为 category，专业线最低分同时进入 programLine 与 minimums

- 日期：2026-11-26（产品版本 v2.07）
- 背景：CR-004 首批吉林两所本科院校的录取表按专业拆行，最低投档分是专业线；表内还带学制（两年 / 三年）。现有数据模型用 `scoreline_batches.category` 承载批次 / 学位类型，`minimums` 承载最低分。
- 选项：
  - A. `category=学制`（两年制 / 三年制），最低分指标照旧放 `minimums`，并让 program 线把最低分纳入 `programLine` 供卡片展示（用户 G1 口径，本次选择）。
  - B. 学制写 note、category 留空；会丢失按学制区分同专业多行的能力。
  - C. 新增学制维度字段；需要改表与查询契约，超出首批试点范围。
- 结论：选 A。把「两年制 / 三年制」登记为 `UPGRADE_CATEGORIES` 的已知值，避免维度归一化把学制当「认不出」而降置信度到 0.70 以下；`buildLine('program')` 纳入最低分指标，`buildSeries` 仍跳过最低分，趋势图按空心标记渲染，不画重复折线。学制优先取表头「学制」列，否则从专业名末尾「（二年制）/（三年制）」提取并去掉后缀；「总计 / 合计 / 共 N 个专业」汇总行跳过。
- 影响：`shared/src/score-line-dimension.ts`、`server/src/score-lines/query.ts`、`web/src/views/admin/ScoreLines.vue`；表结构不变。
- 可逆性：容易回滚（恢复字典与 buildLine 过滤），已写入的 `category='两年制/三年制'` 数据保留。

### D-008 删除 docs/，文档入口收敛到 PROJECT_BRAIN + LosAngelousDocs，版本源改为 STATUS

- 日期：2026-11-27（产品版本 v2.08）
- 背景：用户明确要求删除仓库原有 `docs/`（158 个跟踪文件），把文档入口收敛到 `PROJECT_BRAIN.md` + `LosAngelousDocs/`。`check-docs` / `check-version` 与 AGENTS / CLAUDE 原先硬依赖 `docs/reference`。
- 选项：
  - A. 直接删除并改引用（用户选择）：备份后 `git rm -r docs`，重写守卫与入口文档；不在工作区保留产品文档。
  - B. 先把 docs/reference 迁入 LosAngelousDocs 再删除（未选）：内容保留但文档树职责混杂，迁移量大。
  - C. 保留 docs/ 不动（未选）：与用户「单一文档根」目标冲突。
- 结论：选 A。`docs/` 与其 158 个文件已移出工作区，仓库外备份 `D:/PROJECT/_vesta-backups/docs-20261126-2010`（SHA256 清单 158 条全部校验通过），历史仍可从 Git 查看。`check-docs` 只校验工作流文档入口与关键指针；`check-version` 以 `LosAngelousDocs/STATUS.md`「当前产品版本」为唯一版本源，要求与根 `package.json` 的 `<major>.<minor>.0` 完全相等。原「问卷设计文档覆盖」守卫随 docs 删除而移除（用户已知并接受）。
- 影响：所有 Agent 开工入口改为 `PROJECT_BRAIN.md`；产品问卷 / 咨询 / 部署说明只能查备份或 Git 历史；历史 `LosAngelousDocs/reports/` 中指向 docs 的链接按历史保留，不改写。后续若需要恢复产品文档，应新建 CR，而不是直接重建未登记目录。
- 可逆性：可从备份拷回 `docs/` 并恢复旧脚本，但需同时改回 AGENTS / CLAUDE / PROJECT_BRAIN 与 `check-docs` / `check-version`。

### D-009 抓取可靠性：单实例启动自愈 + 单源页数上限 + 有限退避重试

- 日期：2026-11-27（产品版本 v2.10）
- 背景：前端手动抓取下线后自动调度成为唯一入口。崩溃 / 重启后数据库残留 `running` 会让 scheduler 的「有在途任务就不排队」判断永久成立；单源可吃满整轮 30 页 / 30 分钟；瞬时网络失败直接判失败。
- 选项：
  - A. 自愈 + 单源 10 页 + deadline 每页检查 + 网络/429/5xx 退避重试 2 次 + 每日快照清理 + 只读状态 CLI（用户 G1 选择）。
  - B. 只做启动自愈：其余停抓诱因仍在。
  - C. 只做重试 / 超时：无法解决残留阻塞与单源吃满预算。
  - D. 改成按源独立调度队列：架构改动大，本轮不做。
- 结论：选 A。启动时把所有 `running` 标 `failed`（message 以 `stale:` 开头）并续跑 `queued`；单源最多 10 页（整轮仍 30）；deadline 每页检查，超时只停当前源；网络错误 / 429 / 5xx 重试 2 次（1s/3s），429 尊重 `Retry-After` ≤60s，403/404 不重试；快照启动 + 每 24h 清理；新增只读 `scripts/scoreline-crawl-status.ts`。
- 影响：`server/src/score-lines/{crawl,crawl-fetch,crawl-recovery,crawl-scheduler}.ts`、`server/src/index.ts`、`scripts/scoreline-crawl-status.ts`、`package.json`（`check:crawl`）；解析、自动收录、查询口径不变。
- 可逆性：全部为代码与常量级改动，可整体回滚；回滚后残留 `running` 会重新变成永久阻塞（需人工清库），已写入的抓取结果不受影响。单实例假设不变，多实例部署下自愈会误判其他实例的运行中任务。

### D-010 抓取安全：逐跳重定向校验 + 流式限长 + `blocked` 失败码 + 多表去重

- 日期：2026-11-28（产品版本 v2.11）
- 背景：`fetchResource` 使用 `redirect:'follow'` 只校验初始 URL，公开站点可 302 到内网（SSRF）；10MB 限制在整包下载后才检查；多表页面跨表重复科目会撞 `scoreline_metrics` 唯一键并被误报成 `network`；403/WAF 只有通用 HTTP 错误，缺可操作结论。
- 选项：
  - A. 逐跳重定向 + 每跳校验 + 流式限长 + `blocked` 失败码 + 跨表去重（用户 G1 选择）。
  - B. 只做 SSRF / 限流：多表与 403 问题仍在。
  - C. 先做多表 / docx：安全风险继续暴露。
  - D. 引入代理 / 每源 UA / 绕 WAF：范围过大，本轮不做。
- 结论：选 A。`fetchResource` 改 `redirect:'manual'`，最多 5 跳，每跳先 `assertSafeUrl`；相对 `Location` 按当前 URL 解析；循环 / 超跳 / 非法 `Location` 明确失败；生产拒绝 HTTPS→HTTP（`SCORELINE_CRAWL_ALLOW_PRIVATE=1` 仅测试放行）。先看 `Content-Length`，>10MB 直接拒绝；否则流式读取，累计 >10MB 中止。HTTP 401/403 映射 `blocked`、不重试，`CRAWL_FAILURE_HINTS` 提示换官方 JSON / 本地 HTML / 人工核验入口。`html-table@1` 跨表按 `subjectCode|isMinimum|minimumType` 保留第一条并记 `duplicate_table_metric`。
- 影响：`server/src/score-lines/crawl-fetch.ts`、`crawl.ts`、`parsers/{html,table,types}.ts`、`shared/src/score-line.ts`；新增 `check:crawl` 4 节与 `check:score` 1 节用例；解析规则、自动收录、查询、前端、调度预算不变。
- 可逆性：代码与常量级改动，可整体回滚。已知残留：DNS rebinding（域名解析后才指向内网）本轮未处理；HTTPS→HTTP 降级在测试放行模式下仍允许。
- 复核补强（2026-11-28 G3 返工）：`isPrivateHostname` 改用 `node:net.isIP` + 规范化解码，补齐 IPv4-mapped IPv6（`::ffff:0:0/96`）、IPv4-compatible（`::/96`）、`0.0.0.0` / `::` / `fc00::/7` / `fe80::/10` / 组播与 NAT64（`64:ff9b::/96`、`64:ff9b:1::/48`）；多表重复 issue 写入 `crawl_documents.note` 与 `scoreline.parse_issue` 日志；`crawl_documents.http_status` 记真实 401/403，`url` 记最终跳转地址。
- 已知限制：压缩响应下 `Content-Length` 是压缩前 / 后大小依服务端而定，流式上限以实际收到的字节为准。
