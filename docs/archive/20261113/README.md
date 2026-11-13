# 20261113 问题与进度索引

> 用途：2026-11-13 当天的问题 / 需求方案都存在本目录，本文件是**目录索引 + 进度台账**——每个问题是什么、做到哪一步、是否已修复、证据在哪。
> 具体方案看各自文件，本文件不重复方案细节，只做汇总与复核。
> 最后核对：2026-11-13（核对方式见第四节；状态有变化时先改这里，再改对应方案文件顶部的「状态」）。

---

## 一、状态总览

| # | 文件 | 问题 | 类型 | 状态 | 产品版本 |
| --- | --- | --- | --- | --- | --- |
| 1 | [1-仪表盘每组完成恒为0-修复方案.md](./1-仪表盘每组完成恒为0-修复方案.md) | 后台概览漏斗「完成第 X 组」计数与百分比恒为 0 | Bug 修复 | **已修复**（已提交 `8207668`） | v1.64 |
| 2 | [2-后台分数在doc模式是映射值-修复方案.md](./2-后台分数在doc模式是映射值-修复方案.md) | doc 模式没有真实总分，后台却把 A/B/C 映射成 82/60/25 当「分数」展示 | Bug 修复 | **已修复**（已提交 `dfd14a8`） | v1.65 |
| 3 | [3-检索届别改用当前年份-修复方案.md](./3-检索届别改用当前年份-修复方案.md) | 检索词届别按填表人年级推算毕业年份，常搜到未来届别 | 需求变更 | **已修复**（已提交 `8207668`） | v1.63 |
| 4 | [4-问卷题目独立与题号重排-开发文档.md](./4-问卷题目独立与题号重排-开发文档.md) | Q5a 不再跟随 Q5 显示，独立为第 6 题，题号重排为连续 Q1–Q28 | 需求变更 | **已修复**（已提交 `dfd14a8`） | v1.66 |
| 5 | [5-英语块表述核对与生成约束.md](./5-英语块表述核对与生成约束.md) | 报告英语块「先听力再口语」「口语不追求流利」等表述越界，缺生成约束 | 内容校对 + 优化建议 | **已修复**（已提交 `d8fa36c`） | v1.67 |
| 6 | [6-英语块校验-review报告.md](./6-英语块校验-review报告.md) | v1.67 校验层的 3 处残留：考研 + 听力误伤、正则覆盖不全 / 去重偏严、第 5 篇题号过期 | 复核（Review） | **已修复**（已提交 `d8fa36c`） | v1.68 |
| 7 | [7-日志系统完善-开发文档.md](./7-日志系统完善-开发文档.md) | 没有请求日志、没有 requestId，用户说「报告一直转圈」时无法定位卡在哪一步 | 工程能力 | **已修复**（代码改动在工作区，待提交） | v1.69 |
| 8 | [8-巨型文件拆分与约束-开发文档.md](./8-巨型文件拆分与约束-开发文档.md) | 17 个源文件超 600 行（最大 1591 行），且拆分没有留下可执行的约束 | 重构 + 规范 | **待实施** | 计划 v1.71 |
| 9 | [9-版本号同步与工程元数据规范-开发文档.md](./9-版本号同步与工程元数据规范-开发文档.md) | `package.json` 还是 0.1.0、文档已到 v1.68、代码里没人读版本号，三处不一致无人发现 | 规范 + 部署校验 | **实施中**（`deploy-info.ts` 已建） | 计划 v1.70 |
| 10 | [10-gzip压缩-开发文档.md](./10-gzip压缩-开发文档.md) | 文本响应既无应用层压缩、nginx 模板也没开 gzip，首屏 131.6 kB 的 JS 明文传输（线上实测无 gzip） | 性能 | **待实施** | 计划 v1.72 |
| 11 | [11-events表保留与清理-开发文档.md](./11-events表保留与清理-开发文档.md) | `events` 只增不删，后台概览每次全表扫；但漏斗依赖历史事件，不能直接删 | 数据治理 | **待实施** | 计划 v1.73 |

状态口径：**已修复** = 代码改动已提交且方案文档记了验证；**待实施** = 方案已写、代码没动；**待确认** = 连产品口径都还没最终确认。

