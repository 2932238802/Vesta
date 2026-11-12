<template>
  <div v-if="dirty || saving" class="save-bar" role="region" aria-label="保存修改">
    <div class="save-bar-main">
      <span class="chip warn">未保存</span>
      <span class="save-bar-message">{{ message }}</span>
    </div>
    <div class="save-bar-actions">
      <button class="btn ghost small" type="button" :disabled="saving" @click="emit('discard')">
        {{ discardLabel }}
      </button>
      <button class="btn small" type="button" :disabled="saving" @click="emit('save')">
        {{ saving ? '保存中' : saveLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    dirty: boolean
    saving?: boolean
    saveLabel?: string
    discardLabel?: string
    message?: string
  }>(),
  { saving: false, saveLabel: '保存', discardLabel: '放弃修改', message: '修改还没有保存' }
)

const emit = defineEmits<{ (event: 'save'): void; (event: 'discard'): void }>()
</script>

<style scoped>
.save-bar {
  position: fixed;
  right: 28px;
  bottom: 20px;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: min(560px, calc(100vw - 56px));
  padding: 12px 16px;
  border: 1px solid var(--line-strong);
  border-radius: 14px;
  background: rgba(255, 253, 248, 0.96);
  box-shadow: 0 8px 26px rgba(27, 26, 23, 0.1);
  backdrop-filter: blur(10px);
  animation: save-bar-in 0.18s ease;
}

@keyframes save-bar-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.save-bar-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.save-bar-message {
  color: var(--ink-2);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .save-bar {
    left: 12px;
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    width: auto;
  }

  .save-bar-message {
    display: none;
  }
}
</style>
