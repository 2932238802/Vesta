# Review Agent 评审报告 · CR-018 问卷分支题死路

> 角色：Review Agent ｜ 门禁：G3 ｜ 日期：2026-11-20 ｜ 结论：**不通过**
> 评审范围：CR-018 / T-060 ~ T-064（工作区未提交，产品版本 v2.03）
> 由 Doc Agent 落盘；正文由 Review Agent 提供，未改动结论与证据。

<!-- report-meta
role: review
gate: G3
cr: CR-018
task: T-060 ~ T-064
status: 不通过
action: 分支自引用可导致 resolveQuestion 无限递归使整份问卷不可用；事故数据残留未清且后台漏斗被污染
commit: 工作区未提交（基线为工作区）
auth_level: -
auth_action: -
auth_policy: -
auth_evidence: -
auth_scope: 随 CR 结束
auth_expires: 随 CR 结束
auth_key: -
-->

- 工作日志：未生成（项目无 WORKLOG 台账；本次评审未改任何文件）
- 范围：CR-018 / T-060~T-064，工作区 14 个修改文件 + 5 个新增文件（`git diff --stat` + `git status --porcelain`）
- 评审类型：首次评审（G3）
- 来源 CR：CR-018（已确认，G0/G1 于 2026-11-20）
- G1 / DoR：通过（G1 五项确认见开发文档 §九；项目无独立 `04-tasks.md`，任务定义在归档开发文档 §四）
- 关联需求：R-018-1 ~ R-018-9
- AC 清单：AC-018-1 ~ AC-018-9（9 条）
- 影响面与回归范围：问卷作答页、提交接口、报告 `q16_info`、后台问卷发布/编辑、文件规模、版本三处同步、事故数据
- 必须满足的契约：`Survey` / `Question` / `Answers` 类型不变；`POST /api/invite/:token/submit` 结构不变；默认问卷 7 套分支文案与评分口径不变；无新表/迁移/依赖
- 明确不在范围：生产自定义问卷的旧题号重排与线上数据修复（方案 C）、后台可视化编辑 `branches`、真实 iPhone/微信复测、AI 报告正文生成（评审环境未配置 AI）
- 阅读预算：M（约 20 个文件/文档），符合上限

## 结论

**不通过。** 9 条 AC 在正常情况下全部满足，`npm run verify` EXIT=0，默认 7 分支、回跳补答、四种兜底、后台保护和 390px 均独立复现通过；但存在两条 P1：① 新增的“来源题可用性”递归没有环检测，后台 API 可保存自引用 `branches` 的问卷，之后整份问卷渲染空白、提交 500，重新制造同类死路；② 事故清理只删了 `invites`/`submissions`，`events` 与 `event_facts` 残留已污染后台漏斗，且 Dev 报告“不影响业务数据”的结论不成立。另有 2 条 P2（`q16_info` 标签口径与 R-018-8 冲突、拆分 commit 清单不可直接执行）。

## AC 判定

| AC | 判定 | 证据 |
|---|---|---|
| AC-018-1 | 通过 | 共享层 21 项断言（7 分支 × title/options/no-fallback）全 PASS；浏览器 14 项断言：7 个 `q6` 选项逐一进入 Q19，题面与 4 个选项文案逐条一致（`/tmp/cr018-review/e2e.mjs`，32/32） |
| AC-018-2 | 通过 | 空 `q6` 草稿 + step=18 打开：自动落在 `q-q6`，显示「先完成这一题」，7 个选项；点「就业」后 900ms 内回到 `q-q16`，题面为就业分支，提示消失（6/6 断言） |
| AC-018-3 | 通过 | 数组 `["q6_3"]`、已删除选项 `q6_9`、数字 `3` 三种失效值：均回跳、显示提示；900ms 后 localStorage 草稿 `answers.q6 === null`，失效值不残留；补答后回 Q19 对应分支（9/9 断言） |
| AC-018-4 | 通过 | 4 种存量坏数据（删来源题 / 隐藏来源 / 来源改多选 / 合法但无映射选项）：Q19 均为「你对目标方向的门槛、时间节点了解多少？」+ 都清楚/知道一些/只听过/完全不了解，且不出现回跳提示（16/16 断言） |
| AC-018-5 | 通过（附注） | 4 种兜底问卷 `POST /api/invite/:token/submit` 均 200；`serializeDoc().q16_info` 分别为 都清楚/知道一些/只听过/完全不了解；`GET /api/report/:slug` 200（AI 未配置，status=failed）；日志 `fallbackQuestions=["q16"]`。附注：字段在正常提交时也存在，只是空数组 `[]`（见 P3-1） |
| AC-018-6 | 通过 | `PUT /api/admin/survey` 把来源题改多选 → 400，文案同时含「信息差」「毕业后的第一选择」，且活动问卷 version 未变；新增无映射选项 → 200；后台 UI 保存 toast 实测「已发布 v6；题目「信息差」有 1 个选项没有专属题面，会显示通用题面」；缺来源题发布 200 且有 warning（共享层断言） |
| AC-018-7 | 通过 | 后台选中「毕业后的第一选择」出现 `.branch-dep`：「…信息差（q16）…」，文本无 `Q19`/任何 `Qxx`（2/2 断言） |
| AC-018-8 | 通过（附注） | `npm run verify` EXIT=0；默认问卷 390px 作答页与报告页 `scrollWidth 390 <= clientWidth 390`；浏览器全流程按序作答并提交跳 `/r/...`，访问 27 个题项——该路径下 Q23（`q18`）按设计因 Q21=① 隐藏；28 题可达性用 `visibleQuestions` 断言覆盖（8/8） |
| AC-018-9 | 通过 | 必答空答点「下一题」仍停留并显示「这一题还没完成」（`q1`）；回跳到 `q6` 后直接点「下一题」仍停留并提示；接口直提缺 `q6` 返回 400 `missing:["q6"]`；`canAdvance()` 未放宽 |

