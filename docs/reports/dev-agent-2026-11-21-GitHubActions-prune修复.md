# Dev Agent 开发报告 · CR-019 真实 Actions 首跑 Prune 修复

<!-- report-meta
role: dev
gate: G2
cr: CR-019
task: T-065 ~ T-068（真实 Actions 首跑修复）
status: 修复完成，待 G3 复审
action: Prune 改用 Node 读取 --slurp 输出、展平分组、成对保留最近 5 组，移除 --jq+--slurp 组合
commit: -
auth_level: A1（仅本地修改；未 commit / 未 push）
auth_action: -
auth_evidence: -
auth_scope: -
auth_expires: 随 CR 结束
auth_key: -
-->

- 工作日志：未生成（本仓库 skill 集无 `scripts/finish-report.sh`，按项目既有报告格式落盘）
- 任务：CR-019 / T-065 ~ T-068，修复真实 Actions 首跑 `Prune old assets` 失败
- 结论：**修复完成，待 G3 复审**（未提交、未 push）
- 来源：run `44859478220` 第 9 步失败；用户指定的修复要求
- 门禁：G1 已确认；本次为真实运行失败修复，G2 自检完成
- DoR 核对：通过（G0/G1 沿用；失败步骤与修复口径由用户明确指定；无新依赖、无接口/数据变更）
- 关联 AC：AC-019-1（Actions 跑绿、资产正确）、AC-019-7（最小权限）、AC-019-8（`verify` 全绿）；行为口径（最近 5 组 / 10 个资产、tar+sha 成对）不变

## 一、失败定位

- 失败 run：`44859478220`，第 9 步 `Prune old assets`，`exit code 1`；前 8 步（含 `npm run verify`、`Package dist`、`Ensure dist release`、`Upload asset`）成功。
- Release tag `dist` 已有 2 个资产：`web-dist-56c6f14….tar.gz` 与 `.sha256`（即首次运行只有 1 组）。
- 公开 check-run 注解仅显示 `.github` 第 50 行 `exit code 1`，完整日志需管理员权限，无法取得具体 jq stderr。
- 根因定位（**[推断]**）：原 Prune 使用 `gh api … --paginate --slurp --jq 'add | …'`，对 `--slurp` 的单页/多页输出形态做了 `add` 假设。`--slurp` 对数组端点通常输出按页嵌套的 `[[asset,...]]`，但形态会随 gh 版本/页数变化；首次只有 1 组资产时，`add` 未能稳定地得到资产数组，jq 报错后由 `set -euo pipefail` 以非 0 退出。**未取得原始 stderr，故不把具体错误行当作已证实事实。**
- 说明：`RELEASE_ID` 查询仍保留 `--jq '.id'`；它与本次问题无关，且**未**再与 `--slurp` 组合。

## 二、修复 diff

文件：`.github/workflows/build.yml`，`Prune old assets`（`build.yml:81-128`）。

**修改前（关键逻辑）**

```yaml
gh api "repos/${{ github.repository }}/releases/$RELEASE_ID/assets" --paginate --slurp \
  --jq '
    add
    | map(. + {group: (.name | sub("\\.tar\\.gz(\\.sha256)?$"; ""))})
    | group_by(.group)
    | map({newest: (map(.created_at) | max), assets: .})
    | sort_by(.newest) | reverse
    | .[5:]
    | .[].assets[]
    | [.id, .name, .created_at] | @tsv
  ' |
while IFS=$'\t' read -r id name created; do
  ...
done
```

**修改后（关键逻辑）**

