<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import { regionPercent, getStatus, STATUS } from '../utils/status.js'
import { parseItemInput, sanitizeInputText } from '../utils/guestData.js'
import { useCountUp } from '../composables/useCountUp.js'

const props = defineProps({
  store: { type: Object, required: true },
  regionId: { type: String, required: true }
})
const router = useRouter()

// 返回地区总览（走路由：/game/:gameId）
function goBack() {
  router.push(`/game/${gameId.value}`)
}

const gameId = computed(() => props.store.activeGameId.value)
const region = computed(
  () => props.store.regions.value.find((r) => r.id === props.regionId) ?? null
)
const areas = computed(() => region.value?.areas ?? [])

// 分项定义取第一个子区域（各子区域分项结构一致，仅用于表头）
const itemDefs = computed(() => areas.value[0]?.items ?? [])

// 某子区域对应分项定义（target 以该子区域自身为准）
function areaItem(area, itemId) {
  return area?.items.find((i) => i.id === itemId)
}

// 地区板块目标（权威统计，探索度分母）
const regionTargets = computed(() => region.value?.targets ?? {})

// 录入上限：以该子区域自身 target 为准（成就章节口径下每个分项都有确定数；
// target 为 0 表示该章节没有此分项，禁止录入——不再回退地区板块目标）
function maxOf(area, itemId) {
  return areaItem(area, itemId)?.target || 0
}

const hasTargets = computed(() =>
  Object.values(regionTargets.value).some((t) => t > 0)
)

const percent = computed(() =>
  region.value ? regionPercent(region.value, props.store.displayProgress.value) : 0
)
// 地区探索度数字滚动动效
const animPercent = useCountUp(() => percent.value, 900)
const status = computed(() =>
  region.value ? getStatus(region.value, props.store.displayProgress.value) : STATUS.NOT_STARTED
)

const doneLabel = (item) => (item.name === '宝箱' ? '已搜集' : '已完成')

// 地区景观带：直接使用该地区 3 张不同的实景图（games.json 的 region.gallery）
const galleryShots = computed(() => region.value?.gallery ?? [])

// ---- 单格输入（text 输入 + 上下限校验；-1 表示「无/不适用」） ----
// 编辑草稿：key = areaId|itemId → 输入框当前文本（未 blur 前原样显示）
const drafts = ref({})
const keyOf = (areaId, itemId) => `${areaId}|${itemId}`

function valueOf(areaId, itemId) {
  const v =
    props.store.displayProgress.value.regions?.[props.regionId]?.areas?.[areaId]?.items?.[itemId] ?? 0
  return v
}

// 输入框显示文本：编辑中显示草稿原文；否则显示保存值（-1 显示为 -1）
function cellText(areaId, itemId) {
  const k = keyOf(areaId, itemId)
  if (drafts.value[k] !== undefined) return drafts.value[k]
  const v = valueOf(areaId, itemId)
  return v === -1 ? '-1' : String(v)
}

// 输入中：过滤非法字符 → 存草稿 → 可解析则立即保存（合法值 0..max / -1）
function onCellInput(areaId, itemId, event) {
  const raw = sanitizeInputText(event.target.value)
  const k = keyOf(areaId, itemId)
  drafts.value = { ...drafts.value, [k]: raw }
  const area = areas.value.find((a) => a.id === areaId)
  const max = maxOf(area, itemId)
  const n = parseItemInput(raw, max)
  if (n !== null) {
    props.store.saveAreaItem(gameId.value, props.regionId, areaId, itemId, n)
  }
}

// 失焦：草稿收敛（超上限→max、<-1→-1、空→0）并保存，随后回到保存值显示
function onCellBlur(areaId, itemId) {
  const k = keyOf(areaId, itemId)
  const raw = drafts.value[k]
  if (raw === undefined) return
  const area = areas.value.find((a) => a.id === areaId)
  const max = maxOf(area, itemId)
  const n = parseItemInput(raw, max)
  if (n !== null) {
    props.store.saveAreaItem(gameId.value, props.regionId, areaId, itemId, n)
  }
  const next = { ...drafts.value }
  delete next[k]
  drafts.value = next
}

// 展开行：子区域描述
const expanded = ref({})
function toggleExpand(areaId) {
  expanded.value = { ...expanded.value, [areaId]: !expanded.value[areaId] }
}
function noteOf(areaId) {
  return (
    props.store.displayProgress.value.regions?.[props.regionId]?.areas?.[areaId]?.note ?? ''
  )
}
function handleNoteInput(areaId, event) {
  props.store.saveAreaNote(gameId.value, props.regionId, areaId, event.target.value)
}
</script>

