// ─── Provider & Model ───────────────────────────────────────────────────────

export type ProviderId = 'deepseek' | 'doubao' | 'novelai'

export type ModelId =
  | 'deepseek-v4-pro'
  | 'deepseek-v4-flash'
  | 'doubao-pro-32k'
  | 'doubao-lite-32k'
  | 'doubao-image'
  | 'novelai-image-v45'
  | 'novelai-image-v45-curated'
  | 'novelai-image-v4'
  | 'novelai-image-v4-curated'
  | 'novelai-image-v3'

export interface ModelConfig {
  provider: ProviderId
  label: string
  description: string
  /** 实际传给各家 API 的 model 字段 */
  apiModelName: string
  /** 是否为图片生成模型（走 images/generations 接口） */
  isImageModel?: boolean
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  'deepseek-v4-pro': {
    provider: 'deepseek',
    label: 'DeepSeek V4 Pro',
    description: '旗舰模型，推理最强，支持 1M 上下文',
    apiModelName: 'deepseek-v4-pro',
  },
  'deepseek-v4-flash': {
    provider: 'deepseek',
    label: 'DeepSeek V4 Flash',
    description: '快速高效，经济实惠，支持 1M 上下文',
    apiModelName: 'deepseek-v4-flash',
  },
  'doubao-pro-32k': {
    provider: 'doubao',
    label: '豆包 Pro',
    description: '豆包专业版，均衡性能，支持 32K 上下文',
    apiModelName: 'doubao-pro-32k-241215',
  },
  'doubao-lite-32k': {
    provider: 'doubao',
    label: '豆包 Lite',
    description: '豆包轻量版，响应更快，经济实惠',
    apiModelName: 'doubao-lite-32k-241215',
  },
  'doubao-image': {
    provider: 'doubao',
    label: '豆包 图片生成',
    description: '描述画面，AI 一键生图',
    apiModelName: 'doubao-seedream-5-0-260128',
    isImageModel: true,
  },
  'novelai-image-v45': {
    provider: 'novelai',
    label: 'NAI V4.5 Full',
    description: 'NovelAI Diffusion V4.5 最新旗舰版，画质最强',
    apiModelName: 'nai-diffusion-4-5-full',
    isImageModel: true,
  },
  'novelai-image-v45-curated': {
    provider: 'novelai',
    label: 'NAI V4.5 Curated',
    description: 'NovelAI Diffusion V4.5 精选版，内容更安全',
    apiModelName: 'nai-diffusion-4-5-curated',
    isImageModel: true,
  },
  'novelai-image-v4': {
    provider: 'novelai',
    label: 'NAI V4 Full',
    description: 'NovelAI Diffusion V4 旗舰版，二次元风格强',
    apiModelName: 'nai-diffusion-4-full',
    isImageModel: true,
  },
  'novelai-image-v4-curated': {
    provider: 'novelai',
    label: 'NAI V4 Curated',
    description: 'NovelAI Diffusion V4 精选版，内容更安全',
    apiModelName: 'nai-diffusion-4-curated-preview',
    isImageModel: true,
  },
  'novelai-image-v3': {
    provider: 'novelai',
    label: 'NAI V3',
    description: 'NovelAI Diffusion V3，经典稳定版本',
    apiModelName: 'nai-diffusion-3',
    isImageModel: true,
  },
}

/** 从模型 ID 推导 Provider */
export function getProvider(modelId: ModelId): ProviderId {
  return MODEL_CONFIGS[modelId]?.provider ?? 'deepseek'
}

/** 是否为图片生成模型 */
export function isImageModel(modelId: ModelId): boolean {
  return MODEL_CONFIGS[modelId]?.isImageModel === true
}

// ─── 保留兼容旧版 MODEL_OPTIONS 的常量（SettingsModal 分组展示后已不需要，但防止其他地方引用报错） ───
export const MODEL_OPTIONS: { value: ModelId; label: string; description: string }[] = [
  { value: 'deepseek-v4-pro', ...MODEL_CONFIGS['deepseek-v4-pro'] },
  { value: 'deepseek-v4-flash', ...MODEL_CONFIGS['deepseek-v4-flash'] },
  { value: 'doubao-pro-32k', ...MODEL_CONFIGS['doubao-pro-32k'] },
  { value: 'doubao-lite-32k', ...MODEL_CONFIGS['doubao-lite-32k'] },
  { value: 'doubao-image', ...MODEL_CONFIGS['doubao-image'] },
  { value: 'novelai-image-v45', ...MODEL_CONFIGS['novelai-image-v45'] },
  { value: 'novelai-image-v45-curated', ...MODEL_CONFIGS['novelai-image-v45-curated'] },
  { value: 'novelai-image-v4', ...MODEL_CONFIGS['novelai-image-v4'] },
  { value: 'novelai-image-v4-curated', ...MODEL_CONFIGS['novelai-image-v4-curated'] },
  { value: 'novelai-image-v3', ...MODEL_CONFIGS['novelai-image-v3'] },
]

// ─── Theme & Reasoning ───────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system'
export type ReasoningEffort = 'high' | 'medium' | 'low'

export const REASONING_EFFORT_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: 'high', label: '深度' },
  { value: 'medium', label: '均衡' },
  { value: 'low', label: '快速' },
]

// ─── Data Models ─────────────────────────────────────────────────────────────

export interface MessageAttachment {
  name: string
  fileType: 'file' | 'image'
  mimeType: string
  previewUrl?: string
  truncated: boolean
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoningContent?: string
  isStreaming?: boolean
  isError?: boolean
  attachments?: MessageAttachment[]
  /** 豆包图片生成模型返回的图片 URL 列表 */
  generatedImages?: string[]
  createdAt: number
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  /** 该对话绑定的模型，首次发送消息时写入，切换历史时自动恢复 */
  modelId?: ModelId
  createdAt: number
  updatedAt: number
}

export interface Settings {
  apiKey: string
  doubaoApiKey: string
  /** 豆包 CORS 代理地址，例如：https://my-worker.username.workers.dev */
  doubaoProxyUrl: string
  novelaiApiKey: string
  /** NovelAI 代理地址（可选，直连可能跨域） */
  novelaiProxyUrl: string
  model: ModelId
  thinkingMode: boolean
  reasoningEffort: ReasoningEffort
  systemPrompt: string
  theme: ThemeMode
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

// ─── Migration ───────────────────────────────────────────────────────────────

/** 将旧版 / 豆包模型 ID 迁移，确保返回合法的 ModelId */
export function migrateModelId(raw: string): { model: ModelId; thinkingMode: boolean } {
  if (raw === 'deepseek-reasoner') return { model: 'deepseek-v4-pro', thinkingMode: true }
  if (raw === 'deepseek-chat') return { model: 'deepseek-v4-flash', thinkingMode: false }
  if (raw in MODEL_CONFIGS) {
    const id = raw as ModelId
    return { model: id, thinkingMode: id === 'deepseek-v4-pro' }
  }
  return { model: 'deepseek-v4-pro', thinkingMode: true }
}
