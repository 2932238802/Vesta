import type {
  ConsultContext,
  ConsultDecisionPath,
  ConsultTemplate,
  ConsultTree
} from '../../../shared/src/consult'
import { askDeepSeek, parseJsonObject } from './deepseek'

export interface ComposeConsultInput {
  tree: ConsultTree
  template: ConsultTemplate
  decision: ConsultDecisionPath
  context: ConsultContext
  targetLength: number
  relatedPaths?: {
    id: string
    pathText: string[]
    matchedTags: string[]
    decidedCount: number
    conversionLowerBound: number | null
  }[]
}

export interface ConsultChapterPlan {
  title: string
  goal: string
  targetChars: number
}

export interface ConsultChapterResult extends ConsultChapterPlan {
  content: string
  summary: string
}

interface PlannedChapter {
  title?: unknown
  goal?: unknown
  targetChars?: unknown
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function renderVariables(input: ComposeConsultInput, text: string): string {
  const contextText = [
    input.context.name ? `称呼：${input.context.name}` : '',
    input.context.mentions ? `补充信息：${input.context.mentions}` : '',
    input.context.tags?.length ? `当前标签：${input.context.tags.join('、')}` : '',
    input.context.profile ? `用户情况：${input.context.profile}` : ''
  ]
    .filter(Boolean)
    .join('\n\n')

  return text.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, rawKey: string) => {
    if (rawKey === 'path') return pathText(input)
    if (rawKey === 'context') return contextText || '（没有补充上下文）'
    if (rawKey === 'user_name') return input.context.name || '来访者'
    const pathMatch = /^path(?:_section)?_(\d+)$/.exec(rawKey)
    if (pathMatch) {
      const index = Number(pathMatch[1]) - 1
      return input.decision.path[index]?.text ?? match
    }
    return match
  })
}

function pathText(input: ComposeConsultInput): string {
  const items = input.decision.path
  if (items.length <= 120) {
    return items.map((item, index) => `${index + 1}. ${item.text}`).join('\n')
  }
  const head = items.slice(0, 60)
  const tail = items.slice(-40)
  const middle = items.slice(60, -40)
  const step = Math.max(1, Math.ceil(middle.length / 20))
  const sampled = middle.filter((_, index) => index % step === 0).slice(0, 20)
  return [
    ...head.map((item, index) => `${index + 1}. ${item.text}`),
    `……中间省略，完整路径共 ${items.length} 步，以下为抽样……`,
    ...sampled.map((item) => `· ${item.text}`),
    `……最后 ${tail.length} 步……`,
    ...tail.map((item, index) => `${items.length - tail.length + index + 1}. ${item.text}`)
  ].join('\n')
}

function contextText(input: ComposeConsultInput): string {
  return [
    input.context.name ? `称呼：${input.context.name}` : '',
    input.context.mentions ? `补充信息：${input.context.mentions}` : '',
    input.context.tags?.length ? `当前标签：${input.context.tags.join('、')}` : '',
    input.context.profile ? `来访者问卷与情况：\n${input.context.profile}` : '',
    input.context.conversation ? `对话记录：\n${input.context.conversation}` : ''
  ]
    .filter(Boolean)
    .join('\n\n')
}

function templateText(input: ComposeConsultInput): string {
  const sections = input.template.sections
    .map(
      (section, index) =>
        `${index + 1}. ${renderVariables(input, section.name)}\n段落目标：${renderVariables(input, section.promptHint)}${
          section.tone ? `\n语气：${renderVariables(input, section.tone)}` : ''
        }`
    )
    .join('\n\n')
  return [
    `框架：${input.template.name}`,
    `主要目的：${input.template.goal}`,
    `整体说话方式：${renderVariables(input, input.template.globalTone)}`,
    '',
    sections
  ].join('\n')
}

function relatedPathsText(input: ComposeConsultInput): string {
  const paths = input.relatedPaths ?? []
  if (!paths.length) return '暂无足够的历史路径索引。'
  return paths
    .map(
      (path, index) =>
        `${index + 1}. ${path.id}｜已决策 ${path.decidedCount} 次｜成交率下界 ${
          path.conversionLowerBound === null ? '暂无' : `${Math.round(path.conversionLowerBound * 1000) / 10}%`
        }｜命中特点：${path.matchedTags.join('、') || '无'}\n${compactRelatedPath(path.pathText)}`
    )
    .join('\n\n')
}

function compactRelatedPath(path: string[]): string {
  if (path.length <= 18) return path.join(' → ')
  return [...path.slice(0, 9), `……共 ${path.length} 步……`, ...path.slice(-9)].join(' → ')
}

