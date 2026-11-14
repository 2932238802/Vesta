import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../env'
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

export async function fetchResource(url: string): Promise<{
  content: Uint8Array
  contentType: string
  httpStatus: number
}> {
  assertSafeUrl(url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (buffer.byteLength > 10 * 1024 * 1024) throw new Error('响应超过 10MB')
    return {
      content: buffer,
      contentType: response.headers.get('content-type') ?? '',
      httpStatus: response.status
    }
  } finally {
    clearTimeout(timer)
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
}): void {
  db.prepare(
    `INSERT INTO crawl_documents
     (id, run_id, source_id, url, http_status, content_type, checksum, storage_path,
      parser_id, parse_status, error, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    now()
  )
}
