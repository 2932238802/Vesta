import { Router, raw } from 'express'
import type { Answers, ReportOverrides } from '../../../../shared/src/types'
import { answerLabel } from '../../../../shared/src/report'
import { computeScores } from '../../../../shared/src/scoring'
import { noStore } from '../../auth'
import { db, getActiveSurvey, getSurvey, recordEvent } from '../../db'
import { regenerateReport } from '../../ai/generate'
import { clampString, decryptText, parseJson, toCsv } from '../../util'
import { CONTACT_STATUSES, reportModeOf, surveyReportModes } from './shared'
import type { InviteRow, SubmissionRow } from './shared'

export const submissionsRouter = Router()

submissionsRouter.get('/submissions/export.csv', (req, res) => {
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
        survey.reportMode === 'doc' ? '' : row.total,
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

submissionsRouter.get('/submissions', (req, res) => {
  noStore(res)
  const q = clampString(req.query.q, 80)
  const contactStatus = clampString(req.query.contactStatus, 20)
  const rows = db
    .prepare(
      `SELECT s.id, s.slug, s.survey_id, s.total, s.tier, s.contact_status, s.created_at, s.claimed_at,
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

  const reportModes = surveyReportModes()

  res.json({
    submissions: rows.map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      channel: row.channel,
      total: row.total,
      tier: row.tier,
      reportMode: reportModeOf(reportModes, row.survey_id as string),
      claimed: Boolean(row.claimed_at),
      slots: parseJson<string[]>(row.slots, []),
      contactStatus: row.contact_status,
      createdAt: row.created_at,
      reportSlug: row.slug
    }))
  })
})

submissionsRouter.get('/submissions/:id', (req, res) => {
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
    reportMode: reportModeOf(surveyReportModes(), row.survey_id),
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

submissionsRouter.post('/submissions/:id/report', (req, res) => {
  noStore(res)
  if (!regenerateReport(req.params.id)) {
    res.status(404).json({ error: '答卷不存在' })
    return
  }
  res.json({ ok: true })
})

submissionsRouter.patch('/submissions/:id', (req, res) => {
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

submissionsRouter.delete('/submissions/:id', (req, res) => {
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

