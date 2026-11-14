/** 抓取发现：候选链接筛选与列表页「取最新年份」规则。纯函数，便于用例。 */

export const MAX_LINKS_PER_PAGE = 10
export const MAX_LIST_LINKS = 5

function linkPriority(text: string): number {
  let score = /20\d{2}/.test(text) ? 1 : 0
  if (/分数线|控制线|最低控制/.test(text)) score += 3
  else if (/录取|复试/.test(text)) score += 2
  else if (/招生计划|专业目录|简章/.test(text)) score += 1
  return score
}

/**
 * 列表页（候选 ≥3 条且多数带年份）只取最新年份，按「分数线 > 录取 > 计划」排序；
 * 普通页最多取 10 条，避免把十年公告全抓一遍。
 */
export function selectCandidates(items: { url: string; text: string }[]): string[] {
  const withYear = items.map((item) => /20\d{2}/.exec(item.text)?.[0] ?? '')
  const isList = items.length >= 3 && withYear.filter(Boolean).length >= Math.ceil(items.length / 2)
  if (!isList) return items.slice(0, MAX_LINKS_PER_PAGE).map((item) => item.url)
  const latest = Math.max(...withYear.filter(Boolean).map((year) => Number(year)))
  return items
    .map((item, index) => ({ ...item, priority: linkPriority(item.text), index }))
    .filter((item) => Number(/20\d{2}/.exec(item.text)?.[0] ?? latest) === latest)
    .sort((a, b) => b.priority - a.priority || a.index - b.index)
    .slice(0, MAX_LIST_LINKS)
    .map((item) => item.url)
}

/** 引导页最多跟 1 跳，且必须同域。 */
export function followTarget(redirect: string, fromUrl: string): string {
  try {
    const target = new URL(redirect, fromUrl)
    if (target.hostname !== new URL(fromUrl).hostname) return ''
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return ''
    return target.toString()
  } catch {
    return ''
  }
}
