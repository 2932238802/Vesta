import type { Survey } from '../../../../shared/src/types'
import { db, getActiveSurvey, now } from '../../db'

/**
 * 一次请求内复用问卷数据，避免 CSV 导出按行重复查库 / 解析 JSON。
 * 只按调用方用到的 survey_id 取数（不再全表扫描）；`active` 只在找不到对应
 * survey_id 时作为回退，与原来的 `getSurvey(row.survey_id) ?? getActiveSurvey()` 行为一致。
 */
export interface SurveyCache {
  byId: Map<string, Survey>
  active: Survey
}

export function surveyCache(ids: Iterable<string | null | undefined>): SurveyCache {
  const wanted = [...new Set(ids)].filter((id): id is string => Boolean(id))
  const rows =
    wanted.length === 0
      ? []
      : (db
          .prepare(
            `SELECT id, data FROM surveys WHERE id IN (${wanted.map(() => '?').join(',')})`
          )
          .all(...wanted) as { id: string; data: string }[])
  const byId = new Map<string, Survey>()
  for (const row of rows) {
    try {
      byId.set(row.id, JSON.parse(row.data) as Survey)
    } catch {
      // 问卷数据损坏时跳过；需要的行会回退到当前问卷。
    }
  }
  // 懒加载：调用方不缺问卷行时不必为「回退用」的当前问卷付一次解析。
  let active: Survey | null = null
  return {
    byId,
    get active() {
      active ??= getActiveSurvey()
      return active
    }
  }
}

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
  report_mode: string
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
  survey_id: string | null
  report_mode: string | null
  slug: string | null
  total: number | null
  tier: string | null
  claimed_at: string | null
  slots: string | null
  contact_status: string | null
  submission_created_at: string | null
}

/** rosterStage 只需要这几列；名单行和 CSV 导出行都能直接传。 */
export interface RosterStageInput {
  submission_id: string | null
  claimed_at: string | null
  contact_status: string | null
  expires_at: string | null
  opened_at: string | null
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

export function rosterStage(row: RosterStageInput): RosterStage {
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

export function invitePath(token: string): string {
  return `/i/${token}`
}

export const CONTACT_STATUSES = new Set(['new', 'contacted', 'scheduled', 'done'])
