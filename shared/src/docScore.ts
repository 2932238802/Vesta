import type { Answers, ScoreItem, Survey } from './types'
import { resolveQuestion } from './doc'

export type ScoredItem = ScoreItem

export type PotentialLevel = '低' | '中' | '高'

export interface DocScores {
  /** 五因素：改不动的起点，但照常显示分数 */
  background: ScoredItem[]
  /** 个人四维：能改的部分，可提升空间只算这四项 */
  personal: ScoredItem[]
  potential: { level: PotentialLevel; label: string; text: string }
  english: {
    /** 综合判断：这条路上英语是否需要被当成真实差距 */
    need: boolean
    /** 目标路径本身对英语有明确要求（升学、考编、出国、专升本等） */
    pathNeeds: boolean
    /** 学生本人已经在准备四级/六级，或明确把英语看得重要 */
    preparing: boolean
    /** 低分者后 5 道英语题是按规则跳过的 */
    skippedDetail: boolean
    stage: string
    weeklyHours: number
    weakPart: string[]
    speaking: string
    reasons: string[]
  }
}

function optionIndex(survey: Survey, answers: Answers, id: string): number {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return -1
  const value = answers[id]
  if (typeof value !== 'string') return -1
  const resolved = resolveQuestion(survey, answers, question)
  return resolved.options.findIndex((option) => option.id === value)
}

function optionLabels(survey: Survey, answers: Answers, id: string): string[] {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return []
  const value = answers[id]
  if (!Array.isArray(value)) return []
  const resolved = resolveQuestion(survey, answers, question)
  return value
    .map((item) => resolved.options.find((option) => option.id === item)?.label ?? '')
    .filter(Boolean)
}

/** 单选题取选项文字；多选题用 optionLabels。 */
function singleLabel(survey: Survey, answers: Answers, id: string): string {
  const question = survey.questions.find((item) => item.id === id)
  if (!question) return ''
  const value = answers[id]
  if (typeof value !== 'string') return ''
  const resolved = resolveQuestion(survey, answers, question)
  return resolved.options.find((option) => option.id === value)?.label ?? ''
}

function pick(index: number, table: number[], fallback = 0): number {
  const value = table[index]
  return typeof value === 'number' ? value : fallback
}

function clamp(value: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, Math.round(value * 10) / 10))
}

function textAnswer(answers: Answers, id: string): string {
  const value = answers[id]
  return typeof value === 'string' ? value.trim() : ''
}

const SCHOOL = [10, 9, 8, 7.5, 7, 5.5, 4, 3, 2]
const CITY = [8, 7, 6, 4, 3]
const FAMILY = [9, 7, 5.5, 3.5, 1.5]
const PRACTICE = [9, 6, 4, 2]
const METHOD = [7, 4, 6, 5]
const INFO = [8, 6, 4, 2]
const EXECUTION = [8, 6, 4, 2]
const ENVIRONMENT = [8, 6, 4, 3]

const WEEKLY_HOURS = [1.5, 5, 10.5, 17.5]

/**
 * 就业面较窄、对口岗位相对少的专业关键词。
 * 按 Q2 的自由文本匹配；命中后「学校与专业」这一项封顶 5 分。
 * 这是一张可维护的经验表，不是对某个学生的评价。
 */
const WEAK_MAJOR_KEYWORDS = [
  // 生化环材
  '生物工程',
  '生物科学',
  '生物技术',
  '生态学',
  '化学工程',
  '应用化学',
  '化学',
  '化学生物学',
  '环境工程',
  '环境科学',
  '资源环境',
  '环境生态',
  '材料科学与工程',
  '材料化学',
  '材料物理',
  '高分子材料',
  '无机非金属材料',
  '金属材料',
  '复合材料',
  // 土木建筑
  '土木工程',
  '给排水科学与工程',
  '建筑环境与能源应用',
  '道路桥梁',
  '城市地下空间',
  '建筑学',
  '城乡规划',
  '风景园林',
  // 就业面窄的文科/管理
  '旅游管理',
  '酒店管理',
  '会展经济与管理',
  '文化产业管理',
  '公共事业管理',
  '社会工作',
  '哲学',
  '历史学',
  '人类学',
  '宗教学',
  '图书馆学',
  '档案学'
]

/**
 * 就业面相对宽、岗位供给更稳定的专业关键词。
 * 非一线/新一线城市时，这些专业不会被 6 分封顶。
 * 除理工科外也保留医学、法学、会计、师范等就业路径较清楚的方向，
 * 避免把「不是理工科」直接等同于「不好就业」。
 */
const STRONG_MAJOR_KEYWORDS = [
  '计算机',
  '软件工程',
  '人工智能',
  '数据科学',
  '大数据',
  '信息安全',
  '网络空间安全',
  '物联网',
  '电子科学',
  '电子信息',
  '通信工程',
  '微电子',
  '集成电路',
  '自动化',
  '电气工程',
  '机械设计',
  '机械电子',
  '车辆工程',
  '能源与动力',
  '数学与应用数学',
  '信息与计算科学',
  '统计学',
  '应用统计',
  '临床医学',
  '口腔医学',
  '麻醉学',
  '医学影像',
  '法学',
  '会计',
  '财务管理',
  '审计学',
  '师范',
  '小学教育',
  '学前教育'
]

