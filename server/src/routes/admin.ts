import crypto from 'node:crypto'
import { Router } from 'express'
import type { Answers, ReportOverrides, ReportTemplate, Survey } from '../../../shared/src/types'
import { defaultReportSkill } from '../../../shared/src/ai'
import { computeScores } from '../../../shared/src/scoring'
import { buildReport, answerLabel } from '../../../shared/src/report'
import { validateAnswers, validateSurvey, validateTemplate } from '../../../shared/src/validate'
import { config } from '../env'
import { checkCredentials, createToken, noStore, requireAdmin } from '../auth'
import {
  db,
  deleteAdminSession,
  getActiveSurvey,
  getReportSkill,
  getSurvey,
  getTemplate,
  newId,
  now,
  publishSurvey,
  recordEvent,
  saveReportSkill,
  saveTemplate
} from '../db'
import { isAiConfigured, isSearchConfigured, regenerateReport } from '../ai/generate'
import {
  clampString,
  decryptText,
  parseJson,
  randomToken,
  rateLimit,
  toCsv
} from '../util'

export const adminRouter = Router()

adminRouter.post(
  '/login',
  rateLimit('login', 10, 5 * 60_000),
  (req, res) => {
    noStore(res)
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!username || !password || !checkCredentials(username, password)) {
      res.status(401).json({ error: '账号或密码不对' })
      return
    }
    res.json({ token: createToken(username), user: { username } })
  }
)

adminRouter.use(requireAdmin())

adminRouter.get('/me', (req, res) => {
  res.json({ user: { username: res.locals.admin } })
})

adminRouter.post('/logout', (req, res) => {
  noStore(res)
  const sessionId = typeof res.locals.adminSessionId === 'string' ? res.locals.adminSessionId : ''
  if (sessionId) deleteAdminSession(sessionId)
  res.json({ ok: true })
})

interface InviteRow {
  id: string
  token: string
  name: string
  note: string
  channel: string
  survey_id: string
  status: string
  created_at: string
  opened_at: string | null
  submitted_at: string | null
  expires_at: string | null
}

interface SubmissionRow {
  id: string
  slug: string
  invite_id: string
  survey_id: string
  answers: string
  scores: string
  total: number
  tier: string
  timing: string
  overrides: string
  contact_status: string
  admin_notes: string
  claimed_at: string | null
  wechat_enc: string | null
  slots: string | null
  ai_status: string
  ai_report: string | null
  ai_error: string
  ai_attempts: number
  ai_meta: string
  ai_started_at: string | null
  ai_finished_at: string | null
  created_at: string
}

function inviteStatus(row: InviteRow, slug: string | null): string {
  if (slug) return 'submitted'
  if (row.expires_at && row.expires_at <= now()) return 'expired'
  return row.status
}

function invitePath(token: string): string {
  return `/i/${token}`
}

