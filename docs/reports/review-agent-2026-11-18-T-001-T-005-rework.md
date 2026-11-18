# Review Agent 变更复审报告（返工后）

- **范围**：`docs/reports/dev-agent-2026-11-18-T-001-T-005-rework.md` 描述的返工改动 + 原 R-001 / T-001~T-005 回归。
- **评审类型**：变更复审（重点审 P1 修复、受影响范围与回归；同时确认没有扩大范围）
- **来源 CR**：CR-001（G0 / G1 已确认）
- **G1 / DoR**：依据文档通过，无阻断缺口
- **结论**：**有条件通过**
- **一句话理由**：上一轮 P1（默认组 `groupId` 深链）已修复并由新增 `check:roster` + 隔离库实测确认；P3 死 CSS 已清理；剩余 P2 是发布前的 A-001 数据排查与 docs 迁移提交拆分，均不是代码缺陷。

## 评审基线

- **返工改动文件**：
  - 新增 `server/src/routes/admin/roster-group-id.ts`（`selectRosterGroupId()`，17 行）
  - 新增 `server/src/routes/admin/roster-group-id.cases.ts`（5 条断言，15 行）
  - `server/src/routes/admin/roster.ts`（改用 `selectRosterGroupId()`）
  - `package.json`（新增 `check:roster` 并接入 `verify`）
  - `web/src/views/admin/submissions/shared.css`（删除 `.cycle-*` / `.group-bar-label` / `.group-default`）
  - 文档：`AGENTS.md`、`docs/reference/05-对外契约.md`、`docs/reference/09-测试与验证.md`、`docs/reference/README.md`、`docs/archive/20261118/2-...md` §8
- **未改**：前端组件逻辑未改（返工报告称既有 `result.groupId !== groupId` 回退分支已足够）；数据库结构/接口字段未再变；AC 文本未改。
- **上一轮 P1**：旧链接 `?groupId=<默认组 id>` 被后端接受为合法筛选、前端无 chip 选中且暴露“移出本组”。
- **本轮复审重点**：默认组 id 归一化、用户组筛选不回归、归档/删组/保留名回归、`verify` 全绿、无新 P1。
- **明确不在范围**：生产 A-001 只读 SQL（无生产访问）；`/tmp` 下 Playwright 脚本复跑（环境无 Playwright 包）；docs 迁移本身的完整评审。

## AC 判定

| AC | 判定 | 证据 |
| --- | --- | --- |
| AC-001-1 | **满足** | 后端 `selectRosterGroupId()` 将默认组 id 归一化为 `''`；`useRoster.ts:148-151` 既有分支回退“全部”并清 URL；`RosterGroupBar.vue:7` 的 `!groupId` 使“全部”选中；`Submissions.vue:34` 不再显示“移出本组”。隔离库实测默认组深链 `groupId=''`、3 行不筛选 |
| AC-001-2 | 满足 | 实测新建 3 人全在 `roster`、`archive=0` |
| AC-001-3 | 满足 | 实测响应无 `weeks/currentWeek`、行无 `week`；`?week=` 结果一致；`export.csv` 带/不带 `week` 字节一致 |
| AC-001-4 | 满足 | 实测用户组 A 返回 `groupId=A`、仅乙；切回全部 3 人；计数保持 |
| AC-001-5 | 满足 | 实测默认组仍在 `groups` 且 `default:true`；前端三处隐藏（分组栏 / 弹窗 / 行内 chip）静态确认 |
| AC-001-6 | 满足 | 实测移出默认组 → 归档 → 加回默认组 → 回到名单 |
| AC-001-7 | 满足 | 状态栏组件未改；`counts` 与 `roster` 一致 |
| AC-001-8 | 满足 | 实测 `全部` / `默认分组` / `" 全部 "` → 400；空名 400；同名 409 |
| AC-001-9 | 满足 | 实测只剩默认组仍可建组；管理弹窗空状态静态确认 |
| AC-001-10 | 满足 | 实测成员在默认组时删用户组 `archived=0`；只在用户组时 `archived=1` |

## 验证执行