```bash
set -euo pipefail
RELEASE_ID="$(gh api "repos/${GITHUB_REPOSITORY}/releases/tags/dist" --jq '.id')"
gh api "repos/${GITHUB_REPOSITORY}/releases/${RELEASE_ID}/assets" \
  --paginate --slurp > /tmp/release-assets.json
node <<'NODE' > /tmp/prune-targets.tsv
const fs = require("fs")
const raw = fs.readFileSync("/tmp/release-assets.json", "utf8").trim()
if (!raw) process.exit(0)
const parsed = JSON.parse(raw)
const pages = Array.isArray(parsed) ? parsed : []
// 兼容 [[asset,...],...] 与 [asset,...]
const assets = pages.length > 0 && pages.every((page) => Array.isArray(page))
  ? pages.flat()
  : pages
const nameRe = /^(.*)\.tar\.gz(\.sha256)?$/
const groups = new Map()
for (const asset of assets) {
  if (!asset || typeof asset.name !== "string") continue
  const match = nameRe.exec(asset.name)
  if (!match) continue
  const key = match[1]
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(asset)
}
const newest = (list) => Math.max(...list.map((asset) => Date.parse(asset.created_at) || 0))
const ordered = [...groups.entries()]
  .map(([key, list]) => ({ key, list, newest: newest(list) }))
  .sort((a, b) => b.newest - a.newest || a.key.localeCompare(b.key))
for (const group of ordered.slice(5)) {
  const sorted = [...group.list].sort((a, b) => String(a.name).localeCompare(String(b.name)))
  for (const asset of sorted) {
    process.stdout.write([asset.id, asset.name, asset.created_at || ""].join("\t") + "\n")
  }
}
NODE
while IFS=$'\t' read -r id name created_at; do
  [ -n "$id" ] || continue
  echo "删除旧资产：$name（created_at $created_at）"
  gh api -X DELETE "repos/${GITHUB_REPOSITORY}/releases/assets/$id"
done < /tmp/prune-targets.tsv
```

行为保证：

- `gh api … --paginate --slurp` 的输出交给 runner 自带 Node 24 读取；`[[asset,...]]` 与 `[asset,...]` 均兼容。
- 按 `^(.*)\.tar\.gz(\.sha256)?$` 提取组名；同一 commit 的 tar 与 sha 归同组、同删同留。
- 按组内最新 `created_at` 倒序，删除第 6 组及以后；组内输出 `id\tname\tcreated_at`。
- 无资产或组数 ≤5：Node 输出为空，`while` 读到 EOF 后正常 `exit 0`。
- `set -euo pipefail` 保留；`gh api` 或 Node 失败都会以非 0 退出，不静默跳过清理。
- `Ensure dist release`、`Upload asset`、`permissions: contents: write` 均未改动。

## 三、模拟用例结果

方法：用 Python/PyYAML 从 workflow 提取**真实的 `run` 脚本**（不是重写副本），配合 `gh` shim（`releases/tags/dist` 返回固定 id；`/assets --paginate` 输出夹具；`-X DELETE` 记录调用）执行；夹具由 Node 生成。

| 用例 | 夹具形态 | 组数 | 期望删除 | 实际 rc | 实际删除 |
| --- | --- | --- | --- | --- | --- |
| 首次运行 | `[[tar,sha]]` | 1 | 无 | 0 | 无 |
| 边界 | `[[…]]` | 5 | 无 | 0 | 无 |
| 单页 | `[[…]]` | 6 | 最旧 1 组（id 11,12） | 0 | 11,12 |
| 单页 | `[[…]]` | 7 | 最旧 2 组（11,12,21,22） | 0 | 11,12,21,22 |
| 乱序单页 | `[[6,1,4,2,5,3…]]` | 6 | 按 `created_at` 删最旧（11,12） | 0 | 11,12 |
| 扁平形态 | `[asset,...]` | 1 | 无 | 0 | 无 |
| 扁平形态 | `[asset,...]` | 6 | 11,12 | 0 | 11,12 |
| 多页 | `[[p1],[p2]]` | 6 | 11,12（跨页正确展平） | 0 | 11,12 |
| 空页 | `[[]]` | 0 | 无 | 0 | 无 |
| 空数组 | `[]` | 0 | 无 | 0 | 无 |
| 含无关资产 | 6 组 + `release-notes.txt` + `.zip` | 6 | 11,12（无关资产被忽略） | 0 | 11,12 |
| 残缺成对 | 5 组 + 仅 sha 的第 6 组 | 6 | 11,12（不崩溃） | 0 | 11,12 |

补充断言：

- `single-6groups` 删除后存活资产为 `21,22,31,32,41,42,51,52,61,62`，即恰好 5 组 × 2 = 10 个。
- 删除集合始终包含同一 base 的 `.tar.gz` 与 `.tar.gz.sha256`（成对），未出现只删其一的组合。
- 提取出的 `run` 脚本本身 `bash -n` 通过。

夹具与 shim 位于 `/tmp/cr019-prune-test/`，未提交进仓库。

## 四、YAML 解析

