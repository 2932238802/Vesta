# 问卷 JSON 每请求重复解析：根因定位与分层修复方案

> 方案版本：v1.0（2026-11-14）
> 状态：**已实施并提交（产品版本 v1.81，2026-11-14）**；实施范围为 §5.7 的 MVP（L0 + L1），L2 / L3 / L4 未做（理由见 §8）
> 实施记录：`submissions` 新增 `report_mode` 并启动回填（可重复执行）；提交答卷时固化当时的报告模式；`surveyReportModes()` / `reportModeOf()` 删除，列表 / 详情 / 名单 / CSV 全部改读该列；`surveyCache()` 收窄为 `WHERE id IN (...)` 且 `active` 懒加载。本机副本验证：6 行回填、二次启动 0 行、`ai` 问卷与问卷缺失都回填为 `ai`；1 / 101 / 401 个问卷版本下四个读接口 p50 0.59–0.99 ms，曲线变平。
> 适用产品版本：v1.81
> 证据基线：修复前 HEAD `4816c2c`（2026-11-14，工作区干净），Node v24.22.1，本地库 `data/vesta.db`

---

## 0. 结论先行

**根因不在「解析」这一环，而在「落库」这一环。**

`submissions` 表只存了 `survey_id`，没有存「这份答卷属于 doc 还是 ai 报告模式」。这个事实在提交答卷时明明已经知道（`survey.reportMode`），却从未落盘；于是**每一个**列表 / 详情 / 名单 / CSV 请求都必须现场回读 `surveys` 表、把问卷 JSON 重新 `JSON.parse` 一遍，才能回答「这一行要不要显示分数」这一个布尔问题。

完整因果链（本次要指到的环节）：

```
落库缺字段（submissions.report_mode）
   └─► 选链必须运行时反查：submission → survey_id → surveys.data → reportMode
          └─► 取页只能全表：SELECT id, data FROM surveys（无 WHERE、无列裁剪）
                 └─► 解析重复：每行一次 JSON.parse，每个请求一次，没有缓存
```

所以「解析」是链条最后一环、是成本所在，但**不是根因**；只优化解析（换更快的解析器、加缓存）会留下同一个问题：读路径仍然依赖「问卷整份 JSON」这份不该出现的数据。

三个放大因素，让这个问题随时间变坏：

1. **`surveys` 只增不删**：`publishSurvey()` 每次保存问卷都插一行新版本，没有任何清理/归档；读取端却是全表扫描 —— 成本随「保存过多少次问卷」线性增长（实测 **≈0.072 ms / 版本 / 请求**）。
2. **`getActiveSurvey()` 没有任何进程缓存**：每个渲染问卷的请求都 `SELECT setting` + `SELECT 1 行` + `JSON.parse`（0.076 ms）。报告页在 AI 生成期间**每 3 秒轮询一次**（最长 240 秒 ≈ 80 次），每次都付这笔账。
3. **同一请求内重复**：`GET /submissions/:id` 先用 `getSurvey()` 解析一次，再用 `surveyReportModes()` 把同一份 data 再解析一次。

修复主线一句话：**把「答卷的报告模式」在落库时固化，读路径只读这一列；解析问卷只留给真正要渲染问卷的少数请求；最后再给「渲染问卷」的请求加一层进程内缓存。**

---

## 1. 复现与实测证据

### 1.1 现场事实

| 项 | 值 |
| --- | --- |
| `surveys` 行数 | 1（`survey-main`） |
| 单份问卷 JSON | 10,764 字节 / 28 题 |
| `reportMode` | `doc` |
| `submissions` / `invites` | 6 / 7，全部指向 `survey-main` |
| 表结构 | `submissions` **无** `report_mode` 列（`server/src/db/schema.ts:46-70`） |

### 1.2 单次调用成本（Node v24.22.1，本地库，每项 2 万次取均值）

