import { Router } from 'express'
import { collectionsRouter } from './collections'
import { purposesRouter } from './purposes'
import { questionsRouter } from './questions'
import { quotesRouter } from './quotes'
import { runsRouter } from './runs'
import { storiesRouter } from './stories'
import { topicsRouter } from './topics'
import { treesRouter } from './trees'

export const consultRouter = Router()

// 挂载顺序与原单文件里的路由注册顺序一致：
// 工作台/树/模板 → 目的树 → 金句栏 → 有效的提问 → 故事集 → 大学常识 → 收藏栏 → 运行与章节。
consultRouter.use(treesRouter)
consultRouter.use(purposesRouter)
consultRouter.use(quotesRouter)
consultRouter.use(questionsRouter)
consultRouter.use(storiesRouter)
consultRouter.use(topicsRouter)
consultRouter.use(collectionsRouter)
consultRouter.use(runsRouter)
