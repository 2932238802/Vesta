---
name: vesta-dev
description: Vesta 仓库的开发流程：先读文档与 agent 规则，按文档口径实现，交付前跑 npm run verify
whenToUse: 在 ~/LosAngelous/Vesta 或 /opt/vesta 修改问卷、报告、咨询系统、部署脚本之前
---

# Vesta 开发流程

1. 读仓库根 `AGENTS.md` 和 `docs/agent-rules.md`；问卷 / 报告 / 评分相关再读 `docs/规划自测问卷-设计文档.md`。
2. 需求变更：**先改 `docs/`**（含 `docs/development-history.md` 记录），再改代码；冲突以文档为准。
3. 实现时遵守 `docs/agent-rules.md` 的产品、AI、数据、认证约束（不伪装 AI 成功、不重置咨询树、生产必须鉴权）。
4. 交付前跑 `npm run verify`（`check:docs` + `typecheck` + `build`），并手工走查关键页面。
5. 不熟的库/API：用 context7 MCP 查官方文档；页面走查用 playwright MCP；都不确定就停下来问。
6. 本地变量已配好：AI 走 WSL 全局 `~/.profile` 的 `ai-gateway-dev` 块（`AI_BASE_URL`/`AI_MODEL`/`AI_API_KEY`），项目变量在仓库 `.env`（admin/admin、`BOCHA_*`）。别重复配、别提交、别打印 key；模型先查 `$AI_BASE_URL/models`（该网关没有 `deepseek-chat`，用 `deepseek-v4-flash`）。
7. 汇报：改了哪些文件、对应文档哪一节、验证结果、遗留事项。
