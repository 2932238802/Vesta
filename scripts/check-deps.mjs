#!/usr/bin/env node
// 依赖版本不变量守卫：只校验本地口径，不联网、不追 latest。
// 规则见 docs/archive/20261114/5-依赖版本漂移-修复方案.md §2.4。
// 用法：npm run check:deps（也包含在 npm run verify 里）
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(rel) {
  const file = resolve(root, rel)
  if (!existsSync(file)) {
    console.error(`❌ 缺少文件：${rel}`)
    process.exit(1)
  }
  return readFileSync(file, 'utf8')
}

function readJson(rel) {
  try {
    return JSON.parse(read(rel))
  } catch (error) {
    console.error(`❌ ${rel} 无法解析为 JSON：${error.message}`)
    process.exit(1)
  }
}

/** 从声明范围里取第一个数字作为 major：`^24.19.2` → 24、`>=24.0.0` → 24。 */
function majorOf(range) {
  if (typeof range !== 'string') return null
  const match = /(\d+)/.exec(range)
  return match ? Number(match[1]) : null
}

/** 先找根，再找 workspace 的 node_modules；workspace 嵌套依赖也能读到。 */
function installedVersion(name) {
  for (const base of [root, resolve(root, 'server'), resolve(root, 'web')]) {
    const file = resolve(base, 'node_modules', name, 'package.json')
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).version
  }
  return ''
}

function installedMajor(name) {
  const version = installedVersion(name)
  return version ? majorOf(version) : null
}

const rootPkg = readJson('package.json')
const serverPkg = readJson('server/package.json')
const webPkg = readJson('web/package.json')
const nodeVersion = read('.node-version').trim()
const runtimeMajor = majorOf(nodeVersion)
const problems = []

if (runtimeMajor === null) {
  problems.push(`.node-version=${JSON.stringify(nodeVersion)} 不是可识别的 Node major`)
}

const enginesMajor = majorOf(rootPkg.engines?.node)
if (enginesMajor !== runtimeMajor) {
  problems.push(
    `package.json engines.node=${JSON.stringify(rootPkg.engines?.node)} major=${enginesMajor ?? '无法识别'}，应与 .node-version=${nodeVersion} 的 major ${runtimeMajor} 一致`
  )
}

const actualMajor = Number(process.versions.node.split('.')[0])
if (actualMajor !== runtimeMajor) {
  problems.push(
    `当前 Node ${process.versions.node} major=${actualMajor} 与 .node-version=${nodeVersion} 不一致；请先切到 Node ${runtimeMajor}`
  )
}

const typesNodeRange = serverPkg.devDependencies?.['@types/node']
const typesNodeMajor = majorOf(typesNodeRange)
if (typesNodeMajor !== runtimeMajor) {
  problems.push(
    `server/package.json @types/node=${JSON.stringify(typesNodeRange)} major=${typesNodeMajor ?? '无法识别'}，应与运行时 Node major ${runtimeMajor} 一致（写 ^${runtimeMajor}）`
  )
}
const installedTypesNodeMajor = installedMajor('@types/node')
if (installedTypesNodeMajor !== runtimeMajor) {
  problems.push(
    `已安装 @types/node@${installedVersion('@types/node') || '未安装'} major=${installedTypesNodeMajor ?? '未安装'}，应与运行时 Node major ${runtimeMajor} 一致（检查 lockfile / npm ci）`
  )
}

const expressRange = serverPkg.dependencies?.express
const expressMajor = majorOf(expressRange)
const typesExpressRange = serverPkg.devDependencies?.['@types/express']
const typesExpressMajor = majorOf(typesExpressRange)
if (expressMajor !== typesExpressMajor) {
  problems.push(
    `server/package.json express=${JSON.stringify(expressRange)} major=${expressMajor ?? '无法识别'} 与 @types/express=${JSON.stringify(typesExpressRange)} major=${typesExpressMajor ?? '无法识别'} 不同 major`
  )
}
const installedExpressMajor = installedMajor('express')
const installedTypesExpressMajor = installedMajor('@types/express')
if (installedExpressMajor !== installedTypesExpressMajor) {
  problems.push(
    `已安装 express@${installedVersion('express') || '未安装'} 与 @types/express@${installedVersion('@types/express') || '未安装'} 不同 major`
  )
}

const rows = [
  ['concurrently', rootPkg.devDependencies?.concurrently],
  ['tsx', rootPkg.devDependencies?.tsx],
  ['express', serverPkg.dependencies?.express],
  ['@types/express', serverPkg.devDependencies?.['@types/express']],
  ['@types/node', serverPkg.devDependencies?.['@types/node']],
  ['typescript', serverPkg.devDependencies?.typescript],
  ['compression', serverPkg.dependencies?.compression],
  ['xlsx', serverPkg.dependencies?.xlsx],
  ['vite', webPkg.devDependencies?.vite],
  ['@vitejs/plugin-vue', webPkg.devDependencies?.['@vitejs/plugin-vue']],
  ['vue', webPkg.dependencies?.vue],
  ['vue-router', webPkg.dependencies?.['vue-router']]
]
console.log('依赖版本一览（仅信息输出，不判失败）：')
for (const [name, declared] of rows) {
  const installed = installedVersion(name)
  console.log(
    `  ${name.padEnd(20)} declared=${String(declared ?? '—').padEnd(16)} installed=${installed || '未安装'}`
  )
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`❌ ${problem}`)
  process.exit(1)
}
console.log(
  `✓ 依赖不变量通过：Node ${nodeVersion} / @types/node major ${runtimeMajor} / express 与 @types/express 同 major`
)