type MajorTier = 'weak' | 'strong' | 'normal'

function majorTier(survey: Survey, answers: Answers): MajorTier {
  const major = textAnswer(answers, 'q2').replace(/\s+/g, '')
  if (!major) return 'normal'
  // 带「师范 / 教育」的专业即使学科本身就业面窄，也还有教师这条明确路径，
  // 不按窄口径专业封 5 分，避免把化学师范、生物师范误伤。
  const teaching = major.includes('师范') || major.includes('教育')
  if (!teaching && WEAK_MAJOR_KEYWORDS.some((word) => major.includes(word))) return 'weak'
  if (STRONG_MAJOR_KEYWORDS.some((word) => major.includes(word))) return 'strong'
  return 'normal'
}

function isTopCity(survey: Survey, answers: Answers): boolean {
  const cityLabel = singleLabel(survey, answers, 'q8')
  return (
    cityLabel.includes('北上广深') ||
    cityLabel.startsWith('新一线') ||
    cityLabel.startsWith('一线')
  )
}

/** 个人四维里的一项：分数 + 依据。 */
function methodScore(survey: Survey, answers: Answers): number {
  let score = pick(optionIndex(survey, answers, 'q14'), METHOD, 5)
  const words = optionLabels(survey, answers, 'q21')
  if (words.some((item) => item.includes('背了忘') || item.includes('基本不背'))) score -= 1
  if (words.some((item) => item.includes('每天背'))) score += 1
  const how = optionLabels(survey, answers, 'q19')
  if (how.includes('几乎没学')) score -= 1
  if (how.includes('跟课') || how.includes('刷真题')) score += 1
  return clamp(score)
}

function skillScore(survey: Survey, answers: Answers): number {
  const picked = optionLabels(survey, answers, 'q10')
  let score = 0
  if (picked.some((item) => item.startsWith('底层通用能力'))) score += 3
  if (picked.some((item) => item.startsWith('垂直技能'))) score += 3.5
  if (picked.some((item) => item.startsWith('证书'))) score += 2
  if (picked.some((item) => item.startsWith('还没培养出'))) score -= 1
  if (picked.some((item) => item.startsWith('说不清'))) score -= 0.5
  return clamp(score)
}

function cityScore(survey: Survey, answers: Answers): number {
  let score = pick(optionIndex(survey, answers, 'q8'), CITY, 3)
  const target = textAnswer(answers, 'q5a')
  if (target.length >= 6) score += 2
  else if (target.length > 0) score += 1
  // 城市这一项封顶：不是北上广深或新一线，最高 6 分。
  // 岗位写得再清楚，也只说明方向清楚，不等于城市机会密度够。
  if (!isTopCity(survey, answers)) score = Math.min(score, 6)
  return clamp(score)
}

function schoolScore(survey: Survey, answers: Answers): number {
  let score = pick(optionIndex(survey, answers, 'q1'), SCHOOL, 4)
  const majorJob = optionIndex(survey, answers, 'q5')
  if (majorJob === 0) score += 0.5
  else if (majorJob === 1) score -= 0.5

  // 专业单项封顶：
  // 1) 就业面窄的专业，不管学校多好，最高 5 分；
  // 2) 非一线/新一线城市，专业又不属于就业面较宽的方向，最高 6 分。
  const tier = majorTier(survey, answers)
  if (tier === 'weak') score = Math.min(score, 5)
  else if (!isTopCity(survey, answers) && tier !== 'strong') score = Math.min(score, 6)

  return clamp(score)
}

