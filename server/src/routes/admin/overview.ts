import { Router } from 'express'
import type { Answers } from '../../../../shared/src/types'
import { noStore } from '../../auth'
import { db, getActiveSurvey } from '../../db'
import { countCompletedGroups, countStarted, exitDropoff } from '../../db/events'
import { parseJson } from '../../util'

export const overviewRouter = Router()

overviewRouter.get('/overview', (req, res) => {
  noStore(res)
  // 计数合并成两次查询：同一张表不再各扫两遍。
  const inviteStats = db
    .prepare(
      `SELECT COUNT(*) AS invites,
              COALESCE(SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS opened
       FROM invites`
    )
    .get() as { invites: number; opened: number }
  const submissionStats = db
    .prepare(
      `SELECT COUNT(*) AS submitted,
              COALESCE(SUM(CASE WHEN claimed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS claimed
       FROM submissions`
    )
    .get() as { submitted: number; claimed: number }

  const survey = getActiveSurvey()

  // 漏斗三项统一读 event_facts（O(邀请数)），原始 events 只作为可清理的明细。
  const groupById = countCompletedGroups()
  const startedCount = countStarted()

  // 答卷只读一次：流失排除、题目统计和近 14 天分布共用这批数据。
  const submissions = db
    .prepare('SELECT answers, timing, created_at FROM submissions')
    .all() as {
    answers: string
    timing: string
    created_at: string
  }[]
  const dropoff = exitDropoff()

  const answered = new Map<string, number>()
  const dwell = new Map<string, { sum: number; count: number }>()
  const questionIds = new Set(survey.questions.map((question) => question.id))
  for (const submission of submissions) {
    const answers = parseJson<Answers>(submission.answers, {})
    // 只遍历答卷里实际存在的答案，不再为每份答卷跑完整份问卷。
    for (const [id, value] of Object.entries(answers)) {
      if (!questionIds.has(id)) continue
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)
      if (!empty) answered.set(id, (answered.get(id) ?? 0) + 1)
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
  const startedTotal = startedCount || 1
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
      invites: inviteStats.invites,
      opened: inviteStats.opened,
      submitted: submissionStats.submitted,
      claimed: submissionStats.claimed,
      pending: Math.max(inviteStats.invites - submissionStats.submitted, 0),
      completion: inviteStats.invites
        ? Math.round((submissionStats.submitted / inviteStats.invites) * 100)
        : 0
    },
    funnel: {
      started: startedCount,
      groups: survey.groups.map((group) => ({
        id: group.id,
        code: group.code,
        title: group.title,
        completed: groupById.get(group.id) ?? 0
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
