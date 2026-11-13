import type {
  ConsultBeat,
  ConsultCollectionInput,
  ConsultCollectionItem,
  ConsultContext,
  ConsultForest,
  ConsultOutcome,
  ConsultPurposePayload,
  ConsultRun,
  ConsultRunMode,
  ConsultScoringConfig,
  ConsultTemplate,
  ConsultTree
} from './types'
import { ApiError, clearToken, getToken, request } from './request'

export const consultApi = {
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
  }
}
