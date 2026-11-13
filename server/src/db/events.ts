import { db } from './connection'
import { log } from '../log'

export type FunnelKind = 'start' | 'group' | 'exit'

/** 运维类事件的保留期更长，避免排查历史 AI 失败 / 删除记录时缺原始数据。 */
export const OPERATIONAL_EVENT_TYPES = new Set([
  'ai_report_ready',
  'ai_report_retry',
  'ai_report_failed',
  'ai_report_retry_manual',
  'submission_deleted'
])

/**
 * 把一条原始事件映射成漏斗事实；不参与漏斗的事件返回 null。
 * 映射规则与旧版 overview.ts 的读法一致：start 只记首次，group 按 groupId 去重，exit 每题留最后一次。
 */
export function factOfEvent(
  type: string,
  payload: Record<string, unknown>
): { kind: FunnelKind; key: string } | null {
  if (type === 'quiz_start') return { kind: 'start', key: '' }
  if (type === 'group_complete') {
    const groupId = payload.groupId
    return typeof groupId === 'string' && groupId ? { kind: 'group', key: groupId } : null
  }
  if (type === 'quiz_exit') {
    const questionId = payload.questionId
    return typeof questionId === 'string' && questionId
      ? { kind: 'exit', key: questionId }
      : null
  }
  return null
}

function writeFact(
  inviteId: string,
  kind: FunnelKind,
  key: string,
  at: string,
  seq: number
): void {
  if (kind === 'exit') {
    db.prepare(
      `INSERT INTO event_facts (invite_id, kind, key, at, seq) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(invite_id, kind, key) DO UPDATE SET at = excluded.at, seq = excluded.seq
       WHERE excluded.seq > event_facts.seq`
    ).run(inviteId, kind, key, at, seq)
    return
  }
  db.prepare(
    'INSERT OR IGNORE INTO event_facts (invite_id, kind, key, at, seq) VALUES (?, ?, ?, ?, ?)'
  ).run(inviteId, kind, key, at, seq)
}

/** 写入事实；错误向上抛，由 recordEvent 统一记日志（不能和原始事件一起静默吞掉）。 */
export function recordFactFromEvent(
  inviteId: string | null,
  type: string,
  payload: Record<string, unknown>,
  at: string,
  seq: number
): void {
  if (!inviteId) return
  const fact = factOfEvent(type, payload)
  if (!fact) return
  writeFact(inviteId, fact.kind, fact.key, at, seq)
}

export function countStarted(): number {
  return (db.prepare("SELECT COUNT(*) AS count FROM event_facts WHERE kind = 'start'").get() as {
    count: number
  }).count
}

/** 每组完成人数：event_facts 的主键已经保证同一邀请同一组只有一行。 */
export function countCompletedGroups(): Map<string, number> {
  const rows = db
    .prepare("SELECT key, COUNT(*) AS count FROM event_facts WHERE kind = 'group' GROUP BY key")
    .all() as { key: string; count: number }[]
  return new Map(rows.map((row) => [row.key, row.count]))
}

