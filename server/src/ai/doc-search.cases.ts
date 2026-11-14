import assert from 'node:assert/strict'
import type { JobDirection } from '../../../shared/src/job-map'
import { cleanRole } from '../../../shared/src/job-map'
import { friendlySearchError } from '../../../shared/src/doc'
import type { SearchResult } from './bocha'
import { judgeJob, type JobJudgeContext } from './job-evidence'
import { buildQueryPlan, type SearchIntent } from './search-plan'

/** 固定「今天」，避免样本过一年后自动变成过期用例。 */
const NOW = new Date(2026, 10, 14)

function result(
  overrides: Partial<SearchResult> & { title: string; url: string }
): SearchResult {
  return { site: '', publishedAt: '', snippet: '', ...overrides }
}

const BASE: JobJudgeContext = {
  city: '上海',
  roleCanonical: '工程师',
  directions: [],
  useDirections: false,
  now: NOW
}

function verdictOf(item: SearchResult, context: Partial<JobJudgeContext> = {}) {
  return judgeJob(item, { ...BASE, ...context })
}

/** 2026-11-14 实测：同一句 Q6 原话召回 4 条页面，全部不该进入岗位卡。 */
const GARBAGE: SearchResult[] = [
  result({
    title: '2026 年上海工业机器人培训机构推荐',
    url: 'https://www.sok100.com/newsdetail/166838.html',
    site: '教育宝',
    publishedAt: '2026-04-17T14:47:43+08:00',
    snippet:
      '很多人问我到底去哪学，上海的几家老牌厂子确实有点东西，设备新，课程紧，但价格也是真贵。'
  }),
  result({
    title: 'Job Search | Lenovo',
    url: 'https://jobs.lenovo.com/de_DE/careers/SearchJobs?3_138_3=326178&jobId=65762',
    site: 'Lenovo Official Store',
    publishedAt: '2026-03-20T14:23:12+08:00',
    snippet: 'Engineering China, Shanghai, 上海(Shanghai) Anf. Nr.: WD00096262 Posted 19-Mar-2026'
  }),
  result({
    title: 'Job Search | Lenovo',
    url: 'https://jobs.lenovo.com/de_DE/careers/SearchJobs?3_138_3=326178&jobId=74310',
    site: 'Lenovo Official Store',
    publishedAt: '2026-02-15T13:02:23+08:00',
    snippet: 'Engineering China, Shanghai, 上海(Shanghai) Anf. Nr.: 100016604 Posted 21-Jan-2026'
  }),
  result({
    title: '西交能动硕士择业,研发岗or电厂-ZOL问答',
    url: 'https://ask.zol.com.cn/x/35365798.html',
    site: 'ZOL中关村在线问答',
    publishedAt: '2026-07-20T17:56:00+08:00',
    snippet: '我是陕西榆林人，本地电厂薪资高，但需倒班；上海汽车研发岗设在西安，薪资相对较低。'
  })
]

/** 真实岗位页样本：北极星「…招聘网」、猎聘、应届生求职网、齐鲁人才网、鱼泡。 */
const JOBS: SearchResult[] = [
  result({
    title: '电气工程师-北极星自动化招聘网',
    url: 'https://www.bjx.com.cn/job/123456.html',
    site: '北极星自动化招聘网',
    publishedAt: '2026-06-01T09:00:00+08:00',
    snippet: '电气工程师 8-12k 上海 本科 招2人 岗位职责：负责电气系统设计与调试。'
  }),
  result({
    title: '【上海 硬件工程师招聘】-猎头顾问上海招聘信息-猎聘',
    url: 'https://www.liepin.com/a/75765389.shtml',
    site: '猎聘',
    publishedAt: '2026-05-26T00:00:00+08:00',
    snippet: '硬件工程师 25-35k 上海-闵行区 3-5年 本科 招1人 今日更新 职位介绍 负责硬件设计开发。'
  }),
  result({
    title: '见习工程师(上海)招聘_上海建科工程咨询有限公司招聘信息-应届生求职网',
    url: 'https://m.yingjiesheng.com/jobdetail/167480782',
    site: '应届生求职网',
    publishedAt: '2026-05-11T11:43:11+08:00',
    snippet: '职位描述 工程管理 建筑工程监理 应届在校大学生，可提供至少连续3个月实习期。'
  }),
  result({
    title: '上海设备工程师招聘信息|清科威创(上海)科技发展有限公司招聘信息-齐鲁人才网',
    url: 'https://ly.qlrc.com/personal/jbBEA77BAFE5.html',
    site: '齐鲁人才网',
    publishedAt: '2026-05-21T13:51:00+08:00',
    snippet:
      '刷新时间:05-21 上海市闵行区 应届毕业生 本科 招2人 校招 薪资详情 试用薪资:6K 岗位职责：负责设备采购、安装与调试。'
  }),
  result({
    title: '闵行招聘工业设计10000-15000元/月',
    url: 'https://m.yupao.com/zhaogong/325792460.html',
    site: '鱼泡直聘网',
    publishedAt: '2025-11-19T15:53:00+08:00',
    snippet: '岗位职责：根据项目任务需求独立承担设计工作，统筹协调产品开发全流程。'
  })
]

