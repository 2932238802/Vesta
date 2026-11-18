# Review Agent 评审报告：金句栏（T-006 ~ T-012）

- 范围：CR-002 / R-002 v1，任务 T-006 ~ T-012；工作区未提交改动（HEAD `3d07cdb`），无 commit 区间
- 评审类型：首次评审
- 来源 CR：CR-002（已确认，G0；G1 用户已确认）
- G1 / DoR：通过；未发现阻断缺口
- 结论：**通过**（G3）
- 一句话理由：10 条 AC 均有独立实跑证据，影响面与回归覆盖到位，未发现 P0/P1；仅 4 条 P3 非阻塞问题。

## 评审基线

- 评审对象：`git status` 中 18 个已跟踪文件改动 + 11 个新增项（`server/src/data/`、`quotes.ts`、`consult-quote.ts`、`ConsultQuotes.vue`、`consultQuotes.css`、`quotes/`、CR/开发文档、报告与 STATUS）。
- 不在范围：Word 导入、AI 推荐、拖拽排序、收藏栏下线、使用次数统计、批量导入导出（CR-002 明确非目标）。
- 关联需求：R-002 v1；AC-002-1 ~ AC-002-10。
- 必须满足的契约：
  - 数据模型：`consult_quote_categories`（name 唯一、sort_order）、`consult_quotes`（category_id、no、text、source、pinned、sort_order）；不启用外键，分类存在性/删除限制在接口层。
  - 接口：`GET/POST /quotes`、`PATCH/DELETE /quotes/:id`、`POST /quote-categories`、`PATCH/DELETE /quote-categories/:id`、`PUT /quote-categories/order`；401/400/404/409 口径。
  - 决策：A-002（140 条）、A-003（非空分类不可删）、A-005（删除标记后重启重导）。
- 影响面与回归：咨询导航与路由、`runMigrations()` 既有步骤、收藏栏接口/表/页面、前端构建与 390px 布局、版本与文档。

## AC 判定

| AC | 判定 | 证据 |
| --- | --- | --- |
| AC-002-1 | 满足 | Playwright：`/admin/consult/quotes` 标题“金句栏”，document title `金句栏 · 管理后台`；咨询组链接顺序 `["写咨询稿","咨询树","金句栏","收藏栏"]`；金句栏 `a.on`；收藏栏 href `/admin/consult/collections` 且页面可打开。 |
| AC-002-2 | 满足 | Playwright：13 个入口（全部/置顶/11 类）；全部 140、置顶 0；11 类计数 14/14/14/16/3/15/17/6/12/8/21；点“自卑、内耗与在意评价”显示 14 条且分类高亮；切回“全部金句”恢复 140。 |
| AC-002-3 | 满足 | Playwright：搜索 `124c` → 1 条且编号徽章为 124c；搜索“自卑”结果数 = 卡片数；无结果时显示“没有匹配的金句”；清空恢复 140。 |
| AC-002-4 | 满足 | Playwright：连续复制两条不同金句，`navigator.clipboard.readText()` 与卡片正文逐字相等，均不含编号/分类/出处；按钮显示“已复制”。 |
| AC-002-5 | 满足 | Playwright：置顶第 3 条后移至顶部并显示 ★，“置顶”计数 1；刷新后仍置顶；置顶筛选仅 1 条；取消后回到原顺序、计数 0。 |
| AC-002-6 | 满足 | Playwright：新增后分类 14→15、总数 141、条目在末尾；编辑正文/出处/置顶立即反映；删除二次确认后 15→14、总数 140；空正文保存被拦截并提示“正文不能为空”。接口另验证换分类 `sortOrder` 为新分类末尾。 |
| AC-002-7 | 满足 | Playwright：11 行；非空分类删除按钮 disabled 且 title 含条数；新增出现在末尾；改名同步；上移立即生效且刷新保持；重名显示“分类重名”；空名确认按钮 disabled；空分类可删除。接口验证非空删除 409（含 count）、空名 400、重名 409、调序完整排列校验。 |
| AC-002-8 | 满足 | 临时库：全新启动 11 类/140 条 + `consult_quotes_seed_applied=1`；二次启动不重复；删除 `q_001` 后重启仍 139；删除标记后重启恢复 140 且 `COUNT(DISTINCT id)=140`；注入事务失败后回滚为 0 行、标记不写，重试恢复 140。 |
| AC-002-9 | 满足 | `git diff` 无 `collections.ts` / `consult-collection.ts` / `ConsultCollections.vue` / `consult_collections` 改动；`/admin/consult/collections` 页面正常、`GET /collections` 200，响应不含金句数据。 |
| AC-002-10 | 满足 | 接口：未登录 GET/POST/DELETE 均 401；空/缺失/10001 字正文 400；非法分类 400；不存在 id 404；重名/非空删除 409。页面：中止 `GET /quotes` 后显示“读取金句失败”和“重新读取”，恢复后加载 140 条，不白屏。 |

