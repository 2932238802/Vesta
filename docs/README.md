# Vesta 项目说明

Vesta 是一套面向大学在读学生的问卷、报告与咨询辅助系统。使用者主要是非技术工作人员，因此界面应当简单、直接、可恢复，失败状态必须说清楚。

## 版本约定

- 产品版本基线 **v1.60**（2026-11-12 起算）。
- 每完成一轮需求递增一个小版本：**v1.61、v1.62……**（两位数小版本，不进位到 v2）。
- 已完成：v1.61 管理员界面交互优化、v1.62 前端拆包与巨型文件拆分、v1.63 检索届别改用当前年份、v1.64 仪表盘「每组完成」修复、v1.65 后台 doc 模式不再展示映射分数、v1.66 问卷题号重排、v1.67 英语块表述约束与生成校验、v1.68 英语块校验误伤与漏拦订正、v1.69 日志系统完善、v1.70 版本号同步与工程元数据规范、v1.71 文件规模约束与首批拆分、v1.72 文本响应 gzip 压缩、v1.73 events 保留与漏斗事实汇总、v1.74 学员名单按期次自动分组、v1.75 管理端查询效率与死接口、限长清理、v1.76 后台栏目调整（新增分数线、设置下移、删除简历收集）、v1.77 分数线 v3 Phase 1（主线/院校线/专业线查询、折线图、全国院校主表、抓取与复核）、v1.78 AI 报告启动恢复与并发上限（启动扫描续跑 + 并发队列）、v1.79 招聘检索重构（12 个月时效、岗位词清洗、查询计划与证据判定、报告去内部信息）、v1.80 分数线抓取修复（引导页跟随、发现队列、类别表解析、失败码）；后续从 **v1.81** 继续递增。
- 根 `package.json` 的 `version` 是版本号的唯一事实源：产品 `v1.<n>` ↔ `1.<n>.0`（`major` 恒为 `1`、`patch` 恒为 `0`，当前为 `1.80.0`）。「已完成」这行写入当前最高版本后，`package.json` 必须与之相等；本轮已升版本、文档还没写完时最多领先 1 个版本。不一致时 `npm run check:version` 会让 `npm run verify` 失败。
- `server/package.json`、`web/package.json` 是 workspace 成员，保持 `private` 且不带 `version`，避免三处版本号打架。
- `docs/archive/` 里单个方案的「v1.0 / v1.1」是方案文档自身版本，与产品版本分开编号；每轮改动对应的产品版本号要写进 `development-history.md`。

## 版本记录

| 产品版本 | 日期 | commit | 内容摘要 |
| --- | --- | --- | --- |
| v1.60 | 2026-11-12 | — | 版本基线（此前需求未按产品小版本编号） |
| v1.61 | 2026-11-12 | — | 管理员界面交互优化（实现散落在当日多个 UI 提交，未单独确认 commit） |
| v1.62 | 2026-11-12 | `71bd1e7` | 前端拆包与巨型文件拆分 |
| v1.63 | 2026-11-13 | `8207668` | 检索届别改用当前年份 |
| v1.64 | 2026-11-13 | `8207668` | 仪表盘「每组完成」修复 |
| v1.65 | 2026-11-13 | `dfd14a8` | 后台 doc 模式不再展示映射分数 |
| v1.66 | 2026-11-13 | `dfd14a8` | 问卷题目独立与题号重排（Q1–Q28） |
| v1.67 | 2026-11-13 | `d8fa36c` | 英语块表述约束与生成校验 |
| v1.68 | 2026-11-13 | `d8fa36c` | 英语块校验误伤与漏拦订正（新增 `check:audit`） |
| v1.69 | 2026-11-13 | `a8d7b84` | 日志系统完善（`reqId`、结构化日志、health 增强） |
| v1.70 | 2026-11-13 | `cd09143` | 版本号同步与工程元数据规范（`check:version`、`engines`、`.node-version`、部署元数据写入） |
| v1.71 | 2026-11-13 | `cd09143` | 文件规模约束与首批拆分（`check:size`、`web/src/api/`、`Submissions.vue`） |
| v1.72 | 2026-11-13 | `cd09143` | 文本响应 gzip 压缩（Node `compression` + Nginx 模板）；`client_max_body_size` 调到 25m |
| v1.73 | 2026-11-13 | `cd09143` | `events` 保留与清理：`event_facts` 漏斗汇总、180/365 天保留期、`check-events` |
| v1.74 | 2026-11-13 | `cd09143` | 学员名单按咨询期次自动分组（周三起算），移除自定义分组与日期筛选 |
| v1.75 | 2026-11-13 | `096b79d` | 管理端查询效率、死接口与限长清理（概览 / CSV / 咨询树与模板写接口） |
| v1.76 | 2026-11-14 | `ba57bb6` | 后台栏目调整：新增分数线、设置下移、删除简历收集 |
| v1.77 | 2026-11-14 | 待提交 | 分数线 v3 Phase 1：主线 / 院校线 / 专业线查询、折线图、全国院校主表、抓取与复核 |
| v1.78 | 2026-11-14 | 待提交 | AI 报告启动恢复与并发上限：启动扫描续跑 + 并发队列 |
| v1.79 | 2026-11-14 | `a7aa818` | 招聘检索重构：12 个月时效、岗位词清洗、查询计划与证据判定、报告去内部信息 |
| v1.80 | 2026-11-14 | `94f5ecf` | 分数线抓取修复：引导页跟随、有界发现队列、类别表解析、失败码与 needs_seed |

