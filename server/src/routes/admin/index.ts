import { Router } from 'express'
import { config } from '../../env'
import { checkCredentials, createToken, noStore, requireAdmin } from '../../auth'
import { deleteAdminSession } from '../../db'
import { consultRouter } from '../consult/index'
import { rateLimit } from '../../util'
import { invitesRouter } from './invites'
import { overviewRouter } from './overview'
import { resumesRouter } from './resumes'
import { rosterRouter } from './roster'
import { settingsRouter } from './settings'
import { submissionsRouter } from './submissions'

export const adminRouter = Router()

adminRouter.post(
  '/login',
  rateLimit('login', 10, 5 * 60_000),
  (req, res) => {
    noStore(res)
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!username || !password || !checkCredentials(username, password)) {
      res.status(401).json({ error: '账号或密码不对' })
      return
    }
    res.json({ token: createToken(username), user: { username } })
  }
)

adminRouter.post('/dev-login', (req, res) => {
  noStore(res)
  if (!config.devGuestLogin) {
    res.status(404).json({ error: '接口不存在' })
    return
  }
  const username = '本地测试'
  res.json({ token: createToken(username), user: { username } })
})

adminRouter.use(requireAdmin())

adminRouter.use('/consult', consultRouter)

adminRouter.get('/me', (req, res) => {
  res.json({ user: { username: res.locals.admin } })
})

adminRouter.post('/logout', (req, res) => {
  noStore(res)
  const sessionId = typeof res.locals.adminSessionId === 'string' ? res.locals.adminSessionId : ''
  if (sessionId) deleteAdminSession(sessionId)
  res.json({ ok: true })
})

// 子路由按模块划分；各模块内部保持原文件中的路由顺序。
// /submissions/export.csv 在 /submissions/:id 之前，/roster 的具体路径在参数路径之前。
adminRouter.use(resumesRouter)
adminRouter.use(overviewRouter)
adminRouter.use(invitesRouter)
adminRouter.use(rosterRouter)
adminRouter.use(submissionsRouter)
adminRouter.use(settingsRouter)
