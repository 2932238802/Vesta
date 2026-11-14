import type { CrawlRun, CrawlStatus, ScoreLineSource } from '../../../shared/src/score-line'
import { batchChecksum } from '../../../shared/src/score-line'
import { config } from '../env'
import { log } from '../log'
import { db } from '../db/connection'
import { newId, now } from '../db/core'
import { findBatchId, getBatch, saveBatch } from './batch-store'
import {
  refreshCoverage,
  refreshNationalCoverage,
  refreshProvinceCoverage
} from './coverage'
import { fetchResource, insertDocument, saveSnapshot } from './crawl-fetch'
import { followTarget, selectCandidates } from './discovery'
import { mergeNotes, normalizeParsedBatch } from './normalize'
import { parseContent } from './parsers'
import type { ParsedBatch, ParserContext } from './parsers/types'
import { markSourceRun, sourcesForProvince } from './sources'
import { anomalyIssues, batchValueIssues } from './validate'

interface RunRow {
  id: string
  source_id: string
  province: string
  priority: number
  trigger: string
  scope: string
  status: string
  started_at: string
  finished_at: string
  discovered: number
  fetched: number
  parsed: number
  saved: number
  failed: number
  message: string
  details: string
  created_at: string
}

function runFromRow(row: RunRow): CrawlRun {
  return {
    id: row.id,
    sourceId: row.source_id,
    province: row.province,
    priority: Number(row.priority),
    trigger: row.trigger,
    status: row.status as CrawlStatus,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    discovered: Number(row.discovered),
    fetched: Number(row.fetched),
    parsed: Number(row.parsed),
    saved: Number(row.saved),
    failed: Number(row.failed),
    message: row.message,
    createdAt: row.created_at
  }
}

function getRunRow(id: string): RunRow | null {
  return (db.prepare('SELECT * FROM crawl_runs WHERE id = ?').get(id) as RunRow | undefined) ?? null
}

export function getRun(id: string): { run: CrawlRun; documents: unknown[] } | null {
  const row = getRunRow(id)
  if (!row) return null
  const documents = db
    .prepare(
      'SELECT id, url, http_status, content_type, parse_status, error, note, shape, fetched_at FROM crawl_documents WHERE run_id = ? ORDER BY fetched_at LIMIT 100'
    )
    .all(id)
  return { run: runFromRow(row), documents }
}

export function getQueue(): {
  running: CrawlRun | null
  queue: (CrawlRun & { position: number })[]
} {
  const runningRow = db
    .prepare("SELECT * FROM crawl_runs WHERE status = 'running' ORDER BY started_at LIMIT 1")
    .get() as RunRow | undefined
  const queued = db
    .prepare("SELECT * FROM crawl_runs WHERE status = 'queued' ORDER BY priority DESC, created_at")
    .all() as unknown as RunRow[]
  return {
    running: runningRow ? runFromRow(runningRow) : null,
    queue: queued.map((row, index) => ({ ...runFromRow(row), position: index + 1 }))
  }
}

export interface EnqueueInput {
  province: string
  years?: number[]
  trigger?: 'schedule' | 'manual' | 'retry'
}

export function enqueueCrawl(input: EnqueueInput): {
  run: CrawlRun
  position: number
  existing: boolean
  code?: string
} {
  const province = input.province === '全国' ? '全国' : input.province.trim()
  if (sourcesForProvince(province).length === 0) {
    return { run: {} as CrawlRun, position: 0, existing: false, code: 'NO_SOURCE' }
  }
  const existing = db
    .prepare(
      "SELECT * FROM crawl_runs WHERE province = ? AND status IN ('queued', 'running') ORDER BY created_at LIMIT 1"
    )
    .get(province) as RunRow | undefined
  if (existing) {
    const queue = getQueue().queue
    const position = queue.findIndex((run) => run.id === existing.id)
    return {
      run: runFromRow(existing),
      position: existing.status === 'running' ? 0 : position + 1,
      existing: true
    }
  }
  const id = newId('cr')
  db.prepare(
    `INSERT INTO crawl_runs
     (id, source_id, province, priority, trigger, scope, status, started_at, finished_at,
      discovered, fetched, parsed, saved, failed, message, details, created_at)
     VALUES (?, '', ?, ?, ?, ?, 'queued', '', '', 0, 0, 0, 0, 0, '', '[]', ?)`
  ).run(
    id,
    province,
    input.trigger === 'manual' ? 1 : 0,
    input.trigger ?? 'schedule',
    JSON.stringify({ years: input.years ?? [] }),
    now()
  )
  const row = getRunRow(id) as RunRow
  const queue = getQueue().queue
  return {
    run: runFromRow(row),
    position: queue.findIndex((run) => run.id === id) + 1,
    existing: false
  }
}

