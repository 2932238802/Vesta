import { Router } from 'express'
import type { Answers } from '../../../../shared/src/types'
import { noStore } from '../../auth'
import { db, getActiveSurvey } from '../../db'
import { parseJson } from '../../util'

export const overviewRouter = Router()

overviewRouter.get('/overview', (req, res) => {
  noStore(res)
  const invitesCount = (
    db.prepare('SELECT COUNT(*) AS count FROM invites').get() as { count: number }
  ).count
  const openedCount = (
    db
      .prepare('SELECT COUNT(*) AS count FROM invites WHERE opened_at IS NOT NULL')
      .get() as { count: number }
  ).count
  const submittedCount = (
    db.prepare('SELECT COUNT(*) AS count FROM submissions').get() as { count: number }
  ).count
  const claimedCount = (
    db
      .prepare('SELECT COUNT(*) AS count FROM submissions WHERE claimed_at IS NOT NULL')
      .get() as { count: number }
  ).count

  const survey = getActiveSurvey()

  const groupEvents = db
    .prepare("SELECT invite_id, payload FROM events WHERE type = 'group_complete'")
    .all() as { invite_id: string; payload: string }[]
  const groupById = new Map<string, Set<string>>()
  for (const event of groupEvents) {
    const payload = parseJson<{ groupId?: string }>(event.payload, {})
    if (!payload.groupId) continue
    if (!groupById.has(payload.groupId)) groupById.set(payload.groupId, new Set())
    groupById.get(payload.groupId)!.add(event.invite_id)
  }

  const startedEvents = db
    .prepare("SELECT COUNT(DISTINCT invite_id) AS count FROM events WHERE type = 'quiz_start'")
    .get() as { count: number }

  // 每题流失：只看最终没有提交的人，记录他们最后停在哪道题。
  const exitEvents = db
    .prepare("SELECT invite_id, payload FROM events WHERE type = 'quiz_exit' ORDER BY id")
    .all() as { invite_id: string; payload: string }[]
  const submittedInviteIds = new Set(
    (
      db.prepare('SELECT invite_id FROM submissions').all() as { invite_id: string }[]
    ).map((row) => row.invite_id)
  )
  const lastExit = new Map<string, { questionId: string; step: number }>()
  for (const event of exitEvents) {
    if (!event.invite_id || submittedInviteIds.has(event.invite_id)) continue
    const payload = parseJson<{ questionId?: string; step?: number }>(event.payload, {})
    if (typeof payload.questionId !== 'string' || !payload.questionId) continue
    lastExit.set(event.invite_id, {
      questionId: payload.questionId,
      step: typeof payload.step === 'number' ? payload.step : 0
    })
  }
  const dropoff = new Map<string, number>()
  for (const exit of lastExit.values()) {
    dropoff.set(exit.questionId, (dropoff.get(exit.questionId) ?? 0) + 1)
  }

  const submissions = db
    .prepare('SELECT answers, timing, created_at, total, tier FROM submissions')
    .all() as { answers: string; timing: string; created_at: string; total: number; tier: string }[]

  const answered = new Map<string, number>()
  const dwell = new Map<string, { sum: number; count: number }>()
  for (const submission of submissions) {
    const answers = parseJson<Answers>(submission.answers, {})
    for (const question of survey.questions) {
      const value = answers[question.id]
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)
      if (!empty) answered.set(question.id, (answered.get(question.id) ?? 0) + 1)
    }
    const timing = parseJson<Record<string, number>>(submission.timing, {})
    for (const [id, ms] of Object.entries(timing)) {
      if (typeof ms !== 'number') continue
      const bucket = dwell.get(id) ?? { sum: 0, count: 0 }
      bucket.sum += ms
      bucket.count += 1
      dwell.set(id, bucket)
    }
  }

  const total = submissions.length || 1
  const startedTotal = startedEvents.count || 1
  const questions = survey.questions.map((question) => {
    const bucket = dwell.get(question.id)
    const dropoffCount = dropoff.get(question.id) ?? 0
    return {
      code: question.code,
      title: question.title,
      avgSeconds: bucket ? Math.round((bucket.sum / bucket.count / 1000) * 10) / 10 : null,
      answered: answered.get(question.id) ?? 0,
      answeredRate: Math.round(((answered.get(question.id) ?? 0) / total) * 100),
      dropoff: dropoffCount,
      dropoffRate: Math.round((dropoffCount / startedTotal) * 100)
    }
  })

  const days: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const key = date.toISOString().slice(0, 10)
    days.push({ date: key, count: 0 })
  }
  const byDate = new Map(days.map((d) => [d.date, d]))
  for (const submission of submissions) {
    const key = submission.created_at.slice(0, 10)
    const item = byDate.get(key)
    if (item) item.count += 1
  }

  const recent = db
    .prepare(
      `SELECT s.id, s.slug, s.total, s.tier, s.contact_status, s.created_at, s.claimed_at,
              i.name, i.note, i.channel
       FROM submissions s JOIN invites i ON i.id = s.invite_id
       ORDER BY s.created_at DESC LIMIT 8`
    )
    .all() as Record<string, unknown>[]

  res.json({
    stats: {
      invites: invitesCount,
      opened: openedCount,
      submitted: submittedCount,
      claimed: claimedCount,
      pending: Math.max(invitesCount - submittedCount, 0),
      completion: invitesCount ? Math.round((submittedCount / invitesCount) * 100) : 0
    },
    funnel: {
      started: startedEvents.count,
      groups: survey.groups.map((group) => ({
        id: group.id,
        code: group.code,
        title: group.title,
        completed: groupById.get(group.id)?.size ?? 0
      }))
    },
    daily: days,
    questions,
    recent: recent.map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      channel: row.channel,
      total: row.total,
      tier: row.tier,
      claimed: Boolean(row.claimed_at),
      contactStatus: row.contact_status,
      createdAt: row.created_at,
      reportPath: `/r/${row.slug}`
    }))
  })
})
