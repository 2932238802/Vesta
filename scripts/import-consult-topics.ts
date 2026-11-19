/**
 * 导入「大学常识」话题内容包到 consult_topics。
 *
 * 用法：
 *   npx tsx scripts/import-consult-topics.ts          # dry-run，只打印将写入的话题
 *   npx tsx scripts/import-consult-topics.ts --write  # 写入数据库
 *
 * 幂等：按内容包里的稳定 id 判断，已存在的话题直接跳过，不覆盖人工修改。
 * 不新增迁移、不改 update.sh；内容包路径固定为 server/src/data/consult-topics-import.json。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONSULT_TOPIC_BODY_MAX,
  CONSULT_TOPIC_TITLE_MAX
} from '../shared/src/consult-topic'

interface ImportTopic {
  id: string
  title: string
  body: string
}

interface ImportPackage {
  version: number
  topics: ImportTopic[]
}

const here = path.dirname(fileURLToPath(import.meta.url))
const packagePath = path.join(here, '../server/src/data/consult-topics-import.json')
const write = process.argv.slice(2).includes('--write')

function fail(message: string): never {
  console.error(`导入失败：${message}`)
  process.exit(1)
}

function readPackage(): ImportPackage {
  if (!fs.existsSync(packagePath)) fail(`内容包不存在：${packagePath}`)
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  } catch (error) {
    fail(`内容包不是合法 JSON：${error instanceof Error ? error.message : String(error)}`)
  }
  if (!parsed || typeof parsed !== 'object') fail('内容包格式不对')
  const data = parsed as Partial<ImportPackage>
  if (data.version !== 1) fail(`不支持的内容包版本：${String(data.version)}`)
  if (!Array.isArray(data.topics) || data.topics.length === 0) fail('内容包没有话题')

  const seen = new Set<string>()
  return {
    version: data.version,
    topics: data.topics.map((raw, index) => {
      const topic = raw as Partial<ImportTopic>
      const id = typeof topic.id === 'string' ? topic.id.trim() : ''
      const title = typeof topic.title === 'string' ? topic.title.trim() : ''
      const body = typeof topic.body === 'string' ? topic.body.trim() : ''
      if (!/^[A-Za-z0-9_-]+$/.test(id)) fail(`第 ${index + 1} 个话题的 id 不合法：${String(topic.id)}`)
      if (seen.has(id)) fail(`话题 id 重复：${id}`)
      seen.add(id)
      if (!title) fail(`话题 ${id} 缺少标题`)
      if (title.length > CONSULT_TOPIC_TITLE_MAX) {
        fail(`话题 ${id} 标题超过 ${CONSULT_TOPIC_TITLE_MAX} 字`)
      }
      if (!body) fail(`话题 ${id} 缺少正文`)
      if (body.length > CONSULT_TOPIC_BODY_MAX) {
        fail(`话题 ${id} 正文超过 ${CONSULT_TOPIC_BODY_MAX} 字`)
      }
      return { id, title, body }
    })
  }
}

const pkg = readPackage()
const { db, now } = await import('../server/src/db')
db.exec('PRAGMA busy_timeout = 5000')

const exists = db.prepare('SELECT id FROM consult_topics WHERE id = ?')
const insert = db.prepare(
  `INSERT INTO consult_topics (id, title, body, sort_order, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?)`
)
const nextSortOrder = db.prepare(
  'SELECT COALESCE(MAX(sort_order), 0) AS max FROM consult_topics'
)

let created = 0
let skipped = 0

for (const topic of pkg.topics) {
  if (exists.get(topic.id)) {
    console.log(`已存在，跳过：${topic.id} · ${topic.title}`)
    skipped += 1
    continue
  }
  if (!write) {
    console.log(`将写入：${topic.id} · ${topic.title} · ${topic.body.length} 字`)
    continue
  }
  const row = nextSortOrder.get() as unknown as { max: number }
  const timestamp = now()
  insert.run(topic.id, topic.title, topic.body, Number(row.max) + 1, timestamp, timestamp)
  console.log(`已写入：${topic.id} · ${topic.title} · ${topic.body.length} 字`)
  created += 1
}

if (!write) {
  console.log(`dry-run：未写数据库（共 ${pkg.topics.length} 个话题，${skipped} 个已存在）`)
} else {
  console.log(`导入完成：新增 ${created} 个，跳过 ${skipped} 个`)
}