## 验证执行

- `npm run verify` → 退出 0：check:docs / check:size / check:version / check:deps / check:dates / check:score / check:audit / check:roster / check:search / typecheck / build 全通过。
  - check:size：212 文件、16 条基线；新文件 ≤400 行；`migrations.ts` 725 行（>600 软线，<800 硬线，仅提示）。
- 临时服务：`PORT=18799 DATA_DIR=/tmp/vesta-review-ag NODE_ENV=development npm --workspace server run start`，Node 24；`/api/health` `db:true`。
- 接口断言（自建脚本，56 条）：`PASS 56 FAIL 0`，覆盖 401/400/404/409、长度边界、出处上限、pinned 类型、分类重名、调序缺失/重复/多余/非数组、分类换组排序、置顶排序、计数、空分类删除、10000 字正文、XSS 文本原样存储。
- 种子断言（6 组）：首次 11/140 + 标记；带标记重启不变；删除单条后不补回；删除标记后重跑 140 且无重复；注入 `RAISE(ABORT)` 后事务回滚（0 行、标记 NULL、`db.consult_quotes_seed_failed`）；移除故障后重试 140 + 标记 1。
- Playwright（自建脚本，63 条）：桌面 1360×900 + 390×844，`PASS 63 FAIL 0`。覆盖导航、计数、搜索、复制、置顶持久化、增删改、分类管理、错误重试、收藏栏、窄屏无溢出。
- 说明：首轮 UI 脚本因评审脚本自身误取第一个 `nav-group`（实为“问卷”组）中断，修正选择器后 63/63 通过；与应用实现无关。
- 日志检查：`consult.quote_*` / `consult.quote_category_*` / `db.consult_quotes_seeded` 均带 `reqId` 或分类信息；未出现写入正文标记文本。
- 无法执行：未运行 `bash update.sh`（工作区未提交，按用户要求不提交/不推送）；生产同构重启路径以临时库 + 生产构建产物（`web/dist`）替代验证。

### 回归测试

| 受影响区域 | 执行的测试 / 验证 | 结果 |
| --- | --- | --- |
| 咨询导航（写咨询稿/咨询树/收藏栏） | Playwright 侧栏顺序与页面入口 | 通过 |
| 收藏栏接口/表/页面 | `git diff` + `GET /collections` + 页面打开 | 通过 |
| `runMigrations()` 既有步骤 | 全新库启动、多次重启、`npm run verify` | 通过 |
| 路由与类型 | server/web `tsc --noEmit`、Vite build | 通过 |
| 窄屏布局 | 390×844 `scrollWidth <= clientWidth + 1`、分类栏横向、点击可用 | 通过 |
| 既有数据兼容 | 纯新增表；旧表/旧接口无改动 | 通过 |

## 影响面覆盖

