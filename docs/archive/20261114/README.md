# 20261114 需求与进度索引

> 用途：2026-11-14 的后台栏目调整与「分数线」模块设计统一收在本目录。本文件是**目录索引 + 进度台账 + 共同约束**，具体实施步骤看各自文件。
> 状态：第 2、3 篇已实施（产品版本 **v1.76**，commit `ba57bb6`）；第 1 篇的 v1.0 录入页已随 v1.76 上线，**v3.3 Phase 1 已实施（v1.77，待提交），Phase 2/3 未做**；第 4 篇（AI 报告启动恢复与并发上限）**已实施（v1.78，待提交）**；第 5 篇（依赖版本漂移）**待实施**；第 6 篇（招聘检索重构）**已实施（v1.79，待提交）**；第 7 篇（分数线抓取失败根因）**方案已定稿（v1.0），待实施（v1.80）**。
> 最后核对：2026-11-14（实施后先改本文件的状态与版本，再改对应方案顶部的「状态」）。

---

## 一、项目框架与当前落点

### 1.1 技术栈与目录

| 项 | 事实 |
| --- | --- |
| 运行时 | Node.js 24+（`node:sqlite` 需要），npm workspaces（`server` / `web`） |
| 后端 | Express + SQLite（`node:sqlite`）+ TypeScript / tsx |
| 前端 | Vue 3 + Vue Router + Vite；图表手写 SVG，没有 chart 库 |
| 共享层 | `shared/src/`：问卷、报告、评分、咨询树、领域常量与校验 |
| 文档口径 | `docs/README.md`、`docs/agent-rules.md`、`docs/development-history.md`；设计稿统一进 `docs/archive/YYYYMMDD/` |

### 1.2 后台「栏目」的当前实现

`AdminLayout.vue` 模板里硬编码 `<section class="nav-group">`，**不是配置表**：

| 关注点 | 位置 | 当前事实 |
| --- | --- | --- |
| 栏目顺序 | `web/src/views/admin/AdminLayout.vue` L25–L139 | 问卷 → 咨询 → 分数线 → 设置（v1.76 已调整） |
| 展开状态 | 同文件 `NavGroup = 'survey' \| 'settings' \| 'consult' \| 'score'` | `localStorage['vesta.admin.navGroups']`，按 key 记忆 |
| 当前栏目高亮 | 同文件 `activeGroup` | 按 `route.path` 前缀判断，含 `/admin/score-lines` |
| 路由 | `web/src/router.ts` | `/admin/score-lines` 已存在（`ScoreLines.vue` 懒加载） |
| 管理端接口挂载 | `server/src/routes/admin/index.ts` | `requireAdmin()` 之后挂载 `scoreLinesRouter` |
| 分数线表 | `server/src/db/schema.ts` | v1.76 的 `score_line_sets` / `score_line_entries` 保留为 legacy；v1.77 已新增 v3 的 9 张表 |
| 简历 | — | v1.76 已删除前后端；`/admin/resumes` 落 404；`resume_images` 表保留 |

**结论**：v3.3 不需要再改导航和路由，工作集中在页面、接口、共享类型、数据表与迁移。

### 1.3 工程约束

- **文件规模**：新文件硬线 400 行（`scripts/check-size.mjs`）；现有文件 600 软线 / 800 硬线。
- **文档优先**：代码改动前先落 `docs/`，实施后在 `docs/development-history.md` 写「何时、改了什么、为什么」。
- **版本号三处同步**：根 `package.json`（当前 `1.77.0`）、`docs/README.md`「已完成」行 + 版本记录表、`development-history.md` 本轮小节。
- **分数线的特殊约束**：数据是外部事实，**不预置、不编造**；每个数字必须带来源链接和抓取时间。AI 报告仍按 `shared/src/doc-skill.ts` 的约束，不用这份数据补正文。

---

## 二、七份文档与状态

