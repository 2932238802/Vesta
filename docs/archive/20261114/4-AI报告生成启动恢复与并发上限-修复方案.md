# AI 报告生成：启动恢复与并发上限 · 修复方案

> 状态：**已实施**（产品版本 v1.78，本地待提交）
> 方案版本：v1.0（2026-11-14）
> 决策来源：2026-11-13 项目优化审阅发现的 P0 项；2026-11-14 用户要求把「现状 + 方案」落成文档。
> 一句话：AI 报告的「谁在跑」只记在 Node 进程内存里，重启即丢；同时没有任何并发闸门，集中提交会把 AI 网关和报告链路一起打崩。本方案加「启动扫描恢复 + 固定并发队列」，不改报告口径、不改页面。
> 目录索引：[README.md](./README.md)。

---

## 一、现状

### 1.1 一份 AI 报告是怎么跑起来的

正常路径（以 doc 模式为例）：

| 步骤 | 位置 | 事实 |
| --- | --- | --- |
| 提交即开跑 | `server/src/routes/public.ts:269` | `startReportGeneration(id)` 在提交事务提交后立刻调用，不排队、不等待 |
| 标记 running | `server/src/ai/generate.ts:528-538` | `UPDATE submissions SET ai_status='running', ai_started_at=... WHERE id=? AND ai_status!='ready'`，`changes===0` 直接返回 |
| 博查检索 | `server/src/ai/doc-generate.ts:99` → `server/src/ai/doc-search.ts:358` | 最多 3 个检索词、串行执行，词间 `sleep(500)`；单次外呼 25 秒超时（`bocha.ts:114`），429 时 1.2/2.4/3.6 秒退避 |
| AI 写正文 | `server/src/ai/doc-generate.ts:157` | 一次初始生成，`AI_TIMEOUT_MS` 默认 240 秒（`server/src/env.ts:87`） |
| 审计不过重写 | `server/src/ai/doc-generate.ts:170` | 最多 2 轮重写，每轮又是一次 AI 调用（240 秒） |
| JSON 不合法修复 | `server/src/ai/doc-generate.ts:60-75` | 再补一次 AI 调用 |
| 成功 / 失败 | `server/src/ai/generate.ts:558-575` / `611-646` | 成功写 `ready`；可重试错误写 `pending` 并 5/15/30 秒后再来；否则写 `failed` |
| 防重复 | `server/src/ai/generate.ts:61-62`、`659-680` | 进程内 `running` Set 挡住同一份重复跑；`retryTimers` 存重试闹钟 |

结论：**一份报告最坏能跑十几分钟**（检索约 76 秒 + 初始生成 240 秒 + 2 次重写 480 秒 + JSON 修复 240 秒）。这不是问题本身，问题在于下面两件事都没有做。

### 1.2 缺「启动恢复」：状态在库里，队列在内存里

数据库只存状态（`submissions.ai_status`：`pending / running / ready / failed`，见 `server/src/db/schema.ts:46-71`），**没有「待办队列」这一层**；真正「谁正在跑」是 `generate.ts:61-62` 的两个内存变量。

进程一重启（`bash update.sh` 部署、崩溃被 systemd 拉起、机器重启）：

```text
数据库：某答卷 ai_status = 'running'（写着"正在生成"）
进程内：running Set 为空，没有任何代码在执行它
```

**没有任何地方在启动时把它捡起来。** `server/src/index.ts:175-185` 的启动回调只做了 `warnIncompleteConfig()`、`server.started` 日志和 `pruneEventLogs()`。

目前唯一的恢复入口在页面侧：

| 位置 | 逻辑 |
| --- | --- |
| `public.ts:334`、`public.ts:427` | 打开报告页（含 3 秒轮询）时调 `ensureReportGeneration()` |
| `generate.ts:682-709` | `ready` 返回 false；`running` 且 `ai_started_at` 距今 **< 4 分钟** 视为还活着、不动；超过 4 分钟或状态是 `pending` 才重新点火 |
| `generate.ts:699-705` | `failed` 且 `ai_attempts >= 4` 不再自动重试 |

由此得到三个场景：

