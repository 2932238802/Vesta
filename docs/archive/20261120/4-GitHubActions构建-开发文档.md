# 前端改为 GitHub Actions 构建 · 开发文档

> 维护者：Doc Agent ｜ 最近更新：2026-11-21 ｜ 状态：G3 复审有条件通过（P2 闭环；真实 Actions/匿名下载待 push 补验；v2.04 未提交）
> 关联需求卡：`docs/archive/20261120/3-GitHubActions构建-需求卡.md`（CR-019）
> 口径文档：`docs/reference/07-部署与运维.md` §3、§3.1、§9；`AGENTS.md` §3

## CR-019 前端 CI 构建与服务端只拉取（v2.04）

- **G0 结论**：用户选择 **A（Release 产物）**；保留 `--dist=local` 本地构建作为应急回退。
- **产品版本**：v2.04（根 `package.json` `2.3.0 → 2.4.0`）。
- **前提事实**：仓库公开；生产 systemd（`DEPLOY_MODE=systemd`）；Node 24 / Docker 可用；服务器无需 GitHub token。

## 一、需求（R-019）

- **R-019-1** push `main` 后，GitHub Actions 自动构建前端并产出与 commit 一一对应的产物；构建内容包含 `npm run verify`。
- **R-019-2** 产物上传到固定 Release（tag `dist`），资产命名 `web-dist-<完整 sha>.tar.gz` 与同名 `.sha256`；tar 根为 `dist/`，内含 `dist-info.json`（commit / 版本 / 构建时间）。
- **R-019-3** `update.sh` 默认按 HEAD 从 Release 下载产物，校验 SHA256 与 `dist-info.json.commit == HEAD`，解压到临时目录后**原子替换** `web/dist`；默认不再执行 `npm run build`。
- **R-019-4** 下载失败 / 404 / 校验失败 / commit 不匹配时，`update.sh` 在 L3 失败并保留上一版 `web/dist`，不重启服务；错误信息给出“等 Actions 完成”或 `--dist=local` 的可操作提示。
- **R-019-5** `bash update.sh --dist=local` 走本地构建：构建到临时目录、校验后原子替换；任何失败保留上一版 `web/dist`。`--skip-build` 行为保持兼容。
- **R-019-6** L4/L5 口径不变：运行的 commit = HEAD、health 的 commit/appVersion 与 HEAD 一致、首页引用本次产物。
- **R-019-7** 不在服务器保存 GitHub token；不把 `web/dist` 提交到 `main`；workflow 权限最小化（仅 `contents: write` 用于发布 Release）。
- **R-019-8** 文档同步：部署文档 §3.1、AGENTS 验证表、版本表与开发历史。
- **R-019-9** 可测试性：`update.sh` 支持 `VESTA_DIST_BASE_URL` 覆盖下载地址，便于用本地 HTTP 夹具验证成功/404/校验失败三条路径。

## 二、验收标准（AC-019）

| 编号 | 验收标准 | 验证方式 |
| --- | --- | --- |
| AC-019-1 | push `main` 触发 workflow；`npm run verify` 通过；上传 `web-dist-<sha>.tar.gz` + `.sha256` 到 Release `dist`；`dist-info.json.commit` 等于触发 commit | Actions 运行记录 + 下载资产检查 |
| AC-019-2 | 资产可匿名下载；SHA256 匹配；tar 含 `dist/index.html`、`dist/assets/*.js`、`dist/dist-info.json` | `curl` + `sha256sum -c` + `tar -tzf` |
| AC-019-3 | 默认 `update.sh` 下载 HEAD 资产、校验、原子替换；**不执行 `npm run build`**；L4/L5 通过，health commit = HEAD | 隔离环境 + 本地夹具 server |
| AC-019-4 | 404 / HTTP 失败 / 校验和不匹配 / dist-info commit 不匹配：退出非 0、不重启、旧 `web/dist` 内容和 mtime 不变 | 本地夹具四类失败用例 |
| AC-019-5 | `--dist=local` 构建到临时目录并原子替换；构建失败时旧 dist 不变；产物与当前构建等价 | 本地构建 + `diff` 首页指纹 |
| AC-019-6 | `--skip-build` 兼容：dist 不旧于源码时沿用，否则失败；行为与 v2.03 一致 | 用例 + 帮助文本 |
| AC-019-7 | 服务器无 GitHub token；`git diff main` 无 `web/dist`；workflow `permissions` 仅 `contents: write`；无新增依赖 | 代码审阅 + `git status` |
| AC-019-8 | `bash -n update.sh` 通过；`npm run verify` 全绿；文档与版本三处同步 v2.04 | 命令输出 |
| AC-019-9 | `VESTA_DIST_BASE_URL` 夹具可复现成功与三类失败；不触碰真实 Release | 本地 HTTP server + 断言 |

