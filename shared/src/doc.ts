import { defaultTemplate } from './template'
import type {
  Answers,
  JobCard,
  Question,
  QuestionCondition,
  QuestionOption,
  ReportBlock,
  ReportPayload,
  ReportSearchMeta,
  Survey,
  Tier
} from './types'
import { computeDocScores, type DocScores } from './docScore'
import { inferDirectionKey, jobDirections } from './job-map'
import {
  addCalendarMonths,
  describeDistance,
  isOlderThanMonths,
} from './date'

/** 报告里出现的主流就业城市；只用于从自由文本里识别城市，不限制 Q8 的选项。 */
export const MAJOR_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '苏州',
  '重庆', '天津', '长沙', '郑州', '青岛', '厦门', '合肥', '宁波', '东莞', '佛山',
  '无锡', '济南', '福州', '大连', '沈阳', '昆明', '南昌', '贵阳', '南宁', '石家庄',
  '太原', '长春', '哈尔滨', '兰州', '乌鲁木齐', '呼和浩特', '海口', '银川', '西宁', '拉萨'
]

const FIRST_TIER_CITIES = ['北京', '上海', '广州', '深圳']

/** 从「福建 - 莆田」「学校在杭州」这类自由文本里取第一个主流城市。 */
export function cityInText(value: string): string {
  return MAJOR_CITIES.find((city) => value.includes(city)) ?? ''
}

export interface TargetCity {
  /** 能落到检索词里的具体城市；为空表示本次不限定城市 */
  city: string
  /** 城市是怎么定下来的，用来在报告里说明依据 */
  basis: 'explicit' | 'school' | 'home' | 'label' | 'none'
  /** 直接给报告展示的一句说明；明确写「本次未限定城市」 */
  note: string
}

/**
 * 把 Q8 的档位（如「新一线」「北上广深」）落到具体城市。
 * 只做检索用，不改问卷答案本身；抓不到具体城市时不加城市，并在报告里写明。
 */
