# 咨询系统架构

## 总览

```text
学生状态（问卷 / 关键词 / 补充信息）──┐
                                      ├─> 目的路径 ─> 对话模块 ─> 三种打法 + 节拍 ─> 咨询稿
目的树（旺季 / 淡季模板）────────────┘        │
                                             └─> 反馈：哪些目的对这类学生有效
```

系统分为四层：

1. **目的层**：每个节点是一段咨询要达成的目的，而不是固定话术。目的节点记录“要达成什么”、分支条件、导演提示和原始逐字稿示例组；情绪垫话作为蝴蝶挂在目的节点上。
2. **选择层**：非可选目的默认全部保留；可选支线由 AI 根据学生状态判断是否进入，并给出引用学生情况的依据。AI 不可用时，用分支条件关键词做保守兜底。
3. **模块层**：后端把目的路径按“一通电话里的对话动作”切成 10—20 个模块（`server/src/consult-modules.ts`）。模块不改变 `purposeKey`，只决定每一段处理哪些目的；可选支线多时模块会相应增加。树里的分组动作（例如“先选最在意的担忧”）会补成独立模块。
4. **节拍层**：每个模块由 AI 给出三种真正不同的推进打法，默认推荐最有学生依据的一种，并把推荐打法写成可直接照着说的节拍：陈述、提问、学生回应、动作提示、条件分支。正文由节拍按顺序拼成，不再让 AI 一次写 2500—4500 字文章。生成提示会附上这些目的的历史反馈（选择 / 成交 / 未成交 / 好评），只用于打法排序；样本少时明确要求不要当成结论。

## 生成管线

```text
目标篇幅（2 / 3 / 4 万字，只作参考）
  → 读取目的树模板
  → AI 判断要进入哪些可选支线（带依据）
  → 保存本次目的路径（purpose_path）
  → 后端切成对话模块并写入 consult_run_sections
  → 逐个模块：AI 给三种打法 + 推荐打法的节拍
  → 保存每模块的 options_json / selected_option_id / beats_json，正文由节拍拼出
  → 全部成功后拼接完整咨询稿
```

生成是后台任务。页面轮询 `GET /api/admin/consult/runs/:id` 查看进度；模块状态为 `pending`、`running`、`ready`、`failed`。任何一段失败都会显示失败模块和原因，保留已完成模块，并可调用 `POST /api/admin/consult/runs/:id/retry` 从失败处重试。重试沿用已保存的目的路径和模块分配，不会重新规划。

## 模块编辑

工作台把生成结果渲染成模块卡片，而不是一整篇只读长文：

- 点开模块可以看三种打法、每种的依据、代价和风险；默认选中推荐项。
- 换一种打法后，点“按这个打法重写本模块”，只重写这一段节拍。
- 节拍可以逐条改、删、加；类型分为陈述、提问、学生回应、动作、分支，分支单独写触发条件。
- “保存本模块”把节拍写回数据库并重新拼全文；“重新给三种打法”只覆盖当前模块；“在后面加模块 / 删除模块”调整结构。
- 咨询师备注只保存在 `notes`，不会进入正文。
- 旧版按章节生成的历史记录仍可打开；没有节拍的章节显示正文编辑框，不会被强制迁移。

相关接口：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `PATCH` | `/runs/:id/sections/:seq` | 保存节拍、备注、选中打法或旧版正文 |
| `POST` | `/runs/:id/sections/:seq/beats` | 按选中的打法重写本模块节拍 |
| `POST` | `/runs/:id/sections/:seq/regenerate` | 重新给三种打法并重写节拍 |
| `POST` | `/runs/:id/sections` | 在指定模块后新增空模块 |
| `DELETE` | `/runs/:id/sections/:seq` | 删除模块并重排序号 |

## 数据模型

- 目的树：由 `prototype/consult-purpose-tree/generate.mjs` 从逐字稿生成到 `shared/src/consult-purpose-data.json`，后端 `GET /api/admin/consult/purposes` 只读该文件。
- `ConsultPurposeNode`：`kind`（`root` / `stage` / `purpose` / `butterfly`）、`purposeKey`、`label`、`summary`、`optional`、`branchCondition`、`notes`、`examples`、`children`、`butterflies`。
- `consult_runs`：新增 `mode`、`purpose_template_id`、`purpose_path`。目的模式下 `path` 与 `steps` 为空。
- `consult_run_sections`：一行就是一个对话模块。新增 `module_id`、`purpose_keys`、`options_json`（三种打法）、`selected_option_id`、`beats_json`（节拍）、`notes`（咨询师备注）、`edited`（是否人工改过）。`content` 由节拍拼出，保留给全文与旧版章节。
- `consult_purpose_feedback`：按 `(template_id, purpose_key)` 累计 `selected`、`won`、`lost`、`liked`。

