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
import { computeDocScores, type DocScores } from './docScore'
import { inferDirectionKey, jobDirections } from './job-map'

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
  if (condition.not?.length) {
    if (Array.isArray(value)) {
      if (value.some((item) => typeof item === 'string' && condition.not?.includes(item))) {
        return false
      }
    } else if (typeof value === 'string' && condition.not.includes(value)) {
      return false
    }
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
  const words = labels(survey, answers, 'q21')
  const forgetsWords = words.some(
    (item) => item.includes('背了忘') || item.includes('基本不背')
  )
  const speaking = index(survey, answers, 'q22')
  const weak = labels(survey, answers, 'q18')
  const how = labels(survey, answers, 'q19')
  const hours = index(survey, answers, 'q20') // 0 少于3小时
  const execution = index(survey, answers, 'q13')

  if (forgetsWords) {
    return {
      short: '词汇层',
      full: '你现在最卡的是词汇。单词记不住，阅读和写作里会反复卡在生词上，考试里词汇量不够，后面几层都撑不起来。'
    }
  }
  if (speaking === 0 && weak.some((item) => item.includes('听力'))) {
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

const GRADE_NUMBER: Record<string, number> = { 大一: 1, 大二: 2, 大三: 3, 大四: 4 }

/**
 * 到「第 stageGrade 学年某月」还有几个月。
 * 以前只会算“下一个 9 月”，导致大一学生也被算成半年后就要秋招/夏令营。
 */
function monthsToStage(monthOfYear: number, grade: number, stageGrade: number): number {
  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  // 学年 9 月开学：9 月及以后算新学年，1—8 月仍属上一学年。
  const academicStartYear = nowMonth >= 9 ? nowYear : nowYear - 1
  const enrollYear = academicStartYear - (grade - 1)
  const targetYear = enrollYear + (stageGrade - 1) + (monthOfYear >= 9 ? 0 : 1)
  const months = (targetYear - nowYear) * 12 + (monthOfYear - nowMonth)
  return Math.max(0, months)
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
  const gradeLabel = label(survey, answers, 'q3')
  const grade = GRADE_NUMBER[gradeLabel] ?? 2

  let node = '四级 / 六级'
  let windowText = '每年 6 月、12 月'
  let months = monthsUntil(6)

  if (first === '考研') {
    node = '考研初试'
    windowText = '大四上学期 12 月'
    months = monthsToStage(12, grade, 4)
  } else if (first === '保研') {
    node = '保研夏令营申请'
    windowText = '大三下学期 5—6 月'
    months = monthsToStage(6, grade, 3)
  } else if (first === '就业') {
    node = '秋招'
    windowText = '大四上学期 9—11 月'
    months = monthsToStage(9, grade, 4)
  } else if (first === '考公') {
    node = '国考 / 省考'
    windowText = '大四上学期 11—12 月或次年 3—4 月'
    months = monthsToStage(11, grade, 4)
  } else if (first === '考编') {
    node = '事业编联考'
    windowText = '大四下学期 3—5 月'
    months = monthsToStage(3, grade, 4)
  } else if (first === '出国') {
    node = '语言成绩和申请季'
    windowText = '大四上学期 9—12 月申请'
    months = monthsToStage(9, grade, 4)
  } else if (preparing.some((item) => item.includes('教资'))) {
    node = '教资笔试'
    windowText = '每年 3 月、9 月'
    months = monthsUntil(3)
  } else if (preparing.some((item) => item.includes('专升本'))) {
    node = '专升本考试'
    windowText = '大三下学期 3—4 月'
    months = monthsToStage(3, grade, 3)
  }

  const tail =
    grade === 1
      ? '现在动手，后面每一步都会从容一点。'
      : grade === 4
        ? '时间已经很紧，优先把能落地的先落地。'
        : '这一两年是你补信息差最便宜的时候。'

  return {
    node,
    windowText,
    months,
    text: `你离 ${node}（${windowText}）还有大约 ${months} 个月。${tail}`
  }
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
    q27_salary: label(survey, answers, 'q27'),
    q28_self: text(answers, 'q28'),
    q9_practice: label(survey, answers, 'q9'),
    q10_skills: labels(survey, answers, 'q10'),
    q11_direction: label(survey, answers, 'q11'),
    q12_env: label(survey, answers, 'q12'),
    q13_execution: label(survey, answers, 'q13'),
    q14_method: label(survey, answers, 'q14'),
    q15_family: label(survey, answers, 'q15'),
    q16_info: label(survey, answers, 'q16'),
    q17_cet4_times: label(survey, answers, 'q17'),
    q18_cet4_weak: labels(survey, answers, 'q18'),
    q19_how: labels(survey, answers, 'q19'),
    q20_weekly_hours: label(survey, answers, 'q20'),
    q21_words: labels(survey, answers, 'q21'),
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

/** 简历盘点：现在能写进简历的，不用等到“什么都准备好了”。 */
function resumeNow(survey: Survey, answers: Answers): string {
  const parts: string[] = []
  const practice = label(survey, answers, 'q9')
  if (practice) {
    parts.push(
      practice.includes('兼职')
        ? '一段兼职（可写成沟通、执行、抗压）'
        : practice
    )
  }
  const skills = labels(survey, answers, 'q10').filter(
    (item) => !item.includes('还没培养出') && !item.includes('说不清')
  )
  if (skills.length) parts.push(`技能：${skills.join('、')}`)
  const direction = label(survey, answers, 'q11')
  if (direction && !direction.includes('没落地') && !direction.includes('完全不知道')) {
    parts.push(`方向：${direction}`)
  }
  return parts.length ? parts.join('；') : '暂时还没有能写进简历的经历或技能'
}

/** 简历缺口：只列能在这 22 个月里补上的，不把“没有”说成“不行”。 */
function resumeMissing(survey: Survey, answers: Answers): string {
  const skills = labels(survey, answers, 'q10')
  const direction = label(survey, answers, 'q11')
  const gaps: string[] = []
  if (skills.some((item) => item.includes('还没培养出'))) gaps.push('一项能展示的技能')
  if (direction.includes('没落地')) gaps.push('一个落地的项目或作品')
  gaps.push('一段相关实习')
  return [...new Set(gaps)].slice(0, 3).join('、')
}

/** 「你的底牌」：只从回答里列已经存在、能直接用的东西；不够就不凑。 */
function assetsBlock(
  survey: Survey,
  answers: Answers,
  scores: DocScores
): ReportBlock | null {
  const items: { key: string; name: string; text: string }[] = []
  const practice = label(survey, answers, 'q9')
  const preparing = labels(survey, answers, 'q7')
  const family = label(survey, answers, 'q15')
  const info = label(survey, answers, 'q16')
  const self = text(answers, 'q28')
  const future = text(answers, 'q26')

  if (practice && (practice.includes('兼职') || practice.includes('实习'))) {
    items.push({
      key: 'practice',
      name: '你做过一段兼职或实习',
      text: `你写过「${practice}」。和专业无关也可以写进简历，按“在哪、做什么、怎么做的、结果是什么”写成条目，而不是只写“做过兼职”。`
    })
  }

  if (preparing.some((item) => item.includes('经济独立')) || future.includes('经济独立')) {
    items.push({
      key: 'independence',
      name: '你已经把经济独立当成目标',
      text: `你提到「${future || preparing.find((item) => item.includes('经济独立'))}」。它会直接影响你选城市、选岗位、接不接第一份实习；把它拆成“先覆盖一部分生活费”，第一步会具体。`
    })
  }

  if (self) {
    items.push({
      key: 'self-awareness',
      name: '你对自己有具体描述',
      text: `你写的是「${self}」。把它分成两列：能改的（每天投入多少时间、要不要主动找实习）和暂时改不了的（性格底色、家庭条件）。计划只从能改的那列开始。`
    })
  }

  if (info === '知道大概') {
    items.push({
      key: 'info',
      name: '你不是完全不了解',
      text: '你说自己对目标门槛“知道大概”。现在缺的不是从零了解，而是把“大概”变成 3 条具体公告、3 条岗位要求和 1 个时间点。'
    })
  }

  if (family && (family.includes('一般') || family.includes('会想办法'))) {
    items.push({
      key: 'family',
      name: '家里能给你一个缓冲',
      text: `你说家里「${family}」。这不是强托举，但意味着你不用在所有选择上只看“今天能不能赚到钱”，可以为接下来这段准备期留一点投入空间。`
    })
  }

  const allScores = [...scores.background, ...scores.personal]
    .filter((item) => !items.some((picked) => picked.key === item.key))
    .sort((a, b) => b.score - a.score)
  for (const item of allScores) {
    if (items.length >= 3) break
    if (item.score < 5) continue
    items.push({
      key: item.key,
      name: `${item.label} ${item.score} 分`,
      text: `这是你现有起点里分数较高的一项，可以先用它去换第一段经历，不代表已经够了。`
    })
  }

  if (!items.length) return null

  return {
    type: 'assets',
    title: '你现在能用的东西',
    subtitle: '只列答卷里已经有的，不凑数',
    items: items.slice(0, 3),
    note: '这些不是评价，只是你下一步可以拿来用的起点。'
  }
}

function usedForJob(job: JobCard, directionName?: string): string {
  const target = directionName ? `「${directionName}」` : '目标岗位'
  const text = `${job.title} ${job.requirement}`
  const fields: string[] = []
  if (/本科|大专|专科|学历/.test(text)) fields.push('学历')
  if (/专业/.test(text)) fields.push('专业')
  if (/英语|四级|六级|口语|读写/i.test(text)) fields.push('英语')
  if (/实习|经验|优先/.test(text)) fields.push('实习')
  if (/证书/.test(text)) fields.push('证书')
  if (job.salary && salaryRangeNumbers(job.salary)) fields.push('薪资')
  return fields.length
    ? `用来核对${target}的${fields.join('、')}`
    : `用来核对${target}的原文`
}

/** 学校档位换算成学历层次：专科 / 本科（C9 到民办本科都按本科算）。 */
function jobDegree(school: string): '本科' | '专科' | '' {
  if (!school) return ''
  return school.includes('专科') ? '专科' : '本科'
}

function salaryRangeNumbers(raw: string): { min: number; max: number } | null {
  const values = [...raw.replace(/,/g, '').matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((item) => Number(item[1]))
    .filter((value) => Number.isFinite(value))
  if (!values.length) return null
  const hasK = /k|千/i.test(raw)
  const normalized = values.map((value) => (hasK && value < 100 ? value * 1000 : value))
  const min = Math.min(...normalized)
  const max = Math.max(...normalized)
  if (min < 1000 || max > 100000) return null
  return { min, max }
}

/**
 * 把招聘原文逐条对到填卷人的答卷上：
 * 已经符合的写「你符合」，还差什么写「你还缺」，不替学生判断“能不能录用”。
 */
function jobMatch(
  survey: Survey,
  answers: Answers,
  job: JobCard
): { meets: string[]; missing: string[] } {
  const req = `${job.title} ${job.requirement}`.replace(/\s+/g, '')
  const meets: string[] = []
  const missing: string[] = []

  const school = label(survey, answers, 'q1')
  const degree = jobDegree(school)
  const major = text(answers, 'q2').replace(/专业$/, '')
  const practice = label(survey, answers, 'q9')
  const skills = labels(survey, answers, 'q10')
  const english = label(survey, answers, 'q17')
  const expectation = label(survey, answers, 'q27')

  // 学历
  if (/本科及以上|本科以上|本科/.test(req)) {
    if (degree === '本科') meets.push(`学历：岗位要本科，你的档位是${school}（本科）`)
    else if (degree === '专科') {
      missing.push('学历：岗位写的是本科，你目前是专科，投递前先确认是否接受专升本或同等学力')
    } else {
      missing.push('学历：岗位写的是本科，问卷里还没填学校档位')
    }
  } else if (/大专|专科/.test(req)) {
    meets.push(`学历：岗位接受大专${degree === '本科' ? '，你本科更稳' : '，你的档位够线'}`)
  }

  // 专业：只有原文明确写了“专业”范围时才做对照，避免把“英语读写”当专业要求。
  if (/不限专业|专业不限/.test(req)) {
    meets.push('专业：这条不限专业')
  } else if (major && /专业/.test(req)) {
    const tradeAligned =
      /国际贸易|国际经济与贸易|外贸/.test(req) &&
      /国际经济与贸易|国际贸易|外贸/.test(major)
    const broadAligned =
      /经济|金融|商务英语|英语/.test(req) &&
      /经济|贸易|金融|商务英语|英语/.test(major)
    const field = /金融/.test(req)
      ? '经济金融'
      : /商务英语/.test(req)
        ? '商务英语'
        : /英语/.test(req)
          ? '英语'
          : '经济贸易'
    if (tradeAligned) {
      meets.push(`专业：岗位要国际贸易/外贸相关，你的${major}对口`)
    } else if (broadAligned) {
      meets.push(`专业：岗位要${field}相关，你的${major}在相关范围内`)
    } else {
      missing.push(`专业：原文写了专业范围，${major}不在列出的方向里，投递时确认是否接受相近专业`)
    }
  } else if (major) {
    if (
      /国际贸易实务|外贸实务|单证|报关/.test(req) &&
      /国际经济与贸易|国际贸易|外贸/.test(major)
    ) {
      meets.push(`专业：岗位要国际贸易实务/单证知识，你的${major}课程对口`)
    } else {
      meets.push(`专业：原文没写专业限制，${major}可以投`)
    }
  }

  // 英语
  if (/六级|CET-?6/i.test(req)) {
    if (english.includes('四六级已过')) meets.push('英语：岗位要六级，你四六级已过')
    else if (english.includes('四级过了')) missing.push('英语：岗位要六级，你四级已过、六级还在准备')
    else missing.push('英语：岗位要六级，你四级还没过')
  } else if (/四级|CET-?4/i.test(req)) {
    if (english.includes('四级没过')) missing.push('英语：岗位要四级，你正在准备、还没过')
    else if (english) meets.push('英语：岗位要四级，你已经过了')
    else missing.push('英语：岗位要四级，问卷里还没填英语现状')
  } else if (/英语读写|英语/.test(req)) {
    if (english.includes('四级没过')) {
      missing.push('英语：岗位要英语读写，你现在还没有四级成绩可证明')
    } else if (english) {
      meets.push('英语：岗位要英语读写，你有四六级基础')
    }
  }

  // 具体技能：只识别原文里点名的工具/流程，不把“会英语”算成技能。
  const skillNeeds: string[] = []
  if (/Excel|数据|表格/i.test(req)) skillNeeds.push('Excel/数据')
  if (/单证流程|单证知识|报关流程/.test(req)) skillNeeds.push('单证流程')
  if (/店铺|上架|选品|广告投放/.test(req)) skillNeeds.push('店铺运营')
  if (skillNeeds.length) {
    const noSkill = skills.some(
      (item) => item.includes('还没培养出') || item.includes('说不清')
    )
    if (noSkill) {
      missing.push(`技能：岗位要${skillNeeds.join('、')}，你现在还没有可展示的技能`)
    } else {
      const hasSkill = skills.some((item) =>
        /垂直技能|编程|剪辑|设计|数据分析|会计/.test(item)
      )
      if (hasSkill) {
        meets.push(`技能：你已经有一项可展示的技能（${skills.join('、')}）`)
      } else {
        missing.push(`技能：岗位要${skillNeeds.join('、')}，你现有的技能项里没有直接对应`)
      }
    }
  }

  // 笔试/面试流程：和学历、技能分开说，避免“只差四级”的错觉。
  if (/笔试|结构化面试/.test(req)) {
    missing.push('流程：岗位有校招笔试/面试，你目前还没有准备记录')
  }

  // 实习/经验
  if (/实习|工作经验|相关经验/.test(req)) {
    if (practice.includes('有 1–3 段')) meets.push('实习：你有一段能写进简历的校外实习')
    else if (practice.includes('只有校内实践')) missing.push('实习：岗位看重相关实习，你现在只有校内实践')
    else if (practice.includes('兼职')) missing.push('实习：岗位看重相关实习，你的兼职和专业无关')
    else if (practice.includes('一段都没有')) missing.push('实习：岗位看重相关实习，你目前还没有')
  }

  // 证书
  if (/证书/.test(req)) {
    if (skills.some((item) => item.includes('证书'))) {
      meets.push('证书：你已经有证书项，可以在简历里单独列一行')
    } else if (/单证员|报关员/.test(req)) {
      missing.push('证书：岗位优先单证员/报关员证书，你现在还没有；在读期间可以安排考')
    } else {
      missing.push('证书：岗位提到相关证书优先，你的证书项还是空的')
    }
  }

  // 薪资：只判断和 Q27 期望有没有重叠，不做“给得起/给不起”的结论。
  const expected = salaryRangeNumbers(expectation)
  const offered = salaryRangeNumbers(job.salary)
  if (expected && offered) {
    if (offered.max >= expected.min && offered.min <= expected.max) {
      meets.push(`薪资：原文 ${job.salary}，和你的期望（${expectation}）有重叠`)
    } else if (offered.max < expected.min) {
      missing.push(`薪资：原文 ${job.salary}，低于你写的期望（${expectation}），可当底线参考`)
    }
  }

  if (!meets.length) {
    meets.push(
      `应届身份：这是应届/助理岗，你现在就能按实习或校招投${
        major ? `，专业是${major}` : ''
      }`
    )
  }
  if (!missing.length) {
    missing.push(
      practice.includes('有 1–3 段')
        ? '匹配度：要求基本对上，下一步把每条要求写进简历里的具体经历'
        : '相关实习：简历上还缺一段和目标方向对得上的经历'
    )
  }

  return { meets: meets.slice(0, 3), missing: missing.slice(0, 3) }
}

function withJobMatch(
  survey: Survey,
  answers: Answers,
  job: JobCard,
  directionName?: string
): JobCard {
  return {
    ...job,
    usedFor: job.usedFor || usedForJob(job, directionName),
    ...jobMatch(survey, answers, job)
  }
}

/** 目标岗位地图：先给方向，再把招聘原文挂到方向上，避免正文只有一句“去招聘网站看看”。 */
function jobMapBlock(
  survey: Survey,
  answers: Answers,
  jobs: JobCard[]
): ReportBlock | null {
  const major = text(answers, 'q2')
  const directions = jobDirections(major)
  if (!directions.length) return null

  const assigned = new Set<string>()
  const grouped = directions.map((direction) => {
    const matched = jobs
      .filter((job) => {
        const key =
          job.directionKey || inferDirectionKey(`${job.title} ${job.requirement}`, directions)
        return key === direction.key
      })
      .slice(0, 2)
      .map((job) => withJobMatch(survey, answers, job, direction.name))
    matched.forEach((job) => assigned.add(job.url))
    return { ...direction, jobs: matched }
  })

  const relatedJobs = jobs
    .filter((job) => !assigned.has(job.url))
    .slice(0, 3)
    .map((job) => withJobMatch(survey, answers, job))

  const cityLabel = label(survey, answers, 'q8')
  const city = cityLabel.includes('还没想好') ? '' : cityLabel.replace(/（.*?）/g, '')
  const self = text(answers, 'q28')
  const future = text(answers, 'q26')
  const personal: string[] = []
  if (self) personal.push(`你自评「${self}」`)
  if (future) personal.push(`希望五年后「${future}」`)

  const cityNote = city
    ? `你选的城市是「${city}」，这些方向的岗位密度和薪资会受城市影响。`
    : '你还没定城市：先用行业密度、生活成本、离家距离三项打分，最晚第 3 个月定一个主城市和一个备选。'
  const personalNote = personal.length
    ? ` ${personal.join('，')}。选方向时把这两条当筛选条件：先排除明确不想做的，再看起薪能不能覆盖生活。`
    : ''

  return {
    type: 'jobmap',
    title: '你能去的几个方向',
    subtitle: '先看方向，再看门槛；经验值区间和招聘原文一起看，具体以原文为准',
    directions: grouped.map(({ key, name, what, entry, salary, fit, jobs: directionJobs }) => ({
      key,
      name,
      what,
      entry,
      salary,
      fit,
      jobs: directionJobs
    })),
    relatedJobs,
    note: `${cityNote}${personalNote} 方向不是替你做决定，点开原文核对。`
  }
}

/** 22 个月路线图：只排阶段主目标，不排满每一天。 */
function roadmapBlock(survey: Survey, answers: Answers, scores: DocScores): ReportBlock {
  const node = deadlineFact(survey, answers)
  const months = Math.max(1, node.months)
  const weekly = scores.english.weeklyHours
  const estimate = weekly > 0 ? weekly : 3
  const total = Math.round(months * 4.33 * estimate)
  const hoursLine =
    weekly > 0
      ? `到${node.node}还有约 ${months} 个月；按每周约 ${weekly} 小时的英语投入算，到秋招约 ${total} 小时（只算英语）`
      : `到${node.node}还有约 ${months} 个月；先按每周 3 小时的英语投入估，约 ${total} 小时（只算英语）`

  const phases =
    months >= 18
      ? [
          {
            key: 'direction',
            label: '先定方向',
            period: '现在—第 3 个月',
            goal: '把列出的方向缩到 1 个',
            output: '3 条岗位要求 + 1 份简历初稿'
          },
          {
            key: 'practice',
            label: '补第一段经历',
            period: '第 4—9 个月',
            goal: '拿到 1 段相关实习或实践',
            output: '实习证明或项目复盘'
          },
          {
            key: 'skill',
            label: '补硬技能',
            period: `第 10—${months - 6} 个月`,
            goal: '补 1 项岗位需要的技能 + 四级',
            output: '证书、作品或成绩'
          },
          {
            key: 'sprint',
            label: '秋招冲刺',
            period: '最后 6 个月',
            goal: '投递 + 面试',
            output: '30 份投递记录 + 10 次面试复盘'
          }
        ]
      : months >= 9
        ? [
            {
              key: 'direction',
              label: '先定方向',
              period: '现在—第 3 个月',
              goal: '把方向缩到 1 个',
              output: '3 条岗位要求 + 1 份简历初稿'
            },
            {
              key: 'practice',
              label: '补一段经历',
              period: '第 4—9 个月',
              goal: '拿到 1 段相关实习或实践',
              output: '实习证明或项目复盘'
            },
            {
              key: 'sprint',
              label: '冲刺',
              period: `第 10—${months} 个月`,
              goal: '投递 + 面试',
              output: '投递记录 + 面试复盘'
            }
          ]
        : [
            {
              key: 'direction',
              label: '先定方向',
              period: `现在—第 ${Math.max(1, Math.round(months / 3))} 个月`,
              goal: '把方向缩到 1 个',
              output: '3 条岗位要求'
            },
            {
              key: 'practice',
              label: '补一段经历',
              period: `第 ${Math.max(1, Math.round(months / 3)) + 1}—${Math.max(2, Math.round((months * 2) / 3))} 个月`,
              goal: '拿到 1 段相关实习或实践',
              output: '实习证明或项目复盘'
            },
            {
              key: 'sprint',
              label: '冲刺',
              period: `最后 ${Math.max(1, Math.round(months / 3))} 个月`,
              goal: '投递 + 面试',
              output: '投递记录 + 面试复盘'
            }
          ]

  const future = text(answers, 'q26')
  const moneyNote = future.includes('经济独立')
    ? ' 你说要经济独立，第一段实习或兼职不用一开始就追求高薪，先追求能覆盖一部分生活费。'
    : ''

  return {
    type: 'roadmap',
    title: `${months} 个月怎么走`,
    subtitle: hoursLine,
    phases,
    note: `每个阶段只推一个主目标；每周日 10 分钟复盘：写下周 3 件事，每件控制在 2 小时内，做完打勾。连续 3 周完成 2 件以上，再谈加量。${moneyNote}`
  }
}

function gapLines(survey: Survey, answers: Answers): { label: string; value: string }[] {
  const first = label(survey, answers, 'q6')
  const city = label(survey, answers, 'q8')
  const role = text(answers, 'q5a')
  const major = text(answers, 'q2')
  const node = deadlineFact(survey, answers)

  const lines: { label: string; value: string }[] = [
    { label: '你的第一选择', value: first || '还没确定' },
    { label: '关键时间窗', value: `${node.node}：${node.windowText}，还剩约 ${node.months} 个月` }
  ]

  if (first === '就业') {
    lines.push({ label: '目标城市', value: city || '还没想好' })
    lines.push({ label: '目标岗位', value: role || '还没写清楚' })
    if (!role && major) lines.push({ label: '你的专业', value: major })
    lines.push({ label: '现在能写进简历的', value: resumeNow(survey, answers) })
    lines.push({ label: '还缺的', value: resumeMissing(survey, answers) })
    lines.push({ label: '应届薪资区间（经验值）', value: salaryRange(city) })
    const expected = label(survey, answers, 'q27')
    if (expected) lines.push({ label: '你写的期望月薪', value: expected })
    lines.push({
      label: '入场线（经验值）',
      value: '本科 + 相关实习 1 段；英语要求看具体岗位（外贸、银行类多数写四级）'
    })
    if (city.includes('还没想好')) {
      lines.push({
        label: '城市判断',
        value: '先用行业密度、生活成本、离家距离三项打分，最晚第 3 个月定主城市 + 备选'
      })
    }
    const family = label(survey, answers, 'q15')
    if (family) {
      lines.push({
        label: '经济约束',
        value: `${family}；异地实习或租房先按每月生活费算一笔账，别等 offer 下来才发现撑不住。`
      })
    }
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
      label: '按你现在的英语投入',
      value: `每周约 ${hours} 小时，到 ${node.node} 约 ${total} 小时（只算英语）`
    })
  }

  const english = computeDocScores(survey, answers).english
  if (english.stage) {
    const preparingLine = english.stage.includes('更高等级')
      ? '你已经在准备更高等级的英语考试，英语要算进计划，不能停在「够用」'
      : '你正在准备四级/六级，英语要算进计划，不能停在「够用」'
    const englishLine = english.pathNeeds
      ? '这条路对英语有明确要求，先把它算进计划'
      : english.preparing
        ? preparingLine
        : '这条路的英语要求，以目标院校或单位的最新公告为准'
    lines.push({
      label: '门槛对照',
      value: `你现在是「${english.stage}」；${englishLine}`
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
    jobs: jobs.slice(0, 3).map((job) => withJobMatch(survey, answers, job))
  }
}

/** 把「门槛是经验值」落到三个能自己查的官方来源上，报告只指路，不替公告下结论。 */
function checklistBlock(survey: Survey, answers: Answers): ReportBlock {
  const first = label(survey, answers, 'q6')
  const preparing = labels(survey, answers, 'q7')
  const cityLabel = label(survey, answers, 'q8').replace(/（.*?）/g, '')
  const city = cityLabel.includes('还没想好') ? '' : cityLabel
  const role = text(answers, 'q5a') || text(answers, 'q2')
  const major = text(answers, 'q2')
  const place = city ? `${city} ` : ''
  const job = role || major || '目标岗位'

  let path = first
  if ((!path || path === '还没确定') && preparing.some((item) => item.includes('专升本'))) {
    path = '专升本'
  }

  const items: { title: string; detail: string; search: string }[] = []

  if (path === '考研') {
    items.push(
      {
        title: '目标院校研究生院官网',
        detail: '招生简章、专业目录、近三年复试线和英语单科线',
        search: `${major || '本专业'} 考研 目标院校 招生简章`
      },
      {
        title: '中国研究生招生信息网（研招网）',
        detail: '专业目录、考试科目、报名和确认时间',
        search: '研招网 硕士专业目录'
      },
      {
        title: '目标院校学院官网',
        detail: '复试细则、面试是否含英文环节、是否接受跨专业',
        search: `${major || '本专业'} 考研 复试细则`
      }
    )
  } else if (path === '保研') {
    items.push(
      {
        title: '目标院校研究生院官网',
        detail: '推免办法、夏令营通知、英语和科研要求',
        search: '目标院校 推免 夏令营 通知'
      },
      {
        title: '本科学院教务或学工办',
        detail: '保研细则、排名怎么算、竞赛科研加多少分',
        search: '本校 保研细则 排名 加分'
      },
      {
        title: '目标院校学院官网',
        detail: '夏令营入营条件、面试形式、是否需要英文自我介绍',
        search: '目标院校 学院 夏令营 入营条件'
      }
    )
  } else if (path === '考公' || path === '考编') {
    items.push(
      {
        title: '本省人事考试网 / 人社局官网',
        detail: '岗位表、专业目录、报名时间、笔试科目',
        search: `${path === '考公' ? '省考' : '事业单位'} 公告 岗位表 专业目录`
      },
      {
        title: '目标单位官网',
        detail: '招聘公告、专业限制、英语或资格证要求',
        search: `${major || '本专业'} ${path === '考编' ? '教师招聘' : '公务员'} 专业要求`
      },
      {
        title: '国家公务员局（仅国考）',
        detail: '国考公告、职位表、报名和考试时间',
        search: '国家公务员局 国考 职位表'
      }
    )
  } else if (path === '出国') {
    items.push(
      {
        title: '目标院校官网 Admissions 页面',
        detail: '语言成绩、GPA、申请材料、截止日期',
        search: '目标院校 官网 admission requirements'
      },
      {
        title: '语言考试官网',
        detail: '雅思或托福的分数要求、考试时间和送分方式',
        search: '雅思 托福 官方 分数要求'
      },
      {
        title: '学校国际处 / 留学基金委',
        detail: '交换项目、公派项目、学分认定和资助条件',
        search: '学校国际处 交换项目 留学基金委'
      }
    )
  } else if (path.includes('升本')) {
    items.push(
      {
        title: '本省教育考试院官网',
        detail: '专升本考试科目、英语分值、报名和考试时间',
        search: '本省 教育考试院 专升本 考试科目'
      },
      {
        title: '目标本科院校招生网',
        detail: '招生简章、专业对照表、近三年录取分数线',
        search: '目标本科院校 专升本 招生简章 分数线'
      },
      {
        title: '专科学校教务处',
        detail: '报名资格、挂科和处分限制、推荐流程',
        search: '专科学校 专升本 报名资格'
      }
    )
  } else if (path === '就业') {
    items.push(
      {
        title: '目标岗位的招聘原文',
        detail: '学历、专业、英语、实习和证书要求',
        search: `${place}${job} 招聘 应届 要求`
      },
      {
        title: '学校就业信息网 / 校招公告',
        detail: '来校招聘的单位、往届去向、宣讲会时间',
        search: '学校就业信息网 校园招聘 宣讲会'
      },
      {
        title: '目标行业资格证官网',
        detail: '入行需不需要资格证、报名条件和考试时间',
        search: `${job} 资格证 报考条件`
      }
    )
  } else {
    items.push(
      {
        title: '本省教育考试院官网',
        detail: '升学、考编、专升本等考试的科目、报名时间和英语要求',
        search: '本省 教育考试院 考试公告'
      },
      {
        title: '目标单位或院校官网',
        detail: '招生简章、招聘公告里的专业和英语要求',
        search: `${place}${job} 官网 招生 招聘`
      },
      {
        title: '学校就业信息网 / 教务处',
        detail: '校招、实习、升学项目的官方通知',
        search: '学校就业信息网 教务处 通知'
      }
    )
  }

  return {
    type: 'checklist',
    title: '你可以自己核对的三件事',
    subtitle: '报告里的门槛是经验值，真正的答案在官方原文里',
    items,
    note: '这三件事都能自己查。查完如果和报告不一致，以公告原文为准——报告只是帮你把该查的列出来，不替你做结论。'
  }
}

function englishPlan(stuck: string): string {
  switch (stuck) {
    case '词汇层':
      return '这 30 天只做一件事：每天 20 分钟复习前一天记不住的词，新的往后放；周末把一张纸重过一遍，30 天后压到 100 个以内。'
    case '听力层':
      return '这 30 天只做一件事：每天 10 分钟精听一句，跟读 3 遍；周末回听本周句子，能复述大意再换下一句。'
    case '开口层':
      return '这 30 天只做一件事：每周 2 次，每次 5 分钟，录音说一段自我介绍或岗位回答；回听时只改一个最卡的地方。'
    case '时间层':
      return '这 30 天只做一件事：把英语放进固定时段（如早课前 20 分钟），先保证每周 3 次，再谈加量。'
    case '方法层':
      return '这 30 天只做一件事：固定一套材料（真题或课程），每天 30 分钟，每周记一次正确率，不看总量只看有没有往上走。'
    default:
      return '这 30 天只做一件事：把英语放进固定时段，每天 20—30 分钟，每周记一次数字。'
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

  const target = label(survey, answers, 'q6') || '还在准备的方向'
  const jobEnglish =
    target === '就业' &&
    jobDirections(text(answers, 'q2')).some((direction) => direction.key !== 'related')
      ? '你上面列出的就业方向里，外贸、跨境电商和银行类岗位通常要求英语读写，部分写四级；'
      : ''
  const preparingCopy = english.stage.includes('更高等级')
    ? '但你自己正在准备更高等级的英语考试'
    : english.stage.includes('四级') || english.stage.includes('六级')
      ? '但你自己正在准备四级/六级'
      : `但你给英语的重要性打了 ${importance} 分`
  const gapParts: string[] = []
  if (english.pathNeeds && importance < 6) {
    gapParts.push(
      `你给英语打了 ${importance} 分，但你的目标（${target}）对英语有明确门槛：考研要考英语一/二、保研夏令营常是全英文面试、考编和专升本也普遍考英语。这个分数和你的目标之间有一条对不上的缝——不是英语不重要，是你还没看到它在这条路上具体卡在哪。`
    )
  } else if (english.pathNeeds) {
    gapParts.push(
      '这条路对英语有明确门槛，你现在的位置离它还差一截：先补最卡的那一层，不要平均用力。'
    )
  } else if (english.preparing) {
    gapParts.push(
      `${jobEnglish}具体以目标单位最新公告为准；${preparingCopy}。英语现在不是「够用就行」的加分项，而是你已经投入时间、需要看到结果的一项。`
    )
  } else {
    gapParts.push(
      `${jobEnglish}具体要不要、要到什么程度，以目标院校或单位的最新公告为准。别把阅读和表达完全放下。`
    )
  }

  const plan = englishPlan(stuck.short)

  const skipped = english.skippedDetail
    ? '（你给英语的重要度低于 6 分，后面 5 道细节题按规则跳过了，不是你没答。）'
    : ''

  // 英语不是主线时只留一句，但不做「没有门槛、够用就行」的绝对判断。
  if (!english.need) {
    return {
      type: 'section',
      title: '英语这块',
      paragraphs: [
        position +
          skipped +
          (jobEnglish
            ? `${jobEnglish}具体以目标单位最新公告为准。`
            : '按你填的方向，暂时看不出英语的硬性门槛；具体要不要、要到什么程度，以目标院校或单位的最新公告为准。别把阅读和表达完全放下。')
      ]
    }
  }

  return {
    type: 'section',
    title: '英语这块',
    paragraphs: [position + skipped, gapParts.join(''), plan]
  }
}

export function buildDocReport(
  input: DocReportInput,
  jobs: JobCard[] = []
): ReportPayload {
  const { survey, answers, name, slug, createdAt, claimed } = input
  const facts = docFacts(survey, answers)
  const tier: Tier = facts.priority
  const scores = computeDocScores(survey, answers)
  const assets = assetsBlock(survey, answers, scores)
  const jobMap = jobMapBlock(survey, answers, jobs)

  const blocks: ReportBlock[] = [
    {
      type: 'hero',
      eyebrow: '我帮你看看现在在哪儿',
      title: survey.title,
      summary: facts.oneLine,
      tier,
      // 分层 A/B/C 只给顾问看，报告里不显示档位和分数。
      tierLabel: '',
      tierLine: '先看你现在最卡的那一层。',
      total: null
    },
    scorecardBlock(survey, answers),
    ...(assets ? [assets] : []),
    ...(jobMap ? [jobMap] : []),
    // 已有方向地图时，gap 不再重复挂同一批招聘卡片。
    gapBlock(survey, answers, jobMap ? [] : jobs),
    roadmapBlock(survey, answers, scores),
    checklistBlock(survey, answers),
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
