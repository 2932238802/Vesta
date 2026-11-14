import type { Survey } from '@shared/types'
import type { CoverageItem, CoverageStatus, CrawlRun, ExamType } from '@shared/score-line'

export type { Answers, Question, ReportPayload, ReportResponse, ReportTemplate, Survey } from '@shared/types'
export type {
  ConsultBeat,
  ConsultBeatKind,
  ConsultContext,
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
export type {
  CoverageInfo,
  CoverageItem,
  CoverageStatus,
  CrawlRun,
  CrawlStatus,
  ExamSubject,
  ExamType,
  MinimumPoint,
  MinimumType,
  QueryLine,
  QuerySelection,
  QuerySeries,
  QuerySource,
  ReviewStatus,
  School,
  SchoolProgram,
  SchoolSearchItem,
  ScoreLineBatch,
  ScoreLineMetric,
  ScoreLineQueryResult,
  ScoreLineScope,
  ScoreLineSource
} from '@shared/score-line'

export interface AdminCoverageResponse {
  summary: Record<CoverageStatus, number>
  items: CoverageItem[]
  total: number
  page: number
  pageSize: number
}

export interface AdminReviewItem {
  kind: 'batch' | 'program'
  id: string
  province: string
  schoolName: string
  year: number
  title?: string
  confidence?: number
  createdAt: string
  majorName?: string
  planCount?: number | null
  tuition?: string
}

export interface AdminReviewResponse {
  total: number
  page: number
  pageSize: number
  items: AdminReviewItem[]
}

export interface AdminReviewActionInput {
  kind: 'batch' | 'program'
  id?: string
  ids?: string[]
  action: 'approve' | 'reject'
  note?: string
}

export interface AdminCrawlResult {
  runId: string
  status: string
  province: string
  position: number
  existing: boolean
}

export interface AdminCrawlQueueResponse {
  running: CrawlRun | null
  queue: (CrawlRun & { position: number })[]
}

export interface AdminCrawlRunDetail {
  run: CrawlRun
  documents: {
    id: string
    url: string
    http_status: number
    content_type: string
    parse_status: string
    error: string
    note: string
    shape: string
    fetched_at: string
  }[]
}

export interface AdminImportResult {
  ok: boolean
  dryRun: boolean
  batches: number
  programs: number
  metrics?: number
  ids?: string[]
}

export interface AdminImportInput {
  dryRun?: boolean
  batches?: unknown[]
  programs?: unknown[]
}

export interface AdminScoreLineSourceInput {
  id?: string
  name: string
  publisher?: string
  url: string
  entryUrl?: string
  exam: ExamType
  province?: string
  schoolId?: string
  parserId?: string
  tier?: string
  intervalHours?: number
  discoverDepth?: number
  urlInclude?: string
  verified?: boolean
  enabled?: boolean
}

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
