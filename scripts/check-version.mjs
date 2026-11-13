#!/usr/bin/env node
// 版本号一致性守卫：根 package.json 的 version 必须与 docs 里的最高产品版本对齐。
// 规则见 docs/archive/20261113/9-版本号同步与工程元数据规范-开发文档.md §3.1 / §3.2。
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

// 1. 根 package.json：MAJOR.MINOR.PATCH，major 恒为 1、patch 恒为 0
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
if (major !== 1) fail(`package.json 的 version=${version}：产品大版本必须是 1（不进位到 v2）`)
if (patch !== 0) fail(`package.json 的 version=${version}：patch 必须恒为 0，产品版本只递增 minor`)

// 2. docs/README.md「已完成」行的最大 v1.<n>
const readme = read('docs/README.md')
const completedLine = readme
  .split('\n')
  .find((line) => line.includes('已完成：'))
if (!completedLine) {
  fail('docs/README.md 找不到「已完成：」行——版本记录一行被改坏了，请恢复「已完成：v1.xx …」写法')
}
// 只取「已完成：」到「；」/「后续」之间的内容，避免把「后续从 v1.72 继续递增」算成已完成版本
const completedPart = completedLine
  .slice(completedLine.indexOf('已完成：') + '已完成：'.length)
  .split(/；|后续/)[0]
const docVersions = [...completedPart.matchAll(/v1\.(\d+)/g)].map((m) => Number(m[1]))
if (docVersions.length === 0) {
  fail('docs/README.md 的「已完成」行里没有任何 v1.<数字>，无法比对版本')
}
const docMax = Math.max(...docVersions)

if (minor < docMax) {
  fail(
    `版本不一致：package.json=${version}（v1.${minor}），docs/README.md 最高已到 v1.${docMax}——package.json 落后`
  )
}
if (minor > docMax + 1) {
  fail(
    `版本不一致：package.json=${version}（v1.${minor}），docs/README.md 最高只到 v1.${docMax}——只允许领先 1 个版本`
  )
}

// 3. docs/development-history.md 本轮（第一个 ## 本轮）小节的最大版本不得大于 README
const history = read('docs/development-history.md')
const historyLines = history.split('\n')
const roundStart = historyLines.findIndex((line) => line.startsWith('## 本轮（'))
if (roundStart === -1) {
  fail('docs/development-history.md 找不到「## 本轮（YYYY-MM-DD）」小节，无法核对本轮版本')
}
let roundEnd = historyLines.findIndex((line, i) => i > roundStart && line.startsWith('## '))
if (roundEnd === -1) roundEnd = historyLines.length
const roundText = historyLines.slice(roundStart, roundEnd).join('\n')
const roundVersions = [...roundText.matchAll(/v1\.(\d+)/g)].map((m) => Number(m[1]))
if (roundVersions.length > 0) {
  const roundMax = Math.max(...roundVersions)
  if (roundMax > docMax) {
    fail(
      `版本不一致：docs/development-history.md 本轮出现 v1.${roundMax}，docs/README.md「已完成」最高只到 v1.${docMax}`
    )
  }
}

if (minor === docMax + 1) {
  console.log(
    `提示：package.json=${version}（v1.${minor}）比 docs/README.md 最高 v1.${docMax} 领先 1 个版本——本轮已升版本，提交前记得把文档写完`
  )
} else {
  console.log(`✓ 版本一致：package.json=${version} ↔ docs/README.md 最高 v1.${docMax}`)
}
if (roundVersions.length === 0) {
  console.log('提示：development-history.md 本轮小节没有写产品版本号')
}
