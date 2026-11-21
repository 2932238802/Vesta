# Review Agent 评审报告 · CR-019 前端 CI 构建与服务端只拉取

> 角色：Review Agent ｜ 门禁：G3 ｜ 日期：2026-11-20 ｜ 结论：**有条件通过**
> 范围：CR-019 / T-065 ~ T-068（v2.04；工作区未提交，基线 `03ddf61`）
> 由 Doc Agent 落盘；正文由 Review Agent 提供，未改动结论与证据。

<!-- report-meta
role: review
gate: G3
cr: CR-019
task: T-065 ~ T-068
status: 有条件通过
action: 代码与本地夹具验证成立，真实 Actions/匿名下载/生产 systemd 部署尚未验证；另有 2 项 P2（回滚口径、失败恢复备份生命周期）
commit: -
-->

- 工作日志：待生成
- 范围：CR-019 / T-065 ~ T-068；工作区未提交，基线 HEAD `03ddf61`；文件 12 个（8 改 + 4 新）
- 评审类型：首次评审
- 来源 CR：CR-019（G0 / G1 已确认，方案 A；决策记录见开发文档）
- G1 / DoR：通过（开发文档「决策记录」2026-11-20 确认 tag `dist`、10 个资产、默认 release、完整 verify、人工部署、v2.04、不实现 auto）
- 结论：**有条件通过**
- 一句话理由：工作流与 `update.sh` 的核心逻辑经独立夹具复跑成立（成功/四类失败/local/skip/自更新/flock），但 AC-019-1/2 的真实 Runner 与匿名下载无法在本机验证，且存在 2 项 P2。

## 评审基线

- 范围：CR-019 / T-065 ~ T-068（`.github/workflows/build.yml` 新增、`update.sh`、`package.json`、文档）；工作区未提交，基线 `03ddf61`，无 commit 区间可比。
- 关联需求：R-019-1 ~ R-019-9。
- AC 清单：AC-019-1 ~ AC-019-9。
- 影响面与回归范围：部署流程（L3 由服务器构建改为下载 CI 产物）、systemd 运行时、仓库与权限、失败恢复、版本与文档。
- 必须满足的契约：`/api/health` 响应字段不变（`deploy-info.json` 仅新增 `distSource`）；L1~L5 口径不变；Release 资产命名 `web-dist-<完整 sha>.tar.gz` + `.sha256`，tar 根 `dist/`，`dist-info.json` 含 commit/版本/build 时间；固定 tag `dist`、保留 10 个资产、默认 release、不实现 auto。
- 明确不在范围：自动部署、容器化/ghcr、业务代码、依赖变更、提交 `web/dist`。

## AC 判定

