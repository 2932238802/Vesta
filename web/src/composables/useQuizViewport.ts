import { nextTick, ref } from 'vue'

/**
 * 问卷页的键盘/视口状态：手机键盘顶起时抬高底部按钮、隐藏干扰项，键盘操作时切换焦点策略。
 * 纯 UI 逻辑，不涉及答案。
 */
export function useQuizViewport() {
  const rootEl = ref<HTMLElement | null>(null)
  const keyboardMode = ref(false)
  const kbFocus = ref(false)
  const kbRaised = ref(false)
  const kbHideFoot = ref(false)
  const kbOffset = ref(0)
  let focusOutTimer: ReturnType<typeof setTimeout> | undefined
  let kbDebounce: ReturnType<typeof setTimeout> | undefined
  let lastViewportHeight = 0
  let leaveHandler: (() => void) | null = null

  function coarsePointer() {
    return window.matchMedia('(pointer: coarse)').matches
  }

  function resetKeyboard() {
    kbFocus.value = false
    kbRaised.value = false
    kbHideFoot.value = false
    kbOffset.value = 0
  }

  function onFocusIn(event: FocusEvent) {
    const target = event.target as HTMLElement | null
    if (!target || !target.matches('input, textarea, select')) return
    if (focusOutTimer) clearTimeout(focusOutTimer)
    if (!coarsePointer()) return
    kbFocus.value = true
    window.setTimeout(() => {
      if (!target.isConnected) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }

  function onFocusOut(event: FocusEvent) {
    const target = event.target as HTMLElement | null
    if (!target || !target.matches('input, textarea, select')) return
    if (!coarsePointer()) return
    if (focusOutTimer) clearTimeout(focusOutTimer)
    focusOutTimer = setTimeout(resetKeyboard, 150)
  }

  function applyViewport() {
    const vv = window.visualViewport
    if (!vv || !coarsePointer()) return
    const height = vv.height
    if (Math.abs(height - lastViewportHeight) < 8) return
    lastViewportHeight = height
    const kb = Math.max(0, window.innerHeight - height - (vv.offsetTop || 0))
    if (kb > 120) {
      kbOffset.value = kb
      kbRaised.value = true
      kbHideFoot.value = kb > window.innerHeight * 0.45
      void nextTick(() =>
        requestAnimationFrame(() => {
          const active = document.activeElement as HTMLElement | null
          active?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      )
    } else {
      kbRaised.value = false
      kbHideFoot.value = false
      kbOffset.value = 0
    }
  }

  function scheduleViewportCheck() {
    if (kbDebounce) clearTimeout(kbDebounce)
    kbDebounce = setTimeout(applyViewport, 100)
  }

  function onKeydown(event: KeyboardEvent) {
    if (
      event.key === 'Tab' ||
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key.startsWith('Arrow')
    ) {
      keyboardMode.value = true
    }
  }

  function onPointerdown() {
    keyboardMode.value = false
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') leaveHandler?.()
  }

  function bindGlobal(onLeave: () => void) {
    leaveHandler = onLeave
    window.addEventListener('beforeunload', onLeave)
    window.addEventListener('pagehide', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('pointerdown', onPointerdown)
    window.visualViewport?.addEventListener('resize', scheduleViewportCheck)
    window.visualViewport?.addEventListener('scroll', scheduleViewportCheck)
  }

  function unbindGlobal() {
    if (!leaveHandler) return
    window.removeEventListener('beforeunload', leaveHandler)
    window.removeEventListener('pagehide', leaveHandler)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('pointerdown', onPointerdown)
    window.visualViewport?.removeEventListener('resize', scheduleViewportCheck)
    window.visualViewport?.removeEventListener('scroll', scheduleViewportCheck)
    leaveHandler = null
  }

  function dispose() {
    if (focusOutTimer) clearTimeout(focusOutTimer)
    if (kbDebounce) clearTimeout(kbDebounce)
  }

  return {
    rootEl,
    keyboardMode,
    kbFocus,
    kbRaised,
    kbHideFoot,
    kbOffset,
    onFocusIn,
    onFocusOut,
    bindGlobal,
    unbindGlobal,
    dispose
  }
}