（只回填能确认 commit 的版本；`—` 表示基线之前没有单独提交，`待提交` 表示本地已实施、尚未入库。）

## 技术栈

- 运行时：Node.js 24+（`node:sqlite` 需要；仓库根 `.node-version` 与 `package.json` 的 `engines` 已声明）
- 后端：Express + SQLite（`node:sqlite`）+ TypeScript / tsx；分数线抓取在服务端使用 `cheerio` / `xlsx` / `pdfjs-dist`（不进前端 bundle）
- 前端：Vue 3 + Vue Router + Vite
- 数据：单文件 SQLite，默认 `data/vesta.db`
- AI：DeepSeek，可选博查联网检索

## 目录结构

```text
server/src/        Express 服务、数据库、鉴权、AI 生成
shared/src/        问卷、报告、咨询目的树等共享类型与算法
web/src/           Vue 管理后台、问卷、报告页面
deploy/            systemd、Nginx、安装与备份脚本
scripts/           一次性导入与维护脚本；check-size.mjs + file-size-baseline.json 负责文件规模约束，check-version.mjs 负责版本号一致性，check-events.mjs 核对 events 与 event_facts；import-schools.ts 导入院校名单，seed-sources.ts 写入分数线抓取源；shared/src/score-line.cases.ts 与 parser fixture 由 check:score 执行
docs/              架构、运行、历史、问卷口径与 Agent 交接文档
docs/archive/      已作废的历史方案（只存档，不要照着实现）
data/              本地数据库与备份（不提交 Git）
update.sh          服务器更新入口
```

文档分工（**改需求先改文档，再改代码**）：

- [../AGENTS.md](../AGENTS.md)：Agent 开工规则——必读顺序、文档优先流程、验证门槛、MCP 使用。
- [consult-system.md](./consult-system.md)：咨询目的树、目的路径、模块化长稿生成与反馈。
- [规划自测问卷-设计文档.md](./规划自测问卷-设计文档.md)：问卷与报告的唯一口径——题目、选项、跳题逻辑、报告规则都在这里。
- [development-history.md](./development-history.md)：历次需求与已做改动，记录「为什么这样做」。
- [agent-rules.md](./agent-rules.md)：后续 Agent 必须遵守的约束。
- [archive/](./archive/)：历史方案与任务设计稿存档。已作废的 28 题八维计分版《项目计划书》只用于追溯设计来路；[问卷页面 UI 优化设计稿](./archive/20261112/1-问卷页面UI优化-开发设计方案.md)（2026-11-12）已实施，保留为设计依据，不改变问卷口径；2026-11-12 当天的设计稿统一收在 [archive/20261112/](./archive/20261112/)，按 `1-`、`2-` 递增命名；2026-11-13 的方案收在 [archive/20261113/](./archive/20261113/)，目录内的 [README.md](./archive/20261113/README.md) 是问题与进度索引（问题、进度、是否已修复）。

## 本地开发

```bash
npm install
npm run dev
```

- Vite：`http://127.0.0.1:5173`
- 本地后端：`http://127.0.0.1:8788`
- 生产默认端口：`8787`（可用 `PORT` 覆盖）；本机线上实例是 `8082`（`.env` + `vesta.service.d/zz-port.conf`）

本地 `npm run dev` 会设置 `NODE_ENV=development`。默认启用后台免密登录：

1. 打开 `/admin` 时自动创建“本地测试”会话。
2. 也可以打开 `/admin/login`，页面会自动进入后台。
3. 主动退出后不会被立即弹回后台。

关闭方式：在 `.env` 增加 `DEV_GUEST_LOGIN=false`。免密登录只在显式 `NODE_ENV=development` 时生效；`npm start` 和生产服务不会开启。

