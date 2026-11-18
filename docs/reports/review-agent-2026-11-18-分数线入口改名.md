# 评审报告：CR-003 分数线入口改名（G3）

> 角色：Review Agent ｜ 日期：2026-11-18 ｜ 范围：CR-003 / T-013、T-014（v1.92）
> 基线：HEAD `1641845`，工作区未提交 ｜ 评审类型：首次评审
> 结论：**有条件通过**（无 P0/P1；3 项 P2，2 项 P3）
> 落盘说明：Review SubAgent 运行时未写盘，本文件由 Doc Agent 按评审原文如实落盘。

## 1. 基线

- 代码 4 个文件（3 处文案 + `package.json`），文档 7 个已改文件 + 2 个新增需求/开发文档 + 3 个报告；不含已交付的 CR-002 代码。
- G1 已确认；DoR 满足。关联需求 R-003 v1；AC-003-1 ~ AC-003-7。
- 必须满足的契约：`/admin/score-lines` 路由不变；`to` / `active-class` / `aria-*` / `class` 不变；一级分组仍为“分数线”；`eyebrow` 与副标题不变；接口、数据、权限零变化。

## 2. AC 判定

| AC | 判定 | 证据（独立复验） |
| --- | --- | --- |
| AC-003-1 | 满足 | 第三组标题 `分数线`；组内唯一链接文本 `升学分数线查询`、`href=/admin/score-lines`；点击后高亮、`aria-expanded=true` |
| AC-003-2 | 满足 | `.page-title=升学分数线查询`；`.eyebrow=内部查询`；副标题逐字一致 |
| AC-003-3 | 满足 | `document.title=升学分数线查询 · 管理后台`；切学员名单后正确切换，无旧名残留 |
| AC-003-4 | 满足 | 直连路由正常；5 个功能按钮与弹窗可用；facets/coverage 200，无 token 401；后端零改动 |
| AC-003-5 | 满足 | 11 个入口文案与顺序逐项一致；4 个分组一致 |
| AC-003-6 | 满足 | 390×844：页面与导航无溢出；新文案 nowrap 宽 111px；导航链接两两不重叠 |
| AC-003-7 | 满足 | `npm run verify` EXIT=0；`package.json=1.92.0 ↔ README 最高 v1.92` |

## 3. 验证执行

- `npm run verify` → EXIT=0（check:docs / check:size / check:version / check:deps / check:dates / check:score / check:audit / check:roster / check:search / typecheck / build 全绿）。
- 独立服务：`PORT=18788 DATA_DIR=/tmp/vesta-review-data`，评审后停止；未触碰 8799 / 18799。
- 独立 Playwright：24 项 AC 断言 + 2 项 390px 断言，**26/26 PASS**，控制台零错误。
- 接口冒烟：`facets` 200、`coverage` 200、无 token 401。
- `git diff -- web/src` 仅 3 行字面量，无调试残留、无依赖/锁文件变更。

## 4. 缺陷清单

### [P2] 参考文档未同步入口名称与当前版本状态
- 位置：`docs/reference/README.md:307`；`docs/reference/09-测试与验证.md:214/222/224`
- 问题：README“主要页面”仍写“分数线：分数线”；09 仍写根版本 `1.91.0` 与“v1.91 交付前完整运行”。
- 影响：文档与实现不一致，误导后续开发/运维/Agent；不影响运行时。
- 建议：README 改为“分数线：升学分数线查询（仅管理后台内部查询）”；09 更新为 `1.92.0` 并补 v1.92 走查结论。
- **处理**：已由 Doc 修正（`README.md` 主要页面、`09` 版本行与两行 v1.92 记录）。

### [P2] 需求卡状态行仍为“待确认（G0）”
- 位置：`docs/archive/20261118/5-分数线入口改名-需求卡.md:3`、`:62`
- 问题：与开发文档、STATUS、archive README 的“G0/G1 已确认”矛盾。
- 影响：门禁追溯自相矛盾，可能被误判为 G0 未确认。
- 建议：改为“已确认（G0，方案 A；G1 已确认）”。
- **处理**：已由 Doc 修正（头部与结尾状态行）。

### [P2] 改文档标点迁就 `check-version`，脚本真实缺陷未处理
- 位置：`docs/reference/README.md:13`；`scripts/check-version.mjs:51-54`
- 问题：脚本 `split(/；|后续/)[0]` 在首个「；」截断；v1.91 条目含「；」导致 v1.92 不被计入，本次改标点绕过。标点改动语义不变（逐字比对仅标点差异），但缺陷仍在：未来条目含「；」且其后有更高版本时可能假阴性。
- 建议：本轮接受标点规范化；另立任务修脚本（只以「后续」为终止符，或先剔除括号再匹配），并记录 Owner/截止。
- **处理**：已记入 `docs/STATUS.md` 排队项“工具修复：`check-version.mjs` 截断缺陷（待立项）”，建议并入 CR-004；本轮不改脚本。

### [P3] 需求卡现状盘点漏列用户可见控件
- 位置：`5-分数线入口改名-需求卡.md:24`；`score-lines/ReviewView.vue:12`；`score-lines/ChartCard.vue:190`
- 问题：复核弹窗页签“分数线”与图表 `aria-label`“分数线趋势”也是可见控件，盘点称“均为正文说明”不准确。
- 影响：盘点表述；本轮明确不改，不构成功能缺陷。
- **处理**：需求卡已补一句，明确两处不在本次范围。

### [P3] 提交范围混入其他文档
- 位置：`4-金句栏-开发文档.md`、`reference/README.md`（v1.91 commit 回填）、`development-history.md`、`STATUS.md`、`archive/20261118/README.md`、`7/8-故事集` 新增文档
- 问题：直接整体提交会违反“一个需求一个 commit”。
- 建议：按 CR 拆分提交；v1.91 标点修正属 CR-003 必要修正可保留（commit message 说明）。
- **处理**：提交时按 CR 拆分（见 G4 / 提交计划）。

## 5. 已检查无问题

三处单行字面量替换；分组标题、`eyebrow`、副标题、`class`/`to`/`aria-*` 未动；后端/数据库/接口/权限/依赖零改动；无调试残留；v1.91 commit `1641845` 回填准确；未发现 CR-002 文档内容丢失；用户注释 `LosAngelous:` / `LOS:` 全仓 11 处均为历史报告说明文字，diff 中 0 处改动。

## 6. 残留风险

- 评审期间工作区被并发修改（CR-005 文档）；CR-003 代码 diff 保持稳定（hash `58beeaf5…`），提交前需重新确认基线。
- 项目无自动化 UI 测试，导航文案回归靠手工/临时脚本。
- 版本表 v1.92 commit 列仍为“待发布”，提交后需回填。
- `check-version` 截断缺陷仍在。

## 7. 结论与交接

- **G3 结论：有条件通过**（3 项 P2 已由 Doc 修正或登记为后续项，无 P0/P1）。
- 交给：**Meta Review Agent（G4）**。
- 材料：本报告、Dev 报告 `docs/reports/dev-agent-2026-11-18-分数线入口改名.md`、需求卡与开发文档、验证日志 `/tmp/vesta-review-work/verify.log`、Playwright 脚本 `/tmp/vesta-review-work/ac-check.cjs`、基线 HEAD `1641845`。
