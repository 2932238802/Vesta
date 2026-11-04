<template>
  <div class="report-editor">
    <header class="page-head">
      <div>
        <p class="eyebrow">报告</p>
        <h1 class="page-title">文案、主题与模块</h1>
      </div>
      <div class="head-actions">
        <span v-if="dirty" class="chip warn">未保存</span>
        <button
          class="btn ghost small"
          type="button"
          :disabled="previewing || !template"
          @click="openPreview"
        >
          {{ previewing ? '生成中' : '预览' }}
        </button>
        <button class="btn small" type="button" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中' : '保存模板' }}
        </button>
      </div>
    </header>

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

      <div v-if="tab === 'copy'" class="copy-grid">
        <section class="card section-card">
          <header class="section-head">
            <h2>一句话诊断</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>眉标</span>
              <input v-model="template.copy.hero.eyebrow" class="input" type="text" maxlength="200" />
            </label>
            <label class="field">
              <span>小标题</span>
              <input v-model="template.copy.hero.title" class="input" type="text" maxlength="120" />
            </label>
            <label class="field full">
              <span>诊断句</span>
              <textarea
                v-model="template.copy.hero.noQuote"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>档位说明行</span>
              <input v-model="template.copy.hero.tierLine" class="input" type="text" maxlength="300" />
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>目标与距离</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>标题</span>
              <input v-model="template.copy.target.title" class="input" type="text" maxlength="120" />
            </label>
            <label class="field">
              <span>说明</span>
              <input
                v-model="template.copy.target.subtitle"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
            <label class="field">
              <span>城市标签</span>
              <input
                v-model="template.copy.target.cityLabel"
                class="input"
                type="text"
                maxlength="40"
              />
            </label>
            <label class="field">
              <span>岗位标签</span>
              <input
                v-model="template.copy.target.roleLabel"
                class="input"
                type="text"
                maxlength="40"
              />
            </label>
            <label class="field">
              <span>月薪标签</span>
              <input
                v-model="template.copy.target.salaryLabel"
                class="input"
                type="text"
                maxlength="40"
              />
            </label>
            <label class="field">
              <span>家乡标签</span>
              <input
                v-model="template.copy.target.hometownLabel"
                class="input"
                type="text"
                maxlength="40"
              />
            </label>
            <label class="field">
              <span>方向标签</span>
              <input
                v-model="template.copy.target.priorityLabel"
                class="input"
                type="text"
                maxlength="40"
              />
            </label>
            <label class="field">
              <span>目标标签</span>
              <input
                v-model="template.copy.target.goalLabel"
                class="input"
                type="text"
                maxlength="40"
              />
            </label>
            <label class="field">
              <span>原因标签</span>
              <input
                v-model="template.copy.target.reasonLabel"
                class="input"
                type="text"
                maxlength="40"
              />
            </label>
            <label class="field">
              <span>优势列表标题</span>
              <input
                v-model="template.copy.target.advantageTitle"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field">
              <span>缺口列表标题</span>
              <input
                v-model="template.copy.target.gapTitle"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field full">
              <span>未填岗位时显示</span>
              <input
                v-model="template.copy.target.missingRole"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field full">
              <span>城市提示 · 家乡是首选</span>
              <textarea
                v-model="template.copy.target.cityNoteHometown"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>城市提示 · 留在读书城市</span>
              <textarea
                v-model="template.copy.target.cityNoteStudy"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>城市提示 · 其他城市</span>
              <textarea
                v-model="template.copy.target.cityNoteOther"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>薪资门槛标题</span>
              <input
                v-model="template.copy.target.salaryTitle"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field full">
              <span>薪资门槛说明</span>
              <textarea
                v-model="template.copy.target.salaryNote"
                class="textarea"
                rows="3"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>收尾</span>
              <input
                v-model="template.copy.target.closing"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
          </div>
          <div class="form-grid option-grid">
            <label
              v-for="band in salaryBands"
              :key="band.key"
              class="field full"
            >
              <span class="mono">期望月薪 {{ band.label }} · 能力门槛</span>
              <input
                v-model="template.copy.target.salaryBands[band.key]"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>九项现状</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>标题</span>
              <input v-model="template.copy.radar.title" class="input" type="text" maxlength="120" />
            </label>
            <label class="field">
              <span>说明</span>
              <input v-model="template.copy.radar.subtitle" class="input" type="text" maxlength="300" />
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>三项最高分</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>标题</span>
              <input
                v-model="template.copy.strengths.title"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field">
              <span>说明</span>
              <input
                v-model="template.copy.strengths.subtitle"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
            <label class="field full">
              <span>单项默认文案</span>
              <input
                v-model="template.copy.strengths.item"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>三项最低分</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>标题</span>
              <input v-model="template.copy.gaps.title" class="input" type="text" maxlength="120" />
            </label>
            <label class="field">
              <span>说明</span>
              <input v-model="template.copy.gaps.subtitle" class="input" type="text" maxlength="300" />
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>自评与行为对照</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>标题</span>
              <input
                v-model="template.copy.consistency.title"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field">
              <span>收尾</span>
              <input
                v-model="template.copy.consistency.closing"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
            <label class="field full">
              <span>引导语</span>
              <textarea
                v-model="template.copy.consistency.intro"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>单项默认文案</span>
              <textarea
                v-model="template.copy.consistency.item"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>认知提示</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>标题</span>
              <input
                v-model="template.copy.cognition.title"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field">
              <span>收尾</span>
              <input
                v-model="template.copy.cognition.closing"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
            <label class="field full">
              <span>权重清单句</span>
              <textarea
                v-model="template.copy.cognition.weights"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>引导语</span>
              <textarea
                v-model="template.copy.cognition.intro"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>最高权重对照</span>
              <textarea
                v-model="template.copy.cognition.compare"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>最低权重对照</span>
              <textarea
                v-model="template.copy.cognition.lightest"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>缺口权重计入总分说明</span>
              <textarea
                v-model="template.copy.cognition.needLine"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
          </div>
          <div class="form-grid option-grid">
            <label
              v-for="(_, key) in template.copy.cognition.options"
              :key="key"
              class="field full"
            >
              <span class="mono">C1 权重项 {{ key }} 的补充解读</span>
              <input
                v-model="template.copy.cognition.options[key]"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>接下来 30 天</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>标题</span>
              <input
                v-model="template.copy.actions.title"
                class="input"
                type="text"
                maxlength="120"
              />
            </label>
            <label class="field">
              <span>说明</span>
              <input
                v-model="template.copy.actions.subtitle"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
            <label class="field full">
              <span>收尾</span>
              <input
                v-model="template.copy.actions.closing"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
          </div>
          <div class="fallback">
            <div class="fallback-head">
              <span>默认动作</span>
              <button class="btn quiet small" type="button" @click="addFallback">+ 加一条</button>
            </div>
            <div
              v-for="(_, index) in template.copy.actions.fallback"
              :key="index"
              class="fallback-row"
            >
              <input
                v-model="template.copy.actions.fallback[index]"
                class="input"
                type="text"
                maxlength="300"
              />
              <button
                class="btn quiet danger-text"
                type="button"
                @click="removeFallback(index)"
              >
                删除
              </button>
            </div>
          </div>
        </section>
      </div>

      <div v-else-if="tab === 'theme'" class="theme-grid">
        <section class="card section-card">
          <header class="section-head">
            <h2>主题</h2>
          </header>
          <div class="form-grid">
            <label class="field">
              <span>强调色</span>
              <div class="color-row">
                <input v-model="template.theme.accent" class="color" type="color" />
                <input v-model="template.theme.accent" class="input mono" type="text" maxlength="7" />
              </div>
            </label>
            <label class="field">
              <span>纸张底色</span>
              <div class="color-row">
                <input v-model="template.theme.paper" class="color" type="color" />
                <input v-model="template.theme.paper" class="input mono" type="text" maxlength="7" />
              </div>
            </label>
            <label class="field">
              <span>落款</span>
              <input v-model="template.theme.signature" class="input" type="text" maxlength="40" />
            </label>
            <label class="check full">
              <input v-model="template.theme.showTotal" type="checkbox" />
              显示总分
            </label>
          </div>
        </section>

        <section class="card section-card">
          <header class="section-head">
            <h2>模块</h2>
          </header>
          <div class="module-list">
            <label v-for="module in template.modules" :key="module.key" class="module-row">
              <input v-model="module.enabled" type="checkbox" />
              <span>{{ moduleLabel(module.key) }}</span>
              <span class="mono quiet">{{ module.key }}</span>
            </label>
          </div>
        </section>
      </div>

      <div v-else-if="tab === 'dimensions'" class="dimension-grid">
        <details v-for="row in dimensionRows" :key="row.key" class="card dim-card">
          <summary>
            <span class="dim-name">{{ row.name }}</span>
            <span class="mono quiet">{{ row.key }}</span>
          </summary>
          <div class="form-grid">
            <label class="field full">
              <span>优势文案</span>
              <textarea
                v-model="template.dimensions[row.key].strength"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field full">
              <span>补什么</span>
              <input
                v-model="template.dimensions[row.key].gap.what"
                class="input"
                type="text"
                maxlength="500"
              />
            </label>
            <label class="field full">
              <span>怎么补</span>
              <textarea
                v-model="template.dimensions[row.key].gap.how"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
            <label class="field">
              <span>什么时候开始</span>
              <input
                v-model="template.dimensions[row.key].gap.when"
                class="input"
                type="text"
                maxlength="300"
              />
            </label>
            <label class="field">
              <span>30 天动作</span>
              <input
                v-model="template.dimensions[row.key].action30"
                class="input"
                type="text"
                maxlength="500"
              />
            </label>
            <label class="field full">
              <span>自评与行为对照（可选）</span>
              <textarea
                v-model="template.dimensions[row.key].consistency"
                class="textarea"
                rows="2"
                maxlength="1000"
              />
            </label>
          </div>
        </details>
      </div>

      <div v-else class="copy-grid">
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

    <Modal :open="previewOpen" title="报告预览" wide @close="previewOpen = false">
      <p v-if="previewError" class="notice">{{ previewError }}</p>
      <div v-else-if="!preview" class="empty">正在生成预览</div>
      <div v-else class="preview-sheet" :style="previewStyle">
        <ReportBlocks :payload="preview" />
      </div>
    </Modal>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { ModuleKey, ReportPayload, ReportTemplate, Survey } from '@shared/types'
