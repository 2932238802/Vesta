<template>
  <aside class="card major-rail" aria-label="专业列表">
    <p class="rail-title">专业</p>
    <div class="rail-list">
      <button
        v-for="major in majors"
        :key="major.id"
        class="major-item"
        :class="{ on: major.id === selectedId }"
        type="button"
        @click="emit('select', major.id)"
      >
        <span class="major-name">{{ major.name }}</span>
        <span class="major-count">{{ major.count }}</span>
      </button>
      <p v-if="!majors.length" class="rail-empty">还没有专业</p>
    </div>
    <div class="rail-actions">
      <button class="rail-btn" type="button" @click="emit('add')">新建专业</button>
      <button class="rail-btn" type="button" @click="emit('manage')">管理专业</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { KnowledgeMajor } from '@/api'

defineProps<{
  majors: KnowledgeMajor[]
  selectedId: string
}>()

const emit = defineEmits<{
  (event: 'select', id: string): void
  (event: 'add'): void
  (event: 'manage'): void
}>()
</script>
