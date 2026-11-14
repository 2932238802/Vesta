# 20261114 需求与进度索引

> 用途：2026-11-14 的后台栏目调整方案统一收在本目录。本文件是**目录索引 + 进度台账 + 共同约束**，具体实施步骤看各自文件。
> 状态：三份方案均已实施并提交（产品版本 **v1.76**，commit `ba57bb6`）；实现与验证见各文件「实施记录」和 `docs/development-history.md` 的本轮小节。
> 最后核对：2026-11-14（实施后已同步本文件、方案顶部状态与 `development-history.md`）。

---

## 一、项目框架与改动落点（开工前阅读结论）

### 1.1 技术栈与目录

| 项 | 事实 |
| --- | --- |
| 运行时 | Node.js 24+（`node:sqlite` 需要），npm workspaces（`server` / `web`） |
| 后端 | Express + SQLite（`node:sqlite`）+ TypeScript / tsx |
| 前端 | Vue 3 + Vue Router + Vite |
| 共享层 | `shared/src/`：问卷、报告、评分、咨询树、领域常量与校验 |
| 文档口径 | `docs/README.md`、`docs/agent-rules.md`、`docs/development-history.md`；设计稿统一进 `docs/archive/YYYYMMDD/` |

### 1.2 后台「栏目」是怎么实现的（本次三项改动的核心落点）

README 里说的「后台按四个栏目组织」，在代码里**不是配置表，而是 `AdminLayout.vue` 模板里硬编码的四段 `<section class="nav-group">`**：

| 关注点 | 位置 | 现状 |
| --- | --- | --- |
| 栏目顺序 / 分组 / 子链接 | `web/src/views/admin/AdminLayout.vue` L25–L139 | 问卷 → 设置 → 咨询 → 简历，四段写死在模板里 |
| 展开状态 | 同文件 L169–L183、L206–L225、L245–L255 | `NavGroup = 'survey' \| 'settings' \| 'consult' \| 'resume'`，存 `localStorage['vesta.admin.navGroups']` |
| 当前栏目高亮 | 同文件 L185–L204 | `activeGroup` 按 `route.path` 前缀判断 |
| 路由 | `web/src/router.ts` L25、L40–L70 | 懒加载 + `/admin` 子路由；L75–L95 是 `document.title` 映射 |
| 管理端接口挂载 | `server/src/routes/admin/index.ts` L47 之后 | `requireAdmin()` 之后按模块 `adminRouter.use(...)` |
| 数据表 | `server/src/db/schema.ts` 的 `initSchema()` | 全部 `CREATE TABLE IF NOT EXISTS`，启动时执行，可重复 |
| 数据修补 | `server/src/db/migrations.ts` 的 `runMigrations()` | 只做兼容补丁 / 回填；新表直接加在 `schema.ts` 即可 |

**结论**：新增栏目 = 在 `AdminLayout.vue` 加一段 `nav-group` + 在 `router.ts` 加子路由；删除栏目 = 反向删；调整顺序 = **移动模板里的 `<section>` 块**（不要用 CSS `order`，移动端 `display: contents` 会打乱可访问顺序）。

### 1.3 三条工程约束（会影响实施方式）

- **文件规模**：新文件硬线 400 行（`scripts/check-size.mjs`）；`ResumeCollection.vue` 当前 1482 行、已在基线里，删除它属于「基线只能下调」的允许方向。
- **文档优先**：代码改动前先落 `docs/`，实施后在 `docs/development-history.md` 写「何时、改了什么、为什么」。
- **版本号三处同步**：根 `package.json`（当前 `1.75.0`）、`docs/README.md`「已完成」行 + 版本记录表、`development-history.md` 本轮小节；本轮产品版本从 **v1.76** 起算。

---

## 二、三项改动与对应文档

| # | 文档 | 改动 | 类型 | 状态 | 依赖 |
| --- | --- | --- | --- | --- | --- |
| 1 | [1-分数线栏目-开发文档.md](./1-分数线栏目-开发文档.md) | 新增后台「分数线」栏目；数据模型按「类型 + 数据集 + 条目」设计，后续加考研 / 四六级 / 专升本等类型不需要改表 | 新功能 | **已实施并提交**（v1.76） | 无（可与 2、3 独立） |
| 2 | [2-设置栏目下移-开发文档.md](./2-设置栏目下移-开发文档.md) | 把「设置」整组移到栏目列表最下方 | 交互调整 | **已实施并提交**（v1.76） | 最终顺序依赖 1、3；但单独做也成立 |
| 3 | [3-删除简历收集-开发文档.md](./3-删除简历收集-开发文档.md) | 删除「简历」栏目、`/admin/resumes` 页面、简历图片接口与共享专业清单；**保留数据库存量图片** | 功能下线 | **已实施并提交**（v1.76） | 无 |

