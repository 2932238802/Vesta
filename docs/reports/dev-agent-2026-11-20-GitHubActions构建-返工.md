## Dev Agent 开发报告（G3 返工）

<!-- report-meta
role: dev
gate: G2
cr: CR-019
task: T-065 ~ T-068（G3 返工）
status: 返工完成，待 G3 复审
action: 闭环 P2-1/P2-2 与 6 项 P3；脚本恢复路径加固、回滚口径统一、下载错误分类、tar 链接与资产生成清理
commit: -
auth_level: -
auth_action: -
auth_evidence: -
auth_scope: -
auth_expires: 随 CR 结束
auth_key: -
-->

- 工作日志：待生成
- 任务：CR-019 / T-065 ~ T-068 G3 返工（v2.04）
- 结论：返工完成，待 G3 复审（未提交、未 push）
- 来源：`docs/reports/review-agent-2026-11-20-GitHubActions构建.md`（有条件通过；2 P2 / 6 P3）
- 门禁：G1 已确认；本次为 G3 返工，自检完成
- DoR 核对：通过（沿用 G2；返工项来自 G3 报告，范围由用户指定）
- 关联 AC：AC-019-1 ~ AC-019-9（无 AC 变更）

### G3 缺陷逐条对应

| G3 编号 | 位置（G3） | 处理 | 证据 |
| --- | --- | --- | --- |
| P2-1 回滚口径冲突 | `update.sh:169/171`、`07-部署与运维.md:202` | **已闭环**：脚本提示与文档统一为“远端 `git revert --no-commit <旧>..HEAD → commit → push origin main`，再在服务器 `bash update.sh`”；新增显式警告“不要只在服务器本地 `git reset --hard`，L1 会 fast-forward 回 origin/main”。另处理“本次未拉取新提交”时提示无需回滚。 | `update.sh:171-179`；`docs/reference/07-部署与运维.md:202`、`:217`（演练口径同步）；夹具各失败用例输出中的恢复提示均为新口径 |
| P2-2 恢复路径可能同时丢失新旧 dist | `update.sh:457-487`、`:220-227` | **已闭环**：① `restore_prev_dist` 恢复后断言 `web/dist` 存在且 `index.html` 可读，成功才删备份；失败返回非 0 并保留备份。② `swap_dist` 前置 `stat -c %d` 校验暂存目录与 `web/` 同设备，不同则提前失败且不动 `web/dist`。③ 失败按返回码区分：`1` 前置/备份失败、`2` 已恢复、`3` 恢复失败保留备份、`4` 无上一版。④ `DIST_PREV_KEEP` 让 EXIT trap 不再无条件删除备份。⑤ INT/TERM 先恢复再清理。⑥ 调用方改为 `swap_dist ... || SWAP_RC=$?` + `case`，不再依赖 `if !` 吞掉函数内失败。 | 见下方“恢复失败用例”；`update.sh:229-236`、`:274-291`、`:492-553`、`:700-709` |
| P3-1 500/超时复用 404 文案 | `update.sh:561` | **已处理**：新增 `download_dist_asset`，按 HTTP 状态与 curl 退出码区分：404=资产不存在（Actions 未完成/已清理）、5xx=服务端临时错误可重试、网络错误=检查网络后重试、其他=检查 `VESTA_DIST_BASE_URL`；`.sha256` 下载失败单独提示“产物可能上传不完整”。 | `update.sh:579-601`；夹具 404 / 500 断言 |
| P3-2 缺总超时 | `update.sh:560/563` | **已处理**：curl 增加 `--max-time 120`（保留 `--retry 3 --connect-timeout 10 --retry-delay 2`）。 | `update.sh:583` |
| P3-3 未拒绝 tar 符号/硬链接 | `update.sh:570-575` | **已处理**：解压前 `tar -tvzf` 检查成员类型，首列为 `l`/`h` 时拒绝；列表读取失败按产物损坏失败。 | `update.sh:663-672`；夹具 symlink / hardlink 两态 |
| P3-4 资产清理可能拆对 | `.github/workflows/build.yml:88-94` | **已处理**：按 `name` 去掉 `.tar.gz` / `.tar.gz.sha256` 后缀分组，组内取最新 `created_at`，只保留最近 5 组（10 个资产），组内 tar+sha 同删同留。 | `.github/workflows/build.yml:86-101` |
| P3-5 需求卡状态过期 | `3-GitHubActions构建-需求卡.md:3` | **已处理**：改为“G3 返工中（P2-1/P2-2 与 P3 已修，待复审；v2.04 未提交）”。 | 同文件第 3 行 |
| P3-6 `update.sh` 规模与拆分建议 | `update.sh` | **按用户范围不做拆分**（本轮明确“不拆分 `update.sh`”）。脚本现 988 行；规模脚本不覆盖 `.sh`。 | 本报告“未完成 / 风险” |

