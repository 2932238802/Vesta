// 只读原型生成器：把手工目的树里的段号/轮次引用，解析成逐字示例，输出 JSON 和静态预览页。
// 不读写数据库，不修改现有咨询树。

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { templates } from './templates.mjs'
import { sources } from './sources.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const importScript = path.join(repo, 'scripts/import-consult-docx.mjs')
const julyFile = path.join(repo, 'zxg/七月咨询稿.docx')
const sourceById = new Map(sources.map((source) => [source.id, source]))

function listing(file) {
  return execFileSync('node', [importScript, file, '--list'], {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  })
}

function parseJuly(text) {
  const lines = new Map()
  for (const raw of text.split('\n')) {
    const match = /^(\d{3}) (.*)$/.exec(raw)
    if (!match) continue
    const number = Number(match[1])
    const body = match[2]
    if (body.startsWith('## ')) continue
    const content = body.trim()
    if (!content) continue
    lines.set(number, content)
  }
  return lines
}

function parseTranscript(text) {
  const turns = new Map()
  let current = null
  for (const raw of text.split('\n')) {
    const consultant = /^(\d{3}) \[咨询师\] (.*)$/.exec(raw)
    if (consultant) {
      current = {
        number: Number(consultant[1]),
        speaker: 'consultant',
        text: consultant[2].trim(),
        students: []
      }
      turns.set(current.number, current)
      continue
    }
    const student = /^    \[(学生\d+)\] (.*)$/.exec(raw)
    if (student && current) {
      const content = student[2].trim()
      if (content) current.students.push({ speaker: student[1], text: content })
    }
  }
  if (turns.size) return turns

  // 少数稿子没有“咨询师/学生”说话人标记，逐字稿工具会退化成
  // “编号 ## 发言人 N + 编号 正文”的段落列表。这里按“发言人 1 是咨询师”
  // 重新编号，让这些稿子也能进入示例库。
  let speaker = 0
  let sequence = 0
  for (const raw of text.split('\n')) {
    const header = /^(\d{3}) ## 发言人 (\d+)$/.exec(raw)
    if (header) {
      speaker = Number(header[2])
      continue
    }
    const body = /^(\d{3})    (.*)$/.exec(raw)
    if (!body) continue
    const content = body[2].trim()
    if (!content) continue
    if (speaker === 1) {
      sequence += 1
      current = { number: sequence, speaker: 'consultant', text: content, students: [] }
      turns.set(sequence, current)
    } else if (speaker === 2 && current) {
      current.students.push({ speaker: '学生2', text: content })
    }
  }
  return turns
}

function resolveExample(example, july, transcripts) {
  const source = example.source === 'july' ? null : sourceById.get(example.source)
  const resolved = {
    source: example.source,
    sourceLabel:
      example.source === 'july' ? '七月咨询稿' : source?.label ?? example.source,
    from: example.from,
    to: example.to ?? example.from,
    note: example.note ?? '',
    turns: []
  }

  if (example.source === 'july') {
    for (let number = example.from; number <= resolved.to; number += 1) {
      const text = july.get(number)
      if (text) resolved.turns.push({ role: 'consultant', speaker: '咨询师', text })
    }
    return resolved
  }

  const turns = transcripts.get(example.source)
  if (!turns) throw new Error(`没有找到逐字稿来源：${example.source}`)
  for (let number = example.from; number <= resolved.to; number += 1) {
    const turn = turns.get(number)
    if (!turn) continue
    resolved.turns.push({ role: 'consultant', speaker: '咨询师', text: turn.text })
    for (const student of turn.students) {
      resolved.turns.push({ role: 'student', speaker: student.speaker, text: student.text })
    }
  }
  return resolved
}

function resolveNode(node, july, transcripts, trail = []) {
  const resolved = {
    ...node,
    path: [...trail, node.id],
    examples: (node.examples ?? [])
      .map((example) => resolveExample(example, july, transcripts))
      .filter((example) => example.turns.length > 0),
    butterflies: (node.butterflies ?? []).map((butterfly) =>
      resolveNode(butterfly, july, transcripts, [...trail, node.id])
    ),
    children: (node.children ?? []).map((child) =>
      resolveNode(child, july, transcripts, [...trail, node.id])
    )
  }
  return resolved
}

