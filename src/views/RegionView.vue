<script setup>
import { computed, ref } from 'vue'
import { regionPercent, getStatus, STATUS } from '../utils/status.js'

const props = defineProps({
  store: { type: Object, required: true },
  regionId: { type: String, required: true }
})
const emit = defineEmits(['back'])

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
  region.value ? regionPercent(region.value, props.store.progress.value) : 0
)
const status = computed(() =>
  region.value ? getStatus(region.value, props.store.progress.value) : STATUS.NOT_STARTED
)

const doneLabel = (item) => (item.name === '宝箱' ? '已搜集' : '已完成')

const heroStyle = computed(() =>
  region.value?.image ? { '--hero-bg': `url('${region.value.image}')` } : {}
)

function valueOf(areaId, itemId) {
  return (
    props.store.progress.value.regions?.[props.regionId]?.areas?.[areaId]?.items?.[itemId] ?? 0
  )
}

function handleInput(areaId, itemId, event) {
  const raw = event.target.value
  const n = raw === '' ? 0 : Number(raw)
  if (!Number.isFinite(n)) return
  const area = areas.value.find((a) => a.id === areaId)
  const max = maxOf(area, itemId)
  props.store.saveAreaItem(props.regionId, areaId, itemId, Math.min(Math.max(0, n), max))
}

function handleExport() {
  props.store.exportProgress(props.store.progress.value)
}

// 展开行：子区域描述
const expanded = ref({})
function toggleExpand(areaId) {
  expanded.value = { ...expanded.value, [areaId]: !expanded.value[areaId] }
}
function noteOf(areaId) {
  return props.store.progress.value.regions?.[props.regionId]?.areas?.[areaId]?.note ?? ''
}
function handleNoteInput(areaId, event) {
  props.store.saveAreaNote(props.regionId, areaId, event.target.value)
}
</script>

<template>
  <div v-if="region">
    <section class="region-hero reveal" :style="heroStyle">
      <div class="region-hero-content">
        <button class="btn btn-ghost" @click="emit('back')">
          <span aria-hidden="true">←</span> 返回
        </button>
        <div class="region-title">
          <h1 class="region-title-text">{{ region.name }}</h1>
          <span class="badge" :class="status">{{ status }} · {{ percent }}%</span>
        </div>
        <div class="region-targets mono" v-if="hasTargets">
          <template v-for="item in itemDefs" :key="item.id">
            <span class="rt-item" v-if="regionTargets[item.id]">{{ item.name }} {{ regionTargets[item.id] }}</span>
          </template>
        </div>
        <button class="btn btn-primary" :disabled="!store.editable.value" @click="handleExport">导出 progress.json</button>
      </div>
    </section>

    <p class="region-hint reveal" v-if="!hasTargets" style="animation-delay: 0.06s">
      分项目标数量（games.json 中地区 targets）尚未配置，配置后即可录入已搜集数量；探索度将按板块目标完成比例自动计算。
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
                  class="expand-btn mono"
                  :class="{ open: expanded[area.id] }"
                  @click="toggleExpand(area.id)"
                  :aria-label="`展开${area.name}描述`"
                >▸</button>
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
                    type="number"
                    min="0"
                    :max="maxOf(area, item.id) || undefined"
                    :disabled="!store.editable.value"
                    :value="valueOf(area.id, item.id)"
                    @input="handleInput(area.id, item.id, $event)"
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
  padding: var(--sp-6) var(--sp-6);
  min-height: 150px;
  margin-bottom: var(--sp-6);
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-2);
}
.region-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--hero-bg, none);
  background-size: cover;
  background-position: center 40%;
}
.region-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    rgba(11, 17, 29, 0.35) 0%,
    rgba(11, 17, 29, 0.55) 55%,
    rgba(11, 17, 29, 0.94) 100%
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
  align-items: center;
  gap: var(--sp-3);
}
.region-targets {
  display: flex;
  gap: var(--sp-2);
  font-size: var(--fz-xs);
  letter-spacing: 0.06em;
}
.rt-item {
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid var(--line-gold);
  color: var(--gold);
  background: var(--gold-tint);
}
.region-title-text {
  margin: 0;
  font-size: var(--fz-xl);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.region-hint {
  background: var(--gold-tint);
  border: 1px solid var(--line-gold);
  color: var(--gold-bright);
  border-radius: var(--r-sm);
  padding: var(--sp-3) var(--sp-4);
  font-size: var(--fz-sm);
  margin: 0 0 var(--sp-5);
}

.region-table-wrap {
  background: rgba(16, 24, 40, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow-x: auto;
  box-shadow: var(--shadow-card);
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
  font-size: var(--fz-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--gold);
  background: rgba(211, 188, 142, 0.06);
  font-family: var(--font-sans);
}
.region-table tbody tr {
  transition: background 0.15s var(--ease);
}
.region-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
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
  background: rgba(11, 17, 29, 0.6);
  color: var(--text-1);
  font-size: var(--fz-base);
  font-family: var(--font-sans);
  text-align: right;
  transition: var(--t);
  font-variant-numeric: tabular-nums;
}
.cell-input:focus-visible {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 3px var(--gold-tint);
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
  font-size: var(--fz-sm);
  line-height: 1;
  transition: var(--t);
  cursor: pointer;
}
.expand-btn:hover {
  color: var(--gold);
  border-color: var(--line-gold);
}
.expand-btn.open {
  transform: rotate(90deg);
  color: var(--gold);
  border-color: var(--line-gold);
}
.note-row td {
  background: rgba(211, 188, 142, 0.04);
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
  background: rgba(11, 17, 29, 0.6);
  color: var(--text-1);
  font-size: var(--fz-base);
  line-height: 1.6;
  resize: vertical;
  font-family: var(--font-sans);
  transition: var(--t);
}
.note-input:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 3px var(--gold-tint);
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
</style>