| 影响维度 | 是否覆盖 | 证据 / 缺口 |
| --- | --- | --- |
| 模块 / 接口 | 是 | 新路由挂载于 `requireAdmin()` 之后；现有 consult 路由顺序与行为未变；8 个接口逐项实跑 |
| 数据 / 配置 | 是 | 两张新表 + 索引 + 标记位；PRAGMA/接口/直接 SQL 核对；旧表零改动 |
| 测试 / 回归 | 是 | verify + 56 接口 + 6 组种子 + 63 UI；无遗留自动化测试（见残留风险） |
| 文档 | 是 | 04 核心功能、05 契约、06 数据模型、09 测试、consult-system、development-history、reference README、archive README、STATUS、开发文档 §4/§5/§8 均已更新 |
| 兼容 / 迁移 / 回滚 | 是 | 纯新增；回滚 `git revert` 后新表保留无读写；`.gitignore` 仅放行 `server/src/data/` |

## NFR 检查

| 项 | 目标 | 结果 |
| --- | --- | --- |
| 性能 | 一次 GET 返回全部；切换/搜索本地完成 | 通过：140 条单次加载；筛选为前端 computed，无额外请求；页面实测即时切换 |
| 安全 | 管理员鉴权、纯文本渲染、服务端校验、日志不记正文 | 通过：401 实测；模板使用 `{{ }}` 无 `v-html`；长度/归属/布尔类型校验；日志无正文 |
| 隐私与数据保留 | 种子无学员信息；硬删除 + 二次确认 | 通过：种子为公开金句；删除需确认并硬删；日志仅 id |
| 兼容性 | 纯新增，不改收藏栏 | 通过：收藏栏文件/表/接口未改动；旧接口回归通过 |
| 可观测性 | `consult.quote_*` / `quote_category_*` / 种子日志 + reqId | 通过：日志实跑核对；种子失败有 `db.consult_quotes_seed_failed` |
| 成本 | 无外部调用/新基础设施 | 通过：无新增依赖与外部调用 |

## 维度结论

| 维度 | 结论 | 说明 |
| --- | --- | --- |
| 1 需求覆盖 | 通过 | 10 条 AC 全部实现并实跑验证 |
| 2 正确性 | 通过 | 排序、计数、换组、置顶、分类调序逻辑与契约一致；P3-1 为罕见重导边界 |
| 3 边界与错误处理 | 通过 | 空值/超长/非法分类/不存在/重名/非空删除均有明确状态码与文案 |
| 4 安全 | 通过 | 全部接口在 `requireAdmin()` 后；无 `v-html`；参数化 SQL；日志不泄正文 |
| 5 性能与资源 | 通过 | 140 条一次加载；本地筛选；无 N+1、无无界循环 |
| 6 并发与一致性 | 通过 | Node 单线程 + 同步 SQLite，处理函数内无 await 交错；调序有事务。P3-1 为重导边界 |
| 7 可维护性 | 通过 | 共享类型、页面/子组件/组合式拆分；`quotes.ts` 381 行、`ConsultQuotes.vue` 297 行；遵循现有模式 |
| 8 测试有效性 | 通过（有限） | 本次实测覆盖行为与错误路径；但仓库无自动化回归测试（需求已声明） |
| 9 文档一致性 | 通过（有 P3 措辞） | 版本/任务/追溯/实施记录同步；两处过时措辞见 P3-3、P3-4 |
| 10 范围与风险 | 通过 | 无无关改动、无调试残留、依赖未变；仅版本号与 `.gitignore` 定向修改 |
| 11 用户注释保护 | 通过 | 0 处 `LosAngelous:` / `LOS:` 被改 |
| 12 回归与影响面 | 通过 | 导航、收藏栏、迁移、构建、窄屏均回归 |
| 13 AC ↔ 验证追溯 | 通过 | 开发文档追溯矩阵与本次实测一致；无“测试通过但 AC 未验证” |
| 14 NFR 目标 | 通过 | 性能/安全/隐私/兼容/可观测目标均有证据 |

## 缺陷清单

### [P3] 种子重导遇到同名分类时会产生孤儿金句并照常写标记

