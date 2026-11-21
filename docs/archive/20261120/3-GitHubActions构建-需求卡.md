# 前端改为 GitHub Actions 构建

> 维护者：Doc Agent ｜ 最近更新：2026-11-21 ｜ 状态：已交付（v2.04，G4 通过，`56c6f14` + `c3f9996`，已部署）
> 关联：`docs/reference/07-部署与运维.md`、`update.sh`、`docs/reference/README.md`

## CR-019 前端 CI 构建与服务端只拉取

- **类型**：部署架构 / 运维
- **来源**：2026-11-20 生产部署事故 + 用户要求「走 GitHub Actions 构建」。
- **当前事实**：
  - Vesta 仓库 `2932238802/Vesta` 为**公开仓库**；生产使用 systemd（`vesta.service`），Node 24、Docker 均可用，`DEPLOY_MODE=systemd`。
  - 现状：`update.sh` 在服务器本地 `npm run build`；2026-11-20 构建被中断时 Vite 已清空 `web/dist`，导致全站 500/503，直到重新构建完成。
  - 服务器 2 核 3.5G，还跑着 dsh / Postgres / Docker 等多个服务，构建时容易争抢 CPU/内存。
  - Theseus 的 `ci.yml` 在 Actions 里跑前端构建并推送 `ghcr.io` 镜像，但注释明确「Manual deploy only; no server was changed」，并非“服务器拉前端产物”。

### 一、问题与价值

- 问题：前端构建依赖生产机资源和人工时机；构建失败/中断会直接打空线上 `web/dist`；服务器负载被构建放大。
- 价值：构建放到 GitHub 托管的 runner；生产只做「下载 → 校验 → 原子替换 → 重启」，不再需要构建内存，也不会再出现“dist 被清空但没产出”的窗口。

### 二、成功指标

- 一次 `git push` 后，Actions 自动产出与 commit 一一对应的前端产物。
- 生产 `bash update.sh` 不再执行 `vite build`，只下载并校验产物；构建中断不影响线上。
- 产物校验失败或下载失败时，`update.sh` 明确失败并保留上一版 `web/dist`，不重启服务。
- `/api/health` 的 commit / 版本与前端产物来源 commit 一致。
- 默认首页与问卷页 390px 走查通过。

### 三、方案选项与代价（G0 待选）

| 方案 | 产物交付 | 服务器侧 | 代价 / 风险 |
| --- | --- | --- | --- |
| **A. Release 产物（推荐）** | Actions 构建 `web/dist`，打包为 `web-dist-<sha>.tar.gz` + SHA256，上传到固定 Release（tag `dist`，按 SHA 命名资产） | `update.sh` 从公开 Release 下载对应 SHA 的产物，校验 SHA256，解压到临时目录后原子替换 `web/dist`，跳过本地构建 | 改动 `update.sh` + 新增 workflow；Release 资产需要定期清理；需要处理“产物尚不存在”的失败提示 |
| **B. dist 分支** | Actions 把 `web/dist` 单提交 force-push 到 `dist` 分支 | `update.sh` `git fetch origin dist`，从该分支取出 `web/dist` | 实现最简单、复用现有 git 拉取；仓库多一条生成分支，packfile 会随历史增长，需要定期强制单提交 |
| **C. 容器化（对齐 Theseus）** | Actions 构建镜像并推送 `ghcr.io`（Dockerfile 内含前端构建） | 服务器 `docker pull` + compose 重启 | 最接近 Theseus；改动最大（Dockerfile、compose、部署模式、日志/数据挂载、回滚），需要单独一轮较大改造 |

- **共同项（无论 A/B/C）**：`update.sh` 的构建环节改为「先出到临时目录、成功后再原子替换」，任何失败都保留上一版 `web/dist`；CI 至少跑 `npm run verify`（含 `check:question` / typecheck / build）。
- **建议**：先做 **A**，它直接解决本次事故且不改变现有 systemd 部署；若以后要和 Theseus 统一容器化，再单独立项做 C。

### 四、非功能要求（NFR）

- 不在服务器保存 GitHub token（仓库公开，Release 资产可直接下载）。
- 产物必须与 commit 绑定并校验 SHA256；不允许“下载到别的版本”。
- `update.sh` 的 L1~L5 校验口径保持：代码 = origin/main、产物 = 本次 commit、health = HEAD。
- 失败可回滚：保留上一版 `web/dist`；`git revert` 后重新执行 `update.sh`。
- 不提交 `web/dist` 到 main（方案 B 只允许生成分支）。
- 文档优先：先更新部署文档与 `AGENTS.md` 的交付验证表，再改脚本。

### 五、待用户确认

1. 选 **A（Release 产物，推荐）** / **B（dist 分支）** / **C（容器化对齐 Theseus）**？
2. 选定后是否保留 `update.sh --dist=local` 作为应急回退（默认走 CI 产物）？
3. Release 资产保留策略：只保留最近 10 个 commit 的产物，还是一直保留？

## 决策记录

| 日期 | 决策 | 结论 |
| --- | --- | --- |
| 2026-11-20 | 方向 | 用户要求走 GitHub Actions 构建；G0 待选交付方式 |
| 2026-11-20 | CR 编号 | 本需求为 CR-019 |
