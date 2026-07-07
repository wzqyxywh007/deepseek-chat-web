<template>
  <div v-if="reasoning" class="reasoning">
    <button class="reasoning__header" @click="expanded = !expanded">
      <span class="reasoning__icon">🧠</span>
      <span class="reasoning__title">深度思考</span>
      <span v-if="!isStreaming" class="reasoning__duration">{{ duration }}s</span>
      <span v-else class="reasoning__streaming">思考中...</span>
      <span class="reasoning__chevron" :class="{ 'reasoning__chevron--up': expanded }">▾</span>
    </button>
    <Transition name="collapse">
      <div v-show="expanded" class="reasoning__body">
        <div class="reasoning__content">{{ reasoning }}</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  reasoning: string
  isStreaming: boolean
}>()

const expanded = ref(true)
const duration = ref(0)
let startTime = Date.now()
let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
  startTime = Date.now()
  timer = setInterval(() => {
    duration.value = Math.floor((Date.now() - startTime) / 1000)
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  duration.value = Math.floor((Date.now() - startTime) / 1000)
}

watch(
  () => props.isStreaming,
  (streaming) => {
    if (streaming) {
      expanded.value = true
      startTimer()
    } else {
      stopTimer()
      // 完成后延迟折叠
      setTimeout(() => { expanded.value = false }, 800)
    }
  },
  { immediate: true },
)

onUnmounted(stopTimer)
</script>

<style scoped>
.reasoning {
  margin-bottom: 10px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--reasoning-border);
  background: var(--reasoning-bg);
}

.reasoning__header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  text-align: left;
  transition: background var(--transition);
}
.reasoning__header:hover {
  background: rgba(74, 144, 226, 0.08);
}

.reasoning__icon {
  font-size: 15px;
}

.reasoning__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--reasoning-border);
}

.reasoning__duration,
.reasoning__streaming {
  font-size: 12px;
  color: var(--text-muted);
}

.reasoning__streaming {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.reasoning__chevron {
  margin-left: auto;
  font-size: 16px;
  color: var(--text-muted);
  transition: transform 0.2s ease;
  display: inline-block;
}
.reasoning__chevron--up {
  transform: rotate(180deg);
}

.reasoning__body {
  border-top: 1px solid rgba(74, 144, 226, 0.2);
}

.reasoning__content {
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--reasoning-text);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  border-left: 3px solid var(--reasoning-border);
}

/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: max-height 0.25s ease, opacity 0.25s ease;
  max-height: 400px;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
