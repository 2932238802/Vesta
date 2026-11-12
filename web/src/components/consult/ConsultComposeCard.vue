<template>
  <section class="card compose-card">
    <header class="card-head">
      <div>
        <h2>这次的情况</h2>
        <p class="quiet tiny">填多少都可以，信息越具体，写出来越贴近对方。</p>
      </div>
      <span class="chip" :class="{ accent: ai.configured }">
        {{ ai.configured ? 'AI 可用' : 'AI 未开通' }}
      </span>
    </header>

    <form class="compose-form" @submit.prevent="emit('generate')">
      <label class="field">
        <span>称呼（可选）</span>
        <input
          v-model="userName"
          class="input"
          type="text"
          maxlength="80"
          placeholder="例：小林"
        />
      </label>

      <label class="field">
        <span>咨询树</span>
        <select v-model="purposeTemplateId" class="select">
          <option v-for="item in purposeTemplates" :key="item.id" :value="item.id">
            {{ purposeTemplateLabel(item) }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>目标篇幅（只作参考，不按字数硬凑）</span>
        <select v-model.number="targetLength" class="select">
          <option :value="20000">约 2 万字</option>
          <option :value="30000">约 3 万字</option>
          <option :value="40000">约 4 万字</option>
        </select>
      </label>

      <div class="field">
        <div class="field-label-row">
          <span>来访者情况（可选）</span>
          <button class="btn quiet tiny-btn" type="button" @click="emit('open-import')">
            从问卷导入
          </button>
        </div>
        <textarea
          v-model="profile"
          class="textarea"
          rows="3"
          maxlength="20000"
          placeholder="例：大三，汉语言专业，想留在杭州做运营，但还没有实习"
        />
      </div>

      <div class="compose-actions">
        <button class="btn" type="submit" :disabled="busy || !ai.configured || !purposeTemplateId">
          {{ busy ? '正在生成' : '生成咨询稿' }}
        </button>
      </div>
      <p class="quiet tiny">
        生成时会先判断这次要走哪些目的，再切成 10—20 个对话模块。每个模块给三种打法，默认选最有依据的一种，并写成节拍。通常需要几分钟，关掉页面也不会中断。
      </p>
      <p v-if="actionError" class="notice">{{ actionError }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import type {
  ConsultAiState,
  PurposeTemplateSummary
} from '@/composables/useConsultRuns'

defineProps<{
  ai: ConsultAiState
  purposeTemplates: PurposeTemplateSummary[]
  busy: boolean
  actionError: string
}>()

const emit = defineEmits<{
  (event: 'generate'): void
  (event: 'open-import'): void
}>()

const userName = defineModel<string>('userName', { required: true })
const purposeTemplateId = defineModel<string>('purposeTemplateId', { required: true })
const targetLength = defineModel<number>('targetLength', { required: true })
const profile = defineModel<string>('profile', { required: true })

function purposeTemplateLabel(template: PurposeTemplateSummary): string {
  const suffix = template.season ? ` · ${template.season}` : ''
  return `${template.name}${suffix}`
}
</script>

<style scoped>
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.compose-card {
  min-width: 0;
  padding: 22px;
}

.card-head {
  align-items: center;
  margin-bottom: 18px;
}

.card-head h2 {
  font-size: 16px;
}

.card-head p {
  margin-top: 3px;
}

.compose-form {
  display: grid;
  gap: 14px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.compose-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.tiny-btn {
  height: 28px;
  padding: 0 8px;
  font-size: 11.5px;
}

@media (max-width: 720px) {
  .compose-card {
    padding: 17px;
  }
}
</style>
