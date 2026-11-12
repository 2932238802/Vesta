import { reactive } from 'vue'

export interface ConfirmInput {
  label: string
  value?: string
  placeholder?: string
  maxlength?: number
  required?: boolean
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  input?: ConfirmInput
}

export interface PromptOptions extends Omit<ConfirmOptions, 'input'> {
  input: ConfirmInput
}

interface Job {
  options: ConfirmOptions
  mode: 'confirm' | 'prompt'
  resolve: (value: boolean | string | null) => void
}

interface ConfirmState {
  current: Job | null
  queue: Job[]
}

/** 模块级队列：AdminLayout / App 只挂一个 ConfirmHost。 */
export const confirmState = reactive<ConfirmState>({ current: null, queue: [] })

function enqueue(job: Job) {
  if (confirmState.current) confirmState.queue.push(job)
  else confirmState.current = job
}

/** 统一确认框；替换 window.confirm。 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    enqueue({
      options,
      mode: 'confirm',
      resolve: (value) => resolve(value === true)
    })
  })
}

/** 带输入框的确认；替换 window.prompt。取消返回 null。 */
export function promptAction(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    enqueue({
      options,
      mode: 'prompt',
      resolve: (value) => resolve(typeof value === 'string' ? value : null)
    })
  })
}

/** 由 ConfirmHost 调用：当前项结束，队列前进。 */
export function answerConfirm(value: boolean | string | null) {
  const job = confirmState.current
  if (!job) return
  confirmState.current = confirmState.queue.shift() ?? null
  job.resolve(value)
}
