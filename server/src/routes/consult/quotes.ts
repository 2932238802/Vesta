import { Router } from 'express'
import type { Response } from 'express'
import {
  CONSULT_QUOTE_MAX_CATEGORY_NAME,
  CONSULT_QUOTE_MAX_SOURCE,
  CONSULT_QUOTE_MAX_TEXT,
  type ConsultQuote,
  type ConsultQuoteCategory
} from '../../../../shared/src/consult-quote'
import { db, newId, now } from '../../db'
import { log } from '../../log'

export const quotesRouter = Router()

interface QuoteRow {
  id: string
  category_id: string
  no: string
  text: string
  source: string
  pinned: number
  sort_order: number
  created_at: string
  updated_at: string
}

interface CategoryRow {
  id: string
  name: string
  sort_order: number
  count?: number
}

class QuoteHttpError extends Error {
  status: number
  extra: Record<string, unknown>

  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

function fail(status: number, message: string, extra: Record<string, unknown> = {}): never {
  throw new QuoteHttpError(status, message, extra)
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof QuoteHttpError) {
    res.status(error.status).json({ error: error.message, ...error.extra })
    return
  }
  if (
    error instanceof Error &&
    /UNIQUE constraint failed: consult_quote_categories\.name/.test(error.message)
  ) {
    res.status(409).json({ error: '分类重名' })
    return
  }
  log.error('consult.quote_failed', { reqId: res.locals.reqId, err: error })
  res.status(500).json({ error: '服务器出了点问题，请稍后再试' })
}

function rowToQuote(row: QuoteRow): ConsultQuote {
  return {
    id: row.id,
    categoryId: row.category_id,
    no: row.no,
    text: row.text,
    source: row.source,
    pinned: Boolean(row.pinned),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToCategory(row: CategoryRow): ConsultQuoteCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    count: Number(row.count ?? 0)
  }
}

function readCategories(): ConsultQuoteCategory[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.sort_order, COUNT(q.id) AS count
         FROM consult_quote_categories c
         LEFT JOIN consult_quotes q ON q.category_id = c.id
        GROUP BY c.id
        ORDER BY c.sort_order, c.id`
    )
    .all() as unknown as CategoryRow[]
  return rows.map(rowToCategory)
}

function readQuotes(): ConsultQuote[] {
  const rows = db
    .prepare(
      `SELECT * FROM consult_quotes
        ORDER BY pinned DESC, sort_order, created_at, id`
    )
    .all() as unknown as QuoteRow[]
  return rows.map(rowToQuote)
}

function readQuote(id: string): QuoteRow | undefined {
  return db.prepare('SELECT * FROM consult_quotes WHERE id = ?').get(id) as unknown as
    | QuoteRow
    | undefined
}

function readCategory(id: string): CategoryRow | undefined {
  return db.prepare('SELECT * FROM consult_quote_categories WHERE id = ?').get(id) as unknown as
    | CategoryRow
    | undefined
}

function readCategoryWithCount(id: string): ConsultQuoteCategory {
  const row = db
    .prepare(
      `SELECT c.id, c.name, c.sort_order, COUNT(q.id) AS count
         FROM consult_quote_categories c
         LEFT JOIN consult_quotes q ON q.category_id = c.id
        WHERE c.id = ?
        GROUP BY c.id`
    )
    .get(id) as unknown as CategoryRow | undefined
  return rowToCategory(row ?? { id, name: '', sort_order: 0, count: 0 })
}

function requireCategoryId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) fail(400, '请选择分类')
  const id = value.trim()
  if (!readCategory(id)) fail(400, '分类不存在')
  return id
}

function requireText(value: unknown): string {
  if (typeof value !== 'string') fail(400, '正文不能为空')
  const text = value.trim()
  if (!text) fail(400, '正文不能为空')
  if (text.length > CONSULT_QUOTE_MAX_TEXT) {
    fail(400, `正文最多 ${CONSULT_QUOTE_MAX_TEXT} 字`)
  }
  return text
}

function normalizeSource(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') fail(400, '出处格式不对')
  const source = value.trim()
  if (source.length > CONSULT_QUOTE_MAX_SOURCE) {
    fail(400, `出处最多 ${CONSULT_QUOTE_MAX_SOURCE} 字`)
  }
  return source
}

function normalizePinned(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') fail(400, '置顶参数不对')
  return value
}

function requireCategoryName(value: unknown): string {
  if (typeof value !== 'string') fail(400, '分类名不能为空')
  const name = value.trim()
  if (!name) fail(400, '分类名不能为空')
  if (name.length > CONSULT_QUOTE_MAX_CATEGORY_NAME) {
    fail(400, `分类名最多 ${CONSULT_QUOTE_MAX_CATEGORY_NAME} 字`)
  }
  return name
}

function ensureCategoryNameFree(name: string, exceptId = ''): void {
  const row = db
    .prepare('SELECT id FROM consult_quote_categories WHERE name = ? AND id <> ?')
    .get(name, exceptId) as unknown as { id: string } | undefined
  if (row) fail(409, '分类重名')
}

function nextQuoteSortOrder(categoryId: string): number {
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(sort_order), 0) AS max FROM consult_quotes WHERE category_id = ?'
    )
    .get(categoryId) as unknown as { max: number }
  return Number(row.max) + 1
}

function nextCategorySortOrder(): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max FROM consult_quote_categories')
    .get() as unknown as { max: number }
  return Number(row.max) + 1
}

quotesRouter.get('/quotes', (_req, res) => {
  res.json({ categories: readCategories(), quotes: readQuotes() })
})

quotesRouter.post('/quotes', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const categoryId = requireCategoryId(body.categoryId)
    const text = requireText(body.text)
    const source = normalizeSource(body.source)
    const pinned = normalizePinned(body.pinned, false)
    const timestamp = now()
    const id = newId('q')
    db.prepare(
      `INSERT INTO consult_quotes
        (id, category_id, no, text, source, pinned, sort_order, created_at, updated_at)
       VALUES (?, ?, '', ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      categoryId,
      text,
      source,
      pinned ? 1 : 0,
      nextQuoteSortOrder(categoryId),
      timestamp,
      timestamp
    )
    log.info('consult.quote_created', {
      reqId: res.locals.reqId,
      id,
      categoryId,
      pinned
    })
    res.status(201).json({ item: rowToQuote(readQuote(id)!) })
  } catch (error) {
    sendError(res, error)
  }
})