function assertDropped(
  label: string,
  item: SearchResult,
  reason?: string,
  context: Partial<JobJudgeContext> = {}
): void {
  const verdict = verdictOf(item, context)
  assert.equal(verdict.keep, false, `${label}：应丢弃，实际保留`)
  if (reason) assert.equal(verdict.reason, reason, `${label}：丢弃原因应为 ${reason}`)
}

function assertKept(label: string, item: SearchResult, context: Partial<JobJudgeContext> = {}): void {
  const verdict = verdictOf(item, context)
  assert.equal(
    verdict.keep,
    true,
    `${label}：应保留，实际 ${verdict.reason || '保留'}`
  )
}

const DIRECTIONS: JobDirection[] = [
  { key: 'related', name: '工业设计相关岗位', query: '工业设计', keywords: [] }
]

function intent(overrides: Partial<SearchIntent> = {}): SearchIntent {
  return {
    city: '上海',
    mode: 'campus',
    roleCanonical: '工程师',
    roleRaw: '都可以吧，想当工程师',
    major: '',
    grade: 4,
    freshness: 'oneYear',
    cutoffMonths: 12,
    ...overrides
  }
}

export function runSearchCases(): void {
  // 1. 岗位词清洗
  assert.equal(cleanRole('都可以吧，想当工程师'), '工程师')
  assert.equal(cleanRole('我以后想当老师'), '老师')
  assert.equal(cleanRole('都可以'), '')
  assert.equal(cleanRole('还没想好'), '')
  assert.equal(cleanRole('前端开发工程师'), '前端开发')

  // 答卷人侧错误文案：结果性说明原样保留，配置类错误不能带出 BOCHA。
  assert.equal(friendlySearchError('近期没有可核对的招聘原文'), '近期没有可核对的招聘原文')
  assert.equal(
    friendlySearchError('未配置 BOCHA_API_KEY，无法检索招聘原文'),
    '检索服务暂时不可用，可稍后重试'
  )

  // 2. 查询计划：不写届、变体互不相同、低年级多一条实习
  const campus = buildQueryPlan(intent(), [])
  assert.equal(campus[0].query, '上海 工程师 应届 招聘')
  assert.equal(campus.some((variant) => /(?:19|20)\d{2}\s*届/.test(variant.query)), false)
  assert.equal(new Set(campus.map((variant) => variant.query)).size, campus.length)
  assert.ok(campus.some((variant) => variant.query.includes('site:yingjiesheng.com')))
  assert.equal(campus.some((variant) => variant.key === 'intern'), false)

  const lowGrade = buildQueryPlan(intent({ mode: 'internship', grade: 1 }), [])
  assert.equal(lowGrade[1].key, 'intern')
  assert.equal(lowGrade[1].query, '上海 工程师 实习')

  const directionPlan = buildQueryPlan(
    intent({ roleCanonical: '', major: '工业设计' }),
    DIRECTIONS
  )
  assert.equal(directionPlan[0].query, '上海 工业设计 招聘')
  assert.equal(directionPlan[0].directionKey, 'related')

  // 3. 本次实测的培训机构页和 ZOL 问答页丢弃
  const junk = [GARBAGE[0], GARBAGE[3]]
  junk.forEach((item, index) => {
    const verdict = verdictOf(item)
    assert.equal(verdict.keep, false, `垃圾页 ${index + 1} 应丢弃`)
  })
  // 联想英文岗位页按「英文岗位证据」保留，不再因为没写中文关键词被误杀。
  assertKept('联想英文岗位页', GARBAGE[1])
  assertKept('联想英文岗位页 2', GARBAGE[2])

  // 4. 具体岗位详情页保留，包括标题带「招聘网」后缀的北极星页面
  JOBS.slice(0, 4).forEach((item, index) => assertKept(`岗位样本 ${index + 1}`, item))

  // 标题只写区名 + 岗位 + 薪资的鱼泡岗位页，不能被门户规则误杀
  assertKept(
    '鱼泡 Java 岗位页',
    result({
      title: '松江招聘Java12000-13000元/月',
      url: 'https://m.yupao.com/zhaogong/337722443.html',
      site: '鱼泡直聘网',
      publishedAt: '2025-12-10T18:30:00+08:00',
      snippet:
        '岗位职责:1.负责上海地区Java开发相关技术工作 2.参与系统设计、编码实现及后期维护 任职要求:1.具备良好的Java编程基础 2.熟悉软件开发规范'
    }),
    { roleCanonical: 'Java开发' }
  )

  // 5. 方向模式：只有和方向词沾边的岗位才收
  assertKept('工业设计方向', JOBS[4], {
    roleCanonical: '',
    useDirections: true,
    directions: DIRECTIONS,
    directionKey: 'related'
  })
  assertDropped('方向无关岗位', JOBS[0], 'drop_unrelated', {
    roleCanonical: '',
    useDirections: true,
    directions: DIRECTIONS,
    directionKey: 'related'
  })

  // 6. 时效：2018 / 2022 / 2024 样本一律 drop_too_old
  for (const year of ['2018', '2022', '2024']) {
    assertDropped(
      `${year} 年旧岗位`,
      result({
        title: `设备工程师招聘_上海某某有限公司-应届生求职网`,
        url: `https://m.yingjiesheng.com/jobdetail/16${year}.html`,
        publishedAt: `${year}-05-01T00:00:00+08:00`,
        snippet: '岗位职责：负责设备维护。本科 招2人 薪资 8-12k'
      }),
      'drop_too_old'
    )
  }

  // 7. 没有任何日期证据：不进岗位卡
  assertDropped(
    '无日期岗位页',
    result({
      title: '上海 硬件工程师招聘_某某科技有限公司',
      url: 'https://www.liepin.com/a/75992333.shtml',
      snippet: '硬件工程师 25-35k 上海 本科 招1人 岗位职责：负责硬件设计。'
    }),
    'drop_undated'
  )

  // 8. 2026 届考试报名页不是岗位卡
  assertDropped(
    '考试报名页',
    result({
      title: '2026届上海市公务员考试报名入口',
      url: 'https://www.shacs.gov.cn/News/2026/12345.html',
      publishedAt: '2026-01-05T00:00:00+08:00',
      snippet: '报名时间：2026年1月，考试公告与报考指南见附件。'
    })
  )

  // 9. 过期与无日期不参与补位：可用集合本身就过滤掉，不存在“凑数”分支
  const undated = verdictOf(
    result({
      title: '上海 结构工程师招聘_某某有限公司',
      url: 'https://www.liepin.com/a/70000001.shtml',
      snippet: '结构工程师 15-20k 上海 本科 招1人 岗位职责：结构设计。'
    })
  )
  assert.equal(undated.keep, false)
}

