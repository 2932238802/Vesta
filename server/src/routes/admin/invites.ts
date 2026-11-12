import { Router } from 'express'
import { noStore } from '../../auth'
import { db, getActiveSurvey, newId, now } from '../../db'
import { clampString, randomToken } from '../../util'
import { invitePath, inviteStatus } from './shared'
import type { InviteRow } from './shared'

export const invitesRouter = Router()

invitesRouter.get('/invites', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const status = clampString(req.query.status, 20)
  const from = clampString(req.query.from, 40)
  const to = clampString(req.query.to, 40)
  const rows = db
    .prepare(
      `SELECT i.*, s.slug, s.total, s.tier, s.claimed_at
       FROM invites i LEFT JOIN submissions s ON s.invite_id = i.id
       WHERE (? = '' OR i.name LIKE ? OR i.note LIKE ? OR i.channel LIKE ?)
         AND (? = '' OR i.created_at >= ?)
         AND (? = '' OR i.created_at < ?)
       ORDER BY i.created_at DESC LIMIT 300`
    )
    .all(
      q,
      `%${q}%`,
      `%${q}%`,
      `%${q}%`,
      from,
      from,
      to,
      to
    ) as unknown as (InviteRow & {
    slug: string | null
    total: number | null
    tier: string | null
    claimed_at: string | null
  })[]

  const invites = rows
    .map((row) => ({
      id: row.id,
      token: row.token,
      name: row.name,
      note: row.note,
      channel: row.channel,
      status: inviteStatus(row, row.slug),
      createdAt: row.created_at,
      openedAt: row.opened_at,
      submittedAt: row.submitted_at,
      expiresAt: row.expires_at,
      reportSlug: row.slug,
      reportPath: row.slug ? `/r/${row.slug}` : null,
      total: row.total,
      tier: row.tier,
      claimed: Boolean(row.claimed_at)
    }))
    .filter((row) => !status || row.status === status)

  res.json({ invites })
})

invitesRouter.post('/invites', (req, res) => {
  noStore(res)
  const body = req.body ?? {}
  const rawNames: unknown = body.names
  const nameList: string[] = Array.isArray(rawNames)
    ? rawNames
    : typeof body.name === 'string'
      ? [body.name]
      : []
  const names = [
    ...new Set(
      nameList
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim().slice(0, 40))
        .filter(Boolean)
    )
  ].slice(0, 100)

  if (names.length === 0) {
    res.status(400).json({ error: '至少填一个姓名' })
    return
  }

  const note = clampString(body.note, 200)
  const channel = clampString(body.channel, 40)
  let expiresAt: string | null = null
  if (typeof body.expiresAt === 'string' && body.expiresAt.trim()) {
    const date = new Date(body.expiresAt)
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