| AC | 判定 | 证据 |
|---|---|---|
| AC-019-1 push 触发、verify、上传资产、dist-info.commit | **未验证（静态满足）** | YAML 解析通过：`on.push.branches=[main]`、`workflow_dispatch`、8 步；Node 24 + `cache:npm` + `npm ci` + `npm run verify`；`COMMIT_SHA=${{ github.sha }}` 写入 `dist-info.json`；`permissions={'contents':'write'}`。本机无 Runner/gh/act，真实运行未验证。 |
| AC-019-2 匿名下载、SHA 匹配、tar 结构 | **部分（结构/SHA 已验证；匿名下载未验证）** | 用与 workflow 相同命令生成产物：`tar -tzf` 输出 `dist/`、`dist/dist-info.json`、`dist/index.html`、`dist/assets/*.js`（76 项）；`.sha256` 被 `update.sh` 的 `sha256sum -c` 接受。公开仓库假设来自 CR，本机未做无 token 下载。 |
| AC-019-3 默认下载、校验、原子替换、不 build、L4/L5 | **满足** | 隔离仓库 + 本地 HTTP 夹具：`--mode=systemd` 全链路 exit 0；`已替换 web/dist，来源：release:...`、`更新完成`；npm 日志仅 `ls --depth=0`，**无任何 build**；`deploy-info.json` 含 `distSource`；L5 health 200 且版本=HEAD、首页引用新入口。L4/L5 通过 shim。 |
| AC-019-4 404 / HTTP 失败 / SHA 不匹配 / commit 不匹配 | **满足** | 四类均 exit 1；旧 `web/dist/index.html` 内容 hash 与 mtime 均不变；无 build；错误可操作。另测不安全 tar 路径与损坏 tar，均 exit 1 且旧 dist 不变。 |
| AC-019-5 `--dist=local` 构建到临时目录、原子替换、失败保留 | **满足** | 本地成功：`npm --workspace web run build -- --outDir <临时目录>/dist` 被接受，exit 0，`dist-info` 为 `commit=HEAD, source=local`；失败注入：exit 1，旧 dist hash/mtime 不变。 |
| AC-019-6 `--skip-build` 兼容 | **满足** | 通过：exit 0，`已跳过下载与构建，沿用 web/dist`，`distSource=existing`；源码更新：exit 1，拒绝。 |
| AC-019-7 无 token、无 dist 入库、最小权限、无新依赖 | **满足（仓库/脚本静态）** | `git ls-files web/dist`=0、`git ls-files .env data`=0；`package-lock.json` 无 diff；workflow 仅 `contents: write`，无 PAT；`update.sh` 无 token 引用。 |
| AC-019-8 `bash -n`、`npm run verify`、文档/版本同步 | **满足** | `bash -n update.sh` exit 0；`npm run verify` EXIT=0；`check:version` → 2.4.0 ↔ v2.04；文档同步。 |
| AC-019-9 `VESTA_DIST_BASE_URL` 夹具复现 | **满足** | 全部用例经本地 HTTP 服务完成，未访问真实 Release。 |

## 验证执行

### 真实仓库

- `npm run verify` → **EXIT=0**（全项通过）
- `bash -n update.sh` → exit 0
- `npm run check:version` → `2.4.0 ↔ v2.04`
- `npm run check:deps` → 通过
- `npm ls --depth=0` → exit 0，无 missing/invalid
- PyYAML 解析 workflow → `yaml OK`；permissions `contents: write`；steps=8
- 触发解析 → `{'push': {'branches': ['main']}, 'workflow_dispatch': ''}`

### CI 环境模拟

- `/tmp` 独立副本（复制 node_modules）删除 `.env` 后 `npm run verify` → **EXIT=0**
- `TZ=UTC LANG=C.UTF-8 LC_ALL=C.UTF-8 npm run verify` → **EXIT=0**
- 仓库内无脚本读取 `process.env.CI`

### 隔离夹具矩阵

| 用例 | 结果 | 关键断言 |
|---|---|---|
| release 成功（L1–L5） | exit 0 | 旧 dist 标记消失；`dist-info.commit=HEAD`；`distSource=release:...`；npm 日志无 build；临时目录已清理 |
| 404 | exit 1 | 旧 dist hash/mtime 不变；marker 保留；无 build；提示可操作 |
| HTTP 500 | exit 1 | 同上（复用下载失败提示） |
| SHA256 不匹配 | exit 1 | `SHA256 校验失败`；旧 dist 不变 |
| dist-info commit 不匹配 | exit 1 | 打印不一致；旧 dist 不变 |
| 不安全 tar（`../evil.txt`） | exit 1 | 拒绝解压；未在暂存目录外落文件 |
| 损坏/非 gzip tar | exit 1 | 解压失败；旧 dist 不变 |
| local 成功（L1–L5） | exit 0 | 构建写入临时目录；`source=local`；新入口上线 |
| local 构建失败 | exit 1 | `本地构建失败`；旧 dist hash/mtime 不变；无 swap |
| skip 通过 | exit 0 | `已跳过下载与构建`；`distSource=existing` |
| skip 源码更新 | exit 1 | 拒绝 |
| `--dist=auto` / 缺值 | exit 2 | 明确报错 |
| 自更新 | 检测并 re-exec | `--skip-build` 保留；`--resumed` 无循环；锁继承 |
| flock 并发 | 第二个 exit 1 | 锁提示；第一个继续到 L4 |

## 影响面覆盖

