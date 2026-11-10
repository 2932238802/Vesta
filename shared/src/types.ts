export type Tier = 'A' | 'B' | 'C' | 'D' | 'E'
export type QuestionType = 'single' | 'multi' | 'text' | 'number' | 'matrix' | 'choiceText'
export type MatrixAnswer = Record<string, number>
export interface ChoiceTextAnswer {
  choice: string
  note: string
  other?: string
}
export type AnswerValue = string | string[] | number | MatrixAnswer | ChoiceTextAnswer | null
export type Answers = Record<string, AnswerValue>

export interface SurveyGroup {
  id: string
  code: string
  title: string
  subtitle?: string
}

export interface QuestionOption {
  id: string
  label: string
  score: number | null
}

export interface QuestionBranch {
  title: string
  hint?: string
  options: QuestionOption[]
}

export interface Question {
  id: string
  code: string
  groupId: string
  title: string
  hint?: string
  type: QuestionType
  display?: 'rating'
  required: boolean
  options?: QuestionOption[]
  anchors?: { low: string; high: string }
  maxSelect?: number
  fields?: string[]
  rows?: { id: string; label: string; dimension?: string }[]
  scale?: number
  placeholder?: string
  noteLabel?: string
  notePlaceholder?: string
  otherLabel?: string
  otherPlaceholder?: string
  dimension?: string
  role?: 'self' | 'behavior' | 'context'
  /** 当指定题目的答案落在 when 里的选项 id 时才显示 */
  showIf?: { question: string; when: string[] }
  /** 当指定题目的答案落在 when 里的选项 id 时置灰（不计必答） */
  disableIf?: { question: string; when: string[] }
  /** 按另一道题的答案切换整道题面（题面 + 选项） */
  branches?: { question: string; map: Record<string, QuestionBranch> }
  /** 数字题的取值范围，用于渲染滑块 */
  range?: { min: number; max: number; step: number }
}

export interface Dimension {
  key: string
  name: string
  weight: number
}

export interface TierRule {
  tier: Tier
  min: number
  label: string
  line: string
}

export interface Survey {
  id: string
  version: number
  title: string
  intro: string
  estimatedMinutes: number
  groups: SurveyGroup[]
  questions: Question[]
  dimensions: Dimension[]
  tiers: TierRule[]
  /** 报告生成方式：'doc' 走规则化报告，'ai' 走原有 AI 报告（默认） */
  reportMode?: 'ai' | 'doc'
}

export type ModuleKey =
  | 'hero'
  | 'target'
  | 'radar'
  | 'strengths'
  | 'gaps'
  | 'consistency'
  | 'cognition'
  | 'actions'

export interface ModuleConfig {
  key: ModuleKey
  enabled: boolean
}

export interface DimensionCopy {
  strength: string
  gap: { what: string; how: string; when: string }
  action30: string
  consistency?: string
}

export interface ReportTheme {
  accent: string
  paper: string
  showTotal: boolean
  brand: string
  signature: string
}

export interface ReportCopy {
  hero: {
    eyebrow: string
    title: string
    noQuote: string
    tierLine: string
  }
  target: {
    title: string
    subtitle: string
    cityLabel: string
    roleLabel: string
    salaryLabel: string
    hometownLabel: string
    priorityLabel: string
    goalLabel: string
    reasonLabel: string
    advantageTitle: string
    gapTitle: string
    salaryTitle: string
    salaryNote: string
    cityNoteHometown: string
    cityNoteStudy: string
    cityNoteOther: string
    closing: string
    missingRole: string
    salaryBands: Record<string, string>
  }
  radar: { title: string; subtitle: string }
  strengths: { title: string; subtitle: string; item: string }
  gaps: { title: string; subtitle: string }
  consistency: { title: string; intro: string; item: string; closing: string }
  cognition: {
    title: string
    weights: string
    intro: string
    compare: string
    lightest: string
    needLine: string
    closing: string
    options: Record<string, string>
  }
  actions: {
    title: string
    subtitle: string
    item: string
    closing: string
    fallback: string[]
  }
  claim: {
    title: string
    description: string
    freeNote: string
    wechatLabel: string
    timeLabel: string
    submit: string
    successTitle: string
    successBody: string
    privacy: string
  }
  footer: { note: string }
}

