# 20261117 需求索引

> 用途：2026-11-17 的需求方案与实施台账。具体方案看各自文件，本文件只做汇总与复核。
> 最后核对：2026-11-17。

---

## 一、状态总览

| # | 文件 | 需求 | 类型 | 状态 | 产品版本 |
| --- | --- | --- | --- | --- | --- |
| 1 | [1-学员名单咨询状态与手工优先级-开发文档.md](./1-学员名单咨询状态与手工优先级-开发文档.md) | 学员名单增加「是否咨询 / 咨询结果 / 手工优先级」，自动 A/B/C 下线，答题者看不到档位 | 需求变更 | **已实施**（产品版本 v1.86） | v1.86 |

状态口径：**已实施** = 代码已改、验证已跑、方案文档补了实施记录；**待实施** = 方案已写、代码没动；**待确认** = 产品口径还没最终确认。

---

## 二、证据与复核

### 1 学员名单咨询状态与手工优先级 —— 已实施（v1.86）

- **代码**：`invites` 三列（`server/src/db/schema.ts`、`migrations.ts`）；名单 GET/PATCH（`server/src/routes/admin/roster.ts`）；CSV / 列表 / 详情（`server/src/routes/admin/submissions.ts`）；首页 recent（`overview.ts`）；公开脱敏（`server/src/report-privacy.ts`、`server/src/routes/public.ts`、`shared/src/doc.ts`）；名单交互（`web/src/views/admin/submissions/*`、`Submissions.vue`）；连带展示（`Dashboard.vue`、`SubmissionDetail.vue`、`ConsultImportDialog.vue`、`useConsultImport.ts`）。
- **验证**：临时 `DATA_DIR` 接口用例 + `npm run typecheck` / `check:size` / `build` + Playwright 走查名单、详情、首页、咨询导入、公开报告；详见 `docs/development-history.md`「本轮（2026-11-17）」。
- **证据**：`docs/development-history.md`「本轮（2026-11-17）」；本文件与方案文档 §十三「实施记录」。
- **部署**：新增列由启动迁移自动补，更新走 `bash update.sh`；回滚 `git revert` 本需求提交，已写入的咨询字段保留在库中。
