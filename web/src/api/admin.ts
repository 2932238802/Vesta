import type {
  AdminReportSkillTemplate,
  AdminRosterRow,
  AdminRosterWeek,
  AdminSubmissionDetail,
  AdminSubmissionSummary,
  Overview
} from './types'
import type {
  AdminCoverageResponse,
  AdminCrawlQueueResponse,
  AdminCrawlResult,
  AdminCrawlRunDetail,
  AdminImportInput,
  AdminImportResult,
  AdminReviewActionInput,
  AdminReviewResponse,
  AdminScoreLineSourceInput,
  ReportPayload,
  ReportTemplate,
  SchoolProgram,
  SchoolSearchItem,
  ScoreLineQueryResult,
  ScoreLineSource,
  Survey
} from './types'
import { ApiError, getToken, query, request } from './request'

export const adminApi = {
  login(username: string, password: string) {
    return request<{ token: string; user: { username: string } }>('/api/admin/login', {
      method: 'POST',
      body: { username, password }
    })
  },
  devLogin() {
    return request<{ token: string; user: { username: string } }>('/api/admin/dev-login', {
      method: 'POST'
    })
  },
  me() {
    return request<{ user: { username: string } }>('/api/admin/me', { auth: true })
  },
  logout() {
    return request<{ ok: true }>('/api/admin/logout', { method: 'POST', auth: true })
  },
  overview() {
    return request<Overview>('/api/admin/overview', { auth: true })
  },
  scoreLineSchools(
    params: {
      q?: string
      province?: string
      level?: string
      exam?: string
      year?: number
      limit?: number
    } = {}
  ) {
    return request<{ schools: SchoolSearchItem[] }>(
      `/api/admin/score-lines/schools${query({
        q: params.q,
        province: params.province,
        level: params.level,
        exam: params.exam,
        year: params.year ? String(params.year) : undefined,
        limit: params.limit ? String(params.limit) : undefined
      })}`,
      { auth: true }
    )
  },
  scoreLinePrograms(params: {
    schoolId: string
    year: number
    exam: string
    q?: string
    limit?: number
  }) {
    return request<{ programs: SchoolProgram[] }>(
      `/api/admin/score-lines/programs${query({
        schoolId: params.schoolId,
        year: String(params.year),
        exam: params.exam,
        q: params.q,
        limit: params.limit ? String(params.limit) : undefined
      })}`,
      { auth: true }
    )
  },
  scoreLineQuery(params: {
    exam: string
    year: number
    province?: string
    region?: string
    schoolId?: string
    programId?: string
    category?: string
    track?: string
  }) {
    return request<ScoreLineQueryResult>(
      `/api/admin/score-lines/query${query({
        exam: params.exam,
        year: String(params.year),
        province: params.province,
        region: params.region,
        schoolId: params.schoolId,
        programId: params.programId,
        category: params.category,
        track: params.track
      })}`,
      { auth: true }
    )
  },
  scoreLineCoverage(params: {
    exam: string
    year: number
    province?: string
    status?: string
    page?: number
  }) {
    return request<AdminCoverageResponse>(
      `/api/admin/score-lines/coverage${query({
        exam: params.exam,
        year: String(params.year),
        province: params.province,
        status: params.status,
        page: params.page ? String(params.page) : undefined
      })}`,
      { auth: true }
    )
  },
  scoreLineImport(body: AdminImportInput) {
    return request<AdminImportResult>('/api/admin/score-lines/import', {
      method: 'POST',
      body,
      auth: true
    })
  },
  scoreLineCrawl(body: { province: string; years?: number[] }) {
    return request<AdminCrawlResult>('/api/admin/score-lines/crawl', {
      method: 'POST',
      body,
      auth: true
    })
  },
  scoreLineCrawlQueue() {
    return request<AdminCrawlQueueResponse>('/api/admin/score-lines/crawl/queue', { auth: true })
  },
  scoreLineCrawlRun(id: string) {
    return request<AdminCrawlRunDetail>(
      `/api/admin/score-lines/crawl/runs/${encodeURIComponent(id)}`,
      { auth: true }
    )
  },
  cancelScoreLineCrawl(id: string) {
    return request<{ ok: true }>(
      `/api/admin/score-lines/crawl/queue/${encodeURIComponent(id)}`,
      { method: 'DELETE', auth: true }
    )
  },
  scoreLineReview(params: {
    kind?: 'batch' | 'program'
    province?: string
    schoolId?: string
    year?: number
    page?: number
  } = {}) {
    return request<AdminReviewResponse>(
      `/api/admin/score-lines/review${query({
        kind: params.kind,
        province: params.province,
        schoolId: params.schoolId,
        year: params.year ? String(params.year) : undefined,
        page: params.page ? String(params.page) : undefined
      })}`,
      { auth: true }
    )
  },
  scoreLineReviewCount(params: { province?: string; schoolId?: string; year?: number } = {}) {
    return request<{ batches: number; programs: number; total: number }>(
      `/api/admin/score-lines/review/count${query({
        province: params.province,
        schoolId: params.schoolId,
        year: params.year ? String(params.year) : undefined
      })}`,
      { auth: true }
    )
  },
  scoreLineReviewAction(body: AdminReviewActionInput) {
    return request<{ ok: true; updated: number }>('/api/admin/score-lines/review', {
      method: 'POST',
      body,
      auth: true
    })
  },
  scoreLineSources(params: { exam?: string; province?: string; tier?: string } = {}) {
    return request<{ sources: ScoreLineSource[] }>(
      `/api/admin/score-lines/sources${query({
        exam: params.exam,
        province: params.province,
        tier: params.tier
      })}`,
      { auth: true }
    )
  },
  saveScoreLineSource(body: AdminScoreLineSourceInput) {
    return request<{ source: ScoreLineSource }>('/api/admin/score-lines/sources', {
      method: 'POST',
      body,
      auth: true
    })
  },
  createInvites(body: {
    names?: string[]
    name?: string
    note?: string
    channel?: string
    expiresAt?: string
  }) {
    return request<{ invites: { id: string; name: string; token: string; path: string }[] }>(
      '/api/admin/invites',
      { method: 'POST', body, auth: true }
    )
  },
  deleteInvite(id: string) {
    return request<{ ok: true }>(`/api/admin/invites/${id}`, { method: 'DELETE', auth: true })
  },
  deleteSubmission(id: string) {
    return request<{ ok: true }>(`/api/admin/submissions/${id}`, {
      method: 'DELETE',
      auth: true
    })
  },
  batchDeleteRoster(inviteIds: string[]) {
    return request<{ ok: true; deleted: number }>('/api/admin/roster/batch-delete', {
      method: 'POST',
      body: { inviteIds },
      auth: true
    })
  },
  rotateInvite(id: string) {
    return request<{ token: string; path: string }>(`/api/admin/invites/${id}/rotate`, {
      method: 'POST',
      auth: true
    })
  },
  submissions(params: { q?: string; contactStatus?: string } = {}) {
    return request<{ submissions: AdminSubmissionSummary[] }>(
      `/api/admin/submissions${query({
        q: params.q,
        contactStatus: params.contactStatus
      })}`,
      { auth: true }
    )
  },
  roster(params: { q?: string; category?: string; week?: string } = {}) {
    return request<{
      roster: AdminRosterRow[]
      counts: Record<string, number>
      weeks: AdminRosterWeek[]
      currentWeek: string
    }>(
      `/api/admin/roster${query({
        q: params.q,
        category: params.category,
        week: params.week
      })}`,
      { auth: true }
    )
  },
  submission(id: string) {
    return request<AdminSubmissionDetail>(`/api/admin/submissions/${id}`, { auth: true })
  },
  patchSubmission(
    id: string,
    body: {
      contactStatus?: string
      adminNotes?: string
      overrides?: { diagnosis?: string; closing?: string }
    }
  ) {
    return request<{ ok: true }>(`/api/admin/submissions/${id}`, {
      method: 'PATCH',
      body,
      auth: true
    })
  },
  survey() {
    return request<{ survey: Survey; versions: number }>('/api/admin/survey', { auth: true })
  },
  saveSurvey(survey: Survey) {
    return request<{ survey: Survey }>('/api/admin/survey', {
      method: 'PUT',
      body: { survey },
      auth: true
    })
  },
  template() {
    return request<{ template: ReportTemplate }>('/api/admin/template', { auth: true })
  },
  saveTemplate(template: ReportTemplate) {
    return request<{ template: ReportTemplate }>('/api/admin/template', {
      method: 'PUT',
      body: { template },
      auth: true
    })
  },
  skill() {
    return request<{
      defaultSkill: string
      templates: AdminReportSkillTemplate[]
      activeId: string
      reportMode?: string
      ai: { configured: boolean; searchConfigured: boolean; model: string }
    }>('/api/admin/skill', { auth: true })
  },
  createSkillTemplate(body: { name: string; skill?: string }) {
    return request<{ template: AdminReportSkillTemplate }>('/api/admin/skill/templates', {
      method: 'POST',
      body,
      auth: true
    })
  },
  updateSkillTemplate(id: string, body: { name: string; skill: string }) {
    return request<{ template: AdminReportSkillTemplate }>(`/api/admin/skill/templates/${id}`, {
      method: 'PUT',
      body,
      auth: true
    })
  },
  deleteSkillTemplate(id: string) {
    return request<{ ok: true }>(`/api/admin/skill/templates/${id}`, {
      method: 'DELETE',
      auth: true
    })
  },
  activateSkillTemplate(id: string) {
    return request<{ activeId: string }>('/api/admin/skill/active', {
      method: 'PUT',
      body: { id },
      auth: true
    })
  },
  regenerateReport(id: string) {
    return request<{ ok: true }>(`/api/admin/submissions/${id}/report`, {
      method: 'POST',
      auth: true
    })
  },
  previewReport(body: { template?: ReportTemplate; survey?: Survey }) {
    return request<ReportPayload>('/api/admin/report/preview', {
      method: 'POST',
      body,
      auth: true
    })
  },
  async exportSubmissions(params: { q?: string; week?: string; category?: string } = {}) {
    const response = await fetch(
      `/api/admin/submissions/export.csv${query({
        q: params.q,
        week: params.week,
        category: params.category
      })}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` }
      }
    )
    if (!response.ok) throw new ApiError('导出失败', response.status)
    return response.blob()
  }
}