export interface ReportTemplate {
  version: number
  theme: ReportTheme
  modules: ModuleConfig[]
  copy: ReportCopy
  dimensions: Record<string, DimensionCopy>
}

export interface DimScore {
  key: string
  name: string
  weight: number
  effectiveWeight?: number
  score: number
}

export interface ScoreResult {
  total: number
  tier: Tier
  dimensions: DimScore[]
  detail: Record<string, number | null>
}

export type ReportBlock =
  | {
      type: 'hero'
      eyebrow: string
      title: string
      summary: string
      tier: Tier
      tierLabel: string
      tierLine: string
      total: number | null
    }
  | {
      type: 'target'
      title: string
      subtitle: string
      labels: {
        city: string
        role: string
        salary: string
        hometown: string
        priority: string
        goal: string
        reason: string
      }
      city: string
      role: string
      salary: string
      hometown: string
      priority: string
      goal: string
      goalNote: string
      cityReason: string
      cityNote: string
      advantageTitle: string
      advantages: { key: string; name: string; score: number }[]
      gapTitle: string
      gaps: { key: string; name: string; score: number }[]
      salaryTitle: string
      salaryNote: string
      closing: string
    }
  | {
      type: 'radar'
      title: string
      subtitle: string
      dimensions: DimScore[]
    }
  | {
      type: 'strengths'
      title: string
      subtitle: string
      items: { key: string; name: string; score: number; text: string }[]
    }
  | {
      type: 'gaps'
      title: string
      subtitle: string
      items: {
        key: string
        name: string
        score: number
        what: string
        how: string
        when: string
      }[]
    }
  | {
      type: 'consistency'
      title: string
      intro: string
      paragraphs: string[]
      closing: string
    }
  | {
      type: 'cognition'
      title: string
      paragraphs: string[]
    }
  | {
      type: 'actions'
      title: string
      subtitle: string
      items: string[]
      closing: string
    }
  | {
      type: 'sources'
      title: string
      subtitle: string
      items: { title: string; url: string; site: string; usedFor: string }[]
    }
  | {
      type: 'note'
      title: string
      text: string
    }

export interface ClaimCopy {
  title: string
  description: string
  freeNote: string
  wechatLabel: string
  timeLabel: string
  submit: string
  successTitle: string
  successBody: string
  privacy: string
}

export interface ReportPayload {
  slug: string
  name: string
  createdAt: string
  surveyTitle: string
  signature: string
  blocks: ReportBlock[]
  theme: ReportTheme
  claim: ClaimCopy
  footer: { note: string }
  claimed: boolean
}

export type AiReportStatus = 'pending' | 'running' | 'ready' | 'failed'

export interface ReportResponse {
  status: AiReportStatus
  report: ReportPayload | null
  name?: string
  error?: string
  notice?: string
}

export interface ReportOverrides {
  diagnosis?: string
  closing?: string
}

export interface AdminUser {
  username: string
}

export interface InviteRecord {
  id: string
  token: string
  name: string
  note: string
  channel: string
  status: 'pending' | 'opened' | 'submitted' | 'expired'
  createdAt: string
  openedAt: string | null
  submittedAt: string | null
  expiresAt: string | null
  reportSlug: string | null
}

export interface SubmissionSummary {
  id: string
  name: string
  note: string
  channel: string
  total: number
  tier: Tier
  createdAt: string
  claimed: boolean
  contactStatus: 'new' | 'contacted' | 'scheduled' | 'done'
  reportSlug: string
}
