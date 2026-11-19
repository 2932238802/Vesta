import { defaultSurvey } from '../../../../shared/src/survey'
import type { Survey } from '../../../../shared/src/types'
import { db } from '../connection'
import { getSetting } from '../core'
import { log } from '../../log'

function insertAfter(questions: Survey['questions'], afterId: string, question: Survey['questions'][number]) {
  const index = questions.findIndex((item) => item.id === afterId)
  if (index >= 0) questions.splice(index + 1, 0, question)
  else questions.push(question)
}

/** Q18「上次四级哪部分丢分最多」从单选改成多选；只在题目本身还是默认形态时生效。 */
function patchQ18Multi(questions: Survey['questions']): boolean {
  const q18 = questions.find((q) => q.id === 'q18')
  if (!q18 || q18.type !== 'single') return false
  const labels = (q18.options ?? []).map((option) => option.label)
  const defaults = ['听力', '阅读', '写作翻译', '完形选词', '说不清']
  if (!defaults.every((label) => labels.includes(label))) return false
  q18.type = 'multi'
  return true
}

/** Q21「背单词的情况」从单选改成多选；同样只认默认选项。 */
function patchQ21Multi(questions: Survey['questions']): boolean {
  const q21 = questions.find((q) => q.id === 'q21')
  if (!q21 || q21.type !== 'single') return false
  const labels = (q21.options ?? []).map((option) => option.label)
  const defaults = ['每天背、能记住', '背了忘、忘了背', '考前突击', '基本不背']
  if (!defaults.every((label) => labels.includes(label))) return false
  q21.type = 'multi'
  return true
}

/** Q25「英语学不好的原因」不限选几项；顺带把还是单选的默认题改成多选。 */
function patchQ25Multi(questions: Survey['questions']): boolean {
  const q25 = questions.find((q) => q.id === 'q25')
  if (!q25) return false
  let changed = false
  if (q25.maxSelect !== undefined) {
    delete q25.maxSelect
    changed = true
  }
  const labels = (q25.options ?? []).map((option) => option.label)
  const defaults = ['没时间', '记不住', '没人教方法', '坚持不下来', '基础太差']
  if (
    q25.type === 'single' &&
    defaults.every((label) => labels.includes(label))
  ) {
    q25.type = 'multi'
    changed = true
  }
  return changed
}

/** Q18「英语现在的情况」换文案；题目被删掉时补回来，只认旧默认文案。 */
function patchQ17EnglishStage(questions: Survey['questions']): boolean {
  const canonical = defaultSurvey.questions.find((q) => q.id === 'q17')
  if (!canonical) return false
  const index = questions.findIndex((q) => q.id === 'q17')
  if (index === -1) {
    const at = questions.findIndex((q) => q.id === 'q24')
    questions.splice(at === -1 ? questions.length : at, 0, {
      ...canonical,
      options: canonical.options?.map((option) => ({ ...option }))
    })
    return true
  }
  const q17 = questions[index]
  const labels = (q17.options ?? []).map((option) => option.label)
  const oldDefaults = [
    '四级还没过，正在备考四级',
    '四级已经过了，正在备考六级',
    '六级已经过了，在准备更高级别的考试（雅思 / 托福 / 考研英语 / 专八）'
  ]
  if (!oldDefaults.every((label) => labels.includes(label))) return false
  q17.title = canonical.title
  q17.options = canonical.options?.map((option) => ({ ...option }))
  return true
}

function surveyShape(survey: Survey): string {
  return JSON.stringify({
    questions: survey.questions,
    groups: survey.groups,
    tiers: survey.tiers,
    // 老问卷没有 reportMode，按 ai 算，避免因为新增字段就判定成“变了”。
    reportMode: survey.reportMode ?? 'ai'
  })
}

/** Q18「口语和听力」提前到「英语现在的情况」后面。 */
function patchQ22Order(questions: Survey['questions']): boolean {
  const q17 = questions.findIndex((q) => q.id === 'q17')
  const q22 = questions.findIndex((q) => q.id === 'q22')
  if (q17 < 0 || q22 < 0 || q22 === q17 + 1) return false
  const [item] = questions.splice(q22, 1)
  questions.splice(q17 + 1, 0, item)
  return true
}