## 验证执行

- `npm run verify` → **EXIT=0**（约 20s）。关键输出：`✓ 问卷 28 个题项都能在设计文档里找到`；`文件规模检查通过：293 个文件，10 条基线。`；`✓ 版本一致：package.json=2.3.0 ↔ docs/reference/README.md 最高 v2.03`；`✓ 依赖不变量通过`；dates/score/audit/roster/search 全通过；typecheck 两 workspace 通过；build `✓ 771 modules transformed`、`✓ built in 3.57s`。
- 共享层用例：`npx tsx /tmp/cr018-review/shared-cases.ts` → **58 passed, 3 failed**；失败 3 条全部是本报告新增的“分支环不崩溃”断言（见 P1-1），其余 AC 断言全过。
- 展示逻辑：`npx tsx /tmp/cr018-review/logic.ts` → **8 passed, 0 failed**（28 题齐全、Q20 闸门、Q21→Q23、Q22→Q24、三路径并集覆盖 28 题）。
- 浏览器/接口（隔离 server `PORT=8891` + `DATA_DIR=/tmp/vesta-cr018-review/data`，AI 变量置空，自起自停；未使用 8788/5173）：
  - `node /tmp/cr018-review/e2e.mjs` → **32 passed, 0 failed**（AC-1/2/3）。
  - `node /tmp/cr018-review/e2e2.mjs` → **36 passed, 0 failed**（AC-4/5/6/7/8/9，含后台 UI toast 与全流程提交）。
  - 事故与循环复现见 P1-1/P1-2 证据。
- 回归测试：
  | 受影响区域 | 执行的测试 / 验证 | 结果 |
  |---|---|---|
  | 默认 Q19 7 分支 | 共享层 + 浏览器逐项 | 通过 |
  | 空/失效 `q6` | 浏览器 3 类失效值 + 空值 | 通过 |
  | 兜底 4 类问卷 | 浏览器渲染 + 4 次提交 200 | 通过 |
  | 提交接口 | 正常/兜底/缺必答 400 | 通过 |
  | 报告入口 | 兜底提交后 `GET /api/report/:slug` | 200（AI 失败态符合预期） |
  | 后台发布/编辑 | 400、200、toast、依赖提示 | 通过 |
  | 显示逻辑 | `visibleQuestions` 8 组断言 | 通过 |
  | 文件规模 | `check:size` | 通过，基线只下调 |
  | 版本/文档 | `check:version` / `check:docs` | 通过 |
- 无法执行的验证：真实 iPhone Safari / 微信内置浏览器（仅有 Chromium 390px 模拟）；AI 报告正文生成（环境未配置 AI，只验证 `q16_info` 结构值与接口可启动）。因此“报告文案”类结论置信度较代码结构结论低一档。

## 影响面覆盖

| 影响维度 | 是否覆盖 | 证据 / 缺口 |
|---|---|---|
| 模块 / 接口 | 是 | `shared/question.ts`、`shared/validate.ts`、`server/public.ts`、`Quiz.vue`、后台问卷编辑均实跑；接口协议未变 |
| 数据 / 配置 | 是 | `surveys`、`settings.active_survey` 只读核对：仅 `survey-main` v3，`q6` 单选必答 7 选项、`q16` 7 个映射，未被测试污染 |
| 测试 / 回归 | 是 | 默认分支、条件题、提交、后台、390px 全覆盖；新增循环边界未覆盖（P1-1） |
| 文档 | 是 | 设计文档 §五/§九、development-history、README、归档索引已同步；R-018-8 与实现有冲突（P2-1） |
| 兼容 / 迁移 / 回滚 | 是 | 无表结构/迁移；存量自定义问卷四种坏数据均可用；回滚只需 `git revert` + `update.sh`，兜底答案仍是原 `q16_*` id |