- 位置：`server/src/db/migrations.ts:556-604`（`seedConsultQuotes()` 的分类 `INSERT OR IGNORE` 与 `setSetting`）
- 问题：分类按 name 唯一，按 id `INSERT OR IGNORE`。当同名的不同 id 分类已存在时，种子分类插入被忽略，但后续金句仍按种子 id 插入；由于无外键，形成孤儿行，且事务整体成功并写入标记。
- 触发条件：删除一个空的种子分类 → 新建同名（不同 id）分类 → 删除 `settings.consult_quotes_seed_applied` → 重启。
- 影响：孤儿金句不归属任何分类：分类计数合计小于“全部金句”，卡片分类显示“未分类”，且标记已写导致不再自动修复。不崩溃，正常路径不受影响。
- 证据：复现后 `consult_quotes=140`、`consult_quote_categories=11`、孤儿 3 条、分类计数合计 137、标记=1。
- 建议：事务提交前校验所有 `category_id` 均存在，缺失则 `ROLLBACK` 不写标记；或按 name 冲突显式中止并记录 `db.consult_quotes_seed_failed`。
- 置信度：高（已复现）

### [P3] “删除标记后重启即可重导种子”的文档描述不完整

- 位置：`docs/archive/20261118/4-金句栏-开发文档.md:165`、`:313`（A-005）；`docs/reports/dev-agent-2026-11-18-金句栏.md:113`
- 问题：`INSERT OR IGNORE` 只补回缺失行，不会刷新已存在的分类名与金句正文；文档表述容易被理解为“重导可恢复原稿”。
- 触发条件：人工删除标记后重启，期望修正已被改名/编辑的种子条目。
- 影响：操作者按文档预期操作后，已有条目不会更新，可能误判为功能异常。
- 证据：代码 `INSERT OR IGNORE` + 删除标记后重跑仅补回 `q_001`（已存在条目不变）。
- 建议：明确“仅补回缺失条目；修改已有条目需手工处理或另立需求”。
- 置信度：高

### [P3] development-history 中 R-002 状态措辞过时

- 位置：`docs/reference/development-history.md:11`
- 问题：写“R-002 v1，待 G1”，但 G1 已由用户确认（CR-002 与 STATUS 均记录已确认）。
- 影响：文档内部状态不一致，可能误导后续 Agent。
- 证据：`docs/archive/20261118/3-金句栏-需求卡.md:50`、`docs/STATUS.md:10`。
- 建议：改为“G1 已确认”。
- 置信度：高

### [P3] 09-测试与验证末尾结论与 v1.91 验证记录冲突

- 位置：`docs/reference/09-测试与验证.md:224`
- 问题：仍写“完整 `verify` 仍需在交付前人工执行”，而同页 v1.91 表格已记录 `npm run verify` 通过。
- 影响：读者可能误以为当前检出未验证。
- 证据：本次实际执行 `npm run verify` 退出 0。
- 建议：改为“当前检出已通过 v1.91 完整 verify；后续变更仍需重跑”。
- 置信度：高

## 已检查且未发现问题的区域

- 鉴权：所有新接口位于 `adminRouter.use(requireAdmin())` 之后；GET/POST/DELETE 未登录均 401。
- 注入：全部 SQL 使用参数化语句；`order` 仅接受字符串 id 且校验完整排列；删除/编辑路径参数仅作为参数绑定。
- XSS：金句正文/出处/分类名均以 `{{ }}` 渲染，无 `v-html`；恶意文本入库后仍按纯文本展示。
- 日志泄露：创建/编辑/删除日志只含 id、categoryId、pinned；未出现正文文本。
- 排序：服务端 `pinned DESC, sort_order, created_at, id` 与前端 `sortQuotes` 一致；置顶/取消置顶实测正确。
- 计数：分类计数由前端从本地 quotes 派生，新增/删除/换组后与总数同步；接口 count 与本地一致。
- 删除限制：非空分类接口 409 且带 count，界面按钮 disabled 且 title 含条数；空分类可删。
- 调序：要求现有分类的完整排列；缺失/重复/多余/非数组均 400；事务写入；刷新后保持。
- 收藏栏：`consult_collections` 相关文件与表零改动；页面与接口可用。
- 文件规模：新增 TS/Vue 文件均 ≤400 行；`migrations.ts` 725 行在硬线内。
- `.gitignore`：`/data/` 只忽略仓库根运行时目录；`server/src/data/consult-quotes-seed.json` 可入库；仓库内无其他 `data` 目录被误放行。
- 调试残留：新代码无 `console.log` / `debugger` / TODO / FIXME。
- 依赖：`package.json` 仅版本号变化，`package-lock.json` 未变。
- 用户注释：0 处被修改/删除/重排。

