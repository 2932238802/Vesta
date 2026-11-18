> 维护者：Doc Agent ｜ 最近更新：2026-11-18 ｜ 状态：草稿（待用户复核）

# Vesta 文档索引

`docs/` 只放入口索引。工程全貌与全局参考在 `reference/`，历史方案在 `archive/`。

| 入口 | 内容 |
| --- | --- |
| [reference/README.md](./reference/README.md) | 工程全貌：技术栈、本地开发、生产部署、环境变量、报告生成、版本记录 |
| [reference/](./reference/) | 全局参考：项目概述、架构、对外契约、数据模型、部署、排障、测试（基线 v1.85 + 定点勘误） |
| [reference/agent-rules.md](./reference/agent-rules.md) | Agent 硬约束与文档维护规则 |
| [reference/consult-system.md](./reference/consult-system.md) | 咨询目的树、咨询稿生成与收藏栏口径 |
| [reference/规划自测问卷-设计文档.md](./reference/规划自测问卷-设计文档.md) | 问卷与报告的唯一口径 |
| [reference/development-history.md](./reference/development-history.md) | 历次需求与决策记录，回答“为什么这样做” |
| [archive/](./archive/) | 历史需求方案与实施台账，按 `YYYYMMDD` 归档 |
| [reports/](./reports/) | 审计 / 评审报告 |

- 版本号唯一事实源是根 `package.json`；版本记录在 `reference/README.md` 的「已完成 / 版本记录」。
- 新增文档必须在上表登记，避免再出现“找不到入口”的重复文件。
- 本索引不承载工程细节；需要运行、部署、环境变量时读 `reference/README.md`。
