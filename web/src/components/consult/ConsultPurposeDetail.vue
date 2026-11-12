<template>
  <aside ref="el" v-show="selectedNode" class="card detail-card">
    <button
      class="detail-close"
      type="button"
      title="关闭详情"
      aria-label="关闭详情"
      @click="emit('close')"
    >×</button>
    <template v-if="selectedNode">
      <p v-if="breadcrumb.length" class="breadcrumb">
        <template v-for="(item, index) in breadcrumb" :key="item.id">
          <span v-if="index" class="crumb-sep">→</span>
          <button class="crumb-link" type="button" @click="emit('select', item.id)">{{ item.label }}</button>
        </template>
      </p>

      <header class="detail-head">
        <div>
          <p class="detail-kind">{{ kindLabel(selectedNode) }}</p>
          <h2>{{ selectedNode.label }}</h2>
        </div>
      </header>

      <div class="detail-badges">
        <span v-for="badge in badges(selectedNode)" :key="badge.key" class="badge" :class="badge.tone">
          {{ badge.label }}
        </span>
      </div>

      <p class="detail-summary">{{ selectedNode.summary }}</p>

      <div class="detail-metrics">
        <span><b>{{ selectedBeats.length }}</b> 个参考节拍</span>
        <span><b>{{ exampleCount(selectedNode) }}</b> 组原文</span>
        <span><b>{{ butterflyCount(selectedNode) }}</b> 个情绪垫</span>
        <span v-if="hasChildren(selectedNode)"><b>{{ selectedNode.children?.length ?? 0 }}</b> 个子目的</span>
      </div>

      <div v-if="selectedNode.branchCondition" class="callout branch">
        <b>什么时候走这里：</b>{{ selectedNode.branchCondition }}
      </div>

      <details v-if="selectedBeats.length" class="detail-section beat-section" open>
        <summary class="beat-summary">
          下一步 · 参考节拍
          <span class="quiet">{{ selectedBeats.length }}</span>
        </summary>
        <p class="beat-source">
          来自
          <b>{{ selectedBeatExample?.sourceLabel }}</b>
          <template v-if="selectedBeatExample"> · {{ rangeLabel(selectedBeatExample) }}</template>
          · 自动拆自原文，生成时会按学生情况改写
        </p>
        <ol class="beat-list">
          <li
            v-for="(beat, index) in selectedBeats"
            :key="index"
            class="beat-item"
            :class="beat.kind"
          >
            <span class="beat-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="beat-kind">{{ beatKindLabel(beat.kind) }}</span>
            <p>{{ beat.text }}</p>
          </li>
        </ol>
      </details>
      <section v-else class="detail-section">
        <h3>下一步 · 参考节拍</h3>
        <div class="callout gap">
          <b>还没有参考节拍：</b>这个目的目前没有可拆的原文示例，生成时会按目的和阶段现场展开。
        </div>
      </section>

      <section v-if="selectedNode.notes?.length" class="detail-section">
        <h3>导演提示</h3>
        <ul class="note-list">
          <li v-for="(note, index) in selectedNode.notes" :key="index">{{ note }}</li>
        </ul>
      </section>

      <section class="detail-section">
        <h3>原文对照 <span class="quiet">{{ exampleCount(selectedNode) }}</span></h3>
        <template v-if="selectedNode.examples.length">
          <details
            v-for="(example, index) in selectedNode.examples"
            :key="`${example.source}-${example.from}-${example.to}-${index}`"
            class="example"
            :open="!selectedBeats.length && index === 0"
          >
            <summary>
              <span class="source" :class="example.source === 'july' ? 'july' : 'sep'">{{ example.sourceLabel }}</span>
              <span class="range">{{ rangeLabel(example) }}</span>
              <span class="quiet tiny">{{ example.turns.length }} 条</span>
              <span v-if="example.note" class="ex-note">{{ example.note }}</span>
            </summary>
            <div class="turns">
              <div v-for="(turn, turnIndex) in example.turns" :key="turnIndex" class="turn" :class="turn.role">
                <span class="turn-role">{{ turn.role === 'student' ? '学生' : '咨询师' }}</span>
                <p>{{ turn.text }}</p>
              </div>
            </div>
          </details>
        </template>
        <div v-else-if="selectedNode.group" class="callout">
          <b>分组节点：</b>这里不直接挂原文，具体示例在下面的子目的里。
        </div>
        <div v-else-if="selectedNode.gap" class="callout gap">
          <b>待补充：</b>原稿只有标题，还没有可用的原文示例。这里会是一个明确的空缺，而不是系统自拟话术。
        </div>
        <div v-else class="quiet tiny">暂无示例。</div>
      </section>

      <section v-if="selectedNode.butterflies?.length" class="detail-section">
        <h3>挂在目的上的情绪垫</h3>
        <div class="chip-list">
          <button
            v-for="butterfly in selectedNode.butterflies"
            :key="butterfly.id"
            class="butterfly"
            type="button"
            @click="emit('select', butterfly.id)"
          >
            🦋 {{ butterfly.label }}
          </button>
        </div>
      </section>

      <section v-if="selectedNode.children?.length" class="detail-section">
        <h3>子目的 <span class="quiet">{{ selectedNode.children.length }}</span></h3>
        <div class="chip-list">
          <button
            v-for="child in selectedNode.children"
            :key="child.id"
            class="link-chip"
            type="button"
            @click="emit('select', child.id)"
          >
            {{ child.label }}
          </button>
        </div>
      </section>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ConsultPurposeNode } from '@shared/consult-purpose'
