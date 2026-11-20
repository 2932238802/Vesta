# Review Agent 复审报告 · CR-018 问卷分支题死路（G3 返工）

> 角色：Review Agent ｜ 门禁：G3 复审 ｜ 日期：2026-11-20 ｜ 结论：**通过**
> 评审范围：CR-018 / T-060 ~ T-064 返工（v2.03；工作区未提交，基线 `123bca1`）
> 由 Doc Agent 落盘；正文由 Review Agent 提供，未改动结论与证据。

<!-- report-meta
role: review
gate: G3
cr: CR-018
task: T-060 ~ T-064（返工）
status: 通过
action: 上一轮 2 P1 / 2 P2 全部闭环；AC-018-1~10 独立复跑通过，verify EXIT=0，补丁可支撑拆分与功能两次提交
commit: 工作区未提交（基线 123bca1）
auth_level: -
auth_action: -
auth_policy: -
auth_evidence: -
auth_scope: 随 CR 结束
auth_expires: 随 CR 结束
auth_key: -
-->

- 工作日志：未生成（项目无 WORKLOG 台账；本次评审未改任何文件、未提交、未推送、未写仓库 `data/`）
- 范围：CR-018 / T-060 ~ T-064 返工（v2.03）；工作区 14 个修改文件 + 5 个新增文件，基线 HEAD `123bca1`
- 评审类型：变更复审（G3 返工）
- 来源 CR：CR-018（已确认，G0/G1 于 2026-11-20）
- G1 / DoR：通过（项目无独立 `04-tasks.md`，任务定义在归档开发文档 §四）
- 关联需求：R-018-1 ~ R-018-9（R-018-8 已按 G3 后确认改写）
- AC 清单：AC-018-1 ~ AC-018-10（10 条）
- 结论：**通过**
- 一句话理由：上一轮 2 条 P1（递归环、事故数据）与 2 条 P2（标签口径、拆分不可执行）均以可复现证据闭环；10 条 AC 全部独立复跑通过；`npm run verify` EXIT=0；两补丁在全新 HEAD worktree 顺序 apply 通过，split-only 中间态 `verify` 与行为等价性均成立。

## 评审基线

- 评审口径：`docs/archive/20261120/1-…需求卡.md`、`2-…开发文档.md`（R-018-1~9、AC-018-1~10、T-060~T-064）、`docs/reference/规划自测问卷-设计文档.md` §五/§八/§九。
- 影响面与回归：问卷作答页、提交接口、报告 `q16_info`、后台发布/编辑、共享层解析、文件规模、版本同步、事故数据。
- 必须满足的契约：`Survey` / `Question` / `Answers` 类型与 `POST /api/invite/:token/submit` 结构不变；默认 7 分支渲染与评分口径不变；无新表/迁移/依赖。
- 明确不在范围：生产自定义问卷旧题号重排、后台可视化编辑 `branches`、真实 iPhone/微信复测、AI 报告正文生成（评审环境 AI 关闭）。

## 与上一轮 P1/P2 的逐条闭环判定

