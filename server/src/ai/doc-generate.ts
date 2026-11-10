import type { Answers, JobCard, Survey } from '../../../shared/src/types'
import {
  deadlineFact,
  docFacts,
  normalizeDocAiContent,
  serializeDoc,
  type DocAiContent
} from '../../../shared/src/doc'
import { defaultReportSkill } from '../../../shared/src/ai'
import { computeDocScores } from '../../../shared/src/docScore'
import { config } from '../env'
import { getReportSkill, now } from '../db'
import { askDeepSeek, parseJsonObject } from './deepseek'
import { searchWeb } from './bocha'

export interface DocAiMeta {
  model: string
  generatedAt: string
}

const DOC_SKILL = `# 大学四年规划报告

你是一名面向中国大学生的规划顾问，说话直接、克制，不贩卖焦虑，也不推课。

## 你会收到
1. 一份问卷回答（题目编号 Q1—Q26）。
2. 系统算好的数字：五因素得分、个人四维得分、潜力档位、目标差距、英语位置、关键节点与时间。

## 只输出 JSON
{
  "conclusion": "一句话结论，把表面问题和真实卡点分开说，必须提到一个具体数字或事实",
  "sections": [
    { "title": "你现在卡在哪一层", "text": "..." },
    { "title": "什么时候要命", "text": "..." },
    { "title": "五年后的你", "text": "..." },
    { "title": "接下来 30 天", "text": "..." },
    { "title": "给你一句实话", "text": "..." }
  ]
}

## 五个小标题的写法（顺序固定，不能改）
1. 你现在卡在哪一层：从回答里挑一个最具体的卡点（词汇 / 听力 / 开口 / 方法 / 时间），说清它在考试或面试里长什么样。
2. 什么时候要命：用系统给的关键节点、剩余月份和投入总量，写清错过会怎样。数字直接用系统给的，不要自己改。
3. 五年后的你：引用 TA 写的原话，加上想去的城市和想做的事，写一段 TA 能认出来的画面，不写鸡汤。
4. 接下来 30 天：给 3 个能在 30 天内开始的具体动作，每条带时间点或完成标准。
5. 给你一句实话：一句克制、具体的提醒，不威胁、不安慰。

## 五段的分工与英语的分量
- 「你现在卡在哪一层」写最具体的那个卡点，可以是英语，也可以不是；如果卡点是英语，这一段里说透，其他段就不要再展开英语。
- 英语整体最多占全文三分之一，别通篇讲英语：其余四段各最多带一句英语，不能再多。
- 不要主动把英语当成唯一问题；先看 TA 真正的卡点（实习、方向、信息差、执行力、家庭条件都可能更致命）。
- 需要建议补英语时，可以中性地说「系统学习」「成体系地补」「找人带着练」「按一套完整计划走」，但不得出现「报班」「报课」「课程」「学费」「名额」这类明说的销售字样，也不点机构名。

## 硬性要求
- 正文 800—1200 字，纯文本，不要 Markdown 标题或列表符号。
- 不得出现「报班」「课程」「学费」「名额」「不学就来不及」「不过级就没戏」这类字样。
- 年级必须和系统给的关键节点一致：大一学生的秋招/夏令营在两年以后，不能说成「还有五六个月」或者「马上大三」。
- 不编造分数线、薪资、政策；需要事实时写「以官方最新公告为准」。
- 分数、档位、剩余月份、投入小时数都由系统给出，报告页会单独展示；正文里引用即可，不要重新计算，也不要写出与系统数字冲突的数字。
- 不要复述题目，不要写「你很棒」这类空话。
- conclusion 一句话，sections 必须正好 5 条，每条 title 用上面固定标题。`

