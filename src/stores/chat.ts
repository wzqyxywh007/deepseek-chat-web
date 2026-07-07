import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Session, Message, ChatMessage } from '@/types'
import { storageGet, storageSet, STORAGE_KEYS } from '@/utils/storage'
import { streamChat } from '@/api/deepseek'
import { useSettingsStore } from './settings'
import { toast, translateApiError } from '@/utils/toast'

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

  async function sendMessage(userContent: string) {
    const session = currentSession.value
    if (!session) return

    abortStream()

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: userContent.trim(),
      createdAt: Date.now(),
    }
    session.messages.push(userMsg)

    if (session.title === '新对话' && session.messages.length === 1) {
      session.title = userContent.slice(0, 20)
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

    const history = buildApiMessages(
      session.messages
        .filter(m => !m.isStreaming && m.id !== reactiveAiMsg.id)
        .map(m => ({ role: m.role, content: m.content })),
      settingsStore.systemPrompt,
    )

    abortController = new AbortController()

    try {
      await streamChat({
        messages: history,
        apiKey: settingsStore.apiKey,
        model: settingsStore.model,
        thinkingMode: settingsStore.thinkingMode,
        reasoningEffort: settingsStore.reasoningEffort,
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

  const isStreaming = computed(() => {
    const session = currentSession.value
    if (!session) return false
    return session.messages.some(m => m.isStreaming)
  })

  async function regenerateMessage(aiMessageId: string) {
    const session = currentSession.value
    if (!session || isStreaming.value) return

    const idx = session.messages.findIndex(m => m.id === aiMessageId)
    if (idx === -1 || session.messages[idx].role !== 'assistant') return

    // 找到这条 AI 消息之前最近的一条用户消息
    const prevUserMsg = [...session.messages].slice(0, idx).reverse().find(m => m.role === 'user')
    if (!prevUserMsg) return

    // 移除这条 AI 消息及其之后的所有消息，保留到该用户消息为止
    session.messages.splice(idx)

    // 重新构建历史（不含刚刚移除的 AI 消息）
    const history = buildApiMessages(
      session.messages.map(m => ({ role: m.role, content: m.content })),
      settingsStore.systemPrompt,
    )

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

    abortController = new AbortController()

    try {
      await streamChat({
        messages: history,
        apiKey: settingsStore.apiKey,
        model: settingsStore.model,
        thinkingMode: settingsStore.thinkingMode,
        reasoningEffort: settingsStore.reasoningEffort,
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
