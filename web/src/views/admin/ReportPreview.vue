<template>
  <div class="preview-page" :style="themeStyle">
    <header class="preview-bar">
      <div class="bar-left">
        <RouterLink class="back" to="/admin/report">← 返回编辑</RouterLink>
        <span class="divider" />
        <span class="bar-title">报告预览</span>
      </div>
      <div class="bar-right">
        <button class="btn ghost small" type="button" :disabled="loading" @click="load">
          {{ loading ? '刷新中' : '刷新' }}
        </button>
      </div>
    </header>

    <main class="preview-main">
      <p v-if="error" class="notice">{{ error }}</p>
      <div v-if="loading && !payload" class="card empty">正在生成预览</div>
      <div v-else-if="payload" class="sheet fade-in">
        <ReportBlocks :payload="payload" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { ReportPayload } from '@shared/types'
import { api } from '@/api'
import ReportBlocks from '@/components/ReportBlocks.vue'

const payload = ref<ReportPayload | null>(null)
const loading = ref(true)
const error = ref('')

const themeStyle = computed<Record<string, string>>(() => ({
  '--accent': payload.value?.theme.accent ?? '#2f5d46',
  '--paper': payload.value?.theme.paper ?? '#f7f4ed',
  background: payload.value?.theme.paper ?? '#f7f4ed'
}))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [templateResult, surveyResult] = await Promise.all([api.template(), api.survey()])
    payload.value = await api.previewReport({
      template: templateResult.template,
      survey: surveyResult.survey
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '预览失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.preview-page {
  min-height: 100vh;
  transition: background 0.3s ease;
}

.preview-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 14px 28px;
  background: rgba(251, 250, 246, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.bar-left,
.bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back {
  font-size: 13px;
  color: var(--ink-2);
}

.back:hover {
  color: var(--accent);
}

.divider {
  width: 1px;
  height: 16px;
  background: var(--line);
}

.bar-title {
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.preview-main {
  max-width: 780px;
  margin: 0 auto;
  padding: 34px 24px 90px;
}

.sheet {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 44px 44px 30px;
  box-shadow: 0 1px 0 rgba(30, 28, 22, 0.02);
}

@media (max-width: 640px) {
  .preview-bar {
    padding: 12px 16px;
  }

  .preview-main {
    padding: 20px 12px 60px;
  }

  .sheet {
    border-radius: 18px;
    padding: 28px 18px 16px;
  }
}
</style>
