# 报告模块第一波 Review（2026-11-12）

> 审查方式：只读。未改代码、未提交、未安装依赖、未重启服务、未访问生产环境。  
> 审查基线：`118fbc70f1a56f9cd6484ec3e5bd98979fa136fb`，父提交 `f9a20142575ffedd9a3f54f0ecd34a965e98a6b1`。  
> `origin/main` 同为 `118fbc7`；只审这一波，不回看更早提交。

## 0. 审查对象与范围（自动获取）

- 提交：`118fbc7 [feat] 第一波修复 真实性修复&&pdf导出`
- 规模：`26 files changed, 3933 insertions(+), 1171 deletions(-)`
- 完整 diff 已生成到 `/tmp/vesta-wave1.diff`（6409 行），逐文件阅读了 `shared/src/date.ts`、`date.cases.ts`、`doc-skill.ts`、`doc.ts`、`docScore.ts`、`job-map.ts`、`server/src/ai/*`、`server/src/routes/*`、`server/src/db.ts`、`env.ts`、`ReportView.vue`、`ReportBlocks.vue`、`SkillEditor.vue`、`api.ts` 及 docs 变更。
- 基线（`118fbc7`）本身工作区干净；审查过程中工作区出现了 A 的**问卷页面 UI 优化**未提交改动（`web/src/views/Invite.vue`、`Quiz.vue`、`QuestionField.vue`、`styles.css`、`docs/development-history.md`，以及 `?? .audit-tmp/`）。这些不属于第一波报告提交，本报告不审计、不作为结论依据。
- 提交未包含 `.env`、`data/`、`web/dist/`；`.env` 仍被 `.gitignore` 忽略（`git check-ignore -v .env` 命中 `.gitignore:30`）。
- `git diff --check 118fbc7^ 118fbc7` 退出 0，无空白错误。

## 1. 结论

**不能直接进入第二波。需返工后复审：阻断 3 项、重要 5 项；建议 3 项不阻塞。返工项合计 8 项。**

最严重的三项：

1. `gap`（“和目标之间还差多少”）仍是程序写死的整段文字，AI 只替换标题和末尾一句，未做到“全部内容由 AI 分析”。
2. `calendarSpan()` 的月末借位算法会返回**负天数**和错误天数，现有 19 条用例没有覆盖到。
3. 数字审计只做“全报告白名单”存在性检查，AI 可以把某个模块的分数写成另一个模块的合法数字，仍能通过审计。

## 2. 阻断（必须修）

### B1. `gap` 块仍是硬编码正文，不是 AI 分析

- **位置**：`shared/src/doc.ts:851-932`（`gapLines`）、`shared/src/doc.ts:1189-1193`（`applySystemModules` 只覆盖 title/summary）、`server/src/ai/doc-generate.ts:702-713`（gap spec 把 `lines` 当 data，`items: []`）、`web/src/components/ReportBlocks.vue:305-311`（直接渲染 `block.lines`）。
- **问题**：`gapLines()` 生成的是完整成品句，不是原始事实。例如：
  - `gapLines` 对所有“就业 + 城市还没想好”的答卷都加同一句：`先用行业密度、生活成本、离家距离三项打分，最晚第 3 个月定主城市 + 备选`（`shared/src/doc.ts:877-881`）。
  - 所有就业答卷都加同一条“入场线”免责句（`:873-876`）；所有“还没确定”的答卷都加同一条“下一步”（`:902-903`）。
  - `applySystemModules` 对 gap 只写 `block.title` 和 `block.note`，**从不改 `block.lines`**；AI 的 `summary` 只显示在末尾一行（`ReportBlocks.vue:335`），主体仍是规则文字。
- **证据**：`server/src/ai/doc-generate.ts:702-713` 明确把 `lines: block.lines` 作为 `data` 发给模型，但 `items: []`，模型没有可回填的 item；`shared/src/doc.ts:1189-1193` 的 gap 分支只有 `title`/`note` 两个赋值。不同答卷只要 Q6=就业、Q8=还没想好，就会看到同一批“城市判断/入场线”。
- **与文档冲突**：`docs/规划自测问卷-设计文档.md:255` 写的是“没有数据的行不补”；这里没有城市数据，反而补了一条固定的“城市判断”，是明确的反例。
- **期望结果**：gap 的每一行要么是纯事实（城市、岗位、薪资、简历项、英语投入），要么由 AI 按本次答卷写；程序不再输出通用建议句。若保留 `lines` 结构，改为 `moduleSpecs.items` 让 AI 逐项写 `text`，`applySystemModules` 回填；否则把 gap 改成 AI `paragraphs`。
- **修复成本**：中（schema、prompt、合并逻辑、UI 类型都要同步）。

