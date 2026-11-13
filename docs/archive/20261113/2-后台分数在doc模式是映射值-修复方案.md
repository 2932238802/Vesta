# 后台「分数」在 doc 模式是映射值 · 修复方案

> 版本：v1.1（2026-11-13）　状态：**已实施并提交（产品版本 v1.65，commit dfd14a8）**
> 一句话：doc 模式没有真实总分，提交时把优先级 A/B/C 映射成 82/60/25 写进了 `submissions.total`，后台却把它当「分数」展示，报告里反而没有这个数。
> 实施记录见文末第七节。

---

## 一、故障现象

- 「学员名单」表格的「分数」列显示 **82 / 60 / 25**，旁边是 `A / B / C` 档；
- 答卷详情顶部显示「分数」+「82」+「总分 / 100」；
- CSV 导出的「总分」列也是 82 / 60 / 25；
- 但学员看到的报告页（doc 模式）**根本没有数字总分**（hero 的 `total` 是 `null`），后台和报告对不上。

运营会把这个数当成真实测评得分，跟学员对不上号。

## 二、原因分析

1. **写入端造了一个数**：`server/src/routes/public.ts:178-184`

   ```ts
   const scores: ScoreResult =
     survey.reportMode === 'doc'
       ? (() => {
           const priority = docPriority(survey, answers)
           const total = priority === 'A' ? 82 : priority === 'B' ? 60 : 25
           return { total, tier: priority, dimensions: [], detail: {} }
         })()
       : computeScores(survey, answers)
   ```

   doc 模式真正的结论是 `docPriority()` 给出的 A/B/C（存进 `tier`），`total` 只是为了让 `submissions.total REAL NOT NULL` 有值、让旧列表有东西显示而临时映射出来的，**不对应任何计算**。

2. **读取端无条件展示**：
   - 名单：`web/src/views/admin/Submissions.vue:259`（表头「分数」）+ `:308-314`（`row.tier` + `row.total`），数据来自 `server/src/routes/admin/roster.ts` 的 `total`；
   - 详情：`web/src/views/admin/SubmissionDetail.vue:33-38`（「分数 / 82 / 总分 / 100」）；
   - CSV：`server/src/routes/admin/submissions.ts:43`（「总分」表头）+ `:73`（`row.total`）；
   - 列表接口也返回 `total`：`submissions.ts:101,119`；概览 `recent` 也带 `total`（`overview.ts:126-133,155-166`，当前 UI 只显示 `tier`）。

3. 报告侧不展示这个数（doc 报告 hero 的 `total` 是 `null`），所以只有后台在「自说自话」。

## 三、修复方案

原则：**不再制造假分数；doc 模式只展示 A/B/C 优先级；legacy（`reportMode !== 'doc'`）行为完全不变。**

1. **写入**：doc 模式 `total` 写 `0`（列是 `NOT NULL`，不改表结构），`tier` 照旧写 A/B/C；legacy 模式继续 `computeScores()`。
2. **读接口带出模式**：`/admin/roster`、`/admin/submissions`、`/admin/submissions/:id` 每行/每条增加 `reportMode: 'doc' | 'ai'`（按该答卷的 `survey_id` 查 `surveys.data` 里的 `reportMode ?? 'ai'`；`surveys` 表很小，可在请求内建 `Map` 缓存）。
3. **前端按模式显示**：
   - 名单：doc 模式时「分数」列只显示 `tier`，不显示数字（列名可改「优先级」更准确）；legacy 模式照旧；
   - 详情：doc 模式隐藏「总分 / 100」，只留「优先级 A 档」；
   - 概览 `recent` 不动（本来只显示 `tier`）。
4. **CSV**：doc 行「总分」留空（表头保留，避免不同模式混在一份导出里列错位）；全为 legacy 时行为不变。
5. **历史数据（可选，需确认后再做）**：一次性脚本把 doc 类答卷的 `total` 置 0。判定方式：`submissions.survey_id → surveys.data → reportMode === 'doc'`。写之前用 `VACUUM INTO` 备份。不执行也不影响界面（界面已按模式隐藏）；列表 / 详情接口对历史 doc 答卷仍会返回原 `total`（82/60/25），CSV 已按模式对 doc 行留空。

## 四、需要改动的位置和文件

