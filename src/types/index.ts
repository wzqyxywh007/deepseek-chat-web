export type ModelId = 'deepseek-v4-pro' | 'deepseek-v4-flash'
export type ThemeMode = 'light' | 'dark' | 'system'
export type ReasoningEffort = 'high' | 'medium' | 'low'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoningContent?: string
  isStreaming?: boolean
  isError?: boolean
  createdAt: number
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface Settings {
  apiKey: string
  model: ModelId
  thinkingMode: boolean
  reasoningEffort: ReasoningEffort
  systemPrompt: string
  theme: ThemeMode
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const MODEL_OPTIONS: { value: ModelId; label: string; description: string }[] = [
  {
    value: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    description: '旗舰模型，推理最强，支持 1M 上下文',
  },
  {
    value: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    description: '快速高效，经济实惠，支持 1M 上下文',
  },
]

export const REASONING_EFFORT_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: 'high', label: '深度' },
  { value: 'medium', label: '均衡' },
  { value: 'low', label: '快速' },
]

/** 将旧版模型 ID 迁移到 V4 */
export function migrateModelId(raw: string): { model: ModelId; thinkingMode: boolean } {
  if (raw === 'deepseek-reasoner') return { model: 'deepseek-v4-pro', thinkingMode: true }
  if (raw === 'deepseek-chat') return { model: 'deepseek-v4-flash', thinkingMode: false }
  if (raw === 'deepseek-v4-pro' || raw === 'deepseek-v4-flash') {
    return { model: raw, thinkingMode: raw === 'deepseek-v4-pro' }
  }
  return { model: 'deepseek-v4-pro', thinkingMode: true }
}
