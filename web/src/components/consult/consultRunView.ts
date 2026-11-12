import type { ConsultOutcome, ConsultRun, ConsultRunSectionStatus } from '@shared/consult'

export function runTitle(run: ConsultRun): string {
  const last = run.purposePath?.items.at(-1)
  if (last) return `${last.stageLabel} · ${last.label}`
  if (run.status === 'failed') return '未完成生成'
  return run.purposePath?.templateName || '咨询稿生成'
}

export function progressPercent(run: ConsultRun): number {
  if (run.status === 'ready') return 100
  if (!run.sections.length) return 4
  const done = run.sections.filter((section) => section.status === 'ready').length
  return Math.max(4, Math.round((done / run.sections.length) * 100))
}

export function progressLabel(run: ConsultRun): string {
  if (!run.sections.length) return run.status === 'queued' ? '等待开始' : '正在准备章节'
  const done = run.sections.filter((section) => section.status === 'ready').length
  return `${done} / ${run.sections.length} 个模块`
}

export function sectionStatusLabel(status: ConsultRunSectionStatus): string {
  return {
    pending: '待写',
    running: '正在写',
    ready: '已完成',
    failed: '失败'
  }[status]
}

export function outcomeLabel(outcome: ConsultOutcome): string {
  return {
    won: '成交',
    lost: '未成交',
    liked: '用户好评',
    abandoned: '中途退出',
    '': '待反馈'
  }[outcome]
}

export function outcomeChip(outcome: ConsultOutcome): string {
  if (outcome === 'won' || outcome === 'liked') return 'accent'
  if (outcome === 'lost' || outcome === 'abandoned') return 'warn'
  return ''
}