| 场景 | 实际结果 |
| --- | --- |
| 学生一直开着报告页 | 能自愈，但要从 `ai_started_at` 算起白等最多 **4 分钟**，然后整份从头重跑（再花一次 AI 费用） |
| 学生已关页面 / 还没打开 | **永远不恢复**。记录停在 `running`，后台显示「生成中」，实际无人执行；直到下一次有人打开这份报告 |
| 失败后正在等 5/15/30 秒重试 | 重试闹钟（`generate.ts:649-657` 的 `retryTimers`）也只在内存里，重启后没人推；同样要等页面打开才继续 |

对照：咨询稿链路在模块加载时就调 `markStaleConsultJobs()`（`server/src/routes/consult/runs.ts:192-203`），把 `queued / running` 全部标成失败并写明「服务器在生成过程中重新启动，这次生成没有完成。可以点击重试继续。」——**报告链路没有等价的交代**。

### 1.3 缺「并发上限」：`running` 只去重，不限流

`startReportGeneration()`（`generate.ts:659-680`）的判断只有一条：`running.has(id)` 就跳过。它回答的是「这一份是不是正在跑」，**不回答「一共能跑几份」**。

而提交接口是无条件立刻开跑（`public.ts:269`）。于是：

- 同一时间段 N 个人交卷 → N 条完整链路同时扑向 AI 网关和博查；
- 网关限流 / 503 → 大家一起失败 → 大家一起按 5/15/30 秒重试 → 同一秒再次一起打过去，越滚越大；
- 每份只有 4 次机会（`generate.ts:63` 的 `MAX_AI_ATTEMPTS`），一波 503 就能把一批人的机会烧光，最后落到 `failed`，学生看到失败页；
- 博查按次计费，不同城市 / 专业的检索词不同、缓存命中不了，就是 N 倍外呼、N 倍费用；
- 单进程 Node 同时做 JSON 解析、审计正则、报告渲染，CPU 明显上台阶；
- 所有请求共用 240 秒超时，容易「同时开始、同时超时、同时重试」。

典型触发：发链接后 10 分钟内集中提交、一个班或一场宣讲会后集中填。

**两者叠加的最坏情况**：部署那一刻正好有一批在跑 → 内存队列清空、库里全卡 `running` → 学生页面轮询看到「还在写」→ 4 分钟后逐个重新点火 → 同一时刻又全部重新打一遍，正好撞上没有并发上限。

### 1.4 为什么现在没暴露

单量小、部署不频繁、学生提交后基本都开着页面等，1.2 里的「4 分钟页面自愈」刚好挡住了大多数情况。属于「平时不出事、一出事说不清」的问题：报告永久停在 `running` 时，后台没有任何提示，日志里也看不出「这份没人跑」。

### 1.5 本文范围

**在范围内**：AI 报告的启动恢复、并发控制、重试与手动重生成的衔接。

**不在范围内**：报告内容与口径、`doc-audit` 审计规则、前端页面与轮询节奏、`MAX_AI_ATTEMPTS` 的次数、`event_facts` 与埋点、结论页的失败兜底文案（已在 `development-history.md` 记为已知后续事项）。

---

## 二、解决方案

### 2.1 设计目标与非目标

| 项 | 结论 |
| --- | --- |
| 目标 1 | 服务启动后，库里所有 `pending / running` 的报告自动续跑，**不需要有人打开页面** |
| 目标 2 | 同时生成的报告数有上限，默认 **2**（先写常量，需要现场调时再提成环境变量）；排队的记录保持 `pending`，页面行为不变 |
| 目标 3 | 不改数据库表结构、不改报告生成逻辑、不改前端 |
| 非目标 | 不引入 Redis / 消息队列 / 持久化队列表（当前是单进程部署，见 `server/src/index.ts:183-184` 注释）；不做多实例 |
| 非目标 | 不做推送（SSE / WebSocket），现有 3 秒轮询够用 |

### 2.2 总体设计

新增 `server/src/ai/report-queue.ts`（新文件，目标 ≤120 行），职责只有三件：

1. **入队**：`enqueueReport(submissionId, delayMs?)`，去重、FIFO、延迟任务；
2. **调度**：`pump()` 在并发未满时取下一份，交给注入的 `runner`；
3. **恢复**：`resumeUnfinishedReports()` 启动时扫库，只读 `submissions`。

`generate.ts` 保留「跑一份」的实现（`generate()` → 导出为 `generateSubmission()`），**只把「防重复 / 重试闹钟」两件事挪进队列**：

