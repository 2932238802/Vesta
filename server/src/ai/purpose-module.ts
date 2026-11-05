import type {
  ConsultBeat,
  ConsultBeatKind,
  ConsultModuleOption
} from '../../../shared/src/consult'
import type { ConsultModulePlan } from '../consult-modules'
import { askDeepSeek, parseJsonObject } from './deepseek'
import {
  contextText,
  nodeMap,
  purposesText,
  type PurposeConsultInput
} from './purpose-consult'

export interface PurposeModuleDraft {
  options: ConsultModuleOption[]
  recommendedOptionId: string
  beats: ConsultBeat[]
}

const BEAT_KINDS = new Set<ConsultBeatKind>(['line', 'ask', 'student', 'direction', 'branch'])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function newBeatId(index: number): string {
  return `beat_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 6)}`
}

export function beatsToText(beats: ConsultBeat[]): string {
  return beats
    .map((beat) => {
      const text = beat.text.trim()
      if (!text) return ''
      if (beat.kind === 'student') return `学生：${text}`
      if (beat.kind === 'direction') return `（${text}）`
      if (beat.kind === 'branch') {
        const when = (beat.when ?? '').trim()
        return when ? `${when}：${text}` : `如果情况不同：${text}`
      }
      return `咨询师：${text}`
    })
    .filter(Boolean)
    .join('\n')
}

function parseOptions(raw: unknown): ConsultModuleOption[] {
  if (!Array.isArray(raw)) return []
  const options: ConsultModuleOption[] = []
  for (const [index, value] of raw.entries()) {
    const record = asRecord(value)
    const title = cleanText(record.title, 60)
    const summary = cleanText(record.summary, 400)
    if (!title || !summary) continue
    options.push({
      id: cleanText(record.id, 20).toUpperCase() || String.fromCharCode(65 + index),
      title,
      summary,
      why: cleanText(record.why, 600),
      tradeoff: cleanText(record.tradeoff, 400),
      fit: cleanText(record.fit, 400),
      risk: cleanText(record.risk, 400),
      evidence: cleanList(record.evidence, 5, 300),
      recommended: false
    })
    if (options.length >= 3) break
  }
  return options
}

function parseBeats(raw: unknown, fallbackWhen = ''): ConsultBeat[] {
  if (!Array.isArray(raw)) return []
  const beats: ConsultBeat[] = []
  for (const [index, value] of raw.entries()) {
    const record = asRecord(value)
    const text = cleanText(record.text, 1200)
    if (!text) continue
    const rawKind = cleanText(record.kind, 20) as ConsultBeatKind
    const kind = BEAT_KINDS.has(rawKind) ? rawKind : 'line'
    beats.push({
      id: newBeatId(index),
      kind,
      text,
      when:
        kind === 'branch' ? cleanText(record.when, 200) || fallbackWhen : undefined
    })
    if (beats.length >= 40) break
  }
  return beats
}

