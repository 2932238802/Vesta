import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { DatabaseSync } from 'node:sqlite'

const args = process.argv.slice(2)
const file = args.find((item) => !item.startsWith('--'))
const write = args.includes('--write')
const list = args.includes('--list')
const requestedName = args.find((item) => item.startsWith('--name='))?.slice('--name='.length)
const requestedConsultant = Number(
  args.find((item) => item.startsWith('--consultant='))?.slice('--consultant='.length)
)

if (!file) {
  console.error(
    '用法：node scripts/import-consult-docx.mjs <docx> [--name=咨询树名称] [--consultant=发言人编号] [--list] [--write]'
  )
  process.exit(1)
}

function readZipEntry(zipFile, wanted) {
  const buffer = fs.readFileSync(zipFile)
  let eocd = -1
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset
      break
    }
  }
  if (eocd < 0) throw new Error('不是有效的 docx / zip 文件')

  const count = buffer.readUInt16LE(eocd + 10)
  let cursor = buffer.readUInt32LE(eocd + 16)
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('zip 目录损坏')
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localOffset = buffer.readUInt32LE(cursor + 42)
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    if (name === wanted) {
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('zip 文件头损坏')
      const localNameLength = buffer.readUInt16LE(localOffset + 26)
      const localExtraLength = buffer.readUInt16LE(localOffset + 28)
      const start = localOffset + 30 + localNameLength + localExtraLength
      const data = buffer.subarray(start, start + compressedSize)
      if (method === 0) return data
      if (method === 8) return zlib.inflateRawSync(data)
      throw new Error(`不支持的 zip 压缩方式：${method}`)
    }
    cursor += 46 + nameLength + extraLength + commentLength
  }
  throw new Error(`docx 中找不到 ${wanted}`)
}

