<template>
  <div class="report-page" :style="themeStyle">
    <header class="bar">
      <div class="actions">
        <button
          v-if="payload"
          class="btn quiet"
          type="button"
          :disabled="exporting"
          @click="saveImage"
        >
          {{ exporting ? '正在生成' : '保存图片' }}
        </button>
        <button class="btn quiet" type="button" @click="copyLink">复制链接</button>
        <button v-if="payload" class="btn quiet" type="button" @click="print">打印 / 保存</button>
      </div>
    </header>

    <main v-if="loading" class="state">
      <p class="quiet">正在读取报告</p>
    </main>

    <main v-else-if="error" class="state">
      <p class="eyebrow">无法打开</p>
      <h1 class="serif">{{ error }}</h1>
      <RouterLink class="btn ghost" to="/">回到首页</RouterLink>
    </main>

    <main v-else-if="!payload" class="state analysis">
      <div class="loader" aria-hidden="true">
        <span class="dot d1" />
        <span class="dot d2" />
        <span class="dot d3" />
      </div>
      <h1 class="serif">正在给你写这份报告</h1>
      <p class="analysis-copy">{{ waitCopy }}</p>
      <div class="analysis-line"><span /></div>
      <p class="quiet small">页面会自动更新，不用刷新</p>
      <p v-if="slow" class="quiet small">比预期久一点，可以先去忙别的，回来看这条链接就好。</p>
      <p v-if="pollNote" class="quiet small">{{ pollNote }}</p>
    </main>

    <main v-else class="wrap fade-in">
      <p v-if="reportNotice" class="notice report-notice">{{ reportNotice }}</p>
      <div ref="sheetEl" class="sheet">
        <ReportBlocks :payload="payload" :claim-link="!claimed" />
      </div>

      <section id="claim" class="claim-section">
        <div class="claim-card">
          <p class="eyebrow">下一步</p>
          <h2>{{ payload.claim.title }}</h2>
          <p class="desc">{{ payload.claim.description }}</p>
          <p v-if="payload.claim.freeNote" class="free">{{ payload.claim.freeNote }}</p>

          <form v-if="!claimed" class="claim-form" @submit.prevent="submitClaim">
            <label class="field">
              <span>{{ payload.claim.wechatLabel }}</span>
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
              <span>{{ payload.claim.timeLabel }} 一</span>
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
              <span>{{ payload.claim.timeLabel }} 二（可不填）</span>
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
              {{ claiming ? '正在提交' : payload.claim.submit }}
            </button>
          </form>

          <div v-else class="claimed">
            <p class="eyebrow">已提交</p>
            <h3>{{ payload.claim.successTitle }}</h3>
            <p>{{ payload.claim.successBody }}</p>
            <p v-if="wechat.trim()" class="claimed-meta">
              微信号：{{ wechat.trim() }}
              <template v-if="claimedSlots.length">· 时间：{{ claimedSlots.join(' / ') }}</template>
            </p>
          </div>

          <p class="privacy">{{ payload.claim.privacy }}</p>
        </div>
      </section>

      <footer class="report-foot">
        <p class="quiet">{{ payload.footer.note }}</p>
      </footer>
    </main>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <div v-if="shot" class="shot-mask" @click.self="shot = ''">
      <div class="shot-panel">
        <p class="shot-hint">长按图片可保存到相册；电脑上也可以直接下载</p>
        <div class="shot-frame">
          <img :src="shot" alt="报告图片" />
        </div>
        <div class="shot-actions">
          <a class="btn" :href="shot" :download="`vesta-report-${slug}.png`">下载图片</a>
          <button class="btn ghost" type="button" @click="shot = ''">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { toPng } from 'html-to-image'
import type { ReportPayload } from '@shared/types'
import { ApiError, api } from '@/api'
import ReportBlocks from '@/components/ReportBlocks.vue'

const route = useRoute()
const slug = String(route.params.slug ?? '')
const payload = ref<ReportPayload | null>(null)
const loading = ref(true)
const error = ref('')
const reportNotice = ref('')
const slow = ref(false)
const pollNote = ref('')
const reportStatus = ref('')
const elapsed = ref(0)
const claimed = ref(false)
const wechat = ref('')
const slot1 = ref('')
const slot2 = ref('')
const agree = ref(false)
const claiming = ref(false)
const claimError = ref('')
const toast = ref('')
const sheetEl = ref<HTMLElement | null>(null)
const exporting = ref(false)
const shot = ref('')

