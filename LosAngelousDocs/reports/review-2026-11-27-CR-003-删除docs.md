# Review Agent 评审报告 — CR-003 删除 docs/ 并迁移文档/版本守卫（G3）

<!-- report-meta
role: review
gate: G3
cr: CR-003
task: T-015,T-016,T-017
status: 有条件通过
action: docs/ 158 文件删除与备份核验、check-docs/check-version 重写均独立复现通过；唯一未闭环项是 CI 需推送后确认
commit: -
auth_level: A1c
auth_action: commit
auth_policy: G1-envelope + G3 有条件通过
auth_evidence: 本报告 + npm run verify EXIT=0 + npm run check:docs/check:version EXIT=0 + 备份 158 文件 SHA256 158 OK + 删除集合与备份清单集合一致 + 守卫错误路径注入
auth_scope: D:/PROJECT/Vesta（CR-003 工作区：docs/ 158 删除 + 脚本/文档/版本；不含 data/、.env、zxg/）
auth_expires: 随 CR 结束
auth_key: CR-003:T-015~T-017:commit:A1c
-->

- 工作日志：LOG-20261127-154552（已追加）
- 范围：CR-003 / T-015 ~ T-017；基线 `6c84f60`；工作区未提交（docs/ 158 个删除已 staged，22 个文件未暂存修改，1 个 Dev 报告未跟踪）
- 评审类型：首次评审（G3）
- 来源 CR：CR-003（G1 已确认，G2 Dev 自检完成）
- G1 / DoR：已通过（`check-docs --gate g2` EXIT=0；G1 用户确认「直接删除并改引用」）
- 结论：有条件通过
- 一句话理由：删除范围、备份完整性、两个守卫的新逻辑与全套回归均已独立复现；无 P0/P1、无业务代码改动；唯一未闭环的是 AC-003-5 的 CI `Build web dist`（本工作区未提交/未推送，无法触发），作为放行条件交由 Steward 推送后确认。

## 评审基线

- 范围：CR-003 / R-003（v1）/ AC-003-1 ~ AC-003-6 / T-015 ~ T-017
- 变更面：22 个文件修改（入口文档、`LosAngelousDocs/00–05 + STATUS + CHANGELOG + DOCS_CONTRACT`、`.env.example`、CI/技能注释、`scripts/check-{docs,version,deps}.mjs`、`package.json`/`package-lock.json`）+ `docs/` 158 个文件删除
- 影响面：仓库文档入口、`npm run check:docs` / `check:version` 判定契约、版本事实源；业务运行时代码零改动
- 必须满足的契约：`01-requirements.md` R-003 的 6 条 AC；`DOCS_CONTRACT.md` 单一事实来源；`PROJECT_BRAIN.md` 版本两处同步（`package.json` ↔ `STATUS.md`）
- 文档树：`check-docs.sh LosAngelousDocs` → EXIT=0（0 ERROR, 0 WARN）；`--gate g2` → EXIT=0
- 明确不在范围：Git 历史重写、docs 内容迁入 LosAngelousDocs、恢复问卷设计覆盖守卫、`data/`/`.env`/`zxg/`

## AC 判定

| AC | 判定 | 证据 |
|---|---|---|
| AC-003-1 | 满足 | `git ls-files docs`=0；`test -d docs`=false；`find docs -type f`=0；备份 158 文件，SHA256 清单 158 行，`sha256sum -c` 158 OK / 0 FAILED / EXIT=0；删除路径集合与备份清单集合逐项一致（158/158，双向差集为空） |
| AC-003-2 | 满足 | `scripts/check-docs.mjs` 不读任何 `docs/`；校验 8 个必查文件与 6 条关键指针；`npm run check:docs` EXIT=0（14 条 ✓ + 「文档一致性检查通过。」）；临时目录注入「缺文件 / 丢指针」均 EXIT=1 且报错明确 |
| AC-003-3 | 满足 | `scripts/check-version.mjs` 以 `LosAngelousDocs/STATUS.md` 的 `当前产品版本：v2.08` 为源；`package.json=2.8.0` 数值相等；`npm run check:version` EXIT=0；不再读 `docs/reference` |
| AC-003-4 | 满足 | `AGENTS.md` / `CLAUDE.md` / `PROJECT_BRAIN.md` / `DOCS_CONTRACT.md` / `00-overview.md` / `03-design.md` 中所有 `docs/` 均为「已于 v2.08 移出 / 备份 / 历史」表述，无「必须存在」的当前口径；全仓 `grep docs/` 仅剩历史 R/T/报告、备份路径与注释；历史报告链接按历史保留 |
| AC-003-5 | 部分（本地满足，CI 待触发） | `npm run verify` EXIT=0（build 5.71s，全部用例通过）；本工作区未 commit / 未 push，CI `Build web dist` 无法运行，需推送后确认 |
| AC-003-6 | 满足 | `git diff HEAD -- server web shared` = 0 个文件；`package.json`/`package-lock.json` 仅版本号；无新增依赖；`git log -- docs` 仍有 118 个历史提交；`data/`、`.env`、`zxg/` 无改动 |

