const TOKEN_KEY = 'vesta.admin.token'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  details?: Record<string, unknown>
  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.details = details
  }
}

export interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  timeout?: number
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth) headers.Authorization = `Bearer ${getToken()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 20_000)
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError('请求超时，请刷新页面后重试', 0)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }

  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && options.auth) {
      clearToken()
      if (!location.pathname.startsWith('/admin/login')) {
        location.href = '/admin/login?expired=1'
      }
    }
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : '请求失败'
    throw new ApiError(
      message,
      response.status,
      data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined
    )
  }

  return data as T
}

export function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function throwResponseError(response: Response): Promise<never> {
  if (response.status === 401) {
    clearToken()
    if (!location.pathname.startsWith('/admin/login')) {
      location.href = '/admin/login?expired=1'
    }
  }
  let message = '请求失败'
  try {
    const data = (await response.json()) as { error?: unknown }
    if (data?.error) message = String(data.error)
  } catch {
    // 响应不是 JSON 时使用默认提示。
  }
  throw new ApiError(message, response.status)
}