export function computeDocScores(survey: Survey, answers: Answers): DocScores {
  const background: ScoredItem[] = [
    {
      key: 'school',
      label: '学校与专业',
      score: schoolScore(survey, answers),
      note:
        '学校层级 + 专业是否对口；就业面窄的专业封顶 5 分，非一线/新一线城市且专业不属于就业面较宽的方向时封顶 6 分',
      benchmark: '常规入场线 6.0—8.0',
      source: 'Q1 学校 + Q5 是否对口'
    },
    {
      key: 'city',
      label: '城市与行业',
      score: cityScore(survey, answers),
      note: '目标城市的机会密度 + 行业岗位写得清不清楚；非一线/新一线城市按 6 分封顶',
      benchmark: '常规入场线 6.0—8.0',
      source: 'Q8 城市 + Q5a 岗位'
    },
    {
      key: 'family',
      label: '原生家庭托举',
      score: pick(optionIndex(survey, answers, 'q15'), FAMILY, 5),
      note: '家里能托住多少，改不了，但要说清楚',
      benchmark: '背景项，不设门槛',
      source: 'Q15 家庭支持'
    },
    {
      key: 'practice',
      label: '实习实践',
      score: pick(optionIndex(survey, answers, 'q9'), PRACTICE, 2),
      note: '能写进简历的校外实习和校内实践',
      benchmark: '常规入场线 6.0—8.5',
      source: 'Q9 实习实践'
    },
    {
      key: 'skill',
      label: '个人技能',
      score: skillScore(survey, answers),
      note: '底层能力、垂直技能、证书的累计',
      benchmark: '常规入场线 7.0—9.0',
      source: 'Q10 能力储备'
    }
  ]

  const personal: ScoredItem[] = [
    {
      key: 'method',
      label: '方法与习惯',
      score: methodScore(survey, answers),
      note: '高中到现在的学习效率，以及背单词和学英语的方式',
      source: 'Q14 高中状态 + Q21 背单词 + Q19 怎么学'
    },
    {
      key: 'info',
      label: '信息差',
      score: pick(optionIndex(survey, answers, 'q16'), INFO, 4),
      note: '对目标门槛、时间节点、报名规则的掌握程度',
      source: 'Q16 信息差'
    },
    {
      key: 'execution',
      label: '执行力',
      score: pick(optionIndex(survey, answers, 'q13'), EXECUTION, 4),
      note: '定了目标之后能不能落地、能坚持多久',
      source: 'Q13 执行力'
    },
    {
      key: 'environment',
      label: '环境氛围',
      score: pick(optionIndex(survey, answers, 'q12'), ENVIRONMENT, 4),
      note: '身边的人在做什么，对你是带动还是消耗',
      source: 'Q12 环境氛围'
    }
  ]

  // 可提升空间只用能改的四项：实习、技能、方法、执行。
  // 实习和技能在「起点」那一组里，所以分数表要把两组并起来，不能只查 personal。
  const allItems = [...background, ...personal]
  const byKey = new Map(allItems.map((item) => [item.key, item.score]))
  const gap = (key: string) => (10 - (byKey.get(key) ?? 5)) / 10
  const raw =
    100 -
    (gap('practice') * 0.4 + gap('skill') * 0.25 + gap('method') * 0.2 + gap('execution') * 0.15) * 100
  const potentialScore = Math.round(raw)
  const level: PotentialLevel = potentialScore >= 70 ? '高' : potentialScore >= 40 ? '中' : '低'
  // 对外不说「潜力低」，改成「可提升空间大」：分数照实，但不评价这个人。
  const spaceLabel = level === '低' ? '大' : level === '中' ? '中' : '小'
  const lowLabels = ['practice', 'skill', 'method', 'execution']
    .map((key) => allItems.find((item) => item.key === key))
    .filter((item): item is ScoredItem => Boolean(item) && (item?.score ?? 10) < 6)
    .sort((a, b) => a.score - b.score)
    .map((item) => item.label)
  const potentialText =
    lowLabels.length > 0
      ? `按实习实践、个人技能、方法与习惯、执行力这四项看，${lowLabels.slice(0, 2).join('、')}现在最拖后腿，但都能改。`
      : '按实习实践、个人技能、方法与习惯、执行力这四项看，没有明显短板，接下来是把已经有的往前推。'

  // 英语判断必须和「报告分析 Skill」的触发条件一致，不能只看路径：
  // 1) 目标路径本身对英语有要求：升学、考编、出国、专升本；
  // 2) 学生本人已经在准备四级/六级，或明确把英语看得重要。
  // 用选项文字判断而不是固定 id：后台改过问卷选项后，q6_1 这类 id 会错位。
  const firstChoice = singleLabel(survey, answers, 'q6')
  const preparingItems = optionLabels(survey, answers, 'q7')
  const stage = singleLabel(survey, answers, 'q17')
  const importance = typeof answers.q24 === 'number' ? answers.q24 : 0

  const pathNeeds =
    ['保研', '考研', '考编', '出国', '升本', '专升本'].some((item) =>
      firstChoice.includes(item)
    ) ||
    preparingItems.some((item) => item.includes('专升本')) ||
    singleLabel(survey, answers, 'q5').startsWith('想')

  const preparing =
    stage.includes('四级没过') ||
    stage.includes('准备六级') ||
    stage.includes('更高等级') ||
    importance >= 6 ||
    preparingItems.some(
      (item) => item.includes('四六级') || item.includes('四级') || item.includes('六级')
    )

  const need = pathNeeds || preparing

  // 低分者只答了 3 道英语题，后面 5 道是按规则跳过的，报告里要说明，不能当成「未作答」。
  const detailQuestion = survey.questions.find((item) => item.id === 'q19')
  const skippedDetail = detailQuestion
    ? !resolveQuestion(survey, answers, detailQuestion).visible
    : false

  return {
    background,
    personal,
    potential: { level, label: spaceLabel, text: potentialText },
    english: {
      need,
      pathNeeds,
      preparing,
      skippedDetail,
      stage,
      weeklyHours: pick(optionIndex(survey, answers, 'q20'), WEEKLY_HOURS, 0),
      weakPart: optionLabels(survey, answers, 'q18'),
      speaking: singleLabel(survey, answers, 'q22'),
      reasons: optionLabels(survey, answers, 'q25')
    }
  }
}
