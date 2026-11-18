## Dev Agent 返工报告（评审后）

- 任务：T-001 ~ T-005 学员名单分组简化 — 评审返工
- 来源评审：`docs/reports/review-agent-2026-11-18-T-001-T-005.md`
- 结论：P1 已修复并验证；P3 死 CSS 已清理；新增回归已接入 `verify`
- 产品版本：v1.90（同一轮需求，不重复升版本）
- 提交状态：**未提交**

### 1. P1 确认与修复

**确认**：评审 P1 属实。修复前用隔离库 + Playwright 复现：

- `GET /roster?groupId=<默认组 id>` 返回 `groupId=<默认组 id>`，不是空串。
- 页面分组栏只显示“全部”，但 `activeChips=0`，“全部” `aria-selected=false`。
- 地址栏保留 `?groupId=<默认组 id>`；勾选学员后出现“移出本组”。
- 点击并确认后，学员被移出隐藏默认组并进入归档（复现 11/11 断言命中）。

**修复**：

| 文件 | 改动 |
|---|---|
| `server/src/routes/admin/roster-group-id.ts`（新增） | `selectRosterGroupId()`：只接受非默认的有效组 id；默认组 id、非法 id 返回空串 |
| `server/src/routes/admin/roster.ts` | 用 `selectRosterGroupId()` 替换 `groupRows.some(...)` |
| `server/src/routes/admin/roster-group-id.cases.ts`（新增） | 空串 / 默认组 / 用户组 / 非法组 / 空列表 5 条断言 |
| `package.json` | 新增 `check:roster`，接入 `npm run verify` |

前端无需额外改动：后端返回 `groupId=''` 后，`useRoster.load()` 既有的 `result.groupId !== groupId` 分支会回退“全部”并清理地址栏。

### 2. P3 死 CSS 清理

删除 `web/src/views/admin/submissions/shared.css` 中已无引用的：

- `.cycle-bar` / `.cycle-bar::-webkit-scrollbar`
- `.cycle-chip` 及其 `:hover` / `.current` / `.on` / `b` 规则
- `.group-bar-label`
- `.group-default` / `.group-chip.on .group-default`

`grep` 确认模板/脚本中无残留引用。

### 3. 回归验证

| 验证 | 结果 |
|---|---|
| `npm run check:roster` | 通过：默认组 / 非法组 → 全部，用户组保持 |
| P1 修复验证（隔离库 + Playwright） | **11/11 passed**：默认组深链 → “全部”选中、地址栏清理、后续请求无 `groupId`、无“移出本组”、无归档；用户自建组筛选仍正常 |
| 全量 UI 回归（原 41 项） | **41/41 passed**，无 console error / pageerror |
| `npm run verify` | **exit 0**（新增 `check:roster` 已包含） |

### 4. 文档同步

| 文件 | 更新内容 |
|---|---|
| `AGENTS.md` | `verify` 组合加入 `check:roster` |
| `docs/reference/09-测试与验证.md` | 执行顺序表、2.8 节、命令速查、手工走查第 9 项补充默认组深链 |
| `docs/reference/05-对外契约.md` | 明确 `groupId=默认组/非法 id` 回退空串 |
| `docs/reference/README.md` | `verify` 组合说明 |
| `docs/archive/20261118/2-...md` | 新增 §8 评审返工记录 |

### 5. 未处理项（非本次返工范围）

- **P2 / A-001**：生产同名“全部/默认分组”数据仍需发布前只读 SQL 排查，属运维动作。
- **P2 / docs 迁移提交拆分**：属提交流程，代码未动；本轮仍**未提交**。
- **P3 / AC-001-4、AC-001-7 措辞**：AC 归 Doc/用户维护，Dev 不修改验收标准；建议 Doc 改为“全量范围内一致”。
- **P3 / 无默认组时无“全部”选项提示**：本次未改；正常迁移保证默认组存在，仅极端损坏库可达。
- 评审报告本身未修改。

### 6. 变更文件（本轮返工）

- 新增：`server/src/routes/admin/roster-group-id.ts`、`server/src/routes/admin/roster-group-id.cases.ts`
- 修改：`server/src/routes/admin/roster.ts`、`package.json`、`web/src/views/admin/submissions/shared.css`、`AGENTS.md`、`docs/reference/05/09/README.md`、`docs/archive/20261118/2-...md`
- 未执行 `git add/commit/push`。
