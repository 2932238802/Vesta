import type { ReportPayload, ReportResponse, ReportTemplate, Survey } from '@shared/types'
import type {
  ConsultBeat,
  ConsultContext,
  ConsultDecisionPath,
  ConsultForest,
  ConsultOutcome,
  ConsultRun,
  ConsultRunMode,
  ConsultScoringConfig,
  ConsultTemplate,
  ConsultTree
} from '@shared/consult'
import type { ConsultPurposePayload } from '@shared/consult-purpose'
import type {
  ConsultCollectionInput,
  ConsultCollectionItem
} from '@shared/consult-collection'

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

const TOKEN_KEY = 'vesta.admin.token'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  details?: Record<string, unknown>
  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.details = details
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  timeout?: number
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth) headers.Authorization = `Bearer ${getToken()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 20_000)
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError('请求超时，请刷新页面后重试', 0)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }

  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && options.auth) {
      clearToken()
      if (!location.pathname.startsWith('/admin/login')) {
        location.href = '/admin/login?expired=1'
      }
    }
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : '请求失败'
    throw new ApiError(
      message,
      response.status,
      data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined
    )
  }

  return data as T
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export interface InvitePayload {
  name: string
  note: string
  survey: Survey
  submitted: boolean
  reportSlug: string | null
}

export const api = {
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
  invites(params: { q?: string; status?: string; from?: string; to?: string } = {}) {
    return request<{ invites: AdminInvite[] }>(
      `/api/admin/invites${query({
        q: params.q,
        status: params.status,
        from: params.from,
        to: params.to
      })}`,
      { auth: true }
    )
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
  roster(params: { q?: string; category?: string; dates?: string[] } = {}) {
    return request<{
      roster: AdminRosterRow[]
      counts: Record<string, number>
      dates: AdminRosterDateOption[]
    }>(
      `/api/admin/roster${query({
        q: params.q,
        category: params.category,
        dates: params.dates?.length ? params.dates.join(',') : undefined
      })}`,
      { auth: true }
    )
  },
  appointments(params: { q?: string; contactStatus?: string } = {}) {
    return request<{ appointments: AdminAppointment[] }>(
      `/api/admin/appointments${query({
        q: params.q,
        contactStatus: params.contactStatus
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
  consult() {
    return request<{
      forest: ConsultForest
      tree: ConsultTree
      trees: ConsultTree[]
      templates: ConsultTemplate[]
      activeTemplateId: string
      purposeTemplates: Array<{
        id: string
        name: string
        season: string
        description: string
        stats: ConsultPurposePayload['templates'][number]['stats']
      }>
      activePurposeTemplateId: string
      scoring: ConsultScoringConfig
      ai: { configured: boolean; model: string }
      stats: { nodes: number; runs: number }
    }>('/api/admin/consult', { auth: true })
  },
  consultPurposes() {
    return request<ConsultPurposePayload>('/api/admin/consult/purposes', { auth: true })
  },
  consultCollections() {
    return request<{ items: ConsultCollectionItem[] }>('/api/admin/consult/collections', {
      auth: true
    })
  },
  consultCollection(id: string) {
    return request<{ item: ConsultCollectionItem }>(
      `/api/admin/consult/collections/${encodeURIComponent(id)}`,
      { auth: true }
    )
  },
  createConsultCollection(body: ConsultCollectionInput) {
    return request<{ item: ConsultCollectionItem }>('/api/admin/consult/collections', {
      method: 'POST',
      body,
      auth: true
    })
  },
  async importConsultCollectionDocx(file: File) {
    const response = await fetch('/api/admin/consult/collections/import-docx', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'X-File-Name': encodeURIComponent(file.name)
      },
      body: file
    })
    let data: unknown = null
    const text = await response.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: text }
      }
    }
    if (!response.ok) {
      if (response.status === 401) {
        clearToken()
        if (!location.pathname.startsWith('/admin/login')) {
          location.href = '/admin/login?expired=1'
        }
      }
      const message =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error: unknown }).error)
          : '导入失败'
      throw new ApiError(message, response.status)
    }
    return data as { item: ConsultCollectionItem }
  },
  updateConsultCollection(id: string, body: ConsultCollectionInput) {
    return request<{ item: ConsultCollectionItem }>(
      `/api/admin/consult/collections/${encodeURIComponent(id)}`,
      { method: 'PUT', body, auth: true }
    )
  },
  deleteConsultCollection(id: string) {
    return request<{ ok: true }>(`/api/admin/consult/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true
    })
  },
  saveConsultTree(tree: ConsultTree) {
    return request<{ tree: ConsultTree; trees: ConsultTree[]; forest: ConsultForest }>('/api/admin/consult/tree', {
      method: 'PUT',
      body: { tree },
      auth: true
    })
  },
  createConsultTree(name: string) {
    return request<{ tree: ConsultTree; trees: ConsultTree[]; forest: ConsultForest }>('/api/admin/consult/trees', {
      method: 'POST',
      body: { name },
      auth: true
    })
  },
  renameConsultTree(id: string, name: string) {
    return request<{ tree: ConsultTree; trees: ConsultTree[]; forest: ConsultForest }>(
      `/api/admin/consult/trees/${encodeURIComponent(id)}`,
      { method: 'PUT', body: { name }, auth: true }
    )
  },
  activateConsultTree(id: string) {
    return request<{ tree: ConsultTree; trees: ConsultTree[]; forest: ConsultForest }>(
      `/api/admin/consult/trees/${encodeURIComponent(id)}/active`,
      { method: 'PUT', auth: true }
    )
  },
  deleteConsultTree(id: string) {
    return request<{ tree: ConsultTree; trees: ConsultTree[]; forest: ConsultForest }>(
      `/api/admin/consult/trees/${encodeURIComponent(id)}`,
      { method: 'DELETE', auth: true }
    )
  },
  saveConsultScoring(scoring: ConsultScoringConfig) {
    return request<{ scoring: ConsultScoringConfig }>('/api/admin/consult/scoring', {
      method: 'PUT',
      body: scoring,
      auth: true
    })
  },
  previewConsult(context: ConsultContext) {
    return request<{ decision: ConsultDecisionPath }>('/api/admin/consult/preview', {
      method: 'POST',
      body: { context },
      auth: true
    })
  },
  importConsult(body: { text: string; treeId?: string; newTreeName?: string }) {
    return request<{
      tree: ConsultTree
      trees: ConsultTree[]
      forest: ConsultForest
      imported: number
      answers: number
    }>('/api/admin/consult/import', {
      method: 'POST',
      body,
      auth: true
    })
  },
  decayConsult(factor: number) {
    return request<{
      tree: ConsultTree
      trees: ConsultTree[]
      forest: ConsultForest
      factor: number
    }>('/api/admin/consult/decay', {
      method: 'POST',
      body: { factor },
      auth: true
    })
  },
  createConsultTemplate(body: { name: string; sourceId?: string }) {
    return request<{ template: ConsultTemplate }>('/api/admin/consult/templates', {
      method: 'POST',
      body,
      auth: true
    })
  },
  updateConsultTemplate(id: string, template: ConsultTemplate) {
    return request<{ template: ConsultTemplate }>(`/api/admin/consult/templates/${id}`, {
      method: 'PUT',
      body: { template },
      auth: true
    })
  },
  deleteConsultTemplate(id: string) {
    return request<{ ok: true }>(`/api/admin/consult/templates/${id}`, {
      method: 'DELETE',
      auth: true
    })
  },
  activateConsultTemplate(id: string) {
    return request<{ activeTemplateId: string }>('/api/admin/consult/templates/active', {
      method: 'PUT',
      body: { id },
      auth: true
    })
  },
  consultRuns() {
    return request<{ runs: ConsultRun[] }>('/api/admin/consult/runs', { auth: true })
  },
  consultRun(id: string) {
    return request<{ run: ConsultRun }>(`/api/admin/consult/runs/${id}`, { auth: true })
  },
  async exportConsultRun(id: string, format: 'docx' | 'html' | 'txt') {
    const response = await fetch(
      `/api/admin/consult/runs/${encodeURIComponent(id)}/export/${format}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    if (!response.ok) {
      let message = '导出失败'
      try {
        const data = (await response.json()) as { error?: string }
        if (data.error) message = data.error
      } catch {
        // 响应不是 JSON 时保留默认提示。
      }
      throw new ApiError(message, response.status)
    }
    return response.blob()
  },
  retryConsultRun(id: string) {
    return request<{ run: ConsultRun }>(`/api/admin/consult/runs/${id}/retry`, {
      method: 'POST',
      auth: true
    })
  },
  saveConsultSection(
    runId: string,
    seq: number,
    body: {
      title?: string
      goal?: string
      content?: string
      notes?: string
      selectedOptionId?: string
      purposeKeys?: string[]
      beats?: ConsultBeat[]
    }
  ) {
    return request<{ run: ConsultRun }>(
      `/api/admin/consult/runs/${runId}/sections/${seq}`,
      { method: 'PATCH', body, auth: true }
    )
  },
  rewriteConsultSectionBeats(runId: string, seq: number, optionId: string) {
    return request<{ run: ConsultRun }>(
      `/api/admin/consult/runs/${runId}/sections/${seq}/beats`,
      { method: 'POST', body: { optionId }, auth: true, timeout: 120_000 }
    )
  },
  regenerateConsultSection(runId: string, seq: number) {
    return request<{ run: ConsultRun }>(
      `/api/admin/consult/runs/${runId}/sections/${seq}/regenerate`,
      { method: 'POST', auth: true, timeout: 120_000 }
    )
  },
  addConsultSection(runId: string, body: { afterSeq?: number; title?: string; goal?: string }) {
    return request<{ run: ConsultRun }>(`/api/admin/consult/runs/${runId}/sections`, {
      method: 'POST',
      body,
      auth: true
    })
  },
  deleteConsultSection(runId: string, seq: number) {
    return request<{ run: ConsultRun }>(
      `/api/admin/consult/runs/${runId}/sections/${seq}`,
      { method: 'DELETE', auth: true }
    )
  },
  generateConsult(body: {
    context: ConsultContext
    templateId?: string
    targetLength?: number
    mode?: ConsultRunMode
    purposeTemplateId?: string
  }) {
    return request<{
      run: ConsultRun | null
      purposeTemplate?: string
      tree?: ConsultTree
      trees?: ConsultTree[]
      forest?: ConsultForest
    }>('/api/admin/consult/runs', {
      method: 'POST',
      body,
      auth: true
    })
  },
  setConsultOutcome(
    id: string,
    body: { outcome: Exclude<ConsultOutcome, ''>; nodeId?: string }
  ) {
    return request<{
      ok: true
      run?: ConsultRun
      tree?: ConsultTree
      trees?: ConsultTree[]
      forest?: ConsultForest
      outcome: ConsultOutcome
      outcomeNodeId: string
    }>(`/api/admin/consult/runs/${id}/outcome`, {
      method: 'PATCH',
      body,
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
  async exportSubmissions(q: string) {
    const response = await fetch(
      `/api/admin/submissions/export.csv${query({ q })}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    if (!response.ok) throw new ApiError('导出失败', response.status)
    return response.blob()
  },
  getInvite(token: string) {
    return request<InvitePayload>(`/api/invite/${encodeURIComponent(token)}`)
  },
  submit(token: string, answers: Record<string, unknown>, timing: Record<string, number>) {
    return request<{ slug: string }>(`/api/invite/${encodeURIComponent(token)}/submit`, {
      method: 'POST',
      body: { answers, timing }
    })
  },
  getReport(slug: string, poll = false, preview = false) {
    const params = new URLSearchParams()
    if (poll) params.set('poll', '1')
    if (preview) params.set('preview', '1')
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<ReportResponse>(`/api/report/${encodeURIComponent(slug)}${suffix}`)
  },
  claim(slug: string, body: { wechat: string; slots: string[]; agree: boolean }) {
    return request<{ ok: true }>(`/api/report/${encodeURIComponent(slug)}/claim`, {
      method: 'POST',
      body
    })
  }
}

export function track(token: string, type: string, payload: Record<string, unknown> = {}) {
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, events: [{ type, payload }] }),
    keepalive: true
  }).catch(() => undefined)
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
  inviteCreatedAt: string
  openedAt: string | null
  submittedAt: string | null
  expiresAt: string | null
  total: number | null
  tier: string | null
  claimed: boolean
  slots: string[]
  contactStatus: string | null
  reportSlug: string | null
  reportPath: string | null
  detailPath: string | null
}

export interface AdminRosterDateOption {
  date: string
  count: number
}

export interface AdminReportSkillTemplate {
  id: string
  name: string
  skill: string
  createdAt: string
  updatedAt: string
}

export interface AdminAppointment {
  id: string
  name: string
  note: string
  channel: string
  wechat: string
  slots: string[]
  contactStatus: string
  adminNotes: string
  claimedAt: string | null
  createdAt: string
  reportSlug: string
  total: number
  tier: string
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
