import { defaultTemplate } from './template'
import type {
  Answers,
  JobCard,
  Question,
  QuestionCondition,
  QuestionOption,
  ReportBlock,
  ReportPayload,
  Survey,
  Tier
} from './types'
import { computeDocScores } from './docScore'

export interface ResolvedQuestion {
  visible: boolean
  disabled: boolean
  title: string
  hint?: string
  options: QuestionOption[]
  range?: { min: number; max: number; step: number }
  branches?: Question['branches']
}

function conditionMatches(answers: Answers, condition: QuestionCondition): boolean {
  const value = answers[condition.question]
  if (condition.when?.length) {
    if (Array.isArray(value)) {
      if (!value.some((item) => typeof item === 'string' && condition.when?.includes(item))) {
        return false
      }
    } else if (typeof value !== 'string' || !condition.when.includes(value)) {
      return false
    }
  }
  if (typeof condition.min === 'number') {
    if (typeof value !== 'number' || value < condition.min) return false
  }
  if (typeof condition.max === 'number') {
    if (typeof value !== 'number' || value >= condition.max) return false
  }
  return true
}

/** 把一道题按当前答案解析成实际要展示的题面：处理 showIf / disableIf / branches。 */
export function resolveQuestion(
  survey: Survey,
  answers: Answers,
  question: Question
): ResolvedQuestion {
  const base: ResolvedQuestion = {
    visible: true,
    disabled: false,
    title: question.title,
    hint: question.hint,
    options: question.options ?? [],
    range: question.range,
    branches: question.branches
  }

  if (question.showIf && !conditionMatches(answers, question.showIf)) {
    return { ...base, visible: false }
  }
  if (question.showIfAll?.some((condition) => !conditionMatches(answers, condition))) {
    return { ...base, visible: false }
  }

  let title = question.title
  let hint = question.hint
  let options = question.options ?? []

  if (question.branches) {
    const value = answers[question.branches.question]
    const branch = typeof value === 'string' ? question.branches.map[value] : undefined
    if (branch) {
      title = branch.title
      hint = branch.hint ?? hint
      options = branch.options
    }
  }

  const disabled = question.disableIf ? conditionMatches(answers, question.disableIf) : false

  return { ...base, title, hint, options, disabled }
}

export function visibleQuestions(survey: Survey, answers: Answers): Question[] {
  return survey.questions.filter(
    (question) => resolveQuestion(survey, answers, question).visible
  )
}

function optionLabel(question: Question, id: string): string {
  if (question.branches) {
    for (const branch of Object.values(question.branches.map)) {
      const option = branch.options.find((item) => item.id === id)
      if (option) return option.label
    }
    return ''
  }
  return question.options?.find((item) => item.id === id)?.label ?? ''
}

function selectedOption(survey: Survey, answers: Answers, id: string): QuestionOption | undefined {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return undefined
  const resolved = resolveQuestion(survey, answers, question)
  const value = answers[id]
  if (typeof value !== 'string') return undefined
  return resolved.options.find((item) => item.id === value)
}

function label(survey: Survey, answers: Answers, id: string): string {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return ''
  const value = answers[id]
  if (typeof value !== 'string') return ''
  return optionLabel(question, value)
}

function labels(survey: Survey, answers: Answers, id: string): string[] {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return []
  const value = answers[id]
  if (!Array.isArray(value)) return []
  return value.map((item) => optionLabel(question, item)).filter(Boolean)
}

function text(answers: Answers, id: string): string {
  const value = answers[id]
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(' / ')
  return ''
}

function num(answers: Answers, id: string): number | null {
  const value = answers[id]
  return typeof value === 'number' ? value : null
}

function index(survey: Survey, answers: Answers, id: string): number {
  const option = selectedOption(survey, answers, id)
  if (!option) return -1
  const question = survey.questions.find((item) => item.id === id)
  const resolved = question ? resolveQuestion(survey, answers, question) : undefined
  return resolved ? resolved.options.findIndex((item) => item.id === option.id) : -1
}

function oneLine(survey: Survey, answers: Answers): string {
  const direction = index(survey, answers, 'q11') // 0 清楚 … 3 完全不知道
  const execution = index(survey, answers, 'q13') // 0 强 … 3 基本不定目标
  const info = index(survey, answers, 'q16') // 0 清楚 … 3 完全不了解

  if (direction <= 1 && info >= 2) return '你不是不努力，是不知道该往哪儿使劲。'
  if (direction >= 2 && execution === 0) return '你不是懒，是没人告诉你该做什么。'
  if (direction >= 2 && execution >= 2 && info >= 2) {
    return '你现在的状态，是四年里最常见的开局，但它不改，到大三会动不了。'
  }
  if (info >= 2) return '你现在差的不是决心，是先把方向查清楚。'
  return '你的方向比大多数同龄人都清楚，接下来是把信息差补上、把计划落地。'
}

