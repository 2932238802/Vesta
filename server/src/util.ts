import crypto from 'node:crypto'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { config } from './env'

export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function randomToken(bytes = 18): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastCleanup = 0

export function rateLimit(name: string, limit: number, windowMs: number): RequestHandler {
  return (req, res, next) => {
    const now = Date.now()
    if (now - lastCleanup > 60_000) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key)
      }
      lastCleanup = now
    }

    const key = `${name}:${clientIp(req)}`
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    bucket.count += 1
    if (bucket.count > limit) {
      res.status(429).json({ error: '请求过于频繁，请稍后再试' })
      return
    }
    next()
  }
}

const keyBytes = crypto.createHash('sha256').update(config.contactKey).digest()

export function encryptText(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptText(payload: string): string {
  try {
    const buffer = Buffer.from(payload, 'base64')
    const iv = buffer.subarray(0, 12)
    const tag = buffer.subarray(12, 28)
    const encrypted = buffer.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  // 防止 Excel / WPS 把用户填写的内容当成公式执行。
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback
  try {
    return JSON.parse(String(value)) as T
  } catch {
    return fallback
  }
}

export function clampString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function isNonEmptyString(value: unknown, max = 1000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}