## NFR 检查

| 项 | 目标 | 结果 |
|---|---|---|
| 改动面 | 不动接口协议与表结构 | 通过（仅新增日志字段 `fallbackQuestions`，无迁移/依赖） |
| 默认行为 | 7 分支、评分、报告口径不变 | 评分口径不变；**报告输入 `q16_info` 标签改变 18/28 组合**，见 P2-1 |
| 兜底可识别 | 后台可从提交数据或日志看出 | 通过（日志 `fallbackQuestions=["q16"]`，仅 id，不含答卷）；后台 UI 无展示，运维需查日志 |
| 存量自定义问卷 | 不靠重发默认问卷 | 通过（4 种坏数据均走共享层兜底） |
| 手机 390px | 无横向滚动 | 通过（作答页与报告页均 390/390） |
| 安全 / 日志 | 不泄露答案、密钥 | 通过：`submit.stored` 只含 `reqId/inviteId/submissionId/answerCount/reportMode/fallbackQuestions`；全量日志搜索未出现测试答案文本；`requireAdmin()` 未改 |
| 资源 / 并发 | 无明显低效或竞态 | 正常路径无问题；新增递归无环保护见 P1-1 |

## 维度结论

| 维度 | 结论 | 说明 |
|---|---|---|
| 1 需求覆盖 | 有缺口 | 9 条 AC 均满足；R-018-8“报告文案不变”被 `q16_info` 标签变更打破（P2-1） |
| 2 正确性 | 有问题 | 正常/兜底路径正确；分支自引用会无限递归（P1-1） |
| 3 边界与错误处理 | 有问题 | 空值/数组/删除/无映射/隐藏/多选均已处理；`disableIf` 与循环未处理（P1-1、P3-2） |
| 4 安全 | 未发现问题 | 管理鉴权未动；无注入面；日志无敏感内容。但 `PUT /api/admin/survey` 接受畸形 `branches`，属输入校验缺口（P1-1） |
| 5 性能与资源 | 未发现问题 | 新增解析为常数级；无无界内存/连接泄漏 |
| 6 并发与一致性 | 未发现问题 | 回跳状态为页面内单实例 `pendingReturn`；未引入共享可变状态或事务边界变化 |
| 7 可维护性 | 基本良好 | 新文件 154/77/122/139 行，职责清晰；`validate.ts`/`docScore.ts` 仍经 `./doc` 反向 re-export 引用（P3-4） |
| 8 测试有效性 | 有缺口 | Dev 的 61+57 断言未入库且未覆盖循环坏数据；本报告补了共享层与 Playwright 独立断言 |
| 9 文档一致性 | 有缺口 | 设计文档/README/history 已同步；R-018-8 与实现冲突、README 版本表 commit 列待回填（P2-1、P3-6） |
| 10 范围与风险 | 未发现越界 | 无无关改动、无调试残留、无依赖变更；仅日志字段与版本号 |
| 11 用户注释保护 | 未发现问题 | diff 中 `LosAngelous:` / `LOS:` 注释 0 处被修改/删除/重排 |
| 12 回归与影响面 | 已覆盖 | 见“回归测试”表；旧答卷/旧客户端兼容 |
| 13 AC ↔ 验证追溯 | 已覆盖 | 每条 AC 有独立命令与断言；共享层 + 浏览器双层证据 |
| 14 NFR 目标 | 基本达标 | 见 NFR 表；兜底可识别只在日志层 |

## 缺陷清单（按严重度降序）

### [P1] 分支来源自引用/互相引用会让 `resolveQuestion` 无限递归，整份问卷无法渲染或提交

