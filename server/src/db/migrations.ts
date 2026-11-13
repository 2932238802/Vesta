import { defaultSurvey } from '../../../shared/src/survey'
import { defaultTemplate } from '../../../shared/src/template'
import type { ReportTemplate, Survey } from '../../../shared/src/types'
import { db } from './connection'
import { getSetting, now, setSetting } from './core'
import { backfillEventFacts } from './events'
import { clearExpiredAdminSessions, migrateLegacyAdminSession } from './sessions'
import { migrateReportSkill, migrateReportSkillTemplates } from './skill'
import { log } from '../log'

function ensureInviteColumns(): void {
  const columns = new Set(
    (db.prepare('PRAGMA table_info(invites)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  if (!columns.has('group_id')) {
    // 历史数据：界面已改为按期次自动分组，这一列只保留存量，不再读写。
    db.exec('ALTER TABLE invites ADD COLUMN group_id TEXT')
  }
}

function ensureSubmissionColumns(): void {
  const columns = new Set(
    (
      db.prepare('PRAGMA table_info(submissions)').all() as { name: string }[]
    ).map((column) => column.name)
  )
  const additions: [string, string][] = [
    ['ai_status', "TEXT NOT NULL DEFAULT 'pending'"],
    ['ai_report', 'TEXT'],
    ['ai_error', "TEXT NOT NULL DEFAULT ''"],
    ['ai_attempts', 'INTEGER NOT NULL DEFAULT 0'],
    ['ai_meta', "TEXT NOT NULL DEFAULT '{}'"],
    ['ai_started_at', 'TEXT'],
    ['ai_finished_at', 'TEXT']
  ]
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE submissions ADD COLUMN ${name} ${definition}`)
    }
  }
}

function ensureConsultColumns(): void {
  const columns = new Set(
    (db.prepare('PRAGMA table_info(consult_runs)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  const additions: [string, string][] = [
    ['target_length', 'INTEGER NOT NULL DEFAULT 0'],
    ['updated_at', "TEXT NOT NULL DEFAULT ''"],
    ['finished_at', 'TEXT'],
    ['mode', "TEXT NOT NULL DEFAULT 'sentence'"],
    ['purpose_template_id', "TEXT NOT NULL DEFAULT ''"],
    ['purpose_path', "TEXT NOT NULL DEFAULT ''"]
  ]
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE consult_runs ADD COLUMN ${name} ${definition}`)
    }
  }

  const sectionColumns = new Set(
    (db.prepare('PRAGMA table_info(consult_run_sections)').all() as { name: string }[]).map(
      (column) => column.name
    )
  )
  if (!sectionColumns.has('purpose_keys')) {
    db.exec("ALTER TABLE consult_run_sections ADD COLUMN purpose_keys TEXT NOT NULL DEFAULT '[]'")
  }
  const sectionAdditions: [string, string][] = [
    ['module_id', "TEXT NOT NULL DEFAULT ''"],
    ['options_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['selected_option_id', "TEXT NOT NULL DEFAULT ''"],
    ['beats_json', "TEXT NOT NULL DEFAULT '[]'"],
    ['notes', "TEXT NOT NULL DEFAULT ''"],
    ['edited', 'INTEGER NOT NULL DEFAULT 0']
  ]
  for (const [name, definition] of sectionAdditions) {
    if (!sectionColumns.has(name)) {
      db.exec(`ALTER TABLE consult_run_sections ADD COLUMN ${name} ${definition}`)
    }
  }
}

function seed(): void {
  const count = db.prepare('SELECT COUNT(*) AS count FROM surveys').get() as
    | { count: number }
    | undefined
  if (!count?.count) {
    db.prepare('INSERT INTO surveys (id, version, data, created_at) VALUES (?, ?, ?, ?)').run(
      defaultSurvey.id,
      1,
      JSON.stringify(defaultSurvey),
      now()
    )
    setSetting('active_survey', defaultSurvey.id)
  }
  if (!getSetting('report_template')) {
    setSetting('report_template', JSON.stringify(defaultTemplate))
  }
}

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