function decodeXml(text) {
  return text
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function paragraphsFromDocx(zipFile) {
  const xml = readZipEntry(zipFile, 'word/document.xml').toString('utf8')
  const paragraphs = []
  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const body = match[1]
    const text = decodeXml(
      [...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((item) => item[1])
        .join('')
    ).replace(/\u00a0/g, ' ').trim()
    if (!text) continue
    const bold = /<w:b(?:\s*\/|\s*><\/w:b>)/.test(body)
    paragraphs.push({ text, bold })
  }
  return paragraphs
}

const SPEAKER_MARKER = /^发言人\s*(\d+)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/

function speakerTurns(paragraphs) {
  const turns = []
  let speaker = ''
  let buffer = []
  const flush = () => {
    const text = buffer.join('').trim()
    if (speaker && text) turns.push({ speaker: Number(speaker), text })
    buffer = []
  }
  for (const paragraph of paragraphs) {
    const match = SPEAKER_MARKER.exec(paragraph.text)
    if (match) {
      flush()
      speaker = match[1]
      continue
    }
    if (!speaker) continue
    buffer.push(paragraph.text)
  }
  flush()
  return turns
}

const CONSULTANT_CUES =
  /(你有没有|你想|你可以|你要|你现在|你觉得|你知道|我跟你|老师|规划|建议|记住|我们|对吧|是不是|好不好|行不行|对不对|明白吗|其实|说白了|关键是)/g

function detectConsultantSpeaker(turns) {
  const scores = new Map()
  for (const turn of turns) {
    const current = scores.get(turn.speaker) ?? { turns: 0, chars: 0, cues: 0 }
    current.turns += 1
    current.chars += turn.text.length
    current.cues += (turn.text.match(CONSULTANT_CUES) ?? []).length
    scores.set(turn.speaker, current)
  }
  let best = 0
  let bestScore = -Infinity
  for (const [speaker, score] of scores) {
    const value = score.cues * 8 + (score.chars / score.turns) * 0.6 + score.turns * 0.05
    if (value > bestScore) {
      best = speaker
      bestScore = value
    }
  }
  return best
}

function buildTranscriptTree(turns, consultantSpeaker, name, treeId) {
  const idPrefix = `node_${treeId.replace(/^consult_tree_/, '')}`
  const root = makeNode(name, -1, 'root', idPrefix)
  root.metadata = { tags: [], answerHistory: [], placeholder: true }
  let current = root
  let consultantTurns = 0
  let answers = 0
  for (const [index, turn] of turns.entries()) {
    if (turn.speaker === consultantSpeaker) {
      const node = makeNode(turn.text, index, 'leaf', idPrefix)
      node.reward = 1
      current.children.push(node)
      current = node
      consultantTurns += 1
      continue
    }
    const text = turn.text.slice(0, 1600)
    if (!text || current.id === root.id) continue
    if (!current.metadata) current.metadata = {}
    const history = current.metadata.answerHistory ?? []
    if (history.some((answer) => answer.text === text)) continue
    current.metadata.answerHistory = [
      ...history,
      {
        id: crypto.randomUUID(),
        text,
        studentName: `发言人${turn.speaker}`,
        tags: [],
        source: 'import',
        createdAt: new Date().toISOString()
      }
    ].slice(-20)
    answers += 1
  }
  const normalize = (node) => {
    if (node.type !== 'root') node.type = node.children.length ? 'branch' : 'leaf'
    for (const child of node.children) normalize(child)
  }
  normalize(root)
  return {
    tree: { id: treeId, name, root, updatedAt: new Date().toISOString() },
    consultantTurns,
    answers
  }
}

const PUNCTUATION = /[，。！？；：,.!?;]/
const SKIP_PREFIX = [
  '如果她说',
  '如果前面已经知道',
  '如果之前知道',
  '根据她的回答',
  '根据省份',
  '等她回应',
  '等她说',
  '让她想',
  '让她真实表达',
  '听她说完',
  '正反面故事',
  '思南的原有话术',
  '轩自己的例子',
  '提问增加参与度',
  '这个其实很简单',
  '消除阻力',
  '促单的具体问题',
  '推荐vivi老师',
  '知识点'
]

function isTopLevelStage(text) {
  return (
    /^[一二三四五六七八九十]+[：:]/.test(text) ||
    text === '开场定调' ||
    text.startsWith('准大一状态摸底') ||
    text.startsWith('针对性给她解答') ||
    text.startsWith('正反面故事案例')
  )
}

function cleanParagraphs(paragraphs) {
  const result = []
  let insideParenthetical = false
  for (const paragraph of paragraphs) {
    let text = paragraph.text.replace(/\s+/g, ' ').trim()
    if (!text) continue

    if (insideParenthetical) {
      if (/[）)]/.test(text)) insideParenthetical = false
      continue
    }
    if (/^[（(]/.test(text)) {
      if (!/[）)]/.test(text)) {
        insideParenthetical = true
        continue
      }
      const afterLabel = /^[（(][^）)]*[）)]\s*[：:]\s*(.+)$/.exec(text)
      if (!afterLabel) continue
      text = afterLabel[1].trim()
    }

    if (/^七月咨询稿/.test(text)) continue
    if (!isTopLevelStage(text) && SKIP_PREFIX.some((prefix) => text.startsWith(prefix))) continue
    if (!paragraph.bold && text.length <= 32 && !PUNCTUATION.test(text)) continue

    text = text
      .replace(/\s*[（(](?:如果|到这里|选着问|可借鉴|思南|但是其实|我们这个回答|要把|就是|自己)[^）)]*[）)]?\s*$/gu, '')
      .trim()
    if (!text) continue
    const numberedHeading = /^(?:[0-9]+[.．、]|[一二三四五六七八九十]+[：:])/.test(text)
    const stage = paragraph.bold && (
      isTopLevelStage(text) ||
      (numberedHeading && text.length <= 60) ||
      (!PUNCTUATION.test(text) && text.length <= 30)
    )
    result.push({ text, stage })
  }
  return result
}

function makeNode(text, index, type, idPrefix = 'node_july') {
  const hash = crypto.createHash('sha1').update(`${index}:${text}`).digest('hex').slice(0, 12)
  return {
    id: `${idPrefix}_${hash}`,
    text,
    type,
    children: [],
    weight: 1,
    reward: 0,
    penalty: 0,
    selectedCount: 0,
    metadata: { tags: [], answerHistory: [] }
  }
}

function buildTree(lines, name, treeId = 'consult_tree_july') {
  if (!lines.length) throw new Error('没有识别到可用咨询话术')
  const idPrefix = `node_${treeId.replace(/^consult_tree_/, '')}`
  const root = makeNode(name, -1, 'root', idPrefix)
  root.metadata = { tags: [], answerHistory: [], placeholder: true }
  let section = null
  let stage = null
  for (const [index, line] of lines.entries()) {
    const node = makeNode(line.text, index, 'leaf', idPrefix)
    if (isTopLevelStage(line.text)) {
      node.type = 'branch'
      root.children.push(node)
      section = node
      stage = null
    } else if (line.stage) {
      node.type = 'branch'
      ;(section ?? root).children.push(node)
      stage = node
    } else {
      ;(stage ?? section ?? root).children.push(node)
    }
  }
  const normalize = (node) => {
    if (node.type !== 'root') node.type = node.children.length ? 'branch' : 'leaf'
    for (const child of node.children) normalize(child)
  }
  normalize(root)
  return {
    id: treeId,
    name,
    root,
    updatedAt: new Date().toISOString()
  }
}

