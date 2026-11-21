## Dev Agent 开发报告

<!-- report-meta
role: dev
gate: G2
cr: CR-019
task: T-065 ~ T-068
status: 完成
action: 前端改为 GitHub Actions 构建，update.sh 默认下载/校验/原子替换
commit: -
auth_level: -
auth_action: -
auth_policy: -
auth_evidence: -
auth_scope: -
auth_expires: 随 CR 结束
auth_key: -
-->

- 工作日志：待生成
- 任务：T-065 ~ T-068（CR-019，产品版本 v2.04）
- 结论：完成（代码与文档已改、验证已跑；工作区未提交，待 G3）
- 来源：CR-019 / R-019-1 ~ R-019-9
- 门禁：G1 已确认（2026-11-20）；G2 自检完成
- DoR 核对：通过
- 关联 AC：AC-019-1 ~ AC-019-9

### 变更清单

| 文件 | 改了什么 | 关联 AC |
| --- | --- | --- |
| `.github/workflows/build.yml`（新） | push `main` / `workflow_dispatch`；Node 24 + npm cache + `npm ci` + `npm run verify`；写 `web/dist/dist-info.json`，打包 `web-dist-<sha>.tar.gz` + `.sha256`；确保 Release `dist`、上传并清理到最近 10 个资产；权限仅 `contents: write` | AC-019-1、2、7 |
| `update.sh` | 新增 `--dist=release|local`（默认 release）与 `VESTA_DIST_BASE_URL`；release 下载/校验/解压到同文件系统暂存目录后原子替换；local 构建到暂存目录后原子替换；失败保留旧 dist；`--skip-build` 兼容；`deploy-info.json` 增加 `distSource`；help / 失败提示 / 回滚提示更新 | AC-019-3 ~ 7、9 |
| `package.json` | `2.3.0 → 2.4.0` | AC-019-8 |
| `docs/reference/07-部署与运维.md` | §3 L3/L4 口径、§3.1 release/local 与“无 auto”说明、§9 回滚命令、用法块 | AC-019-8 |
| `docs/reference/README.md` | 版本行追加 v2.04、当前版本改 `2.4.0`、版本记录表新增 v2.04、`update.sh` 章节改为下载产物口径 | AC-019-8 |
| `docs/reference/development-history.md` | 新增「前端改为 GitHub Actions 构建（v2.04）」小节 | AC-019-8 |
| `docs/archive/20261120/README.md`、`3-…需求卡.md`、`4-…开发文档.md`（后两者此前未跟踪） | 状态改 G0/G1 已确认、G2 已实现；T-066 去掉 `auto`；补实施记录 | AC-019-8 |
| `docs/STATUS.md` | 门禁改为 G2 自检完成、记录本轮结果 | — |
| `AGENTS.md` | 已在派发前由 Doc 补充 CI/部署脚本验证行（本轮未再改业务内容） | AC-019-8 |

### AC 验证

| AC | 验证方式 | 结果 | 证据 |
| --- | --- | --- | --- |
| AC-019-1 push 触发、verify、上传资产、dist-info.commit | 静态审阅 workflow + PyYAML 解析 | 代码满足；**真实 Actions 未运行** | `python3 -c "yaml.safe_load(...)"` → `yaml OK`；workflow 8 步；`permissions: contents: write`；`COMMIT_SHA=${{ github.sha }}` 写入 `dist-info.json` |
| AC-019-2 资产可匿名下载、SHA 匹配、tar 结构 | `tar -tzf` 检查测试产物 | tar 结构通过；匿名下载未验证 | `tar -tzf web-dist-<sha>.tar.gz` 输出 `dist/`、`dist/dist-info.json`、`dist/index.html`、`dist/assets/...`；`.sha256` 由 `sha256sum` 生成 |
| AC-019-3 默认下载、校验、原子替换、不 build、L4/L5 | 隔离仓库 + 本地 HTTP 夹具 + systemd/health shim | 通过 | `d2-full`：`下载 CI 产物 → SHA256 OK → 已替换 web/dist，来源：release:web-dist-<sha>.tar.gz → 更新完成`，exit 0；npm shim 日志无 `run build` |
| AC-019-4 404 / SHA 失败 / commit 不匹配保留旧 dist | 三类失败用例 | 通过 | `a-404`、`b-badsha`、`c-badcommit` 均 exit 1；旧 `web/dist/index.html` 内容与 mtime 不变；npm 日志无 build |
| AC-019-5 `--dist=local` 构建到临时目录并原子替换、失败保留 | local 成功 + 构建失败用例 | 通过 | `e-local`：`本地构建到临时目录` → `来源：local` → dist-info `commit=HEAD`、`source=local`；`f-localfail`（禁用 vite）：`本地构建失败`，旧 dist 内容/mtime 不变 |
| AC-019-6 `--skip-build` 兼容 | skip 通过 + 源码更新拒绝 | 通过 | `g-skip`：`已跳过下载与构建，沿用 web/dist`；`h-skipstale`：`源码 ... 比 web/dist 新` 并拒绝 |
| AC-019-7 无 token、无 dist 入库、最小权限、无新依赖 | 仓库检查 | 通过 | `git ls-files web/dist` = 0；`git diff -- package-lock.json` 为空；workflow 仅 `contents: write`，代码中无 PAT / 服务器 token；`update.sh` 无 token |
| AC-019-8 `bash -n`、`npm run verify`、文档/版本同步 | 命令 | 通过 | `bash -n update.sh` = 0；`npm run verify` EXIT=0；`✓ 版本一致：package.json=2.4.0 ↔ docs/reference/README.md 最高 v2.04` |
| AC-019-9 `VESTA_DIST_BASE_URL` 夹具复现 | 本地 HTTP server | 通过 | 所有 9 条用例均通过 `VESTA_DIST_BASE_URL=http://127.0.0.1:18080` 下载；未访问真实 Release |

