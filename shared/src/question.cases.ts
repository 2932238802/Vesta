// 问卷分支解析 / 兜底 / 标签 / 发布校验的共享层回归用例。
// 用法：npm run check:question（也包含在 npm run verify 里）。
import { defaultSurvey } from './survey'
import {
  BRANCH_FALLBACK_TITLE,
  label,
  labels,
  resolveQuestion
} from './question'
import {
  branchCoverageWarnings,
  fallbackQuestions,
  validateAnswers,
  validateSurvey
} from './validate'
import { serializeDoc } from './doc'
import type { Answers, Question, Survey } from './types'

let passed = 0
let failed = 0

function ok(name: string, condition: boolean, extra = '') {
  if (condition) {
    passed += 1
    console.log(`PASS ${name}`)
  } else {
    failed += 1
    console.log(`FAIL ${name}${extra ? ` :: ${extra}` : ''}`)
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}`)
}

const clone = (survey: Survey): Survey => JSON.parse(JSON.stringify(survey))
const question = (survey: Survey, id: string): Question =>
  survey.questions.find((item) => item.id === id)!
const variant = (mutate: (survey: Survey) => void): Survey => {
  const survey = clone(defaultSurvey)
  mutate(survey)
  return survey
}

const q16 = question(defaultSurvey, 'q16')
const q6 = question(defaultSurvey, 'q6')
const branches = q16.branches!.map

// AC-018-1：默认问卷 7 个分支逐条渲染原有题面与选项，且不走兜底。
for (const option of q6.options ?? []) {
  const resolved = resolveQuestion(defaultSurvey, { q6: option.id }, q16)
  eq(`AC-018-1 ${option.id} title`, resolved.title, branches[option.id].title)
  eq(`AC-018-1 ${option.id} options`, resolved.options, branches[option.id].options)
  ok(`AC-018-1 ${option.id} not fallback`, resolved.fallback !== true)
}

// R-018-1/4：来源题缺失、答案数组 / 非字符串 / 已删选项 / 无映射选项，都回退到通用四档。
const fallbackCases: [string, Answers][] = [
  ['missing', {}],
  ['array', { q6: ['q6_3'] }],
  ['number', { q6: 3 }],
  ['deleted option', { q6: 'q6_deleted' }],
  ['unmapped new option', { q6: 'q6_9' }]
]
for (const [name, answers] of fallbackCases) {
  const resolved = resolveQuestion(defaultSurvey, answers, q16)
  eq(`fallback ${name} title`, resolved.title, BRANCH_FALLBACK_TITLE)
  eq(
    `fallback ${name} ids`,
    resolved.options.map((option) => option.id),
    ['q16_1', 'q16_2', 'q16_3', 'q16_4']
  )
  eq(
    `fallback ${name} labels`,
    resolved.options.map((option) => option.label),
    ['都清楚', '知道一些', '只听过', '完全不了解']
  )
  ok(`fallback ${name} flag`, resolved.fallback === true)
}

// R-018-4：来源题被删 / 改多选 / 被隐藏 / 被置灰 → 直接兜底。
const deletedSource = variant((survey) => {
  survey.questions = survey.questions.filter((item) => item.id !== 'q6')
})
const multiSource = variant((survey) => {
  question(survey, 'q6').type = 'multi'
})
const hiddenSource = variant((survey) => {
  question(survey, 'q6').showIf = { question: 'q1', when: ['nope'] }
})
const disabledSource = variant((survey) => {
  question(survey, 'q6').disableIf = { question: 'q1', when: ['q1_1'] }
})
for (const [name, survey, answers] of [
  ['deleted source', deletedSource, { q6: 'q6_3' }],
  ['multi source', multiSource, { q6: ['q6_3'] }],
  ['hidden source', hiddenSource, { q6: 'q6_3', q1: 'q1_1' }],
  ['disabled source', disabledSource, { q6: 'q6_3', q1: 'q1_1' }]
] as const) {
  ok(
    `${name} -> fallback`,
    resolveQuestion(survey as Survey, answers as Answers, question(survey as Survey, 'q16')).fallback === true
  )
}

// 选填来源题只要答了合法值，仍然按分支渲染。
const optionalSource = variant((survey) => {
  question(survey, 'q6').required = false
})
ok(
  'optional source still branches when answered',
  resolveQuestion(optionalSource, { q6: 'q6_3' }, question(optionalSource, 'q16')).fallback !== true
)

// R-018-8 / AC-018-10：label 取实际渲染的选项文字，评分索引不变。
for (const option of q6.options ?? []) {
  for (const target of ['q16_1', 'q16_2', 'q16_3', 'q16_4']) {
    const answers: Answers = { q6: option.id, q16: target }
    const resolved = resolveQuestion(defaultSurvey, answers, q16)
    const rendered = resolved.options.find((item) => item.id === target)
    eq(`AC-018-10 ${option.id}/${target} label`, label(defaultSurvey, answers, 'q16'), rendered?.label)
    eq(
      `AC-018-10 ${option.id}/${target} score index`,
      resolved.options.findIndex((item) => item.id === target),
      Number(target.split('_')[1]) - 1
    )
    ok(`AC-018-10 ${option.id}/${target} not fallback`, resolved.fallback !== true)
  }
}

// 兜底 / 合法分支 / 失效值下的 label 与 labels。
eq('label fallback q16_1', label(defaultSurvey, { q6: null, q16: 'q16_1' }, 'q16'), '都清楚')
eq('label branch q6_2/q16_2', label(defaultSurvey, { q6: 'q6_2', q16: 'q16_2' }, 'q16'), '查过一部分')
eq('label invalid', label(defaultSurvey, { q6: 'q6_2', q16: 'q16_9' }, 'q16'), '')
eq(
  'labels q7 unchanged',
  labels(defaultSurvey, { q7: ['q7_2'] }, 'q7'),
  ['四六级']
)

// AC-018-5：兜底答案能通过提交校验，报告 q16_info 取兜底选项文字。
const fallbackAnswers: Answers = { q16: 'q16_3' }
const answerCheck = validateAnswers(defaultSurvey, fallbackAnswers)
ok(
  'validateAnswers accepts fallback q16',
  !answerCheck.errors.some((error) => error.includes('q16') || error.includes('信息差')),
  JSON.stringify(answerCheck.errors)
)
eq('validateAnswers fallback value', answerCheck.answers.q16, 'q16_3')
eq(
  'serializeDoc fallback q16_info',
  serializeDoc(defaultSurvey, { q16: 'q16_2', q6: null }).q16_info,
  '知道一些'
)
for (const [id, text] of [
  ['q16_1', '都清楚'],
  ['q16_2', '知道一些'],
  ['q16_3', '只听过'],
  ['q16_4', '完全不了解']
] as const) {
  const answers: Answers = { q16: id }
  eq(`serializeDoc deleted-source ${id}`, serializeDoc(deletedSource, answers).q16_info, text)
  eq(`fallbackQuestions deleted-source ${id}`, fallbackQuestions(deletedSource, answers), ['q16'])
}

// AC-018-6：来源题非单选硬阻断；删来源 / 缺映射只提示，不阻断。
eq('default survey validateSurvey ok', validateSurvey(defaultSurvey), [])
const multiErrors = validateSurvey(multiSource)
ok('multi source blocked', multiErrors.length > 0)
ok(
  'multi source names both questions',
  multiErrors.some(
    (error) => error.includes('信息差') && error.includes('毕业后的第一选择')
  ),
  JSON.stringify(multiErrors)
)
eq('deleted source publishable', validateSurvey(deletedSource), [])
eq('deleted source warning count', branchCoverageWarnings(deletedSource).length, 1)
const addedOption = variant((survey) => {
  question(survey, 'q6').options!.push({ id: 'q6_9', label: '新选项', score: null })
})
eq('unmapped option publishable', validateSurvey(addedOption), [])
const addedWarnings = branchCoverageWarnings(addedOption)
eq('unmapped option warning count', addedWarnings.length, 1)
ok('unmapped option warning mentions count', addedWarnings[0].includes('1 个选项'), addedWarnings[0])
eq('hidden source warning skipped', branchCoverageWarnings(hiddenSource), [])
const hiddenBranch = variant((survey) => {
  question(survey, 'q16').showIf = { question: 'q1', when: ['nope'] }
})
eq(
  'fallbackQuestions skips hidden branch question',
  fallbackQuestions(hiddenBranch, {}),
  []
)

// R1：分支自引用 / 互相引用不得无限递归；validateSurvey 必须拒绝成环。
{
  const self = variant((survey) => {
    question(survey, 'q16').branches!.question = 'q16'
  })
  const outcome = (() => {
    try {
      resolveQuestion(self, { q16: 'q16_2' }, question(self, 'q16'))
      return 'no-throw'
    } catch (error) {
      return (error as Error).name
    }
  })()
  ok('R1 self-reference resolveQuestion no throw', outcome === 'no-throw', outcome)
  let answerOutcome = 'no-throw'
  try {
    validateAnswers(self, { q16: 'q16_2' })
  } catch (error) {
    answerOutcome = (error as Error).name
  }
  ok('R1 self-reference validateAnswers no throw', answerOutcome === 'no-throw', answerOutcome)
  let surveyOutcome = 'no-throw'
  let selfErrors: string[] = []
  try {
    selfErrors = validateSurvey(self)
  } catch (error) {
    surveyOutcome = (error as Error).name
  }
  ok('R1 self-reference validateSurvey no throw', surveyOutcome === 'no-throw', surveyOutcome)
  ok(
    'R1 self-reference rejected with question title',
    selfErrors.some((error) => error.includes('信息差') && error.includes('指向自己')),
    JSON.stringify(selfErrors)
  )

  const mutual = variant((survey) => {
    question(survey, 'q6').branches = { question: 'q16', map: {} }
  })
  const mutualOutcome = (() => {
    try {
      resolveQuestion(mutual, { q6: 'q6_3', q16: 'q16_2' }, question(mutual, 'q16'))
      return 'no-throw'
    } catch (error) {
      return (error as Error).name
    }
  })()
  ok('R1 mutual-reference resolveQuestion no throw', mutualOutcome === 'no-throw', mutualOutcome)
  const mutualErrors = validateSurvey(mutual)
  ok(
    'R1 mutual-reference rejected with both titles',
    mutualErrors.some(
      (error) => error.includes('信息差') && error.includes('毕业后的第一选择') && error.includes('循环')
    ),
    JSON.stringify(mutualErrors)
  )

  // 正常非环来源题不应被误判。
  ok(
    'R1 normal non-cycle source accepted',
    !validateSurvey(defaultSurvey).some((error) => error.includes('循环') || error.includes('指向自己'))
  )
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