| 现在（generate.ts） | 改后 |
| --- | --- |
| `running` Set（`:61`） | `report-queue.ts` 的 `running` / `waiting` |
| `retryTimers`（`:62`） | `enqueueReport(id, delay)` |
| `startReportGeneration()`（`:659-680`） | `enqueueReport()`（保留同名薄包装可选，便于对照） |
| `scheduleReportGeneration()`（`:649-657`） | 删除，改 `enqueueReport(id, RETRY_DELAYS_MS[...])` |

依赖方向：`report-queue.ts` **不 import** `generate.ts`；由 `index.ts` 把 `generateSubmission` 注册进去，避免循环依赖：

```ts
// report-queue.ts（示意）
export function startReportQueue(runner: (id: string) => Promise<void>): void
export function enqueueReport(id: string, delayMs?: number): void
export function resumeUnfinishedReports(): void
```

### 2.3 启动恢复

**扫描 SQL**：

```sql
SELECT id FROM submissions
WHERE ai_status IN ('pending', 'running')
ORDER BY created_at ASC
```

**判定规则**：

| 记录状态 | 处理 |
| --- | --- |
| `running`，`ai_started_at` 是上一进程写的 | 直接重新入队。单实例部署下，启动瞬间看到的 `running` 一定是「上一个进程已经死了」，不需要保留 4 分钟阈值 |
| `pending`，`ai_error` 带「将自动重试」 | 直接入队（重启已经过去一段时间，不必再等原定 5/15/30 秒） |
| `pending`，刚提交还没来得及跑 | 入队，正常排队 |
| `failed` | 不入队（保持现状：由页面「重试」按钮触发） |
| `ai_attempts >= MAX_AI_ATTEMPTS` | 不入队（即使状态异常，也不再自动烧 AI） |

**调用点**：`server/src/index.ts` 的 `app.listen` 成功回调里，放在 `pruneEventLogs()` 旁边：

```ts
startReportQueue(generateSubmission)
resumeUnfinishedReports()
```

放在 listen 成功之后（而不是模块加载时），避免「端口起不来却在花钱跑 AI」。

**未配置 AI 时直接跳过**，与现有 `ensureReportGeneration()` 的 `!isAiConfigured()` 提前返回保持一致；不要把一批记录在启动时标成 `failed`。

**幂等**：`generate()` 入口已是 `WHERE id=? AND ai_status!='ready'` 且检查 `changes`（`generate.ts:528-536`），重复入队不会重复写 `ready`，也不会覆盖已完成报告。

**恢复的成本**：重启时正在跑的那一份会整份重跑，多花一次 AI 费用；但博查结果有 7 天缓存（`bocha.ts:23`），检索费用基本能省回来。

### 2.4 并发队列

**数据结构**（全部在内存）：

```ts
const waiting: string[] = []             // FIFO
const waitingSet = new Set<string>()     // 入队去重
const running = new Set<string>()        // 正在跑
const timers = new Map<string, Timeout>() // 延迟重试
let runner: (id: string) => Promise<void>
```

**调度**：

```ts
function pump(): void {
  while (running.size < REPORT_CONCURRENCY && waiting.length > 0) {
    const id = waiting.shift()!
    waitingSet.delete(id)
    running.add(id)
    void runner(id)
      .catch((error) => log.error('ai.unhandled', { submissionId: id, err: error }))
      .finally(() => { running.delete(id); pump() })
  }
}

export function enqueueReport(id: string, delayMs = 0): void {
  if (running.has(id) || waitingSet.has(id) || timers.has(id)) return
  if (delayMs > 0) {
    const timer = setTimeout(() => { timers.delete(id); enqueueReport(id) }, delayMs)
    timer.unref?.()
    timers.set(id, timer)
    return
  }
  waiting.push(id)
  waitingSet.add(id)
  pump()
}
```

**并发数**：新增 `server/src/ai/report-queue.ts` 内的常量，默认 2：

```ts
/** 单实例下的 AI 报告并发上限；网关限流明显时再调低。 */
const REPORT_CONCURRENCY = 2
```

先写常量、不做环境变量：当前只有一套部署，改常量要过 `verify`，比多一个没人调的 env 更简单；如果以后需要运营侧现场调，再提成 `AI_REPORT_CONCURRENCY`（默认 2，范围 1–5）。

**状态语义不变**：排队中的记录保持 `pending`，`generate()` 真正开跑时才写 `running`。前端已经是「pending / running 都显示还在写」（`web/src/views/ReportView.vue:284-290`），**页面无需改动**。

