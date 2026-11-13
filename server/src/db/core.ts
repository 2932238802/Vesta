import crypto from 'node:crypto'
import { log } from '../log'
import { db } from './connection'
import { recordFactFromEvent } from './events'

export function now(): string {
  return new Date().toISOString()
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`
}

/**
 * 写一条埋点，并同步沉淀漏斗事实。
 * @param rawPayload 已序列化 / 截断的 payload（批量上报用），不传则序列化 payload。
 * @returns 原始事件是否写入成功；事实写入失败只记日志，不回滚原始事件。
 */
export function recordEvent(
  inviteId: string | null,
  type: string,
  payload: unknown = {},
  rawPayload?: string
): boolean {
  const at = now()
  const data =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const json = rawPayload ?? JSON.stringify(payload ?? {})
  let seq: number
  try {
    const result = db
      .prepare('INSERT INTO events (invite_id, type, payload, created_at) VALUES (?, ?, ?, ?)')
      .run(inviteId, type, json, at)
    seq = Number(result.lastInsertRowid)
  } catch (error) {
    // 埋点失败不影响主流程，但要留下线索，不能完全静默。
    log.warn('events.insert_failed', { type, err: error })
    return false
  }

  try {
    recordFactFromEvent(inviteId, type, data, at, seq)
  } catch (error) {
    // 原始事件已落库、事实没写，两边会漂移；必须显式报错（见第 11 篇 4.2）。
    log.error('events.fact_failed', { type, inviteId, err: error })
  }
  return true
}
