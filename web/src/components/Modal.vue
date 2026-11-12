<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="overlay"
        :style="{ zIndex }"
        @click.self="closeOnOverlay && close()"
      >
        <div
          ref="panel"
          class="panel"
          :class="{ wide }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <header class="panel-head">
            <div>
              <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
              <h2 :id="titleId" class="panel-title">{{ title }}</h2>
            </div>
            <button class="close" type="button" aria-label="关闭" @click="close">×</button>
          </header>
          <div class="panel-body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="panel-foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
// 模块级共享状态：多弹窗叠加时只有最上层响应 Escape / Tab，body 滚动锁用计数。
const modalStack: symbol[] = []
let scrollLocks = 0
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    eyebrow?: string
    wide?: boolean
    zIndex?: number
    closeOnOverlay?: boolean
  }>(),
  { zIndex: 80, closeOnOverlay: true }
)

const emit = defineEmits<{ (event: 'close'): void }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const key = Symbol('modal')
let lastActive: HTMLElement | null = null
let locked = false

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function close() {
  emit('close')
}

function focusables(): HTMLElement[] {
  if (!panel.value) return []
  return [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}

function isTop() {
  return modalStack[modalStack.length - 1] === key
}

function onKey(event: KeyboardEvent) {
  if (!isTop()) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusables()
  if (items.length === 0) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (event.shiftKey && (active === first || active === panel.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function lockBody() {
  if (locked) return
  locked = true
  scrollLocks += 1
  if (scrollLocks === 1) document.body.style.overflow = 'hidden'
}

function unlockBody() {
  if (!locked) return
  locked = false
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) document.body.style.overflow = ''
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (!modalStack.includes(key)) modalStack.push(key)
      lockBody()
      window.addEventListener('keydown', onKey, true)
      lastActive = document.activeElement as HTMLElement | null
      void nextTick(() => {
        const items = focusables()
        ;(items[0] ?? panel.value)?.focus()
      })
    } else {
      const index = modalStack.indexOf(key)
      if (index >= 0) modalStack.splice(index, 1)
      window.removeEventListener('keydown', onKey, true)
      unlockBody()
      if (lastActive?.isConnected) lastActive.focus()
      lastActive = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  const index = modalStack.indexOf(key)
  if (index >= 0) {
    modalStack.splice(index, 1)
    window.removeEventListener('keydown', onKey, true)
    unlockBody()
  }
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(24, 23, 20, 0.32);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 8vh 20px 40px;
  overflow-y: auto;
}

.panel {
  width: 100%;
  max-width: 520px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(30, 28, 22, 0.14);
  overflow: hidden;
  outline: none;
}

.panel.wide {
  max-width: 760px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px 0;
}

.panel-title {
  margin-top: 4px;
  font-size: 19px;
  font-weight: 600;
}

.close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-3);
  font-size: 22px;
  line-height: 1;
}

.close:hover {
  background: rgba(0, 0, 0, 0.05);
}

.panel-body {
  padding: 20px 26px 26px;
}

.panel-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 26px 22px;
  border-top: 1px solid var(--line);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .overlay {
    padding: 4vh 12px 20px;
  }

  .panel-head,
  .panel-body,
  .panel-foot {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