adminRouter.get('/overview', (req, res) => {
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

adminRouter.get('/invites', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const status = clampString(req.query.status, 20)
  const rows = db
    .prepare(
      `SELECT i.*, s.slug, s.total, s.tier, s.claimed_at
       FROM invites i LEFT JOIN submissions s ON s.invite_id = i.id
       WHERE (? = '' OR i.name LIKE ? OR i.note LIKE ? OR i.channel LIKE ?)
       ORDER BY i.created_at DESC LIMIT 300`
    )
    .all(q, `%${q}%`, `%${q}%`, `%${q}%`) as unknown as (InviteRow & {
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

adminRouter.post('/invites', (req, res) => {
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

adminRouter.delete('/invites/:id', (req, res) => {
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

adminRouter.post('/invites/:id/rotate', (req, res) => {
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

const CONTACT_STATUSES = new Set(['new', 'contacted', 'scheduled', 'done'])

adminRouter.get('/submissions/export.csv', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const rows = db
    .prepare(
      `SELECT s.*, i.name, i.note, i.channel
       FROM submissions s JOIN invites i ON i.id = s.invite_id
       WHERE (? = '' OR i.name LIKE ? OR i.note LIKE ? OR i.channel LIKE ?)
       ORDER BY s.created_at DESC`
    )
    .all(q, `%${q}%`, `%${q}%`, `%${q}%`) as unknown as (SubmissionRow & {
    name: string
    note: string
    channel: string
  })[]

  const statusLabel: Record<string, string> = {
    new: '待联系',
    contacted: '已联系',
    scheduled: '已约时间',
    done: '已完成'
  }

  const csv = toCsv([
    [
      '姓名',
      '备注',
      '渠道',
      '提交时间',
      '总分',
      '档位',
      '微信号',
      '时间段',
      '联系状态',
      '优先方向',
      '半年目标',
      '目标城市与岗位',
      '报告路径',
      '管理员备注'
    ],
    ...rows.map((row) => {
      const answers = parseJson<Answers>(row.answers, {})
      const survey = getSurvey(row.survey_id) ?? getActiveSurvey()
      const target = Array.isArray(answers.a8)
        ? answers.a8.filter((item): item is string => typeof item === 'string').join(' / ')
        : ''
      const priority = answerLabel(
        survey.questions.find((question) => question.id === 'a9'),
        answers.a9
      )
      const goal = answerLabel(
        survey.questions.find((question) => question.id === 'a10'),
        answers.a10
      )
      return [
        row.name,
        row.note,
        row.channel,
        row.created_at,
        row.total,
        row.tier,
        row.wechat_enc ? decryptText(row.wechat_enc) : '',
        parseJson<string[]>(row.slots, []).join(' / '),
        statusLabel[row.contact_status] ?? row.contact_status,
        priority,
        goal,
        target,
        `/r/${row.slug}`,
        row.admin_notes
      ]
    })
  ])

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="vesta-submissions-${new Date().toISOString().slice(0, 10)}.csv"`
  )
  res.send(csv)
})

adminRouter.get('/submissions', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const contactStatus = clampString(req.query.contactStatus, 20)
  const rows = db
    .prepare(
      `SELECT s.id, s.slug, s.total, s.tier, s.contact_status, s.created_at, s.claimed_at,
              s.slots, i.name, i.note, i.channel
       FROM submissions s JOIN invites i ON i.id = s.invite_id
       WHERE (? = '' OR i.name LIKE ? OR i.note LIKE ? OR i.channel LIKE ?)
         AND (? = '' OR s.contact_status = ?)
       ORDER BY s.created_at DESC LIMIT 300`
    )
    .all(q, `%${q}%`, `%${q}%`, `%${q}%`, contactStatus, contactStatus) as Record<
    string,
    unknown
  >[]

  res.json({
    submissions: rows.map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      channel: row.channel,
      total: row.total,
      tier: row.tier,
      claimed: Boolean(row.claimed_at),
      slots: parseJson<string[]>(row.slots, []),
      contactStatus: row.contact_status,
      createdAt: row.created_at,
      reportSlug: row.slug
    }))
  })
})

adminRouter.get('/appointments', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const contactStatus = clampString(req.query.contactStatus, 20)
  const rows = db
    .prepare(
      `SELECT s.id, s.slug, s.total, s.tier, s.contact_status, s.created_at, s.claimed_at,
              s.slots, s.wechat_enc, s.admin_notes, i.name, i.note, i.channel
       FROM submissions s JOIN invites i ON i.id = s.invite_id
       WHERE s.claimed_at IS NOT NULL
         AND (? = '' OR i.name LIKE ? OR i.note LIKE ? OR i.channel LIKE ?)
         AND (? = '' OR s.contact_status = ?)
       ORDER BY s.claimed_at DESC LIMIT 300`
    )
    .all(q, `%${q}%`, `%${q}%`, `%${q}%`, contactStatus, contactStatus) as Record<
    string,
    unknown
  >[]

  res.json({
    appointments: rows.map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      channel: row.channel,
      wechat: row.wechat_enc ? decryptText(String(row.wechat_enc)) : '',
      slots: parseJson<string[]>(row.slots, []),
      contactStatus: row.contact_status,
      adminNotes: row.admin_notes,
      claimedAt: row.claimed_at,
      createdAt: row.created_at,
      reportSlug: row.slug,
      total: row.total,
      tier: row.tier
    }))
  })
})

adminRouter.get('/submissions/:id', (req, res) => {
  noStore(res)
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id) as
    | SubmissionRow
    | undefined
  if (!row) {
    res.status(404).json({ error: '答卷不存在' })
    return
  }
  const invite = db.prepare('SELECT * FROM invites WHERE id = ?').get(row.invite_id) as
    | InviteRow
    | undefined
  const survey = getSurvey(row.survey_id) ?? getActiveSurvey()
  const answers = parseJson<Answers>(row.answers, {})
  const scores = parseJson(row.scores, computeScores(survey, {}))

  res.json({
    id: row.id,
    name: invite?.name ?? '',
    note: invite?.note ?? '',
    channel: invite?.channel ?? '',
    createdAt: row.created_at,
    reportPath: `/r/${row.slug}`,
    total: row.total,
    tier: row.tier,
    scores,
    answers: survey.questions.map((question) => ({
      id: question.id,
      code: question.code,
      title: question.title,
      group: survey.groups.find((g) => g.id === question.groupId)?.title ?? '',
      value: answerLabel(question, answers[question.id]),
      raw: answers[question.id] ?? null
    })),
    groups: survey.groups,
    claimed: Boolean(row.claimed_at),
    wechat: row.wechat_enc ? decryptText(row.wechat_enc) : '',
    slots: parseJson<string[]>(row.slots, []),
    contactStatus: row.contact_status,
    adminNotes: row.admin_notes,
    overrides: parseJson<ReportOverrides>(row.overrides, {}),
    aiStatus: row.ai_status,
    aiError: row.ai_error,
    aiAttempts: row.ai_attempts,
    aiMeta: parseJson<Record<string, unknown>>(row.ai_meta, {})
  })
})

adminRouter.post('/submissions/:id/report', (req, res) => {
  noStore(res)
  if (!regenerateReport(req.params.id)) {
    res.status(404).json({ error: '答卷不存在' })
    return
  }
  res.json({ ok: true })
})

adminRouter.patch('/submissions/:id', (req, res) => {
  noStore(res)
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id) as
    | SubmissionRow
    | undefined
  if (!row) {
    res.status(404).json({ error: '答卷不存在' })
    return
  }
  const body = req.body ?? {}
  const updates: string[] = []
  const values: (string | number | null)[] = []

  if (typeof body.contactStatus === 'string' && CONTACT_STATUSES.has(body.contactStatus)) {
    updates.push('contact_status = ?')
    values.push(body.contactStatus)
  }
  if (typeof body.adminNotes === 'string') {
    updates.push('admin_notes = ?')
    values.push(body.adminNotes.slice(0, 2000))
  }
  if (body.overrides && typeof body.overrides === 'object') {
    const current = parseJson<ReportOverrides>(row.overrides, {})
    const next: ReportOverrides = {
      diagnosis:
        typeof body.overrides.diagnosis === 'string'
          ? body.overrides.diagnosis.slice(0, 1500)
          : current.diagnosis,
      closing:
        typeof body.overrides.closing === 'string'
          ? body.overrides.closing.slice(0, 1500)
          : current.closing
    }
    updates.push('overrides = ?')
    values.push(JSON.stringify(next))
  }

  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的内容' })
    return
  }

  values.push(req.params.id)
  db.prepare(`UPDATE submissions SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  res.json({ ok: true })
})

adminRouter.get('/survey', (req, res) => {
  noStore(res)
  const survey = getActiveSurvey()
  const versions = db.prepare('SELECT COUNT(*) AS count FROM surveys').get() as { count: number }
  res.json({ survey, versions: versions.count })
})

adminRouter.put('/survey', (req, res) => {
  noStore(res)
  const input = (req.body?.survey ?? req.body) as Survey
  if (!input || typeof input !== 'object') {
    res.status(400).json({ error: '问卷数据无效' })
    return
  }
  const errors = validateSurvey(input)
  if (errors.length) {
    res.status(400).json({ error: errors[0], errors })
    return
  }
  const saved = publishSurvey(input)
  res.json({ survey: saved })
})

adminRouter.get('/template', (req, res) => {
  noStore(res)
  res.json({ template: getTemplate() })
})

adminRouter.put('/template', (req, res) => {
  noStore(res)
  const input = (req.body?.template ?? req.body) as ReportTemplate
  if (!input || typeof input !== 'object') {
    res.status(400).json({ error: '报告模板数据无效' })
    return
  }
  const errors = validateTemplate(input)
  if (errors.length) {
    res.status(400).json({ error: errors[0], errors })
    return
  }
  const current = getTemplate()
  const next: ReportTemplate = { ...input, version: (current.version || 0) + 1 }
  saveTemplate(next)
  res.json({ template: next })
})

adminRouter.get('/skill', (req, res) => {
  noStore(res)
  res.json({
    skill: getReportSkill(),
    defaultSkill: defaultReportSkill,
    ai: {
      configured: isAiConfigured(),
      searchConfigured: isSearchConfigured(),
      model: config.deepseekModel
    }
  })
})

adminRouter.put('/skill', (req, res) => {
  noStore(res)
  const skill = typeof req.body?.skill === 'string' ? req.body.skill.trim() : ''
  if (skill.length < 100) {
    res.status(400).json({ error: 'Skill 内容太短' })
    return
  }
  if (skill.length > 60_000) {
    res.status(400).json({ error: 'Skill 内容太长' })
    return
  }
  saveReportSkill(skill)
  res.json({ skill })
})

function sampleAnswers(survey: Survey): Answers {
  const answers: Answers = {}
  for (const question of survey.questions) {
    if (question.type === 'text') {
      if (question.id === 'a8') {
        answers[question.id] = ['杭州', '跨境电商运营', '当地产业和岗位更集中，生活成本也能接受']
      } else if (question.fields?.length) {
        answers[question.id] = question.fields.map((field) => `${field}示例`)
      } else {
        answers[question.id] = '示例内容'
      }
      continue
    }
    if (question.type === 'number') {
      answers[question.id] = 2
      continue
    }
    if (question.type === 'matrix') {
      answers[question.id] = Object.fromEntries(
        (question.rows ?? []).map((row, index) => [row.id, index === 0 ? 4 : 3])
      )
      continue
    }
    if (question.type === 'multi') {
      answers[question.id] = question.options?.slice(0, 2).map((o) => o.id) ?? []
      continue
    }
    const options = question.options ?? []
    let option = options[0]
    if (question.display === 'rating') {
      option = options.find((o) => o.score === 4) ?? options[options.length - 1]
    } else if (question.role === 'behavior') {
      option = options.find((o) => o.score === options[0]?.score) ?? options[0]
    }
    if (question.type === 'choiceText') {
      answers[question.id] = {
        choice: option?.id ?? '',
        note: '明年 3 月前完成，并拿到可核对的结果'
      }
      continue
    }
    answers[question.id] = option?.id ?? null
  }
  return answers
}

adminRouter.post('/report/preview', (req, res) => {
  noStore(res)
  const survey = (req.body?.survey as Survey) ?? getActiveSurvey()
  const template = (req.body?.template as ReportTemplate) ?? getTemplate()
  const templateErrors = validateTemplate(template)
  if (templateErrors.length) {
    res.status(400).json({ error: templateErrors[0], errors: templateErrors })
    return
  }
  const input = req.body?.answers
  const answers =
    input && typeof input === 'object'
      ? validateAnswers(survey, input).answers
      : sampleAnswers(survey)
  const scores = computeScores(survey, answers)
  const payload = buildReport({
    survey,
    answers,
    scores,
    template,
    name: '预览学员',
    slug: 'preview',
    createdAt: now(),
    claimed: false,
    overrides: req.body?.overrides
  })
  res.json(payload)
})