---

## 二、逐项说明

### 1. 仪表盘「每组完成」恒为 0 —— 已修复（v1.64）

- **问题**：`events` 表按 `type = 'group_complete'` 聚合每组完成人数（`server/src/routes/admin/overview.ts:30-39`），服务端事件白名单也允许该类型，但前端从来没上报过，所以漏斗下面几行永远是 0，且不报错。
- **修复**：`web/src/views/Quiz.vue` 新增 `reportedGroups`（:131）和 `markGroupsCompleted()`（:342），在 `advance()`、`jumpToQuestion()`、答案深度 watch、草稿恢复完成后各调用一次（:365 / :410 / :531 / :540），上报 `track(token, 'group_complete', { groupId })`。
- **完成口径**（与方案 v1.0 不同，实施时修正）：组内所有**可见、非置灰、必答**的题都有答案才算完成——`q5a`、`q18` 是 `required: false` 的可跳过题，若计入会导致含这些题的组永远无法完成。
- **未做**：方案 B（提交时服务端补记）、`events` 表索引优化。历史答卷没有组完成记录，不补算。
- **验证**：`docs/development-history.md` 记 `npm run verify` 全绿 + 本地走查（答完 p1 只出现 1 次 `group_complete`、回退再前进不重复、`GET /api/admin/overview` 的 `p1.completed = 1`）。
- **文档小问题（已订正）**：方案 §七 原写「产品版本 v1.63」，与文件头 v1.64、`development-history.md` 不一致，已按 v1.64 改正。

### 2. 后台「分数」在 doc 模式是映射值 —— 已修复（v1.65）

- **问题**：doc 模式没有真实总分，提交时按 `docPriority()` 把 A/B/C 映射成 82/60/25 写进 `submissions.total`，后台名单、答卷详情、CSV 却把它当「分数」展示，和报告页（没有数字总分）对不上。
- **修复**：
  - 写入：`server/src/routes/public.ts:177-183` doc 模式 `total` 写 `0`，`tier` 仍写 A/B/C；legacy 继续 `computeScores()`。
  - 读接口：`server/src/routes/admin/shared.ts` 新增 `surveyReportModes()` / `reportModeOf()`；`roster.ts`、`submissions.ts` 列表与详情每条都带 `reportMode`。
  - CSV：`submissions.ts` doc 行「总分」留空，表头保留；legacy 行不变。
  - 前端：`Submissions.vue` doc 行只显示 `tier`，列名按名单实际模式显示「优先级」或「优先级 / 分数」；`SubmissionDetail.vue` doc 模式隐藏「总分 / 100」，标题改「优先级」。
- **未做**：历史数据回填（把 doc 类答卷 `total` 置 0）。属独立数据操作，需先备份并单独确认；不执行也不影响界面。
- **验证**：`npm run verify` 全绿。

### 3. 检索届别改用当前年份 —— 已修复（v1.63）

- **问题**：原 `cohortYear()` 按 Q3 年级 + 9 月换学年推四年制毕业年份，假设太多，大一学生会被拼成未来届别，当季在招岗位反而搜不到；用户明确不需要这个推算。
- **修复**：`shared/src/doc.ts` 删除 `cohortYear()`；`server/src/ai/doc-search.ts:376` 改用 `new Date().getFullYear()`，主检索 / 方向补位 / 岗位补位 / 校园招聘兜底四类检索词统一用该年份（:398、:494、:499、:528）。
- **兼容**：`ReportSearchMeta.cohortYear` 改名 `searchYear`（`shared/src/types.ts:471-472`）；`server/src/ai/doc-generate.ts:275` 读取时先取 `searchYear`、回退旧 `cohortYear`，旧报告的检索记录不篡改。
- **静态核对**：全仓库除 `normalizeSearchMeta()` 的旧字段兼容外，已无 `cohortYear` 引用；`doc.ts` 不再有按年级算毕业年份的函数。
- **验证**：`docs/development-history.md` 记 `npm run verify` 全绿；本轮补做两项不改代码的核对：
  - 检索词链路（stub 掉 fetch，不实际外呼、不花 AI/博查费用）：同一专业分别按 Q3「大一」「大四」调用 `searchJobs()`，四类检索词都拼成 `2026 届`，与年级无关，`meta.searchYear = 2026`。
  - 旧报告兼容：把一份旧报告的存储 meta 改成 `cohortYear: 2028`（模拟旧字段），新代码渲染出的「检索记录」副标题仍为「检索词按 2028 届拼写」，没有 `undefined`。
  - 仍未跑完整 AI 报告端到端生成（避免 AI 费用）。