| 操作 | 每次耗时 | 说明 |
| --- | --- | --- |
| `JSON.parse(问卷 JSON)` | 0.0424 ms | 10.7 KB → 对象 |
| `SELECT data FROM surveys WHERE id=?` | 0.0413 ms | **取数与解析同价** |
| `getSurvey(id)`（取数 + 解析） | 0.0757 ms | `db/surveys.ts:6` |
| `getActiveSurvey()` | 0.0764 ms | 多一次 `SELECT settings`，`db/surveys.ts:18` |
| `structuredClone(已解析问卷)` | 0.0994 ms | **比重新解析还贵**，别用克隆做隔离 |
| `computeScores(survey, {})` | 0.0057 ms | 被 `parseJson` 兜底提前求值 |
| `surveyReportModes()`（1 个版本） | 0.0758 ms | `routes/admin/shared.ts:33` |
| `surveyCache()`（1 个版本） | 0.1562 ms | 全表 + 全解析 + 再 `getActiveSurvey()` |

> 当前 1 个版本时绝对值很小 —— 问题不在此刻的 0.08 ms，而在它**随版本数线性增长**。

### 1.3 增长曲线（把版本数放大到 N，跑 `surveyReportModes()` 与详情接口的等价逻辑）

| 问卷版本数 | surveys 表字节 | `surveyReportModes()` | `GET /submissions/:id` 等价 |
| --- | --- | --- | --- |
| 1 | 10.7 KB | 0.085 ms | 0.159 ms |
| 10 | 105 KB | 0.805 ms | 0.868 ms |
| 50 | 526 KB | 3.722 ms | 3.451 ms |
| 100 | 1.03 MB | 7.364 ms | 7.175 ms |
| 200 | 2.10 MB | 14.588 ms | 14.791 ms |
| 400 | 4.11 MB | 28.644 ms | 28.626 ms |

线性系数 ≈ **0.072 ms / 版本 / 请求**，与版本数几乎严格成正比（每次请求都要把整张 `surveys` 表读进内存并逐行解析）。

Node 是单线程：名单页 + 详情页 + CSV 并发几次，这个 CPU 会直接堵住事件循环，表现为「后台越用越卡」，而不是某个接口报错 —— 这也是它容易被当成「前端慢」的原因。

### 1.4 复现方法（只读，可随时重跑）

```bash
# 1) 复制数据库快照（不要直接开原库，避免 WAL 干扰）
mkdir -p _scratch/dbcopy && cp data/vesta.db data/vesta.db-wal data/vesta.db-shm _scratch/dbcopy/ 2>/dev/null

# 2) 统计与计时（node:sqlite，Node 24 内置）
node -e '
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("_scratch/dbcopy/vesta.db");
const rows = db.prepare("SELECT id, length(data) b, data FROM surveys").all();
console.log("versions:", rows.length, "bytes:", rows.reduce((a,r)=>a+r.b,0));
const t = performance.now();
for (let i = 0; i < 1000; i++) for (const r of rows) JSON.parse(r.data);
console.log("surveyReportModes ~", ((performance.now()-t)/1000).toFixed(3), "ms/req");
'

# 3) 放大版本数再看（只写副本）
#    见附录 A 的完整脚本：向副本插入 N 份问卷后重测
```

实测输出已抄录在第 1.2 / 1.3 节；脚本在 `_scratch/probe-*.ts`（一次性，收尾已删，附录 A 保留核心逻辑）。

---

## 2. 链路逐环节判定（必须指到具体环节）

