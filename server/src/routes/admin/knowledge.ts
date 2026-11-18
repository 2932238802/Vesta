import { Router } from 'express'
import type { Response } from 'express'
import {
  KNOWLEDGE_ARTICLE_BODY_MAX,
  KNOWLEDGE_ARTICLE_TITLE_MAX,
  KNOWLEDGE_MAJOR_NAME_MAX,
  type KnowledgeArticle,
  type KnowledgeArticleSummary,
  type KnowledgeMajor
} from '../../../../shared/src/knowledge'
import { db, newId, now } from '../../db'
import { log } from '../../log'

export const knowledgeRouter = Router()

interface MajorRow {
  id: string
  name: string
  sort_order: number
  count?: number
}

interface ArticleSummaryRow {
  id: string
  major_id: string
  title: string
  sort_order: number
  created_at: string
  updated_at: string
}

interface ArticleRow extends ArticleSummaryRow {
  body: string
}

class KnowledgeHttpError extends Error {
  status: number
  extra: Record<string, unknown>

  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

function fail(status: number, message: string, extra: Record<string, unknown> = {}): never {
  throw new KnowledgeHttpError(status, message, extra)
}

function sendError(res: Response, error: unknown, failureEvent: string): void {
  if (error instanceof KnowledgeHttpError) {
    res.status(error.status).json({ error: error.message, ...error.extra })
    return
  }
  if (
    error instanceof Error &&
    /UNIQUE constraint failed: knowledge_majors\.name/.test(error.message)
  ) {
    res.status(409).json({ error: '专业名重复' })
    return
  }
  log.error(failureEvent, { reqId: res.locals.reqId, err: error })
  res.status(500).json({ error: '服务器出了点问题，请稍后再试' })
}

function rowToMajor(row: MajorRow): KnowledgeMajor {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    count: Number(row.count ?? 0)
  }
}

function rowToSummary(row: ArticleSummaryRow): KnowledgeArticleSummary {
  return {
    id: row.id,
    majorId: row.major_id,
    title: row.title,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToArticle(row: ArticleRow): KnowledgeArticle {
  return { ...rowToSummary(row), body: row.body }
}

function readMajors(): KnowledgeMajor[] {
  const rows = db
    .prepare(
      `SELECT m.id, m.name, m.sort_order, COUNT(a.id) AS count
         FROM knowledge_majors m
         LEFT JOIN knowledge_articles a ON a.major_id = m.id
        GROUP BY m.id
        ORDER BY m.sort_order, m.id`
    )
    .all() as unknown as MajorRow[]
  return rows.map(rowToMajor)
}

function readMajor(id: string): MajorRow | undefined {
  return db.prepare('SELECT * FROM knowledge_majors WHERE id = ?').get(id) as unknown as
    | MajorRow
    | undefined
}

function readMajorWithCount(id: string): KnowledgeMajor {
  const row = db
    .prepare(
      `SELECT m.id, m.name, m.sort_order, COUNT(a.id) AS count
         FROM knowledge_majors m
         LEFT JOIN knowledge_articles a ON a.major_id = m.id
        WHERE m.id = ?
        GROUP BY m.id`
    )
    .get(id) as unknown as MajorRow | undefined
  return rowToMajor(row ?? { id, name: '', sort_order: 0, count: 0 })
}

function readArticles(): KnowledgeArticleSummary[] {
  const rows = db
    .prepare(
      `SELECT id, major_id, title, sort_order, created_at, updated_at
         FROM knowledge_articles
        ORDER BY major_id, sort_order, created_at, id`
    )
    .all() as unknown as ArticleSummaryRow[]
  return rows.map(rowToSummary)
}

function readArticle(id: string): ArticleRow | undefined {
  return db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(id) as unknown as
    | ArticleRow
    | undefined
}

function requireMajorName(value: unknown): string {
  if (typeof value !== 'string') fail(400, '专业名不能为空')
  const name = value.trim()
  if (!name) fail(400, '专业名不能为空')
  if (name.length > KNOWLEDGE_MAJOR_NAME_MAX) {
    fail(400, `专业名最多 ${KNOWLEDGE_MAJOR_NAME_MAX} 字`)
  }
  return name
}

function requireMajorId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) fail(400, '请选择专业')
  const id = value.trim()
  if (!readMajor(id)) fail(400, '专业不存在')
  return id
}

function requireArticleTitle(value: unknown): string {
  if (typeof value !== 'string') fail(400, '标题不能为空')
  const title = value.trim()
  if (!title) fail(400, '标题不能为空')
  if (title.length > KNOWLEDGE_ARTICLE_TITLE_MAX) {
    fail(400, `标题最多 ${KNOWLEDGE_ARTICLE_TITLE_MAX} 字`)
  }
  return title
}

function requireArticleBody(value: unknown): string {
  if (typeof value !== 'string') fail(400, '正文不能为空')
  const body = value.trim()
  if (!body) fail(400, '正文不能为空')
  if (body.length > KNOWLEDGE_ARTICLE_BODY_MAX) {
    fail(400, `正文最多 ${KNOWLEDGE_ARTICLE_BODY_MAX} 字`)
  }
  return body
}

function ensureMajorNameFree(name: string, exceptId = ''): void {
  const row = db
    .prepare('SELECT id FROM knowledge_majors WHERE name = ? AND id <> ?')
    .get(name, exceptId) as unknown as { id: string } | undefined
  if (row) fail(409, '专业名重复')
}

function nextMajorSortOrder(): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max FROM knowledge_majors')
    .get() as unknown as { max: number }
  return Number(row.max) + 1
}

function nextArticleSortOrder(majorId: string): number {
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(sort_order), 0) AS max FROM knowledge_articles WHERE major_id = ?'
    )
    .get(majorId) as unknown as { max: number }
  return Number(row.max) + 1
}