/** 每题流失：只看最终没有提交的人，取每人最后一次 exit 落在哪道题。 */
export function exitDropoff(): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT latest.key AS key, COUNT(*) AS count
       FROM (
         SELECT invite_id, key, MAX(seq) AS seq
         FROM event_facts
         WHERE kind = 'exit'
         GROUP BY invite_id
       ) latest
       WHERE NOT EXISTS (SELECT 1 FROM submissions s WHERE s.invite_id = latest.invite_id)
       GROUP BY latest.key`
    )
    .all() as { key: string; count: number }[]
  return new Map(rows.map((row) => [row.key, row.count]))
}

const BACKFILL_MARKER = 'events_facts_backfilled'

/**
 * 一次性回填：启动迁移，可重复执行（settings 标记 + 主键冲突忽略）。
 * 正常走 SQL 的 json_extract；如果当前 SQLite 不支持，退回逐行 JS 解析。
 */
export function backfillEventFacts(): void {
  const marked = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(BACKFILL_MARKER)
  if (marked) return

  try {
    db.exec(`
      BEGIN;
      INSERT OR IGNORE INTO event_facts (invite_id, kind, key, at, seq)
      SELECT invite_id, 'start', '', MIN(created_at), MIN(id) FROM events
      WHERE type = 'quiz_start' AND invite_id IS NOT NULL
      GROUP BY invite_id;

      INSERT OR IGNORE INTO event_facts (invite_id, kind, key, at, seq)
      SELECT invite_id, 'group', json_extract(payload, '$.groupId'), MIN(created_at), MIN(id)
      FROM events
      WHERE type = 'group_complete'
        AND invite_id IS NOT NULL
        AND json_extract(payload, '$.groupId') IS NOT NULL
      GROUP BY invite_id, json_extract(payload, '$.groupId');

      INSERT INTO event_facts (invite_id, kind, key, at, seq)
      SELECT e.invite_id, 'exit', json_extract(e.payload, '$.questionId'), e.created_at, e.id
      FROM events e
      WHERE e.type = 'quiz_exit'
        AND e.invite_id IS NOT NULL
        AND json_extract(e.payload, '$.questionId') IS NOT NULL
        AND e.id = (
          SELECT MAX(x.id) FROM events x
          WHERE x.type = 'quiz_exit'
            AND x.invite_id = e.invite_id
            AND json_extract(x.payload, '$.questionId') = json_extract(e.payload, '$.questionId')
        )
      ON CONFLICT(invite_id, kind, key) DO UPDATE SET at = excluded.at, seq = excluded.seq
      WHERE excluded.seq > event_facts.seq;
      COMMIT;
    `)
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // BEGIN 本身失败时没有事务可回滚
    }
    log.warn('events.backfill_sql_failed', { err: error, fallback: 'js' })
    backfillFactsInJs()
  }

  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(BACKFILL_MARKER, new Date().toISOString())
}

function backfillFactsInJs(): void {
  const rows = db
    .prepare(
      `SELECT id, invite_id, type, payload, created_at FROM events
       WHERE type IN ('quiz_start', 'group_complete', 'quiz_exit') AND invite_id IS NOT NULL
       ORDER BY id`
    )
    .all() as {
    id: number
    invite_id: string
    type: string
    payload: string
    created_at: string
  }[]

  for (const row of rows) {
    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>
    } catch {
      payload = {}
    }
    const fact = factOfEvent(row.type, payload)
    if (!fact) continue
    writeFact(row.invite_id, fact.kind, fact.key, row.created_at, row.id)
  }
}

export interface PruneResult {
  business: number
  operational: number
}

/**
 * 按保留期清理原始事件。业务埋点默认 180 天，运维事件默认 365 天；
 * 每批 5000 行，避免一次删除长时间占用写锁。不做 VACUUM。
 */
export function pruneEvents(options: {
  retentionDays: number
  operationalRetentionDays: number
  batchSize?: number
}): PruneResult {
  const batchSize = Math.max(1, options.batchSize ?? 5000)
  const result: PruneResult = { business: 0, operational: 0 }
  // 保留期 <= 0 视为关闭清理，避免把历史事件一次删光。
  if (!(options.retentionDays > 0) || !(options.operationalRetentionDays > 0)) return result
  const businessCutoff = retentionCutoff(options.retentionDays)
  const operationalCutoff = retentionCutoff(options.operationalRetentionDays)
  const operationalTypes = [...OPERATIONAL_EVENT_TYPES]
  const placeholders = operationalTypes.map(() => '?').join(', ')

  const pruneBusiness = db.prepare(
    `DELETE FROM events WHERE id IN (
       SELECT id FROM events
       WHERE type NOT IN (${placeholders}) AND created_at < ?
       LIMIT ?
     )`
  )
  const pruneOperational = db.prepare(
    `DELETE FROM events WHERE id IN (
       SELECT id FROM events
       WHERE type IN (${placeholders}) AND created_at < ?
       LIMIT ?
     )`
  )

  while (true) {
    const changes = Number(pruneBusiness.run(...operationalTypes, businessCutoff, batchSize).changes)
    result.business += changes
    if (changes < batchSize) break
  }
  while (true) {
    const changes = Number(
      pruneOperational.run(...operationalTypes, operationalCutoff, batchSize).changes
    )
    result.operational += changes
    if (changes < batchSize) break
  }
  return result
}

function retentionCutoff(days: number): string {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 0
  return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString()
}
