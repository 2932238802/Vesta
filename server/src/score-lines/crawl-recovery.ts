/**
 * 分数线抓取启动自愈（CR-006 / T-022）。
 *
 * 单实例假设：进程重启后，内存里的抓取队列已经丢失，数据库里残留的 `running`
 * 不可能再有人推进；全部标为 failed 并带 `stale:` 前缀，避免看板上出现永久「运行中」。
 * 如果有 `queued`，立即续跑一条，scheduler 就不会被残留状态永久阻塞。
 *
 * 不做多实例租约：多实例同时启动会把别人的 running 误判为 stale，当前部署模型不涉及。
 */

import { config } from '../env'
import { db } from '../db/connection'
import { now } from '../db/core'
import { log } from '../log'
import { runNext } from './crawl'

export interface CrawlRecoveryResult {
  /** 本次从 running 改为 failed 的条数。 */
  stale: number
  /** 启动时仍在排队的条数。 */
  queued: number
  /** 有 queued 时为续跑 Promise；启动代码可忽略（void），用例可 await。 */
  resume: Promise<void> | null
}

export function recoverCrawlRuns(): CrawlRecoveryResult {
  const finishedAt = now()
  try {
    const stale = db
      .prepare(
        "UPDATE crawl_runs SET status = 'failed', message = 'stale: 进程重启，未完成任务', finished_at = ? WHERE status = 'running'"
      )
      .run(finishedAt)
    const staleCount = Number(stale.changes)
    const queuedRow = db
      .prepare("SELECT COUNT(*) AS count FROM crawl_runs WHERE status = 'queued'")
      .get() as { count: number }
    const queued = Number(queuedRow.count)

    // SCORELINE_CRAWL=off 时只清理残留状态，不续跑排队任务（开关语义：停新调度，也不自动恢复抓取）。
    const resume = queued > 0 && config.scorelineCrawl ? runNext() : null
    // 启动路径不 await；挂一次错误处理，避免未处理拒绝把进程带崩。
    if (resume) {
      resume.catch((error) => {
        log.error('scoreline.crawl_resume_failed', { err: error })
      })
    }
    log.info('scoreline.crawl_recovered', {
      stale: staleCount,
      queued,
      crawlEnabled: config.scorelineCrawl,
      resumed: resume !== null
    })
    return { stale: staleCount, queued, resume }
  } catch (error) {
    // 启动时数据库忙/锁等异常不能让 app.listen 回调冒泡成 uncaughtException；
    // 记日志后继续启动，调度器仍会按自己的节奏尝试。
    log.error('scoreline.crawl_recover_failed', { err: error })
    return { stale: 0, queued: 0, resume: null }
  }
}