## 验证执行（独立复跑，非引用 Dev 报告）

### 备份与删除

- `find /d/PROJECT/_vesta-backups/docs-20261126-2010 -type f` → **158**
- `wc -l < docs-20261126-2010.sha256` → **158**
- 在备份目录内 `sha256sum -c ../docs-20261126-2010.sha256` → **EXIT=0，158 条 OK，0 条 FAILED**
- 备份清单路径（去掉 `./`）与 `git diff --cached` 的 158 个 `docs/` 删除路径做集合比较 → **交集 158，双向差集为空**
- `git diff --cached --name-only -z` → **158 条，全部为 `D` 且全部在 `docs/` 下，非 docs 的 staged 路径 = 0**
- `git ls-files docs` → **0**；`test -d docs` → **不存在**；`find docs -type f` → **0**
- `git log --oneline -- docs | wc -l` → **118**（历史未被重写）

### 守卫脚本

| 命令 | 结果 |
|---|---|
| `npm run check:docs` | EXIT=0；14 条 ✓；输出「文档一致性检查通过。」 |
| `npm run check:version` | EXIT=0；`✓ 版本一致：package.json=2.8.0 ↔ LosAngelousDocs/STATUS.md 当前产品版本 v2.08` |
| `npm run verify` | EXIT=0；check:docs / size / version / deps / dates / question / score / scoreline / audit / roster / search / typecheck / build 全过；`✓ built in 5.71s` |

`verify` 内各套件摘要：时间 19+9+3 组、周期 15 组、问卷 **162 passed / 0 failed**、分数线 v3 全部通过、解析器全部通过、自动收录集成全部通过（含 P1-1 全 skip、P1-2 迁移回滚重跑）、吉林校级线全部通过、审计 / 名单 / 检索全部通过。

### 守卫错误路径（临时目录注入，未改仓库）

| 场景 | 结果 |
|---|---|
| STATUS.md 缺失 | EXIT=1，`❌ 缺少文件：LosAngelousDocs/STATUS.md` |
| STATUS.md 无「当前产品版本」 | EXIT=1，提示应写成 `当前产品版本：v<major>.<minor>` |
| 版本不一致（2.8.0 vs v2.07） | EXIT=1，同时给出「改 package.json 或改 STATUS」两条修复路径 |
| `patch != 0` / `major < 1` | EXIT=1，提示可操作 |
| `package.json` 非法 JSON | EXIT=1，提示无法解析 |
| check-docs 缺必查文件 | EXIT=1，列出缺失文件 |
| check-docs 丢关键指针 | EXIT=1，精确列出缺哪个指针 |

### 引用与回归

- `grep -rn "docs/"`（排除 `.git`/`node_modules`/`dist`/`data`/`zxg`/`_vesta-backups` 与历史报告）：仅剩「已移出 / 备份 / 历史」说明与历史 R/T 记录；`scripts/`、`server/src`、`web/src`、`shared/src`、`deploy/`、`update.sh` 中**没有任何运行时读取 `docs/` 的代码**。
- `.env.example` / `.github/workflows/build.yml` / `.dsh/skills/vesta-dev/SKILL.md` / `scripts/check-deps.mjs` 的 `docs/` 指针均已改为备份或新入口。
- 无相关自动化测试被删改；`check:size` 通过（293 文件 / 10 条基线，删除 docs 后基线未被动过）。

## 影响面覆盖

