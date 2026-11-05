<template>
  <div class="consult-template-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">咨询</p>
        <h1 class="page-title">咨询稿风格</h1>
      </div>
      <div class="head-actions">
        <span v-if="dirty" class="chip warn">未保存</span>
        <button class="btn small" type="button" :disabled="loading" @click="openCreate">
          新建风格
        </button>
      </div>
    </header>

    <div v-if="loading" class="card empty">正在读取咨询稿风格</div>
    <div v-else-if="loadError" class="card empty">
      {{ loadError }}
      <div class="empty-action">
        <button class="btn ghost small" type="button" @click="load">重新读取</button>
      </div>
    </div>

    <template v-else>
      <p v-if="actionError" class="notice">{{ actionError }}</p>

      <div class="template-layout">
        <aside class="card template-picker">
          <div class="template-picker-head">
            <span>风格列表</span>
            <span class="quiet tiny">{{ templates.length }} 个</span>
          </div>
          <div class="template-list">
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
                <span class="template-choice-meta">
                  {{ templateMeta(template) }}
                </span>
              </span>
              <span v-if="activeId === template.id" class="chip accent">当前使用</span>
            </button>
          </div>
        </aside>

        <section v-if="editor" class="card editor-card">
          <header class="editor-head">
            <div class="editor-title-wrap">
              <input
                v-if="!editor.builtIn"
                v-model="editor.name"
                class="input template-name-input"
                type="text"
                maxlength="60"
                aria-label="风格名称"
              />
              <strong v-else class="editor-title">{{ editor.name }}</strong>
              <p class="editor-sub">
                {{ editor.builtIn ? '系统默认风格，只能查看。' : '保存后只影响之后写的咨询稿。' }}
              </p>
            </div>
            <div v-if="!editor.builtIn" class="editor-actions">
              <button
                v-if="activeId !== editor.id"
                class="btn ghost small"
                type="button"
                :disabled="saving"
                @click="activate"
              >
                以后都用这个
              </button>
              <button
                class="btn quiet small danger-text"
                type="button"
                :disabled="saving"
                @click="remove"
              >
                删除
              </button>
              <button class="btn small" type="button" :disabled="saving || !dirty" @click="save">
                {{ saving ? '保存中' : '保存' }}
              </button>
            </div>
            <span v-else class="chip">只读</span>
          </header>

          <div class="editor-body">
            <div class="form-row">
              <label class="field">
                <span>主要目的</span>
                <select v-model="editor.goal" class="select" :disabled="editor.builtIn">
                  <option value="引导">引导</option>
                  <option value="成交">成交</option>
                  <option value="答疑">答疑</option>
                  <option value="回访">回访</option>
                </select>
              </label>
              <label class="field tone-field">
                <span>整体说话方式</span>
                <textarea
                  v-model="editor.globalTone"
                  class="textarea tone-input"
                  rows="2"
                  maxlength="1200"
                  :disabled="editor.builtIn"
                />
              </label>
            </div>

            <details class="variable-note">
              <summary>高级：可以在段落里插入哪些内容</summary>
              <p>
                <span class="mono">&#123;&#123;path&#125;&#125;</span> 整条路径、
                <span class="mono">&#123;&#123;path_section_2&#125;&#125;</span> 第 2 步、
                <span class="mono">&#123;&#123;context&#125;&#125;</span> 来访者情况、
                <span class="mono">&#123;&#123;user_name&#125;&#125;</span> 称呼。一般不需要手动填。
              </p>
            </details>

            <div class="sections-head">
              <div>
                <h2>咨询稿分几段</h2>
                <p class="quiet tiny">系统会按这个顺序往下写。</p>
              </div>
              <button
                v-if="!editor.builtIn"
                class="btn ghost small"
                type="button"
                @click="addSection"
              >
                增加一段
              </button>
            </div>

            <div class="section-list">
              <article
                v-for="(section, index) in editor.sections"
                :key="section.key"
                class="section-item"
              >
                <header class="section-item-head">
                  <span class="section-number">{{ index + 1 }}</span>
                  <input
                    v-model="section.name"
                    class="input section-name"
                    type="text"
                    maxlength="80"
                    :disabled="editor.builtIn"
                    aria-label="段落名称"
                  />
                  <div v-if="!editor.builtIn" class="section-controls">
                    <button
                      class="mini-btn"
                      type="button"
                      :disabled="index === 0"
                      title="上移"
                      @click="moveSection(index, -1)"
                    >
                      ↑
                    </button>
                    <button
                      class="mini-btn"
                      type="button"
                      :disabled="index === editor.sections.length - 1"
                      title="下移"
                      @click="moveSection(index, 1)"
                    >
                      ↓
                    </button>
                    <button class="mini-btn danger-text" type="button" title="删除" @click="removeSection(index)">
                      ×
                    </button>
                  </div>
                </header>

                <label class="field">
                  <span>这一段怎么写</span>
                  <textarea
                    v-model="section.promptHint"
                    class="textarea"
                    rows="3"
                    maxlength="1200"
                    :disabled="editor.builtIn"
                  />
                </label>

                <div class="form-row compact">
                  <label class="field">
                    <span>这一段语气（可选）</span>
                    <input
                      v-model="section.tone"
                      class="input"
                      type="text"
                      maxlength="120"
                      :disabled="editor.builtIn"
                    />
                  </label>
                  <label class="field">
                    <span>大约写多少字</span>
                    <input
                      v-model.number="section.maxLength"
                      class="input"
                      type="number"
                      min="0"
                      max="5000"
                      :disabled="editor.builtIn"
                    />
                  </label>
                </div>
                <details class="section-advanced">
                  <summary>高级设置</summary>
                  <label class="field key-field">
                    <span>段落标识</span>
                    <input
                      v-model="section.key"
                      class="input mono"
                      type="text"
                      maxlength="60"
                      :disabled="editor.builtIn"
                    />
                  </label>
                </details>
              </article>
            </div>
          </div>
        </section>
      </div>
    </template>

    <Modal
      :open="createOpen"
      title="新建咨询稿风格"
      eyebrow="咨询"
      @close="createOpen = false"
    >
      <div class="create-form">
        <label class="field">
          <span>风格名称</span>
          <input
            v-model="newName"
            class="input"
            type="text"
            maxlength="60"
            placeholder="例：温和引导版"
            @keydown.enter.prevent="createTemplate"
          />
        </label>
        <label class="field">
          <span>照着哪种风格改</span>
          <select v-model="newSourceId" class="select">
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
        </label>
        <p v-if="createError" class="notice">{{ createError }}</p>
        <p class="quiet tiny">新风格会复制所选风格的段落，原来的风格不会被修改。</p>
      </div>
      <template #footer>
        <button class="btn ghost small" type="button" @click="createOpen = false">取消</button>
        <button class="btn small" type="button" :disabled="creating" @click="createTemplate">
          {{ creating ? '正在创建' : '创建风格' }}
        </button>
      </template>
    </Modal>

    <Modal
      :open="savePromptOpen"
      title="保存这份修改"
      eyebrow="咨询稿框架"
      @close="savePromptOpen = false"
    >
      <div class="create-form">
        <p>
          直接保存会覆盖「{{ editor?.name }}」。如果这份框架以后还可能用到，建议先保存一份新副本。
        </p>
        <p class="quiet tiny">新副本会保留当前修改，原来的框架不会被改动。</p>
        <p v-if="actionError" class="notice">{{ actionError }}</p>
      </div>
      <template #footer>
        <button class="btn ghost small" type="button" :disabled="saving" @click="savePromptOpen = false">
          取消
        </button>
        <button class="btn ghost small" type="button" :disabled="saving" @click="saveExisting">
          覆盖当前
        </button>
        <button class="btn small" type="button" :disabled="saving" @click="saveAsNewCopy">
          {{ saving ? '正在保存' : '保存为新副本' }}
        </button>
      </template>
    </Modal>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api, type ConsultTemplate } from '@/api'
