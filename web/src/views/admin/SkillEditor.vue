<template>
  <div class="skill-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">内容设置</p>
        <h1 class="page-title">AI 分析规则</h1>
      </div>
      <div class="head-actions">
        <span v-if="dirty" class="chip warn">未保存</span>
        <button class="btn small" type="button" :disabled="loading" @click="openCreate">
          新建模板
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
        默认设置是系统内置规则，只能查看，不能修改。需要不同分析角度时，可以新建多个模板，
        再选择其中一个用于之后生成的报告。
      </p>

      <div class="template-layout">
        <aside class="card template-picker">
          <div class="template-picker-head">
            <span>规则模板</span>
            <span class="quiet tiny">{{ templates.length + 1 }} 个</span>
          </div>
          <div class="template-list">
            <button
              class="template-choice"
              :class="{ on: selectedId === DEFAULT_SKILL_ID }"
              type="button"
              @click="selectTemplate(DEFAULT_SKILL_ID)"
            >
              <span class="template-choice-main">
                <span class="template-choice-name">默认设置</span>
                <span class="template-choice-meta">系统内置 · 不可修改</span>
              </span>
              <span v-if="activeId === DEFAULT_SKILL_ID" class="chip accent">使用中</span>
            </button>
            <button
              v-for="template in templates"
              :key="template.id"
              class="template-choice"
              :class="{ on: selectedId === template.id }"
              type="button"
              @click="selectTemplate(template.id)"
            >
              <span class="template-choice-main">
                <span class="template-choice-name">{{ template.name }}</span>
                <span class="template-choice-meta">自定义模板</span>
              </span>
              <span v-if="activeId === template.id" class="chip accent">使用中</span>
            </button>
          </div>
          <p v-if="templates.length === 0" class="template-empty">
            还没有自定义模板。可以点右上角“新建模板”。
          </p>
        </aside>

        <section class="card editor-card">
          <header class="editor-head">
            <div class="editor-title-wrap">
              <input
                v-if="!isDefaultSelected"
                v-model="editorName"
                class="input template-name-input"
                type="text"
                maxlength="40"
                aria-label="模板名称"
              />
              <strong v-else class="editor-title">默认设置</strong>
              <p class="editor-sub">
                {{
                  isDefaultSelected
                    ? '这是系统内置规则，只能查看。'
                    : '修改只影响之后生成的报告。'
                }}
              </p>
            </div>
            <div v-if="!isDefaultSelected" class="editor-actions">
              <button
                v-if="activeId !== selectedId"
                class="btn ghost small"
                type="button"
                :disabled="saving"
                @click="activateSelected"
              >
                用于生成报告
              </button>
              <button
                class="btn quiet small delete-btn"
                type="button"
                :disabled="saving"
                @click="removeSelected"
              >
                删除
              </button>
              <button
                class="btn small"
                type="button"
                :disabled="saving || !dirty"
                @click="save"
              >
                {{ saving ? '保存中' : '保存' }}
              </button>
            </div>
            <span v-else class="chip">只读</span>
          </header>

          <textarea
            v-if="!isDefaultSelected"
            v-model="editorSkill"
            class="skill-input"
            spellcheck="false"
            aria-label="报告分析 Skill"
          />
          <pre v-else class="skill-readonly">{{ defaultSkill }}</pre>
        </section>
      </div>

      <div class="meta-row">
        <p class="quiet tiny">
          输出结构由程序固定。自定义模板只调整分析角度、判断标准、语气和禁忌，不会改变默认设置。
        </p>
        <span class="quiet tiny">{{ editorSkill.length }} 字</span>
      </div>

      <details class="card output-card">
        <summary>输出结构</summary>
        <pre>{{ outputExample }}</pre>
      </details>
    </template>

    <Modal
      :open="createOpen"
      title="新建分析规则模板"
      eyebrow="AI 分析规则"
      @close="createOpen = false"
    >
      <label class="field">
        <span>模板名称</span>
        <input
          v-model="newTemplateName"
          class="input"
          type="text"
          maxlength="40"
          placeholder="例：考研方向分析"
          @keydown.enter.prevent="createTemplate"
        />
      </label>
      <p v-if="createError" class="notice">{{ createError }}</p>
      <p class="quiet tiny create-note">
        新模板会从默认设置复制一份内容，默认设置本身不会被修改。
      </p>
      <template #footer>
        <button class="btn ghost small" type="button" @click="createOpen = false">取消</button>
        <button class="btn small" type="button" :disabled="creating" @click="createTemplate">
          {{ creating ? '正在创建' : '创建模板' }}
        </button>
      </template>
    </Modal>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api, type AdminReportSkillTemplate } from '@/api'