import { validateTemplate } from '@shared/validate'
import { api } from '@/api'
import Modal from '@/components/Modal.vue'
import ReportBlocks from '@/components/ReportBlocks.vue'
import { useUnsavedChanges } from '@/useUnsavedChanges'

const MODULE_LABELS: Record<ModuleKey, string> = {
  hero: '一句话诊断',
  target: '目标与距离',
  radar: '九维雷达图',
  strengths: '三项最高分',
  gaps: '三项最低分',
  consistency: '自评与行为对照',
  cognition: '认知提示',
  actions: '接下来 30 天'
}

const salaryBands = [
  { key: 'a7_1', label: '3000 以下' },
  { key: 'a7_2', label: '3000 到 5000' },
  { key: 'a7_3', label: '5000 到 8000' },
  { key: 'a7_4', label: '8000 到 12000' },
  { key: 'a7_5', label: '12000 以上' }
]

const template = ref<ReportTemplate | null>(null)
const survey = ref<Survey | null>(null)
const loading = ref(true)
const saving = ref(false)
const previewing = ref(false)
const error = ref('')
const toast = ref('')
const tab = ref<'copy' | 'theme' | 'dimensions' | 'claim'>('copy')
const initialJson = ref('')
const previewOpen = ref(false)
const preview = ref<ReportPayload | null>(null)
const previewError = ref('')

