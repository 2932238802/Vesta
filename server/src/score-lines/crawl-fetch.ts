import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../env'
import { log } from '../log'
import { db } from '../db/connection'
import { newId, now } from '../db/core'

export function assertSafeUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('抓取地址不是合法 URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('只允许 http/https')
  if (url.username || url.password) throw new Error('抓取地址不能带账号密码')
  if (config.scorelineCrawlAllowPrivate) return url
  const host = url.hostname.toLowerCase()
  const isIpv6 = host.includes(':')
  const privateHost =
    host === 'localhost' ||
    host === '::1' ||
    host === '[::1]' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith('.local') ||
    (isIpv6 && (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')))
  if (privateHost) throw new Error('不允许抓取内网地址')
  return url
}

/** 单次请求超时；每次尝试都新建 AbortController，重试不会复用已中止的信号。 */
const FETCH_TIMEOUT_MS = 30_000
/** 最多重试 2 次（即最多 3 次尝试），退避间隔见 RETRY_DELAYS_MS。 */
const RETRY_DELAYS_MS = [1000, 3000]
const MAX_RETRY_AFTER_MS = 60_000

/** HTTP 非 2xx：带状态码，供重试策略判断是否确定性失败。 */
class FetchStatusError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null
  ) {
    super(`HTTP ${status}`)
  }
}

/** 请求本身成功但不该重试的错误（响应过大 / 断言失败等）。 */
class FetchFatalError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Retry-After 支持秒数或 HTTP 日期；解析失败返回 null，交给默认退避。 */
export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null
  const text = value.trim()
  if (!text) return null
  if (/^\d+$/.test(text)) return Math.min(Number(text) * 1000, MAX_RETRY_AFTER_MS)
  const timestamp = Date.parse(text)
  if (Number.isNaN(timestamp)) return null
  return Math.min(Math.max(0, timestamp - Date.now()), MAX_RETRY_AFTER_MS)
}

/** 429 与 5xx 可重试；403 / 404 等确定性 4xx 不重试。 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

/** 日志只保留来源站点路径，去掉 query / hash，避免带入查询参数里的敏感值。 */
function safeTarget(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return ''
  }
}

async function fetchOnce(
  url: string,
  deadline?: number
): Promise<{
  content: Uint8Array
  contentType: string
  httpStatus: number
}> {
  const controller = new AbortController()
  // 有整轮 deadline 时，单次尝试也不能超过剩余时间，避免重试把时限放大到 90s+。
  const remaining = deadline === undefined ? FETCH_TIMEOUT_MS : deadline - Date.now()
  const timeoutMs = Math.max(1, Math.min(FETCH_TIMEOUT_MS, remaining))
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'VestaScoreLine/1.0 (internal research; contact admin)',
        Accept:
          'text/html,application/xhtml+xml,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json;q=0.9,*/*;q=0.5'
      }
    })
    if (!response.ok) {
      // 不读错误正文，直接释放响应体，避免连接悬挂。
      if (response.body) {
        try {
          await response.body.cancel()
        } catch {
          // 取消失败不影响后续重试判断
        }
      }
      throw new FetchStatusError(response.status, response.headers.get('retry-after'))
    }
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (buffer.byteLength > 10 * 1024 * 1024) throw new FetchFatalError('响应超过 10MB')
    return {
      content: buffer,
      contentType: response.headers.get('content-type') ?? '',
      httpStatus: response.status
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 抓取一个资源：网络错误 / 429 / 5xx 退避重试 2 次（1s / 3s）。
 * 429 优先尊重 Retry-After（秒或 HTTP 日期，上限 60s）；403 / 404 等确定性 4xx 不重试。
 * 传入 `deadline`（整轮截止时间）时，单次尝试与退避都不会越过截止时间。
 */
export async function fetchResource(
  url: string,
  options: { deadline?: number } = {}
): Promise<{
  content: Uint8Array
  contentType: string
  httpStatus: number
}> {
  assertSafeUrl(url)
  for (let attempt = 0; ; attempt += 1) {
    if (options.deadline !== undefined && Date.now() > options.deadline) {
      throw new FetchFatalError('deadline: 抓取时间已用尽')
    }
    try {
      return await fetchOnce(url, options.deadline)
    } catch (error) {
      if (error instanceof FetchFatalError) throw error
      const status = error instanceof FetchStatusError ? error.status : 0
      const retryable = error instanceof FetchStatusError ? isRetryableStatus(status) : true
      // 已经是最后一次尝试，或确定性失败：直接把原错误抛给调用方。
      if (attempt >= RETRY_DELAYS_MS.length || !retryable) throw error
      const retryAfter =
        status === 429 && error instanceof FetchStatusError
          ? parseRetryAfter(error.retryAfter)
          : null
      const delayMs = retryAfter ?? RETRY_DELAYS_MS[attempt]
      // 退避会越过 deadline 时直接停止，不再等待一轮注定过期的重试。
      if (options.deadline !== undefined && Date.now() + delayMs > options.deadline) {
        throw new FetchFatalError('deadline: 抓取时间已用尽')
      }
      log.info('scoreline.fetch_retry', {
        attempt: attempt + 1,
        status: status || undefined,
        target: safeTarget(url),
        delayMs,
        reason: status ? `http_${status}` : 'network'
      })
      await sleep(delayMs)
    }
  }
}

function extensionOf(contentType: string, url: string): string {
  if (contentType.includes('pdf')) return 'pdf'
  if (/sheet|excel|spreadsheet/.test(contentType)) return 'xlsx'
  if (contentType.includes('json')) return 'json'
  const match = /\.([a-z0-9]{2,5})(?:$|\?)/i.exec(url)
  return match?.[1] ?? 'html'
}

export function saveSnapshot(
  content: Uint8Array,
  contentType: string,
  url: string
): { checksum: string; storagePath: string } {
  const checksum = crypto.createHash('sha256').update(content).digest('hex')
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const dir = path.join(config.dataDir, 'crawl', day)
  fs.mkdirSync(dir, { recursive: true })
  const storagePath = path.join(dir, `${checksum}.${extensionOf(contentType, url)}`)
  if (!fs.existsSync(storagePath)) fs.writeFileSync(storagePath, content)
  return { checksum, storagePath }
}

export function insertDocument(input: {
  runId: string
  sourceId: string
  url: string
  httpStatus: number
  contentType: string
  checksum: string
  storagePath: string
  parserId: string
  parseStatus: string
  error?: string
  /** 实际入口（引导页跟随后）等备注 */
  note?: string
  /** 页面形状 JSON：tables / rows / cols / links */
  shape?: string
}): void {
  db.prepare(
    `INSERT INTO crawl_documents
     (id, run_id, source_id, url, http_status, content_type, checksum, storage_path,
      parser_id, parse_status, error, note, shape, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId('cd'),
    input.runId,
    input.sourceId,
    input.url,
    input.httpStatus,
    input.contentType,
    input.checksum,
    input.storagePath,
    input.parserId,
    input.parseStatus,
    input.error ?? '',
    input.note ?? '',
    input.shape ?? '',
    now()
  )
}
