# 开启 gzip 压缩 · 开发文档

> 版本：v1.0（2026-11-13）
> 状态：**已实施并提交**（产品版本 v1.72，commit `cd09143`）
> 对应产品版本：**v1.72**（承接 v1.71 巨型文件拆分）
> 需求来源：用户 2026-11-13 要求——「gzip 的实现」

---

## 一、问题与目标

前端构建产物是文本（JS / CSS / HTML），现在**既没有应用层压缩，部署模板里也没有开 Nginx gzip**。代价直接落在学生手机上：首屏要多下 2～3 倍的字节。

构建产物（2026-11-13 `npm run verify` 输出，`web/dist` 共 59 个文件 1,382,755 字节）：

| 产物 | 原始 | gzip | 压缩比 | 何时下载 |
| --- | --- | --- | --- | --- |
| `index-*.js`（入口） | 24.02 kB | 8.12 kB | −66% | **首屏** |
| `vendor-vue-*.js` | 107.53 kB | 41.86 kB | −61% | **首屏** |
| `index-bcP-FljE.css` | 10.63 kB | ~3 kB | ~−70% | **首屏** |
| `jspdf.es.min-*.js` | 390.82 kB | 128.85 kB | −67% | 点「保存为 PDF」时（动态 import） |
| `html2canvas.esm-*.js` | 202.38 kB | 48.04 kB | −76% | 同上 |
| `index.es-*.js` | 160.00 kB | 53.64 kB | −66% | 同上（由 jspdf chunk 引入） |

**首屏只加载前三个文件**（`web/dist/index.html` 只引用入口 JS 与 `vendor-vue`，已核对）：JS 合计 **131.6 kB → 约 50 kB（−62%）**，再加 CSS。早期版本的本段曾把 `index.es` 算进首屏，结论偏大，此处按实际依赖关系更正。

目标：所有文本响应（HTML / JS / CSS / JSON API）按 gzip 传输，已压缩格式（图片 / docx / 字体）不重复压；**无论有没有 Nginx 在前面都生效**（线上是 `8082` 直连，本地是 `5173` 经 Vite 代理，两条路径都可能绕过 Nginx）。

## 二、现状（证据）

1. `server/package.json` 的依赖只有 `express` 和 `tsx`，**没有 `compression` 中间件**；`server/src/index.ts` 里也没有任何 `Content-Encoding` 相关处理。
2. `deploy/nginx.conf` 全文 16 行，只有 `proxy_pass` 和几个请求头，**没有 `gzip` 指令**；`client_max_body_size` 还是 `1m`（那是另一个问题，见第十节）。
3. 静态资源走 `express.static`，`/assets` 带 `maxAge: 1y, immutable`（`server/src/index.ts:55`），缓存没问题，但**首次下载是明文**。
4. `update.sh` 的 L5 用 Node 的 `fetch` 访问 `/api/health` 和首页。Node 的 `fetch` **自带 `Accept-Encoding: gzip` 并自动解压**，所以压缩不会影响部署校验；首页指纹比对（`page.text.includes(EXPECTED_ASSET)`）也是比对解压后的文本，不受影响。

### 2.1 线上实测（2026-11-13，`http://47.111.175.191`）

| 请求 | 结果 |
| --- | --- |
| `GET http://47.111.175.191/`（80） | Nginx 1.28.3 提供的门户页 `LosAngelous · 个人服务控制台`；带 `Accept-Encoding: gzip` 返回 `Content-Encoding: gzip`（**该站已压缩**） |
| `GET http://47.111.175.191:8082/`（Vesta） | Node 直连（无 `Server` 头），返回 Vesta 首页 |
| `GET :8082/assets/index-C5o38drN.js` | 24,016 字节；带 gzip 请求**仍是** 24,016 字节，无 `Content-Encoding` |
| `GET :8082/assets/vendor-vue-DmHqEA-o.js` | 107,534 字节；同上，未压缩 |
| `GET :8082/assets/index-bcP-FljE.css` | 10,633 字节；同上，未压缩 |

结论：**Vesta 完全不经过 Nginx**，80 端口那份 gzip 配置对它无效，压缩只能做在 Node 层。

## 三、方案

原则：**应用层压缩为主（覆盖所有部署形态），Nginx 模板同步补上（避免让 Node 扛 CPU）**。

### 3.1 应用层：`compression` 中间件

在 `server/src/index.ts` 里挂在**静态资源与路由之前**（紧跟安全响应头之后）：

```ts
import compression from 'compression'

app.use(
  compression({
    threshold: 1024,           // 小于 1 KB 不压（/api/health 之类）
    level: 6,                  // 默认容量/CPU 平衡点
    // 已经压缩过的格式不要再压一遍
    filter: (req, res) => {
      const type = String(res.getHeader('Content-Type') ?? '')
      if (/^(image|audio|video)\//.test(type)) return false
      if (/zip|gzip|br|docx|pdf|octet-stream/i.test(type)) return false
      if (type.startsWith('text/event-stream')) return false
      return compression.filter(req, res)
    }
  })
)
```

