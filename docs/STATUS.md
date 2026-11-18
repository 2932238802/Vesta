# 项目状态面板

> 维护者：Doc Agent ｜ 最近更新：2026-11-18 ｜ 状态：进行中
> 本文件只记录当前状态，不承载需求细节；细节看对应文档。

## 当前

| 项 | 内容 |
| --- | --- |
| 当前 CR | CR-005 故事集（v1.93 已交付） |
| 当前门禁 | **G4 通过**（CR-005，2026-11-18，Meta 总审：通过，无返工）；commit `1f4f1ef` 已推送 |
| 进行中任务 | 无；CR-005 已交付，待用户执行 `bash update.sh` 发布 v1.93 |
| 阻塞 | 无 |
| 下一步 | 用户发布 v1.93；CR-006 待 G1 确认后启动 |
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

- **知识库重组（CR-006）**：G0 已确认（「知识库 & 数据库」、收藏栏只隐藏、Markdown、空页面）；开发文档 `archive/20261118/10-知识库与专业知识汇总-开发文档.md` 已写，**待 G1**。
- **服务器清理与运维优化（CR-004）**：勘察已暂停，报告见 `docs/reports/doc-agent-2026-11-18-服务器清理-现状勘察.md`；恢复后先出 CR-004 需求卡（G0）。
- **`stories.ts` 拆分（CR-005 后续）**：文件恰好 400 行，下次触碰先拆 `server/src/routes/consult/storyCategories.ts`。
- **故事集全量 GET 观察项**：超过约 200 篇或响应 > 5MB 时加分页/虚拟滚动；首期不实现。
- **旧库 `pinned_at` 兼容**：未上生产；旧本地库缺列会启动失败，需删库或换 `DATA_DIR`（已写入 `08-排障手册`）。
- **工具修复：`check-version.mjs` 截断缺陷（待立项）**：脚本按「已完成」行首个「；」截断（`scripts/check-version.mjs`），本轮 v1.91 条目含「；」导致 v1.92 不被计入，Dev 把该处「；」改成「，」绕过。语义未变，但缺陷仍在，建议另立 CR（可并入 CR-004 运维优化）。

## 最近报告

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

- CR-005 故事集（v1.93，已交付 `1f4f1ef`）：`archive/20261118/7-故事集-需求卡.md`、`archive/20261118/8-故事集-开发文档.md`
- CR-003 分数线入口改名（v1.92，已提交 `8a3dcf3`）：`archive/20261118/5-分数线入口改名-需求卡.md`、`archive/20261118/6-分数线入口改名-开发文档.md`
- CR-002 金句栏：`archive/20261118/3-金句栏-需求卡.md`、`archive/20261118/4-金句栏-开发文档.md`
- CR-001 学员名单分组简化（v1.90，已实施）：`archive/20261118/1-学员名单分组简化-需求卡.md`、`archive/20261118/2-学员名单分组简化-开发文档.md`
