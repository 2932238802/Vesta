# Vesta · Agent 开工规则

> 所有在本仓库工作的 Agent（Codex / Claude Code / DSH / Cursor / 其他）**先读本文件，再读 `docs/agent-rules.md`**。
> 规则优先级：用户当次明确要求 > 本文件 > `docs/agent-rules.md` > `docs/` 其他文档 > 代码现状。
> 核心约定：**文档优先**——要改题目、选项、跳题、报告规则、接口、数据模型或部署流程，先改 `docs/`，再改代码；代码与文档冲突时，按文档修正代码。

## 0. 开工前（缺一不可）

1. 读 `docs/agent-rules.md`（硬约束）和 `docs/README.md`（工程全貌）。
2. 按任务类型补读：
   - 问卷 / 报告 / 评分 → `docs/规划自测问卷-设计文档.md`（唯一口径）
   - 咨询树 / 咨询稿生成 / 收藏栏 → `docs/consult-system.md`
   - 部署 / `update.sh` / 环境变量 → `docs/README.md` 对应章节
   - 为什么要这样做 → `docs/development-history.md` 最近两轮
3. 先跑一遍基线，确认开工前是绿的：`npm run typecheck`（要改前端再加 `npm run build`）。
4. 用 todo 写下计划：改哪些文件、对应文档哪一节、怎么验证。
5. 本地环境变量已经配好（AI 在 WSL 全局 `~/.profile`，项目变量在仓库 `.env`），见文末「附：本地环境变量」——别重复配、别提交、别打印 key。

## 1. 文档优先（硬性）

- 需求变了：**先改 `docs/`**，在 `docs/development-history.md` 记「何时、改了什么、为什么」，再动代码。
- 不允许「先改代码、文档回头再说」，也不允许只改代码不改文档。
- 判断文档过期时，也要先改文档并说明原因，再改代码；不能直接按代码现状覆盖文档。
- 已作废的方案放 `docs/archive/`，正文里不留会误导人的旧口径。
- 服务器 `/opt/vesta` 上只 `git pull` / `bash update.sh`，**不要在服务器上直接改代码**——改在本地仓库，推上去再拉。

## 2. 实现纪律（摘自 `docs/agent-rules.md`，必须遵守）

- 使用者不是技术从业者：界面简单、直接、少解释；重要动作显眼居中；不堆标题、小标题和重复按钮。
- AI 失败要显示真实原因、允许重试、保留已完成部分；**不许用低质量兜底模板伪装成 AI 成功**。
- 指标必须由数据客观计算，不提供人工填写成交率、学生特点之类「主观指标」入口。
- 不重置、不清空 `consult_tree`、`consult_runs` 和用户导入的咨询树；导入前必须预览 + 备份（SQLite WAL 用 `VACUUM INTO`）。
- 生产必须账号密码 + `AUTH_SECRET`；不改 `requireAdmin()` 绕过校验；免密登录只能绑显式 `NODE_ENV=development`。
- 不提交 `.env`、`data/`、`web/dist/`、`zxg/`；不把真实密码、API Key、联系方式密钥写进代码或文档。
- 后端业务链路必须用 `server/src/log.ts` 打结构化日志，带 `reqId` / `submissionId` / `runId` 等关联字段；禁止记录密码、密钥、联系方式、完整答卷和完整 AI 正文，不要用 `console.log` 绕过统一日志。
- 不动用户已经启动的 dev server；端口被占用先说明，征得同意再处理。

## 3. 交付前验证（必须全绿）

| 改了什么 | 跑什么 |
| --- | --- |
| 后端 `server/` | `npm run typecheck` |
| 前端 `web/` | `npm run typecheck && npm run build` |
| 文档 / 问卷口径 | `npm run check:docs` |
| 以上全部 | `npm run verify`（= check:docs + check:dates + typecheck + build） |

- 没有自动化测试套件，关键页面必须手工走查：问卷一整套（含跳题）、报告页、后台列表。
- **没验证过不要写「完成」**；拿不准就说「不确定」，给出已知信息和可选方案。

