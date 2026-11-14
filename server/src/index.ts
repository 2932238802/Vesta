import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import compression from 'compression'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { config } from './env'
import { pruneEvents } from './db/events'
import { log } from './log'
import {
  generateSubmission,
  isAiConfigured,
  MAX_AI_ATTEMPTS
} from './ai/generate'
import { resumeUnfinishedReports, startReportQueue } from './ai/report-queue'
import { adminRouter } from './routes/admin/index'
import { publicRouter } from './routes/public'
import { pruneCrawlDocuments, startScorelineScheduler } from './score-lines/crawl-scheduler'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', config.trustProxy ? 1 : false)

/** 邀请 token、报告 slug 是访问凭证，请求日志里只保留路由占位符。 */
function logPath(pathname: string): string {
  return pathname
    .replace(/^\/api\/invite\/[^/]+/, '/api/invite/:token')
    .replace(/^\/api\/report\/[^/]+/, '/api/report/:slug')
    .replace(/^\/i\/[^/]+/, '/i/:token')
    .replace(/^\/r\/[^/]+/, '/r/:slug')
}

/** Express 在子路由里会临时改写 req.path，日志统一用不会被改写的 originalUrl。 */
function requestPath(req: Request): string {
  return (req.originalUrl || req.url).split('?')[0]
}

// 请求日志：放在 express.json() 之前，JSON 解析失败也能留下请求线索。
app.use((req, res, next) => {
  const reqId = crypto.randomBytes(4).toString('hex')
  res.locals.reqId = reqId
  res.setHeader('X-Request-Id', reqId)
  // 路由可能改写 req.path / req.query，进入路由前先把日志要的字段固定下来。
  const pathname = requestPath(req)
  const sensitiveQueryKey =
    /^(wechat|weixin|phone|mobile|tel|token|code|password|passwd|secret|apikey|api_key|contact|openid)$/i
  const queryKeys = [...new URLSearchParams(req.originalUrl.split('?')[1] ?? '').keys()].filter(
    (key) => !sensitiveQueryKey.test(key)
  )
  const started = process.hrtime.bigint()
  res.on('finish', () => {
    // 静态资源、成功的健康检查和 304 一次页面加载会产生大量噪音，直接排除。
    if (res.statusCode === 304) return
    if (pathname.startsWith('/assets/')) return
    if (pathname === '/api/health' && res.statusCode < 400) return
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    const fields = {
      reqId,
      method: req.method,
      path: logPath(pathname),
      ...(queryKeys.length ? { queryKeys: queryKeys.join(',') } : {}),
      status: res.statusCode,
      ms: Math.round(ms),
      ip: req.ip ?? '',
      ua: (req.get('user-agent') ?? '').slice(0, 80)
    }
    if (ms > 3000) log.warn('http', fields)
    else log.info('http', fields)
  })
  next()
})

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      // 简历图片预览通过 blob: URL 展示，需要单独放行。
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'self'"
    ].join('; ')
  )
  if (config.isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

// 文本响应（HTML / JS / CSS / JSON）默认 gzip。必须挂在静态资源和所有路由之前。
// 已压缩格式（图片 / zip / docx / pdf）不再压一遍；事件流不能缓冲。
if (config.compress) {
  app.use(
    compression({
      threshold: 1024,
      level: 6,
      filter: (req, res) => {
        const type = String(res.getHeader('Content-Type') ?? '')
        if (/^(image|audio|video)\//i.test(type)) return false
        if (/zip|gzip|br|docx|pdf|octet-stream/i.test(type)) return false
        if (type.startsWith('text/event-stream')) return false
        return compression.filter(req, res)
      }
    })
  )
}

app.use(express.json({ limit: '4mb' }))

app.use('/api/admin', adminRouter)
app.use('/api', publicRouter)
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

const webDist = path.join(config.rootDir, 'web/dist')
const indexFile = path.join(webDist, 'index.html')

if (fs.existsSync(indexFile)) {
  app.use('/assets', express.static(path.join(webDist, 'assets'), { maxAge: '1y', immutable: true }))
  app.use(express.static(webDist, { index: false, maxAge: '1h' }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(indexFile)
  })
} else {
  app.get('/', (req, res) => {
    res.status(503).type('text/plain').send('前端尚未构建，先运行 npm run build')
  })
}

app.use((req, res) => {
  res.status(404).json({ error: '页面不存在' })
})

app.use((error: Error & { status?: number }, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error)
    return
  }
  if (error instanceof SyntaxError && error.status === 400) {
    res.status(400).json({ error: '请求格式不对' })
    return
  }
  log.error('http.error', {
    reqId: res.locals.reqId,
    method: req.method,
    path: logPath(requestPath(req)),
    err: error
  })
  res.status(500).json({ error: '服务器出了点问题，请稍后再试' })
})