export function cancelQueuedRun(id: string): boolean {
  const result = db
    .prepare(
      "UPDATE crawl_runs SET status = 'failed', message = '已取消', finished_at = ? WHERE id = ? AND status = 'queued'"
    )
    .run(now(), id)
  return Number(result.changes) > 0
}

interface SourceStats {
  fetched: number
  parsed: number
  saved: number
  failed: number
  discovered: number
  /** 索引页数量：只有索引页的 run 记 index，不再误判 failed。 */
  indexPages: number
  /** 本次实际写入的年份，覆盖刷新按这些年份重算。 */
  years: number[]
  /** 失败码（按出现顺序），run / source 的 last_error 以首个失败码开头。 */
  codes: string[]
  details: string[]
}

function emptyStats(): SourceStats {
  return {
    fetched: 0,
    parsed: 0,
    saved: 0,
    failed: 0,
    discovered: 0,
    indexPages: 0,
    years: [],
    codes: [],
    details: []
  }
}

function contextFor(source: ScoreLineSource): ParserContext {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    exam: source.exam,
    province: source.province,
    schoolId: source.schoolId || undefined,
    urlInclude: source.urlInclude
  }
}

/** 解析失败码统一写成 `code: detail`，覆盖页据此给下一步。 */
function codedError(result: Awaited<ReturnType<typeof parseContent>>): string {
  if (result.failure) return `${result.failure.code}: ${result.failure.detail}`
  return result.issues.slice(0, 3).join('；') || 'parse: 没有识别到可写库的数据'
}

function failureCodeOf(error: string): string {
  const match =
    /^(network|entry_redirect|no_table|unsupported_table|no_text_layer|parse|decode|needs_seed)\s*[:：]/.exec(
      error.trim()
    )
  return match?.[1] ?? 'parse'
}

/** 失败码 + 细节；覆盖页的 crawlFailureHint() 只认行首失败码。 */
function diagnostics(stats: SourceStats): string {
  if (stats.codes.length === 0) return ''
  const detail = stats.details.slice(0, 5).join('；')
  return detail ? `${stats.codes[0]}: ${detail}` : `${stats.codes[0]}: 抓取失败`
}

function statusOf(stats: SourceStats): CrawlStatus {
  if (stats.saved > 0) return stats.failed > 0 ? 'partial' : 'success'
  if (stats.indexPages > 0 && stats.failed === 0) return 'index'
  return 'failed'
}

/** 从 URL / 文件名里的 8 位日期取发布日；取不到留空，不猜。 */
export function publishedAtFromUrl(url: string): string {
  const match = /(20\d{2})(\d{2})(\d{2})/.exec(url)
  if (!match) return ''
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  return `${match[1]}-${match[2]}-${match[3]}`
}