### 执行过的命令与结果

- `bash -n update.sh` → 通过（exit 0）
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))"` → `yaml OK`（jobs=`build`，steps=8，permissions=`contents: write`）
- `npm run check:version` → `✓ 版本一致：package.json=2.4.0 ↔ docs/reference/README.md 最高 v2.04`
- `npm run verify` → `VERIFY_EXIT=0`（`check:docs`/`check:size`/`check:version`/`check:deps`/`check:dates`/`check:question`/`check:score`/`check:audit`/`check:roster`/`check:search`/`typecheck`/`build` 全过）
- 隔离测试脚本（`/home/losangelous/.cr019-test/run-cases.sh`）→ `RESULT: ALL-PASS`（9 条，见下表）

| 用例 | 结果 |
| --- | --- |
| `a-404`：下载 404 | PASS：exit 1，提示等 Actions / `--dist=local`，旧 dist 内容+mtime 不变，未 build |
| `b-badsha`：SHA256 不匹配 | PASS：exit 1，`SHA256 校验失败`，旧 dist 不变，未 build |
| `c-badcommit`：dist-info commit 不匹配 | PASS：exit 1，提示 commit 与 HEAD 不一致，旧 dist 不变，未 build |
| `d-release`：release L3 成功（`--mode=none` 预期 L4 失败） | PASS：`已替换 web/dist，来源：release:...`，未 build |
| `d2-full`：release + 模拟 systemd + 假 health | PASS：L1–L5 全过，exit 0；`deploy-info.json` 含 `distSource: release:...` |
| `e-local`：`--dist=local` 成功 | PASS：临时目录构建、原子替换、dist-info `source=local` |
| `f-localfail`：local 构建失败 | PASS：exit 1，`本地构建失败`，旧 dist 内容+mtime 不变 |
| `g-skip`：`--skip-build` 通过 | PASS：`已跳过下载与构建，沿用 web/dist` |
| `h-skipstale`：源码比 dist 新 | PASS：exit 1，`源码 ... 比 web/dist 新`，拒绝上线 |

### 回归与影响面

| 受影响区域 | 回归测试 / 验证 | 结果 |
| --- | --- | --- |
| 部署脚本 L1/L2 | 隔离仓库复跑，L1 工作区/分支/HEAD==origin/main，L2 `npm ls` | 通过 |
| 部署 L3 | release 成功/四类失败、local 成功/失败、skip 两态 | 通过 |
| 部署 L4/L5 | systemd 启动时间 shim + 假 `/api/health` 与首页指纹 | 通过（exit 0） |
| 业务代码 / 接口 / 数据 | 本轮未改 `server/`、`shared/`、`web/src/`；`npm run verify` 全量通过 | 无回归 |
| 版本 / 文档 | `check:version`、`check:docs` | 通过 |

### 发布 / 回滚

- 开关：无
- 迁移：无（`data/deploy-info.json` 仅新增 `distSource` 字段，旧字段不变；`/api/health` 接口不变）
- 发布：合并并 push `main` → 等 `.github/workflows/build.yml` 跑完，确认 Release `dist` 出现 `web-dist-<sha>.tar.gz` 与 `.sha256` → 服务器执行 `bash update.sh`
- 回滚：`git revert` 后再次 `bash update.sh`；若目标 commit 的 Release 资产已被清理，改用 `bash update.sh --dist=local`
- 可观测性：L3 输出明确来源（`release:<asset>` / `local` / `existing`）与入口指纹；`data/deploy-info.json` 记录 `distSource`；失败时打印失败阶段、日志命令、回滚命令

### 文档更新

| 文件 | 更新内容 |
| --- | --- |
| `docs/reference/07-部署与运维.md` | §3 L4 改为“产物就绪”；§3.1 补 release/local、无 `auto`、10 个资产口径、临时目录原子替换；§9 回滚命令 |
| `docs/reference/README.md` | v2.04 版本行、版本记录、`update.sh` 五层与常用选项 |
| `docs/reference/development-history.md` | 本轮 v2.04 小节（为什么 / CI / update.sh / 失败语义 / 验证 / 回滚） |
| `docs/archive/20261120/README.md`、`3-…需求卡.md`、`4-…开发文档.md` | 状态、T-066 去掉 auto、实施记录 |
| `docs/STATUS.md` | G2 自检完成、角色记录 |

