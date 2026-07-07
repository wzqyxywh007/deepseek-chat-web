<template>
  <div class="chat-input-wrap">
    <div class="chat-input" :class="{ 'chat-input--disabled': !hasApiKey }">

      <!-- 附件预览区 -->
      <div v-if="pendingFiles.length" class="attachment-bar">
        <div
          v-for="(f, i) in pendingFiles"
          :key="i"
          class="att-preview"
          :class="{ 'att-preview--image': f.fileType === 'image' }"
        >
          <img v-if="f.fileType === 'image' && f.dataUrl" :src="f.dataUrl" class="att-preview__thumb" />
          <span v-else class="att-preview__icon">{{ fileIcon(f) }}</span>
          <div class="att-preview__info">
            <span class="att-preview__name">{{ f.name }}</span>
            <span class="att-preview__size">{{ formatFileSize(f.size) }}</span>
          </div>
          <button class="att-preview__remove" @click="removeFile(i)" title="移除">✕</button>
        </div>
        <div v-if="parsing" class="att-loading">解析中…</div>
      </div>

      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="chat-input__textarea"
        :placeholder="inputPlaceholder"
        :disabled="!hasApiKey"
        rows="1"
        @input="autoResize"
        @keydown.enter.exact.prevent="handleSend"
        @keydown.enter.shift.exact="() => {}"
        @compositionstart="composing = true"
        @compositionend="composing = false"
      />

      <div class="chat-input__footer">
        <!-- 上传按钮 -->
        <input
          ref="fileInputRef"
          type="file"
          class="file-input-hidden"
          :accept="ACCEPTED_FILE_TYPES"
          multiple
          @change="handleFileChange"
        />
        <button
          v-if="!isImageMode"
          class="upload-btn"
          :disabled="!hasApiKey"
          @click="fileInputRef?.click()"
          title="上传文件或图片（Excel/Word/PDF/图片等）"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

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
          :disabled="!hasApiKey || (!inputText.trim() && !pendingFiles.length)"
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
import {
  parseFile,
  ACCEPTED_FILE_TYPES,
  formatFileSize,
  type ParsedFile,
} from '@/utils/fileParser'
import { toast } from '@/utils/toast'
import { isImageModel } from '@/api/index'

const emit = defineEmits<{ 'open-settings': [] }>()

const chatStore = useChatStore()
const settingsStore = useSettingsStore()

const inputText = ref('')
const composing = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<ParsedFile[]>([])
const parsing = ref(false)

const hasApiKey = computed(() => settingsStore.hasApiKey)
const isStreaming = computed(() => chatStore.isStreaming)
const isImageMode = computed(() => isImageModel(settingsStore.model))

const inputPlaceholder = computed(() => {
  if (!hasApiKey.value) return '请先在右上角设置中配置 API Key'
  if (isImageMode.value) return '描述你想生成的图片，例如：一只在雪中奔跑的橘猫...'
  return '发消息给 AI...'
})

function fileIcon(f: ParsedFile): string {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊'
  if (['txt', 'md', 'json'].includes(ext)) return '📋'
  return '📎'
}

function removeFile(index: number) {
  pendingFiles.value.splice(index, 1)
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) return

  parsing.value = true
  for (const file of files) {
    try {
      const parsed = await parseFile(file)
      pendingFiles.value.push(parsed)
      if (parsed.truncated) {
        toast.warning(`「${file.name}」内容过长，已截取前 200K 字符发送`)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `文件「${file.name}」解析失败`)
    }
  }
  parsing.value = false
  if (fileInputRef.value) fileInputRef.value.value = ''
}

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
  const files = [...pendingFiles.value]
  if ((!text && !files.length) || !hasApiKey.value || isStreaming.value) return

  chatStore.sendMessage(text, files)
  inputText.value = ''
  pendingFiles.value = []
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

/* 附件预览栏 */
.attachment-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px 0;
}

.att-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  min-width: 0;
  max-width: 200px;
}

.att-preview__thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.att-preview__icon {
  font-size: 20px;
  flex-shrink: 0;
}

.att-preview__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.att-preview__name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.att-preview__size {
  font-size: 11px;
  color: var(--text-muted);
}

.att-preview__remove {
  font-size: 12px;
  color: var(--text-muted);
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  line-height: 1;
}
.att-preview__remove:hover {
  background: var(--danger);
  color: #fff;
}

.att-loading {
  font-size: 12px;
  color: var(--text-muted);
  align-self: center;
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
  gap: 6px;
  padding: 6px 10px 8px 10px;
}

.file-input-hidden {
  display: none;
}

.upload-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color var(--transition), background var(--transition);
}
.upload-btn:not(:disabled):hover {
  color: var(--accent);
  background: var(--bg-hover);
}
.upload-btn:disabled {
  opacity: 0.4;
}

.chat-input__hint {
  font-size: 12px;
  color: var(--text-placeholder);
  flex: 1;
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
