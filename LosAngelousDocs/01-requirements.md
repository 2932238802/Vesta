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
