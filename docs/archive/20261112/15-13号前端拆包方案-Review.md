# 13 号方案 Review · 前端拆包与巨型文件拆分

> 评审日期：2026-11-12
> 评审对象：[`13-前端拆包与巨型文件拆分-开发方案.md`](./13-前端拆包与巨型文件拆分-开发方案.md)（v1.2）
> 评审基线：当前工作区（含尚未提交的第一批、第二批拆分改动）
> 评审结论：**主体完善，建议先修正 6 处事实/一致性问题，再补 6 节内容后归档。**

---

## 一、总体判断

这份方案把「要解决什么问题、怎么拆、拆到什么边界、怎么验证、怎么回滚」都写清楚了，第二轮拆分的表格与代码现状也基本逐项对得上。按当前工作区核对，以下内容已通过：

| 核对项 | 结果 |
| --- | --- |
| `npm run verify` | 退出码 0（check:docs / check:dates / typecheck / build 全过） |
| 构建产物 | `index` 24.02KB、`vendor-vue` 107.53KB、ConsultWorkspace 35.48KB、ReportBlocks 25.64KB，与第五节一致 |
| 路由数量 | admin 38 条、consult 33 条，与第五节一致 |
| 路由顺序 | `/submissions/export.csv` 在 `/:id` 前、`/collections/bundle` 在 `/:id` 前、`/login`、`/dev-login` 在 `requireAdmin()` 前 |
| 拆分后行数 | `report-blocks/`、`components/consult/`、`db/`、`doc-search/doc-prompts/doc-audit` 各表基本逐项正确 |
| 入口与导出 | `server/src/index.ts` 已改为 `./routes/admin/index`；`db.ts` 27 行；`doc-generate.ts` 保留原导出名与 re-export |

评审未重新执行文档 4.5 描述的 Playwright 截图/计算样式逐字节对比，该部分只按文档记录采信；其余结论均基于当前代码、构建产物和路由清单核对。

---

## 二、必须修正的问题

| # | 位置 | 问题 |
| --- | --- | --- |
| 1 | `13-...md:3` 与 `development-history.md:9` | 方案自己写 **v1.2**，历史文档却引用 **v1.1**。需要统一，或写明「v1.1 第一批 / v1.2 第二批」。 |
| 2 | `13-...md:21-26` 与 `4.2/4.3` | 1.2 的「改造前」行数有三处对不上：ConsultPurposes 写 2101、4.2 写 2080、HEAD 实际 2114；ConsultWorkspace 写 1802、4.2 写 1883、HEAD 实际 1814；doc-generate 写 1576、历史与 HEAD 都是 1630。建议给 1.2 加一句「本表为 v1.0 立项时测量；并入 14 号方案后的实际拆分基线见 4.2/4.3」。 |
| 3 | `13-...md:59` | `invites.ts` 只写了 `/invites`、`/invites/:id/rotate`，漏了 `DELETE /invites/:id`。 |
| 4 | `13-...md:61` | `submissions.ts` 写 4 条，实际 6 条：还漏了 `PATCH /submissions/:id`、`DELETE /submissions/:id`（HEAD 时就有，不是 14 号方案新增的）。 |
| 5 | `13-...md:189-191` | 文档写「已实施、回滚就是 `git revert` 对应提交」，但当前工作区这些改动**还没提交**，回滚路径暂时不存在。提交后建议把 commit hash 补进本文和历史记录。 |
| 6 | `development-history.md:10` | 历史里仍是第一批的旧数（23.9KB、ConsultWorkspace 26.2KB、ReportBlocks 21.6KB），与本文第五节和当前构建（24.0 / 35.5 / 25.6）不一致。建议一并同步。 |

---

## 三、建议补充的章节

### 3.1 「拆分例外」要写进方案

3.3 说「只移动代码、不改逻辑」，但实际有一处必须改：`server/src/routes/consult/shared.ts` 读取 `shared/src/*.json` 的相对路径从 `../../../` 调整为 `../../../../`，以及 `server/src/index.ts` 的 import 路径。现在这段只写在 `development-history.md:12`，方案正文没写。建议在 3.3 增加「允许的例外：目录变深导致的相对路径调整，已确认种子树仍能并入森林」。

### 3.2 `db/` 拆分的验证还不够硬

方案和第五节只写了 `npm run verify` + 临时 `DATA_DIR` 起服务。`db.ts` 拆分改变的是**启动时 schema + 迁移**，建议补一条：