## 三、任务（T-065 ~ T-068）

| 任务 | 内容 | 文件 | 依赖 |
| --- | --- | --- | --- |
| T-065 CI workflow | 新增 `.github/workflows/build.yml`：checkout、Node 24、`npm ci`、`npm run verify`、打包 dist + dist-info + SHA256、确保 Release `dist`、上传资产、清理超过 10 个的旧资产 | `.github/workflows/build.yml`（新） | 无 |
| T-066 update.sh 产物模式 | 新增 `--dist=release|local`（默认 release，G1 确认不实现 auto）与 `VESTA_DIST_BASE_URL`；release 下载/校验/解压/原子替换；local 构建到临时目录再替换；失败保留旧 dist；`--skip-build` 兼容；更新 help 与失败提示 | `update.sh` | T-065（资产格式） |
| T-067 文档与版本 | 部署文档 §3/§3.1/§9、AGENTS 验证表、`docs/reference/README.md`、`development-history.md`、归档索引；版本 v2.04 | 文档 + `package.json` | T-066 |
| T-068 验证 | `bash -n update.sh`、`npm run verify`、本地夹具覆盖成功/404/校验失败/commit 不匹配、`--dist=local` 等价性、`--skip-build`；真实 Actions 至少跑通一次（push 后） | — | T-065、T-066、T-067 |

## 四、影响分析与回归面

| 影响面 | 说明 | 回归 |
| --- | --- | --- |
| 部署流程 | 默认不再服务器构建；L3 改为下载/校验/原子替换 | 隔离环境模拟 release/local/skip 三条路径 |
| 运行时 | Node 服务、systemd、端口、健康检查不变 | health + 首页 + 问卷页 390px |
| 仓库 | 新增 workflow；不提交 dist；无依赖变化 | `git status` / `check:deps` |
| 失败恢复 | 任何 L3 失败保留旧 dist、不重启 | 四类失败用例 |
| 版本 | v2.04，三处同步 | `check:version` |

## 五、风险与对策

- **Actions 尚未产出**：用户 push 后立刻部署会 404。对策：错误信息明确提示等待或 `--dist=local`；不自动回退本地构建（避免悄悄消耗服务器资源）。
- **资产被清理**：Release 按 commit 成对保留最近 5 组（tar + sha 共 10 个文件）；回滚到更旧 commit 时用 `--dist=local`。文档写明。
- **下载源不可达**：curl 重试 + 超时；失败保留旧 dist。支持 `VESTA_DIST_BASE_URL` 便于镜像/内网代理。
- **原子替换的窗口**：先 `mv web/dist web/dist.prev-<ts>` 再 `mv next/dist web/dist`；两步之间极短；进程读取不到时会短暂 404，但文件就绪后立即恢复。可在失败时还原 `.prev`。
- **本地构建路径的旧问题**：本次同时改为“构建到临时目录再替换”，中断不会清空线上 dist。
- **workflow 权限**：仅 `contents: write`；不使用 PAT；Release 资产为公开仓库的公开资产。
- **`npm run verify` 在 Runner 上耗时**：可接受；缓存 npm。

## 六、不在范围内

- 自动部署（push 后服务器自动更新）——仍由人工执行 `bash update.sh`。
- 容器化 / ghcr 镜像（Theseus 同款）——如需要另立 CR。
- 修改问卷、报告、咨询等业务代码。
- 提交 `web/dist` 到主分支。

## 七、追溯矩阵

| 需求 | AC | 任务 |
| --- | --- | --- |
| R-019-1/2 CI 产出与资产 | AC-019-1、AC-019-2 | T-065 |
| R-019-3 默认拉取 | AC-019-3 | T-066 |
| R-019-4 失败保留旧版 | AC-019-4 | T-066、T-068 |
| R-019-5 本地回退 | AC-019-5、AC-019-6 | T-066、T-068 |
| R-019-6 验收口径 | AC-019-3 | T-066 |
| R-019-7 安全 | AC-019-7 | T-065、T-066 |
| R-019-8 文档 | AC-019-8 | T-067 |
| R-019-9 可测试性 | AC-019-9 | T-066、T-068 |

## 八、G1 待确认