要点：

- `threshold: 1024` 让 `/api/health` 这种小响应直接跳过，省 CPU；
- `compression` 默认会加 `Vary: Accept-Encoding`，CDN / 企业代理缓存不会串味，不用手写；
- 顺序很重要：必须在 `express.static` 和 `/api` 路由**之前** `use`，否则不会生效；
- 不要用 `level: 9`：文本多 1 个点只省 2～3%，CPU 翻倍，没意义；
- `express.static` 的 `immutable` 缓存头与 compression 兼容，不需要改。

### 3.2 Nginx 模板同步（`deploy/nginx.conf`）

```nginx
gzip on;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_proxied any;
gzip_types
    text/plain text/css text/xml
    application/javascript application/json
    application/xml image/svg+xml;
```

- Nginx 在 Node 前面时：上游已经带 `Content-Encoding` 的响应它不会重复压，**两层同时开是安全的**；如果希望把压缩交给 Nginx，也可以在 Node 里用 `COMPRESS=off` 关掉（见 3.3 的开关，不做强制）；
- 现状这台机器是 `8082` 直连（`docs/README.md` 有记），**所以真正让压缩生效的是 3.1**，Nginx 这段是给以后上反代/HTTPS 时准备的；
- 顺手把 `gzip_static on;` 留成注释：以后如果上 CDN，可以让构建产出 `.gz` 走静态压缩，CPU 归零。

### 3.3 开关（可选）

`server/src/env.ts` 加 `COMPRESS=off` 可关闭（默认开）。只在「前面有 Nginx/网关负责压缩，想省 Node CPU」时用；本地和直连部署不要关。

## 四、改动清单

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `server/package.json` | `dependencies` 加 `"compression": "^1.7.x"`；`devDependencies` 加 `"@types/compression"` | 会改 `package-lock.json` → 下次部署 L2 触发 `npm ci` |
| `server/src/index.ts` | 挂 `compression()`（第 43 行 `express.json()` 之前） | 核心改动，约 15 行 |
| `server/src/env.ts` | `compress: read('COMPRESS') !== 'off'` | 可选开关 |
| `deploy/nginx.conf` | 补 gzip 段 | 16 行 → 约 27 行 |
| `docs/README.md` | 「生产部署」补一句：文本响应默认 gzip；Nginx 模板已含 gzip | 1～2 行 |
| `.env.example` | 补 `COMPRESS=`（注释说明默认开） | 1 行 |

依赖只有一个（`compression` 自带 `accepts` / `bytes` / `compressible` / `on-headers` / `vary`，都是纯 JS 小包），没有原生模块，`npm ci` 不会引入编译风险。

## 五、边界（明确不做）

- 不做 Brotli（`shrink-ray` / 自己写 zlib 分支）：收益约 +15%，但要多维护一条路径，等真有带宽压力再说；
- 不做构建期预压缩（`gzip_static`）：等上 CDN 时再做；
- 不压图片 / docx / zip / PDF（本身已压缩，压了更大更慢）；
- 不改 `Cache-Control`、不改 `ETag`、不改静态资源路径；
- 不动 `update.sh` 的五层校验。

## 六、验证

1. `npm run typecheck`、`npm run build` 绿。
2. 本地起服务（`npm run dev` 或 `npm start`），逐项确认：

   ```bash
   # 1) 带 gzip 请求，看响应头
   curl -s -D- -o /dev/null -H 'Accept-Encoding: gzip' \
     http://127.0.0.1:8788/assets/$(ls web/dist/assets | grep '^index-' | head -1) \
     | grep -Ei 'content-encoding|vary|content-length'

   # 2) 压缩前后字节数对比
   RAW=$(curl -s -o /dev/null -w '%{size_download}' -H 'Accept-Encoding: identity' <url>)
   GZ=$(curl -s -o /dev/null -w '%{size_download}' -H 'Accept-Encoding: gzip' <url>)
   echo "raw=$RAW gz=$GZ"

   # 3) 小响应不应被压（应无 content-encoding: gzip）
   curl -s -D- -o /dev/null -H 'Accept-Encoding: gzip' http://127.0.0.1:8788/api/health | grep -i content-encoding
   ```

3. 浏览器 DevTools → Network：`index-*.js` 的 `Size` 明显小于 `Content`，响应头有 `Content-Encoding: gzip`。
4. 报告页关键路径走查：加载 → 轮询出报告 → 保存图片（html-to-image）→ 保存 PDF（jspdf 动态加载）→ 领取表单提交；确认没有乱码、没有「内容不完整」类报错。
5. 部署后 `bash update.sh` 五层校验仍全绿（重点看 L5 没被 `Content-Encoding` 影响）。
6. 记录压缩前后数据，回填到本文第十节。

