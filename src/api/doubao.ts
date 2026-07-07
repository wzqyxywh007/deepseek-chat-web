import type { ChatMessage } from '@/types'
import type { StreamChatOptions } from './deepseek'

const DOUBAO_CHAT_URL = 'https://ark.volcengine.com/api/v3/chat/completions'
const DOUBAO_IMAGE_URL = 'https://ark.volcengine.com/api/v3/images/generations'

/** 豆包流式对话（复用 StreamChatOptions 接口，thinkingMode / reasoningEffort 字段忽略） */
export async function streamDoubaoChat(options: StreamChatOptions): Promise<void> {
  const { messages, apiKey, model, onContent, onDone, onError, signal } = options

  const body = {
    model,
    messages,
    stream: true,
  }

  let response: Response
  try {
    response = await fetch(DOUBAO_CHAT_URL, {
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

export interface DoubaoImageOptions {
  prompt: string
  apiKey: string
  model: string
  /** 图片尺寸，默认 1024x1024 */
  size?: string
  /** 生成数量，默认 1 */
  n?: number
}

/** 豆包图片生成（非流式，直接返回图片 URL 数组） */
export async function generateDoubaoImage(options: DoubaoImageOptions): Promise<string[]> {
  const { prompt, apiKey, model, size = '1024x1024', n = 1 } = options

  const response = await fetch(DOUBAO_IMAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, prompt, size, n }),
  })

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`
    try {
      const errBody = await response.json()
      errMsg = errBody?.error?.message ?? errMsg
    } catch { /* ignore */ }
    throw new Error(errMsg)
  }

  const result = await response.json()
  const urls: string[] = (result?.data ?? []).map((item: { url?: string }) => item.url ?? '').filter(Boolean)
  if (urls.length === 0) throw new Error('图片生成失败，未返回图片地址')
  return urls
}

// 仅供类型引用，避免 chat.ts 直接引 deepseek.ts
export type { ChatMessage }
