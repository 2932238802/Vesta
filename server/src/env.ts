import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const rootDir = path.resolve(here, '../..')

for (const file of [path.join(rootDir, '.env'), path.join(rootDir, 'server/.env')]) {
  try {
    process.loadEnvFile(file)
  } catch {
    // .env 不是必需的，环境变量也可以直接注入
  }
}

const isProd = process.env.NODE_ENV === 'production'

const rawLogLevel = read('LOG_LEVEL')?.toLowerCase()
const logLevel: 'debug' | 'info' | 'warn' | 'error' =
  rawLogLevel === 'debug' || rawLogLevel === 'info' || rawLogLevel === 'warn' || rawLogLevel === 'error'
    ? rawLogLevel
    : isProd
      ? 'info'
      : 'debug'

function read(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

function readDays(name: string, fallback: number): number {
  const value = Number(read(name))
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

const adminUser = read('ADMIN_USER') ?? ''
const adminPassword = read('ADMIN_PASSWORD') ?? ''

if (isProd && (!adminUser || !adminPassword)) {
  throw new Error('缺少管理员账号，请在根目录 .env 中配置 ADMIN_USER 与 ADMIN_PASSWORD')
}

if (!isProd && (!adminUser || !adminPassword)) {
  console.warn('[env] 本地开发未配置管理员账号，已启用免密登录；设置 DEV_GUEST_LOGIN=false 可关闭')
}

const authSecret = read('AUTH_SECRET') ?? (() => {
  if (isProd) {
    throw new Error('生产环境必须配置 AUTH_SECRET，建议使用 32 位以上随机字符串')
  }
  console.warn('[env] 未配置 AUTH_SECRET，开发环境将使用临时密钥，重启后登录失效')
  return `dev-${Math.random().toString(36).slice(2)}${Date.now()}`
})()

if (isProd && authSecret.length < 24) {
  console.warn('[env] AUTH_SECRET 偏短，建议至少 32 位')
}

export const config = {
  isProd,
  logLevel,
  // 文本响应默认 gzip。只有当前面已经有 Nginx/网关负责压缩、想省 Node CPU 时才设 COMPRESS=off。
  compress: read('COMPRESS') !== 'off',
  // 仅显式 development 环境可用；npm start / 生产环境都不会开放免密登录。
  devGuestLogin: process.env.NODE_ENV === 'development' && read('DEV_GUEST_LOGIN') !== 'false',
  rootDir,
  port: Number(read('PORT') ?? 8787),
  dataDir: (() => {
    const raw = read('DATA_DIR') ?? 'data'
    return path.isAbsolute(raw) ? raw : path.join(rootDir, raw)
  })(),
  adminUser,
  adminPassword,
  authSecret,
  contactKey: read('CONTACT_KEY') ?? authSecret,
  publicBaseUrl: read('PUBLIC_BASE_URL') ?? '',
  // 只有部署在 Nginx 等反向代理后面时才信任 X-Forwarded-For；
  // 直接对公网监听时必须关闭，否则限流可以伪造请求头绕过。
  trustProxy: read('TRUST_PROXY') === 'true',
  // 登录有效期，单位秒；默认 30 天，登录状态会保留在浏览器里
  sessionTtl: Number(read('SESSION_TTL') ?? 60 * 60 * 24 * 30),
  deepseekApiKey: read('AI_API_KEY') ?? read('DEEPSEEK_API_KEY'),
  // 不在代码里写死服务商地址；必须由 .env 注入。
  deepseekBaseUrl: read('AI_BASE_URL') ?? read('DEEPSEEK_BASE_URL') ?? '',
  deepseekModel: read('AI_MODEL') ?? read('DEEPSEEK_MODEL') ?? 'deepseek-chat',
  bochaApiKey: read('BOCHA_API_KEY'),
  bochaBaseUrl: read('BOCHA_BASE_URL') ?? '',
  aiTimeoutMs: Number(read('AI_TIMEOUT_MS') ?? 240_000),
  // 原始事件保留期；漏斗事实 event_facts 永久保留，不受影响。
  eventRetentionDays: readDays('EVENT_RETENTION_DAYS', 180),
  eventOperationalRetentionDays: readDays('EVENT_OPERATIONAL_RETENTION_DAYS', 365),
  // 分数线抓取：默认开启；测试环境可关。一次只跑一个省，页面可插队。
  scorelineCrawl: read('SCORELINE_CRAWL') !== 'off',
  scorelineCrawlProvinceMinutes: Number(read('SCORELINE_CRAWL_PROVINCE_MINUTES') ?? 30),
  scorelineCrawlIntervalMinutes: Number(read('SCORELINE_CRAWL_INTERVAL_MINUTES') ?? 10),
  // 仅本地 fixture 测试用；生产不要打开，避免 SSRF。
  scorelineCrawlAllowPrivate: read('SCORELINE_CRAWL_ALLOW_PRIVATE') === '1'
}
