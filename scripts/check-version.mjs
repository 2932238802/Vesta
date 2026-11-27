#!/usr/bin/env node
// 版本号一致性守卫：根 package.json 的 version 必须与 LosAngelousDocs/STATUS.md 的
// 「当前产品版本：v<major>.<minor>」对齐。
// v2.0 起允许 major 递增，patch 恒为 0；产品版本 v<major>.<minor> ↔ <major>.<minor>.0。
// v2.08 起版本源从 docs/reference/README.md 迁到 LosAngelousDocs/STATUS.md（docs/ 已移除）。
// 用法：npm run check:version（也包含在 npm run verify 里）
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STATUS_FILE = 'LosAngelousDocs/STATUS.md'

function read(rel) {
  const p = resolve(root, rel)
  if (!existsSync(p)) {
    console.error(`❌ 缺少文件：${rel}`)
    process.exit(1)
  }
  return readFileSync(p, 'utf8')
}

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function describe(major, minor) {
  // 与后台左下角展示一致：minor 补两位（2.8 → v2.08）。仅影响提示文本，比较仍按数值。
  return `v${major}.${String(minor).padStart(2, '0')}`
}

// 1. 根 package.json：MAJOR.MINOR.PATCH，major >= 1、patch 恒为 0
let pkg
try {
  pkg = JSON.parse(read('package.json'))
} catch (error) {
  fail(`package.json 无法解析为 JSON：${error.message}`)
}
const version = pkg.version
const parsed = typeof version === 'string' ? /^(\d+)\.(\d+)\.(\d+)$/.exec(version) : null
if (!parsed) {
  fail(`package.json 的 version 不是 MAJOR.MINOR.PATCH 形态：${JSON.stringify(version)}`)
}
const major = Number(parsed[1])
const minor = Number(parsed[2])
const patch = Number(parsed[3])
if (major < 1) fail(`package.json 的 version=${version}：major 必须 >= 1`)
if (patch !== 0) {
  fail(`package.json 的 version=${version}：patch 必须恒为 0，产品版本只递增 minor（跨大版本时递增 major）`)
}

// 2. LosAngelousDocs/STATUS.md 的「当前产品版本：v<major>.<minor>」
const status = read(STATUS_FILE)
const statusMatch = /当前产品版本：\s*v(\d+)\.(\d+)/.exec(status)
if (!statusMatch) {
  fail(
    `${STATUS_FILE} 找不到「当前产品版本：v<major>.<minor>」——请把状态面板写成例如「当前产品版本：v${major}.${String(minor).padStart(2, '0')}」`
  )
}
const statusMajor = Number(statusMatch[1])
const statusMinor = Number(statusMatch[2])
const expected = `${statusMajor}.${statusMinor}.0`

if (version !== expected) {
  fail(
    `版本不一致：package.json=${version}，${STATUS_FILE} 当前产品版本=${describe(statusMajor, statusMinor)}（应为 ${expected}）——` +
      `请把 package.json 的 version 改为 ${expected}，或把 ${STATUS_FILE} 的「当前产品版本」改为 ${describe(major, minor)}`
  )
}

console.log(`✓ 版本一致：package.json=${version} ↔ ${STATUS_FILE} 当前产品版本 ${describe(statusMajor, statusMinor)}`)