function answerText(survey: Survey, answers: Answers): string {
  const values = serializeDoc(survey, answers)
  return Object.entries(values)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join('、') : value === null ? '' : String(value)
      return text.trim() ? `${key}：${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

const REVIEW_SKILL = `你是报告审校员，只做校对，不重写立场。

## 你要检查的低级问题
1. 空标签留下的痕迹：像「卡住你的是、，」「、，」「的是，」这种中间没有内容、只有标点的句子。
2. 未替换的占位符或变量：{{ }}、{name}、undefined、null、NaN、XX、某同学、示例。
3. 重复或连用标点：「，，」「。。」「、，」「；；」，以及段落开头结尾多余的顿号逗号。
4. 语病和半截话：缺主语的句子、重复词（「你想你想」）、句子被截断。
5. 和系统数字冲突：分数、剩余月份、每周小时数与给定数字不一致。
6. 禁用词：报班、课程、学费、名额、不学就来不及、不过级就没戏。
7. 没有依据的判断：凭空出现的分数线、薪资、院校要求（应写「以官方最新公告为准」）。

## 输出（只输出 JSON）
{
  "issues": ["发现的问题，没有就空数组"],
  "conclusion": "修正后的一句话结论",
  "sections": [ { "title": "原标题", "text": "修正后的正文" } ]
}

## 要求
- 五个小标题和顺序必须保持原样，不能增删。
- 只改有问题的地方；没问题的句子原样保留，不要润色成另一种风格。
- 不要新增事实，不要编造数字；拿不准的删掉或改成「以官方最新公告为准」。
- 如果年级和关键节点对不上（例如大一被写成「还有五六个月就要秋招」「马上大三」），按系统给的剩余月份改正。
- 如果英语内容超过全文三分之一，或五段里有三段都在讲英语，压缩英语，把篇幅还给实习、方向、信息差、执行力这些真正的卡点。
- 不要输出 Markdown。`

/** 先用规则挑一遍明显的低级问题，避免把坏文本直接交给审校。 */
function findTextIssues(content: DocAiContent): string[] {
  const issues: string[] = []
  const texts = [
    content.conclusion,
    ...content.sections.map((section) => `${section.title}｜${section.text}`)
  ]
  for (const text of texts) {
    if (!text.trim()) {
      issues.push('存在空段落')
      continue
    }
    if (/(\{\{|\}\}|\{name\}|undefined|null|NaN|XX|示例)/.test(text)) {
      issues.push(`出现未替换的占位内容：${text.slice(0, 40)}`)
    }
    if (/([、，。；：,;:])\1/.test(text) || /[、，]\s*[，、]/.test(text)) {
      issues.push(`标点重复或连用：${text.slice(0, 40)}`)
    }
    if (/的是[、，]/.test(text)) {
      issues.push(`「的是」后面缺内容：${text.slice(0, 40)}`)
    }
    if (/(报班|课程|学费|名额|不学就来不及|不过级就没戏)/.test(text)) {
      issues.push(`出现禁用词：${text.slice(0, 40)}`)
    }
  }
  return issues
}

function sameTitles(a: DocAiContent, b: DocAiContent): boolean {
  if (a.sections.length !== b.sections.length) return false
  return a.sections.every((section, index) => section.title === b.sections[index]?.title)
}

function cityOf(survey: Survey, answers: Answers): string {
  const question = survey.questions.find((item) => item.id === 'q8')
  const value = answers.q8
  if (!question || typeof value !== 'string') return ''
  const label = question.options?.find((option) => option.id === value)?.label ?? ''
  return label.includes('还没想好') ? '' : label.replace(/（.*?）/, '')
}

function salaryOf(snippet: string): string {
  const match = snippet.match(/\d+(?:\.\d+)?\s*[-—~至]\s*\d+(?:\.\d+)?\s*[kK千万]?(?:元)?/)
  return match?.[0]?.trim() ?? ''
}

/** 用博查抓 3 条真实招聘信息，做成可点开的卡片；失败不影响报告。 */
async function searchJobs(survey: Survey, answers: Answers): Promise<JobCard[]> {
  if (!config.bochaApiKey) return []
  const city = cityOf(survey, answers)
  const role = String(answers.q5a ?? '').trim() || String(answers.q2 ?? '').trim()
  if (!role) return []

  const queries = [
    `${city} ${role} 招聘 应届 薪资 要求`.trim(),
    `${role} 应届生 招聘 学历 英语 要求`
  ]

  const results = await Promise.allSettled(queries.map((query) => searchWeb(query)))
  const items = results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : []
  )
  const seen = new Set<string>()
  const jobs: JobCard[] = []
  for (const item of items) {
    if (jobs.length >= 3) break
    if (seen.has(item.url)) continue
    seen.add(item.url)
    jobs.push({
      title: item.title,
      company: item.site || '招聘页面',
      city,
      salary: salaryOf(item.snippet) || '薪资以原文为准',
      requirement: item.snippet.slice(0, 90),
      url: item.url,
      date: item.publishedAt
    })
  }
  return jobs
}

export async function generateDocContent(input: {
  survey: Survey
  answers: Answers
  name: string
}): Promise<{ content: DocAiContent; meta: DocAiMeta; jobs: JobCard[] }> {
  const { survey, answers, name } = input
  const facts = docFacts(survey, answers)
  const scores = computeDocScores(survey, answers)
  const node = deadlineFact(survey, answers)
  const scoreText = [...scores.background, ...scores.personal]
    .map((item) => `${item.label}：${item.score} 分`)
    .join('\n')
  const weekly = scores.english.weeklyHours

  const userPrompt = `学生：${name || '同学'}

【问卷回答】
${answerText(survey, answers)}

【系统算好的分数】（报告页会原样展示，正文引用即可，不要改数）
${scoreText}
潜力：${scores.potential.level}（${scores.potential.text}）
每周英语投入：约 ${weekly} 小时（这是「一周」的总时长，不是每天）

【系统事实】
建议卡点：${facts.stuck}（${facts.stuckDetail}）
建议结论：${facts.oneLine}
关键节点：${node.node}，${node.windowText}，还剩约 ${node.months} 个月
五年后的画面要点：${facts.future}

请按 Skill 要求写报告，只输出 JSON 对象。`

  // 管理后台「AI 分析规则」如果被改过，就把自定义规则一起作为补充口径。
  const customSkill = getReportSkill().trim()
  const skill =
    customSkill && customSkill !== defaultReportSkill
      ? `${DOC_SKILL}\n\n---\n\n## 顾问补充规则（优先遵循）\n${customSkill}`
      : DOC_SKILL

  const messages = [
    { role: 'system' as const, content: skill },
    { role: 'user' as const, content: userPrompt }
  ]

  // 招聘信息检索和写作并行，检索失败只是少一块卡片，不影响报告。
  const [contentResult, jobs] = await Promise.all([
    (async () => {
      let text = normalizeDocAiContent(parseJsonObject(await askDeepSeek(messages)))
      if (!text.conclusion || text.sections.length < 5) {
        const repair = [
          ...messages,
          { role: 'assistant' as const, content: JSON.stringify(text).slice(0, 12_000) },
          {
            role: 'user' as const,
            content:
              '上面的 JSON 不完整。请补齐 conclusion，并确保 sections 正好 5 条、每条都有 title 和 text，只输出合法 JSON。'
          }
        ]
        text = normalizeDocAiContent(parseJsonObject(await askDeepSeek(repair)))
      }
      return text
    })(),
    searchJobs(survey, answers).catch((error) => {
      console.warn('[doc-report] 招聘检索失败', error)
      return [] as JobCard[]
    })
  ])

  let content = contentResult

  if (!content.conclusion || content.sections.length < 3) {
    throw new Error('AI 报告内容不完整')
  }

  // 第二次 AI：审校。只做校对和修补，标题与顺序保持不变。
  const reviewMessages = [
    { role: 'system' as const, content: REVIEW_SKILL },
    {
      role: 'user' as const,
      content: `【学生回答】
${answerText(survey, answers)}

【系统算好的数字】（不能改）
${scoreText}
潜力：${scores.potential.level}
关键节点：${node.node}，还剩约 ${node.months} 个月

【待审报告】
${JSON.stringify(content, null, 2)}

请按审校要求检查并输出 JSON。`
    }
  ]

  try {
    const reviewed = normalizeDocAiContent(parseJsonObject(await askDeepSeek(reviewMessages)))
    if (
      reviewed.conclusion &&
      reviewed.sections.length === content.sections.length &&
      sameTitles(content, reviewed)
    ) {
      content = reviewed
    }
  } catch (error) {
    // 审校失败不影响主报告，下面还有一轮确定性检查。
    console.warn('[doc-report] 审校未完成，继续用初稿', error)
  }

  const issues = findTextIssues(content)
  const blocking = issues.filter(
    (issue) =>
      issue.startsWith('出现未替换') || issue.startsWith('存在空段落') || issue.startsWith('出现禁用词')
  )
  if (blocking.length > 0) {
    throw new Error(`AI 报告审校未通过：${blocking[0]}`)
  }
  if (issues.length > 0) {
    console.warn('[doc-report] 审校遗留小问题', issues)
  }

  return {
    content,
    jobs,
    meta: { model: config.deepseekModel, generatedAt: now() }
  }
}

export interface StoredDocReport {
  content: DocAiContent
  jobs: JobCard[]
}

export function readDocContent(raw: string | null): StoredDocReport | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const record = parsed as { doc?: unknown; content?: unknown; jobs?: unknown }
    if (record.doc !== true) return null
    const content = normalizeDocAiContent(record.content)
    if (!content.conclusion && content.sections.length === 0) return null
    const rawJobs = Array.isArray(record.jobs) ? record.jobs : []
    const jobs: JobCard[] = []
    for (const item of rawJobs) {
      if (!item || typeof item !== 'object') continue
      const job = item as Record<string, unknown>
      if (typeof job.url !== 'string' || !/^https?:\/\//i.test(job.url)) continue
      jobs.push({
        title: String(job.title ?? '招聘信息'),
        company: String(job.company ?? ''),
        city: String(job.city ?? ''),
        salary: String(job.salary ?? ''),
        requirement: String(job.requirement ?? ''),
        url: job.url,
        date: typeof job.date === 'string' ? job.date : undefined
      })
    }
    return { content, jobs }
  } catch {
    return null
  }
}
