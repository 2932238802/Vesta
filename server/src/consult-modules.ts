import type {
  ConsultPurposePlan,
  ConsultPurposePlanItem
} from '../../shared/src/consult-purpose'

// 对话模块：把目的树里的 purpose 节点按“一次对话动作”重新分组。
// 目的节点回答“要达成什么”，模块回答“这一通电话里，这是哪一段”。
// 模块是生成和编辑的单位，不改变树本身；purposeKey 保持原样，反馈数据不会断。
export interface ConsultModulePlan {
  id: string
  label: string
  stageId: string
  stageLabel: string
  purposeKeys: string[]
  purposeLabels: string[]
  // 有些对话动作只存在于分组节点里（例如“先选最在意的担忧”），
  // 没有独立的 purposeKey，用一句说明把它带进生成提示。
  brief?: string
}

interface ModuleRule {
  id: string
  label: string
  keys?: string[]
  prefixes?: string[]
}

const RULES: ModuleRule[] = [
  {
    id: 'module.open.rapport',
    label: '开场：确认与相似性',
    keys: ['open.confirm-call', 'trust.self-disclosure', 'trust.ask-her-result', 'trust.bridge']
  },
  {
    id: 'module.open.permission',
    label: '开场：许可与氛围',
    keys: ['trust.permission', 'trust.relax', 'open.agenda']
  },
  {
    id: 'module.scan.current',
    label: '摸底：状态与家庭',
    keys: ['scan.holiday', 'scan.parents', 'scan.family-burden']
  },
  {
    id: 'module.scan.school',
    label: '摸底：分数与志愿',
    keys: ['scan.score', 'scan.volunteer', 'scan.worries']
  },
  {
    id: 'module.diag.choose',
    label: '担忧：先选最在意的一个',
    keys: ['diag.choose']
  },
  { id: 'module.diag.social', label: '担忧：社交/社恐', prefixes: ['diag.social'] },
  {
    id: 'module.diag.confidence',
    label: '担忧：不自信',
    prefixes: ['diag.confidence'],
    keys: ['diag.school-gap']
  },
  { id: 'module.diag.parents', label: '担忧：父母不同意', prefixes: ['diag.parents'] },
  { id: 'module.diag.busy', label: '担忧：太忙没时间', prefixes: ['diag.busy'] },
  { id: 'module.diag.money', label: '担忧：大学怎么赚钱', prefixes: ['diag.money'] },
  { id: 'module.diag.dorm', label: '担忧：宿舍关系', prefixes: ['diag.dorm'] },
  { id: 'module.diag.club', label: '担忧：社团要不要加', prefixes: ['diag.club'] },
  { id: 'module.diag.major', label: '担忧：专业不喜欢', prefixes: ['diag.major'] },
  { id: 'module.diag.monitor', label: '担忧：班委竞选', prefixes: ['diag.monitor'] },
  { id: 'module.diag.class', label: '担忧：分班考试', prefixes: ['diag.class'] },
  { id: 'module.diag.union', label: '担忧：学生会', prefixes: ['diag.union'] },
  { id: 'module.diag.party', label: '担忧：入团入党', prefixes: ['diag.party'] },
  {
    id: 'module.window.reframe',
    label: '重定义：这个暑假',
    keys: [
      'window.capability-timing',
      'window.identity',
      'window.fixed-vs-open',
      'window.peers',
      'window.timeline',
      'window.opportunities',
      'window.catch',
      'window.two-paths'
    ]
  },
  {
    id: 'module.window.cases',
    label: '重定义：正反案例',
    prefixes: ['window.cases']
  },
  {
    id: 'module.window.job',
    label: '重定义：就业现实',
    keys: ['window.job'],
    prefixes: ['window.job']
  },
  {
    id: 'module.window.postgrad',
    label: '重定义：升学路径',
    keys: ['window.postgrad']
  },
  {
    id: 'module.filter.ability',
    label: '筛选：只能选一项能力',
    keys: ['filter.one-ability', 'filter.candidates', 'filter.criteria']
  },
  {
    id: 'module.filter.track',
    label: '筛选：赛道与竞赛',
    prefixes: ['filter.track', 'filter.competition']
  },
  {
    id: 'module.filter.english',
    label: '落点：英语逐条验证',
    prefixes: ['filter.english']
  },
  {
    id: 'module.offer.plan',
    label: '承接：她打算怎么学',
    keys: ['offer.ask-plan'],
    prefixes: ['offer.self-study', 'offer.no-idea', 'offer.find-teacher']
  },
  {
    id: 'module.offer.pitfalls',
    label: '承接：自学三坑与真正需要',
    keys: ['offer.three-pitfalls', 'offer.three-needs', 'offer.confirm-need'],
    prefixes: ['offer.pitfall', 'offer.need']
  },
  {
    id: 'module.offer.handoff',
    label: '承接：介绍老师与课程',
    keys: ['offer.handoff']
  },
  {
    id: 'module.offer.price',
    label: '收尾：价格、分期与值不值',
    keys: ['offer.close.price', 'offer.close.self-fund', 'offer.close.risk-reversal']
  },
  {
    id: 'module.offer.parents',
    label: '收尾：和家长沟通',
    keys: ['offer.close.parents']
  },
  {
    id: 'module.offer.hesitation',
    label: '收尾：犹豫时推动',
    keys: ['offer.close.hesitation']
  },
  {
    id: 'module.offer.enroll',
    label: '收尾：报名与开始',
    keys: ['offer.close.enroll']
  },
  {
    id: 'module.offer.followup',
    label: '收尾：课后跟进',
    keys: ['offer.close.followup']
  }
]

