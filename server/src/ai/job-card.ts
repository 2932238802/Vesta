import type { SearchResult } from './bocha'

export function dedupeKey(url: string): string {
  return url.replace(/\/$/, '')
}

/** 摘要截断时尽量停在句号，避免出现半句话。 */
export function clipSentence(value: string, max = 96): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  if (clean.length <= max) return clean
  const head = clean.slice(0, max)
  const cut = Math.max(
    ...['。', '！', '？', '；', '!', '?', ';'].map((mark) => head.lastIndexOf(mark))
  )
  if (cut >= max / 2) return head.slice(0, cut + 1)
  return `${head.trimEnd()}…`
}

function formatSalary(min: number, max: number, annual: boolean): string {
  if (annual) {
    if (min >= 10000) {
      const fmt = (value: number) =>
        (value / 10000).toFixed(value % 10000 === 0 ? 0 : 1).replace(/\.0$/, '')
      return `年薪${fmt(min)}-${fmt(max)}万`
    }
    return `年薪${min}-${max} 元`
  }
  if (min % 1000 === 0 && max % 1000 === 0) return `${min / 1000}-${max / 1000}K`
  return `${min}-${max} 元`
}

/** 只接受带金额单位的区间；「1-3 年经验」这类年限不算薪资。 */
export function salaryOf(snippet: string): string {
  const text = snippet.replace(/\s+/g, ' ')
  const withUnit =
    /(\d+(?:\.\d+)?)\s*([kK千万])\s*[-—~至到]\s*(\d+(?:\.\d+)?)\s*([kK千万])/.exec(text)
  if (withUnit) {
    const left = Number(withUnit[1]) * (withUnit[2] === '万' ? 10000 : 1000)
    const right = Number(withUnit[3]) * (withUnit[4] === '万' ? 10000 : 1000)
    if (left >= 1000 && right >= 1000 && right <= 500000) {
      const context = text.slice(
        Math.max(0, withUnit.index - 8),
        withUnit.index + withUnit[0].length + 8
      )
      return formatSalary(left, right, /年薪|\/\s*年|年包|每年/.test(context))
    }
  }

  const pattern = /(\d+(?:\.\d+)?)\s*[-—~至到]\s*(\d+(?:\.\d+)?)\s*(k|K|千|万|元)?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    const [raw, leftText, rightText, unit] = match
    const left = Number(leftText)
    const right = Number(rightText)
    const end = match.index + raw.length
    const after = text.slice(end, end + 2)
    if (/^\s*(年|个月|月)/.test(after)) continue
    if (!unit && (left < 1000 || right < 1000)) continue
    if (left > 500000 || right > 500000) continue
    const context = text.slice(Math.max(0, match.index - 8), end + 8)
    const annual = /年薪|\/\s*年|年包|每年/.test(context)
    if (unit === '元') return formatSalary(left, right, annual)
    if (unit) {
      const factor = unit === '万' ? 10000 : 1000
      return formatSalary(left * factor, right * factor, annual)
    }
    return `${leftText}-${rightText} 元`
  }
  return ''
}