| 上一轮项 | 判定 | 本轮证据 |
|---|---|---|
| P1-1 分支自引用/互引导致 `resolveQuestion` 无限递归 | **已闭环** | `question.ts:61-70` 新增非递归 `questionState()`；`resolveQuestion:101-106` 只算来源题可见/置灰，不再解析其 `branches`；`validate.ts:69-102` 新增 `branchCycleErrors()` 并在 `:181` 汇总。独立复现：PUT 自引用 → 400（文案含「信息差」「指向自己」）；PUT 互引 → 400（含「循环」+ 两题标题）；直接写库后自引用/互引邀请页均正常渲染、提交 200、报告 200，服务端无 `RangeError` |
| P1-2 `events` / `event_facts` 事故残留污染漏斗 | **已闭环** | 只读核对仓库 `data/vesta.db`：invites 7 / submissions 6 / events 181 / event_facts 12；`%CR018%` 邀请与关联提交/事件/漏斗事实均 0；`event_facts` 无 `group` 行；今日 events 0、今日 `admin_sessions` 0；问卷仍 `survey-main` v3、`active_survey=survey-main` |
| P2-1 `q16_info` 标签口径与 R-018-8 冲突 | **已闭环** | R-018-8 已改写、新增 AC-018-10；独立 113 项断言：7×4 组合的 `label()` 与页面实际渲染文案逐条相等，评分索引恒为 `q16_N → INFO[N-1]`（8/6/4/2）；设计文档 §八示例已订正为 `q6_first_choice=考研` / `q16_info=查过一部分` |
| P2-2 拆分 commit 无法按清单直接执行 | **已闭环** | `/tmp/cr018-split.patch` → `/tmp/cr018-feature.patch` 在全新 HEAD worktree 顺序 `git apply --check` 均通过（`SPLIT_CHECK_OK` / `FEATURE_CHECK_OK`）；split-only 单独 `npm run verify` EXIT=0（292 文件，2.2.0 ↔ v2.02）；HEAD 与 split 的行为输出 JSON 逐字节相同（3679 字节，含 `serializeDoc`、评分、可见题、7 分支标签）；split 仍保留旧语义（`q6_3/q16_2` 标签为「知道一两项」、来源缺失仍 0 选项），证明拆分未夹带功能 |
| P3 `disableIf` 未纳入来源可用性/回跳 | **已处理** | `questionState()` 计入 `disabled`；`useBranchRecovery.ts:38` 增加 `resolved.disabled`。浏览器构造 `q6.disableIf` 问卷：Q19 走通用兜底、不回跳、无提示（6/6 断言） |
| P3 回跳返回 Q19 立即自动前进 | **已处理** | `useBranchRecovery.ts:78` `onReturn` + `Quiz.vue:148` 一次性 `suppressAuto`。三种失效值补答后均停留 Q19 900ms 未前进（AC-018-3 9/9） |
| P3 兜底标记/覆盖警告未过滤隐藏题 | **已处理** | `validate.ts:30-38` 按 `resolved.visible` 过滤；`branchCoverageWarnings:50,56` 跳过隐藏分支题/来源题。独立断言：隐藏分支题不计入 `fallbackQuestions`，隐藏来源题不产生警告 |
| P3 `fallbackQuestions` 空数组也写日志 | **已处理** | `public.ts:261` 仅非空时展开字段。服务端日志：正常全流程提交无该字段；兜底提交为 `fallbackQuestions=["q16"]` |
| P3 import 循环重构 | 按约束未做 | 不阻塞；见残留风险 |

## AC 判定

| AC | 判定 | 证据 |
|---|---|---|
| AC-018-1 | 满足 | Playwright 7 个 `q6` 选项逐条进入 Q19：题面与 4 个选项文案均与 `survey.ts` 分支一致（14/14）；共享层 `check:question` 同口径断言通过 |
| AC-018-2 | 满足 | 空 `q6` + `step=Q19` 打开：自动落在「毕业后的第一选择」，显示「先完成这一题」，7 个选项；点「就业」后回到就业分支 Q19、提示消失（6/6） |
| AC-018-3 | 满足 | 数组 `["q6_3"]`、已删选项 `q6_9`、数字 `3`：均回跳并清空失效值（localStorage `answers.q6 === null`），补答后回到 Q19 且不被自动前进带走（9/9） |
| AC-018-4 | 满足 | 删除来源题 / 隐藏来源 / 来源改多选 / 新增无映射选项四种问卷：Q19 均为通用题面 + 都清楚/知道一些/只听过/完全不了解，且不回跳、无提示（12/12） |
| AC-018-5 | 满足 | 自引用直接写库与删除来源题两种兜底答卷 `POST submit` 均 200；删除来源 + `q16_2` 的 `serializeDoc().q16_info === "知道一些"`；报告入口 200；日志 `fallbackQuestions=["q16"]`；共享层覆盖 4 个兜底标签 |
| AC-018-6 | 满足 | PUT 来源改多选 → 400 且同时含「信息差」「毕业后的第一选择」；PUT 新增无映射选项 → 200；后台 UI 保存 toast 实测「已发布 vN；题目「信息差」有 1 个选项没有专属题面，会显示通用题面」 |
| AC-018-7 | 满足 | 后台选中「毕业后的第一选择」出现 `.branch-dep`，文本含「信息差」「q16」，不含任何 `Q\d`；选「信息差」自身无该提示（4/4） |
| AC-018-8 | 满足 | `npm run verify` EXIT=0；Playwright 全流程按序作答并提交跳 `/r/...`，访问 27 个题项（Q23 因 Q21=① 按设计隐藏）；390px 作答页 `scrollWidth <= clientWidth`；条件题 8 项独立断言通过（Q20 闸门、Q21→Q23、Q22→Q24、三路径并集 28 题） |
| AC-018-9 | 满足 | 必答空答点「下一题」停留并显示「这一题还没完成」；回跳到来源题后直接点「下一题」仍被拦截；API 空答案 400 且 `missing` 含 `q6`；`canAdvance()` 未放宽（5/5） |
| AC-018-10 | 满足 | 独立 113 项断言：7×4 组合 `label == 实际渲染文案`、评分索引 `N-1`、`serializeDoc.q16_info == 渲染文案`、`computeDocScores` 信息差得分恒为 8/6/4/2；与 `check:question` 结果一致 |

