# 报告模块第一波 Review 复审（2026-11-12）

> 审查方式：只读审查 + 运行校验命令；本次除新增本文档外未改代码、未提交、未部署、未调用真实 AI/博查。  
> 审查对象：当前未提交工作区，对照基线 `118fbc7` 与 `docs/archive/2026-11-12-report-wave1-review.md`（下称「原报告」）。  
> 范围：原报告的 3 个阻断、5 个重要、3 个建议，以及本轮改动本身引入的风险。

## 0. 审查对象

工作区改动共 `17 files changed, 332 insertions(+), 415 deletions(-)`：

- 报告正文：`shared/src/doc.ts`、`shared/src/types.ts`、`server/src/ai/doc-generate.ts`
- 时间计算：`shared/src/date.ts`、`shared/src/date.cases.ts`、`package.json`
- 规则来源与配置：`server/src/db.ts`、`server/src/index.ts`
- 报告 UI：`web/src/components/ReportBlocks.vue`、`web/src/views/ReportView.vue`
- 文档：`docs/README.md`、`docs/规划自测问卷-设计文档.md`、`docs/development-history.md`、`docs/archive/报告生成-路线图月份误判-2026-11-12.md`、`AGENTS.md`、`CLAUDE.md`
- 原 review 文档从 `docs/plans/` 归档到 `docs/archive/`。

## 1. 结论

**原报告的 3 个阻断项全部关闭；5 个重要项均已处理；S1/S3 已修，S2 维持原判断。**

仍有 **1 项重要残余**：`scorecard` 的模块 `summary`（页面上的「可提升空间」正文）没有走按 item 的分数审计，AI 仍可在那里写错分数。建议在进入第二波前修掉（改动很小）。另有 3 项建议级问题，不阻塞。

| 原编号 | 结论 | 说明 |
| --- | --- | --- |
| B1 gap 硬编码 | **已关闭** | `gapLines()` 只保留事实行；分析改为 AI `summary` / `paragraphs` 必填 |
| B2 日历借位 | **已关闭** | 改为「起点加完整月 + UTC 日差」，实测与用例一致，`days` 恒非负 |
| B3 数字审计 | **基本关闭，有残余** | item 文本已按项校验；`scorecard` 的 `summary` 仍未校验（见 R1） |
| I1 ready 报告重试 | **已关闭** | ready 时隐藏按钮并提示需新建报告；页面也会显示重试失败原因 |
| I2 缺失 Skill | **已关闭** | 不再静默回 default；缺失模板时 `getDocReportSkill()` 明确抛错 |
| I3 日期用例未进 verify | **已关闭** | 新增 9 组日粒度用例，`check:dates` 已接入 `npm run verify` |
| I4 固定文案 | **已关闭** | 删除「兼职 → 可写成沟通、执行、抗压」固定改写；副标题口径已写进设计文档 |
| I5 base URL 空默认 | **已处理** | 未恢复旧默认，但启动时 warning + 文档说明；部署侧仍需人工确认 |
| S1 归档状态过期 | **已修** | 改为「随 `118fbc7` 提交；截至归档时未部署」 |
| S2 PDF 依赖 | **维持** | 本轮未改；仍需真机验证 |
| S3 UTC「今天」 | **已修** | 改用 `formatCalendarDate(new Date())`，与本机日历一致 |

## 2. 逐项证据

### 2.1 B1：gap 已去硬编码

- `shared/src/doc.ts:830` `gapLines()` 现在只输出：第一选择、关键时间窗、目标城市、目标岗位、专业、简历里已有的项、期望薪资、经济约束、英语现状、每周英语投入；「入场线」「城市判断」「下一步」「门槛对照」等固定建议句已删除。
- `shared/src/doc.ts:888-896` gap 块新增 `paragraphs: []`；`server/src/ai/doc-generate.ts:700-713` 改为 `paragraphsRequired: true`，`data` 只给事实行和岗位；`shared/src/doc.ts:1136` 回填 AI `paragraphs`。
- `server/src/ai/doc-generate.ts:863` 的 `contentProblems()` 会直接报「缺少正文段落」，AI 不给分析就不能出报告；`outputContract()` 的 `:1094` 明确要求 gap 只能基于 `data.lines` 和 `jobs` 写，禁止再写固定建议句。
- UI：`web/src/components/ReportBlocks.vue:316-318` 渲染 `block.paragraphs`，桌面/移动 CSS 均已补。
- 设计文档 6.2 已同步为「事实行 + AI 写 summary/paragraphs」，与原报告引用的「没有数据的行不补」不再冲突。

**剩余口径**：gap 的 `subtitle`（`shared/src/doc.ts:892`）仍是程序固定文案。设计文档已明确「模块副标题和结构标签是系统说明，不属于 AI 正文」（`docs/规划自测问卷-设计文档.md` 6.2 末尾），因此这条按当前产品口径接受。

### 2.2 B2：`calendarSpan()` 已正确

