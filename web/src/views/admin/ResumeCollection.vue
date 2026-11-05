<template>
  <div class="resume-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">简历</p>
        <h1 class="page-title">简历收集</h1>
      </div>
    </header>

    <section class="card empty">
      <p class="empty-title">还没有收集到简历</p>
      <p class="quiet">收进来的简历会按时间显示在这里，方便集中查看和修改。</p>
    </section>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 26px;
}

.page-title {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.empty-title {
  margin-bottom: 8px;
  font-size: 15px;
  color: var(--ink);
}
</style>
