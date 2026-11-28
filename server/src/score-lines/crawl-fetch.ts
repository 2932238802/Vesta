import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { isIP } from 'node:net'
import { config } from '../env'
import { log } from '../log'
import { db } from '../db/connection'
import { newId, now } from '../db/core'

/** 按 URL 判定是否允许内网；仅供用例注入，生产不传时使用 config。 */
export type PrivateAccessPolicy = (url: URL) => boolean

function ipv4Octets(host: string): number[] | null {
  const parts = host.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((part) => Number(part))
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null
  return octets
}

/** 回环 / RFC1918 / 链路本地 / CGNAT / `0.0.0.0` / 组播与保留段。 */
function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

/** 展开 IPv6（含内嵌 IPv4）为 8 个 16 位分组；非法返回 null。 */
function ipv6Groups(host: string): number[] | null {
  let text = host
  if (text.includes('.')) {
    const lastColon = text.lastIndexOf(':')
    const octets = ipv4Octets(text.slice(lastColon + 1))
    if (!octets) return null
    const high = ((octets[0] << 8) | octets[1]).toString(16)
    const low = ((octets[2] << 8) | octets[3]).toString(16)
    text = `${text.slice(0, lastColon + 1)}${high}:${low}`
  }
  const [head, tail] = text.split('::') as [string, string?]
  const parse = (segment: string | undefined): number[] =>
    segment
      ? segment
          .split(':')
          .filter(Boolean)
          .map((group) => parseInt(group, 16))
      : []
  const front = parse(head)
  const back = tail === undefined ? [] : parse(tail)
  const zeros = tail === undefined ? 0 : 8 - front.length - back.length
  if (zeros < 0) return null
  const groups = [...front, ...Array<number>(zeros).fill(0), ...back]
  if (groups.length !== 8) return null
  if (groups.some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) return null
  return groups
}

function ipv4FromGroups(groups: number[]): number[] {
  return [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff]
}

function isPrivateIpv6(groups: number[]): boolean {
  const zeros = (count: number): boolean =>
    groups.slice(0, count).every((group) => group === 0)
  if (zeros(8)) return true // ::
  if (zeros(7) && groups[7] === 1) return true // ::1
  if ((groups[0] & 0xfe00) === 0xfc00) return true // fc00::/7
  if ((groups[0] & 0xffc0) === 0xfe80) return true // fe80::/10
  if ((groups[0] & 0xff00) === 0xff00) return true // ff00::/8 组播
  // IPv4-mapped ::ffff:0:0/96（WHATWG 会把 ::ffff:127.0.0.1 规范化为 [::ffff:7f00:1]）。
  if (zeros(5) && groups[5] === 0xffff) return isPrivateIpv4(ipv4FromGroups(groups))
  // IPv4-compatible ::/96（含 ::127.0.0.1）。
  if (zeros(6)) return isPrivateIpv4(ipv4FromGroups(groups))
  // NAT64：well-known 64:ff9b::/96 按内嵌 IPv4 判定；本地前缀 64:ff9b:1::/48 整体拒绝。
  if (groups[0] === 0x64 && groups[1] === 0xff9b) {
    if (groups.slice(2, 6).every((group) => group === 0)) {
      return isPrivateIpv4(ipv4FromGroups(groups))
    }
    if (groups[2] === 1) return true
  }
  return false
}

/**
 * 纯函数：判定主机名是否属于内网 / 回环 / 链路本地 / mDNS。
 * 接受 URL.hostname 形态（IPv6 可能带方括号），先规范化再判定。
 */
export function isPrivateHostname(hostname: string): boolean {
  const raw = hostname.toLowerCase()
  const host = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw
  if (!host) return false
  // `http://0/` 会被 WHATWG URL 规范化为 0.0.0.0；纯函数也兼容直接传 "0" 的调用。
  if (host === '0') return true
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true
  const family = isIP(host)
  if (family === 4) {
    const octets = ipv4Octets(host)
    return octets ? isPrivateIpv4(octets) : false
  }
  if (family === 6) {
    const groups = ipv6Groups(host)
    return groups ? isPrivateIpv6(groups) : false
  }
  return false
}

export function assertSafeUrl(value: string, allowPrivate?: PrivateAccessPolicy): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('抓取地址不是合法 URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('只允许 http/https')
  if (url.username || url.password) throw new Error('抓取地址不能带账号密码')
  if (allowPrivate ? allowPrivate(url) : config.scorelineCrawlAllowPrivate) return url
  if (isPrivateHostname(url.hostname)) throw new Error('不允许抓取内网地址')
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

/** 401/403 → 返回状态码，供抓取器映射 `blocked`；其它错误返回 null。 */
export function blockedStatusOf(error: unknown): number | null {
  return error instanceof FetchStatusError && (error.status === 401 || error.status === 403)
    ? error.status
    : null
}

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

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024
/** 最多跟随 5 次重定向；每次跟随前都重新做 SSRF 校验。 */
const MAX_REDIRECTS = 5

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

async function cancelBody(response: Response): Promise<void> {
  if (!response.body) return
  try {
    await response.body.cancel()
  } catch {
    // 取消失败不影响后续重试判断
  }
}

/** 边读边计数，累计超过 10MB 立即中止；不把整包读进内存。 */
async function readLimitedBody(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    await cancelBody(response)
    throw new FetchFatalError(`响应超过 10MB（Content-Length: ${declared}），已拒绝下载`)
  }
  if (!response.body) return new Uint8Array(0)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new FetchFatalError('响应超过 10MB，已中止下载')
      }
      chunks.push(value)
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // 已中止的流释放锁可能抛错，忽略
    }
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

