<script setup>
import { computed } from 'vue'
import RegionCard from '../components/RegionCard.vue'
import { importProgress } from '../api/data.js'

const props = defineProps({
  store: { type: Object, required: true }
})
const emit = defineEmits(['edit'])

const overallPercent = computed(() => {
  const { done, total } = props.store.overall.value
  return total ? Math.round((done / total) * 100) : 0
})

function handleExport() {
  props.store.exportProgress(props.store.progress.value)
}

function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  importProgress(file)
    .then((data) => {
      props.store.applyImported(data)
      alert('导入成功')
    })
    .catch((err) => alert(err.message))
  event.target.value = ''
}
</script>

<template>
  <section class="hero">
    <div class="hero-content reveal">
      <p class="hero-eyebrow mono">GENSHIN IMPACT · PERSONAL TRACKER</p>
      <h1 class="hero-title">米游探索度记录</h1>
      <p class="hero-sub">记录提瓦特每一块土地的探索进度。个人使用 · 默认只读，解锁后录入，编辑自动保存到云端。</p>
      <div class="hero-actions">
        <button class="btn btn-primary" :disabled="!store.editable.value" @click="handleExport">导出 progress.json</button>
        <label class="btn btn-ghost" :class="{ 'is-disabled': !store.editable.value }">
          导入 JSON
          <input type="file" accept="application/json,.json" :disabled="!store.editable.value" @change="handleImport" />
        </label>
      </div>
    </div>
    <div class="hero-stat reveal" style="animation-delay: 0.12s">
      <div class="hero-stat-label mono">OVERALL</div>
      <div class="hero-stat-value">
        <span class="mono">{{ overallPercent }}</span><span class="hero-stat-unit">%</span>
      </div>
      <div class="hero-stat-meta mono">{{ store.overall.value.done }}/{{ store.overall.value.total }} 个地区已完成</div>
      <div class="hero-bar">
        <div class="hero-bar-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
    </div>
  </section>

  <section class="game-switch reveal" v-if="store.games.value.length > 1" style="animation-delay: 0.18s">
    <button
      v-for="game in store.games.value"
      :key="game.id"
      class="game-tab"
      :class="{ active: game.id === store.activeGameId.value }"
      @click="store.activeGameId.value = game.id"
    >
      {{ game.name }}
    </button>
  </section>

  <section class="list-head reveal" style="animation-delay: 0.22s">
    <span class="list-count mono">{{ store.sortedRegions.value.length }} REGIONS</span>
    <div class="sort-switch">
      <button
        class="sort-btn mono"
        :class="{ active: store.sortMode.value === 'progress' }"
        @click="store.sortMode.value = 'progress'"
      >按探索度</button>
      <button
        class="sort-btn mono"
        :class="{ active: store.sortMode.value === 'order' }"
        @click="store.sortMode.value = 'order'"
      >按区域顺序</button>
    </div>
  </section>

  <main class="region-grid" v-if="store.sortedRegions.value.length">
    <RegionCard
      v-for="(region, i) in store.sortedRegions.value"
      :key="region.id"
      :region="region"
      :index="i"
      :progress="store.progress.value"
      class="reveal"
      :style="{ animationDelay: (0.26 + i * 0.08) + 's' }"
      @edit="(id) => emit('edit', id)"
    />
  </main>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--sp-7);
  align-items: center;
  padding: var(--sp-8) var(--sp-7);
  margin-bottom: var(--sp-7);
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-2);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: url('/images/hero.jpg');
  background-size: cover;
  background-position: center 60%;
}
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    100deg,
    rgba(11, 17, 29, 0.92) 0%,
    rgba(11, 17, 29, 0.78) 45%,
    rgba(11, 17, 29, 0.55) 100%
  );
}
.hero-eyebrow {
  margin: 0 0 var(--sp-3);
  font-size: var(--fz-xs);
  color: var(--gold);
  letter-spacing: 0.2em;
}
.hero-title {
  margin: 0 0 var(--sp-3);
  font-size: var(--fz-display);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
}
.hero-sub {
  margin: 0 0 var(--sp-6);
  max-width: 480px;
  font-size: var(--fz-base);
  color: var(--text-2);
}
.hero-actions {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.hero-actions input {
  display: none;
}
.hero-actions .is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.hero-stat {
  background: rgba(11, 17, 29, 0.55);
  backdrop-filter: blur(10px);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  padding: var(--sp-6);
}
.hero-stat-label {
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.2em;
  margin-bottom: var(--sp-2);
}
.hero-stat-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  line-height: 1;
  margin-bottom: var(--sp-1);
}
.hero-stat-value span {
  font-size: var(--fz-display);
  font-weight: 700;
  color: var(--gold-bright);
}
.hero-stat-unit {
  font-size: var(--fz-lg);
  color: var(--gold);
}
.hero-stat-meta {
  font-size: var(--fz-xs);
  color: var(--text-2);
  margin-bottom: var(--sp-4);
}
.hero-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.hero-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--gold);
  transition: width 0.4s var(--ease);
}

.game-switch {
  display: flex;
  gap: var(--sp-2);
  margin-bottom: var(--sp-6);
}
.game-tab {
  padding: var(--sp-2) var(--sp-5);
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: var(--fz-base);
  transition: var(--t);
}
.game-tab:hover {
  color: var(--text-1);
  border-color: var(--line-strong);
}
.game-tab.active {
  color: #1a150a;
  background: var(--gold);
  border-color: var(--gold);
  font-weight: 600;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-4);
}
.list-count {
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.2em;
}
.sort-switch {
  display: flex;
  gap: var(--sp-1);
}
.sort-btn {
  padding: var(--sp-1) var(--sp-3);
  border-radius: 999px;
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.06em;
  transition: var(--t);
}
.sort-btn:hover {
  color: var(--text-1);
}
.sort-btn.active {
  color: var(--gold);
  background: var(--gold-tint);
}

.region-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--sp-5);
}

@media (max-width: 720px) {
  .hero {
    grid-template-columns: 1fr;
    padding: var(--sp-6) var(--sp-5);
  }
}
</style>
