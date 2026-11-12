import { defaultTemplate } from '../../../shared/src/template'
import type { ReportTemplate } from '../../../shared/src/types'
import { getSetting, setSetting } from './core'

export function getTemplate(): ReportTemplate {
  const raw = getSetting('report_template')
  if (!raw) return defaultTemplate
  try {
    return JSON.parse(raw) as ReportTemplate
  } catch {
    return defaultTemplate
  }
}

export function saveTemplate(template: ReportTemplate): void {
  setSetting('report_template', JSON.stringify(template))
}
