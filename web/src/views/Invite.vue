<template>
  <div class="invite">
    <main v-if="loading" class="state">
      <p class="quiet">正在打开</p>
    </main>

    <main v-else-if="error" class="state">
      <p class="eyebrow">无法打开</p>
      <h1 class="serif">{{ error }}</h1>
      <p class="muted">如果反复出现，把这条链接截图发给发链接的人</p>
    </main>

    <main v-else-if="invite" class="content fade-in">
      <p class="eyebrow">{{ invite.survey.title }}</p>
      <h1 class="serif">
        {{ greeting }}<br />
        你离想去的地方，<br class="wide-break" />还差哪几步
      </h1>

      <button class="btn start" type="button" @click="start">
        {{ draftFilled > 0 ? '继续填写' : '开始填写' }}
      </button>

      <p v-if="draftFilled > 0" class="draft">
        上次填到第 {{ draftStep + 1 }} 组，已填 {{ draftFilled }} 题
      </p>
      <p class="privacy">答案用于生成这份报告</p>
    </main>

    <footer class="foot">
      <span>© {{ year }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, track, type Answers, type InvitePayload } from '@/api'
import { isEmptyValue } from '@shared/validate'

const route = useRoute()
const router = useRouter()
const token = String(route.params.token ?? '')
const invite = ref<InvitePayload | null>(null)
const loading = ref(true)
const error = ref('')
const draftFilled = ref(0)
const draftStep = ref(0)
const year = new Date().getFullYear()

const greeting = computed(() => {
  const name = invite.value?.name?.trim()
  return name ? `${name}，你好` : '你好'
})

function readDraft() {
  if (!invite.value) return
  try {
    const raw = localStorage.getItem(`vesta:draft:${token}`)
    if (!raw) return
    const draft = JSON.parse(raw) as {
      surveyId?: string
      answers?: Answers
      step?: number
    }
    if (draft.surveyId !== invite.value.survey.id || !draft.answers) return
    const filled = invite.value.survey.questions.filter(
      (question) => !isEmptyValue(draft.answers?.[question.id])
    ).length
    if (filled === 0) return
    draftFilled.value = filled
    draftStep.value = Math.max(
      0,
      Math.min(Number(draft.step ?? 0), invite.value.survey.groups.length - 1)
    )
  } catch {
    // 草稿不可用时从零开始
  }
}

onMounted(async () => {
  try {
    invite.value = await api.getInvite(token)
    if (invite.value.submitted && invite.value.reportSlug) {
      router.replace(`/r/${invite.value.reportSlug}`)
      return
    }
    readDraft()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '链接无法打开'
  } finally {
    loading.value = false
  }
})

function start() {
  track(token, 'quiz_start')
  router.push(`/i/${token}/quiz`)
}
</script>

<style scoped>
.invite {
  min-height: 100vh;
  max-width: 620px;
  margin: 0 auto;
  padding: 26px 24px 36px;
  display: flex;
  flex-direction: column;
}

.state {
  margin: auto 0;
  padding-bottom: 80px;
}

.content {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 40px 0 48px;
  text-align: center;
}

.eyebrow {
  margin-bottom: 18px;
}

h1 {
  font-size: clamp(30px, 6.6vw, 42px);
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.01em;
}

.start {
  display: flex;
  width: min(340px, 100%);
  height: 58px;
  margin: 34px auto 0;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: 0 10px 24px rgba(47, 93, 70, 0.18);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.draft {
  margin-top: 12px;
  font-size: 12px;
  color: var(--ink-2);
}

.privacy {
  margin-top: 8px;
  font-size: 11px;
  color: var(--ink-3);
}

.start:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(0.97);
  box-shadow: 0 12px 28px rgba(47, 93, 70, 0.22);
}

.foot {
  padding-top: 40px;
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 10.5px;
  color: var(--ink-3);
  letter-spacing: 0.03em;
}

@media (max-width: 480px) {
  .wide-break {
    display: none;
  }

  .foot {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
