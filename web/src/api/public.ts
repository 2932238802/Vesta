import type { InvitePayload, ReportResponse } from './types'
import { request } from './request'

export const publicApi = {
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
  retryReport(slug: string) {
    return request<{ ok: true; status: string }>(
      `/api/report/${encodeURIComponent(slug)}/retry`,
      { method: 'POST' }
    )
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
