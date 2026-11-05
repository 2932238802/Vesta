import { config } from '../env'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AskDeepSeekOptions {
  json?: boolean
  temperature?: number
  maxTokens?: number
}

export async function askDeepSeek(
  messages: Message[],
  options: AskDeepSeekOptions = {}
): Promise<string> {
  if (!config.deepseekApiKey) throw new Error('未配置 DEEPSEEK_API_KEY')

  const response = await fetch(
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
        max_tokens: options.maxTokens ?? 4096,
        ...(options.json === false ? {} : { response_format: { type: 'json_object' } })
      }),
      signal: AbortSignal.timeout(config.aiTimeoutMs)
    }
  )

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`DeepSeek 请求失败（${response.status}）${text.slice(0, 200)}`)
  }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('DeepSeek 返回了无法解析的内容')
  }

  const content = (data as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]
    ?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('DeepSeek 没有返回内容')
  }
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
