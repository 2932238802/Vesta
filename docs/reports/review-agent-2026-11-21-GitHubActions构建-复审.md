# Review Agent 复审报告 · CR-019 前端 CI 构建（G3 返工）

> 角色：Review Agent ｜ 门禁：G3 复审 ｜ 日期：2026-11-21 ｜ 结论：**有条件通过**
> 范围：CR-019 / T-065 ~ T-068 G3 返工（v2.04；工作区未提交，基线 HEAD `03ddf61`）
> 由 Doc Agent 落盘；正文由 Review Agent 提供，未改动结论与证据。

<!-- report-meta
role: review
gate: G3
cr: CR-019
task: T-065 ~ T-068（G3 返工复审）
status: 有条件通过
action: P2-1 与 P2-2 经独立复现闭环，5 项 P3 闭环、1 项按范围不处理；新增 2 项 P3（恢复失败提示与“无需回滚”提示文案不准确）；真实 Actions/匿名下载仍待 push 后验证
commit: -
-->

- 工作日志：待生成
- 范围：CR-019 / T-065 ~ T-068；工作区未提交，基线 `03ddf61`；8 个已跟踪修改 + 6 个未跟踪（`.github/workflows/build.yml`、1 份需求卡、1 份开发文档、3 份报告）
- 评审类型：变更复审（G3 返工）
- 来源 CR：CR-019（G0 / G1 已确认，方案 A）
- G1 / DoR：通过（固定 tag `dist`、默认 release、完整 verify、人工部署、v2.04、不实现 auto）
- 结论：**有条件通过**
- 一句话理由：上一轮 2 项 P2 均经独立夹具复现闭环，5 项 P3 闭环；未发现 P0/P1/P2，新增 2 项 P3 为恢复提示文案不准确；AC-019-1/2 的真实 Actions 与匿名下载仍无法在本机验证，须 push 后补验。

## 评审基线

- 范围边界：本轮只审 G3 返工 diff（`update.sh`、`.github/workflows/build.yml`、部署文档/版本/状态文档）。业务代码、依赖、`web/dist`、`data/` 零 diff。
- 关联需求：R-019-1 ~ R-019-9；AC-019-1 ~ AC-019-9（无变更）。
- 影响面与回归范围：部署流程 L1–L5、失败恢复与备份生命周期、下载错误分类、tar 安全、Release 资产清理、回滚口径、文档与版本。
- 必须满足的契约：资产命名 `web-dist-<完整 sha>.tar.gz` + `.sha256`；tar 根 `dist/`；`dist-info.json.commit == HEAD`；L1~L5 口径不变；`/api/health` 字段不变；固定 tag `dist`；仓库不存 token。
- 明确不在范围：自动部署、业务功能、依赖升级、提交 `web/dist`、`update.sh` 拆分（用户本轮明确不做）。

## 上一轮缺陷逐条闭环判定

| 上一轮 | 位置 | 判定 | 本轮证据 |
|---|---|---|---|
| P2-1 回滚口径与 L1 冲突 | `update.sh:169-181`、`07-部署与运维.md:202`、`:217` | **闭环** | 脚本与文档统一为“远端 `git revert --no-commit <旧>..HEAD → commit → push origin main`，再到服务器 `bash update.sh`”，并显式警告本地 `git reset --hard` 会被 L1 快进覆盖；原 `reset` 命令无残留。注入失败用例复现提示正确。 |
| P2-2 恢复失败可能同时丢新旧 dist | `update.sh:492-508`、`:513-552`、`:227-239`、`:274-293` | **闭环**（主路径） | 四类复现：替换失败/恢复成功 → 旧 dist 还原、备份清理；替换与恢复双失败 → 备份保留且 sha256 等于旧版、路径打印、`web/dist` 无半成品；设备号不一致 → 提前失败；SIGTERM → 退出 143、先恢复再清理。`if ! swap_dist` 改为返回码分支。 |
| P3-1 500/超时复用 404 文案 | `update.sh:580-602` | **闭环** | 404 / 500 / 网络错误（curl 7）分别命中不同文案。 |
| P3-2 下载缺总超时 | `update.sh:583` | **闭环** | `--max-time 120` 已加，保留 connect-timeout/retry。 |
| P3-3 未拒绝 tar 符号/硬链接 | `update.sh:661-674` | **闭环** | `tar -tvzf` 首列 `l`/`h` 拒绝；独立构造两类 tar 均 exit 1 且旧 dist 不变。 |
| P3-4 资产清理可能拆散 tar+sha | `.github/workflows/build.yml:81-105` | **闭环（静态）**；真实 API 待补验 | 按前缀分组，保留最近 5 组，同组同删同留；jq 表达式与方向复核正确。 |
| P3-5 需求卡状态过期 | `3-…需求卡.md:3` | **闭环** | 已回填返工状态。 |
| P3-6 `update.sh` 体积/拆分 | `update.sh`（990 行） | **按范围不处理** | 用户明确不拆分；`check:size` 不覆盖 `.sh`。 |