| # | 文档 | 改动 | 类型 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | [1-分数线模块-综合设计-开发文档.md](./1-分数线模块-综合设计-开发文档.md) | 分数线 v3.3：咨询师手填 → 主线（国家线/省控线）+ 校线/专业线（各科目）+ 招生计划/学费；全国院校覆盖；31 省入口已调研；服务端按省定时抓取 + 立即抓取按钮；含 v1.0 迁移 | 新功能（大） | **v1.0 已实施（v1.76, `ba57bb6`）；v3.3 Phase 1 已实施（v1.77，待提交）；Phase 2/3 未做** |
| 2 | [2-设置栏目下移-开发文档.md](./2-设置栏目下移-开发文档.md) | 把「设置」整组移到栏目列表最下方 | 交互调整 | **已实施（v1.76, `ba57bb6`）** |
| 3 | [3-删除简历收集-开发文档.md](./3-删除简历收集-开发文档.md) | 删除「简历」栏目、页面、接口与共享清单；保留数据库存量图片 | 功能下线 | **已实施（v1.76, `ba57bb6`）** |
| 4 | [4-AI报告生成启动恢复与并发上限-修复方案.md](./4-AI报告生成启动恢复与并发上限-修复方案.md) | AI 报告重启后不恢复、并发无上限：启动扫描续跑 + 固定并发队列 | 可靠性修复 | **已实施（v1.78，待提交）** |
| 5 | [5-依赖版本漂移-修复方案.md](./5-依赖版本漂移-修复方案.md) | 运行时 Node 24 / 类型停在 22；Express 4→5、Vite 6→8、TS 5.9→7 等大版本落后，且无巡检机制：分阶段升级 + `check:deps` 护栏 | 工程治理 | **待实施** |
| 6 | [6-招聘检索重构-检索计划与证据判定-修复方案.md](./6-招聘检索重构-检索计划与证据判定-修复方案.md) | 报告「工程师 2026 招聘」0 条：检索词用 Q6 原句、门户规则误杀、兜底同词/被垃圾结果挡住、旧内容与内部信息外露；拆成检索计划 + 证据判定，12 个月时效与「内部规则不外露」为硬约束 | 检索重构（中） | **已实施（v1.79，待提交）** |
| 7 | [7-分数线模块抓取失败-根因与修复方案.md](./7-分数线模块抓取失败-根因与修复方案.md) | 浙江 `zjzs.net` 抓到的是「点击进入」引导页（0 表 / 0 `<a>`）→ 报文「没有识别到分数线表格」；另查明专升本省控线是「类别 × 分数」转置表，解析器结构性不认 | 抓取链路修复（中） | **方案已定稿（v1.0），待实施（v1.80）** |

说明：

- 第 1 篇的 **v3.3 取代 v2.0 的「只做查询」方案**：v3.3 增加全国院校主表、院校线/专业线/各科目、计划/学费、服务端定时抓取和覆盖看板；v1.0 已随 v1.76 上线，但只有录入/列表，没有这些能力。
- v1.0 的 `cet` / `teacher` / `civil` 旧数据不进入 v3 查询；迁移跳过、旧表保留。

---

## 三、下一步

第 1 篇的 Phase 1 已完成，后续按第 1 篇第 15 节推进：

1. **Phase 2（v1.78 之后）**：T1 自划线 / 双一流 + T2 全部本科院校的院校线铺开；HTML / Excel / PDF 解析器逐源适配；异常检测、失败告警。
2. 补齐 PDF fixture、Excel 批量导入、覆盖页补源工具。
3. **Phase 3**：T3 专科 / 专升本院校、数据质量报表、按省/校缺失清单。
4. 侧栏顺序保持「问卷 → 咨询 → 分数线 → 设置」，不再动。
5. 第 4、5 篇按各自方案推进。
6. 第 6 篇（招聘检索重构）已按 Phase 1 实施（v1.79）：不写届、大一 / 大二加「实习」、报告移除检索词；Phase 2 的判定调优、`check:search` 之外的观测页与空结果缓存降级未做。
7. 第 7 篇（分数线抓取失败）：根因、问题清单与方案均已定稿（入口 / 发现 / 解析 / 口径四层，产品 v1.80），**按 S1→S2→S3 分三次提交实施**，S4 的 31 省栏目 URL 核验与 S1 并行。

---

## 四、v3.3 影响面

| 文件 / 表 | 改动 |
| --- | --- |
| `shared/src/score-line.ts` | 重写为 v3 类型、科目 code、覆盖状态、校验 |
| `shared/src/score-line-region.ts` / `-profile.ts` | 新增省份/A-B 区解析；（画像本轮只预留） |
| `shared/src/score-line.cases.ts` | 重写用例；`check:score` 入口不变 |
| `server/src/db/schema.ts` | 新增 `schools` / `school_aliases` / `school_programs` / `scoreline_batches` / `scoreline_metrics` / `school_coverage` / `scoreline_sources` / `crawl_runs` / `crawl_documents` |
| `server/src/db/migrations.ts` | 新增 `migrateScoreLineV1()`，一次性迁移旧表 |
| `server/src/routes/admin/score-lines.ts` | 重写为学校/专业/查询/覆盖/抓取/导入/复核接口 |
| `server/src/score-lines/*` | 新增 store / query / crawl / normalize / validate / parsers / sources |
| `scripts/import-schools.ts` / `seed-sources.ts` | 新增全国院校（教育部名单 CSV/XLSX）与抓取源种子 |
| `web/src/views/admin/ScoreLines.vue` | 重写为查询页 |
| `web/src/views/admin/score-lines/*` | 新增 Filters / SchoolPicker / ProgramPicker / LineCard / ChartCard / ScoreLineTable / PlanTable / CoverageView / ReviewView / ImportDialog / types；删除 v1 Card / Editor |
| `web/src/components/LineChart.vue` | 新增手写 SVG 折线图 |
| `web/src/api/admin.ts` / `types.ts` | 替换 v1 的 4 个方法 / 类型 |
| `web/src/router.ts`、`AdminLayout.vue` | **不改**（v1.76 已加） |
| `docs/README.md` | 分数线章节从「人工录入」改为「查询 / 图表 / 更新」 |

