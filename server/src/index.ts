import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { config } from './env'
import { adminRouter } from './routes/admin'
import { publicRouter } from './routes/public'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', config.trustProxy ? 1 : false)

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
  console.error('[server]', error)
  res.status(500).json({ error: '服务器出了点问题，请稍后再试' })
})

function warnIncompleteConfig(): void {
  if (config.deepseekApiKey && !config.deepseekBaseUrl) {
    console.warn(
      '[配置] 已配置 AI_API_KEY/DEEPSEEK_API_KEY，但缺少 AI_BASE_URL/DEEPSEEK_BASE_URL；AI 报告和咨询稿会不可用。'
    )
  }
  if (config.bochaApiKey && !config.bochaBaseUrl) {
    console.warn(
      '[配置] 已配置 BOCHA_API_KEY，但缺少 BOCHA_BASE_URL；联网检索会不可用。'
    )
  }
}

const server = app.listen(config.port, () => {
  warnIncompleteConfig()
  console.log(`Vesta 已启动 http://127.0.0.1:${config.port}`)
  console.log(`数据目录 ${config.dataDir}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[server] 端口 ${config.port} 已被占用。请停止占用该端口的旧服务，或换一个端口后重试。`
    )
  } else {
    console.error('[server] 启动失败', error)
  }
  process.exit(1)
})

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
