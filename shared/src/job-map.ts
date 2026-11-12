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