### 本地环境变量（2026-11-12 定）

本地 dev 的变量分两层，按「是否跨项目复用」划分：

| 层 | 位置 | 放什么 | 影响范围 |
| --- | --- | --- | --- |
| 全局 | WSL `~/.profile` 的 `ai-gateway-dev` 块 | `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` | 所有本地项目 |
| 项目 | 仓库 `.env`（已被 `.gitignore` 忽略） | `ADMIN_USER/PASSWORD`、`AUTH_SECRET`、`CONTACT_KEY`、`DATA_DIR`、`BOCHA_*` | 只影响 Vesta |

- Windows 用户级环境变量**不会**自动传进 WSL，本地 dev 在 WSL 里跑就得在 WSL 侧配（`~/.profile` 或 `/etc/environment`）。
- 本地 AI 走 one-api 网关（`http://one-api.server22.jz/v1`）。**该网关没有 `deepseek-chat`**，用 `deepseek-v4-flash`；换模型前先看实际列表：

  ```bash
  curl -s -H "Authorization: Bearer $AI_API_KEY" "$AI_BASE_URL/models"
  ```

- 改完 `~/.profile` 后，已开的终端和已启动的 dev server 不会自动生效，要重开终端或重启 `npm run dev`。
- 变量清单以 `.env.example` 为准；`.env` 不入库、不写进文档、不进 memory。

## 生产部署

首次部署参考 `deploy/install.sh`。生产环境必须配置：