function matches(rule: ModuleRule, key: string): boolean {
  if (rule.keys?.includes(key)) return true
  return (rule.prefixes ?? []).some((prefix) => key === prefix || key.startsWith(`${prefix}.`))
}

// 按目的路径的真实顺序分组；没有命中规则的目的，落到所属阶段，避免丢内容。
export function buildModulesFromPlan(plan: ConsultPurposePlan): ConsultModulePlan[] {
  const groups = new Map<
    string,
    {
      rule: ModuleRule | null
      firstOrder: number
      items: ConsultPurposePlanItem[]
    }
  >()
  for (const [index, item] of plan.items.entries()) {
    const rule = RULES.find((entry) => matches(entry, item.purposeKey)) ?? null
    const id = rule?.id ?? `module.stage.${item.stageId}`
    const group = groups.get(id)
    if (group) {
      group.items.push(item)
      continue
    }
    groups.set(id, { rule, firstOrder: index, items: [item] })
  }

  const modules: ConsultModulePlan[] = [...groups.entries()]
    .sort(([, a], [, b]) => a.firstOrder - b.firstOrder)
    .map(([id, group]) => {
      const first = group.items[0]
      return {
        id,
        label: group.rule?.label ?? `${first.stageLabel}：其他目的`,
        stageId: first.stageId,
        stageLabel: first.stageLabel,
        purposeKeys: group.items.map((item) => item.purposeKey),
        purposeLabels: group.items.map((item) => item.label)
      }
    })

  // “先选最在意的担忧”在树里是分组节点，不会进入目的路径。
  // 只要这次要处理具体担忧，就在第一个担忧模块前补一个选择动作，避免直接讲话题。
  const firstWorry = modules.findIndex((module) =>
    module.purposeKeys.some((key) => key.startsWith('diag.'))
  )
  if (firstWorry >= 0 && !modules.some((module) => module.id === 'module.diag.choose')) {
    const anchor = modules[firstWorry]
    modules.splice(firstWorry, 0, {
      id: 'module.diag.choose',
      label: '担忧：先选最在意的',
      stageId: anchor.stageId,
      stageLabel: anchor.stageLabel,
      purposeKeys: [],
      purposeLabels: ['选择她最在意的担忧'],
      brief: '先判断她最在意哪一个，再进入对应话题；可以讲一个，也可以讲多个。'
    })
  }
  return modules
}