新算法（`shared/src/date.ts:106-120`）：

1. 先用年月字段差算 `totalMonths`；
2. 用 `addCalendarMonthsClamped()` 从起点加完整月（月末截断）；
3. 用 UTC 日差算 `days`。

实测（`npx tsx` 只读探针）：

| 输入 | 实际结果 | 期望 | 结果 |
| --- | --- | --- | --- |
| 2024-01-31 → 2024-03-01 | 1 个月 1 天 | 1 个月 1 天 | 通过 |
| 2024-01-31 → 2024-03-02 | 1 个月 2 天 | 1 个月 2 天 | 通过 |
| 2024-01-31 → 2024-03-30 | 1 个月 30 天 | 1 个月 30 天 | 通过 |
| 2024-03-31 → 2024-05-01 | 1 个月 1 天 | 1 个月 1 天 | 通过 |
| 2024-03-31 → 2024-05-02 | 1 个月 2 天 | 1 个月 2 天 | 通过 |
| 2023-01-31 → 2023-03-01 | 1 个月 1 天 | 1 个月 1 天 | 通过 |
| 2024-01-31 → 2024-02-29 | 0 个月 29 天 | 不到一个月 | 通过 |

额外随机校验：30 万组含 29/30/31 日的日期对，`years/months/days/totalMonths` 均未出现负数，`days` 最大 30。

`describeDistance()` 仍只依赖 `totalMonths`，19 条粗粒度用例结果未变。

### 2.3 B3：item 级审计已生效，但 summary 是缺口

已生效的部分（`server/src/ai/doc-generate.ts:1032-1080`）：

- `contentTexts()` 给每个 item 文本带上 `moduleKey/itemKey`；
- 每个 `scorecard` item 建立自己的数字集合（`spec.data` + `item.data`）；
- item 文本里不属于该项的数字会报「不属于这一项的数字」；
- `N 分` 还会与该 item 的 `score` 比对，不一致直接触发重写，二次不过整份失败。

原报告举的「学校项 5.5 分，AI 在 text 里写 8 分」现在会在第一层 item 白名单就失败，不再依赖全报告白名单。

**但** `scorecard` 的 `summary` 没有 item 上下文，见 R1。

### 2.4 I1/I2/I3/I4/I5/S1/S3

- **I1**：`web/src/views/ReportView.vue:77` 传 `allow-retry="reportStatus !== 'ready'"`；`ReportBlocks.vue:207-217` 在 ready 时隐藏按钮并显示「报告已经生成；要重新检索需要新建一份报告」。`ReportView.vue:72` 在已有正文时也会显示 `reportError`，重试 409 不再静默。
- **I2**：`server/src/db.ts:838-848` 不再把找不到的 `activeId` 改写为 default；`getDocReportSkill()` 在 `:871-892` 保留「不存在 / 为空」两条明确抛错。后台删除当前模板仍显式回默认（`deleteReportSkillTemplate`），与 README / 设计文档新口径一致。
- **I3**：`shared/src/date.cases.ts:45` 新增 `CALENDAR_CASES`（9 组月末/闰日用例），`:143` 断言 `days >= 0` 与反向天数；`package.json:17-18` 新增 `check:dates` 并接入 `verify`。原来误标的「未来日期」用例已改为 `2026-01-01` vs `2025-07-01`。
- **I4**：`shared/src/doc.ts:339-352` 删除「兼职」固定解释，简历事实直接用问卷原标签；`assetsBlock()` 的 `name` 一直是原始 label，`applySystemModules` 只覆盖 `text`，符合原报告期望。副标题按文档口径保留为系统说明。
- **I5**：`server/src/index.ts:85-99` 在「有 key 无 baseUrl」时打印明确 warning；`docs/README.md` 的 `AI_BASE_URL` / `BOCHA_BASE_URL` 行已说明影响。代码默认值仍是空字符串，这是有意为之，但生产 `.env` / systemd 是否补齐仓库外无法确认。
- **S1**：归档文档状态已改为「随 `118fbc7` 提交；截至归档时未部署」。
- **S3**：`server/src/ai/doc-generate.ts:1155` 改用 `formatCalendarDate(new Date())`，与本机日历一致。

## 3. 残余与建议

### R1（重要）`scorecard` 的 `summary` 仍可写错分数

- **位置**：`server/src/ai/doc-generate.ts:906-940`（`contentTexts()` 只给 `title`/`summary` 带 `moduleKey`，不带 `itemKey`）、`:1032-1080`（`scoreItems` 只按 item 建）、`:1188-1196`（全报告白名单包含 `JSON.stringify(specs)` 的所有分数）；`shared/src/doc.ts:1100`（`block.potential.text = module.summary`）；`web/src/components/ReportBlocks.vue:302-305`（页面直接展示）。
- **问题**：`scorecard` 的 `summary` 会作为「可提升空间」正文展示，但它没有 item 作用域。假设学校项 5.5 分、其他项有 8 分，AI 在 summary 写「学校与专业 8 分」，`auditNumbers()` 的第一层全报告白名单会放行，第二层 `N 分` 校验因 `scoreItem` 为空而不执行。
- **期望结果**：把 `scorecard` 的 `summary` 也纳入分数校验——例如收集该模块所有合法分数集合，`N 分` 必须命中其中一个；或明确禁止 summary 里出现「N 分」，由模板/逐项文本展示分数。
- **成本**：小（`contentTexts()` 增加 `moduleKey==='scorecard' && !itemKey` 分支 + 一处判断）。

