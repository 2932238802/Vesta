import type { ConsultContext, ConsultTemplate } from '../../../shared/src/consult'
import type {
  ConsultPurposeExample,
  ConsultPurposeNode,
  ConsultPurposePlan,
  ConsultPurposePlanItem,
  ConsultPurposeTemplate
} from '../../../shared/src/consult-purpose'
import { askDeepSeek, parseJsonObject } from './deepseek'
import { pickExamples } from './purpose'

export interface PurposeConsultInput {
  template: ConsultTemplate
  purposeTemplate: ConsultPurposeTemplate
  plan: ConsultPurposePlan
  context: ConsultContext
  targetLength: number
}

export interface PurposeChapterPlan {
  title: string
  goal: string
  targetChars: number
  purposeKeys: string[]
}

export interface PurposeChapterResult extends PurposeChapterPlan {
  content: string
  summary: string
}

interface PlannedChapter {
  title?: unknown
  goal?: unknown
  targetChars?: unknown
  purposeKeys?: unknown
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function clampChapterCount(targetLength: number): number {
  return Math.max(6, Math.min(12, Math.ceil(targetLength / 3500)))
}

export function contextText(context: ConsultContext): string {
  return [
    context.name ? `称呼：${context.name}` : '',
    context.mentions ? `补充信息：${context.mentions}` : '',
    context.tags?.length ? `当前标签：${context.tags.join('、')}` : '',
    context.profile ? `来访者问卷与情况：\n${context.profile}` : '',
    context.conversation ? `对话记录：\n${context.conversation}` : ''
  ]
    .filter(Boolean)
    .join('\n\n')
}

function templateText(template: ConsultTemplate): string {
  const sections = template.sections
    .map(
      (section, index) =>
        `${index + 1}. ${section.name}\n段落目标：${section.promptHint}${
          section.tone ? `\n语气：${section.tone}` : ''
        }`
    )
    .join('\n\n')
  return [
    `框架：${template.name}`,
    `主要目的：${template.goal}`,
    `整体说话方式：${template.globalTone}`,
    '',
    sections
  ].join('\n')
}

function outlineText(plan: ConsultPurposePlan): string {
  return plan.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.purposeKey}｜${item.stageLabel}｜${item.label}｜${item.summary}${
          item.branchCondition ? `｜何时走这里：${item.branchCondition}` : ''
        }`
    )
    .join('\n')
}

export function nodeMap(tree: ConsultPurposeTemplate['tree']): Map<string, ConsultPurposeNode> {
  const map = new Map<string, ConsultPurposeNode>()
  const stack = [tree]
  while (stack.length) {
    const node = stack.pop()
    if (!node) continue
    if (node.purposeKey) map.set(node.purposeKey, node)
    for (const child of node.children ?? []) stack.push(child)
    for (const child of node.butterflies ?? []) stack.push(child)
  }
  return map
}

function exampleText(example: ConsultPurposeExample, budget: number): string {
  const lines: string[] = []
  let used = 0
  for (const turn of example.turns) {
    const prefix = turn.role === 'student' ? '学生' : '咨询师'
    const text = turn.text.replace(/\s+/g, ' ').trim()
    const snippet = text.length > 420 ? `${text.slice(0, 420)}……` : text
    if (used + snippet.length > budget) break
    lines.push(`${prefix}：${snippet}`)
    used += snippet.length
  }
  return lines.join('\n')
}

export function purposesText(
  input: PurposeConsultInput,
  keys: string[],
  nodes: Map<string, ConsultPurposeNode>,
  budget = 16000
): string {
  const blocks: string[] = []
  let used = 0
  for (const key of keys) {
    const item = input.plan.items.find((entry) => entry.purposeKey === key)
    if (!item) continue
    const node = nodes.get(key)
    const examples = node ? pickExamples(node, input.context, 2) : []
    const block = [
      `【目的】${item.label}（${key}）`,
      `阶段：${item.stageLabel}`,
      `要达成什么：${item.summary}`,
      item.branchCondition ? `何时走这里：${item.branchCondition}` : '',
      node?.notes?.length ? `导演提示：${node.notes.join('；')}` : '',
      item.reason ? `本次进入依据：${item.reason}` : '',
      examples.length
        ? `参考示例：\n${examples
            .map(
              (example) =>
                `· ${example.sourceLabel}${example.note ? `（${example.note}）` : ''}\n${exampleText(
                  example,
                  900
                )}`
            )
            .join('\n')}`
        : '参考示例：暂无，按目的概括写。'
    ]
      .filter(Boolean)
      .join('\n')
    if (used + block.length > budget) break
    blocks.push(block)
    used += block.length
  }
  return blocks.join('\n\n')
}

function purposeKeys(raw: unknown, allowed: Set<string>, order: Map<string, number>): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const keys: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    const key = value.trim()
    if (!allowed.has(key) || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
}

function fallbackKeys(plan: ConsultPurposePlan, index: number, count: number): string[] {
  const start = Math.floor((index / count) * plan.items.length)
  const end = Math.floor(((index + 1) / count) * plan.items.length)
  return plan.items.slice(start, end).map((item) => item.purposeKey)
}

function fillRequiredKeys(
  plan: ConsultPurposePlan,
  chapters: PurposeChapterPlan[]
): PurposeChapterPlan[] {
  const order = new Map(plan.items.map((item, index) => [item.purposeKey, index]))
  const used = new Set(chapters.flatMap((chapter) => chapter.purposeKeys))
  const missing = plan.items.filter((item) => !item.optional && !used.has(item.purposeKey))
  if (!missing.length) return chapters
  for (const item of missing) {
    const index = Math.min(
      chapters.length - 1,
      Math.floor(((order.get(item.purposeKey) ?? 0) / Math.max(1, plan.items.length)) * chapters.length)
    )
    chapters[index].purposeKeys.push(item.purposeKey)
  }
  for (const chapter of chapters) {
    chapter.purposeKeys.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
  }
  return chapters
}

export async function planPurposeChapters(
  input: PurposeConsultInput
): Promise<PurposeChapterPlan[]> {
  const chapterCount = clampChapterCount(input.targetLength)
  const allowed = new Set(input.plan.items.map((item) => item.purposeKey))
  const order = new Map(input.plan.items.map((item, index) => [item.purposeKey, index]))

  const systemPrompt = `你是一位资深职业咨询内容架构师。请为一份中文咨询稿做章节规划。

要求：
1. 只能规划 ${chapterCount} 个章节，章节必须形成从判断现状、分析差距、制定路线、执行安排到收尾的完整结构。
2. 每个章节给出标题、本章写作目标、建议字数，以及本章要覆盖的 purposeKeys。
3. purposeKeys 只能从【目的路径】里选择，必须按目的路径的顺序出现，不能重复；所有非可选目的都要被覆盖。
4. 章节顺序必须符合目的路径的阶段顺序，不能把后面的阶段提前写。
5. 每个章节建议字数之和应接近 ${input.targetLength} 字，单章建议 2500—4500 字。
6. 不得编造来访者没有提供的经历、成绩、薪资、城市或结果。
7. 只输出 JSON，不要输出解释或 Markdown。格式：
{"chapters":[{"title":"章节标题","goal":"本章要完成什么","targetChars":3500,"purposeKeys":["open.confirm-call"]}]}`

  const userPrompt = `目标总篇幅：${input.targetLength} 字

【成文模板】
${templateText(input.template)}

【目的路径】
${outlineText(input.plan)}

【来访者情况】
${contextText(input.context) || '没有补充情况。写作时必须明确哪些信息还需要确认，不能补造事实。'}

请现在输出章节规划 JSON。`

  const output = await askDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { json: true, temperature: 0.35, maxTokens: 3200 }
  )
  const parsed = asRecord(parseJsonObject(output))
  const rawChapters = Array.isArray(parsed.chapters) ? parsed.chapters : []
  const chapters: PurposeChapterPlan[] = []
  for (const raw of rawChapters as PlannedChapter[]) {
    const title = cleanText(raw.title, 80)
    const goal = cleanText(raw.goal, 800)
    if (!title || !goal) continue
    const targetChars = Math.round(
      Math.min(
        5000,
        Math.max(2000, Number(raw.targetChars) || Math.round(input.targetLength / chapterCount))
      )
    )
    chapters.push({
      title,
      goal,
      targetChars,
      purposeKeys: purposeKeys(raw.purposeKeys, allowed, order)
    })
    if (chapters.length >= 12) break
  }
  if (chapters.length < 4) {
    throw new Error('AI 没有返回足够完整的章节规划，请重试')
  }
  if (!chapters.some((chapter) => chapter.purposeKeys.length)) {
    for (const [index, chapter] of chapters.entries()) {
      chapter.purposeKeys = fallbackKeys(input.plan, index, chapters.length)
    }
  }
  fillRequiredKeys(input.plan, chapters)

  const total = chapters.reduce((sum, chapter) => sum + chapter.targetChars, 0)
  const scale = total > 0 ? input.targetLength / total : 1
  return chapters.map((chapter) => ({
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
  plan: PurposeChapterPlan[],
  completed: PurposeChapterResult[],
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
  input: PurposeConsultInput,
  nodes: Map<string, ConsultPurposeNode>,
  plan: PurposeChapterPlan[],
  chapter: PurposeChapterPlan,
  index: number,
  completed: PurposeChapterResult[],
  extraInstruction: string
): Promise<string> {
  const keys = chapter.purposeKeys.length
    ? chapter.purposeKeys
    : fallbackKeys(input.plan, index, plan.length)
  const recent = completed.slice(-2)
  const recentText = recent
    .map((item) => `【${item.title}】\n${item.content.slice(-1200)}`)
    .join('\n\n')

  const systemPrompt = `你是一位克制、具体、有经验的中文职业咨询师。请直接写出一章咨询稿正文。

必须遵守：
1. 本章只完成给定的目的和章节目标，不要重复前文，不要提前写后续章节。
2. 目的是“这一段要达成什么”，不是固定话术。请按来访者的真实情况组织语言，不要逐字照抄参考示例。
3. 参考示例只用来理解推进顺序、判断依据和回应方式；可以借鉴结构，但不得整段复制。
4. 保持与已完成章节一致的人物情况、判断和建议；不得编造来访者没有提供的经历、成绩、薪资、城市、政策或结果。
5. 把目的写成自然对话或咨询师的分析，不要提“目的树”“节点”“路径”“系统”“AI”等内部说法。
6. 具体、可执行、有判断依据。信息不足时明确写还需要确认什么。
7. 不做心理诊断，不承诺录取、录用或任何确定结果，不制造焦虑。
8. 只输出本章正文，不要输出章节标题、Markdown 标记、JSON、分析过程或字数说明。
9. 本章目标约 ${chapter.targetChars} 字，允许上下浮动，但不得用重复内容凑字数。${extraInstruction}`

  const userPrompt = `【全文章节规划】
${completedOutlineText(plan, completed, index)}

【本章】
标题：${chapter.title}
写作目标：${chapter.goal}
建议字数：${chapter.targetChars}

【本章要达成的目的】
${purposesText(input, keys, nodes)}

【来访者情况】
${contextText(input.context) || '没有补充情况。请明确说明还需要确认哪些信息，不要补造事实。'}

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

export async function composePurposeChapter(
  input: PurposeConsultInput,
  plan: PurposeChapterPlan[],
  chapter: PurposeChapterPlan,
  index: number,
  completed: PurposeChapterResult[]
): Promise<PurposeChapterResult> {
  const nodes = nodeMap(input.purposeTemplate.tree)
  let content = await composeChapterOnce(input, nodes, plan, chapter, index, completed, '')
  if (content.length < chapter.targetChars * 0.6) {
    content = await composeChapterOnce(
      input,
      nodes,
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