| 环节 | 代码位置 | 实际发生了什么 | 判定 |
| --- | --- | --- | --- |
| **取页**（DB 取数） | `routes/admin/shared.ts:17,34`<br>`db/surveys.ts:7` | 热点路径是 `SELECT id, data FROM surveys` —— **全表、无 WHERE、无列裁剪**，且 `surveyCache()` 取完还额外调 `getActiveSurvey()` 再查一次同一行 | **根因之一**：把「一份问卷」的事实按「整张表」取 |
| **解码** | `node:sqlite` → JS string | SQLite 交给 Node 已是 UTF-8 字符串，没有额外解码环节；不存在编码层浪费 | **无关**（排除） |
| **选链** | `public.ts:152,185,288,514`<br>`routes/admin/shared.ts:49` | `getSurvey(id) ?? getActiveSurvey()` 与 `reportModeOf(map, id) ?? 'ai'`：把「**答卷**的报告模式」当成「**问卷**的属性」在运行时反查；查不到就静默换成另一份问卷或默认 `ai` | **根因之一**：建模错位（事实归属错了表） |
| **解析** | `routes/admin/shared.ts:21,39`<br>`db/surveys.ts:12` | 每请求每行 `JSON.parse`，无进程缓存、无请求级去重；`/submissions/:id` 同一份 data 解析两次 | **放大因素**（成本落在这一层，但它是结果不是原因） |
| **落库** | `routes/public.ts:228-245`（提交写库）<br>`db/schema.ts:46-70` | 提交时**已经拿到** `survey.reportMode`，`submissions` 却没有这一列；`publishSurvey()` 每次保存都插新版本、从不清理 | **根因（第一性）** + **时间炸弹** |

**一句话定位：问题出在「落库少写了一列」，症状出现在「解析」，「取页」把它放大成 O(版本数)，「选链」把它扩散到所有读接口。**

---

## 3. 问题清单（按严重度）

### P0 — 结构性，必须修

**P0-1 `submissions` 未持久化 `report_mode`，所有列表请求被迫全表解析问卷**

- 位置：`server/src/db/schema.ts:46`（表缺列）、`server/src/routes/admin/shared.ts:33-47`（`surveyReportModes()`）、调用点 `routes/admin/submissions.ts:146`、`routes/admin/roster.ts:45`
- 影响：`GET /admin/submissions`、`GET /admin/roster`、`GET /admin/submissions/:id` 每次请求都要读全表 + 逐行解析。名单页是咨询师最高频页面，成本随发布次数线性上升。
- 证据：第 1.3 节曲线；`reportMode` 只是 `doc` / 非 `doc` 一个布尔，却要用 10.7 KB/版本的解析换来。

**P0-2 `surveys` 只增不删，读端全表 → 越用越慢的时间炸弹**

- 位置：`server/src/db/surveys.ts:32-57`（`publishSurvey()` 每次 `INSERT` 新行；全仓库无 `DELETE FROM surveys`）
- 影响：保存问卷 100 次 = 100 行 × 10.7 KB ≈ 1 MB；`surveyReportModes()` 每次请求 7.4 ms（实测）。这是**不可逆的单调劣化**，重启也不恢复。
- 注：历史版本必须保留（老答卷要按当年问卷渲染），所以不能靠删行解决 —— 必须让读路径**不再依赖整表**。

### P1 — 高：热点路径重复付账

**P1-1 `getActiveSurvey()` 无进程缓存**

- 位置：`server/src/db/surveys.ts:18-30`；调用点 `routes/admin/overview.ts:28`、`settings.ts:30,77,207`、`invites.ts:48`、`ai/generate.ts:543`
- 影响：每个请求 0.076 ms；报告页 `GET /api/report/:slug` 在生成期间每 3 秒轮询（`web/src/views/ReportView.vue:258`），单份报告最多约 80 次解析。
- 对照：仓库里已有同模式先例 `routes/consult/shared.ts:53-65`（`readPurposePayload()` 按 mtime 缓存），问卷没有。

**P1-2 `GET /submissions/:id` 单请求把同一份问卷解析两次**

- 位置：`routes/admin/submissions.ts:178`（`getSurvey`）+ `:191`（`surveyReportModes()` 又建一次全表 map）
- 影响：同一 handler 里 N+1 次解析；且第 191 行明明已有第 178 行的 `survey` 对象，直接判断 `survey.reportMode` 即可。

**P1-3 `surveyCache()` 已有缓存却仍是全表 + 额外取数**

- 位置：`routes/admin/shared.ts:16-27`（`SELECT id, data FROM surveys` + 逐行解析 + `getActiveSurvey()` 再查一次）
- 影响：CSV 导出（`submissions.ts:68`）每请求 N+1 次解析；「一次请求内复用」的注释方向正确，但取数范围仍是全表。