function warnIncompleteConfig(): void {
  if (config.deepseekApiKey && !config.deepseekBaseUrl) {
    log.warn('config.incomplete', {
      detail:
        '已配置 AI_API_KEY/DEEPSEEK_API_KEY，但缺少 AI_BASE_URL/DEEPSEEK_BASE_URL；AI 报告和咨询稿会不可用。'
    })
  }
  if (config.bochaApiKey && !config.bochaBaseUrl) {
    log.warn('config.incomplete', {
      detail: '已配置 BOCHA_API_KEY，但缺少 BOCHA_BASE_URL；联网检索会不可用。'
    })
  }
}

const server = app.listen(config.port, () => {
  warnIncompleteConfig()
  log.info('server.started', {
    url: `http://127.0.0.1:${config.port}`,
    dataDir: config.dataDir,
    logLevel: config.logLevel
  })
  pruneEventLogs()
  pruneCrawlSnapshot()
  startScorelineScheduler()
  // 报告队列：端口起来之后才注册 runner 和续跑，避免端口占用时还在花钱跑 AI。
  startReportQueue(generateSubmission)
  if (isAiConfigured()) {
    resumeUnfinishedReports({ maxAttempts: MAX_AI_ATTEMPTS })
  } else {
    log.warn('ai.unavailable', {
      stage: 'startup_resume',
      reason: 'AI 分析还没有配置，跳过未完成报告的续跑'
    })
  }
  // 单进程部署，不需要文件锁；unref 让定时器不阻止进程退出。
  setInterval(pruneEventLogs, 24 * 60 * 60 * 1000).unref()
})

function pruneEventLogs(): void {
  try {
    const result = pruneEvents({
      retentionDays: config.eventRetentionDays,
      operationalRetentionDays: config.eventOperationalRetentionDays
    })
    if (result.business || result.operational) {
      log.info('events.pruned', {
        business: result.business,
        operational: result.operational,
        retentionDays: config.eventRetentionDays,
        operationalRetentionDays: config.eventOperationalRetentionDays
      })
    }
  } catch (error) {
    log.error('events.prune_failed', { err: error })
  }
}

function pruneCrawlSnapshot(): void {
  try {
    const pruned = pruneCrawlDocuments(90)
    if (pruned) log.info('scoreline.crawl_documents_pruned', { pruned, days: 90 })
  } catch (error) {
    log.error('scoreline.crawl_prune_failed', { err: error })
  }
}

server.on('error', (error: NodeJS.ErrnoException) => {
  log.error('server.start_failed', {
    port: config.port,
    code: error.code,
    hint:
      error.code === 'EADDRINUSE'
        ? `端口 ${config.port} 已被占用。请停止占用该端口的旧服务，或换一个端口后重试。`
        : undefined,
    err: error
  })
  process.exit(1)
})

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// 未捕获异常和未处理的 Promise 拒绝必须留下日志再退出，交给 systemd Restart=always 拉起。
process.on('uncaughtException', (error) => {
  log.error('process.uncaught_exception', { err: error })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.error('process.unhandled_rejection', { err: reason })
  process.exit(1)
})