### 4. 问卷题目独立与题号重排 —— 已修复（v1.66）

- **需求**（用户 2026-11-13 口头）：Q5a「想做什么行业、什么岗位」不再由 Q5 决定显隐，独立成第 6 题；题号连续重排 Q1–Q28；仍可跳过。
- **实现**：
  - `shared/src/survey.ts`：删除 `q5a` 的 `showIf`；28 个 `code` 按数组顺序重排为 Q1–Q28（`id` 不动）。
  - `server/src/db/migrations.ts`：新增 `patchQ5aIndependent()`，customized 问卷只去显示条件、不重排编号；非定制问卷由 `surveyShape()` 差异整份对齐新默认结构。
  - `shared/src/docScore.ts` / `doc.ts` / `server/src/ai/doc-prompts.ts` / `doc-audit.ts`：来源与提示文案里的题号同步到新编号。
  - `web/src/views/Quiz.vue`：`quiz_exit` 的 `total` 由写死 27 改为 `visible.value.length`。
  - `docs/规划自测问卷-设计文档.md` 升 v1.3，题号、分组、跳题、报告规则、验收清单同步。
- **兼容**：答卷按 `id` 存，历史答卷零迁移；草稿 `step` 下标不变；已生成报告不重新生成。
- **验证**：`npm run verify` 全绿。

### 5. 英语块表述与生成约束 —— 已修复（v1.67）

- **问题**：那份 2026-11-12 生成的英语师范报告，英语块写了「补的顺序是先听力，再口语」「口语不追求流利」，答卷里没有依据；「你写的原因是没人教方法」把 Q24 原因多选压成了单因（原分析稿误标为 Q23，Q23 是「上次四级哪部分丢分最多」）。生成侧英语块只有一句 Skill 约束，`findTextIssues` 也没拦这些表述。
- **产出**：逐句核对表、可直接替换的三段改写稿、3 条改动说明，以及代码链路 / 问题 / 优化建议。
- **落地（v1.67）**：
  - `shared/src/doc-skill.ts`：`english` 规则扩写为听说并列、不降口语目标、顺序要有材料、原因按多选逐条、验证只作建议、可点大学课堂一般局限、不写每周时长。
  - `server/src/ai/doc-audit.ts`：`findTextIssues` 拦「英语不重要」「口语不追求 / 不用管 / 不重要 / 往后放」「先听力再口语」；`repetitionIssues` 把英语块的「每周 / 小时」判重复；`crossModuleIssues` 拦「考研 + 听力……考」直接绑定。
  - `server/src/ai/doc-prompts.ts`：英语 spec 增加 `needNote / speakingNote / listeningWeak / reasonNote / skippedDetailNote` 和 `titleHint`，消费 `skippedDetail`。
  - `shared/src/doc.ts` / `types.ts`：`section` 块带 `key`，按 key 取模块，不再硬编码 `english`。
- **验证**：`npm run verify` 全绿；用 `tsx` 直接跑审计函数回归样例（坏表述被拦、改写稿通过），未调用 AI。
- **未做**：脱敏答卷 fixture 回放（P2-3，需要 AI 调用）。

### 6. 英语块校验 Review —— 已修复（v1.68）