**顺序**：FIFO（先提交先跑）。原来是谁先抢到谁先跑，改为先来先跑对用户更公平，差异可接受。

### 2.5 重试、手动重生成与页面兜底的衔接

| 场景 | 现在 | 改后 |
| --- | --- | --- |
| AI 失败自动重试（5/15/30 秒） | `scheduleReportGeneration()` 内存定时器 | `enqueueReport(id, delay)`；重启后由 2.3 的启动扫描覆盖丢失的定时器 |
| 后台「重新生成」 | `regenerateReport()` 置 `pending` 后 `startReportGeneration()` | 同样置 `pending`、`ai_attempts=0`，然后 `enqueueReport(id)`；正在跑时仍按原逻辑不打断 |
| 页面打开时的兜底 | `ensureReportGeneration()` 里 4 分钟判定 | 保留，但内部改为 `enqueueReport(id)`；队列去重保证不会和启动恢复重复跑 |

**注意**：`ensureReportGeneration()` 的 4 分钟阈值继续保留，作为「队列失效」的最后一道兜底；启动恢复上线后它基本不会触发，不需要删。

### 2.6 取舍与量级

- 30 人集中提交、并发 2、单份 3–5 分钟 → 大约 45–75 分钟排完。这个代价换的是「网关不被打崩、每份都有机会成功」，比现在「大家一起失败」好。
- 调高并发要同时看 AI 网关的限流阈值和博查配额；默认 2 是保守值，先观察一周日志（`ai.start` 并发数、`ai.failed` 里是否有 429/503）再决定是否调 3。
- 不做持久化队列：单实例 + 启动扫描已经覆盖「重启」；引入外部队列会把一个 SQLite 单文件项目变成多组件部署，不值得。
- 队列积压时页面只显示「还在写」，没有排位提示；如果以后集中提交量变大，再单独做「前面还有 N 份」的提示（不在本文）。

### 2.7 验证方案

**自动**：`npm run verify`（docs / size / version / dates / audit / typecheck / build 全绿）。

**手工**（临时 `DATA_DIR` + 打桩 `fetch`，不调用真实 AI / 博查、不写仓库 `data/`）：

| # | 场景 | 预期 |
| --- | --- | --- |
| 1 | 造 5 条 `ai_status='pending'` 答卷，启动服务 | 日志里同时 `ai.start` 不超过 2 条；其余排队；最终 5 条都 `ready` |
| 2 | 生成途中 `kill -9`，再启动 | 启动后自动出现 `ai.start`，**全程不打开 `/r/:slug`**，最终 `ready` |
| 3 | 造 1 条 `running`、`ai_started_at` 设成昨天 | 启动后立即续跑，不等 4 分钟 |
| 4 | 造 1 条 `pending`、`ai_error='…将自动重试…'` | 启动后入队重跑 |
| 5 | 造 1 条 `failed`、`ai_attempts=4` | 启动后不入队，页面仍显示失败 + 重试按钮 |
| 6 | 不配置 AI 密钥启动 | 不崩、不批量标 `failed`，日志一条 `ai.unavailable` 级别的跳过说明 |
| 7 | 并发设 1 / 设 3 | 同时 `ai.start` 分别为 1 / 3 条（用日志时间戳验证） |
| 8 | 后台「重新生成」 | 只触发一次 `ai.start`，不与队列重复 |

**静态核对**：

```bash
# 1. 启动回调里有恢复调用
grep -n "startReportQueue\|resumeUnfinishedReports" server/src/index.ts

# 2. generate.ts 里不再有 retryTimers
grep -n "retryTimers" server/src/ai/generate.ts

# 3. 提交 / 页面兜底 / 重新生成 都走 enqueueReport
grep -n "enqueueReport\|startReportGeneration" server/src/routes/public.ts server/src/ai/generate.ts

# 4. 文件规模
npm run check:size
```

### 2.8 文档、版本与回滚

实施时按 `AGENTS.md` 的六步走：

1. 根 `package.json` 升到当时的下一小版本（**不预占 v1.77**：该版本已排给「分数线 v3.3」，见本目录 README；本项排在它之后，以实际实施时的最新版本为准）。
2. `docs/README.md`「已完成」追加一行、版本记录表加一行。
3. `docs/development-history.md` 本轮小节写「改了 / 为什么 / 验证」。
4. 本文顶部状态改为「已实施并提交（产品版本 vX）」，补「实施记录」。
5. 本目录 `README.md` 第二节状态表、顶部状态行同步。
6. `npm run verify` 全绿后提交。

