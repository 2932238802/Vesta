<template>
  <div class="report-editor">
    <AdminPageHeader eyebrow="设置" title="文案、主题与模块" :dirty="dirty">
      <template #actions>
        <button
          class="btn ghost small"
          type="button"
          :disabled="previewing || !template"
          @click="openPreview"
        >
          {{ previewing ? '生成中' : '预览' }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="card empty">正在读取报告模板</div>
    <div v-else-if="!template" class="card empty">{{ error || '模板加载失败' }}</div>

    <template v-else>
      <p v-if="error" class="notice">{{ error }}</p>
      <p class="ai-note">
        AI 报告会替换主要分析文案；AI 暂未生成成功时，这里的内容会作为基础展示。分析角度在
        <RouterLink to="/admin/skill">AI 分析规则</RouterLink> 调整。
      </p>

      <div class="tabs">
        <button type="button" :class="{ on: tab === 'copy' }" @click="tab = 'copy'">文案</button>
        <button type="button" :class="{ on: tab === 'theme' }" @click="tab = 'theme'">
          主题与模块
        </button>
        <button type="button" :class="{ on: tab === 'dimensions' }" @click="tab = 'dimensions'">
          维度文案
        </button>
        <button type="button" :class="{ on: tab === 'claim' }" @click="tab = 'claim'">
          领取与页脚
        </button>
      </div>

      <ReportCopyPanel v-if="tab === 'copy'" :template="template" :actions="editor" />
      <ReportThemePanel v-else-if="tab === 'theme'" :template="template" />
      <ReportDimensionsPanel
        v-else-if="tab === 'dimensions'"
        :template="template"
        :rows="dimensionRows"
      />
      <ReportClaimPanel v-else :template="template" />
    </template>

    <Modal :open="previewOpen" title="报告预览" wide @close="previewOpen = false">
      <p v-if="previewError" class="notice">{{ previewError }}</p>
      <div v-else-if="!preview" class="empty">正在生成预览</div>
      <div v-else class="preview-sheet" :style="previewStyle">
        <ReportBlocks :payload="preview" />
      </div>
    </Modal>

    <SaveBar
      :dirty="dirty"
      :saving="saving"
      save-label="保存模板"
      message="报告模板修改还没有保存"
      @save="save"
      @discard="discard"
    />

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AdminPageHeader from '@/components/AdminPageHeader.vue'
import Modal from '@/components/Modal.vue'
import ReportBlocks from '@/components/ReportBlocks.vue'
import SaveBar from '@/components/SaveBar.vue'
import ReportCopyPanel from './report/ReportCopyPanel.vue'
import ReportThemePanel from './report/ReportThemePanel.vue'
import ReportDimensionsPanel from './report/ReportDimensionsPanel.vue'
import ReportClaimPanel from './report/ReportClaimPanel.vue'
import { useReportEditor } from './report/useReportEditor'

const editor = useReportEditor()
const {
  template,
  loading,
  saving,
  previewing,
  error,
  toast,
  tab,
  previewOpen,
  preview,
  previewError,
  dirty,
  dimensionRows,
  previewStyle,
  save,
  discard,
  openPreview
} = editor
</script>

<style scoped src="./reportEditor.css"></style>
