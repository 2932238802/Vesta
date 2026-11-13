import type { DocAiContent } from '../../../shared/src/doc'
import type { ModuleSpec } from './doc-prompts'

export function contentProblems(content: DocAiContent, specs: ModuleSpec[]): string[] {
  const problems: string[] = []
  if (!content.conclusion) problems.push('缺少 conclusion 一句话结论')
  const expected = new Set(specs.map((spec) => spec.key))
  const seen = new Set<string>()
  for (const module of content.modules) {
    if (!expected.has(module.key)) {
      problems.push(`出现了 moduleSpecs 里没有的模块 ${module.key}`)
    }
    if (seen.has(module.key)) problems.push(`模块 ${module.key} 重复`)
    seen.add(module.key)
  }
  for (const spec of specs) {
    const module = content.modules.find((item) => item.key === spec.key)
    if (!module) {
      problems.push(`缺少模块 ${spec.key}`)
      continue
    }
    if (!module.title) problems.push(`模块 ${spec.key} 缺少标题`)
    if (spec.summaryRequired && !module.summary) {
      problems.push(`模块 ${spec.key} 缺少 summary 判断`)
    }
    if (spec.paragraphsRequired && module.paragraphs.length === 0) {
      problems.push(`模块 ${spec.key} 缺少正文段落`)
    }
    const itemKeys = new Set(spec.items.map((item) => item.key))
    for (const item of module.items) {
      if (!itemKeys.has(item.key)) {
        problems.push(`模块 ${spec.key} 出现了未声明的 item ${item.key}`)
      }
    }
    for (const expectedItem of spec.items) {
      const item = module.items.find((entry) => entry.key === expectedItem.key)
      if (!item) {
        problems.push(`模块 ${spec.key} 缺少 item ${expectedItem.key}`)
        continue
      }
      if (spec.textRequired && !item.text) {
        problems.push(`模块 ${spec.key} 的 item ${item.key} 缺少 text`)
      }
      for (const field of spec.allFields) {
        if (!item.fields?.[field]?.trim()) {
          problems.push(`模块 ${spec.key} 的 item ${item.key} 缺少字段 ${field}`)
        }
      }
      if (
        spec.anyFields.length > 0 &&
        !spec.anyFields.some((field) => item.fields?.[field]?.trim())
      ) {
        problems.push(
          `模块 ${spec.key} 的 item ${item.key} 至少要填写 ${spec.anyFields.join(' / ')} 中的一个`
        )
      }
    }
  }
  return problems
}

/** 跨模块一致性：同一件事不能让两个模块各说一套。返回给 AI 重写用的具体冲突。 */
export function crossModuleIssues(content: DocAiContent, specs: ModuleSpec[]): string[] {
  const issues: string[] = []
  const moduleOf = (key: string) => content.modules.find((item) => item.key === key)
  const specOf = (key: string) => specs.find((item) => item.key === key)

  // gap 的「只有一项空着」是整体结论，不能和评分卡里技能/实习的低分并存。
  const scorecard = specOf('scorecard')
  const gap = moduleOf('gap')
  if (scorecard && gap) {
    const weak = scorecard.items.some(
      (item) =>
        (item.key === 'skill' || item.key === 'practice') &&
        typeof item.data.score === 'number' &&
        item.data.score < 3
    )
    const texts = [gap.summary, ...gap.paragraphs]
    if (
      weak &&
      texts.some((text) => /只有一[项个]|只剩一[项个]|只差一[项个]|只缺一[项个]/.test(text))
    ) {
      issues.push(
        'gap 写了「只有一项空着」这类整体结论，但评分卡里技能或实习低于 3 分；只能说某一个答案字段空着，不能概括成整体只差一项'
      )
    }
  }

  // 方向卡：过期原文参与时 entry 必须带结构参考前缀；原文对专业写法不一致时 fit 必须写明。
  const jobmap = moduleOf('jobmap')
  const jobmapSpec = specOf('jobmap')
  if (jobmap && jobmapSpec) {
    for (const specItem of jobmapSpec.items) {
      const item = jobmap.items.find((entry) => entry.key === specItem.key)
      if (!item) continue
      const jobs = Array.isArray(specItem.data.jobs)
        ? (specItem.data.jobs as Record<string, unknown>[])
        : []
      const entry = item.fields?.entry?.trim() ?? ''
      if (
        entry &&
        jobs.some((job) => job.stale === true) &&
        !/仅看要求结构|不能当投递入口/.test(entry)
      ) {
        issues.push(
          `方向 ${specItem.key} 有过期原文参与，entry 必须写「仅看要求结构，不能当投递入口」，不能当成现在的投递门槛`
        )
      }
      const facts = Array.isArray(specItem.data.facts)
        ? specItem.data.facts.filter((fact): fact is string => typeof fact === 'string')
        : []
      const fit = item.fields?.fit?.trim() ?? ''
      if (
        fit &&
        facts.some((fact) => fact.includes('原文对专业的写法不一致')) &&
        !/不一致|以具体岗位为准/.test(fit)
      ) {
        issues.push(
          `方向 ${specItem.key} 的原文对专业写法不一致，fit 必须写明「原文对专业的写法不一致，以具体岗位为准」`
        )
      }
    }
  }
  return issues
}

