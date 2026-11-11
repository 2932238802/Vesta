/**
 * 报告里的「目标岗位地图」是系统内容，不交给 AI 自由发挥。
 * 专业方向、门槛和薪资都写「经验值」，具体以招聘原文为准；
 * 每个方向下面挂博查检索到的原文链接，用来核对，而不是替学生做决定。
 */
export interface JobDirection {
  key: string
  name: string
  /** 检索词，只写岗位名，不带城市和“应届”等修饰 */
  query: string
  what: string
  entry: string
  salary: string
  fit: string
  /** 用来把旧报告里没有 directionKey 的招聘卡片归到方向 */
  keywords: string[]
}

const INTERNATIONAL_TRADE: JobDirection[] = [
  {
    key: 'trade',
    name: '外贸业务员 / 外贸跟单',
    query: '外贸业务员',
    what: '找客户、报价、跟单、出货、维护老客户；应届生多从业务助理或跟单做起。',
    entry: '本科；英语能读写邮件、敢开口；有外贸实习或展会经历优先；部分公司看四级。',
    salary: '经验值 5–8K + 提成，具体看城市和公司',
    fit: '要主动跟进客户、把细节记清楚；跟单或业务助理是常见起点。',
    keywords: ['外贸', '业务', '跟单', '客户']
  },
  {
    key: 'ecommerce',
    name: '跨境电商运营',
    query: '跨境电商运营',
    what: '平台店铺运营、选品、上架、广告投放、看数据；小公司可能一个人管全流程。',
    entry: '本科；英语读写；Excel 和数据敏感；有店铺或运营实习优先。',
    salary: '经验值 5–9K，深圳 / 杭州 / 义乌差异大',
    fit: '要坐得住、看得懂数据，并及时同步进度。',
    keywords: ['跨境电商', '电商', '运营', '店铺']
  },
  {
    key: 'docs',
    name: '单证 / 报关',
    query: '单证员 报关',
    what: '制作外贸单证、报关报检、对接货代和物流；流程清楚，容错率低。',
    entry: '本科；国际贸易实务 / 单证知识；单证员或报关员证书优先；英语读写。',
    salary: '经验值 4.5–7K，港口和外贸城市岗位更集中',
    fit: '对细致和规则感要求高；岗位数量看城市。',
    keywords: ['单证', '报关', '物流', '货代']
  },
  {
    key: 'banking',
    name: '银行国际业务 / 国企外贸',
    query: '银行 国际业务 应届',
    what: '国际结算、信用证、外汇业务，或国企的进出口、供应链岗位。',
    entry: '本科；四级 / 六级；银行校招笔试面试；党员、学生干部或相关实习加分。',
    salary: '经验值 6–10K，地区和岗位差异大',
    fit: '稳定、规则清楚；竞争主要看学校、证书和实习。',
    keywords: ['银行', '国际结算', '信用证', '外汇', '国企']
  }
]

const COMPUTER: JobDirection[] = [
  {
    key: 'backend',
    name: '后端开发（Java / 服务端）',
    query: 'Java开发',
    what: '写接口、业务逻辑、数据库和部署；校招通常从初级开发或开发管培生做起。',
    entry: '本科；计算机相关专业；一门语言（Java/Python/Go）+ 项目；有实习优先。',
    salary: '经验值 6–12K，一线和头部公司更高',
    fit: '要能坐得住、愿意排查问题；项目比证书更能说明问题。',
    keywords: ['后端', '服务端', 'java', 'spring', '开发工程师', '软件工程师']
  },
  {
    key: 'frontend',
    name: '前端开发',
    query: '前端开发',
    what: '做网页、小程序和管理后台的界面与交互，和后端对接接口。',
    entry: '本科；HTML/CSS/JavaScript + 一个框架（Vue/React）；有作品或实习优先。',
    salary: '经验值 6–10K',
    fit: '要能接受反复改稿和联调；作品集比成绩单直观。',
    keywords: ['前端', 'web', 'vue', 'react', 'javascript', '小程序']
  },
  {
    key: 'test',
    name: '软件测试',
    query: '软件测试',
    what: '写测试用例、做功能/接口测试，推动问题修复；入门比开发平缓。',
    entry: '本科；了解测试流程和用例设计；会一点脚本/SQL 更好；细心。',
    salary: '经验值 5–9K',
    fit: '对细致和沟通要求高，适合愿意把流程盯到底的人。',
    keywords: ['测试', 'qa', '质量']
  },
  {
    key: 'data',
    name: '数据分析 / 数据开发',
    query: '数据分析',
    what: '取数、做报表、分析业务问题；数据开发还要写 SQL/ETL。',
    entry: '本科；SQL + Excel/BI + 统计基础；有项目或实习优先。',
    salary: '经验值 6–12K，算法岗更高但门槛也更高',
    fit: '要能把业务问题翻译成数据问题；作品比证书有用。',
    keywords: ['数据', 'sql', 'bi', '分析', '算法']
  }
]

export function jobDirections(major: string): JobDirection[] {
  const clean = major.replace(/\s+/g, '')
  if (!clean) return []
  if (/国际经济与贸易|国际贸易|外贸/.test(clean)) return INTERNATIONAL_TRADE
  if (/计算机|软件工程|人工智能|数据科学|信息安全|网络工程|物联网/.test(clean)) {
    return COMPUTER
  }
  return [
    {
      key: 'related',
      name: `${clean}相关岗位`,
      query: clean,
      what: '和专业沾边的岗位，具体做什么、要求什么，要看招聘原文。',
      entry: '本科；相关实习、技能或证书优先；具体以招聘原文为准。',
      salary: '经验值区间请点开招聘原文核对',
      fit: '先把 3 条岗位要求抄下来，再判断你现在的经历差在哪。',
      keywords: []
    }
  ]
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