| 维度 | 覆盖 | 证据 / 缺口 |
|---|---|---|
| 模块 / 接口 | 是 | `server/`、`shared/`、`web/src/` 零 diff；静态根仍为 `web/dist`；`distSource` 不影响 health |
| 数据 / 配置 | 是 | 无迁移；`deploy-info.json` 仅增字段；`data/` mtime 早于评审 |
| 测试 / 回归 | 是 | 隔离夹具覆盖 L1–L5、失败、local、skip、自更新、flock；`verify` 全绿 |
| 文档 | 是（除 P2-1/P3-5） | 文档同步；版本三处一致 |
| 兼容 / 迁移 / 回滚 | 部分 | 旧 dist 无 dist-info 可 skip；**回滚指令 P2-1**；资产约 5 个 commit |
| 仓库 / 权限 | 是 | 无 dist/`.env`/data/zxg；无依赖变化；仅 `contents: write` |

## NFR 检查

| 项 | 结果 |
|---|---|
| 安全：服务器无 token | 通过 |
| 安全：产物 commit 绑定 + SHA256 | 通过 |
| 一致性：L1~L5 口径不变 | 通过（shim） |
| 失败保留旧 dist | 通过（四类 + 路径/解压）；双失败见 P2-2 |
| 不提交 dist | 通过 |
| 资源 | 服务器不再构建 |
| 可观测性 | `distSource`、阶段与回滚提示 |

## 缺陷清单

### [P2] 回滚指令与 `update.sh` 的 L1 逻辑冲突，按文档执行不会回滚

- 位置：`update.sh:169`、`update.sh:171`；`docs/reference/07-部署与运维.md:202`
- 问题：提示与文档写 `git reset --hard <旧 commit> && bash update.sh`，但 L1 会 `git pull --ff-only origin main` 并强制 `HEAD == origin/main`，本地 reset 会被立即快进回 origin/main。
- 影响：以为在回滚，实际重新部署最新（含问题版本）；仍打印“更新完成”。
- 证据：夹具中 `git reset --hard cd346b3` 后 `bash update.sh` → `Updating cd346b3..ecf32e0 Fast-forward`，HEAD 回到 origin/main。Dev 报告的 `git revert` 口径与脚本提示/§9 矛盾。
- 建议：统一为“远端 `git revert` 并 push 后 `bash update.sh`”，或明确“本地 reset 后需同步回退远端 main”；修正 `recovery_hint`。
- 置信度：高（已复现）。该缺陷 v2.03 已存在，本轮文档重写时原样保留。

### [P2] `restore_prev_dist` 不校验恢复结果就删除备份，双失败时可能同时丢失新旧 dist

- 位置：`update.sh:457-467`、`update.sh:470-487`、`update.sh:220-227`
- 问题：先 `rm -rf web/dist` 再 `mv "$DIST_PREV/dist" web/dist`；若 `mv` 失败，函数仍删 `$DIST_PREV`。`swap_dist` 在 `if !` 上下文抑制 `errexit`，失败不会中止且返回成功。EXIT trap 也会删 `DIST_PREV`。
- 影响：上一版与新 dist 同时消失，站点静态资源 404，直到人工重新部署；违背 AC-019-4 承诺。
- 证据：最小控制流复现：外层判定成功、`live_web_dist_exists=no`、`backup_exists=no`。
- 建议：恢复后断言 `[ -d web/dist ]` 成功才删备份；失败保留 `DIST_PREV` 并打印路径；swap 前用 `stat -c %d` 校验同设备；INT/TERM 先恢复再清理。
- 置信度：高（控制流）/ 中（真实触发概率）。

### [P3] 500/超时等下载错误复用“Actions 尚未完成或资产已被清理”的文案

- 位置：`update.sh:561`
- 建议：按 curl 退出码/HTTP 状态区分 404 与网络/服务端错误。
- 置信度：高（500 夹具复现）。

### [P3] 校验 tar 路径但未拒绝符号链接成员

- 位置：`update.sh:570-575`
- 建议：`tar -tvzf` 检查成员类型，拒绝 `l`/`h`；或解压后校验 `find -type l` 为空。
- 置信度：高。

### [P3] 下载缺少总超时