## AC 判定

| AC | 判定 | 证据 |
|---|---|---|
| AC-019-1 push 触发、verify、上传资产、`dist-info.commit` | **未验证（静态满足）** | PyYAML 解析通过；8 步；Node 24 + npm cache + `npm ci` + `npm run verify`；`COMMIT_SHA=${{ github.sha }}`；`contents: write`。真实 Runner 未运行。 |
| AC-019-2 匿名下载、SHA 匹配、tar 结构 | **部分** | 同构产物 tar 根与文件齐全，`sha256sum -c` 通过；未做无 token 的真实 Release 下载。 |
| AC-019-3 默认下载、校验、原子替换、不 build、L4/L5 | **满足** | 隔离夹具 release 全链路 exit 0；无 `run build`；`distSource` 正确；health/首页通过。 |
| AC-019-4 404/HTTP 失败/SHA/commit 不匹配 | **满足** | 四类均 exit 1；旧 dist sha256/mtime 不变；无残留；另测 unsafe/symlink/hardlink tar。 |
| AC-019-5 `--dist=local` | **满足** | 成功：临时目录构建、`source=local`；失败：旧 dist 不变。 |
| AC-019-6 `--skip-build` | **满足** | 通过/源码更新拒绝均正确。 |
| AC-019-7 无 token、无 dist 入库、最小权限、无新依赖 | **满足（静态）** | 检查通过。 |
| AC-019-8 `bash -n`、`verify`、文档/版本同步 | **满足** | `bash -n` OK；`verify` EXIT=0；2.4.0 ↔ v2.04。 |
| AC-019-9 夹具复现 | **满足** | 全部经本地 HTTP 夹具，未访问真实 Release。 |

## 验证执行

- `bash -n update.sh` → exit 0。
- `npm run verify` → **EXIT=0**；`check:version` 2.4.0 ↔ v2.04；`check:deps` 通过；`check:question` 162 passed。
- PyYAML：触发、8 步、`contents: write`、concurrency 通过。
- 夹具环境：`/tmp` 独立仓库 + 本地 origin + 复制 node_modules + HTTP/health/systemd shim；结束清理。

### 夹具矩阵

| 用例 | 结果 |
|---|---|
| release 成功（L1–L5） | exit 0，无 build，`distSource=release:…` |
| 404 / 500 / 网络错误 | exit 1，文案分离 |
| SHA 失败 / commit 不匹配 | exit 1，旧 dist 不变 |
| 不安全/符号链接/硬链接 tar | exit 1，旧 dist 不变 |
| local 成功 / 失败 | 成功上线 / 旧 dist 不变 |
| skip 通过 / 源码更新 | 通过 / 拒绝 |
| `--dist=auto` / 缺值 | exit 2 |
| 替换失败、恢复成功 | exit 1，旧 dist 还原 |
| 替换与恢复双失败 | exit 1，备份保留、路径打印 |
| 设备号不一致 | exit 1，提前失败 |
| SIGTERM 窗口 | exit 143，先恢复再清理 |

### 无法执行的验证

- 真实 GitHub Actions Runner、真实 Release 匿名下载、生产 systemd：AC-019-1/2 与生产 L4/L5 保持“未验证”。
- 真实 `gh api` 的 `--paginate --slurp --jq` 未执行（本机无 gh/jq）；jq 表达式静态复核通过。
- 120 秒总超时仅静态确认。

## 影响面覆盖

| 维度 | 覆盖 | 证据 / 缺口 |
|---|---|---|
| 模块 / 接口 | 是 | 业务代码零 diff；health 字段不变，仅 `deploy-info.json` 增 `distSource` |
| 数据 / 配置 | 是 | 无迁移；夹具未写仓库 `data/` |
| 测试 / 回归 | 是 | 全路径 + 失败/中断；`verify` 全绿 |
| 文档 | 是 | 部署文档/README/history/索引/STATUS/需求卡同步；版本三处一致 |
| 兼容 / 回滚 | 部分 | 回滚口径统一；真实资产清理/匿名下载待补验 |
| 仓库 / 权限 | 是 | 无业务代码/依赖/dist/.env/data 入库；仅 `contents: write` |

## NFR 检查