1. Release 用固定 tag `dist`，资产按完整 SHA 命名，只保留最近 10 个；可以吗？
2. 默认 `release`，`--dist=local` 应急，`--skip-build` 保留；可以吗？
3. workflow 跑完整 `npm run verify`（推荐）还是只跑 `typecheck + build`？
4. 部署仍然人工执行 `bash update.sh`（push 不自动上线）；确认吗？
5. 版本 v2.04（`2.4.0`）；可以吗？

## 决策记录

| 日期 | 决策 | 结论 |
| --- | --- | --- |
| 2026-11-20 | G0 交付方式 | A：Release 产物 |
| 2026-11-20 | 应急回退 | 保留 `--dist=local` |
| 2026-11-20 | G1 确认 | 固定 tag `dist`、保留 10 个资产；默认 release；跑完整 `npm run verify`；人工部署；v2.04。不实现 `--dist=auto` |

## 实施记录（2026-11-20，G2）

- 新增 `.github/workflows/build.yml`；`update.sh` 新增 `--dist=release|local`、`VESTA_DIST_BASE_URL`、原子替换与失败保留旧 dist；`data/deploy-info.json` 增加 `distSource`。
- 文档与版本：`docs/reference/07-部署与运维.md` §3 / §3.1 / §9、`docs/reference/README.md`、`docs/reference/development-history.md`、归档索引、根 `package.json` → `2.4.0`。
- 验证：`bash -n update.sh`、PyYAML workflow 解析、`npm run verify`；隔离仓库 + 本地 HTTP 夹具覆盖 release 成功 / 404 / SHA 不匹配 / commit 不匹配 / local 成功 / local 构建失败 / `--skip-build` 通过 / `--skip-build` 拒绝。真实 Actions 未在 Runner 验证（需 push 后触发）。
- 状态：G2 自检完成，待 G3。工作区未提交。

## 实施记录（2026-11-20，G3 返工）

- **P2-1 回滚口径**：`update.sh` 恢复提示与 `docs/reference/07-部署与运维.md` §9 统一为“远端 `git revert` 并 push 后 `bash update.sh`”，并明确警告不要在服务器只做本地 `git reset --hard`（L1 会 fast-forward 回 origin/main）。
- **P2-2 恢复路径**：`restore_prev_dist` 恢复后断言 `web/dist/index.html` 可读，成功才删备份；失败保留备份并在错误信息打印路径。`swap_dist` 前置 `stat -c %d` 同设备校验；失败按“已恢复 / 恢复失败保留备份 / 无上一版”区分返回码；`DIST_PREV_KEEP` 让 EXIT trap 不再误删备份；INT/TERM 先恢复再清理。
- **P3**：下载错误区分 404（资产不存在）与网络/5xx（可重试）；curl 增加 `--max-time 120`；解压前用 `tar -tvzf` 拒绝符号链接/硬链接成员；workflow 按 `web-dist-<sha>` 分组，成对保留最近 5 组。
- **验证**：`bash -n update.sh`、`npm run verify`；隔离夹具复跑 release 成功 / 404 / 5xx / SHA 失败 / commit 不匹配 / 不安全与链接 tar / local 成功与失败 / skip 两态，并新增“替换失败且恢复失败”用例，确认备份保留、错误含备份路径、不会同时丢失新旧 dist。

## 实施记录（2026-11-21，真实 Actions 首跑修复）

- 真实 run `44859478220` 第 9 步 `Prune old assets` 失败（前 8 步含构建与 Release 上传成功）。原实现把 `gh api --paginate --slurp` 直接接 `--jq 'add | …'`，对 `--slurp` 的单页/多页数组形态做了 `add` 假设；**推断**首次只有 1 组资产时 jq 报错退出——公开 check-run 注解仅显示 `exit code 1`，原始日志不可得，根因未证实。修复同时兼容两种 `--slurp` 形态。
- 修复：Prune 不再使用 `--jq` + `--slurp` 组合。`gh api … --paginate --slurp > /tmp/release-assets.json` 后由 runner 自带 Node 24 读取，兼容 `[[asset,...]]` 与 `[asset,...]` 两种形态；展平后按 `^(.*)\.tar\.gz(\.sha256)?$` 分组，组内 tar+sha 成对，按组内最新 `created_at` 倒序只保留最近 5 组，输出 `id\tname\tcreated_at` 供 bash `while read` 逐个 DELETE。无资产或组数 ≤5 时正常退出 0。
- 验证：用 Python 从 workflow 提取真实 `run` 脚本，`gh` shim + 本地夹具覆盖单页/多页、1/5/6/7 组、乱序、扁平形态、空输出、无关资产与残缺成对；`bash -n`、PyYAML 解析、`npm run verify` 全绿。真实 Actions 需 push 后复验。

