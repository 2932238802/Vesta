import crypto from 'node:crypto'
import { Router } from 'express'
import type { Answers, ReportOverrides, ReportResponse } from '../../../shared/src/types'
import { computeScores } from '../../../shared/src/scoring'
import { buildReport } from '../../../shared/src/report'
import { buildAiReport } from '../../../shared/src/ai'
import { validateAnswers } from '../../../shared/src/validate'
import {
  db,
  getActiveSurvey,
  getSurvey,
  getTemplate,
  now,
  recordEvent
} from '../db'
import {
  ensureReportGeneration,
  isAiConfigured,
  readStoredContent,
  startReportGeneration
} from '../ai/generate'
import { noStore } from '../auth'
import {
  asyncRoute,
  encryptText,
  parseJson,
  randomToken,
  rateLimit
} from '../util'

export const publicRouter = Router()

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
  ai_started_at: string | null
  ai_finished_at: string | null
  created_at: string
}

function findInvite(token: string): InviteRow | undefined {
  return db.prepare('SELECT * FROM invites WHERE token = ?').get(token) as InviteRow | undefined
}

function findSubmissionBySlug(slug: string): SubmissionRow | undefined {
  return db.prepare('SELECT * FROM submissions WHERE slug = ?').get(slug) as
    | SubmissionRow
    | undefined
}

function isExpired(invite: InviteRow): boolean {
  return Boolean(invite.expires_at && invite.expires_at <= now())
}

publicRouter.get(
  '/health',
  (req, res) => {
    noStore(res)
    res.json({ ok: true, time: now() })
  }
)

publicRouter.get(
  '/invite/:token',
  rateLimit('invite-open', 60, 60_000),
  (req, res) => {
    noStore(res)
    const invite = findInvite(req.params.token)
    if (!invite) {
      res.status(404).json({ error: '链接无效，请向发链接的人确认' })
      return
    }
    if (isExpired(invite)) {
      res.status(410).json({ error: '链接已过期，请向发链接的人要一条新的' })
      return
    }

    const submission = db
      .prepare('SELECT slug FROM submissions WHERE invite_id = ?')
      .get(invite.id) as { slug: string } | undefined

    if (!submission && invite.status === 'pending') {
      db.prepare("UPDATE invites SET status = 'opened', opened_at = ? WHERE id = ?").run(
        now(),
        invite.id
      )
      recordEvent(invite.id, 'invite_open')
    }

    const survey = getSurvey(invite.survey_id) ?? getActiveSurvey()
    res.json({
      name: invite.name,
      note: invite.note,
      survey,
      submitted: Boolean(submission),
      reportSlug: submission?.slug ?? null
    })
  }
)

