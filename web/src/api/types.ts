import type { Survey } from '@shared/types'

export type { Answers, Question, ReportPayload, ReportResponse, ReportTemplate, Survey } from '@shared/types'
export type {
  ConsultBeat,
  ConsultBeatKind,
  ConsultContext,
  ConsultDecisionPath,
  ConsultForest,
  ConsultModuleOption,
  ConsultNode,
  ConsultOutcome,
  ConsultRun,
  ConsultRunMode,
  ConsultRunSection,
  ConsultRunStatus,
  ConsultScoringConfig,
  ConsultTemplate,
  ConsultTemplateSection,
  ConsultTree
} from '@shared/consult'
export type {
  ConsultPurposeExample,
  ConsultPurposeNode,
  ConsultPurposePayload,
  ConsultPurposeTurn
} from '@shared/consult-purpose'
export type {
  ConsultCollectionInput,
  ConsultCollectionItem,
  ConsultCollectionKind
} from '@shared/consult-collection'
export type { ResumeImageSummary } from '@shared/resume'

export interface InvitePayload {
  name: string
  note: string
  survey: Survey
  submitted: boolean
  reportSlug: string | null
}

export interface Overview {
  stats: {
    invites: number
    opened: number
    submitted: number
    claimed: number
    pending: number
    completion: number
  }
  funnel: {
    started: number
    groups: { id: string; code: string; title: string; completed: number }[]
  }
  daily: { date: string; count: number }[]
  questions: {
    code: string
    title: string
    avgSeconds: number | null
    answered: number
    answeredRate: number
    dropoff: number
    dropoffRate: number
  }[]
  recent: {
    id: string
    name: string
    note: string
    channel: string
    total: number
    tier: string
    claimed: boolean
    contactStatus: string
    createdAt: string
    reportPath: string
  }[]
}

export interface AdminInvite {
  id: string
  token: string
  name: string
  note: string
  channel: string
  status: string
  createdAt: string
  openedAt: string | null
  submittedAt: string | null
  expiresAt: string | null
  reportSlug: string | null
  reportPath: string | null
  total: number | null
  tier: string | null
  claimed: boolean
}

export interface AdminSubmissionSummary {
  id: string
  name: string
  note: string
  channel: string
  total: number
  tier: string
  reportMode: 'doc' | 'ai'
  claimed: boolean
  slots: string[]
  contactStatus: string
  createdAt: string
  reportSlug: string
}

export type AdminRosterStage =
  | 'pending'
  | 'opened'
  | 'expired'
  | 'unclaimed'
  | 'new'
  | 'contacted'
  | 'scheduled'
  | 'done'

export interface AdminRosterRow {
  id: string
  inviteId: string
  submissionId: string | null
  token: string
  name: string
  note: string
  channel: string
  stage: AdminRosterStage
  /** 邀请创建时间所属的期次起点（YYYY-MM-DD，周三）。 */
  week: string
  inviteCreatedAt: string
  openedAt: string | null
  submittedAt: string | null
  expiresAt: string | null
  total: number | null
  tier: string | null
  reportMode: 'doc' | 'ai' | null
  claimed: boolean
  slots: string[]
  contactStatus: string | null
  reportSlug: string | null
  reportPath: string | null
  detailPath: string | null
}

export interface AdminRosterWeek {
  key: string
  start: string
  end: string
  label: string
  count: number
  current: boolean
}

export interface AdminReportSkillTemplate {
  id: string
  name: string
  skill: string
  createdAt: string
  updatedAt: string
}

export interface AdminSubmissionDetail {
  id: string
  name: string
  note: string
  channel: string
  createdAt: string
  reportPath: string
  total: number
  tier: string
  reportMode: 'doc' | 'ai'
  scores: {
    total: number
    tier: string
    dimensions: { key: string; name: string; weight: number; score: number }[]
  }
  answers: {
    id: string
    code: string
    title: string
    group: string
    value: string
    raw: unknown
  }[]
  groups: { id: string; code: string; title: string }[]
  claimed: boolean
  wechat: string
  slots: string[]
  contactStatus: string
  adminNotes: string
  overrides: { diagnosis?: string; closing?: string }
  aiStatus: string
  aiError: string
  aiAttempts: number
  aiMeta: Record<string, unknown>
}