- **范围**：复核第 5 篇 v1.67 落地的校验层，只看残留问题，不重复已落地内容；review 时未改代码。
- **发现 3 项**：
  1. `crossModuleIssues` 的「考研 + 听力」检查按同段共现触发，实测「考研和听力是两件要一起抓的事」「如果走考研，听力要早点练」会被误拦；第二次重写仍命中时整份报告失败（`AI 报告前后矛盾`）。
  2. `findTextIssues` 的口语 / 顺序正则存在语序倒置（「不追求口语流利」）、「口语先放一放」、跨行等逃逸写法；`repetitionIssues` 对英语块「每周 / 小时」的硬匹配会把「每周末做一套真题」误判为重复。
  3. 第 5 篇 §5.1 的 `weeklyHours` 题号仍写 Q25，重排后应改为 Q26（`shared/src/survey.ts:445-446`，内部 `q20`）。
- **证据 / 复现 / 建议**：见[报告正文](./6-英语块校验-review报告.md)第二～五节；结论来自直接调用审计函数，未调用 AI。
- **落地（v1.68）**：
  - 考研 × 听力：只在确实写了考试语义（初试 / 复试 / 考试 / 科目 / 要考 / 加试 / 计入 / 占 N 分）且听力被写成要考 / 计入 / 占分时判错；共现但没提考试放行。
  - 口语：新增反向语序、`放一放 / 缓一缓 / 靠后 / 以后再说` 和跨行覆盖；带否定的正确表述（「口语不能往后放」）放行。
  - 英语时长：只拦复述问卷的「每周 X 小时」「总共 X 小时」和 `weeklyHours` 档位值；练习节奏（「每周末做一套真题」「每天 1 小时听力」）放行。
  - 第 5 篇题号按 Q1–Q28 全量订正（review 只点到 Q25 → Q26，核对时发现全文仍是重排前编号，一并改为 Q20 / Q22 / Q23 / Q24 / Q25 / Q26 / Q27）。
  - 回归用例：`server/src/ai/doc-audit.cases.ts`（考研 × 听力 10 组、口语 12 组、英语时长 8 组、模块 / 数字边界 2 组），新增 `npm run check:audit` 并接入 `npm run verify`。
- **验证**：`npm run check:audit` 通过；`npm run verify` 全绿；未调用 AI、未重新生成旧报告。

### 7. 日志系统完善 —— 已修复（v1.69）

- **问题**：服务端只有 17 处自由格式 `console.*`，没有请求日志、没有 `reqId`/`submissionId` 关联字段；报告生成最坏十几分钟，中间只有失败或自动重试两条日志，用户说「一直转圈」时无法定位。
- **落地**：
  - `server/src/log.ts`：统一四级日志；生产单行 JSON、开发人类可读；`Error` 归一化，生产堆栈前 3 行。
  - 请求日志：`reqId` + `X-Request-Id`，记录 method/path/status/ms/ip/ua/queryKeys；排除静态资源、成功 health、304；慢请求 >3s 提 warn。
  - 业务链路：submit、AI 入队/重试/成功/失败、doc 检索与审校、博查缓存、咨询稿 `runId/seq`。
  - `/api/health`：增加 `db / uptimeSec / commit / appVersion`；`commit` / `appVersion` 从 `data/deploy-info.json` 读取，第 9 篇落地前为空。
  - 兜底：`uncaughtException` / `unhandledRejection` 打日志后退出。
- **脱敏**：邀请 token / 报告 slug 路径替换为 `:token` / `:slug`；敏感 query key 不记录；不记录密码、密钥、联系方式、完整答卷、AI 正文。
- **验证**：`npm run verify` 全绿；临时 `DATA_DIR` + 多个端口实测 health、请求日志、脱敏、submit → AI 失败链路与 `askDeepSeek()` 未配置日志，未调用 AI、未写仓库 `data/`。详见[第 7 篇第九节](./7-日志系统完善-开发文档.md)。

---

## 三、仓库与上线状态（2026-11-13 核对）

