import type {
  Answers,
  JobCard,
  ReportPayload,
  Survey
} from '../../../shared/src/types'
import {
  deadlineFact,
  resolveTargetCity,
  serializeDoc
} from '../../../shared/src/doc'
import { computeDocScores } from '../../../shared/src/docScore'

export interface ModuleItemSpec {
  key: string
  data: Record<string, unknown>
}

export interface ModuleSpec {
  key: string
  kind: string
  /** 这个模块必须有一句 AI 判断 */
  summaryRequired: boolean
  /** 这个模块必须有 AI 正文 */
  paragraphsRequired: boolean
  /** 每个 item 必须写 text */
  textRequired: boolean
  /** 每个 item 必须填哪些字段 */
  allFields: string[]
  /** 每个 item 至少要填其中几个字段之一 */
  anyFields: string[]
  /** 给模型的标题主题提示，避免标题随机漂移 */
  titleHint?: string
  data: Record<string, unknown>
  items: ModuleItemSpec[]
}

export function jobSpec(job: JobCard): Record<string, unknown> {
  return {
    title: job.title,
    company: job.company,
    city: job.city,
    salary: job.salary,
    requirement: job.requirement,
    date: job.date ?? '',
    url: job.url,
    stale: Boolean(job.stale),
    fallback: Boolean(job.fallback),
    directionKey: job.directionKey ?? '',
    meets: job.meets ?? [],
    missing: job.missing ?? []
  }
}

/** 系统规则的封顶写法（「封顶 5 分」「按 6 分封顶」）改成「有上限」，不把分值递给 AI。 */
const CAP_PATTERNS: RegExp[] = [
  /按\s*\d+(?:\.\d+)?\s*分\s*(?:封顶|为上限)/g,
  /(?:封顶|最高|上限|不超过|至多)\s*\d+(?:\.\d+)?\s*分/g,
  /\d+(?:\.\d+)?\s*分\s*(?:封顶|为上限)/g
]

function ruleWithoutCapInput(text: string): string {
  return CAP_PATTERNS.reduce((value, pattern) => value.replace(pattern, '有上限'), text)
}

/** 入场线区间换成相对结论，避免 AI 照抄 6.0—8.0 这类端点数字。 */
function benchmarkState(item: { score: number; benchmark?: string }): string {
  const benchmark = item.benchmark ?? ''
  if (!benchmark) return ''
  if (benchmark.includes('背景项')) return '背景项，不设门槛'
  const range = /(\d+(?:\.\d+)?)\s*[—~\-至到]\s*(\d+(?:\.\d+)?)/.exec(benchmark)
  if (!range) return ''
  const low = Number(range[1])
  const high = Number(range[2])
  if (!Number.isFinite(low) || !Number.isFinite(high)) return ''
  if (item.score < low) return '低于常规入场线'
  if (item.score > high) return '高于常规入场线'
  return '在常规入场线内'
}