export function dumpSearchCaseSummary(): void {
  console.log(
    `招聘检索回归用例通过：垃圾页 ${2} 条、英文岗位页 ${2} 条、岗位样本 ${JOBS.length} 条、岗位词清洗 5 组、查询计划 3 组、旧样本 3 组、无日期 / 考试页各 1 组`
  )
}

const directRun = process.argv[1]
  ?.replace(/\\/g, '/')
  .endsWith('/server/src/ai/doc-search.cases.ts')
const liveQuery = process.argv[2]

if (directRun && liveQuery) {
  // 运营自检：真实外呼一次，逐条打印判定，不读代码也能判断问题出在词还是过滤。
  const { searchWeb } = await import('./bocha')
  const { evidenceDate } = await import('./job-evidence')
  const items = await searchWeb(liveQuery, { count: 6, freshness: 'oneYear' })
  console.log(`\n检索词：${liveQuery}（返回 ${items.length} 条）\n`)
  for (const [index, item] of items.entries()) {
    const verdict = verdictOf(item, { roleCanonical: cleanRole(liveQuery) })
    const state = verdict.keep ? '保留' : `丢弃（${verdict.reason}）`
    console.log(`[${index + 1}] ${item.title}`)
    console.log(`    ${item.url}`)
    console.log(`    日期：${evidenceDate(item) || '无'}；判定：${state}`)
  }
} else if (directRun) {
  runSearchCases()
  dumpSearchCaseSummary()
}
