# Vesta · Claude Code 入口

本仓库的完整 Agent 规则在 [AGENTS.md](./AGENTS.md)，**先完整读它**，再读 [PROJECT_BRAIN.md](./PROJECT_BRAIN.md) 与 [LosAngelousDocs/](./LosAngelousDocs/)。

工作流：开工第 0 步先读 [PROJECT_BRAIN.md](./PROJECT_BRAIN.md)；需求 / AC / 任务 / 评审 / 决策记录在 [LosAngelousDocs/](./LosAngelousDocs/)。产品说明文档（原 `docs/`）已于 v2.08 移出工作区，只留仓库外备份 `D:/PROJECT/_vesta-backups/docs-20261126-2010` 与 Git 历史。

三条硬性要求：

1. **文档优先**：先改 `LosAngelousDocs/` 再改代码；代码与文档冲突时按文档修正代码，并在 `LosAngelousDocs/CHANGELOG.md` 或 `05-decisions.md` 记录变更。
2. **交付前跑 `npm run verify`**（= `check:docs` + `check:size` + `check:version` + `check:deps` + `check:dates` + `check:question` + `check:score` + `check:scoreline` + `check:audit` + `check:roster` + `check:search` + `typecheck` + `build`），没全绿不算完成；关键页面还要手工走查。
3. **不熟的 API/库不猜**：用 context7 MCP 查官方文档，页面走查用 playwright MCP；仍然不确定就停下来问。