knowledgeRouter.get('/', (_req, res) => {
  res.json({ majors: readMajors(), articles: readArticles() })
})

knowledgeRouter.get('/articles/:id', (req, res) => {
  const row = readArticle(req.params.id)
  if (!row) {
    res.status(404).json({ error: '知识点不存在' })
    return
  }
  res.json({ article: rowToArticle(row) })
})

knowledgeRouter.post('/articles', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const majorId = requireMajorId(body.majorId)
    const title = requireArticleTitle(body.title)
    const articleBody = requireArticleBody(body.body)
    const timestamp = now()
    const id = newId('ka')
    db.prepare(
      `INSERT INTO knowledge_articles
        (id, major_id, title, body, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, majorId, title, articleBody, nextArticleSortOrder(majorId), timestamp, timestamp)
    log.info('knowledge.article_created', { reqId: res.locals.reqId, id, majorId })
    res.status(201).json({ article: rowToArticle(readArticle(id)!) })
  } catch (error) {
    sendError(res, error, 'knowledge.article_failed')
  }
})

knowledgeRouter.patch('/articles/:id', (req, res) => {
  try {
    const id = req.params.id
    const current = readArticle(id)
    if (!current) fail(404, '知识点不存在')
    const body = (req.body ?? {}) as Record<string, unknown>
    const majorId =
      body.majorId === undefined ? current.major_id : requireMajorId(body.majorId)
    const title = body.title === undefined ? current.title : requireArticleTitle(body.title)
    const articleBody = body.body === undefined ? current.body : requireArticleBody(body.body)
    const sortOrder =
      majorId === current.major_id ? current.sort_order : nextArticleSortOrder(majorId)
    db.prepare(
      `UPDATE knowledge_articles SET
        major_id = ?, title = ?, body = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`
    ).run(majorId, title, articleBody, sortOrder, now(), id)
    log.info('knowledge.article_updated', { reqId: res.locals.reqId, id, majorId })
    res.json({ article: rowToArticle(readArticle(id)!) })
  } catch (error) {
    sendError(res, error, 'knowledge.article_failed')
  }
})

knowledgeRouter.delete('/articles/:id', (req, res) => {
  try {
    const id = req.params.id
    const current = readArticle(id)
    if (!current) fail(404, '知识点不存在')
    db.prepare('DELETE FROM knowledge_articles WHERE id = ?').run(id)
    log.info('knowledge.article_deleted', {
      reqId: res.locals.reqId,
      id,
      majorId: current.major_id
    })
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error, 'knowledge.article_failed')
  }
})

knowledgeRouter.post('/majors', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const name = requireMajorName(body.name)
    ensureMajorNameFree(name)
    const timestamp = now()
    const id = newId('km')
    db.prepare(
      `INSERT INTO knowledge_majors (id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, nextMajorSortOrder(), timestamp, timestamp)
    log.info('knowledge.major_created', { reqId: res.locals.reqId, id })
    res.status(201).json({ major: readMajorWithCount(id) })
  } catch (error) {
    sendError(res, error, 'knowledge.major_failed')
  }
})

knowledgeRouter.patch('/majors/:id', (req, res) => {
  try {
    const id = req.params.id
    if (!readMajor(id)) fail(404, '专业不存在')
    const body = (req.body ?? {}) as Record<string, unknown>
    const name = requireMajorName(body.name)
    ensureMajorNameFree(name, id)
    db.prepare('UPDATE knowledge_majors SET name = ?, updated_at = ? WHERE id = ?').run(
      name,
      now(),
      id
    )
    log.info('knowledge.major_updated', { reqId: res.locals.reqId, id })
    res.json({ major: readMajorWithCount(id) })
  } catch (error) {
    sendError(res, error, 'knowledge.major_failed')
  }
})

knowledgeRouter.put('/majors/order', (req, res) => {
  try {
    const ids = (req.body ?? {}).ids
    const existing = db
      .prepare('SELECT id FROM knowledge_majors')
      .all() as unknown as { id: string }[]
    const existingIds = new Set(existing.map((row) => row.id))
    if (
      !Array.isArray(ids) ||
      ids.length !== existingIds.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => typeof id === 'string' && existingIds.has(id))
    ) {
      fail(400, '专业顺序不是现有专业的完整排列')
    }
    const timestamp = now()
    const update = db.prepare(
      'UPDATE knowledge_majors SET sort_order = ?, updated_at = ? WHERE id = ?'
    )
    db.exec('BEGIN')
    try {
      ids.forEach((id, index) => update.run(index + 1, timestamp, id))
      db.exec('COMMIT')
    } catch (error) {
      try {
        db.exec('ROLLBACK')
      } catch {
        // 事务可能已被 SQLite 自动回滚，保留原始错误。
      }
      throw error
    }
    log.info('knowledge.major_reordered', {
      reqId: res.locals.reqId,
      count: ids.length
    })
    res.json({ majors: readMajors() })
  } catch (error) {
    sendError(res, error, 'knowledge.major_failed')
  }
})

knowledgeRouter.delete('/majors/:id', (req, res) => {
  try {
    const id = req.params.id
    if (!readMajor(id)) fail(404, '专业不存在')
    const countRow = db
      .prepare('SELECT COUNT(*) AS count FROM knowledge_articles WHERE major_id = ?')
      .get(id) as unknown as { count: number }
    const count = Number(countRow.count)
    if (count > 0) fail(409, '专业下还有知识点', { count })
    db.prepare('DELETE FROM knowledge_majors WHERE id = ?').run(id)
    log.info('knowledge.major_deleted', { reqId: res.locals.reqId, id })
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error, 'knowledge.major_failed')
  }
})