## 验证执行

- 工作区镜像（排除 `data/`）`npm run verify` → **EXIT=0**：`✓ 问卷 28 个题项都能在设计文档里找到`；`文件规模检查通过：293 个文件，10 条基线。`；`✓ 版本一致：package.json=2.3.0 ↔ docs/reference/README.md 最高 v2.03`；`✓ 依赖不变量通过`；`check:question → 162 passed, 0 failed`；`✓ built in 4.34s`。镜像与主工作区代码文件逐字节一致。
- split-only worktree：`npm run verify` → **EXIT=0**：292 文件、2.2.0 ↔ v2.02、`built`；split 共享层 smoke 25/25（7 分支、旧标签语义、旧死路行为保留、28 题可达）；split HTTP 全流程 6/6（health / dev-login / 邀请 / 全流程提交 / 报告）。
- Playwright（隔离 server `PORT=8897` + `/tmp` 临时 `DATA_DIR`，390×844，自起自停，未使用 8788/5173）：
  - `e2e.mts` → **53 passed, 0 failed**：R1 直接写库页面渲染、AC-018-1/2/3/4/8/9。
  - `admin-ui.mts` → **8 passed, 0 failed**：AC-018-6 toast、AC-018-7 依赖提示。
- API/共享层（隔离端口与临时库）：
  - R1 PUT 自引用/互引/多选来源 → 400；无映射选项 → 200（8/8）。
  - 直接写库自引用：邀请 200、页面渲染、提交 200、报告 200（6/6）；互引直接写库：解析不抛错、页面渲染、提交 200（4/4）。
  - AC-018-5 / AC-018-6 / AC-018-9 API 断言 17/17。
  - AC-018-10 独立 113/113；条件题可见性 8/8；P3 6/6。
  - 说明：一轮 API 脚本因测试脚本自身写到了非 `active_survey` 行出现 1 条假失败，修正为按 active id 写入后 6/6 通过；不是代码缺陷。
- 回归测试：

| 受影响区域 | 执行的测试 / 验证 | 结果 |
|---|---|---|
| 默认 Q19 7 分支 | 共享层 + 浏览器逐项 | 通过 |
| 空/失效 `q6` | 浏览器空值 + 3 类失效值 | 通过 |
| 兜底 4 类问卷 | 浏览器渲染 + API 提交 | 通过 |
| 提交接口 | 正常/兜底/缺必答 400 | 通过 |
| 报告入口 | 正常/兜底提交后 `GET /api/report/:slug` | 200（AI 未配置，失败态符合预期） |
| 后台发布/编辑 | 400、200、toast、依赖提示 | 通过 |
| 条件显示逻辑 | 8 组 `visibleQuestions` 断言 | 通过 |
| 文件规模 | `check:size` | 通过，基线只降 |
| 版本/文档 | `check:version` / `check:docs` | 通过 |
| 拆分等价性 | HEAD 与 split 行为 JSON 对比 | 逐字节相同 |

- 无法执行的验证：真实 iPhone Safari / 微信内置浏览器（仅 Chromium 390px 模拟）；AI 报告正文（AI 关闭，只验证 `q16_info` 与接口可启动）。