- `NODE_ENV=production`（systemd 模板已经设置）
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`（至少 32 位随机字符串）
- `CONTACT_KEY`（用于加密联系方式；更换后旧数据无法解密）

日常更新：

```bash
bash update.sh
```

`update.sh` 自己完成拉取、校验、备份、构建和重启，执行结束后会逐层证明“运行的代码 = `origin/main` 最新提交”：

- **L1 代码**：`git fetch` + `git pull --ff-only`，断言 HEAD 与 `origin/main` 完全一致、工作区干净；有未提交改动、detached HEAD 或无法快进时直接退出，不覆盖本地改动。
- **L2 依赖**：对比拉取前后的 `package-lock.json`/`package.json` 哈希；有变化时执行 `npm ci`，并用 `npm ls --depth=0` 检查 missing/invalid。
- **L3 构建**：构建前移走旧 `web/dist`，构建后断言所有产物晚于本次构建开始；构建失败会恢复上一版 `dist`，不会带着旧产物重启。
- **L4 进程**：重启后读取 systemd `ExecMainStartTimestampMonotonic` / PM2 `pm_uptime` / Docker `StartedAt`，断言进程启动时间晚于构建完成。
- **L5 对外**：`/api/health` 返回 200 且时间戳晚于本次重启；再校验首页引用了本次构建的 JS 指纹。重启前脚本会把本次 `HEAD` 写入 `data/deploy-info.json`（`commit` / `deployedAt` / `productVersion`），`/api/health` 的 `commit` 因此能返回真实短 SHA，L5 从「没有版本字段就降级」变成「版本与 HEAD 强一致」。

如果本次拉取更新了 `update.sh` 本身，脚本会用新脚本重新执行（`--resumed` 防止循环）。脚本也会用 `flock` 防止并发执行。

五层校验的动机、失败处理和兼容性说明见 [development-history.md](./development-history.md) 的「本轮（2026-11-12）」；改 `update.sh` 时，本文与那一节要一起同步。

常用选项：

```bash
bash update.sh --help          # 查看全部参数
bash update.sh --no-pull       # 跳过 pull，但仍 fetch 并校验 HEAD == origin/main
bash update.sh --skip-build    # 跳过构建；源码比 dist 新时会拒绝
bash update.sh --mode=systemd  # 覆盖 DEPLOY_MODE
```

说明：

- `DEPLOY_MODE=none` 只构建、不重启，无法完成 L4/L5 校验，因此脚本会在构建后明确失败退出；需要验证运行版本时请改用 `systemd` / `pm2` / `docker`。
- 当前 `/api/health` 返回 `{ ok, time, db, uptimeSec, commit, appVersion }`。`commit` / `appVersion` 从 `data/deploy-info.json` 读取（`update.sh` 重启前覆盖写入；文件不存在时两者为空串，L5 仍走“HTTP 200 + 重启后时间戳 + 前端构建指纹”的降级校验）。`appVersion` 故意不叫 `version`：L5 会把 `version` 当作 commit 比对，semver 会直接导致部署失败。
- 服务器上如果还是很久以前的 `update.sh`（不认识上述参数、也不会自动拉取），先手动执行一次 `git pull`；之后日常只需 `bash update.sh`。
- 文本响应（HTML / JS / CSS / JSON）默认由 Node 层 gzip（`compression`，阈值 1 KB，已压缩格式自动跳过）；`deploy/nginx.conf` 也同步开启了 gzip，两层同开是安全的。若前面已有网关负责压缩，可设 `COMPRESS=off` 省 Node CPU。
- `client_max_body_size 25m` 原为简历图片上传调大；简历收集已于 v1.76 下线，保留 25m 兼容存量部署，暂不回调（下调需单独验证生产网关）。
- 失败时脚本会打印失败阶段、日志命令、数据库备份路径和回滚命令；健康检查失败还会自动带出最近 60 行服务日志。

## 常用环境变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | 服务端口，默认 `8787` |
| `DATA_DIR` | 数据目录，默认 `./data` |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 管理员账号；生产必填 |
| `DEV_GUEST_LOGIN` | 本地开发免密登录开关，生产无效 |
| `AUTH_SECRET` | 登录令牌签名密钥；生产必填 |
| `CONTACT_KEY` | 联系方式加密密钥，必须长期保存 |
| `PUBLIC_BASE_URL` | 对外链接前缀，如 `https://example.com` |
| `TRUST_PROXY` | 位于反向代理后时设为 `true` |
| `COMPRESS` | 设为 `off` 关闭 Node 层 gzip；默认开启，只有前面已有网关压缩时才关 |
| `EVENT_RETENTION_DAYS` | 业务埋点（`quiz_*` / `group_complete` 等）保留天数，默认 `180` |
| `EVENT_OPERATIONAL_RETENTION_DAYS` | 运维事件（`ai_report_*` / `submission_deleted`）保留天数，默认 `365` |
| `SCORELINE_CRAWL` | 设为 `off` 关闭分数线定时抓取；默认开启 |
| `SCORELINE_CRAWL_PROVINCE_MINUTES` | 单个省一次抓取的最长运行时间，默认 `30` 分钟 |
| `SCORELINE_CRAWL_INTERVAL_MINUTES` | 调度器检查间隔，默认 `10` 分钟 |
| `SCORELINE_CRAWL_ALLOW_PRIVATE` | 仅本地 fixture 测试用；设为 `1` 才允许抓取内网地址，生产不要开 |
| `SESSION_TTL` | 登录有效期秒数，默认 30 天 |
| `AI_API_KEY` | AI 报告与咨询稿生成密钥；也兼容旧的 `DEEPSEEK_API_KEY` |
| `AI_BASE_URL` | OpenAI 兼容接口地址；也兼容 `DEEPSEEK_BASE_URL`。未配置时启动会明确 warning，AI 功能不可用 |
| `AI_MODEL` | 模型名；也兼容 `DEEPSEEK_MODEL` |
| `BOCHA_API_KEY` | 联网检索密钥；与 `BOCHA_BASE_URL` 同时配置才生效 |
| `BOCHA_BASE_URL` | 博查检索接口地址；缺它时启动会明确 warning，检索不可用 |
| `AI_TIMEOUT_MS` | AI 单次请求超时，默认 240 秒 |
| `LOG_LEVEL` | 日志级别 `debug` / `info` / `warn` / `error`；默认生产 `info`、开发 `debug` |
| `DEPLOY_MODE` | `systemd` / `pm2` / `docker` / `none` / 自动 |

## 报告生成

doc 模式报告（`survey.reportMode === 'doc'`）完全由 AI 生成正文，程序只负责计算与校验：

