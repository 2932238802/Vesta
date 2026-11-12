# Vesta 项目说明

Vesta 是一套面向大学在读学生的问卷、报告与咨询辅助系统。使用者主要是非技术工作人员，因此界面应当简单、直接、可恢复，失败状态必须说清楚。

## 技术栈

- 运行时：Node.js 24+
- 后端：Express + SQLite（`node:sqlite`）+ TypeScript / tsx
- 前端：Vue 3 + Vue Router + Vite
- 数据：单文件 SQLite，默认 `data/vesta.db`
- AI：DeepSeek，可选博查联网检索

## 目录结构

```text
server/src/        Express 服务、数据库、鉴权、AI 生成
shared/src/        问卷、报告、咨询目的树等共享类型与算法
web/src/           Vue 管理后台、问卷、报告页面
deploy/            systemd、Nginx、安装与备份脚本
scripts/           一次性导入与维护脚本
docs/              架构、运行、历史、问卷口径与 Agent 交接文档
docs/archive/      已作废的历史方案（只存档，不要照着实现）
data/              本地数据库与备份（不提交 Git）
update.sh          服务器更新入口
```

文档分工（**改需求先改文档，再改代码**）：

- [../AGENTS.md](../AGENTS.md)：Agent 开工规则——必读顺序、文档优先流程、验证门槛、MCP 使用。
- [consult-system.md](./consult-system.md)：咨询目的树、目的路径、模块化长稿生成与反馈。
- [规划自测问卷-设计文档.md](./规划自测问卷-设计文档.md)：问卷与报告的唯一口径——题目、选项、跳题逻辑、报告规则都在这里。
- [development-history.md](./development-history.md)：历次需求与已做改动，记录「为什么这样做」。
- [agent-rules.md](./agent-rules.md)：后续 Agent 必须遵守的约束。
- [archive/](./archive/)：已作废的历史方案（如 28 题八维计分版《项目计划书》），只用于追溯设计来路。

## 本地开发

```bash
npm install
npm run dev
```

- Vite：`http://127.0.0.1:5173`
- 本地后端：`http://127.0.0.1:8788`
- 生产默认端口：`8787`（可用 `PORT` 覆盖）；本机线上实例是 `8082`（`.env` + `vesta.service.d/zz-port.conf`）

本地 `npm run dev` 会设置 `NODE_ENV=development`。默认启用后台免密登录：

1. 打开 `/admin` 时自动创建“本地测试”会话。
2. 也可以打开 `/admin/login`，页面会自动进入后台。
3. 主动退出后不会被立即弹回后台。

关闭方式：在 `.env` 增加 `DEV_GUEST_LOGIN=false`。免密登录只在显式 `NODE_ENV=development` 时生效；`npm start` 和生产服务不会开启。

### 本地环境变量（2026-11-12 定）

本地 dev 的变量分两层，按「是否跨项目复用」划分：

| 层 | 位置 | 放什么 | 影响范围 |
| --- | --- | --- | --- |
| 全局 | WSL `~/.profile` 的 `ai-gateway-dev` 块 | `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` | 所有本地项目 |
| 项目 | 仓库 `.env`（已被 `.gitignore` 忽略） | `ADMIN_USER/PASSWORD`、`AUTH_SECRET`、`CONTACT_KEY`、`DATA_DIR`、`BOCHA_*` | 只影响 Vesta |

- Windows 用户级环境变量**不会**自动传进 WSL，本地 dev 在 WSL 里跑就得在 WSL 侧配（`~/.profile` 或 `/etc/environment`）。
- 本地 AI 走 one-api 网关（`http://one-api.server22.jz/v1`）。**该网关没有 `deepseek-chat`**，用 `deepseek-v4-flash`；换模型前先看实际列表：

  ```bash
  curl -s -H "Authorization: Bearer $AI_API_KEY" "$AI_BASE_URL/models"
  ```

- 改完 `~/.profile` 后，已开的终端和已启动的 dev server 不会自动生效，要重开终端或重启 `npm run dev`。
- 变量清单以 `.env.example` 为准；`.env` 不入库、不写进文档、不进 memory。

## 生产部署

首次部署参考 `deploy/install.sh`。生产环境必须配置：

