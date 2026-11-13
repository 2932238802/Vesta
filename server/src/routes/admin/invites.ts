import { Router } from 'express'
import { noStore } from '../../auth'
import { db, getActiveSurvey, newId, now } from '../../db'
import { clampString, randomToken } from '../../util'
import { invitePath } from './shared'

export const invitesRouter = Router()

invitesRouter.post('/invites', (req, res) => {
  noStore(res)
  const body = req.body ?? {}
  const rawNames: unknown = body.names
  const nameList: string[] = Array.isArray(rawNames)
    ? rawNames
    : typeof body.name === 'string'
      ? [body.name]
      : []
  // 边遍历边去重，凑满 100 个立即停止；超大数组不再先完整建 Set。
  const names: string[] = []
  const seenNames = new Set<string>()
  for (const value of nameList) {
    if (typeof value !== 'string') continue
    const name = value.trim().slice(0, 40)
    if (!name || seenNames.has(name)) continue
    seenNames.add(name)
    names.push(name)
    if (names.length >= 100) break
  }

  if (names.length === 0) {
    res.status(400).json({ error: '至少填一个姓名' })
    return
  }

  const note = clampString(body.note, 200)
  const channel = clampString(body.channel, 40)
  let expiresAt: string | null = null
  const expiresInput = clampString(body.expiresAt, 40)
  if (expiresInput) {
    const date = new Date(expiresInput)
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      res.status(400).json({ error: '过期时间需要晚于现在' })
      return
    }
    expiresAt = date.toISOString()
  }

  const survey = getActiveSurvey()
  const created: { id: string; name: string; token: string; path: string }[] = []

  db.exec('BEGIN')
  try {
    for (const name of names) {
      const id = newId('inv')
      const token = randomToken(18)
      db.prepare(
        `INSERT INTO invites (id, token, name, note, channel, survey_id, status, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      ).run(id, token, name, note, channel, survey.id, now(), expiresAt)
      created.push({ id, name, token, path: invitePath(token) })
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  res.json({ invites: created })
})

invitesRouter.delete('/invites/:id', (req, res) => {
  noStore(res)
  const submission = db
    .prepare('SELECT id FROM submissions WHERE invite_id = ?')
    .get(req.params.id)
  if (submission) {
    res.status(409).json({ error: '这个链接已经提交过，不能删除' })
    return
  }
  db.prepare('DELETE FROM invites WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

invitesRouter.post('/invites/:id/rotate', (req, res) => {
  noStore(res)
  const submission = db
    .prepare('SELECT id FROM submissions WHERE invite_id = ?')
    .get(req.params.id)
  if (submission) {
    res.status(409).json({ error: '已经提交过，不需要换链接' })
    return
  }
  const token = randomToken(18)
  db.prepare('UPDATE invites SET token = ?, status = ?, opened_at = NULL WHERE id = ?').run(
    token,
    'pending',
    req.params.id
  )
  res.json({ token, path: invitePath(token) })
})