### 变更清单

| 文件 | 改了什么 | 关联 |
| --- | --- | --- |
| `update.sh` | P2-1 回滚提示；P2-2 恢复断言/同设备校验/返回码/KEEP/信号处理；P3 下载分类、`--max-time`、tar 链接拒绝 | P2-1、P2-2、P3-1/2/3 |
| `.github/workflows/build.yml` | Prune 改为按 commit 成对保留最近 5 组；Release 说明同步 | P3-4 |
| `docs/reference/07-部署与运维.md` | §3.1 资产成对保留口径；§9 回滚命令与警告；§10 演练口径 | P2-1、P3-4 |
| `docs/reference/README.md` | v2.04 版本记录同步资产与恢复语义 | P3-4、P2-2 |
| `docs/reference/development-history.md` | v2.04 状态与回滚更新；新增“G3 返工”小节 | P2/P3 |
| `docs/archive/20261120/3-GitHubActions构建-需求卡.md` | 头部状态回填 | P3-5 |
| `docs/archive/20261120/4-GitHubActions构建-开发文档.md` | 资产风险措辞；新增 G3 返工实施记录 | P2/P3 |
| `docs/archive/20261120/README.md` | 索引状态改为返工中/待复审 | — |
| `docs/STATUS.md` | 当前门禁、下一步、角色记录 | — |

### P2-1 证据

- 脚本提示（`update.sh:171-179`）现在输出：
  - `git revert --no-commit <OLD_HEAD>..HEAD && git commit -m "回滚到 <OLD_HEAD>" && git push origin main`
  - `然后在服务器执行 bash update.sh（L1 会 fast-forward 到刚推送的回滚提交）`
  - `注意：不要在服务器只做本地 git reset --hard；L1 的 git pull --ff-only 会重新快进回 origin/main……`
- 文档 `07-部署与运维.md:202` 与脚本完全同口径；`:217` 的回滚演练改为 `git revert` + push + `update.sh`。
- 与 G3 复现方向一致：不再提供会被 L1 覆盖的本地 `reset` 命令。

### P2-2 与新增恢复失败用例证据

夹具在 `/tmp` 独立副本中运行（`node_modules` 复制，未软链），通过 PATH shim 注入 `mv` 失败；关键结果：

- `restore-success`（第二步 `mv next web/dist` 失败，恢复 `mv` 成功）：
  - exit 1；输出含“原子替换 … 已恢复上一版”；`web/dist/index.html` sha256 与旧版一致；`.dist-prev.*` 已清理。
- `restore-fail`（第二步 `mv` 与恢复 `mv` 均失败）：
  - exit 1；输出含“恢复上一版失败”；错误信息含真实备份路径；备份目录存在且 `dist/index.html` 可读、sha256 等于旧版；`web/dist` 不存在（未上线半成品）；EXIT trap 打印“保留上一版 web/dist 备份”。
  - 实测错误行：
    `× [L3 构建] 原子替换 web/dist 失败且恢复上一版失败；旧产物保留在 /tmp/cr019-rework.2JBuLW/repo/data/.dist-prev.hlxnmT，请手动恢复。新产物仍在本次暂存目录中`
  - 断言“不会同时丢失新旧 dist”：旧产物完整保留在备份目录；新产物失败时仍在暂存目录（错误信息说明），不会出现“旧备份被删且线上为空且无新产物位置”的组合。
- `device-mismatch`（`stat` shim 返回不同设备号）：exit 1，输出“不在同一文件系统”，旧 dist 内容不变，未创建备份目录。
- `term-restore`（在替换窗口发送 SIGTERM）：exit 143，输出“收到 TERM”“已恢复上一版”，旧 dist 内容恢复，备份清理。

### 验证执行

| 命令 / 用例 | 结果 | 证据 |
| --- | --- | --- |
| `bash -n update.sh` | 通过 | `bash -n OK` |
| `npm run verify` | 通过 | `VERIFY_EXIT=0`；check:docs / size / version / deps / dates / question(162) / score / audit / roster / search / typecheck / build 全过 |
| `npm run check:version` | 通过 | `package.json=2.4.0 ↔ docs/reference/README.md 最高 v2.04` |
| workflow YAML 解析 | 通过 | `yaml OK`；triggers `push(main)` + `workflow_dispatch`；`permissions={'contents':'write'}`；steps=8 |
| Prune 分组逻辑 | 通过（等价逻辑） | 本机无 `gh`/`jq`，未执行真实 API；用 Node 等价规则验证 6 个 commit（12 资产）→ 保留 5 组，保持 tar+sha 成对。jq 表达式经静态审阅（`sub`/`group_by`/`max`/`sort_by`） |
| 隔离夹具 | **ALL-PASS（16 组）** | 见下表 |

