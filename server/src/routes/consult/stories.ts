import { Router } from 'express'
import type { Response } from 'express'
import {
  CONSULT_STORY_MAX_CATEGORY_NAME,
  CONSULT_STORY_MAX_SOURCE,
  CONSULT_STORY_MAX_TEXT,
  CONSULT_STORY_MAX_TITLE,
  type ConsultStory,
  type ConsultStoryCategory
} from '../../../../shared/src/consult-story'
import { db, newId, now } from '../../db'
import { log } from '../../log'

export const storiesRouter = Router()

interface StoryRow {
  id: string
  category_id: string
  title: string
  text: string
  source: string
  pinned: number
  pinned_at: string
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

class StoryHttpError extends Error {
  status: number
  extra: Record<string, unknown>

  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

function fail(status: number, message: string, extra: Record<string, unknown> = {}): never {
  throw new StoryHttpError(status, message, extra)
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof StoryHttpError) {
    res.status(error.status).json({ error: error.message, ...error.extra })
    return
  }
  if (
    error instanceof Error &&
    /UNIQUE constraint failed: consult_story_categories\.name/.test(error.message)
  ) {
    res.status(409).json({ error: '分类重名' })
    return
  }
  log.error('consult.story_failed', { reqId: res.locals.reqId, err: error })
  res.status(500).json({ error: '服务器出了点问题，请稍后再试' })
}

function rowToStory(row: StoryRow): ConsultStory {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    text: row.text,
    source: row.source,
    pinned: Boolean(row.pinned),
    pinnedAt: row.pinned_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToCategory(row: CategoryRow): ConsultStoryCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    count: Number(row.count ?? 0)
  }
}

function readCategories(): ConsultStoryCategory[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.sort_order, COUNT(s.id) AS count
         FROM consult_story_categories c
         LEFT JOIN consult_stories s ON s.category_id = c.id
        GROUP BY c.id
        ORDER BY c.sort_order, c.id`
    )
    .all() as unknown as CategoryRow[]
  return rows.map(rowToCategory)
}

function readStories(): ConsultStory[] {
  const rows = db
    .prepare(
      `SELECT * FROM consult_stories
        ORDER BY pinned DESC, pinned_at DESC, sort_order, created_at, id`
    )
    .all() as unknown as StoryRow[]
  return rows.map(rowToStory)
}

function readStory(id: string): StoryRow | undefined {
  return db.prepare('SELECT * FROM consult_stories WHERE id = ?').get(id) as unknown as
    | StoryRow
    | undefined
}

function readCategory(id: string): CategoryRow | undefined {
  return db.prepare('SELECT * FROM consult_story_categories WHERE id = ?').get(id) as unknown as
    | CategoryRow
    | undefined
}

function readCategoryWithCount(id: string): ConsultStoryCategory {
  const row = db
    .prepare(
      `SELECT c.id, c.name, c.sort_order, COUNT(s.id) AS count
         FROM consult_story_categories c
         LEFT JOIN consult_stories s ON s.category_id = c.id
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

function requireTitle(value: unknown): string {
  if (typeof value !== 'string') fail(400, '标题不能为空')
  const title = value.trim()
  if (!title) fail(400, '标题不能为空')
  if (title.length > CONSULT_STORY_MAX_TITLE) {
    fail(400, `标题最多 ${CONSULT_STORY_MAX_TITLE} 字`)
  }
  return title
}

function requireText(value: unknown): string {
  if (typeof value !== 'string') fail(400, '正文不能为空')
  const text = value.trim()
  if (!text) fail(400, '正文不能为空')
  if (text.length > CONSULT_STORY_MAX_TEXT) {
    fail(400, `正文最多 ${CONSULT_STORY_MAX_TEXT} 字`)
  }
  return text
}

function normalizeSource(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') fail(400, '出处格式不对')
  const source = value.trim()
  if (source.length > CONSULT_STORY_MAX_SOURCE) {
    fail(400, `出处最多 ${CONSULT_STORY_MAX_SOURCE} 字`)
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
  if (name.length > CONSULT_STORY_MAX_CATEGORY_NAME) {
    fail(400, `分类名最多 ${CONSULT_STORY_MAX_CATEGORY_NAME} 字`)
  }
  return name
}

function ensureCategoryNameFree(name: string, exceptId = ''): void {
  const row = db
    .prepare('SELECT id FROM consult_story_categories WHERE name = ? AND id <> ?')
    .get(name, exceptId) as unknown as { id: string } | undefined
  if (row) fail(409, '分类重名')
}

function nextStorySortOrder(categoryId: string): number {
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(sort_order), 0) AS max FROM consult_stories WHERE category_id = ?'
    )
    .get(categoryId) as unknown as { max: number }
  return Number(row.max) + 1
}

function nextCategorySortOrder(): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max FROM consult_story_categories')
    .get() as unknown as { max: number }
  return Number(row.max) + 1
}

storiesRouter.get('/stories', (_req, res) => {
  res.json({ categories: readCategories(), stories: readStories() })
})

