<script setup>
/**
 * 角色图鉴页
 * - 数据：public/data/genshin-characters.json（由 scripts/fetch_characters.py 生成，源：Project Amber）
 * - 图片：实时直链 gi.yatta.moe/assets/UI/（证件照 256²、抽卡立绘 2048×1024）
 * - 加载：数据骨架 / 头像懒加载+骨架+失败重试 / 立绘 modal 加载+失败重试 / 空态
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { PhX, PhArrowClockwise, PhDownloadSimple, PhWarningCircle } from '@phosphor-icons/vue'

const props = defineProps({
  store: { type: Object, required: true },
  gameId: { type: String, default: 'genshin' }
})

// 仅原神有角色图鉴；其他游戏访问此路由时显示空态提示
const isGenshin = computed(() => props.store.activeGameId.value === 'genshin')

const loading = ref(true)
const error = ref('')
const characters = ref([])
const activeElement = ref('全部')
const failed = ref(new Set()) // 头像加载失败的角色 id
const retryTick = ref(0)

const ELEMENTS = ['全部', '冰', '火', '水', '雷', '风', '岩', '草']

// 元素小圆点色（仅数据信号，克制使用）
const ELEMENT_COLOR = {
  冰: '#a5d8f3', 火: '#f3b562', 水: '#7cc4e8', 雷: '#c39bf0',
  风: '#8fd8c0', 岩: '#e0c788', 草: '#a9d08e'
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/data/genshin-characters.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) throw new Error('数据为空')
    characters.value = data
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 非原神游戏不加载原神角色数据，直接显示空态
  if (!isGenshin.value) {
    loading.value = false
    return
  }
  loadData()
})

// ---- 元素筛选 ----
const filtered = computed(() => {
  if (activeElement.value === '全部') return characters.value
  return characters.value.filter((c) => c.element === activeElement.value)
})

// 按国家分组（保持数据文件中的国家顺序）
const groups = computed(() => {
  const map = new Map()
  for (const c of filtered.value) {
    if (!map.has(c.region)) map.set(c.region, [])
    map.get(c.region).push(c)
  }
  return [...map.entries()]
})

const totalCount = computed(() => characters.value.length)

// ---- 头像加载失败 ----
function onAvatarError(c) {
  failed.value.add(c.id)
  // 触发重渲染（Set 不触发响应式，用新 Set 替换）
  failed.value = new Set(failed.value)
}
function retryAvatar(c) {
  failed.value.delete(c.id)
  failed.value = new Set(failed.value)
  retryTick.value++ // 强制刷新 img src（见模板 :key）
}

// ---- 立绘 modal ----
const modal = ref(null) // 当前查看的角色
const modalState = ref('loading') // loading | error | ok
function openModal(c) {
  modal.value = c
  modalState.value = 'loading'
}
function closeModal() {
  modal.value = null
}
function onArtLoaded() {
  modalState.value = 'ok'
}
function onArtError() {
  modalState.value = 'error'
}
function retryArt() {
  modalState.value = 'loading'
  // 通过改变 key 强制重新加载
  artKey.value++
}
const artKey = ref(0)

function onKeydown(e) {
  if (e.key === 'Escape' && modal.value) closeModal()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="gallery reveal">
    <!-- 页头 -->
    <header class="gallery-head">
      <h1 class="gallery-title">角色图鉴</h1>
      <p class="gallery-sub">
        原神全角色证件照与抽卡立绘。图片实时加载自 Project Amber，点击任意角色查看高清立绘。
      </p>
    </header>

    <!-- 数据加载骨架 -->
    <div v-if="loading" class="gallery-loading" aria-busy="true">
      <div class="stat-skeleton"></div>
      <div class="filter-skeleton"></div>
      <div class="grid-skeleton">
        <div v-for="i in 12" :key="i" class="card-skeleton"></div>
      </div>
    </div>

    <!-- 非原神游戏：暂无图鉴 -->
    <div v-else-if="!isGenshin" class="state-box">
      <p>该游戏暂未开放角色图鉴。</p>
      <p class="state-hint">角色图鉴目前仅收录《原神》。</p>
    </div>

    <!-- 数据加载失败 -->
    <div v-else-if="error" class="state-box error" role="alert">
      <p><PhWarningCircle :size="18" /> 角色数据加载失败：{{ error }}</p>
      <p class="state-hint">请确认 public/data/genshin-characters.json 存在且为合法 JSON。</p>
      <button class="btn btn-ghost" @click="loadData" title="重新加载角色数据">
        <PhArrowClockwise :size="14" /> 重试
      </button>
    </div>

    <template v-else>
      <!-- 统计 + 元素筛选（纯文本，无胶囊按钮） -->
      <p class="gallery-stats">
        <span class="tnum">{{ totalCount }}</span> 位角色 · 图片来自
        <a class="ext-link" href="https://gi.yatta.moe" target="_blank" rel="noreferrer" title="Project Amber 数据站，新版本角色自动更新">Project Amber</a>
      </p>

      <nav class="filter-row" aria-label="按元素筛选">
        <button
          v-for="el in ELEMENTS"
          :key="el"
          class="filter-link"
          :class="{ active: el === activeElement }"
          @click="activeElement = el"
          :title="el === '全部' ? '显示全部角色' : '只看' + el + '元素角色'"
        >
          {{ el }}
        </button>
      </nav>

      <!-- 空态 -->
      <div v-if="groups.length === 0" class="state-box">
        <p>没有符合条件的角色。</p>
        <button class="btn btn-ghost" @click="activeElement = '全部'">显示全部</button>
      </div>

      <!-- 国家分组网格 -->
      <section v-for="[region, list] in groups" :key="region" class="region-group">
        <h2 class="region-title">
          {{ region }}
          <span class="region-count tnum">{{ list.length }}</span>
        </h2>
        <div class="char-grid">
          <button
            v-for="(c, i) in list"
            :key="c.id"
            class="char-card"
            :class="{ failed: failed.has(c.id) }"
            :style="{ '--i': i }"
            @click="openModal(c)"
            :title="c.name + '（' + (c.element || '无') + '·' + c.rarity + '星）——点击查看高清立绘'"
          >
            <span class="card-art">
              <!-- 骨架：图片未加载完成时显示 -->
              <span class="card-skeleton-fill"></span>
              <img
                v-if="!failed.has(c.id)"
                :key="'a' + c.id + retryTick"
                :src="c.avatar"
                :alt="c.name + ' 证件照'"
                loading="lazy"
                decoding="async"
                @error="onAvatarError(c)"
                @load="(e) => e.target.classList.add('loaded')"
              />
              <!-- 失败占位 -->
              <span v-else class="card-fallback">
                <PhWarningCircle :size="20" />
                <button class="retry-link" @click.stop="retryAvatar(c)" title="重新加载这张证件照">
                  重试
                </button>
              </span>
              <span class="card-element" v-if="c.element" :style="{ background: ELEMENT_COLOR[c.element] }"></span>
            </span>
            <span class="card-meta">
              <span class="card-name">{{ c.name }}</span>
              <span class="card-info">
                <span class="card-rarity">{{ '★'.repeat(c.rarity) }}</span>
                <span class="card-sub">{{ c.element || '未知' }} · {{ c.weapon || '—' }}</span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <!-- 版权与数据说明 -->
      <footer class="gallery-foot">
        <p>
          角色立绘与证件照版权归米哈游所有，本页面仅作个人记录与学习用途。
          素材实时加载自 Project Amber（gi.yatta.moe），数据随游戏版本更新；个别图片加载失败可点击重试。
        </p>
      </footer>
    </template>

    <!-- 立绘大图 modal（Teleport 到 body：脱离页面动画 transform 的包含块，保证 fixed 相对视口） -->
    <Teleport to="body">
      <div v-if="modal" class="modal-mask" @click.self="closeModal" role="dialog" aria-modal="true" aria-label="角色立绘">
        <div class="modal-panel">
          <button class="modal-close" @click="closeModal" title="关闭（Esc）" aria-label="关闭">
            <PhX :size="20" />
          </button>

          <div class="modal-body" :class="modalState">
            <!-- 加载中：骨架 + 提示 -->
            <template v-if="modalState === 'loading'">
              <div class="art-skeleton"></div>
              <p class="modal-hint">正在加载高清立绘…</p>
            </template>

            <!-- 加载失败：重试 / 打开原图 -->
            <template v-else-if="modalState === 'error'">
              <p><PhWarningCircle :size="18" /> 立绘加载失败</p>
              <p class="modal-hint">可能是网络波动或素材暂不可用，可以重试或直接打开原图链接。</p>
              <div class="modal-actions">
                <button class="btn btn-primary" @click="retryArt" title="重新加载立绘">
                  <PhArrowClockwise :size="14" /> 重试
                </button>
                <a class="text-link" :href="modal.art" target="_blank" rel="noreferrer" title="在新标签页打开立绘原图">
                  <PhDownloadSimple :size="14" /> 打开原图
                </a>
              </div>
            </template>

            <!-- 立绘本体：modal 打开即挂载并开始加载，ok 后才显示 -->
            <img
              v-show="modalState === 'ok'"
              :key="'art' + modal.id + artKey"
              class="modal-art"
              :src="modal.art"
              :alt="modal.name + ' 抽卡立绘'"
              @load="onArtLoaded"
              @error="onArtError"
            />

            <div v-if="modalState === 'ok'" class="modal-info">
              <span class="modal-name">{{ modal.name }}</span>
              <span class="modal-meta" v-if="modal.element">
                <span class="dot" :style="{ background: ELEMENT_COLOR[modal.element] }"></span>
                {{ modal.element }} · {{ modal.rarity }}星 · {{ modal.weapon || '—' }}
              </span>
              <div class="modal-actions">
                <a class="text-link" :href="modal.art" target="_blank" rel="noreferrer" title="在新标签页打开立绘原图（2048×1024）">
                  <PhDownloadSimple :size="14" /> 立绘原图
                </a>
                <a class="text-link" :href="modal.avatar" target="_blank" rel="noreferrer" title="在新标签页打开证件照原图（256×256）">
                  <PhDownloadSimple :size="14" /> 证件照原图
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.gallery {
  display: flex;
  flex-direction: column;
  gap: var(--sp-7);
}

/* ---- 页头 ---- */
.gallery-head {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.gallery-title {
  font-size: var(--fz-xl);
  font-weight: 600;
  letter-spacing: 0.02em;
  margin: 0;
}
.gallery-sub {
  margin: 0;
  max-width: 620px;
  color: var(--text-2);
  font-size: var(--fz-sm);
  line-height: 1.7;
}

/* ---- 统计与筛选 ---- */
.gallery-stats {
  margin: 0;
  color: var(--text-2);
  font-size: var(--fz-sm);
}
.gallery-stats .tnum {
  color: var(--gold-bright);
  font-weight: 600;
}
.ext-link {
  color: var(--text-1);
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.25);
  text-underline-offset: 0.18em;
  transition: text-decoration-color var(--t-fast);
}
.ext-link:hover {
  text-decoration-color: var(--gold);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--sp-5);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.filter-link {
  font-size: var(--fz-base);
  color: var(--text-3);
  padding: var(--sp-1) var(--sp-1);
  transition: color var(--t-fast);
}
.filter-link:hover {
  color: var(--text-1);
}
.filter-link.active {
  color: var(--gold-bright);
  box-shadow: inset 0 -2px 0 var(--gold); /* 当前筛选态：金色下划线 */
}

