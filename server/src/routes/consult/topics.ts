import { Router } from 'express'
import type { Response } from 'express'
import {
  CONSULT_TOPIC_BODY_MAX,
  CONSULT_TOPIC_TITLE_MAX,
  type ConsultTopic,
  type ConsultTopicSummary
} from '../../../../shared/src/consult-topic'
import { db, newId, now } from '../../db'
import { log } from '../../log'

export const topicsRouter = Router()

interface TopicSummaryRow {
  id: string
  title: string
  sort_order: number
  created_at: string
  updated_at: string
}

interface TopicRow extends TopicSummaryRow {
  body: string
}

class TopicHttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function fail(status: number, message: string): never {
  throw new TopicHttpError(status, message)
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof TopicHttpError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  log.error('consult.topic_failed', { reqId: res.locals.reqId, err: error })
  res.status(500).json({ error: '服务器出了点问题，请稍后再试' })
}

function rowToSummary(row: TopicSummaryRow): ConsultTopicSummary {
  return {
    id: row.id,
    title: row.title,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToTopic(row: TopicRow): ConsultTopic {
  return { ...rowToSummary(row), body: row.body }
}

function readTopics(): ConsultTopicSummary[] {
  const rows = db
    .prepare(
      `SELECT id, title, sort_order, created_at, updated_at
         FROM consult_topics
        ORDER BY sort_order, created_at, id`
    )
    .all() as unknown as TopicSummaryRow[]
  return rows.map(rowToSummary)
}

function readTopic(id: string): TopicRow | undefined {
  return db.prepare('SELECT * FROM consult_topics WHERE id = ?').get(id) as unknown as
    | TopicRow
    | undefined
}

function requireTitle(value: unknown): string {
  if (typeof value !== 'string') fail(400, '标题不能为空')
  const title = value.trim()
  if (!title) fail(400, '标题不能为空')
  if (title.length > CONSULT_TOPIC_TITLE_MAX) {
    fail(400, `标题最多 ${CONSULT_TOPIC_TITLE_MAX} 字`)
  }
  return title
}

function requireBody(value: unknown): string {
  if (typeof value !== 'string') fail(400, '正文不能为空')
  const body = value.trim()
  if (!body) fail(400, '正文不能为空')
  if (body.length > CONSULT_TOPIC_BODY_MAX) {
    fail(400, `正文最多 ${CONSULT_TOPIC_BODY_MAX} 字`)
  }
  return body
}

function nextSortOrder(): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max FROM consult_topics')
    .get() as unknown as { max: number }
  return Number(row.max) + 1
}

topicsRouter.get('/topics', (_req, res) => {
  res.json({ topics: readTopics() })
})

topicsRouter.get('/topics/:id', (req, res) => {
  const row = readTopic(req.params.id)
  if (!row) {
    res.status(404).json({ error: '话题不存在' })
    return
  }
  res.json({ topic: rowToTopic(row) })
})

topicsRouter.post('/topics', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const title = requireTitle(body.title)
    const text = requireBody(body.body)
    const timestamp = now()
    const id = newId('ct')
    db.prepare(
      `INSERT INTO consult_topics (id, title, body, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, title, text, nextSortOrder(), timestamp, timestamp)
    log.info('consult.topic_created', { reqId: res.locals.reqId, id })
    res.status(201).json({ topic: rowToTopic(readTopic(id)!) })
  } catch (error) {
    sendError(res, error)
  }
})

topicsRouter.patch('/topics/:id', (req, res) => {
  try {
    const id = req.params.id
    const current = readTopic(id)
    if (!current) fail(404, '话题不存在')
    const body = (req.body ?? {}) as Record<string, unknown>
    const title = body.title === undefined ? current.title : requireTitle(body.title)
    const text = body.body === undefined ? current.body : requireBody(body.body)
    db.prepare(
      'UPDATE consult_topics SET title = ?, body = ?, updated_at = ? WHERE id = ?'
    ).run(title, text, now(), id)
    log.info('consult.topic_updated', { reqId: res.locals.reqId, id })
    res.json({ topic: rowToTopic(readTopic(id)!) })
  } catch (error) {
    sendError(res, error)
  }
})

topicsRouter.delete('/topics/:id', (req, res) => {
  try {
    const id = req.params.id
    if (!readTopic(id)) fail(404, '话题不存在')
    db.prepare('DELETE FROM consult_topics WHERE id = ?').run(id)
    log.info('consult.topic_deleted', { reqId: res.locals.reqId, id })
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
})

topicsRouter.put('/topics/order', (req, res) => {
  try {
    const ids = (req.body ?? {}).ids
    const existing = db
      .prepare('SELECT id FROM consult_topics')
      .all() as unknown as { id: string }[]
    const existingIds = new Set(existing.map((row) => row.id))
    if (
      !Array.isArray(ids) ||
      ids.length !== existingIds.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => typeof id === 'string' && existingIds.has(id))
    ) {
      fail(400, '话题顺序不是现有话题的完整排列')
    }
    const update = db.prepare('UPDATE consult_topics SET sort_order = ? WHERE id = ?')
    db.exec('BEGIN')
    try {
      ids.forEach((id, index) => update.run(index + 1, id))
      db.exec('COMMIT')
    } catch (error) {
      try {
        db.exec('ROLLBACK')
      } catch {
        // 事务可能已被 SQLite 自动回滚，保留原始错误。
      }
      throw error
    }
    log.info('consult.topic_reordered', {
      reqId: res.locals.reqId,
      count: ids.length
    })
    res.json({ topics: readTopics() })
  } catch (error) {
    sendError(res, error)
  }
})