- 位置：`shared/src/question.ts:86-89`（`resolveQuestion(survey, answers, source!)` 递归解析来源题，无环检测/深度上限）；`shared/src/validate.ts:106-111`（只校验来源题 `type !== 'single'`，不校验 `q.branches.question === q.id` 或环）。
- 问题：本轮新增 `sourceUsable` 逻辑，为了判断来源题是否可见而递归调用 `resolveQuestion`；来源题自身的 `branches` 指回当前题时形成无限递归。
- 触发条件：通过 `PUT /api/admin/survey` 提交一份把 `q16.branches.question` 改成 `"q16"` 的问卷（`validateSurvey` 返回空错误，接口 200）；随后打开该问卷的邀请页或提交答卷。
- 影响：浏览器渲染直接空白（实测 `.stem` 数量 0、`body` 文本为空），学员看不到任何题目；服务端 `POST /api/invite/:token/submit` 返回 500。该问卷的所有学员再次进入“完全无法作答/提交”的状态，与 CR-018 要消除的线上死路同类。
- 证据：
  - `PUT /api/admin/survey` 自引用问卷 → **200**（未被 `validateSurvey` 拦截）。
  - 同一问卷 `POST /api/invite/:token/submit` → **500** `{"error":"服务器出了点问题，请稍后再试"}`；服务端日志：`ERROR http.error reqId=a497d97e method=POST path=/api/invite/:token/submit err=RangeError: Maximum call stack size exceeded @ at Array.find (<anonymous>)`。
  - Playwright 打开该问卷邀请：`.stem` count=0，页面空白。
  - 共享层：自引用与 `q6→q16` 互相引用均抛 `RangeError`；`validateAnswers` 同样崩溃；`validateSurvey` 不崩溃也不报错（3 条断言失败即此问题）。
- 建议（最小修复方向）：`resolveQuestion` 解析来源题时加 visited 集合/深度上限（例如来源题若仍含 `branches` 则直接视为不可用，不递归）；`validateSurvey` 拒绝自引用和环；补共享层用例。
- 置信度：高（已用接口、浏览器、共享层三方复现）。
- 可达性说明：后台 UI 不能创建 `branches`，实际触发需管理员通过 API/改库构造畸形数据，现实概率低；但后果是核心获客入口不可用，故按 P1 记录。

### [P1] 事故清理不完整：`events` / `event_facts` 残留已污染后台漏斗，Dev 报告对影响描述不准确

- 位置：`data/vesta.db`（只读核对）；删除逻辑 `server/src/routes/admin/invites.ts:81-97` 只删 `roster_group_members` 与 `invites`，不删 `events` / `event_facts`；漏斗读取 `server/src/db/events.ts:countCompletedGroups/exitDropoff` 直接查 `event_facts`，不与 `invites` 关联。
- 问题：Dev 自述“创建 8 个 CR018-* 邀请与 1 份提交，已删除；可能残留少量 events 行，不影响业务数据”。实测邀请/提交已清，但 33 条事件和 10 条漏斗事实仍在，且全部计入后台指标。
- 触发条件：已发生（2026-11-20 17:14–17:36 本地时间，Dev 误用用户 8788 server + 仓库 `data/vesta.db`）。
- 影响：
  - `events`：33 行（id 192–224）属于 7 个已删除邀请；另有 1 个邀请 `inv_mworfglj163da89a` 无事件痕迹。
  - `event_facts`：10 行残留（`group` p1–p5 各 1 行；`exit` q16×2、q6×3），占当前全部 facts 22 行中的 10 行。
  - 后台“每组完成”：p1–p5 各显示 1 人，**5/5 全部来自测试**；“每题流失” q6=3、q16=2，占最终流失 7 人中的 5 人。
  - 真实业务数据未丢：当前 `invites` 7 条、`submissions` 6 条均为 2026-11-12 的历史验收数据；备份 `/tmp/vesta-data-backup-cr018-20261120.db` 可核对出 15 invites / 7 submissions / 8 个 `CR018-*` 邀请。
  - 另有 8 条今日 `admin_sessions`（dev-login 会话；无 token 泄露风险，建议一并清理）。
  - 问卷未被污染：`surveys` 仅 `survey-main` v3，`settings.active_survey=survey-main`，`q6` 单选必答 7 选项、`q16` 7 个映射完整。
- 证据（只读查询）：
  - `select count(*) from invites/submissions` → 7 / 6；`like '%CR018%'` → 0 / 0。
  - 孤儿事件按日期：2026-11-12 3 条（历史遗留，不归本次），2026-11-20 33 条。
  - `event_facts` 孤儿明细：`p1..p5` 各 1、`q16` 2、`q6` 3；`inv_mwdbl2lae033bd44` 的 q2/q24 属 11-12 历史遗留。
  - 备份库：15 invites / 7 submissions / 213 events / 22 facts，含 8 条 `CR018-*` 邀请与 1 条 `CR018-full-flow` 提交。
