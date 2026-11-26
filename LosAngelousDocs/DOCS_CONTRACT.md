# 文档树契约（DOCS_CONTRACT）

> 维护者：Doc Agent ｜ 生成：`scripts/init-docs.sh` ｜ 校验：`scripts/check-docs.sh`
> 本文件所在目录是**文档根目录**，默认命名为 `LosAngelousDocs/`，不使用 `docs/`（避免与项目自带 docs 重名）。
> 规则：文档根目录下只允许本文件登记的文件/目录。新增路径必须由 Doc 提案、用户批准，并在本文件登记后创建；Agent 不得自建。
> 本文件由 LosSKILL 的 `scripts/check-docs.sh` 校验；核心条目缺失会直接报 ERROR。
>
> **与 Vesta 旧约定的区别（2026-11-26 用户确认）**：本工作流文档树**不按日建 `archive/261126`**；CR / R / AC / T 在根目录 `00`–`05`，角色报告在 `reports/`，已完结报告归档到 `reports/archive/`。仓库既有的 `docs/archive/YYYYMMDD/` 是 Vesta 产品历史文档，不属于本树。

## 1. 单一事实来源（One fact, one home）

| 事实 | 唯一落点 | 其它位置只允许 |
|---|---|---|
| 项目定位 / 运行方式 / 术语 / 构建测试基线 | `00-overview.md` | `PROJECT_BRAIN.md` §1 只放链接 |
| CR 需求卡与假设 A | `00-requirements-intake.md` | `STATUS.md` 只引用编号 |
| 需求 R 与验收标准 AC | `01-requirements.md` | `04-tasks.md` 只引用编号 |
| 架构 / 模块边界 / 数据流 | `02-architecture.md` | 大脑 §2 一行索引 |
| 接口 / 数据模型 / 流程 / 配置 | `03-design.md` | `02-architecture.md` 只引用 |
| 任务 T / DoR / 追溯矩阵 | `04-tasks.md` | `STATUS.md` 只列进行中 |
| 决策 D 全文 | `05-decisions.md` | 大脑 §8 一行索引 |
| 当前门禁 / 进行中 / 阻塞 | `STATUS.md` | 其它文件不复制当前状态 |
| 历史活动 | `WORKLOG.md`（项目根） | 报告只写证据 |
| 用户可见变更 | `CHANGELOG.md` | — |
| 授权台账 | `AUTHORIZATIONS.md`（项目根） | 报告只引用 `AUTH-*` |
| 大脑 / 模块卡 | `PROJECT_BRAIN.md` + `brain/modules/`（项目根） | 文档只引用 |
| 角色报告 | `reports/<角色>-<YYYY-MM-DD>-<范围>.md` | — |
| 评审记忆 | `reports/review-index.md` | — |
| CI 产物 | `ci/`、`reports/ci/`（MCP 写） | Agent 只读，不手写 |
| 产品口径（外部） | 仓库既有 `docs/`（问卷 / 报告 / 咨询 / 架构 / 数据 / 部署 / 开发历史） | 本树只引用路径，不复制内容；产品变更仍按 `AGENTS.md` 先改 `docs/` |

## 2. 允许的路径

```text
# doc-contract-v1
# kind | path | owner | purpose
file | DOCS_CONTRACT.md | Doc | 文档树契约与索引（唯一入口）
file | STATUS.md | Doc | 当前状态面板
file | 00-overview.md | Doc | 项目定位/运行方式/术语/已知限制
file | 00-requirements-intake.md | Doc | CR 需求卡与假设台账
file | 01-requirements.md | Doc | 需求 R 与验收标准 AC
file | 02-architecture.md | Doc | 架构/模块边界/数据流
file | 03-design.md | Doc | 接口契约/数据模型/流程/配置
file | 04-tasks.md | Doc | 任务 T/DoR/追溯矩阵
file | 05-decisions.md | Doc/Dev | 决策 D（只追加）
file | CHANGELOG.md | Dev | 用户可见变更
dir | reports | 各角色 | 角色报告与评审记忆
dir? | reports/archive | Steward | 已完结 CR 的报告归档
dir? | reports/ci | ci-artifacts MCP | CI 同步产物（只读）
dir? | assets | Doc/Dev | 文档引用的图片/图表
dir? | ci | ci-artifacts MCP | CI 下载物（只读）
```

`kind` 含义：`file` 必须存在；`dir` 必须存在；`dir?` 允许存在，不存在也不报错。
`00`–`05` 六个编号文档默认是单个文件；超过约 400 行时，Doc 可改为同名目录（`02-architecture/`），目录内必须有 `README.md` 作为索引，且不得同时保留 `02-architecture.md`。

## 3. 写入规则

- **只写自己维护的路径**：Doc 写 00–05、STATUS、契约；Dev 写 CHANGELOG、04 状态与追溯矩阵、03 的变更提议、05 的追加决策；Review 只写报告与 review-index；Steward 写大脑与归档。
- **报告命名固定**：`reports/<角色>-<YYYY-MM-DD>-<范围>.md`，角色只能是 `doc` / `dev` / `review` / `meta` / `steward` / `spike`；`reports/` 下不得再建其它子目录（`archive/`、`ci/` 除外）。
- **归档**：CR 结束后由 Steward 把该 CR 报告移到 `reports/archive/`，不删除。
- **CI 区域只读**：`ci/` 与 `reports/ci/` 由 ci-artifacts MCP 写入，Agent 只读，不手写、不新建其它 CI 目录。
- **新增路径**：Doc 先向用户说明用途、与现有路径的重叠、维护者，获批准后更新本文件与 `check-docs.sh`，再创建；未登记路径在 G1/G3/G4 都会被拦截。
- **CI 目录**：本文件声明了 `ci/` 与 `reports/ci/`；它们的默认落点由 ci-artifacts MCP 配置为 `LosAngelousDocs/ci` 与 `LosAngelousDocs/reports/ci`。
- **用户注释保护**：`LosAngelous:` / `LOS:` 注释原样保留，不得整文件重写。
