<template>
  <Modal :open="open" title="人工导入" eyebrow="兜底入口" wide @close="$emit('close')">
    <p class="hint">
      粘贴 JSON 后先「预览」校验，不写库；确认无误再「导入」。导入默认标记为已通过（人工负责）。
      抓取失败或 PDF 扫描件时用这里补数据；国家线不区分学硕 / 专硕时，<code>category</code> 留空。
    </p>
    <textarea
      v-model="text"
      class="textarea code"
      rows="18"
      spellcheck="false"
      aria-label="导入 JSON"
    ></textarea>

    <p v-if="message" class="state-line">{{ message }}</p>
    <p v-if="error" class="state-line error">{{ error }}</p>

    <template #footer>
      <button class="btn ghost" type="button" :disabled="busy" @click="$emit('close')">取消</button>
      <button class="btn ghost" type="button" :disabled="busy" @click="run(true)">
        {{ busy ? '处理中…' : '预览（不写库）' }}
      </button>
      <button class="btn" type="button" :disabled="busy" @click="run(false)">
        {{ busy ? '处理中…' : '导入' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/api'
import Modal from '@/components/Modal.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (event: 'close'): void; (event: 'imported'): void }>()

const sample = {
  batches: [
    {
      scope: 'national',
      exam: 'postgrad',
      year: 2025,
      region: 'A区',
      category: '',
      track: '工学',
      title: '2025 考研国家线（A 区 / 工学）',
      sourceName: '研招网',
      sourceUrl: 'https://example.com/line',
      metrics: [
        { subjectCode: 'total', subjectName: '总分', fullScore: 500, value: 273 },
        { subjectCode: 'politics', subjectName: '政治', fullScore: 100, value: 38 },
        { subjectCode: 'english1', subjectName: '英语一', fullScore: 100, value: 38 }
      ]
    }
  ],
  programs: []
}

const text = ref(JSON.stringify(sample, null, 2))
const busy = ref(false)
const message = ref('')
const error = ref('')

async function run(dryRun: boolean) {
  if (busy.value) return
  message.value = ''
  error.value = ''
  let payload: unknown
  try {
    payload = JSON.parse(text.value)
  } catch (caught) {
    error.value = `JSON 格式不对：${(caught as Error).message}`
    return
  }
  busy.value = true
  try {
    const result = await api.scoreLineImport({
      ...(payload as Record<string, unknown>),
      dryRun
    })
    if (dryRun) {
      message.value = `预览通过：${result.batches} 条分数线、${result.metrics ?? 0} 个指标、${result.programs} 条招生计划；还没有写库。`
    } else {
      message.value = `已导入 ${result.batches} 条分数线、${result.programs} 条招生计划。`
      emit('imported')
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '导入失败'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.hint {
  color: var(--ink-3);
  font-size: 12.5px;
  line-height: 1.7;
  margin-bottom: 10px;
}

.code {
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.6;
}
</style>