- `npm run verify` → **exit 0**（含新增 `check:roster`）
  - `check:roster`：`✓ 名单 groupId 归一化用例通过：默认组 / 非法组 → 全部，用户组保持`
  - `check:docs` / `check:size` / `check:version`（1.90.0 ↔ v1.90）/ `check:deps` / `check:dates` / `check:score` / `check:audit` / `check:search` / `typecheck` / `build` 全通过（`built in 3.40s`）
- **隔离环境 API 实测**（`DATA_DIR=/tmp/vesta-rework-*`，`PORT=8947`）：
  - 主套件 **26/26**：登录、建邀请、响应字段、保留名、用户组筛选、**默认组 id → `groupId=''` 且不筛选**、非法 id → `''`、旧 `week`、归档移出/加回、删最后一组 `archived=0`、只在用户组 `archived=1`、只剩默认组仍可建组
  - 回归套件 **9/9**：`q` 搜索、`category` 计数、非法组回退、同名 409、删最后有效组 409、默认组保留、`export.csv?week=` 字节一致
- **UI 未独立复跑**：环境无 `playwright` 包（仅缓存 Chromium），Dev 的 11/11 与 41/41 无法从仓库复现。AC-001-1 的修复结论基于“后端契约 + 前端既有回退分支 + 构建通过”，不是浏览器实测。
- **回归范围**：

  | 受影响区域 | 验证 | 结果 |
  | --- | --- | --- |
  | 默认组深链 | API `?groupId=<默认组>` → `''`；静态前端回退 | 通过 |
  | 用户组筛选 | API `?groupId=<A>` → A 且仅乙 | 通过 |
  | 归档加回 | API 移出默认组 → 归档 → 加回 | 通过 |
  | 删最后一个用户组 | API `archived=0` / 只在用户组 `archived=1` | 通过 |
  | 保留名 / 同名 / 空名 | API 400 / 409 / 400 | 通过 |
  | 旧 `week` / CSV | API 忽略；字节一致 | 通过 |
  | 死 CSS | `grep` 无 `.cycle-*` / `.group-bar-label` / `.group-default` 引用 | 通过 |

## 影响面覆盖

| 影响维度 | 是否覆盖 | 证据 / 缺口 |
| --- | --- | --- |
| 模块 / 接口 | 是 | `roster.ts` 归一化、`roster-group-id.ts` 纯函数、前端既有回退分支 |
| 数据 / 配置 | 是（代码层） | 无表结构变更；默认组仍保留；A-001 生产数据风险仍未验证 |
| 测试 / 回归 | 部分 | 新增 `check:roster` 入 `verify`；API 35 项通过；UI 未独立复跑 |
| 文档 | 是 | `05` / `09` / `README` / `AGENTS` / 开发文档 §8 已同步；`development-history` 未加返工条目（P3） |
| 兼容 / 迁移 / 回滚 | 是 | 默认组 id 回退“全部”已文档化；无迁移；回滚 `git revert` |

## NFR 检查

| 项 | 目标 | 结果 |
| --- | --- | --- |
| 性能 | 不增加请求 | 通过：纯函数，无新增查询 |
| 安全 | 不改认证/授权 | 通过：`requireAdmin()` 未动 |
| 隐私 | 不新增字段 | 通过 |
| 兼容性 | 默认组/非法 id 回退“全部” | 通过：API 实测；契约文档已更新 |
| 可观测性 | 不新增/删除日志 | 通过 |
| 成本 | 不新增基础设施 | 通过 |

## 维度结论

