/**
 * 岗位方向只负责「怎么搜、怎么归类」，不再内置薪资、门槛和岗位描述。
 * 报告里的方向解释必须来自问卷回答、博查招聘原文或后台 Skill。
 */
export interface JobDirection {
  key: string
  name: string
  /** 检索词，只写岗位名，不带城市和“应届”等修饰 */
  query: string
  /** 用来把旧报告里没有 directionKey 的招聘卡片归到方向 */
  keywords: string[]
}

const INTERNATIONAL_TRADE: JobDirection[] = [
  { key: 'trade', name: '外贸业务员 / 外贸跟单', query: '外贸业务员', keywords: ['外贸', '业务', '跟单', '客户'] },
  { key: 'ecommerce', name: '跨境电商运营', query: '跨境电商运营', keywords: ['跨境电商', '电商', '运营', '店铺'] },
  { key: 'docs', name: '单证 / 报关', query: '单证员 报关', keywords: ['单证', '报关', '物流', '货代'] },
  { key: 'banking', name: '银行国际业务 / 国企外贸', query: '银行 国际业务 应届', keywords: ['银行', '国际结算', '信用证', '外汇', '国企'] }
]

const COMPUTER: JobDirection[] = [
  { key: 'backend', name: '后端开发（Java / 服务端）', query: 'Java开发', keywords: ['后端', '服务端', 'java', 'spring', '开发工程师', '软件工程师'] },
  { key: 'frontend', name: '前端开发', query: '前端开发', keywords: ['前端', 'web', 'vue', 'react', 'javascript', '小程序'] },
  { key: 'test', name: '软件测试', query: '软件测试', keywords: ['测试', 'qa', '质量'] },
  { key: 'data', name: '数据分析 / 数据开发', query: '数据分析', keywords: ['数据', 'sql', 'bi', '分析', '算法'] }
]

export function jobDirections(major: string): JobDirection[] {
  const clean = major.replace(/\s+/g, '')
  if (!clean) return []
  if (/国际经济与贸易|国际贸易|外贸/.test(clean)) return INTERNATIONAL_TRADE
  if (/计算机|软件工程|人工智能|数据科学|信息安全|网络工程|物联网/.test(clean)) {
    return COMPUTER
  }
  return [{ key: 'related', name: `${clean}相关岗位`, query: clean, keywords: [] }]
}

/** 旧报告没有 directionKey 时，用标题和摘要里的关键词补一个方向。 */
export function inferDirectionKey(
  text: string,
  directions: JobDirection[]
): string | undefined {
  const lower = text.toLowerCase()
  return directions.find((direction) =>
    direction.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
  )?.key
}

/**
 * 岗位词典：把「都可以吧，想当工程师」这类口语抽成可检索的岗位名。
 * 只放常见岗位词；宁可抽不出（回退专业方向），也不硬猜。
 */
const ROLE_TERMS = [
  ...new Set([
    '管理培训生', '产品经理', '项目经理', '数据分析师', '数据分析', '前端开发', '后端开发',
    'Java开发', '软件测试', '软件工程师', '算法工程师', '测试工程师', '运维工程师',
    '网络安全工程师', 'UI设计', '交互设计', '视觉设计', '工业设计', '平面设计', '室内设计',
    '环境设计', '服装设计', '结构工程师', '电子工程师', '硬件工程师', '电气工程师',
    '机械工程师', '嵌入式开发', '通信工程师', '建筑设计师', '造价工程师', '金融分析师',
    '人力资源专员', '新媒体运营', '跨境电商运营', '市场专员', '销售代表', '客服专员',
    '行政专员', '会计', '出纳', '审计', '翻译', '编辑', '记者', '摄影师', '律师', '护士',
    '医生', '教师', '老师', '程序员', '设计师', '工程师', '运营', '销售', '客服', '文员',
    '行政', '人事', '财务', '法务', '采购', '物流', '策划', '助理', '专员', '经理', '主管',
    '顾问', '实习生'
  ])
].sort((a, b) => b.length - a.length)

/** 口语和停用词；长的写法放前面，避免「都可以」被「可以」先截断。 */
const ROLE_NOISE =
  /都可以|什么都行|想成为|想当|想做|想干|还没想好|还没确定|还没定|不确定|不知道|以后|将来|希望|当个|当一名|当|做|干|就行|可以|相关|之类|等等|随便|都行|吧|呀|啊|呢|嘛|哈|嗯|哦|我|找|等/g

/**
 * 清洗岗位词：去口语、停用词和标点，再用岗位词典取岗位名。
 * 返回空串表示「没写清岗位」，调用方应回退到专业方向。
 */
export function cleanRole(raw: string): string {
  const punctuated = raw
    .replace(/[，。！？、；：,.!?;:""''（）()【】[\]/\\|~～—–]+/g, ' ')
    .trim()
  if (!punctuated) return ''
  const cleaned = punctuated
    .replace(ROLE_NOISE, ' ')
    .replace(/[的\s]*(?:岗位|工作|职位|职业|方向)\s*$/, '')
    .replace(/[^\p{L}\p{N}+#./ ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  const compact = cleaned.replace(/\s+/g, '')
  const term = ROLE_TERMS.find((item) => compact.includes(item))
  if (term) return term
  // 抽不出词典词时，只接受短而完整的写法，避免把整句口语当岗位名。
  if (compact.length >= 2 && compact.length <= 10) return compact
  return ''
}
