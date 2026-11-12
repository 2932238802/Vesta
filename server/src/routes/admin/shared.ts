import { now } from '../../db'

export interface InviteRow {
  id: string
  token: string
  name: string
  note: string
  channel: string
  survey_id: string
  status: string
  created_at: string
  opened_at: string | null
  submitted_at: string | null
  expires_at: string | null
}

export interface SubmissionRow {
  id: string
  slug: string
  invite_id: string
  survey_id: string
  answers: string
  scores: string
  total: number
  tier: string
  timing: string
  overrides: string
  contact_status: string
  admin_notes: string
  claimed_at: string | null
  wechat_enc: string | null
  slots: string | null
  ai_status: string
  ai_report: string | null
  ai_error: string
  ai_attempts: number
  ai_meta: string
  ai_started_at: string | null
  ai_finished_at: string | null
  created_at: string
}

export interface RosterRow {
  invite_id: string
  token: string
  name: string
  note: string
  channel: string
  invite_created_at: string
  opened_at: string | null
  submitted_at: string | null
  expires_at: string | null
  submission_id: string | null
  slug: string | null
  total: number | null
  tier: string | null
  claimed_at: string | null
  slots: string | null
  contact_status: string | null
  submission_created_at: string | null
  group_id: string | null
  group_name: string | null
}

export type RosterStage =
  | 'pending'
  | 'opened'
  | 'expired'
  | 'unclaimed'
  | 'new'
  | 'contacted'
  | 'scheduled'
  | 'done'

export const ROSTER_CATEGORIES = new Set([
  '',
  'all',
  'unsubmitted',
  'pending',
  'opened',
  'expired',
  'unclaimed',
  'new',
  'contacted',
  'scheduled',
  'done'
])

export function rosterStage(row: RosterRow): RosterStage {
  if (row.submission_id) {
    if (!row.claimed_at) return 'unclaimed'
    if (
      row.contact_status === 'contacted' ||
      row.contact_status === 'scheduled' ||
      row.contact_status === 'done'
    ) {
      return row.contact_status
    }
    return 'new'
  }
  if (row.expires_at && row.expires_at <= now()) return 'expired'
  return row.opened_at ? 'opened' : 'pending'
}

export function rosterCategoryMatches(category: string, stage: RosterStage): boolean {
  if (!category || category === 'all') return true
  if (category === 'unsubmitted') {
    return stage === 'pending' || stage === 'opened' || stage === 'expired'
  }
  return category === stage
}

export function localDateKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function inviteStatus(row: InviteRow, slug: string | null): string {
  if (slug) return 'submitted'
  if (row.expires_at && row.expires_at <= now()) return 'expired'
  return row.status
}

export function invitePath(token: string): string {
  return `/i/${token}`
}

export const CONTACT_STATUSES = new Set(['new', 'contacted', 'scheduled', 'done'])