export function buildModuleSpecs(input: {
  base: ReportPayload
  survey: Survey
  answers: Answers
  scores: ReturnType<typeof computeDocScores>
  jobs: JobCard[]
}): ModuleSpec[] {
  const { base, survey, answers, scores } = input
  const specs: ModuleSpec[] = []
  const answersView = serializeDoc(survey, answers)
  const deadline = deadlineFact(survey, answers)
  const targetCity = resolveTargetCity(survey, answers)

  for (const block of base.blocks) {
    if (block.type === 'scorecard') {
      specs.push({
        key: 'scorecard',
        kind: 'scores',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: true,
        allFields: [],
        anyFields: [],
        data: {
          scale: '0—10',
          potentialLevel: block.potential.level,
          spaceLabel: block.potential.label,
          backgroundCount: block.background.length,
          personalCount: block.personal.length
        },
        items: [...block.background, ...block.personal].map((item) => ({
          key: item.key,
          data: {
            label: item.label,
            score: item.score,
            source: item.source ?? '',
            rule: ruleWithoutCapInput(item.note),
            benchmarkState: benchmarkState(item)
          }
        }))
      })
    } else if (block.type === 'assets') {
      specs.push({
        key: 'assets',
        kind: 'resources',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: true,
        allFields: [],
        anyFields: [],
        data: { count: block.items.length },
        items: block.items.map((item) => ({
          key: item.key,
          data: { name: item.name, source: item.source ?? '' }
        }))
      })
    } else if (block.type === 'jobmap') {
      specs.push({
        key: 'jobmap',
        kind: 'directions',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: false,
        allFields: ['name'],
        anyFields: ['what', 'entry', 'salary', 'fit'],
        data: {
          directionCount: block.directions.length,
          relatedJobCount: block.relatedJobs.length,
          targetCity
        },
        items: block.directions.map((direction) => ({
          key: direction.key,
          data: {
            nameHint: direction.name,
            facts: direction.facts,
            jobs: direction.jobs.map(jobSpec)
          }
        }))
      })
    } else if (block.type === 'gap') {
      specs.push({
        key: 'gap',
        kind: 'gap',
        summaryRequired: true,
        paragraphsRequired: true,
        textRequired: false,
        allFields: [],
        anyFields: [],
        data: {
          lines: block.lines,
          jobs: block.jobs.map(jobSpec),
          targetCity
        },
        items: []
      })
    } else if (block.type === 'roadmap') {
      specs.push({
        key: 'roadmap',
        kind: 'plan',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: false,
        allFields: ['label', 'goal', 'output'],
        anyFields: [],
        data: {
          node: {
            node: deadline.node,
            windowText: deadline.windowText,
            targetDate: deadline.targetDate
          },
          phaseCount: block.phases.length
        },
        items: block.phases.map((phase) => ({
          key: phase.key,
          data: { period: phase.period }
        }))
      })
    } else if (block.type === 'checklist') {
      specs.push({
        key: 'checklist',
        kind: 'verification',
        summaryRequired: true,
        paragraphsRequired: false,
        textRequired: false,
        allFields: ['title', 'detail'],
        anyFields: [],
        data: { count: block.items.length },
        items: block.items.map((item) => ({
          key: item.key,
          data: { search: item.search }
        }))
      })
    } else if (block.type === 'section') {
      const english = scores.english
      const needNote = english.pathNeeds
        ? '目标路径本身对英语有要求，需要把英语当成真实差距'
        : english.preparing
          ? '目标路径没有直接要求英语，但本人已经在准备四六级或明确看重英语'
          : '目标路径和本人准备情况都没有指向英语，不要主动把英语写成核心差距'
      specs.push({
        key: block.key ?? 'english',
        kind: 'english',
        summaryRequired: false,
        paragraphsRequired: true,
        textRequired: false,
        allFields: [],
        anyFields: [],
        titleHint: '英语这块怎么补',
        data: {
          ...english,
          needNote,
          speakingNote: english.speaking
            ? `Q22 现状：${english.speaking}。这是现状，不是目标，不能据此写「口语可以不练 / 不追求流利」`
            : '本次没有 Q22 口语现状（可能按闸门规则跳过）',
          listeningWeak: english.weakPart.includes('听力'),
          reasonNote: english.reasons.length
            ? `Q24 原因多选（${english.reasons.join('、')}），写原因时要逐条对应，不能压成单一原因`
            : '本次没有 Q24 原因（可能按规则跳过）',
          skippedDetailNote: english.skippedDetail
            ? 'Q20 低于闸门分数，Q22 / Q23 / Q25 / Q26 / Q27 按规则跳过，不是学员没答，报告里要说明这一点'
            : ''
        },
        items: []
      })
    }
  }

  specs.push(
    {
      key: 'stuck',
      kind: 'chapter',
      summaryRequired: false,
      paragraphsRequired: true,
      textRequired: false,
      allFields: [],
      anyFields: [],
      data: {
        q13_execution: answersView.q13_execution,
        q14_method: answersView.q14_method,
        q16_info: answersView.q16_info,
        q19_how: answersView.q19_how,
        q20_weekly_hours: answersView.q20_weekly_hours,
        q28_self: answersView.q28_self
      },
      items: []
    },
    {
      key: 'deadline',
      kind: 'chapter',
      summaryRequired: false,
      paragraphsRequired: true,
      textRequired: false,
      allFields: [],
      anyFields: [],
      data: {
        node: deadline.node,
        windowText: deadline.windowText,
        targetDate: deadline.targetDate
      },
      items: []
    },
    {
      key: 'future',
      kind: 'chapter',
      summaryRequired: false,
      paragraphsRequired: true,
      textRequired: false,
      allFields: [],
      anyFields: [],
      data: {
        q26_future: answersView.q26_future,
        q8_city: answersView.q8_city,
        q5a_target_job: answersView.q5a_target_job,
        q28_self: answersView.q28_self
      },
      items: []
    }
  )

  return specs
}

export function moduleSpecsForPrompt(specs: ModuleSpec[]): unknown[] {
  return specs.map((spec) => ({
    key: spec.key,
    kind: spec.kind,
    summaryRequired: spec.summaryRequired,
    paragraphsRequired: spec.paragraphsRequired,
    titleHint: spec.titleHint,
    fields: spec.items.some((item) => item.data)
      ? { all: spec.allFields, any: spec.anyFields, textRequired: spec.textRequired }
      : undefined,
    data: spec.data,
    items: spec.items
  }))
}

