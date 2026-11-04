<template>
  <div class="skill-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">内容设置</p>
        <h1 class="page-title">AI 分析规则</h1>
      </div>
      <div class="head-actions">
        <span v-if="dirty" class="chip warn">未保存</span>
        <button class="btn ghost small" type="button" :disabled="loading" @click="resetDefault">
          恢复默认
        </button>
        <button class="btn small" type="button" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中' : '保存' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="card empty">正在读取分析规则</div>

    <template v-else>
      <p v-if="error" class="notice">{{ error }}</p>

      <div class="status-row">
        <span class="chip" :class="{ accent: ai.configured }">
          DeepSeek {{ ai.configured ? '已配置' : '未配置' }}
        </span>
        <span class="chip" :class="{ accent: ai.searchConfigured }">
          联网检索 {{ ai.searchConfigured ? '已配置' : '未配置' }}
        </span>
        <span class="quiet tiny">{{ ai.model }}</span>
      </div>

      <p v-if="!ai.configured" class="hint">
        还没有连接 AI。请联系技术人员配置后，报告才会由 AI 自动分析。
      </p>
      <p v-if="!ai.searchConfigured" class="hint">
        联网核对未开启；开启后才能核对城市、岗位和考试要求。
      </p>

      <p class="hint">
        这是高级设置。不确定要改什么时，建议保持原样；修改只影响之后生成的报告。
      </p>

      <section class="card editor-card">
        <textarea
          v-model="skill"
          class="skill-input"
          spellcheck="false"
          aria-label="报告分析 Skill"
        />
      </section>

      <div class="meta-row">
        <p class="quiet tiny">
          修改只影响之后生成的报告。输出结构由程序固定，这里调整分析角度、判断标准、语气和禁忌。
        </p>
        <span class="quiet tiny">{{ skill.length }} 字</span>
      </div>

      <details class="card output-card">
        <summary>输出结构</summary>
        <pre>{{ outputExample }}</pre>
      </details>
    </template>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import { useUnsavedChanges } from '@/useUnsavedChanges'

const skill = ref('')
const initial = ref('')
const defaultSkill = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const toast = ref('')
const ai = reactive({ configured: false, searchConfigured: false, model: '' })

const dirty = computed(() => skill.value !== initial.value)

useUnsavedChanges(dirty, 'AI 分析规则还有未保存的修改，确定离开？')

const outputExample = `{
  "hero": { "summary": "一句话诊断", "tierLine": "档位说明" },
  "target": {
    "cityNote": "城市、岗位与原因的分析",
    "salaryNote": "薪资期待与现实条件的对照",
    "closing": "一句下一步要核实的事"
  },
  "strengths": [{ "key": "维度key", "text": "优势如何支撑目标" }],
  "gaps": [{
    "key": "维度key",
    "what": "补什么",
    "how": "怎么补",
    "when": "什么时候开始"
  }],
  "consistency": null,
  "cognition": { "paragraphs": ["第 1 段", "第 2 段"] },
  "actions": {
    "items": ["动作 1", "动作 2", "动作 3"],
    "closing": "一句收尾"
  },
  "sources": [{
    "title": "来源标题",
    "url": "https://...",
    "usedFor": "用来核对了什么"
  }]
}`

onMounted(async () => {
  try {
    const result = await api.skill()
    skill.value = result.skill
    initial.value = result.skill
    defaultSkill.value = result.defaultSkill
    ai.configured = result.ai.configured
    ai.searchConfigured = result.ai.searchConfigured
    ai.model = result.ai.model
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    loading.value = false
  }
})

function resetDefault() {
  if (dirty.value && !window.confirm('用默认 Skill 覆盖当前编辑内容？')) return
  skill.value = defaultSkill.value
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    const result = await api.saveSkill(skill.value)
    skill.value = result.skill
    initial.value = result.skill
    flash('已保存')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 1600)
}
</script>

<style scoped>
.skill-page {
  max-width: 980px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.page-title {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 500;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.hint {
  margin-bottom: 10px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.editor-card {
  margin-top: 20px;
  padding: 0;
  overflow: hidden;
}

.skill-input {
  display: block;
  width: 100%;
  min-height: 560px;
  padding: 24px 26px;
  border: 0;
  outline: none;
  resize: vertical;
  background: transparent;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.9;
  color: var(--ink);
}

.skill-input:focus {
  background: rgba(47, 93, 70, 0.015);
}

.meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-top: 12px;
}

.meta-row p {
  max-width: 42em;
  line-height: 1.8;
}

.output-card {
  margin-top: 22px;
  padding: 18px 22px;
}

.output-card summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--ink-2);
  user-select: none;
}

.output-card pre {
  margin: 16px 0 0;
  padding: 18px;
  overflow: auto;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.025);
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-2);
}

@media (max-width: 720px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .skill-input {
    min-height: 460px;
    padding: 18px;
    font-size: 12.5px;
  }

  .meta-row {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
