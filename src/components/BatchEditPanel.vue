<script setup>
// 一键修改：集中编辑面板。把所有可修改项聚拢，按地区折叠分组；
// 只收集"改动过的项"，关闭时写入当前模式数据（游客→本机，主人→云端）。
import { ref } from 'vue'
import { PhArrowsIn, PhArrowsOut, PhCaretRight, PhCheck, PhTrash } from '@phosphor-icons/vue'
import { parseItemInput, sanitizeInputText } from '../utils/guestData.js'

const props = defineProps({
  store: { type: Object, required: true }
})
const emit = defineEmits(['close'])

// 草稿：{ "regionId|areaId|itemId": 数字 }，仅记录用户改过的格子
const drafts = ref({})
// 地区折叠状态
const collapsed = ref({})

function keyOf(regionId, areaId, itemId) {
  return `${regionId}|${areaId}|${itemId}`
}

function areaItemDef(regionId, areaId, itemId) {
  const region = props.store.regions.value.find((r) => r.id === regionId)
  return region?.areas?.find((a) => a.id === areaId)?.items?.find((i) => i.id === itemId) ?? null
}

function currentValue(regionId, areaId, itemId) {
  const k = keyOf(regionId, areaId, itemId)
  if (drafts.value[k] !== undefined) return drafts.value[k]
  return (
    props.store.displayProgress.value.regions?.[regionId]?.areas?.[areaId]?.items?.[itemId] ?? 0
  )
}

// 输入：过滤非法字符 → 解析（-1/0..max 合法，超上限收紧到 max）→ 存草稿
function onInput(regionId, areaId, itemId, event) {
  const raw = sanitizeInputText(event.target.value)
  const def = areaItemDef(regionId, areaId, itemId)
  const max = def?.target || 0
  const n = parseItemInput(raw, max)
  if (n === null) return
  drafts.value = { ...drafts.value, [keyOf(regionId, areaId, itemId)]: n }
}

function toggleRegion(regionId) {
  collapsed.value = { ...collapsed.value, [regionId]: !collapsed.value[regionId] }
}

function expandAll() {
  collapsed.value = {}
}
function collapseAll() {
  const all = {}
  for (const r of props.store.regions.value) all[r.id] = true
  collapsed.value = all
}

// 关闭：把改动过的项逐项写入当前模式数据
function close() {
  const gameId = props.store.activeGameId.value
  for (const [k, value] of Object.entries(drafts.value)) {
    const [rid, aid, iid] = k.split('|')
    props.store.saveAreaItem(gameId, rid, aid, iid, value)
  }
  emit('close')
}

function clearGuest() {
  if (!window.confirm('确定清空本机的游客数据吗？清空后将回到参考显示（主人的进度）。')) return
  props.store.clearGuestData()
  drafts.value = {}
}
</script>

