#!/usr/bin/env node
// 文件规模守卫：现有超大文件用基线「只减不增」，新文件一律不超过 400 行。
// 用法：npm run check:size（也包含在 npm run verify 里）
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scanRoots = ['server/src', 'shared/src', 'web/src']
const SOFT_LINE = 600
const HARD_LINE = 800
const NEW_FILE_HARD_LINE = 400
const BLOCK_SOFT_LINE = 400
const BLOCK_HARD_LINE = 600

function gitList(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

const tracked = new Set(gitList(['ls-files']))
const added = new Set([
  ...gitList(['ls-files', '--others', '--exclude-standard']),
  ...gitList(['diff', '--cached', '--name-only', '--diff-filter=A'])
])

function isNewFile(relPath) {
  return !tracked.has(relPath) || added.has(relPath)
}

function walk(dir, output = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(absolute, output)
      continue
    }
    if (!/\.(ts|vue)$/.test(entry.name) || /\.cases\.ts$/.test(entry.name)) continue
    output.push(absolute)
  }
  return output
}

function lineCount(text) {
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

function vueBlocks(text) {
  const blocks = []
  let current = null
  let start = 0
  text.split('\n').forEach((line, index) => {
    const open = /^<(template|script|style)(\s|>|$)/.exec(line)
    if (open && !current) {
      current = open[1]
      start = index + 1
      return
    }
    if (/^<\/(template|script|style)>/.test(line) && current) {
      blocks.push({ name: current, lines: index - start })
      current = null
    }
  })
  return blocks
}

let baseline
try {
  baseline = JSON.parse(readFileSync(join(root, 'scripts/file-size-baseline.json'), 'utf8'))
} catch {
  console.error('❌ 无法读取或解析 scripts/file-size-baseline.json')
  process.exit(1)
}

const problems = []
const hints = []
const files = scanRoots.flatMap((dir) => walk(join(root, dir))).sort()
const seenBaselineKeys = new Set()

for (const absolute of files) {
  const relPath = relative(root, absolute).replace(/\\/g, '/')
  const text = readFileSync(absolute, 'utf8')
  const lines = lineCount(text)
  const allowed = baseline[relPath]
  if (allowed !== undefined) seenBaselineKeys.add(relPath)

  if (allowed !== undefined) {
    if (lines > allowed) {
      problems.push(
        `❌ ${relPath} ${lines} 行 > 基线 ${allowed} 行（超出 ${lines - allowed} 行）`
      )
    } else if (lines < allowed) {
      hints.push(`· ${relPath} 已低于基线（${lines} / ${allowed}），可下调基线`)
    }
  } else {
    const limit = isNewFile(relPath) ? NEW_FILE_HARD_LINE : HARD_LINE
    if (lines > limit) {
      problems.push(
        `❌ ${relPath} ${lines} 行 > ${isNewFile(relPath) ? '新增文件硬线' : '硬线'} ${limit} 行`
      )
    } else if (lines > SOFT_LINE) {
      hints.push(`· ${relPath} 超过 ${SOFT_LINE} 行软线（${lines}），加功能前先拆`)
    }
  }

  if (!relPath.endsWith('.vue')) continue
  for (const block of vueBlocks(text)) {
    const key = `${relPath}#${block.name}`
    const blockAllowed = baseline[key]
    if (blockAllowed !== undefined) seenBaselineKeys.add(key)
    const limit = blockAllowed ?? BLOCK_HARD_LINE
    if (block.lines > limit) {
      problems.push(
        `❌ ${key} ${block.lines} 行 > ${blockAllowed !== undefined ? '基线' : '硬线'} ${limit} 行`
      )
    } else if (blockAllowed !== undefined && block.lines < blockAllowed) {
      hints.push(`· ${key} 已低于基线（${block.lines} / ${blockAllowed}），可下调或删除`)
    } else if (block.lines > BLOCK_SOFT_LINE) {
      hints.push(`· ${key} 超过 ${BLOCK_SOFT_LINE} 行软线（${block.lines}），继续拆时下调基线`)
    }
  }
}

for (const key of Object.keys(baseline)) {
  if (!seenBaselineKeys.has(key)) {
    hints.push(`· 基线里的 ${key} 已不存在或被跳过，可删除`)
  }
}

for (const hint of hints) console.log(hint)
if (problems.length > 0) {
  console.error('\n✗ 文件规模检查未通过：')
  for (const problem of problems) console.error(`  ${problem}`)
  console.error(
    '\n规则：现有超大文件只能往下拆并下调基线；新文件不超过 400 行。见 AGENTS.md「文件规模」。'
  )
  process.exit(1)
}

console.log(
  `\n文件规模检查通过：${files.length} 个文件，${Object.keys(baseline).length} 条基线。`
)