| # | 维度 | 结论 | 说明 |
| --- | --- | --- | --- |
| 1 | 需求覆盖 | 通过 | 10/10 AC 满足 |
| 2 | 正确性 | 通过 | 默认组归一化覆盖空串/默认组/用户组/非法组/空列表 5 条用例 |
| 3 | 边界与错误处理 | 基本通过 | 非法组、空组、最后一组已覆盖；无默认组的异常库仍无提示（P3） |
| 4 | 安全 | 通过 | 未改鉴权；参数化查询 |
| 5 | 性能与资源 | 通过 | 无新增查询/请求 |
| 6 | 并发与一致性 | 未发现新问题 | 未引入新状态 |
| 7 | 可维护性 | 通过 | 归一化抽成纯函数 + 用例；死 CSS 已清理 |
| 8 | 测试有效性 | 部分 | 后端单测可复现且入 `verify`；UI 证据不可复现 |
| 9 | 文档一致性 | 基本通过 | 接口/测试/入口已同步；`development-history` 缺返工条目（P3）；AC 措辞（P3） |
| 10 | 范围与风险 | 有风险 | 未扩大功能范围；docs 迁移提交拆分仍未处理（P2） |
| 11 | 用户注释保护 | 通过 | 返工 diff 中 `LosAngelous:` / `LOS:` 命中 0 处 |
| 12 | 回归与影响面 | 通过（API）/ 部分（UI） | 35 项 API 回归通过；UI 未独立跑 |
| 13 | AC ↔ 验证追溯 | 通过 | 新增 `check:roster` + AC-001-1 的默认组深链已覆盖 |
| 14 | NFR 目标 | 通过 | 兼容性契约已明确并实测 |

## 缺陷清单（按严重度降序）

### [P2] A-001（生产已有“全部/默认分组”同名用户分组）仍未关闭

- **位置**：`docs/archive/20261118/2-学员名单分组简化-开发文档.md:163,182`；`server/src/db/roster-groups.ts:49-70`；`server/src/routes/admin/roster-groups.ts:54`
- **问题**：保留名校验只拦新建；存量同名组仍可能在迁移中被选为默认组，v1.90 起该组被界面隐藏；名为“全部”的存量组会与虚拟“全部”同屏。
- **触发条件**：生产库存在 `name in ('全部','默认分组')` 且未删除的分组。
- **影响**：分组消失/重名，属于上线数据风险。
- **证据**：开发文档风险 1 与「未做 / 风险」均承认；返工报告也列为未处理项。
- **建议**：发布前执行只读 SQL；有冲突先改名/加后缀，并记录结果。
- **置信度**：高（代码路径明确）；实际影响取决于生产数据。

### [P2] docs 迁移与 R-001 仍在同一工作区，提交/回滚未拆分

- **位置**：`git status` 中 `D docs/261116/*`、`D docs/agent-rules.md`、`M AGENTS.md`、`M CLAUDE.md`、`M scripts/check-docs.mjs`、`M scripts/check-version.mjs`、`?? docs/reference/`
- **问题**：返工仍未提交；若 `git add -A`，docs 迁移与 R-001 会混成一个提交；若只提交 R-001，`docs/reference` 的文档同步会缺失。
- **触发条件**：提交/回滚本轮改动时未先拆分 docs 迁移。
- **影响**：违反“一个需求一个 commit”；`git revert` 会牵连无关 docs 迁移。
- **证据**：`git status --short`；返工报告「未处理项」明确说本轮仍未提交。
- **建议**：先单独提交 docs 迁移（或 stash），再提交 R-001（含 `docs/reference` 本次条目）。
- **置信度**：高。

### [P3] 返工修复未写入 `development-history` 本轮小节

- **位置**：`docs/reference/development-history.md:9-19`（v1.90 小节）；返工报告文档同步表未包含该文件。
- **问题**：默认组 `groupId` 归一化是行为修正，但历史记录只写在归档开发文档 §8，`development-history` 的 v1.90 小节没有对应的“为什么改”条目。
- **触发条件**：后续 Agent 查历史记录时。
- **影响**：追溯链不完整；归档文档有记录，但历史入口缺失。
- **证据**：`grep 返工` 在 v1.90 小节无命中；开发文档 §8 有记录。
- **建议**：在 v1.90 小节补一行“评审返工：默认组 `groupId` 归一化为全部，新增 `check:roster`”。
- **置信度**：高。

### [P3] AC-001-4 / AC-001-7 的“与改动前一致”仍未改

- **位置**：`docs/archive/20261118/2-学员名单分组简化-开发文档.md:20,23`
- **问题**：删除期次后统计范围变为全量，“与改动前一致”字面不成立；Dev 明确表示 AC 归 Doc/用户维护，本次未改。
- **触发条件**：跨期成员多的分组/状态计数。
- **影响**：后续审计可能误判。
- **建议**：Doc/用户改为“在全量范围内一致；统计范围改为全量”。
- **置信度**：高。