### P2 — 中：正确性与副作用

**P2-1 `?? getActiveSurvey()` 静默回退，会用「另一份问卷」验证答卷**

- 位置：`routes/public.ts:152,185,288,514`
- 影响：问卷行缺失/损坏时，学生拿到的问卷与邀请链接指定的版本不一致：`validateAnswers()` 用错问卷 → 返回「还有必答题没有完成」这类误导性报错，而不是「链接失效」。这是**正确性问题**，不是性能问题。
- 当前不触发（`surveys` 不删行），但一旦做 P0-2 的历史归档就会变成现实风险。

**P2-2 读路径写库：`getActiveSurvey()` 里 `INSERT OR IGNORE` + `setSetting`**

- 位置：`db/surveys.ts:22-28`
- 影响：GET 请求可能触发写事务与 WAL 增长（首次/数据异常时）；「读接口不写库」这条不变量被打破。应挪到启动迁移。

**P2-3 `parseJson(row.scores, computeScores(survey, {}))` 的兜底提前求值**

- 位置：`routes/admin/submissions.ts:180`、`routes/public.ts:291`（`util.ts:95-102` 的 `fallback` 参数是普通实参，调用前必算）
- 影响：每次请求白算一次 `computeScores`（0.0057 ms，全 28 题）；且兜底值是「按空答卷算出来的 0 分」——数据损坏时会静默展示一份全 0 评分卡，而不是报错。属于「读路径做了无谓工作 + 兜底语义可疑」。

### P3 — 低：同类与相邻

**P3-1 邀请接口每次都下发整份 10.7 KB 问卷，无 ETag / 版本化 URL**

- 位置：`routes/public.ts:152-159`（`GET /api/invite/:token` 直接内联 `survey`）
- 影响：传输层重复；与本次根因同源（问卷版本没有稳定标识可缓存），但属于独立优化项。

**P3-2 相邻同类：`getTemplate()` 每请求也 `JSON.parse`**

- 位置：`db/templates.ts:9`；报告页轮询同样每次解析模板 JSON
- 影响：与问卷同一模式，建议在 L2 缓存层里顺带覆盖（范围可单列，不在本次主修范围）。

---

## 4. 修复方案（分层）

分层原则：**先修「事实落在哪张表」（数据契约），再修「按什么范围取数」，最后才谈缓存。** 反过来做（先加缓存）会把错误的数据形状固化下来。

### L0 数据契约层（根治，必做）

**目标**：答卷的报告模式在提交时固化，读路径不再接触问卷 JSON。

| 改动 | 位置 | 内容 |
| --- | --- | --- |
| 建表 | `server/src/db/schema.ts:46` | `submissions` 增列 `report_mode TEXT NOT NULL DEFAULT ''` |
| 迁移 | `server/src/db/migrations.ts`（仿 `ensureScoreLineColumns()` L474-489） | `PRAGMA table_info(submissions)` 判断缺列 → `ALTER TABLE ... ADD COLUMN`；再回填；**可重复执行** |
| 回填 | 同上 | `UPDATE submissions SET report_mode = CASE WHEN (SELECT json_extract(s.data,'$.reportMode') FROM surveys s WHERE s.id = submissions.survey_id)='doc' THEN 'doc' ELSE 'ai' END WHERE report_mode=''`；语义必须与现有 `reportModeOf()` 一致（`doc` → `doc`，其余 → `ai`） |
| 写入 | `server/src/routes/public.ts:228` 提交插入 | INSERT 时带上 `survey.reportMode === 'doc' ? 'doc' : 'ai'` |
| 读取 | `routes/admin/submissions.ts:146,191`、`roster.ts:45` | 直接用 `row.report_mode`；删除 `surveyReportModes()` 的调用；`report_mode=''` 的历史行回退一次查询并顺手回填（实施时改为纯函数兜底 `'' → ai`，见 §8.2） |
| 收尾 | `routes/admin/shared.ts:33-47` | `surveyReportModes()` 退化为迁移工具函数或删除 |

