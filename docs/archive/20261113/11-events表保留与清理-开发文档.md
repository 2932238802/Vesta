# `events` 表保留策略与清理 · 开发文档

> 版本：v1.0（2026-11-13）
> 状态：**待实施**（本文只定方案，代码未动）
> 对应产品版本：计划 **v1.73**（承接 v1.72 gzip；顺序调整时按 `docs/README.md` 重新编号）
> 需求来源：用户 2026-11-13 要求——「`events` 表只增不删的优化」

---

## 一、问题与目标

`events` 是问卷漏斗的原始埋点表：**只写不删**，也没有按时间清理的策略。同时后台概览页每次刷新都在**全表扫**它。

两个后果，一个是现在就有、一个是随时间长出来的：

1. **概览页的查询成本 O(全表)**：`overview.ts` 每次请求把 `group_complete` 和 `quiz_exit` 的**全部历史行**读进内存、逐行 `JSON.parse`。数据量翻一倍，后台概览就慢一倍，且没有任何上限。
2. **表无限增长**：没有保留期、没有归档、没有汇总，五年后还是这一张表。

但**不能直接删**——后台漏斗的「已完成第 X 组」「开始人数」就是靠历史事件算的（详见 2.2），删了历史，后台数字会凭空变小。所以这件事的实质是：**先把漏斗事实沉淀成可长期保存的小表，再放心删原始事件**。

目标：
- 概览查询从 O(全表) 变成 O(邀请数) 或 O(常量)；
- 原始事件有明确保留期（默认 180 天），到期自动清理；
- **清理前后后台漏斗数字完全一致**（可验证）。

## 二、现状（证据）

### 2.1 表结构与写入

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_id TEXT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_type ON events(type);   -- 只有 type 索引
```

写入有两条路径：

- `recordEvent()`（`server/src/db/core.ts:25-36`）：内部 `try/catch` 静默吞异常（「埋点失败不影响主流程」）。调用点包括 `invite_open`、`submit`、`report_view`、`claim_submit`、`submission_deleted`、`ai_report_ready`、`ai_report_retry`、`ai_report_failed`、`ai_report_retry_manual`。
- `POST /api/events`（`server/src/routes/public.ts:550-573`）：前端批量上报，**只接受白名单 6 类**（`invite_open / quiz_start / group_complete / quiz_exit / report_view / claim_view`），每次最多 20 条，`payload` 截断 2000 字，限流 60 次/分钟。

### 2.2 读取路径（后台概览，共 4 次查询）

`server/src/routes/admin/overview.ts`：

| 行 | 查询 | 用途 |
| --- | --- | --- |
| 31 | `SELECT invite_id, payload FROM events WHERE type='group_complete'`（**全表**，逐行 parse `payload.groupId`） | 每组完成人数（`Set<invite_id>` 去重） |
| 42 | `SELECT COUNT(DISTINCT invite_id) WHERE type='quiz_start'` | 漏斗「开始人数」 |
| 47 | `SELECT invite_id, payload FROM events WHERE type='quiz_exit' ORDER BY id`（**全表**） | 每题流失（取每人最后一次退出的题号） |
| 51 | `SELECT invite_id FROM submissions` | 排除已提交的人 |

注意 47 行是 `ORDER BY id` 全表排序后再用 Map 覆盖成「最后一次」——数据量上来时这是最贵的一条。

### 2.3 量级估算（说明「现在不疼，但会疼」）

按一次完整答卷估算：`quiz_start` 1 条 + `group_complete` 约 8 条（问卷 8 组）+ `report_view` 1～3 条 + `claim_view` 1 条 + `submit` / `claim_submit` / `ai_*` 共约 4 条 ≈ **12～18 条/份**。未提交的人还会有重复 `quiz_exit`（限流是 60 次/分钟、每次 20 条，理论上限不低）。

| 累计答卷 | events 行数（估） | 概览全表扫的耗时（量级） |
| --- | --- | --- |
| 1,000 | 1.5 万 | 可以忽略（<10 ms） |
| 10,000 | 15 万 | 开始有感（几十 ms，且随每次刷新重复） |
| 50,000 | 75 万 | 明显卡后台（几百 ms 到秒级） |

**结论：这不是当下的故障，是设计上会单调恶化的地方。**所以本文的重点是「先把汇总做对，再定保留期」，而不是急着删数据。

## 三、方案对比

| 方案 | 做法 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- | --- |
| A · 只加索引 + 加时间窗 | 加索引，概览只统计最近 180 天，超期直接删 | 改动最小 | **改变产品口径**：后台从「累计」变成「近 180 天」，历史数字会变小 | 不选（口径变更需用户单独确认） |
| B · 先汇总再清理 | 新建 `event_facts` 存漏斗事实，概览改读它，原始事件保留 N 天后清理 | 概览 O(邀请数)；口径不变；原始事件仍可追溯 N 天 | 多一张表、一次迁移、写入路径要同步 | **选这个** |
| C · 直接删 | 加定时 `DELETE` | 一行代码 | 后台数字立刻错 | 禁止 |

## 四、方案 B 设计

### 4.1 新表 `event_facts`（漏斗事实，永久保留）

```sql
CREATE TABLE IF NOT EXISTS event_facts (
  invite_id TEXT NOT NULL,
  kind      TEXT NOT NULL,              -- 'start' | 'group' | 'exit'
  key       TEXT NOT NULL DEFAULT '',   -- group=groupId；exit=questionId；start 为空
  at        TEXT NOT NULL,              -- 首次（start/group）或最后一次（exit）发生时间
  PRIMARY KEY (invite_id, kind, key)
);
CREATE INDEX IF NOT EXISTS idx_event_facts_kind ON event_facts(kind, key);
```

三类事实与现有读法的映射：

| 概览指标 | 原读法 | 新读法 |
| --- | --- | --- |
| 开始人数 | `COUNT(DISTINCT invite_id) WHERE type='quiz_start'` | `COUNT(*) FROM event_facts WHERE kind='start'` |
| 每组完成 | 去重 `(groupId, invite_id)` | `COUNT(*) FROM event_facts WHERE kind='group' AND key=?` |
| 每题流失 | 每人最后一次 `quiz_exit` 的 `questionId` | 每人 `kind='exit'` 中 `at` 最大的那条的 `key` |

规模：每人最多 1 + 8 + 题数 ≈ 30 行，**比原始事件的增速小一个数量级**，永久保留也没有压力。

### 4.2 写入同步

- 新增 `recordFact(inviteId, kind, key, at)`：
  - `start` / `group`：`INSERT ... ON CONFLICT DO NOTHING`（只记第一次）；
  - `exit`：`INSERT ... ON CONFLICT(invite_id,'exit',key) DO UPDATE SET at = excluded.at`（每人每题保留最后一次）。
- 在 `recordEvent()` 与 `POST /api/events` 落库的**同一处**调用（按 `type` 分派），保证「有原始事件就一定有事实」。
- **注意**：`recordEvent()` 现在是静默吞异常的。写事实不能跟着一起吞——否则原始事件写进去了、事实没写，两边就悄悄不一致。做法：`recordEvent` 返回值改为 `boolean`，事实写入失败打 `log.error`（见第 7 篇），并在 4.5 加一个一致性核对脚本。

### 4.3 一次性回填（启动迁移，可重复执行）

```sql
-- start
INSERT OR IGNORE INTO event_facts (invite_id, kind, key, at)
SELECT invite_id, 'start', '', MIN(created_at) FROM events
WHERE type='quiz_start' GROUP BY invite_id;