function stuckLayer(survey: Survey, answers: Answers): { short: string; full: string } {
  const words = index(survey, answers, 'q21') // 1 背了忘，3 基本不背
  const speaking = index(survey, answers, 'q22')
  const weak = label(survey, answers, 'q18')
  const how = labels(survey, answers, 'q19')
  const hours = index(survey, answers, 'q20') // 0 少于3小时
  const execution = index(survey, answers, 'q13')

  if (words === 1 || words === 3) {
    return {
      short: '词汇层',
      full: '你现在最卡的是词汇。单词记不住，阅读和写作里会反复卡在生词上，考试里词汇量不够，后面几层都撑不起来。'
    }
  }
  if (speaking === 0 && weak.includes('听力')) {
    return {
      short: '听力层',
      full: '你现在最卡的是听力。信息一快就丢，而听力是四级里很多人最先崩的部分，也是你开不了口的直接原因。'
    }
  }
  if (speaking === 0 || speaking === 1) {
    return {
      short: '开口层',
      full: '你现在最卡的是开口。单词认识，但一张嘴就组织不起来，面试和口语环节最吃亏，也最影响别人对你的第一判断。'
    }
  }
  if (hours === 0 && execution === 0) {
    return {
      short: '时间层',
      full: '你缺的是时间。你有执行力，但一周能给英语的时间不到 3 小时，一忙起来英语就被放到最后。'
    }
  }
  if (how.includes('几乎没学') || hours === 0) {
    return {
      short: '方法层',
      full: '你现在最卡的是方法。不是不花时间，是没找到对的方法，刷题刷得多但提不上去，或者干脆不知道怎么开始。'
    }
  }
  return {
    short: '还没找到具体卡点',
    full: '从你的回答看，你的状态比多数人都稳。下一步不是补短板，而是把目标对英语的具体要求查清楚，别让信息差耽误进度。'
  }
}

function monthsUntil(monthOfYear: number): number {
  const now = new Date()
  const current = now.getFullYear() * 12 + now.getMonth()
  let target = now.getFullYear() * 12 + (monthOfYear - 1)
  if (target <= current) target += 12
  return target - current
}

export interface DeadlineFact {
  node: string
  windowText: string
  months: number
  text: string
}

export function deadlineFact(survey: Survey, answers: Answers): DeadlineFact {
  const first = label(survey, answers, 'q6')
  const preparing = labels(survey, answers, 'q7')
  const grade = label(survey, answers, 'q3')

  let node = '四级 / 六级'
  let windowText = '每年 6 月、12 月'
  let months = monthsUntil(6)

  if (first === '考研') {
    node = '考研初试'
    windowText = '每年 12 月'
    months = monthsUntil(12)
  } else if (first === '保研') {
    node = '保研夏令营申请'
    windowText = '大三下学期（约 5—6 月）'
    months = monthsUntil(5)
  } else if (first === '就业') {
    node = '秋招和大三暑假实习'
    windowText = '9—11 月'
    months = monthsUntil(9)
  } else if (first === '考公') {
    node = '国考 / 省考'
    windowText = '11—12 月或 3—4 月'
    months = monthsUntil(11)
  } else if (first === '考编') {
    node = '事业编联考'
    windowText = '3—5 月'
    months = monthsUntil(3)
  } else if (first === '出国') {
    node = '语言成绩和申请季'
    windowText = '大三开始准备，大四 9—12 月申请'
    months = monthsUntil(9)
  } else if (preparing.some((item) => item.includes('教资'))) {
    node = '教资笔试'
    windowText = '每年 3 月、9 月'
    months = monthsUntil(3)
  } else if (preparing.some((item) => item.includes('专升本'))) {
    node = '专升本考试'
    windowText = '多数省份 3—4 月'
    months = monthsUntil(3)
  }

  const tail =
    grade === '大一'
      ? '现在动手，后面每一步都会从容一点。'
      : grade === '大四'
        ? '时间已经很紧，优先把能落地的先落地。'
        : '这一两年是你补信息差最便宜的时候。'

  return { node, windowText, months, text: `你离 ${node}（${windowText}）还有大约 ${months} 个月。${tail}` }
}

