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