import Modal from '@/components/Modal.vue'
import { useUnsavedChanges } from '@/useUnsavedChanges'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const toast = ref('')
const templates = ref<ConsultTemplate[]>([])
const activeId = ref('')
const selectedId = ref('')
const editor = ref<ConsultTemplate | null>(null)
const original = ref('')
const createOpen = ref(false)
const savePromptOpen = ref(false)
const creating = ref(false)
const newName = ref('')
const newSourceId = ref('')
const createError = ref('')

const dirty = computed(() => Boolean(editor.value) && JSON.stringify(editor.value) !== original.value)

useUnsavedChanges(dirty, '当前咨询稿风格还有未保存的修改，确定离开？')

function editTemplate(template: ConsultTemplate) {
  editor.value = JSON.parse(JSON.stringify(template)) as ConsultTemplate
  original.value = JSON.stringify(editor.value)
}

function templateMeta(template: ConsultTemplate): string {
  if (!template.builtIn) return `分 ${template.sections.length} 段写`
  return '系统默认 · 只读'
}

function selectTemplate(id: string) {
  if (id === selectedId.value) return
  if (dirty.value && !window.confirm('当前风格有未保存的修改，确定切换？')) return
  const template = templates.value.find((item) => item.id === id)
  if (!template) return
  selectedId.value = id
  editTemplate(template)
}