### B2. `calendarSpan()` 月末借位错误，返回负天数/错误天数

- **位置**：`shared/src/date.ts:90-106`（核心在 `:94-100`）。接口在 `shared/src/date.ts:17` 承诺 `days` “永远非负”，实际会返回负数。
- **问题**：当 `late.day < early.day` 时，代码借的是 **late 的前一个月** 的天数；对于 `2024-01-31 -> 2024-03-01`，它借 2024-02 的 29 天，`days = 1 - 31 + 29 = -1`，直接违约。正确的借位应从 start 一侧推进完整月，或直接用 `addCalendarMonths` 迭代。
- **证据**（`npx tsx` 只读探针，非仓库文件）：

  | 输入 | 期望（日粒度） | 实际 | 结果 |
  | --- | --- | --- | --- |
  | 2024-01-31 → 2024-03-01 | 1 个月 1 天 | 1 个月 **-1 天** | 失败 |
  | 2024-01-31 → 2024-03-02 | 1 个月 2 天 | 1 个月 0 天 | 失败 |
  | 2024-01-31 → 2024-03-30 | 1 个月 30 天 | 1 个月 28 天 | 失败 |
  | 2024-03-31 → 2024-05-01 | 1 个月 1 天 | 1 个月 0 天 | 失败 |
  | 2024-03-31 → 2024-05-02 | 1 个月 2 天 | 1 个月 1 天 | 失败 |
  | 2023-01-31 → 2023-03-01 | 1 个月 1 天 | 1 个月 **-2 天** | 失败 |

- **影响面**：当前 `describeDistance()` 只看 `totalMonths`，所以多数粗粒度展示暂时“看起来对”；但 `calendarSpan()` 是公开函数，负天数会污染以后任何按日展示/计算，且 `isOlderThanMonths()` 依赖同一套日历差。不能因为当前 UI 没显示天数就当作通过。
- **期望结果**：`days` 恒为非负；月末、闰年、跨年结果与“从 from 加完整月到 to”一致；补 `2024-01-31→2024-03-01`、`2024-03-31→2024-05-01`、`2023-01-31→2023-03-01` 等用例。
- **修复成本**：中（算法 + 用例 + 回归）。

### B3. 数字审计是全报告白名单，无法阻止 AI 写错分数

- **位置**：`server/src/ai/doc-generate.ts:978-1003`（`collectAllowedNumbers` 把所有来源的数字并成一个集合）、`:1006-1015`（`auditNumbers` 只判断 token 是否在集合里）；`contentProblems`（`:853-895`）只检查模块/item/text 是否存在，不检查“文本里的分数是否等于该 item 的 score”。
- **问题**：`moduleSpecs` 同时包含 9 个分数和岗位/问卷里的数字。只要某个数字在任意位置出现过，AI 就可以把它写进另一个 item。例如某学生学校项实际 5.5 分，但其他项有 8 分，AI 在 `scorecard.school` 的 `text` 里写“学校与专业 8 分”，`auditNumbers` 会因为全局集合里有 `8` 而放行；页面会同时显示系统 5.5 分和 AI 的“8 分”。
- **证据**：`auditNumbers` 的循环只做 `allowed.has(token)`（`:1009-1012`），没有 item 上下文；`collectAllowedNumbers` 合并 `answerLines`、`JSON.stringify(specs)`、`jobSpecs`、`search`、`survey.title`、`name`、`today`（`:1119-1127`），范围远大于单个 item。`scorecard` 的 `items` 在 `:652-661` 确实带 `score`，但审计没有用它做比对。
- **期望结果**：按 item 建立允许数字集合；至少对 `scorecard` 的 `(\d+(?:\.\d+)?)\s*分` 做“等于本 item score”的校验；不符合就走重写/失败，而不是全报告白名单放行。或者明确禁止 AI 在 scorecard 文本里写数字，由模板占位显示系统分数。
- **修复成本**：中（审计函数、prompt、可能的测试）。