- 建议：先重新 `VACUUM INTO` 备份，再按 8 个 invite_id 删除 `events` 与 `event_facts`（8 个 id：`inv_mworfglj8f8af20d`、`inv_mworfglj229f2f2a`、`inv_mworfglj163da89a`、`inv_mworjk6j4b81adca`、`inv_mworjl06ebb18c5c`、`inv_mworjltw5bb9e938`、`inv_mworjmu84005b2c8`、`inv_mworjn3wd1422689`），复核后台漏斗；如需一并清理今日 admin_sessions。**改 `data/` 前必须取得用户同意**。
- 置信度：高（直接查库，与备份交叉核对）。
- 补充过程问题：Dev 误连用户已启动的 8788 server（使用仓库 `data/vesta.db`），期间用户 server 的 `tsx watch` 子进程于 17:25:03 重启（PID 2091660），违反“不动用户已启动的 dev server / 端口占用先说明”的约定；本次评审只在 8891/8892 隔离端口 + 临时 `DATA_DIR` 上操作，未触碰 8788/5173。

### [P2] 默认问卷报告的 `q16_info` 标签改变 18/28 组合，与 R-018-8「报告文案不变」冲突

- 位置：`shared/src/question.ts:136-143`（`label()` 改为按 `resolveQuestion(...).options` 取文字）；下游 `shared/src/doc.ts:238`（`q16_info: label(survey, answers, 'q16')`）。
- 问题：旧实现对分支题 `optionLabel()` 遍历所有分支、取第一个命中的标签（实际永远命中 `q6_1` 分支），因此同一 `q16_N` 在不同分支下都返回保研分支的文案；新实现返回当前分支实际渲染的文案。兜底答案需要新行为（AC-018-5 要求“完全不了解”而不是旧值“完全不知道”），但它在默认 7 个正常分支下也改变了报告输入，与 R-018-8“报告文案不变”字面冲突。
- 触发条件：默认问卷中 `q6`≠`q6_1` 的任意答卷（正常业务路径）。
- 影响：默认问卷 28 种 `q6×q16` 组合中 18 种 `q16_info` 文本变化，AI 报告输入随之变化；评分不受影响（`docScore.optionIndex()` 本来就走 resolved options，索引不变）。
- 证据（`/tmp/cr018-review/label-diff.ts`）：
  ```text
  q6_2 q16_1: old="都清楚" new="都查过"
  q6_2 q16_2: old="知道一两项" new="查过一部分"
  q6_2 q16_3: old="只听过" new="只知道要考"
  q6_2 q16_4: old="完全不知道" new="没查"
  q6_3 q16_1: old="都清楚" new="很了解"
  q6_3 q16_2: old="知道一两项" new="知道大概"
  q6_3 q16_3: old="只听过" new="只听过名字"
  q6_3 q16_4: old="完全不知道" new="完全不了解"
  q6_4 q16_2: old="知道一两项" new="部分清楚"
  q6_4 q16_4: old="完全不知道" new="不知道"
  q6_5 q16_2: old="知道一两项" new="部分清楚"
  q6_5 q16_4: old="完全不知道" new="不知道"
  q6_6 q16_1: old="都清楚" new="查过"
  q6_6 q16_2: old="知道一两项" new="知道大概"
  q6_6 q16_4: old="完全不知道" new="没查"
  q6_7 q16_1: old="都清楚" new="查过"
  q6_7 q16_2: old="知道一两项" new="知道大概"
  q6_7 q16_4: old="完全不知道" new="没查"
  differing combos: 18 / 28
  ```
  新行为与用户实际看到的选项一致，是正确性修复；但需求文档没有记录这一变更，Dev 报告只在 AC-018-5 下承认“label 改走 resolved option”，未说明默认路径影响。
- 建议：由 Doc/用户明确接受并把 R-018-8 改写为“默认分支渲染与评分不变；`q16_info` 取实际渲染标签（修正旧实现取错分支的缺陷）”，补一条默认分支标签用例；若坚持字面“报告文案不变”，则需把新标签限定在兜底路径（会保留正常分支的旧错误）。
- 置信度：高。

### [P2] 「拆分 vs 功能」hunk 清单无法按描述直接拆成两条行为不变的 commit

