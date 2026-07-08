<template>
  <div ref="container" class="message-list">
    <!-- 欢迎引导 -->
    <div v-if="!messages.length" class="welcome">
      <div class="welcome__logo">
        <!-- DeepSeek Logo -->
        <svg v-if="provider === 'deepseek'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="welcome__img">
          <circle cx="32" cy="32" r="32" fill="#1a6bf7"/>
          <text x="32" y="43" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">D</text>
        </svg>
        <!-- 豆包图片模型 -->
        <svg v-else-if="isDoubao && isImageModel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="welcome__img">
          <circle cx="32" cy="32" r="32" fill="#7c3aed"/>
          <text x="32" y="43" text-anchor="middle" font-family="sans-serif" font-size="28" fill="white">🎨</text>
        </svg>
        <!-- 豆包对话模型 -->
        <svg v-else-if="isDoubao" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="welcome__img">
          <circle cx="32" cy="32" r="32" fill="#10b981"/>
          <text x="32" y="43" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">豆</text>
        </svg>
        <!-- NovelAI Logo -->
        <svg v-else-if="isNovelAI" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="welcome__img">
          <defs>
            <linearGradient id="nai-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#db2777"/>
              <stop offset="100%" style="stop-color:#9333ea"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="32" fill="url(#nai-grad)"/>
          <text x="32" y="43" text-anchor="middle" font-family="sans-serif" font-size="26" fill="white">✦</text>
        </svg>
      </div>
      <h2 class="welcome__title">{{ welcomeTitle }}</h2>
      <p class="welcome__subtitle">{{ welcomeSubtitle }}</p>
      <div class="welcome__suggestions" :class="{ 'welcome__suggestions--single': isImageModel }">
        <button
          v-for="s in suggestions"
          :key="s"
          class="suggestion-btn"
          :class="{
            'suggestion-btn--image': isDoubao && isImageModel,
            'suggestion-btn--novelai': isNovelAI,
          }"
          @click="emit('suggest', s)"
        >
          {{ s }}
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div v-else class="message-list__inner">
      <ChatMessage
        v-for="(msg, idx) in messages"
        :key="msg.id"
        :message="msg"
        :is-last="idx === messages.length - 1"
      />
      <div ref="bottomAnchor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Message } from '@/types'
import { MODEL_CONFIGS } from '@/types'
import { useSettingsStore } from '@/stores/settings'
import ChatMessage from './ChatMessage.vue'

defineProps<{ messages: Message[] }>()
const emit = defineEmits<{ suggest: [text: string] }>()

const settingsStore = useSettingsStore()

const container = ref<HTMLElement | null>(null)
const bottomAnchor = ref<HTMLElement | null>(null)

const currentConfig = computed(() => MODEL_CONFIGS[settingsStore.model])
const provider = computed(() => currentConfig.value?.provider ?? 'deepseek')
const isDoubao = computed(() => provider.value === 'doubao')
const isNovelAI = computed(() => provider.value === 'novelai')
const isImageModel = computed(() => currentConfig.value?.isImageModel === true)

const welcomeTitle = computed(() => {
  if (isNovelAI.value) return `你好，我是 NovelAI`
  if (isDoubao.value) return `你好，我是${currentConfig.value?.label ?? '豆包'}`
  return `你好，我是 DeepSeek`
})

const welcomeSubtitle = computed(() => {
  if (isNovelAI.value) return '描述你的想象，我来创作专属二次元图片'
  if (isImageModel.value) return '描述你的想象，我来帮你生成一张图片'
  if (isDoubao.value) return '豆包 AI 助手，帮你思考、分析、写作'
  return '你的 AI 助手，可以帮你思考、分析、写作'
})

const suggestions = computed(() => {
  if (isNovelAI.value) {
    return [
      '一个红发精灵少女，站在月光下的森林中',
      '穿着华丽战甲的银发骑士，史诗风格',
      '温泉中的兽耳女孩，温柔光线',
      '赛博朋克风格的猫娘，霓虹背景',
    ]
  }
  if (isImageModel.value) {
    return [
      '一只在雪地里奔跑的橘猫，写实风格',
      '未来城市的夜景，赛博朋克风格',
      '清晨阳光下的咖啡杯，产品摄影风',
      '简约极简风格的 Logo 设计概念图',
    ]
  }
  if (isDoubao.value) {
    return [
      '帮我写一篇工作汇报',
      '解释一个我不理解的概念',
      '帮我分析这段数据的趋势',
      '推荐一个周末出行计划',
    ]
  }
  return [
    '帮我分析一个复杂的数学问题',
    '用深度思考帮我写一篇文章',
    '解释一个我不理解的概念',
    '帮我优化一段代码',
  ]
})

watch(
  () => bottomAnchor.value,
  (el) => {
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' })
  },
)

// 新消息时滚动到底部
const observer = new MutationObserver(() => {
  nextTick(() => {
    bottomAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
})

watch(container, (el) => {
  if (el) observer.observe(el, { childList: true, subtree: true, characterData: true })
}, { immediate: true })
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
  scroll-behavior: smooth;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px 20px;
  text-align: center;
}

.welcome__logo {
  width: 72px;
  height: 72px;
  margin-bottom: 20px;
}

.welcome__img {
  width: 72px;
  height: 72px;
}

.welcome__title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.welcome__subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 28px;
}

.welcome__suggestions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-width: 480px;
  width: 100%;
}

.suggestion-btn {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 13.5px;
  color: var(--text-secondary);
  text-align: left;
  line-height: 1.4;
  transition: background var(--transition), border-color var(--transition);
}
.suggestion-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

/* 图片生成模式建议按钮铺满一列 */
.welcome__suggestions--single {
  grid-template-columns: 1fr;
}

.suggestion-btn--image:hover {
  background: rgba(124, 58, 237, 0.06);
  border-color: #7c3aed;
  color: #7c3aed;
}

.suggestion-btn--novelai:hover {
  background: rgba(219, 39, 119, 0.06);
  border-color: #db2777;
  color: #db2777;
}

.message-list__inner {
  padding: 16px 0;
  max-width: var(--content-max-width);
  margin: 0 auto;
}

@media (max-width: 767px) {
  .welcome__suggestions {
    grid-template-columns: 1fr;
  }
}
</style>