export function resolveTargetCity(survey: Survey, answers: Answers): TargetCity {
  const cityLabel = label(survey, answers, 'q8')
  if (!cityLabel || /还没想好|还没确定/.test(cityLabel)) {
    return { city: '', basis: 'none', note: '本次未限定城市' }
  }
  const clean = cityLabel.replace(/（.*?）/g, '').trim()
  const q4 = answers.q4
  const fields = Array.isArray(q4)
    ? q4.filter((item): item is string => typeof item === 'string')
    : []
  const home = cityInText(fields[0] ?? '')
  const school = cityInText(fields[1] ?? '')

  if (MAJOR_CITIES.includes(clean)) {
    return { city: clean, basis: 'explicit', note: '' }
  }
  if (/家乡|回家/.test(clean)) {
    return home
      ? { city: home, basis: 'home', note: `按家乡城市 ${home} 检索` }
      : { city: '', basis: 'none', note: '本次未限定城市' }
  }
  if (/新一线/.test(clean)) {
    // 学校在北上广深时，不能拿它当「新一线」的目标城市。
    if (school && !FIRST_TIER_CITIES.includes(school)) {
      return { city: school, basis: 'school', note: `按学校所在城市 ${school} 检索` }
    }
    const fromLabel = cityInText(cityLabel)
    return fromLabel
      ? { city: fromLabel, basis: 'label', note: `按 ${fromLabel} 检索` }
      : { city: '', basis: 'none', note: '本次未限定城市' }
  }
  if (/北上广深/.test(clean)) {
    return FIRST_TIER_CITIES.includes(school)
      ? { city: school, basis: 'school', note: `按学校所在城市 ${school} 检索` }
      : { city: '', basis: 'none', note: '本次未限定城市' }
  }
  const fromLabel = cityInText(cityLabel)
  return fromLabel
    ? { city: fromLabel, basis: 'label', note: `按 ${fromLabel} 检索` }
    : { city: '', basis: 'none', note: '本次未限定城市' }
}

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
  /** 粗粒度日历距离，例如「两年」「一年半」「5 个月」 */
  distance: string
  /** 目标日期，YYYY-MM-DD；无法计算时为空 */
  targetDate: string
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

  const now = new Date()
  const target = addCalendarMonths(now, Math.max(0, months))
  const targetDate = target
    ? `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    : ''
  // 所有对外时间距离都走同一个日历函数；这里只负责把「第几个学年/月」换成目标日期。
  const distance = target ? describeDistance(now, target) : `${months} 个月`

  return {
    node,
    windowText,
    months,
    distance,
    targetDate
  }
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

/** 简历盘点：只列答卷里已经有的经历、技能和方向，不把系统判断写成事实。 */
function resumeNow(survey: Survey, answers: Answers): string {
  const parts: string[] = []
  const practice = label(survey, answers, 'q9')
  if (practice && !/没有|没做过|无/.test(practice)) parts.push(practice)
  const skills = labels(survey, answers, 'q10').filter(
    (item) => !item.includes('还没培养出') && !item.includes('说不清')
  )
  if (skills.length) parts.push(`技能：${skills.join('、')}`)
  const direction = label(survey, answers, 'q11')
  if (direction && !direction.includes('没落地') && !direction.includes('完全不知道')) {
    parts.push(`方向：${direction}`)
  }
  return parts.join('；')
}

/** 「你的底牌」：只把答卷里勾选过的经历、技能、支持原样列出来；不够就不凑。 */
function assetsBlock(survey: Survey, answers: Answers): ReportBlock | null {
  const items: { key: string; name: string; text: string; source?: string }[] = []
  const practice = label(survey, answers, 'q9')
  const skills = labels(survey, answers, 'q10')
  const family = label(survey, answers, 'q15')

  if (practice && !/没有|没做过|无/.test(practice)) {
    items.push({
      key: 'practice',
      name: practice,
      source: 'Q9 实习实践',
      text: ''
    })
  }

  skills
    .filter((item) => !/还没培养出|说不清/.test(item))
    .forEach((item, index) => {
      items.push({
        key: `skill-${index}`,
        name: item,
        source: 'Q10 能力储备',
        text: ''
      })
    })

  if (family && !/完全|靠不上|帮不上|没有|基本靠自己/.test(family)) {
    items.push({
      key: 'family',
      name: family,
      source: 'Q15 家庭支持',
      text: ''
    })
  }

  if (!items.length) return null

  return {
    type: 'assets',
    title: '你现在能借到的力',
    subtitle: '只列答卷里已经有的，不凑数',
    items: items.slice(0, 4),
    note: ''
  }
}

/** 这条原文真正写到的可核对字段；卡片和来源列表共用，措辞才能统一。 */
function jobCheckFields(job: JobCard, includeCity = false): string[] {
  const text = `${job.title} ${job.requirement}`
  const fields: string[] = []
  if (/本科|大专|专科|学历/.test(text)) fields.push('学历')
  if (/专业/.test(text)) fields.push('专业')
  if (/英语|四级|六级|口语|读写/i.test(text)) fields.push('英语')
  if (/实习|工作经验|相关经验/.test(text)) fields.push('经验')
  if (/证书/.test(text)) fields.push('证书')
  if (job.salary && salaryRangeNumbers(job.salary)) fields.push('薪资')
  if (includeCity && job.city) fields.push('城市')
  return fields
}

function usedForJob(job: JobCard, directionName?: string): string {
  const target = directionName ? `「${directionName}」` : '目标岗位'
  const text = `${job.title} ${job.requirement}`
  if (/薪资待遇|薪资报告|工资待遇|平均工资|薪酬水平|就业分析/.test(text)) {
    return `用于核对：${target}薪资水平（薪资统计页，不是具体岗位）`
  }
  const fields = jobCheckFields(job)
  return fields.length
    ? `用于核对：${target}${fields.join(' / ')}`
    : `用于核对：${target}原文`
}

/**
 * 把底层检索错误转成用户能行动的中文。
 * 只翻译已知的网络 / 限流 / 鉴权错误，未知错误原样返回，不吞掉真实原因。
 */
export function friendlySearchError(message: string): string {
  const text = message.trim()
  if (!text) return ''
  if (
    /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network|aborted|timeout|timed out/i.test(
      text
    )
  ) {
    return '网络请求失败，可以重新检索'
  }
  if (/429|request limit|rate limit|频率|限流|too many/i.test(text)) {
    return '检索服务繁忙（触发限流），稍后可重试'
  }
  if (/401|403|unauthorized|forbidden|invalid.*(?:key|token)|api.?key|无权限|鉴权/i.test(text)) {
    return '检索服务鉴权失败，请检查 BOCHA_API_KEY / BOCHA_BASE_URL'
  }
  return text
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

/** 专业名和招聘原文是否有共同的关键片段；用于「计算机相关专业」这类写法。 */
function majorRelated(req: string, major: string): boolean {
  const clean = major.replace(/专业$/, '').trim()
  if (clean.length < 2) return false
  if (req.includes(clean)) return true
  if (req.includes(clean.slice(0, 2))) return true
  if (clean.length >= 4) {
    for (let index = 0; index < clean.length - 2; index += 1) {
      if (req.includes(clean.slice(index, index + 3))) return true
    }
  }
  return false
}

/** 原文写出的专业范围是否覆盖学生专业；只用于判断同一方向内原文写法是否冲突。 */
function majorFits(req: string, major: string): boolean {
  if (!major) return true
  if (
    /国际贸易|国际经济与贸易|外贸/.test(req) &&
    /国际经济与贸易|国际贸易|外贸/.test(major)
  ) {
    return true
  }
  if (/经济|金融|商务英语|英语/.test(req) && /经济|贸易|金融|商务英语|英语/.test(major)) {
    return true
  }
  return majorRelated(req, major)
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

  // 薪资统计/就业分析页不是具体岗位，不能按“投递门槛”对照。
  if (/薪资待遇|薪资报告|工资待遇|平均工资|薪酬水平|就业分析/.test(req)) {
    return {
      meets: [
        `薪资参考：${job.salary || '这条是薪资统计/分析页，不是某家公司的岗位'}`
      ],
      missing: ['这不是具体岗位，不能当投递入口；岗位门槛看同方向的招聘原文']
    }
  }

  const school = label(survey, answers, 'q1')
  const degree = jobDegree(school)
  const major = text(answers, 'q2').replace(/专业$/, '')
  const practice = label(survey, answers, 'q9')
  const skills = labels(survey, answers, 'q10')
  const english = label(survey, answers, 'q17')
  const expectation = label(survey, answers, 'q27')

  // 学历/院校层次：原文点名 985/211/双一流 时，不能只按“本科”算符合。
  const eliteRequired = /985|211|双一流|重点院校|知名院校/.test(req)
  const eliteSchool = /C9|985|211|双一流/.test(school)
  const masterRequired =
    /硕士(及以上|以上|学历|生)|研究生(及以上|以上|学历)|要求硕士|硕士起|学历[：:]\s*(硕士|研究生)/.test(
      req
    )

  if (eliteRequired) {
    if (eliteSchool && degree === '本科') {
      meets.push(`院校：原文点名 985/211/双一流，你的档位是${school}，在范围内`)
    } else {
      missing.push(
        `院校：原文要求 985/211/双一流，你的档位是${school || '还没填'}，这一条对不上；投递前确认公告是否放宽`
      )
    }
  } else if (masterRequired) {
    missing.push('学历：岗位写的是硕士/研究生，你现在是本科，投递前确认是否接受本科')
  } else if (/本科及以上|本科以上|本科/.test(req)) {
    if (degree === '本科') meets.push(`学历：岗位要本科，你的档位是${school}（本科）`)
    else if (degree === '专科') {
      missing.push('学历：岗位写的是本科，你目前是专科，投递前先确认是否接受专升本或同等学力')
    } else {
      missing.push('学历：岗位写的是本科，问卷里还没填学校档位')
    }
  } else if (/大专|专科/.test(req)) {
    meets.push(`学历：岗位接受大专${degree === '本科' ? '，你本科更稳' : '，你的档位够线'}`)
  }

  // 经验年限：应届岗和经验岗要分开，避免把 3-5 年的社招岗当投递入口。
  const experience = /(经验不限|在校\/应届|应届生|应届|\d+-\d+年|\d+年以上)/.exec(req)?.[1]
  if (experience) {
    if (/经验不限|在校|应届/.test(experience)) {
      meets.push(`经验：岗位写「${experience}」，你可以按应届或实习投`)
    } else {
      const years = Number(/(\d+)/.exec(experience)?.[1] ?? 0)
      if (years >= 3) {
        missing.push(`经验：岗位要 ${experience}，不是应届岗，优先投「经验不限/应届」的岗位`)
      } else if (years >= 1) {
        missing.push(
          `经验：岗位要 ${experience}，你的实习/兼职只能部分对上，投递前确认是否接受应届`
        )
      }
    }
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
    } else if (majorRelated(req, major)) {
      meets.push(`专业：原文写的是相关专业范围，你的${major}属于相关方向，投递前再确认具体专业目录`)
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
      missing.push(
        '英语：岗位要英语读写，你暂时没有成绩或作品可证明；可以先准备一封英文邮件或一段英文自我介绍'
      )
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
  // 没有具体缺口时不补通用句：卡片只写这条原文真实要求的对应项，避免每张卡复述同一句话。

  return { meets: meets.slice(0, 3), missing: missing.slice(0, 3) }
}

function withJobMatch(
  survey: Survey,
  answers: Answers,
  job: JobCard,
  directionName?: string
): JobCard {
  const stale = isStaleJob(job)
  return {
    ...job,
    usedFor: job.usedFor || usedForJob(job, directionName),
    ...jobMatch(survey, answers, job),
    stale
  }
}

/** 招聘原文是否已过期；旧报告可能只有日期没有 stale 标记，所以两处都看。 */
function isStaleJob(job: JobCard): boolean {
  return Boolean(job.stale) || Boolean(job.date && isOlderThanMonths(job.date, 18))
}

/** 把同一方向的多条原文汇总成门槛事实，避免只靠单条招聘下结论。 */
function directionFacts(jobs: JobCard[], major: string): string[] {
  // 过期原文只用于看「要求结构」，补位原文同理；两者都不进统计，避免老公告冒充当前门槛。
  const usable = jobs.filter((job) => !isStaleJob(job) && !job.fallback)
  if (usable.length < 2) return []
  const textOf = (job: JobCard) => `${job.title} ${job.requirement}`
  const facts: string[] = []

  const level = (job: JobCard): string => {
    const value = textOf(job)
    if (/硕士|研究生/.test(value)) return '硕士'
    if (/本科/.test(value)) return '本科'
    if (/大专|专科/.test(value)) return '大专'
    return '学历未写'
  }
  const levels = usable.map(level)
  const levelCount = new Map<string, number>()
  for (const item of levels) levelCount.set(item, (levelCount.get(item) ?? 0) + 1)
  facts.push(
    `${usable.length} 条原文里，` +
      [...levelCount.entries()].map(([name, count]) => `${name} ${count} 条`).join('，')
  )

  // 专业口径：同一方向内有的原文写专业范围、学生的专业不在范围内，有的原文没写限制或写「不限专业」。
  // 这时不能让方向卡只挑一条说法，否则会和单条原文的对照结论打架。
  // 「专业八级 / 专业四级」是证书考试，不是专业范围，先剔掉再判断。
  const majorRequirement = (job: JobCard) => /专业/.test(textOf(job).replace(/专业[八四]级/g, ''))
  const majorListed = usable.filter(majorRequirement)
  const majorOutside = majorListed.some(
    (job) =>
      !/不限专业|专业不限/.test(textOf(job)) &&
      !majorFits(textOf(job).replace(/专业[八四]级/g, ''), major)
  )
  const majorOpen =
    majorListed.some((job) => /不限专业|专业不限/.test(textOf(job))) ||
    majorListed.length < usable.length
  if (majorOutside && majorOpen) {
    facts.push('这几条原文对专业的写法不一致，以具体岗位为准')
  }

  // 「应届」必须看完整字段：标题写「应届毕业生求职」、正文却要求 2—3 年经验的，不算接受应届。
  const mentionsFresh = (text: string) => /经验不限|在校|应届/.test(text)
  const requiresYears = (text: string) => /\d+\s*[-—~至]\s*\d+\s*年|\d+\s*年以上/.test(text)
  const fresh = usable.filter(
    (job) => mentionsFresh(textOf(job)) && !requiresYears(textOf(job))
  ).length
  if (fresh > 0) facts.push(`接受应届/经验不限的 ${fresh} 条`)
  const senior = usable.filter((job) => requiresYears(textOf(job))).length
  if (senior > 0) facts.push(`写明年限要求的 ${senior} 条`)

  const skills: [string, RegExp][] = [
    ['Java', /java/i],
    ['Spring', /spring/i],
    ['SQL/数据库', /sql|数据库/i],
    ['Vue/React', /vue|react/i],
    ['测试用例/接口测试', /测试用例|功能测试|接口测试/],
    ['Excel/数据', /excel|数据分析/i],
    ['英语/四级', /英语|四级|六级/i]
  ]
  const hits = skills
    .filter(([, pattern]) => usable.some((job) => pattern.test(textOf(job))))
    .map(([name]) => name)
  if (hits.length) facts.push(`原文点名：${hits.slice(0, 4).join('、')}`)

  return facts.slice(0, 3)
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
  const grouped = directions
    .map((direction) => {
      const matchedAll = jobs.filter((job) => {
        const key =
          job.directionKey || inferDirectionKey(`${job.title} ${job.requirement}`, directions)
        // 只有一个兜底方向时，没打上方向标签的招聘原文也归到它下面。
        return key === direction.key || (!job.directionKey && directions.length === 1)
      })
      // 卡片展示与门槛统计用同一批原文：优先展示未过期原文，最多 2 条。
      const displayed = [...matchedAll]
        .sort((a, b) => Number(isStaleJob(a)) - Number(isStaleJob(b)))
        .slice(0, 2)
      const facts = directionFacts(displayed, major)
      const matched = displayed.map((job) => withJobMatch(survey, answers, job, direction.name))
      matched.forEach((job) => assigned.add(job.url))
      return { ...direction, facts, jobs: matched }
    })
    .filter((direction) => direction.jobs.length > 0)

  const relatedJobs = jobs
    .filter((job) => !assigned.has(job.url))
    .slice(0, 3)
    .map((job) => {
      const matched = withJobMatch(survey, answers, job)
      // 方向外原文的对照结论只代表这一条，注明出处，避免和方向卡的结论混读。
      return {
        ...matched,
        usedFor: matched.usedFor
          ? `这条原文写的是另一类岗位；${matched.usedFor}`
          : '这条原文写的是另一类岗位'
      }
    })

  // 没有招聘原文支撑时，不靠专业名称凭空编方向。
  if (!grouped.length && !relatedJobs.length) return null

  const targetCity = resolveTargetCity(survey, answers)
  // 过期原文的提示只在块副标题出现一次，卡片不再逐条复述。
  const hasStale =
    grouped.some((direction) => direction.jobs.some(isStaleJob)) ||
    relatedJobs.some(isStaleJob)
  const subtitle = `先看方向，再看门槛；经验值区间和招聘原文一起看，具体以原文为准${
    targetCity.note ? `；${targetCity.note}` : ''
  }${hasStale ? '；标了「信息较早」的原文只作要求结构参考，不当投递入口' : ''}`

  return {
    type: 'jobmap',
    title: '你能去的几个方向',
    subtitle,
    directions: grouped.map(({ key, name, facts, jobs: directionJobs }) => ({
      key,
      name,
      what: '',
      entry: '',
      salary: '',
      fit: '',
      facts,
      jobs: directionJobs
    })),
    relatedJobs,
    note: ''
  }
}

/** 路线图只排阶段时间窗，阶段名、主目标和验证产出由 AI 依据回答写。 */
function roadmapBlock(survey: Survey, answers: Answers, scores: DocScores): ReportBlock {
  const node = deadlineFact(survey, answers)
  const months = Math.max(1, node.months)
  const weekly = scores.english.weeklyHours
  const total = weekly > 0 ? Math.round(months * 4.33 * weekly) : 0
  const hoursLine =
    weekly > 0
      ? `到${node.node}还有约 ${node.distance}；按每周约 ${weekly} 小时的英语投入算，约 ${total} 小时（只算英语）`
      : `到${node.node}还有约 ${node.distance}；这次没有每周英语投入的数据，先不估算总时长`

  const phase = (key: string, period: string) => ({ key, label: '', period, goal: '', output: '' })
  const phases =
    months >= 18
      ? [
          phase('direction', '现在—第 3 个月'),
          phase('practice', '第 4—9 个月'),
          phase('skill', `第 10—${months - 6} 个月`),
          phase('sprint', '最后 6 个月')
        ]
      : months >= 9
        ? [
            phase('direction', '现在—第 3 个月'),
            phase('practice', '第 4—9 个月'),
            phase('sprint', `第 10—${months} 个月`)
          ]
        : [
            phase('direction', `现在—第 ${Math.max(1, Math.round(months / 3))} 个月`),
            phase(
              'practice',
              `第 ${Math.max(1, Math.round(months / 3)) + 1}—${Math.max(2, Math.round((months * 2) / 3))} 个月`
            ),
            phase('sprint', `最后 ${Math.max(1, Math.round(months / 3))} 个月`)
          ]

  return {
    type: 'roadmap',
    title: `${node.node}怎么走`,
    subtitle: hoursLine,
    phases,
    note: ''
  }
}

/** gap 只输出程序能算出的事实；入场线、城市判断和下一步交给 AI 写在 paragraphs。 */
function gapLines(survey: Survey, answers: Answers): { label: string; value: string }[] {
  const first = label(survey, answers, 'q6')
  const city = label(survey, answers, 'q8')
  const targetCity = resolveTargetCity(survey, answers)
  const role = text(answers, 'q5a')
  const major = text(answers, 'q2')
  const node = deadlineFact(survey, answers)

  const lines: { label: string; value: string }[] = [
    { label: '你的第一选择', value: first || '还没确定' },
    { label: '关键时间窗', value: `${node.node}：${node.windowText}，还有约 ${node.distance}` }
  ]

  if (first === '就业') {
    // 目标城市写成 resolveTargetCity() 落到的具体城市；Q8 的档位串只作检索依据，不回抄。
    const cityValue =
      !city || city.includes('还没想好')
        ? '还没想好'
        : targetCity.city || targetCity.note
    lines.push({ label: '目标城市', value: cityValue })
    lines.push({ label: '目标岗位', value: role || '还没写清楚' })
    if (!role && major) lines.push({ label: '你的专业', value: major })
    const nowText = resumeNow(survey, answers)
    // 简历盘点为空也是事实：这一行不能省略，否则 AI 会以为只差目标岗位。
    lines.push({ label: '现在能写进简历的', value: nowText || '还没有' })
    const expected = label(survey, answers, 'q27')
    if (expected) lines.push({ label: '你写的期望月薪', value: expected })
    const family = label(survey, answers, 'q15')
    if (family) {
      lines.push({ label: '经济约束', value: family })
    }
  } else if (first === '考研') {
    lines.push({ label: '目标专业', value: major || '还没填' })
  }

  const english = computeDocScores(survey, answers).english
  if (english.stage) {
    lines.push({ label: '英语现状', value: english.stage })
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
    // 分值是系统算的；怎么解释这个空间由 AI 依据本次回答写，不用规则文案兜底。
    potential: { ...scores.potential, text: '' }
  }
}

function gapBlock(survey: Survey, answers: Answers, jobs: JobCard[] = []): ReportBlock {
  const hasStale = jobs.some(isStaleJob)
  return {
    type: 'gap',
    title: '和目标之间还差多少',
    subtitle:
      '门槛是经验值区间，以目标单位最新公告或招聘原文为准' +
      (hasStale ? '；标了「信息较早」的原文只作要求结构参考，不当投递入口' : ''),
    lines: gapLines(survey, answers),
    paragraphs: [],
    note: '',
    jobs: jobs.slice(0, 3).map((job) => withJobMatch(survey, answers, job))
  }
}

/** 核对清单只给检索词和固定 key；具体查什么、怎么查由 AI 依据回答写。 */
function checklistBlock(survey: Survey, answers: Answers): ReportBlock {
  const first = label(survey, answers, 'q6')
  // 核对清单里的检索词也要用具体城市；「新一线」这类档位词不能直接拿去搜。
  const city = resolveTargetCity(survey, answers).city
  const role = text(answers, 'q5a') || text(answers, 'q2')
  const place = city ? `${city} ` : ''
  const target = role || '目标岗位'
  const path = first && first !== '还没确定' ? first : '方向'

  return {
    type: 'checklist',
    title: '你可以自己核对的三件事',
    subtitle: '报告里的判断要能回到原文；下面三条是检索入口，不是结论',
    items: [
      { key: 'check-requirements', title: '', detail: '', search: `${place}${target} ${path} 要求 公告` },
      { key: 'check-deadline', title: '', detail: '', search: `${place}${target} ${path} 报名 时间` },
      { key: 'check-source', title: '', detail: '', search: `${place}${target} ${path} 官方 原文` }
    ],
    note: ''
  }
}

/** 英语块的数字位置由系统给，解释和计划交给 AI。 */
function englishSection(): ReportBlock {
  return {
    type: 'section',
    title: '英语这块',
    paragraphs: []
  }
}

export function buildDocReport(
  input: DocReportInput,
  jobs: JobCard[] = []
): ReportPayload {
  const { survey, answers, name, slug, createdAt, claimed } = input
  const tier: Tier = docPriority(survey, answers)
  const scores = computeDocScores(survey, answers)
  const assets = assetsBlock(survey, answers)
  const jobMap = jobMapBlock(survey, answers, jobs)

  const blocks: ReportBlock[] = [
    {
      type: 'hero',
      eyebrow: '我帮你看看现在在哪儿',
      title: survey.title,
      summary: '',
      tier,
      // 分层 A/B/C 只给顾问看，报告里不显示档位和分数。
      tierLabel: '',
      tierLine: '',
      total: null
    },
    scorecardBlock(survey, answers),
    ...(assets ? [assets] : []),
    ...(jobMap ? [jobMap] : []),
    // 已有方向地图时，gap 不再重复挂同一批招聘卡片。
    gapBlock(survey, answers, jobMap ? [] : jobs),
    roadmapBlock(survey, answers, scores),
    checklistBlock(survey, answers),
    englishSection()
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

export interface DocAiModuleItem {
  key: string
  text?: string
  fields?: Record<string, string>
}

export interface DocAiModule {
  key: string
  title: string
  summary: string
  paragraphs: string[]
  items: DocAiModuleItem[]
}

export interface DocAiContent {
  conclusion: string
  /** 新版：按数据模块输出，每个模块的标题和正文都由 AI 写 */
  modules: DocAiModule[]
  /** 旧版报告兼容：固定五段 */
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

function cleanFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const fields: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string') continue
    const text = cleanReportText(raw)
    if (text) fields[key] = text
  }
  return fields
}

export function normalizeDocAiContent(raw: unknown): DocAiContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { conclusion: '', modules: [], sections: [] }
  }
  const record = raw as Record<string, unknown>
  const conclusion =
    typeof record.conclusion === 'string' ? cleanReportText(record.conclusion) : ''

  const moduleList = Array.isArray(record.modules) ? record.modules : []
  const modules = moduleList
    .map((item): DocAiModule | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const entry = item as Record<string, unknown>
      const key = typeof entry.key === 'string' ? entry.key.trim() : ''
      const title = typeof entry.title === 'string' ? cleanReportText(entry.title) : ''
      const summary = typeof entry.summary === 'string' ? cleanReportText(entry.summary) : ''
      const paragraphs = Array.isArray(entry.paragraphs)
        ? entry.paragraphs
            .filter((text): text is string => typeof text === 'string')
            .map((text) => cleanReportText(text))
            .filter(Boolean)
        : []
      const items = Array.isArray(entry.items)
        ? entry.items
            .map((rawItem): DocAiModuleItem | null => {
              if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) return null
              const itemRecord = rawItem as Record<string, unknown>
              const itemKey = typeof itemRecord.key === 'string' ? itemRecord.key.trim() : ''
              if (!itemKey) return null
              const text =
                typeof itemRecord.text === 'string' ? cleanReportText(itemRecord.text) : ''
              return { key: itemKey, text, fields: cleanFields(itemRecord.fields) }
            })
            .filter((rawItem): rawItem is DocAiModuleItem => Boolean(rawItem))
        : []
      if (!key || (!title && !summary && !paragraphs.length && !items.length)) return null
      return { key, title, summary, paragraphs, items }
    })
    .filter((item): item is DocAiModule => Boolean(item))

  const sectionList = Array.isArray(record.sections) ? record.sections : []
  const sections = sectionList
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const entry = item as Record<string, unknown>
      const title = typeof entry.title === 'string' ? entry.title.trim() : ''
      const text = typeof entry.text === 'string' ? cleanReportText(entry.text) : ''
      return title && text ? { title, text } : null
    })
    .filter((section): section is { title: string; text: string } => Boolean(section))

  return { conclusion, modules, sections }
}

function moduleMap(content: DocAiContent): Map<string, DocAiModule> {
  return new Map(content.modules.map((module) => [module.key, module]))
}

function moduleText(module: DocAiModule): string {
  return module.summary || module.paragraphs.join('\n')
}

function itemMap(module: DocAiModule): Map<string, DocAiModuleItem> {
  return new Map(module.items.map((item) => [item.key, item]))
}

function applySystemModules(base: ReportPayload, content: DocAiContent): ReportBlock[] {
  const modules = moduleMap(content)
  const blocks = base.blocks.filter((block) => block.type !== 'hero')
  const hero = base.blocks[0]

  for (const block of blocks) {
    if (block.type === 'scorecard') {
      const module = modules.get('scorecard')
      if (!module) continue
      if (module.title) block.title = module.title
      if (module.summary) block.potential.text = module.summary
      const items = itemMap(module)
      for (const score of [...block.background, ...block.personal]) {
        const item = items.get(score.key)
        if (item?.text) score.note = item.text
      }
    } else if (block.type === 'assets') {
      const module = modules.get('assets')
      if (!module) continue
      if (module.title) block.title = module.title
      if (module.summary) block.note = module.summary
      const items = itemMap(module)
      for (const item of block.items) {
        const ai = items.get(item.key)
        if (ai?.text) item.text = ai.text
      }
    } else if (block.type === 'jobmap') {
      const module = modules.get('jobmap')
      if (!module) continue
      if (module.title) block.title = module.title
      if (module.summary) block.note = module.summary
      const items = itemMap(module)
      for (const direction of block.directions) {
        const ai = items.get(direction.key)
        if (!ai) continue
        if (ai.fields?.name) direction.name = ai.fields.name
        if (ai.fields?.what) direction.what = ai.fields.what
        if (ai.fields?.entry) direction.entry = ai.fields.entry
        if (ai.fields?.salary) direction.salary = ai.fields.salary
        if (ai.fields?.fit) direction.fit = ai.fields.fit
      }
    } else if (block.type === 'gap') {
      const module = modules.get('gap')
      if (!module) continue
      if (module.title) block.title = module.title
      if (module.summary) block.note = module.summary
      if (module.paragraphs.length) block.paragraphs = module.paragraphs
    } else if (block.type === 'roadmap') {
      const module = modules.get('roadmap')
      if (!module) continue
      if (module.title) block.title = module.title
      if (module.summary) block.note = module.summary
      const items = itemMap(module)
      for (const phase of block.phases) {
        const ai = items.get(phase.key)
        if (!ai) continue
        const label = ai.fields?.label?.trim() ?? ''
        // 时间窗由系统单独展示；AI 若把「第 10—28 个月」抄进 label，就不再重复显示。
        if (label && !/\d+\s*个月/.test(label)) phase.label = label
        if (ai.fields?.goal) phase.goal = ai.fields.goal
        if (ai.fields?.output) phase.output = ai.fields.output
      }
    } else if (block.type === 'checklist') {
      const module = modules.get('checklist')
      if (!module) continue
      if (module.title) block.title = module.title
      if (module.summary) block.note = module.summary
      const items = itemMap(module)
      for (const item of block.items) {
        const ai = items.get(item.key)
        if (!ai) continue
        if (ai.fields?.title) item.title = ai.fields.title
        if (ai.fields?.detail) item.detail = ai.fields.detail
      }
    } else if (block.type === 'section') {
      const module = modules.get('english')
      if (!module) continue
      if (module.title) block.title = module.title
      if (module.paragraphs.length) block.paragraphs = module.paragraphs
    }
  }

  return hero?.type === 'hero'
    ? [{ ...hero, summary: content.conclusion || hero.summary }, ...blocks]
    : blocks
}

function sourcesBlock(input: {
  jobs?: JobCard[]
  search?: ReportSearchMeta
}): ReportBlock | null {
  const search = input.search
  const sources = search?.sources?.length
    ? search.sources
    : (input.jobs ?? []).map((job) => ({
        title: job.title,
        url: job.url,
        site: job.company || job.city,
        date: job.date
      }))
  const queries = search?.queries ?? []
  const error = friendlySearchError(search?.error ?? '')
  if (!sources.length && !queries.length && !error) return null
  const jobByUrl = new Map((input.jobs ?? []).map((job) => [job.url.replace(/\/$/, ''), job]))
  const usedForOf = (source: { url: string; date?: string }): string => {
    const job = jobByUrl.get(source.url.replace(/\/$/, ''))
    const fields = job ? jobCheckFields(job, true) : []
    const base = fields.length
      ? `用于核对：${fields.join(' / ')}`
      : '用于核对：报告里的岗位原文'
    return source.date ? `${base} · 发布于 ${source.date.slice(0, 10)}` : base
  }
  const yearNote = search?.searchYear ? `检索词按 ${search.searchYear} 届拼写` : ''

  return {
    type: 'sources',
    title: '检索记录与原文',
    subtitle: ['服务器实际发送的检索词和返回的原文链接，点开可核对', yearNote]
      .filter(Boolean)
      .join('；'),
    items: sources.slice(0, 12).map((source) => ({
      title: source.title,
      url: source.url,
      site: source.site,
      usedFor: usedForOf(source)
    })),
    queries,
    error,
    retryable: Boolean(error || search?.configured === false),
    searchedAt: search?.searchedAt ?? '',
    configured: search?.configured ?? false
  }
}

/** 用 AI 内容替换规则版正文；AI 内容不完整时直接报错，不回落成模板。 */
export function buildDocReportWithAi(
  input: DocReportInput & {
    content: DocAiContent
    jobs?: JobCard[]
    search?: ReportSearchMeta
  }
): ReportPayload {
  const base = buildDocReport(input, input.jobs ?? [])
  const hero = base.blocks[0]
  if (hero?.type !== 'hero') throw new Error('报告基础结构不完整')

  const sources = sourcesBlock({ jobs: input.jobs, search: input.search })

  if (input.content.modules.length > 0) {
    const blocks = applySystemModules(base, input.content)
    const chapterKeys = new Set(['stuck', 'deadline', 'future'])
    const chapters = input.content.modules
      .filter((module) => chapterKeys.has(module.key))
      .map(
        (module): ReportBlock => ({
          type: 'section',
          title: module.title || module.key,
          paragraphs: module.paragraphs.length ? module.paragraphs : [module.summary].filter(Boolean)
        })
      )
    return {
      ...base,
      blocks: [...blocks, ...chapters, ...(sources ? [sources] : [])]
    }
  }

  if (input.content.sections.length === 0) {
    throw new Error('AI 报告没有可用的正文')
  }

  // 兼容旧报告：旧版只有五段正文，没有模块化字段。
  const systemBlocks = base.blocks.filter((block) => block.type !== 'hero')
  const blocks: ReportBlock[] = [
    { ...hero, summary: input.content.conclusion },
    ...systemBlocks,
    ...input.content.sections.map(
      (section): ReportBlock => ({ type: 'note', title: section.title, text: section.text })
    ),
    ...(sources ? [sources] : [])
  ]
  return { ...base, blocks }
}