`python3` + PyYAML：

```
name: Build web dist
triggers: ['push', 'workflow_dispatch']
permissions: {'contents': 'write'}
runs-on: ubuntu-latest
step count: 8
  1. Checkout
  2. Setup Node
  3. Install dependencies
  4. Verify
  5. Package dist
  6. Ensure dist release
  7. Upload asset
  8. Prune old assets
concurrency group: build-${{ github.ref }}
```

结论：结构合法；步骤数、权限、触发条件、并发组均未变化；`Prune` 使用 Node 24（`ubuntu-latest` + `setup-node@v4 node-version: 24`）。

## 五、执行过的命令与结果

| 命令 | 结果 | 关键输出 |
| --- | --- | --- |
| `bash -n update.sh` | 通过 | exit 0 |
| `bash -n /tmp/cr019-prune-test/prune-step.sh` | 通过 | 从 workflow 提取的真实 Prune 脚本 |
| 夹具矩阵（12 用例） | 全过 | `FAIL=0`、`EXTRA_FAIL=0` |
| PyYAML 解析 workflow | 通过 | 8 步、`contents: write` |
| `git diff --check` | 通过 | 无空白错误 |
| `npm run verify` | **EXIT=0** | 见下 |

`npm run verify` 关键输出：

- `check:docs`：问卷 28 个题项在设计文档中、agent-rules 4 个小节、README 已索引。
- `check:size`：293 个文件、10 条基线，通过。
- `check:version`：`package.json=2.4.0 ↔ docs/reference/README.md 最高 v2.04`。
- `check:deps`：Node 24 / `@types/node` major 24 / express 同 major。
- `check:dates`、`check:score`、`check:audit`、`check:roster`、`check:search`：全部用例通过；`check:question`：`162 passed, 0 failed`。
- `typecheck`：`tsc --noEmit` 两处（server / web）通过。
- `build`：`vite build` 771 modules，`✓ built in 3.81s`。

## 六、回归与影响面

| 受影响区域 | 验证 / 结论 | 结果 |
| --- | --- | --- |
| Prune 步骤 | 12 套夹具覆盖单页/多页、1/5/6/7 组、乱序、扁平、空、无关资产、残缺成对 | 全过 |
| `Ensure dist release` / `Upload asset` | 未改动（PyYAML 步骤名与内容核对） | 无变化 |
| 权限 | `permissions` 仍仅 `contents: write` | 无变化 |
| `update.sh` | 未改动；`bash -n` 通过 | 无变化 |
| 业务代码 / 依赖 / 数据 | 零 diff；未写仓库 `data/` | 无变化 |
| 资产清理口径 | 最近 5 组 / 10 个、tar+sha 成对 | 保持一致 |

## 七、发布 / 回滚

- 开关：无。
- 迁移：无。
- 回滚：远端 `git revert` 本次 workflow 修复并 push，再等 Actions 重新运行；本次只改 CI 步骤，不影响服务器 `update.sh` 与已上传资产。
- 可观测性：每个被删资产打印 `删除旧资产：<name>（created_at …）`；Node/`gh` 失败以非 0 退出，使 Actions 步骤红。
- 上线方式：需 push（或手动 `workflow_dispatch`）后真实运行验证；本次未 push。

## 八、文档更新

| 文件 | 更新内容 |
| --- | --- |
| `docs/archive/20261120/4-GitHubActions构建-开发文档.md` | 新增「实施记录（2026-11-21，真实 Actions 首跑修复）」：失败定位、Node 实现、验证范围 |

- 未修改 `docs/reference/07-部署与运维.md` 等口径文档：清理行为（最近 5 组 / 10 个、成对）未变，Node 只是实现方式。
- 未修改 `update.sh`、业务代码、版本号。
- `docs/STATUS.md` 在开工前已有未提交修改（Doc 将门禁回填为“真实 Actions 首跑失败 → 修复中”）；本报告未改动该文件，予以保留。

## 九、偏差与假设

