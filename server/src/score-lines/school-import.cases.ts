/**
 * CR-005 / T-020：吉林两校服务器导入脚本用例。
 *
 * 覆盖 AC-005-5 / AC-005-6：
 * - 两校官方 fixture 解析：长春工程学院 2 行、长春师范大学 10 行；
 * - dry-run 不创建 / 不迁移 / 不写入数据库；
 * - `--write` 先备份再写 school_programs + program 批次，查询可见；
 * - 重复执行幂等（0 写入 / 12 跳过），approved 不降级；
 * - 院校缺失或解析失败时抛错且不写库。
 *
 * 运行环境：DATA_DIR 指向临时目录；页面由本地 HTTP 服务提供。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  JILIN_SCHOOL_PAGES,
  parseSchoolPage,
  runImport,
  type ImportPageOverride
} from './school-import'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string =>
  fs.readFileSync(path.join(here, 'parsers', '__fixtures__', name), 'utf8')
const ccitPage = JILIN_SCHOOL_PAGES.find((page) => page.key === 'ccit')!
const ccsfuPage = JILIN_SCHOOL_PAGES.find((page) => page.key === 'ccsfu')!

// ---- 纯解析：不碰数据库 ----
const ccit = await parseSchoolPage(ccitPage, {
  content: fixture('ccit.html'),
  contentType: 'text/html; charset=utf-8'
})
assert.equal(ccit.batches.length, 2, '长春工程学院应解析出 2 个专业')
assert.equal(ccit.batches[0].year, 2026)
assert.equal(ccit.batches[0].confidence, 0.9)
assert.deepEqual(ccit.issues, [])
const ccsfu = await parseSchoolPage(ccsfuPage, {
  content: fixture('ccsfu.html'),
  contentType: 'text/html; charset=utf-8'
})
assert.equal(ccsfu.batches.length, 10, '长春师范大学应解析出 10 个专业')
const chinese = ccsfu.batches.find(
  (batch) => batch.programName === '汉语言文学' && batch.degreeType === '两年制'
)
assert.ok(chinese)
assert.equal(chinese.metrics[0].value, 240.51445096)
console.log('✓ 两校 fixture 解析：2 + 10 行，字段与官方一致')

// ---- 本地页面服务 ----
const pages: Record<string, string> = {
  '/ccit.html': fixture('ccit.html'),
  '/ccsfu.html': fixture('ccsfu.html')
}
const server = http.createServer((request, response) => {
  if (request.url === '/403') {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('forbidden')
    return
  }
  const body = pages[request.url ?? '']
  if (!body) {
    response.writeHead(404)
    response.end()
    return
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end(body)
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('本地夹具端口获取失败')
const base = `http://127.0.0.1:${address.port}`
const overrides: Partial<Record<'ccit' | 'ccsfu', ImportPageOverride>> = {
  ccit: { url: `${base}/ccit.html` },
  ccsfu: { url: `${base}/ccsfu.html` }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vesta-jilin-'))
process.env.DATA_DIR = tempDir
process.env.LOG_LEVEL = 'error'
const dbFile = path.join(tempDir, 'vesta.db')
const backupDir = path.join(tempDir, 'backups')

/** 失败路径不得创建 vesta.db / -wal / -shm。 */
function assertNoDbFiles(label: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    assert.ok(!fs.existsSync(`${dbFile}${suffix}`), `${label}：不应存在 vesta.db${suffix}`)
  }
}

