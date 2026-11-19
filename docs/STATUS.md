# 项目状态面板

> 维护者：Doc Agent ｜ 最近更新：2026-11-19 ｜ 状态：进行中
> 本文件只记录当前状态，不承载需求细节；细节看对应文档。

## 当前

| 项 | 内容 |
| --- | --- |
| 当前 CR | CR-017 拆分巨型文件（第二批；v2.02，开发中） |
| 当前门禁 | **G2 自检完成，待 G3 评审**（CR-017，2026-11-19；工作区未提交） |
| 进行中任务 | T-056 ~ T-059 已完成，待评审 |
| 阻塞 | 无 |
| 下一步 | Review Agent 执行 G3 评审；通过后按用户要求提交与发布 |
| 文档根目录 | `docs/` |

## 角色记录

- 2026-11-18：Doc Agent 曾越权直接实现金句栏。用户指出后，实现代码已全部撤出仓库并备份到 `/tmp/quote-shelf-doc-agent-candidate/`（`tracked.patch` + `untracked.tar.gz`）；仓库恢复到 G1 状态，G2 记录作废。
- 本轮起：Doc Agent 只维护文档与状态；开发由独立 Dev SubAgent 执行，Doc 不触碰业务代码。
- 2026-11-18：Dev SubAgent 从零实现 T-006 ~ T-012（v1.91），`npm run verify` 全绿，临时库种子断言、接口断言与 Playwright 走查通过；已出开发报告。
- 2026-11-18：Review SubAgent 完成 G3 评审，结论 **通过**（无 P0/P1；4 条 P3）。P3-1（种子重导遇同名分类可能产生孤儿金句）记为后续项，不阻塞本次交付；P3-2/3/4 文档措辞已由 Doc 修正。
- 2026-11-18：Meta Review SubAgent 完成 G4 总审，结论 **通过**（无 P0/P1；4 项非阻断跟进）。提交 `1641845` 已推送；发布动作 `bash update.sh` 由用户执行。后续项：P2 拆分 `migrations.ts`、P3 种子孤儿校验、P3 随机三条复制失败提示。
- 2026-11-18：Dev SubAgent 完成 CR-003 / T-013 ~ T-014（v1.92）。三处文案改为“升学分数线查询”；`npm run verify` EXIT=0，临时 `DATA_DIR` + Playwright 26 项断言全部通过；工作区未提交，待 G3 评审。
- 2026-11-18：Review SubAgent 完成 G3 评审，结论 **有条件通过**（无 P0/P1；3 项 P2、2 项 P3）。P2 已处理：`reference/README.md` 主要页面与 `09-测试与验证.md` 版本状态已同步；需求卡状态行已改为“已确认”；`check-version.mjs` 截断缺陷登记为排队项。评审报告由 Doc 落盘为 `docs/reports/review-agent-2026-11-18-分数线入口改名.md`。
- 2026-11-18：Meta Review SubAgent 完成 G4 总审，结论 **通过**（无 P0/P1，无返工项）。独立复跑 `npm run verify` EXIT=0、Playwright 26/26；文档层/实现层/结果层均达；剩余为提交拆分与提交后回填事项。报告由 Doc 落盘为 `docs/reports/meta-agent-2026-11-18-分数线入口改名.md`。
- 2026-11-18：Dev SubAgent 完成 CR-005 / T-015 ~ T-019（v1.93）。`npm run verify` EXIT=0；临时 `DATA_DIR` 接口 32 条断言、Playwright 52 条断言全部通过；复制工具提取后金句栏复制回归通过；工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-18-故事集.md`。
- 2026-11-18：Review SubAgent 完成 CR-005 G3 首评，结论 **有条件通过**（无 P0/P1；3 项 P2：长标题 390px 溢出、置顶排序口径、文档表/索引计数）。报告落盘为 `docs/reports/review-agent-2026-11-18-故事集.md`。
- 2026-11-18：Dev SubAgent 完成 CR-005 返工 R1/R2/R3（长标题 `min-width`、`pinned_at` 最近置顶优先、分类弹窗错误清理）；接口 20/20、Playwright 30/30。
- 2026-11-18：Review SubAgent 完成 CR-005 G3 复审，结论 **通过**（无 P0/P1/P2；4 项 P3）；Playwright 47/47、空库 5/5、错误态 3/3。报告落盘为 `docs/reports/review-agent-2026-11-18-故事集-复审.md`。
- 2026-11-18：用户确认“评审通过后即可提交”；`1f4f1ef`（CR-005）与 `eee12fe`（CR-006 文档）在 G4 前按授权提交并推送，G4 总审在提交后的干净树上完成。
- 2026-11-18：Meta Review SubAgent 完成 CR-005 G4 总审，结论 **通过**（无返工；API 46/46、浏览器 UAT 69/69）。报告落盘为 `docs/reports/meta-agent-2026-11-18-故事集.md`。
- 2026-11-18：Dev SubAgent 完成 CR-006 / T-020 ~ T-024（v1.94）。`npm run verify` 全绿；临时 `DATA_DIR` 接口 40 条断言、Playwright 62 条断言全部通过；表 / 索引计数 33/45 已同步；工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-18-知识库重组.md`。
- 2026-11-18：Review SubAgent 完成 CR-006 G3 评审，结论 **通过**（无 P0/P1/P2；3 项 P3）；独立接口 44 条 + 专项 3/3 + 鉴权 6 条，Playwright 53/53 + 4/4 + 3/3。报告落盘为 `docs/reports/review-agent-2026-11-18-知识库重组.md`。
- 2026-11-18：用户确认提交；`91b09b9 [feat] 增加知识库与专业知识汇总` 已推送。
- 2026-11-18：Meta Review SubAgent 完成 CR-006 G4 总审，结论 **通过**（无 P0/P1；接口 41/41、浏览器 56/56）；发现 P2 全局 CSS 跨页泄漏（`.article-head`），由 Dev 单独修复。报告落盘为 `docs/reports/meta-agent-2026-11-18-知识库重组.md`。
- 2026-11-18：Dev SubAgent 完成 CR-007 / T-025 ~ T-026（v1.95）。`AdminLayout.vue` 故事集入口迁入知识库组、`activeGroup` 归 `score`；`npm run verify` EXIT=0；临时 `DATA_DIR` + Playwright 25/25 断言通过（导航顺序、故事集功能回归、高亮切换、390px）；工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-18-故事集迁移.md`。
- 2026-11-18：Review SubAgent 完成 CR-007 G3 评审，结论 **通过**（无 P0/P1/P2；3 项 P3）；独立 Playwright 71/71、`verify` EXIT=0。报告落盘为 `docs/reports/review-agent-2026-11-18-故事集迁移.md`。
- 2026-11-18：用户建立 G4 简化规则（`dev-workflow` §2.2）：纯文案/样式/导航/文档、代码 ≤3 文件且 G3 通过时可经同意跳过 Meta 总审。CR-007 据此 **G4 豁免**，记录于本文件与开发文档。
- 2026-11-18：Dev SubAgent 完成 CR-008 / T-027 ~ T-031（v1.96）。新增 `consult_question_categories` / `consult_questions` 两张表与 3 条索引、`shared/src/consult-question.ts`、`server/src/routes/consult/questions.ts`（8 个接口，挂载在金句栏之后）、`ConsultQuestions.vue` 与 `questions/*` 组件；`npm run verify` 全绿；临时 `DATA_DIR` 接口断言 36/36、Playwright 51/51 + 失败重试 3/3；库内表 / 索引 35 / 48；工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-18-有效提问.md`。
- 2026-11-18：Review SubAgent 完成 CR-008 G3 评审，结论 **通过**（无 P0/P1/P2；2 项 P3）；独立接口 41/41、Playwright 46/46。报告落盘为 `docs/reports/review-agent-2026-11-18-有效提问.md`。
- 2026-11-18：用户确认提交；`9478405 [feat] 增加有效提问` 已推送；Meta 总审 **通过**（0 P0/P1，限时抽查）。报告落盘为 `docs/reports/meta-agent-2026-11-18-有效提问.md`。
- 2026-11-19：Dev SubAgent 完成 CR-009 / T-032 ~ T-033（v1.97）。仅改 `AdminLayout.vue`：咨询组改为 写咨询稿 → 金句栏 → 故事集 → 有效的提问 → 咨询树，知识库组只保留 升学分数线查询 → 专业知识汇总，`activeGroup` 中金句栏 / 故事集改归咨询组；`npm run verify` EXIT=0；临时 `DATA_DIR` + Playwright 46/46 断言通过；工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-19-导航顺序调整.md`。
- 2026-11-19：Review SubAgent 完成 CR-009 G3 评审，结论 **通过**（无 P0/P1/P2；1 项 P3）。报告落盘为 `docs/reports/review-agent-2026-11-19-导航顺序调整.md`。
- 2026-11-19：Dev SubAgent 完成 CR-010 / T-034 ~ T-038（v1.98）。新增 `consult_topics` 一张表与 1 条索引、`shared/src/consult-topic.ts`、`server/src/routes/consult/topics.ts`（6 个接口，挂载在故事集之后）、`ConsultBasics.vue` 与 `basics/{TopicRail,TopicView,TopicEditorModal}.vue`、`basics/useBasics.ts`、`consultBasics.css`；咨询组导航新增 大学常识（有效的提问与咨询树之间）；`npm run verify` 全绿；临时 `DATA_DIR` 接口断言 33/33、Playwright 70/70；库内表 / 索引 36 / 49；工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-19-大学常识.md`。
- 2026-11-19：Review SubAgent 完成 CR-010 G3 评审，结论 **通过**（无 P0/P1；4 项 P3：重复首篇请求、≤1000px 排序失败提示不可见、触屏拖拽可能抢占滚动、PATCH 空对象刷新 updated_at）；`npm run verify` EXIT=0、表/索引 36/49。报告落盘为 `docs/reports/review-agent-2026-11-19-大学常识.md`。
- 2026-11-19：Meta Review SubAgent 完成 CR-010 G4 总审，结论 **通过**（0 P0/P1；4 项 P3）；`npm run verify` EXIT=0，36/49 与导航/接口/排序/XSS 代码级复核通过。报告落盘为 `docs/reports/meta-agent-2026-11-19-大学常识.md`。
- 2026-11-19：Dev SubAgent 完成 CR-011 / T-039 ~ T-041（v1.99）。仅改前端 3 个文件：`ConsultQuotes.vue` 分类栏双击行内改名与 Pointer Events 拖拽排序、`useQuoteShelf.ts` 新增 `reorderCategories` 乐观更新与失败回滚、`consultQuotes.css` 编辑态与拖动态样式；管理分类弹窗保留，接口 / 数据 / 表结构不变。`npm run verify` 全绿；临时 `DATA_DIR` + 空闲端口 Playwright 48/48 断言通过（含 409 / 500 回滚、固定项、390px）。工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-19-金句栏类别交互.md`。
- 2026-11-19：用户确认 G1 并同意跳过 G4（纯前端 3 文件、无接口/数据变更）。
- 2026-11-19：Dev 完成 CR-013 文章大纲（右侧 TOC）；G3 通过（6 项 P3），随后修复断点/锚点/跨断点/aria/Esc；`npm run verify` EXIT=0；用户确认跳过 G4。
- 2026-11-19：Review SubAgent 完成 CR-011 G3 评审，结论 **通过**（无 P0/P1；4 项 P3：编辑态失焦吞一次点击、指针监听失焦兜底、G1 回填、check-version 口径）；`npm run verify` EXIT=0。报告落盘为 `docs/reports/review-agent-2026-11-19-金句栏类别交互.md`。
- 2026-11-19：Dev SubAgent 完成 CR-013 / T-044 ~ T-046（v1.99 内追加，不升版本）。仅前端 3 个文件：新增 `basics/MarkdownOutline.vue`，`TopicView.vue` 提取 `h2/h3` 生成 slug 锚点、桌面 sticky 大纲、点击平滑滚动与滚动高亮、≤1000px 目录浮层、切换话题 / 编辑后重建；`consultBasics.css` 增加两列布局、当前项、浮层与 390px 适配。`npm run verify` 全绿；本地 `DATA_DIR` + Playwright 39 条断言通过（16 条提纲、点击 / 中段跟随、深链、重复锚点、无标题、900px 浮层、390px，以及其他页面与收藏详情直达回归）。工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-19-文章大纲.md`。
- 2026-11-19：Review SubAgent 完成 CR-013 G3 评审，结论 **通过**（无 P0/P1/P2；6 项 P3）。Dev 处理 P3-1（上沿调到 1340px）、P3-2（锚点占用集合 + while 后缀）、P3-3 最小项（Esc 关闭、`aria-expanded`）、P3-4（`matchMedia` 跨断点关闭浮层）、P3-5（landmark 去重）；`npm run verify` EXIT=0、Playwright 44/44。工作区仍未提交，待 G4。
- 2026-11-19：Dev SubAgent 完成 CR-014 / T-047 ~ T-049（v1.99 内追加，不升版本）。新增 `views/admin/components/RichTextEditor.vue` 与 `htmlToMarkdown.ts`（`contenteditable` + 9 项工具栏 + 粘贴纯文本）；替换 `basics/TopicEditorModal.vue`、`knowledge/ArticleEditorModal.vue`、`ConsultCollections.vue` 的 textarea 与“编辑 / 预览”切换；`TopicView.vue` 删除“更新于 / 管理员维护”；`consultBasics.css` / `knowledge.css` 调整编辑器样式。接口 / 数据 / 版本不变。`npm run verify` EXIT=0；Playwright 13 项断言全部通过（空正文拒绝、工具栏九项、粘贴纯文本、390px、Markdown 保存、阅读/编辑一致、专业知识汇总 / 收藏栏入口、其他页面回归），测试数据已清理。工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-19-富文本编辑.md`。
- 2026-11-19：Review SubAgent 完成 CR-014 G3 首评，结论 **有条件通过**（P2-1 代码块 / 行内代码、P2-2 URL 规则；P3-1 图片 `//`、P3-4 `aria-label`；P3-2 / P3-3 记录）。Dev 已修复：`pre` 输出 ``` 围栏（含语言）、行内 `code` 输出反引号；URL 对齐 `markdown.ts`（http/https、单个 `/` 站内路径、普通相对路径，拒绝 `//host` 与其他协议）；图片同规则；编辑区补 `aria-label="正文编辑器"`。定向 13/13 + 集成用例通过，返工后 `npm run verify` EXIT=0。另按协调者要求将阅读页标题改为 20px / 650 / 1.4。待 G3 复审。
- 2026-11-19：Dev 完成 CR-015（v2.0）；G3 首评发现 `check-version` 允许文档领先，判为 P1 不通过；返工改为单向规则（文档领先一律失败）后 G3 复审通过；`876ba8c [release] 发布 v2.0` 已推送。
- 2026-11-19：Dev 修复 P2-1/P2-2/P3-1/P3-4；Review 限定复审 **通过**（无 P0/P1/P2，仅 P3 记录）；用户明确确认跳过 G4（纯前端、无接口/数据变更，8 个代码文件按用户授权豁免）；`19aa5ae` 已推送。
- 2026-11-19：Dev SubAgent 完成 CR-015 / T-050 ~ T-051（v2.0）。`package.json` 升至 `2.0.0`；`check-version.mjs` 允许 `major >= 1`、`patch === 0`，按 `v<major>.<minor>` 解析「已完成」行并取数值最高；`reference/README.md` / `development-history.md` / 归档版本规范 / `STATUS.md` / archive README 同步；`web/vite.config.ts` 从根 `package.json` 注入 `__APP_VERSION__`，`AdminLayout.vue` 左下角显示 `v2.0.0`。`npm run verify` 全绿。
- 2026-11-19：Review SubAgent G3 首评 **不通过**，P1：`check-version.mjs` 允许「文档领先 1 个版本」通过，会掩盖 `package.json` 落后；另 2 项 P3。Dev 已返工：改回单向规则（相等通过、package 领先 1 个版本通过并提示、文档领先一律失败、差异 >1 失败），同步脚本与文档措辞；`development-history.md` 的 `T-050~T-052` 改回 `T-050~T-051`；`reference/README.md` 状态行改为「已确认（v2.0 待发布）」。复跑 9 组正反用例（README v2.1 + package 2.0.0 已 EXIT=1）与 `npm run verify` 全绿。待 G3 复审；报告落盘为 `docs/reports/dev-agent-2026-11-19-v2.0发布.md`。

- 2026-11-19：Dev SubAgent 完成 CR-016 / T-052 ~ T-055（v2.01）。三个巨型文件纯拆分：`db/migrations.ts` 42 行 + 6 个迁移模块；`routes/consult/runs.ts` 改为 `runs/index.ts` 23 行 + 7 个职责模块（11 条路由注册顺序不变）；`ReportView.vue` 96 行 + 4 个子组件、2 个 composable、5 个 scoped CSS。`package.json` `2.0.0 → 2.1.0`，后台左下角按 `v<major>.<minor 两位>` 显示 `v2.01`；`check:size` 基线移除两条。`npm run verify` 全绿；迁移 fresh / 幂等 / 既有库与拆分前一致；runs 接口状态码 / 响应结构与拆分前 HEAD 逐条一致；报告页 1280 / 390 / print 的 DOM、文案与关键计算样式完全一致。工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-19-拆分巨型文件.md`。
- 2026-11-19：Dev SubAgent 完成 CR-017 / T-056 ~ T-059（v2.02）。三个后台编辑页纯拆分：`SurveyEditor.vue` 1138 → 110 行 + `survey/` 7 个子组件与 `useSurveyEditor.ts`；`ReportEditor.vue` 1086 → 105 行 + `report/` 9 个子组件与 `useReportEditor.ts`；`ConsultCollections.vue` 989 → 108 行 + `collections/` 3 个子组件与 `useCollections.ts`。`package.json` `2.1.0 → 2.2.0`，后台左下角显示 `v2.02`；`check:size` 移除三个入口基线与 `ReportEditor.vue#template`。`npm run verify` 全绿；HEAD worktree 与当前实现的 DOM / 表单值 / 关键计算样式逐项一致，1280 / 390 截图差异 < 0.02%；Playwright 21 项交互断言 + Word 导入定向断言通过。工作区未提交，待 G3 评审。报告落盘为 `docs/reports/dev-agent-2026-11-19-拆分巨型文件第二批.md`。

## 任务概览（CR-017）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-056 拆分 SurveyEditor | DONE | 无 |
| T-057 拆分 ReportEditor | DONE | 无 |
| T-058 拆分 ConsultCollections | DONE | 无 |
| T-059 验证、版本与文档 | DONE | T-056、T-057、T-058 |

## 任务概览（CR-016）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-052 拆分 migrations | DONE | 无 |
| T-053 拆分 runs 路由 | DONE | 无 |
| T-054 拆分 ReportView | DONE | 无 |
| T-055 验证、版本与文档 | DONE | T-052、T-053、T-054 |

## 任务概览（CR-015）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-050 版本脚本与版本号 | DONE | 无 |
| T-051 版本文档与左下角版本号 | DONE | T-050 |

## 任务概览（CR-014）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-047 移除阅读页元信息 | DONE | 无 |
| T-048 富文本编辑器与转换 | DONE | 无 |
| T-049 验证与文档 | DONE | T-047、T-048 |

## 任务概览（CR-013）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-044 提纲组件与锚点 | DONE | 无 |
| T-045 跳转、高亮与响应式 | DONE | T-044 |
| T-046 验证与文档 | DONE | T-044、T-045 |

## 任务概览（CR-011）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-039 行内改名 | DONE | 无 |
| T-040 拖拽排序 | DONE | 无 |
| T-041 验证、文档与版本 | DONE | T-039、T-040 |

## 任务概览（CR-010）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-034 建表与共享类型 | DONE | 无 |
| T-035 后端接口 | DONE | T-034 |
| T-036 前端骨架与 Wiki 阅读 | DONE | T-035 |
| T-037 编辑与拖拽排序 | DONE | T-036 |
| T-038 验证、文档与版本 | DONE | T-034 ~ T-037 |

## 任务概览（CR-009）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-032 导航重排与高亮 | DONE | 无 |
| T-033 验证、版本与文档 | DONE | T-032 |

## 任务概览（CR-008）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-027 建表与共享类型 | DONE | 无 |
| T-028 后端接口 | DONE | T-027 |
| T-029 前端骨架：路由、导航、分类栏与只读列表 | DONE | T-028 |
| T-030 前端增删改、置顶、备注编辑与分类管理 | DONE | T-029 |
| T-031 验证、文档与版本 | DONE | T-027 ~ T-030 |

## 任务概览（CR-007）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-025 导航迁移与高亮 | DONE | 无 |
| T-026 验证、版本与文档 | DONE | T-025 |

## 任务概览（CR-006）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-020 建表与共享类型 | DONE | 无 |
| T-021 后端接口：专业与知识点 | DONE | T-020 |
| T-022 导航重组与知识库页面骨架 | DONE | T-021 |
| T-023 Wiki 阅读视图与 Markdown 渲染 | DONE | T-022 |
| T-024 编辑、分类管理与验证、版本文档 | DONE | T-020 ~ T-023 |

## 任务概览（CR-005）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-015 建表与共享类型 | DONE | 无 |
| T-016 后端接口：读、写与分类管理 | DONE | T-015 |
| T-017 前端骨架：路由、导航、分类栏与只读列表 | DONE | T-016 |
| T-018 前端增删改、置顶与分类管理 | DONE | T-017 |
| T-019 验证、文档与版本 | DONE | T-015 ~ T-018 |

## 任务概览（CR-003）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-013 文案替换 | DONE | 无 |
| T-014 验证、版本与文档同步 | DONE | T-013 |

## 任务概览（CR-002）

| 任务 | 状态 | 依赖 |
| --- | --- | --- |
| T-006 建表与共享类型 | DONE | 无 |
| T-007 只读接口与首批种子 | DONE | T-006 |
| T-008 前端骨架：路由、导航、分类栏与只读列表 | DONE | T-007 |
| T-009 金句写接口 | DONE | T-006 |
| T-010 前端金句增改删与置顶 | DONE | T-008、T-009 |
| T-011 分类管理 | DONE | T-009、T-010 |
| T-012 验证、实施记录与发布 | DONE | T-006 ~ T-011 |

## 排队中

- **拆分巨型文件第二批（CR-017）**：G0 / G1 已确认（SurveyEditor / ReportEditor / ConsultCollections，v2.02）；G2 自检完成，待 G3 评审；工作区未提交。
- **拆分巨型文件（CR-016）**：已交付（v2.01，commit `f66947b`，G3 通过；G4 豁免）。
- **发布 v2.0（CR-015）**：G3 首评不通过（P1）已返工，待复审；版本脚本改为单向规则、版本文档与后台左下角版本号已同步，`npm run verify` 全绿。
- **文章大纲（CR-013）**：已交付（`168a20d`，G3 通过；G4 豁免）。
- **在野知识库导入（CR-012）**：试点已实现并 G3 通过（`kb_region_01`，6514 字）；内容包与导入脚本待提交。
- **金句栏类别 P3（CR-011 后续）**：编辑态失焦保存会吞一次其他分类点击；拖动指针监听缺 window blur 兜底；长分类列表无边缘自动滚动。
- **金句栏类别交互（CR-011）**：v1.99 已实现，G2 自检完成，待 G3 评审；仅前端交互，接口 / 数据不变，弹窗保留。
- **大学常识 P3（CR-010 后续）**：列表首次加载重复请求首篇正文；≤1000px 排序失败提示不可见；触屏拖拽可能抢占滚动（A-037）；PATCH 空对象刷新 `updated_at`；话题列表超过约 200 篇需分页。
- **大学常识观察项（CR-010 后续）**：话题列表一次性返回全部摘要（不含正文），超过约 200 篇时考虑分页 / 虚拟滚动；首期不实现。
- **导航顺序调整（CR-009）**：已交付（v1.97，`ae3eedc`，G3 通过；G4 豁免）；金句栏、故事集回咨询组，咨询树移到最后，知识库组只保留升学分数线查询与专业知识汇总，路由 / 页面 / 接口 / 数据不变。
- **有效性提问 P3（CR-008 后续）**：分类调序日志未记 count；长度按 UTF-16 code unit；列表超过约 200 条需分页；备注未加密（与既有模块一致）。
- **知识库 P2（CR-006 后续）**：`knowledge.css` 的 `.article-head` 跨页影响收藏详情，已修复（`aa04644`，限定 `.article-view .article-head`）。
- **知识库 P3（CR-006 后续）**：外链图片受 CSP 限制（仅站内/相对图片）；`knowledge.css` 585 行与 400 行口径待明确；换专业后停留在旧专业页可加跳转/提示；列表分页阈值约 200 篇 / 5MB。
- **故事集迁移（CR-007）**：已交付（v1.95，`21c4ca2`）；G4 按简化规则豁免。
- **服务器清理与运维优化（CR-004）**：勘察已暂停，报告见 `docs/reports/doc-agent-2026-11-18-服务器清理-现状勘察.md`；恢复后先出 CR-004 需求卡（G0）。
- **`stories.ts` 拆分（CR-005 后续）**：文件恰好 400 行，下次触碰先拆 `server/src/routes/consult/storyCategories.ts`。
- **故事集全量 GET 观察项**：超过约 200 篇或响应 > 5MB 时加分页/虚拟滚动；首期不实现。
- **旧库 `pinned_at` 兼容**：未上生产；旧本地库缺列会启动失败，需删库或换 `DATA_DIR`（已写入 `08-排障手册`）。
- **工具修复：`check-version.mjs` 截断缺陷（已修复）**：CR-015 已将解析改为只按「后续」截断、解析整行全部 `v<major>.<minor>`，行内「；」不再导致版本漏计。

## 最近报告

- [dev-agent-2026-11-19-拆分巨型文件第二批.md](./reports/dev-agent-2026-11-19-拆分巨型文件第二批.md) — CR-017 / T-056 ~ T-059 开发报告（G2 自检，待 G3）
- [dev-agent-2026-11-19-v2.0发布.md](./reports/dev-agent-2026-11-19-v2.0发布.md) — CR-015 / T-050 ~ T-051 开发报告（G3 首评 P1 返工，待复审）
- [review-agent-2026-11-19-富文本编辑.md](./reports/review-agent-2026-11-19-富文本编辑.md) — G3 复审：通过（P2 关闭；仅 P3 记录）
- [dev-agent-2026-11-19-富文本编辑.md](./reports/dev-agent-2026-11-19-富文本编辑.md) — CR-014 / T-047 ~ T-049 开发报告（G2 自检，待 G3）
- [review-agent-2026-11-19-文章大纲.md](./reports/review-agent-2026-11-19-文章大纲.md) — G3 评审：通过（无 P0/P1/P2；6 项 P3）
- [dev-agent-2026-11-19-文章大纲.md](./reports/dev-agent-2026-11-19-文章大纲.md) — CR-013 / T-044 ~ T-046 开发报告（G2 自检，待 G3）
- [review-agent-2026-11-19-金句栏类别交互.md](./reports/review-agent-2026-11-19-金句栏类别交互.md) — G3 评审：通过（无 P0/P1；4 项 P3）
- [dev-agent-2026-11-19-金句栏类别交互.md](./reports/dev-agent-2026-11-19-金句栏类别交互.md) — CR-011 / T-039 ~ T-041 开发报告（G2 自检）
- [meta-agent-2026-11-19-大学常识.md](./reports/meta-agent-2026-11-19-大学常识.md) — G4 总审：通过（0 P0/P1；4 项 P3）
- [review-agent-2026-11-19-大学常识.md](./reports/review-agent-2026-11-19-大学常识.md) — G3 评审：通过（无 P0/P1；4 项 P3）
- [dev-agent-2026-11-19-大学常识.md](./reports/dev-agent-2026-11-19-大学常识.md) — CR-010 / T-034 ~ T-038 开发报告（G2 自检）
- [review-agent-2026-11-19-导航顺序调整.md](./reports/review-agent-2026-11-19-导航顺序调整.md) — G3 评审：通过（无 P0/P1/P2；1 项 P3）
- [dev-agent-2026-11-19-导航顺序调整.md](./reports/dev-agent-2026-11-19-导航顺序调整.md) — CR-009 / T-032 ~ T-033 开发报告（G2 自检）
- [meta-agent-2026-11-18-有效提问.md](./reports/meta-agent-2026-11-18-有效提问.md) — G4 总审：通过（0 P0/P1；2 项 P3）
- [review-agent-2026-11-18-有效提问.md](./reports/review-agent-2026-11-18-有效提问.md) — G3 评审：通过（无 P0/P1/P2；2 项 P3）
- [dev-agent-2026-11-18-有效提问.md](./reports/dev-agent-2026-11-18-有效提问.md) — CR-008 / T-027 ~ T-031 开发报告（G2 自检）
- [review-agent-2026-11-18-故事集迁移.md](./reports/review-agent-2026-11-18-故事集迁移.md) — G3 评审：通过（无 P0/P1/P2；3 项 P3）
- [dev-agent-2026-11-18-故事集迁移.md](./reports/dev-agent-2026-11-18-故事集迁移.md) — CR-007 / T-025 ~ T-026 开发报告（G2 自检）
- [meta-agent-2026-11-18-知识库重组.md](./reports/meta-agent-2026-11-18-知识库重组.md) — G4 总审：通过（无 P0/P1；P2 样式泄漏单独修复）
- [review-agent-2026-11-18-知识库重组.md](./reports/review-agent-2026-11-18-知识库重组.md) — G3 评审：通过（无 P0/P1/P2；3 项 P3）
- [dev-agent-2026-11-18-知识库重组.md](./reports/dev-agent-2026-11-18-知识库重组.md) — CR-006 / T-020 ~ T-024 开发报告（G2 自检）
- [dev-agent-2026-11-18-故事集.md](./reports/dev-agent-2026-11-18-故事集.md) — CR-005 / T-015 ~ T-019 开发报告（G2 自检）
- [meta-agent-2026-11-18-故事集.md](./reports/meta-agent-2026-11-18-故事集.md) — G4 总审：通过（无返工）
- [review-agent-2026-11-18-故事集-复审.md](./reports/review-agent-2026-11-18-故事集-复审.md) — G3 复审：通过（无 P0/P1/P2）
- [review-agent-2026-11-18-故事集.md](./reports/review-agent-2026-11-18-故事集.md) — G3 首评：有条件通过（无 P0/P1；3 项 P2）
- [meta-agent-2026-11-18-分数线入口改名.md](./reports/meta-agent-2026-11-18-分数线入口改名.md) — G4 总审：通过（无 P0/P1，无返工项）
- [review-agent-2026-11-18-分数线入口改名.md](./reports/review-agent-2026-11-18-分数线入口改名.md) — G3 评审：有条件通过（无 P0/P1；3 项 P2 已处理）
- [dev-agent-2026-11-18-分数线入口改名.md](./reports/dev-agent-2026-11-18-分数线入口改名.md) — CR-003 / T-013 ~ T-014 开发报告（G2 自检）
- [meta-agent-2026-11-18-金句栏.md](./reports/meta-agent-2026-11-18-金句栏.md) — G4 总审：通过（无 P0/P1；4 项非阻断跟进）
- [review-agent-2026-11-18-金句栏.md](./reports/review-agent-2026-11-18-金句栏.md) — G3 评审：通过（无 P0/P1；4 条 P3）
- [dev-agent-2026-11-18-金句栏.md](./reports/dev-agent-2026-11-18-金句栏.md) — CR-002 / T-006 ~ T-012 开发报告（G2 自检）
- [doc-agent-2026-11-18-金句栏.md](./reports/doc-agent-2026-11-18-金句栏.md) — CR-002 受理与开发文档交付
- [doc-agent-2026-11-18-vesta-docs-audit.md](./reports/doc-agent-2026-11-18-vesta-docs-audit.md) — 文档审计

## 最近需求

- CR-017 拆分巨型文件第二批（v2.02，G2 自检完成，待 G3）：`archive/20261119/13-拆分巨型文件第二批-需求卡.md`、`archive/20261119/14-拆分巨型文件第二批-开发文档.md`
- CR-015 发布 v2.0（v2.0，G3 首评不通过后返工待复审）：`archive/20261119/9-v2.0发布-需求卡.md`、`archive/20261119/10-v2.0发布-开发文档.md`
- CR-011 金句栏类别交互（v1.99，已交付 `f62bbe6`）：`archive/20261119/1-金句栏类别交互-需求卡.md`、`archive/20261119/2-金句栏类别交互-开发文档.md`
- CR-010 大学常识（v1.98，已交付 `7872524`）：`archive/20261118/17-大学常识-需求卡.md`、`archive/20261118/18-大学常识-开发文档.md`
- CR-009 咨询组导航顺序调整（v1.97，已交付 `ae3eedc`）：`archive/20261118/15-导航顺序调整-需求卡.md`、`archive/20261118/16-导航顺序调整-开发文档.md`
- CR-008 有效的提问（v1.96，已交付 `9478405`）：`archive/20261118/13-有效提问-需求卡.md`、`archive/20261118/14-有效提问-开发文档.md`
- CR-007 故事集迁移（v1.95，已交付 `21c4ca2`）：`archive/20261118/11-故事集迁移-需求卡.md`、`archive/20261118/12-故事集迁移-开发文档.md`
- CR-006 知识库重组（v1.94，已交付 `91b09b9`）：`archive/20261118/9-知识库重组-需求卡.md`、`archive/20261118/10-知识库与专业知识汇总-开发文档.md`
- CR-005 故事集（v1.93，已交付 `1f4f1ef`）：`archive/20261118/7-故事集-需求卡.md`、`archive/20261118/8-故事集-开发文档.md`
- CR-003 分数线入口改名（v1.92，已提交 `8a3dcf3`）：`archive/20261118/5-分数线入口改名-需求卡.md`、`archive/20261118/6-分数线入口改名-开发文档.md`
- CR-002 金句栏：`archive/20261118/3-金句栏-需求卡.md`、`archive/20261118/4-金句栏-开发文档.md`
- CR-001 学员名单分组简化（v1.90，已实施）：`archive/20261118/1-学员名单分组简化-需求卡.md`、`archive/20261118/2-学员名单分组简化-开发文档.md`