**已在本机副本上验证过**（只写 `_scratch` 副本，未动原库）：

- `json_extract` 可用（SQLite JSON1 已编译进 `node:sqlite`）：`SELECT json_extract('{"reportMode":"doc"}','$.reportMode')` → `doc`；
- `ALTER TABLE` + 回填 6 行成功，全部 `doc`；
- **第二次执行改动 0 行**（可重复）；
- 修复后列表读列 **0.0089 ms** vs 现状 **0.0810 ms**（1 个版本），且不再随版本数变化。

**风险 / 回滚**：加列只增不改，旧代码忽略该列即可运行（回滚安全）；回填失败不影响写路径（新答卷仍会写值）。

### L1 取数层（同批，小改动）

- 删除请求路径上的 `SELECT id, data FROM surveys` 全表查询；确需按 id 取时用 `WHERE id IN (...)` 只取用到的版本，并只选需要的列（模式判断可直接用 `json_extract` 在 SQL 里完成，省掉 JS 解析）。
- `surveyCache()` 内部复用：一次 `SELECT` 里带出 active 行，或从 `byId` 里取，不再二次 `getActiveSurvey()`（`shared.ts:26`）。
- 现状 `migrations.ts` / `settings.ts` 里有 `SELECT COUNT(*) FROM surveys` 之类的轻查询，可保留（不解析 JSON）。

### L2 解析缓存层（第二批，L0 落地后评估）

- 进程内 `Map<surveyId, { version, survey }>` + active id 缓存（沿用 `readPurposePayload()` 的写法：缓存 + 失效条件）。
- 失效点：`publishSurvey()`、`migrate()` 升级问卷、启动时 `getActiveSurvey()` 自愈写入 —— 全部集中到 `db/surveys.ts`，别散落在路由里。
- **隔离方式用「只读约定 + `Object.freeze`（开发期断言）」，不要用 `structuredClone`**：实测克隆 0.0994 ms 比重新解析 0.0424 ms 更贵，克隆只会把「省下的解析」还回去。
- 前提：现有调用方只读问卷（已核对：`shared.ts:40`、`submissions.ts:106`、`public.ts:209,297,515`、`settings.ts:79`、`generate.ts:547` 全是读取，无原地改写）。

### L3 选链正确性层（同批，可与 L1 一起做）

- `getSurvey(id) ?? getActiveSurvey()` 的回退改为**显式**：`getSurvey()` 返回 `null` 时打 `log.warn('survey.missing', { inviteId, surveyId })`，按场景返回 404/409（「链接对应的问卷版本不存在」），不再拿另一份问卷顶替。
- `reportModeOf()` 的默认值从隐式 `'ai'` 改为显式回退并记日志，避免「问卷缺失 → 悄悄当 ai → 后台显示分数」。
- 注意：这会改变学生端错误文案，属于产品口径变更，**需要用户确认**（见第 7 节）。

### L4 可选（后续单独立项）

- `GET /api/invite/:token` 的问卷体加 `ETag`（问卷 `id` + `version`）或返回版本号由前端带 `If-None-Match`；`Cache-Control` 仍保持 `no-store` 的话至少加版本化 JSON 端点。
- `getTemplate()` 同模式缓存。

### 4.1 为什么是这套，而不是别的

| 备选方案 | 能解决什么 | 为什么不够 / 不选 |
| --- | --- | --- |
| **A. 只加进程缓存（不动表）** | 消掉重复解析 | 没修建模错位：读路径仍然「必须拿到整份问卷」；缓存失效散落多处；冷启动/重启后第一波请求仍 O(N)；多进程部署（若将来）各自为政。**只能作为 L2，不能当根治** |
| **B. 只在 SQL 里用 `json_extract`** | 省掉 JS 解析 | 实测 0.0306 vs 0.0407 ms/次（1 行），仍然 O(版本数) 扫描；只省 25%，不解决增长 |
| **C. 把问卷拆成 questions/options 关系表** | 彻底告别 JSON | 破坏「问卷是一份可发布快照」的核心语义（发布版本 = 不可变快照，老答卷按当年版本渲染）；30+ 处消费方重写，还要改问卷设计文档口径。收益远小于成本 |
| **D. 引入 Redis / 外部缓存** | 跨进程共享 | 当前是单实例部署（`report-queue.ts` 的并发队列注释即按单进程设计），引入外部依赖不值得；进程内缓存足够 |
| **E. 把整份 survey 冗余进 `submissions`** | 读时零查询 | 每行 +10.7 KB，6 行 → 6 行冗余；而真正需要的只是一个枚举。用列不用整份 |
| **F. 什么都不做，等它变慢再说** | — | 线性劣化且不可逆（历史版本只增），越晚修数据越多、回填越慢 |

