# STATUS — Vesta

> 维护者：Doc Agent ｜ 最近更新：2026-11-28
> 本文件只写「现在」；历史看 `WORKLOG.md`，架构看 `PROJECT_BRAIN.md`。

- 当前产品版本：v2.11（`package.json` 2.11.0）；CR-007 G4 通过并已提交 `8330a9e`
- 当前 CR：CR-007 抓取安全与解析去重
- 当前门禁：G4 通过（CR-007；待发布）
- G1 已确认：是（用户 2026-11-28）
- 通道：完整
- 并行组：无
- 记录根：项目根
- G3 已接受：CR-004 是；CR-005 是；CR-003 是；CR-006 是（AUTH-20261128-001，提交 d0cff71）
- G3.5 豁免：是（CR-007 抓取安全单模块，G3 已覆盖）
- G4 结果：CR-006 通过；CR-005 通过；CR-004 通过；CR-003 通过；CR-002 有条件通过已收尾
- 进行中任务：无；CR-007 T-026 ~ T-029 DONE
- 阻塞：无
- 文档根：`LosAngelousDocs/`（工作流 + 产品口径）；原 `docs/` 已移出工作区（备份 `_vesta-backups/docs-20261126-2010`）
- 基线：2026-11-28 `npm run verify` EXIT=0（含 CR-007 重定向 / 限流 / blocked / 多表去重与返工补强用例）；CR-006 `d0cff71`、CR-005 `6ae6f9a`、CR-004 `0ee4fe7`、CR-003 `2ace46b` 已提交
- 排队：无
- 下一步：发布走 `bash update.sh`；上线后运行 `npx tsx scripts/scoreline-crawl-status.ts` 检查队列/来源状态
- 最近报告：`LosAngelousDocs/reports/dev-2026-11-28-CR-007-抓取安全与解析去重-返工.md`（G2 返工）
