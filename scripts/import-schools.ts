/**
 * 导入教育部《全国高等学校名单》（CSV / XLSX）。
 *
 * 用法：
 *   npx tsx scripts/import-schools.ts data/imports/schools-2025.xlsx --dry-run
 *   npx tsx scripts/import-schools.ts data/imports/schools-2025.xlsx
 *
 * 只做新增 / 更新，不删除旧学校；停办 / 合并需要另做状态维护。
 */
import fs from 'node:fs'
import XLSX from 'xlsx'
import { normalizeProvince, provinceNames } from '../shared/src/score-line-region'

const args = process.argv.slice(2)
const file = args.find((arg) => !arg.startsWith('--'))
const dryRun = args.includes('--dry-run')

if (!file) {
  console.error('用法：npx tsx scripts/import-schools.ts <名单.csv|xlsx> [--dry-run]')
  process.exit(1)
}
if (!fs.existsSync(file)) {
  console.error(`文件不存在：${file}`)
  process.exit(1)
}

interface SchoolRowInput {
  name: string
  code: string
  province: string
  city: string
  level: string
  note: string
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function parseCity(raw: string): string {
  const text = raw.replace(/\s+/g, '')
  const afterSeparator = /[-—/]/.exec(text)
  if (afterSeparator) return text.slice(afterSeparator.index + 1)
  const province = provinceNames.find((name) => text.startsWith(name))
  if (!province) return ''
  return text.slice(province.length).replace(/^省|^市|^自治区/, '').replace(/市$/, '')
}

const workbook = /\.csv$/i.test(file)
  ? XLSX.read(fs.readFileSync(file, 'utf8'), { type: 'string' })
  : XLSX.readFile(file)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]
if (rows.length === 0) {
  console.error('名单里没有数据行')
  process.exit(1)
}

const parsed: SchoolRowInput[] = []
const seen = new Set<string>()
let invalid = 0
for (const row of rows) {
  const name = pick(row, ['学校名称', '学校名', '院校名称', '名称', 'name'])
  const provinceRaw = pick(row, ['所在地', '省份', '省', '所在省份', 'province'])
  const code = pick(row, ['学校标识码', '标识码', '学校代码', '代码', 'code'])
  const levelRaw = pick(row, ['办学层次', '层次', 'level'])
  const cityRaw = pick(row, ['城市', '地市', '所在城市', 'city'])
  const note = pick(row, ['主管部门', '备注', 'note'])
  const province =
    normalizeProvince(provinceRaw) ||
    normalizeProvince(provinceRaw.split(/[-—/]/)[0] ?? '')
  if (!name || !province) {
    invalid += 1
    continue
  }
  const key = `${name}|${province}`
  if (seen.has(key)) continue
  seen.add(key)
  parsed.push({
    name,
    code,
    province,
    city: parseCity(cityRaw || provinceRaw),
    level: /专科|高职|职业/.test(levelRaw) ? '专科' : /本科/.test(levelRaw) ? '本科' : levelRaw,
    note
  })
}

const byProvince = new Map<string, number>()
const byLevel = new Map<string, number>()
for (const school of parsed) {
  byProvince.set(school.province, (byProvince.get(school.province) ?? 0) + 1)
  byLevel.set(school.level || '未标注', (byLevel.get(school.level || '未标注') ?? 0) + 1)
}
const coveredProvinces = [...byProvince.keys()].filter((province) => provinceNames.includes(province))

console.log(`读取 ${rows.length} 行，可导入 ${parsed.length} 所，跳过 ${invalid} 行（缺校名或省份）`)
console.log(`覆盖 ${coveredProvinces.length}/${provinceNames.length} 个省级地区`)
console.log(`层次：${[...byLevel.entries()].map(([key, value]) => `${key} ${value}`).join(' · ')}`)
const missing = provinceNames.filter((province) => !byProvince.has(province))
if (missing.length) console.log(`缺少学校记录的省份：${missing.join('、')}`)

if (dryRun) {
  console.log('dry-run：未写数据库')
  process.exit(0)
}

await import('../server/src/db')
const { upsertSchool } = await import('../server/src/score-lines/store')
let created = 0
let updated = 0
for (const school of parsed) {
  const result = upsertSchool({
    name: school.name,
    code: school.code,
    province: school.province,
    city: school.city,
    level: school.level,
    officialUrl: '',
    tags: []
  })
  if (result.created) created += 1
  else updated += 1
}
console.log(`导入完成：新增 ${created} 所，更新 ${updated} 所`)
