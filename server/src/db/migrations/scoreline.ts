import { batchChecksum, resolveSubject } from '../../../../shared/src/score-line'
import { normalizeProvince, provinceRegion } from '../../../../shared/src/score-line-region'
import { db } from '../connection'
import { getSetting, now, setSetting } from '../core'
import { saveBatch } from '../../score-lines/batch-store'
import { inferCategory, inferTrack, legacySubjectCode } from '../../score-lines/normalize'
import { log } from '../../log'

interface LegacyScoreLineSet {
  id: string
  category_id: string
  title: string
  year: number
  region: string
  source_name: string
  source_url: string
  note: string
  created_at: string
  updated_at: string
}

interface LegacyScoreLineEntry {
  label: string
  value: number
  max_value: number | null
  note: string
}

/**
 * v1 录入页（score_line_sets/entries）→ v3 批次表。只迁 postgrad/upgrade，
 * cet/teacher/civil 跳过；旧表保留、不删；标记可重复执行。
 */
export function migrateScoreLineV1(): void {
  if (getSetting('scoreline_v3_migrated') === '1') return
  let migrated = 0
  let skipped = 0
  try {
    const sets = db.prepare('SELECT * FROM score_line_sets').all() as unknown as LegacyScoreLineSet[]
    for (const set of sets) {
      if (set.category_id !== 'postgrad' && set.category_id !== 'upgrade') {
        skipped += 1
        continue
      }
      const entries = db
        .prepare('SELECT label, value, max_value, note FROM score_line_entries WHERE set_id = ? ORDER BY sort_order')
        .all(set.id) as unknown as LegacyScoreLineEntry[]
      if (entries.length === 0) continue
      const exam = set.category_id === 'postgrad' ? 'postgrad' : 'upgrade'
      const scope = exam === 'postgrad' ? 'national' : 'provincial'
      const regionText = String(set.region ?? '').trim()
      const province = exam === 'upgrade' ? normalizeProvince(regionText) : ''
      const region =
        exam === 'postgrad'
          ? /^[AB]区$/i.test(regionText.replace(/\s+/g, ''))
            ? regionText.replace(/\s+/g, '').toUpperCase()
            : provinceRegion(regionText)
          : ''
      const metrics = entries.map((entry) => {
        const subject = resolveSubject(entry.label)
        return {
          subjectCode: subject?.code ?? legacySubjectCode(entry.label),
          subjectName: subject?.name ?? entry.label,
          fullScore: entry.max_value === null ? null : Number(entry.max_value),
          value: Number(entry.value),
          isMinimum: 0 as const,
          minimumType: '' as const,
          note: entry.note ?? ''
        }
      })
      const batch = {
        scope: scope as 'national' | 'provincial',
        exam: exam as 'postgrad' | 'upgrade',
        year: Number(set.year),
        province,
        region,
        schoolId: '',
        programId: '',
        category: inferCategory(set.title, exam),
        track: inferTrack(set.title, exam),
        title: set.title,
        sourceName: set.source_name,
        sourceUrl: set.source_url,
        publishedAt: '',
        confidence: 1,
        note: set.note ?? '',
        metrics
      }
      saveBatch(batch, {
        reviewStatus: 'approved',
        checksum: batchChecksum(batch),
        fetchedAt: set.updated_at || set.created_at || now()
      })
      migrated += 1
    }
    setSetting('scoreline_v3_migrated', '1')
    log.info('db.scoreline_v1_migrated', { migrated, skipped })
  } catch (error) {
    // 失败不写标记，修好数据后可重跑；旧表不受影响。
    log.error('db.scoreline_v1_migrate_failed', { err: error })
  }
}
