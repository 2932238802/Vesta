import { Router } from 'express'
import {
  normalizeScoreLineInput,
  scoreLineCategories,
  scoreLineCategoryIds,
  validateScoreLineInput
} from '../../../../shared/src/score-line'
import type { ScoreLineEntry, ScoreLineSet } from '../../../../shared/src/score-line'
import { noStore } from '../../auth'
import { db, newId, now } from '../../db'
import { log } from '../../log'
import { clampString } from '../../util'

export const scoreLinesRouter = Router()

interface SetRow {
  id: string
  category_id: string
  title: string
  year: number
  region: string
  source_name: string
  source_url: string
  note: string
  created_at: string
  updated_at: string
}

interface EntryRow {
  id: string
  set_id: string
  label: string
  value: number
  max_value: number | null
  note: string
  sort_order: number
}

function entryToJson(row: EntryRow): ScoreLineEntry {
  const entry: ScoreLineEntry = {
    id: row.id,
    label: row.label,
    value: Number(row.value),
    note: row.note
  }
  if (row.max_value !== null) entry.maxValue = Number(row.max_value)
  return entry
}

/** 两次 SQL 取完条目：先按 set_id 分组，不在循环里逐条查。 */
function entriesBySet(ids: string[]): Map<string, ScoreLineEntry[]> {
  const map = new Map<string, ScoreLineEntry[]>()
  if (ids.length === 0) return map
  const placeholders = ids.map(() => '?').join(',')
  const rows = db
    .prepare(
      `SELECT * FROM score_line_entries
       WHERE set_id IN (${placeholders})
       ORDER BY set_id, sort_order ASC`
    )
    .all(...ids) as unknown as EntryRow[]
  for (const row of rows) {
    const list = map.get(row.set_id) ?? []
    list.push(entryToJson(row))
    map.set(row.set_id, list)
  }
  return map
}

function toSet(row: SetRow, entries: ScoreLineEntry[]): ScoreLineSet {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    year: Number(row.year),
    region: row.region,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    note: row.note,
    entries,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function loadSet(id: string): ScoreLineSet | null {
  const row = db.prepare('SELECT * FROM score_line_sets WHERE id = ?').get(id) as
    | SetRow
    | undefined
  if (!row) return null
  return toSet(row, entriesBySet([id]).get(id) ?? [])
}

function setExists(id: string): boolean {
  return Boolean(db.prepare('SELECT id FROM score_line_sets WHERE id = ?').get(id))
}

function insertEntries(setId: string, entries: { label: string; value: number; maxValue?: number | null; note?: string }[]): void {
  const insert = db.prepare(
    `INSERT INTO score_line_entries (id, set_id, label, value, max_value, note, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  entries.forEach((entry, index) => {
    insert.run(
      newId('slineitem'),
      setId,
      entry.label,
      entry.value,
      entry.maxValue ?? null,
      entry.note ?? '',
      index
    )
  })
}

scoreLinesRouter.get('/score-lines', (req, res) => {
  noStore(res)
  const requestedCategory = clampString(req.query.category, 20)
  const category = scoreLineCategoryIds.has(requestedCategory) ? requestedCategory : ''
  const yearNumber = Number(clampString(req.query.year, 10))
  const year = Number.isInteger(yearNumber) && yearNumber > 0 ? yearNumber : 0

  // tab 计数只受年份影响，不受当前 category 过滤影响，保证切换 tab 时数字稳定。
  const countRows = (
    year
      ? db
          .prepare(
            'SELECT category_id, COUNT(*) AS count FROM score_line_sets WHERE year = ? GROUP BY category_id'
          )
          .all(year)
      : db
          .prepare('SELECT category_id, COUNT(*) AS count FROM score_line_sets GROUP BY category_id')
          .all()
  ) as unknown as { category_id: string; count: number }[]
  const countMap = new Map(countRows.map((row) => [row.category_id, Number(row.count)]))
  const categories = scoreLineCategories.map((item) => ({
    ...item,
    count: countMap.get(item.id) ?? 0
  }))

  const where: string[] = []
  const params: (string | number)[] = []
  if (category) {
    where.push('category_id = ?')
    params.push(category)
  }
  if (year) {
    where.push('year = ?')
    params.push(year)
  }
  const rows = db
    .prepare(
      `SELECT * FROM score_line_sets
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY CASE WHEN year = 0 THEN 1 ELSE 0 END, year DESC, updated_at DESC`
    )
    .all(...params) as unknown as SetRow[]

  // 类型顺序按注册表下标；JS 的 sort 是稳定的，同类型内保留年份 / 更新时间排序。
  const categoryOrder = new Map(scoreLineCategories.map((item, index) => [item.id, index]))
  rows.sort(
    (a, b) =>
      (categoryOrder.get(a.category_id) ?? Number.MAX_SAFE_INTEGER) -
      (categoryOrder.get(b.category_id) ?? Number.MAX_SAFE_INTEGER)
  )

  const entries = entriesBySet(rows.map((row) => row.id))
  const sets = rows.map((row) => toSet(row, entries.get(row.id) ?? []))
  res.json({ categories, sets })
})

scoreLinesRouter.post('/score-lines', (req, res) => {
  noStore(res)
  const errors = validateScoreLineInput(req.body)
  if (errors.length) {
    res.status(400).json({ error: errors[0], errors })
    return
  }
  const input = normalizeScoreLineInput(req.body)
  const id = newId('sline')
  const at = now()

  db.exec('BEGIN')
  try {
    db.prepare(
      `INSERT INTO score_line_sets
       (id, category_id, title, year, region, source_name, source_url, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.categoryId,
      input.title,
      input.year,
      input.region ?? '',
      input.sourceName,
      input.sourceUrl ?? '',
      input.note ?? '',
      at,
      at
    )
    insertEntries(id, input.entries)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  log.info('scoreline.saved', {
    id,
    categoryId: input.categoryId,
    entries: input.entries.length,
    created: true
  })
  res.status(201).json({ set: loadSet(id) })
})

scoreLinesRouter.put('/score-lines/:id', (req, res) => {
  noStore(res)
  const id = clampString(req.params.id, 100)
  if (!id || !setExists(id)) {
    res.status(404).json({ error: '没有找到这条分数线' })
    return
  }
  const errors = validateScoreLineInput(req.body)
  if (errors.length) {
    res.status(400).json({ error: errors[0], errors })
    return
  }
  const input = normalizeScoreLineInput(req.body)
  const at = now()

  db.exec('BEGIN')
  try {
    db.prepare(
      `UPDATE score_line_sets
       SET category_id = ?, title = ?, year = ?, region = ?, source_name = ?,
           source_url = ?, note = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.categoryId,
      input.title,
      input.year,
      input.region ?? '',
      input.sourceName,
      input.sourceUrl ?? '',
      input.note ?? '',
      at,
      id
    )
    db.prepare('DELETE FROM score_line_entries WHERE set_id = ?').run(id)
    insertEntries(id, input.entries)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  log.info('scoreline.saved', {
    id,
    categoryId: input.categoryId,
    entries: input.entries.length,
    created: false
  })
  res.json({ set: loadSet(id) })
})

scoreLinesRouter.delete('/score-lines/:id', (req, res) => {
  noStore(res)
  const id = clampString(req.params.id, 100)
  if (!id || !setExists(id)) {
    res.status(404).json({ error: '没有找到这条分数线' })
    return
  }

  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM score_line_entries WHERE set_id = ?').run(id)
    db.prepare('DELETE FROM score_line_sets WHERE id = ?').run(id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  log.info('scoreline.deleted', { id })
  res.json({ ok: true })
})