## 3. 重要（应修）

### I1. 报告已 ready 时，检索失败提示里的“重新检索并生成”按钮必然失败

- **位置**：`shared/src/doc.ts:1265`（`sourcesBlock` 无论报告状态，只要 `error`/未配置就设 `retryable: true`）、`web/src/components/ReportBlocks.vue:206-213`（按钮直接发 `retry`）、`web/src/views/ReportView.vue:360-376`（调用 `POST /retry`）、`server/src/routes/public.ts:473-475`（已 ready 直接 409）。
- **问题**：Bocha 部分失败但报告已生成时，底部“检索记录”仍会显示“重新检索并生成”按钮。用户点击后服务端返回 `报告已经生成，不需要重试`；`ReportView` 把错误写进 `reportError`，但因为 `payload` 已存在，失败页不会显示，用户看不到任何有效反馈。这违反 `docs/agent-rules.md:25` “AI 失败必须显示真实原因，并允许重试”。
- **证据**：`sourcesBlock` 的 `retryable` 没有“是否 ready”条件；`ReportBlocks` 的按钮只判断 `block.retryable`；服务端在 `:473` 明确拒绝 ready。页面只有在 `!payload && reportStatus === 'failed'` 时才展示 `reportError`（`web/src/views/ReportView.vue:37-54`）。
- **期望结果**：ready 报告的检索记录要么不显示重试按钮，要么提供“仅重新检索/强制重建”的有效入口；失败页的重试继续保留。隐藏按钮时说明“要重新检索需新建报告/等待后台重新生成”，不要给一个必定 409 的按钮。
- **修复成本**：小。

### I2. 缺失的自定义 Skill 会静默回退默认规则，和文档“找不到就报错”不一致

- **位置**：`server/src/db.ts:843-849`（`getReportSkillState` 把不存在的 active id 强制改为 `default`）、`:875-888`（`getDocReportSkill` 的 `!template` 分支因此基本不可达）、`:930-936`（删除激活模板时直接改回 default）。
- **问题**：管理员选中的自定义模板如果在设置/数据库里丢失，`getReportSkillState` 会先把 activeId 改成 `default`，然后 `getDocReportSkill` 走默认内置规则，不报错。`docs/README.md:143` 与 `docs/规划自测问卷-设计文档.md:286` 都写“自定义模板缺失或为空时直接报错”，代码没有做到“缺失时失败”；`deleteReportSkillTemplate` 的“删除后恢复默认”也让这条路径在正常 UI 操作下不可见。
- **证据**：`getReportSkillState` 的三元表达式 `storedActiveId === default || templates.some(...) ? storedActiveId : default`；`getDocReportSkill` 只有 `activeId === default` 和 `template` 存在两个分支。文档和代码不一致，且 `docs/agent-rules.md:24` 反对用兜底冒充。
- **期望结果**：保留原始 activeId；如果它指向一个不存在的模板，直接抛“当前启用的 AI 分析规则不存在”；只有显式选择 `default` 才使用内置规则。若产品决定“删除后自动回默认”是预期行为，就把文档改成这个口径，不要让文档承诺报错而代码静默切换。
- **修复成本**：小。

### I3. 时间用例没有覆盖月末借位，且 `npm run verify` 根本不跑这些用例

- **位置**：`shared/src/date.cases.ts:23-26`（只有 `1-31→2-29`、`1-31→3-31`、`1-31→4-30`，没有 `1-31→3-01`）、`:41`（“未来日期不算旧”实际传的是过去日期 `2024-01-01` vs now `2024-12-31`，断言为 false 但没测到 future 分支）；`package.json:17`（`verify` 只有 check:docs + typecheck + build）。
- **问题**：19 条用例全部通过，但 B2 的负天数恰好落在未覆盖的“月末到下月月初”区间；`npx tsx shared/src/date.cases.ts` 是手工命令，CI/交付的 `npm run verify` 不会执行它。未来改动可以悄悄破坏时间算法而 verify 仍绿。
- **证据**：`npx tsx shared/src/date.cases.ts` 输出“19 组 + 3 组旧岗位边界”通过；`npm run verify` 输出只有 check:docs/typecheck/build；`date.cases.ts:41` 的用例名与输入不符。
- **期望结果**：把 B2 的边界用例补进去；把时间用例接入 `npm run verify`（至少加一个 `check:dates`）或纳入测试脚本；修正“未来日期”用例为 `2026-01-01` vs `2025-07-01` 之类。
- **修复成本**：小。