export interface RepetitionContext {
  /** 系统给出的粗粒度时间距离，如「三年」「5 个月」 */
  distance: string
  /** Q9 选项原文，如「新一线（杭州、成都、武汉、西安等）」 */
  cityLabel: string
  /** resolveTargetCity() 落到检索词里的具体城市，可能为空 */
  city: string
}

/** 取「新一线（杭州、成都、武汉、西安等）」括号里的城市清单。 */
function cityListInLabel(labelText: string): string {
  const inner = /[（(]([^）)]+)[）)]/.exec(labelText)?.[1]?.replace(/\s+/g, '') ?? ''
  return inner.length >= 4 ? inner : ''
}

/**
 * 全报告去重：时间距离、目标城市档位串、「缺一段经历」整句这类同一事实，
 * 系统已经给了固定次数，AI 正文多写就判重复，先反馈重写，不写进报告。
 */
export function repetitionIssues(content: DocAiContent, ctx: RepetitionContext): string[] {
  const issues: string[] = []
  const seen = new Set<string>()
  const distancePattern =
    /(?:还有|距离)[^。；\n]{0,16}?约?\s*(?:[一二两三四五六七八九十半]+|\d+)\s*(?:个)?(?:年|月)/g
  const missingPattern = /缺一段[^。；\n]{0,24}/g

  const cityLabel = ctx.cityLabel.replace(/\s+/g, '')
  const cityList = cityListInLabel(cityLabel)
  // 只有 Q9 选的是「新一线」「北上广深」「家乡（…）」这类档位写法时才拦；北京、杭州这种具体城市不必拦。
  const checkCityLabel =
    Boolean(cityLabel) &&
    cityLabel !== ctx.city &&
    (/[（(]/.test(cityLabel) || /新一线|北上广深|等/.test(cityLabel))
  const cityTarget = ctx.city || '本次未限定城市'

  let missingCount = 0
  const distanceWhere = new Set<string>()
  const distanceText = ctx.distance.replace(/\s+/g, '')
  for (const { where, text } of contentTexts(content)) {
    if (!text.trim()) continue
    const flat = text.replace(/\s+/g, '')
    for (const match of text.matchAll(distancePattern)) {
      distanceWhere.add(where)
      const key = `distance:${match[0]}`
      if (seen.has(key)) continue
      seen.add(key)
      issues.push(
        `${where} 重复了系统已经给出的时间距离「${match[0]}」；整份报告只在 gap 的「关键时间窗」和路线图副标题各写一次，正文和标题不要再写`
      )
    }
    // 「大约三年」「三年后」这类没有「还有 / 距离」前缀的写法同样算重复。
    if (
      distanceText &&
      !distanceWhere.has(where) &&
      (flat.includes(`约${distanceText}`) || flat.includes(`${distanceText}后`))
    ) {
      distanceWhere.add(where)
      issues.push(
        `${where} 重复了系统已经给出的时间距离「${ctx.distance}」；整份报告只在 gap 的「关键时间窗」和路线图副标题各写一次，正文和标题不要再写`
      )
    }
    if (checkCityLabel) {
      if ((flat.includes(cityLabel) || (cityList && flat.includes(cityList))) && !seen.has(`city:${where}`)) {
        seen.add(`city:${where}`)
        issues.push(
          `${where} 回抄了问卷 Q9 的目标城市选项原文；目标城市统一写系统给的具体城市「${cityTarget}」，不要带整串档位说明`
        )
      }
    }
    missingCount += [...text.matchAll(missingPattern)].length
  }

  if (missingCount > 1) {
    issues.push(
      `「缺一段和目标方向对得上的经历」这类整句出现了 ${missingCount} 处；整份报告最多保留一处，岗位卡只写这条原文的具体要求`
    )
  }

  if (ctx.distance) {
    for (const module of content.modules) {
      const where = `模块 ${module.key} 标题`
      if (module.title && module.title.includes(ctx.distance) && !distanceWhere.has(where)) {
        issues.push(`${where} 重复了时间距离「${ctx.distance}」；标题不要复述系统已给的时间`)
      }
    }
  }

  return issues
}

interface ContentText {
  where: string
  text: string
  moduleKey?: string
  itemKey?: string
  moduleSummary?: boolean
}

function contentTexts(content: DocAiContent): ContentText[] {
  const texts: ContentText[] = [
    { where: '结论', text: content.conclusion }
  ]
  for (const module of content.modules) {
    texts.push({ where: `模块 ${module.key} 标题`, text: module.title, moduleKey: module.key })
    texts.push({
      where: `模块 ${module.key} 判断`,
      text: module.summary,
      moduleKey: module.key,
      moduleSummary: true
    })
    module.paragraphs.forEach((text, index) =>
      texts.push({
        where: `模块 ${module.key} 第 ${index + 1} 段`,
        text,
        moduleKey: module.key
      })
    )
    for (const item of module.items) {
      texts.push({
        where: `模块 ${module.key} 的 ${item.key}`,
        text: item.text ?? '',
        moduleKey: module.key,
        itemKey: item.key
      })
      for (const [key, value] of Object.entries(item.fields ?? {})) {
        texts.push({
          where: `模块 ${module.key} 的 ${item.key}.${key}`,
          text: value,
          moduleKey: module.key,
          itemKey: item.key
        })
      }
    }
  }
  return texts
}

/** 规则层先挡明显问题，AI 再修一次；问题还在就失败，不把坏文本写进报告。 */
export function findTextIssues(content: DocAiContent, planPeriods: string[] = []): string[] {
  const issues: string[] = []
  // 系统生成的阶段时间窗（如「第 10—28 个月」）是合法事实；只有当数字正好落在
  // 这段窗口里才放行，「还有 28 个月」这种距离表达仍然要拦。
  const insidePlanWindow = (text: string, match: RegExpMatchArray): boolean => {
    if (match.index === undefined) return false
    for (const period of planPeriods) {
      let from = 0
      while (from <= text.length) {
        const start = text.indexOf(period, from)
        if (start === -1) break
        const end = start + period.length
        if (match.index >= start && match.index < end) return true
        from = start + 1
      }
    }
    return false
  }
  for (const { where, text } of contentTexts(content)) {
    if (!text.trim()) continue
    if (/(\{\{|\}\}|\{name\}|undefined|null|NaN|XX|示例)/.test(text)) {
      issues.push(`${where} 出现未替换的占位内容`)
    }
    if (/([、，。；：,;:])\1/.test(text) || /[、，]\s*[，、]/.test(text)) {
      issues.push(`${where} 标点重复或连用`)
    }
    if (/的是[、，]/.test(text)) {
      issues.push(`${where} 的「的是」后面缺内容`)
    }
    if (/(报班|报课|学费|名额|不学就来不及|不过级就没戏|不必依赖付费课程|不用报班)/.test(text)) {
      issues.push(`${where} 出现禁用词`)
    }
    if (/没有硬性门槛|保持阅读和表达就够了|英语不是(重点|主线)/.test(text)) {
      issues.push(`${where} 出现没有材料支撑的英语弱化判断`)
    }
    if (/(天坑|野鸡|垃圾专业|最差专业)/.test(text)) {
      issues.push(`${where} 出现贬低专业的说法`)
    }
    if (/\d+(?:\.\d+)?\s*天/.test(text)) {
      issues.push(`${where} 使用了「天」作为时间距离，必须换成粗粒度表达`)
    }
    for (const match of text.matchAll(/(\d+)\s*个月/g)) {
      if (Number(match[1]) >= 12 && !insidePlanWindow(text, match)) {
        issues.push(`${where} 的「${match[0]}」没有使用一年/两年的粗粒度表达`)
      }
    }
    for (const match of text.matchAll(/(^|[^\d])(\d{1,2})\s*年/g)) {
      issues.push(`${where} 的「${match[2]} 年」必须改成中文粗粒度表达`)
    }
  }
  return [...new Set(issues)]
}

function normalizeNumberToken(value: string): string {
  const number = Number(value)
  return Number.isFinite(number) ? String(number) : value
}

function collectNumberTokens(sources: string[]): Set<string> {
  const numbers = new Set<string>()
  for (const source of sources) {
    for (const match of source.matchAll(/\d+(?:\.\d+)?/g)) {
      numbers.add(normalizeNumberToken(match[0]))
    }
  }
  return numbers
}

export function collectAllowedNumbers(sources: string[]): Set<string> {
  const allowed = collectNumberTokens(sources)
  // 中文数字和问卷里的「四级」「大一」是同一事实的另一种写法，不把它误判成新数字。
  const chinese: Record<string, string> = {
    一: '1',
    二: '2',
    两: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10'
  }
  const joined = sources.join('\n')
  for (const [char, value] of Object.entries(chinese)) {
    if (joined.includes(char)) allowed.add(value)
  }
  return allowed
}

/** 「0—10 分」「满分 10 分」「10 分制」是量纲或门槛说明，不是单项得分。 */
function isScoreDimension(text: string, index: number, end: number): boolean {
  const before = text.slice(Math.max(0, index - 8), index)
  // end 落在「分」之后；从「分」本身开始取，才能识别「10 分制」。
  const after = text.slice(Math.max(index, end - 1), end + 1)
  return (
    /[—~\-至/]\s*$/.test(before) ||
    /(满分|入场线|门槛|基准)\s*$/.test(before) ||
    /^\s*分制/.test(after)
  )
}

/** 识别文本里的分数表达：`N 分`、`得分 N`、`N/10`。其余数字交给全报告白名单。 */
function findScoreValues(text: string): { value: number; index: number; end: number }[] {
  const hits: { value: number; index: number; end: number }[] = []
  const seen = new Set<string>()
  const patterns = [
    /(\d+(?:\.\d+)?)\s*分/g,
    /(?:得分|分数)\s*(?:为|是|约|在|：|:)?\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*\/\s*10(?!\d)/g
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1])
      if (!Number.isFinite(value)) continue
      const matchIndex = match.index ?? 0
      const index = matchIndex + match[0].indexOf(match[1])
      const key = `${value}@${index}`
      if (seen.has(key)) continue
      seen.add(key)
      hits.push({ value, index, end: matchIndex + match[0].length })
    }
  }
  return hits
}