夹具矩阵（每项均断言旧 dist 内容/mtime 或新入口，失败项另断言不 build）：

| 用例 | 结果 |
| --- | --- |
| release 成功（L1–L5） | exit 0；新入口上线；`distSource=release:<asset>`；未执行 build；暂存/备份目录清理 |
| 404 | exit 1；“HTTP 404，资产不存在”；旧 dist 不变；未 build |
| 500 | exit 1；“HTTP 500 … 可稍后重试”；旧 dist 不变 |
| SHA256 不匹配 | exit 1；“SHA256 校验失败”；旧 dist 不变 |
| dist-info commit 不匹配 | exit 1；“不一致”；旧 dist 不变 |
| 不安全路径 tar | exit 1；“不安全路径”；旧 dist 不变；未在暂存目录外落文件 |
| 符号链接 tar | exit 1；“符号链接或硬链接”；旧 dist 不变 |
| 硬链接 tar | exit 1；“符号链接或硬链接”；旧 dist 不变 |
| local 成功 | exit 0；`dist-info.source=local`；执行 `--workspace web run build`；新入口上线 |
| local 失败 | exit 1；“本地构建失败”；旧 dist 不变 |
| skip 通过 | exit 0；“已跳过下载与构建”；`distSource=existing` |
| skip 源码更新 | exit 1；“比 web/dist 新” |
| 替换失败、恢复成功 | exit 1；“已恢复上一版”；旧 dist 还原；备份清理 |
| 替换失败、恢复失败（新增） | exit 1；备份保留且可读；错误含备份路径；`web/dist` 不在 |
| 暂存目录不同设备 | exit 1；“不在同一文件系统”；旧 dist 不变 |
| SIGTERM 中断 | exit 143；先恢复上一版再清理 |

### 回归与影响面

| 区域 | 验证 | 结果 |
| --- | --- | --- |
| `update.sh` L1/L2/L3/L4/L5 | 独立仓库 + 本地 HTTP + systemd/health shim 全链路 | 通过 |
| 失败路径 | 404 / 5xx / SHA / commit / unsafe / symlink / hardlink / local fail / skip stale / restore 双失败 / 设备不符 | 通过 |
| 业务代码 / 接口 / 数据 | 本轮未改 `server/`、`shared/`、`web/src/`；`npm run verify` 全量通过 | 无回归 |
| 文档 / 版本 | `check:docs`、`check:version` | 通过 |
| 真实仓库 `data/` | 夹具只在 `/tmp` 运行；未写仓库 `data/` | 未触碰 |
| `web/dist` / `.env` / `node_modules` | 未提交；`git status` 无新增产物 | 通过 |

### 发布 / 回滚

- 开关：无
- 迁移：无（`data/deploy-info.json` 字段不变；仅本地运维信息）
- 发布：仍为人工 —— push `main` → Actions 产出资产 → 服务器 `bash update.sh`
- 回滚：在可 push 的仓库 `git revert --no-commit <旧>..HEAD && git commit && git push origin main`，再在服务器 `bash update.sh`；**不要只在服务器本地 `reset`**。目标 commit 资产被清理时改用 `--dist=local`
- 脚本失败时：恢复失败会保留 `data/.dist-prev.*` 并打印路径；成功恢复或正常完成后自动清理
- 可观测性：L3 失败区分 404/5xx/网络/其他；`distSource` 不变

### 文档更新

| 文件 | 更新 |
| --- | --- |
| `docs/reference/07-部署与运维.md` | §3.1 成对保留 5 组；§9 回滚命令与警告；§10 演练 |
| `docs/reference/README.md` | v2.04 版本记录 |
| `docs/reference/development-history.md` | v2.04 状态/回滚 + G3 返工小节 |
| `docs/archive/20261120/3-…需求卡.md` | 头部状态 |
| `docs/archive/20261120/4-…开发文档.md` | 资产风险 + G3 返工记录 |
| `docs/archive/20261120/README.md` | 索引状态 |
| `docs/STATUS.md` | 门禁、下一步、角色记录 |

### 偏差与假设

