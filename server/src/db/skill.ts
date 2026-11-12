import crypto from 'node:crypto'
import { defaultReportSkill } from '../../../shared/src/ai'
import { defaultDocReportSkill } from '../../../shared/src/doc-skill'
import { getSetting, newId, now, setSetting } from './core'

// 未改过的默认 Skill 才自动升级；管理员自己编辑过的内容保持原样。
const LEGACY_SKILL_HASHES = new Set([
  '76d1851d6dcf5cb6a41f50e2f8f9890fdb2733f7f848b9193efcaca0ade62349',
  // v0.1 的默认 Skill：把英语放在“条件项”位置，已被新规则替换。
  '9671baff4538eef9fcda41afa77a77ddeb92c046189abc6bf16306df0ce1858e'
])

export function migrateReportSkill(): void {
  const current = getSetting('report_skill')
  if (!current) return
  const hash = crypto.createHash('sha256').update(current).digest('hex')
  if (LEGACY_SKILL_HASHES.has(hash)) setSetting('report_skill', defaultReportSkill)
}

export const DEFAULT_REPORT_SKILL_ID = 'default'

export interface ReportSkillTemplate {
  id: string
  name: string
  skill: string
  createdAt: string
  updatedAt: string
}

const SKILL_TEMPLATES_KEY = 'report_skill_templates_v1'
const ACTIVE_SKILL_KEY = 'report_skill_active_v1'

function readSkillTemplates(): ReportSkillTemplate[] {
  const raw = getSetting(SKILL_TEMPLATES_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ReportSkillTemplate => {
      if (!item || typeof item !== 'object') return false
      const value = item as Record<string, unknown>
      return (
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.skill === 'string' &&
        typeof value.createdAt === 'string' &&
        typeof value.updatedAt === 'string'
      )
    })
  } catch {
    return []
  }
}

function writeSkillTemplates(templates: ReportSkillTemplate[]): void {
  setSetting(SKILL_TEMPLATES_KEY, JSON.stringify(templates))
}

export function migrateReportSkillTemplates(): void {
  if (getSetting(SKILL_TEMPLATES_KEY)) return
  const current = getSetting('report_skill')?.trim() ?? ''
  const templates: ReportSkillTemplate[] = []
  let activeId = DEFAULT_REPORT_SKILL_ID
  if (current && current !== defaultReportSkill) {
    const timestamp = now()
    const template: ReportSkillTemplate = {
      id: newId('skill'),
      name: '原有自定义规则',
      skill: current,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    templates.push(template)
    activeId = template.id
  }
  writeSkillTemplates(templates)
  setSetting(ACTIVE_SKILL_KEY, activeId)
}

export function getReportSkillState(): {
  templates: ReportSkillTemplate[]
  activeId: string
} {
  const templates = readSkillTemplates()
  // 保留原始 activeId；指向不存在的模板时由 getDocReportSkill 明确报错，
  // 不能静默改回默认规则，否则文档承诺的「找不到就失败」永远不会发生。
  const activeId = getSetting(ACTIVE_SKILL_KEY) || DEFAULT_REPORT_SKILL_ID
  return { templates, activeId }
}

export function getReportSkill(): string {
  const { templates, activeId } = getReportSkillState()
  return (
    templates.find((template) => template.id === activeId)?.skill.trim() || defaultReportSkill
  )
}

export interface ReportSkillSource {
  id: string
  name: string
  skill: string
  hash: string
}

function skillHash(skill: string): string {
  return crypto.createHash('sha256').update(skill).digest('hex').slice(0, 16)
}

/**
 * doc 模式报告的主 Skill 来源。
 * 默认设置使用内置的模块化分析规则；自定义模板为空或找不到时明确报错，绝不回退到别的规则。
 */
export function getDocReportSkill(): ReportSkillSource {
  const { templates, activeId } = getReportSkillState()
  if (activeId === DEFAULT_REPORT_SKILL_ID) {
    return {
      id: DEFAULT_REPORT_SKILL_ID,
      name: '默认设置',
      skill: defaultDocReportSkill,
      hash: skillHash(defaultDocReportSkill)
    }
  }

  const template = templates.find((item) => item.id === activeId)
  if (!template) {
    throw new Error('当前启用的 AI 分析规则不存在，请到 /admin/skill 重新选择或新建模板')
  }
  const skill = template.skill.trim()
  if (!skill) {
    throw new Error('当前启用的 AI 分析规则为空，请到 /admin/skill 填写规则后再生成报告')
  }
  return { id: template.id, name: template.name, skill, hash: skillHash(skill) }
}

export function createReportSkillTemplate(name: string, skill: string): ReportSkillTemplate {
  const templates = readSkillTemplates()
  const timestamp = now()
  const template: ReportSkillTemplate = {
    id: newId('skill'),
    name,
    skill,
    createdAt: timestamp,
    updatedAt: timestamp
  }
  writeSkillTemplates([...templates, template])
  return template
}

export function updateReportSkillTemplate(
  id: string,
  name: string,
  skill: string
): ReportSkillTemplate | null {
  const templates = readSkillTemplates()
  const index = templates.findIndex((template) => template.id === id)
  if (index < 0) return null
  const template: ReportSkillTemplate = {
    ...templates[index],
    name,
    skill,
    updatedAt: now()
  }
  templates[index] = template
  writeSkillTemplates(templates)
  return template
}

export function deleteReportSkillTemplate(id: string): boolean {
  const templates = readSkillTemplates()
  const next = templates.filter((template) => template.id !== id)
  if (next.length === templates.length) return false
  writeSkillTemplates(next)
  if (getSetting(ACTIVE_SKILL_KEY) === id) setSetting(ACTIVE_SKILL_KEY, DEFAULT_REPORT_SKILL_ID)
  return true
}

export function activateReportSkill(id: string): boolean {
  if (id === DEFAULT_REPORT_SKILL_ID) {
    setSetting(ACTIVE_SKILL_KEY, DEFAULT_REPORT_SKILL_ID)
    return true
  }
  if (!readSkillTemplates().some((template) => template.id === id)) return false
  setSetting(ACTIVE_SKILL_KEY, id)
  return true
}
