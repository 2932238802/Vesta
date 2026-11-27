# STATUS — Vesta

> 维护者：Doc Agent ｜ 最近更新：2026-11-27
> 本文件只写「现在」；历史看 `WORKLOG.md`，架构看 `PROJECT_BRAIN.md`。

- 当前产品版本：v2.09（`package.json` 2.9.0）；CR-005 G3 有条件通过，P2/P3 返工完成待复审
- 当前 CR：CR-005 前端去人工抓取 + 吉林两校服务器导入
- 当前门禁：G4（CR-005 待总审；CR-003 已通过）
- G1 已确认：是（CR-005 用户 2026-11-27 确认三按钮全删 / 接口一起删 / 两校 dry-run+write / 只删顶部副标题）
- 通道：完整
- 并行组：无
- 记录根：项目根
- G3 已接受：CR-004 是（AUTH-20261127-001）；CR-005 是（AUTH-20261127-004，提交 6ae6f9a）；CR-003 是（AUTH-20261127-002）
- G3.5 豁免：是（CR-003 docs/流程变更，无业务模块交互）
- G4 结果：CR-004 通过；CR-003 通过（2026-11-27，A2 `AUTH-20261127-003` 已补记）；CR-002 有条件通过已收尾
- 进行中任务：T-018 ~ T-021（CR-005）DONE
- 阻塞：无
- 文档根：`LosAngelousDocs/`（工作流 + 产品口径）；原 `docs/` 已移出工作区（备份 `_vesta-backups/docs-20261126-2010`）
- 基线：2026-11-27 `npm run verify` EXIT=0（含 `check:import-jilin`）；CR-004 `0ee4fe7`、CR-003 `2ace46b`、CR-005 `6ae6f9a` 已提交
- 排队：无
- 下一步：推送 CR-005 + CR-003 G4 报告，等 CI success；Meta 做 CR-005 G4 总审；发布走 `bash update.sh`
- 最近报告：`LosAngelousDocs/reports/dev-2026-11-27-CR-005-前端去人工抓取-返工.md`；`LosAngelousDocs/reports/review-2026-11-27-CR-005-前端去人工抓取.md`