/** Q21「英语学不好的原因」：口语听力已经比较自如时不再问。 */
function patchQ25SkipWhenSpeakingWell(questions: Survey['questions']): boolean {
  const q25 = questions.find((q) => q.id === 'q25')
  if (!q25 || q25.showIf) return false
  q25.showIf = { question: 'q22', not: ['q22_4'] }
  return true
}

/** Q5a 独立成题：去掉「仅当 Q5 选不想/没想清楚才显示」的条件。 */
function patchQ5aIndependent(questions: Survey['questions']): boolean {
  const q5a = questions.find((q) => q.id === 'q5a')
  if (!q5a || !q5a.showIf) return false
  delete q5a.showIf
  return true
}

/** Q9「你的理想薪资」补回城市题后面（历史问卷里有这道选择题，改版时漏掉了）。 */
function patchQ27Salary(questions: Survey['questions']): boolean {
  if (questions.some((q) => q.id === 'q27')) return false
  const canonical = defaultSurvey.questions.find((q) => q.id === 'q27')
  const q8 = questions.findIndex((q) => q.id === 'q8')
  if (!canonical || q8 < 0) return false
  questions.splice(q8 + 1, 0, {
    ...canonical,
    options: canonical.options?.map((option) => ({ ...option }))
  })
  return true
}

/** Q10「我眼中的自己」补在理想薪资后面；从多选改成填空时也要改过来。 */
function patchQ28Self(questions: Survey['questions']): boolean {
  const canonical = defaultSurvey.questions.find((q) => q.id === 'q28')
  if (!canonical) return false

  const existing = questions.find((q) => q.id === 'q28')
  if (existing) {
    if (existing.type === 'text') return false
    existing.type = 'text'
    existing.hint = canonical.hint
    existing.placeholder = canonical.placeholder
    delete existing.options
    delete existing.maxSelect
    return true
  }

  const anchor = questions.findIndex((q) => q.id === 'q27')
  const fallback = questions.findIndex((q) => q.id === 'q8')
  const at = anchor >= 0 ? anchor : fallback
  if (at < 0) return false
  questions.splice(at + 1, 0, {
    ...canonical,
    options: canonical.options?.map((option) => ({ ...option }))
  })
  return true
}

export function upgradeSurvey(survey: Survey): { survey: Survey; changed: boolean } {
  // 后台保存过的问卷（运营自己调过选项、加过题）不整份覆盖；
  // 只应用那些「题目还是默认形态」的结构修正（单选改多选、补回被删的默认题）。
  if (survey.customized) {
    const patched = [...survey.questions]
    const changed =
      patchQ17EnglishStage(patched) ||
      patchQ18Multi(patched) ||
      patchQ21Multi(patched) ||
      patchQ25Multi(patched) ||
      patchQ22Order(patched) ||
      patchQ25SkipWhenSpeakingWell(patched) ||
      patchQ5aIndependent(patched) ||
      patchQ27Salary(patched) ||
      patchQ28Self(patched)
    return changed
      ? { survey: { ...survey, questions: patched }, changed }
      : { survey, changed: false }
  }

  // 没在后台发布过的问卷（seed 或历代迁移生成）直接对齐当前默认结构。
  // 以前的写法只做零散补丁，导致服务器上的 survey-main 一直停留在第一版题目，
  // 后来加的题、改的文案都进不去。
  if (surveyShape(survey) === surveyShape({ ...defaultSurvey, id: survey.id, version: survey.version })) {
    return { survey, changed: false }
  }

  return {
    survey: { ...defaultSurvey, id: survey.id, version: survey.version },
    changed: true
  }
}

/** 把当前启用问卷升级到最新结构；数据损坏时保持原样。可重复执行。 */
export function migrateSurvey(): void {
  const surveyId = getSetting('active_survey')
  if (!surveyId) return
  const row = db.prepare('SELECT version, data FROM surveys WHERE id = ?').get(surveyId) as
    | { version: number; data: string }
    | undefined
  if (!row) return
  try {
    const current = JSON.parse(row.data) as Survey
    const result = upgradeSurvey(current)
    if (result.changed) {
      const version = Math.max(current.version, row.version, 0) + 1
      const survey = { ...result.survey, version }
      db.prepare('UPDATE surveys SET version = ?, data = ? WHERE id = ?').run(
        version,
        JSON.stringify(survey),
        surveyId
      )
      log.info('db.survey_upgraded', {
        version,
        questions: survey.questions.length
      })
    }
  } catch {
    // 数据损坏时保持原样，管理员可以重新发布问卷
  }
}
