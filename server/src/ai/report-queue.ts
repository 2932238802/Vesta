import { db } from '../db'
import { log } from '../log'

/**
 * AI 报告队列：单进程内的 FIFO + 并发上限。
 * 只负责「谁在跑 / 谁在等 / 什么时候再试」，生成逻辑由 index.ts 注入的 runner 负责，
 * 本文件不 import generate.ts，避免循环依赖。队列在内存里，重启后由启动扫描续跑。
 */

/** 单实例下的 AI 报告并发上限；网关限流明显时再调低。 */
const REPORT_CONCURRENCY = 2

type Runner = (submissionId: string) => Promise<void>

const waiting: string[] = []
const waitingSet = new Set<string>()
const running = new Set<string>()
const timers = new Map<string, NodeJS.Timeout>()
let runner: Runner | null = null

function pump(): void {
  if (!runner) return
  while (running.size < REPORT_CONCURRENCY && waiting.length > 0) {
    const id = waiting.shift()
    if (!id) break
    waitingSet.delete(id)
    running.add(id)
    log.debug('ai.dequeue', { submissionId: id, running: running.size, waiting: waiting.length })
    void runner(id)
      .catch((error) => log.error('ai.unhandled', { submissionId: id, err: error }))
      .finally(() => {
        running.delete(id)
        pump()
      })
  }
}

/** 注册 runner 并开始调度；可重复调用，后注册的 runner 生效。 */
export function startReportQueue(nextRunner: Runner): void {
  runner = nextRunner
  pump()
}

/** 入队；同一份正在跑、已在等或已有延时任务时不会重复入队。 */
export function enqueueReport(submissionId: string, delayMs = 0): void {
  if (delayMs > 0) {
    // 延时重试允许在「自己还在跑」时预约：失败分支是在 runner 内部调用的，
    // 此刻 running 还没释放；立即入队才会被 running / waiting 去重挡住。
    if (timers.has(submissionId) || waitingSet.has(submissionId)) return
    const timer = setTimeout(() => {
      timers.delete(submissionId)
      enqueueReport(submissionId)
    }, delayMs)
    // 不让重试闹钟阻止进程退出；重启后的续跑交给启动扫描。
    timer.unref?.()
    timers.set(submissionId, timer)
    log.debug('ai.enqueue_delayed', { submissionId, delayMs, waiting: waiting.length })
    return
  }

  if (running.has(submissionId)) {
    log.debug('ai.skip_running', { submissionId })
    return
  }
  if (waitingSet.has(submissionId)) {
    log.debug('ai.skip_queued', { submissionId })
    return
  }
  const pendingTimer = timers.get(submissionId)
  // 手动重试 / 页面兜底优先于原定延时：先撤掉闹钟，再立刻排队。
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    timers.delete(submissionId)
  }
  waiting.push(submissionId)
  waitingSet.add(submissionId)
  log.debug('ai.enqueue', { submissionId, waiting: waiting.length, running: running.size })
  pump()
}

export function isReportRunning(submissionId: string): boolean {
  return running.has(submissionId)
}

/**
 * 启动恢复：把上一个进程遗留的 pending / running 记录重新排队。
 * 单实例部署，启动瞬间看到的 running 一定是上一个进程已经死了，不再等页面兜底的 4 分钟。
 * failed 不恢复（由报告页 / 后台的重试入口触发）；机会已用完的记录也不再自动烧 AI。
 */
export function resumeUnfinishedReports(options: { maxAttempts: number }): number {
  const rows = db
    .prepare(
      `SELECT id, ai_attempts FROM submissions
       WHERE ai_status IN ('pending', 'running')
       ORDER BY created_at ASC`
    )
    .all() as unknown as Array<{ id: string; ai_attempts: number }>
  let queued = 0
  let skipped = 0
  for (const row of rows) {
    if (row.ai_attempts >= options.maxAttempts) {
      skipped += 1
      continue
    }
    enqueueReport(row.id)
    queued += 1
  }
  log.info('ai.resume', { queued, skipped })
  return queued
}