## 4. 不熟的部分怎么办（禁止猜）

按顺序找证据，不许编 API、编配置、编命令：

1. **仓库内先找**：`docs/`、`server/src`、`shared/src`、`web/src` 里已有的同类实现。
2. **官方文档**：用 context7 MCP（`mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`）查 Express / Vue / Vite / SQLite / Node 的现行 API，别凭记忆写。
3. **真实跑一遍**：要看页面就起 `npm run dev`，用 playwright MCP（`mcp__playwright__*`）打开 `http://127.0.0.1:5173` 走查，不要臆测 DOM 和样式。
4. **仍然拿不准**：停下来问，给「已知信息 + 可选方案 + 风险」，不要硬编答案。
5. **需要新能力**：优先找现成 skill（项目 `.dsh/skills/`、用户 `~/.dsh/skills`）或 MCP server；选型理由写进 `docs/development-history.md`，不要为了一个工具大改架构。

已接入的 MCP（见 `.mcp.json` 与 `.codex/config.toml`）：

- `context7`：库/框架官方文档检索。
- `playwright`：真实浏览器打开页面做走查。

## 5. 交付

- 一个需求一个 commit；message 用 `类型: 说明`（`feat` / `fix` / `docs` / `chore` / `refactor`）。
- 提交前 `git status` 确认没有混入 `.env`、`data/`、`zxg/` 和构建产物。
- 涉及部署的改动：说明是否需要 `bash update.sh`，以及回滚方式。
- 收尾汇报：做了什么、改了哪些文件、对应文档哪一节、跑了什么验证、还剩什么。

## 6. 禁止事项（看到就停）

- 未经确认执行 `git reset --hard`、`git checkout -- .`、`git clean -fd`、`rm -rf data/`。
- 在服务器上直接改文件、`chmod` 仓库文件后不处理（只差文件模式的「脏」也会让 `update.sh` 的 L1 停下）。
- 删除或重写 `docs/` 里已确认的需求记录。
- 为了让检查通过而改 `scripts/check-docs.mjs` 的判定逻辑——要改先说明理由。

## 附：本地环境变量（2026-11-12 已配好，别重复配、别提交）

本地 dev 的变量**不在仓库里**，分两层：

| 层 | 位置 | 内容 |
| --- | --- | --- |
| 全局（所有项目共用） | WSL `~/.profile` 的 `ai-gateway-dev` 块 | `AI_BASE_URL`（one-api 网关 `http://one-api.server22.jz/v1`）、`AI_MODEL`、`AI_API_KEY` |
| 项目（只 Vesta） | 仓库 `.env`（600，已被 `.gitignore` 忽略） | `ADMIN_USER=admin`/`ADMIN_PASSWORD=admin`、`AUTH_SECRET`、`CONTACT_KEY`、`DATA_DIR`、`BOCHA_API_KEY`/`BOCHA_BASE_URL` |

- **AI 模型不是随便写的**：以网关实际返回为准，先查

  ```bash
  curl -s -H "Authorization: Bearer $AI_API_KEY" "$AI_BASE_URL/models"
  ```

  当时该网关**没有 `deepseek-chat`**，本地用 `deepseek-v4-flash`（还有 `deepseek-v4-pro`、`kimi-k3`、`glm-5.3` 等）。写死 `deepseek-chat` 会拿到 `503 No available channel`。
- 判断变量是否生效：看 `server/src/env.ts` 导出的 `config`（`npx tsx -e "import {config} from './server/src/env.ts'; console.log(config.deepseekModel)"`），别猜。
- 改完 `~/.profile` 后，已开的终端和已启动的 `npm run dev` 不会自动生效，必须重开终端或重启 dev server。
- **不要 `cat .env` 或打印 key**（会进会话记录/日志）；不要提交 `.env`、不要把 key 写进代码或文档。
- 生产变量由 systemd drop-in 注入，和本地 `.env` 无关；本地这份不要拷到服务器。