- 位置：`docs/reports/dev-agent-2026-11-20-问卷分支题死路.md:46-62`（清单）；实际文件 `shared/src/question.ts`（整文件新增，含 `BRANCH_FALLBACK_*`、`branchFallbackOptions()`、`fallback` 字段、`resolveQuestion` 兜底、`label/labels` 新语义）、`web/src/views/Quiz.vue`（拆分与回跳接入混在同一文件）。
- 问题：清单把 `shared/src/question.ts` 整文件算作 Commit 1（纯拆分），但该文件当前内容同时包含功能改动（`:15-26`、`:85-104`、`:136-143`），且 `resolveQuestion`/`label` 的旧语义与新语义在同一个函数体内，无法用 `git add -p` 对新文件按 hunk 拆出“行为完全不变”的版本；`Quiz.vue` 的回跳 import/模板/样式也属于功能 hunk。
- 影响：若按清单直接执行，Commit 1 会包含兜底与标签变更，不再是“行为完全不变”的纯拆分；`git bisect` 与回滚基线失真，违反 agent-rules「拆分 commit 与功能 commit 分开，验收标准是行为完全不变」。
- 证据：`git diff --numstat` 显示 `shared/src/doc.ts` -126/+10、`Quiz.vue` -190/+40，功能与拆分在同一工作区；`shared/src/question.ts` 为未跟踪新文件（`??`），`git add -p` 无法拆分未跟踪文件的内部内容。
- 建议：先构造“无兜底、旧 `optionLabel` 语义”的中间版 `question.ts` 与“无 `useBranchRecovery` 接入”的中间版 `Quiz.vue`，提交并单独跑 `verify` + 关键页面走查，再提交功能部分；G3 后不能直接照清单 `git add -p`。
- 置信度：高。

### [P3] `fallbackQuestions` 在每次提交日志中都出现（正常态为空数组）

- 位置：`server/src/routes/public.ts:256-262`。
- 问题：正常提交日志为 `fallbackQuestions=[]`，并非“只在兜底时出现”。字段只含题目 id，不含答卷内容，符合 NFR“可识别”要求。
- 证据：正常分支与全流程提交日志 `fallbackQuestions=[]`；4 次兜底提交 `["q16"]`；日志中无任何答案文本（搜索 `测试专业/测试愿景/福建 - 莆田` 均无结果）。
- 建议：若严格要求“仅兜底时出现”，改为仅当非空才写入；否则在文档中明确“正常为空数组”。不影响结论。

### [P3] `disableIf` 未纳入回跳/来源可用性判断

- 位置：`shared/src/question.ts:88-89`（`sourceUsable` 只看 `visible`、`type`）；`web/src/composables/useBranchRecovery.ts:36`（只看 `resolved.visible`、`source.required`、`source.type`）。
- 问题：被 `disableIf` 置灰的来源题仍会被当作可用/可回跳，可能出现“回跳到无法作答的置灰题”或“使用置灰题的旧答案渲染分支”。
- 影响：默认问卷没有 `disableIf`，当前无实际影响；仅存量/未来自定义问卷的边界体验问题；不会造成死路（`canAdvance()` 对 disabled 题放行）。
- 建议：两处都同时判断 `!resolved.disabled`。
- 置信度：中（静态分析；未构造自定义问卷复现）。

### [P3] 回跳返回 Q19 时，若 Q19 已有旧答案会立即 250ms 自动前进

- 位置：`web/src/composables/useBranchRecovery.ts:57-74`、`web/src/views/Quiz.vue:324-341`。
- 问题：回跳补答后 `step` 回到 Q19；若草稿里 Q19 已有答案（有效 id），单选题的自动前进逻辑会在 250ms 后直接跳到下一题，学员来不及看到新分支题面。测试中观察到 `q6` 空 + `q16` 有旧值时，补答后直接到 `q24`。
- 影响：不会死路，但可能让学员在未确认的情况下继续使用旧 Q19 答案（不同分支下同一 id 文案已变）。
- 建议：回跳返回时抑制一次自动前进，或在来源题答案变化时清空/要求确认 Q19。
- 置信度：高（实测），但属既有“改 Q6 不重答 Q19”行为的延伸。

### [P3] 兜底标记/覆盖警告会把隐藏的分支题也计入

- 位置：`shared/src/validate.ts:27-31`（`fallbackQuestions` 不检查分支题自身 `visible`）、`:37-52`（`branchCoverageWarnings` 不看来源题是否隐藏/分支题是否隐藏）。
- 影响：自定义问卷中隐藏的分支题可能在提交日志里被标成兜底、或在保存时产生多余提示；默认问卷无影响。
- 建议：按 `resolveQuestion(...).visible` 过滤后再统计。

### [P3] 维护性与版本记录

- `shared/src/validate.ts:2`、`shared/src/docScore.ts:2` 仍经 `./doc` re-export 引用 `resolveQuestion`（`doc ↔ docScore` 原有循环未消除）；可改从 `./question` 直接 import（P3-4）。
- `docs/reference/README.md` v2.03 版本行 commit 列为“工作区未提交”，提交后需回填真实 hash（P3-6，当前 `check:version` 通过）。

## 已检查且未发现问题的区域

