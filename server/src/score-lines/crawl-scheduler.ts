import fs from 'node:fs'
import { config } from '../env'
import { log } from '../log'
import { db } from '../db/connection'
import { enqueueCrawl, runNext } from './crawl'

function scheduleOnce(): void {
  if (!config.scorelineCrawl) return
  const inFlight = db
    .prepare("SELECT COUNT(*) AS count FROM crawl_runs WHERE status IN ('queued', 'running')")
    .get() as { count: number }
  if (Number(inFlight.count) > 0) return
  const nowMs = Date.now()
  const sources = db
    .prepare('SELECT province, interval_hours, last_run_at FROM scoreline_sources WHERE enabled = 1')
    .all() as unknown as { province: string; interval_hours: number; last_run_at: string }[]
  const dueByProvince = new Map<string, { due: boolean; last: number }>()
  for (const source of sources) {
    if (!source.province) continue
    const last = source.last_run_at ? Date.parse(source.last_run_at) : 0
    const due = !last || nowMs - last >= Math.max(1, Number(source.interval_hours)) * 3600_000
    const current = dueByProvince.get(source.province) ?? { due: false, last }
    dueByProvince.set(source.province, {
      due: current.due || due,
      last: current.last && last ? Math.min(current.last, last) : current.last || last
    })
  }
  const candidate = [...dueByProvince.entries()]
    .filter(([, value]) => value.due)
    .sort((a, b) => a[1].last - b[1].last)[0]
  if (!candidate) return
  const result = enqueueCrawl({ province: candidate[0], trigger: 'schedule' })
  if (result.code) return
  log.info('scoreline.crawl_scheduled', { province: candidate[0], runId: result.run.id })
  void runNext()
}

export function startScorelineScheduler(): void {
  if (!config.scorelineCrawl) return
  const timer = setInterval(scheduleOnce, Math.max(1, config.scorelineCrawlIntervalMinutes) * 60_000)
  timer.unref()
  const startup = setTimeout(scheduleOnce, 60_000)
  startup.unref()
}

/** 清 90 天外的原始快照；分数线数据不自动删。 */
export function pruneCrawlDocuments(days = 90): number {
  const cutoff = new Date(Date.now() - days * 24 * 3600_000).toISOString()
  const rows = db
    .prepare('SELECT storage_path FROM crawl_documents WHERE fetched_at < ? LIMIT 1000')
    .all(cutoff) as unknown as { storage_path: string }[]
  for (const row of rows) {
    if (!row.storage_path) continue
    try {
      fs.unlinkSync(row.storage_path)
    } catch {
      // 文件已不存在时继续删数据库行。
    }
  }
  const result = db.prepare('DELETE FROM crawl_documents WHERE fetched_at < ?').run(cutoff)
  return Number(result.changes)
}