function deadlineText(survey: Survey, answers: Answers): string {
  return deadlineFact(survey, answers).text
}

function futureText(survey: Survey, answers: Answers): string {
  const future = text(answers, 'q26')
  const city = label(survey, answers, 'q8')
  const target = text(answers, 'q5a') || label(survey, answers, 'q2')
  const pieces = [`五年后，你希望自己「${future}」。`, `你想到的城市是「${city}」。`]
  if (target) pieces.push(`你眼下想往「${target}」这个方向走。`)
  pieces.push('这条路现在还不清晰没关系，先把今天的每一步走实。')
  return pieces.join('')
}

export function docPriority(survey: Survey, answers: Answers): 'A' | 'B' | 'C' {
  const school = label(survey, answers, 'q1')
  const schoolHigh = ['C9', '985', '211', '双一流', '普通一本'].includes(school)
  const direction = index(survey, answers, 'q11')
  const execution = index(survey, answers, 'q13')
  const info = index(survey, answers, 'q16')
  const how = labels(survey, answers, 'q19')
  const hours = index(survey, answers, 'q20')

  if (schoolHigh || (direction <= 1 && execution === 0 && info <= 1)) return 'A'
  if (execution === 3 && direction === 3 && how.includes('几乎没学') && hours === 0) return 'C'
  return 'B'
}

export function serializeDoc(survey: Survey, answers: Answers): Record<string, unknown> {
  const q4 = answers['q4']
  const cityFields = Array.isArray(q4) ? q4.filter((item): item is string => typeof item === 'string') : []
  return {
    q1_school: label(survey, answers, 'q1'),
    q2_major: text(answers, 'q2'),
    q3_grade: label(survey, answers, 'q3'),
    q4_home: cityFields[0] ?? '',
    q4_school_city: cityFields[1] ?? '',
    q5_major_job: label(survey, answers, 'q5'),
    q5a_target_job: text(answers, 'q5a'),
    q6_first_choice: label(survey, answers, 'q6'),
    q7_preparing: labels(survey, answers, 'q7'),
    q8_city: label(survey, answers, 'q8'),
    q9_practice: label(survey, answers, 'q9'),
    q10_skills: labels(survey, answers, 'q10'),
    q11_direction: label(survey, answers, 'q11'),
    q12_env: label(survey, answers, 'q12'),
    q13_execution: label(survey, answers, 'q13'),
    q14_method: label(survey, answers, 'q14'),
    q15_family: label(survey, answers, 'q15'),
    q16_info: label(survey, answers, 'q16'),
    q17_cet4_times: label(survey, answers, 'q17'),
    q18_cet4_weak: label(survey, answers, 'q18'),
    q19_how: labels(survey, answers, 'q19'),
    q20_hours: label(survey, answers, 'q20'),
    q21_words: label(survey, answers, 'q21'),
    q22_speaking: label(survey, answers, 'q22'),
    q24_importance: num(answers, 'q24'),
    q25_reason: labels(survey, answers, 'q25'),
    q26_future: text(answers, 'q26')
  }
}

export interface DocReportInput {
  survey: Survey
  answers: Answers
  name: string
  slug: string
  createdAt: string
  claimed: boolean
}

export interface DocFacts {
  priority: 'A' | 'B' | 'C'
  oneLine: string
  stuck: string
  stuckDetail: string
  deadline: string
  future: string
}

/** 规则版报告用到的全部事实，也给 AI 当输入，避免两套口径不一致。 */
export function docFacts(survey: Survey, answers: Answers): DocFacts {
  const stuck = stuckLayer(survey, answers)
  return {
    priority: docPriority(survey, answers),
    oneLine: oneLine(survey, answers),
    stuck: stuck.short,
    stuckDetail: stuck.full,
    deadline: deadlineText(survey, answers),
    future: futureText(survey, answers)
  }
}

const WEEKLY_HOURS = [1.5, 5, 10.5, 17.5]

function weeklyHours(survey: Survey, answers: Answers): number {
  const at = index(survey, answers, 'q20')
  return WEEKLY_HOURS[at] ?? 0
}

function salaryRange(city: string): string {
  if (city === '北上广深') return '应届 6—10k（经验值，行业差异大）'
  if (city.startsWith('新一线')) return '应届 5—8k（经验值）'
  if (city === '家乡省会') return '应届 4—7k（经验值）'
  if (city === '回家乡小城') return '应届 3—5k（经验值）'
  return '还没有目标城市，先按你所在城市看'
}

