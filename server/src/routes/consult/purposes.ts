import { Router } from 'express'
import { readPurposePayload } from './shared'

export const purposesRouter = Router()

purposesRouter.get('/purposes', (_req, res) => {
  try {
    res.json(readPurposePayload())
  } catch {
    res.status(500).json({
      error:
        '咨询树数据还没有生成。请先运行 node prototype/consult-purpose-tree/generate.mjs。'
    })
  }
})