## 文档同步检查

- 任务状态：`docs/archive/20261118/4-金句栏-开发文档.md` T-006 ~ T-012 全部 DONE；`docs/STATUS.md` 同步为 G2 自检通过、待 G3。
- 追溯矩阵：AC-002-1 ~ AC-002-10 标“已验证”，与本次实测一致。
- 实施记录：§8 已补文件清单、验证结果、偏差与假设。
- 版本：根 `package.json` 1.91.0 ↔ `docs/reference/README.md` 最高 v1.91（`check:version` 通过）；v1.91 的 commit 列记为 `—`，与“工作区未提交”一致。
- 接口/数据模型：`05-对外契约.md`、`06-数据模型.md`、`consult-system.md` 已同步 8 个接口与两张表。
- `CHANGELOG.md`：项目未使用该文件，版本记录在 `reference/README.md` 与 `development-history.md`，均已更新。
- 不一致项：见 P3-2、P3-3、P3-4（均为措辞层面，不阻塞）。

## 用户注释保护检查

- 扫描范围：全部 diff 与新增代码/文档/报告。
- 命中 `LosAngelous:` / `LOS:`：0 处。
- 被修改/删除/重排：0 处。

## 残留风险

- 种子 140 条正文与 Word 原稿的逐字一致性无法独立核对（原稿 docx 不在仓库内）；已核对分类名、分类顺序、条数（11/140）与编号集合（含 124b/124c/98b/103b）。
- 仓库无自动化回归测试；本次 56 条接口与 63 条 UI 断言为评审临时脚本，未入库，后续改动无法自动回归。
- 未执行 `bash update.sh`，生产重启路径未在工作区实跑；以临时库 + 生产构建产物验证替代。
- P3-1 的重导边界在生产极端操作下会造成孤儿金句，建议后续补一行事务内校验。
- 分类改名/调序即时生效且无撤销；已有二次确认/提示，但误操作不可回退（CR 已记录为已知风险）。

## 建议（非阻塞）

- [P3] 在 `seedConsultQuotes()` 提交前校验 `SELECT COUNT(*) FROM consult_quotes q LEFT JOIN consult_quote_categories c ON c.id=q.category_id WHERE c.id IS NULL` 为 0，否则回滚且不写标记。
- [P3] 修正 P3-2/P3-3/P3-4 的文档措辞。
- [P3] 后续另立任务引入最小自动化回归（接口冒烟 + 页面关键路径），把本次 `/tmp` 断言迁入仓库。

## 下一步交接

- 结论：**通过（G3）** → Meta Agent（G4 总审）。
- 依据：无 P0/P1；10 条 AC 均有实跑证据；影响面与回归覆盖；NFR 已核对；文档已同步。
- 给 Meta Agent 的 Prompt（可直接复制）：

```text
【项目路径】/home/losangelous/LosAngelous/Vesta
【本次范围】CR-002 / R-002 v1，T-006 ~ T-012；工作区未提交改动（HEAD 3d07cdb），产品版本 v1.91.0
【已有材料】
- 评审报告：docs/reports/review-agent-2026-11-18-金句栏.md
- 开发报告：docs/reports/dev-agent-2026-11-18-金句栏.md
- 需求/开发文档：docs/archive/20261118/3-金句栏-需求卡.md、docs/archive/20261118/4-金句栏-开发文档.md
- 状态面板：docs/STATUS.md
【G3 结论】通过（无 P0/P1；4 条 P3 非阻塞）
【评审证据】npm run verify 退出 0；接口断言 56/56；种子 6 组（含注入失败回滚）；Playwright 63/63（桌面 + 390px）
【文档位置】/home/losangelous/LosAngelous/Vesta/docs
【给 Meta 的要求】复核 G3 结论；确认 P3-1（种子重导同名分类孤儿行）是否需要在交付前补事务内校验，其余 P3 可作为后续文档整理
```