- 用现有数据库副本（含 WAL）启动两次，确认 `ensureInviteColumns → ... → migrate` 顺序、幂等性和旧库补列都正常；
- 只跑类型检查/构建不能覆盖这条路径。

### 3.3 补「风险与回滚」小节

现在回滚只有一句 `git revert`。对这次改动，至少还有两个真实风险：

- 部署后旧 `index.html` 仍引用旧 hash 的懒加载 chunk，新构建删掉旧文件后会出现 404；建议在方案里写明是否接受，或加 `router.onError` / `vite:preloadError` 的刷新提示。
- 手机弱网下懒加载失败目前没有 UI 反馈；公开页面向非技术学生，建议至少加「加载失败，点击重试」，或明确写为已知取舍。

### 3.4 补「文档同步」清单

仓库规则是文档优先，但方案没有说这次改了哪些文档。建议列一行：`development-history.md` 已记录；`docs/README.md` 的目录结构是否更新；`consult-system.md` 若引用旧路径需同步。目前 `README.md` 的目录结构还是高层描述，可以明确写「本次不展开」。

### 3.5 补「后续拆分」清单，而不只是 `runs.ts`

`13-...md:187` 说「仍未拆的只剩 `consult/runs.ts`」。如果限定在原来那 6 个目标文件里，这句话成立；但按当前仓库实际大小，还有：

- `web/src/views/admin/Submissions.vue` 1581 行
- `web/src/views/admin/ResumeCollection.vue` 1482 行
- `shared/src/doc.ts` 1416 行
- `web/src/views/ReportView.vue` 1213 行
- `web/src/views/admin/SurveyEditor.vue` 1138 行
- `web/src/views/admin/ReportEditor.vue` 1086 行

建议加一句「这些不在本方案范围，是否另开方案」，并给 `runs.ts` 一个后续拆分方向（生成流程 / 章节 CRUD / 导出 / 节拍），否则「巨型文件拆分」这个目标看起来只完成了一半。

### 3.6 验证方式的可复现性

4.5 写了「截图、计算样式、文本哈希逐字节一致」，第五节写了「用脚本对比路由清单」，但仓库里没有脚本/命令/产物路径。建议至少补：

- 路由清单对比用的命令；
- 截图对比脚本位置或复现步骤；
- 说明这些是人工走查，不进入 `verify`。

---

## 四、低优先级观察

- `web/src/views/admin/consultPurposes.css` 仍有 335 行，其中 `list-card`、`stage-*`、`purpose-row`、`row-*`、`butterfly-row`、`detail-placeholder` 等选择器在拆分前后都已没有模板引用（属于历史遗留死 CSS，不是本次拆分造成的）。可以在「后续清理」里提一句，不要混进本次「只移动代码」的提交。
- `web/src/router.ts` 为了 `devLogin()` 静态导入了整个 `web/src/api.ts`（956 行），入口 chunk 24KB 里包含全部 API 方法。不是问题，但可作为下一步首屏优化项。

---

## 五、建议的最小修订清单

如果只想快速收尾，改这 5 处即可：

1. 统一 v1.1 / v1.2 引用；
2. 给 1.2 加「基线时间点」说明；
3. 补 `invites.ts` / `submissions.ts` 漏掉的路由；
4. 增加「拆分例外（相对路径）」和「db 旧库启动验证」两段；
5. 提交后把 commit hash 写进第六节，并顺手把 `development-history.md:10` 的旧构建数字对齐。

---

## 六、评审执行记录

本次评审实际执行：

- `npm run verify`：退出码 0；
- 对比 `git show HEAD:server/src/routes/{admin,consult}.ts` 与拆分后目录的路由清单：admin 39 → 38（差异为 14 号方案删除的 `GET /appointments`），consult 33 → 33；
- 统计 `server/src/routes/`、`server/src/db/`、`server/src/ai/doc-*.ts`、`web/src/components/report-blocks/`、`web/src/components/consult/`、`web/src/composables/` 的实际行数；
- 核对 `web/src/router.ts`、`web/vite.config.ts`、`server/src/routes/admin/index.ts`、`server/src/routes/consult/index.ts`、`server/src/db.ts` 的实现；
- 检查 `web/src/views/admin/consultPurposes.css` 与拆分后模板的 class 引用关系。
