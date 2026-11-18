# Vesta 文档差异审计与定点勘误报告

> 维护者：Doc Agent ｜ 日期：2026-11-18 ｜ 状态：草稿（待用户复核）

## 1. 本次参数

| 项 | 值 |
| --- | --- |
| 项目 | `/home/losangelous/LosAngelous/Vesta` |
| 文档根目录 | `/home/losangelous/LosAngelous/Vesta/docs`（更新已有） |
| 目标类型 | B. 审计并补齐现有文档（仅文档整理，无 CR） |
| 用户选择范围 | 审计 + 定点修正；`docs/` 根目录只保留入口索引，长期口径统一迁入 `reference/`，一种功能一个文件；不新建平行标准文档 |
| G0 | 跳过：本次无新增 / 变更需求，仅文档整理 |
| G1 | 不适用：本次不新增 R / AC / T |
| 代码 HEAD | `70d8225`（`1.89.0`） |
| 快照基线 | `docs/reference/` 生成于 `884ef39`（`1.85.0`） |
| 目录调整 | 2026-11-18 用户决定：`docs/261116/` → `docs/reference/`；`README` / `agent-rules` / `consult-system` / `规划自测问卷` / `development-history` 迁入 `docs/reference/`；`docs/archive/` 保留 |

## 2. 差异审计

| 检查项 | 判定 | 证据 | 处理 |
| --- | --- | --- | --- |
| 长期源文档是否最新 | 是 | `docs/reference/README.md` 的「版本记录」已含 v1.89；`check:version` 退出 0 | 保持，仅补职责映射 |
| 快照版本 | 过时 | `docs/reference/manifest.json:4-5` 为 `1.85.0` / `884ef39`；当前 `package.json:4` 为 `1.89.0` | 定点勘误 + 标注快照状态 |
| 数据模型表数 | 冲突 | 快照 `06-数据模型.md:28` 写 26 张；`server/src/db/schema.ts` 现为 27 张（新增 `roster_group_members`） | 已改为 27 张 / 36 索引 |
| `roster_groups` 语义 | 冲突 | 快照写“只留存量、代码不再读写”；`server/src/db/schema.ts:38-53` 与 `roster-groups.ts` 显示已重新启用 | 已改写表说明并补 `roster_group_members` |
| 名单咨询字段 | 缺失 | `server/src/db/schema.ts:29-31`、`roster.ts:243-320`、`shared.ts:61-75` | 已补数据模型、功能、契约 |
| 名单分组 / 归档接口 | 缺失 | `server/src/routes/admin/roster-groups.ts:44-234`、`roster.ts:18-237` | 已补功能与契约 |
| 分数线 facets | 缺失 | `server/src/routes/admin/score-lines.ts:115-141`、`server/src/score-lines/facets.ts` | 已补功能与契约 |
| 分数线数据应用脚本 | 缺失 | `scripts/scoreline-data.ts:1-20` | 已补功能与数据应用说明 |
| 当前验证环境 | 过时 | 快照写“无 `node_modules`、`check:deps` 退出 1”；2026-11-18 复跑 `check:deps` 退出 0 | 已更新 09 §4 与 01 §10 |
| 空归档目录说法 | 事实错误 | 快照称 `docs/archive/20261116/` “存在但为空”；`ls` 显示目录不存在 | 已改为“不存在” |
| `docs/reference/02` 端口说明 | 无冲突 | 默认 `8787`、dev 注入 `8788`，与 `server/dev.mjs:18`、`env.ts:66` 一致 | 不改 |
| 文档一致性守卫 | 通过 | `node scripts/check-docs.mjs` 退出 0（28 题全覆盖） | 不改 |
| 用户注释 | 无 | `docs/`、`AGENTS.md`、`CLAUDE.md` 未发现 `LosAngelous:` / `LOS:` 开头注释 | 无需保护动作 |
| Doc Agent 标准集 | 部分缺失 | 无 `00-requirements-intake` / `R/AC` / `04-tasks` / `05-decisions` / `STATUS.md`；项目用 `archive/YYYYMMDD/` + `reference/development-history.md` 承载 | 在 `docs/reference/README.md` 增加职责映射，不新建平行文档 |

## 3. 本次写入 / 更新

| 文件 | 变更摘要 |
| --- | --- |
| `docs/README.md` | 改为入口索引：只登记 `reference/`、`archive/`、`reports/` 与各长期口径入口 |
| `docs/reference/README.md` | 原 `docs/README.md` 工程全貌迁入；相对链接改为 `reference/` 视角 |
| `docs/reference/agent-rules.md` | 原 `docs/agent-rules.md` 迁入；根目录约定改为“根目录只留索引，长期口径统一放 reference/” |
| `docs/reference/consult-system.md` | 原 `docs/consult-system.md` 迁入 |
| `docs/reference/规划自测问卷-设计文档.md` | 原 `docs/规划自测问卷-设计文档.md` 迁入 |
| `docs/reference/development-history.md` | 原 `docs/development-history.md` 迁入；顶部加路径迁移说明 |
| `docs/261116/` → `docs/reference/` | 用户确认的目录重命名；`manifest.json` 的 `out` / `renamed_from` 同步 |
| `docs/reference/00-文档索引.md` | 增加快照状态与 `PATCH` 参数；版本、表数、新鲜度说明改为 v1.89 / 27 张表 |
| `docs/reference/01-项目概述.md` | 版本 `1.89.0`；表 / 索引数改为 27 / 36；更新验证环境；新增 §13 增量勘误 |
| `docs/reference/04-核心功能.md` | 补名单咨询状态、分组 / 归档接口；新增 §9.6 facets 与数据应用；补验收行 |
| `docs/reference/05-对外契约.md` | 补 `PATCH /roster/:inviteId`、分组接口、`GET /score-lines/facets`；补参数与错误边界 |
| `docs/reference/06-数据模型.md` | 表数 27、索引 36；修正 `roster_groups`，新增 `roster_group_members`；补 `invites` 咨询字段与关系图 |
| `docs/reference/09-测试与验证.md` | §4 验证状态更新到 2026-11-18；`check:deps` 结果改为退出 0 |
| `docs/reference/AGENT.md` | 表数 27；修正空归档目录与“缺依赖”说法；新鲜度加入 `patch` 信息 |
| `docs/reference/manifest.json` | 重算受影响文档 `sha256` / 行数；增加 `patched_at` / `patched_head` / `patched_version` / `patch_note` |
| `docs/reports/doc-agent-2026-11-18-vesta-docs-audit.md` | 本报告 |

