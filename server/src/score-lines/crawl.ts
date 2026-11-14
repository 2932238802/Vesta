import type { CrawlRun, CrawlStatus, ScoreLineSource } from '../../../shared/src/score-line'
import { batchChecksum } from '../../../shared/src/score-line'
import { config } from '../env'
import { log } from '../log'
import { db } from '../db/connection'
import { newId, now } from '../db/core'
import { findBatchId, getBatch, saveBatch } from './batch-store'
import { refreshCoverage, refreshProvinceCoverage } from './coverage'
import { fetchResource, insertDocument, saveSnapshot } from './crawl-fetch'
import { followTarget, selectCandidates } from './discovery'
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
    schoolId: source.schoolId || undefined,
    urlInclude: source.urlInclude
  }
}

/** 解析失败码统一写成 `code: detail`，覆盖页据此给下一步。 */
function codedError(result: Awaited<ReturnType<typeof parseContent>>): string {
  if (result.failure) return `${result.failure.code}: ${result.failure.detail}`
  return result.issues.slice(0, 3).join('；') || 'parse: 没有识别到可写库的数据'
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
  context: ParserContext
  years: number[]
  stats: SourceStats
}

/** 取一页 → 跟引导页 → 解析 → 落 document → 写批次；返回下一层候选链接。 */
async function processPage(input: PageInput): Promise<string[]> {
  const { source, runId, url, context, years, stats } = input
  const sourceParserId = source.parserId || 'html-table@1'
  let actualParserId = sourceParserId
  let fetched: Awaited<ReturnType<typeof fetchResource>> | null = null
  try {
    fetched = await fetchResource(url)
    stats.fetched += 1
    let content = fetched.content
    let finalUrl = url
    let note = ''
    let result = await parseContent({
      parserId: sourceParserId,
      content,
      contentType: fetched.contentType,
      url: finalUrl,
      context
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
          note = `entry → ${target}`
          result = await parseContent({
            parserId: sourceParserId,
            content,
            contentType: second.contentType,
            url: finalUrl,
            context
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

    const snapshot = saveSnapshot(content, fetched.contentType, finalUrl)
    const isIndex = result.index === true || (result.linkItems?.length ?? 0) >= 3
    const parseStatus = result.batches.length ? 'parsed' : isIndex ? 'index' : 'failed'
    const error = result.batches.length || isIndex ? '' : codedError(result)
    insertDocument({
      runId,
      sourceId: source.id,
      url,
      httpStatus: fetched.httpStatus,
      contentType: fetched.contentType,
      checksum: snapshot.checksum,
      storagePath: snapshot.storagePath,
      parserId: actualParserId,
      parseStatus,
      error,
      note,
      shape: JSON.stringify(result.shape ?? {})
    })
    await processParsedBatches(result.batches, context, years, stats)
    if (error) stats.details.push(`${url}：${error}`)
    return result.linkItems?.length ? selectCandidates(result.linkItems) : []
  } catch (error) {
    stats.failed += 1
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
  const context = contextFor(source)
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
      context,
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
