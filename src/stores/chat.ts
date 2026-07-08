import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Session, Message, ChatMessage } from '@/types'
import { storageGet, storageSet, STORAGE_KEYS } from '@/utils/storage'
import { callChatAPI, callImageAPI, isImageModel, type ImageAPIOptions } from '@/api/index'
import { getProvider } from '@/types'
import { useSettingsStore } from './settings'
import { toast, translateApiError } from '@/utils/toast'
import type { ParsedFile } from '@/utils/fileParser'
import { buildApiContent, toAttachmentMeta } from '@/utils/fileParser'
import { buildNovelAIPrompt } from '@/utils/novelaiPrompt'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function buildApiMessages(history: ChatMessage[], systemPrompt: string): ChatMessage[] {
  const trimmed = systemPrompt.trim()
  if (!trimmed) return history
  return [{ role: 'system', content: trimmed }, ...history]
}

function createNewSession(): Session {
  const now = Date.now()
  return {
    id: generateId(),
    title: '新对话',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const useChatStore = defineStore('chat', () => {
  const settingsStore = useSettingsStore()

  const sessions = ref<Session[]>(storageGet<Session[]>(STORAGE_KEYS.SESSIONS, []))
  const currentSessionId = ref<string>(
    storageGet<string>(STORAGE_KEYS.CURRENT_SESSION_ID, ''),
  )

  let abortController: AbortController | null = null

  if (sessions.value.length === 0) {
    const initial = createNewSession()
    sessions.value = [initial]
    currentSessionId.value = initial.id
  } else if (!currentSessionId.value || !sessions.value.find(s => s.id === currentSessionId.value)) {
    currentSessionId.value = sessions.value[0].id
  }

  const currentSession = computed<Session | undefined>(() =>
    sessions.value.find(s => s.id === currentSessionId.value),
  )

  watch(
    sessions,
    (val) => storageSet(STORAGE_KEYS.SESSIONS, val),
    { deep: true },
  )
  watch(currentSessionId, (val) => storageSet(STORAGE_KEYS.CURRENT_SESSION_ID, val))

  function createSession() {
    const s = createNewSession()
    sessions.value.unshift(s)
    currentSessionId.value = s.id
  }

  function deleteSession(id: string) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx === -1) return
    sessions.value.splice(idx, 1)
    if (sessions.value.length === 0) {
      createSession()
    } else if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0].id
    }
  }

  function switchSession(id: string) {
    abortStream()
    currentSessionId.value = id
    // 若该历史对话有绑定模型，自动切换过去
    const session = sessions.value.find(s => s.id === id)
    if (session?.modelId) {
      settingsStore.model = session.modelId
    }
  }

  function renameSession(id: string, title: string) {
    const s = sessions.value.find(s => s.id === id)
    if (s) s.title = title.trim() || '新对话'
  }

  function abortStream() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    const session = currentSession.value
    if (session) {
      const last = session.messages[session.messages.length - 1]
      if (last?.isStreaming) {
        last.isStreaming = false
      }
    }
  }

  // ─── 图片生成分支 ───────────────────────────────────────────────────────────

  async function handleImageGeneration(
    session: ReturnType<typeof createNewSession>,
    prompt: string,
    reactiveAiMsg: Message,
  ) {
    try {
      const provider = getProvider(settingsStore.model)

      let finalPrompt = prompt

      if (provider === 'novelai') {
        // 收集本 session 内所有用户消息（包含当前这条），用于多轮上下文整合 + 中译英
        const userMessages = (session as unknown as { messages: Message[] }).messages
          .filter(m => m.role === 'user' && m.content.trim())
          .map(m => m.content)

        // 静默调用 DeepSeek 翻译，失败则原样发送
        finalPrompt = await buildNovelAIPrompt(userMessages, settingsStore.apiKey)
      }

      const imageOpts: ImageAPIOptions = {
        prompt: finalPrompt,
        modelId: settingsStore.model,
        apiKey: provider === 'novelai' ? settingsStore.novelaiApiKey : settingsStore.doubaoApiKey,
        proxyUrl: provider === 'novelai'
          ? (settingsStore.novelaiProxyUrl || undefined)
          : (settingsStore.doubaoProxyUrl || undefined),
      }
      const urls = await callImageAPI(imageOpts)
      reactiveAiMsg.generatedImages = urls
      reactiveAiMsg.content = ''
      reactiveAiMsg.isStreaming = false
      session.updatedAt = Date.now()
    } catch (err) {
      reactiveAiMsg.isStreaming = false
      const { message, detail } = translateApiError((err as Error).message)
      reactiveAiMsg.content = message
      reactiveAiMsg.isError = true
      toast.error(message, detail)
    }
  }

  // ─── sendMessage ────────────────────────────────────────────────────────────

  async function sendMessage(userContent: string, attachments: ParsedFile[] = []) {
    const session = currentSession.value
    if (!session) return

    abortStream()

    const trimmed = userContent.trim()

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      attachments: attachments.map(toAttachmentMeta),
      createdAt: Date.now(),
    }
    session.messages.push(userMsg)

    // 首次发送消息时，将当前模型绑定到该对话
    if (!session.modelId) {
      session.modelId = settingsStore.model
    }

    if (session.title === '新对话' && session.messages.length === 1) {
      session.title = trimmed.slice(0, 20) || '图片生成'
    }

    const aiMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      reasoningContent: '',
      isStreaming: true,
      createdAt: Date.now(),
    }
    session.messages.push(aiMsg)
    session.updatedAt = Date.now()

    // push 之后从响应式数组取回 Proxy 版本，确保回调中的赋值能触发 Vue 更新
    const reactiveAiMsg = session.messages[session.messages.length - 1]

    // ── 图片生成模式 ──
    if (isImageModel(settingsStore.model)) {
      await handleImageGeneration(session as unknown as ReturnType<typeof createNewSession>, trimmed, reactiveAiMsg)
      return
    }

    // ── 文字对话模式 ──
    const pastHistory: ChatMessage[] = session.messages
      .filter(m => !m.isStreaming && m.id !== reactiveAiMsg.id && m.id !== userMsg.id)
      .map(m => ({ role: m.role, content: m.content }))

    const currentApiContent = buildApiContent(trimmed, attachments)
    const history = buildApiMessages(
      [...pastHistory, { role: 'user' as const, content: currentApiContent }],
      settingsStore.systemPrompt,
    )

    abortController = new AbortController()

    try {
      await callChatAPI({
        messages: history,
        apiKey: settingsStore.currentApiKey,
        model: settingsStore.model,
        thinkingMode: settingsStore.thinkingMode,
        reasoningEffort: settingsStore.reasoningEffort,
        proxyUrl: settingsStore.doubaoProxyUrl || undefined,
        onReasoning: (delta) => { reactiveAiMsg.reasoningContent = (reactiveAiMsg.reasoningContent ?? '') + delta },
        onContent: (delta) => { reactiveAiMsg.content += delta },
        onDone: () => {
          reactiveAiMsg.isStreaming = false
          abortController = null
          session.updatedAt = Date.now()
        },
        onError: (err) => {
          reactiveAiMsg.isStreaming = false
          abortController = null
          if ((err as Error).name !== 'AbortError') {
            const { message, detail } = translateApiError((err as Error).message)
            reactiveAiMsg.content = message
            reactiveAiMsg.isError = true
            toast.error(message, detail)
          }
        },
        signal: abortController.signal,
      })
    } catch (e) {
      reactiveAiMsg.isStreaming = false
      abortController = null
    }
  }

  // ─── isStreaming ─────────────────────────────────────────────────────────────

  const isStreaming = computed(() => {
    const session = currentSession.value
    if (!session) return false
    return session.messages.some(m => m.isStreaming)
  })

  // ─── regenerateMessage ───────────────────────────────────────────────────────

  async function regenerateMessage(aiMessageId: string) {
    const session = currentSession.value
    if (!session || isStreaming.value) return

    const idx = session.messages.findIndex(m => m.id === aiMessageId)
    if (idx === -1 || session.messages[idx].role !== 'assistant') return

    const prevUserMsg = [...session.messages].slice(0, idx).reverse().find(m => m.role === 'user')
    if (!prevUserMsg) return

    session.messages.splice(idx)

    const aiMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      reasoningContent: '',
      isStreaming: true,
      createdAt: Date.now(),
    }
    session.messages.push(aiMsg)
    session.updatedAt = Date.now()

    const reactiveAiMsg = session.messages[session.messages.length - 1]

    // 图片模型重新生成
    if (isImageModel(settingsStore.model)) {
      await handleImageGeneration(session as unknown as ReturnType<typeof createNewSession>, prevUserMsg.content, reactiveAiMsg)
      return
    }

    const history = buildApiMessages(
      session.messages
        .filter(m => !m.isStreaming && m.id !== reactiveAiMsg.id)
        .map(m => ({ role: m.role, content: m.content })),
      settingsStore.systemPrompt,
    )

    abortController = new AbortController()

    try {
      await callChatAPI({
        messages: history,
        apiKey: settingsStore.currentApiKey,
        model: settingsStore.model,
        thinkingMode: settingsStore.thinkingMode,
        reasoningEffort: settingsStore.reasoningEffort,
        proxyUrl: settingsStore.doubaoProxyUrl || undefined,
        onReasoning: (delta) => { reactiveAiMsg.reasoningContent = (reactiveAiMsg.reasoningContent ?? '') + delta },
        onContent: (delta) => { reactiveAiMsg.content += delta },
        onDone: () => {
          reactiveAiMsg.isStreaming = false
          abortController = null
          session.updatedAt = Date.now()
        },
        onError: (err) => {
          reactiveAiMsg.isStreaming = false
          abortController = null
          if ((err as Error).name !== 'AbortError') {
            const { message, detail } = translateApiError((err as Error).message)
            reactiveAiMsg.content = message
            reactiveAiMsg.isError = true
            toast.error(message, detail)
          }
        },
        signal: abortController.signal,
      })
    } catch (e) {
      reactiveAiMsg.isStreaming = false
      abortController = null
    }
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    isStreaming,
    createSession,
    deleteSession,
    switchSession,
    renameSession,
    sendMessage,
    regenerateMessage,
    abortStream,
  }
})