### 偏差与假设

- [假设] G1 只确认 `--dist=release|local`，未实现 `auto`；已同步修正开发文档 T-066 与部署文档 §3.1 的措辞，避免后续误加 `auto`。
- [实现细节] Release 资产保留策略按“最近 10 个资产”实现（tar 与 sha 各算一个，约 5 个 commit）；文档已写清。
- [实现细节] 暂存/备份目录放在仓库 `data/`（已被 `.gitignore` 忽略），确保与 `web/dist` 同文件系统，`mv` 才是原子替换；`${TMPDIR:-/tmp}` 可能是不同文件系统。
- [实现细节] `--skip-build` 保留原有“dist 不旧于源码”检查；L3 阶段名仍为 `L3 构建`，便于兼容既有日志检索。
- [未验证] 真实 GitHub Actions Runner 上的 `gh release create/upload/api --slurp` 未执行（本机无 `gh`/`act`）；仅做 YAML 解析与步骤审阅。push 后才能验证 AC-019-1/2 的真实运行。
- [测试事故，已恢复] 首轮隔离测试时，测试树 `node_modules` 为指向真实仓库的软链，测试树内触发的 `npm ci` 跟随软链清空了真实仓库 `node_modules`；已用 `npm ci --include=dev` 按锁文件恢复，最终 `npm run verify` 全绿。未影响被跟踪文件、`data/`、`web/dist` 或线上服务；后续测试改为复制 `node_modules`，不再使用软链。

### 未完成 / 风险 / 需要决策

- 未在真实 GitHub Actions Runner 验证（需 push 后由 Review/Meta 或用户触发一次，检查 Release `dist` 资产与 `dist-info.commit`）。
- Release 资产用“最近 10 个资产”而非“10 个 commit”；更旧 commit 回滚需 `--dist=local`，文档已写明。
- 若 Actions 尚未完成就部署，L3 会 404 失败并保留旧 dist；这是预期行为，不自动回退本地构建。
- 工作区未提交；无 commit hash 可引用，Review 以工作区 diff 为准。

### 建议评审重点

1. `update.sh` 的 L3 原子替换与失败路径：重点看 `swap_dist` / `restore_prev_dist` / `cleanup_temp_dirs` 是否在所有失败分支都保留旧 `web/dist`，以及暂存目录是否与 `web/dist` 同文件系统。
2. workflow 的 Release 资产命名与清理：`web-dist-<完整 sha>.tar.gz` + `.sha256`、`tar -C web dist` 根目录、`gh api --paginate --slurp` 保留最新 10 个资产，是否与 `update.sh` 的下载/校验完全对齐。
3. 失败提示与 `--skip-build` 兼容：404 / SHA / commit 不匹配是否都可操作；`--skip-build` 是否仍保持 v2.03 语义。

## 授权记录

- 请求的 AUTH：无（本轮未 commit / push / 变更依赖 / 触碰生产）
- 已批准：无
- 未授权但尝试的动作：无

## 上下文增量

- 触及模块：`.github/workflows/`、`update.sh`、`docs/reference/07-部署与运维.md`、`docs/reference/README.md`、`docs/reference/development-history.md`、`docs/archive/20261120/`、`docs/STATUS.md`、`package.json`
- 不变量变化：无（L1~L5 口径保持；L3 从“服务器构建”改为“下载 CI 产物”，默认不执行 `npm run build`）
- 契约变化：无接口变化；`data/deploy-info.json` 新增本地运维字段 `distSource`（`/api/health` 响应不变）
- 测试变化：无自动化测试套件新增；本轮用隔离仓库 + 本地 HTTP 夹具做 9 条验证（脚本不在仓库内）
- 大脑需要更新的节：`docs/reference/07-部署与运维.md` §3/§3.1/§9、`docs/reference/README.md` 版本与更新章节、`development-history.md` 本轮
- 发现的过期信息：旧文档 §9 回滚仍写 `npm ci --include=dev && npm run build`，已改为 `bash update.sh` / `--dist=local`；旧 §3.1 未说明“只保留 10 个资产”的 tar+sha 口径，已补

## 下一步交接

- 交给：Review Agent
- 依据：G2 自检完成；DoD 满足（真实 Actions 运行列为未验证项）
- 携带材料：本报告、工作区 diff（未提交，无 commit）、变更文件、9 条隔离用例结果、`npm run verify` 输出
- 给下一位 Agent 的 Prompt（可直接复制）：

  【项目路径】/home/losangelous/LosAngelous/Vesta
  【评审范围】CR-019 / T-065 ~ T-068；工作区未提交（`git status` 见 `.github/workflows/build.yml`、`update.sh`、`package.json`、`docs/` 变更），无 commit 范围
  【文档位置】/home/losangelous/LosAngelous/Vesta/docs
  【开发报告】/home/losangelous/LosAngelous/Vesta/docs/reports/dev-agent-2026-11-20-GitHubActions构建.md
  【重点】update.sh L3 原子替换与四类失败路径；workflow 资产命名/10 个清理/最小权限；`--skip-build` 兼容；真实 Actions 未运行需标注
