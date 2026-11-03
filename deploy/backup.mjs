import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const [dbFile, outFile] = process.argv.slice(2)
if (!dbFile || !outFile) {
  console.error('usage: node deploy/backup.mjs <db> <out>')
  process.exit(1)
}

const db = new DatabaseSync(path.resolve(dbFile))
const target = path.resolve(outFile).replace(/'/g, "''")
db.exec(`VACUUM INTO '${target}'`)
db.close()