## 七、风险与回滚

| 风险 | 处理 |
| --- | --- |
| 压缩大 JSON 增加 CPU，长轮询时反复压 | `/api/report/:slug?poll=1` 每 3 秒一次，响应可能几十 KB。`level: 6` + threshold 足够；若 CPU 吃紧，对 `/api/*` 单独降到 `level: 3` 或按 `Cache-Control: no-store` 跳过压缩 |
| 反过来压了已压缩内容（docx 导出） | `filter` 里显式排除 `docx/zip/octet-stream` |
| 中间层（CDN / 企业代理）缓存串味 | `Vary: Accept-Encoding` 由中间件自动加，不需要手写 |
| 双压（Nginx + Node） | Nginx 看到上游已带 `Content-Encoding` 会跳过；如需彻底避免，用 3.3 的 `COMPRESS=off` |
| `update.sh` L5 失败 | Node `fetch` 自动解压、自动协商，不改 L5 代码即可通过；真出问题时用 `--default` 参数回滚本次提交 |

回滚：删掉 `app.use(compression(...))` 一段、`npm uninstall compression @types/compression`，Nginx 段注释掉即可。零数据影响。

## 八、收益预估（2026-11-13 线上实测校正）

- 首屏 JS：131,550 字节 → 约 50 kB（**−62%**）；首屏 CSS：10,633 字节 → 约 3 kB；
- 报告页额外加载 `ReportView`（26.1 kB）+ `ReportBlocks`（25.6 kB）+ `ReportBlocks.css`（52.8 kB），同样各降 60% 左右；
- 导出 PDF 时才加载的 `jspdf` 390.8 kB 从 129 kB 起（对学生体感影响最大的是这一步）；
- 后台管理页懒加载 chunk 多在 19～26 kB：每个页面再省 60%；
- 服务器带宽：具体量级待上线后看 Nginx/Node 的访问量，不再拍数字。

## 九、待确认（已确认）

1. ~~线上到底有没有 Nginx？~~ **已确认（2026-11-13 实测）**：`47.111.175.191:80` 是 Nginx 1.28.3 上的「LosAngelous 个人服务控制台」门户页（该页已开 gzip）；**Vesta 本体在 `:8082` 由 Node 直连**，响应里没有 Nginx 痕迹。所以 §3.2 的 Nginx 段现在是**备用**，真正的修复是 §3.1 的 Node 层压缩。
2. **已确认**：接受新增运行时依赖 `compression`（用户 2026-11-13 选定）。实施时固定为 `~1.7.4`：1.8 会自动协商 Brotli，与本文「不做 Brotli」的边界冲突。
3. **已确认**：`deploy/nginx.conf` 的 `client_max_body_size` 一并从 `1m` 调到 `25m`，避免上反代后简历上传 413。

## 十、实施记录

2026-11-13 实施完成（产品版本 v1.72，已随 `cd09143` 提交）：

- `server/package.json`：`compression: ~1.7.4`、`@types/compression`（dev）。
- `server/src/index.ts`：安全响应头之后、`express.json()` 与所有路由之前挂 `compression({ threshold: 1024, level: 6, filter })`；`filter` 排除 `image|audio|video/*`、`zip|gzip|br|docx|pdf|octet-stream`、`text/event-stream`。
- `server/src/env.ts`：新增 `compress: read('COMPRESS') !== 'off'`；`.env.example` 补注释说明。
- `deploy/nginx.conf`：补 `gzip on / gzip_vary / gzip_comp_level 5 / gzip_min_length 1024 / gzip_proxied any / gzip_types`，`gzip_static on` 留注释；`client_max_body_size 1m → 25m`。
- `docs/README.md`：生产部署与常用环境变量补 gzip / `COMPRESS` 说明。
- 实测（临时 `DATA_DIR`，生产模式，端口 8816）：
  - `vendor-vue-*.js`：107,534 B（identity）→ 41,861 B（gzip），−61%；`index-*.css`：10,633 B → 3,276 B，−69%；响应头含 `Content-Encoding: gzip`、`Vary: Accept-Encoding`。
  - `/api/health`：97 B，无 `Content-Encoding`（低于 1 KB 阈值）。
  - `COMPRESS=off`：同一 JS 返回 107,534 B，无 `Content-Encoding`。
  - Playwright 打开 `/admin/login`：`index-*.js`、`vendor-vue`、`Login-*.js`、`index-*.css` 均以 gzip 下发，页面正常渲染，无脚本错误；唯一的 404 是 `/api/admin/dev-login`（生产环境不注册该路由，属既有行为，与 gzip 无关）。
- `npm run typecheck` / `npm run build` / `npm run verify` 全绿。
- 未做：真实报告页的「保存图片 / 保存 PDF / 领取表单」走查（需要生成报告，避免 AI 费用），留待上线后抽验；真机 `bash update.sh` 未执行。