// 把额外成交稿的片段挂到现有目的上。新增稿件只需要在 sources.mjs 里加映射。
function applySourceMappings(root, season, july, transcripts) {
  const byPurposeKey = new Map()
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()
    if (node.purposeKey) byPurposeKey.set(node.purposeKey, node)
    for (const child of node.children ?? []) stack.push(child)
  }

  for (const source of sources) {
    if (source.season !== season) continue
    for (const mapping of source.mappings) {
      const node = byPurposeKey.get(mapping.purposeKey)
      if (!node) {
        throw new Error(`来源 ${source.id} 映射到了不存在的目的：${mapping.purposeKey}`)
      }
      const example = resolveExample(
        { source: source.id, from: mapping.from, to: mapping.to, note: mapping.note },
        july,
        transcripts
      )
      if (example.turns.length) node.examples.push(example)
    }
  }
}

function collectStats(root) {
  const stats = {
    stages: 0,
    purposes: 0,
    optional: 0,
    gaps: 0,
    incomplete: 0,
    butterflies: 0,
    exampleGroups: 0,
    turns: 0,
    chars: 0
  }

  const visit = (node) => {
    if (node.kind === 'stage') stats.stages += 1
    if (node.kind === 'purpose') {
      stats.purposes += 1
      if (node.optional) stats.optional += 1
      if (node.gap) stats.gaps += 1
      if (node.incomplete) stats.incomplete += 1
    }
    if (node.kind === 'butterfly') stats.butterflies += 1

    for (const example of node.examples ?? []) {
      stats.exampleGroups += 1
      stats.turns += example.turns.length
      for (const turn of example.turns) stats.chars += turn.text.length
    }

    for (const butterfly of node.butterflies ?? []) visit(butterfly)
    for (const child of node.children ?? []) visit(child)
  }

  visit(root)
  return stats
}

const july = parseJuly(listing(julyFile))
const transcripts = new Map(
  sources
    .filter((source) => source.parser === 'transcript')
    .map((source) => [source.id, parseTranscript(listing(path.join(repo, source.file)))])
)

const resolvedTemplates = templates.map((template) => {
  const resolvedTree = resolveNode(
    { ...template.definition, id: 'root', kind: 'root' },
    july,
    transcripts
  )
  applySourceMappings(resolvedTree, template.season, july, transcripts)
  return {
    id: template.id,
    name: template.name,
    season: template.season,
    description: template.description,
    source: template.definition.source,
    stats: collectStats(resolvedTree),
    tree: resolvedTree
  }
})

const payload = {
  meta: {
    title: '咨询树 · 目的骨架',
    generatedAt: new Date().toISOString(),
    note: templates[0]?.definition.note ?? '',
    activeTemplateId: resolvedTemplates[0]?.id ?? ''
  },
  templates: resolvedTemplates
}

fs.writeFileSync(path.join(here, 'output.json'), `${JSON.stringify(payload, null, 2)}\n`)

// 正式页面读取的固定数据文件。生成器仍然只在本地跑，不连接数据库。
const canonicalFile = path.join(repo, 'shared/src/consult-purpose-data.json')
fs.writeFileSync(canonicalFile, `${JSON.stringify(payload)}\n`)

const template = fs.readFileSync(path.join(here, 'preview.template.html'), 'utf8')
const embedded = JSON.stringify(payload).replace(/</g, '\\u003c')
const html = template.replace('__TREE_DATA__', embedded)
fs.writeFileSync(path.join(here, 'preview.html'), html)

console.log(
  `已生成 ${path.relative(repo, path.join(here, 'output.json'))}、${path.relative(
    repo,
    path.join(here, 'preview.html')
  )} 和 ${path.relative(repo, canonicalFile)}`
)
for (const item of resolvedTemplates) {
  const stats = item.stats
  console.log(
    `${item.name}：阶段 ${stats.stages} · 目的 ${stats.purposes}（可选 ${stats.optional}，空缺 ${stats.gaps}）· 蝴蝶 ${stats.butterflies} · 示例组 ${stats.exampleGroups} · 话轮 ${stats.turns}`
  )
}
