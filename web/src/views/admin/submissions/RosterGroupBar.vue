<template>
  <div class="group-bar" role="tablist" aria-label="分组">
    <span class="group-bar-label">分组</span>
    <button
      class="group-chip"
      type="button"
      role="tab"
      :aria-selected="!groupId"
      :class="{ on: !groupId }"
      @click="$emit('update:groupId', '')"
    >
      全部 <b>{{ total }}</b>
    </button>
    <button
      v-for="group in groups"
      :key="group.id"
      class="group-chip"
      type="button"
      role="tab"
      :aria-selected="groupId === group.id"
      :class="{ on: groupId === group.id }"
      @click="$emit('update:groupId', group.id)"
    >
      {{ group.name }}
      <span v-if="group.default" class="group-default">默认</span>
      <b>{{ group.count }}</b>
    </button>
    <span class="group-bar-spacer" />
    <button class="group-action" type="button" @click="$emit('create')">+ 新建分组</button>
    <button class="group-action" type="button" @click="$emit('manage')">管理</button>
  </div>
</template>

<script setup lang="ts">
import type { AdminRosterGroup } from '@/api'

defineProps<{
  groups: AdminRosterGroup[]
  groupId: string
  total: number
}>()

defineEmits<{
  (event: 'update:groupId', value: string): void
  (event: 'create'): void
  (event: 'manage'): void
}>()
</script>