import {
  badges,
  beatInfoFor,
  beatKindLabel,
  butterflyCount,
  exampleCount,
  hasChildren,
  kindLabel,
  rangeLabel
} from './purposeView'

const props = defineProps<{
  selectedNode: ConsultPurposeNode | null
  breadcrumb: ConsultPurposeNode[]
}>()

const emit = defineEmits<{
  (event: 'select', id: string): void
  (event: 'close'): void
}>()

const el = ref<HTMLElement | null>(null)

const selectedBeatInfo = computed(() =>
  props.selectedNode ? beatInfoFor(props.selectedNode) : null
)
const selectedBeats = computed(() => selectedBeatInfo.value?.beats ?? [])
const selectedBeatExample = computed(() => selectedBeatInfo.value?.example ?? null)

function scrollIntoView() {
  el.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({ scrollIntoView })
</script>

<style scoped>
.detail-card {
  position: absolute;
  top: 56px;
  right: 12px;
  bottom: 12px;
  z-index: 12;
  width: 380px;
  overflow: auto;
  padding: 18px 19px 22px;
  background: rgba(255, 253, 248, 0.97);
  box-shadow: 0 14px 40px rgba(27, 26, 23, 0.16);
  backdrop-filter: blur(8px);
}

.detail-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-3);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}

.detail-close:hover {
  border-color: var(--line);
  background: var(--surface);
  color: var(--ink);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  color: var(--ink-3);
  font-size: 10.5px;
}

.crumb-sep {
  color: var(--line-strong);
}

.crumb-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: 10.5px;
  cursor: pointer;
}

.crumb-link:hover {
  color: var(--accent);
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-right: 30px;
}

.detail-kind {
  color: var(--ink-3);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.detail-head h2 {
  margin-top: 3px;
  font-size: 18px;
  line-height: 1.35;
}

.detail-badges {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 7px;
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink-3);
  font-size: 9.5px;
  font-weight: 500;
  white-space: nowrap;
}

.badge.optional {
  border-color: rgba(148, 98, 28, 0.28);
  background: rgba(148, 98, 28, 0.07);
  color: var(--amber);
}

.badge.group {
  border-color: rgba(107, 127, 149, 0.35);
  background: rgba(107, 127, 149, 0.08);
  color: #52667c;
}

.badge.gap {
  border-style: dashed;
}

.badge.incomplete {
  border-color: rgba(163, 58, 44, 0.3);
  background: rgba(163, 58, 44, 0.06);
  color: var(--danger);
}

.badge.count {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent);
}

.detail-summary {
  margin-top: 10px;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.75;
}

.detail-metrics {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 11px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 10.5px;
}

.detail-metrics b {
  color: var(--ink);
  font-size: 12px;
  font-weight: 580;
}

.callout {
  margin-top: 12px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  background: rgba(47, 93, 70, 0.035);
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.65;
}

.callout.branch {
  border-left-color: #6b7f95;
  background: rgba(107, 127, 149, 0.06);
}

