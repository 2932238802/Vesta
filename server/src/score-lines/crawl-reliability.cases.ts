/**
 * 抓取调度可靠性回归（CR-006 / T-022 ~ T-024）。
 *
 * 本地 HTTP 夹具 + 隔离 DATA_DIR，覆盖：
 * 1. 启动自愈：running → failed（stale），queued 续跑且不再阻塞；
 * 2. 单源 10 页上限；
 * 3. deadline 每页检查（注入短时限，延迟响应）；
 * 4. fetchResource 重试：500→200、429 Retry-After、网络错误重试 2 次，403/404 不重试；
 * 5. 状态 CLI 只读输出，数据库文件内容 / mtime 不变，缺库时清晰报错。
 *
 * 运行环境：`SCORELINE_CRAWL_ALLOW_PRIVATE=1` 允许抓 127.0.0.1；DATA_DIR 指向临时目录。
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vesta-crawl-reliability-'))
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
process.env.DATA_DIR = tempDir
process.env.SCORELINE_CRAWL_ALLOW_PRIVATE = '1'
process.env.LOG_LEVEL = 'error'

const PROVINCIAL_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>2025年浙江省专升本最低控制分数线</title></head>
<body><table>
<tr><th>科目</th><th>分数</th><th>满分</th></tr>
<tr><td>总分</td><td>180</td><td>300</td></tr>
</table></body></html>`

const EMPTY_PAGE = '<!doctype html><html><body><p>空页</p></body></html>'

const DUPLICATE_TABLES_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>2025年福建省专升本最低控制分数线</title></head>
<body>
<table><tr><th>科目</th><th>分数</th></tr><tr><td>总分</td><td>180</td></tr><tr><td>英语</td><td>60</td></tr></table>
<table><tr><th>科目</th><th>分数</th></tr><tr><td>总分</td><td>200</td></tr></table>
</body></html>`

function linksPage(prefix: string, count: number): string {
  const links = Array.from(
    { length: count },
    (_value, index) => `<a href="${prefix}${index + 1}.html">分数线公告 第${index + 1}条</a>`
  ).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>抓取可靠性夹具</title></head><body>${links}</body></html>`
}

const hits = new Map<string, number>()
function hit(pathname: string): number {
  const next = (hits.get(pathname) ?? 0) + 1
  hits.set(pathname, next)
  return next
}

const server = http.createServer((request, response) => {
  // 客户端在限流 / 私网拒绝时可能提前断开，吞掉 EPIPE，避免夹具用例被未处理错误打断。
  response.on('error', () => {})
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
  const count = hit(pathname)
  const send = (status: number, body: string, headers: Record<string, string> = {}): void => {
    response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers })
    response.end(body)
  }

  if (pathname === '/line.html') {
    send(200, PROVINCIAL_PAGE)
    return
  }
  if (pathname === '/budget/index.html') {
    send(200, linksPage('/budget/p/', 20))
    return
  }
  if (pathname.startsWith('/budget/p/')) {
    send(200, EMPTY_PAGE)
    return
  }
  if (/^\/multi\/s\d+\/index\.html$/.test(pathname)) {
    const prefix = pathname.replace(/index\.html$/, 'p/')
    send(200, linksPage(prefix, 20))
    return
  }
  if (/^\/multi\/s\d+\/p\//.test(pathname)) {
    send(200, EMPTY_PAGE)
    return
  }
  if (pathname === '/deadline/index.html' || pathname.startsWith('/deadline/p/')) {
    // 每次响应延迟 300ms；用例注入 500ms deadline：入口完成后、第二页重试前超时。
    setTimeout(() => {
      send(200, pathname === '/deadline/index.html' ? linksPage('/deadline/p/', 3) : EMPTY_PAGE)
    }, 300)
    return
  }
  if (pathname === '/retry/flaky') {
    send(count === 1 ? 500 : 200, count === 1 ? 'boom' : PROVINCIAL_PAGE)
    return
  }
  if (pathname === '/retry/forbidden') {
    send(403, 'no')
    return
  }
  if (pathname === '/retry/missing') {
    send(404, 'no')
    return
  }
  if (pathname === '/retry/ratelimit') {
    send(count === 1 ? 429 : 200, count === 1 ? 'slow' : PROVINCIAL_PAGE, count === 1 ? { 'retry-after': '0' } : {})
    return
  }
  if (pathname === '/retry/ratelimit-date') {
    // 过去的 HTTP 日期 → Retry-After 解析为 0，立即重试，不需要真等。
    const past = new Date(Date.now() - 60_000).toUTCString()
    send(count === 1 ? 429 : 200, count === 1 ? 'slow' : PROVINCIAL_PAGE, count === 1 ? { 'retry-after': past } : {})
    return
  }
  if (pathname === '/retry/ratelimit-no-header') {
    // 无 Retry-After → 走默认 1s 退避。
    send(count === 1 ? 429 : 200, count === 1 ? 'slow' : PROVINCIAL_PAGE)
    return
  }
  if (pathname === '/redirect/relative/start') {
    send(302, '', { location: '/redirect/relative/target' })
    return
  }
  if (pathname === '/redirect/relative/target') {
    send(200, PROVINCIAL_PAGE)
    return
  }
  if (pathname === '/redirect/absolute/start') {
    send(301, '', { location: '/line.html' })
    return
  }
  if (pathname === '/redirect/loop-a') {
    send(302, '', { location: '/redirect/loop-b' })
    return
  }
  if (pathname === '/redirect/loop-b') {
    send(302, '', { location: '/redirect/loop-a' })
    return
  }
  if (/^\/redirect\/chain\/\d+$/.test(pathname)) {
    const index = Number(pathname.slice('/redirect/chain/'.length))
    send(302, '', { location: `/redirect/chain/${index + 1}` })
    return
  }
  if (pathname === '/ssrf/start') {
    send(302, '', { location: `${baseUrl}/ssrf/internal` })
    return
  }
  if (pathname === '/ssrf/mapped') {
    const port = (server.address() as { port: number }).port
    send(302, '', { location: `http://[::ffff:127.0.0.1]:${port}/ssrf/internal` })
    return
  }
  if (pathname === '/ssrf/internal') {
    send(200, PROVINCIAL_PAGE)
    return
  }
  if (pathname === '/redirect/no-location') {
    response.writeHead(302)
    response.end()
    return
  }
  if (pathname === '/redirect/invalid-location') {
    send(302, '', { location: 'http://[::1' })
    return
  }
  if (pathname === '/guide/blocked') {
    send(
      200,
      '<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/guide/blocked-target"></head><body></body></html>'
    )
    return
  }
  if (pathname === '/guide/blocked-target') {
    send(403, 'no')
    return
  }
  if (pathname === '/blocked/forbidden') {
    send(403, 'no')
    return
  }
  if (pathname === '/blocked/unauthorized') {
    send(401, 'no')
    return
  }
  if (pathname === '/duplicate/tables.html') {
    send(200, DUPLICATE_TABLES_PAGE)
    return
  }
  if (pathname === '/size/declared') {
    const declared = 11 * 1024 * 1024
    response.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': String(declared)
    })
    // 客户端应只凭 Content-Length 就中止，不读正文。
    response.end(Buffer.alloc(declared, 'a'))
    return
  }
  if (pathname === '/size/stream') {
    // 无 Content-Length（chunked）：持续推流，客户端必须累计 >10MB 时主动中止；
    // 若错误地读完整个响应，会一直推到 64MB 或超时。
    response.writeHead(200, { 'content-type': 'application/octet-stream' })
    const chunk = Buffer.alloc(1024 * 1024, 'a')
    let sent = 0
    const timer = setInterval(() => {
      if (response.destroyed) {
        clearInterval(timer)
        return
      }
      response.write(chunk)
      sent += chunk.length
      if (sent > 64 * 1024 * 1024) {
        clearInterval(timer)
        response.end()
      }
    }, 2)
    response.on('close', () => clearInterval(timer))
    return
  }
  send(404, 'not found')
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('本地夹具端口获取失败')
const baseUrl = `http://127.0.0.1:${address.port}`

interface RunRow {
  id: string
  status: string
  started_at: string
  finished_at: string
  fetched: number
  saved: number
  failed: number
  message: string
  details: string
}

const runRow = (id: string): RunRow =>
  db.prepare('SELECT * FROM crawl_runs WHERE id = ?').get(id) as unknown as RunRow

const { initSchema } = await import('../db/schema')
const { db } = await import('../db/connection')
const { enqueueCrawl, runNext } = await import('./crawl')
const { recoverCrawlRuns } = await import('./crawl-recovery')
const { assertSafeUrl, fetchResource, isPrivateHostname, parseRetryAfter, resolveRedirectTarget } =
  await import('./crawl-fetch')
const { CRAWL_FAILURE_HINTS, crawlFailureHint } = await import('../../../shared/src/score-line')
const { pruneCrawlDocuments } = await import('./crawl-scheduler')
const { upsertSource } = await import('./sources')
const { log } = await import('../log')

let dbClosed = false
try {
  initSchema()

  // ---------- 1. 启动自愈 + queued 续跑 ----------
  upsertSource({
    name: '可靠性夹具-浙江',
    url: `${baseUrl}/line.html`,
    exam: 'upgrade',
    province: '浙江',
    parserId: 'html-table@1',
    discoverDepth: 0,
    verified: true,
    enabled: true
  })
  const queued = enqueueCrawl({ province: '浙江', years: [2025], trigger: 'manual' })
  assert.ok(!queued.code, `queued 应能入队：${queued.code ?? ''}`)
  const staleStarted = new Date(Date.now() - 90 * 60_000).toISOString()
  db.prepare(
    `INSERT INTO crawl_runs
       (id, source_id, province, priority, trigger, scope, status, started_at, finished_at,
        discovered, fetched, parsed, saved, failed, message, details, created_at)
     VALUES ('cr_stale_running', '', '浙江', 9, 'schedule', '{}', 'running', ?, '', 0, 0, 0, 0, 0, '', '[]', ?)`
  ).run(staleStarted, staleStarted)

  const recovered = recoverCrawlRuns()
  assert.equal(recovered.stale, 1, '应把 1 条遗留 running 标为 failed')
  assert.equal(recovered.queued, 1, '应识别到 1 条 queued')
  assert.ok(recovered.resume, '存在 queued 时应启动续跑')
  await recovered.resume
  const staleRun = runRow('cr_stale_running')
  assert.equal(staleRun.status, 'failed', '遗留 running 应改为 failed')
  assert.match(staleRun.message, /^stale:/, '遗留 running 的 message 应以 stale: 开头')
  assert.ok(staleRun.finished_at, '遗留 running 应写 finished_at')
  const resumedRun = runRow(queued.run.id)
  assert.notEqual(resumedRun.status, 'queued', 'queued 应已被续跑消费')
  assert.notEqual(resumedRun.status, 'running', '续跑应已结束')
  assert.equal(resumedRun.status, 'success', '续跑应成功')
  assert.equal(Number(resumedRun.saved), 1, '续跑应写入 1 个批次')
  const left = db
    .prepare("SELECT COUNT(*) AS count FROM crawl_runs WHERE status IN ('queued', 'running')")
    .get() as { count: number }
  assert.equal(Number(left.count), 0, '恢复后不应残留 queued / running，阻塞调度器')
  console.log('✓ 启动自愈：running→failed(stale)，queued 续跑成功且不再阻塞')

  // ---------- 2. 单源 10 页上限 ----------
  upsertSource({
    name: '可靠性夹具-江苏',
    url: `${baseUrl}/budget/index.html`,
    exam: 'upgrade',
    province: '江苏',
    parserId: 'html-table@1',
    discoverDepth: 1,
    verified: true,
    enabled: true
  })
  const budgetRun = enqueueCrawl({ province: '江苏', years: [2025], trigger: 'manual' })
  assert.ok(!budgetRun.code, `预算用例应能入队：${budgetRun.code ?? ''}`)
  await runNext({ requestIntervalMs: 0 })
  const budgetRow = runRow(budgetRun.run.id)
  assert.equal(Number(budgetRow.fetched), 10, '单源最多抓 10 页')
  const budgetDetails = JSON.parse(budgetRow.details) as string[]
  assert.ok(
    budgetDetails.some((detail) => detail.includes('单源') && detail.includes('10 页上限')),
    `应记录单源页数上限 detail，实际：${budgetDetails.join(' / ')}`
  )
  const budgetLinkHits = [...hits.entries()]
    .filter(([pathname]) => pathname.startsWith('/budget/p/'))
    .reduce((sum, [, value]) => sum + value, 0)
  assert.equal(budgetLinkHits, 9, '入口 + 9 个链接 = 10 页后停止，不应抓第 11 页')
  console.log('✓ 单源预算：入口 + 9 个链接后停在 10 页')

  // ---------- 3. 整轮 30 页用尽：后续来源不写 failed / 不刷新 last_run_at ----------
  const multiSources = [1, 2, 3].map((index) => ({
    name: `可靠性夹具-河南${index}`,
    url: `${baseUrl}/multi/s${index}/index.html`,
    tier: 'T0'
  }))
  multiSources.push({
    name: '可靠性夹具-河南4-未尝试',
    url: `${baseUrl}/multi/s4/index.html`,
    tier: 'T9'
  })
  for (const source of multiSources) {
    upsertSource({
      name: source.name,
      url: source.url,
      exam: 'upgrade',
      province: '河南',
      parserId: 'html-table@1',
      discoverDepth: 1,
      tier: source.tier,
      verified: true,
      enabled: true
    })
  }
  const untouchedAt = '2026-01-01T00:00:00.000Z'
  db.prepare(
    "UPDATE scoreline_sources SET last_run_at = ?, last_status = 'success', last_error = '' WHERE name = '可靠性夹具-河南4-未尝试'"
  ).run(untouchedAt)
  const untouchedBefore = db
    .prepare(
      "SELECT last_run_at, last_status FROM scoreline_sources WHERE name = '可靠性夹具-河南4-未尝试'"
    )
    .get() as { last_run_at: string; last_status: string }

  const multiRun = enqueueCrawl({ province: '河南', years: [2025], trigger: 'manual' })
  assert.ok(!multiRun.code, `多源预算用例应能入队：${multiRun.code ?? ''}`)
  await runNext({ requestIntervalMs: 0 })
  const multiRow = runRow(multiRun.run.id)
  assert.equal(Number(multiRow.fetched), 30, '整轮最多抓 30 页')
  const multiDetails = JSON.parse(multiRow.details) as string[]
  assert.ok(
    multiDetails.some((detail) => detail.includes('本 run 已达到 30 页上限')),
    `应记录整轮预算 detail，实际：${multiDetails.join(' / ')}`
  )
  const untouchedAfter = db
    .prepare(
      "SELECT last_run_at, last_status FROM scoreline_sources WHERE name = '可靠性夹具-河南4-未尝试'"
    )
    .get() as { last_run_at: string; last_status: string }
  assert.equal(
    untouchedAfter.last_run_at,
    untouchedBefore.last_run_at,
    '预算用尽后未尝试的来源不应刷新 last_run_at'
  )
  assert.equal(
    untouchedAfter.last_status,
    untouchedBefore.last_status,
    '预算用尽后未尝试的来源不应被标 failed'
  )
  const attempted = db
    .prepare(
      "SELECT COUNT(*) AS count FROM scoreline_sources WHERE province = '河南' AND last_run_at != '' AND last_run_at != ?"
    )
    .get(untouchedAt) as { count: number }
  assert.equal(Number(attempted.count), 3, '前 3 个来源应已运行，第 4 个保持未尝试')
  console.log('✓ 多源预算：第 30 页后停止，第 4 个来源保持未尝试（不写 failed / 不刷新）')

  // ---------- 4. deadline 每页检查 ----------
  upsertSource({
    name: '可靠性夹具-山东',
    url: `${baseUrl}/deadline/index.html`,
    exam: 'upgrade',
    province: '山东',
    parserId: 'html-table@1',
    discoverDepth: 1,
    verified: true,
    enabled: true
  })
  const deadlineRun = enqueueCrawl({ province: '山东', years: [2025], trigger: 'manual' })
  assert.ok(!deadlineRun.code, `时限用例应能入队：${deadlineRun.code ?? ''}`)
  const deadlineStarted = Date.now()
  await runNext({ deadline: deadlineStarted + 500, requestIntervalMs: 0 })
  const deadlineElapsed = Date.now() - deadlineStarted
  const deadlineRow = runRow(deadlineRun.run.id)
  assert.equal(Number(deadlineRow.fetched), 1, '入口取完后 deadline 已过，不再抓下一层')
  const deadlineDetails = JSON.parse(deadlineRow.details) as string[]
  assert.ok(
    deadlineDetails.some((detail) => detail.includes('budget:') && detail.includes('运行时限')),
    `应记录运行时限 budget detail，实际：${deadlineDetails.join(' / ')}`
  )
  assert.ok(deadlineElapsed < 3000, `deadline 应约束单页超时，不应拖到 30s 级：${deadlineElapsed}ms`)
  console.log('✓ deadline：每页检查 + fetch 单次超时受剩余时间约束，超时停止当前源')

  // ---------- 5. fetchResource 重试 / 不重试 ----------
  const retryEvents: Record<string, unknown>[] = []
  const originalInfo = log.info
  log.info = (message, fields) => {
    if (message === 'scoreline.fetch_retry') retryEvents.push(fields ?? {})
    originalInfo(message, fields)
  }

  const flaky = await fetchResource(`${baseUrl}/retry/flaky`)
  assert.equal(flaky.httpStatus, 200, '500→200 重试后应成功')
  assert.equal(hits.get('/retry/flaky'), 2, '500 应只重试 1 次')

  for (const pathname of ['/retry/forbidden', '/retry/missing']) {
    const before = hits.get(pathname) ?? 0
    await assert.rejects(fetchResource(`${baseUrl}${pathname}`), /HTTP 40[34]/)
    assert.equal(hits.get(pathname), before + 1, `${pathname} 不应重试`)
  }

  const limited = await fetchResource(`${baseUrl}/retry/ratelimit`)
  assert.equal(limited.httpStatus, 200, '429 Retry-After 后应成功')
  assert.equal(hits.get('/retry/ratelimit'), 2, '429 应重试 1 次')

  // Retry-After 纯函数：秒 / HTTP 日期 / 60s 上限 / 非法值回退。
  assert.equal(parseRetryAfter('5'), 5000, 'Retry-After 秒数应转毫秒')
  assert.equal(parseRetryAfter('999'), 60_000, 'Retry-After 秒数应封顶 60s')
  assert.equal(parseRetryAfter(null), null, '无 Retry-After 应返回 null')
  assert.equal(parseRetryAfter(''), null, '空 Retry-After 应返回 null')
  assert.equal(parseRetryAfter('not-a-date'), null, '非法 Retry-After 应返回 null')
  assert.equal(
    parseRetryAfter(new Date(Date.now() - 60_000).toUTCString()),
    0,
    '过去 HTTP 日期应视为 0'
  )
  assert.equal(
    parseRetryAfter(new Date(Date.now() + 120_000).toUTCString()),
    60_000,
    '未来 HTTP 日期应封顶 60s'
  )

  const dateLimited = await fetchResource(`${baseUrl}/retry/ratelimit-date`)
  assert.equal(dateLimited.httpStatus, 200, 'HTTP 日期 Retry-After 后应成功')
  assert.equal(hits.get('/retry/ratelimit-date'), 2, 'HTTP 日期 Retry-After 应只重试 1 次')

  const noHeaderBefore = retryEvents.length
  const noHeaderLimited = await fetchResource(`${baseUrl}/retry/ratelimit-no-header`)
  assert.equal(noHeaderLimited.httpStatus, 200, '429 无 Retry-After 后应成功')
  assert.equal(hits.get('/retry/ratelimit-no-header'), 2, '429 无 Retry-After 应只重试 1 次')
  const noHeaderRetry = retryEvents
    .slice(noHeaderBefore)
    .find((event) => event.reason === 'http_429')
  assert.equal(Number(noHeaderRetry?.delayMs), 1000, '429 无 Retry-After 应回退 1s 退避')

  // assertSafeUrl 在重试循环外：非法协议 / 带账号密码都不应进入重试。
  const safeBefore = retryEvents.length
  assert.throws(() => assertSafeUrl('ftp://example.com/line'), /只允许 http\/https/)
  await assert.rejects(fetchResource('ftp://example.com/line'), /只允许 http\/https/)
  await assert.rejects(fetchResource('http://user:pass@example.com/line'), /不能带账号密码/)
  assert.equal(retryEvents.length, safeBefore, 'assertSafeUrl 失败不应产生重试日志')

  const networkTarget = 'http://127.0.0.1:1/unreachable'
  const networkBefore = retryEvents.filter((event) => event.reason === 'network').length
  await assert.rejects(fetchResource(networkTarget), /fetch failed|ECONNREFUSED/)
  const networkRetries = retryEvents
    .filter((event) => event.reason === 'network')
    .slice(networkBefore)
  assert.equal(networkRetries.length, 2, '网络错误应重试 2 次（1s / 3s）')
  assert.deepEqual(
    networkRetries.map((event) => event.attempt),
    [1, 2],
    '重试日志的 attempt 应为 1、2'
  )
  const statusRetry = retryEvents.find((event) => event.reason === 'http_500')
  assert.ok(statusRetry && Number(statusRetry.delayMs) === 1000, '5xx 首轮退避应为 1s')
  log.info = originalInfo
  console.log('✓ 重试：500/429/网络错误按退避重试，403/404 不重试，Retry-After 边界与 assertSafeUrl 已覆盖')

  // ---------- 5b. 重定向安全：逐跳校验 / 循环 / 超跳 / 相对 Location / 正常跳转 ----------
  assert.equal(isPrivateHostname('127.0.0.1'), true)
  assert.equal(isPrivateHostname('10.1.2.3'), true)
  assert.equal(isPrivateHostname('192.168.1.1'), true)
  assert.equal(isPrivateHostname('169.254.1.1'), true)
  assert.equal(isPrivateHostname('172.16.0.1'), true)
  assert.equal(isPrivateHostname('172.31.255.1'), true)
  assert.equal(isPrivateHostname('172.32.0.1'), false)
  assert.equal(isPrivateHostname('[::1]'), true)
  assert.equal(isPrivateHostname('printer.local'), true)
  // P2-1：编码变体与特殊地址（WHATWG URL 会把 ::ffff:127.0.0.1 规范化为 [::ffff:7f00:1]）。
  for (const host of [
    '0',
    '0.0.0.0',
    '::',
    '[::]',
    '::ffff:127.0.0.1',
    '[::ffff:7f00:1]',
    '[::ffff:10.0.0.1]',
    '[::ffff:a00:1]',
    '[64:ff9b::7f00:1]',
    '[64:ff9b::a00:1]',
    '[64:ff9b:1::1]',
    '[::7f00:1]',
    '[fc00::1]',
    '[fe80::1]',
    '[ff02::1]'
  ]) {
    assert.equal(isPrivateHostname(host), true, `${host} 应判为内网`)
  }
  // 公网地址与域名仍放行。
  for (const host of [
    '8.8.8.8',
    '223.5.5.5',
    '[2400:3200::1]',
    '[64:ff9b::808:808]',
    'www.zjzs.net',
    'example.com'
  ]) {
    assert.equal(isPrivateHostname(host), false, `${host} 不应判为内网`)
  }

  // 重定向目标解析：非法 / 缺失由 fetchOnce 与用例共同覆盖；HTTPS→HTTP 生产拒绝。
  assert.throws(
    () => resolveRedirectTarget('https://www.zjzs.net/a', 'http://www.zjzs.net/b'),
    /HTTPS→HTTP/
  )
  assert.doesNotThrow(() =>
    resolveRedirectTarget('https://www.zjzs.net/a', 'http://www.zjzs.net/b', {
      allowDowngrade: true
    })
  )
  assert.throws(
    () =>
      resolveRedirectTarget('http://www.zjzs.net/a', 'http://[::1]/', {
        allowPrivate: () => false
      }),
    /不允许抓取内网地址/
  )
  assert.throws(
    () => resolveRedirectTarget('http://www.zjzs.net/a', 'http://[::1', {}),
    /Location 不是合法 URL/
  )

  const internalBefore = hits.get('/ssrf/internal') ?? 0
  await assert.rejects(
    // 只允许入口这一跳；重定向到内网地址必须在发起第二次请求前被拒绝。
    fetchResource(`${baseUrl}/ssrf/start`, {
      allowPrivate: (target) => target.pathname === '/ssrf/start'
    }),
    /不允许抓取内网地址/
  )
  assert.equal(hits.get('/ssrf/start'), 1, '入口只应请求 1 次')
  assert.equal(hits.get('/ssrf/internal') ?? 0, internalBefore, '私网 Location 不应发出第二次请求')

  const mappedBefore = hits.get('/ssrf/internal') ?? 0
  await assert.rejects(
    // IPv4-mapped IPv6（[::ffff:127.0.0.1]）同样必须在第二次请求前拒绝。
    fetchResource(`${baseUrl}/ssrf/mapped`, {
      allowPrivate: (target) => target.pathname === '/ssrf/mapped'
    }),
    /不允许抓取内网地址/
  )
  assert.equal(hits.get('/ssrf/mapped'), 1, '入口只应请求 1 次')
  assert.equal(
    hits.get('/ssrf/internal') ?? 0,
    mappedBefore,
    'IPv4-mapped IPv6 私网 Location 不应发出第二次请求'
  )

  await assert.rejects(fetchResource(`${baseUrl}/redirect/no-location`), /缺少 Location/)
  assert.equal(hits.get('/redirect/no-location'), 1, '缺失 Location 不应重试')
  await assert.rejects(
    fetchResource(`${baseUrl}/redirect/invalid-location`),
    /Location 不是合法 URL/
  )
  assert.equal(hits.get('/redirect/invalid-location'), 1, '非法 Location 不应重试')

  await assert.rejects(fetchResource(`${baseUrl}/redirect/loop-a`), /循环重定向/)
  assert.equal(hits.get('/redirect/loop-a'), 1)
  assert.equal(hits.get('/redirect/loop-b'), 1, '循环只应跟到发现重复为止')

  await assert.rejects(fetchResource(`${baseUrl}/redirect/chain/0`), /超过 5 跳重定向/)
  assert.equal(hits.get('/redirect/chain/5'), 1, '最多请求到第 5 跳')
  assert.equal(hits.get('/redirect/chain/6') ?? 0, 0, '超 5 跳后不再请求下一跳')

  const relative = await fetchResource(`${baseUrl}/redirect/relative/start`)
  assert.equal(relative.httpStatus, 200)
  assert.equal(
    relative.finalUrl,
    `${baseUrl}/redirect/relative/target`,
    '相对 Location 应解析为绝对 URL'
  )
  assert.match(relative.contentType, /text\/html/)
  assert.ok(new TextDecoder().decode(relative.content).includes('最低控制分数线'))

  const absolute = await fetchResource(`${baseUrl}/redirect/absolute/start`)
  assert.equal(absolute.httpStatus, 200, '正常 301 跳转应成功')
  assert.equal(absolute.finalUrl, `${baseUrl}/line.html`)
  console.log(
    '✓ 重定向：逐跳校验拒私网（0 次内网请求）、循环 / 超 5 跳明确失败、相对 Location 与正常跳转可用'
  )

  // ---------- 5c. 下载限流：Content-Length / 流式累计 >10MB 立即中止 ----------
  const declaredStarted = Date.now()
  await assert.rejects(fetchResource(`${baseUrl}/size/declared`), /超过 10MB/)
  assert.ok(Date.now() - declaredStarted < 5000, '有 Content-Length 时应在读正文前拒绝')
  assert.equal(hits.get('/size/declared'), 1, '超大响应不应重试')

  const streamStarted = Date.now()
  await assert.rejects(fetchResource(`${baseUrl}/size/stream`), /超过 10MB/)
  assert.ok(Date.now() - streamStarted < 10000, '无 Content-Length 时应边读边中止，而不是等整包')
  assert.equal(hits.get('/size/stream'), 1, '超大流式响应不应重试')
  console.log('✓ 下载限流：Content-Length 预检 + 流式累计 >10MB 中止，均不重试')

  // ---------- 5d. 401/403 → blocked，不重试，文档 / 来源错误带机读前缀 ----------
  for (const scenario of [
    { province: '辽宁', path: '/blocked/forbidden', status: 403 },
    { province: '黑龙江', path: '/blocked/unauthorized', status: 401 }
  ]) {
    upsertSource({
      name: `可靠性夹具-${scenario.province}`,
      url: `${baseUrl}${scenario.path}`,
      exam: 'upgrade',
      province: scenario.province,
      parserId: 'html-table@1',
      discoverDepth: 0,
      verified: true,
      enabled: true
    })
    const blockedRun = enqueueCrawl({
      province: scenario.province,
      years: [2025],
      trigger: 'manual'
    })
    assert.ok(!blockedRun.code, `${scenario.province} 应能入队：${blockedRun.code ?? ''}`)
    await runNext({ requestIntervalMs: 0 })
    const blockedRow = runRow(blockedRun.run.id)
    assert.equal(blockedRow.status, 'failed', `${scenario.status} 应判失败`)
    assert.match(blockedRow.message, /^blocked:/, 'run 失败信息应以 blocked: 开头')
    const blockedDoc = db
      .prepare(
        'SELECT http_status, error FROM crawl_documents WHERE run_id = ? ORDER BY fetched_at DESC LIMIT 1'
      )
      .get(blockedRun.run.id) as { http_status: number; error: string }
    assert.equal(Number(blockedDoc.http_status), scenario.status, '应记录真实 401/403 状态码')
    assert.match(blockedDoc.error, /^blocked:/, 'crawl_documents.error 应以 blocked: 开头')
    const blockedSource = db
      .prepare('SELECT last_error FROM scoreline_sources WHERE province = ?')
      .get(scenario.province) as { last_error: string }
    assert.match(blockedSource.last_error, /^blocked:/, '来源 last_error 应以 blocked: 开头')
    assert.equal(hits.get(scenario.path), 1, `${scenario.status} 不应重试`)
  }

  // 引导页第二跳 403：入口 200 → meta refresh 目标 403，也应映射 blocked、不重试。
  upsertSource({
    name: '可靠性夹具-广西',
    url: `${baseUrl}/guide/blocked`,
    exam: 'upgrade',
    province: '广西',
    parserId: 'html-table@1',
    discoverDepth: 0,
    verified: true,
    enabled: true
  })
  const guideRun = enqueueCrawl({ province: '广西', years: [2025], trigger: 'manual' })
  assert.ok(!guideRun.code, `引导页 blocked 用例应能入队：${guideRun.code ?? ''}`)
  await runNext({ requestIntervalMs: 0 })
  const guideRow = runRow(guideRun.run.id)
  assert.equal(guideRow.status, 'failed', '引导页第二跳 403 应判失败')
  assert.match(guideRow.message, /^blocked:/, '引导页 blocked 的 run 信息应以 blocked: 开头')
  const guideDoc = db
    .prepare('SELECT parse_status, http_status, error FROM crawl_documents WHERE run_id = ?')
    .get(guideRun.run.id) as { parse_status: string; http_status: number; error: string }
  assert.equal(guideDoc.parse_status, 'failed')
  assert.equal(Number(guideDoc.http_status), 403, '引导页第二跳应记录真实 403')
  assert.match(guideDoc.error, /^blocked:/, '引导页第二跳 document.error 应以 blocked: 开头')
  const guideSource = db
    .prepare('SELECT last_error FROM scoreline_sources WHERE province = ?')
    .get('广西') as { last_error: string }
  assert.match(guideSource.last_error, /^blocked:/, '引导页来源 last_error 应以 blocked: 开头')
  assert.equal(hits.get('/guide/blocked-target'), 1, '引导页第二跳 403 不应重试')

  assert.deepEqual(crawlFailureHint('blocked: HTTP 403'), {
    code: 'blocked',
    ...CRAWL_FAILURE_HINTS.blocked
  })
  assert.match(CRAWL_FAILURE_HINTS.blocked.next, /官方 JSON/)
  console.log('✓ 403/401：映射 blocked、请求 1 次、不重试，run / document / 来源错误一致')

  // ---------- 5e. 多表重复指标：去重后写入成功，不误报 network ----------
  upsertSource({
    name: '可靠性夹具-福建',
    url: `${baseUrl}/duplicate/tables.html`,
    exam: 'upgrade',
    province: '福建',
    parserId: 'html-table@1',
    discoverDepth: 0,
    verified: true,
    enabled: true
  })
  const duplicateRun = enqueueCrawl({ province: '福建', years: [2025], trigger: 'manual' })
  assert.ok(!duplicateRun.code, `多表去重用例应能入队：${duplicateRun.code ?? ''}`)
  const parseIssues: Record<string, unknown>[] = []
  const originalParseInfo = log.info
  log.info = (message, fields) => {
    if (message === 'scoreline.parse_issue') parseIssues.push(fields ?? {})
    originalParseInfo(message, fields)
  }
  await runNext({ requestIntervalMs: 0 })
  log.info = originalParseInfo
  const duplicateRow = runRow(duplicateRun.run.id)
  assert.equal(duplicateRow.status, 'success', '多表重复科目不应让整页失败')
  assert.equal(Number(duplicateRow.saved), 1)
  const duplicateDoc = db
    .prepare('SELECT parse_status, error, note, url FROM crawl_documents WHERE run_id = ?')
    .get(duplicateRun.run.id) as {
    parse_status: string
    error: string
    note: string
    url: string
  }
  assert.equal(duplicateDoc.parse_status, 'parsed')
  assert.equal(duplicateDoc.error, '', '不应误报 network / 唯一键错误')
  assert.match(
    duplicateDoc.note,
    /duplicate_table_metric/,
    'document.note 应保留 duplicate_table_metric issue'
  )
  assert.equal(
    duplicateDoc.url,
    `${baseUrl}/duplicate/tables.html`,
    '无重定向时应记录实际抓取地址'
  )
  assert.ok(
    parseIssues.some((event) => String(event.issue).includes('duplicate_table_metric')),
    '成功路径应写 scoreline.parse_issue 结构化日志'
  )
  const duplicateMetrics = db
    .prepare(
      `SELECT m.subject_code, m.value FROM scoreline_metrics m
       JOIN scoreline_batches b ON b.id = m.batch_id
       WHERE b.source_name = '可靠性夹具-福建' AND m.subject_code = 'total'`
    )
    .all() as unknown as { subject_code: string; value: number }[]
  assert.equal(duplicateMetrics.length, 1, '写入后该科目只应有 1 条指标')
  assert.equal(Number(duplicateMetrics[0].value), 180, '保留第一张表的值')
  console.log('✓ 多表重复：写入成功、指标只 1 条、无唯一键 / network 误报')

  // ---------- 6. prune 90 天快照：旧行 + 旧文件删除，新行 + 新文件保留，结构化分数线不动 ----------
  const pruneDir = path.join(tempDir, 'prune-fixture')
  fs.mkdirSync(pruneDir, { recursive: true })
  const oldAt = new Date(Date.now() - 100 * 24 * 3600_000).toISOString()
  const freshAt = new Date().toISOString()
  const insertDoc = db.prepare(
    `INSERT INTO crawl_documents
       (id, run_id, source_id, url, http_status, content_type, checksum, storage_path,
        parser_id, parse_status, error, note, shape, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertDocRow = (id: string, url: string, storagePath: string, fetchedAt: string): void => {
    insertDoc.run(id, '', '', url, 200, 'text/html', '', storagePath, 'html-table@1', 'parsed', '', '', '', fetchedAt)
  }
  const batchCountBefore = (
    db.prepare('SELECT COUNT(*) AS count FROM scoreline_batches').get() as { count: number }
  ).count
  const oldFiles: string[] = []
  db.exec('BEGIN')
  for (let index = 0; index < 1005; index += 1) {
    const file = path.join(pruneDir, `old-${index}.html`)
    fs.writeFileSync(file, 'old')
    oldFiles.push(file)
    insertDocRow(`cd_old_${index}`, `https://example.edu/old-${index}`, file, oldAt)
  }
  // 空路径行与「不可删」的目录路径：只删行、跳过文件，不中断整轮清理。
  insertDocRow('cd_old_no_path', 'https://example.edu/old-no-path', '', oldAt)
  const undeletableDir = path.join(pruneDir, 'not-a-file-dir')
  fs.mkdirSync(undeletableDir)
  insertDocRow('cd_old_dir', 'https://example.edu/old-dir', undeletableDir, oldAt)
  const freshFiles = [
    path.join(pruneDir, 'fresh-a.html'),
    path.join(pruneDir, 'fresh-b.html')
  ]
  freshFiles.forEach((file, index) => {
    fs.writeFileSync(file, 'fresh')
    insertDocRow(`cd_fresh_${index}`, `https://example.edu/fresh-${index}`, file, freshAt)
  })
  db.exec('COMMIT')

  const pruned = pruneCrawlDocuments(90)
  assert.equal(pruned, 1007, '应清理 1005 个旧文件行 + 1 条空路径 + 1 条不可删目录条目')
  const oldRows = (
    db.prepare("SELECT COUNT(*) AS count FROM crawl_documents WHERE id LIKE 'cd_old_%'").get() as {
      count: number
    }
  ).count
  assert.equal(Number(oldRows), 0, '旧行应全部删除（含 >1000 条的分批清理）')
  assert.equal(
    oldFiles.filter((file) => fs.existsSync(file)).length,
    0,
    '旧快照文件应全部删除，不再产生孤儿'
  )
  const freshRows = (
    db
      .prepare("SELECT COUNT(*) AS count FROM crawl_documents WHERE id LIKE 'cd_fresh_%'")
      .get() as { count: number }
  ).count
  assert.equal(Number(freshRows), 2, '新行应保留')
  assert.ok(freshFiles.every((file) => fs.existsSync(file)), '新快照文件应保留')
  const remainingPaths = db
    .prepare("SELECT storage_path FROM crawl_documents WHERE storage_path != ''")
    .all() as unknown as { storage_path: string }[]
  assert.ok(
    remainingPaths.every((row) => fs.existsSync(row.storage_path)),
    '剩余 crawl_documents 不应出现「有行无文件」孤儿'
  )
  const batchCountAfter = (
    db.prepare('SELECT COUNT(*) AS count FROM scoreline_batches').get() as { count: number }
  ).count
  assert.equal(Number(batchCountAfter), Number(batchCountBefore), '结构化分数线不应被 prune 删除')
  assert.ok(Number(batchCountBefore) > 0, '前置应已有结构化批次，证明比较有效')
  console.log('✓ prune：旧行 / 旧文件删除，新行 / 新文件保留，结构线不变，>1000 行分批清理')

  // ---------- 7. 状态 CLI（只读） ----------
  const nowIso = new Date().toISOString()
  const oldStarted = new Date(Date.now() - 90 * 60_000).toISOString()
  db.prepare(
    `INSERT INTO crawl_runs
       (id, source_id, province, priority, trigger, scope, status, started_at, finished_at,
        discovered, fetched, parsed, saved, failed, message, details, created_at)
     VALUES ('cr_cli_running', '', '浙江', 0, 'schedule', '{}', 'running', ?, '', 0, 0, 0, 1, 0, '', '[]', ?)`
  ).run(oldStarted, oldStarted)
  db.prepare(
    `INSERT INTO crawl_runs
       (id, source_id, province, priority, trigger, scope, status, started_at, finished_at,
        discovered, fetched, parsed, saved, failed, message, details, created_at)
     VALUES ('cr_cli_queued', '', '江苏', 0, 'schedule', '{}', 'queued', '', '', 0, 0, 0, 0, 0, '', '[]', ?)`
  ).run(nowIso)

  db.close()
  dbClosed = true

  function snapshot(): Map<string, { hash: string; mtimeMs: number }> {
    const result = new Map<string, { hash: string; mtimeMs: number }>()
    for (const name of ['vesta.db', 'vesta.db-wal', 'vesta.db-shm']) {
      const file = path.join(tempDir, name)
      if (!fs.existsSync(file)) continue
      result.set(name, {
        hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
        mtimeMs: fs.statSync(file).mtimeMs
      })
    }
    return result
  }

  const cliPath = path.join(repoRoot, 'scripts/scoreline-crawl-status.ts')
  const before = snapshot()
  const cli = spawnSync(process.execPath, ['--import', 'tsx', cliPath], {
    cwd: repoRoot,
    env: { ...process.env, DATA_DIR: tempDir, LOG_LEVEL: 'error' },
    encoding: 'utf8'
  })
  assert.equal(cli.status, 0, `CLI 应成功退出：${cli.stderr}`)
  for (const expected of [
    '运行中：1',
    '排队中：1',
    '疑似卡住：1',
    'cr_cli_running',
    'cr_cli_queued',
    '可靠性夹具-浙江',
    '状态 success',
    '下次'
  ]) {
    assert.ok(cli.stdout.includes(expected), `CLI 输出应包含「${expected}」：\n${cli.stdout}`)
  }
  const after = snapshot()
  // 只读连接在 WAL 模式可能创建 / 触碰 -shm；主库文件内容与 mtime 必须不变。
  assert.equal(after.get('vesta.db')?.hash, before.get('vesta.db')?.hash, 'CLI 不应修改主库内容')
  assert.equal(
    after.get('vesta.db')?.mtimeMs,
    before.get('vesta.db')?.mtimeMs,
    'CLI 不应修改主库 mtime'
  )

  const missing = spawnSync(process.execPath, ['--import', 'tsx', cliPath], {
    cwd: repoRoot,
    env: { ...process.env, DATA_DIR: path.join(tempDir, 'missing-data') },
    encoding: 'utf8'
  })
  assert.notEqual(missing.status, 0, '数据库不存在时 CLI 应非 0 退出')
  assert.match(missing.stderr, /数据库不存在/, '数据库不存在时应给出清晰提示')
  console.log('✓ 状态 CLI：输出关键字段，只读不改库，缺库清晰报错')
} finally {
  if (!dbClosed) db.close()
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  fs.rmSync(tempDir, { recursive: true, force: true })
}
