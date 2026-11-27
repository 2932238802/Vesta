#!/usr/bin/env node
// 工作流文档一致性守卫。
// 说明：v2.08 起仓库不再保留 `docs/`。原先「shared/src/survey.ts 的每一道题都必须能在
// 问卷设计文档里找到」的问卷覆盖守卫已随 docs/ 一起移除，这是用户明确选择的
// 「直接删除并改引用」方案；不要把这条守卫再当成回归项。
// 当前守卫只校验工作流文档入口（AGENTS / CLAUDE / PROJECT_BRAIN / LosAngelousDocs）存在，
// 且关键指针没有被改丢。
// 用法：npm run check:docs（也包含在 npm run verify 里）
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const passes = []
const files = new Map()

function load(rel) {
  const p = resolve(root, rel)
  if (!existsSync(p)) {
    problems.push(`缺少文件：${rel}`)
    return
  }
  files.set(rel, readFileSync(p, 'utf8'))
  passes.push(`存在 ${rel}`)
}

// 1. 工作流文档入口必须存在
const requiredFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'PROJECT_BRAIN.md',
  'LosAngelousDocs/DOCS_CONTRACT.md',
  'LosAngelousDocs/STATUS.md',
  'LosAngelousDocs/00-requirements-intake.md',
  'LosAngelousDocs/01-requirements.md',
  'LosAngelousDocs/04-tasks.md'
]
for (const rel of requiredFiles) load(rel)

// 2. 关键指针不能被改丢：新 Agent 能从入口找到项目大脑与工作流文档树
function mustInclude(rel, needle, label) {
  const text = files.get(rel)
  if (text === undefined) return
  if (text.includes(needle)) passes.push(`${rel} 含「${label}」`)
  else problems.push(`${rel} 缺少「${label}」指针（应包含 ${needle}）`)
}

mustInclude('AGENTS.md', 'PROJECT_BRAIN.md', 'PROJECT_BRAIN.md')
mustInclude('AGENTS.md', 'LosAngelousDocs', 'LosAngelousDocs')
mustInclude('CLAUDE.md', 'PROJECT_BRAIN.md', 'PROJECT_BRAIN.md')
mustInclude('CLAUDE.md', 'LosAngelousDocs', 'LosAngelousDocs')
mustInclude('PROJECT_BRAIN.md', 'LosAngelousDocs', 'LosAngelousDocs')
mustInclude('LosAngelousDocs/STATUS.md', '当前产品版本', '当前产品版本')

for (const line of passes) console.log(`✓ ${line}`)

if (problems.length > 0) {
  console.error('\n✗ 文档一致性检查未通过：')
  for (const p of problems) console.error(`  - ${p}`)
  console.error('\n规则：工作流文档在 LosAngelousDocs/，开工先读 PROJECT_BRAIN.md（见 AGENTS.md「文档优先」）。')
  process.exit(1)
}

console.log('\n文档一致性检查通过。')
