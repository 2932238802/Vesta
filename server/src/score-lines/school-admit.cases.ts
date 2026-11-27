/**
 * CR-004 吉林校级线试点用例（解析 fixture + 隔离 DATA_DIR 的抓取编排）。
 *
 * 覆盖 AC-004-1 ~ AC-004-4、AC-004-6、AC-004-7：
 * - 两校官方表头解析：长春工程学院 2 行、长春师范大学 10 行，字段数值与 fixture 一致；
 * - 认不出表头返回 unsupported_table，不写伪数据；
 * - 学校未导入时 seed 跳过校级源，导入后写入带 school_id 的源；
 * - 真实 enqueueCrawl / runNext 抓取 → 写 school_programs + program 批次（approved）；
 * - queryScoreLines 选学校 + 专业能看到 programLine 与最低分；重复抓取不重复插行。
 *
 * 运行环境：DATA_DIR 指向临时目录；SCORELINE_CRAWL_ALLOW_PRIVATE=1 允许抓 127.0.0.1。
 * fixture 使用两校官方页面 2026 年真实值（ccit 汇总行按官方「总计 / 共 2 个专业」结构保留）。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { schoolAdmitParser } from './parsers/school-admit'
import type { ParsedBatch, ParserContext } from './parsers/types'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string =>
  fs.readFileSync(path.join(here, 'parsers', '__fixtures__', name), 'utf8')

function parseFixture(name: string, context: ParserContext) {
  return schoolAdmitParser.parse({
    parserId: 'school-admit@1',
    content: fixture(name),
    contentType: 'text/html; charset=utf-8',
    url: context.sourceUrl,
    context
  })
}

function batchOf(batches: ParsedBatch[], majorName: string, degreeType?: string): ParsedBatch {
  const batch = batches.find(
    (item) => item.programName === majorName && (degreeType === undefined || item.degreeType === degreeType)
  )
  assert.ok(batch, `应解析出专业：${majorName}${degreeType ? `（${degreeType}）` : ''}`)
  return batch
}

const ccitContext: ParserContext = {
  sourceId: 'src_upgrade_school_ccit',
  sourceName: '长春工程学院专升本录取分数线',
  sourceUrl: 'https://zsb.ccit.edu.cn/info/1009/1931.htm',
  exam: 'upgrade',
  province: '吉林',
  schoolId: 'sch_ccit',
  schoolName: '长春工程学院'
}
const ccsfuContext: ParserContext = {
  sourceId: 'src_upgrade_school_ccsfu',
  sourceName: '长春师范大学专升本录取分数线',
  sourceUrl: 'https://zhaosheng.ccsfu.edu.cn/info/1171/129250.htm',
  exam: 'upgrade',
  province: '吉林',
  schoolId: 'sch_ccsfu',
  schoolName: '长春师范大学'
}

// AC-004-1：长春工程学院官方真实值（含末尾汇总行，必须跳过）。
const ccit = await parseFixture('ccit.html', ccitContext)
assert.equal(ccit.batches.length, 2, '长春工程学院应有 2 个专业（汇总行不算）')
assert.ok(
  !ccit.batches.some((batch) => /共\s*\d+\s*个专业|总计|合计/.test(batch.programName ?? '')),
  '汇总行不能生成 program'
)
assert.deepEqual(ccit.issues, [], '正常解析不应留下 issue')
// 官方汇总行带可读最低分 240.5：只保留「总计 + 共 2 个专业」这一行也必须 0 批次，
// 证明跳过是显式识别，而不是靠越界读不到分数造成的假绿。
const SUMMARY_HEADER =
  '<tr><th>专业代号</th><th>专业名称</th><th>学制</th><th>计划数</th><th>录取数</th><th>最高分</th><th>最低分</th></tr>'
const SUMMARY_ROW =
  '<tr><td>总计</td><td>共 2 个专业</td><td></td><td>100</td><td>100</td><td>282</td><td>240.5</td></tr>'
const REAL_ROW =
  '<tr><td>206</td><td>工程管理</td><td>两年</td><td>30</td><td>30</td><td>276</td><td>240.5</td></tr>'
assert.ok(fixture('ccit.html').includes(SUMMARY_ROW), 'ccit fixture 汇总行应为官方 7 列（含最低分 240.5）')
const summaryOnly = await schoolAdmitParser.parse({
  parserId: 'school-admit@1',
  content: `<html><head><meta charset="utf-8"><title>长春工程学院2026年专升本录取分数线</title></head><body><table>${SUMMARY_HEADER}${SUMMARY_ROW}${REAL_ROW}</table></body></html>`,
  contentType: 'text/html; charset=utf-8',
  url: ccitContext.sourceUrl,
  context: ccitContext
})
assert.equal(summaryOnly.batches.length, 1, '汇总行即使带可读最低分也必须跳过，只留真实专业行')
assert.equal(summaryOnly.batches[0].programName, '工程管理')
assert.deepEqual(summaryOnly.issues, [], '汇总行是显式跳过，不是靠读不到分数')
for (const batch of ccit.batches) {
  assert.equal(batch.scope, 'program')
  assert.equal(batch.exam, 'upgrade')
  assert.equal(batch.province, '吉林')
  assert.equal(batch.schoolId, 'sch_ccit')
  assert.equal(batch.year, 2026)
  assert.equal(batch.confidence, 0.9)
  assert.equal(batch.category, '两年制')
  assert.equal(batch.degreeType, '两年制')
  const metric = batch.metrics[0]
  assert.equal(metric.subjectCode, 'total')
  assert.equal(metric.isMinimum, true)
  assert.equal(metric.minimumType, 'admit')
  assert.equal(metric.fullScore, null)
}
const engineering = batchOf(ccit.batches, '工程管理')
assert.equal(engineering.programCode, '206')
assert.equal(engineering.planCount, 30)
assert.equal(engineering.admitCount, 30)
assert.equal(engineering.maxScore, 276)
assert.equal(engineering.metrics[0].value, 240.5)
assert.match(engineering.metrics[0].note ?? '', /计划 30/)
assert.match(engineering.metrics[0].note ?? '', /录取 30/)
assert.match(engineering.metrics[0].note ?? '', /最高 276/)
const computer = batchOf(ccit.batches, '计算机科学与技术')
assert.equal(computer.programCode, '215')
assert.equal(computer.planCount, 70)
assert.equal(computer.admitCount, 70)
assert.equal(computer.maxScore, 282)
assert.equal(computer.metrics[0].value, 244)
console.log('✓ AC-004-1 长春工程学院 2 个专业（跳过汇总行）：代号 / 学制 / 计划 / 录取 / 最高 / 最低')

// AC-004-1：长春师范大学 10 个专业，学制写在专业名后缀，需提取并从名称去掉。
const ccsfu = await parseFixture('ccsfu.html', ccsfuContext)
assert.equal(ccsfu.batches.length, 10, '长春师范大学应有 10 个专业')
for (const batch of ccsfu.batches) {
  assert.equal(batch.scope, 'program')
  assert.equal(batch.province, '吉林')
  assert.equal(batch.schoolId, 'sch_ccsfu')
  assert.ok(batch.degreeType === '两年制' || batch.degreeType === '三年制', '学制应从名称后缀提取')
  assert.equal(batch.category, batch.degreeType)
  assert.equal(batch.planCount, null, '无计划列时计划数留空')
  assert.equal(batch.metrics[0].minimumType, 'admit')
  assert.ok(!/[（(].*年/.test(batch.programName ?? ''), 'programName 不能保留学制后缀')
}
const chinese = batchOf(ccsfu.batches, '汉语言文学', '两年制')
assert.equal(chinese.admitCount, 44)
assert.equal(chinese.maxScore, 251.01520099)
assert.equal(chinese.metrics[0].value, 240.51445096)
const chineseThree = batchOf(ccsfu.batches, '汉语言文学', '三年制')
assert.equal(chineseThree.admitCount, 22)
assert.equal(chineseThree.maxScore, 252.01550097)
assert.equal(chineseThree.metrics[0].value, 171.01050066)
assert.notEqual(chinese.degreeType, chineseThree.degreeType, '同名专业按学制拆成两个 program')
const cs = batchOf(ccsfu.batches, '计算机科学与技术', '两年制')
assert.equal(cs.admitCount, 45)
assert.equal(cs.maxScore, 277.51805097)
assert.equal(cs.metrics[0].value, 254.01580096)
const special = batchOf(ccsfu.batches, '特殊教育', '两年制')
assert.equal(special.admitCount, 70)
assert.equal(special.maxScore, 222.51335089)
assert.equal(special.metrics[0].value, 147.00860061)
const primaryTwo = batchOf(ccsfu.batches, '小学教育', '两年制')
assert.equal(primaryTwo.admitCount, 7)
assert.equal(primaryTwo.maxScore, 228.51405088)
assert.equal(primaryTwo.metrics[0].value, 228.51335095)
const preschoolTwo = batchOf(ccsfu.batches, '学前教育', '两年制')
assert.equal(preschoolTwo.admitCount, 25)
assert.equal(preschoolTwo.maxScore, 241.51465095)
assert.equal(preschoolTwo.metrics[0].value, 215.51205095)
const englishTwo = batchOf(ccsfu.batches, '英语', '两年制')
assert.equal(englishTwo.admitCount, 39)
assert.equal(englishTwo.maxScore, 277.518800895)
assert.equal(englishTwo.metrics[0].value, 247.51695078)
const primaryThree = batchOf(ccsfu.batches, '小学教育', '三年制')
assert.equal(primaryThree.admitCount, 22)
assert.equal(primaryThree.maxScore, 243.01440099)
assert.equal(primaryThree.metrics[0].value, 204.51355069)
const preschoolThree = batchOf(ccsfu.batches, '学前教育', '三年制')
assert.equal(preschoolThree.admitCount, 48)
assert.equal(preschoolThree.maxScore, 239.51485091)
assert.equal(preschoolThree.metrics[0].value, 148.50955053)
const englishThree = batchOf(ccsfu.batches, '英语', '三年制')
assert.equal(englishThree.admitCount, 2)
assert.equal(englishThree.maxScore, 230.016250675)
assert.equal(englishThree.metrics[0].value, 228.016250655)
console.log('✓ AC-004-1 长春师范大学 10 个专业：学制后缀提取 + 官方数值')

// AC-004-7：无法识别的表头 → unsupported_table，不产出批次。
const bad = await parseFixture('school-no-header.html', ccitContext)
assert.equal(bad.batches.length, 0, '认不出表头不得写伪数据')
assert.equal(bad.failure?.code, 'unsupported_table')
console.log('✓ AC-004-7 无法识别的表头返回 unsupported_table')

// ---- 隔离 DATA_DIR 的抓取编排 ----
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vesta-cr004-'))
process.env.DATA_DIR = tempDir
process.env.SCORELINE_CRAWL_ALLOW_PRIVATE = '1'
process.env.LOG_LEVEL = 'error'

const pages: Record<string, string> = {
  '/ccit.html': fixture('ccit.html'),
  '/ccsfu.html': fixture('ccsfu.html')
}
const server = http.createServer((request, response) => {
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

const { initSchema } = await import('../db/schema')
const { db } = await import('../db/connection')
const { seedScorelineSources } = await import('./sources')
const { enqueueCrawl, runNext } = await import('./crawl')
const { listPrograms } = await import('./program-store')
const { queryScoreLines } = await import('./query')

const at = new Date().toISOString()
function insertSchool(id: string, name: string, level: string): void {
  db.prepare(
    `INSERT INTO schools (id, code, name, province, city, level, nature, tags,
       official_url, graduate_url, admissions_url, status, created_at, updated_at)
     VALUES (?, '', ?, '吉林', '长春', ?, '', '[]', '', '', '', 'active', ?, ?)`
  ).run(id, name, level, at, at)
}
const countSchoolSources = (): number =>
  Number(
    (
      db
        .prepare("SELECT COUNT(*) AS count FROM scoreline_sources WHERE id LIKE 'src_upgrade_school_%'")
        .get() as { count: number }
    ).count
  )
const runRow = (id: string) =>
  db.prepare('SELECT status, saved, failed FROM crawl_runs WHERE id = ?').get(id) as
    | { status: string; saved: number; failed: number }
    | undefined

try {
  initSchema()

  // AC-004-6：学校未导入时种子跳过校级源（不写空 school_id）。
  seedScorelineSources()
  assert.equal(countSchoolSources(), 0, '学校未收录时不应写入校级源')

  insertSchool('sch_ccit', '长春工程学院', '本科')
  insertSchool('sch_ccsfu', '长春师范大学', '本科')
  insertSchool('sch_junior', '吉林电子信息职业技术学院', '专科')
  seedScorelineSources()
  assert.equal(countSchoolSources(), 2, '学校收录后应写入 2 条校级源')
  const sourceRows = db
    .prepare(
      "SELECT id, school_id, parser_id, province, tier, verified, enabled FROM scoreline_sources WHERE id LIKE 'src_upgrade_school_%' ORDER BY id"
    )
    .all() as unknown as {
    id: string
    school_id: string
    parser_id: string
    province: string
    tier: string
    verified: number
    enabled: number
  }[]
  for (const row of sourceRows) {
    assert.ok(row.school_id, '校级源必须带 school_id')
    assert.equal(row.parser_id, 'school-admit@1')
    assert.equal(row.province, '吉林')
    assert.equal(row.tier, 'T1')
    assert.equal(row.verified, 1)
    assert.equal(row.enabled, 1)
  }
  console.log('✓ AC-004-6 学校缺失跳过、收录后写带 school_id 的校级源')

  // P2-2：管理员把校级源 verified 改成 false 后，重启 seed 不能改回 1。
  db.prepare("UPDATE scoreline_sources SET verified = 0 WHERE id = 'src_upgrade_school_ccit'").run()
  seedScorelineSources()
  const verifiedAfter = db
    .prepare("SELECT verified FROM scoreline_sources WHERE id = 'src_upgrade_school_ccit'")
    .get() as { verified: number } | undefined
  assert.equal(Number(verifiedAfter?.verified), 0, 'seed 重启应保留管理员 verified=false')
  db.prepare("UPDATE scoreline_sources SET verified = 1 WHERE id = 'src_upgrade_school_ccit'").run()
  console.log('✓ P2-2 seed 重启保留管理员 verified=false')

  // 指向本地夹具；关闭其它吉林来源，避免抓真实站点。
  db.prepare(
    "UPDATE scoreline_sources SET enabled = 0 WHERE province = '吉林' AND id NOT LIKE 'src_upgrade_school_%'"
  ).run()
  db.prepare(
    "UPDATE scoreline_sources SET url = ?, entry_url = '', discover_depth = 0 WHERE id = 'src_upgrade_school_ccit'"
  ).run(`${base}/ccit.html`)
  db.prepare(
    "UPDATE scoreline_sources SET url = ?, entry_url = '', discover_depth = 0 WHERE id = 'src_upgrade_school_ccsfu'"
  ).run(`${base}/ccsfu.html`)

  const first = enqueueCrawl({ province: '吉林', years: [2026], trigger: 'manual' })
  assert.ok(!first.code, `应能入队：${first.code ?? ''}`)
  await runNext()
  const firstRun = runRow(first.run.id)
  assert.equal(firstRun?.status, 'success', '首轮抓取应成功')
  assert.equal(Number(firstRun?.saved), 12, '首轮应写入 2 + 10 条 program 批次')
  assert.equal(Number(firstRun?.failed), 0, '首轮不应有失败')

  // AC-004-2：school_programs 行数与字段。
  const ccitPrograms = listPrograms({ schoolId: 'sch_ccit', year: 2026, exam: 'upgrade' })
  const ccsfuPrograms = listPrograms({ schoolId: 'sch_ccsfu', year: 2026, exam: 'upgrade' })
  assert.equal(ccitPrograms.length, 2)
  assert.equal(ccsfuPrograms.length, 10)
  const programEngineering = ccitPrograms.find((program) => program.majorName === '工程管理')
  assert.ok(programEngineering)
  assert.equal(programEngineering.majorCode, '206')
  assert.equal(programEngineering.degreeType, '两年制')
  assert.equal(programEngineering.planCount, 30)
  assert.equal(programEngineering.reviewStatus, 'approved')
  // 长春师范大学同名专业按学制拆成两行：汉语言文学 两年制 / 三年制。
  const chinesePrograms = ccsfuPrograms.filter((program) => program.majorName === '汉语言文学')
  assert.equal(chinesePrograms.length, 2)
  const chineseDegrees = new Set(chinesePrograms.map((program) => program.degreeType))
  assert.ok(chineseDegrees.has('两年制') && chineseDegrees.has('三年制'))

  // AC-004-3：批次 approved，指标只放最低分，note 含计划 / 录取 / 最高。
  const engineeringBatch = db
    .prepare(
      "SELECT id, review_status, scope, category, track FROM scoreline_batches WHERE school_id = 'sch_ccit' AND program_id = ? AND year = 2026"
    )
    .get(programEngineering.id) as
    | { id: string; review_status: string; scope: string; category: string; track: string }
    | undefined
  assert.ok(engineeringBatch)
  assert.equal(engineeringBatch.review_status, 'approved', 'confidence 0.9 应自动 approved')
  assert.equal(engineeringBatch.scope, 'program')
  assert.equal(engineeringBatch.category, '两年制')
  assert.equal(engineeringBatch.track, '')
  const metrics = db
    .prepare('SELECT subject_code, value, is_minimum, minimum_type, note FROM scoreline_metrics WHERE batch_id = ?')
    .all(engineeringBatch.id) as unknown as {
    subject_code: string
    value: number
    is_minimum: number
    minimum_type: string
    note: string
  }[]
  assert.equal(metrics.length, 1, '每个专业只写最低分一个指标')
  assert.equal(metrics[0].subject_code, 'total')
  assert.equal(Number(metrics[0].value), 240.5)
  assert.equal(Number(metrics[0].is_minimum), 1)
  assert.equal(metrics[0].minimum_type, 'admit')
  assert.match(metrics[0].note, /计划 30/)
  assert.match(metrics[0].note, /录取 30/)
  assert.match(metrics[0].note, /最高 276/)

  // AC-004-4：查询能看到专业线（programLine）与最低分。
  const query = queryScoreLines({
    exam: 'upgrade',
    year: 2026,
    province: '吉林',
    schoolId: 'sch_ccit',
    programId: programEngineering.id
  })
  assert.ok(query.programLine, '选学校 + 专业应返回 programLine')
  assert.equal(query.programLine?.years.find((year) => year.year === 2026)?.metrics[0].value, 240.5)
  assert.ok(
    query.minimums.some(
      (point) =>
        point.programId === programEngineering.id &&
        point.value === 240.5 &&
        point.minimumType === 'admit'
    ),
    'minimums 应包含 program 最低分'
  )
  const programChinese = ccsfuPrograms.find(
    (program) => program.majorName === '汉语言文学' && program.degreeType === '两年制'
  )
  assert.ok(programChinese)
  const queryChinese = queryScoreLines({
    exam: 'upgrade',
    year: 2026,
    province: '吉林',
    schoolId: 'sch_ccsfu',
    programId: programChinese.id
  })
  assert.ok(queryChinese.programLine)
  assert.equal(
    queryChinese.programLine?.years.find((year) => year.year === 2026)?.metrics[0].value,
    240.51445096
  )
  console.log('✓ AC-004-2/3/4 写 school_programs + program 批次，查询返回 programLine 与最低分')

  // 主线批次类别不应把专业线过滤掉：省控线选「普通类」时专业线仍按 programId 返回。
  const { normalizeImportBatch } = await import('../../../shared/src/score-line')
  const { saveBatch } = await import('./batch-store')
  const provincial = normalizeImportBatch({
    scope: 'provincial',
    exam: 'upgrade',
    year: 2026,
    province: '吉林',
    category: '普通类',
    title: '2026 吉林专升本省控线',
    confidence: 0.9,
    metrics: [{ subjectName: '总分', value: 180 }]
  })
  saveBatch(provincial, { reviewStatus: 'approved', checksum: 'cr004-provincial', fetchedAt: at })
  const queryWithCategory = queryScoreLines({
    exam: 'upgrade',
    year: 2026,
    province: '吉林',
    category: '普通类',
    schoolId: 'sch_ccit',
    programId: programEngineering.id
  })
  assert.ok(queryWithCategory.programLine, '选了主线批次类别后，专业线仍应返回')
  console.log('✓ AC-004-4 主线批次类别不影响专业线查询')

  // AC-004-5 后端数据：专科院校 level 可供前端显示说明。
  const juniorQuery = queryScoreLines({
    exam: 'upgrade',
    year: 2026,
    province: '吉林',
    schoolId: 'sch_junior'
  })
  assert.equal(juniorQuery.school?.level, '专科', '专科院校 level 应返回给前端')
  console.log('✓ AC-004-5 专科院校 level 返回（前端据此显示“不设专升本院校线”）')

  // AC-004-2：重复抓取幂等，不重复插行、approved 不降级。
  const second = enqueueCrawl({ province: '吉林', years: [2026], trigger: 'manual' })
  await runNext()
  const secondRun = runRow(second.run.id)
  assert.equal(Number(secondRun?.saved), 0, '内容未变不应重复写批次')
  assert.equal(Number(secondRun?.failed), 0)
  const programCount = Number(
    (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM school_programs WHERE school_id IN ('sch_ccit', 'sch_ccsfu') AND year = 2026"
        )
        .get() as { count: number }
    ).count
  )
  assert.equal(programCount, 12, '重复抓取不应新增招生计划')
  const batchCount = Number(
    (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM scoreline_batches WHERE school_id IN ('sch_ccit', 'sch_ccsfu') AND scope = 'program' AND year = 2026"
        )
        .get() as { count: number }
    ).count
  )
  assert.equal(batchCount, 12, '重复抓取不应新增批次')
  assert.equal(
    (
      db
        .prepare('SELECT review_status FROM scoreline_batches WHERE id = ?')
        .get(engineeringBatch.id) as { review_status: string }
    ).review_status,
    'approved',
    '重抓不降级 approved'
  )
  console.log('✓ AC-004-2 重复抓取幂等且 approved 不降级')

  console.log('\n吉林校级线试点用例全部通过')
} finally {
  db.close()
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  fs.rmSync(tempDir, { recursive: true, force: true })
}