**最终选择：L0 必做（根治）→ L1 + L3 同批（小改动、顺手把正确性一起修）→ L2 视 L0 效果再决定是否值得。** 理由：L0 把「每请求解析」从根上去掉，之后 L2 的收益只剩「渲染问卷的少数请求」，风险和复杂度可以晚一步承担。

---

## 5. 验证计划

> 最小验证（MVP）只作为本节的一环，不单独立项。

### 5.1 基线复现（已完成）

用第 1.4 节方法测出当前成本：1 版 0.085 ms、100 版 7.36 ms、400 版 28.6 ms（`surveyReportModes()`）。

### 5.2 迁移验证

- 老库（无 `report_mode` 列）启动 → 自动加列 + 回填；连续启动两次，第二次 `changes = 0`（已在本机副本验证）。
- 回填正确性：`doc` 答卷回填为 `doc`，`ai`/历史答卷为 `ai`，与修复前 `reportModeOf()` 的展示一致。
- 新库（空库）启动 → 不执行回填、不报错。

### 5.3 行为等价验证（关键，防回归）

- 后台名单 / 答卷列表 / 答卷详情 / CSV 导出：`reportMode` 与修复前逐行一致；`doc` 答卷不显示分数、`ai` 答卷照常显示。
- 报告页 `/r/:slug`：doc 答卷仍走 AI 全文、ai 答卷仍走模板报告。
- 问卷页 `/i/:token/quiz`：题目、跳题、提交校验不变。

### 5.4 性能验证（目标：与版本数无关）

- 造 100 个问卷版本（`_scratch` 副本或临时 `DATA_DIR`），对比修复前后 `GET /admin/roster`、`GET /admin/submissions`、`GET /admin/submissions/:id` 的 p50/p95。
- **通过标准：耗时曲线相对版本数变平**（修复后 ≈ 常量），而不是「快了 x%」。
- 反证检查：`grep -rn "FROM surveys" server/src` 后，请求路径上不应再出现 `SELECT id, data FROM surveys`。

### 5.5 手工走查

后台概览 / 学员名单 / 答卷详情 / CSV 导出 / 问卷设置 / 报告页（生成中轮询 + 完成后展示）/ 问卷页提交一套。

### 5.6 工程门槛

`npm run verify`（`check:docs` + `check:size` + `check:version` + `check:dates` + `check:score` + `check:audit` + `typecheck` + `build`）全绿；新文件 ≤400 行；`shared.ts` 改动后仍在 600 行软线内。

### 5.7 MVP（最小可交付切片）

- 范围：仅 L0 + L1（`schema.ts` 加列、`migrations.ts` 加迁移、`public.ts` 写入、`submissions.ts` / `roster.ts` 读列、删 `surveyReportModes()` 调用）。
- 验收：请求路径零问卷解析 + 行为等价 + `npm run verify` 全绿。
- L2 缓存、L3 错误文案、L4 ETag 都不进 MVP。

---

## 6. 实施清单与版本动作

