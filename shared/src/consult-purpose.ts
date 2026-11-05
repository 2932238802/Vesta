// 咨询树的只读数据模型。
//
// 和 consult.ts 里的“逐句话术树”不同：这里的节点是一段对话要达成的目的，
// 示例组保留原始逐字稿（包括学生原话），情绪垫话作为蝴蝶挂在目的节点上。
//
// 一份成交稿对应一个模板（旺季 / 淡季等）；同一目的用 purposeKey 对齐。

export type ConsultPurposeKind = 'root' | 'stage' | 'purpose' | 'butterfly'
export type ConsultPurposeSource = string
export type ConsultPurposeTurnRole = 'consultant' | 'student'
export type ConsultPurposeBeatKind = 'line' | 'ask' | 'student' | 'direction'

// 参考节拍：从原文示例里拆出来的“这一段下一步怎么说/怎么接”。
// 它不是生成结果，也不改原文；生成时可作为骨架，再按学生情况改写。
export interface ConsultPurposeBeat {
  kind: ConsultPurposeBeatKind
  text: string
}

export interface ConsultPurposeTurn {
  role: ConsultPurposeTurnRole
  speaker: string
  text: string
}

export interface ConsultPurposeExample {
  source: ConsultPurposeSource
  sourceLabel: string
  from: number
  to: number
  note: string
  turns: ConsultPurposeTurn[]
}

const BEAT_MAX_CHARS = 180
const STUDENT_FILLER = /^(嗯+|啊+|哦+|对+|好+|行+|是+|可以+|没事+|然后呢|是吧)[。！？，、…\s]*$/

function splitBeatSentences(text: string): string[] {
  return (text.replace(/\s+/g, ' ').trim().match(/[^。！？!?；;\n]+[。！？!?；;]?/g) ?? [text])
    .map((part) => part.trim())
    .filter(Boolean)
}

function splitBeatClauses(text: string): string[] {
  if (text.length <= BEAT_MAX_CHARS) return [text]
  const clauses = text.match(/[^，,、]+[，,、]?/g) ?? [text]
  const chunks: string[] = []
  let buffer = ''
  for (const clause of clauses) {
    if (buffer && buffer.length + clause.length > BEAT_MAX_CHARS) {
      chunks.push(buffer.trim())
      buffer = ''
    }
    buffer += clause
    while (buffer.length > BEAT_MAX_CHARS) {
      chunks.push(buffer.slice(0, BEAT_MAX_CHARS).trim())
      buffer = buffer.slice(BEAT_MAX_CHARS)
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim())
  return chunks
}

function classifyConsultantBeat(text: string): 'line' | 'ask' | 'direction' {
  if (/^[（(].*[）)]$/.test(text)) return 'direction'
  if (/[？?]$/.test(text)) return 'ask'
  if (
    text.length <= 70 &&
    /(吗|呢|对不对|是不是|好不好|行不行|有没有|要不要|想不想|怎么样|为什么|什么|哪里|哪个|多少|多久)[？?]?$/.test(text)
  ) {
    return 'ask'
  }
  return 'line'
}

// 把一组原文示例拆成逐条“节拍”。只做确定性的句子切分和角色归类，
// 不总结、不改写，保证页面上看到的就是原稿里真实发生过的下一步。
export function exampleToBeats(example: ConsultPurposeExample, limit = 24): ConsultPurposeBeat[] {
  const beats: ConsultPurposeBeat[] = []
  for (const turn of example.turns) {
    const chunks = splitBeatSentences(turn.text).flatMap(splitBeatClauses)
    for (const chunk of chunks) {
      const text = chunk.trim()
      if (!text) continue
      if (turn.role === 'student') {
        if (STUDENT_FILLER.test(text)) continue
        beats.push({ kind: 'student', text })
      } else {
        if (text.length <= 2) continue
        beats.push({ kind: classifyConsultantBeat(text), text })
      }
      if (beats.length >= limit) return beats
    }
  }
  return beats
}

export interface ConsultPurposeNode {
  kind: ConsultPurposeKind
  id: string
  purposeKey?: string
  label: string
  summary: string
  optional?: boolean
  gap?: boolean
  incomplete?: boolean
  group?: boolean
  branchCondition?: string
  tags?: string[]
  notes?: string[]
  examples: ConsultPurposeExample[]
  butterflies?: ConsultPurposeNode[]
  children?: ConsultPurposeNode[]
  path?: string[]
}

export interface ConsultPurposeStats {
  stages: number
  purposes: number
  optional: number
  gaps: number
  incomplete: number
  butterflies: number
  exampleGroups: number
  turns: number
  chars: number
}

export interface ConsultPurposeTemplate {
  id: string
  name: string
  season: string
  description: string
  source: string
  stats: ConsultPurposeStats
  tree: ConsultPurposeNode
}

export interface ConsultPurposeMeta {
  title: string
  generatedAt: string
  note: string
  activeTemplateId: string
}

export interface ConsultPurposePayload {
  meta: ConsultPurposeMeta
  templates: ConsultPurposeTemplate[]
}

// 一份咨询稿在目的树上的落点：按阶段顺序，列出这次要达成的目的。
// 可选支线由 AI 根据学生状态决定是否进入；非可选目的默认全部保留。
export interface ConsultPurposePlanItem {
  stageId: string
  stageLabel: string
  purposeKey: string
  label: string
  summary: string
  branchCondition: string
  optional: boolean
  reason: string
}

export interface ConsultPurposePlan {
  templateId: string
  templateName: string
  season: string
  generatedAt: string
  items: ConsultPurposePlanItem[]
}

