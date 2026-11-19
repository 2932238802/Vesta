<template>
  <section id="claim" class="claim-section">
    <div class="claim-card">
      <p class="eyebrow">下一步</p>
      <h2>{{ claim.title }}</h2>
      <p class="desc">{{ claim.description }}</p>
      <p v-if="claim.freeNote" class="free">{{ claim.freeNote }}</p>

      <form v-if="!claimed" class="claim-form" @submit.prevent="submitClaim">
        <label class="field">
          <span>{{ claim.wechatLabel }}</span>
          <input
            v-model="wechat"
            class="input"
            type="text"
            name="wechat"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            maxlength="80"
            placeholder="微信号"
          />
        </label>
        <label class="field">
          <span>{{ claim.timeLabel }} 一</span>
          <input
            v-model="slot1"
            class="input"
            type="text"
            name="slot1"
            autocomplete="off"
            maxlength="80"
            placeholder="例：周三晚 8 点后"
          />
        </label>
        <label class="field">
          <span>{{ claim.timeLabel }} 二（可不填）</span>
          <input
            v-model="slot2"
            class="input"
            type="text"
            name="slot2"
            autocomplete="off"
            maxlength="80"
            placeholder="例：周六下午"
          />
        </label>
        <label class="check agree">
          <input v-model="agree" type="checkbox" />
          微信号只用于这次联系，我可以随时要求删除
        </label>
        <p v-if="claimError" class="claim-error">{{ claimError }}</p>
        <button class="btn wide" type="submit" :disabled="claiming">
          {{ claiming ? '正在提交' : claim.submit }}
        </button>
      </form>

      <div v-else class="claimed">
        <p class="eyebrow">已提交</p>
        <h3>{{ claim.successTitle }}</h3>
        <p>{{ claim.successBody }}</p>
        <p v-if="wechat.trim()" class="claimed-meta">
          微信号：{{ wechat.trim() }}
          <template v-if="claimedSlots.length">· 时间：{{ claimedSlots.join(' / ') }}</template>
        </p>
      </div>

      <p class="privacy">{{ claim.privacy }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ClaimCopy } from '@shared/types'
import { ApiError, api } from '@/api'

const props = defineProps<{
  slug: string
  claim: ClaimCopy
  claimed: boolean
}>()

const emit = defineEmits<{
  (e: 'update:claimed', value: boolean): void
}>()

const wechat = ref('')
const slot1 = ref('')
const slot2 = ref('')
const agree = ref(false)
const claiming = ref(false)
const claimError = ref('')

const claimedSlots = computed(() =>
  [slot1.value, slot2.value].map((slot) => slot.trim()).filter(Boolean)
)

async function submitClaim() {
  claimError.value = ''
  if (!wechat.value.trim()) {
    claimError.value = '先填一下微信号'
    return
  }
  if (!slot1.value.trim()) {
    claimError.value = '至少填一个方便的时间段'
    return
  }
  if (!agree.value) {
    claimError.value = '需要勾选同意才能提交'
    return
  }
  claiming.value = true
  try {
    const slots = claimedSlots.value
    await api.claim(props.slug, { wechat: wechat.value.trim(), slots, agree: agree.value })
    emit('update:claimed', true)
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      emit('update:claimed', true)
      return
    }
    claimError.value = err instanceof Error ? err.message : '提交失败，请再试一次'
  } finally {
    claiming.value = false
  }
}
</script>

<style scoped src="./reportClaim.css"></style>