## 影响面覆盖

| 影响维度 | 是否覆盖 | 证据 / 缺口 |
|---|---|---|
| 模块 / 接口 | 是 | `shared/question.ts`、`shared/validate.ts`、`server/public.ts`、`Quiz.vue`、后台编辑均实跑；接口协议未变 |
| 数据 / 配置 | 是 | 临时 `DATA_DIR` 内构造 5 类问卷并恢复；仓库 `data/` 只读复核，CR018 残留 0 |
| 测试 / 回归 | 是 | 新增 `check:question` 162 项进入 verify；默认分支、回跳、兜底、提交、后台、390px、拆分等价性全覆盖 |
| 文档 | 基本同步 | 设计文档 §五/§八/§九、development-history、README、归档索引已更新；见 P3 文档滞后项 |
| 兼容 / 迁移 / 回滚 | 是 | 无表结构/迁移；存量坏问卷四类均可用；回滚 `git revert` + `update.sh`，兜底仍用原 `q16_*` id |
| 用户注释保护 | 是 | diff 中 `LosAngelous:` / `LOS:` 注释 0 处被修改/删除/重排 |
| 禁止文件 | 是 | diff 无 `.env` / `data/` / `zxg/` / `web/dist`；无新增依赖（`package.json` 仅版本 + script） |

## NFR 检查

| 项 | 目标 | 结果 |
|---|---|---|
| 改动面 | 不动接口协议与表结构 | 通过（仅日志字段按非空输出） |
| 默认行为 | 7 分支渲染与评分口径不变 | 通过；`q16_info` 标签按 AC-018-10 新口径变更，已获确认 |
| 兜底可识别 | 从提交数据或日志能看出 | 通过（仅兜底时 `fallbackQuestions=["q16"]`，只含题目 id） |
| 存量自定义问卷 | 不靠重发默认问卷 | 通过（删除/隐藏/多选/无映射四类均可用） |
| 手机 390px | 无横向滚动 | 通过（作答页与报告跳转后均 390/390） |
| 安全 / 日志 | 不泄露答案、密钥 | 通过：`submit.stored` 只含 id/计数；日志搜索无测试答案文本；`requireAdmin()` 未改 |
| 资源 / 并发 | 无明显低效、无递归风险 | 通过：解析为常数级、无递归；环检测仅 28 题、O(n²) 可忽略 |

## 维度结论

| 维度 | 结论 | 说明 |
|---|---|---|
| 1 需求覆盖 | 满足 | AC-018-1~10 全部有独立证据 |
| 2 正确性 | 未发现问题 | 自引用/互引不再递归；兜底单点实现，前后端一致 |
| 3 边界与错误处理 | 未发现问题 | 空值、数组、非字符串、已删选项、无映射、隐藏、置灰均覆盖 |
| 4 安全 | 未发现问题 | 管理鉴权未改、无注入面、日志无敏感内容 |
| 5 性能与资源 | 未发现问题 | 纯函数常数级；`check:question` 无网络/DB 依赖 |
| 6 并发与一致性 | 未发现问题 | 回跳状态为页面内单实例；`suppressAuto` 一次性消费 |
| 7 可维护性 | 良好 | 新文件 169/260/85/122/139 行，职责清晰；import 循环未重构（P3） |
| 8 测试有效性 | 良好 | 新增可重复用例并接入 verify；本轮又用独立脚本复跑，未采信 Dev 自述 |
| 9 文档一致性 | 基本良好 | 设计文档与实现一致；存在 P3 状态/范围表述滞后 |
| 10 范围与风险 | 未越界 | 无无关改动、无调试残留、无依赖变更 |
| 11 用户注释保护 | 未发现问题 | 0 处被修改 |
| 12 回归与影响面 | 已覆盖 | 见验证与回归表 |
| 13 AC ↔ 验证追溯 | 已覆盖 | 每条 AC 有独立命令与断言 |
| 14 NFR 目标 | 达标 | 见 NFR 表 |

## 缺陷清单（按严重度降序）

无 P0 / P1 / P2。