const paragraphs = paragraphsFromDocx(file)
const turns = speakerTurns(paragraphs)
const isTranscript = turns.length >= 3
const defaultId = `consult_tree_${crypto
  .createHash('sha1')
  .update(path.basename(file).replace(/\.docx$/i, ''))
  .digest('hex')
  .slice(0, 8)}`
const name =
  requestedName?.trim() ||
  (isTranscript ? path.basename(file).replace(/\.docx$/i, '').trim() : '七月咨询稿')
const treeId = !isTranscript && name === '七月咨询稿' ? 'consult_tree_july' : defaultId

let tree
let description
if (isTranscript) {
  const consultantSpeaker =
    Number.isInteger(requestedConsultant) && requestedConsultant > 0
      ? requestedConsultant
      : detectConsultantSpeaker(turns)
  const built = buildTranscriptTree(turns, consultantSpeaker, name, treeId)
  tree = built.tree
  description = `识别到 ${turns.length} 轮对话（发言人 ${consultantSpeaker} 是咨询师，${built.consultantTurns} 段话术，${built.answers} 条学生回答）`
  if (list) {
    let seq = 0
    for (const turn of turns) {
      const role = turn.speaker === consultantSpeaker ? '咨询师' : `学生${turn.speaker}`
      if (turn.speaker === consultantSpeaker) seq += 1
      console.log(
        `${turn.speaker === consultantSpeaker ? String(seq).padStart(3, '0') : '   '} [${role}] ${turn.text}`
      )
    }
  }
} else {
  const lines = cleanParagraphs(paragraphs)
  tree = buildTree(lines, name, treeId)
  description = `识别到 ${lines.length} 段咨询师话术，${lines.filter((line) => line.stage).length} 个阶段标题`
  if (list) {
    for (const [index, line] of lines.entries()) {
      console.log(`${String(index + 1).padStart(3, '0')} ${line.stage ? '## ' : '   '}${line.text}`)
    }
  }
}

console.log(description)
console.log(`第一段：${tree.root.children[0]?.text ?? tree.root.text}`)
let lastNode = tree.root
while (lastNode.children.length) lastNode = lastNode.children.at(-1)
console.log(`最后一段：${lastNode.text}`)

if (!write) {
  console.log('未写入数据库。确认无误后加 --write。')
  process.exit(0)
}

const dbFile = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR, 'vesta.db')
  : path.resolve('data/vesta.db')
const db = new DatabaseSync(dbFile)
db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")

const backupDir = path.join(path.dirname(dbFile), 'backups')
fs.mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFile = path.join(backupDir, `vesta-before-import-${stamp}.db`)
db.exec(`VACUUM INTO '${backupFile.replace(/'/g, "''")}'`)
console.log(`已备份数据库：${backupFile}`)

const stored = db.prepare("SELECT value FROM settings WHERE key = 'consult_forest'").get()
let forest = { id: 'consult-forest', trees: [], activeTreeId: '', updatedAt: new Date().toISOString() }
if (stored?.value) {
  let parsed
  try {
    parsed = JSON.parse(stored.value)
  } catch {
    throw new Error('数据库里的 consult_forest 不是有效 JSON，已停止写入')
  }
  if (!parsed || !Array.isArray(parsed.trees)) {
    throw new Error('数据库里的 consult_forest 结构异常，已停止写入')
  }
  forest = parsed
}

const existingIndex = forest.trees.findIndex(
  (item) => item && (item.id === tree.id || item.name === tree.name)
)
if (existingIndex >= 0) {
  tree.id = forest.trees[existingIndex].id
  tree.id = tree.id || treeId
  forest.trees[existingIndex] = tree
  console.log(`同名的“${tree.name}”已存在，只替换这一棵树，其他咨询树保持不变`)
} else {
  forest.trees.push(tree)
  console.log(`已新增咨询树“${tree.name}”，现有 ${forest.trees.length} 棵树`)
}
forest.id = forest.id || 'consult-forest'
forest.activeTreeId = tree.id
forest.updatedAt = new Date().toISOString()

const writeSetting = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
)
writeSetting.run('consult_forest', JSON.stringify(forest))
writeSetting.run('consult_forest_version', '5')
db.close()
console.log(`已写入 ${dbFile}：当前共 ${forest.trees.length} 棵树，本次树 ID 为 ${tree.id}`)
