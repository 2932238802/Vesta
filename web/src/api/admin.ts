import type {
  AdminReportSkillTemplate,
  AdminRosterRow,
  AdminRosterWeek,
  AdminSubmissionDetail,
  AdminSubmissionSummary,
  Overview
} from './types'
import type { ReportPayload, ReportTemplate, Survey } from './types'
import type { ResumeImageSummary } from './types'
import {
  ApiError,
  blobRequest,
  getToken,
  query,
  request,
  uploadResumeRequest
} from './request'

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
  resumeImages() {
    return request<{ items: ResumeImageSummary[] }>('/api/admin/resumes', { auth: true })
  },
  resumeImageBlob(id: string) {
    return blobRequest(`/api/admin/resumes/${encodeURIComponent(id)}/file`)
  },
  downloadResumeImage(id: string) {
    return blobRequest(`/api/admin/resumes/${encodeURIComponent(id)}/download`)
  },
  uploadResumeImage(major: string, file: File) {
    return uploadResumeRequest<{ item: ResumeImageSummary }>(
      `/api/admin/resumes${query({ major })}`,
      file
    )
  },
  logout() {
    return request<{ ok: true }>('/api/admin/logout', { method: 'POST', auth: true })
  },
  overview() {
    return request<Overview>('/api/admin/overview', { auth: true })
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
