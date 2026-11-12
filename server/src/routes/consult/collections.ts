import { Router, raw } from 'express'
import {
  consultCollectionKinds,
  type ConsultCollectionInput,
  type ConsultCollectionItem,
  type ConsultCollectionKind
} from '../../../../shared/src/consult-collection'
import { db, newId, now } from '../../db'
import { clampString, parseJson } from '../../util'
import { parseDocx } from '../../docx'

export const collectionsRouter = Router()

const MAX_COLLECTION_CONTENT = 200_000
const MAX_COLLECTION_TITLE = 200
const MAX_COLLECTION_SOURCE = 200
const MAX_COLLECTION_SUMMARY = 2_000
const MAX_COLLECTION_URL = 2_000
const MAX_COLLECTION_TAGS = 20
const MAX_COLLECTION_TAG_LENGTH = 30

interface CollectionRow {
  id: string
  kind: string
  title: string
  content: string
  url: string
  source: string
  summary: string
  tags: string
  pinned: number
  created_at: string
  updated_at: string
}

function parseCollectionTags(value: string): string[] {
  const parsed = parseJson<unknown>(value, [])
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
}

function normalizeCollectionTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const tags: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const tag = item.trim().slice(0, MAX_COLLECTION_TAG_LENGTH)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= MAX_COLLECTION_TAGS) break
  }
  return tags
}

function rowToCollection(row: CollectionRow): ConsultCollectionItem {
  return {
    id: row.id,
    kind: (consultCollectionKinds as string[]).includes(row.kind)
      ? (row.kind as ConsultCollectionKind)
      : 'other',
    title: row.title,
    content: row.content,
    url: row.url,
    source: row.source,
    summary: row.summary,
    tags: parseCollectionTags(row.tags),
    pinned: Boolean(row.pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function readCollections(): ConsultCollectionItem[] {
  const rows = db
    .prepare('SELECT * FROM consult_collections ORDER BY pinned DESC, updated_at DESC')
    .all() as unknown as CollectionRow[]
  return rows.map(rowToCollection)
}

function normalizeCollectionInput(
  body: ConsultCollectionInput,
  existing?: ConsultCollectionItem
): Omit<ConsultCollectionItem, 'id' | 'createdAt' | 'updatedAt'> {
  const rawKind = body.kind ?? existing?.kind ?? 'quote'
  if (!(consultCollectionKinds as string[]).includes(rawKind)) {
    throw new Error('收藏类型不对')
  }
  const kind = rawKind as ConsultCollectionKind
  const pick = (key: 'title' | 'content' | 'url' | 'source' | 'summary', max: number) => {
    if (body[key] === undefined) return existing?.[key] ?? ''
    return clampString(body[key], max)
  }
  const title = pick('title', MAX_COLLECTION_TITLE)
  const content = pick('content', MAX_COLLECTION_CONTENT)
  const url = pick('url', MAX_COLLECTION_URL)
  const source = pick('source', MAX_COLLECTION_SOURCE)
  const summary = pick('summary', MAX_COLLECTION_SUMMARY)
  const tags =
    body.tags === undefined ? existing?.tags ?? [] : normalizeCollectionTags(body.tags)
  const pinned = body.pinned === undefined ? existing?.pinned ?? false : Boolean(body.pinned)

  if (kind === 'link') {
    if (!url.trim()) throw new Error('链接需要填写有效的 http/https 地址')
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error('链接需要填写有效的 http/https 地址')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('链接需要填写有效的 http/https 地址')
    }
  } else if (!content.trim()) {
    throw new Error('内容不能为空')
  }
  // 非链接类型也可以带原文链接，但同样只允许 http/https，避免渲染出 javascript: 等地址。
  if (url.trim()) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('链接需要填写有效的 http/https 地址')
      }
    } catch {
      throw new Error('链接需要填写有效的 http/https 地址')
    }
  }

  return { kind, title, content: content.trim(), url, source, summary, tags, pinned }
}

function createCollection(
  input: Omit<ConsultCollectionItem, 'id' | 'createdAt' | 'updatedAt'>
): ConsultCollectionItem {
  const timestamp = now()
  const id = newId('col')
  db.prepare(
    `INSERT INTO consult_collections
      (id, kind, title, content, url, source, summary, tags, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.kind,
    input.title,
    input.content,
    input.url,
    input.source,
    input.summary,
    JSON.stringify(input.tags),
    input.pinned ? 1 : 0,
    timestamp,
    timestamp
  )
  const row = db.prepare('SELECT * FROM consult_collections WHERE id = ?').get(id) as unknown as CollectionRow
  return rowToCollection(row)
}

function collectionPlainText(items: ConsultCollectionItem[]): string {
  const sections: string[] = []
  const labels: Record<ConsultCollectionKind, string> = {
    quote: '金句',
    script: '优秀咨询稿',
    link: '公众号链接',
    other: '其他'
  }
  for (const kind of consultCollectionKinds) {
    const group = items.filter((item) => item.kind === kind)
    if (!group.length) continue
    sections.push(`## ${labels[kind]}`)
    for (const item of group) {
      const heading = item.title || (item.kind === 'link' ? item.url : item.content.slice(0, 40))
      sections.push(`### ${heading}`)
      if (item.source) sections.push(`来源：${item.source}`)
      if (item.tags.length) sections.push(`标签：${item.tags.join(' / ')}`)
      if (item.url) sections.push(`链接：${item.url}`)
      if (item.summary) sections.push(item.summary)
      if (item.kind !== 'link' && item.content) sections.push(item.content)
      sections.push('')
    }
  }
  return sections.join('\n').trim()
}

