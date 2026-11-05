import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { parseDocx } from '../server/src/docx'

// 把 Word 咨询稿直接导入收藏栏。按标题判重：已存在就更新正文，不会重复插入。
// 用法：npx tsx scripts/import-collections-docx.ts [文件或目录…] [--write] [--pin]

const MAX_CONTENT = 200_000
const args = process.argv.slice(2)
const write = args.includes('--write')
const pin = args.includes('--pin')
const targets = args.filter((item) => !item.startsWith('--'))
if (!targets.length) targets.push('zxg')

const files: string[] = []
for (const target of targets) {
  const resolved = path.resolve(target)
  if (!fs.existsSync(resolved)) {
    console.warn(`跳过不存在的路径：${target}`)
    continue
  }
  if (fs.statSync(resolved).isDirectory()) {
    for (const name of fs.readdirSync(resolved).sort()) {
      if (/\.docx$/i.test(name) && !name.startsWith('~$')) files.push(path.join(resolved, name))
    }
  } else if (/\.docx$/i.test(resolved)) {
    files.push(resolved)
  }
}

if (!files.length) {
  console.error('没有找到 .docx 文件')
  process.exit(1)
}

interface ParsedFile {
  file: string
  fileName: string
  title: string
  content: string
  paragraphs: number
  isScript: boolean
}

function cleanTitle(fileName: string): string {
  return fileName
    .replace(/\.docx$/i, '')
    .replace(/[+_]+/g, ' ')
    .replace(/\s*原文\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const parsedFiles: ParsedFile[] = []
for (const file of files) {
  const parsed = parseDocx(fs.readFileSync(file))
  const content = parsed.text.trim().slice(0, MAX_CONTENT)
  if (!content) {
    console.warn(`跳过空文件：${path.basename(file)}`)
    continue
  }
  const fileName = path.basename(file)
  const title = cleanTitle(fileName).slice(0, 200) || fileName
  parsedFiles.push({
    file,
    fileName,
    title,
    content,
    paragraphs: parsed.paragraphs.length,
    isScript: /咨询稿|咨询师|来访者|学生|发言人\s*\d+|老师\s*[：:]/.test(
      `${title}\n${content.slice(0, 2_000)}`
    )
  })
}

for (const item of parsedFiles) {
  console.log(
    `${write ? '导入' : '预览'}：${item.title}\n  ${item.paragraphs} 段 / ${item.content.length} 字 / ${item.isScript ? '咨询稿' : '其他'}`
  )
}

if (!write) {
  console.log(`共 ${parsedFiles.length} 个文件。确认无误后加 --write 写入收藏栏。`)
  process.exit(0)
}

const dbFile = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR, 'vesta.db')
  : path.resolve('data/vesta.db')
const db = new DatabaseSync(dbFile)
db.exec(`
  CREATE TABLE IF NOT EXISTS consult_collections (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'quote',
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_consult_collections_updated ON consult_collections(pinned DESC, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_consult_collections_kind ON consult_collections(kind);
`)

const backupDir = path.join(path.dirname(dbFile), 'backups')
fs.mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFile = path.join(backupDir, `vesta-before-collections-${stamp}.db`)
db.exec(`VACUUM INTO '${backupFile.replace(/'/g, "''")}'`)
console.log(`已备份数据库：${backupFile}`)

const findExisting = db.prepare(
  "SELECT id FROM consult_collections WHERE title = ? AND source = 'Word 导入'"
)
const insert = db.prepare(
  `INSERT INTO consult_collections
    (id, kind, title, content, url, source, summary, tags, pinned, created_at, updated_at)
   VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)`
)
const update = db.prepare(
  `UPDATE consult_collections
   SET kind = ?, content = ?, source = ?, summary = ?, tags = ?, pinned = ?, updated_at = ?
   WHERE id = ?`
)

let inserted = 0
let updated = 0
const timestamp = new Date().toISOString()
for (const item of parsedFiles) {
  const id = `col_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`
  const kind = item.isScript ? 'script' : 'other'
  const summary = `共 ${item.paragraphs} 段，约 ${item.content.length} 字`
  const tags = JSON.stringify(item.isScript ? ['咨询稿', 'Word 导入'] : ['Word 导入'])
  const row = findExisting.get(item.title) as { id: string } | undefined
  if (row) {
    update.run(kind, item.content, 'Word 导入', summary, tags, pin ? 1 : 0, timestamp, row.id)
    console.log(`已更新：${item.title}`)
    updated += 1
  } else {
    insert.run(id, kind, item.title, item.content, 'Word 导入', summary, tags, pin ? 1 : 0, timestamp, timestamp)
    console.log(`已新增：${item.title}`)
    inserted += 1
  }
}
db.close()
console.log(`完成：新增 ${inserted} 条，更新 ${updated} 条（${dbFile}）`)