| 影响维度 | 是否覆盖 | 证据 / 缺口 |
|---|---|---|
| 模块 / 接口 | 是 | 无接口、路由、数据结构变化；业务源码 diff = 0 |
| 数据 / 配置 | 是 | 无 DB 迁移；仅 `package.json`/lock 版本号；`.env.example` 仅注释 |
| 测试 / 回归 | 是 | `npm run verify` 全套 EXIT=0；守卫正反路径均验证 |
| 文档 | 是 | 入口文档、DOCS_CONTRACT、STATUS、CHANGELOG、决策 D-008 已同步；见 P3 文档枚举问题 |
| 兼容 / 迁移 / 回滚 | 是 | 无运行时迁移；回滚 = `git revert` + 备份拷回 + 版本回退；历史保留 |
| CI | 待确认 | 工作区未推送，CI 未触发（见结论条件） |

## NFR 检查

| 项 | 目标 | 结果 |
|---|---|---|
| 安全 / 隐私 | 不新增暴露面 | 满足：删除仓库内产品文档、备份在仓库外；未触碰 `.env`/`data`/`zxg`；无密钥进入文档 |
| 兼容 | 守卫契约变更需同步所有调用方 | 满足：`package.json` 脚本、CI workflow、AGENTS/CLAUDE/brain 均已对齐；无运行时代码依赖 |
| 可观测 | 守卫失败可定位 | 满足：缺文件 / 丢指针 / 版本不一致均给出具体文件与修复建议 |
| 性能 / 成本 | 无退化 | 满足：守卫为线性读文件；`verify` 构建 5.71s |
| 可逆 | 可恢复 | 满足：备份 158 + SHA256、Git 历史 118 提交；回滚步骤明确 |

## 维度结论

| # | 维度 | 结论 | 说明 |
|---|---|---|---|
| 1 | 需求覆盖 | 基本满足 | AC-003-1~4、6 满足；AC-003-5 本地满足、CI 待推送确认 |
| 2 | 正确性 | 通过 | 两个守卫逻辑正确，正反路径均实测；版本比较按数值、patch 恒 0、major ≥ 1 |
| 3 | 边界与错误处理 | 通过（有小 P3） | 缺文件/无标记/不一致/非法 JSON/丢指针均 exit 1；STATUS 读取未包 try/catch（P3） |
| 4 | 安全 | 通过 | 无注入/越权面；删除降低仓库内文档暴露；备份未入库 |
| 5 | 性能与资源 | 通过 | 无热点；守卫只读少量文件 |
| 6 | 并发与一致性 | 通过 | 版本单源化；无并发/事务变更 |
| 7 | 可维护性 | 通过（有小 P3） | 脚本短小清晰；入口文档的 verify 清单三处不一致（P3） |
| 8 | 测试有效性 | 通过 | 守卫有正反用例；`verify` 162 问卷用例 + 分数线/审计等全绿，非假绿 |
| 9 | 文档一致性 | 通过（有 P3） | 当前口径已统一；历史 R/T 仍写 docs/reference；02 解析器计数滞后（P3） |
| 10 | 范围与风险 | 通过 | 无越界业务改动；02-architecture 的 pending→auto 更正属良性文档修正；无调试残留 |
| 11 | 用户注释保护 | 通过 | diff 中 `LosAngelous:`/`LOS:` 删除/改写 0 处 |
| 12 | 回归与影响面 | 通过 | 删除集合与备份集合一致；无业务代码变化；全部回归套件执行 |
| 13 | AC ↔ 验证追溯 | 通过（AC-003-5 部分） | 04-tasks 矩阵已建立；AC-003-5 已如实标注「本地；CI 待触发」 |
| 14 | NFR 目标 | 通过 | 见 NFR 表 |
| 15 | 文档树与契约 | 通过 | `check-docs.sh` 基线/g2 EXIT=0；报告命名规范；单一事实来源未被复制 |

## 缺陷清单（按严重度降序）

### [P3] 入口文档对 `npm run verify` 的枚举不一致

