import type { DocAiContent } from '../../../shared/src/doc'
import type { ModuleSpec } from './doc-prompts'

const INTERNAL_WORD = /检索词|检索参数|博查|BOCHA|freshness|site:/i
const SENTENCE = /[^。！？；\n]+[。！？；\n]?/g
const CAP_BEFORE = /(?:封顶|最高|上限|不超过|至多)\s*$/
const SCORE_BEFORE = /(?:得分|分数|实际)\s*(?:为|是|约|在|：|:)?\s*$/

function sentences(text: string): string[] {
  return text.match(SENTENCE) ?? (text ? [text] : [])
}

/** 内部检索信息只删命中黑名单的整句，不补写、不扩写。 */
function stripInternalWords(text: string): string {
  if (!INTERNAL_WORD.test(text)) return text
  return sentences(text)
    .filter((sentence) => !INTERNAL_WORD.test(sentence))
    .join('')
    .trim()
}

/** 报告页把系统行叫「关键节点」；旧提示词或历史内容里的「时间窗」统一收口。 */
function normalizeLabel(text: string): string {
  return text
    .replace(/关键时间窗(?:口)?/g, '关键节点')
    .replace(/时间窗口/g, '节点')
    .replace(/时间窗/g, '节点')
}

/** scorecard 的 item 文本里，不是该项分数的「N 分」按上下文收口；认不出语义时保留原句。 */
function fixWrongScores(text: string, score: number | undefined): string {
  if (score === undefined) return text
  let changed = false
  const fixed = sentences(text)
    .map((sentence) => {
      const hit = [...sentence.matchAll(/(\d+(?:\.\d+)?)\s*分/g)].find(
        (match) => Number(match[1]) !== score
      )
      if (!hit) return sentence
      const index = hit.index ?? 0
      const before = sentence.slice(Math.max(0, index - 8), index)
      if (CAP_BEFORE.test(before)) {
        changed = true
        return '这一项有上限。'
      }
      if (SCORE_BEFORE.test(before)) {
        changed = true
        return `${sentence.slice(0, index)}${score} 分${sentence.slice(index + hit[0].length)}`
      }
      return sentence
    })
    .join('')
  return changed ? fixed : text
}

function clean(text: string): string {
  const stripped = stripInternalWords(text)
  return stripped ? normalizeLabel(stripped) : ''
}

/**
 * 落库前的窄清洗：删真内部词、把「时间窗」收口成「关键节点」、改写 scorecard 里
 * 与系统分数冲突的表述。只删 / 替换，不补写，不生成模板段落。
 */
export function sanitizeDocContent(content: DocAiContent, specs: ModuleSpec[]): DocAiContent {
  const scoreOf = new Map<string, number>()
  for (const spec of specs) {
    if (spec.key !== 'scorecard') continue
    for (const item of spec.items) {
      if (typeof item.data.score === 'number') scoreOf.set(item.key, item.data.score)
    }
  }

  const cleanItemText = (moduleKey: string, itemKey: string, text: string): string => {
    const stripped = stripInternalWords(text)
    if (!stripped) return ''
    const scored = moduleKey === 'scorecard' ? fixWrongScores(stripped, scoreOf.get(itemKey)) : stripped
    return normalizeLabel(scored)
  }

  return {
    conclusion: clean(content.conclusion),
    sections: content.sections
      .map((section) => ({ title: clean(section.title), text: clean(section.text) }))
      .filter((section) => section.title && section.text),
    modules: content.modules.map((module) => ({
      key: module.key,
      title: clean(module.title),
      summary: clean(module.summary),
      paragraphs: module.paragraphs.map(clean).filter(Boolean),
      items: module.items.map((item) => ({
        key: item.key,
        text: item.text ? cleanItemText(module.key, item.key, item.text) : item.text,
        fields: item.fields
          ? Object.fromEntries(
              Object.entries(item.fields)
                .map(([key, value]) => [key, clean(value)] as const)
                .filter(([, value]) => Boolean(value))
            )
          : item.fields
      }))
    }))
  }
}
