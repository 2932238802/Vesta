# 04 — 任务与追溯

> 维护者：Doc 建任务；Dev 只更新状态与追溯矩阵 ｜ 状态：CR-001 任务完成 ｜ 最近更新：2026-11-26
> 任务状态只用：TODO / DOING / DONE / BLOCKED / DROPPED

### T-001 备份并移除 zxg 追踪（状态：DONE）

- 来源：CR-001 / R-001（v1）
- 关联需求：R-001 / AC-001-1、AC-001-2、AC-001-3
- 目标：备份 126 个文件到仓库外，`git rm -r zxg`，`.gitignore` 增加 `/zxg/`。
- 涉及文件/模块：`zxg/`、`.gitignore`
- 前置依赖：用户确认删除（2026-11-26）。
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`git ls-files zxg` = 0；`find zxg -type f` = 0；备份 `find | wc -l` = 126 + SHA256 清单。
- 回归范围：无业务代码；导入脚本仍可运行（源文件由用户放回）。
- 发布/回滚：回滚 = 从备份拷回 + 删除 `.gitignore` 规则 + `git add zxg`。
- 风险：Git 历史仍含旧副本；备份需妥善保管。
- 规模：S

### T-002 版本与产品文档同步（状态：DONE）

- 来源：CR-001 / R-001（v1）
- 关联需求：R-001 / AC-001-4、AC-001-5
- 目标：`2.4.0 → 2.5.0`；同步 `package-lock.json`、`docs/reference/README.md`、`00-文档索引.md`、`01-项目概述.md`、`development-history.md`。
- 涉及文件/模块：版本文件与 `docs/reference/`
- 前置依赖：T-001
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run check:version`；`npm run verify`。
- 回归范围：文档守卫、构建。
- 发布/回滚：随本次 commit；回滚 `git revert`。
- 风险：历史文档中的旧版本号按原样保留，不回写。
- 规模：S

### T-003 工作流记录与基线复验（状态：DONE）

- 来源：CR-001 / R-001（v1）
- 关联需求：R-001 / AC-001-5
- 目标：回填 `LosAngelousDocs/` 的 CR / STATUS / CHANGELOG / 决策 / 报告 / WORKLOG，并复跑 `verify`。
- 涉及文件/模块：`LosAngelousDocs/`、`PROJECT_BRAIN.md`
- 前置依赖：T-001、T-002
- DoR：AC 可测 / 依赖就绪 / 关键决策已记录 / 影响面已分析 / 测试数据与环境可用
- 验证方式：`npm run verify` EXIT=0；`$LOSSKILL_HOME/scripts/check-docs.sh LosAngelousDocs`。
- 回归范围：文档一致性。
- 发布/回滚：无。
- 风险：双轨文档需保持同步。
- 规模：S

## AC ↔ 验证追溯矩阵

| AC | 验证方式（自动化测试 / 手工步骤） | 对应任务 | 状态 |
|---|---|---|---|
| AC-001-1 | `git ls-files zxg`；`find zxg -type f` | T-001 | 已验证 |
| AC-001-2 | `grep -n '^/zxg/$' .gitignore`；放回文件后 `git status` | T-001 | 已验证 |
| AC-001-3 | 备份目录 `find | wc -l` = 126；SHA256 清单存在 | T-001 | 已验证 |
| AC-001-4 | `npm run check:version` | T-002 | 已验证 |
| AC-001-5 | `npm run verify`；文档 diff 复核 | T-002 / T-003 | 已验证 |