三项都属于「后台栏目调整」这一轮，目标产品版本 **v1.76**。可以一个 commit 提交，也可以按 `3 → 1 → 2` 拆成三个 commit；版本号只在整轮收尾时升一次。

---

## 三、建议实施顺序

按下面的顺序做，任何中间状态都保持导航自洽：

1. **先做 3（删除简历收集）**：栏目从「问卷 / 设置 / 咨询 / 简历」变成「问卷 / 设置 / 咨询」，同时删掉页面、接口和共享清单。
2. **再做 1（新增分数线）**：在「咨询」之后插入「分数线」，顺序变成「问卷 / 设置 / 咨询 / 分数线」。
3. **最后做 2（设置下移）**：把「设置」整组移到最下方，得到最终顺序：

```text
问卷
  ├─ 概览
  ├─ 邀请链接
  └─ 学员名单
咨询
  ├─ 写咨询稿
  ├─ 咨询树
  └─ 收藏栏
分数线
  └─ 分数线
设置
  ├─ 问卷设置
  ├─ 报告设置
  └─ AI 分析规则
```

如果只实施其中一项，也必须保证「设置」在列表最后；如果先做 2 再做 1，则插入「分数线」时要放在「设置」之前。

---

## 四、三项改动的共同影响面

| 文件 | 1 分数线 | 2 设置下移 | 3 删除简历 | 注意 |
| --- | --- | --- | --- | --- |
| `web/src/views/admin/AdminLayout.vue` | 加 `score` 分组 + `activeGroup` 分支 | 移动 `settings` `<section>` | 删 `resume` 分组、类型、状态键 | 三项都改同一文件，按顺序做，避免冲突 |
| `web/src/router.ts` | 加 `score-lines` 路由 + 标题 | — | 删 `resumes` 路由 + 标题 | 懒加载列表保持字母序不是硬要求 |
| `web/src/api/admin.ts` | 加 4 个方法 | — | 删 4 个简历方法 + 1 个 import | — |
| `server/src/routes/admin/index.ts` | 挂 `scoreLinesRouter` | — | 删 `resumesRouter` | 都必须在 `requireAdmin()` 之后 |
| `server/src/db/schema.ts` | 加 2 张表 | — | 保留 `resume_images` 表定义 + 注释 | 新表用 `IF NOT EXISTS`，无需 ALTER |
| `docs/README.md` | 栏目列表加「分数线」 | 栏目顺序 | 栏目列表删「简历」；nginx 25m 的说明同步 | 实施后改，不在本轮文档里改 |
| `docs/development-history.md` | 本轮小节 | 同左 | 同左 | 一个本轮小节覆盖三项即可 |
| `scripts/file-size-baseline.json` | — | — | 删 `ResumeCollection.vue` 2 条基线 | 基线只减不增 |

**不动的部分**：问卷题目 / 报告规则 / 咨询树 / `update.sh` / 认证逻辑 / 现有数据库表结构（除新增分数线表外）。分数线本轮**不接入 AI 报告**，避免未核验数字进入报告正文。

---

## 五、版本与交付动作（整轮收尾，按 AGENTS.md 六步）

1. 根 `package.json` 的 `version` 升到 `1.76.0`（`major=1`、`patch=0`）。
2. `docs/README.md`「已完成」追加 `v1.76 后台栏目调整（新增分数线、设置下移、删除简历收集）`，并在「版本记录」表加一行（日期、commit、摘要）。
3. `docs/development-history.md` 新增「本轮（2026-11-14）」小节，标题带 `产品版本 v1.76`，写「改了 / 为什么 / 验证」。
4. 三份方案顶部的状态改为「已实施并提交（产品版本 v1.76）」，补「实施记录」。
5. 本文件第一节的状态表、对应方案的版本 / 状态、`development-history.md` 三处一起更新。
6. `npm run verify` 全绿后提交；提交前 `git status` 确认没有混入 `.env`、`data/`、`web/dist/`。