export async function planConsultOutline(input: ComposeConsultInput): Promise<ConsultChapterPlan[]> {
  const chapterCount = Math.max(6, Math.min(12, Math.ceil(input.targetLength / 3500)))
  const systemPrompt = `你是一位资深职业咨询内容架构师。请为一份中文咨询稿做章节规划。

要求：
1. 只能规划 ${chapterCount} 个章节，章节必须形成从判断现状、分析差距、制定路线、执行安排到收尾的完整结构。
2. 每个章节给出标题、本章写作目标、建议字数。所有章节建议字数之和应接近 ${input.targetLength} 字，单章建议 2500—4500 字。
3. 章节必须服从给定成文模板的段落顺序与意图，不得改成通用文章或心理测评报告。
4. 不得编造来访者没有提供的经历、成绩、薪资、城市或结果。
5. 只输出 JSON，不要输出解释或 Markdown。格式：
{"chapters":[{"title":"章节标题","goal":"本章要完成什么，给 AI 的具体写作指令","targetChars":3500}]}`
  const userPrompt = `目标总篇幅：${input.targetLength} 字

【成文模板】
${templateText(input)}

【本次决策路径】
${pathText(input)}

【来访者情况】
${contextText(input) || '没有补充情况。写作时必须明确哪些信息还需要确认，不能补造事实。'}

【历史路径索引（只作结构参考，不是本次结论）】
${relatedPathsText(input)}

请现在输出章节规划 JSON。`

  const output = await askDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { json: true, temperature: 0.35, maxTokens: 3000 }
  )
  const parsed = asRecord(parseJsonObject(output))
  const chapters = Array.isArray(parsed.chapters) ? parsed.chapters : []
  const cleaned: ConsultChapterPlan[] = []
  for (const raw of chapters as PlannedChapter[]) {
    const title = cleanText(raw.title, 80)
    const goal = cleanText(raw.goal, 800)
    if (!title || !goal) continue
    const targetChars = Math.round(
      Math.min(5000, Math.max(2000, Number(raw.targetChars) || Math.round(input.targetLength / chapterCount)))
    )
    cleaned.push({ title, goal, targetChars })
    if (cleaned.length >= 12) break
  }
  if (cleaned.length < 4) {
    throw new Error('AI 没有返回足够完整的章节规划，请重试')
  }

  const total = cleaned.reduce((sum, chapter) => sum + chapter.targetChars, 0)
  const scale = total > 0 ? input.targetLength / total : 1
  return cleaned.map((chapter) => ({
    ...chapter,
    targetChars: Math.round(Math.min(5000, Math.max(2000, chapter.targetChars * scale)))
  }))
}

function summarizeChapter(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  if (clean.length <= 320) return clean
  return `${clean.slice(0, 220)}……${clean.slice(-80)}`
}

function completedOutlineText(
  plan: ConsultChapterPlan[],
  completed: ConsultChapterResult[],
  currentIndex: number
): string {
  return plan
    .map((chapter, index) => {
      const done = completed.find((item) => item.title === chapter.title)
      const state = done ? '已完成' : index === currentIndex ? '本章正在写' : '待写'
      return `${index + 1}. ${chapter.title}（${state}）\n目标：${chapter.goal}${
        done ? `\n已完成内容摘要：${done.summary}` : ''
      }`
    })
    .join('\n\n')
}

async function composeChapterOnce(
  input: ComposeConsultInput,
  plan: ConsultChapterPlan[],
  chapter: ConsultChapterPlan,
  index: number,
  completed: ConsultChapterResult[],
  extraInstruction: string
): Promise<string> {
  const recent = completed.slice(-2)
  const recentText = recent
    .map((item) => `【${item.title}】\n${item.content.slice(-1200)}`)
    .join('\n\n')
  const systemPrompt = `你是一位克制、具体、有经验的中文职业咨询师。请直接写出一章咨询稿正文。

必须遵守：
1. 本章只完成给定章节目标，不要重复前文，不要提前写后续章节。
2. 保持与已完成章节一致的人物情况、判断和建议；不得编造来访者没有提供的经历、成绩、薪资、城市、政策或结果。
3. 把咨询路径中的咨询师意图写进正文，但不要提“路径”“节点”“系统”“AI”等内部说法。
4. 具体、可执行、有判断依据。信息不足时明确写还需要确认什么。
5. 不做心理诊断，不承诺录取、录用或任何确定结果，不制造焦虑。
6. 只输出本章正文，不要输出章节标题、Markdown 标记、JSON、分析过程或字数说明。
7. 本章目标约 ${chapter.targetChars} 字，允许上下浮动，但不得用重复内容凑字数。${extraInstruction}`
  const userPrompt = `【全文章节规划】
${completedOutlineText(plan, completed, index)}

【本章】
标题：${chapter.title}
写作目标：${chapter.goal}
建议字数：${chapter.targetChars}

【本次决策路径】
${pathText(input)}

【来访者情况】
${contextText(input) || '没有补充情况。请明确说明还需要确认哪些信息，不要补造事实。'}

【历史路径索引（只作参考，不得改变本次路径）】
${relatedPathsText(input)}

${recentText ? `【上一章结尾，供衔接】\n${recentText}\n` : ''}
请直接输出“${chapter.title}”的正文。`

  const maxTokens = Math.min(8000, Math.max(3000, Math.ceil(chapter.targetChars * 1.8)))
  const output = await askDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { json: false, temperature: 0.62, maxTokens }
  )
  const cleaned = output
    .trim()
    .replace(/^```(?:markdown|text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  if (!cleaned) throw new Error(`“${chapter.title}”没有生成内容`)
  return cleaned
}

export async function composeConsultChapter(
  input: ComposeConsultInput,
  plan: ConsultChapterPlan[],
  chapter: ConsultChapterPlan,
  index: number,
  completed: ConsultChapterResult[]
): Promise<ConsultChapterResult> {
  let content = await composeChapterOnce(input, plan, chapter, index, completed, '')
  if (content.length < chapter.targetChars * 0.6) {
    content = await composeChapterOnce(
      input,
      plan,
      chapter,
      index,
      completed,
      '上一版篇幅偏短。请补足有信息量的分析、判断依据、具体例子边界和行动步骤，但不要重复。'
    )
  }
  return {
    ...chapter,
    content,
    summary: summarizeChapter(content)
  }
}

const CHINESE_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

export function buildConsultDocument(sections: ConsultChapterResult[]): string {
  return sections
    .map((section, index) => `${CHINESE_NUMBERS[index] ?? String(index + 1)}、${section.title}\n\n${section.content}`)
    .join('\n\n')
}
