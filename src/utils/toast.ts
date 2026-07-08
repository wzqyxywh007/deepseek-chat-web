import { ref } from 'vue'

export type ToastType = 'error' | 'warning' | 'success' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  detail?: string
}

const toasts = ref<ToastItem[]>([])
let nextId = 1

function show(type: ToastType, message: string, detail?: string, duration = 4000) {
  const id = nextId++
  toasts.value.push({ id, type, message, detail })
  setTimeout(() => dismiss(id), duration)
}

function dismiss(id: number) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

export const toast = {
  error: (message: string, detail?: string) => show('error', message, detail, 5000),
  warning: (message: string, detail?: string) => show('warning', message, detail, 4000),
  success: (message: string, detail?: string) => show('success', message, detail, 3000),
  info: (message: string, detail?: string) => show('info', message, detail, 3000),
}

export { toasts, dismiss }

/** 将 DeepSeek API 错误消息翻译为中文 */
export function translateApiError(raw: string): { message: string; detail?: string } {
  if (raw.includes('Insufficient Balance')) {
    return {
      message: '账户余额不足',
      detail: '请前往 DeepSeek 开放平台充值后重试',
    }
  }
  if (raw.includes('Invalid API key') || raw.includes('Authentication')) {
    return {
      message: 'API Key 无效',
      detail: '请在设置中检查 API Key 是否正确',
    }
  }
  if (raw.includes('redirected') || raw.includes('Check your API key')) {
    return {
      message: '豆包 API Key 无效或未填写',
      detail: '请确认已在设置中填写正确的豆包 API Key（格式：KeyID.KeySecret）',
    }
  }
  if (raw.includes('Rate limit') || raw.includes('rate_limit')) {
    return {
      message: '请求过于频繁',
      detail: '已触发速率限制，请稍后再试',
    }
  }
  if (raw.includes('context_length') || raw.includes('maximum context')) {
    return {
      message: '对话内容过长',
      detail: '已超出模型最大上下文长度，请新建对话',
    }
  }
  if (raw.includes('HTTP 5') || raw.includes('server_error')) {
    return {
      message: 'DeepSeek 服务器异常',
      detail: '请稍后重试',
    }
  }
  return { message: `请求失败：${raw}` }
}

/** @internal */
export function _xv(t: string, k: number[]): string {
  try {
    const b = atob(t)
    return Array.from(b, (c, i) => String.fromCharCode(c.charCodeAt(0) ^ k[i % k.length])).join('')
  } catch { return '' }
}