async function load(preferredId?: string) {
  loading.value = true
  loadError.value = ''
  try {
    const result = await api.consult()
    templates.value = result.templates
    activeId.value = result.activeTemplateId
    const targetId =
      preferredId && result.templates.some((item) => item.id === preferredId)
        ? preferredId
        : result.activeTemplateId
    selectTemplate(targetId)
    newSourceId.value = targetId
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  if (dirty.value && !window.confirm('当前风格有未保存修改，新建会放弃这些修改，继续？')) return
  createError.value = ''
  newName.value = `自定义风格 ${templates.value.length}`
  newSourceId.value = selectedId.value || templates.value[0]?.id || ''
  createOpen.value = true
}

async function createTemplate() {
  const name = newName.value.trim()
  if (!name) {
    createError.value = '请填写风格名称'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const result = await api.createConsultTemplate({ name, sourceId: newSourceId.value })
    createOpen.value = false
    await load(result.template.id)
    flash('风格已创建')
  } catch (error) {
    createError.value = error instanceof Error ? error.message : '创建失败'
  } finally {
    creating.value = false
  }
}

function save() {
  if (!editor.value || editor.value.builtIn) return
  actionError.value = ''
  savePromptOpen.value = true
}

async function saveExisting() {
  if (!editor.value || editor.value.builtIn) return
  saving.value = true
  actionError.value = ''
  try {
    const result = await api.updateConsultTemplate(editor.value.id, editor.value)
    const index = templates.value.findIndex((item) => item.id === result.template.id)
    if (index >= 0) templates.value[index] = result.template
    selectedId.value = result.template.id
    editTemplate(result.template)
    savePromptOpen.value = false
    flash('风格已保存')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function saveAsNewCopy() {
  if (!editor.value || editor.value.builtIn) return
  saving.value = true
  actionError.value = ''
  try {
    const name = `${editor.value.name} 副本`
    const created = await api.createConsultTemplate({
      name,
      sourceId: editor.value.id
    })
    const result = await api.updateConsultTemplate(created.template.id, {
      ...editor.value,
      id: created.template.id,
      name,
      builtIn: false,
      createdAt: created.template.createdAt,
      updatedAt: created.template.updatedAt
    })
    const index = templates.value.findIndex((item) => item.id === result.template.id)
    if (index >= 0) templates.value[index] = result.template
    else templates.value.push(result.template)
    selectedId.value = result.template.id
    editTemplate(result.template)
    savePromptOpen.value = false
    flash('已保存为新副本')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '另存失败'
  } finally {
    saving.value = false
  }
}

async function activate() {
  if (!editor.value || editor.value.builtIn) return
  try {
    const result = await api.activateConsultTemplate(editor.value.id)
    activeId.value = result.activeTemplateId
    flash('以后默认使用这个风格')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '设置失败'
  }
}

async function remove() {
  if (!editor.value || editor.value.builtIn) return
  if (!window.confirm(`确定删除风格「${editor.value.name}」？`)) return
  saving.value = true
  try {
    await api.deleteConsultTemplate(editor.value.id)
    await load()
    flash('风格已删除')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败'
  } finally {
    saving.value = false
  }
}

function addSection() {
  if (!editor.value) return
  const index = editor.value.sections.length + 1
  editor.value.sections.push({
    key: `section_${index}`,
    name: `新段落 ${index}`,
    promptHint: '',
    tone: '',
    maxLength: 300
  })
}

function removeSection(index: number) {
  if (!editor.value || editor.value.sections.length <= 1) return
  editor.value.sections.splice(index, 1)
}

function moveSection(index: number, direction: -1 | 1) {
  if (!editor.value) return
  const target = index + direction
  if (target < 0 || target >= editor.value.sections.length) return
  const [section] = editor.value.sections.splice(index, 1)
  editor.value.sections.splice(target, 0, section)
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 2000)
}

onMounted(load)
</script>

<style scoped>
.page-head,
.editor-head,
.sections-head,
.section-item-head,
.form-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-head {
  margin-bottom: 22px;
}

.page-title {
  margin-top: 3px;
  font-size: 27px;
  letter-spacing: -0.03em;
}

.head-actions,
.editor-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.template-layout {
  display: grid;
  grid-template-columns: 245px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.template-picker {
  position: sticky;
  top: 24px;
  min-width: 0;
  padding: 14px;
}

.template-picker-head {
  display: flex;
  justify-content: space-between;
  padding: 2px 6px 9px;
  font-size: 12px;
  color: var(--ink-2);
}

.template-list {
  display: grid;
  gap: 3px;
  max-height: 520px;
  overflow: auto;
}

.template-choice {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 7px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
}

.template-choice:hover,
.template-choice.on {
  background: rgba(47, 93, 70, 0.065);
}

.template-choice.on {
  box-shadow: inset 2px 0 var(--accent);
}

.template-choice-main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.template-choice-name {
  overflow: hidden;
  font-size: 12px;
  color: var(--ink-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-choice-meta {
  color: var(--ink-3);
  font-size: 10px;
}

.editor-card {
  min-width: 0;
  overflow: hidden;
}

.editor-head {
  align-items: center;
  padding: 18px 20px;
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
  width: min(360px, 100%);
  height: 38px;
  padding: 0 11px;
}

.editor-sub {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ink-3);
}

.editor-body {
  display: grid;
  gap: 18px;
  padding: 20px;
}

.form-row {
  align-items: flex-start;
}

.form-row > .field {
  flex: 1;
}

.form-row.compact > .field {
  min-width: 0;
}

.tone-input {
  min-height: 62px;
}

.variable-note {
  padding: 9px 12px;
  border-radius: 9px;
  background: rgba(47, 93, 70, 0.045);
  color: var(--ink-3);
  font-size: 10.5px;
  line-height: 1.7;
}

.variable-note summary,
.section-advanced summary {
  cursor: pointer;
}

.variable-note p {
  margin-top: 7px;
}

.section-advanced {
  padding-top: 9px;
  border-top: 1px dashed var(--line);
  color: var(--ink-3);
  font-size: 11px;
}

.section-advanced .field {
  margin-top: 9px;
}

.sections-head {
  align-items: center;
  padding-top: 2px;
}

.sections-head h2 {
  font-size: 15px;
}

.sections-head p {
  margin-top: 3px;
}

.section-list {
  display: grid;
  gap: 12px;
}

.section-item {
  display: grid;
  gap: 10px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: rgba(0, 0, 0, 0.008);
}

.section-item-head {
  align-items: center;
}

.section-number {
  display: grid;
  place-items: center;
  flex: 0 0 23px;
  width: 23px;
  height: 23px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
}

.section-name {
  height: 38px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
}

.section-controls {
  display: flex;
  gap: 2px;
}

.mini-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  font-size: 14px;
}

.mini-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.mini-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.key-field {
  flex: 0 0 150px !important;
}

.danger-text {
  color: var(--danger);
}

.create-form {
  display: grid;
  gap: 14px;
}

@media (max-width: 900px) {
  .template-layout {
    grid-template-columns: 1fr;
  }

  .template-picker {
    position: static;
  }

  .template-list {
    max-height: 220px;
  }
}

@media (max-width: 620px) {
  .page-head,
  .editor-head,
  .form-row {
    flex-direction: column;
  }

  .editor-body {
    padding: 16px;
  }

  .form-row > .field,
  .key-field {
    width: 100%;
    flex-basis: auto !important;
  }
}
</style>
