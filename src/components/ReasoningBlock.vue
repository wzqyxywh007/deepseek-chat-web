<template>
  <div class="reasoning">
    <span class="reasoning__icon">🧠</span>
    <span v-if="thinkingEndAt" class="reasoning__duration">已深度思考（用时 {{ duration }} 秒）</span>
    <span v-else class="reasoning__streaming">思考中… {{ duration }}s</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  /** 思考计时开始时间（用户发出请求的时间点） */
  thinkingStartAt: number
  /** 思考计时结束时间（收到第一个正式回复片段的时间点），未结束则为空 */
  thinkingEndAt?: number
}>()

const duration = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  const end = props.thinkingEndAt ?? Date.now()
  duration.value = Math.max(0, Math.floor((end - props.thinkingStartAt) / 1000))
}

function startTimer() {
  tick()
  timer = setInterval(tick, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  tick()
}

watch(
  () => props.thinkingEndAt,
  (endAt) => {
    if (endAt) {
      stopTimer()
    } else if (!timer) {
      startTimer()
    }
  },
  { immediate: true },
)

onUnmounted(stopTimer)
</script>

<style scoped>
.reasoning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--reasoning-border);
  background: var(--reasoning-bg);
  width: fit-content;
}

.reasoning__icon {
  font-size: 14px;
}

.reasoning__duration,
.reasoning__streaming {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--reasoning-border);
}

.reasoning__streaming {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
</style>
