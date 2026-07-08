<template>
  <div class="app">
    <!-- 侧边栏 -->
    <Sidebar v-model="sidebarOpen" />

    <!-- 主内容区 -->
    <div class="main">
      <!-- 顶部栏 -->
      <header class="topbar">
        <button class="topbar__menu" @click="sidebarOpen = !sidebarOpen" aria-label="菜单">
          ☰
        </button>
        <h1 class="topbar__title">
          {{ currentTitle }}
        </h1>
        <div class="topbar__actions">
          <button class="topbar__btn" @click="showSettings = true" title="设置" aria-label="设置">
            ⚙️
          </button>
        </div>
      </header>

      <!-- 消息列表 -->
      <MessageList
        :messages="currentMessages"
        @suggest="handleSuggest"
      />

      <!-- 输入框 -->
      <div class="input-container">
        <ChatInput
          ref="chatInputRef"
          @open-settings="showSettings = true"
        />
      </div>
    </div>

    <!-- 设置弹窗 -->
    <SettingsModal v-model:visible="showSettings" />

    <!-- 全局 Toast 通知 -->
    <ToastContainer />

    <!-- 图片灯箱预览 -->
    <ImageLightbox />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import MessageList from '@/components/MessageList.vue'
import ChatInput from '@/components/ChatInput.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { getProvider, MODEL_CONFIGS } from '@/types'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()

const sidebarOpen = ref(window.innerWidth >= 768)
const showSettings = ref(false)
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)

const currentTitle = computed(() => chatStore.currentSession?.title ?? 'DeepSeek Chat')
const currentMessages = computed(() => chatStore.currentSession?.messages ?? [])

// 主题应用
function applyTheme(theme: string) {
  const html = document.documentElement
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } else {
    html.setAttribute('data-theme', theme)
  }
}

// Provider 主题色
function applyProvider(modelId: string) {
  const provider = getProvider(modelId as Parameters<typeof getProvider>[0])
  const isImage = MODEL_CONFIGS[modelId as keyof typeof MODEL_CONFIGS]?.isImageModel
  let token = 'deepseek'
  if (provider === 'novelai') token = 'novelai'
  else if (provider === 'doubao') token = isImage ? 'doubao-image' : 'doubao'
  document.documentElement.setAttribute('data-provider', token)
}

watch(() => settingsStore.theme, applyTheme, { immediate: true })
watch(() => settingsStore.model, applyProvider, { immediate: true })

const mq = window.matchMedia('(prefers-color-scheme: dark)')
mq.addEventListener('change', () => {
  if (settingsStore.theme === 'system') applyTheme('system')
})

// 首次打开无 Key 弹出设置
onMounted(() => {
  if (!settingsStore.hasApiKey) {
    showSettings.value = true
  }
})

function handleSuggest(text: string) {
  chatInputRef.value?.setInput(text)
}
</script>

<style scoped>
.app {
  display: flex;
  height: 100%;
  background: var(--bg-primary);
  overflow: hidden;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 56px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-primary);
}

.topbar__menu {
  font-size: 20px;
  color: var(--text-secondary);
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}
.topbar__menu:hover {
  background: var(--bg-hover);
}

.topbar__title {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__actions {
  display: flex;
  gap: 4px;
}

.topbar__btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background var(--transition);
}
.topbar__btn:hover {
  background: var(--bg-hover);
}

.input-container {
  flex-shrink: 0;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

@media (min-width: 768px) {
  .topbar__menu {
    display: none;
  }
}
</style>