**不动**：问卷题目、报告规则、咨询树、`update.sh`、认证逻辑、`resume_images` 表。

---

## 五、v1.77 交付动作（按 AGENTS.md 六步）

1. 根 `package.json` 升到 `1.77.0`。
2. `docs/README.md`「已完成」追加 `v1.77 分数线查询（主线/院校线/专业线、折线图、服务端抓取）`，版本记录表加一行。
3. `docs/development-history.md` 新增「本轮（2026-11-14）」小节，标题带产品版本 v1.77。
4. 第 1 篇顶部状态改为「已实施并提交（产品版本 v1.77）」，补「实施记录」。
5. 本文件第二节状态表同步。
6. `npm run verify` 全绿后提交。

**部署**：新增表由启动 `initSchema()` 创建；`migrateScoreLineV1()` 启动迁移旧数据。发布前 `VACUUM INTO` 备份；服务器按常规 `bash update.sh`。

**回滚**：`git revert` + `bash update.sh`；v3 新表保留不影响旧代码；v1 旧表一直未删，回滚后旧页面可继续读。

---

## 六、验证总表

| 改了什么 | 必须跑 | 额外检查 |
| --- | --- | --- |
| 全部 | `npm run verify` | `check:docs` / `check:size` / `check:version` / `check:dates` / `check:score` / `check:audit` / `typecheck` / `build` 全绿 |
| 1 分数线 v3.3 | `npm run verify` + `npm run check:score` | 旧数据迁移；学校搜索；主线/院校线/专业线；抓取 fixture；覆盖看板；390px |
| 2 / 3 | 已随 v1.76 验证 | 无需重跑；回滚时再看 |

**没有自动化 UI 测试**，v3.3 要起本地 dev 手工走查；接口用临时 `DATA_DIR`，解析器用本地 fixture，不访问真实站点。

---

## 七、待确认

已无阻塞表结构的问题：

- 院校名单：没有现成文件，按第 1 篇 7.3.2「教育部官网人工下载 → `scripts/import-schools.ts` 导入」执行；31 省考试院入口已在 7.2.1 列表。
- 最低分：录取 / 复试 / 投档三种全做，分别用 `admit` / `retest` / `transfer`。
- 唯一运营事项：上线前定「谁下载哪一年的名单、什么时候导入」，写进实施排期即可。

---

## 八、复核命令

```bash
# 1. 导航顺序：settings 必须是最后一个 nav-group
grep -n "nav-group\|<span>问卷</span>\|<span>咨询</span>\|<span>分数线</span>\|<span>设置</span>" web/src/views/admin/AdminLayout.vue

# 2. v3 分线路由 / 接口 / 表
grep -n "score-lines\|scoreline" web/src/router.ts web/src/api/admin.ts server/src/routes/admin/index.ts
grep -n "schools\|school_programs\|scoreline_batches\|scoreline_metrics\|school_coverage\|scoreline_sources\|crawl_runs" server/src/db/schema.ts

# 3. 旧 v1 表仍在、未被删
grep -n "score_line_sets\|score_line_entries" server/src/db/schema.ts

# 4. 简历残留（除 schema 注释外应为空）
grep -rn "ResumeCollection\|resume_images\|/admin/resumes\|uploadResumeRequest\|@shared/resume" \
  web/src server/src shared/src scripts package.json

# 5. 文件规模与版本
npm run check:size
npm run check:version
```

---

## 九、Phase 1 实施结果（2026-11-14，v1.77，待提交）

- **数据**：9 张新表已建；旧 `score_line_sets` / `score_line_entries` 保留；`migrateScoreLineV1()` 只迁 `postgrad` / `upgrade`，可重复执行。
- **查询**：主线 / 校线 / 专业线 + 各科单科 + 三种最低分 + coverage + series；缺 `category` / `track` 时返回 `requires`；只读 `approved`。
- **院校**：全国院校主表 / 别名 / 招生专业 / 计划 / 学费；`scripts/import-schools.ts` 支持 CSV/XLSX 与 dry-run；`scripts/seed-sources.ts` 幂等写入 31 省 + 研招网 2 个源。
- **抓取**：按省单任务队列 + 立即抓取插队 + 原始快照 + 通用 HTML/Excel/PDF/JSON 解析器 + pending 复核；SSRF 防护；失败写覆盖看板。
- **页面**：查询页、院校/专业选择、主线/校线/专业线卡、SVG 折线图（三线可隐藏、最低分空心标记）、科目×年份表、招生计划、覆盖看板、复核队列、人工导入。
- **验证**：`npm run verify` 全绿；临时 `DATA_DIR` 接口断言 + 本地 fixture 抓取→复核→查询；Playwright 桌面 + 390px 走查通过，控制台零错误。
- **未做**：31 省逐源选择器 / 真实站点回归；T1/T2/T3 铺开；PDF fixture；Excel 批量导入；学员带入；报告引用；OCR；学生端。`data/crawl/` 单独备份。