- [偏差] G3 P3-6 建议拆分 `update.sh`；按用户本轮范围“不做 `update.sh` 拆分”未处理，仅保持结构清晰，记为后续项。
- [环境限制] 本机无 `gh` / `jq`：workflow 的真实 Prune API 与 jq 表达式未在本地执行；已做 YAML 解析与等价分组逻辑验证。真实 Actions 仍需 push 后补验（G3 收口条件 1/2）。
- [实现细节] 夹具用 PATH shim 模拟 `mv` 失败、设备号不一致、构建成功/失败与 systemd/health；`node_modules` 全程复制，未软链真实仓库。
- [实现细节] `update.sh` 的 `--max-time 120` 是单次请求总超时；`--retry 3` 仍在 4xx/5xx 的 curl 语义范围内按 curl 默认策略执行。
- [实现细节] INT/TERM trap 在子命令结束后才执行（bash 语义）；替换窗口内收到信号会先恢复旧 dist 再退出。

### 未完成 / 风险 / 需要决策

- 真实 GitHub Actions、匿名下载、生产 systemd 仍未验证（G3 收口条件，需 push 后执行）。
- Release 资产 Prune 的 jq 表达式未在本机执行；push 后需看一眼 Prune 日志与资产数（应为 10 个文件 / 5 组）。
- `update.sh` 988 行；规模规则不覆盖 `.sh`，拆分留待后续。
- 工作区未提交；无 commit 范围可比，Review 以工作区 diff 为准。

### 建议评审重点

1. `swap_dist` / `restore_prev_dist` 的返回码与 `DIST_PREV_KEEP` 生命周期：确认所有失败分支都不会删掉唯一可恢复副本（重点 `rc=3` 与 EXIT trap）。
2. INT/TERM trap 是否覆盖“旧 dist 已移走、新 dist 未就位”的窗口，以及不会在正常路径误触发恢复。
3. workflow Prune 的“成对保留 5 组”与 `update.sh` 下载命名是否完全一致（`web-dist-<sha>.tar.gz.sha256`）。

## 授权记录

- 请求的 AUTH：无（未 commit / push / 变更依赖 / 触碰生产）
- 已批准：无
- 未授权但尝试的动作：无

## 上下文增量

- 触及模块：`update.sh`、`.github/workflows/build.yml`、`docs/reference/07-部署与运维.md`、`docs/reference/README.md`、`docs/reference/development-history.md`、`docs/archive/20261120/`、`docs/STATUS.md`
- 不变量变化：无（L1~L5、AC-019-1~9 不变）；失败恢复语义更严格（恢复成功才删备份）
- 契约变化：无接口变化；Release 资产保留策略由“最近 10 个资产”细化为“按 commit 成对保留 5 组（10 个文件）”，命名不变
- 测试变化：无自动化套件新增；本轮 `/tmp` 独立夹具 16 组（脚本不在仓库内）
- 大脑需要更新的节：`docs/reference/07-部署与运维.md` §3.1/§9/§10、`docs/reference/README.md` v2.04、`development-history.md` G3 返工
- 发现的过期信息：§9 回滚命令与 `update.sh` 提示原为本地 `git reset --hard`（会被 L1 覆盖），已统一为远端 `revert`；资产口径“10 个资产”已明确为“5 组成对”

## 下一步交接

- 交给：Review Agent（G3 复审）
- 依据：P2-1/P2-2 与 6 项 P3 已闭环；`bash -n`、`npm run verify`、隔离夹具 16 组全过
- 携带材料：本报告；工作区 diff（未提交）；`update.sh`；`.github/workflows/build.yml`；G3 报告 `docs/reports/review-agent-2026-11-20-GitHubActions构建.md`
- 给下一位 Agent 的 Prompt（可直接复制）：

  【项目路径】/home/losangelous/LosAngelous/Vesta
  【评审范围】CR-019 / T-065 ~ T-068 G3 返工；工作区未提交（基线 `03ddf61`），重点看 `update.sh` 与 `.github/workflows/build.yml` 的 diff
  【文档位置】/home/losangelous/LosAngelous/Vesta/docs
  【返工报告】/home/losangelous/LosAngelous/Vesta/docs/reports/dev-agent-2026-11-20-GitHubActions构建-返工.md
  【上一轮 G3】/home/losangelous/LosAngelous/Vesta/docs/reports/review-agent-2026-11-20-GitHubActions构建.md
  【重点】P2-1 回滚口径是否彻底统一；P2-2 的 `rc=3` + `DIST_PREV_KEEP` + EXIT/INT/TERM 是否仍可能丢新旧 dist；Prune 成对保留 5 组与下载命名是否一致；真实 Actions/匿名下载仍属 push 后补验