- 空值/缺失/空数组/缺字段：`isEmptyValue`、`validateAnswers`、回跳判定均正确（空 `q6`、null、`[]` 均不崩溃且按规则处理）。
- 数组/非字符串/已删除选项/不在选项内：均被清空并回跳，未残留。
- 错误路径：提交 400 带 `missing`；409 已有提交仍走原处理；报告未配置 AI 时 200 + failed，不暴露内部 key。
- 权限：`requireAdmin()` 与 dev-login 逻辑未改；本次未发现越权读写。
- 注入/SSRF：本次新增代码只处理问卷 JSON 与日志字段，无 SQL/命令拼接、无外呼。
- 敏感信息：`submit.stored` 未记录答卷、联系方式或密钥；日志中只有 id 与计数。
- 资源：新文件均 ≤400 行；无大对象复制以外的额外开销；`fallbackQuestions` 为 O(问题数)。
- 兼容性：`Survey` 数据未改；旧 11-12 答卷仍可读取；`q16_*` 选项 id 不变。
- 文件规模：`doc.ts` 1270（基线 1270，只降不升）、`Quiz.vue` 722（基线 722）；新文件 154/77/122/139；`Quiz.vue` 模板 85 / script 338 / style 300 行，均在限制内。
- 禁止项：diff 无 `.env` / `data/` / `zxg/` / `web/dist/`；无 `scripts/check-*.mjs` 修改；无新增依赖/接口/表结构/迁移（`package.json` 仅版本号）。
- 用户注释保护：改动文件中 `LosAngelous:` / `LOS:` 注释 0 处被修改/删除/重排。

## 文档同步检查

- `docs/archive/20261120/2-…开发文档.md` 状态「已实施（v2.03，待 G3）」：正确；实施记录已补。
- `docs/reference/规划自测问卷-设计文档.md` §五/§九：与实现一致（回跳/兜底/必答 4 项可在代码中一一对应）；§八 示例 `q6_first_choice=考研` 与 `q16_info=知道大概` 本身不自洽（`知道大概` 属就业分支），属既有示例问题，建议顺带订正。
- `docs/reference/development-history.md`：v2.03 小节完整（改了什么/为什么/验证/回滚）。
- `docs/reference/README.md`：已完成行与版本表已加 v2.03；commit 列待回填。
- `docs/STATUS.md`：G3 进行中，待本报告结论后更新。
- `CHANGELOG.md`：项目不存在该文件，以 development-history 为变更入口（符合本仓库惯例）。
- `docs/archive/20261120/README.md`：索引状态“已实现/已实施，待 G3”正确。

## 用户注释保护检查

- 扫描到 `LosAngelous:` / `LOS:` 注释：0 处（改动文件中）
- 被修改/删除/重排：0 处

## 残留风险

- 仅 Chromium 390px 模拟，未在真实 iPhone Safari / 微信内置浏览器复测；根因是数据而非渲染的结论仍成立，但交互细节（提示位置、键盘）未验。
- AI 报告正文未生成（评审环境 AI 关闭），`q16_info` 只验证结构值；报告实际措辞是否因标签变化而显著不同未评估。
- 生产自定义问卷仍是旧题号；兜底与提示均按“题目文字/id”处理，但生产问卷若 `q16` id 不同，需现场确认 fallback id 仍能提交（同一 `resolveQuestion` 保证前后端一致）。
- 分支循环若在 G3 后仍存在，任何管理员通过 API 误传畸形问卷都能让该问卷所有人无法作答；建议在 `validateSurvey` 与 `resolveQuestion` 双层兜底。
- 新增行为没有进入仓库内可重复的 `verify` 套件（项目无自动化测试），后续改动缺少回归保护；本次临时脚本在 `/tmp`，不会随仓库保留。

## 建议（非阻塞）

- [P3] 为 `resolveQuestion` 增补 visited/深度保护与自引用/环用例，纳入可重复的检查脚本。
- [P3] 统一 `validate.ts` / `docScore.ts` 从 `./question` 直接 import，消除经 `doc` 的反向依赖。
- [P3] 后台问卷设置增加“最近一次提交是否走兜底”的可见信息（目前只有服务器日志），便于运营发现存量坏问卷。
- [P3] 提交日志字段可按“仅非空才输出”收敛，或明确文档口径。

## 授权记录

- 批准的 AUTH：无（本次仅只读评审；未提交、未推送、未改 `data/`）
- 拒绝或升级的请求：无
- 本轮 G3 结论接受：未接受（Review 不得自批；且本轮为不通过，需返工后重审）

## 上下文增量

