# 授权台账 — Vesta

> 协议见 `dev-workflow` 的 `references/06-authorization.md`。
> 用户在 G1 批准一次「范围信封」；**A1w**（改代码/文档/大脑，不 commit）由信封授权、记 WORKLOG；**A1c**（当前分支 commit，单分支默认 `main`）由 Review 在 G3 后记账；A2 由 Steward 记账；A3 只由用户确认。
> 本文件 append-only，只记 A1c/A2/A3；不要删除或改写旧条目。

## 当前策略

```yaml
policy: CR-xxx
granted_by: user
granted_at: 2026-11-26
expires: 待填写
branch: main               # 单分支开发默认 main；不建长期 feature 分支
allowed_paths:
  - 待填写
allowed_commands:
  - 待填写
max_commits: 待填写
max_parallel: 3
delegate_a2_to_review: false
forbidden:
  - deploy/
  - .env
escalate_when:
  - 新增依赖
  - 修改鉴权/权限
  - 改动数据模型
```

## 策略变更记录

| 时间 | 变更 | 批准人 |
|---|---|---|
| | | |

## 授权记录

<!-- auth:rows -->

## AUTH-20261128-001

- 时间：2026-11-28 11:26:45 +0800
- CR/T：CR-006 / T-022 ~ T-025
- 动作：commit CR-006 工作区（抓取可靠性返工后，T-022~T-025 + v2.10 文档）
- 级别：A1c
- 策略条款：G3 复审结论为有条件通过；Review 批准当前分支 commit，不含 push / 部署
- 证据：本复审报告 + check:crawl 7 节 EXIT=0 + npm run verify 连续 2 次 EXIT=0 + check:score 3 次 EXIT=0 + check-docs --gate g3 0 ERROR（warn 除外）+ 隔离复现 attempted/deadline 边界
- 批准：review-agent
- 范围：CR-006 工作区当前变更（T-022~T-025；不含 data/、.env、zxg/）
- 有效期：随 CR 结束
- 撤销：否
- 幂等键：CR-006:commit:A1c
- Commit：d0cff71


## AUTH-20261127-005

- 时间：2026-11-27 16:53:32 +0800
- CR/T：CR-005 / T-018~T-021
- 动作：push origin main（6ae6f9a / 7343e01 / 92621df）
- 级别：A2
- 策略条款：user-ratified
- 证据：用户 2026-11-27 选择「推送并触发 CI」
- 批准：steward
- 范围：origin/main CR-005 commits
- 有效期：随 CR-005 结束
- 撤销：否
- 幂等键：CR-005:push:A2


## AUTH-20261127-004

- 时间：2026-11-27 16:20:35 +0800
- CR/T：CR-005 / T-018~T-021
- 动作：commit CR-005 工作区（前端去抓取 + 接口下线 + 吉林导入脚本 + v2.09 文档）
- 级别：A1c
- 策略条款：G3 结论为有条件通过，Review 批准当前分支 commit；不含 push / 部署
- 证据：本报告 AC 表、复跑输出、P2-1 已记录
- 批准：review-agent
- 范围：CR-005 工作区当前变更（T-018~T-021）
- 有效期：随 CR 结束
- 撤销：否
- 幂等键：CR-005:commit:A1c
- Commit：6ae6f9a


## AUTH-20261127-003

- 时间：2026-11-27 16:02:24 +0800
- CR/T：CR-003 / T-015~T-017
- 动作：push origin main（2ace46b / 82aa180 / 43a78e8）
- 级别：A2
- 策略条款：user-ratified
- 证据：用户 2026-11-27 明确确认授权 CR-003 的远端 push
- 批准：steward
- 范围：origin/main CR-003 commits
- 有效期：随 CR-003 结束
- 撤销：否
- 幂等键：CR-003:push:A2


## AUTH-20261127-002

- 时间：2026-11-27 15:45:52 +0800
- CR/T：CR-003 / T-015,T-016,T-017
- 动作：commit
- 级别：A1c
- 策略条款：G1-envelope + G3 有条件通过
- 证据：本报告 + npm run verify EXIT=0 + npm run check:docs/check:version EXIT=0 + 备份 158 文件 SHA256 158 OK + 删除集合与备份清单集合一致 + 守卫错误路径注入
- 批准：review-agent
- 范围：D:/PROJECT/Vesta（CR-003 工作区：docs/ 158 删除 + 脚本/文档/版本；不含 data/、.env、zxg/）
- 有效期：随 CR 结束
- 撤销：否
- 幂等键：CR-003:T-015~T-017:commit:A1c
- Commit：2ace46b


## AUTH-20261127-001

- 时间：2026-11-27 15:11:49 +0800
- CR/T：CR-004 / T-011,T-012,T-013,T-014
- 动作：commit
- 级别：A1c
- 策略条款：G1-envelope + G3 复审有条件通过
- 证据：本复审报告 + npm run verify EXIT=0 + check:score/check:scoreline EXIT=0 + 两校官方页真实解析 2/10 + 隔离 DATA_DIR seed verified 复现 + UAT 报告
- 批准：review-agent
- 范围：D:/PROJECT/Vesta（CR-004 当前工作区，含 P2 返工2 与 UAT；不含 docs/ 删除）
- 有效期：随 CR 结束
- 撤销：否
- 幂等键：CR-004:T-011~T-014:commit-recheck:A1c
- Commit：0ee4fe7


## AUTH-20261126-002

- 时间：2026-11-26 21:17:20 +0800
- CR/T：CR-004 / T-011,T-012,T-013,T-014
- 动作：commit
- 级别：A1c
- 策略条款：G1-envelope + G3 有条件通过
- 证据：本报告 + npm run verify EXIT=0 + check:score/check:scoreline EXIT=0 + 两校官方页真实解析 + 隔离 DATA_DIR 抓取/查询/幂等用例 + seed verified 复现脚本
- 批准：review-agent
- 范围：D:/PROJECT/Vesta（CR-004 工作区；不含 docs/ 删除）
- 有效期：随 CR 结束
- 撤销：否
- 幂等键：CR-004:T-011~T-014:commit:A1c


## AUTH-20261126-001

- 时间：2026-11-26 20:38:25 +0800
- CR/T：CR-002 / T-004,T-005,T-006,T-007,T-008,T-009,T-010
- 动作：commit
- 级别：A1c
- 策略条款：G1-envelope
- 证据：本复审报告 + npm run verify EXIT=0 + check:scoreline 三组用例通过（含真实 runNext 全 skip 与迁移失败注入）+ 独立复现脚本
- 批准：review-agent
- 范围：D:/PROJECT/Vesta（CR-002 工作区；不含 docs/ 删除）
- 有效期：随 CR 结束
- 撤销：否
- 幂等键：CR-002:T-004~T-010:commit:A1c
- Commit：fdf0acf

<!-- 每次 A1c/A2 追加一条，格式见协议第 4 节；优先用 finish-report.sh 自动写入 -->
<!-- A1w 不写这里，记 WORKLOG；G3 接受也记 WORKLOG -->
