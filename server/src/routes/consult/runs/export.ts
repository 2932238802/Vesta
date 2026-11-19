import type { Request, Response } from 'express'
import { noStore } from '../../../auth'
import {
  buildConsultExportModel,
  consultExportFilename,
  renderConsultDocx,
  renderConsultHtml,
  renderConsultText
} from '../../../consult-export'
import { readRun } from './shared'

// 导出已经写好的咨询稿。只导出 status=ready 的模块，内容和页面里的全文一致。
// 支持 docx / html / txt；Word 不依赖第三方库，直接由 consult-export 拼出 OOXML。
export function exportRun(req: Request, res: Response): void {
  noStore(res)
  const format = req.params.format
  if (format !== 'docx' && format !== 'html' && format !== 'txt') {
    res.status(400).json({ error: '只支持导出 docx、html 或 txt' })
    return
  }
  const run = readRun(req.params.id)
  if (!run) {
    res.status(404).json({ error: '没有找到这次生成记录' })
    return
  }
  const model = buildConsultExportModel(run)
  if (!model) {
    res.status(400).json({ error: '咨询稿还没生成完，暂时不能导出' })
    return
  }

  const filename = consultExportFilename(run, format)
  const fallback = `consult-${run.id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12) || 'run'}.${format}`
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  res.setHeader('Content-Disposition', `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`)

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(renderConsultHtml(model))
    return
  }
  if (format === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.send(renderConsultText(model))
    return
  }
  const buffer = renderConsultDocx(model)
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
  res.setHeader('Content-Length', String(buffer.length))
  res.end(buffer)
}
