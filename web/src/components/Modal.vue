<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" @click.self="close">
        <div class="panel" :class="{ wide }" role="dialog" aria-modal="true">
          <header class="panel-head">
            <div>
              <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
              <h2 class="panel-title">{{ title }}</h2>
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

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  eyebrow?: string
  wide?: boolean
}>()

const emit = defineEmits<{ (event: 'close'): void }>()

function close() {
  emit('close')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
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