- **分析规则唯一来源**：后台 `/admin/skill` 当前启用的模板。默认设置内置在 `shared/src/doc-skill.ts`；自定义模板缺失或为空时直接报错，不会用模型常识或模板报告补位。后台删除当前启用的自定义模板时会显式改回默认设置；除此之外，activeId 指向不存在的模板时生成报告直接报错。
- **证据边界**：AI 只能使用后台规则、问卷回答、数据库里的岗位/报告数据和博查检索结果。没有依据的项不写。
- **数字由程序算**：分数、比例、天数、排序、阶段和岗位门槛都由 `shared/src/docScore.ts`、`shared/src/job-map.ts`、`shared/src/doc.ts` 计算；AI 只写标题、判断和正文。生成后会扫描 AI 文本里的数字，与允许的数据源比对，不一致就重写，最终报告以数据为准。审计按 item 建白名单：`scorecard` 每个 item 文本里的 `N 分` 必须等于该 item 的系统分数，写别的 item 的分数同样判失败。系统已经给出的阶段时间窗（如「第 10—28 个月」）按原样放行；「还有 28 个月」这类距离表达仍然必须换成粗粒度说法。
- **跨模块一致性**：生成后除模块完整性和数字审计外，还检查模块之间是否互相矛盾。`gap` 的「只有一项空着」类整体结论不能和评分卡里低于 3 分的技能/实习并存；方向卡内原文对专业写法不一致时要注明「以具体岗位为准」，方向外的相关岗位要标「另一类岗位」；有过期原文参与的方向 `entry` 必须带「仅看要求结构，不能当投递入口」前缀。不通过先把具体冲突反馈给 AI 重写一次，仍不通过则整份报告失败，不把互相矛盾的正文写进报告。结果侧不硬卡：方向卡的可选字段（`what` / `entry` / `salary` / `fit`）缺失不算冲突，报告照常生成；校验只在字段存在且与事实矛盾时触发。
- **全报告去重**：生成阶段还检查同一件事被反复说。时间距离只保留 `gap` 关键时间窗和 `roadmap` 副标题两处，结论/模块标题/正文再写「还有约…」「距离…」「X 年后」判重复；英语每周投入和总时长只在 roadmap 副标题出现一次，英语块复述问卷的「每周 X 小时」「总共 X 小时」判重复，「每周末做一套真题」这类练习节奏不算；目标城市统一写 `resolveTargetCity()` 落到的具体城市，不回抄 Q8 选项原文；「缺一段和目标方向对得上的经历」整句最多一次；过期原文只在岗位块副标题提示一次，卡片保留「信息较早」标签。重复问题先反馈 AI 重写一次，仍不通过整份报告失败（`AI 报告重复：…`），不在渲染层删文字。
- **时间统一函数**：所有时间距离走 `shared/src/date.ts`，按日历差计算，输出粗粒度中文（两年、一年半、X 个月、不到一个月、已过去 X）。月末按「从起点加完整月、日数截断」计算（如 2024-01-31 加 1 个月是 2024-02-29），剩余日数恒为非负。`shared/src/date.cases.ts` 覆盖跨年、闰日、月末、整年和已过期等情况，并通过 `npm run verify` 里的 `check:dates` 自动执行。`server/src/ai/doc-audit.cases.ts` 覆盖考研 × 听力、口语降目标和英语时长去重的正反样例，通过 `npm run verify` 里的 `check:audit` 执行。
- **检索口径（2026-11-14 起）**：需要外部信息时，服务端主动调用博查；时间门槛全链路只有一个数：**今天往前 12 个完整月**（`JOB_MAX_AGE_MONTHS = 12`，入选、补位、展示、统计和 AI 证据同源）。日期证据取三源中最早的一条：博查 `datePublished`、标题年份、摘要里的「发布 / 更新 / 发布时间」；任一证据早于门槛即淘汰，**完全没有日期证据的页面不进岗位卡片**。可用原文不足 3 条时不得用过期页凑数，宁可比 3 条少甚至 0 条。检索词先清洗岗位词（去掉「都可以 / 想当 / 随便 / 吧」这类口语和标点，再按岗位词典取岗位名），抽不出岗位才走专业方向；检索词**不再拼「届」**，改用「应届 / 实习」+ 12 个月窗控制时效。查询计划按「通用 → 应届生求职网 → 猎聘 → 专业方向 → 低年级实习」逐级换词，每份报告最多 4 次外呼，同一检索字符串只跑一次，可用原文 ≥3 条且方向覆盖完整即停。结果要同时满足「详情页 + 岗位证据 + 相关」才收；只拒绝标题去掉站点后缀后既没有公司名也没有岗位名的门户页，不按站点词整页砍。检索遇到 `fetch failed` 这类瞬时网络错误时自动退避重试一次；无权限、参数错误等确定性失败不重试。
- **内部规则不外露**：问卷（答题页）不出现任何检索参数。报告（`/r/:slug`）只展示岗位卡（岗位名 / 公司 / 城市 / 薪资 / 要求 / 发布日期 / 原文链接）、来源条数、核对时间和结果性说明（「近期没有可核对的招聘原文」），不展示原始检索词、时间窗数字、`freshness` / `site:` / 博查 / 缓存 / 正则、届别拼写或 `BOCHA_*` 配置错误。完整检索词、查询变体和每条丢弃原因只进后台日志与报告元数据；答卷人侧的检索失败统一显示「本次没能获取招聘原文，可稍后重试」。报告已经生成时不再显示必然 409 的「重新检索」按钮，改为提示需要新建报告；生成失败页仍保留重试。
- **检索缓存、预算与自检**：见 [`7-博查检索成本优化-设计方案.md`](./archive/20261112/7-博查检索成本优化-设计方案.md)。博查结果按规范化检索词（空白折叠 + 小写，`count` / `freshness` 进 key）缓存在 `search_cache` 表 7 天，同城同专业的学生、AI 自动重试都不会重复外呼；同一 key 的并发请求在进程内合并成一次外呼（single-flight，仅单实例有效）。一份 doc 报告按查询计划串行外呼，最多 4 次，可用原文 ≥3 条且方向覆盖完整即停；只记录本次实际执行的检索词，每条都真实外呼过，来源链接和结果数照常记录。错误结果不缓存。运营可用 `npm run check:search -- "<检索词>"` 打印原始返回、逐条判定和丢弃原因，不读代码也能判断是「词的问题」还是「过滤的问题」；`npm run check:search` 不带参数时跑固定回归样本。回滚方式是 `git revert` 后 `bash update.sh`。
- **失败不伪装**：AI 未配置、规则为空或生成失败时，报告页显示失败原因和重试入口，不展示规则版/模板版冒充 AI 结果。
- **启动恢复与并发上限**：AI 报告统一由 `server/src/ai/report-queue.ts` 调度，同一时间最多生成 **2** 份（常量 `REPORT_CONCURRENCY`），其余按提交先后排队并保持 `pending`，页面仍显示「正在生成」。服务启动、端口就绪后自动扫描 `submissions` 里所有 `pending / running` 且未用完 4 次机会的记录并续跑，不需要学生打开页面；重启时正在跑的那一份会整份重跑（博查检索结果有 7 天缓存）。AI 未配置时跳过续跑，不把记录批量标成失败。队列只存在单进程内存里，按单实例部署设计（见第 4 篇方案）。
- **保存方式**：报告页顶部只保留“保存图片”“保存为 PDF”“复制链接”，不再提供打印入口。PDF 由页面在浏览器内按 A4 分页生成并直接下载，不经过打印弹窗；正文按约 300dpi 输出，翻页会避开正文行。PDF 是渲染后的版式，链接请回到原报告点开。

