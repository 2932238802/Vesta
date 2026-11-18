import type {
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeArticleSummary,
  KnowledgeArticleUpdateInput,
  KnowledgeMajor
} from './types'
import { request } from './request'

export const knowledgeApi = {
  knowledge() {
    return request<{ majors: KnowledgeMajor[]; articles: KnowledgeArticleSummary[] }>(
      '/api/admin/knowledge',
      { auth: true }
    )
  },
  knowledgeArticle(id: string) {
    return request<{ article: KnowledgeArticle }>(
      `/api/admin/knowledge/articles/${encodeURIComponent(id)}`,
      { auth: true }
    )
  },
  createKnowledgeArticle(body: KnowledgeArticleInput) {
    return request<{ article: KnowledgeArticle }>('/api/admin/knowledge/articles', {
      method: 'POST',
      body,
      auth: true
    })
  },
  updateKnowledgeArticle(id: string, body: KnowledgeArticleUpdateInput) {
    return request<{ article: KnowledgeArticle }>(
      `/api/admin/knowledge/articles/${encodeURIComponent(id)}`,
      { method: 'PATCH', body, auth: true }
    )
  },
  deleteKnowledgeArticle(id: string) {
    return request<{ ok: true }>(
      `/api/admin/knowledge/articles/${encodeURIComponent(id)}`,
      { method: 'DELETE', auth: true }
    )
  },
  createKnowledgeMajor(name: string) {
    return request<{ major: KnowledgeMajor }>('/api/admin/knowledge/majors', {
      method: 'POST',
      body: { name },
      auth: true
    })
  },
  updateKnowledgeMajor(id: string, name: string) {
    return request<{ major: KnowledgeMajor }>(
      `/api/admin/knowledge/majors/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: { name }, auth: true }
    )
  },
  reorderKnowledgeMajors(ids: string[]) {
    return request<{ majors: KnowledgeMajor[] }>('/api/admin/knowledge/majors/order', {
      method: 'PUT',
      body: { ids },
      auth: true
    })
  },
  deleteKnowledgeMajor(id: string) {
    return request<{ ok: true }>(
      `/api/admin/knowledge/majors/${encodeURIComponent(id)}`,
      { method: 'DELETE', auth: true }
    )
  }
}