quotesRouter.patch('/quotes/:id', (req, res) => {
  try {
    const id = req.params.id
    const current = readQuote(id)
    if (!current) fail(404, '金句不存在')
    const body = (req.body ?? {}) as Record<string, unknown>
    const categoryId =
      body.categoryId === undefined ? current.category_id : requireCategoryId(body.categoryId)
    const text = body.text === undefined ? current.text : requireText(body.text)
    const source = body.source === undefined ? current.source : normalizeSource(body.source)
    const pinned = normalizePinned(body.pinned, Boolean(current.pinned))
    const sortOrder =
      categoryId === current.category_id ? current.sort_order : nextQuoteSortOrder(categoryId)
    db.prepare(
      `UPDATE consult_quotes SET
        category_id = ?, text = ?, source = ?, pinned = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`
    ).run(categoryId, text, source, pinned ? 1 : 0, sortOrder, now(), id)
    log.info('consult.quote_updated', {
      reqId: res.locals.reqId,
      id,
      categoryId,
      pinned
    })
    res.json({ item: rowToQuote(readQuote(id)!) })
  } catch (error) {
    sendError(res, error)
  }
})

quotesRouter.delete('/quotes/:id', (req, res) => {
  try {
    const id = req.params.id
    const current = readQuote(id)
    if (!current) fail(404, '金句不存在')
    db.prepare('DELETE FROM consult_quotes WHERE id = ?').run(id)
    log.info('consult.quote_deleted', {
      reqId: res.locals.reqId,
      id,
      categoryId: current.category_id
    })
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
})

quotesRouter.post('/quote-categories', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const name = requireCategoryName(body.name)
    ensureCategoryNameFree(name)
    const timestamp = now()
    const id = newId('qc')
    db.prepare(
      `INSERT INTO consult_quote_categories (id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, nextCategorySortOrder(), timestamp, timestamp)
    log.info('consult.quote_category_created', { reqId: res.locals.reqId, id })
    res.status(201).json({ category: readCategoryWithCount(id) })
  } catch (error) {
    sendError(res, error)
  }
})

quotesRouter.put('/quote-categories/order', (req, res) => {
  try {
    const ids = (req.body ?? {}).ids
    const existing = db
      .prepare('SELECT id FROM consult_quote_categories')
      .all() as unknown as { id: string }[]
    const existingIds = new Set(existing.map((row) => row.id))
    if (
      !Array.isArray(ids) ||
      ids.length !== existingIds.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => typeof id === 'string' && existingIds.has(id))
    ) {
      fail(400, '分类顺序不是现有分类的完整排列')
    }
    const timestamp = now()
    const update = db.prepare(
      'UPDATE consult_quote_categories SET sort_order = ?, updated_at = ? WHERE id = ?'
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
    log.info('consult.quote_category_reordered', {
      reqId: res.locals.reqId,
      count: ids.length
    })
    res.json({ categories: readCategories() })
  } catch (error) {
    sendError(res, error)
  }
})

quotesRouter.patch('/quote-categories/:id', (req, res) => {
  try {
    const id = req.params.id
    if (!readCategory(id)) fail(404, '分类不存在')
    const body = (req.body ?? {}) as Record<string, unknown>
    const name = requireCategoryName(body.name)
    ensureCategoryNameFree(name, id)
    db.prepare('UPDATE consult_quote_categories SET name = ?, updated_at = ? WHERE id = ?').run(
      name,
      now(),
      id
    )
    log.info('consult.quote_category_updated', { reqId: res.locals.reqId, id })
    res.json({ category: readCategoryWithCount(id) })
  } catch (error) {
    sendError(res, error)
  }
})

quotesRouter.delete('/quote-categories/:id', (req, res) => {
  try {
    const id = req.params.id
    if (!readCategory(id)) fail(404, '分类不存在')
    const countRow = db
      .prepare('SELECT COUNT(*) AS count FROM consult_quotes WHERE category_id = ?')
      .get(id) as unknown as { count: number }
    const count = Number(countRow.count)
    if (count > 0) fail(409, '分类下还有金句', { count })
    db.prepare('DELETE FROM consult_quote_categories WHERE id = ?').run(id)
    log.info('consult.quote_category_deleted', { reqId: res.locals.reqId, id })
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
})
