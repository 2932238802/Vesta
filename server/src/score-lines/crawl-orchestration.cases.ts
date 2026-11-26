/**
 * P1-1 真实抓取编排回归（本地 HTTP 夹具 + 隔离 DATA_DIR）。
 *
 * 不调用 crawlWrite() 复刻路径，而是真实 `enqueueCrawl` / `runNext` 跑两轮同一页面：
 * - 第一轮写入 approved；
 * - 第二轮内容未变，全部批次 autoSkipped —— run / source 不能变 failed，
 *   覆盖看板不能被污染，也不能误报 needs_seed。
 *
 * 运行环境：`SCORELINE_CRAWL_ALLOW_PRIVATE=1` 允许抓 127.0.0.1；DATA_DIR 指向临时目录。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vesta-crawl-orchestration-'))
process.env.DATA_DIR = tempDir
process.env.SCORELINE_CRAWL_ALLOW_PRIVATE = '1'
process.env.LOG_LEVEL = 'error'

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>2025年浙江省专升本最低控制分数线</title></head>
<body><table>
<tr><th>科目</th><th>分数</th><th>满分</th></tr>
<tr><td>总分</td><td>180</td><td>300</td></tr>
</table></body></html>`

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end(PAGE)
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('本地夹具端口获取失败')
const pageUrl = `http://127.0.0.1:${address.port}/line.html`

interface RunRow {
  id: string
  status: string
  saved: number
  failed: number
  message: string
}

const { initSchema } = await import('../db/schema')
const { db } = await import('../db/connection')
const { enqueueCrawl, runNext } = await import('./crawl')
const { upsertSource } = await import('./sources')

try {
  initSchema()
  const at = new Date().toISOString()
  db.prepare(
    `INSERT INTO schools (id, code, name, province, city, level, nature, tags,
       official_url, graduate_url, admissions_url, status, created_at, updated_at)
     VALUES ('sch_orch', '', '编排测试大学', '浙江', '杭州', '', '', '[]', '', '', '', 'active', ?, ?)`
  ).run(at, at)

  const source = upsertSource({
    name: '本地夹具省控线',
    url: pageUrl,
    exam: 'upgrade',
    province: '浙江',
    parserId: 'html-table@1',
    discoverDepth: 0,
    verified: false,
    enabled: true
  })

  const runSourceRow = () =>
    db
      .prepare('SELECT last_status, last_error FROM scoreline_sources WHERE id = ?')
      .get(source.id) as { last_status: string; last_error: string }
  const coverageRow = () =>
    db
      .prepare(
        "SELECT status FROM school_coverage WHERE school_id = 'sch_orch' AND exam = 'upgrade' AND year = 2025"
      )
      .get() as { status: string } | undefined

  async function runOnce(): Promise<RunRow> {
    const enqueued = enqueueCrawl({ province: '浙江', years: [2025], trigger: 'manual' })
    assert.ok(!enqueued.code, `应能入队：${enqueued.code ?? ''}`)
    assert.equal(enqueued.existing, false, '每次应新建 run')
    await runNext()
    const row = db.prepare('SELECT * FROM crawl_runs WHERE id = ?').get(enqueued.run.id) as
      | RunRow
      | undefined
    assert.ok(row, 'run 应已落库')
    return row
  }

  // 第一轮：真实抓取并写入 approved。
  const run1 = await runOnce()
  assert.equal(run1.status, 'success', '首轮抓取应成功')
  assert.equal(Number(run1.saved), 1, '首轮应保存 1 个批次')
  assert.equal(runSourceRow().last_status, 'success', '来源状态应为 success')
  assert.equal(coverageRow()?.status, 'partial', '写入主线后覆盖应为 partial')
  const batchRow = db
    .prepare(
      "SELECT review_status FROM scoreline_batches WHERE scope = 'provincial' AND exam = 'upgrade' AND year = 2025 AND province = '浙江'"
    )
    .get() as { review_status: string } | undefined
  assert.equal(batchRow?.review_status, 'approved', '首轮批次应自动 approved')

  // 第二轮：同一页面内容未变，全部 autoSkipped。
  const run2 = await runOnce()
  assert.notEqual(run2.status, 'failed', '全 skip 的重抓不能被判 failed')
  assert.equal(run2.status, 'success', '全 skip 应视为内容未变的有效结果')
  assert.equal(Number(run2.saved), 0, '第二轮不应重复写入')
  assert.equal(Number(run2.failed), 0, '第二轮不应有失败')
  assert.match(run2.message, /内容未变/, '全 skip 的提示应说明内容未变')
  assert.equal(runSourceRow().last_status, 'success', '来源状态不能被污染为 failed')
  assert.equal(runSourceRow().last_error, '', '内容未变不应误报 needs_seed 等失败码')
  assert.notEqual(coverageRow()?.status, 'failed', '覆盖看板不能被全 skip 打成 failed')
  assert.equal(coverageRow()?.status, 'partial', '覆盖应保持写入后的状态')
  assert.equal(
    (db
      .prepare(
        "SELECT review_status FROM scoreline_batches WHERE scope = 'provincial' AND exam = 'upgrade' AND year = 2025 AND province = '浙江'"
      )
      .get() as { review_status: string }).review_status,
    'approved',
    '重抓内容未变不应改变既有 approved'
  )

  console.log('✓ P1-1 真实编排：第二轮全 skip 不判 failed，来源 / 覆盖 / 状态均保持')
} finally {
  db.close()
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  fs.rmSync(tempDir, { recursive: true, force: true })
}
