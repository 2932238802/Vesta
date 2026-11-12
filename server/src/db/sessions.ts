import { config } from '../env'
import { db } from './connection'
import { getSetting, now } from './core'

interface AdminSessionRow {
  sid: string
  username: string
  created_at: string
  expires_at: string
}

export function createAdminSession(sid: string, username: string, expiresAt: string): void {
  clearExpiredAdminSessions()
  db.prepare(
    'INSERT INTO admin_sessions (sid, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(sid, username, now(), expiresAt)
}

export function getAdminSession(sid: string): AdminSessionRow | null {
  const row = db
    .prepare('SELECT sid, username, created_at, expires_at FROM admin_sessions WHERE sid = ?')
    .get(sid) as AdminSessionRow | undefined
  if (!row) return null
  if (row.expires_at <= now()) {
    deleteAdminSession(sid)
    return null
  }
  return row
}

export function deleteAdminSession(sid: string): void {
  db.prepare('DELETE FROM admin_sessions WHERE sid = ?').run(sid)
}

export function clearExpiredAdminSessions(): void {
  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now())
}

export function migrateLegacyAdminSession(): void {
  const sessionId = getSetting('admin_session')
  if (!sessionId) return
  const expiresAt = new Date(Date.now() + config.sessionTtl * 1000).toISOString()
  db.prepare(
    'INSERT OR IGNORE INTO admin_sessions (sid, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, config.adminUser, now(), expiresAt)
  db.prepare("DELETE FROM settings WHERE key = 'admin_session'").run()
}
