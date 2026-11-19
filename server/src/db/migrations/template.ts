import { defaultTemplate } from '../../../../shared/src/template'
import type { ReportTemplate } from '../../../../shared/src/types'
import { getSetting, setSetting } from '../core'

export function upgradeTemplate(template: ReportTemplate): { template: ReportTemplate; changed: boolean } {
  const before = JSON.stringify(template)
  const next = JSON.parse(before) as ReportTemplate & {
    copy: ReportTemplate['copy'] & { hero?: { quote?: string } }
  }

  if (!next.modules.some((module) => module.key === 'target')) {
    const heroIndex = next.modules.findIndex((module) => module.key === 'hero')
    next.modules.splice(heroIndex === -1 ? 0 : heroIndex + 1, 0, {
      key: 'target',
      enabled: true
    })
  }

  next.copy.target = {
    ...defaultTemplate.copy.target,
    ...(next.copy.target ?? {}),
    salaryBands: {
      ...defaultTemplate.copy.target.salaryBands,
      ...(next.copy.target?.salaryBands ?? {})
    }
  }

  next.copy.cognition = {
    ...defaultTemplate.copy.cognition,
    ...(next.copy.cognition ?? {}),
    options: {
      ...defaultTemplate.copy.cognition.options,
      ...(next.copy.cognition?.options ?? {})
    }
  }

  // 旧版认知模块是按“选一个最重要的因素”写的，变量和判定方式都已过时。
  // 只替换确定是旧版默认文案的字段，保留管理员自己改过的内容。
  const cognition = next.copy.cognition
  const legacy: Partial<Record<'title' | 'intro' | 'compare' | 'needLine' | 'closing', string[]>> = {
    title: ['你怎么看，和你实际缺什么'],
    intro: ['你把最关键的因素选成了「{{choice}}」，下面只把两个回答放在一起，不下结论'],
    compare: [
      '而你在「{{low}}」上打了 {{lowScore}} 分，是全卷最低的一项',
      '你在「{{top}}」上给了 {{topWeight}} 分，但这一项的实际得分是 {{topScore}} 分。'
    ],
    needLine: [
      '你在「{{need}}」上打的缺口权重最高（{{needWeight}} 分），所以它在总分里占了更高的比重，这次判定按这个权重计算。',
      '你在「{{need}}」上打的分数最低（{{needWeight}} 分），是五项里最缺的一项，所以它在总分里占了更高的比重，这次判定按这个权重计算。'
    ],
    closing: ['如果这两件事都成立，你打算先动哪一个']
  }
  for (const key of ['title', 'intro', 'compare', 'needLine', 'closing'] as const) {
    const current = cognition[key]
    if (
      legacy[key]?.includes(current) ||
      (key === 'intro' && current.includes('{{choice}}')) ||
      (key === 'compare' && /{{(low|lowScore)}}/.test(current))
    ) {
      cognition[key] = defaultTemplate.copy.cognition[key]
    }
  }

  if (next.copy.hero && 'quote' in next.copy.hero) {
    delete next.copy.hero.quote
  }

  if (next.theme.brand === 'Vesta') next.theme.brand = ''

  const footer = next.copy.footer as { note?: string; line1?: string; line2?: string } | undefined
  next.copy.footer = {
    note:
      !footer?.note || footer.note === '仅用于个人参考'
        ? defaultTemplate.copy.footer.note
        : footer.note
  }

  // 旧版领取文案默认“填完就能约到”，实际上要看时间安排，且约上才免费。
  // 只替换确认是旧默认值的字段，保留管理员自己改过的内容。
  const claim = next.copy.claim
  if (claim) {
    const legacyClaim: Partial<Record<keyof typeof claim, string[]>> = {
      title: ['领取一次免费规划'],
      description: [
        '留两个你方便的时间段和微信号，我会按顺序联系你，一次约四十分钟',
        '留下两个你方便的时间段和微信号。我会先看自己的时间安排，不一定都能约上；能约上的话，一次聊四十分钟左右。'
      ],
      freeNote: [
        '这是一次免费的现状梳理，不代表任何课程推销。你不报课，这次梳理照样做',
        '如果时间合适，这次梳理是免费的，也不代表任何课程推销；约不上也不会向你收费。'
      ],
      submit: ['提交'],
      successTitle: ['收到了'],
      successBody: [
        '我会在两天内加你，按你留的时间段约',
        '我会尽快看时间安排：有合适的时间就加你确认；没有合适时间会直接告诉你，不会收费。'
      ]
    }
    for (const key of Object.keys(legacyClaim) as (keyof typeof claim)[]) {
      if (legacyClaim[key]?.includes(claim[key])) {
        claim[key] = defaultTemplate.copy.claim[key]
      }
    }
  }

  // 家庭支持不是学生能自己补的能力项，旧版“补家庭支持”的说法不再使用。
  const b8 = next.dimensions?.b8
  if (b8) {
    if (b8.gap?.what === '一次把规划讲清楚的沟通') {
      b8.gap.what = defaultTemplate.dimensions.b8.gap.what
    }
    if (
      b8.gap?.how === '用具体数字和步骤跟家里说明你要做什么、需要多少支持、多久能看到反馈'
    ) {
      b8.gap.how = defaultTemplate.dimensions.b8.gap.how
    }
    if (b8.gap?.when === '下次回家前准备好') {
      b8.gap.when = defaultTemplate.dimensions.b8.gap.when
    }
    if (b8.action30 === '把你的规划写成一页纸，找家里认真聊一次') {
      b8.action30 = defaultTemplate.dimensions.b8.action30
    }
  }

  // 英语成为独立维度后，旧模板需要补上 b9 的话术，雷达图标题也从八项改为九项。
  if (!next.dimensions.b9) {
    next.dimensions.b9 = defaultTemplate.dimensions.b9
  }
  if (next.copy.radar?.title === '八项现状') {
    next.copy.radar.title = defaultTemplate.copy.radar.title
  }

  return {
    template: next,
    changed: JSON.stringify(next) !== before
  }
}

/** 把已保存的报告模板升级到最新结构；数据损坏时保留原始数据。可重复执行。 */
export function migrateTemplate(): void {
  const raw = getSetting('report_template')
  if (!raw) return
  try {
    const current = JSON.parse(raw) as ReportTemplate
    const result = upgradeTemplate(current)
    if (result.changed) setSetting('report_template', JSON.stringify(result.template))
  } catch {
    // 同上，保留原始数据
  }
}
