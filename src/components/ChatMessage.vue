<template>
  <div class="message" :class="`message--${message.role}`">
    <div v-if="message.role === 'assistant'" class="message__avatar">
      <span class="avatar-placeholder">AI</span>
    </div>

    <div class="message__body">
      <!-- 思考链 -->
      <ReasoningBlock
        v-if="message.role === 'assistant' && message.reasoningContent"
        :reasoning="message.reasoningContent"
        :is-streaming="!!message.isStreaming"
      />

      <!-- 用户附件 -->
      <div v-if="message.role === 'user' && message.attachments?.length" class="message__attachments">
        <div
          v-for="att in message.attachments"
          :key="att.name"
          class="att-chip"
          :class="{ 'att-chip--image': att.fileType === 'image' }"
        >
          <img v-if="att.fileType === 'image' && att.previewUrl" :src="att.previewUrl" class="att-chip__img" />
          <span v-else class="att-chip__icon">{{ attIcon(att.mimeType) }}</span>
          <span class="att-chip__name">{{ att.name }}</span>
          <span v-if="att.truncated" class="att-chip__warn" title="内容过长，已截取">⚠️</span>
        </div>
      </div>

      <!-- 消息内容 -->
      <div
        class="message__bubble"
        :class="{ 'message__bubble--streaming': message.isStreaming && !message.content }"
      >
        <template v-if="message.role === 'user'">
          <p v-if="message.content" class="message__text">{{ message.content }}</p>
        </template>
        <template v-else>
          <!-- 图片生成结果 -->
          <div v-if="message.generatedImages?.length" class="generated-images">
            <img
              v-for="url in message.generatedImages"
              :key="url"
              :src="url"
              class="generated-image"
              alt="AI 生成图片"
              loading="lazy"
              @click="openLightbox(url)"
            />
          </div>
          <!-- 文字内容（流式 loading 动画 / Markdown） -->
          <div
            v-if="message.content || message.isStreaming"
            ref="mdContainer"
            class="message__markdown"
            v-html="renderedContent"
          />
          <span v-if="message.isStreaming" class="message__cursor" />
        </template>
      </div>

      <!-- AI 消息操作栏 -->
      <div v-if="message.role === 'assistant' && !message.isStreaming" class="message__actions">
        <!-- 错误重试（始终显示，更醒目） -->
        <template v-if="message.isError">
          <button class="action-btn action-btn--retry" @click="handleRegenerate" title="重试">
            <span>↺</span> 重试
          </button>
        </template>

        <!-- 正常操作：悬停显示 -->
        <template v-else>
          <button class="action-btn" @click="handleCopy" :title="copied ? '已复制' : '复制'">
            <span>{{ copied ? '✓' : '⎘' }}</span>
            <span class="action-btn__label">{{ copied ? '已复制' : '复制' }}</span>
          </button>
          <button
            v-if="isLast"
            class="action-btn"
            @click="handleRegenerate"
            title="重新生成"
          >
            <span>↺</span>
            <span class="action-btn__label">重新生成</span>
          </button>
        </template>
      </div>
    </div>

    <div v-if="message.role === 'user'" class="message__avatar message__avatar--user">
      <span class="user-avatar">你</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import type { Message } from '@/types'
import ReasoningBlock from './ReasoningBlock.vue'
import { renderMarkdown, bindCopyButtons } from '@/utils/markdown'
import { useChatStore } from '@/stores/chat'
import { useLightbox } from '@/utils/lightbox'

const props = defineProps<{
  message: Message
  isLast?: boolean
}>()

function attIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word') || mimeType.includes('docx')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊'
  return '📎'
}

const chatStore = useChatStore()
const lb = useLightbox()
const mdContainer = ref<HTMLElement | null>(null)
const copied = ref(false)

function openLightbox(clickedUrl: string) {
  // 收集当前 session 所有消息中的全部生成图片
  const allImages: string[] = []
  for (const msg of chatStore.currentSession?.messages ?? []) {
    for (const url of msg.generatedImages ?? []) {
      allImages.push(url)
    }
  }
  const idx = allImages.indexOf(clickedUrl)
  lb.open(allImages, idx >= 0 ? idx : 0)
}

const renderedContent = computed(() => {
  if (!props.message.content && props.message.isStreaming) return ''
  return renderMarkdown(props.message.content || '')
})

function attachCopyHandlers() {
  if (mdContainer.value) bindCopyButtons(mdContainer.value)
}

onMounted(attachCopyHandlers)
watch(renderedContent, () => nextTick(attachCopyHandlers))

function handleCopy() {
  navigator.clipboard.writeText(props.message.content).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }).catch(() => { /* ignore */ })
}