### [P3] 文档状态与 AC 范围表述滞后

- 位置：`docs/reference/development-history.md:11`、`docs/archive/20261120/2-问卷分支题死路-开发文档.md:3,123`、`docs/reference/README.md:1,66`
- 问题：development-history 仍写「AC-018-1~9」，但实际已有 AC-018-10；开发文档状态仍写「已实施（v2.03，待 G3 评审）」/「待 G3」，未体现返工复审；README 头部仍写「v2.03 开发中」，版本表 commit 列待回填。
- 触发条件：读者/Meta 依文档判断评审范围或交付状态时。
- 影响：可能误以为只验收到 AC-018-9，或误判仍处首轮 G3；不影响代码与运行。
- 证据：上述行号原文。
- 建议：Doc 在落盘本报告时一并改为「AC-018-1~10」「返工完成待 G3 复审」；提交后回填 README commit。
- 置信度：高。

### [P3] `submit.stored` 对 `fallbackQuestions` 重复计算

- 位置：`server/src/routes/public.ts:257,261`
- 问题：同一字段在条件与值里各调用一次 `fallbackQuestions(survey, answers)`，每次提交多遍历一遍问卷；同时 `reqId: ... , inviteId: ...` 挤在一行，与周围格式不一致。
- 触发条件：每次答卷提交。
- 影响：28 题规模下开销可忽略；仅可维护性/一致性。
- 证据：代码行；日志字段行为正确。
- 建议：先 `const fallback = fallbackQuestions(survey, answers)`，非空再展开，并恢复多行格式。
- 置信度：高。

### [P3] split/feature 补丁不含快照之后的最终文档状态

- 位置：`/tmp/cr018-split.patch`、`/tmp/cr018-feature.patch`
- 问题：两补丁可精确复现全部代码（14 修改 + 5 新增逐字节一致），但 `docs/STATUS.md` 与 `docs/archive/20261120/README.md` 的最终「复审中」状态、以及返工报告本身产生于补丁快照之后，不在补丁内。
- 触发条件：直接按补丁提交两个 commit，却希望工作区完全还原。
- 影响：代码与验收不受影响；提交时需额外把这两处文档与返工报告纳入功能/文档 commit。
- 证据：补丁应用后与工作区对比，仅上述 2 个文档不同；代码全部 `SAME`。
- 建议：提交功能 commit 时一并带上 `docs/STATUS.md`、归档 README 与返工报告。
- 置信度：高。

### [P3] 来源题为「可见、必答、单选但 0 选项」的畸形库数据仍可能回跳到死路

- 位置：`shared/src/question.ts:102-106`、`web/src/composables/useBranchRecovery.ts:36-50`
- 问题：来源可用性只看存在/可见/未置灰/单选，不检查其选项是否非空；若有人绕过发布校验直接写库把 `q6` 选项清空，Q19 会回跳到没有选项的来源题，形成新的死路。
- 触发条件：直接改库/畸形 API 数据，且来源题 required 且无答案。
- 影响：正常发布路径 `validateSurvey` 会拒绝少于 2 个选项，当前不可达；属纵深防御缺口。
- 证据：静态分析；未构造该畸形数据（避免超出本轮范围）。
- 建议：`sourceUsable` / `check()` 增加 `resolved.options.length > 0`（至少 2 个）条件，否则直接兜底。
- 置信度：中。

### [P3] `branchCoverageWarnings` 用空答案判断可见性

- 位置：`shared/src/validate.ts:45-60`
- 问题：保存时没有答卷，用 `{}` 解析 `showIf`；对「只有答了某题才显示」的分支题/来源题，可能漏掉或多出提示。
- 触发条件：自定义问卷含依赖答案的条件显示。
- 影响：仅影响保存后的非阻断提示文案，不影响发布与作答。
- 证据：代码与 Dev 报告的 `[假设]` 记录；默认问卷无影响。
- 建议：在文档中明确该提示是「静态可见性」口径，或改为按来源题是否隐藏分别提示。
- 置信度：高。

## 已检查且未发现问题的区域