/* ---- 国家分组 ---- */
.region-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.region-title {
  font-size: var(--fz-lg);
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}
.region-count {
  font-size: var(--fz-sm);
  color: var(--text-3);
  font-weight: 400;
}

/* ---- 角色卡网格 ---- */
.char-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: var(--sp-3);
}
.char-card {
  display: flex;
  flex-direction: column;
  text-align: left;
  background: var(--bg-2);
  border-radius: var(--r-md);
  overflow: hidden;
  border: 1px solid transparent;
  transition: border-color var(--t-fast), background-color var(--t-fast);
  animation: cardIn 0.4s var(--ease) both;
  animation-delay: calc(var(--i, 0) * 22ms);
}
.char-card:hover {
  border-color: var(--line-strong);
  background: var(--bg-3);
}
.char-card:focus-visible {
  outline-offset: 2px;
}
@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none; /* 结束态为 none，避免残留 transform 影响内部 fixed 元素定位 */
  }
}

/* 头像区：方形，图片与骨架叠放 */
.card-art {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--bg-3);
  display: block;
  overflow: hidden;
}
.card-art img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}
.card-art img.loaded {
  opacity: 1;
}
/* 图片加载完成 → 隐藏骨架 */
.card-art:has(img.loaded) .card-skeleton-fill {
  display: none;
}
/* 图片骨架：加载中金色微光脉动（克制的 shimmer） */
.card-skeleton-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, rgba(255, 255, 255, 0.03) 40%, rgba(211, 188, 142, 0.07) 50%, rgba(255, 255, 255, 0.03) 60%); /* 骨架微光 taste-skill-ignore */
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -20% 0;
  }
}
/* 图片加载完成 → 隐藏骨架 */
.card-art:has(img.loaded) .card-skeleton-fill {
  display: none;
}
/* 元素圆点（数据信号，8px） */
.card-element {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(10, 11, 13, 0.7); /* 深色描边，提升在浅色图上的可辨识度 */
}
/* 失败占位 */
.card-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  color: var(--text-3);
  background: var(--bg-3);
}
.retry-link {
  font-size: var(--fz-xs);
  color: var(--text-2);
  padding: 2px 8px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line-strong);
  transition: var(--t-fast);
}
.retry-link:hover {
  color: var(--text-1);
  border-color: rgba(255, 255, 255, 0.3);
}

