import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from '../env'

fs.mkdirSync(config.dataDir, { recursive: true })

export const dbPath = path.join(config.dataDir, 'vesta.db')
export const db = new DatabaseSync(dbPath)
