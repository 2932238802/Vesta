<template>
  <article class="card set-card">
    <header class="set-head">
      <div class="set-title-wrap">
        <h2 class="set-title">{{ set.title }}</h2>
        <p class="set-meta">
          <span class="chip">{{ categoryName }}</span>
          <span>{{ set.year > 0 ? `${set.year} 年` : '未标年份' }}</span>
          <span v-if="set.region">{{ set.region }}</span>
        </p>
      </div>
      <div class="set-actions">
        <button class="btn ghost small" type="button" @click="$emit('edit')">编辑</button>
        <button class="btn ghost small danger" type="button" @click="$emit('delete')">删除</button>
      </div>
    </header>

    <p v-if="set.note" class="set-note">{{ set.note }}</p>

    <div class="entry-wrap">
      <table class="table entry-table">
        <thead>
          <tr>
            <th>条目</th>
            <th>分数</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in set.entries" :key="entry.id">
            <td>{{ entry.label }}</td>
            <td class="num">
              {{ entry.maxValue ? `${entry.value} / ${entry.maxValue}` : entry.value }}
            </td>
            <td class="entry-note">{{ entry.note || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="set-foot">
      <span class="source">
        来源：
        <a
          v-if="set.sourceUrl"
          class="source-link"
          :href="set.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
        >{{ set.sourceName }} ↗</a>
        <span v-else>{{ set.sourceName }}</span>
      </span>
      <span class="quiet tiny">更新于 {{ formatDate(set.updatedAt, false) }}</span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScoreLineSet } from '@/api'
import { scoreLineCategoryName } from '@shared/score-line'
import { formatDate } from '@/format'

const props = defineProps<{ set: ScoreLineSet }>()
defineEmits<{ (event: 'edit'): void; (event: 'delete'): void }>()

const categoryName = computed(() => scoreLineCategoryName(props.set.categoryId))
</script>

<style scoped>
.set-card {
  padding: 20px 22px 16px;
  /* grid 子项默认 min-width:auto，会被条目表的 min-width 撑破页面；允许收缩、内部横向滚动。 */
  min-width: 0;
}

.set-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.set-title-wrap {
  min-width: 0;
}

.set-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.set-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 7px;
  color: var(--ink-3);
  font-size: 12.5px;
}

.set-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.set-note {
  margin-top: 12px;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.entry-wrap {
  margin-top: 14px;
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.entry-table {
  min-width: 420px;
}

.entry-table th {
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}

.entry-table td {
  font-size: 13.5px;
}

.entry-note {
  color: var(--ink-3);
}

.set-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  color: var(--ink-3);
  font-size: 12px;
}

.source-link {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 600px) {
  .set-card {
    padding: 16px;
  }

  .set-actions {
    width: 100%;
  }
}
</style>
