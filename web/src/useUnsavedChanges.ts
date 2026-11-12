import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { confirmAction } from './useConfirm'

export function useUnsavedChanges(dirty: Ref<boolean>, message: string): void {
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
  // 站内跳转统一走共享确认框；浏览器关闭/刷新仍受浏览器限制，只能用原生确认。
  onBeforeRouteLeave(() =>
    dirty.value
      ? confirmAction({
          title: '还有未保存的修改',
          message,
          confirmText: '离开',
          cancelText: '留在本页',
          danger: true
        })
      : true
  )
}