import Modal from '@/components/Modal.vue'
import { useUnsavedChanges } from '@/useUnsavedChanges'

const DEFAULT_SKILL_ID = 'default'

const defaultSkill = ref('')
const templates = ref<AdminReportSkillTemplate[]>([])
const activeId = ref(DEFAULT_SKILL_ID)
const selectedId = ref(DEFAULT_SKILL_ID)
const editorSkill = ref('')
const editorName = ref('')
const originalSkill = ref('')
const originalName = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const toast = ref('')
const createOpen = ref(false)
const creating = ref(false)
const newTemplateName = ref('')
const createError = ref('')
const ai = reactive({ configured: false, searchConfigured: false, model: '' })

const selectedTemplate = computed(
  () => templates.value.find((template) => template.id === selectedId.value) ?? null
)
const isDefaultSelected = computed(() => selectedId.value === DEFAULT_SKILL_ID)
const dirty = computed(
  () =>
    !isDefaultSelected.value &&
    (editorName.value !== originalName.value || editorSkill.value !== originalSkill.value)
)

useUnsavedChanges(dirty, '当前分析规则模板还有未保存的修改，确定离开？')

const outputExample = `{
  "conclusion": "一句话结论，必须落到本次回答里的具体事实或系统数字",
  "modules": [{
    "key": "moduleSpecs 里的模块 key，例如 scorecard / jobmap / roadmap",
    "title": "根据这个学生的材料自己起标题",
    "summary": "这个模块的一句话判断",
    "paragraphs": ["需要正文时写在这里"],
    "items": [{
      "key": "moduleSpecs 里对应 item 的 key",
      "text": "只针对这个 item 的解释",
      "fields": { "name": "方向名", "what": "做什么", "entry": "入场线" }
    }]
  }]
}`

function loadEditor(id: string) {
  const template = templates.value.find((item) => item.id === id)
  selectedId.value = template ? template.id : DEFAULT_SKILL_ID
  if (template) {
    editorName.value = template.name
    editorSkill.value = template.skill
    originalName.value = template.name
    originalSkill.value = template.skill
    return
  }
  editorName.value = '默认设置'
  editorSkill.value = defaultSkill.value
  originalName.value = '默认设置'
  originalSkill.value = defaultSkill.value
}