<template>
  <div v-if="region">
    <section class="region-hero reveal">
      <img
        v-if="region.image"
        class="region-hero-img"
        :src="region.image"
        :alt="`${region.name}实景`"
        loading="eager"
      />
      <div class="region-hero-content">
        <button class="back-link btn btn-ghost reveal" style="animation-delay: 0.06s" @click="goBack" title="返回地区总览">
          <PhCaretLeft :size="15" /> 返回总览
        </button>
        <div class="region-title reveal" style="animation-delay: 0.12s">
          <h1 class="region-title-text">{{ region.name }}</h1>
          <span class="region-percent tnum" :class="{ done: status === STATUS.COMPLETED }">
            {{ animPercent }}%
          </span>
        </div>
        <div class="region-targets tnum reveal" style="animation-delay: 0.18s" v-if="hasTargets">
          <template v-for="item in itemDefs" :key="item.id">
            <span class="rt-item" v-if="regionTargets[item.id]">{{ item.name }} {{ regionTargets[item.id] }}</span>
          </template>
        </div>
      </div>
    </section>

    <div class="region-gallery reveal" v-if="galleryShots.length" style="animation-delay: 0.08s">
      <figure
        v-for="(img, i) in galleryShots"
        :key="i"
        class="gallery-card reveal"
        :style="{ '--shot-img': `url('${img}')`, animationDelay: (0.1 + i * 0.07) + 's' }"
      >
        <figcaption>{{ region.name }} · 景观 {{ i + 1 }}</figcaption>
      </figure>
    </div>

    <p class="region-hint reveal" v-if="!hasTargets" style="animation-delay: 0.06s">
      分项目标数量（games.json 中地区 targets）尚未配置，配置后即可录入已搜集数量；探索度将按板块目标完成比例自动计算。
    </p>

    <p class="region-legend mono reveal" style="animation-delay: 0.06s">
      金色数字为参考（主人已搜集）；输入 <strong>-1</strong> 表示该分项对你不适用 / 没有（不参与探索度，也不计入完成）。
    </p>

    <div class="region-table-wrap reveal" style="animation-delay: 0.1s">
      <table class="region-table">
        <thead>
          <tr>
            <th class="col-expand"></th>
            <th class="col-name">子区域名称</th>
            <template v-for="item in itemDefs" :key="item.id">
              <th class="col-num">{{ item.name }}总数</th>
              <th class="col-num">{{ doneLabel(item) }}</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <template v-for="area in areas" :key="area.id">
            <tr>
              <td class="col-expand">
                <button
                  class="expand-btn"
                  :class="{ open: expanded[area.id] }"
                  @click="toggleExpand(area.id)"
                  :aria-label="`展开${area.name}描述`"
                  :title="expanded[area.id] ? '收起说明' : '展开范围说明与备注'"
                >
                  <PhCaretRight :size="14" />
                </button>
              </td>
              <td class="col-name area-name">{{ area.name }}</td>
              <template v-for="item in itemDefs" :key="item.id">
                <td class="col-num">
                  <span v-if="areaItem(area, item.id)?.target" class="mono target-num">{{ areaItem(area, item.id).target }}</span>
                  <span v-else class="target-empty">—</span>
                </td>
                <td class="col-num">
                  <input
                    class="cell-input mono"
                    :class="{ 'cell-ref': store.isReferenceShown(gameId, region.id, area.id, item.id) }"
                    type="text"
                    inputmode="numeric"
                    :disabled="!areaItem(area, item.id)?.target"
                    :value="cellText(area.id, item.id)"
                    @input="onCellInput(area.id, item.id, $event)"
                    @blur="onCellBlur(area.id, item.id)"
                  />
                </td>
              </template>
            </tr>
            <tr v-if="expanded[area.id]" class="note-row">
              <td :colspan="2 + itemDefs.length * 2">
                <div class="note-wrap">
                  <template v-if="area.description">
                    <div class="note-label mono">范围说明</div>
                    <p class="note-view">{{ area.description }}</p>
                  </template>
                  <div class="note-label mono">备注</div>
                  <textarea
                    v-if="store.editable.value"
                    class="note-input"
                    :value="noteOf(area.id)"
                    @input="handleNoteInput(area.id, $event)"
                    rows="2"
                    placeholder="记录该章节的备注，如剩余宝箱位置、任务进度…"
                  ></textarea>
                  <p v-else class="note-view" :class="{ empty: !noteOf(area.id) }">{{ noteOf(area.id) || '暂无备注' }}</p>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.region-hero {
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: var(--sp-7) var(--sp-7);
  min-height: clamp(280px, 36vw, 380px);
  margin-bottom: var(--sp-6);
  border-radius: var(--r-lg);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-2);
}
.region-hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 40%;
  z-index: -1;
  animation: hero-pan 22s ease-in-out infinite alternate;
}
@keyframes hero-pan {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.06);
  }
}
.region-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  /* 地区实景图上的中性压字 scrim（house rule 唯一允许的渐变）taste-skill-ignore */
  background: linear-gradient( /* taste-skill-ignore */
    180deg,
    rgba(10, 11, 13, 0.42) 0%,
    rgba(10, 11, 13, 0.58) 52%,
    rgba(10, 11, 13, 0.94) 100%
  );
}
.region-hero-content {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  width: 100%;
  flex-wrap: wrap;
}
.region-hero .btn-primary {
  margin-left: auto;
}
.region-title {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}
.region-percent {
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 700;
  color: var(--gold-bright);
  line-height: 1;
}
.region-targets {
  display: flex;
  gap: var(--sp-2);
  font-size: var(--fz-sm);
}
.rt-item {
  padding: 2px 10px;
  border-radius: var(--r-sm);
  color: var(--text-1);
  background: rgba(10, 11, 13, 0.5);
}
.region-title-text {
  margin: 0;
  font-size: clamp(34px, 4.5vw, 52px);
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* 地区景观带：同一实景图的三段裁切，桌面展示 */
.region-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
  margin-bottom: var(--sp-6);
}
.gallery-card {
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
.gallery-card:hover {
  transform: scale(1.02);
}
/* 景观卡脚注压字 scrim（house rule 唯一允许的渐变）taste-skill-ignore */
.gallery-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 11, 13, 0) 55%, rgba(10, 11, 13, 0.8) 100%); /* taste-skill-ignore */
}
.gallery-card figcaption {
  position: absolute;
  left: var(--sp-3);
  bottom: var(--sp-2);
  z-index: 1;
  font-size: var(--fz-xs);
  color: var(--text-2);
}
@media (max-width: 720px) {
  .region-gallery {
    display: none;
  }
}

