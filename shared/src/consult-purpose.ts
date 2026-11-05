// 咨询树的只读数据模型。
//
// 和 consult.ts 里的“逐句话术树”不同：这里的节点是一段对话要达成的目的，
// 示例组保留原始逐字稿（包括学生原话），情绪垫话作为蝴蝶挂在目的节点上。
//
// 一份成交稿对应一个模板（旺季 / 淡季等）；同一目的用 purposeKey 对齐。

export type ConsultPurposeKind = 'root' | 'stage' | 'purpose' | 'butterfly'
export type ConsultPurposeSource = string
export type ConsultPurposeTurnRole = 'consultant' | 'student'

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