const dirty = computed(
  () => Boolean(template.value) && JSON.stringify(template.value) !== initialJson.value
)

useUnsavedChanges(dirty, '报告设置还有未保存的修改，确定离开？')

const dimensionRows = computed(() => {
  const value = template.value
  if (!value) return []
  const names = new Map((survey.value?.dimensions ?? []).map((d) => [d.key, d.name]))
  return Object.keys(value.dimensions).map((key) => ({
    key,
    name: names.get(key) ?? key
  }))
})

const previewStyle = computed<Record<string, string>>(() => ({
  '--accent': preview.value?.theme.accent ?? '#2f5d46',
  '--paper': preview.value?.theme.paper ?? '#f7f4ed'
}))

onMounted(async () => {
  try {
    const [templateResult, surveyResult] = await Promise.all([api.template(), api.survey()])
    template.value = structuredClone(templateResult.template)
    survey.value = surveyResult.survey
    initialJson.value = JSON.stringify(template.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    loading.value = false
  }
})

function moduleLabel(key: ModuleKey): string {
  return MODULE_LABELS[key] ?? key
}

function flash(message: string) {
  toast.value = message
  window.setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, 2200)
}

function addFallback() {
  template.value?.copy.actions.fallback.push('补一条 30 天内能验证的动作')
}