- 提交状态：v1.63 / v1.64 的代码与文档已在 `8207668` 提交，v1.65 / v1.66 已在 `dfd14a8` 提交；v1.67（英语块表述约束）与 v1.68（校验订正）已在 `d8fa36c` 提交。v1.69（日志系统）仍在工作区，待提交。
- 本索引文件 `docs/archive/20261113/README.md` 已随上述提交入库；后续修改（本次状态同步）仍需单独提交。
- 线上是否生效取决于服务器是否执行过 `bash update.sh`：若尚未部署，漏斗「完成第 X 组」仍是 0、检索词仍按年级推算届别、doc 答卷后台仍显示 82/60/25、问卷仍是 Q5a + Q1–Q27。部署由 L1 流程执行，要求工作区干净。
- 上线前注意：v1.66 会改动问卷结构。非定制问卷启动时整份对齐新默认结构；定制问卷只自动去掉 Q5a 的 `showIf`、编号保持不变。该迁移对定制问卷不可逆，执行前先按 `VACUUM INTO` 备份 `data/vesta.db`。
- `8207668` 误带入了 `_scratch/mem-patch.py`。该文件已从工作区 / 索引删除（`git rm`），`.gitignore` 已忽略 `_scratch/`；删除随下一次提交生效，旧提交历史里仍保留该文件（不改写历史）。
- v1.64 的走查证据：独立临时 `DATA_DIR` + 浏览器实测——答完 p1 只上报 1 次、回退再前进不重复、`GET /api/admin/overview` 返回 `p1.completed = 1`；临时 dev server 已停止，未写入 `data/`。
- v1.65 / v1.66 只跑了 `npm run verify`（check:docs / check:dates / typecheck / build），未做完整浏览器走查；上线前建议按各方案第五节手工过一遍后台名单、答卷详情、CSV 和问卷 Q6。
- v1.67 / v1.68 只跑了 `npm run verify`（check:docs / check:dates / check:audit / typecheck / build），未调用 AI、未重新生成旧报告；上线后建议用同一份答卷重跑一次，确认英语块不再被误拦。
- v1.69 除 `npm run verify` 外，另用临时 `DATA_DIR` + 8791–8800 端口实测 health、请求日志、敏感信息脱敏、submit → `ai.unavailable` 链路和 `askDeepSeek()` 未配置日志；未调用 AI、未写仓库 `data/`。上线后建议用 `journalctl -u vesta -o cat | jq` 抽查 error / 慢请求。

---

## 四、复核方法（下次核对按这个来）

```bash
# 1：group_complete 是否真的上报
grep -rn "group_complete" web/src

# 2：doc 模式是否还在造 82/60/25；后台是否带 reportMode
grep -n "total: 0" server/src/routes/public.ts
grep -rn "reportMode" server/src/routes/admin web/src/views/admin

# 3：是否还有 cohortYear 推算
grep -rn "cohortYear" shared server

# 4：q5a 是否已独立、题号是否已重排
grep -n "q5a" shared/src/survey.ts
grep -n "showIf" shared/src/survey.ts
grep -n "code: 'Q" shared/src/survey.ts

# 5：英语块校验的正反样例（考研 × 听力 / 口语 / 英语时长）
npm run check:audit

# 6：日志是否统一走 log.ts、是否还有绕过的 console
grep -rn "console\.\(log\|warn\|error\)" server/src | grep -v "log.ts"
```

```bash
# 数据侧（v1.64 上线后）
sqlite3 data/vesta.db "select type, count(*) from events group by type;"
sqlite3 data/vesta.db "select json_extract(payload,'$.groupId') g, count(distinct invite_id) from events where type='group_complete' group by g;"
```

改完任何一项后：把本文件第一节的状态与版本、对应方案文件顶部的「状态」、`docs/development-history.md` 三处一起更新，并跑 `npm run verify`。

---

## 五、收尾建议

1. **部署 v1.63–v1.69**：v1.63–v1.66 已提交并推送（`8207668` 覆盖 v1.63/v1.64，`dfd14a8` 覆盖 v1.65/v1.66），v1.67 / v1.68 在 `d8fa36c`；v1.69 提交后一并在服务器执行 `bash update.sh` 才会全部生效。
2. **上线前备份数据库并手工走查**：`VACUUM INTO` 备份 `data/vesta.db`；重点看后台名单/答卷详情/CSV 的 doc 模式展示、问卷 Q6 是否不再依赖 Q5、题号是否连续 Q1–Q28。
3. **可选**：历史 doc 答卷 `total` 回填为 0（独立数据操作，需先备份并单独确认；不做也不影响界面）。