- 位置：`AGENTS.md:47`、`PROJECT_BRAIN.md:73`、`CLAUDE.md:10`
- 问题：`CLAUDE.md:10` 已列出 `check:question` 与 `check:scoreline`，但 `AGENTS.md:47` 仍缺这两项，`PROJECT_BRAIN.md:73` 仍缺 `check:scoreline`；唯一事实源 `package.json:29` 包含全部 13 步。
- 触发条件：新 Agent 只读 AGENTS 或大脑判断「改了问卷/校级线要不要单独跑用例」时，会误以为这些检查不在 `verify` 内。
- 影响：不会导致 `verify` 漏跑（脚本本身全跑），但会误导交付判断与文档阅读。
- 证据：`package.json:29` 的 verify 含 question/scoreline；`AGENTS.md:47` 与 `PROJECT_BRAIN.md:73` 的枚举缺项。
- 建议：三处直接引用 `package.json` 的 verify 定义，或统一补齐为同一串。
- 置信度：高

### [P3] `02-architecture.md` 仍写「7 个解析器」，实际注册 8 个

- 位置：`LosAngelousDocs/02-architecture.md:47`
- 问题：该行本轮已被修改（补 v2.07 校级录取表口径），但仍写「按 `Content-Type` 分派 7 个解析器」；`server/src/score-lines/parsers/index.ts` 的 registry 现为 8 个（新增 `schoolAdmitParser`）。
- 触发条件：读者以文档估算解析器覆盖或排查「少了一个解析器」时。
- 影响：文档与代码数量不一致，属陈旧口径；不影响运行。
- 证据：`parsers/index.ts` 注册 `htmlTable/htmlCategory/xlsx/pdfText/json/yzTopic/nationalLine/schoolAdmit` 共 8 个。
- 建议：改为 8，或改写为「按 Content-Type 分派 + 按来源 parserId 选择校级解析器」。
- 置信度：高

### [P3] 历史 R/T 段仍把 `docs/reference` 当作当时交付物

- 位置：`LosAngelousDocs/01-requirements.md:16-19,39,41,61`；`LosAngelousDocs/04-tasks.md:24-25,150-151,224-225`
- 问题：CR-001/002/004 的历史 AC 与任务仍写「同步 `docs/reference/...`」，这些文件已不存在。虽属历史记录（AC-003-4 只要求历史报告保留），但 01/04 是当前读取入口，未加「历史记录」提示。
- 触发条件：新 Agent 从 01-requirements 的 AC-001-4 或 04-tasks 的 T-002 追溯交付物时。
- 影响：可能误以为 `docs/reference` 仍应存在，或误判当前缺失是缺陷。
- 证据：上述行仍出现 `docs/reference`；CR-003 自身的 R/T 段已正确指向新入口。
- 建议：在这些历史 CR 段首行加「历史记录：docs/ 已于 v2.08 移出」；或接受为历史并在 01/04 顶部统一声明。
- 置信度：高

### [P3] `check-version.mjs` 的少数健壮性细节

- 位置：`scripts/check-version.mjs:54`
- 问题：`STATUS.md` 用 `readFileSync` 读取但未包 try/catch，文件存在但不可读时会抛原始堆栈而非统一 `❌` 提示；另外单数字 minor（如 `v2.9`）会显示成 `v2.09`，仅提示文本偏差。
- 触发条件：CI/本地 STATUS 权限异常，或写入 `v2.9` 这类非补零写法。
- 影响：错误信息不够友好；不影响版本比较正确性（按数值）。
- 证据：`check-version.mjs:54` 直接 `read`，仅 `package.json` 包了 try/catch；`describe()` 对 minor 补两位。
- 建议：把 STATUS 读取也纳入统一失败出口；或在错误提示中明确「v2.9 与 v2.09 视为等价」。
- 置信度：高

## 已检查且未发现问题的区域

- 158 个删除文件与仓库外备份清单逐项一致；备份 SHA256 全通过；无 `.env`/`data/`/`zxg/`/`web/dist` 混入删除。
- `scripts/check-docs.mjs` 不读取任何 `docs/` 路径；校验的 8 个文件与 AC-003-2 列表一一对应。
- `scripts/check-version.mjs` 不读取 `docs/reference`；版本比较、patch/major 约束、缺失/非法输入均正确退出。
- 无业务代码（`server/src`、`web/src`、`shared/src`）改动；无新增依赖；无数据库迁移。
- `verify` 全量回归通过，未出现「新增测试全绿但旧套件变红」。
- 历史报告未被改写；`reports/` 下无违规命名或新增子目录。
- 本轮改动文件中未修改/删除/重排任何 `LosAngelous:`/`LOS:` 用户注释。