.region-hint {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-2);
  border-radius: var(--r-sm);
  padding: var(--sp-3) var(--sp-4);
  font-size: var(--fz-base);
  margin: 0 0 var(--sp-5);
}

.region-legend {
  margin: 0 0 var(--sp-3);
  font-size: var(--fz-xs);
  color: var(--text-2);
  letter-spacing: 0.03em;
}
.region-legend strong {
  color: var(--text-2);
  font-weight: 600;
}

.region-table-wrap {
  background: var(--bg-2);
  border-radius: var(--r-lg);
  overflow-x: auto;
}
.region-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}
.region-table th,
.region-table td {
  padding: var(--sp-3) var(--sp-4);
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  white-space: nowrap;
}
.region-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  font-size: var(--fz-sm);
  font-weight: 600;
  color: var(--text-2);
  background: var(--bg-2);
  font-family: var(--font-sans);
}
.region-table tbody tr {
  transition: background 0.15s var(--ease);
}
.region-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}
.region-table tbody tr:last-child td {
  border-bottom: none;
}
.col-name {
  font-size: var(--fz-base);
  min-width: 130px;
}
.col-num {
  text-align: right;
  font-size: var(--fz-base);
  font-variant-numeric: tabular-nums;
}
.area-name {
  font-weight: 600;
  color: var(--text-1);
}
.target-num {
  color: var(--text-2);
  letter-spacing: 0.04em;
}
.target-empty {
  color: var(--text-3);
}
.cell-input {
  width: 78px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--r-sm);
  background: rgba(10, 11, 13, 0.55);
  color: var(--text-1);
  font-size: var(--fz-base);
  text-align: right;
  transition: var(--t);
  font-variant-numeric: tabular-nums;
}
.cell-input.cell-ref {
  border-color: var(--line-gold);
  background: rgba(211, 188, 142, 0.08);
  color: var(--gold-bright);
}
.cell-input:focus-visible {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1); /* 输入框 focus ring taste-skill-ignore */
}
.cell-input:disabled {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-3);
  border-color: transparent;
  cursor: not-allowed;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.col-expand {
  width: 36px;
  text-align: center;
}
.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-3);
  line-height: 1;
  transition: var(--t);
  cursor: pointer;
}
.expand-btn:hover {
  color: var(--text-1);
  border-color: rgba(255, 255, 255, 0.28);
}
.expand-btn.open {
  transform: rotate(90deg);
  color: var(--text-1);
  border-color: rgba(255, 255, 255, 0.28);
}
.note-row td {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.note-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.note-label {
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.14em;
}
.note-input {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--r-sm);
  background: rgba(10, 11, 13, 0.55);
  color: var(--text-1);
  font-size: var(--fz-base);
  line-height: 1.6;
  resize: vertical;
  font-family: var(--font-sans);
  transition: var(--t);
}
.note-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1); /* 输入框 focus ring taste-skill-ignore */
}
.note-view {
  margin: 0;
  font-size: var(--fz-base);
  color: var(--text-1);
  line-height: 1.6;
  white-space: pre-wrap;
}
.note-view.empty {
  color: var(--text-3);
  font-style: italic;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  font-size: var(--fz-sm);
  color: var(--text-2);
  transition: var(--t);
  margin-bottom: var(--sp-3);
}
.back-link:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.06);
}
</style>