## 登录与会话

- 每次登录创建独立数据库会话，多台设备可以同时登录。
- 退出只删除当前设备的会话，不影响其他设备。
- 管理接口仍统一经过 `requireAdmin()` 校验令牌与数据库会话。
- `/api/admin/dev-login` 只在本地 development 环境可用，生产固定返回 404，不能绕过真实令牌校验。

## 数据库与备份

数据库使用 SQLite WAL 模式。备份时不要只复制主文件而忽略 `-wal` / `-shm`，应使用：

```bash
node deploy/backup.mjs data/vesta.db data/backups/vesta-YYYYMMDD-HHMMSS.db
```

`update.sh` 会自动执行同样的备份，并只保留最近 14 份。恢复前先停止服务，再整体替换数据库文件。

`search_cache` 只存博查检索结果（检索词 → 结果 JSON，7 天有效，写入时顺手清理过期行）。它和其他表一样进备份；直接清空也不影响问卷、答卷和报告，只是下一次检索会重新付费。

`events` 是问卷漏斗的原始埋点，会按时间自动清理：业务埋点默认保留 **180 天**（`EVENT_RETENTION_DAYS`），`ai_report_*` / `submission_deleted` 等运维事件默认保留 **365 天**（`EVENT_OPERATIONAL_RETENTION_DAYS`）。后台概览的漏斗数字不读原始事件，而是读永久保留的汇总表 `event_facts`；清理前后数字不变。启动时清理一次，之后每 24 小时一次，每批 5000 行，不做 `VACUUM`。

分数线 v3 新增 `schools` / `school_aliases` / `school_programs` / `scoreline_batches` / `scoreline_metrics` / `school_coverage` / `scoreline_sources` / `crawl_runs` / `crawl_documents` 九张表，全部 `CREATE TABLE IF NOT EXISTS`，启动自动建表。v1 的 `score_line_sets` / `score_line_entries` 保留为 legacy；启动迁移 `migrateScoreLineV1()` 只迁 `postgrad` / `upgrade`，用 `settings.scoreline_v3_migrated` 标记、可重复执行。抓取原始快照在 `data/crawl/`，保留 90 天；`update.sh` 只备份数据库，`data/crawl/` 需要单独备份。

## 咨询稿导入

咨询树不再包含系统自拟的默认话术。当前本地数据来自 `zxg/` 下导入的成交咨询稿，每份稿子一棵树。

