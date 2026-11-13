import { config } from './env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogFields = Record<string, unknown>

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

/**
 * 统一日志出口：生产输出单行 JSON（journalctl -o cat | jq 可过滤），
 * 开发输出人类可读单行。不要在这里记录密码、密钥、联系方式、完整答卷或完整 AI 正文。
 */
function normalizeError(error: unknown, fullStack: boolean): LogFields {
  if (error instanceof Error) {
    const lines = (error.stack ?? '').split('\n').filter(Boolean)
    return {
      name: error.name,
      message: error.message,
      // journald 里保留完整堆栈会刷屏；生产只留前 3 行，开发保留全文。
      stack: fullStack ? lines.join('\n') : lines.slice(0, 3).join('\n')
    }
  }
  return { name: 'Error', message: String(error) }
}

function normalizeFields(fields: LogFields | Error | undefined): LogFields {
  if (!fields) return {}
  if (fields instanceof Error) return { err: normalizeError(fields, !config.isProd) }
  const normalized: LogFields = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    normalized[key] =
      value instanceof Error ? normalizeError(value, !config.isProd) : value
  }
  return normalized
}

function describe(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return value.replace(/\s+/g, ' ')
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function describeError(value: unknown): string {
  if (!value || typeof value !== 'object') return describe(value)
  const error = value as { name?: unknown; message?: unknown; stack?: unknown }
  const name = typeof error.name === 'string' ? error.name : 'Error'
  const message = typeof error.message === 'string' ? error.message : ''
  const firstFrame =
    typeof error.stack === 'string'
      ? error.stack
          .split('\n')
          .slice(1)
          .find((line) => line.trim().startsWith('at '))
          ?.trim()
      : undefined
  return `${name}: ${message}${firstFrame ? ` @ ${firstFrame}` : ''}`
}

function humanLine(level: LogLevel, msg: string, fields: LogFields): string {
  const time = new Date().toTimeString().slice(0, 8)
  const parts = Object.entries(fields).map(([key, value]) => {
    if (key === 'err') return `err=${describeError(value)}`
    return `${key}=${describe(value)}`
  })
  return `${time} ${level.toUpperCase().padEnd(5)} ${msg}${parts.length ? ` ${parts.join(' ')}` : ''}`
}

function emit(level: LogLevel, msg: string, fields?: LogFields | Error): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[config.logLevel]) return
  const normalized = normalizeFields(fields)
  if (config.isProd) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...normalized }))
    return
  }
  console.log(humanLine(level, msg, normalized))
}

export const log = {
  debug(msg: string, fields?: LogFields): void {
    emit('debug', msg, fields)
  },
  info(msg: string, fields?: LogFields): void {
    emit('info', msg, fields)
  },
  warn(msg: string, fields?: LogFields | Error): void {
    emit('warn', msg, fields)
  },
  error(msg: string, fields?: LogFields | Error): void {
    emit('error', msg, fields)
  }
}