- `NODE_ENV=production`（systemd 模板已经设置）
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`（至少 32 位随机字符串）
- `CONTACT_KEY`（用于加密联系方式；更换后旧数据无法解密）

日常更新：

```bash
bash update.sh
```

`update.sh` 自己完成拉取、校验、备份、构建和重启，执行结束后会逐层证明“运行的代码 = `origin/main` 最新提交”：

- **L1 代码**：`git fetch` + `git pull --ff-only`，断言 HEAD 与 `origin/main` 完全一致、工作区干净；有未提交改动、detached HEAD 或无法快进时直接退出，不覆盖本地改动。
- **L2 依赖**：对比拉取前后的 `package-lock.json`/`package.json` 哈希；有变化时执行 `npm ci`，并用 `npm ls --depth=0` 检查 missing/invalid。
- **L3 构建**：构建前移走旧 `web/dist`，构建后断言所有产物晚于本次构建开始；构建失败会恢复上一版 `dist`，不会带着旧产物重启。
- **L4 进程**：重启后读取 systemd `ExecMainStartTimestampMonotonic` / PM2 `pm_uptime` / Docker `StartedAt`，断言进程启动时间晚于构建完成。
- **L5 对外**：`/api/health` 返回 200 且时间戳晚于本次重启；再校验首页引用了本次构建的 JS 指纹。

如果本次拉取更新了 `update.sh` 本身，脚本会用新脚本重新执行（`--resumed` 防止循环）。脚本也会用 `flock` 防止并发执行。

五层校验的动机、失败处理和兼容性说明见 [development-history.md](./development-history.md) 的「本轮（2026-11-12）」；改 `update.sh` 时，本文与那一节要一起同步。

常用选项：

```bash
bash update.sh --help          # 查看全部参数
bash update.sh --no-pull       # 跳过 pull，但仍 fetch 并校验 HEAD == origin/main
bash update.sh --skip-build    # 跳过构建；源码比 dist 新时会拒绝
bash update.sh --mode=systemd  # 覆盖 DEPLOY_MODE
```

说明：

- `DEPLOY_MODE=none` 只构建、不重启，无法完成 L4/L5 校验，因此脚本会在构建后明确失败退出；需要验证运行版本时请改用 `systemd` / `pm2` / `docker`。
- 当前 `/api/health` 只返回 `{ ok, time }`，没有版本字段。L5 会退化为“HTTP 200 + 重启后时间戳 + 前端构建指纹”校验；服务端源码版本由 L4 的进程启动时间保证。以后若 health 增加 `version` / `commit` / `sha` 字段，脚本会自动改成与 git HEAD 比对。
- 服务器上如果还是很久以前的 `update.sh`（不认识上述参数、也不会自动拉取），先手动执行一次 `git pull`；之后日常只需 `bash update.sh`。
- 失败时脚本会打印失败阶段、日志命令、数据库备份路径和回滚命令；健康检查失败还会自动带出最近 60 行服务日志。

## 常用环境变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | 服务端口，默认 `8787` |
| `DATA_DIR` | 数据目录，默认 `./data` |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 管理员账号；生产必填 |
| `DEV_GUEST_LOGIN` | 本地开发免密登录开关，生产无效 |
| `AUTH_SECRET` | 登录令牌签名密钥；生产必填 |
| `CONTACT_KEY` | 联系方式加密密钥，必须长期保存 |
| `PUBLIC_BASE_URL` | 对外链接前缀，如 `https://example.com` |
| `TRUST_PROXY` | 位于反向代理后时设为 `true` |
| `SESSION_TTL` | 登录有效期秒数，默认 30 天 |
| `AI_API_KEY` | AI 报告与咨询稿生成密钥；也兼容旧的 `DEEPSEEK_API_KEY` |
| `AI_BASE_URL` | OpenAI 兼容接口地址；也兼容 `DEEPSEEK_BASE_URL` |
| `AI_MODEL` | 模型名；也兼容 `DEEPSEEK_MODEL` |
| `BOCHA_API_KEY` | 联网检索密钥；与 `BOCHA_BASE_URL` 同时配置才生效 |
| `BOCHA_BASE_URL` | 博查检索接口地址 |
| `AI_TIMEOUT_MS` | AI 单次请求超时，默认 120 秒 |
| `DEPLOY_MODE` | `systemd` / `pm2` / `docker` / `none` / 自动 |

## 报告生成

doc 模式报告（`survey.reportMode === 'doc'`）完全由 AI 生成正文，程序只负责计算与校验：