try {
  // ---- dry-run 不写库 ----
  const dry = await runImport({ write: false, overrides })
  assert.equal(dry.dryRun, true)
  assert.equal(dry.pages.find((page) => page.key === 'ccit')?.rows.length, 2)
  assert.equal(dry.pages.find((page) => page.key === 'ccsfu')?.rows.length, 10)
  assert.equal(dry.pages.find((page) => page.key === 'ccit')?.rows[0].minimum, 240.5)
  assert.ok(!fs.existsSync(dbFile), 'dry-run 不应创建数据库文件')
  assert.ok(!fs.existsSync(backupDir), 'dry-run 不应创建备份目录')
  console.log('✓ dry-run：2 + 10 行，未创建数据库 / 备份')

  // ---- 解析失败：不写库 ----
  await assert.rejects(
    runImport({
      write: true,
      overrides: {
        ...overrides,
        ccit: { htmlPath: path.join(here, 'parsers', '__fixtures__', 'school-no-header.html') }
      }
    }),
    /解析失败/,
    '无法识别的页面应抛错'
  )
  console.log('✓ 解析失败抛错，不进入写库')
  assertNoDbFiles('解析失败')

  // ---- HTTP 403（WAF）：不写库 ----
  await assert.rejects(
    runImport({
      write: true,
      overrides: { ...overrides, ccit: { url: `${base}/403` } }
    }),
    /HTTP 403/,
    '403 应抛出可操作的 WAF 提示'
  )
  assertNoDbFiles('HTTP 403 失败')
  assert.ok(!fs.existsSync(backupDir), 'HTTP 403 时不应产生备份')
  console.log('✓ HTTP 403 抛错，未创建数据库 / 备份')

  // ---- 全新 DATA_DIR + 院校缺失：不创建 DB 文件 ----
  await assert.rejects(runImport({ write: true, overrides }), /数据库尚未创建/)
  assertNoDbFiles('全新 DATA_DIR 院校缺失')
  assert.ok(!fs.existsSync(backupDir), '院校缺失时不应产生备份')
  console.log('✓ 全新 DATA_DIR 院校缺失：未创建 vesta.db / -wal / -shm')

  // ---- 已有库但院校缺失：只读检查拒绝，不写批次 ----
  const { db } = await import('../db')
  await assert.rejects(runImport({ write: true, overrides }), /院校未导入/)
  assert.ok(!fs.existsSync(backupDir), '院校缺失时不应产生备份')
  const emptyCount = Number(
    (db.prepare('SELECT COUNT(*) AS count FROM scoreline_batches').get() as { count: number }).count
  )
  assert.equal(emptyCount, 0, '院校缺失时不应写批次')
  console.log('✓ 已有库但院校缺失：拒绝且未写批次')

  // 写入两校院校主表。
  const at = new Date().toISOString()
  const insertSchool = db.prepare(
    `INSERT INTO schools (id, code, name, province, city, level, nature, tags,
       official_url, graduate_url, admissions_url, status, created_at, updated_at)
     VALUES (?, '', ?, '吉林', '长春', '本科', '', '[]', '', '', '', 'active', ?, ?)`
  )
  insertSchool.run('sch_ccit', '长春工程学院', at, at)
  insertSchool.run('sch_ccsfu', '长春师范大学', at, at)

  // ---- --write：备份 + 写入 ----
  const first = await runImport({ write: true, overrides })
  assert.equal(first.written, 12, '首轮应写入 2 + 10 条批次')
  assert.equal(first.skipped, 0)
  assert.equal(first.backupSkipped, false)
  assert.ok(first.backup && fs.existsSync(first.backup), '写库前应生成备份文件')
  assert.ok(fs.existsSync(dbFile), '写库后数据库文件应存在')

  const { listPrograms } = await import('./program-store')
  const { queryScoreLines } = await import('./query')
  const ccitPrograms = listPrograms({ schoolId: 'sch_ccit', year: 2026, exam: 'upgrade' })
  const ccsfuPrograms = listPrograms({ schoolId: 'sch_ccsfu', year: 2026, exam: 'upgrade' })
  assert.equal(ccitPrograms.length, 2)
  assert.equal(ccsfuPrograms.length, 10)
  assert.ok(ccitPrograms.every((program) => program.reviewStatus === 'approved'))
  const engineering = ccitPrograms.find((program) => program.majorName === '工程管理')
  assert.ok(engineering)
  const programLine = queryScoreLines({
    exam: 'upgrade',
    year: 2026,
    province: '吉林',
    schoolId: 'sch_ccit',
    programId: engineering.id
  })
  assert.ok(programLine.programLine, '查询应返回专业线')
  assert.equal(
    programLine.programLine?.years.find((year) => year.year === 2026)?.metrics[0].value,
    240.5
  )
  const chineseProgram = ccsfuPrograms.find(
    (program) => program.majorName === '汉语言文学' && program.degreeType === '两年制'
  )
  assert.ok(chineseProgram)
  const chineseLine = queryScoreLines({
    exam: 'upgrade',
    year: 2026,
    province: '吉林',
    schoolId: 'sch_ccsfu',
    programId: chineseProgram.id
  })
  assert.equal(
    chineseLine.programLine?.years.find((year) => year.year === 2026)?.metrics[0].value,
    240.51445096
  )
  const batchRow = db
    .prepare(
      "SELECT review_status FROM scoreline_batches WHERE school_id = 'sch_ccit' AND program_id = ? AND year = 2026"
    )
    .get(engineering.id) as { review_status: string } | undefined
  assert.equal(batchRow?.review_status, 'approved', 'confidence 0.9 应写入 approved')
  const coverage = db
    .prepare(
      "SELECT status, program_line FROM school_coverage WHERE school_id = 'sch_ccit' AND exam = 'upgrade' AND year = 2026"
    )
    .get() as { status: string; program_line: number } | undefined
  assert.ok(coverage, '写库后应刷新院校覆盖')
  assert.equal(Number(coverage?.program_line), 1, '覆盖统计应看到专业线')
  console.log('✓ --write：备份 + 12 条批次，查询可见 240.5 / 240.51445096，覆盖已刷新')

  // ---- 重复执行幂等；全部跳过时不生成新备份 ----
  const backupCount = (): number =>
    fs.existsSync(backupDir) ? fs.readdirSync(backupDir).filter((name) => name.endsWith('.db')).length : 0
  const backupsBefore = backupCount()
  assert.equal(backupsBefore, 1, '首轮应只有一份备份')
  const second = await runImport({ write: true, overrides })
  assert.equal(second.written, 0, '内容未变不应重复写批次')
  assert.equal(second.skipped, 12, '重复执行应全部跳过')
  assert.equal(second.backup, '', '全部跳过时不应生成备份路径')
  assert.equal(second.backupSkipped, true, '全部跳过时应标记跳过备份')
  assert.equal(backupCount(), backupsBefore, '重复执行不应新增备份文件')
  const programCount = Number(
    (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM school_programs WHERE school_id IN ('sch_ccit', 'sch_ccsfu') AND year = 2026"
        )
        .get() as { count: number }
    ).count
  )
  const batchCount = Number(
    (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM scoreline_batches WHERE school_id IN ('sch_ccit', 'sch_ccsfu') AND scope = 'program' AND year = 2026"
        )
        .get() as { count: number }
    ).count
  )
  assert.equal(programCount, 12, '重复执行不应新增招生计划')
  assert.equal(batchCount, 12, '重复执行不应新增批次')
  assert.equal(
    (
      db.prepare('SELECT review_status FROM scoreline_batches WHERE id = ?').get(
        (
          db
            .prepare(
              "SELECT id FROM scoreline_batches WHERE school_id = 'sch_ccit' AND program_id = ? AND year = 2026"
            )
            .get(engineering.id) as { id: string }
        ).id
      ) as { review_status: string }
    ).review_status,
    'approved',
    '重复执行不降级 approved'
  )
  console.log('✓ 重复执行幂等：0 写入 / 12 跳过，不新增备份，approved 不降级')

  db.close()
  console.log('\n吉林两校导入脚本用例全部通过')
} finally {
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  try {
    const { db } = await import('../db/connection')
    db.close()
  } catch {
    // 某些分支没有打开数据库。
  }
  fs.rmSync(tempDir, { recursive: true, force: true })
}