async function load(preferredId?: string) {
  loading.value = true
  error.value = ''
  try {
    const result = await api.skill()
    defaultSkill.value = result.defaultSkill
    templates.value = result.templates
    activeId.value = result.activeId
    ai.configured = result.ai.configured
    ai.searchConfigured = result.ai.searchConfigured
    ai.model = result.ai.model
    const targetId =
      preferredId &&
      (preferredId === DEFAULT_SKILL_ID ||
        result.templates.some((template) => template.id === preferredId))
        ? preferredId
        : result.activeId
    loadEditor(targetId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())

function selectTemplate(id: string) {
  if (id === selectedId.value) return
  if (dirty.value && !window.confirm('当前模板有未保存的修改，确定切换？')) return
  loadEditor(id)
}

function openCreate() {
  if (dirty.value && !window.confirm('当前模板有未保存的修改，新建模板会放弃这些修改，继续？')) {
    return
  }
  createError.value = ''
  newTemplateName.value = `自定义模板 ${templates.value.length + 1}`
  createOpen.value = true
}

async function createTemplate() {
  const name = newTemplateName.value.trim()
  if (!name) {
    createError.value = '请填写模板名称'
    return
  }
  createError.value = ''
  creating.value = true
  try {
    const result = await api.createSkillTemplate({ name })
    templates.value = [...templates.value, result.template]
    createOpen.value = false
    loadEditor(result.template.id)
    flash('模板已创建，可以开始修改')
  } catch (err) {
    createError.value = err instanceof Error ? err.message : '创建失败'
  } finally {
    creating.value = false
  }
}

async function save(showToast = true): Promise<boolean> {
  const template = selectedTemplate.value
  if (!template) return false
  const name = editorName.value.trim()
  if (!name) {
    error.value = '请填写模板名称'
    return false
  }
  error.value = ''
  saving.value = true
  try {
    const result = await api.updateSkillTemplate(template.id, {
      name,
      skill: editorSkill.value
    })
    templates.value = templates.value.map((item) =>
      item.id === result.template.id ? result.template : item
    )
    editorName.value = result.template.name
    originalName.value = result.template.name
    originalSkill.value = result.template.skill
    if (showToast) flash('模板已保存')
    return true
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
    return false
  } finally {
    saving.value = false
  }
}

async function activateSelected() {
  if (dirty.value && !(await save(false))) return
  const template = selectedTemplate.value
  if (!template) return
  error.value = ''
  saving.value = true
  try {
    const result = await api.activateSkillTemplate(template.id)
    activeId.value = result.activeId
    flash('之后生成的报告将使用这个模板')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '设置失败'
  } finally {
    saving.value = false
  }
}

async function removeSelected() {
  const template = selectedTemplate.value
  if (!template) return
  const inUse = activeId.value === template.id
  const message = inUse
    ? `「${template.name}」正在使用，删除后会恢复默认设置。确定删除？`
    : `确定删除「${template.name}」？`
  if (!window.confirm(message)) return
  error.value = ''
  saving.value = true
  try {
    await api.deleteSkillTemplate(template.id)
    templates.value = templates.value.filter((item) => item.id !== template.id)
    if (inUse) activeId.value = DEFAULT_SKILL_ID
    loadEditor(DEFAULT_SKILL_ID)
    flash('模板已删除')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
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

.template-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  margin-top: 20px;
}

.template-picker {
  min-width: 0;
  padding: 12px;
}

.template-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 5px 10px;
  font-size: 12.5px;
  font-weight: 600;
}

.template-list {
  display: grid;
  gap: 4px;
  max-height: 560px;
  overflow-y: auto;
}

.template-choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 11px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  transition: background 0.14s ease, border-color 0.14s ease;
}

.template-choice:hover {
  background: rgba(0, 0, 0, 0.025);
}

.template-choice.on {
  border-color: rgba(47, 93, 70, 0.22);
  background: rgba(47, 93, 70, 0.07);
}

.template-choice-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.template-choice-name {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-choice-meta {
  font-size: 10.5px;
  color: var(--ink-3);
}

.template-empty {
  padding: 10px 6px 4px;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--ink-3);
}

.editor-card {
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 15px 20px;
  border-bottom: 1px solid var(--line);
}

.editor-title-wrap {
  min-width: 0;
  flex: 1;
}

.editor-title,
.template-name-input {
  font-size: 14px;
  font-weight: 600;
}

.template-name-input {
  width: min(320px, 100%);
  height: 38px;
  padding: 0 11px;
}

.editor-sub {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ink-3);
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.delete-btn {
  color: var(--danger);
}

.delete-btn:hover:not(:disabled) {
  background: rgba(163, 58, 44, 0.07);
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

.skill-readonly {
  max-height: 680px;
  margin: 0;
  padding: 24px 26px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.015);
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.9;
  color: var(--ink-2);
  white-space: pre-wrap;
  word-break: break-word;
}

.create-note {
  margin-top: 12px;
  line-height: 1.7;
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

  .template-layout {
    grid-template-columns: 1fr;
  }

  .template-list {
    max-height: 240px;
  }

  .editor-head {
    align-items: stretch;
  }

  .editor-actions {
    justify-content: flex-end;
  }

  .skill-input {
    min-height: 460px;
    padding: 18px;
    font-size: 12.5px;
  }

  .skill-readonly {
    padding: 18px;
    font-size: 12.5px;
  }

  .meta-row {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
