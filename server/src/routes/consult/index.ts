import { Router } from 'express'
import { collectionsRouter } from './collections'
import { purposesRouter } from './purposes'
import { runsRouter } from './runs'
import { treesRouter } from './trees'

export const consultRouter = Router()

// 挂载顺序与原单文件里的路由注册顺序一致：
// 工作台/树/模板 → 目的树 → 收藏栏 → 运行与章节。
consultRouter.use(treesRouter)
consultRouter.use(purposesRouter)
consultRouter.use(collectionsRouter)
consultRouter.use(runsRouter)
