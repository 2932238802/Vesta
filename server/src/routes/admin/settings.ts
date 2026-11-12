import { Router } from 'express'
import type { Answers, ReportTemplate, Survey } from '../../../../shared/src/types'
import { defaultReportSkill } from '../../../../shared/src/ai'
import { defaultDocReportSkill } from '../../../../shared/src/doc-skill'
import { computeScores } from '../../../../shared/src/scoring'
import { buildReport } from '../../../../shared/src/report'
import { validateAnswers, validateSurvey, validateTemplate } from '../../../../shared/src/validate'
import { config } from '../../env'
import { noStore } from '../../auth'
import {
  DEFAULT_REPORT_SKILL_ID,
  activateReportSkill,
  createReportSkillTemplate,
  db,
  deleteReportSkillTemplate,
  getActiveSurvey,
  getReportSkillState,
  getTemplate,
  now,
  publishSurvey,
  saveTemplate,
  updateReportSkillTemplate
} from '../../db'
import { isAiConfigured, isSearchConfigured } from '../../ai/generate'

export const settingsRouter = Router()

settingsRouter.get('/survey', (req, res) => {
  noStore(res)
  const survey = getActiveSurvey()
  const versions = db.prepare('SELECT COUNT(*) AS count FROM surveys').get() as { count: number }
  res.json({ survey, versions: versions.count })
})

settingsRouter.put('/survey', (req, res) => {
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

settingsRouter.get('/template', (req, res) => {
  noStore(res)
  res.json({ template: getTemplate() })
})

settingsRouter.put('/template', (req, res) => {
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

settingsRouter.get('/skill', (req, res) => {
  noStore(res)
  const { templates, activeId } = getReportSkillState()
  const survey = getActiveSurvey()
  res.json({
    defaultSkill: survey.reportMode === 'doc' ? defaultDocReportSkill : defaultReportSkill,
    reportMode: survey.reportMode ?? 'score',
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

settingsRouter.post('/skill/templates', (req, res) => {
  noStore(res)
  const input = skillTemplateInput(req.body, defaultReportSkill)
  if ('error' in input) {
    res.status(400).json({ error: input.error })
    return
  }
  const template = createReportSkillTemplate(input.name, input.skill)
  res.json({ template })
})

settingsRouter.put('/skill/templates/:id', (req, res) => {
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

settingsRouter.delete('/skill/templates/:id', (req, res) => {
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

settingsRouter.put('/skill/active', (req, res) => {
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

settingsRouter.post('/report/preview', (req, res) => {
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