## 文档树检查

- `$LOSSKILL_HOME/scripts/check-docs.sh LosAngelousDocs`：EXIT=0（0 ERROR, 0 WARN）
- `--gate g2`：EXIT=0（0 ERROR, 0 WARN）
- `--gate g3`：见下方「门禁复核」；无 ERROR
- 契约变更：无新增未登记路径；`docs/` 不在本树，符合 `DOCS_CONTRACT.md` 第 1 节「产品口径（外部）已移出」。
- 报告命名：`review-2026-11-27-CR-003-删除docs.md` 符合 `reports/<角色>-<YYYY-MM-DD>-<范围>.md`。
- 单一事实来源：R/AC 只在 01、任务只在 04、决策全文只在 05、当前状态只在 STATUS，未复制。

## 文档同步检查

- `04-tasks.md`：T-015~T-017 置 DONE，CR-003 AC 矩阵已建立；AC-003-5 如实标注「本地；CI 待触发」。
- `CHANGELOG.md`：v2.08 变更/移除条目已追加，覆盖文档入口收敛、守卫迁移、`docs/` 移除。
- `03-design.md`：`docs/reference` 指针已改为本文件/`schema.ts`/备份说明；无行为契约被改。
- `02-architecture.md`：分数线条目已从「pending + 人工复核」更正为自动收录（良性修正，见 P3 计数问题）。
- `STATUS.md`：版本 v2.08 / 2.8.0、门禁 G2 待 Review、文档根单轨；`G3 已接受` 行仍指向 CR-004（历史值，待本 G3 后由 Doc/Steward 追加 CR-003）。

## 用户注释保护检查

- 扫描到 `LosAngelous:` / `LOS:` 手写注释：0 处（仓库内相关命中均为历史报告/契约中的说明文字）。
- 被修改 / 删除 / 重排：**0 处**；`git diff HEAD` 中被删除的 `LosAngelous:`/`LOS:` 行计数 = 0。

## 残留风险

1. **有意能力下降（用户已接受，必须在后续交接中明确）**：产品问卷 / 报告 / 咨询 / 部署文档只保留在仓库外备份 `D:/PROJECT/_vesta-backups/docs-20261126-2010` 与 Git 历史；工作区不再可读。原 `check:docs` 的「问卷设计覆盖守卫」随 `docs/` 删除而消失（`scripts/check-docs.mjs:3-5`、D-008、CHANGELOG 均有记录）。后续 Agent 若需产品口径，只能查备份/历史，不能假设工作区有 `docs/`。
2. **历史死链**：`LosAngelousDocs/reports/` 与历史 R/T 中指向 `docs/` 的链接在磁盘上已不可达，按 AC-003-4 作为历史保留，不作为当前入口。
3. **CI 未验证**：本工作区未提交/未推送，CI `Build web dist` 未运行；需 Steward 推送后确认。`npm ci` 在 CI 上重新安装依赖，本地仅验证了 lock 版本号一致性。
4. **备份依赖外部路径**：`_vesta-backups` 在仓库外，若被清理则产品文档只剩 Git 历史；建议用户在备份完成后再做一次离线副本（不影响本次放行）。

## 建议（非阻塞）

- [P3] 三处 `verify` 枚举统一到 `package.json` 的同一串（见缺陷清单）。
- [P3] 更新 `02-architecture.md` 解析器数量为 8 或改写口径。
- [P3] 给历史 R/T 段加「历史记录」提示，避免新 Agent 误读 `docs/reference` 仍存在。
- [P3] 可选：在 `check-docs.mjs` 增加「若工作区重新出现 `docs/` 则告警」，避免无意恢复；或在 `.gitignore` 明确忽略，二者择一即可。

## 授权记录

- 批准的 AUTH：`AUTH-*`（由 `finish-report` 生成）— 动作 `commit`（A1c），范围：CR-003 当前工作区（docs 删除 + 脚本/文档/版本；不含 data/.env/zxg）；证据见本报告与 `verify`/守卫/备份复跑结果。
- 拒绝或升级的请求：无。push / PR / CI 属 A2，交 Steward；本次不批准 A2。
- 本轮 G3 结论接受：未接受（Review 不得自批；由 Steward 或用户记 WORKLOG `gate=G3`，不写台账）。