export interface RedirectOptions {
  allowPrivate?: PrivateAccessPolicy
  /** 测试 / 本地放行时允许 HTTPS→HTTP；生产默认 false。 */
  allowDowngrade?: boolean
}

/**
 * 解析并校验一个重定向目标：相对 Location、HTTPS→HTTP、逐跳 SSRF 校验。
 * 不安全 / 非法时抛 `FetchFatalError`（不重试）；供 fetchOnce 与用例复用。
 */
export function resolveRedirectTarget(
  currentUrl: string,
  location: string,
  options: RedirectOptions = {}
): URL {
  let next: URL
  try {
    next = new URL(location, currentUrl)
  } catch {
    throw new FetchFatalError('redirect: Location 不是合法 URL')
  }
  let current: URL
  try {
    current = new URL(currentUrl)
  } catch {
    throw new FetchFatalError('redirect: 当前地址不是合法 URL')
  }
  // HTTPS→HTTP 会暴露明文，仅在本地测试放行时允许。
  if (current.protocol === 'https:' && next.protocol === 'http:' && !options.allowDowngrade) {
    throw new FetchFatalError('redirect: 拒绝 HTTPS→HTTP 降级')
  }
  try {
    // 关键：跟随前先校验目标，内网 / 回环 / .local 不会发出第二次请求。
    assertSafeUrl(next.toString(), options.allowPrivate)
  } catch (error) {
    throw new FetchFatalError(`redirect: 目标地址不安全（${(error as Error).message}）`)
  }
  return next
}

async function fetchOnce(
  url: string,
  deadline?: number,
  allowPrivate?: PrivateAccessPolicy
): Promise<{
  content: Uint8Array
  contentType: string
  httpStatus: number
  finalUrl: string
}> {
  let current = url
  const visited = new Set<string>([current])
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController()
    // 每次重试 / 每次重定向跳转都重新计时；同时受整轮 deadline 约束。
    const remaining = deadline === undefined ? FETCH_TIMEOUT_MS : deadline - Date.now()
    const timeoutMs = Math.max(1, Math.min(FETCH_TIMEOUT_MS, remaining))
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'VestaScoreLine/1.0 (internal research; contact admin)',
          Accept:
            'text/html,application/xhtml+xml,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json;q=0.9,*/*;q=0.5'
        }
      })
      if (isRedirectStatus(response.status)) {
        const location = response.headers.get('location')
        await cancelBody(response)
        if (!location) {
          throw new FetchFatalError(`redirect: HTTP ${response.status} 缺少 Location`)
        }
        const next = resolveRedirectTarget(current, location, {
          allowPrivate,
          allowDowngrade: config.scorelineCrawlAllowPrivate
        })
        const nextUrl = next.toString()
        if (visited.has(nextUrl)) throw new FetchFatalError('redirect: 检测到循环重定向')
        if (hop >= MAX_REDIRECTS) {
          throw new FetchFatalError(`redirect: 超过 ${MAX_REDIRECTS} 跳重定向`)
        }
        visited.add(nextUrl)
        current = nextUrl
        continue
      }
      if (!response.ok) {
        await cancelBody(response)
        throw new FetchStatusError(response.status, response.headers.get('retry-after'))
      }
      const content = await readLimitedBody(response)
      return {
        content,
        contentType: response.headers.get('content-type') ?? '',
        httpStatus: response.status,
        finalUrl: current
      }
    } finally {
      clearTimeout(timer)
    }
  }
  // 循环内已在超跳时抛错；此行只保证类型完整。
  throw new FetchFatalError(`redirect: 超过 ${MAX_REDIRECTS} 跳重定向`)
}

export interface FetchResourceOptions {
  deadline?: number
  /** 仅供用例注入：按 URL 覆盖内网放行策略；生产不传，使用 config。 */
  allowPrivate?: PrivateAccessPolicy
}

/**
 * 抓取一个资源：网络错误 / 429 / 5xx 退避重试 2 次（1s / 3s）。
 * 429 优先尊重 Retry-After（秒或 HTTP 日期，上限 60s）；403 / 404 等确定性 4xx 不重试。
 * 传入 `deadline`（整轮截止时间）时，单次尝试与退避都不会越过截止时间。
 * 每次重定向跳转都会重新校验目标地址，最多跟随 5 跳。
 */
export async function fetchResource(
  url: string,
  options: FetchResourceOptions = {}
): Promise<{
  content: Uint8Array
  contentType: string
  httpStatus: number
  finalUrl: string
}> {
  assertSafeUrl(url, options.allowPrivate)
  for (let attempt = 0; ; attempt += 1) {
    if (options.deadline !== undefined && Date.now() > options.deadline) {
      throw new FetchFatalError('deadline: 抓取时间已用尽')
    }
    try {
      return await fetchOnce(url, options.deadline, options.allowPrivate)
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
