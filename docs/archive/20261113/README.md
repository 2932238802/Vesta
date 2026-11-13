# 20261113 问题与进度索引

> 用途：2026-11-13 当天的问题 / 需求方案都存在本目录，本文件是**目录索引 + 进度台账**——每个问题是什么、做到哪一步、是否已修复、证据在哪。
> 具体方案看各自文件，本文件不重复方案细节，只做汇总与复核。
> 最后核对：2026-11-13（核对方式见第四节；状态有变化时先改这里，再改对应方案文件顶部的「状态」）。

---

## 一、状态总览

| # | 文件 | 问题 | 类型 | 状态 | 产品版本 |
| --- | --- | --- | --- | --- | --- |
| 1 | [1-仪表盘每组完成恒为0-修复方案.md](./1-仪表盘每组完成恒为0-修复方案.md) | 后台概览漏斗「完成第 X 组」计数与百分比恒为 0 | Bug 修复 | **已修复**（代码已实现，工作区未提交） | v1.64 |
| 2 | [2-后台分数在doc模式是映射值-修复方案.md](./2-后台分数在doc模式是映射值-修复方案.md) | doc 模式没有真实总分，后台却把 A/B/C 映射成 82/60/25 当「分数」展示 | Bug 修复 | **待实施**（方案已定，代码未动） | — |
| 3 | [3-检索届别改用当前年份-修复方案.md](./3-检索届别改用当前年份-修复方案.md) | 检索词届别按填表人年级推算毕业年份，常搜到未来届别 | 需求变更 | **已修复**（代码已实现，工作区未提交） | v1.63 |
| 4 | [4-问卷题目独立与题号重排-开发文档.md](./4-问卷题目独立与题号重排-开发文档.md) | Q5a 不再跟随 Q5 显示，独立为第 6 题，题号重排为连续 Q1–Q28 | 需求变更 | **待确认，未实施**（只出方案） | 目标 v1.65 |

状态口径：**已修复** = 代码改动已在仓库工作区落地且方案文档记了验证；**待实施** = 方案已写、代码没动；**待确认** = 连产品口径都还没最终确认。

---

## 二、逐项说明

### 1. 仪表盘「每组完成」恒为 0 —— 已修复（v1.64）

- **问题**：`events` 表按 `type = 'group_complete'` 聚合每组完成人数（`server/src/routes/admin/overview.ts:30-39`），服务端事件白名单也允许该类型，但前端从来没上报过，所以漏斗下面几行永远是 0，且不报错。
- **修复**：`web/src/views/Quiz.vue` 新增 `reportedGroups`（:131）和 `markGroupsCompleted()`（:342），在 `advance()`、`jumpToQuestion()`、答案深度 watch、草稿恢复完成后各调用一次（:365 / :410 / :531 / :540），上报 `track(token, 'group_complete', { groupId })`。
- **完成口径**（与方案 v1.0 不同，实施时修正）：组内所有**可见、非置灰、必答**的题都有答案才算完成——`q5a`、`q18` 是 `required: false` 的可跳过题，若计入会导致含这些题的组永远无法完成。
- **未做**：方案 B（提交时服务端补记）、`events` 表索引优化。历史答卷没有组完成记录，不补算。
- **验证**：`docs/development-history.md` 记 `npm run verify` 全绿 + 本地走查（答完 p1 只出现 1 次 `group_complete`、回退再前进不重复、`GET /api/admin/overview` 的 `p1.completed = 1`）。
- **文档小问题（已订正）**：方案 §七 原写「产品版本 v1.63」，与文件头 v1.64、`development-history.md` 不一致，已按 v1.64 改正。

### 2. 后台「分数」在 doc 模式是映射值 —— 待实施

- **问题**：doc 模式没有真实总分，提交时按 `docPriority()` 把 A/B/C 映射成 82/60/25 写进 `submissions.total`（`server/src/routes/public.ts:181-182`），后台名单、答卷详情、CSV 却把它当「分数」展示，和报告页（没有数字总分）对不上。
- **当前代码仍是旧行为**（逐处核对过）：
  - `server/src/routes/public.ts:181-182`：`total = priority === 'A' ? 82 : priority === 'B' ? 60 : 25`；
  - `server/src/routes/admin/roster.ts:103-104`：每行直接返回 `total` / `tier`，没有 `reportMode`；
  - `server/src/routes/admin/submissions.ts`：CSV 表头「总分」+ `row.total`（:43、:73）；列表（:119）、详情（:153）也返回 `total`，均无 `reportMode`；
  - `web/src/views/admin/Submissions.vue:259`（表头「分数」）+ `:308-314`（显示 `tier` + 数字）；
  - `web/src/views/admin/SubmissionDetail.vue:33-38`（「分数 / 82 / 总分 / 100」）。
- **待做**（方案第三节）：写入端 doc 模式 `total` 写 0；三个读接口带出 `reportMode`；前端 doc 模式只显示 A/B/C（列名改「优先级」）；CSV doc 行「总分」留空。
- **待确认**：历史数据回填（把 doc 类答卷 `total` 置 0）是独立数据操作，方案标为「可选」，执行前需备份并单独确认。

### 3. 检索届别改用当前年份 —— 已修复（v1.63）

