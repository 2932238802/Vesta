<template>
  <main v-if="loading" class="state">
    <p class="quiet">正在读取报告</p>
  </main>

  <main v-else-if="error" class="state">
    <p class="eyebrow">无法打开</p>
    <h1 class="serif">{{ error }}</h1>
    <RouterLink class="btn ghost" to="/">回到首页</RouterLink>
  </main>

  <main v-else-if="!hasPayload && reportStatus === 'failed'" class="state analysis">
    <p class="eyebrow">这次没有生成成功</p>
    <h1 class="serif">报告暂时打不开</h1>
    <p class="analysis-copy">{{ reportError || 'AI 报告生成失败，具体原因还没有返回。' }}</p>
    <button
      v-if="retryable"
      class="btn retry-btn"
      type="button"
      :disabled="retrying"
      @click="$emit('retry')"
    >
      {{ retrying ? '正在重新生成' : '重新生成报告' }}
    </button>
    <p v-if="retrying" class="quiet small">已经重新提交，页面会自动更新。</p>
  </main>

  <main v-else-if="!hasPayload" class="state analysis">
    <div class="loader" aria-hidden="true">
      <span class="dot d1" />
      <span class="dot d2" />
      <span class="dot d3" />
    </div>
    <h1 class="serif">正在给你写这份报告</h1>
    <p class="analysis-copy">{{ waitCopy }}</p>
    <div class="analysis-line"><span /></div>
    <p class="quiet small">页面会自动更新，不用刷新</p>
    <p v-if="slow" class="quiet small">比预期久一点，可以先去忙别的，回来看这条链接就好。</p>
    <p v-if="pollNote" class="quiet small">{{ pollNote }}</p>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  loading: boolean
  error: string
  hasPayload: boolean
  reportStatus: string
  reportError: string
  retryable: boolean
  retrying: boolean
  slow: boolean
  pollNote: string
  waitCopy: string
}>()

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<style scoped src="./reportStatus.css"></style>
