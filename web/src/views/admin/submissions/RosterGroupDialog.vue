<template>
  <Modal
    :open="open"
    :title="mode === 'manage' ? '分组管理' : '加入分组'"
    :eyebrow="mode === 'manage' ? '名单分组' : `已选 ${selectedCount} 人`"
    @close="$emit('close')"
  >
    <template v-if="mode === 'manage'">
      <div class="group-create-row">
        <input
          v-model="name"
          class="input"
          type="text"
          maxlength="24"
          placeholder="新分组名称"
          aria-label="新分组名称"
          @keydown.enter="submitCreate"
        />
        <button class="btn small" type="button" :disabled="saving || !name.trim()" @click="submitCreate">
          {{ saving ? '创建中' : '新建分组' }}
        </button>
      </div>
      <ul class="group-list">
        <li v-for="group in groups" :key="group.id" class="group-row">
          <span class="group-name">{{ group.name }}</span>
          <span v-if="group.default" class="chip mini">默认</span>
          <span class="quiet small">{{ group.totalCount }} 人</span>
          <button
            class="btn ghost small danger-btn"
            type="button"
            :disabled="groups.length <= 1 || saving || !!deletingId"
            :title="groups.length <= 1 ? '至少保留一个分组' : undefined"
            @click="$emit('delete', group)"
          >
            {{ deletingId === group.id ? '删除中' : '删除' }}
          </button>
        </li>
      </ul>
    </template>

    <template v-else>
      <div class="group-pick-list">
        <label v-for="group in groups" :key="group.id" class="group-option">
          <input v-model="picked" type="radio" name="roster-group" :value="group.id" />
          <span>{{ group.name }}</span>
          <span v-if="group.default" class="chip mini">默认</span>
          <span class="quiet small">{{ group.totalCount }} 人</span>
        </label>
      </div>
      <div class="group-create-row">
        <input
          v-model="name"
          class="input"
          type="text"
          maxlength="24"
          placeholder="新分组名称"
          aria-label="新分组名称"
          @keydown.enter="submitCreateAndJoin"
        />
        <button
          class="btn ghost small"
          type="button"
          :disabled="saving || !name.trim()"
          @click="submitCreateAndJoin"
        >
          新建并加入
        </button>
      </div>
    </template>

    <template #footer>
      <template v-if="mode === 'manage'">
        <button class="btn ghost small" type="button" @click="$emit('close')">关闭</button>
      </template>
      <template v-else>
        <button class="btn ghost small" type="button" :disabled="saving" @click="$emit('close')">
          取消
        </button>
        <button class="btn small" type="button" :disabled="saving || !picked" @click="submitJoin">
          {{ saving ? '加入中' : '加入' }}
        </button>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import type { AdminRosterGroup } from '@/api'

const props = defineProps<{
  open: boolean
  mode: 'manage' | 'pick'
  groups: AdminRosterGroup[]
  selectedCount: number
  saving: boolean
  deletingId: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'create', name: string): void
  (event: 'create-and-join', name: string): void
  (event: 'join', groupId: string): void
  (event: 'delete', group: AdminRosterGroup): void
}>()

const name = ref('')
const picked = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    name.value = ''
    picked.value = ''
  }
)

function submitCreate() {
  if (!name.value.trim() || props.saving) return
  emit('create', name.value)
}

function submitCreateAndJoin() {
  if (!name.value.trim() || props.saving) return
  emit('create-and-join', name.value)
}

function submitJoin() {
  if (!picked.value || props.saving) return
  emit('join', picked.value)
}
</script>
