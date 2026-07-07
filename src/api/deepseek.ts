import type { ChatMessage, ReasoningEffort } from '@/types'

const API_URL = 'https://api.deepseek.com/v1/chat/completions'

export interface StreamChatOptions {
  messages: ChatMessage[]
  apiKey: string
  model: string
  thinkingMode: boolean
  reasoningEffort: ReasoningEffort
  onReasoning: (delta: string) => void
  onContent: (delta: string) => void
  onDone: () => void
  onError: (err: unknown) => void
  signal?: AbortSignal
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const {
    messages, apiKey, model, thinkingMode, reasoningEffort,
    onReasoning, onContent, onDone, onError, signal,
  } = options

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  }

  if (thinkingMode) {
    body.thinking = { type: 'enabled' }
    body.reasoning_effort = reasoningEffort
  } else {
    body.thinking = { type: 'disabled' }
  }

  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    onError(e)
    return
  }

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`
    try {
      const errBody = await response.json()
      errMsg = errBody?.error?.message ?? errMsg
    } catch { /* ignore */ }
    onError(new Error(errMsg))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('无法读取响应流'))
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          if (delta?.reasoning_content) onReasoning(delta.reasoning_content)
          if (delta?.content) onContent(delta.content)
        } catch { /* 忽略解析错误的行 */ }
      }
    }
    onDone()
  } catch (e) {
    onError(e)
  } finally {
    reader.releaseLock()
  }
}
