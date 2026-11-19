<template>
  <div class="copy-grid">
    <section class="card section-card">
      <header class="section-head">
        <h2>领取免费规划</h2>
      </header>
      <div class="form-grid">
        <label class="field">
          <span>标题</span>
          <input v-model="template.copy.claim.title" class="input" type="text" maxlength="120" />
        </label>
        <label class="field">
          <span>按钮文字</span>
          <input v-model="template.copy.claim.submit" class="input" type="text" maxlength="40" />
        </label>
        <label class="field full">
          <span>说明</span>
          <textarea
            v-model="template.copy.claim.description"
            class="textarea"
            rows="2"
            maxlength="1000"
          />
        </label>
        <label class="field full">
          <span>免费说明</span>
          <textarea
            v-model="template.copy.claim.freeNote"
            class="textarea"
            rows="2"
            maxlength="1000"
          />
        </label>
        <label class="field">
          <span>微信号标签</span>
          <input
            v-model="template.copy.claim.wechatLabel"
            class="input"
            type="text"
            maxlength="40"
          />
        </label>
        <label class="field">
          <span>时间段标签</span>
          <input
            v-model="template.copy.claim.timeLabel"
            class="input"
            type="text"
            maxlength="40"
          />
        </label>
        <label class="field">
          <span>提交成功标题</span>
          <input
            v-model="template.copy.claim.successTitle"
            class="input"
            type="text"
            maxlength="120"
          />
        </label>
        <label class="field">
          <span>提交成功说明</span>
          <input
            v-model="template.copy.claim.successBody"
            class="input"
            type="text"
            maxlength="300"
          />
        </label>
        <label class="field full">
          <span>隐私说明</span>
          <input
            v-model="template.copy.claim.privacy"
            class="input"
            type="text"
            maxlength="300"
          />
        </label>
      </div>
    </section>

    <section class="card section-card">
      <header class="section-head">
        <h2>页脚</h2>
      </header>
      <div class="form-grid">
        <label class="field full">
          <span>说明</span>
          <input v-model="template.copy.footer.note" class="input" type="text" maxlength="300" />
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ReportTemplate } from '@shared/types'

defineProps<{
  template: ReportTemplate
}>()
</script>

<style scoped src="./reportSection.css"></style>