function pageContextFor(source: ScoreLineSource, url: string): ParserContext {
  return {
    ...contextFor(source),
    sourceUrl: url,
    publishedAt: publishedAtFromUrl(url)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function processParsedBatches(
  batches: ParsedBatch[],
  context: ParserContext,
  years: number[],
  stats: SourceStats
): Promise<void> {
  for (const raw of batches) {
    stats.parsed += 1
    if (years.length && !years.includes(raw.year)) continue
    const normalized = normalizeParsedBatch(raw, context)
    if (!normalized.batch) {
      stats.failed += 1
      stats.codes.push('parse')
      stats.details.push(`未写库：${normalized.issues.join('；')}`)
      continue
    }
    const valueIssues = batchValueIssues(normalized.batch)
    if (valueIssues.length) {
      stats.failed += 1
      stats.codes.push('parse')
      stats.details.push(`未写库：${valueIssues.join('；')}`)
      continue
    }
    const previousId = findBatchId(normalized.batch)
    const previous = previousId ? getBatch(previousId)?.metrics ?? [] : []
    const anomalies = anomalyIssues(normalized.batch, previous)
    if (anomalies.length) normalized.batch.note = mergeNotes(normalized.batch.note, anomalies)
    saveBatch(normalized.batch, {
      reviewStatus: 'pending',
      checksum: batchChecksum(normalized.batch),
      fetchedAt: now()
    })
    // 单校批次即时刷新；省级 / 全国在 run 结束后统一刷新，避免每个批次重算全省。
    if (normalized.batch.schoolId) {
      refreshCoverage(normalized.batch.schoolId, normalized.batch.exam, normalized.batch.year)
    }
    if (!stats.years.includes(normalized.batch.year)) stats.years.push(normalized.batch.year)
    stats.saved += 1
  }
}

const MAX_PAGES_PER_RUN = 30
const REQUEST_INTERVAL_MS = 2000

interface CrawlCandidate {
  url: string
  depth: number
}

interface PageInput {
  source: ScoreLineSource
  runId: string
  url: string
  years: number[]
  stats: SourceStats
}

/** 取一页 → 跟引导页 → 解析 → 落 document → 写批次；返回下一层候选链接。 */
async function processPage(input: PageInput): Promise<string[]> {
  const { source, runId, url, years, stats } = input
  const sourceParserId = source.parserId || 'html-table@1'
  let actualParserId = sourceParserId
  let fetched: Awaited<ReturnType<typeof fetchResource>> | null = null
  try {
    fetched = await fetchResource(url)
    stats.fetched += 1
    let content = fetched.content
    let finalUrl = url
    let finalStatus = fetched.httpStatus
    let finalType = fetched.contentType
    let pageContext = pageContextFor(source, url)
    let note = ''
    let result = await parseContent({
      parserId: sourceParserId,
      content,
      contentType: finalType,
      url: finalUrl,
      context: pageContext
    })
    actualParserId = result.parserId ?? actualParserId

    // 入口是「点击进入」引导页：跟 1 跳同域，仍没内容才标 entry_redirect。
    if (result.redirect && !result.batches.length) {
      const target = followTarget(result.redirect, url)
      if (!target) {
        result.failure = { code: 'entry_redirect', detail: '引导页跳转到非同域地址' }
      } else {
        try {
          const second = await fetchResource(target)
          stats.fetched += 1
          content = second.content
          finalUrl = target
          finalStatus = second.httpStatus
          finalType = second.contentType
          pageContext = pageContextFor(source, target)
          note = `entry → ${target}`
          result = await parseContent({
            parserId: sourceParserId,
            content,
            contentType: finalType,
            url: finalUrl,
            context: pageContext
          })
          actualParserId = result.parserId ?? actualParserId
          if (!result.batches.length && (result.linkItems?.length ?? 0) < 3) {
            result.failure = {
              code: 'entry_redirect',
              detail: `引导页 ${url} → ${target} 后仍未拿到表格`
            }
          }
        } catch (error) {
          result.failure = {
            code: 'entry_redirect',
            detail: `引导页 ${url} → ${target} 打不开：${(error as Error).message}`
          }
        }
      }
    }

    // 快照与 document 元数据用实际拿到正文的那一跳，避免首跳 HTML + 第二跳 PDF 时错位。
    const snapshot = saveSnapshot(content, finalType, finalUrl)
    const isIndex = result.index === true
    const parseStatus = result.batches.length ? 'parsed' : isIndex ? 'index' : 'failed'
    const error = result.batches.length || isIndex ? '' : codedError(result)
    insertDocument({
      runId,
      sourceId: source.id,
      url,
      httpStatus: finalStatus,
      contentType: finalType,
      checksum: snapshot.checksum,
      storagePath: snapshot.storagePath,
      parserId: actualParserId,
      parseStatus,
      error,
      note,
      shape: JSON.stringify(result.shape ?? {})
    })
    await processParsedBatches(result.batches, pageContext, years, stats)
    if (error) {
      stats.failed += 1
      stats.codes.push(result.failure?.code ?? failureCodeOf(error))
      stats.details.push(`${url}：${error}`)
    } else if (isIndex) {
      stats.indexPages += 1
    }
    return result.linkItems?.length ? selectCandidates(result.linkItems) : []
  } catch (error) {
    stats.failed += 1
    stats.codes.push('network')
    const coded = `network: ${(error as Error).message}`
    stats.details.push(`${url}：${coded}`)
    insertDocument({
      runId,
      sourceId: source.id,
      url,
      httpStatus: fetched?.httpStatus ?? 0,
      contentType: fetched?.contentType ?? '',
      checksum: '',
      storagePath: '',
      parserId: actualParserId,
      parseStatus: 'failed',
      error: coded,
      note: '',
      shape: ''
    })
    return []
  }
}

async function processSource(
  source: ScoreLineSource,
  runId: string,
  years: number[],
  budget: { pages: number }
): Promise<SourceStats> {
  const stats = emptyStats()
  const maxDepth = Math.min(5, Math.max(0, source.discoverDepth ?? 2))
  const startUrl = source.entryUrl || source.url
  const queue: CrawlCandidate[] = [{ url: startUrl, depth: 0 }]
  const visited = new Set<string>()
  if (budget.pages >= MAX_PAGES_PER_RUN) {
    stats.details.push('budget: 本 run 已达到 30 页上限，剩余来源下次继续')
    return stats
  }

  while (queue.length && budget.pages < MAX_PAGES_PER_RUN) {
    const current = queue.shift() as CrawlCandidate
    if (visited.has(current.url)) continue
    visited.add(current.url)
    budget.pages += 1
    if (budget.pages > 1) await sleep(REQUEST_INTERVAL_MS)
    const found = await processPage({
      source,
      runId,
      url: current.url,
      years,
      stats
    })
    const nextDepth = current.depth + 1
    if (nextDepth <= maxDepth && found.length) {
      for (const link of found) {
        if (!visited.has(link)) queue.push({ url: link, depth: nextDepth })
      }
      stats.discovered += found.length
    }
  }

  if (queue.length && budget.pages >= MAX_PAGES_PER_RUN) {
    stats.details.push('budget: 本 run 已达到 30 页上限，剩余来源下次继续')
  }
  if (stats.saved === 0 && source.exam === 'upgrade' && !source.verified) {
    stats.details.unshift('needs_seed: 该省专升本栏目入口未人工核验，请补栏目 URL')
    stats.codes.unshift('needs_seed')
  }
  return stats
}

/** run 结束统一刷新覆盖：失败运行也要刷新，否则覆盖看板只会在有 saved 时变化。 */
function refreshRunCoverage(
  province: string,
  scopeYears: number[],
  sources: ScoreLineSource[],
  stats: SourceStats
): void {
  const years = new Set<number>(scopeYears)
  for (const year of stats.years) years.add(year)
  if (years.size === 0) years.add(new Date().getFullYear())
  const exams = new Set(sources.map((source) => source.exam))
  for (const exam of exams) {
    for (const year of years) {
      if (!Number.isInteger(year) || year < 2000 || year > 2100) continue
      if (province === '全国') refreshNationalCoverage(exam, year)
      else refreshProvinceCoverage(exam, year, province)
    }
  }
}

let running = false

export async function runNext(): Promise<void> {
  if (running) return
  const next = db
    .prepare(
      "SELECT * FROM crawl_runs WHERE status = 'queued' ORDER BY priority DESC, created_at LIMIT 1"
    )
    .get() as RunRow | undefined
  if (!next) return
  running = true
  const started = Date.now()
  db.prepare("UPDATE crawl_runs SET status = 'running', started_at = ? WHERE id = ?").run(
    now(),
    next.id
  )
  const years = (() => {
    try {
      const scope = JSON.parse(next.scope) as { years?: unknown }
      return Array.isArray(scope.years)
        ? scope.years.map((year) => Number(year)).filter((year) => Number.isInteger(year))
        : []
    } catch {
      return []
    }
  })()
  const sources = sourcesForProvince(next.province)
  const total = emptyStats()
  const budget = { pages: 0 }
  const deadline = started + Math.max(1, config.scorelineCrawlProvinceMinutes) * 60_000
  log.info('scoreline.crawl_started', {
    runId: next.id,
    province: next.province,
    sources: sources.length
  })
  try {
    for (const source of sources) {
      if (Date.now() > deadline) {
        total.details.push('达到本省运行时限，剩余来源下次继续')
        break
      }
      const stats = await processSource(source, next.id, years, budget)
      total.fetched += stats.fetched
      total.parsed += stats.parsed
      total.saved += stats.saved
      total.failed += stats.failed
      total.discovered += stats.discovered
      total.indexPages += stats.indexPages
      total.years.push(...stats.years.filter((year) => !total.years.includes(year)))
      total.codes.push(...stats.codes)
      total.details.push(...stats.details)
      const status = statusOf(stats)
      markSourceRun(source.id, { status, error: diagnostics(stats), at: now() })
      log.info('scoreline.source_finished', {
        runId: next.id,
        sourceId: source.id,
        status,
        saved: stats.saved,
        failed: stats.failed
      })
    }
  } finally {
    const status = statusOf(total)
    const failureText = diagnostics(total)
    db.prepare(
      `UPDATE crawl_runs SET status = ?, finished_at = ?, discovered = ?, fetched = ?, parsed = ?,
         saved = ?, failed = ?, message = ?, details = ? WHERE id = ?`
    ).run(
      status,
      now(),
      total.discovered,
      total.fetched,
      total.parsed,
      total.saved,
      total.failed,
      failureText ||
        (total.saved > 0 ? '' : total.details.slice(0, 5).join('；') || '没有抓到可写库数据'),
      JSON.stringify(total.details.slice(0, 50)),
      next.id
    )
    // 先写 run 结果再刷新覆盖，覆盖看板读到的 lastRun 才是本次状态。
    try {
      refreshRunCoverage(next.province, years, sources, total)
    } catch (error) {
      log.error('scoreline.coverage_refresh_failed', {
        runId: next.id,
        province: next.province,
        err: (error as Error).message
      })
    }
    log.info('scoreline.crawl_finished', {
      runId: next.id,
      status,
      fetched: total.fetched,
      parsed: total.parsed,
      saved: total.saved,
      failed: total.failed,
      indexPages: total.indexPages,
      ms: Date.now() - started
    })
    running = false
    void runNext()
  }
}
