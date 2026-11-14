/** 分数线科目注册表与归一化：同一科目跨年份、跨来源必须用同一 code。 */

export interface SubjectDefinition {
  code: string
  name: string
  aliases: string[]
}

export const subjectDefinitions: SubjectDefinition[] = [
  { code: 'total', name: '总分', aliases: ['总分', '总成绩', '总分线', '总成绩线', '合计'] },
  {
    code: 'single100',
    name: '单科（满分=100分）',
    aliases: ['单科（满分=100分）', '单科（满分=100）', '单科满分100', '单科100']
  },
  {
    code: 'single150',
    name: '单科（满分>100分）',
    aliases: ['单科（满分>100分）', '单科（满分>100）', '单科满分超过100', '单科150']
  },
  { code: 'politics', name: '政治', aliases: ['政治', '思想政治', '思想政治理论'] },
  { code: 'english1', name: '英语一', aliases: ['英语一', '英语1', '英语（一）'] },
  { code: 'english2', name: '英语二', aliases: ['英语二', '英语2', '英语（二）'] },
  { code: 'math1', name: '数学一', aliases: ['数学一', '数学1', '数学（一）'] },
  { code: 'math2', name: '数学二', aliases: ['数学二', '数学2', '数学（二）'] },
  { code: 'major1', name: '专业课一', aliases: ['专业课一', '专业一', '业务课一', '专业课（一）'] },
  { code: 'major2', name: '专业课二', aliases: ['专业课二', '专业二', '业务课二', '专业课（二）'] },
  { code: 'english', name: '英语', aliases: ['英语', '大学英语', '公共英语'] },
  { code: 'computer', name: '计算机', aliases: ['计算机', '计算机基础', '计算机文化基础', '信息技术'] },
  { code: 'chinese', name: '语文', aliases: ['语文', '大学语文'] },
  { code: 'math', name: '数学', aliases: ['数学', '高等数学'] },
  { code: 'major', name: '专业课', aliases: ['专业课', '专业综合', '专业基础', '综合课'] },
  { code: 'other', name: '其他', aliases: ['其他', '其它'] }
]

const subjectByCode = new Map(subjectDefinitions.map((item) => [item.code, item]))

function subjectKey(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[（）()【】[\]]/g, '')
    .replace(/[：:]/g, '')
    .replace(/(分数线|成绩线|线)$/, '')
}

const subjectByAlias = new Map<string, SubjectDefinition>()
for (const item of subjectDefinitions) {
  for (const alias of [item.name, ...item.aliases]) {
    subjectByAlias.set(subjectKey(alias), item)
  }
}

/** 把「政治 / 英语（一） / 总分线」等写法归一成固定科目；认不出返回 null。 */
export function resolveSubject(value: string | null | undefined): SubjectDefinition | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const byCode = subjectByCode.get(raw)
  if (byCode) return byCode
  return subjectByAlias.get(subjectKey(raw)) ?? null
}

export function subjectNameOf(code: string, fallback = ''): string {
  return subjectByCode.get(code)?.name ?? (fallback || code)
}
