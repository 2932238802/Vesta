import { Router } from 'express'
import type { ExamType } from '../../../../shared/src/score-line'
import { isExamType } from '../../../../shared/src/score-line'
import { noStore } from '../../auth'
import { assertSafeUrl } from '../../score-lines/crawl-fetch'
import {
  cancelQueuedRun,
  enqueueCrawl,
  getQueue,
  getRun,
  runNext
} from '../../score-lines/crawl'
import { listSources, upsertSource } from '../../score-lines/sources'
import { log } from '../../log'
import { clampString, rateLimit } from '../../util'

export const scoreLineCrawlRouter = Router()

function examOf(value: unknown): ExamType | null {
  const raw = clampString(value, 20)
  return isExamType(raw) ? raw : null
}

scoreLineCrawlRouter.post(
  '/score-lines/crawl',
  rateLimit('scoreline-crawl', 5, 60_000),
  (req, res) => {
    noStore(res)
    const province = clampString(req.body?.province, 20)
    if (!province) {
      res.status(400).json({ error: '请选择要抓取的省份' })
      return
    }
    const years = Array.isArray(req.body?.years)
      ? (req.body.years as unknown[])
          .map((year) => Number(year))
          .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100)
          .slice(0, 10)
      : []
    const result = enqueueCrawl({ province, years, trigger: 'manual' })
    if (result.code === 'NO_SOURCE') {
      res.status(409).json({ error: '这个省还没有配置数据源，请先补充数据源', code: 'NO_SOURCE' })
      return
    }
    log.info('scoreline.crawl_enqueued', {
      runId: result.run.id,
      province: result.run.province,
      position: result.position,
      existing: result.existing
    })
    void runNext()
    res.status(result.existing ? 200 : 202).json({
      runId: result.run.id,
      status: result.run.status,
      province: result.run.province,
      position: result.position,
      existing: result.existing
    })
  }
)

scoreLineCrawlRouter.get('/score-lines/crawl/queue', (_req, res) => {
  noStore(res)
  res.json(getQueue())
})

scoreLineCrawlRouter.get('/score-lines/crawl/runs/:id', (req, res) => {
  noStore(res)
  const result = getRun(clampString(req.params.id, 100))
  if (!result) {
    res.status(404).json({ error: '没有找到这次抓取任务' })
    return
  }
  res.json(result)
})

scoreLineCrawlRouter.delete('/score-lines/crawl/queue/:id', (req, res) => {
  noStore(res)
  if (!cancelQueuedRun(clampString(req.params.id, 100))) {
    res.status(404).json({ error: '没有找到可取消的排队任务' })
    return
  }
  res.json({ ok: true })
})

scoreLineCrawlRouter.get('/score-lines/sources', (req, res) => {
  noStore(res)
  const exam = examOf(req.query.exam)
  res.json({
    sources: listSources({
      exam: exam ?? undefined,
      province: clampString(req.query.province, 20),
      tier: clampString(req.query.tier, 10),
      enabled: req.query.enabled === '0' ? false : req.query.enabled === '1' ? true : undefined
    })
  })
})

scoreLineCrawlRouter.post('/score-lines/sources', (req, res) => {
  noStore(res)
  const body = req.body ?? {}
  const name = clampString(body.name, 80)
  const url = clampString(body.url, 500)
  const exam = examOf(body.exam)
  const province = clampString(body.province, 20)
  if (!name || !url || !exam) {
    res.status(400).json({ error: '请填写来源名称、地址和考试类型' })
    return
  }
  if (exam === 'upgrade' && !province) {
    res.status(400).json({ error: '专升本来源需要省份' })
    return
  }
  try {
    assertSafeUrl(url)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
    return
  }
  const intervalHours = Number(clampString(body.intervalHours, 6)) || 168
  if (intervalHours < 1 || intervalHours > 8760) {
    res.status(400).json({ error: '抓取间隔需在 1–8760 小时之间' })
    return
  }
  const discoverDepth = Number(clampString(body.discoverDepth, 2))
  const depth = Number.isInteger(discoverDepth) ? Math.min(5, Math.max(0, discoverDepth)) : 2
  const entryUrl = clampString(body.entryUrl, 500)
  if (entryUrl) {
    try {
      assertSafeUrl(entryUrl)
    } catch (error) {
      res.status(400).json({ error: (error as Error).message })
      return
    }
  }
  const source = upsertSource({
    id: clampString(body.id, 100) || undefined,
    name,
    publisher: clampString(body.publisher, 80),
    url,
    entryUrl: body.entryUrl === undefined ? undefined : entryUrl,
    exam,
    province,
    schoolId: clampString(body.schoolId, 100),
    parserId: clampString(body.parserId, 40) || 'html-table@1',
    tier: clampString(body.tier, 10) || 'T0',
    intervalHours,
    discoverDepth: body.discoverDepth === undefined ? undefined : depth,
    urlInclude:
      body.urlInclude === undefined ? undefined : clampString(body.urlInclude, 200),
    verified: body.verified === undefined ? undefined : body.verified === true,
    enabled: body.enabled === undefined ? true : body.enabled === true
  })
  log.info('scoreline.source_saved', { id: source.id, exam: source.exam, province: source.province })
  res.status(201).json({ source })
})