function upgradeSurvey(survey: Survey): { survey: Survey; changed: boolean } {
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

function upgradeTemplate(template: ReportTemplate): { template: ReportTemplate; changed: boolean } {
  const before = JSON.stringify(template)
  const next = JSON.parse(before) as ReportTemplate & {
    copy: ReportTemplate['copy'] & { hero?: { quote?: string } }
  }

  if (!next.modules.some((module) => module.key === 'target')) {
    const heroIndex = next.modules.findIndex((module) => module.key === 'hero')
    next.modules.splice(heroIndex === -1 ? 0 : heroIndex + 1, 0, {
      key: 'target',
      enabled: true
    })
  }

  next.copy.target = {
    ...defaultTemplate.copy.target,
    ...(next.copy.target ?? {}),
    salaryBands: {
      ...defaultTemplate.copy.target.salaryBands,
      ...(next.copy.target?.salaryBands ?? {})
    }
  }

  next.copy.cognition = {
    ...defaultTemplate.copy.cognition,
    ...(next.copy.cognition ?? {}),
    options: {
      ...defaultTemplate.copy.cognition.options,
      ...(next.copy.cognition?.options ?? {})
    }
  }

  // 旧版认知模块是按“选一个最重要的因素”写的，变量和判定方式都已过时。
  // 只替换确定是旧版默认文案的字段，保留管理员自己改过的内容。
  const cognition = next.copy.cognition
  const legacy: Partial<Record<'title' | 'intro' | 'compare' | 'needLine' | 'closing', string[]>> = {
    title: ['你怎么看，和你实际缺什么'],
    intro: ['你把最关键的因素选成了「{{choice}}」，下面只把两个回答放在一起，不下结论'],
    compare: [
      '而你在「{{low}}」上打了 {{lowScore}} 分，是全卷最低的一项',
      '你在「{{top}}」上给了 {{topWeight}} 分，但这一项的实际得分是 {{topScore}} 分。'
    ],
    needLine: [
      '你在「{{need}}」上打的缺口权重最高（{{needWeight}} 分），所以它在总分里占了更高的比重，这次判定按这个权重计算。',
      '你在「{{need}}」上打的分数最低（{{needWeight}} 分），是五项里最缺的一项，所以它在总分里占了更高的比重，这次判定按这个权重计算。'
    ],
    closing: ['如果这两件事都成立，你打算先动哪一个']
  }
  for (const key of ['title', 'intro', 'compare', 'needLine', 'closing'] as const) {
    const current = cognition[key]
    if (
      legacy[key]?.includes(current) ||
      (key === 'intro' && current.includes('{{choice}}')) ||
      (key === 'compare' && /{{(low|lowScore)}}/.test(current))
    ) {
      cognition[key] = defaultTemplate.copy.cognition[key]
    }
  }

  if (next.copy.hero && 'quote' in next.copy.hero) {
    delete next.copy.hero.quote
  }

  if (next.theme.brand === 'Vesta') next.theme.brand = ''

  const footer = next.copy.footer as { note?: string; line1?: string; line2?: string } | undefined
  next.copy.footer = {
    note:
      !footer?.note || footer.note === '仅用于个人参考'
        ? defaultTemplate.copy.footer.note
        : footer.note
  }

  // 旧版领取文案默认“填完就能约到”，实际上要看时间安排，且约上才免费。
  // 只替换确认是旧默认值的字段，保留管理员自己改过的内容。
  const claim = next.copy.claim
  if (claim) {
    const legacyClaim: Partial<Record<keyof typeof claim, string[]>> = {
      title: ['领取一次免费规划'],
      description: [
        '留两个你方便的时间段和微信号，我会按顺序联系你，一次约四十分钟',
        '留下两个你方便的时间段和微信号。我会先看自己的时间安排，不一定都能约上；能约上的话，一次聊四十分钟左右。'
      ],
      freeNote: [
        '这是一次免费的现状梳理，不代表任何课程推销。你不报课，这次梳理照样做',
        '如果时间合适，这次梳理是免费的，也不代表任何课程推销；约不上也不会向你收费。'
      ],
      submit: ['提交'],
      successTitle: ['收到了'],
      successBody: [
        '我会在两天内加你，按你留的时间段约',
        '我会尽快看时间安排：有合适的时间就加你确认；没有合适时间会直接告诉你，不会收费。'
      ]
    }
    for (const key of Object.keys(legacyClaim) as (keyof typeof claim)[]) {
      if (legacyClaim[key]?.includes(claim[key])) {
        claim[key] = defaultTemplate.copy.claim[key]
      }
    }
  }

  // 家庭支持不是学生能自己补的能力项，旧版“补家庭支持”的说法不再使用。
  const b8 = next.dimensions?.b8
  if (b8) {
    if (b8.gap?.what === '一次把规划讲清楚的沟通') {
      b8.gap.what = defaultTemplate.dimensions.b8.gap.what
    }
    if (
      b8.gap?.how === '用具体数字和步骤跟家里说明你要做什么、需要多少支持、多久能看到反馈'
    ) {
      b8.gap.how = defaultTemplate.dimensions.b8.gap.how
    }
    if (b8.gap?.when === '下次回家前准备好') {
      b8.gap.when = defaultTemplate.dimensions.b8.gap.when
    }
    if (b8.action30 === '把你的规划写成一页纸，找家里认真聊一次') {
      b8.action30 = defaultTemplate.dimensions.b8.action30
    }
  }

  // 英语成为独立维度后，旧模板需要补上 b9 的话术，雷达图标题也从八项改为九项。
  if (!next.dimensions.b9) {
    next.dimensions.b9 = defaultTemplate.dimensions.b9
  }
  if (next.copy.radar?.title === '八项现状') {
    next.copy.radar.title = defaultTemplate.copy.radar.title
  }

  return {
    template: next,
    changed: JSON.stringify(next) !== before
  }
}

function migrate(): void {
  migrateReportSkill()
  migrateReportSkillTemplates()
  const surveyId = getSetting('active_survey')
  if (surveyId) {
    const row = db.prepare('SELECT version, data FROM surveys WHERE id = ?').get(surveyId) as
      | { version: number; data: string }
      | undefined
    if (row) {
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
  }

  const raw = getSetting('report_template')
  if (!raw) return
  try {
    const current = JSON.parse(raw) as ReportTemplate
    const result = upgradeTemplate(current)
    if (result.changed) setSetting('report_template', JSON.stringify(result.template))
  } catch {
    // 同上，保留原始数据
  }
}

export function runMigrations(): void {
  ensureInviteColumns()
  ensureSubmissionColumns()
  ensureConsultColumns()
  // 先把历史事件沉淀成漏斗事实，再允许后续按保留期清理原始事件。
  backfillEventFacts()
  migrateLegacyAdminSession()
  clearExpiredAdminSessions()
  seed()
  migrate()
}
