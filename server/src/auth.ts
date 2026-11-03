import crypto from 'node:crypto'
import type { RequestHandler, Response } from 'express'
import { config } from './env'
import { getActiveAdminSession, setActiveAdminSession } from './db'

interface TokenPayload {
  sub: string
  exp: number
  sid: string
}

function sign(data: string): string {
  return crypto.createHmac('sha256', config.authSecret).update(data).digest('base64url')
}

export function createToken(username: string): string {
  // 每次登录生成新的会话 id 并落库，旧设备上的 token 会立即失效。
  const sid = crypto.randomBytes(18).toString('base64url')
  setActiveAdminSession(sid)
  const payload: TokenPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + config.sessionTtl,
    sid
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifyToken(token: string | undefined): TokenPayload | null {
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = sign(body)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload
    if (!payload?.sub || typeof payload.exp !== 'number') return null
    if (typeof payload.sid !== 'string' || !payload.sid) return null
    if (payload.exp * 1000 <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function digest(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest()
}

export function checkCredentials(username: string, password: string): boolean {
  const userOk = crypto.timingSafeEqual(digest(username), digest(config.adminUser))
  const passOk = crypto.timingSafeEqual(digest(password), digest(config.adminPassword))
  return userOk && passOk
}

export function requireAdmin(): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined
    const payload = verifyToken(token)
    if (!payload) {
      res.status(401).json({ error: '登录已失效，请重新登录' })
      return
    }
    if (payload.sid !== getActiveAdminSession()) {
      res.status(401).json({ error: '账号已在其他设备登录，请重新登录' })
      return
    }
    res.locals.admin = payload.sub
    next()
  }
}

export function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store')
}