### I4. `assets` 的“兼职”仍被固定改写成一句分析；多个模块副标题仍是系统文案

- **位置**：`shared/src/doc.ts:341-347`（`practice.includes('兼职') ? '一段兼职（可写成沟通、执行、抗压）'`）、`:416`（assets 固定标题，虽然 AI 通常会覆盖）、`:939`、`:971`、`:791`（scorecard/assets/jobmap/checklist 的 subtitle 均不由 AI 写）、`shared/src/doc.ts:1164-1173`（assets 只覆盖 `item.text`，不覆盖 `item.name`）。
- **问题**：只要 Q9 选“兼职”，所有学生看到同一个“可写成沟通、执行、抗压”的解释；这不是 AI 分析，也不是答卷原文。模块副标题（如“0—10 分，按你的回答算出来，不是感觉”“只列答卷里已经有的，不凑数”）是固定的系统文案；如果按“报告全部内容 AI 分析”的严格口径，它们也属于未交给 AI 的内容。
- **证据**：`assetsBlock` 的 `name` 在此处被改写，`applySystemModules` 只回填 `item.text`；`scorecardBlock`/`jobMapBlock`/`checklistBlock` 的 `subtitle` 没有任何 AI 回填路径。
- **期望结果**：assets 的 `name` 保留问卷原始 label，解释由 AI 写；或把固定改写也交给 AI。副标题要么明确作为“系统说明”允许保留，要么纳入 AI 模块字段；先在文档里定口径，再决定改代码。
- **修复成本**：小到中（取决于是否把副标题全部 AI 化）。

### I5. `AI_BASE_URL` / `BOCHA_BASE_URL` 的旧默认被删除，现有部署可能直接失效

- **位置**：`server/src/env.ts:65-70`（`deepseekBaseUrl` / `bochaBaseUrl` 默认改为 `''`），对比父提交里原来的 `https://api.deepseek.com` / `https://api.bochaai.com/v1`。
- **问题**：这是有意的“不在代码里写死服务商地址”，但属于部署兼容性变更：现有生产 `.env` 如果只配了 `DEEPSEEK_API_KEY`/`BOCHA_API_KEY`（依赖旧默认 base URL），升级后 `isAiConfigured()`/博查配置会变成 false，报告直接失败。仓库 `.env.example` 已有 `AI_BASE_URL`/`BOCHA_BASE_URL`，但 systemd drop-in 是否同步无法从仓库证明。
- **证据**：`isAiConfigured()` 在 `server/src/ai/generate.ts:67-69` 要求 key 和 baseUrl 同时存在；`searchJobs` 在 `doc-generate.ts:389-405` 用 `Boolean(config.bochaApiKey && config.bochaBaseUrl)`；`env.ts` 两个 baseUrl 默认均为空。
- **期望结果**：保留旧默认作为兼容回退，或在启动时对“有 key 无 baseUrl”给出明确 warning/文档更新；部署说明和 `update.sh` 校验补上新变量。需要生产环境确认，当前审查不能判定“已兼容”。
- **修复成本**：小。

## 4. 建议（可选）

### S1. 归档文档的状态已过期

- **位置**：`docs/archive/报告生成-路线图月份误判-2026-11-12.md:62` 仍写“改动仍在本地工作区，未提交、未部署”。
- **问题**：该文档现在就在 `118fbc7` 提交里，`origin/main` 也已经是该提交；“未提交”是过期状态，会误导后续 Agent。
- **期望结果**：改为“已随 `118fbc7` 提交；未部署”，或标注“归档时状态”。
- **成本**：小。

### S2. PDF 依赖与产物可接受，但需要真机/慢网验证

