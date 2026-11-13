<template>
  <div class="row-menu">
    <button
      ref="trigger"
      class="btn quiet row-menu-trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      {{ label }}<span class="row-menu-dots" aria-hidden="true">⋯</span>
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      class="row-menu-panel"
      role="menu"
      :style="panelStyle"
      @click.stop
    >
      <button
        v-for="item in items"
        :key="item.key"
        class="row-menu-item"
        :class="{ danger: item.danger }"
        type="button"
        role="menuitem"
        :disabled="item.disabled"
        @click="choose(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { RowMenuItem } from './row-menu'

const props = withDefaults(defineProps<{ items: RowMenuItem[]; label?: string }>(), {
  label: '更多'
})

const emit = defineEmits<{ (event: 'select', key: string): void }>()

const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0 })

const panelStyle = computed(() => ({
  top: `${position.value.top}px`,
  left: `${position.value.left}px`
}))

function place() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const width = 168
  position.value = {
    top: Math.min(rect.bottom + 6, window.innerHeight - 12),
    left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
  }
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    place()
    await nextTick()
    panel.value?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
  }
}

function close() {
  open.value = false
}

function choose(item: RowMenuItem) {
  if (item.disabled) return
  emit('select', item.key)
  close()
}

function onDocumentPointer(event: PointerEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (panel.value?.contains(target) || trigger.value?.contains(target)) return
  close()
}

function onKey(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    trigger.value?.focus()
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = [...(panel.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])]
  if (items.length === 0) return
  event.preventDefault()
  const index = items.indexOf(document.activeElement as HTMLElement)
  const next = event.key === 'ArrowDown' ? index + 1 : index - 1
  items[(next + items.length) % items.length]?.focus()
}

function onScroll() {
  if (open.value) close()
}

watch(open, (value) => {
  if (value) {
    document.addEventListener('pointerdown', onDocumentPointer, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointer, true)
    document.removeEventListener('keydown', onKey, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', close)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer, true)
  document.removeEventListener('keydown', onKey, true)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
})
</script>

<style scoped>
.row-menu {
  display: inline-flex;
}

.row-menu-trigger {
  gap: 4px;
  white-space: nowrap;
}

.row-menu-dots {
  color: var(--ink-3);
  letter-spacing: 1px;
}

.row-menu-panel {
  position: fixed;
  z-index: 60;
  width: 168px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 14px 34px rgba(27, 26, 23, 0.16);
}

.row-menu-item {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-2);
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
}

.row-menu-item:hover:not(:disabled),
.row-menu-item:focus-visible {
  background: rgba(0, 0, 0, 0.04);
  color: var(--ink);
}

.row-menu-item.danger {
  color: var(--danger);
}

.row-menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