- 空值/缺失/空数组/缺字段：`isEmptyValue`、`validateAnswers`、回跳判定均正确。
- 错误路径：提交 400 带 `missing`；409 已有提交仍走原处理；报告 AI 未配置时 200 + failed。
- 权限：`requireAdmin()`、dev-login 未改；未发现越权读写。
- 注入/SSRF：新增代码只处理问卷 JSON 与日志字段，无 SQL/命令拼接、无外呼。
- 敏感信息：`submit.stored` 无答卷、联系方式或密钥；日志搜索无答案文本。
- 资源：新文件均 ≤400 行；无递归、无无界内存/连接泄漏。
- 兼容性：`Survey` 数据未改；旧答卷可读取；`q16_*` 选项 id 不变。
- 文件规模：`doc.ts` 1270（基线 1270）、`Quiz.vue` 722（基线 722）、`question.ts` 169、`question.cases.ts` 260、`useBranchRecovery.ts` 85、`useQuizDraft.ts` 122、`useQuizViewport.ts` 139；基线只降不升。
- 禁止项：无 `.env` / `data/` / `zxg/` / `web/dist` 改动；无新增依赖/接口/表/迁移；既有 `scripts/check-*.mjs` 判定未改。
- 用户注释保护：改动文件中 0 处 `LosAngelous:` / `LOS:` 注释被修改/删除/重排。

## data/ 只读复核

- 方式：`node:sqlite` 以 `readOnly: true` 打开仓库 `/home/losangelous/LosAngelous/Vesta/data/vesta.db`，仅执行 SELECT；所有写入均在 `/tmp` 临时 `DATA_DIR`。
- 结果：`invites 7 / submissions 6 / events 181 / event_facts 12`；`%CR018%` 邀请 0、关联提交 0、事件 0、漏斗事实 0；`event_facts` 的 `group` 行 0；今日 events 0、今日 `admin_sessions` 0；`surveys` 仅 `survey-main` v3，`active_survey=survey-main`，`q6` 单选必答 7 选项、`q16` 7 个映射各 4 选项。
- 说明：评审期间 `vesta.db-wal/-shm` 的 mtime 有变化，来自用户已在运行的 dev server；评审侧未执行任何写语句。

## 补丁 apply 复核

- 基线：全新 `git worktree`，HEAD `123bca1`。
- `git apply --check /tmp/cr018-split.patch` → `SPLIT_CHECK_OK`；应用后 `git apply --check /tmp/cr018-feature.patch` → `FEATURE_CHECK_OK`；顺序实际应用成功。
- 应用后与主工作区对比：14 个修改文件 + 5 个新增代码文件全部逐字节一致；仅 `docs/STATUS.md` 与 `docs/archive/20261120/README.md` 为快照后的状态更新（见 P3）。
- split-only 中间态：`npm run verify` EXIT=0；HEAD 与 split 的 `serializeDoc` / 评分 / 可见题 / 7 分支标签输出 JSON 逐字节相同。

## 文档同步检查

- 归档开发文档状态：基本正确，但「待 G3」未体现返工复审（P3）。
- 设计文档 §五/§八/§九：与实现一致；§八示例已订正为同分支的「考研 / 查过一部分」。
- `development-history.md`：v2.03 与返工小节完整；AC 范围仍写 1~9（P3）。
- `docs/reference/README.md`：已完成行与版本表已加 v2.03；commit 列「工作区未提交」待提交后回填（P3）。
- `docs/STATUS.md` / 归档索引：已更新为「G3 复审中」。
- `CHANGELOG.md`：项目不存在该文件，以 development-history 为变更入口（符合本仓库惯例）。

## 用户注释保护检查

- 扫描到 `LosAngelous:` / `LOS:` 注释：0 处（改动文件中）
- 被修改/删除/重排：0 处

## 残留风险

- 仅 Chromium 390px 模拟，未在真实 iPhone Safari / 微信内置浏览器复测；交互细节（提示位置、键盘）未验。
- AI 报告正文未生成，`q16_info` 只验证结构值与标签；报告实际措辞是否因标签变化而显著不同未评估。
- 生产自定义问卷仍是旧题号；兜底与提示均按题目文字/id 处理，生产问卷若 `q16` id 不同，需现场确认同一 `resolveQuestion` 仍能提交。
- 来源题 0 选项的畸形库数据仍可能形成回跳死路（P3-4）。
- 新增用例已进入 verify，但真实浏览器交互仍依赖临时 Playwright 脚本，不随仓库保留。

