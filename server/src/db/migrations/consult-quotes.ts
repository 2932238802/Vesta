import fs from 'node:fs'
import { db } from '../connection'
import { getSetting, now, setSetting } from '../core'
import { log } from '../../log'

interface ConsultQuoteSeed {
  version: number
  categories: { id: string; name: string; sortOrder: number }[]
  quotes: { id: string; categoryId: string; no: string; text: string }[]
}

function readConsultQuoteSeed(): ConsultQuoteSeed {
  const url = new URL('../../data/consult-quotes-seed.json', import.meta.url)
  return JSON.parse(fs.readFileSync(url, 'utf8')) as ConsultQuoteSeed
}

/**
 * 金句栏首批种子（v1.91）：全新库首次启动写入 11 类 140 条，之后完全人工维护。
 * - 标记位 settings.consult_quotes_seed_applied=1，只有事务整体成功才写；
 * - 失败回滚且不写标记，下次启动自动重试；
 * - 使用稳定 id + INSERT OR IGNORE，标记被人工删除后重跑也不会产生重复。
 */
export function seedConsultQuotes(): void {
  if (getSetting('consult_quotes_seed_applied') === '1') return
  let data: ConsultQuoteSeed
  try {
    data = readConsultQuoteSeed()
  } catch (error) {
    log.error('db.consult_quotes_seed_failed', { stage: 'read', err: error })
    return
  }

  const insertCategory = db.prepare(
    `INSERT OR IGNORE INTO consult_quote_categories
      (id, name, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
  const insertQuote = db.prepare(
    `INSERT OR IGNORE INTO consult_quotes
      (id, category_id, no, text, source, pinned, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', 0, ?, ?, ?)`
  )
  const timestamp = now()
  const quoteSortOrders = new Map<string, number>()

  db.exec('BEGIN')
  try {
    for (const category of data.categories) {
      insertCategory.run(category.id, category.name, category.sortOrder, timestamp, timestamp)
    }
    for (const quote of data.quotes) {
      const sortOrder = (quoteSortOrders.get(quote.categoryId) ?? 0) + 1
      quoteSortOrders.set(quote.categoryId, sortOrder)
      insertQuote.run(
        quote.id,
        quote.categoryId,
        quote.no,
        quote.text,
        sortOrder,
        timestamp,
        timestamp
      )
    }
    setSetting('consult_quotes_seed_applied', '1')
    db.exec('COMMIT')
    log.info('db.consult_quotes_seeded', {
      categories: data.categories.length,
      quotes: data.quotes.length
    })
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // 事务可能已被 SQLite 自动回滚，这里只保证不掩盖原始错误。
    }
    log.error('db.consult_quotes_seed_failed', { err: error })
  }
}
