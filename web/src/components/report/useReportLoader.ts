import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ReportPayload } from '@shared/types'
import { api } from '@/api'

/**
 * 报告页的数据加载与轮询：初始读取、生成中定时刷新、页面重新可见时补拉、失败重试。
 * 只搬运原 ReportView.vue 的实现，行为与计时保持不变。
 */
export function useReportLoader(slug: string) {
  const payload = ref<ReportPayload | null>(null)
  const loading = ref(true)
  const error = ref('')
  const reportNotice = ref('')
  const reportError = ref('')
  const retryable = ref(false)
  const retrying = ref(false)
  const slow = ref(false)
  const pollNote = ref('')
  const reportStatus = ref('')
  const elapsed = ref(0)
  const claimed = ref(false)

  let pollTimer: number | undefined
  let slowTimer: number | undefined
  let elapsedTimer: number | undefined
  let inFlight = false
  let pollFailures = 0

  const waitCopy = computed(() => {
    if (elapsed.value < 8) return '先读一遍你的回答，看看你现在在哪儿。'
    if (elapsed.value < 25) return '正在把你的情况和目标放在一起看。'
    if (elapsed.value < 60) return '正在写结论，和接下来最该做的事。'
    return '还在写，内容有点多，再等一小会儿。'
  })

  function stopPolling() {
    if (pollTimer !== undefined) window.clearInterval(pollTimer)
    if (slowTimer !== undefined) window.clearTimeout(slowTimer)
    pollTimer = undefined
    slowTimer = undefined
  }

  function startElapsed() {
    if (elapsedTimer !== undefined) return
    elapsed.value = 0
    elapsedTimer = window.setInterval(() => {
      elapsed.value += 1
    }, 1000)
  }

  function stopElapsed() {
    if (elapsedTimer !== undefined) window.clearInterval(elapsedTimer)
    elapsedTimer = undefined
  }

  function startPolling() {
    if (pollTimer !== undefined) return
    slowTimer = window.setTimeout(() => {
      slow.value = true
    }, 120_000)
    pollTimer = window.setInterval(() => {
      void load(true)
    }, 3000)
  }

  async function load(poll = false, preview = false) {
    if (inFlight) return
    inFlight = true
    try {
      const result = await api.getReport(slug, poll, preview)
      pollFailures = 0
      pollNote.value = ''
      reportStatus.value = result.status
      if (result.report) {
        payload.value = result.report
        claimed.value = result.report.claimed
        reportNotice.value = result.notice ?? result.error ?? ''
        stopElapsed()
      }
      error.value = ''
      if (result.status === 'failed') {
        reportError.value = result.error || 'AI 报告生成失败'
        retryable.value = result.retryable !== false
        reportNotice.value = result.report ? (result.notice ?? result.error ?? '') : ''
        stopPolling()
        stopElapsed()
      } else if (result.status === 'pending' || result.status === 'running') {
        reportError.value = ''
        startPolling()
      } else if (!payload.value) {
        // 没生成出来也别退回基础版：继续等着，后台会重试。
        startPolling()
        pollNote.value = '还在写，好了会自动打开'
      } else {
        stopPolling()
      }
    } catch (err) {
      if (!poll) {
        error.value =
          err instanceof Error
            ? err.message
            : '报告不存在'
        stopPolling()
      } else {
        pollFailures += 1
        if (pollFailures >= 4) {
          pollNote.value = '连接不太稳定，正在重试；也可以稍后重新打开这个链接。'
        }
      }
    } finally {
      inFlight = false
      loading.value = false
    }
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible' || inFlight) return
    if (
      !payload.value ||
      reportStatus.value === 'pending' ||
      reportStatus.value === 'running'
    ) {
      void load(true)
    }
  }

  onMounted(() => {
    startElapsed()
    document.addEventListener('visibilitychange', onVisibility)
    void load(false)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    stopPolling()
    stopElapsed()
  })

  async function retryReport() {
    if (retrying.value) return
    retrying.value = true
    reportError.value = ''
    pollNote.value = ''
    try {
      await api.retryReport(slug)
      reportStatus.value = 'pending'
      startElapsed()
      startPolling()
    } catch (err) {
      reportError.value = err instanceof Error ? err.message : '重新提交失败，请稍后再试'
      retryable.value = true
      stopPolling()
    } finally {
      retrying.value = false
    }
  }

  return {
    payload,
    loading,
    error,
    reportNotice,
    reportError,
    retryable,
    retrying,
    slow,
    pollNote,
    reportStatus,
    claimed,
    waitCopy,
    retryReport
  }
}
