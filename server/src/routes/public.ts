import crypto from 'node:crypto'
import { Router } from 'express'
import type {
  Answers,
  ReportOverrides,
  ReportPayload,
  ReportResponse,
  ReportSearchMeta,
  ScoreResult
} from '../../../shared/src/types'
import { computeScores } from '../../../shared/src/scoring'
import { buildReport } from '../../../shared/src/report'
import { buildAiReport } from '../../../shared/src/ai'
import { buildDocReportWithAi, docPriority } from '../../../shared/src/doc'
import { validateAnswers } from '../../../shared/src/validate'
import { db, getActiveSurvey, getSurvey, getTemplate, now, recordEvent, surveyReportMode } from '../db'
import {
  ensureReportGeneration,
  isAiConfigured,
  isRetryableError,
  readStoredContent,
  regenerateReport
} from '../ai/generate'
import { enqueueReport } from '../ai/report-queue'
import { readDocContent } from '../ai/doc-generate'
import { noStore } from '../auth'
import { readDeployInfo } from '../deploy-info'
import { log } from '../log'
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
  ai_meta: string
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
    let dbReady = true
    try {
      db.prepare('SELECT 1').get()
    } catch (error) {
      dbReady = false
      log.warn('health.db_failed', { err: error })
    }
    const deploy = readDeployInfo()
    res.json({
      ok: true,
      time: now(),
      db: dbReady,
      uptimeSec: Math.round(process.uptime()),
      // 第 9 篇落地后 update.sh 会写 data/deploy-info.json；没有文件时留空，
      // 不要用 version 字段，update.sh 的 L5 会把 semver 当成 commit 比对。
      commit: deploy?.commit ?? '',
      appVersion: deploy?.productVersion ?? ''
    })
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
    const rawAnswers = req.body?.answers
    const answerCount =
      rawAnswers && typeof rawAnswers === 'object' ? Object.keys(rawAnswers).length : 0
    const validation = validateAnswers(survey, rawAnswers)
    if (!validation.ok) {
      log.warn('submit.invalid', {
        reqId: res.locals.reqId,
        inviteId: invite.id,
        answerCount,
        error: validation.errors[0] ?? '还有必答题没有完成'
      })
      res.status(400).json({
        error: validation.errors[0] ?? '还有必答题没有完成',
        errors: validation.errors,
        missing: validation.missing
      })
      return
    }

    const answers = validation.answers as Answers
    // doc 模式没有数字总分：只写优先级 A/B/C，total 固定 0。
    // 不再把 A/B/C 映射成 82/60/25 冒充测评分数，后台按 reportMode 只展示优先级。
    const scores: ScoreResult =
      survey.reportMode === 'doc'
        ? { total: 0, tier: docPriority(survey, answers), dimensions: [], detail: {} }
        : computeScores(survey, answers)

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
         (id, slug, invite_id, survey_id, report_mode, answers, scores, total, tier, timing,
          overrides, contact_status, admin_notes, claimed_at, wechat_enc, slots, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        slug,
        invite.id,
        survey.id,
        surveyReportMode(survey),
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
    log.info('submit.stored', {
      reqId: res.locals.reqId,
      inviteId: invite.id,
      submissionId: id,
      answerCount: Object.keys(answers).length,
      reportMode: survey.reportMode ?? 'default'
    })
    enqueueReport(id)
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

    // 文档版问卷：整份报告交给 AI 写。没写完之前不给基础版，只让前端显示加载画面。
    // 只对 q1 开头的答卷生效，旧问卷的存量答卷仍走原路径。
    if (survey.reportMode === 'doc' && 'q1' in answers) {
      if (req.query.poll !== '1') recordEvent(submission.invite_id, 'report_view')
      const storedDoc = readDocContent(submission.ai_report)
      if (submission.ai_status === 'ready' && storedDoc) {
        const aiMeta = parseJson<{ search?: ReportSearchMeta }>(submission.ai_meta, {})
        const response: ReportResponse = {
          status: 'ready',
          report: buildDocReportWithAi({
            survey,
            answers,
            name,
            slug: submission.slug,
            createdAt: submission.created_at,
            claimed: Boolean(submission.claimed_at),
            content: storedDoc.content,
            jobs: storedDoc.jobs,
            search: storedDoc.search ?? aiMeta.search
          }),
          name
        }
        res.json(response)
        return
      }

      if (submission.ai_status === 'failed') {
        const error = submission.ai_error || 'AI 报告生成失败'
        const response: ReportResponse = {
          status: 'failed',
          report: null,
          name,
          error,
          retryable: isRetryableError(error)
        }
        res.json(response)
        return
      }

      const started = ensureReportGeneration({
        id: submission.id,
        status: submission.ai_status,
        startedAt: submission.ai_started_at,
        finishedAt: submission.ai_finished_at,
        attempts: submission.ai_attempts,
        error: submission.ai_error
      })
      const response: ReportResponse = {
        status: started || submission.ai_status === 'running' ? 'running' : 'pending',
        report: null,
        name,
        ...(submission.ai_error ? { notice: submission.ai_error } : {})
      }
      res.json(response)
      return
    }

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

    const storedContent = readStoredContent(submission.ai_report)
    let storedPayload: ReportPayload | null = null
    if (storedContent) {
      try {
        storedPayload = buildAiReport({
          survey,
          answers,
          scores,
          template,
          name,
          slug: submission.slug,
          createdAt: submission.created_at,
          claimed: Boolean(submission.claimed_at),
          overrides,
          content: storedContent
        })
      } catch (error) {
        log.error('report.render_failed', {
          reqId: res.locals.reqId,
          submissionId: submission.id,
          err: error
        })
        status = 'failed'
        statusError = 'AI 报告内容损坏，当前显示基础内容'
        db.prepare(
          "UPDATE submissions SET ai_status = 'failed', ai_error = ? WHERE id = ?"
        ).run(statusError, submission.id)
      }
    }

    if (submission.ai_status === 'ready' && storedPayload) {
      recordView()
      const response: ReportResponse = { status: 'ready', report: storedPayload, name }
      res.json(response)
      return
    }

    if (submission.ai_status === 'ready' && !storedPayload) {
      status = 'failed'
      statusError = storedContent
        ? 'AI 报告内容损坏，当前显示基础内容'
        : 'AI 报告内容缺失，当前显示基础内容'
      db.prepare(
        "UPDATE submissions SET ai_status = 'failed', ai_error = ? WHERE id = ?"
      ).run(statusError, submission.id)
    }

    if (!isAiConfigured() && status !== 'ready' && status !== 'failed') {
      status = 'failed'
      statusError = 'AI 分析还没有配置，当前显示基础内容'
      db.prepare(
        "UPDATE submissions SET ai_status = 'failed', ai_error = ? WHERE id = ?"
      ).run(statusError, submission.id)
    }

    const started = ensureReportGeneration({
      id: submission.id,
      status,
      startedAt: submission.ai_started_at,
      finishedAt: submission.ai_finished_at,
      attempts: submission.ai_attempts,
      error: statusError
    })
    if (started) status = 'running'

    if (status === 'failed' || !isAiConfigured()) {
      recordView()
      if (storedPayload) {
        const response: ReportResponse = {
          status: 'failed',
          report: storedPayload,
          name,
          notice: '本次更新没有成功，当前仍显示上一版报告。'
        }
        res.json(response)
        return
      }
      const response: ReportResponse = {
        status: 'failed',
        report: buildFallback(),
        name,
        error:
          status === 'failed'
            ? 'AI 分析暂未生成成功，当前显示基础版。把本页截图发给发链接的人，可以帮你重新生成。'
            : '当前显示基础版。'
      }
      res.json(response)
      return
    }

    if (storedPayload) {
      recordView()
      const response: ReportResponse = {
        status: status === 'running' ? 'running' : 'pending',
        report: storedPayload,
        name,
        notice: 'AI 深度版正在更新，当前先显示上一版，完成后会自动替换。'
      }
      res.json(response)
      return
    }

    if (req.query.preview === '1') {
      recordView()
      const response: ReportResponse = {
        status: status === 'running' ? 'running' : 'pending',
        report: buildFallback(),
        name,
        notice: 'AI 深度版还在生成，当前先显示基础版，完成后会自动替换。'
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
  '/report/:slug/retry',
  rateLimit('report-retry', 5, 60_000),
  (req, res) => {
    noStore(res)
    const submission = findSubmissionBySlug(req.params.slug)
    if (!submission) {
      res.status(404).json({ error: '报告不存在' })
      return
    }
    if (!isAiConfigured()) {
      res.status(503).json({ error: 'AI 分析还没有配置，暂时无法重试' })
      return
    }
    if (submission.ai_status === 'ready') {
      res.status(409).json({ error: '报告已经生成，不需要重试' })
      return
    }
    const survey = getSurvey(submission.survey_id) ?? getActiveSurvey()
    if (survey.reportMode !== 'doc') {
      res.status(409).json({ error: '这份报告不需要 AI 全文重试' })
      return
    }
    if (!regenerateReport(submission.id)) {
      res.status(404).json({ error: '报告不存在' })
      return
    }
    recordEvent(submission.invite_id, 'ai_report_retry_manual')
    res.json({ ok: true, status: 'pending' })
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
      const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {}
      const payloadJson = JSON.stringify(event?.payload ?? {}).slice(0, 2000)
      // 与 recordEvent 走同一处写入，保证「有原始事件就一定有漏斗事实」。
      recordEvent(invite.id, type, payload, payloadJson)
    }

    res.json({ ok: true })
  }
)