- [偏差] Node 输出先写 `/tmp/prune-targets.tsv`，再由 `while … done < 文件` 读取，而不是 `node … | while …`。原因：heredoc 与 pipeline 组合时，bash 会在首行之后立即读取 heredoc 体，吞掉 `while` 的命令体，导致语法错误（本地已复现）。改为中间文件后行为等价，且在 `set -euo pipefail` 下失败更清晰。
- [假设] 同一时刻 `created_at` 相同的组，用组名 `localeCompare` 做确定性决胜；口径未规定，正常构建每个 commit 时间不同，不影响结果。
- [假设] `--slurp` 的两类形态按用户要求兼容；真实 gh 版本的输出形态未在本机验证（无 gh）。
- 保留 `RELEASE_ID` 查询的 `--jq '.id'`；未与 `--slurp` 组合，不属于本次修复对象。

## 十、未完成 / 风险 / 需要决策

- 真实 GitHub Actions / 真实 `gh api` 仍未运行；需 push 后跑绿并保留 Prune 日志（保留 5 组 / 10 个、成对删除）。
- 原始 jq 具体报错未取得（公开注解只有 exit code 1），根因标注为 `[推断]`。
- 首次真实运行若只有 1 组，本实现应删除 0 个资产并 `exit 0`；这是最关键的复验点。
- 首次运行时 `/tmp/release-assets.json` 固定路径可用（runner 为一次性 VM）；若未来改为自托管 runner，可考虑 `mktemp`。

## 十一、建议评审重点

1. Node 分组/排序边界：1/5/6/7 组、乱序、扁平与多页形态、空输出是否都 `exit 0` 或只删最旧组。
2. 删除成对性：同一 base 的 tar 与 sha 是否同删同留；无关资产是否被忽略。
3. heredoc + `while … done < 文件` 结构在 Actions 默认 `bash -e` 下的行为（已用从 workflow 提取的真实脚本本地验证）。

## 授权记录

- 请求的 AUTH：无（仅本地修改，未 commit / 未 push）。
- 已批准：无。
- 未授权但尝试的动作：无。

## 上下文增量

- 触及模块：`.github/workflows/build.yml`（CI 构建/发布）；`docs/archive/20261120/4-GitHubActions构建-开发文档.md`（实施记录）。
- 不变量变化：无。保留最近 5 组 / 10 个资产、tar+sha 成对的口径不变。
- 契约变化：无。仅 workflow 内部实现变化；Release 资产命名、`dist-info`、`update.sh` 下载契约均不变。
- 测试变化：仓库无自动化测试套件；本次使用 `/tmp` 夹具（未入库），无新增/修改仓库测试。
- 大脑需要更新的节：不适用（本仓库无 `PROJECT_BRAIN.md`）；建议 `docs/reference/07-部署与运维.md` §3.1 保持现状，无需改动。
- 发现的过期信息：无。`docs/STATUS.md` 已有未提交修改属于 Doc 状态回填，与本报告无冲突。

## 下一步交接

- 交给：**Review Agent**（G3 复审）
- 依据：G2 修复完成；DoD 中“真实 Actions 跑绿”依赖 push，本机不可执行，其余验证全绿。
- 携带材料：
  - 本报告：`docs/reports/dev-agent-2026-11-21-GitHubActions-prune修复.md`
  - 变更：`.github/workflows/build.yml`（Prune 步骤）、`docs/archive/20261120/4-GitHubActions构建-开发文档.md`（实施记录）
  - 基线：HEAD `56c6f14`；工作区未提交；另有 `docs/STATUS.md` 的 Doc 预存修改
  - 复验要点：push 后 Actions 8 步全绿，Prune 在“1 组”首跑场景 `exit 0` 且不删资产；6 组以上只删最旧组且 tar+sha 成对
- 给下一位 Agent 的 Prompt（可直接复制）：

```
【项目路径】/home/losangelous/LosAngelous/Vesta
【评审范围】CR-019 真实 Actions 首跑 Prune 修复（HEAD 56c6f14 之后工作区未提交）
【变更文件】.github/workflows/build.yml、docs/archive/20261120/4-GitHubActions构建-开发文档.md
【开发报告】docs/reports/dev-agent-2026-11-21-GitHubActions-prune修复.md
【重点】1) Node 对 [[asset,...]] / [asset,...] 的展平与 1/5/6/7 组边界；2) tar+sha 成对删除；3) heredoc + while 文件读取在 Actions bash 下的可用性；4) Ensure/Upload/permissions/update.sh 未被改动
【未验证】真实 Actions 与真实 gh api 需 push 后复验；原始 jq 报错日志不可得，根因为推断
```
