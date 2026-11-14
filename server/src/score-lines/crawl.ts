import type { CrawlRun, CrawlStatus, ScoreLineSource } from '../../../shared/src/score-line'
import { batchChecksum } from '../../../shared/src/score-line'
import { config } from '../env'
import { log } from '../log'
import { db } from '../db/connection'
import { newId, now } from '../db/core'
import { findBatchId, getBatch, saveBatch } from './batch-store'
import { refreshCoverage, refreshProvinceCoverage } from './coverage'
import { fetchResource, insertDocument, saveSnapshot } from './crawl-fetch'
import { normalizeParsedBatch } from './normalize'
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
      'SELECT id, url, http_status, content_type, parse_status, error, fetched_at FROM crawl_documents WHERE run_id = ? ORDER BY fetched_at LIMIT 100'
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
  details: string[]
}

function emptyStats(): SourceStats {
  return { fetched: 0, parsed: 0, saved: 0, failed: 0, discovered: 0, details: [] }
}

function contextFor(source: ScoreLineSource): ParserContext {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    exam: source.exam,
    province: source.province,
    schoolId: source.schoolId || undefined
  }
}

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
      stats.details.push(`未写库：${normalized.issues.join('；')}`)
      continue
    }
    const valueIssues = batchValueIssues(normalized.batch)
    if (valueIssues.length) {
      stats.failed += 1
      stats.details.push(`未写库：${valueIssues.join('；')}`)
      continue
    }
    const previousId = findBatchId(normalized.batch)
    const previous = previousId ? getBatch(previousId)?.metrics ?? [] : []
    const anomalies = anomalyIssues(normalized.batch, previous)
    if (anomalies.length) normalized.batch.note = anomalies.join('；')
    saveBatch(normalized.batch, {
      reviewStatus: 'pending',
      checksum: batchChecksum(normalized.batch),
      fetchedAt: now()
    })
    if (normalized.batch.schoolId) {
      refreshCoverage(normalized.batch.schoolId, normalized.batch.exam, normalized.batch.year)
    } else if (normalized.batch.scope === 'provincial') {
      refreshProvinceCoverage(normalized.batch.exam, normalized.batch.year, normalized.batch.province)
    }
    stats.saved += 1
  }
}

async function processSource(
  source: ScoreLineSource,
  runId: string,
  years: number[]
): Promise<SourceStats> {
  const stats = emptyStats()
  const context = contextFor(source)
  const urls = [source.url]
  let index = 0
  while (index < urls.length && index < 4) {
    const url = urls[index]
    index += 1
    let fetched: Awaited<ReturnType<typeof fetchResource>> | null = null
    try {
      fetched = await fetchResource(url)
      stats.fetched += 1
      const snapshot = saveSnapshot(fetched.content, fetched.contentType, url)
      const result = await parseContent({
        parserId: source.parserId || 'html-table@1',
        content: fetched.content,
        contentType: fetched.contentType,
        url,
        context
      })
      insertDocument({
        runId,
        sourceId: source.id,
        url,
        httpStatus: fetched.httpStatus,
        contentType: fetched.contentType,
        checksum: snapshot.checksum,
        storagePath: snapshot.storagePath,
        parserId: source.parserId,
        parseStatus: result.batches.length ? 'parsed' : 'failed',
        error: result.issues.join('；')
      })
      if (result.links && index === 1) {
        for (const link of result.links.slice(0, 3)) {
          if (!urls.includes(link)) urls.push(link)
        }
        stats.discovered += Math.min(result.links.length, 3)
      }
      await processParsedBatches(result.batches, context, years, stats)
      if (result.issues.length && result.batches.length === 0) {
        stats.details.push(`${url}：${result.issues.slice(0, 3).join('；')}`)
      }
    } catch (error) {
      stats.failed += 1
      stats.details.push(`${url}：${(error as Error).message}`)
      insertDocument({
        runId,
        sourceId: source.id,
        url,
        httpStatus: fetched?.httpStatus ?? 0,
        contentType: fetched?.contentType ?? '',
        checksum: '',
        storagePath: '',
        parserId: source.parserId,
        parseStatus: 'failed',
        error: (error as Error).message
      })
    }
  }
  return stats
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
      const stats = await processSource(source, next.id, years)
      total.fetched += stats.fetched
      total.parsed += stats.parsed
      total.saved += stats.saved
      total.failed += stats.failed
      total.discovered += stats.discovered
      total.details.push(...stats.details)
      const status = stats.saved > 0 ? (stats.failed > 0 ? 'partial' : 'success') : 'failed'
      markSourceRun(source.id, { status, error: stats.details.slice(0, 3).join('；'), at: now() })
      log.info('scoreline.source_finished', {
        runId: next.id,
        sourceId: source.id,
        saved: stats.saved,
        failed: stats.failed
      })
    }
  } finally {
    const status: CrawlStatus =
      total.saved > 0 ? (total.failed > 0 ? 'partial' : 'success') : 'failed'
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
      total.saved > 0 ? '' : total.details.slice(0, 5).join('；') || '没有抓到可写库数据',
      JSON.stringify(total.details.slice(0, 50)),
      next.id
    )
    log.info('scoreline.crawl_finished', {
      runId: next.id,
      status,
      fetched: total.fetched,
      parsed: total.parsed,
      saved: total.saved,
      failed: total.failed,
      ms: Date.now() - started
    })
    running = false
    void runNext()
  }
}
