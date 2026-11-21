# Review Agent 复审报告 · CR-019 Prune 修复（聚焦）

> 角色：Review Agent ｜ 门禁：G3 复审 ｜ 日期：2026-11-21 ｜ 结论：**有条件通过**
> 范围：CR-019 / T-065 ~ T-068 的 `Prune old assets` 修复；工作区未提交，基线 HEAD `56c6f14`
> 由 Doc Agent 落盘；正文由 Review Agent 提供，未改动结论与证据。

<!-- report-meta
role: review
gate: G3
cr: CR-019
task: T-065 ~ T-068（Prune 修复聚焦复审）
status: 有条件通过
action: 真实 workflow 提取脚本 31 套夹具 + 真实 Release 载荷复跑全过，未发现 P0/P1/P2；真实 Actions 与真实 gh --slurp 形态仍需 push 补验，另有 4 项 P3
commit: 56c6f14
-->

- 范围：CR-019 / T-065 ~ T-068 的 `Prune old assets` 修复；3 个已跟踪修改 + 1 个未跟踪 Dev 报告。
- 评审类型：变更复审（聚焦 Prune 修复）。
- 来源 CR：CR-019（G0 / G1 已确认，方案 A）。
- 结论：**有条件通过**。
- 一句话理由：修复后的 Prune 在从真实 workflow 提取的脚本上通过 31 套夹具，并能在真实 Release 资产载荷的两种 `--slurp` 形态下正确 `exit 0`、不误删；未发现 P0/P1/P2，但真实 Actions 与真实 `gh --slurp` 输出形态仍无法在本机验证，AC-019-1/2 需 push 后补验。

## 评审基线

- 范围边界：只审 `Prune old assets` 步骤、相关开发文档实施记录与工作区范围；不重审 `update.sh` 下载/回滚逻辑（本轮零 diff）。
- 关联需求：R-019-1、R-019-2、R-019-7、R-019-8。
- AC 清单：AC-019-1 ~ AC-019-9（重点 1、2、7、8）。
- 契约：资产命名 `web-dist-<完整 sha>.tar.gz` + `.sha256`；按 commit 成对保留最近 5 组；权限仅 `contents: write`。
- 明确不在范围：自动部署、生产 `update.sh` 实跑、容器化、业务功能、`update.sh` 拆分。

## AC 判定

| AC | 判定 | 证据 |
|---|---|---|
| AC-019-1 | **部分（本地满足，真实 Actions 未验证）** | 真实 run `44859478220` 前 8 步成功，仅第 9 步 Prune failure；修复脚本用真实 Release 资产载荷两种形态复跑 exit 0；需 push 后确认整条 run 全绿。 |
| AC-019-2 | **部分（真实匿名下载未执行）** | 已通过公开 API 取得 Release `dist` 的 2 个真实资产元数据并复跑 Prune；上一轮同构产物 tar 结构/SHA 证据仍有效。 |
| AC-019-3 | **满足（沿用上轮）** | `update.sh` 零 diff；上一轮隔离夹具证据有效；`bash -n` 通过。 |
| AC-019-4 | **满足（沿用上轮）** | 同上。 |
| AC-019-5 | **满足（沿用上轮）** | 同上。 |
| AC-019-6 | **满足（沿用上轮）** | 同上。 |
| AC-019-7 | **满足（静态）** | 权限仍仅 `contents: write`；无 `web/dist`/`data`/依赖/`update.sh` diff；无新依赖。 |
| AC-019-8 | **满足** | `bash -n update.sh` rc=0；`npm run verify` rc=0（check:question 162 passed；2.4.0 ↔ v2.04；build 771 modules）；`git diff --check` rc=0。 |
| AC-019-9 | **满足（沿用上轮）** | `update.sh` 零 diff；上一轮本地 HTTP 夹具结论有效。 |

## 验证执行

| 命令 / 动作 | 结果 |
|---|---|
| PyYAML 从真实 workflow 提取 Prune `run` | 8 步；触发/权限/并发不变；脚本 sha256 固定 |
| 与 HEAD 结构比对 | 仅第 8 步 `Prune old assets` 的 `run` 不同；前 7 步一致 |
| `bash -n` 全部 6 个 `run` 块 + Prune 脚本 | 通过 |
| `bash -n update.sh` | 通过 |
| `git diff --check` | 通过 |
| `npm run verify` | 通过（EXIT=0） |
| 夹具矩阵（gh shim + 本地 fixture） | **31/31 通过** |
| 真实 Release 载荷（公开 API） | 2 个资产；flat/nested 两种形态喂真实脚本均 rc=0、0 删除 |
| 公开 run 元数据 | job failure；步骤 1–8 success，第 9 步 failure |
| 公开 run 日志 | 403（需管理员），无 jq stderr |
| 真实 `gh` / 真实 Actions | 未执行 |

### 夹具矩阵（从真实 workflow 提取的脚本）

| 用例 | 结果 |
|---|---|
| nested 1 组 / 5 组 | exit 0，不删 |
| nested 6 组 / 7 组 | 删最旧 1 / 2 组，成对 |
| multipage 6 / 7 组乱序 | 删最旧 1 / 2 组 |
| flat 1 / 6 组 | 不删 / 删最旧 1 组 |
| 乱序 created_at 6 / 7 组 | 删最旧组 |
| 空文件 / 空白 / `[]` / `[[]]` / `null` | exit 0，不删 |
| 畸形 JSON | exit 1，不删 |
| 无关资产（.txt/.bak/.zip/.json/.md） | 不删 |
| 残缺成对（仅 sha / 仅 tar） | 不崩溃，按规则处理 |
| created_at 相同 / 缺失 | 确定性处理 |
| 名称含空格 / 中文 | 正常成对删除 |
| 任意 `.tar.gz` 对 | 被当作候选（P3-1） |
| 当前组最旧 | 会被删（P3-2） |
| 资产 API / DELETE 失败 | 非 0，停止 |