- **问题**：原 `cohortYear()` 按 Q3 年级 + 9 月换学年推四年制毕业年份，假设太多，大一学生会被拼成未来届别，当季在招岗位反而搜不到；用户明确不需要这个推算。
- **修复**：`shared/src/doc.ts` 删除 `cohortYear()`；`server/src/ai/doc-search.ts:376` 改用 `new Date().getFullYear()`，主检索 / 方向补位 / 岗位补位 / 校园招聘兜底四类检索词统一用该年份（:398、:494、:499、:528）。
- **兼容**：`ReportSearchMeta.cohortYear` 改名 `searchYear`（`shared/src/types.ts:471-472`）；`server/src/ai/doc-generate.ts:275` 读取时先取 `searchYear`、回退旧 `cohortYear`，旧报告的检索记录不篡改。
- **静态核对**：全仓库除 `normalizeSearchMeta()` 的旧字段兼容外，已无 `cohortYear` 引用；`doc.ts` 不再有按年级算毕业年份的函数。
- **验证**：`docs/development-history.md` 记 `npm run verify` 全绿；本轮补做两项不改代码的核对：
  - 检索词链路（stub 掉 fetch，不实际外呼、不花 AI/博查费用）：同一专业分别按 Q3「大一」「大四」调用 `searchJobs()`，四类检索词都拼成 `2026 届`，与年级无关，`meta.searchYear = 2026`。
  - 旧报告兼容：把一份旧报告的存储 meta 改成 `cohortYear: 2028`（模拟旧字段），新代码渲染出的「检索记录」副标题仍为「检索词按 2028 届拼写」，没有 `undefined`。
  - 仍未跑完整 AI 报告端到端生成（避免 AI 费用）。

### 4. 问卷题目独立与题号重排 —— 待确认，未实施

- **需求**（用户 2026-11-13 口头）：Q5a「想做什么行业、什么岗位」不再由 Q5 决定显隐，独立成第 6 题；题号连续重排 Q1–Q28；仍可跳过。
- **当前代码仍是旧形态**：`shared/src/survey.ts:88-96` 的 `q5a` 仍带 `showIf: { question: 'q5', when: ['q5_2','q5_3'] }`；`code` 仍是 `Q1–Q27` 外加 `Q5a`；`server/src/db/migrations.ts` 里没有方案 §5.6 的 `patchQ5aIndependent()` 补丁。
- **未实施原因**：文档状态为「待确认，未实施」，方案第十节还有 3 个待确认项（定制问卷是否统一重排编号、报告 source 文案里的历史题号是否顺手纠正、`Quiz.vue` 的 `total: 27` 是否改动态）。
- **版本提示**：方案文件写「对应产品版本 v1.63」，但 v1.63 / v1.64 已被占，按 `docs/README.md`「版本约定」落地时应从 **v1.65** 起算。
- **工作量提示**：`shared/src/survey.ts` + 设计文档升 v1.3 + `docScore.ts` / `doc.ts` 文案 + `migrations.ts` 补丁 + `check:docs` 必须同步改完（`code` 一变，设计文档校验就会失败）。

---

## 三、仓库与上线状态（2026-11-13 核对）

- v1.63、v1.64 的代码改动**还在工作区，未提交**（`git status` 显示 9 个文件 modified：`docs/README.md`、`docs/development-history.md`、`docs/archive/20261113/1-…md`（§七 版本号订正 v1.63→v1.64）、`docs/archive/20261113/3-…md`、`server/src/ai/doc-generate.ts`、`server/src/ai/doc-search.ts`、`shared/src/doc.ts`、`shared/src/types.ts`、`web/src/views/Quiz.vue`）。
- 本索引文件 `docs/archive/20261113/README.md` 本身也还未提交（untracked），提交时要一起带上。
- 因此线上行为仍是修复前：漏斗「完成第 X 组」还是 0、检索词还是按年级推算的届别。**要让这两项生效，需要先提交，再在服务器执行 `bash update.sh`（L1 要求工作区干净）。**
- 工作区另有未跟踪的 `_scratch/`（一次性脚本目录），按仓库规矩收尾时清理，不要提交。
- v1.64 的走查证据：独立临时 `DATA_DIR` + 浏览器实测——答完 p1 只上报 1 次、回退再前进不重复、`GET /api/admin/overview` 返回 `p1.completed = 1`；临时 dev server 已停止，未写入 `data/`。

---

## 四、复核方法（下次核对按这个来）

```bash
# 1：group_complete 是否真的上报
grep -rn "group_complete" web/src

# 2：doc 模式是否还在造 82/60/25；后台是否带 reportMode
grep -n "priority === 'A'" server/src/routes/public.ts
grep -rn "reportMode" server/src/routes/admin web/src/views/admin

# 3：是否还有 cohortYear 推算
grep -rn "cohortYear" shared server

# 4：q5a 是否已独立、题号是否已重排
grep -n "q5a" shared/src/survey.ts
grep -n "code: 'Q" shared/src/survey.ts
```

```bash
# 数据侧（v1.64 上线后）
sqlite3 data/vesta.db "select type, count(*) from events group by type;"
sqlite3 data/vesta.db "select json_extract(payload,'$.groupId') g, count(distinct invite_id) from events where type='group_complete' group by g;"
```

改完任何一项后：把本文件第一节的状态与版本、对应方案文件顶部的「状态」、`docs/development-history.md` 三处一起更新，并跑 `npm run verify`。

---

## 五、建议处理顺序

1. **先提交 v1.63 + v1.64**（已实现未提交，最容易漏；不提交等于没上线）。
2. **再做 #2**（改动面小、5 个文件左右、用户能直接看出后台和报告对不上，优先级高）；历史数据回填单独确认后再跑。
3. **最后 #4**（改动面大、会动问卷口径和题号，必须先让用户确认方案第十节的 3 个待确认项再动手）。
