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

// 当前游戏（含 image/gallery 字段，供 hero 背景与空态景观带使用）
const activeGame = computed(
  () => props.store.games.value.find((g) => g.id === props.store.activeGameId.value) ?? null
)

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

// 首屏主操作：平滑滚动到地区卡片区
function scrollToCards() {
  document.querySelector('.region-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const overallPercent = computed(() => {
  const { done, total } = props.store.overall.value
  return total ? Math.round((done / total) * 100) : 0
})

// 首屏副文：原神保留「提瓦特」表述，其他游戏用通用说法
const heroSub = computed(() => {
  if (activeGame.value?.id === 'genshin') {
    return '记录提瓦特每一块土地的探索进度。游客可直接录入自己的进度（保存在本机）；主人解锁后录入，编辑自动保存到云端。'
  }
  const name = activeGame.value?.name ?? '米游'
  return `记录${name}每一块地图的探索进度。游客可直接录入自己的进度（保存在本机）；主人解锁后录入，编辑自动保存到云端。`
})

// 总探索度数字滚动动效（进入页面时 0 → 目标值）
const overallAnim = useCountUp(() => overallPercent.value, 1100)
</script>

<template>
  <section class="hero">
    <div class="hero-media">
      <img
        class="hero-img"
        :src="activeGame?.image ?? '/images/hero.jpg'"
        :alt="`${activeGame?.name ?? '米游'}实景`"
        loading="eager"
      />
    </div>
    <div class="hero-content">
      <h1 class="hero-title">
        <span class="hero-title-line"><span>米游探索度记录</span></span>
      </h1>
      <p class="hero-sub reveal" style="animation-delay: 0.28s">{{ heroSub }}</p>
      <button class="btn btn-primary hero-cta reveal" style="animation-delay: 0.36s" @click="scrollToCards" title="浏览全部地区的探索进度">查看地区进度</button>
    </div>
    <div class="hero-stat reveal" style="animation-delay: 0.44s">
      <div class="hero-stat-value">
        <span class="tnum">{{ overallAnim }}</span><span class="hero-stat-unit">%</span>
      </div>
      <div class="hero-stat-meta tnum">{{ store.overall.value.done }} / {{ store.overall.value.total }} 个地区已完成</div>
      <div class="hero-bar">
        <div class="hero-bar-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
    </div>
  </section>

  <section class="list-head reveal" style="animation-delay: 0.22s">
    <span class="list-count tnum">共 {{ store.sortedRegions.value.length }} 个地区</span>
    <div class="sort-switch">
      <button
        class="sort-btn tnum"
        :class="{ active: store.sortMode.value === 'progress' }"
        @click="store.sortMode.value = 'progress'"
        title="按探索度从低到高排序"
      >
        <PhPercent :size="14" /> 按探索度
      </button>
      <button
        class="sort-btn tnum"
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

  <div class="game-gallery reveal" v-if="!store.sortedRegions.value.length && activeGame?.gallery?.length" style="animation-delay: 0.36s">
    <figure
      v-for="(img, i) in activeGame.gallery"
      :key="i"
      class="game-gallery-card reveal"
      :style="{ '--shot-img': `url('${img}')`, animationDelay: (0.4 + i * 0.08) + 's' }"
    >
      <figcaption>{{ activeGame.name }} · 世界景观 {{ i + 1 }}</figcaption>
    </figure>
  </div>

  <footer class="data-note reveal" style="animation-delay: 0.6s">
    <div class="note-item">
      <p><strong>数据来源</strong>：目标数量（宝箱 / 限时挑战 / 仙灵 / 雷灵 / 幻写灵）以 B 站攻略博主「你的影月月」的全收集攻略为准，截至 7.1 版本。</p>
    </div>
    <div class="note-item">
      <p><strong>账号 UID 212114083</strong>：已搜集进度数据来自该原神账号（游戏内成就「总计」口径）。</p>
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
  min-height: clamp(200px, 30vh, 300px);
  padding: var(--sp-7) var(--sp-8);
  margin-bottom: var(--sp-6);
  border-radius: var(--r-lg);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-2);
}
/* 签名时刻：hero 实景从底部揭开（shutter）+ 图内慢速 kenburns */
.hero-media {
  position: absolute;
  inset: 0;
  overflow: hidden;
  clip-path: inset(0 0 100% 0);
  animation: shutter-in 1.1s var(--ease) forwards;
}
@keyframes shutter-in {
  to {
    clip-path: inset(0);
  }
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 55%;
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
  z-index: 1;
  /* 图片上的中性压字 scrim（house rule 唯一允许的渐变）taste-skill-ignore */
  background: linear-gradient( /* taste-skill-ignore */
    100deg,
    rgba(10, 11, 13, 0.96) 0%,
    rgba(10, 11, 13, 0.82) 45%,
    rgba(10, 11, 13, 0.6) 100%
  );
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 640px;
}
.hero-title {
  margin: 0 0 var(--sp-3);
  font-size: var(--fz-display);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
}
/* 标题从基线下方揭起（masked line） */
.hero-title-line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
  margin-bottom: -0.08em;
}
.hero-title-line > span {
  display: block;
  transform: translateY(112%);
  animation: line-up 0.9s var(--ease) forwards;
  animation-delay: 0.15s;
}
@keyframes line-up {
  to {
    transform: translateY(0);
  }
}
.hero-sub {
  margin: 0 0 var(--sp-5);
  max-width: 54ch;
  font-size: var(--fz-base);
  color: var(--text-2);
}
.hero-cta {
  align-self: flex-start;
}
/* 数字区直接压图（去卡片底，更接近 2026 海报式 hero） */
.hero-stat {
  position: relative;
  z-index: 2;
  justify-self: end;
  min-width: 300px;
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
}
.hero-stat-unit {
  font-size: var(--fz-xl);
  color: var(--gold);
}
.hero-stat-meta {
  font-size: var(--fz-sm);
  color: var(--text-2);
  margin-bottom: var(--sp-4);
}
.hero-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
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
.empty-regions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-9) var(--sp-6);
  border-radius: var(--r-lg);
  color: var(--text-2);
  text-align: center;
  font-size: var(--fz-sm);
}
.empty-regions p {
  margin: 0;
  max-width: 360px;
  line-height: 1.7;
}

/* 空态游戏世界景观带（该游戏实景，桌面展示） */
.game-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}
.game-gallery-card {
  position: relative;
  margin: 0;
  height: 150px;
  border-radius: var(--r-md);
  background-image: var(--shot-img, none);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  transition: transform 0.3s var(--ease);
}
.game-gallery-card:hover {
  transform: scale(1.02);
}
/* 景观卡脚注压字 scrim（house rule 唯一允许的渐变）taste-skill-ignore */
.game-gallery-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 11, 13, 0) 55%, rgba(10, 11, 13, 0.8) 100%); /* taste-skill-ignore */
}
.game-gallery-card figcaption {
  position: absolute;
  left: var(--sp-3);
  bottom: var(--sp-2);
  z-index: 1;
  font-size: var(--fz-xs);
  color: var(--text-2);
}
@media (max-width: 720px) {
  .game-gallery {
    display: none;
  }
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
  margin-top: var(--sp-9);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-md);
  background: var(--bg-2);
  font-size: var(--fz-base);
  color: var(--text-2);
}
.note-item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-4);
}
.note-item p {
  margin: 0;
  max-width: 70ch;
  line-height: 1.6;
}
.note-item strong {
  color: var(--text-1);
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
