import { getProvider, isImageModel, MODEL_CONFIGS } from '@/types'
import type { ModelId } from '@/types'
import { streamChat } from './deepseek'
import type { StreamChatOptions } from './deepseek'
import { streamDoubaoChat, generateDoubaoImage } from './doubao'

export type { StreamChatOptions }

/**
 * 统一对话 API 路由：根据模型 ID 自动分发到对应 Provider。
 * chat.ts 只需调用此函数，不直接依赖具体 Provider 文件。
 */
export function callChatAPI(options: StreamChatOptions & { proxyUrl?: string }): Promise<void> {
  const modelId = options.model as ModelId
  const provider = getProvider(modelId)
  const apiModelName = MODEL_CONFIGS[modelId]?.apiModelName ?? options.model
  const normalized = { ...options, model: apiModelName }

  if (provider === 'doubao') {
    return streamDoubaoChat(normalized)
  }
  return streamChat(normalized)
}

/**
 * 豆包图片生成入口。
 * @returns 图片 URL 数组
 */
export async function callImageAPI(
  prompt: string,
  apiKey: string,
  modelId: ModelId,
  proxyUrl?: string,
): Promise<string[]> {
  const apiModelName = MODEL_CONFIGS[modelId]?.apiModelName ?? modelId
  return generateDoubaoImage({ prompt, apiKey, model: apiModelName, proxyUrl })
}

export { isImageModel }