| 文件 | 位置 | 改动 |
| --- | --- | --- |
| `server/src/routes/public.ts` | 178-184 | doc 模式 `total` 改 `0`，保留 `tier`；legacy 分支不动 |
| `server/src/routes/admin/roster.ts` | 行数据映射 | 每行加 `reportMode`（按 `survey_id` 查） |
| `server/src/routes/admin/submissions.ts` | 43、73 | CSV「总分」：doc 行留空 |
| 同上 | 101、119 | 列表返回 `reportMode` |
| 同上 | 144-155 | 详情返回 `reportMode` |
| `web/src/views/admin/Submissions.vue` | 259、308-314 | `reportMode === 'doc'` 时该列只显示 `tier`（列名「优先级」），不显示 `total` |
| `web/src/views/admin/SubmissionDetail.vue` | 33-38 | doc 模式隐藏「总分 / 100」，只显示优先级 |
| `scripts/fix-doc-total.mjs` | 新增（可选） | 回填历史 doc 答卷 `total = 0`，先备份 |

代码示意：

```ts
// public.ts
const isDoc = survey.reportMode === 'doc'
const scores: ScoreResult = isDoc
  ? { total: 0, tier: docPriority(survey, answers), dimensions: [], detail: {} }
  : computeScores(survey, answers)
```

```ts
// admin/submissions.ts（或抽到 admin/shared.ts）
function reportModeMap(): Map<string, 'doc' | 'ai'> {
  const rows = db.prepare('SELECT id, data FROM surveys').all() as { id: string; data: string }[]
  const map = new Map<string, 'doc' | 'ai'>()
  for (const row of rows) {
    const survey = parseJson<{ reportMode?: string }>(row.data, {})
    map.set(row.id, survey.reportMode === 'doc' ? 'doc' : 'ai')
  }
  return map
}
```

```vue
<!-- Submissions.vue -->
<th>{{ reportMode === 'doc' ? '优先级' : '分数' }}</th>
...
<td>
  <template v-if="row.submissionId">
    <span class="chip accent">{{ row.tier }}</span>
    <span v-if="row.reportMode !== 'doc'" class="num">{{ row.total }}</span>
  </template>
  <span v-else class="quiet small">—</span>
</td>
```

## 五、修改后的验证方式

1. 自动检查：`npm run verify` 全绿。
2. 新答卷（doc 模式）：
   - 名单「优先级」列只显示 A/B/C，没有 82/60/25；
   - 答卷详情没有「总分 / 100」；
   - CSV 导出的「总分」列对这条答卷为空；
   - 报告页行为不变（本来就没有数字总分）。
3. legacy 回归：找一份 `reportMode` 不是 `doc` 的问卷（或临时把当前问卷的 `reportMode` 改成 `ai` 重新发布一份测试问卷），提交后名单仍然显示真实分数和「总分 / 100」。
4. 数据库核对：

   ```bash
   # 新提交应为 0，tier 仍有值
   sqlite3 data/vesta.db "select total, tier, created_at from submissions order by created_at desc limit 5;"
   # 若执行了历史回填：
   sqlite3 data/vesta.db "select count(*) from submissions where total in (82,60,25);"
   ```

5. 接口核对：`GET /api/admin/roster` 返回的每条记录都带 `reportMode`；doc 行 `total` 为 0。

## 六、边界

- 不改 `submissions` 表结构（`total` 继续 `NOT NULL`），不做 database migration。
- 不把 `tier` 改成数字：A/B/C 是产品口径，报告和后台都用它。
- 不重新生成旧报告；报告本身没有数字总分，与本问题无关。
- 历史回填是**独立的数据操作**，需要先备份并单独确认，不包含在代码改动里。

---

## 七、实施记录（2026-11-13，产品版本 v1.65）

- 写入端：`server/src/routes/public.ts:177-183` doc 模式 `total` 固定写 `0`，`tier` 仍写 `docPriority()` 的 A/B/C；legacy 分支继续 `computeScores()`。
- 读接口：新增 `server/src/routes/admin/shared.ts` 的 `surveyReportModes()` / `reportModeOf()`（一次请求内按 `surveys.data.reportMode` 建 Map）；`roster.ts`、`submissions.ts` 列表与详情每条都带 `reportMode`。
- CSV：`submissions.ts` doc 行「总分」留空，表头保留；legacy 行不变。
- 前端：`web/src/views/admin/Submissions.vue` 按模式显示列名与数值——全为 doc 时列名「优先级」，混合时「优先级 / 分数」，doc 行只显示 `tier`；`SubmissionDetail.vue` doc 模式隐藏「总分 / 100」，标题改「优先级」。
- 未做：历史数据回填（把 doc 类答卷 `total` 置 0）。这是独立数据操作，需要先 `VACUUM INTO` 备份并单独确认；不执行也不影响界面（CSV 已按模式留空，列表 / 详情接口仍返回原 `total`）。
- 验证：`npm run verify` 全绿（check:docs / check:dates / typecheck / build）。
