#!/usr/bin/env node
// 文档一致性守卫：代码里有的题，设计文档必须写；Agent 规则文件必须存在且保留关键小节。
// 用法：npm run check:docs（也包含在 npm run verify 里）
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const passes = []

function read(rel) {
  const p = resolve(root, rel)
  if (!existsSync(p)) {
    problems.push(`缺少文件：${rel}`)
    return ''
  }
  return readFileSync(p, 'utf8')
}

// 1. 必读文件存在
for (const f of ['AGENTS.md', 'docs/agent-rules.md', 'docs/README.md', 'docs/规划自测问卷-设计文档.md']) read(f)

const survey = read('shared/src/survey.ts')
const designDoc = read('docs/规划自测问卷-设计文档.md')
const rules = read('docs/agent-rules.md')
const readme = read('docs/README.md')

// 2. 设计文档覆盖代码里的每一道题（题号 + 题干）
const questionRe = /id:\s*'[^']+'[\s\S]*?code:\s*'(Q\d+a?)'[\s\S]*?title:\s*'([^']*)'/g
const missing = []
let count = 0
let m
while ((m = questionRe.exec(survey)) !== null) {
  const [, code, title] = m
  count += 1
  if (!designDoc.includes(`**${code} `)) missing.push(`${code} 的题号`)
  const stem = title.replace(/[？?]$/, '')
  if (!designDoc.includes(stem)) missing.push(`${code} 的题干「${title}」`)
}
if (count === 0) {
  problems.push('没能从 shared/src/survey.ts 解析出题目，检查解析规则或问卷文件')
} else if (missing.length === 0) {
  passes.push(`问卷 ${count} 个题项都能在设计文档里找到`)
} else {
  for (const item of missing) problems.push(`设计文档缺 ${item}`)
}

// 3. agent 规则保留关键小节
for (const key of ['文档优先', '认证与安全', '数据操作', '运行与验证']) {
  if (rules.includes(key)) passes.push(`agent-rules 含「${key}」`)
  else problems.push(`docs/agent-rules.md 缺少「${key}」小节`)
}

// 4. 设计文档必须声明文档优先
if (designDoc.includes('文档优先')) passes.push('设计文档声明了文档优先')
else problems.push('design docs 顶部缺少「文档优先」声明')

// 5. README 必须索引设计文档
if (readme.includes('规划自测问卷-设计文档')) passes.push('README 已索引设计文档')
else problems.push('docs/README.md 没有索引「规划自测问卷-设计文档」')

for (const line of passes) console.log(`✓ ${line}`)

if (problems.length > 0) {
  console.error('\n✗ 文档一致性检查未通过：')
  for (const p of problems) console.error(`  - ${p}`)
  console.error('\n规则：先改 docs/ 再改代码（见 AGENTS.md「文档优先」）。')
  process.exit(1)
}

console.log('\n文档一致性检查通过。')
