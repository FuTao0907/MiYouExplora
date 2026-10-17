<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PhListBullets, PhMapTrifold, PhPercent } from '@phosphor-icons/vue'
import RegionCard from '../components/RegionCard.vue'
import { useCountUp } from '../composables/useCountUp.js'

const props = defineProps({
  store: { type: Object, required: true }
})

const route = useRoute()
const router = useRouter()

// 路由驱动游戏：进入 /game/:gameId 时切换到对应游戏
watch(
  () => route.params.gameId,
  (id) => {
    if (typeof id === 'string' && id) props.store.setActiveGame(id)
  },
  { immediate: true }
)

function openRegion(id) {
  router.push(`/game/${props.store.activeGameId.value}/region/${id}`)
}

const overallPercent = computed(() => {
  const { done, total } = props.store.overall.value
  return total ? Math.round((done / total) * 100) : 0
})

// 总探索度数字滚动动效（进入页面时 0 → 目标值）
const overallAnim = useCountUp(() => overallPercent.value, 1100)
</script>

<template>
  <section class="hero">
    <div class="hero-content reveal">
      <p class="hero-eyebrow mono">{{ (store.activeGame.value?.name ?? 'GENSHIN') }} · PERSONAL TRACKER</p>
      <h1 class="hero-title">米游探索度记录</h1>
      <p class="hero-sub">记录提瓦特每一块土地的探索进度。游客可直接录入自己的进度（保存在本机）；主人解锁后录入，编辑自动保存到云端。</p>
    </div>
    <div class="hero-stat reveal" style="animation-delay: 0.14s">
      <div class="hero-stat-label mono">OVERALL PROGRESS</div>
      <div class="hero-stat-value">
        <span class="mono">{{ overallAnim }}</span><span class="hero-stat-unit">%</span>
      </div>
      <div class="hero-stat-meta mono">{{ store.overall.value.done }} / {{ store.overall.value.total }} 个地区已完成</div>
      <div class="hero-bar">
        <div class="hero-bar-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
    </div>
  </section>

  <section class="list-head reveal" style="animation-delay: 0.22s">
    <span class="list-count">共 {{ store.sortedRegions.value.length }} 个地区</span>
    <div class="sort-switch">
      <button
        class="sort-btn mono"
        :class="{ active: store.sortMode.value === 'progress' }"
        @click="store.sortMode.value = 'progress'"
        title="按探索度从低到高排序"
      >
        <PhPercent :size="14" /> 按探索度
      </button>
      <span class="sort-sep"></span>
      <button
        class="sort-btn mono"
        :class="{ active: store.sortMode.value === 'order' }"
        @click="store.sortMode.value = 'order'"
        title="按区域顺序排序"
      >
        <PhListBullets :size="14" /> 按区域顺序
      </button>
    </div>
  </section>

  <main class="region-grid" v-if="store.sortedRegions.value.length">
    <RegionCard
      v-for="(region, i) in store.sortedRegions.value"
      :key="region.id"
      :region="region"
      :index="i"
      :progress="store.displayProgress.value"
      class="reveal"
      :style="{ animationDelay: (0.26 + i * 0.08) + 's' }"
      @edit="openRegion"
    />
  </main>

  <div class="empty-regions reveal" style="animation-delay: 0.3s" v-else>
    <PhMapTrifold :size="22" />
    <p>该游戏还没有地区数据。等主人配置好 games.json 并重新部署后，这里就会出现探索进度卡片。</p>
  </div>

  <footer class="data-note reveal" style="animation-delay: 0.6s">
    <div class="note-item">
      <span class="mono">DATA SOURCE</span>
      <p>目标数量（宝箱 / 限时挑战 / 仙灵 / 雷灵 / 幻写灵）以 B 站攻略博主「你的影月月」的全收集攻略为准，截至 7.1 版本。</p>
    </div>
    <div class="note-item">
      <span class="mono">PLAYER UID</span>
      <p>已搜集进度数据来自原神账号 <strong>212114083</strong>（游戏内成就「总计」口径）。</p>
    </div>
  </footer>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: var(--sp-7);
  align-items: center;
  min-height: 280px;
  padding: var(--sp-9) var(--sp-8);
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
  animation: kenburns 16s ease-in-out infinite alternate;
}
@keyframes kenburns {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.08);
  }
}
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    100deg,
    rgba(10, 11, 13, 0.96) 0%,
    rgba(10, 11, 13, 0.84) 45%,
    rgba(10, 11, 13, 0.66) 100%
  );
}
.hero-eyebrow {
  margin: 0 0 var(--sp-3);
  font-size: var(--fz-xs);
  color: var(--text-3);
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
.region-toolbar input {
  display: none;
}
.hero-stat {
  background: rgba(10, 11, 13, 0.6);
  backdrop-filter: blur(12px);
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
  gap: 4px;
  line-height: 1;
  margin-bottom: var(--sp-2);
}
.hero-stat-value span {
  font-size: var(--fz-hero);
  font-weight: 700;
  color: var(--gold-bright);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 40px rgba(242, 221, 176, 0.18);
}
.hero-stat-unit {
  font-size: var(--fz-xl);
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

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-4);
}
.list-count {
  font-size: var(--fz-sm);
  color: var(--text-3);
  letter-spacing: 0.06em;
}
.sort-switch {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: var(--sp-1) var(--sp-2);
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.06em;
  transition: var(--t);
  border-radius: var(--r-sm);
}
.sort-btn:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}
.sort-btn.active {
  color: var(--text-1);
}
.sort-sep {
  width: 1px;
  height: 14px;
  background: var(--line-strong);
}

.empty-regions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-9) var(--sp-6);
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  color: var(--text-3);
  text-align: center;
  font-size: var(--fz-sm);
}
.empty-regions p {
  margin: 0;
  max-width: 360px;
  line-height: 1.7;
}

.region-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--sp-5);
}

.data-note {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-top: var(--sp-8);
  padding: var(--sp-4) var(--sp-5);
  border-top: 1px solid var(--line);
  font-size: var(--fz-xs);
  color: var(--text-3);
}
.note-item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-4);
}
.note-item .mono {
  color: var(--text-3);
  letter-spacing: 0.2em;
  white-space: nowrap;
}
.note-item p {
  margin: 0;
  line-height: 1.6;
}
.note-item strong {
  color: var(--text-2);
  font-weight: 600;
}

@media (max-width: 720px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: 0;
    padding: var(--sp-6) var(--sp-5);
  }
  .note-item {
    flex-direction: column;
    gap: var(--sp-1);
  }
}
</style>