/* 卡片文字区 */
.card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-2) var(--sp-3) var(--sp-3);
  min-width: 0;
}
.card-name {
  font-size: var(--fz-base);
  font-weight: 600;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-info {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fz-xs);
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
}
.card-rarity {
  color: var(--gold);
  letter-spacing: 0.02em;
  font-size: 11px;
}
.card-sub {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- 页脚 ---- */
.gallery-foot {
  padding-top: var(--sp-6);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.gallery-foot p {
  margin: 0;
  max-width: 720px;
  font-size: var(--fz-xs);
  color: var(--text-3);
  line-height: 1.7;
}

/* ---- 加载骨架（页面级） ---- */
.gallery-loading {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
.stat-skeleton,
.filter-skeleton {
  height: 18px;
  width: 320px;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.05);
}
.filter-skeleton {
  width: 260px;
}
.grid-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: var(--sp-3);
}
.card-skeleton {
  aspect-ratio: 3 / 4;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.04);
}

/* ---- 立绘 modal ---- */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5);
  background: rgba(8, 9, 11, 0.9);
  animation: maskIn 0.2s var(--ease) both;
}
@keyframes maskIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.modal-panel {
  position: relative;
  width: min(1180px, 100%);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  animation: panelIn 0.25s var(--ease) both;
}
@keyframes panelIn {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.modal-close {
  position: absolute;
  top: calc(-1 * var(--sp-6));
  right: 0;
  z-index: 2;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-2);
  border-radius: var(--r-sm);
  transition: var(--t-fast);
}
.modal-close:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.08);
}

.modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  min-height: 320px;
}
.modal-body.loading {
  min-height: 420px;
}
.modal-body.error {
  color: var(--text-2);
  padding: var(--sp-8) var(--sp-6);
  background: var(--bg-2);
  border-radius: var(--r-md);
}
.modal-hint {
  margin: 0;
  font-size: var(--fz-sm);
  color: var(--text-3);
  text-align: center;
}
.modal-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.modal-body.ok .modal-actions {
  margin-left: auto;
}
.modal-art {
  max-width: 100%;
  max-height: 78vh;
  width: auto;
  height: auto;
  border-radius: var(--r-md);
  background: var(--bg-2);
  animation: artIn 0.35s var(--ease) both;
}
@keyframes artIn {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.art-skeleton {
  width: min(900px, 100%);
  aspect-ratio: 2 / 1;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.05);
}

.modal-info {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
  padding: var(--sp-3) 0 0;
}
.modal-name {
  font-size: var(--fz-lg);
  font-weight: 600;
}
.modal-meta {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fz-sm);
  color: var(--text-2);
}
.modal-meta .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 窄屏 */
@media (max-width: 640px) {
  .char-grid {
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: var(--sp-2);
  }
  .card-meta {
    padding: var(--sp-2) var(--sp-2) var(--sp-2);
  }
  .card-name {
    font-size: var(--fz-sm);
  }
  .modal-body.ok .modal-actions {
    margin-left: 0;
  }
}
</style>