## 建议（非阻塞）

- [P3] Doc 落盘本报告时同步修正 AC 范围与「返工复审」状态，提交后回填 README commit。
- [P3] `public.ts` 只计算一次 `fallbackQuestions`。
- [P3] 提交功能 commit 时纳入 `docs/STATUS.md`、归档 README 与返工报告。
- [P3] 后续可考虑在 `sourceUsable` / 回跳判定中要求来源题至少 2 个选项。

## 授权记录

- 批准的 AUTH：无（本次仅只读评审；未提交、未推送、未改 `data/`）
- 拒绝或升级的请求：无
- 本轮 G3 结论接受：未接受（Review 不得自批；由 Steward/用户记账）

## 上下文增量

- 评审范围：CR-018 / T-060 ~ T-064 返工（工作区）。
- 发现的过期信息：development-history 的 AC 范围仍为 1~9；开发文档状态仍写「待 G3」；README 头部仍写「v2.03 开发中」；README commit 列待回填。
- review-index 更新：否（项目无 `PROJECT_BRAIN.md` / `docs/reports/review-index.md`，且本次不写工作区）。

## 是否可进入提交与 G4

- **可以进入提交。** 建议两次提交：
  1. 拆分 commit：按 `/tmp/cr018-split.patch`（`doc.ts` / `Quiz.vue` 拆分 + 两个 composable + `question.ts` 旧语义 + 基线下调），该中间态已独立 `verify` EXIT=0 且与 HEAD 行为逐字节等价。
  2. 功能 commit：按 `/tmp/cr018-feature.patch` 加最终文档状态（`docs/STATUS.md`、归档 README、返工报告、README commit 回填）。
- **可以进入 G4。** G3 结论为「通过」（无 P0/P1/P2；5 项 P3），建议 Meta Agent 按 G4 口径复核：两次提交边界、文档回填、`npm run verify` 与隔离端口复跑。

## 下一步交接

- 结论：通过 → **Meta Agent**（G3 已通过，进入 G4 总审）
- 依据：AC-018-1~10 全部满足；上一轮 2 P1 / 2 P2 全闭环；`npm run verify` EXIT=0；两补丁顺序 apply 通过且 split 行为等价。
- 携带材料：本报告；`docs/reports/dev-agent-2026-11-20-问卷分支题死路-返工.md`；上一轮 `docs/reports/review-agent-2026-11-20-问卷分支题死路.md`；基线 commit `123bca1`；补丁 `/tmp/cr018-split.patch`、`/tmp/cr018-feature.patch`；验证日志 `/tmp/review-cr018/verify.log`、`split-verify.log`、`full-server.log`、`split-server.log`；`/tmp/review-cr018/` 下独立复跑脚本。
- 给 Meta 的 Prompt：

  【项目路径】/home/losangelous/LosAngelous/Vesta
  【本次范围】CR-018 / T-060 ~ T-064 G3 返工复审（工作区未提交；基线 `123bca1`）
  【已有材料】本报告（Doc 落盘为 `docs/reports/review-agent-2026-11-20-问卷分支题死路-复审.md`）、返工报告、上一轮 G3 报告、`/tmp/cr018-split.patch`、`/tmp/cr018-feature.patch`、`/tmp/review-cr018/` 验证日志与脚本
  【文档位置】`docs/archive/20261120/1-问卷分支题死路-需求卡.md`、`docs/archive/20261120/2-问卷分支题死路-开发文档.md`、`docs/reference/规划自测问卷-设计文档.md` §五/§八/§九
  【G3 结论】通过（无 P0/P1/P2；5 项 P3）
  【G4 重点】① 按 split → feature 两次提交，确认拆分 commit 行为不变、功能 commit 含最终文档；② 提交后回填 `docs/reference/README.md` v2.03 commit 列并修正 AC 范围/「返工复审」状态；③ 复核无新增依赖/接口/表/迁移；④ 确认 `data/` 未被提交、无 `.env`。
