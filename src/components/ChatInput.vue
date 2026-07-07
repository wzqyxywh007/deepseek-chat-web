<template>
  <div class="chat-input-wrap">
    <div class="chat-input" :class="{ 'chat-input--disabled': !hasApiKey }">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="chat-input__textarea"
        :placeholder="hasApiKey ? '发消息给 DeepSeek...' : '请先在右上角设置中配置 API Key'"
        :disabled="!hasApiKey"
        rows="1"
        @input="autoResize"
        @keydown.enter.exact.prevent="handleSend"
        @keydown.enter.shift.exact="() => {}"
        @compositionstart="composing = true"
        @compositionend="composing = false"
      />
      <div class="chat-input__footer">
        <span class="chat-input__hint">Enter 发送，Shift+Enter 换行</span>
        <button
          v-if="isStreaming"
          class="send-btn send-btn--stop"
          @click="handleStop"
          title="停止生成"
        >
          <span class="send-btn__icon">⏹</span>
        </button>
        <button
          v-else
          class="send-btn"
          :disabled="!hasApiKey || !inputText.trim()"
          @click="handleSend"
          title="发送"
        >
          <span class="send-btn__icon">↑</span>
        </button>
      </div>
    </div>
    <p v-if="!hasApiKey" class="no-key-hint">
      <button class="no-key-hint__btn" @click="emit('open-settings')">点击设置 API Key</button>
      开始使用
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{ 'open-settings': [] }>()

const chatStore = useChatStore()
const settingsStore = useSettingsStore()

const inputText = ref('')
const composing = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const hasApiKey = computed(() => settingsStore.hasApiKey)
const isStreaming = computed(() => chatStore.isStreaming)

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const lineHeight = 24
  const maxLines = 6
  el.style.height = Math.min(el.scrollHeight, lineHeight * maxLines + 28) + 'px'
}

function handleSend() {
  if (composing.value) return
  const text = inputText.value.trim()
  if (!text || !hasApiKey.value || isStreaming.value) return
  chatStore.sendMessage(text)
  inputText.value = ''
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
}

function handleStop() {
  chatStore.abortStream()
}

defineExpose({ setInput: (text: string) => { inputText.value = text } })
</script>

<style scoped>
.chat-input-wrap {
  padding: 12px 16px 16px;
  max-width: var(--content-max-width);
  margin: 0 auto;
  width: 100%;
}

.chat-input {
  border: 1.5px solid var(--border-input);
  border-radius: var(--radius-xl);
  background: var(--bg-input);
  transition: border-color var(--transition);
  overflow: hidden;
}
.chat-input:focus-within {
  border-color: var(--accent);
}
.chat-input--disabled {
  opacity: 0.6;
}

.chat-input__textarea {
  width: 100%;
  resize: none;
  padding: 14px 16px 6px;
  font-size: 15px;
  line-height: 1.6;
  background: transparent;
  max-height: 160px;
  overflow-y: auto;
}

.chat-input__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 8px 16px;
}

.chat-input__hint {
  font-size: 12px;
  color: var(--text-placeholder);
}

.send-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  transition: background var(--transition), opacity var(--transition);
}
.send-btn:disabled {
  background: var(--border-color);
  color: var(--text-muted);
  opacity: 1;
}
.send-btn:not(:disabled):hover {
  background: var(--accent-hover);
}

.send-btn--stop {
  background: var(--danger);
  font-size: 14px;
}
.send-btn--stop:hover {
  background: var(--danger-hover);
}

.send-btn__icon {
  line-height: 1;
}

.no-key-hint {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 8px;
}

.no-key-hint__btn {
  color: var(--accent);
  font-size: 13px;
  margin-right: 4px;
}
.no-key-hint__btn:hover {
  text-decoration: underline;
}

@media (max-width: 767px) {
  .chat-input__hint {
    display: none;
  }
}
</style>
