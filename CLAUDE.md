# Vesta · Claude Code 入口

本仓库的完整 Agent 规则在 [AGENTS.md](./AGENTS.md)，**先完整读它**，再读 [docs/agent-rules.md](./docs/agent-rules.md) 和对应模块文档。

三条硬性要求：

1. **文档优先**：先改 `docs/` 再改代码；代码与文档冲突时按文档修正代码，并在 `docs/development-history.md` 记录变更。
2. **交付前跑 `npm run verify`**（= `check:docs` + `typecheck` + `build`），没全绿不算完成；关键页面还要手工走查。
3. **不熟的 API/库不猜**：用 context7 MCP 查官方文档，页面走查用 playwright MCP；仍然不确定就停下来问。