- **分析规则唯一来源**：后台 `/admin/skill` 当前启用的模板。默认设置内置在 `shared/src/doc-skill.ts`；自定义模板缺失或为空时直接报错，不会用模型常识或模板报告补位。
- **证据边界**：AI 只能使用后台规则、问卷回答、数据库里的岗位/报告数据和博查检索结果。没有依据的项不写。
- **数字由程序算**：分数、比例、天数、排序、阶段和岗位门槛都由 `shared/src/docScore.ts`、`shared/src/job-map.ts`、`shared/src/doc.ts` 计算；AI 只写标题、判断和正文。生成后会扫描 AI 文本里的数字，与允许的数据源比对，不一致就重写，最终报告以数据为准。
- **时间统一函数**：所有时间距离走 `shared/src/date.ts`，按日历差计算，输出粗粒度中文（两年、一年半、X 个月、不到一个月、已过去 X）。`npx tsx shared/src/date.cases.ts` 覆盖跨年、闰日、月末、整年和已过期等情况。
- **检索可追溯**：需要外部信息时，服务端主动调用博查，并记录检索词、时间、结果数量和来源链接，展示在报告底部。未配置密钥、超时或失败会显示真实原因，报告页提供“重新生成”；缺 `BOCHA_API_KEY` 或 `BOCHA_BASE_URL` 都会明确报错，不会静默跳过。
- **失败不伪装**：AI 未配置、规则为空或生成失败时，报告页显示失败原因和重试入口，不展示规则版/模板版冒充 AI 结果。

## 登录与会话

- 每次登录创建独立数据库会话，多台设备可以同时登录。
- 退出只删除当前设备的会话，不影响其他设备。
- 管理接口仍统一经过 `requireAdmin()` 校验令牌与数据库会话。
- `/api/admin/dev-login` 只在本地 development 环境可用，生产固定返回 404，不能绕过真实令牌校验。

## 数据库与备份

数据库使用 SQLite WAL 模式。备份时不要只复制主文件而忽略 `-wal` / `-shm`，应使用：

```bash
node deploy/backup.mjs data/vesta.db data/backups/vesta-YYYYMMDD-HHMMSS.db
```

`update.sh` 会自动执行同样的备份，并只保留最近 14 份。恢复前先停止服务，再整体替换数据库文件。

## 咨询稿导入

咨询树不再包含系统自拟的默认话术。当前本地数据来自 `zxg/` 下导入的成交咨询稿，每份稿子一棵树。

```bash
# 先预览识别结果，不写数据库
node scripts/import-consult-docx.mjs zxg/七月咨询稿.docx --list

# 写入数据库；会备份，并按同名树替换，其他树不变
node scripts/import-consult-docx.mjs zxg/七月咨询稿.docx --name=七月咨询稿 --write

# 带“发言人 00:01”时间戳的逐字稿；指定咨询师发言人
node scripts/import-consult-docx.mjs "zxg/9.18+吕新蕊+260301005+热合曼+一开始想用便宜资源学_原文.docx" --name="9.18 吕新蕊咨询稿" --consultant=2 --write
```

导入规则：

- docx 中加粗的阶段标题成为阶段节点。
- 阶段标题下面的实际话术成为该阶段的同级兄弟节点，不串成长链。
- 括号内的编导提示、条件说明、纯标题和“推荐老师”等流程提示会跳过。
- 逐字稿会识别“发言人”和咨询师角色，咨询师话术串成路径，学生回答挂到上一句咨询师节点。
- 一份文件里可能拼接多段录音；时间戳回退时按段重新识别咨询师，避免第二段的角色编号颠倒。
- 导入只会新增或替换同名咨询树，绝不会清空其他已导入路线。
- 导入前务必先运行一次不带 `--write` 的预览。

## 收藏栏 Word 导入

收藏栏（`/admin/consult/collections`）右上角可以直接选多个 `.docx` 导入；服务端解析正文后写入 `consult_collections`，咨询稿会归到“优秀咨询稿”。也可以在命令行批量导入：

```bash
# 预览解析结果
npx tsx scripts/import-collections-docx.ts zxg

# 写入收藏栏；按标题判重，同名只更新正文
npx tsx scripts/import-collections-docx.ts zxg --write
```

脚本写入前会用 `VACUUM INTO` 备份到 `data/backups/`。`zxg/` 里是真实学员咨询稿，包含个人信息，不要提交到 Git。

## 主要页面

后台按两个栏目组织：

- 问卷：概览、邀请链接、咨询预约、问卷设置、答卷与名单、报告设置、AI 分析规则。
- 咨询：写咨询稿、咨询树、收藏栏。

公开页面：

- `/i/:token`：邀请页与问卷入口。
- `/i/:token/quiz`：填写问卷。
- `/r/:slug`：查看报告、领取与预约。

## 常用验证

```bash
npx tsx shared/src/date.cases.ts   # 日历时间距离用例
npm run verify                     # check:docs + typecheck + build
```

修改后端后至少执行 `typecheck`；修改前端后还要执行 `build`。当前没有统一的自动化测试套件，验收以类型检查、构建、时间用例和实际页面走查为准。

## 注意事项

- 不要提交 `.env`、`data/`、`web/dist/`。
- 不要清空或重置用户导入的咨询树。
- 不要在本地测试时杀掉用户已经启动的服务，除非用户明确要求。
- 数据库结构迁移由服务启动代码执行，修改表结构时要兼容已有数据。
