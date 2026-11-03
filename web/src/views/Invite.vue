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
        你离想去的工作，<br class="wide-break" />还差哪几步
      </h1>

      <p class="lede">
        不是通用建议。填完，报告会按你自己的
        <em>目标城市、理想岗位和期望月薪</em>，
        告诉你已经有哪些优势，现在缺什么。
      </p>

      <section class="outcome">
        <p class="outcome-label">你会拿到什么</p>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>你手上已经有的牌</h3>
              <p>三项能直接写进简历、讲进面试的优势</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>离目标岗位还缺什么</h3>
              <p>按这个薪资区间看重的门槛，指出最直接的短板</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>接下来 30 天先做哪三件事</h3>
              <p>能验证，不需要花钱，也不用先想清楚四年规划</p>
            </div>
          </li>
        </ol>
      </section>

      <dl class="facts">
        <div>
          <dt>用时</dt>
          <dd>约 {{ invite.survey.estimatedMinutes }} 分钟</dd>
        </div>
        <div>
          <dt>题量</dt>
          <dd>{{ invite.survey.questions.length }} 道</dd>
        </div>
        <div>
          <dt>方式</dt>
          <dd>凭第一反应选</dd>
        </div>
      </dl>

      <p class="hint">
        最后会问你的优先方向、半年目标和首选城市；城市和岗位选填，写了报告就按这个方向对照。
      </p>

      <p class="intro">
        <span v-for="line in introLines" :key="line">{{ line }}</span>
      </p>

      <button class="btn start" type="button" @click="start">
        开始填写
      </button>

      <p class="privacy">
        答案只用于生成这份报告；生成时会调用 AI 分析，不发送姓名和联系方式
        <br />
        这不是心理测验，也不预测任何结果
      </p>
    </main>

    <footer class="foot">
      <span>© {{ year }}</span>
      <span>答案只有你和发链接的人能看到</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, track, type InvitePayload } from '@/api'

const route = useRoute()
const router = useRouter()
const token = String(route.params.token ?? '')
const invite = ref<InvitePayload | null>(null)
const loading = ref(true)
const error = ref('')
const year = new Date().getFullYear()

const greeting = computed(() => {
  const name = invite.value?.name?.trim()
  return name ? `${name}，你好` : '你好'
})

const introLines = computed(() =>
  (invite.value?.survey.intro ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
)

onMounted(async () => {
  try {
    invite.value = await api.getInvite(token)
    if (invite.value.submitted && invite.value.reportSlug) {
      router.replace(`/r/${invite.value.reportSlug}`)
    }
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
  padding: 12px 0 48px;
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

.lede {
  margin-top: 22px;
  max-width: 30em;
  font-size: 15px;
  line-height: 1.9;
  color: var(--ink-2);
}

.lede em {
  font-style: normal;
  font-weight: 500;
  color: var(--accent);
}

.intro {
  margin-top: 18px;
  display: grid;
  gap: 4px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-3);
}

.facts {
  margin: 22px 0 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.facts > div {
  padding: 16px 0;
}

.facts > div + div {
  padding-left: 18px;
  border-left: 1px solid var(--line);
}

.facts dt {
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--ink-3);
}

.facts dd {
  margin: 4px 0 0;
  font-size: 13.5px;
  color: var(--ink);
}

.outcome {
  margin-top: 30px;
  padding: 20px 22px 6px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.outcome-label {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}

.outcome ol {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.outcome li {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  padding: 15px 0;
  border-top: 1px solid color-mix(in srgb, var(--accent) 12%, transparent);
}

.outcome li > span {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--accent);
  padding-top: 4px;
}

.outcome h3 {
  font-size: 15px;
  font-weight: 500;
}

.outcome p {
  margin-top: 5px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.hint {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-3);
}

.start {
  margin-top: 30px;
  width: 100%;
  height: 52px;
}

.privacy {
  margin-top: 20px;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--ink-3);
  text-align: center;
}

.foot {
  margin-top: auto;
  padding-top: 40px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 10.5px;
  color: var(--ink-3);
  letter-spacing: 0.03em;
}

@media (max-width: 480px) {
  .wide-break {
    display: none;
  }

  .facts dd {
    font-size: 12.5px;
  }

  .facts > div + div {
    padding-left: 12px;
  }

  .foot {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
