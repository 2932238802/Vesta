/**
 * 分数线数据应用脚本（服务器侧）的 CLI 入口。
 *
 * 用途：把 `data/exports/` 下的导出文件写入服务器 SQLite，只碰分数线四类表。
 *
 * 用法：
 *   npx tsx scripts/scoreline-data.ts apply --dir=data/exports --dry-run
 *   npx tsx scripts/scoreline-data.ts apply --dir=data/exports --write
 *   npx tsx scripts/scoreline-data.ts apply --file=data/exports/henan-2026-upgrade-line.json --write
 *
 * 约定：默认 dry-run，`--write` 才落库并自动 `VACUUM INTO` 备份；
 * 冲突默认服务器优先，`--overwrite` 才覆盖服务器 approved / rejected 同键批次。
 * 文件搬运仍需手工 `scp`：`data/` 不入库，`update.sh` 只拉代码。
 */

import fs from 'node:fs'
import path from 'node:path'
import { db, dbPath } from '../server/src/db/connection'
import {
  applyExportFile,
  createStats,
  hardErrorCount,
  printSummary,
  ProgramResolver
} from './scoreline-apply'

/** `--dir` 下的导出文件；docs 7.24 的转载对照文件明确不入库。 */
function jsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const comparisonOnly = new Set(['jiangsu-2026-school-line.json'])
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('apply-report-') && !comparisonOnly.has(name))
    .map((name) => path.join(dir, name))
}

function collectFiles(args: string[]): string[] {
  const files: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg.startsWith('--file=')) files.push(arg.slice('--file='.length))
    else if (arg === '--file' && args[index + 1]) files.push(args[++index])
    else if (arg.startsWith('--dir=')) files.push(...jsonFiles(arg.slice('--dir='.length)))
    else if (arg === '--dir' && args[index + 1]) files.push(...jsonFiles(args[++index]))
  }
  return [...new Set(files)].filter((file) => fs.existsSync(file))
}

function backupDatabase(): string {
  const backupDir = path.join(path.dirname(dbPath), 'backups')
  fs.mkdirSync(backupDir, { recursive: true })
  const backup = path.join(backupDir, `vesta-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.db`)
  db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`)
  return backup
}

function usage(): never {
  console.error('用法：npx tsx scripts/scoreline-data.ts apply --dir=data/exports [--dry-run|--write] [--overwrite] [--report=PATH]')
  process.exit(2)
}

const args = process.argv.slice(2)
if (args[0] !== 'apply') usage()
const options = {
  write: args.includes('--write'),
  overwrite: args.includes('--overwrite')
}
const reportArg = args.find((arg) => arg.startsWith('--report='))
const reportPath = reportArg ? reportArg.slice('--report='.length) : ''
const files = collectFiles(args)
if (files.length === 0) {
  console.error('没有找到可应用的 JSON 文件。请用 --dir= 或 --file= 指定。')
  process.exit(1)
}

if (options.write) console.log(`已备份：${backupDatabase()}`)

const stats = createStats()
const resolver = new ProgramResolver(options.write, stats)
for (const file of files) applyExportFile(file, options, stats, resolver)

printSummary(stats, reportPath)
if (stats.conflicts.length) {
  console.warn(`\n有 ${stats.conflicts.length} 条同键冲突未写入；确认要以本地覆盖时加 --overwrite。`)
}
process.exit(hardErrorCount(stats) > 0 ? 1 : 0)
