# 咨询系统架构

## 总览

```text
学生状态（问卷 / 关键词 / 补充信息）──┐
                                      ├─> 目的路径 ─> 章节规划 ─> 逐章成文 ─> 咨询稿
目的树（旺季 / 淡季模板）────────────┘        │
                                             └─> 反馈：哪些目的对这类学生有效
```

系统分为四层：

1. **目的层**：每个节点是一段咨询要达成的目的，而不是固定话术。目的节点记录“要达成什么”、分支条件、导演提示和原始逐字稿示例组；情绪垫话作为蝴蝶挂在目的节点上。
2. **选择层**：非可选目的默认全部保留；可选支线由 AI 根据学生状态判断是否进入，并给出引用学生情况的依据。AI 不可用时，用分支条件关键词做保守兜底。
3. **规划层**：AI 把目的路径组织成 6—12 个章节，每章标注要覆盖的 `purposeKeys`。后端校验 key、阶段顺序和去重，并补齐没有被覆盖的非可选目的。
4. **成文层**：每章携带全文章节规划、本章目的摘要、分支条件、导演提示和 2 条来源不同的参考示例，逐章生成正文；全部成功后拼接完整咨询稿。

## 生成管线

```text
目标篇幅（2 / 3 / 4 万字）
  → 读取目的树模板
  → AI 判断要进入哪些可选支线（带依据）
  → 保存本次目的路径（purpose_path）
  → AI 规划章节并分配 purposeKeys
  → 逐章生成（每章约 2500—4500 字）
  → 保存每章状态、正文和 purpose_keys
  → 全部成功后拼接完整咨询稿
```

生成是后台任务。页面轮询 `GET /api/admin/consult/runs/:id` 查看进度；章节状态为 `pending`、`running`、`ready`、`failed`。任何一章失败都会显示失败章节和原因，保留已完成章节，并可调用 `POST /api/admin/consult/runs/:id/retry` 从失败处重试。重试沿用已保存的目的路径和章节分配，不会重新规划。

## 数据模型

- 目的树：由 `prototype/consult-purpose-tree/generate.mjs` 从逐字稿生成到 `shared/src/consult-purpose-data.json`，后端 `GET /api/admin/consult/purposes` 只读该文件。
- `ConsultPurposeNode`：`kind`（`root` / `stage` / `purpose` / `butterfly`）、`purposeKey`、`label`、`summary`、`optional`、`branchCondition`、`notes`、`examples`、`children`、`butterflies`。
- `consult_runs`：新增 `mode`、`purpose_template_id`、`purpose_path`。目的模式下 `path` 与 `steps` 为空。
- `consult_run_sections`：新增 `purpose_keys`，记录本章覆盖的目的。
- `consult_purpose_feedback`：按 `(template_id, purpose_key)` 累计 `selected`、`won`、`lost`、`liked`。

旧逐句树数据 `consult_forest`、`consult_tree` 和旧的 `consult_runs` 记录没有删除，作为历史数据保留；后台不再展示逐句树、路径索引和咨询稿风格入口，也不再从界面触发逐句路径生成。

## 反馈回流

| 结果 | 更新 |
| --- | --- |
| 成交 | 本次目的路径上全部 `purpose_key` 的 `won += 1` |
| 未成交 | 本次目的路径上全部 `purpose_key` 的 `lost += 1` |
| 用户好评 | 本次目的路径上全部 `purpose_key` 的 `liked += 1` |
| 中途退出 | 按未成交处理，`lost += 1` |

每次记录反馈时，路径上全部目的同时 `selected += 1`。反馈只累计目的效果，不回写逐句森林。

## 成文框架

生成内部仍使用默认成文框架（`defaultConsultTemplate`）规定整体语气、段落意图和建议长度。框架不参与目的选择，只约束成文风格。后台暂时不开放框架编辑页面。

## 示例选择

同一目的通常有多篇稿子的说法。生成时按学生情况与示例备注、来源的文本重合度排序，并优先选择来源不同的示例，避免整章参考都来自同一位学生。示例只用于理解推进顺序、判断依据和回应方式，提示词明确要求不得整段复制。

## 端到端示例

1. 在咨询工作台填写学生关键词、问卷情况或补充信息，选择目的树模板。
2. 系统读取目的树，保留全部非可选目的，再由 AI 结合学生状态判断可选支线。
3. AI 按目标篇幅规划章节，每章分配要覆盖的目的。
4. 逐章生成时，每章只看自己负责的目的、参考示例和已完成章节摘要。
5. 生成完成后记录成交、未成交、好评或中途退出，累计到目的反馈表。

## 收藏栏

咨询师可以把金句、完整优秀咨询稿、公众号链接和其他参考资料收进“收藏栏”（`/admin/consult/collections`）。数据保存在 `consult_collections` 表，字段包括类型、标题、正文、链接、出处、备注、标签和置顶。

列表默认显示“金句”分类，每张卡片只显示标题和一行概要；双击卡片进入 wiki 风格的详情页（`/admin/consult/collections/:id`），正文按 Markdown 渲染，右侧是类型、出处、标签和收藏时间。

收藏内容保留原文，不改写。除人工阅读外，`GET /api/admin/consult/collections/bundle` 会按类型输出一份纯文本合集，供之后的咨询稿生成器读取；当前生成流程还没有接入这批内容。

## 管理入口

- `/admin/consult`：咨询工作台，选择目的树、生成、回看、记录反馈。
- `/admin/consult/purposes`：咨询树（目的骨架模板、示例、蝴蝶）。旧地址 `/admin/consult/tree` 会重定向到这里。
- `/admin/consult/collections`：收藏栏，金句、优秀咨询稿、公众号链接和其他参考资料。
- `/admin/consult/collections/:id`：单条收藏的 wiki 风格详情页，可编辑、复制原文或删除。

接口统一位于 `/api/admin/consult`，沿用现有管理员登录态。
