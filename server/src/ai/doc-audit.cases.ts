import assert from 'node:assert/strict'
import type { DocAiContent } from '../../../shared/src/doc'
import { crossModuleIssues, findTextIssues, repetitionIssues } from './doc-audit'

interface TextCase {
  text: string
  blocked: boolean
}

/** 考研 + 听力：只拦真的写「考试考听力」的句子，共现不判错。 */
export const CROSS_MODULE_CASES: TextCase[] = [
  { text: '考研和听力是两件要一起抓的事', blocked: false },
  { text: '如果走考研，听力要早点练', blocked: false },
  { text: '对不上的是听力这一层，而英语又是考研里绕不开的一门', blocked: false },
  { text: '考研初试的考试考的是阅读，听力差一点没关系', blocked: false },
  { text: '考研初试不考听力，复试才考', blocked: false },
  { text: '考研复试要考听力，所以现在就得练', blocked: false },
  { text: '雅思托福都考听力，和考研初试不是一回事', blocked: false },
  { text: '考研初试考听力，所以现在就得练', blocked: true },
  { text: '考研英语把听力计入总分', blocked: true },
  { text: '考研初试听力占 30 分', blocked: true }
]

/** 口语降目标 / 补强顺序：覆盖反向语序、换词、跨行，同时放行带否定的正确表述。 */
export const SPEAKING_CASES: TextCase[] = [
  { text: '口语不追求流利', blocked: true },
  { text: '不追求口语流利', blocked: true },
  { text: '口语先放一放', blocked: true },
  { text: '口语缓一缓，先把听力练起来', blocked: true },
  { text: '听力优先，口语以后再说', blocked: true },
  { text: '先补听力，再补口语', blocked: true },
  { text: '先听力\n再口语', blocked: true },
  { text: '口语不能往后放', blocked: false },
  { text: '不能把口语往后放', blocked: false },
  { text: '口语不是不重要，两样都要练', blocked: false },
  { text: '听力和口语要并列写，口语不能缓一缓', blocked: false },
  { text: '口语不用等流利才开始', blocked: false }
]

/** 英语块时长：只拦复述问卷的每周投入 / 总时长，练习节奏放行。 */
export const ENGLISH_TIME_CASES: TextCase[] = [
  { text: '每周练 5 小时', blocked: true },
  { text: '每周投入 17.5 小时', blocked: true },
  { text: '每周 3–7 小时', blocked: true },
  { text: '总时长 17.5 小时', blocked: true },
  { text: '一共 20 小时', blocked: true },
  { text: '每周末做一套真题，隔周重做', blocked: false },
  { text: '每周做一套真题，隔周重做', blocked: false },
  { text: '每天 1 小时听力', blocked: false }
]

function contentOf(
  moduleKey: string,
  paragraphs: string[],
  title = '英语这块怎么补'
): DocAiContent {
  return {
    conclusion: '',
    sections: [],
    modules: [{ key: moduleKey, title, summary: '', paragraphs, items: [] }]
  }
}

function expectBlocked(label: string, issues: string[], blocked: boolean): void {
  const actual = issues.length > 0
  assert.equal(
    actual,
    blocked,
    `${label}：期望${blocked ? '拦截' : '放行'}，实际 ${actual ? issues[0] : '放行'}`
  )
}

export function runDocAuditCases(): void {
  for (const item of CROSS_MODULE_CASES) {
    expectBlocked(
      `考研 × 听力「${item.text}」`,
      crossModuleIssues(contentOf('gap', [item.text]), []),
      item.blocked
    )
  }

  for (const item of SPEAKING_CASES) {
    expectBlocked(
      `口语表述「${item.text.replace(/\n/g, '⏎')}」`,
      findTextIssues(contentOf('english', [item.text])),
      item.blocked
    )
  }

  // 内部检索规则不外露：报告正文不能出现检索词、博查等后台信息。
  for (const text of ['检索词是「上海 工程师 应届 招聘」', '博查返回的结果里没有合适的岗位']) {
    expectBlocked(`内部检索信息「${text}」`, findTextIssues(contentOf('gap', [text])), true)
  }

  const repetitionContext = {
    distance: '三年',
    cityLabel: '',
    city: '',
    englishWeeklyHours: 17.5
  }
  for (const item of ENGLISH_TIME_CASES) {
    expectBlocked(
      `英语块时长「${item.text}」`,
      repetitionIssues(contentOf('english', [item.text]), repetitionContext),
      item.blocked
    )
  }

  // 时长去重只针对英语块，别的模块写每周投入不算重复。
  expectBlocked(
    '非英语模块的每周投入',
    repetitionIssues(contentOf('gap', ['每周练 5 小时']), repetitionContext),
    false
  )
  // 档位值只在独立出现时命中，不能被更长的数字（每天 15 小时）里的「5 小时」误伤。
  expectBlocked(
    '英语时长档位值单独出现',
    repetitionIssues(contentOf('english', ['17.5 小时']), repetitionContext),
    true
  )
  expectBlocked(
    '英语时长不被更长数字误伤',
    repetitionIssues(contentOf('english', ['每天 15 小时']), {
      ...repetitionContext,
      englishWeeklyHours: 5
    }),
    false
  )
}

const directRun = process.argv[1]
  ?.replace(/\\/g, '/')
  .endsWith('/server/src/ai/doc-audit.cases.ts')
if (directRun) {
  runDocAuditCases()
  console.log(
    `报告文本审计用例通过：考研 × 听力 ${CROSS_MODULE_CASES.length} 组 + 口语 ${SPEAKING_CASES.length} 组 + 英语时长 ${ENGLISH_TIME_CASES.length} 组 + 2 组模块 / 数字边界 + 2 组内部信息`
  )
}