function gapLines(survey: Survey, answers: Answers): { label: string; value: string }[] {
  const first = label(survey, answers, 'q6')
  const city = label(survey, answers, 'q8')
  const role = text(answers, 'q5a') || text(answers, 'q2')
  const major = text(answers, 'q2')
  const node = deadlineFact(survey, answers)

  const lines: { label: string; value: string }[] = [
    { label: '你的第一选择', value: first || '还没确定' },
    { label: '关键时间窗', value: `${node.node}：${node.windowText}，还剩约 ${node.months} 个月` }
  ]

  if (first === '就业') {
    lines.push({ label: '目标城市', value: city || '还没想好' })
    lines.push({ label: '目标岗位', value: role || '还没写清楚' })
    lines.push({ label: '应届薪资区间（经验值）', value: salaryRange(city) })
    lines.push({
      label: '入场线（经验值）',
      value: '本科 + 相关实习 1 段 + 四级 425 以上；好岗位普遍看实习经历'
    })
  } else if (first === '考研') {
    lines.push({ label: '目标专业', value: major || '还没填' })
    lines.push({ label: '入场线（经验值）', value: '过国家线 + 目标院校线；英语单科线 45 分左右，好学校更高' })
  } else if (first === '保研') {
    lines.push({ label: '入场线（经验值）', value: '专业排名前 10%—15%；六级 500 以上更稳；竞赛科研是加分项' })
  } else if (first === '考公' || first === '考编') {
    lines.push({
      label: '入场线（经验值）',
      value: first === '考公' ? '岗位表 + 专业限制 + 行测申论笔试；报名窗口很短' : '教师资格或岗位要求 + 笔试面试；各地公告不同'
    })
  } else if (first === '出国') {
    lines.push({ label: '入场线（经验值）', value: '语言成绩（雅思 6.5 左右）+ 在校成绩 + 申请材料' })
  } else {
    lines.push({ label: '下一步', value: '先把第一选择定下来，后面所有门槛才谈得上对照' })
  }

  const hours = weeklyHours(survey, answers)
  if (hours > 0) {
    const total = Math.round(node.months * 4.33 * hours)
    lines.push({
      label: '按现在的投入',
      value: `每周约 ${hours} 小时，到 ${node.node} 一共只有约 ${total} 小时`
    })
  }

  const english = computeDocScores(survey, answers).english
  if (english.stage) {
    lines.push({
      label: '门槛对照',
      value: `你现在是「${english.stage}」；${
        english.need ? '这条路对英语有要求，先把它算进计划' : '这条路对英语没有硬性门槛'
      }`
    })
  }

  return lines
}

function scorecardBlock(survey: Survey, answers: Answers): ReportBlock {
  const scores = computeDocScores(survey, answers)
  return {
    type: 'scorecard',
    title: '你现在的位置',
    subtitle: '0—10 分，按你的回答算出来，不是感觉',
    background: scores.background,
    personal: scores.personal,
    potential: scores.potential
  }
}

function gapBlock(survey: Survey, answers: Answers, jobs: JobCard[] = []): ReportBlock {
  return {
    type: 'gap',
    title: '和目标之间还差多少',
    subtitle: '门槛是经验值区间，以目标单位最新公告或招聘原文为准',
    lines: gapLines(survey, answers),
    note: '这一屏不预测结果，只把「现在的位置」和「这条路的入场线」摆在一起。',
    jobs: jobs.slice(0, 3)
  }
}

