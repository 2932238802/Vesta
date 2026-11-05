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
docs/              架构、运行、历史和 Agent 交接文档
data/              本地数据库与备份（不提交 Git）
update.sh          服务器更新入口
```

进一步阅读：

- `docs/consult-system.md`：咨询目的树、目的路径、长稿生成与反馈。
- `docs/development-history.md`：历次需求和已做改动。
- `docs/agent-rules.md`：后续 Agent 必须遵守的约束。

## 本地开发

```bash
npm install
npm run dev
```

- Vite：`http://127.0.0.1:5173`
- 本地后端：`http://127.0.0.1:8788`
- 生产端口：`8787`

本地 `npm run dev` 会设置 `NODE_ENV=development`。默认启用后台免密登录：

1. 打开 `/admin` 时自动创建“本地测试”会话。
2. 也可以打开 `/admin/login`，页面会自动进入后台。
3. 主动退出后不会被立即弹回后台。

关闭方式：在 `.env` 增加 `DEV_GUEST_LOGIN=false`。免密登录只在显式 `NODE_ENV=development` 时生效；`npm start` 和生产服务不会开启。

## 生产部署

首次部署参考 `deploy/install.sh`。生产环境必须配置：

- `NODE_ENV=production`（systemd 模板已经设置）
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`（至少 32 位随机字符串）
- `CONTACT_KEY`（用于加密联系方式；更换后旧数据无法解密）

日常更新：

```bash
git pull
bash update.sh
```

`update.sh` 会先备份数据库，再安装依赖、构建前端、重启服务并检查健康状态。仅当 `.env` 已存在且部署方式（systemd / PM2 / Docker / 手动）已配置好时，这两条命令就足够。生产环境不会走本地免密登录。

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
| `DEEPSEEK_API_KEY` | AI 报告与咨询稿生成密钥 |
| `BOCHA_API_KEY` | 可选的联网检索密钥 |
| `DEPLOY_MODE` | `systemd` / `pm2` / `docker` / `none` / 自动 |

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
npm run typecheck
npm run build
```

修改后端后至少执行 `typecheck`；修改前端后还要执行 `build`。当前没有自动化测试套件，验收以类型检查、构建和实际页面走查为准。

## 注意事项

- 不要提交 `.env`、`data/`、`web/dist/`。
- 不要清空或重置用户导入的咨询树。
- 不要在本地测试时杀掉用户已经启动的服务，除非用户明确要求。
- 数据库结构迁移由服务启动代码执行，修改表结构时要兼容已有数据。