function handleRegenerate() {
  chatStore.regenerateMessage(props.message.id)
}
</script>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  padding: 16px 0;
}

.message--user {
  flex-direction: row-reverse;
}

.message__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.message__avatar--user {
  background: var(--accent);
}

.user-avatar {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.message__body {
  flex: 1;
  min-width: 0;
  max-width: min(calc(100% - 96px), 680px);
}

.message--user .message__body {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message__bubble {
  display: inline-block;
  max-width: 100%;
  border-radius: var(--radius-xl);
  padding: 12px 16px;
  word-break: break-word;
}

.message--user .message__bubble {
  background: var(--bubble-user-bg);
  color: var(--bubble-user-text);
  border-bottom-right-radius: 4px;
}

.message--assistant .message__bubble {
  background: var(--bubble-ai-bg);
  color: var(--bubble-ai-text);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border-color);
  padding: 14px 18px;
}

.message__bubble--streaming {
  min-width: 60px;
  min-height: 46px;
}

.message__text {
  white-space: pre-wrap;
  line-height: 1.65;
  font-size: 15px;
}

.message__cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: var(--accent);
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 0.8s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 附件展示 */
.message__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  justify-content: flex-end;
}

.att-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  font-size: 12px;
  color: var(--bubble-user-text);
  max-width: 200px;
}

.att-chip--image {
  padding: 4px 8px;
}

.att-chip__img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.att-chip__icon {
  font-size: 16px;
  flex-shrink: 0;
}

.att-chip__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.att-chip__warn {
  font-size: 12px;
  flex-shrink: 0;
}

/* 豆包生成图片 */
.generated-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}

.generated-image {
  max-width: 100%;
  width: auto;
  max-height: 480px;
  border-radius: var(--radius-md);
  display: block;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  cursor: zoom-in;
}
.generated-image:hover {
  opacity: 0.95;
}

/* 操作栏 */
.message__actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.message:hover .message__actions {
  opacity: 1;
}

/* 错误状态的重试按钮始终可见 */
.message__actions:has(.action-btn--retry) {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  border: 1px solid transparent;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}

.action-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.action-btn--retry {
  color: var(--danger);
  border-color: var(--danger);
  background: rgba(229, 57, 53, 0.06);
  font-weight: 500;
}

.action-btn--retry:hover {
  background: rgba(229, 57, 53, 0.12);
  border-color: var(--danger-hover);
}

.action-btn__label {
  /* 在移动端隐藏文字，只显示图标 */
}

/* Markdown 内容样式 */
.message__markdown {
  font-size: 15px;
  line-height: 1.7;
}

.message__markdown :deep(p) {
  margin: 0 0 10px;
}
.message__markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.message__markdown :deep(h1),
.message__markdown :deep(h2),
.message__markdown :deep(h3),
.message__markdown :deep(h4) {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.4;
}
.message__markdown :deep(h1) { font-size: 1.4em; }
.message__markdown :deep(h2) { font-size: 1.2em; }
.message__markdown :deep(h3) { font-size: 1.05em; }

.message__markdown :deep(ul),
.message__markdown :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}
.message__markdown :deep(li) {
  margin: 4px 0;
}

.message__markdown :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  color: var(--text-secondary);
  margin: 8px 0;
}

.message__markdown :deep(a) {
  color: var(--accent);
  word-break: break-all;
}

.message__markdown :deep(code) {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.message__markdown :deep(.code-block) {
  margin: 10px 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--code-border);
}

.message__markdown :deep(.code-block__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: var(--code-header-bg);
  font-size: 12px;
  color: var(--text-secondary);
}

.message__markdown :deep(.code-block__copy) {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  transition: background var(--transition);
}
.message__markdown :deep(.code-block__copy:hover) {
  background: var(--bg-hover);
}

.message__markdown :deep(pre) {
  margin: 0;
  overflow-x: auto;
  background: var(--code-bg);
}
.message__markdown :deep(pre code) {
  display: block;
  padding: 14px 16px;
  font-size: 13.5px;
  line-height: 1.6;
  background: transparent;
  border: none;
}

.message__markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 14px;
}
.message__markdown :deep(th),
.message__markdown :deep(td) {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
}
.message__markdown :deep(th) {
  background: var(--bg-secondary);
  font-weight: 600;
}

.message__markdown :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 16px 0;
}

.message__markdown :deep(.math-block) {
  overflow-x: auto;
  padding: 8px 0;
  text-align: center;
}

@media (max-width: 767px) {
  .message__actions {
    opacity: 1;
  }
}
</style>