**部署**：无表结构变更，只需常规 `bash update.sh`；重启后第一批 `pending / running` 报告会被自动续跑（这正是本方案要的效果），部署前无需人工清状态。

**回滚**：`git revert` + `bash update.sh`。回滚后队列代码消失，遗留的 `running` 记录回到「有人打开页面才恢复」的旧行为，数据不受影响。

### 2.9 待确认

1. **默认并发**：先按 2 实施（保守），还是一步到 3？建议 2，观察一周 `ai.failed` 里的 429/503 再调。
2. **启动时 `pending` 且带重试倒计时**：立即重跑（本方案）还是按原定 5/15/30 秒补齐等待？建议立即——重启本身已经消耗了时间。
3. **AI 未配置时的启动扫描**：跳过（本方案）还是统一标 `failed`？建议跳过，避免误伤「只是临时没配密钥」的部署。
4. **是否需要积压提示**：报告排队时页面是否要显示「前面还有 N 份」？本轮不做，量上来再说。

---

## 三、实施记录（2026-11-14）

- **实施范围**：按第二节完成，未改报告内容与口径、前端页面、数据库表结构和 `MAX_AI_ATTEMPTS`；依赖方向仍是 `generate.ts → report-queue.ts`，队列不反向 import。
- **新文件** `server/src/ai/report-queue.ts`（109 行）：FIFO `waiting` / `waitingSet`、`running`、延时 `timers`；常量 `REPORT_CONCURRENCY = 2`；导出 `startReportQueue(runner)`、`enqueueReport(id, delayMs?)`、`resumeUnfinishedReports({ maxAttempts })`、`isReportRunning(id)`。
- **`generate.ts`**：删除 `running` Set、`retryTimers`、`scheduleReportGeneration()`、`startReportGeneration()`；`generate()` 导出为 `generateSubmission()`；失败重试改调 `enqueueReport(id, delay)`；`ensureReportGeneration()`（保留 4 分钟阈值）与 `regenerateReport()` 改走队列，后者用 `isReportRunning()` 判断是否正在跑。
- **调用点**：`public.ts` 提交事务后调 `enqueueReport(id)`；`index.ts` 在 `app.listen` 成功回调里注册 runner 并续跑；AI 未配置时只记一条 `ai.unavailable`（`stage=startup_resume`）并跳过，不把记录批量标成失败。
- **实施中修正**：`generate()` 的失败分支是在 runner 内部调用 `enqueueReport(id, delay)` 的，此时 `running` 尚未释放；若按「running 就去重」处理，延时重试会被丢掉。最终让**延时入队**允许在运行中预约（`timers` / `waiting` 仍去重），**立即入队**才被 `running` / `waiting` 挡住。
- **决策**（对应 2.9 待确认）：默认并发 **2**；启动时 `pending` / `running` **立即重跑**（不再补等 5/15/30 秒）；AI 未配置**跳过**续跑；本轮**不做**积压提示。
- **验证**：
  - `npm run verify` 全绿（check:docs / check:size / check:version / check:dates / check:score / check:audit / typecheck / build）。
  - 队列单测（临时 `DATA_DIR` + 假 runner，8 个场景）：5 条积压并发最多 2 且 FIFO、遗留 `running` 启动即续跑、`ai_attempts >= 4` 与 `failed` 不恢复、延时重试被立即重试抢占、重复入队去重、runner 内部预约的延时重试不丢失。
  - 真实服务 + 本地假 AI 端点：6 条遗留记录启动后自动续跑（日志 `ai.resume queued=6 skipped=1`），全程未打开 `/r/:slug`，AI 并发峰值 2；AI 返回 500 时每份按 5/15/30 秒重试 3 次后失败，8 次调用并发始终为 2；AI 未配置时启动只记 `ai.unavailable`，记录保持 `pending / running`，健康检查正常。
  - 未调用真实 AI / 博查，未写仓库 `data/`，未重新生成旧报告。
- **版本**：产品版本 **v1.78**（v1.77 为分数线 v3 Phase 1）；`package.json` → `1.78.0`、`package-lock.json` 根版本同步，`docs/README.md`「已完成」行与版本记录表、`docs/development-history.md` 本轮小节已同步。部署无表结构变更，按常规 `bash update.sh`；回滚 `git revert` + `bash update.sh`。