function englishSection(survey: Survey, answers: Answers): ReportBlock {
  const scores = computeDocScores(survey, answers)
  const english = scores.english
  const importance = typeof answers.q24 === 'number' ? answers.q24 : 0
  const stuck = stuckLayer(survey, answers)

  const position = english.stage
    ? `你现在是「${english.stage}」。`
    : '你这部分还没答，先按你勾的英语准备状态看。'

  const gapParts: string[] = []
  if (english.need && importance < 6) {
    gapParts.push(
      `你给英语打了 ${importance} 分，但你的目标（${label(survey, answers, 'q6') || '还在准备的方向'}）对英语有明确门槛：考研要考英语一/二、保研夏令营常是全英文面试、考编也有英语要求。这个分数和你的目标之间有一条对不上的缝——不是英语不重要，是你还没看到它在这条路上具体卡在哪。`
    )
  } else if (english.need) {
    gapParts.push(
      '这条路对英语有明确门槛，你现在的位置离它还差一截：先补最卡的那一层，不要平均用力。'
    )
  } else {
    gapParts.push('你目前的方向对英语没有硬门槛，但别把英语完全放下：阅读和表达是最通用的加分项。')
  }
  gapParts.push(`你最卡的是${stuck.short}。`)

  const plan = `这 30 天先做三件事：一、把${stuck.short}对应的材料找齐（真题、词表或听力材料）；二、每天固定 30 分钟，只练这一项；三、每周日记录一次能听/能说/能背下多少，用数字对比，不用感觉。`

  const skipped = english.skippedDetail
    ? '（你给英语的重要度低于 6 分，后面 5 道细节题按规则跳过了，不是你没答。）'
    : ''

  return {
    type: 'section',
    title: '英语这块',
    paragraphs: [position + skipped, ...gapParts, plan]
  }
}

export function buildDocReport(
  input: DocReportInput,
  jobs: JobCard[] = []
): ReportPayload {
  const { survey, answers, name, slug, createdAt, claimed } = input
  const facts = docFacts(survey, answers)
  const tier: Tier = facts.priority

  const blocks: ReportBlock[] = [
    {
      type: 'hero',
      eyebrow: '学姐帮你看看现在在哪儿',
      title: survey.title,
      summary: facts.oneLine,
      tier,
      // 分层 A/B/C 只给顾问看，报告里不显示档位和分数。
      tierLabel: '',
      tierLine: '先看你现在最卡的那一层。',
      total: null
    },
    scorecardBlock(survey, answers),
    gapBlock(survey, answers, jobs),
    englishSection(survey, answers),
    { type: 'note', title: '你现在卡在哪一层', text: facts.stuckDetail },
    { type: 'note', title: '什么时候要命', text: facts.deadline },
    { type: 'note', title: '五年后的你', text: facts.future }
  ]

  return {
    slug,
    name,
    createdAt,
    surveyTitle: survey.title,
    signature: '',
    blocks,
    theme: { ...defaultTemplate.theme, accent: '#2f6c9e' },
    claim: defaultTemplate.copy.claim,
    footer: defaultTemplate.copy.footer,
    claimed
  }
}

export interface DocAiContent {
  conclusion: string
  sections: { title: string; text: string }[]
}

/** 清掉 AI / 模板常见的低级问题：重复标点、空标签留下的「、，」、多余空白。 */
export function cleanReportText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/([、，。；：,;:])\1+/g, '$1')
    .replace(/[、，]\s*[，、]/g, '，')
    .replace(/[、，]\s*([。；：])/g, '$1')
    .replace(/^[、，。；：\s]+/, '')
    .replace(/[、，；：\s]+$/, '')
    .trim()
}

export function normalizeDocAiContent(raw: unknown): DocAiContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { conclusion: '', sections: [] }
  }
  const record = raw as Record<string, unknown>
  const conclusion =
    typeof record.conclusion === 'string' ? cleanReportText(record.conclusion) : ''
  const list = Array.isArray(record.sections) ? record.sections : []
  const sections = list
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const entry = item as Record<string, unknown>
      const title = typeof entry.title === 'string' ? entry.title.trim() : ''
      const text = typeof entry.text === 'string' ? cleanReportText(entry.text) : ''
      return title && text ? { title, text } : null
    })
    .filter((section): section is { title: string; text: string } => Boolean(section))
  return { conclusion, sections }
}

/** 用 AI 内容替换规则版正文；AI 内容不完整时回落到规则版。 */
export function buildDocReportWithAi(
  input: DocReportInput & { content: DocAiContent; jobs?: JobCard[] }
): ReportPayload {
  const base = buildDocReport(input, input.jobs ?? [])
  const hero = base.blocks[0]
  if (hero?.type !== 'hero' || input.content.sections.length === 0) return base

  // 分数、差距、英语板块始终由系统算；AI 只替换文字段落。
  const systemBlocks = base.blocks.filter(
    (block) => block.type !== 'hero' && block.type !== 'note'
  )
  const blocks: ReportBlock[] = [
    { ...hero, summary: input.content.conclusion || hero.summary },
    ...systemBlocks,
    ...input.content.sections.map(
      (section): ReportBlock => ({ type: 'note', title: section.title, text: section.text })
    )
  ]
  return { ...base, blocks }
}