<template>
  <div class="batch-mask" @click.self="close">
    <div class="batch-panel" role="dialog" aria-label="一键修改">
      <header class="batch-head">
        <div>
          <h2 class="batch-title">一键修改</h2>
          <p class="batch-sub mono">
            {{ store.editable.value ? '主人模式 · 改动保存到云端' : '游客模式 · 改动只保存到本机，导出不含参考数据' }}
          </p>
        </div>
        <div class="batch-head-actions">
          <button class="btn btn-ghost btn-sm" @click="expandAll" title="展开全部地区的编辑项">
            <PhArrowsOut :size="15" /> 全部展开
          </button>
          <button class="btn btn-ghost btn-sm" @click="collapseAll" title="收起全部地区的编辑项">
            <PhArrowsIn :size="15" /> 全部收起
          </button>
          <button class="btn btn-primary btn-sm" @click="close" title="保存本次修改并关闭面板">
            <PhCheck :size="15" /> 完成
          </button>
        </div>
      </header>

      <div class="batch-body">
        <section v-for="region in store.regions.value" :key="region.id" class="batch-region">
          <button
            class="batch-region-head"
            @click="toggleRegion(region.id)"
            :title="collapsed[region.id] ? `展开${region.name}的编辑项` : `收起${region.name}的编辑项`"
          >
            <span class="batch-caret" :class="{ open: !collapsed[region.id] }">
              <PhCaretRight :size="14" />
            </span>
            <span class="batch-region-name">{{ region.name }}</span>
            <span class="batch-region-meta mono">{{ region.areas.length }} 章</span>
          </button>
          <div v-if="!collapsed[region.id]" class="batch-areas">
            <div v-for="area in region.areas" :key="area.id" class="batch-area">
              <div class="batch-area-name">{{ area.name }}</div>
              <div class="batch-items">
                <label v-for="item in area.items" :key="item.id" class="batch-item">
                  <span class="batch-item-name">{{ item.name }}</span>
                  <input
                    class="batch-input mono"
                    type="text"
                    inputmode="numeric"
                    :value="currentValue(region.id, area.id, item.id)"
                    @input="onInput(region.id, area.id, item.id, $event)"
                    title="填写 0 到目标数之间的整数；-1 表示该分项无 / 不适用（不参与探索度）"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="batch-foot">
        <p class="batch-tip" v-if="!store.editable.value">
          游客模式：未修改的项保持参考/空；导出只含你改过的数据（本机已录 {{ store.guestItemCount.value }} 项）。
        </p>
        <button
          v-if="!store.editable.value"
          class="btn btn-ghost btn-sm batch-clear"
          @click="clearGuest"
          title="清空本机保存的游客数据（回到只显示主人参考）"
        >
          <PhTrash :size="15" /> 清除本机数据
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.batch-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(6, 10, 18, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5);
}
.batch-panel {
  width: min(860px, 100%);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-1);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-card), var(--shadow-glow);
  overflow: hidden;
}
.batch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-6);
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.batch-title {
  margin: 0 0 var(--sp-1);
  font-size: var(--fz-lg);
  font-weight: 700;
  letter-spacing: 0.06em;
}
.batch-sub {
  margin: 0;
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.04em;
}
.batch-head-actions {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.batch-body {
  overflow-y: auto;
  padding: var(--sp-3) var(--sp-5);
}
.batch-region {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.batch-region:last-child {
  border-bottom: none;
}
.batch-region-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  padding: var(--sp-3) var(--sp-2);
  background: transparent;
  border: none;
  color: var(--text-1);
  font-size: var(--fz-base);
  font-weight: 600;
  cursor: pointer;
  transition: var(--t);
}
.batch-region-head:hover {
  color: var(--text-1);
}
.batch-caret {
  display: inline-flex;
  align-items: center;
  color: var(--text-3);
  transition: transform 0.2s var(--ease);
}
.batch-caret.open {
  transform: rotate(90deg);
  color: var(--text-1);
}
.batch-region-meta {
  margin-left: auto;
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.08em;
}
.batch-areas {
  padding: 0 var(--sp-3) var(--sp-4) var(--sp-6);
}
.batch-area {
  margin-bottom: var(--sp-3);
}
.batch-area-name {
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.1em;
  margin-bottom: var(--sp-2);
}
.batch-items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-5);
}
.batch-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fz-sm);
  color: var(--text-2);
}
.batch-item-name {
  min-width: 4.5em;
}
.batch-input {
  width: 84px;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--r-sm);
  background: rgba(10, 11, 13, 0.55);
  color: var(--text-1);
  font-size: var(--fz-base);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.batch-input:focus-visible {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}
.batch-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6);
  border-top: 1px solid var(--line);
  flex-wrap: wrap;
}
.batch-tip {
  margin: 0;
  font-size: var(--fz-xs);
  color: var(--text-3);
}
.batch-clear {
  color: #e5484d;
  border-color: rgba(229, 72, 77, 0.4);
}
.batch-clear:hover {
  color: #ff6b6f;
  border-color: #e5484d;
}
</style>