旧逐句树数据 `consult_forest`、`consult_tree` 和旧的 `consult_runs` 记录没有删除，作为历史数据保留；后台不再展示逐句树、路径索引和咨询稿风格入口，也不再从界面触发逐句路径生成。旧版目的模式章节（没有 `module_id`）仍走原来的章节重试逻辑，不会因为新代码丢失。

## 反馈回流

| 结果 | 更新 |
| --- | --- |
| 成交 | 本次目的路径上全部 `purpose_key` 的 `won += 1` |
| 未成交 | 本次目的路径上全部 `purpose_key` 的 `lost += 1` |
| 用户好评 | 本次目的路径上全部 `purpose_key` 的 `liked += 1` |
| 中途退出 | 按未成交处理，`lost += 1` |

每次记录反馈时，路径上全部目的同时 `selected += 1`。反馈只累计目的效果，不回写逐句森林。

## 成文框架

生成内部仍使用默认成文框架（`defaultConsultTemplate`）规定整体语气。框架不参与目的选择，只约束说话方式。后台暂时不开放框架编辑页面。

## 示例选择

同一目的通常有多篇稿子的说法。生成时按学生情况与示例备注、来源的文本重合度排序，并优先选择来源不同的示例，避免整段参考都来自同一位学生。示例只用于理解推进顺序、判断依据和回应方式；提示词明确要求不得整段复制，也不能把示例里的学生经历安到当前学生身上。

## 端到端示例

1. 在咨询工作台填写学生关键词、问卷情况或补充信息，选择目的树模板。
2. 系统读取目的树，保留全部非可选目的，再由 AI 结合学生状态判断可选支线。
3. 后端按目的顺序切成对话模块；可选支线越多，模块越多。
4. 每个模块只看自己负责的目的、参考示例、学生情况和上一模块结尾，生成三种打法和推荐打法的节拍。
5. 生成完成后，咨询师在模块卡片里改节拍、换打法、加删模块并保存；确认后复制全文。
6. 记录成交、未成交、好评或中途退出，累计到目的反馈表。

## 收藏栏

咨询师可以把金句、完整优秀咨询稿、公众号链接和其他参考资料收进“收藏栏”（`/admin/consult/collections`）。数据保存在 `consult_collections` 表，字段包括类型、标题、正文、链接、出处、备注、标签和置顶。

收藏栏支持直接导入 Word：页面右上角的“导入 Word”可以一次选择多个 `.docx`，服务端用 `server/src/docx.ts` 解析正文并逐条写入收藏。带“咨询稿 / 咨询师 / 来访者 / 学生 / 发言人 12:34”等标记的文件默认归为“优秀咨询稿”，其余归为“其他”；正文按段落保留，标题取文件名。批量导入脚本使用同一套解析逻辑：

```bash
# 先预览，不写数据库
npx tsx scripts/import-collections-docx.ts zxg

# 写入收藏栏；按标题判重，同名只更新正文，不会重复插入
npx tsx scripts/import-collections-docx.ts zxg --write
```

列表默认显示“金句”分类，每张卡片只显示标题和一行概要；双击卡片进入 wiki 风格的详情页（`/admin/consult/collections/:id`），正文按 Markdown 渲染，右侧是类型、出处、标签和收藏时间。

收藏内容保留原文，不改写。除人工阅读外，`GET /api/admin/consult/collections/bundle` 会按类型输出一份纯文本合集，供之后的咨询稿生成器读取；当前生成流程还没有接入这批内容。

## 管理入口

- `/admin/consult`：咨询工作台，选择目的树、生成、回看、记录反馈。
- `/admin/consult/purposes`：咨询树（目的骨架模板、示例、蝴蝶）。旧地址 `/admin/consult/tree` 会重定向到这里。
- `/admin/consult/collections`：收藏栏，金句、优秀咨询稿、公众号链接和其他参考资料。
- `/admin/consult/collections/:id`：单条收藏的 wiki 风格详情页，可编辑、复制原文或删除。

接口统一位于 `/api/admin/consult`，沿用现有管理员登录态。
