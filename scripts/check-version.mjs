#!/usr/bin/env node
// 版本号一致性守卫：根 package.json 的 version 必须与 docs 里的最高产品版本对齐。
// 规则见 docs/archive/20261113/9-版本号同步与工程元数据规范-开发文档.md §3.1 / §3.2。
// v2.0 起允许 major 递增，patch 恒为 0；产品版本 v<major>.<minor> ↔ <major>.<minor>.0。
// 用法：npm run check:version（也包含在 npm run verify 里）
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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

// 把 major.minor 编码成可比较的序号。前提：产品 minor < 1000（当前按小版本递增），
// 因此 major 之间留 1000 个位置；跨大版本时 v1.99 → v2.0 仍然相邻。
function versionKey(major, minor) {
  return major * 1000 + minor
}

function describe(version) {
  return `v${version.major}.${version.minor}`
}

function maxVersion(versions) {
  return versions.reduce((max, current) =>
    versionKey(current.major, current.minor) > versionKey(max.major, max.minor) ? current : max
  )
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

// 2. docs/reference/README.md「已完成」行的最大 v<major>.<minor>
const readme = read('docs/reference/README.md')
const completedLine = readme
  .split('\n')
  .find((line) => line.includes('已完成：'))
if (!completedLine) {
  fail('docs/reference/README.md 找不到「已完成：」行——版本记录一行被改坏了，请恢复「已完成：vX.Y …」写法')
}
// 取「已完成：」到「后续」之间的内容，排除「后续从 vX.Y 继续递增」这类未来版本
const completedPart = completedLine
  .slice(completedLine.indexOf('已完成：') + '已完成：'.length)
  .split('后续')[0]
const docVersions = [...completedPart.matchAll(/v(\d+)\.(\d+)/g)].map((m) => ({
  major: Number(m[1]),
  minor: Number(m[2])
}))
if (docVersions.length === 0) {
  fail('docs/reference/README.md 的「已完成」行里没有任何 v<major>.<minor>，无法比对版本')
}
const docMax = maxVersion(docVersions)
const pkgVersion = { major, minor }
const diff = versionKey(major, minor) - versionKey(docMax.major, docMax.minor)

if (diff < 0) {
  fail(
    `版本不一致：package.json=${version}（${describe(pkgVersion)}），docs/reference/README.md 最高已到 ${describe(docMax)}——package.json 落后`
  )
}
if (diff > 1) {
  fail(
    `版本不一致：package.json=${version}（${describe(pkgVersion)}），docs/reference/README.md 最高只到 ${describe(docMax)}——只允许 package 领先 1 个版本`
  )
}

// 3. docs/reference/development-history.md 本轮（第一个 ## 本轮）小节的最大版本不得大于 README
const history = read('docs/reference/development-history.md')
const historyLines = history.split('\n')
const roundStart = historyLines.findIndex((line) => line.startsWith('## 本轮（'))
if (roundStart === -1) {
  fail('docs/reference/development-history.md 找不到「## 本轮（YYYY-MM-DD）」小节，无法核对本轮版本')
}
let roundEnd = historyLines.findIndex((line, i) => i > roundStart && line.startsWith('## '))
if (roundEnd === -1) roundEnd = historyLines.length
const roundText = historyLines.slice(roundStart, roundEnd).join('\n')
const roundVersions = [...roundText.matchAll(/v(\d+)\.(\d+)/g)].map((m) => ({
  major: Number(m[1]),
  minor: Number(m[2])
}))
if (roundVersions.length > 0) {
  const roundMax = maxVersion(roundVersions)
  if (versionKey(roundMax.major, roundMax.minor) > versionKey(docMax.major, docMax.minor)) {
    fail(
      `版本不一致：docs/reference/development-history.md 本轮出现 ${describe(roundMax)}，docs/reference/README.md「已完成」最高只到 ${describe(docMax)}`
    )
  }
}

if (diff === 1) {
  console.log(
    `提示：package.json=${version}（${describe(pkgVersion)}）比 docs/reference/README.md 最高 ${describe(docMax)} 领先 1 个版本——本轮已升版本，提交前记得把文档写完`
  )
} else {
  console.log(`✓ 版本一致：package.json=${version} ↔ docs/reference/README.md 最高 ${describe(docMax)}`)
}
if (roundVersions.length === 0) {
  console.log('提示：development-history.md 本轮小节没有写产品版本号')
}