-- group
INSERT OR IGNORE INTO event_facts (invite_id, kind, key, at)
SELECT invite_id, 'group', json_extract(payload,'$.groupId'), MIN(created_at)
FROM events WHERE type='group_complete'
  AND json_extract(payload,'$.groupId') IS NOT NULL
GROUP BY invite_id, json_extract(payload,'$.groupId');

-- exit（每邀请保留最后一次；key 用 questionId）
INSERT INTO event_facts (invite_id, kind, key, at)
SELECT invite_id, 'exit', json_extract(payload,'$.questionId'), MAX(created_at)
FROM events WHERE type='quiz_exit'
  AND json_extract(payload,'$.questionId') IS NOT NULL
GROUP BY invite_id, json_extract(payload,'$.questionId')
ON CONFLICT(invite_id,kind,key) DO UPDATE SET at = excluded.at;
```

- `node:sqlite` 支持 `json_extract`（SQLite 3.38+，Node 24 自带足够新）；
- 放在 `server/src/db/migrations.ts`，用 `settings` 里一个 `events_facts_backfilled=1` 标记，**可重复执行**（符合 `docs/agent-rules.md` 的迁移约束）；
- 回填 15 万行以内 <1 秒，启动时做没有感知。

### 4.4 概览改写

`overview.ts` 的三条事件查询全部换成 `event_facts`，**输出 JSON 结构一字不改**（前端不感知）。第 47 行的 `ORDER BY id` 全表排序随之消失。

### 4.5 保留与清理

- 原始事件保留期 `EVENT_RETENTION_DAYS`，默认 **180 天**；
- 清理时机：启动时跑一次 + 每 24 小时一次（`setInterval(...).unref()`，与 `generate.ts` 的重试定时器同风格），单进程不需要文件锁；
- `DELETE FROM events WHERE created_at < ?`（先限一批，如 `LIMIT 5000` 循环，避免一次删太多长时间占锁）；
- 新增索引支撑清理：`idx_events_created (created_at)`、`idx_events_invite (invite_id)`；
- **不做自动 `VACUUM`**：`VACUUM` 要独占锁、会整体重写库，线上跑风险大。删除后的空闲页由 SQLite 复用；备份用的 `VACUUM INTO` 本来就会产出紧凑副本。
- 运维类事件（`ai_report_*`、`submission_deleted`）保留期可以更长（如 365 天），用同一开关的两档实现即可；第一版统一 180 天也能接受，但要写清「这些类型也会被清」。

### 4.6 一致性核对脚本（可选但建议）

`scripts/check-events.mjs`：对比「近 180 天原始事件」与「`event_facts`」的漏斗三项（started / 每组完成 / 流失 Top5），不一致直接退出码 1。可以手动跑，也可以在实施当天的验收里跑一次。

## 五、改动清单

| 文件 | 改动 |
| --- | --- |
| `server/src/db/schema.ts` | 新增 `event_facts` 表 + 2 个 events 索引 |
| `server/src/db/migrations.ts` | 新增 `backfillEventFacts()`（带 settings 标记，可重复执行） |
| `server/src/db/events.ts`（新） | `recordFact()`、`readFunnelFacts()`、`pruneEvents()` |
| `server/src/db/core.ts` | `recordEvent()` 返回 `boolean` 并按 type 分派写事实 |
| `server/src/routes/public.ts` | `POST /api/events` 写入时同步写事实 |
| `server/src/routes/admin/overview.ts` | 3 条事件查询改读 `event_facts`，输出结构不变 |
| `server/src/index.ts` | 启动后跑一次 `pruneEvents()` + 每日定时器 |
| `server/src/env.ts` | `EVENT_RETENTION_DAYS`（默认 180） |
| `scripts/check-events.mjs` | 新建：一致性核对（可选） |
| `docs/README.md` | 「数据」一节补 events 保留期说明 |
| `.env.example` | 补 `EVENT_RETENTION_DAYS=` |

## 六、边界（明确不做）

- **不改产品口径**：清理后后台仍是「累计」，不是「近 N 天」；
- 不删 `event_facts`、不重置 `consult_*` 任何表；
- 不自动 `VACUUM`、不做表分区（单文件 SQLite 没这概念）；
- 不改前端埋点类型、不加新的埋点；
- 不把 `payload` 里的原始 `answers` 类内容迁进事实表（事实表只存 id 与时间）。

## 七、验证

1. **迁移前备份**：`VACUUM INTO 'data/backup-YYYYMMDD.db'`（按 `docs/agent-rules.md` 的数据操作要求）。
2. `npm run verify` 全绿。
3. 回填正确性：在测试库上分别取「回填前用旧查询」与「回填后用新查询」的漏斗三项，**数字必须完全一致**（这是本方案唯一的硬验收）。
4. 用脚本插入 10 万条合成事件，对比 `GET /api/admin/overview` 的响应时间（改前 vs 改后），记录到实施记录。
5. 清理正确性：把 `EVENT_RETENTION_DAYS` 临时设成 1，构造 2 天前的事件，确认被删、且概览数字**不变**。
6. 重复执行安全：连续启动两次，确认回填不会产生重复行（`PRIMARY KEY` + `INSERT OR IGNORE`）。

## 八、风险与回滚

| 风险 | 处理 |
| --- | --- |
| 回填逻辑写错，漏斗数字变了 | 先备份；用 3 和 5 两步对比；实现时保留旧查询的临时开关，数字不一致立刻回退 |
| `json_extract` 在旧 SQLite 上不可用 | Node 24 自带的 SQLite 版本足够；启动时若报错，退回「读进内存再 parse」的 JS 回填（慢但正确） |
| 清理把运维事件一起删了，排查时缺历史 | 第一版就写明保留期；`ai_report_*` 等事件也可另设更长保留期 |
| 事实表与原始事件长期漂移（写入失败被吞） | `recordEvent` 不再静默吞事实写入错误；提供 `check-events.mjs` |
| 启动时清理阻塞 | 限制每批 5000 行、分批循环；首次清理量大时只在启动日志里记一次 |

回滚：表结构是纯新增（`CREATE TABLE IF NOT EXISTS`），回滚代码后旧查询仍然能读到未删的 180 天数据；如已删且需要历史，用备份库恢复。**不要**用 `DROP TABLE event_facts` 当回滚手段——先确认概览已切回旧查询。

## 九、待确认

1. 保留期 180 天是否合适？（后台是咨询业务，半年内的漏斗数据基本够用；要留一年就配 `EVENT_RETENTION_DAYS=365`）
2. 是否接受「运维类事件（`ai_report_*`）也按同一保留期清理」？
3. 概览页是否希望**另外**提供「近 7/30 天」筛选（那是新功能，不在本文范围，先记着）。

## 十、实施记录

（待实施后补：commit、产品版本、回填前后漏斗对比、响应时间对比）
