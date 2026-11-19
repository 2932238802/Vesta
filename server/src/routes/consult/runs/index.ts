import { Router } from 'express'
import { createRun, getRun, listRuns, retryRun, updateRunOutcome } from './crud'
import { addSection, deleteSection, patchSection, regenerateSection, rewriteBeats } from './sections'
import { exportRun } from './export'
import { markStaleConsultJobs } from './shared'

export const runsRouter = Router()

markStaleConsultJobs()

// 注册顺序与拆分前保持一致：GET/POST /runs → 详情 → 导出 → 章节 → 重试 → 反馈，
// 避免 /:id 与静态路径冲突，也保持 Express 命中顺序不变。
runsRouter.get('/runs', listRuns)
runsRouter.post('/runs', createRun)
runsRouter.get('/runs/:id', getRun)
runsRouter.get('/runs/:id/export/:format', exportRun)
runsRouter.patch('/runs/:id/sections/:seq', patchSection)
runsRouter.post('/runs/:id/sections/:seq/beats', rewriteBeats)
runsRouter.post('/runs/:id/sections/:seq/regenerate', regenerateSection)
runsRouter.post('/runs/:id/sections', addSection)
runsRouter.delete('/runs/:id/sections/:seq', deleteSection)
runsRouter.post('/runs/:id/retry', retryRun)
runsRouter.patch('/runs/:id/outcome', updateRunOutcome)