- 位置：`update.sh:560`、`563`
- 建议：加 `--max-time`（如 120s）或 `--speed-limit/--speed-time`。
- 置信度：高。

### [P3] 资产清理按“10 个资产”可能拆散某个 commit 的 tar/sha 对

- 位置：`.github/workflows/build.yml:88-94`
- 建议：按 `web-dist-<sha>` 前缀成对清理，或保留偶数个资产并校验配对。
- 置信度：中（推断）。

### [P3] 需求卡状态仍写“v2.04 开发中”

- 位置：`docs/archive/20261120/3-GitHubActions构建-需求卡.md:3`
- 建议：G3/G4 后统一回填。

### [P3] `update.sh` 增至 885 行且本轮新增功能，项目规模规则未覆盖 `.sh`

- 建议：后续把 release/local 产物准备拆为独立函数或脚本，并明确 shell 是否纳入规模规则。

## 已检查且未发现问题的区域

- 触发、最小权限、concurrency。
- Node 24 + npm cache + `npm ci` + `npm run verify`；无 `.env`、UTC/C locale 下通过。
- dist-info 字段、tar 根、sha 格式对齐。
- 无 PAT/token 落盘。
- 默认 release、`VESTA_DIST_BASE_URL`、curl 重试、SHA/commit 校验、同目录暂存、原子替换。
- release 路径不执行 build。
- `--skip-build` 语义一致。
- 自更新、flock。
- `distSource` 不改变 health。
- 范围、依赖完整性、用户注释保护。

## 事故复核

- 当前 `npm ls --depth=0` exit 0、无 missing/invalid；`check:deps` 通过；`npm run verify` 全绿 → 依赖已完整恢复。
- `git status` 仅 12 个预期文件；`package-lock.json` 无 diff。
- `data/` mtime 早于评审，未被写入；`zxg/` 无改动。
- 结论：测试夹具安全问题，不是产品缺陷；当前无残留损坏，不影响结论。后续夹具须隔离。

## 范围检查

- 8 个修改文件 + 4 个新增文件，均属 CR-019；`server/src`、`shared/src`、`web/src` diff=0；`package-lock.json` diff=0；`web/dist`/`.env`/`data`/`zxg` 未入库。

## 文档同步检查

- 07、README、development-history、AGENTS、归档索引、STATUS 均同步；§9 回滚命令见 P2-1。
- 需求卡头部状态见 P3-5。

## 用户注释保护

- 0 处修改/删除/重排。

## 残留风险

- 真实 Actions 未运行；真实 systemd 未跑；390px 走查未执行；同文件系统仅为设计假设；资产清理可能拆对；tar 符号链接未拒绝。

## 建议（非阻塞）

- 下载错误分类 + 总超时；恢复成功再删备份 + 同设备校验；统一回滚口径；资产成对清理；需求卡状态回填；`update.sh` 体积后续再拆。

## 下一步交接

- 结论：**有条件通过** → **Meta Agent**（附条件项；P2 修复可由 Meta 分派 Dev/Doc）。

**必须满足的收口条件**

1. push `main` 后真实 Actions 一次跑绿；资产与 `dist-info.commit` 正确。
2. 无 token 环境匿名下载 + SHA + tar 结构校验。
3. 生产/预发真实 systemd 执行 `bash update.sh`，L1–L5、health、首页指纹；确认无 `vite build`。
4. P2-1 回滚口径统一；P2-2 恢复安全加固。
5. 首页与问卷页 390px 走查。

**push 后补验清单**

1. Actions 8 步全绿；Node 24。
2. Release `dist` 资产名含完整 40 位 sha；`dist-info.commit` 等于 push commit；sha 文件格式。
3. 匿名下载 + `sha256sum -c` + `tar -tzf` 三项结构。
4. Prune 日志；≤10 个资产；最近 5 个 commit 的 tar+sha 成对。
5. 生产 `update.sh` 五层；health commit/版本；首页新入口；`distSource`。
6. 失败演练（可选）：Actions 未完成时 L3 404、旧 dist 不变、不重启；`--dist=local` 成功。
7. 390px 走查。

**风险提示**：若仓库实际不是公开仓库，匿名下载会 404；push 后第一步确认。
