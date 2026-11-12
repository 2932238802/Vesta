<template>
  <header class="page-head">
    <div class="page-head-main">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="page-sub">{{ subtitle }}</p>
      <slot name="meta" />
    </div>
    <div class="head-actions">
      <span v-if="dirty" class="chip warn">未保存</span>
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  subtitle?: string
  dirty?: boolean
}>()
</script>