## 上下文增量

- 评审范围：CR-003 / T-015~T-017，工作区未提交。
- 发现的过期信息（本次未改，建议后续处理）：
  - `AGENTS.md:47`、`PROJECT_BRAIN.md:73` 的 `verify` 枚举与 `package.json:29` 不一致。
  - `02-architecture.md:47` 解析器计数 7 与 registry 8 不一致。
  - `01-requirements.md` / `04-tasks.md` 历史 CR 段仍写 `docs/reference`（历史保留，但缺提示）。
  - `STATUS.md:13` 的 `G3 已接受` 仍为 CR-004 记录，CR-003 接受后需追加/替换。
- `review-index` 更新：是（新增「文档守卫 / 版本源迁移」行）。

## 门禁复核

- `check-docs.sh LosAngelousDocs --gate g3`：EXIT=0（0 ERROR, 0 WARN）

## 发布 / 回滚

- 发布：本次无运行时行为变化，无需 `update.sh` 变更即可上线；版本元数据升到 `2.8.0`，下次 CI 构建的 `dist-info.json` 会带 2.8.0。`docs/` 删除只影响仓库阅读，不影响服务运行。
- 回滚：`git revert <commit>` 恢复 `docs/` 与旧守卫；或从 `_vesta-backups/docs-20261126-2010` 拷回 `docs/`，并把 `package.json` 回退到 `2.7.0`、`STATUS.md` 回退到 `v2.07`；无数据库迁移需要回退。
- 数据安全：备份在仓库外，回滚脚本不要对 `data/` 做任何重置。

## 建议 commit message

```text
[docs] v2.08 删除 docs/ 并把文档/版本守卫迁到 LosAngelousDocs

- 移除 docs/ 158 个跟踪文件（仓库外备份 _vesta-backups/docs-20261126-2010，SHA256 全通过）
- check-docs 改为校验 AGENTS/CLAUDE/PROJECT_BRAIN/LosAngelousDocs 入口与关键指针
- check-version 改以 LosAngelousDocs/STATUS.md 当前产品版本为源
- 入口文档、DOCS_CONTRACT、00–05、STATUS、CHANGELOG、决策 D-008 同步
- 版本 2.7.0 -> 2.8.0（v2.08）；无业务代码/依赖/数据迁移

Co-Authored-By: Claude Code <noreply@anthropic.com>
```

## 下一步交接

- 有条件通过 → Meta Agent（G4 总审）+ Steward（A2 push 后确认 CI）。
- 放行条件：推送后 `Build web dist` 必须 success；若失败，本 G3 结论不回退为「通过」，需按失败项返工后复审。

给 Meta 的 Prompt（可直接复制）：

```text
【项目路径】D:\PROJECT\Vesta
【本次范围】CR-003 / R-003 / T-015~T-017，工作区未提交（docs/ 158 删除已 staged，其余未暂存）
【文档位置】D:\PROJECT\Vesta\LosAngelousDocs
【已有材料】评审报告 D:\PROJECT\Vesta\LosAngelousDocs\reports\review-2026-11-27-CR-003-删除docs.md；Dev 报告 D:\PROJECT\Vesta\LosAngelousDocs\reports\dev-2026-11-27-CR-003-删除docs.md；基线 commit 6c84f60
【结论】有条件通过（P3 四项；AC-003-5 CI 待推送确认）
【重点复核】check-docs/check-version 新逻辑、备份 158+SHA256、无业务代码改动、docs/ 指针清理；确认 G3 接受与 A1c 记账
【约束】不要 push；push/CI 由 Steward 走 A2；不要触碰 data/.env/zxg 与仓库外备份
```

给 Dev / Doc 的后续提示（非返工，仅 P3 清理）：

```text
【项目路径】D:\PROJECT\Vesta
【后续事项】CR-003 G3 有条件通过；请 Doc 在 CR 结束后处理 4 个 P3：verify 枚举统一、02 解析器计数 8、历史 R/T 加历史提示、STATUS G3 已接受补 CR-003
【依据】D:\PROJECT\Vesta\LosAngelousDocs\reports\review-2026-11-27-CR-003-删除docs.md
【文档位置】D:\PROJECT\Vesta\LosAngelousDocs
```