```bash
# 先预览识别结果，不写数据库
node scripts/import-consult-docx.mjs zxg/七月咨询稿.docx --list

# 写入数据库；会备份，并按同名树替换，其他树不变
node scripts/import-consult-docx.mjs zxg/七月咨询稿.docx --name=七月咨询稿 --write

# 带“发言人 00:01”时间戳的逐字稿；指定咨询师发言人
node scripts/import-consult-docx.mjs "zxg/9.18+吕新蕊+260301005+热合曼+一开始想用便宜资源学_原文.docx" --name="9.18 吕新蕊咨询稿" --consultant=2 --write
```

导入规则：

- docx 中加粗的阶段标题成为阶段节点。
- 阶段标题下面的实际话术成为该阶段的同级兄弟节点，不串成长链。
- 括号内的编导提示、条件说明、纯标题和“推荐老师”等流程提示会跳过。
- 逐字稿会识别“发言人”和咨询师角色，咨询师话术串成路径，学生回答挂到上一句咨询师节点。
- 一份文件里可能拼接多段录音；时间戳回退时按段重新识别咨询师，避免第二段的角色编号颠倒。
- 导入只会新增或替换同名咨询树，绝不会清空其他已导入路线。
- 导入前务必先运行一次不带 `--write` 的预览。

## 收藏栏 Word 导入

收藏栏（`/admin/consult/collections`）右上角可以直接选多个 `.docx` 导入；服务端解析正文后写入 `consult_collections`，咨询稿会归到“优秀咨询稿”。也可以在命令行批量导入：

```bash
# 预览解析结果
npx tsx scripts/import-collections-docx.ts zxg

# 写入收藏栏；按标题判重，同名只更新正文
npx tsx scripts/import-collections-docx.ts zxg --write
```

脚本写入前会用 `VACUUM INTO` 备份到 `data/backups/`。`zxg/` 里是真实学员咨询稿，包含个人信息，不要提交到 Git。

## 主要页面

后台按四个栏目组织（侧栏顺序）：

- 问卷：概览、邀请链接、学员名单。
- 咨询：写咨询稿、咨询树、收藏栏。
- 分数线：分数线（仅管理后台内部查询，不进入报告）。
- 设置：问卷设置、报告设置、AI 分析规则。

学员名单按咨询期次自动分组：一期 = 周三 00:00 → 下周二 23:59:59（固定 Asia/Shanghai），归期看邀请链接创建时间；顶部只保留期次 chip（全部 / 本期 / 上期 / 更早），不再有自定义分组和日期筛选。导出 CSV 跟随当前期次与状态。

### 分数线

`/admin/score-lines` 是咨询师内部查询工具：手填考试类型 / 年份 / 省份 / 院校 / 专业，查看主线（考研国家线、专升本省控线）、校线、专业线（总分 + 各科单科）和招生计划。仅后台使用，不接入 AI 报告，不预置任何真实数字。

- **四层口径**：`scoreline_batches` 的 `scope` 区分 `national` / `provincial` / `school` / `program`；`scoreline_metrics` 一行一个科目（`total` 也是科目），`full_score` 未知时留空。最低分用 `is_minimum=1` + `minimum_type`（`admit` / `retest` / `transfer` / `other`）单独标记，图上空心标记、不连线。
- **全国院校**：`schools` / `school_aliases` 存院校主表与别名，`school_programs` 存招生专业、计划数、学费和考试科目。院校名单没有自动抓取，按 `scripts/import-schools.ts` 导入教育部名单（支持 CSV / XLSX，`--dry-run` 只统计）。
- **查询**：`GET /api/admin/score-lines/query` 只读 `review_status='approved'`；主线永远返回，校线 / 专业线在选院校 / 专业后叠加；同一科类有多条批次且未选 `category` / `track` 时返回 `requires`，页面提示补选，不混画。
- **抓取**：`scoreline_sources` 注册 31 省考试院 + 研招网源，`scripts/seed-sources.ts` 幂等写入；`crawl_runs` / `crawl_documents` 记录任务和原始快照。调度器一次只跑一个省，页面「立即抓取本省」插队。抓取结果默认 `pending`，复核通过后才可查询；失败原因写进覆盖看板。原始快照存 `data/crawl/`，保留 90 天。
- **解析器**：`server/src/score-lines/parsers/` 下 `html-table@1` / `xlsx@1` / `pdf-text@1` / `json@1`，fixture 用例随 `check:score` 执行。PDF 无文本层（扫描件）直接标失败，不做 OCR。
- **人工兜底**：`POST /api/admin/score-lines/import` 支持 `dryRun`，批量导入分数线和招生计划；导入默认 `approved`。复核队列支持单条 / 批量通过或拒绝。
- **边界**：Phase 1 已注册全 31 省源并用通用表格解析器抓取，但各站点结构差异仍需逐源适配；抓不到时覆盖看板标 `failed`，由人工导入兜底。Phase 2 再做 T1/T2 院校线铺开和更多站点解析器。真实站点回归首次失败的根因与修复方案见 [7-分数线模块抓取失败-根因与修复方案.md](./archive/20261114/7-分数线模块抓取失败-根因与修复方案.md)（v1.80 已实施：引导页跟随 / 发现队列 / 类别表解析 / 失败码；仅浙江栏目入口已核验，其余 30 省失败提示 `needs_seed`）。
- **校验**：`shared/src/score-line.ts` 的 `validateImportPayload()` / 科目归一化 / 省份 A-B 区映射前后端共用；用例在 `shared/src/score-line.cases.ts` 和 `server/src/score-lines/parsers/cases.ts`，由 `npm run check:score` 执行并接入 `verify`。