export function outputContract(): string {
  return `## 本次机器约束

只输出一个 JSON 对象，不要 Markdown 代码块，不要解释：
{"conclusion":"一句话结论","modules":[{"key":"moduleSpecs 里的 key","title":"你写的标题","summary":"一句话判断","paragraphs":["正文"],"items":[{"key":"item key","text":"解释","fields":{"字段":"内容"}}]}]}

- modules 必须覆盖 moduleSpecs 里的每一个 key，不能增、不能删、不能改 key。
- 每个模块的 items 必须覆盖该模块 items 里的每一个 key。
- summaryRequired 为 true 的模块必须写 summary；paragraphsRequired 为 true 的模块必须写至少一段 paragraphs。
- gap 的 summary / paragraphs 只能基于 moduleSpecs.data.lines 和 jobs 里已有的事实写；没有的事实不要补，不要再写固定的「入场线」「城市判断」「下一步」建议句。
- gap 说「空着」「还没有」只能指某一个问卷答案字段（例如目标岗位没写），不能写成「整体只差一项」「只有一项空着」这类整体结论；moduleSpecs.data.lines 里「现在能写进简历的」写「还没有」时，必须承认简历里目前没有可写的经历或技能。
- jobmap 某个方向有 stale 为 true 的招聘原文参与时，entry 必须以「仅看要求结构，不能当投递入口」开头，不能当成现在的投递门槛。
- jobmap 的 facts 出现「原文对专业的写法不一致」时，fit 要写明这句、以具体岗位为准，不能只写「原文没写专业限制」。
- scorecard 每个 item 的 text 如提到分数，必须等于该 item 在 moduleSpecs 里的 score；scorecard 的 summary 如提到分数，必须是本模块某一项的 score。不要写别的 item 的分数，也不要用 10 分制总分冒充单项分。
- scorecard 的 item 只解释「这个分数是怎么由回答来的」；不要再写封顶值、入场线数字、区间端点或其它 item 的分数。需要说上限时写「有上限 / 上限不高」，不要写具体分值。
- scorecard item 的 benchmarkState 已经给出「低于常规入场线 / 在常规入场线内 / 高于常规入场线 / 背景项，不设门槛」，直接按这个结论写，不要自己写区间或端点分数字。
- assets 模块的标题写「你现在能借到的力」：这些是家庭、学校或已有经历给的支撑，不要叫「资源」「能力盘点」。
- 所有数字只能原样使用 moduleSpecs、jobSpecs、问卷回答或检索记录里的值，不能自己计算、换算或估算。
- jobSpecs 里 fallback 为 true 的原文是主检索不足时的补位结果，只能参考要求结构，不能用来统计「几条原文」或门槛数量；stale 为 true 的过期原文同理，不能当成当前投递门槛。
- 原文没有写薪资时不要写「薪资以原文为准」之类的话，也不要补一个薪资数字；没有就略过薪资。
- 时间只使用系统给出的粗粒度表达；不要写「547 天」「24 个月」「2 年」这种数字加时间单位。
- 整份报告的时间距离只由系统给出两处：gap 的「关键节点」行和 roadmap 副标题（两者由系统直接展示）。conclusion、模块标题和正文都不要再写「还有约 X」「距离 X」或「X 年后」；deadline 模块只讲这个节点的准备含义。
- 目标城市统一写 moduleSpecs 给出的具体城市（gap.data.targetCity.city）；不要回抄问卷 Q9 选项原文，也不要带「新一线（杭州、成都、武汉、西安等）」这类整串档位说明。
- 英语块不要复述问卷的每周投入和总时长（如「每周 5 小时」「总共 17.5 小时」；roadmap 副标题已经给过一次），只写怎么补、怎么验证；「每周末做一套真题」这类练习节奏可以写。
- 英语块的听力和口语要并列写，不能写「先补听力，再补口语」「口语不追求流利」「等流利了再练」，也不要写「不追求口语流利」「口语先放一放」「口语以后再说」这类反向语序或换词；只有 moduleSpecs 材料明确给出先后时才写顺序。
- Q24 是原因多选：moduleSpecs 的 english.data.reasons / reasonNote 里有几项就逐条对应几项，不能压成单一原因，也不能补写学生没选的原因。
- 英语块可以给验证建议（同一套真题隔一段时间重做、复述录音回听），但要写成建议；可以点一句大学课堂的一般局限，不评价具体学校或老师。
- 模块带 titleHint 时，标题围绕这个主题写，不要起成与内容无关的标题。
- 同一段里把「考研」和「听力考试」写在一起（如「初试考听力」「听力计入总分」）时，必须写明是复试或雅思/托福类考试；考研初试不考听力，不能把「听力弱」直接写成初试要考。单纯说「考研和听力都重要」不算。
- 「简历上缺一段和目标方向对得上的经历」这类整句整份报告最多出现一次；岗位卡只写这条原文的具体要求，不要复述整句。
- 过期原文的说明由块副标题统一给出；模块正文和标题不要逐条重复「这是某年的公告」。
- roadmap 的 label 只写阶段名（如「方向确认」「实践积累」），不要重复系统给的阶段时间段，也不要写月份数字。`
}
