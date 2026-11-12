import { onBeforeUnmount, onMounted } from 'vue'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Ctrl/Cmd + S 保存。 */
export function useSaveHotkey(handler: () => void, enabled: () => boolean = () => true) {
  function onKey(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
    event.preventDefault()
    if (enabled()) handler()
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}

/** 按 `/` 聚焦当前页带 data-admin-search 的搜索框。 */
export function useSlashFocus() {
  function onKey(event: KeyboardEvent) {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
    if (isTypingTarget(event.target)) return
    const input = document.querySelector<HTMLInputElement>('[data-admin-search]')
    if (!input) return
    event.preventDefault()
    input.focus()
    input.select()
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