- **位置**：`web/package.json:13`（新增 `jspdf ^4.2.1`）；`web/src/views/ReportView.vue:474`（动态 `import('jspdf')`）。
- **证据**：`npm run build` 生成 `jspdf.es.min-DxfaNQdf.js 390.79 kB │ gzip 128.83 kB`，是独立 chunk；`html2canvas` 另有 202.38 kB（gzip 48.04 kB）chunk。PDF 通过 `html-to-image` 截图为 PNG 再分页，正文是位图，链接不可点（文档已说明）。
- **判断**：为实现“直接下载 PDF、不走打印弹窗”，该依赖是合理的；动态 import 避免首屏加载。128.83 kB gzip 不算小，但可接受。建议在低端安卓/微信内测试长报告内存和生成时间；如果不可接受，再考虑服务端 PDF 或导出 HTML 的方案。
- **成本**：小（验证）到中（替换方案）。

### S3. 提示词里的“今天”使用 UTC 日期

- **位置**：`server/src/ai/doc-generate.ts:1086` `new Date().toISOString().slice(0, 10)`。
- **问题**：中国本地 00:00—07:59 时 UTC 仍是前一天；虽然只影响提示词里的“今天是”，不影响 `deadlineFact` 的本地日历计算，但可能让模型对“今天”的理解偏一天。
- **期望结果**：用本地日历格式（与 `date.ts` 的 `formatCalendarDate(new Date())` 一致），或明确传时区。
- **成本**：小。

## 5. 问卷内容零改动

### 结论

**是，零改动。** 第一波提交没有修改 `shared/src/survey.ts`；设计文档的改动全部落在 6.x“报告规则”，题目、选项、`showIf`/`disableIf`/`branches` 段落没有 hunk。

### 验证命令与结果

```bash
cd ~/LosAngelous/Vesta

git rev-parse 118fbc7^:shared/src/survey.ts
# 884486b746049ba1a71b96378fb93f899da83778

git rev-parse 118fbc7:shared/src/survey.ts
# 884486b746049ba1a71b96378fb93f899da83778

git hash-object shared/src/survey.ts
# 884486b746049ba1a71b96378fb93f899da83778

git diff --stat 118fbc7^ 118fbc7 -- shared/src/survey.ts
# （空）
```

三个哈希完全相等；`git diff --stat` 为空。

```bash
git diff --unified=0 118fbc7^ 118fbc7 -- 'docs/规划自测问卷-设计文档.md' | grep '^@@'
```

实际 hunk 头只出现在 `245`、`247`、`253`、`255`、`257`、`263`、`265`、`267`、`277`、`289`、`291`、`371` 附近，全部属于 6.1—6.6 报告规则；没有题目/选项/跳题段落。

`npm run check:docs` 通过“问卷 28 个题项都能在设计文档里找到”，但这是存在性检查，不能替代上面的哈希证据。

> 注意：审查过程中 A 的问卷页面 UI 改动会改 `Invite.vue`/`Quiz.vue`/`QuestionField.vue`/`styles.css`，但那是渲染层、未提交、且没有改 `shared/src/survey.ts`；本结论只针对 `118fbc7` 第一波提交。

## 6. 时间计算验算

### 6.1 `date.cases.ts` 的 19 条（全部通过）

命令：`npx tsx shared/src/date.cases.ts`  
结果：`时间距离用例通过：19 组 + 3 组旧岗位边界`

| # | 输入 | 期望 | 实际 | 结果 |
| --- | --- | --- | --- | --- |
| 1 | 2026-11-12 → 2026-11-12 | 今天 | 今天 | 通过 |
| 2 | 2026-11-12 → 2026-11-30 | 不到一个月 | 不到一个月 | 通过 |
| 3 | 2026-11-12 → 2027-02-12 | 3 个月 | 3 个月 | 通过 |
| 4 | 2025-12-31 → 2026-12-31 | 一年 | 一年 | 通过 |
| 5 | 2024-01-01 → 2025-01-01 | 一年 | 一年 | 通过 |
| 6 | 2026-11-12 → 2028-05-12 | 一年半 | 一年半 | 通过 |
| 7 | 2024-01-01 → 2026-01-01 | 两年 | 两年 | 通过 |
| 8 | 2026-11-12 → 2029-11-12 | 三年 | 三年 | 通过 |
| 9 | 2024-02-29 → 2025-02-28 | 11 个月 | 11 个月 | 通过 |
| 10 | 2024-02-29 → 2025-03-01 | 一年 | 一年 | 通过 |
| 11 | 2024-01-31 → 2024-02-29 | 不到一个月 | 不到一个月 | 通过 |
| 12 | 2024-01-31 → 2024-03-31 | 2 个月 | 2 个月 | 通过 |
| 13 | 2024-01-31 → 2024-04-30 | 2 个月 | 2 个月 | 通过 |
| 14 | 2024-11-30 → 2025-02-28 | 2 个月 | 2 个月 | 通过 |
| 15 | 2024-05-01 → 2025-05-01 | 一年 | 一年 | 通过 |
| 16 | 2026-11-12 → 2026-11-01 | 已过去 不到一个月 | 已过去 不到一个月 | 通过 |
| 17 | 2026-01-01 → 2025-10-01 | 已过去 3 个月 | 已过去 3 个月 | 通过 |
| 18 | 2026-05-01 → 2024-05-01 | 已过去 两年 | 已过去 两年 | 通过 |
| 19 | 2026-05-12 → 2024-11-12 | 已过去 一年半 | 已过去 一年半 | 通过 |