**部署**：本轮只有前端路由 / 导航、管理端新接口和两张新表，无破坏性迁移；服务器按常规 `bash update.sh` 即可。新增表由启动时的 `initSchema()` 自动创建。

**回滚**：任一改动都可单独 `git revert` 对应提交；分数线的表保留不影响旧代码；简历图片一直留在 `resume_images`，回滚后旧页面直接可读。

---

## 六、验证总表

| 改了什么 | 必须跑 | 额外检查 |
| --- | --- | --- |
| 全部 | `npm run verify` | `check:docs` / `check:size` / `check:version` / `check:dates` / `check:audit` / `typecheck` / `build` 全绿 |
| 1 分数线 | `npm run verify` | 手工走查新增 / 编辑 / 删除 / 空状态；接口 401 / 400 / 404 |
| 2 设置下移 | `npm run verify` | 桌面 + 390px 导航 DOM 顺序；设置页仍高亮；展开状态仍记忆 |
| 3 删除简历 | `npm run verify` + `npm run check:size` | 全仓 grep 无残留；`/admin/resumes` 落到 404；`/api/admin/resumes` 404（带令牌）/ 401（不带） |

**没有自动化 UI 测试**，三项都要起本地 dev 手工走查；分数线需要额外用临时 `DATA_DIR` 验证接口，避免把测试数据写进仓库 `data/`。

---

## 七、待确认（实施时采用默认口径）

1. **分数线首批类型**：方案默认「考研 / 四六级 / 专升本 / 教资 / 考公」五类，类型清单集中在 `shared/src/score-line.ts`，增删一行即可。如果产品只想先要「考研」，实施时删掉其余常量即可，表结构不变。
2. **分数线是否给学生看**：本方案按「仅管理后台内部查询」设计，不加公开页、不写进报告。如果要给学生看，需要另开公开页与权限方案。
3. **分数线是否自动抓取**：本方案只做人工录入 + 来源链接，不做爬虫 / 自动同步；官方数据变动由运营自己维护。
4. **简历图片是否要清理**：本方案只下线功能、保留 `resume_images` 表；要不要在备份后 `DROP TABLE` 回收空间，需单独确认，不并入本轮。

---

## 八、复核命令（实施后按这个核对）

```bash
# 1. 导航顺序：DOM 里 settings 必须是最后一个 nav-group
grep -n "nav-group\|<span>问卷</span>\|<span>咨询</span>\|<span>分数线</span>\|<span>设置</span>" web/src/views/admin/AdminLayout.vue

# 2. 分数线路由 / 接口 / 表
grep -n "score-lines\|scoreLine" web/src/router.ts web/src/api/admin.ts server/src/routes/admin/index.ts
grep -n "score_line_sets\|score_line_entries" server/src/db/schema.ts

# 3. 简历残留（除 schema 注释外应为空）
grep -rn "ResumeCollection\|resume_images\|/admin/resumes\|uploadResumeRequest\|@shared/resume" \
  web/src server/src shared/src scripts package.json

# 4. 文件规模与版本
npm run check:size
npm run check:version
```

---

## 九、实施结果（2026-11-14，v1.76）

- **顺序**：按 `3 → 1 → 2` 完成；最终侧栏为 问卷 → 咨询 → 分数线 → 设置。
- **删除简历**：页面、路由、接口、共享清单、前端 client 与上传 helper 全部移除；`resume_images` 表与存量图片保留，基线由 18 条降到 16 条；`/admin/resumes` 落到 404，`/api/admin/resumes` 带令牌 404 / 不带令牌 401。
- **分数线**：`shared/src/score-line.ts` + `.cases.ts`、两张新表、四个管理端接口、`/admin/score-lines` 页面与弹窗；`npm run check:score` 已接入 `verify`；不预置数据、不接入报告。
- **设置下移**：只移动 `AdminLayout.vue` 的 `<section>`，折叠状态与高亮逻辑不变。
- **验证**：`npm run verify` 全绿；临时 `DATA_DIR` + 8891 端口接口断言通过；Playwright 桌面 + 390px 走查通过（新增 / 编辑 / 删除、筛选、搜索、404、设置高亮与折叠记忆、无横向溢出、控制台零错误）。
- **未做**：自动抓取 / 批量导入 / 公开页 / 报告注入 / 简历图片导出或 `DROP` / `client_max_body_size` 下调；已提交 `ba57bb6`，部署待执行。
