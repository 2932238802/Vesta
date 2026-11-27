/**
 * 吉林两校校级线服务器导入脚本（CR-005 / T-020）。
 *
 * 默认 dry-run：只抓取官方页、解析并打印每校专业行，不打开 / 迁移 / 写入数据库。
 * `--write`：解析并整体校验通过后，先 `VACUUM INTO` 备份，再 upsert
 * `school_programs` + `scope='program'` 批次（approved，confidence 0.9）并刷新覆盖。
 *
 * 用法：
 *   npx tsx scripts/import-jilin-school-lines.ts
 *   npx tsx scripts/import-jilin-school-lines.ts --write
 *   npx tsx scripts/import-jilin-school-lines.ts --ccit-html=data/ccit.html --ccsfu-html=data/ccsfu.html --write
 *
 * 选项：
 *   --write              落库（写前自动备份；重复执行幂等）
 *   --ccit-url=<url>     覆盖长春工程学院页面地址（镜像 / 测试）
 *   --ccsfu-url=<url>    覆盖长春师范大学页面地址
 *   --ccit-html=<path>   用本地另存 HTML 代替抓取（WAF 403 时可用）
 *   --ccsfu-html=<path>  同上
 *   --help               显示帮助
 *
 * 退出码：0 成功 / --help；1 抓取、解析、校验或写库失败（失败时不写库）；2 参数错误。
 */

import {
  JILIN_SCHOOL_PAGES,
  runImport,
  type ImportPageOverride,
  type ImportRow,
  type RunImportOptions
} from '../server/src/score-lines/school-import'

function usage(): void {
  console.log(`用法：npx tsx scripts/import-jilin-school-lines.ts [--write] [选项]

默认 dry-run：只抓取 + 解析 + 打印，不打开数据库。
  --write              写入数据库（布尔开关，不接受 =true；写前自动备份；全部跳过时不备份）
  --ccit-url=<url>     覆盖长春工程学院页面地址
  --ccsfu-url=<url>    覆盖长春师范大学页面地址
  --ccit-html=<path>   用本地 HTML 代替抓取长春工程学院页面
  --ccsfu-html=<path>  用本地 HTML 代替抓取长春师范大学页面
  --help               显示本帮助

需要取值的选项可写 --name=value 或 --name value；缺值会报错退出（exit 2）。`)
}

function failArg(message: string): never {
  console.error(message)
  usage()
  process.exit(2)
}

function readOption(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg.startsWith(prefix)) {
      const value = arg.slice(prefix.length)
      if (!value) failArg(`参数 --${name} 缺少取值`)
      return value
    }
    if (arg === `--${name}`) {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) failArg(`参数 --${name} 缺少取值`)
      return value
    }
  }
  return undefined
}

function rowLine(row: ImportRow): string {
  const parts = [String(row.year), row.programCode, row.programName, row.degreeType]
  if (row.planCount !== null) parts.push(`计划 ${row.planCount}`)
  if (row.admitCount !== null) parts.push(`录取 ${row.admitCount}`)
  if (row.maxScore !== null) parts.push(`最高 ${row.maxScore}`)
  parts.push(`最低 ${row.minimum}`)
  return parts.filter(Boolean).join(' · ')
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  usage()
  process.exit(0)
}
const known = new Set([
  '--write',
  '--ccit-url',
  '--ccsfu-url',
  '--ccit-html',
  '--ccsfu-html'
])
const valueOptions = new Set(['--ccit-url', '--ccsfu-url', '--ccit-html', '--ccsfu-html'])
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg.startsWith('--write=')) failArg('--write 不接受取值，请直接使用 --write')
  if (!arg.startsWith('--')) failArg(`未知参数：${arg}`)
  const name = arg.split('=')[0]
  if (!known.has(name)) failArg(`未知参数：${arg}`)
  if (!arg.includes('=') && valueOptions.has(name)) {
    const value = args[index + 1]
    if (!value || value.startsWith('--')) failArg(`参数 ${name} 缺少取值`)
    index += 1
  }
}

const overrides: Partial<Record<'ccit' | 'ccsfu', ImportPageOverride>> = {}
const ccitUrl = readOption(args, 'ccit-url')
const ccsfuUrl = readOption(args, 'ccsfu-url')
const ccitHtml = readOption(args, 'ccit-html')
const ccsfuHtml = readOption(args, 'ccsfu-html')
if (ccitUrl) overrides.ccit = { ...overrides.ccit, url: ccitUrl }
if (ccsfuUrl) overrides.ccsfu = { ...overrides.ccsfu, url: ccsfuUrl }
if (ccitHtml) overrides.ccit = { ...overrides.ccit, htmlPath: ccitHtml }
if (ccsfuHtml) overrides.ccsfu = { ...overrides.ccsfu, htmlPath: ccsfuHtml }

const options: RunImportOptions = { write: args.includes('--write'), overrides }

try {
  const summary = await runImport(options)
  for (const page of summary.pages) {
    console.log(`\n${page.schoolName}（${page.rows.length} 行）· ${page.url}`)
    for (const row of page.rows) console.log(`  ${rowLine(row)}`)
  }
  if (summary.dryRun) {
    console.log('\ndry-run：未打开数据库、未写入。确认无误后加 --write 落库（写前自动备份）。')
  } else if (summary.backupSkipped) {
    console.log('\n内容未变：跳过备份与写入（本次不会改动数据）。')
  } else {
    console.log(
      `\n已备份：${summary.backup}\n写入 ${summary.written} 条，跳过 ${summary.skipped} 条（内容未变或低置信度不覆盖）。`
    )
  }
  const total = summary.pages.reduce((sum, page) => sum + page.rows.length, 0)
  console.log(
    `合计：${JILIN_SCHOOL_PAGES.length} 校 / ${total} 条专业线。`
  )
} catch (error) {
  console.error(`\n导入失败：${(error as Error).message}`)
  process.exit(1)
}