let pollTimer: number | undefined
let slowTimer: number | undefined
let elapsedTimer: number | undefined
let inFlight = false
let pollFailures = 0

const waitCopy = computed(() => {
  if (elapsed.value < 8) return '先读一遍你的回答，看看你现在在哪儿。'
  if (elapsed.value < 25) return '正在把你的情况和目标放在一起看。'
  if (elapsed.value < 60) return '正在写结论，和接下来 30 天最该做的事。'
  return '还在写，内容有点多，再等一小会儿。'
})

const claimedSlots = computed(() =>
  [slot1.value, slot2.value].map((slot) => slot.trim()).filter(Boolean)
)

const themeStyle = computed<Record<string, string>>(() => ({
  '--accent': payload.value?.theme.accent ?? '#2f5d46',
  '--paper': payload.value?.theme.paper ?? '#f7f4ed',
  background: payload.value?.theme.paper ?? '#f7f4ed'
}))

function stopPolling() {
  if (pollTimer !== undefined) window.clearInterval(pollTimer)
  if (slowTimer !== undefined) window.clearTimeout(slowTimer)
  pollTimer = undefined
  slowTimer = undefined
}

function startElapsed() {
  if (elapsedTimer !== undefined) return
  elapsed.value = 0
  elapsedTimer = window.setInterval(() => {
    elapsed.value += 1
  }, 1000)
}

function stopElapsed() {
  if (elapsedTimer !== undefined) window.clearInterval(elapsedTimer)
  elapsedTimer = undefined
}

function startPolling() {
  if (pollTimer !== undefined) return
  slowTimer = window.setTimeout(() => {
    slow.value = true
  }, 120_000)
  pollTimer = window.setInterval(() => {
    void load(true)
  }, 3000)
}

async function load(poll = false, preview = false) {
  if (inFlight) return
  inFlight = true
  try {
    const result = await api.getReport(slug, poll, preview)
    pollFailures = 0
    pollNote.value = ''
    reportStatus.value = result.status
    if (result.report) {
      payload.value = result.report
      claimed.value = result.report.claimed
      reportNotice.value = result.notice ?? result.error ?? ''
      stopElapsed()
    }
    error.value = ''
    if (result.status === 'pending' || result.status === 'running') {
      startPolling()
    } else if (!payload.value) {
      // 没生成出来也别退回基础版：继续等着，后台会重试。
      startPolling()
      pollNote.value = '还在写，好了会自动打开'
    } else {
      stopPolling()
    }
  } catch (err) {
    if (!poll) {
      error.value =
        err instanceof Error
          ? err.message
          : '报告不存在'
      stopPolling()
    } else {
      pollFailures += 1
      if (pollFailures >= 4) {
        pollNote.value = '连接不太稳定，正在重试；也可以稍后重新打开这个链接。'
      }
    }
  } finally {
    inFlight = false
    loading.value = false
  }
}

function onVisibility() {
  if (document.visibilityState !== 'visible' || inFlight) return
  if (
    !payload.value ||
    reportStatus.value === 'pending' ||
    reportStatus.value === 'running'
  ) {
    void load(true)
  }
}

onMounted(() => {
  startElapsed()
  document.addEventListener('visibilitychange', onVisibility)
  void load(false)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  stopPolling()
  stopElapsed()
})

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
    await api.claim(slug, { wechat: wechat.value.trim(), slots, agree: agree.value })
    claimed.value = true
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      claimed.value = true
      return
    }
    claimError.value = err instanceof Error ? err.message : '提交失败，请再试一次'
  } finally {
    claiming.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href)
    flash('链接已复制')
  } catch {
    const input = document.createElement('textarea')
    input.value = location.href
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    flash('链接已复制')
  }
}

function print() {
  window.print()
}

async function saveImage() {
  if (!sheetEl.value || exporting.value) return
  exporting.value = true
  try {
    if (document.fonts) await document.fonts.ready
    const dataUrl = await toPng(sheetEl.value, {
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: payload.value?.theme.paper ?? '#f7f4ed',
      cacheBust: true,
      style: { margin: '0', borderRadius: '0' }
    })
    shot.value = dataUrl
  } catch {
    flash('生成图片失败，可以改用“打印 / 保存”')
  } finally {
    exporting.value = false
  }
}

function flash(message: string) {
  toast.value = message
  setTimeout(() => {
    toast.value = ''
  }, 1800)
}
</script>