## 4. 未改动与理由

- `docs/reference/02-开发环境搭建.md`：端口、环境变量与当前 `server/dev.mjs` / `env.ts` 一致；未发现 v1.86–v1.89 影响。
- `docs/reference/03-系统架构.md`：v1.86–v1.89 未改变运行时分层；名单分组与 facets 属于模块内增量，已在 04 / 05 / 06 记录。
- `docs/reference/07-部署与运维.md`、`08-排障手册.md`：未发现因 v1.86–v1.89 必须修改的部署 / 排障口径；`scripts/scoreline-data.ts apply` 是手工数据操作，已在 04 §9.6 记录。两项均未逐行复核，标 `[推断]`。
- `docs/reference/agent-rules.md`：已从 `docs/agent-rules.md` 迁入；规则内容保留，仅更新路径与根目录约定。
- `docs/archive/`：**保留，不删除**。现有 45 个文件、约 1 MB，覆盖 20261110 / 20261112 / 20261113 / 20261114 / 20261117；被 `docs/README.md`、`docs/reference/agent-rules.md`、`docs/reference/development-history.md` 多处引用，且 `AGENTS.md:6` 明确禁止删除已确认的需求记录。若只需清理某个子目录，应先列出文件清单并单独确认。

## 5. 验证

| 检查 | 结果 |
| --- | --- |
| `node scripts/check-docs.mjs` | 退出 0，28 题均在设计文档找到 |
| `node scripts/check-version.mjs` | 退出 0，`package.json=1.89.0` ↔ README 最高 v1.89 |
| `node scripts/check-deps.mjs` | 退出 0，Node 24 / `@types/node` major 24 / express 同 major |
| `node scripts/check-size.mjs` | 退出 0，204 个文件、16 条基线 |
| `docs/reference/manifest.json` 哈希复算 | `OK`，11 篇全部匹配 |
| `npm run verify` | 未运行（会写 `web/dist`，超出本次文档边界） |

## 6. 假设与待确认

| 编号 | 问题 | 证据 / 影响 | 需要谁回答 | 截止日期 |
| --- | --- | --- | --- | --- |
| A-001 | 是否把 `docs/reference/` 全量重建为 v1.89 快照？ | 本次只做定点勘误；03 / 07 / 08 未逐行重测 | 用户 | 2026-11-25 |
| A-002 | 是否引入 Doc Agent 标准集文件（requirements / tasks / decisions / STATUS）？ | 会与 `docs/reference/agent-rules.md` 的根目录约定冲突 | 用户 | 2026-11-25 |
| A-003 | `docs/reference/07`、`08` 是否仍存在 v1.86–v1.89 相关的过时排障口径？ | 本次未逐行复核，标 `[推断]` 无影响 | Doc Agent 下次审计 / 用户指出 | 2026-11-25 |
| A-004 | `docs/STATUS.md` 未创建是否可接受？ | 角色共享约定要求；但用户选择不新建平行标准文档，且 `agent-rules.md:88` 限制根目录文件 | 用户 | 2026-11-25 |
| A-005 | `docs/archive/` 是否需要按子目录清理？ | 现有 45 个文件、约 1 MB，被多处引用；`AGENTS.md:6` 禁止删除已确认需求记录。本次未删除任何文件 | 用户 | 2026-11-25 |
| A-006 | `reference/01` / `02` / `07` / `09` 与 `reference/README.md` 有覆盖重叠，是否合并或删除？ | 它们是 v1.85 测绘快照，补充了架构 / 环境 / 部署 / 测试细节；删除会丢失这些细节，合并需逐篇迁移内容 | 用户 | 2026-11-25 |

## 7. 本次推断

- `07` / `08` 未受 v1.86–v1.89 影响：`[推断]`，依据是变更集中在名单与分数线查询层，未触及 `update.sh`、systemd、nginx、健康检查与失败码。
- `03` 架构未变：`[推断]`，依据是新增接口复用现有 Express 路由与 SQLite 单进程模型。

## 8. 建议下一步

1. 你复核本报告与 8 篇改动（重点 04 / 05 / 06）后，把维护头状态从“草稿”改为“已确认”。
2. 若需要快照与代码强一致，按 A-001 安排一次全量重建；否则保持“快照 + 定点勘误”模式。
3. 若希望 Doc Agent 的 R/AC/T/STATUS 门禁在本项目落地，先决定 A-002，再调整 `agent-rules.md` 的目录约定，避免两套文档并存。