### R2（建议）ready + 未配置检索时出现两条矛盾提示

- **位置**：`web/src/components/ReportBlocks.vue:198-217`。当 `block.configured === false` 且报告已 ready 时，会同时显示「配置修复后可以重新生成」和「报告已经生成；要重新检索需要新建一份报告」。
- **期望结果**：ready 时把第一条改成「配置修复后，新建报告即可重新检索」，或只在可重试时显示「可以重新生成」。
- **成本**：小。

### R3（建议）item 数字集合混入了模块级计数，且可能误伤合法写法

- **位置**：`server/src/ai/doc-generate.ts:1043`，item 白名单 = `JSON.stringify(spec.data)` + `JSON.stringify(item.data)`；`spec.data` 含 `backgroundCount` / `personalCount`，`item.data` 含 `rule` / `benchmark`。
- **问题一**：模块计数（如 8）会和「分数」处在同一集合，`得分 8`、`8/10` 这类不带「分」的误写仍可能通过。
- **问题二**：合法但不在 item 数据里的写法（例如「CET-4」中的 4）会被判为「不属于这一项的数字」，触发不必要重写，极端情况下导致整份失败。
- **期望结果**：分数集合只放 `score` 与明确允许的量纲（0、10）；其余数字仍交给全报告白名单。若实测 AI 常写「CET-4」，把该 token 加进 item 白名单或允许的全局事实。
- **成本**：小。

### R4（建议）`check:dates` 依赖 hoist 的 `tsx`

- **位置**：`package.json:17` 直接调用 `tsx`，根 `devDependencies` 只有 `concurrently`；当前能跑是因为 `server/package.json` 把 `tsx` 放在 `dependencies`，npm 把它 hoist 到了根 `node_modules/.bin`。
- **风险**：如果以后把 `tsx` 改成 server 的 `devDependencies`，或在只装生产依赖的环境跑 `verify`，`check:dates` 会找不到命令。
- **期望结果**：根 `package.json` 显式声明 `tsx`（`devDependencies` 即可，因为 `verify` 本来就包含 `build`），或在脚本里写清依赖来源。
- **成本**：小。

## 4. 本轮验证

```text
npm run verify
→ check:docs 通过
→ check:dates 通过：19 组 + 9 组日历日粒度 + 3 组旧岗位边界
→ typecheck（server/web）通过
→ build 通过（jspdf / html2canvas 仍是独立 chunk）
```

- `git diff --check` 退出 0，无空白错误。
- 随机日历校验：30 万组含月末日期，未出现负年/月/日或负 `totalMonths`，`days` 最大 30。
- 未调用真实 DeepSeek / 博查；未启动浏览器；未执行数据库迁移。

## 5. 仍未验证（不能视为通过）

1. **真实 AI 输出**：gap 的 `paragraphs` 是否真的只写事实、不滑回「入场线/城市判断」；`paragraphsRequired` 和两次重写后的实际成功率；`scorecard` item 级审计的误报率（尤其 R3 的「CET-4」类写法）。
2. **真实浏览器**：新增 `.gap-analysis` 在 375 / 1440 的排版、长段落、PDF 分页；未走查。
3. **ready 报告的检索记录**：按钮已按代码隐藏，但没有在真实 ready 报告上点击验证「无 409」。
4. **真实博查失败路径**：未配置、超时、429、部分失败的实际 UI。
5. **生产配置**：I5 的 systemd drop-in / `.env` 是否已有 base URL，仓库内无法证明。
6. **旧报告兼容**：`paragraphs` 为可选字段，旧报告应正常渲染，但未用真实历史数据验证。
7. **后台 SkillEditor**：删除/新建/激活模板的交互未走查；只核对了 `db.ts` 分支。
8. **数据库迁移 / 并发限流 / 依赖安全**：与首轮相同，未执行。

## 6. 建议

1. 先修 **R1**（小改），让 `scorecard` 的 summary 也受分数审计约束，再进入第二波。
2. 顺手改 **R2** 的提示文案，避免 ready 报告给用户互相矛盾的两句话。
3. **R3/R4** 可随第二波一起处理；R3 建议先用真实 AI 输出观察误报再决定收紧程度。
4. 第二波开始前至少重跑：`npm run verify`、`npx tsx shared/src/date.cases.ts`，并在浏览器里走查一次 375/1440 的报告页（重点看 gap 新正文和检索记录）。