公开页面：

- `/i/:token`：邀请页与问卷入口。
- `/i/:token/quiz`：填写问卷。
- `/r/:slug`：查看报告、领取与预约（后台不再单独提供「咨询预约」页；微信号和时间段在学员名单 / 答卷详情查看）。

## 常用验证

```bash
npm run check:dates                     # 日历时间距离 + 咨询期次用例
npm run check:score                     # 分数线输入校验用例
npx tsx server/src/ai/doc-audit.cases.ts # 报告文本审计用例（考研 × 听力 / 口语 / 英语时长）
npm run check:size                      # 文件规模检查（基线只减不增，新文件 ≤400 行）
npm run check:version                   # 版本号一致性（package.json ↔ docs/README.md「已完成」）
node scripts/check-events.mjs           # events 与 event_facts 漏斗事实一致性（只读，手动跑）
npm run verify                          # check:docs + check:size + check:version + check:dates + check:score + check:audit + typecheck + build
```

修改后端后至少执行 `typecheck`；修改前端后还要执行 `build`。当前没有统一的自动化测试套件，验收以类型检查、构建、时间用例、分数线导入/解析用例、报告文本审计、文件规模检查、版本号一致性和实际页面走查为准。分数线接口与抓取管线用临时 `DATA_DIR` + 本地 fixture 验证，不访问真实站点。

## 运行与排障

服务端日志统一走 `server/src/log.ts`：生产是单行 JSON（journald 收集），开发是人类可读单行。不要再用 `console.log` 绕过它。

```bash
# 实时看（systemd 部署）
journalctl -u vesta -f

# 只看错误 / 5xx
journalctl -u vesta -o cat --since '10 min ago' | jq -c 'select(.level=="error")'
journalctl -u vesta -o cat --since '10 min ago' | jq -c 'select(.msg=="http" and .status>=500)'

# 按一次请求 / 一条报告链路查
journalctl -u vesta -o cat | jq -c 'select(.reqId=="<request id>")'
journalctl -u vesta -o cat | jq -c 'select(.submissionId=="<submission id>")'
journalctl -u vesta -o cat | jq -c 'select(.runId=="<consult run id>")'

# pm2 / docker
pm2 logs vesta --lines 100 --nostream
docker compose logs --tail=100
```

常看的事件链：

- 一次问卷提交：`submit.invalid` 或 `submit.stored` → `ai.queue` → `ai.start` → `search.start` / `search.done` → `ai.call`（`stage=doc.initial`）→ `doc.audit_failed` / `doc.audit_passed` → `ai.ready` / `ai.retry` / `ai.failed`。
- `http` 日志的 `reqId` 关联一次 HTTP 请求；`submissionId` 关联整条异步报告链路；咨询稿用 `runId` + `seq`。
- 慢请求（>3000ms）自动记为 `warn`；`search.cache_hit`、`ai.call_start` 等只在 `LOG_LEVEL=debug` 输出。
- 日志不记录密码、密钥、联系方式、完整答卷和 AI 正文；邀请 token / 报告 slug 在路径里已替换成 `:token` / `:slug`，敏感 query key 不记录。

## 注意事项

- 不要提交 `.env`、`data/`、`web/dist/`。
- 不要清空或重置用户导入的咨询树。
- 不要在本地测试时杀掉用户已经启动的服务，除非用户明确要求。
- 数据库结构迁移由服务启动代码执行，修改表结构时要兼容已有数据。
- 简历收集已于 v1.76 下线；`resume_images` 表与存量图片保留在库中，代码不再读写，确认清理前不要 `DROP`。
- 分数线抓取只访问 `scoreline_sources` 里服务端配置的公开页面；普通用户不能传入抓取 URL。`SCORELINE_CRAWL_ALLOW_PRIVATE=1` 只用于本地 fixture 测试，生产不要打开。