| 文件 | 改动 | 层 |
| --- | --- | --- |
| `server/src/db/schema.ts` | `submissions` 增 `report_mode` | L0 |
| `server/src/db/migrations.ts` | `ensureSubmissionColumns()` + 回填（可重复） | L0 |
| `server/src/routes/public.ts` | 提交插入带 `report_mode` | L0 |
| `server/src/routes/admin/submissions.ts` | 列表/详情/CSV 读列；删重复调用 | L0/L1 |
| `server/src/routes/admin/roster.ts` | 读列 | L0 |
| `server/src/routes/admin/shared.ts` | 删除 `surveyReportModes()`；`surveyCache()` 收窄取数 | L0/L1 |
| `server/src/db/surveys.ts` | （L2）进程内缓存 + 失效 | L2 |
| `server/src/routes/public.ts`（回退点） | （L3）显式 4xx + 日志 | L3 |

版本动作按 `AGENTS.md` 六步：根 `package.json` 升 `1.81.0` → `docs/README.md`「已完成」+ 版本记录表 → `docs/development-history.md` 本轮小节 → 本文档状态改「已实施并提交（v1.81）」并补实施记录 → 本目录 `README.md` 索引表更新 → `npm run verify` 全绿后提交。

**部署**：纯加列 + 启动回填，`bash update.sh` 即可；回滚用 `git revert`（旧代码忽略新列，无需回滚数据）。
**备份**：回填前按仓库规范 `VACUUM INTO` 备份（`update.sh` 已自动做）。

---

## 7. 待确认（需要用户拍板）

1. **生产实际版本数**：请在服务器上跑 `sqlite3 data/vesta.db 'SELECT COUNT(*) FROM surveys'`（或 `SELECT version FROM settings WHERE key='active_survey'` 后查该行）。这决定 P0-2 的紧迫度写实口径 —— 如果已经上百版，建议立即排期。
2. **是否接受加列 + 启动回填**（L0）？这是唯一动表结构的方案，也是根治方案；若只想先止血，可先做 L1 缩范围 + L2 缓存，但问题会留存。
3. **是否同批改学生端错误文案**（L3 把「问卷版本缺失」显示为 404/409）？这会改变用户看到的提示，属于产品口径。
4. **是否把 `getTemplate()` 一并纳入**（P3-2，同模式）？建议单独立项，避免本轮范围膨胀。

> 本轮按 §5.7 MVP 实施：第 2 项（加列 + 启动回填）已采纳；第 1 项（生产实际版本数）仍建议在服务器上核对一次；第 3 项（学生端错误文案）与第 4 项（`getTemplate()`）未做，留到后续单独立项。

---

## 8. 实施记录（v1.81，2026-11-14）

### 8.1 实际改动

| 文件 | 改动 |
| --- | --- |
| `server/src/db/surveys.ts` | 新增 `ReportMode`、`surveyReportMode()`（提交时固化）、`normalizeReportMode()`（历史空串按 `ai`） |
| `server/src/db/schema.ts` | `submissions` 增 `report_mode TEXT NOT NULL DEFAULT ''` |
| `server/src/db/migrations.ts` | `ensureSubmissionColumns()` 增列；新增 `backfillSubmissionReportModes()`，在 `migrate()` 之后执行（回填与旧读路径同一时刻看到的问卷数据一致） |
| `server/src/db.ts` | 导出上述两个函数与 `ReportMode` |
| `server/src/routes/public.ts` | 提交答卷 INSERT 带 `report_mode`（`surveyReportMode(survey)`） |
| `server/src/routes/admin/submissions.ts` | 列表 SELECT 带 `s.report_mode`；详情直接用 `row.report_mode`；CSV 分数列改用 `row.report_mode`；`surveyCache()` 只取本页用到的问卷版本 |
| `server/src/routes/admin/roster.ts` | 名单 SELECT 带 `s.report_mode`，`reportMode` 直接读列 |
| `server/src/routes/admin/shared.ts` | 删除 `surveyReportModes()` / `reportModeOf()` / `ReportMode`；`surveyCache(ids)` 改为 `WHERE id IN (...)`，`active` 懒加载 |

### 8.2 与方案的两处实现取舍

