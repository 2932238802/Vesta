import crypto from 'node:crypto'
import { db } from './connection'

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

export function recordEvent(inviteId: string | null, type: string, payload: unknown = {}): void {
  try {
    db.prepare('INSERT INTO events (invite_id, type, payload, created_at) VALUES (?, ?, ?, ?)').run(
      inviteId,
      type,
      JSON.stringify(payload ?? {}),
      now()
    )
  } catch {
    // 埋点失败不影响主流程
  }
}
