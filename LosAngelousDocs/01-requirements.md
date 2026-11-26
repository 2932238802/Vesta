# 01 — 需求与验收标准

> 维护者：Doc Agent ｜ 状态：CR-001 已确认 ｜ 最近更新：2026-11-26
> 需求变更只升版（`R-xxx v2`），旧版内容保留在「变更历史」，不覆盖。

### R-001 仓库不再携带真实咨询稿（优先级 P0，版本 v1）

- 来源：CR-001
- 背景：`zxg/` 126 份真实学员咨询稿被 Git 跟踪，违反仓库隐私约定。
- 描述：删除工作区中的 `zxg/` 并取消 Git 追踪；`.gitignore` 拦截该目录；删除前在仓库外完成可校验备份；产品版本与相关文档同步到 v2.05。
- 成功指标：仓库索引与工作区均无 `zxg/`；备份 126 文件且 SHA256 清单存在；`npm run verify` EXIT=0。
- 验收标准：
  - AC-001-1 `git ls-files zxg` 输出为空，`find zxg -type f` 无结果。
  - AC-001-2 `.gitignore` 含 `/zxg/`；放回本地 DOCX 不会出现在 `git status`。
  - AC-001-3 仓库外备份目录含 126 个文件（6.7 MB）与逐文件 SHA256 清单。
  - AC-001-4 根 `package.json`、`package-lock.json`、`docs/reference/README.md` 版本一致为 `2.5.0` / `v2.05`。
  - AC-001-5 `npm run verify` EXIT=0；`docs/reference/00-文档索引.md` 与 `01-项目概述.md` 的版本快照与 `zxg` 状态已订正。
- NFR 影响：隐私（必须）；安全（不新增暴露面）；兼容（导入脚本不变，源文件由用户本地持有）；成本（无）。
- 影响面：`zxg/`、`.gitignore`、`package.json`、`package-lock.json`、`docs/reference/{README,00-文档索引,01-项目概述,development-history}.md`、`LosAngelousDocs/`。
- 不在范围内：Git 历史重写；数据库咨询树 / 运行记录；业务代码。
- 变更历史：v1 2026-11-26 初始

### R-002 分数线按置信度自动收录，移除人工复核与人工导入（优先级 P0，版本 v1）

- 来源：CR-002
- 背景：抓取默认 pending + 人工复核是当前主要瓶颈；每次抓取还会把 approved 打回 pending。用户要求高置信度直接入库、不再人工。
- 描述：抓取写入按 confidence ≥0.70 自动 approved、<0.70 自动 rejected；checksum 未变时保留既有审核状态；移除后台复核与人工导入的 UI / HTTP 接口；启动时迁移存量 pending；修复招生计划唯一键与考研国家线 region 校验。
- 成功指标：高置信度数据抓完即可查询；后台无复核 / 人工导入入口；重抓不降级 approved；迁移后覆盖看板与查询一致。
- 验收标准：
  - AC-002-1 新唯一键批次 `confidence >= 0.70` → 写入 `approved`，`GET /score-lines/query` 立即可见，复核队列不再出现。
  - AC-002-2 新唯一键批次 `confidence < 0.70` → 写入 `rejected`，查询不可见、覆盖不计 pending；记录、来源、失败原因保留供排查。
  - AC-002-3 同一唯一键重抓且 checksum 相同：既有 `approved` 保持 `approved`，既有 `rejected` 保持 `rejected`，既有 `pending` 按阈值迁移；不因重抓改变状态。
  - AC-002-4 同一唯一键重抓且 checksum 变化：高置信度 → `approved`；低置信度且此前为 `approved` → **不覆盖旧 approved**，保留旧值并写结构化日志（防止数据消失）；低置信度且无旧 approved → `rejected`。
  - AC-002-5 后台不再出现「复核」「人工导入」按钮 / 弹窗 / 计数；对应前端组件与 API 调用移除。
  - AC-002-6 `POST /api/admin/score-lines/import`、`GET /api/admin/score-lines/review`、`GET /api/admin/score-lines/review/count`、`POST /api/admin/score-lines/review` 返回 404（路由已移除）。
  - AC-002-7 启动迁移：现有 `pending` 批次按 confidence ≥0.70 → approved、<0.70 → rejected；现有 `pending` 招生计划按 trusted → approved；迁移标记幂等（重启不重复处理）；受影响学校的 `school_coverage` 重新计算，不再残留 pending。
  - AC-002-8 `school_programs` 唯一键补 `major_name`；空 `major_code`、不同专业名可同时存在；`upsertProgram` 与 `scripts/scoreline-apply.ts` 使用新键；迁移可重复执行且不丢存量。
  - AC-002-9 `validateImportPayload` 对 `scope=national + exam=postgrad` 要求 `region` 为 A区 / B区；解析器已按 A/B 写入不受影响；正反用例更新。
  - AC-002-10 `docs/reference/` 的抓取 / 导入 / 复核 / 数据模型 / 接口契约 / 测试步骤同步到新口径；`npm run verify` EXIT=0；关键页面手工走查。
- NFR 影响：兼容（存量库迁移）、可观测（自动通过 / 拒绝 / 跳过覆盖 / 迁移计数日志）、性能（只处理 pending + 受影响覆盖）、隐私与安全不新增外泄。
- 影响面：`server/src/score-lines/*`、`server/src/routes/admin/score-lines*`、`server/src/db/migrations*`、`shared/src/score-line*`、`web/src/views/admin/ScoreLines.vue`、`web/src/views/admin/score-lines/*`、`web/src/api/*`、`docs/reference/*`、`scripts/scoreline-apply.ts`。
- 不在范围内：抓取 running 残留自愈、快照定时清理、种子覆盖 URL、重定向 SSRF、facets / minimums / 前端竞态。
- 变更历史：v1 2026-11-26 初始（G0 已确认）