### [P3] 无默认组的异常库仍无“加回全部”提示

- **位置**：`docs/archive/20261118/2-学员名单分组简化-开发文档.md:126`；`RosterGroupDialog.vue:43`
- **问题**：T-004 风险承诺“若无默认组，加回需明确失败提示”，实现是直接不渲染“全部”选项。
- **触发条件**：数据库无有效默认组（迁移正常时不可达，仅极端损坏/手工改库）。
- **影响**：归档学员无法加回且无原因提示。
- **建议**：显示禁用项 + 说明，或删除文档中的提示承诺。
- **置信度**：中（可达性低）。

## 已检查且未发现问题的区域

- `selectRosterGroupId()`：空串、默认组、用户组、非法组、空列表 5 条断言；默认组 id 与非默认组 id 的判断与 `is_default` 一致。
- `GET /roster?groupId=<默认组>`：实测返回 `groupId=''`、不筛选、默认组仍在 `groups`；前端 `useRoster.ts:148-151` 会回退“全部”并清 URL。
- `GET /roster?groupId=<用户组>`：实测原样返回、只筛该组；没有误把用户组归一化。
- 归档移出/加回、删最后一组、只在用户组删组、保留名、同名、空名：与上一轮一致，未回归。
- `shared.css` 中 `.cycle-*`、`.group-bar-label`、`.group-default` 已无残留引用。
- `package.json` 的 `check:roster` 已接入 `verify`；`AGENTS.md:47`、`docs/reference/README.md:341`、`09:45/139/258` 已同步。
- `docs/reference/05:145` 已明确“默认组 id 与非法 id 回退空串”。
- `docs/archive/20261118/2-...md` §8 已记录 P1 修复、回归与 P3 清理。
- 返工 diff 中 `LosAngelous:` / `LOS:` 命中 0 处；没有修改用户注释。
- 没有新增表结构/迁移/权限变更；没有引入新 P1。

## 文档同步检查

- `docs/reference/05-对外契约.md`：默认组 id → 空串已写明。
- `docs/reference/09-测试与验证.md`：执行顺序、2.8 节、命令速查、手工走查第 9 项均已补默认组深链。
- `docs/reference/README.md`：`verify` 组合含 `check:roster`。
- `AGENTS.md`：`verify` 组合含 `check:roster`。
- `docs/archive/20261118/2-...md`：§8 返工记录完整。
- `docs/reference/development-history.md`：v1.90 小节缺返工条目（P3）。
- `CHANGELOG.md`：仓库无此文件，沿用版本记录，合理。

## 用户注释保护检查

- 返工 diff 扫描 `LosAngelous:` / `LOS:`：**0 处**。
- 被修改/删除/重排：**0 处**。

## 残留风险

- **A-001**：生产同名分组未排查；上线前必须完成。
- **UI 未独立复跑**：Dev 声称 P1 11/11、全量 41/41，但脚本在 `/tmp` 未入仓、环境无 Playwright 包；建议合并前人工或 CI 再走一遍默认组深链。
- **docs 迁移提交拆分**：仍未处理；提交前需先拆。
- **`LIMIT 1000`**：既有约束；删除期次后“全部”仍只显示最近 1000 行，产品需确认是否接受。
- **无自动化 UI 测试**：仓库无测试套件；本次新增的是后端纯函数用例，不含浏览器级回归。

## 发布条件（建议）

1. **A-001**：发布前执行只读 SQL 排查 `roster_groups.name in ('全部','默认分组')`；有冲突先改名/加后缀并记录。
2. **提交拆分**：先提交 docs 迁移（或 stash），再提交 R-001；确保 `docs/reference` 与 `scripts/check-*.mjs` 的路径改动一起入库。
3. **UI 走查**：至少人工复跑一次 `?groupId=<默认组 id>` → “全部”选中、地址栏清理、无“移出本组”。
4. P3 可按 Doc/用户节奏处理，不阻塞发布。

**结论**：上一轮 P1 已关闭，P3 死 CSS 已清理，新增 `check:roster` 有效；当前无 P0/P1。因 A-001 与提交拆分两个 P2 仍未关闭，结论为 **有条件通过**。