publicRouter.post(
  '/invite/:token/submit',
  rateLimit('submit', 8, 60_000),
  asyncRoute(async (req, res) => {
    noStore(res)
    const invite = findInvite(req.params.token)
    if (!invite) {
      res.status(404).json({ error: '链接无效' })
      return
    }
    if (isExpired(invite)) {
      res.status(410).json({ error: '链接已过期' })
      return
    }
    const existing = db
      .prepare('SELECT slug FROM submissions WHERE invite_id = ?')
      .get(invite.id) as { slug: string } | undefined
    if (existing) {
      res.status(409).json({ error: '这份问卷已经提交过了', reportSlug: existing.slug })
      return
    }

    const survey = getSurvey(invite.survey_id) ?? getActiveSurvey()
    const validation = validateAnswers(survey, req.body?.answers)
    if (!validation.ok) {
      res.status(400).json({
        error: validation.errors[0] ?? '还有必答题没有完成',
        errors: validation.errors,
        missing: validation.missing
      })
      return
    }

    const answers = validation.answers as Answers
    const scores = computeScores(survey, answers)

    const timingInput = (req.body?.timing ?? {}) as Record<string, unknown>
    const timing: Record<string, number> = {}
    for (const question of survey.questions) {
      const value = timingInput[question.id]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        timing[question.id] = Math.min(Math.round(value), 15 * 60 * 1000)
      }
    }

    const id = crypto.randomUUID()
    const slug = randomToken(20)
    const createdAt = now()

    db.exec('BEGIN')
    try {
      db.prepare(
        `INSERT INTO submissions
         (id, slug, invite_id, survey_id, answers, scores, total, tier, timing, overrides,
          contact_status, admin_notes, claimed_at, wechat_enc, slots, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        slug,
        invite.id,
        survey.id,
        JSON.stringify(answers),
        JSON.stringify(scores),
        scores.total,
        scores.tier,
        JSON.stringify(timing),
        '{}',
        'new',
        '',
        null,
        null,
        null,
        createdAt
      )
      db.prepare("UPDATE invites SET status = 'submitted', submitted_at = ? WHERE id = ?").run(
        createdAt,
        invite.id
      )
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }

    recordEvent(invite.id, 'submit')
    startReportGeneration(id)
    res.json({ slug })
  })
)

publicRouter.get(
  '/report/:slug',
  rateLimit('report-view', 120, 60_000),
  (req, res) => {
    noStore(res)
    const submission = findSubmissionBySlug(req.params.slug)
    if (!submission) {
      res.status(404).json({ error: '报告不存在' })
      return
    }

    const invite = db.prepare('SELECT * FROM invites WHERE id = ?').get(submission.invite_id) as
      | InviteRow
      | undefined
    const survey = getSurvey(submission.survey_id) ?? getActiveSurvey()
    const template = getTemplate()
    const answers = parseJson<Answers>(submission.answers, {})
    const scores = parseJson(submission.scores, computeScores(survey, {}))
    const overrides = parseJson<ReportOverrides>(submission.overrides, {})
    const name = invite?.name ?? ''

    const buildFallback = () =>
      buildReport({
        survey,
        answers,
        scores,
        template,
        name,
        slug: submission.slug,
        createdAt: submission.created_at,
        claimed: Boolean(submission.claimed_at),
        overrides
      })

    const recordView = () => {
      if (req.query.poll !== '1') recordEvent(submission.invite_id, 'report_view')
    }

    let status = submission.ai_status
    let statusError = submission.ai_error

    if (submission.ai_status === 'ready') {
      const content = readStoredContent(submission.ai_report)
      if (content) {
        try {
          const payload = buildAiReport({
            survey,
            answers,
            scores,
            template,
            name,
            slug: submission.slug,
            createdAt: submission.created_at,
            claimed: Boolean(submission.claimed_at),
            overrides,
            content
          })
          recordView()
          const response: ReportResponse = { status: 'ready', report: payload, name }
          res.json(response)
          return
        } catch (error) {
          console.error('[ai-report] 报告内容无法渲染', submission.id, error)
          db.prepare(
            "UPDATE submissions SET ai_status = 'failed', ai_error = ? WHERE id = ?"
          ).run('AI 报告内容损坏，已使用模板兜底', submission.id)
          status = 'failed'
          statusError = 'AI 报告内容损坏，已使用模板兜底'
        }
      } else {
        db.prepare(
          "UPDATE submissions SET ai_status = 'failed', ai_error = ? WHERE id = ?"
        ).run('AI 报告内容缺失，已使用模板兜底', submission.id)
        status = 'failed'
        statusError = 'AI 报告内容缺失，已使用模板兜底'
      }
    }

    if (!isAiConfigured() && status !== 'ready' && status !== 'failed') {
      status = 'failed'
      statusError = '未配置 DEEPSEEK_API_KEY，报告使用模板兜底'
      db.prepare(
        "UPDATE submissions SET ai_status = 'failed', ai_error = ? WHERE id = ?"
      ).run(statusError, submission.id)
    }

    const started = ensureReportGeneration({
      id: submission.id,
      status,
      startedAt: submission.ai_started_at,
      error: statusError
    })
    if (started) status = 'running'

    if (status === 'failed' || !isAiConfigured()) {
      recordView()
      const response: ReportResponse = {
        status: 'failed',
        report: buildFallback(),
        name,
        error:
          status === 'failed'
            ? 'AI 报告暂时不可用，当前为模板报告'
            : 'AI 未配置，当前为模板报告'
      }
      res.json(response)
      return
    }

    recordView()
    const response: ReportResponse = {
      status: status === 'running' ? 'running' : 'pending',
      report: null,
      name
    }
    res.json(response)
  }
)

publicRouter.post(
  '/report/:slug/claim',
  rateLimit('claim', 6, 60_000),
  asyncRoute(async (req, res) => {
    noStore(res)
    const submission = findSubmissionBySlug(req.params.slug)
    if (!submission) {
      res.status(404).json({ error: '报告不存在' })
      return
    }
    if (submission.claimed_at) {
      res.status(409).json({ error: '已经提交过了' })
      return
    }

    const body = req.body ?? {}
    const wechat = typeof body.wechat === 'string' ? body.wechat.trim() : ''
    const agree = body.agree === true
    const slots = Array.isArray(body.slots)
      ? body.slots
          .filter((s: unknown): s is string => typeof s === 'string')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 3)
      : []

    if (wechat.length < 2 || wechat.length > 80) {
      res.status(400).json({ error: '微信号格式不对' })
      return
    }
    if (slots.length === 0) {
      res.status(400).json({ error: '至少填一个方便的时间段' })
      return
    }
    if (slots.some((slot: string) => slot.length > 80)) {
      res.status(400).json({ error: '时间段写得有点长' })
      return
    }
    if (!agree) {
      res.status(400).json({ error: '需要同意联系方式仅用于这次联系' })
      return
    }

    db.prepare(
      'UPDATE submissions SET claimed_at = ?, wechat_enc = ?, slots = ? WHERE id = ? AND claimed_at IS NULL'
    ).run(now(), encryptText(wechat), JSON.stringify(slots), submission.id)

    recordEvent(submission.invite_id, 'claim_submit')
    res.json({ ok: true })
  })
)

const EVENT_TYPES = new Set([
  'invite_open',
  'quiz_start',
  'group_complete',
  'quiz_exit',
  'report_view',
  'claim_view'
])

publicRouter.post(
  '/events',
  rateLimit('events', 60, 60_000),
  (req, res) => {
    noStore(res)
    const token = typeof req.body?.token === 'string' ? req.body.token : ''
    const invite = token ? findInvite(token) : undefined
    if (!invite) {
      res.status(404).json({ error: '链接无效' })
      return
    }

    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 20) : []
    for (const event of events) {
      const type = typeof event?.type === 'string' ? event.type : ''
      if (!EVENT_TYPES.has(type)) continue
      const payload = JSON.stringify(event?.payload ?? {}).slice(0, 2000)
      db.prepare(
        'INSERT INTO events (invite_id, type, payload, created_at) VALUES (?, ?, ?, ?)'
      ).run(invite.id, type, payload, now())
    }

    res.json({ ok: true })
  }
)