export function auditNumbers(content: DocAiContent, allowed: Set<string>, specs: ModuleSpec[]): string[] {
  const problems: string[] = []

  // scorecard 的分数单独校验：item 文本里的分数必须等于该项 score，
  // 模块 summary 里的分数必须是本模块某一项的 score；都不能靠全报告白名单混过去。
  const itemScores = new Map<string, number>()
  const scorecardScores = new Set<string>()
  for (const spec of specs) {
    if (spec.key !== 'scorecard') continue
    for (const item of spec.items) {
      if (typeof item.data.score !== 'number') continue
      itemScores.set(`${spec.key}/${item.key}`, item.data.score)
      scorecardScores.add(normalizeNumberToken(String(item.data.score)))
    }
  }

  for (const entry of contentTexts(content)) {
    for (const match of entry.text.matchAll(/\d+(?:\.\d+)?/g)) {
      const token = normalizeNumberToken(match[0])
      if (!allowed.has(token)) {
        problems.push(`${entry.where} 出现系统没有提供的数字「${match[0]}」`)
      }
    }

    const itemScore = entry.itemKey
      ? itemScores.get(`${entry.moduleKey}/${entry.itemKey}`)
      : undefined
    const isScorecardSummary = entry.moduleSummary === true && entry.moduleKey === 'scorecard'
    if (itemScore === undefined && !isScorecardSummary) continue

    for (const hit of findScoreValues(entry.text)) {
      if (isScoreDimension(entry.text, hit.index, hit.end)) continue
      if (itemScore !== undefined) {
        if (hit.value !== itemScore) {
          problems.push(
            `${entry.where} 写了 ${hit.value} 分，但系统给这一项的分数是 ${itemScore} 分`
          )
        }
      } else if (!scorecardScores.has(normalizeNumberToken(String(hit.value)))) {
        problems.push(`${entry.where} 写了 ${hit.value} 分，但不是这一模块任何一项的分数`)
      }
    }
  }
  return [...new Set(problems)].slice(0, 8)
}