collectionsRouter.get('/collections', (req, res) => {
  const kind = typeof req.query.kind === 'string' ? req.query.kind : ''
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''
  let items = readCollections()
  if (kind) items = items.filter((item) => item.kind === kind)
  if (query) {
    items = items.filter((item) =>
      [item.title, item.content, item.source, item.summary, item.url, item.tags.join(' ')]
        .join('\n')
        .toLowerCase()
        .includes(query)
    )
  }
  res.json({ items })
})

// 给之后的咨询稿生成器（和人工导出）一份可直接阅读的纯文本合集。
collectionsRouter.get('/collections/bundle', (_req, res) => {
  const items = readCollections()
  res.json({ count: items.length, text: collectionPlainText(items), items })
})

collectionsRouter.get('/collections/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM consult_collections WHERE id = ?').get(req.params.id) as unknown as
    | CollectionRow
    | undefined
  if (!row) {
    res.status(404).json({ error: '收藏不存在' })
    return
  }
  res.json({ item: rowToCollection(row) })
})

collectionsRouter.post('/collections', (req, res) => {
  try {
    const input = normalizeCollectionInput(req.body ?? {})
    res.status(201).json({ item: createCollection(input) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '收藏格式不对' })
  }
})

// 直接接收 .docx 原始字节，解析正文后作为收藏。咨询稿默认归到 script。
collectionsRouter.post(
  '/collections/import-docx',
  raw({ type: () => true, limit: '20mb' }),
  (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || !req.body.length) {
        throw new Error('请选择要导入的 .docx 文件')
      }
      const header = typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : ''
      let fileName = header
      try {
        fileName = decodeURIComponent(header)
      } catch {
        // 文件名不是编码过的就按原样使用。
      }
      const parsed = parseDocx(req.body)
      const content = parsed.text.trim()
      if (!content) throw new Error('这个 Word 文件没有可读取的正文')

      const baseTitle = fileName
        .replace(/\.docx$/i, '')
        .replace(/[+_]+/g, ' ')
        .replace(/\s*原文\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim()
      const title = (baseTitle || content.slice(0, 48)).slice(0, MAX_COLLECTION_TITLE)
      const isScript = /咨询稿|咨询师|来访者|学生|发言人\s*\d+|老师\s*[：:]/.test(
        `${title}\n${content.slice(0, 2_000)}`
      )
      const input = normalizeCollectionInput({
        kind: isScript ? 'script' : 'other',
        title,
        content: content.slice(0, MAX_COLLECTION_CONTENT),
        source: 'Word 导入',
        summary: `共 ${parsed.paragraphs.length} 段，约 ${content.length} 字`,
        tags: isScript ? ['咨询稿', 'Word 导入'] : ['Word 导入']
      })
      res.status(201).json({ item: createCollection(input) })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Word 解析失败' })
    }
  }
)

collectionsRouter.put('/collections/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM consult_collections WHERE id = ?').get(req.params.id) as unknown as
    | CollectionRow
    | undefined
  if (!row) {
    res.status(404).json({ error: '收藏不存在' })
    return
  }
  try {
    const current = rowToCollection(row)
    const input = normalizeCollectionInput(req.body ?? {}, current)
    const timestamp = now()
    db.prepare(
      `UPDATE consult_collections SET
        kind = ?, title = ?, content = ?, url = ?, source = ?, summary = ?,
        tags = ?, pinned = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.kind,
      input.title,
      input.content,
      input.url,
      input.source,
      input.summary,
      JSON.stringify(input.tags),
      input.pinned ? 1 : 0,
      timestamp,
      current.id
    )
    const updated = db
      .prepare('SELECT * FROM consult_collections WHERE id = ?')
      .get(current.id) as unknown as CollectionRow
    res.json({ item: rowToCollection(updated) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '收藏格式不对' })
  }
})

collectionsRouter.delete('/collections/:id', (req, res) => {
  const result = db.prepare('DELETE FROM consult_collections WHERE id = ?').run(req.params.id)
  if (!result.changes) {
    res.status(404).json({ error: '收藏不存在' })
    return
  }
  res.json({ ok: true })
})