- **空串行不再「回退一次查询并顺手回填」**：方案 §4 L0 的读取列写的是 `report_mode=''` 时回退查询并随手写库。实施时改为启动迁移统一回填、读路径只做 `'' → ai` 的纯函数兜底。理由：读接口不写库（方案自己的 P2-2），且旧 `reportModeOf()` 对「问卷缺失 / JSON 损坏」的默认值本来就是 `ai`，语义等价。
- **`surveyCache()` 必传 `ids`**：不再保留无参全表分支，避免以后有人误用又把全表扫描加回来。

### 8.3 验证（本机副本，未动 `data/vesta.db`）

- 迁移：复制 `data/vesta.db(+wal/shm)` 到 `_scratch`，启动后自动加列并回填 6 行（全部 `doc`）；第二次、第三次启动回填 `changes = 0`；空库启动不执行回填、不报错。
- 回填语义：`reportMode='ai'` 的问卷 → `ai`；`survey_id` 指向不存在的问卷 → `ai`，与旧 `reportModeOf()` 的默认值一致。
- 行为等价：`GET /admin/submissions`、`/admin/roster`、`/admin/submissions/:id` 的 `reportMode` 全为 `doc`，与修复前一致；CSV 总分列为空；新提交一份答卷后库里 `report_mode='doc'`，与问卷当前模式一致（提交路径未注册 AI runner，未触发真实生成）。
- 性能：造 1 / 101 / 401 个问卷版本，列表 / 名单 / 详情 / CSV 四个接口 p50 分别 0.59–0.99 ms，p95 0.87–1.64 ms，**与版本数无关**；修复前同口径为 100 版 7.36 ms、400 版 28.6 ms。
- 反证：`grep -rn "FROM surveys" server/src` 后，请求路径上只剩按 id 取单行、`WHERE id IN (...)` 和 `COUNT(*)`，没有 `SELECT id, data FROM surveys` 全表查询。
- 工程门槛：`npm run verify` 全绿。

### 8.4 部署与回滚

- 纯加列 + 启动回填，`bash update.sh` 即可；回填前按仓库规范用 `VACUUM INTO` 备份。
- 回滚：`git revert` 后旧代码忽略新列即可运行，无需回滚数据。

---

## 附录 A：探针脚本核心逻辑（一次性脚本已删除，可据此重建）

```ts
// 只读：复制 data/vesta.db(+wal/shm) 到 _scratch/dbcopy，再测
const db = new DatabaseSync('_scratch/dbcopy/vesta.db')

// 现状：surveyReportModes() 等价
const map = new Map<string, string>()
for (const row of db.prepare('SELECT id, data FROM surveys').all() as { id: string; data: string }[]) {
  const s = JSON.parse(row.data) as { reportMode?: string }
  map.set(row.id, s.reportMode === 'doc' ? 'doc' : 'ai')
}

// 迁移可行性（副本上）
db.exec("ALTER TABLE submissions ADD COLUMN report_mode TEXT NOT NULL DEFAULT ''")
db.prepare(`UPDATE submissions SET report_mode = CASE
  WHEN (SELECT json_extract(s.data,'$.reportMode') FROM surveys s WHERE s.id = submissions.survey_id)='doc'
  THEN 'doc' ELSE 'ai' END WHERE report_mode=''`).run()

// 修复后：列表读列
db.prepare('SELECT id, survey_id, report_mode FROM submissions').all()
```

## 附录 B：实测原始数据

```
{ "surveys": 1, "bytes": 10764, "questions": 28, "reportMode": "doc" }
JSON.parse(问卷 JSON)                      0.0424 ms
structuredClone(已解析问卷)                0.0994 ms
computeScores(survey, {}) 空答案兜底        0.0057 ms
SELECT data FROM surveys WHERE id=?        0.0413 ms
getSurvey(id) 取数+解析                    0.0757 ms
getActiveSurvey()                          0.0764 ms
surveyReportModes()（1 版）                0.0758 ms
surveyCache()（1 版）                      0.1562 ms
增长曲线（surveyReportModes）: 1→0.085  10→0.805  50→3.722  100→7.364  200→14.588  400→28.644 ms
迁移验证: json1 可用 / 回填 6 行 / 二次执行 0 行 / 修复后列表读列 0.0089 ms
```