function moduleBrief(module: ConsultModulePlan): string {
  return [
    `模块：${module.label}`,
    `阶段：${module.stageLabel}`,
    `这一段的目的是：${module.purposeLabels.join('、')}`,
    module.brief ? `这一段的分寸：${module.brief}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

function optionText(option: ConsultModuleOption): string {
  return [
    `打法：${option.title}`,
    `怎么做：${option.summary}`,
    option.why ? `为什么适合她：${option.why}` : '',
    option.tradeoff ? `代价：${option.tradeoff}` : '',
    option.risk ? `风险：${option.risk}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

const BEAT_RULES = `节拍规则：
1. 节拍是电话里真实发生的一步，不是文章段落。一句话一个节拍，最长不超过 220 字；学生的话不超过 100 字。
2. kind 只能是 line（咨询师陈述）、ask（咨询师提问）、student（学生可能的真实回应）、direction（动作/语气/停顿提示）、branch（如果她说……就……）。
3. branch 必须写 when，例如“如果她说家里不同意”“如果她问价格”。
4. 12—28 个节拍，覆盖本模块的所有目的；至少写 2 条 branch，处理最可能的打断、异议或犹豫。分支要有真实作用，不要为凑数写无关分支。
5. 顺序必须符合真实对话推进，不要写成提纲。模块目的多、学生情况复杂时，节拍可以更多；信息少时宁可短。
6. 学生回应要像学生会说的话，不要替学生总结成长或替她做决定。
7. 不编造学生没提供的成绩、家庭、城市、预算或结果。信息不够时，用 ask 或 direction 把“需要确认”写进去。
8. 不提“目的树”“节点”“模块”“系统”“AI”等内部说法。
9. 不承诺录取、提分、就业或任何确定结果；不制造虚假稀缺和焦虑。
10. 不要为了凑字数重复、排比或空泛鼓励；长度只能来自真实的判断、解释、例子边界和分支。`

export async function planPurposeModuleDraft(
  input: PurposeConsultInput,
  module: ConsultModulePlan,
  previousText: string,
  feedbackText = ''
): Promise<PurposeModuleDraft> {
  const nodes = nodeMap(input.purposeTemplate.tree)
  const systemPrompt = `你是一位克制、具体、有经验的中文职业咨询师，也是电话成交教练。
现在只写一通电话里的一个“对话模块”，不要写整篇咨询稿，也不要写文章。

你要做两件事：
A. 给出三种真正不同的推进打法。三种打法必须在“先做什么、怎么判断、怎么推进”上不同，不能只是换措辞。
B. 把推荐打法写成可以直接照着电话说的节拍。

选择推荐打法的依据必须来自学生已经提供的情况、参考逐字稿或历史反馈。没有依据时，推荐“先确认信息”的打法，不要猜。
历史反馈只是参考，样本少时不要当成结论；不能因为某个打法过去成交多，就忽略这个学生的特殊情况。
只输出 JSON，不要输出解释或 Markdown。格式：
{"options":[{"id":"A","title":"打法名","summary":"具体怎么做","why":"为什么适合这个学生","tradeoff":"代价","fit":"适合什么情况","risk":"什么情况下会失效","evidence":["学生原话、逐字稿依据或历史反馈"]}],"recommendedOptionId":"A","beats":[{"kind":"line","text":"..."},{"kind":"ask","text":"..."},{"kind":"student","text":"..."},{"kind":"direction","text":"..."},{"kind":"branch","when":"如果她说……","text":"..."}]}

${BEAT_RULES}`

  const userPrompt = `【这一通电话的模块】
${moduleBrief(module)}

【本模块要达成的目的与参考示例】
${purposesText(input, module.purposeKeys, nodes, 14000) || '没有单独的目的说明，按模块名称和阶段写。'}

【学生情况】
${contextText(input.context) || '没有补充情况。必须把需要确认的信息写成提问或动作，不能编造。'}

${feedbackText ? `【这些目的的历史反馈】\n${feedbackText}\n只作为打法排序的参考；样本少时不要过度推断。\n` : ''}
${previousText ? `【上一模块最后几句，供衔接】\n${previousText}\n` : ''}
请输出这个模块的三种打法，以及推荐打法的节拍 JSON。`

  const output = await askDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { json: true, temperature: 0.55, maxTokens: 6000 }
  )
  const parsed = asRecord(parseJsonObject(output))
  const options = parseOptions(parsed.options)
  if (options.length < 2) throw new Error(`“${module.label}”没有给出足够的可选打法，请重试`)
  const recommended = cleanText(parsed.recommendedOptionId, 20).toUpperCase()
  const recommendedOptionId = options.some((option) => option.id === recommended)
    ? recommended
    : options[0].id
  for (const option of options) option.recommended = option.id === recommendedOptionId
  const beats = parseBeats(parsed.beats)
  if (!beats.length) throw new Error(`“${module.label}”没有生成可用的节拍，请重试`)
  return { options, recommendedOptionId, beats }
}

export async function composePurposeModuleBeats(
  input: PurposeConsultInput,
  module: ConsultModulePlan,
  option: ConsultModuleOption,
  previousText: string,
  feedbackText = ''
): Promise<ConsultBeat[]> {
  const nodes = nodeMap(input.purposeTemplate.tree)
  const systemPrompt = `你是一位克制、具体、有经验的中文职业咨询师，也是电话成交教练。
现在按已经选定的打法，只写一个“对话模块”的节拍，不要写文章，不要重新讨论打法。

${BEAT_RULES}
只输出 JSON，不要输出解释或 Markdown。格式：
{"beats":[{"kind":"line","text":"..."},{"kind":"ask","text":"..."},{"kind":"student","text":"..."},{"kind":"direction","text":"..."},{"kind":"branch","when":"如果她说……","text":"..."}]}`

  const userPrompt = `【模块】
${moduleBrief(module)}

【选定的打法】
${optionText(option)}

【本模块的目的与参考示例】
${purposesText(input, module.purposeKeys, nodes, 12000) || '按模块名称和阶段写。'}

【学生情况】
${contextText(input.context) || '没有补充情况。需要确认的信息写成提问或动作，不能编造。'}

${feedbackText ? `【这些目的的历史反馈】\n${feedbackText}\n只作参考；样本少时不要过度推断。\n` : ''}
${previousText ? `【上一模块最后几句，供衔接】\n${previousText}\n` : ''}
请输出这个模块按选定打法展开的节拍 JSON。`

  const output = await askDeepSeek(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { json: true, temperature: 0.58, maxTokens: 5200 }
  )
  const parsed = asRecord(parseJsonObject(output))
  const beats = parseBeats(parsed.beats)
  if (!beats.length) throw new Error(`“${module.label}”没有生成可用的节拍，请重试`)
  return beats
}
