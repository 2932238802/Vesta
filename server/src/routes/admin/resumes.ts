import { Router, raw } from 'express'
import type { Request, Response } from 'express'
import { isResumeMajor } from '../../../../shared/src/resume'
import type { ResumeImageSummary } from '../../../../shared/src/resume'
import { noStore } from '../../auth'
import { db, newId, now } from '../../db'

export const resumesRouter = Router()

const RESUME_IMAGE_MAX_BYTES = 10 * 1024 * 1024

function detectResumeImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  if (buffer.length >= 6) {
    const head = buffer.subarray(0, 6).toString('ascii')
    if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

function resumeFileName(req: Request): string {
  const header = typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : ''
  let name = header
  try {
    name = decodeURIComponent(header)
  } catch {
    // 文件名不是编码过的就按原样使用。
  }
  name = (name.split(/[\\/]/).pop() ?? '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
  return (name || '简历图片').slice(0, 180)
}

interface ResumeImageRow {
  id: string
  major: string
  file_name: string
  mime: string
  size: number
  created_at: string
  data?: Uint8Array
}

resumesRouter.get('/resumes', (_req, res) => {
  noStore(res)
  const rows = db
    .prepare(
      'SELECT id, major, file_name, mime, size, created_at FROM resume_images ORDER BY created_at DESC'
    )
    .all() as unknown as ResumeImageRow[]
  const items: ResumeImageSummary[] = rows.map((row) => ({
    id: row.id,
    major: row.major,
    fileName: row.file_name,
    mime: row.mime,
    size: row.size,
    createdAt: row.created_at
  }))
  res.json({ items })
})

resumesRouter.post('/resumes', raw({ type: () => true, limit: '20mb' }), (req, res) => {
  try {
    const body = req.body
    if (!Buffer.isBuffer(body) || !body.length) {
      throw new Error('请选择要导入的简历图片')
    }
    if (body.length > RESUME_IMAGE_MAX_BYTES) {
      throw new Error('单张图片不能超过 10MB')
    }
    const mime = detectResumeImageMime(body)
    if (!mime) {
      throw new Error('只支持 JPG、PNG、WebP、GIF 图片')
    }
    const major = typeof req.query.major === 'string' ? req.query.major.trim() : ''
    if (!isResumeMajor(major)) {
      throw new Error('请选择有效的专业')
    }
    const item: ResumeImageSummary = {
      id: newId('resume'),
      major,
      fileName: resumeFileName(req),
      mime,
      size: body.length,
      createdAt: now()
    }
    db.prepare(
      'INSERT INTO resume_images (id, major, file_name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(item.id, item.major, item.fileName, item.mime, item.size, body, item.createdAt)
    res.status(201).json({ item })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '导入失败' })
  }
})

function getResumeImage(id: string): ResumeImageRow | null {
  const row = db
    .prepare('SELECT id, major, file_name, mime, size, created_at, data FROM resume_images WHERE id = ?')
    .get(id) as unknown as ResumeImageRow | undefined
  return row ?? null
}

function sendResumeImage(res: Response, row: ResumeImageRow, download: boolean): void {
  res.setHeader('Content-Type', row.mime)
  res.setHeader('Content-Length', String(row.size))
  res.setHeader('Cache-Control', 'private, no-store')
  if (download) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="resume-image"; filename*=UTF-8''${encodeURIComponent(row.file_name)}`
    )
  }
  res.end(Buffer.from(row.data ?? new Uint8Array()))
}

resumesRouter.get('/resumes/:id/file', (req, res) => {
  const row = getResumeImage(req.params.id)
  if (!row) {
    res.status(404).json({ error: '简历图片不存在' })
    return
  }
  sendResumeImage(res, row, false)
})

resumesRouter.get('/resumes/:id/download', (req, res) => {
  const row = getResumeImage(req.params.id)
  if (!row) {
    res.status(404).json({ error: '简历图片不存在' })
    return
  }
  sendResumeImage(res, row, true)
})

