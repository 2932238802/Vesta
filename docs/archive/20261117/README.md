# 20261117 需求索引

> 用途：2026-11-17 的需求方案与实施台账。具体方案看各自文件，本文件只做汇总与复核。
> 最后核对：2026-11-17。

---

## 一、状态总览

| # | 文件 | 需求 | 类型 | 状态 | 产品版本 |
| --- | --- | --- | --- | --- | --- |
| 1 | [1-学员名单咨询状态与手工优先级-开发文档.md](./1-学员名单咨询状态与手工优先级-开发文档.md) | 学员名单增加「是否咨询 / 咨询结果 / 手工优先级」，自动 A/B/C 下线，答题者看不到档位；v1.2 咨询结果收窄为三选一 | 需求变更 | **已实施**（v1.86，口径调整 v1.87） | v1.86 / v1.87 |
| 2 | [2-学员名单分组与归档-开发文档.md](./2-学员名单分组与归档-开发文档.md) | 学员名单增加自定义分组（多对多）、删除分组、最后一个组移除后自动归档；归档区放在名单下方 | 需求变更 | **已实施**（v1.88） | v1.88 |

状态口径：**已实施** = 代码已改、验证已跑、方案文档补了实施记录；**待实施** = 方案已写、代码没动；**待确认** = 产品口径还没最终确认。

---

## 二、证据与复核

### 1 学员名单咨询状态与手工优先级 —— 已实施（v1.86）

- **代码**：`invites` 三列（`server/src/db/schema.ts`、`migrations.ts`）；名单 GET/PATCH（`server/src/routes/admin/roster.ts`）；CSV / 列表 / 详情（`server/src/routes/admin/submissions.ts`）；首页 recent（`overview.ts`）；公开脱敏（`server/src/report-privacy.ts`、`server/src/routes/public.ts`、`shared/src/doc.ts`）；名单交互（`web/src/views/admin/submissions/*`、`Submissions.vue`）；连带展示（`Dashboard.vue`、`SubmissionDetail.vue`、`ConsultImportDialog.vue`、`useConsultImport.ts`）。
- **验证**：临时 `DATA_DIR` 接口用例 + `npm run typecheck` / `check:size` / `build` + Playwright 走查名单、详情、首页、咨询导入、公开报告；详见 `docs/development-history.md`「本轮（2026-11-17）」。
- **证据**：`docs/development-history.md`「本轮（2026-11-17）」；本文件与方案文档 §十三「实施记录」。
- **提交**：`6748c9a`（v1.86）；v1.2 三选一调整见方案文档 §十四（v1.87）。
- **部署**：新增列由启动迁移自动补，更新走 `bash update.sh`；回滚 `git revert` 本需求提交，已写入的咨询字段保留在库中。

### 2 学员名单分组与归档 —— 已实施（v1.88）

- **方案**：`docs/archive/20261117/2-学员名单分组与归档-开发文档.md` v1.0 + §十三「实施记录」。
- **代码**：数据层（`server/src/db/schema.ts`、`server/src/db/roster-groups.ts`、`migrations.ts`）；分组接口（`server/src/routes/admin/roster-groups.ts`、`index.ts`）；名单 GET / 批量删除（`server/src/routes/admin/roster.ts`）；邀请创建删除连带清理（`server/src/routes/admin/invites.ts`）；前端组件与状态（`web/src/views/admin/submissions/*`、`Submissions.vue`、`web/src/api/{types,admin}.ts`）。
- **核心设计**：复用 `roster_groups` 并增加 `is_default`，新增多对多 `roster_group_members`；归档是 `NOT EXISTS` 有效组的派生结果，不建归档表；启动迁移保留旧组和 `invites.group_id` 归属，未归属邀请进默认组；新邀请自动进默认组。
- **验证**：临时 `DATA_DIR` 覆盖全新库与旧库迁移、四个分组接口与名单筛选；Playwright 走查分组筛选 / 批量加入 / 新建组 / 多组 chip / 移出本组 / 最后一组归档 / 归档折叠与加回 / 分组管理删除 / URL 兼容；`npm run verify` 全绿。
- **提交**：`0275a97`（v1.88）。
- **部署**：更新走 `bash update.sh`，新增表和列由启动迁移自动执行；回滚 `git revert` 本需求提交，被软删除的分组不会自动恢复。
