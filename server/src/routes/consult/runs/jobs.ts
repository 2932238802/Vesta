import { db } from '../../../db'
import { log } from '../../../log'
import { runSentenceConsultJob } from './sentence-job'
import { runPurposeConsultJob } from './purpose-job'
import { setRunFailed, type ConsultRunRow } from './shared'

const activeConsultJobs = new Map<string, Promise<void>>()

async function runConsultJob(runId: string): Promise<void> {
  const row = db.prepare('SELECT * FROM consult_runs WHERE id = ?').get(runId) as
    | ConsultRunRow
    | undefined
  if (!row) return
  if (row.mode === 'purpose') return runPurposeConsultJob(row)
  return runSentenceConsultJob(row)
}

export function startConsultJob(runId: string): void {
  if (activeConsultJobs.has(runId)) {
    log.debug('consult.skip_running', { runId })
    return
  }
  const startedMs = Date.now()
  log.info('consult.start', { runId })
  const job = runConsultJob(runId)
    .catch((error) => {
      log.error('consult.failed', {
        runId,
        ms: Date.now() - startedMs,
        err: error
      })
      setRunFailed(runId, error instanceof Error ? error.message : 'AI 生成失败')
    })
    .finally(() => {
      log.info('consult.end', { runId, ms: Date.now() - startedMs })
      activeConsultJobs.delete(runId)
    })
  activeConsultJobs.set(runId, job)
}