- 评审范围：CR-018 / T-060~T-064（工作区）
- 发现的过期信息：
  - Dev 报告“残留 events 不影响业务数据”与实测不符：`event_facts` 残留导致后台“每组完成/每题流失”被测试数据污染。
  - 设计文档 §八示例 `q6_first_choice=考研` 与 `q16_info=知道大概` 不属于同一分支，示例本身不自洽。
  - `docs/reference/README.md` v2.03 版本行 commit 列仍为“工作区未提交”，提交后需回填。
  - 项目无 `PROJECT_BRAIN.md`、无 `docs/reports/review-index.md`、无 `docs/CHANGELOG.md`；评审按 `docs/reference/` + development-history 执行。
- review-index 更新：否（文件不存在，且本次不写工作区）

## 下一步交接

- 结论：不通过 → **Dev Agent**（G3 未通过，本轮不交 Meta）
- 返工项：
  - **R-018-R1（P1）**：修复 `resolveQuestion` 对来源题的无限递归；`validateSurvey` 拒绝自引用/环；补共享层用例（自引用、互引、非环来源题三类）。验收：自引用问卷 PUT 应 400，或即使入库也不能让渲染/提交崩溃。
  - **R-018-R2（P1）**：在用户同意后，先 `VACUUM INTO` 新备份，再清理 8 个 `CR018-*` invite_id 的 `events` 与 `event_facts`（必要时 `admin_sessions`）；复核后台“每组完成/每题流失”只剩真实数据。禁止未经同意写 `data/`。
  - **R-018-R3（P2）**：就 `q16_info` 标签变更（18/28 组合）取得 Doc/用户明确口径：更新 R-018-8 并补默认分支标签用例，或把变更限制在兜底路径；同时订正设计文档 §八示例。
  - **R-018-R4（P2）**：按“中间版本”真实完成拆分 commit（`question.ts`/`Quiz.vue` 的纯拆分版），单独跑 `npm run verify` + 关键页面走查后再提交功能部分；不要照现有 hunk 清单直接 `git add -p`。
  - 可选（P3）：`fallbackQuestions` 空数组输出口径、`disableIf` 判断、回跳返回的自动前进、隐藏分支题标记、import 循环、版本表 commit 回填。
- 携带材料：本报告、`docs/reports/dev-agent-2026-11-20-问卷分支题死路.md`、工作区基线（未提交）、`/tmp/cr018-review/` 下复现脚本（`shared-cases.ts`、`e2e.mjs`、`e2e2.mjs`、`logic.ts`、`label-diff.ts`、`cycle.mjs`、`cycle-ui.mjs`）、`/tmp/cr018-review/server.log`、`/tmp/vesta-data-backup-cr018-20261120.db`（只读核对用）、`data/vesta.db`（只读）。
- 给 Dev 的 Prompt：

  【项目路径】/home/losangelous/LosAngelous/Vesta
  【本次任务】CR-018 / T-060 ~ T-064（工作区未提交；产品版本 v2.03）
  【G3 结论】不通过；返工项 R-018-R1 ~ R-018-R4（P1：R1/R2；P2：R3/R4）
  【R1】修复 `shared/src/question.ts:86-89` 来源题递归的无限循环，并在 `shared/src/validate.ts:106-111` 拒绝自引用/环；复现：后台 PUT 自引用 `q16.branches.question='q16'` 当前 200，随后 submit 500 `RangeError`、页面空白。补用例后重跑共享层断言。
  【R2】先取得用户同意，再用 `VACUUM INTO` 备份，清理 `data/vesta.db` 中 8 个 `CR018-*` invite_id 的 `events`（33 行）与 `event_facts`（10 行：p1–p5、q6×3、q16×2），复核后台漏斗；不要动 `surveys` / `active_survey`。
  【R3】与 Doc/用户确认 `q16_info` 标签变更（18/28 组合）口径：更新 R-018-8 或改为仅兜底路径生效；顺带订正设计文档 §八示例。
  【R4】按“中间版本”真实拆出纯拆分 commit（`question.ts` 无兜底/旧 label、`Quiz.vue` 无回退接入），单独 `npm run verify` + 关键页面走查后再提交功能部分。
  【验证】`npm run verify`、共享层断言、隔离端口 + 临时 `DATA_DIR` 的 Playwright（AC-1~9）；不得使用 8788/5173，不得写仓库 `data/`。
  【文档位置】docs/archive/20261120/1-问卷分支题死路-需求卡.md、docs/archive/20261120/2-问卷分支题死路-开发文档.md、docs/reference/规划自测问卷-设计文档.md §五/§九、docs/reports/review-agent-2026-11-20-问卷分支题死路.md（本报告）
  【完成标准】R1/R2/R4 闭环、R3 有明确书面口径，AC-018-1~9 复跑通过后重新提交 G3；不 commit / 不 push 直到用户确认。
