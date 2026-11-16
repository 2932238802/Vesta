import type { ReportPayload } from '../../shared/src/types'

/**
 * 面向学生的公开报告统一脱敏：无论报告来自已生成内容、基础版还是历史存档，
 * hero 块里的自动档位一律清空。公开页只保留总分，不保留 A/B/C 或档位文案。
 */
export function hidePriorityForStudent(payload: ReportPayload): ReportPayload {
  return {
    ...payload,
    blocks: payload.blocks.map((block) =>
      block.type === 'hero' ? { ...block, tier: '', tierLabel: '', tierLine: '' } : block
    )
  }
}