storiesRouter.post('/stories', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const categoryId = requireCategoryId(body.categoryId)
    const title = requireTitle(body.title)
    const text = requireText(body.text)
    const source = normalizeSource(body.source)
    const pinned = normalizePinned(body.pinned, false)
    const timestamp = now()
    const id = newId('s')
    db.prepare(
      `INSERT INTO consult_stories (id, category_id, title, text, source, pinned, pinned_at, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      categoryId,
      title,
      text,
      source,
      pinned ? 1 : 0,
      pinned ? timestamp : '',
      nextStorySortOrder(categoryId),
      timestamp,
      timestamp
    )
    log.info('consult.story_created', {
      reqId: res.locals.reqId,
      id,
      categoryId,
      pinned
    })
    res.status(201).json({ item: rowToStory(readStory(id)!) })
  } catch (error) {
    sendError(res, error)
  }
})

storiesRouter.patch('/stories/:id', (req, res) => {
  try {
    const id = req.params.id
    const current = readStory(id)
    if (!current) fail(404, '故事不存在')
    const body = (req.body ?? {}) as Record<string, unknown>
    const categoryId =
      body.categoryId === undefined ? current.category_id : requireCategoryId(body.categoryId)
    const title = body.title === undefined ? current.title : requireTitle(body.title)
    const text = body.text === undefined ? current.text : requireText(body.text)
    const source = body.source === undefined ? current.source : normalizeSource(body.source)
    const pinned = normalizePinned(body.pinned, Boolean(current.pinned))
    const sortOrder =
      categoryId === current.category_id ? current.sort_order : nextStorySortOrder(categoryId)
    const timestamp = now()
    // 最近置顶优先：首次置顶写入当前时间；已置顶的条目保持原置顶时间；取消置顶清空。
    const pinnedAt = pinned ? (current.pinned ? current.pinned_at : timestamp) : ''
    db.prepare(
      `UPDATE consult_stories SET
        category_id = ?, title = ?, text = ?, source = ?, pinned = ?, pinned_at = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`
    ).run(categoryId, title, text, source, pinned ? 1 : 0, pinnedAt, sortOrder, timestamp, id)
    log.info('consult.story_updated', {
      reqId: res.locals.reqId,
      id,
      categoryId,
      pinned
    })
    res.json({ item: rowToStory(readStory(id)!) })
  } catch (error) {
    sendError(res, error)
  }
})

storiesRouter.delete('/stories/:id', (req, res) => {
  try {
    const id = req.params.id
    const current = readStory(id)
    if (!current) fail(404, '故事不存在')
    db.prepare('DELETE FROM consult_stories WHERE id = ?').run(id)
    log.info('consult.story_deleted', {
      reqId: res.locals.reqId,
      id,
      categoryId: current.category_id
    })
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
})

storiesRouter.post('/story-categories', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const name = requireCategoryName(body.name)
    ensureCategoryNameFree(name)
    const timestamp = now()
    const id = newId('sc')
    db.prepare(
      `INSERT INTO consult_story_categories (id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, nextCategorySortOrder(), timestamp, timestamp)
    log.info('consult.story_category_created', { reqId: res.locals.reqId, id })
    res.status(201).json({ category: readCategoryWithCount(id) })
  } catch (error) {
    sendError(res, error)
  }
})

storiesRouter.put('/story-categories/order', (req, res) => {
  try {
    const ids = (req.body ?? {}).ids
    const existing = db
      .prepare('SELECT id FROM consult_story_categories')
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
      'UPDATE consult_story_categories SET sort_order = ?, updated_at = ? WHERE id = ?'
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
    log.info('consult.story_category_reordered', {
      reqId: res.locals.reqId,
      count: ids.length
    })
    res.json({ categories: readCategories() })
  } catch (error) {
    sendError(res, error)
  }
})

storiesRouter.patch('/story-categories/:id', (req, res) => {
  try {
    const id = req.params.id
    if (!readCategory(id)) fail(404, '分类不存在')
    const body = (req.body ?? {}) as Record<string, unknown>
    const name = requireCategoryName(body.name)
    ensureCategoryNameFree(name, id)
    db.prepare('UPDATE consult_story_categories SET name = ?, updated_at = ? WHERE id = ?').run(
      name,
      now(),
      id
    )
    log.info('consult.story_category_updated', { reqId: res.locals.reqId, id })
    res.json({ category: readCategoryWithCount(id) })
  } catch (error) {
    sendError(res, error)
  }
})

storiesRouter.delete('/story-categories/:id', (req, res) => {
  try {
    const id = req.params.id
    if (!readCategory(id)) fail(404, '分类不存在')
    const countRow = db
      .prepare('SELECT COUNT(*) AS count FROM consult_stories WHERE category_id = ?')
      .get(id) as unknown as { count: number }
    const count = Number(countRow.count)
    if (count > 0) fail(409, '分类下还有故事', { count })
    db.prepare('DELETE FROM consult_story_categories WHERE id = ?').run(id)
    log.info('consult.story_category_deleted', { reqId: res.locals.reqId, id })
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error)
  }
})
