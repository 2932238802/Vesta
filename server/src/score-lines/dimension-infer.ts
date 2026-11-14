/**
 * 标题维度推断：只在标题出现显式维度词时命中，认不出返回空。
 *
 * 规则（2026-11-14 第 11 篇复核）：
 * - 长度 ≥ 3，或带业务后缀（类 / 考生 / 计划 / 专项 / 学位 / 硕士 / 门类 / 学科）；
 * - 3 字短词（如「经济学」）要求前后不是汉字，避免命中「教育考试院」里的「教育」；
 * - 2 字泛词（如「普通」「教育」）一律不参与标题推断。
 */

import type { ExamType } from '../../../shared/src/score-line'
import {
  POSTGRAD_CATEGORIES,
  POSTGRAD_TRACKS,
  UPGRADE_CATEGORIES,
  UPGRADE_TRACKS
} from '../../../shared/src/score-line-dimension'
import type { DimensionKind, DimensionValue } from '../../../shared/src/score-line-dimension'

const BUSINESS_SUFFIXES = ['类', '考生', '计划', '专项', '学位', '硕士', '门类', '学科']
const HAN = /^\p{Script=Han}$/u

export function hasBusinessSuffix(key: string): boolean {
  return BUSINESS_SUFFIXES.some((suffix) => key.endsWith(suffix))
}

export function isInferableToken(key: string): boolean {
  return key.length >= 3 || hasBusinessSuffix(key)
}

export function occursAsDimensionWord(text: string, key: string): boolean {
  if (hasBusinessSuffix(key) || key.length >= 4) return text.includes(key)
  const strict = key.length >= 3
  let index = text.indexOf(key)
  while (index >= 0) {
    if (!strict) return true
    const before = index > 0 ? text[index - 1] : ''
    const after = index + key.length < text.length ? text[index + key.length] : ''
    if (!HAN.test(before) && !HAN.test(after)) return true
    index = text.indexOf(key, index + 1)
  }
  return false
}

/** 严格匹配：按 token 长度降序，只接受显式词。 */
export function inferFrom(table: DimensionValue[], text: string): string {
  let best: { value: string; length: number } | null = null
  for (const item of table) {
    const tokens = [...new Set([item.value, item.label, ...item.aliases])]
    for (const token of tokens) {
      const key = token.replace(/\s+/g, '')
      if (!isInferableToken(key) || !occursAsDimensionWord(text, key)) continue
      if (!best || key.length > best.length) best = { value: item.value, length: key.length }
    }
  }
  return best?.value ?? ''
}

function tablesFor(kind: DimensionKind, exam?: ExamType): DimensionValue[][] {
  if (kind === 'category') {
    return exam === 'postgrad'
      ? [POSTGRAD_CATEGORIES]
      : exam === 'upgrade'
        ? [UPGRADE_CATEGORIES]
        : [POSTGRAD_CATEGORIES, UPGRADE_CATEGORIES]
  }
  return exam === 'postgrad'
    ? [POSTGRAD_TRACKS]
    : exam === 'upgrade'
      ? [UPGRADE_TRACKS]
      : [POSTGRAD_TRACKS, UPGRADE_TRACKS]
}

export function inferCategory(title: string, exam?: ExamType): string {
  const text = String(title ?? '')
  for (const table of tablesFor('category', exam)) {
    const found = inferFrom(table, text)
    if (found) return found
  }
  return ''
}

export function inferTrack(title: string, exam?: ExamType): string {
  const text = String(title ?? '')
  for (const table of tablesFor('track', exam)) {
    const found = inferFrom(table, text)
    if (found) return found
  }
  return ''
}