function removeFallback(index: number) {
  template.value?.copy.actions.fallback.splice(index, 1)
}

async function save() {
  const value = template.value
  if (!value) return
  error.value = ''
  const errors = validateTemplate(value)
  if (errors.length) {
    error.value = errors[0]
    return
  }
  saving.value = true
  try {
    const result = await api.saveTemplate(value)
    template.value = structuredClone(result.template)
    initialJson.value = JSON.stringify(template.value)
    flash(`已保存 v${result.template.version}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function openPreview() {
  if (!template.value) return
  previewError.value = ''
  preview.value = null
  previewOpen.value = true
  previewing.value = true
  try {
    preview.value = await api.previewReport({
      template: template.value,
      survey: survey.value ?? undefined
    })
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : '预览失败'
  } finally {
    previewing.value = false
  }
}
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.page-title {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-note {
  margin: 8px 0 4px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.ai-note a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.tabs button {
  border: 0;
  background: transparent;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--ink-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tabs button.on {
  color: var(--ink);
  border-bottom-color: var(--accent);
}

.copy-grid,
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}

.section-card {
  padding: 20px 22px 22px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.section-head h2 {
  font-size: 15px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field.full,
.check.full {
  grid-column: 1 / -1;
}

.option-grid {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}

.mono {
  font-family: var(--mono);
}

.quiet {
  color: var(--ink-3);
}

.fallback {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
}

.fallback-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--ink-3);
}

.fallback-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.color-row {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.color {
  width: 46px;
  height: 38px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
}

.module-list {
  display: grid;
  gap: 2px;
}

.module-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  cursor: pointer;
}

.module-row:last-child {
  border-bottom: 0;
}

.module-row:hover {
  background: rgba(0, 0, 0, 0.014);
}

.dimension-grid {
  display: grid;
  gap: 10px;
}

.dim-card {
  padding: 0;
  overflow: hidden;
}

.dim-card summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  list-style: none;
}

.dim-card summary::-webkit-details-marker {
  display: none;
}

.dim-card[open] summary {
  border-bottom: 1px solid var(--line);
}

.dim-name {
  font-size: 14px;
  font-weight: 600;
}

.dim-card .form-grid {
  padding: 18px 20px 20px;
}

.preview-sheet {
  padding: 28px 24px;
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
}

@media (max-width: 1080px) {
  .copy-grid,
  .theme-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