| 项 | 结果 |
|---|---|
| 服务器无 token | 通过 |
| 产物绑定 commit + SHA256 | 通过（夹具） |
| tar 解压边界 | 通过（unsafe/symlink/hardlink） |
| L1~L5 口径 | 通过（shim） |
| 失败保留旧 dist | 通过；双失败旧版保留在备份目录 |
| 服务器不再默认构建 | 通过 |
| 可观测性 | `distSource`；两处提示文案不准确（P3） |
| 下载有界 | `--max-time 120` + retry |

## 新发现问题

### [P3] 恢复双失败时错误信息声称“新产物仍在暂存目录中”，但 EXIT trap 已删除该目录

- 位置：`update.sh:688`（文案）、`:227-239`（清理）
- 影响：运维按提示找新产物会扑空；旧版恢复本身正确完整。
- 证据：双失败后 `next_left=0`，日志仍打印“新产物仍在本次暂存目录中”；旧备份 sha256 与旧版一致。
- 建议：rc=3 时保留 `DIST_TMP` 并打印路径，或删掉该句只保留旧产物路径。

### [P3] “本次未拉取新提交”分支后仍无条件打印“然后在服务器执行 update.sh”

- 位置：`update.sh:169-179`
- 影响：提示可读性下降；无数据/部署风险。
- 证据：local 构建失败夹具命中该矛盾文案。
- 建议：把“然后……”移入需要回滚的分支，或改为“修复后直接重试”。

## 已检查且未发现问题的区域

- 回滚口径全仓检索无残留可执行 reset 指引；恢复成功才删备份；设备校验在动 dist 前；INT/TERM 先恢复再清理。
- 404/5xx/网络/其他四类文案分离；`.sha256` 失败单独提示。
- tar 路径/链接三态拒绝；解压发生在校验之后。
- release 无 build；local 临时目录；skip 语义一致；`--dist=auto` 拒绝。
- workflow 触发/权限/Node/cache/verify/资产命名/Release/上传/成对清理。
- `dist-info` commit 大小写不敏感；health 版本匹配未变。
- 依赖完整性、无新依赖、无 dist/data/token 入库。
- 用户注释 0 处修改。

## 文档同步检查

- 07 §3/§3.1/§9/§10、README、history、归档索引、STATUS、需求卡、开发文档、AGENTS 均同步；版本三处一致。

## 范围与事故复核

- 范围：8 改 + 6 新，均属 CR-019；业务代码零 diff；无 dist/.env/data/zxg 入库。
- 事故复核：真实仓库 `verify` EXIT=0、`check:deps` 通过，node_modules 完整；本轮夹具复制 node_modules（未软链），未写仓库 data，结束后清理。无残留损坏。

## 残留风险

- 真实 Actions 未运行；匿名下载未验证；Prune 真实行为未执行；生产 systemd L4/L5 与 390px 未执行；120s 超时未实测；首次部署脚本自更新 re-exec 需真实验证；tar 未拒绝设备节点/FIFO（低风险）。

## 建议（非阻塞）

- 修正两处提示文案（P3）。
- push 后按清单补验并保留 Prune 日志。
- 后续可拆 release/local 产物准备（用户本轮明确不拆，仅登记）。

## 下一步交接

- 结论：**有条件通过** → **Meta Agent**（附 push 后补验清单；新增 2 项 P3 可由 Meta 分派，不阻塞提交）。

**必须满足的收口条件**

1. push `main` 后真实 Actions 一次跑绿，资产与 `dist-info.commit` 正确。
2. 无 token 环境匿名下载 + SHA + tar 结构校验。
3. 生产/预发真实 systemd 执行 `bash update.sh`，L1–L5、health、首页指纹正常；确认无 `vite build`。
4. 首页与问卷页 390px 走查。

**push 后补验清单**

1. Actions 8 步全绿，Node 24；verify 通过。
2. Release `dist` 资产名含完整 40 位 sha；`dist-info.commit` 等于触发 commit；`.sha256` 格式正确。
3. 匿名下载 + `sha256sum -c` + `tar -tzf` 三项结构。
4. Prune 日志：保留最近 5 组 / 10 个文件，tar+sha 成对。
5. 生产 `update.sh`：L1–L5、health commit/版本、首页新入口、`distSource`；无 `vite build`；首次部署脚本自更新 re-exec 正常。
6. 失败演练（可选）：Actions 未完成时 L3 404、旧 dist 不变、不重启；`--dist=local` 成功。
7. 390px 走查。
8. 回滚：远端 `git revert` + push，再 `bash update.sh`；不要只在服务器本地 reset。