## 影响面覆盖

- 仅 `Prune old assets` 的 `run` 变化；前 7 步与 HEAD 完全一致；资产命名、`dist-info`、`update.sh` 下载契约未改。
- 无迁移/新配置/新依赖；未写仓库 `data/`；`web/dist` 无 tracked diff。
- 文档：开发文档新增实施记录；`07` 与 `history` 的“5 组 / 10 资产 / 成对”口径未变。
- 安全：仅 `contents: write`；使用 `github.token`；无 token/密钥输出。

## NFR 检查

| 项 | 结果 |
|---|---|
| 最小权限 | 通过 |
| 服务器无 token | 通过 |
| 资产绑定 commit + SHA256 | 通过 |
| 保留策略 | 正常完整组满足；残缺组/当前组极端时间戳存在 P3 |
| 失败可观测 | Node/gh/DELETE 失败均非 0，每次删除有日志 |
| 资源有界 | 一次列表 + 线性分组 + 每删除一次 API |
| 注入/敏感信息 | 通过 |

## 缺陷清单

未发现 P0 / P1 / P2。

### [P3] 分组正则过宽：任意 `.tar.gz` 资产都会进入清理候选

- 位置：`.github/workflows/build.yml:103`
- 问题：`/^(.*)\.tar\.gz(\.sha256)?$/` 未限定 `web-dist-` 前缀，手工上传的 `source-code.tar.gz` 等也可能被删。
- 影响：可能删除人工附加资产；正常 workflow 资产不受影响。
- 建议：收紧为 `^web-dist-[0-9a-f]{40}\.tar\.gz(\.sha256)?$` 或至少 `^web-dist-`。
- 置信度：高，影响概率低。

### [P3] 未保护当前 `GITHUB_SHA` 组

- 位置：`.github/workflows/build.yml:113-117`
- 问题：保留逻辑只按 `created_at` 倒序，当前组时间戳并列/异常时可能被删。
- 影响：`update.sh` 对 HEAD 404，直到重新运行；正常时间戳下不会。
- 建议：固定保护 `web-dist-${GITHUB_SHA}`，或删除前断言当前组不在待删列表。
- 置信度：中。

### [P3] 残缺组会占用“最近 5 组”名额

- 位置：`.github/workflows/build.yml:103-111`、`:117`
- 问题：不要求 tar+sha 同时存在，残缺组可能挤掉完整组。
- 影响：某一轮后可能只剩 4 个完整组；随后自愈。
- 建议：只把完整对视为保留组，或先清理 orphan。
- 置信度：高，概率低。

### [P3] 开发文档把未取得的 jq 报错写成确定根因

- 位置：`docs/archive/20261120/4-GitHubActions构建-开发文档.md:120`
- 建议：加 `[推断]` 并注明原始日志不可得。
- 置信度：高。

## 已检查且未发现问题的区域

- 触发/8 步/setup-node 24/cache/permissions/concurrency 不变；仅 Prune `run` 变化。
- `set -euo pipefail` 保留；空/异常输入处理正确。
- 1/5 组不删，6/7 组只删最旧且成对；三种 `--slurp` 形态展平正确。
- 乱序/时间相同/缺失时间处理确定；无关资产不误删；名称含空格/中文正常。
- 畸形 JSON、API 失败、DELETE 失败均非 0。
- 真实 Release 当前 1 组，两种形态运行真实脚本均 rc=0、0 删除。
- 范围零 diff；`verify` 全绿；用户注释 0 处修改。
- 未启动 8788/5173；夹具在 /tmp 并清理；未写 data。

## 文档同步检查

- 开发文档实施记录基本准确；第 120 行根因需加 `[推断]`（P3）。
- `STATUS.md` 的“12 套夹具”是 Dev 计数，本轮实际 31 套；Doc 落盘时可更新。
- `07`、`history` 的“5 组 / 10 资产”口径与实现一致。

## 残留风险

- 真实 Actions 未执行；真实 `gh --slurp` 输出形态未在本机验证；若为“多页 JSON 直接拼接无外层数组”，`JSON.parse` 会失败（与文档语义不符，概率低）。
- 原始 jq 报错不可得，根因仍是推断。
- 当前组时间戳异常、残缺组占位、任意 `.tar.gz` 被当候选、固定 /tmp 路径、不同 ref 并发、无仓库内自动化测试、既有 Node 20 action warning。

## 建议（非阻塞）

- 收紧正则；保护当前 SHA 组；只保留完整对；文档加 `[推断]`；Prune 日志打印最终保留组名/资产数。

## 下一步交接

- 结论：**有条件通过** → **Meta Agent**（Doc 先落盘本报告）。
- 收口条件：
  1. push 后真实 Actions 全绿，Prune exit 0。
  2. 首次修复后 run：1 组 → 2 组，Prune 不删，两组保留。
  3. 达到 6 组时只删最旧 1 组且成对，保留 5 组 / 10 资产；当前 commit 资产在。
  4. 匿名下载 + SHA256 + tar 结构校验。
  5. 若 Prune 仍红，向管理员取完整日志，核对真实 `gh --slurp` 形态。