<style scoped>
.report-page {
  min-height: 100vh;
  transition: background 0.3s ease;
}

.bar {
  max-width: 760px;
  margin: 0 auto;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.actions {
  display: flex;
  gap: 4px;
}

.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 20px 60px;
}

.report-notice {
  margin-bottom: 18px;
  text-align: left;
}

.sheet {
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--accent) 7%, var(--line));
  border-radius: 24px;
  padding: 44px 44px 30px;
  box-shadow: 0 24px 60px -54px rgba(27, 26, 23, 0.45);
}

.state {
  max-width: 640px;
  margin: 0 auto;
  padding: 150px 24px;
}

.analysis {
  padding-top: 140px;
}

.analysis .serif {
  margin-top: 16px;
  font-size: clamp(25px, 4.8vw, 34px);
  line-height: 1.5;
  max-width: 20em;
}

.analysis-copy {
  margin-top: 20px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink-2);
  max-width: 30em;
}

.loader {
  display: flex;
  gap: 8px;
  margin-bottom: 22px;
}

.loader .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.85;
  animation: bob 1.1s ease-in-out infinite;
}

.loader .d2 {
  animation-delay: 0.16s;
  opacity: 0.65;
}

.loader .d3 {
  animation-delay: 0.32s;
  opacity: 0.45;
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-7px);
    opacity: 1;
  }
}

.analysis-line {
  margin-top: 34px;
  width: 100%;
  max-width: 260px;
  height: 2px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.analysis-line span {
  display: block;
  width: 38%;
  height: 100%;
  background: var(--accent);
  animation: scan 1.5s ease-in-out infinite;
}

.analysis .quiet.small {
  margin-top: 22px;
  line-height: 1.8;
}

.analysis .quiet.small + .quiet.small {
  margin-top: 6px;
}

@keyframes scan {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(360%);
  }
}

.claim-section {
  margin-top: 32px;
}

.claim-card {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent) 5%, var(--surface)) 0%,
      var(--surface) 58%
    );
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--line));
  border-radius: 24px;
  padding: 36px 40px;
  box-shadow: 0 24px 60px -54px rgba(27, 26, 23, 0.35);
}

.claim-card h2 {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.desc {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--ink-2);
  max-width: 32em;
}

.free {
  margin-top: 10px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-3);
  max-width: 34em;
}

.claim-form {
  margin-top: 28px;
  display: grid;
  gap: 16px;
}

.claim-form .input {
  border-radius: 12px;
}

.claim-form .field span {
  font-size: 12px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}

.agree {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-3);
  line-height: 1.6;
  align-items: flex-start;
}

.agree input {
  margin-top: 3px;
  accent-color: var(--accent);
}

.claim-error {
  font-size: 12px;
  color: var(--danger);
}

.claimed h3 {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 500;
}

.claimed p {
  margin-top: 8px;
  font-size: 13.5px;
  color: var(--ink-2);
}

.claimed .claimed-meta {
  font-size: 12px;
  color: var(--ink-3);
  line-height: 1.7;
}

.privacy {
  margin-top: 18px;
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}

.report-foot {
  padding: 44px 8px 0;
  display: grid;
  gap: 5px;
  font-size: 11.5px;
  color: var(--ink-3);
  text-align: center;
  line-height: 1.8;
}

.shot-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(20, 19, 16, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.shot-panel {
  width: 100%;
  max-width: 640px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--surface);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
}

.shot-hint {
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
}

.shot-frame {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 12px;
  background: var(--paper);
  text-align: center;
}

.shot-frame img {
  display: block;
  width: 100%;
  height: auto;
}

.shot-actions {
  display: flex;
  gap: 10px;
}

.shot-actions .btn {
  flex: 1;
  text-align: center;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}

@media (max-width: 680px) {
  .bar {
    padding: 18px 20px;
  }

  .wrap {
    padding: 0 12px 48px;
  }

  .sheet {
    border-radius: 18px;
    padding: 32px 22px 14px;
  }

  .claim-card {
    padding: 28px 22px;
    border-radius: 18px;
  }

  .claim-card h2 {
    font-size: 21px;
  }

  .actions .btn {
    font-size: 12px;
    padding: 0 8px;
  }
}

@media print {
  .bar,
  .claim-section,
  .report-foot {
    display: none;
  }

  .report-page {
    background: #fff;
  }

  .wrap {
    padding: 0;
    max-width: none;
  }

  .sheet {
    border: 0;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
  }
}
</style>