### 6.2 用例表未覆盖的月末/闰年边界（失败）

期望定义：先按日历加完整月，剩余天数应非负；例如 1 月 31 日加 1 个月是 2 月 29 日（2024），到 3 月 1 日还剩 1 天。

| 输入 | 期望（年/月/日） | 实际（年/月/日） | 结果 |
| --- | --- | --- | --- |
| 2024-01-31 → 2024-03-01 | 0/1/1 | 0/1/**-1** | 失败 |
| 2024-01-31 → 2024-03-02 | 0/1/2 | 0/1/0 | 失败 |
| 2024-01-31 → 2024-03-30 | 0/1/30 | 0/1/28 | 失败 |
| 2024-03-31 → 2024-05-01 | 0/1/1 | 0/1/0 | 失败 |
| 2024-03-31 → 2024-05-02 | 0/1/2 | 0/1/1 | 失败 |
| 2023-01-31 → 2023-03-01 | 0/1/1 | 0/1/**-2** | 失败 |

**验算结论**：`describeDistance()` 的粗粒度 19 条全部通过，但 `calendarSpan()` 的日粒度结果在月末借位场景不正确，且出现负天数；这不是“展示文案问题”，是底层日历差函数错误。B2 必须修，I3 必须补用例。

## 7. 其他验证与证据

### 7.1 `npm run verify`

命令（WSL，只读执行）：`npm run verify`  
退出码：`0`

- `check:docs`：通过（问卷题项与文档检查）
- `typecheck`：server/web 均通过
- `build`：Vite/Vue 生产构建通过，无错误

构建产物中新增的 PDF 相关 chunk：

```text
dist/assets/jspdf.es.min-*.js             390.79 kB │ gzip: 128.83 kB
dist/assets/html2canvas.esm-*.js          202.38 kB │ gzip:  48.04 kB
```

`jspdf` 是动态 import（`ReportView.vue:474`），不是首屏主包。

### 7.2 日期脚本

`npx tsx shared/src/date.cases.ts` 通过；但如 I3 所述，它不是 `npm run verify` 的一部分，且未覆盖 6.2 的边界。

### 7.3 安全与迁移

- 提交没有 `.env`、`data/`、`web/dist/`（`git show --stat 118fbc7 -- .env data web/dist` 为空；`.env` 被 `.gitignore:30` 忽略）。
- `ai_meta` 既有建表定义（`server/src/db.ts:76`）也有旧库 `ALTER TABLE` 迁移（`:200`），重复执行安全。
- 没有发现 `requireAdmin()` 被绕过、管理员认证被放宽的改动；`/admin/skill` 仍由 `requireAdmin()` 保护。
- 新增的 `POST /api/report/:slug/retry` 无登录校验，但 slug 是 `randomToken(20)`（`server/src/routes/public.ts:197`），并有每分钟 5 次限流；与公开报告链接同一信任模型。风险可接受，但“任何拿到链接的人都能触发一次 AI 重跑”应在运营口径里明确。
- 未实际执行数据库迁移、未连接生产库；迁移的“已有库可重复执行”只做了代码审查。

### 7.4 去硬编码/真实性检索

- 全仓搜索 `你现在能用的东西|不是不努力|547|24 个月|还有.*天`：没有发现这些旧文案出现在生成路径；`547 天`/`24 个月`只作为 Skill/约束里的反例存在。
- `shared/src/job-map.ts` 已删除固定 `what/entry/salary/fit`，只保留方向名、检索词和关键词；方向没有真实检索结果时 `jobMapBlock` 返回 null（`shared/src/doc.ts:785-786`）。
- `assets` 条目来自 Q9/Q10/Q15，且为空时整块不显示（`shared/src/doc.ts:377-421`），这一项比旧版有实质改善；但仍有 I4 的固定改写。
- 仍需修 B1 的 gap 硬编码、B3 的数字审计漏洞。

### 7.5 报告 UI（静态检查，不能代替走查）

- 桌面：`.wrap max-width: 880px`、`.sheet padding: 56px 60px 40px`、块间距约 64px（`ReportView.vue`/`ReportBlocks.vue` 新增 CSS）。
- 移动：`@media (max-width: 720px)` 单列、正文 15px、按钮/链接 `min-height: 44px`、gap-lines 改单列。
- 失败态：`ReportView.vue:37-54` 显示真实 `reportError`，仅 `retryable` 时给按钮。
- 但**没有**浏览器截图、没有 375/1440 对比、没有微信真机、没有 PDF 实际下载；不能判定“体面、宽松、手机/桌面都好”。这一项列为未验证，而不是通过。

### 7.6 文档一致性

- `docs/规划...:255` 与 B1 冲突：文档说“没有数据的行不补”，代码补了“城市判断”。
- `docs/README.md:143` / `docs/规划...:286` 与 I2 冲突：文档说“缺失/为空直接报错”，代码缺失时静默回 default。
- `docs/README.md:147` 说“未配置/失败显示真实原因，报告页提供重新生成”；失败页有，但 ready 报告的检索错误按钮无效（I1）。
- `docs/archive/报告...:62` 状态过期（S1）。
- `docs/development-history.md` 第一波段落与实现大方向一致，但“模板缺失直接抛错”和“全部 AI”需要按 B1/I2 修正后再宣称完成。

## 8. 未覆盖 / 不能判定

以下维度**没有验证，不能视为通过**：

1. **真实浏览器视觉**：未起 dev server、未用 Playwright/截图；桌面/移动端排版、间距、触控、深色/微信内浏览器均未验证。
2. **真实 PDF**：未在浏览器点“保存为 PDF”；A4 分页、图片清晰度、长报告内存、iOS 下载行为未验证。
3. **真实 AI 输出**：未调用 DeepSeek；模型是否遵守 Skill、`contentProblems`/`findTextIssues` 的实际修复率、失败重试行为未验证。
4. **真实博查**：未调用 Bocha；超时、429、部分失败、无 key/无 baseUrl 的实际 UI 行为只做了代码审查。
5. **数据库迁移**：未在已有 `data/` 副本上执行；`ai_meta` 旧库迁移未实测。
6. **旧报告兼容**：`readDocContent` 对旧 `content.sections`、旧 jobs、无 search 的报告未用真实历史数据验证。
7. **管理后台 SkillEditor**：默认只读、模板创建/删除/激活的交互未走查；I2 的“删除后回默认”只看了代码。
8. **依赖安全/许可**：未跑 `npm audit`，未核对 `jspdf` 及其传递依赖的许可证/漏洞。
9. **并发/限流**：retry 的 5 次/分钟、并发点击、AI 队列未压测。
10. **生产配置**：未访问生产，I5 的 systemd drop-in/env 是否存在无法确认。
11. **A 的未提交问卷 UI 改动**：`Invite.vue`/`Quiz.vue`/`QuestionField.vue`/`styles.css` 不在本提交，未审计。

## 9. 返工顺序与复审建议

1. 先修 B1（gap 去硬编码）和 B3（按 item 校验数字），这两项直接决定“报告是不是 AI 分析、分数是不是可信”。
2. 再修 B2（日历差借位）+ I3（补用例并接入 verify），把时间算法变成可回归的。
3. 修 I1（ready 报告的重试入口）和 I2（缺失 Skill 的行为），保证失败路径与文档一致。
4. I4/I5 按产品口径确认后处理；S1—S3 可随后。
5. 复审时至少重跑：`npm run verify`、`npx tsx shared/src/date.cases.ts`、新增的 gap/数字/重试用例，以及 375/1440 报告页手动走查；修完后本报告的 3 个阻断项应全部关闭，才建议进入第二波。