.callout.gap {
  border-left-color: var(--amber);
  border-style: dashed;
  background: rgba(148, 98, 28, 0.05);
}

.beat-source {
  margin: -2px 0 9px;
  color: var(--ink-3);
  font-size: 10.5px;
  line-height: 1.55;
}

.beat-source b {
  color: var(--ink-2);
  font-weight: 560;
}

.beat-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.beat-item {
  display: grid;
  grid-template-columns: 25px 38px minmax(0, 1fr);
  gap: 5px;
  align-items: start;
  padding: 7px 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.beat-item .beat-no {
  padding-top: 3px;
  color: var(--ink-3);
  font-size: 9.5px;
  font-variant-numeric: tabular-nums;
}

.beat-kind {
  padding-top: 1px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 560;
  line-height: 1.6;
}

.beat-item p {
  margin: 0;
  color: var(--ink);
  font-size: 12px;
  line-height: 1.68;
  white-space: pre-wrap;
}

.beat-item.ask {
  border-color: rgba(47, 111, 159, 0.22);
  background: rgba(47, 111, 159, 0.045);
}

.beat-item.ask .beat-kind {
  color: #2f6f9f;
}

.beat-item.student {
  border-color: rgba(148, 98, 28, 0.2);
  background: #fffdf6;
}

.beat-item.student .beat-kind {
  color: var(--amber);
}

.beat-item.direction {
  background: #f7f6f2;
}

.beat-item.direction .beat-kind {
  color: #8a7a5a;
}

.beat-item.direction p {
  color: var(--ink-2);
  font-style: italic;
}

.detail-section {
  margin-top: 17px;
}

.detail-section h3 {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 7px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
}

.detail-section h3 .quiet {
  font-weight: 400;
}

.beat-summary {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 7px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

.beat-summary::-webkit-details-marker {
  display: none;
}

.beat-summary .quiet {
  font-weight: 400;
}

.beat-summary::after {
  margin-left: auto;
  color: var(--ink-3);
  font-size: 10px;
  font-weight: 400;
  content: '收起';
}

.beat-section:not([open]) > .beat-summary::after {
  content: '展开';
}

.beat-section:not([open]) > .beat-summary {
  margin-bottom: 0;
}

.note-list {
  display: grid;
  gap: 6px;
  padding-left: 16px;
  color: var(--ink-2);
  font-size: 11.5px;
  line-height: 1.65;
}

.example {
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fffefa;
  overflow: hidden;
}

.example + .example {
  margin-top: 7px;
}

.example summary {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
}

.example summary::-webkit-details-marker {
  display: none;
}

.source {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 500;
}

.source.july {
  background: rgba(47, 93, 70, 0.1);
  color: var(--accent);
}

.source.sep {
  background: rgba(148, 98, 28, 0.1);
  color: var(--amber);
}

.range {
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 9.5px;
}

.ex-note {
  flex-basis: 100%;
  color: var(--ink-3);
  font-size: 10px;
  line-height: 1.5;
}

.turns {
  display: grid;
  gap: 7px;
  padding: 0 10px 10px;
}

.turn {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 7px;
  padding: 7px 8px;
  border-radius: 7px;
  background: rgba(47, 93, 70, 0.045);
}

.turn.student {
  background: rgba(148, 98, 28, 0.07);
}

.turn-role {
  color: var(--accent);
  font-size: 9.5px;
  font-weight: 500;
}

.turn.student .turn-role {
  color: var(--amber);
}

.turn p {
  color: var(--ink);
  font-size: 11.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chip-list {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.butterfly {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border: 1px solid rgba(148, 98, 28, 0.24);
  border-radius: 999px;
  background: rgba(148, 98, 28, 0.08);
  color: var(--amber);
  font-size: 10px;
  line-height: 1.3;
  cursor: pointer;
}

.butterfly:hover {
  background: rgba(148, 98, 28, 0.14);
}

.link-chip {
  padding: 4px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink-2);
  font-size: 10.5px;
  cursor: pointer;
}

.link-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

@media (max-width: 1180px) {
  .detail-card {
    left: 12px;
    width: auto;
  }
}

@media (max-width: 720px) {
  .detail-head {
    flex-direction: column;
  }
}
</style>
