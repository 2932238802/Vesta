import crypto from 'node:crypto'
import { Router, raw } from 'express'
import type { Request, Response } from 'express'
import type { Answers, ReportOverrides, ReportTemplate, Survey } from '../../../shared/src/types'
import { defaultReportSkill } from '../../../shared/src/ai'
import { isResumeMajor } from '../../../shared/src/resume'
import type { ResumeImageSummary } from '../../../shared/src/resume'
import { computeScores } from '../../../shared/src/scoring'
import { buildReport, answerLabel } from '../../../shared/src/report'
import { validateAnswers, validateSurvey, validateTemplate } from '../../../shared/src/validate'
import { config } from '../env'
import { checkCredentials, createToken, noStore, requireAdmin } from '../auth'
import {
  DEFAULT_REPORT_SKILL_ID,
  activateReportSkill,
  createReportSkillTemplate,
  db,
  deleteAdminSession,
  deleteReportSkillTemplate,
  getActiveSurvey,
  getReportSkillState,
  getSurvey,
  getTemplate,
  newId,
  now,
  publishSurvey,
  recordEvent,
  updateReportSkillTemplate,
  saveTemplate
} from '../db'
import { isAiConfigured, isSearchConfigured, regenerateReport } from '../ai/generate'
import { consultRouter } from './consult'
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

adminRouter.post('/dev-login', (req, res) => {
  noStore(res)
  if (!config.devGuestLogin) {
    res.status(404).json({ error: '接口不存在' })
    return
  }
  const username = '本地测试'
  res.json({ token: createToken(username), user: { username } })
})

adminRouter.use(requireAdmin())

adminRouter.use('/consult', consultRouter)

adminRouter.get('/me', (req, res) => {
  res.json({ user: { username: res.locals.admin } })
})

adminRouter.post('/logout', (req, res) => {
  noStore(res)
  const sessionId = typeof res.locals.adminSessionId === 'string' ? res.locals.adminSessionId : ''
  if (sessionId) deleteAdminSession(sessionId)
  res.json({ ok: true })
})

const RESUME_IMAGE_MAX_BYTES = 10 * 1024 * 1024

function detectResumeImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  if (buffer.length >= 6) {
    const head = buffer.subarray(0, 6).toString('ascii')
    if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

function resumeFileName(req: Request): string {
  const header = typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : ''
  let name = header
  try {
    name = decodeURIComponent(header)
  } catch {
    // 文件名不是编码过的就按原样使用。
  }
  name = (name.split(/[\\/]/).pop() ?? '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
  return (name || '简历图片').slice(0, 180)
}

interface ResumeImageRow {
  id: string
  major: string
  file_name: string
  mime: string
  size: number
  created_at: string
  data?: Uint8Array
}

adminRouter.get('/resumes', (_req, res) => {
  noStore(res)
  const rows = db
    .prepare(
      'SELECT id, major, file_name, mime, size, created_at FROM resume_images ORDER BY created_at DESC'
    )
    .all() as unknown as ResumeImageRow[]
  const items: ResumeImageSummary[] = rows.map((row) => ({
    id: row.id,
    major: row.major,
    fileName: row.file_name,
    mime: row.mime,
    size: row.size,
    createdAt: row.created_at
  }))
  res.json({ items })
})

adminRouter.post('/resumes', raw({ type: () => true, limit: '20mb' }), (req, res) => {
  try {
    const body = req.body
    if (!Buffer.isBuffer(body) || !body.length) {
      throw new Error('请选择要导入的简历图片')
    }
    if (body.length > RESUME_IMAGE_MAX_BYTES) {
      throw new Error('单张图片不能超过 10MB')
    }
    const mime = detectResumeImageMime(body)
    if (!mime) {
      throw new Error('只支持 JPG、PNG、WebP、GIF 图片')
    }
    const major = typeof req.query.major === 'string' ? req.query.major.trim() : ''
    if (!isResumeMajor(major)) {
      throw new Error('请选择有效的专业')
    }
    const item: ResumeImageSummary = {
      id: newId('resume'),
      major,
      fileName: resumeFileName(req),
      mime,
      size: body.length,
      createdAt: now()
    }
    db.prepare(
      'INSERT INTO resume_images (id, major, file_name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(item.id, item.major, item.fileName, item.mime, item.size, body, item.createdAt)
    res.status(201).json({ item })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '导入失败' })
  }
})

function getResumeImage(id: string): ResumeImageRow | null {
  const row = db
    .prepare('SELECT id, major, file_name, mime, size, created_at, data FROM resume_images WHERE id = ?')
    .get(id) as unknown as ResumeImageRow | undefined
  return row ?? null
}

function sendResumeImage(res: Response, row: ResumeImageRow, download: boolean): void {
  res.setHeader('Content-Type', row.mime)
  res.setHeader('Content-Length', String(row.size))
  res.setHeader('Cache-Control', 'private, no-store')
  if (download) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="resume-image"; filename*=UTF-8''${encodeURIComponent(row.file_name)}`
    )
  }
  res.end(Buffer.from(row.data ?? new Uint8Array()))
}

adminRouter.get('/resumes/:id/file', (req, res) => {
  const row = getResumeImage(req.params.id)
  if (!row) {
    res.status(404).json({ error: '简历图片不存在' })
    return
  }
  sendResumeImage(res, row, false)
})

adminRouter.get('/resumes/:id/download', (req, res) => {
  const row = getResumeImage(req.params.id)
  if (!row) {
    res.status(404).json({ error: '简历图片不存在' })
    return
  }
  sendResumeImage(res, row, true)
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

interface RosterRow {
  invite_id: string
  token: string
  name: string
  note: string
  channel: string
  invite_created_at: string
  opened_at: string | null
  submitted_at: string | null
  expires_at: string | null
  submission_id: string | null
  slug: string | null
  total: number | null
  tier: string | null
  claimed_at: string | null
  slots: string | null
  contact_status: string | null
  submission_created_at: string | null
}

type RosterStage =
  | 'pending'
  | 'opened'
  | 'expired'
  | 'unclaimed'
  | 'new'
  | 'contacted'
  | 'scheduled'
  | 'done'

const ROSTER_CATEGORIES = new Set([
  '',
  'all',
  'unsubmitted',
  'pending',
  'opened',
  'expired',
  'unclaimed',
  'new',
  'contacted',
  'scheduled',
  'done'
])

function rosterStage(row: RosterRow): RosterStage {
  if (row.submission_id) {
    if (!row.claimed_at) return 'unclaimed'
    if (
      row.contact_status === 'contacted' ||
      row.contact_status === 'scheduled' ||
      row.contact_status === 'done'
    ) {
      return row.contact_status
    }
    return 'new'
  }
  if (row.expires_at && row.expires_at <= now()) return 'expired'
  return row.opened_at ? 'opened' : 'pending'
}

function rosterCategoryMatches(category: string, stage: RosterStage): boolean {
  if (!category || category === 'all') return true
  if (category === 'unsubmitted') {
    return stage === 'pending' || stage === 'opened' || stage === 'expired'
  }
  return category === stage
}

function localDateKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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

adminRouter.get('/roster', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const requested = clampString(req.query.category, 20)
  const category = ROSTER_CATEGORIES.has(requested) ? requested : ''
  const selectedDates = new Set(
    clampString(req.query.dates, 2000)
      .split(',')
      .map((date) => date.trim())
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .slice(0, 120)
  )
  const rows = db
    .prepare(
      `SELECT i.id AS invite_id, i.token, i.name, i.note, i.channel,
              i.created_at AS invite_created_at, i.opened_at, i.submitted_at, i.expires_at,
              s.id AS submission_id, s.slug, s.total, s.tier, s.claimed_at, s.slots,
              s.contact_status, s.created_at AS submission_created_at
       FROM invites i LEFT JOIN submissions s ON s.invite_id = i.id
       ORDER BY COALESCE(s.created_at, i.created_at) DESC LIMIT 1000`
    )
    .all() as unknown as RosterRow[]

  const prepared = rows.map((row) => ({
    row,
    stage: rosterStage(row),
    date: localDateKey(row.invite_created_at)
  }))

  const dateCounts = new Map<string, number>()
  for (const item of prepared) {
    if (!item.date) continue
    dateCounts.set(item.date, (dateCounts.get(item.date) ?? 0) + 1)
  }

  const needle = q.toLocaleLowerCase()
  const queryFiltered = needle
    ? prepared.filter(({ row }) =>
        [row.name, row.note, row.channel].some((value) =>
          String(value ?? '')
            .toLocaleLowerCase()
            .includes(needle)
        )
      )
    : prepared

  const dateFiltered = selectedDates.size
    ? queryFiltered.filter((item) => selectedDates.has(item.date))
    : queryFiltered
  const counts: Record<string, number> = {
    all: dateFiltered.length,
    unsubmitted: 0,
    pending: 0,
    opened: 0,
    expired: 0,
    unclaimed: 0,
    new: 0,
    contacted: 0,
    scheduled: 0,
    done: 0
  }

  for (const item of dateFiltered) {
    counts[item.stage] += 1
    if (item.stage === 'pending' || item.stage === 'opened' || item.stage === 'expired') {
      counts.unsubmitted += 1
    }
  }

  const roster = dateFiltered
    .filter((item) => rosterCategoryMatches(category, item.stage))
    .map(({ row, stage }) => {
      return {
        id: row.invite_id,
        inviteId: row.invite_id,
        submissionId: row.submission_id,
        token: row.token,
        name: row.name,
        note: row.note,
        channel: row.channel,
        stage,
        inviteCreatedAt: row.invite_created_at,
        openedAt: row.opened_at,
        submittedAt: row.submitted_at ?? row.submission_created_at,
        expiresAt: row.expires_at,
        total: row.total,
        tier: row.tier,
        claimed: Boolean(row.claimed_at),
        slots: parseJson<string[]>(row.slots, []),
        contactStatus: row.contact_status,
        reportSlug: row.slug,
        reportPath: row.slug ? `/r/${row.slug}` : null,
        detailPath: row.submission_id ? `/admin/submissions/${row.submission_id}` : null
      }
    })

  res.json({
    roster,
    counts,
    dates: [...dateCounts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
  })
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

adminRouter.delete('/submissions/:id', (req, res) => {
  noStore(res)
  const row = db
    .prepare('SELECT id, invite_id FROM submissions WHERE id = ?')
    .get(req.params.id) as { id: string; invite_id: string } | undefined
  if (!row) {
    res.status(404).json({ error: '答卷不存在' })
    return
  }

  // 删答卷时把邀请链接放回「已打开、未提交」，同一条链接可以重新填。
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM submissions WHERE id = ?').run(row.id)
    db.prepare(
      "UPDATE invites SET status = 'opened', submitted_at = NULL WHERE id = ?"
    ).run(row.invite_id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  recordEvent(row.invite_id, 'submission_deleted')
  res.json({ ok: true })
})

adminRouter.post('/roster/batch-delete', (req, res) => {
  noStore(res)
  const raw: unknown[] = Array.isArray(req.body?.inviteIds)
    ? (req.body.inviteIds as unknown[])
    : []
  const ids: string[] = []
  for (const id of raw) {
    if (typeof id !== 'string' || !id || ids.includes(id)) continue
    ids.push(id)
    if (ids.length >= 200) break
  }
  if (ids.length === 0) {
    res.status(400).json({ error: '没有选中要删除的记录' })
    return
  }

  let deleted = 0
  db.exec('BEGIN')
  try {
    for (const inviteId of ids) {
      // 先删答卷，再删邀请；没有答卷的记录直接删邀请。
      db.prepare('DELETE FROM submissions WHERE invite_id = ?').run(inviteId)
      const result = db.prepare('DELETE FROM invites WHERE id = ?').run(inviteId)
      if (Number(result.changes) > 0) deleted += 1
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  res.json({ ok: true, deleted })
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
  const { templates, activeId } = getReportSkillState()
  res.json({
    defaultSkill: defaultReportSkill,
    templates,
    activeId,
    ai: {
      configured: isAiConfigured(),
      searchConfigured: isSearchConfigured(),
      model: config.deepseekModel
    }
  })
})

function skillTemplateInput(body: unknown, fallbackSkill?: string) {
  const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const skill = typeof input.skill === 'string' ? input.skill.trim() : fallbackSkill ?? ''
  if (!name) return { error: '请填写模板名称' } as const
  if (name.length > 40) return { error: '模板名称最多 40 个字' } as const
  if (skill.length < 100) return { error: '分析规则内容太短' } as const
  if (skill.length > 60_000) return { error: '分析规则内容太长' } as const
  return { name, skill } as const
}

adminRouter.post('/skill/templates', (req, res) => {
  noStore(res)
  const input = skillTemplateInput(req.body, defaultReportSkill)
  if ('error' in input) {
    res.status(400).json({ error: input.error })
    return
  }
  const template = createReportSkillTemplate(input.name, input.skill)
  res.json({ template })
})

adminRouter.put('/skill/templates/:id', (req, res) => {
  noStore(res)
  if (req.params.id === DEFAULT_REPORT_SKILL_ID) {
    res.status(403).json({ error: '默认设置不能修改，请新建模板' })
    return
  }
  const input = skillTemplateInput(req.body)
  if ('error' in input) {
    res.status(400).json({ error: input.error })
    return
  }
  const template = updateReportSkillTemplate(req.params.id, input.name, input.skill)
  if (!template) {
    res.status(404).json({ error: '没有找到这个模板' })
    return
  }
  res.json({ template })
})

adminRouter.delete('/skill/templates/:id', (req, res) => {
  noStore(res)
  if (req.params.id === DEFAULT_REPORT_SKILL_ID) {
    res.status(403).json({ error: '默认设置不能删除' })
    return
  }
  if (!deleteReportSkillTemplate(req.params.id)) {
    res.status(404).json({ error: '没有找到这个模板' })
    return
  }
  res.json({ ok: true })
})

adminRouter.put('/skill/active', (req, res) => {
  noStore(res)
  const id = typeof req.body?.id === 'string' ? req.body.id.trim() : ''
  if (!id || !activateReportSkill(id)) {
    res.status(404).json({ error: '没有找到这个模板' })
    return
  }
  res.json({ activeId: id })
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
    } else if (typeof options[0]?.score === 'number') {
      // B 组客观题在预览里取中间偏上的档位，避免整份预览报告垫底。
      option = options.find((o) => o.score === 4) ?? options[Math.floor(options.length / 2)]
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
