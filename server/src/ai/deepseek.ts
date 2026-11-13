import { config } from '../env'
import { log } from '../log'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AskDeepSeekOptions {
  json?: boolean
  temperature?: number
  maxTokens?: number
  /** 只放排查用的关联字段（submissionId / stage 等），不要放 prompt 或正文。 */
  context?: Record<string, unknown>
}

export async function askDeepSeek(
  messages: Message[],
  options: AskDeepSeekOptions = {}
): Promise<string> {
  const context = options.context ?? {}
  if (!config.deepseekApiKey) {
    log.warn('ai.not_configured', { ...context, missing: 'AI_API_KEY（或 DEEPSEEK_API_KEY）' })
    throw new Error('未配置 AI_API_KEY（或 DEEPSEEK_API_KEY）')
  }
  if (!config.deepseekBaseUrl) {
    log.warn('ai.not_configured', { ...context, missing: 'AI_BASE_URL（或 DEEPSEEK_BASE_URL）' })
    throw new Error('未配置 AI_BASE_URL（或 DEEPSEEK_BASE_URL）')
  }

  const started = Date.now()
  log.debug('ai.call_start', {
    ...context,
    model: config.deepseekModel,
    messageCount: messages.length
  })

  let response: Response
  try {
    response = await fetch(
      `${config.deepseekBaseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: config.deepseekModel,
          messages,
          temperature: options.temperature ?? 0.55,
          // 报告输出较长，且池子里的模型可能是「会思考」的：
          // reasoning_content 也计入 max_tokens，4096 经常被思考吃光、正文为空。
          max_tokens: options.maxTokens ?? 8192,
          ...(options.json === false ? {} : { response_format: { type: 'json_object' } })
        }),
        signal: AbortSignal.timeout(config.aiTimeoutMs)
      }
    )
  } catch (error) {
    log.warn('ai.call_failed', {
      ...context,
      model: config.deepseekModel,
      ms: Date.now() - started,
      stage: 'fetch',
      err: error
    })
    throw error
  }

  let text: string
  try {
    text = await response.text()
  } catch (error) {
    log.warn('ai.call_failed', {
      ...context,
      model: config.deepseekModel,
      status: response.status,
      ms: Date.now() - started,
      stage: 'body',
      err: error
    })
    throw error
  }

  if (!response.ok) {
    log.warn('ai.call_failed', {
      ...context,
      model: config.deepseekModel,
      status: response.status,
      ms: Date.now() - started,
      responseChars: text.length
    })
    throw new Error(`DeepSeek 请求失败（${response.status}）${text.slice(0, 200)}`)
  }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    log.warn('ai.parse_failed', {
      ...context,
      model: config.deepseekModel,
      status: response.status,
      ms: Date.now() - started,
      responseChars: text.length,
      err: error
    })
    throw new Error('DeepSeek 返回了无法解析的内容')
  }

  const choice = (data as {
    choices?: {
      message?: { content?: unknown }
      finish_reason?: unknown
    }[]
  }).choices?.[0]
  const finishReason =
    typeof choice?.finish_reason === 'string' ? choice.finish_reason : ''
  const content = choice?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    log.warn('ai.empty_response', {
      ...context,
      model: config.deepseekModel,
      ms: Date.now() - started,
      finishReason
    })
    const finish = finishReason ? `，finish_reason=${finishReason}` : ''
    throw new Error(`DeepSeek 没有返回内容${finish}`)
  }
  log.info('ai.call', {
    ...context,
    model: config.deepseekModel,
    ms: Date.now() - started,
    chars: content.length,
    finishReason
  })
  return content
}

export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('AI 返回的内容不是合法 JSON')
  }
}
